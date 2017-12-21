/*******************************************************************************
 * Copyright (c) 2017 IBM Corporation and others.
 * All rights reserved. This program and the accompanying materials are made 
 * available under the terms of the Eclipse Public License v1.0 
 * (http://www.eclipse.org/legal/epl-v10.html), and the Eclipse Distribution 
 * License v1.0 (http://www.eclipse.org/org/documents/edl-v10.html). 
 *
 * Contributors:
 *	 IBM Corporation - initial API and implementation
 *******************************************************************************/
var args = require('../../args');
var async = require("async");
var api = require('../../api');
var SEPARATOR = "-";
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
		async.series(workspaceIds.map(function(workspaceId){
			return function(cb) {
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
			};
		}),function(err){
			if(err){
				return reject(err);
			}
			return fulfill();
		});
	}).then(function(){
		return workspaceInfos;
	})
};