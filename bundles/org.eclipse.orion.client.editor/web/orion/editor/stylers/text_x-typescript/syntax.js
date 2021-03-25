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
define("orion/editor/stylers/text_x-typescript/syntax", ["orion/editor/stylers/application_javascript/syntax"], function(mJS) {
	var keywords = ["constructor", "declare", "module"];
	var types = ["any", "boolean", "number", "string"];

	var grammars = [];
	grammars.push.apply(grammars, mJS.grammars);
	grammars.push({
		id: "orion.typescript",
		contentTypes: ["text/x-typescript"],
		patterns: [
			{include: "orion.js"},
			{include: "#keywords"},
			{include: "#types"},
		],
		repository: {
			keywords: {
				match: "\\b(?:" + keywords.join("|") + ")\\b",
				name: "keyword.operator.typescript"
			},
			types: {
				match: "\\b(?:" + types.join("|") + ")\\b",
				name: "storage.type.typescript"
			}
		}
	});

	return {
		id: grammars[grammars.length - 1].id,
		grammars: grammars,
		keywords: keywords.concat(types)
	};
});
