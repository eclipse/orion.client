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
define("orion/editor/stylers/text_x-haml/syntax", ["orion/editor/stylers/lib/syntax", "orion/editor/stylers/text_x-ruby/syntax"],
	function(mLib, mRuby) {

	var grammars = [];
	grammars.push.apply(grammars, mLib.grammars);
	grammars.push.apply(grammars, mRuby.grammars);
	grammars.push({
		id: "orion.haml",
		contentTypes: ["text/x-haml"],
		patterns: [
			{include: "#inlineRuby"},
			{include: "#interpolatedRuby"},
			{include: "#tagWithRubySymbols"},
			{include: "#tagWithHTMLAttributes"},
			{include: "#doctype"},
			{include: "#tag"},
			{include: "#htmlComment"},
		],
		repository: {
			doctype: {
				match: "^!!!.*$",
				name: "meta.tag.doctype.haml",
			},
			htmlComment: {
				// TODO multi-line comments
				match: {match: "/[^[].*$", literal: "/"},
				name: "comment.line.html.haml"
			},
			inlineRuby: {
				// TODO end match should not eat the last content character, really need a negative look-behind
				begin: "(?:^|[^\\\\])(?:=|-|~|&==?|!==?)",
				end: "(?:^|[^,])$",
				contentName: "source.ruby.embedded.haml",
				patterns: [
					{include: "orion.ruby"},
				]
			},
			interpolatedRuby: {
				begin: "#{",
				end: "}",
				contentName: "source.ruby.embedded.haml",
				patterns: [
					{include: "orion.ruby"},
				]
			},
			tag: {
				match: "^\\s*%[^\\b]+?\\b",
				name: "meta.tag.haml",
			},
			tagWithHTMLAttributes: {
				begin: "(^\\s*)(%[^\\s(]+?)\\(",
				end: "\\)\\s*$",
				beginCaptures: {
					2: {name: "meta.tag.haml"}
				},
				patterns: [
					{
						match: "[^\\s=]+(?==)",
						name: "entity.name.attribute.html.haml"
					},
					{include: "orion.ruby#variable"},
					{include: "orion.lib#string_doubleQuote"},
					{include: "orion.lib#string_singleQuote"},
				]
			},
			tagWithRubySymbols: {
				begin: "(^\\s*)(%[^\\b]+?)\\b{",
				end: "}\\s*$",
				beginCaptures: {
					2: {name: "meta.tag.haml"}
				},
				patterns: [
					{include: "orion.ruby#symbol"},
					{include: "orion.ruby#variable"},
					{include: "orion.lib#string_doubleQuote"},
					{include: "orion.lib#string_singleQuote"},
				]
			}
		}
	});
	return {
		id: grammars[grammars.length - 1].id,
		grammars: grammars,
		keywords: []
	};
});
