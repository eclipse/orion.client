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
define("orion/editor/stylers/text_x-lua/syntax", ["orion/editor/stylers/lib/syntax"], function(mLib) {
	// from http://www.lua.org/ftp/refman-5.0.pdf
	var keywords = [
		"and",
		"break",
		"do",
		"else", "elseif", "end",
		"false", "for", "function",
		"if", "in",
		"local",
		"nil", "not",
		"or",
		"repeat", "return",
		"then", "true",
		"until",
		"while",
	];

	// base library functions and variables
	// from http://lua-users.org/files/wiki_insecure/users/thomasl/luarefv51.pdf
	var base_functions = [
		"assert", "arg",
		"collectgarbage",
		"dofile",
		"error",
		"getfenv", "getmetatable",
		"ipairs",
		"load", "loadfile", "loadstring",
		"next",
		"pairs", "pcall", "print",
		"rawequal", "rawget", "rawset", "require",
		"select", "setfenv", "setmetatable",
		"tonumber", "tostring", "type",
		"unpack",
		"xpcall"
	];
	var base_variables = [
		"_G",
		"LUA_INIT", "LUA_PATH", "LUA_CPATH",
		"_VERSION"
	];

	var grammars = [];
	grammars.push.apply(grammars, mLib.grammars);
	grammars.push({
		id: "orion.lua",
		contentTypes: ["text/x-luasrc", "text/x-lua"],
		patterns: [
			{include: "orion.lib#string_doubleQuote"},
			{include: "orion.lib#string_singleQuote"},
			{include: "orion.c-like#comment_singleLine"},
			{include: "#comment_block_dash_dash"},
			{include: "#comment_singleLine_dash_dash"},
			{include: "orion.lib#brace_open"},
			{include: "orion.lib#brace_close"},
			{include: "orion.lib#bracket_open"},
			{include: "orion.lib#bracket_close"},
			{include: "orion.lib#parenthesis_open"},
			{include: "orion.lib#parenthesis_close"},
			{include: "orion.lib#operator"},
			{include: "orion.lib#number_decimal"},
			{include: "orion.lib#number_hex"},
			{include: "#base_functions"},
			{include: "#base_variables"},
			{include: "#reserved_underscore_capital"},
			{
				match: "\\b(?:" + keywords.join("|") + ")\\b",
				name: "keyword.operator.lua"
			}
		],
		repository: {
			comment_block_dash_dash: {
				begin: {match: "--\\[\\[", literal: "--[["},
				end: {match: "\\]\\]", literal: "]]"},
				name: "comment.block.dash-dash.lua",
				patterns: [
					{
						match: "(\\b)(TODO)(\\b)(((?!\\]\\]).)*)",
						name: "meta.annotation.task.todo",
						captures: {
							2: {name: "keyword.other.documentation.task"},
							4: {name: "comment.block"}
						}
					}
				]
			},
			comment_singleLine_dash_dash: {
				begin: {match: "--", literal: "--"},
				end: {match: "$", literal: ""},
				name: "comment.line.dash-dash.lua",
				patterns: [
					{
						include: "orion.lib#todo_comment_singleLine"
					}
				]
			},
			base_functions: {
				match: "\\b(?:" + base_functions.join("|") + ")\\b",
				name: "support.function.lua"
			},
			base_variables: {
				match: "\\b(?:" + base_variables.join("|") + ")\\b",
				name: "support.variable.lua"
			},
			// _ANYCAPITALS is reserved in Lua
			reserved_underscore_capital: {
				match: "\\b_[A-Z]*\\b",
				name: "constant.other.userdefined.lua"
			}
		}
	});
	return {
		id: grammars[grammars.length - 1].id,
		grammars: grammars,
		keywords: keywords
	};
});
