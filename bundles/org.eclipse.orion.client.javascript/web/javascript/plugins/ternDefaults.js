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
/* eslint-env amd*/
/* eslint-disable missing-nls */
define([
	'javascript/plugins/ternMetadata',
	'json!tern/defs/ecma5.json',
	'json!tern/defs/ecma6.json',
	'json!tern/defs/ecma7.json',
	'json!tern/defs/browser.json',
	'json!tern/defs/chai.json',
	
	//tern defaults
	"tern/plugin/angular",
	"tern/plugin/doc_comment",
	"tern/plugin/es_modules",
	'tern/plugin/node',
	'tern/plugin/commonjs',
	'tern/plugin/requirejs',
	
	//orion defaults
	"javascript/ternPlugins/amqp",
	"javascript/ternPlugins/ast",
	"javascript/ternPlugins/eslint",
	"javascript/ternPlugins/express",
	"javascript/ternPlugins/html",
	"javascript/ternPlugins/jsdoc",
	"javascript/ternPlugins/mongodb",
	"javascript/ternPlugins/mysql",
	"javascript/ternPlugins/occurrences",
	"javascript/ternPlugins/open_impl",
	"javascript/ternPlugins/outliner",
	"javascript/ternPlugins/plugins",
	"javascript/ternPlugins/postgres",
	"javascript/ternPlugins/redis",
	"javascript/ternPlugins/refs",
	"javascript/ternPlugins/templates",
	"javascript/ternPlugins/quickfixes",
	"javascript/ternPlugins/beautifier",
	"javascript/ternPlugins/resolver",
	"javascript/ternPlugins/async_await" //TODO remove once Tern provides built-in support
], function(TernMetadata, ecma5, ecma6, ecma7, browser, chai) {
	var defs = [ecma5, ecma6, ecma7, browser, chai];
	
	var defNames = TernMetadata.defNames;
	var plugins = TernMetadata.plugins;
	
	var serverOptions = {
		async: true,
        debug: false,
        projectDir: 'orionFakeProjectDir', // Tern strips the project dir from any file paths it finds and defaults to '/' so this must be set
        defs: defs,
        ecmaVersion: 7,
        optionalDefs: {
        	"ecma5": true,
        	"ecma6": true,
        	"ecma7": true,
        	"browser": true,
        	"chai": true,
        },
        optionalPlugins: {
        	'amqp': 'amqp', 
        	'angular': 'angular', 
        	'express': 'express', 
        	'es_modules': 'es_modules',
        	'mongodb': 'mongodb',
        	'mongo': 'mongodb', //ESlint provides mongo - map it to Tern
        	'mysql': 'mysql', 
        	'node': 'node',
        	'commonjs': 'commonjs',
        	'pg': 'postgres', 
        	'redis': 'redis', 
        	'amd': 'requirejs'
        }
	};
	
	/**
	 * @description Returns a clone of the deafult server options
	 * @private
	 * @returns {Object} A clone the default server options
	 */
	function _serverOptions() {
		var opts = {};
		Object.keys(serverOptions).forEach(function(key) {
			opts[key] = serverOptions[key];
		});
		opts.plugins = {};
		Object.keys(plugins.required).forEach(function(key) {
			opts.plugins[key] = plugins.required[key];
		});
		return opts;
	}
	
	return {
		plugins: plugins,
		defs: defs,
		defNames: defNames,
		serverOptions: _serverOptions
	};
});
