/*******************************************************************************
 * @license
 * Copyright (c) 2017 IBM Corporation and others.
 * All rights reserved. This program and the accompanying materials are made
 * available under the terms of the Eclipse Public License 2.0
 * (http://www.eclipse.org/legal/epl-v10.html), and the Eclipse Distribution
 * License v1.0 (http://www.eclipse.org/org/documents/edl-v10.html).
 *
 * Contributors:
 *     IBM Corporation - initial API and implementation
 *******************************************************************************/
define([
	'orion/objects',
	'javascript/support/eslint/eslintHover'
], function(Objects, Hover) {
	
	var astManager,
		scriptresolver,
		project;
	
	/**
	 * @description Creates the new ESLint configuration file support object
	 * @param {JsonAstManager} jsonAstManager The back AST manager
	 * @param {ScriptResolver} scriptResolver The backing script resolver 
	 * @returns {EslintSupport} The new ESLint config file support instance
	 * @since 15.0
	 */
	function EslintSupport(jsonAstManager, scriptResolver, jsProject) {
		astManager = jsonAstManager;
		scriptresolver = scriptResolver;
		project = jsProject;
	}
	
	Objects.mixin(EslintSupport.prototype, {
		/**
		 * @name registerExtensions
		 * @description Registers all of the plugin extensions for .tern-project file support
		 * @function
		 * @param {PluginProvider} provider The provider to add the extensions to
		 */
		registerExtensions: function registerExtensions(provider) {
			provider.registerService("orion.edit.hover", new Hover.ESLintHover(astManager, scriptresolver, project),
				{
					name: "ESLint Hover Support",
					contentType: ["application/json", "javascript/config"]
				});
		}
	});
	
	return EslintSupport;
});
