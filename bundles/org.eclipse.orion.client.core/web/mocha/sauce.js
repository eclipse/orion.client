/*******************************************************************************
 * @license
 * Copyright (c) 2014 IBM Corporation and others.
 * All rights reserved. This program and the accompanying materials are made 
 * available under the terms of the Eclipse Public License 2.0 
 * (http://www.eclipse.org/legal/epl-v10.html), and the Eclipse Distribution 
 * License v1.0 (http://www.eclipse.org/org/documents/edl-v10.html). 
 * 
 * Contributors: IBM Corporation - initial API and implementation
 ******************************************************************************/
/*eslint-env browser, amd*/
/*eslint no-console:0, no-new-func:0*/
/*global console:true TextEncoder*/

/**
 * Wrapper for mocha that exposes mocha test results to Sauce Labs.
 * 
 * To run on Sauce Labs, a test page must use the wrapped `mocha` object returned by this module,
 * instead of the regular global `mocha`. For example:
 * <pre>
 *     define(["mocha/sauce"], function(mochaSauce) {
 *         mochaSauce.setup("bdd");
 *         // load your tests here
 *         mochaSauce.run();
 *     });
 * </pre>
 */
define([
	"orion/Base64",
	"pako/pako",
	"orion/objects",
	"mocha/mocha", // no exports
	"orion/encoding-shim", // no exports
], function(Base64, pako, objects) {
	// this is done to allow us to get the global even in strict mode
	var global = new Function("return this")();
	// Try to filter non-xunit log messages, so tests that print junk to the console are less likely to break xunit report.
	function isXunit(message) {
		return /^<\/?test(case|suite)/.test(message);
	}

	function addxunit(mocha, runner, reportHolder) {
		// Unfortunately the xunit reporter is hardcoded to write directly to console.log()
		// So monkey patch console.log
		if (!console) {
			console = {};
		}
		var log = console.log;
		console.log = global.console.log = function(str) {
			if (isXunit(str)) {
				// redirect Xunit output to buffer, do not print to console
				reportHolder.report += str + "\n";
			} else {
				log && log.apply(global.console, Array.prototype.slice.call(arguments));
			}
		};
		reportHolder.report = "";
		// This is a hack to enable xunit as a 2nd reporter
		mocha.reporter("xunit");
		var oldStats = runner.stats;
		var xunitReporter = new mocha._reporter(runner); // new xUnit reporter
		runner.stats = xunitReporter.stats = oldStats; // Creating the new reporter clobbered stats, so restore them.
	}

	/**
	 * @param {String} A regular UCS-2 string
	 * @returns {String} A base64-encoded gzipped utf-8 string
	 */
	function compress(str) {
		return Base64.encode(pako.gzip(new TextEncoder("utf8").encode(str)));
	}

	/**
	 * @returns {Boolean} true if the `mochaResults` object exceeds the Sauce Labs 64KB API size limit
	 */
	function tooBig(mochaResults) {
		var results = JSON.stringify(mochaResults);
		return results && results.length >= 64000 ;
	}
	
	function pruneReports(mochaResults) {
		if (tooBig(mochaResults)) {
			var reports = mochaResults.reports;
			// Pare down reports by binary splicing
			while (reports.length > 0 && tooBig()) {
				var index = reports.length >> 1, n = reports.length - index;
				console.log("Throwing away " + n + " failed test summaries");
				reports.splice(index, n);
			}
		}
	}

	function makeWrapper(mocha) {
		var wrapper = Object.create(Object.getPrototypeOf(mocha));
		objects.mixin(wrapper, mocha);
		// Override #run()
		wrapper.run = function() {
			var runner = mocha.run.apply(mocha, Array.prototype.slice.call(arguments));
			var xunitResult = {};

			console.log("* sauce.js *");
			addxunit(mocha, runner, xunitResult);

			var failed = [], passed = [];
			runner.on("pass", log);
			runner.on("fail", log);
			runner.on("test", function(test) {
				test._start = new Date();
			});
			runner.on("end", function() {
				// The `global.mochaResults` object gets sent to Sauce Labs, and later echoed back to Grunt build
				var mochaResults = global.mochaResults = runner.stats;
				mochaResults.reports = failed;
				mochaResults.url = global.location.pathname;
				mochaResults.xunit = compress(xunitResult.report);
				
				console.log("XML report length: " + mochaResults.xunit.length);

				// Try to make the `mochaResults` structure fit into the Sauce Labs API size limit.
				// First try the `reports` array since can it contain large stack traces
				pruneReports(mochaResults);

				// If we exceed the limit, it must be the xunit results, throw them away too :(
				if (tooBig(mochaResults)) {
					console.log(new Error("mochaResults size exceeds Sauce Labs API limit. xUnit results will not be available. "
						+ "To fix this, split up this test page into smaller pages."));
					delete mochaResults.xunit;
				}
				// Should not happen; by this point the data structure is almost empty
				if (tooBig(mochaResults)) {
					console.log(new Error("Could not make mochaResults fit into Sauce Labs API limit. Test results will not be recorded!!"));
				}
				console.log("mocha result length: " + JSON.stringify(mochaResults).length);
			});

			function flattenTitles(test){
				var titles = [];
				while (test.parent.title){
					titles.push(test.parent.title);
					test = test.parent;
				}
				return titles.reverse();
			}
			function log(test, err) {
				var report = {
					name: test.title,
					result: !err,
					message: err && err.message,
					stack: err && err.stack,
					titles: flattenTitles(test),
					duration: (Date.now() - test._start)
				};
				if (err)
					failed.push(report);
				else
					passed.push(report);
			}
			return runner;
		};
		return wrapper;
	}

	return makeWrapper(global.mocha);
});
