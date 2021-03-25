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
define("orion/editor/stylers/text_x-swift/syntax", ["orion/editor/stylers/lib/syntax"], function(mLib) {
	var keywords = [
		"associativity", "as",
		"class", "convenience",
		"deinit", "didSet", "dynamicType", "dynamic",
		"enum", "extension",
		"final", "func",
		"get",
		"import", "infix", "init", "inout", "internal", "in", "is",
		"lazy", "left", "let",
		"mutating",
		"none", "nonmutating",
		"operator", "optional", "override",
		"postfix", "precedence", "prefix", "private", "protocol", "Protocol", "public",
		"required", "right",
		"Self", "set", "static", "struct", "subscript",
		"typealias", "Type",
		"unowned",
		"var",
		"weak", "willSet",
		"@objc"
	];
	var controlKeywords = [
		"break",
		"case", "continue",
		"default", "do",
		"else",
		"fallthrough", "for",
		"if",
		"return",
		"switch",
		"where", "while"
	];
	var constants = [
		"false", "nil", "true"
	];
	var languageVars1 = [
		"self", "super"
	];
	var languageVars2 = [
		"__COLUMN__", "__FILE__", "__FUNCTION__", "__LINE__"
	];

	var grammars = [];
	grammars.push.apply(grammars, mLib.grammars);
	grammars.push({
		id: "orion.swift",
		contentTypes: ["text/x-swift"],
		patterns: [
			{include: "#string_doubleQuote"},
			{include: "orion.c-like#comment_singleLine"},
			{include: "#comment_block"},
			{include: "orion.lib#brace_open"},
			{include: "orion.lib#brace_close"},
			{include: "orion.lib#bracket_open"},
			{include: "orion.lib#bracket_close"},
			{include: "orion.lib#parenthesis_open"},
			{include: "orion.lib#parenthesis_close"},
			{include: "orion.lib#operator"},
			{include: "#number_binary"},
			{include: "#number_hex"},
			{include: "#number_octal"},
			{include: "#number_decimal"},
			{include: "#keywords_operator"},
			{include: "#keywords_control"},
			{include: "#constants"},
			{include: "#languageVars1"},
			{include: "#languageVars2"},
		],
		repository: {
			comment_block: {
				begin: {match: "/\\*", literal: "/*"},
				end: {match: "\\*/", literal: "*/"}, 
				name: "comment.block.swift",
				patterns: [
					{include: "#comment_block"},
					{
						match: "(\\b)(TODO)(\\b)(((?!\\*/).)*)",
						name: "meta.annotation.task.todo",
						captures: {
							2: {name: "keyword.other.documentation.task.swift"},
							4: {name: "comment.block.swift"}
						}
					}
				]
			},
			constants: {
				match: "(^|[^\\w`])(" + constants.join("|") + ")\\b",
				captures: {
					2: {name: "constant.language.swift"}
				}
			},
			keywords_operator: {
				match: "(^|[^\\w`])(" + keywords.join("|") + ")\\b",
				captures: {
					2: {name: "keyword.operator.swift"}
				}
			},
			keywords_control: {
				match: "(^|[^\\w`])(" + controlKeywords.join("|") + ")\\b",
				captures: {
					2: {name: "keyword.control.swift"}
				}
			},
			languageVars1: {
				match: "(^|[^\\w`])(" + languageVars1.join("|") + ")\\b",
				captures: {
					2: {name: "variable.language.swift"}
				}
			},
			languageVars2: {
				match: "(^|[^\\w`])(" + languageVars2.join("|") + ")(?:$|[^\\w])",
				captures: {
					2: {name: "variable.language.swift"}
				}
			},
			number_binary: {
				match: "\\b0b[01]+\\b",
				name: "constant.numeric.binary.swift"
			},
			number_decimal: {
				match: "\\b-?(?:\\.\\d[\\d_]*|\\d[\\d_]*\\.?[\\d_]*)(?:[eE][+-]?\\d[\\d_]*)?\\b",
				name: "constant.numeric.decimal.swift"
			},
			number_hex: {
				match: "\\b0[xX](?:\\.[0-9A-Fa-f][0-9A-Fa-f_]*|[0-9A-Fa-f][0-9A-Fa-f_]*\\.?[0-9A-Fa-f_]*)(?:[pP][+-]?\\d[\\d_]*)?\\b",
				name: "constant.numeric.hex.swift"
			},
			number_octal: {
				match: "\\b0o[01234567][01234567_]*\\b",
				name: "constant.numeric.octal.swift"
			},
			segment: {
				begin: "\\(",
				end: "\\)",
				patterns: [
					{include: "#segment"},
					{include: "#comment_block"},
					{include: "#number_binary"},
					{include: "#number_hex"},
					{include: "#number_octal"},
					{include: "#number_decimal"},
					{include: "#keywords_operator"},
					{include: "#keywords_control"},
					{include: "#constants"},
					{include: "#languageVars1"},
					{include: "#languageVars2"}
				]
			},
			string_doubleQuote: {
				match: '"(?:\\\\.|[^"])*"?',
				name: "string.quoted.double.swift",
				patterns: [
					{
						begin: "\\\\\\(",
						end: "\\)",
						name: "string.interpolated.swift",
						patterns: [
							{include: "#segment"},
							{include: "#comment_block"},
							{include: "#number_binary"},
							{include: "#number_hex"},
							{include: "#number_octal"},
							{include: "#number_decimal"},
							{include: "#keywords_operator"},
							{include: "#keywords_control"},
							{include: "#constants"},
							{include: "#languageVars1"},
							{include: "#languageVars2"}
						]
					}
				]
			}
		}
	});

	return {
		id: grammars[grammars.length - 1].id,
		grammars: grammars,
		keywords: keywords.concat(controlKeywords).concat(constants).concat(languageVars1).concat(languageVars2)
	};
});
