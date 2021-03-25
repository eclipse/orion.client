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
	'javascript/support/ternproject/ternProjectHover',
	'javascript/support/ternproject/ternProjectValidator',
	'javascript/support/ternproject/ternProjectAssist',
	'javascript/support/ternproject/ternProjectManager',
	'i18n!javascript/nls/messages'
], function(Objects, Hover, Validator, Assist, Manager, Messages) {
	
	var astManager,
		resolver,
		ternProjectManager,
		ternProjectValidator;
	
	/**
	 * @description Creates the new Tern project support object
	 * @returns {TernProjectSupport} The new Tern project support instance
	 * @since 15.0
	 */
	function TernProjectSupport(serviceRegistry, jsProject, jsonAstManager, ternWorker, scriptResolver, setStarting) {
		astManager = jsonAstManager;
		resolver = scriptResolver;
		ternProjectManager = new Manager.TernProjectManager(ternWorker, scriptResolver, serviceRegistry, setStarting);
		jsProject.addHandler(ternProjectManager);
	}
	
	Objects.mixin(TernProjectSupport.prototype, {
		/**
		 * @name registerExtensions
		 * @description Registers all of the plugin extensions for .tern-project file support
		 * @function
		 * @param {PluginProvider} provider The provider to add the extensions to
		 */
		registerExtensions: function registerExtensions(provider) {
			provider.registerService("orion.edit.hover", new Hover(astManager, resolver),
				{
					name: Messages["ternProjectHover"],
					contentType: ["javascript/config"] //$NON-NLS-1$ //$NON-NLS-2$
				});
			provider.registerService("orion.edit.validator", new Validator.TernProjectValidator(astManager),
				{
					contentType: ["application/json"] //$NON-NLS-1$
				});
			provider.registerService("orion.edit.contentassist", new Assist(astManager),
				{
					contentType: ["javascript/config"], //$NON-NLS-1$
					nls: 'javascript/nls/messages', //$NON-NLS-1$
					name: 'ternProjectAssist', //$NON-NLS-1$
					id: "orion.edit.contentassist.javascript.tern.project" //$NON-NLS-1$
				});
		}
	});
	
	return TernProjectSupport;
});
