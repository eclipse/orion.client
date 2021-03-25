/*******************************************************************************
 * @license
 * Copyright (c) 2017 IBM Corporation and others.
 * All rights reserved. This program and the accompanying materials are made 
 * available under the terms of the Eclipse Public License 2.0 
 * (http://www.eclipse.org/legal/epl-v10.html), and the Eclipse Distribution 
 * License v1.0 (http://www.eclipse.org/org/documents/edl-v10.html). 
 * 
 * Contributors: IBM Corporation - initial API and implementation
 ******************************************************************************/
/*eslint-env amd, mocha*/
/* eslint-disable missing-nls */
define([
'chai/chai',
'webtools/cssFormatter',
'orion/Deferred',
'mocha/mocha' //global export, stays last
], function(chai, CSSFormatter, Deferred) {
    var assert = chai.assert,
    	formatter = new CSSFormatter.CssFormatter();
    
	/**
	 * @name setup
	 * @description Sets up the test
	 * @param {?} options The object of options
	 * @returns {?} An object with an outliner and editorContext instance
	 */
	function setup(options) {
		var text = options.text,
			selection = options.selection,
			expected = null;
        return {
        	setExpectedResult: function(result) {
        		expected = result;
        	},
	        formatter: formatter,
	        editorContext: {
				/**
				 * get the text
				 */
				getText: function() {
					return new Deferred().resolve(text);
				},
				
				getSelection: function() {
					return new Deferred().resolve(selection ? selection : {start: text.length-1, end: text.length-1});
				},
				setText: function(text, start, end) {
					assert(expected, "No expected result was set for test run");
					assert.equal(text, expected.text, "The formatted text does not match the expected result");
					assert.equal(start, expected.start, "The start offset does not matched the expected start");
					assert.equal(end, expected.end, "The end offset does not match the expected end");
				}
			}
        };
    }

	describe('CSS Formatter Tests', function() {
		it("Simple format 1", function(done) {
			var s = setup({text: ".rule {align-items: center;}"});
			s.setExpectedResult({text: ".rule {\n\talign-items: center;\n}"});
			s.formatter.format(s.editorContext).then(function() {
				done();
			}, function rejected(err) {
				done(err);
			});
		});
		it("Simple selected format 1", function(done) {
			var s = setup({text: ".rule {align-items: center;}", selection: {start: 6, end: 28}});
			s.setExpectedResult({text: ".rule {\n\talign-items: center;\n}", start: 6, end: 28});
			s.formatter.format(s.editorContext).then(function() {
				done();
			}, function rejected(err) {
				done(err);
			});
		});
	});
});
