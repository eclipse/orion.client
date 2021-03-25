/*******************************************************************************
 * @license
 * Copyright (c) 2014, 2017 IBM Corporation and others.
 * All rights reserved. This program and the accompanying materials are made 
 * available under the terms of the Eclipse Public License 2.0 
 * (http://www.eclipse.org/legal/epl-v10.html), and the Eclipse Distribution 
 * License v1.0 (http://www.eclipse.org/org/documents/edl-v10.html). 
 * 
 * Contributors: IBM Corporation - initial API and implementation
 ******************************************************************************/

/*eslint-env browser, amd*/

define("orion/editor/stylers/application_javascript/syntax", ["orion/editor/stylers/lib/syntax"], function(mLib) {
	var keywords = [
		"async", "await",
		"class", "const",
		"debugger", "delete",
		"enum", "export", "extends",
		"function",
		"implements", "import", "in", "instanceof", "interface",
		"let",
		"new",
		"of",
		"package", "private", "protected", "public",
		"static", "super",
		"typeof",
		"var", "void",
		"with"
	];
	var controlKeywords = [
		"break",
		"case", "catch", "continue",
		"default", "do",
		"else",
		"finally", "for",
		"if",
		"return",
		"switch",
		"throw", "try",
		"while",
		"yield"
	];
	var languageVariables = ["this"];
	var constants = [
		"false", "null", "true", "undefined"
	];

	var grammars = [];
	grammars.push.apply(grammars, mLib.grammars);
	grammars.push({
		id: "orion.js",
		contentTypes: ["application/javascript"],
		patterns: [
			{include: "#string_multiline_singleQuote"},
			{include: "#string_multiline_doubleQuote"},
			{include: "#templateLiteral"},
			{include: "orion.lib#string_doubleQuote"},
			{include: "orion.lib#string_singleQuote"},
			{include: "orion.c-like#comment_singleLine"},
			{include: "#regex"},
			{include: "orion.lib#doc_block"},
			{include: "orion.c-like#comment_block"},
			{include: "#jsFunctionDef"},
			{include: "orion.lib#brace_open"},
			{include: "orion.lib#brace_close"},
			{include: "orion.lib#bracket_open"},
			{include: "orion.lib#bracket_close"},
			{include: "orion.lib#parenthesis_open"},
			{include: "orion.lib#parenthesis_close"},
			{include: "orion.lib#operator"},
			{include: "orion.lib#number_decimal"},
			{include: "orion.lib#number_hex"},
			{include: "#keywordsOperator"},
			{include: "#keywordsControl"},
			{include: "#languageConstant"},
			{include: "#languageVariable"}
		],
		repository: {
			jsFunctionDef: {
				/*
				 * http://stackoverflow.com/questions/2008279/validate-a-javascript-function-name/2008444#2008444
				 * was referenced in the composition of the "begin" pattern below.
				 */
				begin: "(function)(\\s+[_$a-zA-Z\\xA0-\\uFFFF][_$a-zA-Z0-9\\xA0-\\uFFFF]*)?\\s*\\(",
				end: "\\)",
				captures: {
					1: {name: "keyword.operator.js"},
					2: {name: "entity.name.function.js"}
				},
				patterns: [
					{include: "orion.c-like#comment_singleLine"},
					{include: "orion.c-like#comment_block"},
					{
						match: "[^\\s,]+",
						name: "variable.parameter.js"
					}
				]
			},
			keywordsControl: {
				match: "\\b(?:" + controlKeywords.join("|") + ")\\b",
				name: "keyword.control.js"
			},
			keywordsOperator: {
				match: "\\b(?:" + keywords.join("|") + ")\\b",
				name: "keyword.operator.js"
			},
			languageConstant: {
				match: "\\b(?:" + constants.join("|") + ")\\b",
				name: "constant.language.js"
			},
			languageVariable: {
				match: "\\b(?:" + languageVariables.join("|") + ")\\b",
				name: "variable.language.js"
			},
			string_multiline_singleQuote: {
				begin: "'(?:\\\\.|[^\\\\'])*\\\\$",
				end: "^(?:$|(?:\\\\.|[^\\\\'])*('|[^\\\\]$))",
				name: "string.quoted.single.js"
			},
			string_multiline_doubleQuote: {
				begin: '"(?:\\\\.|[^\\\\"])*\\\\$',
				end: '^(?:$|(?:\\\\.|[^\\\\"])*("|[^\\\\]$))',
				name: "string.quoted.double.js"
			},
			regex: {
				match: "/(?![\\s\\*])(?:\\\\.|[^/])+/(?:[gim]{0,3})",
				name: "string.regexp.js"
			},
			templateLiteral: {
				begin: "`",
				end: "`",
				name: "string.quoted.backtick.js",
				patterns: [
					{
						begin: "\\$\\{",
						end: "\\}",
						name: "string.interpolated.js",
						patterns: [
							{include: "#string_multiline_singleQuote"},
							{include: "#string_multiline_doubleQuote"},
							{include: "#templateLiteral"},
							{include: "orion.lib#string_doubleQuote"},
							{include: "orion.lib#string_singleQuote"},
							{include: "orion.c-like#comment_singleLine"},
							{include: "#regex"},
							{include: "orion.lib#doc_block"},
							{include: "orion.c-like#comment_block"},
							{include: "#jsFunctionDef"},
							{include: "orion.lib#brace_open"},
							{include: "orion.lib#brace_close"},
							{include: "orion.lib#bracket_open"},
							{include: "orion.lib#bracket_close"},
							{include: "orion.lib#parenthesis_open"},
							{include: "orion.lib#parenthesis_close"},
							{include: "orion.lib#operator"},
							{include: "orion.lib#number_decimal"},
							{include: "orion.lib#number_hex"},
							{include: "#keywordsOperator"},
							{include: "#keywordsControl"},
							{include: "#languageConstant"},
							{include: "#languageVariable"}
						]
					}
				]
			}
		}
	});

	return {
		id: grammars[grammars.length - 1].id,
		grammars: grammars,
		keywords: keywords.concat(controlKeywords).concat(languageVariables).concat(constants)
	};
});
