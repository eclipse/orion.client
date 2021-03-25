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
			name: "Customized editor commands Plugin",
			version: "1.0",
			description: "This plugin provides customized editor commands to extend code edit widget."
		};
		var pluginProvider = new PluginProvider(headers);
		registerServiceProviders(pluginProvider);
		pluginProvider.connect();
	}

	function execute(orionContext, params) {
		window.alert("foo");
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
		provider.registerService('orion.edit.command', {execute: execute}, {
			name: 'Xtext formatting service',
			id: 'xtext.formatter',
			key: ['l', true, true],
			contentType: ["application/xml"]
		});		
	}

	return {
		connect: connect,
		registerServiceProviders: registerServiceProviders
	};
});
