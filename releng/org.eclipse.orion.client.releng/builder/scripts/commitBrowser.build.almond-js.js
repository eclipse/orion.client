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
        text: 'requirejs/text',
        "orion/extensionCommands": "gitWidgets/builder/buildFrom/emptyExtensionCommands",
        "orion/globalCommands": "gitWidgets/builder/buildFrom/emptyGlobalCommands",
        "orion/editorCommands": "gitWidgets/builder/buildFrom/emptyEditorCommands"
	},
	name: "almond",
	locales: ["ja", "zh", "zh-tw", "fr", "de", "it", "es", "pt-br", "ko", "zh-hk"],						
	include: "gitWidgets/builder/commitBrowser",
	preserveLicenseComments: false,
	wrap: {
		start: "/* orion commitBrowser */ ", //start cannot be empty
		end: "\
		orion = this.orion || (this.orion = {});\n\
		var git = orion.git || (orion.git = {});\n\
		git.commitBrowser = require('gitWidgets/builder/commitBrowser');"
	}
});
