/*******************************************************************************
 * @license
 * Copyright (c) 2016, 2017 IBM Corporation, Inc. and others.
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
'javascript/contentAssist/ternAssist',
'javascript/cuProvider',
'chai/chai',
'orion/Deferred',
'mocha/mocha' //must stay at the end, not a module
], function(TestWorker, ASTManager, TernAssist, CUProvider, chai, Deferred) {
	var assert = chai.assert;
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

	var ternAssist;
	var astManager = new ASTManager.ASTManager();
	var jsFile = 'tern_content_assist_module_test_script.js';
	var htmlFile = 'tern_content_assist_module_test_script.html';
	var timeoutReturn = ['Content assist timed out'];
	var jsProject = {
		getEcmaLevel: function getEcmaLevel() {},
		getESlintOptions: function getESlintOptions() {
			return new Deferred().resolve(null);
		},
		getComputedEnvironment: function getComputedEnvironment() {
			return new Deferred().resolve({});
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
		var prefix = state.prefix = typeof options.prefix === 'undefined' ? '' : options.prefix;
		var offset = state.offset = typeof options.offset === 'undefined' ? 0 : options.offset;
		var line = state.line = typeof options.line === 'undefined' ? '' : options.line;
		var keywords = typeof options.keywords === 'undefined' ? false : options.keywords;
		var templates = typeof options.templates === 'undefined' ? false : options.templates;

		var contentType = options.contenttype ? options.contenttype : 'application/javascript';
		var	file = state.file = jsFile;
		if (contentType === 'text/html'){
			// Tern plug-ins don't have the content type, only the name of the file
			file = state.file = htmlFile;
		}
		assert(options.callback, 'You must provide a test callback for worker-based tests');
		state.callback = options.callback;
		worker.setTestState(state);

		var ecma = options.ecma ? options.ecma : 5;
		jsProject.getEcmaLevel = function() {
			return new Deferred().resolve(ecma);
		};
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
			}
		};
		astManager.onModelChanging({file: {location: file}});
		var params = {offset: offset, prefix : prefix, keywords: keywords, template: templates, line: line, timeout: options.timeout ? options.timeout : 20000, timeoutReturn: timeoutReturn};

		if (options.createFiles){
			for (var i=0; i<options.createFiles.length; i++) {
				worker.createTestFile(options.createFiles[i].name, options.createFiles[i].text);
			}
			// TODO Do warmup pass so that resolver is updated with created test files
			ternAssist.computeContentAssist(editorContext, params);
		}

		return {
			editorContext: editorContext,
			params: params
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
			var prop = expectedProposals[i][0].replace(/\n/g, "\\n");
			prop = prop.replace(/\'/g, "\\'");
			text += '[\'' + prop + "\', \'" + expectedProposals[i][1] + "\'],\n"; //$NON-NLS-1$ //$NON-NLS-0$
		}
		return text;
	}

	/**
	 * @description Pretty-prints the given array of proposal objects
	 * @param {Array} expectedProposals The array of proposals
	 * @returns {String} The pretty-printed proposals
	 */
	function stringifyActual(actualProposals) {
		var text = "";
		for (var i = 0; i < actualProposals.length; i++) {
			var prop = actualProposals[i].proposal.replace(/\n/g, "\\n");
			prop = prop.replace(/\'/g, "\\'");
			if (actualProposals[i].name) {
				text += '[\'' + prop + "\', \'" + actualProposals[i].name + actualProposals[i].description + "\'],\n"; //$NON-NLS-1$ //$NON-NLS-0$
			} else {
				text += '[\'' + prop + "\', \'" + actualProposals[i].description + "\'],\n"; //$NON-NLS-1$ //$NON-NLS-0$
			}
		}
		return text;
	}

	/**
	 * @description Checks the proposals returned from the given proposal promise against
	 * the array of given proposals
	 * @param {Object} options The options to test with
	 * @param {Array} expectedProposals The array of expected proposal objects
	 */
	function testProposals(options, expectedProposals) {
		var _p = setup(options);
		assert(_p, 'setup() should have completed normally');
		ternAssist.computeContentAssist(_p.editorContext, _p.params).then(function (actualProposals) {
			try {
				assert(actualProposals, "Error occurred, returned proposals was undefined");
				if (actualProposals === timeoutReturn){
					assert(false, "The content assist operation timed out");
				}
				assert.equal(actualProposals.length, expectedProposals.length,
					"Wrong number of proposals.  Expected:\n" + stringifyExpected(expectedProposals) +"\nActual:\n" + stringifyActual(actualProposals));
				for (var i = 0; i < actualProposals.length; i++) {
				    var ap = actualProposals[i];
				    var ep = expectedProposals[i];
					var text = ep[0];
					var description = ep[1];
					assert.equal(ap.proposal, text, "Invalid proposal text. Expected proposals:\n" + stringifyExpected(expectedProposals) +"\nActual proposals:\n" + stringifyActual(actualProposals)); //$NON-NLS-0$
					if (description) {
						if (ap.name) {
							assert.equal(ap.name + ap.description, description, "Invalid proposal description. Expected proposals:\n" + stringifyExpected(expectedProposals) +"\nActual proposals:\n" + stringifyActual(actualProposals)); //$NON-NLS-0$
						} else {
							assert.equal(ap.description, description, "Invalid proposal description. Expected proposals:\n" + stringifyExpected(expectedProposals) +"\nActual proposals:\n" + stringifyActual(actualProposals)); //$NON-NLS-0$
						}
					}
					if(ep.length >= 3 && !ap.unselectable /*headers have no hover*/) {
					    //check for doc hover
					    assert(ap.hover, 'There should be a hover entry for the proposal');
					    assert(ap.hover.content.indexOf(ep[2]) === 0, "The doc should have started with the given value.\nActual: " + ap.hover.content + '\nExpected: ' + ep[2]);
					}
					if (ep.length >= 4 && typeof ep[3] === 'object'){
						assert(ap.groups, "Expected template proposal with selection group");
						assert(ap.groups[0].positions, "Expected template proposal with selection group");
						var offset = ap.groups[0].positions[0].offset;
						var len = ap.groups[0].positions[0].length;
						assert.equal(offset, ep[3].offset, "Template proposal had different offset for selection group");
						assert.equal(offset, ep[3].offset, "Template proposal had different offset for selection group");
						assert.equal(len, ep[3].length, "Template proposal had different length for selection group");
					}
				}
				worker.getTestState().callback();
			}
			catch(err) {
				worker.getTestState().callback(err);
			}
		}, function (error) {
			worker.getTestState().callback(error);
		});
	}

	describe('Content Assist for Tern Module Plugins', function() {
		this.timeout(10000);
		before('Message the server for warm up', function(done) {
			CUProvider.setUseCache(false);
			ternAssist = new TernAssist.TernContentAssist(astManager, worker, CUProvider, jsProject);
			worker.start(done); // Reset the tern server state to remove any prior files
		});

		describe('Node', function() {
			before('Restart with the node plugin', function(done) {
				worker.start(done, {options: {plugins: {node: {}}, libs: []}});
			});
			it('Default node modules - Missing directive', function(done) {
				var options = {
					buffer: "require('')",
					prefix: "",
					offset: 9,
					callback: done
				};
				testProposals(options, [
					['', 'node'],
					['assert', 'assert : string'],
					['buffer', 'buffer : string'],
					['child_process', 'child_process : string'],
					['cluster', 'cluster : string'],
					['crypto', 'crypto : string'],
					['dgram', 'dgram : string'],
					['dns', 'dns : string'],
					['domain', 'domain : string'],
					['events', 'events : string'],
					['fs', 'fs : string'],
					['http', 'http : string'],
					['https', 'https : string'],
					['module', 'module : string'],
					['net', 'net : string'],
					['os', 'os : string'],
					['path', 'path : string'],
					['punycode', 'punycode : string'],
					['querystring', 'querystring : string'],
					['readline', 'readline : string'],
					['repl', 'repl : string'],
					['stream', 'stream : string'],
					['string_decoder', 'string_decoder : string'],
					['timers', 'timers : string'],
					['tls', 'tls : string'],
					['tty', 'tty : string'],
					['url', 'url : string'],
					['util', 'util : string'],
					['vm', 'vm : string'],
					['zlib', 'zlib : string']
				]);
			});
			it('Default node modules', function(done) {
				var options = {
					buffer: "/*eslint-env node*/\nrequire('')",
					prefix: "",
					offset: 29,
					callback: done
				};
				testProposals(options, [
					['', 'node'],
					['assert', 'assert : string'],
					['buffer', 'buffer : string'],
					['child_process', 'child_process : string'],
					['cluster', 'cluster : string'],
					['crypto', 'crypto : string'],
					['dgram', 'dgram : string'],
					['dns', 'dns : string'],
					['domain', 'domain : string'],
					['events', 'events : string'],
					['fs', 'fs : string'],
					['http', 'http : string'],
					['https', 'https : string'],
					['module', 'module : string'],
					['net', 'net : string'],
					['os', 'os : string'],
					['path', 'path : string'],
					['punycode', 'punycode : string'],
					['querystring', 'querystring : string'],
					['readline', 'readline : string'],
					['repl', 'repl : string'],
					['stream', 'stream : string'],
					['string_decoder', 'string_decoder : string'],
					['timers', 'timers : string'],
					['tls', 'tls : string'],
					['tty', 'tty : string'],
					['url', 'url : string'],
					['util', 'util : string'],
					['vm', 'vm : string'],
					['zlib', 'zlib : string']
				]);
			});
			it('Default node modules - c prefix', function(done) {
				var options = {
					buffer: "/*eslint-env node*/\nrequire('c')",
					prefix: "c",
					offset: 30,
					callback: done,
					createFiles: [{name: "c", text: ""}]
				};
				testProposals(options, [
					// TODO Temp workaround for Bug 508687
					['c', 'c : string'],
					['', 'node'],
					['child_process', 'child_process : string'],
					['cluster', 'cluster : string'],
					['crypto', 'crypto : string']
				]);
			});
			it('Indexed lib node modules - e prefix', function(done) {
				worker.start(null, {options: {plugins: {node:{}, express:{}}, libs: []}}, function() {
					var options = {
						buffer: "/*eslint-env node, express*/\nrequire('e')",
						prefix: "e",
						offset: 39,
						callback: done,
						createFiles: [{name: "e", text: ""}]
					};
					testProposals(options, [
						// TODO Temp workaround for Bug 508687
						['e', 'e : string'],
						['', 'express'],
						['express', 'express : string'],
						['', 'node'],
						['events', 'events : string']
					]);
				});
			});
			it('Indexed lib node modules', function(done) {
				worker.start(null, {options: {plugins: {amqp:{}, express:{}, mongodb:{}, mysql:{}, redis:{}, node:{}}, libs: []}}, function() {
					var options = {
						buffer: "/*eslint-env node, amqp, express, mongodb, mysql, postgres, redis*/\nrequire('')",
						prefix: "",
						offset: 77,
						callback: done
					};
					testProposals(options, [
						['', 'amqp'],
						['amqp', 'amqp : string'],
						['', 'express'],
						['express', 'express : string'],
						['', 'mongodb'],
						['mongodb', 'mongodb : string'],
						['', 'mysql'],
						['mysql', 'mysql : string'],
						['', 'redis'],
						['redis', 'redis : string'],
						['', 'node'],
						['assert', 'assert : string'],
						['buffer', 'buffer : string'],
						['child_process', 'child_process : string'],
						['cluster', 'cluster : string'],
						['crypto', 'crypto : string'],
						['dgram', 'dgram : string'],
						['dns', 'dns : string'],
						['domain', 'domain : string'],
						['events', 'events : string'],
						['fs', 'fs : string'],
						['http', 'http : string'],
						['https', 'https : string'],
						['module', 'module : string'],
						['net', 'net : string'],
						['os', 'os : string'],
						['path', 'path : string'],
						['punycode', 'punycode : string'],
						['querystring', 'querystring : string'],
						['readline', 'readline : string'],
						['repl', 'repl : string'],
						['stream', 'stream : string'],
						['string_decoder', 'string_decoder : string'],
						['timers', 'timers : string'],
						['tls', 'tls : string'],
						['tty', 'tty : string'],
						['url', 'url : string'],
						['util', 'util : string'],
						['vm', 'vm : string'],
						['zlib', 'zlib : string']
					]);
				});
			});
			it('File path module', function(done) {
				var options = {
					buffer: "require('./')",
					prefix: "./",
					offset:11,
					callback: done,
					createFiles: [{name: "./", text: ""}]
				};
				// We don't support relative path completions
				testProposals(options, [
				]);
			});
		});
		/**
		 * Skip for now - we had to roll back modules suport for requirejs
		 */
		describe.skip('RequireJS', function() {
			beforeEach('Restart with the requirejs plugin', function(done) {
				worker.start(done, {options: {plugins: {requirejs: {}}, libs: []}});
			});
			it('No existing define deps', function(done) {
				var options = {
					buffer: "/* eslint-env amd */\ndefine([''], function(importname) {});",
					prefix: "",
					offset: 30,
					callback: done,
				};
				testProposals(options, [
				]);
			});
			it('Existing deps', function(done) {
				var options = {
					buffer: "/* eslint-env amd */\ndefine(['a/existingDep', 'a/existingDep2', ''], function(importname) {});",
					prefix: "",
					offset: 65,
					callback: done,
					createFiles: [{name: "a/existingDep", text: "function foo(){}"},{name: "a/existingDep2", text: "function foo2(){}"}]
				};
				testProposals(options, [
					['a/existingDep', 'a/existingDep : string'],
					['a/existingDep2', 'a/existingDep2 : string'],
				]);
			});
			it('Existing deps - Prefix Ex', function(done) {
				var options = {
					buffer: "/* eslint-env amd */\ndefine('foo', ['b/prefixExisting', 'b/notPrefixExisting', 'b/pref'], function(importname) {});",
					prefix: "b/pref",
					offset: 86,
					callback: done,
					createFiles: [{name: "b/prefixExisting", text: "function foo(){}"},{name: "b/notPrefixExisting", text: "function foo(){}"},{name: "b/pref", text: ""}]
				};
				testProposals(options, [
					['b/prefixExisting', 'b/prefixExisting : string'],
				]);
			});
			it('Existing deps with module name', function(done) {
				var options = {
					buffer: "/* eslint-env amd */\ndefine('foo', ['a/existingDep', 'a/existingDep2', ''], function(importname) {});",
					prefix: "",
					offset: 72,
					callback: done,
					createFiles: [{name: "a/existingDep", text: "function foo(){}"},{name: "a/existingDep2", text: "function foo2(){}"}]
				};
				testProposals(options, [
					['a/existingDep', 'a/existingDep : string'],
					['a/existingDep2', 'a/existingDep2 : string'],
				]);
			});
			it('Existing deps with module name - Prefix Ex', function(done) {
				var options = {
					buffer: "/* eslint-env amd */\ndefine(['b/prefixExisting', 'b/notPrefixExisting', 'b/pref'], function(importname) {});",
					prefix: "b/pref",
					offset: 79,
					callback: done,
					createFiles: [{name: "b/prefixExisting", text: "function foo(){}"},{name: "b/notPrefixExisting", text: "function foo(){}"},{name: "b/pref", text: ""}]
				};
				testProposals(options, [
					['b/prefixExisting', 'b/prefixExisting : string'],
				]);
			});
			it('Existing deps with module name - module name completions', function(done) {
				var options = {
					buffer: "/* eslint-env amd */\ndefine('', ['a/existingDep', 'a/existingDep2', ''], function(importname) {});",
					prefix: "",
					offset: 29,
					callback: done,
					createFiles: [{name: "a/existingDep", text: "function foo(){}"},{name: "a/existingDep2", text: "function foo2(){}"}]
				};
				testProposals(options, [
					['a/existingDep', 'a/existingDep : string'],
					['a/existingDep2', 'a/existingDep2 : string'],
				]);
			});
		});
		// TODO ES_Modules only uses file path completions which our file client doesn't support currently
		describe.skip('ES_Modules', function() {
		});
	});
});
