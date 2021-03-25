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
define("orion/editor/stylers/text_x-ruby/syntax", ["orion/editor/stylers/lib/syntax"], function(mLib) {
	var keywords = [
		"alias_method", "alias", "attr_accessor", "attr_reader", "attr_writer", "attr",
		"BEGIN",
		"class",
		"defined?", "def",
		"END", "extend",
		"gem",
		"include", "initialize", "in",
		"load",  "lambda",
		"module_function", "module",
		"new", "not",
		"public", "prepend", "private", "protected",
		"require_relative", "require",
		"undef",
		"__ENCODING__", "__END__", "__FILE__", "__LINE__"
	];
	var controlKeywords = [
		"and",
		"begin", "break",
		"case", "catch",
		"do",
		"else", "elsif", "end", "ensure",
		"fail", "for",
		"if",
		"loop",
		"next",
		"or",
		"raise", "redo", "rescue", "retry", "return",
		"then", "throw",
		"unless", "until",
		"when", "while",
		"yield"
	];
	var constants = [
		"false", "nil", "true"
	];
	var languageVariables = ["self", "super"];

	var grammars = [];
	grammars.push.apply(grammars, mLib.grammars);
	grammars.push({
		id: "orion.ruby",
		contentTypes: ["text/x-ruby"],
		patterns: [
			{include: "orion.lib#string_doubleQuote"},
			{include: "orion.lib#string_singleQuote"},
			{include: "#symbol_quoted_single"},
			{include: "#symbol_quoted_double"},
			{include: "#symbol"},
			{include: "#classRef"},
			{
				match: "/(?![\\s])(?:\\\\.|[^/])+/(?:[ioxmuesn]\\b)?",
				name: "string.regexp.ruby"
			}, {
				match: {match: "#.*", literal: "#"},
				name: "comment.line.number-sign.ruby",
				patterns: [
					{include: "orion.lib#todo_comment_singleLine"}
				]
			}, {
				begin: {match: "^=begin\\b", literal: "\n=begin "},
				end: {match: "^=end\\b", literal: "\n=end "},
				name: "comment.block.ruby",
				patterns: [
					{
						match: "(\\b)(TODO)(\\b)(((?!\\*/).)*)",
						name: "meta.annotation.task.todo",
						captures: {
							2: {name: "keyword.other.documentation.task"},
							4: {name: "comment.block"}
						}
					}
				]
			},
			{include: "orion.lib#brace_open"},
			{include: "orion.lib#brace_close"},
			{include: "orion.lib#bracket_open"},
			{include: "orion.lib#bracket_close"},
			{include: "orion.lib#parenthesis_open"},
			{include: "orion.lib#parenthesis_close"},
			{include: "orion.lib#operator"},
			{include: "orion.lib#number_decimal"},
			{include: "orion.lib#number_hex"},
			{include: "#variable"},
			{
				match: "\\b0[bB][01]+\\b",
				name: "constant.numeric.binary.ruby"
			},
			{
				match: "\\b(?:" + keywords.join("|") + ")\\b",
				name: "keyword.operator.ruby"
			},
			{
				match: "\\b(?:" + controlKeywords.join("|") + ")\\b",
				name: "keyword.control.ruby"
			},
			{
				match: "\\b(?:" + constants.join("|") + ")\\b",
				name: "constant.language.ruby"
			},
			{
				match: "\\b(?:" + languageVariables.join("|") + ")\\b",
				name: "variable.language.ruby"
			}
		],
		repository: {
			classRef: {
				match: "\\w+::\\w+"
			},
			symbol: {
				match: ":\\w+",
				name: "entity.name.symbol.ruby"
			},
			symbol_quoted_single: {
				match: ":'[^']*'",
				name: "entity.name.symbol.quoted.single.ruby"
			},
			symbol_quoted_double: {
				match: ':"[^"]*"',
				name: "entity.name.symbol.quoted.double.ruby"
			},
			variable: {
				match: "@\\w+",
				name: "entity.name.variable.ruby"
			}
		}
	});
	return {
		id: grammars[grammars.length - 1].id,
		grammars: grammars,
		keywords: keywords.concat(controlKeywords).concat(constants).concat(languageVariables)
	};
});
