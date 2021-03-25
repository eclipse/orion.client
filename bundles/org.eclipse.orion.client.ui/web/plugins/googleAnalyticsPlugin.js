/*******************************************************************************
 * @license
 * Copyright (c) 2014, 2016 IBM Corporation and others.
 * All rights reserved. This program and the accompanying materials are made 
 * available under the terms of the Eclipse Public License 2.0 
 * (http://www.eclipse.org/legal/epl-v10.html), and the Eclipse Distribution 
 * License v1.0 (http://www.eclipse.org/org/documents/edl-v10.html). 
 * 
 * Contributors: IBM Corporation - initial API and implementation
 ******************************************************************************/
/*eslint-env browser, amd*/
/*global URL*/
define(["orion/plugin", "plugins/metrics/googleAnalyticsImpl"], function(PluginProvider, GoogleAnalyticsImpl) {
	/**
	 * @description Connect the plugin - called back to from the plugin registry
	 */
	function connect() {
		var headers = {
			name: "Google Analytics Plugin", //$NON-NLS-1$
			version: "1.0", //$NON-NLS-1$
			description: "Google Analytics Plugin" //$NON-NLS-1$
		};
		var pluginProvider = new PluginProvider(headers);
		registerServiceProviders(pluginProvider);
		pluginProvider.connect();
	}

	/**
	 * @description Registers this service as <tt>orion.metrics</tt> wih the given provider
	 * @param {ServiceProvider} provider The service provider
	 */
	function registerServiceProviders(provider) {
		var servletPath = new URL("../metrics", self.location).href; //$NON-NLS-0$
		var service = new GoogleAnalyticsImpl(servletPath);
		provider.registerService("orion.metrics", service, {}); //$NON-NLS-0$
	}

	return {
		connect: connect,
		registerServiceProviders: registerServiceProviders
	};
});
