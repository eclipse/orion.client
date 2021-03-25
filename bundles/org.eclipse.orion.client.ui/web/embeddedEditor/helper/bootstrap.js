/*******************************************************************************
 * @license
 * Copyright (c) 2011, 2012 IBM Corporation and others.
 * All rights reserved. This program and the accompanying materials are made 
 * available under the terms of the Eclipse Public License 2.0 
 * (http://www.eclipse.org/legal/epl-v10.html), and the Eclipse Distribution 
 * License v1.0 (http://www.eclipse.org/org/documents/edl-v10.html). 
 *
 * Contributors:
 *     IBM Corporation - initial API and implementation
 *******************************************************************************/
/*eslint-env browser, amd*/
/*global URL*/
var _code_edit_script_source = null; //We need to know where the editor script lives
var _all_script = document.getElementsByTagName('script');
if (_all_script && _all_script.length && _all_script.length > 0) {
	for (var j = 0; j < 2; j++) { // try twice in all the script tags
		for (var i = 0; i < _all_script.length; i++) {
			if (j === 0) { //First try: if the script id is ""orion.browse.browser""
				if (_all_script[i].id === "orion.codeEdit") {
					_code_edit_script_source = _all_script[i].src;
					break;
				}
			} else {
				var regex = /.*built-codeEdit.*.js/;
				if (_all_script[i].src && regex.exec(_all_script[i].src)) {
					_code_edit_script_source = _all_script[i].src;
					break;
				}
			}
		}
		if (_code_edit_script_source) {
			break;
		}
	}
	if (!_code_edit_script_source) {
		_code_edit_script_source = _all_script[_all_script.length - 1].src;
	}
}
define([
	'embeddedEditor/helper/embeddedFileImpl',
	'embeddedEditor/helper/memoryFileSysConst',
	'orion/pluginregistry',
	'orion/Deferred',
	'orion/URL-shim'
], function(
	EmbeddedFileImpl,
	memoryFileSysConst,
	mPluginRegistry,
	Deferred
) {

	var once; // Deferred
	var inMemoryFilePattern = memoryFileSysConst.MEMORY_FILE_PATTERN;
	var defaultPluginURLs = [
		"../javascript/plugins/javascriptPlugin.html",
		"../webtools/plugins/webToolsPlugin.html",
		"../others/plugins/languages/json/jsonPlugin.html",
		"../plugins/embeddedToolingPlugin.html"
	];

	function startup(serviceRegistry, cTypeRegistry, options) {
		if (once) {
			return once;
		}
		//options._defaultPlugins is for internal use to load plugins in dev mode
		var pluginsToLoad;
		if(options && options._defaultPlugins) {
			pluginsToLoad = options._defaultPlugins;
		} else {
			pluginsToLoad = defaultPluginURLs;
		}			
		if(options && options.defaultPlugins) {
			var newArray = [];
			options.defaultPlugins.forEach(function(pl) {
				var splitPl = pl.split("/").pop();
				var hasOne = null;
				pluginsToLoad.some(function(item) {
					if(item.indexOf(splitPl) !== -1) {
						newArray.push(item);
						return true;
					}
					return false;
				});
			});
			pluginsToLoad = newArray;
		}
		
		once = new Deferred();
		var fService = new EmbeddedFileImpl(inMemoryFilePattern);
		serviceRegistry.registerService("orion.core.file", fService, {
			Name: 'Embedded File System',
			top: inMemoryFilePattern,
			pattern: inMemoryFilePattern
		});
		var plugins = {};
		pluginsToLoad.forEach(function(pluginURLString){
			var pluginURL = new URL(pluginURLString, _code_edit_script_source);
			plugins[pluginURL.href] = {autostart: "lazy"};
		});
		
		pluginsToLoad = (options && options.userPlugins) ? options.userPlugins : [];
		pluginsToLoad.forEach(function(pluginURLString){
			plugins[pluginURLString] = {autostart: "lazy"};
		});
		
		var pluginRegistry = new mPluginRegistry.PluginRegistry(serviceRegistry, {
			storage: {},
			plugins: plugins
		});
		return pluginRegistry.start().then(function() {
			var result = {
				serviceRegistry: serviceRegistry,
				pluginRegistry: pluginRegistry
			};
			//We need to register the parent contentType for text type if user just use the widget as bare-bone without registering any default plugins
			if(!cTypeRegistry.getContentType("text/plain")) {
				serviceRegistry.registerService('orion.core.contenttype', {}, {contentTypes: [{	id: "text/plain", name: "Text",	extension: ["txt"]}]});
			}
			once.resolve(result);
			return result;
		});
	}
	return {startup: startup};
});
