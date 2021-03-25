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

define("orion/editor/stylers/application_vnd.coffeescript/syntax", ["orion/editor/stylers/lib/syntax", "orion/editor/stylers/application_javascript/syntax"], function(mLib, mJS) {
	var controlKeywords = [
		"break",
		"case", "catch", "continue",
		"default", "do",
		"else",
		"finally", "for",
		"if",
		"loop",
		"return",
		"switch",
		"then", "throw", "try",
		"unless", "until",
		"when", "while",
		"yield"
	];
	var keywords = [
		"and", "arguments",
		"by",
		"class", "const",
		"debugger", "delete",
		"enum", "eval", "export", "extends",
		"function",
		"implements", "import", "instanceof", "interface", "in", "isnt", "is",
		"let",
		"native", "new", "not", "no",
		"off", "of", "on", "or",
		"package", "private", "protected", "public",
		"static", "super",
		"typeof",
		"var", "void",
		"with",
		"yes",
		"__bind", "__extends", "__hasProp", "__indexOf", "__slice",
	];
	var constants = [
		"false", "null", "true", "undefined"
	];
	var languageVariables = ["this"];

	var grammars = [];
	grammars.push.apply(grammars, mLib.grammars);
	grammars.push.apply(grammars, mJS.grammars);
	grammars.push({
		id: "orion.coffeescript",
		contentTypes: ["application/vnd.coffeescript"],
		patterns: [
			{include: "#comment_block"},
			{include: "#embedded_js"},
			{include: "#string_singleline"},
			{include: "#string_multiline"},
			{include: "#heregex"},
			{include: "#regex"},
			{include: "orion.lib#string_singleQuote"},
			{include: "#comment_singleLine"},
			{include: "orion.lib#number_decimal"},
			{include: "orion.lib#number_hex"},
			{include: "#reserved_words"},
			{include: "#keyword_control"},
			{include: "#keyword_operator"},
			{include: "#language_variable"},
			{include: "#constant"},
			{include: "#punctuation"},
			{include: "orion.lib#brace_open"},
			{include: "orion.lib#brace_close"},
			{include: "orion.lib#bracket_open"},
			{include: "orion.lib#bracket_close"},
			{include: "orion.lib#parenthesis_open"},
			{include: "orion.lib#parenthesis_close"},
		],
		repository: {
			comment_block: {
				begin: {match: "###(?!#)", literal: "###"},
				end: {match: "###", literal: "###"},
				name: "comment.block.coffeescript"
			},
			comment_singleLine: {
				match: {match: "#[^$]*", literal: "#"},
				name: "comment.line.coffeescript"
			},
			constant: {
				match: "\\b(?:" + constants.join("|") + ")\\b",
				name: "constant.language.coffeescript"
			},
			embedded_js: {
				begin: "`",
				end: "`",
				patterns: [
					{include: "orion.js"}
				]
			},
			heregex: {
				begin: "\\/{3}",
				end: "\\/{3}(?:[gim]{0,3})",
				name: "string.heregexp.coffeescript",
				patterns: [{
					match: "\\s#[^$]*",
					name: "comment.block.coffeescript"
				}]
			},
			keyword_control: {
				match: "\\b(?:" + controlKeywords.join("|") + ")\\b",
				name: "keyword.control.coffeescript"
			},
			keyword_operator: {
				match: "\\b(?:" + keywords.join("|") + ")\\b",
				name: "keyword.operator.coffeescript"
			},
			language_variable: {
				match: "\\b(?:" + languageVariables.join("|") + ")\\b",
				name: "variable.language.coffeescript"
			},
			punctuation: {
				/* the following match is based on a regular expression from http://coffeescript.org/ */
				match: "[-=]?>|<|[-+*\\/%<>&|^!?=]?=|>>>=?|([-+*/%:])\\1|([&|<>])\\2=?|\\?\\.?|\\.{2,3}|%|@",
				name: "punctuation.operator.coffeescript"
			},
			regex: {
				match: "/(?![\\s\\*])(?:\\\\.|[^/])+/(?:[gim]{0,3})",
				name: "string.regexp.coffeescript"
			},
			string_singleline: {
				match: '"(?:\\\\.|[^"])*"',
				name: "string.quoted.double.coffeescript",
				patterns: [
					{
						begin: "#{",
						end: "}",
						name: "string.interpolated.coffeescript",
						patterns: [
							{include: "#comment_block"},
							{include: "#embedded_js"},
							{include: "#comment_singleLine"},
							{include: "#heregex"},
							{include: "#regex"},
							{include: "orion.lib#string_singleQuote"},
							{include: "orion.lib#number_decimal"},
							{include: "#reserved_words"},
							{include: "#keyword_control"},
							{include: "#keyword_operator"},
							{include: "#language_variable"},
							{include: "#constant"},
							{include: "#punctuation"},
							{include: "orion.lib#brace_open"},
							{include: "orion.lib#brace_close"},
							{include: "orion.lib#bracket_open"},
							{include: "orion.lib#bracket_close"},
							{include: "orion.lib#parenthesis_open"},
							{include: "orion.lib#parenthesis_close"},
						]
					}
				]
			},
			string_multiline: {
				begin: '("("")?)',
				end: '\\1',
				name: "string.quoted.multiline.coffeescript",
				patterns: [
					{
						begin: "#{",
						end: "}",
						name: "string.interpolated.coffeescript",
						patterns: [
							{include: "#comment_block"},
							{include: "#embedded_js"},
							{include: "#comment_singleLine"},
							{include: "#heregex"},
							{include: "#regex"},
							{include: "orion.lib#string_singleQuote"},
							{include: "orion.lib#number_decimal"},
							{include: "#reserved_words"},
							{include: "#keyword_control"},
							{include: "#keyword_operator"},
							{include: "#language_variable"},
							{include: "#constant"},
							{include: "#punctuation"},
							{include: "orion.lib#brace_open"},
							{include: "orion.lib#brace_close"},
							{include: "orion.lib#bracket_open"},
							{include: "orion.lib#bracket_close"},
							{include: "orion.lib#parenthesis_open"},
							{include: "orion.lib#parenthesis_close"}
						]
					}
				]
			},
		}
	});

	return {
		id: grammars[grammars.length - 1].id,
		grammars: grammars,
		keywords: controlKeywords.concat(constants)
	};
});
