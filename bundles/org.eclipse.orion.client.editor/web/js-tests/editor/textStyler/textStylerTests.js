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
/* eslint-disable missing-nls */
define([
	"chai/chai",
	"js-tests/editor/mockTextView",
	"orion/editor/textStyler",
	"js-tests/editor/textStyler/c/tests",
	"js-tests/editor/textStyler/cpp/tests",
	"js-tests/editor/textStyler/csharp/tests",
	"js-tests/editor/textStyler/cshtml/tests",
	"js-tests/editor/textStyler/css/tests",
	"js-tests/editor/textStyler/dockerfile/tests",
	"js-tests/editor/textStyler/ejs/tests",
	"js-tests/editor/textStyler/erlang/tests",
	"js-tests/editor/textStyler/go/tests",
	"js-tests/editor/textStyler/haml/tests",
	"js-tests/editor/textStyler/html/tests",
	"js-tests/editor/textStyler/jade/tests",
	"js-tests/editor/textStyler/java/tests",
	"js-tests/editor/textStyler/js/tests",
	"js-tests/editor/textStyler/json/tests",
	"js-tests/editor/textStyler/jsp/tests",
	"js-tests/editor/textStyler/lua/tests",
	"js-tests/editor/textStyler/objectiveC/tests",
	"js-tests/editor/textStyler/php/tests",
	"js-tests/editor/textStyler/python/tests",
	"js-tests/editor/textStyler/ruby/tests",
	"js-tests/editor/textStyler/swift/tests",
	"js-tests/editor/textStyler/vb/tests",
	"js-tests/editor/textStyler/vbhtml/tests",
	"js-tests/editor/textStyler/xml/tests",
	"js-tests/editor/textStyler/xquery/tests",
	"js-tests/editor/textStyler/yaml/tests"	
], function(chai, mMockTextView, mTextStyler,
	cTests, cppTests, csharpTests, cshtmlTests, cssTests, dockerfileTests, ejsTests, erlangTests, goTests, hamlTests, htmlTests, jadeTests, javaTests,
	jsTests, jsonTests, jspTests, luaTests, objectiveCTests, phpTests, pythonTests, rubyTests, swiftTests, vbTests, vbhtmlTests, xmlTests, xqueryTests, yamlTests) {

	var tests = [
//		cTests,
//		cppTests,
//		csharpTests,
//		cshtmlTests,
		cssTests,
//		dockerfileTests,
//		ejsTests,
//		erlangTests,
//		goTests,
//		hamlTests,
		htmlTests,
		jadeTests,
		javaTests,
		jsTests,
//		jsonTests,
//		jspTests,
//		luaTests,
//		objectiveCTests,
		phpTests,
//		pythonTests,
//		rubyTests,
//		swiftTests,
//		vbTests,
//		vbhtmlTests,
		xmlTests,
//		xqueryTests,
//		yamlTests
	];

	var assert = chai.assert;
	var view;

	describe("TextStyler", function() {
		beforeEach(setup);
		afterEach(teardown);
		
		tests.forEach(function(current) {
			describe(current.mimeType, function() {
				testInitialStyles(current);
				if (current.doMoreTests) {
					current.doMoreTests();
				}
			});
		});
	});

	function compareStyles(computedStyles, expectedStyles) {
		if (computedStyles.length !== expectedStyles.length) {
			return false;
		}
		for (var i = 0; i < computedStyles.length; i++) {
			if (computedStyles[i].start !== expectedStyles[i].start ||
				computedStyles[i].end !== expectedStyles[i].end ||
				computedStyles[i].style.styleClass !== expectedStyles[i].style.styleClass) {
					return false;
			}
		}
		return true;
	}

	function getStyles(styler, output) {
		var result = [];
		var model = view.getModel();
		var lineCount = model.getLineCount();
		for (var i = 0; i < lineCount; i++) {
			var e = {textView: view, lineText: model.getLine(i), lineStart: model.getLineStart(i)};
			styler._onLineStyle(e);
			if (e.ranges) {
				e.ranges.forEach(function(current) {
					if (current.style) {
						result.push(current);
					}
				});
			}
		}

		/* merge range elements where possible */
		for (i = result.length - 2; 0 <= i; i--) {
			if (result[i].end === result[i + 1].start && result[i].style.styleClass === result[i + 1].style.styleClass) {
				result[i].end = result[i + 1].end;
				result.splice(i + 1, 1);
			}
		}

		if (output) {
			for (i = 0; i < result.length; i++) {
				window.console.log(JSON.stringify(result[i]));
			}
		}

		return result;
	}

	function setup() {
		var options = {parent: "editorDiv", readonly: true};
		view = new mMockTextView.MockTextView(options);
	}

	function teardown() {
		view = null;
	}
	
	function printStyles(styles) {
		var result = "";
		for (var i=0; i<styles.length; i++) {
			// Use the following to output in the styles.txt format
			result += '{"start":' + styles[i].start + ',"end":' + styles[i].end + ',"style":{"styleClass":"' + styles[i].style.styleClass + '"}}\n';
			// Use the following to switch the output to something easier to read
//			result += "[" + styles[i].start + "-" + styles[i].end + " " + styles[i].style.styleClass + "]";
		}
		return result;
	}

	function testInitialStyles(test) {
		it("Initial Styles", function() {
			var stylerAdapter = new mTextStyler.createPatternBasedAdapter(test.grammar.grammars, test.grammar.id, test.mimeType);
			var styler = new mTextStyler.TextStyler(view, /*annotationModel*/undefined, stylerAdapter);
			view.setText(test.testText);
			var styles = getStyles(styler, test.outputStyles);
			if (!test.outputStyles) {
				assert(compareStyles(styles, test.expectedStyles), "The output styles did not match the expected styles.\nOutput:\n" + printStyles(styles) + "\nExpected:\n" + printStyles(test.expectedStyles));
			} else {
				assert(false, "Computed styles were output, so no expected style comparisons were made");
			}
		});
	}
});
