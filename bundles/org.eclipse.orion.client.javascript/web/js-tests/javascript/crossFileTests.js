/*******************************************************************************
 * @license
 * Copyright (c) 2015, 2016 IBM Corporation, Inc. and others.
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
'javascript/contentAssist/ternAssist',
'javascript/astManager',
'javascript/cuProvider',
'chai/chai',
'orion/Deferred',
'mocha/mocha' //must stay at the end, not a module
], function(TernAssist, ASTManager, CUProvider, chai, Deferred) {
	var assert = chai.assert;

	return function(worker) {
		var assist;
		var envs = Object.create(null);
		var astManager = new ASTManager.ASTManager();
		var timeoutReturn = ['Content assist operation timed out'];
		var jsFile = 'tern_crossfile_test_script.js';
		var htmlFile = 'tern_crossfile_test_script.html';
		
		/**
		 * @description Sets up the test
		 * @param {Object} options The options the set up with
		 * @returns {Object} The object with the initialized values
		 */
		function setup(options) {
			var state = Object.create(null);
			var buffer = state.buffer = typeof options.buffer === 'undefined' ? '' : options.buffer,
			    prefix = state.prefix = typeof options.prefix === 'undefined' ? '' : options.prefix,
			    offset = state.offset = typeof options.offset === 'undefined' ? 0 : options.offset,
			    line = state.line = typeof options.line === 'undefined' ? '' : options.line,
			    keywords = typeof options.keywords === 'undefined' ? false : options.keywords,
			    templates = typeof options.templates === 'undefined' ? false : options.templates,
			    timeout = 5000,
			    guess = typeof options.guess !== 'boolean' ? true : options.guess; //default to true, backwards compat
			
			assert(options.callback, 'You must provide a test callback for worker-based tests');
			state.callback = options.callback;
				
			var contentType = options.contentType ? options.contentType : 'application/javascript';
			var	file = state.file = jsFile;				
			if (contentType === 'text/html'){
				// Tern plug-ins don't have the content type, only the name of the file
				file = state.file = htmlFile;
			}				
				
			worker.setTestState(state);
			envs = typeof options.env === 'object' ? options.env : Object.create(null);
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
			var params = {guess: guess, offset: offset, prefix : prefix, keywords: keywords, template: templates, line: line, timeout: timeout, timeoutReturn: timeoutReturn};
			return {
				editorContext: editorContext,
				params: params,
				file: file,
				buffer: buffer
			};
		} 
	
		/**
		 * @description Pretty-prints the given array of proposal objects
		 * @param {Array} expectedProposals The array of proposals
		 * @returns {String} The pretty-printed proposals
		 */
		function stringifyExpected(expectedProposals) {
			var text = "";
			for (var i = 0; i < expectedProposals.length; i++)  {
				text += expectedProposals[i][0] + " : " + expectedProposals[i][1] + "\n";
			}
			return text;
		}
		/**
		 * The object of providers to create Tern worker messages
		 */
		var messageProviders = {
			'completions': function(type, _setup) {
				var msg = _initMessage(type);
				assert(_setup.file, 'You must specify a file for the completions message');
				msg.args.meta.location = _setup.file;
				if(typeof _setup.params.keywords === 'undefined') {
			    	msg.args.params.keywords = _setup.params.keywords;
			    }
			    assert(typeof _setup.params.offset === 'number', 'You have to specify an offset for a completion message');
			    msg.args.params.offset = _setup.params.offset;
			    assert(typeof _setup.buffer === 'string', 'You must provide a buffer for the completion');
			    msg.args.files.push({type: 'full', name: _setup.file, text: _setup.buffer});
				return msg;
			},
			'definition': function(type, _setup) {
				var msg = _initMessage(type);
				assert(_setup.file, 'You must specify a file for the definition message');
				msg.args.meta.location = _setup.file;
				assert(typeof _setup.params.offset === 'number', 'You have to specify an offset for a definition message');
			    msg.args.params.offset = _setup.params.offset;
			    assert(typeof _setup.buffer === 'string', 'You must provide a buffer for the completion');
			    msg.args.files.push({type: 'full', name: _setup.file, text: _setup.buffer});
			    msg.args.guess = _setup.params.guess;
				return msg;
			},
			'documentation': function(type, _setup) {
				var msg = _initMessage(type);
				assert(_setup.file, 'You must specify a file for the documentation message');
				msg.args.meta.location = _setup.file;
				assert(typeof _setup.params.offset === 'number', 'You have to specify an offset for a documentation message');
			    msg.args.params.offset = _setup.params.offset;
			    assert(typeof _setup.buffer === 'string', 'You must provide a buffer for the completion');
			    msg.args.files.push({type: 'full', name: _setup.file, text: _setup.buffer});
				return msg;
			},
			'implementation': function(type, _setup) {
				var msg = _initMessage(type);
				assert(_setup.file, 'You must specify a file for the implementation message');
				msg.args.meta.location = _setup.file;
				assert(typeof _setup.params.offset === 'number', 'You have to specify an offset for an implementation message');
			    msg.args.params.offset = _setup.params.offset;
			    assert(typeof _setup.buffer === 'string', 'You must provide a buffer for the implementation');
			    msg.args.files.push({type: 'full', name: _setup.file, text: _setup.buffer});
			    msg.args.guess = _setup.params.guess;
				return msg;
			}
		};
		
		/**
		 * @description Create an empty message - they all carry the same form
		 * @private
		 * @param {String} type The message type, one of: completions, definition, documentation, implementation
		 * @returns {Object} A new empty message object
		 */
		function _initMessage(type) {
			var msg = Object.create(null);
			msg.request = type;
			msg.args = Object.create(null);
			msg.args.params = Object.create(null);
			msg.args.meta = Object.create(null);
			msg.args.envs = Object.create(null);
			msg.args.files = [];
			return msg;
		}
		
		/**
		 * @description Utility to create a Tern worker message
		 * @private
		 * @param {String} type The message type, one of: completions, definition, documentation, implementation
		 * @param {Object} options The map of options
		 * @returns {Object} The message object to send to Tern
		 */
		function message(type, options) {
			var p = messageProviders[type];
			assert(p, 'There is no message provider for: '+type);
			return p(type, options);
		}
	
		describe("Cross-file Tests", function() {
			this.timeout(200000);
			before('Message the server for warm up on cross file tests', function(done) {
				CUProvider.setUseCache(false);
				assist = new TernAssist.TernContentAssist(astManager, worker, function() {
					return new Deferred().resolve(envs);
				}, CUProvider);
				worker.start(done, {options: {plugins: {es_modules: {}, node: {}, requirejs: {}}}}); // Reset the tern server state to remove any prior files
			});
			describe("Content assist tests", function() {
				/**
				 * @description Checks the proposals returned from the given proposal promise against
				 * the array of given proposals
				 * @param {Object} options The options to test with
				 * @param {Array} expectedProposals The array of expected proposal objects
				 */
				function testProposals(options, expectedProposals) {
					var _p = setup(options);
					assert(_p, 'setup() should have completed normally');
					assist.computeContentAssist(_p.editorContext, _p.params).then(function (actualProposals) {
						assert(actualProposals, "Error during content assist, undefined returned");
						if (actualProposals === timeoutReturn){
							assert(false, "The content assist operation timed out");
						}
						_compareProposals(actualProposals, expectedProposals);
					}, function (error) {
						worker.getTestState().callback(error);
					});
				}
				
				/**
				 * @description Tests the proposals message directly to the worker without using the TernAssist class
				 * @param {Object} options The map of options
				 * @param {Array.<object>} expected The expected array of proposals
				 */
				function testDirectProposals(options, expected) {
					var _p = setup(options);
					assert(_p, 'setup() should have completed normally');
					worker.postMessage(message('completions', _p), function(response) {
						try {
							assert(response, 'There was no response from the worker');
							assert(!response.error, 'Tern returned an error response: ' + response.error);
							var actual = response.proposals;
							assert(Array.isArray(actual), 'There were no proposals returned');
							//_compareProposals(actual, expected);
							options.callback(); //TODO remove this once the real tests are running
						}
						catch(err) {
							worker.getTestState().callback(err);
						}
					});
				}
			
				/**
				 * @description Compares the given arrays of proposals
				 * @private
				 * @param {Array.<Object>} actualProposals The proposals returned from the service
				 * @param {Array.<Object>} expectedProposals The proposals we are expecting to get
				 */
				function _compareProposals(actualProposals, expectedProposals) {
					try {
						assert.equal(actualProposals.length, expectedProposals.length,
							"Wrong number of proposals.  Expected:\n" + stringifyExpected(expectedProposals) +"\nActual:\n" + stringifyActual(actualProposals));
						for (var i = 0; i < actualProposals.length; i++) {
						    var ap = actualProposals[i];
						    var ep = expectedProposals[i];
							var text = ep[0];
							var description = ep[1];
							assert.equal(ap.proposal, text, "Invalid proposal text"); //$NON-NLS-0$
							if (description) {
								if (ap.name) {
									assert.equal(ap.name + ap.description, description, "Invalid proposal description"); //$NON-NLS-0$
								} else {
									assert.equal(ap.description, description, "Invalid proposal description"); //$NON-NLS-0$
								}
							}
							if(expectedProposals[i].length === 3 && !ap.unselectable /*headers have no hover*/) {
							    //check for doc hover
							    assert(ap.hover, 'There should be a hover entry for the proposal');
							    assert(ap.hover.indexOf(ep[2]) === 0, "The doc should have started with the given value");
							}
						}
						worker.getTestState().callback();
					}
					catch(err) {
						worker.getTestState().callback(err);
					}
				}
				
				/**
				 * @description Pretty-prints the given array of proposal objects
				 * @param {Array} expectedProposals The array of proposals
				 * @returns {String} The pretty-printed proposals
				 */
				function stringifyActual(actualProposals) {
					var text = "";
					for (var i = 0; i < actualProposals.length; i++) {
						if (actualProposals[i].name) {
							text += actualProposals[i].proposal + " : " + actualProposals[i].name + actualProposals[i].description + "\n"; //$NON-NLS-1$ //$NON-NLS-0$
						} else {
							text += actualProposals[i].proposal + " : " + actualProposals[i].description + "\n"; //$NON-NLS-1$ //$NON-NLS-0$
						}
					}
					return text;
				}
			
				it.skip("Simple require'd dep 1", function(done) {
					var options = {
						buffer: "/* eslint-env amd */define(['./files/require_dep1'], function(rd1) {rd1.m});",
						offset: 73,
						prefix: "m",
						callback: done,
						timeout: 20000
					};
					// TODO Implement me
					done();
					return testProposals(options, [
						["", "files/require_dep1.js"],
						["myfunc", "myfunc"],
						["variable", "variable"]
					]);
				});
				it.skip("Simple direct require'd dep 1", function(done) {
					var options = {
						buffer: "/* eslint-env amd */define(['./files/require_dep1'], function(rd1) {rd1.m});",
						offset: 73,
						prefix: "m",
						callback: done,
						timeout: 20000
					};
					// TODO Implement me
					done();
					 return testDirectProposals(options, [
						["", "files/require_dep1.js"],
						["myfunc", "myfunc"],
						["variable", "variable"]
					]);
				});
				it("Simple HTML pre-load dep 1");
			});
			describe("Open declaration tests", function() {
				it("Simple pre-load dep 1");
				it("Simple HTML pre-load dep 1");
			});
			describe("Hover tests", function() {
				it("Simple pre-load dep 1");
				it("Simple HTML pre-load dep 1");
			});
			describe("Open implementation tests", function() {
				/**
				 * @description Tests the result of sending the implementation request directly to Tern
				 * @since 10.0
				 */
				function testDirectImplementation(options, expected) {
					var _p = setup(options);
					assert(_p, 'setup() should have completed normally');
					worker.postMessage(message('implementation', _p), function(response) {
						assert(response, 'There was no response from the worker');
						assert(!response.error, 'Tern returned an error response: ' + response.error);
						var actual = response.implementation;
						assert(actual, 'There was no implementation returned');
						_compareImpls(actual, expected);
					});
				}
				
				/**
				 * @description Compares the actual file (from Tern response) to the given file name.
				 * @private
				 * @param {String} actual The actual file from the Tern response
				 * @param {String} expected The name of the file to compare to. This name is not fully qualified, it is ony the name (last path segment)
				 * of the file.
				 */
				function _sameFile(actual, expected) {
					assert(actual, 'The returned file for the implementation was undefined');
					assert(expected, 'The expected file name cannot be undefined');
					var idx = actual.lastIndexOf('/');
					var f = actual;
					if(idx > -1) {
						f = f.slice(idx+1);
					}
					assert.equal(f, expected, 'The origin file names are not the same');
				}
				
				/**
				 * @description Compares the actual impl found to what we are expecting
				 * @private
				 * @param {Object} actual The actual found impl
				 * @param {Object} expected The expected impl
				 */
				function _compareImpls(actual, expected) {
					_sameFile(actual.file, expected.file);
					assert.equal(actual.start, expected.start, 'The implementation starts are not the same. Actual ' + actual.start + '-' + actual.end + ' Expected ' + expected.start + '-' + expected.end);
					assert.equal(actual.end, expected.end, 'The implementation ends are not the same. Actual ' + actual.start + '-' + actual.end + ' Expected ' + expected.start + '-' + expected.end);
					worker.getTestState().callback();
				}
				describe("AMD", function(){
					it("cross file return object indirection 1", function(done) {
						var options = {
							buffer: "define(['./files/require_dep1'], function(a) {a.myfunc()});",
							offset: 52,
							callback: done
						};
						testDirectImplementation(options, {start:859, end:865, file: 'require_dep1.js'});
					});
					it("cross file return object indirection 2", function(done) {
						var options = {
							buffer: "define(['./files/require_dep1'], function(a) {a.variable});",
							offset: 52,
							callback: done
						};
						testDirectImplementation(options, {start:733, end:741, file: 'require_dep1.js'});
					});
					it("cross file return object indirection 3", function(done) {
						var options = {
							buffer: "define(['./files/require_dep2'], function(a) {a.myfunc()});",
							offset: 52,
							callback: done
						};
						testDirectImplementation(options, {start:860, end:866, file: 'require_dep2.js'});
					});
					it("cross file return object indirection 4", function(done) {
						var options = {
							buffer: "define(['./files/require_dep2'], function(a) {a.variable});",
							offset: 52,
							callback: done
						};
						testDirectImplementation(options, {start:741, end:749, file: 'require_dep2.js'});
					});
					it("cross file return object constructor 1", function(done) {
						var options = {
							buffer: "define(['./files/require_dep6'], function(a) {new a.directFoo();});",
							offset: 56,
							callback: done
						};
						testDirectImplementation(options, {start:845, end:848, file: 'require_dep6.js'});
					});
					it("cross file return object direct function 1", function(done) {
						var options = {
							buffer: "define(['./files/require_dep6'], function(a) {a.directFunc();});",
							offset: 52,
							callback: done
						};
						testDirectImplementation(options, {start:1210, end:1219, file: 'require_dep6.js'});
					});
					it("cross file return object direct var 1", function(done) {
						var options = {
							buffer: "define(['./files/require_dep6'], function(a) {a.directVar;});",
							offset: 52,
							callback: done
						};
						testDirectImplementation(options, {start:1179, end:1187, file: 'require_dep6.js'});
					});
					it("cross file return object member constructor 1", function(done) {
						var options = {
							buffer: "define(['./files/require_dep6'], function(a) {a.memberFoo();});",
							offset: 52,
							callback: done
						};
						testDirectImplementation(options, {start:845, end:848, file: 'require_dep6.js'});
					});
					it("cross file return object member function 1", function(done) {
						var options = {
							buffer: "define(['./files/require_dep6'], function(a) {a.memberFunc();});",
							offset: 52,
							callback: done
						};
						testDirectImplementation(options, {start:1210, end:1219, file: 'require_dep6.js'});
					});
					it("cross file return object member variable 1", function(done) {
						var options = {
							buffer: "define(['./files/require_dep6'], function(a) {a.memberVar;});",
							offset: 52,
							callback: done
						};
						testDirectImplementation(options, {start:1179, end:1187, file: 'require_dep6.js'});
					});
					it("cross 2 files func 1", function(done) {
						var options = {
							buffer: "define(['./files/require_dep7'], function(a) {a.reExportFunc;});",
							offset: 52,
							callback: done
						};
						testDirectImplementation(options, {start:860, end:866, file: 'require_dep2.js'});
					});
					it("cross 2 files var 1", function(done) {
						var options = {
							buffer: "define(['./files/require_dep7'], function(a) {a.reExportVar;});",
							offset: 52,
							callback: done
						};
						testDirectImplementation(options, {start:741, end:749, file: 'require_dep2.js'});
					});
					it("cross file return object proto function 1", function(done) {
						var options = {
							buffer: "define(['./files/require_dep7'], function(a) {a.reExportFunc;});",
							offset: 52,
							callback: done
						};
						testDirectImplementation(options, {start:860, end:866, file: 'require_dep2.js'});
					});
					it("cross file return object proto var 1", function(done) {
						var options = {
							buffer: "define(['./files/require_dep8'], function(a) {a.reExportFunc;});",
							offset: 52,
							callback: done
						};
						testDirectImplementation(options, {start:712, end:724, file: 'require_dep8.js'});
					});
					it("cross file constructor 3 - export object non-proto constructor", function(done) {
						var options = {
							buffer: "define(['./files/require_dep5'], function(a) {var local = new a.Foo();});",
							offset: 65,
							callback: done
						};
						testDirectImplementation(options, {start:824, end:827, file: 'require_dep5.js'});
					});
				});
				describe("Node", function(){
					it("Node require, inline export - Function implementation", function(done) {
						var options = {
							buffer: "var lib = require('./files/node_dep1.js'); lib.nodeFunc1();",
							offset: 53,
							callback: done
						};
						testDirectImplementation(options, {start:29, end:38, file: 'node_dep1.js'});
					});
					it("Node require, inline export - Variable implementation", function(done) {
						var options = {
							buffer: "var lib = require('./files/node_dep1.js'); lib.nodeVariable1 + '';",
							offset: 53,
							callback: done
						};
						testDirectImplementation(options, {start:63, end:76, file: 'node_dep1.js'});
					});
					it("Node require - Function implementation", function(done) {
						var options = {
							buffer: "var lib = require('./files/node_dep2.js'); lib.nodeFunc2();",
							offset: 53,
							callback: done
						};
						testDirectImplementation(options, {start:31, end:40, file: 'node_dep2.js'});
					});
					it("Node require - Variable implementation", function(done) {
						var options = {
							buffer: "var lib = require('./files/node_dep2.js'); lib.nodeVariable2 + '';",
							offset: 53,
							callback: done
						};
						testDirectImplementation(options, {start:52, end:65, file: 'node_dep2.js'});
					});
				});
				describe("Globals imported using HTML script", function(){
					it("Global via HTML - Function implementation", function(done) {
						var options = {
							buffer: "<html><script src=\"./files/global_dep1.js\"></script><script>myGlobalFunc();</script></html>",
							offset: 67,
							contentType: "text/html",
							callback: done
						};
						testDirectImplementation(options, {start:9, end:21, file: 'global_dep1.js'});
					});
					it("Global via HTML - Variable implementation", function(done) {
						var options = {
							buffer: "<html><script src=\"./files/global_dep1.js\"/></script><script>var a = myGlobalVar;</script></html>",
							offset: 71,
							contentType: "text/html",
							callback: done
						};
						testDirectImplementation(options, {start:53, end:64, file: 'global_dep1.js'});
					});
				});
				describe("ES6 Modules import/export", function(){
					before('Reset Tern Server for ES6 tests', function(done) {
						worker.start(done,  {options:{plugins: {es_modules: {}}, ecmaVersion:6, sourceType:"module"}});
					});
					describe("Named export declaration", function(){
						it("ES Module named export import all - Function implementation", function(done) {
							var options = {
								buffer: "import * as myModule from \"./files/es_modules_dep1\"; myModule.myESFunc();",
								offset: 67,
								callback: done
							};
							testDirectImplementation(options, {start:16, end:24, file: 'es_modules_dep1.js'});
						});
						it("ES Module named export import all - Variable implementation", function(done) {
							var options = {
								buffer: "import * as myModule from \"./files/es_modules_dep1\"; var a = myModule.myESConst;",
								offset: 77,
								callback: done
							};
							testDirectImplementation(options, {start:43, end:52, file: 'es_modules_dep1.js'});
						});
						it("ES Module named export import specific  - Function implementation", function(done) {
							var options = {
								buffer: "import {myESFunc} from \"./files/es_modules_dep1\"; myESFunc();",
								offset: 58,
								callback: done
							};
							testDirectImplementation(options, {start:16, end:24, file: 'es_modules_dep1.js'});
						});
						it("ES Module named export import specific - Variable implementation", function(done) {
							var options = {
								buffer: "import {myESConst} from \"./files/es_modules_dep1\"; var a = myESConst;",
								offset: 65,
								callback: done
							};
							testDirectImplementation(options, {start:43, end:52, file: 'es_modules_dep1.js'});
						});
					});
					describe("Named export declaration", function(){
						it("ES Module default export import all - Function implementation", function(done) {
							var options = {
								buffer: "import * as myDefModule from \"./files/es_modules_dep2\"; myDefModule.default();",
								offset: 73,
								callback: done
							};
							testDirectImplementation(options, {start:15, end:27, file: 'es_modules_dep2.js'});
						});
						it("ES Module default export import all - Variable implementation", function(done) {
							var options = {
								buffer: "import * as myDefModule2 from \"./files/es_modules_dep3\"; var a = myDefModule2.default;",
								offset: 83,
								callback: done
							};
							testDirectImplementation(options, {start:15, end:24, file: 'es_modules_dep3.js'});
						});
						it("ES Module default export import specific  - Function implementation", function(done) {
							var options = {
								buffer: "import myDefault from \"./files/es_modules_dep2\"; myDefault();",
								offset: 56,
								callback: done
							};
							testDirectImplementation(options, {start:15, end:27, file: 'es_modules_dep2.js'});
						});
						it("ES Module default export import specific - Variable implementation", function(done) {
							var options = {
								buffer: "import myDefault from \"./files/es_modules_dep3\"; var a = myDefault;",
								offset: 63,
								callback: done
							};
							testDirectImplementation(options, {start:15, end:24, file: 'es_modules_dep3.js'});
						});
					});
					// TODO Unclear if the export all syntax is wrong or the plugin has a bug
					describe.skip("Named export declaration", function(){
						it("ES Module export all import all - Function implementation", function(done) {
							var options = {
								buffer: "import * as myModule from \"./files/es_modules_dep4\"; myModule.myESFunc();",
								offset: 72,
								callback: done
							};
							testDirectImplementation(options, {start:16, end:24, file: 'es_modules_dep1.js'});
						});
						it("ES Module export all import all - Variable implementation", function(done) {
							var options = {
								buffer: "import * as myModule from \"./files/es_modules_dep4\"; var a = myModule.myESConst;",
								offset: 82,
								callback: done
							};
							testDirectImplementation(options, {start:43, end:52, file: 'es_modules_dep1.js'});
						});
						it("ES Module export all import specific  - Function implementation", function(done) {
							var options = {
								buffer: "import {myESFunc} from \"./files/es_modules_dep4\"; myESFunc();",
								offset: 60,
								callback: done
							};
							testDirectImplementation(options, {start:16, end:24, file: 'es_modules_dep1.js'});
						});
						it("ES Module export all import specific - Variable implementation", function(done) {
							var options = {
								buffer: "import {myESConst} from \"./files/es_modules_dep4\"; var a = myESConst;",
								offset: 70,
								callback: done
							};
							testDirectImplementation(options, {start:43, end:52, file: 'es_modules_dep1.js'});
						});
					});
				});
			});
		});
	};
});
