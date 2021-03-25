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
/*eslint-env amd, browser, mocha*/
define([
	"orion/editor/stylers/text_x-erlang/syntax",
	"text!js-tests/editor/textStyler/erlang/text.txt",
	"text!js-tests/editor/textStyler/erlang/styles.txt"
], function(mErlang, mText, mStyles) {
	
	var expectedStyles = [];
	mStyles.split("\n").forEach(function(current) {
		if (current.length) {
			expectedStyles.push(JSON.parse(current));
		}
	});

	function doMoreTests() {
	}

	return {
		doMoreTests: doMoreTests,
		expectedStyles: expectedStyles,
		grammar: mErlang,
		testText: mText,
		mimeType: "text/x-erlang"
	};
});
