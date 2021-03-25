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
define("orion/editor/stylers/text_x-python/syntax", ["orion/editor/stylers/lib/syntax"], function(mLib) {
	var keywords = [
		"and", "as", "assert",
		"break",
		"class", "continue",
		"def", "del",
		"exec", "elif", "else", "except", "Ellipsis",
		"False", "finally", "for", "from",
		"global",
		"if", "import", "in", "is",
		"lambda",
		"not", "None", "NotImplemented",
		"or",
		"pass", "print",
		"raise", "return",
		"try", "True",
		"while", "with",
		"yield"
	];

	var grammars = [];
	grammars.push.apply(grammars, mLib.grammars);
	grammars.push({
		id: "orion.python",
		contentTypes: ["text/x-python"],
		patterns: [
			{
				begin: "(['\"])\\1\\1",
				end: "\\1\\1\\1",
				name: "string.quoted.triple.python"
			}, 
			{include: "orion.lib#string_doubleQuote"},
			{include: "orion.lib#string_singleQuote"},
			{
				begin: {match: "#", literal: "#"},
				end: {match: "$", literal: ""},
				name: "comment.line.number-sign.python",
				patterns: [
					{
						include: "orion.lib#todo_comment_singleLine"
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
			{include: "#number_decimal"},
			{include: "orion.lib#number_hex"}, 
			{
				match: "\\b(?:" + keywords.join("|") + ")\\b",
				name: "keyword.operator.python"
			}
		],
		repository: {
			number_decimal: {
				match: "\\b-?(?:\\.\\d+|\\d+\\.?\\d*)[lL]?\\b",
				name: "constant.numeric.number.python"
			}
		}
	});
	return {
		id: grammars[grammars.length - 1].id,
		grammars: grammars,
		keywords: keywords
	};
});
