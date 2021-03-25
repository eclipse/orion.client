/*******************************************************************************
 * Copyright (c) 2016, 2017 IBM Corporation and others.
 * All rights reserved. This program and the accompanying materials are made 
 * available under the terms of the Eclipse Public License 2.0 
 * (http://www.eclipse.org/legal/epl-v10.html), and the Eclipse Distribution 
 * License v1.0 (http://www.eclipse.org/org/documents/edl-v10.html). 
 *
 * Contributors:
 *     IBM Corporation - initial API and implementation
 *******************************************************************************/
/*eslint-env node*/
var fileUtil = require('./fileUtil');
var express = require('express');
var tree = require('./shared/tree');
var api = require('./api');
var sharedUtil = require('./shared/sharedUtil');
var SharedFileDecorator = require('./shared/sharedDecorator').SharedFileDecorator;
var jwt = require('jsonwebtoken');

module.exports.router = function(options) {
	if (!options.fileRoot) { throw new Error('options.fileRoot is required'); }
	if (!options.sharedWorkspaceFileRoot) { throw new Error('options.sharedWorkspaceFileRoot is required'); }

	/**
	 * This method ensures that the websocket trying to retrieve and save content is authenticated.
	 * We allow two different authentication methods: JWT for the collab server and user token for users.
	 */
	function checkCollabAuthenticated(req, res, next) {
		if (req.user) {
			req.user.workspaceDir = options.workspaceDir + (req.user.workspace ? "/" + req.user.workspace : "");
			next();
		} else if (req.headers['authorization'] && checkCollabServerToken(req.headers['authorization'])){
			next();
		} else {
			api.writeError(401, res, "Not authenticated");
		}
	}

	/**
	 * Check the JWT token for collab server
	 */
	function checkCollabServerToken(authorization) {
		if (authorization.substr(0, 7) !== "Bearer ") {
			return false;
		}
		try {
			var decoded = jwt.verify(authorization.substr(7), options.configParams.get("orion.jwt.secret"));
			return true;
		} catch (ex) {
			return false;
		}
	}
	
	var router = express.Router();

	router.use("/tree", tree.router(options));
	router.use("/project", require('./shared/db/sharedProjects')(options));
	router.use("/user", require('./shared/db/userProjects')(options));
	fileUtil.addDecorator(new SharedFileDecorator(options));
	sharedUtil(options);
	return [checkCollabAuthenticated, router];
};
