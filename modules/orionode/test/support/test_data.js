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
/*eslint-env node*/
const path = require('path'),
	fs = require('fs'),
	rimraf = require('rimraf'),
	express = require('express'),
  supertest = require('supertest-with-proxy'),
	orionServer = require("../../index"),
	checkRights = require('../../lib/accessRights').checkRights,
	testHelper = require('./testHelper'),
	nconf = require("nconf"),
	taskHelper = require('./task_helper'),
	CONTEXT_PATH = testHelper.CONTEXT_PATH;

var request;
function debug(msg) {
	if (exports.DEBUG) {
		console.log(msg);
	}
}

/**
 * Deletes dir and everything in it.
 * @param {string} dir The directory to delete
 * @param {fn} callback The function to call when the deletion is done
 */
exports.tearDown = tearDown = function tearDown(dir, callback) {
	rimraf(dir, callback);
};

/**
 * Sets up the workspace metadata 
 * @param {string} workspace The workspace path
 * @param {?} metastore The backing metastore
 * @param {?} params The params to use
 */
exports.setUpWorkspace = function setUpWorkspace(request, done) {
	request()
		.post(CONTEXT_PATH + '/workspace')
		.set('Slug', 'Orion Content')
		.expect(201)
		.end(done);
};

/**
 * Synchronously creates a workspace directory with a few files and folders.
 * Uses POSIX shell commands, so on Windows this must be run from within a Cygwin or MinGW shell. CMD.EXE will not work.
 <pre>
   dir
   |---project/
   |-----fizz.txt
   |-----my folder/
   |-------buzz.txt
   |-------my subfolder/
 </pre>
 */
exports.setUp = function setUp(dir, callback, wsjson) {
	debug('Using directory: ' + dir);
	function generateContent() {
		debug('\nCreating content...');
		var projectFolder = path.join(dir, "project");
		var myFolder = path.join(projectFolder, "my folder");
		var subfolder = path.join(myFolder, "my subfolder");

		fs.mkdirSync(projectFolder);
		fs.mkdirSync(myFolder);
		fs.mkdirSync(subfolder);
		if(wsjson || wsjson === undefined) {
			fs.writeFileSync(path.join(dir, 'workspace.json'), '{}');
		}
		fs.writeFileSync(path.join(projectFolder, "fizz.txt"), "hello world");
		fs.writeFileSync(path.join(myFolder, "buzz.txt"), "buzzzz");
		fs.writeFileSync(path.join(subfolder, "quux.txt"), "whoa");
		fs.writeFileSync(path.join(subfolder, "foo.html"), "<html></html>");
		fs.writeFileSync(path.join(subfolder, "bar.js"), "function myFunc(one) {}");
		fs.writeFileSync(path.join(subfolder, "nonalpha.md"), "amber&sand");
		callback();
	}
	if(fs.existsSync(dir)) {
		debug('\nDirectory exists; cleaning...');
		tearDown(dir, function(err) {
			if (err) {
				debug(err);
				return;
			}
			fs.mkdirSync(dir);
			generateContent();
		});
	} else {
		fs.mkdirSync(dir);
		generateContent();
	}
}

exports.setUpCF = function setUpCF(dir, callback) {
	function createFiles() {
		//copy in all the files
		var test_data_path = path.join(__dirname, "../testData/manifestTest");
		var files = fs.readdirSync(test_data_path);
		if(Array.isArray(files)) {
			files.forEach(function(file) {
				if(!fs.statSync(path.join(test_data_path, file)).isFile()) {
					return;
				}
				var rs = fs.createReadStream(path.join(test_data_path, file)),
					ws = fs.createWriteStream(path.join(cf, file));
				rs.on('error', (err) => {
					console.log(err.message)
				});
				ws.on('error', (err) => {
					console.log("error writing to: "+err.message);
				});
				rs.pipe(ws);
			});
		}
		callback();
	}
	var cf = path.join(dir, "cftests");
	if(fs.existsSync(cf)) {
		debug('\nDirectory exists; cleaning...');
		tearDown(cf, function(err) {
			if (err) {
				debug(err);
				return;
			}
			fs.mkdirSync(cf);
			createFiles();
		});
	} else {
		fs.mkdirSync(cf);
		createFiles();
	}
};

/**
 * Create and start a new Orion server
 * @param {{?}} confOptions The map of configuration options or null
 */
exports.setupOrionServer = function setupOrionServer(confOptions){
	if(!request || confOptions) {
		app = express();
		var configFile = path.join(__dirname, '../../orion.conf');
		nconf.file({file: configFile, format: nconf.formats.ini});
		let useAdmin = false;
		var orion = function() {
			var options = {};
			options.workspaceDir = testHelper.WORKSPACE;
			options.configParams = nconf;
			if(confOptions !== null && typeof confOptions === 'object') {
				Object.keys(confOptions).forEach(function(key) {
					options.configParams.set(key, confOptions[key]);
				});
			}
			options.configParams.set("orion.single.user.metaLocation", testHelper.METADATA);
			if (testHelper.CONTEXT_PATH) {
				options.configParams.set("orion.context.listenPath", true);
				options.configParams.set("orion.context.path", testHelper.CONTEXT_PATH);
			}
			options.configParams.set('orion.XSRFPreventionFilterEnabled', false);
			if(options.configParams.get('orion.auth.user.creation') === 'admin') {
				useAdmin = true;
				options.configParams.set('orion.auth.name', 'Basic');
				options.configParams.set('orion.auth.admin.default.password', 'admin');
			}
			if(options.configParams.get('orion.single.user') === false) {
				// TODO if we add tests for mongo, this will hve to be handled properly
				options.configParams.set('orion.metastore.useMongo', false);
			}
			return orionServer(options);
		};
		var userMiddleware = function(req, res, next) {
			if(!req.user) {
				let user = testHelper.USERNAME;
				if(useAdmin) {
					user = 'admin';
				}
				req.user = {
					workspaceDir: testHelper.WORKSPACE, 
					username: user
				};
				req.user.checkRights = checkRights;
			}
			next();
		};
		app.use(userMiddleware);
		app.use(testHelper.CONTEXT_PATH ? testHelper.CONTEXT_PATH : "/", function(req, res, next){
			req.contextPath =  testHelper.CONTEXT_PATH;
			next();
		}, orion());
    app.use(CONTEXT_PATH + '/taskHelper', taskHelper.router({root: '/taskHelper', metastore: app.locals.metastore}));
    request = supertest.bind(null, app);
	}
	return request;
};
exports.DEBUG = process.env.DEBUG_TESTS || false;
