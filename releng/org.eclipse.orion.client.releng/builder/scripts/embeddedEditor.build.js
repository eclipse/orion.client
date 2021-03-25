/*******************************************************************************
 * Copyright (c) 2013, 2015 IBM Corporation and others.
 * All rights reserved. This program and the accompanying materials are made 
 * available under the terms of the Eclipse Public License 2.0 
 * (http://www.eclipse.org/legal/epl-v10.html), and the Eclipse Distribution 
 * License v1.0 (http://www.eclipse.org/org/documents/edl-v10.html). 
 *
 * Contributors:
 *     IBM Corporation - initial API and implementation
 *******************************************************************************/
 
// optimization script to concat/minify the Orion editor javascript code
/* eslint-disable missing-nls */
({
    baseUrl: '.',
	paths: {
        almond: 'requirejs/almond',
        i18n: 'requirejs/i18n',
        json: "requirejs/json",
        text: 'requirejs/text',
        //"orion/extensionCommands": "embeddedEditor/builder/buildFrom/emptyExtensionCommands",
        "orion/globalCommands": "embeddedEditor/builder/buildFrom/emptyGlobalCommands",
        'orion/webui/dialogs/OpenResourceDialog': 'embeddedEditor/builder/buildFrom/OpenResourceDialog',
        'orion/explorers/navigatorRenderer': 'embeddedEditor/builder/buildFrom/navigatorRenderer',
        'examples/editor/textStyler': 'embeddedEditor/builder/buildFrom/emptyTextStyler',
        'orion/widgets/settings/EditorSettings': 'embeddedEditor/builder/buildFrom/EditorSettings',
        'orion/searchAndReplace/textSearcher': 'embeddedEditor/builder/buildFrom/textSearcher',
		'orion/editorPreferences': 'embeddedEditor/builder/buildFrom/editorPreferences',
		'orion/widgets/themes/ThemePreferences': 'embeddedEditor/builder/buildFrom/ThemePreferences',
		'orion/widgets/themes/editor/ThemeData': 'embeddedEditor/builder/buildFrom/ThemeData'
        //"orion/editorCommands": "embeddedEditor/builder/buildFrom/emptyEditorCommands"
	},
	preserveLicenseComments: false
});
