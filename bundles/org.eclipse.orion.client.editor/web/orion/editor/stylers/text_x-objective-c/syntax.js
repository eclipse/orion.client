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
define("orion/editor/stylers/text_x-objective-c/syntax", ["orion/editor/stylers/text_x-csrc/syntax"], function(mC) {
	var keywords = [
		"atomic",
		"BOOL", "bycopy", "byref",
		"Class",
		"id", "IMP", "inout", "in",
		"nil", "nonatomic", "NO", "NULL",
		"oneway", "out",
		"Protocol",
		"retain",
		"SEL", "self", "super",
		"YES"
	];

	var atKeywords = [
		"@catch", "@class",
		"@dynamic",
		"@end",
		"@finally",
		"@implementation", "@interface",
		"@private", "@property", "@protected", "@protocol", "@public",
		"@selector",
		"@synthesize",
		"@throw", "@try"
	];

	var directives = ["import"];

	var grammars = [];
	grammars.push.apply(grammars, mC.grammars);
	grammars.push({
		id: "orion.objectiveC",
		contentTypes: ["text/x-objective-c"],
		patterns: [
			{include: "#objectiveCString"},
			{include: "orion.c"},
			{include: "#objectiveCDirective"},
			{include: "#objectiveCKeyword"}
		],
		repository: {
			objectiveCDirective: {
				match: "#\\s*(?:" + directives.join("|") + ")\\b[^$]*",
				name: "meta.preprocessor.objective-c"
			},
			objectiveCKeyword: {
				match: "(\\b(?:" + keywords.join("|") + ")|(?:" + atKeywords.join("|") + "))\\b",
				name: "keyword.operator.objective-c"
			},
			objectiveCString: {
				match: '@"(?:\\\\.|[^"])*"?',
				name: "string.quoted.double.objective-c"
			},
		}
	});
	return {
		id: grammars[grammars.length - 1].id,
		grammars: grammars,
		keywords: mC.keywords.concat(keywords).concat(directives).concat(atKeywords)
	};
});
