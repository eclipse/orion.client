/*******************************************************************************
 * @license
 * Copyright (c) 2016, 2017 IBM Corporation and others.
 * All rights reserved. This program and the accompanying materials are made
 * available under the terms of the Eclipse Public License 2.0
 * (http://www.eclipse.org/legal/epl-v10.html), and the Eclipse Distribution
 * License v1.0 (http://www.eclipse.org/org/documents/edl-v10.html).
 *
 * Contributors:
 *     IBM Corporation - initial API and implementation
 *******************************************************************************/
/*eslint-env node */
var API = process.argv[2];
var http = require('https');
http.get(API, function(res) {
	var statusCode = res.statusCode;
	var contentType = res.headers['content-type'];

	var error;
	if (statusCode !== 200) {
		error = new Error('Request Failed.\n' +
			'Status Code: ${statusCode}');
	} else if (!/^application\/json/.test(contentType)) {
		error = new Error('Invalid content-type.\n' +
			'Expected application/json but received ${contentType}');
	}
	if (error) {
		// consume response data to free up memory
		res.resume();
		return;
	}

	res.setEncoding('utf8');
	var rawData = '';
	res.on('data', function(chunk) { rawData += chunk; });
	res.on('end', function() {
		try {
			var parsedData = JSON.parse(rawData);
			if (Array.isArray(parsedData.artifacts)) {
				for (var i = 0, max = parsedData.artifacts.length; i < max; i++) {
					var fileName = parsedData.artifacts[i].fileName;
					if (fileName.endsWith(".tar.gz")) {
						console.log('export JAVA_LANGUAGE_SERVER=' + fileName);
					}
				}
			}
		} catch (e) {
			// ignore
		}
	});
}).on('error', /* @callback */ function(e) {
	// ignore
});
