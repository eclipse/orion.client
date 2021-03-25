/*******************************************************************************
 * @license
 * Copyright (c) 2016, 2018 IBM Corporation and others.
 * All rights reserved. This program and the accompanying materials are made 
 * available under the terms of the Eclipse Public License 2.0 
 * (http://www.eclipse.org/legal/epl-v10.html), and the Eclipse Distribution 
 * License v1.0 (http://www.eclipse.org/org/documents/edl-v10.html).
 *
 * Contributors:
 *	 IBM Corporation - initial API and implementation
 ******************************************************************************/
/*eslint-env amd, mocha*/
/* eslint-disable  missing-nls */
define([
	'javascript/quickFixes',
	'javascript/validator',
	'chai/chai',
	'orion/Deferred',
	'javascript/astManager',
	'javascript/cuProvider',
	'javascript/commands/renameCommand',
	'javascript/commands/generateDocCommand',
	'orion/serviceregistry',
	'javascript/javascriptProject',
	'mocha/mocha', //must stay at the end, not a module
], function(QuickFixes, Validator, chai, Deferred, ASTManager, CUProvider, RenameCommand, GenerateDocCommand, mServiceRegistry, JSProject) {
	var assert = chai.assert;
	
	return function(worker) {
		describe('ES6 Quick Fix Tests',function() {
			this.timeout(10000);
			before('Reset Tern Server', function(done) {
				worker.start(done,  {options:{ecmaVersion:6, sourceType:"module"}});
			});
			
			/**
			 * @description Sets up the test
			 * 
			 * Supported options include:
			 * -    `buffer` - the source to process
			 * -    `contentType` - the content type to load, defaults to application/javascript if not specified
			 * -    `callback` - the 'done' param from the tests, its required for all worker-based tests
			 * -    `rule` - the rule object. {@link #createTestRule(...)}
			 * -    `expected` - the array of expected fixes
			 * -    `fixid` - the id of the rule to use if not the same as the one created by default - allows testing multifixes
			 * @param {Object} options {buffer, contentType}
			 * @returns {Object} The object with the initialized values
			 */
			function setup(options) {
				var buffer = options.buffer;
				var contentType = options.contentType ? options.contentType : 'application/javascript';
				var astManager = new ASTManager.ASTManager();
				var serviceRegistry = new mServiceRegistry.ServiceRegistry();
				var validator = new Validator(worker);
				var state = Object.create(null);
				var loc = contentType === 'text/html' ? 'es6quickfix_test_script.html' : 'es6quickfix_test_script.js';
				assert(options.callback, "You must provide a callback for a worker-based test");
				state.callback = options.callback;
				worker.setTestState(state);
				var rule = options.rule;
				validator._enableOnly(rule.id, rule.severity, rule.opts);
				var renameCommand = new RenameCommand.RenameCommand(worker, {setSearchLocation: function(){}});
				var generateDocCommand = new GenerateDocCommand.GenerateDocCommand(astManager, CUProvider);
				var fixComputer = new QuickFixes.JavaScriptQuickfixes(astManager, renameCommand, generateDocCommand, new JSProject(serviceRegistry), worker);
				var editorContext = {
					/*override*/
					getText: function(start, end) {
						if(typeof start === 'undefined' && typeof end === 'undefined') {
							return new Deferred().resolve(buffer);
						}
						return new Deferred().resolve(buffer.slice(start, end));
					},
					
					setText: function(text, start, end) {
						return new Deferred().resolve(assertFixes(text, start, end, options.expected));
					},
					
					getSelections: function(){
						return new Deferred().resolve([]);
					},
					
					getFileMetadata:function() {
						var o = Object.create(null);
						o.contentType = Object.create(null);
						o.contentType.id = contentType;
						o.location = loc;
						return new Deferred().resolve(o);
					},
					exitLinkedMode: function() {
						return new Deferred().resolve();
					},
					enterLinkedMode: function(linkModel) {
						return new Deferred().resolve(assertLinkedModel(linkModel, options.expected));
					},
					setCaretOffset: function(caretOffset) {
						return new Deferred().resolve(caretOffset);
					},
					openEditor: function(file, opts){
						return new Deferred().resolve(assertFixes({file: file, start: opts.start, end: opts.end}, null, null, options.expected));
					}
				};
				return {
					validator: validator,
					fixComputer: fixComputer,
					editorContext: editorContext,
					contentType: contentType,
					loc: loc
				};
			}
		
			/**
			 * @callback from Mocha after each test run
			 */
			afterEach(function() {
				CUProvider.onModelChanging({file: {location: 'es6quickfix_test_script.js'}});
				CUProvider.onModelChanging({file: {location: 'es6quickfix_test_script.html'}});
			});
		
			/**
			 * @description Checks the state of the linked models
			 * @param {Object} linkedModel The linked model from the platform
			 * @param {Object} expected The expected linked model from the test
			 * @since 11.0
			 */
			function assertLinkedModel(linkedModel, expected) {
				try {
					assert(expected, "There must be an expected linkedModel");
					assert(expected.groups, "There must be a groups node in the expected linked model");
					assert(Array.isArray(expected.groups), "Groups must be an array in the expected linked model");
					assert(linkedModel, "There must be a linkedModel");
					assert(linkedModel.groups, "There must be a groups node in the linked model");
					assert(Array.isArray(linkedModel.groups), "Groups must be an array in the linked model");
					assert.equal(linkedModel.groups.length, expected.groups.length, "The linked mode groups should be the same length");
					expected.groups.forEach(function(group, index) {
						//groups have data and positions: [{offset, length}]
						var g = linkedModel.groups[index];
						assert.equal(typeof g.data, typeof group.data, "The type of the data of the groups is not the same");
						assert(Array.isArray(g.positions), "There should be a positions array");
						assert(Array.isArray(group.positions), "There must be an expected positions array");
						assert.equal(g.positions.length, group.positions.length, "The position arrays should be the same size");
						group.positions.forEach(function(pos, index2) {
							var p = g.positions[index2];
							assert(p, "There should be a position");
							assert.equal(p.offset, pos.offset, "The position offsets do not match");
							assert.equal(p.length, pos.length, "The position lengths do not match");
						});
					});
				}
				catch(err) {
					worker.getTestState().callback(err);
				}
			}
		
			/**
			 * @description Runs the validator on the given options and computes fixes for those problems
			 * @param {Object} options {buffer, contentType, rule}
			 * @returns {orion.Promise} The validation promise
			 */
			function getFixes(options) {
				var obj = setup(options);
				return obj.validator.computeProblems(obj.editorContext, {contentType: obj.contentType, rule: options.rule}).then(
					function(problems) {
						try {
							var pbs = problems.problems;
							var annot = pbs[0];
							if(options.pid) {
								for(var i = 0; i < pbs.length; i++) {
									if(pbs[i].id === options.pid) {
										annot = pbs[i];
										break;
									}
								}
								assert(i !== pbs.length, "Did not find any problems for the expected id: "+ options.pid);
							} else {
								assert(pbs, "There should always be problems");
								// Some quick fixes may provide multiple expected text edits per problem
								if (!Array.isArray(options.expected)){
									assert.equal(pbs.length, 1, 'Expected only one problem per test');
								}
								assert(annot.id, "No problem id is reported");
								assert(annot.id.indexOf(options.rule.id) === 0, "The problem id should start with the enabled rule id");
							}
							annot.title = annot.description;
							if(options.fixid) {
								annot.fixid = options.fixid;
							}
							var annotations;
							if (Array.isArray(options.expected)){
								annotations = pbs;
								for (i=0; i<annotations.length; i++) {
									annotations[i].title = annotations[i].description;
								}
							}
							return obj.fixComputer.execute(obj.editorContext, {annotation: annot, annotations: annotations, input: obj.loc}).then(function() {
									worker.getTestState().callback();
								},
								function(err) {
									if(err instanceof Error) {
										worker.getTestState().callback(err);
									} else if(typeof err.Message === 'string') {
										worker.getTestState().callback(err.Message);
									} else {
										worker.getTestState().callback("Test rejected with unknown error");
									}
								});
						}
						catch(err) {
							worker.getTestState().callback(err);
						}
					},
					function (error) {
							worker.getTestState().callback(error);
					});
			}
		
			/**
			 * @description Compares the computed fixes set against the expected ones
			 * @param {Array.<orion.Fix>} computed The computed set of fixes
			 * @param {Array.<Object>} expected The expected set of fixes
			 */
			function assertFixes(computed, start, end, expected) {
				try {
					assert(computed !== null && typeof computed !== 'undefined', 'There should be fixes');
					if (Array.isArray(expected)){
						assert(Array.isArray(computed.text), "Expected multiple quick fix text edits");
						assert(Array.isArray(computed.selection), "Expected multiple quick fix selections");
						assert.equal(computed.text.length, expected.length, "Wrong number of quick fix text edits");
						assert.equal(computed.selection.length, expected.length, "Wrong number of quick fix selections");
						for (var i=0; i<expected.length; i++) {
							assert(computed.text[i] === expected[i].value, 'The fix: \"'+computed.text[i]+'\" does not match the expected fix of: \"'+expected[i].value + '\"');
							assert.equal(computed.selection[i].start, expected[i].start, 'The fix starts do not match');
							assert.equal(computed.selection[i].end, expected[i].end, 'The fix ends do not match');
						}
					} else if (typeof computed === 'object' && computed.file && expected.file){
						assert.equal(computed.file, expected.file, 'Navigation fix found but to wrong file.\nExpected: ' + expected.file +  ' (' + expected.start + ',' + expected.end + ')\nActual: ' + computed.file +  ' (' + computed.start + ',' + computed.end + ')');
						assert.equal(computed.start, expected.start, 'Navigation fix found but to wrong start.\nExpected: ' + expected.file +  ' (' + expected.start + ',' + expected.end + ')\nActual: ' + computed.file +  ' (' + computed.start + ',' + computed.end + ')');
						assert.equal(computed.end, expected.end, 'Navigation fix found but to wrong end.\nExpected: ' + expected.file +  ' (' + expected.start + ',' + expected.end + ')\nActual: ' + computed.file +  ' (' + computed.start + ',' + computed.end + ')');
					} else if (typeof computed === 'object' && Array.isArray(computed.text)){
						assert.equal(computed.text.length, 1, 'Was expecting one quick fix text edit');
						assert.equal(computed.selection.length, 1, 'Was expected one quick fix selection range');
						assert(computed.text[0].indexOf(expected.value) > -1, 'The fix: \"'+computed.text[0]+'\"" does not match the expected fix of: '+expected.value);
						assert.equal(computed.selection[0].start, expected.start, 'The fix starts do not match');
						assert.equal(computed.selection[0].end, expected.end, 'The fix ends do not match');
					} else {
						assert(computed.indexOf(expected.value) > -1, 'The fix: '+computed+' does not match the expected fix of: '+expected.value);
						assert.equal(start, expected.start, 'The fix starts do not match');
						assert.equal(end, expected.end, 'The fix ends do not match');
					}
				}
				catch(err) {
					worker.getTestState().callback(err);
				}
			}

			/**
			 * @description Creates a test rule object for the test set up
			 * @param {String} id The id of the rule used to update the preferences in javascript/validator#updated
			 * @param {Number} severity The severity of the problem or null (which defaults to '2')
			 * @param {String} opts The optional args for a rule. For example no-missing-doc has 'decl' and 'expr' as optional args
			 * @returns {Object} Returns a new rule object for testing with
			 */
			function createTestRule(id, severity, opts) {
				var rule = Object.create(null);
				rule.id = id;
				rule.severity = severity ? severity : 2;
				rule.opts = opts;
				return rule;
			}
			//MISSING-DOC
			describe("missing-doc", function() {
				it("export named declaration", function(done) {
					var rule = createTestRule("missing-doc");
					var expected = {
						value: "/**\n"+
								" * @name myFunc\n"+
								" * @description description\n"+
								" * @returns returns\n"+
								" */\n",
						start: 21,
						end: 21
					};
					getFixes({
						buffer: "var MYCONSTANT = \"\";\nexport function myFunc() { return MYCONSTANT; }",
						rule: rule,
						expected: expected,
						callback: done
					});
				});
			});
			//NO-UNUSED-VARS-UNUSED
			describe("no-unused-vars-unused", function() {
				it("Test no-unused-vars-unused ClassDeclaration", function(done) {
					var rule = createTestRule('no-unused-vars');
					var expected = {
						value: "",
						start: 0,
						end: 12
					};
					getFixes({buffer: "class Foo {}",
							rule: rule,
							expected: expected,
							callback: done,
							pid: "no-unused-vars-unused"
						});
				});
			});
			//NO-UNUSED-VARS-UNREAD
			describe("no-unused-vars-unread", function() {
				it("Test no-unused-vars-unread-list-matching-1",function(callback) {
					var rule = createTestRule('no-unused-vars');
					var expected = {value: "",
									start: 0, 
									end: 12};
					getFixes({buffer: 'var [a] = 4;', 
									  rule: rule,
									  expected: expected,
									  callback: callback,
									  pid: 'no-unused-vars-unread'});
				});
				it("Test no-unused-vars-unread-list-matching-2",function(callback) {
					var rule = createTestRule('no-unused-vars');
					var expected = {value: "",
									start: 5, 
									end: 6};
					getFixes({buffer: 'var [d, , b] = [1, 2, 3]; console.log(b);', 
									  rule: rule,
									  expected: expected,
									  callback: callback,
									  pid: 'no-unused-vars-unread'});
				});
				it("Test no-unused-vars-unread-object-pattern-matching-1",function(callback) {
					var rule = createTestRule('no-unused-vars');
					var expected = {value: "",
									start: 5, 
									end: 9};
					getFixes({buffer: 'var {op, lhs, rhs} = () => {}; console.log(lhs);console.log(rhs);', 
									  rule: rule,
									  expected: expected,
									  callback: callback,
									  pid: 'no-unused-vars-unread'});
				});
				it("Test no-unused-vars-unread-object-pattern-matching-2",function(callback) {
					var rule = createTestRule('no-unused-vars');
					var expected = {value: "",
									start: 77, 
									end: 96};
					getFixes({buffer: 
											"/*eslint-env browser */\n" +
											"function f() {\n" +
											"	var {\n" +
											"		first: first,\n" +
											"		second: {\n" +
											"			second: second,\n" +
											"			something: {\n" +
											"				last: last\n" +
											"			}\n" +
											"		}\n" +
											"	} = getSomething();\n" +
											"	console.log(first);\n" +
											"	console.log(last);\n" +
											"}\n" +
											"f();", 
									  rule: rule,
									  expected: expected,
									  callback: callback,
									  pid: 'no-unused-vars-unread'});
				});
				it("Test no-unused-vars-unread-object-pattern-matching-3",function(callback) {
					var rule = createTestRule('no-unused-vars');
					var expected = {value: "",
									start: 40,
									end: 81};
					getFixes({buffer: 
											"/*eslint-env browser */\n" +
											"function f() {\n" +
											"	var {\n" +
											"		first: first\n" +
											"	} = getSomething();\n" +
											"}\n" +
											"f();", 
									  rule: rule,
									  expected: expected,
									  callback: callback,
									  pid: 'no-unused-vars-unread'});
				});
			});
			//Quotes
			describe("quotes", function() {
				it("Test quotes",function(callback) {
					var rule = createTestRule('quotes');
					var expected = {value: "\"this is a template literal\"",
									start: 15,
									end: 43};
					getFixes({buffer: 'var backtick = `this is a template literal`;', 
									  rule: rule,
									  expected: expected,
									  callback: callback,
									  pid: 'quotes'});
				});
			});
		});
	};
});
