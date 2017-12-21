/*******************************************************************************
 * @license
 * Copyright (c) 2013, 2017 IBM Corporation and others.
 * All rights reserved. This program and the accompanying materials are made
 * available under the terms of the Eclipse Public License v1.0
 * (http://www.eclipse.org/legal/epl-v10.html), and the Eclipse Distribution
 * License v1.0 (http://www.eclipse.org/org/documents/edl-v10.html).
 *
 * Contributors:
 *     IBM Corporation - initial API and implementation
 *     Casey Flynn - Google Inc.
 ******************************************************************************/
/*eslint-env browser, amd*/

define([
	'orion/objects',
	'orion/commonPreferences',
	'orion/util'
], function(objects, mCommonPreferences, util) {
	var CommonPreferences = mCommonPreferences.CommonPreferences;

	var GENERAL_SECTION = "/tabs"; //$NON-NLS-0$
	var GENERAL_KEY = "tabsInfo"; //$NON-NLS-0$

	var defaults = {};

	function WorkspaceTabPreferences(preferences, callback) {
		CommonPreferences.apply(this, arguments);
	}
	WorkspaceTabPreferences.prototype = Object.create(CommonPreferences.prototype);
	objects.mixin(WorkspaceTabPreferences.prototype, /** @lends edit.GeneralPreferences.prototype */ {
		getDefaults: function() {
			return defaults;
		},
		getPrefsSection: function() {
			return GENERAL_SECTION;
		},
		getPrefsKey: function() {
			return GENERAL_KEY;
		},
		getPrefs: function(callback) {
			return this._preferences.get(this.getPrefsSection(), null, {scope:8, workspaceId: this.workspaceId}).then(function(prefs) {
				var object = this._initialize(prefs);
				if (typeof object === "string") { //$NON-NLS-0$
					object = JSON.parse(object);
				}
				if (callback) {
					callback(object);
				}
				return object;
			}.bind(this));
		},
		setPrefs: function(object, callback) {
			var data = {};
			data[this.getPrefsKey()] = object;
			this._preferences.put(this.getPrefsSection(), data, {scope:8, workspaceId: this.workspaceId}).then(function() {
				object = this._initialize(data);
				if (callback) {
					callback(object);
				}
				this.dispatchEvent({type: "Changed", preferences: object}); //$NON-NLS-0$
			}.bind(this));
		},
		setWorkspaceId: function(workspaceId){
			this.workspaceId = workspaceId;
		},
		getWorkspaceId: function(){
			return this.workspaceId;
		}
	});
	return { WorkspaceTabPreferences: WorkspaceTabPreferences };
});
