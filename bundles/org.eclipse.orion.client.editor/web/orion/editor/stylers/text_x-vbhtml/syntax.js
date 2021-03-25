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
define("orion/editor/stylers/text_x-vbhtml/syntax", [
	"orion/editor/stylers/application_xml/syntax",
	"orion/editor/stylers/text_html/syntax",
	"orion/editor/stylers/text_x-vb/syntax"], function(mXML, mHTML, mVB) {

	var grammars = [];
	grammars.push.apply(grammars, mXML.grammars);
	grammars.push.apply(grammars, mHTML.grammars);
	grammars.push.apply(grammars, mVB.grammars);
	grammars.push({
		id: "orion.vbhtml",
		contentTypes: ["text/x-vbhtml"],
		patterns: [
			{include: "#vbhtmlComment"},
			{include: "#codeBlock"},
			{include: "#expression"},
			{include: "#reference"},
			{include: "orion.html"},
		],
		repository: {
			vbhtmlComment: {
				begin: {match: "@\\*", literal: "@*"},
				end: {match: "\\*@", literal: "*@"},
				name: "comment.block.vbhtml",
			},
			codeBlock: {
				begin: "(?i)^\\s*@code",
				end: "(?i)end code",
				captures: {
					0: {name: "entity.name.declaration.vb"}
				},
				contentName: "source.vb.embedded.vbhtml",
				patterns: [
				    {include: "orion.xml#tag"},
				    {include: "#reference"},
					{include: "orion.vb"},
				]
			},
			expression: {
				match: "(?i)^\\s*@(?!code)[^$]*",
				name: "source.vb.embedded.vbhtml",
				patterns: [
				    {include: "#reference"},
					{include: "orion.vb"},
				]
			},
			reference: {
				match: "@",
				name: "entity.name.declaration.vb"
			}
		}
	});
	return {
		id: grammars[grammars.length - 1].id,
		grammars: grammars,
		keywords: []
	};
});
