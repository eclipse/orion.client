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
/* eslint-disable missing-nls */
define("orion/editor/stylers/application_xml/syntax", ["orion/editor/stylers/lib/syntax"], function(mLib) {

	var grammars = [];
	grammars.push.apply(grammars, mLib.grammars);
	grammars.push({
		id: "orion.xml",
		contentTypes: ["application/xml", "application/xhtml+xml"],
		patterns: [
			{include: "#comment"},
			{include: "#doctype"},
			{include: "#xmlDeclaration"},
			{include: "#tag"},
			{include: "#ampersandEscape"}
		],
		repository: {
			ampersandEscape: {
				match: "&lt;|&gt;|&amp;",
				name: "constant.character"
			},
			comment: {
				begin: {match: "<!--", literal: "<!--"},
				end: {match: "-->", literal: "-->"},
				name: "comment.block.xml",
				beginCaptures: {
					0: {name: "comment.block.start.xml"}
				},
				endCaptures: {
					0: {name: "comment.block.end.xml"}
				},
				patterns: [
					{
						match: "(\\b)(TODO)(\\b)(((?!-->).)*)",
						name: "meta.annotation.task.todo",
						captures: {
							2: {name: "keyword.other.documentation.task"},
							4: {name: "comment.line"}
						}
					}
				]
			},
			doctype: {
				begin: "<!(?:doctype|DOCTYPE)",
				end: ">",
				name: "meta.tag.doctype.xml",
				captures: {
					0: {name: "meta.tag.doctype.xml"}
				},
				patterns: [
					{include: "#comment"},
					{include: "orion.lib#string_doubleQuote"},
					{include: "orion.lib#string_singleQuote"}
				]
			},
			tag: {
				// https://www.w3.org/TR/2006/REC-xml11-20060816/#sec-common-syn
				begin: "</?[A-Za-z:_][A-Za-z0-9:_\\-.]*",
				end: "/?>",
				captures: {
					0: {name: "meta.tag.xml"}
				},
				patterns: [
					{include: "#comment"},
					{include: "orion.lib#string_doubleQuote"},
					{include: "orion.lib#string_singleQuote"}
				]	
			},
			xmlDeclaration: {
				begin: "<\\?xml",
				end: "\\?>",
				captures: {
					0: {name: "meta.tag.declaration.xml"}
				},
				patterns: [
					{include: "#comment"},
					{include: "orion.lib#string_doubleQuote"},
					{include: "orion.lib#string_singleQuote"}
				],
				name: "meta.tag.declaration.xml"
			}
		}
	});
	return {
		id: grammars[grammars.length - 1].id,
		grammars: grammars,
		keywords: []
	};
});
