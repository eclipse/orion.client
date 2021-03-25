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
define("orion/editor/stylers/text_x-csrc/syntax", ["orion/editor/stylers/lib/syntax"], function(mLib) {
	var keywords = [
		"auto",
		"break",
		"case", "char", "const", "continue",
		"default", "double", "do",
		"else", "enum", "extern",
		"float", "for",
		"goto",
		"if", "inline", "int",
		"long",
		"register", "return",
		"short", "signed", "sizeof", "static", "struct", "switch",
		"typedef",
		"union", "unsigned",
		"void", "volatile",
		"while",
		"_Bool", "_Complex", "_Imaginary"
	];

	var directives = [
		"define", "elif", "else", "endif", "error", "ifdef",
		"ifndef", "if", "include", "line", "pragma", "undef"
	];

	var grammars = [];
	grammars.push.apply(grammars, mLib.grammars);
	grammars.push({
		id: "orion.c",
		contentTypes: ["text/x-csrc", "text/x-c"],
		patterns: [
			{include: "orion.lib#string_doubleQuote"},
			{include: "orion.lib#string_singleQuote"},
			{include: "orion.c-like#comment_singleLine"},
			{include: "orion.lib#doc_block"},
			{include: "orion.c-like#comment_block"},
			{include: "#directive"},
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
				name: "keyword.operator.c"
			}
		],
		repository: {
			directive: {
				match: "#\\s*(?:" + directives.join("|") + ")\\b[^$]*",
				name: "meta.preprocessor.c"
			}
		}
	});
	return {
		id: grammars[grammars.length - 1].id,
		grammars: grammars,
		keywords: keywords.concat(directives)
	};
});
