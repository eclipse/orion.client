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

define("orion/editor/stylers/text_x-smarty/syntax", ["orion/editor/stylers/lib/syntax", "orion/editor/stylers/text_html/syntax", "orion/editor/stylers/text_x-php/syntax"],
	function(mLib, mHTML, mPHP) {

	var constants = [
		"false", "no", "off", "on", "true", "yes"
	];

	/* these can be redefined in the file, this is not currently handled */
	var DELIMITER_OPEN = "{";
	var DELIMITER_CLOSE = "}";
	
	var grammars = [];
	grammars.push.apply(grammars, mLib.grammars);
	grammars.push.apply(grammars, mHTML.grammars);
	grammars.push.apply(grammars, mPHP.grammars);
	grammars.push({
		id: "orion.smarty",
		contentTypes: ["text/x-smarty"],
		patterns: [
			{include: "orion.html"},
			{include: "#smartyCommentBlock"},
			{include: "#literalBlock"},
			{include: "#phpBlock"},
			{include: "#smartyBlock"}
		],
		repository: {
			literalBlock: {
				begin: "({)literal(})",
				end: "({)/literal(})",
				captures: {
					1: "punctuation.brace.begin.smarty",
					2: "punctuation.brace.end.smarty"
				}
			},
			phpBlock: {
				begin: "({)php(})",
				end: "({)/php(})",
				captures: {
					1: "punctuation.brace.begin.smarty",
					2: "punctuation.brace.end.smarty"
				},
				contentName: "source.php.embedded.smarty",
				patterns: [
					{include: "orion.php-core"}
				]
			},
			smartyBlock: {
				begin: "(" + DELIMITER_OPEN + ")",
				end: "(" + DELIMITER_CLOSE + ")",
				captures: {
					1: "punctuation.brace.begin.smarty",
					2: "punctuation.brace.end.smarty"
				},
				patterns: [
					{include: "orion.lib#string_singleQuote"},
					{include: "#smartyString_doubleQuote"},
					{include: "#smartyVariable"},
					{include: "#smartyConfigVariable"},
					{include: "#smartyConstant"},
					{include: "orion.lib#number_decimal"},
				]
			},
			smartyCommentBlock: {
				begin: {match: DELIMITER_OPEN + "\\*", literal: DELIMITER_OPEN + "*"},
				end: {match: "\\*" + DELIMITER_CLOSE, literal: "*" + DELIMITER_CLOSE},
				name: "comment.block.smarty",
			},
			smartyConfigVariable: {
				match: "#\\w+#",
				name: "variable.other.config.smarty",
			},
			smartyConstant: {
				match: "\\b(?:" + constants.join("|") + ")\\b",
				name: "constant.language.smarty"
			},
			smartyEscapedVariable: {
				match: "`\\$[^`]+`",
				name: "variable.other.escaped.smarty",
			},
			smartyString_doubleQuote: {
				begin: '"',
				end: '"',
				name: "string.quoted.double.smarty",
				patterns: [
					{include: "#smartyEscapedVariable"},
					{include: "#smartyVariable"},
					{include: "#smartyConfigVariable"}
				]
			},
			smartyVariable: {
				match: "\\$(?:smarty\\.(?:config|server)\\.)?\\w+",
				name: "variable.other.smarty",
			}
		}
	});
	return {
		id: grammars[grammars.length - 1].id,
		grammars: grammars,
		keywords: []
	};
});
