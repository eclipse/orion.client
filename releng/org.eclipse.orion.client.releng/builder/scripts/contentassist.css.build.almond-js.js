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
	baseUrl: ".",
	paths: {
		i18n: "requirejs/i18n"
	},
	name: "requirejs/almond",
	include: ["webtools/cssContentAssist"],
	preserveLicenseComments: false,
	generateSourceMaps: true,
	wrap: {
		start: "\
			(function (root, factory) {\
				if (typeof define === 'function' && define.amd) {\
					define([], factory);\
				} else {\
					root.orion = root.orion || {};\
					root.orion.webtools = root.orion.webtools || {};\
					root.orion.webtools.cssContentAssist = factory();\
				}\
			}(this, function () {\
		",
		end: "\
				return require('webtools/cssContentAssist').CssContentAssistProvider;\
			}));\
		"
	}
});
