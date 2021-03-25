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
/*eslint-env amd, mocha, browser, chai*/
/* eslint-disable missing-nls */
define([
'js-tests/javascript/testingWorker',
'javascript/support/ternproject/ternProjectValidator',
'javascript/jsonAstManager',
'orion/Deferred',
'chai/chai',
'mocha/mocha' //must stay at the end, not a module
], function(TestWorker, Validator, JsonAstManager, Deferred, chai) {
	var assert = chai.assert,
		astmanager = new JsonAstManager.JsonAstManager(),
		validator = new Validator.TernProjectValidator(astmanager);
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
	 * @description Compares the computed vs. the expected problem arrays
	 * @param {Array.<Object>} problems The computed problems
	 * @param {Array.<Object>} expected The expected problems
	 */
	function assertProblems(problems, expected) {
		assert(problems, "There should be a problems array");
		assert(expected, "There should be an expected problems array");
		assert.equal(problems.length, expected.length, "The actual and expected problem arrays should be the same size");
		problems.forEach(function(pb, i) {
			var p = expected[i];
			assert.equal(pb.id, p.id, "The problem id's should be equal");
			assert.equal(pb.description, p.description, "The problem descriptions should be the same");
			assert.equal(pb.severity, p.severity, "The problem severities should be equal");
			assert.equal(pb.start, p.start, "The problem starts should be equal");
			assert.equal(pb.end, p.end, "The problem ends should be equal");
		});
	}
	function problem(start, end, description) {
		var pb = Object.create(null);
		pb.id = "tern-project-pb";
		pb.severity = 'error';
		pb.start = start;
		pb.end = end;
		pb.description = description;
		return pb;
	}

	/**
	 * @description Run the validator that uses the JSON AST manager
	 * @param {string} testText The text to get the AST from to validate
	 * @param {[?]} expected The expected result of running the validator on the text
	 * @since 16.0
	 */
	function validate(testText, expected) {
		astmanager.onModelChanging({file: '.tern-project', location: '.tern-project', name: '.tern-project'});
		var editorContext = {
			getText: function getText() {
				return new Deferred().resolve(testText);
			},
			getFileMetadata: function getFileMetadata() {
				var o = Object.create(null);
			    o.contentType = Object.create(null);
			    o.contentType.id = "application/json";
			    o.location = '.tern-project';
			    o.name = '.tern-project';
			    return new Deferred().resolve(o);
			}
		};
		return validator.computeProblems(editorContext, null, null).then(function(problems) {
			assertProblems(problems, expected);
		});
	}

	describe(".tern-project validator tests", function() {
		it("test empty", function() {
			return validate('', []);
		});
		it("test empty object", function() {
			return validate('{}', []);
		});
		it("test invalid root JSON 1", function() {
			return validate('!', []);
		});
		it("test invalid root JSON 2", function() {
			return validate('function f() {}', []);
		});
		it("test invalid root JSON 3", function() {
			return validate('undefined', []);
		});
		it("test libs", function() {
			return validate('{"libs": ["one"]}', []);
		});
		it("test libs - null", function() {
			return validate('{"libs": null}', [
				problem(9, 13, "'libs' must be an array of strings")
			]);
		});
		it("test libs - undefined", function() {
			return validate('{"libs": undefined}', [
				problem(1, 19, "'libs' must be an array of strings")
			]);
		});
		it("test libs - number", function() {
			return validate('{"libs": 1}', [
				problem(9, 10, "'libs' must be an array of strings")
			]);
		});
		it("test libs - boolean", function() {
			return validate('{"libs": true}', [
				problem(9, 13, "'libs' must be an array of strings")
			]);
		});
		it("test libs - string", function() {
			return validate('{"libs": "hi"}', [
				problem(9, 13, "'libs' must be an array of strings")
			]);
		});
		it("test libs - empty", function() {
			return validate('{"libs": []}', [
				problem(9, 11, "'libs' should not be empty")
			]);
		});
		it("test libs - all string values", function() {
			return validate('{"libs": ["one", "two", "three"]}', []);
		});
		it("test libs - mixed values", function() {
			return validate('{"libs": ["one", null, 1]}', [
					problem(17, 21, "'libs' entries can only be strings"),
					problem(23, 24, "'libs' entries can only be strings")
				]
			);
		});
		it("test loadEagerly", function() {
			return validate('{"loadEagerly": ["one"]}', []);
		});
		it("test loadEagerly - null", function() {
			return validate('{"loadEagerly": null}', [
				problem(16, 20, "'loadEagerly' must be an array of strings")
			]);
		});
		it("test loadEagerly - undefined", function() {
			return validate('{"loadEagerly": undefined}', [
				problem(1, 26, "'loadEagerly' must be an array of strings")
			]);
		});
		it("test loadEagerly - number", function() {
			return validate('{"loadEagerly": 1}', [
				problem(16, 17, "'loadEagerly' must be an array of strings")
			]);
		});
		it("test loadEagerly - boolean", function() {
			return validate('{"loadEagerly": true}', [
				problem(16, 20, "'loadEagerly' must be an array of strings")
			]);
		});
		it("test loadEagerly - string", function() {
			return validate('{"loadEagerly": "hi"}', [
				problem(16, 20, "'loadEagerly' must be an array of strings")
			]);
		});
		it("test loadEagerly - empty", function() {
			return validate('{"loadEagerly": []}', []);
		});
		it("test loadEagerly - all string values", function() {
			return validate('{"loadEagerly": ["one", "two", "three"]}', []);
		});
		it("test loadEagerly - mixed values", function() {
			return validate('{"loadEagerly": ["one", null, 1]}', [
					problem(24, 28, "'loadEagerly' entries can only be strings"),
					problem(30, 31, "'loadEagerly' entries can only be strings")
				]
			);
		});
		it("test dontLoad", function() {
			return validate('{"dontLoad": ["one"]}', []);
		});
		it("test dontLoad - null", function() {
			return validate('{"dontLoad": null}', [
				problem(13, 17, "'dontLoad' must be an array of strings")
			]);
		});
		it("test dontLoad - number", function() {
			return validate('{"dontLoad": 1}', [
				problem(13, 14, "'dontLoad' must be an array of strings")
			]);
		});
		it("test dontLoad - boolean", function() {
			return validate('{"dontLoad": true}', [
				problem(13, 17, "'dontLoad' must be an array of strings")
			]);
		});
		it("test dontLoad - string", function() {
			return validate('{"dontLoad": "hi"}', [
				problem(13, 17, "'dontLoad' must be an array of strings")
			]);
		});
		it("test dontLoad - undefined", function() {
			return validate('{"dontLoad": undefined}', [
				problem(1, 23, "'dontLoad' must be an array of strings")
			]);
		});
		it("test dontLoad - empty", function() {
			return validate('{"dontLoad": []}', [
				problem(13, 15, "'dontLoad' should not be empty")
			]);
		});
		it("test dontLoad - all string values", function() {
			return validate('{"dontLoad": ["one", "two", "three"]}', []);
		});
		it("test dontLoad - mixed values", function() {
			return validate('{"dontLoad": ["one", null, 1]}', [
					problem(21, 25, "'dontLoad' entries can only be strings"),
					problem(27, 28, "'dontLoad' entries can only be strings")
				]
			);
		});
		it("test ecmaVersion", function() {
			return validate('{"ecmaVersion": 4}', []);
		});

		it("test ecmaVersion - undefined", function() {
			return validate('{"ecmaVersion": undefined}', [
				problem(1, 26, "'ecmaVersion' must be a number")
			]);
		});
		it("test ecmaVersion - null", function() {
			return validate('{"ecmaVersion": null}', [
				problem(16, 20, "'ecmaVersion' must be a number")
			]);
		});
		it("test ecmaVersion - boolean", function() {
			return validate('{"ecmaVersion": true}', [
				problem(16, 20, "'ecmaVersion' must be a number")
			]);
		});
		it("test ecmaVersion - []", function() {
			return validate('{"ecmaVersion": []}', [
				problem(16, 18, "'ecmaVersion' must be a number")
			]);
		});
		it("test ecmaVersion - string", function() {
			return validate('{"ecmaVersion": "foo"}', [
				problem(16, 21, "'ecmaVersion' must be a number")
			]);
		});
		it("test dependencyBudget", function() {
			return validate('{"dependencyBudget": 4}', []);
		});
		it("test dependencyBudget - undefined", function() {
			return validate('{"dependencyBudget": undefined}', [
				problem(1, 31, "'dependencyBudget' must be a number")
			]);
		});
		it("test dependencyBudget - null", function() {
			return validate('{"dependencyBudget": null}', [
				problem(21, 25, "'dependencyBudget' must be a number")
			]);
		});
		it("test dependencyBudget - boolean", function() {
			return validate('{"dependencyBudget": true}', [
				problem(21, 25, "'dependencyBudget' must be a number")
			]);
		});
		it("test dependencyBudget - []", function() {
			return validate('{"dependencyBudget": []}', [
				problem(21, 23, "'dependencyBudget' must be a number")
			]);
		});
		it("test dependencyBudget - string", function() {
			return validate('{"dependencyBudget": "foo"}', [
				problem(21, 26, "'dependencyBudget' must be a number")
			]);
		});
		it("test plugins", function() {
			return validate('{"plugins": {"a": {}}}', []);
		});
		it("test plugins - empty", function() {
			return validate('{"plugins": {}}', []);
		});
		it("test plugins - null", function() {
			return validate('{"plugins": null}', [
				problem(12, 16, "'plugins' must be an object")
			]);
		});
		it("test plugins - undefined", function() {
			return validate('{"plugins": undefined}', [
				problem(1, 22, "'plugins' must be an object")
			]);
		});
		it("test plugins - boolean", function() {
			return validate('{"plugins": true}', [
				problem(12, 16, "'plugins' must be an object")
			]);
		});
		it("test plugins - number", function() {
			return validate('{"plugins": 1337}', [
				problem(12, 16, "'plugins' must be an object")
			]);
		});
		it("test plugins - string", function() {
			return validate('{"plugins": "hi"}', [
				problem(12, 16, "'plugins' must be an object")
			]);
		});
		it("test plugins - array", function() {
			return validate('{"plugins": []}', [
				problem(12, 14, "'plugins' must be an object")
			]);
		});
		it("test plugins value", function() {
			return validate('{"plugins": {"a": {}}}', []);
		});
		it("test plugins value - null", function() {
			return validate('{"plugins": {"a": null}}', [
				problem(18, 22, "plugin 'a' must be an object or boolean")
			]);
		});
		it("test plugins value - undefined", function() {
			return validate('{"plugins": {"a": undefined}}', [
				problem(13, 28, "plugin 'a' must be an object or boolean")
			]);
		});
		it("test plugins value - boolean", function() {
			return validate('{"plugins": {"a": true}}', [
				//problem(18, 22, "plugin 'a' must be an object or boolean")
			]);
		});
		it("test plugins value - string", function() {
			return validate('{"plugins": {"a": "hi"}}', [
				problem(18, 22, "plugin 'a' must be an object or boolean")
			]);
		});
		it("test plugins value - array", function() {
			return validate('{"plugins": {"a": []}}', [
				problem(18, 20, "plugin 'a' must be an object or boolean")
			]);
		});
		it("test dupe entries - root", function() {
			return validate('{"plugins": {}, "plugins": {}}', [
				problem(16, 25, "Duplicate entries are not allowed")
			]);
		});
		it("test dupe entries - plugins", function() {
			return validate('{"plugins": {"a": {}, "b": {}, "a":{}}}', [
				problem(31, 34, "Duplicate entries are not allowed")
			]);
		});
	});
});
