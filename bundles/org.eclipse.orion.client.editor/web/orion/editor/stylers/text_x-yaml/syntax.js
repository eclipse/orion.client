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
define("orion/editor/stylers/text_x-yaml/syntax", [], function() {
	var keywords = ["false", "null", "true"];
	var casts = ["!!bool", "!!float", "!!int", "!!map", "!!null", "!!omap", "!!seq", "!!str"];

	var id = "orion.yaml";
	var grammar = {
		id: id,
		contentTypes: ["text/x-yaml"],
		patterns: [
			{include: "#numberSignComment"},
			{
				match: "^%(?:YAML|TAG)\\s.*",
				name: "meta.directive.yaml"
			}, {
				begin: "^.*?:(?:[\\t ]|$)",
				end: "$",
				contentName: "string.unquoted.yaml",
				beginCaptures: {
					0: {
						name: "entity.name.key.yaml"
					}
				},
				patterns: [
					{include: "#numberSignComment"},
					{
						match: "^\\s*[&*]\\s*$",
						name: "entity.name.tag.yaml"
					}, {
						match: "(?i)^\\s*(?:" + keywords.join("|") + ")\\s*$",
						name: "keyword.operator.yaml"
					}, {
						match: "(?i)^\\s*(?:" + casts.join("|") + ")\\b",
						name: "keyword.operator.yaml"
					}, {
						match: "(?i)^\\s*(?:-?[0-9]*(?:\\.[0-9]+)?(?:e[-+][1-9][0-9]*)?)\\s*$",
						name: "constant.numeric.yaml"
					}, {
						match: "(?i)^\\s*(?:-?[1-9][0-9]*|0|-?\\.inf|\\.nan)\\s*$",
						name: "constant.numeric.yaml"
					}
				]
			}, {
				match: "---|\\.\\.\\.",
				name: "meta.separator.yaml"
			}
		],
		repository: {
			numberSignComment: {
				begin: {match: "(?:^|\\s+)#", literal: "#"},
				end: {match: "$", literal: ""},
				name: "comment.line.number-sign.yaml",
				patterns: [
					{include: "orion.lib#todo_comment_singleLine"}
				]
			}
		}
	};

	return {
		id: id,
		grammars: [grammar],
		keywords: casts.concat(keywords)
	};
});
