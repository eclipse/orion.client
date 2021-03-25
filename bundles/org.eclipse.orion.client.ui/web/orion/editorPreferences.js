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
	'orion/objects',
	'orion/commonPreferences',
	'orion/defaultEditorPreferences'
], function(objects, mCommonPreferences, mDefaultEditorPreferences) {
	var CommonPreferences = mCommonPreferences.CommonPreferences;
	
	var SETTINGS_SECTION = "/editor/settings"; //$NON-NLS-0$
	var SETTINGS_KEY = "editorSettings"; //$NON-NLS-0$

	function EditorPreferences(preferences, callback) {
		CommonPreferences.apply(this, arguments);
	}
	EditorPreferences.prototype = Object.create(CommonPreferences.prototype);
	objects.mixin(EditorPreferences.prototype, /** @lends edit.GeneralPreferences.prototype */ {
		getDefaults: function() {
			return mDefaultEditorPreferences.defaults;
		},
		getPrefsSection: function() {
			return SETTINGS_SECTION;
		},
		getPrefsKey: function() {
			return SETTINGS_KEY;
		}
	});
	return { EditorPreferences: EditorPreferences };
});
