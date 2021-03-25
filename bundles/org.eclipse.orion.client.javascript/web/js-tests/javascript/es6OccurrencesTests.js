/*******************************************************************************
 * @license
 * Copyright (c) 2016, 2018 IBM Corporation and others.
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
	'orion/Deferred',
	'javascript/occurrences',
	'mocha/mocha'  //must stay at the end, not a module
], function(chai, Deferred, Occurrences) {
	var assert = chai.assert;

	return /* @callback */ function(worker) {
		var occurrences;
		var jsFile = 'tern_occurrences_test_script.js';
		var htmlFile = 'tern_occurrences_test_script.html';
		var timeoutReturn = ['Occurrences timed out'];
		var jsProject = {
			getEcmaLevel: function getEcmaLevel() {
				// Defaults to ES5
			}
		};
			
		/**
		 * @description Sets up the test
		 * @param {Object} options The options the set up with
		 * @returns {Object} The object with the initialized values
		 */
		function setup(options) {
			var state = Object.create(null);
			var buffer = state.buffer = typeof options.buffer === 'undefined' ? '' : options.buffer;
			
			var contentType = options.contentType ? options.contentType : 'application/javascript';
			var	file = state.file = jsFile;				
			if (contentType === 'text/html'){
				// Tern plug-ins don't have the content type, only the name of the file
				file = state.file = htmlFile;
			}
			var ecma = options.ecma ? options.ecma : 5;
			jsProject.getEcmaLevel = function() {
				return new Deferred().resolve(ecma);
			};
			assert(options.callback, 'You must provide a test callback for worker-based tests');
			state.callback = options.callback;
			worker.setTestState(state);
			
			// Delete any test files created by previous tests
			worker.postMessage({request: 'delFile', args:{file: jsFile}});
			worker.postMessage({request: 'delFile', args:{file: htmlFile}});
			
			var editorContext = {
				/*override*/
				getText: function() {
					return new Deferred().resolve(buffer);
				},
				/** @callback */
				getFileMetadata: function() {
				    var o = Object.create(null);
				    o.contentType = Object.create(null);
				    o.contentType.id = contentType;
				    o.location = file;
				    return new Deferred().resolve(o);
			    }
			};
			var params = {selection:options.selection, timeout: options.timeout ? options.timeout : 20000, timeoutReturn: timeoutReturn};
			return {
				editorContext: editorContext,
				params: params
			};
		}
		
		/**
		 * @description Checks the proposals returned from the given proposal promise against
		 * the array of given proposals
		 * @param {Object} options The options to test with
		 * @param {Array} expectedProposals The array of expected proposal objects
		 */
		function computeOccurrences(text, options, expected) {
			options.buffer = text;
			var _p = setup(options);
			assert(_p, 'setup() should have completed normally');
			occurrences.computeOccurrences(_p.editorContext, _p.params).then(function (actual) {
				try {
					assert(actual, "Error occurred, returned occurrences was undefined");
					if (actual === timeoutReturn){
						assert(false, "The occurrences operation timed out");
					}
					
					assert.equal(actual.length, expected.length, "The wrong number of occurrences was returned. Expected: " + listOccurrences(expected) + " Returned: " + listOccurrences(actual));
					for(var i = 0; i < expected.length; i++) {
						//for each expected result try to find it in the results, and remove it if it is found
						for(var j = 0; j < actual.length; j++) {
							if(!actual[j]) {
								continue;
							}
							if((expected[i].start === actual[j].start) && (expected[i].end === actual[j].end)) {
								actual[j] = null;
							}
						}
					}
					for(var k = 0; k < actual.length; k++) {
						if(actual[k]) {
							assert.ok(false, "Found an unknown occurrence: [start "+actual[k].start+"][end "+actual[k].end+"]. Expected: " + listOccurrences(expected) + " Returned: " + listOccurrences(actual));
						}
					}
					worker.getTestState().callback();
				} catch(err) {
					worker.getTestState().callback(err);
				}
			}, function (error) {
				worker.getTestState().callback(error);
			});
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
					if (i < occurrences.length-1){
						foundOccurrences += ', ';
					}
				}
			}
			return foundOccurrences;
		}
			
		/**
		 * @name setContext
		 * @description Delegate helper to create options object
		 * @function
		 * @public
		 * @param {Function} callback The function to call when done
		 * @param {Number} start The start of the editor selection
		 * @param {Number} end The end of thhe editor selection
		 * @param {String} contentType Optional content type descriptor
		 * @returns {Object} options object
		 */
		function getOptions(callback, start, end, contentType) {
			return {callback: callback, selection: {start: start, end: end}, contentType: contentType};
		}
		
		describe('ES6 Occurrences Tests', function() {
			this.timeout(20000);
			before('Message the server for warm up', function(done) {
				occurrences = new Occurrences.JavaScriptOccurrences(worker);
				worker.start(done,  {options:{ecmaVersion:6, sourceType:"module"}});
			});
			describe("Destructuring Assignments", function() {
				/**
				 * @see https://bugs.eclipse.org/bugs/show_bug.cgi?id=506358
				 * @since 13.0
				 */
				it("Simple array assignment", function(done) {
					var text = "var [a, b] = [1, 2];if(a === 10 || b === 10) {}";
					return computeOccurrences(text, getOptions(done, 5, 6), [{start:5, end:6}, {start:23, end:24}]);
				});
				/**
				 * @see https://bugs.eclipse.org/bugs/show_bug.cgi?id=506358
				 * @since 13.0
				 */
				it("Extrenal declaration array assignment", function(done) {
					var text = "var c, d;[c, d] = [3, 4];if(c === 10 || d === 10) {}";
					return computeOccurrences(text, getOptions(done, 4, 5), [{start:4, end:5}, {start:10, end:11}, {start:28, end:29}]);
				});
				/**
				 * @see https://bugs.eclipse.org/bugs/show_bug.cgi?id=506358
				 * @since 13.0
				 */
				it("Array re-assignment", function(done) {
					var text = "var e = [5, 6];var [f, g] = e;if(f === 10 || g === 10) {}";
					return computeOccurrences(text, getOptions(done, 20, 21), [{start:20, end:21}, {start:33, end:34}]);
				});
				/**
				 * @see https://bugs.eclipse.org/bugs/show_bug.cgi?id=506358
				 * @since 13.0
				 */
				it("Default values array assignment", function(done) {
					var text = "var [h=1, i=2] = [3, 4];if(h === 10 || i === 10) {}";
					return computeOccurrences(text, getOptions(done, 5, 6), [{start:5, end:6}, {start:27, end:28}]);
				});
				/**
				 * @see https://bugs.eclipse.org/bugs/show_bug.cgi?id=506358
				 * @since 13.0
				 */
				it("Array value swap array assignment", function(done) {
					var text = "var j = 2, k = 3;[j, k] = [k, j];";
					return computeOccurrences(text, getOptions(done, 4, 5), [{start:4, end:5}, {start:18, end:19}, {start:30, end:31}]);
				});
				/**
				 * @see https://bugs.eclipse.org/bugs/show_bug.cgi?id=506358
				 * @since 13.0
				 */
				it("Sparse array assignment", function(done) {
					var text = "[l, ,n] = [1, 2, 3, 4, 5];if(l === 10 || n === 10) {}";
					return computeOccurrences(text, getOptions(done, 1, 2), [{start:1, end:2}, {start:29, end:30}]);
				});
				/**
				 * @see https://bugs.eclipse.org/bugs/show_bug.cgi?id=506358
				 * @since 13.0
				 */
				it("Simple object assignment", function(done) {
					var text = "var {a, b} = {a: 1, b:2};if(a || b) {}";
					return computeOccurrences(text, getOptions(done, 5, 6), [{start:5, end:6}, {start:28, end:29}]);
				});
				/**
				 * @see https://bugs.eclipse.org/bugs/show_bug.cgi?id=506358
				 * @since 13.0
				 */
				it("Assignment external declaration object assignment", function(done) {
					var text = "var c, d;({c, d} = {c:1, d:2});if(c || d) {}";
					return computeOccurrences(text, getOptions(done, 4, 5), [{start:4, end:5}, {start:11, end:12}, {start:34, end:35}]);
				});
				/**
				 * @see https://bugs.eclipse.org/bugs/show_bug.cgi?id=506358
				 * @since 13.0
				 */
				it("Default values object assignment", function(done) {
					var text = "var {e=10, f=5} = {e: 3};if(e || f) {}";
					return computeOccurrences(text, getOptions(done, 5, 6), [{start:5, end:6}, {start:28, end:29}]);
				});
				/**
				 * @see https://bugs.eclipse.org/bugs/show_bug.cgi?id=506358
				 * @since 13.0
				 */
				it("Default values object assignment", function(done) {
					var text = "var {e=10, f=5} = {e: 3};if(e || f) {}";
					return computeOccurrences(text, getOptions(done, 5, 6), [{start:5, end:6}, {start:28, end:29}]);
				});
				/**
				 * @see https://bugs.eclipse.org/bugs/show_bug.cgi?id=506358
				 * @since 13.0
				 */
				it("Function expression default values object assignment", function(done) {
					var text = "(function fun({aa = 1, bb = { x: 0, y: 0 }, cc = 2} = {}) {console.log(aa, bb, cc);})();";
					return computeOccurrences(text, getOptions(done, 15, 17), [{start:15, end:17}, {start:71, end:73}]);
				});
				/**
				 * @see https://bugs.eclipse.org/bugs/show_bug.cgi?id=506358
				 * @since 13.0
				 */
				it("For-of default values object assignment", function(done) {
					var text = "for (var {aaa: a1, bbb: { ccc: c1 } } of {}) {console.log(a1, c1);}";
					return computeOccurrences(text, getOptions(done, 15, 17), [{start:15, end:17}, {start:58, end:60}]);
				});
				/**
				 * @see https://bugs.eclipse.org/bugs/show_bug.cgi?id=506358
				 * @since 13.0
				 */
				it("Let-computed key object assignment", function(done) {
					var text = 'let key = "z";let { [key]: h } = { z: "bar" };';
					return computeOccurrences(text, getOptions(done, 4, 7), [{start:4, end:7}, {start:21, end:24}]);
				});
			});
			describe("For-of", function() {
				/**
				 * @since 13.0
				 */
				it("Simple for-of", function(done) {
					var text = "for(a of {}) {console.log(a);}";
					return computeOccurrences(text, getOptions(done, 4, 5), [{start:4, end:5}, {start:26, end:27}]);
				});
				/**
				 * @since 13.0
				 */
				it("Simple for-of object variable", function(done) {
					var text = "for(a of b) {console.log(a, b);}";
					return computeOccurrences(text, getOptions(done, 4, 5), [{start:4, end:5}, {start:25, end:26}]);
				});
			});
			describe('Arrow Function', function(){
				/**
				 * @see https://bugs.eclipse.org/bugs/show_bug.cgi?id=471011
				 * @since 10.0
				 */
				it('arrow function expression 1', function(done) {
					var text = "n => {n.length;}";
					return computeOccurrences(text, getOptions(done, 0,1), [{start:0, end:1}, {start:6, end:7}]);
				});
				/**
				 * @see https://bugs.eclipse.org/bugs/show_bug.cgi?id=471011
				 * @since 10.0
				 */
				it('arrow function expression 2', function(done) {
					var text = "var n = 10; n => {n.length;}";
					return computeOccurrences(text, getOptions(done, 12,13), [{start:12, end:13}, {start:18, end:19}]);
				});
				/**
				 * @see https://bugs.eclipse.org/bugs/show_bug.cgi?id=471011
				 * @since 10.0
				 */
				it('arrow function expression 3', function(done) {
					var text = "n => f => {n.length;}";
					return computeOccurrences(text, getOptions(done, 11,12), [{start:0, end:1}, {start:11, end:12}]);
				});
				/**
				 * @see https://bugs.eclipse.org/bugs/show_bug.cgi?id=471011
				 * @since 10.0
				 */
				it('arrow function expression 4', function(done) {
					var text = "var n = 'hello'; n => f => {n.length;}";
					return computeOccurrences(text, getOptions(done, 17,18), [{start:17, end:18}, {start:28, end:29}]);
				});
				/**
				 * @see https://bugs.eclipse.org/bugs/show_bug.cgi?id=471011
				 * @since 10.0
				 */
				it('arrow function expression 5', function(done) {
					var text = "var n = []; n.map(n => {n.length;});";
					return computeOccurrences(text, getOptions(done, 18,18), [{start:18, end:19}, {start:24, end:25}]);
				});
				/**
				 * @see https://bugs.eclipse.org/bugs/show_bug.cgi?id=471011
				 * @since 10.0
				 */
				it('arrow function expression 6', function(done) {
					var text = "var n = []; n.map(n => {n.length;});";
					return computeOccurrences(text, getOptions(done, 12, 12), [{start:4, end:5}, {start:12, end:13}]);
				});
				/**
				 * @see https://bugs.eclipse.org/bugs/show_bug.cgi?id=471011
				 * @since 10.0
				 */
				it('arrow function expression 7', function(done) {
					var text = "var n = []; n.map(n => n => {n.length;});";
					return computeOccurrences(text, getOptions(done, 12, 12), [{start:4, end:5}, {start:12, end:13}]);
				});
				/**
				 * @see https://bugs.eclipse.org/bugs/show_bug.cgi?id=471011
				 * @since 10.0
				 */
				it('arrow function expression 8', function(done) {
					var text = "var n = []; n.map(n => n => {n.length;});";
					return computeOccurrences(text, getOptions(done, 24, 24), [{start:23, end:24}, {start:29, end:30}]);
				});
			});
			describe('Let and Const', function(){
				/**
				 * @see https://bugs.eclipse.org/bugs/show_bug.cgi?id=530787
				 */
				it('Const trailing inner scopes', function(done) {
					var text = "function f() {if(true) {}const c = 1;}";
					return computeOccurrences(text, getOptions(done, 31, 31), [{start:31, end:32}]);
				});
				/**
				 * @see https://bugs.eclipse.org/bugs/show_bug.cgi?id=530787
				 */
				it('Const trailing inner scope with nested same name', function(done) {
					var text = "function f() {if(true) {const c = 43;}const c = 1;}";
					return computeOccurrences(text, getOptions(done, 44, 44), [{start:44, end:45}]);
				});
				/**
				 * @see https://bugs.eclipse.org/bugs/show_bug.cgi?id=530787
				 */
				it('Const trailing inner scope with nested same name 2', function(done) {
					var text = "function f() {if(true) {const c = 43;}const c = 1;}";
					return computeOccurrences(text, getOptions(done, 31, 31), [{start:30, end:31}]);
				});
				it('Const basic 1', function(done) {
					var text = "if (true) { const a=3; a++; }";
					return computeOccurrences(text, getOptions(done, 18, 19), [{start:18, end:19}, {start:23, end:24}]);
				});
				it('Const basic 2', function(done) {
					var text = "if (true) { const a=3; a++; }";
					return computeOccurrences(text, getOptions(done, 23, 23), [{start:18, end:19}, {start:23, end:24}]);
				});
				it('Let basic 1', function(done) {
					var text = "if (true) { let a; a=3; a++; }";
					return computeOccurrences(text, getOptions(done, 16, 17), [{start:16, end:17}, {start:19, end:20}, {start:24, end:25}]);
				});
				it('Let basic 2', function(done) {
					var text = "if (true) { let a; a=3; a++; }";
					return computeOccurrences(text, getOptions(done, 19, 19), [{start:16, end:17}, {start:19, end:20}, {start:24, end:25}]);
				});
				it('Let basic 3', function(done) {
					var text = "if (true) { let a; a=3; a++; }";
					return computeOccurrences(text, getOptions(done, 25, 25), [{start:16, end:17}, {start:19, end:20}, {start:24, end:25}]);
				});
				it('Const scoping program define 1', function(done) {
					var text = "const a; a++; { a++; } a++;";
					return computeOccurrences(text, getOptions(done, 6, 6), [{start:6, end:7}, {start:9, end:10}, {start:16, end:17}, {start:23, end:24}]);
				});
				it('Const scoping program define 2', function(done) {
					var text = "const a; a++; { a++; } a++;";
					return computeOccurrences(text, getOptions(done, 9, 10), [{start:6, end:7}, {start:9, end:10}, {start:16, end:17}, {start:23, end:24}]);
				});
				it('Const scoping program define 3', function(done) {
					var text = "const a; a++; { a++; } a++;";
					return computeOccurrences(text, getOptions(done, 17, 17), [{start:6, end:7}, {start:9, end:10}, {start:16, end:17}, {start:23, end:24}]);
				});
				it('Const scoping program define 4', function(done) {
					var text = "const a; a++; { a++; } a++;";
					return computeOccurrences(text, getOptions(done, 23, 23), [{start:6, end:7}, {start:9, end:10}, {start:16, end:17}, {start:23, end:24}]);
				});
				it('Let scoping program define 1', function(done) {
					var text = "let a; a++; { a++; } a++;";
					return computeOccurrences(text, getOptions(done, 4, 4), [{start:4, end:5}, {start:7, end:8}, {start:14, end:15}, {start:21, end:22}]);
				});
				it('Let scoping program define 2', function(done) {
					var text = "let a; a++; { a++; } a++;";
					return computeOccurrences(text, getOptions(done, 7, 8), [{start:4, end:5}, {start:7, end:8}, {start:14, end:15}, {start:21, end:22}]);
				});
				it('Let scoping program define 3', function(done) {
					var text = "let a; a++; { a++; } a++;";
					return computeOccurrences(text, getOptions(done, 15, 15), [{start:4, end:5}, {start:7, end:8}, {start:14, end:15}, {start:21, end:22}]);
				});
				it('Let scoping program define 4', function(done) {
					var text = "let a; a++; { a++; } a++;";
					return computeOccurrences(text, getOptions(done, 21, 21), [{start:4, end:5}, {start:7, end:8}, {start:14, end:15}, {start:21, end:22}]);
				});
				it('Const scoping block define 1', function(done) {
					var text = "a++; { const a; a++; } a++;";
					return computeOccurrences(text, getOptions(done, 1, 1), [{start:0, end:1}, {start:23, end:24}]);
				});
				it('Const scoping block define 2', function(done) {
					var text = "a++; { const a; a++; } a++;";
					return computeOccurrences(text, getOptions(done, 23, 24), [{start:0, end:1}, {start:23, end:24}]);
				});
				it('Const scoping block define 3', function(done) {
					var text = "a++; { const a; a++; } a++;";
					return computeOccurrences(text, getOptions(done, 13, 14), [{start:13, end:14}, {start:16, end:17}]);
				});
				it('Const scoping block define 4', function(done) {
					var text = "a++; { const a; a++; } a++;";
					return computeOccurrences(text, getOptions(done, 17, 17), [{start:13, end:14}, {start:16, end:17}]);
				});
				it('Let scoping block define 1', function(done) {
					var text = "a++; { let a; a++; } a++;";
					return computeOccurrences(text, getOptions(done, 1, 1), [{start:0, end:1}, {start:21, end:22}]);
				});
				it('Let scoping block define 2', function(done) {
					var text = "a++; { let a; a++; } a++;";
					return computeOccurrences(text, getOptions(done, 21, 22), [{start:0, end:1}, {start:21, end:22}]);
				});
				it('Let scoping block define 3', function(done) {
					var text = "a++; { let a; a++; } a++;";
					return computeOccurrences(text, getOptions(done, 11, 12), [{start:11, end:12}, {start:14, end:15}]);
				});
				it('Let scoping block define 4', function(done) {
					var text = "a++; { let a; a++; } a++;";
					return computeOccurrences(text, getOptions(done, 15, 15), [{start:11, end:12}, {start:14, end:15}]);
				});
				it('Let scoping with redefines 1', function(done) {
					var text = "let a; a++; { let a; a++; } let a; a++;";
					return computeOccurrences(text, getOptions(done, 4, 4), [{start:4, end:5}, {start:7, end:8}, {start:32, end:33}, {start:35, end:36}]);
				});
				it('Let scoping with redefines 2', function(done) {
					var text = "let a; a++; { let a; a++; } let a; a++;";
					return computeOccurrences(text, getOptions(done, 8, 8), [{start:4, end:5}, {start:7, end:8}, {start:32, end:33}, {start:35, end:36}]);
				});
				it('Let scoping with redefines 3', function(done) {
					var text = "let a; a++; { let a; a++; } let a; a++;";
					return computeOccurrences(text, getOptions(done, 32, 33), [{start:4, end:5}, {start:7, end:8}, {start:32, end:33}, {start:35, end:36}]);
				});
				it('Let scoping with redefines 4', function(done) {
					var text = "let a; a++; { let a; a++; } let a; a++;";
					return computeOccurrences(text, getOptions(done, 35, 36), [{start:4, end:5}, {start:7, end:8}, {start:32, end:33}, {start:35, end:36}]);
				});
				it('Let scoping with redefines 5', function(done) {
					var text = "let a; a++; { let a; a++; } let a; a++;";
					return computeOccurrences(text, getOptions(done, 18, 18), [{start:18, end:19}, {start:21, end:22}]);
				});
				it('Let scoping with redefines 6', function(done) {
					var text = "let a; a++; { let a; a++; } let a; a++;";
					return computeOccurrences(text, getOptions(done, 22, 22), [{start:18, end:19}, {start:21, end:22}]);
				});
				it('Let sibling scopes 1', function(done) {
					var text = "a++; { a++; } { let a; } { a++; } a++;";
					return computeOccurrences(text, getOptions(done, 0, 1), [{start:0, end:1}, {start:7, end:8}, {start:27, end:28}, {start:34, end:35}]);
				});
				it('Let sibling scopes 2', function(done) {
					var text = "a++; { a++; } { let a; } { a++; } a++;";
					return computeOccurrences(text, getOptions(done, 8, 8), [{start:0, end:1}, {start:7, end:8}, {start:27, end:28}, {start:34, end:35}]);
				});
				it('Let sibling scopes 3', function(done) {
					var text = "a++; { a++; } { let a; } { a++; } a++;";
					return computeOccurrences(text, getOptions(done, 27, 27), [{start:0, end:1}, {start:7, end:8}, {start:27, end:28}, {start:34, end:35}]);
				});
				it('Let sibling scopes 4', function(done) {
					var text = "a++; { a++; } { let a; } { a++; } a++;";
					return computeOccurrences(text, getOptions(done, 34, 35), [{start:0, end:1}, {start:7, end:8}, {start:27, end:28}, {start:34, end:35}]);
				});
				it('Let sibling scopes 5', function(done) {
					var text = "a++; { a++; } { let a; } { a++; } a++;";
					return computeOccurrences(text, getOptions(done, 20, 21), [{start:20, end:21}]);
				});
				it('Let nested scopes 1', function(done) {
					var text = "a++; { a++; { let a; a++; } }";
					return computeOccurrences(text, getOptions(done, 0, 1), [{start:0, end:1}, {start:7, end:8}]);
				});
				it('Let nested scopes 2', function(done) {
					var text = "a++; { a++; { let a; a++; } }";
					return computeOccurrences(text, getOptions(done, 7, 8), [{start:0, end:1}, {start:7, end:8}]);
				});
				it('Let nested scopes 3', function(done) {
					var text = "a++; { a++; { let a; a++; } }";
					return computeOccurrences(text, getOptions(done, 18, 19), [{start:18, end:19}, {start:21, end:22}]);
				});
				it('Let nested scopes 4', function(done) {
					var text = "a++; { a++; { let a; a++; } }";
					return computeOccurrences(text, getOptions(done, 21, 22), [{start:18, end:19}, {start:21, end:22}]);
				});
				it('Mixed var then let 1', function(done) {
					var text = "var a; a++; { let a; a++ };";
					return computeOccurrences(text, getOptions(done, 4, 4), [{start:4, end:5}, {start:7, end:8}]);
				});
				it('Mixed var then let 2', function(done) {
					var text = "var a; a++; { let a; a++ };";
					return computeOccurrences(text, getOptions(done, 7, 8), [{start:4, end:5}, {start:7, end:8}]);
				});
				it('Mixed var then let 3', function(done) {
					var text = "var a; a++; { let a; a++ };";
					return computeOccurrences(text, getOptions(done, 19, 19), [{start:18, end:19}, {start:21, end:22}]);
				});
				it('Mixed var then let 4', function(done) {
					var text = "var a; a++; { let a; a++ };";
					return computeOccurrences(text, getOptions(done, 21, 21), [{start:18, end:19}, {start:21, end:22}]);
				});
				it('Mixed var then const 1', function(done) {
					var text = "var a; a++; { const a; a++ };";
					return computeOccurrences(text, getOptions(done, 4, 4), [{start:4, end:5}, {start:7, end:8}]);
				});
				it('Mixed var then const 2', function(done) {
					var text = "var a; a++; { const a; a++ };";
					return computeOccurrences(text, getOptions(done, 7, 8), [{start:4, end:5}, {start:7, end:8}]);
				});
				it('Mixed var then const 3', function(done) {
					var text = "var a; a++; { const a; a++ };";
					return computeOccurrences(text, getOptions(done, 21, 21), [{start:20, end:21}, {start:23, end:24}]);
				});
				it('Mixed var then const 4', function(done) {
					var text = "var a; a++; { const a; a++ };";
					return computeOccurrences(text, getOptions(done, 23, 23), [{start:20, end:21}, {start:23, end:24}]);
				});
				it('Mixed let then var 1', function(done) {
					var text = "let a; a++; { var a; a++ };";
					return computeOccurrences(text, getOptions(done, 4, 4), [{start:4, end:5}, {start:7, end:8}]);
				});
				it('Mixed let then var 2', function(done) {
					var text = "let a; a++; { var a; a++ };";
					return computeOccurrences(text, getOptions(done, 7, 8), [{start:4, end:5}, {start:7, end:8}]);
				});
				it('Mixed let then var 3', function(done) {
					var text = "let a; a++; { var a; a++ };";
					return computeOccurrences(text, getOptions(done, 19, 19), [{start:18, end:19}, {start:21, end:22}]);
				});
				it('Mixed let then var 4', function(done) {
					var text = "let a; a++; { var a; a++ };";
					return computeOccurrences(text, getOptions(done, 21, 21), [{start:18, end:19}, {start:21, end:22}]);
				});
				it('Mixed let then const 1', function(done) {
					var text = "let a; a++; { const a; a++ };";
					return computeOccurrences(text, getOptions(done, 4, 4), [{start:4, end:5}, {start:7, end:8}]);
				});
				it('Mixed let then const 2', function(done) {
					var text = "let a; a++; { const a; a++ };";
					return computeOccurrences(text, getOptions(done, 7, 8), [{start:4, end:5}, {start:7, end:8}]);
				});
				it('Mixed let then const 3', function(done) {
					var text = "let a; a++; { const a; a++ };";
					return computeOccurrences(text, getOptions(done, 21, 21), [{start:20, end:21}, {start:23, end:24}]);
				});
				it('Mixed let then const 4', function(done) {
					var text = "let a; a++; { const a; a++ };";
					return computeOccurrences(text, getOptions(done, 23, 23), [{start:20, end:21}, {start:23, end:24}]);
				});
				it('Mixed const then var 1', function(done) {
					var text = "const a; a++; { var a; a++ };";
					return computeOccurrences(text, getOptions(done, 6, 6), [{start:6, end:7}, {start:9, end:10}]);
				});
				it('Mixed const then var 2', function(done) {
					var text = "const a; a++; { var a; a++ };";
					return computeOccurrences(text, getOptions(done, 9, 10), [{start:6, end:7}, {start:9, end:10}]);
				});
				it('Mixed const then var 3', function(done) {
					var text = "const a; a++; { var a; a++ };";
					return computeOccurrences(text, getOptions(done, 21, 21), [{start:20, end:21}, {start:23, end:24}]);
				});
				it('Mixed const then var 4', function(done) {
					var text = "const a; a++; { var a; a++ };";
					return computeOccurrences(text, getOptions(done, 23, 23), [{start:20, end:21}, {start:23, end:24}]);
				});
				it('Mixed const then let 1', function(done) {
					var text = "const a; a++; { let a; a++ };";
					return computeOccurrences(text, getOptions(done, 6, 6), [{start:6, end:7}, {start:9, end:10}]);
				});
				it('Mixed const then let 2', function(done) {
					var text = "const a; a++; { let a; a++ };";
					return computeOccurrences(text, getOptions(done, 9, 10), [{start:6, end:7}, {start:9, end:10}]);
				});
				it('Mixed const then let 3', function(done) {
					var text = "const a; a++; { let a; a++ };";
					return computeOccurrences(text, getOptions(done, 21, 21), [{start:20, end:21}, {start:23, end:24}]);
				});
				it('Mixed const then let 4', function(done) {
					var text = "const a; a++; { let a; a++ };";
					return computeOccurrences(text, getOptions(done, 23, 23), [{start:20, end:21}, {start:23, end:24}]);
				});
				
				/*
				 * The behaviour of occurrences here is a little odd, but running this code is an error
				 */
				it('Let hoisting in temporal dead zone 1', function(done) {
					var text = "{ a++; b++; let a; } a++;";
					return computeOccurrences(text, getOptions(done, 2, 2), [{start:16, end:17}]);
				});
				it('Let hoisting in temporal dead zone 2', function(done) {
					var text = "{ a++; b++; let a; } a++;";
					return computeOccurrences(text, getOptions(done, 16, 16), [{start:16, end:17}]);
				});
			});
			describe('Generators', function(){
				it('Generators 1', function(done) {
					var text = "function* a(a) { yield a+1; } function* b(b){ yield b; yield* a(b); } a(1); b(1);";
					return computeOccurrences(text, getOptions(done, 10, 10), [{start:10, end:11}, {start:62, end:63}, {start:70, end:71}]);
				});
				it('Generators 2', function(done) {
					var text = "function* a(a) { yield a+1; } function* b(b){ yield b; yield* a(b); } a(1); b(1);";
					return computeOccurrences(text, getOptions(done, 63, 63), [{start:10, end:11}, {start:62, end:63}, {start:70, end:71}]);
				});
				it('Generators 3', function(done) {
					var text = "function* a(a) { yield a+1; } function* b(b){ yield b; yield* a(b); } a(1); b(1);";
					return computeOccurrences(text, getOptions(done, 70, 71), [{start:10, end:11}, {start:62, end:63}, {start:70, end:71}]);
				});
				it('Generators 4', function(done) {
					var text = "function* a(a) { yield a+1; } function* b(b){ yield b; yield* a(b); } a(1); b(1);";
					return computeOccurrences(text, getOptions(done, 12, 13), [{start:12, end:13}, {start:23, end:24}]);
				});
				it('Generators 5', function(done) {
					var text = "function* a(a) { yield a+1; } function* b(b){ yield b; yield* a(b); } a(1); b(1);";
					return computeOccurrences(text, getOptions(done, 24, 24), [{start:12, end:13}, {start:23, end:24}]);
				});
				it('Generators 6', function(done) {
					var text = "function* a(a) { yield a+1; } function* b(b){ yield b; yield* a(b); } a(1); b(1);";
					return computeOccurrences(text, getOptions(done, 40, 41), [{start:40, end:41}, {start:76, end:77}]);
				});
				it('Generators 7', function(done) {
					var text = "function* a(a) { yield a+1; } function* b(b){ yield b; yield* a(b); } a(1); b(1);";
					return computeOccurrences(text, getOptions(done, 76, 76), [{start:40, end:41}, {start:76, end:77}]);
				});
				it('Generators 8', function(done) {
					var text = "function* a(a) { yield a+1; } function* b(b){ yield b; yield* a(b); } a(1); b(1);";
					return computeOccurrences(text, getOptions(done, 43, 43), [{start:42, end:43}, {start:52, end:53}, {start:64, end:65}]);
				});
				it('Generators 9', function(done) {
					var text = "function* a(a) { yield a+1; } function* b(b){ yield b; yield* a(b); } a(1); b(1);";
					return computeOccurrences(text, getOptions(done, 43, 43), [{start:42, end:43}, {start:52, end:53}, {start:64, end:65}]);
				});
				it('Generators 10', function(done) {
					var text = "function* a(a) { yield a+1; } function* b(b){ yield b; yield* a(b); } a(1); b(1);";
					return computeOccurrences(text, getOptions(done, 43, 43), [{start:42, end:43}, {start:52, end:53}, {start:64, end:65}]);
				});
			});
			describe('Classes and constructors', function(){
				it('Class declaration 1', function(done) {
					var text = "class a { constructor(a, b=a) { a++ } a(a, b=a){ return a; } }; new a();";
					return computeOccurrences(text, getOptions(done, 6, 6), [{start:6, end:7}, {start:68, end:69}]);
				});
				it('Class declaration 2', function(done) {
					var text = "class a { constructor(a, b=a) { a++ } a(a, b=a){ return a; } }; new a();";
					return computeOccurrences(text, getOptions(done, 68, 69), [{start:6, end:7}, {start:68, end:69}]);
				});
				it('Class declaration 3', function(done) {
					var text = "class a { constructor(a, b=a) { a++ } a(a, b=a){ return a; } }; new a();";
					return computeOccurrences(text, getOptions(done, 22, 22), [{start:22, end:23}, {start:27, end:28}, {start:32, end:33}]);
				});
				it('Class declaration 4', function(done) {
					var text = "class a { constructor(a, b=a) { a++ } a(a, b=a){ return a; } }; new a();";
					return computeOccurrences(text, getOptions(done, 28, 28), [{start:22, end:23}, {start:27, end:28}, {start:32, end:33}]);
				});
				it('Class declaration 5', function(done) {
					var text = "class a { constructor(a, b=a) { a++ } a(a, b=a){ return a; } }; new a();";
					return computeOccurrences(text, getOptions(done, 32, 32), [{start:22, end:23}, {start:27, end:28}, {start:32, end:33}]);
				});
				// TODO https://bugs.eclipse.org/bugs/show_bug.cgi?id=494056
				it.skip('Class declaration 6', function(done) {
					var text = "class a { constructor(a, b=a) { a++ } a(a, b=a){ return a; } }; new a();";
					return computeOccurrences(text, getOptions(done, 38, 38), [{start:38, end:39}]);
				});
				it('Class declaration 7', function(done) {
					var text = "class a { constructor(a, b=a) { a++ } a(a, b=a){ return a; } }; new a();";
					return computeOccurrences(text, getOptions(done, 40, 41), [{start:40, end:41}, {start:45, end:46}, {start:56, end:57}]);
				});
				it('Class declaration 8', function(done) {
					var text = "class a { constructor(a, b=a) { a++ } a(a, b=a){ return a; } }; new a();";
					return computeOccurrences(text, getOptions(done, 45, 45), [{start:40, end:41}, {start:45, end:46}, {start:56, end:57}]);
				});
				it('Class declaration 9', function(done) {
					var text = "class a { constructor(a, b=a) { a++ } a(a, b=a){ return a; } }; new a();";
					return computeOccurrences(text, getOptions(done, 56, 56), [{start:40, end:41}, {start:45, end:46}, {start:56, end:57}]);
				});
				
				it('Class expression 1', function(done) {
					var text = "var a = class { constructor(a, b=a) { a++ } a(a, b=a){ return a; } }; new a();";
					return computeOccurrences(text, getOptions(done, 4, 4), [{start:4, end:5}, {start:74, end:75}]);
				});
				it('Class expression 2', function(done) {
					var text = "var a = class { constructor(a, b=a) { a++ } a(a, b=a){ return a; } }; new a();";
					return computeOccurrences(text, getOptions(done, 74, 74), [{start:4, end:5}, {start:74, end:75}]);
				});
				it('Class expression 3', function(done) {
					var text = "var a = class { constructor(a, b=a) { a++ } a(a, b=a){ return a; } }; new a();";
					return computeOccurrences(text, getOptions(done, 28, 29), [{start:28, end:29}, {start:33, end:34}, {start:38, end:39}]);
				});
				it('Class expression 4', function(done) {
					var text = "var a = class { constructor(a, b=a) { a++ } a(a, b=a){ return a; } }; new a();";
					return computeOccurrences(text, getOptions(done, 33, 34), [{start:28, end:29}, {start:33, end:34}, {start:38, end:39}]);
				});
				it('Class expression 5', function(done) {
					var text = "var a = class { constructor(a, b=a) { a++ } a(a, b=a){ return a; } }; new a();";
					return computeOccurrences(text, getOptions(done, 39, 39), [{start:28, end:29}, {start:33, end:34}, {start:38, end:39}]);
				});
				it('Class expression 6', function(done) {
					var text = "var a = class { constructor(a, b=a) { a++ } a(a, b=a){ return a; } }; new a();";
					return computeOccurrences(text, getOptions(done, 44, 44), [{start:44, end:45}]);
				});
				it('Class expression 7', function(done) {
					var text = "var a = class { constructor(a, b=a) { a++ } a(a, b=a){ return a; } }; new a();";
					return computeOccurrences(text, getOptions(done, 46, 47), [{start:46, end:47}, {start:51, end:52}, {start:62, end:63}]);
				});
				it('Class expression 8', function(done) {
					var text = "var a = class { constructor(a, b=a) { a++ } a(a, b=a){ return a; } }; new a();";
					return computeOccurrences(text, getOptions(done, 52, 52), [{start:46, end:47}, {start:51, end:52}, {start:62, end:63}]);
				});
				it('Class expression 9', function(done) {
					var text = "var a = class { constructor(a, b=a) { a++ } a(a, b=a){ return a; } }; new a();";
					return computeOccurrences(text, getOptions(done, 62, 62), [{start:46, end:47}, {start:51, end:52}, {start:62, end:63}]);
				});
				
				it('Named class expression 1', function(done) {
					var text = "var a = class a { constructor(a, b=a) { a++ } a(a, b=a){ return a; } z(){ a.a(); } }; new a();";
					return computeOccurrences(text, getOptions(done, 4, 4), [{start:4, end:5}, {start:90, end:91}]);
				});
				it('Named class expression 2', function(done) {
					var text = "var a = class a { constructor(a, b=a) { a++ } a(a, b=a){ return a; } z(){ a.a(); } }; new a();";
					return computeOccurrences(text, getOptions(done, 90, 90), [{start:4, end:5}, {start:90, end:91}]);
				});
				// TODO https://bugs.eclipse.org/bugs/show_bug.cgi?id=494056
				it.skip('Named class expression 3', function(done) {
					var text = "var a = class a { constructor(a, b=a) { a++ } a(a, b=a){ return a; } z(){ a.a(); } }; new a();";
					return computeOccurrences(text, getOptions(done, 14, 14), [{start:14, end:15}, {start:74, end:75}]);
				});
				// TODO https://bugs.eclipse.org/bugs/show_bug.cgi?id=494056
				it.skip('Named class expression 4', function(done) {
					var text = "var a = class a { constructor(a, b=a) { a++ } a(a, b=a){ return a; } z(){ a.a(); } }; new a();";
					return computeOccurrences(text, getOptions(done, 74, 75), [{start:14, end:15}, {start:74, end:75}]);
				});
				it('Named class expression 5', function(done) {
					var text = "var a = class a { constructor(a, b=a) { a++ } a(a, b=a){ return a; } z(){ a.a(); } }; new a();";
					return computeOccurrences(text, getOptions(done, 30, 31), [{start:30, end:31}, {start:35, end:36}, {start:40, end:41}]);
				});
				it('Named class expression 6', function(done) {
					var text = "var a = class a { constructor(a, b=a) { a++ } a(a, b=a){ return a; } z(){ a.a(); } }; new a();";
					return computeOccurrences(text, getOptions(done, 35, 35), [{start:30, end:31}, {start:35, end:36}, {start:40, end:41}]);
				});
				it('Named class expression 7', function(done) {
					var text = "var a = class a { constructor(a, b=a) { a++ } a(a, b=a){ return a; } z(){ a.a(); } }; new a();";
					return computeOccurrences(text, getOptions(done, 41, 41), [{start:30, end:31}, {start:35, end:36}, {start:40, end:41}]);
				});
				// TODO Recognize method names as object properties, also https://bugs.eclipse.org/bugs/show_bug.cgi?id=494056
				it.skip('Named class expression 8', function(done) {
					var text = "var a = class a { constructor(a, b=a) { a++ } a(a, b=a){ return a; } z(){ a.a(); } }; new a();";
					return computeOccurrences(text, getOptions(done, 46, 47), [{start:46, end:47}, {start:76, end:77}]);
				});
				// TODO Recognize method names as object properties, also https://bugs.eclipse.org/bugs/show_bug.cgi?id=494056
				it.skip('Named class expression 9', function(done) {
					var text = "var a = class a { constructor(a, b=a) { a++ } a(a, b=a){ return a; } z(){ a.a(); } }; new a();";
					return computeOccurrences(text, getOptions(done, 77, 77), [{start:46, end:47}, {start:76, end:77}]);
				});
				it('Named class expression 10', function(done) {
					var text = "var a = class a { constructor(a, b=a) { a++ } a(a, b=a){ return a; } z(){ a.a(); } }; new a();";
					return computeOccurrences(text, getOptions(done, 48, 49), [{start:48, end:49}, {start:53, end:54}, {start:64, end:65}]);
				});
				it('Named class expression 11', function(done) {
					var text = "var a = class a { constructor(a, b=a) { a++ } a(a, b=a){ return a; } z(){ a.a(); } }; new a();";
					return computeOccurrences(text, getOptions(done, 48, 49), [{start:48, end:49}, {start:53, end:54}, {start:64, end:65}]);
				});
				it('Named class expression 12', function(done) {
					var text = "var a = class a { constructor(a, b=a) { a++ } a(a, b=a){ return a; } z(){ a.a(); } }; new a();";
					return computeOccurrences(text, getOptions(done, 48, 49), [{start:48, end:49}, {start:53, end:54}, {start:64, end:65}]);
				});
				
				it('Class declaration this occurrence 1', function(done) {
					var text = "this.a(); class z { a(){} b(){ this.a(); } }; new z(); this.a();";
					return computeOccurrences(text, getOptions(done, 2, 2), [{start:0, end:4}, {start:55, end:59}]);
				});
				it('Class declaration this occurrence 2', function(done) {
					var text = "this.a(); class z { a(){} b(){ this.a(); } }; new z(); this.a();";
					return computeOccurrences(text, getOptions(done, 33, 34), [{start:31, end:35}]);
				});
				it('Class declaration this occurrence 3', function(done) {
					var text = "this.a(); class z { a(){} b(){ this.a(); } }; new z(); this.a();";
					return computeOccurrences(text, getOptions(done, 59, 59), [{start:0, end:4}, {start:55, end:59}]);
				});
				it('Class expression this occurrence 1', function(done) {
					var text = "this.a(); var z = class { a(){} b(){ this.a(); } }; new z(); this.a();";
					return computeOccurrences(text, getOptions(done, 2, 2), [{start:0, end:4}, {start:61, end:65}]);
				});
				it('Class expression this occurrence 2', function(done) {
					var text = "this.a(); var z = class { a(){} b(){ this.a(); } }; new z(); this.a();";
					return computeOccurrences(text, getOptions(done, 39, 40), [{start:37, end:41}]);
				});
				it('Class expression this occurrence 3', function(done) {
					var text = "this.a(); var z = class { a(){} b(){ this.a(); } }; new z(); this.a();";
					return computeOccurrences(text, getOptions(done, 61, 65), [{start:0, end:4}, {start:61, end:65}]);
				});
				
				it('Extends class 1', function(done) {
					var text = "class a{}; class b extends a{};";
					return computeOccurrences(text, getOptions(done, 6, 6), [{start:6, end:7}, {start:27, end:28}]);
				});
				it('Extends class 2', function(done) {
					var text = "class a{}; class b extends a{};";
					return computeOccurrences(text, getOptions(done, 27, 27), [{start:6, end:7}, {start:27, end:28}]);
				});
				it('Extends function 1', function(done) {
					var text = "function a(){}; class b extends a{};";
					return computeOccurrences(text, getOptions(done, 9, 9), [{start:9, end:10}, {start:32, end:33}]);
				});
				it('Extends function 2', function(done) {
					var text = "function a(){}; class b extends a{};";
					return computeOccurrences(text, getOptions(done, 32, 32), [{start:9, end:10}, {start:32, end:33}]);
				});
				
				it('Named class declaration no spaces 1', function(done) {
					var text = "class a{}";
					return computeOccurrences(text, getOptions(done, 6, 6), [{start:6, end:7}]);
				});
				it('Named class declaration no spaces 2', function(done) {
					var text = "class a{}";
					return computeOccurrences(text, getOptions(done, 6, 7), [{start:6, end:7}]);
				});
				it('Named class declaration no spaces 3', function(done) {
					var text = "class a{}";
					return computeOccurrences(text, getOptions(done, 7, 7), [{start:6, end:7}]);
				});
				it('Named class expression no spaces 1', function(done) {
					var text = "var a = class b{};";
					return computeOccurrences(text, getOptions(done, 14, 14), [{start:14, end:15}]);
				});
				it('Named class expression no spaces 2', function(done) {
					var text = "var a = class b{};";
					return computeOccurrences(text, getOptions(done, 14, 15), [{start:14, end:15}]);
				});
				it('Named class expression no spaces 3', function(done) {
					var text = "var a = class b{};";
					return computeOccurrences(text, getOptions(done, 15, 15), [{start:14, end:15}]);
				});
				it('Named method declaration no spaces 1', function(done) {
					var text = "class a{ f(){} };";
					return computeOccurrences(text, getOptions(done, 9, 9), [{start:9, end:10}]);
				});
				it('Named method declaration no spaces 2', function(done) {
					var text = "class a{ f(){} };";
					return computeOccurrences(text, getOptions(done, 9, 10), [{start:9, end:10}]);
				});
				it('Named method declaration no spaces 3', function(done) {
					var text = "class a{ f(){} };";
					return computeOccurrences(text, getOptions(done, 10, 10), [{start:9, end:10}]);
				});
				
				// TODO Recognize method declarations as this properties, see above bugs marked TODO and the following
//				it('Class declaration this property reference', function(done) {
//					var text = "class z { a(){} b(){ this.a(); } }; new z();";
//					return computeOccurrences(text, getOptions(done, 10, 11), [{start:10, end:11}, {start:26, end:27}]);
//				});
//				it('Class expression this property reference', function(done) {
//					var text = "var z = class { a(){} b(){ this.a() } }; new z();";
//					return computeOccurrences(text, getOptions(done, 16, 17), [{start:16, end:17}, {start:32, end:33}]);
//				});
			}); 
			describe('Default parameters', function(){
				it('Func decl default param 1', function(done) {
					var text = "function myFunc(a = 4){ a++; } a = 'String';";
					return computeOccurrences(text, getOptions(done, 16, 16), [{start:16, end:17}, {start:24, end:25}]);
				});
				it('Func decl default param 2', function(done) {
					var text = "function myFunc(a = 4){ a++; } a = 'String';";
					return computeOccurrences(text, getOptions(done, 24, 24), [{start:16, end:17}, {start:24, end:25}]);
				});
				it('Func decl default param 3', function(done) {
					var text = "function myFunc(a = 4){ a++; } a = 'String';";
					return computeOccurrences(text, getOptions(done, 31, 31), [{start:31, end:32}]);
				});
				it('Reused default param 1', function(done) {
					var text = "function myFunc(a = 4, b = a){ a++; } a = 'String';";
					return computeOccurrences(text, getOptions(done, 16, 16), [{start:16, end:17}, {start:27, end:28}, {start:31, end:32}]);
				});
				it('Reused default param 2', function(done) {
					var text = "function myFunc(a = 4, b = a){ a++; } a = 'String';";
					return computeOccurrences(text, getOptions(done, 27, 27), [{start:16, end:17}, {start:27, end:28}, {start:31, end:32}]);
				});
				it('Reused default param 3', function(done) {
					var text = "function myFunc(a = 4, b = a){ a++; } a = 'String';";
					return computeOccurrences(text, getOptions(done, 31, 32), [{start:16, end:17}, {start:27, end:28}, {start:31, end:32}]);
				});
				it('Reused default param 4', function(done) {
					var text = "function myFunc(a = 4, b = a){ a++; } a = 'String';";
					return computeOccurrences(text, getOptions(done, 39, 39), [{start:38, end:39}]);
				});
				it('Reused default in expression param 1', function(done) {
					var text = "function myFunc(a = 4, b = a+1){ a++; } a = 'String';";
					return computeOccurrences(text, getOptions(done, 16, 16), [{start:16, end:17}, {start:27, end:28}, {start:33, end:34}]);
				});
				it('Reused default in expression param 2', function(done) {
					var text = "function myFunc(a = 4, b = a+1){ a++; } a = 'String';";
					return computeOccurrences(text, getOptions(done, 27, 27), [{start:16, end:17}, {start:27, end:28}, {start:33, end:34}]);
				});
				it('Reused default in expression param 3', function(done) {
					var text = "function myFunc(a = 4, b = a+1){ a++; } a = 'String';";
					return computeOccurrences(text, getOptions(done, 33, 34), [{start:16, end:17}, {start:27, end:28}, {start:33, end:34}]);
				});
				it('Reused default in expression param 4', function(done) {
					var text = "function myFunc(a = 4, b = a+1){ a++; } a = 'String';";
					return computeOccurrences(text, getOptions(done, 41, 41), [{start:40, end:41}]);
				});
				it('Func expr default param 1', function(done) {
					var text = "var a = { a: function(a, b = a+1){ a++;	} }; a++;";
					return computeOccurrences(text, getOptions(done, 4, 4), [{start:4, end:5}, {start:45, end:46}]);
				});
				it('Func expr default param 2', function(done) {
					var text = "var a = { a: function(a, b = a+1){ a++;	} }; a++;";
					return computeOccurrences(text, getOptions(done, 10, 11), [{start:10, end:11}]);
				});
				it('Func expr default param 3', function(done) {
					var text = "var a = { a: function(a, b = a+1){ a++;	} }; a++;";
					return computeOccurrences(text, getOptions(done, 22, 23), [{start:22, end:23}, {start:29, end:30}, {start:35, end:36}]);
				});
				it('Func expr default param 4', function(done) {
					var text = "var a = { a: function(a, b = a+1){ a++;	} }; a++;";
					return computeOccurrences(text, getOptions(done, 29, 29), [{start:22, end:23}, {start:29, end:30}, {start:35, end:36}]);
				});
				it('Func expr default param 5', function(done) {
					var text = "var a = { a: function(a, b = a+1){ a++;	} }; a++;";
					return computeOccurrences(text, getOptions(done, 35, 36), [{start:22, end:23}, {start:29, end:30}, {start:35, end:36}]);
				});
				it('Func expr default param 6', function(done) {
					var text = "var a = { a: function(a, b = a+1){ a++;	} }; a++;";
					return computeOccurrences(text, getOptions(done, 46, 46), [{start:4, end:5}, {start:45, end:46}]);
				});
				it('Arrow func default param 1', function(done) {
					var text = "var a = (a = 4, b = a+1) => { a++; }; a++;";
					return computeOccurrences(text, getOptions(done, 4, 4), [{start:4, end:5}, {start:38, end:39}]);
				});
				it('Arrow func default param 2', function(done) {
					var text = "var a = (a = 4, b = a+1) => { a++; }; a++;";
					return computeOccurrences(text, getOptions(done, 9, 9), [{start:9, end:10}, {start:20, end:21}, {start:30, end:31}]);
				});
				it('Arrow func default param 3', function(done) {
					var text = "var a = (a = 4, b = a+1) => { a++; }; a++;";
					return computeOccurrences(text, getOptions(done, 20, 20), [{start:9, end:10}, {start:20, end:21}, {start:30, end:31}]);
				});
				it('Arrow func default param 4', function(done) {
					var text = "var a = (a = 4, b = a+1) => { a++; }; a++;";
					return computeOccurrences(text, getOptions(done, 30, 30), [{start:9, end:10}, {start:20, end:21}, {start:30, end:31}]);
				});
				it('Arrow func default param 5', function(done) {
					var text = "var a = (a = 4, b = a+1) => { a++; }; a++;";
					return computeOccurrences(text, getOptions(done, 38, 39), [{start:4, end:5}, {start:38, end:39}]);
				});
			});
			describe('Import / Export declaration', function(){
				it('Named import declaration 1', function(done) {
					worker.createTestFile("a", "");
					var text = "import * as myModule from \"a\"; myModule.doStuff();";
					return computeOccurrences(text, getOptions(done, 17, 17), [{start:12, end:20}, {start:31, end:39}]);
				});
				it('Named import declaration 2', function(done) {
					worker.createTestFile("a", "");
					var text = "import * as myModule from \"a\"; myModule.doStuff();";
					return computeOccurrences(text, getOptions(done, 33, 36), [{start:12, end:20}, {start:31, end:39}]);
				});
				it('Default import declaration 1', function(done) {
					worker.createTestFile("a", "");
					var text = "import myDefMod from \"a\"; myDefMod.doStuff();";
					return computeOccurrences(text, getOptions(done, 12, 12), [{start:7, end:15}, {start:26, end:34}]);
				});
				it('Default import declaration 2', function(done) {
					worker.createTestFile("a", "");
					var text = "import myDefMod from \"a\"; myDefMod.doStuff();";
					return computeOccurrences(text, getOptions(done, 30, 34), [{start:7, end:15}, {start:26, end:34}]);
				});
				it('Multiple named import declaration 1', function(done) {
					worker.createTestFile("a", "");
					var text = "import { myFunc, myVar } from \"a\"; myFunc(); var z = myVar;";
					return computeOccurrences(text, getOptions(done, 9, 15), [{start:9, end:15}, {start:35, end:41}]);
				});
				it('Multiple named import declaration 2', function(done) {
					worker.createTestFile("a", "");
					var text = "import { myFunc, myVar } from \"a\"; myFunc(); var z = myVar;";
					return computeOccurrences(text, getOptions(done, 36, 36), [{start:9, end:15}, {start:35, end:41}]);
				});
				it('Multiple named import declaration 3', function(done) {
					worker.createTestFile("a", "");
					var text = "import { myFunc, myVar } from \"a\"; myFunc(); var z = myVar;";
					return computeOccurrences(text, getOptions(done, 17, 19), [{start:17, end:22}, {start:53, end:58}]);
				});
				it('Multiple named import declaration 4', function(done) {
					worker.createTestFile("a", "");
					var text = "import { myFunc, myVar } from \"a\"; myFunc(); var z = myVar;";
					return computeOccurrences(text, getOptions(done, 54, 55), [{start:17, end:22}, {start:53, end:58}]);
				});
				it('Renamed multiple import declaration 1', function(done) {
					worker.createTestFile("a", "");
					var text = "import { myFunc as ONE, myVar as TWO } from \"a\"; ONE(); var z = TWO; myFunc(); var z = myVar;";
					return computeOccurrences(text, getOptions(done, 19, 21), [{start:19, end:22}, {start:49, end:52}]);
				});
				it('Renamed multiple import declaration 2', function(done) {
					worker.createTestFile("a", "");
					var text = "import { myFunc as ONE, myVar as TWO } from \"a\"; ONE(); var z = TWO; myFunc(); var z = myVar;";
					return computeOccurrences(text, getOptions(done, 19, 21), [{start:19, end:22}, {start:49, end:52}]);
				});
				it('Renamed multiple import declaration 3', function(done) {
					worker.createTestFile("a", "");
					var text = "import { myFunc as ONE, myVar as TWO } from \"a\"; ONE(); var z = TWO; myFunc(); var z = myVar;";
					return computeOccurrences(text, getOptions(done, 33, 34), [{start:33, end:36}, {start:64, end:67}]);
				});
				it('Renamed multiple import declaration 4', function(done) {
					worker.createTestFile("a", "");
					var text = "import { myFunc as ONE, myVar as TWO } from \"a\"; ONE(); var z = TWO; myFunc(); var z = myVar;";
					return computeOccurrences(text, getOptions(done, 65, 65), [{start:33, end:36}, {start:64, end:67}]);
				});
				it('Renamed multiple import declaration 5', function(done) {
					worker.createTestFile("a", "");
					var text = "import { myFunc as ONE, myVar as TWO } from \"a\"; ONE(); var z = TWO; myFunc(); var z = myVar;";
					return computeOccurrences(text, getOptions(done, 9, 15), []);
				});
				it('Renamed multiple import declaration 6', function(done) {
					worker.createTestFile("a", "");
					var text = "import { myFunc as ONE, myVar as TWO } from \"a\"; ONE(); var z = TWO; myFunc(); var z = myVar;";
					return computeOccurrences(text, getOptions(done, 72, 72), [{start:69, end:75}]);
				});
				it('Renamed multiple import declaration 7', function(done) {
					worker.createTestFile("a", "");
					var text = "import { myFunc as ONE, myVar as TWO } from \"a\"; ONE(); var z = TWO; myFunc(); var z = myVar;";
					return computeOccurrences(text, getOptions(done, 24, 26), []);
				});
				it('Renamed multiple import declaration 8', function(done) {
					worker.createTestFile("a", "");
					var text = "import { myFunc as ONE, myVar as TWO } from \"a\"; ONE(); var z = TWO; myFunc(); var z = myVar;";
					return computeOccurrences(text, getOptions(done, 90, 90), [{start:87, end:92}]);
				});
				it('Hoisted named import declaration 1', function(done) {
					worker.createTestFile("a", "");
					var text = "localFunc(); import { myFunc } from 'a'; function localFunc(){ myFunc() };";
					return computeOccurrences(text, getOptions(done, 26, 26), [{start:22, end:28}, {start:63, end:69}]);
				});
				it('Hoisted named import declaration 2', function(done) {
					worker.createTestFile("a", "");
					var text = "localFunc(); import { myFunc } from 'a'; function localFunc(){ myFunc() };";
					return computeOccurrences(text, getOptions(done, 65, 65), [{start:22, end:28}, {start:63, end:69}]);
				});
				it('Named export 1', function(done) {
					var text = "var a = 3; export { a }; a++;";
					return computeOccurrences(text, getOptions(done, 4, 4), [{start:4, end:5}, {start:20, end:21}, {start:25, end:26}]);
				});
				it('Named export 2', function(done) {
					var text = "var a = 3; export { a }; a++;";
					return computeOccurrences(text, getOptions(done, 20, 21), [{start:4, end:5}, {start:20, end:21}, {start:25, end:26}]);
				});
				it('Named export 3', function(done) {
					var text = "var a = 3; export { a }; a++;";
					return computeOccurrences(text, getOptions(done, 25, 25), [{start:4, end:5}, {start:20, end:21}, {start:25, end:26}]);
				});
				it('Multiple named export 1', function(done) {
					var text = "var a = 3; const b = '3'; export { a, b };";
					return computeOccurrences(text, getOptions(done, 4, 4), [{start:4, end:5}, {start:35, end:36}]);
				});
				it('Multiple named export 2', function(done) {
					var text = "var a = 3; const b = '3'; export { a, b };";
					return computeOccurrences(text, getOptions(done, 35, 36), [{start:4, end:5}, {start:35, end:36}]);
				});
				it('Multiple named export 3', function(done) {
					var text = "var a = 3; const b = '3'; export { a, b };";
					return computeOccurrences(text, getOptions(done, 17, 18), [{start:17, end:18}, {start:38, end:39}]);
				});
				it('Multiple named export 4', function(done) {
					var text = "var a = 3; const b = '3'; export { a, b };";
					return computeOccurrences(text, getOptions(done, 39, 39), [{start:17, end:18}, {start:38, end:39}]);
				});
				it('Inline expression export 1', function(done) {
					var text = "a++; export let a = 4; a++;";
					return computeOccurrences(text, getOptions(done, 0, 0), [{start:0, end:1}, {start:16, end:17}, {start:23, end:24}]);
				});
				it('Inline expression export 2', function(done) {
					var text = "a++; export let a = 4; a++;";
					return computeOccurrences(text, getOptions(done, 16, 16), [{start:0, end:1}, {start:16, end:17}, {start:23, end:24}]);
				});
				it('Inline expression export 3', function(done) {
					var text = "a++; export let a = 4; a++;";
					return computeOccurrences(text, getOptions(done, 23, 23), [{start:0, end:1}, {start:16, end:17}, {start:23, end:24}]);
				});
				it('Inline expression export 1', function(done) {
					var text = "a++; export let a = 4; a++;";
					return computeOccurrences(text, getOptions(done, 0, 0), [{start:0, end:1}, {start:16, end:17}, {start:23, end:24}]);
				});
				it('Renamed export 1', function(done) {
					var text = "var a = 3; export { a as b }; a++; b++;";
					return computeOccurrences(text, getOptions(done, 4, 4), [{start:4, end:5}, {start:20, end:21}, {start:30, end:31}]);
				});
				it('Renamed export 2', function(done) {
					var text = "var a = 3; export { a as b }; a++; b++;";
					return computeOccurrences(text, getOptions(done, 21, 21), [{start:4, end:5}, {start:20, end:21}, {start:30, end:31}]);
				});
				it('Renamed export 3', function(done) {
					var text = "var a = 3; export { a as b }; a++; b++;";
					return computeOccurrences(text, getOptions(done, 30, 31), [{start:4, end:5}, {start:20, end:21}, {start:30, end:31}]);
				});
				it('Renamed export 4', function(done) {
					var text = "var a = 3; export { a as b }; a++; b++;";
					return computeOccurrences(text, getOptions(done, 25, 26), []);
				});
				it('Renamed export 5', function(done) {
					var text = "var a = 3; export { a as b }; a++; b++;";
					return computeOccurrences(text, getOptions(done, 35, 36), [{start:35, end:36}]);
				});
				it('Named function export 1', function(done) {
					var text = "export function a(){}; a();";
					return computeOccurrences(text, getOptions(done, 16, 17), [{start:16, end:17}, {start:23, end:24}]);
				});
				it('Named function export 2', function(done) {
					var text = "export function a(){}; a();";
					return computeOccurrences(text, getOptions(done, 23, 24), [{start:16, end:17}, {start:23, end:24}]);
				});
				it('Default expression export 1', function(done) {
					var text = "var a = 3; export default a; a++;";
					return computeOccurrences(text, getOptions(done, 4, 4), [{start:4, end:5}, {start:26, end:27}, {start:29, end:30}]);
				});
				it('Default expression export 2', function(done) {
					var text = "var a = 3; export default a; a++;";
					return computeOccurrences(text, getOptions(done, 26, 26), [{start:4, end:5}, {start:26, end:27}, {start:29, end:30}]);
				});
				it('Default expression export 3', function(done) {
					var text = "var a = 3; export default a; a++;";
					return computeOccurrences(text, getOptions(done, 29, 30), [{start:4, end:5}, {start:26, end:27}, {start:29, end:30}]);
				});
				it('Default named function export 1', function(done) {
					var text = "export default function a(){}; a();";
					return computeOccurrences(text, getOptions(done, 24, 24), [{start:24, end:25}, {start:31, end:32}]);
				});
				it('Default named function export 2', function(done) {
					var text = "export default function a(){}; a();";
					return computeOccurrences(text, getOptions(done, 32, 32), [{start:24, end:25}, {start:31, end:32}]);
				});
				it('From export 1', function(done) {
					worker.createTestFile("a", "");
					var text = "export { a, b } from 'a'; a++; b++;";
					return computeOccurrences(text, getOptions(done, 9, 9), [{start:9, end:10}, {start:26, end:27}]);
				});
				it('From export 2', function(done) {
					worker.createTestFile("a", "");
					var text = "export { a, b } from 'a'; a++; b++;";
					return computeOccurrences(text, getOptions(done, 26, 27), [{start:9, end:10}, {start:26, end:27}]);
				});
				it('From export 3', function(done) {
					worker.createTestFile("a", "");
					var text = "export { a, b } from 'a'; a++; b++;";
					return computeOccurrences(text, getOptions(done, 12, 12), [{start:12, end:13}, {start:31, end:32}]);
				});
				it('From export 4', function(done) {
					worker.createTestFile("a", "");
					var text = "export { a, b } from 'a'; a++; b++;";
					return computeOccurrences(text, getOptions(done, 32, 32), [{start:12, end:13}, {start:31, end:32}]);
				});
				it('Named from export 1', function(done) {
					worker.createTestFile("a", "");
					var text = "export { a as b } from 'a'; a++; b++;";
					return computeOccurrences(text, getOptions(done, 9, 9), [{start:9, end:10}, {start:28, end:29}]);
				});
				it('Named from export 2', function(done) {
					worker.createTestFile("a", "");
					var text = "export { a as b } from 'a'; a++; b++;";
					return computeOccurrences(text, getOptions(done, 28, 28), [{start:9, end:10}, {start:28, end:29}]);
				});
				it('Named from export 3', function(done) {
					worker.createTestFile("a", "");
					var text = "export { a as b } from 'a'; a++; b++;";
					return computeOccurrences(text, getOptions(done, 14, 14), []);
				});
				it('Named from export 4', function(done) {
					worker.createTestFile("a", "");
					var text = "export { a as b } from 'a'; a++; b++;";
					return computeOccurrences(text, getOptions(done, 33, 33), [{start:33, end:34}]);
				});
			});
			describe('ES6 Occurrences Tests in HTML', function() {
				it('HTML Arrow function expression', function(done) {
					var text = "<html><script>n => {n.length;}</script></html>";
					return computeOccurrences(text, getOptions(done, 14,15, 'text/html'), [{start:14, end:15}, {start:20, end:21}]);
				});
				it('HTML Let basic', function(done) {
					var text = "<html><script>if (true) { let a; a=3; a++; }</script></html>";
					return computeOccurrences(text, getOptions(done, 33,33, 'text/html'), [{start:30, end:31}, {start:33, end:34}, {start:38, end:39}]);
				});
				it('HTML Const scoping block define', function(done) {
					var text = "<html><script>a++; { const a; a++; } a++;</script></html>";
					return computeOccurrences(text, getOptions(done, 27,28, 'text/html'), [{start:27, end:28}, {start:30, end:31}]);
				});
				it('HTML Generators', function(done) {
					var text = "<html><script>function* a(a) { yield a+1; } function* b(b){ yield b; yield* a(b); } a(1); b(1);</script></html>";
					return computeOccurrences(text, getOptions(done, 57,57, 'text/html'), [{start:56, end:57}, {start:66, end:67}, {start:78, end:79}]);
				});
				it('HTML Class declaration', function(done) {
					var text = "<html><script>class a { constructor(a, b=a) { a++ } a(a, b=a){ return a; } }; new a();</script></html>";
					return computeOccurrences(text, getOptions(done, 36,36, 'text/html'), [{start:36, end:37}, {start:41, end:42}, {start:46, end:47}]);
				});
				it('HTML Extends class', function(done) {
					var text = "<html><script>class a{}; class b extends a{};</script></html>";
					return computeOccurrences(text, getOptions(done, 41,41, 'text/html'), [{start:20, end:21}, {start:41, end:42}]);
				});
				it('HTML Func expr default param', function(done) {
					var text = "<html><script>var a = { a: function(a, b = a+1){ a++;	} }; a++;</script></html>";
					return computeOccurrences(text, getOptions(done, 49,50, 'text/html'), [{start:36, end:37}, {start:43, end:44}, {start:49, end:50}]);
				});
				it('HTML Multiple named import declaration', function(done) {
					worker.createTestFile("a", "");
					var text = "<html><script>import { myFunc, myVar } from \"a\"; myFunc(); var z = myVar;</script></html>";
					return computeOccurrences(text, getOptions(done, 50,50, 'text/html'), [{start:23, end:29}, {start:49, end:55}]);
				});
				it('HTML From export', function(done) {
					worker.createTestFile("a", "");
					var text = "<html><script>export { a, b } from 'a'; a++; b++;</script></html>";
					return computeOccurrences(text, getOptions(done, 46,46, 'text/html'), [{start:26, end:27}, {start:45, end:46}]);
				});
			});
		});
	};
});
