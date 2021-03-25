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
define("orion/editor/stylers/text_x-erlang/syntax", ["orion/editor/stylers/lib/syntax"], function(mLib) {
	var keywords = [
		"xor",
		"when",
		"try",
		"rem", "receive",
		"query",
		"orelse", "or", "of",
		"not",
		"let",
		"if",
		"fun",
		"end",
		"div",
		"cond", "catch", "case",
		"bxor", "bsr", "bsl", "bor", "bnot", "begin", "band",
		"andalso", "and", "after"
	];

	// For Preprocessors, Records and so on specified with hyphens
	var hyphenKeywords = [
		"vsn",
		"undef",
		"type",
		"spec",
		"record",
		"on_load", "opaque",
		"module",
		"include_lib", "include", "import", "ifndef", "ifdef",
		"file",
		"export_type", "export", "endif", "else",
		"define",
		"callback", "compile",
		"behaviour"
	];

	var grammars = [];
	grammars.push.apply(grammars, mLib.grammars);
	grammars.push({
		id: "orion.erlang",
		contentTypes: ["text/x-erlang"],
		patterns: [
			{include: "#comment"},
			{include: "#stringSingleLine"},
			{include: "#stringMultiLine"},
			{include: "#method"},
			{include: "orion.lib#brace_open"},
			{include: "orion.lib#brace_close"},
			{include: "orion.lib#bracket_open"},
			{include: "orion.lib#bracket_close"},
			{include: "orion.lib#parenthesis_open"},
			{include: "orion.lib#parenthesis_close"},
			{include: "orion.lib#operator"},
			{include: "orion.lib#number_decimal"},
			{
				match: "\\b(?:" + keywords.join("|") + ")\\b",
				name: "keyword.operator.erlang"
			},
			{
				match: "^\\s*-(?:" + hyphenKeywords.join("|") + ")\\b",
				name: "keyword.operator.erlang"
			}
		],
		repository: {
			comment: {
				match: {match: "%.*", literal: "%"},
				name: "comment.line.erlang",
				patterns: [
					{
						include: "orion.lib#todo_comment_singleLine"
					}
				]
			},
			method: {
				match: "(^|\\s)[a-zA-Z0-9_.]+(?=\\(|\\s\\()",
			    name: "entity.name.function.erlang"
			},
			stringMultiLine: {
				begin: '"(?:\\\\.|[^\\\\"])*$',
				end: '^(?:\\\\.|[^\\\\"])*"',
				name: "string.quoted.double.erlang"
			},
			stringSingleLine: {
				match: '"(?:\\\\.|[^\\\\"])*"',
				name: "string.quoted.double.erlang"
			}
		}
	});
	return {
		id: grammars[grammars.length - 1].id,
		grammars: grammars,
		keywords: keywords
	};
});
