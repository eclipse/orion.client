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
define(['orion/plugin', 'orion/editor/stylers/text_x-git-ignore/syntax', 'orion/editor/stylers/text_x-git-config/syntax'], function(PluginProvider, mGitIgnore, mGitConfig) {

	function connect() {
		var headers = {
			name: "Orion Git File Support",
			version: "1.0",
			description: "This plugin provides Git file syntax highlighting for Orion."
		};
		var pluginProvider = new PluginProvider(headers);
		registerServiceProviders(pluginProvider);
		pluginProvider.connect();
	}

	function registerServiceProviders(pluginProvider) {
		pluginProvider.registerServiceProvider("orion.core.contenttype", {}, {
			contentTypes: [
				{	id: "text/x-git-ignore",
					"extends": "text/plain",
					name: "Git Ignore",
					extension: ["gitignore"],
				}, {id: "text/x-git-config",
					"extends": "text/plain",
					name: "Git Config",
					filename: ["config"],
				}, {id: "text/x-cf-ignore",
					"extends": "text/x-git-ignore",
					name: "cf Ignore",
					extension: ["cfignore"],
				}
			] 
		});
		mGitIgnore.grammars.forEach(function(current) {
			pluginProvider.registerServiceProvider("orion.edit.highlighter", {}, current);
		});
		mGitConfig.grammars.forEach(function(current) {
			pluginProvider.registerServiceProvider("orion.edit.highlighter", {}, current);
		});
	}

	return {
		connect: connect,
		registerServiceProviders: registerServiceProviders
	};
});
