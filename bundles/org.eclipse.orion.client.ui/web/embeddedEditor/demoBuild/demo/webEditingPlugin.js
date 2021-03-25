/*******************************************************************************
 * @license
 * Copyright (c) 2013 IBM Corporation and others.
 * All rights reserved. This program and the accompanying materials are made
 * available under the terms of the Eclipse Public License 2.0
 * (http://www.eclipse.org/legal/epl-v10.html), and the Eclipse Distribution
 * License v1.0 (http://www.eclipse.org/org/documents/edl-v10.html).
 *
 * Contributors:
 *     IBM Corporation - initial API and implementation
 *******************************************************************************/
/*eslint-env browser, amd*/
define([
	'orion/plugin',
	'i18n!orion/nls/messages'
], function(PluginProvider, messages) {

	function connect() {
		var headers = {
			name: "Orion Web Editing Plugin",
			version: "1.0",
			description: "This plugin provides editor link support for the navigator."
		};
		var pluginProvider = new PluginProvider(headers);
		registerServiceProviders(pluginProvider);
		pluginProvider.connect();
	}

	function registerServiceProviders(provider) {
		provider.registerService("orion.core.contenttype", {}, {
			contentTypes:
				// Text types
				[{
					id: "foo/bar",
					extension: ["bar"],
					name: 'Xtext Language',
					'extends': 'text/plain'
				}]
			});
	}

	return {
		connect: connect,
		registerServiceProviders: registerServiceProviders
	};
});
