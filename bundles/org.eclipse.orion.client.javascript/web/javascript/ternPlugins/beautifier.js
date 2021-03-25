/*******************************************************************************
 * @license
 * Copyright (c) 2016 IBM Corporation and others.
 * All rights reserved. This program and the accompanying materials are made 
 * available under the terms of the Eclipse Public License 2.0 
 * (http://www.eclipse.org/legal/epl-v10.html), and the Eclipse Distribution 
 * License v1.0 (http://www.eclipse.org/org/documents/edl-v10.html). 
 *
 * Contributors:
 *	 IBM Corporation - Allow original requirejs plugin to find files in Orion workspace
 *******************************************************************************/
/* eslint-disable missing-nls */
/*eslint-env node, amd*/
/*globals tern tern */
define([
	"tern/lib/tern",
	"beautifier/beautify-js"
], function(tern, Beautifier) {

	tern.registerPlugin("beautifier", /* @callback */ function(server, options) {
		return {
			//don't need any passes yet
		};
	});

	tern.defineQueryType("beautify", {
		takesFile: true,
		/**
		 * @callback
		 */
		run: function(server, query, file) {
			return format(query, file);
		}
	});

	/**
	 * @description Format the code using the right beautifier
	 * @param {Object} query The original Tern query object
	 * @param {Object} file The file object from Tern 
	 */
	function format(query, file) {
		var args = query.args;
		var text = file.text;
		if (args) {
			if (args.start && args.end) {
				text = file.text.substring(args.start, args.end);
			}
			return Beautifier.js_beautify(text, args.config);
		}
		return text;
	}
});
