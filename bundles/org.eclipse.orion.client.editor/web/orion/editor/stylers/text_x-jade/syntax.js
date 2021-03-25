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
define("orion/editor/stylers/text_x-jade/syntax", ["orion/editor/stylers/lib/syntax", "orion/editor/stylers/application_javascript/syntax"], function(mLib, mJS) {
	var keywords = [
		"&attributes",
		"block",
		"case",
		"default", "doctype",
		"each", "else", "extends",
		"for",
		"if", "include",
		"mixin",
		"unless",
		"when", "while"
	];

	var grammars = [];
	grammars.push.apply(grammars, mLib.grammars);
	grammars.push.apply(grammars, mJS.grammars);
	grammars.push({
		id: "orion.jade",
		contentTypes: ["text/x-jade"],
		patterns: [
			{include: "#comment_singleLine"},
			{include: "#code"},
			{include: "#control"},
			{include: "#caseBranch"},
			{include: "#mixinWithParameters"},
			{include: "#mixinRefWithArguments"},
			{include: "#tagWithAttributes"},
			{include: "#interpolatedJS"},
			{include: "#interpolatedTag"},
			{include: "#mixin"},
			{include: "#mixinRef"},
			{include: "#doctype"},
			{include: "#filter"},
			{include: "#case"},
			{include: "#andAttributes"},
			{include: "#otherKeywords"},
			{include: "#tag"},
		],
		repository: {
			andAttributes: {
				match: "&attributes\\b",
				name: "keyword.operator.jade"
			},
			"case": {
				match: "(^\\s*)(case)\\b",
				captures: {
					2: {name: "keyword.control.jade"}
				}				
			},
			caseBranch: {
				begin: "(^\\s*)(when|default)\\s*",
				end: ":|$",
				contentName: "source.js.embedded.jade",
				patterns: [
					{include: "orion.js"}
				],
				beginCaptures: {
					2: {name: "keyword.control.jade"}
				},
			},
			code: {
				match: "(^\\s*- |= |!= ).*$",
				name: "source.js.embedded.jade",
				patterns: [
					{include: "orion.js"}
				]
			},
			comment_singleLine: {
				match: {match: "(^\\s*)(//).*", literal: "//"},
				name: "comment.line.double-slash.jade",
				captures: {
					2: {name: "comment.line.double-slash.start.jade"}
				},
				patterns: [
					{
						include: "orion.lib#todo_comment_singleLine"
					}
				]
			},
			control: {
				begin: "(^\\s*)(if|else( if)?|each|for|unless|while)\\b",
				end: "$",
				beginCaptures: {
					2: {name: "keyword.control.jade"}
				},
				contentName: "source.js.embedded.jade",
				patterns: [
					{include: "orion.js"}
				]
			},
			doctype: {
				match: "(^\\s*)(doctype.+$)",
				captures: {
					2: {name: "meta.tag.doctype.jade"}
				}
			},
			filter: {
				match: "(^\\s*)(:\\w+)",
				captures: {
					2: {name: "entity.other.filter.jade"}
				}
			},
			interpolatedJS: {
				begin: "(#{)",
				end: "(})",
				captures: {
					1: {name: "string.interpolated.js.jade"}
				},
				contentName: "source.js.embedded.jade",
				patterns: [
					{include: "orion.js"}
				]
			},
			interpolatedTag: {
				begin: "(#\\[)",
				end: "(\\])",
				captures: {
					1: {name: "string.interpolated.tag.jade"}
				},
				patterns: [
					{
						begin: "(\\.|\\w+)\\s*\\(",
						end: "(\\))(/)?",
						beginCaptures: {
							1: {name: "meta.tag.jade"}
						},
						endCaptures: {
							2: {name: "meta.tag.jade"}
						},
						contentName: "source.js.embedded.jade",
						patterns: [
							{include: "orion.js"}
						]
					}
				]
			},
			mixin: {
				match: "(^\\s*)(mixin)(\\s+)(\\w+)",
				captures: {
					2: {name: "keyword.operator.jade"},
					4: {name: "entity.name.mixin.jade"}
				}
			},
			mixinRef: {
				match: "(^\\s*)(\\+\\w+)",
				captures: {
					2: {name: "entity.name.mixin.jade"}
				}
			},
			mixinRefWithArguments: {
				begin: "(^\\s*)(\\+\\w+)\\s*\\(",
				end: "\\)|$",
				captures: {
					2: {name: "entity.name.mixin.jade"}
				},
				patterns: [
					{include: "orion.lib#string_doubleQuote"},
					{include: "orion.lib#string_singleQuote"},
					{include: "orion.lib#number_decimal"}
				]
			},
			mixinWithParameters: {
				begin: "(^\\s*)(mixin)(\\s+)(\\w+)\\s*\\(",
				end: "\\)|$",
				beginCaptures: {
					2: {name: "keyword.operator.jade"},
					4: {name: "entity.name.mixin.jade"}
				},
				patterns: [
					{
						match: "[^\\s,]+",
						name: "variable.parameter.jade"
					}	
				]
			},
			otherKeywords: {
				match: "(^\\s*)(block|extends|include)\\b",
				captures: {
					2: {name: "keyword.operator.jade"}
				}
			},
			tag: {
				match: "(^\\s*)(\\w+|(?=\\.)|(?=#))(#\\w*|\\.\\w*)*(/?)",
				captures: {
					2: {name: "meta.tag.jade"},
					4: {name: "meta.tag.jade"}
				}
			},
			tagWithAttributes: {
				begin: "(^\\s*)(\\w+|(?=\\.)|(?=#))(#\\w*|\\.\\w*)*\\s*\\(",
				end: "(\\))(/)?",
				beginCaptures: {
					2: {name: "meta.tag.jade"}
				},
				endCaptures: {
					2: {name: "meta.tag.jade"}
				},
				contentName: "source.js.embedded.jade",
				patterns: [
					{include: "orion.js"}
				]
			}
		}
	});

	return {
		id: grammars[grammars.length - 1].id,
		grammars: grammars,
		keywords: keywords
	};
});
