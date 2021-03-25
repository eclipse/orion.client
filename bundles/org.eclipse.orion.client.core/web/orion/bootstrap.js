/*******************************************************************************
 * @license
 * Copyright (c) 2011, 2016 IBM Corporation and others.
 * All rights reserved. This program and the accompanying materials are made 
 * available under the terms of the Eclipse Public License 2.0 
 * (http://www.eclipse.org/legal/epl-v10.html), and the Eclipse Distribution 
 * License v1.0 (http://www.eclipse.org/org/documents/edl-v10.html). 
 *
 * Contributors:
 *     IBM Corporation - initial API and implementation
 *******************************************************************************/
/*eslint-env browser, amd*/

define(['require', 'i18n!orion/nls/messages',  'orion/Deferred', 'orion/serviceregistry', 'orion/preferences', 'orion/pluginregistry', 'orion/config', 'orion/urlModifier'], function(require, messages, Deferred, mServiceregistry, mPreferences, mPluginRegistry, mConfig, urlModifier) {

	var once; // Deferred

	function startup() {
		if (once) {
			return once;
		}
		var pageLoader = require.defined("orion/splash") && require("orion/splash").getPageLoader(); //$NON-NLS-1$
		if (pageLoader) pageLoader.nextStep();
		once = new Deferred();
		
		// initialize service registry and EAS services
		var serviceRegistry = new mServiceregistry.ServiceRegistry();
	
		// This is code to ensure the first visit to orion works
		// we read settings and wait for the plugin registry to fully startup before continuing
		var preferences = new mPreferences.PreferencesService(serviceRegistry);
		return preferences.get("/plugins").then(function(pluginsPreference) { //$NON-NLS-0$
			var configuration = {plugins:{}};
			Object.keys(pluginsPreference).forEach(function(key) {
				var url = require.toUrl(key);
				configuration.plugins[url] = pluginsPreference[key];
			});
			var pluginRegistry = new mPluginRegistry.PluginRegistry(serviceRegistry, configuration);
			if (pageLoader) {
				pageLoader.setPluginRegistry(pluginRegistry);
			}
			return pluginRegistry.start().then(function() {
				if (serviceRegistry.getServiceReferences("orion.core.preference.provider").length > 0) { //$NON-NLS-0$
					return preferences.get("/plugins", undefined, {scope: mPreferences.PreferencesService.USER_SCOPE}).then(function(pluginsPreference) { //$NON-NLS-0$
						var installs = [];
						Object.keys(pluginsPreference).forEach(function(key) {
							var url = require.toUrl(key);
							if (!pluginRegistry.getPlugin(url)) {
								var manifest = pluginsPreference[key];
								if (typeof manifest !== "object") {
									manifest = {autostart: "lazy"};
								}
								installs.push(pluginRegistry.installPlugin(url, manifest).then(function(plugin) { //$NON-NLS-1$
									return plugin.start({lazy: "lazy" === manifest.autostart});
								}));
							}
						});	
						return Deferred.all(installs, function(e){
							console.log(e);
						});
					});
				}
			}).then(function() {
				return new mConfig.ConfigurationAdminFactory(serviceRegistry, pluginRegistry, preferences).getConfigurationAdmin().then(
					serviceRegistry.registerService.bind(serviceRegistry, "orion.cm.configadmin") //$NON-NLS-0$
				);
			}).then(function() {
				if (pageLoader) pageLoader.nextStep();
				var auth = serviceRegistry.getService("orion.core.auth"); //$NON-NLS-0$
				if (auth) {
					if (pageLoader) {
						pageLoader.getStep().message = messages.AuthenticatingUser;
						pageLoader.update();
					}
					return auth.getUser().then(function(user) {
						if (!user) {
							return auth.getAuthForm(window.location.href).then(function(formURL) {
								setTimeout(function() {
									window.location = urlModifier(formURL);
								}, 0);
								return new Deferred().reject({});
							});
						}
						if (pageLoader) {
							pageLoader.getStep().message = messages.AuthenticatedUser;
							pageLoader.update();
						}
					});
				}
			}).then(function() {
				var result = {
					serviceRegistry: serviceRegistry,
					preferences: preferences,
					pluginRegistry: pluginRegistry
				};
				once.resolve(result);
				return result;
			});
		});
	}
	return {startup: startup};
});
