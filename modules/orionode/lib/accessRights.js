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
let api = require('./api'),
	fileUtil = require('./fileUtil');

const POST = 1;
const PUT = 2;
const GET = 4;
const DELETE = 8;
const FULLACCESSRIGHT = 15; // 15 is POST | PUT | GET | DELETE
const CURRENT_VERSION = 3;

/**
 * Creates the default set of workspace access rights for the given workspace ID
 * @param {string} workspaceId The ID of the workspace
 * @returns {{?}[]} The new array of access rights
 */
let createWorkspaceAccess = function(workspaceId){
	return [{
		"Method": FULLACCESSRIGHT,
		"Uri": "/workspace/" + workspaceId
	},
	{
		"Method": FULLACCESSRIGHT,
		"Uri": "/workspace/" + workspaceId + "/*"
	},
	{
		"Method": FULLACCESSRIGHT,
		"Uri": "/file/" + workspaceId
	},
	{
		"Method": FULLACCESSRIGHT,
		"Uri": "/file/" + workspaceId + "/*"
	}];
};
module.exports.createWorkspaceAccess = createWorkspaceAccess;

/**
 * Remove the workspace access for the given workspace ID
 * @param {{?}[]} userAccessRights The current array of access rights
 * @param {string} workspaceId The ID of the workspace to remove access for
 * @returns {{?}[]} The new array of access rights
 */
let removeWorkspaceAccess = function removeWorkspaceAccess(userAccessRights, workspaceId) {
	var newAccessRights = [];
	if(Array.isArray(userAccessRights)) {
		userAccessRights.forEach(function(accessRight) {
			if(!new RegExp("/" + workspaceId + "(\/|$)").test(accessRight.Uri)) {
				newAccessRights.push(accessRight);
			}
		});
	}
	return newAccessRights;
};
module.exports.removeWorkspaceAccess = removeWorkspaceAccess;

/**
 * Creates the default array of user access rights
 * @param {*} UserId The user ID to create rights for
 * @returns {Object[]}
 */
let createUserAccess = function createUserAccess(UserId) {
	return [{
		"Method": FULLACCESSRIGHT,
		"Uri": "/users/" + UserId
	}];
};
module.exports.createUserAccess = createUserAccess;

/**
 * Callback used in checkAccess
 * @param {bool} access If the requesting user has access
 * @param {XmlHttpRespsose} res The backing response
 * @param {*} err The returned error, if any
 * @param {fn} next The function to move the express routing queue
 * @param {string} uri The URI that attempted to be accessed
 */
function hasAccess(access, res, err, next, uri){
	if (err) {
		api.writeError(404, res, err);
	} 
	if(access) {
		next();
	} else {
		api.writeError(403, res, "You cannot access: " + uri);
	}
}

/**
 * Utility function to cmompute the access method from the request name
 * @param {string} methodName The name of the request method
 */
function getMethod(methodName){
	switch(methodName) {
		case "POST": return POST;
		case "PUT": return PUT;
		case "GET": return GET;
		case "DELETE": return DELETE;
	}
	return 0;
}

/**
 * Utility function to check if the request matches a given pattern of access
 * @param {string} text The text to check
 * @param {string} pattern The access pattern
 * @returns {bool} If the text matches the given access pattern
 */
function wildCardMatch(text, pattern){
	var cards = pattern.split("*");
	if (!pattern.startsWith("*") && !text.startsWith(cards[0])) { //$NON-NLS-1$
		return false;
	}
	if (!pattern.endsWith("*") && !text.endsWith(cards[cards.length - 1])) { //$NON-NLS-1$
		return false;
	}
	return !cards.some(function(card){
		var idx = text.indexOf(card);
		if (idx === -1){
			return true;
		}
		text = text.substring(idx + card.length);
	});
}

/**
 * Function to fetch the authorization data from the given metadata
 * @param {{?}} metadata The metadata object
 * @param {{?}} store The backing metastore
 * @returns {{?}[]}
 */
function getAuthorizationData(metadata, store){
	var properties;
	var workspaceIDs;
	var isPropertyString;
	if (typeof metadata.properties === "string") {
		isPropertyString = true;
		properties = JSON.parse(metadata.properties); // metadata.properties need to be parse when using MongoDB
		workspaceIDs = metadata.workspaces.map(function(workspace){
			return workspace.id;
		});
	} else {
		isPropertyString = false;
		properties = metadata.properties; // metadata.properties don't need to be parse when using FS
		workspaceIDs = metadata.WorkspaceIds; // This is only needed for Java server's metadata migration from old Java code
	}
	var version = properties["UserRightsVersion"] || 1; //assume version 1 if not specified
	var userRightArray = [];
	if (version === 1 || version === 2) { // This only for Java server's metadata migration 
		workspaceIDs.forEach(function(workspaceId){
			userRightArray = userRightArray.concat(createUserAccess(metadata["UniqueId"]).concat(createWorkspaceAccess(workspaceId)));
		});
		properties["UserRights"] = userRightArray;
		properties["UserRightsVersion"] = CURRENT_VERSION;
		if (isPropertyString) {
			metadata.properties = JSON.stringify(properties, null, 2);
		}
		store.updateUser(metadata["UniqueId"], metadata, function(){});
	} else {
		userRightArray = properties.UserRights;
	}
	return userRightArray;
}
/**
 * Exported function that can be reused to check if a given user ID has access to the requested resource
 * @param {string} userId The user to check
 * @param {string} uri The full URI (in string form) of the requested resource
 * @param {XmlHttpRequest} req The original request 
 * @param {XmlHttpResponse} res The original response 
 * @param {fn} next The Express routing function to advance the queue
 * @param {string} method The method to check access for
 */
module.exports.checkRights = function checkRights(userId, uri, req, res, next, method) {
	var	methodMask = getMethod(method || req.method);
	if (uri === "/workspace") {
		return hasAccess(true, res, null, next), uri;
	}
	// any user can access their site configurations
	if (uri.startsWith("/site")) {
		return hasAccess(true, res, null, next, uri);
	}
	// any user can access their own profile
	if (uri === "/users/" + userId) {
		return hasAccess(true, res, null, next, uri);
	}
	// any user can access tasks
	if (uri.startsWith("/task")) {
		return hasAccess(true, res, null, next, uri);
	}
	var store = fileUtil.getMetastore(req);
	store.getUser(userId, function(err, metadata) {
		if (err) {
			return hasAccess(null, res, err, next, uri);
		}
		if (typeof metadata === "undefined") {
			return hasAccess(false, res, null, next, uri);
		}
		var userRightArray = getAuthorizationData(metadata, store);
		var access = userRightArray && userRightArray.some(function(userRight){
			if(wildCardMatch(uri, userRight.Uri) && ((methodMask & userRight.Method) === methodMask)) {
				return true;
			}
		});
		return hasAccess(access, res, null, next, uri);
	});	
};

/**
 * Returns the current version of the access rights
 * @returns {number} The version of access rights
 */
module.exports.getCurrentVersion = function getCurrentVersion() {
	return CURRENT_VERSION;
};
