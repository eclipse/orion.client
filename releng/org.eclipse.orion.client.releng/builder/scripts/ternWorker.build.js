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
/* eslint-disable missing-nls */
({
    generateSourceMaps: true,
    preserveLicenseComments: false,
	baseUrl: ".",
	paths: {
		text: "requirejs/text",
		json: "requirejs/json",
		i18n: "requirejs/i18n"
	},
	name: "javascript/plugins/ternWorkerCore",
	wrap: {
		start: "importScripts('../../requirejs/require.min.js');\n",
		end: ""
	}
});
