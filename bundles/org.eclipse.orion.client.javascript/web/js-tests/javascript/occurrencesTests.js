/*******************************************************************************
 * @license
 * Copyright (c) 2013, 2017 IBM Corporation and others.
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
		
		describe('Tern Occurrences Tests', function(done) {
			this.timeout(20000);
			before('Message the server for warm up', function(done) {
				occurrences = new Occurrences.JavaScriptOccurrences(worker);
				worker.start(done); // Reset the tern server state to remove any prior files
			});
			
			/**
			 * Tests a function declaration
			 */
			it('test_funcDeclaration1', function(done) {
				var text = "function F1(p1, p2) {\n"+
						"\tvar out = p1;\n"+
						"};";
				return computeOccurrences(text, getOptions(done, 13, 13), [{start:12, end:14}, {start:33, end:35}]);
			});
			
			/**
			 * Tests a function expression
			 */
			it('test_funcExpression1', function(done) {
				var text = "var obj = {\n"+
						"\titem: function(p1, p2) {\n"+
						"\t\tvar out = p1;\n"+
						"\t}"+
						"};";
				return computeOccurrences(text, getOptions(done, 30, 30), [{start:28, end:30}, {start:50, end:52}]);
			});
			
			/**
			 * Tests an object expression
			 */
			it('test_objExpression1', function(done) {
				var text = "var object = {};"+
						"var newobject = object;";
				return computeOccurrences(text, getOptions(done, 5, 5), [{start:4, end:10}, {start:32, end:38}]);
			});
				
			/**
			 * Tests nested function declarations
			 * @see https://bugs.eclipse.org/bugs/show_bug.cgi?id=423835
			 */
			it('test_nestedFuncDecl1', function(done) {
				var text = "function f(p1) { function b(p1) { var p2 = p1; };};";
				return computeOccurrences(text, getOptions(done, 12, 12), [{start:11, end:13}]);
			});
			
			/**
			 * Tests nested function declarations
			 * @see https://bugs.eclipse.org/bugs/show_bug.cgi?id=423835
			 */
			it('test_nestedFuncDecl2', function(done) {
				var text = "function f(p1) { function b(p1) { var p2 = p1; };};";
				return computeOccurrences(text, getOptions(done, 29, 29), [{start:28, end:30}, {start:43, end:45}]);
			});
			
			/**
			 * Tests nested function declarations
			 * @see https://bugs.eclipse.org/bugs/show_bug.cgi?id=423835
			 */
			it('test_nestedFuncDecl3', function(done) {
				var text = "function f(p1) { function b(p1) { var p2 = p1; };};";
				return computeOccurrences(text, getOptions(done, 44, 44), [{start:28, end:30}, {start:43, end:45}]);
			});
			
			/**
			 * Tests nested function expressions
			 * @see https://bugs.eclipse.org/bugs/show_bug.cgi?id=423835
			 */
			it('test_nestedFuncExpr1', function(done) {
				var text = "var object = {one: function(p1) { function b(p1) { var p2 = p1; }; }};";
				return computeOccurrences(text, getOptions(done, 30, 30), [{start:28, end:30}]);
			});
			
			/**
			 * Tests nested function expressions
			 * @see https://bugs.eclipse.org/bugs/show_bug.cgi?id=423835
			 */
			it('test_nestedFuncExpr2', function(done) {
				var text = "var object = {one: function(p1) { function b(p1) { var p2 = p1; }; }};";
				return computeOccurrences(text, getOptions(done, 47, 47), [{start:45, end:47}, {start:60, end:62}]);
			});
			
			/**
			 * Tests nested function expressions
			 * @see https://bugs.eclipse.org/bugs/show_bug.cgi?id=423835
			 */
			it('test_nestedFuncExpr3', function(done) {
				var text = "var object = {one: function(p1) { function b(p1) { var p2 = p1; }; }};";
				return computeOccurrences(text, getOptions(done, 62, 62), [{start:60, end:62}, {start:45, end:47}]);
			});
			
			/**
			 * Tests nested function expressions
			 * @see https://bugs.eclipse.org/bugs/show_bug.cgi?id=423835
			 */
			it('test_nestedFuncExpr4', function(done) {
				var text = "function b(p1) { var object = {one: function(p1) {var p2 = p1; } };};";
				return computeOccurrences(text, getOptions(done, 13, 13), [{start:11, end:13}]);
			});
			
			/**
			 * Tests nested function expressions
			 * @see https://bugs.eclipse.org/bugs/show_bug.cgi?id=423835
			 */
			it('test_nestedFuncExpr5', function(done) {
				var text = "function b(p1) { var object = {one: function(p1) {var p2 = p1; } };};";
				return computeOccurrences(text, getOptions(done, 47, 47), [{start:45, end:47}, {start:59, end:61}]);
			});
			
			/**
			 * Tests nested function expressions
			 * @see https://bugs.eclipse.org/bugs/show_bug.cgi?id=423835
			 */
			it('test_nestedFuncExpr6', function(done) {
				var text = "function b(p1) { var object = {one: function(p1) {var p2 = p1; } };};";
				return computeOccurrences(text, getOptions(done, 61, 61), [{start:45, end:47}, {start:59, end:61}]);
			});
			
			/**
			 * Tests nested function expressions
			 * @see https://bugs.eclipse.org/bugs/show_bug.cgi?id=423835
			 */
			it('test_nestedFuncExpr7', function(done) {
				var text = "var out = function(p1) {var inner = {object : {one: function(p1) {var p2 = p1;}}};};";
				return computeOccurrences(text, getOptions(done, 21, 21), [{start:19, end:21}]);
			});
			
			/**
			 * Tests nested function expressions
			 * @see https://bugs.eclipse.org/bugs/show_bug.cgi?id=423835
			 */
			it('test_nestedFuncExpr8', function(done) {
				var text = "var out = function(p1) {var inner = {object : {one: function(p1) {var p2 = p1;}}};};";
				return computeOccurrences(text, getOptions(done, 63, 63), [{start:61, end:63}, {start:75, end:77}]);
			});
			
			/**
			 * Tests nested function expressions
			 * @see https://bugs.eclipse.org/bugs/show_bug.cgi?id=423835
			 */
			it('test_nestedFuncExpr9', function(done) {
				var text = "var out = function(p1) {var inner = {object : {one: function(p1) {var p2 = p1;}}};};";
				return computeOccurrences(text, getOptions(done, 77, 77), [{start:61, end:63}, {start:75, end:77}]);
			});
		
			/**
			 * Tests function decls with same named params / vars in same scope
			 * https://bugs.eclipse.org/bugs/show_bug.cgi?id=424951
			 */
			it('test_functionDeclUse1', function(done) {
				var text = "var foo = function() {function f(prob) {} function f2() {var prob = {};	prob.foo = null;return prob;}};";
				return computeOccurrences(text, getOptions(done, 36, 36), [{start:33, end:37}]);
			});
			
			/**
			 * Tests function decls with same named params / vars in same scope
			 * https://bugs.eclipse.org/bugs/show_bug.cgi?id=424951
			 */
			it('test_functionDeclUse2', function(done) {
				var text = "var foo = function() {function f(prob) {} function f2() {var prob = {};	prob.foo = null;return prob;}};";
				return computeOccurrences(text, getOptions(done, 64, 64), [{start:61, end:65}, {start:72, end:76}, {start:95, end:99}]);
			});
			
			/**
			 * Tests function decls with same named params / vars in same scope
			 * https://bugs.eclipse.org/bugs/show_bug.cgi?id=424951
			 */
			it('test_functionDeclUse3', function(done) {
				var text = "var foo = function() {function f(prob) {} function f2() {var prob = {};	prob.foo = null;return prob;}};";
				return computeOccurrences(text, getOptions(done, 75, 75), [{start:61, end:65}, {start:72, end:76}, {start:95, end:99}]);
			});
			
			/**
			 * Tests function decls with same named params / vars in same scope
			 * https://bugs.eclipse.org/bugs/show_bug.cgi?id=424951
			 */
			it('test_functionDeclUse4', function(done) {
				var text = "var foo = function() {function f(prob) {} function f2() {var prob = {};	prob.foo = null;return prob;}};";
				return computeOccurrences(text, getOptions(done, 98, 98), [{start:61, end:65}, {start:72, end:76}, {start:95, end:99}]);
			});
			
			/**
			 * Tests function decls with same named params / vars in same scope
			 * https://bugs.eclipse.org/bugs/show_bug.cgi?id=424951
			 */
			it('test_functionDeclUse5', function(done) {
				var text = "var bar = function() {function MyObject() {}; var o = {i: function() {return new MyObject().foo;}};return MyObject;};";
				return computeOccurrences(text, getOptions(done, 36, 36), [{start:31, end:39}, {start:81, end:89}, {start:106, end:114}]);
			});
			
			/**
			 * Tests function decls with same named params / vars in same scope
			 * https://bugs.eclipse.org/bugs/show_bug.cgi?id=424951
			 */
			it('test_functionDeclUse6', function(done) {
				var text = "var bar = function() {function MyObject() {}; var o = {i: function() {return new MyObject().foo;}};return MyObject;};";
				return computeOccurrences(text, getOptions(done, 86, 86), [{start:31, end:39}, {start:81, end:89}, {start:106, end:114}]);
			});
			
			/**
			 * Tests function decls with same named params / vars in same scope
			 * https://bugs.eclipse.org/bugs/show_bug.cgi?id=424951
			 */
			it('test_functionDeclUse7', function(done) {
				var text = "var bar = function() {function MyObject() {}; var o = {i: function() {return new MyObject().foo;}};return MyObject;};";
				return computeOccurrences(text, getOptions(done, 111, 111), [{start:31, end:39}, {start:81, end:89}, {start:106, end:114}]);
			});
			
			/**
			 * Tests multiple function decls marked in use and returns
			 * https://bugs.eclipse.org/bugs/show_bug.cgi?id=425036
			 */
			it('test_functionDeclScopes1', function(done) {
				var text = "var foo = function() {function c2() {};	c2.prototype.constructor = c2;function c() {};c.prototype.constructor = c;return {c: c}};";
				return computeOccurrences(text, getOptions(done, 33, 33), [{start:31, end:33}, {start:40, end:42}, {start:67, end:69}]);
			});
			
			/**
			 * Tests multiple function decls marked in use and returns
			 * https://bugs.eclipse.org/bugs/show_bug.cgi?id=425036
			 */
			it('test_functionDeclScopes2', function(done) {
				var text = "var foo = function() {function c2() {};	c2.prototype.constructor = c2;function c() {};c.prototype.constructor = c;return {c: c}};";
				return computeOccurrences(text, getOptions(done, 41, 41), [{start:31, end:33}, {start:40, end:42}, {start:67, end:69}]);
			});
			
			/**
			 * Tests multiple function decls marked in use and returns
			 * https://bugs.eclipse.org/bugs/show_bug.cgi?id=425036
			 */
			it('test_functionDeclScopes3', function(done) {
				var text = "var foo = function() {function c2() {};	c2.prototype.constructor = c2;function c() {};c.prototype.constructor = c;return {c: c}};";
				return computeOccurrences(text, getOptions(done, 68, 68), [{start:31, end:33}, {start:40, end:42}, {start:67, end:69}]);
			});
			
			/**
			 * Tests multiple function decls marked in use and returns
			 * https://bugs.eclipse.org/bugs/show_bug.cgi?id=425036
			 */
			it('test_functionDeclScopes4', function(done) {
				var text = "var foo = function() {function c2() {};	c2.prototype.constructor = c2;function c() {};c.prototype.constructor = c;return {c: c}};";
				return computeOccurrences(text, getOptions(done, 80, 80), [{start:79, end:80}, {start:86, end:87}, {start:112, end:113}, {start:125, end:126}]);
			});
			
			/**
			 * Tests multiple function decls marked in use and returns
			 * https://bugs.eclipse.org/bugs/show_bug.cgi?id=425036
			 */
			it('test_functionDeclScopes5', function(done) {
				var text = "var foo = function() {function c2() {};	c2.prototype.constructor = c2;function c() {};c.prototype.constructor = c;return {c: c}};";
				return computeOccurrences(text, getOptions(done, 87, 87), [{start:79, end:80}, {start:86, end:87}, {start:112, end:113}, {start:125, end:126}]);
			});
			
			/**
			 * Tests multiple function decls marked in use and returns
			 * https://bugs.eclipse.org/bugs/show_bug.cgi?id=425036
			 */
			it('test_functionDeclScopes6', function(done) {
				var text = "var foo = function() {function c2() {};	c2.prototype.constructor = c2;function c() {};c.prototype.constructor = c;return {c: c}};";
				return computeOccurrences(text, getOptions(done, 113, 113), [{start:79, end:80}, {start:86, end:87}, {start:112, end:113}, {start:125, end:126}]);
			});
			
			/**
			 * Tests multiple function decls marked in use and returns
			 * https://bugs.eclipse.org/bugs/show_bug.cgi?id=425036
			 */
			it('test_functionDeclScopes7', function(done) {
				var text = "var foo = function() {function c2() {};	c2.prototype.constructor = c2;function c() {};c.prototype.constructor = c;return {c: c}};";
				return computeOccurrences(text, getOptions(done, 126, 126), [{start:79, end:80}, {start:86, end:87}, {start:112, end:113}, {start:125, end:126}]);
			});
			
			/**
			 * Tests this usage in global
			 * @see https://bugs.eclipse.org/bugs/show_bug.cgi?id=424756
			 */
			it('test_thisUsageGlobal', function(done) {
				var text = "this.v1 = 1; var v2 = this.v1 + 1;";
				return computeOccurrences(text, getOptions(done, 2, 2), [{start:0, end:4}, {start:22, end:26}]);
			});
			
			/**
			 * Tests this usage from 2 functions
			 * @see https://bugs.eclipse.org/bugs/show_bug.cgi?id=424756
			 */
			it('test_thisUsageFunctions', function(done) {
				var text = "function f1(p1) {this.p1=p1;}; function f2(p2) {this.p2=p2;};";
				return computeOccurrences(text, getOptions(done, 19, 19), [{start:17, end:21}, {start:48, end:52}]);
			});
			
			/**
			 * Tests this usage in 2 objects
			 * @see https://bugs.eclipse.org/bugs/show_bug.cgi?id=424756
			 */
			it('test_thisUsageObjects1', function(done) {
				var text = "var o1={v1: 'a', f1: function(){ if (this.v1){ this.v1++; }}}; var o2={v1: 'a', f1: function(){ if (this.v1){ this.v1++; }}};";
				return computeOccurrences(text, getOptions(done, 39, 39), [{start:37, end:41}, {start:47, end:51}]);
			});
			
			/**
			 * Tests this usage in 2 objects
			 * @see https://bugs.eclipse.org/bugs/show_bug.cgi?id=424756
			 */
			it('test_thisUsageObjects2', function(done) {
				var text = "var o1={v1: 'a', f1: function(){ if (this.v1){ this.v1++; }}}; var o2={v1: 'a', f1: function(){ if (this.v1){ this.v1++; }}};";
				return computeOccurrences(text, getOptions(done, 102, 102), [{start:100, end:104}, {start:110, end:114}]);
			});
			
			/**
			 * Tests this usage in the root (global) scope of the file
			 * @see https://bugs.eclipse.org/bugs/show_bug.cgi?id=426930
			 */
			it('test_thisUsageGlobal1', function(done) {
				var text = "function f1() {this.foo =1;};this.bar = 2;";
				return computeOccurrences(text, getOptions(done, 17, 17), [{start:15, end:19}, {start:29, end:33}]);
			});
			
			/**
			 * Tests this usage in the root (global) scope of the file
			 * @see https://bugs.eclipse.org/bugs/show_bug.cgi?id=426930
			 */
			it('test_thisUsageGlobal2', function(done) {
				var text = "function f1() {this.foo =1;};this.bar = 2;";
				return computeOccurrences(text, getOptions(done, 31, 31), [{start:15, end:19}, {start:29, end:33}]);
			});
			
			/**
			 * Tests this usage in the root (global) scope of the file
			 * @see https://bugs.eclipse.org/bugs/show_bug.cgi?id=426930
			 */
			it('test_thisUsageGlobal3', function(done) {
				var text = "function f1() {this.foo =1;function f2() {this.baz = 3;}};this.bar = 2;";
				return computeOccurrences(text, getOptions(done, 17, 17), [{start:15, end:19}, {start:42, end:46}, {start:58, end:62}]);
			});
			
			/**
			 * Tests this usage in the root (global) scope of the file
			 * @see https://bugs.eclipse.org/bugs/show_bug.cgi?id=426930
			 */
			it('test_thisUsageGlobal4', function(done) {
				var text = "function f1() {this.foo =1;function f2() {this.baz = 3;}};this.bar = 2;";
				return computeOccurrences(text, getOptions(done, 44, 44), [{start:15, end:19}, {start:42, end:46}, {start:58, end:62}]);
			});
			
			/**
			 * Tests this usage in the root (global) scope of the file
			 * @see https://bugs.eclipse.org/bugs/show_bug.cgi?id=426930
			 */
			it('test_thisUsageGlobal3', function(done) {
				var text = "function f1() {this.foo =1;function f2() {this.baz = 3;}};this.bar = 2;";
				return computeOccurrences(text, getOptions(done, 60, 60), [{start:15, end:19}, {start:42, end:46}, {start:58, end:62}]);
			});
			
			/**
			 * Tests this usage in an object expression passed as a param
			 * @see https://bugs.eclipse.org/bugs/show_bug.cgi?id=426930
			 */
			it('test_thisUsageCallExpressionObject1', function(done) {
				var text = "call({f1: function() {this.bool;},f2: function() {this.bool;},f3: function() {this.bool;}});this.end = true;";
				return computeOccurrences(text, getOptions(done, 24, 24), [{start:22, end:26}, {start:50, end:54}, {start:78, end:82}]);
			});
			
			/**
			 * Tests this usage in an object expression passed as a param
			 * @see https://bugs.eclipse.org/bugs/show_bug.cgi?id=426930
			 */
			it('test_thisUsageCallExpressionObject2', function(done) {
				var text = "call({f1: function() {this.bool;},f2: function() {this.bool;},f3: function() {this.bool;}});this.end = true;";
				return computeOccurrences(text, getOptions(done, 53, 53), [{start:22, end:26}, {start:50, end:54}, {start:78, end:82}]);
			});
			
			/**
			 * Tests this usage in an object expression passed as a param
			 * @see https://bugs.eclipse.org/bugs/show_bug.cgi?id=426930
			 */
			it('test_thisUsageCallExpressionObject3', function(done) {
				var text = "call({f1: function() {this.bool;},f2: function() {this.bool;},f3: function() {this.bool;}});this.end = true;";
				return computeOccurrences(text, getOptions(done, 81, 81), [{start:22, end:26}, {start:50, end:54}, {start:78, end:82}]);
			});
			
			/**
			 * Tests this usage when function expressions are nested inside call expressions
			 * @see https://bugs.eclipse.org/bugs/show_bug.cgi?id=424756
			 */
			it('test_thisUsageCallExpressions1', function(done) {
				var text = "function f1(p1) {this.a1=p1; this.f2(function(p2) {this.a2=p2; this.f3(function(p3) {this.a3=p3;});}, function(p4) {this.a4=p4;});};";
				return computeOccurrences(text, getOptions(done, 19, 19), [{start:17, end:21}, {start:29, end:33}]);
			});
			
			/**
			 * Tests this usage when function expressions are nested inside call expressions
			 * @see https://bugs.eclipse.org/bugs/show_bug.cgi?id=424756
			 */
			it('test_thisUsageCallExpressions2', function(done) {
				var text = "function f1(p1) {this.a1=p1; this.f2(function(p2) {this.a2=p2; this.f3(function(p3) {this.a3=p3;});}, function(p4) {this.a4=p4;});};";
				return computeOccurrences(text, getOptions(done, 52, 52), [{start:51, end:55}, {start:63, end:67}]);
			});
			
			/**
			 * Tests this usage when function expressions are nested inside call expressions
			 * @see https://bugs.eclipse.org/bugs/show_bug.cgi?id=424756
			 */
			it('test_thisUsageCallExpressions3', function(done) {
				var text = "function f1(p1) {this.a1=p1; this.f2(function(p2) {this.a2=p2; this.f3(function(p3) {this.a3=p3;});}, function(p4) {this.a4=p4;});};";
				return computeOccurrences(text, getOptions(done, 87, 87), [{start:85, end:89}]);
			});
			
				/**
			 * Tests this usage when function expressions are nested inside call expressions
			 * @see https://bugs.eclipse.org/bugs/show_bug.cgi?id=424756
			 */
			it('test_thisUsageCallExpressions4', function(done) {
				var text = "function f1(p1) {this.a1=p1; this.f2(function(p2) {this.a2=p2; this.f3(function(p3) {this.a3=p3;});}, function(p4) {this.a4=p4;});};";
				return computeOccurrences(text, getOptions(done, 116, 116), [{start:116, end:120}]);
			});
			it('This usage before and after object scope 1', function(done) {
				var text = "this.a(); var o = {'p': this.a();}; this.a();";
				return computeOccurrences(text, getOptions(done, 0, 0), [{start:0, end:4}, {start:36, end:40}]);
			});
			it('This usage before and after object scope 2', function(done) {
				var text = "this.a(); var o = {'p': this.a();}; this.a();";
				return computeOccurrences(text, getOptions(done, 24, 28), [{start:24, end:28}]);
			});
			it('This usage before and after object scope 3', function(done) {
				var text = "this.a(); var o = {'p': this.a();}; this.a();";
				return computeOccurrences(text, getOptions(done, 38, 38), [{start:0, end:4}, {start:36, end:40}]);
			});
			/**
			 * @see https://bugs.eclipse.org/bugs/show_bug.cgi?id=501447
			 */
			it('This with computed property 1', function(done) {
				var text = "var key = 'one'; this[key] = 10;";
				return computeOccurrences(text, getOptions(done, 23, 23), [{start:4, end:7}, {start:22, end:25}]);
			});
			/**
			 * @see https://bugs.eclipse.org/bugs/show_bug.cgi?id=501447
			 */
			it('This with computed property 2', function(done) {
				var text = "var key = 'one'; function f() {this[key] = 10;}";
				return computeOccurrences(text, getOptions(done, 37, 37), [{start:4, end:7}, {start:36, end:39}]);
			});
			/**
			 * @see https://bugs.eclipse.org/bugs/show_bug.cgi?id=501447
			 */
			it('This with computed property 3', function(done) {
				var text = "var key = 'one'; function f() {this[key] = 10; this.key = 'not me'}";
				return computeOccurrences(text, getOptions(done, 37, 37), [{start:4, end:7}, {start:36, end:39}]);
			});
			/**
			 * @see https://bugs.eclipse.org/bugs/show_bug.cgi?id=501447
			 */
			it('This with computed property 4', function(done) {
				var text = "var key = 'one'; this[key] = 10; this.key = 'not me'";
				return computeOccurrences(text, getOptions(done, 23, 23), [{start:4, end:7}, {start:22, end:25}]);
			});
			/**
			 * Tests logic expressions that contain identifier nodes
			 * @see https://bugs.eclipse.org/bugs/show_bug.cgi?id=426933
			 */
			it('test_logicExpression1', function(done) {
				var text = "function f(p1) { var v = (p1 && p1.foo)};";
				return computeOccurrences(text, getOptions(done, 12, 12), [{start:11, end:13}, {start:26, end:28}, {start:32, end:34}]);
			});
			
			/**
			 * Tests logic expressions that contain identifier nodes
			 * @see https://bugs.eclipse.org/bugs/show_bug.cgi?id=426933
			 */
			it('test_logicExpression2', function(done) {
				var text = "function f(p1) { var v = (p1 && p1.foo)};";
				return computeOccurrences(text, getOptions(done, 27, 27), [{start:11, end:13}, {start:26, end:28}, {start:32, end:34}]);
			});
			
			/**
			 * Tests logic expressions that contain identifier nodes
			 * @see https://bugs.eclipse.org/bugs/show_bug.cgi?id=426933
			 */
			it('test_logicExpression3', function(done) {
				var text = "function f(p1) { var v = (p1 && p1.foo)};";
				return computeOccurrences(text, getOptions(done, 33, 33), [{start:11, end:13}, {start:26, end:28}, {start:32, end:34}]);
			});
			
			/**
			 * Tests logic expressions that contain identifier nodes
			 * @see https://bugs.eclipse.org/bugs/show_bug.cgi?id=426933
			 */
			it('test_logicExpression4', function(done) {
				var text = "var o = { p: function() {function f(p1) { var v = (p1 && p1.foo)}}};";
				return computeOccurrences(text, getOptions(done, 37, 37), [{start:36, end:38}, {start:51, end:53}, {start:57, end:59}]);
			});
			
			/**
			 * Tests logic expressions that contain identifier nodes
			 * @see https://bugs.eclipse.org/bugs/show_bug.cgi?id=426933
			 */
			it('test_logicExpression5', function(done) {
				var text = "var o = { p: function() {function f(p1) { var v = (p1 && p1.foo)}}};";
				return computeOccurrences(text, getOptions(done, 52, 52), [{start:36, end:38}, {start:51, end:53}, {start:57, end:59}]);
			});
			
			/**
			 * Tests logic expressions that contain identifier nodes
			 * @see https://bugs.eclipse.org/bugs/show_bug.cgi?id=426933
			 */
			it('test_logicExpression6', function(done) {
				var text = "var o = { p: function() {function f(p1) { var v = (p1 && p1.foo)}}};";
				return computeOccurrences(text, getOptions(done, 58, 58), [{start:36, end:38}, {start:51, end:53}, {start:57, end:59}]);
			});
			
			/**
			 * Tests logic expressions that contain identifier nodes
			 * @see https://bugs.eclipse.org/bugs/show_bug.cgi?id=427836
			 */
			it('test_newExpression1', function(done) {
				var text = "var foo = 1;function f1() {};var bar = new f1(foo);";
				return computeOccurrences(text, getOptions(done, 6, 6), [{start:4, end:7}, {start:46, end:49}]);
			});
			
			/**
			 * Tests logic expressions that contain identifier nodes
			 * @see https://bugs.eclipse.org/bugs/show_bug.cgi?id=427836
			 */
			it('test_newExpression2', function(done) {
				var text = "var foo = 1;function f1() {};var bar = new f1(foo);";
				return computeOccurrences(text, getOptions(done, 48, 48), [{start:4, end:7}, {start:46, end:49}]);
			});
			
			/**
			 * Tests logic expressions that contain identifier nodes
			 * @see https://bugs.eclipse.org/bugs/show_bug.cgi?id=427836
			 */
			it('test_newExpression3', function(done) {
				var text = "var foo = 1;function f1() {};var o = {a: function() {var bar = new f1(foo);}}";
				return computeOccurrences(text, getOptions(done, 6, 6), [{start:4, end:7}, {start:70, end:73}]);
			});
			
			/**
			 * Tests logic expressions that contain identifier nodes
			 * @see https://bugs.eclipse.org/bugs/show_bug.cgi?id=427836
			 */
			it('test_newExpression4', function(done) {
				var text = "var foo = 1;function f1() {};var o = {a: function() {var bar = new f1(foo);}}";
				return computeOccurrences(text, getOptions(done, 72, 72), [{start:4, end:7}, {start:70, end:73}]);
			});
			
			/**
			 * Tests logic expressions that contain identifier nodes
			 * @see https://bugs.eclipse.org/bugs/show_bug.cgi?id=427836
			 */
			it('test_newExpression5', function(done) {
				var text = "var foo = 1;function f1() {};function f2() {var bar = new f1(foo);}";
				return computeOccurrences(text, getOptions(done, 6, 6), [{start:4, end:7}, {start:61, end:64}]);
			});
			
			/**
			 * Tests logic expressions that contain identifier nodes
			 * @see https://bugs.eclipse.org/bugs/show_bug.cgi?id=427836
			 */
			it('test_newExpression6', function(done) {
				var text = "var foo = 1;function f1() {};function f2() {var bar = new f1(foo);}";
				return computeOccurrences(text, getOptions(done, 62, 62), [{start:4, end:7}, {start:61, end:64}]);
			});
		
			/**
			 * Tests when a variable is redefined
			 * @see https://bugs.eclipse.org/bugs/show_bug.cgi?id=427928
			 */
			it('test_redefineSimpleVariable1', function(done) {
				var text = "var reDef; var a=reDef; var reDef; var b=reDef;";
				return computeOccurrences(text, getOptions(done, 4, 9), [{start:4, end:9}, {start:17, end:22}, {start:28, end:33}, {start:41, end:46}]);
			});
			
			/**
			 * Tests when a variable is redefined
			 * @see https://bugs.eclipse.org/bugs/show_bug.cgi?id=427928
			 */
			it('test_redefineSimpleVariable2', function(done) {
				var text = "var reDef; var a=reDef; var reDef; var b=reDef;";
				return computeOccurrences(text, getOptions(done, 17, 17), [{start:4, end:9}, {start:17, end:22}, {start:28, end:33}, {start:41, end:46}]);
			});
			
			/**
			 * Tests when a variable is redefined
			 * @see https://bugs.eclipse.org/bugs/show_bug.cgi?id=427928
			 */
			it('test_redefineSimpleVariable3', function(done) {
				var text = "var reDef; var a=reDef; var reDef; var b=reDef;";
				return computeOccurrences(text, getOptions(done, 30, 30), [{start:4, end:9}, {start:17, end:22}, {start:28, end:33}, {start:41, end:46}]);
			});
			
			/**
			 * Tests when a variable is redefined
			 * @see https://bugs.eclipse.org/bugs/show_bug.cgi?id=427928
			 */
			it('test_redefineSimpleVariable4', function(done) {
				var text = "var reDef; var a=reDef; var reDef; var b=reDef;";
				return computeOccurrences(text, getOptions(done, 46, 46), [{start:4, end:9}, {start:17, end:22}, {start:28, end:33}, {start:41, end:46}]);
			});
			
			/**
			 * Tests when a variable is redefined in nested scopes
			 * @see https://bugs.eclipse.org/bugs/show_bug.cgi?id=427928
			 */
			it('test_redefineNestedVariable1', function(done) {
				var text = "var reDef; var a=reDef; function f1(){var b=reDef;} function f2(reDef){var c=reDef;	var reDef; var d=reDef;	function f3(){var e=reDef;}} var f=reDef;";
				return computeOccurrences(text, getOptions(done, 4, 9), [{start:4, end:9}, {start:17, end:22}, {start:44, end:49}, {start:143, end:148}]);
			});
			
			/**
			 * Tests when a variable is redefined in nested scopes
			 * @see https://bugs.eclipse.org/bugs/show_bug.cgi?id=427928
			 */
			it('test_redefineNestedVariable2', function(done) {
				var text = "var reDef; var a=reDef; function f1(){var b=reDef;} function f2(reDef){var c=reDef;	var reDef; var d=reDef;	function f3(){var e=reDef;}} var f=reDef;";
				return computeOccurrences(text, getOptions(done, 66, 66), [{start:64, end:69}, {start:77, end:82}, {start:88, end:93}, {start:101, end:106}, {start:128, end:133}]);
			});
			
			/**
			 * Tests when a variable is redefined in nested scopes
			 * @see https://bugs.eclipse.org/bugs/show_bug.cgi?id=427928
			 */
			it('test_redefineNestedVariable3', function(done) {
				var text = "var reDef; var a=reDef; function f1(){var b=reDef;} function f2(reDef){var c=reDef;	var reDef; var d=reDef;	function f3(){var e=reDef;}} var f=reDef;";
				return computeOccurrences(text, getOptions(done, 133, 133), [{start:64, end:69}, {start:77, end:82}, {start:88, end:93}, {start:101, end:106}, {start:128, end:133}]);
			});
			
			/**
			 * Tests when a variable is redefined in nested scopes
			 * @see https://bugs.eclipse.org/bugs/show_bug.cgi?id=427928
			 */
			it('test_redefineNestedVariable4', function(done) {
				var text = "var reDef; var a=reDef; function f1(){var b=reDef;} function f2(reDef){var c=reDef;	var reDef; var d=reDef;	function f3(){var e=reDef;}} var f=reDef;";
				return computeOccurrences(text, getOptions(done, 143, 143), [{start:4, end:9}, {start:17, end:22}, {start:44, end:49}, {start:143, end:148}]);
			});
			
			/**
			 * Tests when a function is redefined
			 * @see https://bugs.eclipse.org/bugs/show_bug.cgi?id=427928
			 */
			it('test_redefineSimpleFunction1', function(done) {
				var text = "function reDef(){}; reDef(); function reDef(){}; reDef();";
				return computeOccurrences(text, getOptions(done, 9, 14), [{start:9, end:14}, {start:20, end:25}, {start:38, end:43}, {start:49, end:54}]);
			});
			
			/**
			 * Tests when a function is redefined
			 * @see https://bugs.eclipse.org/bugs/show_bug.cgi?id=427928
			 */
			it('test_redefineSimpleFunction2', function(done) {
				var text = "function reDef(){}; reDef(); function reDef(){}; reDef();";
				return computeOccurrences(text, getOptions(done, 20, 20), [{start:9, end:14}, {start:20, end:25}, {start:38, end:43}, {start:49, end:54}]);
			});
			
			/**
			 * Tests when a function is redefined
			 * @see https://bugs.eclipse.org/bugs/show_bug.cgi?id=427928
			 */
			it('test_redefineSimpleFunction3', function(done) {
				var text = "function reDef(){}; reDef(); function reDef(){}; reDef();";
				return computeOccurrences(text, getOptions(done, 40, 40), [{start:9, end:14}, {start:20, end:25}, {start:38, end:43}, {start:49, end:54}]);
			});
			
			/**
			 * Tests when a function is redefined
			 * @see https://bugs.eclipse.org/bugs/show_bug.cgi?id=427928
			 */
			it('test_redefineSimpleFunction4', function(done) {
				var text = "function reDef(){}; reDef(); function reDef(){}; reDef();";
				return computeOccurrences(text, getOptions(done, 54, 54), [{start:9, end:14}, {start:20, end:25}, {start:38, end:43}, {start:49, end:54}]);
			});
			
			/**
			 * Tests when a function is redefined in nested scopes
			 * @see https://bugs.eclipse.org/bugs/show_bug.cgi?id=427928
			 */
			it('test_redefineNestedFunction1', function(done) {
				var text = "function reDef(){}; reDef(); function f1(){reDef();} function f2(reDef){reDef(); function reDef(){}; reDef(); function f3(){reDef();}} reDef();";
				return computeOccurrences(text, getOptions(done, 9, 14), [{start:9, end:14}, {start:20, end:25}, {start:43, end:48}, {start:135, end:140}]);
			});
			
			/**
			 * Tests when a function is redefined in nested scopes
			 * @see https://bugs.eclipse.org/bugs/show_bug.cgi?id=427928
			 */
			it('test_redefineNestedFunction2', function(done) {
				var text = "function reDef(){}; reDef(); function f1(){reDef();} function f2(reDef){reDef(); function reDef(){}; reDef(); function f3(){reDef();}} reDef();";
				return computeOccurrences(text, getOptions(done, 67, 67), [{start:65, end:70}, {start:72, end:77}, {start:90, end:95}, {start:101, end:106}, {start:124, end:129}]);
			});
			
			/**
			 * Tests when a function is redefined in nested scopes
			 * @see https://bugs.eclipse.org/bugs/show_bug.cgi?id=427928
			 */
			it('test_redefineNestedFunction3', function(done) {
				var text = "function reDef(){}; reDef(); function f1(){reDef();} function f2(reDef){reDef(); function reDef(){}; reDef(); function f3(){reDef();}} reDef();";
				return computeOccurrences(text, getOptions(done, 129, 129), [{start:65, end:70}, {start:72, end:77}, {start:90, end:95}, {start:101, end:106}, {start:124, end:129}]);
			});
			
			/**
			 * Tests when a function is redefined in nested scopes
			 * @see https://bugs.eclipse.org/bugs/show_bug.cgi?id=427928
			 */
			it('test_redefineNestedFunction4', function(done) {
				var text = "function reDef(){}; reDef(); function f1(){reDef();} function f2(reDef){reDef(); function reDef(){}; reDef(); function f3(){reDef();}} reDef();";
				return computeOccurrences(text, getOptions(done, 135, 135), [{start:9, end:14}, {start:20, end:25}, {start:43, end:48}, {start:135, end:140}]);
			});
			
			/**
			 * Tests when a redefine happens with occurrences in sibling scopes
			 * @see https://bugs.eclipse.org/bugs/show_bug.cgi?id=448535
			 */
			it('test_redefineSiblingScopes1', function(done) {
				var text = "var reDef; reDef(); function g(){ reDef(); } function reDef(){} function h(){ reDef(); } var reDef;";
				return computeOccurrences(text, getOptions(done, 4, 4), [{start:4, end:9}, {start:11, end:16}, {start:34, end:39}, {start:54, end:59}, {start:78, end:83}, {start:93, end:98}]);
			});
			
			/**
			 * Tests when a redefine happens with occurrences in sibling scopes
			 * @see https://bugs.eclipse.org/bugs/show_bug.cgi?id=448535
			 */
			it('test_redefineSiblingScopes2', function(done) {
				var text = "var reDef; reDef(); function g(){ reDef(); } function reDef(){} function h(){ reDef(); } var reDef;";
				return computeOccurrences(text, getOptions(done, 11, 12), [{start:4, end:9}, {start:11, end:16}, {start:34, end:39}, {start:54, end:59}, {start:78, end:83}, {start:93, end:98}]);
			});
			
			/**
			 * Tests when a redefine happens with occurrences in sibling scopes
			 * @see https://bugs.eclipse.org/bugs/show_bug.cgi?id=448535
			 */
			it('test_redefineSiblingScopes3', function(done) {
				var text = "var reDef; reDef(); function g(){ reDef(); } function reDef(){} function h(){ reDef(); } var reDef;";
				return computeOccurrences(text, getOptions(done, 34, 39), [{start:4, end:9}, {start:11, end:16}, {start:34, end:39}, {start:54, end:59}, {start:78, end:83}, {start:93, end:98}]);
			});
			
			/**
			 * Tests when a redefine happens with occurrences in sibling scopes
			 * @see https://bugs.eclipse.org/bugs/show_bug.cgi?id=448535
			 */
			it('test_redefineSiblingScopes4', function(done) {
				var text = "var reDef; reDef(); function g(){ reDef(); } function reDef(){} function h(){ reDef(); } var reDef;";
				return computeOccurrences(text, getOptions(done, 59, 59), [{start:4, end:9}, {start:11, end:16}, {start:34, end:39}, {start:54, end:59}, {start:78, end:83}, {start:93, end:98}]);
			});
			
			/**
			 * Tests when a redefine happens with occurrences in sibling scopes
			 * @see https://bugs.eclipse.org/bugs/show_bug.cgi?id=448535
			 */
			it('test_redefineSiblingScopes5', function(done) {
				var text = "var reDef; reDef(); function g(){ reDef(); } function reDef(){} function h(){ reDef(); } var reDef;";
				return computeOccurrences(text, getOptions(done, 78, 78), [{start:4, end:9}, {start:11, end:16}, {start:34, end:39}, {start:54, end:59}, {start:78, end:83}, {start:93, end:98}]);
			});
			
			/**
			 * Tests when a redefine happens with occurrences in sibling scopes
			 * @see https://bugs.eclipse.org/bugs/show_bug.cgi?id=448535
			 */
			it('test_redefineSiblingScopes6', function(done) {
				var text = "var reDef; reDef(); function g(){ reDef(); } function reDef(){} function h(){ reDef(); } var reDef;";
				return computeOccurrences(text, getOptions(done, 94, 98), [{start:4, end:9}, {start:11, end:16}, {start:34, end:39}, {start:54, end:59}, {start:78, end:83}, {start:93, end:98}]);
			});
			
			/**
			 * Tests that occurrences with redefines are only marked inside appropriate scopes
			 * @see https://bugs.eclipse.org/bugs/show_bug.cgi?id=438317
			 */
			it('test_redefineScopesVar1', function(done) {
				var text = "var reDef; function f(){ var reDef; } log(reDef);";
				return computeOccurrences(text, getOptions(done, 4, 4), [{start:4, end:9}, {start:42, end:47}]);
			});
			
			/**
			 * Tests that occurrences with redefines are only marked inside appropriate scopes
			 * @see https://bugs.eclipse.org/bugs/show_bug.cgi?id=438317
			 */
			it('test_redefineScopesVar2', function(done) {
				var text = "var reDef; function f(){ var reDef; } log(reDef);";
				return computeOccurrences(text, getOptions(done, 30, 32), [{start:29, end:34}]);
			});
			
			/**
			 * Tests that occurrences with redefines are only marked inside appropriate scopes
			 * @see https://bugs.eclipse.org/bugs/show_bug.cgi?id=438317
			 */
			it('test_redefineScopesVar3', function(done) {
				var text = "var reDef; function f(){ var reDef; } log(reDef);";
				return computeOccurrences(text, getOptions(done, 45, 45), [{start:4, end:9}, {start:42, end:47}]);
			});
			
			/**
			 * Tests that occurrences with redefines are only marked inside appropriate scopes
			 * @see https://bugs.eclipse.org/bugs/show_bug.cgi?id=438317
			 */
			it('test_redefineScopesFuncDecl1', function(done) {
				var text = "function reDef() { function reDef(){}; } reDef();";
				return computeOccurrences(text, getOptions(done, 9, 9), [{start:9, end:14}, {start:41, end:46}]);
			});
			
			/**
			 * Tests that occurrences with redefines are only marked inside appropriate scopes
			 * @see https://bugs.eclipse.org/bugs/show_bug.cgi?id=438317
			 */
			it('test_redefineScopesFuncDecl2', function(done) {
				var text = "function reDef() { function reDef(){}; } reDef();";
				return computeOccurrences(text, getOptions(done, 28, 33), [{start:28, end:33}]);
			});
			
			/**
			 * Tests that occurrences with redefines are only marked inside appropriate scopes
			 * @see https://bugs.eclipse.org/bugs/show_bug.cgi?id=438317
			 */
			it('test_redefineScopesFuncDecl3', function(done) {
				var text = "function reDef() { function reDef(){}; } reDef();";
				return computeOccurrences(text, getOptions(done, 45, 46), [{start:9, end:14}, {start:41, end:46}]);
			});
			
			/**
			 * Tests that occurrences with redefines are only marked inside appropriate scopes
			 * @see https://bugs.eclipse.org/bugs/show_bug.cgi?id=438317
			 */
			it('test_redefineScopesFuncExpr1', function(done) {
				var text = "var a = function reDef() { var b = function reDef(){}; };";
				return computeOccurrences(text, getOptions(done, 17, 17), [{start:17, end:22}]);
			});
			
			/**
			 * Tests that occurrences with redefines are only marked inside appropriate scopes
			 * @see https://bugs.eclipse.org/bugs/show_bug.cgi?id=438317
			 */
			it('test_redefineScopesFuncExpr2', function(done) {
				var text = "var a = function reDef() { var b = function reDef(){}; };";
				return computeOccurrences(text, getOptions(done, 44, 44), [{start:44, end:49}]);
			});
			
			/**
			 * Tests that occurrences with redefines are only marked inside appropriate scopes
			 * As the selected 'reDef' isn't defined in the program scope, we assume it belongs to the global scope
			 * @see https://bugs.eclipse.org/bugs/show_bug.cgi?id=447962
			 */
			it('test_redefineScopesFuncExpr3', function(done) {
				var text = "var a = function reDef() { var b = function reDef(){}; }; reDef();";
				return computeOccurrences(text, getOptions(done, 63, 63), [{start:58, end:63}]);
			});
			
			/**
			 * Tests that occurrences with redefines are only marked inside appropriate scopes
			 * As the selected 'reDef' isn't defined in the program scope, we assume it belongs to the global scope
			 * @see https://bugs.eclipse.org/bugs/show_bug.cgi?id=447962
			 */
			it('test_redefineScopesFuncExprVar1', function(done) {
				var text = "var a = function reDef(){ reDef(); }; var reDef; reDef();";
				return computeOccurrences(text, getOptions(done, 17, 17), [{start:17, end:22}, {start:26, end:31}]);
			});
			
			/**
			 * Tests that occurrences with redefines are only marked inside appropriate scopes
			 * As the selected 'reDef' isn't defined in the program scope, we assume it belongs to the global scope
			 * @see https://bugs.eclipse.org/bugs/show_bug.cgi?id=447962
			 */
			it('test_redefineScopesFuncExprVar2', function(done) {
				var text = "var a = function reDef(){ reDef(); }; var reDef; reDef();";
				return computeOccurrences(text, getOptions(done, 27, 29), [{start:17, end:22}, {start:26, end:31}]);
			});
			
			/**
			 * Tests that occurrences with redefines are only marked inside appropriate scopes
			 * As the selected 'reDef' isn't defined in the program scope, we assume it belongs to the global scope
			 * @see https://bugs.eclipse.org/bugs/show_bug.cgi?id=447962
			 */
			it('test_redefineScopesFuncExprVar3', function(done) {
				var text = "var a = function reDef(){ reDef(); }; var reDef; reDef();";
				return computeOccurrences(text, getOptions(done, 47, 47), [{start:42, end:47}, {start:49, end:54}]);
			});
			
			/**
			 * Tests that occurrences with redefines are only marked inside appropriate scopes
			 * As the selected 'reDef' isn't defined in the program scope, we assume it belongs to the global scope
			 * @see https://bugs.eclipse.org/bugs/show_bug.cgi?id=447962
			 */
			it('test_redefineScopesFuncExprVar4', function(done) {
				var text = "var a = function reDef(){ reDef(); }; var reDef; reDef();";
				return computeOccurrences(text, getOptions(done, 49, 54), [{start:42, end:47}, {start:49, end:54}]);
			});
			
			/**
			 * Tests that even though assignment comes before declaration, occurrences recognizes that the declaration will be hoisted to the top of the scope
			 * @see https://bugs.eclipse.org/bugs/show_bug.cgi?id=438317
			 */
			it('test_redefineScopesHoisting1', function(done) {
				var text = "var reDef; function f() { log(reDef); var reDef; }";
				return computeOccurrences(text, getOptions(done, 35, 35), [{start:30, end:35}, {start:42, end:47}]);
			});
			
			/**
			 * Tests that even though call comes before declaration, occurrences recognizes that the declaration will be hoisted to the top of the scope
			 * @see https://bugs.eclipse.org/bugs/show_bug.cgi?id=438317
			 */
			it('test_redefineScopesHoisting2', function(done) {
				var text = "function reDef(){}; function f() { reDef(); function reDef(){}; }";
				return computeOccurrences(text, getOptions(done, 35, 35), [{start:35, end:40}, {start:53, end:58}]);
			});
			
			//RECOVERED OCCURRENCES
			/**
			 * Tests computing occurrences within an AST that has been recovered
			 */
			it('test_recovered_occurrence 1', function(done) {
				var text = "var one = 1; func(one two); one = 23";
				return computeOccurrences(text, getOptions(done, 7, 7), [{start:4, end:7}, {start:18, end:21}, {start:28, end:31}]);
			});
			
			/**
			 * Tests computing occurrences within an AST that has been recovered
			 */
			it('test_recovered_occurrence 2', function(done) {
				var text = "var one = 1; var o = {f:one d:2}";
				return computeOccurrences(text, getOptions(done, 27, 27), [{start:4, end:7}, {start:24, end:27}]);
			});
			
			/**
			 * Tests computing occurrences for for-loop inits
			 * @see https://bugs.eclipse.org/bugs/show_bug.cgi?id=435941
			 */
			it('test_for_init_1', function(done) {
				var text = "var f = 3; for(f; i < 10; i++) {}";
				return computeOccurrences(text, getOptions(done, 5, 5), [{start:4, end:5}, {start:15, end:16}]);
			});
			
			/**
			 * Tests computing occurrences for for-loop inits
			 * @see https://bugs.eclipse.org/bugs/show_bug.cgi?id=435941
			 */
			it('test_for_init_2', function(done) {
				var text = "var f = 3; for(f; i < 10; i++) {}";
				return computeOccurrences(text, getOptions(done, 15, 15), [{start:4, end:5}, {start:15, end:16}]);
			});
			
			/**
			 * Tests computing occurrences for for-loop inits
			 * @see https://bugs.eclipse.org/bugs/show_bug.cgi?id=435941
			 */
			it('test_for_init_3', function(done) {
				var text = "var f = 3; for(var i = f; i < 10; i++) {}";
				return computeOccurrences(text, getOptions(done, 4, 4), [{start:4, end:5}, {start:23, end:24}]);
			});
			
			/**
			 * Tests computing occurrences for do-while tests
			 * @see https://bugs.eclipse.org/bugs/show_bug.cgi?id=435941
			 */
			it('test_do_while_test_1', function(done) {
				var text = "var f = 3; do{} while(f) {}";
				return computeOccurrences(text, getOptions(done, 5, 5), [{start:4, end:5}, {start:22, end:23}]);
			});
			
			/**
			 * Tests computing occurrences for do-while tests
			 * @see https://bugs.eclipse.org/bugs/show_bug.cgi?id=435941
			 */
			it('test_do_while_test_2', function(done) {
				var text = "var f = 3; do{} while(f) {}";
				return computeOccurrences(text, getOptions(done, 22, 22), [{start:4, end:5}, {start:22, end:23}]);
			});
			
			/**
			 * Tests computing occurrences for do-while tests
			 * @see https://bugs.eclipse.org/bugs/show_bug.cgi?id=435941
			 */
			it('test_do_while_test_3', function(done) {
				var text = "var f = 3; do{} while(f < 12) {}";
				return computeOccurrences(text, getOptions(done, 22, 22), [{start:4, end:5}, {start:22, end:23}]);
			});
			/**
			 * Tests computing occurrences for with statements
			 * @see https://bugs.eclipse.org/bugs/show_bug.cgi?id=436630
			 */
			it('test_with_1', function(done) {
				var text = "var f = 3; with(f) {f = 2;}";
				return computeOccurrences(text, getOptions(done, 4, 4), [{start:4, end:5}, {start:16, end:17}, {start:20, end:21}]);
			});
			/**
			 * Tests computing occurrences for with statements
			 * @see https://bugs.eclipse.org/bugs/show_bug.cgi?id=436630
			 */
			it('test_with_2', function(done) {
				var text = "var f = 3; with(f) {f = 2;}";
				return computeOccurrences(text, getOptions(done, 16, 16), [{start:4, end:5}, {start:16, end:17}, {start:20, end:21}]);
			});
			/**
			 * Tests computing occurrences for with statements
			 * @see https://bugs.eclipse.org/bugs/show_bug.cgi?id=436630
			 */
			it('test_with_test_3', function(done) {
				var text = "var f = 3; with(f) {f = 2;}";
				return computeOccurrences(text, getOptions(done, 20, 20), [{start:4, end:5}, {start:16, end:17}, {start:20, end:21}]);
			});
			/**
			 * Tests computing occurrences for for-in statements
			 * @see https://bugs.eclipse.org/bugs/show_bug.cgi?id=436630
			 */
			it('test_for-in_1', function(done) {
				var text = "var f = 3; for(f in bar) {f = 2;}";
				return computeOccurrences(text, getOptions(done, 4, 4), [{start:4, end:5}, {start:15, end:16}, {start:26, end:27}]);
			});
			/**
			 * Tests computing occurrences for for-in statements
			 * @see https://bugs.eclipse.org/bugs/show_bug.cgi?id=436630
			 */
			it('test_for-in_2', function(done) {
				var text = "var f = 3; for(f in bar) {f = 2;}";
				return computeOccurrences(text, getOptions(done, 15, 15), [{start:4, end:5}, {start:15, end:16}, {start:26, end:27}]);
			});
			/**
			 * Tests computing occurrences for for-in statements
			 * @see https://bugs.eclipse.org/bugs/show_bug.cgi?id=436630
			 */
			it('test_for-in_3', function(done) {
				var text = "var f = 3; for(f in bar) {f = 2;}";
				return computeOccurrences(text, getOptions(done, 26, 26), [{start:4, end:5}, {start:15, end:16}, {start:26, end:27}]);
			});
			/**
			 * Tests computing occurrences for for-in statements
			 * @see https://bugs.eclipse.org/bugs/show_bug.cgi?id=436630
			 */
			it('test_for-in_4', function(done) {
				var text = "var f = 3; for(var q in f) {q = f;}";
				return computeOccurrences(text, getOptions(done, 4, 4), [{start:4, end:5}, {start:24, end:25}, {start:32, end:33}]);
			});
			/**
			 * Tests computing occurrences for for-in statements
			 * @see https://bugs.eclipse.org/bugs/show_bug.cgi?id=436630
			 */
			it('test_for-in_5', function(done) {
				var text = "var f = 3; for(var q in f) {q = f;}";
				return computeOccurrences(text, getOptions(done, 24, 24), [{start:4, end:5}, {start:24, end:25}, {start:32, end:33}]);
			});
			/**
			 * Tests computing occurrences for for-in statements
			 * @see https://bugs.eclipse.org/bugs/show_bug.cgi?id=436630
			 */
			it('test_for-in_6', function(done) {
				var text = "var f = 3; for(var q in f) {q = f;}";
				return computeOccurrences(text, getOptions(done, 32, 32), [{start:4, end:5}, {start:24, end:25}, {start:32, end:33}]);
			});
			/**
			 * Tests computing occurrences for while statements
			 * @see https://bugs.eclipse.org/bugs/show_bug.cgi?id=436728
			 */
			it('test_while_1', function(done) {
				var text = "var f = 3; while(f) {var q = f;}";
				return computeOccurrences(text, getOptions(done, 4, 4), [{start:4, end:5}, {start:17, end:18}, {start:29, end:30}]);
			});
			/**
			 * Tests computing occurrences for while statements
			 * @see https://bugs.eclipse.org/bugs/show_bug.cgi?id=436728
			 */
			it('test_while_2', function(done) {
				var text = "var f = 3; while(f) {var q = f;}";
				return computeOccurrences(text, getOptions(done, 17, 17), [{start:4, end:5}, {start:17, end:18}, {start:29, end:30}]);
			});
			/**
			 * Tests computing occurrences for while statements
			 * @see https://bugs.eclipse.org/bugs/show_bug.cgi?id=436728
			 */
			it('test_while_3', function(done) {
				var text = "var f = 3; while(f) {var q = f;}";
				return computeOccurrences(text, getOptions(done, 29, 29), [{start:4, end:5}, {start:17, end:18}, {start:29, end:30}]);
			});
			
			/**
			 * Tests computing occurrences for object properties and references to them
			 * @see https://bugs.eclipse.org/bugs/show_bug.cgi?id=423083
			 */
			it('test_object_properties_1A', function(done) {
				var text = "Objects.mixin({ test1: function() {}, test2: function() { return this.test1(); } });";
				return computeOccurrences(text, getOptions(done, 19, 19), [{start:16, end:21}, {start:70, end:75}]);
			});
			
			/**
			 * Tests computing occurrences for object properties and references to them
			 * @see https://bugs.eclipse.org/bugs/show_bug.cgi?id=423083
			 */
			it('test_object_properties_1B', function(done) {
				var text = "Objects.mixin({ test1: function() {}, test2: function() { return this.test1(); } });";
				return computeOccurrences(text, getOptions(done, 71, 71), [{start:16, end:21}, {start:70, end:75}]);
			});
			
			/**
			 * Tests computing occurrences for object properties and references to them
			 * @see https://bugs.eclipse.org/bugs/show_bug.cgi?id=423083
			 */
			it('test_object_properties_2A', function(done) {
				var text = "var foo = { test1: function() {}, test2: function() { return this.test1(); } };";
				return computeOccurrences(text, getOptions(done, 15, 15), [{start:12, end:17}, {start:66, end:71}]);
			});
			
			/**
			 * Tests computing occurrences for object properties and references to them
			 * @see https://bugs.eclipse.org/bugs/show_bug.cgi?id=423083
			 */
			it('test_object_properties_2B', function(done) {
				var text = "var foo = { test1: function() {}, test2: function() { return this.test1(); } };";
				return computeOccurrences(text, getOptions(done, 66, 71), [{start:12, end:17}, {start:66, end:71}]);
			});
			
			/**
			 * Tests computing occurrences for object properties and references to them
			 * @see https://bugs.eclipse.org/bugs/show_bug.cgi?id=423083
			 */
			it('test_object_properties_3A', function(done) {
				var text = "var foo = {a: this.a(), b: {a: this.a(), c: {a: this.a()}}, c: this.a()};";
				return computeOccurrences(text, getOptions(done, 11, 11), [{start:11, end:12}, {start:19, end:20}, {start:68, end:69}]);
			});
			
			/**
			 * Tests computing occurrences for object properties and references to them
			 * @see https://bugs.eclipse.org/bugs/show_bug.cgi?id=423083
			 */
			it('test_object_properties_3B', function(done) {
				var text = "var foo = {a: this.a(), b: {a: this.a(), c: {a: this.a()}}, c: this.a()};";
				return computeOccurrences(text, getOptions(done, 28, 28), [{start:28, end:29}, {start:36, end:37}]);
			});
			
			/**
			 * Tests computing occurrences for object properties and references to them
			 * @see https://bugs.eclipse.org/bugs/show_bug.cgi?id=423083
			 */
			it('test_object_properties_3C', function(done) {
				var text = "var foo = {a: this.a(), b: {a: this.a(), c: {a: this.a()}}, c: this.a()};";
				return computeOccurrences(text, getOptions(done, 60, 61), [{start:60, end:61}]);
			});
			
			/**
			 * Tests computing occurrences for object properties and references to them
			 * @see https://bugs.eclipse.org/bugs/show_bug.cgi?id=423083
			 */
			it('test_object_properties_3D', function(done) {
				var text = "var foo = {a: this.a(), b: {a: this.a(), c: {a: this.a()}}, c: this.a()};";
				return computeOccurrences(text, getOptions(done, 68, 69), [{start:11, end:12}, {start:19, end:20}, {start:68, end:69}]);
			});
			
			/**
			 * Tests computing occurrences for a named func expression inside an object property (and that params are skipped)
			 * @see https://bugs.eclipse.org/bugs/show_bug.cgi?id=439641
			 */
			it('test_object_properties_named_expressions1', function(done) {
				var text = "var a={ f: function f(p1, p2) {}, g: function g() { this.f(); } }; f();";
				return computeOccurrences(text, getOptions(done, 9, 9), [{start:8, end:9}, {start:20, end:21}, {start:57, end:58}]);
			});
			
			/**
			 * Tests computing occurrences for a named func expression inside an object property (and that params are skipped)
			 * @see https://bugs.eclipse.org/bugs/show_bug.cgi?id=439641
			 */
			it('test_object_properties_named_expressions2', function(done) {
				var text = "var a={ f: function f(p1, p2) {}, g: function g() { this.f(); } }; f();";
				return computeOccurrences(text, getOptions(done, 20, 20), [{start:8, end:9}, {start:20, end:21}, {start:57, end:58}]);
			});
			
			/**
			 * Tests computing occurrences for a named func expression inside an object property (and that params are skipped)
			 * @see https://bugs.eclipse.org/bugs/show_bug.cgi?id=439641
			 */
			it('test_object_properties_named_expressions3', function(done) {
				var text = "var a={ f: function f(p1, p2) {}, g: function g() { this.f(); } }; f();";
				return computeOccurrences(text, getOptions(done, 57, 58), [{start:8, end:9}, {start:20, end:21}, {start:57, end:58}]);
			});
			
			/**
			 * Tests computing occurrences for a named func expression inside an object property (and that params are skipped)
			 * @see https://bugs.eclipse.org/bugs/show_bug.cgi?id=439641
			 */
			it('test_object_properties_named_expressions4', function(done) {
				var text = "var a={ f: function f(p1, p2) {p1++;}, g: function g() { this.f(); } }; f();";
				return computeOccurrences(text, getOptions(done, 23, 23), [{start:22, end:24}, {start:31, end:33}]);
			});
			
			/**
			 * Tests computing occurrences for object property used in two sibling scopes and defined in an outside scope
			 * @see https://bugs.eclipse.org/bugs/show_bug.cgi?id=439156
			 */
			it('test_ObjectPropsSiblingScopes1', function(done) {
				var text = "var a = { f: function (){ this.g(); var b = { p: this.g() }; var c = { p: this.g() }; }, g: function (){} };";
				return computeOccurrences(text, getOptions(done, 31, 32), [{start:31, end:32}, {start:54, end:55}, {start:79, end:80}, {start:89, end:90}]);
			});
			
			/**
			 * Tests computing occurrences for object property used in two sibling scopes and defined in an outside scope
			 * @see https://bugs.eclipse.org/bugs/show_bug.cgi?id=439156
			 */
			it('test_ObjectPropsSiblingScopes2', function(done) {
				var text = "var a = { f: function (){ this.g(); var b = { p: this.g() }; var c = { p: this.g() }; }, g: function (){} };";
				return computeOccurrences(text, getOptions(done, 54, 54), [{start:31, end:32}, {start:54, end:55}, {start:79, end:80}, {start:89, end:90}]);
			});
			
			/**
			 * Tests computing occurrences for object property used in two sibling scopes and defined in an outside scope
			 * @see https://bugs.eclipse.org/bugs/show_bug.cgi?id=439156
			 */
			it('test_ObjectPropsSiblingScopes3', function(done) {
				var text = "var a = { f: function (){ this.g(); var b = { p: this.g() }; var c = { p: this.g() }; }, g: function (){} };";
				return computeOccurrences(text, getOptions(done, 79, 79), [{start:31, end:32}, {start:54, end:55}, {start:79, end:80}, {start:89, end:90}]);
			});
			
			/**
			 * Tests computing occurrences for object property used in two sibling scopes and defined in an outside scope
			 * @see https://bugs.eclipse.org/bugs/show_bug.cgi?id=439156
			 */
			it('test_ObjectPropsSiblingScopes4', function(done) {
				var text = "var a = { f: function (){ this.g(); var b = { p: this.g() }; var c = { p: this.g() }; }, g: function (){} };";
				return computeOccurrences(text, getOptions(done, 89, 90), [{start:31, end:32}, {start:54, end:55}, {start:79, end:80}, {start:89, end:90}]);
			});
			
			/**
			 * Tests computing occurrences for object property used in sibling scopes and defined in multiple nested scopes
			 * @see https://bugs.eclipse.org/bugs/show_bug.cgi?id=439156
			 */
			it('test_ObjectPropsNestedScopes1', function(done) {
				var text = "var a = { f: function (){ this.g(); var b = { p: this.g() g: function (){} }; var c = { p: this.g() }; }, g: function (){} };";
				return computeOccurrences(text, getOptions(done, 31, 32), [{start:31, end:32}, {start:96, end:97}, {start:106, end:107}]);
			});	
			
			/**
			 * Tests computing occurrences for object property used in sibling scopes and defined in multiple nested scopes
			 * @see https://bugs.eclipse.org/bugs/show_bug.cgi?id=439156
			 */
			it('test_ObjectPropsNestedScopes2', function(done) {
				var text = "var a = { f: function (){ this.g(); var b = { p: this.g() g: function (){} }; var c = { p: this.g() }; }, g: function (){} };";
				return computeOccurrences(text, getOptions(done, 96, 96), [{start:31, end:32}, {start:96, end:97}, {start:106, end:107}]);
			});
			
			/**
			 * Tests computing occurrences for object property used in sibling scopes and defined in multiple nested scopes
			 * @see https://bugs.eclipse.org/bugs/show_bug.cgi?id=439156
			 */
			it('test_ObjectPropsNestedScopes3', function(done) {
				var text = "var a = { f: function (){ this.g(); var b = { p: this.g() g: function (){} }; var c = { p: this.g() }; }, g: function (){} };";
				return computeOccurrences(text, getOptions(done, 106, 106), [{start:31, end:32}, {start:96, end:97}, {start:106, end:107}]);
			});
			
			/**
			 * Tests computing occurrences for object property used in sibling scopes and defined in multiple nested scopes
			 * @see https://bugs.eclipse.org/bugs/show_bug.cgi?id=439156
			 */
			it('test_ObjectPropsNestedScopes4', function(done) {
				var text = "var a = { f: function (){ this.g(); var b = { p: this.g() g: function (){} }; var c = { p: this.g() }; }, g: function (){} };";
				return computeOccurrences(text, getOptions(done, 54, 55), [{start:54, end:55}, {start:58, end:59}]);
			});
			
			/**
			 * Tests computing occurrences for object property used in sibling scopes and defined in multiple nested scopes
			 * @see https://bugs.eclipse.org/bugs/show_bug.cgi?id=439156
			 */
			it('test_ObjectPropsNestedScopes5', function(done) {
				var text = "var a = { f: function (){ this.g(); var b = { p: this.g() g: function (){} }; var c = { p: this.g() }; }, g: function (){} };";
				return computeOccurrences(text, getOptions(done, 58, 58), [{start:54, end:55}, {start:58, end:59}]);
			});
			
			/**
			 * Tests whether occurrences finds and selects the correct token/word/node
			 */
			it('test_punctuators_1A', function(done) {
				var text = "var \tfoo ; bar\n;";
				return computeOccurrences(text, getOptions(done, 4, 4), []);
			});
			
			/**
			 * Tests whether occurrences finds and selects the correct token/word/node
			 */
			it('test_punctuators_1B', function(done) {
				var text = "var \tfoo ; bar\n;";
				return computeOccurrences(text, getOptions(done, 9, 9), []);
			});
			
			/**
			 * Tests whether occurrences finds and selects the correct token/word/node
			 */
			it('test_punctuators_1C', function(done) {
				var text = "var \tfoo ; bar\n;";
				return computeOccurrences(text, getOptions(done, 10, 10), []);
			});
			
			/**
			 * Tests whether occurrences finds and selects the correct token/word/node
			 */
			it('test_punctuators_1D', function(done) {
				var text = "var \tfoo ; bar\n;";
				return computeOccurrences(text, getOptions(done, 15, 15), []);
			});
			
			/**
			 * Tests named function expressions
			 * @see https://bugs.eclipse.org/bugs/show_bug.cgi?id=438083
			 */
			it('test_namedFuncExpr1', function(done) {
				var text = "var a; log(a); var x = function a(){ log(a); var y = function a(){ log(a); }; };";
				return computeOccurrences(text, getOptions(done, 11, 11), [{start:4, end:5}, {start:11, end:12}]);
			});
			
			/**
			 * Tests named function expressions
			 * @see https://bugs.eclipse.org/bugs/show_bug.cgi?id=438083
			 */
			it('test_namedFuncExpr2', function(done) {
				var text = "var a; log(a); var x = function a(){ log(a); var y = function a(){ log(a); }; };";
				return computeOccurrences(text, getOptions(done, 32, 32), [{start:32, end:33}, {start:41, end:42}]);
			});
			
			/**
			 * Tests named function expressions
			 * @see https://bugs.eclipse.org/bugs/show_bug.cgi?id=438083
			 */
			it('test_namedFuncExpr3', function(done) {
				var text = "var a; log(a); var x = function a(){ log(a); var y = function a(){ log(a); }; };";
				return computeOccurrences(text, getOptions(done, 41, 42), [{start:32, end:33}, {start:41, end:42}]);
			});
			
			
			/**
			 * Tests named function expressions
			 * @see https://bugs.eclipse.org/bugs/show_bug.cgi?id=438083
			 */
			it('test_namedFuncExpr4', function(done) {
				var text = "var a; log(a); var x = function a(){ log(a); var y = function a(){ log(a); }; };";
				return computeOccurrences(text, getOptions(done, 63, 63), [{start:62, end:63}, {start:71, end:72}]);
			});
			
			/**
			 * Tests named function expressions
			 * @see https://bugs.eclipse.org/bugs/show_bug.cgi?id=438083
			 */
			it('test_namedFuncExpr5', function(done) {
				var text = "var a; log(a); var x = function a(){ log(a); var y = function a(){ log(a); }; };";
				return computeOccurrences(text, getOptions(done, 72, 72), [{start:62, end:63}, {start:71, end:72}]);
			});
			
			/**
			 * Tests named function expression in object property
			 * @see https://bugs.eclipse.org/bugs/show_bug.cgi?id=439641
			 * TODO Add a test if the caret is in the named function expression or the call expression.
			 */
			it('test_namedFuncExpr6', function(done) {
				var text = "var x = { a: function a() {} }; a();";
				return computeOccurrences(text, getOptions(done, 11, 11), [{start:10, end:11}, {start:22, end:23}]);
			});
			
			/**
			 * Tests throw statements
			 * @see https://bugs.eclipse.org/bugs/show_bug.cgi?id=438402
			 */
			it('test_throwStatement1', function(done) {
				var text = "var a; throw a;";
				return computeOccurrences(text, getOptions(done, 4, 4), [{start:4, end:5}, {start:13, end:14}]);
			});
			
			/**
			 * Tests throw statements
			 * @see https://bugs.eclipse.org/bugs/show_bug.cgi?id=438402
			 */
			it('test_throwStatement2', function(done) {
				var text = "var a; function f() { if(a) { throw a; }}";
				return computeOccurrences(text, getOptions(done, 25, 25), [{start:4, end:5}, {start:25, end:26}, {start:36, end:37}]);
			});
			
			/**
			 * Tests throw statements
			 * @see https://bugs.eclipse.org/bugs/show_bug.cgi?id=438402
			 */
			it('test_throwStatement3', function(done) {
				var text = "var a; function f() { if(a) { throw a; }}";
				return computeOccurrences(text, getOptions(done, 36, 36), [{start:4, end:5}, {start:25, end:26}, {start:36, end:37}]);
			});
			
			/**
			 * Tests labeled statements
			 * @see https://bugs.eclipse.org/bugs/show_bug.cgi?id=436728
			 */
			it('test_labeledStatement1', function(done) {
				var text = "var a = 9; a: while(a) { if(false) { var b = {}; b: for(var x in b) { if(b === null || x === null) { break b; } } continue a; } }";
				return computeOccurrences(text, getOptions(done, 4, 5), [{start:4, end:5}, {start:20, end:21}]);
			});
	
			/**
			 * Tests labeled statements
			 * @see https://bugs.eclipse.org/bugs/show_bug.cgi?id=436728
			 */
			it('test_labeledStatement2', function(done) {
				var text = "var a = 9; a: while(a) { if(false) { var b = {}; b: for(var x in b) { if(b === null || x === null) { break b; } } continue a; } }";
				return computeOccurrences(text, getOptions(done, 11, 12), [{start:11, end:12}, {start:123, end:124}]);
			});
			
			/**
			 * Tests labeled statements
			 * @see https://bugs.eclipse.org/bugs/show_bug.cgi?id=436728
			 */
			it('test_labeledStatement3', function(done) {
				var text = "var a = 9; a: while(a) { if(false) { var b = {}; b: for(var x in b) { if(b === null || x === null) { break b; } } continue a; } }";
				return computeOccurrences(text, getOptions(done, 123, 124), [{start:11, end:12}, {start:123, end:124}]);
			});
			/**
			 * Tests labeled statements
			 * @see https://bugs.eclipse.org/bugs/show_bug.cgi?id=436728
			 */
			it('test_labeledStatement4', function(done) {
				var text = "var a = 9; a: while(a) { if(false) { var b = {}; b: for(var x in b) { if(b === null || x === null) { break b; } } continue a; } }";
				return computeOccurrences(text, getOptions(done, 49, 50), [{start:49, end:50}, {start:107, end:108}]);
			});
			
			/**
			 * Tests labeled statements
			 * @see https://bugs.eclipse.org/bugs/show_bug.cgi?id=436728
			 */
			it('test_labeledStatement5', function(done) {
				var text = "var a = 9; a: while(a) { if(false) { var b = {}; b: for(var x in b) { if(b === null || x === null) { break b; } } continue a; } }";
				return computeOccurrences(text, getOptions(done, 65, 66), [{start:41, end:42}, {start:65, end:66}, {start:73, end:74}]);
			});
			
			/**
			 * Tests labeled statements
			 * @see https://bugs.eclipse.org/bugs/show_bug.cgi?id=436728
			 */
			it('test_labeledStatement6', function(done) {
				var text = "var a = 9; a: while(a) { if(false) { var b = {}; b: for(var x in b) { if(b === null || x === null) { break b; } } continue a; } }";
				return computeOccurrences(text, getOptions(done, 107, 108), [{start:49, end:50}, {start:107, end:108}]);
			});		
			
			/**
			 * Tests repeated labeled statements
			 * @see https://bugs.eclipse.org/bugs/show_bug.cgi?id=440928
			 */
			it('test_labeledStatementRepeat1', function(done) {
				var text = "a: while(true){ break a; } a: while(true){ break a; }";
				return computeOccurrences(text, getOptions(done, 0, 1), [{start:0, end:1}, {start:22, end:23}]);
			});	
			
			/**
			 * Tests repeated labeled statements
			 * @see https://bugs.eclipse.org/bugs/show_bug.cgi?id=440928
			 */
			it('test_labeledStatementRepeat2', function(done) {
				var text = "a: while(true){ break a; } a: while(true){ break a; }";
				return computeOccurrences(text, getOptions(done, 23, 23), [{start:0, end:1}, {start:22, end:23}]);
			});	
			
			/**
			 * Tests repeated labeled statements
			 * @see https://bugs.eclipse.org/bugs/show_bug.cgi?id=440928
			 */
			it('test_labeledStatementRepeat3', function(done) {
				var text = "a: while(true){ break a; } a: while(true){ break a; }";
				return computeOccurrences(text, getOptions(done, 27, 27), [{start:27, end:28}, {start:49, end:50}]);
			});	
			
			/**
			 * Tests repeated labeled statements
			 * @see https://bugs.eclipse.org/bugs/show_bug.cgi?id=440928
			 */
			it('test_labeledStatementRepeat4', function(done) {
				var text = "a: while(true){ break a; } a: while(true){ break a; }";
				return computeOccurrences(text, getOptions(done, 49, 50), [{start:27, end:28}, {start:49, end:50}]);
			});	
			
			/**
			 * Tests nested loop labeled statements
			 * @see https://bugs.eclipse.org/bugs/show_bug.cgi?id=440928
			 */
			it('test_labeledStatementNestedLoop1', function(done) {
				var text = "a: while(true){ while(true) { break a; } }";
				return computeOccurrences(text, getOptions(done, 0, 0), [{start:0, end:1}, {start:36, end:37}]);
			});	
			
			/**
			 * Tests nested loop labeled statements
			 * @see https://bugs.eclipse.org/bugs/show_bug.cgi?id=440928
			 */
			it('test_labeledStatementNestedLoop2', function(done) {
				var text = "a: while(true){ while(true) { break a; } }";
				return computeOccurrences(text, getOptions(done, 37, 37), [{start:0, end:1}, {start:36, end:37}]);
			});	
			
			/**
			 * Tests nested labeled statements
			 * @see https://bugs.eclipse.org/bugs/show_bug.cgi?id=440928
			 */
			it('test_labeledStatementNestedLabel1', function(done) {
				var text = "a: while(true){ b: while(true) { if (true) { continue a; } else { continue b; } } }";
				return computeOccurrences(text, getOptions(done, 0, 1), [{start:0, end:1}, {start:54, end:55}]);
			});	
			
			/**
			 * Tests nested labeled statements
			 * @see https://bugs.eclipse.org/bugs/show_bug.cgi?id=440928
			 */
			it('test_labeledStatementNestedLabel2', function(done) {
				var text = "a: while(true){ b: while(true) { if (true) { continue a; } else { continue b; } } }";
				return computeOccurrences(text, getOptions(done, 54, 54), [{start:0, end:1}, {start:54, end:55}]);
			});
			
			/**
			 * Tests nested labeled statements
			 * @see https://bugs.eclipse.org/bugs/show_bug.cgi?id=440928
			 */
			it('test_labeledStatementNestedLabel3', function(done) {
				var text = "a: while(true){ b: while(true) { if (true) { continue a; } else { continue b; } } }";
				return computeOccurrences(text, getOptions(done, 16, 16), [{start:16, end:17}, {start:75, end:76}]);
			});
			
			/**
			 * Tests nested labeled statements
			 * @see https://bugs.eclipse.org/bugs/show_bug.cgi?id=440928
			 */
			it('test_labeledStatementNestedLabel4', function(done) {
				var text = "a: while(true){ b: while(true) { if (true) { continue a; } else { continue b; } } }";
				return computeOccurrences(text, getOptions(done, 75, 76), [{start:16, end:17}, {start:75, end:76}]);
			});
			
			/**
			 * Tests global usage
			 * @see https://bugs.eclipse.org/bugs/show_bug.cgi?id=429173
			 */
			it('test_global1', function(done) {
				var text = "(function() { window.alert('hi'); }()); window.setTimeout(); window.confirm('florp');";
				return computeOccurrences(text, getOptions(done, 14, 14), [{start:14, end:20}, {start:40, end:46}, {start: 61, end: 67}]);
			});
			
			/**
			 * Tests global usage
			 * @see https://bugs.eclipse.org/bugs/show_bug.cgi?id=429173
			 */
			it('test_global2', function(done) {
				var text = "(function() { window.alert('hi'); }()); window.setTimeout(); window.confirm('florp');";
				return computeOccurrences(text, getOptions(done, 40, 41), [{start:14, end:20}, {start:40, end:46}, {start: 61, end: 67}]);
			});
			
			/**
			 * Tests global usage
			 * @see https://bugs.eclipse.org/bugs/show_bug.cgi?id=429173
			 */
			it('test_global3', function(done) {
				var text = "(function() { window.alert('hi'); }()); window.setTimeout(); window.confirm('florp');";
				return computeOccurrences(text, getOptions(done, 61, 62), [{start:14, end:20}, {start:40, end:46}, {start: 61, end: 67}]);
			});
			
			/**
			 * Tests usage inside of a non-defining scope
			 * Everything should be marked, no matter which is selected
			 * @see https://bugs.eclipse.org/bugs/show_bug.cgi?id=445410
			 */
			it('test_nonDefiningScope1', function(done) {
				var text = "f(); function g(){ f(); } function f(){} function h(){ f(); } f();";
				return computeOccurrences(text, getOptions(done, 1,1), [{start:0, end:1}, {start:19, end:20}, {start: 35, end: 36}, {start: 55, end: 56}, {start: 62, end: 63}]);
			});
			
			/**
			 * Tests usage inside of a non-defining scope
			 * Everything should be marked, no matter which is selected
			 * @see https://bugs.eclipse.org/bugs/show_bug.cgi?id=445410
			 */
			it('test_nonDefiningScope2', function(done) {
				var text = "f(); function g(){ f(); } function f(){} function h(){ f(); } f();";
				return computeOccurrences(text, getOptions(done, 20,20), [{start:0, end:1}, {start:19, end:20}, {start: 35, end: 36}, {start: 55, end: 56}, {start: 62, end: 63}]);
			});
			
			/**
			 * Tests usage inside of a non-defining scope
			 * Everything should be marked, no matter which is selected
			 * @see https://bugs.eclipse.org/bugs/show_bug.cgi?id=445410
			 */
			it('test_nonDefiningScope3', function(done) {
				var text = "f(); function g(){ f(); } function f(){} function h(){ f(); } f();";
				return computeOccurrences(text, getOptions(done, 35,35), [{start:0, end:1}, {start:19, end:20}, {start: 35, end: 36}, {start: 55, end: 56}, {start: 62, end: 63}]);
			});
			
			/**
			 * Tests usage inside of a non-defining scope
			 * Everything should be marked, no matter which is selected
			 * @see https://bugs.eclipse.org/bugs/show_bug.cgi?id=445410
			 */
			it('test_nonDefiningScope4', function(done) {
				var text = "f(); function g(){ f(); } function f(){} function h(){ f(); } f();";
				return computeOccurrences(text, getOptions(done, 55,55), [{start:0, end:1}, {start:19, end:20}, {start: 35, end: 36}, {start: 55, end: 56}, {start: 62, end: 63}]);
			});
			
			/**
			 * Tests usage inside of a non-defining scope
			 * Everything should be marked, no matter which is selected
			 * @see https://bugs.eclipse.org/bugs/show_bug.cgi?id=445410
			 */
			it('test_nonDefiningScope5', function(done) {
				var text = "f(); function g(){ f(); } function f(){} function h(){ f(); } f();";
				return computeOccurrences(text, getOptions(done, 62,63), [{start:0, end:1}, {start:19, end:20}, {start: 35, end: 36}, {start: 55, end: 56}, {start: 62, end: 63}]);
			});
			
			/**
			 * Tests usage inside of a non-defining scope and that it doesn't conflict with the global occurrence list
			 * Everything should be marked, no matter which is selected
			 * @see https://bugs.eclipse.org/bugs/show_bug.cgi?id=445410
			 */
			it('test_nonDefiningScopeNonGlobal', function(done) {
				var text = "function a() { f(); function g(){ f(); } function f(){} function h(){ f(); } f(); }";
				return computeOccurrences(text, getOptions(done, 78,78), [{start:15, end:16}, {start:34, end:35}, {start: 50, end: 51}, {start: 70, end: 71}, {start: 77, end: 78}]);
			});
			
			/**
			 * Tests selections inside member expressions and whether they should be object property checks
			 * @see https://bugs.eclipse.org/bugs/show_bug.cgi?id=448543
			 */
			it('test_memberExpressionAsObjectProp1', function(done) {
				var text = "var a = {a: function a(){ var that = this; that.b(); return function() { that.b(); } }, b: function b(){} };";
				return computeOccurrences(text, getOptions(done, 4,4), [{start:4, end:5}]);
			});
			
			/**
			 * Tests selections inside member expressions and whether they should be object property checks
			 * @see https://bugs.eclipse.org/bugs/show_bug.cgi?id=448543
			 */
			it('test_memberExpressionAsObjectProp2', function(done) {
				var text = "var a = {a: function a(){ var that = this; that.b(); return function() { that.b(); } }, b: function b(){} };";
				return computeOccurrences(text, getOptions(done, 9,10), [{start:9, end:10}, {start:21, end:22}]);
			});
			
			/**
			 * Tests selections inside member expressions and whether they should be object property checks
			 * @see https://bugs.eclipse.org/bugs/show_bug.cgi?id=448543
			 */
			it('test_memberExpressionAsObjectProp3', function(done) {
				var text = "var a = {a: function a(){ var that = this; that.b(); return function() { that.b(); } }, b: function b(){} };";
				return computeOccurrences(text, getOptions(done, 32,32), [{start:30, end:34}, {start:43, end:47}, {start: 73, end: 77}]);
			});
			
			/**
			 * Tests selections inside member expressions and whether they should be object property checks
			 * @see https://bugs.eclipse.org/bugs/show_bug.cgi?id=448543
			 */
			it('test_memberExpressionAsObjectProp4', function(done) {
				var text = "var a = {a: function a(){ var that = this; that.b(); return function() { that.b(); } }, b: function b(){} };";
				return computeOccurrences(text, getOptions(done, 75,75), [{start:30, end:34}, {start:43, end:47}, {start: 73, end: 77}]);
			});
			
			/**
			 * Tests selections inside member expressions and whether they should be object property checks
			 * @see https://bugs.eclipse.org/bugs/show_bug.cgi?id=448543
			 */
			it('test_memberExpressionAsObjectProp5', function(done) {
				var text = "var a = {a: function a(){ var that = this; that.b(); return function() { that.b(); } }, b: function b(){} };";
				return computeOccurrences(text, getOptions(done, 48,49), [{start:48, end:49}, {start:78, end:79}, {start: 88, end: 89}, {start: 100, end: 101}]);
			});
			
			/**
			 * Tests selections inside member expressions and whether they should be object property checks
			 * @see https://bugs.eclipse.org/bugs/show_bug.cgi?id=448543
			 */
			it('test_memberExpressionAsObjectProp6', function(done) {
				var text = "var a = {a: function a(){ var that = this; that.b(); return function() { that.b(); } }, b: function b(){} };";
				return computeOccurrences(text, getOptions(done, 78,78), [{start:48, end:49}, {start:78, end:79}, {start: 88, end: 89}, {start: 100, end: 101}]);
			});
			
			/**
			 * Tests selections inside member expressions and whether they should be object property checks
			 * @see https://bugs.eclipse.org/bugs/show_bug.cgi?id=448543
			 */
			it('test_memberExpressionAsObjectProp7', function(done) {
				var text = "var a = {a: function a(){ var that = this; that.b(); return function() { that.b(); } }, b: function b(){} };";
				return computeOccurrences(text, getOptions(done, 88,88), [{start:48, end:49}, {start:78, end:79}, {start: 88, end: 89}, {start: 100, end: 101}]);
			});
			
			/**
			 * Tests selections inside member expressions and whether they should be object property checks
			 * @see https://bugs.eclipse.org/bugs/show_bug.cgi?id=448543
			 */
			it('test_memberExpressionAsObjectProp8', function(done) {
				var text = "var a = {a: function a(){ var that = this; that.b(); return function() { that.b(); } }, b: function b(){} };";
				return computeOccurrences(text, getOptions(done, 100,101), [{start:48, end:49}, {start:78, end:79}, {start: 88, end: 89}, {start: 100, end: 101}]);
			});
			
			/**
			 * Tests selections inside a computed property identifer are not treated as member expressions
			 * @see https://bugs.eclipse.org/bugs/show_bug.cgi?id=452161
			 */
			it('test_computedObjectProperty1', function(done) {
				var text = "var x = {a: {}, b: function(a) {var c = arr[a];} };";
				return computeOccurrences(text, getOptions(done, 9,10), [{start:9, end:10}]);
			});
			
			/**
			 * Tests selections inside a computed property identifer are not treated as member expressions
			 * @see https://bugs.eclipse.org/bugs/show_bug.cgi?id=452161
			 */
			it('test_computedObjectProperty2', function(done) {
				var text = "var x = {a: {}, b: function(a) {var c = arr[a];} };";
				return computeOccurrences(text, getOptions(done, 28,29), [{start:28, end:29}, {start:44, end:45}]);
			});
			
			/**
			 * Tests selections inside a computed property identifer are not treated as member expressions
			 * @see https://bugs.eclipse.org/bugs/show_bug.cgi?id=452161
			 */
			it('test_computedObjectProperty3', function(done) {
				var text = "var x = {a: {}, b: function(a) {var c = arr[a];} };";
				return computeOccurrences(text, getOptions(done, 44,45), [{start:28, end:29}, {start:44, end:45}]);
			});
			
			/**
			 * Tests that expression statements are marked as occurrences
			 * @see https://bugs.eclipse.org/bugs/show_bug.cgi?id=453337
			 */
			it('test_expressionStatements1', function(done) {
				var text = "var a; a; a=1; a;";
				return computeOccurrences(text, getOptions(done, 4,4), [{start:4, end:5}, {start:7, end:8}, {start:10, end:11}, {start:15, end:16}]);
			});
			
			/**
			 * Tests that expression statements are marked as occurrences
			 * @see https://bugs.eclipse.org/bugs/show_bug.cgi?id=453337
			 */
			it('test_expressionStatements2', function(done) {
				var text = "var a; a; a=1; a;";
				return computeOccurrences(text, getOptions(done, 8,8), [{start:4, end:5}, {start:7, end:8}, {start:10, end:11}, {start:15, end:16}]);
			});
			
			/**
			 * Tests that expression statements are marked as occurrences
			 * @see https://bugs.eclipse.org/bugs/show_bug.cgi?id=453337
			 */
			it('test_expressionStatements3', function(done) {
				var text = "var a; a; a=1; a;";
				return computeOccurrences(text, getOptions(done, 10,11), [{start:4, end:5}, {start:7, end:8}, {start:10, end:11}, {start:15, end:16}]);
			});
			
			/**
			 * Tests that expression statements are marked as occurrences
			 * @see https://bugs.eclipse.org/bugs/show_bug.cgi?id=453337
			 */
			it('test_expressionStatements4', function(done) {
				var text = "var a; a; a=1; a;";
				return computeOccurrences(text, getOptions(done, 15,16), [{start:4, end:5}, {start:7, end:8}, {start:10, end:11}, {start:15, end:16}]);
			});
			
			/**
			 * Tests that expression statements are marked as occurrences
			 * @see https://bugs.eclipse.org/bugs/show_bug.cgi?id=453337
			 */
			it('test_expressionStatementsHoisting1', function(done) {
				var text = "a; var a;";
				return computeOccurrences(text, getOptions(done, 0,1), [{start:0, end:1}, {start:7, end:8}]);
			});
			
			/**
			 * Tests that expression statements are marked as occurrences
			 * @see https://bugs.eclipse.org/bugs/show_bug.cgi?id=453337
			 */
			it('test_expressionStatementsHoisting2', function(done) {
				var text = "a; var a;";
				return computeOccurrences(text, getOptions(done, 7,7), [{start:0, end:1}, {start:7, end:8}]);
			});
			describe('Define and Require Statement Occurrences Tests', function() {
				beforeEach("Ensure test files", function() {
					worker.createTestFile('A', "");
					worker.createTestFile('B', "");
				});
				/**
				 * @see https://bugs.eclipse.org/bugs/show_bug.cgi?id=451957
				 * @since 10.0
				 */
				it('Unnamed Define statement 1', function(done) {
					
					var text = "define(['A', 'B'], function (a, b) { var x = a; var y = b; });";
					return computeOccurrences(text, getOptions(done, 10,10), [{start:8, end:11}, {start:29, end:30}, {start:45, end:46}]);
				});
				/**
				 * @see https://bugs.eclipse.org/bugs/show_bug.cgi?id=451957
				 * @since 10.0
				 */
				it('Unnamed Define statement 2', function(done) {
					var text = "define(['A', 'B'], function (a, b) { var x = a; var y = b; });";
					return computeOccurrences(text, getOptions(done, 29,29), [{start:8, end:11}, {start:29, end:30}, {start:45, end:46}]);
				});
				/**
				 * @see https://bugs.eclipse.org/bugs/show_bug.cgi?id=451957
				 * @since 10.0
				 */
				it('Unnamed Define statement 3', function(done) {
					var text = "define(['A', 'B'], function (a, b) { var x = a; var y = b; });";
					return computeOccurrences(text, getOptions(done, 46,46), [{start:8, end:11}, {start:29, end:30}, {start:45, end:46}]);
				});
				/**
				 * @see https://bugs.eclipse.org/bugs/show_bug.cgi?id=451957
				 * @since 10.0
				 */
				it('Unnamed Define statement 4', function(done) {
					var text = "define(['A', 'B'], function (a, b) { var x = a; var y = b; });";
					return computeOccurrences(text, getOptions(done, 14,15), [{start:13, end:16}, {start:32, end:33}, {start:56, end:57}]);
				});
				/**
				 * @see https://bugs.eclipse.org/bugs/show_bug.cgi?id=451957
				 * @since 10.0
				 */
				it('Unnamed Define statement 5', function(done) {
					var text = "define(['A', 'B'], function (a, b) { var x = a; var y = b; });";
					return computeOccurrences(text, getOptions(done, 33,33), [{start:13, end:16}, {start:32, end:33}, {start:56, end:57}]);
				});
				/**
				 * @see https://bugs.eclipse.org/bugs/show_bug.cgi?id=451957
				 * @since 10.0
				 */
				it('Unnamed Define statement 6', function(done) {
					var text = "define(['A', 'B'], function (a, b) { var x = a; var y = b; });";
					return computeOccurrences(text, getOptions(done, 56,56), [{start:13, end:16}, {start:32, end:33}, {start:56, end:57}]);
				});			
				/**
				 * @see https://bugs.eclipse.org/bugs/show_bug.cgi?id=451957
				 * @since 10.0
				 */
				it('Named Define statement 1', function(done) {
					var text = "define('ABC', ['A', 'B'], function (a, b) { var x = a; var y = b; });";
					return computeOccurrences(text, getOptions(done, 17,17), [{start:15, end:18}, {start:36, end:37}, {start:52, end:53}]);
				});
				/**
				 * @see https://bugs.eclipse.org/bugs/show_bug.cgi?id=451957
				 * @since 10.0
				 */
				it('Named Define statement 2', function(done) {
					var text = "define('ABC', ['A', 'B'], function (a, b) { var x = a; var y = b; });";
					return computeOccurrences(text, getOptions(done, 37,37), [{start:15, end:18}, {start:36, end:37}, {start:52, end:53}]);
				});
				/**
				 * @see https://bugs.eclipse.org/bugs/show_bug.cgi?id=451957
				 * @since 10.0
				 */
				it('Named Define statement 3', function(done) {
					var text = "define('ABC', ['A', 'B'], function (a, b) { var x = a; var y = b; });";
					return computeOccurrences(text, getOptions(done, 52,53), [{start:15, end:18}, {start:36, end:37}, {start:52, end:53}]);
				});
				/**
				 * @see https://bugs.eclipse.org/bugs/show_bug.cgi?id=451957
				 * @since 10.0
				 */
				it('Named Define statement 4', function(done) {
					var text = "define('ABC', ['A', 'B'], function (a, b) { var x = a; var y = b; });";
					return computeOccurrences(text, getOptions(done, 21,21), [{start:20, end:23}, {start:39, end:40}, {start:63, end:64}]);
				});
				/**
				 * @see https://bugs.eclipse.org/bugs/show_bug.cgi?id=451957
				 * @since 10.0
				 */
				it('Named Define statement 5', function(done) {
					var text = "define('ABC', ['A', 'B'], function (a, b) { var x = a; var y = b; });";
					return computeOccurrences(text, getOptions(done, 39,39), [{start:20, end:23}, {start:39, end:40}, {start:63, end:64}]);
				});
				/**
				 * @see https://bugs.eclipse.org/bugs/show_bug.cgi?id=451957
				 * @since 10.0
				 */
				it('Named Define statement 6', function(done) {
					var text = "define('ABC', ['A', 'B'], function (a, b) { var x = a; var y = b; });";
					return computeOccurrences(text, getOptions(done, 64,64), [{start:20, end:23}, {start:39, end:40}, {start:63, end:64}]);
				});
				/**
				 * @see https://bugs.eclipse.org/bugs/show_bug.cgi?id=451957
				 * @since 10.0
				 */
				it('Mismatched Define statement 1', function(done) {
					var text = "define(['A', 'B'], function (a) { var x = a; var b = null; });";
					return computeOccurrences(text, getOptions(done, 9,9), [{start:8, end:11}, {start:29, end:30}, {start:42, end:43}]);
				});
				/**
				 * @see https://bugs.eclipse.org/bugs/show_bug.cgi?id=451957
				 * @since 10.0
				 */
				it('Mismatched Define statement 2', function(done) {
					var text = "define(['A', 'B'], function (a) { var x = a; var b = null; });";
					return computeOccurrences(text, getOptions(done, 29,29), [{start:8, end:11}, {start:29, end:30}, {start:42, end:43}]);
				});
				/**
				 * @see https://bugs.eclipse.org/bugs/show_bug.cgi?id=451957
				 * @since 10.0
				 */
				it('Mismatched Define statement 3', function(done) {
					var text = "define(['A', 'B'], function (a) { var x = a; var b = null; });";
					return computeOccurrences(text, getOptions(done, 43,43), [{start:8, end:11}, {start:29, end:30}, {start:42, end:43}]);
				});
				/**
				 * @see https://bugs.eclipse.org/bugs/show_bug.cgi?id=451957
				 * @since 10.0
				 */
				it('Mismatched Define statement 4', function(done) {
					var text = "define(['A', 'B'], function (a) { var x = a; var b = null; });";
					return computeOccurrences(text, getOptions(done, 14,14), []);
				});
				/**
				 * @see https://bugs.eclipse.org/bugs/show_bug.cgi?id=451957
				 * @since 10.0
				 */
				it('Mismatched Define statement 5', function(done) {
					var text = "define(['A', 'B'], function (a) { var x = a; var b = null; });";
					return computeOccurrences(text, getOptions(done, 49,50), [{start:49, end:50}]);
				});
				// TODO Require statements not supported yet
				/**
				 * @see https://bugs.eclipse.org/bugs/show_bug.cgi?id=474816
				 * @since 10.0
				 */
				it('Require statement 1', function(done) {
					var text = "define(function (require) { var a = require('A'); });";
					return computeOccurrences(text, getOptions(done, 20,20), [{start:17, end:24}, {start:36, end:43}]);
				});
				/**
				 * @see https://bugs.eclipse.org/bugs/show_bug.cgi?id=474816
				 * @since 10.0
				 */
				it('Require statement 2', function(done) {
					var text = "define(function (require) { var a = require('A'); });";
					return computeOccurrences(text, getOptions(done, 36,36), [{start:17, end:24}, {start:36, end:43}]);
				});
				/**
				 * @see https://bugs.eclipse.org/bugs/show_bug.cgi?id=474816
				 * @since 10.0
				 */
				it.skip('Require statement 3', function(done) {
					var text = "define(function (require) { var a = require('A'); });";
					return computeOccurrences(text, getOptions(done, 32,33), [{start:32, end:33}, {start:44, end:47}]);
				});
				/**
				 * @see https://bugs.eclipse.org/bugs/show_bug.cgi?id=474816
				 * @since 10.0
				 */
				it.skip('Require statement 4', function(done) {
					var text = "define(function (require) { var a = require('A'); });";
					return computeOccurrences(text, getOptions(done, 45,45), [{start:32, end:33}, {start:44, end:47}]);
				});
				/**
				 * @see https://bugs.eclipse.org/bugs/show_bug.cgi?id=474816
				 * @since 10.0
				 */
				it.skip('Require with Define statement 1', function(done) {
					var text = "define(['require', 'A'], function (require) { var a = require('A'); });";
					return computeOccurrences(text, getOptions(done, 21,21), [{start:20, end:21}, {start:50, end:51}, {start:62, end:65}]);
				});
				/**
				 * @see https://bugs.eclipse.org/bugs/show_bug.cgi?id=474816
				 * @since 10.0
				 */
				it.skip('Require with Define statement 1', function(done) {
					var text = "define(['require', 'A'], function (require) { var a = require('A'); });";
					return computeOccurrences(text, getOptions(done, 50,50), [{start:20, end:21}, {start:50, end:51}, {start:62, end:65}]);
				});
				/**
				 * @see https://bugs.eclipse.org/bugs/show_bug.cgi?id=474816
				 * @since 10.0
				 */
				it.skip('Require with Define statement 1', function(done) {
					var text = "define(['require', 'A'], function (require) { var a = require('A'); });";
					return computeOccurrences(text, getOptions(done, 63,63), [{start:20, end:21}, {start:50, end:51}, {start:62, end:65}]);
				});
			});
			describe('HTML script block occurrences tests', function(done) {
				/**
				 * Tests computing occurrences from a script block in the <head> block
				 * @see https://bugs.eclipse.org/bugs/show_bug.cgi?id=430299
				 */
				it('test_htmlHead1', function(done) {
				    var text = "<!DOCTYPE html><head><script>function f() {}</script></head><html></html>";
					return computeOccurrences(text, getOptions(done, 39, 39, 'text/html'), [{start:38, end:39}]);
				});
				
				/**
				 * Tests computing occurrences from a script block in the <head> block
				 * @see https://bugs.eclipse.org/bugs/show_bug.cgi?id=430299
				 */
				it('test_htmlHead2', function(done) {
				    var text = "<!DOCTYPE html><head><scRipt>function f() {}</script></head><html></html>";
					return computeOccurrences(text, getOptions(done, 39, 39, 'text/html'), [{start:38, end:39}]);
				});
				
				/**
				 * Tests computing occurrences from a script block in the <head> block
				 * @see https://bugs.eclipse.org/bugs/show_bug.cgi?id=430299
				 */
				it('test_htmlHead3', function(done) {
				    var text = "<!DOCTYPE html><head><scRipt  >function f() {}</script></head><html></html>";
					return computeOccurrences(text, getOptions(done, 41, 41, 'text/html'), [{start:40, end:41}]);
				});
				
				/**
				 * Tests computing occurrences from a script block in the <head> block
				 * @see https://bugs.eclipse.org/bugs/show_bug.cgi?id=430299
				 */
				it('test_htmlHeadMulti1', function(done) {
				    var text = "<!DOCTYPE html><head><script>function f() {}</script><script>function f() {}</script></head><html></html>";
					return computeOccurrences(text, getOptions(done, 39, 39, 'text/html'), [{start:38, end:39}, {start:70, end:71}]);
				});
				
				/**
				 * Tests computing occurrences from a script block in the <head> block
				 * @see https://bugs.eclipse.org/bugs/show_bug.cgi?id=430299
				 */
				it('test_htmlHeadMulti2', function(done) {
				    var text = "<!DOCTYPE html><head><scRipt>function f() {}</script><script>function f() {}</script></head><html></html>";
					return computeOccurrences(text, getOptions(done, 39, 39, 'text/html'), [{start:38, end:39}, {start:70, end:71}]);
				});
				
				/**
				 * Tests computing occurrences from a script block in the <head> block
				 * @see https://bugs.eclipse.org/bugs/show_bug.cgi?id=430299
				 */
				it('test_htmlHeadMulti3', function(done) {
				    var text = "<!DOCTYPE html><head><scRipt   >function f() {}</script><script>function f() {}</script></head><html></html>";
					return computeOccurrences(text, getOptions(done, 42, 42, 'text/html'), [{start:41, end:42}, {start:73, end:74}]);
				});
				
				/**
				 * Tests computing occurrences from a script block in the <head> block
				 * @see https://bugs.eclipse.org/bugs/show_bug.cgi?id=430299
				 */
				it('test_htmlHeadMulti4', function(done) {
				    var text = "<!DOCTYPE html><head><scRipt   >function f() {}</script><script>function f() {}</script></head><html></html>";
					return computeOccurrences(text, getOptions(done, 74, 74, 'text/html'), [{start:41, end:42}, {start:73, end:74}]);
				});
				/**
				 * Tests support for occurrences inside embedded script blocks in HTML
				 * @see https://bugs.eclipse.org/bugs/show_bug.cgi?id=476592
				 * @since 10.0
				 */
				it('HTML script block - simple occurrences 1', function(done) {
					var text = "<html><head><script>var xx = 0; xx = 5;</script></head></html>";
					return computeOccurrences(text, getOptions(done, 25,25, 'text/html'), [{start:24, end:26}, {start:32, end:34}]);
				});
				/**
				 * Tests support for occurrences inside embedded script blocks in HTML
				 * @see https://bugs.eclipse.org/bugs/show_bug.cgi?id=476592
				 * @since 10.0
				 */
				it('HTML script block - simple occurrences 2', function(done) {
					var text = "<html><head><script>var xx = 0; xx = 5;</script></head></html>";
					return computeOccurrences(text, getOptions(done, 32,34, 'text/html'), [{start:24, end:26}, {start:32, end:34}]);
				});
				/**
				 * Tests support for occurrences inside embedded script blocks in HTML
				 * @see https://bugs.eclipse.org/bugs/show_bug.cgi?id=476592
				 * @since 10.0
				 */
				it('HTML script block - simple occurrences missing semi 1', function(done) {
					var text = "<html><head><script>var xx = 0; xx</script></head></html>";
					return computeOccurrences(text, getOptions(done, 24,24, 'text/html'), [{start:24, end:26}, {start:32, end:34}]);
				});
				/**
				 * Tests support for occurrences inside embedded script blocks in HTML
				 * @see https://bugs.eclipse.org/bugs/show_bug.cgi?id=476592
				 * @since 10.0
				 */
				it('HTML script block - simple occurrences missing semi 2', function(done) {
					var text = "<html><head><script>var xx = 0; xx</script></head></html>";
					return computeOccurrences(text, getOptions(done, 34,34, 'text/html'), [{start:24, end:26}, {start:32, end:34}]);
				});
				/**
				 * Tests support for occurrences inside embedded script blocks in HTML
				 * @see https://bugs.eclipse.org/bugs/show_bug.cgi?id=476592
				 * @since 10.0
				 */
				it('HTML script block - empty script block', function(done) {
					var text = "<html><head><script></script></head></html>";
					return computeOccurrences(text, getOptions(done, 20,20, 'text/html'), []);
				});
				/**
				 * Tests support for occurrences inside embedded script blocks in HTML
				 * @see https://bugs.eclipse.org/bugs/show_bug.cgi?id=476592
				 * @since 10.0
				 */
				it('HTML script block - multi block occurrences 1', function(done) {
					var text = "<html><head><script>var xx = 0; xx;</script></head><body><a>xx</a><script>xx;</script></body></html>";
					return computeOccurrences(text, getOptions(done, 26,26, 'text/html'), [{start:24, end:26}, {start:32, end:34}, {start:74, end:76}]);
				});
				/**
				 * Tests support for occurrences inside embedded script blocks in HTML
				 * @see https://bugs.eclipse.org/bugs/show_bug.cgi?id=476592
				 * @since 10.0
				 */
				it('HTML script block - multi block occurrences 2', function(done) {
					var text = "<html><head><script>var xx = 0; xx;</script></head><body><a>xx</a><script>xx;</script></body></html>";
					return computeOccurrences(text, getOptions(done, 34,34, 'text/html'), [{start:24, end:26}, {start:32, end:34}, {start:74, end:76}]);
				});
				/**
				 * Tests support for occurrences inside embedded script blocks in HTML
				 * @see https://bugs.eclipse.org/bugs/show_bug.cgi?id=476592
				 * @since 10.0
				 */
				it('HTML script block - multi block occurrences 3', function(done) {
					var text = "<html><head><script>var xx = 0; xx;</script></head><body><a>xx</a><script>xx;</script></body></html>";
					return computeOccurrences(text, getOptions(done, 74,76, 'text/html'), [{start:24, end:26}, {start:32, end:34}, {start:74, end:76}]);
				});
				/**
				 * Tests support for occurrences inside embedded script blocks in HTML
				 * @see https://bugs.eclipse.org/bugs/show_bug.cgi?id=476592
				 * @since 10.0
				 */
				it('HTML script block - multi block occurrences hoisting 1', function(done) {
					var text = "<html><head><script>xx;</script></head><body><a>xx</a><script>xx; var xx = 0;</script></body></html>";
					return computeOccurrences(text, getOptions(done, 21,21, 'text/html'), [{start:20, end:22}, {start:62, end:64}, {start:70, end:72}]);
				});
				/**
				 * Tests support for occurrences inside embedded script blocks in HTML
				 * @see https://bugs.eclipse.org/bugs/show_bug.cgi?id=476592
				 * @since 10.0
				 */
				it('HTML script block - multi block occurrences hoisting 2', function(done) {
					var text = "<html><head><script>xx;</script></head><body><a>xx</a><script>xx; var xx = 0;</script></body></html>";
					return computeOccurrences(text, getOptions(done, 62,62, 'text/html'), [{start:20, end:22}, {start:62, end:64}, {start:70, end:72}]);
				});
				/**
				 * Tests support for occurrences inside embedded script blocks in HTML
				 * @see https://bugs.eclipse.org/bugs/show_bug.cgi?id=476592
				 * @since 10.0
				 */
				it('HTML script block - multi block occurrences hoisting 3', function(done) {
					var text = "<html><head><script>xx;</script></head><body><a>xx</a><script>xx; var xx = 0;</script></body></html>";
					return computeOccurrences(text, getOptions(done, 71,72, 'text/html'), [{start:20, end:22}, {start:62, end:64}, {start:70, end:72}]);
				});
				/**
				 * Tests support for occurrences inside embedded script blocks in HTML
				 * @see https://bugs.eclipse.org/bugs/show_bug.cgi?id=476592
				 * @since 10.0
				 */
				it('HTML wrapped function call - script blocks show occurrences 1', function(done) {
					var text = '<html><head><script>this.xx = function(){};</script></head><body><a onclick="xx()">xx()</a></body></html>';
					return computeOccurrences(text, getOptions(done, 25,25, 'text/html'), [{start:25, end:27}]);
				});
				/**
				 * Tests support for occurrences inside embedded script blocks in HTML
				 * @see https://bugs.eclipse.org/bugs/show_bug.cgi?id=476592
				 * @since 10.0
				 */
				it('HTML wrapped function call - script blocks show occurrences 2', function(done) {
					var text = '<html><head><script>this.xx = function(){};</script></head><body><a onclick="xx()">xx()</a></body></html>';
					return computeOccurrences(text, getOptions(done, 77,77, 'text/html'), [{start:77, end:79}]);
				});
				/**
				 * Tests support for occurrences inside embedded script blocks in HTML
				 * @see https://bugs.eclipse.org/bugs/show_bug.cgi?id=476592
				 * @since 10.0
				 */
				it('HTML wrapped function call - script blocks show occurrences 3', function(done) {
					var text = '<html><head><script>var xx = function(){};</script></head><body><a onclick="xx()">xx()</a></body></html>';
					return computeOccurrences(text, getOptions(done, 24,24, 'text/html'), [{start:24, end:26}, {start:76, end:78}]);
				});
				/**
				 * Tests support for occurrences inside embedded script blocks in HTML
				 * @see https://bugs.eclipse.org/bugs/show_bug.cgi?id=476592
				 * @since 10.0
				 */
				it('HTML wrapped function call - script blocks show occurrences 4', function(done) {
					var text = '<html><head><script>var xx = function(){};</script></head><body><a onclick="xx()">xx()</a></body></html>';
					return computeOccurrences(text, getOptions(done, 76,76, 'text/html'), [{start:24, end:26}, {start:76, end:78}]);
				});
				/**
				 * Tests support for occurrences inside embedded script blocks in HTML
				 * @see https://bugs.eclipse.org/bugs/show_bug.cgi?id=476592
				 * @since 10.0
				 */
				it('HTML wrapped function call - occurrences ignore order 1', function(done) {
					var text = '<html><body><a onclick="xx()">xx()</a><script>this.xx = function(){};</script></body></html>';
					return computeOccurrences(text, getOptions(done, 25,25, 'text/html'), [{start:24, end:26}]);
				});
				/**
				 * Tests support for occurrences inside embedded script blocks in HTML
				 * @see https://bugs.eclipse.org/bugs/show_bug.cgi?id=476592
				 * @since 10.0
				 */
				it('HTML wrapped function call - occurrences ignore order 2', function(done) {
					var text = '<html><body><a onclick="xx()">xx()</a><script>this.xx = function(){};</script></body></html>';
					return computeOccurrences(text, getOptions(done, 51,53, 'text/html'), [{start:51, end:53}]);
				});
				/**
				 * Tests support for occurrences inside embedded script blocks in HTML
				 * @see https://bugs.eclipse.org/bugs/show_bug.cgi?id=476592
				 * @since 10.0
				 */
				it('HTML wrapped function call - occurrences ignore order 3', function(done) {
					var text = '<html><body><a onclick="xx()">xx()</a><script>var xx = function(){};</script></body></html>';
					return computeOccurrences(text, getOptions(done, 25,25, 'text/html'), [{start:24, end:26}, {start:50, end:52}]);
				});
				/**
				 * Tests support for occurrences inside embedded script blocks in HTML
				 * @see https://bugs.eclipse.org/bugs/show_bug.cgi?id=476592
				 * @since 10.0
				 */
				it('HTML wrapped function call - occurrences ignore order 4', function(done) {
					var text = '<html><body><a onclick="xx()">xx()</a><script>var xx = function(){};</script></body></html>';
					return computeOccurrences(text, getOptions(done, 50,52, 'text/html'), [{start:24, end:26}, {start:50, end:52}]);
				});
				/**
				 * Tests support for occurrences inside embedded script blocks in HTML
				 * @see https://bugs.eclipse.org/bugs/show_bug.cgi?id=476592
				 * @since 10.0
				 */
				it('HTML wrapped function call - occurrences only inside blocks', function(done) {
					var text = '<html><body><a onclick="xx()">xx()</a><script>this.xx = function(){};</script></body></html>';
					return computeOccurrences(text, getOptions(done, 30,30, 'text/html'), []);
				});
				
			});
		});
	};
});
