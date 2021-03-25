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
define(['orion/plugin'], function(PluginProvider) {
	
	function connect() {
		var headers = {
			name: "Console Plugin",
			version: "1.0",
			description: "This plugin adds a link to the tty shell"
		};
		var pluginProvider = new PluginProvider(headers);
		registerServiceProviders(pluginProvider);
		pluginProvider.connect();
	}

	function registerServiceProviders(provider) {
		provider.registerService("orion.navigate.command", {}, {
			name: "Console",
			id: "orion.console.open",
			tooltipKey: "Open Console page",
			validationProperties: [{
				source: "ChildrenLocation|ContentLocation",
				variableName: "ShellLocation",
				replacements: [{pattern: "\\?depth=1$", replacement: ""}] 
			}],
			uriTemplate: "{+OrionHome}/tty/ttyShell.html#{,ShellLocation}",
			forceSingleItem: true
		});
		provider.registerService("orion.page.link.related", null, {
			id: "orion.console.open",
			category: "shell",
			order: 5 // First link in Shell category
		});
		provider.registerService("orion.page.link", {}, {
			name: "Console",
			id: "orion.console",
			category: "shell",
			order: 1000, // low priority
			uriTemplate: "{+OrionHome}/tty/ttyShell.html"
		});
	}

	return {
		connect: connect,
		registerServiceProviders: registerServiceProviders
	};
});
