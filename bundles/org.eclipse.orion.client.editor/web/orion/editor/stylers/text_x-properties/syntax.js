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
define("orion/editor/stylers/text_x-properties/syntax", [], function() {
	var grammars = [];
	grammars.push({
		id: "orion.properties",
		contentTypes: ["text/x-properties"],
		patterns: [
			{
				match: "^\\s*#[^$]*",
				name: "comment.line.properties"
			}, {
				begin: "(^[^=]*)(=)",
				end: ".*[^\\\\]$",
				beginCaptures: {
					1: {name: "entity.name.properties"},
					2: {name: "punctuation.operator.properties"}
				},
				endCaptures: {
					0: {name: "string.unquoted.properties"}
				},
				contentName: "string.unquoted.properties"
			}
		]
	});
	return {
		id: grammars[grammars.length - 1].id,
		grammars: grammars,
		keywords: []
	};
});
