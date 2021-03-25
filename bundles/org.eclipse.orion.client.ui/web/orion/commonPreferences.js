/*******************************************************************************
 * @license
 * Copyright (c) 2013 IBM Corporation and others.
 * All rights reserved. This program and the accompanying materials are made
 * available under the terms of the Eclipse Public License 2.0
 * (http://www.eclipse.org/legal/epl-v10.html), and the Eclipse Distribution
 * License v1.0 (http://www.eclipse.org/org/documents/edl-v10.html).
 *
 * Contributors:  IBM Corporation - initial API and implementation
 ******************************************************************************/
/*eslint-env browser, amd*/

define([
	'orion/EventTarget'
], function(EventTarget) {
	function mergeSettings(defaults, settings) {
		for (var property in defaults) {
			if (!settings.hasOwnProperty(property)) {
				settings[property] = defaults[property];
			}
		}
		return settings;
	}
	
	function CommonPreferences(preferences, callback) {
		this._preferences = preferences;
		EventTarget.attach(this);
		preferences.addEventListener("changed", function (e) {
			if (e.namespace === this.getPrefsSection()) {
				this.dispatchEvent({type: "Changed"}); //$NON-NLS-0$
			}
		}.bind(this));
		if (callback) {
			this.addEventListener("Changed", function(evt) { //$NON-NLS-0$
				callback(evt.preferences);
			});
		}
	}

	CommonPreferences.prototype = /** @lends edit.EditorPreferences.prototype */ {
		_initialize: function(prefs) {
			var settings = prefs[this.getPrefsKey()] || {};
			var defaults = this.getDefaults();
			return mergeSettings(defaults, settings);
		},
		getDefaults: function() {
			return {};
		},
		getPrefsSection: function() {
			return "common/settings"; //$NON-NLS-0$
		},
		getPrefsKey: function() {
			return "commonSettings"; //$NON-NLS-0$
		},
		getPrefs: function(callback) {
			return this._preferences.get(this.getPrefsSection()).then(function(prefs) {
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
			this._preferences.put(this.getPrefsSection(), data).then(function() {
				object = this._initialize(data);
				if (callback) {
					callback(object);
				}
				this.dispatchEvent({type: "Changed", preferences: object}); //$NON-NLS-0$
			}.bind(this));
		}
	};

	return { CommonPreferences: CommonPreferences,
			 mergeSettings: mergeSettings};
});
