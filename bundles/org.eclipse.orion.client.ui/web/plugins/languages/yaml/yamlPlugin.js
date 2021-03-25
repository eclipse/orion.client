/*******************************************************************************
 * @license
 * Copyright (c) 2014, 2017 IBM Corporation and others.
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
	'orion/editor/stylers/text_x-yaml/syntax',
	'js-yaml/js-yaml'
], function(PluginProvider, mYAML, JsYaml) {

	function connect() {
		var headers = {
			name: "Orion YAML Tool Support",
			version: "1.0",
			description: "This plugin provides YAML tools support for Orion."
		};
		var pluginProvider = new PluginProvider(headers);
		registerServiceProviders(pluginProvider);
		pluginProvider.connect();
	}

	function registerServiceProviders(pluginProvider) {
		pluginProvider.registerServiceProvider("orion.core.contenttype", {}, {
			contentTypes: [
				{	id: "text/x-yaml",
					"extends": "text/plain",
					name: "YAML",
					extension: ["yaml", "yml"]
				}
			] 
		});
		mYAML.grammars.forEach(function(current) {
			pluginProvider.registerServiceProvider("orion.edit.highlighter", {}, current);
		});
		
		pluginProvider.registerService("orion.edit.validator", {
			/**
			 * @callback
			 */
			computeProblems: function(editorContext , context, config) {
				return editorContext.getText().then(function(text) {
					if(text) {
						var errors = [];
						try {
							JsYaml.safeLoad(text,
								{
									onWarning: function onWarning(err) {
										errors.push(err);
									},
									/**
									 * @callback
									 */
									listener: function listener(type, node) {
										//TODO create an AST here for more advanced support
									}
								});
						}
						catch(yerr) {
							if(yerr && yerr.name === 'YAMLException') {
								errors.push(yerr);
							}						
						}
						return errors.map(function(err) {
							var oerr = {
								id: "yaml.syntax.error",
								severity: "error",
								description: err.reason || err.message
							};
							if(err.name === 'YAMLException') {
								oerr.line = err.mark.line+1;
								oerr.start = err.mark.column;
								oerr.end = err.mark.position || err.mark.column+1;
							}
							return oerr;
						});
					}
					return [];
				});
			}
		},
		{
			contentType: ["text/x-yaml"],
			pid: 'yaml.validator.config'
		});
	}

	return {
		connect: connect,
		registerServiceProviders: registerServiceProviders
	};
});
