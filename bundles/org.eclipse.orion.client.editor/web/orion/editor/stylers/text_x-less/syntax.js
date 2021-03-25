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
define("orion/editor/stylers/text_x-less/syntax", ["orion/editor/stylers/text_css/syntax", "orion/editor/stylers/lib/syntax"], function(mCSS, mLib) {
	var flags = ["important"];
	var constants = ["true"];
	var directives = ["arguments"];
	var keywords = ["all", "and", "not", "when"];
	var importKeywords = [
		"css",
		"inline",
		"less",
		"multiple",
		"once", "optional",
		"reference"
	];

	var grammars = [];
	grammars.push.apply(grammars, mCSS.grammars);
	grammars.push.apply(grammars, mLib.grammars);
	grammars.push({
		id: "orion.less",
		contentTypes: ["text/x-less"],
		patterns: [
			{include: "orion.css#string_single_multiline"},
			{include: "orion.css#string_double_multiline"},
			{include: "orion.c-like#comment_block"},
			{include: "#string_doubleQuote"},
			{include: "#string_singleQuote"},
			{include: "orion.c-like#comment_singleLine"},
			{include: "#importDirective"},
			{include: "orion.css#directive"},
			{include: "#directive"},
			{include: "#variable"},
			{include: "#interpolated"},
			{include: "#constant"},
			{include: "#flag"},
			{include: "#operator"},
			{include: "#keyword"},
			{include: "orion.lib#brace_open"},
			{include: "orion.lib#brace_close"},
			{include: "orion.lib#bracket_open"},
			{include: "orion.lib#bracket_close"},
			{include: "orion.lib#parenthesis_open"},
			{include: "orion.lib#parenthesis_close"},
			{include: "orion.lib#number_decimal"},
			{include: "orion.css#number_hex"},
			{include: "orion.css#numeric_value"},
			{include: "orion.css#color"},
			{include: "orion.css#keyword"}
		],
		repository: {
			constant: {
				match: "\\b(?:" + constants.join("|") + ")\\b",
				name: "constant.language.less"
			},
			directive: {
				match: "(^|\\s)(@("  + directives.join("|") + "))\\b",
				captures: {
					2: {name: "keyword.other.directive.less"}
				}
			},
			flag: {
				match: "(^|\\s)(!("  + flags.join("|") + "))\\b",
				captures: {
					2: {name: "keyword.other.flag.less"}
				}
			},
			importDirective: {
				begin: "(@import)\\s*\\(",
				end: "\\)",
				beginCaptures: {
					1: {name: "keyword.other.directive.less"}
				},
				patterns: [{
					match: "\\b(?:" + importKeywords.join("|") + ")\\b",
					name: "keyword.operator.less"
				}]
			},
			interpolated: {
				match: "@\\{[^}]*\\}",
				name: "string.interpolated.less"
			},
			keyword: {
				match: "\\b(?:" + keywords.join("|") + ")\\b",
				name: "keyword.operator.less"
			},
			operator: {
				match: "\\+_?|\\*|\\/|=|>=?|<=?|&",
				name: "punctuation.operator.less"
			},
			string_doubleQuote: {
				match: '~?"(?:\\\\.|[^"])*"?',
				name: "string.quoted.double"
			},
			string_singleQuote: {
				match: "~?'(?:\\\\.|[^'])*'?",
				name: "string.quoted.single"
			},
			variable: {
				match: "@[\\w-]+(\\.{3})?",
				name: "variable.other.less"
			}
		}
	});
	return {
		id: grammars[grammars.length - 1].id,
		grammars: grammars,
		keywords: directives.concat(flags).concat(importKeywords).concat(keywords)
	};
});
