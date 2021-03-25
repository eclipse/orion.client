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
/*eslint-disable missing-nls*/
define([
'javascript/astManager',
'javascript/contentAssist/ternAssist',
'javascript/cuProvider',
'chai/chai',
'orion/Deferred',
'mocha/mocha' //must stay at the end, not a module
], function(ASTManager, TernAssist, CUProvider, chai, Deferred) {
	var assert = chai.assert;

	return function(worker) {
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
				text += expectedProposals[i][0] + " : " + expectedProposals[i][1] + "\n";
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
					text += actualProposals[i].proposal + " : " + actualProposals[i].name + desc + "\n"; //$NON-NLS-1$ //$NON-NLS-0$
				} else {
					text += actualProposals[i].proposal + " : " + actualProposals[i].description + "\n"; //$NON-NLS-1$ //$NON-NLS-0$
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
		
		describe('ES7 Tern Content Assist Tests', function() {
			this.timeout(20000);
			before('Message the server for warm up', function(done) {
				CUProvider.setUseCache(false);
				ternAssist = new TernAssist.TernContentAssist(astManager, worker, CUProvider, jsProject);
				worker.start(done, {options: {libs: ['ecma5', 'ecma6', 'ecma7']}}); // Reset the tern server state to remove any prior files
			});
			/*
			 * ECMA 2016 (ES7) completions
			 */
			it("Test array completions with ECMA 2016 (ES7)", function(done) {
				var options = {
					buffer: "var a = [1, 2, 3]; a.",
					prefix: "",
					offset: 21,
					callback: done
				};
				return testProposals(options, [
					['', 'ecma5'],
					['concat(other)', 'concat(other)'],
					['every(test, context?)', 'every(test, context?) : bool'],
					['filter(test, context?)', 'filter(test, context?)'],
					['forEach(f, context?)', 'forEach(f, context?)'],
					['hasOwnProperty(prop)', 'hasOwnProperty(prop) : bool'],
					['indexOf(elt, from?)', 'indexOf(elt, from?) : number'],
					['isPrototypeOf(obj)', 'isPrototypeOf(obj) : bool'],
					['join(separator?)', 'join(separator?) : string'],
					['lastIndexOf(elt, from?)', 'lastIndexOf(elt, from?) : number'],
					['map(f, context?)', 'map(f, context?)'],
					['pop()', 'pop()'],
					['propertyIsEnumerable(prop)', 'propertyIsEnumerable(prop) : bool'],
					['push(newelt)', 'push(newelt) : number'],
					['reduce(combine, init?)', 'reduce(combine, init?)'],
					['reduceRight(combine, init?)', 'reduceRight(combine, init?)'],
					['reverse()', 'reverse()'],
					['shift()', 'shift()'],
					['slice(from?, to?)', 'slice(from?, to?)'],
					['some(test, context?)', 'some(test, context?) : bool'],
					['sort(compare?)', 'sort(compare?)'],
					['splice(pos, amount, newelt?)', 'splice(pos, amount, newelt?) : [?]'],
					['toLocaleString()', 'toLocaleString() : string'],
					['toString()', 'toString() : string'],
					['unshift(newelt)', 'unshift(newelt) : number'],
					['valueOf()', 'valueOf() : number'],
					['length', 'length : number'],
					['', 'ecma6'],
					['copyWithin(target, start, end?)', 'copyWithin(target, start, end?)'],
					['entries()', 'entries()'],
					['fill(value, start?, end?)', 'fill(value, start?, end?)'],
					['find(callback, thisArg?)', 'find(callback, thisArg?)'],
					['findIndex(callback, thisArg?)', 'findIndex(callback, thisArg?) : number'],
					['keys()', 'keys() : {:t: number}'],
					['values()', 'values()'],
					['', 'ecma7'],
					['includes(value)', 'includes(value) : bool'],
				]);
			});
			it("Test filtered array completions with ECMA 2016 (ES7)", function(done) {
				var options = {
					buffer: "var a = [1, 2, 3]; a.inc",
					prefix: "inc",
					offset: 24,
					callback: done
				};
				return testProposals(options, [
					['', 'ecma7'],
					['includes(value)', 'includes(value) : bool'],
				]);
			});
			it("Test exponentiation completions with ECMA 2016 (ES7) 1", function(done) {
				var options = {
					buffer: "var a; var b = 2 ** a",
					prefix: "a",
					offset: 21,
					callback: done
				};
				return testProposals(options, [
					['a', 'a : any'],
					['', 'ecma5'],
					['Array(size)', 'Array(size)'],
					['', 'ecma6'],
					['ArrayBuffer(length)', 'ArrayBuffer(length)'],
				]);
			});
			it("Test exponentiation completions with ECMA 2016 (ES7) 2", function(done) {
				var options = {
					buffer: "var a; var b = 2 ** b",
					prefix: "b",
					offset: 21,
					callback: done
				};
				return testProposals(options, [
					['b', 'b : number'],
					['', 'ecma5'],
					['Boolean(value)', 'Boolean(value) : bool']
				]);
			});
			it('HTML - filtered array completions with ECMA 2016 (ES7)', function(done) {
					var options = {
						buffer: '<html><body><script>var a = [1, 2, 3]; a.inc</script></body></html>',
						prefix: "inc",
						offset: 44,
						contenttype: "text/html",
						callback: done};
					testProposals(options, [
						['', 'ecma7'],
						['includes(value)', 'includes(value) : bool'],
					]);
				});
		});
	};
});
