/*******************************************************************************
 * @license
 * Copyright (c) 2010, 2012 IBM Corporation and others.
 * All rights reserved. This program and the accompanying materials are made 
 * available under the terms of the Eclipse Public License 2.0 
 * (http://www.eclipse.org/legal/epl-v10.html), and the Eclipse Distribution 
 * License v1.0 (http://www.eclipse.org/org/documents/edl-v10.html). 
 * 
 * Contributors: IBM Corporation - initial API and implementation
 ******************************************************************************/

/*eslint-env browser, amd*/
define([
	"orion/plugin", 
	"plugins/languageToolsPlugin",
	//"plugins/languages/json/jsonPlugin",
	"plugins/webEditingPlugin"
], function(PluginProvider) {
	
	var plugins = Array.prototype.slice.call(arguments);
	plugins.shift();

	function connect() {
		var headers = {
			name: "Pluggable editor tooling support",
			version: "1.0",
			description: "This plugin provides the core language tooling support for the Orion pluggable editor."
		};
		var pluginProvider = new PluginProvider();
		pluginProvider.updateHeaders(headers);
		registerServiceProviders(pluginProvider);
		pluginProvider.connect();
	}

	function registerServiceProviders(provider) {
		plugins.forEach(function(plugin) {
			if(plugin) {
				plugin.registerServiceProviders(provider);
			}
		});
	}
	connect();
	return {
		connect: connect,
		registerServiceProviders: registerServiceProviders
	};
});
