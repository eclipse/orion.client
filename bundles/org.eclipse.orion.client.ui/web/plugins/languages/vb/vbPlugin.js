/*******************************************************************************
 * @license
 * Copyright (c) 2014 IBM Corporation and others.
 * All rights reserved. This program and the accompanying materials are made 
 * available under the terms of the Eclipse Public License 2.0 
 * (http://www.eclipse.org/legal/epl-v10.html), and the Eclipse Distribution 
 * License v1.0 (http://www.eclipse.org/org/documents/edl-v10.html). 
 *
 * Contributors:
 *     IBM Corporation - initial API and implementation
 *******************************************************************************/
/*eslint-env browser, amd*/
define(['orion/plugin', 'orion/editor/stylers/text_x-vb/syntax', 'orion/editor/stylers/text_x-vbhtml/syntax'], function(PluginProvider, mVB, mVBHtml) {

	function connect() {
		var headers = {
			name: "Orion VB.NET Tool Support",
			version: "1.0",
			description: "This plugin provides VB.NET tools support for Orion."
		};
		var pluginProvider = new PluginProvider(headers);
		registerServiceProviders(pluginProvider);
		pluginProvider.connect();
	}

	function registerServiceProviders(pluginProvider) {
		pluginProvider.registerServiceProvider("orion.core.contenttype", {}, {
			contentTypes: [
				{	id: "text/x-vb",
					"extends": "text/plain",
					name: "VB.NET",
					extension: ["vb"]
				}, {id: "text/x-vbhtml",
					"extends": "text/plain",
					name: "vbhtml",
					extension: ["vbhtml"]
				}
			]
		});
		mVB.grammars.forEach(function(current) {
			pluginProvider.registerServiceProvider("orion.edit.highlighter", {}, current);
		});
		mVBHtml.grammars.forEach(function(current) {
			pluginProvider.registerServiceProvider("orion.edit.highlighter", {}, current);
		});
	}

	return {
		connect: connect,
		registerServiceProviders: registerServiceProviders
	};
});
