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
define("orion/editor/stylers/text_x-php/syntax", ["orion/editor/stylers/lib/syntax"], function(mLib) {
	var keywords = [
		"abstract", "and", "array", "as",
		"callable", "class", "clone", "const",
		"declare",
		"echo", "empty", "eval", "extends",
		"final", "function",
		"global",
		"implements", "include", "include_once", "insteadof", "interface", "instanceof", "isset",
		"list",
		"namespace", "new",
		"or",
		"parent", "print", "private", "protected", "public",
		"require", "require_once",
		"static",
		"trait",
		"unset", "use",
		"var",
		"xor",
		"__halt_compiler", "__CLASS__", "__DIR__", "__FILE__", "__FUNCTION__",
		"__LINE__", "__METHOD__", "__NAMESPACE__", "__TRAIT__"
	];
	var controlKeywords = [
		"break",
		"case", "catch", "continue",
		"default", "die", "do",
		"else", "elseif", "enddeclare", "endfor", "endforeach", "endif", "endswitch", "endwhile", "exit",
		"finally", "for", "foreach",
		"goto",
		"if",
		"return",
		"switch",
		"throw", "try",
		"while",
		"yield"
	];
	var constants = [
		"false", "FALSE", "null", "NULL", "true", "TRUE"
	];
	var languageVariables = ["self"];

	var grammars = [];
	grammars.push.apply(grammars, mLib.grammars);
	grammars.push({
		id: "orion.php-core",
		patterns: [
			{include: "orion.lib#string_doubleQuote"},
			{include: "orion.lib#string_singleQuote"},
			{include: "orion.c-like#comment_singleLine"},
			{include: "orion.lib#doc_block"},
			{include: "orion.c-like#comment_block"},
			{
				match: {match: "(#).*", literal: "#"},
				name: "comment.line.number-sign.php",
				captures: {
					1: {name: "comment.line.number-sign.start.php"}
				},
				patterns: [
					{include: "orion.lib#todo_comment_singleLine"}
				]
			}, {
				begin: "<<<(\\w+)$",
				end: "^\\1;$",
				name: "string.unquoted.heredoc.php"
			}, {
				begin: "<<<'(\\w+)'$",
				end: "^\\1;$",
				name: "string.unquoted.heredoc.nowdoc.php"
			},
			{include: "orion.lib#brace_open"},
			{include: "orion.lib#brace_close"},
			{include: "orion.lib#bracket_open"},
			{include: "orion.lib#bracket_close"},
			{include: "orion.lib#parenthesis_open"},
			{include: "orion.lib#parenthesis_close"},
			{include: "orion.lib#operator"},
			{
				match: "\\b0[bB][01]+\\b",
				name: "constant.numeric.binary.php"
			},
			{include: "orion.lib#number_decimal"},
			{include: "orion.lib#number_hex"},
			{
				match: "\\b(?:" + keywords.join("|") + ")\\b",
				name: "keyword.operator.php"
			},
			{
				match: "\\b(?:" + controlKeywords.join("|") + ")\\b",
				name: "keyword.control.php"
			},
			{
				match: "\\b(?:" + constants.join("|") + ")\\b",
				name: "constant.language.php"
			},
			{
				match: "\\b(?:" + languageVariables.join("|") + ")\\b",
				name: "variable.language.php"
			}
		]
	});
	
	grammars.push({
		id: "orion.php",
		contentTypes: ["text/x-php"],
		patterns: [
			{
				begin: "(?i)<(\\?|%(?!php))(?:=|php(?:\\s|$))?",
				end: "[\\1]>",
				captures: {
					0: {name: "entity.name.declaration.php"}
				},
				contentName: "source.php.embedded",
				patterns: [
					{include: "orion.php-core"}
				]
			}, {
				include: "orion.html"
			}
		]
	});

	return {
		id: grammars[grammars.length - 1].id,
		grammars: grammars,
		keywords: keywords.concat(controlKeywords).concat(constants).concat(languageVariables)
	};
});
