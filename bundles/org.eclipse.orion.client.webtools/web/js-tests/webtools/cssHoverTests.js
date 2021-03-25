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
'webtools/cssHover',
'webtools/cssResultManager',
'orion/Deferred',
'mocha/mocha' //global export, stays last
], function(chai, CSSHover, CSSResultManager, Deferred) {
    var assert = chai.assert;
    var resultMgr = new CSSResultManager();
    var resolver = {resolveRelativeFiles: function(){return [{name: 'name', path: 'path', contentType: 'cType', location: 'hover.test'}]; }, getWorkspaceFile: function(){return new Deferred().resolve([1,2,3]);}, setSearchLocation: function(){}};
    var hover = new CSSHover.CSSHover(resolver, resultMgr);
    var editorContext = {
		text: "",
		contentTypeId: "text/css",
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
		    o.location = 'css_hover_test.css';
		    return new Deferred().resolve(o);
		}
	};
		
	function assertHover(result, expected) {
		if(!result){
			assert(!expected, "No hover was returned when expected");
			return;
		} else if (!expected){
			assert(false, "Hover was returned when none expected. Actual: " + result.content);
		}
		if (expected.type){
			assert.equal(expected.type, result.type, 'The hover type does not match');
		}
		if (expected.content){
			assert(result.content, 'Hover has no content');
			assert(result.content.indexOf(expected.content) >= 0, 'Could not find the expected contents in the hover.\nExpected: ' + expected.content + '\nHover: ' + result.content);
		}
	}
	
	describe('CSS Hover Tests', function() {
		/**
		 * @callback from Mocha after each test runs
		 */
		afterEach(function() {
			editorContext.text = "";
			var _f = {file:{location: 'css_hover_test.css'}};
			resultMgr.onModelChanging(_f);
		});
		
		it('Rule hover', function() {
			editorContext.text = "abc { color: black; }";
			return hover.computeHoverInfo(editorContext, {offset: 3}).then(function(result){
				assertHover(result, null);
			});
		});
		it('Color name hover', function() {
			editorContext.text = "abc { color: black; }";
			return hover.computeHoverInfo(editorContext, {offset: 15}).then(function(result){
				assertHover(result, {type: "html", content: '<html><body style="background-color: black;"></html>'});
			});
		});
		it('Color hex hover', function() {
			editorContext.text = "abc { color: #123123; }";
			return hover.computeHoverInfo(editorContext, {offset: 15}).then(function(result){
				assertHover(result, {type: "html", content: '<html><body style="background-color: #123123;"></html>'});
			});
		});
		it('Color rgb hover', function() {
			editorContext.text = "abc { color: rgb(10, 10, 10); }";
			return hover.computeHoverInfo(editorContext, {offset: 15}).then(function(result){
				assertHover(result, {type: "html", content: '<html><body style="background-color: rgb(10,10,10);"></html>'});
			});
		});
		it('Font-family hover over property name', function() {
			editorContext.text = "abc { font-family: arial; }";
			return hover.computeHoverInfo(editorContext, {offset: 9}).then(function(result){
				assertHover(result, null);
			});
		});
		it('Font-family hover', function() {
			editorContext.text = "abc { font-family: arial; }";
			return hover.computeHoverInfo(editorContext, {offset: 21}).then(function(result){
				assertHover(result, {type: "html", content: '<html><body style="background-color:white"><div style="font-family:arial ;margin:0px">Lorem ipsum dolor...</div></body></html>'});
			});
		});
		it('Image hover - raw', function() {
			editorContext.text = "abc { background: \"DoesNotExist.png\" }";
			return hover.computeHoverInfo(editorContext, {offset: 20}).then(function(result){
				assertHover(result, {type: "html", content: 'img src="hover.test"'});
			});
		});
		it('Image hover - url', function() {
			editorContext.text = "abc { background: url(DoesNotExist.png); }";
			return hover.computeHoverInfo(editorContext, {offset: 20}).then(function(result){
				assertHover(result, {type: "html", content: 'img src="hover.test"'});
			});
		});
		it('File hover - import raw - good path', function() {
			editorContext.text = "@import \"BlahBlah.js\";";
			return hover.computeHoverInfo(editorContext, {offset: 13}).then(function(result){
				assertHover(result, {type: "markdown", content: '#hover.test'});
			});
		});
		it('File hover - import url - good path', function() {
			editorContext.text = "@import url(BlahBlah.js);";
			return hover.computeHoverInfo(editorContext, {offset: 15}).then(function(result){
				assertHover(result,  {type: "markdown", content: '#hover.test'});
			});
		});
	});
});
