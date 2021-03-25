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
define("orion/editor/stylers/text_x-csharp/syntax", ["orion/editor/stylers/lib/syntax"], function(mLib) {
	var keywords = [
		"abstract", "as",
		"base", "bool", "break", "byte", "by",
		"case", "catch", "char", "checked", "class", "const", "continue",
		"decimal", "default", "delegate", "descending", "double", "do",
		"else", "enum", "event", "explicit", "extern",
		"false", "finally", "fixed", "float", "foreach", "for", "from",
		"goto", "group",
		"if", "implicit", "int", "interface", "internal", "into", "in", "is",
		"lock", "long",
		"namespace", "new", "null",
		"object", "operator", "orderby", "out", "override",
		"params", "private", "protected", "public",
		"readonly", "ref", "return",
		"sbyte", "sealed", "select", "short", "sizeof", "stackalloc", "static", "string", "struct", "switch", 
		"this", "throw", "true", "try", "typeof",
		"uint", "ulong", "unchecked", "unsafe", "ushort", "using",
		"var", "virtual", "volatile", "void",
		"while", "where",
		"yield"
	];

	var preprocessorDirectives = [
		"define",
		"elif", "else", "endif", "endregion", "error",
		"if",
		"line",
		"pragma checksum", "pragma warning", "pragma",
		"region",
		"undef",
		"warning"
	];

	var grammars = [];
	grammars.push.apply(grammars, mLib.grammars);
	grammars.push({
		id: "orion.csharp",
		contentTypes: ["text/x-csharp"],
		patterns: [
			{
				match: "^\\s*#(?:" + preprocessorDirectives.join("|") + ")\\b[^$]*",
				name: "meta.preprocessor.csharp"
			},
			{include: "#string_verbatim"},
			{include: "orion.lib#string_doubleQuote"},
			{include: "orion.lib#string_singleQuote"},
			{include: "#doc_line"},
			{include: "orion.c-like#comment_singleLine"},
			{include: "#doc_block"},
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
				name: "keyword.operator.csharp"
			}
		],
		repository: {
			doc_block: {
				begin: "/\\*\\*",
				end: "\\*/",
				name: "comment.block.documentation.csharp",
				patterns: [
					{
						match: "<[^\\s>]*>",
						name: "meta.documentation.tag"
					}, {
						match: "(\\b)(TODO)(\\b)(((?!\\*/).)*)",
						name: "meta.annotation.task.todo",
						captures: {
							2: {name: "keyword.other.documentation.task"},
							4: {name: "comment.block"}
						}
					}
				]
			},
			doc_line: {
				match: "// /.*",
				name: "comment.line.documentation.csharp",
				patterns: [
					{
						match: "<[^\\s>]*>",
						name: "meta.documentation.tag"
					}, {
						include: "orion.lib#todo_comment_singleLine"
					}
				]
			},
			string_verbatim: {
				begin: '@"',
				end: '^(?:""|[^"])*"(?!")',
				name: "string.quoted.verbatim.csharp",
			}
		}
	});
	return {
		id: grammars[grammars.length - 1].id,
		grammars: grammars,
		keywords: keywords
	};
});
