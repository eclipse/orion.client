/*******************************************************************************
 * @license
 * Copyright (c) 2010, 2016 IBM Corporation and others.
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
	"plugins/authForm",
	"plugins/fileClientPlugin",
	"plugins/authenticationPlugin",
	"plugins/googleAnalyticsPlugin",
	"plugins/languageToolsPlugin",
	"plugins/preferencesPlugin",
	"plugins/pageLinksPlugin",
	"plugins/taskPlugin",
	"plugins/webEditingPlugin",
	"profile/userservicePlugin",
	"plugins/helpPlugin",
], function(PluginProvider, authForm) {
	
	var plugins = Array.prototype.slice.call(arguments);
	plugins.shift(); // orion/plugin
	plugins.shift(); // plugins/authForm

	function connect(pluginProvider) {
		var login = authForm();
		var headers = {
			name: "Orion Core Support",
			version: "1.0",
			description: "This plug-in provides the core Orion support.",
			login: login
		};
		pluginProvider = pluginProvider || new PluginProvider();
		pluginProvider.updateHeaders(headers);
		registerServiceProviders(pluginProvider);
		pluginProvider.connect();
	}

	function registerServiceProviders(provider) {
		plugins.forEach(function(plugin) {
			plugin.registerServiceProviders(provider);
		});
	}

	return {
		connect: connect,
		registerServiceProviders: registerServiceProviders
	};
});
