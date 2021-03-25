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
define("orion/editor/stylers/application_xquery/syntax", ["orion/editor/stylers/lib/syntax"], function(mLib) {
	var keywords = [
		"zero-digit",
		"xquery",
		"window", "where", "when",
		"version", "variable", "validate",
		"unordered", "union",
		"typeswitch", "type", "tumbling", "try",
		"treat", "to", "then", "text",
		"switch","strip", "strict", "start", "stable", "some",
		"sliding", "self", "schema-element", "schema-attribute", "schema", "satisfies",
		"return",
		"processing-instruction", "previous", "preserve", "preceding-sibling",
		"preceding", "percent", "per-mille", "pattern-separator", "parent",
		"ordering", "order", "or", "option", "only", "of",
		"node", "no-preserve", "no-inherit", "next",
		"ne", "NaN", "namespace-node", "namespace",
		"module", "mod", "minus-sign",
		"lt", "let", "least", "le", "lax",
		"item", "is", "intersect", "instance", "inherit",
		"infinity", "in", "import", "if", "idiv",
		"gt", "grouping-separator", "group", "greatest", "ge",
		"function", "for", "following-sibling", "following",
		"external", "except", "every", "eq", "end",
		"encoding", "empty-sequence", "empty", "else", "element",
		"document-node", "div", "digit", "descending", "descendant-or-self",
		"descendant", "default", "declare", "decimal-separator", "decimal-format",
		"count", "copy-namespaces", "context", "construction", "comment",
		"collation", "child", "catch", "castable", "cast", "case",
		"by", "boundary-space", "base-uri",
		"attribute", "at", "ascending", "as",
		"and", "ancestor-or-self", "ancestor", "allowing"
	];

	var grammars = [];
	grammars.push.apply(grammars, mLib.grammars);
	grammars.push({
		id: "orion.xquery",
		contentTypes: ["application/xquery"],
		patterns: [
			{include: "#comment"},
			{include: "#variable"},
			{include: "#multiLineDoubleQuote"}, 
			{include: "#multiLineSingleQuote"}, 
			{include: "orion.xml#tag"}, 
			{include: "orion.lib#brace_open"},
			{include: "orion.lib#brace_close"},
			{include: "orion.lib#bracket_open"},
			{include: "orion.lib#bracket_close"},
			{include: "orion.lib#parenthesis_open"},
			{include: "orion.lib#parenthesis_close"},
			{
				match: "\\b(?:" + keywords.join("|") + ")\\b",
				name: "keyword.operator.js"
			}
		],
		repository: {
			comment: {
				begin: {match: "\\(:", literal: "(:"},
				end: {match: ":\\)", literal: ":)"}, 
				name: "comment.block.xquery",
				patterns: [
					{
						match: "(\\b)(TODO)(\\b)(((?!:\\)).)*)", // match: "(\\b)(TODO)(\\b)(((?!-->).)*)",
						name: "meta.annotation.task.todo",
						captures: {
							2: {name: "keyword.other.documentation.task"},
							4: {name: "comment.block"}
						}
					}
				]
			},
			variable: {
				match: "\\$[a-zA-z0-9_]+",
				name: "variable.other.xquery" 
			},
			multiLineDoubleQuote: {
				begin: "\"",
				end: "\"",
				name: "string.quoted.double"
			},
			multiLineSingleQuote: {
				begin: "\'",
				end: "\'",
				name: "string.quoted.single"
			}
		}

	});
	return {
		id: grammars[grammars.length - 1].id,
		grammars: grammars,
		keywords: keywords
	};
});
