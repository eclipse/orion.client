/*******************************************************************************
 * Copyright (c) 2016, 2017 IBM Corporation and others.
 * All rights reserved. This program and the accompanying materials are made 
 * available under the terms of the Eclipse Public License 2.0 
 * (http://www.eclipse.org/legal/epl-v10.html), and the Eclipse Distribution 
 * License v1.0 (http://www.eclipse.org/org/documents/edl-v10.html). 
 *
 * Contributors:
 *		 IBM Corporation - initial API and implementation
 *******************************************************************************/
/*eslint-env node */

module.exports = {};

module.exports.encodeURIComponent = function(path) {
	return encodeURIComponent(encodeURIComponent(path));
};

/**
 * @name module.exports.decodeURIComponent
 * @description Helper to properly decode a path.
 * @function
 * @param {string} path The path to decode
 * @returns {string} The decoded path
 */
module.exports.decodeURIComponent = function(path) {
	var result = path;
	try {
		result = decodeURIComponent(result);
		result = decodeURIComponent(result);
	} catch (e) {}
	return result;
};
/**
 * @name module.exports.verifyConfigRemoteUrl
 * @description Verity url of remotes, remove redundant trailing slash if any
 * @param config content of git configuration
 * @version 17.0
 */
module.exports.verifyConfigRemoteUrl = function(config) {
	var fixed = false;
	var remote = config.remote;
	if(remote){
		Object.keys(remote).forEach(function(key){
			if(Array.isArray(remote[key].url)){
				remote[key].url = remote[key].url.map(function(url){
					if (url.endsWith(".git/")) {
						fixed |= true;
						return url.slice(0 , -1);
					}
					return url;
				});
			} else {
				var url = remote[key].url;
				if (url.endsWith(".git/")) {
					fixed |= true;
					url = url.slice(0 , -1);
				}
				remote[key].url = url;
			}
		});
	}
	return fixed;
};
