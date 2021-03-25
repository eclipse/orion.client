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
define(['orion/plugin', 'orion/editor/stylers/application_xml/syntax'], function(PluginProvider, mXML) {

	function connect() {
		var headers = {
			name: "Orion XML Tool Support",
			version: "1.0",
			description: "This plugin provides XML tools support for Orion."
		};
		var pluginProvider = new PluginProvider(headers);
		registerServiceProviders(pluginProvider);
		pluginProvider.connect();
	}

	function registerServiceProviders(pluginProvider) {
		pluginProvider.registerServiceProvider("orion.core.contenttype", {}, {
			contentTypes: [
				{	id: "application/xml",
					"extends": "text/plain",
					name: "XML",
					extension: ["xml", "xib"],
					imageClass: "file-sprite-xml"
				}, {id: "application/xhtml+xml",
					"extends": "text/plain",
					name: "XHTML",
					extension: ["xhtml", "xht"],
					imageClass: "file-sprite-xml"
				}
			] 
		});
		mXML.grammars.forEach(function(current) {
			pluginProvider.registerServiceProvider("orion.edit.highlighter", {}, current);
		});
	}

	return {
		connect: connect,
		registerServiceProviders: registerServiceProviders
	};
});
