/*******************************************************************************
 * Copyright (c) 2018 IBM Corporation and others.
 * All rights reserved. This program and the accompanying materials are made 
 * available under the terms of the Eclipse Public License v1.0 
 * (http://www.eclipse.org/legal/epl-v10.html), and the Eclipse Distribution 
 * License v1.0 (http://www.eclipse.org/org/documents/edl-v10.html). 
 *
 * Contributors:
 *     IBM Corporation - initial API and implementation
 *******************************************************************************/
const fs = require("fs"),
	path = require("path"),
	log4js = require('log4js'),
	logger = log4js.getLogger("user-index");

const OAUTH_INDEX_NAME = ".oauthIndex",
	EMAIL_INDEX_NAME = ".emailIndex",
	UNAME_INDEX_NAME = ".userIndex";

class UserIndex {
	/**
	 * Creates a new user index. It is up to the backing metastore to initialize the index prior to its use.
	 * @param {{?}} metastore The backing metastore for the index
	 * @since 18.0
	 */
	constructor(metastore) {
		this._metastore = metastore;
		this._workspaceDir = metastore._options.workspaceDir;
		this.oauthIndex = null;
		this.emailIndex = null;
		this.userIndex = null;
	}
	/**
	 * Looks up the user with the given `userEmail` in the cache
	 * @param {string} userEmail The email of the user we wish to look up
	 * @returns {Promise} A promise that will resolve to null or the full filesystem path to query for the user metadata
	 */
	getUserByEmail(userEmail) {
		return this.getUserIndex().then(function() {
			const uname = this.emailIndex.get(userEmail);
			if(uname) {
				return new Promise(function(resolve, reject) {
					this._metastore.getUser(uname, (err, userInfo) => {
						if(err) {
							return reject(err);
						}
						return resolve(userInfo);
					});
				}.bind(this));
			}
			return null;
		}.bind(this));
	}
	/**
	 * Looks up the user with the given `userOauth` in the cache
	 * @param {string} userOauth The OAuth token of the the user to look up
	 * @returns {Promise} A promise that will resolve to null or the full filesystem path to query for the user metadata
	 */
	getUserByOauth(userOauth) {
		return this.getUserIndex().then(function() {
			const uname = this.oauthIndex.get(userOauth);
			if(uname) {
				return new Promise(function(resolve, reject) {
					this._metastore.getUser(uname, (err, userInfo) => {
						if(err) {
							return reject(err);
						}
						return resolve(userInfo);
					});
				}.bind(this));
			}
			return null;
		}.bind(this));
	}
	/**
	 * Returns all users
	 * @returns {Promise} A promise to resolve the array of user names
	 */
	getAllUsers() {
		return this.getUserIndex().then(function() {
			const users = [];
			for (const entry of this.userIndex) {
				users.push(entry[0]);
			}
			return users;
		}.bind(this));
	}
	/**
	 * This function is intended to be called when a metastore implementation creates a user - so that the 
	 * new user can be added to the cache while the file lock is in use
	 * @callback
	 * @param {{?}} userInfo The user information object
	 */
	createUser(userInfo) {
		return new Promise(function(resolve, reject) {
			if(this.indexReady()) {
				//if the index has been initialized, update it
				if(userInfo.oauth) {
					this.oauthIndex.set(userInfo.oauth, userInfo.username);
				}
				this.emailIndex.set(userInfo.email, userInfo.username);
				this.userIndex.set(userInfo.username, {email: userInfo.email, oauth: userInfo.oauth});
				return this.flush().then(() => {
					resolve();
				});
			}
			resolve();
			//reject(new Error("Failed to create new user in index: "+userInfo.username));
		}.bind(this));
	}
	/**
	 * This function is intended to be called when a metastore implementation deletes a user - so that the 
	 * user can be removed from the cache while the file lock is in use
	 * @callback
	 * @param {{?}} userInfo The user information object
	 */
	deleteUser(userId) {
		return this.getUserIndex().then(function() {
			//we need to load the index in case it exists and holds the user (but we have not lazily loaded it yet)
			const id = this.userIndex.get(userId);
			if(id) {
				this.emailIndex.delete(id.email);
				if(id.oauth) {
					this.oauthIndex.delete(id.oauth);
				}
				return this.flush();
			}
			//reject(new Error("Failed to delete user from index: "+userId));
		}.bind(this));
	}
	/**
	 * This function is intended to be called when a metastore implementation puts (updates) a user - so that the 
	 * caches can be updated while the file lock is in use
	 * @callback
	 * @param {string} userId The ID of the user
	 * @param {{?}} userInfo The user information object
	 */
	updateUser(userId, newInfo) {
		return new Promise(function(resolve, reject) {
			if(this.indexReady()) {
				//if the index is ready update it, otherwise, no-op
				const oldUser = this.userIndex.get(userId);
				if(oldUser) {
					if(oldUser.oauth) {
						this.oauthIndex.delete(oldUser.oauth);
					}
					this.emailIndex.delete(oldUser.email);
				}
				if(newInfo.Properties.OAuth) {
					this.oauthIndex.set(newInfo.Properties.OAuth, newInfo.UserName);
				}
				this.emailIndex.set(newInfo.Properties.Email, newInfo.UserName);
				this.userIndex.set(newInfo.UserName, {email: newInfo.Properties.Email, oauth: newInfo.Properties.OAuth});
				return this.flush().then(() => {
					resolve();
				});
			}
			resolve();
			//reject(new Error("Failed to update user in index: "+oldInfo.username));
		}.bind(this));
	}
	/**
	 * Returns if the index is ready for use
	 * @returns true if the index has been initialized, false otherwise
	 */
	indexReady() {
		return this.oauthIndex && this.emailIndex && this.userIndex;
	}
	/**
	 * Read or create the user name and email indexes. If the indexes do not exist, or there was some problem reading them
	 * the user directories are re-scanned to ensure consistency
	 * @returns {Promise} A promise to load the caches. Rejects if the caches could not be loaded
	 */
	getUserIndex() {
		return new Promise(function(resolve, reject) {
			if(this.oauthIndex && this.emailIndex && this.userIndex) {
				return resolve();
			}
			return this.readIndexFiles().then(() => {
				resolve();
			}, function() { 
				resolve(this.createIndex());
			}.bind(this));
		}.bind(this));
	}
	/**
	 * Try to read the index files from the workspace metadata
	 * @returns {Promise} A promise to read the files. The promise is rejected if the files fail to read or fail to parse
	 */
	readIndexFiles() {
		return new Promise(function(resolve, reject) {
			fs.readFile(path.join(this._workspaceDir, OAUTH_INDEX_NAME), "utf8", function(err, contents) {
				if(err || typeof contents !== 'string') {
					reject(err);
				}
				try {
					this.oauthIndex = new Map(JSON.parse(contents));
					fs.readFile(path.join(this._workspaceDir, EMAIL_INDEX_NAME), "utf8", function(err, contents) {
						if(err || typeof contents !== 'string') {
							this.oauthIndex = null; //reset it
							reject(err);
						}
						this.emailIndex = new Map(JSON.parse(contents));
						fs.readFile(path.join(this._workspaceDir, UNAME_INDEX_NAME), "utf8", function(err, contents) {
							if(err || typeof contents !== 'string') {
								this.oauthIndex = null; //reset it
								this.emailIndex = null;
								reject(err);
							}
							this.userIndex = new Map(JSON.parse(contents));
							resolve();
						}.bind(this));
					}.bind(this));
				} catch(err) {
					this.oauthIndex = null;
					this.emailIndex = null;
					this.userIndex = null;
					return reject(err);
				}
			}.bind(this));
		}.bind(this));
	}
	/** 
	 * Crawl the filesystem and create the indexes
	 * @returns {Promise} A promise to resolve the index once built
	 */
	createIndex() {
		return fs.readdirAsync(this._workspaceDir).then(function(dirs) {
			this.oauthIndex = new Map();
			this.emailIndex = new Map();
			this.userIndex = new Map();
			return Promise.all(dirs.map(function(f) {
				const d = path.join(this._workspaceDir, f);
				return fs.statAsync(d).then(function(stat) {
					if(stat.isDirectory() && !f.startsWith('.')) {
						return this.readUser(d);
					}
				}.bind(this));
			}.bind(this)));
		}.bind(this));
	}
	/**
	 * Reads a user from the filesystem. Reading is delegated back to the backing metastore for this index.
	 * @param {*} dir The directory to read
	 * @returns {Promise} A promise to read the user from the given directory. If the read fails, the exception is ignored 
	 * so the index crawling can continue.
	 */
	readUser(dir) {
		return fs.readdirAsync(dir).then(function(dirs) {
			return Promise.all(dirs.map(function(f) {
				return new Promise(function(resolve, reject) {
					this._metastore.getUser(f, function(err, userInfo) {
						if(!err && userInfo) {
							this.userIndex.set(userInfo.username, {email: userInfo.email, oauth: userInfo.oauth});
							this.emailIndex.set(userInfo.email, userInfo.username);
							if(userInfo.oauth) {
								this.oauthIndex.set(userInfo.oauth, userInfo.username);
							}
						}
						this.flush().then(() => {
							resolve();
						});
					}.bind(this));
				}.bind(this));
			}.bind(this)));
		}.bind(this));
	}
	/**
	 * Flush the current cache entries to the filesystem
	 */
	flush() {
		const p = path.join(this._workspaceDir, OAUTH_INDEX_NAME);
		return fs.writeFileAsync(p, JSON.stringify([...this.oauthIndex], null, '\t')).then(function() {
			const p = path.join(this._workspaceDir, EMAIL_INDEX_NAME);
			return fs.writeFileAsync(p, JSON.stringify([...this.emailIndex], null, '\t')).then(function() {
				const p = path.join(this._workspaceDir, UNAME_INDEX_NAME);
				return fs.writeFileAsync(p, JSON.stringify([...this.userIndex], null, '\t'));
			}.bind(this));
		}.bind(this));
	}
}
module.exports = UserIndex;