/*******************************************************************************
 * Copyright (c) 2013, 2019 IBM Corporation and others.
 * All rights reserved. This program and the accompanying materials are made 
 * available under the terms of the Eclipse Public License 2.0 
 * (http://www.eclipse.org/legal/epl-v10.html), and the Eclipse Distribution 
 * License v1.0 (http://www.eclipse.org/org/documents/edl-v10.html). 
 *
 * Contributors:
 *     IBM Corporation - initial API and implementation
 *******************************************************************************/
/*eslint-env node, mocha*/
var assert = require("assert"),
	express = require("express"),
	supertest = require('supertest-with-proxy'),
	orionMiddleware = require("../index"),
	checkRights = require('../lib/accessRights').checkRights,
	path = require("path"),
	testHelper = require('./support/testHelper'),
 	testData = require("./support/test_data");

var WORKSPACE = testHelper.WORKSPACE,
	METADATA =  testHelper.METADATA;

var CONTEXT_PATH = testHelper.CONTEXT_PATH;

var nconf = require("nconf");
nconf.set("orion.single.user", true);
nconf.set("orion.single.user.metaLocation", METADATA);
if (CONTEXT_PATH) {
	nconf.set("orion.context.listenPath", true);
	nconf.set("orion.context.path", CONTEXT_PATH);
}

var orion = function(options) {
	// Ensure tests run in 'single user' mode
	options = options || {};
	options.workspaceDir = WORKSPACE;
	options.configParams = nconf;
	return orionMiddleware(options);
}

/**
 * @callback
 */
var userMiddleware = function(req, res, next) {
	req.user = {workspaceDir: WORKSPACE};
	req.user.checkRights = checkRights;
	next();
};

describe("orion", function() {
	after("Remove Workspace and Metastore", function(done) {
		testData.tearDown(WORKSPACE, function(){
			testData.tearDown(path.join(METADATA, '.orion'), function(){
				testData.tearDown(METADATA, done)
			})
		});
	});
	var app, request;
	beforeEach(function(done) {
		app = express();
		request = supertest.bind(null, app);
		testData.setUp(WORKSPACE, done);
	});

	describe("options", function() {
		it("demands workspaceDir", function(done) {
			try {
				assert.throws(orionMiddleware.bind(null));
			} catch (e) {
					done(e);
			}
			done();
		});
		it("accepts cache-max-age", function(done) {
			app.use(userMiddleware)
			.use(orion({
				maxAge: 31337 * 1000 // ms
			}));
			request()
      .get("/index.html")
      .proxy(testHelper.TEST_PROXY)
			.expect("cache-control", /max-age=31337/, done); //seconds
		});
	});

	describe("middleware", function() {
		beforeEach(function(done) {
			app.use(userMiddleware);
			done()
		});

		// Make sure that we can .use() the orion server as an Express middleware
		it("exports #createServer", function() {
			app.use(orion({ }));
			request()
      .get("/workspace")
      .proxy(testHelper.TEST_PROXY)
			.expect(200);
		});

		// Sanity check to ensure the orion client code is being mounted correctly
		it("finds the orion.client code", function() {
			app.use(orion({ }));
			request()
      .get("/index.html")
      .proxy(testHelper.TEST_PROXY)
			.expect(200);
		});

		it("works at a non-server-root route", function(done) {
			app.use("/wow/such/orion", orion({ }));
			request()
      .get("/wow/such/orion/index.html")
      .proxy(testHelper.TEST_PROXY)
			.expect(200, done);
		});
	});
});
