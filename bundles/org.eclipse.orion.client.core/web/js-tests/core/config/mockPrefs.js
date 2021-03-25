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
/*eslint-env browser, amd, mocha*/
define([
	"orion/Deferred",
], function(Deferred) {

	// Mock preferences Provider
	function Provider(map) {
		this.map = map || Object.create(null);
	}
	Provider.prototype = {
		clear: function() {
			this.map = Object.create(null);
		},
		get: function(key) {
			var value = this.map[key];
			return new Deferred().resolve(value && typeof value === 'string' ? JSON.parse(value) : value);
		},
		put: function(key, value) {
			if (value === null) {
				throw new Error('Preferences does not allow null values');
			}
			this.map[key] = JSON.stringify(value);
			return new Deferred().resolve();
		},
		remove: function(key) {
			delete this.map[key];
			return new Deferred().resolve();
		},
		available: function() {
			return true;
		}
	};

	
	return Provider;
});
