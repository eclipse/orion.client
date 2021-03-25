/*******************************************************************************
 * @license
 * Copyright (c) 2014 IBM Corporation and others.
 * All rights reserved. This program and the accompanying materials are made 
 * available under the terms of the Eclipse Public License 2.0 
 * (http://www.eclipse.org/legal/epl-v10.html), and the Eclipse Distribution 
 * License v1.0 (http://www.eclipse.org/org/documents/edl-v10.html). 
 * 
 * Contributors: IBM Corporation - initial API and implementation
 ******************************************************************************/

/*eslint-env browser, amd*/

define("orion/editor/stylers/application_x-ejs/syntax", ["orion/editor/stylers/application_javascript/syntax", "orion/editor/stylers/application_xml/syntax"],
	function(mJS, mXML) {

	var grammars = [];
	grammars.push.apply(grammars, mJS.grammars);
	grammars.push.apply(grammars, mXML.grammars);
	grammars.push({
		id: "orion.ejs",
		contentTypes: ["application/x-ejs"],
		patterns: [
			{include: "orion.xml#comment"},
			{include: "orion.xml#doctype"},
			{
				begin: "<%=?(?:\\s|$)",
				end: "%>",
				captures: {
					0: {name: "entity.name.declaration.js"}
				},
				contentName: "source.js.embedded.ejs",
				patterns: [
					{include: "orion.js"}
				]
			},
			{include: "orion.xml#tag"},
			{include: "orion.xml#ampersandEscape"}
		]
	});
	return {
		id: grammars[grammars.length - 1].id,
		grammars: grammars,
		keywords: []
	};
});
