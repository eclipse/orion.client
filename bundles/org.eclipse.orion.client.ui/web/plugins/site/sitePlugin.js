/*******************************************************************************
 * @license
 * Copyright (c) 2012 IBM Corporation and others.
 * All rights reserved. This program and the accompanying materials are made 
 * available under the terms of the Eclipse Public License 2.0 
 * (http://www.eclipse.org/legal/epl-v10.html), and the Eclipse Distribution 
 * License v1.0 (http://www.eclipse.org/org/documents/edl-v10.html). 
 * 
 * Contributors: IBM Corporation - initial API and implementation
 ******************************************************************************/
/*eslint-env browser, amd*/
define([
	'require',
	'orion/plugin',
	'orion/util',
	'plugins/site/siteServiceImpl',
	'plugins/site/selfHostingRules',
	'i18n!orion/nls/messages'
], function(require, PluginProvider, util, siteImpl, mSelfHostingRules, messages) {
	function qualify(url) {
		return new URL(url, self.location.href).href;
	}
	function unqualify(url) {
		url = qualify(url);
		try {
			if (typeof window === "undefined") {
				return url.substring(self.location.href.indexOf(self.location.host) + self.location.host.length);
			}
			if (window.location.host === parent.location.host && window.location.protocol === parent.location.protocol) {
				return url.substring(parent.location.href.indexOf(parent.location.host) + parent.location.host.length);
			}
		} catch (e) {}
		return url;
	}
	function filesAndFoldersOnService(filePrefix) {
		return [
			{	source: 'Location|Directory'
			},
			{	source: 'Location',
				match: '^' + filePrefix
			}];
	}

	function connect() {
		var login = qualify(require.toUrl('mixloginstatic/LoginWindow.html'));
		var headers = {
			name: "Orion Site Service",
			version: "1.0",
			description: "This plugin provides virtual site support for hosting client web applications from your Orion workspace.",
			login: login
		};
		var pluginProvider = new PluginProvider(headers);
		registerServiceProviders(pluginProvider);
		pluginProvider.connect();
	}

	function registerServiceProviders(provider) {
		// Tightly coupled to the fileClientPlugin
		var siteBase = unqualify(require.toUrl('site'));
		var fileBase = unqualify(require.toUrl('file'));
		var workspaceBase = unqualify(require.toUrl('workspace'));
		//console.log("sitePlugin siteBase:" + siteBase + ", fileBase:" + fileBase + ", workspaceBase:" + workspaceBase);
		var host = new URL("/", self.location.href);
	
		// "Sites" category for putting page links and related links in.
		if (!util.isElectron) {
			provider.registerService("orion.page.link.category", null, {
				id: "sites",
				name: messages["Sites"],
				nls: "orion/nls/messages",
				imageClass: "core-sprite-sites",
				order: 50,
				uriTemplate: "{+OrionHome}/sites/"
			});

			// Default link to ensure "Sites" category is never empty
			provider.registerService("orion.page.link", null, {
				name: messages["Sites"],
				id: "orion.sites",
				nls: "orion/nls/messages",
				category: "sites",
				order: 1000, // low priority
				uriTemplate: "{+OrionHome}/sites/sites.html"
			});
	
			provider.registerService("orion.page.link", null, {
				name: messages["Sites"],
				id: "orion.sites.2",
				nls: "orion/nls/messages",
				category: "sites",
				order: 10, // Make this the first since it's the most useful one
				uriTemplate: "{+OrionHome}/sites/sites.html"
			});
	
			provider.registerService('orion.navigate.command', null, {
				id: 'orion.site.' + host.hostname + '.viewon',
				name: messages['View on Site'],
				tooltip: messages['View this file or folder on a web site hosted by Orion'],
				nls: 'orion/nls/messages',
				forceSingleItem: true,
				category: 'sites',
				validationProperties: filesAndFoldersOnService(fileBase),
				uriTemplate: '{+OrionHome}/sites/view.html#,file={,Location}'
			});
	
			provider.registerService('orion.page.link.related', null, {
				id: 'orion.site.' + host.hostname + '.viewon',
				name: messages['View on Site'],
				tooltip: messages['View this file or folder on a web site hosted by Orion'],
				nls: 'orion/nls/messages',
				category: 'sites',
				validationProperties: filesAndFoldersOnService(fileBase),
				uriTemplate: '{+OrionHome}/sites/view.html#,file={,Location}'
			});
		}
	
		provider.registerService('orion.site',
			new siteImpl.SiteImpl(fileBase, workspaceBase, mSelfHostingRules),
			{
				id: 'orion.site.' + host.hostname,
				name: 'Orion Sites at ' + host.hostname,
				pattern: siteBase,
				filePattern: fileBase,
				canSelfHost: true,
				selfHostingConfig: mSelfHostingRules.Config
			});
	}

	return {
		connect: connect,
		registerServiceProviders: registerServiceProviders
	};
});
