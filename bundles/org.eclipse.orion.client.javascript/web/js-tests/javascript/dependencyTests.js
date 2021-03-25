/*******************************************************************************
 * @license
 * Copyright (c) 2015, 2016 IBM Corporation and others.
 * All rights reserved. This program and the accompanying materials are made 
 * available under the terms of the Eclipse Public License 2.0 
 * (http://www.eclipse.org/legal/epl-v10.html), and the Eclipse Distribution 
 * License v1.0 (http://www.eclipse.org/org/documents/edl-v10.html). 
 * 
 * Contributors: IBM Corporation - initial API and implementation
 ******************************************************************************/
/*eslint-env amd, mocha, node*/
/* eslint-disable missing-nls */
define([
	'chai/chai',
	'javascript/astManager',
	'orion/Deferred',
	'mocha/mocha'  //must stay last, not a module
], function(chai, ASTManager, Deferred) {
	var assert = chai.assert;

	return /* @callback */ function(worker) {
		var astManager = new ASTManager.ASTManager();
	
		/**
		 * @description Sets up the test
		 * @param {Object} options The options the set up with
		 * @returns {Object} The object with the initialized values
		 */
		function setup(options) {
			var buffer = typeof options.buffer === 'undefined' ? '' : options.buffer,
			    contentType = options.contenttype ? options.contenttype : 'application/javascript',
				file = 'dep_analysis_test_script.js';
				
			var editorContext = {
				/*override*/
				getText: function() {
					return new Deferred().resolve(buffer);
				},
				
				getFileMetadata: function() {
				    var o = Object.create(null);
				    o.contentType = Object.create(null);
				    o.contentType.id = contentType;
				    o.location = file;
				    return new Deferred().resolve(o);
				}
			};
			astManager.onModelChanging({file: {location: file}});
			return {
				editorContext: editorContext
			};
		}
	
		/**
		 * @description Checks the deps from the AST against the given list
		 * @param {object} ast The AST
		 * @param {Array.<string>} expected The array of expected values
		 */
		function assertDeps(ast, expected) {
			assert(ast, 'An AST was not produced');
			assert(expected, 'You must provide an expected array of dependencies');
			assert(ast.dependencies, 'There were no dependencies in the produced AST');
			var len  = ast.dependencies.length;
			assert.equal(len, expected.length, 'The number of computed dependencies and expected ones differs');
			for(var i = 0; i < len; i++) {
				var dep = ast.dependencies[i];
				if(typeof expected[i] === 'object') {
					assert.equal(dep.value, expected[i].value, 'The name of the dependent does not match');
					assert.equal(dep.env, expected[i].env, 'The name of the dependent env does not match');
				} else {
					assert.equal(dep.value, expected[i], 'The name of the dependent does not match');
				}
			}
		}
		/**
		 * @description Checks the envs from the AST against the given list
		 * @param {object} ast The AST
		 * @param {Array.<string>} expected The array of expected values
		 */
		function assertEnvs(ast, expected) {
			assert(ast, 'An AST was not produced');
			assert(expected, 'You must provide an expected array of envs');
			assert(ast.environments, 'There were no envs in the produced AST');
			for(var i = 0, len = expected.length; i < len; i++) {
				assert(ast.environments[expected[i]], 'There is no computed env \''+expected[i]+'\'.');
			}
		}
		describe('Environment Analysis Tests', function() {
			it("commonjs - define(func)", function() {
					var _s = setup({buffer: 'define(function(require) {var foo = require(\'somelib\');});'});
					return astManager.getAST(_s.editorContext).then(function(ast) {
						assertDeps(ast, [{value: 'somelib', env: 'commonjs'}]);
						assertEnvs(ast, ['amd', 'node']);
					});
				});
				it("amd - object expression", function() {
					var _s = setup({buffer: 'define({one: 1});'});
					return astManager.getAST(_s.editorContext).then(function(ast) {
						assertDeps(ast, []);
						assertEnvs(ast, ['amd']);
					});
				});
				it("node - simple", function() {
					var _s = setup({buffer: 'var _n = require(\'somelib\')'});
					return astManager.getAST(_s.editorContext).then(function(ast) {
						assertDeps(ast, ['somelib']);
						assertEnvs(ast, ['node']);
					});
				});
		});
		describe('Dependency Analysis Tests', function() {
			describe('Node Require', function(){
				it("require module", function() {
					var _s = setup({buffer: 'var foo = require("a");'});
					return astManager.getAST(_s.editorContext).then(function(ast) {
						assertDeps(ast, ['a']);
					});
				});
				it("multiple require modules", function() {
					var _s = setup({buffer: 'var foo = require("a");\nvar foo2 = require("b");'});
					return astManager.getAST(_s.editorContext).then(function(ast) {
						assertDeps(ast, ['a', 'b']);
					});
				});
			});
			describe('ES Module Import', function(){
				it("import * from module", function() {
					var _s = setup({buffer: 'import * from "a";'});
					return astManager.getAST(_s.editorContext).then(function(ast) {
						assertDeps(ast, ['a']);
					});
				});
				it("import defaultMember from module", function() {
					var _s = setup({buffer: 'import defaultMember from "a";'});
					return astManager.getAST(_s.editorContext).then(function(ast) {
						assertDeps(ast, ['a']);
					});
				});
				it("import { foo } from module", function() {
					var _s = setup({buffer: 'import {foo} from "a";'});
					return astManager.getAST(_s.editorContext).then(function(ast) {
						assertDeps(ast, ['a']);
					});
				});
				it("import { foo as difFoo } from module", function() {
					var _s = setup({buffer: 'import {foo as difFoo} from "a";'});
					return astManager.getAST(_s.editorContext).then(function(ast) {
						assertDeps(ast, ['a']);
					});
				});
				it("import multiple members from module", function() {
					var _s = setup({buffer: 'import { foobar, foo as difFoo} from "a";'});
					return astManager.getAST(_s.editorContext).then(function(ast) {
						assertDeps(ast, ['a']);
					});
				});
				it("import module only", function() {
					var _s = setup({buffer: 'import "a";'});
					return astManager.getAST(_s.editorContext).then(function(ast) {
						assertDeps(ast, ['a']);
					});
				});
			});			
			describe('RequireJS', function(){
				it("Collect deps define 1", function() {
					var _s = setup({buffer: 'define("foo", ["a"], function(A){});'});
					return astManager.getAST(_s.editorContext).then(function(ast) {
						assertDeps(ast, ['a']);
					});
				});
				it("Collect deps define 2", function() {
					var _s = setup({buffer: 'define(["a"], function(A){});'});
					return astManager.getAST(_s.editorContext).then(function(ast) {
						assertDeps(ast, ['a']);
					});
				});
				it("Collect deps define 3", function() {
					var _s = setup({buffer: 'define(["a", "b", "C"], function(A){});'});
					return astManager.getAST(_s.editorContext).then(function(ast) {
						assertDeps(ast, ['a', 'b', 'C']);
					});
				});
				it("Collect deps importScripts 1", function() {
					var _s = setup({buffer: 'importScripts("a.js");'});
					return astManager.getAST(_s.editorContext).then(function(ast) {
						assertDeps(ast, ['a.js']);
					});
				});
				it("Collect deps importScripts 2", function() {
					var _s = setup({buffer: 'importScripts("a.js", "b.js");'});
					return astManager.getAST(_s.editorContext).then(function(ast) {
						assertDeps(ast, ['a.js', 'b.js']);
					});
				});
				it("Collect deps Worker", function() {
					var _s = setup({buffer: 'var myworker = new Worker("a.js")'});
					return astManager.getAST(_s.editorContext).then(function(ast) {
						assertDeps(ast, ['a.js']);
					});
				});
				it("Collect deps require 1", function() {
					var _s = setup({buffer: 'var _r = require("a")'});
					return astManager.getAST(_s.editorContext).then(function(ast) {
						assertDeps(ast, ['a']);
					});
				});
				it("Collect deps require 1", function() {
					var _s = setup({buffer: 'var _r = require("a");'}); //node + requirejs
					return astManager.getAST(_s.editorContext).then(function(ast) {
						assertDeps(ast, ['a']);
					});
				});
				it("Collect deps require 2", function() {
					var _s = setup({buffer: 'var _r = require(["a"], function(){});'}); //requirejs
					return astManager.getAST(_s.editorContext).then(function(ast) {
						assertDeps(ast, ['a']);
					});
				});
				it("Collect deps require 3", function() {
					var _s = setup({buffer: 'var _r = require(["a", "b", "c"], function(){});'}); //requirejs
					return astManager.getAST(_s.editorContext).then(function(ast) {
						assertDeps(ast, ['a', 'b', 'c']);
					});
				});
				it("Collect deps require 4", function() {
					var _s = setup({buffer: 'var _r = require({paths:{"a": "a/b"}}, ["a", "b", "c"], function(){});'}); //requirejs
					return astManager.getAST(_s.editorContext).then(function(ast) {
						assertDeps(ast, ['a', 'b', 'c']);
					});
				});
				it("Collect deps require 5", function() {
					var _s = setup({buffer: 'var _r = require();'}); //requirejs
					return astManager.getAST(_s.editorContext).then(function(ast) {
						assertDeps(ast, []);
					});
				});
				it("Collect deps requirejs 1", function() {
					var _s = setup({buffer: 'var _r = requirejs(["a", "b", "c"], function(){});'}); //requirejs
					return astManager.getAST(_s.editorContext).then(function(ast) {
						assertDeps(ast, ['a', 'b', 'c']);
					});
				});
				/**
				 * @see https://bugs.eclipse.org/bugs/show_bug.cgi?id=476370
				 * @since 10.0
				 */
				it("Collect deps requirejs + require", function() {
					var _s = setup({buffer: '(function(root, mod) {if (typeof exports == "object" && typeof module == "object") return mod(exports, require("./infer"), require("./signal"), require("esprima"), require("acorn/dist/walk")); if (typeof define == "function" && define.amd) return define(["exports", "./infer", "./signal", "esprima", "acorn/dist/walk"], mod); mod(root.tern || (root.tern = {}), tern, tern.signal, acorn, acorn.walk);})(this, function(exports, infer, signal, acorn, walk) {})'}); //requirejs
					return astManager.getAST(_s.editorContext).then(function(ast) {
						assertDeps(ast, ['./infer', './signal', 'esprima', 'acorn/dist/walk', 'exports']);
					});
				});
			});
		});
	};
});
