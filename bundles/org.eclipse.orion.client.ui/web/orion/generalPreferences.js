/*******************************************************************************
 * @license
 * Copyright (c) 2013, 2017 IBM Corporation and others.
 * All rights reserved. This program and the accompanying materials are made
 * available under the terms of the Eclipse Public License 2.0
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

	var GENERAL_SECTION = "/general/settings"; //$NON-NLS-0$
	var GENERAL_KEY = "generalSettings"; //$NON-NLS-0$

	var defaults = {
		desktopSelectionPolicy: true,
		filteredResources: '.git, .DS_Store',
		enableEditorTabs: util.isElectron ? true: false,
		maximumEditorTabs: 0,
		enableFileCreationAtRoot: false,
		enableFolderCreationAtRoot: false,
		enableProjectCreation: true,
		enableLinkProjectCreation: true,
		enableRefreshButton: false,
		enableDebugger: false
	};

	function GeneralPreferences(preferences, callback) {
		CommonPreferences.apply(this, arguments);
	}
	GeneralPreferences.prototype = Object.create(CommonPreferences.prototype);
	objects.mixin(GeneralPreferences.prototype, /** @lends edit.GeneralPreferences.prototype */ {
		getDefaults: function() {
			return defaults;
		},
		getPrefsSection: function() {
			return GENERAL_SECTION;
		},
		getPrefsKey: function() {
			return GENERAL_KEY;
		}
	});
	return { GeneralPreferences: GeneralPreferences };
});
