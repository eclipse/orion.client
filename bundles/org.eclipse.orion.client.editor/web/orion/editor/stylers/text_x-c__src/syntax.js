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
define("orion/editor/stylers/text_x-c__src/syntax", ["orion/editor/stylers/lib/syntax"], function(mLib) {
	var keywords = [
		"alignas", "alignof", "asm", "and_eq", "and", "auto",
		"bitand", "bitor", "bool", "break",
		"case", "catch", "char16_t", "char32_t", "char", "class",
		"compl", "constexpr", "const_cast", "const", "continue",
		"decltype", "default", "delete", "double", "do", "dynamic_cast",
		"else", "enum", "explicit", "export", "extern",
		"false", "float", "for", "friend",
		"goto",
		"if", "inline", "int",
		"long",
		"mutable",
		"namespace", "new", "noexcept", "not_eq", "not", "nullptr",
		"operator", "or_eq", "or",
		"private", "protected", "public",
		"register", "reinterpret_cast", "return",
		"short", "signed", "sizeof", "static_assert",
		"static_cast", "static", "struct", "switch",
		"template", "this", "thread_local", "throw", "true",
		"try", "typedef", "typeid", "typename",
		"union", "unsigned", "using",
		"virtual", "void", "volatile",
		"wchar_t", "while",
		"xor_eq", "xor",
		"_Bool", "_Complex", "_Imaginary"
	];

	var directives = [
		"define", "elif", "else", "endif", "error", "ifdef",
		"ifndef", "if", "include", "line", "pragma", "undef"
	];

	var grammars = [];
	grammars.push.apply(grammars, mLib.grammars);
	grammars.push({
		id: "orion.cpp",
		contentTypes: ["text/x-c++src", "text/x-c++"],
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
				name: "keyword.operator.cpp"
			}
		],
		repository: {
			directive: {
				match: "#\\s*(?:" + directives.join("|") + ")\\b[^$]*",
				name: "meta.preprocessor.cpp"
			}
		}
	});
	return {
		id: grammars[grammars.length - 1].id,
		grammars: grammars,
		keywords: keywords
	};
});
