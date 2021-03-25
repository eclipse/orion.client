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
/*eslint-env node */
var express = require('express'),
	api = require('./api'),
	responseTime = require('response-time');

const BUILD_ID = "unknown";

module.exports.router = function versionRouter(options) {
	var configParams = options.configParams;
	if (!configParams) {
		throw new Error('options.configParams is required'); 
	}
	var buildID = configParams.get("orion.buildId") || BUILD_ID;
	const pjson = require('../package.json');
	if(buildID === "unknown" && pjson && typeof pjson.version === 'string') {
		//for the NPM case we want to return the version published to NPM (from the package.json)
		buildID = pjson.version;
	}
	try {
		var build =  require('../build.json');
		
	} catch (err) {
		build = {build: buildID};
	}
	return express.Router()
		.use(responseTime({digits: 2, header: "X-Version-Response-Time", suffix: true}))
		.get('*', /* @callback */ function (req, res) {
			return api.writeResponse(200, res, null, build);
		});
};
