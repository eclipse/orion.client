/*******************************************************************************
 * Copyright (c) 2016, 2018 IBM Corporation and others.
 * All rights reserved. This program and the accompanying materials are made 
 * available under the terms of the Eclipse Public License 2.0 
 * (http://www.eclipse.org/legal/epl-v10.html), and the Eclipse Distribution 
 * License v1.0 (http://www.eclipse.org/org/documents/edl-v10.html). 
 *
 * Contributors:
 *	 IBM Corporation - initial API and implementation
 *******************************************************************************/
var expressSession = require('express-session'),
	mongoose = require('mongoose'),
	Promise = require('bluebird'),
	passportLocalMongooseEmail = require('passport-local-mongoose-email'),
	MongoStore = require('connect-mongo')(expressSession),
	api = require('../../api'),
	path = require('path'),
	passport = require('passport'),
	log4js = require('log4js'),
	mkdirp = require('mkdirp'),
	metaUtil = require('../util/metaUtil'),
	rimraf = require('rimraf'),
	fs = require('fs'),
	accessRights = require('../../accessRights'),
	logger = log4js.getLogger("mongo-store");

mongoose.Promise = Promise;

var workspaceSchema = new mongoose.Schema({
	name: {
		type: String,
		required: true
	},
	id: {
		type: String,
		unique: true,
		sparse: true,
		required: true
	},
	properties: {
		type: mongoose.Schema.Types.Mixed
	}
}, { usePushEach: true });
var orionAccountSchema = new mongoose.Schema({
	username: {
		type: String,
		unique: true,
		required: true
	},
	email: {
		type: String,
		required: true,
		unique: true
	},
	fullname: {
		type: String
	},
	oauth: {
		type: String
	},
	properties: {
		type: mongoose.Schema.Types.Mixed
	},
	workspaces: [
		workspaceSchema
	],
	login_timestamp: {
		type: Date
	},
	disk_usage: {
		type: String
	},
	disk_usage_timestamp: {
		type: Date
	},
	created_at: {
		type: Date,
		"default": Date.now
	}
}, { usePushEach: true });
orionAccountSchema.plugin(passportLocalMongooseEmail);
var orionAccount = mongoose.model('orionAccount', orionAccountSchema);

var taskSchema = new mongoose.Schema({
	id: {
		type: String,
		required: true,
		unique: true
	},
	username: {
		type: String,
		required: true
	},
	keep: {
		type: Boolean,
		required: true
	},
	lengthComputable: {
		type: Boolean,
		required: true
	},
	type: {
		type: String,
		required: true
	},
	loaded: Number,
	total: Number,
	message: String,
	result: mongoose.Schema.Types.Mixed,
	timestamp: Number,
	expires: Number,
	cancelable: Boolean
	// uriUnqualStrategy: String // TODO needed?
}, { usePushEach: true });
var orionTask = mongoose.model("orionTask", taskSchema);

// If `user` has already been fetched from DB, use it, otherwise obtain from findByUsername
function findUser(id, user, callback) {
	if (typeof user.save === 'function') {
		callback(null, user);
	} else {
		orionAccount.findByUsername(id, callback);
	}
}

function MongoDbMetastore(options) {
	this.options = options;
	if (options.configParams.get("orion.mongodb.cf")) {
		var cfenv = require('cfenv');
		var appenv = cfenv.getAppEnv();
		var services = appenv.services;
		var mongodb_services = services["compose-for-mongodb"];
			if(mongodb_services){
				var credentials = mongodb_services[0].credentials;
				var ca = [new Buffer(credentials.ca_certificate_base64, 'base64')];
				mongoose.connect(credentials.uri, {
					useMongoClient: true,
					mongos: {
						ssl: true,
						sslValidate: true,
						sslCA: ca,
						poolSize: 1,
						reconnectTries: 1
					}
				});
			}
	} else if (options.configParams.get("orion.mongodb.url")) {
		mongoose.connect(options.configParams.get("orion.mongodb.url"), {
			useMongoClient: true
		});
	} else {
		mongoose.connect("mongodb://localhost/orion_multitenant", {
			useMongoClient: true
		});
	}
	api.getOrionEE().on("close-server", function() {
		logger.info("Closing MongoDB");
		if (mongoose && (mongoose.connection.readyState === 1 || mongoose.connection.readyState === 2)) {
			mongoose.disconnect();
		}
	});
}
MongoDbMetastore.prototype.setup = function(options) {
	options.sessionStore = new MongoStore({ mongooseConnection: mongoose.connection });
	passport.use(orionAccount.createStrategy());
	passport.serializeUser(orionAccount.serializeUser());
	passport.deserializeUser(orionAccount.deserializeUser());
	metaUtil.initializeAdminUser(options, this);
};

Object.assign(MongoDbMetastore.prototype, {
	createWorkspace: function(userId, workspaceData, callback) {
		this.getUser(userId, function(err, user) {
			if (err) {
				return callback(err, null);
			}
			var w = {
				name: workspaceData.name,
				id: metaUtil.encodeWorkspaceId(userId, workspaceData.id || workspaceData.name)
			};
			user.workspaces.push(w);
			var workspaceUserRights = accessRights.createWorkspaceAccess(w.id);
			var parsedProperties = JSON.parse(user.properties);
			parsedProperties.UserRights = (parsedProperties.UserRights || accessRights.createUserAccess(userId)).concat(workspaceUserRights);
			user.properties = JSON.stringify(parsedProperties, null, 2);
			user.save(function(err) {
				if (err) {
					return callback(err, null);
				}
				metaUtil.createWorkspaceDir(this.options.workspaceDir, userId, w.id, function(err) {
					if (err) {
						return callback(err, null);
					}
					callback(null, w);
				});
			}.bind(this));
		}.bind(this));
	},
	getWorkspace: function(workspaceId, callback) {
		var userId = metaUtil.decodeUserIdFromWorkspaceId(workspaceId);
		this.getUser(userId, function(err, user) {
			if (err) {
				return callback(err, null);
			}
			var workspace;
			if (user && user.workspaces) {
				user.workspaces.some(function(w) {
					if (w.id === workspaceId) {
						workspace = w;
						return true;
					}
				});
			}
			callback(null, workspace);
		});
	},
	deleteWorkspace: function(workspaceId, callback) {
		var userId = metaUtil.decodeUserIdFromWorkspaceId(workspaceId);
		orionAccount.update(
		  {username: userId},
		  { $pull: {'workspaces': {id: workspaceId}}},
		  callback
		);
	},
	getWorkspaceDir: function(workspaceId) {
		var userId = metaUtil.decodeUserIdFromWorkspaceId(workspaceId);
		var workspacePath = path.join(this.options.workspaceDir, userId.substring(0,2), userId, metaUtil.decodeWorkspaceNameFromWorkspaceId(workspaceId));
		mkdirp.sync(workspacePath); // TODO make it async
		return workspacePath;
	},
	
	createUser: function(userData, callback) {
		userData.properties= JSON.stringify({
			"UserRights": accessRights.createUserAccess(userData.username),
			"UserRightsVersion": accessRights.getCurrentVersion()
		}, null, 2);
		var password = userData.password;
		delete userData.password;
		orionAccount.register(new orionAccount(userData), password, function(err, user){
			if (err) {
				return callback(err);
			}
			callback(null, user);
		});
	},
	getAllUsers: function(start, rows, callback) {
		orionAccount.find({}, function(err, users) {
			if (err) {
				return callback(err);
			}
			return callback(null, users);
		});
	},
	getUser: function(id, callback) {
		orionAccount.findByUsername(id, callback);
	},
	getUserByEmail: function(email, callback) {
		orionAccount.find({ email: email }, function(err, user) {
			if (err) {
				return callback(err);
			}
			callback(null, user[0]);
		});
	},
	// returns the user with the given oauth token
	getUserByOAuth: function(oauth, callback) {
		orionAccount.find({oauth: new RegExp("^" + oauth + "$", "m")}, function(err, user) {
			if (err) {
				return callback(err);
			}
			if (user && user.length) {
				return callback(null, user[0]);
			}
			return callback(null, null);
		});
	},
	// @param userData either a plain object or an already-parsed mongoose DB object
	updateUser: function(id, userData, callback) {
		findUser(id, userData, function(err, user) {
			if (err) {
				return callback(err);
			}
		
			if (typeof userData === "function") {
				userData = userData(user);
				if (!userData) {
					return resolve();
				}
			}
			
			// mixin new properties
			// userData.properties contains all the properties, not only the ones that are changed, 
			// because of locking, it's safe to say the properties hasn't been changed by other operations
			if (typeof user.properties !== "string") {
				user.properties = JSON.stringify(user.properties, null, 2);
			}
			Object.assign(user, userData);
			// Setting password and authToken are special cases handled by specific methods
			if (typeof userData.password !== 'undefined') {
				user.setPassword(userData.password, function(err, user) {
					if (err) {
						return callback(err);
					}
					delete userData.password;
					user.save(callback);
				});
			} else if (typeof userData.authToken !== 'undefined') {
				// NOTE this ignores the provided auth token and generates a new one internally
				user.setAuthToken(function(err, user) {
					if (err) {
						return callback(err);
					}
					user.save(callback);
				});
			} else {
				user.save(callback);
			}
		});
	},
	/**
	 * Delete the user from the store with the given user ID
	 * @param {string} id The user identifier to delete
	 * @param {fn(Error: err)} callback The callback to call when complete
	 */
	deleteUser: function deleteUser(id, callback) {
		orionAccount.findByUsername(id, function(err, user) {
			if(err) {
				callback(err);
			}
			const userPath = path.join(this.options.workspaceDir, id.substring(0,2));
			fs.access(userPath, (err) => {
				if(err) {
					callback(err);
				}
				//TODO should a delete failure prevent the user delete?
				return rimraf(userPath, (err) => {
					if(err) {
						callback(err);
					}
					orionAccount.remove({username: id}, callback);
				});
			});
		}.bind(this));
	},
	confirmEmail: function(user, authToken, callback) {
		orionAccount.verifyEmail(authToken, callback);
	},
	createTask: function(taskObj, callback) {
		taskObj._mongooseTask = new orionTask();
		this.updateTask(taskObj, callback);
	},
	deleteTask: function(taskMeta, callback) {
		orionTask.remove({id: taskMeta.id}, callback);
	},
	getTask: function(taskMeta, callback) {
		orionTask.find(
			{id: taskMeta.id},
			function(err, mongooseTasks) {
				if (err) {
					callback(err);
				} else {
					callback(null, mongooseTasks[0]);
				}
			});
	},
	getTasksForUser: function(username, callback) {
		orionTask.find({username: username}, callback);
	},	
	updateTask: function(taskObj, callback) {
		var mongooseTask = taskObj._mongooseTask;
		mongooseTask.id = taskObj.id;
		mongooseTask.username = taskObj.username;
		mongooseTask.keep = Boolean(taskObj.keep);
		mongooseTask.lengthComputable = Boolean(taskObj.lengthComputable);
		mongooseTask.type = taskObj.type;

		mongooseTask.loaded = taskObj.loaded;
		mongooseTask.total = taskObj.total;
		mongooseTask.message = taskObj.message;

		mongooseTask.result = taskObj.result;
		mongooseTask.timestamp = taskObj.timestamp;
		if (taskObj.expires) {
			mongooseTask.expires = taskObj.expires;
		}
		mongooseTask.cancelable = Boolean(taskObj.cancelable);
//		if (taskObj.uriUnequalStrategy) {
//			mongooseTask.uriUnequalStrategy = taskObj.uriUnequalStrategy; // TODO needed?
//		}

		mongooseTask.save(callback);
	}
});

module.exports = function(options) {
	return new MongoDbMetastore(options);
};
