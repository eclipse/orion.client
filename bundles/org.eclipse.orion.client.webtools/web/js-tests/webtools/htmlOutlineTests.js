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
/*eslint-env amd, mocha*/
/* eslint-disable missing-nls */
define([
'chai/chai',
'webtools/htmlOutliner',
'webtools/htmlAstManager',
'orion/Deferred',
'mocha/mocha' //global export, stays last
], function(chai, HTMLOutliner, ASTManager, Deferred) {
    var assert = chai.assert,
    	astManager = new ASTManager.HtmlAstManager(),
    	outliner = new HTMLOutliner.HtmlOutliner(astManager);
    
	/**
	 * @name setup
	 * @description Sets up the test
	 * @param {string} text The text of the compilation unit to outline
	 * @returns {?} An object with an outliner and editorContext instance
	 */
	function setup(text) {
        return {
	        outliner: outliner,
	        editorContext: {
				contentTypeId: "text/html",
				/**
				 * get the text
				 */
				getText: function() {
					return new Deferred().resolve(text);
				},
				
				getFileMetadata: function() {
				    var o = Object.create(null);
				    o.contentType = Object.create(null);
				    o.contentType.id = this.contentTypeId;
				    o.location = 'html_outline_test.html';
				    return new Deferred().resolve(o);
				}
			}
        };
    }

	/**
	 * @name assertOutlineElement
	 * @description Checks that the given label and start / end match up with wat we are expecting
	 * @param {?} element Te outline element to check
	 * @param {string} expected The expected full element label to check
	 * @param {number} start The expected start range of the element
	 * @param {number} end The expected end rnage of the element
	 */
	function assertOutlineElement(element, expected, start, end) {
		assert(element, "The tested element cannot be null");
		assert(element.label, "The outlined element must have a label");
		if (element.start !== 0) {
			assert(element.start, "The outlined element must have a start range");
		}
		assert(element.end, "The outlined element must have an end range");
		var fullLabel = element.label;
		if (element.labelPre){
			fullLabel = element.labelPre + fullLabel;
		}
		if (element.labelPost){
			fullLabel += element.labelPost;
		}
		assert.equal(fullLabel, expected, "The label is not the same");
		assert.equal(element.start, start, "The start range is not the same");
		assert.equal(element.end, end, "The end range is not the same");
	}
	
	describe('HTML Outliner Tests', function() {
		/**
		 * @callback from Mocha after each test runs
		 */
		afterEach(function() {
			var _f = {file:{location: 'html_outline_test.html'}};
			astManager.onModelChanging(_f);
		});
		
		it("Simple outline 1", function() {
			var t = setup("<html></html>");
			return t.outliner.computeOutline(t.editorContext).then(function(outline) {
				assert(outline, "There was no outline returned");
				assert(outline.length > 0, "An empty outline was returned");
				assertOutlineElement(outline[0], "html", 0, 13);
			});
		});
		it("Simple outline 2", function() {
			var t = setup("<div></div>");
			return t.outliner.computeOutline(t.editorContext).then(function(outline) {
				assert(outline, "There was no outline returned");
				assert(outline.length > 0, "An empty outline was returned");
				assertOutlineElement(outline[0], "div", 0, 11);
			});
		});
		it("Simple outline 3", function() {
			var t = setup("<div><div></div></div>");
			return t.outliner.computeOutline(t.editorContext).then(function(outline) {
				assert(outline, "There was no outline returned");
				assert(outline.length > 0, "An empty outline was returned");
				assertOutlineElement(outline[0].children[0], "div", 5, 16);
			});
		});
		it("Simple outline - no html tags, self-closed p", function() {
			var t = setup("</p>");
			return t.outliner.computeOutline(t.editorContext).then(function(outline) {
				assert(outline, "There was no outline returned");
				assert(outline.length > 0, "An empty outline was returned");
				assertOutlineElement(outline[0], "p", 4, 4);
			});
		});
		it("Simple outline - no html tags, p", function() {
			var t = setup("<p></p>");
			return t.outliner.computeOutline(t.editorContext).then(function(outline) {
				assert(outline, "There was no outline returned");
				assert(outline.length > 0, "An empty outline was returned");
				assertOutlineElement(outline[0], "p", 0, 7);
			});
		});
		it("Simple outline - no html tags, self-closed anchor", function() {
			var t = setup("</a>");
			return t.outliner.computeOutline(t.editorContext).then(function(outline) {
				assert(outline, "There was no outline returned");
				assert(outline.length === 0, "Should be nothing outlined for bad /a node");
			});
		});
		it("Simple outline - no html tags, self-closed anchor", function() {
			var t = setup("<a/>");
			return t.outliner.computeOutline(t.editorContext).then(function(outline) {
				assert(outline, "There was no outline returned");
				assert(outline.length > 0, "An empty outline was returned");
				assertOutlineElement(outline[0], "a", 0, 4);
			});
		});
		it("Simple outline - no html tags, anchor", function() {
			var t = setup("<a></a>");
			return t.outliner.computeOutline(t.editorContext).then(function(outline) {
				assert(outline, "There was no outline returned");
				assert(outline.length > 0, "An empty outline was returned");
				assertOutlineElement(outline[0], "a", 0, 7);
			});
		});
		it("Skipped node - b", function() {
			var t = setup("<b></b>");
			return t.outliner.computeOutline(t.editorContext).then(function(outline) {
				assert(outline, "There was no outline returned");
				assert(outline.length === 0, "Should be nothing outlined for skipped node b");
			});
		});
		it("Skipped node - i", function() {
			var t = setup("<i></i>");
			return t.outliner.computeOutline(t.editorContext).then(function(outline) {
				assert(outline, "There was no outline returned");
				assert(outline.length === 0, "Should be nothing outlined for skipped node i");
			});
		});
		it("Skipped node - em", function() {
			var t = setup("<em></em>");
			return t.outliner.computeOutline(t.editorContext).then(function(outline) {
				assert(outline, "There was no outline returned");
				assert(outline.length === 0, "Should be nothing outlined for skipped node em");
			});
		});
		it("Skipped node - tt", function() {
			var t = setup("<tt></tt>");
			return t.outliner.computeOutline(t.editorContext).then(function(outline) {
				assert(outline, "There was no outline returned");
				assert(outline.length === 0, "Should be nothing outlined for skipped node tt");
			});
		});
		it("Skipped node - code", function() {
			var t = setup("<code></code>");
			return t.outliner.computeOutline(t.editorContext).then(function(outline) {
				assert(outline, "There was no outline returned");
				assert(outline.length === 0, "Should be nothing outlined for skipped node code");
			});
		});
		it("Skipped node - blockquote", function() {
			var t = setup("<blockquote></blockquote>");
			return t.outliner.computeOutline(t.editorContext).then(function(outline) {
				assert(outline, "There was no outline returned");
				assert(outline.length === 0, "Should be nothing outlined for skipped node blockquote");
			});
		});
		it("Skipped node - b", function() {
			var t = setup("<b></b>");
			return t.outliner.computeOutline(t.editorContext).then(function(outline) {
				assert(outline, "There was no outline returned");
				assert(outline.length === 0, "Should be nothing outlined for skipped node b");
			});
		});
	});
});
