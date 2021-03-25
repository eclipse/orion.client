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
var fmt = require("util").format,
    rest = require("restler"),
    nodeUrl = require("url"),
    Q = require("q");

function sanitizeClassName(s) {
	return s.replace(/[^A-Za-z0-9_\.]/g, "_");
}

function sanitizeXmlAttr(s) {
	return s.replace(/&/g, "&amp;")
	        .replace(/'/g, "&apos;")
	        .replace(/"/g, "&quot;");
}

/**
 * For Hudson to parse out nice packages instead of (root), we have to add classname="packageName.className"
 * to the <testsuite> element, and prefix the "packageName." onto every <testcase>'s @classname. We also strip
 * out some problematic characters from the original classnames: [#?.]
 * @param {String} xml The xunit test result
 * @returns {String} The test result, fixed up
 */
exports.xunit_cleanup = function(xml, sauceResult, testUrl) {
	testUrl = testUrl.replace(/(^\/)|(\.html$)/g, "");
	var platform = sanitizeClassName(sauceResult.platform.join(" ")),
	    packageName = sanitizeClassName(fmt("%s.%s", platform, testUrl));
	return xml
		.replace(/(<testsuite\s+name="[^"]+")/g, fmt("$1 classname=\"%s\"", packageName))
		.replace(/<testcase classname="([^"]+)"/g, /* @callback */ function(match, className) {
			return fmt("<testcase classname=\"%s.%s\"", packageName, className.replace(/[#?.]/g, "_"));
		});
};

/**
 * Workaround for getting the Mocha test results in cases where Sauce Labs has decided not to store them
 * in the job's `custom_data` field. Download the entire job log & scrape it to find the results.
 * see https://bugs.eclipse.org/bugs/show_bug.cgi?id=461212
 * @returns {Promise}
 */
exports.get_mocha_result_from_log = function(grunt, job_id, username, password) {
	// https://saucelabs.com/rest/v1/{user}/jobs/{job_id}/assets/log.json
	var url = nodeUrl.format({
		protocol: "https",
		host: "saucelabs.com",
		pathname: fmt("/rest/v1/%s/jobs/%s/assets/log.json", username, job_id)
	});

	grunt.verbose.write(fmt("Downloading logs from %s...", nodeUrl.format(url)));
	var d = Q.defer();
	rest.get(url, {
		username: username,
		password: password
	})
	.on("success", function(data) {
		if (!Array.isArray(data)) {
			d.reject(new Error("Could not parse log.json"));
		}
		grunt.verbose.ok();
		for (var i = data.length - 1; i >= 0; i--) {
			var entry = data[i];
			if (entry.result) {
				d.resolve(entry.result);
				return;
			}
		}
		d.reject(new Error("Failed to find mocha results in log.json"));
	})
	.on("error", function(error) {
		grunt.verbose.write(error);
		d.reject(error);
	});
	return d.promise;
};

/**
 * Returns a barebones xunit test suite mentioning the test url and error. This is useful for giving *something*
 * to the Hudson build that indicates a failure. Otherwise unexpected errors might not be shown at all in the build.
 * @param {String} testurl
 * @param {Error} error
 * @returns {String}
 */
exports.xunit_suite_error = function(testurl, error) {
	var classname = sanitizeClassName(testurl),
	    errorMessage = sanitizeXmlAttr(error.message);
	var xml = ''
		+ fmt('<testsuite name="%s" classname="%s" tests="1" failures="0" errors="1" skipped="0" timestamp="%s" time="0">', testurl, classname, (new Date()).toUTCString())
			+ fmt('<testcase classname="%s" name="SuiteFailure" time="0" message="%s">', classname, errorMessage)
				+ fmt('<failure classname="SuiteFailure" name="SuiteFailure" time="0" message="%s">', errorMessage)
					+ '<![CDATA['
					+ error.stack
					+ ']]>'
				+ '</failure>'
			+ '</testcase>'
		+ '</testsuite>';
	return xml;
};

exports.xunit_write = function(grunt, filepath, contents) {
	grunt.verbose.write(fmt("Writing result file %s", filepath));
	grunt.file.write(filepath, contents);
	grunt.verbose.ok();
};

/**
 * @returns {String} The url of the test page
 */
exports.test_page_url = function(sauceResult, mochaResult) {
	var url = sauceResult.testPageUrl;
	if (mochaResult) {
		url = mochaResult.url;
	}
	return url;
};

/**
 * @returns {String} A good filename for the xunit results, of the form TEST-{url}-{job_id}.xml
 */
exports.xunit_filename = function(sauceResult) {
	var url = exports.test_page_url(sauceResult).replace(/[^A-Za-z0-9_\-]/g, "_"),
	    job_id = sauceResult.id;
	return fmt("TEST-%s_%s.xml", url, job_id);
};
