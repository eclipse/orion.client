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
let express = require('express'),
	apps = require('./cf/apps'),
	domains = require('./cf/domains'),
	logz = require('./cf/logz'),
	manifests = require('./cf/manifests').ManifestRouter,
	orgs = require('./cf/orgs_spaces'),
	plans = require('./cf/plans'),
	routes = require('./cf/routes'),
	services = require('./cf/services'),
	target = require('./cf/target'),
	responseTime = require('response-time');
	
/**
 * @description Class for setting up cloud foundry support
 * @class
 */
class CloudFoundry {
	/**
	 * @description Create a new instance of the class
	 */
	constructor() {}
	/**
	 * @description Create an express Router for handling /manifests
	 * @param {?} options The map of options. The option 'fileRoot' must be specified. All other options are optional
	 * @returns {Router} A new express router
	 * @throws {Error} If options.filePath is not defined
	 */
	createRouter(options) {
		if (!options || !options.fileRoot) { 
			throw new Error('options.fileRoot is required'); 
		}
		let router = express.Router();
		router.use(responseTime({digits: 2, header: "X-CFapi-Response-Time", suffix: true}));
		router.use("/apps", apps.router(options));
		router.use("/domains", domains.router(options));
		router.use("/logz", logz.router(options));
		router.use("/manifests", new manifests().createRouter(options));
		router.use("/orgs", orgs.router(options));
		router.use("/plans", plans.router(options));
		router.use("/routes", routes.router(options));
		router.use("/services", services.router(options));
		router.use("/target", target.router(options));
		return router;
	}
}

/**
 * API callback to load the endpoint
 * @param {{?}} options 
 */
module.exports.router = function router(options) {
	let cf = new CloudFoundry();
	return cf.createRouter(options);
};
