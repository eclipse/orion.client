/*******************************************************************************
 * @license
 * Copyright (c) 2015, 2017 IBM Corporation, Inc. and others.
 * All rights reserved. This program and the accompanying materials are made
 * available under the terms of the Eclipse Public License 2.0
 * (http://www.eclipse.org/legal/epl-v10.html), and the Eclipse Distribution
 * License v1.0 (http://www.eclipse.org/org/documents/edl-v10.html).
 *
 * Contributors:
 *     IBM Corporation - initial API and implementation
 ******************************************************************************/
/*eslint-env amd, mocha, browser*/
/*eslint-disable missing-nls*/
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
	var jsFile = 'tern_content_assist_test_script.js';
	var htmlFile = 'tern_content_assist_test_script.html';
	var timeoutReturn = ['Content assist timed out'];
	var jsProject = {
		getEcmaLevel: function getEcmaLevel() {},
		getESlintOptions: function getESlintOptions() {
			return new Deferred().resolve(null);
		},
		getComputedEnvironment: function getComputedEnvironment() {
			return new Deferred().resolve({ecmaVersion: 5});
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
		astManager.onModelChanging({file: {location: file}});
		var params = {offset: offset, prefix : prefix, keywords: keywords, template: templates, line: line, indentation: options.indentation, timeout: options.timeout ? options.timeout : 20000, timeoutReturn: timeoutReturn};
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
			text += "['" + expectedProposals[i][0] + "', '" + expectedProposals[i][1] + "'],\n";
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
			if (actualProposals[i].name) {
				var desc = actualProposals[i].description ? actualProposals[i].description : "";
				text += "['" + actualProposals[i].proposal + "', '" + actualProposals[i].name + desc + "'],\n"; //$NON-NLS-1$ //$NON-NLS-0$
			} else {
				text += "['" + actualProposals[i].proposal + "', '" + actualProposals[i].description + "'],\n"; //$NON-NLS-1$ //$NON-NLS-0$
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
					assert.equal(ap.proposal, text, "Invalid proposal text"); //$NON-NLS-0$
					if (description) {
						if (ap.name) {
							var desc = ap.description ? ap.description : "";
							assert.equal(ap.name + desc, description, "Invalid proposal description"); //$NON-NLS-0$
						} else {
							assert.equal(ap.description, description, "Invalid proposal description"); //$NON-NLS-0$
						}
						if (ep.length >= 5) {
							assert(ap.tags, "Expected proposal with tags");
							assert(ap.tags[0], "Expected proposal to have at least one tag");
							var cssClass = ep[4];
							assert.equal(ap.tags[0].cssClass, cssClass, "Proposal had different cssClass. Actual cssClass: " + ap.tags[0].cssClass + "; Expected: " + cssClass);
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
						assert.equal(offset, ep[3].offset, "Template proposal had different offset for selection group. Actual offset: " + offset + " Actual length: " + len);
						assert.equal(len, ep[3].length, "Template proposal had different length for selection group. Actual offset: " + offset + " Actual length: " + len);
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

	describe('Tern Content Assist Tests', function() {
		this.timeout(20000);
		before('Message the server for warm up', function(done) {
			CUProvider.setUseCache(false);
			ternAssist = new TernAssist.TernContentAssist(astManager, worker, CUProvider, jsProject);
			worker.start(done, {options: {libs: ['ecma5', 'ecma6']}}); // Reset the tern server state to remove any prior files
		});

		describe('Case-insensitive proposals', function() {
			/**
			 * @see https://bugs.eclipse.org/bugs/show_bug.cgi?id=473777
			 */
			it('test casing 1', function(done) {
				var options = {
					buffer: "[].fore",
					prefix: "fore",
					offset: 7,
					callback: done
				};
				testProposals(options, [
					['', 'ecma5'],
					['forEach(f, context?)', 'forEach(f, context?)']
				]);
			});
			/**
			 * @see https://bugs.eclipse.org/bugs/show_bug.cgi?id=473777
			 */
			it('test casing 2', function(done) {
				var options = {
					buffer: "[].isPrototypeo",
					prefix: "isPrototypeo",
					offset: 15,
					callback: done
				};
				testProposals(options, [
					['', 'ecma5'],
					['isPrototypeOf(obj)', 'isPrototypeOf(obj) : bool']
				]);
			});
			/**
			 * @see https://bugs.eclipse.org/bugs/show_bug.cgi?id=473777
			 */
			it('test casing 3', function(done) {
				var options = {
					buffer: "[].copyw",
					prefix: "copyw",
					offset: 8,
					callback: done
				};
				testProposals(options, [
					['', 'ecma6'],
					['copyWithin(target, start, end?)', 'copyWithin(target, start, end?)']
				]);
			});
			/**
			 * @see https://bugs.eclipse.org/bugs/show_bug.cgi?id=473777
			 */
			it('test casing 4', function(done) {
				var options = {
					buffer: "[].isprototypeo",
					prefix: "isprototypeo",
					offset: 15,
					callback: done
				};
				testProposals(options, [
					['', 'ecma5'],
					['isPrototypeOf(obj)', 'isPrototypeOf(obj) : bool']
				]);
			});
			/**
			 * @see https://bugs.eclipse.org/bugs/show_bug.cgi?id=473786
			 */
			it('test casing params 1', function(done) {
				var options = {
					buffer: "[].filter",
					prefix: "filter",
					offset: 9,
					callback: done
				};
				testProposals(options, [
					['', 'ecma5'],
					['filter(test, context?)', 'filter(test, context?)']
				]);
			});
			it("test loosely match 1", function(done) {
				var options = {
					buffer: "var getAnotherThing = 0; gAT",
					prefix: "gAT",
					offset: 28,
					callback: done};
				return testProposals(options, [
					["getAnotherThing", "getAnotherThing : number"]
				]);
			});
			it("test loosely match 2", function(done) {
				var options = {
					buffer: "var getAnotherThing = 0; getan",
					prefix: "getan",
					offset: 30,
					callback: done};
				return testProposals(options, [
					["getAnotherThing", "getAnotherThing : number"]
				]);
			});
			it("test loosely match 3", function(done) {
				var options = {
					buffer: "var getAnotherThing = 0; getaN",
					prefix: "getaN",
					offset: 30,
					callback: done};
				return testProposals(options, [
					["getAnotherThing", "getAnotherThing : number"]
				]);
			});
			it("test loosely match 4", function(done) {
				var options = {
					buffer: "var getAnotherThing = 0; getAN",
					prefix: "getAN",
					offset: 30,
					callback: done};
				return testProposals(options, [
					["getAnotherThing", "getAnotherThing : number"]
				]);
			});
		});
		describe('Multi line templates', function() {
			it('For loop no indent', function(done) {
				var options = {
					buffer: "fo",
					prefix: "fo",
					offset: 2,
					templates: true,
					callback: done
				};
				testProposals(options, [
					['', 'Templates'],
					['for (var i = 0; i < array.length; i++) {\n\t\n}', 'for statement', 'Create a new', {offset: 9, length: 1}],
					['for (var i = 0; i < array.length; i++) {\n\tvar value = array[i];\n\t\n}', 'for statement (with loop variable)', 'Create a new', {offset: 9, length: 1}],
					['for (var property in object) {\n\tif (object.hasOwnProperty(property)) {\n\t\t\n\t}\n}', 'for..in statement', 'Create a for', {offset: 9, length: 8}],
				]);
			});
			it('For loop space indent', function(done) {
				var options = {
					buffer: "    fo",
					prefix: "fo",
					offset: 6,
					indentation: '    ',
					templates: true,
					callback: done
				};
				testProposals(options, [
					['', 'Templates'],
					['for (var i = 0; i < array.length; i++) {\n    \t\n    }', 'for statement', 'Create a new', {offset: 13, length: 1}],
					['for (var i = 0; i < array.length; i++) {\n    \tvar value = array[i];\n    \t\n    }', 'for statement (with loop variable)', 'Create a new', {offset: 13, length: 1}],
					['for (var property in object) {\n    \tif (object.hasOwnProperty(property)) {\n    \t\t\n    \t}\n    }', 'for..in statement', 'Create a for', {offset: 13, length: 8}],
				]);
			});
			it('For loop tabbed indent', function(done) {
				var options = {
					buffer: "\t\t\tfo",
					prefix: "fo",
					offset: 5,
					indentation: '\t\t\t',
					templates: true,
					callback: done
				};
				testProposals(options, [
					['', 'Templates'],
					['for (var i = 0; i < array.length; i++) {\n\t\t\t\t\n\t\t\t}', 'for statement', 'Create a new', {offset: 12, length: 1}],
					['for (var i = 0; i < array.length; i++) {\n\t\t\t\tvar value = array[i];\n\t\t\t\t\n\t\t\t}', 'for statement (with loop variable)', 'Create a new', {offset: 12, length: 1}],
					['for (var property in object) {\n\t\t\t\tif (object.hasOwnProperty(property)) {\n\t\t\t\t\t\n\t\t\t\t}\n\t\t\t}', 'for..in statement', 'Create a for', {offset: 12, length: 8}],
				]);
			});
			it('For loop mixed indent', function(done) {
				var options = {
					buffer: " \t  \t\t fo",
					prefix: "fo",
					offset: 9,
					indentation: ' \t  \t\t ',
					templates: true,
					callback: done
				};
				testProposals(options, [
					['', 'Templates'],
					['for (var i = 0; i < array.length; i++) {\n \t  \t\t \t\n \t  \t\t }', 'for statement', 'Create a new', {offset: 16, length: 1}],
					['for (var i = 0; i < array.length; i++) {\n \t  \t\t \tvar value = array[i];\n \t  \t\t \t\n \t  \t\t }', 'for statement (with loop variable)', 'Create a new', {offset: 16, length: 1}],
					['for (var property in object) {\n \t  \t\t \tif (object.hasOwnProperty(property)) {\n \t  \t\t \t\t\n \t  \t\t \t}\n \t  \t\t }', 'for..in statement', 'Create a for', {offset: 16, length: 8}],
				]);
			});
		});
		describe('Complete Syntax', function() {
			/**
			 * @see https://bugs.eclipse.org/bugs/show_bug.cgi?id=477014
			 * @since 10.0
			 */
			it("test func expression middle 1", function(done) {
				var options = {
					buffer: "var p =  function foo(){}",
					prefix: "",
					offset: 8,
					callback: done
				};
				testProposals(options, [
					['p()', 'p()'],
					['', 'ecma5'],
					['Array(size)', ''],
					['Boolean(value)', 'Boolean(value) : bool'],
					['Date(ms)', 'Date(ms)'],
					['Error(message)', ''],
					['EvalError(message)', ''],
					['Function(body)', 'Function(body) : fn()'],
					['Number(value)', 'Number(value) : number'],
					['Object()', 'Object()'],
					['RangeError(message)', ''],
					['ReferenceError(message)', ''],
					['RegExp(source, flags?)', ''],
					['String(value)', 'String(value) : string'],
					['SyntaxError(message)', ''],
					['TypeError(message)', ''],
					['URIError(message)', ''],
					['decodeURI(uri)', 'decodeURI(uri) : string'],
					['decodeURIComponent(uri)', 'decodeURIComponent(uri) : string'],
					['encodeURI(uri)', 'encodeURI(uri) : string'],
					['encodeURIComponent(uri)', 'encodeURIComponent(uri) : string'],
					['eval(code)', 'eval(code)'],
					['hasOwnProperty(prop)', 'hasOwnProperty(prop) : bool'],
					['isFinite(value)', 'isFinite(value) : bool'],
					['isNaN(value)', 'isNaN(value) : bool'],
					['isPrototypeOf(obj)', 'isPrototypeOf(obj) : bool'],
					['parseFloat(string)', 'parseFloat(string) : number'],
					['parseInt(string, radix?)', 'parseInt(string, radix?) : number'],
					['propertyIsEnumerable(prop)', 'propertyIsEnumerable(prop) : bool'],
					['toLocaleString()', 'toLocaleString() : string'],
					['toString()', 'toString() : string'],
					['valueOf()', 'valueOf() : number'],
					['Infinity', 'Infinity : number'],
					['JSON', 'JSON : JSON'],
					['Math', 'Math : Math'],
					['NaN', 'NaN : number'],
					['undefined', 'undefined : any'],
					['', 'ecma6'],
					['ArrayBuffer(length)', ''],
					['DataView(buffer, byteOffset?, byteLength?)', ''],
					['Float32Array(size)', ''],
					['Float64Array(size)', ''],
					['Int16Array(size)', ''],
					['Int32Array(size)', ''],
					['Int8Array(size)', ''],
					['Map(iterable?)', ''],
					['Promise(executor)', ''],
					['Proxy(target, handler)', ''],
					['Set(iterable?)', ''],
					['Symbol(description?)', ''],
					['Uint16Array(size)', ''],
					['Uint32Array(size)', ''],
					['Uint8Array(size)', ''],
					['Uint8ClampedArray(size)', ''],
					['WeakMap(iterable?)', ''],
					['WeakSet(iterable?)', ''],
					['Reflect', 'Reflect : Reflect']
				]);
			});
			it("test no dupe 1", function(done) {
				var options = {
					buffer: "x",
					prefix: "x",
					offset: 1,
					callback: done
				};
				testProposals(options, []);
			});
			it("test no dupe 2", function(done) {
				var options = {
					buffer: "var coo = 9; var other = function(coo) { c }",
					prefix: "c",
					offset: 42,
					callback: done
				};
				testProposals(options, [
					["coo", "coo : number"]
				]);
			});

			it("test no dupe 3", function(done) {
				var options = {
					buffer: "var coo = { }; var other = function(coo) { coo = 9;\nc }",
					prefix: "c",
					offset: 53,
					callback: done
				};
				testProposals(options, [
					["coo", "coo : number"]
				]);
			});
			it("test full file inferencing 1", function(done) {
				var options = {
					buffer: "x;\n var x = 0;",
					prefix: "x",
					offset: 1,
					callback: done};
				return testProposals(options, [
					["x", "x : number"]
				]);
			});
			it("test full file inferencing 2", function(done) {
				var options = {
					buffer: "function a() { x; }\n var x = 0;",
					prefix: "x",
					offset: 16,
					callback: done};
				return testProposals(options, [
					["x", "x : number"]
				]);
			});
			it("test full file inferencing 3", function(done) {
				var options = {
					buffer: "function a() { var y = x; y}\n var x = 0;",
					prefix: "y",
					offset: 27,
					callback: done};
				return testProposals(options, [
					["y", "y : number"]
				]);
			});
			it("test full file inferencing 4", function(done) {
				var options = {
					buffer: "function a() { var y = x.fff; y}\n var x = { fff : 0 };",
					prefix: "y",
					offset: 31,
					callback: done};
				return testProposals(options, [
					["y", "y : number"]
				]);
			});
			it("test full file inferencing 5", function(done) {
				var options = {
					buffer: "function a() { var y = x.fff; y}\n var x = {};\n x.fff = 8;",
					prefix: "y",
					offset: 31,
					callback: done};
				return testProposals(options, [
					["y", "y : number"]
				]);
			});
			it("test full file inferencing 6", function(done) {
				var options = {
					buffer: "function a() { x.fff = ''; var y = x.fff; y}\n" +
					"var x = {};\n" +
					"x.fff = 8;",
					prefix: "y",
					offset: 43,
					callback: done};
				return testProposals(options, [
					["y", "y : string|number"]
				]);
			});
			it("test full file inferencing 7", function(done) {
				var options = {
					buffer: "function a() { x.fff = ''; var y = x(); y}\n" +
					"var x = function() { return 8; }",
					prefix: "y",
					offset: 41,
					callback: done};
				return testProposals(options, [
					["y", "y : number"]
				]);
			});
			it("test full file inferencing 8", function(done) {
				var options = {
					buffer: "function a() { x.fff = ''; var y = z(); y}\n" +
					"var x = function() { return 8; }, z = x",
					prefix: "y",
					offset: 41,
					callback: done};
				return testProposals(options, [
					["y", "y : number"]
				]);
			});

			it("test full file inferencing 9", function(done) {
				var options = {
					buffer: "function a() {\n function b() {\n x.fff = '';\n }\n x.f\n}\n var x = {};",
					prefix: "f",
					offset: 51,
					callback: done};
				return testProposals(options, [
					["fff", "fff : string"]
				]);
			});
			it("test full file inferencing 10", function(done) {
				var options = {
					buffer: "function a() {\n function b() {\n x.fff = '';\n }\n var y = x;\n y.f\n }\n var x = {};",
					prefix: "f",
					offset: 63,
					callback: done};
				return testProposals(options, [
					["fff", "fff : string"]
				]);
			});

			it("test full file inferencing 11a", function(done) {
				var options = {
					buffer: "var x = {};\n function a() {\n var y = x;\n y.f\n function b() {\n x.fff = '';\n}\n}",
					prefix: "f",
					offset: 44,
					callback: done};
				return testProposals(options, [
					["fff", "fff : string"]
				]);
			});

			it("test full file inferencing 11", function(done) {
				var options = {
					buffer: "function a() {\n var y = x;\n y.f\n function b() {\n x.fff = '';\n }\n }\n var x = {};",
					prefix: "f",
					offset: 31,
					callback: done};
				return testProposals(options, [
					["fff", "fff : string"]
				]);
			});

			it("test full file inferencing 12", function(done) {
				var options = {
					buffer: "function a() {\n var y = x;\n y.f\n x.fff = '';\n }\n var x = {};",
					prefix: "f",
					offset: 31,
					callback: done};
				return testProposals(options, [
					["fff", "fff : string"]
				]);
			});

			it("test full file inferencing 13", function(done) {
				var options = {
					buffer: "function b() {\n x.fff = '';\n }\n function a() {\n var y = x;\n y.f\n }\n var x = {};",
					prefix: "f",
					offset: 63,
					callback: done};
				return testProposals(options, [
					["fff", "fff : string"]
				]);
			});

			it("test full file inferencing 14", function(done) {
				var options = {
					buffer: "function a() {\n  var y = x;\n y.f\n }\n function b() {\n x.fff = '';\n }\n var x = {};",
					prefix: "f",
					offset: 32,
					callback: done};
				return testProposals(options, [
					["fff", "fff : string"]
				]);
			});

			it("test full file inferencing 15", function(done) {
				var options = {
					buffer: "function b() {\n x.fff = '';\n }\n function a() {\n x.f\n }\n var x = {};",
					prefix: "f",
					offset: 51,
					callback: done};
				return testProposals(options, [
					["fff", "fff : string"]
				]);
			});

			// should still find the fff property here evem though it
			// is defined after and in another funxtion
			it("test full file inferencing 16", function(done) {
				var options = {
					buffer: "function a() {\n x.f\n }\n function b() {\n x.fff = '';\n }\n var x = {};",
					prefix: "f",
					offset: 19,
					callback: done};
				return testProposals(options, [
					["fff", "fff : string"]
				]);
			});
			it("test full file inferencing 17", function(done) {
				var options = {
					buffer: "function a() {\n x.f\n function b() {\n x.fff = '';\n }\n }\n var x = {};",
					prefix: "f",
					offset: 19,
					callback: done};
				return testProposals(options, [
					["fff", "fff : string"]
				]);
			});

			it("test full file inferencing 18", function(done) {
				var options = {
					buffer: "function a() {\n x.fff = '';\n function b() {\n x.f\n }\n }\n var x = {};",
					prefix: "f",
					offset: 48,
					callback: done};
				return testProposals(options, [
					["fff", "fff : string"]
				]);
			});

			it("test full file inferencing 19", function(done) {
				var options = {
					buffer: "function a() {\n function b() {\n x.f\n }\n x.fff = '';\n }\n var x = {};",
					prefix: "f",
					offset: 35,
					callback: done};
				return testProposals(options, [
					["fff", "fff : string"]
				]);
			});

			// don't find anything because assignment is in same scope, but after
			it("test full file inferencing 20", function(done) {
				var options = {
					buffer: "x.\n" +
					"var x = {};\n" +
					"x.fff = '';",
					prefix: "f",
					offset: 2,
					callback: done};
				return testProposals(options, [
					['fff', 'fff : string']
				]);
			});

			it("test full file inferencing 21", function(done) {
				var options = {
					buffer: "function a() {\n x.fff = '';\n }\n x.\n var x = {}; ",
					prefix: "f",
					offset: 34,
					callback: done};
				return testProposals(options, [
					["fff", "fff : string"]
				]);
			});

			it("test full file inferencing 22", function(done) {
				var options = {
					buffer: "x.\n" +
					"function a() {\n" +
					"x.fff = '';\n" +
					"}\n" +
					"var x = {}; ",
					prefix: "f",
					offset: 2,
					callback: done};
				return testProposals(options, [
					["fff", "fff : string"]
				]);
			});

			it("test full file inferencing 26", function(done) {
				var options = {
					buffer: "function a() {\n function b() {\n var fff = x();\n f;\n }\n }\n function x() { return ''; }",
					prefix: "f",
					offset: 49,
					callback: done};
				return testProposals(options, [
					["fff", "fff : string"],
					['', 'ecma6'],
					['Float32Array(size)', 'Float32Array(size)'],
					['Float64Array(size)', 'Float64Array(size)'],
					['', 'ecma5'],
					['Function(body)', 'Function(body) : fn()']
				]);
			});

			// Not inferencing String because function decl comes after reference in same scope
			it("test full file inferencing 27", function(done) {
				var options = {
					buffer: "var fff = x();\n f;\n function x() { return ''; }",
					prefix: "f",
					offset: 17,
					callback: done};
				return testProposals(options, [
					["fff", "fff : string"],
					['', 'ecma6'],
					['Float32Array(size)', 'Float32Array(size)'],
					['Float64Array(size)', 'Float64Array(size)'],
					['', 'ecma5'],
					['Function(body)', 'Function(body) : fn()']
				]);
			});

			// Not gonna work because of recursive
			it("test full file inferencing 28", function(done) {
				var options = {
					buffer: "function x() {\n var fff = x();\n f;\n return ''; }",
					prefix: "f",
					offset: 33,
					callback: done};
				return testProposals(options, [
					["fff", "fff : string"],
					['', 'ecma6'],
					['Float32Array(size)', 'Float32Array(size)'],
					['Float64Array(size)', 'Float64Array(size)'],
					['', 'ecma5'],
					['Function(body)', 'Function(body) : fn()']
				]);
			});

			it("test full file inferencing 29", function(done) {
				var options = {
					buffer: "function a() {\n function b() {\n var fff = x();\n f;\n }\n }\n var x = function() { return ''; }",
					prefix: "f",
					offset: 49,
					callback: done};
				return testProposals(options, [
					["fff", "fff : string"],
					['', 'ecma6'],
					['Float32Array(size)', 'Float32Array(size)'],
					['Float64Array(size)', 'Float64Array(size)'],
					['', 'ecma5'],
					['Function(body)', 'Function(body) : fn()']
				]);
			});

			// Not working because function decl comes after reference in same scope
			it("test full file inferencing 30", function(done) {
				var options = {
					buffer: "var fff = x();\n f;\n var x = function() { return ''; }",
					prefix: "f",
					offset: 17,
					callback: done};
				return testProposals(options, [
					["fff", "fff : string"],
					['', 'ecma6'],
					['Float32Array(size)', 'Float32Array(size)'],
					['Float64Array(size)', 'Float64Array(size)'],
					['', 'ecma5'],
					['Function(body)', 'Function(body) : fn()']
				]);
			});

			// Not gonna work because of recursive
			it("test full file inferencing 31", function(done) {
				var options = {
					buffer: "var x = function() { var fff = x();\nf;return ''; }",
					prefix: "f",
					offset: 37,
					callback: done};
				return testProposals(options, [
					["fff", "fff : string"],
					['', 'ecma6'],
					['Float32Array(size)', 'Float32Array(size)'],
					['Float64Array(size)', 'Float64Array(size)'],
					['', 'ecma5'],
					['Function(body)', 'Function(body) : fn()']
				]);
			});

			it("test full file inferencing 32", function(done) {
				var options = {
					buffer: "x\n function x() { return ''; }",
					prefix: "x",
					offset: 1,
					callback: done};
				return testProposals(options, [
					["x()", "x() : string"]
				]);
			});

			it("test full file inferencing 33", function(done) {
				var options = {
					buffer: "var xxx = {\n aaa: '',\n bbb: this.a\n};",
					prefix: "a",
					offset: 34,
					callback: done};
				return testProposals(options, [
					//TODO bug in Tern? ["aaa", "aaa : string"]
					['', 'ecma5'],
					['Array(size)', 'Array(size)'],
					['', 'ecma6'],
					['ArrayBuffer(length)', 'ArrayBuffer(length)']
				]);
			});

			it("test full file inferencing 34", function(done) {
				var options = {
					buffer: "var xxx = {\n" +
					"	bbb: this.a,\n" +
					"	aaa: ''\n" +
					"};",
					prefix: "a",
					offset: 24,
					callback: done};
				return testProposals(options, [
					['', 'ecma5'],
					['Array(size)', 'Array(size)'],
					['', 'ecma6'],
					['ArrayBuffer(length)', 'ArrayBuffer(length)']
					//TODO bug in Tern? ["aaa", "aaa : string"]
				]);
			});
			//https://bugs.eclipse.org/bugs/show_bug.cgi?id=490925
			it("test full file inferencing 35", function(done) {
				var options = {
					buffer: "function foo(a, c) {var newB = a.slice(1, 2);newB = newB === 'a' ? 'b' : new 	c[\"\"] = {};};",
					prefix: "new",
					offset: 77,
					callback: done};
				return testProposals(options, [
					["newB", "newB : string"]
				]);
			});
			it("test property read before", function(done) {
				var options = {
					buffer: "var xxx; xxx.lll++; xxx.ll",
					prefix: "ll",
					offset: 26,
					callback: done};
				return testProposals(options, [
					["lll", "lll"]
				]);
			});

			it("test property read after", function(done) {
				var options = {
					buffer: "var xxx;\n" +
					"xxx.ll;\n" +
					"xxx.lll++;",
					prefix: "ll",
					offset: 15,
					callback: done};
				return testProposals(options, [
					["lll", "lll"]
				]);
			});

			it("test property read global before", function(done) {
				var options = {
					buffer: "lll++; ll",
					prefix: "ll",
					offset: 9,
					callback: done};
				return testProposals(options, [
					//TODO ["lll", "lll"]
				]);
			});

			it("test property read global after", function(done) {
				var options = {
					buffer: "ll; lll++;",
					prefix: "ll",
					offset: 2,
					callback: done};
				return testProposals(options, [
					//TODO ["lll", "lll"]
				]);
			});

			it("test array parameterization 1", function(done) {
				var options = {
					buffer: "var x = [1]; x[foo].toFi",
					prefix: "toFi",
					offset: 24,
					callback: done};
				return testProposals(options, [
					['', 'ecma5'],
					["toFixed(digits)", "toFixed(digits) : string"]
				]);
			});
			it("test array parameterization 2", function(done) {
				var options = {
					buffer: "var x = [1]; x[0].toFi",
					prefix: "toFi",
					offset: 22,
					callback: done};
				return testProposals(options, [
					['', 'ecma5'],
					["toFixed(digits)", "toFixed(digits) : string"]
				]);
			});
			it("test array parameterization 3", function(done) {
				var options = {
					buffer: "var x = [1]; x['foo'].toFi",
					prefix: "toFi",
					offset: 26,
					callback: done};
				return testProposals(options, [
					['', 'ecma5'],
					["toFixed(digits)", "toFixed(digits) : string"]
				]);
			});
			it("test array parameterization 4", function(done) {
				var options = {
					buffer: "([1, 0])[0].toFi",
					prefix: "toFi",
					offset: 16,
					callback: done};
				return testProposals(options, [
					['', 'ecma5'],
					["toFixed(digits)", "toFixed(digits) : string"]
				]);
			});
			it("test array parameterization 5", function(done) {
				var options = {
					buffer: "var x = [[1]]; x[0][0].toFi",
					prefix: "toFi",
					offset: 27,
					callback: done};
				return testProposals(options, [
					['', 'ecma5'],
					["toFixed(digits)", "toFixed(digits) : string"]
				]);
			});
			it("test array parameterization 6", function(done) {
				var options = {
					buffer: "var x = [{}];x[0].a = 8; x[0].a.toFi",
					prefix: "toFi",
					offset: 36,
					callback: done};
				return testProposals(options, [
					['', 'ecma5'],
					["toFixed(digits)", "toFixed(digits) : string"]
				]);
			});
			it("test array parameterization 7", function(done) {
				var options = {
					buffer: "var a = {a : 8}; var x = [a]; x[0].a.toFi",
					prefix: "toFi",
					offset: 41,
					callback: done};
					// may not work because a string
				return testProposals(options, [
					['', 'ecma5'],
					["toFixed(digits)", "toFixed(digits) : string"]
				]);
			});
			it("test array parameterization 8", function(done) {
				var options = {
					buffer: "var x = [[1]]; x = x[0]; x[0].toFi",
					prefix: "toFi",
					offset: 34,
					callback: done};
				return testProposals(options, [
					['', 'ecma5'],
					["toFixed(digits)", "toFixed(digits) : string"]
				]);
			});
			it("test array parameterization 9", function(done) {
				var options = {
					buffer: "var x = []; x[9] = 0; x[0].toFi",
					prefix: "toFi",
					offset: 31,
					callback: done};
				return testProposals(options, [
					['', 'ecma5'],
					["toFixed(digits)", "toFixed(digits) : string"]
				]);
			});
			it("test array parameterization 10", function(done) {
				var options = {
					buffer: "var x = []; x[9] = ''; x[9] = 0; x[0].toFi",
					prefix: "toFi",
					offset: 42,
					callback: done};
				return testProposals(options, [
					['', 'ecma5'],
					["toFixed(digits)", "toFixed(digits) : string"]
				]);
			});
			it("test array parameterization 11", function(done) {
				var options = {
					buffer: "var x = (function() { return [0]; })(); x[9] = 0; x[0].toFi",
					prefix: "toFi",
					offset: 59,
					callback: done};
				return testProposals(options, [
					['', 'ecma5'],
					["toFixed(digits)", "toFixed(digits) : string"]
				]);
			});
			it("test array parameterization 12", function(done) {
				var options = {
					buffer: "var x = ['','','']; x[9] = 0; x[0].toFi",
					prefix: "toFi",
					offset: 39,
					callback: done};
				return testProposals(options, [
					['', 'ecma5'],
					["toFixed(digits)", "toFixed(digits) : string"]
				]);
			});

			// https://github.com/scripted-editor/scripted/issues/65
			it("test case insensitive ordering 1", function(done) {
				var options = {
					buffer: "var xXXX = 8; var xXYZ = 8; var xxxx = 8; var xxyz = 8; x",
					prefix: "x",
					offset: 57,
					callback: done};
				return testProposals(options, [
					["xXXX", "xXXX : number"],
					["xXYZ", "xXYZ : number"],
					["xxxx", "xxxx : number"],
					["xxyz", "xxyz : number"]
				]);
			});
			// https://github.com/scripted-editor/scripted/issues/65
			it("test case insensitive ordering 2", function(done) {
				var options = {
					buffer: "var xXYZ = 8;var xxxx = 8; var xXXX = 8; var xxyz = 8; x",
					prefix: "x",
					offset: 56,
					callback: done};
				return testProposals(options, [
					["xXXX", "xXXX : number"],
					["xXYZ", "xXYZ : number"],
					["xxxx", "xxxx : number"],
					["xxyz", "xxyz : number"]
				]);
			});

			it("test @type var type 1", function(done) {
				var options = {
					buffer: "/** @type {Number}*/var xx;x",
					prefix: "x",
					offset: 28,
					callback: done};
				return testProposals(options, [
					["xx", "xx : number"],
				]);
			});
			it("test @type var type 2", function(done) {
				var options = {
					buffer: "/** @type {String}*//** @type {Number}*/var xx;x",
					prefix: "x",
					offset: 48,
					callback: done};
				return testProposals(options, [
					["xx", "xx : any"],
				]);
			});
			it("test @type var type 3", function(done) {
				var options = {
					buffer: "/** @type {Number}*//** @type {String}*/var xx;x",
					prefix: "x",
					offset: 48,
					callback: done};
				return testProposals(options, [
					["xx", "xx : any"],
				]);
			});
			it("test @type var type 4", function(done) {
				var options = {
					buffer: "/** @type {Number}*/\n// @type {String}\nvar xx;x",
					prefix: "x",
					offset: 47,
					callback: done};
				return testProposals(options, [
					["xx", "xx : number"],
				]);
			});
			it("test @type var type 5", function(done) {
				var options = {
					buffer: "/** @type {Number}*/\n//* @type {String}\nvar xx;x",
					prefix: "x",
					offset: 48,
					callback: done};
				return testProposals(options, [
					["xx", "xx : string"],
				]);
			});
			it("test @type var type 6", function(done) {
				var options = {
					buffer: "/** @type {String}*/var yy;/** @type {Number}*/var xx;x",
					prefix: "x",
					offset: 55,
					callback: done};
				return testProposals(options, [
					["xx", "xx : any"],
				]);
			});
			it("test @type var type 7", function(done) {
				var options = {
					buffer: "/** @type {String}*/var yy;\n/** @type {Number}*/var xx;x",
					prefix: "x",
					offset: 56,
					callback: done};
				return testProposals(options, [
					["xx", "xx : number"],
				]);
			});
			it("test @type var type 8", function(done) {
				var options = {
					buffer: "/** @type {Number}*/var xx;/** @type {String}*/xx;x",
					prefix: "x",
					offset: 51,
					callback: done};
				return testProposals(options, [
					["xx", "xx : number"],
				]);
			});
			it("test @type var type 9", function(done) {
				var options = {
					buffer: "/** @type {{foo:String}}*/var xx;xx.f",
					prefix: "f",
					offset: 37,
					callback: done};
				return testProposals(options, [
					["foo", "foo : string"],
				]);
			});
			it("test @type var type 10", function(done) {
				var options = {
					buffer: "/** @type {{foo:string,foo2:number}}*/var xx;xx.f",
					prefix: "f",
					offset: 49,
					callback: done};
				return testProposals(options, [
					["foo", "foo : string"],
					["foo2", "foo2 : number"]
				]);
			});
			it("test @type var type 11", function(done) {
				var options = {
					buffer: "/** @returns {String}\n@type {Number}*/var xx;x",
					prefix: "x",
					offset: 46,
					callback: done};
				return testProposals(options, [
					["xx", "xx : number"]
				]);
			});
			it("test @type var type 12", function(done) {
				var options = {
					buffer: "/** @param {String} f\n@type {Number}*/var xx;x",
					prefix: "x",
					offset: 46,
					callback: done};
				return testProposals(options, [
					["xx", "xx : number"]
				]);
			});
			it("test @type var type 13", function(done) {
				var options = {
					buffer: "/** @return {Number}*/var xx = function() { };x",
					prefix: "x",
					offset: 47,
					callback: done};
				return testProposals(options, [
					["xx()", "xx() : number"]
				]);
			});
			it("test @type var type 14", function(done) {
				var options = {
					buffer: "var xx;\n /** @type String\n@param Number ss*/\n xx = function(yy) { y };",
					prefix: "y",
					offset: 67,
					callback: done};
				return testProposals(options, [
					["yy", "yy : any"]
				]);
			});
			it("test @type var type 15", function(done) {
				var options = {
					buffer: "var xx;\n /** @param {Number} ss\n@return {String}*/\n xx = function(yy) { y };",
					prefix: "y",
					offset: 73,
					callback: done};
				return testProposals(options, [
					["yy", "yy : any"]
				]);
			});
			/**
			 *  @see https://bugs.eclipse.org/bugs/show_bug.cgi?id=459499
			 */
			it("test @type var type 16", function(done) {
				var options = {
					buffer: "/** @type {String}\n@returns {Number}*/var xx = function() { };x",
					prefix: "x",
					offset: 63,
					callback: done};
				return testProposals(options, [
					["xx()", "xx() : number"]
				]);
			});
			it("test @type var type 17", function(done) {
				var options = {
					buffer: "/** @type {Number} xx2 */var flar = '';fla",
					prefix: "fla",
					offset: 42,
					callback: done};
				return testProposals(options, [
					["flar", "flar : string|number"]
				]);
			});
			it("test @type var type 18", function(done) {
				var options = {
					buffer: "/** @type {Number} xx2 */var flar;flar = '';fla",
					prefix: "fla",
					offset: 47,
					callback: done};
				return testProposals(options, [
					["flar", "flar : string|number"]
				]);
			});
			it("test @type var type 19", function(done) {
				var options = {
					buffer: "/** @type {Number} xx2 */var flar;flar = iDontKnow();fla",
					prefix: "fla",
					offset: 56,
					callback: done};
				return testProposals(options, [
					["flar", "flar : number"]
				]);
			});
			// SCRIPTED-138 jsdoc support for functions parameters that are in object literals
			it("test @type var type 20", function(done) {
				var options = {
					buffer: "var obj = {\n  /** @param {String} foo */\n fun : function(foo) { foo }\n}",
					prefix: "foo",
					offset: 67,
					callback: done};
				return testProposals(options, [
					["foo", "foo : string"]
				]);
			});
			it("test @type var type 21", function(done) {
				var options = {
					buffer: "var obj = {\n/** @type {String} foo */\nfoo : undefined};obj.f",
					prefix: "f",
					offset: 60,
					callback: done};
				return testProposals(options, [
					["foo", "foo : string"]
				]);
			});
			it("test @type var type 22", function(done) {
				var options = {
					buffer: "var obj = { Fun : function() { this.yyy = 9; } };\n/** @type {obj.Fun} */ var xxx;x",
					prefix: "x",
					offset: 82,
					callback: done};
				return testProposals(options, [
					["xxx", "xxx : Fun"]
				]);
			});
			it("test @type var type 23", function(done) {
				var options = {
					buffer: "/** @type {[Number]} */ var xxx;xxx[0].toF",
					prefix: "toF",
					offset: 42,
					callback: done};
				return testProposals(options, [
					['', 'ecma5'],
					["toFixed(digits)", "toFixed(digits) : string"]
				]);
			});
			it("test @type var type 24", function(done) {
				var options = {
					buffer: "/** @type {[Number,String]} */ var xxx;xxx[0].toF",
					prefix: "toF",
					offset: 49,
					callback: done};
				return testProposals(options, [
					['', 'ecma5'],
					["toFixed(digits)", "toFixed(digits) : string"]
				]);
			});
			it("test @type var type 25", function(done) {
				var options = {
					buffer: "/** @type {Array.<Number>} */ var xxx;xxx[0].toF",
					prefix: "toF",
					offset: 48,
					callback: done};
				return testProposals(options, [
					['', 'ecma5'],
					["toFixed(digits)", "toFixed(digits) : string"]
				]);
			});
			it("test @type var type 26", function(done) {
				var options = {
					buffer: "/** @type {[Number]} */ var xxx;xxx[0].toF",
					prefix: "toF",
					offset: 42,
					callback: done};
				return testProposals(options, [
					['', 'ecma5'],
					["toFixed(digits)", "toFixed(digits) : string"]
				]);
			});
			it("test @type var type 27", function(done) {
				var options = {
					buffer: "/** @type {Array.<{foo:Number}>} */ var xxx;xxx[0].foo.toF",
					prefix: "toF",
					offset: 58,
					callback: done};
				return testProposals(options, [
					['', 'ecma5'],
					["toFixed(digits)", "toFixed(digits) : string"]
				]);
			});
			it("test @type var type 28", function(done) {
				var options = {
					buffer: "/** @type {Array.<Array.<Number>>} */ var xxx;xxx[0][0].toF",
					prefix: "toF",
					offset: 59,
					callback: done};
				return testProposals(options, [
					['', 'ecma5'],
					["toFixed(digits)", "toFixed(digits) : string"]
				]);
			});
			it("test @type var type 29", function(done) {
				var options = {
					buffer: "/** @type {Array.<Array.<Array.<Number>>>} */ var xxx;xxx[0][0][bar].toF",
					prefix: "toF",
					offset: 72,
					callback: done};
				return testProposals(options, [
					['', 'ecma5'],
					["toFixed(digits)", "toFixed(digits) : string"]
				]);
			});
			it("test @type var type 30", function(done) {
				var options = {
					buffer: "/** @type {...Number} */ var xxx;xxx[0].toF",
					prefix: "toF",
					offset: 43,
					callback: done};
				return testProposals(options, [
					['', 'ecma5'],
					["toFixed(digits)", "toFixed(digits) : string"]
				]);
			});
			it("test @type var type 31", function(done) {
				var options = {
					buffer: "/** @type {...Array.<Number>} */ var xxx;xxx[0][0].toF",
					prefix: "toF",
					offset: 54,
					callback: done};
				return testProposals(options, [
					['', 'ecma5'],
					["toFixed(digits)", "toFixed(digits) : string"]
				]);
			});
			it("test @type var type 32", function(done) {
				var options = {
					buffer: "var jjj = {};/** @type {Number} */jjj.x = '';x.toF",
					prefix: "toF",
					offset: 50,
					callback: done};
				return testProposals(options, [
					['', 'ecma5'],
					["toFixed(digits)", "toFixed(digits) : string"]
				]);
			});
			it("test @type var type 33", function(done) {
				var options = {
					buffer: "var jjj = {x:false};/** @type {Number} */jjj.x = '';x.toF",
					prefix: "toF",
					offset: 57,
					callback: done};
				return testProposals(options, [
					['', 'ecma5'],
					["toFixed(digits)", "toFixed(digits) : string"]
				]);
			});
			it("test @type var type 34", function(done) {
				var options = {
					buffer: "var obj = { Fun : function() {} };\n/** @type {obj.Fun} */ var xxx;x",
					prefix: "x",
					offset: 67,
					callback: done};
				return testProposals(options, [
					["xxx", "xxx : Fun"]
				]);
			});
			it("test @type tag union", function(done) {
				var options = {
					buffer: "/** @type {String|Number}*/var xx;x",
					prefix: "x",
					offset: 35,
					callback: done};
				return testProposals(options, [
					["xx", "xx : string|number"],
				]);
			});
			it("test @type tag optional 1", function(done) {
				var options = {
					buffer: "/** @type {?String}*/var xx;x",
					prefix: "x",
					offset: 29,
					callback: done};
				return testProposals(options, [
					["xx", "xx : any"],
				]);
			});
			it("test @type tag optional 2", function(done) {
				var options = {
					buffer: "/** @type {String?}*/var xx;x",
					prefix: "x",
					offset: 29,
					callback: done};
				return testProposals(options, [
					["xx", "xx : any"],
				]);
			});
			it("test @type tag optional 3", function(done) {
				var options = {
					buffer: "/** @type {!String}*/var xx;x",
					prefix: "x",
					offset: 29,
					callback: done};
				return testProposals(options, [
					["xx", "xx : any"],
				]);
			});
			it("test @type tag optional 4", function(done) {
				var options = {
					buffer: "/** @type {String!}*/var xx;x",
					prefix: "x",
					offset: 29,
					callback: done};
				return testProposals(options, [
					["xx", "xx : any"],
				]);
			});
			it("test @type tag any 1", function(done) {
				var options = {
					buffer: "/** @type {[]}*/var xx;x",
					prefix: "x",
					offset: 24,
					callback: done};
				return testProposals(options, [
					["xx", "xx : any"],
				]);
			});
			it("test @type tag array 1", function(done) {
				var options = {
					buffer: "/** @type {Array.<number>}*/var xx;x",
					prefix: "x",
					offset: 36,
					callback: done};
				return testProposals(options, [
					["xx", "xx : [number]"],
				]);
			});
			it("test @type tag array 2", function(done) {
				var options = {
					buffer: "/** @type {Array.<String>}*/var xx;x",
					prefix: "x",
					offset: 36,
					callback: done};
				return testProposals(options, [
					["xx", "xx : [string]"],
				]);
			});
			it("test @type tag array 3", function(done) {
				var options = {
					buffer: "/** @type {[String]}*/var xx;x",
					prefix: "x",
					offset: 30,
					callback: done};
				return testProposals(options, [
					["xx", "xx : [string]"],
				]);
			});
			it("test @type tag array 3", function(done) {
				var options = {
					buffer: "/** @type {[?]}*/var xx;x",
					prefix: "x",
					offset: 25,
					callback: done};
				return testProposals(options, [
					["xx", "xx : any"],
				]);
			});
			it("test get local var", function(done) {
				var options = {
					buffer: "var xxx = 9;\nfunction fff(xxx) { xxx.toF}",
					prefix: "toF",
					offset: 40,
					callback: done};
				// should infer that we are referring to the locally defined xxx, not the global
				return testProposals(options, [
					["", "ecma5"],
					["toFixed(digits)", "toFixed(digits) : string"]
				]);
			});

			it("test Math 1", function(done) {
				var options = {
					buffer: "Mat",
					prefix: "Mat",
					offset: 3,
					callback: done};
				return testProposals(options, [
					["", "ecma5"],
					["Math", "Math : Math"]
				]);
			});
			it("test Math 2", function(done) {
				var options = {
					buffer: "this.Mat",
					prefix: "Mat",
					offset: 8,
					callback: done};
				return testProposals(options, [
					["", "ecma5"],
					["Math", "Math : Math"]
				]);
			});
			it("test Math 3", function(done) {
				var options = {
					buffer: "var ff = { f: this.Mat }",
					prefix: "Mat",
					offset: 22,
					callback: done};
				return testProposals(options, [
					["", "ecma5"],
					["Math", "Math : Math"]
				]);
			});
			it("test Math 4", function(done) {
				var options = {
					buffer: "this.Math.E",
					prefix: "E",
					offset: 11,
					callback: done};
				return testProposals(options, [
					["", "ecma5"],
					["exp()", "exp()"],
					["E", "E : number"],
					["", "ecma6"],
					["expm1(x)", "expm1(x) : number"]
				]);
			});
			it("test JSON 4", function(done) {
				var options = {
					buffer: "this.JSON.st",
					prefix: "st",
					offset: 12,
					callback: done};
				return testProposals(options, [
					["", "ecma5"],
					["stringify(value, replacer?, space?)", "stringify(value, replacer?, space?) : string"]
				]);
			});
			it("test multi-dot inferencing 1", function(done) {
				var options = {
					buffer: "var a = '';a.charAt().charAt().charAt().ch",
					prefix: "ch",
					offset: 42,
					callback: done};
				return testProposals(options, [
					["", "ecma5"],
					["charAt(i)", "charAt(i) : string"],
					["charCodeAt(i)", "charCodeAt(i) : number"]
				]);
			});
			it("test multi-dot inferencing 2", function(done) {
				var options = {
					buffer: "var zz = {};zz.zz = zz;zz.zz.zz.z",
					prefix: "z",
					offset: 33,
					callback: done};
				return testProposals(options, [
					["zz", "zz : zz"]
				]);
			});
			it("test multi-dot inferencing 3", function(done) {
				var options = {
					buffer: "var x = { yy : { } };x.yy.zz = 1;x.yy.z",
					prefix: "z",
					offset: 39,
					callback: done};
				return testProposals(options, [
					["zz", "zz : number"]
				]);
			});
			it("test multi-dot inferencing 4", function(done) {
				var options = {
					buffer: "var x = { yy : { } };x.yy.zz = 1;x.yy.zz.toF",
					prefix: "toF",
					offset: 44,
					callback: done};
				return testProposals(options, [
					["", "ecma5"],
					["toFixed(digits)", "toFixed(digits) : string"]
				]);
			});
			it("test constructor 1", function(done) {
				var options = {
					buffer: "function Fun() {this.xxx = 9;this.uuu = this.x;}",
					prefix: "x",
					offset: 46,
					callback: done};
				return testProposals(options, [
					["xxx", "xxx"]
				]);
			});
			it("test constructor 2", function(done) {
				var options = {
					buffer: "function Fun() {	this.xxx = 9;this.uuu = this.xxx; }var y = new Fun();y.x",
					prefix: "x",
					offset: 73,
					callback: done};
				return testProposals(options, [
					["xxx", "xxx : number"]
				]);
			});
			it("test constructor 3", function(done) {
				var options = {
					buffer: "function Fun() {	this.xxx = 9;	this.uuu = this.xxx; }var y = new Fun();y.xxx.toF",
					prefix: "toF",
					offset: 80,
					callback: done};
				return testProposals(options, [
					["", "ecma5"],
					["toFixed(digits)", "toFixed(digits) : string"]
				]);
			});
			it("test constructor 3", function(done) {
				var options = {
					buffer: "function Fun() {	this.xxx = 9;	this.uuu = this.xxx; }var y = new Fun();y.uuu.toF",
					prefix: "toF",
					offset: 80,
					callback: done};
				return testProposals(options, [
					["", "ecma5"],
					["toFixed(digits)", "toFixed(digits) : string"]
				]);
			});

			it("test constructor 4", function(done) {
				var options = {
					buffer: "var Fun = function () {	this.xxx = 9;	this.uuu = this.xxx; }var y = new Fun();y.uuu.toF",
					prefix: "toF",
					offset: 87,
					callback: done};
				return testProposals(options, [
					["", "ecma5"],
					["toFixed(digits)", "toFixed(digits) : string"]
				]);
			});

			it("test constructor 5", function(done) {
				var options = {
					buffer: "var x = { Fun : function () { this.xxx = 9;	this.uuu = this.xxx; } }var y = new x.Fun();y.uuu.toF",
					prefix: "toF",
					offset: 97,
					callback: done};
				return testProposals(options, [
					["", "ecma5"],
					["toFixed(digits)", "toFixed(digits) : string"]
				]);
			});

			it("test constructor 6", function(done) {
				var options = {
					buffer: "var x = { Fun : function () { this.xxx = 9;	this.uuu = this.xxx; } }var y = new x.Fun().uuu.toF",
					prefix: "toF",
					offset: 95,
					callback: done};
				return testProposals(options, [
					["", "ecma5"],
					["toFixed(digits)", "toFixed(digits) : string"]
				]);
			});

			it("test constructor 7", function(done) {
				var options = {
					buffer: "var Fun = function () {	this.xxx = 9;	this.uuu = this.xxx; }var x = { Fun : Fun };var y = new x.Fun();y.uuu.toF",
					prefix: "toF",
					offset: 111,
					callback: done};
				return testProposals(options, [
					["", "ecma5"],
					["toFixed(digits)", "toFixed(digits) : string"]
				]);
			});

			it("test constructor 8", function(done) {
				var options = {
					buffer: "var FunOrig = function () {	this.xxx = 9;	this.uuu = this.xxx; }var x = { Fun : FunOrig };var y = new x.Fun();y.uuu.toF",
					prefix: "toF",
					offset: 119,
					callback: done};
				return testProposals(options, [
					["", "ecma5"],
					["toFixed(digits)", "toFixed(digits) : string"]
				]);
			});

			// functions should not be available outside the scope that declares them
			it("test constructor 9", function(done) {
				var options = {
					buffer: "function outer() { function Inner() { }}Inn",
					prefix: "Inn",
					offset: 43,
					callback: done};
				return testProposals(options, [
					["Inner()", "Inner()"]
				]);
			});

			// should be able to reference functions using qualified name
			it("test constructor 10", function(done) {
				var options = {
					buffer: "var outer = { Inner : function() { }}outer.Inn",
					prefix: "Inn",
					offset: 46,
					callback: done};
				return testProposals(options, [
					["Inner()", "Inner()"]
				]);
			});
			it("test function args 4", function(done) {
				var options = {
					buffer: "function tt(aaa, bbb) { aaa.foo = 9;bbb.foo = ''aaa.f}",
					prefix: "f",
					offset: 53,
					callback: done};
				return testProposals(options, [
					["foo", "foo : number"]
				]);
			});
			// check that function args don't get assigned the same type
			it("test function args 5", function(done) {
				var options = {
					buffer: "function tt(aaa, bbb) { aaa.foo = 9;bbb.foo = ''bbb.f}",
					prefix: "f",
					offset: 53,
					callback: done};
				return testProposals(options, [
					["foo", "foo : string"]
				]);
			});
			it("test nested object expressions 1", function(done) {
				var options = {
					buffer: "var ttt = { xxx : { yyy : { zzz : 1} } };ttt.xxx.y",
					prefix: "y",
					offset: 50,
					callback: done};
				return testProposals(options, [
					["yyy", "yyy : yyy"]
				]);
			});
			it("test nested object expressions 2", function(done) {
				var options = {
					buffer: "var ttt = { xxx : { yyy : { zzz : 1} } };ttt.xxx.yyy.z",
					prefix: "z",
					offset: 54,
					callback: done};
				return testProposals(options, [
					["zzz", "zzz : number"]
				]);
			});
			it("test nested object expressions 3", function(done) {
				var options = {
					buffer: "var ttt = { xxx : { yyy : { zzz : 1} } };ttt.xxx.yyy.zzz.toF",
					prefix: "toF",
					offset: 60,
					callback: done};
				return testProposals(options, [
					["", "ecma5"],
					["toFixed(digits)", "toFixed(digits) : string"]
				]);
			});
			it("test function expression 1", function(done) {
				var options = {
					buffer: "var ttt = function(a, b, c) { };tt",
					prefix: "tt",
					offset: 34,
					callback: done};
				return testProposals(options, [
					["ttt(a, b, c)", "ttt(a, b, c)"]
				]);
			});
			it("test function expression 2", function(done) {
				var options = {
					buffer: "ttt = function(a, b, c) { };tt",
					prefix: "tt",
					offset: 30,
					callback: done};
				return testProposals(options, [
					["ttt(a, b, c)", "ttt(a, b, c)"]
				]);
			});
			it("test function expression 3", function(done) {
				var options = {
					buffer: "ttt = { rrr : function(a, b, c) { } };ttt.rr",
					prefix: "rr",
					offset: 44,
					callback: done};
				return testProposals(options, [
					["rrr(a, b, c)", "rrr(a, b, c)"]
				]);
			});
			it("test function expression 4", function(done) {
				var options = {
					buffer: "var ttt = function(a, b) { };var hhh = ttt;hhh",
					prefix: "hhh",
					offset: 46,
					callback: done};
				return testProposals(options, [
					["hhh(a, b)", "hhh(a, b)"]
				]);
			});
			it("test function expression 4a", function(done) {
				var options = {
					buffer: "function ttt(a, b) { };var hhh = ttt;hhh",
					prefix: "hhh",
					offset: 40,
					callback: done};
				return testProposals(options, [
					["hhh(a, b)", "hhh(a, b)"]
				]);
			});
			it("test function expression 5", function(done) {
				var options = {
					buffer: "var uuu = { flart : function (a,b) { } };hhh = uuu.flart;hhh",
					prefix: "hhh",
					offset: 60,
					callback: done};
				return testProposals(options, [
					["hhh(a, b)", "hhh(a, b)"]
				]);
			});
			it("test function expression 6", function(done) {
				var options = {
					buffer: "var uuu = { flart : function (a,b) { } };hhh = uuu.flart;hhh.app",
					prefix: "app",
					offset: 64,
					callback: done};
				return testProposals(options, [
					["", "ecma5"],
					["apply(this, args)", "apply(this, args)"]
				]);
			});
			it("test globals 1", function(done) {
				var options = {
					buffer: "/*global faaa */fa",
					prefix: "fa",
					offset: 18,
					callback: done};
				return testProposals(options, [
				]);
			});
			it("test globals 2", function(done) {
				var options = {
					buffer: "/*global faaa faaa2 */fa",
					prefix: "fa",
					offset: 24,
					callback: done};
				return testProposals(options, [
				]);
			});
			it("test globals 3", function(done) {
				var options = {
					buffer: "/*global faaa fass2  */var t = 1;t.fa",
					prefix: "fa",
					offset: 37,
					callback: done};
				return testProposals(options, [
				]);
			});
			it("test globals 4", function(done) {
				var options = {
					buffer: "/*global faaa:true faaa2:false  */fa",
					prefix: "fa",
					offset: 36,
					callback: done};
				return testProposals(options, [
				]);
			});
			it("test globals 5", function(done) {
				var options = {
					buffer: "/*global faaa:true, faaa2:false */fa",
					prefix: "fa",
					offset: 36,
					callback: done};
				return testProposals(options, [
				]);
			});
			it("test complex name 1", function(done) {
				var options = {
					buffer: "function Ttt() { }var ttt = new Ttt();tt",
					prefix: "tt",
					offset: 40,
					callback: done};
				return testProposals(options, [
					["Ttt()", "Ttt()"],
					["ttt", "ttt : Ttt"]
				]);
			});
			it("test complex name 2", function(done) {
				var options = {
					buffer: "var Ttt = function() { };var ttt = new Ttt();tt",
					prefix: "tt",
					offset: 47,
					callback: done};
				return testProposals(options, [
					["Ttt()", "Ttt()"],
					["ttt", "ttt : Ttt"]
				]);
			});
			it("test complex name 3", function(done) {
				var options = {
					buffer: "var ttt = { };tt",
					prefix: "tt",
					offset: 16,
					callback: done};
				return testProposals(options, [
					["ttt", "ttt : ttt"]
				]);
			});
			it("test complex name 4", function(done) {
				var options = {
					buffer: "var ttt = { aa: 1, bb: 2 };tt",
					prefix: "tt",
					offset: 29,
					callback: done};
				return testProposals(options, [
					["ttt", "ttt : ttt"]
				]);
			});
			it("test complex name 5", function(done) {
				var options = {
					buffer: "var ttt = { aa: 1, bb: 2 };ttt.cc = 9;tt",
					prefix: "tt",
					offset: 40,
					callback: done};
				return testProposals(options, [
					["ttt", "ttt : ttt"]
				]);
			});
		});
		describe('Incomplete Syntax', function() {
			/**
			 * @see https://bugs.eclipse.org/bugs/show_bug.cgi?id=465334
			 */
			it("test shorthand if 1", function(done) {
				var options = {
					buffer: "var foo = {}; var bar = foo ? f",
					prefix: "f",
					offset: 31,
					callback: done
				};
				testProposals(options, [
					["foo", "foo : foo"],
					['', 'ecma6'],
					['Float32Array(size)', 'Float32Array(size)'],
					['Float64Array(size)', 'Float64Array(size)'],
					['', 'ecma5'],
					['Function(body)', 'Function(body) : fn()']
				]);
			});
			/**
			 * @see https://bugs.eclipse.org/bugs/show_bug.cgi?id=465334
			 */
			it("test shorthand if 2", function(done) {
				var options = {
					buffer: "var foo = {}; var bar = foo && !false && foo.baz || foo.err ? foo : u",
					prefix: "u",
					offset: 69,
					callback: done
				};
				testProposals(options, [
					["", "ecma5", ""],
					['URIError(message)', 'URIError(message)'],
					["undefined", "undefined : any"],
					['', 'ecma6'],
					['Uint16Array(size)', 'Uint16Array(size)'],
					['Uint32Array(size)', 'Uint32Array(size)'],
					['Uint8Array(size)', 'Uint8Array(size)'],
					['Uint8ClampedArray(size)', 'Uint8ClampedArray(size)']
				]);
			});
			it("test tolerant parsing function 1", function(done) {
				var options = {
					buffer: "var xxxyyy = {}; function foo() { if (xx",
					prefix: "xx",
					offset: 40,
					callback: done};
				return testProposals(options, [["xxxyyy", "xxxyyy : xxxyyy"]]);
			});

			it("test tolerant parsing function 2", function(done) {
				var options = {
					buffer: "function foo() { var xxxyyy = false; if (!xx",
					prefix: "xx",
					offset: 44,
					callback: done};
				return testProposals(options, [["xxxyyy", "xxxyyy : bool"]]);
			});

			it("test tolerant parsing function 3", function(done) {
				var options = {
					buffer: "function foo(xxxyyy) {if (!xx",
					prefix: "xx",
					offset: 29,
					callback: done};
				return testProposals(options, [["xxxyyy", "xxxyyy : any"]]);
			});

			it("test tolerant parsing function 4", function(done) {
				var options = {
					buffer: "var x = { bazz: 3 }; function foo() { if (x.b",
					prefix: "b",
					offset: 45,
					callback: done};
				return testProposals(options, [["bazz", "bazz : number"]]);
			});

			it("test tolerant parsing function 5", function(done) {
				var options = {
					buffer: "function foo(p) { p.ffffff = false; while (p.ff",
					prefix: "ff",
					offset: 47,
					callback: done};
				return testProposals(options, [["ffffff", "ffffff : bool"]]);
			});

			it("test tolerant parsing function 6", function(done) {
				var options = {
					buffer: "function foo(p) { p.ffffff = false; if (p) { while (p.ff",
					prefix: "ff",
					offset: 56,
					callback: done};
				return testProposals(options, [["ffffff", "ffffff : bool"]]);
			});

			it("test tolerant parsing function 7", function(done) {
				var options = {
					buffer: "function foo(p) { p.ffffff = false; if (p) { for (var q in p.ff",
					prefix: "ff",
					offset: 63,
					callback: done};
				return testProposals(options, [["ffffff", "ffffff : bool"]]);
			});

			it("test tolerant parsing function 8", function(done) {
				var options = {
					buffer: "function foo(p) { p.ffffff = false; if (p) { for (var q in p) { while (p.ff",
					prefix: "ff",
					offset: 75,
					callback: done};
				return testProposals(options, [["ffffff", "ffffff : bool"]]);
			});

			it("test tolerant parsing function 9", function(done) {
				var options = {
					buffer: "function f(s) {} f(JSON.str",
					prefix: "str",
					offset: 27,
					callback: done};
				return testProposals(options, [
					["",  "ecma5"],
					["stringify(value, replacer?, space?)", "stringify(value, replacer?, space?) : string"]
				]);
			});

			it("test tolerant parsing function 10", function(done) {
				var options = {
					buffer: "function f(a,b) {} f(0,JSON.str",
					prefix: "str",
					offset: 31,
					callback: done};
				return testProposals(options, [
					["",  "ecma5"],
					["stringify(value, replacer?, space?)", "stringify(value, replacer?, space?) : string"]
				]);
			});
			it("test tolerant parsing function 11", function(done) {
				var options = {
					buffer: "var xxyy = 10; with(xx",
					prefix: "xx",
					offset: 22,
					callback: done};
				return testProposals(options, [["xxyy", "xxyy : number"]]);
			});
			it("test tolerant parsing function 12", function(done) {
				var options = {
					buffer: "var xxyy = 10; do {} while(xx",
					prefix: "xx",
					offset: 29,
					callback: done};
				return testProposals(options, [["xxyy", "xxyy : number"]]);
			});
		});
		describe('Simple File Completions', function() {
			it("empty 1", function(done) {
				var options = {
					buffer: "x",
					prefix: "x",
					offset: 1,
					callback: done
				};
				testProposals(options, []);
			});
			it("empty 2", function(done) {
				var options = {
					buffer: "",
					offset: 0,
					callback: done
				};
				return testProposals(options, [
 					['', 'ecma5'],
					['Array(size)', ''],
					['Boolean(value)', 'Boolean(value) : bool'],
					['Date(ms)', 'Date(ms)'],
					['Error(message)', ''],
					['EvalError(message)', ''],
					['Function(body)', 'Function(body) : fn()'],
					['Number(value)', 'Number(value) : number'],
					['Object()', 'Object()'],
					['RangeError(message)', ''],
					['ReferenceError(message)', ''],
					['RegExp(source, flags?)', ''],
					['String(value)', 'String(value) : string'],
					['SyntaxError(message)', ''],
					['TypeError(message)', ''],
					['URIError(message)', ''],
					['decodeURI(uri)', 'decodeURI(uri) : string'],
					['decodeURIComponent(uri)', 'decodeURIComponent(uri) : string'],
					['encodeURI(uri)', 'encodeURI(uri) : string'],
					['encodeURIComponent(uri)', 'encodeURIComponent(uri) : string'],
					['eval(code)', 'eval(code)'],
					['hasOwnProperty(prop)', 'hasOwnProperty(prop) : bool'],
					['isFinite(value)', 'isFinite(value) : bool'],
					['isNaN(value)', 'isNaN(value) : bool'],
					['isPrototypeOf(obj)', 'isPrototypeOf(obj) : bool'],
					['parseFloat(string)', 'parseFloat(string) : number'],
					['parseInt(string, radix?)', 'parseInt(string, radix?) : number'],
					['propertyIsEnumerable(prop)', 'propertyIsEnumerable(prop) : bool'],
					['toLocaleString()', 'toLocaleString() : string'],
					['toString()', 'toString() : string'],
					['valueOf()', 'valueOf() : number'],
					['Infinity', 'Infinity : number'],
					['JSON', 'JSON : JSON'],
					['Math', 'Math : Math'],
					['NaN', 'NaN : number'],
					['undefined', 'undefined : any'],
					['', 'ecma6'],
					['ArrayBuffer(length)', ''],
					['DataView(buffer, byteOffset?, byteLength?)', ''],
					['Float32Array(size)', ''],
					['Float64Array(size)', ''],
					['Int16Array(size)', ''],
					['Int32Array(size)', ''],
					['Int8Array(size)', ''],
					['Map(iterable?)', ''],
					['Promise(executor)', ''],
					['Proxy(target, handler)', ''],
					['Set(iterable?)', ''],
					['Symbol(description?)', ''],
					['Uint16Array(size)', ''],
					['Uint32Array(size)', ''],
					['Uint8Array(size)', ''],
					['Uint8ClampedArray(size)', ''],
					['WeakMap(iterable?)', ''],
					['WeakSet(iterable?)', ''],
					['Reflect', 'Reflect : Reflect']
				]);
			});
			it("test Single Var Content Assist", function(done) {
				var options = {
					buffer: "var zzz = 9;\n",
					prefix: '',
					offset: 13,
					callback: done
				};
				return testProposals(options, [
					["zzz", "zzz : number"],
 					['', 'ecma5'],
					['Array(size)', ''],
					['Boolean(value)', 'Boolean(value) : bool'],
					['Date(ms)', 'Date(ms)'],
					['Error(message)', ''],
					['EvalError(message)', ''],
					['Function(body)', 'Function(body) : fn()'],
					['Number(value)', 'Number(value) : number'],
					['Object()', 'Object()'],
					['RangeError(message)', ''],
					['ReferenceError(message)', ''],
					['RegExp(source, flags?)', ''],
					['String(value)', 'String(value) : string'],
					['SyntaxError(message)', ''],
					['TypeError(message)', ''],
					['URIError(message)', ''],
					['decodeURI(uri)', 'decodeURI(uri) : string'],
					['decodeURIComponent(uri)', 'decodeURIComponent(uri) : string'],
					['encodeURI(uri)', 'encodeURI(uri) : string'],
					['encodeURIComponent(uri)', 'encodeURIComponent(uri) : string'],
					['eval(code)', 'eval(code)'],
					['hasOwnProperty(prop)', 'hasOwnProperty(prop) : bool'],
					['isFinite(value)', 'isFinite(value) : bool'],
					['isNaN(value)', 'isNaN(value) : bool'],
					['isPrototypeOf(obj)', 'isPrototypeOf(obj) : bool'],
					['parseFloat(string)', 'parseFloat(string) : number'],
					['parseInt(string, radix?)', 'parseInt(string, radix?) : number'],
					['propertyIsEnumerable(prop)', 'propertyIsEnumerable(prop) : bool'],
					['toLocaleString()', 'toLocaleString() : string'],
					['toString()', 'toString() : string'],
					['valueOf()', 'valueOf() : number'],
					['Infinity', 'Infinity : number'],
					['JSON', 'JSON : JSON'],
					['Math', 'Math : Math'],
					['NaN', 'NaN : number'],
					['undefined', 'undefined : any'],
					['', 'ecma6'],
					['ArrayBuffer(length)', ''],
					['DataView(buffer, byteOffset?, byteLength?)', ''],
					['Float32Array(size)', ''],
					['Float64Array(size)', ''],
					['Int16Array(size)', ''],
					['Int32Array(size)', ''],
					['Int8Array(size)', ''],
					['Map(iterable?)', ''],
					['Promise(executor)', ''],
					['Proxy(target, handler)', ''],
					['Set(iterable?)', ''],
					['Symbol(description?)', ''],
					['Uint16Array(size)', ''],
					['Uint32Array(size)', ''],
					['Uint8Array(size)', ''],
					['Uint8ClampedArray(size)', ''],
					['WeakMap(iterable?)', ''],
					['WeakSet(iterable?)', ''],
					['Reflect', 'Reflect : Reflect']
				]);
			});
			it("test Single Var Content Assist 2", function(done) {
				var options = {
					buffer: "var zzz;\n",
					prefix: '',
					offset: 9,
					callback: done
				};
				return testProposals(options, [
					["zzz", "zzz : any"],
 					['', 'ecma5'],
					['Array(size)', ''],
					['Boolean(value)', 'Boolean(value) : bool'],
					['Date(ms)', 'Date(ms)'],
					['Error(message)', ''],
					['EvalError(message)', ''],
					['Function(body)', 'Function(body) : fn()'],
					['Number(value)', 'Number(value) : number'],
					['Object()', 'Object()'],
					['RangeError(message)', ''],
					['ReferenceError(message)', ''],
					['RegExp(source, flags?)', ''],
					['String(value)', 'String(value) : string'],
					['SyntaxError(message)', ''],
					['TypeError(message)', ''],
					['URIError(message)', ''],
					['decodeURI(uri)', 'decodeURI(uri) : string'],
					['decodeURIComponent(uri)', 'decodeURIComponent(uri) : string'],
					['encodeURI(uri)', 'encodeURI(uri) : string'],
					['encodeURIComponent(uri)', 'encodeURIComponent(uri) : string'],
					['eval(code)', 'eval(code)'],
					['hasOwnProperty(prop)', 'hasOwnProperty(prop) : bool'],
					['isFinite(value)', 'isFinite(value) : bool'],
					['isNaN(value)', 'isNaN(value) : bool'],
					['isPrototypeOf(obj)', 'isPrototypeOf(obj) : bool'],
					['parseFloat(string)', 'parseFloat(string) : number'],
					['parseInt(string, radix?)', 'parseInt(string, radix?) : number'],
					['propertyIsEnumerable(prop)', 'propertyIsEnumerable(prop) : bool'],
					['toLocaleString()', 'toLocaleString() : string'],
					['toString()', 'toString() : string'],
					['valueOf()', 'valueOf() : number'],
					['Infinity', 'Infinity : number'],
					['JSON', 'JSON : JSON'],
					['Math', 'Math : Math'],
					['NaN', 'NaN : number'],
					['undefined', 'undefined : any'],
					['', 'ecma6'],
					['ArrayBuffer(length)', ''],
					['DataView(buffer, byteOffset?, byteLength?)', ''],
					['Float32Array(size)', ''],
					['Float64Array(size)', ''],
					['Int16Array(size)', ''],
					['Int32Array(size)', ''],
					['Int8Array(size)', ''],
					['Map(iterable?)', ''],
					['Promise(executor)', ''],
					['Proxy(target, handler)', ''],
					['Set(iterable?)', ''],
					['Symbol(description?)', ''],
					['Uint16Array(size)', ''],
					['Uint32Array(size)', ''],
					['Uint8Array(size)', ''],
					['Uint8ClampedArray(size)', ''],
					['WeakMap(iterable?)', ''],
					['WeakSet(iterable?)', ''],
					['Reflect', 'Reflect : Reflect']
				]);
			});
			it("test multi var content assist 1", function(done) {
				var options = {
					buffer: "var zzz;\nvar xxx, yyy;\n",
					prefix: '',
					offset: 23,
					callback: done
				};
				return testProposals(options, [
					["xxx", "xxx : any"],
					["yyy", "yyy : any"],
					["zzz", "zzz : any"],
 					['', 'ecma5'],
					['Array(size)', ''],
					['Boolean(value)', 'Boolean(value) : bool'],
					['Date(ms)', 'Date(ms)'],
					['Error(message)', ''],
					['EvalError(message)', ''],
					['Function(body)', 'Function(body) : fn()'],
					['Number(value)', 'Number(value) : number'],
					['Object()', 'Object()'],
					['RangeError(message)', ''],
					['ReferenceError(message)', ''],
					['RegExp(source, flags?)', ''],
					['String(value)', 'String(value) : string'],
					['SyntaxError(message)', ''],
					['TypeError(message)', ''],
					['URIError(message)', ''],
					['decodeURI(uri)', 'decodeURI(uri) : string'],
					['decodeURIComponent(uri)', 'decodeURIComponent(uri) : string'],
					['encodeURI(uri)', 'encodeURI(uri) : string'],
					['encodeURIComponent(uri)', 'encodeURIComponent(uri) : string'],
					['eval(code)', 'eval(code)'],
					['hasOwnProperty(prop)', 'hasOwnProperty(prop) : bool'],
					['isFinite(value)', 'isFinite(value) : bool'],
					['isNaN(value)', 'isNaN(value) : bool'],
					['isPrototypeOf(obj)', 'isPrototypeOf(obj) : bool'],
					['parseFloat(string)', 'parseFloat(string) : number'],
					['parseInt(string, radix?)', 'parseInt(string, radix?) : number'],
					['propertyIsEnumerable(prop)', 'propertyIsEnumerable(prop) : bool'],
					['toLocaleString()', 'toLocaleString() : string'],
					['toString()', 'toString() : string'],
					['valueOf()', 'valueOf() : number'],
					['Infinity', 'Infinity : number'],
					['JSON', 'JSON : JSON'],
					['Math', 'Math : Math'],
					['NaN', 'NaN : number'],
					['undefined', 'undefined : any'],
					['', 'ecma6'],
					['ArrayBuffer(length)', ''],
					['DataView(buffer, byteOffset?, byteLength?)', ''],
					['Float32Array(size)', ''],
					['Float64Array(size)', ''],
					['Int16Array(size)', ''],
					['Int32Array(size)', ''],
					['Int8Array(size)', ''],
					['Map(iterable?)', ''],
					['Promise(executor)', ''],
					['Proxy(target, handler)', ''],
					['Set(iterable?)', ''],
					['Symbol(description?)', ''],
					['Uint16Array(size)', ''],
					['Uint32Array(size)', ''],
					['Uint8Array(size)', ''],
					['Uint8ClampedArray(size)', ''],
					['WeakMap(iterable?)', ''],
					['WeakSet(iterable?)', ''],
					['Reflect', 'Reflect : Reflect']
				]);
			});
			it("test multi var content assist 2", function(done) {
				var options = {
					buffer: "var zzz;\nvar zxxx, xxx, yyy;\nz",
					prefix: 'z',
					offset: 29,
					callback: done
				};
				return testProposals(options, [
					["zxxx", "zxxx : any"],
					["zzz", "zzz : any"]
				]);
			});
			it("test single function content assist", function(done) {
				var options = {
					buffer: "function fun(a, b, c) {}\n",
					prefix: '',
					offset: 25,
					callback: done
				};
				return testProposals(options, [
					['fun(a, b, c)', ''],
 					['', 'ecma5'],
					['Array(size)', ''],
					['Boolean(value)', 'Boolean(value) : bool'],
					['Date(ms)', 'Date(ms)'],
					['Error(message)', ''],
					['EvalError(message)', ''],
					['Function(body)', 'Function(body) : fn()'],
					['Number(value)', 'Number(value) : number'],
					['Object()', 'Object()'],
					['RangeError(message)', ''],
					['ReferenceError(message)', ''],
					['RegExp(source, flags?)', ''],
					['String(value)', 'String(value) : string'],
					['SyntaxError(message)', ''],
					['TypeError(message)', ''],
					['URIError(message)', ''],
					['decodeURI(uri)', 'decodeURI(uri) : string'],
					['decodeURIComponent(uri)', 'decodeURIComponent(uri) : string'],
					['encodeURI(uri)', 'encodeURI(uri) : string'],
					['encodeURIComponent(uri)', 'encodeURIComponent(uri) : string'],
					['eval(code)', 'eval(code)'],
					['hasOwnProperty(prop)', 'hasOwnProperty(prop) : bool'],
					['isFinite(value)', 'isFinite(value) : bool'],
					['isNaN(value)', 'isNaN(value) : bool'],
					['isPrototypeOf(obj)', 'isPrototypeOf(obj) : bool'],
					['parseFloat(string)', 'parseFloat(string) : number'],
					['parseInt(string, radix?)', 'parseInt(string, radix?) : number'],
					['propertyIsEnumerable(prop)', 'propertyIsEnumerable(prop) : bool'],
					['toLocaleString()', 'toLocaleString() : string'],
					['toString()', 'toString() : string'],
					['valueOf()', 'valueOf() : number'],
					['Infinity', 'Infinity : number'],
					['JSON', 'JSON : JSON'],
					['Math', 'Math : Math'],
					['NaN', 'NaN : number'],
					['undefined', 'undefined : any'],
					['', 'ecma6'],
					['ArrayBuffer(length)', ''],
					['DataView(buffer, byteOffset?, byteLength?)', ''],
					['Float32Array(size)', ''],
					['Float64Array(size)', ''],
					['Int16Array(size)', ''],
					['Int32Array(size)', ''],
					['Int8Array(size)', ''],
					['Map(iterable?)', ''],
					['Promise(executor)', ''],
					['Proxy(target, handler)', ''],
					['Set(iterable?)', ''],
					['Symbol(description?)', ''],
					['Uint16Array(size)', ''],
					['Uint32Array(size)', ''],
					['Uint8Array(size)', ''],
					['Uint8ClampedArray(size)', ''],
					['WeakMap(iterable?)', ''],
					['WeakSet(iterable?)', ''],
					['Reflect', 'Reflect : Reflect']
				]);
			});
			it("test multi function content assist 1", function(done) {
				var options = {
					buffer: "function fun(a, b, c) {}\nfunction other(a, b, c) {}\n",
					prefix: '',
					offset: 52,
					callback: done
				};
				return testProposals(options, [
					['fun(a, b, c)', ''],
					['other(a, b, c)', ''],
 					['', 'ecma5'],
					['Array(size)', ''],
					['Boolean(value)', 'Boolean(value) : bool'],
					['Date(ms)', 'Date(ms)'],
					['Error(message)', ''],
					['EvalError(message)', ''],
					['Function(body)', 'Function(body) : fn()'],
					['Number(value)', 'Number(value) : number'],
					['Object()', 'Object()'],
					['RangeError(message)', ''],
					['ReferenceError(message)', ''],
					['RegExp(source, flags?)', ''],
					['String(value)', 'String(value) : string'],
					['SyntaxError(message)', ''],
					['TypeError(message)', ''],
					['URIError(message)', ''],
					['decodeURI(uri)', 'decodeURI(uri) : string'],
					['decodeURIComponent(uri)', 'decodeURIComponent(uri) : string'],
					['encodeURI(uri)', 'encodeURI(uri) : string'],
					['encodeURIComponent(uri)', 'encodeURIComponent(uri) : string'],
					['eval(code)', 'eval(code)'],
					['hasOwnProperty(prop)', 'hasOwnProperty(prop) : bool'],
					['isFinite(value)', 'isFinite(value) : bool'],
					['isNaN(value)', 'isNaN(value) : bool'],
					['isPrototypeOf(obj)', 'isPrototypeOf(obj) : bool'],
					['parseFloat(string)', 'parseFloat(string) : number'],
					['parseInt(string, radix?)', 'parseInt(string, radix?) : number'],
					['propertyIsEnumerable(prop)', 'propertyIsEnumerable(prop) : bool'],
					['toLocaleString()', 'toLocaleString() : string'],
					['toString()', 'toString() : string'],
					['valueOf()', 'valueOf() : number'],
					['Infinity', 'Infinity : number'],
					['JSON', 'JSON : JSON'],
					['Math', 'Math : Math'],
					['NaN', 'NaN : number'],
					['undefined', 'undefined : any'],
					['', 'ecma6'],
					['ArrayBuffer(length)', ''],
					['DataView(buffer, byteOffset?, byteLength?)', ''],
					['Float32Array(size)', ''],
					['Float64Array(size)', ''],
					['Int16Array(size)', ''],
					['Int32Array(size)', ''],
					['Int8Array(size)', ''],
					['Map(iterable?)', ''],
					['Promise(executor)', ''],
					['Proxy(target, handler)', ''],
					['Set(iterable?)', ''],
					['Symbol(description?)', ''],
					['Uint16Array(size)', ''],
					['Uint32Array(size)', ''],
					['Uint8Array(size)', ''],
					['Uint8ClampedArray(size)', ''],
					['WeakMap(iterable?)', ''],
					['WeakSet(iterable?)', ''],
					['Reflect', 'Reflect : Reflect']
				]);
			});
			it("test no dupe 1", function(done) {
				var options = {
					buffer: "var coo = 9; var other = function(coo) { c }",
					prefix: "c",
					offset: 42,
					callback: done
				};
				return testProposals(options, [
					["coo", "coo : number"]
				]);
			});
			it("test no dupe 2", function(done) {
				var options = {
					buffer: "var coo = { }; var other = function(coo) { coo = 9;\nc }",
					prefix: "c",
					offset: 53,
					callback: done
				};
				return testProposals(options, [
					["coo", "coo : number"]
				]);
			});
			it("test no dupe 3", function(done) {
				var options = {
					buffer: "var coo = function () { var coo = 9; \n c};",
					prefix: "c",
					offset: 40,
					callback: done
				};
				return testProposals(options, [
					["coo", "coo : number"]
				]);
			});
			it("test no dupe 4", function(done) {
				var options = {
					buffer: "var coo = 9; var other = function () { var coo = function() { return 9; }; \n c};",
					prefix: "c",
					offset: 78,
					callback: done
				};
				return testProposals(options, [
					["coo()", "coo() : number"]
				]);
			});
			it("test scopes 1", function(done) {
				// only the outer foo is available
				var options = {
					buffer: "var coo;\nfunction other(a, b, c) {\nfunction inner() { var coo2; }\nco}",
					prefix: "co",
					offset: 68,
					callback: done
				};
				return testProposals(options, [
					["coo", "coo : any"]
				]);
			});
			it("test scopes 2", function(done) {
				// the inner assignment should not affect the value of foo
				var options = {
					buffer: "var foo;\n var foo = 1;\nfunction other(a, b, c) {\nfunction inner() { foo2 = \"\"; }\nfoo.toF}",
					prefix: "toF",
					offset: 88,
					callback: done
				};
				return testProposals(options, [
					['', 'ecma5'],
					["toFixed(digits)", "toFixed(digits) : string"]
				]);
			});
			it("test multi function content assist 2", function(done) {
				var options = {
					buffer: "function ffun(a, b, c) {}\nfunction other(a, b, c) {}\nff",
					prefix: "ff",
					offset: 53,
					callback: done
				};
				return testProposals(options, [
					["ffun(a, b, c)", ""]
				]);
			});
		    /**
		     * Tests inferencing with $$-qualified members
		     * @see https://bugs.eclipse.org/bugs/show_bug.cgi?id=439628
		     * @since 7.0
		     */
		    it("test inferencing $$-qualified member types", function(done) {
				var options = {
					buffer: "var baz = foo.$$fntype && foo.$$fntype.foo;A",
					prefix: "A",
					offset: 44,
					callback: done
				};
				return testProposals(options, [
					['', 'ecma5'],
				    ["Array(size)", "Array(size)"],
					['', 'ecma6'],
					['ArrayBuffer(length)', ''],
				]);
			});
			// all inferencing based content assist tests here
			it("test Object inferencing with Variable", function(done) {
				var options = {
					buffer: "var t = {}\nt.h",
					prefix: "h",
					offset: 13,
					callback: done
				};
				return testProposals(options, [
					['', 'ecma5'],
					["hasOwnProperty(prop)", "hasOwnProperty(prop) : bool"]
				]);
			});
			it("test Object Literal inferencing", function(done) {
				var options = {
					buffer: "var t = { hhh : 1, hh2 : 8}\nt.h",
					prefix: "h",
					offset: 30,
					callback: done
				};
				return testProposals(options, [
					["hh2", "hh2 : number"],
					["hhh", "hhh : number"],
					["", "ecma5"],
					["hasOwnProperty(prop)", "hasOwnProperty(prop) : bool"]
				]);
			});
			it("test Simple String inferencing", function(done) {
				var options = {
					buffer: "''.char",
					prefix: "char",
					offset: 7,
					callback: done
				};
				return testProposals(options, [
					['', 'ecma5'],
					["charAt(i)", "charAt(i) : string"],
					["charCodeAt(i)", "charCodeAt(i) : number"]
				]);
			});
			it("test Simple Date inferencing", function(done) {
				var options = {
					buffer: "new Date().setD",
					prefix: "setD",
					offset: 15,
					callback: done
				};
				return testProposals(options, [
					['', 'ecma5'],
					["setDate(day)", "setDate(day) : number"]
				]);
			});
			it("test Number inferencing with Variable", function(done) {
				var options = {
					buffer: "var t = 1\nt.to",
					prefix: "to",
					offset: 14,
					callback: done
				};
				return testProposals(options, [
					['', 'ecma5'],
					["toExponential(digits)", "toExponential(digits) : string"],
					["toFixed(digits)", "toFixed(digits) : string"],
					["toLocaleString()", "toLocaleString() : string"],
					['toPrecision(digits)', 'toPrecision(digits) : string'],
					["toString(radix?)", "toString(radix?) : string"]
				]);
			});
			it("test Data flow Object Literal inferencing", function(done) {
				var options = {
					buffer: "var s = { hhh : 1, hh2 : 8}\nvar t = s;\nt.h",
					prefix: "h",
					offset: 42,
					callback: done
				};
				return testProposals(options, [
					["hh2", "hh2 : number"],
					["hhh", "hhh : number"],
					["", "ecma5"],
					["hasOwnProperty(prop)", "hasOwnProperty(prop) : bool"]
				]);
			});
			it("test Data flow inferencing 1", function(done) {
				var options = {
					buffer: "var ttt = 9\nttt.toF",
					prefix: "toF",
					offset: 19,
					callback: done
				};
				return testProposals(options, [
					['', 'ecma5'],
					["toFixed(digits)", "toFixed(digits) : string"]
				]);
			});
			it("test Data flow inferencing 2", function(done) {
				var options = {
					buffer: "ttt = 9\nttt.toF",
					prefix: "toF",
					offset: 15,
					callback: done
				};
				return testProposals(options, [
					['', 'ecma5'],
					["toFixed(digits)", "toFixed(digits) : string"]
				]);
			});
			it("test Data flow inferencing 3", function(done) {
				var options = {
					buffer: "var ttt = ''\nttt = 9\nttt.toF",
					prefix: "toF",
					offset: 28,
					callback: done
				};
				return testProposals(options, [
					['', 'ecma5'],
					["toFixed(digits)", "toFixed(digits) : string"]
				]);
			});
			it("test Data flow inferencing 4", function(done) {
				var options = {
					buffer: "var name = toString(property.key.value);\nname.co",
					prefix: "co",
					offset: 48,
					callback: done
				};
				return testProposals(options, [
					['', 'ecma6'],
					['codePointAt(pos)', 'codePointAt(pos) : number'],
					['', 'ecma5'],
					["concat(other)", "concat(other) : string"]
				]);
			});
			it("test Simple this", function(done) {
				var options = {
					buffer: "var ssss = 4;\nthis.ss",
					prefix: "ss",
					offset: 21,
					callback: done
				};
				return testProposals(options, [
					["ssss", "ssss : number"]
				]);
			});
			it("test Object Literal inside", function(done) {
				var options = {
					buffer: "var x = { the : 1, far : this.th };",
					prefix: "th",
					offset: 32,
					callback: done
				};
				return testProposals(options, [
					// Tern will fallback on looking at all potential property names if filter is set to true https://github.com/ternjs/tern/issues/790
					// currently filter is set to false, so no results will be returned
					// ["the", "the : number"]
				]);
			});
			it("test Object Literal outside", function(done) {
				var options = {
					buffer: "var x = { the : 1, far : 2 };\nx.th",
					prefix: "th",
					offset: 34,
					callback: done
				};
				return testProposals(options, [
					["the", "the : number"]
				]);
			});
			it("test Object Literal none", function(done) {
				var options = {
					buffer: "var x = { the : 1, far : 2 };\nthis.th",
					prefix: "th",
					offset: 37,
					callback: done
				};
				return testProposals(options, [
				]);
			});
			it("test Object Literal outside 2", function(done) {
				var options = {
					buffer: "var x = { the : 1, far : 2 };\nvar who = x.th",
					prefix: "th",
					offset: 44,
					callback: done
				};
				return testProposals(options, [
					["the", "the : number"]
				]);
			});
			it("test Object Literal outside 3", function(done) {
				var options = {
					buffer: "var x = { the : 1, far : 2 };\nwho(x.th)",
					prefix: "th",
					offset: 38,
					callback: done
				};
				return testProposals(options, [
					["the", "the : number"]
				]);
			});
			it("test Object Literal outside 4", function(done) {
				var options = {
					buffer: "var x = { the : 1, far : 2 };\nwho(yyy, x.th)",
					prefix: "th",
					offset: 43,
					callback: done
				};
				return testProposals(options, [
					["the", "the : number"]
				]);
			});
			it("test function return types 1", function(done) {
				var options = {
					buffer: "function first() { return 9; };first().toF",
					prefix: "toF",
					offset: 42,
					callback: done
				};
				return testProposals(options, [
					['', 'ecma5'],
					["toFixed(digits)", "toFixed(digits) : string"]
				]);
			});
			it("test function return types 2", function(done) {
				var options = {
					buffer: "var obj = { first : function () { return 9; } };obj.first().toF",
					prefix: "toF",
					offset: 63,
					callback: done
				};
				return testProposals(options, [
					['', 'ecma5'],
					["toFixed(digits)", "toFixed(digits) : string"]
				]);
			});
			it("test function return types 3", function(done) {
				var options = {
					buffer: "function first() { return { ff : 9 }; };first().ff.toF",
					prefix: "toF",
					offset: 54,
					callback: done
				};
				return testProposals(options, [
					['', 'ecma5'],
					["toFixed(digits)", "toFixed(digits) : string"]
				]);
			});
			it("test function return types 4", function(done) {
				var options = {
					buffer: "function first() { return function() { return 9; }; };var ff = first();ff().toF",
					prefix: "toF",
					offset: 79,
					callback: done
				};
				return testProposals(options, [
					['', 'ecma5'],
					["toFixed(digits)", "toFixed(digits) : string"]
				]);
			});
			it("test function return types 5", function(done) {
				var options = {
					buffer: "function first() { return function() { return 9; }; };first()().toF",
					prefix: "toF",
					offset: 67,
					callback: done
				};
				return testProposals(options, [
					['', 'ecma5'],
					["toFixed(digits)", "toFixed(digits) : string"]
				]);
			});
			it("test function return types 6", function(done) {
				var options = {
					buffer: "function first() { if(true) { return 8; } };first().toF",
					prefix: "toF",
					offset: 55,
					callback: done
				};
				return testProposals(options, [
					['', 'ecma5'],
					["toFixed(digits)", "toFixed(digits) : string"]
				]);
			});
			it("test function return types 7", function(done) {
				var options = {
					buffer: "function first() { if(true) { return ''; } else  { return 8; } };first().toF",
					prefix: "toF",
					offset: 76,
					callback: done
				};
				return testProposals(options, [
					['', 'ecma5'],
					["toFixed(digits)", "toFixed(digits) : string"]
				]);
			});
			it("test function return types 8", function(done) {
				var options = {
					buffer: "function first() { while(true) { return 1; } };first().toF",
					prefix: "toF",
					offset: 58,
					callback: done
				};
				return testProposals(options, [
					['', 'ecma5'],
					["toFixed(digits)", "toFixed(digits) : string"]
				]);
			});
			it("test function return types 9", function(done) {
				var options = {
					buffer: "function first() { do { return 1; } while(true); };first().toF",
					prefix: "toF",
					offset: 62,
					callback: done
				};
				return testProposals(options, [
					['', 'ecma5'],
					["toFixed(digits)", "toFixed(digits) : string"]
				]);
			});
			it("test function return types 10", function(done) {
				var options = {
					buffer: "function first() { for (var i; i < 10; i++) { return 1; } };first().toF",
					prefix: "toF",
					offset: 71,
					callback: done
				};
				return testProposals(options, [
					['', 'ecma5'],
					["toFixed(digits)", "toFixed(digits) : string"]
				]);
			});
			it("test function return types 11", function(done) {
				var options = {
					buffer: "function first() { for (var i in k) { return 1; } };first().toF",
					prefix: "toF",
					offset: 63,
					callback: done
				};
				return testProposals(options, [
					['', 'ecma5'],
					["toFixed(digits)", "toFixed(digits) : string"]
				]);
			});
			it("test function return types 12", function(done) {
				var options = {
					buffer: "function first() { try { return 1; } catch(e) { } };first().toF",
					prefix: "toF",
					offset: 63,
					callback: done
				};
				return testProposals(options, [
					['', 'ecma5'],
					["toFixed(digits)", "toFixed(digits) : string"]
				]);
			});
			it("test function return types 13", function(done) {
				var options = {
					buffer: "function first() { try { return 1; } catch(e) { } finally { } };first().toF",
					prefix: "toF",
					offset: 75,
					callback: done
				};
				return testProposals(options, [
					['', 'ecma5'],
					["toFixed(digits)", "toFixed(digits) : string"]
				]);
			});
			it("test function return types 14", function(done) {
				var options = {
					buffer: "function first() { try { return ''; } catch(e) { return 9; } finally { } };first().toF",
					prefix: "toF",
					offset: 86,
					callback: done
				};
				return testProposals(options, [
					['', 'ecma5'],
					["toFixed(digits)", "toFixed(digits) : string"]
				]);
			});
			it("test function return types 15", function(done) {
				var options = {
					buffer: "function first() { try { return ''; } catch(e) { return ''; } finally { return 9; } };first().toF",
					prefix: "toF",
					offset: 97,
					callback: done
				};
				return testProposals(options, [
					['', 'ecma5'],
					["toFixed(digits)", "toFixed(digits) : string"]
				]);
			});
			it("test function return types 16", function(done) {
				var options = {
					buffer: "function first() { switch (v) { case a: return 9; } };first().toF",
					prefix: "toF",
					offset: 65,
					callback: done
				};
				return testProposals(options, [
					['', 'ecma5'],
					["toFixed(digits)", "toFixed(digits) : string"]
				]);
			});
			it("test function return types 17", function(done) {
				var options = {
					buffer: "function first() { switch (v) { case b: return ''; case a: return 1; } };first().toF",
					prefix: "toF",
					offset: 84,
					callback: done
				};
				return testProposals(options, [
					['', 'ecma5'],
					["toFixed(digits)", "toFixed(digits) : string"]
				]);
			});
			it("test function return types 18", function(done) {
				var options = {
					buffer: "function first() { switch (v) { case b: return ''; default: return 1; } };first().toF",
					prefix: "toF",
					offset: 85,
					callback: done
				};
				return testProposals(options, [
					['', 'ecma5'],
					["toFixed(digits)", "toFixed(digits) : string"]
				]);
			});
			it("test function return types 19", function(done) {
				var options = {
					buffer: "function first() { while(true) { a;b;return 9; } };first().toF",
					prefix: "toF",
					offset: 62,
					callback: done
				};
				return testProposals(options, [
					['', 'ecma5'],
					["toFixed(digits)", "toFixed(digits) : string"]
				]);
			});
			it("test function return types 20", function(done) {
				var options = {
					buffer: "function first() { while(true) { while(false) { ;return 9; } } };first().toF",
					prefix: "toF",
					offset: 76,
					callback: done
				};
				return testProposals(options, [
					['', 'ecma5'],
					["toFixed(digits)", "toFixed(digits) : string"]
				]);
			});
			it("test function return types 21", function(done) {
				var options = {
					buffer: "function first() { return { a : 9, b : '' }; };fir",
					prefix: "fir",
					offset: 50,
					callback: done
				};
				return testProposals(options, [
					["first()", "first() : {a: number, b: string}"]
				]);
			});
			it("test function return types 22", function(done) {
				var options = {
					buffer: "function first () {return function () {var a = { a : 9, b : '' };return a;}}fir",
					prefix: "fir",
					offset: 79,
					callback: done
				};
				return testProposals(options, [
					["first()", "first() : fn() -> a"]
				]);
			});
			it("test function return types 23", function(done) {
				var options = {
					buffer: "function first () {return function () {var a = { a : 9, b : '' };return a;}}first().a",
					prefix: "a",
					offset: 85,
					callback: done
				};
				return testProposals(options, [
					['', 'ecma5'],
					["apply(this, args)", "apply(this, args)"]
				]);
			});
			it("test function return types 24", function(done) {
				var options = {
					buffer: "function first () {return function () {var a = { aa : 9, b : '' };return a;}}first()().a",
					prefix: "a",
					offset: 88,
					callback: done
				};
				return testProposals(options, [
					["aa", "aa : number"]
				]);
			});
			it("test function return types 25", function(done) {
				var options = {
					buffer: "var first = function() { return 9; };first.a",
					prefix: "a",
					offset: 44,
					callback: done
				};
				return testProposals(options, [
					['', 'ecma5'],
					["apply(this, args)", "apply(this, args)"]
				]);
			});
			it("test function return types 26", function(done) {
				var options = {
					buffer: "var first = function() { return 9; };first().toF",
					prefix: "toF",
					offset: 48,
					callback: done
				};
				return testProposals(options, [
					['', 'ecma5'],
					["toFixed(digits)", "toFixed(digits) : string"]
				]);
			});
			it("test implicit inference 1", function(done) {
				var options = {
					buffer: "var xxx;xx",
					prefix: "xx",
					offset: 10,
					callback: done
				};
				return testProposals(options, [
					["xxx", "xxx : any"]
				]);
			});
			it("test implicit inference 2", function(done) {
				var options = {
					buffer: "xxx.yyy = 0;xxx.yy",
					prefix: "yy",
					offset: 18,
					callback: done
				};
				return testProposals(options, [
					["yyy", "yyy : number"]
				]);
			});
			it("test implicit inference 3", function(done) {
				var options = {
					buffer: "var xxx; xxx.yyy = 0;xxx.yy",
					prefix: "yy",
					offset: 27,
					callback: done
				};
				return testProposals(options, [
					["yyy", "yyy : number"]
				]);
			});
			it("test implicit inference 4", function(done) {
				var options = {
					buffer: "xxx = 0;xx",
					prefix: "xx",
					offset: 10,
					callback: done
				};
				return testProposals(options, [
					["xxx", "xxx : number"]
				]);
			});
			it("test implicit inference 5", function(done) {
				var options = {
					buffer: "function inner() { xxx = 0; }xx",
					prefix: "xx",
					offset: 31,
					callback: done
				};
				return testProposals(options, [
					["xxx", "xxx : number"]
				]);
			});
			it("test implicit inference 6", function(done) {
				var options = {
					buffer: "var obj = { foo : function inner() { xxx = 0; } }xx",
					prefix: "xx",
					offset: 51,
					callback: done
				};
				return testProposals(options, [
					["xxx", "xxx : number"]
				]);
			});
			it("test implicit inference 7", function(done) {
				var options = {
					buffer: "var xxx;var obj = { foo : function inner() { xxx = 0; } }xx",
					prefix: "xx",
					offset: 59,
					callback: done
				};
				return testProposals(options, [
					["xxx", "xxx : number"]
				]);
			});
			it("test this reference 1", function(done) {
				var options = {
					buffer: "var xxxx;\nthis.x",
					prefix: "x",
					offset: 16,
					callback: done
				};
				return testProposals(options, [
					["xxxx", "xxxx : any"]
				]);
			});
			it("test binary expression 1", function(done) {
				var options = {
					buffer: "(1+3).toF",
					prefix: "toF",
					offset: 9,
					callback: done
				};
				return testProposals(options, [
					['', 'ecma5'],
					["toFixed(digits)", "toFixed(digits) : string"]
				]);
			});
			it("test for loop 1", function(done) {
				var options = {
					buffer: "for (var ii=0;i<8;ii++) { ii }",
					prefix: "i",
					offset: 15,
					callback: done
				};
				return testProposals(options, [
					["ii", "ii : number"],
					['', 'ecma5'],
					["isFinite(value)", "isFinite(value) : bool"],
					["isNaN(value)", "isNaN(value) : bool"],
					["isPrototypeOf(obj)", "isPrototypeOf(obj) : bool"],
					["Infinity", "Infinity : number"],
					['', 'ecma6'],
					['Int16Array(size)', 'Int16Array(size)'],
					['Int32Array(size)', 'Int32Array(size)'],
					['Int8Array(size)', 'Int8Array(size)']
				]);
			});
			it("test for loop 2", function(done) {
				var options = {
					buffer: "for (var ii=0;ii<8;i++) { ii }",
					prefix: "i",
					offset: 20,
					callback: done
				};
				return testProposals(options, [
					["ii", "ii : number"],
					['', 'ecma5'],
					["isFinite(value)", "isFinite(value) : bool"],
					["isNaN(value)", "isNaN(value) : bool"],
					["isPrototypeOf(obj)", "isPrototypeOf(obj) : bool"],
					["Infinity", "Infinity : number"],
					['', 'ecma6'],
					['Int16Array(size)', 'Int16Array(size)'],
					['Int32Array(size)', 'Int32Array(size)'],
					['Int8Array(size)', 'Int8Array(size)']
				]);
			});
			it("test for loop 3", function(done) {
				var options = {
					buffer: "for (var ii=0;ii<8;ii++) { i }",
					prefix: "i",
					offset: 28,
					callback: done
				};
				return testProposals(options, [
					["ii", "ii : number"],
					['', 'ecma5'],
					["isFinite(value)", "isFinite(value) : bool"],
					["isNaN(value)", "isNaN(value) : bool"],
					["isPrototypeOf(obj)", "isPrototypeOf(obj) : bool"],
					["Infinity", "Infinity : number"],
					['', 'ecma6'],
					['Int16Array(size)', 'Int16Array(size)'],
					['Int32Array(size)', 'Int32Array(size)'],
					['Int8Array(size)', 'Int8Array(size)']
				]);
			});
			it("test while loop 1", function(done) {
				var options = {
					buffer: "var iii;\nwhile(ii === null) {\n}",
					prefix: "ii",
					offset: 17,
					callback: done
				};
				return testProposals(options, [
					["iii", "iii : any"]
				]);
			});
			it("test while loop 2", function(done) {
				var options = {
					buffer: "var iii;\nwhile(this.ii === null) {\n}",
					prefix: "ii",
					offset: 22,
					callback: done
				};
				return testProposals(options, [
					["iii", "iii : any"]
				]);
			});
			it("test while loop 3", function(done) {
				var options = {
					buffer: "var iii;\nwhile(iii === null) {this.ii\n}",
					prefix: "ii",
					offset: 37,
					callback: done
				};
				return testProposals(options, [
					["iii", "iii : any"]
				]);
			});
			it("test catch clause 1", function(done) {
				var options = {
					buffer: "try { } catch (eee) {e  }",
					prefix: "e",
					offset: 22,
					callback: done
				};
				return testProposals(options, [
					["eee", "eee : Error"],
					["", "ecma5"],
					['Error(message)', 'Error(message)'],
					['EvalError(message)', 'EvalError(message)'],
					["encodeURI(uri)", "encodeURI(uri) : string"],
					["encodeURIComponent(uri)", "encodeURIComponent(uri) : string"],
					["eval(code)", "eval(code)"]
				]);
			});
			it("test catch clause 2", function(done) {
				// the type of the catch variable is Error
				var options = {
					buffer: "try { } catch (eee) {\neee.me  }",
					prefix: "me",
					offset: 28,
					callback: done
				};
				return testProposals(options, [
					['', 'ecma5'],
					["message", "message : string"]
				]);
			});
			/**
			 * Tests RegExp proposals
			 * @see https://bugs.eclipse.org/bugs/show_bug.cgi?id=426733
			 * @since 7.0
			 */
			it("test RegExp literal 1", function(done) {
				var options = {
					buffer: "/^.*/.t",
					prefix: "t",
					offset: 6,
					callback: done};
				testProposals(options, [
						['', 'ecma5'],
						['test(input)', 'test(input) : bool'],
						['toLocaleString()', 'toLocaleString() : string'],
						['toString()', 'toString() : string'],
					]);
			});

			/**
			 * Tests RegExp proposals
			 * @see https://bugs.eclipse.org/bugs/show_bug.cgi?id=426733
			 * @since 7.0
			 */
			it("test RegExp literal 2", function(done) {
				var options = {
					buffer: "/^.*/.e",
					prefix: "e",
					offset: 7,
					callback: done};
				testProposals(options, [
						['', 'ecma5'],
						['exec(input)', 'exec(input) : [string]']
					]);
			});

			/**
			 * Tests proposal doc for function expressions
			 * @see https://bugs.eclipse.org/bugs/show_bug.cgi?id=458693
			 * @since 8.0
			 */
			it("test func expr doc 1", function(done) {
				var options = {
					buffer: "var f = { /** \n* @returns {Array.<String>} array or null\n*/\n one: function() {}};\n f.",
					prefix: "o",
					offset: 85,
					callback: done};
				testProposals(options, [
				//TODO should we use guessing here?
					['one()', 'one()']
				]);
			});

			/**
			 * Tests proposal doc for function expressions
			 * @see https://bugs.eclipse.org/bugs/show_bug.cgi?id=458693
			 * @since 8.0
			 */
			it("test func expr doc 2", function(done) {
				var options = {
					buffer: "var f = { /** \n* @return {Array.<String>} array or null\n*/\n one: function() {}};\n f.",
					prefix: "o",
					offset: 84,
					callback: done};
				testProposals(options, [
					['one()', 'one()']
				]);
			});

			/**
			 * Tests proposal doc for function decls
			 * @see https://bugs.eclipse.org/bugs/show_bug.cgi?id=458693
			 * @since 8.0
			 */
			it("test func decl doc 1", function(done) {
				var options = {
					buffer: "/** @returns {Object} Something or nothing */ function z(a) {} z",
					prefix: "z",
					offset: 64,
					callback: done};
				testProposals(options, [
					['z(a)', 'z(a) : {}']
				]);
			});
		});
		describe('Function Templates and Keywords', function() {
			/**
			 * https://bugs.eclipse.org/bugs/show_bug.cgi?id=425675
			 * @since 5.0
			 */
			it("test completions for Function1", function(done) {
				var options = {
					buffer: "var foo; foo !== null ? fun : function(f2) {};",
					prefix: "fun",
					offset: 27,
					templates: true,
					keywords: true,
					callback: done};
				return testProposals(options, [
						//proposal, description
						['', 'ecma5'],
						['Function(body)', 'Function(body) : fn()'],
						["", "Templates"],
						["/**\n * @param parameter\n */\nfunction name (parameter) {\n\t\n}", "function declaration"],
						['', 'Keywords'],
						["function", "function"]
						]);
			});
			/**
			 * https://bugs.eclipse.org/bugs/show_bug.cgi?id=425675
			 * @since 5.0
			 */
			it("test completions for Function2", function(done) {
				var options = {
					buffer: "var foo; foo !== null ? function(f2) {} : fun;",
					prefix: "fun",
					offset: 45,
					templates: true,
					keywords: true,
					callback: done
				};
				return testProposals(options, [
						//proposal, description
						['', 'ecma5'],
						['Function(body)', 'Function(body) : fn()'],
						["", "Templates"],
						["/**\n * @param parameter\n */\nfunction name (parameter) {\n\t\n}", "function declaration"],
						['', 'Keywords'],
						["function", "function"]
						]);
			});
			/**
			 * https://bugs.eclipse.org/bugs/show_bug.cgi?id=425675
			 * @since 5.0
			 */
			it("test completions for Function3", function(done) {
				var options = {
					buffer: "var foo = {f: fun};",
					prefix: 'fun',
					offset: 17,
					templates: true,
					keywords: true,
					callback: done
				};
				return testProposals(options, [
						//proposal, description
						['', 'ecma5'],
						['Function(body)', 'Function(body) : fn()'],
						["", "Templates"],
						['function(parameter) {\n\t\n}', 'function expression (as property value)'],
						['', 'Keywords'],
						["function", "function"]
						]);
			});
			/**
			 * https://bugs.eclipse.org/bugs/show_bug.cgi?id=425675
			 * @since 5.0
			 */
			it("test completions for Function4", function(done) {
				var options = {
					buffer: "var foo = {f: fun};",
					prefix: 'fun',
					offset: 17,
					templates: true,
					keywords: true,
					callback: done
				};
				return testProposals(options, [
						//proposal, description
						['', 'ecma5'],
						['Function(body)', 'Function(body) : fn()'],
						["", "Templates"],
						['function(parameter) {\n\t\n}', 'function expression (as property value)'],
						['', 'Keywords'],
						["function", "function"]
						]);
			});
			/**
			 * https://bugs.eclipse.org/bugs/show_bug.cgi?id=425675
			 * @since 5.0
			 */
			it("test completions for Function5", function(done) {
				var options = {
					buffer: "fun",
					prefix: 'fun',
					offset: 3,
					templates: true,
					keywords: true,
					callback: done
				};
				return testProposals(options, [
						//proposal, description
						['', 'ecma5'],
						['Function(body)', 'Function(body) : fn()'],
						["", "Templates"],
						["/**\n * @param parameter\n */\nfunction name (parameter) {\n\t\n}", "function declaration"],
						['', 'Keywords'],
						["function", "function"]
						]);
			});
			/*
			 * https://bugs.eclipse.org/bugs/show_bug.cgi?id=426284
			 * @since 6.0
			 */
			it("test completions for Function6", function(done) {
				var options = {
					buffer: "var foo = {f: t};",
					prefix: 't',
					offset: 15,
					keywords:true,
					templates:true,
					callback: done
				};
				return testProposals(options, [
						//proposal, description
						['', 'ecma5'],
						['TypeError(message)', 'TypeError(message)'],
						["toLocaleString()", "toLocaleString() : string"],
						["toString()", "toString() : string"],
						['', 'Keywords'],
						["this", "this"],
						['throw', 'throw'],
						['try', 'try'],
						["typeof", "typeof"]
						]);
			});
			/**
			 * https://bugs.eclipse.org/bugs/show_bug.cgi?id=426284
			 * @since 6.0
			 */
			it("test completions for Function7", function(done) {
				var options = {
					buffer: "var foo = {f: h};",
					prefix: 'h',
					offset: 15,
					keywords: true,
					templates: true,
					callback: done
				};
				return testProposals(options, [
						['', 'ecma5'],
						['hasOwnProperty(prop)', 'hasOwnProperty(prop) : bool']
						]);
			});

			/**
			 * https://bugs.eclipse.org/bugs/show_bug.cgi?id=426284
			 * @since 6.0
			 */
			it("test completions for Function8", function(done) {
				var options = {
					buffer: "var foo = {f: n};",
					prefix: 'n',
					offset: 15,
					keywords: true,
					templates: true,
					callback: done
				};
				return testProposals(options, [
						//proposal, description
						['', 'ecma5'],
						['Number(value)', 'Number(value) : number'],
						['NaN', 'NaN : number'],
						['', 'Keywords'],
						["new", "new"]
						]);
			});
		});
		describe('ESLint Directive Tests', function() {
			before("Start server for directive tests", function(done) {
				worker.start(done, {options: {plugins: {amqp:{env:'amqp'}, express:{env:'express'}, mongodb:{env:'mongodb'}, mysql:{env:'mysql'}, postgres:{env:'pg'}, redis:{env:'redis'}}}});
			});
			/**
			 * Tests the eslint* templates in source
			 * @see https://bugs.eclipse.org/bugs/show_bug.cgi?id=440569
			 */
			it("test eslint* template 1", function(done) {
				var options = {
					buffer: "es",
					prefix: "es",
					offset: 2,
					callback: done,
					templates: true
				};
				testProposals(options, [
					['', 'Templates'],
				    ['/* eslint rule-id:0/1*/', 'eslint'],
				    ['/* eslint-disable rule-id */', 'eslint-disable'],
				    ['/* eslint-enable rule-id */', 'eslint-enable'],
				    ['/* eslint-env library*/', 'eslint-env']]
				);
			});
			/**
			 * Tests the eslint* templates in comments
			 * @see https://bugs.eclipse.org/bugs/show_bug.cgi?id=440569
			 */
			it("test eslint* template 2", function(done) {
				var options = {
					buffer: "/* es",
					prefix: "es",
					offset: 5,
					callback: done,
					templates: true
				};
				testProposals(options, [
				    ['eslint rule-id:0/1 ', 'eslint'],
				    ['eslint-disable rule-id ', 'eslint-disable'],
				    ['eslint-enable rule-id ', 'eslint-enable'],
				    ['eslint-env amd', 'eslint-env']]  // When inside a comment we auto open content assist, selecting the first value
				);
			});
			/**
			 * Tests the eslint* templates in comments
			 * @see https://bugs.eclipse.org/bugs/show_bug.cgi?id=440569
			 */
			it("test eslint* template 3", function(done) {
				var options = {
					buffer: "/* es */",
					prefix: "es",
					offset: 5,
					callback: done,
					templates: true
				};
				testProposals(options, [
				    ['eslint rule-id:0/1 ', 'eslint'],
				    ['eslint-disable rule-id ', 'eslint-disable'],
				    ['eslint-enable rule-id ', 'eslint-enable'],
				    ['eslint-env amd', 'eslint-env']]  // When inside a comment we auto open content assist, selecting the first value
				);
			});
			/**
			 * Tests the eslint* templates in comments
			 * @see https://bugs.eclipse.org/bugs/show_bug.cgi?id=440569
			 */
			it("test eslint* template 4", function(done) {
				var options = {
					buffer: "var f; /* es",
					prefix: "es",
					offset: 12,
					callback: done,
					templates: true
				};
				testProposals(options, []
				);
			});
			/**
			 * Tests that no eslint* templates are in jsdoc comments
			 * @see https://bugs.eclipse.org/bugs/show_bug.cgi?id=440569
			 */
			it("test eslint* template 5", function(done) {
				var options = {
					buffer: "/** es",
					prefix: "es",
					offset: 6,
					callback: done,
					templates: true
				};
				testProposals(options, []);
			});
			/**
			 * Tests that eslint* templates will be proposed further in comment with no content beforehand.
			 *
			 * This test does not test a scenario from the real world - you can never activate assist past the end of a file.
			 * i.e. the offset of 10 is 2 past the end of the file
			 * @see https://bugs.eclipse.org/bugs/show_bug.cgi?id=440569
			 * @since 7.0
			 */
			it("test eslint* template 6", function(done) {
				var options = {
					buffer: "/* \n\n es",
					prefix: "es",
					offset: 10,
					callback: done,
					templates: true
				};
				testProposals(options, [
					// ['','Templates'],
					// ['/* eslint rule-id:0/1*/', 'eslint'],
					// ['/* eslint-disable rule-id */', 'eslint-disable'],
					// ['/* eslint-enable rule-id */', 'eslint-enable'],
					// ['/* eslint-env library*/', 'eslint-env']
				]);
			});

			/**
			 * Tests that eslint* templates will be proposed further in comment with no content beforehand.
			 * This test actually tests the real world behavior
			 * @see https://bugs.eclipse.org/bugs/show_bug.cgi?id=440569
			 * @since 7.0
			 */
			it("test eslint* template 6a", function(done) {
				var options = {
					buffer: "/* \n\n es",
					prefix: "es",
					offset: 8,
					callback: done,
					templates: true
				};
				testProposals(options, [
				]);
			});
			/**
			 * Tests that no eslint* templates are in comments after other content
			 * @see https://bugs.eclipse.org/bugs/show_bug.cgi?id=440569
			 * @since 7.0
			 */
			it.skip("test eslint* template 7", function(done) {
				var options = {
					buffer: "/* foo \n\n es",
					prefix: "es",
					offset: 10,
					callback: done,
					templates: true
				};
				testProposals(options, []);
			});
			/**
			 * Tests that no eslint* templates are proposed when there is already one
			 * @see https://bugs.eclipse.org/bugs/show_bug.cgi?id=440569
			 * @since 7.0
			 */
			it("test eslint* template 9", function(done) {
				var options = {
					buffer: "/* eslint ",
					prefix: "eslint",
					offset: 9,
					callback: done,
					templates: true
				};
	            testProposals(options, [
				    ['eslint rule-id:0/1 ', 'eslint'],
				    ['eslint-disable rule-id ', 'eslint-disable'],
				    ['eslint-enable rule-id ', 'eslint-enable'],
				    ['eslint-env amd', 'eslint-env']] // When inside a comment we auto open content assist, selecting the first value
				);
			});
			/**
			 * Tests that eslint-env environs are proposed
			 * @see https://bugs.eclipse.org/bugs/show_bug.cgi?id=440569
			 * @since 7.0
			 */
			it("test eslint-env proposals 1", function(done) {
				var options = {
					buffer: "/* eslint-env ",
					prefix: "",
					offset: 14,
					callback: done,
					templates: true
				};
				testProposals(options, [
					['amd', 'amd'],
					['amqp', 'amqp'],
					['applescript' , 'applescript'],
					['atomtest' , 'atomtest'],
					['browser', 'browser'],
					['commonjs', 'commonjs'],
					['embertest', 'embertest'],
					['es6', 'es6'],
					['express', 'express'],
					['greasemonkey', 'greasemonkey'],
					['jasmine', 'jasmine'],
					['jest', 'jest'],
					['jquery', 'jquery'],
					['meteor', 'meteor'],
					['mocha', 'mocha'],
					['mongo', 'mongo'],
					['mongodb', 'mongodb'],
					['mysql', 'mysql'],
					['nashorn', 'nashorn'],
					['node', 'node'],
					['pg', 'pg'],
					['phantomjs', 'phantomjs'],
					['prototypejs', 'prototypejs'],
					['protractor', 'protractor'],
					['qunit', 'qunit'],
					['redis', 'redis'],
					['serviceworker', 'serviceworker'],
					['shared-node-browser', 'shared-node-browser'],
					['shelljs', 'shelljs'],
					['webextensions', 'webextensions'],
					['worker', 'worker']
				]);
			});
			/**
			 * Tests that eslint-env environs are proposed
			 * @see https://bugs.eclipse.org/bugs/show_bug.cgi?id=440569
			 * @since 7.0
			 */
			it("test eslint-env proposals 2", function(done) {
				var options = {
					buffer: "/* eslint-env a",
					prefix: "a",
					offset: 15,
					callback: done,
					templates: true
				};
				testProposals(options, [
					['amd', 'amd'],
					['amqp', 'amqp'],
					['applescript', 'applescript'],
					['atomtest' , 'atomtest'],
				]);
			});
			/**
			 * Tests that eslint rules are proposed
			 * @see https://bugs.eclipse.org/bugs/show_bug.cgi?id=440569
			 * @since 7.0
			 */
			it("test eslint rule proposals 1", function(done) {
				var options = {
					buffer: "/* eslint cu",
					prefix: "cu",
					offset: 12,
					callback: done,
					templates: true
				};
				testProposals(options, [
				     ['curly', 'curly']
				     ]);
			});
			/**
			 * Tests that eslint rules are proposed
			 * @see https://bugs.eclipse.org/bugs/show_bug.cgi?id=440569
			 * @since 7.0
			 */
			it("test eslint rule proposals 2", function(done) {
				var options = {
					buffer: "/* eslint no-js",
					prefix: "no-js",
					offset: 15,
					callback: done,
					templates: true
				};
				testProposals(options, [
				     ['no-jslint', 'no-jslint'],
				     ]);
			});
			/**
			 * Tests that eslint rules are proposed
			 * @see https://bugs.eclipse.org/bugs/show_bug.cgi?id=440569
			 * @since 7.0
			 */
			it("test eslint rule proposals 3", function(done) {
				var options = {
					buffer: "/* eslint-enable no-js",
					prefix: "no-js",
					offset: 22,
					callback: done,
					templates: true
				};
				testProposals(options, [
				     ['no-jslint', 'no-jslint'],
				     ]);
			});
			/**
			 * Tests that eslint rules are proposed
			 * @see https://bugs.eclipse.org/bugs/show_bug.cgi?id=440569
			 * @since 7.0
			 */
			it("test eslint rule proposals 4", function(done) {
				var options = {
					buffer: "/* eslint-disable no-js",
					prefix: "no-js",
					offset: 23,
					callback: done,
					templates: true
				};
				testProposals(options, [
				     ['no-jslint', 'no-jslint'],
				     ]);
			});
			/**
			 * Tests that eslint rules are proposed
			 * @see https://bugs.eclipse.org/bugs/show_bug.cgi?id=440569
			 * @since 7.0
			 */
			it("test eslint rule proposals 5", function(done) {
				var options = {
					buffer: "/* eslint-enable no-jslint, cu",
					prefix: "cu",
					offset: 30,
					callback: done,
					templates: true
				};
				testProposals(options, [
				     ['curly', 'curly']
				     ]);
			});
		});
		describe('MySQl Index Tests', function() {
			before("Start server for mysql index tests", function(done) {
				worker.start(done, {options:{plugins:{mysql:{}, node:{}}, libs:['ecma6']}});
			});
			/*
			 * Tests mysql index
			 * @see https://bugs.eclipse.org/bugs/show_bug.cgi?id=426486
			 * @since 7.0
			 */
			it("test mysql index 1", function(done) {
				var options = {
					buffer: "/*eslint-env mysql*/ require('mysql').createP",
					prefix: "createP",
					offset: 45,
					callback: done
				};
				testProposals(options, [
					['', 'mysql'],
				    ['createPool(config)', 'createPool(config) : mysql.Pool'],
				    ['createPoolCluster(config?)', 'createPoolCluster(config?) : mysql.PoolCluster']
				]);
			});
			/*
			 * Tests mysql index
			 * @see https://bugs.eclipse.org/bugs/show_bug.cgi?id=426486
			 * @since 7.0
			 */
			it("test mysql index 2", function(done) {
				var options = {
					buffer: "/*eslint-env mysql*/ require('mysql').createPoolC",
					prefix: "createPoolC",
					offset: 49,
					callback: done
				};
				testProposals(options, [
					['', 'mysql'],
				    ['createPoolCluster(config?)', 'createPoolCluster(config?) : mysql.PoolCluster']
				]);
			});
			/*
			 * Tests mysql index
			 * @see https://bugs.eclipse.org/bugs/show_bug.cgi?id=426486
			 * @since 7.0
			 */
			it("test mysql index 3", function(done) {
				var options = {
					buffer: "/*eslint-env mysql*/ require('mysql').createC",
					prefix: "createC",
					offset: 45,
					callback: done
				};
				testProposals(options, [
					['', 'mysql'],
				    ['createConnection(connectionUri)', 'createConnection(connectionUri) : mysql.Connection']
				]);
			});
			/*
			 * Tests mysql index for indirect proposals
			 * @see https://bugs.eclipse.org/bugs/show_bug.cgi?id=426486
			 * @since 7.0
			 */
			it("test mysql index 4", function(done) {
				var options = {
					buffer: "/*eslint-env mysql*/ require('mysql').createQuery(null,null,null).star",
					prefix: "star",
					offset: 70,
					callback:done
				};
				testProposals(options, [
					['', 'node'],
				    ['start(options)', 'start(options) : events.EventEmitter'],
					['', 'mysql'],
				    ['start()', 'start()'],
				    ['', 'ecma6'],
				    ['startsWith(searchString, position?)', 'startsWith(searchString, position?) : bool']
				]);
			});
			/**
			 * Tests no proposals are returned without the eslint-env directive
			 * @since 10.0
			 */
			it("test mysql empty 1", function(done) {
				var options = {
					buffer: "require('mysql').createC",
					prefix: "createC",
					offset: 24,
					callback:done
				};
				testProposals(options, [
					['', 'mysql'],
				    ['createConnection(connectionUri)', 'createConnection(connectionUri) : mysql.Connection']
				]);
			});
		});
		describe('Redis Index Tests', function() {
			before("Start server for redis index tests", function(done) {
				worker.start(done, {options:{plugins:{node: {}, redis:{}}}});
			});
			/**
			 * Tests redis index indirect proposals
			 * @see https://bugs.eclipse.org/bugs/show_bug.cgi?id=426486
			 * @since 7.0
			 */
			it("test redis index 1", function(done) {
				var options = {
					buffer: "/*eslint-env redis*/ require('redis').createClient(null, null, null).a",
					prefix: "a",
					offset: 70,
					callback: done};
				testProposals(options, [
					['', 'redis'],
				    ['append(key, value, callback?)', 'append(key, value, callback?)'],
				    ['auth(password, callback?)', 'auth(password, callback?)']
				]);
			});

			/**
			 * Tests redis index
			 * @see https://bugs.eclipse.org/bugs/show_bug.cgi?id=426486
			 * @since 7.0
			 */
			it("test redis index 2", function(done) {
				var options = {
					buffer: "/*eslint-env redis*/ require('redis').c",
					prefix: "c",
					offset: 39,
					callback: done};
				testProposals(options, [
					['', 'redis'],
				    ['createClient(port_arg, host_arg?, options?)', 'createClient(port_arg, host_arg?, options?) : RedisClient'],
				    ['ClientOpts', 'ClientOpts : any']
				]);
			});

			/**
			 * Tests redis index
			 * @see https://bugs.eclipse.org/bugs/show_bug.cgi?id=426486
			 * @since 10.0
			 */
			it("test redis index no proposals 1", function(done) {
				var options = {
					buffer: "require('redis').c",
					prefix: "c",
					offset: 18,
					callback: done};
				testProposals(options, [
					['', 'redis'],
				    ['createClient(port_arg, host_arg?, options?)', 'createClient(port_arg, host_arg?, options?) : RedisClient'],
				    ['ClientOpts', 'ClientOpts : any']
				]);
			});
		});
		describe('Postgres Index Tests', function() {
			before("Start server for postgres index tests", function(done) {
				worker.start(done, {options:{plugins:{node:{}, postgres:{}}}});
			});
			/**
			 * Tests pg index indirect proposals
			 * @see https://bugs.eclipse.org/bugs/show_bug.cgi?id=426486
			 * @since 7.0
			 */
			it("test pg index 1", function(done) {
				var options = {
					buffer: "/*eslint-env pg*/require('pg').c",
					prefix: "c",
					offset: 32,
					callback: done};
				testProposals(options, [
					['', 'pg'],
					['Client(connection)', 'Client(connection)'],
				    ['connect(connection, callback)', 'connect(connection, callback)'],
				]);
			});

			/**
			 * Tests redis index
			 * @see https://bugs.eclipse.org/bugs/show_bug.cgi?id=426486
			 * @since 7.0
			 */
			it("test pg index 2", function(done) {
				var options = {
					buffer: "/*eslint-env pg*/require('pg').Cl",
					prefix: "Cl",
					offset: 33,
					callback: done};
				testProposals(options, [
					['', 'pg'],
				    ['Client(connection)', 'Client(connection)']
				]);
			});
			/**
			 * Tests redis index
			 * @see https://bugs.eclipse.org/bugs/show_bug.cgi?id=426486
			 * @since 10.0
			 */
			it("test pg index no proposals 1", function(done) {
				var options = {
					buffer: "require('pg').Cl",
					prefix: "Cl",
					offset: 16,
					callback: done};
				testProposals(options, [
					['', 'pg'],
				    ['Client(connection)', 'Client(connection)']
				]);
			});
			describe("PascalCase heuristic", function () {
				it("Functions with PascalCase name get recognized as prototype/class", function(done) {
					var options = {
						buffer: "function Foo() {} Foo",
						prefix: "Foo",
						offset: 18,
						callback: done};
					return testProposals(options, [
						["Foo()", "Foo()", "Foo()", undefined, "iconClass"]
					]);
				});
				it("Functions with camelCase name get recognized as function", function(done) {
					var options = {
						buffer: "function foo() {} foo",
						prefix: "foo",
						offset: 18,
						callback: done};
					return testProposals(options, [
						["foo()", "foo()", "foo()", undefined, "iconFunction"]
					]);
				});
			});
		});
		describe('Comment Assist Tests', function() {
			before("Start server for redis index tests", function(done) {
				worker.start(done, {options:{libs:['ecma5', 'ecma6', 'browser']}});
			});
			/**
			 * Tests line comments
			 * @see https://bugs.eclipse.org/bugs/show_bug.cgi?id=443521
			 * @since 7.0
			 */
			it("test line comment 1", function(done) {
				var options = {
					buffer: "//  ",
					prefix: "",
					offset: 4,
					callback: done};
				testProposals(options, []);
			});

			/**
			 * Tests line comments
			 * @see https://bugs.eclipse.org/bugs/show_bug.cgi?id=443521
			 * @since 7.0
			 */
			it("test line comment 2", function(done) {
				var options = {
					buffer: "// foo ",
					prefix: "",
					offset: 3,
					callback: done};
				testProposals(options, []);
			});

			/**
			 * Tests line comments
			 * @see https://bugs.eclipse.org/bugs/show_bug.cgi?id=443521
			 * @since 7.0
			 */
			it("test line comment 3", function(done) {
				var options = {
					buffer: "// foo ",
					prefix: "",
					offset: 7,
					callback: done};
				testProposals(options, []);
			});

			/**
			 * Tests line comments
			 * @see https://bugs.eclipse.org/bugs/show_bug.cgi?id=443521
			 * @since 7.0
			 */
			it("test line comment 4", function(done) {
				var options = {
					buffer: "// cur ",
					prefix: "c",
					offset: 4,
					callback: done};
				testProposals(options, []);
			});

			/**
			 * Tests line comments
			 * @see https://bugs.eclipse.org/bugs/show_bug.cgi?id=443521
			 * @since 7.0
			 */
			it("test line comment 5", function(done) {
				var options = {
					buffer: "// es ",
					prefix: "es",
					offset: 5,
					callback: done};
				testProposals(options, []);
			});

			/**
			 * Tests line comments
			 * @see https://bugs.eclipse.org/bugs/show_bug.cgi?id=444001
			 * @since 7.0
			 */
			it("test line comment 6", function(done) {
				var options = {
					buffer: "// .",
					prefix: "",
					offset: 4,
					callback: done};
				testProposals(options, []);
			});

			/**
			 * Tests line comments
			 * @see https://bugs.eclipse.org/bugs/show_bug.cgi?id=444001
			 * @since 7.0
			 */
			it("test line comment 7", function(done) {
				var options = {
					buffer: "// . es",
					prefix: "",
					offset: 4,
					callback: done};
				testProposals(options, []);
			});

			/**
			 * Tests line comments
			 * @see https://bugs.eclipse.org/bugs/show_bug.cgi?id=444001
			 * @since 7.0
			 */
			it("test line comment 8", function(done) {
				var options = {
					buffer: "// es .",
					prefix: "",
					offset: 7,
					callback: done};
				testProposals(options, []);
			});
			/**
			 * Tests the author tag insertion
			 * @see https://bugs.eclipse.org/bugs/show_bug.cgi?id=426185
			 * @since 7.0
			 */
			it("test author tag", function(done) {
				var options = {
					buffer: "/**\n* @a \n*/",
					prefix: "@a",
					offset: 8,
					templates: true,
					callback: done};
				testProposals(options, [
					['@abstract', '@abstract'],
					['@access', '@access'],
					['@alias', '@alias'],
					['@augments', '@augments'],
				    ['@author ', '@author']
				]);
			});
			/**
			 * Tests the lends tag insertion
			 * @see https://bugs.eclipse.org/bugs/show_bug.cgi?id=426185
			 * @since 7.0
			 */
			it("test lends tag", function(done) {
				var options = {
					buffer: "/**\n* @name foo\n* @l \n*/",
					prefix: "@l",
					offset: 20,
					templates: true,
					callback: done};
				testProposals(options, [
					['@lends ', '@lends'],
					['@license ', '@license'],
					['@listens', '@listens'],
				]);
			});
			/**
			 * Tests the function name insertion for a function decl with no prefix
			 * @see https://bugs.eclipse.org/bugs/show_bug.cgi?id=426185
			 * @since 7.0
			 */
			it("test name tag completion 1", function(done) {
				var options = {
					buffer: "/**\n* @name  \n*/ function a(){}",
					line: '* @name  ',
					prefix: "",
					offset: 13,
					callback: done};
				testProposals(options, [
				     ['a', 'a - The name of the function']
				]);
			});
			/**
			 * Tests the function name insertion for a function decl with no prefix
			 * @see https://bugs.eclipse.org/bugs/show_bug.cgi?id=426185
			 * @since 10.0
			 */
			it("test name tag completion 1a - no space", function(done) {
				var options = {
					buffer: "/**\n* @name  \n*/function a(){}",
					prefix: "",
					line: '* @name  ',
					offset: 13,
					callback: done};
				testProposals(options, [
				     ['a', 'a - The name of the function']
				]);
			});
			/**
			 * Tests the function name insertion for a function decl with a prefix
			 * @see https://bugs.eclipse.org/bugs/show_bug.cgi?id=426185
			 * @since 7.0
			 */
			it("test name tag completion 2", function(done) {
				var options = {
					buffer: "/**\n* @name  \n*/ function bar(){}",
					line: '* @name  ',
					prefix: "b",
					offset: 13,
					callback: done};
				testProposals(options, [
				     ['bar', 'bar - The name of the function']
				]);
			});
			/**
			 * Tests the function name insertion for a object property with function expr with no prefix
			 * @see https://bugs.eclipse.org/bugs/show_bug.cgi?id=426185
			 * @since 7.0
			 */
			it("test name tag completion 3", function(done) {
				var options = {
					buffer: "var o = {/**\n* @name  \n*/f: function bar(){}}",
					line: '* @name  ',
					prefix: "",
					offset: 21,
					callback: done};
				testProposals(options, [
				     ['bar', 'bar - The name of the function']
				]);
			});
			/**
			 * Tests the function name insertion for a object property with function expr with a prefix
			 * @see https://bugs.eclipse.org/bugs/show_bug.cgi?id=426185
			 * @since 7.0
			 */
			it("test name tag completion 4", function(done) {
				var options = {
					buffer: "var o = {/**\n* @name  \n*/f: function bar(){}}",
					line: '* @name  ',
					prefix: "b",
					offset: 21,
					callback: done};
				testProposals(options, [
				     ['bar', 'bar - The name of the function']
				]);
			});
			/**
			 * Tests the function name insertion for a object property with function expr with no prefix
			 * @see https://bugs.eclipse.org/bugs/show_bug.cgi?id=426185
			 * @since 7.0
			 */
			it("test name tag completion 5", function(done) {
				var options = {
					buffer: "/**\n* @name  \n*/ Foo.bar.baz = function(){}",
					line: '* @name  ',
					prefix: "",
					offset: 12,
					callback: done};
				testProposals(options, [
				     ['Foo.bar.baz', 'Foo.bar.baz - The name of the function']
				]);
			});
			/**
			 * Tests the function name insertion for a object property with function expr with a prefix
			 * @see https://bugs.eclipse.org/bugs/show_bug.cgi?id=426185
			 * @since 7.0
			 */
			it("test name tag completion 6", function(done) {
				var options = {
					buffer: "/**\n* @name  \n*/ Foo.bar.baz = function(){}",
					line: '* @name  ',
					prefix: "Foo",
					offset: 12,
					callback: done};
				testProposals(options, [
				     ['Foo.bar.baz', 'Foo.bar.baz - The name of the function']
				]);
			});
			/**
			 * Tests no proposals for assignment expression
			 * @see https://bugs.eclipse.org/bugs/show_bug.cgi?id=426185
			 * @since 7.0
			 */
			it("test name tag completion 6a", function(done) {
				var options = {
					buffer: "/**\n* @name f \n*/Foo.bar.baz = function(){}",
					line: '* @name f ',
					prefix: "",
					offset: 14,
					callback: done};
				testProposals(options, []);
			});
			/**
			 * Tests @param tag template proposal
			 * @since 11.0
			 */
			it("test param tag template completion 1", function(done) {
				var options = {
					buffer: "/**\n* @para\n@return nothing \n*/function foo(aa){}",
					line: '* @para',
					prefix: "@para",
					offset: 11,
					callback: done};

				testProposals(options, [
				    ['@param {type} ', '@param', 'Document the parameter', {length: 4, offset: 14}]  // Check that the selection offset is right
				]);
			});
			/**
			 * Tests @param tag template proposal
			 * @since 11.0
			 */
			it("test param tag template completion 2", function(done) {
				var options = {
					buffer: "/**\n* @par\n@return nothing \n*/function foo(aa){}",
					line: '* @par',
					prefix: "@par",
					offset: 10,
					callback: done};

				testProposals(options, [
				    ['@param {type} ', '@param', 'Document the parameter', {length: 4, offset: 14}]  // Check that the selection offset is right
				]);
			});
			/**
			 * Tests func decl param name proposals no prefix, no type
			 * @see https://bugs.eclipse.org/bugs/show_bug.cgi?id=426185
			 * @since 7.0
			 */
			it("test param name completion 1", function(done) {
				var options = {
					buffer: "/**\n* @param  \n*/ function a(a, b, c){}",
					line: '* @param  ',
					prefix: "",
					offset: 13,
					callback: done};
				testProposals(options, [
				     ['a', 'a - Function parameter'],
				     ['b', 'b - Function parameter'],
				     ['c', 'c - Function parameter']
				]);
			});
			/**
			 * Tests function parameter name completion with the any type
			 * @see https://bugs.eclipse.org/bugs/show_bug.cgi?id=521320
			 * @since 16.0
			 */
			it("test param name completion with any type", function(done) {
				var options = {
					buffer: "/**\n* @param {?} \n*/ function a(a, b, c){}",
					line: '* @param {?} ',
					prefix: "",
					offset: 13,
					callback: done};
				testProposals(options, [
				     ['a', 'a - Function parameter'],
				     ['b', 'b - Function parameter'],
				     ['c', 'c - Function parameter']
				]);
			});
			/**
			 * Tests func decl param name proposals no prefix, no type
			 * @since 10.0
			 */
			it("test param name completion whitespace 1", function(done) {
				var options = {
					buffer: "/**\n* @param  \n*/function a(a, b, c){}",
					line: '* @param  ',
					prefix: "",
					offset: 13,
					callback: done};
				testProposals(options, [
				  ['a', 'a - Function parameter'],
				  ['b', 'b - Function parameter'],
				  ['c', 'c - Function parameter']
				]);
			});

			/**
			 * Tests func decl param name proposals no prefix
			 * @see https://bugs.eclipse.org/bugs/show_bug.cgi?id=426185
			 * @since 7.0
			 */
			it("test param name completion 2", function(done) {
				var options = {
					buffer: "/**\n* @param {type} \n*/ function a(a, b, c){}",
					line: '* @param {type} ',
					prefix: "",
					offset: 20,
					callback: done};
				testProposals(options, [
				     ['a', 'a - Function parameter'],
				     ['b', 'b - Function parameter'],
				     ['c', 'c - Function parameter']
				]);
			});
			/**
			 * Tests func decl param name proposals a prefix
			 * @see https://bugs.eclipse.org/bugs/show_bug.cgi?id=426185
			 * @since 7.0
			 */
			it("test param name completion 3", function(done) {
				var options = {
					buffer: "/**\n* @param a \n*/ function a(aa, bb, cc){}",
					line: '* @param a ',
					prefix: "a",
					offset: 14,
					callback: done};
				testProposals(options, [
				     ['aa', 'aa - Function parameter']
				]);
			});
			/**
			 * Tests no proposals for after name
			 * @see https://bugs.eclipse.org/bugs/show_bug.cgi?id=426185
			 * @since 7.0
			 */
			it("test param name completion 4", function(done) {
				var options = {
					buffer: "/**\n* @param f  \n*/ function a(aa, bb, cc){}",
					line: '* @param f  ',
					prefix: "",
					offset: 15,
					callback: done};
				testProposals(options, []);
			});
			/**
			 * Tests object property func expr param name proposals no prefix, no type
			 * @see https://bugs.eclipse.org/bugs/show_bug.cgi?id=426185
			 * @since 7.0
			 */
			it("test param name completion 5", function(done) {
				var options = {
					buffer: "var o = {/**\n* @param  \n*/f: function a(a, b, c){}}",
					line: '* @param  ',
					prefix: "",
					offset: 22,
					callback: done};
				testProposals(options, [
				     ['a', 'a - Function parameter'],
				     ['b', 'b - Function parameter'],
				     ['c', 'c - Function parameter']
				]);
			});
			/**
			 * Tests object property func expr param name proposals no prefix
			 * @see https://bugs.eclipse.org/bugs/show_bug.cgi?id=426185
			 * @since 7.0
			 */
			it("test param name completion 6", function(done) {
				var options = {
					buffer: "var o = {/**\n* @param {type} \n*/f: function a(a, b, c){}}",
					line: '* @param {type} ',
					prefix: "",
					offset: 29,
					callback: done};
				testProposals(options, [
				     ['a', 'a - Function parameter'],
				     ['b', 'b - Function parameter'],
				     ['c', 'c - Function parameter']
				]);
			});
			/**
			 * Tests object property func expr param name proposals a prefix
			 * @see https://bugs.eclipse.org/bugs/show_bug.cgi?id=426185
			 * @since 7.0
			 */
			it("test param name completion 7", function(done) {
				var options = {
					buffer: "var o = {/**\n* @param {type} a\n*/f: function a(aa, bb, cc){}}",
					line: '* @param {type} a',
					prefix: "a",
					offset: 30,
					callback: done};
				testProposals(options, [
				     ['aa', 'aa - Function parameter']
				]);
			});
			/**
			 * Tests object property func expr param name proposals a prefix
			 * @see https://bugs.eclipse.org/bugs/show_bug.cgi?id=426185
			 * @since 7.0
			 */
			it("test param name completion 8", function(done) {
				var options = {
					buffer: "var o = {/**\n* @param {type} a \n*/f: function a(aa, bb, cc){}}",
					line: '* @param {type} a ',
					prefix: "a",
					offset: 31,
					callback: done};
				testProposals(options, []);
			});
			/**
			 * Tests assingment func expr param name proposals no prefix, no type
			 * @see https://bugs.eclipse.org/bugs/show_bug.cgi?id=426185
			 * @since 7.0
			 */
			it("test param name completion 9", function(done) {
				var options = {
					buffer: "/**\n* @param  \n*/ Foo.bar.baz = function a(a, b, c){}",
					line: '* @param  ',
					prefix: "",
					offset: 13,
					callback: done};
				testProposals(options, [
				     ['a', 'a - Function parameter'],
				     ['b', 'b - Function parameter'],
				     ['c', 'c - Function parameter']
				]);
			});
			/**
			 * Tests assingment func expr param name proposals no prefix
			 * @see https://bugs.eclipse.org/bugs/show_bug.cgi?id=426185
			 * @since 7.0
			 */
			it("test param name completion 10", function(done) {
				var options = {
					buffer: "/**\n* @param {type} \n*/ Foo.bar.baz = function a(a, b, c){}",
					line: '* @param {type} ',
					prefix: "",
					offset: 20,
					callback: done};
				testProposals(options, [
				     ['a', 'a - Function parameter'],
				     ['b', 'b - Function parameter'],
				     ['c', 'c - Function parameter']
				]);
			});
			/**
			 * Tests assingment func expr param name proposals no prefix
			 * @see https://bugs.eclipse.org/bugs/show_bug.cgi?id=426185
			 * @since 7.0
			 */
			it("test param name completion 10a", function(done) {
				var options = {
					buffer: "/**\n* @param {type} a\n*/Foo.bar.baz = function a(aa, bb, cc){}",
					line: '* @param {type} a',
					prefix: "a",
					offset: 21,
					callback: done};
				testProposals(options, [
				     ['aa', 'aa - Function parameter']
				]);
			});
			/**
			 * Tests assingment func expr param name proposals no prefix
			 * @see https://bugs.eclipse.org/bugs/show_bug.cgi?id=426185
			 * @since 7.0
			 */
			it("test param name completion 11", function(done) {
				var options = {
					buffer: "/**\n* @param {type} d\n*/ Foo.bar.baz = function a(aa, bb, cc){}",
					line: '* @param {type} d',
					prefix: "d",
					offset: 20,
					callback: done};
				testProposals(options, []);
			});

			/**
			 * Tests var decl func expr param name proposals
			 * @see https://bugs.eclipse.org/bugs/show_bug.cgi?id=473425
			 * @since 10.0
			 */
			it("test param name completion 12", function(done) {
				var options = {
					buffer: "/**\n* @param {type} d\n*/var Foo.bar.baz = function a(aa, bb, cc){}",
					line: '* @param {type} d',
					prefix: "d",
					offset: 20,
					callback: done};
				testProposals(options, []);
			});
			/**
			 * Tests var decl func expr param name proposals
			 * @see https://bugs.eclipse.org/bugs/show_bug.cgi?id=473425
			 * @since 10.0
			 */
			it("test param name completion 13", function(done) {
				var options = {
					buffer: "/**\n* @param {type} a\n*/var baz = function a(aa, bb, cc){}",
					line: '* @param {type} a',
					prefix: "a",
					offset: 21,
					callback: done};
				testProposals(options, [
					['aa', 'aa - Function parameter']
				]);
			});
			/**
			 * Tests var decl func expr param name proposals
			 * @since 11.0
			 */
			it("test param name completion 14 - period in type name", function(done) {
				var options = {
					buffer: "/**\n* @param {type.atype} a\n*/var baz = function a(aa, bb, cc){}",
					line: '* @param {type.atype} a',
					prefix: "a",
					offset: 27,
					callback: done};
				testProposals(options, [
					['aa', 'aa - Function parameter']
				]);
			});
			/**
			 * Tests var decl func expr param name proposals
			 * @since 11.0
			 */
			it("test param name completion 15 - with prefix, period in type name", function(done) {
				var options = {
					buffer: "/**\n* @param {type.atype} a\n*/var baz = function a(aa, bb, cc){}",
					line: '* @param {type.atype} a',
					prefix: "a",
					offset: 27,
					callback: done};
				testProposals(options, [
					['aa', 'aa - Function parameter']
				]);
			});

			/**
			 * Tests var decl func expr name proposals
			 * @see https://bugs.eclipse.org/bugs/show_bug.cgi?id=473425
			 * @since 10.0
			 */
			it("test param name completion 16 - no prefix, period in type name", function(done) {
				var options = {
					buffer: "/**\n* @param {type.atype} \n*/var baz = function a(aa, bb, cc){}",
					line: '* @param {type.atype} a',
					prefix: "a",
					offset: 26,
					callback: done};
				testProposals(options, [
					['aa', 'aa - Function parameter'],
					['bb', 'bb - Function parameter'],
					['cc', 'cc - Function parameter']
				]);
			});

			/**
			 * Tests var decl func expr name proposals
			 * @see https://bugs.eclipse.org/bugs/show_bug.cgi?id=473425
			 * @since 10.0
			 */
			it("test param name completion 17", function(done) {
				var options = {
					buffer: "/**\n* @name \n*/var baz = function foo(aa, bb, cc){}",
					line: '* @name ',
					prefix: "",
					offset: 12,
					callback: done};
				testProposals(options, [
					['foo', 'foo - The name of the function']
				]);
			});

			/**
			 * Tests var decl func expr name proposals
			 * @see https://bugs.eclipse.org/bugs/show_bug.cgi?id=473425
			 * @since 10.0
			 */
			it("test param name completion 18", function(done) {
				var options = {
					buffer: "/**\n* @name b\n*/var baz = function foo(aa, bb, cc){}",
					line: '* @name ',
					prefix: "b",
					offset: 13,
					callback: done};
				testProposals(options, [
				]);
			});

			/**
			 * Tests one-line JSDoc completions
			 * @see https://bugs.eclipse.org/bugs/show_bug.cgi?id=439574
			 * @since 7.0
			 */
			it("test one-line doc completion", function(done) {
				var options = {
					buffer: "Objects.mixin(Foo.prototype, /** @l  */{});",
					prefix: "@l",
					line: 'Objects.mixin(Foo.prototype, /** @l  */{});',
					offset: 35,
					templates: true,
					callback: done};
				testProposals(options, [
				    ['@lends ', '@lends'],
				    ['@license ', '@license'],
					['@listens', '@listens']
				]);
			});

			/**
			 * Tests object JSDoc completions
			 * @see https://bugs.eclipse.org/bugs/show_bug.cgi?id=426185
			 * @since 7.0
			 */
			it("test object doc completion 1", function(done) {
				var options = {
					buffer: "/**\n* @param {O \n*/",
					line: '* @param {O ',
					prefix: "O",
					offset: 15,
					callback: done};
				testProposals(options, [
					['', 'ecma5'],
					['Object', 'Object', 'Creates an object wrapper.'],
				]);
			});

			/**
			 * Tests object JSDoc completions
			 * @see https://bugs.eclipse.org/bugs/show_bug.cgi?id=426185
			 * @since 7.0
			 */
			it("test object doc completion 2", function(done) {
				var options = {
					buffer: "/**\n* @returns {T} \n*/",
					line: '* @returns {I} ',
					prefix: "I",
					offset: 17,
					callback: done};
				testProposals(options, [
					['', 'ecma5'],
					['TypeError', 'TypeError', 'Represents an error'],
					['', 'ecma6'],
					['TypedArray', 'TypedArray', 'A TypedArray object describes an array-like view of'],
				]);
			});

			/**
			 * Tests object JSDoc completions
			 * @see https://bugs.eclipse.org/bugs/show_bug.cgi?id=426185
			 * @since 7.0
			 */
			it("test object doc completion 3", function(done) {
				var options = {
					buffer: "/*eslint-env browser*//**\n* @returns {D} \n*/",
					line: '* @returns {I} ',
					prefix: "I",
					offset: 39,
					callback: done};
				testProposals(options, [
					['', 'browser'],
					['DOMParser', 'DOMParser', 'DOMParser can parse XML or HTML'],
					['DOMTokenList', 'DOMTokenList', 'This type represents a set of space-separated tokens.'],
					['Document', 'Document', 'Each web page loaded in the browser has its own document object.'],
					['DocumentFragment', 'DocumentFragment', 'Creates a new empty DocumentFragment.'],
					['', 'ecma5'],
					['Date', 'Date', 'Creates JavaScript Date'],
					['', 'ecma6'],
					['DataView', 'DataView', 'The DataView view provides'],
				]);
			});

			/**
			 * Tests object JSDoc completions
			 * @since 11.0
			 */
			it("test object doc completion 4", function(done) {
				var options = {
					buffer: "/**\n* @param {N \n*/function foo(aa, bb, cc) {};",
					line: '* @param {N ',
					prefix: "N",
					offset: 15,
					callback: done};
				testProposals(options, [
					['', 'ecma5'],
					['Number', 'Number', 'The Number JavaScript object is a wrapper']
				]);
			});

			/**
			 * Tests object JSDoc completions
			 * @since 11.0
			 */
			it("test object doc completion 5", function(done) {
				var options = {
					buffer: "/**\n* @returns {N} \n*/",
					line: '* @returns {N} ',
					prefix: "I",
					offset: 17,
					callback: done};
				testProposals(options, [
					['', 'ecma5'],
					['Number', 'Number', 'The Number JavaScript object is a wrapper']
				]);
			});

			it("Test JSDoc type completions 1", function(done) {
				var options = {
					buffer: "/**\n* @returns {} \n*/",
					line: '* @returns {} ',
					prefix: "",
					offset: 16,
					callback: done};
				testProposals(options, [
					['', 'ecma5'],
					['?', '? - No type information'],
					['Array', 'Array'],
					['Boolean', 'Boolean'],
					['Date', 'Date'],
					['Error', 'Error'],
					['EvalError', 'EvalError'],
					['Function', 'Function'],
					['JSON', 'JSON'],
					['Math', 'Math'],
					['Number', 'Number'],
					['Object', 'Object'],
					['RangeError', 'RangeError'],
					['ReferenceError', 'ReferenceError'],
					['RegExp', 'RegExp'],
					['String', 'String'],
					['SyntaxError', 'SyntaxError'],
					['TypeError', 'TypeError'],
					['URIError', 'URIError'],
					['eval', 'eval'],
					['{prop: propType}', '{prop: propType} - Object with a specific property'],
					['{}', '{} - Empty object'],
					['', 'ecma6'],
					['ArrayBuffer', 'ArrayBuffer'],
					['DataView', 'DataView'],
					['Map', 'Map'],
					['Promise', 'Promise'],
					['Proxy', 'Proxy'],
					['Reflect', 'Reflect'],
					['Set', 'Set'],
					['Symbol', 'Symbol'],
					['TypedArray', 'TypedArray'],
					['WeakMap', 'WeakMap'],
					['WeakSet', 'WeakSet'],
				]);
			});

		});
		describe('Node.js Tests', function() {
			before("Start server for node.js awareness tests", function(done) {
				worker.start(done, {options:{plugins:{node:{}}, libs:['ecma6']}});
			});
			/**
			 * Tests support for the eslint-env directive to find global objects
			 * @see https://bugs.eclipse.org/bugs/show_bug.cgi?id=439056
			 * @since 7.0
			 */
			it('node awareness 1', function(done) {
				var options = {
					buffer: "/*eslint-env node*/gl",
					prefix: "gl",
					offset: 21,
					callback: done};
				testProposals(options, [
					['', 'node'],
					['global', 'global : <top>']
				]);
			});
			/**
			 * Tests support for the eslint-env directive to find global objects
			 * @see https://bugs.eclipse.org/bugs/show_bug.cgi?id=439056
			 * @since 7.0
			 */
			it('node awareness 2', function(done) {
				var options = {
					buffer: "/*eslint-env node*/gl",
					prefix: "gl",
					offset: 21,
					callback: done};
				testProposals(options, [
					['', 'node'],
					['global', 'global : <top>']
				]);
			});
			/**
			 * Tests support for the eslint-env directive to find global objects
			 * @see https://bugs.eclipse.org/bugs/show_bug.cgi?id=439056
			 * @since 7.0
			 */
			it('node awareness 3', function(done) {
				var options = {
					buffer: "/*eslint-env amd*/ require('fs').mkd",
					prefix: "mk",
					offset: 36,
					callback: done};
				testProposals(options, [
					['', 'node'],
					['mkdir(path, mode?, callback?)', 'mkdir(path, mode?, callback?)'],
					['mkdirSync(path, mode?)', 'mkdirSync(path, mode?)']
				]);
			});
			/**
			 * Tests support for the eslint-env directive to find global objects
			 * @see https://bugs.eclipse.org/bugs/show_bug.cgi?id=439056
			 * @since 7.0
			 */
			it('node awareness 4', function(done) {
				var options = {
					buffer: "/*eslint-env node*/ require('fs').mkd",
					prefix: "mkd",
					offset: 37,
					callback: done};
				testProposals(options, [
					['', 'node'],
					['mkdir(path, mode?, callback?)', 'mkdir(path, mode?, callback?)'],
					['mkdirSync(path, mode?)', 'mkdirSync(path, mode?)']
				]);
			});
			/**
			 * Tests support for the eslint-env directive to find global objects
			 * @see https://bugs.eclipse.org/bugs/show_bug.cgi?id=439056
			 * @since 7.0
			 */
			it('node awareness 5', function(done) {
				var options = {
					buffer: "/*eslint-env browser*/ require('fs').mkd",
					prefix: "mkd",
					offset: 40,
					callback: done};
				testProposals(options, [
					['', 'node'],
					['mkdir(path, mode?, callback?)', 'mkdir(path, mode?, callback?)'],
					['mkdirSync(path, mode?)', 'mkdirSync(path, mode?)']
				]);
			});
			it('node awareness 6', function(done) {
				var options = {
					buffer: "/*eslint-env node*/ proc",
					prefix: "proc",
					offset: 24,
					callback: done};
				testProposals(options, [
					['', 'node'],
					['process', 'process : process']
				]);
			});
			it('node awareness 7', function(done) {
				var options = {
					buffer: "/*eslint-env node*/ process.co",
					prefix: "co",
					offset: 30,
					callback: done};
				testProposals(options, [
					['', 'node'],
					['config', 'config : process.config']
				]);
			});
			it('node awareness 8', function(done) {
				var options = {
					buffer: "/*eslint-env node*/ var x = require('fs');x.o",
					prefix: "o",
					offset: 45,
					callback: done};
				testProposals(options, [
					['', 'node'],
					["open(path, flags, mode?, callback?)", "open(path, flags, mode?, callback?)"],
					["openSync(path, flags, mode?)", "openSync(path, flags, mode?) : number"]
				]);
			});
			it('node awareness 9', function(done) {
				var options = {
					buffer: "/*eslint-env node*/ process.stdout.wr",
					prefix: "wr",
					offset: 37,
					callback: done};
				testProposals(options, [
					['', 'node'],
					["write(chunk, encoding?, callback?)", "write(chunk, encoding?, callback?) : bool"]
				]);
			});
			it('node awareness 10', function(done) {
				var options = {
					buffer: "/*eslint-env node*/ require('buffer').IN",
					prefix: "IN",
					offset: 40,
					callback: done};
				testProposals(options, [
					['', 'node'],
					["INSPECT_MAX_BYTES", "INSPECT_MAX_BYTES : number"]
				]);
			});
			it('node awareness 11', function(done) {
				var options = {
					buffer: "/*eslint-env node*/ var x = new Buffer(10);x.cop",
					prefix: "cop",
					offset: 48,
					callback: done};
				testProposals(options, [
					['', 'node'],
					["copy(targetBuffer, targetStart?, sourceStart?, sourceEnd?)", "copy(targetBuffer, targetStart?, sourceStart?, sourceEnd?) : number"],
					['', 'ecma6'],
					["copyWithin(target, start, end?)", "copyWithin(target, start, end?)"]
				]);
			});
			it('node awareness 12', function(done) {
				var options = {
					buffer: "/*eslint-env node*/ Buffer.isB",
					prefix: "isB",
					offset: 30,
					callback: done};
				testProposals(options, [
					['', 'node'],
					["isBuffer(obj)", "isBuffer(obj) : bool"]
				]);
			});
			/**
			 * @see https://bugs.eclipse.org/bugs/show_bug.cgi?id=473964
			 * @since 10.0
			 */
			it('node assumed awareness 1', function(done) {
				var options = {
					buffer: "require('fs').mkdirS",
					prefix: "mkdirS",
					offset: 20,
					callback: done};
				testProposals(options, [
					['', 'node'],
					["mkdirSync(path, mode?)", "mkdirSync(path, mode?)"]
				]);
			});
		});
		describe('Browser Tests', function() {
			before("Start server for browser tests", function(done) {
				worker.start(done, {options: {libs:['browser']}});
			});
			/**
			 * Tests support for the eslint-env directive to find global objects
			 * @see https://bugs.eclipse.org/bugs/show_bug.cgi?id=439056
			 * @since 7.0
			 */
			it('browser awareness 1', function(done) {
				var options = {
					buffer: "/*eslint-env browser */ win",
					prefix: "win",
					offset: 27,
					callback: done};
				testProposals(options, [
					['', 'browser'],
					["window", "window : <top>"]
				]);
			});
			/**
			 * Tests support for the eslint-env directive to find global objects
			 * @see https://bugs.eclipse.org/bugs/show_bug.cgi?id=439056
			 * @since 7.0
			 */
			it('browser awareness 2', function(done) {
				var options = {
					buffer: "/*eslint-env browser */ cons",
					prefix: "cons",
					offset: 28,
					callback: done};
				testProposals(options, [
					['', 'browser'],
					["console", "console : console"]
				]);
			});
			/**
			 * Tests support for the eslint-env directive to find global objects
			 * @see https://bugs.eclipse.org/bugs/show_bug.cgi?id=439056
			 * @since 7.0
			 */
			it('browser awareness 3', function(done) {
				var options = {
					buffer: "/*eslint-env browser, node */ win",
					prefix: "win",
					offset: 33,
					callback: done};
				testProposals(options, [
					['', 'browser'],
					["window", "window : <top>"]
				]);
			});
			/**
			 * Tests support for the eslint-env directive to find global objects
			 * @see https://bugs.eclipse.org/bugs/show_bug.cgi?id=439056
			 * @since 7.0
			 */
			it('browser awareness 4', function(done) {
				var options = {
					buffer: "/*eslint-env node, browser */ win",
					prefix: "win",
					offset: 33,
					callback: done};
				testProposals(options, [
					['', 'browser'],
					["window", "window : <top>"]
				]);
			});
			it('browser awareness 5', function(done) {
				var options = {
					buffer: "win",
					prefix: "win",
					offset: 3,
					callback: done};
				testProposals(options, [
					['', 'browser'],
					["window", "window : <top>"]
				]);
			});
			it('browser awareness 6', function(done) {
				var options = {
					buffer: "/*eslint-env browser */ locat",
					prefix: "locat",
					offset: 29,
					callback: done};
				testProposals(options, [
					['', 'browser'],
					['location', 'location : location']
				]);
			});
			it('browser awareness 7', function(done) {
				var options = {
					buffer: "/*eslint-env browser */ location = 5; locat",
					prefix: "locat",
					offset: 43,
					callback: done};
				testProposals(options, [
					['', 'browser'],
					['location', 'location : location|number']
				]);
			});
			it('browser awareness 8', function(done) {
				var options = {
					buffer: "/*eslint-env browser */window.xx = 9;x",
					prefix: "x",
					offset: 38,
					callback: done};
				testProposals(options, [
					['xx', 'xx : number'],
					['', 'browser'],
					['XMLDocument()', 'XMLDocument()'],
					['XMLHttpRequest()', 'XMLHttpRequest()'],
					['XPathResult()', 'XPathResult()']
				]);
			});
			it('browser awareness 9', function(done) {
				var options = {
					buffer: "/*eslint-env browser */var xx = 9;window.x",
					prefix: "x",
					offset: 42,
					callback: done};
				testProposals(options, [
					['xx', 'xx : number'],
					['', 'browser'],
					['XMLDocument()', 'XMLDocument()'],
					['XMLHttpRequest()', 'XMLHttpRequest()'],
					['XPathResult()', 'XPathResult()']
				]);
			});
			it('browser awareness 10', function(done) {
				var options = {
					buffer: "/*eslint-env browser */var xx = 9; this.x",
					prefix: "x",
					offset: 41,
					callback: done};
				testProposals(options, [
					['xx', 'xx : number'],
					['', 'browser'],
					['XMLDocument()', 'XMLDocument()'],
					['XMLHttpRequest()', 'XMLHttpRequest()'],
					['XPathResult()', 'XPathResult()']
				]);
			});
		});
		describe('HTML Embedded Script Block Tests', function() {
			/**
			 * Tests support for content assist results inside embedded script blocks in HTML
			 * @see https://bugs.eclipse.org/bugs/show_bug.cgi?id=476592
			 * @since 10.0
			 */
			it('HTML embedded script blocks 1 - simple block with valid syntax', function(done) {
				var options = {
					buffer: "<html><head><script>var xx = 0; this.x;</script></head></html>",
					prefix: "x",
					offset: 38,
					contenttype: "text/html",
					callback: done};
				testProposals(options, [
					['xx', 'xx : number'],
					['', 'browser'],
					['XMLDocument()', 'XMLDocument()'],
					['XMLHttpRequest()', 'XMLHttpRequest()'],
					['XPathResult()', 'XPathResult()']
				]);
			});
			/**
			 * Tests support for content assist results inside embedded script blocks in HTML
			 * @see https://bugs.eclipse.org/bugs/show_bug.cgi?id=476592
			 * @since 10.0
			 */
			it('HTML embedded script blocks 2 - simple block with no ending semi', function(done) {
				var options = {
					buffer: "<html><head><script>var xx = 0; this.x</script></head></html>",
					prefix: "x",
					offset: 38,
					contenttype: "text/html",
					callback: done};
				testProposals(options, [
					['xx', 'xx : number'],
					['', 'browser'],
					['XMLDocument()', 'XMLDocument()'],
					['XMLHttpRequest()', 'XMLHttpRequest()'],
					['XPathResult()', 'XPathResult()']
				]);
			});
			/**
			 * Tests support for content assist results inside embedded script blocks in HTML
			 * @see https://bugs.eclipse.org/bugs/show_bug.cgi?id=476592
			 * @since 10.0
			 */
			it('HTML embedded script blocks 3 - empty script block', function(done) {
				var options = {
					buffer: "<html><head><script></script></head></html>",
					prefix: "x",
					offset: 20,
					contenttype: "text/html",
					callback: done};
				testProposals(options, [
					['', 'browser'],
					['XMLDocument()', 'XMLDocument()'],
					['XMLHttpRequest()', 'XMLHttpRequest()'],
					['XPathResult()', 'XPathResult()']
				]);
			});
			/**
			 * Tests support for content assist results inside embedded script blocks in HTML
			 * @see https://bugs.eclipse.org/bugs/show_bug.cgi?id=476592
			 * @since 10.0
			 */
			it('HTML embedded script blocks multi 1', function(done) {
				var options = {
					buffer: "<html><head><script>var xx = 0;</script></head><body><a>test</a><script>this.x</script></body></html>",
					prefix: "x",
					offset: 78,
					contenttype: "text/html",
					callback: done};
				testProposals(options, [
					['xx', 'xx : number'],
					['', 'browser'],
					['XMLDocument()', 'XMLDocument()'],
					['XMLHttpRequest()', 'XMLHttpRequest()'],
					['XPathResult()', 'XPathResult()']
				]);
			});
			/**
			 * Tests support for content assist results inside embedded script blocks in HTML
			 * @see https://bugs.eclipse.org/bugs/show_bug.cgi?id=476592
			 * @since 10.0
			 */
			it('HTML embedded script blocks multi 2', function(done) {
				var options = {
					buffer: "<html><head><script>this.x</script></head><body><a>test</a><script>var xx = 0;</script></body></html>",
					prefix: "x",
					offset: 26,
					contenttype: "text/html",
					callback: done};
				testProposals(options, [
					['xx', 'xx : number'],
					['', 'browser'],
					['XMLDocument()', 'XMLDocument()'],
					['XMLHttpRequest()', 'XMLHttpRequest()'],
					['XPathResult()', 'XPathResult()']
				]);
			});
			/**
			 * Tests support for content assist results inside embedded script blocks in HTML
			 * @see https://bugs.eclipse.org/bugs/show_bug.cgi?id=476592
			 * @since 10.0
			 */
			it('HTML wrapped function call 1 - local script blocks are included in scope', function(done) {
				var options = {
					buffer: '<html><head><script>var xx = 0;</script></head><body><a onclick="x"></a></body></html>',
					prefix: "x",
					offset: 65,
					contenttype: "text/html",
					callback: done};
				testProposals(options, [
					['xx', 'xx : number'],
					['', 'browser'],
					['XMLDocument()', 'XMLDocument()'],
					['XMLHttpRequest()', 'XMLHttpRequest()'],
					['XPathResult()', 'XPathResult()']
				]);
			});
			/**
			 * Tests support for content assist results inside embedded script blocks in HTML
			 * @see https://bugs.eclipse.org/bugs/show_bug.cgi?id=476592
			 * @since 10.0
			 */
			it('HTML wrapped function call 2 - calls are wrapped with "this.<func>;"', function(done) {
				var options = {
					// Checks that the compilation unit is wrapping the function correctly
					buffer: '<html><head><script>var xx = 0;</script></head><body><a onclick="garblegarble"></a><a onclick="x"></a></body></html>',
					prefix: "x",
					offset: 95,
					contenttype: "text/html",
					callback: done};
				testProposals(options, [
					['xx', 'xx : number'],
					['', 'browser'],
					['XMLDocument()', 'XMLDocument()'],
					['XMLHttpRequest()', 'XMLHttpRequest()'],
					['XPathResult()', 'XPathResult()']
				]);
			});
			/**
			 * Tests support for content assist results inside embedded script blocks in HTML
			 * @see https://bugs.eclipse.org/bugs/show_bug.cgi?id=476592
			 * @since 10.0
			 */
			it('HTML wrapped function call 3 - order doesn\'t affect compilation unit', function(done) {
				var options = {
					// Checks the the compilation unit sorts
					buffer: '<html><body><a onclick="x"></a><script>var xx = 0;</script></body></html>',
					prefix: "x",
					offset: 24,
					contenttype: "text/html",
					callback: done};
				testProposals(options, [
					['xx', 'xx : number'],
					['', 'browser'],
					['XMLDocument()', 'XMLDocument()'],
					['XMLHttpRequest()', 'XMLHttpRequest()'],
					['XPathResult()', 'XPathResult()']
				]);
			});
			/**
			 * Tests support for content assist results inside embedded script blocks in HTML
			 * @see https://bugs.eclipse.org/bugs/show_bug.cgi?id=476592
			 * @since 10.0
			 */
			it('HTML - empty array from JS proposals outside of valid blocks', function(done) {
				var options = {
					buffer: '<html><body><a onclick="xxx">xx</a><script>var xxx = 0;</script></body></html>',
					prefix: "xx",
					offset: 31,
					contenttype: "text/html",
					callback: done};
				testProposals(options, []);
			});
		});
		/**
		 * Recognize $ in var name prefix
		 * @see https://bugs.eclipse.org/bugs/show_bug.cgi?id=506890
		 * @since 15.0
		 */
		describe('Var name with $ Tests', function() {
			it('Var name with $ - test prefix', function(done) {
				var options = {
					buffer: "var $_test = 42;\ntest",
					prefix: "test",
					offset: 21,
					callback: done
				};
				testProposals(options, [
				]);
			});
			it('Var name with $ - $ prefix', function(done) {
				var options = {
					buffer: "var $_test = 42;\n$",
					prefix: "$",
					offset: 18,
					callback: done
				};
				testProposals(options, [
					['$_test', '$_test : number'],
				]);
			});
			it('Var name with $ - $_ prefix', function(done) {
				var options = {
					buffer: "var $_test = 42;\n$_",
					prefix: "$_",
					offset: 19,
					callback: done
				};
				testProposals(options, [
					['$_test', '$_test : number'],
				]);
			});
			it('Var name with $ - $_tes prefix', function(done) {
				var options = {
					buffer: "var $_test = 42;\n$_tes",
					prefix: "$_tes",
					offset: 22,
					callback: done
				};
				testProposals(options, [
					['$_test', '$_test : number'],
				]);
			});
		});
	});
});
