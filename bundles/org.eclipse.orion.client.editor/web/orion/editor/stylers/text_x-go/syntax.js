/*******************************************************************************
 * @license
 * Copyright (c) 2014 IBM Corporation and others.
 * All rights reserved. This program and the accompanying materials are made 
 * available under the terms of the Eclipse Public License 2.0 
 * (http://www.eclipse.org/legal/epl-v10.html), and the Eclipse Distribution 
 * License v1.0 (http://www.eclipse.org/org/documents/edl-v10/.html). 
 * 
 * Contributors: IBM Corporation - initial API and implementation
 ******************************************************************************/

/*eslint-env browser, amd*/
define("orion/editor/stylers/text_x-go/syntax", ["orion/editor/stylers/lib/syntax"], function(mLib) {
	var keywords = [
		"break",
		"case", "const", "continue",
		"default", "defer",
		"else",
		"fallthrough", "false", "for", "func",
		"goto", "go",
		"if", "import",
		"nil",
		"package",
		"range", "return",
		"select", "switch",
		"true", "type",
		"var"
	];

	var grammars = [];
	grammars.push.apply(grammars, mLib.grammars);
	grammars.push({
		id: "orion.go",
		contentTypes: ["text/x-go"],
		patterns: [
			{include: "orion.lib#string_doubleQuote"},
			{include: "orion.lib#string_singleQuote"},
			{
				begin: "`",
				end: "`",
				name: "string.quoted.raw.go",
			},
			{include: "orion.c-like#comment_singleLine"},
			{include: "orion.c-like#comment_block"},
			{include: "orion.lib#brace_open"},
			{include: "orion.lib#brace_close"},
			{include: "orion.lib#bracket_open"},
			{include: "orion.lib#bracket_close"},
			{include: "orion.lib#parenthesis_open"},
			{include: "orion.lib#parenthesis_close"},
			{include: "orion.lib#operator"},
			{include: "orion.lib#number_decimal"},
			{include: "orion.lib#number_hex"},
			{
				match: "\\b(?:" + keywords.join("|") + ")\\b",
				name: "keyword.operator.go"
			},
			{
				match: "\\b(?:len|cap|new|make|append|close|copy|delete|complex|real|imag|panic|recover)\\b",
				name: "support.function.go"
			},
			{
				match: "\\b(?:bool|chan|uint8|uint16|uint32|uint64|int8|int16|int32|int64|float32|float64|complex64|complex128|byte|map|rune|uint|interface|int|uintptr|string|struct|error)\\b",
				name: "support.function.type"
			}
		]
	});
	return {
		id: grammars[grammars.length - 1].id,
		grammars: grammars,
		keywords: keywords
	};
});
