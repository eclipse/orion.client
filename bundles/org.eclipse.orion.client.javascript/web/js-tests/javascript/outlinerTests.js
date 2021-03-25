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
		describe('Outliner Tests', function() {
			this.timeout(10000);
			
			before('Reset Tern Server', function(done) {
				worker.start(done); // Reset the tern server state to remove any prior files
			});
			
			var showAST = false;
			
		    function setup(callback, text, contentType) {
		    	worker.setTestState({callback: callback});
		        return {
			        outliner: new Outliner.JSOutliner(worker, showAST),
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
			
			describe('Source Outliner Tests', function() {
				beforeEach('Display source outline', function(done) {
					showAST = false;
					done();
				});
				it('testfuncDeclaration1', function(callback) {
					var r = setup(callback, "function F1(p1, p2) {};");
					r.outliner.computeOutline(r.editorContext).then(function(outline) {
						assertOutline(outline, [{
							label: "F1(p1, p2)",
							start: 9,
							end: 11,
						},
						]);
					});
				});
				/**
				 * https://bugs.eclipse.org/bugs/show_bug.cgi?id=457057
				 */
				it('testMemberExpressionLiteral1', function(callback) {
					var r = setup(callback, "Foo[\'bar\'] = function() {}");
					r.outliner.computeOutline(r.editorContext).then(function(outline) {
						assertOutline(outline, [{
							label: "Foo.bar()",
							start: 0,
							end: 10,
						},
						]);
					});
				});
				/**
				 * https://bugs.eclipse.org/bugs/show_bug.cgi?id=457057
				 */
				it('testMemberExpressionLiteral2', function(callback) {
					var r = setup(callback, "Foo[\'bar\'].baz = function() {}");
					r.outliner.computeOutline(r.editorContext).then(function(outline) {
						assertOutline(outline, [{
							label: "Foo.bar.baz()",
							start: 0,
							end: 14,
						},
						]);
					});
				});
				/**
				 * https://bugs.eclipse.org/bugs/show_bug.cgi?id=457057
				 */
				it('testMemberExpressionLiteral3', function(callback) {
					var r = setup(callback, "Foo.baz[\'bar\'] = function() {}");
					r.outliner.computeOutline(r.editorContext).then(function(outline) {
						assertOutline(outline, [{
							label: "Foo.baz.bar()",
							start: 0,
							end: 14,
						},
						]);
					});
				});
				
				it('testfuncExpression1', function(callback) {
					var r = setup(callback, "var obj = {\n"+
						"\titem: function(p1, p2) {}\n"+
						"};");
					r.outliner.computeOutline(r.editorContext).then(function(outline) {
						assertOutline(outline, [{
							label: "var obj = {item}",
							start: 4,
							end: 7,
							children:
							[{
								label: "item(p1, p2)",
								start: 13,
								end: 17,
							},
							]},
						]);
					});
				});
				it('testLabelledFuncExpr1', function(callback) {
					var r = setup(callback, "var obj = function foo(p1, p2) {};");
					r.outliner.computeOutline(r.editorContext).then(function(outline) {
						assertOutline(outline, [{
							label: "foo(p1, p2)",
							start: 19,
							end: 22,
						},
						]);
					});
				});
				it('testLabelledFuncExpr2', function(callback) {
					var r = setup(callback, "console.log(function foo(p1, p2) {});");
					r.outliner.computeOutline(r.editorContext).then(function(outline) {
						assertOutline(outline, [{
							label: "foo(p1, p2)",
							start: 21,
							end: 24,
						},
						]);
					});
				});
				
				it('testObjectExpression1', function(callback) {
					var r = setup(callback, "var object = {};");
					r.outliner.computeOutline(r.editorContext).then(function(outline) {
						assertOutline(outline, [{
							label: "var object = {...}",
							start: 4,
							end: 10,
						},
						]);
					});
				});
				
				it('testObjectExpression2', function(callback) {
					var r = setup(callback, "var object = {a: \"\", b: \"\", c: \"\"};");
					r.outliner.computeOutline(r.editorContext).then(function(outline) {
						assertOutline(outline, [{
							label: "var object = {a, b, c}",
							start: 4,
							end: 10,
							children:
							[{
								label: "a",
								start: 14,
								end: 15,
							},
							{
								label: "b",
								start: 21,
								end: 22,
							},
							{
								label: "c",
								start: 28,
								end: 29,
							},
							]
						},
						]);
					});
				});
				
				it('testObjectExpression3', function(callback) {
					var r = setup(callback, "var object = {\"a\": \"\", \"b\": \"\", \"c\": \"\"};");
					r.outliner.computeOutline(r.editorContext).then(function(outline) {
						assertOutline(outline, [{
							label: "var object = {Object, Object, Object}",
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
							},
							]},
						]);
					});
				});
				
				it('testObjectExpression3b', function(callback) {
					// Max length for properties is 50 characters
					var r = setup(callback, "var object = {A123456789B123456789C123456789D123456789E123456789: \"\"};");
					r.outliner.computeOutline(r.editorContext).then(function(outline) {
						assertOutline(outline, [{
							label: "var object = {A123456789B123456789C123456789D123456789E123456789}",
							start: 4,
							end: 10,
							children:
							[{
								label: "A123456789B123456789C123456789D123456789E123456789",
								start: 14,
								end: 64,
							},
							]},
						]);
					});
				});
				
				it('testObjectExpression4', function(callback) {
					// Max length for properties is 50 characters
					var r = setup(callback, "var object = {A123456789B123456789C123456789D123456789E123456789F: \"\"};");
					r.outliner.computeOutline(r.editorContext).then(function(outline) {
						assertOutline(outline, [{
							label: "var object = {...}",
							start: 4,
							end: 10,
							children:
							[{
								label: "A123456789B123456789C123456789D123456789E123456789F",
								start: 14,
								end: 65,
							},
							]},
						]);
					});
				});
				
				it('testObjectExpression5', function(callback) {
					// Max length for properties is 50 characters
					var r = setup(callback, "var object = {a: \"\", b: \"\", A123456789B123456789C123456789D123456789E123456789F: \"\"};");
					r.outliner.computeOutline(r.editorContext).then(function(outline) {
						assertOutline(outline, [{
							label: "var object = {a, b, ...}",
							start: 4,
							end: 10,
							children:
							[{
								label: "a",
								start: 14,
								end: 15,
							},
							{
								label: "b",
								start: 21,
								end: 22,
							},
							{
								label: "A123456789B123456789C123456789D123456789E123456789F",
								start: 28,
								end: 79,
							},
							]},
						]);
					});
				});
				
				it('testClosure1', function(callback) {
					var r = setup(callback, "foo.bar({});");
					r.outliner.computeOutline(r.editorContext).then(function(outline) {
						assertOutline(outline, [{
							label: "closure {...}",
							start: 8,
							end: 10,
						},
						]);
					});
				});
				
				it('testClosure2', function(callback) {
					var r = setup(callback, "foo.bar({a: \"\", b: \"\"});");
					r.outliner.computeOutline(r.editorContext).then(function(outline) {
						assertOutline(outline, [{
							label: "closure {a, b}",
							start: 8,
							end: 22,
							children:
							[{
								label: "a",
								start: 9,
								end: 10,
							},
							{
								label: "b",
								start: 16,
								end: 17,
							},
							]},
						]);
					});
				});
				
				it('testObjectPropertyLiteral1', function(callback) {
					var r = setup(callback, "var obj = {\n"+
						"\t\"item\": function(p1, p2) {}\n"+
						"};");
					r.outliner.computeOutline(r.editorContext).then(function(outline) {
						assertOutline(outline, [{
							label: "var obj = {Object}",
							start: 4,
							end: 7,
							children:
							[{
								label: "item(p1, p2)",
								start: 13,
								end: 19,
							},
							]},
						]);
					});
				});
				
				it('testObjectPropertyLiteral2', function(callback) {
					var r = setup(callback, "var obj = {\n"+
						"\t\"item\": null\n"+
						"};");
					r.outliner.computeOutline(r.editorContext).then(function(outline) {
						assertOutline(outline, [{
							label: "var obj = {Object}",
							start: 4,
							end: 7,
							children:
							[{
								label: "item",
								start: 13,
								end: 19,
							},
							]},
						]);
					});
				});
				
				it('testObjectPropertyLiteral3', function(callback) {
					var r = setup(callback, "var obj = {\n"+
						"\t\"item\": {}\n"+
						"};");
					r.outliner.computeOutline(r.editorContext).then(function(outline) {
						assertOutline(outline, [{
							label: "var obj = {Object}",
							start: 4,
							end: 7,
							children:
							[{
								label: "item {...}",
								start: 13,
								end: 19,
							},
							]},
						]);
					});
				});
				
				it('testObjectPropertyLiteral4', function(callback) {
					var r = setup(callback, "var obj = {\n"+
						"\t\"item\": function(p1, p2) {}\n"+
						"};");
					r.outliner.computeOutline(r.editorContext).then(function(outline) {
						assertOutline(outline, [{
							label: "var obj = {Object}",
							start: 4,
							end: 7,
							children:
							[{
								label: "item(p1, p2)",
								start: 13,
								end: 19,
							},
							]},
						]);
					});
				});
				
				it('testObjectPropertyLiteral5', function(callback) {
					var r = setup(callback, "var obj = {\n"+
						"\t\"item\": null\n"+
						"};");
					r.outliner.computeOutline(r.editorContext).then(function(outline) {
						assertOutline(outline, [{
							label: "var obj = {Object}",
							start: 4,
							end: 7,
							children:
							[{
								label: "item",
								start: 13,
								end: 19,
							},
							]},
						]);
					});
				});
				
				it('testObjectPropertyLiteral6', function(callback) {
					var r = setup(callback, "var obj = {\n"+
						"\t\"item\": {}\n"+
						"};");
					r.outliner.computeOutline(r.editorContext).then(function(outline) {
						assertOutline(outline, [{
							label: "var obj = {Object}",
							start: 4,
							end: 7,
							children:
							[{
								label: "item {...}",
								start: 13,
								end: 19,
							},
							]},
						]);
					});
				});
				
				/**
				 * Tests a return statement that is an object expression
				 * @see https://bugs.eclipse.org/bugs/show_bug.cgi?id=424202
				 */
				it('testReturnObject1', function(callback) {
					var r = setup(callback, "function f1() {\n"+
						"\t return {};\n"+
						"};");
					r.outliner.computeOutline(r.editorContext).then(function(outline) {
						assertOutline(outline, [{
							label: "f1()",
							start: 9,
							end: 11,
							children:
							[{
								label: "return {...}",
								start: 18,
								end: 24,
							},
							]},
						]);
					});
				});
				
				/**
				 * Tests a return statement that is an object expression
				 * @see https://bugs.eclipse.org/bugs/show_bug.cgi?id=424202
				 */
				it('testReturnObject2', function(callback) {
					var r = setup(callback, "function f1() {\n"+
						"\t return function() {};\n"+
						"};");
					r.outliner.computeOutline(r.editorContext).then(function(outline) {
						assertOutline(outline, [{
							label: "f1()",
							start: 9,
							end: 11,
							children:
							[{
								label: "return {...}",
								start: 18,
								end: 24,
							},
							]},
						]);
					});
				});
				
				/**
				 * Tests a return statement that is an object expression
				 * @see https://bugs.eclipse.org/bugs/show_bug.cgi?id=424202
				 */
				it('testReturnObject3', function(callback) {
					var r = setup(callback, "function f1() {\n"+
						"\t return {\n"+
						"\t\tf1: function() {return {};}"+
						"\t};"+
						"};");
					r.outliner.computeOutline(r.editorContext).then(function(outline) {
						assertOutline(outline, [{
							label: "f1()",
							start: 9,
							end: 11,
							children:
							[{
								label: "return {f1}",
								start: 18,
								end: 24,
								children:
								[{
									label: "f1()",
									start: 29,
									end: 31,
									children:
									[{
										label: "return {...}",
										start: 45,
										end: 51,
									},
									]},
								]},
							]},
						]);
					});
				});
				
				/**
				 * Tests a return statement that is an object expression
				 * @see https://bugs.eclipse.org/bugs/show_bug.cgi?id=424202
				 */
				it('testReturnObject4', function(callback) {
					var r = setup(callback, "function f1() {\n"+
						"\t return {\n"+
						"\t\tf1: function() {return function() {};}"+
						"\t};"+
						"};");
					r.outliner.computeOutline(r.editorContext).then(function(outline) {
						assertOutline(outline, [{
							label: "f1()",
							start: 9,
							end: 11,
							children:
							[{
								label: "return {f1}",
								start: 18,
								end: 24,
								children:
								[{
									label: "f1()",
									start: 29,
									end: 31,
									children:
									[{
										label: "return {...}",
										start: 45,
										end: 51,
									},
									]},
								]},
							]},
						]);
					});
				});
				
				/**
				 * Tests a return statement that is an object expression
				 * @see https://bugs.eclipse.org/bugs/show_bug.cgi?id=424202
				 */
				it('testReturnObject5', function(callback) {
					var r = setup(callback, "function f1() {\n"+
						"\t return {a: \"\", b: \"\"};\n"+
						"};");
					r.outliner.computeOutline(r.editorContext).then(function(outline) {
						assertOutline(outline, [{
							label: "f1()",
							start: 9,
							end: 11,
							children:
							[{
								label: "return {a, b}",
								start: 18,
								end: 24,
								children:
								[{
									label: "a",
									start: 26,
									end: 27,
								},
								{
									label: "b",
									start: 33,
									end: 34,
								},
								]},
							]},
						]);
					});
				});
				
				it('Call Expression 1', function(callback) {
					var r = setup(callback, "describe(function(){});");
					r.outliner.computeOutline(r.editorContext).then(function(outline) {
						assertOutline(outline, [{
							label: "function() - describe(function(){...})",
							start: 9,
							end: 17,
						},
						]);
					});
				});
				it('Call Expression 2', function(callback) {
					var r = setup(callback, "describe(function(a){});");
					r.outliner.computeOutline(r.editorContext).then(function(outline) {
						assertOutline(outline, [{
							label: "function(a) - describe(function(){...})",
							start: 9,
							end: 17,
						},
						]);
					});
				});
				it('Call Expression 3', function(callback) {
					var r = setup(callback, "describe(function(a, b, c){ var x = a;});");
					r.outliner.computeOutline(r.editorContext).then(function(outline) {
						assertOutline(outline, [{
							label: "function(a, b, c) - describe(function(){...})",
							start: 9,
							end: 17,
						},
						]);
					});
				});
				it('Call Expression 4', function(callback) {
					var r = setup(callback, "describe('abc', function(){});");
					r.outliner.computeOutline(r.editorContext).then(function(outline) {
						assertOutline(outline, [{
							label: "function() - describe('abc', function(){...})",
							start: 16,
							end: 24,
						},
						]);
					});
				});
				it('Call Expression 5', function(callback) {
					var r = setup(callback, "describe(42, function(){};");
					r.outliner.computeOutline(r.editorContext).then(function(outline) {
						assertOutline(outline, [{
							label: "function() - describe(42, function(){...})",
							start: 13,
							end: 21,
						},
						]);
					});
				});
				it('Call Expression 6', function(callback) {
					var r = setup(callback, "describe(42, 'abc', function(){}, function(){});");
					r.outliner.computeOutline(r.editorContext).then(function(outline) {
						assertOutline(outline, [{
							label: "function() - describe(42, 'abc', function(){...}, function(){...})",
							start: 20,
							end: 28,
						},
						{
							label: "function() - describe(42, 'abc', function(){...}, function(){...})",
							start: 34,
							end: 42,
						},
						]);
					});
				});
				it('Call Expression 7', function(callback) {
					var r = setup(callback, "describe('123456789012345678901234567890', function(){}, function(){});");
					r.outliner.computeOutline(r.editorContext).then(function(outline) {
						assertOutline(outline, [{
							label: "function() - describe('123456789012345678901234567890', function(){...}, ...)",
							start: 43,
							end: 51,
						},
						{
							label: "function() - describe('123456789012345678901234567890', function(){...}, ...)",
							start: 57,
							end: 65,
						},
						]);
					});
				});
				
			});
		});	
	};
});
