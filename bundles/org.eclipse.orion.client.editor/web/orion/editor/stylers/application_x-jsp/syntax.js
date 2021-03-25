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
define("orion/editor/stylers/application_x-jsp/syntax", ["orion/editor/stylers/lib/syntax", "orion/editor/stylers/text_x-java-source/syntax", "orion/editor/stylers/text_html/syntax"],
	function(mLib, mJava, mHTML) {

	var pageAttributeNames = [
		"autoFlush", "buffer", "contentType", "errorPage", "extends",
		"import", "info", "isErrorPage", "isThreadSafe", "language", "pageEncoding", "session"
	];

	var grammars = [];
	grammars.push.apply(grammars, mLib.grammars);
	grammars.push.apply(grammars, mJava.grammars);
	grammars.push.apply(grammars, mHTML.grammars);
	grammars.push({
		id: "orion.jsp",
		contentTypes: ["application/x-jsp"],
		patterns: [
			{include: "orion.html"},
			{include: "#jspComment"},
			{include: "#jspJavaFragment"},
			{include: "#jspDirectiveInclude"},
			{include: "#jspDirectivePage"},
			{include: "#jspDirectiveTaglib"}
		],
		repository: {
			jspComment: {
				begin: {match: "<%--", literal: "<%--"},
				end: {match: "--%>", literal: "<%--"},
				name: "comment.block.jsp",
				patterns: [
					{
						match: "(\\b)(TODO)(\\b)(((?!--%>).)*)",
						name: "meta.annotation.task.todo",
						captures: {
							2: {name: "keyword.other.documentation.task"},
							4: {name: "comment.line"}
						}
					}
				]
			},
			jspDirectiveInclude: {
				begin: "<%@\\s+include(?:\\s|$)",
				end: "%>",
				captures: {
					0: {name: "entity.name.directive.include.jsp"}
				},
				patterns: [
					{
						match: "\\bfile\\b",
						name: "entity.other.attribute-name.jsp"
					},
					{include: "orion.lib#string_doubleQuote"},
					{include: "orion.lib#string_singleQuote"},
				]
			},
			jspDirectivePage: {
				begin: "<%@\\s+page(?:\\s|$)",
				end: "%>",
				captures: {
					0: {name: "entity.name.directive.page.jsp"}
				},
				patterns: [
					{
						match: "\\b(?:" + pageAttributeNames.join("|") + ")\\b",
						name: "entity.other.attribute-name.jsp"
					},
					{include: "orion.lib#string_doubleQuote"},
					{include: "orion.lib#string_singleQuote"},
				]
			},
			jspDirectiveTaglib: {
				begin: "<%@\\s+taglib(?:\\s|$)",
				end: "%>",
				captures: {
					0: {name: "entity.name.directive.taglib.jsp"}
				},
				patterns: [
					{
						match: "\\b(?:uri|prefix)\\b",
						name: "entity.other.attribute-name.jsp"
					},
					{include: "orion.lib#string_doubleQuote"},
					{include: "orion.lib#string_singleQuote"},
				]
			},
			jspJavaFragment: {
				begin: "<%(?:=|!)?(?:\\s|$)",
				end: "%>",
				captures: {
					0: {name: "entity.name.declaration.java"}
				},
				contentName: "source.java.embedded.jsp",
				patterns: [
					{include: "orion.java"}
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
