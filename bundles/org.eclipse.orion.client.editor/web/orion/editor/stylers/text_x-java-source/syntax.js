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
define("orion/editor/stylers/text_x-java-source/syntax", ["orion/editor/stylers/lib/syntax"], function(mLib) {
	var keywords = [
		"abstract",
		"boolean", "byte",
		"char", "class",
		"double",
		"extends",
		"final", "float",
		"implements", "import", "instanceof", "int", "interface",
		"long",
		"native", "new",
		"package", "private", "protected", "public",
		"short", "static", "synchronized",
		"throws", "transient",
		"void", "volatile"
	];
	var controlKeywords = [
		"break",
		"case", "catch", "continue",
		"default", "do",
		"else",
		"finally", "for",
		"if",
		"return",
		"switch",
		"throw", "try",
		"while"
	];
	var constants = [
		"false", "null", "true"
	];
	var languageVariables = ["this", "super"];

	var grammars = [];
	grammars.push.apply(grammars, mLib.grammars);
	grammars.push({
		id: "orion.java",
		contentTypes: ["text/x-java-source"],
		patterns: [
			{include: "orion.lib#string_doubleQuote"},
			{include: "orion.lib#string_singleQuote"},
			{include: "orion.c-like#comment_singleLine"},
			{include: "orion.lib#doc_block"},
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
				name: "keyword.operator.java"
			},
			{
				match: "\\b(?:" + controlKeywords.join("|") + ")\\b",
				name: "keyword.control.java"
			},
			{
				match: "\\b(?:" + constants.join("|") + ")\\b",
				name: "constant.language.java"
			},
			{
				match: "\\b(?:" + languageVariables.join("|") + ")\\b",
				name: "variable.language.java"
			}
		]
	});
	return {
		id: grammars[grammars.length - 1].id,
		grammars: grammars,
		keywords: keywords.concat(controlKeywords).concat(constants).concat(languageVariables)
	};
});
