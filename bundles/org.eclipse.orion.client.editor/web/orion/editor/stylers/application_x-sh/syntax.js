/*******************************************************************************
 * @license
 * Copyright (c) 2016 IBM Corporation and others.
 * All rights reserved. This program and the accompanying materials are made
 * available under the terms of the Eclipse Public License 2.0
 * (http://www.eclipse.org/legal/epl-v10.html), and the Eclipse Distribution
 * License v1.0 (http://www.eclipse.org/org/documents/edl-v10.html).
 *
 * Contributors: IBM Corporation - initial API and implementation
 ******************************************************************************/

/*eslint-env browser, amd*/
define("orion/editor/stylers/application_x-sh/syntax", ["orion/editor/stylers/lib/syntax"], function(mLib) {
	var keywords = [
		"alias",
		"bg", "bind", "builtin",
		"caller", "command", "cd", "coproc",
		"declare", "dirs", "disown",
		"echo", "enable", "eval", "exec", "export",
		"fc", "fg",
		"getopts",
		"hash", "help", "history",
		"jobs",
		"kill",
		"let", "local", "logout",
		"mapfile",
		"popd", "printf", "pushd", "pwd",
		"readarray", "readonly", "read",
		"set", "shift", "shopt", "source", "suspend",
		"test", "times", "trap", "typeset", "type",
		"ulimit", "umask", "unalias", "unset",
		"wait"
	];
	var controlKeywords = [
		"break",
		"case", "continue",
		"done, do", 
		"elif", "else", "esac", "exit",
		"fi", "for",
		"if", "in",
		"return", 
		"select",
		"then",
		"until", "while"
	];

	var grammars = [];
	grammars.push.apply(grammars, mLib.grammars);
	grammars.push({
		id: "orion.bash",
		contentTypes: ["application/x-sh"],
		patterns: [
			{include: "#string_doubleQuote"},
			{include: "#string_singleQuote"},
			{include: "#comment"},
			{include: "#variable"},
			{include: "#keywordsControl"},
			{include: "#keywordsOperator"},
			{include: "orion.lib#number_decimal"},
			{include: "orion.lib#number_hex"},
			{include: "#operator"}
		],
		repository: {
			comment: {
				match: {match: "#.*", literal: "#"},
				name: "comment.line.number-sign.bash",
				patterns: [
					{
						include: "orion.lib#todo_comment_singleLine"
					}
				]
			},
			keywordsControl: {
				match: "\\b(?:" + controlKeywords.join("|") + ")\\b",
				name: "keyword.control.bash"
			},
			keywordsOperator: {
				match: "\\b(?:" + keywords.join("|") + ")\\b",
				name: "keyword.operator.bash"
			},
			operator: {
				match: "(\\+|-|!|~|\\*|\\/|%|=|>|<|&|\\^|\\||\\?|:|,|\\[|\\]|\\(|\\)|\\{|\\})+",
				name: "punctuation.operator.bash"
			},
			string_doubleQuote: {
				match: '\\$?"(?:\\\\.|[^"])*"?',
				name: "string.quoted.double.bash"
			},
			string_singleQuote: {
				match: "\\$?'[^']'",
				name: 'string.quoted.single.bash'
			},
			variable: {
				match: "\\$\\w+\\b",
				name: "variable.other.bash"
			}
		}
	});
	return {
		id: grammars[grammars.length - 1].id,
		grammars: grammars,
		keywords: keywords.concat(controlKeywords)
	};
});
