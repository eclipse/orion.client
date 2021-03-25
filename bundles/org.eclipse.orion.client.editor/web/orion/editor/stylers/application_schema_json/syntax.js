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

define("orion/editor/stylers/application_schema_json/syntax", ["orion/editor/stylers/application_json/syntax"], function(mJSON) {
	var keywords = [
		"additionalItems", "additionalProperties", "allOf", "anyOf",
		"default", "definitions", "dependencies", "description",
		"enum", "exclusiveMaximum", "exclusiveMinimum",
		"format",
		"id",
		"maximum", "maxItems", "maxLength", "maxProperties", "minimum",
		"minItems", "minLength", "minProperties", "multipleOf",
		"not",
		"oneOf",
		"patternProperties", "pattern", "properties",
		"required",
		"title", "type",
		"uniqueItems"
	];

	var grammars = [];
	grammars.push.apply(grammars, mJSON.grammars);
	grammars.push({
		id: "orion.json.schema",
		contentTypes: ["application/schema+json"],
		patterns: [
			{include: "orion.json"},
			{
				match: "(?:\\$schema|(?:\\b(?:" + keywords.join("|") + ")))\\b",
				name: "keyword.operator.schema.json"
			}
		]
	});
	return {
		id: grammars[grammars.length - 1].id,
		grammars: grammars,
		keywords: keywords
	};
});
