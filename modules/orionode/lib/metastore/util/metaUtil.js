/*******************************************************************************
 * Copyright (c) 2017, 2018 IBM Corporation and others.
 * All rights reserved. This program and the accompanying materials are made 
 * available under the terms of the Eclipse Public License 2.0 
 * (http://www.eclipse.org/legal/epl-v10.html), and the Eclipse Distribution 
 * License v1.0 (http://www.eclipse.org/org/documents/edl-v10.html). 
 *
 * Contributors:
 *	 IBM Corporation - initial API and implementation
 *******************************************************************************/
const args = require('../../args'),
	async = require("async"),
	api = require('../../api'),
	Promise = require('bluebird');

const SEPARATOR = "-";

/**
 * If the `orion.auth.admin.default.password` property is set, automatically create an admin user
 * @param {{?}} options The server options map
 * @param {{?}} store The backing metastore to create the admin user in
 * @returns {Promise} Returns a promise to create the default admin user
 * @since 18.0
 */
module.exports.initializeAdminUser = function initializeAdminUser(options, store) {
	return new Promise(function(resolve, reject) {
		const pw = options.configParams.get("orion.auth.admin.default.password");
		if(typeof pw === 'string' && pw.length > 0) {
			const userData = {
				username: "admin",
				email: "admin",
				fullname: "admin",
				password: pw,
				properties:{}
			};
			return store.getUser("admin", function(err, user) {
				if(user) {
					return resolve(user);
				}
				return store.createUser(userData, function(err, user) {
					if(err) {
						return reject(err);
					}
					return resolve(user);
				});
			});
		}
		return resolve({});
	});
};

/**
 * Utility function to initialize the `anonymous` user. This function does not return a result, instead it calls the 
 * given `next()` function to proceed
 * @param {XMLHttpRequest} req The original request
 * @param {fn} next The routing function to proceed with once the user is initialized
 * @param {{?}} store The backing file store
 * @since 18.0
 */
module.exports.initializeAnonymousUser = function initializeAnonymousUser(req, next, store) {
	if (store._isSingleUser) {
		store.getUser("anonymous", function(err, user) {
			if (err) {
				throw new Error("Failed to get 'anonymous' user's metadata");
			}
			if (!user) {
				store.createUser({
					username: "anonymous",
					fullname: "anonymous",
					email: "anonymous",
					password: "default",
					properties: {}
				}, /** @callback */ function(err, user) {
					// TODO can err possibly happen in this context?
					req.user = user;
					next();
				});
			} else {
				req.user = user;
				next();
			}
		});
	} else {
		next();
	}
};

module.exports.encodeWorkspaceId = function (userId, workspaceName) {
	var workspaceId = workspaceName.replace(/ /g, "").replace(/\#/g, "").replace(/\-/g, "");
	return userId + SEPARATOR + workspaceId;
};

module.exports.decodeUserIdFromWorkspaceId = function (workspaceId) {
	var index = workspaceId.lastIndexOf(SEPARATOR);
	if (index === -1) {
		return null;
	}
	return workspaceId.substring(0, index);
};

var decodeWorkspaceNameFromWorkspaceId = module.exports.decodeWorkspaceNameFromWorkspaceId = function (workspaceId) {
	var index = workspaceId.lastIndexOf(SEPARATOR);
	if (index === -1) {
		return null;
	}
	return workspaceId.substring(index + 1);
};

/**
 * Tries to compose the workspace path from the workspace directory, the current workspaces ID, and the current 
 * user.
 * @param {string} workspaceDir The path to the workspace directory
 * @param {string} workspaceId The identifier of the workspace
 * @param {string} userId The ID of the current user
 * @returns {string[]} The array of segments to join to make the workspace path
 */
var getWorkspacePath = module.exports.getWorkspacePath = function(workspaceDir, workspaceId, userId) {
	var segments = [workspaceDir];
	if(typeof userId === 'string' && userId.length > 0) {
		segments.push(userId.substring(0,2));
		segments.push(userId);
	} 
	var wid = decodeWorkspaceNameFromWorkspaceId(workspaceId);
	if(wid) {
		segments.push(wid);
	}
	return segments;
};

module.exports.createWorkspaceDir = function (workspaceDir, userId, workspaceId, callback) {
	args.createDirs(getWorkspacePath(workspaceDir, workspaceId, userId), callback);
};

module.exports.readMetaUserFolder = function (workspaceDir, userId){
	return [workspaceDir, userId.substring(0,2), userId];
};

module.exports.getSeparator = function (){
	return SEPARATOR;
};

module.exports.getWorkspaceMeta = function (workspaceIds, store, workspaceRoot){
	var workspaceInfos = [];
	return new Promise(function(fulfill, reject){
		async.each(workspaceIds, 
			function(workspaceId, cb){
				if(typeof workspaceId !== "string"){
					workspaceId = workspaceId.id; // workspaceId is mongo object.
				}
				store.getWorkspace(workspaceId, function(err, workspaceMeta){
					if (err) {
						return cb(err);
					}
					if (workspaceMeta) {
						workspaceInfos.push({
							Id: workspaceId,
							Location: api.join(workspaceRoot, workspaceId),
							Name: workspaceMeta.name
						});
					}
					return cb();
				});
			}, 
			function(err) {
				if(err){
					return reject(err);
				}
				return fulfill();
			});
	}).then(function(){
		return workspaceInfos;
	});
};
