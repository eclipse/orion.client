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
define("orion/editor/stylers/text_x-cshtml/syntax", [
	"orion/editor/stylers/application_xml/syntax",
	"orion/editor/stylers/text_html/syntax",
	"orion/editor/stylers/text_x-csharp/syntax"], function(mXML, mHTML, mCSharp) {

	var grammars = [];
	grammars.push.apply(grammars, mXML.grammars);
	grammars.push.apply(grammars, mHTML.grammars);
	grammars.push.apply(grammars, mCSharp.grammars);
	grammars.push({
		id: "orion.cshtml",
		contentTypes: ["text/x-cshtml"],
		patterns: [
			{include: "#comment"},
			{include: "#codeBlock"},
			{include: "#expression"},
			{include: "#reference"},
			{include: "orion.html"},
		],
		repository: {
			comment: {
				begin: {match: "@\\*", literal: "@*"},
				end: {match: "\\*@", literal: "*@"},
				name: "comment.block.cshtml",
			},
			codeBlock: {
				begin: "(^\\s*)(@)(?=([^{]*){)",
				end: "}",
				captures: {
					2: {name: "entity.name.declaration.csharp"}
				},
				contentName: "source.csharp.embedded.cshtml",
				patterns: [
				    {include: "orion.xml#tag"},
				    {include: "#reference"},
					{include: "orion.csharp"},
				]
			},
			expression: {
				match: "^\\s*@[^{]*$",
				name: "source.csharp.embedded.cshtml",
				patterns: [
				    {include: "#reference"},
					{include: "orion.csharp"},
				]
			},
			reference: {
				match: "@",
				name: "entity.name.declaration.csharp"
			}
		}
	});
	return {
		id: grammars[grammars.length - 1].id,
		grammars: grammars,
		keywords: []
	};
});
