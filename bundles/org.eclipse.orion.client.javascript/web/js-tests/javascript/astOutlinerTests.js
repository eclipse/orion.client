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
/*eslint-env amd, mocha */
/* eslint-disable missing-nls */
define([
	'chai/chai',
	'orion/Deferred',
	'javascript/astOutliner',
	'javascript/astManager',
	'mocha/mocha' //not a module, leave it at the end
], function(chai, Deferred, Outliner, astManager) {
	
	var assert = chai.assert;	

	return /* @callback */ function(worker) {
		describe('AST Outliner Tests', function() {
			this.timeout(10000);
			
		    function setup(text, contentType) {
		        return {
			        outliner: new Outliner.JSOutliner(new astManager.ASTManager()),
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
				
			/**
			 * @name assertElement
			 * @description Checks the given element against the expected name, start and end to make sure it is outlined correctly
			 * @function
			 * @public
			 * @param {Object} element The computed outline element to check
			 * @param {String} label The expected outline label
			 * @param {Number} start The expected start offset of the element
			 * @param {Number} end The expected end offset of the element
			 */
			function assertElement(element, label, start, end) {
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
				assert.equal(fullLabel, label, "The label is not the same");
				assert.equal(element.start, start, "The start range is not the same");
				assert.equal(element.end, end, "The end range is not the same");
			}
				
			it('testfuncDeclaration1', function(callback) {
				var r = setup("function F1(p1, p2) {};");
				r.outliner.computeOutline(r.editorContext).then(function(outline) {
					try {
						if(!outline || outline.length < 1) {
							assert.fail("There should be one outline element");
						}
						assertElement(outline[0], "Program", 0, 23);
						callback();
					}
					catch(err) {
						callback(err);
					}
				});
			});
			it('testfuncDeclarationReturnFunction', function(callback) {
				var r = setup("function F1(p1, p2) {return function() {}};");
				r.outliner.computeOutline(r.editorContext).then(function(outline) {
					try {
						if(!outline || outline.length < 1) {
							assert.fail("There should be one outline element");
						}
						assertElement(outline[0], "Program", 0, 43);
						assertElement(outline[0].children[4].children[0], "FunctionDeclaration", 0, 42);
						callback();
					}
					catch(err) {
						callback(err);
					}
				});
			});
			it('testfuncDeclarationReturnObject', function(callback) {
				var r = setup("function F1(p1, p2) {return Object.freeze({})};");
				r.outliner.computeOutline(r.editorContext).then(function(outline) {
					try {
						if(!outline || outline.length < 1) {
							assert.fail("There should be one outline element");
						}
						assertElement(outline[0], "Program", 0, 47);
						assertElement(outline[0].children[4].children[0], "FunctionDeclaration", 0, 46);
						callback();
					}
					catch(err) {
						callback(err);
					}
				});
			});
			it('testTripleObject', function(callback) {
				var r = setup("let x = {one:{two:{}}};");
				r.outliner.computeOutline(r.editorContext).then(function(outline) {
					try {
						if(!outline || outline.length < 1) {
							assert.fail("There should be one outline element");
						}
						assertElement(outline[0], "Program", 0, 23);
						assertElement(outline[0].children[4].children[0], "VariableDeclaration", 0, 23);
						callback();
					}
					catch(err) {
						callback(err);
					}
				});
			});
			it('testMemberExpressionLiteral1', function(callback) {
				var r = setup("Foo[\'bar\'] = function() {}");
				r.outliner.computeOutline(r.editorContext).then(function(outline) {
					try {
						assert(outline && outline.length > 0, "There should be one outline element");
						assertElement(outline[0], "Program", 0, 26);
						callback();
					}
					catch(err) {
						callback(err);
					}
				});
			});
			it('testMemberExpressionLiteral2', function(callback) {
				var r = setup("Foo[\'bar\'].baz = function() {}");
				r.outliner.computeOutline(r.editorContext).then(function(outline) {
					try {
						assert(outline && outline.length > 0, "There should be one outline element");
						assertElement(outline[0], "Program", 0, 30);
						callback();
					}
					catch(err) {
						callback(err);
					}
				});
			});
			it('testMemberExpressionLiteral3', function(callback) {
				var r = setup("Foo.baz[\'bar\'] = function() {}");
				r.outliner.computeOutline(r.editorContext).then(function(outline) {
					try {
						assert(outline && outline.length > 0, "There should be one outline element");
						assertElement(outline[0], "Program", 0, 30);
						callback();
					}
					catch(err) {
						callback(err);
					}
				});
			});
			
			it('testfuncExpression1', function(callback) {
				var r = setup("var obj = {\n"+
					"\titem: function(p1, p2) {}\n"+
					"};");
				r.outliner.computeOutline(r.editorContext).then(function(outline) {
					try {
						if(!outline || outline.length < 1) {
							assert.fail("There should be one outline element");
						}
						if(!outline[0].children || outline[0].children.length < 1) {
							assert.fail("There should be one child outline element");
						}
						assertElement(outline[0].children[3], "range: [0, 41]", 0, 41);
						callback();
					}
					catch(err) {
						callback(err);
					}
				});
			});
			it('testLabelledFuncExpr1', function(callback) {
				var r = setup("var obj = function foo(p1, p2) {};");
				r.outliner.computeOutline(r.editorContext).then(function(outline) {
					try {
						if(!outline || outline.length < 1) {
							assert.fail("There should be one outline element");
						}
						assertElement(outline[0], "Program", 0, 34);
						callback();
					}
					catch(err) {
						callback(err);
					}
				});
			});
			it('testBrokenAstSingleToken', function(callback) {
				var r = setup("`");
				r.outliner.computeOutline(r.editorContext).then(function(outline) {
					try {
						if(!outline || outline.length < 1) {
							assert.fail("There should be one outline element");
						}
						assertElement(outline[0], "Program", 0, 1);
						callback();
					}
					catch(err) {
						callback(err);
					}
				});
			});
			
			it('testObjectExpression1', function(callback) {
				var r = setup("var object = {};");
				r.outliner.computeOutline(r.editorContext).then(function(outline) {
					try {
						if(!outline || outline.length < 1) {
							assert.fail("There should be one outline element");
						}
						assertElement(outline[0], "Program", 0, 16);
						callback();
					}
					catch(err) {
						callback(err);
					}
				});
			});
			
			it('testObjectExpression2', function(callback) {
				var r = setup("var object = {a: \"\", b: \"\", c: \"\"};");
				r.outliner.computeOutline(r.editorContext).then(function(outline) {
					try {
						if(!outline || outline.length < 1) {
							assert.fail("There should be one outline element");
						}
						assertElement(outline[0], "Program", 0, 35);
						callback();
					}
					catch(err) {
						callback(err);
					}
				});
			});
			
			it('tesBrokentObjectExpression1', function(callback) {
				var r = setup("var object = {;");
				r.outliner.computeOutline(r.editorContext).then(function(outline) {
					try {
						if(!outline || outline.length < 1) {
							assert.fail("There should be one outline element");
						}
						assertElement(outline[0], "Program", 0, 15);
						assertElement(outline[0].children[6].children[0], "Unexpected token (1:14)", 14, 15);
						callback();
					}
					catch(err) {
						callback(err);
					}
				});
			});
			
			it('testBrokenObjectExpression2', function(callback) {
				var r = setup("var object = {A123456789B123456789C123456789D123456789E123456789:");
				r.outliner.computeOutline(r.editorContext).then(function(outline) {
					try {
						if(!outline || outline.length < 1) {
							assert.fail("There should be one outline element");
						}
						assertElement(outline[0], "Program", 0, 65);
						callback();
					}
					catch(err) {
						callback(err);
					}
				});
			});
			
			it('testBrokenObjectExpression3', function(callback) {
				var r = setup("var object = {A123456789B123456789C12345");
				r.outliner.computeOutline(r.editorContext).then(function(outline) {
					try {
						if(!outline || outline.length < 1) {
							assert.fail("There should be one outline element");
						}
						assertElement(outline[0], "Program", 0, 40);
						callback();
					}
					catch(err) {
						callback(err);
					}
				});
			});
			
			it('testSimpleLet', function(callback) {
				var r = setup("let foo = 10;");
				r.outliner.computeOutline(r.editorContext).then(function(outline) {
					try {
						if(!outline || outline.length < 1) {
							assert.fail("There should be one outline element");
						}
						assertElement(outline[0], "Program", 0, 13);
						callback();
					}
					catch(err) {
						callback(err);
					}
				});
			});
			
			it('testSimpleClass', function(callback) {
				var r = setup("export class Myclass {}");
				r.outliner.computeOutline(r.editorContext).then(function(outline) {
					try {
						if(!outline || outline.length < 1) {
							assert.fail("There should be one outline element");
						}
						assertElement(outline[0], "Program", 0, 23);
						callback();
					}
					catch(err) {
						callback(err);
					}
				});
			});
			
			it('testSimpleForOf', function(callback) {
				var r = setup("for(let a of {}) {}");
				r.outliner.computeOutline(r.editorContext).then(function(outline) {
					try {
						if(!outline || outline.length < 1) {
							assert.fail("There should be one outline element");
						}
						if(!outline[0].children || outline[0].children.length < 1) {
							assert.fail("There should be one child outline element");
						}
						assertElement(outline[0], "Program", 0, 19);
						callback();
					}
					catch(err) {
						callback(err);
					}
				});
			});
			
			it('testBrokenForOf1', function(callback) {
				var r = setup("for(let a of");
				r.outliner.computeOutline(r.editorContext).then(function(outline) {
					try {
						if(!outline || outline.length < 1) {
							assert.fail("There should be one outline element");
						}
						if(!outline[0].children || outline[0].children.length < 1) {
							assert.fail("There should be one child outline element");
						}
						assertElement(outline[0], "Program", 0, 12);
						callback();
					}
					catch(err) {
						callback(err);
					}
				});
			});
			
			it('testSimpleWith', function(callback) {
				var r = setup("with(baz) {}");
				r.outliner.computeOutline(r.editorContext).then(function(outline) {
					try {
						if(!outline || outline.length < 1) {
							assert.fail("There should be one outline element");
						}
						if(!outline[0].children || outline[0].children.length < 1) {
							assert.fail("There should be one child outline element");
						}
						assertElement(outline[0], "Program", 0, 12);
						callback();
					}
					catch(err) {
						callback(err);
					}
				});
			});
			
		});	
	};
});
