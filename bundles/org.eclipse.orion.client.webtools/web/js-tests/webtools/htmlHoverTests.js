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
'webtools/htmlHover',
'webtools/htmlAstManager',
'orion/Deferred',
'mocha/mocha' //global export, stays last
], function(chai, HTMLHover, ASTManager, Deferred) {
    var assert = chai.assert;
    var astManager = new ASTManager.HtmlAstManager();
    var hover = new HTMLHover.HTMLHover(astManager, {resolveRelativeFiles: function(){return [{name: 'name', path: 'path', contentType: 'cType', location: 'hover.test'}]; }, getWorkspaceFile: function(){return new Deferred().resolve([1,2,3]);}, setSearchLocation: function(){}});
    var editorContext = {
		text: "",
		contentTypeId: "text/html",
		/**
		 * get the text
		 */
		getText: function() {
			return new Deferred().resolve(this.text);
		},
		
		getFileMetadata: function() {
		    var o = Object.create(null);
		    o.contentType = Object.create(null);
		    o.contentType.id = this.contentTypeId;
		    o.location = 'html_hover_test.html';
		    return new Deferred().resolve(o);
		}
	};
		
	function assertHover(result, expected) {
		if(!result){
			assert(!expected, "No hover was returned when expected");
			return;
		}
		if (expected.type){
			assert.equal(expected.type, result.type, 'The hover type does not match');
		}
		if (expected.content){
			assert(result.content, 'Hover has no content');
			assert(result.content.indexOf(expected.content) >= 0, 'Could not find the expected contents in the hover.\nExpected: ' + expected.content + '\nHover: ' + result.content);
		}
	}
	
	describe('HTML Hover Tests', function() {
		/**
		 * @callback from Mocha after each test runs
		 */
		afterEach(function() {
			editorContext.text = "";
			var _f = {file:{location: 'html_hover_test.html'}};
			astManager.onModelChanging(_f);
		});
		
		it('Tag hover', function() {
			editorContext.text = "<body>Text</body>>";
			return hover.computeHoverInfo(editorContext, {offset: 1}).then(function(result){
				assertHover(result, null);
			});
		});
		it('Image hover - src', function() {
			editorContext.text = "<img src='DoesNotExist.png'>";
			return hover.computeHoverInfo(editorContext, {offset: 11}).then(function(result){
				assertHover(result, {type: "html", content: 'img src="hover.test"'});
			});
		});
		it('Image hover - href', function() {
			editorContext.text = "<img href='DoesNotExist.png'>";
			return hover.computeHoverInfo(editorContext, {offset: 11}).then(function(result){
				assertHover(result, {type: "html", content: 'img src="hover.test"'});
			});
		});
		it('File hover - src - bad path', function() {
			editorContext.text = "<img src='BlahBlah'>";
			return hover.computeHoverInfo(editorContext, {offset: 11}).then(function(result){
				assertHover(result, null);
			});
		});
		it('File hover - src', function() {
			editorContext.text = "<img src='BlahBlah.js'>";
			return hover.computeHoverInfo(editorContext, {offset: 11}).then(function(result){
				assertHover(result, {type: "markdown", content: '#hover.test'});
			});
		});
		it('File hover - href', function() {
			editorContext.text = "<img href='http://BlahBlah'>";
			return hover.computeHoverInfo(editorContext, {offset: 11}).then(function(result){
				assertHover(result, {type: "markdown", content: '(http://BlahBlah)'});
			});
		});
		
	});
});
