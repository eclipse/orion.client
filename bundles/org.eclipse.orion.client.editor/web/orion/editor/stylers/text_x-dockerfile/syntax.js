/*******************************************************************************
 * @license
 * Copyright (c) 2014, 2017 IBM Corporation and others.
 * All rights reserved. This program and the accompanying materials are made
 * available under the terms of the Eclipse Public License 2.0
 * (http://www.eclipse.org/legal/epl-v10.html), and the Eclipse Distribution
 * License v1.0 (http://www.eclipse.org/org/documents/edl-v10.html).
 *
 * Contributors: IBM Corporation - initial API and implementation
 ******************************************************************************/

/*eslint-env browser, amd*/
define("orion/editor/stylers/text_x-dockerfile/syntax", ["orion/editor/stylers/lib/syntax"], function(mLib) {
	var keywords = [
		"ADD", "ARG",
		"CMD", "COPY",
		"ENTRYPOINT", "ENV", "EXPOSE",
		"FROM",
		"HEALTHCHECK",
		"LABEL",
		"MAINTAINER",
		"ONBUILD",
		"RUN",
		"SHELL",
		"STOPSIGNAL",
		"USER",
		"VOLUME",
		"WORKDIR"
	];

	var id = "orion.dockerfile";
	var grammars = [];
	grammars.push.apply(grammars, mLib.grammars);
	grammars.push({
		id: id,
		contentTypes: ["text/x-dockerfile"],
		patterns: [
			{include: "orion.lib#string_doubleQuote"},
			{include: "#numberSignComment"},
			{
				match: "\\b-?[0-9]+(\\.[0-9]+)?\\b",
				name: "constant.numeric.dockerfile"
			}, {
				match: "(?i)^\\s*(?:" + keywords.join("|") + ")\\b",
				name: "keyword.operator.dockerfile"
			}
		],
		repository: {
			numberSignComment: {
				begin: {match: "^\\s*#", literal: "#"},
				end: {match: "$", literal: ""},
				name: "comment.line.number-sign.dockerfile",
				patterns: [
					{include: "orion.lib#todo_comment_singleLine"}
				]
			}
		}
	});

	return {
		id: id,
		grammars: grammars,
		keywords: keywords
	};
});
