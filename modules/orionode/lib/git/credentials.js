/*******************************************************************************
 * Copyright (c) 2017 IBM Corporation and others.
 * All rights reserved. This program and the accompanying materials are made 
 * available under the terms of the Eclipse Public License 2.0 
 * (http://www.eclipse.org/legal/epl-v10.html), and the Eclipse Distribution 
 * License v1.0 (http://www.eclipse.org/org/documents/edl-v10.html). 
 *
 * Contributors:
 *     IBM Corporation - initial API and implementation
 *******************************************************************************/
/*eslint-env node */
var tokenProviders = [];

module.exports.addTokenProvider = function(value) {
	if (typeof value === "function") {
		tokenProviders.push(value);
	}
};

module.exports.removeTokenProvider = function(value) {
	if (typeof value === "function") {
		for (var i = 0; i < tokenProviders.length; i++) {
			if (tokenProviders[i] === value) {
				tokenProviders.splice(i, 1);
				return;
			}
		}
	}
};

module.exports.getCredentials = function(uri, user) {
	return new Promise(function(fulfill, reject) {
		if (!tokenProviders.length) {
			reject();
			return;
		}

		/* resolve with the result from the first token provider that succeeds */
		var doneCount = 0;
		for (var i = 0; i < tokenProviders.length; i++) {
			tokenProviders[i](uri, user).then(
				function(result) {
					if (++doneCount <= tokenProviders.length) {
						doneCount = tokenProviders.length;
						fulfill(result);
					}
				},
				function(error) {
					if (++doneCount === tokenProviders.length) {
						reject();
					}
				}
			);
		}
	});
};
