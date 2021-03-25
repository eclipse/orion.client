/*******************************************************************************
 * @license
 * Copyright (c) 2013, 2016 IBM Corporation and others.
 * All rights reserved. This program and the accompanying materials are made 
 * available under the terms of the Eclipse Public License 2.0 
 * (http://www.eclipse.org/legal/epl-v10.html), and the Eclipse Distribution 
 * License v1.0 (http://www.eclipse.org/org/documents/edl-v10.html). 
 * 
 * Contributors: IBM Corporation - initial API and implementation
 ******************************************************************************/
/*eslint-env amd, mocha */
/* eslint-disable missing-nls */
define([
	'chai/chai',
	'orion/Deferred',
	'javascript/outliner',
	'mocha/mocha' //not a module, leave it at the end
], function(chai, Deferred, Outliner) {
	
	var assert = chai.assert;	

	return function(worker) {
		describe('ES6 Outliner Tests', function(){
			this.timeout(10000);
			
			before('Reset Tern Server', function(done) {
				worker.start(done,  {options:{ecmaVersion:6, sourceType:"module"}});
			});
			
		    function setup(callback, text, contentType) {
		    	worker.setTestState({callback: callback});
		        return {
			        outliner: new Outliner.JSOutliner(worker),
			        editorContext: {
			            getText: function() {
	        				return new Deferred().resolve(text);
	        			},
	        			
	        			getFileMetadata: function() {
	        			    var o = Object.create(null);
	        			    o.contentType = Object.create(null);
	        			    o.contentType.id = contentType ? contentType : 'application/javascript';
	        			    o.location = 'outliner_test_script.js';
	        			    return new Deferred().resolve(o);
	        			}
			        }
		        };
		    }
				
			function assertOutline(computed, expected){
				function assertElementRecurse(curComputed, curExpected) {
					if (Array.isArray(curComputed)) {
						assert(Array.isArray(curExpected), "Outline has an array of elements" + printOutput(computed, expected));
						assert.equal(curComputed.length, curExpected.length, "Outline has unexpected number of entries" + printOutput(computed, expected));
						for (var i = 0; i < curComputed.length; i++) {
							assertElementRecurse(curComputed[i], curExpected[i]);
						}
					} else {
						assert(curComputed, "The tested element cannot be null" + printOutput(computed, expected));
						assert(curComputed.label, "The outlined element must have a label" + printOutput(computed, expected));
						if (curExpected.start !== 0){
							assert.equal(curComputed.start, curExpected.start, "Wrong start range" + printOutput(computed, expected));
							assert.equal(curComputed.end, curExpected.end, "Wrong start range" + printOutput(computed, expected));
						}
						var fullLabel = curComputed.label;
						if (curComputed.labelPre){
							fullLabel = curComputed.labelPre + fullLabel;
						}
						if (curComputed.labelPost){
							fullLabel += curComputed.labelPost;
						}
						assert.equal(fullLabel, curExpected.label, "Wrong label" + printOutput(computed, expected));
						if (curComputed.children){
							assertElementRecurse(curComputed.children, curExpected.children);
						}
					}
				}
				try {
					assertElementRecurse(computed, expected);
					worker.getTestState().callback();
				} catch(err) {
					worker.getTestState().callback(err);
				}
		    }
		    
		    function printOutput(computed, expected){
		    	function printOutputRecurse(element){
		    		var result;
		    		if (Array.isArray(element)) {
		    			result = '[';
		    			for (var i = 0; i < element.length; i++) {
		    				result += printOutputRecurse(element[i]);
		    			}
		    			result += ']';
		    			return result;
	    			}
    				result = '{\n';
					var label = element.label;
					if (element.labelPre){
						label = element.labelPre + label;
					}
					if (element.labelPost){
						label += element.labelPost;
					}
    				result += '\tlabel: "' + label + '",\n';
    				result += '\tstart: ' + element.start + ',\n';
    				result += '\tend: ' + element.end + ',\n';
    				if (element.children){
    					result += '\tchildren:\n' + printOutputRecurse(element.children);
					}
    				result += '},\n';
    				return result;
	    		}
				var output = '\nActual:\n';
				output += printOutputRecurse(computed);
				output += '\nExpected:\n';
				output += printOutputRecurse(expected);
				return output;
		    }

			it('test class definition with constructor', function(callback) {
				var r = setup(callback,
					"class A {\n" +
					"	constructor(a, b) {\n" +
					"		this.a = a;\n" +
					"		this.b = b;\n" +
					"	}\n" +
					"}");
				r.outliner.computeOutline(r.editorContext).then(function(outline) {
					assertOutline(outline, [{
						label: "class A",
							start: 6,
							end: 7,
							children:
							[{
								label: "constructor(a, b)",
								start: 11,
								end: 61,
							},
						]
					}]);
				});
			});
			it('test anonymous class expression', function(callback) {
				var r = setup(callback,
					"var c = class {\n" +
					"}");
				r.outliner.computeOutline(r.editorContext).then(function(outline) {
					assertOutline(outline, [{
						label: "class <anonymous>",
						start: 8,
						end: 13,
					}]);
				});
			});
			it('test array function expression', function(callback) {
				var r = setup(callback, "() => {return \"hello!\";};");
				r.outliner.computeOutline(r.editorContext).then(function(outline) {
					assertOutline(outline, [{
						label: "arrow function()",
						start: 0,
						end: 24,
					}]);
				});
			});
			it('test array function expression 2', function(callback) {
				var r = setup(callback, "(val) => {return val;};");
				r.outliner.computeOutline(r.editorContext).then(function(outline) {
					assertOutline(outline, [{
						label: "arrow function(val)",
						start: 0,
						end: 22,
					}]);
				});
			});
			it('test array function expression 3', function(callback) {
				var r = setup(callback, "val => {return val;};");
				r.outliner.computeOutline(r.editorContext).then(function(outline) {
					assertOutline(outline, [{
						label: "arrow function(val)",
						start: 0,
						end: 20,
					}]);
				});
			});
			it('test let ObjectExpression', function(callback) {
				var r = setup(callback, "let object = {\"a\": \"\", \"b\": \"\", \"c\": \"\"};");
				r.outliner.computeOutline(r.editorContext).then(function(outline) {
					assertOutline(outline, [{
						label: "let object = {Object, Object, Object}",
						start: 4,
						end: 10,
						children:
						[{
							label: "a",
							start: 14,
							end: 17,
						},
						{
							label: "b",
							start: 23,
							end: 26,
						},
						{
							label: "c",
							start: 32,
							end: 35,
						}]
					}]);
				});
			});
			it('test const ObjectExpression', function(callback) {
				var r = setup(callback, "const object = {\"a\": \"\", \"b\": \"\", \"c\": \"\"};");
				r.outliner.computeOutline(r.editorContext).then(function(outline) {
					assertOutline(outline, [{
						label: "const object = {Object, Object, Object}",
						start: 6,
						end: 12,
						children:
						[{
							label: "a",
							start: 16,
							end: 19,
						},
						{
							label: "b",
							start: 25,
							end: 28,
						},
						{
							label: "c",
							start: 34,
							end: 37,
						},
						]
					}]);
				});
			});
			/**
			 * @see https://bugs.eclipse.org/bugs/show_bug.cgi?id=506987
			 */
			it('test method definitions 1', function(callback) {
				var r = setup(callback, "class C {f() {return {};}}");
				r.outliner.computeOutline(r.editorContext).then(function(outline) {
					assertOutline(outline, [{
						label: "class C",
						start: 6,
						end: 7,
						children:
						[{
							label: "f()",
							start: 9,
							end: 25,
							children:
							[{
								label: "return {...}",
								start: 14,
								end: 20,
							},
							]},
						]
					}]);
				});
			});
			it('Arrow function declaration', function(callback) {
				var r = setup(callback, '() => 5;');
				r.outliner.computeOutline(r.editorContext).then(function(outline) {
					assertOutline(outline, [{
						label: "arrow function()",
						start: 0,
						end: 7,
					}]);
				});
			});
			
			it('Call Expression 1', function(callback) {
					var r = setup(callback, "describe(() => {});");
					r.outliner.computeOutline(r.editorContext).then(function(outline) {
						assertOutline(outline, [{
							label: "arrow function() - describe(() => {...})",
							start: 9,
							end: 17,
						},
						]);
					});
				});
				it('Call Expression 2', function(callback) {
					var r = setup(callback, "describe((a) => {});");
					r.outliner.computeOutline(r.editorContext).then(function(outline) {
						assertOutline(outline, [{
							label: "arrow function(a) - describe(() => {...})",
							start: 9,
							end: 18,
						}]);
					});
				});
				it('Call Expression 3', function(callback) {
					var r = setup(callback, "describe((a, b, c) => { var x = a;});");
					r.outliner.computeOutline(r.editorContext).then(function(outline) {
						assertOutline(outline, [{
							label: "arrow function(a, b, c) - describe(() => {...})",
							start: 9,
							end: 35,
						}]);
					});
				});
				it('Call Expression 4', function(callback) {
					var r = setup(callback, "describe('abc', () => {});");
					r.outliner.computeOutline(r.editorContext).then(function(outline) {
						assertOutline(outline, [{
							label: "arrow function() - describe('abc', () => {...})",
							start: 16,
							end: 24,
						}]);
					});
				});
				it('Call Expression 5', function(callback) {
					var r = setup(callback, "describe(42, () => { var x = a});");
					r.outliner.computeOutline(r.editorContext).then(function(outline) {
						assertOutline(outline, [{
							label: "arrow function() - describe(42, () => {...})",
							start: 13,
							end: 31,
						}]);
					});
				});
				it('Call Expression 6', function(callback) {
					var r = setup(callback, "describe(42, 'abc', () => {}, () => {});");
					r.outliner.computeOutline(r.editorContext).then(function(outline) {
						assertOutline(outline, [{
							label: "arrow function() - describe(42, 'abc', () => {...}, () => {...})",
							start: 20,
							end: 28,
						},
						{
							label: "arrow function() - describe(42, 'abc', () => {...}, () => {...})",
							start: 30,
							end: 38,
						}]);
					});
				});
				it('Call Expression 7', function(callback) {
					var r = setup(callback, "describe('123456789012345678901234567890', () => {}, () => {});");
					r.outliner.computeOutline(r.editorContext).then(function(outline) {
						assertOutline(outline, [{
							label: "arrow function() - describe('123456789012345678901234567890', () => {...}, ...)",
							start: 43,
							end: 51,
						},
						{
							label: "arrow function() - describe('123456789012345678901234567890', () => {...}, ...)",
							start: 53,
							end: 61,
						}]);
					});
				});
		});
	};
});
