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
	'javascript/support/packagejson/packageJsonHover',
	'javascript/support/packagejson/packageJsonAssist'
], function(Objects, Hover, Assist) {
	
	var astManager,
		scriptresolver;
	
	/**
	 * @description Creates the new package.json configuration file support object
	 * @returns {PackageJsonSupport} The new package.json project support instance
	 * @since 15.0
	 */
	function PackageJsonSupport(jsonAstManager, scriptResolver) {
		astManager = jsonAstManager;
		scriptresolver = scriptResolver;
	}
	
	Objects.mixin(PackageJsonSupport.prototype, {
		/**
		 * @name registerExtensions
		 * @description Registers all of the plugin extensions for package.json file support
		 * @function
		 * @param {PluginProvider} provider The provider to add the extensions to
		 */
		registerExtensions: function registerExtensions(provider) {
			provider.registerService("orion.edit.hover", new Hover(astManager, scriptresolver),
				{
					name: "Package.json Hover Support",
					contentType: ["application/json"] //$NON-NLS-1$ //$NON-NLS-2$
				});
			provider.registerService("orion.edit.contentassist", new Assist(astManager),
				{
					contentType: ["application/json"], //$NON-NLS-1$
					nls: 'javascript/nls/messages', //$NON-NLS-1$
					name: 'packageJsonAssist', //$NON-NLS-1$
					id: "orion.edit.contentassist.package.json" //$NON-NLS-1$
				});
		}
	});
	
	return PackageJsonSupport;
});
