/*******************************************************************************
 * @license
 * Copyright (c) 2011, 2012 IBM Corporation and others. All rights reserved. This
 * program and the accompanying materials are made available under the terms of
 * the Eclipse Public License 2.0 (http://www.eclipse.org/legal/epl-v10.html),
 * and the Eclipse Distribution License v1.0
 * (http://www.eclipse.org/org/documents/edl-v10.html).
 * 
 * Contributors: IBM Corporation - initial API and implementation
 ******************************************************************************/
/*eslint-env browser, amd*/
/*global URL*/
var _browser_script_source = null; //We need to know where the browser script lives
var _all_script = document.getElementsByTagName('script');
if (_all_script && _all_script.length && _all_script.length > 0) {
	for (var j = 0; j < 2; j++) { // try twice in all the script tags
		for (var i = 0; i < _all_script.length; i++) {
			if (j === 0) { //First try: if the script id is ""orion.browse.browser""
				if (_all_script[i].id === "orion.git.commitBrowser") {
					_browser_script_source = _all_script[i].src;
					break;
				}
			} else {
				var regex = /.*built-commitBrowser.*.js/;
				if (_all_script[i].src && regex.exec(_all_script[i].src)) {
					_browser_script_source = _all_script[i].src;
					break;
				}
			}
		}
		if (_browser_script_source) {
			break;
		}
	}
	if (!_browser_script_source) {
		_browser_script_source = _all_script[_all_script.length - 1].src;
	}
}
define([
	'gitWidgets/helper/gitCommitHelper',
	'orion/staticDataSource',
	'orion/contentTypes',
	'orion/serviceregistry',
	'orion/pluginregistry',
	'orion/git/gitClient',
	'orion/objects',
	'orion/Deferred',
	'orion/URL-shim'
], function(
	mGitCommitHelper, 
	mStaticDataSource,
	mContentTypes,
	mServiceRegistry, 
	mPluginRegistry,
	mGitClient,
	objects,
	Deferred
) {
	function Browser(params) { // parentId, repo, base
		if (typeof params === "string") {
			params = {
				parentId: arguments[0],
				pluginURL: arguments[1]
			};
		} else {
			params = params || {};
		}
		var serviceRegistry = this.serviceRegistry = new mServiceRegistry.ServiceRegistry();
		var gitClient = this.gitClient = new mGitClient.GitService(serviceRegistry);
		this._contentTypeService =  new mContentTypes.ContentTypeRegistry(mStaticDataSource.ContentTypes);
		serviceRegistry.registerService("orion.core.contentTypeRegistry", this._contentTypeService); //$NON-NLS-0$
		var pluginURL = params.pluginURL ? new URL(params.pluginURL, _browser_script_source) :
											new URL("../../git/plugins/gitPlugin.html", _browser_script_source);
		var plugins = {};
		plugins[pluginURL.href] = {autostart: "started", lastModified: -1};
		this.pluginRegistry = new mPluginRegistry.PluginRegistry(serviceRegistry, {
			storage: {},
			plugins: plugins
		});
		this.commitHelper = new mGitCommitHelper.GitCommitHelper({
			parentId: params.parentId,
			serviceRegistry: serviceRegistry,
			gitClient: gitClient
		});
	}

	objects.mixin(Browser.prototype, {
		startup: function() {
			if(this.started) {
				return new Deferred().resolve();
			} else {
				this.started = true;
				return this.pluginRegistry.start();
			}
		},
		displayCommit: function(commit, location, commitName, title) {
			this.commitHelper.displayDiffs(commit, location, commitName, title);
		}
	});
	return Browser;
});
