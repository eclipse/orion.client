/*******************************************************************************
 * @license
 * Copyright (c) 2015, 2017 IBM Corporation and others.
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
	'plugins/languages/arduino/arduinoPlugin',
	'plugins/languages/bash/bashPlugin',
	'plugins/languages/c/cPlugin',
	'plugins/languages/coffeescript/coffeescriptPlugin',
	'plugins/languages/cpp/cppPlugin',
	'plugins/languages/csharp/csharpPlugin',
	'plugins/languages/docker/dockerPlugin',
	'plugins/languages/erlang/erlangPlugin',
	'plugins/languages/go/goPlugin',
	'plugins/languages/git/gitFilePlugin',
	'plugins/languages/haml/hamlPlugin',
	'plugins/languages/jade/jadePlugin',
	'plugins/languages/java/javaPlugin',
	'plugins/languages/jsx/jsxPlugin',
	'plugins/languages/launch/launchPlugin',
	'plugins/languages/less/lessPlugin',
	'plugins/languages/lua/luaPlugin',
	'plugins/languages/markdown/markdownPlugin',
	'plugins/languages/objectiveC/objectiveCPlugin',
	'plugins/languages/php/phpPlugin',
	'plugins/languages/properties/propertiesPlugin',
	'plugins/languages/python/pythonPlugin',
	'plugins/languages/ruby/rubyPlugin',
	'plugins/languages/scss/scssPlugin',
	'plugins/languages/smarty/smartyPlugin',
	'plugins/languages/sql/sqlPlugin',
	'plugins/languages/swift/swiftPlugin',
	'plugins/languages/typescript/typescriptPlugin',
	'plugins/languages/vb/vbPlugin',
	'plugins/languages/xml/xmlPlugin',
	'plugins/languages/xquery/xqueryPlugin',
	'plugins/languages/yaml/yamlPlugin'
], function(PluginProvider) {

	var plugins = Array.prototype.slice.call(arguments);
	plugins.shift();

	function connect() {
		var headers = {
			name: "Orion Languages Tool Support",
			version: "1.0",
			description: "This plugin provides tooling for languages that are not included in other core Orion plugins."
		};
		var pluginProvider = new PluginProvider(headers);
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
