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
        json: "requirejs/json",
  		text: 'requirejs/text',
  		i18n: 'requirejs/i18n',
  		domReady: 'requirejs/domReady'
	},
	packages: [],
	name: "almond",
	//locales: ["ja", "zh", "zh-tw", "fr", "de", "it", "es", "pt-br"],						
	include: "plugins/embeddedToolingPlugin",
	preserveLicenseComments: false,
	wrap: {
		start: "\
			(function (root, factory) {\
				if (typeof define === 'function' && define.amd) {\
					define([], factory);\
				} else {\
					root.orion = root.orion || {};\
					root.orion.webtools = root.orion.webtools || {};\
					root.orion.webtools.embeddedTooling = factory();\
				}\
			}(this, function () {\
		",
		end: "\
				return require('plugins/embeddedToolingPlugin');\
			}));\
		"
	}
});
