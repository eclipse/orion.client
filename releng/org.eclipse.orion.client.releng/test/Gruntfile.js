/*******************************************************************************
 * Copyright (c) 2014, 2015 IBM Corporation and others.
 * All rights reserved. This program and the accompanying materials are made 
 * available under the terms of the Eclipse Public License 2.0 
 * (http://www.eclipse.org/legal/epl-v10.html), and the Eclipse Distribution 
 * License v1.0 (http://www.eclipse.org/org/documents/edl-v10.html). 
 *
 * Contributors:
 *     IBM Corporation - initial API and implementation
 *******************************************************************************/
/*eslint-env node*/
/* eslint-disable missing-nls */
/*
 * Script for running Orion mocha tests at Sauce Labs. This launches a mini Orion web server (using connect)
 * that hosts the client code. Then Sauce Labs API is called, passing the URLs of test pages on the web
 * server. Sauce loads the URLs in various browsers. This script captures the test results.
 * 
 * Clients obtain test results by GET /testresults. If tests are not complete, 404 will be 
 * returned. Once complete, a zip file containing all results will be returned.
 *
 * Each test page needs to use Orion's mocha wrapper (see `sauce.js`) to integrate with this script.
 *
 * The following environment variables are supported:
 * BUILD_ID                optional
 * BUILD_NAME              optional
 * BUILD_TAG               optional
 * SAUCE_USERNAME          required
 * SAUCE_ACCESS_KEY        required
 * QUIT                    optional If set, program quits after tests finish instead of running forever. Default: not set
 * TRACE                   optional If set, all requests served by the web server are logged to stdout. Default: not set
 *
 * For running the script locally or on a server that is not accessible from the public Internet:
 * TUNNEL                  optional If set, Sauce Tunnel will be established. Default: not set
 *
 * For running the script under CF:
 * VCAP_APP_HOST           optional If set, web server will listen on this hostname.
 * VCAP_APP_PORT           optional If set, web server will listen on this port.
 * VCAP_APPLICATION        optional String containing JSON with the following fields:
 *   application_uris[]    optional The publicly accessible URIs of this application.
 */
module.exports = function(grunt) {
	var TEST_RESULTS_PATH = "/testresults";

	var nodePath = require("path"),
	    nodeUrl = require("url"),
	    archiver = require("archiver"),
	    fmt = require("util").format,
	    Q = require("q"),
	    nodeutil = require("util"),
	    zlib = require("zlib"),
	    helpers = require("./test-helpers");

	var env = process.env,
	    orionClient = nodePath.join(__dirname, env.VCAP_APPLICATION ? "/" : "../../../"), // Allow us to run outside cf
	    packageRoot = __dirname + "/",
	    util = require(orionClient + "modules/orionode/build/utils")(grunt);

	var config = util.loadBuildConfig(orionClient + "/releng/org.eclipse.orion.client.releng/builder/scripts/orion.build.js"),
	    bundles = util.parseBundles(config, { orionClient: orionClient }),
	    pkg = grunt.file.readJSON(packageRoot + "package.json"),
	    results = packageRoot + pkg.results, // dirs provided in package.json are relative to package.json
	    vcap_app = getJSON(env.VCAP_APPLICATION);
	// Track the tests that have finished so far
	var allTestsComplete = false,
	    testFilenames = [];

	grunt.initConfig({
		pkg: pkg,
		buildId: env.JOB_NAME ? nodeutil.format("%s #%s", env.JOB_NAME, env.BUILD_NUMBER) : new Date().toISOString(),
		protocol: "http",
		hostname: env.VCAP_APP_HOST || "127.0.0.1",
		port: env.VCAP_APP_PORT || 9999,
		appHostname: (vcap_app && vcap_app.application_uris && vcap_app.application_uris[0]) || "127.0.0.1",
		appPort: "TUNNEL" in env ? 9999 : 80,
		tunnel: "TUNNEL" in env,
		quit: "QUIT" in env,
		connect: {
			server: {
				options: {
					protocol: "<%= protocol %>",
					hostname: "<%= hostname %>",
					port: "<%= port %>",
					base: bundles.map(function(bundle) { return bundle.web; }),
					/**
					 * @callback
					 */
					middleware: function(connect, options, middlewares) {
						var logger = connect.logger();
						/**
						 * @callback
						 */
						var optionalLogger = function(req, res, next) {
							// By default we only log /testresults calls, TRACE can be used to override this
							if (typeof env.TRACE === "undefined" || req.url !== TEST_RESULTS_PATH)
								next();
							else
								logger.apply(null, arguments);
						};
						// Inject logger and compress at the top of the middleware stack
						middlewares.splice(0, 0, optionalLogger, connect.compress());
						// And /testresults at the bottom
						middlewares.push(testResultsMiddleware);
						return middlewares;
					}
				}
			}
		},
		// Dynamically downloads a gzip library for use by sauce.js in browser.
		// TODO remove this task once we get a library shipped with Orion
		curl: {
			long: {
				src: "https://raw.githubusercontent.com/nodeca/pako/master/dist/pako.js",
				dest: nodePath.join(orionClient, "bundles/org.eclipse.orion.client.core/web/pako/pako.js")
			}
		},
		"saucelabs-mocha": {
			// Will be filled in dynamically
		}
	});

	// Load dependencies
	Object.keys(pkg.dependencies).forEach(function(key) {
		if (key !== "grunt-cli" && /^grunt-/.test(key)) {
			grunt.loadNpmTasks(key);
		}
	});

	// Inject an individual target under 'saucelabs-mocha' for each suite.
	pkg.urls.forEach(function(url) {
		var suiteURL = nodeUrl.format({
			protocol: grunt.config.get("protocol"),
			hostname: grunt.config.get("appHostname"),
			port: grunt.config.get("appPort"),
			pathname: url,
			hash: "env=integration"
		});
		var suiteURLShort = url.replace(/\./g, "_") ;
		grunt.config("saucelabs-mocha." + suiteURLShort + ".options", {
			tunneled: grunt.config.get("tunnel"),
			tunnelTimeout: 20,
			build: grunt.config.get("buildId"),
			browsers: pkg.browsers,
			tags: [env.BUILD_TAG || "master"], // FIXME tags seem to be ignored
			onTestComplete: onTestComplete,
			maxRetries: 1, // retry once on timeout
			"max-duration":    300,
			testname: suiteURLShort,
			urls: [suiteURL]
		});
	});

	// Register tasks
	grunt.registerTask("check", "Check prerequisites", function() {
		grunt.verbose.subhead("Checking environment vars...");
		!env.SAUCE_USERNAME   && grunt.fatal("Required environment variable not set: SAUCE_USERNAME");
		!env.SAUCE_ACCESS_KEY && grunt.fatal("Required environment variable not set: SAUCE_ACCESS_KEY");
		grunt.verbose.write("OK");
		grunt.verbose.write("Checking package.json...");
		!pkg.results && grunt.fatal("Required property `results` not found in package.json");
		!pkg.browsers && grunt.fatal("Required property `browsers` not found in package.json");
		grunt.verbose.write("OK");
	});
	grunt.registerTask("wait", "Wait for exit", function() {
		allTestsComplete = true;
		if (grunt.config.get("quit")) {
			grunt.verbose.writeln("'wait' task exiting...");
		} else {
			grunt.verbose.writeln("waiting forever...");
			this.async(); // returns a function that we never call
		}
	});
	grunt.registerTask("server", ["curl", "connect"]);
	grunt.registerTask("sauce", ["check", "saucelabs-mocha", "wait"]);
	grunt.registerTask("test", ["server", "sauce"]);
	grunt.registerTask("default", "test");

	/**
	 * Called per browser, per test page, after a test job is complete. Not called for a job that times out.
	 * @param {Object} sauceResults The job result object returned from Sauce Labs.
	 * @param {Function} callback Async CB to be invoked as callback(err, passOrFail) when done
	 */
	function onTestComplete(sauceResult, callback) {
		grunt.verbose.writeln("Got test result: ");
		grunt.verbose.writeln(nodeutil.inspect(sauceResult));
		var mochaResult = sauceResult.result,
		    job_id = sauceResult.job_id,
		    filename = helpers.xunit_filename(sauceResult);
		Q.try(function() {
			if (!mochaResult) {
				grunt.verbose.writeln("Mocha result was missing. Will search for it in job logs.");
				mochaResult = helpers.get_mocha_result_from_log(grunt, job_id, env.SAUCE_USERNAME, env.SAUCE_PASSWORD).then(function(data) {
					grunt.verbose.writeln("Scraped mocha result: ");
					grunt.verbose.writeln(nodeutil.inspect(data));
					return data;
				});
			}

			return Q.when(mochaResult, writeXUnitReport.bind(null, job_id, filename, sauceResult)).then(function() {
				testFilenames.push(filename);
				callback(undefined, true /*job pass*/);
			});
		})
		.catch(function(error) {
			// Something broke the test suite; output a generic xunit showing that it error'd
			grunt.warn(error && error.stack);

			helpers.xunit_write(grunt, nodePath.join(results, filename), helpers.xunit_suite_error(filename, error));
			testFilenames.push(filename);
			callback(error); /*job fail*/
		});
	}

	/**
	 * @returns {Promise} resolves if we wrote the XUnit report, rejects if an error occurred
	 */
	function writeXUnitReport(job_id, filename, sauceResult, mochaResult) {
		function throwError(msgOrError) {
			var e = nodeutil.isError(msgOrError) ? msgOrError : new Error(msgOrError);
			throw e;
		}

		var id = sauceResult.id,
		    gzippedXml = mochaResult && mochaResult.xunit,
		    testurl = helpers.test_page_url(sauceResult, mochaResult);
		grunt.verbose.writeln(fmt("Test page url: %s, xunit filename: %s", testurl, filename));
		if (!mochaResult)
			throwError(fmt("Failed to get 'result'. For full details see: https://saucelabs.com/jobs/%s/\n", job_id));
		if (typeof mochaResult === "string" && /duration/.test(mochaResult))
			throwError(mochaResult); // Timeout
		if (/experienced an error/.test(sauceResult.message))
			throwError(sauceResult.message);
		if (!mochaResult.url)
			throwError(fmt("Test %s did not return its url. Ensure it is using sauce.js", id));
		if (!gzippedXml)
			throwError(fmt("Test %s did not return an xunit result. Ensure it is using sauce.js.", testurl));

		grunt.verbose.write("Inflating compressed xunit result...");
		var deferred = Q.defer();
		var zipresolver = deferred.makeNodeResolver(); // will resolve or reject `deferred`
		zlib.gunzip(new Buffer(gzippedXml, "base64"), zipresolver);
		return deferred.promise.then(function(buffer) {
			grunt.verbose.ok();
			var xunitReport = buffer.toString("utf8");
			grunt.verbose.write("Replacing xunit testsuite name...");
			xunitReport = helpers.xunit_cleanup(xunitReport, sauceResult, testurl);
			grunt.verbose.ok();

			helpers.xunit_write(grunt, nodePath.join(results, filename), xunitReport);
		});
	}

	// Middleware for delivering all test results as a zip.
	function testResultsMiddleware(req, res, next) {
		if (req.url !== TEST_RESULTS_PATH || req.method !== "GET")
			return next();

		if (!allTestsComplete) {
			// Tests not finished yet, return 404
			res.statusCode = 404;
			res.end();
			return;
		}
		try {
			grunt.verbose.writeln("Sending result zip...");
			res.setHeader("Content-Type", "application/x-zip");
			res.setHeader("Content-Disposition", "attachment; filename=tests-" + grunt.config.get("buildId") + ".zip;");
			var archive = archiver("zip");
			archive.on("error", grunt.warn);
			archive.pipe(res);
			archive.bulk([
				{ expand: true, cwd: results, src: testFilenames }
			]);
			archive.finalize();
			res.on("close", grunt.warn.bind(grunt));
			res.on("finish", function() {
				grunt.verbose.writeln(fmt("Sent result zip (%s bytes)", archive.pointer()));
			});
		} catch(e) {
			grunt.warn(e);
		}
	}

	function getJSON(str) {
		try {
			return JSON.parse(str);
		} catch (e) {
			return null;
		}
	}
};
