/*******************************************************************************
 * @license
 * Copyright (c) 2017, 2018 IBM Corporation and others.
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
	'mocha/mocha', //must stay at the end, not a module
], function(QuickFixes, Validator, chai, Deferred, ASTManager, CUProvider) {

/*
 * Test suite for quick fixes that apply to many or all rules
 */
var assert = chai.assert;
return function(worker) {
	describe('Global Quick Fix Tests',function() {
		this.timeout(10000);
		before('Reset Tern Server', function(done) {
			worker.start(done); // Reset the tern server state to remove any prior files
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
			var validator = new Validator(worker);
			var state = Object.create(null);
			var loc = contentType === 'text/html' ? 'quickfix_test_script.html' : 'quickfix_test_script.js';
			assert(options.callback, "You must provide a callback for a worker-based test");
			state.callback = options.callback;
			worker.setTestState(state);
			var rule = options.rule;
			validator._enableOnly(rule.id, rule.severity, rule.opts);
			var fixComputer = new QuickFixes.JavaScriptQuickfixes(astManager, null, null, null, worker);
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
			CUProvider.onModelChanging({file: {location: 'quickfix_test_script.js'}});
			CUProvider.onModelChanging({file: {location: 'quickfix_test_script.html'}});
		});

		/**
		 * @description Runs the validator on the given options and computes fixes for those problems
		 * @param {Object} options {buffer, contentType, rule}
		 * @returns {orion.Promise} The validation promise
		 */
		function getFixes(options) {
			var obj = setup(options);
			return obj.validator.computeProblems(obj.editorContext, {contentType: obj.contentType}).then(
				function(problems) {
					try {
						var pbs = problems.problems;
						var idx = 0;
						if(options.pbindex > -1) {
							assert(options.pbindex < pbs.length, "You gave a problem index greater than the total returned problems.");
							idx = options.pbindex;
						}
						var annot = pbs[idx];
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
							if (!Array.isArray(options.expected)) {
								if(options.pbcount > -1) {
									assert.equal(pbs.length, options.pbcount, 'Expected number of problems were not returned.');
								} else {
									assert.equal(pbs.length, 1, 'Expected only one problem per test');
								}
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
					assert(Array.isArray(computed.text), "Expected multiple quick fix text edits" + getString(computed, expected));
					assert(Array.isArray(computed.selection), "Expected multiple quick fix selections" + getString(computed, expected));
					assert.equal(computed.text.length, expected.length, "Wrong number of quick fix text edits" + getString(computed, expected));
					assert.equal(computed.selection.length, expected.length, "Wrong number of quick fix selections" + getString(computed, expected));
					for (var i=0; i<expected.length; i++) {
						assert(computed.text[i].indexOf(expected[i].value) > -1, 'The fix: \"'+computed.text[i]+'\" does not match the expected fix of: \"'+expected[i].value + '\"'  + getString(computed, expected));
						assert.equal(computed.selection[i].start, expected[i].start, 'The fix starts do not match' + getString(computed, expected));
						assert.equal(computed.selection[i].end, expected[i].end, 'The fix ends do not match' + getString(computed, expected));
					}
				} else if (typeof computed === 'object' && Array.isArray(computed.text)){
					assert.equal(computed.text.length, 1, 'Was expecting one quick fix text edit' + getString(computed, expected));
					assert.equal(computed.selection.length, 1, 'Was expected one quick fix selection range' + getString(computed, expected));
					assert(computed.text[0].indexOf(expected.value) > -1, 'The fix: \"'+computed.text[0]+'\"" does not match the expected fix of: '+expected.value + getString(computed, expected));
					assert.equal(computed.selection[0].start, expected.start, 'The fix starts do not match' + getString(computed, expected));
					assert.equal(computed.selection[0].end, expected.end, 'The fix ends do not match' + getString(computed, expected));
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
		
		function getString(computed, expected){
			var result = "\nActual:\n";
			if (Array.isArray(computed.selection)){
				for (var i = 0; i < computed.selection.length; i++) {
					result += "{\n\tvalue: \"" + computed.text[i].trim() + "\",\n\tstart: " + computed.selection[i].start + ",\n\tend: " + computed.selection[i].end + "\n},\n";
				}
			} else {
				result += "{\n\tvalue: \"" + computed.value + "\",\n\tstart: " + computed.start + ",\n\tend: " + computed.end + "\n}\n";
			}
			result += "\nExpected:\n";			
			if (Array.isArray(expected)){
				for (i = 0; i < expected.length; i++) {
					result += "{\n\tvalue: \"" + expected[i].value.trim() + "\",\n\tstart: " + expected[i].start + ",\n\tend: " + expected[i].end + "\n},\n";
				}
			} else {
				result += "{\n\tvalue: \"" + expected.value + "\",\n\tstart: " + expected.start + ",\n\tend: " + expected.end + "\n}\n";
			}
			return result;
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
		
		it("Ignore in file - simple", function(done) {
			var rule = createTestRule("semi");
			var expected = [{
				value: "/*eslint-disable semi */",
				start: 0,
				end: 0
			},
			{
				value: "1",
				start: 8,
				end: 9
			}];
			getFixes({
				buffer: "var a = 1",
				rule: rule,
				fixid: "ignore-in-file",
				expected: expected,
				callback: done
			});
		});
		it("Ignore in file - HTML - simple", function(done) {
			var rule = createTestRule("semi");
			var expected = [{
				value: "/*eslint-disable semi */",
				start: 15,
				end: 15
			},
			{
				value: "1",
				start: 23,
				end: 24
			}
			];
			getFixes({
				buffer: "<html>\n<script>var a = 1</script></html>",
				rule: rule,
				fixid: "ignore-in-file",
				expected: expected,
				callback: done,
				contentType: 'text/html'
			});
		});
		it("Ignore in file - simple insert after comment", function(done) {
			var rule = createTestRule("semi");
			var expected = [{
				value: "/*eslint-disable semi */",
				start: 24,
				end: 24
			},
			{
				value: "1",
				start: 32,
				end: 33
			}];
			getFixes({
				buffer: "/* This is a comment */\nvar a = 1",
				rule: rule,
				fixid: "ignore-in-file",
				expected: expected,
				callback: done
			});
		});
		it("Ignore in file - HTML - disable directive exists", function(done) {
			var rule = createTestRule("semi");
			var expected = [{
				value: "eslint-disable yoda, semi",
				start: 17,
				end: 36
			},
			{
				value: "1",
				start: 47,
				end: 48
			}];
			getFixes({
				buffer: "<html>\n<script>/*eslint-disable yoda*/\nvar a = 1</script></html>",
				rule: rule,
				fixid: "ignore-in-file",
				expected: expected,
				callback: done,
				contentType: 'text/html'
			});
		});
		it("Ignore in file - disable directive exists 1", function(done) {
			var rule = createTestRule("semi");
			var expected = [{
				value: "eslint-disable yoda, semi",
				start: 2,
				end: 21
			},
			{
				value: "1",
				start: 32,
				end: 33
			}];
			getFixes({
				buffer: "/*eslint-disable yoda*/\nvar a = 1",
				rule: rule,
				fixid: "ignore-in-file",
				expected: expected,
				callback: done
			});
		});
		it("Ignore in file - disable directive exists 2", function(done) {
			var rule = createTestRule("semi");
			var expected = [{
				value: "eslint-disable     		yoda, no-undef, semi",
				start: 2,
				end: 54
			},
			{
				value: "1",
				start: 65,
				end: 66
			}
			];
			getFixes({
				buffer: "/* \t\t\t\teslint-disable     \t\tyoda, no-undef\t\t          */\nvar a = 1",
				rule: rule,
				fixid: "ignore-in-file",
				expected: expected,
				callback: done
			});
		});
		it("Ignore in file - disable directive exists 3", function(done) {
			var rule = createTestRule("semi");
			var expected = [{
				value: "eslint-disable no-undef,yoda, semi",
				start: 2,
				end: 30
			},
			{
				value: "1",
				start: 41,
				end: 42
			}];
			getFixes({
				buffer: "/*eslint-disable no-undef,yoda*/\nvar a = 1",
				rule: rule,
				fixid: "ignore-in-file",
				expected: expected,
				callback: done
			});
		});
		it("Ignore in file - disable directive exists 4", function(done) {
			var rule = createTestRule("semi");
			var expected = [{
				value: "eslint-disable no-undef, yoda, semi",
				start: 2,
				end: 31
			},
			{
				value: "1",
				start: 42,
				end: 43
			}];
			getFixes({
				buffer: "/*eslint-disable no-undef, yoda*/\nvar a = 1",
				rule: rule,
				fixid: "ignore-in-file",
				expected: expected,
				callback: done
			});
		});
		it("Ignore in file - disable directive exists 5", function(done) {
			var rule = createTestRule("semi");
			var expected = [{
				value: "eslint-disable no-undef, yoda, semi",
				start: 26,
				end: 55
			},
			{
				value: "1",
				start: 66,
				end: 67
			}];
			getFixes({
				buffer: "/* This is a comment */\n/*eslint-disable no-undef, yoda*/\nvar a = 1",
				rule: rule,
				fixid: "ignore-in-file",
				expected: expected,
				callback: done
			});
		});
		it("Ignore in file - disable directive after program", function(done) {
			var rule = createTestRule("semi");
			var expected = [{
				value: "/*eslint-disable semi */",
				start: 0,
				end: 0
			},
			{
				value: "1",
				start: 8,
				end: 9
			}];
			getFixes({
				buffer: "var a = 1\n/*eslint-disable yoda*/",
				rule: rule,
				fixid: "ignore-in-file",
				expected: expected,
				callback: done
			});
		});
		it("Ignore in file - default insertion is after annotation 1", function(done) {
			var rule = createTestRule("no-undef");
			var expected = [{
				value: "/*eslint-disable no-undef */",
				start: 14,
				end: 14
			},
			{
				value: "require",
				start: 30,
				end: 37
			}];
			getFixes({
				buffer: "/* Comment */\nfunction foo(){\nrequire();\n}\n",
				rule: rule,
				fixid: "ignore-in-file",
				expected: expected,
				callback: done
			});
		});
		it("Ignore in file - default insertion is after annotation 2", function(done) {
			var rule = createTestRule("check-tern-plugin");
			var expected = [{
				value: "/*eslint-disable check-tern-plugin */",
				start: 0,
				end: 0
			},{
				value: "node",
				start: 27,
				end: 31
			}];
			getFixes({
				buffer: "/* Comment */\n/*eslint-env node */\nfunction foo(){\nrequire();\n}\n",
				rule: rule,
				fixid: "ignore-in-file",
				expected: expected,
				callback: done
			});
		});
		// TODO Fails because 2 annotations, one for require, one for browser
		it.skip("Ignore in file - HTML - default insertion is after annotation", function(done) {
			var rule = createTestRule("check-tern-plugin");
			var expected = {
				value: "/*eslint-disable check-tern-plugin */",
				start: 15,
				end: 15
			};
			getFixes({
				buffer: "<html>\n<script>/* Comment */\n/*eslint-env node */\nfunction foo(){\nrequire();\n}\n</script>\n</html>",
				rule: rule,
				fixid: "ignore-in-file",
				expected: expected,
				callback: done,
				contentType: 'text/html'
			});
		});
		it("Ignore in file - default insertion is after annotation 3", function(done) {
			var rule = createTestRule("check-tern-plugin");
			var expected = [{
				value: "/*eslint-disable check-tern-plugin */",
				start: 0,
				end: 0
			},
			{
				value: "node",
				start: 27,
				end: 31
			}];
			getFixes({
				buffer: "/* Comment */\n/*eslint-env node */\n/*eslint-disable yoda*/\nfunction foo(){\nrequire();\n}\n",
				rule: rule,
				fixid: "ignore-in-file",
				expected: expected,
				callback: done
			});
		});
		it("Ignore in file - default insertion is after annotation 4", function(done) {
			var rule = createTestRule("check-tern-plugin");
			var expected = [{
				value: "eslint-disable yoda, check-tern-plugin",
				start: 16,
				end: 35
			},
			{
				value: "node",
				start: 51,
				end: 55
			}];
			getFixes({
				buffer: "/* Comment */\n/*eslint-disable yoda*/\n/*eslint-env node */\nfunction foo(){\nrequire();\n}\n",
				rule: rule,
				fixid: "ignore-in-file",
				expected: expected,
				callback: done
			});
		});
		it("Ignore in file - multiple disable directives", function(done) {
			var rule = createTestRule("semi");
			var expected = [{
				value: "eslint-disable no-undef, yoda, semi",
				start: 2,
				end: 31
			},
			{
				value: "1",
				start: 70,
				end: 71
			}];
			getFixes({
				buffer: "/*eslint-disable no-undef, yoda*/\n/*eslint-disable foo, bar*/\nvar a = 1",
				rule: rule,
				fixid: "ignore-in-file",
				expected: expected,
				callback: done
			});
		});
		it("Ignore in file - enable directive exists 1", function(done) {
			var rule = createTestRule("semi");
			var expected = [{
				value: "",
				start: 0,
				end: 22
			},
			{
				value: "/*eslint-disable semi */",
				start: 23,
				end: 23
			},
			{
				value: "1",
				start: 31,
				end: 32
			}];
			getFixes({
				buffer: "/*eslint-enable semi*/\nvar a = 1",
				rule: rule,
				fixid: "ignore-in-file",
				expected: expected,
				callback: done
			});
		});
		it("Ignore in file - enable directive exists 2", function(done) {
			var rule = createTestRule("semi");
			var expected = [{
				value: "",
				start: 16,
				end: 21
			},
			{
				value: "/*eslint-disable semi */",
				start: 28,
				end: 28
			},
			{
				value: "1",
				start: 36,
				end: 37
			}];
			getFixes({
				buffer: "/*eslint-enable semi,yoda*/\nvar a = 1",
				rule: rule,
				fixid: "ignore-in-file",
				expected: expected,
				callback: done
			});
		});
		it("Ignore in file - enable directive exists 3", function(done) {
			var rule = createTestRule("semi");
			var expected = [{
				value: "",
				start: 16,
				end: 21
			},
			{
				value: "/*eslint-disable semi */",
				start: 29,
				end: 29
			},
			{
				value: "1",
				start: 37,
				end: 38
			}];
			getFixes({
				buffer: "/*eslint-enable semi, yoda*/\nvar a = 1",
				rule: rule,
				fixid: "ignore-in-file",
				expected: expected,
				callback: done
			});
		});
		it.skip("Ignore in file - enable all directive exists", function(done) {
			var rule = createTestRule("semi");
			var expected = [{
				value: "/*eslint-disable semi */",
				start: 0,
				end: 0
			},
			{
				value: "eslint-enable yoda, semi",
				start: 0,
				end: 0
			}];
			getFixes({
				buffer: "/*eslint-enable*/\nvar a = 1",
				rule: rule,
				fixid: "ignore-in-file",
				expected: expected,
				callback: done
			});
		});
		it("Ignore in file - enable and disable directive exists 1", function(done) {
			var rule = createTestRule("semi");
			var expected = [{
				value: "eslint-disable yoda, semi",
				start: 2,
				end: 21
			},
			{
				value: "",
				start: 24,
				end: 46
			},
			{
				value: "1",
				start: 55,
				end: 56
			}];
			getFixes({
				buffer: "/*eslint-disable yoda*/\n/*eslint-enable semi*/\nvar a = 1",
				rule: rule,
				fixid: "ignore-in-file",
				expected: expected,
				callback: done
			});
		});
		it("Ignore in file - enable and disable directive exists 2", function(done) {
			var rule = createTestRule("semi");
			var expected = [{
				value: "eslint-disable yoda, semi",
				start: 2,
				end: 21
			},
			{
				value: "",
				start: 40,
				end: 45
			},
			{
				value: "1",
				start: 64,
				end: 65
			}];
			getFixes({
				buffer: "/*eslint-disable yoda*/\n/*eslint-enable semi,no-undef*/\nvar a = 1",
				rule: rule,
				fixid: "ignore-in-file",
				expected: expected,
				callback: done
			});
		});
		it("Ignore in file - enable and disable directive exists 3", function(done) {
			var rule = createTestRule("semi");
			var expected = [{
				value: "eslint-disable yoda, semi",
				start: 2,
				end: 21
			},
			{
				value: "",
				start: 40,
				end: 45
			},
			{
				value: "1",
				start: 65,
				end: 66
			}];
			getFixes({
				buffer: "/*eslint-disable yoda*/\n/*eslint-enable semi, no-undef*/\nvar a = 1",
				rule: rule,
				fixid: "ignore-in-file",
				expected: expected,
				callback: done
			});
		});
	});
};
});
