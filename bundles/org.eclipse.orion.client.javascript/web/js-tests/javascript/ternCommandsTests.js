/*******************************************************************************
 * @license
 * Copyright (c) 2015, 2018 IBM Corporation, Inc. and others.
 * All rights reserved. This program and the accompanying materials are made
 * available under the terms of the Eclipse Public License 2.0
 * (http://www.eclipse.org/legal/epl-v10.html), and the Eclipse Distribution
 * License v1.0 (http://www.eclipse.org/org/documents/edl-v10.html).
 *
 * Contributors:
 *     IBM Corporation - initial API and implementation
 ******************************************************************************/
/*eslint-env amd, mocha, browser*/
/* eslint-disable missing-nls */
define([
'js-tests/javascript/testingWorker',
'javascript/astManager',
'javascript/commands/openDeclaration',
'javascript/commands/openImplementation',
'javascript/cuProvider',
'chai/chai',
'orion/Deferred',
'mocha/mocha' //must stay at the end, not a module
], function(TestWorker, ASTManager, OpenDeclaration, OpenImplementation, CUProvider, chai, Deferred) {
	var assert = chai.assert;
	var openImplCommand;
	var openDeclCommand;
	var astManager = new ASTManager.ASTManager();
	var jsFile = 'tern_content_assist_test_script.js';
	var htmlFile = 'tern_content_assist_test_script.html';
	var timeoutReturn = ['Content assist timed out'];
	var worker;
	before("reset timeout", function(done) {
		worker = TestWorker.instance({delayedStart: true});
		this.timeout(20000);
		worker.start(done);
	});
	after("stop the worker", function() {
		if(worker) {
			worker.terminate();
		}
	});
	/**
	 * @description Sets up the test
	 * @param {Object} options The options the set up with
	 * @returns {Object} The object with the initialized values
	 */
	function setup(options) {
		var state = Object.create(null);
		var buffer = state.buffer = typeof options.buffer === 'undefined' ? '' : options.buffer;
		var offset = state.offset = typeof options.offset === 'undefined' ? 0 : options.offset;
		var line = state.line = typeof options.line === 'undefined' ? '' : options.line;
		var prefix = state.prefix = typeof options.prefix === 'undefined' ? '' : options.prefix;
		var contentType = options.contenttype ? options.contenttype : 'application/javascript';
		var	file = state.file = jsFile;
		if (contentType === 'text/html'){
			// Tern plug-ins don't have the content type, only the name of the file
			file = state.file = htmlFile;
		}
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

			getFileMetadata: function() {
			    var o = Object.create(null);
			    o.contentType = Object.create(null);
			    o.contentType.id = contentType;
			    o.location = file;
			    return new Deferred().resolve(o);
			},

			openEditor: function(file, options){
				this.file = file;
				this.options = options;
			}
		};
		astManager.onModelChanging({file: {location: file}});
		var params = {prefix: prefix, offset: offset, input: file, line: line, timeout: options.timeout ? options.timeout : 20000, timeoutReturn: timeoutReturn};
		return {
			editorContext: editorContext,
			params: params
		};
	}

	function testOpenDecl(options, expected) {
		var _p = setup(options);
		assert(_p, 'setup() should have completed normally');
		openDeclCommand.findDeclaration(_p.editorContext, _p.params).then(function (result) {
			try {
				if (!expected) {
					// We expect an error status as the result
					if (!result){
						// If no error was returned, check to see if we have results
						if (_p.editorContext.options){
							var actual = _p.editorContext.options;
							assert(false, 'Expected error status indicating no result, instead found result: ' + actual.start + '-' + actual.end);
						}
						assert(result, 'Expected error status indicating no result, instead result returned was ' + result);
					}
					worker.getTestState().callback();
					return;
				}
//				assert(_p.editorContext.options, "OpenEditor was not called on the editor context");
//				actual = _p.editorContext.options;
				//The command is executed in the platform and wrapped in a service call, so the editorContext.openEditor function
				//is not called until after the open decl command completes. Just test the results of the command now
				assert.equal(result.start, expected.start, 'The offset starts are not the same. Actual ' + result.start + '-' + result.end + ' Expected ' + expected.start + '-' + expected.end);
				assert.equal(result.end, expected.end, 'The offset ends are not the same. Actual ' + result.start + '-' + result.end + ' Expected ' + expected.start + '-' + expected.end);
				worker.getTestState().callback();
			} catch (err){
				worker.getTestState().callback(err);
			}
		}, function (error) {
			handleFailure(expected, error);
		});
	}

	function testOpenImpl(options, expected){
		var _p = setup(options);
		assert(_p, 'setup() should have completed normally');
		openImplCommand.execute(_p.editorContext, _p.params).then(function (result) {
			try {
				if (!expected) {
					// We expect an error status as the result
					if (!result){
						// If no error was returned, check to see if we have results
						if (_p.editorContext.options){
							var actual = _p.editorContext.options;
							assert(false, 'Expected error status indicating no result, instead found result: ' + actual.start + '-' + actual.end);
						}
						assert(result, 'Expected error status indicating no result, instead result returned was ' + result);
					}
					worker.getTestState().callback();
					return;
				}
				assert(_p.editorContext.options, "OpenEditor was not called on the editor context");
				actual = _p.editorContext.options;
				assert.equal(actual.start, expected.start, 'The offset starts are not the same. Actual ' + actual.start + '-' + actual.end + ' Expected ' + expected.start + '-' + expected.end);
				assert.equal(actual.end, expected.end, 'The offset ends are not the same. Actual ' + actual.start + '-' + actual.end + ' Expected ' + expected.start + '-' + expected.end);
				worker.getTestState().callback();
			} catch (err){
				worker.getTestState().callback(err);
			}
		}, function (error) {
			handleFailure(expected, error);
		});
	}
	
	function handleFailure(expected, error) {
		if (!expected) {
				if (error.Severity === "Warning") {
					worker.getTestState().callback();
					return;
				}
			} else if (typeof expected === 'string'){
				if (error.Message.indexOf(expected) >= 0){
					worker.getTestState().callback();
					return;
				}
			} else if (Array.isArray(expected)){
				for (var i=0; i<expected.length; i++) {
					var current = expected[i];
					var currentString = 'start='+current.start+',end='+current.end+')';
					if (error.Message.indexOf(currentString) < 0){
						worker.getTestState().callback(new Error('Expected potential match not found.\nExpected: ' + currentString + '\nMessage: ' + error.Message));
						return;
					}
				}
				var results = error.Message.split("\n*");
				if (results.length -1 > expected.length){
					worker.getTestState().callback(new Error('Expected fewer potential matches.\nExpected length: ' + expected.length + '\nMessage: ' + error.Message));
					return;
				}
				worker.getTestState().callback();
				return;
			}
			if(error instanceof Error || toString.call(error) === '[object Error]') {
				worker.getTestState().callback(error);
			} else if (expected){
				worker.getTestState().callback(new Error('Did not return a result when expected result was: ' + expected));
			} else if (error && error.Message) {
				worker.getTestState().callback(new Error('Unknown error.  Message: ' + error.Message));
			} else {
				worker.getTestState().callback(new Error('Unknown error'));
			}
	}

	describe('Tern based commands tests', function() {
		before('Message the server for warm up', function(done) {
			CUProvider.setUseCache(false);
			openImplCommand = new OpenImplementation.OpenImplementationCommand(worker);
			openDeclCommand = new OpenDeclaration.OpenDeclarationCommand(worker);
			worker.start(done, {options:{plugins:{node:{}, express:{}}}}); // Reset the tern server state to remove any prior files
		});
		this.timeout(10000);

		it('Open Declaration - No result', function(done) {
			var options = {
				buffer: "var a = 1; a = 2;",
				offset: 9,
				callback: done
			};
			testOpenDecl(options, null);
		});
		it('Open Implementation - No result', function(done) {
			var options = {
				buffer: "var a = 1; a = 2;",
				offset: 9,
				callback: done
			};
			testOpenImpl(options, null);
		});
		it('Open Declaration - Simple var 1', function(done) {
			var options = {
				buffer: "var a = 1; a = 2;",
				offset: 12,
				callback: done
			};
			testOpenDecl(options, {start: 4, end: 5});
		});
		it('Open Implementation - Simple var 1', function(done) {
			var options = {
				buffer: "var a = 1; a = 2;",
				offset: 12,
				callback: done
			};
			testOpenImpl(options, {start: 11, end: 12});
		});
		it('Open Declaration - Simple var 2', function(done) {
			var options = {
				buffer: "var a = 1; a = 2;",
				offset: 5,
				callback: done
			};
			testOpenDecl(options, {start: 4, end: 5});
		});
		it('Open Implementation - Simple var 2', function(done) {
			var options = {
				buffer: "var a = 1; a = 2;",
				offset: 5,
				callback: done
			};
			testOpenImpl(options, {start: 4, end: 5});
		});
		it('Open Declaration - Simple var 3', function(done) {
			var options = {
				buffer: "var a = 1; a = function(){}; a;",
				offset: 30,
				callback: done
			};
			testOpenDecl(options, {start: 4, end: 5});
		});
		it('Open Implementation - Simple var 3', function(done) {
			var options = {
				buffer: "var a = 1; a = function(){}; a;",
				offset: 30,
				callback: done
			};
			testOpenImpl(options, {start: 4, end: 5});
		});
		it('Open Declaration - Simple var 4', function(done) {
			var options = {
				buffer: "var a = function(){}; a = 1; a;",
				offset: 30,
				callback: done
			};
			testOpenDecl(options, {start: 4, end: 5});
		});
		it('Open Implementation - Simple var 4', function(done) {
			var options = {
				buffer: "var a = function(){}; a = 1; a;",
				offset: 30,
				callback: done
			};
			testOpenImpl(options, {start: 4, end: 5});
		});
		it('Open Declaration - Chained var 1 - Expression statement', function(done) {
			var options = {
				buffer: "var a = 1; var b = a; b;",
				offset: 22,
				callback: done
			};
			testOpenDecl(options, {start: 15, end: 16});
		});
		it('Open Implementation - Chained var 1 - Expression statement', function(done) {
			var options = {
				buffer: "var a = 1; var b = a; b;",
				offset: 22,
				callback: done
			};
			testOpenImpl(options, {start: 4, end: 5});
		});
		it('Open Declaration - Chained var 2 - Assignment expression', function(done) {
			var options = {
				buffer: "var a = 1; var b = a; b = 1;",
				offset: 22,
				callback: done
			};
			testOpenDecl(options, {start: 15, end: 16});
		});
		it('Open Implementation - Chained var 2 - Assignment expression', function(done) {
			var options = {
				buffer: "var a = 1; var b = a; b = 1;",
				offset: 22,
				callback: done
			};
			testOpenImpl(options, {start: 22, end: 23});
		});
		it('Open Declaration - Chained var 3 - Update expression', function(done) {
			var options = {
				buffer: "var a = 1; var b = a; b++;",
				offset: 22,
				callback: done
			};
			testOpenDecl(options, {start: 15, end: 16});
		});
		it('Open Implementation - Chained var 3 - Update expression', function(done) {
			var options = {
				buffer: "var a = 1; var b = a; b++;",
				offset: 22,
				callback: done
			};
			testOpenImpl(options, {start: 4, end: 5});
		});
		it('Open Declaration - Chained var 4', function(done) {
			var options = {
				buffer: "var a = 1; var b = a; var c = b; c;",
				offset: 33,
				callback: done
			};
			testOpenDecl(options, {start: 26, end: 27});
		});
		it('Open Implementation - Chained var 4', function(done) {
			var options = {
				buffer: "var a = 1; var b = a; var c = b; c;",
				offset: 33,
				callback: done
			};
			testOpenImpl(options, {start: 4, end: 5});
		});
		it('Open Declaration - Simple function declaration', function(done) {
			var options = {
				buffer: "function a(){ console.log('test'); }; a();",
				offset: 39,
				callback: done
			};
			testOpenDecl(options, {start: 9, end: 10});
		});
		/**
		 * @see https://bugs.eclipse.org/bugs/show_bug.cgi?id=505723
		 */
		it("Open decl - simple ThisExpression 1", function(done) {
			var options = {
				buffer: "function Foo() {this.baz = 10;} Foo.prototype.bar = function() {console.log(this.baz);};",
				offset: 17,
				callback: done
			};
			testOpenDecl(options, {start: 9, end: 12});
		});
		/**
		 * @see https://bugs.eclipse.org/bugs/show_bug.cgi?id=505723
		 */
		it("Open decl - simple ThisExpression 2", function(done) {
			var options = {
				buffer: "function Foo() {this.baz = 10;} Foo.prototype.bar = function() {console.log(this.baz);};",
				offset: 78,
				callback: done
			};
			testOpenDecl(options, {start: 9, end: 12});
		});
		/**
		 * @see https://bugs.eclipse.org/bugs/show_bug.cgi?id=505723
		 */
		it("Open decl - simple ThisExpression 3", function(done) {
			var options = {
				buffer: "function Bar() {} Bar.prototype.two = function() {[].forEach(function() {this.two = 2;}.bind(this));};",
				offset: 95,
				callback: done
			};
			testOpenDecl(options, {start: 9, end: 12});
		});
		/**
		 * @see https://bugs.eclipse.org/bugs/show_bug.cgi?id=505723
		 */
		it("Open decl - simple ThisExpression 4", function(done) {
			var options = {
				buffer: "function Bar() {} Bar.prototype.two = function() {[].forEach(function() {this.two = 2;}.bind(this));};",
				offset: 75,
				callback: done
			};
			testOpenDecl(options, {start: 9, end: 12});
		});
		/**
		 * @see https://bugs.eclipse.org/bugs/show_bug.cgi?id=505723
		 */
		it("Open decl - multi-nested ThisExpression 1", function(done) {
			var options = {
				buffer: "function Bar() {} Bar.prototype.two = function() {[].forEach(function() {[].forEach(function() {this.one = 1;}.bind(this));}.bind(this));};",
				offset: 117,
				callback: done
			};
			testOpenDecl(options, {start: 9, end: 12});
		});
		/**
		 * @see https://bugs.eclipse.org/bugs/show_bug.cgi?id=505723
		 */
		it("Open decl - multi-nested ThisExpression 2", function(done) {
			var options = {
				buffer: "function Bar() {} Bar.prototype.two = function() {[].forEach(function() {[].forEach(function() {this.one = 1;}.bind(this));}.bind(this));};",
				offset: 97,
				callback: done
			};
			testOpenDecl(options, {start: 9, end: 12});
		});
		it('Open Implementation - Simple function declaration', function(done) {
			var options = {
				buffer: "function a(){ console.log('test'); }; a();",
				offset: 39,
				callback: done
			};
			testOpenImpl(options, {start: 9, end: 10});
		});
		it('Open Declaration - Chained function declaration 1', function(done) {
			var options = {
				buffer: "function a(){ console.log('test'); }; var b = a; b();",
				offset: 50,
				callback: done
			};
			testOpenDecl(options, {start: 42, end: 43});
		});
		it('Open Implementation - Chained function declaration 1', function(done) {
			var options = {
				buffer: "function a(){ console.log('test'); }; var b = a; b();",
				offset: 50,
				callback: done
			};
			testOpenImpl(options, {start: 9, end: 10});
		});
		it('Open Declaration - Chained function declaration 2', function(done) {
			var options = {
				buffer: "function a(){ console.log('test'); }; var b = a; var c = b; c();",
				offset: 60,
				callback: done
			};
			testOpenDecl(options, {start: 53, end: 54});
		});
		it('Open Implementation - Chained function declaration 2', function(done) {
			var options = {
				buffer: "function a(){ console.log('test'); }; var b = a; var c = b; c();",
				offset: 60,
				callback: done
			};
			testOpenImpl(options, {start: 9, end: 10});
		});
		it('Open Declaration - Simple member expression', function(done) {
			var options = {
				buffer: "var a = {b: function(){ console.log('test'); } }; a.b;",
				offset: 52,
				callback: done
			};
			testOpenDecl(options, {start: 9, end: 10});
		});
		it('Open Implementation - Simple member expression', function(done) {
			var options = {
				buffer: "var a = {b: function(){ console.log('test'); } }; a.b;",
				offset: 52,
				callback: done
			};
			testOpenImpl(options, {start: 9, end: 10});
		});
		it('Open Declaration - Chained member expression 1', function(done) {
			var options = {
				buffer: "function f(){} var a={}; a.b = f; a.b();",
				offset: 36,
				callback: done
			};
			testOpenDecl(options, {start: 27, end: 28});
		});
		it('Open Implementation - Chained member expression 1', function(done) {
			var options = {
				buffer: "function f(){} var a={}; a.b = f; a.b();",
				offset: 36,
				callback: done
			};
			testOpenImpl(options, {start: 9, end: 10});
		});
		it('Open Declaration - Chained member expression 2', function(done) {
			var options = {
				buffer: "function f(){} var a={}; a.b = {}; a.b.c = f; a.b.c();",
				offset: 50,
				callback: done
			};
			testOpenDecl(options, {start: 39, end: 40});
		});
		it('Open Implementation - Chained member expression 2', function(done) {
			var options = {
				buffer: "function f(){} var a={}; a.b = {}; a.b.c = f; a.b.c();",
				offset: 50,
				callback: done
			};
			testOpenImpl(options, {start: 9, end: 10});
		});
		it('Open Declaration - Chained member expression with member selected', function(done) {
			var options = {
				buffer: "function f(){} var a={}; a.b = f; a.b();",
				offset: 34,
				callback: done
			};
			testOpenDecl(options, {start: 19, end: 20});
		});
		it('Open Implementation - Chained member expression with member selected', function(done) {
			var options = {
				buffer: "function f(){} var a={}; a.b = f; a.b();",
				offset: 34,
				callback: done
			};
			testOpenImpl(options, {start: 21, end: 23});
		});
		it('Open Declaration - Multiple implementation member expression 1', function(done) {
			var options = {
				buffer: "function f(){} var a={b: function(){}}; a.b = f; a.b();",
				offset: 52,
				callback: done
			};
			testOpenDecl(options, {start: 22, end: 23});
		});
		it('Open Implementation - Multiple implementation member expression 1', function(done) {
			var options = {
				buffer: "function f(){} var a={b: function(){}}; a.b = f; a.b();",
				offset: 52,
				callback: done
			};
			testOpenImpl(options, {start: 22, end: 23});
		});
		it('Open Declaration - Multiple implementation member expression 2', function(done) {
			// Tern will always return the object expression over the assignment
			var options = {
				buffer: "function f(){} var a = {}; a.b = 1; a.b = function(){}; a.b();",
				offset: 59,
				callback: done
			};
			testOpenDecl(options, {start: 29, end: 30});
		});
		it('Open Implementation - Multiple implementation member expression 2', function(done) {
			// Tern will always return the object expression over the assignment
			var options = {
				buffer: "function f(){} var a = {}; a.b = 1; a.b = function(){}; a.b();",
				offset: 59,
				callback: done
			};
			testOpenImpl(options, {start: 29, end: 30});
		});
		it('Open Declaration - Chained call expression', function(done) {
			var options = {
				buffer: "var a = {b: function(){ console.log('test'); } }; var c = a.b; c();",
				offset: 63,
				callback: done
			};
			testOpenDecl(options, {start: 54, end: 55});
		});
		it('Open Implementation - Chained call expression', function(done) {
			var options = {
				buffer: "var a = {b: function(){ console.log('test'); } }; var c = a.b; c();",
				offset: 63,
				callback: done
			};
			testOpenImpl(options, {start: 9, end: 10});
		});
		it('Open Declaration - Simple object property', function(done) {
			var options = {
				buffer: "var o = {one: 1}; o.one++;",
				offset: 22,
				callback: done
			};
			testOpenDecl(options, {start: 9, end: 12});
		});
		it('Open Implementation - Simple object property', function(done) {
			var options = {
				buffer: "var o = {one: 1}; o.one++;",
				offset: 22,
				callback: done
			};
			testOpenImpl(options, {start: 9, end: 12});
		});
		it('Open Declaration - Object property with function value', function(done) {
			var options = {
				buffer: "function f(){} var o = {one: f}; o.one();",
				offset: 37,
				callback: done
			};
			testOpenDecl(options, {start: 24, end: 27});
		});
		it('Open Implementation - Object property with function value', function(done) {
			var options = {
				buffer: "function f(){} var o = {one: f}; o.one();",
				offset: 37,
				callback: done
			};
			testOpenImpl(options, {start: 9, end: 10});
		});
		it('Open Declaration - Chained object property', function(done) {
			var options = {
				buffer: "function f(){} function g() {return {ff: f}} g().ff();",
				offset: 51,
				callback: done
			};
			testOpenDecl(options, {start: 37, end: 39});
		});
		it('Open Implementation - Chained object property', function(done) {
			var options = {
				buffer: "function f(){} function g() {return {ff: f}} g().ff();",
				offset: 51,
				callback: done
			};
			testOpenImpl(options, {start: 9, end: 10});
		});
		// Possible Tern bug, for binary expressions, findDef returns an Object with no start/end information
		it('Open Declaration - Binary expression', function(done) {
			var options = {
				buffer: "function f(){} var a = f !== null; a;",
				offset: 35,
				callback: done
			};
			testOpenDecl(options, {start: 19, end: 20});
		});
		it('Open Implementation - Binary expression', function(done) {
			var options = {
				buffer: "function f(){} var a = f !== null; a;",
				offset: 35,
				callback: done
			};
			testOpenImpl(options, {start: 19, end: 20});
		});
		it('Open Declaration - Unary expression', function(done) {
			var options = {
				buffer: "function f(){} var a = !f; a;",
				offset: 27,
				callback: done
			};
			testOpenDecl(options, {start: 19, end: 20});
		});
		it('Open Implementation - Unary expression', function(done) {
			var options = {
				buffer: "function f(){} var a = !f; a;",
				offset: 27,
				callback: done
			};
			testOpenImpl(options, {start: 19, end: 20});
		});
		it('Open Declaration - Indexed declaration', function(done) {
			var options = {
				buffer: "/* eslint-env express */\nvar app = new express(); express.static(); app.use();",
				offset: 62,
				callback: done
			};
			testOpenDecl(options, 'express');
		});
		it('Open Implementation - Indexed declaration', function(done) {
			var options = {
				buffer: "/* eslint-env express */\nvar app = new express(); express.static(); app.use();",
				offset: 62,
				callback: done
			};
			testOpenImpl(options, 'express');
		});
		it('Open Declaration - Indexed declaration 2', function(done) {
			var options = {
				buffer: "/* eslint-env express */\nvar app = new express(); express.static(); app.use();",
				offset: 75,
				callback: done
			};
			testOpenDecl(options, 'express');
		});
		it('Open Implementation - Indexed declaration 2', function(done) {
			var options = {
				buffer: "/* eslint-env express */\nvar app = new express(); express.static(); app.use();",
				offset: 75,
				callback: done
			};
			testOpenImpl(options, 'express');
		});
		it('Open Declaration - Bogus function expression', function(done) {
			var options = {
				buffer: "bogusFcnExp();",
				offset: 6,
				callback: done
			};
			testOpenDecl(options, 'Could not find declaration');
		});
		it('Open Implementation - Bogus function expression', function(done) {
			var options = {
				buffer: "bogusFcnExp();",
				offset: 6,
				callback: done
			};
			testOpenImpl(options, 'No implementation was found');
		});
		it('Open Declaration - Declaring node selected', function(done) {
			var options = {
				buffer: "var a = function(){};",
				offset: 5,
				callback: done
			};
			testOpenDecl(options, {start: 4, end: 5});
		});
		it('Open Implementation - Declaring node selected', function(done) {
			var options = {
				buffer: "var a = function(){};",
				offset: 5,
				callback: done
			};
			testOpenImpl(options, {start: 4, end: 5});
		});
		it('Open Declaration - Multiple matches with Tern didGuess() === true', function(done) {
			var options = {
				buffer: "var a = {x: function() {}}; var b = {x: function() {}}; function test(z){ return z.x() }",
				offset: 84,
				callback: done
			};
			testOpenDecl(options, [{start: 9, end: 10}, {start: 37, end: 38}]);
		});
		// TODO Open implementation does not handle guessing, it chooses the first result
		it.skip('Open Implementation -  Multiple matches with Tern didGuess() === true', function(done) {
			var options = {
				buffer: "var a = {x: function() {}}; var b = {x: function() {}}; function test(z){ return z.x() }",
				offset: 84,
				callback: done
			};
			testOpenImpl(options, [{start: 9, end: 10}, {start: 37, end: 38}]);
		});
	});
});
