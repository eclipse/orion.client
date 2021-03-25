/*******************************************************************************
 * @license
 * Copyright (c) 2015 IBM Corporation and others.
 * All rights reserved. This program and the accompanying materials are made 
 * available under the terms of the Eclipse Public License 2.0 
 * (http://www.eclipse.org/legal/epl-v10.html), and the Eclipse Distribution 
 * License v1.0 (http://www.eclipse.org/org/documents/edl-v10.html). 
 *
 * Contributors:
 *     IBM Corporation - initial API and implementation
 *******************************************************************************/
/*eslint-env browser, amd*/
define(['orion/plugin'], function(PluginProvider) {

	function connect() {
		var headers = {
			name: "Orion Launch File Tool Support",
			version: "1.0",
			description: "This plugin provides tools support for Orion Launch files."
		};
		var pluginProvider = new PluginProvider(headers);
		registerServiceProviders(pluginProvider);
		pluginProvider.connect();
	}

	function registerServiceProviders(pluginProvider) {
		pluginProvider.registerServiceProvider("orion.core.contenttype", {}, {
			contentTypes: [
				{	id: "text/x-launch",
					"extends": "application/json",
					name: "Launch file",
					extension: ["launch"]
				}
			] 
		});
	}

	return {
		connect: connect,
		registerServiceProviders: registerServiceProviders
	};
});
