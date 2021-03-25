/*******************************************************************************
 * @license
 * Copyright (c) 2013, 2015 IBM Corporation and others.
 * All rights reserved. This program and the accompanying materials are made 
 * available under the terms of the Eclipse Public License 2.0 
 * (http://www.eclipse.org/legal/epl-v10.html), and the Eclipse Distribution 
 * License v1.0 (http://www.eclipse.org/org/documents/edl-v10.html). 
 * 
 * Contributors: IBM Corporation - initial API and implementation
 ******************************************************************************/
/*eslint-env amd, node, mocha*/
/* eslint-disable missing-nls */
define([
	'chai/chai',
	'javascript/finder',
	'javascript/astManager',
	'javascript/cuProvider',
	'orion/Deferred',
	'mocha/mocha' // not a module, leave it at the end
], function(chai, Finder, ASTManager, CUProvider,  Deferred) {
	var assert = chai.assert;
	CUProvider.setUseCache(false);

	return /* @callback */ function(worker) {
		describe('Finder Tests', function() {
			/**
			 * @description Sets up the test
			 * @public
			 * @param {String} text The compilation unit text
			 * @param {String} contentType The content type
			 */
			function setup(text, contentType) {
				var editorContext;
				if (contentType === "text/html"){
					var cu = CUProvider.getCompilationUnit(function() {
						return Finder.findScriptBlocks(text);
					});
					editorContext = cu.getEditorContext();
				} else {
					editorContext = {
	        			text: "",
	        			/**
	        			 * get the text
	        			 */
	        			getText: function() {
	        				return new Deferred().resolve(text);
	        			},
	        			
	        			getFileMetadata: function() {
	        			    var o = Object.create(null);
	        			    o.contentType = Object.create(null);
	        			    o.contentType.id = contentType ? contentType : 'application/javascript';
	        			    o.location = 'finder_test_script.js';
	        			    return new Deferred().resolve(o);
	        	        }
	        	    };
        	     }
				return {
					text: text,
					astManager: new ASTManager.ASTManager(),
			        editorContext: editorContext
				};
			}
			
			it('test_findWord1', function() {
				var word = Finder.findWord('function(param1, param2)', 12);
				assert.equal(word, 'param1', 'Should have found the word param1');
			});
			it('test_findWord2', function() {
				var word = Finder.findWord('function(param1, param2)', 9);
				assert.equal(word, 'param1', 'Should have found the word param1');
			});
			it('test_findWord3', function() {
				var word = Finder.findWord('function(param1, param2)', 17);
				assert.equal(word, 'param2', 'Should have found the word param2');
			});
			it('test_findWord4', function() {
				var word = Finder.findWord('var foo.bar = function(param1, param2)', 4);
				assert.equal(word, 'foo', 'Should have found the word foo');
			});
			it('test_findWord5', function() {
				var word = Finder.findWord('var foo.bar = function(param1, param2)', 8);
				assert.equal(word, 'bar', 'Should have found the word bar');
			});
			it('test_findWord6', function() {
				var word = Finder.findWord('f =function(p1) {', 3);
				assert.equal(word, 'function', 'Should have found word function');
			});
			it('test_findWord7', function() {
				var word = Finder.findWord('f ={foo:true', 4);
				assert.equal(word, 'foo', 'Should have found word foo');
			});
			it('test_findWord8', function() {
				var word = Finder.findWord('function(param1, param2)', 15);
				assert.equal(word, 'param1', 'Should have found word param1');
			});
			it('test_findWord9', function() {
				var word = Finder.findWord('var foo.bar = function(param1, param2)', 7);
				assert.equal(word, 'foo', 'Should have found word foo');
			});
			it('test_findWord10', function() {
				var word = Finder.findWord('   foo.bar = function(param1, param2)', 4);
				assert.equal(word, 'foo', 'Should have found word foo');
			});
			it('test_findWord11', function() {
				var word = Finder.findWord('	foo.bar = function(param1, param2)', 2);
				assert.equal(word, 'foo', 'Should have found word foo');
			});
			/**
			 * @see https://bugs.eclipse.org/bugs/show_bug.cgi?id=480329
			 */
			it('test_findWord12', function() {
				var word = Finder.findWord('myfunc();', 0);
				assert.equal(word, 'myfunc', 'Should have found word myfunc');
			});
			it('test_findNoWord1', function() {
				var word = Finder.findWord('f: function(p1, p2)', 2);
				assert.equal(word, null, 'Should have found no word');
			});
			it('test_findNoWord2', function() {
				var word = Finder.findWord('f: function(p1, p2)', 15);
				assert.equal(word, null, 'Should have found no word');
			});
			it('test_findNoWord3', function() {
				var word = Finder.findWord('f: function(p1) {', 16);
				assert.equal(word, null, 'Should have found no word');
			});
			it('test_findNoWord4', function() {
				var word = Finder.findWord('f: function(p1) {', 17);
				assert.equal(word, null, 'Should have found no word');
			});
			it('test_findNoWord5', function() {
				var word = Finder.findWord('f = function(p1) {', 2);
				assert.equal(word, null, 'Should have found no word');
			});
			it('test_findNoWord6', function() {
				var word = Finder.findWord('f = function(p1) {', 3);
				assert.equal(word, null, 'Should have found no word');
			});
			it('test_findNoWord7', function() {
				var word = Finder.findWord('var a = [1, 2]', 7);
				assert.equal(word, null, 'Should have found no word');
			});
			it('test_findNoWord8', function() {
				var word = Finder.findWord('var a = [1, 2]', 14);
				assert.equal(word, null, 'Should have found no word');
			});
			/**
			 * @see https://bugs.eclipse.org/bugs/show_bug.cgi?id=480329
			 */
			it('test_findNoWord9', function() {
				var word = Finder.findWord(' myfunc();', 0);
				assert.equal(word, null, 'Should have found no word');
			});
			it('test_findNode1', function() {
				var r = setup("function  F1(p1, p2) {\n"+
					"\tvar out = p1;\n"+
					"};");
				return r.astManager.getAST(r.editorContext).then(function(ast) {
					var node = Finder.findNode(9, ast);
					if(!node) {
						assert.fail("Should have found a node");
					}
					else {
						assert.equal(node.type, 'FunctionDeclaration', 'Should have found a FunctionDeclaration node');
					}
				});
			});
			it('test_findNode2', function() {
				var r = setup("function  F1(p1, p2) {\n"+
					"\tvar out = p1;\n"+
					"};");
				return r.astManager.getAST(r.editorContext).then(function(ast) {
					var node = Finder.findNode(12, ast);
					if(!node) {
						assert.fail("Should have found a node");
					}
					else {
						assert.equal(node.type, 'Identifier', 'Should have found a Identifier node');
					}
				});
			});
			it('test_findNode3', function() {
				var r = setup("function  F1(p1, p2) {\n"+
					"\tvar out = p1;\n"+
					"};");
				return r.astManager.getAST(r.editorContext).then(function(ast) {
					var node = Finder.findNode(14, ast);
					if(!node) {
						assert.fail("Should have found a node");
					}
					else {
						assert.equal(node.type, 'Identifier', 'Should have found a Identifier node');
					}
				});
			});
			
			it('test_findNode4', function() {
				var r = setup("function  F1(p1, p2) {\n"+
					"\tvar out = p1;\n"+
					"};");
				return r.astManager.getAST(r.editorContext).then(function(ast) {
					var node = Finder.findNode(28, ast);
					if(!node) {
						assert.fail("Should have found a node");
					}
					else {
						assert.equal(node.type, 'Identifier', 'Should have found a Identifier node');
					}
				});
			});
			
			/**
			 * @see https://bugs.eclipse.org/bugs/show_bug.cgi?id=427303
			 * @since 6.0
			 */
			it('test_findNodeAndParents1', function() {
				var r = setup("function  F1(p1, p2) {\n"+
					"\tvar out = p1;\n"+
					"};");
				return r.astManager.getAST(r.editorContext).then(function(ast) {
					var node = Finder.findNode(9, ast, {parents:true});
					if(!node) {
						assert.fail("Should have found a node");
					}
					else {
						assert.equal(node.type, 'FunctionDeclaration', 'Should have found a FunctionDeclaration node');
						assert.equal(node.parents.length, 1, 'Should have found one parent');
						assert.equal(node.parents[0].type, 'Program', 'The program node should be the only parent');
					}
				});
				
			});
			
			/**
			 * @see https://bugs.eclipse.org/bugs/show_bug.cgi?id=427303
			 * @since 6.0
			 */
			it('test_findNodeAndParents2', function() {
				var r = setup("function  F1(p1, p2) {\n"+
					"\tvar out = p1;\n"+
					"};");
				return r.astManager.getAST(r.editorContext).then(function(ast) {
					var node = Finder.findNode(14, ast, {parents:true});
					if(!node) {
						assert.fail("Should have found a node");
					}
					else {
						assert.equal(node.type, 'Identifier', 'Should have found an Identifier node');
						assert.equal(node.parents.length, 2, 'Should have found two parents');
						assert.equal(node.parents[0].type, 'Program', 'Should have found the parent Program node as the first parent');
						assert.equal(node.parents[1].type, 'FunctionDeclaration', 'Should have found the parent function decl as the second parent');
					}
				});
			});
			/**
			 * @see https://bugs.eclipse.org/bugs/show_bug.cgi?id=437548
			 * @since 6.0
			 */
			it('test_findNodeAndParents3', function() {
				var r = setup("function  F1(p1, p2) {\n"+
					"\tvar out = p1;\n"+
					"};");
				return r.astManager.getAST(r.editorContext).then(function(ast) {
					var node = Finder.findNode(4, ast, {parents:true});
					if(!node) {
						assert.fail("Should have found a node");
					}
					else {
						assert.equal(node.type, 'FunctionDeclaration', 'Should have found a FunctionDeclaration node');
						assert.equal(node.parents.length, 1, 'Should have found one parent');
						assert.equal(node.parents[0].type, 'Program', 'Should have found the parent Program node as the first parent');
					}
				});
				
			});
			/**
			 * Tests finding the next node from a given node offset
			 * @see https://bugs.eclipse.org/bugs/show_bug.cgi?id=442411
			 * @since 7.0
			 */
			it('test_findNodeNext1', function() {
				var r = setup("/** */ function  F1(p1, p2) {}");
				return r.astManager.getAST(r.editorContext).then(function(ast) {
					var node = Finder.findNode(6, ast, {parents:true, next:true});
					if(!node) {
						assert.fail("Should have found a node");
					}
					else {
						assert.equal(node.type, 'FunctionDeclaration', 'Should have found a FunctionDeclaration node');
						assert.equal(node.parents.length, 1, 'Should have found one parent');
						assert.equal(node.parents[0].type, 'Program', 'Should have found the parent Program node as the first parent');
					}
				});
				
			});
			/**
			 * Tests finding the next node from a given node offset
			 * @see https://bugs.eclipse.org/bugs/show_bug.cgi?id=442411
			 * @since 7.0
			 */
			it('test_findNodeNext2', function() {
				var r = setup("/** */ /** */ function  F1(p1, p2) {}");
				return r.astManager.getAST(r.editorContext).then(function(ast) {
					var node = Finder.findNode(6, ast, {parents:true, next:true});
					if(!node) {
						assert.fail("Should have found a node");
					}
					else {
						assert.equal(node.type, 'FunctionDeclaration', 'Should have found a FunctionDeclaration node');
						assert.equal(node.parents.length, 1, 'Should have found one parent');
						assert.equal(node.parents[0].type, 'Program', 'Should have found the parent Program node as the first parent');
					}
				});
				
			});
			/**
			 * Tests finding the next node from a given node offset
			 * @see https://bugs.eclipse.org/bugs/show_bug.cgi?id=442411
			 * @since 7.0
			 */
			it('test_findNodeNext3', function() {
				var r = setup("function  F1(p1, p2) {}");
				return r.astManager.getAST(r.editorContext).then(function(ast) {
					var node = Finder.findNode(6, ast, {parents:true, next:true});
					if(!node) {
						assert.fail("Should have found a node");
					}
					else {
						assert.equal(node.type, 'Identifier', 'Should have found an Identifier node');
						assert.equal(node.parents.length, 2, 'Should have found two parent');
						assert.equal(node.parents[0].type, 'Program', 'Should have found the parent Program node as the second parent');
						assert.equal(node.parents[1].type, 'FunctionDeclaration', 'Should have found the parent FunctionDeclaration node as the first parent');
					}
				});
				
			});
			/**
			 * Tests finding the next node from a given node offset
			 * @see https://bugs.eclipse.org/bugs/show_bug.cgi?id=442411
			 * @since 7.0
			 */
			it('test_findNodeNext3', function() {
				var r = setup("/** */ ");
				return r.astManager.getAST(r.editorContext).then(function(ast) {
					var node = Finder.findNode(6, ast, {parents:true, next:true});
					if(!node) {
						assert.fail("Should have found a node");
					}
					else {
						assert.equal(node.type, 'Program', 'Should have found the Program node');
					}
				});
				
			});
			
			it('test_findNodeNoSpacesClassDecl1', function() {
				var r = setup("class a{}");
				return r.astManager.getAST(r.editorContext).then(function(ast) {
					var node = Finder.findNode(0, ast, {parents:true});
					if(!node) {
						assert.fail("Should have found a node");
					}
					else {
						assert.equal(node.type, 'ClassDeclaration', 'Should have found the ClassDeclaration node');
					}
				});
			});
			it('test_findNodeNoSpacesClassDecl2', function() {
				var r = setup("class a{}");
				return r.astManager.getAST(r.editorContext).then(function(ast) {
					var node = Finder.findNode(6, ast, {parents:true});
					if(!node) {
						assert.fail("Should have found a node");
					}
					else {
						assert.equal(node.type, 'Identifier', 'Should have found the Identifier node');
					}
				});
			});
			it('test_findNodeNoSpacesClassDecl3', function() {
				var r = setup("class a{}");
				return r.astManager.getAST(r.editorContext).then(function(ast) {
					var node = Finder.findNode(7, ast, {parents:true});
					if(!node) {
						assert.fail("Should have found a node");
					}
					else {
						assert.equal(node.type, 'Identifier', 'Should have found the Identifier node');
					}
				});
			});
			it('test_findNodeNoSpacesClassDecl4', function() {
				var r = setup("class a{}");
				return r.astManager.getAST(r.editorContext).then(function(ast) {
					var node = Finder.findNode(8, ast, {parents:true});
					if(!node) {
						assert.fail("Should have found a node");
					}
					else {
						assert.equal(node.type, 'ClassBody', 'Should have found the ClassBody node');
					}
				});
			});
			it('test_findNodeNoSpacesMethodDecl1', function() {
				var r = setup("class a{ f(){} }");
				return r.astManager.getAST(r.editorContext).then(function(ast) {
					var node = Finder.findNode(9, ast, {parents:true});
					if(!node) {
						assert.fail("Should have found a node");
					}
					else {
						assert.equal(node.type, 'Identifier', 'Should have found the Identifier node');
					}
				});
			});
			it('test_findNodeNoSpacesMethodDecl2', function() {
				var r = setup("class a{ f(){} }");
				return r.astManager.getAST(r.editorContext).then(function(ast) {
					var node = Finder.findNode(10, ast, {parents:true});
					if(!node) {
						assert.fail("Should have found a node");
					}
					else {
						assert.equal(node.type, 'Identifier', 'Should have found the Identifier node');
					}
				});
			});
			it('test_findNodeNoSpacesMethodDecl3', function() {
				var r = setup("class a{ f(){} }");
				return r.astManager.getAST(r.editorContext).then(function(ast) {
					var node = Finder.findNode(11, ast, {parents:true});
					if(!node) {
						assert.fail("Should have found a node");
					}
					else {
						assert.equal(node.type, 'FunctionExpression', 'Should have found the FunctionExpression node');
					}
				});
			});
			it('test_findNodeNoSpacesMethodDecl4', function() {
				var r = setup("class a{ f(){} }");
				return r.astManager.getAST(r.editorContext).then(function(ast) {
					var node = Finder.findNode(13, ast, {parents:true});
					if(!node) {
						assert.fail("Should have found a node");
					}
					else {
						assert.equal(node.type, 'BlockStatement', 'Should have found the BlockStatement node');
					}
				});
			});
			it('test_findNodeNoSpacesFuncDecl1', function() {
				var r = setup("var a=function f(){}");
				return r.astManager.getAST(r.editorContext).then(function(ast) {
					var node = Finder.findNode(4, ast, {parents:true});
					if(!node) {
						assert.fail("Should have found a node");
					}
					else {
						assert.equal(node.type, 'Identifier', 'Should have found the Identifier node');
					}
				});
			});
			it('test_findNodeNoSpacesFuncDecl2', function() {
				var r = setup("var a=function f(){}");
				return r.astManager.getAST(r.editorContext).then(function(ast) {
					var node = Finder.findNode(5, ast, {parents:true});
					if(!node) {
						assert.fail("Should have found a node");
					}
					else {
						assert.equal(node.type, 'Identifier', 'Should have found the Identifier node');
					}
				});
			});
			it('test_findNodeNoSpacesFuncDecl3', function() {
				var r = setup("var a=function f(){}");
				return r.astManager.getAST(r.editorContext).then(function(ast) {
					var node = Finder.findNode(6, ast, {parents:true});
					if(!node) {
						assert.fail("Should have found a node");
					}
					else {
						// See Bug 494484, we select the preceding identifier
						assert.equal(node.type, 'Identifier', 'Should have found the Identifier node');
					}
				});
			});
			it('test_findNodeNoSpacesFuncDecl4', function() {
				var r = setup("var a=function f(){}");
				return r.astManager.getAST(r.editorContext).then(function(ast) {
					var node = Finder.findNode(15, ast, {parents:true});
					if(!node) {
						assert.fail("Should have found a node");
					}
					else {
						assert.equal(node.type, 'Identifier', 'Should have found the Identifier node');
					}
				});
			});
			it('test_findNodeNoSpacesFuncDecl5', function() {
				var r = setup("var a=function f(){}");
				return r.astManager.getAST(r.editorContext).then(function(ast) {
					var node = Finder.findNode(16, ast, {parents:true});
					if(!node) {
						assert.fail("Should have found a node");
					}
					else {
						assert.equal(node.type, 'Identifier', 'Should have found the Identifier node');
					}
				});
			});
			it('test_findNodeNoSpacesFuncDecl6', function() {
				var r = setup("var a=function f(){}");
				return r.astManager.getAST(r.editorContext).then(function(ast) {
					var node = Finder.findNode(17, ast, {parents:true});
					if(!node) {
						assert.fail("Should have found a node");
					}
					else {
						assert.equal(node.type, 'Identifier', 'Should have found the Identifier node');
					}
				});
			});
			it('test_findNodeNoSpacesFuncDecl7', function() {
				var r = setup("var a=function f(){}");
				return r.astManager.getAST(r.editorContext).then(function(ast) {
					var node = Finder.findNode(18, ast, {parents:true});
					if(!node) {
						assert.fail("Should have found a node");
					}
					else {
						assert.equal(node.type, 'BlockStatement', 'Should have found the BlockStatement node');
					}
				});
			});
			
			
			/**
			 * Find a token in a broken AST
			 * https://bugs.eclipse.org/bugs/show_bug.cgi?id=426399
			 */
			it('test_findToken1', function() {
			    var r = setup("(");
				return r.astManager.getAST(r.editorContext).then(function(ast) {
					var token = Finder.findToken(0, ast.tokens);
					if(!token) {
						assert.fail("Should have found a token");
					}
					else {
						assert.equal(token.type, 'Punctuator', 'Should have found a Punctuator token');
						assert.equal(token.value, '(', 'Should have found a ( token');
					}
				});
			});
			
			/**
			 * Find a token in a broken AST
			 * https://bugs.eclipse.org/bugs/show_bug.cgi?id=426399
			 */
			it('test_findToken2', function() {
				var r = setup("var function f() {}");
				return r.astManager.getAST(r.editorContext).then(function(ast) {
					var token = Finder.findToken(4, ast.tokens);
					if(!token) {
						assert.fail("Should have found a token");
					}
					else {
						assert.equal(token.type, 'Keyword', 'Should have found a Keyword token');
						assert.equal(token.value, 'function', 'Should have found a function token');
					}
				});
			});
			
			/**
			 * Find a token in a broken AST
			 * https://bugs.eclipse.org/bugs/show_bug.cgi?id=426399
			 */
			it('test_findToken3', function() {
				var r = setup("(var function f() {}");
				return r.astManager.getAST(r.editorContext).then(function(ast) {
					var token = Finder.findToken(21, ast.tokens);
					if(!token) {
						assert.fail("Should have found a token");
					}
					else {
						assert.equal(token.type, 'Punctuator', 'Should have found a Punctuator token');
						assert.equal(token.value, '}', 'Should have found a } token');
					}
				});
			});
			
			/**
			 * Find a token in a broken AST
			 * https://bugs.eclipse.org/bugs/show_bug.cgi?id=426399
			 */
			it('test_findToken4', function() {
				var r = setup("(var function f() {}");
				return r.astManager.getAST(r.editorContext).then(function(ast) {
					var token = Finder.findToken(1, ast.tokens);
					if(!token) {
						assert.fail("Should have found a token");
					}
					else {
						assert.equal(token.type, 'Keyword', 'Should have found a Keyword token');
						assert.equal(token.value, 'var', 'Should have found a var token');
					}
				});
			});
			
			/**
			 * Find a token in a broken AST
			 * https://bugs.eclipse.org/bugs/show_bug.cgi?id=426399
			 */
			it('test_findToken5', function() {
				var r = setup("var foo.baz / = 43;");
				return r.astManager.getAST(r.editorContext).then(function(ast) {
					var token = Finder.findToken(12, ast.tokens);
					if(!token) {
						assert.fail("Should have found a token");
					}
					else {
						assert.equal(token.type, 'Punctuator', 'Should have found a Punctuator token');
						assert.equal(token.value, '/', 'Should have found a / token');
					}
				});
			});
			
			/**
			 * Find a token in a broken AST
			 * https://bugs.eclipse.org/bugs/show_bug.cgi?id=426399
			 */
			it('test_findToken6', function() {
				var r = setup("var foo.baz / = 43;");
				return r.astManager.getAST(r.editorContext).then(function(ast) {
					var token = Finder.findToken(1, ast.tokens);
					if(!token) {
						assert.fail("Should have found a token");
					}
					else {
						assert.equal(token.type, 'Keyword', 'Should have found a Keyword token');
						assert.equal(token.value, 'var', 'Should have found a var token');
					}
				});
			});
			
			/**
			 * Find a token in a broken AST
			 * https://bugs.eclipse.org/bugs/show_bug.cgi?id=426399
			 */
			it('test_findToken7', function() {
				var r = setup("var function f1() {");
				return r.astManager.getAST(r.editorContext).then(function(ast) {
					var token = Finder.findToken(7, ast.tokens);
					if(!token) {
						assert.fail("Should have found a token");
					}
					else {
						assert.equal(token.type, 'Keyword', 'Should have found a Keyword token');
						assert.equal(token.value, 'function', 'Should have found a function token');
					}
				});
			});
			
			/**
			 * Find a token in a broken AST
			 * https://bugs.eclipse.org/bugs/show_bug.cgi?id=426399
			 */
			it('test_findToken8', function() {
				var r = setup("var function f1() {");
				return r.astManager.getAST(r.editorContext).then(function(ast) {
					var token = Finder.findToken(7, ast.tokens);
					if(!token) {
						assert.fail("Should have found a token");
					}
					else {
						assert.equal(token.type, 'Keyword', 'Should have found a Keyword token');
						assert.equal(token.value, 'function', 'Should have found a function token');
					}
				});
			});
			
			/**
			 * Find a token in a broken AST
			 * https://bugs.eclipse.org/bugs/show_bug.cgi?id=426399
			 */
			it('test_findToken9', function() {
				var r = setup("(var function f() {}");
				return r.astManager.getAST(r.editorContext).then(function(ast) {
					var token = Finder.findToken(-1, ast.tokens);
					assert.equal(token, null, "Should not have found a token for out of range");
				});
			});
			
			/**
			 * Find a token in a correct AST
			 * https://bugs.eclipse.org/bugs/show_bug.cgi?id=426399
			 */
			it('test_findToken10', function() {
				var r = setup("function f() {}");
				return r.astManager.getAST(r.editorContext).then(function(ast) {
					var token = Finder.findToken(9, ast.tokens);
					if(!token) {
						assert.fail("Should have found a token");
					}
					else {
						assert.equal(token.type, 'Identifier', 'Should have found an Identifier token');
						assert.equal(token.value, 'f', 'Should have found a f token');
					}
				});
			});
			
			/**
			 * Find a token in a broken AST
			 * https://bugs.eclipse.org/bugs/show_bug.cgi?id=426399
			 */
			it('test_findToken11', function() {
				var r = setup("var foo = {}");
				return r.astManager.getAST(r.editorContext).then(function(ast) {
					var token = Finder.findToken(8, ast.tokens);
					if(!token) {
						assert.fail("Should have found a token");
					}
					else {
						assert.equal(token.type, 'Punctuator', 'Should have found an Punctuator token');
						assert.equal(token.value, '=', 'Should have found a = token');
					}
				});
			});
			
			/**
			 * Find a token in a broken AST
			 * https://bugs.eclipse.org/bugs/show_bug.cgi?id=426399
			 */
			it('test_findToken12', function() {
				var r = setup("var foo = {f: function() {}}");
				return r.astManager.getAST(r.editorContext).then(function(ast) {
					var token = Finder.findToken(11, ast.tokens);
					if(!token) {
						assert.fail("Should have found a token");
					}
					else {
						assert.equal(token.type, 'Identifier', 'Should have found an Identifier token');
						assert.equal(token.value, 'f', 'Should have found a f token');
					}
				});
			});
			
			/**
			 * Find a token in a broken AST
			 * https://bugs.eclipse.org/bugs/show_bug.cgi?id=426399
			 */
			it('test_findToken13', function() {
				var r = setup("var foo = {f: function() {}}");
				return r.astManager.getAST(r.editorContext).then(function(ast) {
					var token = Finder.findToken(14, ast.tokens);
					if(!token) {
						assert.fail("Should have found a token");
					}
					else {
						assert.equal(token.type, 'Keyword', 'Should have found an Keyword token');
						assert.equal(token.value, 'function', 'Should have found a function token');
					}
				});
			});
			
			/**
			 * Find a token in a broken AST
			 * https://bugs.eclipse.org/bugs/show_bug.cgi?id=426399
			 */
			it('test_findToken14', function() {
				var r = setup("var foo = {f: function() {}}");
				return r.astManager.getAST(r.editorContext).then(function(ast) {
					var token = Finder.findToken(18, ast.tokens);
					if(!token) {
						assert.fail("Should have found a token");
					}
					else {
						assert.equal(token.type, 'Keyword', 'Should have found an Keyword token');
						assert.equal(token.value, 'function', 'Should have found a function token');
					}
				});
			});
			
			/**
			 * Find a token in a broken AST
			 * https://bugs.eclipse.org/bugs/show_bug.cgi?id=426399
			 */
			it('test_findToken15', function() {
				var r = setup("var foo = {f: function() {}}");
				return r.astManager.getAST(r.editorContext).then(function(ast) {
					var token = Finder.findToken(23, ast.tokens);
					if(!token) {
						assert.fail("Should have found a token");
					}
					else {
						assert.equal(token.type, 'Punctuator', 'Should have found an Punctuator token');
						assert.equal(token.value, ')', 'Should have found a ) token');
					}
				});
			});
			
			/**
			 * Find a token in an AST with copious whitespace
			 * @see https://bugs.eclipse.org/bugs/show_bug.cgi?id=427931
			 */
			it('test_findToken16', function() {
				var r = setup("var   foo = {f: function() {}}");
				return r.astManager.getAST(r.editorContext).then(function(ast) {
					var token = Finder.findToken(4, ast.tokens);
					assert.equal(null, token, 'Should not have found a token');
				});
			});
			
			/**
			 * Find a token in an AST with copious whitespace
			 * @see https://bugs.eclipse.org/bugs/show_bug.cgi?id=427931
			 */
			it('test_findToken17', function() {
				var r = setup("var   foo = {f: function() {}}");
				return r.astManager.getAST(r.editorContext).then(function(ast) {
					var token = Finder.findToken(5, ast.tokens);
					assert.equal(null, token, 'Should not have found a token');
				});
			});
			
			/**
			 * Find a token in an AST with copious whitespace
			 * @see https://bugs.eclipse.org/bugs/show_bug.cgi?id=427931
			 */
			it('test_findToken18', function() {
				var r = setup("var foo = {  f: function() {}}");
				return r.astManager.getAST(r.editorContext).then(function(ast) {
					var token = Finder.findToken(12, ast.tokens);
					assert.equal(null, token, 'Should not have found a token');
				});
			});
			
			/**
			 * Find a token in an AST with copious whitespace
			 * @see https://bugs.eclipse.org/bugs/show_bug.cgi?id=427931
			 */
			it('test_findToken19', function() {
				var r = setup("var foo = {f:   function() {}}");
				return r.astManager.getAST(r.editorContext).then(function(ast) {
					var token = Finder.findToken(14, ast.tokens);
					assert.equal(null, token, 'Should not have found a token');
				});
			});
			
			/**
			 * Find a token in an AST with copious whitespace
			 * @see https://bugs.eclipse.org/bugs/show_bug.cgi?id=427931
			 */
			it('test_findToken20', function() {
				var r = setup("var foo = {f:   function() {}}");
				return r.astManager.getAST(r.editorContext).then(function(ast) {
					var token = Finder.findToken(15, ast.tokens);
					assert.equal(null, token, 'Should not have found a token');
				});
			});
			
			/**
			 * Find a token in an AST with copious whitespace
			 * @see https://bugs.eclipse.org/bugs/show_bug.cgi?id=427931
			 */
			it('test_findToken21', function() {
				var r = setup("  var foo = {f: function() {}}");
				return r.astManager.getAST(r.editorContext).then(function(ast) {
					var token = Finder.findToken(1, ast.tokens);
					assert.equal(null, token, 'Should not have found a token');
				});
			});
			
			/**
			 * Find a token in an AST with copious whitespace
			 * @see https://bugs.eclipse.org/bugs/show_bug.cgi?id=427931
			 */
			it('test_findToken22', function() {
				var r = setup("  var foo = {f:   function() {}}");
				return r.astManager.getAST(r.editorContext).then(function(ast) {
					var token = Finder.findToken(0, ast.tokens);
					assert.equal(null, token, 'Should not have found a token');
				});
			});
			
			/**
			 * Find a token in an AST with copious whitespace
			 * @see https://bugs.eclipse.org/bugs/show_bug.cgi?id=427931
			 */
			it('test_findToken23', function() {
				var r = setup("function f3(  foo   ,   bar   , baz) {};");
				return r.astManager.getAST(r.editorContext).then(function(ast) {
					var token = Finder.findToken(17, ast.tokens);
					if(!token) {
						assert.fail('Should have found a token');
					}
					else {
						assert.equal(token.type, 'Identifier', 'Should have found an Identifier token');
						assert.equal(token.value, 'foo', 'Should have found a foo token');
					}
				});
			});
			
			/**
			 * Find a token at the very start of the stream
			 * @see https://bugs.eclipse.org/bugs/show_bug.cgi?id=459580
			 */
			it('test_findToken24', function() {
				var r = setup("function f3(  foo   ,   bar   , baz) {};");
				return r.astManager.getAST(r.editorContext).then(function(ast) {
					var token = Finder.findToken(3, ast.tokens);
					if(!token) {
						assert.fail('Should have found a token');
					}
					else {
						assert.equal(token.type, 'Keyword', 'Should have found a function keyword token');
						assert.equal(token.value, 'function', 'Should have found a function keyword token');
					}
				});
			});
			
			/**
			 * Find a comment
			 * https://bugs.eclipse.org/bugs/show_bug.cgi?id=426033
			 */
			it('test_findComment1', function() {
				var r = setup("/***/var foo = {f: function() {}}");
				return r.astManager.getAST(r.editorContext).then(function(ast) {
					var comment = Finder.findComment(0, ast);
					if(comment) {
						assert.fail("Should not have found a comment");
					}
				});
			});
			
			/**
			 * Find a comment
			 * https://bugs.eclipse.org/bugs/show_bug.cgi?id=426033
			 */
			it('test_findComment2', function() {
				var r = setup("/***/var foo = {f: function() {}}");
				return r.astManager.getAST(r.editorContext).then(function(ast) {
					var comment = Finder.findComment(4, ast);
					if(!comment) {
						assert.fail("Should have found a comment");
					}
				});
			});
			
			/**
			 * Find a comment
			 * https://bugs.eclipse.org/bugs/show_bug.cgi?id=426033
			 */
			it('test_findComment3', function() {
				var r = setup("var foo = {/***/f: function() {}}");
				return r.astManager.getAST(r.editorContext).then(function(ast) {
					var comment = Finder.findComment(11, ast);
					if(comment) {
						assert.fail("Should not have found a comment");
					}
				});
			});
			
			/**
			 * Find a comment
			 * https://bugs.eclipse.org/bugs/show_bug.cgi?id=426033
			 */
			it('test_findComment4', function() {
				var r = setup("var foo = {/***/f: function() {}}");
				return r.astManager.getAST(r.editorContext).then(function(ast) {
					var comment = Finder.findComment(14, ast);
					if(!comment) {
						assert.fail("Should have found a comment");
					}
				});
			});
			
			/**
			 * Find a comment
			 * https://bugs.eclipse.org/bugs/show_bug.cgi?id=426033
			 */
			it('test_findComment5', function() {
				var r = setup("/***/function f() {/***/};");
				return r.astManager.getAST(r.editorContext).then(function(ast) {
					var comment = Finder.findComment(19, ast);
					if(comment) {
						assert.fail("Should not have found a comment");
					}
				});
			});
			
			/**
			 * Find a comment
			 * https://bugs.eclipse.org/bugs/show_bug.cgi?id=426033
			 */
			it('test_findComment6', function() {
				var r = setup("/***/function f() {/***/};/***/");
				return r.astManager.getAST(r.editorContext).then(function(ast) {
					var comment = Finder.findComment(26, ast);
					if(comment) {
						assert.fail("Should not have found a comment");
					}
				});
			});
			
			/**
			 * @see https://bugs.eclipse.org/bugs/show_bug.cgi?id=440828
			 * @since 7.0
			 */
			it('test_findComment7', function() {
				var r = setup("/*");
				return r.astManager.getAST(r.editorContext).then(function(ast) {
					var comment = Finder.findComment(2, ast);
					if(!comment) {
						assert.fail("Should have found a comment");
					}
				});
			});
			
			/**
			 * @see https://bugs.eclipse.org/bugs/show_bug.cgi?id=440920
			 * @since 7.0
			 */
			it('test_findComment8', function() {
				var r = setup("var f; /*");
				return r.astManager.getAST(r.editorContext).then(function(ast) {
					var comment = Finder.findComment(9, ast);
					if(!comment) {
						assert.fail("Should have found a comment");
					}
				});
			});
			
			/**
			 * @see https://bugs.eclipse.org/bugs/show_bug.cgi?id=440920
			 * @since 7.0
			 */
			it('test_findComment9', function() {
				var r = setup("/* var f;");
				return r.astManager.getAST(r.editorContext).then(function(ast) {
					var comment = Finder.findComment(9, ast);
					if(!comment) {
						assert.fail("Should have found a comment");
					}
				});
			});
			
			/**
			 * @see https://bugs.eclipse.org/bugs/show_bug.cgi?id=440920
			 * @since 7.0
			 */
			it('test_findComment10', function() {
				var r = setup("var b; /* var f;");
				return r.astManager.getAST(r.editorContext).then(function(ast) {
					var comment = Finder.findComment(16, ast);
					if(!comment) {
						assert.fail("Should have found a comment");
					}
				});
			});
			
			/**
			 * @see https://bugs.eclipse.org/bugs/show_bug.cgi?id=444001
			 * @since 7.0
			 */
			it('test_findComment11', function() {
				var r = setup("// .");
				return r.astManager.getAST(r.editorContext).then(function(ast) {
					var comment = Finder.findComment(4, ast);
					if(!comment) {
						assert.fail("Should have found a comment");
					}
				});
			});
			
			/**
			 * @see https://bugs.eclipse.org/bugs/show_bug.cgi?id=444001
			 * @since 7.0
			 */
			it('test_findComment12', function() {
				var r = setup("// . foo bar");
				return r.astManager.getAST(r.editorContext).then(function(ast) {
					var comment = Finder.findComment(4, ast);
					if(!comment) {
						assert.fail("Should have found a comment");
					}
				});
			});
			
			/**
			 * @see https://bugs.eclipse.org/bugs/show_bug.cgi?id=444001
			 * @since 7.0
			 */
			it('test_findComment12', function() {
				var r = setup("// .\nvar foo = 10;");
				return r.astManager.getAST(r.editorContext).then(function(ast) {
					var comment = Finder.findComment(4, ast);
					if(!comment) {
						assert.fail("Should have found a comment");
					}
				});
			});
			
			/**
			 * Find a token with a bogus offset
			 * @see https://bugs.eclipse.org/bugs/show_bug.cgi?id=427141
			 */
			it('test_findTokenBadOffset1', function() {
				var r = setup("if(()) {};");
				return r.astManager.getAST(r.editorContext).then(function(ast) {
					var token = Finder.findToken(-1, ast);
					assert.equal(token, null, "Should not have found a token for a negative offset");
				});
			});
			
			/**
			 * Find a token with a bogus offset
			 * @see https://bugs.eclipse.org/bugs/show_bug.cgi?id=427141
			 */
			it('test_findTokenBadOffset2', function() {
				var r = setup("if(()) {};");
				return r.astManager.getAST(r.editorContext).then(function(ast) {
					var token = Finder.findToken(null, ast);
					assert.equal(token, null, "Should not have found a token for a null offset");
				});
			});
			
			/**
			 * Find a token with a bogus offset
			 * @see https://bugs.eclipse.org/bugs/show_bug.cgi?id=427141
			 */
			it('test_findTokenBadOffset3', function() {
				var r = setup("if(()) {};");
				return r.astManager.getAST(r.editorContext).then(function(ast) {
					var token = Finder.findToken(undefined, ast);
					assert.equal(token, null, "Should not have found a token for an undefined offset");
				});
			});
			
			/**
			 * Find a node with a bogus offset
			 * @see https://bugs.eclipse.org/bugs/show_bug.cgi?id=427141
			 */
			it('test_findNodeBadOffset1', function() {
				var r = setup("if(()) {};");
				return r.astManager.getAST(r.editorContext).then(function(ast) {
					var token = Finder.findNode(null, ast);
					assert.equal(token, null, "Should not have found a node for a null offset");
				});
			});
			
			/**
			 * Find a node with a bogus offset
			 * @see https://bugs.eclipse.org/bugs/show_bug.cgi?id=427141
			 */
			it('test_findNodeBadOffset2', function() {
				var r = setup("if(()) {};");
				return r.astManager.getAST(r.editorContext).then(function(ast) {
					var token = Finder.findNode(-1, ast);
					assert.equal(token, null, "Should not have found a node for a negative offset");
				});
			});
			
			/**
			 * Find a node with a bogus offset
			 * @see https://bugs.eclipse.org/bugs/show_bug.cgi?id=427141
			 */
			it('test_findNodeBadOffset3', function() {
				var r = setup("if(()) {};");
				return r.astManager.getAST(r.editorContext).then(function(ast) {
					var token = Finder.findNode(undefined, ast);
					assert.equal(token, null, "Should not have found a node for an undefined offset");
				});
			});
			describe('Find Script Block Tests', function() {
				/**
				 * Tests the support for finding script blocks in HTML
				 * @see https://bugs.eclipse.org/bugs/show_bug.cgi?id=430299
				 */
				it('test_findScriptBlock1', function() {
					var r = setup("<!DOCTYPE html><head><script>function f() {}</script></head></html>");
					var blocks = Finder.findScriptBlocks(r.text);
					assert.equal(blocks.length, 1, "Should have found one script block");
					assert.equal(blocks[0].offset, 29);
					assert.equal(blocks[0].text, 'function f() {}');
				});
				
				/**
				 * Tests the support for finding script blocks in HTML
				 * @see https://bugs.eclipse.org/bugs/show_bug.cgi?id=430299
				 */
				it('test_findScriptBlock2', function() {
					var r = setup("<!DOCTYPE html><head><scriPt>function f() {}</script></head></html>");
					var blocks = Finder.findScriptBlocks(r.text);
					assert.equal(blocks.length, 1, "Should have found one script block");
					assert.equal(blocks[0].offset, 29);
					assert.equal(blocks[0].text, 'function f() {}');
				});
				
				/**
				 * Tests the support for finding script blocks in HTML
				 * @see https://bugs.eclipse.org/bugs/show_bug.cgi?id=430299
				 */
				it('test_findScriptBlock3', function() {
					var r = setup("<!DOCTYPE html><head><script>function f() {}</scriPt></head></html>");
					var blocks = Finder.findScriptBlocks(r.text);
					assert.equal(blocks.length, 1, "Should have found one script block");
					assert.equal(blocks[0].offset, 29);
					assert.equal(blocks[0].text, 'function f() {}');
				});
				
				/**
				 * Tests the support for finding script blocks in HTML
				 * @see https://bugs.eclipse.org/bugs/show_bug.cgi?id=430299
				 */
				it('test_findScriptBlock4', function() {
					var r = setup("<!DOCTYPE html><head><scRipt>function f() {}</scripT></head></html>");
					var blocks = Finder.findScriptBlocks(r.text);
					assert.equal(blocks.length, 1, "Should have found one script block");
					assert.equal(blocks[0].offset, 29);
					assert.equal(blocks[0].text, 'function f() {}');
				});
				
				/**
				 * Tests the support for finding script blocks in HTML
				 * @see https://bugs.eclipse.org/bugs/show_bug.cgi?id=430299
				 */
				it('test_findScriptBlock5', function() {
					var r = setup("<!DOCTYPE html><head><scriPt   >function f() {}</scRIpt></head></html>");
					var blocks = Finder.findScriptBlocks(r.text);
					assert.equal(blocks.length, 1, "Should have found one script block");
					assert.equal(blocks[0].offset, 32);
					assert.equal(blocks[0].text, 'function f() {}');
				});
				
				/**
				 * Tests the support for finding script blocks in HTML
				 * @see https://bugs.eclipse.org/bugs/show_bug.cgi?id=430299
				 */
				it('test_findScriptBlockMulti1', function() {
					var r = setup("<!DOCTYPE html><head><script>function f() {}</script><script>function f() {}</script></head></html>");
					var blocks = Finder.findScriptBlocks(r.text);
					assert.equal(blocks.length, 2, "Should have found two script blocks");
					assert.equal(blocks[0].offset, 29);
					assert.equal(blocks[0].text, 'function f() {}');
					assert.equal(blocks[1].offset, 61);
					assert.equal(blocks[1].text, 'function f() {}');
				});
				
				/**
				 * Tests the support for finding script blocks in HTML
				 * @see https://bugs.eclipse.org/bugs/show_bug.cgi?id=430299
				 */
				it('test_findScriptBlockMulti2', function() {
					var r = setup("<!DOCTYPE html><head><scrIpt>function f() {}</script><scRipt>function f() {}</script></head></html>");
					var blocks = Finder.findScriptBlocks(r.text);
					assert.equal(blocks.length, 2, "Should have found two script blocks");
					assert.equal(blocks[0].offset, 29);
					assert.equal(blocks[0].text, 'function f() {}');
					assert.equal(blocks[1].offset, 61);
					assert.equal(blocks[1].text, 'function f() {}');
				});
				
				/**
				 * Tests the support for finding script blocks in HTML
				 * @see https://bugs.eclipse.org/bugs/show_bug.cgi?id=430299
				 */
				it('test_findScriptBlockMulti3', function() {
					var r = setup("<!DOCTYPE html><head><scripT>function f() {}</scriPt><scRipt>function f() {}</Script></head></html>");
					var blocks = Finder.findScriptBlocks(r.text);
					assert.equal(blocks.length, 2, "Should have found two script blocks");
					assert.equal(blocks[0].offset, 29);
					assert.equal(blocks[0].text, 'function f() {}');
					assert.equal(blocks[1].offset, 61);
					assert.equal(blocks[1].text, 'function f() {}');
				});
				
				/**
				 * Tests the support for finding script blocks in HTML
				 * @see https://bugs.eclipse.org/bugs/show_bug.cgi?id=430299
				 */
				it('test_findScriptBlockMulti4', function() {
					var r = setup("<!DOCTYPE html><head><script >function f() {}</script><script  >function f() {}</script></head></html>");
					var blocks = Finder.findScriptBlocks(r.text);
					assert.equal(blocks.length, 2, "Should have found two script blocks");
					assert.equal(blocks[0].offset, 30);
					assert.equal(blocks[0].text, 'function f() {}');
					assert.equal(blocks[1].offset, 64);
					assert.equal(blocks[1].text, 'function f() {}');
				});
				
				/**
				 * Tests the support for finding script blocks in HTML
				 * @see https://bugs.eclipse.org/bugs/show_bug.cgi?id=430299
				 */
				it('test_findScriptBlockMultiWithOffset1', function() {
					var r = setup("<!DOCTYPE html><head><script >function f() {}</script><script  >function f() {}</script></head></html>");
					var blocks = Finder.findScriptBlocks(r.text, 39);
					assert.equal(blocks.length, 1, "Should have found one script block");
					assert.equal(blocks[0].offset, 30);
					assert.equal(blocks[0].text, 'function f() {}');
				});
				/**
				 * Tests the support for finding script blocks in HTML
				 * @see https://bugs.eclipse.org/bugs/show_bug.cgi?id=430299
				 */
				it('test_findScriptBlockMultiWithOffset2', function() {
					var r = setup("<!DOCTYPE html><head><script >function f() {}</script><script  >function f() {}</script></head></html>");
					var blocks = Finder.findScriptBlocks(r.text, 71);
					assert.equal(blocks.length, 1, "Should have found one script block");
					assert.equal(blocks[0].offset, 64);
					assert.equal(blocks[0].text, 'function f() {}');
				});
				
				/**
				 * Tests the support for finding script blocks in HTML
				 * @see https://bugs.eclipse.org/bugs/show_bug.cgi?id=430299
				 */
				it('test_findScriptBlockWithOffset1', function() {
					var r = setup("<!DOCTYPE html><head><script >function f() {}</script></head></html>");
					var blocks = Finder.findScriptBlocks(r.text, 39);
					assert.equal(blocks.length, 1, "Should have found one script block");
					assert.equal(blocks[0].offset, 30);
					assert.equal(blocks[0].text, 'function f() {}');
				});
				
				/**
				 * Tests the support for finding script blocks in HTML with postamble text
				 * https://bugs.eclipse.org/bugs/show_bug.cgi?id=433263
				 */
				it('test_findScriptBlockWithSpacePostamble1', function() {
					var r = setup("<!DOCTYPE html><head><script type='javascript'>function f() {}</script></head></html>");
					var blocks = Finder.findScriptBlocks(r.text, 48);
					assert.equal(blocks.length, 1, "Should have found one script block");
					assert.equal(blocks[0].offset, 47);
					assert.equal(blocks[0].text, 'function f() {}');
				});
				
				/**
				 * Tests the support for finding script blocks in HTML with postamble text
				 * https://bugs.eclipse.org/bugs/show_bug.cgi?id=433263
				 */
				it('test_findScriptBlockWithSpacePostamble2', function() {
					var r = setup("<!DOCTYPE html><head><script type=javascript  >function f() {}</script></head></html>");
					var blocks = Finder.findScriptBlocks(r.text, 48);
					assert.equal(blocks.length, 1, "Should have found one script block");
					assert.equal(blocks[0].offset, 47);
					assert.equal(blocks[0].text, 'function f() {}');
				});
				
				/**
				 * Tests the support for finding script blocks in HTML with postamble text
				 * https://bugs.eclipse.org/bugs/show_bug.cgi?id=433263
				 */
				it('test_findScriptBlockWithSpacePostamble3', function() {
					var r = setup("<!DOCTYPE html><head><script source=foo bar  >function f() {}</script></head></html>");
					var blocks = Finder.findScriptBlocks(r.text, 47);
					assert.equal(blocks.length, 1, "Should have found one script block");
					assert.equal(blocks[0].offset, 46);
					assert.equal(blocks[0].text, 'function f() {}');
				});
				
				/**
				 * Tests the support for finding script blocks in HTML with postamble text
				 * https://bugs.eclipse.org/bugs/show_bug.cgi?id=433263
				 */
				it('test_findScriptBlockWithSpacePostamble4', function() {
					var r = setup("<!DOCTYPE html><head><script source=foo bar  >function f() {}</script type='javascript' ></head></html>");
					var blocks = Finder.findScriptBlocks(r.text, 47);
					assert.equal(blocks.length, 1, "Should have found one script block");
					assert.equal(blocks[0].offset, 46);
					assert.equal(blocks[0].text, 'function f() {}');
				});
				
				/**
				 * Tests the support for finding script blocks in HTML with postamble text
				 * https://bugs.eclipse.org/bugs/show_bug.cgi?id=433263
				 */
				it('test_findScriptBlockWithSpacePostamble5', function() {
					var r = setup("<!DOCTYPE html><head><script source=foo bar  >function f() {}</script type=javascript ></head></html>");
					var blocks = Finder.findScriptBlocks(r.text, 47);
					assert.equal(blocks.length, 1, "Should have found one script block");
					assert.equal(blocks[0].offset, 46);
					assert.equal(blocks[0].text, 'function f() {}');
				});
				
				/**
				 * Tests the support for finding script blocks in HTML with postamble text
				 * https://bugs.eclipse.org/bugs/show_bug.cgi?id=433263
				 */
				it('test_findScriptBlockWithSpacePostamble6', function() {
					var r = setup("<!DOCTYPE html><head><script source=foo bar  >function f() {}</script type= javas cript ></head></html>");
					var blocks = Finder.findScriptBlocks(r.text, 47);
					assert.equal(blocks.length, 1, "Should have found one script block");
					assert.equal(blocks[0].offset, 46);
					assert.equal(blocks[0].text, 'function f() {}');
				});
				
				/**
				 * Tests the support for finding script blocks in HTML with postamble text
				 * https://bugs.eclipse.org/bugs/show_bug.cgi?id=433263
				 */
				it('test_findScriptBlockWithSpacePostamble7', function() {
					var r = setup("<!DOCTYPE html><head>< script source=foo bar  >function f() {}</script type= javas cript ></head></html>");
					var blocks = Finder.findScriptBlocks(r.text, 48);
					assert.equal(blocks.length, 1, "Should have found one script block");
					assert.equal(blocks[0].offset, 47);
					assert.equal(blocks[0].text, 'function f() {}');
				});
				
				/**
				 * Tests the support for finding script blocks in HTML with postamble text
				 * https://bugs.eclipse.org/bugs/show_bug.cgi?id=433263
				 */
				it('test_findScriptBlockWithSpacePostamble8', function() {
					var r = setup("<!DOCTYPE html><head><   scrIpt source=foo bar  >function f() {}</script type= javas cript ></head></html>");
					var blocks = Finder.findScriptBlocks(r.text, 50);
					assert.equal(blocks.length, 1, "Should have found one script block");
					assert.equal(blocks[0].offset, 49);
					assert.equal(blocks[0].text, 'function f() {}');
				});
				
				/**
				 * Tests the support for finding script blocks in HTML with postamble text
				 * https://bugs.eclipse.org/bugs/show_bug.cgi?id=433263
				 */
				it('test_findScriptBlockWithSpacePostamble9', function() {
					var r = setup("<!DOCTYPE html><head><script source=foo bar  >function f() {}<   /scrIpt type= javas cript ></head></html>");
					var blocks = Finder.findScriptBlocks(r.text, 47);
					assert.equal(blocks.length, 1, "Should have found one script block");
					assert.equal(blocks[0].offset, 46);
					assert.equal(blocks[0].text, 'function f() {}');
				});
				/**
				 * Tests the support for finding script blocks with type tags
				 * @see https://bugs.eclipse.org/bugs/show_bug.cgi?id=437489
				 */
				it('test_findScriptBlockWithType1', function() {
					var r = setup("<!DOCTYPE html><head><script type=\"\">function f() {}</script></head></html>");
					var blocks = Finder.findScriptBlocks(r.text, 51);
					assert.equal(blocks.length, 1, "Should have found one script block");
					assert.equal(blocks[0].offset, 37);
					assert.equal(blocks[0].text, 'function f() {}');
				});
				/**
				 * Tests the support for finding script blocks with type tags
				 * @see https://bugs.eclipse.org/bugs/show_bug.cgi?id=437489
				 */
				it('test_findScriptBlockWithType2', function() {
					var r = setup("<!DOCTYPE html><head><script type=\"text/javascript\">function f() {}</script></head></html>");
					var blocks = Finder.findScriptBlocks(r.text, 54);
					assert.equal(blocks.length, 1, "Should have found one script block");
					assert.equal(blocks[0].offset, 52);
					assert.equal(blocks[0].text, 'function f() {}');
				});
				/**
				 * Tests the support for finding script blocks with type tags
				 * @see https://bugs.eclipse.org/bugs/show_bug.cgi?id=437489
				 */
				it('test_findScriptBlockWithType3', function() {
					var r = setup("<!DOCTYPE html><head><script type=\"text/handlebars\">function f() {}</script></head></html>");
					var blocks = Finder.findScriptBlocks(r.text, 54);
					assert.equal(blocks.length, 0, "Should have found no script blocks");
				});
				
				/**
				 * Tests the support for finding script blocks is spec compliant
				 * @see https://bugs.eclipse.org/bugs/show_bug.cgi?id=437957
				 */
				it('test_findScriptBlockWithType4', function() {
					var text = "<!DOCTYPE html><head>\n";
					text += "<script type=\"application/ecmascript\">function f1() {}</script>\n";
					text += "<script type=\"application/javascript\">function f2() {}</script>\n";
					text += "<script type=\"application/x-ecmascript\">function f3() {}</script>\n";
					text += "<script type=\"application/x-javascript\">function f4() {}</script>\n";
					text += "<script type=\"text/ecmascript\">function f5() {}</script>\n";
					text += "<script type=\"text/javascript\">function f6() {}</script>\n";
					text += "<script type=\"text/javascript1.0\">function f7() {}</script>\n";
					text += "<script type=\"text/javascript1.5\">function f8() {}</script>\n";
					text += "<script type=\"text/jscript\">function f9() {}</script>\n";
					text += "<script type=\"text/livescript\">function f10() {}</script>\n";
					text += "<script type=\"text/x-ecmascript\">function f11() {}</script>\n";
					text += "<script type=\"text/x-javascript\">function f12() {}</script>\n";
					text += "</head></html>";
					var blocks = Finder.findScriptBlocks(text);
					assert.equal(blocks.length, 12, "Should have found 12 script blocks");
				});
				
				/**
				 * Tests the support for finding script blocks is spec compliant
				 * @see https://bugs.eclipse.org/bugs/show_bug.cgi?id=437957
				 */
				it('test_findScriptBlockWithType5', function() {
					var text = "<!DOCTYPE html><head>\n";
					text += "<script type=\"ecmascript\">function f1() {}</script>\n";
					text += "<script type=\"javascript\">function f2() {}</script>\n";
					text += "<script type=\"application\">function f3() {}</script>\n";
					text += "<script type=\"application/\">function f4() {}</script>\n";
					text += "<script type=\"application/xml\">function f5() {}</script>\n";
					text += "<script type=\"application/javascriptBLARGH\">function f6() {}</script>\n";
					text += "<script type=\"text\">function f7() {}</script>\n";
					text += "<script type=\"text/\">function f8() {}</script>\n";
					text += "<script type=\"text/plain\">function f9() {}</script>\n";
					text += "<script type=\"text/xml\">function f10() {}</script>\n";
					text += "<script type=\"text/javascript1.1.1\">function f11() {}</script>\n";
					text += "<script type=\"text/javascript1\">function f12() {}</script>\n";
					text += "<script type=\"text/javascriptBLARGH\">function f13() {}</script>\n";
					text += "</head></html>";
					var blocks = Finder.findScriptBlocks(text);
					assert.equal(blocks.length, 0, "Should have found 0 valid script blocks");
				});
				
				/**
				 * Tests the support for finding script blocks with type tags
				 * @see https://bugs.eclipse.org/bugs/show_bug.cgi?id=437489
				 */
				it('test_findScriptBlockWithLanguage1', function() {
					var r = setup("<!DOCTYPE html><head><script language=\"javascript\">function f() {}</script></head></html>");
					var blocks = Finder.findScriptBlocks(r.text, 53);
					assert.equal(blocks.length, 1, "Should have found one script block");
					assert.equal(blocks[0].offset, 51);
					assert.equal(blocks[0].text, 'function f() {}');
				});
				/**
				 * Tests the support for finding script blocks with type tags
				 * @see https://bugs.eclipse.org/bugs/show_bug.cgi?id=437489
				 */
				it('test_findScriptBlockWithLanguage2', function() {
					var r = setup("<!DOCTYPE html><head><script language=\"text/javascript\">function f() {}</script></head></html>");
					var blocks = Finder.findScriptBlocks(r.text, 58);
					assert.equal(blocks.length, 0, "Should have found no valid script block");
				});
				/**
				 * Tests the support for finding script blocks with type tags
				 * @see https://bugs.eclipse.org/bugs/show_bug.cgi?id=437489
				 */
				it('test_findScriptBlockWithLanguage3', function() {
					var r = setup("<!DOCTYPE html><head><script language=\"text/handlebars\">function f() {}</script></head></html>");
					var blocks = Finder.findScriptBlocks(r.text, 58);
					assert.equal(blocks.length, 0, "Should have found no valid script block");
				});
		
				/**
				 * Tests the support for finding script blocks is spec compliant
				 * @see https://bugs.eclipse.org/bugs/show_bug.cgi?id=437957
				 */
				it('test_findScriptBlockWithLanguage4', function() {
					var text = "<!DOCTYPE html><head>\n";
					text += "<script language=\"ecmascript\">function f1() {}</script>\n";
					text += "<script language=\"javascript\">function f2() {}</script>\n";
					text += "<script language=\"javascript1.0\">function f3() {}</script>\n";
					text += "<script language=\"javascript1.5\">function f4() {}</script>\n";
					text += "<script language=\"jscript\">function f5() {}</script>\n";
					text += "<script language=\"livescript\">function f6() {}</script>\n";
					text += "<script language=\"x-ecmascript\">function f7() {}</script>\n";
					text += "<script language=\"x-javascript\">function f8() {}</script>\n";
					text += "</head></html>";
					var blocks = Finder.findScriptBlocks(text);
					assert.equal(blocks.length, 8, "Should have found 8 script blocks");
				});
				
				/**
				 * Tests the support for finding script blocks is spec compliant
				 * @see https://bugs.eclipse.org/bugs/show_bug.cgi?id=437957
				 */
				it('test_findScriptBlockWithLanguage5', function() {
					var text = "<!DOCTYPE html><head>\n";
					text += "<script language=\"application/ecmascript\">function f1() {}</script>\n";
					text += "<script language=\"text/ecmascript\">function f2() {}</script>\n";
					text += "<script language=\"application\">function f3() {}</script>\n";
					text += "<script language=\"application/\">function f4() {}</script>\n";
					text += "<script language=\"javascriptBLARGH\">function f5() {}</script>\n";
					text += "<script language=\"text\">function f6() {}</script>\n";
					text += "<script language=\"text/\">function f7() {}</script>\n";
					text += "<script language=\"plain\">function f8() {}</script>\n";
					text += "<script language=\"xml\">function f9() {}</script>\n";
					text += "<script language=\"javascript1.1.1\">function f10() {}</script>\n";
					text += "<script language=\"javascript1\">function f11() {}</script>\n";
					text += "</head></html>";
					var blocks = Finder.findScriptBlocks(text);
					assert.equal(blocks.length, 0, "Should have found 0 valid script blocks");
				});
		
				/**
				 * Tests the support for finding script blocks in HTML with postamble text
				 * https://bugs.eclipse.org/bugs/show_bug.cgi?id=433263
				 */
				it('test_findNoScriptBlockWithSpacePostamble1', function() {
					var r = setup("<!DOCTYPE html><head><script <source=foo bar  >function f() {}</script type= javas cript ></head></html>");
					var blocks = Finder.findScriptBlocks(r.text, 39);
					assert.equal(blocks.length, 0, "Should not have found any script blocks");
				});
				
				/**
				 * Tests the support for finding script blocks in HTML with postamble text
				 * https://bugs.eclipse.org/bugs/show_bug.cgi?id=433263
				 */
				it('test_findNoScriptBlockWithSpacePostamble2', function() {
					var r = setup("<!DOCTYPE html><head><script source=foo bar  > source='js'>function f() {}</script type= javas cript ></head></html>");
					var blocks = Finder.findScriptBlocks(r.text, 39);
					assert.equal(blocks.length, 0, "Should not have found any script blocks");
				});
				
				/**
				 * Tests finding script blocks within comments
				 * https://bugs.eclipse.org/bugs/show_bug.cgi?id=431054
				 */
				it('test_findNoScriptBlockInHTMLComment1', function() {
					var r = setup("<!DOCTYPE html><head><!--<script>function f() {}</script>--></head></html>");
					var blocks = Finder.findScriptBlocks(r.text, 39);
					assert.equal(blocks.length, 0, "Should not have found any script blocks");
				});
				/**
				 * Tests finding script blocks within comments
				 * https://bugs.eclipse.org/bugs/show_bug.cgi?id=431054
				 */
				it('test_findNoScriptBlockInHTMLComment2', function() {
					var r = setup("<!DOCTYPE html><head><!--<script>function f() {}</script>--><script>function f() {}</script><!--<script>function f() {}</script>--></head></html>");
					var blocks = Finder.findScriptBlocks(r.text);
					assert.equal(blocks.length, 1, "Should have found one script block");
				});
				/**
				 * Tests finding script blocks within comments
				 * https://bugs.eclipse.org/bugs/show_bug.cgi?id=431054
				 */
				it('test_findNoScriptBlockInHTMLComment3', function() {
					var r = setup("<!DOCTYPE html><head><!--<script>function f() {}</script><script>function f() {}</script><script>function f() {}</script>--></head></html>");
					var blocks = Finder.findScriptBlocks(r.text);
					assert.equal(blocks.length, 0, "Should have found no script blocks");
				});
				/**
				 * Tests finding script blocks within comments
				 * https://bugs.eclipse.org/bugs/show_bug.cgi?id=431054
				 */
				it('test_findNoScriptBlockInHTMLComment2', function() {
					var r = setup("<!DOCTYPE html><head><script>function f() {}</script><!--<script>function f() {}</script>--><script>function f() {}</script></head></html>");
					var blocks = Finder.findScriptBlocks(r.text);
					assert.equal(blocks.length, 2, "Should have found two script blocks");
				});
				
				/**
				 * Tests the support for finding script blocks is spec compliant
				 * @see https://bugs.eclipse.org/bugs/show_bug.cgi?id=437957
				 */
				it('test_findScriptBlockEmptyAndMixedAttributes1', function() {
					var r = setup("<!DOCTYPE html><head><script language=\"BLARGH\" type=\"\">function f() {}</script>\n</head></html>");
					var blocks = Finder.findScriptBlocks(r.text);
					assert.equal(blocks.length, 0, "Should have found no script block");
				});
				
				/**
				 * Tests the support for finding script blocks is spec compliant
				 * @see https://bugs.eclipse.org/bugs/show_bug.cgi?id=437957
				 */
				it('test_findScriptBlockEmptyAndMixedAttributes2', function() {
					var r = setup("<!DOCTYPE html><head><script language=\"\">function f() {}</script>\n</head></html>");
					var blocks = Finder.findScriptBlocks(r.text);
					assert.equal(blocks.length, 1, "Should have found 1 script block");
				});
				
				/**
				 * Tests the support for finding script blocks is spec compliant
				 * @see https://bugs.eclipse.org/bugs/show_bug.cgi?id=437957
				 */
				it('test_findScriptBlockEmptyAndMixedAttributes3', function() {
					var r = setup("<!DOCTYPE html><head><script>function f() {}</script>\n</head></html>");
					var blocks = Finder.findScriptBlocks(r.text);
					assert.equal(blocks.length, 1, "Should have found 1 script block");
				});
				
				/**
				 * Tests the support for finding script blocks is spec compliant
				 * @see https://bugs.eclipse.org/bugs/show_bug.cgi?id=437957
				 */
				it('test_findScriptBlockEmptyAndMixedAttributes4', function() {
					var r = setup("<!DOCTYPE html><head><script language=\"BLARGH\" type=\"text/javascript\">function f() {}</script>\n</head></html>");
					var blocks = Finder.findScriptBlocks(r.text);
					assert.equal(blocks.length, 0, "Should have found no script block");
				});
				
				/**
				 * Tests the support for finding script blocks is spec compliant
				 * @see https://bugs.eclipse.org/bugs/show_bug.cgi?id=437957
				 */
				it('test_findScriptBlockEmptyAndMixedAttributes5', function() {
					var r = setup("<!DOCTYPE html><head><script type=\"text/javascript\" language=\"BLARGH\">function f() {}</script>\n</head></html>");
					var blocks = Finder.findScriptBlocks(r.text);
					// TODO If we have both attributes, the regex will always take the last matching 
		//			assert.equal(blocks.length, 0, "Should have found no script block");
					assert.equal(blocks.length, 1, "We don't currently support both type and language attributes on a script tag (Bug 437957)");
				});
				
				/**
				 * Tests finding script blocks with src dependencies
				 * @see https://bugs.eclipse.org/bugs/show_bug.cgi?id=465816
				 */
				it('Script Blocks with Dependencies Simple 1', function() {
					var r = setup('<!DOCTYPE html><head><script src="foo.js"></script>\n</head></html>');
					var blocks = Finder.findScriptBlocks(r.text);
					assert.equal(blocks.length, 1, "Should have found 1 script block");
					assert(blocks[0].dependencies, "Block should have src dependency");
				});
				
				/**
				 * Tests finding script blocks with src dependencies
				 * @see https://bugs.eclipse.org/bugs/show_bug.cgi?id=465816
				 */
				it('Script Blocks with Dependencies Simple 2', function() {
					var r = setup('<!DOCTYPE html><head><script src="foo"></script>\n</head></html>');
					var blocks = Finder.findScriptBlocks(r.text);
					assert.equal(blocks.length, 1, "Should have found 1 script block");
					assert(blocks[0].dependencies, "Block should have src dependency");
				});			
				
				
				/**
				 * Tests finding script blocks with src dependencies
				 * @see https://bugs.eclipse.org/bugs/show_bug.cgi?id=465816
				 */
				it('Script Blocks with Dependencies Inline', function() {
					var r = setup('<!DOCTYPE html><head><script src="foo.js"/>\n</head></html>');
					var blocks = Finder.findScriptBlocks(r.text);
					assert.equal(blocks.length, 1, "Should have found 1 script block");
					assert(blocks[0].dependencies, "Block should have src dependency");
				});		
				
				/**
				 * Tests finding script blocks with src dependencies
				 * @see https://bugs.eclipse.org/bugs/show_bug.cgi?id=465816
				 */
				it('Script Blocks with Dependencies Content', function() {
					var r = setup('<!DOCTYPE html><head><script src="foo.js">function f(){};</script>\n</head></html>');
					var blocks = Finder.findScriptBlocks(r.text);
					assert.equal(blocks.length, 1, "Should have found 1 script block");
					assert(blocks[0].dependencies, "Block should have src dependency");
				});	
				
				/**
				 * Tests finding script blocks with src dependencies
				 * @see https://bugs.eclipse.org/bugs/show_bug.cgi?id=465816
				 */
				it('Script Blocks with Dependencies Attributes 1', function() {
					var r = setup('<!DOCTYPE html><head><script type="text/javascript" src="foo.js"></script>\n</head></html>');
					var blocks = Finder.findScriptBlocks(r.text);
					assert.equal(blocks.length, 1, "Should have found 1 script block");
					assert(blocks[0].dependencies, "Block should have src dependency");
				});	
				
				/**
				 * Tests finding script blocks with src dependencies
				 * @see https://bugs.eclipse.org/bugs/show_bug.cgi?id=465816
				 */
				it('Script Blocks with Dependencies Attributes 2', function() {
					var r = setup('<!DOCTYPE html><head><script language="javascript" src="foo.js"></script>\n</head></html>');
					var blocks = Finder.findScriptBlocks(r.text);
					assert.equal(blocks.length, 1, "Should have found 1 script block");
					assert(blocks[0].dependencies, "Block should have src dependency");
				});	
				
				/**
				 * Tests finding script blocks with src dependencies
				 * @see https://bugs.eclipse.org/bugs/show_bug.cgi?id=465816
				 */
				it('Script Blocks with Dependencies Attributes 3', function() {
					var r = setup('<!DOCTYPE html><head><script language="NOT_JAVASCRIPT" src="foo.js"></script>\n</head></html>');
					var blocks = Finder.findScriptBlocks(r.text);
					assert.equal(blocks.length, 0, "Should have found 0 script blocks");
				});	
				
				/**
				 * Find script blocks for on event HTML attributes
				 * @see https://bugs.eclipse.org/bugs/show_bug.cgi?id=475965
				 */
				it('Script Blocks for event attributes 1', function() {
					var r = setup('<!DOCTYPE html><body><a onclick="test()"></a></body></html>');
					var blocks = Finder.findScriptBlocks(r.text);
					assert.equal(blocks.length, 1, "Should have found 1 script block");
					assert(!blocks[0].dependencies, "Block should not have dependency");
					assert(blocks[0].isWrappedFunctionCall, "Block should be a function call needing wrapping");
					assert.equal(blocks[0].text, 'test()');
				});
				/**
				 * Find script blocks for on event HTML attributes
				 * @see https://bugs.eclipse.org/bugs/show_bug.cgi?id=475965
				 */
				it('Script Blocks for event attributes 2', function() {
					var r = setup('<!DOCTYPE html><body><a onclick="test();"/></body></html>');
					var blocks = Finder.findScriptBlocks(r.text);
					assert.equal(blocks.length, 1, "Should have found 1 script block");
					assert(!blocks[0].dependencies, "Block should not have dependency");
					assert(blocks[0].isWrappedFunctionCall, "Block should be a function call needing wrapping");
					assert.equal(blocks[0].text, 'test();');
				});
				/**
				 * Find script blocks for on event HTML attributes
				 * @see https://bugs.eclipse.org/bugs/show_bug.cgi?id=475965
				 */
				it('Script Blocks for event attributes 3', function() {
					var r = setup('<!DOCTYPE html><body><a onclick="test()" onkeydown="test2()"></a></body></html>');
					var blocks = Finder.findScriptBlocks(r.text);
					assert.equal(blocks.length, 2, "Should have found 2 script blocks");
					assert(!blocks[0].dependencies, "Block should not have dependency");
					assert(blocks[0].isWrappedFunctionCall, "Block should be a function call needing wrapping");
					assert.equal(blocks[0].text, 'test()');
					assert(!blocks[1].dependencies, "Block should not have dependency");
					assert(blocks[1].isWrappedFunctionCall, "Block should be a function call needing wrapping");
					assert.equal(blocks[1].text, 'test2()');
				});
				/**
				 * Find script blocks for on event HTML attributes
				 * @see https://bugs.eclipse.org/bugs/show_bug.cgi?id=475965
				 */
				it('Script Blocks for event attributes 4', function() {
					var r = setup('<!DOCTYPE html><body><a onclick="test()"></a><a onkeydown="test2()"></a></body></html>');
					var blocks = Finder.findScriptBlocks(r.text);
					assert.equal(blocks.length, 2, "Should have found 2 script blocks");
					assert(!blocks[0].dependencies, "Block should not have dependency");
					assert(blocks[0].isWrappedFunctionCall, "Block should be a function call needing wrapping");
					assert.equal(blocks[0].text, 'test()');
					assert(!blocks[1].dependencies, "Block should not have dependency");
					assert(blocks[1].isWrappedFunctionCall, "Block should be a function call needing wrapping");
					assert.equal(blocks[1].text, 'test2()');
				});
				/**
				 * Find script blocks for on event HTML attributes
				 * @see https://bugs.eclipse.org/bugs/show_bug.cgi?id=475965
				 */
				it('Script Blocks for event attributes 5', function() {
					var r = setup('<!DOCTYPE html><head><script>function test(){}</script></head><body><a onclick="test()"></a></body></html>');
					var blocks = Finder.findScriptBlocks(r.text);
					assert.equal(blocks.length, 2, "Should have found 2 script blocks");
					assert(!blocks[0].dependencies, "Block should not have dependency");
					assert(!blocks[0].isWrappedFunctionCall, "Block should not be a function call needing wrapping");
					assert.equal(blocks[0].text, 'function test(){}');
					assert(!blocks[1].dependencies, "Block should not have dependency");
					assert(blocks[1].isWrappedFunctionCall, "Block should be a function call needing wrapping");
					assert.equal(blocks[1].text, 'test()');
				});
				/**
				 * Find script blocks for on event HTML attributes
				 * @see https://bugs.eclipse.org/bugs/show_bug.cgi?id=475965
				 */
				it('Script Blocks for event attributes 6', function() {
					var r = setup('<!DOCTYPE html><head><script src="foo.js">function test(){}</script></head><body><a onclick="test()"></a></body></html>');
					var blocks = Finder.findScriptBlocks(r.text);
					assert.equal(blocks.length, 2, "Should have found 2 script blocks");
					assert(blocks[0].dependencies, "Block should have dependency");
					assert(!blocks[0].isWrappedFunctionCall, "Block should not be a function call needing wrapping");
					assert.equal(blocks[0].text, 'function test(){}');
					assert(!blocks[1].dependencies, "Block should not have dependency");
					assert(blocks[1].isWrappedFunctionCall, "Block should be a function call needing wrapping");
					assert.equal(blocks[1].text, 'test()');
				});
				/**
				 * Find script blocks for on event HTML attributes
				 * @see https://bugs.eclipse.org/bugs/show_bug.cgi?id=475965
				 */
				it('Script Blocks for event attributes 9', function() {
					var r = setup('<!DOCTYPE html><body><a    \t\nonclick   \t\n=   \t\n"test()"    \t\n></a></body></html>');
					var blocks = Finder.findScriptBlocks(r.text);
					assert.equal(blocks.length, 1, "Should have found 1 script block");
					assert(!blocks[0].dependencies, "Block should not have dependency");
					assert(blocks[0].isWrappedFunctionCall, "Block should be a function call needing wrapping");
					assert.equal(blocks[0].text, 'test()');
				});
				
				/**
				 * Find script blocks for on event HTML attributes no matter the casing
				 * @see https://bugs.eclipse.org/bugs/show_bug.cgi?id=481245
				 */
				it('Script Blocks for event attributes case sensitive 1', function() {
					var r = setup('<!DOCTYPE html><body><a onClick="test()"></a></body></html>');
					var blocks = Finder.findScriptBlocks(r.text);
					assert.equal(blocks.length, 1, "Should have found 1 script block");
					assert(!blocks[0].dependencies, "Block should not have dependency");
					assert(blocks[0].isWrappedFunctionCall, "Block should be a function call needing wrapping");
					assert.equal(blocks[0].text, 'test()');
				});
				/**
				 * Find script blocks for on event HTML attributes no matter the casing
				 * @see https://bugs.eclipse.org/bugs/show_bug.cgi?id=481245
				 */
				it('Script Blocks for event attributes case sensitive 2', function() {
					var r = setup('<!DOCTYPE html><body><a onCLICK="test()"></a></body></html>');
					var blocks = Finder.findScriptBlocks(r.text);
					assert.equal(blocks.length, 1, "Should have found 1 script block");
					assert(!blocks[0].dependencies, "Block should not have dependency");
					assert(blocks[0].isWrappedFunctionCall, "Block should be a function call needing wrapping");
					assert.equal(blocks[0].text, 'test()');
				});
				/**
				 * Find script blocks for on event HTML attributes no matter the casing
				 * @see https://bugs.eclipse.org/bugs/show_bug.cgi?id=481245
				 */
				it('Script Blocks for event attributes case sensitive 3', function() {
					var r = setup('<!DOCTYPE html><body><a ONclick="test()"></a></body></html>');
					var blocks = Finder.findScriptBlocks(r.text);
					assert.equal(blocks.length, 1, "Should have found 1 script block");
					assert(!blocks[0].dependencies, "Block should not have dependency");
					assert(blocks[0].isWrappedFunctionCall, "Block should be a function call needing wrapping");
					assert.equal(blocks[0].text, 'test()');
				});
				/**
				 * Find script blocks for on event HTML attributes no matter the casing
				 * @see https://bugs.eclipse.org/bugs/show_bug.cgi?id=481245
				 */
				it('Script Blocks for event attributes case sensitive 4', function() {
					var r = setup('<!DOCTYPE html><body><a ONCLICK="test()"></a></body></html>');
					var blocks = Finder.findScriptBlocks(r.text);
					assert.equal(blocks.length, 1, "Should have found 1 script block");
					assert(!blocks[0].dependencies, "Block should not have dependency");
					assert(blocks[0].isWrappedFunctionCall, "Block should be a function call needing wrapping");
					assert.equal(blocks[0].text, 'test()');
				});
				/**
				 * Find script blocks for on event HTML attributes no matter the casing
				 * @see https://bugs.eclipse.org/bugs/show_bug.cgi?id=481245
				 */
				it('Script Blocks for event attributes case sensitive 5', function() {
					var r = setup('<!DOCTYPE html><body><a oNcLiCk="test()"></a></body></html>');
					var blocks = Finder.findScriptBlocks(r.text);
					assert.equal(blocks.length, 1, "Should have found 1 script block");
					assert(!blocks[0].dependencies, "Block should not have dependency");
					assert(blocks[0].isWrappedFunctionCall, "Block should be a function call needing wrapping");
					assert.equal(blocks[0].text, 'test()');
				});
				/**
				 * Find empty script blocks so the offsets are still valid
				 * @see https://bugs.eclipse.org/bugs/show_bug.cgi?id=481137
				 */
				it('Empty Script Blocks 1', function() {
					var r = setup('<!DOCTYPE html><body><script></script></body></html>');
					var blocks = Finder.findScriptBlocks(r.text);
					assert.equal(blocks.length, 1, "Should have found 1 script block");
					assert(!blocks[0].dependencies, "Block should not have dependency");
					assert(!blocks[0].isWrappedFunctionCall, "Block should not be a function call needing wrapping");
					assert.equal(blocks[0].text, '');
				});
				/**
				 * Find empty script blocks so the offsets are still valid
				 * @see https://bugs.eclipse.org/bugs/show_bug.cgi?id=481137
				 */
				it('Empty Script Blocks 2', function() {
					var r = setup('<!DOCTYPE html><body><a onclick=""></a></body></html>');
					var blocks = Finder.findScriptBlocks(r.text);
					assert.equal(blocks.length, 1, "Should have found 1 script block");
					assert(!blocks[0].dependencies, "Block should not have dependency");
					assert(blocks[0].isWrappedFunctionCall, "Block should be a function call needing wrapping");
					assert.equal(blocks[0].text, '');
				});
				/**
				 * Find empty script blocks so the offsets are still valid
				 * @see https://bugs.eclipse.org/bugs/show_bug.cgi?id=481137
				 */
				it('Empty Script Blocks 3', function() {
					var r = setup('<!DOCTYPE html><body><script/></body></html>');
					var blocks = Finder.findScriptBlocks(r.text);
					assert.equal(blocks.length, 0, "Should have found no script blocks");
				});
				/**
				 * Find empty script blocks so the offsets are still valid
				 * @see https://bugs.eclipse.org/bugs/show_bug.cgi?id=481137
				 */
				it('Empty Script Blocks 4', function() {
					var r = setup('<!DOCTYPE html><body><script></script><a onclick=""></a><script/></body></html>');
					var blocks = Finder.findScriptBlocks(r.text);
					assert.equal(blocks.length, 2, "Should have found 2 script blocks");
					assert(!blocks[0].dependencies, "Block should not have dependency");
					assert(!blocks[0].isWrappedFunctionCall, "Block should not be a function call needing wrapping");
					assert.equal(blocks[0].text, '');
					assert(!blocks[1].dependencies, "Block should not have dependency");
					assert(blocks[1].isWrappedFunctionCall, "Block should be a function call needing wrapping");
					assert.equal(blocks[1].text, '');
				});
				
				/**
				 * Find script blocks for on event HTML attributes
				 * @see https://bugs.eclipse.org/bugs/show_bug.cgi?id=475965
				 */
				it('Script Blocks for event attributes 7', function() {
					var r = setup('<!DOCTYPE html><head><script src="foo.js">test1();</script></head><body><a onclick="test2()"></a><a onclick="test3()"></a><a onclick="test4()"></a><a onclick="test5()"></a><a onclick="test6()"></a><a onclick="test7()"></a><script>test8();</script></body></html>');
					var blocks = Finder.findScriptBlocks(r.text);
					blocks.sort(function(a,b){
						return a.offset - b.offset;
					});
					assert.equal(blocks.length, 8, "Should have found 2 script blocks");
					assert(blocks[0].dependencies, "Block should have dependency");
					assert(!blocks[0].isWrappedFunctionCall, "Block should not be a function call needing wrapping");
					assert.equal(blocks[0].text, 'test1();');
					assert(!blocks[1].dependencies, "Block should not have dependency");
					assert(blocks[1].isWrappedFunctionCall, "Block should be a function call needing wrapping");
					assert.equal(blocks[1].text, 'test2()');
					assert(!blocks[2].dependencies, "Block should not have dependency");
					assert(blocks[2].isWrappedFunctionCall, "Block should be a function call needing wrapping");
					assert.equal(blocks[2].text, 'test3()');
					assert(!blocks[3].dependencies, "Block should not have dependency");
					assert(blocks[3].isWrappedFunctionCall, "Block should be a function call needing wrapping");
					assert.equal(blocks[3].text, 'test4()');
					assert(!blocks[4].dependencies, "Block should not have dependency");
					assert(blocks[4].isWrappedFunctionCall, "Block should be a function call needing wrapping");
					assert.equal(blocks[4].text, 'test5()');
					assert(!blocks[5].dependencies, "Block should not have dependency");
					assert(blocks[5].isWrappedFunctionCall, "Block should be a function call needing wrapping");
					assert.equal(blocks[5].text, 'test6()');
					assert(!blocks[6].dependencies, "Block should not have dependency");
					assert(blocks[6].isWrappedFunctionCall, "Block should be a function call needing wrapping");
					assert.equal(blocks[6].text, 'test7()');
					assert(!blocks[7].dependencies, "Block should not have dependency");
					assert(!blocks[7].isWrappedFunctionCall, "Block should not be a function call needing wrapping");
					assert.equal(blocks[7].text, 'test8();');
				});
				function testSpecificOnEventAttribute(eventName, shouldPass){
					var r = setup('<!DOCTYPE html><body><a ' + eventName + '="test()"></a></body></html>');
					var blocks = Finder.findScriptBlocks(r.text);
					if (shouldPass){
						assert.equal(blocks.length, 1, "Should have found 1 script block for event: " + eventName);
						assert(!blocks[0].dependencies, "Block should not have dependency");
						assert(blocks[0].isWrappedFunctionCall, "Block should be a function call needing wrapping");
						assert.equal(blocks[0].text, 'test()');
					} else {
						assert.equal(blocks.length, 0, "No blocks should have been found for event: " + eventName);
					}
				}
				/**
				 * Find script blocks for on event HTML attributes
				 * @see https://bugs.eclipse.org/bugs/show_bug.cgi?id=475965
				 */
				it('Script Blocks for specific event attributes', function() {
					testSpecificOnEventAttribute('onblur', true);
					testSpecificOnEventAttribute('onchange', true);
					testSpecificOnEventAttribute('onclick', true);
					testSpecificOnEventAttribute('ondblclick', true);
					testSpecificOnEventAttribute('onfocus', true);
					testSpecificOnEventAttribute('onkeydown', true);
					testSpecificOnEventAttribute('onkeypress', true);
					testSpecificOnEventAttribute('onkeyup', true);
					testSpecificOnEventAttribute('onload', true);
					testSpecificOnEventAttribute('onmousedown', true);
					testSpecificOnEventAttribute('onmousemove', true);
					testSpecificOnEventAttribute('onmouseout', true);
					testSpecificOnEventAttribute('onmouseover', true);
					testSpecificOnEventAttribute('onmouseup', true);
					testSpecificOnEventAttribute('onreset', true);
					testSpecificOnEventAttribute('onselect', true);
					testSpecificOnEventAttribute('onsubmit', true);
					testSpecificOnEventAttribute('onunload', true);
					testSpecificOnEventAttribute('onon', false);
					testSpecificOnEventAttribute('blur', false);
					testSpecificOnEventAttribute('onclick=', false);
					testSpecificOnEventAttribute('=onclick', false);
					testSpecificOnEventAttribute('on click=', false);
				});
			});
			
			/**
			 * Tests the support for finding a member in the ESLint environments description
			 * @see https://bugs.eclipse.org/bugs/show_bug.cgi?id=452296
			 */
			it('test_findESlintEnvForMember1', function() {
				var env = Finder.findESLintEnvForMember('console');
				assert.equal(env, 'browser', "Should have found the browser env");
			});
			
			/**
			 * Tests the support for finding a member in the ESLint environments description
			 * @see https://bugs.eclipse.org/bugs/show_bug.cgi?id=452296
			 */
			it('test_findESlintEnvForMember2', function() {
				var env = Finder.findESLintEnvForMember('define');
				assert.equal(env, 'amd', "Should have found the amd env");
			});
			
			/**
			 * Tests the support for finding a member in the ESLint environments description
			 * @see https://bugs.eclipse.org/bugs/show_bug.cgi?id=452296
			 */
			it('test_findESlintEnvForMember3', function() {
				var env = Finder.findESLintEnvForMember('describe');
				assert.equal(env, 'mocha', "Should have found the mocha env");
			});
			
			/**
			 * Tests the support for finding a member in the ESLint environments description
			 * @see https://bugs.eclipse.org/bugs/show_bug.cgi?id=452296
			 */
			it('test_findESlintEnvForMember4', function() {
				var env = Finder.findESLintEnvForMember('SVGFEMergeNodeElement');
				assert.equal(env, 'browser', "Should have found the browser env");
			});
			
			/**
			 * Tests the support for finding a member in the ESLint environments description
			 * @see https://bugs.eclipse.org/bugs/show_bug.cgi?id=452296
			 */
			it('test_findESlintEnvForMember5', function() {
				var env = Finder.findESLintEnvForMember('encodeURIComponent');
				assert.equal(env, 'builtin', "Should have found the builtin env");
			});
			
			/**
			 * Tests the support for finding a member in the ESLint environments description
			 * @see https://bugs.eclipse.org/bugs/show_bug.cgi?id=452296
			 */
			it('test_findESlintEnvForMember5', function() {
				var env = Finder.findESLintEnvForMember('encodeURIComponent');
				assert.equal(env, 'builtin', "Should have found the builtin env");
			});
			
			/**
			 * Tests the support for finding a member in the ESLint environments description
			 * @see https://bugs.eclipse.org/bugs/show_bug.cgi?id=452296
			 */
			it('test_findESlintEnvForMember6', function() {
				var env = Finder.findESLintEnvForMember(null);
				assert.equal(env, null, "Should not have found an env");
			});
			
			/**
			 * Tests the support for finding a member in the ESLint environments description
			 * @see https://bugs.eclipse.org/bugs/show_bug.cgi?id=452296
			 */
			it('test_findESlintEnvForMember7', function() {
				var env = Finder.findESLintEnvForMember('undefined');
				assert.equal(env, 'builtin', "Should not have found an env");
			});
			
			/**
			 * Tests the support for finding a directive with a given name
			 * @see https://bugs.eclipse.org/bugs/show_bug.cgi?id=452296
			 */
			it('test_findDirective1', function() {
			    var r = setup("/*eslint-env amd*/");
				return r.astManager.getAST(r.editorContext).then(function(ast) {
					var comment = Finder.findDirective(ast, 'eslint-env');
					if(!comment) {
						assert.fail("Should have found a comment");
					}
				});
			});
			
			/**
			 * Tests the support for finding a directive with a given name
			 * @see https://bugs.eclipse.org/bugs/show_bug.cgi?id=452296
			 */
			it('test_findDirective2', function() {
			    var r = setup("/*eslint*/");
				return r.astManager.getAST(r.editorContext).then(function(ast) {
					var comment = Finder.findDirective(ast, 'eslint');
					if(!comment) {
						assert.fail("Should have found a comment");
					}
				});
			});
	        /**
			 * Tests the support for finding a directive with a given name
			 * @see https://bugs.eclipse.org/bugs/show_bug.cgi?id=452296
			 */
			it('test_findDirective3', function() {
			    var r = setup("/*globals console,foo,bar*/");
				return r.astManager.getAST(r.editorContext).then(function(ast) {
					var comment = Finder.findDirective(ast, 'globals');
					if(!comment) {
						assert.fail("Should have found a comment");
					}
				});
			});
			/**
			 * Tests the support for finding a directive with a given name
			 * @see https://bugs.eclipse.org/bugs/show_bug.cgi?id=452296
			 */
			it('test_findDirective4', function() {
			    var r = setup("/**/");
				return r.astManager.getAST(r.editorContext).then(function(ast) {
					var comment = Finder.findDirective(ast, 'eslint');
					if(comment) {
						assert.fail("Should not have found a comment");
					}
				});
			});
			
			it('Test findDirectives 1', function() {
			    var r = setup("/*eslint-enable semi,no-undef*/");
				return r.astManager.getAST(r.editorContext).then(function(ast) {
					var comments = Finder.findDirectives(ast, 'eslint-enable');
					assert.equal(comments.length, 1, "Wrong number of directives found.");
				});
			});
			it('Test findDirectives 2', function() {
			    var r = setup("/* Unrelated comment */\nvar a = 5;\n/*eslint-enable semi,no-undef*/\nfunction foo(){}");
				return r.astManager.getAST(r.editorContext).then(function(ast) {
					var comments = Finder.findDirectives(ast, 'eslint-enable');
					assert.equal(comments.length, 1, "Wrong number of directives found.");
				});
			});
			it('Test findDirectives 3', function() {
			    var r = setup("/*eslint-enable yoda*/\n/* eslint-disable semi */\n/*Unrelated comment */\nvar a = 5;\n/*eslint-enable semi,no-undef*/\nfunction foo(){}");
				return r.astManager.getAST(r.editorContext).then(function(ast) {
					var comments = Finder.findDirectives(ast, 'eslint-enable');
					assert.equal(comments.length, 2, "Wrong number of directives found.");
				});
			});
			
			
			it('Test findProgramStartRange No content', function() {
			    var r = setup("");
				return r.astManager.getAST(r.editorContext).then(function(ast) {
					var start = Finder.findProgramStartRange(ast);
					assert.deepEqual(start, [0,0], "Wrong program start found");
				});
			});
			it('Test findProgramStartRange whitespace content', function() {
			    var r = setup("  \n\n\t\t  ");
				return r.astManager.getAST(r.editorContext).then(function(ast) {
					var start = Finder.findProgramStartRange(ast);
					assert.deepEqual(start, [8,8], "Wrong program start found");
				});
			});
			it('Test findProgramStartRange content at 0', function() {
			    var r = setup("var a = 1;");
				return r.astManager.getAST(r.editorContext).then(function(ast) {
					var start = Finder.findProgramStartRange(ast);
					assert.deepEqual(start, [0,3], "Wrong program start found");
				});
			});
			it('Test findProgramStartRange function decl at 0', function() {
			    var r = setup("function foo(){}");
				return r.astManager.getAST(r.editorContext).then(function(ast) {
					var start = Finder.findProgramStartRange(ast);
					assert.deepEqual(start, [0,8], "Wrong program start found");
				});
			});
			it('Test findProgramStartRange call expression at 0', function() {
			    var r = setup("define(['a', 'b'], function(a, b){ }");
				return r.astManager.getAST(r.editorContext).then(function(ast) {
					var start = Finder.findProgramStartRange(ast);
					assert.deepEqual(start, [0,6], "Wrong program start found");
				});
			});
			it('Test findProgramStartRange block comment at 0', function() {
			    var r = setup("/* Copyright today */\nvar a = 2;");
				return r.astManager.getAST(r.editorContext).then(function(ast) {
					var start = Finder.findProgramStartRange(ast);
					assert.deepEqual(start, [22,25], "Wrong program start found");
				});
			});
			it('Test findProgramStartRange line comment at 0', function() {
			    var r = setup("// Copyright today \nvar a = 2;");
				return r.astManager.getAST(r.editorContext).then(function(ast) {
					var start = Finder.findProgramStartRange(ast);
					assert.deepEqual(start, [20,23], "Wrong program start found");
				});
			});
			it('Test findProgramStartRange content not at 0', function() {
			    var r = setup("\n\n\t\t  var a = 1;");
				return r.astManager.getAST(r.editorContext).then(function(ast) {
					var start = Finder.findProgramStartRange(ast);
					assert.deepEqual(start, [6,9], "Wrong program start found");
				});
			});
			it('Test findProgramStartRange comment only not at 0', function() {
			    var r = setup("\n\n\t\t /* Copyright is mine */");
				return r.astManager.getAST(r.editorContext).then(function(ast) {
					var start = Finder.findProgramStartRange(ast);
					assert.deepEqual(start, [5,6], "Wrong program start found");
				});
			});
			it('Test findProgramStartRange bogus ast', function() {
				var start = Finder.findProgramStartRange({});
				assert.deepEqual(start, [0,0], "Wrong program start found");
			});
			it('Test findProgramStartRange function decl not at 0', function() {
			    var r = setup("\n\n\t\t  function foo(){}");
				return r.astManager.getAST(r.editorContext).then(function(ast) {
					var start = Finder.findProgramStartRange(ast);
					assert.deepEqual(start, [6,14], "Wrong program start found");
				});
			});
			it('Test findProgramStartRange call expression not at 0', function() {
			    var r = setup("\n\n\t\t  define(['a', 'b'], function(a, b){ }");
				return r.astManager.getAST(r.editorContext).then(function(ast) {
					var start = Finder.findProgramStartRange(ast);
					assert.deepEqual(start, [6,12], "Wrong program start found");
				});
			});
			it('Test findProgramStartRange block comment not at 0', function() {
			    var r = setup("\n\n\t\t  /* Copyright today */\n\n\n\t\t  var a = 2;");
				return r.astManager.getAST(r.editorContext).then(function(ast) {
					var start = Finder.findProgramStartRange(ast);
					assert.deepEqual(start, [34,37], "Wrong program start found");
				});
			});
			it('Test findProgramStartRange line comment not at 0', function() {
			    var r = setup("\n\n\t\t  // Copyright today\n\n\n\t\t  var a = 2;");
				return r.astManager.getAST(r.editorContext).then(function(ast) {
					var start = Finder.findProgramStartRange(ast);
					assert.deepEqual(start, [31,34], "Wrong program start found");
				});
			});
			
			it('Test findProgramStartRange No content in HTML', function() {
			    var r= setup("<html>\n<script></script>\n</html>", "text/html");
				return r.astManager.getAST(r.editorContext).then(function(ast) {
					var start = Finder.findProgramStartRange(ast);
					assert.deepEqual(start, [15,15], "Wrong program start found");
				});
			});
			it('Test findProgramStartRange whitespace content in HTML', function() {
			    var r = setup("<html>\n<script>\n  \n\n\t\t  \n</script>\n</html>", "text/html");
				return r.astManager.getAST(r.editorContext).then(function(ast) {
					var start = Finder.findProgramStartRange(ast);
					assert.deepEqual(start, [25,25], "Wrong program start found");
				});
			});
			it('Test findProgramStartRange content at 0 in HTML', function() {
			    var r = setup("<html>\n<script>\nvar a = 1;\n</script>\n</html>", "text/html");
				return r.astManager.getAST(r.editorContext).then(function(ast) {
					var start = Finder.findProgramStartRange(ast);
					assert.deepEqual(start, [16,19], "Wrong program start found");
				});
			});
			it('Test findProgramStartRange block comment at 0 in HTML', function() {
			    var r = setup("<html>\n<script>\n/* Copyright today */\nvar a = 2;\n</script>\n</html>", "text/html");
				return r.astManager.getAST(r.editorContext).then(function(ast) {
					var start = Finder.findProgramStartRange(ast);
					assert.deepEqual(start, [38,41], "Wrong program start found");
				});
			});
			it('Test findProgramStartRange line comment at 0 in HTML', function() {
			    var r = setup("<html>\n<script>\n// Copyright today \nvar a = 2;\n</script>\n</html>", "text/html");
				return r.astManager.getAST(r.editorContext).then(function(ast) {
					var start = Finder.findProgramStartRange(ast);
					assert.deepEqual(start, [36,39], "Wrong program start found");
				});
			});
			it('Test findProgramStartRange content not at 0 in HTML', function() {
			    var r = setup("<html>\n<script>\n\n\n\t\t  var a = 1;\n</script>\n</html>", "text/html");
				return r.astManager.getAST(r.editorContext).then(function(ast) {
					var start = Finder.findProgramStartRange(ast);
					assert.deepEqual(start, [22,25], "Wrong program start found");
				});
			});
			it('Test findProgramStartRange block comment not at 0 in HTML', function() {
			    var r = setup("<html>\n<script>\n\n\n\t\t  /* Copyright today */\n\n\n\t\t  var a = 2;\n</script>\n</html>", "text/html");
				return r.astManager.getAST(r.editorContext).then(function(ast) {
					var start = Finder.findProgramStartRange(ast);
					assert.deepEqual(start, [50,53], "Wrong program start found");
				});
			});
			it('Test findProgramStartRange line comment not at 0 in HTML', function() {
			    var r = setup("<html>\n<script>\n\n\n\t\t  // Copyright today\n\n\n\t\t  var a = 2;\n</script>\n</html>", "text/html");
				return r.astManager.getAST(r.editorContext).then(function(ast) {
					var start = Finder.findProgramStartRange(ast);
					assert.deepEqual(start, [47,50], "Wrong program start found");
				});
			});
			
			/**
			 * @see https://bugs.eclipse.org/bugs/show_bug.cgi?id=461446
			 */
			it('test_findCommentForNode1', function() {
			    var r = setup("/**foo*/function f() {var v = 10;}");
				return r.astManager.getAST(r.editorContext).then(function(ast) {
					var node = Finder.findNode(15, ast);
					assert(node, "We should have found a function declaration AST node");
					var comment = Finder.findCommentForNode(node);
					assert(comment, "We should have found a comment for the func decl node");
					assert.equal(comment.node.type, 'FunctionDeclaration', "The comment node should be the func decl");
					assert.equal(comment.value, '*foo', 'the comment value should have been "foo"');
				});
			});
			/**
			 * @see https://bugs.eclipse.org/bugs/show_bug.cgi?id=461446
			 */
			it('test_findCommentForNode2', function() {
			    var r = setup("/**foo*/function f() {var v = 10;/**bar*/function f() {var v = 10;}}");
				return r.astManager.getAST(r.editorContext).then(function(ast) {
					var node = Finder.findNode(44, ast);
					assert(node, "We should have found a function declaration AST node");
					var comment = Finder.findCommentForNode(node);
					assert(comment, "We should have found a comment for the func decl node");
					assert.equal(comment.node.type, 'FunctionDeclaration', "The comment node should be the func decl");
					assert.equal(comment.value, '*bar', 'the comment value should have been "bar"');
				});
			});
			/**
			 * @see https://bugs.eclipse.org/bugs/show_bug.cgi?id=461446
			 */
			it('test_findCommentForNode3', function() {
			    var r = setup("var o = {/**bar*/one: function f() {var v = 10;}};");
				return r.astManager.getAST(r.editorContext).then(function(ast) {
					var node = Finder.findNode(18, ast, {parents:true});
					assert(node, "We should have found an identifier AST node");
					var comment = Finder.findCommentForNode(node.parents.pop());
					assert(comment, "We should have found a comment for the property node");
					assert.equal(comment.node.type, 'Property', "The comment node should be the property");
					assert.equal(comment.value, '*bar', 'the comment value should have been "bar"');
				});
			});
		});
	};
});
