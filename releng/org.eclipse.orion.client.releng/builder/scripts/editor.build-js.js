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
        i18n: 'requirejs/i18n'
	},
	name: "orion/editor/edit",
	preserveLicenseComments: false,
	wrap: {
		start: "/* orion editor */ ", //start cannot be empty
		end: " define(['orion/editor/edit'], function(edit) {return edit;});"
	}
});
