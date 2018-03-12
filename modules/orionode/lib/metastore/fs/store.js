/*******************************************************************************
 * Copyright (c) 2016, 2018 IBM Corporation and others.
 * All rights reserved. This program and the accompanying materials are made 
 * available under the terms of the Eclipse Public License v1.0 
 * (http://www.eclipse.org/legal/epl-v10.html), and the Eclipse Distribution 
 * License v1.0 (http://www.eclipse.org/org/documents/edl-v10.html). 
 *
 * Contributors:
 *	 IBM Corporation - initial API and implementation
 *******************************************************************************/
const nodePath = require('path'),
    Promise = require('bluebird'),
    fs = Promise.promisifyAll(require('fs')),
    mkdirpAsync = Promise.promisify(require('mkdirp')),
    metaUtil = require('../util/metaUtil'),
    accessRights = require('../../accessRights'),
    os = require('os'),
	log4js = require('log4js'),
	rimraf = require('rimraf'),
	logger = log4js.getLogger("metastore"),
    fileLocker = require('../../util/fileLocker'),
	cryptoUtil = require('../../util/cryptoUtil'),
	passport = require('passport'),
	LocalStrategy = require('passport-local').Strategy,
	userIndex = require('../util/userIndex');

const FILENAME_METASTORE = "metastore.json",
	FILENAME_TASKS_TEMP_DIR = "temp",
	FILENAME_USER_METADATA = "user.json",
	KEY_ORION_DESCRIPTION = "OrionDescription",
	KEY_ORION_VERSION = "OrionVersion",
	WORKSPACE_ID = "anonymous-OrionContent",
	DEFAULT_WORKSPACE_NAME = "OrionContent",
	SERVERWORKSPACE = "${SERVERWORKSPACE}",
	DESCRIPTION_METASTORE = "This JSON file is at the root of the Orion metadata store responsible for persisting user, workspace and project files and metadata.";

// The current version of the Simple Meta Store.
const VERSION = 8;

function getUserRootLocation(options, userId) {
	return options.configParams.get('orion.single.user') ? nodePath.join(options.configParams.get('orion.single.user.metaLocation') || os.homedir(), '.orion') : nodePath.join.apply(null, metaUtil.readMetaUserFolder(options.workspaceDir, userId));
}

/**
 * Returns the fully qualified file path of the metadata for the given user. Returns null if no user
 * is provided
 * @param {{?}} options The options map
 * @param {string|{?}} user The user id or map of user options
 */
function getUserMetadataFileName(options, user) {
	let userId;
	if(typeof user === "string") {
		userId = user;
	} else if(user && typeof user.username === 'string') {
		userId = user.username;
	} else {
		return null;
	}
	return nodePath.join(getUserRootLocation(options, userId), FILENAME_USER_METADATA);
}

function getWorkspaceMetadataFileName(options, workspaceId) {
	var userId = metaUtil.decodeUserIdFromWorkspaceId(workspaceId);
	var metadataFolder = getUserRootLocation(options, userId);
	return nodePath.join(metadataFolder, workspaceId + ".json");
}

function getWorkspaceFolderName(options, workspaceId) {
	var workspaceName = metaUtil.decodeWorkspaceNameFromWorkspaceId(workspaceId);
	var userId = metaUtil.decodeUserIdFromWorkspaceId(workspaceId);
	var metadataFolder = getUserRootLocation(options, userId);
	return nodePath.join(metadataFolder, workspaceName);
}

function getProjectMetadataFileName(options, workspaceId, projectName) {
	var userId = metaUtil.decodeUserIdFromWorkspaceId(workspaceId);
	var metadataFolder = getUserRootLocation(options, userId);
	if (metaUtil.decodeWorkspaceNameFromWorkspaceId(workspaceId) !== DEFAULT_WORKSPACE_NAME) {
		projectName = workspaceId + metaUtil.getSeparator() + projectName;
	}
	return nodePath.join(metadataFolder, projectName + ".json");
}

function getTaskRootLocation(options) {
	return options.configParams.get('orion.file.tasks.location') || nodePath.join(options.workspaceDir, '.metadata', '.tasks');
}
/**
 * Write JSON to the given file
 * @param {string} fileName The name of the file to write to
 * @param {{?}} object The object to write out
 */
function writeJSON(fileName, object) {
	logger.info("write metadata " + fileName + " pid=" + process.pid);
	return mkdirpAsync(nodePath.dirname(fileName)).then(function() {
		return fs.writeFileAsync(fileName, JSON.stringify(object, null, 2) + "\n");
	});
}
/**
 * Read the JSON from the given file
 * @param {string} fileName The name of the file to read
 */
function readJSON(fileName) {
	logger.info("read metadata " + fileName + " pid=" + process.pid);
	return fs.readFileAsync(fileName, 'utf8')
	.catchReturn({ code: 'ENOENT' }, null) // New file: suppress error
	.then(function(metadata) {
		try {
			return JSON.parse(metadata);
		} catch(err) {
			logger.error(fileName, err, "json <" + metadata + ">");
			throw err;
		}
	});
}

/**
 * Validates the given password against the one from the user info. The Password in the user info is expected to be 
 * in the standard form: `info: {properties: {Password: encrypted}}`
 * @param {string} given The password to test
 * @param {{?}} userInfo The standard user information object
 * @since 18.0
 */
function validatePassword(given, userInfo) {
	if(userInfo && userInfo.properties) {
		const encryptedPw = userInfo.properties.Password;
		if(typeof encryptedPw === 'string') {
			const pw = cryptoUtil.decrypt(encryptedPw, "");
			return typeof pw === 'string' && pw === given;
		}
	}
	return false;
}

/**
 * Creates a new filesystem-based metastore
 * @param {{?}} options The map of server options
 */
function FsMetastore(options) {
	this._options = options;
	this._taskList = {};
	this._lockMap = {};
	this._isSingleUser = !!options.configParams.get('orion.single.user');
	this._isFormAuthType = options.configParams.get('orion.auth.name') === 'FORM+OAuth';
}

/**
 * Acquires a lock for the given user ID
 * @param {string} userId The user ID
 * @param {boolean} shared If the lock should be shared or not
 */
FsMetastore.prototype.lock = function lock(userId, shared) {
	var promise = new Promise(function(resolve, reject) {
		var locker = this._lockMap[userId];
		if (!locker) {
			var filePath;
			if (this._isSingleUser) {
				filePath = nodePath.join(this._options.configParams.get('orion.single.user.metaLocation') || os.homedir(), '.orion');
			} else {
				filePath = this._computeLockFilePath(userId);
			}
			filePath = nodePath.join(filePath, ".lock");
			locker = new fileLocker(filePath, this._options);
			this._lockMap[userId] = locker;
		}
		locker.lock(shared).then(resolve, reject);
	}.bind(this));
	return promise.disposer(function(releaser) {
		return releaser();
	});
};

/**
 * Sets up the metastore
 * @param {{?}} options The map of server options
 */
FsMetastore.prototype.setup = function setup(options) {
	if (!this._isSingleUser) {
		if(this._isFormAuthType) {
			passport.use(new LocalStrategy(
				function(username, password, done) {
					this.getUser(username, function(err, userInfo) {
						if (err) { 
							return done(err);
						}
						if (!userInfo) {
							return done(null, false, { message: 'Incorrect username.' });
						}
						if (!validatePassword(password, userInfo)) {
							return done(null, false, { message: 'Incorrect password.' });
						}
						return done(null, userInfo);
					});
				}.bind(this)
			));
			passport.serializeUser(function(user, done) {
				done(null, user.username); 
			});
			passport.deserializeUser(function(id, done) {
				this.getUser(id, function(err, userInfo) {
					done(null, userInfo);
				});
			}.bind(this));
		}

		this._index = new userIndex(this);
		metaUtil.initializeAdminUser(options, this);

		/* verify that existing metadata in this workspace will be usable by this server */
		var path = nodePath.join(options.workspaceDir, FILENAME_METASTORE);
		fs.readFileAsync(path, 'utf8').then(function(content) {
			var json = JSON.parse(content);
			var metaVersion = parseInt(json[KEY_ORION_VERSION], 10);
			if (metaVersion < VERSION) {
				/* this is fine, user metadata will be migrated when they next log in */
				var obj = {};
				obj = {};
				obj[KEY_ORION_VERSION] = VERSION;
				obj[KEY_ORION_DESCRIPTION] = DESCRIPTION_METASTORE;
				writeJSON(path, obj).then(
					null,
					function(error) {
						throw new Error("Failed to update the metadata file for the workspace at: " + path, error);
					}
				);
			} else if (metaVersion > VERSION) {
				throw new Error("Cannot run an older server (metadata version " + VERSION + ") on a workspace accessed by a newer server (metadata version " + metaVersion + ")");
			} else if (isNaN(metaVersion)) {
				throw new Error("Invalid metadata version ('" + metaVersion + "') read from " + path);
			}
		}, function reject(error) {
			if (error.code === "ENOENT") {
				/* brand new workspace */
				var obj = {};
				obj[KEY_ORION_VERSION] = VERSION;
				obj[KEY_ORION_DESCRIPTION] = DESCRIPTION_METASTORE;
				writeJSON(path, obj).then(
					null,
					function(error) {
						throw new Error("Failed to write the metadata file for the new workspace at: " + path, error);
					}
				);
			} else {
				throw new Error("Failed to access the workspace metadata at: " + path, error);
			}
		});
	}
	// Used only for single user case (Electron or local debug)
	options.authenticate = [function(req, res, next) {
		metaUtil.initializeAnonymousUser(req, next, this);
	}.bind(this)];
};

Object.assign(FsMetastore.prototype, {
	createWorkspace: function(userId, workspaceData, callback) {
		if (!userId) {
			return callback(new Error('createWorkspace.userId is null'));
		}
		if (!workspaceData.name) {
			return callback(new Error('createWorkspace.workspaceData.name is null'));
		}

		Promise.using(this.lock(userId, false), function() {
			return new Promise(function(resolve, reject) {
				this._readUserMetadata(userId, function(error, metadata) {
					if (error) {
						return reject(error);
					}
		
					if (metadata) {
						var workspaceId = metaUtil.encodeWorkspaceId(userId, workspaceData.id || workspaceData.name);
						var workspaceObj = {
							"name": workspaceData.name,
							"id": workspaceId
						};
						var data = {
							"FullName": workspaceData.name,
							"OrionVersion": VERSION,
							"ProjectNames": [],
							"Properties": {},
							"UniqueId": workspaceId,
							"UserId": userId
						};
						this._updateWorkspaceMetadata(workspaceId, data, function(error) {
							if (error) {
								return reject(error);
							}
							function updateUserWorkspaceAccessRight(){
								// Update workspaceIds in user's metadata only if it's new
								if(metadata.WorkspaceIds.indexOf(workspaceId) === -1){
									metadata.WorkspaceIds.push(workspaceId);
									var workspaceUserRights = accessRights.createWorkspaceAccess(workspaceId);
									metadata.Properties.UserRights = (metadata.Properties.UserRights || accessRights.createUserAccess(userId)).concat(workspaceUserRights);
									this._updateUserMetadata(userId,  metadata, function(error) {
										if (error) {
											return reject(error);
										}
										resolve(workspaceObj);
									});						
								} else {
									resolve(workspaceObj);
								}
							}
							if (this._isSingleUser) {
								updateUserWorkspaceAccessRight.call(this);
							} else {
								metaUtil.createWorkspaceDir(this._options.workspaceDir, userId, workspaceObj.id, function(error) {
									if (error) {
										return reject(error);
									}
									updateUserWorkspaceAccessRight.call(this);
								}.bind(this));
							}
						}.bind(this));
					} else {
						reject(new Error("createWorkspace could not find user with id '" + userId + "'."));
					}
				}.bind(this));
			}.bind(this));
		}.bind(this)).then(
			function(result) {
				callback(null, result);
			},
			callback /* error case */
		);
	},

	getWorkspace: function(workspaceId, callback) {
		if (workspaceId !== WORKSPACE_ID) {
			var userId = metaUtil.decodeUserIdFromWorkspaceId(workspaceId);
			Promise.using(this.lock(userId, true), function() {
				return new Promise(function(resolve, reject) {
					this._readWorkspaceMetadata(workspaceId, function(error, metadata) {
						if (error) {
							return reject(error);
						}
						if (!metadata) {
							return resolve(null);
						}
						var workspace = {
							"id": metadata.UniqueId,
							"name": metadata.FullName,
							"properties": {}
						};
						// TODO Workspace properties is where tabs info goes, implement later
						var propertyKeys = Object.keys(metadata.Properties);
						propertyKeys.forEach(function(propertyKey) {
							workspace.properties[propertyKey] = metadata.Properties[propertyKey];
							// TODO password needs to be handled specifically since it needs to be decrypted. (referrence setProperties line 967)
						});
						return resolve(workspace);
					});
				}.bind(this));
			}.bind(this)).then(
				function(result) {
					callback(null, result);
				},
				callback /* error case */
			);
		} else {
			// TODO this should be merged into upper logic
			callback(null, {
				name: nodePath.basename(this._options.workspaceDir),
				id: WORKSPACE_ID
			});
		}
	},

	/** @callback */
	deleteWorkspace: function(workspaceId, callback) {
		var userId = metaUtil.decodeUserIdFromWorkspaceId(workspaceId);
		Promise.using(this.lock(userId, false), function() {
			return new Promise(function(resolve, reject) {
				this._readWorkspaceMetadata(workspaceId, function(error, metadata) {
					if (error) {
						return reject(error);
					}
					var projectsToDelete = metadata.ProjectNames;
					projectsToDelete.forEach(function(projectname){
						var metaFile = getProjectMetadataFileName(this._options, workspaceId, projectname);
						fs.unlinkAsync(metaFile).catchReturn({ code: 'ENOENT' }, null);
					}.bind(this));
					this._readUserMetadata(userId, function(error, metadata) {
						if (error) {
							return reject(error);
						}
						var index = -1;
						if (metadata && metadata.WorkspaceIds) {
							index = metadata.WorkspaceIds.indexOf(workspaceId);
						}
						index !== -1 && metadata.WorkspaceIds.splice(index, 1);
						metadata.Properties["UserRights"] = accessRights.removeWorkspaceAccess(metadata.Properties["UserRights"],workspaceId);
						this._updateUserMetadata(userId,  metadata, function(error) {
							if (error) {
								return reject(error);
							}
							fs.unlinkAsync(getWorkspaceMetadataFileName(this._options, workspaceId)).catchReturn({ code: 'ENOENT' }, null)
							.then(resolve, reject);
						}.bind(this));				
					}.bind(this));
				}.bind(this));
			}.bind(this));
		}.bind(this)).then(
			function(result) {
				callback(null, result);
			},
			callback /* error case */
		);
	},

	getWorkspaceDir: function(workspaceId) {
		if (workspaceId !== WORKSPACE_ID) {
			var userId = metaUtil.decodeUserIdFromWorkspaceId(workspaceId);
			return nodePath.join.apply(null, metaUtil.getWorkspacePath(this._options.workspaceDir, workspaceId, userId));	
		}
		return this._options.workspaceDir;
	},
	
	/**
	 * update workspace data, which is the properties of workspace metadata
	 */
	updateWorkspace: function(workspaceId, workspacedata, callback) {
		var userId = metaUtil.decodeUserIdFromWorkspaceId(workspaceId);
		Promise.using(this.lock(userId, false), function() {
			return new Promise(function(resolve, reject) {
				this._readWorkspaceMetadata(workspaceId, function(error, metadata) {
					if (error) {
						return reject(error);
					}
					metadata.Properties = workspacedata.properties;
					this._updateWorkspaceMetadata(workspaceId, metadata, function(error) {
						if (error) {
							return reject(error);
						}
						resolve();
					});
				}.bind(this));
			}.bind(this));
		}.bind(this)).then(
			function(result) {
				callback(null, result);
			},
			callback /* error case */
		);
	},

	_computeLockFilePath: function(userId) {
		var root = this._options.configParams.get('orion_lockFiles_root') || this._options.workspaceDir;
		var salt = this._options.configParams.get('orion_lockFiles_salt');
		var password = this._options.configParams.get('orion_lockFiles_password');

		if (salt && password) {
			userId = new Buffer(cryptoUtil.encrypt(userId, password, salt)).toString('base64');
		}

		var userPrefix = userId.substring(0, Math.min(2, userId.length));
		var result = nodePath.join(root, userPrefix);
		result = nodePath.join(result, userId);
		return result;
	},

	/**
	 * @private
	 * Helper method to read the whole workspace metadata
	 */
	_readWorkspaceMetadata: function(workspaceId, callback) {
		var metadataFile = getWorkspaceMetadataFileName(this._options, workspaceId);
		return readJSON(metadataFile).then(function(result) { callback(null, result); }, callback);
	},

	/**
	 * @private
	 * Helper method to update the whole workspace metadata
	 */
	_updateWorkspaceMetadata: function(workspaceId, metadata, callback) {
		var metadataPath = getWorkspaceMetadataFileName(this._options, workspaceId);
		return writeJSON(metadataPath, metadata).then(callback, callback);
	},

	createUser: function(userData, callback) {
		var metadataPath = getUserMetadataFileName(this._options, userData.username);
		Promise.using(this.lock(userData.username, false), function() {
			return new Promise(function(resolve, reject) {
				fs.stat(metadataPath, function(err, stat) {
					if(stat && this._options.configParams.get('orion.single.user')) {
						let ret = new Error("Cannot create users in single user mode");
						ret.code = 400;
						logger.error(ret);
						return reject(ret);
					}
					if (!err || err.code !== 'ENOENT' || stat) {
						let ret = err && err.code !== 'ENOENT' ? err : new Error("User already exists");
						logger.error(ret);
						return reject(ret);
					}
							
					var userProperty = Object.create(null);
					if(userData.password) {
						userProperty.Password = cryptoUtil.encrypt(userData.password, "");
					}
					if(userData.oauth) {
						userProperty.OAuth = userData.oauth;
					}
					if(userData.email) {
						userProperty.Email = userData.email;
					}
					userProperty.AccountCreationTimestamp = Date.now();
					userProperty.UniqueId = userData.username;
					userProperty.UserRights = accessRights.createUserAccess(userData.username);
					userProperty.UserRightsVersion = accessRights.getCurrentVersion();
					cryptoUtil.generateAuthToken(48, function(err, token) {
						var userJson = {
							OrionVersion: VERSION,
							UniqueId: userData.username,
							UserName: userData.username,
							FullName: userData.fullname,
							authToken: token,
							emailConfirmed: false,
							WorkspaceIds:[],
							Properties: userProperty
						};
						 this._updateUserMetadata(userData.username, userJson, function(error) {
							if (error) {
								return reject(error);
							}
							resolve({
								username: userData.username,
								email: userData.email,
								fullname: userData.username,
								oauth: userData.oauth,
								properties: userProperty,
								authToken: token,
								emailConfirmed: userJson.emailConfirmed,
								workspaces:[]
							});
						}.bind(this));
					}.bind(this));
				}.bind(this));
			}.bind(this));
		}.bind(this)).then(
			function(result) {
				if(this._index) {
					return this._index.createUser(result).then(function() {
						callback(null, result);
					});
				}
				callback(null, result);
			}.bind(this),
			callback /* error case */
		);
	},

	getUser: function(id, callback) {
		Promise.using(this.lock(id, true), function() {
			return new Promise(function(resolve, reject) {
				this._readUserMetadata(id, function(error, metadata) {
					if (error) {
						return reject(error);
					}
					// TODO Check if migration is needed and migrate if so
					if (metadata) {
						var metadataToServe = {
							username: metadata.UserName,
							email: metadata.Properties.Email,
							fullname: metadata.FullName,
							oauth: metadata.Properties.OAuth,
							properties: metadata.Properties,
							emailConfirmed: Boolean(metadata.emailConfirmed || metadata.isAuthenticated),
							login_timestamp: new Date(parseInt(metadata.Properties.LastLoginTimestamp, 10)),
							disk_usage: metadata.Properties.DiskUsage,
							disk_usage_timestamp: new Date(parseInt(metadata.Properties.DiskUsageTimestamp, 10)),
							created_at:  new Date(parseInt(metadata.Properties.AccountCreationTimestamp, 10))
						};
						// TODO password needs to be handled specifically since it needs to be decrypted. (referrence setProperties line 967)				
						metadataToServe.workspaces = metadata.WorkspaceIds || [];
						return resolve(metadataToServe);
					}
					resolve(); /* indicates that there was not an error and the user does not exist */
				});
			}.bind(this));
		}.bind(this)).then(
			function(result) {
				callback(null, result);
			},
			callback /* error case */
		);
	},

	/** @callback */
	updateUser: function(id, userData, callback) {
		Promise.using(this.lock(id, false), function() {
			return new Promise(function(resolve, reject) {
				this._readUserMetadata(id, function(error, metadata) {
					if (error) {
						return reject(error);
					}
					// userData.properties contains all the properties, not only the ones that are changed, 
					// because of locking, it's safe to say the properties hasn't been changed by other operations
					metadata.Properties = userData.properties || Object.create(null);
					if(userData.fullname) {
						metadata.FullName = userData.fullname;
					}
					if(userData.password){
						metadata.Properties.Password = cryptoUtil.encrypt(userData.password, "");
					}
					if(userData.email) {
						metadata.Properties.Email = userData.email;
					}
					if(userData.login_timestamp) {
						metadata.Properties.LastLoginTimestamp = userData.login_timestamp;
						if(typeof userData.login_timestamp.getTime === 'function') {
							metadata.Properties.LastLoginTimestamp = userData.login_timestamp.getTime();
						}
					}
					if(userData.username) {
						metadata.UserName = userData.username;
					}
					if(userData.oauth) {
						metadata.Properties.OAuth = userData.oauth;
					}
		
					this._updateUserMetadata(id, metadata, function(error) {
						if (error) {
							return reject(error);
						}
						if(this._index) {
							return this._index.updateUser(id, metadata).then(() => {
								resolve(metadata);
							});
						}
						resolve(metadata);
					}.bind(this));
				}.bind(this));
			}.bind(this));
		}.bind(this)).then(
			function(result) {
				callback(null, result);
			},
			callback /* error case */
		);
	},

	/** 
	 * Deletes the given user and calls the callback. If the server is launched in single user mode
	 * the call immediately callsback with an error. The default single user mode user cannot delete themselves.
	 * @param {string} id The user id to delete
	 * @param {fn(err)} callback The function callback
	 * @callback 
	 */
	deleteUser: function(id, callback) {
		if(this._options.configParams.get('orion.single.user')) {
			return callback(new Error("The default user cannot be deleted in single user mode"));
		}
		let userLocation = getUserRootLocation(this._options, id);
		fs.access(userLocation, (err) => {
			if(err) {
				return callback(err);
			}
			rimraf(userLocation, (err) => {
				if(err) {
					return callback(err);
				}
				if(this._index) {
					return this._index.deleteUser(id).then(function() {
						callback();
					});
				}
				callback();
			});
		});
	},
	
	/**
	 * @private
	 * Helper method to read the whole user metadata
	 */
	_readUserMetadata: function(user, callback) {
		var metadataFile = getUserMetadataFileName(this._options, user);
		return readJSON(metadataFile).then(function(result) { callback(null, result); }, callback);
	},

	/**
	 * @private
	 * Helper method to read the whole user metadata
	 */
	_updateUserMetadata: function(user, metadata, callback) {
		var metadataFile = getUserMetadataFileName(this._options, user);
		return writeJSON(metadataFile, metadata).then(callback, callback);
	},

	/** @callback */
	getAllUsers: function(start, rows, callback) {
		if(typeof this._options.workspaceDir === 'string') {
			if(this._isSingleUser) {
				return this.getUser("anonymous", function(err, user) {
					callback(err, user ? [user] : user);
				});
			}
			if(this._index) {
				return this._index.getAllUsers().then((users) => {
					callback(null, users.slice(start, start+rows));
				}, (err) => {
					callback(err);
				});
			}
		}
		return callback(null, []);
	},
	
	/** @callback */
	getUserByEmail: function(email, callback) {
		if(this._index) {
			return this._index.getUserByEmail(email).then((userInfo) => {
				callback(null, userInfo);
			}, (err) => {
				callback(err)
			});
		}
		callback(new Error("There is no user index available."));
	},

	/** @callback */
	getUserByOAuth: function(oauth, callback) {
		if(this._index) {
			return this._index.getUserByOauth(oauth).then((userInfo) => {
				callback(null, userInfo);
			}, (err) => {
				callback(err)
			});
		}
		callback(new Error("There is no user index available."));
	},
	
	/** @callback */
	confirmEmail: function(user, authToken, callback) {
		Promise.using(this.lock(id, false), function() {
			return new Promise(function(resolve, reject) {
				this._readUserMetadata(user.username, function(error, metadata) {
					if (error) {
						return callback(error);
					}
					if(metadata.emailConfirmed) {
						return callback(new Error("Email is already confirmed."));
					}
					if(typeof authToken === 'string' && authToken.length > 0 && authToken === metadata.authToken) {
						metadata.emailConfirmed = true;
						return this._updateUserMetadata(id, metadata, function(error) {
							if (error) {
								return callback(error);
							}
							callback();
						});
					}
					callback(new Error("Confirmation authentication tokens do not match."));
				}.bind(this));
			}.bind(this));
		}.bind(this)).then(
			function(result) {
				callback(null, result);
			},
			callback /* error case */
		);
	},
	
	createRenameDeleteProject: function(workspaceId, projectInfo) {
		if (!workspaceId) {
			return Promise.reject(new Error('workspace id is null'));
		}
		var userId = metaUtil.decodeUserIdFromWorkspaceId(workspaceId);
		return Promise.using(this.lock(userId, false), function() {
			return new Promise(function(resolve, reject) {
				this._readWorkspaceMetadata(workspaceId, function(error, metadata) {
					if (error) {
						reject(new Error("createRenameDeleteProject failed to read workspace metadata for: " + workspaceId, error));
					}
					var that = this;
					function done() {
						that._updateWorkspaceMetadata(workspaceId, metadata, function(error) {
							if (error) {
								reject(new Error("createRenameDeleteProject failed to write workspace metadata for: " + workspaceId, error));
							}
							resolve();
						});
					}
					if (projectInfo.projectName){
						var projectJson = {
							OrionVersion: metadata.OrionVersion,
							UniqueId: projectInfo.projectName,
							WorkspaceId: workspaceId,
							FullName: projectInfo.projectName,
							Properties: {}
						};
						if (projectInfo.contentLocation.startsWith(this._options.workspaceDir)) {
							projectJson.ContentLocation = SERVERWORKSPACE + projectInfo.contentLocation.substr(this._options.workspaceDir.length);
						} else {
							projectJson.ContentLocation = projectInfo.contentLocation;
						}
						that._createProjectMetadata(workspaceId, projectInfo.projectName, projectJson, function(error) {
							if (error) {
								return reject(error);
							}
							metadata.ProjectNames.indexOf(projectInfo.projectName) === -1 && metadata.ProjectNames.push(projectInfo.projectName);
							if (projectInfo.originalPath) { // originalPath is in the format of "[ContextPath] (optional) + /file + [workspaceId] + /[originalName]/"
								return deleteProjectMetafile();
							}
							done();
						});
					} else if (projectInfo.originalPath) {
						return deleteProjectMetafile();
					} else {
						resolve(); // This shouldn't happen
					}
					function deleteProjectMetafile(){
						// Delete the old project metadata json file, and update workspace metadata Projectnames
						var segs = projectInfo.originalPath.split("/");
						var oldProjectName = projectInfo.originalPath.endsWith("/") ? segs[segs.length - 2] : segs[segs.length - 1];
						var index = metadata.ProjectNames.indexOf(oldProjectName);
						index !== -1 && metadata.ProjectNames.splice(index, 1);
						var metaFile = getProjectMetadataFileName(that._options, workspaceId, oldProjectName);
						fs.unlinkAsync(metaFile).catchReturn({ code: 'ENOENT' }, null).then(done, done);
					}
				}.bind(this));
			}.bind(this));
		}.bind(this));
	},

	/**
	 * @private
	 * Helper method to update the whole workspace metadata
	 */
	_createProjectMetadata: function(workspaceId, projectName, metadata, callback) {
		var metaFile = getProjectMetadataFileName(this._options, workspaceId, projectName);
		return writeJSON(metaFile, metadata).then(callback, callback);
	},

	getUserTasksDirectory: function(username) {
		return new Buffer(username).toString('base64');
	},

	getUserName: function(userTaskDirName) {
		return new Buffer(userTaskDirName,'base64').toString('utf8');
	},

	createTask: function(taskObj, callback) {
		if (this._isSingleUser) {
			this._taskList[taskObj.id] = taskObj;
			return callback(null);
		}

		this.updateTask(taskObj, callback);
	},

	deleteTask: function(taskMeta, callback) {
		if (this._isSingleUser) {
			delete this._taskList[taskMeta.id];
			return callback(null);
		}

		var taskRoot = nodePath.join(getTaskRootLocation(this._options), this.getUserTasksDirectory(taskMeta.username));
		var taskDir = taskMeta.keep ? taskRoot : nodePath.join(taskRoot, FILENAME_TASKS_TEMP_DIR);

		Promise.using(this.lock(taskMeta.username, false), function() {
			return new Promise(function(resolve, reject) {
				fs.statAsync(taskDir).then(
					function(stat) {
						if (stat.isDirectory()) {
					        var taskFile = nodePath.join(taskDir, taskMeta.id);
					        fs.unlinkAsync(taskFile).then(resolve, reject);
					    } else {
							resolve(); // path does not exist
						}
					},
					reject /* error case */
				);	
			});
		}).then(callback, callback /* error case */ );

	},

	getTask: function(taskMeta, callback) {
		if (this._isSingleUser) {
			return callback(null, this._taskList[taskMeta.id]);
		}

		var taskRoot = nodePath.join(getTaskRootLocation(this._options), this.getUserTasksDirectory(taskMeta.username));
		var taskDir = taskMeta.keep ? taskRoot : nodePath.join(taskRoot, FILENAME_TASKS_TEMP_DIR);
		var taskFile = nodePath.join(taskDir, taskMeta.id);

		Promise.using(this.lock(taskMeta.username, true), function() {
			return new Promise(function(resolve, reject) {
				return readJSON(taskFile).then(resolve, reject);
			});
		}).then(
			function(result) {
				callback(null, result);
			},
			callback /* error case */
		);
	},

	getTasksForUser: function(username, callback) {
		if (this._isSingleUser) {
			var result = [];
			Object.keys(this._taskList).forEach(function(id) {
				if (this._taskList[id].username === username) {
					result.push(this._taskList[id]);
				}
			}.bind(this));
			return callback(null, result);
		}

		// won't return temp tasks
		var taskRoot = nodePath.join(getTaskRootLocation(this._options), this.getUserTasksDirectory(username));
		
		Promise.using(this.lock(username, true), function() {
			return new Promise(function(resolve, reject) {
				return fs.readdirAsync(taskRoot).then(
					function(files) {
						var fileReadPromises = [];
						files.forEach(function(filename) {
							if (filename !== FILENAME_TASKS_TEMP_DIR && !filename.startsWith(".")) {
								fileReadPromises.push(readJSON(nodePath.join(taskRoot, filename)));					
							}
						});
						return Promise.all(fileReadPromises).then(resolve);
					},
					reject
				);
			});
		}).then(
			function(result) {
				callback(null, result);
			},
			callback /* error case */
		);
	},

	updateTask: function(taskObj, callback) {
		if (this._isSingleUser) {
			return callback(null);
		}

		var taskRoot = nodePath.join(getTaskRootLocation(this._options), this.getUserTasksDirectory(taskObj.username));
		var taskDir = taskObj.keep ? taskRoot : nodePath.join(taskRoot, FILENAME_TASKS_TEMP_DIR);

		Promise.using(this.lock(taskObj.username, false), function() {
			return new Promise(function(resolve, reject) {
				var taskFile = nodePath.join(taskDir, taskObj.id);
				return writeJSON(taskFile, taskObj.toJSON(taskObj, true)).then(resolve, reject);
			});
		}).then(
			function(result) {
				callback(null, result);
			},
			callback /* error case */
		);
	}
});

module.exports = function(options) {
	return new FsMetastore(options);
};
