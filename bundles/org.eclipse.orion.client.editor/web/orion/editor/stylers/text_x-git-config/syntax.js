/*******************************************************************************
 * @license
 * Copyright (c) 2015 IBM Corporation and others.
 * All rights reserved. This program and the accompanying materials are made 
 * available under the terms of the Eclipse Public License 2.0 
 * (http://www.eclipse.org/legal/epl-v10.html), and the Eclipse Distribution 
 * License v1.0 (http://www.eclipse.org/org/documents/edl-v10.html). 
 * 
 * Contributors: IBM Corporation - initial API and implementation
 ******************************************************************************/

/*eslint-env browser, amd*/

define("orion/editor/stylers/text_x-git-config/syntax", ["orion/editor/stylers/lib/syntax"], function(mLib) {

	var grammars = [];
	grammars.push.apply(grammars, mLib.grammars);
	grammars.push({
		id: "orion.gitconfig",
		contentTypes: ["text/x-git-config"],
		patterns: [
			/* http://git-scm.com/docs/git-config */
			{
				match: "[;#][^$]*",
				name: "comment.line.gitconfig"
			}, {
				match: "=",
				name: "punctuation.operator.equals.gitconfig"
			}, {
				match: "^\\s*\\[[^\\]]*\\]\\s*$",
				name: "entity.section.name.gitconfig"
			}
		]
	});
	return {
		id: grammars[grammars.length - 1].id,
		grammars: grammars,
		keywords: []
	};
});
