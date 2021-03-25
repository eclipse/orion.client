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
'webtools/htmlOccurrences',
'webtools/htmlAstManager',
'orion/Deferred',
'mocha/mocha' //global export, stays last
], function(chai, HTMLOccurrences, ASTManager, Deferred) {
    var assert = chai.assert;
    var astManager = new ASTManager.HtmlAstManager();
    var occurrences = new HTMLOccurrences.HTMLOccurrences(astManager);
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
		    o.location = 'html_occurrences_test.html';
		    return new Deferred().resolve(o);
		}
	};
		
	/**
	 * @name assertOccurrence
	 * @description Checks the given occurrence against the expected start and end to make sure it is marked correctly
	 * @function
	 * @public
	 * @param {Array} results The computed occurrence elements to check
	 * @param {Array} expected The array of expected start/end pairs
	 */
	function assertOccurrences(results, expected) {
		if(!results) {
			assert.ok(false, "The occurrence array cannot be null");
		}
		var foundOccurrences = '';
		for (var l=0; l<results.length; l++) {
			if (results[l]){
				foundOccurrences += results[l].start + '-' + results[l].end + ', ';
			}
		}
		assert.equal(results.length, expected.length, "The wrong number of occurrences was returned. Expected: " + listOccurrences(expected) + " Returned: " + listOccurrences(results));
		for(var i = 0; i < expected.length; i++) {
			//for each expected result try to find it in the results, and remove it if it is found
			for(var j = 0; j < results.length; j++) {
				if(!results[j]) {
					continue;
				}
				if((expected[i].start === results[j].start) && (expected[i].end === results[j].end)) {
					results[j] = null;
				}
			}
		}
		for(var k = 0; k < results.length; k++) {
			if(results[k]) {
				assert.ok(false, "Found an unknown occurrence: [start "+results[k].start+"][end "+results[k].end+"]. Expected: " + listOccurrences(expected) + " Returned: " + listOccurrences(results));
			}
		}
	}
	
	/**
	 * @name getResultsOccurrences
	 * @description Returns a string listing the found occurrences
	 * @param results the array results to create the string from
	 * @returns returns string with list of results
	 */
	function listOccurrences(occurrences){
		var foundOccurrences = '';
		for (var i=0; i<occurrences.length; i++) {
			if (occurrences[i]){
				foundOccurrences += occurrences[i].start + '-' + occurrences[i].end;
				if (i < (occurrences.length-1)){
					foundOccurrences += ', ';
				}
			}
		}
		return foundOccurrences;
	}
	
	describe('HTML Occurrences Tests', function() {
		/**
		 * @callback from Mocha after each test runs
		 */
		afterEach(function() {
			editorContext.text = "";
			var _f = {file:{location: 'html_occurrences_test.html'}};
			astManager.onModelChanging(_f);
		});
		
		it('Matching tags selection 1', function() {
			editorContext.text = "<html>\n<a>test</a>\n<a></a>\n</html>";
			return occurrences.computeOccurrences(editorContext, {selection: {start: 0, end: 0}}).then(function(results) {
				assertOccurrences(results, [{start: 1, end: 5}, {start: 28, end: 33}]);
			});
		});
		it('Matching tags selection 2', function() {
			editorContext.text = "<html>\n<a>test</a>\n<a></a>\n</html>";
			return occurrences.computeOccurrences(editorContext, {selection: {start: 1, end: 1}}).then(function(results) {
				assertOccurrences(results, [{start: 1, end: 5}, {start: 28, end: 33}]);
			});
		});
		it('Matching tags selection 3', function() {
			editorContext.text = "<html>\n<a>test</a>\n<a></a>\n</html>";
			return occurrences.computeOccurrences(editorContext, {selection: {start: 29, end: 32}}).then(function(results) {
				assertOccurrences(results, [{start: 1, end: 5}, {start: 28, end: 33}]);
			});
		});
		it('Matching tags selection 4', function() {
			editorContext.text = "<html>\n<a>test</a>\n<a></a>\n</html>";
			return occurrences.computeOccurrences(editorContext, {selection: {start: 29, end: 35}}).then(function(results) {
				assertOccurrences(results, []);
			});
		});
		it('Matching tags selection 5', function() {
			editorContext.text = "<html>\n<a>test</a>\n<a></a>\n</html>";
			return occurrences.computeOccurrences(editorContext, {selection: {start: 0, end: 1}}).then(function(results) {
				assertOccurrences(results, [{start: 1, end: 5}, {start: 28, end: 33}]);
			});
		});
		it('Matching tags selection 6', function() {
			editorContext.text = "<html>\n<a>test</a>\n<a></a>\n</html>";
			return occurrences.computeOccurrences(editorContext, {selection: {start: 18, end: 18}}).then(function(results) {
				assertOccurrences(results, [{start: 8, end: 9}, {start: 15, end: 17}]);
			});
		});
		it('Matching tags selection 7', function() {
			editorContext.text = "<html>\n<a>test</a>\n<a></a>\n</html>";
			return occurrences.computeOccurrences(editorContext, {selection: {start: 19, end: 19}}).then(function(results) {
				assertOccurrences(results, [{start: 20, end: 21}, {start: 23, end: 25}]);
			});
		});
		it('Matching tags selection 8', function() {
			editorContext.text = "<html>\n<a>test</a>\n<a></a>\n</html>";
			return occurrences.computeOccurrences(editorContext, {selection: {start: 18, end: 19}}).then(function(results) {
				assertOccurrences(results, [{start: 1, end: 5}, {start: 28, end: 33}]);
			});
		});
		it('Matching tags selection - bogus selection', function() {
			editorContext.text = "<html>\n<a>test</a>\n<a></a>\n</html>";
			return occurrences.computeOccurrences(editorContext, {selection: {start: 500, end: 500}}).then(function(results) {
				assertOccurrences(results, []);
			});
		});
		
		it('Matching duplicate tags 1', function() {
			editorContext.text = "<html>\n<a>test</a>\n<a></a>\n</html>";
			return occurrences.computeOccurrences(editorContext, {selection: {start: 12, end: 12}}).then(function(results) {
				assertOccurrences(results, [{start: 8, end: 9}, {start: 15, end: 17}]);
			});
		});
		it('Matching duplicate tags 2', function() {
			editorContext.text = "<html>\n<a>test</a>\n<a></a>\n</html>";
			return occurrences.computeOccurrences(editorContext, {selection: {start: 15, end: 17}}).then(function(results) {
				assertOccurrences(results, [{start: 8, end: 9}, {start: 15, end: 17}]);
			});
		});
		
		it('Matching no content tags 1', function() {
			editorContext.text = "<html>\n<a>test</a>\n<a></a>\n</html>";
			return occurrences.computeOccurrences(editorContext, {selection: {start: 20, end: 20}}).then(function(results) {
				assertOccurrences(results, [{start: 20, end: 21}, {start: 23, end: 25}]);
			});
		});
		it('Matching no content tags 2', function() {
			editorContext.text = "<html>\n<a>test</a>\n<a></a>\n</html>";
			return occurrences.computeOccurrences(editorContext, {selection: {start: 24, end: 24}}).then(function(results) {
				assertOccurrences(results, [{start: 20, end: 21}, {start: 23, end: 25}]);
			});
		});
		
		it('Matching inline tags 1', function() {
			editorContext.text = "<html>\n<a src=\"foo\"/>\n<a/>\n</html>";
			return occurrences.computeOccurrences(editorContext, {selection: {start: 8, end: 8}}).then(function(results) {
				assertOccurrences(results, [{start: 8, end: 9}, {start: 19, end: 20}]);
			});
		});
		it('Matching inline tags 2', function() {
			editorContext.text = "<html>\n<a src=\"foo\"/>\n<a/>\n</html>";
			return occurrences.computeOccurrences(editorContext, {selection: {start: 20, end: 20}}).then(function(results) {
				assertOccurrences(results, [{start: 8, end: 9}, {start: 19, end: 20}]);
			});
		});
		it('Matching inline tags 3', function() {
			editorContext.text = "<html>\n<a src=\"foo\"/>\n<a/>\n</html>";
			return occurrences.computeOccurrences(editorContext, {selection: {start: 23, end: 23}}).then(function(results) {
				assertOccurrences(results, [{start: 23, end: 24}, {start: 24, end: 25}]);
			});
		});
		it('Matching inline tags 4', function() {
			editorContext.text = "<html>\n<a src=\"foo\"/>\n<a/>\n</html>";
			return occurrences.computeOccurrences(editorContext, {selection: {start: 25, end: 25}}).then(function(results) {
				assertOccurrences(results, [{start: 23, end: 24}, {start: 24, end: 25}]);
			});
		});
		it('Matching with duplicate attributes in 2 tags 1', function() {
			editorContext.text = '<html width="100%"><body width="100%"></body></html>';
			return occurrences.computeOccurrences(editorContext, {selection: {start: 3, end: 3}}).then(function(results) {
				assertOccurrences(results, [{start: 1, end: 5}, {start: 46, end: 51}]);
			});
		});
		it('Matching with duplicate attributes in 2 tags 2', function() {
			editorContext.text = '<html width="100%"><body width="100%"></body></html>';
			return occurrences.computeOccurrences(editorContext, {selection: {start: 48, end: 48}}).then(function(results) {
				assertOccurrences(results, [{start: 1, end: 5}, {start: 46, end: 51}]);
			});
		});
		it('Matching with duplicate attributes in 2 tags 3', function() {
			editorContext.text = '<html width="100%"><body width="100%"></body></html>';
			return occurrences.computeOccurrences(editorContext, {selection: {start: 9, end: 9}}).then(function(results) {
				assertOccurrences(results, [{start: 6, end: 11}]);
			});
		});
		it('Matching with duplicate attributes in 2 tags 4', function() {
			editorContext.text = '<html width="100%"><body width="100%"></body></html>';
			return occurrences.computeOccurrences(editorContext, {selection: {start: 14, end: 14}}).then(function(results) {
				assertOccurrences(results, [{start: 6, end: 11}]);
			});
		});
		it('Matching with duplicate attributes in 2 tags 5', function() {
			editorContext.text = '<html width="100%"><body width="100%"></body></html>';
			return occurrences.computeOccurrences(editorContext, {selection: {start: 23, end: 23}}).then(function(results) {
				assertOccurrences(results, [{start: 20, end: 24}, {start: 39, end: 44}]);
			});
		});
		it('Matching with duplicate attributes in 2 tags 6', function() {
			editorContext.text = '<html width="100%"><body width="100%"></body></html>';
			return occurrences.computeOccurrences(editorContext, {selection: {start: 40, end: 41}}).then(function(results) {
				assertOccurrences(results, [{start: 20, end: 24}, {start: 39, end: 44}]);
			});
		});
		it('Matching with duplicate attributes in 2 tags 7', function() {
			editorContext.text = '<html width="100%"><body width="100%"></body></html>';
			return occurrences.computeOccurrences(editorContext, {selection: {start: 28, end: 28}}).then(function(results) {
				assertOccurrences(results, [{start: 25, end: 30}]);
			});
		});
		it('Matching with duplicate attributes in 2 tags 8', function() {
			editorContext.text = '<html width="100%"><body width="100%"></body></html>';
			return occurrences.computeOccurrences(editorContext, {selection: {start: 34, end: 34}}).then(function(results) {
				assertOccurrences(results, [{start: 25, end: 30}]);
			});
		});
		it('Matching void element tags - simple 1', function() {
			editorContext.text = '<img src="test">';
			return occurrences.computeOccurrences(editorContext, {selection: {start: 0, end: 0}}).then(function(results) {
				assertOccurrences(results, [{start: 1, end: 4}]);
			});
		});
		it('Matching void element tags - simple 2', function() {
			editorContext.text = '<img src="test">';
			return occurrences.computeOccurrences(editorContext, {selection: {start: 3, end: 3}}).then(function(results) {
				assertOccurrences(results, [{start: 1, end: 4}]);
			});
		});
		it('Matching void element tags - simple 3', function() {
			editorContext.text = '<img src="test">';
			return occurrences.computeOccurrences(editorContext, {selection: {start: 11, end: 11}}).then(function(results) {
				assertOccurrences(results, [{start: 5, end: 8}]);
			});
		});
		it('Matching void element tags - simple 4', function() {
			editorContext.text = '<img src="test">';
			return occurrences.computeOccurrences(editorContext, {selection: {start: 16, end: 16}}).then(function(results) {
				assertOccurrences(results, [{start: 1, end: 4}]);
			});
		});
		it('Matching void element tags - unnecessary close tag 1', function() {
			editorContext.text = '<img src="test"></img>';
			return occurrences.computeOccurrences(editorContext, {selection: {start: 0, end: 0}}).then(function(results) {
				assertOccurrences(results, [{start: 1, end: 4}]);
			});
		});
		it('Matching void element tags - unnecessary close tag 2', function() {
			editorContext.text = '<img src="test"></img>';
			return occurrences.computeOccurrences(editorContext, {selection: {start: 3, end: 3}}).then(function(results) {
				assertOccurrences(results, [{start: 1, end: 4}]);
			});
		});
		it('Matching void element tags - unnecessary close tag 3', function() {
			editorContext.text = '<img src="test"></img>';
			return occurrences.computeOccurrences(editorContext, {selection: {start: 11, end: 11}}).then(function(results) {
				assertOccurrences(results, [{start: 5, end: 8}]);
			});
		});
		it('Matching void element tags - unnecessary close tag 4', function() {
			editorContext.text = '<img src="test"></img>';
			return occurrences.computeOccurrences(editorContext, {selection: {start: 16, end: 16}}).then(function(results) {
				assertOccurrences(results, []);
			});
		});
		it('Matching void element tags - unnecessary close tag 5', function() {
			editorContext.text = '<img src="test"></img>';
			return occurrences.computeOccurrences(editorContext, {selection: {start: 18, end: 18}}).then(function(results) {
				assertOccurrences(results, []);
			});
		});
		it('Matching void element tags - unnecessary inline 1', function() {
			editorContext.text = '<img src="test"/>';
			return occurrences.computeOccurrences(editorContext, {selection: {start: 0, end: 0}}).then(function(results) {
				assertOccurrences(results, [{start: 1, end: 4},{start: 15, end: 16}]);
			});
		});
		it('Matching void element tags - unnecessary inline 2', function() {
			editorContext.text = '<img src="test"/>';
			return occurrences.computeOccurrences(editorContext, {selection: {start: 3, end: 3}}).then(function(results) {
				assertOccurrences(results, [{start: 1, end: 4},{start: 15, end: 16}]);
			});
		});
		it('Matching void element tags - unnecessary inline 3', function() {
			editorContext.text = '<img src="test"/>';
			return occurrences.computeOccurrences(editorContext, {selection: {start: 11, end: 11}}).then(function(results) {
				assertOccurrences(results, [{start: 5, end: 8}]);
			});
		});
		it('Matching void element tags - unnecessary inline 4', function() {
			editorContext.text = '<img src="test"/>';
			return occurrences.computeOccurrences(editorContext, {selection: {start: 16, end: 16}}).then(function(results) {
				assertOccurrences(results, [{start: 1, end: 4},{start: 15, end: 16}]);
			});
		});
		it('Matching void element tags - unnecessary inline 5', function() {
			editorContext.text = '<img src="test"/>';
			return occurrences.computeOccurrences(editorContext, {selection: {start: 17, end: 17}}).then(function(results) {
				assertOccurrences(results, [{start: 1, end: 4},{start: 15, end: 16}]);
			});
		});
	});
});
