/*******************************************************************************
 * @license
 * Copyright (c) 2017 IBM Corporation and others.
 * All rights reserved. This program and the accompanying materials are made
 * available under the terms of the Eclipse Public License 2.0
 * (http://www.eclipse.org/legal/epl-v10.html), and the Eclipse Distribution
 * License v1.0 (http://www.eclipse.org/org/documents/edl-v10.html).
 *
 * Contributors:
 *	 IBM Corporation - initial API and implementation
 ******************************************************************************/
/*eslint-env amd, mocha, node*/
/* eslint-disable missing-nls */
define([
	'javascript/validator',
	'chai/chai',
	'orion/Deferred',
	'mocha/mocha', //must stay at the end, not a module
], function(Validator, chai, Deferred) {
	var assert = chai.assert;
	return function(worker) {
		describe('CommonJS Validator Tests', function() {
			this.timeout(10000);
			
			// Server reset before each of the sections
//			before('Reset Tern Server', function(done) {
//				worker.start(done, {options:{plugins: {'requirejs': {}}}}); // Reset the tern server state to remove any prior files and start requirejs
//			});
			
			/**
			 * @description Sets up the test
			 * @param {Object} options {buffer, contentType}i
			 * @returns {Object} The object with the initialized values
			 */
			function setup(options) {
				var buffer = options.buffer;
				var contentType = options.contentType ? options.contentType : 'application/javascript';
				var validator = new Validator(worker);
				var state = Object.create(null);
				assert(options.callback, "You must provide a callback for a worker-based test");
				state.callback = options.callback;
				worker.setTestState(state);
				
				if (options.createFiles){
					for (var i=0; i<options.createFiles.length; i++) {
						worker.createTestFile(options.createFiles[i].name, options.createFiles[i].text);
					}
				}
				
				var editorContext = {
					/*override*/
					getText: function() {
						return new Deferred().resolve(buffer);
					},
					/*override*/
					getFileMetadata: function() {
						var o = Object.create(null);
						o.contentType = Object.create(null);
						o.contentType.id = contentType;
						o.location = 'validator_test_script.js';
						if (contentType === 'text/html'){
							o.location = 'validator_test_script.html';
						}
						return new Deferred().resolve(o);
					}
				};
				return {
					validator: validator,
					editorContext: editorContext,
					contentType: contentType
				};
			}
			
			/**
			 * @name validate
			 * @description Runs the validator on the given options
			 * @param {Object} options {buffer, contentType}
			 * @returns {orion.Promise} The validation promise
			 */
			function validate(options) {
				var obj = setup(options);
				return obj.validator.computeProblems(obj.editorContext, {contentType: obj.contentType}, options.config);
			}
		
			/**
			 * @name assertProblems
			 * @description Compares the computed problem set against the expected ones
			 * @param {Array.<orion.Problem>} computed The computed est of problems
			 * @param {Array.<Object>} expected The expected set of problems
			 */
			function assertProblems(computed, expected) {
				try {
					var problems = computed.problems;
					assert.equal(problems.length, expected.length, "The wrong number of problems was computed" + _problemToString(problems, expected));
					for(var i = 0; i < problems.length; i++) {
						var pb = problems[i];
						var expb = expected[i];
						if (expb.start) {
							assert.equal(pb.start, expb.start, "Wrong problem start" + _problemToString(problems, expected));
						}
						if (expb.end) {
							assert.equal(pb.end, expb.end, "Wrong problem end" + _problemToString(problems, expected));
						}
						if (expb.line) {
							assert.equal(pb.line, expb.line, "Wrong problem line number" + _problemToString(problems, expected));
						}
						if (expb.description) {
							assert.equal(pb.description, expb.description, "Wrong problem message" + _problemToString(problems, expected));
						}
						if (expb.severity) {
							assert.equal(pb.severity, expb.severity, "Wrong problem severity" + _problemToString(problems, expected));
						}
						if(pb.descriptionArgs) {
							assert(expb.descriptionArgs, "Missing expected description arguments");
							assert.equal(pb.descriptionArgs.nls, expb.descriptionArgs.nls, "Missing NLS descriptipon argument key");
						}
						if (expb.nodeType) {
							assert.equal(pb.nodeType, expb.nodeType);
						}
						if (expb.nlsComment) {
							assert(pb.data, "Missing data");
							assert(pb.data.nlsComment, "Missing data nlsComment");
							assert.equal(pb.data.nlsComment, expb.nlsComment, "Wrong data nlsComment");
						}
					}
					worker.getTestState().callback();
				}
				catch(err) {
					worker.getTestState().callback(err);
				}
			}
			
			function _problemToString(computed, expected){
				var result = '\n';
				result += 'Expected: ' + expected.length + '\n';
				for (var i=0; i<expected.length; i++){
					result += '{\nid: "' + expected[i].id + '",\nstart: ' + expected[i].start + ',\nend: ' + expected[i].end + ',\ndescription: "' + expected[i].description + '"\n},\n';
				}
				result += 'Actual: ' + computed.length + '\n';
				for (i=0; i<computed.length; i++){
					result += '{\nid: "' + computed[i].id + '",\nstart: ' + computed[i].start + ',\nend: ' + computed[i].end + ',\ndescription: "' + computed[i].description + '"\n},\n';
				}
				return result;
			}
			
			describe('Simplied CommonJS using AMD define statements', function(){
				before('Reset Tern Server', function(done) {
					worker.start(done, {options:{plugins: {'requirejs': {}}}}); // Reset the tern server state to start requirejs
				});
				it("no-shadow-global shouldn't apply to CommonJS require/exports/module params", function(callback) {
					var topic = "/*eslint-env amd*/\ndefine(function (require, exports, module){ var dep = 1;});";
					var config = { rules: {} };
					
					config.rules["no-shadow-global"] = 1;
					validate({buffer: topic, callback: callback, config: config}).then(
						function (problems) {
							assertProblems(problems, [
							]);
						},
						function (error) {
							worker.getTestState().callback(error);
						});
				});
				it("no-shadow-global should apply when not using CommonJS require/exports/module params", function(callback) {
					var topic = "/*eslint-env amd*/\ndefine2(function (require, exports, module){ var dep = 1;});";
					var config = { rules: {} };
					config.rules["no-shadow-global"] = 1;
					validate({buffer: topic, callback: callback, config: config}).then(
						function (problems) {
							assertProblems(problems, [
							// TODO Because there is no Java project set, validator.js does not set any envs so there are no globals to shadow
//							{
//								id: "no-shadow-global",
//								severity: 'warning',
//								description: 'This library could not be found, type information for it will be incomplete.',
//								start: 28,
//								end: 37
//							},
//							{
//								id: "no-shadow-global",
//								severity: 'warning',
//								description: 'This library could not be found, type information for it will be incomplete.',
//								start: 28,
//								end: 37
//							},
//							{
//								id: "no-shadow-global",
//								severity: 'warning',
//								description: 'This library could not be found, type information for it will be incomplete.',
//								start: 28,
//								end: 37
//							}
							]);
						},
						function (error) {
							worker.getTestState().callback(error);
						}
					);
				});
				it("unknown-require for dependency that exists", function(callback) {
					var topic = "define(function (require, exports, module){ var dep = require('foo');});";
					var config = { rules: {} };
					var createFiles = [{name: 'foo', text: 'exports.a = 2;'}];
					config.rules["unknown-require"] = 1;
					validate({buffer: topic, callback: callback, config: config, createFiles: createFiles}).then(
						function (problems) {
							assertProblems(problems, [
							]);
						},
						function (error) {
							worker.getTestState().callback(error);
						});
				});
				it("unknown-require for dependency that exists with slash", function(callback) {
					var topic = "define(function (require, exports, module){ var dep = require('foo/bar');});";
					var config = { rules: {} };
					var createFiles = [{name: 'foo/bar', text: 'exports.b = 2;'}];
					config.rules["unknown-require"] = 1;
					validate({buffer: topic, callback: callback, config: config, createFiles: createFiles}).then(
						function (problems) {
							assertProblems(problems, [
							]);
						},
						function (error) {
							worker.getTestState().callback(error);
						});
				});
				it("unknown-require for dependency that does not exist", function(callback) {
					var topic = "define(function (require, exports, module){ var dep = require('nope');});";
					var config = { rules: {} };
					var createFiles = [{name: 'nope', text: ''}];
					config.rules["unknown-require"] = 1;
					validate({buffer: topic, callback: callback, config: config, createFiles: createFiles}).then(
						function (problems) {
							assertProblems(problems, [{
								id: "unknown-require",
								start: 62,
								end: 68,
								description: "This library could not be found, type information for it will be incomplete."
							}]);
						},
						function (error) {
							worker.getTestState().callback(error);
						});
				});
				it("unknown-require for dependency that does not exist with slash", function(callback) {
					var topic = "define(function (require, exports, module){ var dep = require('foo/nope');});";
					var config = { rules: {} };
					config.rules["unknown-require"] = 1;
					var createFiles = [{name: 'foo/nope', text: ''}];
					validate({buffer: topic, callback: callback, config: config, createFiles: createFiles}).then(
						function (problems) {
							assertProblems(problems, [{
								id: "unknown-require",
								start: 62,
								end: 72,
								description: "This library could not be found, type information for it will be incomplete."
							}]);
						},
						function (error) {
							worker.getTestState().callback(error);
						});
				});
				it("unknown-require should not complain about node/commonJS not running", function(callback) {
					var topic = "define(function (require, exports, module){ var dep = 1;});";
					var config = { rules: {} };
					config.rules["unknown-require"] = 1;
					validate({buffer: topic, callback: callback, config: config}).then(
						function (problems) {
							assertProblems(problems, [
							]);
						},
						function (error) {
							worker.getTestState().callback(error);
						});
				});
				it("check-tern-plugin should not complain about node missing", function(callback) {
					var topic = "define(function (require, exports, module){ var dep = 1;});";
					var config = { rules: {} };
					config.rules["check-tern-plugin"] = 1;
					validate({buffer: topic, callback: callback, config: config}).then(
						function (problems) {
							assertProblems(problems, [
							]);
						},
						function (error) {
							worker.getTestState().callback(error);
						});
				});
			});
			describe('Simplied CommonJS using AMD define statements - no requirejs plugin running', function(){
				before('Reset Tern Server', function(done) {
					worker.start(done, {options:{}}); // Reset the tern server state to remove requirejs
				});
				it("missing-requirejs should warn about AMD missing", function(callback) {
					var topic = "define(function (require, exports, module){ var dep = 1;});";
					var config = { rules: {} };
					config.rules["missing-requirejs"] = 1;
					validate({buffer: topic, callback: callback, config: config}).then(
						function (problems) {
							assertProblems(problems, [
							{
								id: "missing-require-js",
								severity: 'warning',
								description: "To use AMD, the 'requirejs' plug-in needs to be running.",
								start: 0,
								end: 6
							},
							]);
						},
						function (error) {
							worker.getTestState().callback(error);
						});
				});
				it("unknown-require shouldn't suggest adding node or commonjs", function(callback) {
					var topic = "define(function (require, exports, module){ var dep = require('foo2');});";
					var config = { rules: {} };
					var createFiles = [{name: 'foo2', text: 'var a=3;'}];
					config.rules["unknown-require"] = 1;
					validate({buffer: topic, callback: callback, config: config, createFiles: createFiles}).then(
						function (problems) {
							assertProblems(problems, [{
								id: "unknown-require",
								start: 62,
								end: 68,
								description: "This library could not be found, type information for it will be incomplete."
							}]);
						},
						function (error) {
							worker.getTestState().callback(error);
						});
				});
				it("unknown-require shouldn't suggest adding node or commonjs for path with slash", function(callback) {
					var topic = "define(function (require, exports, module){ var dep = require('foo/bar2');});";
					var config = { rules: {} };
					var createFiles = [{name: 'foo/bar2', text: 'var a=4;'}];
					config.rules["unknown-require"] = 1;
					validate({buffer: topic, callback: callback, config: config, createFiles: createFiles}).then(
						function (problems) {
							assertProblems(problems, [{
								id: "unknown-require",
								start: 62,
								end: 72,
								description: "This library could not be found, type information for it will be incomplete."
							}]);
						},
						function (error) {
							worker.getTestState().callback(error);
						});
				});
				it("unknown-require should not complain about node/commonJS not running", function(callback) {
					var topic = "define(function (require, exports, module){ var dep = 1;});";
					var config = { rules: {} };
					config.rules["unknown-require"] = 1;
					validate({buffer: topic, callback: callback, config: config}).then(
						function (problems) {
							assertProblems(problems, [
							]);
						},
						function (error) {
							worker.getTestState().callback(error);
						});
				});
				it("check-tern-plugin should only complain about requirejs missing", function(callback) {
					var topic = "define(function (require, exports, module){ var dep = 1;});";
					var config = { rules: {} };
					config.rules["check-tern-plugin"] = 1;
					validate({buffer: topic, callback: callback, config: config}).then(
						function (problems) {
							assertProblems(problems, [
							]);
						},
						function (error) {
							worker.getTestState().callback(error);
						});
				});
			});
		});
	};
});
