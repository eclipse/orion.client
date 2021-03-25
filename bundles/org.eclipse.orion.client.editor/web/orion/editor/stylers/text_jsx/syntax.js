/*******************************************************************************
 * @license
 * Copyright (c) 2016 IBM Corporation and others.
 * All rights reserved. This program and the accompanying materials are made 
 * available under the terms of the Eclipse Public License 2.0 
 * (http://www.eclipse.org/legal/epl-v10.html), and the Eclipse Distribution 
 * License v1.0 (http://www.eclipse.org/org/documents/edl-v10.html). 
 * 
 * Contributors: IBM Corporation - initial API and implementation
 ******************************************************************************/

/*eslint-env browser, amd*/
define("orion/editor/stylers/text_jsx/syntax", ["orion/editor/stylers/lib/syntax", "orion/editor/stylers/application_javascript/syntax", "orion/editor/stylers/application_xml/syntax"],
	/* eslint-disable missing-nls */
	function(mLib, mJS, mXML) {

	var grammars = [];
	grammars.push.apply(grammars, mLib.grammars);
	grammars.push.apply(grammars, mJS.grammars);
	grammars.push.apply(grammars, mXML.grammars);
	grammars.push({
		id: "orion.jsx",
		contentTypes: ["text/jsx"],
		patterns: [
			{
				begin: "</?[A-Za-z0-9]+",
				end: "/?>",
				captures: {
					0: {name: "meta.tag.jsx"}
				},
				patterns: [
					{include: "#jsExpression"},
					{include: "orion.lib#string_doubleQuote"},
					{include: "orion.lib#string_singleQuote"},
					{include: "orion.c-like#comment_singleLine"},
					{include: "orion.c-like#comment_block"}
				]
			}, {
				include: "orion.xml#ampersandEscape"
			}, {
				include: "orion.js"
			}
		],
		repository: {
			jsExpression: {
				begin: "\\{",
				end: "\\}",
				contentName: "source.js.embedded.jsx",
				patterns: [
					{include: "orion.js"}
				]
			}
		}
	});
	return {
		id: grammars[grammars.length - 1].id,
		grammars: grammars,
		keywords: []
	};
});
