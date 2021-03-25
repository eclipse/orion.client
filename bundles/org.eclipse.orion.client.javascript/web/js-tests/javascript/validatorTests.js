/*******************************************************************************
 * @license
 * Copyright (c) 2014, 2016 IBM Corporation and others.
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
	"orion/i18nUtil",
	"i18n!javascript/nls/problems",
	"javascript/ruleData",
	'mocha/mocha', //must stay at the end, not a module
], function(Validator, chai, Deferred, i18nUtil, messages, Rules) {
	var assert = chai.assert;
	return function(worker) {
		describe('Validator Tests', function() {
			this.timeout(10000);
			
			before('Reset Tern Server', function(done) {
				worker.start(done); // Reset the tern server state to remove any prior files
			});
			
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
					assert.equal(problems.length, expected.length, "The wrong number of problems was computed\n " + _problemToString(problems, expected));
					for(var i = 0; i < problems.length; i++) {
						var pb = problems[i];
						var expb = expected[i];
						if (expb.start) {
							assert.equal(pb.start, expb.start, "Wrong problem start");
						}
						if (expb.end) {
							assert.equal(pb.end, expb.end, "Wrong problem end");
						}
						if (expb.line) {
							assert.equal(pb.line, expb.line, "Wrong problem line number");
						}
						if (expb.description) {
							assert.equal(pb.description, expb.description, "Wrong problem message");
						}
						if (expb.severity) {
							assert.equal(pb.severity, expb.severity, "Wrong problem severity");
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
				var result;
				result += 'Expected: ' + expected.length + '\n';
				for (var i=0; i<expected.length; i++){
					result += expected[i].description + '\n';
				}
				result += 'Actual: ' + computed.length + '\n';
				for (var i=0; i<computed.length; i++){
					result += computed[i].description + '\n';
				}
				return result;
			}
			
			it("Test EOF 1", function(callback) {
				validate({buffer: "function", callback: callback}).then(function (problems) {
						assertProblems(problems, [
							{start: 0,
							 end: 8,
							 severity: 'error',
							 description: 'Unexpected token'
							}
						]);
					}, function (error) {
						worker.getTestState().callback(error);
					});
			});
			
			it("Test EOF 2", function(callback) {
				var config = { rules: {} };
				validate({buffer: "var foo = 10;\nfunction", callback: callback, config: config}).then(function (problems) {
						assertProblems(problems, [
							{start: 14,
							 end: 22,
							 severity: 'error',
							 description: 'Unexpected token'
							}
						]);
					}, function (error) {
						worker.getTestState().callback(error);
					});
			});

			it("Test invalid regex 1", function(callback) {
				var config = { rules: {} };
				validate({buffer: "/", callback: callback, config: config}).then(function (problems) {
						assertProblems(problems, [
							{start: 0,
							 end: 1,
							 severity: 'error',
							 description: "Unterminated regular expression"
							 }
						]);
					}, function (error) {
						worker.getTestState().callback(error);
					});
			});
			/**
			 * @see https://bugs.eclipse.org/bugs/show_bug.cgi?id=491727
			 */
			it("Test broken TemplateExpression 1", function(callback) {
				var config = { rules: {} };
				validate({buffer: "var v1 = foo(`bar),\n\tv2;", callback: callback, config: config}).then(function (problems) {
						assertProblems(problems, [
							{start: 14,
							 end: 15,
							 severity: 'error',
							 description: "Unterminated template"
							 },
							{start: 19,
							 end: 20,
							 severity: 'error',
							 description: "Unterminated template"
							 }
						]);
					}, function (error) {
						worker.getTestState().callback(error);
					});
			});
			/**
			 *
			 * @see https://bugs.eclipse.org/bugs/show_bug.cgi?id=491727
			 */
			it("Test broken TemplateExpression 2", function(callback) {
				var config = { rules: {} };
				validate({buffer: "var v1 = foo(`bar),\nv2;", callback: callback, config: config}).then(function (problems) {
						assertProblems(problems, [
							{start: 14,
							 end: 15,
							 severity: 'error',
							 description:"Unterminated template"
							 },
							{start: 19,
							 end: 20,
							 severity: 'error',
							 description: "Unterminated template"
							 }
						]);
					}, function (error) {
						worker.getTestState().callback(error);
					});
			});
			/**
			 *
			 * @see https://bugs.eclipse.org/bugs/show_bug.cgi?id=491727
			 */
			it("Test broken TemplateExpression 3", function(callback) {
				var config = { rules: {} };
				validate({buffer: "var v1 = foo(`bar),v2;", callback: callback, config: config}).then(function (problems) {
						assertProblems(problems, [
							{
							 start: 14,
							 end: 15,
							 severity: 'error',
							 description: "Unterminated template"
							 }
						]);
					}, function (error) {
						worker.getTestState().callback(error);
					});
			});
			/**
			 *
			 * @see https://bugs.eclipse.org/bugs/show_bug.cgi?id=491727
			 */
			it("Test broken TemplateExpression 4", function(callback) {
				var config = { rules: {} };
				validate({buffer: "var v1 = foo(`bar),\n\t\tv2;", callback: callback, config: config}).then(function (problems) {
						assertProblems(problems, [
							{start: 14,
							 end: 15,
							 severity: 'error',
							 description: "Unterminated template"
							},
							{start: 19,
							 end: 20,
							 severity: 'error',
							 description: "Unterminated template"
							}
						]);
					}, function (error) {
						worker.getTestState().callback(error);
					});
			});
			/**
			 *
			 * @see https://bugs.eclipse.org/bugs/show_bug.cgi?id=491727
			 */
			it("Test broken TemplateExpression 5", function(callback) {
				var config = { rules: {} };
				validate({buffer: "var v1 = foo(`bar);", callback: callback, config: config}).then(function (problems) {
						assertProblems(problems, [
							{start: 14,
							 end: 15,
							 severity: 'error',
							 description: "Unterminated template"
							 }
						]);
					}, function (error) {
						worker.getTestState().callback(error);
					});
			});
			// https://bugs.eclipse.org/bugs/show_bug.cgi?id=500004
			it("Test unterminated block comment", function(callback) {
				var config = { rules: {} };
				validate({buffer: "var v1 = foo(); /* test", callback: callback, config: config}).then(function (problems) {
						assertProblems(problems, [
							{
								start: 16,
								end: 17,
								severity: 'error',
								description: "Unterminated comment"
							}
						]);
					}, function (error) {
						worker.getTestState().callback(error);
					});
			});
			/**
			 *
			 * @see https://bugs.eclipse.org/bugs/show_bug.cgi?id=492484
			 */
			it("Test broken code", function(callback) {
				var config = { rules: {} };
				validate({buffer: "var index, a; if(index===a) {a[index>0index]};", callback: callback, config: config}).then(function (problems) {
						assertProblems(problems, [
							{start: 38,
							 end: 39,
							 severity: 'error',
							 description: "Identifier directly after number"
							 }
						]);
					}, function (error) {
						worker.getTestState().callback(error);
					});
			});
			describe("HTML script block validation tests", function(){
				before('Turn on browser library', function(done) {
					worker.start(done,  {options:{ libs: ['browser']}});
				});
				
				/*
				 * Tests that the validator runs correctly on script blocks and wrapped functions in HTML files
				 * @see https://bugs.eclipse.org/bugs/show_bug.cgi?id=476592
				 * @since 10.0
				 */
				it("HTML Script Block - simple block unused var", function(callback) {
					var config = { rules: {} };
					config.rules['no-unused-vars'] = 1;
					validate({buffer: '<html><head><script>var xx = 0; this.x;</script></head></html>', contentType: 'text/html', callback: callback, config: config}).then(function (problems) {
						assertProblems(problems, [
							{start: 24,
							 end: 26,
							 severity: 'warning',
							 description: i18nUtil.formatMessage.call(null, messages['no-unused-vars-unread'], {0: 'xx', nls: 'no-unused-vars-unread'})
							}
						]);
					}, function (error) {
						worker.getTestState().callback(error);
					});
				});
				/*
				 * Tests that the validator runs correctly on script blocks and wrapped functions in HTML files
				 * @see https://bugs.eclipse.org/bugs/show_bug.cgi?id=476592
				 * @since 10.0
				 */
				it("HTML Script Block - simple block missing semi", function(callback) {
					var config = { rules: {} };
					config.rules['semi'] = 1;
					validate({buffer: '<html><head><script>var xx = 0; xx++; this.x</script></head></html>', contentType: 'text/html', callback: callback, config: config}).then(function (problems) {
						assertProblems(problems, [
							{start: 43,
							 end: 44,
							 severity: 'warning',
							 description: i18nUtil.formatMessage.call(null, messages['semi-missing'], {})
							}
						]);
					}, function (error) {
						worker.getTestState().callback(error);
					});
				});
				/*
				 * Tests that the validator runs correctly on script blocks and wrapped functions in HTML files
				 * @see https://bugs.eclipse.org/bugs/show_bug.cgi?id=476592
				 * @since 10.0
				 */
				it("HTML Script Block - empty block", function(callback) {
					var config = { rules: Rules.defaults };
					validate({buffer: '<html><head><script></script></head></html>', contentType: 'text/html', callback: callback, config: config}).then(function (problems) {
						assertProblems(problems, [
						]);
					}, function (error) {
						worker.getTestState().callback(error);
					});
				});
				/*
				 * Tests that the validator runs correctly on script blocks and wrapped functions in HTML files
				 * @see https://bugs.eclipse.org/bugs/show_bug.cgi?id=476592
				 * @since 10.0
				 */
				it("HTML Script Block - multi block used var 1", function(callback) {
					var config = { rules: Rules.defaults };
					validate(
						{buffer: '<html><head><script>var xx;</script></head><body><a>test</a><script>xx++;</script></body></html>', contentType: 'text/html', callback: callback, config: config}).then(
						function (problems) {
							assertProblems(problems, [
							]);
						},
						function (error) {
							worker.getTestState().callback(error);
						});
				});
				/*
				 * Tests that the validator runs correctly on script blocks and wrapped functions in HTML files
				 * @see https://bugs.eclipse.org/bugs/show_bug.cgi?id=476592
				 * @since 10.0
				 */
				it("HTML Script Block - multi block used var 2", function(callback) {
					var config = { rules: Rules.defaults };
					validate(
						{buffer: '<html><head><script>xx++;</script></head><body><a>test</a><script>var xx;</script></body></html>', contentType: 'text/html', callback: callback, config: config}).then(
						function (problems) {
							assertProblems(problems, [
								{start: 20,
								 end: 22,
								 severity: 'info',
								 description: i18nUtil.formatMessage.call(null, messages['no-use-before-define'], {0: 'xx', nls: 'no-use-before-define'})
								}
							]);
						},
						function (error) {
							worker.getTestState().callback(error);
						});
				});
				/*
				 * Tests that the validator runs correctly on script blocks and wrapped functions in HTML files
				 * @see https://bugs.eclipse.org/bugs/show_bug.cgi?id=476592
				 * @since 10.0
				 */
				it("HTML Script Block - multi block unused var", function(callback) {
					var config = { rules: Rules.defaults };
					validate(
						{buffer: '<html><head><script>var xx;</script></head><body><a>test</a><script>var yy;</script></body></html>', contentType: 'text/html', callback: callback, config: config}).then(
						function (problems) {
							assertProblems(problems, [
								{start: 24,
								 end: 26,
								 severity: 'info',
								 description: i18nUtil.formatMessage.call(null, messages['no-unused-vars-unused'], {0: 'xx', nls: 'no-unused-vars-unused'})
								},
								{start: 72,
								 end: 74,
								 severity: 'info',
								 description: i18nUtil.formatMessage.call(null, messages['no-unused-vars-unused'], {0: 'yy', nls: 'no-unused-vars-unused'})
								}
							]);
						},
						function (error) {
							worker.getTestState().callback(error);
						});
					});
				/*
				 * Tests that the validator runs correctly on script blocks and wrapped functions in HTML files
				 * @see https://bugs.eclipse.org/bugs/show_bug.cgi?id=476592
				 * @since 10.0
				 */
				it("HTML Wrapped Function - multi block unused var", function(callback) {
					var config = { rules: Rules.defaults };
					validate(
						{buffer: '<html><head><script></script></head><body><a onclick="xx;;"></a></body></html>', contentType: 'text/html', callback: callback, config: config}).then(
						function (problems) {
							assertProblems(problems, [
								{start: 54,
								 end: 56,
								 severity: 'warning',
								 description: i18nUtil.formatMessage.call(null, messages['no-undef-defined'], {0: 'xx'})
								},
								{start: 57,
								 end: 58,
								 severity: 'info',
								 description: i18nUtil.formatMessage.call(null, messages['no-extra-semi'], {})
								}
							]);
						},
						function (error) {
							worker.getTestState().callback(error);
						});
				});
				/*
				 * Tests that the validator runs correctly on script blocks and wrapped functions in HTML files
				 * @see https://bugs.eclipse.org/bugs/show_bug.cgi?id=476592
				 * @since 10.0
				 */
				it("HTML - Empty array for empty blocks", function(callback) {
					var config = { rules: Rules.defaults };
					validate(
						{buffer: '<html><head><script></script></head><body><a onclick=""></a></body></html>', contentType: 'text/html', callback: callback, config: config}).then(
						function (problems) {
							assertProblems(problems, [
							]);
						},
						function (error) {
							worker.getTestState().callback(error);
						});
				});
				/*
				 * @see https://bugs.eclipse.org/bugs/show_bug.cgi?id=493144
				 */
				it("HTML - No script blocks", function(callback) {
					var config = { rules: Rules.defaults };
					validate(
						{buffer: '<html></html>', contentType: 'text/html', callback: callback, config: config}).then(
						function (problems) {
							assertProblems(problems, [
							]);
						},
						function (error) {
							worker.getTestState().callback(error);
						});
				});
			});
			
			describe('ESLint Rule Tests', function() {
				/**
				 * @see https://bugs.eclipse.org/bugs/show_bug.cgi?id=481045
				 */
				describe("Unknown Rule Tests", function(){
					it("missing rule - no options", function(callback) {
						var config = { rules: {} };
						config.rules['semi'] = 1;
						validate(
							{buffer: '/*eslint myrule:2 */ var foo \n var bar', callback: callback, config: config}).then(
							function (problems) {
								try {
									assert.equal(problems.problems.length, 3);
									worker.getTestState().callback();
								}
								catch(err) {
									worker.getTestState().callback(err);
								}
							}, function (error) {
								worker.getTestState().callback(error);
							});
					});
					it("missing rule - array options", function(callback) {
						var config = { rules: {} };
						config.rules['semi'] = 1;
						validate({buffer: '/*eslint strict: [2, "global"] */ var foo \n var bar', callback: callback, config: config}).then(function (problems) {
							try {
								assert.equal(problems.problems.length, 3);
								worker.getTestState().callback();
							}
							catch(err) {
								worker.getTestState().callback(err);
							}
						}, function (error) {
							worker.getTestState().callback(error);
						});
					});
					it("missing rule - eslint-disable", function(callback) {
						var config = { rules: {} };
						config.rules['semi'] = 1;
						validate({buffer: '/*eslint-disable strict */ var foo \n var bar', callback: callback, config: config}).then(function (problems) {
							try {
								assert.equal(problems.problems.length, 2);
								worker.getTestState().callback();
							}
							catch(err) {
								worker.getTestState().callback(err);
							}
						}, function (error) {
							worker.getTestState().callback(error);
						});
					});
					it("missing rule - eslint-enable", function(callback) {
						var config = { rules: {} };
						config.rules['semi'] = 1;
						validate({buffer: '/*eslint-enable strict */ var foo \n var bar', callback: callback, config: config}).then(function (problems) {
							try {
								assert.equal(problems.problems.length, 2);
								worker.getTestState().callback();
							}
							catch(err) {
								worker.getTestState().callback(err);
							}
						}, function (error) {
							worker.getTestState().callback(error);
						});
					});
					it("comment based problem (no AST node) - eslint-disable 1", function(callback) {
						var config = { rules: {} };
						config.rules['unnecessary-nls'] = 1;
						validate({buffer: '/*eslint-disable unnecessary-nls */ var a = 1; //$NON-NLS-1$', callback: callback, config: config}).then(function (problems) {
							try {
								assert.equal(problems.problems.length, 0);
								worker.getTestState().callback();
							}
							catch(err) {
								worker.getTestState().callback(err);
							}
						}, function (error) {
							worker.getTestState().callback(error);
						});
					});
					it("comment based problem (no AST node) - eslint-disable 2", function(callback) {
						var config = { rules: {} };
						config.rules['unnecessary-nls'] = 1;
						validate({buffer: '/*eslint-disable unnecessary-nls */ var a = "1"; //$NON-NLS-2$', callback: callback, config: config}).then(function (problems) {
							try {
								assert.equal(problems.problems.length, 0);
								worker.getTestState().callback();
							}
							catch(err) {
								worker.getTestState().callback(err);
							}
						}, function (error) {
							worker.getTestState().callback(error);
						});
					});
					it("comment based problem (no AST node) - eslint-enable/disable 3", function(callback) {
						var config = { rules: {} };
						config.rules['unnecessary-nls'] = 1;
						validate({buffer: '/*eslint-disable unnecessary-nls */ var a = 1; //$NON-NLS-1$\n/*eslint-enable unnecessary-nls */ var a = 1; //$NON-NLS-1$', callback: callback, config: config}).then(function (problems) {
							try {
								assert.equal(problems.problems.length, 1);
								worker.getTestState().callback();
							}
							catch(err) {
								worker.getTestState().callback(err);
							}
						}, function (error) {
							worker.getTestState().callback(error);
						});
					});
				});
				// check-tern-plugin --------------------------------------------
				describe('check-tern-plugin', function() {
					var RULE_ID = "check-tern-plugin";
					it("No eslint-env", function(callback) {
						var topic = 	"function foo() {}";
						var config = { rules: {} };
						config.rules[RULE_ID] = 1;
						validate({buffer: topic, callback: callback, config: config}).then(
							function (problems) {
								assertProblems(problems, [
								]);
							},
							function (error) {
								worker.getTestState().callback(error);
							});
					});
					it("Empty eslint-env", function(callback) {
						var topic = 	"/* eslint-env */\nfunction foo() {}";
						var config = { rules: {} };
						config.rules[RULE_ID] = 1;
						validate({buffer: topic, callback: callback, config: config}).then(
							function (problems) {
								assertProblems(problems, [
								]);
							},
							function (error) {
								worker.getTestState().callback(error);
							});
					});
					it("Bogus lib", function(callback) {
						var topic = 	"/*eslint-env garbage*/\nfunction foo() {}";
						var config = { rules: {} };
						config.rules[RULE_ID] = 1;
						validate({buffer: topic, callback: callback, config: config}).then(
							function (problems) {
								assertProblems(problems, [
								]);
							},
							function (error) {
								worker.getTestState().callback(error);
							});
					});
					it("No plugins entry", function(callback) {
						worker.postMessage({request: "start_server", args:{options: {}}}, /* @callback */ function(response) {
							assert(response, "Tried to restart Tern server with specific options, did not receive response");
							assert.equal("server_ready", response.state, "Tried to restart Tern server with specific options, the server was not ready");
							var topic = 	"/*eslint-env amd, mongodb*/\nfunction foo() {}";
							var config = { rules: {} };
							config.rules[RULE_ID] = 1;
							validate({buffer: topic, callback: callback, config: config}).then(
								function (problems) {
									assertProblems(problems, [
									{id: RULE_ID,
									 severity: 'warning',
									 description: "To work in the \'amd\' environment, the \'requirejs\' plugin must be running.",
									 nodeType: "EnvName"
									},
									{id: RULE_ID,
									 severity: 'warning',
									 description: "To work in the \'mongodb\' environment, the \'mongodb\' plugin must be running.",
									 nodeType: "EnvName"
									}
									]);
								},
								function (error) {
									worker.getTestState().callback(error);
								});
						});
					});
					it("Empty plugins entry", function(callback) {
						worker.postMessage({request: "start_server", args:{options: {plugins: {}}}}, /* @callback */ function(response) {
							assert(response, "Tried to restart Tern server with specific options, did not receive response");
							assert.equal("server_ready", response.state, "Tried to restart Tern server with specific options, the server was not ready");
							var topic = 	"/*eslint-env amd, mongodb*/\nfunction foo() {}";
							var config = { rules: {} };
							config.rules[RULE_ID] = 1;
							validate({buffer: topic, callback: callback, config: config}).then(
								function (problems) {
									assertProblems(problems, [
									{id: RULE_ID,
									 severity: 'warning',
									 description: "To work in the \'amd\' environment, the \'requirejs\' plugin must be running.",
									 nodeType: "EnvName"
									},
									{id: RULE_ID,
									 severity: 'warning',
									 description: "To work in the \'mongodb\' environment, the \'mongodb\' plugin must be running.",
									 nodeType: "EnvName"
									}
									]);
								},
								function (error) {
									worker.getTestState().callback(error);
								});
						});
					});
					it("RequireJS running", function(callback) {
						worker.postMessage({request: "start_server", args:{options: {plugins: {"requirejs": {}}}}}, /* @callback */ function(response) {
							assert(response, "Tried to restart Tern server with specific options, did not receive response");
							assert.equal("server_ready", response.state, "Tried to restart Tern server with specific options, the server was not ready");
							var topic = 	"/*eslint-env amd*/\nfunction foo() {}";
							var config = { rules: {} };
							config.rules[RULE_ID] = 1;
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
					it("RequireJS not running", function(callback) {
						worker.postMessage({request: "start_server", args:{options: {plugins: {"node": {}}}}}, /* @callback */ function(response) {
							assert(response, "Tried to restart Tern server with specific options, did not receive response");
							assert.equal("server_ready", response.state, "Tried to restart Tern server with specific options, the server was not ready");
							var topic = 	"/*eslint-env amd*/\nfunction foo() {}";
							var config = { rules: {} };
							config.rules[RULE_ID] = 1;
							validate({buffer: topic, callback: callback, config: config}).then(
								function (problems) {
									assertProblems(problems, [
									{id: RULE_ID,
									 severity: 'warning',
									 description: "To work in the \'amd\' environment, the \'requirejs\' plugin must be running.",
									 nodeType: "EnvName"
									}
									]);
								},
								function (error) {
									worker.getTestState().callback(error);
								});
						});
					});
					it("Postgres running", function(callback) {
						worker.postMessage({request: "start_server", args:{options: {plugins: {"postgres": {}}}}}, /* @callback */ function(response) {
							assert(response, "Tried to restart Tern server with specific options, did not receive response");
							assert.equal("server_ready", response.state, "Tried to restart Tern server with specific options, the server was not ready");
							var topic = 	"/*eslint-env pg*/\nfunction foo() {}";
							var config = { rules: {} };
							config.rules[RULE_ID] = 1;
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
					it("Postgres not running", function(callback) {
						worker.postMessage({request: "start_server", args:{options: {plugins: {"node": {}}}}}, /* @callback */ function(response) {
							assert(response, "Tried to restart Tern server with specific options, did not receive response");
							assert.equal("server_ready", response.state, "Tried to restart Tern server with specific options, the server was not ready");
							var topic = 	"/*eslint-env pg*/\nfunction foo() {}";
							var config = { rules: {} };
							config.rules[RULE_ID] = 1;
							validate({buffer: topic, callback: callback, config: config}).then(
								function (problems) {
									assertProblems(problems, [
									{id: RULE_ID,
									 severity: 'warning',
									 description: "To work in the \'pg\' environment, the \'postgres\' plugin must be running.",
									 nodeType: "EnvName"
									}
									]);
								},
								function (error) {
									worker.getTestState().callback(error);
								});
						});
					});
					it("Multiple plugins not running", function(callback) {
						worker.postMessage({request: "start_server", args:{options: {plugins: {"redis": {}}}}}, /* @callback */ function(response) {
							assert(response, "Tried to restart Tern server with specific options, did not receive response");
							assert.equal("server_ready", response.state, "Tried to restart Tern server with specific options, the server was not ready");
							var topic = 	"/*eslint-env mongodb,redis,pg*/\nfunction foo() {}";
							var config = { rules: {} };
							config.rules[RULE_ID] = 1;
							validate({buffer: topic, callback: callback, config: config}).then(
								function (problems) {
									assertProblems(problems, [
									{id: RULE_ID,
									 severity: 'warning',
									 description: "To work in the \'mongodb\' environment, the \'mongodb\' plugin must be running.",
									 nodeType: "EnvName"
									},
									{id: RULE_ID,
									 severity: 'warning',
									 description: "To work in the \'pg\' environment, the \'postgres\' plugin must be running.",
									 nodeType: "EnvName"
									}
									]);
								},
								function (error) {
									worker.getTestState().callback(error);
								});
						});
					});
				});
				// check-tern-lib --------------------------------------------
				describe('check-tern-lib', function() {
					var RULE_ID = "check-tern-lib";
					it("Browser lib not running", function(callback) {
						var topic = "/*eslint-env browser*/\nElement();";
						var config = { rules: {} };
						config.rules["check-tern-plugin"] = 1;
						validate({buffer: topic, callback: callback, config: config}).then(
							function (problems) {
								assertProblems(problems, [
									{id: RULE_ID,
									 severity: 'warning',
									 description: "To work in the \'browser\' environment, the \'browser\' library must be running.",
									 nodeType: "EnvName"
									},
								]);
							},
							function (error) {
								worker.getTestState().callback(error);
							});
					});
					it("Ecma7 lib not running with other garbage", function(callback) {
						var topic = "/*eslint-env garbage, ecma7, moreGarbage*/\nElement();";
						var config = { rules: {} };
						config.rules["check-tern-plugin"] = 1;
						validate({buffer: topic, callback: callback, config: config}).then(
							function (problems) {
								assertProblems(problems, [] 
								/*[
									{id: RULE_ID,
									 severity: 'warning',
									 description: "To work in the \'ecma7\' environment, the \'ecma7\' library must be running.",
									 nodeType: "EnvName"
									},
								]*/
								);
							},
							function (error) {
								worker.getTestState().callback(error);
							});
					});
					it("Mulitple libs not running", function(callback) {
						var topic = "/*eslint-env browser, ecma7, garbage*/\nElement();";
						var config = { rules: {} };
						config.rules["check-tern-plugin"] = 1;
						validate({buffer: topic, callback: callback, config: config}).then(
							function (problems) {
								assertProblems(problems, [
									{id: RULE_ID,
									 severity: 'warning',
									 description: "To work in the \'browser\' environment, the \'browser\' library must be running.",
									 nodeType: "EnvName"
									}/*,
									{id: RULE_ID,
									 severity: 'warning',
									 description: "To work in the \'ecma7\' environment, the \'ecma7\' library must be running.",
									 nodeType: "EnvName"
									},
*/
								]);
							},
							function (error) {
								worker.getTestState().callback(error);
							});
					});
				});
				// CURLY ---------------------------------------------
				describe('curly', function() {
					var RULE_ID = 'curly';
					it("should flag if statement", function(callback) {
						var config = { rules: {} };
						config.rules[RULE_ID] = 1;
						validate({buffer: "if (a == b) var i = 1;", callback: callback, config: config}).then(
							function (problems) {
								assertProblems(problems, [
									{id: RULE_ID,
									 severity: 'warning',
									 description: "Statement should be enclosed in braces.",
									 nodeType: "VariableDeclaration"
									}
								]);
							}, function (error) {
								worker.getTestState().callback(error);
							});
					});
					it("should flag else", function(callback) {
						var config = { rules: {} };
						config.rules[RULE_ID] = 1;
						validate({buffer: "if (a != b) {} else var i = 1;", callback: callback, config: config}).then(
							function (problems) {
								assertProblems(problems, [
									{id: RULE_ID,
									 severity: 'warning',
									 description: "Statement should be enclosed in braces.",
									 nodeType: "VariableDeclaration"
									}
								]);
							}, function (error) {
								worker.getTestState().callback(error);
							});
						});
					it("should flag while", function(callback) {
						var config = { rules: {} };
						config.rules[RULE_ID] = 1;
						validate({buffer: "while(true) var i = 1;", callback: callback, config: config}).then(
							function (problems) {
								assertProblems(problems, [
									{id: RULE_ID,
									 severity: 'warning',
									 description: "Statement should be enclosed in braces.",
									 nodeType: "VariableDeclaration"
									}
								]);
							}, function (error) {
								worker.getTestState().callback(error);
							});
					});
					it("should flag for", function(callback) {
						var config = { rules: {} };
						config.rules[RULE_ID] = 1;
						validate({buffer: "for(true;;) var i = 1;", callback: callback, config: config}).then(
							function (problems) {
								assertProblems(problems, [
									{id: RULE_ID,
									 severity: 'warning',
									 description: "Statement should be enclosed in braces.",
									 nodeType: "VariableDeclaration"
									}
								]);
							}, function (error) {
								worker.getTestState().callback(error);
							});
					});
					it("should flag for-in", function(callback) {
						var config = { rules: {} };
						config.rules[RULE_ID] = 1;
						validate({buffer: "var o = {}; for(var p in o) var i = 1;", callback: callback, config: config}).then(
							function (problems) {
								assertProblems(problems, [
									{id: RULE_ID,
									 severity: 'warning',
									 description: "Statement should be enclosed in braces.",
									 nodeType: "VariableDeclaration"
									}
								]);
							}, function (error) {
								worker.getTestState().callback(error);
							});
					});
					it("should flag with", function(callback) {
						var config = { rules: {} };
						config.rules[RULE_ID] = 1;
						validate({buffer: "with(f) var i = 1;", callback: callback, config: config}).then(
							function (problems) {
								assertProblems(problems, [
									{id: RULE_ID,
									 severity: 'warning',
									 description: "Statement should be enclosed in braces.",
									 nodeType: "VariableDeclaration"
									}
								]);
							}, function (error) {
								worker.getTestState().callback(error);
							});
					});
					it("should flag do-while", function(callback) {
						var config = { rules: {} };
						config.rules[RULE_ID] = 1;
						validate({buffer: "do var i = 1; while(true)", callback: callback, config: config}).then(
							function (problems) {
								assertProblems(problems, [
									{id: RULE_ID,
									 severity: 'warning',
									 description: "Statement should be enclosed in braces.",
									 nodeType: "VariableDeclaration"
									}
								]);
							}, function (error) {
								worker.getTestState().callback(error);
							});
					});
					it("should not flag with with block", function(callback) {
						var config = { rules: {} };
						config.rules[RULE_ID] = 1;
						validate({buffer: "with(f) {var i = 1;}", callback: callback, config: config}).then(
							function (problems) {
								assertProblems(problems, []);
							}, function (error) {
								worker.getTestState().callback(error);
							});
					});
					it("should not flag do-while with block", function(callback) {
						var config = { rules: {} };
						config.rules[RULE_ID] = 1;
						validate({buffer: "do {var i = 1;} while(true)", callback: callback, config: config}).then(
							function (problems) {
								assertProblems(problems, []);
							},
							function (error) {
								worker.getTestState().callback(error);
							});
					});
					it("should not flag if with block", function(callback) {
						var config = { rules: {} };
						config.rules[RULE_ID] = 1;
						validate({buffer: "if (a != null) {var i = 1;}", callback: callback, config: config}).then(
							function (problems) {
								assertProblems(problems, []);
							},
							function (error) {
								worker.getTestState().callback(error);
							});
					});
					it("should not flag else with block", function(callback) {
						var config = { rules: {} };
						config.rules[RULE_ID] = 1;
						validate({buffer: "if (null != a) {} else {var i = 1;}", callback: callback, config: config}).then(
							function (problems) {
								assertProblems(problems, []);
							},
							function (error) {
								worker.getTestState().callback(error);
							});
					});
					it("should not flag != for undefined check RHS", function(callback) {
						var config = { rules: {} };
						config.rules[RULE_ID] = 1;
						validate({buffer: "if (a != undefined) {}", callback: callback, config: config}).then(
							function (problems) {
								assertProblems(problems, []);
							},
							function (error) {
								worker.getTestState().callback(error);
							});
					});
					it("should not flag while with block", function(callback) {
						var config = { rules: {} };
						config.rules[RULE_ID] = 1;
						validate({buffer: "while(true) {var i = 1;}", callback: callback, config: config}).then(
							function (problems) {
								assertProblems(problems, []);
							},
							function (error) {
								worker.getTestState().callback(error);
							});
					});
					it("should not flag for with block", function(callback) {
						var config = { rules: {} };
						config.rules[RULE_ID] = 1;
						validate({buffer: "for(true;;) {var i = 1;}", callback: callback, config: config}).then(
							function (problems) {
								assertProblems(problems, []);
							},
							function (error) {
								worker.getTestState().callback(error);
							});
					});
					it("should not flag for-in with block", function(callback) {
						var config = { rules: {} };
						config.rules[RULE_ID] = 1;
						validate({buffer: "var o = {}; for(var p in o) {var i = 1;}", callback: callback, config: config}).then(
							function (problems) {
								assertProblems(problems, []);
							},
							function (error) {
								worker.getTestState().callback(error);
							});
					});
			
					it("should not flag else-if with no block", function(callback) {
						var config = { rules: {} };
						config.rules[RULE_ID] = 1;
						validate({buffer: "if(true) {var i = 1;}else if(false) {var t = 8;}", callback: callback, config: config}).then(
							function (problems) {
								assertProblems(problems, []);
							},
							function (error) {
								worker.getTestState().callback(error);
							});
					});
				});
				//EQEQEQ ---------------------------------------------
				describe('eqeqeq', function() {
					var RULE_ID = "eqeqeq";
					it("should flag ==", function(callback) {
						var config = { rules: {} };
						config.rules[RULE_ID] = 1;
						validate({buffer: "if (a == b) {}", callback: callback, config: config}).then(
							function (problems) {
								assertProblems(problems, [
									{id: RULE_ID,
									 severity: 'warning',
									 description: "Expected '===' and instead saw '=='.",
									 nodeType: "BinaryExpression"
									}
								]);
							},
							function (error) {
								worker.getTestState().callback(error);
							});
					});
					it("should flag !=", function(callback) {
						var config = { rules: {} };
						config.rules[RULE_ID] = 1;
						validate({buffer: "if (a != b) {}", callback: callback, config: config}).then(
							function (problems) {
								assertProblems(problems, [
									{id: RULE_ID,
									 severity: 'warning',
									 description: "Expected '!==' and instead saw '!='.",
									 nodeType: "BinaryExpression"
									}
								]);
							},
							function (error) {
								worker.getTestState().callback(error);
							});
					});
					it("should not flag ===", function(callback) {
						var config = { rules: {} };
						config.rules[RULE_ID] = 1;
						validate({buffer: "if (a === b) {}", callback: callback, config: config}).then(
							function (problems) {
								assertProblems(problems, []);
							},
							function (error) {
								worker.getTestState().callback(error);
							});
					});
					it("should not flag !==", function(callback) {
						var config = { rules: {} };
						config.rules[RULE_ID] = 1;
						validate({buffer: "if (a !== b) {}", callback: callback, config: config}).then(
							function (problems) {
								assertProblems(problems, []);
							},
							function (error) {
								worker.getTestState().callback(error);
							});
					});
					it("should indicate the problematic operator in 'related' token", function(callback) {
						var config = { rules: {} };
						config.rules[RULE_ID] = 1;
						validate({buffer: "if (2 == 1) {}", callback: callback, config: config}).then(
							function (problems) {
								assertProblems(problems, [
									{id: RULE_ID,
									 severity: 'warning',
									 description: "Expected '===' and instead saw '=='.",
									 nodeType: "BinaryExpression",
									 start: 6,
									 end: 8
									}
								]);
							},
							function (error) {
								worker.getTestState().callback(error);
							});
					});
					//nullness checks
					it("should not flag != for null check RHS", function(callback) {
						var config = { rules: {} };
						config.rules[RULE_ID] = 1;
						validate({buffer: "if (a != null) {}", callback: callback, config: config}).then(
							function (problems) {
								assertProblems(problems, []);
							},
							function (error) {
								worker.getTestState().callback(error);
							});
					});
					it("should not flag != for null check LHS", function(callback) {
						var config = { rules: {} };
						config.rules[RULE_ID] = 1;
						validate({buffer: "if (null != a) {}", callback: callback, config: config}).then(
							function (problems) {
								assertProblems(problems, []);
							},
							function (error) {
								worker.getTestState().callback(error);
							});
					});
					it("should not flag != for undefined check RHS", function(callback) {
						var config = { rules: {} };
						config.rules[RULE_ID] = 1;
						validate({buffer: "if (a != undefined) {}", callback: callback, config: config}).then(
							function (problems) {
								assertProblems(problems, []);
							},
							function (error) {
								worker.getTestState().callback(error);
							});
					});
					it("should not flag != for null check LHS", function(callback) {
						var config = { rules: {} };
						config.rules[RULE_ID] = 1;
						validate({buffer: "if (undefined != a) {}", callback: callback, config: config}).then(
							function (problems) {
								assertProblems(problems, []);
							},
							function (error) {
								worker.getTestState().callback(error);
							});
					});
					it("should flag == 2", function(callback) {
						var config = { rules: {} };
						config.rules[RULE_ID] = 1;
						validate({buffer: "var a = 6;var b = 7;var c = 8;var test = a == b == c;", callback: callback, config: config}).then(
							function (problems) {
								assertProblems(problems, [
									{
										id: RULE_ID,
										severity: 'warning',
										description: "Expected '===' and instead saw '=='.",
										nodeType: "BinaryExpression",
										start: 48,
										end: 50
									},
									{
										id: RULE_ID,
										severity: 'warning',
										description: "Expected '===' and instead saw '=='.",
										nodeType: "BinaryExpression",
										start: 43,
										end: 45
									}
								]);
							},
							function (error) {
								worker.getTestState().callback(error);
							});
					});
					// https://bugs.eclipse.org/bugs/show_bug.cgi?id=495807
					it("should flag == 3", function(callback) {
						var config = { rules: {} };
						config.rules[RULE_ID] = 1;
						validate({buffer: "if (typeof(foo)==\"bar\") {}", callback: callback, config: config}).then(
							function (problems) {
								assertProblems(problems, [
									{
										id: RULE_ID,
										severity: 'warning',
										description: "Expected '===' and instead saw '=='.",
										nodeType: "BinaryExpression",
										start: 15,
										end: 17
									}
								]);
							},
							function (error) {
								worker.getTestState().callback(error);
							});
					});
				});
				// MISSING-DOC DECL------------------------------------------------
				describe("missing-doc - function declaration", function(){
					var RULE_ID = "missing-doc";
					it("should not flag for root function declaration", function(callback) {
						var config = { rules: {} };
						config.rules[RULE_ID] = [1, {decl: 1}];
						validate({buffer: "var v;\n/**foo*/function f() {};", callback: callback, config: config}).then(
							function (problems) {
								assertProblems(problems, []);
							},
							function (error) {
								worker.getTestState().callback(error);
							});
					});
					it("should not flag for excessive white space", function(callback) {
						var config = { rules: {} };
						config.rules[RULE_ID] = [1, {decl: 1}];
						validate({buffer: "var v;\n/**foo*/\n\n\nfunction f() {};", callback: callback, config: config}).then(
							function (problems) {
								assertProblems(problems, []);
							},
							function (error) {
								worker.getTestState().callback(error);
							});
					});
					it("should flag for line comment", function(callback) {
						var config = { rules: {} };
						config.rules[RULE_ID] = [1, {decl: 1}];
						validate({buffer: "var v;\n//foo\nfunction f() {};", callback: callback, config: config}).then(
							function (problems) {
								assertProblems(problems, [{
										id: RULE_ID,
										severity: 'warning',
										description: "Missing documentation for function \'f\'.",
										nodeType: "Identifier"
									}
								]);
							},
							function (error) {
								worker.getTestState().callback(error);
							});
					});
					it("should flag for excessive space with line comment", function(callback) {
						var config = { rules: {} };
						config.rules[RULE_ID] = [1, {decl: 1}];
						validate({buffer: "var v;\n//foo\n\n\n\nfunction f() {};", callback: callback, config: config}).then(
							function (problems) {
								assertProblems(problems, [{
										id: RULE_ID,
										severity: 'warning',
										description: "Missing documentation for function \'f\'.",
										nodeType: "Identifier"
									}
								]);
							},
							function (error) {
								worker.getTestState().callback(error);
							});
					});
					it("should not flag for inner block comment", function(callback) {
						var config = { rules: {} };
						config.rules[RULE_ID] = [1, {decl: 1}];
						validate({buffer: "var v;\n/***/function o() {/***/function f() {};};", callback: callback, config: config}).then(
							function (problems) {
								assertProblems(problems, []);
							},
							function (error) {
								worker.getTestState().callback(error);
							});
					});
					it("should not flag for excessive space with inner block comment", function(callback) {
						var config = { rules: {} };
						config.rules[RULE_ID] = [1, {decl: 1}];
						validate({buffer: "var v;\n/***/function o() {/***/\n\n\n\nfunction f() {};};", callback: callback, config: config}).then(
							function (problems) {
								assertProblems(problems, []);
							},
							function (error) {
								worker.getTestState().callback(error);
							});
					});
					it("should flag for inner line comment", function(callback) {
						var config = { rules: {} };
						config.rules[RULE_ID] = [1, {decl: 1}];
						validate({buffer: "var v;\n/***/function o() {//foo\nfunction f() {};};", callback: callback, config: config}).then(
							function (problems) {
								assertProblems(problems, [{
										id: RULE_ID,
										severity: 'warning',
										description: "Missing documentation for function \'f\'.",
										nodeType: "Identifier"
								}]);
							},
							function (error) {
								worker.getTestState().callback(error);
							});
					});
					it("should flag for excessive space with inner line comment", function(callback) {
						var config = { rules: {} };
						config.rules[RULE_ID] = [1, {decl: 1}];
						validate({buffer: "var v;\n/***/function o() {//foo\n\n\n\nfunction f() {};};", callback: callback, config: config}).then(
							function (problems) {
								assertProblems(problems, [{
										id: RULE_ID,
										severity: 'warning',
										description: "Missing documentation for function \'f\'.",
										nodeType: "Identifier"
								}]);
							},
							function (error) {
								worker.getTestState().callback(error);
							});
					});
					it("should flag for function f", function(callback) {
						var config = { rules: {} };
						config.rules[RULE_ID] = [1, {decl: 1}];
						validate({buffer: "var foo;\nfunction f() {};", callback: callback, config: config}).then(
							function (problems) {
								assertProblems(problems, [{
										id: RULE_ID,
										severity: 'warning',
										description: "Missing documentation for function \'f\'.",
										nodeType: "Identifier"
								}]);
							},
							function (error) {
								worker.getTestState().callback(error);
							});
					});
					it("should flag for inner function declaration", function(callback) {
						var config = { rules: {} };
						config.rules[RULE_ID] = [1, {decl: 1}];
						validate({buffer: "var foo;\n/***/\nfunction o() {\nfunction f() {}; };", callback: callback, config: config}).then(
							function (problems) {
								assertProblems(problems, [{
										id: RULE_ID,
										severity: 'warning',
										description: "Missing documentation for function \'f\'.",
										nodeType: "Identifier"
								}]);
							},
							function (error) {
								worker.getTestState().callback(error);
							});
					});
					it("should flag for root node", function(callback) {
						/**
						 * This test covers the Estraverse bug:
						 * https://github.com/Constellation/estraverse/issues/20
						 *
						 * Fixed with https://bugs.eclipse.org/bugs/show_bug.cgi?id=434994
						 * we no longer require Estraverse to attach comments
						 */
						var config = { rules: {} };
						config.rules[RULE_ID] = [1, {decl: 1}];
						validate({buffer: "/***/function f() {};", callback: callback, config: config}).then(
							function (problems) {
								assertProblems(problems, []);
							},
							function (error) {
								worker.getTestState().callback(error);
							});
					});
					it("should flag should include {type: 'decl'} as related object", function(callback) {
						var config = { rules: {} };
						config.rules[RULE_ID] = [1, {decl: 1}];
						validate({buffer: "var foo;\nfunction f() {};", callback: callback, config: config}).then(
							function (problems) {
								assertProblems(problems, [{
										id: RULE_ID,
										severity: 'warning',
										description: "Missing documentation for function \'f\'.",
										nodeType: "Identifier"
								}]);
							},
							function (error) {
								worker.getTestState().callback(error);
							});
					});
					/**
					 * https://bugs.eclipse.org/bugs/show_bug.cgi?id=457044
					 */
					it("should flag with preceding line comment", function(callback) {
						var config = { rules: {} };
						config.rules[RULE_ID] = [1, {decl: 1}];
						validate({buffer: "var foo; //line comment \nfunction f() {};", callback: callback, config: config}).then(
							function (problems) {
								assertProblems(problems, [{
										id: RULE_ID,
										severity: 'warning',
										description: "Missing documentation for function \'f\'.",
										nodeType: "Identifier"
								}]);
							},
							function (error) {
								worker.getTestState().callback(error);
							});
					});
					it("should not flag missing doc for property when there is a syntax error", function(callback) {
						var config = { rules: {} };
						config.rules[RULE_ID] = [1, {decl: 1}];
						validate({buffer: "var f = { /** @return {Array.<String>} array or null */ one: function() {f.one. }}", callback: callback, config: config}).then(
							function (problems) {
								assertProblems(problems, [{
										id: "syntaxErrorBadToken",
										severity: 'error',
										description: "Unexpected token"
								}]);
							},
							function (error) {
								worker.getTestState().callback(error);
							});
					});
				});
				
				// MISSING-DOC EXPR
				describe("missing-doc - function expression", function(){
					var RULE_ID = "missing-doc";
					var flagDecl = { rules: {} };
					var flagExpr = { rules: {} };
					flagDecl.rules[RULE_ID] = [1, {decl: 1}];
					flagExpr.rules[RULE_ID] = [1, {expr: 1}];
					
					/**
					 * @see https://bugs.eclipse.org/bugs/show_bug.cgi?id=488261
					 */
					it("should not flag for function expression assignment 1", function(callback) {
						var config = flagExpr;
						validate({buffer: "/** */Foo.bar.baz = function() {};", callback: callback, config: config}).then(
							function (problems) {
								assertProblems(problems, []);
							},
							function (error) {
								worker.getTestState().callback(error);
							});
					});
					/**
					 * @see https://bugs.eclipse.org/bugs/show_bug.cgi?id=488261
					 */
					it("should not flag for function expression assignment 2", function(callback) {
						var config = flagExpr;
						validate({buffer: "/** */Foo.bar.baz = function baz() {};", callback: callback, config: config}).then(
							function (problems) {
								assertProblems(problems, []);
							},
							function (error) {
								worker.getTestState().callback(error);
							});
					});
					/**
					 * @see https://bugs.eclipse.org/bugs/show_bug.cgi?id=488261
					 */
					it("should not flag for function expression assignment 3", function(callback) {
						var config = flagExpr;
						validate({buffer: "/** */Foo.bar['baz'] = function() {};", callback: callback, config: config}).then(
							function (problems) {
								assertProblems(problems, []);
							},
							function (error) {
								worker.getTestState().callback(error);
							});
					});
					/**
					 * @see https://bugs.eclipse.org/bugs/show_bug.cgi?id=488261
					 */
					it("should not flag for function expression assignment 3", function(callback) {
						var config = flagExpr;
						validate({buffer: "/** */Foo['bar']['baz'] = function() {};", callback: callback, config: config}).then(
							function (problems) {
								assertProblems(problems, []);
							},
							function (error) {
								worker.getTestState().callback(error);
							});
					});
					
					it("should not flag for object property function expression", function(callback) {
						var config = flagExpr;
						validate({buffer: "var foo = {/**foo*/f: function() {}};", callback: callback, config: config}).then(
							function (problems) {
								assertProblems(problems, []);
							},
							function (error) {
								worker.getTestState().callback(error);
							});
					});
					it("should not flag for excessive white space", function(callback) {
						var config = flagExpr;
						validate({buffer: "var foo = {/**foo*/\n\n\n\nf: function() {}};", callback: callback, config: config}).then(
							function (problems) {
								assertProblems(problems, []);
							},
							function (error) {
								worker.getTestState().callback(error);
							});
					});
					it("should flag for line comment", function(callback) {
						var config = flagExpr;
						validate({buffer: "var foo = {//foo\nf: function() {}};", callback: callback, config: config}).then(
							function (problems) {
								assertProblems(problems, [{
									id: RULE_ID,
									severity: 'warning',
									description: "Missing documentation for function \'f\'.",
									nodeType: "Identifier"
								}]);
							},
							function (error) {
								worker.getTestState().callback(error);
							});
					});
					it("should flag for excessive space with line comment", function(callback) {
						var config = flagExpr;
						validate({buffer: "var foo = {//foo\n\n\n\n\n\nf: function() {}};", callback: callback, config: config}).then(
							function (problems) {
								assertProblems(problems, [{
									id: RULE_ID,
									severity: 'warning',
									description: "Missing documentation for function \'f\'.",
									nodeType: "Identifier"
								}]);
							},
							function (error) {
								worker.getTestState().callback(error);
							});
					});
					it("should not flag for inner block comment", function(callback) {
						var config = flagExpr;
						validate({buffer: "var foo = {/**foo*/o: function() { var bar = { /***/f: function() {}}}};", callback: callback, config: config}).then(
							function (problems) {
								assertProblems(problems, []);
							},
							function (error) {
								worker.getTestState().callback(error);
							});
					});
					it("should not flag for excessive space with inner block comment", function(callback) {
						var config = flagExpr;
						validate({buffer: "var foo = {/**foo*/o: function() { var bar = { /***/\n\n\n\n\nf: function() {}}}};", callback: callback, config: config}).then(
							function (problems) {
								assertProblems(problems, []);
							},
							function (error) {
								worker.getTestState().callback(error);
							});
					});
					it("should flag for inner line comment", function(callback) {
						var config = flagDecl;
						validate({buffer: "var foo = {/**foo*/o: function() { var bar = { //foo\nf: function() {}}}};", callback: callback, config: config}).then(
							function (problems) {
								assertProblems(problems, [{
									id: RULE_ID,
									severity: 'warning',
									description: "Missing documentation for function \'f\'.",
									nodeType:  "Identifier"
								}]);
							},
							function (error) {
								worker.getTestState().callback(error);
							});
					});
					it("should flag for excessive space with inner line comment", function(callback) {
						var config = flagDecl;
						validate({buffer: "var foo = {/**foo*/o: function() { var bar = { //foo\n\n\n\n\n\nf: function() {}}}};", callback: callback, config: config}).then(
							function (problems) {
								assertProblems(problems, [{
									id: RULE_ID,
									severity: 'warning',
									description: "Missing documentation for function \'f\'.",
									nodeType:  "Identifier"
								}]);
							},
							function (error) {
								worker.getTestState().callback(error);
							});
					});
					it("should not flag for member expression assignment", function(callback) {
						var config = flagDecl;
						validate({buffer: "var Foo; /***/Foo.bar = function() {};", callback: callback, config: config}).then(
							function (problems) {
								assertProblems(problems, []);
							},
							function (error) {
								worker.getTestState().callback(error);
							});
					});
					it("should not flag for member literal expression assignment", function(callback) {
						var config = flagDecl;
						validate({buffer: "var Foo; /***/Foo[\'bar\'] = function() {};", callback: callback, config: config}).then(
							function (problems) {
								assertProblems(problems, []);
							},
							function (error) {
								worker.getTestState().callback(error);
							});
					});
					it("should not flag for member expression assignment excessive space", function(callback) {
						var config = flagDecl;
						validate({buffer: "var Foo; /***/\n\n\n\n\nFoo.bar = function() {};", callback: callback, config: config}).then(
							function (problems) {
								assertProblems(problems, []);
							},
							function (error) {
								worker.getTestState().callback(error);
							});
					});
					it("should not flag for member literal expression assignment excessive space", function(callback) {
						var config = flagDecl;
						validate({buffer: "var Foo; /***/\n\n\n\n\nFoo[\'bar\'] = function() {};", callback: callback, config: config}).then(
							function (problems) {
								assertProblems(problems, []);
							},
							function (error) {
								worker.getTestState().callback(error);
							});
					});
					it("should flag for member expression assignment line comment", function(callback) {
						var config = flagDecl;
						validate({buffer: "var Foo; //comment\nFoo.bar = function() {};", callback: callback, config: config}).then(
							function (problems) {
								assertProblems(problems, [{
									id: RULE_ID,
									severity: 'warning',
									description: "Missing documentation for function \'bar\'.",
									nodeType:  "Identifier"
								}]);
							},
							function (error) {
								worker.getTestState().callback(error);
							});
					});
					it("should flag for member literal expression assignment line comment", function(callback) {
						var config = flagDecl;
						validate({buffer: "var Foo; //comment\nFoo[\'bar\'] = function() {};", callback: callback, config: config}).then(
							function (problems) {
								assertProblems(problems, [{
									id: RULE_ID,
									severity: 'warning',
									description: "Missing documentation for function \'bar\'.",
									nodeType:  "Literal"
								}]);
							},
							function (error) {
								worker.getTestState().callback(error);
							});
					});
					it("should flag for member expression assignment line comment excessive space", function(callback) {
						var config = flagDecl;
						validate({buffer: "var Foo; //comment\n\n\n\n\n\nFoo.bar = function() {};", callback: callback, config: config}).then(
							function (problems) {
								assertProblems(problems, [{
									id: RULE_ID,
									severity: 'warning',
									description: "Missing documentation for function \'bar\'.",
									nodeType:  "Identifier"
								}]);
							},
							function (error) {
								worker.getTestState().callback(error);
							});
					});
					it("should flag for member literal expression assignment line comment excessive space", function(callback) {
						var config = flagDecl;
						validate({buffer: "var Foo; //comment\n\n\n\n\n\nFoo[\'bar\'] = function() {};", callback: callback, config: config}).then(
							function (problems) {
								assertProblems(problems, [{
									id: RULE_ID,
									severity: 'warning',
									description: "Missing documentation for function \'bar\'.",
									nodeType:  "Literal"
								}]);
							},
							function (error) {
								worker.getTestState().callback(error);
							});
					});
					it("should flag for function expression f", function(callback) {
						var config = flagDecl;
						validate({buffer: "var foo = { f: function() {}};", callback: callback, config: config}).then(
							function (problems) {
								assertProblems(problems, [{
									id: RULE_ID,
									severity: 'warning',
									description: "Missing documentation for function \'f\'.",
									nodeType:  "Identifier"
								}]);
							},
							function (error) {
								worker.getTestState().callback(error);
							});
					});
					it("should flag for function expression member", function(callback) {
						var config = flagDecl;
						validate({buffer: "var Foo; Foo.member = function() {};", callback: callback, config: config}).then(
							function (problems) {
								assertProblems(problems, [{
									id: RULE_ID,
									severity: 'warning',
									description: "Missing documentation for function \'member\'.",
									nodeType:  "Identifier"
								}]);
							},
							function (error) {
								worker.getTestState().callback(error);
							});
					});
					it("should flag for function expression literal member", function(callback) {
						var config = flagExpr;
						validate({buffer: "var Foo; Foo[\'member\'] = function() {};", callback: callback, config: config}).then(
							function (problems) {
								assertProblems(problems, [{
									id: RULE_ID,
									severity: 'warning',
									description: "Missing documentation for function \'member\'.",
									nodeType:  "Literal"
								}]);
							},
							function (error) {
								worker.getTestState().callback(error);
							});
					});
					it("should flag for inner function expression", function(callback) {
						var config = flagExpr;
						validate({buffer: "var foo = {/**foo*/o: function() { var bar = { f: function() {}}}};", callback: callback, config: config}).then(
							function (problems) {
								assertProblems(problems, [{
									id: RULE_ID,
									severity: 'warning',
									description: "Missing documentation for function \'f\'.",
									nodeType:  "Identifier"
								}]);
							},
							function (error) {
								worker.getTestState().callback(error);
							});
					});
					it("should flag with preceding line comment", function(callback) {
						var config = flagDecl;
						validate({buffer: "var foo = {//line comment\n one: function() {}}", callback: callback, config: config}).then(
							function (problems) {
								assertProblems(problems, [{
									id: RULE_ID,
									severity: 'warning',
									description: "Missing documentation for function \'one\'.",
									nodeType:  "Identifier",
									start: 0,
									end: 30
								}]);
							},
							function (error) {
								worker.getTestState().callback(error);
							});
					});
				});
				
				//NEW-PARENS -------------------------------------------------------------------
				describe('new-parens', function() {
					var RULE_ID = "new-parens";
					it("should flag new", function(callback) {
						var config = { rules: {} };
						config.rules[RULE_ID] = 1;
						validate({buffer: "new Object", callback: callback, config: config}).then(
							function (problems) {
								assertProblems(problems, [{
									id: RULE_ID,
									severity: 'warning',
									description: "Missing parentheses invoking constructor.",
									nodeType:  "Identifier"
								}]);
							},
							function (error) {
								worker.getTestState().callback(error);
							});
					});
					it("should flag new with non-parenthesis token next", function(callback) {
						var config = { rules: {} };
						config.rules[RULE_ID] = 1;
						validate({buffer: "new Object;", callback: callback, config: config}).then(
							function (problems) {
								assertProblems(problems, [{
									id: RULE_ID,
									severity: 'warning',
									description: "Missing parentheses invoking constructor.",
									nodeType:  "Identifier"
								}]);
							},
							function (error) {
								worker.getTestState().callback(error);
							});
					});
					it("should not flag new", function(callback) {
						var config = { rules: {} };
						config.rules[RULE_ID] = 1;
						validate({buffer: "new Object();", callback: callback, config: config}).then(
							function (problems) {
								assertProblems(problems, []);
							},
							function (error) {
								worker.getTestState().callback(error);
							});
					});
					it("should not flag new with extra space", function(callback) {
						//TODO this is a bug in eslint, once we update to a newer version this has been fixed
						var config = { rules: {} };
						config.rules[RULE_ID] = 1;
						validate({buffer: "new Object	();", callback: callback, config: config}).then(
							function (problems) {
								assertProblems(problems, []);
							},
							function (error) {
								worker.getTestState().callback(error);
							});
					});
				});
				
				//NO-CALLER ----------------------------------------------------------
				describe('no-caller', function() {
					var RULE_ID = "no-caller";
					it("should flag arguments.callee", function(callback) {
						var config = { rules: {} };
						config.rules[RULE_ID] = 1;
						validate({buffer: "(function() { arguments.callee; }());", callback: callback, config: config}).then(
							function (problems) {
								assertProblems(problems, [{
									id: RULE_ID,
									severity: 'warning',
									description: "\'arguments.callee\' is deprecated."
								}]);
							},
							function (error) {
								worker.getTestState().callback(error);
							});
					});
					it("should flag arguments.caller", function(callback) {
						var config = { rules: {} };
						config.rules[RULE_ID] = 1;
						validate({buffer: "(function() { arguments.caller; }());", callback: callback, config: config}).then(
							function (problems) {
								assertProblems(problems, [{
									id: RULE_ID,
									severity: 'warning',
									description: "\'arguments.caller\' is deprecated."
								}]);
							},
							function (error) {
								worker.getTestState().callback(error);
							});
					});
					// Tests that the node flagged is the Identifier "callee" or "caller" not the parent CallExpression
					it("should flag the bad Identifier", function(callback) {
						var config = { rules: {} };
						config.rules[RULE_ID] = 1;
						validate({buffer: "(function() { arguments.caller; }());", callback: callback, config: config}).then(
							function (problems) {
								assertProblems(problems, [{
									id: RULE_ID,
									severity: 'warning',
									description: "\'arguments.caller\' is deprecated.",
									nodeType: "Identifier"
								}]);
							},
							function (error) {
								worker.getTestState().callback(error);
							});
					});
					it("should flag arguments['callee']", function(callback) {
						var config = { rules: {} };
						config.rules[RULE_ID] = 1;
						validate({buffer: "(function() { arguments['callee']; }());", callback: callback, config: config}).then(
							function (problems) {
								assertProblems(problems, [{
									id: RULE_ID,
									severity: 'warning',
									description: "\'arguments.callee\' is deprecated."
								}]);
							},
							function (error) {
								worker.getTestState().callback(error);
							});
					});
					it("should flag arguments['caller']", function(callback) {
						var config = { rules: {} };
						config.rules[RULE_ID] = 1;
						validate({buffer: "(function() { arguments['caller']; }());", callback: callback, config: config}).then(
							function (problems) {
								assertProblems(problems, [{
									id: RULE_ID,
									severity: 'warning',
									description: "\'arguments.caller\' is deprecated."
								}]);
							},
							function (error) {
								worker.getTestState().callback(error);
							});
					});
					// Tests that the node flagged is the Identifier "callee" or "caller" not the parent CallExpression
					it("should flag the bad Identifier", function(callback) {
						var config = { rules: {} };
						config.rules[RULE_ID] = 1;
						validate({buffer: "(function() { arguments['caller']; }());", callback: callback, config: config}).then(
							function (problems) {
								assertProblems(problems, [{
									id: RULE_ID,
									severity: 'warning',
									description: "\'arguments.caller\' is deprecated.",
									nodeType: "Literal"
								}]);
							},
							function (error) {
								worker.getTestState().callback(error);
							});
					});
					it("should not flag arguments.{something else}", function(callback) {
						var config = { rules: {} };
						config.rules[RULE_ID] = 1;
						validate({buffer: "(function() { arguments.fizz; }());", callback: callback, config: config}).then(
							function (problems) {
								assertProblems(problems, []);
							},
							function (error) {
								worker.getTestState().callback(error);
							});
					});
					it("should not flag arguments[n]", function(callback) {
						var config = { rules: {} };
						config.rules[RULE_ID] = 1;
						validate({buffer: "(function() { arguments[0]; }());", callback: callback, config: config}).then(
							function (problems) {
								assertProblems(problems, []);
							},
							function (error) {
								worker.getTestState().callback(error);
							});
					});
					/**
					 * @see https://bugs.eclipse.org/bugs/show_bug.cgi?id=460976
					 */
					it("should not flag arguments.callee outside a function", function(callback) {
						var config = { rules: {} };
						config.rules[RULE_ID] = 1;
						validate({buffer: "var arguments = {callee: 1}; arguments.callee();", callback: callback, config: config}).then(
							function (problems) {
								assertProblems(problems, []);
							},
							function (error) {
								worker.getTestState().callback(error);
							});
					});
					/**
					 * @see https://bugs.eclipse.org/bugs/show_bug.cgi?id=460976
					 */
					it("should not flag arguments.caller outside a function", function(callback) {
						var config = { rules: {} };
						config.rules[RULE_ID] = 1;
						validate({buffer: "var arguments = {caller: 1}; arguments.caller();", callback: callback, config: config}).then(
							function (problems) {
								assertProblems(problems, []);
							},
							function (error) {
								worker.getTestState().callback(error);
							});
					});
				});
				//NO-COMMA-DANGLE ----------------------------------------
				describe('no-comma-dangle', function() {
					var RULE_ID = "no-comma-dangle";
					it("should flag simple object", function(callback) {
						var config = { rules: {} };
						config.rules[RULE_ID] = 1;
						validate({buffer: "var o = {one:1, two:2,}", callback: callback, config: config}).then(
							function (problems) {
								assertProblems(problems, [{
									id: RULE_ID,
									severity: 'warning',
									description: "Trailing commas in object expressions are discouraged.",
									nodeType: "ObjectExpression"
								}]);
							},
							function (error) {
								worker.getTestState().callback(error);
							});
					});
					it("should flag object param", function(callback) {
						var config = { rules: {} };
						config.rules[RULE_ID] = 1;
						validate({buffer: "f({one:1, two:2,});", callback: callback, config: config}).then(
							function (problems) {
								assertProblems(problems, [{
									id: RULE_ID,
									severity: 'warning',
									description: "Trailing commas in object expressions are discouraged.",
									nodeType: "ObjectExpression"
								}]);
							},
							function (error) {
								worker.getTestState().callback(error);
							});
					});
					it("should flag array expression", function(callback) {
						var config = { rules: {} };
						config.rules[RULE_ID] = 1;
						validate({buffer: "var a = [{one:1, two:2,}];", callback: callback, config: config}).then(
							function (problems) {
								assertProblems(problems, [{
									id: RULE_ID,
									severity: 'warning',
									description: "Trailing commas in object expressions are discouraged.",
									nodeType: "ObjectExpression"
								}]);
							},
							function (error) {
								worker.getTestState().callback(error);
							});
					});
					it("should not flag simple object", function(callback) {
						var config = { rules: {} };
						config.rules[RULE_ID] = 1;
						validate({buffer: "var o = {one:1, two:2}", callback: callback, config: config}).then(
							function (problems) {
								assertProblems(problems, []);
							},
							function (error) {
								worker.getTestState().callback(error);
							});
					});
					it("should not flag object param", function(callback) {
						var config = { rules: {} };
						config.rules[RULE_ID] = 1;
						validate({buffer: "f({one:1, two:2});", callback: callback, config: config}).then(
							function (problems) {
								assertProblems(problems, []);
							},
							function (error) {
								worker.getTestState().callback(error);
							});
					});
					it("should not flag array expression", function(callback) {
						var config = { rules: {} };
						config.rules[RULE_ID] = 1;
						validate({buffer: "var a = [{one:1, two:2}];", callback: callback, config: config}).then(
							function (problems) {
								assertProblems(problems, []);
							},
							function (error) {
								worker.getTestState().callback(error);
							});
					});
				});
				//NO-COND-ASSIGN -----------------------------------------
				describe('no-cond-assign', function() {
					var RULE_ID = "no-cond-assign";
					it("should flag root assign in if statement ", function(callback) {
						var config = { rules: {} };
						config.rules[RULE_ID] = 1;
						validate({buffer: "if (a = b) {}", callback: callback, config: config}).then(
							function (problems) {
								assertProblems(problems, [{
									id: RULE_ID,
									severity: 'warning',
									description: "Expected a conditional expression and instead saw an assignment.",
									nodeType: "AssignmentExpression"
								}]);
							},
							function (error) {
								worker.getTestState().callback(error);
							});
					});
					it("should flag follow-on assign in if statement ", function(callback) {
						var config = { rules: {} };
						config.rules[RULE_ID] = 1;
						validate({buffer: "if (a = b && (c = 10)) {}", callback: callback, config: config}).then(
							function (problems) {
								assertProblems(problems, [{
									id: RULE_ID,
									severity: 'warning',
									description: "Expected a conditional expression and instead saw an assignment.",
									nodeType: "AssignmentExpression"
								}]);
							},
							function (error) {
								worker.getTestState().callback(error);
							});
					});
					it("should flag nested assign in if statement ", function(callback) {
						var config = { rules: {} };
						config.rules[RULE_ID] = 1;
						validate({buffer: "if ((a = b = 10)) {}", callback: callback, config: config}).then(
							function (problems) {
								assertProblems(problems, [{
									id: RULE_ID,
									severity: 'warning',
									description: "Expected a conditional expression and instead saw an assignment.",
									nodeType: "AssignmentExpression"
								}]);
							},
							function (error) {
								worker.getTestState().callback(error);
							});
					});
					it("should flag root assign in while statement ", function(callback) {
						var config = { rules: {} };
						config.rules[RULE_ID] = 1;
						validate({buffer: "while (a = b) {}", callback: callback, config: config}).then(
							function (problems) {
								assertProblems(problems, [{
									id: RULE_ID,
									severity: 'warning',
									description: "Expected a conditional expression and instead saw an assignment.",
									nodeType: "AssignmentExpression"
								}]);
							},
							function (error) {
								worker.getTestState().callback(error);
							});
					});
					it("should flag follow-on assign in while statement ", function(callback) {
						var config = { rules: {} };
						config.rules[RULE_ID] = 1;
						validate({buffer: "while (a = b && (c = 10)) {}", callback: callback, config: config}).then(
							function (problems) {
								assertProblems(problems, [{
									id: RULE_ID,
									severity: 'warning',
									description: "Expected a conditional expression and instead saw an assignment.",
									nodeType: "AssignmentExpression"
								}]);
							},
							function (error) {
								worker.getTestState().callback(error);
							});
					});
					it("should flag nested assign in while statement ", function(callback) {
						var config = { rules: {} };
						config.rules[RULE_ID] = 1;
						validate({buffer: "while ((a = b = 10)) {}", callback: callback, config: config}).then(
							function (problems) {
								assertProblems(problems, [{
									id: RULE_ID,
									severity: 'warning',
									description: "Expected a conditional expression and instead saw an assignment.",
									nodeType: "AssignmentExpression"
								}]);
							},
							function (error) {
								worker.getTestState().callback(error);
							});
					});
					it("should flag root assign in do-while statement ", function(callback) {
						var config = { rules: {} };
						config.rules[RULE_ID] = 1;
						validate({buffer: "do {} while (a = b)", callback: callback, config: config}).then(
							function (problems) {
								assertProblems(problems, [{
									id: RULE_ID,
									severity: 'warning',
									description: "Expected a conditional expression and instead saw an assignment.",
									nodeType: "AssignmentExpression"
								}]);
							},
							function (error) {
								worker.getTestState().callback(error);
							});
					});
					it("should flag follow-on assign in do-while statement ", function(callback) {
						var config = { rules: {} };
						config.rules[RULE_ID] = 1;
						validate({buffer: "do {} while (a = b && (c = 10))", callback: callback, config: config}).then(
							function (problems) {
								assertProblems(problems, [{
									id: RULE_ID,
									severity: 'warning',
									description: "Expected a conditional expression and instead saw an assignment.",
									nodeType: "AssignmentExpression"
								}]);
							},
							function (error) {
								worker.getTestState().callback(error);
							});
					});
					it("should flag nested assign in do-while statement", function(callback) {
						var config = { rules: {} };
						config.rules[RULE_ID] = 1;
						validate({buffer: "do {} while ((a = b = 10))", callback: callback, config: config}).then(
							function (problems) {
								assertProblems(problems, [{
									id: RULE_ID,
									severity: 'warning',
									description: "Expected a conditional expression and instead saw an assignment.",
									nodeType: "AssignmentExpression"
								}]);
							},
							function (error) {
								worker.getTestState().callback(error);
							});
					});
					it("should flag root assign in for statement ", function(callback) {
						var config = { rules: {} };
						config.rules[RULE_ID] = 1;
						validate({buffer: "for(var q = 0; a = b; q++) {}", callback: callback, config: config}).then(
							function (problems) {
								assertProblems(problems, [{
									id: RULE_ID,
									severity: 'warning',
									description: "Expected a conditional expression and instead saw an assignment.",
									nodeType: "AssignmentExpression"
								}]);
							},
							function (error) {
								worker.getTestState().callback(error);
							});
					});
					it("should flag follow-on assign in for statement ", function(callback) {
						var config = { rules: {} };
						config.rules[RULE_ID] = 1;
						validate({buffer: "for(var q = 0; a = b && (c = 10); q++) {}", callback: callback, config: config}).then(
							function (problems) {
								assertProblems(problems, [{
									id: RULE_ID,
									severity: 'warning',
									description: "Expected a conditional expression and instead saw an assignment.",
									nodeType: "AssignmentExpression"
								}]);
							},
							function (error) {
								worker.getTestState().callback(error);
							});
					});
					it("should flag nested assign in for statement", function(callback) {
						var config = { rules: {} };
						config.rules[RULE_ID] = 1;
						validate({buffer: "for(var q = 0; (a = b = 10); q++) {}", callback: callback, config: config}).then(
							function (problems) {
								assertProblems(problems, [{
									id: RULE_ID,
									severity: 'warning',
									description: "Expected a conditional expression and instead saw an assignment.",
									nodeType: "AssignmentExpression"
								}]);
							},
							function (error) {
								worker.getTestState().callback(error);
							});
					});
					it("should not flag root assign in if statement if parenthesised", function(callback) {
						var topic = "if ((a = b)) {}";
						var config = { rules: {} };
						config.rules[RULE_ID] = 1;
						validate({buffer: topic, callback: callback, config: config}).then(
							function (problems) {
								assertProblems(problems, []);
							},
							function (error) {
								worker.getTestState().callback(error);
							});
					});
					it("should not flag follow-on assign in if statement if parenthesised ", function(callback) {
						var topic = "if ((a = b) && (c = 10)) {}";
						var config = { rules: {} };
						config.rules[RULE_ID] = 1;
						validate({buffer: topic, callback: callback, config: config}).then(
							function (problems) {
								assertProblems(problems, []);
							},
							function (error) {
								worker.getTestState().callback(error);
							});
					});
					it("should not flag nested assign in if statement if parenthesised", function(callback) {
						var topic = "if ((a = (b = 10))) {}";
						var config = { rules: {} };
						config.rules[RULE_ID] = 1;
						validate({buffer: topic, callback: callback, config: config}).then(
							function (problems) {
								assertProblems(problems, []);
							},
							function (error) {
								worker.getTestState().callback(error);
							});
					});
					it("should not flag root assign in while statement if parenthesised", function(callback) {
						var topic = "while ((a = b)) {}";
						var config = { rules: {} };
						config.rules[RULE_ID] = 1;
						validate({buffer: topic, callback: callback, config: config}).then(
							function (problems) {
								assertProblems(problems, []);
							},
							function (error) {
								worker.getTestState().callback(error);
							});
					});
					it("should not flag follow-on assign in while statement if parenthesised ", function(callback) {
						var topic = "while ((a = b) && (c = 10)) {}";
						var config = { rules: {} };
						config.rules[RULE_ID] = 1;
						validate({buffer: topic, callback: callback, config: config}).then(
							function (problems) {
								assertProblems(problems, []);
							},
							function (error) {
								worker.getTestState().callback(error);
							});
					});
					it("should not flag nested assign in while statement if parenthesised", function(callback) {
						var topic = "while ((a = (b = 10))) {}";
			
						var config = { rules: {} };
						config.rules[RULE_ID] = 1;
						validate({buffer: topic, callback: callback, config: config}).then(
							function (problems) {
								assertProblems(problems, []);
							},
							function (error) {
								worker.getTestState().callback(error);
							});
					});
					it("should not flag root assign in do-while statement if parenthesised", function(callback) {
						var topic = "do{}while ((a = b))";
						var config = { rules: {} };
						config.rules[RULE_ID] = 1;
						validate({buffer: topic, callback: callback, config: config}).then(
							function (problems) {
								assertProblems(problems, []);
							},
							function (error) {
								worker.getTestState().callback(error);
							});
					});
					it("should not flag follow-on assign in do-while statement if parenthesised ", function(callback) {
						var topic = "do{}while ((a = b) && (c = 10))";
						var config = { rules: {} };
						config.rules[RULE_ID] = 1;
						validate({buffer: topic, callback: callback, config: config}).then(
							function (problems) {
								assertProblems(problems, []);
							},
							function (error) {
								worker.getTestState().callback(error);
							});
					});
					it("should not flag nested assign in do-while statement if parenthesised", function(callback) {
						var topic = "do{}while ((a = (b = 10)))";
						var config = { rules: {} };
						config.rules[RULE_ID] = 1;
						validate({buffer: topic, callback: callback, config: config}).then(
							function (problems) {
								assertProblems(problems, []);
							},
							function (error) {
								worker.getTestState().callback(error);
							});
					});
					it("should not flag root assign in for statement if parenthesised", function(callback) {
						var topic = "for(var q = 0; (a = b); q++) {}";
						var config = { rules: {} };
						config.rules[RULE_ID] = 1;
						validate({buffer: topic, callback: callback, config: config}).then(
							function (problems) {
								assertProblems(problems, []);
							},
							function (error) {
								worker.getTestState().callback(error);
							});
					});
					it("should not flag parenthesied follow-on assign in for statement ", function(callback) {
						var topic = "for(var q = 0; (a = b) && (c = 10); q++) {}";
						var config = { rules: {} };
						config.rules[RULE_ID] = 1;
						validate({buffer: topic, callback: callback, config: config}).then(
							function (problems) {
								assertProblems(problems, []);
							},
							function (error) {
								worker.getTestState().callback(error);
							});
					});
					it("should not flag parenthesised nested assign in for statement", function(callback) {
						var topic = "for(var q = 0; (a = (b = 10)); q++) {}";
						var config = { rules: {} };
						config.rules[RULE_ID] = 1;
						validate({buffer: topic, callback: callback, config: config}).then(
							function (problems) {
								assertProblems(problems, []);
							},
							function (error) {
								worker.getTestState().callback(error);
							});
					});
					it("should not flag nested assign in function condition statement", function(callback) {
						var topic = "if(function(a) {f = 10;}) {}";
						var config = { rules: {} };
						config.rules[RULE_ID] = 1;
						validate({buffer: topic, callback: callback, config: config}).then(
							function (problems) {
								assertProblems(problems, []);
							},
							function (error) {
								worker.getTestState().callback(error);
							});
					});
					/**
					 * https://bugs.eclipse.org/bugs/show_bug.cgi?id=456964
					 */
					it("should not flag infinite for statement", function(callback) {
						var topic = "for(;;) {}";
						var config = { rules: {} };
						config.rules[RULE_ID] = 1;
						validate({buffer: topic, callback: callback, config: config}).then(
							function (problems) {
								assertProblems(problems, []);
							},
							function (error) {
								worker.getTestState().callback(error);
							});
					});
				});
				//NO-CONSOLE ---------------------------------------------
				describe('no-console', function() {
					var RULE_ID = "no-console";
					it("should flag console use in browser env", function(callback) {
						var topic = "/*eslint-env browser */ console.log('flag me')";
						var config = { rules: {} };
						config.rules[RULE_ID] = 1;
						validate({buffer: topic, callback: callback, config: config}).then(
							function (problems) {
								assertProblems(problems, [{
									id: RULE_ID,
									severity: 'warning',
									description: "Discouraged use of console in browser-based code.",
									nodeType: "Identifier"
								}]);
							},
							function (error) {
								worker.getTestState().callback(error);
							});
					});
					it("should not flag console use in node env", function(callback) {
						var topic = "/*eslint-env node */ console.log('flag me')";
						var config = { rules: {} };
						config.rules[RULE_ID] = 1;
						validate({buffer: topic, callback: callback, config: config}).then(
							function (problems) {
								assertProblems(problems, []);
							},
							function (error) {
								worker.getTestState().callback(error);
							});
					});
					it("should not flag console use no env", function(callback) {
						var topic = "console.log('flag me')";
						var config = { rules: {} };
						config.rules[RULE_ID] = 1;
						validate({buffer: topic, callback: callback, config: config}).then(
							function (problems) {
								assertProblems(problems, []);
							},
							function (error) {
								worker.getTestState().callback(error);
							});
					});
				});
				//NO-CONSTANT-CONDITION ----------------------------------
				describe('no-constant-condition', function() {
					var RULE_ID = "no-constant-condition";
					it("should flag conditional statement 1", function(callback) {
						var topic = "var a = (0 ? 1 : 2);";
						var config = { rules: {} };
						config.rules[RULE_ID] = 1;
						validate({buffer: topic, callback: callback, config: config}).then(
							function (problems) {
								assertProblems(problems, [{
									id: RULE_ID,
									severity: 'warning',
									description: "Discouraged use of constant as a conditional expression."
								}]);
							},
							function (error) {
								worker.getTestState().callback(error);
							});
					});
					it("should flag conditional statement 2", function(callback) {
						var topic = "var a = ('hello' ? 1 : 2);";
						var config = { rules: {} };
						config.rules[RULE_ID] = 1;
						validate({buffer: topic, callback: callback, config: config}).then(
							function (problems) {
								assertProblems(problems, [{
									id: RULE_ID,
									severity: 'warning',
									description: "Discouraged use of constant as a conditional expression."
								}]);
							},
							function (error) {
								worker.getTestState().callback(error);
							});
					});
					it("should flag conditional statement 3", function(callback) {
						var topic = "var a = ({} ? 1 : 2);";
		
						var config = { rules: {} };
						config.rules[RULE_ID] = 1;
						validate({buffer: topic, callback: callback, config: config}).then(
							function (problems) {
								assertProblems(problems, [{
									id: RULE_ID,
									severity: 'warning',
									description: "Discouraged use of constant as a conditional expression."
								}]);
							},
							function (error) {
								worker.getTestState().callback(error);
							});
					});
					it("should flag conditional statement 4", function(callback) {
						var topic = "var a = (!true ? 1 : 2);";
						var config = { rules: {} };
						config.rules[RULE_ID] = 1;
						validate({buffer: topic, callback: callback, config: config}).then(
							function (problems) {
								assertProblems(problems, [{
									id: RULE_ID,
									severity: 'warning',
									description: "Discouraged use of constant as a conditional expression."
								}]);
							},
							function (error) {
								worker.getTestState().callback(error);
							});
					});
					it("should flag conditional statement 5", function(callback) {
						var topic = "var a = (false ? 1 : 2);";
						var config = { rules: {} };
						config.rules[RULE_ID] = 1;
						validate({buffer: topic, callback: callback, config: config}).then(
							function (problems) {
								assertProblems(problems, [{
									id: RULE_ID,
									severity: 'warning',
									description: "Discouraged use of constant as a conditional expression."
								}]);
							},
							function (error) {
								worker.getTestState().callback(error);
							});
					});
					it("should flag conditional statement 6", function(callback) {
						var topic = "var a = (true || false ? 1 : 2);";
						var config = { rules: {} };
						config.rules[RULE_ID] = 1;
						validate({buffer: topic, callback: callback, config: config}).then(
							function (problems) {
								assertProblems(problems, [{
									id: RULE_ID,
									severity: 'warning',
									description: "Discouraged use of constant as a conditional expression."
								}]);
							},
							function (error) {
								worker.getTestState().callback(error);
							});
					});
					it("should flag conditional statement 7", function(callback) {
						var topic = "var a = (function(){} ? 1 : 2);";
						var config = { rules: {} };
						config.rules[RULE_ID] = 1;
						validate({buffer: topic, callback: callback, config: config}).then(
							function (problems) {
								assertProblems(problems, [{
									id: RULE_ID,
									severity: 'warning',
									description: "Discouraged use of constant as a conditional expression."
								}]);
							},
							function (error) {
								worker.getTestState().callback(error);
							});
					});
					it("should flag while statement 1", function(callback) {
						var topic = "while (true) {}";
						var config = { rules: {} };
						config.rules[RULE_ID] = 1;
						validate({buffer: topic, callback: callback, config: config}).then(
							function (problems) {
								assertProblems(problems, [{
									id: RULE_ID,
									severity: 'warning',
									description: "Discouraged use of constant as a conditional expression."
								}]);
							},
							function (error) {
								worker.getTestState().callback(error);
							});
					});
					it("should flag while statement 2", function(callback) {
						var topic = "while(10) {}";
						var config = { rules: {} };
						config.rules[RULE_ID] = 1;
						validate({buffer: topic, callback: callback, config: config}).then(
							function (problems) {
								assertProblems(problems, [{
									id: RULE_ID,
									severity: 'warning',
									description: "Discouraged use of constant as a conditional expression."
								}]);
							},
							function (error) {
								worker.getTestState().callback(error);
							});
					});
					it("should flag while statement 3", function(callback) {
						var topic = "while(!true) {}";
						var config = { rules: {} };
						config.rules[RULE_ID] = 1;
						validate({buffer: topic, callback: callback, config: config}).then(
							function (problems) {
								assertProblems(problems, [{
									id: RULE_ID,
									severity: 'warning',
									description: "Discouraged use of constant as a conditional expression."
								}]);
							},
							function (error) {
								worker.getTestState().callback(error);
							});
					});
					it("should flag while statement 4", function(callback) {
						var topic = "while(true || false) {}";
						var config = { rules: {} };
						config.rules[RULE_ID] = 1;
						validate({buffer: topic, callback: callback, config: config}).then(
							function (problems) {
								assertProblems(problems, [{
									id: RULE_ID,
									severity: 'warning',
									description: "Discouraged use of constant as a conditional expression."
								}]);
							},
							function (error) {
								worker.getTestState().callback(error);
							});
					});
					it("should flag while statement 5", function(callback) {
						var topic = "while('hello') {}";
						var config = { rules: {} };
						config.rules[RULE_ID] = 1;
						validate({buffer: topic, callback: callback, config: config}).then(
							function (problems) {
								assertProblems(problems, [{
									id: RULE_ID,
									severity: 'warning',
									description: "Discouraged use of constant as a conditional expression."
								}]);
							},
							function (error) {
								worker.getTestState().callback(error);
							});
					});
					it("should flag while statement 6", function(callback) {
						var topic = "while(function(){}) {}";
						var config = { rules: {} };
						config.rules[RULE_ID] = 1;
						validate({buffer: topic, callback: callback, config: config}).then(
							function (problems) {
								assertProblems(problems, [{
									id: RULE_ID,
									severity: 'warning',
									description: "Discouraged use of constant as a conditional expression."
								}]);
							},
							function (error) {
								worker.getTestState().callback(error);
							});
					});
					it("should flag while statement 7", function(callback) {
						var topic = "while({}) {}";
						var config = { rules: {} };
						config.rules[RULE_ID] = 1;
						validate({buffer: topic, callback: callback, config: config}).then(
							function (problems) {
								assertProblems(problems, [{
									id: RULE_ID,
									severity: 'warning',
									description: "Discouraged use of constant as a conditional expression."
								}]);
							},
							function (error) {
								worker.getTestState().callback(error);
							});
					});
					it("should flag while statement 8", function(callback) {
						var topic = "while((a = (0 ? 1 : 2))) {}";
						var config = { rules: {} };
						config.rules[RULE_ID] = 1;
						validate({buffer: topic, callback: callback, config: config}).then(
							function (problems) {
								assertProblems(problems, [{
									id: RULE_ID,
									severity: 'warning',
									description: "Discouraged use of constant as a conditional expression."
								}]);
							},
							function (error) {
								worker.getTestState().callback(error);
							});
					});
					it("should flag do-while statement 1", function(callback) {
						var topic = "do{}while (true)";
						var config = { rules: {} };
						config.rules[RULE_ID] = 1;
						validate({buffer: topic, callback: callback, config: config}).then(
							function (problems) {
								assertProblems(problems, [{
									id: RULE_ID,
									severity: 'warning',
									description: "Discouraged use of constant as a conditional expression."
								}]);
							},
							function (error) {
								worker.getTestState().callback(error);
							});
					});
					it("should flag do-while statement 2", function(callback) {
						var topic = "do{}while(10)";
						var config = { rules: {} };
						config.rules[RULE_ID] = 1;
						validate({buffer: topic, callback: callback, config: config}).then(
							function (problems) {
								assertProblems(problems, [{
									id: RULE_ID,
									severity: 'warning',
									description: "Discouraged use of constant as a conditional expression."
								}]);
							},
							function (error) {
								worker.getTestState().callback(error);
							});
					});
					it("should flag do-while statement 3", function(callback) {
						var topic = "do{}while(!true)";
						var config = { rules: {} };
						config.rules[RULE_ID] = 1;
						validate({buffer: topic, callback: callback, config: config}).then(
							function (problems) {
								assertProblems(problems, [{
									id: RULE_ID,
									severity: 'warning',
									description: "Discouraged use of constant as a conditional expression."
								}]);
							},
							function (error) {
								worker.getTestState().callback(error);
							});
					});
					it("should flag do-while statement 4", function(callback) {
						var topic = "do{}while(true || false)";
						var config = { rules: {} };
						config.rules[RULE_ID] = 1;
						validate({buffer: topic, callback: callback, config: config}).then(
							function (problems) {
								assertProblems(problems, [{
									id: RULE_ID,
									severity: 'warning',
									description: "Discouraged use of constant as a conditional expression."
								}]);
							},
							function (error) {
								worker.getTestState().callback(error);
							});
					});
					it("should flag do-while statement 5", function(callback) {
						var topic = "do{}while('hello')";
						var config = { rules: {} };
						config.rules[RULE_ID] = 1;
						validate({buffer: topic, callback: callback, config: config}).then(
							function (problems) {
								assertProblems(problems, [{
									id: RULE_ID,
									severity: 'warning',
									description: "Discouraged use of constant as a conditional expression."
								}]);
							},
							function (error) {
								worker.getTestState().callback(error);
							});
					});
					it("should flag do-while statement 6", function(callback) {
						var topic = "do{}while(function(){})";
						var config = { rules: {} };
						config.rules[RULE_ID] = 1;
						validate({buffer: topic, callback: callback, config: config}).then(
							function (problems) {
								assertProblems(problems, [{
									id: RULE_ID,
									severity: 'warning',
									description: "Discouraged use of constant as a conditional expression."
								}]);
							},
							function (error) {
								worker.getTestState().callback(error);
							});
					});
					it("should flag do-while statement 7", function(callback) {
						var topic = "do{}while({})";
						var config = { rules: {} };
						config.rules[RULE_ID] = 1;
						validate({buffer: topic, callback: callback, config: config}).then(
							function (problems) {
								assertProblems(problems, [{
									id: RULE_ID,
									severity: 'warning',
									description: "Discouraged use of constant as a conditional expression."
								}]);
							},
							function (error) {
								worker.getTestState().callback(error);
							});
					});
					it("should flag for statement 1", function(callback) {
						var topic = "for(;true;) {}";
						var config = { rules: {} };
						config.rules[RULE_ID] = 1;
						validate({buffer: topic, callback: callback, config: config}).then(
							function (problems) {
								assertProblems(problems, [{
									id: RULE_ID,
									severity: 'warning',
									description: "Discouraged use of constant as a conditional expression."
								}]);
							},
							function (error) {
								worker.getTestState().callback(error);
							});
					});
					it("should flag for statement 2", function(callback) {
						var topic = "for(;10;) {}";
						var config = { rules: {} };
						config.rules[RULE_ID] = 1;
						validate({buffer: topic, callback: callback, config: config}).then(
							function (problems) {
								assertProblems(problems, [{
									id: RULE_ID,
									severity: 'warning',
									description: "Discouraged use of constant as a conditional expression."
								}]);
							},
							function (error) {
								worker.getTestState().callback(error);
							});
					});
					it("should flag for statement 3", function(callback) {
						var topic = "for(;!true;) {}";
						var config = { rules: {} };
						config.rules[RULE_ID] = 1;
						validate({buffer: topic, callback: callback, config: config}).then(
							function (problems) {
								assertProblems(problems, [{
									id: RULE_ID,
									severity: 'warning',
									description: "Discouraged use of constant as a conditional expression."
								}]);
							},
							function (error) {
								worker.getTestState().callback(error);
							});
					});
					it("should flag for statement 4", function(callback) {
						var topic = "for(;true || false;) {}";
						var config = { rules: {} };
						config.rules[RULE_ID] = 1;
						validate({buffer: topic, callback: callback, config: config}).then(
							function (problems) {
								assertProblems(problems, [{
									id: RULE_ID,
									severity: 'warning',
									description: "Discouraged use of constant as a conditional expression."
								}]);
							},
							function (error) {
								worker.getTestState().callback(error);
							});
					});
					it("should flag for statement 5", function(callback) {
						var topic = "for(;'hello';) {}";
						var config = { rules: {} };
						config.rules[RULE_ID] = 1;
						validate({buffer: topic, callback: callback, config: config}).then(
							function (problems) {
								assertProblems(problems, [{
									id: RULE_ID,
									severity: 'warning',
									description: "Discouraged use of constant as a conditional expression."
								}]);
							},
							function (error) {
								worker.getTestState().callback(error);
							});
					});
					it("should flag for statement 6", function(callback) {
						var topic = "for(;function() {};) {}";
						var config = { rules: {} };
						config.rules[RULE_ID] = 1;
						validate({buffer: topic, callback: callback, config: config}).then(
							function (problems) {
								assertProblems(problems, [{
									id: RULE_ID,
									severity: 'warning',
									description: "Discouraged use of constant as a conditional expression."
								}]);
							},
							function (error) {
								worker.getTestState().callback(error);
							});
					});
					it("should flag for statement 7", function(callback) {
						var topic = "for(;{};) {}";
						var config = { rules: {} };
						config.rules[RULE_ID] = 1;
						validate({buffer: topic, callback: callback, config: config}).then(
							function (problems) {
								assertProblems(problems, [{
									id: RULE_ID,
									severity: 'warning',
									description: "Discouraged use of constant as a conditional expression."
								}]);
							},
							function (error) {
								worker.getTestState().callback(error);
							});
					});
					it("should flag if statement 1", function(callback) {
						var topic = "if (true) {}";
						var config = { rules: {} };
						config.rules[RULE_ID] = 1;
						validate({buffer: topic, callback: callback, config: config}).then(
							function (problems) {
								assertProblems(problems, [{
									id: RULE_ID,
									severity: 'warning',
									description: "Discouraged use of constant as a conditional expression."
								}]);
							},
							function (error) {
								worker.getTestState().callback(error);
							});
					});
					it("should flag if statement 2", function(callback) {
						var topic = "if(10) {}";
						var config = { rules: {} };
						config.rules[RULE_ID] = 1;
						validate({buffer: topic, callback: callback, config: config}).then(
							function (problems) {
								assertProblems(problems, [{
									id: RULE_ID,
									severity: 'warning',
									description: "Discouraged use of constant as a conditional expression."
								}]);
							},
							function (error) {
								worker.getTestState().callback(error);
							});
					});
					it("should flag if statement 3", function(callback) {
						var topic = "if(!true) {}";
						var config = { rules: {} };
						config.rules[RULE_ID] = 1;
						validate({buffer: topic, callback: callback, config: config}).then(
							function (problems) {
								assertProblems(problems, [{
									id: RULE_ID,
									severity: 'warning',
									description: "Discouraged use of constant as a conditional expression."
								}]);
							},
							function (error) {
								worker.getTestState().callback(error);
							});
					});
					it("should flag if statement 4", function(callback) {
						var topic = "if(true || false) {}";
						var config = { rules: {} };
						config.rules[RULE_ID] = 1;
						validate({buffer: topic, callback: callback, config: config}).then(
							function (problems) {
								assertProblems(problems, [{
									id: RULE_ID,
									severity: 'warning',
									description: "Discouraged use of constant as a conditional expression."
								}]);
							},
							function (error) {
								worker.getTestState().callback(error);
							});
					});
					it("should flag if statement 5", function(callback) {
						var topic = "if('hello') {}";
						var config = { rules: {} };
						config.rules[RULE_ID] = 1;
						validate({buffer: topic, callback: callback, config: config}).then(
							function (problems) {
								assertProblems(problems, [{
									id: RULE_ID,
									severity: 'warning',
									description: "Discouraged use of constant as a conditional expression."
								}]);
							},
							function (error) {
								worker.getTestState().callback(error);
							});
					});
					it("should flag if statement 6", function(callback) {
						var topic = "if(function(){}) {}";
						var config = { rules: {} };
						config.rules[RULE_ID] = 1;
						validate({buffer: topic, callback: callback, config: config}).then(
							function (problems) {
								assertProblems(problems, [{
									id: RULE_ID,
									severity: 'warning',
									description: "Discouraged use of constant as a conditional expression."
								}]);
							},
							function (error) {
								worker.getTestState().callback(error);
							});
					});
					it("should flag if statement 7", function(callback) {
						var topic = "if({}) {}";
						var config = { rules: {} };
						config.rules[RULE_ID] = 1;
						validate({buffer: topic, callback: callback, config: config}).then(
							function (problems) {
								assertProblems(problems, [{
									id: RULE_ID,
									severity: 'warning',
									description: "Discouraged use of constant as a conditional expression."
								}]);
							},
							function (error) {
								worker.getTestState().callback(error);
							});
					});
		
					it("should not flag do-while statement", function(callback) {
						var topic = "do{}while(x)";
						var config = { rules: {} };
						config.rules[RULE_ID] = 1;
						validate({buffer: topic, callback: callback, config: config}).then(
							function (problems) {
								assertProblems(problems, []);
							},
							function (error) {
								worker.getTestState().callback(error);
							});
					});
					it("should not flag if statement", function(callback) {
						var topic = "if(x) {}";
						var config = { rules: {} };
						config.rules[RULE_ID] = 1;
						validate({buffer: topic, callback: callback, config: config}).then(
							function (problems) {
								assertProblems(problems, []);
							},
							function (error) {
								worker.getTestState().callback(error);
							});
					});
					it("should not flag conditional statement", function(callback) {
						var topic = "var a = (x ? 1: 0);";
						var config = { rules: {} };
						config.rules[RULE_ID] = 1;
						validate({buffer: topic, callback: callback, config: config}).then(
							function (problems) {
								assertProblems(problems, []);
							},
							function (error) {
								worker.getTestState().callback(error);
							});
					});
					it("should not flag for statement", function(callback) {
						var topic = "for(;x;){}";
						var config = { rules: {} };
						config.rules[RULE_ID] = 1;
						validate({buffer: topic, callback: callback, config: config}).then(
							function (problems) {
								assertProblems(problems, []);
							},
							function (error) {
								worker.getTestState().callback(error);
							});
					});
					it("should not flag while statement", function(callback) {
						var topic = "while(x){}";
						var config = { rules: {} };
						config.rules[RULE_ID] = 1;
						validate({buffer: topic, callback: callback, config: config}).then(
							function (problems) {
								assertProblems(problems, []);
							},
							function (error) {
								worker.getTestState().callback(error);
							});
					});
				});
				
				//NO-DEBUGGER --------------------------------------------
				describe('no-debugger', function() {
					var RULE_ID = "no-debugger";
					it("should flag debugger use in if", function(callback) {
						var topic = "if (a == b) {debugger;}";
						var config = { rules: {} };
						config.rules[RULE_ID] = 1;
						validate({buffer: topic, callback: callback, config: config}).then(
							function (problems) {
								assertProblems(problems, [{
									id: RULE_ID,
									severity: 'warning',
									description: "\'debugger\' statement use is discouraged.",
									nodeType: "DebuggerStatement"
								}]);
							},
							function (error) {
								worker.getTestState().callback(error);
							});
					});
					it("should flag debugger use in function decl", function(callback) {
						var topic = "function f() {debugger;}";
						var config = { rules: {} };
						config.rules[RULE_ID] = 1;
						validate({buffer: topic, callback: callback, config: config}).then(
							function (problems) {
								assertProblems(problems, [{
									id: RULE_ID,
									severity: 'warning',
									description: "\'debugger\' statement use is discouraged.",
									nodeType: "DebuggerStatement"
								}]);
							},
							function (error) {
								worker.getTestState().callback(error);
							});
					});
					it("should flag debugger use in function expr", function(callback) {
						var topic = "var f = function() {debugger;}";
						var config = { rules: {} };
						config.rules[RULE_ID] = 1;
						validate({buffer: topic, callback: callback, config: config}).then(
							function (problems) {
								assertProblems(problems, [{
									id: RULE_ID,
									severity: 'warning',
									description: "\'debugger\' statement use is discouraged.",
									nodeType: "DebuggerStatement"
								}]);
							},
							function (error) {
								worker.getTestState().callback(error);
							});
					});
					it("should flag debugger use in global", function(callback) {
						var topic = "debugger;";
						var config = { rules: {} };
						config.rules[RULE_ID] = 1;
						validate({buffer: topic, callback: callback, config: config}).then(
							function (problems) {
								assertProblems(problems, [{
									id: RULE_ID,
									severity: 'warning',
									description: "\'debugger\' statement use is discouraged.",
									nodeType: "DebuggerStatement"
								}]);
							},
							function (error) {
								worker.getTestState().callback(error);
							});
					});
					it("should flag debugger use in case", function(callback) {
						var topic = "var v = 0; switch(v) {case 0: debugger; break;};";
						var config = { rules: {} };
						config.rules[RULE_ID] = 1;
						validate({buffer: topic, callback: callback, config: config}).then(
							function (problems) {
								assertProblems(problems, [{
									id: RULE_ID,
									severity: 'warning',
									description: "\'debugger\' statement use is discouraged.",
									nodeType: "DebuggerStatement"
								}]);
							},
							function (error) {
								worker.getTestState().callback(error);
							});
					});
					it("should flag debugger use in object", function(callback) {
						var topic = "var v = {v: function() {debugger;}}";
						var config = { rules: {} };
						config.rules[RULE_ID] = 1;
						validate({buffer: topic, callback: callback, config: config}).then(
							function (problems) {
								assertProblems(problems, [{
									id: RULE_ID,
									severity: 'warning',
									description: "\'debugger\' statement use is discouraged.",
									nodeType: "DebuggerStatement"
								}]);
							},
							function (error) {
								worker.getTestState().callback(error);
							});
					});
				});
				//NO-DUPE-KEYS ------------------------------------------------------
				describe('no-dupe-keys', function() {
					var RULE_ID = "no-dupe-keys";
					it("should not flag single prototypal property", function(callback) {
						var topic = "var o = {toString: function() {}, two: 2, one: 3}";
						var config = { rules: {} };
						config.rules[RULE_ID] = 1;
						validate({buffer: topic, callback: callback, config: config}).then(
							function (problems) {
								assertProblems(problems, []);
							},
							function (error) {
								worker.getTestState().callback(error);
							});
					});
					it("should flag double prototypal property", function(callback) {
						var topic = "var o = {toString: function() {}, two: 2, \'toString\': 3}";
						var config = { rules: {} };
						config.rules[RULE_ID] = 1;
						validate({buffer: topic, callback: callback, config: config}).then(
							function (problems) {
								assertProblems(problems, [{
									id: RULE_ID,
									severity: 'warning',
									description: "Duplicate object key 'toString'.",
									nodeType: "Property"
								}]);
							},
							function (error) {
								worker.getTestState().callback(error);
							});
					});
					it("should not flag single literal prototypal property", function(callback) {
						var topic = "var o = {\'toString\': function() {}, two: 2, one: 3}";
						var config = { rules: {} };
						config.rules[RULE_ID] = 1;
						validate({buffer: topic, callback: callback, config: config}).then(
							function (problems) {
								assertProblems(problems, []);
							},
							function (error) {
								worker.getTestState().callback(error);
							});
					});
					it("should flag double literal prototypal property", function(callback) {
						var topic = "var o = {\'toString\': function() {}, two: 2, toString: 3}";
						var config = { rules: {} };
						config.rules[RULE_ID] = 1;
						validate({buffer: topic, callback: callback, config: config}).then(
							function (problems) {
								assertProblems(problems, [{
									id: RULE_ID,
									severity: 'warning',
									description: "Duplicate object key 'toString'.",
									nodeType: "Property"
								}]);
							},
							function (error) {
								worker.getTestState().callback(error);
							});
					});
					it("should flag single dupe", function(callback) {
						var topic = "var o = {one: 1, two: 2, one: 3}";
						var config = { rules: {} };
						config.rules[RULE_ID] = 1;
						validate({buffer: topic, callback: callback, config: config}).then(
							function (problems) {
								assertProblems(problems, [{
									id: RULE_ID,
									severity: 'warning',
									description: "Duplicate object key 'one'.",
									nodeType: "Property"
								}]);
							},
							function (error) {
								worker.getTestState().callback(error);
							});
					});
					it("should flag single literal dupe", function(callback) {
						var topic = "var o = {\'one\': 1, two: 2, one: 3}";
						var config = { rules: {} };
						config.rules[RULE_ID] = 1;
						validate({buffer: topic, callback: callback, config: config}).then(
							function (problems) {
								assertProblems(problems, [{
									id: RULE_ID,
									severity: 'warning',
									description: "Duplicate object key 'one'.",
									nodeType: "Property"
								}]);
							},
							function (error) {
								worker.getTestState().callback(error);
							});
					});
					it("should flag double literal dupe", function(callback) {
						var topic = "var o = {\'one\': 1, two: 2, \'one\': 3}";
						var config = { rules: {} };
						config.rules[RULE_ID] = 1;
						validate({buffer: topic, callback: callback, config: config}).then(
							function (problems) {
								assertProblems(problems, [{
									id: RULE_ID,
									severity: 'warning',
									description: "Duplicate object key 'one'.",
									nodeType: "Property"
								}]);
							},
							function (error) {
								worker.getTestState().callback(error);
							});
					});
					it("should flag multi dupe", function(callback) {
						var topic = "var o = {one: 1, two: 2, one: 3, two: 4}";
						var config = { rules: {} };
						config.rules[RULE_ID] = 1;
						validate({buffer: topic, callback: callback, config: config}).then(
							function (problems) {
								assertProblems(problems, [{
									id: RULE_ID,
									severity: 'warning',
									description: "Duplicate object key 'one'.",
									nodeType: "Property"
								},
								{
									id: RULE_ID,
									severity: 'warning',
									description: "Duplicate object key 'two'.",
									nodeType: "Property"
								}]);
							},
							function (error) {
								worker.getTestState().callback(error);
							});
					});
					it("should flag multi dupe of same key", function(callback) {
						var topic = "var o = {one: 1, two: 2, one: 3, three: 4, one: 5}";
						var config = { rules: {} };
						config.rules[RULE_ID] = 1;
						validate({buffer: topic, callback: callback, config: config}).then(
							function (problems) {
								assertProblems(problems, [{
									id: RULE_ID,
									severity: 'warning',
									description: "Duplicate object key 'one'.",
									nodeType: "Property"
								},
								{
									id: RULE_ID,
									severity: 'warning',
									description: "Duplicate object key 'one'.",
									nodeType: "Property"
								}]);
							},
							function (error) {
								worker.getTestState().callback(error);
							});
					});
					it("should flag multi dupe of multi keys", function(callback) {
						var topic = "var o = {one: 1, two: 2, one: 3, two: 7, three: 4, one: 5, two: 6}";
						var config = { rules: {} };
						config.rules[RULE_ID] = 1;
						validate({buffer: topic, callback: callback, config: config}).then(
							function (problems) {
								assertProblems(problems, [
								{
									id: RULE_ID,
									severity: 'warning',
									description: "Duplicate object key 'one'.",
									nodeType: "Property"
								},
								{
									id: RULE_ID,
									severity: 'warning',
									description: "Duplicate object key 'two'.",
									nodeType: "Property"
								},
								{
									id: RULE_ID,
									severity: 'warning',
									description: "Duplicate object key 'one'.",
									nodeType: "Property"
								},
								{
									id: RULE_ID,
									severity: 'warning',
									description: "Duplicate object key 'two'.",
									nodeType: "Property"
								}]);
							},
							function (error) {
								worker.getTestState().callback(error);
							});
					});
					it("should not flag properties with same key, different kinds", function(callback) {
						var topic = "var o = { set one(value){}, get one(){} };";
						var config = { rules: {} };
						config.rules[RULE_ID] = 1;
						validate({buffer: topic, callback: callback, config: config}).then(
							function (problems) {
								assertProblems(problems, []);
							},
							function (error) {
								worker.getTestState().callback(error);
							});
					});
				});
				//NO-EMPTY-BLOCK ----------------------------------------------
				describe('no-empty-block', function() {
					var RULE_ID = "no-empty-block";
					it("should flag empty block 1", function(callback) {
						var topic = "if (true) {}";
						var config = { rules: {} };
						config.rules[RULE_ID] = 1;
						validate({buffer: topic, callback: callback, config: config}).then(
							function (problems) {
								assertProblems(problems, [{
									id: RULE_ID,
									severity: 'warning',
									description: "Empty block should be removed or commented.",
									nodeType: "BlockStatement"
								}]);
							},
							function (error) {
								worker.getTestState().callback(error);
							});
					});
					it("should flag empty block 2", function(callback) {
						var topic = "while(true) {}";
						var config = { rules: {} };
						config.rules[RULE_ID] = 1;
						validate({buffer: topic, callback: callback, config: config}).then(
							function (problems) {
								assertProblems(problems, [{
									id: RULE_ID,
									severity: 'warning',
									description: "Empty block should be removed or commented.",
									nodeType: "BlockStatement"
								}]);
							},
							function (error) {
								worker.getTestState().callback(error);
							});
					});
					it("should flag empty block 3", function(callback) {
						var topic = "function f(a) {}";
						var config = { rules: {} };
						config.rules[RULE_ID] = 1;
						validate({buffer: topic, callback: callback, config: config}).then(
							function (problems) {
								assertProblems(problems, [{
									id: RULE_ID,
									severity: 'warning',
									description: "Empty block should be removed or commented.",
									nodeType: "BlockStatement"
								}]);
							},
							function (error) {
								worker.getTestState().callback(error);
							});
					});
					it("should flag empty block 4", function(callback) {
						var topic = "var f = function(a) {}";
						var config = { rules: {} };
						config.rules[RULE_ID] = 1;
						validate({buffer: topic, callback: callback, config: config}).then(
							function (problems) {
								assertProblems(problems, [{
									id: RULE_ID,
									severity: 'warning',
									description: "Empty block should be removed or commented.",
									nodeType: "BlockStatement"
								}]);
							},
							function (error) {
								worker.getTestState().callback(error);
							});
					});
					it("should flag empty block 5", function(callback) {
						var topic = "switch(a) {case 1: {}}";
						var config = { rules: {} };
						config.rules[RULE_ID] = 1;
						validate({buffer: topic, callback: callback, config: config}).then(
							function (problems) {
								assertProblems(problems, [{
									id: RULE_ID,
									severity: 'warning',
									description: "Empty block should be removed or commented.",
									nodeType: "BlockStatement"
								}]);
							},
							function (error) {
								worker.getTestState().callback(error);
							});
					});
					it("should flag empty block 6", function(callback) {
						var topic = "with(a) {}";
						var config = { rules: {} };
						config.rules[RULE_ID] = 1;
						validate({buffer: topic, callback: callback, config: config}).then(
							function (problems) {
								assertProblems(problems, [{
									id: RULE_ID,
									severity: 'warning',
									description: "Empty block should be removed or commented.",
									nodeType: "BlockStatement"
								}]);
							},
							function (error) {
								worker.getTestState().callback(error);
							});
					});
					it("should flag empty block 7", function(callback) {
						var topic = "with(a) {if(a) {}}";
						var config = { rules: {} };
						config.rules[RULE_ID] = 1;
						validate({buffer: topic, callback: callback, config: config}).then(
							function (problems) {
								assertProblems(problems, [{
									id: RULE_ID,
									severity: 'warning',
									description: "Empty block should be removed or commented.",
									nodeType: "BlockStatement"
								}]);
							},
							function (error) {
								worker.getTestState().callback(error);
							});
					});
					it("should not flag empty block 1", function(callback) {
						var topic = "with(a) {if(a) {\n//commented\n}}";
						var config = { rules: {} };
						config.rules[RULE_ID] = 1;
						validate({buffer: topic, callback: callback, config: config}).then(
							function (problems) {
								assertProblems(problems, []);
							},
							function (error) {
								worker.getTestState().callback(error);
							});
					});
					it("should not flag empty block 2", function(callback) {
						var topic = "if(a) {\n//commented\n}";
						var config = { rules: {} };
						config.rules[RULE_ID] = 1;
						validate({buffer: topic, callback: callback, config: config}).then(
							function (problems) {
								assertProblems(problems, []);
							},
							function (error) {
								worker.getTestState().callback(error);
							});
					});
					it("should not flag empty block 3", function(callback) {
						var topic = "switch(a) {case 1: {\n//commented\n}}";
						var config = { rules: {} };
						config.rules[RULE_ID] = 1;
						validate({buffer: topic, callback: callback, config: config}).then(
							function (problems) {
								assertProblems(problems, []);
							},
							function (error) {
								worker.getTestState().callback(error);
							});
					});
					it("should not flag empty block 4", function(callback) {
						var topic = "function f(a) {\n//commented\n}";
						var config = { rules: {} };
						config.rules[RULE_ID] = 1;
						validate({buffer: topic, callback: callback, config: config}).then(
							function (problems) {
								assertProblems(problems, []);
							},
							function (error) {
								worker.getTestState().callback(error);
							});
					});
					it("should not flag empty block 5", function(callback) {
						var topic = "function f(a) {\n/*commented*/\n}";
						var config = { rules: {} };
						config.rules[RULE_ID] = 1;
						validate({buffer: topic, callback: callback, config: config}).then(
							function (problems) {
								assertProblems(problems, []);
							},
							function (error) {
								worker.getTestState().callback(error);
							});
					});
				});
				
				//NO-EVAL ---------------------------------------------------------
				describe('no-eval', function() {
					var RULE_ID = "no-eval";
					it("should flag eval() use in if", function(callback) {
						var topic = "if (a == b) {eval();}";
						var config = { rules: {} };
						config.rules[RULE_ID] = 1;
						validate({buffer: topic, callback: callback, config: config}).then(
							function (problems) {
								assertProblems(problems, [{
									id: RULE_ID,
									severity: 'warning',
									description: "\'eval\' function calls are discouraged.",
									nodeType: "Identifier"
								}]);
							},
							function (error) {
								worker.getTestState().callback(error);
							});
					});
					it("should flag eval() use in function decl", function(callback) {
						var topic = "function f() {eval();}";
						var config = { rules: {} };
						config.rules[RULE_ID] = 1;
						validate({buffer: topic, callback: callback, config: config}).then(
							function (problems) {
								assertProblems(problems, [{
									id: RULE_ID,
									severity: 'warning',
									description: "\'eval\' function calls are discouraged.",
									nodeType: "Identifier"
								}]);
							},
							function (error) {
								worker.getTestState().callback(error);
							});
					});
					it("should flag eval() use in function expr", function(callback) {
						var topic = "var f = function() {eval();}";
						var config = { rules: {} };
						config.rules[RULE_ID] = 1;
						validate({buffer: topic, callback: callback, config: config}).then(
							function (problems) {
								assertProblems(problems, [{
									id: RULE_ID,
									severity: 'warning',
									description: "\'eval\' function calls are discouraged.",
									nodeType: "Identifier"
								}]);
							},
							function (error) {
								worker.getTestState().callback(error);
							});
					});
					it("should flag eval() use in global", function(callback) {
						var topic = "eval();";
						var config = { rules: {} };
						config.rules[RULE_ID] = 1;
						validate({buffer: topic, callback: callback, config: config}).then(
							function (problems) {
								assertProblems(problems, [{
									id: RULE_ID,
									severity: 'warning',
									description: "\'eval\' function calls are discouraged.",
									nodeType: "Identifier"
								}]);
							},
							function (error) {
								worker.getTestState().callback(error);
							});
					});
					it("should flag eval() use in case", function(callback) {
						var topic = "var v = 0; switch(v) {case 0: eval(); break;};";
						var config = { rules: {} };
						config.rules[RULE_ID] = 1;
						validate({buffer: topic, callback: callback, config: config}).then(
							function (problems) {
								assertProblems(problems, [{
									id: RULE_ID,
									severity: 'warning',
									description: "\'eval\' function calls are discouraged.",
									nodeType: "Identifier"
								}]);
							},
							function (error) {
								worker.getTestState().callback(error);
							});
					});
					it("should flag eval() use in object", function(callback) {
						var topic = "var v = {v: function() {eval();}}";
						var config = { rules: {} };
						config.rules[RULE_ID] = 1;
						validate({buffer: topic, callback: callback, config: config}).then(
							function (problems) {
								assertProblems(problems, [{
									id: RULE_ID,
									severity: 'warning',
									description: "\'eval\' function calls are discouraged.",
									nodeType: "Identifier"
								}]);
							},
							function (error) {
								worker.getTestState().callback(error);
							});
					});
				});
			
				//NO-EXTRA-SEMI -----------------------------------------------------
				describe('no-extra-semi', function() {
					var RULE_ID = "no-extra-semi";
					/**
					 * @see https://bugs.eclipse.org/bugs/show_bug.cgi?id=428040
					 */
					it("should flag statement multi", function(callback) {
						var topic = "var a=1;;";
						var config = { rules: {} };
						config.rules[RULE_ID] = 1;
						validate({buffer: topic, callback: callback, config: config}).then(
							function (problems) {
								assertProblems(problems, [{
									id: RULE_ID,
									severity: 'warning',
									description: "Unnecessary semicolon.",
									nodeType: "EmptyStatement"
								}]);
							},
							function (error) {
								worker.getTestState().callback(error);
							});
					});
					/**
					 * @see https://bugs.eclipse.org/bugs/show_bug.cgi?id=428040
					 */
					it("should flag function expresson statement multi", function(callback) {
						var topic = "var a = function() {};;";
						var config = { rules: {} };
						config.rules[RULE_ID] = 1;
						validate({buffer: topic, callback: callback, config: config}).then(
							function (problems) {
								assertProblems(problems, [{
									id: RULE_ID,
									severity: 'warning',
									description: "Unnecessary semicolon.",
									nodeType: "EmptyStatement"
								}]);
							},
							function (error) {
								worker.getTestState().callback(error);
							});
					});
					/**
					 * @see https://bugs.eclipse.org/bugs/show_bug.cgi?id=428040
					 */
					it("should flag function declaration", function(callback) {
						var topic = "function a() {};";
						var config = { rules: {} };
						config.rules[RULE_ID] = 1;
						validate({buffer: topic, callback: callback, config: config}).then(
							function (problems) {
								assertProblems(problems, [{
									id: RULE_ID,
									severity: 'warning',
									description: "Unnecessary semicolon.",
									nodeType: "EmptyStatement"
								}]);
							},
							function (error) {
								worker.getTestState().callback(error);
							});
					});
					/**
					 * @see https://bugs.eclipse.org/bugs/show_bug.cgi?id=428040
					 */
					it("should flag empty line", function(callback) {
						var topic = ";";
						var config = { rules: {} };
						config.rules[RULE_ID] = 1;
						validate({buffer: topic, callback: callback, config: config}).then(
							function (problems) {
								assertProblems(problems, [{
									id: RULE_ID,
									severity: 'warning',
									description: "Unnecessary semicolon.",
									nodeType: "EmptyStatement"
								}]);
							},
							function (error) {
								worker.getTestState().callback(error);
							});
					});
					//------------------------------------------------------------------------------
					// Should nots
					//------------------------------------------------------------------------------
					/**
					 * @see https://bugs.eclipse.org/bugs/show_bug.cgi?id=428040
					 */
					it("should not flag function expression", function(callback) {
						var topic = "var a = function() {};";
						var config = { rules: {} };
						config.rules[RULE_ID] = 1;
						validate({buffer: topic, callback: callback, config: config}).then(
							function (problems) {
								assertProblems(problems, []);
							},
							function (error) {
								worker.getTestState().callback(error);
							});
					});
					/**
					 * @see https://bugs.eclipse.org/bugs/show_bug.cgi?id=428040
					 */
					it("should not flag expression", function(callback) {
						var topic = "var a = 4;";
						var config = { rules: {} };
						config.rules[RULE_ID] = 1;
						validate({buffer: topic, callback: callback, config: config}).then(
							function (problems) {
								assertProblems(problems, []);
							},
							function (error) {
								worker.getTestState().callback(error);
							});
					});
					/**
					 * @see https://bugs.eclipse.org/bugs/show_bug.cgi?id=428040
					 */
					it("should not flag object expression", function(callback) {
						var topic = "var a = {};";
						var config = { rules: {} };
						config.rules[RULE_ID] = 1;
						validate({buffer: topic, callback: callback, config: config}).then(
							function (problems) {
								assertProblems(problems, []);
							},
							function (error) {
								worker.getTestState().callback(error);
							});
					});
				});
			
				//NO-FALLTHROUGH --------------------------------------
				describe('no-fallthrough', function() {
					var RULE_ID = "no-fallthrough";
					it("should flag simple case 1", function(callback) {
						var topic = "switch(a) {case 1: foo; case 2: foo;}";
						var config = { rules: {} };
						config.rules[RULE_ID] = 1;
						validate({buffer: topic, callback: callback, config: config}).then(
							function (problems) {
								assertProblems(problems, [{
									id: RULE_ID,
									severity: 'warning',
									description: "Switch case may be entered by falling through the previous case.",
									nodeType: "SwitchCase"
								}]);
							},
							function (error) {
								worker.getTestState().callback(error);
							});
					});
					it("should flag simple case 2", function(callback) {
						var topic = "switch(a) {case 1:{ foo;} case 2:{ foo;}}";
						var config = { rules: {} };
						config.rules[RULE_ID] = 1;
						validate({buffer: topic, callback: callback, config: config}).then(
							function (problems) {
								assertProblems(problems, [{
									id: RULE_ID,
									severity: 'warning',
									description: "Switch case may be entered by falling through the previous case.",
									nodeType: "SwitchCase"
								}]);
							},
							function (error) {
								worker.getTestState().callback(error);
							});
					});
					it("should flag nested case", function(callback) {
						var topic = "switch(a) {case 1: switch(b) {case 1: foo; case 2: foo;}}";
						var config = { rules: {} };
						config.rules[RULE_ID] = 1;
						validate({buffer: topic, callback: callback, config: config}).then(
							function (problems) {
								assertProblems(problems, [{
									id: RULE_ID,
									severity: 'warning',
									description: "Switch case may be entered by falling through the previous case.",
									nodeType: "SwitchCase"
								}]);
							},
							function (error) {
								worker.getTestState().callback(error);
							});
					});
					it("should flag default", function(callback) {
						var topic = "switch(a) {case 1: foo; default:break;}";
						var config = { rules: {} };
						config.rules[RULE_ID] = 1;
						validate({buffer: topic, callback: callback, config: config}).then(
							function (problems) {
								assertProblems(problems, [{
									id: RULE_ID,
									severity: 'warning',
									description: "Switch case may be entered by falling through the previous case.",
									nodeType: "SwitchCase"
								}]);
							},
							function (error) {
								worker.getTestState().callback(error);
							});
					});
					/**
					 * see https://bugs.eclipse.org/bugs/show_bug.cgi?id=461082
					 */
					it("should not flag block with following statements 1", function(callback) {
						var topic = "switch(a) {case 1:{ foo;} break; case 2:{ foo;}}";
						var config = { rules: {} };
						config.rules[RULE_ID] = 1;
						validate({buffer: topic, callback: callback, config: config}).then(
							function (problems) {
								assertProblems(problems, []);
							},
							function (error) {
								worker.getTestState().callback(error);
							});
					});
					it("should not flag break;", function(callback) {
						var topic = "switch(a) {case 1: foo; break; case 2: foo;}";
						var config = { rules: {} };
						config.rules[RULE_ID] = 1;
						validate({buffer: topic, callback: callback, config: config}).then(
							function (problems) {
								assertProblems(problems, []);
							},
							function (error) {
								worker.getTestState().callback(error);
							});
					});
					it("should not flag throw", function(callback) {
						var topic = "switch(a) {case 1: foo; throw e; case 2: foo;}";
						var config = { rules: {} };
						config.rules[RULE_ID] = 1;
						validate({buffer: topic, callback: callback, config: config}).then(
							function (problems) {
								assertProblems(problems, []);
							},
							function (error) {
								worker.getTestState().callback(error);
							});
					});
					it("should not flag continue", function(callback) {
						var topic = "while(c) {switch(a) {case 1: foo; continue; case 2: foo;}}";
						var config = { rules: {} };
						config.rules[RULE_ID] = 1;
						validate({buffer: topic, callback: callback, config: config}).then(
							function (problems) {
								assertProblems(problems, []);
							},
							function (error) {
								worker.getTestState().callback(error);
							});
					});
					it("should not flag return", function(callback) {
						var topic = "function f() {switch(a) {case 1: foo; return; case 2: foo;}}";
						var config = { rules: {} };
						config.rules[RULE_ID] = 1;
						validate({buffer: topic, callback: callback, config: config}).then(
							function (problems) {
								assertProblems(problems, []);
							},
							function (error) {
								worker.getTestState().callback(error);
							});
					});
					it("should not flag empty case 1", function(callback) {
						var topic = "switch(a) {case 1: case 2: foo;}";
						var config = { rules: {} };
						config.rules[RULE_ID] = 1;
						validate({buffer: topic, callback: callback, config: config}).then(
							function (problems) {
								assertProblems(problems, []);
							},
							function (error) {
								worker.getTestState().callback(error);
							});
					});
					it("should not flag empty case 2", function(callback) {
						var topic = "switch(a) {case 1: {} case 2: foo;}";
						var config = { rules: {} };
						config.rules[RULE_ID] = 1;
						validate({buffer: topic, callback: callback, config: config}).then(
							function (problems) {
								assertProblems(problems, []);
							},
							function (error) {
								worker.getTestState().callback(error);
							});
					});
					it("should not flag doc'd fallthrough 1", function(callback) {
						var topic = "switch(a) {case 1: foo; //$FALLTHROUGH$\ndefault:break;}";
						var config = { rules: {} };
						config.rules[RULE_ID] = 1;
						validate({buffer: topic, callback: callback, config: config}).then(
							function (problems) {
								assertProblems(problems, []);
							},
							function (error) {
								worker.getTestState().callback(error);
							});
					});
					it("should not flag doc'd fallthrough 2", function(callback) {
						var topic = "switch(a) {case 1: switch(b) {case 1: foo; //$FALLTHROUGH$\ncase 2: foo;}}";
						var config = { rules: {} };
						config.rules[RULE_ID] = 1;
						validate({buffer: topic, callback: callback, config: config}).then(
							function (problems) {
								assertProblems(problems, []);
							},
							function (error) {
								worker.getTestState().callback(error);
							});
					});
					/**
					 * @see https://bugs.eclipse.org/bugs/show_bug.cgi?id=478720
					 */
					it("should not flag doc'd fallthrough 3", function(callback) {
						var topic = "switch(a) {case 1: switch(b) {case 1: foo; //$FALLTHROUGH\ncase 2: foo;}}";
						var config = { rules: {} };
						config.rules[RULE_ID] = 1;
						validate({buffer: topic, callback: callback, config: config}).then(
							function (problems) {
								assertProblems(problems, []);
							},
							function (error) {
								worker.getTestState().callback(error);
							});
					});
					/**
					 * @see https://bugs.eclipse.org/bugs/show_bug.cgi?id=478720
					 */
					it("should not flag doc'd fallthrough 4", function(callback) {
						var topic = "switch(a) {case 1: switch(b) {case 1: foo; //FALLTHROUGH\ncase 2: foo;}}";
						var config = { rules: {} };
						config.rules[RULE_ID] = 1;
						validate({buffer: topic, callback: callback, config: config}).then(
							function (problems) {
								assertProblems(problems, []);
							},
							function (error) {
								worker.getTestState().callback(error);
							});
					});
					/**
					 * @see https://bugs.eclipse.org/bugs/show_bug.cgi?id=478720
					 */
					it("should not flag doc'd fallthrough 5", function(callback) {
						var topic = "switch(a) {case 1: switch(b) {case 1: foo; //$FALL THROUGH\ncase 2: foo;}}";
						var config = { rules: {} };
						config.rules[RULE_ID] = 1;
						validate({buffer: topic, callback: callback, config: config}).then(
							function (problems) {
								assertProblems(problems, []);
							},
							function (error) {
								worker.getTestState().callback(error);
							});
					});
					/**
					 * @see https://bugs.eclipse.org/bugs/show_bug.cgi?id=478720
					 */
					it("should not flag doc'd fallthrough 6", function(callback) {
						var topic = "switch(a) {case 1: switch(b) {case 1: foo; //$fallthrough$\ncase 2: foo;}}";
						var config = { rules: {} };
						config.rules[RULE_ID] = 1;
						validate({buffer: topic, callback: callback, config: config}).then(
							function (problems) {
								assertProblems(problems, []);
							},
							function (error) {
								worker.getTestState().callback(error);
							});
					});
					/**
					 * @see https://bugs.eclipse.org/bugs/show_bug.cgi?id=478720
					 */
					it("should not flag doc'd fallthrough 7", function(callback) {
						var topic = "switch(a) {case 1: switch(b) {case 1: foo; //$fallsthrough$\ncase 2: foo;}}";
						var config = { rules: {} };
						config.rules[RULE_ID] = 1;
						validate({buffer: topic, callback: callback, config: config}).then(
							function (problems) {
								assertProblems(problems, []);
							},
							function (error) {
								worker.getTestState().callback(error);
							});
					});
					/**
					 * @see https://bugs.eclipse.org/bugs/show_bug.cgi?id=478720
					 */
					it("should not flag doc'd fallthrough 8", function(callback) {
						var topic = "switch(a) {case 1: switch(b) {case 1: foo; //$falls through$\ncase 2: foo;}}";
						var config = { rules: {} };
						config.rules[RULE_ID] = 1;
						validate({buffer: topic, callback: callback, config: config}).then(
							function (problems) {
								assertProblems(problems, []);
							},
							function (error) {
								worker.getTestState().callback(error);
							});
					});
					/**
					 * @see https://bugs.eclipse.org/bugs/show_bug.cgi?id=478720
					 */
					it("should not flag doc'd fallthrough 9", function(callback) {
						var topic = "switch(a) {case 1: switch(b) {case 1: foo; //falls through\ncase 2: foo;}}";
						var config = { rules: {} };
						config.rules[RULE_ID] = 1;
						validate({buffer: topic, callback: callback, config: config}).then(
							function (problems) {
								assertProblems(problems, []);
							},
							function (error) {
								worker.getTestState().callback(error);
							});
					});
				});
			
				//NO-IMPLIED-EVAL ---------------------------------------------------------
				describe('no-implied-eval', function() {
					var RULE_ID = "no-implied-eval";
					it("should flag setInterval() use call literal arg", function(callback) {
						var topic = "function setInterval() {} setInterval('code', 300);";
						var config = { rules: {} };
						config.rules[RULE_ID] = 1;
						validate({buffer: topic, callback: callback, config: config}).then(
							function (problems) {
								assertProblems(problems, [{
									id: RULE_ID,
									severity: 'warning',
									description: "Implicit \'eval\' function calls are discouraged.",
									nodeType: "Identifier"
								}]);
							},
							function (error) {
								worker.getTestState().callback(error);
							});
					});
					it("should flag setInterval() use call infer literal arg", function(callback) {
						var topic = "function setInterval() {} var s = 'code'; setInterval(s, 300);";
						var config = { rules: {} };
						config.rules[RULE_ID] = 1;
						validate({buffer: topic, callback: callback, config: config}).then(
							function (problems) {
								assertProblems(problems, [{
									id: RULE_ID,
									severity: 'warning',
									description: "Implicit \'eval\' function calls are discouraged.",
									nodeType: "Identifier"
								}]);
							},
							function (error) {
								worker.getTestState().callback(error);
							});
					});
					it("should not flag setInterval() use call non literal", function(callback) {
						var topic = "function setInterval() {} setInterval({}, 300);";
						var config = { rules: {} };
						config.rules[RULE_ID] = 1;
						validate({buffer: topic, callback: callback, config: config}).then(
							function (problems) {
								assertProblems(problems, []);
							},
							function (error) {
								worker.getTestState().callback(error);
							});
					});
					it("should flag setTimeout() use call literal arg", function(callback) {
						var topic = "function setTimeout() {} setTimeout('code', 300);";
						var config = { rules: {} };
						config.rules[RULE_ID] = 1;
						validate({buffer: topic, callback: callback, config: config}).then(
							function (problems) {
								assertProblems(problems, [{
									id: RULE_ID,
									severity: 'warning',
									description: "Implicit \'eval\' function calls are discouraged.",
									nodeType: "Identifier"
								}]);
							},
							function (error) {
								worker.getTestState().callback(error);
							});
					});
					it("should flag setTimeout() use call infer literal arg", function(callback) {
						var topic = "function setTimeout() {} var s = 'code'; setTimeout(s, 300);";
						var config = { rules: {} };
						config.rules[RULE_ID] = 1;
						validate({buffer: topic, callback: callback, config: config}).then(
							function (problems) {
								assertProblems(problems, [{
									id: RULE_ID,
									severity: 'warning',
									description: "Implicit \'eval\' function calls are discouraged.",
									nodeType: "Identifier"
								}]);
							},
							function (error) {
								worker.getTestState().callback(error);
							});
					});
					it("should not flag setTimeout() use call non-literal", function(callback) {
						var topic = "function setTimeout() {} setTimeout({}, 300);";
						var config = { rules: {} };
						config.rules[RULE_ID] = 1;
						validate({buffer: topic, callback: callback, config: config}).then(
							function (problems) {
								assertProblems(problems, []);
							},
							function (error) {
								worker.getTestState().callback(error);
							});
					});
				});
			
				//NO-ITERATOR ----------------------------------------------------
				describe('no-iterator', function() {
					var RULE_ID = "no-iterator";
//					it("should flag __iterator__ 1", function(callback) {
//						var topic = "a.__iterator__ = function() {};";
//						var config = { rules: {} };
//						config.rules[RULE_ID] = 1;
//						validate({buffer: topic, callback: callback, config: config}).then(
//							function (problems) {
//								assertProblems(problems, [{
//									id: RULE_ID,
//									severity: 'warning',
//									description: "Discouraged __iterator__ property use.",
//									nodeType: "Identifier"
//								}]);
//							},
//							function (error) {
//								worker.getTestState().callback(error);
//							});
//					});
//					it("should flag __iterator__ 2", function(callback) {
//						var topic = "a.b.c.__iterator__ = function() {};";
//						var config = { rules: {} };
//						config.rules[RULE_ID] = 1;
//						validate({buffer: topic, callback: callback, config: config}).then(
//							function (problems) {
//								assertProblems(problems, [{
//									id: RULE_ID,
//									severity: 'warning',
//									description: "Discouraged __iterator__ property use.",
//									nodeType: "Identifier"
//								}]);
//							},
//							function (error) {
//								worker.getTestState().callback(error);
//							});
//					});
//					it("should flag __iterator__ 3", function(callback) {
//						var topic = "a['__iterator__'] = function() {};";
//						var config = { rules: {} };
//						config.rules[RULE_ID] = 1;
//						validate({buffer: topic, callback: callback, config: config}).then(
//							function (problems) {
//								assertProblems(problems, [{
//									id: RULE_ID,
//									severity: 'warning',
//									description: "Discouraged __iterator__ property use.",
//									nodeType: "Literal"
//								}]);
//							},
//							function (error) {
//								worker.getTestState().callback(error);
//							});
//					});
//					it("should flag __iterator__ 4", function(callback) {
//						var topic = "a.b[\"__iterator__\"] = function() {};";
//						var config = { rules: {} };
//						config.rules[RULE_ID] = 1;
//						validate({buffer: topic, callback: callback, config: config}).then(
//							function (problems) {
//								assertProblems(problems, [{
//									id: RULE_ID,
//									severity: 'warning',
//									description: "Discouraged __iterator__ property use.",
//									nodeType: "Literal"
//								}]);
//							},
//							function (error) {
//								worker.getTestState().callback(error);
//							});
//					});
//
//					it("should not flag __iterator__ 1", function(callback) {
//						var topic = "var __iterator__ = function() {};";
//						var config = { rules: {} };
//						config.rules[RULE_ID] = 1;
//						validate({buffer: topic, callback: callback, config: config}).then(
//							function (problems) {
//								assertProblems(problems, []);
//							},
//							function (error) {
//								worker.getTestState().callback(error);
//							});
//					});
//					it("should not flag __iterator__ 2", function(callback) {
//						var topic = "var a = __iterator__ = function() {};";
//						var config = { rules: {} };
//						config.rules[RULE_ID] = 1;
//						validate({buffer: topic, callback: callback, config: config}).then(
//							function (problems) {
//								assertProblems(problems, []);
//							},
//							function (error) {
//								worker.getTestState().callback(error);
//							});
//					});
//					it("should not flag __iterator__ 3", function(callback) {
//						var topic = "var a = __iterator__;";
//						var config = { rules: {} };
//						config.rules[RULE_ID] = 1;
//						validate({buffer: topic, callback: callback, config: config}).then(
//							function (problems) {
//								assertProblems(problems, []);
//							},
//							function (error) {
//								worker.getTestState().callback(error);
//							});
//					});
					/**
					 * @see https://bugs.eclipse.org/bugs/show_bug.cgi?id=461461
					 */
					it("should not flag incomplete", function(callback) {
						var topic = "var o = {a: function() {this.}};";
						var config = { rules: {} };
						config.rules[RULE_ID] = 1;
						validate({buffer: topic, callback: callback, config: config}).then(
							function (problems) {
								// syntax error
								assertProblems(problems, [{
									severity: 'error'
								}]);
							},
							function (error) {
								worker.getTestState().callback(error);
							});
					});
					/**
					 * @see https://bugs.eclipse.org/bugs/show_bug.cgi?id=461461
					 */
					it("should not flag incomplete", function(callback) {
						var topic = "window.";
						var config = { rules: {} };
						config.rules[RULE_ID] = 1;
						validate({buffer: topic, callback: callback, config: config}).then(
							function (problems) {
								// syntax error
								assertProblems(problems, [{
									severity: 'error'
								}]);
							},
							function (error) {
								worker.getTestState().callback(error);
							});
					});
				});
				//NO-PROTO ----------------------------------------------------
				describe('no-proto', function() {
					var RULE_ID = "no-proto";
					it("should flag __proto__ 1", function(callback) {
						var topic = "myProto.__proto__ = function() {};";
						var config = { rules: {} };
						config.rules[RULE_ID] = 1;
						validate({buffer: topic, callback: callback, config: config}).then(
							function (problems) {
								assertProblems(problems, [{
									id: RULE_ID,
									severity: 'warning',
									description: "Discouraged __proto__ property use.",
									nodeType: "Identifier"
								}]);
							},
							function (error) {
								worker.getTestState().callback(error);
							});
					});
					it("should flag __proto__ 2", function(callback) {
						var topic = "myProto.b.c.__proto__ = function() {};";
						var config = { rules: {} };
						config.rules[RULE_ID] = 1;
						validate({buffer: topic, callback: callback, config: config}).then(
							function (problems) {
								assertProblems(problems, [{
									id: RULE_ID,
									severity: 'warning',
									description: "Discouraged __proto__ property use.",
									nodeType: "Identifier"
								}]);
							},
							function (error) {
								worker.getTestState().callback(error);
							});
					});
					it("should flag __proto__ 3", function(callback) {
						var topic = "myProto['__proto__'] = function() {};";
						var config = { rules: {} };
						config.rules[RULE_ID] = 1;
						validate({buffer: topic, callback: callback, config: config}).then(
							function (problems) {
								assertProblems(problems, [{
									id: RULE_ID,
									severity: 'warning',
									description: "Discouraged __proto__ property use.",
									nodeType: "Literal"
								}]);
							},
							function (error) {
								worker.getTestState().callback(error);
							});
					});
					it("should flag __proto__ 4", function(callback) {
						var topic = "myProto.b[\"__proto__\"] = function() {};";
						var config = { rules: {} };
						config.rules[RULE_ID] = 1;
						validate({buffer: topic, callback: callback, config: config}).then(
							function (problems) {
								assertProblems(problems, [{
									id: RULE_ID,
									severity: 'warning',
									description: "Discouraged __proto__ property use.",
									nodeType: "Literal"
								}]);
							},
							function (error) {
								worker.getTestState().callback(error);
							});
					});
			
					it("should not flag __proto__ 1", function(callback) {
						var topic = "var __proto__ = function() {};";
						var config = { rules: {} };
						config.rules[RULE_ID] = 1;
						validate({buffer: topic, callback: callback, config: config}).then(
							function (problems) {
								assertProblems(problems, []);
							},
							function (error) {
								worker.getTestState().callback(error);
							});
					});
					it("should not flag __proto__ 2", function(callback) {
						var topic = "var azzzzzz = __proto__ = function() {};";
						var config = { rules: {} };
						config.rules[RULE_ID] = 1;
						validate({buffer: topic, callback: callback, config: config}).then(
							function (problems) {
								assertProblems(problems, []);
							},
							function (error) {
								worker.getTestState().callback(error);
							});
					});
					it("should not flag __proto__ 3", function(callback) {
						var topic = "var myProto = __proto__;";
						var config = { rules: {} };
						config.rules[RULE_ID] = 1;
						validate({buffer: topic, callback: callback, config: config}).then(
							function (problems) {
								assertProblems(problems, []);
							},
							function (error) {
								worker.getTestState().callback(error);
							});
					});
				});
				//NO-JSLINT ------------------------------------------------------
				describe('no-jslint', function() {
					var RULE_ID = "no-jslint";
					it("should flag jslint 1", function(callback) {
						var topic = "/* jslint node:true */ if (a == b) var i = 1;";
						var config = { rules: {} };
						config.rules[RULE_ID] = 1;
						validate({buffer: topic, callback: callback, config: config}).then(
							function (problems) {
								assertProblems(problems, [{
									id: RULE_ID,
									severity: 'warning',
									description: "The 'jslint' directive is unsupported, please use eslint-env.",
									nodeType: "BlockComment"
								}]);
							},
							function (error) {
								worker.getTestState().callback(error);
							});
					});
					it("should flag jslint 2", function(callback) {
						var topic = "/*jslint node:true*/if (a != b) {} else var i = 1;";
						var config = { rules: {} };
						config.rules[RULE_ID] = 1;
						validate({buffer: topic, callback: callback, config: config}).then(
							function (problems) {
								assertProblems(problems, [{
									id: RULE_ID,
									severity: 'warning',
									description: "The 'jslint' directive is unsupported, please use eslint-env.",
									nodeType: "BlockComment"
								}]);
							},
							function (error) {
								worker.getTestState().callback(error);
							});
					});
					it("should flag jslint 3", function(callback) {
						var topic = "while(true) /*jslint browser:false*/ var i = 1;";
						var config = { rules: {} };
						config.rules[RULE_ID] = 1;
						validate({buffer: topic, callback: callback, config: config}).then(
							function (problems) {
								assertProblems(problems, [{
									id: RULE_ID,
									severity: 'warning',
									description: "The 'jslint' directive is unsupported, please use eslint-env.",
									nodeType: "BlockComment"
								}]);
							},
							function (error) {
								worker.getTestState().callback(error);
							});
					});
					it("should flag jslint 4", function(callback) {
						var topic = "while(true) /*JSLint browser:false*/ var i = 1;";
						var config = { rules: {} };
						config.rules[RULE_ID] = 1;
						validate({buffer: topic, callback: callback, config: config}).then(
							function (problems) {
								assertProblems(problems, [{
									id: RULE_ID,
									severity: 'warning',
									description: "The 'JSLint' directive is unsupported, please use eslint-env.",
									nodeType: "BlockComment"
								}]);
							},
							function (error) {
								worker.getTestState().callback(error);
							});
					});
					it("should flag jshint 1", function(callback) {
						var topic = "/*jshint ecma:true*/ for(true;;) var i = 1;";
						var config = { rules: {} };
						config.rules[RULE_ID] = 1;
						validate({buffer: topic, callback: callback, config: config}).then(
							function (problems) {
								assertProblems(problems, [{
									id: RULE_ID,
									severity: 'warning',
									description: "The 'jshint' directive is unsupported, please use eslint-env.",
									nodeType: "BlockComment"
								}]);
							},
							function (error) {
								worker.getTestState().callback(error);
							});
					});
					it("should flag jshint 2", function(callback) {
						var topic = "var o = {}; /* jshint browser:true */ for(var p in o) var i = 1;";
						var config = { rules: {} };
						config.rules[RULE_ID] = 1;
						validate({buffer: topic, callback: callback, config: config}).then(
							function (problems) {
								assertProblems(problems, [{
									id: RULE_ID,
									severity: 'warning',
									description: "The 'jshint' directive is unsupported, please use eslint-env.",
									nodeType: "BlockComment"
								}]);
							},
							function (error) {
								worker.getTestState().callback(error);
							});
					});
					it("should flag jshint 3", function(callback) {
						var topic = "var o = {}; /* JSHint browser:true */ for(var p in o) var i = 1;";
						var config = { rules: {} };
						config.rules[RULE_ID] = 1;
						validate({buffer: topic, callback: callback, config: config}).then(
							function (problems) {
								assertProblems(problems, [{
									id: RULE_ID,
									severity: 'warning',
									description: "The 'JSHint' directive is unsupported, please use eslint-env.",
									nodeType: "BlockComment"
								}]);
							},
							function (error) {
								worker.getTestState().callback(error);
							});
					});
					it("should not flag jslint 1", function(callback) {
						var topic = "/*jslint */ if (a != null) {var i = 1;}";
						var config = { rules: {} };
						config.rules[RULE_ID] = 1;
						validate({buffer: topic, callback: callback, config: config}).then(
							function (problems) {
								assertProblems(problems, []);
							},
							function (error) {
								worker.getTestState().callback(error);
							});
					});
					it("should not flag jslint 2", function(callback) {
						var topic = "/*jslint is not supported*/ if (null != a) {} else {var i = 1;}";
						var config = { rules: {} };
						config.rules[RULE_ID] = 1;
						validate({buffer: topic, callback: callback, config: config}).then(
							function (problems) {
								assertProblems(problems, []);
							},
							function (error) {
								worker.getTestState().callback(error);
							});
					});
					it("should not flag jslint 3", function(callback) {
						var topic = "/*jslint node: false*/ if (a != undefined) {}";
						var config = { rules: {} };
						config.rules[RULE_ID] = 1;
						validate({buffer: topic, callback: callback, config: config}).then(
							function (problems) {
								assertProblems(problems, []);
							},
							function (error) {
								worker.getTestState().callback(error);
							});
					});
					it("should not flag jslint 4", function(callback) {
						var topic = "//jslint node:false\n if (a != undefined) {}";
						var config = { rules: {} };
						config.rules[RULE_ID] = 1;
						validate({buffer: topic, callback: callback, config: config}).then(
							function (problems) {
								assertProblems(problems, []);
							},
							function (error) {
								worker.getTestState().callback(error);
							});
					});
					it("should not flag jshint 1", function(callback) {
						var topic = "/*jshint */ if (a != null) {var i = 1;}";
						var config = { rules: {} };
						config.rules[RULE_ID] = 1;
						validate({buffer: topic, callback: callback, config: config}).then(
							function (problems) {
								assertProblems(problems, []);
							},
							function (error) {
								worker.getTestState().callback(error);
							});
					});
					it("should not flag jshint 2", function(callback) {
						var topic = "/*jshint is not supported*/ if (null != a) {} else {var i = 1;}";
						var config = { rules: {} };
						config.rules[RULE_ID] = 1;
						validate({buffer: topic, callback: callback, config: config}).then(
							function (problems) {
								assertProblems(problems, []);
							},
							function (error) {
								worker.getTestState().callback(error);
							});
					});
					it("should not flag jshint 3", function(callback) {
						var topic = "/*jshint node: false*/ if (a != undefined) {}";
						var config = { rules: {} };
						config.rules[RULE_ID] = 1;
						validate({buffer: topic, callback: callback, config: config}).then(
							function (problems) {
								assertProblems(problems, []);
							},
							function (error) {
								worker.getTestState().callback(error);
							});
					});
					it("should not flag jshint 4", function(callback) {
						var topic = "//jshint node:false\n if (a != undefined) {}";
						var config = { rules: {} };
						config.rules[RULE_ID] = 1;
						validate({buffer: topic, callback: callback, config: config}).then(
							function (problems) {
								assertProblems(problems, []);
							},
							function (error) {
								worker.getTestState().callback(error);
							});
					});
				});
			
				//NO-NEW-ARRAY ----------------------------------------------------
				describe('no-new-array', function() {
					var RULE_ID = "no-new-array";
					it("not flag no args", function(callback) {
						var topic = "var ar = new Array()";
						var config = { rules: {} };
						config.rules[RULE_ID] = 1;
						validate({buffer: topic, callback: callback, config: config}).then(
							function (problems) {
								assertProblems(problems, []);
							},
							function (error) {
								worker.getTestState().callback(error);
							});
					});
					it("not flag call expression no args", function(callback) {
						var topic = "var ar = Array();";
						var config = { rules: {} };
						config.rules[RULE_ID] = 1;
						validate({buffer: topic, callback: callback, config: config}).then(
							function (problems) {
								assertProblems(problems, []);
							},
							function (error) {
								worker.getTestState().callback(error);
							});
					});
					it("not flag single number arg", function(callback) {
						var topic = "var ar = new Array(1)";
						var config = { rules: {} };
						config.rules[RULE_ID] = 1;
						validate({buffer: topic, callback: callback, config: config}).then(
							function (problems) {
								assertProblems(problems, []);
							},
							function (error) {
								worker.getTestState().callback(error);
							});
					});
					it("not flag call expression single number arg", function(callback) {
						var topic = "var ar = Array(1);";
						var config = { rules: {} };
						config.rules[RULE_ID] = 1;
						validate({buffer: topic, callback: callback, config: config}).then(
							function (problems) {
								assertProblems(problems, []);
							},
							function (error) {
								worker.getTestState().callback(error);
							});
					});
					it("not flag single non-literal arg", function(callback) {
						var topic = "var ar = new Array(otherarr.length)";
						var config = { rules: {} };
						config.rules[RULE_ID] = 1;
						validate({buffer: topic, callback: callback, config: config}).then(
							function (problems) {
								assertProblems(problems, []);
							},
							function (error) {
								worker.getTestState().callback(error);
							});
					});
					it("not flag call expression single non-literal arg", function(callback) {
						var topic = "var ar = Array(otherarr.length);";
						var config = { rules: {} };
						config.rules[RULE_ID] = 1;
						validate({buffer: topic, callback: callback, config: config}).then(
							function (problems) {
								assertProblems(problems, []);
							},
							function (error) {
								worker.getTestState().callback(error);
							});
					});
					it("not flag in inner scope - no args", function(callback) {
						var topic = "(function f() { var x = new Array(); }());";
						var config = { rules: {} };
						config.rules[RULE_ID] = 1;
						validate({buffer: topic, callback: callback, config: config}).then(
							function (problems) {
								assertProblems(problems, []);
							},
							function (error) {
								worker.getTestState().callback(error);
							});
					});
					it("not flag in inner scope - single number arg", function(callback) {
						var topic = "(function f() { var x = new Array(1); }());";
						var config = { rules: {} };
						config.rules[RULE_ID] = 1;
						validate({buffer: topic, callback: callback, config: config}).then(
							function (problems) {
								assertProblems(problems, []);
							},
							function (error) {
								worker.getTestState().callback(error);
							});
					});
					it("flag in single arg - non number", function(callback) {
						var topic = "(function f() { var x = new Array('a'); }());";
						var config = { rules: {} };
						config.rules[RULE_ID] = 1;
						validate({buffer: topic, callback: callback, config: config}).then(
							function (problems) {
								assertProblems(problems, [{
									id: RULE_ID,
									severity: 'warning',
									description: "Use the array literal notation '[]'.",
									nodeType: "Identifier"
								}]);
							},
							function (error) {
								worker.getTestState().callback(error);
							});
					});
					it("flag in multi arg - numbers", function(callback) {
						var topic = "(function f() { var x = new Array(1, 2, 3); }());";
						var config = { rules: {} };
						config.rules[RULE_ID] = 1;
						validate({buffer: topic, callback: callback, config: config}).then(
							function (problems) {
								assertProblems(problems, [{
									id: RULE_ID,
									severity: 'warning',
									description: "Use the array literal notation '[]'.",
									nodeType: "Identifier"
								}]);
							},
							function (error) {
								worker.getTestState().callback(error);
							});
					});
					it("flag in multi arg - mixed", function(callback) {
						var topic = "(function f() { var x = new Array(1, 'a', {}); }());";
						var config = { rules: {} };
						config.rules[RULE_ID] = 1;
						validate({buffer: topic, callback: callback, config: config}).then(
							function (problems) {
								assertProblems(problems, [{
									id: RULE_ID,
									severity: 'warning',
									description: "Use the array literal notation '[]'.",
									nodeType: "Identifier"
								}]);
							},
							function (error) {
								worker.getTestState().callback(error);
							});
					});
				});
			
				//NO-NEW-FUNC ---------------------------------------------------------
				describe('no-new-func', function() {
					var RULE_ID = "no-new-func";
					it("flag in global scope", function(callback) {
						var topic = "new Function";
						var config = { rules: {} };
						config.rules[RULE_ID] = 1;
						validate({buffer: topic, callback: callback, config: config}).then(
							function (problems) {
								assertProblems(problems, [{
									id: RULE_ID,
									severity: 'warning',
									description: "The Function constructor is eval.",
									nodeType: "Identifier"
								}]);
							},
							function (error) {
								worker.getTestState().callback(error);
							});
					});
					it("flag when symbol is declared in /*global block", function(callback) {
						var topic = "/*global Function*/ new Function();";
						var config = { rules: {} };
						config.rules[RULE_ID] = 1;
						validate({buffer: topic, callback: callback, config: config}).then(
							function (problems) {
								assertProblems(problems, [{
									id: RULE_ID,
									severity: 'warning',
									description: "The Function constructor is eval.",
									nodeType: "Identifier"
								}]);
							},
							function (error) {
								worker.getTestState().callback(error);
							});
					});
					it("flag in inner scope", function(callback) {
						var topic = "(function f() { new Function(); }());";
						var config = { rules: {} };
						config.rules[RULE_ID] = 1;
						validate({buffer: topic, callback: callback, config: config}).then(
							function (problems) {
								assertProblems(problems, [{
									id: RULE_ID,
									severity: 'warning',
									description: "The Function constructor is eval.",
									nodeType: "Identifier"
								}]);
							},
							function (error) {
								worker.getTestState().callback(error);
							});
					});
				});
			
				//NO-NEW-OBJECT -------------------------------------------------
				describe('no-new-object', function() {
					var RULE_ID = "no-new-object";
					it("flag in global scope", function(callback) {
						var topic = "new Object";
						var config = { rules: {} };
						config.rules[RULE_ID] = 1;
						validate({buffer: topic, callback: callback, config: config}).then(
							function (problems) {
								assertProblems(problems, [{
									id: RULE_ID,
									severity: 'warning',
									description: "Use the object literal notation '{}' or Object.create(null).",
									nodeType: "Identifier"
								}]);
							},
							function (error) {
								worker.getTestState().callback(error);
							});
					});
					it("flag when symbol is declared in /*global block", function(callback) {
						var topic = "/*global Object*/ new Object();";
						var config = { rules: {} };
						config.rules[RULE_ID] = 1;
						validate({buffer: topic, callback: callback, config: config}).then(
							function (problems) {
								assertProblems(problems, [{
									id: RULE_ID,
									severity: 'warning',
									description: "Use the object literal notation '{}' or Object.create(null).",
									nodeType: "Identifier"
								}]);
							},
							function (error) {
								worker.getTestState().callback(error);
							});
					});
					it("flag in inner scope", function(callback) {
						var topic = "(function f() { new Object(); }());";
						var config = { rules: {} };
						config.rules[RULE_ID] = 1;
						validate({buffer: topic, callback: callback, config: config}).then(
							function (problems) {
								assertProblems(problems, [{
									id: RULE_ID,
									severity: 'warning',
									description: "Use the object literal notation '{}' or Object.create(null).",
									nodeType: "Identifier"
								}]);
							},
							function (error) {
								worker.getTestState().callback(error);
							});
					});
				});
			
				//NO-NEW-WRAPPERS --------------------------------------------------------
				describe('no-new-wrappers', function() {
					var RULE_ID = "no-new-wrappers";
					/**
					 * Checks the Object constructor message
					 */
					function assertMessages(messages, size) {
							try {
								var temp = messages.problems;
								assert.equal(temp.length, size);
								temp.forEach(function(message) {
										assert.equal(message.id, RULE_ID);
										assert.ok(/Do not use \'\w+\' as a constructor\./.test(message.description), "Has expected message");
										assert.equal(message.nodeType, "Identifier");
								});
								worker.getTestState().callback();
							}
							catch(err) {
								worker.getTestState().callback(err);
							}
					}
			
					// String Number Math Boolean JSON
					it("flag in global scope", function(callback) {
						var topic = "new String; new Number; new Math; new Boolean; new JSON;";
						var config = { rules: {} };
						config.rules[RULE_ID] = 1;
						validate({buffer: topic, callback: callback, config: config}).then(
							function (problems) {
								assertMessages(problems, 5);
							},
							function (error) {
								worker.getTestState().callback(error);
							});
					});
					it("flag when symbol is declared in /*global block", function(callback) {
						var topic = "/*global String Number Math Boolean JSON*/ new String; new Number; new Math; new Boolean; new JSON;";
						var config = { rules: {} };
						config.rules[RULE_ID] = 1;
						validate({buffer: topic, callback: callback, config: config}).then(
							function (problems) {
								assertMessages(problems, 5);
							},
							function (error) {
								worker.getTestState().callback(error);
							});
					});
					it("flag in inner scope", function(callback) {
						var topic = "(function f() { new new String; new Number; new Math; new Boolean; new JSON; }());";
						var config = { rules: {} };
						config.rules[RULE_ID] = 1;
						validate({buffer: topic, callback: callback, config: config}).then(
							function (problems) {
								assertMessages(problems, 5);
							},
							function (error) {
								worker.getTestState().callback(error);
							});
					});
				});
			
				//MISSING-NLS -------------------------------------------------------
				describe('missing-nls', function() {
					var RULE_ID = "missing-nls";
					it("Mark double quotes", function(callback) {
						var topic = "var a = \"a\"; var b = \"bb\";";
						var config = { rules: {} };
						config.rules[RULE_ID] = 1;
						validate({buffer: topic, callback: callback, config: config}).then(
							function (problems) {
								assertProblems(problems, [{
									id: RULE_ID,
									severity: 'warning',
									description: "Non-externalized string literal 'a'.",
									nodeType: "Literal"
								},
								{
									id: RULE_ID,
									severity: 'warning',
									description: "Non-externalized string literal 'bb'.",
									nodeType: "Literal"
								}]);
							},
							function (error) {
								worker.getTestState().callback(error);
							});
					});
					it("Mark single quotes", function(callback) {
						var topic = "var a = 'a'; var b = 'bb';";
						var config = { rules: {} };
						config.rules[RULE_ID] = 1;
						validate({buffer: topic, callback: callback, config: config}).then(
							function (problems) {
								assertProblems(problems, [{
									id: RULE_ID,
									severity: 'warning',
									description: "Non-externalized string literal 'a'.",
									nodeType: "Literal"
								},
								{
									id: RULE_ID,
									severity: 'warning',
									description: "Non-externalized string literal 'bb'.",
									nodeType: "Literal"
								}]);
							},
							function (error) {
								worker.getTestState().callback(error);
							});
					});
					it("Ignore commented 1", function(callback) {
						var topic = "var a = 'a'; var b = 'bb'; //$NON-NLS-1$ //$NON-NLS-2$";
						var config = { rules: {} };
						config.rules[RULE_ID] = 1;
						validate({buffer: topic, callback: callback, config: config}).then(
							function (problems) {
								assertProblems(problems, []);
							},
							function (error) {
								worker.getTestState().callback(error);
							});
					});
					it("Ignore commented 2", function(callback) {
						var topic = "var a = 'a'; var b = 'bb'; //$NON-NLS-1$";
						var config = { rules: {} };
						config.rules[RULE_ID] = 1;
						validate({buffer: topic, callback: callback, config: config}).then(
							function (problems) {
								assertProblems(problems, [
								{
									id: RULE_ID,
									severity: 'warning',
									description: "Non-externalized string literal 'bb'.",
									nodeType: "Literal"
								}]);
							},
							function (error) {
								worker.getTestState().callback(error);
							});
					});
					it("Ignore commented 3", function(callback) {
						var topic = "var a = 'a'; var b = 'bb'; //$NON-NLS-2$";
						var config = { rules: {} };
						config.rules[RULE_ID] = 1;
						validate({buffer: topic, callback: callback, config: config}).then(
							function (problems) {
								assertProblems(problems, [{
									id: RULE_ID,
									severity: 'warning',
									description: "Non-externalized string literal 'a'.",
									nodeType: "Literal"
								}]);
							},
							function (error) {
								worker.getTestState().callback(error);
							});
					});
					it("Ignore commented 4", function(callback) {
						var topic = "var a = 'a'; var b = 'bb'; //$NON-NLS-2$ //$NON-NLS-1$";
						var config = { rules: {} };
						config.rules[RULE_ID] = 1;
						validate({buffer: topic, callback: callback, config: config}).then(
							function (problems) {
								assertProblems(problems, []);
							},
							function (error) {
								worker.getTestState().callback(error);
							});
					});
					it("Ignore commented 5", function(callback) {
						var topic = "var a = 'a'; var b = 'bb'; //$NON-NLS-3$";
						var config = { rules: {} };
						config.rules[RULE_ID] = 1;
						validate({buffer: topic, callback: callback, config: config}).then(
							function (problems) {
								assertProblems(problems, [{
									id: RULE_ID,
									severity: 'warning',
									description: "Non-externalized string literal 'a'.",
									nodeType: "Literal"
								},
								{
									id: RULE_ID,
									severity: 'warning',
									description: "Non-externalized string literal 'bb'.",
									nodeType: "Literal"
								}]);
							},
							function (error) {
								worker.getTestState().callback(error);
							});
					});
					/**
					 * @see https://bugs.eclipse.org/bugs/show_bug.cgi?id=467125
					 */
					it("Ignore RegExp", function(callback) {
						var topic = "var reg = new RegExp('/[f]/');";
						var config = { rules: {} };
						config.rules[RULE_ID] = 1;
						validate({buffer: topic, callback: callback, config: config}).then(
							function (problems) {
								assertProblems(problems, []);
							},
							function (error) {
								worker.getTestState().callback(error);
							});
					});
					/**
					 * @see https://bugs.eclipse.org/bugs/show_bug.cgi?id=487677
					 */
					it("Ignore createElement 1", function(callback) {
						var topic = "document.createElement('span');";
						var config = { rules: {} };
						config.rules[RULE_ID] = 1;
						validate({buffer: topic, callback: callback, config: config}).then(
							function (problems) {
								assertProblems(problems, []);
							},
							function (error) {
								worker.getTestState().callback(error);
							});
					});
					/**
					 * @see https://bugs.eclipse.org/bugs/show_bug.cgi?id=487677
					 */
					it("Ignore createElement 2", function(callback) {
						var topic = "if(true) {document.createElement('span');}";
						var config = { rules: {} };
						config.rules[RULE_ID] = 1;
						validate({buffer: topic, callback: callback, config: config}).then(
							function (problems) {
								assertProblems(problems, []);
							},
							function (error) {
								worker.getTestState().callback(error);
							});
					});
					/**
					 * @see https://bugs.eclipse.org/bugs/show_bug.cgi?id=487677
					 */
					it("Mark non-document createElement 1", function(callback) {
						var topic = "if(true) {foo.document.createElement('span');}";
						var config = { rules: {} };
						config.rules[RULE_ID] = 1;
						validate({buffer: topic, callback: callback, config: config}).then(
							function (problems) {
								assertProblems(problems, [
									{
										id: RULE_ID,
										severity: 'warning',
										description: "Non-externalized string literal 'span'.",
										nodeType: "Literal"
									}
								]);
							},
							function (error) {
								worker.getTestState().callback(error);
							});
					});
					/**
					 * @see https://bugs.eclipse.org/bugs/show_bug.cgi?id=487677
					 */
					it("Mark non-document createElement 2", function(callback) {
						var topic = "if(true) {foo.createElement('span');}";
						var config = { rules: {} };
						config.rules[RULE_ID] = 1;
						validate({buffer: topic, callback: callback, config: config}).then(
							function (problems) {
								assertProblems(problems, [
									{
										id: RULE_ID,
										severity: 'warning',
										description: "Non-externalized string literal 'span'.",
										nodeType: "Literal"
									}
								]);
							},
							function (error) {
								worker.getTestState().callback(error);
							});
					});
					/**
					 * @see https://bugs.eclipse.org/bugs/show_bug.cgi?id=487677
					 */
					it("Mark non-document createElement 3", function(callback) {
						var topic = "if(true) {createElement('span');}";
						var config = { rules: {} };
						config.rules[RULE_ID] = 1;
						validate({buffer: topic, callback: callback, config: config}).then(
							function (problems) {
								assertProblems(problems, [
									{
										id: RULE_ID,
										severity: 'warning',
										description: "Non-externalized string literal 'span'.",
										nodeType: "Literal"
									}
								]);
							},
							function (error) {
								worker.getTestState().callback(error);
							});
					});
					/**
					 * @see https://bugs.eclipse.org/bugs/show_bug.cgi?id=487677
					 */
					it("Mark non-document createElement 4", function(callback) {
						var topic = "createElement('span');";
						var config = { rules: {} };
						config.rules[RULE_ID] = 1;
						validate({buffer: topic, callback: callback, config: config}).then(
							function (problems) {
								assertProblems(problems, [
									{
										id: RULE_ID,
										severity: 'warning',
										description: "Non-externalized string literal 'span'.",
										nodeType: "Literal"
									}
								]);
							},
							function (error) {
								worker.getTestState().callback(error);
							});
					});
					/**
					 * @see https://bugs.eclipse.org/bugs/show_bug.cgi?id=487677
					 */
					it("Mark non-document createElement 5", function(callback) {
						var topic = "document.delegate.createElement('span');";
						var config = { rules: {} };
						config.rules[RULE_ID] = 1;
						validate({buffer: topic, callback: callback, config: config}).then(
							function (problems) {
								assertProblems(problems, [
									{
										id: RULE_ID,
										severity: 'warning',
										description: "Non-externalized string literal 'span'.",
										nodeType: "Literal"
									}
								]);
							},
							function (error) {
								worker.getTestState().callback(error);
							});
					});
					/**
					 * @see https://bugs.eclipse.org/bugs/show_bug.cgi?id=467125
					 */
					it.skip("Ignore addEventListener", function(callback) {
						var topic = "var worker = new Worker('a.hs'); worker.addEventListener('onmessage', function() {});";
						var config = { rules: {} };
						config.rules[RULE_ID] = 1;
						validate({buffer: topic, callback: callback, config: config}).then(
							function (problems) {
								assertProblems(problems, []);
							},
							function (error) {
								worker.getTestState().callback(error);
							});
					});
					/**
					 * @see https://bugs.eclipse.org/bugs/show_bug.cgi?id=467125
					 */
					it("Ignore operator 1", function(callback) {
						var topic = "var op = '==';";
						var config = { rules: {} };
						config.rules[RULE_ID] = 1;
						validate({buffer: topic, callback: callback, config: config}).then(
							function (problems) {
								assertProblems(problems, []);
							},
							function (error) {
								worker.getTestState().callback(error);
							});
					});
					/**
					 * @see https://bugs.eclipse.org/bugs/show_bug.cgi?id=467125
					 */
					it("Ignore operator 2", function(callback) {
						var topic = "var op = '===';";
						var config = { rules: {} };
						config.rules[RULE_ID] = 1;
						validate({buffer: topic, callback: callback, config: config}).then(
							function (problems) {
								assertProblems(problems, []);
							},
							function (error) {
								worker.getTestState().callback(error);
							});
					});
					/**
					 * @see https://bugs.eclipse.org/bugs/show_bug.cgi?id=467125
					 */
					it("Ignore operator 3", function(callback) {
						var topic = "var op = '!==';";
						var config = { rules: {} };
						config.rules[RULE_ID] = 1;
						validate({buffer: topic, callback: callback, config: config}).then(
							function (problems) {
								assertProblems(problems, []);
							},
							function (error) {
								worker.getTestState().callback(error);
							});
					});
					/**
					 * @see https://bugs.eclipse.org/bugs/show_bug.cgi?id=467125
					 */
					it("Mark operator 1", function(callback) {
						var topic = "var punc = '==hello';";
						var config = { rules: {} };
						config.rules[RULE_ID] = 1;
						validate({buffer: topic, callback: callback, config: config}).then(
							function (problems) {
								assertProblems(problems, [{
									id: RULE_ID,
									severity: 'warning',
									description: "Non-externalized string literal '==hello'.",
									nodeType: "Literal"
								}]);
							},
							function (error) {
								worker.getTestState().callback(error);
							});
					});
					/**
					 * @see https://bugs.eclipse.org/bugs/show_bug.cgi?id=467125
					 */
					it("Ignore punc 1", function(callback) {
						var topic = "var punc = ';';";
						var config = { rules: {} };
						config.rules[RULE_ID] = 1;
						validate({buffer: topic, callback: callback, config: config}).then(
							function (problems) {
								assertProblems(problems, []);
							},
							function (error) {
								worker.getTestState().callback(error);
							});
					});
					/**
					 * @see https://bugs.eclipse.org/bugs/show_bug.cgi?id=467125
					 */
					it("Ignore punc 2", function(callback) {
						var topic = "var punc = '?';";
						var config = { rules: {} };
						config.rules[RULE_ID] = 1;
						validate({buffer: topic, callback: callback, config: config}).then(
							function (problems) {
								assertProblems(problems, []);
							},
							function (error) {
								worker.getTestState().callback(error);
							});
					});
					/**
					 * @see https://bugs.eclipse.org/bugs/show_bug.cgi?id=467125
					 */
					it("Mark punc 1", function(callback) {
						var topic = "var punc = ';hello';";
						var config = { rules: {} };
						config.rules[RULE_ID] = 1;
						validate({buffer: topic, callback: callback, config: config}).then(
							function (problems) {
								assertProblems(problems, [{
									id: RULE_ID,
									severity: 'warning',
									description: "Non-externalized string literal ';hello'.",
									nodeType: "Literal"
								}]);
							},
							function (error) {
								worker.getTestState().callback(error);
							});
					});
					it("Ignore define", function(callback) {
						var topic = "define(['define', 'define2', 'define3'])";
						var config = { rules: {} };
						var createFiles = [{name: 'define', text: ''},{name: 'define2', text: ''},{name: 'define3', text: ''},];
						config.rules[RULE_ID] = 1;
						validate({buffer: topic, callback: callback, config: config, createFiles: createFiles}).then(
							function (problems) {
								assertProblems(problems, []);
							},
							function (error) {
								worker.getTestState().callback(error);
							});
					});
					it("Ignore define values like messages bundles", function(callback) {
						var topic = "define({'a': 'b', 'c': 'd'})";
						var config = { rules: {} };
						config.rules[RULE_ID] = 1;
						validate({buffer: topic, callback: callback, config: config}).then(
							function (problems) {
								assertProblems(problems, []);
							},
							function (error) {
								worker.getTestState().callback(error);
							});
					});
					it.skip("Ignore define id", function(callback) {
						var topic = "define('myid', ['define', 'define2', 'define3'])";
						var config = { rules: {} };
						config.rules[RULE_ID] = 1;
						validate({buffer: topic, callback: callback, config: config}).then(
							function (problems) {
								assertProblems(problems, []);
							},
							function (error) {
								worker.getTestState().callback(error);
							});
					});
					it.skip("Ignore importScripts 1", function(callback) {
						var topic = "importScripts('myscript.js');";
						var config = { rules: {} };
						config.rules[RULE_ID] = 1;
						validate({buffer: topic, callback: callback, config: config}).then(
							function (problems) {
								assertProblems(problems, []);
							},
							function (error) {
								worker.getTestState().callback(error);
							});
					});
					it.skip("Ignore importScripts 1", function(callback) {
						var topic = "importScripts('myscript.js', 'myscript2.js');";
						var config = { rules: {} };
						config.rules[RULE_ID] = 1;
						validate({buffer: topic, callback: callback, config: config}).then(
							function (problems) {
								assertProblems(problems, []);
							},
							function (error) {
								worker.getTestState().callback(error);
							});
					});
					it.skip("Ignore require array", function(callback) {
						var topic = "require(['myscript.js', 'myscript2.js']);";
						var config = { rules: {} };
						config.rules[RULE_ID] = 1;
						validate({buffer: topic, callback: callback, config: config}).then(
							function (problems) {
								assertProblems(problems, []);
							},
							function (error) {
								worker.getTestState().callback(error);
							});
					});
					it.skip("Ignore requirejs array 1", function(callback) {
						var topic = "requirejs(['myscript.js', 'myscript2.js']);";
						var config = { rules: {} };
						config.rules[RULE_ID] = 1;
						validate({buffer: topic, callback: callback, config: config}).then(
							function (problems) {
								assertProblems(problems, []);
							},
							function (error) {
								worker.getTestState().callback(error);
							});
					});
					it("Ignore requirejs array 2", function(callback) {
						var topic = "requirejs({}, ['myscript.js', 'myscript2.js'], function(){});";
						var config = { rules: {} };
						config.rules[RULE_ID] = 1;
						validate({buffer: topic, callback: callback, config: config}).then(
							function (problems) {
								assertProblems(problems, []);
							},
							function (error) {
								worker.getTestState().callback(error);
							});
					});
					it("Ignore member expression keys", function(callback) {
						var topic = "i18n.replace(messages['nlsKey'], 'a');";
						var config = { rules: {} };
						config.rules[RULE_ID] = 1;
						validate({buffer: topic, callback: callback, config: config}).then(
							function (problems) {
								assertProblems(problems, [{
									id: RULE_ID,
									severity: 'warning',
									description: "Non-externalized string literal 'a'.",
									nodeType: "Literal"
								}]);
							},
							function (error) {
								worker.getTestState().callback(error);
							});
					});
					it("Ignore non-string literals", function(callback) {
						var topic = "var a = 1; var b = /\"b\"/g;";
						var config = { rules: {} };
						config.rules[RULE_ID] = 1;
						validate({buffer: topic, callback: callback, config: config}).then(
							function (problems) {
								assertProblems(problems, []);
							},
							function (error) {
								worker.getTestState().callback(error);
							});
					});
					it("Ignore 'use strict'", function(callback) {
						var topic = "'use strict';";
						var config = { rules: {} };
						config.rules[RULE_ID] = 1;
						validate({buffer: topic, callback: callback, config: config}).then(
							function (problems) {
								assertProblems(problems, []);
							},
							function (error) {
								worker.getTestState().callback(error);
							});
					});
					it("Ignore binary comparisons", function(callback) {
						var topic = "var i; var a = ((i='b') === 'c');";
						var config = { rules: {} };
						config.rules[RULE_ID] = 1;
						validate({buffer: topic, callback: callback, config: config}).then(
							function (problems) {
								assertProblems(problems, [{
									id: RULE_ID,
									severity: 'warning',
									description: "Non-externalized string literal 'b'.",
									nodeType: "Literal"
								}]);
							},
							function (error) {
								worker.getTestState().callback(error);
							});
					});
					it("Ignore binary comparisons but not concatenate", function(callback) {
						var topic = "var a = ('a' + 'b') === 'c';";
						var config = { rules: {} };
						config.rules[RULE_ID] = 1;
						validate({buffer: topic, callback: callback, config: config}).then(
							function (problems) {
								assertProblems(problems, [{
									id: RULE_ID,
									severity: 'warning',
									description: "Non-externalized string literal 'a'.",
									nodeType: "Literal"
								},
								{
									id: RULE_ID,
									severity: 'warning',
									description: "Non-externalized string literal 'b'.",
									nodeType: "Literal"
								}]);
							},
							function (error) {
								worker.getTestState().callback(error);
							});
					});
					it("Ignore object keys", function(callback) {
						var topic = "var a = {'a':'b'};";
						var config = { rules: {} };
						config.rules[RULE_ID] = 1;
						validate({buffer: topic, callback: callback, config: config}).then(
							function (problems) {
								assertProblems(problems, [{
									id: RULE_ID,
									severity: 'warning',
									description: "Non-externalized string literal 'b'.",
									nodeType: "Literal"
								}]);
							},
							function (error) {
								worker.getTestState().callback(error);
							});
					});
					it("Ignore unary expressions", function(callback) {
						var topic = "var a = typeof 'b';";
						var config = { rules: {} };
						config.rules[RULE_ID] = 1;
						validate({buffer: topic, callback: callback, config: config}).then(
							function (problems) {
								assertProblems(problems, []);
							},
							function (error) {
								worker.getTestState().callback(error);
							});
					});
					it("Allow NON-NLS-0", function(callback) {
						var topic = "var a = \"a\"; var b = \"bb\"; //$NON-NLS-0$ //$NON-NLS-1$";
						var config = { rules: {} };
						config.rules[RULE_ID] = 1;
						validate({buffer: topic, callback: callback, config: config}).then(
							function (problems) {
								assertProblems(problems, [{
									id: RULE_ID,
									severity: 'warning',
									description: "Non-externalized string literal 'bb'.",
									nodeType: "Literal"
								}]);
							},
							function (error) {
								worker.getTestState().callback(error);
							});
					});
					it.skip("Ignore require call expressions", function(callback) {
						var topic = "require('a');";
						var config = { rules: {} };
						config.rules[RULE_ID] = 1;
						validate({buffer: topic, callback: callback, config: config}).then(
							function (problems) {
								assertProblems(problems, []);
							},
							function (error) {
								worker.getTestState().callback(error);
							});
					});
					it("HTML Mark missing", function(callback) {
						var topic = "<script>var a = \"a\"; var b = \"bb\";</script>";
						var config = { rules: {} };
						config.rules[RULE_ID] = 1;
						validate({buffer: topic, contentType: 'text/html', callback: callback, config: config}).then(
							function (problems) {
								assertProblems(problems, [{
									id: RULE_ID,
									severity: 'warning',
									description: "Non-externalized string literal 'a'.",
									nodeType: "Literal"
								},
								{
									id: RULE_ID,
									severity: 'warning',
									description: "Non-externalized string literal 'bb'.",
									nodeType: "Literal"
								}]);
							},
							function (error) {
								worker.getTestState().callback(error);
							});
					});
					it("HTML Mark missing multiple script blocks", function(callback) {
						var topic = "<script>var a = \"a\";</script>\n<script>var b = \"bb\";</script>";
						var config = { rules: {} };
						config.rules[RULE_ID] = 1;
						validate({buffer: topic, contentType: 'text/html', callback: callback, config: config}).then(
							function (problems) {
								assertProblems(problems, [{
									id: RULE_ID,
									severity: 'warning',
									description: "Non-externalized string literal 'a'.",
									nodeType: "Literal"
								},
								{
									id: RULE_ID,
									severity: 'warning',
									description: "Non-externalized string literal 'bb'.",
									nodeType: "Literal"
								}]);
							},
							function (error) {
								worker.getTestState().callback(error);
							});
					});
					it("HTML Mark missing additional lines", function(callback) {
						var topic = "<html>/nTitle here\n<script>var a = \"a\"; var b = \"bb\";</script>\nPost text\n</html>";
						var config = { rules: {} };
						config.rules[RULE_ID] = 1;
						validate({buffer: topic, contentType: 'text/html', callback: callback, config: config}).then(
							function (problems) {
								assertProblems(problems, [{
									id: RULE_ID,
									severity: 'warning',
									description: "Non-externalized string literal 'a'.",
									nodeType: "Literal"
								},
								{
									id: RULE_ID,
									severity: 'warning',
									description: "Non-externalized string literal 'bb'.",
									nodeType: "Literal"
								}]);
							},
							function (error) {
								worker.getTestState().callback(error);
							});
					});
					it("HTML Ignore commented", function(callback) {
						var topic = "<script>var a = 'a'; var b = 'bb'; //$NON-NLS-1$ //$NON-NLS-2$</script>";
						var config = { rules: {} };
						config.rules[RULE_ID] = 1;
						validate({buffer: topic, contentType: 'text/html', callback: callback, config: config}).then(
							function (problems) {
								assertProblems(problems, []);
							},
							function (error) {
								worker.getTestState().callback(error);
							});
					});
					it("HTML Ignore commented additional lines", function(callback) {
						var topic = "<html>\nTitle text\n<script>var a = 'a'; var b = 'bb'; //$NON-NLS-1$ //$NON-NLS-2$</script>\nPost text\n</html>";
						var config = { rules: {} };
						config.rules[RULE_ID] = 1;
						validate({buffer: topic, contentType: 'text/html', callback: callback, config: config}).then(
							function (problems) {
								assertProblems(problems, []);
							},
							function (error) {
								worker.getTestState().callback(error);
							});
					});
					it("HTML Ignore commented multiple script blocks", function(callback) {
						var topic = "<script>var a = 'a';</script><script>var b = 'bb'; //$NON-NLS-1$ //$NON-NLS-2$</script>";
						var config = { rules: {} };
						config.rules[RULE_ID] = 1;
						validate({buffer: topic, contentType: 'text/html', callback: callback, config: config}).then(
							function (problems) {
								assertProblems(problems, []);
							},
							function (error) {
								worker.getTestState().callback(error);
							});
					});
				});
				
				//UNNECESSARY-NLS -------------------------------------------------------
				describe('unnecessary-nls', function() {
					var RULE_ID = "unnecessary-nls";
					// TODO assert.equals prints out odd looking messages when one of the values contains special characters like $
					it("No literals single tag 0", function(callback) {
						var topic = "var a = 1; //$NON-NLS-0$";
						var config = { rules: {} };
						config.rules[RULE_ID] = 1;
						validate({buffer: topic, callback: callback, config: config}).then(
							function (problems) {
								assertProblems(problems, [{
									id: RULE_ID,
									severity: 'warning',
									description: "Unnecessary $NON-NLS$ tag.",
									nlsComment: "$NON-NLS-0$"
								}]);
							},
							function (error) {
								worker.getTestState().callback(error);
							});
					});
					it("No literals single tag 1", function(callback) {
						var topic = "var a = 1; //$NON-NLS-1$";
						var config = { rules: {} };
						config.rules[RULE_ID] = 1;
						validate({buffer: topic, callback: callback, config: config}).then(
							function (problems) {
								assertProblems(problems, [{
									id: RULE_ID,
									severity: 'warning',
									description: "Unnecessary $NON-NLS$ tag.",
									nlsComment: "$NON-NLS-1$"
								}]);
							},
							function (error) {
								worker.getTestState().callback(error);
							});
					});
					it("No literals single tag 2", function(callback) {
						var topic = "var a = 1; //$NON-NLS-2$";
						var config = { rules: {} };
						config.rules[RULE_ID] = 1;
						validate({buffer: topic, callback: callback, config: config}).then(
							function (problems) {
								assertProblems(problems, [{
									id: RULE_ID,
									severity: 'warning',
									description: "Unnecessary $NON-NLS$ tag.",
									nlsComment: "$NON-NLS-2$"
								}]);
							},
							function (error) {
								worker.getTestState().callback(error);
							});
					});
					it("No literals with tags 0,1", function(callback) {
						var topic = "var a = 1; //$NON-NLS-0$ //$NON-NLS-1$";
						var config = { rules: {} };
						config.rules[RULE_ID] = 1;
						validate({buffer: topic, callback: callback, config: config}).then(
							function (problems) {
								assertProblems(problems, [{
									id: RULE_ID,
									severity: 'warning',
									description: "Unnecessary $NON-NLS$ tag.",
									nlsComment: "$NON-NLS-0$"
								},
								{
									id: RULE_ID,
									severity: 'warning',
									description: "Unnecessary $NON-NLS$ tag.",
									nlsComment: "//$NON-NLS-1$"
								
								}]);
							},
							function (error) {
								worker.getTestState().callback(error);
							});
					});
					it("No literals with tags 2,2", function(callback) {
						var topic = "var a = 1; //$NON-NLS-2$ //$NON-NLS-2$";
						var config = { rules: {} };
						config.rules[RULE_ID] = 1;
						validate({buffer: topic, callback: callback, config: config}).then(
							function (problems) {
								assertProblems(problems, [{
									id: RULE_ID,
									severity: 'warning',
									description: "Unnecessary $NON-NLS$ tag.",
									nlsComment: "$NON-NLS-2$"
								},
								{
									id: RULE_ID,
									severity: 'warning',
									description: "Unnecessary $NON-NLS$ tag.",
									nlsComment: "//$NON-NLS-2$"
								
								}]);
							},
							function (error) {
								worker.getTestState().callback(error);
							});
					});
					it("No literals with tags 0,1,2", function(callback) {
						var topic = "var a = 1; //$NON-NLS-0$ //$NON-NLS-1$ //$NON-NLS-2$";
						var config = { rules: {} };
						config.rules[RULE_ID] = 1;
						validate({buffer: topic, callback: callback, config: config}).then(
							function (problems) {
								assertProblems(problems, [{
									id: RULE_ID,
									severity: 'warning',
									description: "Unnecessary $NON-NLS$ tag.",
									nlsComment: "$NON-NLS-0$"
								},
								{
									id: RULE_ID,
									severity: 'warning',
									description: "Unnecessary $NON-NLS$ tag.",
									nlsComment: "//$NON-NLS-1$"
								
								},
								{
									id: RULE_ID,
									severity: 'warning',
									description: "Unnecessary $NON-NLS$ tag.",
									nlsComment: "//$NON-NLS-2$"
								
								}]);
							},
							function (error) {
								worker.getTestState().callback(error);
							});
					});
					it("No literals with tags 2,2,2", function(callback) {
						var topic = "var a = 1; //$NON-NLS-2$ //$NON-NLS-2$ //$NON-NLS-2$";
	
						var config = { rules: {} };
						config.rules[RULE_ID] = 1;
						validate({buffer: topic, callback: callback, config: config}).then(
							function (problems) {
								assertProblems(problems, [{
									id: RULE_ID,
									severity: 'warning',
									description: "Unnecessary $NON-NLS$ tag.",
									nlsComment: "$NON-NLS-2$"
								},
								{
									id: RULE_ID,
									severity: 'warning',
									description: "Unnecessary $NON-NLS$ tag.",
									nlsComment: "//$NON-NLS-2$"
								
								},
								{
									id: RULE_ID,
									severity: 'warning',
									description: "Unnecessary $NON-NLS$ tag.",
									nlsComment: "//$NON-NLS-2$"
								
								}]);
							},
							function (error) {
								worker.getTestState().callback(error);
							});
					});
					it("No literals single tag 0 extra characters", function(callback) {
						var topic = "var a = 1; // foobar //$NON-NLS-0$ foobar";
						var config = { rules: {} };
						config.rules[RULE_ID] = 1;
						validate({buffer: topic, callback: callback, config: config}).then(
							function (problems) {
								assertProblems(problems, [{
									id: RULE_ID,
									severity: 'warning',
									description: "Unnecessary $NON-NLS$ tag.",
									nlsComment: "//$NON-NLS-0$"
								}]);
							},
							function (error) {
								worker.getTestState().callback(error);
							});
					});
					it("No literals and block comment with tags 1,2", function(callback) {
						var topic = "var a = 1; /* NON-NLS-3 */ //$NON-NLS-1$ //$NON-NLS-2$";
						var config = { rules: {} };
						config.rules[RULE_ID] = 1;
						validate({buffer: topic, callback: callback, config: config}).then(
							function (problems) {
								assertProblems(problems, [{
									id: RULE_ID,
									severity: 'warning',
									description: "Unnecessary $NON-NLS$ tag.",
									nlsComment: "$NON-NLS-1$"
								},
								{
									id: RULE_ID,
									severity: 'warning',
									description: "Unnecessary $NON-NLS$ tag.",
									nlsComment: "//$NON-NLS-2$"
								
								}]);
							},
							function (error) {
								worker.getTestState().callback(error);
							});
					});
					
					it("Single literal with tags 1,2", function(callback) {
						var topic = "var a = 'a'; //$NON-NLS-1$ //$NON-NLS-2$";
						var config = { rules: {} };
						config.rules[RULE_ID] = 1;
						validate({buffer: topic, callback: callback, config: config}).then(
							function (problems) {
								assertProblems(problems, [
								{
									id: RULE_ID,
									severity: 'warning',
									description: "Unnecessary $NON-NLS$ tag.",
									nlsComment: "//$NON-NLS-2$"
								
								}]);
							},
							function (error) {
								worker.getTestState().callback(error);
							});
					});
					it("Single literal with tags 2,1", function(callback) {
						var topic = "var a = 'a'; //$NON-NLS-2$ //$NON-NLS-1$";
						var config = { rules: {} };
						config.rules[RULE_ID] = 1;
						validate({buffer: topic, callback: callback, config: config}).then(
							function (problems) {
								assertProblems(problems, [
								{
									id: RULE_ID,
									severity: 'warning',
									description: "Unnecessary $NON-NLS$ tag.",
									nlsComment: "$NON-NLS-2$"
								
								}]);
							},
							function (error) {
								worker.getTestState().callback(error);
							});
					});
					// TODO We currently allow 0 and 1 tags
					it.skip("Single literal with tags 0,1", function(callback) {
						var topic = "var a = 'a'; //$NON-NLS-0$ //$NON-NLS-1$";
						var config = { rules: {} };
						config.rules[RULE_ID] = 1;
						validate({buffer: topic, callback: callback, config: config}).then(
							function (problems) {
								assertProblems(problems, [
								{
									id: RULE_ID,
									severity: 'warning',
									description: "Unnecessary $NON-NLS$ tag.",
									nlsComment: "//$NON-NLS-0$"
								
								}]);
							},
							function (error) {
								worker.getTestState().callback(error);
							});
					});
					it.skip("Single literal with tags 0,0", function(callback) {
						var topic = "var a = 'a'; //$NON-NLS-0$ //$NON-NLS-0$";
						var config = { rules: {} };
						config.rules[RULE_ID] = 1;
						validate({buffer: topic, callback: callback, config: config}).then(
							function (problems) {
								assertProblems(problems, [
								{
									id: RULE_ID,
									severity: 'warning',
									description: "Unnecessary $NON-NLS$ tag.",
									nlsComment: "//$NON-NLS-0$"
								
								}]);
							},
							function (error) {
								worker.getTestState().callback(error);
							});
					});
					it("Single literal and block comment with tags 1,2", function(callback) {
						var topic = "var a = 'a'; /* NON-NLS-3 */ //$NON-NLS-1$ //$NON-NLS-2$";
						var config = { rules: {} };
						config.rules[RULE_ID] = 1;
						validate({buffer: topic, callback: callback, config: config}).then(
							function (problems) {
								assertProblems(problems, [
								{
									id: RULE_ID,
									severity: 'warning',
									description: "Unnecessary $NON-NLS$ tag.",
									nlsComment: "//$NON-NLS-2$"
								
								}]);
							},
							function (error) {
								worker.getTestState().callback(error);
							});
					});
					
					it("Multiple literal with tags 1,2,3,9", function(callback) {
						var topic = "var a = 'a'; var b = 'b'; var c = 'c'; //$NON-NLS-1$ //$NON-NLS-2$ //$NON-NLS-3$ //$NON-NLS-9$";
						var config = { rules: {} };
						config.rules[RULE_ID] = 1;
						validate({buffer: topic, callback: callback, config: config}).then(
							function (problems) {
								assertProblems(problems, [
								{
									id: RULE_ID,
									severity: 'warning',
									description: "Unnecessary $NON-NLS$ tag.",
									nlsComment: "//$NON-NLS-9$"
								
								}]);
							},
							function (error) {
								worker.getTestState().callback(error);
							});
					});
					it("Multiple literal with tags 9,3,2,1", function(callback) {
						var topic = "var a = 'a'; var b = 'b'; var c = 'c'; //$NON-NLS-9$ //$NON-NLS-3$ //$NON-NLS-2$ //$NON-NLS-1$";
						var config = { rules: {} };
						config.rules[RULE_ID] = 1;
						validate({buffer: topic, callback: callback, config: config}).then(
							function (problems) {
								assertProblems(problems, [
								{
									id: RULE_ID,
									severity: 'warning',
									description: "Unnecessary $NON-NLS$ tag.",
									nlsComment: "$NON-NLS-9$"
								
								}]);
							},
							function (error) {
								worker.getTestState().callback(error);
							});
					});
					
					
					it("No literals malformed tag 1", function(callback) {
						var topic = "var a = 1; // $NON-NLS-2$";
						var config = { rules: {} };
						config.rules[RULE_ID] = 1;
						validate({buffer: topic, callback: callback, config: config}).then(
							function (problems) {
								assertProblems(problems, []);
							},
							function (error) {
								worker.getTestState().callback(error);
							});
					});
					it("No literals malformed tag 2", function(callback) {
						var topic = "var a = 1; //$ NON-NLS-2$";
						var config = { rules: {} };
						config.rules[RULE_ID] = 1;
						validate({buffer: topic, callback: callback, config: config}).then(
							function (problems) {
								assertProblems(problems, []);
							},
							function (error) {
								worker.getTestState().callback(error);
							});
					});
					it("No literals malformed tag 3", function(callback) {
						var topic = "var a = 1; //$NON-NLS-A$";
						var config = { rules: {} };
						config.rules[RULE_ID] = 1;
						validate({buffer: topic, callback: callback, config: config}).then(
							function (problems) {
								assertProblems(problems, []);
							},
							function (error) {
								worker.getTestState().callback(error);
							});
					});
					it("Single literal malformed tag 1", function(callback) {
						var topic = "var a = 'a'; // $NON-NLS-2$";
						var config = { rules: {} };
						config.rules[RULE_ID] = 1;
						validate({buffer: topic, callback: callback, config: config}).then(
							function (problems) {
								assertProblems(problems, []);
							},
							function (error) {
								worker.getTestState().callback(error);
							});
					});
					it("Single literal malformed tag 2", function(callback) {
						var topic = "var a = 'a'; //$ NON-NLS-2$";
						var config = { rules: {} };
						config.rules[RULE_ID] = 1;
						validate({buffer: topic, callback: callback, config: config}).then(
							function (problems) {
								assertProblems(problems, []);
							},
							function (error) {
								worker.getTestState().callback(error);
							});
					});
					it("Single literal malformed tag 3", function(callback) {
						var topic = "var a = 'a'; //$NON-NLS-A$";
						var config = { rules: {} };
						config.rules[RULE_ID] = 1;
						validate({buffer: topic, callback: callback, config: config}).then(
							function (problems) {
								assertProblems(problems, []);
							},
							function (error) {
								worker.getTestState().callback(error);
							});
					});
					it("Multiple literal malformed tag 1", function(callback) {
						var topic = "var a = 'a'; var b = 'b'; // $NON-NLS-3$";
						var config = { rules: {} };
						config.rules[RULE_ID] = 1;
						validate({buffer: topic, callback: callback, config: config}).then(
							function (problems) {
								assertProblems(problems, []);
							},
							function (error) {
								worker.getTestState().callback(error);
							});
					});
					it("Multiple literal malformed tag 2", function(callback) {
						var topic = "var a = 'a'; var b = 'b'; //$ NON-NLS-3$";
						var config = { rules: {} };
						config.rules[RULE_ID] = 1;
						validate({buffer: topic, callback: callback, config: config}).then(
							function (problems) {
								assertProblems(problems, []);
							},
							function (error) {
								worker.getTestState().callback(error);
							});
					});
					it("Multiple literal malformed tag 3", function(callback) {
						var topic = "var a = 'a'; var b = 'b'; //$NON-NLS-A$";
						var config = { rules: {} };
						config.rules[RULE_ID] = 1;
						validate({buffer: topic, callback: callback, config: config}).then(
							function (problems) {
								assertProblems(problems, []);
							},
							function (error) {
								worker.getTestState().callback(error);
							});
					});
					it("Ignore commented out code lines 1", function(callback) {
						var topic = "var a = 1; //$NON-NLS-1$";
						var config = { rules: {} };
						config.rules[RULE_ID] = 1;
						validate({buffer: topic, callback: callback, config: config}).then(
							function (problems) {
								assertProblems(problems, [
								{
									id: RULE_ID,
									severity: 'warning',
									description: "Unnecessary $NON-NLS$ tag.",
									nlsComment: "$NON-NLS-1$"
								
								}]);
							},
							function (error) {
								worker.getTestState().callback(error);
							}
						);
					});
					it("Ignore commented out code lines 2", function(callback) {
						var topic = "//var a = 1; //$NON-NLS-1$";
						var config = { rules: {} };
						config.rules[RULE_ID] = 1;
						validate({buffer: topic, callback: callback, config: config}).then(
							function (problems) {
								assertProblems(problems, []);
							},
							function (error) {
								worker.getTestState().callback(error);
							}
						);
					});
					it("Ignore commented out code lines 3", function(callback) {
						var topic = " //var a = 1; //$NON-NLS-1$";
						var config = { rules: {} };
						config.rules[RULE_ID] = 1;
						validate({buffer: topic, callback: callback, config: config}).then(
							function (problems) {
								assertProblems(problems, []);
							},
							function (error) {
								worker.getTestState().callback(error);
							}
						);
					});
					it("Ignore commented out code lines 4", function(callback) {
						var topic = "var b = 2;\n \t\t //var a = 1; //$NON-NLS-1$";
						var config = { rules: {} };
						config.rules[RULE_ID] = 1;
						validate({buffer: topic, callback: callback, config: config}).then(
							function (problems) {
								assertProblems(problems, []);
							},
							function (error) {
								worker.getTestState().callback(error);
							}
						);
					});
					it("Ignore commented out code lines 5", function(callback) {
						var topic = " //    var a = 1;        //$NON-NLS-1$";
						var config = { rules: {} };
						config.rules[RULE_ID] = 1;
						validate({buffer: topic, callback: callback, config: config}).then(
							function (problems) {
								assertProblems(problems, []);
							},
							function (error) {
								worker.getTestState().callback(error);
							}
						);
					});
					it("Ignore commented out code lines 6", function(callback) {
						var topic = " // //$NON-NLS-1$";
						var config = { rules: {} };
						config.rules[RULE_ID] = 1;
						validate({buffer: topic, callback: callback, config: config}).then(
							function (problems) {
								assertProblems(problems, []);
							},
							function (error) {
								worker.getTestState().callback(error);
							}
						);
					});
					it("Ignore commented out code lines 7", function(callback) {
						var topic = " // $NON-NLS-1$";
						var config = { rules: {} };
						config.rules[RULE_ID] = 1;
						validate({buffer: topic, callback: callback, config: config}).then(
							function (problems) {
								assertProblems(problems, []);
							},
							function (error) {
								worker.getTestState().callback(error);
							}
						);
					});
					it("Ignore commented out code lines 8", function(callback) {
						var topic = "//$NON-NLS-1$";
						var config = { rules: {} };
						config.rules[RULE_ID] = 1;
						validate({buffer: topic, callback: callback, config: config}).then(
							function (problems) {
								assertProblems(problems, [
								{
									id: RULE_ID,
									severity: 'warning',
									description: "Unnecessary $NON-NLS$ tag.",
									nlsComment: "$NON-NLS-1$"
								
								}]);
							},
							function (error) {
								worker.getTestState().callback(error);
							}
						);
					});
					it("Ignore commented out code lines 9", function(callback) {
						var topic = " \t \t//$NON-NLS-1$";
						var config = { rules: {} };
						config.rules[RULE_ID] = 1;
						validate({buffer: topic, callback: callback, config: config}).then(
							function (problems) {
								assertProblems(problems, [
								{
									id: RULE_ID,
									severity: 'warning',
									description: "Unnecessary $NON-NLS$ tag.",
									nlsComment: "$NON-NLS-1$"
								
								}]);
							},
							function (error) {
								worker.getTestState().callback(error);
							}
						);
					});
					it("Ignore commented out code lines 10 - HTML", function(callback) {
						var topic = "<html>\n<script>\n//var a = 1; //$NON-NLS-1$\n</script>\n</html>";
						var config = { rules: {} };
						config.rules[RULE_ID] = 1;
						validate({buffer: topic, contentType: 'text/html', callback: callback, config: config}).then(
							function (problems) {
								assertProblems(problems, []);
							},
							function (error) {
								worker.getTestState().callback(error);
							}
						);
					});
					it("Ignore commented out code lines 11", function(callback) {
						var topic = "<html>\n<script>\n//$NON-NLS-1$\n</script>\n</html>";
						var config = { rules: {} };
						config.rules[RULE_ID] = 1;
						validate({buffer: topic, contentType: 'text/html', callback: callback, config: config}).then(
							function (problems) {
								assertProblems(problems, [
								{
									id: RULE_ID,
									severity: 'warning',
									description: "Unnecessary $NON-NLS$ tag.",
									nlsComment: "$NON-NLS-1$"
								
								}]);
							},
							function (error) {
								worker.getTestState().callback(error);
							}
						);
					});
				});
			
				//NO-REDECLARE -------------------------------------------------------
				describe('no-redeclare', function() {
					var RULE_ID = "no-redeclare";
					/**
					 *@see https://bugs.eclipse.org/bugs/show_bug.cgi?id=474838
					 * @since 10.0
					 */
					this.timeout(1000000);
					it("should flag redeclaration in closure 1", function(callback) {
						var topic = "(function fizz() {var a, a;});";
						var config = { rules: {} };
						config.rules[RULE_ID] = 1;
						validate({buffer: topic, callback: callback, config: config}).then(
							function (problems) {
								assertProblems(problems, [
								{
									id: RULE_ID,
									severity: 'warning',
									description: "'a' is already defined.",
									nodeType: "Identifier"
								}]);
							},
							function (error) {
								worker.getTestState().callback(error);
							});
					});
					/**
					 *@see https://bugs.eclipse.org/bugs/show_bug.cgi?id=474838
					 * @since 10.0
					 */
					it("should flag redeclaration in closure 2", function(callback) {
						var topic = "var _ = function fizz2() {var a, a;};";
						var config = { rules: {} };
						config.rules[RULE_ID] = 1;
						validate({buffer: topic, callback: callback, config: config}).then(
							function (problems) {
								assertProblems(problems, [
								{
									id: RULE_ID,
									severity: 'warning',
									description: "'a' is already defined.",
									nodeType: "Identifier"
								}]);
							},
							function (error) {
								worker.getTestState().callback(error);
							});
					});
					/**
					 *@see https://bugs.eclipse.org/bugs/show_bug.cgi?id=474838
					 * @since 10.0
					 */
					it("should flag redeclaration in closure 3", function(callback) {
						var topic = "(function fizz3() {	var a, a;}());";
						var config = { rules: {} };
						config.rules[RULE_ID] = 1;
						validate({buffer: topic, callback: callback, config: config}).then(
							function (problems) {
								assertProblems(problems, [
								{
									id: RULE_ID,
									severity: 'warning',
									description: "'a' is already defined.",
									nodeType: "Identifier"
								}]);
							},
							function (error) {
								worker.getTestState().callback(error);
							});
					});
					it("should flag redeclaration in Program", function(callback) {
						var topic = "var a; var a;";
						var config = { rules: {} };
						config.rules[RULE_ID] = 1;
						validate({buffer: topic, callback: callback, config: config}).then(
							function (problems) {
								assertProblems(problems, [
								{
									id: RULE_ID,
									severity: 'warning',
									description: "'a' is already defined.",
									nodeType: "Identifier"
								}]);
							},
							function (error) {
								worker.getTestState().callback(error);
							});
					});
					it("should flag redeclaration in FunctionDeclaration", function(callback) {
						var topic = "function f() { var g, g; }";
						var config = { rules: {} };
						config.rules[RULE_ID] = 1;
						validate({buffer: topic, callback: callback, config: config}).then(
							function (problems) {
								assertProblems(problems, [
								{
									id: RULE_ID,
									severity: 'warning',
									description: "'g' is already defined.",
									nodeType: "Identifier"
								}]);
							},
							function (error) {
								worker.getTestState().callback(error);
							});
					});
					it("should flag redeclaration in FunctionExpression", function(callback) {
						var topic = "var f = function() { var g, g; };";
						var config = { rules: {} };
						config.rules[RULE_ID] = 1;
						validate({buffer: topic, callback: callback, config: config}).then(
							function (problems) {
								assertProblems(problems, [
								{
									id: RULE_ID,
									severity: 'warning',
									description: "'g' is already defined.",
									nodeType: "Identifier"
								}]);
							},
							function (error) {
								worker.getTestState().callback(error);
							});
					});
			
					it("should flag redeclaration in ArrowFunctionExpression 1", function(callback) {
						var topic = "() => {var a; function f(){} var a;}";
						var config = { rules: {} };
						config.rules[RULE_ID] = 1;
						validate({buffer: topic, callback: callback, config: config}).then(
							function (problems) {
								assertProblems(problems, [
								{
									id: RULE_ID,
									severity: 'warning',
									description: "'a' is already defined.",
									nodeType: "Identifier"
								}]);
							},
							function (error) {
								worker.getTestState().callback(error);
							});
					});
			
					it("should flag redeclaration in ArrowFunctionExpression 2", function(callback) {
						var topic = "a.map(() => {var a; function f(){} var a;})";
						var config = { rules: {} };
						config.rules[RULE_ID] = 1;
						validate({buffer: topic, callback: callback, config: config}).then(
							function (problems) {
								assertProblems(problems, [
								{
									id: RULE_ID,
									severity: 'warning',
									description: "'a' is already defined.",
									nodeType: "Identifier"
								}]);
							},
							function (error) {
								worker.getTestState().callback(error);
							});
					});
			
					it("should flag redeclaration in ArrowFunctionExpression 3", function(callback) {
						var topic = "a.map(() => { function f(){var a;var a;} })";
						var config = { rules: {} };
						config.rules[RULE_ID] = 1;
						validate({buffer: topic, callback: callback, config: config}).then(
							function (problems) {
								assertProblems(problems, [
								{
									id: RULE_ID,
									severity: 'warning',
									description: "'a' is already defined.",
									nodeType: "Identifier"
								}]);
							},
							function (error) {
								worker.getTestState().callback(error);
							});
					});
			
					it("should identify the range of the redeclaration", function(callback) {
						var topic = "(function() { var a, b; var a; })";
						var config = { rules: {} };
						config.rules[RULE_ID] = 1;
						validate({buffer: topic, callback: callback, config: config}).then(
							function (problems) {
								assertProblems(problems, [
								{
									id: RULE_ID,
									severity: 'warning',
									description: "'a' is already defined.",
									nodeType: "Identifier",
									start: 28
								}]);
							},
							function (error) {
								worker.getTestState().callback(error);
							});
					});
			
					describe('params', function() {
						it("should flag redeclaration of param", function(callback) {
							var topic = "function f(a) { var a; }";
							var config = { rules: {} };
							config.rules[RULE_ID] = 1;
							validate({buffer: topic, callback: callback, config: config}).then(
								function (problems) {
									assertProblems(problems, [
									{
										id: RULE_ID,
										severity: 'warning',
										description: "'a' is already defined.",
										nodeType: "Identifier"
									}]);
								},
								function (error) {
									worker.getTestState().callback(error);
								});
						});
					});
			
					it("should not flag reassignment", function(callback) {
						var topic = "var a = 2, b; a = b = 3; ";
			
						var config = { rules: {} };
						config.rules[RULE_ID] = 1;
						validate({buffer: topic, callback: callback, config: config}).then(
							function (problems) {
								assertProblems(problems, []);
							},
							function (error) {
								worker.getTestState().callback(error);
							});
					});
					it("should not flag assignment to upper scope var", function(callback) {
						var topic = "var a; function f() { a = 1; }";
						var config = { rules: {} };
						config.rules[RULE_ID] = 1;
						validate({buffer: topic, callback: callback, config: config}).then(
							function (problems) {
								assertProblems(problems, []);
							},
							function (error) {
								worker.getTestState().callback(error);
							});
					});
				});
				//NO-REGEX-SPACES --------------------------------------------------
				describe('no-regex-spaces', function() {
					var RULE_ID = "no-regex-spaces";
					it("should flag more than one space in regex literal", function(callback) {
						var topic = "var regex = /   .*/g;";
	
						var config = { rules: {} };
						config.rules[RULE_ID] = 1;
						validate({buffer: topic, callback: callback, config: config}).then(
							function (problems) {
								assertProblems(problems, [
								{
									id: RULE_ID,
									severity: 'warning',
									description: "Avoid multiple spaces in regular expressions. Use ' {3}' instead.",
									nodeType: "Literal"
								}]);
							},
							function (error) {
								worker.getTestState().callback(error);
							});
					});
					it("should flag more than one group of more than one space in regex literal", function(callback) {
						var topic = "var regex = /   .*  /g;";
	
						var config = { rules: {} };
						config.rules[RULE_ID] = 1;
						validate({buffer: topic, callback: callback, config: config}).then(
							function (problems) {
								assertProblems(problems, [
								{
									id: RULE_ID,
									severity: 'warning',
									description: "Avoid multiple spaces in regular expressions. Use ' {3}' instead.",
									nodeType: "Literal"
								},
								{}]);
							},
							function (error) {
								worker.getTestState().callback(error);
							});
					});
					it("should flag more than one space in RegExp new expression literal", function(callback) {
						 var topic = "var regex = new RegExp(\"   .*\");";
	
						var config = { rules: {} };
						config.rules[RULE_ID] = 1;
						validate({buffer: topic, callback: callback, config: config}).then(
							function (problems) {
								assertProblems(problems, [
								{
									id: RULE_ID,
									severity: 'warning',
									description: "Avoid multiple spaces in regular expressions. Use ' {3}' instead.",
									nodeType: "Literal"
								}]);
							},
							function (error) {
								worker.getTestState().callback(error);
							});
					});
					it("should flag more than one group of more than one space in RegExp new expression literal", function(callback) {
						var topic = "var regex = new RegExp(\"   .*  \");";
	
						var config = { rules: {} };
						config.rules[RULE_ID] = 1;
						validate({buffer: topic, callback: callback, config: config}).then(
							function (problems) {
								assertProblems(problems, [
								{
									id: RULE_ID,
									severity: 'warning',
									description: "Avoid multiple spaces in regular expressions. Use ' {3}' instead.",
									nodeType: "Literal"
								},
								{}]);
							},
							function (error) {
								worker.getTestState().callback(error);
							});
					});
					it("should not flag one space in regex literal", function(callback) {
						var topic = "var regex = / .*/g;";
						var config = { rules: {} };
						config.rules[RULE_ID] = 1;
						validate({buffer: topic, callback: callback, config: config}).then(
							function (problems) {
								assertProblems(problems, []);
							},
							function (error) {
								worker.getTestState().callback(error);
							});
					});
					it("should not flag more than one group of one space in regex literal", function(callback) {
						var topic = "var regex = / .* /g;";
						var config = { rules: {} };
						config.rules[RULE_ID] = 1;
						validate({buffer: topic, callback: callback, config: config}).then(
							function (problems) {
								assertProblems(problems, []);
							},
							function (error) {
								worker.getTestState().callback(error);
							});
					});
					it("should not flag one space in regex literal using brace notation", function(callback) {
						var topic = "var regex = / {3}.*/g;";
						var config = { rules: {} };
						config.rules[RULE_ID] = 1;
						validate({buffer: topic, callback: callback, config: config}).then(
							function (problems) {
								assertProblems(problems, []);
							},
							function (error) {
								worker.getTestState().callback(error);
							});
					});
					it("should not flag one space in RegExp new expression literal", function(callback) {
						var topic = "var regex = new RegExp(\" .*\");";
						var config = { rules: {} };
						config.rules[RULE_ID] = 1;
						validate({buffer: topic, callback: callback, config: config}).then(
							function (problems) {
								assertProblems(problems, []);
							},
							function (error) {
								worker.getTestState().callback(error);
							});
					});
					it("should not flag more than one group of one space in RegExp new expression literal", function(callback) {
						var topic = "var regex = new RegExp(\" .* \");";
						var config = { rules: {} };
						config.rules[RULE_ID] = 1;
						validate({buffer: topic, callback: callback, config: config}).then(
							function (problems) {
								assertProblems(problems, []);
							},
							function (error) {
								worker.getTestState().callback(error);
							});
					});
					it("should not flag one space in RegExp new expression literal using brace notation", function(callback) {
						var topic = "var regex = new RegExp(\" {3}.*\");";
						var config = { rules: {} };
						config.rules[RULE_ID] = 1;
						validate({buffer: topic, callback: callback, config: config}).then(
							function (problems) {
								assertProblems(problems, []);
							},
							function (error) {
								worker.getTestState().callback(error);
							});
					});
				});
				//NO-RESERVED-KEYS -------------------------------------------------
				describe('no-reserved-keys', function() {
					var RULE_ID = "no-reserved-keys";
					it("should flag using public keyword", function(callback) {
						var topic = "var a = {public:1}";
						var config = { rules: {} };
						config.rules[RULE_ID] = 1;
						validate({buffer: topic, callback: callback, config: config}).then(
							function (problems) {
								assertProblems(problems, [
								{
									id: RULE_ID,
									severity: 'warning',
									description:  "Reserved words should not be used as property keys.",
									nodeType: "Identifier"
								}]);
							},
							function (error) {
								worker.getTestState().callback(error);
							});
					});
					it("should flag using function keyword", function(callback) {
						var topic = "var a = {function:1}";
						var config = { rules: {} };
						config.rules[RULE_ID] = 1;
						validate({buffer: topic, callback: callback, config: config}).then(
							function (problems) {
								assertProblems(problems, [
								{
									id: RULE_ID,
									severity: 'warning',
									description:  "Reserved words should not be used as property keys.",
									nodeType: "Identifier"
								}]);
							},
							function (error) {
								worker.getTestState().callback(error);
							});
					});
					it("should flag using for keyword", function(callback) {
						var topic = "var a = {for:1}";
			
						var config = { rules: {} };
						config.rules[RULE_ID] = 1;
						validate({buffer: topic, callback: callback, config: config}).then(
							function (problems) {
								assertProblems(problems, [
								{
									id: RULE_ID,
									severity: 'warning',
									description: "Reserved words should not be used as property keys.",
									nodeType: "Identifier"
								}]);
							},
							function (error) {
								worker.getTestState().callback(error);
							});
						});
						it("should not flag using public keyword literal", function(callback) {
							var topic = "var a = {'public':1}";
							var config = { rules: {} };
							config.rules[RULE_ID] = 1;
							validate({buffer: topic, callback: callback, config: config}).then(
								function (problems) {
									assertProblems(problems, []);
								},
								function (error) {
									worker.getTestState().callback(error);
								});
						});
						it("should not flag using function keyword literal", function(callback) {
							var topic = "var a = {'function':1}";
							var config = { rules: {} };
							config.rules[RULE_ID] = 1;
							validate({buffer: topic, callback: callback, config: config}).then(
								function (problems) {
									assertProblems(problems, []);
								},
								function (error) {
									worker.getTestState().callback(error);
								});
						});
						it("should not flag using for keyword literal", function(callback) {
							var topic = "var a = {'for':1}";
							var config = { rules: {} };
							config.rules[RULE_ID] = 1;
							validate({buffer: topic, callback: callback, config: config}).then(
								function (problems) {
									assertProblems(problems, []);
								},
								function (error) {
									worker.getTestState().callback(error);
								});
						});
					});
					//NO-SHADOW --------------------------------------------------------
					describe('no-shadow', function() {
						var RULE_ID = "no-shadow";
						it("should flag shadowing in ArrowFunctionExpression 1", function(callback) {
							var topic = "var foo; a.map(s => {var foo;});";
							var config = { rules: {} };
							config.rules[RULE_ID] = 1;
							validate({buffer: topic, callback: callback, config: config}).then(
								function (problems) {
									assertProblems(problems, [
									{
										id: RULE_ID,
										severity: 'warning',
										description: "'foo' is already declared in the upper scope.",
										nodeType: "Identifier"
									}]);
								},
								function (error) {
									worker.getTestState().callback(error);
								});
							});
						it("should flag shadowing in ArrowFunctionExpression 2", function(callback) {
							var topic = "var foo; () => {var foo;};";
							var config = { rules: {} };
							config.rules[RULE_ID] = 1;
							validate({buffer: topic, callback: callback, config: config}).then(
								function (problems) {
									assertProblems(problems, [
									{
										id: RULE_ID,
										severity: 'warning',
										description: "'foo' is already declared in the upper scope.",
										nodeType: "Identifier"
									}]);
								},
								function (error) {
									worker.getTestState().callback(error);
								});
						});
						it("should flag shadowing in ArrowFunctionExpression 3", function(callback) {
							var topic = "var fives; nums.forEach(v => { if (v % 5 === 0) { fives.push(v);} else {v = function() {var fives;}}});";
							var config = { rules: {} };
							config.rules[RULE_ID] = 1;
							validate({buffer: topic, callback: callback, config: config}).then(
								function (problems) {
									assertProblems(problems, [
									{
										id: RULE_ID,
										severity: 'warning',
										description: "'fives' is already declared in the upper scope.",
										nodeType: "Identifier"
									}]);
								},
								function (error) {
									worker.getTestState().callback(error);
								});
						});
						it("should flag shadowing in FunctionExpression", function(callback) {
							var topic = "var a; (function() { var a; } ());";
							var config = { rules: {} };
							config.rules[RULE_ID] = 1;
							validate({buffer: topic, callback: callback, config: config}).then(
								function (problems) {
									assertProblems(problems, [
									{
										id: RULE_ID,
										severity: 'warning',
										description: "'a' is already declared in the upper scope.",
										nodeType: "Identifier"
									}]);
								},
								function (error) {
									worker.getTestState().callback(error);
								});
						});
						it("should flag shadowing in FunctionDeclaration", function(callback) {
							var topic = "var a; function z() { var a; }";
							var config = { rules: {} };
							config.rules[RULE_ID] = 1;
							validate({buffer: topic, callback: callback, config: config}).then(
								function (problems) {
									assertProblems(problems, [
									{
										id: RULE_ID,
										severity: 'warning',
										description: "'a' is already declared in the upper scope.",
										nodeType: "Identifier"
									}]);
								},
								function (error) {
									worker.getTestState().callback(error);
								});
						});
						it("should flag the shadower's range", function(callback) {
							var topic = "var a; (function() { var a; } ());";
							var config = { rules: {} };
							config.rules[RULE_ID] = 1;
							validate({buffer: topic, callback: callback, config: config}).then(
								function (problems) {
									assertProblems(problems, [
									{
										id: RULE_ID,
										severity: 'warning',
										description: "'a' is already declared in the upper scope.",
										nodeType: "Identifier",
										start: 25
									}]);
								},
								function (error) {
									worker.getTestState().callback(error);
								});
						});
						it("should flag variable shadowing named function from an upper scope", function(callback) {
							var topic = "function f() { function g() { var f; } }";
							var config = { rules: {} };
							config.rules[RULE_ID] = 1;
							validate({buffer: topic, callback: callback, config: config}).then(
								function (problems) {
									assertProblems(problems, [
									{
										id: RULE_ID,
										severity: 'warning',
										description: "'f' is already declared in the upper scope.",
										nodeType: "Identifier",
										start: 34,
										end: 35
									}]);
								},
								function (error) {
									worker.getTestState().callback(error);
								});
						});
						it("should flag named func shadowing named func", function(callback) {
							var topic = "function f() { function f() {} }";
							var config = { rules: {} };
							config.rules[RULE_ID] = 1;
							validate({buffer: topic, callback: callback, config: config}).then(
								function (problems) {
									assertProblems(problems, [
									{
										id: RULE_ID,
										severity: 'warning',
										description: "'f' is already declared in the upper scope.",
										nodeType: "Identifier",
										start: 24
									}]);
								},
								function (error) {
									worker.getTestState().callback(error);
								});
						});
						it("shadowee is FunctionExpression", function(callback) {
							var topic = "(function() { var a; function z() {var a;} })";
							var config = { rules: {} };
							config.rules[RULE_ID] = 1;
							validate({buffer: topic, callback: callback, config: config}).then(
								function (problems) {
									assertProblems(problems, [
									{
										id: RULE_ID,
										severity: 'warning',
										description: "'a' is already declared in the upper scope.",
										nodeType: "Identifier"
									}]);
								},
								function (error) {
									worker.getTestState().callback(error);
								});
						});
						it("shadowee is FunctionDeclaration", function(callback) {
							var topic = "function f() {var a; function z() {var a;} }";
							var config = { rules: {} };
							config.rules[RULE_ID] = 1;
							validate({buffer: topic, callback: callback, config: config}).then(
								function (problems) {
									assertProblems(problems, [
									{
										id: RULE_ID,
										severity: 'warning',
										description: "'a' is already declared in the upper scope.",
										nodeType: "Identifier"
									}]);
								},
								function (error) {
									worker.getTestState().callback(error);
								});
						});
						it("should flag var shadowing a param", function(callback) {
							var topic = "function f(a) { function g() { var a; } }";
							var config = { rules: {} };
							config.rules[RULE_ID] = 1;
							validate({buffer: topic, callback: callback, config: config}).then(
								function (problems) {
									assertProblems(problems, [
									{
										id: RULE_ID,
										severity: 'warning',
										description: "'a' is already declared in the upper scope.",
										nodeType: "Identifier"
									}]);
								},
								function (error) {
									worker.getTestState().callback(error);
								});
						});
						it("should not flag param shadowing outer scope var", function(callback) {
							var topic = "var a; function b(a) {}";
							var config = { rules: {} };
							config.rules[RULE_ID] = 1;
							validate({buffer: topic, callback: callback, config: config}).then(
								function (problems) {
									assertProblems(problems, []);
								},
								function (error) {
									worker.getTestState().callback(error);
								});
						});
						it("should not flag param shadowing shadows outer scope named func", function(callback) {
							var topic = "function f() {} function g(f) {}";
							var config = { rules: {} };
							config.rules[RULE_ID] = 1;
							validate({buffer: topic, callback: callback, config: config}).then(
								function (problems) {
									assertProblems(problems, []);
								},
								function (error) {
									worker.getTestState().callback(error);
								});
						});
						it("should not flag param that shadows outer scope variable", function(callback) {
							var topic = "var a; function f(a) {}";
							var config = { rules: {} };
							config.rules[RULE_ID] = 1;
							validate({buffer: topic, callback: callback, config: config}).then(
								function (problems) {
									assertProblems(problems, []);
								},
								function (error) {
									worker.getTestState().callback(error);
								});
						});
					});
					//NO-SHADOW-GLOBAL ------------------------------------------------
					describe('no-shadow-global', function() {
						var RULE_ID = 'no-shadow-global';
						/**
						 * @since 10.0
						 * @see https://bugs.eclipse.org/bugs/show_bug.cgi?id=460728
						 */
						it("should flag browser use ArrowExpression 1", function(callback) {
							var topic = "/* eslint-env browser*/a.map(name => {var w = 10;});";
							var config = { rules: {} };
							config.rules[RULE_ID] = 1;
							validate({buffer: topic, callback: callback, config: config}).then(
								function (problems) {
									assertProblems(problems, [
									{
										id: 'no-shadow-global-param',
										severity: 'warning',
										description: "Parameter 'name' shadows a global member."
									}]);
								},
								function (error) {
									worker.getTestState().callback(error);
								});
						});
						/**
						 * @since 10.0
						 * @see https://bugs.eclipse.org/bugs/show_bug.cgi?id=460728
						 */
						it("should flag browser use ArrowExpression 2", function(callback) {
							var topic = "/* eslint-env browser*/() => name => {var w = 10;};";
							var config = { rules: {} };
							config.rules[RULE_ID] = 1;
							validate({buffer: topic, callback: callback, config: config}).then(
								function (problems) {
									assertProblems(problems, [
									{
										id: 'no-shadow-global-param',
										severity: 'warning',
										description: "Parameter 'name' shadows a global member."
									}]);
								},
								function (error) {
									worker.getTestState().callback(error);
								});
						});
						it("should flag browser use 1", function(callback) {
							var topic = "/*eslint-env browser*/ var name = 'me';";
							var config = { rules: {} };
							config.rules[RULE_ID] = 1;
							validate({buffer: topic, callback: callback, config: config}).then(
								function (problems) {
									assertProblems(problems, [
									{
										id: 'no-shadow-global-param',
										severity: 'warning',
										description: "Variable 'name' shadows a global member."
									}]);
								},
								function (error) {
									worker.getTestState().callback(error);
								});
						});
						it("should flag browser use 2", function(callback) {
							var topic = "/*eslint-env browser*/ function f(name){}";
							var config = { rules: {} };
							config.rules[RULE_ID] = 1;
							validate({buffer: topic, callback: callback, config: config}).then(
								function (problems) {
									assertProblems(problems, [
									{
										id: 'no-shadow-global-param',
										severity: 'warning',
										description: "Parameter 'name' shadows a global member."
									}]);
								},
								function (error) {
									worker.getTestState().callback(error);
								});
						});
						/**
						 * @since 10.0
						 * @see https://bugs.eclipse.org/bugs/show_bug.cgi?id=460728
						 */
						it("should flag node use ArrowExpression 1", function(callback) {
							var topic = "/*eslint-env node*/() => require => {};";
							var config = { rules: {} };
							config.rules[RULE_ID] = 1;
							validate({buffer: topic, callback: callback, config: config}).then(
								function (problems) {
									assertProblems(problems, [
									{
										id: 'no-shadow-global-param',
										severity: 'warning',
										description: "Parameter 'require' shadows a global member."
									}]);
								},
								function (error) {
									worker.getTestState().callback(error);
								});
						});
						/**
						 * @since 10.0
						 * @see https://bugs.eclipse.org/bugs/show_bug.cgi?id=460728
						 */
						it("should flag node use ArrowExpression 2", function(callback) {
							var topic = "/*eslint-env node*/a.map(require => {});";
							var config = { rules: {} };
							config.rules[RULE_ID] = 1;
							validate({buffer: topic, callback: callback, config: config}).then(
								function (problems) {
									assertProblems(problems, [
									{
										id: RULE_ID,
										severity: 'warning',
										description: "Parameter 'require' shadows a global member."
									}]);
								},
								function (error) {
									worker.getTestState().callback(error);
								});
						});
						it("should flag node use 1", function(callback) {
							var topic = "/*eslint-env node*/ var require = {};";
							var config = { rules: {} };
							config.rules[RULE_ID] = 1;
							validate({buffer: topic, callback: callback, config: config}).then(
								function (problems) {
									assertProblems(problems, [
									{
										id: 'no-shadow-global-param',
										severity: 'warning',
										description: "Variable 'require' shadows a global member."
									}]);
								},
								function (error) {
									worker.getTestState().callback(error);
								});
						});
						it("should flag node use 2", function(callback) {
							var topic = "/*eslint-env node*/ function f(module){}";
							var config = { rules: {} };
							config.rules[RULE_ID] = 1;
							validate({buffer: topic, callback: callback, config: config}).then(
								function (problems) {
									assertProblems(problems, [
									{
										id: 'no-shadow-global-param',
										severity: 'warning',
										description: "Parameter 'module' shadows a global member."
									}]);
								},
								function (error) {
									worker.getTestState().callback(error);
								});
						});
						/**
						 * @since 10.0
						 * @see https://bugs.eclipse.org/bugs/show_bug.cgi?id=460728
						 */
						it("should flag builtins use ArrowFunctionExpression 1", function(callback) {
							var topic = "() => Math => {}";
							var config = { rules: {} };
							config.rules[RULE_ID] = 1;
							validate({buffer: topic, callback: callback, config: config}).then(
								function (problems) {
									assertProblems(problems, [
									{
										id: RULE_ID,
										severity: 'warning',
										description: "Parameter 'Math' shadows a global member."
									}]);
								},
								function (error) {
									worker.getTestState().callback(error);
								});
						});
						/**
						 * @since 10.0
						 * @see https://bugs.eclipse.org/bugs/show_bug.cgi?id=460728
						 */
						it("should flag builtins use ArrowFunctionExpression 2", function(callback) {
							var topic = "a.map(Math => {});";
							var config = { rules: {} };
							config.rules[RULE_ID] = 1;
							validate({buffer: topic, callback: callback, config: config}).then(
								function (problems) {
									assertProblems(problems, [
									{
										id: RULE_ID,
										severity: 'warning',
										description: "Parameter 'Math' shadows a global member."
									}]);
								},
								function (error) {
									worker.getTestState().callback(error);
								});
						});
						/**
						 * @see https://bugs.eclipse.org/bugs/show_bug.cgi?id=461321
						 */
						it("should flag builtins use 1", function(callback) {
							var topic = "function f(Math){}";
							var config = { rules: {} };
							config.rules[RULE_ID] = 1;
							validate({buffer: topic, callback: callback, config: config}).then(
								function (problems) {
									assertProblems(problems, [
									{
										id: 'no-shadow-global-param',
										severity: 'warning',
										description: "Parameter 'Math' shadows a global member."
									}]);
								},
								function (error) {
									worker.getTestState().callback(error);
								});
						});
						/**
						 * @see https://bugs.eclipse.org/bugs/show_bug.cgi?id=461321
						 */
						it("should flag builtins use 2", function(callback) {
			 				var topic = "var Object;";
							var config = { rules: {} };
							config.rules[RULE_ID] = 1;
							validate({buffer: topic, callback: callback, config: config}).then(
								function (problems) {
									assertProblems(problems, [
									{
										id: RULE_ID,
										severity: 'warning',
										description: "Variable 'Object' shadows a global member."
									}]);
								},
								function (error) {
									worker.getTestState().callback(error);
								});
						});
						it("should not flag browser use wih no env set 1", function(callback) {
							var topic = "var name = 'me';";
							var config = { rules: {} };
							config.rules[RULE_ID] = 1;
							validate({buffer: topic, callback: callback, config: config}).then(
								function (problems) {
									assertProblems(problems, []);
								},
								function (error) {
									worker.getTestState().callback(error);
								});
						});
						it("should not flag browser use with no env set 2", function(callback) {
							var topic = "function f(name){}";
							var config = { rules: {} };
							config.rules[RULE_ID] = 1;
							validate({buffer: topic, callback: callback, config: config}).then(
								function (problems) {
									assertProblems(problems, []);
								},
								function (error) {
									worker.getTestState().callback(error);
								});
						});
						it("should not flag node use without env set 1", function(callback) {
							var topic = "var require = {};";
							var config = { rules: {} };
							config.rules[RULE_ID] = 1;
							validate({buffer: topic, callback: callback, config: config}).then(
								function (problems) {
									assertProblems(problems, []);
								},
								function (error) {
									worker.getTestState().callback(error);
								});
						});
						it("should not flag browser use without env set 2", function(callback) {
							var topic = "function f(console){}";
							var config = { rules: {} };
							config.rules[RULE_ID] = 1;
							validate({buffer: topic, callback: callback, config: config}).then(
								function (problems) {
									assertProblems(problems, []);
								},
								function (error) {
									worker.getTestState().callback(error);
								});
						});
					});
					//NO-SPARSE-ARRAYS ------------------------------------------------
					describe('no-sparse-arrays', function() {
						var RULE_ID = "no-sparse-arrays";
						it("should flag proceeding comma", function(callback) {
							var topic = "var answer = [,1]";
							var config = { rules: {} };
							config.rules[RULE_ID] = 1;
							validate({buffer: topic, callback: callback, config: config}).then(
								function (problems) {
									assertProblems(problems, [
									{
										id: RULE_ID,
										severity: 'warning',
										description: "Sparse array declarations should be avoided."
									}]);
								},
								function (error) {
									worker.getTestState().callback(error);
								});
						});
						it("should not flag trailing comma", function(callback) {
							var topic = "var answer = [1,]";
							var config = { rules: {} };
							config.rules[RULE_ID] = 1;
							validate({buffer: topic, callback: callback, config: config}).then(
								function (problems) {
									assertProblems(problems, []);
								},
								function (error) {
									worker.getTestState().callback(error);
								});
						});
						it("should flag middle comma", function(callback) {
							var topic = "var answer = [1,,2]";
							var config = { rules: {} };
							config.rules[RULE_ID] = 1;
							validate({buffer: topic, callback: callback, config: config}).then(
								function (problems) {
									assertProblems(problems, [
									{
										id: RULE_ID,
										severity: 'warning',
										description: "Sparse array declarations should be avoided."
									}]);
								},
								function (error) {
									worker.getTestState().callback(error);
								});
						});
					});
			
					//NO-THROW-LITERAL ---------------------------------------------------------
					describe('no-throw-literal', function() {
						var RULE_ID = "no-throw-literal";
						it("flag thrown Literal", function(callback) {
							var topic = "throw 'a'";
							var config = { rules: {} };
							config.rules[RULE_ID] = 1;
							validate({buffer: topic, callback: callback, config: config}).then(
								function (problems) {
									assertProblems(problems, [
									{
										id: RULE_ID,
										severity: 'warning',
										nodeType: "Literal"
									}]);
								},
								function (error) {
									worker.getTestState().callback(error);
								});
						});
						it("flag thrown ObjectExpression", function(callback) {
							var topic = "throw {};";
							var config = { rules: {} };
							config.rules[RULE_ID] = 1;
							validate({buffer: topic, callback: callback, config: config}).then(
								function (problems) {
									assertProblems(problems, [
									{
										id: RULE_ID,
										severity: 'warning',
										nodeType: "ObjectExpression"
									}]);
								},
								function (error) {
									worker.getTestState().callback(error);
								});
						});
						it("flag thrown ArrayExpression", function(callback) {
							var topic = "throw [];";
							var config = { rules: {} };
							config.rules[RULE_ID] = 1;
							validate({buffer: topic, callback: callback, config: config}).then(
								function (problems) {
									assertProblems(problems, [
									{
										id: RULE_ID,
										severity: 'warning',
										nodeType: "ArrayExpression"
									}]);
								},
								function (error) {
									worker.getTestState().callback(error);
								});
						});
						it("flag thrown 'undefined'", function(callback) {
							var topic = "throw undefined;";
							var config = { rules: {} };
							config.rules[RULE_ID] = 1;
							validate({buffer: topic, callback: callback, config: config}).then(
								function (problems) {
									assertProblems(problems, [
									{
										id: RULE_ID,
										severity: 'warning',
										nodeType: "Identifier",
										start: 6,
										end: 15
									}]);
								},
								function (error) {
									worker.getTestState().callback(error);
								});
						});
						it("flag thrown 'null'", function(callback) {
							var topic = "throw null;";
							var config = { rules: {} };
							config.rules[RULE_ID] = 1;
							validate({buffer: topic, callback: callback, config: config}).then(
								function (problems) {
									assertProblems(problems, [
									{
										id: RULE_ID,
										severity: 'warning',
										nodeType: "Literal"
									}]);
								},
								function (error) {
									worker.getTestState().callback(error);
								});
						});
						it("should not flag thrown Identifier", function(callback) {
							var topic = "throw a";
							var config = { rules: {} };
							config.rules[RULE_ID] = 1;
							validate({buffer: topic, callback: callback, config: config}).then(
								function (problems) {
									assertProblems(problems, []);
								},
								function (error) {
									worker.getTestState().callback(error);
								});
						});
						it("should not flag thrown MemberExpression", function(callback) {
							var topic = "throw a.b";
							var config = { rules: {} };
							config.rules[RULE_ID] = 1;
							validate({buffer: topic, callback: callback, config: config}).then(
								function (problems) {
									assertProblems(problems, []);
								},
								function (error) {
									worker.getTestState().callback(error);
								});
						});
						it("should not flag thrown NewExpression", function(callback) {
							var topic = "throw new Error()";
							var config = { rules: {} };
							config.rules[RULE_ID] = 1;
							validate({buffer: topic, callback: callback, config: config}).then(
								function (problems) {
									assertProblems(problems, []);
								},
								function (error) {
									worker.getTestState().callback(error);
								});
						});
						it("should not flag thrown CallExpression", function(callback) {
							var topic = "throw Error()";
							var config = { rules: {} };
							config.rules[RULE_ID] = 1;
							validate({buffer: topic, callback: callback, config: config}).then(
								function (problems) {
									assertProblems(problems, []);
								},
								function (error) {
									worker.getTestState().callback(error);
								});
						});
						it("should not flag thrown ConditionalExpression", function(callback) {
							var topic = "throw (1 ? 2 : 3);";
							var config = { rules: {} };
							config.rules[RULE_ID] = 1;
							validate({buffer: topic, callback: callback, config: config}).then(
								function (problems) {
									assertProblems(problems, []);
								},
								function (error) {
									worker.getTestState().callback(error);
								});
						});
						it("should not flag thrown LogicalExpression", function(callback) {
							var topic = "throw 1||2;";
							var config = { rules: {} };
							config.rules[RULE_ID] = 1;
							validate({buffer: topic, callback: callback, config: config}).then(
								function (problems) {
									assertProblems(problems, []);
								},
								function (error) {
									worker.getTestState().callback(error);
								});
						});
						it("should not flag thrown SequenceExpression", function(callback) {
							var topic = "throw 1,2;";
							var config = { rules: {}};
							validate({buffer: topic, callback: callback, config: config}).then(
								function (problems) {
									assertProblems(problems, []);
								},
								function (error) {
									worker.getTestState().callback(error);
								});
						});
					});
			
					//NO-UNDEF -----------------------------------------------------
					describe('no-undef', function() {
						var RULE_ID = "no-undef";
						//------------------------------------------------------------------------------
						// Test undeclared globals
						//------------------------------------------------------------------------------
						it("should report violation when evaluating write to undeclared global", function(callback) {
							var topic = "a = 1;";
							var config = { rules: {} };
							config.rules[RULE_ID] = 1;
							validate({buffer: topic, callback: callback, config: config}).then(
								function (problems) {
									assertProblems(problems, [
									{
										id: RULE_ID,
										severity: 'warning',
										description: "'a' is undefined.",
										nodeType: "Identifier"
									}]);
								},
								function (error) {
									worker.getTestState().callback(error);
								});
						});
						it("should report violation (undeclared global) on read of undeclared global", function(callback) {
							var topic = "var a = b;";
							var config = { rules: {} };
							config.rules[RULE_ID] = 1;
							validate({buffer: topic, callback: callback, config: config}).then(
								function (problems) {
									assertProblems(problems, [
									{
										id: RULE_ID,
										severity: 'warning',
										description: "'b' is undefined.",
										nodeType: "Identifier"
									}]);
								},
								function (error) {
									worker.getTestState().callback(error);
								});
						});
						it("should not report a violation when evaluating reference to variable defined in global scope", function(callback) {
							var topic = "var a = 1, b = 2; a;";
							var config = { rules: {} };
							config.rules[RULE_ID] = 1;
							validate({buffer: topic, callback: callback, config: config}).then(
								function (problems) {
									assertProblems(problems, []);
								},
								function (error) {
									worker.getTestState().callback(error);
								});
						});
						it("should report a violation when evaluating reference to undeclared global from function scope", function(callback) {
							var topic = "function f() { b; }";
							var config = { rules: {} };
							config.rules[RULE_ID] = 1;
							validate({buffer: topic, callback: callback, config: config}).then(
								function (problems) {
									assertProblems(problems, [
									{
										id: RULE_ID,
										severity: 'warning',
										description: "'b' is undefined.",
										nodeType: "Identifier"
									}]);
								},
								function (error) {
									worker.getTestState().callback(error);
								});
						});
						it("should not report a violation when evaluating reference to declared global from function scope", function(callback) {
							var topic = "/*global b*/ function f() { b; }";
							var config = { rules: {} };
							config.rules[RULE_ID] = 1;
							validate({buffer: topic, callback: callback, config: config}).then(
								function (problems) {
									assertProblems(problems, []);
								},
								function (error) {
									worker.getTestState().callback(error);
								});
						});
						it("should not report a violation when evaluating references to several declared globals", function(callback) {
							var topic = "/*global b a:false*/  a;  function f() { b; a; }";
							var config = { rules: {} };
							config.rules[RULE_ID] = 1;
							validate({buffer: topic, callback: callback, config: config}).then(
								function (problems) {
									assertProblems(problems, []);
								},
								function (error) {
									worker.getTestState().callback(error);
								});
						});
						it("should not report a violation when evaluating call to function declared at global scope", function(callback) {
							var topic = "function a(){}  a();";
							var config = { rules: {} };
							config.rules[RULE_ID] = 1;
							validate({buffer: topic, callback: callback, config: config}).then(
								function (problems) {
									assertProblems(problems, []);
								},
								function (error) {
									worker.getTestState().callback(error);
								});
						});
						it("should not report a violation when evaluating reference to parameter", function(callback) {
							var topic = "function f(b) { b; }";
							var config = { rules: {} };
							config.rules[RULE_ID] = 1;
							validate({buffer: topic, callback: callback, config: config}).then(
								function (problems) {
									assertProblems(problems, []);
								},
								function (error) {
									worker.getTestState().callback(error);
								});
						});
				
						// https://bugs.eclipse.org/bugs/show_bug.cgi?id=422715
						it("should not flag declared variables as undeclared when 'eval' is used in scope", function(callback) {
							var topic = "(function() { var a = 1; eval(); })();";
							var config = { rules: {} };
							config.rules[RULE_ID] = 1;
							validate({buffer: topic, callback: callback, config: config}).then(
								function (problems) {
									assertProblems(problems, []);
								},
								function (error) {
									worker.getTestState().callback(error);
								});
						});
						//------------------------------------------------------------------------------
						// Test readonly
						//------------------------------------------------------------------------------
						it("should not report a violation when evaluating write to an explicitly declared variable in global scope", function(callback) {
							var topic = "var a; a = 1; a++;";
							var config = { rules: {} };
							config.rules[RULE_ID] = 1;
							validate({buffer: topic, callback: callback, config: config}).then(
								function (problems) {
									assertProblems(problems, []);
								},
								function (error) {
									worker.getTestState().callback(error);
								});
						});
						it("should not report a violation when evaluating write to an explicitly declared variable in global scope from function scope", function(callback) {
							var topic = "var a; function f() { a = 1; }";
							var config = { rules: {} };
							config.rules[RULE_ID] = 1;
							validate({buffer: topic, callback: callback, config: config}).then(
								function (problems) {
									assertProblems(problems, []);
								},
								function (error) {
									worker.getTestState().callback(error);
								});
						});
						it("should not report a violationwhen evaluating write to a declared writeable global", function(callback) {
							var topic = "/*global b:true*/ b++;";
							var config = { rules: {} };
							config.rules[RULE_ID] = 1;
							validate({buffer: topic, callback: callback, config: config}).then(
								function (problems) {
									assertProblems(problems, []);
								},
								function (error) {
									worker.getTestState().callback(error);
								});
						});
						//------------------------------------------------------------------------------
						// Test eslint-env browser flags
						//------------------------------------------------------------------------------
						it("should report a violation (undeclared global) when evaluating reference to a browser global", function(callback) {
							var topic = "window;";
							var config = { rules: {} };
							config.rules[RULE_ID] = 1;
							validate({buffer: topic, callback: callback, config: config}).then(
								function (problems) {
									assertProblems(problems, [
									{
										id: RULE_ID,
										severity: 'warning',
										description: "'window' is undefined.",
										nodeType: "Identifier"
									}]);
								},
								function (error) {
									worker.getTestState().callback(error);
								});
						});
						it("should not report a violation when evaluating reference to a browser global with 'eslint-env browser'", function(callback) {
							var topic = "/*eslint-env browser*/ window;";
							var config = { rules: {} };
							config.rules[RULE_ID] = 1;
							validate({buffer: topic, callback: callback, config: config}).then(
								function (problems) {
									assertProblems(problems, []);
								},
								function (error) {
									worker.getTestState().callback(error);
								});
						});
						it("should not report a violation when evaluating reference to a browser global with 'eslint-env browser'", function(callback) {
							var topic = "/*eslint-env browser*/ window;";
							var config = { rules: {} };
							config.rules[RULE_ID] = 1;
							validate({buffer: topic, callback: callback, config: config}).then(
								function (problems) {
									assertProblems(problems, []);
								},
								function (error) {
									worker.getTestState().callback(error);
								});
						});
						//XXX This test is no bogus since eslint-env does not consider :true/:false - having it there
						//means true, left out is false
						it("should report a violation (undeclared global) when evaluating reference to a browser global with 'eslint-env browser'", function(callback) {
							var topic = "/*eslint-env browser:false*/ window;";
							var config = { rules: {} };
							config.rules[RULE_ID] = 1;
							validate({buffer: topic, callback: callback, config: config}).then(
								function (problems) {
									assertProblems(problems, [
									{
										id: RULE_ID,
										severity: 'warning',
										description: "'window' is undefined.",
										nodeType: "Identifier"
									}]);
								},
								function (error) {
									worker.getTestState().callback(error);
								});
						});
						//------------------------------------------------------------------------------
						// Test eslint-env node flags
						//------------------------------------------------------------------------------
						it.skip("should report a violation (undeclared global) when evaluating reference to a node global", function(callback) {
							var topic = "require(\"a\");";
							var config = { rules: {} };
							config.rules[RULE_ID] = 1;
							validate({buffer: topic, callback: callback, config: config}).then(
								function (problems) {
									assertProblems(problems, [
									{
										id: RULE_ID,
										severity: 'warning',
										description: "'require' is undefined.",
										nodeType: "Identifier"
									}]);
								},
								function (error) {
									worker.getTestState().callback(error);
								});
						});
						it.skip("should not report a violation when evaluating reference to a node global with 'eslint-env node'", function(callback) {
							var topic = "/*eslint-env node*/ require(\"a\");";
							var config = { rules: {} };
							config.rules[RULE_ID] = 1;
							validate({buffer: topic, callback: callback, config: config}).then(
								function (problems) {
									assertProblems(problems, []);
								},
								function (error) {
									worker.getTestState().callback(error);
								});
						});
						//XXX This test is no bogus since eslint-env does not consider :true/:false - having it there
						//means true, left out is false
						it.skip("should report a violation (undeclared global) when evaluating reference to a node global with eslint-env node:false", function(callback) {
							var topic = "/*eslint-env node:false*/ require(\"a\");";
							var config = { rules: {} };
							config.rules[RULE_ID] = 1;
							validate({buffer: topic, callback: callback, config: config}).then(
								function (problems) {
									assertProblems(problems, [
									{
										id: RULE_ID,
										severity: 'warning',
										description: "'require' is undefined.",
										nodeType: "Identifier"
									}]);
								},
								function (error) {
									worker.getTestState().callback(error);
								});
						});
				
						//------------------------------------------------------------------------------
						// Test references to builtins
						//------------------------------------------------------------------------------
						it("should not report a violation when evaluating reference to a builtin", function(callback) {
							var topic = "Object; isNaN();";
							var config = { rules: {} };
							config.rules[RULE_ID] = 1;
							validate({buffer: topic, callback: callback, config: config}).then(
								function (problems) {
									assertProblems(problems, []);
								},
								function (error) {
									worker.getTestState().callback(error);
								});
						});
						
						//------------------------------------------------------------------------------
						// Test references to globals in other files that Tern knows about
						//------------------------------------------------------------------------------
						it("no-undef cross file 1 - should not report undefined function when defined in a known file", function(callback) {
							worker.postMessage({request: 'addFile', args: {file: "noUndefTest1.js", source: "function noUndefTest1(){}"}});
							var topic = "noUndefTest1();";
							var config = { rules: {} };
							config.rules[RULE_ID] = 1;
							validate({buffer: topic, callback: callback, config: config}).then(
								function (problems) {
									assertProblems(problems, []);
								},
								function (error) {
									worker.getTestState().callback(error);
								}
							);
						});
						it("no-undef cross file 2 - should not report undefined var when defined in a known file", function(callback) {
							worker.postMessage({request: 'addFile', args: {file: "noUndefTest2.js", source: "var noUndefTest2;"}});
							var topic = "noUndefTest2++;";
							var config = { rules: {} };
							config.rules[RULE_ID] = 1;
							validate({buffer: topic, callback: callback, config: config}).then(
								function (problems) {
									assertProblems(problems, []);
								},
								function (error) {
									worker.getTestState().callback(error);
								}
							);
						});
						it("no-undef cross file 3 - should not report undefined property when defined in a known file", function(callback) {
							worker.postMessage({request: 'addFile', args: {file: "noUndefTest3.js", source: "this.noUndefTest3 = function(){};"}});
							var topic = "noUndefTest3();";
							var config = { rules: {} };
							config.rules[RULE_ID] = 1;
							validate({buffer: topic, callback: callback, config: config}).then(
								function (problems) {
									assertProblems(problems, []);
								},
								function (error) {
									worker.getTestState().callback(error);
								}
							);
						});
					});
                    //NO-UNDEF-EXPRESSION -----------------------------------------------------
					describe('no-undef-expression', function() {
						var RULE_ID = "no-undef-expression";
						//------------------------------------------------------------------------------
						// Test undeclared globals
						//------------------------------------------------------------------------------
						it("Single file undeclared member", function(callback) {
							var topic = "var undefExpr = {a: function(){}}; undefExpr.b();";
							var config = { rules: {} };
							config.rules[RULE_ID] = 1;
							validate({buffer: topic, callback: callback, config: config}).then(
								function (problems) {
									assertProblems(problems, [
									{
										id: RULE_ID,
										severity: 'warning',
										description: "'b' is undefined for 'undefExpr' in validator_test_script.js.",
										nodeType: "Identifier"
									}]);
								},
								function (error) {
									worker.getTestState().callback(error);
								});
						});
						it("Single file undeclared member - prop literal", function(callback) {
							var topic = "var undefExpr = {a: function(){}}; undefExpr['b']();";
							var config = { rules: {} };
							config.rules[RULE_ID] = 1;
							validate({buffer: topic, callback: callback, config: config}).then(
								function (problems) {
									assertProblems(problems, [
									{
										id: RULE_ID,
										severity: 'warning',
										description: "'b' is undefined for 'undefExpr' in validator_test_script.js.",
										nodeType: "Literal"
									}]);
								},
								function (error) {
									worker.getTestState().callback(error);
								});
						});
						it("Single file no declared members", function(callback) {
							var topic = "var undefExpr = {}; undefExpr.b();";
							var config = { rules: {} };
							config.rules[RULE_ID] = 1;
							validate({buffer: topic, callback: callback, config: config}).then(
								function (problems) {
									assertProblems(problems, [
									{
										id: RULE_ID,
										severity: 'warning',
										description: "'b' is undefined for 'undefExpr' in validator_test_script.js.",
										nodeType: "Identifier"
									}
									]);
								},
								function (error) {
									worker.getTestState().callback(error);
								});
						});
						it("Single file no declared members - prop literal", function(callback) {
							var topic = "var undefExpr = {}; undefExpr['b']();";
							var config = { rules: {} };
							config.rules[RULE_ID] = 1;
							validate({buffer: topic, callback: callback, config: config}).then(
								function (problems) {
									assertProblems(problems, [
									{
										id: RULE_ID,
										severity: 'warning',
										description: "'b' is undefined for 'undefExpr' in validator_test_script.js.",
										nodeType: "Literal"
									}
									]);
								},
								function (error) {
									worker.getTestState().callback(error);
								});
						});
						it("Single file object not documented but property set in function call", function(callback) {
							var topic = "function foo(a){a.b();}\nfoo({b: function(){}});";
							var config = { rules: {} };
							config.rules[RULE_ID] = 1;
							validate({buffer: topic, callback: callback, config: config}).then(
								function (problems) {
									assertProblems(problems, [
									]);
								},
								function (error) {
									worker.getTestState().callback(error);
								});
						});
						it("Single file object not documented, different property set in function call", function(callback) {
							var topic = "function foo(a){a.b();}\nfoo({c: function(){}});";
							var config = { rules: {} };
							config.rules[RULE_ID] = 1;
							validate({buffer: topic, callback: callback, config: config}).then(
								function (problems) {
									assertProblems(problems, [
									{
										id: RULE_ID,
										severity: 'warning',
										description: "'b' is undefined for 'a' in validator_test_script.js.",
										nodeType: "Identifier"
									}
									]);
								},
								function (error) {
									worker.getTestState().callback(error);
								});
						});
						it("Single file object not documented, no properties set", function(callback) {
							var topic = "function foo(a){a.b();};";
							var config = { rules: {} };
							config.rules[RULE_ID] = 1;
							validate({buffer: topic, callback: callback, config: config}).then(
								function (problems) {
									assertProblems(problems, [
									]);
								},
								function (error) {
									worker.getTestState().callback(error);
								});
						});
						it("Single file object documented as {Object}, no properties set", function(callback) {
							var topic = "/**\n * @param {Object} a\n */\nfunction foo(a){a.b();}";
							var config = { rules: {} };
							config.rules[RULE_ID] = 1;
							validate({buffer: topic, callback: callback, config: config}).then(
								function (problems) {
									assertProblems(problems, [
									{
										id: RULE_ID,
										severity: 'warning',
										description: "'b' is undefined for 'a' in validator_test_script.js.",
										nodeType: "Identifier"
									}
									]);
								},
								function (error) {
									worker.getTestState().callback(error);
								});
						});
						it("Single file object documented as {Object}, no properties set - prop literal", function(callback) {
							var topic = "/**\n * @param {Object} a\n */\nfunction foo(a){a['b']();}";
							var config = { rules: {} };
							config.rules[RULE_ID] = 1;
							validate({buffer: topic, callback: callback, config: config}).then(
								function (problems) {
									assertProblems(problems, [
									{
										id: RULE_ID,
										severity: 'warning',
										description: "'b' is undefined for 'a' in validator_test_script.js.",
										nodeType: "Literal"
									}
									]);
								},
								function (error) {
									worker.getTestState().callback(error);
								});
						});
						it("Single file object documented as {{}}, no properties set", function(callback) {
							var topic = "/**\n * @param {{b:fn}} a\n */\nfunction foo(a){a.b();}";
							var config = { rules: {} };
							config.rules[RULE_ID] = 1;
							validate({buffer: topic, callback: callback, config: config}).then(
								function (problems) {
									assertProblems(problems, [
									]);
								},
								function (error) {
									worker.getTestState().callback(error);
								});
						});
						it("Single file object documented as {Object}, different property set", function(callback) {
							var topic = "/**\n * @param {Object} a\n */\nfunction foo(a){a.b();} foo({c: function(){}});";
							var config = { rules: {} };
							config.rules[RULE_ID] = 1;
							validate({buffer: topic, callback: callback, config: config}).then(
								function (problems) {
									assertProblems(problems, [
									{
										id: RULE_ID,
										severity: 'warning',
										description: "'b' is undefined.",
										nodeType: "Identifier"
									}
									]);
								},
								function (error) {
									worker.getTestState().callback(error);
								});
						});
						it("Single file object not defined", function(callback) {
							var topic = "undefExpr.b();";
							var config = { rules: {} };
							config.rules[RULE_ID] = 1;
							validate({buffer: topic, callback: callback, config: config}).then(
								function (problems) {
									assertProblems(problems, []);
								},
								function (error) {
									worker.getTestState().callback(error);
								});
						});
                        it("Single file declared member", function(callback) {
							var topic = "var undefExpr = {a: function(){}}; undefExpr.a();";
							var config = { rules: {} };
							config.rules[RULE_ID] = 1;
							validate({buffer: topic, callback: callback, config: config}).then(
								function (problems) {
									assertProblems(problems, []
									);
								},
								function (error) {
									worker.getTestState().callback(error);
								});
						});
						// Right now we assume a type with no properties means that Tern is missing the necessary information
                        it("Single file undeclared member object has no properties", function(callback) {
							var topic = "var undefExpr = {}; undefExpr.a;";
							var config = { rules: {} };
							config.rules[RULE_ID] = 1;
							validate({buffer: topic, callback: callback, config: config}).then(
								function (problems) {
									assertProblems(problems, []);
								},
								function (error) {
									worker.getTestState().callback(error);
								});
						});
                        it("Single file multiple undeclared members", function(callback) {
							var topic = "var undefExpr = {a: function(){}}; undefExpr.b(); undefExpr.c()";
							var config = { rules: {} };
							config.rules[RULE_ID] = 1;
							validate({buffer: topic, callback: callback, config: config}).then(
								function (problems) {
									assertProblems(problems, [
									{
										id: RULE_ID,
										severity: 'warning',
										description: "'b' is undefined for \'undefExpr\' in validator_test_script.js.",
										nodeType: "Identifier"
									},
                                    {
										id: RULE_ID,
										severity: 'warning',
										description: "'c' is undefined for \'undefExpr\' in validator_test_script.js.",
										nodeType: "Identifier"
									}]);
								},
								function (error) {
									worker.getTestState().callback(error);
								});
						});
						it("Single file multiple undeclared members - prop literal", function(callback) {
							var topic = "var undefExpr = {a: function(){}}; undefExpr['b'](); undefExpr['c']()";
							var config = { rules: {} };
							config.rules[RULE_ID] = 1;
							validate({buffer: topic, callback: callback, config: config}).then(
								function (problems) {
									assertProblems(problems, [
									{
										id: RULE_ID,
										severity: 'warning',
										description: "'b' is undefined for \'undefExpr\' in validator_test_script.js.",
										nodeType: "Literal"
									},
                                    {
										id: RULE_ID,
										severity: 'warning',
										description: "'c' is undefined for \'undefExpr\' in validator_test_script.js.",
										nodeType: "Literal"
									}]);
								},
								function (error) {
									worker.getTestState().callback(error);
								});
						});
						it("Single file wrong undeclared members", function(callback) {
							var topic = "var undefExpr = {a: function(){}}; undefExpr.b(); undefExpr.c()";
							var config = { rules: {} };
							config.rules[RULE_ID] = 1;
							validate({buffer: topic, callback: callback, config: config}).then(
								function (problems) {
									assertProblems(problems, [
									{
										id: RULE_ID,
										severity: 'warning',
										description: "'b' is undefined for 'undefExpr' in validator_test_script.js.",
										nodeType: "Identifier"
									},
                                    {
										id: RULE_ID,
										severity: 'warning',
										description: "'c' is undefined for 'undefExpr' in validator_test_script.js.",
										nodeType: "Identifier"
									}]);
								},
								function (error) {
									worker.getTestState().callback(error);
								});
						});
                        it("Single file multiple member expression", function(callback) {
							var topic = "var undefExpr = {a: {b: {c: function(){}}}}; undefExpr.a.b.d(); undefExpr.b();";
							var config = { rules: {} };
							config.rules[RULE_ID] = 1;
							validate({buffer: topic, callback: callback, config: config}).then(
								function (problems) {
									assertProblems(problems, [
									{
										id: RULE_ID,
										severity: 'warning',
										description: "'d' is undefined for 'b' in validator_test_script.js.",
										nodeType: "Identifier"
									},
                                    {
										id: RULE_ID,
										severity: 'warning',
										description: "'b' is undefined for 'undefExpr' in validator_test_script.js.",
										nodeType: "Identifier"
									}]);
								},
								function (error) {
									worker.getTestState().callback(error);
								});
						});
						it("Single file browser environment member expression", function(callback) {
							var topic = "/*eslint-env browser */\ndocument.getElementById('bar');\n document.getZZZ();";
							var config = { rules: {} };
							config.rules[RULE_ID] = 1;
							validate({buffer: topic, callback: callback, config: config}).then(
								function (problems) {
									assertProblems(problems, [
									//TODO something is stepping on 'document' and assigning it a stand-in type
//									{
//										id: RULE_ID,
//										severity: 'warning',
//										description: "'getZZZ' is undefined for 'Document' in browser.",
//										nodeType: "Identifier"
//									}
									]);
								},
								function (error) {
									worker.getTestState().callback(error);
								});
						});
                        it("Single file member declared inline", function(callback) {
							var topic = "var undefExpr = {}; undefExpr.a = function(){}; undefExpr.a();";
							var config = { rules: {} };
							config.rules[RULE_ID] = 1;
							validate({buffer: topic, callback: callback, config: config}).then(
								function (problems) {
									assertProblems(problems, [
									]);
								},
								function (error) {
									worker.getTestState().callback(error);
								});
						});
                        it.skip("Single file declared property is wrong type", function(callback) {
							var topic = "var undefExpr = {a: {}}; undefExpr.a();";
							var config = { rules: {} };
							config.rules[RULE_ID] = 1;
							validate({buffer: topic, callback: callback, config: config}).then(
								function (problems) {
									assertProblems(problems, [
									]);
								},
								function (error) {
									worker.getTestState().callback(error);
								});
						});
                        //------------------------------------------------------------------------------
						// Test references to globals in other files that Tern knows about
						//------------------------------------------------------------------------------
						it("Multi file 1a - undeclared member", function(callback) {
							worker.postMessage({request: 'addFile', args: {file: "noUndefExprTest1.js", source: "noUndefExpr1 = {a: function(){}};"}});
							var topic = "noUndefExpr1.b();";
							var config = { rules: {} };
							config.rules[RULE_ID] = 1;
							validate({buffer: topic, callback: callback, config: config}).then(
								function (problems) {
									assertProblems(problems, [{
										id: RULE_ID,
										severity: 'warning',
										description: "'b' is undefined for 'noUndefExpr1' in noUndefExprTest1.js.",
										nodeType: "Identifier"
									}]);
								},
								function (error) {
									worker.getTestState().callback(error);
								}
							);
						});
						it("Multi file 1b - undeclared nested member", function(callback) {
							worker.postMessage({request: 'addFile', args: {file: "noUndefExprTest1.js", source: "noUndefExpr1 = {abc: {d: function(){}};"}});
							var topic = "noUndefExpr1.abc.testc();";
							var config = { rules: {} };
							config.rules[RULE_ID] = 1;
							validate({buffer: topic, callback: callback, config: config}).then(
								function (problems) {
									assertProblems(problems, [{
										id: RULE_ID,
										severity: 'warning',
										description: "'testc' is undefined for 'abc' in noUndefExprTest1.js.",
										nodeType: "Identifier"
									}]);
								},
								function (error) {
									worker.getTestState().callback(error);
								}
							);
						});
                        it("Multi file 2 - declared member", function(callback) {
							worker.postMessage({request: 'addFile', args: {file: "noUndefExprTest2.js", source: "noUndefExpr2 = {a: function(){}};"}});
							var topic = "noUndefExpr2.a();";
							var config = { rules: {} };
							config.rules[RULE_ID] = 1;
							validate({buffer: topic, callback: callback, config: config}).then(
								function (problems) {
									assertProblems(problems, []);
								},
								function (error) {
									worker.getTestState().callback(error);
								}
							);
						});
                        it("Multi file 3 - undeclared member no properties", function(callback) {
							worker.postMessage({request: 'addFile', args: {file: "noUndefExprTest3.js", source: "noUndefExpr3 = {};"}});
							var topic = "noUndefExpr3.a();";
							var config = { rules: {} };
							config.rules[RULE_ID] = 1;
							validate({buffer: topic, callback: callback, config: config}).then(
								function (problems) {
									assertProblems(problems, [
									{
										id: RULE_ID,
										severity: 'warning',
										description: "'a' is undefined for 'noUndefExpr3' in noUndefExprTest3.js.",
										nodeType: "Identifier"
									}
									]);
								},
								function (error) {
									worker.getTestState().callback(error);
								}
							);
						});
						 it("Multi file 4 - no object declared", function(callback) {
							worker.postMessage({request: 'addFile', args: {file: "noUndefExprTest4.js", source: "noUndefExprZZZ4 = {};"}});
							var topic = "noUndefExpr4.a();";
							var config = { rules: {} };
							config.rules[RULE_ID] = 1;
							validate({buffer: topic, callback: callback, config: config}).then(
								function (problems) {
									assertProblems(problems, []);
								},
								function (error) {
									worker.getTestState().callback(error);
								}
							);
						});
						it("Should not flag array access using a binary expression", function(callback) {
							var topic = "var funcs = [], i = 5; return funcs[i - 1]();";
							var config = { rules: {} };
							config.rules[RULE_ID] = 1;
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
					//NO-UNDEF-INIT -------------------------------------------------
					describe('no-unreachable', function() {
						var RULE_ID = "no-undef-init";
						it("should flag var decl undefined 1", function(callback) {
							var topic = "var foo = undefined;";
							var config = { rules: {} };
							config.rules[RULE_ID] = 1;
							validate({buffer: topic, callback: callback, config: config}).then(
								function (problems) {
									assertProblems(problems, [
									{
										id: RULE_ID,
										severity: 'warning',
										description: "Avoid explicitly initializing variables to \'undefined\'.",
										nodeType: "Identifier"
									}]);
								},
								function (error) {
									worker.getTestState().callback(error);
								});
						});
						it("should flag var decl undefined 2", function(callback) {
							var topic = "var foo = 1, bar = undefined;";
							var config = { rules: {} };
							config.rules[RULE_ID] = 1;
							validate({buffer: topic, callback: callback, config: config}).then(
								function (problems) {
									assertProblems(problems, [
									{
										id: RULE_ID,
										severity: 'warning',
										description: "Avoid explicitly initializing variables to \'undefined\'.",
										nodeType: "Identifier"
									}]);
								},
								function (error) {
									worker.getTestState().callback(error);
								});
						});
						it("should flag var decl undefined 3", function(callback) {
							var topic = "function f() {var foo = undefined;}";
							var config = { rules: {} };
							config.rules[RULE_ID] = 1;
							validate({buffer: topic, callback: callback, config: config}).then(
								function (problems) {
									assertProblems(problems, [
									{
										id: RULE_ID,
										severity: 'warning',
										description: "Avoid explicitly initializing variables to \'undefined\'.",
										nodeType: "Identifier"
									}]);
								},
								function (error) {
									worker.getTestState().callback(error);
								});
						});
						it("should flag var decl undefined 4", function(callback) {
							var topic = "with(foo) {var bar = undefined;}";
							var config = { rules: {} };
							config.rules[RULE_ID] = 1;
							validate({buffer: topic, callback: callback, config: config}).then(
								function (problems) {
									assertProblems(problems, [
									{
										id: RULE_ID,
										severity: 'warning',
										description: "Avoid explicitly initializing variables to \'undefined\'.",
										nodeType: "Identifier"
									}]);
								},
								function (error) {
									worker.getTestState().callback(error);
								});
						});
						it("should not flag var decl undefined literal", function(callback) {
							var topic = "var foo = 'undefined';";
							var config = { rules: {} };
							config.rules[RULE_ID] = 1;
							validate({buffer: topic, callback: callback, config: config}).then(
								function (problems) {
									assertProblems(problems, []);
								},
								function (error) {
									worker.getTestState().callback(error);
								});
						});
					});
					//NO-UNREACHABLE ------------------------------------------------
					describe('no-unreachable', function() {
						var RULE_ID = "no-unreachable";
						it("should flag function decl return", function(callback) {
							var topic = "function f() {return\ntrue;}";
							var config = { rules: {} };
							config.rules[RULE_ID] = 1;
							validate({buffer: topic, callback: callback, config: config}).then(
								function (problems) {
									assertProblems(problems, [
									{
										id: RULE_ID,
										severity: 'warning',
										description: "Unreachable code.",
										nodeType: "ExpressionStatement"
									}]);
								},
								function (error) {
									worker.getTestState().callback(error);
								});
						});
						it("should flag function decl throw", function(callback) {
							var topic = "function f() {throw e;\ntrue;}";
							var config = { rules: {} };
							config.rules[RULE_ID] = 1;
							validate({buffer: topic, callback: callback, config: config}).then(
								function (problems) {
									assertProblems(problems, [
									{
										id: RULE_ID,
										severity: 'warning',
										description: "Unreachable code.",
										nodeType: "ExpressionStatement"
									}]);
								},
								function (error) {
									worker.getTestState().callback(error);
								});
						});
						it("should flag function decl multi return", function(callback) {
							var topic = "function f() {return\ntrue;\nfalse;}";
							var config = { rules: {} };
							config.rules[RULE_ID] = 1;
							validate({buffer: topic, callback: callback, config: config}).then(
								function (problems) {
									assertProblems(problems, [
									{
										id: RULE_ID,
										severity: 'warning',
										description: "Unreachable code.",
										nodeType: "ExpressionStatement"
									},
									{
										id: RULE_ID,
										severity: 'warning',
										description: "Unreachable code.",
										nodeType: "ExpressionStatement"
									}]);
								},
								function (error) {
									worker.getTestState().callback(error);
								});
						});
						it("should flag while throw", function(callback) {
							var topic = "while(true) {throw e;\ntrue;}";
							var config = { rules: {} };
							config.rules[RULE_ID] = 1;
							validate({buffer: topic, callback: callback, config: config}).then(
								function (problems) {
									assertProblems(problems, [
									{
										id: RULE_ID,
										severity: 'warning',
										description: "Unreachable code.",
										nodeType: "ExpressionStatement"
									}]);
								},
								function (error) {
									worker.getTestState().callback(error);
								});
						});
						it("should flag while continue", function(callback) {
							var topic = "while(true) {continue\ntrue;}";
							var config = { rules: {} };
							config.rules[RULE_ID] = 1;
							validate({buffer: topic, callback: callback, config: config}).then(
								function (problems) {
									assertProblems(problems, [
									{
										id: RULE_ID,
										severity: 'warning',
										description: "Unreachable code.",
										nodeType: "ExpressionStatement"
									}]);
								},
								function (error) {
									worker.getTestState().callback(error);
								});
						});
						it("should flag while break", function(callback) {
							var topic = "while(true) {break\ntrue;}";
							var config = { rules: {} };
							config.rules[RULE_ID] = 1;
							validate({buffer: topic, callback: callback, config: config}).then(
								function (problems) {
									assertProblems(problems, [
									{
										id: RULE_ID,
										severity: 'warning',
										description: "Unreachable code.",
										nodeType: "ExpressionStatement"
									}]);
								},
								function (error) {
									worker.getTestState().callback(error);
								});
						});
						it("should flag while break multi", function(callback) {
							var topic = "while(true) {break\ntrue;\nfalse;}";
							var config = { rules: {} };
							config.rules[RULE_ID] = 1;
							validate({buffer: topic, callback: callback, config: config}).then(
								function (problems) {
									assertProblems(problems, [
									{
										id: RULE_ID,
										severity: 'warning',
										description: "Unreachable code.",
										nodeType: "ExpressionStatement"
									},
									{
										id: RULE_ID,
										severity: 'warning',
										description: "Unreachable code.",
										nodeType: "ExpressionStatement"
									}]);
								},
								function (error) {
									worker.getTestState().callback(error);
								});
						});
						it("should flag for continue", function(callback) {
							var topic = "for(true;;) {continue\ntrue;}";
							var config = { rules: {} };
							config.rules[RULE_ID] = 1;
							validate({buffer: topic, callback: callback, config: config}).then(
								function (problems) {
									assertProblems(problems, [
									{
										id: RULE_ID,
										severity: 'warning',
										description: "Unreachable code.",
										nodeType: "ExpressionStatement"
									}]);
								},
								function (error) {
									worker.getTestState().callback(error);
								});
						});
						it("should flag for break", function(callback) {
							var topic = "for(true;;) {break\ntrue;}";
							var config = { rules: {} };
							config.rules[RULE_ID] = 1;
							validate({buffer: topic, callback: callback, config: config}).then(
								function (problems) {
									assertProblems(problems, [
									{
										id: RULE_ID,
										severity: 'warning',
										description: "Unreachable code.",
										nodeType: "ExpressionStatement"
									}]);
								},
								function (error) {
									worker.getTestState().callback(error);
								});
						});
						it("should flag for throw", function(callback) {
							var topic = "for(true;;) {throw e;\ntrue;}";
							var config = { rules: {} };
							config.rules[RULE_ID] = 1;
							validate({buffer: topic, callback: callback, config: config}).then(
								function (problems) {
									assertProblems(problems, [
									{
										id: RULE_ID,
										severity: 'warning',
										description: "Unreachable code.",
										nodeType: "ExpressionStatement"
									}]);
								},
								function (error) {
									worker.getTestState().callback(error);
								});
						});
						it("should flag for throw multi", function(callback) {
							var topic = "for(true;;) {throw e;\ntrue;\nfalse;}";
							var config = { rules: {} };
							config.rules[RULE_ID] = 1;
							validate({buffer: topic, callback: callback, config: config}).then(
								function (problems) {
									assertProblems(problems, [
									{
										id: RULE_ID,
										severity: 'warning',
										description: "Unreachable code.",
										nodeType: "ExpressionStatement"
									},
									{
										id: RULE_ID,
										severity: 'warning',
										description: "Unreachable code.",
										nodeType: "ExpressionStatement"
									}]);
								},
								function (error) {
									worker.getTestState().callback(error);
								});
						});
						it("should flag for-in continue", function(callback) {
							var topic = "for(var p in o) {continue\ntrue;}";
							var config = { rules: {} };
							config.rules[RULE_ID] = 1;
							validate({buffer: topic, callback: callback, config: config}).then(
								function (problems) {
									assertProblems(problems, [
									{
										id: RULE_ID,
										severity: 'warning',
										description: "Unreachable code.",
										nodeType: "ExpressionStatement"
									}]);
								},
								function (error) {
									worker.getTestState().callback(error);
								});
						});
						it("should flag for-in break", function(callback) {
							var topic = "for(var p in o) {break\ntrue;}";
							var config = { rules: {} };
							config.rules[RULE_ID] = 1;
							validate({buffer: topic, callback: callback, config: config}).then(
								function (problems) {
									assertProblems(problems, [
									{
										id: RULE_ID,
										severity: 'warning',
										description: "Unreachable code.",
										nodeType: "ExpressionStatement"
									}]);
								},
								function (error) {
									worker.getTestState().callback(error);
								});
						});
						it("should flag for-in throw", function(callback) {
							var topic = "for(var p in o) {throw e;\ntrue;}";
							var config = { rules: {} };
							config.rules[RULE_ID] = 1;
							validate({buffer: topic, callback: callback, config: config}).then(
								function (problems) {
									assertProblems(problems, [
									{
										id: RULE_ID,
										severity: 'warning',
										description: "Unreachable code.",
										nodeType: "ExpressionStatement"
									}]);
								},
								function (error) {
									worker.getTestState().callback(error);
								});
						});
						it("should flag for-in continue multi", function(callback) {
							var topic = "for(var p in o) {continue\ntrue;\nfalse;}";
							var config = { rules: {} };
							config.rules[RULE_ID] = 1;
							validate({buffer: topic, callback: callback, config: config}).then(
								function (problems) {
									assertProblems(problems, [
									{
										id: RULE_ID,
										severity: 'warning',
										description: "Unreachable code.",
										nodeType: "ExpressionStatement"
									},
									{
										id: RULE_ID,
										severity: 'warning',
										description: "Unreachable code.",
										nodeType: "ExpressionStatement"
									}]);
								},
								function (error) {
									worker.getTestState().callback(error);
								});
						});
						it("should not flag hoisted func decl in func decl", function(callback) {
							var topic = "function f() {return\nfunction r(){}}";
							var config = { rules: {} };
							config.rules[RULE_ID] = 1;
							validate({buffer: topic, callback: callback, config: config}).then(
								function (problems) {
									assertProblems(problems, []);
								},
								function (error) {
									worker.getTestState().callback(error);
								});
						});
						it("should not flag hoisted var decl func decl", function(callback) {
							var topic = "function f() {return\nvar t;}";
							var config = { rules: {} };
							config.rules[RULE_ID] = 1;
							validate({buffer: topic, callback: callback, config: config}).then(
								function (problems) {
									assertProblems(problems, []);
								},
								function (error) {
									worker.getTestState().callback(error);
								});
						});
						it("should flag not hoisted var decl func decl", function(callback) {
							var topic = "function f() {return\nvar t = 4;}";
							var config = { rules: {} };
							config.rules[RULE_ID] = 1;
							validate({buffer: topic, callback: callback, config: config}).then(
								function (problems) {
									assertProblems(problems, [{
										id: RULE_ID,
										severity: 'warning',
										description: "Unreachable code."
									}]);
								},
								function (error) {
									worker.getTestState().callback(error);
								});
						});
						it("should not flag EmptyStatement", function(callback) {
							var topic = "function f() {return;;}";
							var config = { rules: {} };
							config.rules[RULE_ID] = 1;
							validate({buffer: topic, callback: callback, config: config}).then(
								function (problems) {
									assertProblems(problems, [{
										id: RULE_ID,
										severity: 'warning',
										description: "Unreachable code."
									}]);
								},
								function (error) {
									worker.getTestState().callback(error);
								});
						});
					});
			
					//NO-UNUSED-PARAMS -------------------------------------------
					describe('no-unused-params', function() {
						var RULE_ID = "no-unused-params";
						/**
						 * @since 10.0
						 * @see https://bugs.eclipse.org/bugs/show_bug.cgi?id=460728
						 */
						it("Should flag unused param ArrowFunctionExpression 1", function(callback) {
							var topic = "() => a => {}";
							var config = { rules: {} };
							config.rules[RULE_ID] = 1;
							validate({buffer: topic, callback: callback, config: config}).then(
								function (problems) {
									assertProblems(problems, [
									{
										id: RULE_ID,
										severity: 'warning',
										description: "Parameter 'a' is never used.",
										nodeType: "Identifier"
									}]);
								},
								function (error) {
									worker.getTestState().callback(error);
								});
						});
						/**
						 * @since 10.0
						 * @see https://bugs.eclipse.org/bugs/show_bug.cgi?id=460728
						 */
						it("Should flag unused param ArrowFunctionExpression 2", function(callback) {
							var topic = "() => {() => a => {}}";
							var config = { rules: {} };
							config.rules[RULE_ID] = 1;
							validate({buffer: topic, callback: callback, config: config}).then(
								function (problems) {
									assertProblems(problems, [
									{
										id: RULE_ID,
										severity: 'warning',
										description: "Parameter 'a' is never used.",
										nodeType: "Identifier"
									}]);
								},
								function (error) {
									worker.getTestState().callback(error);
								});
						});
						/**
						 * @since 10.0
						 * @see https://bugs.eclipse.org/bugs/show_bug.cgi?id=460728
						 */
						it("Should flag unused param ArrowFunctionExpression 3", function(callback) {
							var topic = "arr.map(a => {});";
							var config = { rules: {} };
							config.rules[RULE_ID] = 1;
							validate({buffer: topic, callback: callback, config: config}).then(
								function (problems) {
									assertProblems(problems, [
									{
										id: RULE_ID,
										severity: 'warning',
										description: "Parameter 'a' is never used.",
										nodeType: "Identifier"
									}]);
								},
								function (error) {
									worker.getTestState().callback(error);
								});
						});
						/**
						 * @since 10.0
						 * @see https://bugs.eclipse.org/bugs/show_bug.cgi?id=460728
						 */
						it("Should flag unused param ArrowFunctionExpression 4", function(callback) {
							var topic = "arr.map(() => {a => {}});";
							var config = { rules: {} };
							config.rules[RULE_ID] = 1;
							validate({buffer: topic, callback: callback, config: config}).then(
								function (problems) {
									assertProblems(problems, [
									{
										id: RULE_ID,
										severity: 'warning',
										description: "Parameter 'a' is never used.",
										nodeType: "Identifier"
									}]);
								},
								function (error) {
									worker.getTestState().callback(error);
								});
						});
						/**
						 * @since 10.0
						 * @see https://bugs.eclipse.org/bugs/show_bug.cgi?id=460728
						 */
						it("Should flag unused param ArrowFunctionExpression 5", function(callback) {
							var topic = "(arr.map(() => {a => {}}));";
							var config = { rules: {} };
							config.rules[RULE_ID] = 1;
							validate({buffer: topic, callback: callback, config: config}).then(
								function (problems) {
									assertProblems(problems, [
									{
										id: RULE_ID,
										severity: 'warning',
										description: "Parameter 'a' is never used.",
										nodeType: "Identifier"
									}]);
								},
								function (error) {
									worker.getTestState().callback(error);
								});
						});
						it("Should flag unused param simple func decl", function(callback) {
							var topic = "function f(a) {}";
							var config = { rules: {} };
							config.rules[RULE_ID] = 1;
							validate({buffer: topic, callback: callback, config: config}).then(
								function (problems) {
									assertProblems(problems, [
									{
										id: RULE_ID,
										severity: 'warning',
										description: "Parameter 'a' is never used.",
										nodeType: "Identifier"
									}]);
								},
								function (error) {
									worker.getTestState().callback(error);
								});
						});
						it("Should flag unused param nested func decl", function(callback) {
							var topic = "function f() {function g(b) {}}";
							var config = { rules: {} };
							config.rules[RULE_ID] = 1;
							validate({buffer: topic, callback: callback, config: config}).then(
								function (problems) {
									assertProblems(problems, [
									{
										id: RULE_ID,
										severity: 'warning',
										description: "Parameter 'b' is never used.",
										nodeType: "Identifier"
									}]);
								},
								function (error) {
									worker.getTestState().callback(error);
								});
						});
						it("Should flag unused param closed func decl", function(callback) {
							var topic = "(function f(a) {});";
							var config = { rules: {} };
							config.rules[RULE_ID] = 1;
							validate({buffer: topic, callback: callback, config: config}).then(
								function (problems) {
									assertProblems(problems, [
									{
										id: RULE_ID,
										severity: 'warning',
										description: "Parameter 'a' is never used.",
										nodeType: "Identifier"
									}]);
								},
								function (error) {
									worker.getTestState().callback(error);
								});
						});
						it("Should flag unused param closed nested func decl", function(callback) {
							var topic = "(function f() {function g(b) {}});";
							var config = { rules: {} };
							config.rules[RULE_ID] = 1;
							validate({buffer: topic, callback: callback, config: config}).then(
								function (problems) {
									assertProblems(problems, [
									{
										id: RULE_ID,
										severity: 'warning',
										description: "Parameter 'b' is never used.",
										nodeType: "Identifier"
									}]);
								},
								function (error) {
									worker.getTestState().callback(error);
								});
						});
						it("Should flag unused param simple func expr", function(callback) {
							var topic = "var v = function(a) {};";
							var config = { rules: {} };
							config.rules[RULE_ID] = 1;
							validate({buffer: topic, callback: callback, config: config}).then(
								function (problems) {
									assertProblems(problems, [
									{
										id: RULE_ID,
										severity: 'warning',
										description: "Parameter 'a' is never used.",
										nodeType: "Identifier"
									}]);
								},
								function (error) {
									worker.getTestState().callback(error);
								});
						});
						it("Should flag unused param nested func expr", function(callback) {
							var topic = "var v = function() {var c = function(a) {};};";
							var config = { rules: {} };
							config.rules[RULE_ID] = 1;
							validate({buffer: topic, callback: callback, config: config}).then(
								function (problems) {
									assertProblems(problems, [
									{
										id: RULE_ID,
										severity: 'warning',
										description: "Parameter 'a' is never used.",
										nodeType: "Identifier"
									}]);
								},
								function (error) {
									worker.getTestState().callback(error);
								});
						});
						it("Should flag unused param closed simple func expr", function(callback) {
							var topic = "var v = function(a) {};";
							var config = { rules: {} };
							config.rules[RULE_ID] = 1;
							validate({buffer: topic, callback: callback, config: config}).then(
								function (problems) {
									assertProblems(problems, [
									{
										id: RULE_ID,
										severity: 'warning',
										description: "Parameter 'a' is never used.",
										nodeType: "Identifier"
									}]);
								},
								function (error) {
									worker.getTestState().callback(error);
								});
						});
						it("Should flag unused param in closed nested func expr", function(callback) {
							var topic = "var v = function() {var c = function(a) {};};";
							var config = { rules: {} };
							config.rules[RULE_ID] = 1;
							validate({buffer: topic, callback: callback, config: config}).then(
								function (problems) {
									assertProblems(problems, [
									{
										id: RULE_ID,
										severity: 'warning',
										description: "Parameter 'a' is never used.",
										nodeType: "Identifier"
									}]);
								},
								function (error) {
									worker.getTestState().callback(error);
								});
						});
						it("Should flag unused param object prop func expr ", function(callback) {
							var topic = "var v = {one: function(a) {}};";
							var config = { rules: {} };
							config.rules[RULE_ID] = 1;
							validate({buffer: topic, callback: callback, config: config}).then(
								function (problems) {
									assertProblems(problems, [
									{
										id: RULE_ID,
										severity: 'warning',
										description: "Parameter 'a' is never used.",
										nodeType: "Identifier"
									}]);
								},
								function (error) {
									worker.getTestState().callback(error);
								});
						});
						it("Should flag unused param closed object prop func expr", function(callback) {
							var topic = "var v = {one: function(a) {}};";
							var config = { rules: {} };
							config.rules[RULE_ID] = 1;
							validate({buffer: topic, callback: callback, config: config}).then(
								function (problems) {
									assertProblems(problems, [
									{
										id: RULE_ID,
										severity: 'warning',
										description: "Parameter 'a' is never used.",
										nodeType: "Identifier"
									}]);
								},
								function (error) {
									worker.getTestState().callback(error);
								});
						});
						it("Should flag unused param nested object prop func expr", function(callback) {
							var topic = "var v = {one: function() {var c = {two: function(a) {}};}};";
							var config = { rules: {} };
							config.rules[RULE_ID] = 1;
							validate({buffer: topic, callback: callback, config: config}).then(
								function (problems) {
									assertProblems(problems, [
									{
										id: RULE_ID,
										severity: 'warning',
										description: "Parameter 'a' is never used.",
										nodeType: "Identifier"
									}]);
								},
								function (error) {
									worker.getTestState().callback(error);
								});
						});
						it("Should flag unused param closed nested object prop func expr", function(callback) {
							var topic = "var v = {one: function() {var c = {two: function(a) {}};}};";
							var config = { rules: {} };
							config.rules[RULE_ID] = 1;
							validate({buffer: topic, callback: callback, config: config}).then(
								function (problems) {
									assertProblems(problems, [
									{
										id: RULE_ID,
										severity: 'warning',
										description: "Parameter 'a' is never used.",
										nodeType: "Identifier"
									}]);
								},
								function (error) {
									worker.getTestState().callback(error);
								});
						});
						it("Should flag unused param func expr as param", function(callback) {
							var topic = "function f() {}f(function(a) {});";
							var config = { rules: {} };
							config.rules[RULE_ID] = 1;
							validate({buffer: topic, callback: callback, config: config}).then(
								function (problems) {
									assertProblems(problems, [
									{
										id: RULE_ID,
										severity: 'warning',
										description: "Parameter 'a' is never used.",
										nodeType: "Identifier"
									}]);
								},
								function (error) {
									worker.getTestState().callback(error);
								});
						});
						/**
						 * https://bugs.eclipse.org/bugs/show_bug.cgi?id=457067
						 */
						it("Should flag unused param func expr as call expression in property", function(callback) {
							var topic = "var c = {fn: function(a) {}.bind(this)};";
							var config = { rules: {} };
							config.rules[RULE_ID] = 1;
							validate({buffer: topic, callback: callback, config: config}).then(
								function (problems) {
									assertProblems(problems, [
									{
										id: RULE_ID,
										severity: 'warning',
										description: "Parameter 'a' is never used.",
										nodeType: "Identifier"
									}]);
								},
								function (error) {
									worker.getTestState().callback(error);
								});
						});
						/**
						 * https://bugs.eclipse.org/bugs/show_bug.cgi?id=457067
						 */
						it("Should flag unused param func expr as call expression in call expression", function(callback) {
							var topic = "define('foo', function(a){}.bind(this));";
							var config = { rules: {} };
							config.rules[RULE_ID] = 1;
							validate({buffer: topic, callback: callback, config: config}).then(
								function (problems) {
									assertProblems(problems, [
									{
										id: RULE_ID,
										severity: 'warning',
										description: "Parameter 'a' is never used.",
										nodeType: "Identifier"
									}]);
								},
								function (error) {
									worker.getTestState().callback(error);
								});
						});
						/**
						 * https://bugs.eclipse.org/bugs/show_bug.cgi?id=457067
						 */
						it("Should flag unused param func decl as call expression in closure with @callback", function(callback) {
							var topic = "(function f(a) {}).bind(this);";
							var config = { rules: {} };
							config.rules[RULE_ID] = 1;
							validate({buffer: topic, callback: callback, config: config}).then(
								function (problems) {
									assertProblems(problems, [
									{
										id: RULE_ID,
										severity: 'warning',
										description: "Parameter 'a' is never used.",
										nodeType: "Identifier"
									}]);
								},
								function (error) {
									worker.getTestState().callback(error);
								});
						});
						/**
						 * https://bugs.eclipse.org/bugs/show_bug.cgi?id=457067
						 */
						it("Should flag unused param func decl as closure call expression with @callback", function(callback) {
							var topic = "(function f(a) {})();";
							var config = { rules: {} };
							config.rules[RULE_ID] = 1;
							validate({buffer: topic, callback: callback, config: config}).then(
								function (problems) {
									assertProblems(problems, [
									{
										id: RULE_ID,
										severity: 'warning',
										description: "Parameter 'a' is never used.",
										nodeType: "Identifier"
									}]);
								},
								function (error) {
									worker.getTestState().callback(error);
								});
						});
						it("Should not flag used param simple use func decl", function(callback) {
							var topic = "function f(a) {var b = a;}";
							var config = { rules: {} };
							config.rules[RULE_ID] = 1;
							validate({buffer: topic, callback: callback, config: config}).then(
								function (problems) {
									assertProblems(problems, []);
								},
								function (error) {
									worker.getTestState().callback(error);
								});
						});
						it("Should not flag used param closed simple use func decl", function(callback) {
							var topic = "(function f(a) {var b = a;});";
							var config = { rules: {} };
							config.rules[RULE_ID] = 1;
							validate({buffer: topic, callback: callback, config: config}).then(
								function (problems) {
									assertProblems(problems, []);
								},
								function (error) {
									worker.getTestState().callback(error);
								});
						});
						it("Should not flag used param nested use func decl", function(callback) {
							var topic = "function f(a) {function g() {var b = a;}}";
							var config = { rules: {} };
							config.rules[RULE_ID] = 1;
							validate({buffer: topic, callback: callback, config: config}).then(
								function (problems) {
									assertProblems(problems, []);
								},
								function (error) {
									worker.getTestState().callback(error);
								});
						});
						it("Should not flag used param closed nested use func decl", function(callback) {
							var topic = "(function f(a) {function g() {var b = a;}});";
							var config = { rules: {} };
							config.rules[RULE_ID] = 1;
							validate({buffer: topic, callback: callback, config: config}).then(
								function (problems) {
									assertProblems(problems, []);
								},
								function (error) {
									worker.getTestState().callback(error);
								});
						});
						it("Should not flag used param simple use func expr", function(callback) {
							var topic = "var v = function(a) {var b = a;};";
							var config = { rules: {} };
							config.rules[RULE_ID] = 1;
							validate({buffer: topic, callback: callback, config: config}).then(
								function (problems) {
									assertProblems(problems, []);
								},
								function (error) {
									worker.getTestState().callback(error);
								});
						});
						it("Should not flag used param closed simple use func expr", function(callback) {
							var topic = "var v = function(a) {var b = a;};";
							var config = { rules: {} };
							config.rules[RULE_ID] = 1;
							validate({buffer: topic, callback: callback, config: config}).then(
								function (problems) {
									assertProblems(problems, []);
								},
								function (error) {
									worker.getTestState().callback(error);
								});
						});
						it("Should not flag used param nested use func expr", function(callback) {
							var topic = "var v = function(a) {var c = function() {var b = a;};};";
							var config = { rules: {} };
							config.rules[RULE_ID] = 1;
							validate({buffer: topic, callback: callback, config: config}).then(
								function (problems) {
									assertProblems(problems, []);
								},
								function (error) {
									worker.getTestState().callback(error);
								});
						});
						it("Should not flag used param closed nested use func expr", function(callback) {
							var topic = "var v = function(a) {var c = function() {var b = a;};};";
							var config = { rules: {} };
							config.rules[RULE_ID] = 1;
							validate({buffer: topic, callback: callback, config: config}).then(
								function (problems) {
									assertProblems(problems, []);
								},
								function (error) {
									worker.getTestState().callback(error);
								});
						});
						it("Should not flag used param object prop simple use func expr", function(callback) {
							var topic = "var v = {one: function(a) {var b = a;}};";
							var config = { rules: {} };
							config.rules[RULE_ID] = 1;
							validate({buffer: topic, callback: callback, config: config}).then(
								function (problems) {
									assertProblems(problems, []);
								},
								function (error) {
									worker.getTestState().callback(error);
								});
						});
						it("Should not flag used param object prop closed simple use func expr", function(callback) {
							var topic = "var v = {one: function(a) {var b = a;}};";
							var config = { rules: {} };
							config.rules[RULE_ID] = 1;
							validate({buffer: topic, callback: callback, config: config}).then(
								function (problems) {
									assertProblems(problems, []);
								},
								function (error) {
									worker.getTestState().callback(error);
								});
						});
						it("Should not flag used param object prop nested use func expr", function(callback) {
							var topic = "var v = {one: function(a) {var c = {two: function() {var b = a;}};}};";
							var config = { rules: {} };
							config.rules[RULE_ID] = 1;
							validate({buffer: topic, callback: callback, config: config}).then(
								function (problems) {
									assertProblems(problems, []);
								},
								function (error) {
									worker.getTestState().callback(error);
								});
						});
						it("Should not flag used param object prop closed nested use func expr", function(callback) {
							var topic = "var v = {one: function(a) {var c = {two: function() {var b = a;}};}};";
							var config = { rules: {} };
							config.rules[RULE_ID] = 1;
							validate({buffer: topic, callback: callback, config: config}).then(
								function (problems) {
									assertProblems(problems, []);
								},
								function (error) {
									worker.getTestState().callback(error);
								});
						});
						it("Should not flag used param func expr param", function(callback) {
							var topic = "function f() {}f(function(a) {var b = a;});";
							var config = { rules: {} };
							config.rules[RULE_ID] = 1;
							validate({buffer: topic, callback: callback, config: config}).then(
								function (problems) {
									assertProblems(problems, []);
								},
								function (error) {
									worker.getTestState().callback(error);
								});
						});
						/**
						 * https://bugs.eclipse.org/bugs/show_bug.cgi?id=457067
						 */
						it("Should not flag unused param func expr as call expression in property with @callback", function(callback) {
							var topic = "var c = {fn: /** @callback */ function(a) {}.bind(this)};";
							var config = { rules: {} };
							config.rules[RULE_ID] = 1;
							validate({buffer: topic, callback: callback, config: config}).then(
								function (problems) {
									assertProblems(problems, []);
								},
								function (error) {
									worker.getTestState().callback(error);
								});
						});
						/**
						 * https://bugs.eclipse.org/bugs/show_bug.cgi?id=484334
						 */
						it("Should not flag unused param func expr as call expression in property with @public", function(callback) {
							var topic = "var c = {fn: /** @public */ function(a) {}.bind(this)};";
							var config = { rules: {} };
							config.rules[RULE_ID] = 1;
							validate({buffer: topic, callback: callback, config: config}).then(
								function (problems) {
									assertProblems(problems, []);
								},
								function (error) {
									worker.getTestState().callback(error);
								});
						});
						/**
						 * https://bugs.eclipse.org/bugs/show_bug.cgi?id=457067
						 */
						it("Should not flag unused param func expr as call expression in call expression with @callback", function(callback) {
							var topic = "define('foo', /** @callback */function(a){}.bind(this));";
							var config = { rules: {} };
							config.rules[RULE_ID] = 1;
							validate({buffer: topic, callback: callback, config: config}).then(
								function (problems) {
									assertProblems(problems, []);
								},
								function (error) {
									worker.getTestState().callback(error);
								});
						});
						/**
						 * https://bugs.eclipse.org/bugs/show_bug.cgi?id=484334
						 */
						it("Should not flag unused param func expr as call expression in call expression with @public", function(callback) {
							var topic = "define('foo', /** @public */function(a){}.bind(this));";
							var config = { rules: {} };
							config.rules[RULE_ID] = 1;
							validate({buffer: topic, callback: callback, config: config}).then(
								function (problems) {
									assertProblems(problems, []);
								},
								function (error) {
									worker.getTestState().callback(error);
								});
						});
						/**
						 * https://bugs.eclipse.org/bugs/show_bug.cgi?id=494783
						 */
						it("Should not fail to resolve require(..)", function(callback) {
							var topic = 'define(function(require) {var p = "foo"; require(p);});';
							var config = { rules: {} };
							config.rules[RULE_ID] = 1;
							validate({buffer: topic, callback: callback, config: config}).then(
								function (problems) {
									assertProblems(problems, []);
								},
								function (error) {
									worker.getTestState().callback(error);
								});
						});
						/**
						 * https://bugs.eclipse.org/bugs/show_bug.cgi?id=457067
						 */
						it("Should not flag unused param func decl as call expression in closure with @callback", function(callback) {
							var topic = "(/* @callback */ function f(a) {}).bind(this);";
							var config = { rules: {} };
							config.rules[RULE_ID] = 1;
							validate({buffer: topic, callback: callback, config: config}).then(
								function (problems) {
									assertProblems(problems, []);
								},
								function (error) {
									worker.getTestState().callback(error);
								});
						});
						/**
						 * https://bugs.eclipse.org/bugs/show_bug.cgi?id=484334
						 */
						it("Should not flag unused param func decl as call expression in closure with @public", function(callback) {
							var topic = "(/* @public */ function f(a) {}).bind(this);";
							var config = { rules: {} };
							config.rules[RULE_ID] = 1;
							validate({buffer: topic, callback: callback, config: config}).then(
								function (problems) {
									assertProblems(problems, []);
								},
								function (error) {
									worker.getTestState().callback(error);
								});
						});
						/**
						 * https://bugs.eclipse.org/bugs/show_bug.cgi?id=457067
						 */
						it("Should not flag unused param func decl as closure call expression with @callback", function(callback) {
							var topic = "(/* @callback */ function f(a) {})();";
							var config = { rules: {} };
							config.rules[RULE_ID] = 1;
							validate({buffer: topic, callback: callback, config: config}).then(
								function (problems) {
									assertProblems(problems, []);
								},
								function (error) {
									worker.getTestState().callback(error);
								});
						});
						/**
						 * https://bugs.eclipse.org/bugs/show_bug.cgi?id=484334
						 */
						it("Should not flag unused param func decl as closure call expression with @public", function(callback) {
							var topic = "(/* @public */ function f(a) {})();";
							var config = { rules: {} };
							config.rules[RULE_ID] = 1;
							validate({buffer: topic, callback: callback, config: config}).then(
								function (problems) {
									assertProblems(problems, []);
								},
								function (error) {
									worker.getTestState().callback(error);
								});
						});
						/**
						 * @see https://bugs.eclipse.org/bugs/show_bug.cgi?id=473790
						 * @since 10.0
						 */
						it("Should not flag unused param func expr assignment with @callback 1", function(callback) {
							var topic = "/** @callback */a.b.c = function(p1) {};";
							var config = { rules: {} };
							config.rules[RULE_ID] = 1;
							validate({buffer: topic, callback: callback, config: config}).then(
								function (problems) {
									assertProblems(problems, []);
								},
								function (error) {
									worker.getTestState().callback(error);
								});
						});
						/**
						 * @see https://bugs.eclipse.org/bugs/show_bug.cgi?id=484334
						 * @since 10.0
						 */
						it("Should not flag unused param func expr assignment with @public 1", function(callback) {
							var topic = "/** @public */a.b.c = function(p1) {};";
							var config = { rules: {} };
							config.rules[RULE_ID] = 1;
							validate({buffer: topic, callback: callback, config: config}).then(
								function (problems) {
									assertProblems(problems, []);
								},
								function (error) {
									worker.getTestState().callback(error);
								});
						});
						/**
						 * @see https://bugs.eclipse.org/bugs/show_bug.cgi?id=473790
						 * @since 10.0
						 */
						it("Should not flag unused param func expr assignment with @callback 2", function(callback) {
							var topic = "/** @callback */f = function(p1) {};";
							var config = { rules: {} };
							config.rules[RULE_ID] = 1;
							validate({buffer: topic, callback: callback, config: config}).then(
								function (problems) {
									assertProblems(problems, []);
								},
								function (error) {
									worker.getTestState().callback(error);
								});
						});
						/**
						 * @see https://bugs.eclipse.org/bugs/show_bug.cgi?id=484334
						 * @since 10.0
						 */
						it("Should not flag unused param func expr assignment with @public 2", function(callback) {
							var topic = "/** @public */f = function(p1) {};";
							var config = { rules: {} };
							config.rules[RULE_ID] = 1;
							validate({buffer: topic, callback: callback, config: config}).then(
								function (problems) {
									assertProblems(problems, []);
								},
								function (error) {
									worker.getTestState().callback(error);
								});
						});
						/**
						 * @see https://bugs.eclipse.org/bugs/show_bug.cgi?id=473790
						 * @since 10.0
						 */
						it("Should not flag unused param func expr assignment with @callback 3", function(callback) {
							var topic = "/** @callback */var f = function(p1, p2) {};";
							var config = { rules: {} };
							config.rules[RULE_ID] = 1;
							validate({buffer: topic, callback: callback, config: config}).then(
								function (problems) {
									assertProblems(problems, []);
								},
								function (error) {
									worker.getTestState().callback(error);
								});
						});
						/**
						 * @see https://bugs.eclipse.org/bugs/show_bug.cgi?id=484334
						 * @since 10.0
						 */
						it("Should not flag unused param func expr assignment with @public 3", function(callback) {
							var topic = "/** @public */var f = function(p1, p2) {};";
							var config = { rules: {} };
							config.rules[RULE_ID] = 1;
							validate({buffer: topic, callback: callback, config: config}).then(
								function (problems) {
									assertProblems(problems, []);
								},
								function (error) {
									worker.getTestState().callback(error);
								});
						});
						/**
						 * @see https://bugs.eclipse.org/bugs/show_bug.cgi?id=473790
						 * @since 10.0
						 */
						it("Should not flag unused param func expr assignment with @callback 4", function(callback) {
							var topic = "var f = 10, /** @callback */g = function(p1, p2) {};";
							var config = { rules: {} };
							config.rules[RULE_ID] = 1;
							validate({buffer: topic, callback: callback, config: config}).then(
								function (problems) {
									assertProblems(problems, []);
								},
								function (error) {
									worker.getTestState().callback(error);
								});
						});
						/**
						 * @see https://bugs.eclipse.org/bugs/show_bug.cgi?id=484334
						 * @since 10.0
						 */
						it("Should not flag unused param func expr assignment with @public 4", function(callback) {
							var topic = "var f = 10, /** @public */g = function(p1, p2) {};";
							var config = { rules: {} };
							config.rules[RULE_ID] = 1;
							validate({buffer: topic, callback: callback, config: config}).then(
								function (problems) {
									assertProblems(problems, []);
								},
								function (error) {
									worker.getTestState().callback(error);
								});
						});
						/**
						 * @see https://bugs.eclipse.org/bugs/show_bug.cgi?id=473790
						 * @since 10.0
						 */
						it("Should not flag unused param func expr assignment with @callback 5", function(callback) {
							var topic = "var f = { /** @callback */one: function(p, p2, p3) {p(); p2();}};";
							var config = { rules: {} };
							config.rules[RULE_ID] = 1;
							validate({buffer: topic, callback: callback, config: config}).then(
								function (problems) {
									assertProblems(problems, []);
								},
								function (error) {
									worker.getTestState().callback(error);
								});
						});
						/**
						 * @see https://bugs.eclipse.org/bugs/show_bug.cgi?id=484334
						 * @since 10.0
						 */
						it("Should not flag unused param func expr assignment with @public 5", function(callback) {
							var topic = "var f = { /** @public */one: function(p, p2, p3) {p(); p2();}};";
							var config = { rules: {} };
							config.rules[RULE_ID] = 1;
							validate({buffer: topic, callback: callback, config: config}).then(
								function (problems) {
									assertProblems(problems, []);
								},
								function (error) {
									worker.getTestState().callback(error);
								});
						});
						/**
						 * @since 10.0
						 * @see https://bugs.eclipse.org/bugs/show_bug.cgi?id=460728
						 */
						it("Should not flag used param  - ArrowFunctionExpression 1", function(callback) {
							var topic = "(arr.map(() => {a => {a.length}}));";
							var config = { rules: {} };
							config.rules[RULE_ID] = 1;
							validate({buffer: topic, callback: callback, config: config}).then(
								function (problems) {
									assertProblems(problems, []);
								},
								function (error) {
									worker.getTestState().callback(error);
								});
						});
						/**
						 * @since 10.0
						 * @see https://bugs.eclipse.org/bugs/show_bug.cgi?id=460728
						 */
						it("Should not flag used param - ArrowFunctionExpression 2", function(callback) {
							var topic = "var simple = a => a > 15 ? 15 : a;";
							var config = { rules: {} };
							config.rules[RULE_ID] = 1;
							validate({buffer: topic, callback: callback, config: config}).then(
								function (problems) {
									assertProblems(problems, []);
								},
								function (error) {
									worker.getTestState().callback(error);
								});
						});
					});
			
					//NO-UNUSED-VARS --------------------------------------------
					describe('no-unused-vars', function() {
						var RULE_ID = "no-unused-vars";
						it("flag unused var in Program", function(callback) {
							var topic = "var a;";
							var config = { rules: {} };
							config.rules[RULE_ID] = 1;
							validate({buffer: topic, callback: callback, config: config}).then(
								function (problems) {
									assertProblems(problems, [
									{
										id: RULE_ID,
										severity: 'warning',
										description: "'a' is unused.",
										nodeType: "Identifier"
									}]);
								},
								function (error) {
									worker.getTestState().callback(error);
								});
						});
						it("flag unused var in FunctionExpression", function(callback) {
							var topic = "(function() { var a; }); ";
							var config = { rules: {} };
							config.rules[RULE_ID] = 1;
							validate({buffer: topic, callback: callback, config: config}).then(
								function (problems) {
									assertProblems(problems, [
									{
										id: RULE_ID,
										severity: 'warning',
										description: "'a' is unused.",
										nodeType: "Identifier"
									}]);
								},
								function (error) {
									worker.getTestState().callback(error);
								});
						});
						it("flag unused var in FunctionDeclaration", function(callback) {
							var topic = "function f() {var b;} f();";
							var config = { rules: {} };
							config.rules[RULE_ID] = 1;
							validate({buffer: topic, callback: callback, config: config}).then(
								function (problems) {
									assertProblems(problems, [
									{
										id: RULE_ID,
										severity: 'warning',
										description: "'b' is unused.",
										nodeType: "Identifier"
									}]);
								},
								function (error) {
									worker.getTestState().callback(error);
								});
						});
						it("flag var that is written but never read", function(callback) {
							var topic = "var a=1; a=2;";
							var config = { rules: {} };
							config.rules[RULE_ID] = 1;
							validate({buffer: topic, callback: callback, config: config}).then(
								function (problems) {
									assertProblems(problems, [
									{
										id: RULE_ID,
										severity: 'warning',
										description: "'a' is unread.",
										nodeType: "Identifier"
									}]);
								},
								function (error) {
									worker.getTestState().callback(error);
								});
						});
						it("flag function that is never called", function(callback) {
							var topic = "function f() {}";
							var config = { rules: {} };
							config.rules[RULE_ID] = 1;
							validate({buffer: topic, callback: callback, config: config}).then(
								function (problems) {
									assertProblems(problems, [
									{
										id: RULE_ID,
										severity: 'warning',
										description: "Function 'f' is unused.",
										nodeType: "Identifier"
									}]);
								},
								function (error) {
									worker.getTestState().callback(error);
								});
						});
				
						it("should not flag unused param in FunctionExpression", function(callback) {
							var topic = "(function(a) {} ());";
							var config = { rules: {} };
							config.rules[RULE_ID] = 1;
							validate({buffer: topic, callback: callback, config: config}).then(
								function (problems) {
									assertProblems(problems, []);
								},
								function (error) {
									worker.getTestState().callback(error);
								});
						});
						it("should not flag unused parameters in FunctionDeclaration", function(callback) {
							var topic = "function f(a, b) {} f();";
							var config = { rules: {} };
							config.rules[RULE_ID] = 1;
							validate({buffer: topic, callback: callback, config: config}).then(
								function (problems) {
									assertProblems(problems, []);
								},
								function (error) {
									worker.getTestState().callback(error);
								});
						});
						it("should not flag var that appears in an Expression context", function(callback) {
							var topic = "var a; a;";
							var config = { rules: {} };
							config.rules[RULE_ID] = 1;
							validate({buffer: topic, callback: callback, config: config}).then(
								function (problems) {
									assertProblems(problems, []);
								},
								function (error) {
									worker.getTestState().callback(error);
								});
						});
						it("should not flag function that is called", function(callback) {
							var topic = "function f() {} f();";
							var config = { rules: {} };
							config.rules[RULE_ID] = 1;
							validate({buffer: topic, callback: callback, config: config}).then(
								function (problems) {
									assertProblems(problems, []);
								},
								function (error) {
									worker.getTestState().callback(error);
								});
						});
						it("should not flag var from Program scope that is used in a child scope", function(callback) {
							var topic = "var a; (function() { a; });";
							var config = { rules: {} };
							config.rules[RULE_ID] = 1;
							validate({buffer: topic, callback: callback, config: config}).then(
								function (problems) {
									assertProblems(problems, []);
								},
								function (error) {
									worker.getTestState().callback(error);
								});
						});
						it("should not flag var from upper scope that is used in a child scope", function(callback) {
							var topic = "(function() { var a; (function() { a; }); });";
							var config = { rules: {} };
							config.rules[RULE_ID] = 1;
							validate({buffer: topic, callback: callback, config: config}).then(
								function (problems) {
									assertProblems(problems, []);
								},
								function (error) {
									worker.getTestState().callback(error);
								});
						});
						it("should not flag var that is used in a read+write reference", function(callback) {
							var topic = "var b; b=1; a.foo = b++;";
							var config = { rules: {} };
							config.rules[RULE_ID] = 1;
							validate({buffer: topic, callback: callback, config: config}).then(
								function (problems) {
									assertProblems(problems, []);
								},
								function (error) {
									worker.getTestState().callback(error);
								});
						});
						it("should not flag var that has exported comment block", function(callback) {
							var topic = "/* exported */\nvar a;";
							var config = { rules: {} };
							config.rules[RULE_ID] = 1;
							validate({buffer: topic, callback: callback, config: config}).then(
								function (problems) {
									assertProblems(problems, [
									]);
								},
								function (error) {
									worker.getTestState().callback(error);
								});
						});
						it("should not flag var that has exported comment multiple", function(callback) {
							var topic = "// blargh\n/* exported */\n/* another comment */var a;";
							var config = { rules: {} };
							config.rules[RULE_ID] = 1;
							validate({buffer: topic, callback: callback, config: config}).then(
								function (problems) {
									assertProblems(problems, [
									]);
								},
								function (error) {
									worker.getTestState().callback(error);
								});
						});
						it("should not flag var that has exported comment casing", function(callback) {
							var topic = "/* eXPOrtED */\nvar a;";
							var config = { rules: {} };
							config.rules[RULE_ID] = 1;
							validate({buffer: topic, callback: callback, config: config}).then(
								function (problems) {
									assertProblems(problems, [
									]);
								},
								function (error) {
									worker.getTestState().callback(error);
								});
						});
						it("flag var that has comment without exported keyword", function(callback) {
							var topic = "// this is not exFOOported\nvar a;";
							var config = { rules: {} };
							config.rules[RULE_ID] = 1;
							validate({buffer: topic, callback: callback, config: config}).then(
								function (problems) {
									assertProblems(problems, [
									{
										id: RULE_ID,
										severity: 'warning',
										description: "'a' is unused.",
										nodeType: "Identifier"
									}
									]);
								},
								function (error) {
									worker.getTestState().callback(error);
								});
						});
						
						it("no-unused var cross file 1 - should not report unused function when used in a known html file", function(callback) {
							worker.postMessage(
								{
									request: 'addFile',
									args: {
										file: "noUndefTest1.html",
										source:
											"<html>\n" +
											"<body onload=\"main()\">\n" +
											"	<div>\n" +
											"		Test page\n" +
											"	</div>\n" +
											"</body>\n" +
											"</html>"
									}
								});
							var topic =
								"/*eslint-env browser */\n" +
								"function main() {\n" +
								"	alert (\"Hello\");\n" +
								"}";
							var config = { rules: {} };
							config.rules[RULE_ID] = 1;
							validate({buffer: topic, callback: callback, config: config}).then(
								function (problems) {
									assertProblems(problems, []);
								},
								function (error) {
									worker.getTestState().callback(error);
								}
							);
						});
						it("no-unused-vars import", function(callback) {
							var topic = 'import { cube } from "./exports"; cube(4)';
							var config = { rules: {} };
							var createFiles = [{name: './exports', text: 'export function cube(x) {return x * x * x;}'}];
							config.rules[RULE_ID] = 2;
							validate({buffer: topic, callback: callback, config: config, createFiles: createFiles}).then(
								function (problems) {
									assertProblems(problems, [
									{
										id: "forbiddenExportImport",
										severity: 'error',
										description: '\'import\' and \'export\' may appear only with \'sourceType: module\'',
										start: 0,
										end: 6
									}]);
								},
								function (error) {
									worker.getTestState().callback(error);
								});
						});
					});
			
				//NO-USE-BEFORE-DEFINE ----------------------------------------------------
					describe('no-use-before-define', function() {
						var RULE_ID = "no-use-before-define";
						it("should not flag reference to builtin", function(callback) {
							var topic = "isNaN(Math.sqrt(-1)); Object.keys(a);";
							var config = { rules: {} };
							config.rules[RULE_ID] = 1;
							validate({buffer: topic, callback: callback, config: config}).then(
								function (problems) {
									assertProblems(problems, []);
								},
								function (error) {
									worker.getTestState().callback(error);
								});
						});
						it("should not flag reference to parameter", function(callback) {
							var topic = "(function(a) { a; }())";
							var config = { rules: {} };
							config.rules[RULE_ID] = 1;
							validate({buffer: topic, callback: callback, config: config}).then(
								function (problems) {
									assertProblems(problems, []);
								},
								function (error) {
									worker.getTestState().callback(error);
								});
						});
						it("should not flag reference to 'arguments' object", function(callback) {
							var topic = "(function() { arguments; }())";
							var config = { rules: {} };
							config.rules[RULE_ID] = 1;
							validate({buffer: topic, callback: callback, config: config}).then(
								function (problems) {
									assertProblems(problems, []);
								},
								function (error) {
									worker.getTestState().callback(error);
								});
						});
						it("should flag var use that precedes declaration in Program", function(callback) {
							var topic = "a; var a;";
							var config = { rules: {} };
							config.rules[RULE_ID] = 1;
							validate({buffer: topic, callback: callback, config: config}).then(
								function (problems) {
									assertProblems(problems, [
									{
										id: RULE_ID,
										severity: 'warning',
										description: "'a' was used before it was defined.",
										nodeType: "Identifier"
									}]);
								},
								function (error) {
									worker.getTestState().callback(error);
								});
						});
						it("should flag var use that precedes declaration in ArrowExpression", function(callback) {
							var topic = "f => a++; var a;";
							var config = { rules: {} };
							config.rules[RULE_ID] = 1;
							validate({buffer: topic, callback: callback, config: config}).then(
								function (problems) {
									assertProblems(problems, [
									{
										id: RULE_ID,
										severity: 'warning',
										description: "'a' was used before it was defined.",
										nodeType: "Identifier"
									}]);
								},
								function (error) {
									worker.getTestState().callback(error);
								});
						});
						it("should not flag var use in ArrowExpression", function(callback) {
							var topic = "var a; f => a++;";
							var config = { rules: {} };
							config.rules[RULE_ID] = 1;
							validate({buffer: topic, callback: callback, config: config}).then(
								function (problems) {
									assertProblems(problems, [
									]);
								},
								function (error) {
									worker.getTestState().callback(error);
								});
						});
						it("should flag var use that precedes declaration in blocked ArrowExpression", function(callback) {
							var topic = "f => {a++; var a;};";
							var config = { rules: {} };
							config.rules[RULE_ID] = 1;
							validate({buffer: topic, callback: callback, config: config}).then(
								function (problems) {
									assertProblems(problems, [
									{
										id: RULE_ID,
										severity: 'warning',
										description: "'a' was used before it was defined.",
										nodeType: "Identifier"
									}]);
								},
								function (error) {
									worker.getTestState().callback(error);
								});
						});
						it("should not flag var use in blocked ArrowExpression", function(callback) {
							var topic = "var a; f => {a++};";
							var config = { rules: {} };
							config.rules[RULE_ID] = 1;
							validate({buffer: topic, callback: callback, config: config}).then(
								function (problems) {
									assertProblems(problems, [
									]);
								},
								function (error) {
									worker.getTestState().callback(error);
								});
						});
						it("should flag var use that precedes declaration in FunctionDeclaration", function(callback) {
							var topic = "function f() { alert(a); var a; }";
							var config = { rules: {} };
							config.rules[RULE_ID] = 1;
							validate({buffer: topic, callback: callback, config: config}).then(
								function (problems) {
									assertProblems(problems, [
									{
										id: RULE_ID,
										severity: 'warning',
										description: "'a' was used before it was defined.",
										nodeType: "Identifier"
									}]);
								},
								function (error) {
									worker.getTestState().callback(error);
								});
						});
						it("should flag var use that precedes declaration in FunctionExpression", function(callback) {
							var topic = "(function() { a; var a; }());";
							var config = { rules: {} };
							config.rules[RULE_ID] = 1;
							validate({buffer: topic, callback: callback, config: config}).then(
								function (problems) {
									assertProblems(problems, [
									{
										id: RULE_ID,
										severity: 'warning',
										description: "'a' was used before it was defined.",
										nodeType: "Identifier"
									}]);
								},
								function (error) {
									worker.getTestState().callback(error);
								});
						});
						it("should not flag funcs", function(callback) {
							var topic = "f(); function f(){}";
							var config = { rules: {} };
							config.rules[RULE_ID] = 1;
							validate({buffer: topic, callback: callback, config: config}).then(
								function (problems) {
									assertProblems(problems, []);
								},
								function (error) {
									worker.getTestState().callback(error);
								});
						});
						it("should flag function call that precedes declaration in Program", function(callback) {
							var topic = "f(); function f() {}";
							var config = { rules: {} };
							config.rules[RULE_ID] = [1, false, true];
							validate({buffer: topic, callback: callback, config: config}).then(
								function (problems) {
									assertProblems(problems, [
									{
										id: RULE_ID,
										severity: 'warning',
										description: "'f' was used before it was defined.",
										nodeType: "Identifier"
									}]);
								},
								function (error) {
									worker.getTestState().callback(error);
								});
						});
						it("should flag function call that precedes function declaration in FunctionDeclaration", function(callback) {
							var topic = "function g() { f(); function f() {} }";
							var config = { rules: {} };
							config.rules[RULE_ID] = [1, false, true];
							validate({buffer: topic, callback: callback, config: config}).then(
								function (problems) {
									assertProblems(problems, [
									{
										id: RULE_ID,
										severity: 'warning',
										description: "'f' was used before it was defined.",
										nodeType: "Identifier"
									}]);
								},
								function (error) {
									worker.getTestState().callback(error);
								});
						});
						it("should not flag vars", function(callback) {
							var topic = "a; var a;";
							var config = { rules: {} };
							config.rules[RULE_ID] = [1, false, true];
							validate({buffer: topic, callback: callback, config: config}).then(
								function (problems) {
									assertProblems(problems, []);
								},
								function (error) {
									worker.getTestState().callback(error);
								});
						});
						it("should flag both", function(callback) {
							var topic = "a; f; var a; function f() {}";
							var config = { rules: {} };
							config.rules[RULE_ID] = 1;
							validate({buffer: topic, callback: callback, config: config}).then(
								function (problems) {
									assertProblems(problems, [
									{
										id: RULE_ID,
										severity: 'warning',
										description: "'a' was used before it was defined.",
										nodeType: "Identifier"
									}]);
								},
								function (error) {
									worker.getTestState().callback(error);
								});
						});
						it("should flag only vars", function(callback) {
							var topic = "a; f; var a; function f() {}";
							var config = { rules: {} };
							config.rules[RULE_ID] = 1;
							validate({buffer: topic, callback: callback, config: config}).then(
								function (problems) {
									assertProblems(problems, [
									{
										id: RULE_ID,
										severity: 'warning',
										description: "'a' was used before it was defined.",
										nodeType: "Identifier"
									}]);
								},
								function (error) {
									worker.getTestState().callback(error);
								});
						});
					});
					//no-with ------------------------------------------------
					describe('no-with', function() {
						var RULE_ID = "no-with";
						var MESSAGE = "Discouraged use of 'with' statement.";
						it("should flag with 1", function(callback) {
							var topic = "var a = 'a'; with(a) {}";
							var config = { rules: {} };
							config.rules[RULE_ID] = 1;
							validate({buffer: topic, callback: callback, config: config}).then(
								function (problems) {
									assertProblems(problems, [
									{
										id: RULE_ID,
										severity: 'warning',
										description: MESSAGE,
										nodeType: "WithStatement"
									}]);
								},
								function (error) {
									worker.getTestState().callback(error);
								});
						});
						it("should flag with 2", function(callback) {
							var topic = "if(true) {var a = 'a'; with(a) {}}";
							var config = { rules: {} };
							config.rules[RULE_ID] = 1;
							validate({buffer: topic, callback: callback, config: config}).then(
								function (problems) {
									assertProblems(problems, [
									{
										id: RULE_ID,
										severity: 'warning',
										description: MESSAGE,
										nodeType: "WithStatement"
									}]);
								},
								function (error) {
									worker.getTestState().callback(error);
								});
						});
					});
					//RADIX ------------------------------------------------
					describe('radix', function() {
						var RULE_ID = "radix";
						var MESSAGE = "Missing radix parameter.";
						it("should flag parseInt() called without radix", function(callback) {
							var topic = "parseInt()";
							var config = { rules: {} };
							config.rules[RULE_ID] = 1;
							validate({buffer: topic, callback: callback, config: config}).then(
								function (problems) {
									assertProblems(problems, [
									{
										id: RULE_ID,
										severity: 'warning',
										description: MESSAGE,
										nodeType: "Identifier"
									}]);
								},
								function (error) {
									worker.getTestState().callback(error);
								});
						});
						it("should not flag parseInt() called with radix", function(callback) {
							var topic = "parseInt('a', 10)";
							var config = { rules: {} };
							config.rules[RULE_ID] = 1;
							validate({buffer: topic, callback: callback, config: config}).then(
								function (problems) {
									assertProblems(problems, []);
								},
								function (error) {
									worker.getTestState().callback(error);
								});
						});
						it("should not flag - 1", function(callback) {
							var topic = "var parseInt; parseInt();";
							var config = { rules: {} };
							config.rules[RULE_ID] = 1;
							validate({buffer: topic, callback: callback, config: config}).then(
								function (problems) {
									assertProblems(problems, []);
								},
								function (error) {
									worker.getTestState().callback(error);
								});
						});
						it("should not flag - 2", function(callback) {
							var topic = "var parseInt; (function(){ parseInt(); }());";
							var config = { rules: {} };
							config.rules[RULE_ID] = 1;
							validate({buffer: topic, callback: callback, config: config}).then(
								function (problems) {
									assertProblems(problems, []);
								},
								function (error) {
									worker.getTestState().callback(error);
								});
						});
						it("should not flag - 3", function(callback) {
							var topic = "function f() { var parseInt; function g() { parseInt() } }";
							var config = { rules: {} };
							config.rules[RULE_ID] = 1;
							validate({buffer: topic, callback: callback, config: config}).then(
								function (problems) {
									assertProblems(problems, []);
								},
								function (error) {
									worker.getTestState().callback(error);
								});
						});
					});
			
					//SEMI ----------------------------------------------
					describe('semi', function() {
						var RULE_ID = "semi";
						/**
						 * @see https://bugs.eclipse.org/bugs/show_bug.cgi?id=495831
						 */
						it("recovered member expression ;", function(callback) {
							var topic = "var a = b.\nc d";
							var config = { rules: {} };
							config.rules[RULE_ID] = 1;
							validate({buffer: topic, callback: callback, config: config}).then(
								function (problems) {
									assertProblems(problems, [
									{
										id: undefined,
										severity: 'error',
										description: "Unexpected token"
									},
									{
										id: RULE_ID,
										severity: 'warning',
										description: "Missing semicolon.",
										nodeType: "VariableDeclaration"
									},
									{
										id: RULE_ID,
										severity: 'warning',
										description: "Missing semicolon.",
										nodeType: "ExpressionStatement"
									}]);
								},
								function (error) {
									worker.getTestState().callback(error);
								});
						});
						it("should flag variable declaration lacking ;", function(callback) {
							var topic = "var a=1";
							var config = { rules: {} };
							config.rules[RULE_ID] = 1;
							validate({buffer: topic, callback: callback, config: config}).then(
								function (problems) {
									assertProblems(problems, [
									{
										id: RULE_ID,
										severity: 'warning',
										description: "Missing semicolon.",
										nodeType: "VariableDeclaration"
									}]);
								},
								function (error) {
									worker.getTestState().callback(error);
								});
						});
						it("should flag variable declaration lacking ; with multiple declarators", function(callback) {
							var topic = "var a=1, b";
							var config = { rules: {} };
							config.rules[RULE_ID] = 1;
							validate({buffer: topic, callback: callback, config: config}).then(
								function (problems) {
									assertProblems(problems, [
									{
										id: RULE_ID,
										severity: 'warning',
										description: "Missing semicolon.",
										nodeType: "VariableDeclaration"
									}]);
								},
								function (error) {
									worker.getTestState().callback(error);
								});
						});
						it("should flag function call lacking ;", function(callback) {
							var topic = "x()";
							var config = { rules: {} };
							config.rules[RULE_ID] = 1;
							validate({buffer: topic, callback: callback, config: config}).then(
								function (problems) {
									assertProblems(problems, [
									{
										id: RULE_ID,
										severity: 'warning',
										description: "Missing semicolon.",
										nodeType: "ExpressionStatement"
									}]);
								},
								function (error) {
									worker.getTestState().callback(error);
								});
						});
						it("should flag throw statement lacking ;", function(callback) {
							var topic = "throw 1";
							var config = { rules: {} };
							config.rules[RULE_ID] = 1;
							validate({buffer: topic, callback: callback, config: config}).then(
								function (problems) {
									assertProblems(problems, [
									{
										id: RULE_ID,
										severity: 'warning',
										description: "Missing semicolon.",
										nodeType: "ThrowStatement"
									}]);
								},
								function (error) {
									worker.getTestState().callback(error);
								});
						});
						it("should flag bare expression lacking ;", function(callback) {
							var topic = "x";
							var config = { rules: {} };
							config.rules[RULE_ID] = 1;
							validate({buffer: topic, callback: callback, config: config}).then(
								function (problems) {
									assertProblems(problems, [
									{
										id: RULE_ID,
										severity: 'warning',
										description: "Missing semicolon.",
										nodeType: "ExpressionStatement"
									}]);
								},
								function (error) {
									worker.getTestState().callback(error);
								});
						});
						it("should flag 'for' with body statement lacking ;", function(callback) {
							var topic = "for (;;) { var x }";
							var config = { rules: {} };
							config.rules[RULE_ID] = 1;
							validate({buffer: topic, callback: callback, config: config}).then(
								function (problems) {
									assertProblems(problems, [
									{
										id: RULE_ID,
										severity: 'warning',
										description: "Missing semicolon.",
										nodeType: "VariableDeclaration"
									}]);
								},
								function (error) {
									worker.getTestState().callback(error);
								});
						});
						it("should flag var x;ny()", function(callback) {
							var topic = "var x;\ny()";
							var config = { rules: {} };
							config.rules[RULE_ID] = 1;
							validate({buffer: topic, callback: callback, config: config}).then(
								function (problems) {
									assertProblems(problems, [
									{
										id: RULE_ID,
										severity: 'warning',
										description: "Missing semicolon.",
										nodeType: "ExpressionStatement"
									}]);
								},
								function (error) {
									worker.getTestState().callback(error);
								});
						});
						it("should indicate the problematic token in 'related' field", function(callback) {
							var topic = "f(1)";
							var config = { rules: {} };
							config.rules[RULE_ID] = 1;
							validate({buffer: topic, callback: callback, config: config}).then(
								function (problems) {
									assertProblems(problems, [
									{
										id: RULE_ID,
										severity: 'warning',
										description: "Missing semicolon.",
										start: 3,
										end: 4
									}]);
								},
								function (error) {
									worker.getTestState().callback(error);
								});
						});
						/**
						 * @see https://bugs.eclipse.org/bugs/show_bug.cgi?id=427930
						 */
						it("should indicate the problematic token in return of call expression", function(callback) {
							var topic = "function f() {return f()}";
							var config = { rules: {} };
							config.rules[RULE_ID] = 1;
							validate({buffer: topic, callback: callback, config: config}).then(
								function (problems) {
									assertProblems(problems, [
									{
										id: RULE_ID,
										severity: 'warning',
										description: "Missing semicolon.",
										start: 23,
										end: 24
									}]);
								},
								function (error) {
									worker.getTestState().callback(error);
								});
						});
						/**
						 * @see https://bugs.eclipse.org/bugs/show_bug.cgi?id=427930
						 */
						it("should indicate the problematic token in return of object", function(callback) {
							var topic = "function f2() {return {}}";
							var config = { rules: {} };
							config.rules[RULE_ID] = 1;
							validate({buffer: topic, callback: callback, config: config}).then(
								function (problems) {
									assertProblems(problems, [
									{
										id: RULE_ID,
										severity: 'warning',
										description: "Missing semicolon.",
										start: 23,
										end: 24
									}]);
								},
								function (error) {
									worker.getTestState().callback(error);
								});
						});
						/**
						 * @see https://bugs.eclipse.org/bugs/show_bug.cgi?id=427930
						 */
						it("should indicate the problematic token in return of string", function(callback) {
							var topic = "function f3() {return 'foo'}";
							var config = { rules: {} };
							config.rules[RULE_ID] = 1;
							validate({buffer: topic, callback: callback, config: config}).then(
								function (problems) {
									assertProblems(problems, [
									{
										id: RULE_ID,
										severity: 'warning',
										start: 22,
										end: 27
									}]);
								},
								function (error) {
									worker.getTestState().callback(error);
								});
						});
						/**
						 * @see https://bugs.eclipse.org/bugs/show_bug.cgi?id=427930
						 */
						it("should indicate the problematic token in return of number", function(callback) {
							var topic = "function f4() {return 2}";
							var config = { rules: {} };
							config.rules[RULE_ID] = 1;
							validate({buffer: topic, callback: callback, config: config}).then(
								function (problems) {
									assertProblems(problems, [
									{
										id: RULE_ID,
										severity: 'warning',
										start: 22,
										end: 23
									}]);
								},
								function (error) {
									worker.getTestState().callback(error);
								});
						});
						/**
						 * @see https://bugs.eclipse.org/bugs/show_bug.cgi?id=427930
						 */
						it("should indicate the problematic token in function expression return of number", function(callback) {
							var topic = "var o = {f: function() {return 2}};o.f = null;";
							var config = { rules: {} };
							config.rules[RULE_ID] = 1;
							validate({buffer: topic, callback: callback, config: config}).then(
								function (problems) {
									assertProblems(problems, [
									{
										id: RULE_ID,
										severity: 'warning',
										start: 31,
										end: 32
									}]);
								},
								function (error) {
									worker.getTestState().callback(error);
								});
						});
						/**
						 * @see https://bugs.eclipse.org/bugs/show_bug.cgi?id=427930
						 */
						it("should indicate the problematic token in function expression return of string", function(callback) {
							var topic = "var o = {f: function() {return 'foo'}};o.f = null;";
							var config = { rules: {} };
							config.rules[RULE_ID] = 1;
							validate({buffer: topic, callback: callback, config: config}).then(
								function (problems) {
									assertProblems(problems, [
									{
										id: RULE_ID,
										severity: 'warning',
										start: 31,
										end: 36
									}]);
								},
								function (error) {
									worker.getTestState().callback(error);
								});
						});
						/**
						 * @see https://bugs.eclipse.org/bugs/show_bug.cgi?id=427930
						 */
						it("should indicate the problematic token in function expression return of object", function(callback) {
							var topic = "var o = {f: function() {return {}}};o.f = null;";
							var config = { rules: {} };
							config.rules[RULE_ID] = 1;
							validate({buffer: topic, callback: callback, config: config}).then(
								function (problems) {
									assertProblems(problems, [
									{
										id: RULE_ID,
										severity: 'warning',
										start: 32,
										end: 33
									}]);
								},
								function (error) {
									worker.getTestState().callback(error);
								});
						});
						/**
						 * @see https://bugs.eclipse.org/bugs/show_bug.cgi?id=427930
						 */
						it("should indicate the problematic token in function expression return of call expression", function(callback) {
							var topic = "var o = {f: function() {return this.f()}};o.f = null;";
							var config = { rules: {} };
							config.rules[RULE_ID] = 1;
							validate({buffer: topic, callback: callback, config: config}).then(
								function (problems) {
									assertProblems(problems, [
									{
										id: RULE_ID,
										severity: 'warning',
										start: 38,
										end: 39
									}]);
								},
								function (error) {
									worker.getTestState().callback(error);
								});
						});
						/**
						 * @see https://bugs.eclipse.org/bugs/show_bug.cgi?id=427930
						 */
						it("should indicate the problematic token in function expression with nested function decl and return of call expression", function(callback) {
							var topic = "var o = {f: function() {function inner() {};return inner()}};o.f = null;";
							var config = { rules: {} };
							config.rules[RULE_ID] = 1;
							validate({buffer: topic, callback: callback, config: config}).then(
								function (problems) {
									assertProblems(problems, [
									{
										id: RULE_ID,
										severity: 'warning',
										start: 57,
										end: 58
									}]);
								},
								function (error) {
									worker.getTestState().callback(error);
								});
						});
						/**
						 * Used to be not flagged, but not now that we handle call expressions
						 * @see https://bugs.eclipse.org/bugs/show_bug.cgi?id=427930
						 */
						it("should flag 1-liner function call", function(callback) {
							var topic = "foo(function() { x = 1; })";
							var config = { rules: {} };
							config.rules[RULE_ID] = 1;
							validate({buffer: topic, callback: callback, config: config}).then(
								function (problems) {
									assertProblems(problems, [
									{
										id: RULE_ID,
										severity: 'warning',
										start: 25,
										end: 26
									}]);
								},
								function (error) {
									worker.getTestState().callback(error);
								});
						});
						/**
						 * Should flag bare BreakStatement
						 */
						it("should flag bare break statement", function(callback) {
							var topic = "while(true) {break}";
							var config = { rules: {} };
							config.rules[RULE_ID] = 1;
							validate({buffer: topic, callback: callback, config: config}).then(
								function (problems) {
									assertProblems(problems, [
									{
										id: RULE_ID,
										severity: 'warning',
										start: 13,
										end: 18
									}]);
								},
								function (error) {
									worker.getTestState().callback(error);
								});
						});
						/**
						 * Should flag labelled BreakStatement
						 */
						it("should flag labelled break statement", function(callback) {
							var topic = "l: while(true) {break l}";
							var config = { rules: {} };
							config.rules[RULE_ID] = 1;
							validate({buffer: topic, callback: callback, config: config}).then(
								function (problems) {
									assertProblems(problems, [
									{
										id: RULE_ID,
										severity: 'warning',
										start: 22,
										end: 23
									}]);
								},
								function (error) {
									worker.getTestState().callback(error);
								});
						});
						/**
						 * Should flag bare ContinueStatement
						 */
						it("should flag bare continue statement", function(callback) {
							var topic = "while(true) {continue}";
							var config = { rules: {} };
							config.rules[RULE_ID] = 1;
							validate({buffer: topic, callback: callback, config: config}).then(
								function (problems) {
									assertProblems(problems, [
									{
										id: RULE_ID,
										severity: 'warning',
										start: 13,
										end: 21
									}]);
								},
								function (error) {
									worker.getTestState().callback(error);
								});
						});
				 		/**
						 * Should flag labelled ContinueStatement
						 */
						it("should flag labelled continue statement", function(callback) {
							var topic = "l: while(true) {continue l}";
							var config = { rules: {} };
							config.rules[RULE_ID] = 1;
							validate({buffer: topic, callback: callback, config: config}).then(
								function (problems) {
									assertProblems(problems, [
									{
										id: RULE_ID,
										severity: 'warning',
										start: 25,
										end: 26
									}]);
								},
								function (error) {
									worker.getTestState().callback(error);
								});
						});
				
						//------------------------------------------------------------------------------
						// Should nots
						//------------------------------------------------------------------------------
						it("should not flag 'for' with initializer", function(callback) {
							var topic = "for (var i;;){}";
							var config = { rules: {} };
							config.rules[RULE_ID] = 1;
							validate({buffer: topic, callback: callback, config: config}).then(
								function (problems) {
									assertProblems(problems, []);
								},
								function (error) {
									worker.getTestState().callback(error);
								});
						});
						it("should not flag 'for' with no BlockStatement", function(callback) {
							var topic = "for (;;)x;";
							var config = { rules: {} };
							config.rules[RULE_ID] = 1;
							validate({buffer: topic, callback: callback, config: config}).then(
								function (problems) {
									assertProblems(problems, []);
								},
								function (error) {
									worker.getTestState().callback(error);
								});
						});
						it("should not flag 'for in' with VariableDeclaration", function(callback) {
							var topic = "for (var x in ({}));";
							var config = { rules: {} };
							config.rules[RULE_ID] = 1;
							validate({buffer: topic, callback: callback, config: config}).then(
								function (problems) {
									assertProblems(problems, []);
								},
								function (error) {
									worker.getTestState().callback(error);
								});
						});
						it("should not flag 'for in'", function(callback) {
							var topic = "for (x in ({}));";
							var config = { rules: {} };
							config.rules[RULE_ID] = 1;
							validate({buffer: topic, callback: callback, config: config}).then(
								function (problems) {
									assertProblems(problems, []);
								},
								function (error) {
									worker.getTestState().callback(error);
								});
						});
						/**
						 * @see https://bugs.eclipse.org/bugs/show_bug.cgi?id=427930
						 */
						it("should not flag call expression root", function(callback) {
							var topic = "function f() {} f();";
							var config = { rules: {} };
							config.rules[RULE_ID] = 1;
							validate({buffer: topic, callback: callback, config: config}).then(
								function (problems) {
									assertProblems(problems, []);
								},
								function (error) {
									worker.getTestState().callback(error);
								});
						});
						/**
						 * @see https://bugs.eclipse.org/bugs/show_bug.cgi?id=427930
						 */
						it("should not flag call expression return statement", function(callback) {
							var topic = "function f() {return f();}";
							var config = { rules: {} };
							config.rules[RULE_ID] = 1;
							validate({buffer: topic, callback: callback, config: config}).then(
								function (problems) {
									assertProblems(problems, []);
								},
								function (error) {
									worker.getTestState().callback(error);
								});
						});
						/**
						 * @see https://bugs.eclipse.org/bugs/show_bug.cgi?id=427930
						 */
						it("should not flag call expression return statement from function expression", function(callback) {
							var topic = "var o = {fo: function() {return this.fo();}};o.fo = null;";
							var config = { rules: {} };
							config.rules[RULE_ID] = 1;
							validate({buffer: topic, callback: callback, config: config}).then(
								function (problems) {
									assertProblems(problems, []);
								},
								function (error) {
									worker.getTestState().callback(error);
								});
						});
						/**
						 * @see https://bugs.eclipse.org/bugs/show_bug.cgi?id=427930
						 */
						it("should not flag call expression return statement from nested in function expression", function(callback) {
							var topic = "var o = {fo: function() {function f() {return f();};}};o.fo = null;";
							var config = { rules: {} };
							config.rules[RULE_ID] = 1;
							validate({buffer: topic, callback: callback, config: config}).then(
								function (problems) {
									assertProblems(problems, []);
								},
								function (error) {
									worker.getTestState().callback(error);
								});
						});
						it("should not flag function expression with nested function decl", function(callback) {
							var topic = "var o = {f: function() {function inner() {}}};o.f = null;";
							var config = { rules: {} };
							config.rules[RULE_ID] = 1;
							validate({buffer: topic, callback: callback, config: config}).then(
								function (problems) {
									assertProblems(problems, []);
								},
								function (error) {
									worker.getTestState().callback(error);
								});
						});
						it("should not flag missing semi when 'never' is used", function(callback) {
							var topic = "var name = \"ESLint\"";
							var config = { rules: {} };
							config.rules[RULE_ID] = [2, "never"];
							validate({buffer: topic, callback: callback, config: config}).then(
								function (problems) {
									assertProblems(problems, []);
								},
								function (error) {
									worker.getTestState().callback(error);
								});
						});
						it("should not flag missing semi when 'never' is used with omitLastInOneLineBlock = true", function(callback) {
							var topic = "if (foo) { bar() }";
							var config = { rules: {} };
							config.rules[RULE_ID] = [2, "always", {omitLastInOneLineBlock: true}];
							validate({buffer: topic, callback: callback, config: config}).then(
								function (problems) {
									assertProblems(problems, []);
								},
								function (error) {
									worker.getTestState().callback(error);
								});
						});
						it("should not flag missing semi when 'never' is used with omitLastInOneLineBlock = true 2", function(callback) {
							var topic = "if (foo) { bar(); baz() }";
							var config = { rules: {} };
							config.rules[RULE_ID] = [2, "always", {omitLastInOneLineBlock: true}];
							validate({buffer: topic, callback: callback, config: config}).then(
								function (problems) {
									assertProblems(problems, []);
								},
								function (error) {
									worker.getTestState().callback(error);
								});
						});
						it("should flag missing semi when 'never' is used with omitLastInOneLineBlock = true", function(callback) {
							var topic =
								"if (foo) {\n" +
								"    bar()\n" +
								"}";
							var config = { rules: {} };
							config.rules[RULE_ID] = [2, "always", {omitLastInOneLineBlock: true}];
							validate({buffer: topic, callback: callback, config: config}).then(
								function (problems) {
									assertProblems(problems, [
									{
										id: RULE_ID,
										severity: 'error',
										start: 19,
										end: 20
									}]);
								},
								function (error) {
									worker.getTestState().callback(error);
								});
						});
						it("should flag missing semi when 'never' is used with omitLastInOneLineBlock = true 2", function(callback) {
							var topic =
								"if (foo) { bar(); }";
							var config = { rules: {} };
							config.rules[RULE_ID] = [2, "always", {omitLastInOneLineBlock: true}];
							validate({buffer: topic, callback: callback, config: config}).then(
								function (problems) {
									assertProblems(problems, [
									{
										id: RULE_ID,
										severity: 'error',
										start: 16,
										end: 17
									}]);
								},
								function (error) {
									worker.getTestState().callback(error);
								});
						});
						it("should flag semi when 'never' is set", function(callback) {
							var topic = "if (foo) { bar(); }";
							var config = { rules: {} };
							config.rules[RULE_ID] = [2, "never"];
							validate({buffer: topic, callback: callback, config: config}).then(
								function (problems) {
									assertProblems(problems, [
									{
										id: RULE_ID,
										severity: 'error',
										start: 16,
										end: 17
									}]);
								},
								function (error) {
									worker.getTestState().callback(error);
								});
						});
						it("should not flag semi when 'never' is set", function(callback) {
							var topic =
								"var name = \"ESLint\"\n" +
								";(function() {\n" +
								"})()";
							var config = { rules: {} };
							config.rules[RULE_ID] = [2, "never"];
							validate({buffer: topic, callback: callback, config: config}).then(
								function (problems) {
									assertProblems(problems, []);
								},
								function (error) {
									worker.getTestState().callback(error);
								});
						});
					});
			
					//USE-ISNAN --------------------------------------------------------
					describe('use-isnan', function() {
						var RULE_ID = "use-isnan";
						it("should flag < on LHS", function(callback) {
							var topic = "if (NaN < 1) var i = 1;";
							var config = { rules: {} };
							config.rules[RULE_ID] = 1;
							validate({buffer: topic, callback: callback, config: config}).then(
								function (problems) {
									assertProblems(problems, [
									{
										id: RULE_ID,
										severity: 'warning',
										description: "Use the isNaN function to compare with NaN.",
										nodeType: "Identifier"
									}]);
								},
								function (error) {
									worker.getTestState().callback(error);
								});
						});
						it("should flag < on RHS", function(callback) {
							var topic = "if (1 < NaN) var i = 1;";
							var config = { rules: {} };
							config.rules[RULE_ID] = 1;
							validate({buffer: topic, callback: callback, config: config}).then(
								function (problems) {
									assertProblems(problems, [
									{
										id: RULE_ID,
										severity: 'warning',
										description: "Use the isNaN function to compare with NaN.",
										nodeType: "Identifier"
									}]);
								},
								function (error) {
									worker.getTestState().callback(error);
								});
						});
						it("should flag > on LHS", function(callback) {
							var topic = "if (NaN > 1) var i = 1;";
							var config = { rules: {} };
							config.rules[RULE_ID] = 1;
							validate({buffer: topic, callback: callback, config: config}).then(
								function (problems) {
									assertProblems(problems, [
									{
										id: RULE_ID,
										severity: 'warning',
										description: "Use the isNaN function to compare with NaN.",
										nodeType: "Identifier"
									}]);
								},
								function (error) {
									worker.getTestState().callback(error);
								});
						});
						it("should flag > on RHS", function(callback) {
							var topic = "if (1 > NaN) var i = 1;";
							var config = { rules: {} };
							config.rules[RULE_ID] = 1;
							validate({buffer: topic, callback: callback, config: config}).then(
								function (problems) {
									assertProblems(problems, [
									{
										id: RULE_ID,
										severity: 'warning',
										description: "Use the isNaN function to compare with NaN.",
										nodeType: "Identifier"
									}]);
								},
								function (error) {
									worker.getTestState().callback(error);
								});
						});
						it("should flag <= on LHS", function(callback) {
							var topic = "if (NaN <= 1) var i = 1;";
							var config = { rules: {} };
							config.rules[RULE_ID] = 1;
							validate({buffer: topic, callback: callback, config: config}).then(
								function (problems) {
									assertProblems(problems, [
									{
										id: RULE_ID,
										severity: 'warning',
										description: "Use the isNaN function to compare with NaN.",
										nodeType: "Identifier"
									}]);
								},
								function (error) {
									worker.getTestState().callback(error);
								});
						});
						it("should flag <= on RHS", function(callback) {
							var topic = "if (1 <= NaN) var i = 1;";
							var config = { rules: {} };
							config.rules[RULE_ID] = 1;
							validate({buffer: topic, callback: callback, config: config}).then(
								function (problems) {
									assertProblems(problems, [
									{
										id: RULE_ID,
										severity: 'warning',
										description: "Use the isNaN function to compare with NaN.",
										nodeType: "Identifier"
									}]);
								},
								function (error) {
									worker.getTestState().callback(error);
								});
						});
						it("should flag >= on LHS", function(callback) {
							var topic = "if (NaN >= 1) var i = 1;";
							var config = { rules: {} };
							config.rules[RULE_ID] = 1;
							validate({buffer: topic, callback: callback, config: config}).then(
								function (problems) {
									assertProblems(problems, [
									{
										id: RULE_ID,
										severity: 'warning',
										description: "Use the isNaN function to compare with NaN.",
										nodeType: "Identifier"
									}]);
								},
								function (error) {
									worker.getTestState().callback(error);
								});
						});
						it("should flag >= on RHS", function(callback) {
							var topic = "if (1 >= NaN) var i = 1;";
							var config = { rules: {} };
							config.rules[RULE_ID] = 1;
							validate({buffer: topic, callback: callback, config: config}).then(
								function (problems) {
									assertProblems(problems, [
									{
										id: RULE_ID,
										severity: 'warning',
										description: "Use the isNaN function to compare with NaN.",
										nodeType: "Identifier"
									}]);
								},
								function (error) {
									worker.getTestState().callback(error);
								});
						});
						it("should flag == on LHS", function(callback) {
							var topic = "if (NaN == 1) var i = 1;";
							var config = { rules: {} };
							config.rules[RULE_ID] = 1;
							validate({buffer: topic, callback: callback, config: config}).then(
								function (problems) {
									assertProblems(problems, [
									{
										id: RULE_ID,
										severity: 'warning',
										description: "Use the isNaN function to compare with NaN.",
										nodeType: "Identifier"
									}]);
								},
								function (error) {
									worker.getTestState().callback(error);
								});
						});
						it("should flag == on RHS", function(callback) {
							var topic = "if (1 == NaN) var i = 1;";
							var config = { rules: {} };
							config.rules[RULE_ID] = 1;
							validate({buffer: topic, callback: callback, config: config}).then(
								function (problems) {
									assertProblems(problems, [
									{
										id: RULE_ID,
										severity: 'warning',
										description: "Use the isNaN function to compare with NaN.",
										nodeType: "Identifier"
									}]);
								},
								function (error) {
									worker.getTestState().callback(error);
								});
						});
						it("should flag != on LHS", function(callback) {
							var topic = "if (NaN != 1) var i = 1;";
							var config = { rules: {} };
							config.rules[RULE_ID] = 1;
							validate({buffer: topic, callback: callback, config: config}).then(
								function (problems) {
									assertProblems(problems, [
									{
										id: RULE_ID,
										severity: 'warning',
										description: "Use the isNaN function to compare with NaN.",
										nodeType: "Identifier"
									}]);
								},
								function (error) {
									worker.getTestState().callback(error);
								});
						});
						it("should flag != on RHS", function(callback) {
							var topic = "if (1 != NaN) var i = 1;";
							var config = { rules: {} };
							config.rules[RULE_ID] = 1;
							validate({buffer: topic, callback: callback, config: config}).then(
								function (problems) {
									assertProblems(problems, [
									{
										id: RULE_ID,
										severity: 'warning',
										description: "Use the isNaN function to compare with NaN.",
										nodeType: "Identifier"
									}]);
								},
								function (error) {
									worker.getTestState().callback(error);
								});
						});
						it("should flag === on LHS", function(callback) {
							var topic = "if (NaN === 1) var i = 1;";
							var config = { rules: {} };
							config.rules[RULE_ID] = 1;
							validate({buffer: topic, callback: callback, config: config}).then(
								function (problems) {
									assertProblems(problems, [
									{
										id: RULE_ID,
										severity: 'warning',
										description: "Use the isNaN function to compare with NaN.",
										nodeType: "Identifier"
									}]);
								},
								function (error) {
									worker.getTestState().callback(error);
								});
						});
						it("should flag === on RHS", function(callback) {
							var topic = "if (1 === NaN) var i = 1;";
							var config = { rules: {} };
							config.rules[RULE_ID] = 1;
							validate({buffer: topic, callback: callback, config: config}).then(
								function (problems) {
									assertProblems(problems, [
									{
										id: RULE_ID,
										severity: 'warning',
										description: "Use the isNaN function to compare with NaN.",
										nodeType: "Identifier"
									}]);
								},
								function (error) {
									worker.getTestState().callback(error);
								});
						});
						it("should flag !== on LHS", function(callback) {
							var topic = "if (NaN !== 1) var i = 1;";
							var config = { rules: {} };
							config.rules[RULE_ID] = 1;
							validate({buffer: topic, callback: callback, config: config}).then(
								function (problems) {
									assertProblems(problems, [
									{
										id: RULE_ID,
										severity: 'warning',
										description: "Use the isNaN function to compare with NaN.",
										nodeType: "Identifier"
									}]);
								},
								function (error) {
									worker.getTestState().callback(error);
								});
						});
						it("should flag !== on LHS", function(callback) {
							var topic = "if (1 !== NaN) var i = 1;";
							var config = { rules: {} };
							config.rules[RULE_ID] = 1;
							validate({buffer: topic, callback: callback, config: config}).then(
								function (problems) {
									assertProblems(problems, [
									{
										id: RULE_ID,
										severity: 'warning',
										description: "Use the isNaN function to compare with NaN.",
										nodeType: "Identifier"
									}]);
								},
								function (error) {
									worker.getTestState().callback(error);
								});
						});
					});
			
					//VALID-TYPEOF ---------------------------------------------------------
					describe('valid-typeof', function() {
						var RULE_ID = "valid-typeof";
						it("should flag non-literal", function(callback) {
							var topic = "var answer = (typeof null === object);";
							var config = { rules: {} };
							config.rules[RULE_ID] = 1;
							validate({buffer: topic, callback: callback, config: config}).then(
								function (problems) {
									assertProblems(problems, [
									{
										id: RULE_ID,
										severity: 'warning',
										description: "Invalid typeof comparison."
									}]);
								},
								function (error) {
									worker.getTestState().callback(error);
								});
						});
						it("should flag non-literal undefined", function(callback) {
							var topic = "var answer = (typeof foo === undefined);";
							var config = { rules: {} };
							config.rules[RULE_ID] = 1;
							validate({buffer: topic, callback: callback, config: config}).then(
								function (problems) {
									assertProblems(problems, [
									{
										id: RULE_ID,
										severity: 'warning',
										description: "Invalid typeof comparison."
									}]);
								},
								function (error) {
									worker.getTestState().callback(error);
								});
						});
						it("should flag unsupported literal", function(callback) {
							var topic = "var answer = (typeof foo === 'undefied');";
							var config = { rules: {} };
							config.rules[RULE_ID] = 1;
							validate({buffer: topic, callback: callback, config: config}).then(
								function (problems) {
									assertProblems(problems, [
									{
										id: RULE_ID,
										severity: 'warning',
										description: "Invalid typeof comparison."
									}]);
								},
								function (error) {
									worker.getTestState().callback(error);
								});
						});
						it("should not flag literal RHS", function(callback) {
							var topic = "var answer = ('object' === typeof foo);";
							var config = { rules: {} };
							config.rules[RULE_ID] = 1;
							validate({buffer: topic, callback: callback, config: config}).then(
								function (problems) {
									assertProblems(problems, []);
								},
								function (error) {
									worker.getTestState().callback(error);
								});
						});
						it("should not flag call expression unary RHS", function(callback) {
							var topic = "var answer = ('undefined' === typeof(foo));";
							var config = { rules: {} };
							config.rules[RULE_ID] = 1;
							validate({buffer: topic, callback: callback, config: config}).then(
								function (problems) {
									assertProblems(problems, []);
								},
								function (error) {
									worker.getTestState().callback(error);
								});
						});
						it("should flag unsupported literal RHS", function(callback) {
							var topic = "var answer = ('undefied' === typeof foo);";
							var config = { rules: {} };
							config.rules[RULE_ID] = 1;
							validate({buffer: topic, callback: callback, config: config}).then(
								function (problems) {
									assertProblems(problems, [
									{
										id: RULE_ID,
										severity: 'warning',
										description: "Invalid typeof comparison."
									}]);
								},
								function (error) {
									worker.getTestState().callback(error);
								});
						});
						/**
						 * @see https://bugs.eclipse.org/bugs/show_bug.cgi?id=460388
						 */
						it("should not flag binary expr withour comparison 1", function(callback) {
							var topic = "var str = ('val: ' + typeof(foo));";
							var config = { rules: {} };
							config.rules[RULE_ID] = 1;
							validate({buffer: topic, callback: callback, config: config}).then(
								function (problems) {
									assertProblems(problems, []);
								},
								function (error) {
									worker.getTestState().callback(error);
								});
						});
						/**
						 * @see https://bugs.eclipse.org/bugs/show_bug.cgi?id=460388
						 */
						it("should not flag binary expr withour comparison 2", function(callback) {
							var topic = "var str = ('val: ' & typeof(foo));";
							var config = { rules: {} };
							config.rules[RULE_ID] = 1;
							validate({buffer: topic, callback: callback, config: config}).then(
								function (problems) {
									assertProblems(problems, []);
								},
								function (error) {
									worker.getTestState().callback(error);
								});
						});
						/**
						* @see https://bugs.eclipse.org/bugs/show_bug.cgi?id=460388
						 */
						it("should not flag binary expr withour comparison 3", function(callback) {
							var topic = "var str = ('val: ' > typeof(foo));";
							var config = { rules: {} };
							config.rules[RULE_ID] = 1;
							validate({buffer: topic, callback: callback, config: config}).then(
								function (problems) {
									assertProblems(problems, []);
								},
								function (error) {
									worker.getTestState().callback(error);
								});
						});
						/**
						 * @see https://bugs.eclipse.org/bugs/show_bug.cgi?id=460388
						 */
						it("should not flag binary expr withour comparison 4", function(callback) {
							var topic = "var str = ('val: ' < typeof(foo));";
							var config = { rules: {} };
							config.rules[RULE_ID] = 1;
							validate({buffer: topic, callback: callback, config: config}).then(
								function (problems) {
									assertProblems(problems, []);
								},
								function (error) {
									worker.getTestState().callback(error);
								});
						});
						/**
						 * @see https://bugs.eclipse.org/bugs/show_bug.cgi?id=460388
						 */
						it("should not flag binary expr withour comparison 5", function(callback) {
							var topic = "var str = ('val: ' <= typeof(foo));";
							var config = { rules: {} };
							config.rules[RULE_ID] = 1;
							validate({buffer: topic, callback: callback, config: config}).then(
								function (problems) {
									assertProblems(problems, []);
								},
								function (error) {
									worker.getTestState().callback(error);
								});
						});
						/**
						 * @see https://bugs.eclipse.org/bugs/show_bug.cgi?id=460388
						 */
						it("should not flag binary expr withour comparison 6", function(callback) {
							var topic = "var str = ('val: ' >= typeof(foo));";
							var config = { rules: {} };
							config.rules[RULE_ID] = 1;
							validate({buffer: topic, callback: callback, config: config}).then(
								function (problems) {
									assertProblems(problems, []);
								},
								function (error) {
									worker.getTestState().callback(error);
								});
						});
					});
					// NO-MIXED-SPACES-AND-TABS --------------------------------------------
					// https://bugs.eclipse.org/bugs/show_bug.cgi?id=462980
					describe('no-mixed-spaces-and-tabs', function() {
						var RULE_ID = "no-mixed-spaces-and-tabs";
						it("flag mixed spaces and tabs", function(callback) {
							var topic = "	 	var a;";
							var config = { rules: {} };
							config.rules[RULE_ID] = 1;
							validate({buffer: topic, callback: callback, config: config}).then(
								function (problems) {
									assertProblems(problems, [
									{
										id: RULE_ID,
										severity: 'warning',
										description: "Mixed spaces and tabs."
									}]);
								},
								function (error) {
									worker.getTestState().callback(error);
								});
						});
						it("should not flag mixed spaces and tabs (only tabs)", function(callback) {
							var topic = "		var a;";
							var config = { rules: {} };
							config.rules[RULE_ID] = 1;
							validate({buffer: topic, callback: callback, config: config}).then(
								function (problems) {
									assertProblems(problems, []);
								},
								function (error) {
									worker.getTestState().callback(error);
								});
						});
						it("should not flag mixed spaces and tabs (only spaces)", function(callback) {
							var topic = "     var a;";
							var config = { rules: {} };
							config.rules[RULE_ID] = 1;
							validate({buffer: topic, callback: callback, config: config}).then(
								function (problems) {
									assertProblems(problems, []);
								},
								function (error) {
									worker.getTestState().callback(error);
								});
						});
						it("should not flag mixed spaces and tabs (spaces after tabs (smart-tabs))", function(callback) {
							var topic = "		     var a;";
							var config = { rules: {} };
							config.rules[RULE_ID] = 1;
							validate({buffer: topic, callback: callback, config: config}).then(
								function (problems) {
									assertProblems(problems, []);
								},
								function (error) {
									worker.getTestState().callback(error);
								});
						});
						it("should not flag mixed spaces and tabs inside comments", function(callback) {
							var topic = " /* 	 	 */var a;";
							var config = { rules: {} };
							config.rules[RULE_ID] = 1;
							validate({buffer: topic, callback: callback, config: config}).then(
								function (problems) {
									assertProblems(problems, []);
								},
								function (error) {
									worker.getTestState().callback(error);
								});
						});
						it("flag mixed spaces and tabs outside of comments", function(callback) {
							var topic = " 	 /* 	 	 */var a;";
							var config = { rules: {} };
							config.rules[RULE_ID] = 1;
							validate({buffer: topic, callback: callback, config: config}).then(
								function (problems) {
									assertProblems(problems, [
									{
										id: RULE_ID,
										severity: 'warning',
										description: "Mixed spaces and tabs."
									}]);
								},
								function (error) {
									worker.getTestState().callback(error);
								});
						});
						it("flag mixed spaces and tabs outside of comments with newlines", function(callback) {
							var topic = "	 	\n/* 	 	 */\nvar a;";
							var config = { rules: {} };
							config.rules[RULE_ID] = 1;
							validate({buffer: topic, callback: callback, config: config}).then(
								function (problems) {
									assertProblems(problems, [
									{
										id: RULE_ID,
										severity: 'warning',
										description: "Mixed spaces and tabs."
									}]);
								},
								function (error) {
									worker.getTestState().callback(error);
								});
						});
					});
					// accessor-pairs --------------------------------------------
					describe('accessor-pairs', function() {
						var RULE_ID = "accessor-pairs";
						it("flag missing getter", function(callback) {
							var topic = "var o = {\n" +
										"	set a(value) {\n" +
										"		this.val = value;\n" +
										" 	}\n" +
										"};";
							var config = { rules: {} };
							config.rules[RULE_ID] = 1;
							validate({buffer: topic, callback: callback, config: config}).then(
								function (problems) {
									assertProblems(problems, [
									{
										id: RULE_ID,
										severity: 'warning',
										description: "Getter is not present"
									}]);
								},
								function (error) {
									worker.getTestState().callback(error);
								});
						});
						it("flag missing getter with object expression", function(callback) {
							var topic = "var o = {d: 1};\n" +
										"Object.defineProperty(o, 'c', {\n" +
										"    set: function(value) {\n" +
										"        this.val = value;\n" +
										"    }\n" +
										"});";
							var config = { rules: {} };
							config.rules[RULE_ID] = 1;
							validate({buffer: topic, callback: callback, config: config}).then(
								function (problems) {
									assertProblems(problems, [
									{
										id: RULE_ID,
										severity: 'warning',
										description: "Getter is not present"
									}]);
								},
								function (error) {
									worker.getTestState().callback(error);
								});
						});
						it("should not flag existing getter or setter", function(callback) {
							var topic = "var o = {\n" +
										"    set a(value) {\n" +
										"        this.val = value;\n" +
										"    },\n" +
										"    get a() {\n" +
										"        return this.val;\n" +
										"    }\n" +
										"};";
							var config = { rules: {} };
							config.rules[RULE_ID] = 1;
							validate({buffer: topic, callback: callback, config: config}).then(
								function (problems) {
									assertProblems(problems, []);
								},
								function (error) {
									worker.getTestState().callback(error);
								});
						});
						it("should not flag existing getter or setter with object expression", function(callback) {
							var topic = "var o = {d: 1};\n" +
										"Object.defineProperty(o, 'c', {\n" +
										"    set: function(value) {\n" +
										"        this.val = value;\n" +
										"    },\n" +
										"    get: function() {\n" +
										"        return this.val;\n" +
										"    }\n" +
										"});";
							var config = { rules: {} };
							config.rules[RULE_ID] = 1;
							validate({buffer: topic, callback: callback, config: config}).then(
								function (problems) {
									assertProblems(problems, []);
								},
								function (error) {
									worker.getTestState().callback(error);
								});
						});
						it("should not flag missing getter", function(callback) {
							var topic = "var o = {d: 1};\n" +
										"Object.defineProperty(o, 'c', {\n" +
										"    set: function(value) {\n" +
										"        this.val = value;\n" +
										"    }\n" +
										"});";
							var config = { rules: {} };
							config.rules[RULE_ID] = [1, { setWithoutGet: false }];
							validate({buffer: topic, callback: callback, config: config}).then(
								function (problems) {
									assertProblems(problems, []);
								},
								function (error) {
									worker.getTestState().callback(error);
								});
						});
						it("should not flag missing setter", function(callback) {
							var topic = "var o = {d: 1};\n" +
										"Object.defineProperty(o, 'c', {\n" +
										"    get: function() {\n" +
										"        return this.val;\n" +
										"    }\n" +
										"});";
							var config = { rules: {} };
							config.rules[RULE_ID] = [1, { getWithoutSet: false }];
							validate({buffer: topic, callback: callback, config: config}).then(
								function (problems) {
									assertProblems(problems, []);
								},
								function (error) {
									worker.getTestState().callback(error);
								});
						});
					});
					// no-control-regex --------------------------------------------
					describe('no-control-regex', function() {
						var RULE_ID = "no-control-regex";
						it("flag control character", function(callback) {
							var topic = "var pattern1 = /\\\\x1f/;\n" +
										"var pattern2 = new RegExp(\"\\x1f\");";
							var config = { rules: {} };
							config.rules[RULE_ID] = 1;
							validate({buffer: topic, callback: callback, config: config}).then(
								function (problems) {
									assertProblems(problems, [
									{
										id: RULE_ID,
										severity: 'warning',
										description: "Unexpected control character in regular expression.",
										start: 50,
										end: 56
									}]);
								},
								function (error) {
									worker.getTestState().callback(error);
								});
						});
						it("should not flag spaces", function(callback) {
							var topic = "var pattern1 = /\\\\x20/;\n" +
										"var pattern2 = new RegExp(\"\\x20\");";
							var config = { rules: {} };
							config.rules[RULE_ID] = 1;
							validate({buffer: topic, callback: callback, config: config}).then(
								function (problems) {
									assertProblems(problems, []);
								},
								function (error) {
									worker.getTestState().callback(error);
								});
						});
					});
					// no-duplicate-case --------------------------------------------
					describe('no-duplicate-case', function() {
						var RULE_ID = "no-duplicate-case";
						it("flag duplicate case", function(callback) {
							var topic = "var a = 1;\n" +
										"switch (a) {\n" +
										"    case 1:\n" +
										"        break;\n" +
										"    case 2:\n" +
										"        break;\n" +
										"    case 2:\n" +
										"        break;\n" +
										"    default:\n" +
										"        break;\n" +
										"}";
							var config = { rules: {} };
							config.rules[RULE_ID] = 2;
							validate({buffer: topic, callback: callback, config: config}).then(
								function (problems) {
									assertProblems(problems, [
									{
										id: RULE_ID,
										severity: 'error',
										description: "Duplicate case label.",
										start: 87,
										end: 88
									}]);
								},
								function (error) {
									worker.getTestState().callback(error);
								});
						});
					});
					// no-empty-character-class --------------------------------------------
					describe('no-empty-character-class', function() {
						var RULE_ID = "no-empty-character-class";
						it("flag empty character class", function(callback) {
							var topic = "var foo = /^abc[]/;";
							var config = { rules: {} };
							config.rules[RULE_ID] = 1;
							validate({buffer: topic, callback: callback, config: config}).then(
								function (problems) {
									assertProblems(problems, [
									{
										id: RULE_ID,
										severity: 'warning',
										description: "Empty class."
									}]);
								},
								function (error) {
									worker.getTestState().callback(error);
								});
						});
						it("flag empty character class 2", function(callback) {
							var topic = "/^abc[]/.test(foo);";
							var config = { rules: {} };
							config.rules[RULE_ID] = 1;
							validate({buffer: topic, callback: callback, config: config}).then(
								function (problems) {
									assertProblems(problems, [
									{
										id: RULE_ID,
										severity: 'warning',
										description: "Empty class."
									}]);
								},
								function (error) {
									worker.getTestState().callback(error);
								});
						});
						it("flag empty character class 3", function(callback) {
							var topic = "bar.match(/^abc[]/);";
							var config = { rules: {} };
							config.rules[RULE_ID] = 1;
							validate({buffer: topic, callback: callback, config: config}).then(
								function (problems) {
									assertProblems(problems, [
									{
										id: RULE_ID,
										severity: 'warning',
										description: "Empty class."
									}]);
								},
								function (error) {
									worker.getTestState().callback(error);
								});
						});
						it("should not flag character class", function(callback) {
							var topic = "var foo = /^abc/;";
							var config = { rules: {} };
							config.rules[RULE_ID] = 1;
							validate({buffer: topic, callback: callback, config: config}).then(
								function (problems) {
									assertProblems(problems, []);
								},
								function (error) {
									worker.getTestState().callback(error);
								});
						});
						it("should not flag character class 2", function(callback) {
							var topic = "var foo = /^abc[a-z]/;";
							var config = { rules: {} };
							config.rules[RULE_ID] = 1;
							validate({buffer: topic, callback: callback, config: config}).then(
								function (problems) {
									assertProblems(problems, []);
								},
								function (error) {
									worker.getTestState().callback(error);
								});
						});
						it("should not flag character class 3", function(callback) {
							var topic = "var bar = new RegExp(\"^abc[]\");";
							var config = { rules: {} };
							config.rules[RULE_ID] = 1;
							validate({buffer: topic, callback: callback, config: config}).then(
								function (problems) {
									assertProblems(problems, []);
								},
								function (error) {
									worker.getTestState().callback(error);
								});
						});
					});
					// no-extra-boolean cast --------------------------------------------
					describe('no-extra-boolean-cast', function() {
						var RULE_ID = "no-extra-boolean-cast";
						it("flag redundant multiple negation", function(callback) {
							var topic = "var foo = !!!bar;";
							var config = { rules: {} };
							config.rules[RULE_ID] = 1;
							validate({buffer: topic, callback: callback, config: config}).then(
								function (problems) {
									assertProblems(problems, [
									{
										id: RULE_ID,
										severity: 'warning',
										description: "Redundant multiple negation."
									}]);
								},
								function (error) {
									worker.getTestState().callback(error);
								});
						});
						it("flag redundant double negation in ternary", function(callback) {
							var topic = "var foo = !!bar ? baz : bat;";
							var config = { rules: {} };
							config.rules[RULE_ID] = 1;
							validate({buffer: topic, callback: callback, config: config}).then(
								function (problems) {
									assertProblems(problems, [
									{
										id: RULE_ID,
										severity: 'warning',
										description: "Redundant double negation in a ternary condition."
									}]);
								},
								function (error) {
									worker.getTestState().callback(error);
								});
						});
						it("flag redundant double negation in call to Boolean", function(callback) {
							var topic = "var foo = Boolean(!!bar);";
							var config = { rules: {} };
							config.rules[RULE_ID] = 1;
							validate({buffer: topic, callback: callback, config: config}).then(
								function (problems) {
									assertProblems(problems, [
									{
										id: RULE_ID,
										severity: 'warning',
										description: "Redundant double negation in call to Boolean()."
									}]);
								},
								function (error) {
									worker.getTestState().callback(error);
								});
						});
						it("flag redundant double negation in Boolean constructor call", function(callback) {
							var topic = "var foo = new Boolean(!!bar);";
							var config = { rules: {} };
							config.rules[RULE_ID] = 1;
							validate({buffer: topic, callback: callback, config: config}).then(
								function (problems) {
									assertProblems(problems, [
									{
										id: RULE_ID,
										severity: 'warning',
										description: "Redundant double negation in Boolean constructor call."
									}]);
								},
								function (error) {
									worker.getTestState().callback(error);
								});
						});
						it("flag redundant double negation in if statement condition", function(callback) {
							var topic = "if (!!foo) { }";
							var config = { rules: {} };
							config.rules[RULE_ID] = 1;
							validate({buffer: topic, callback: callback, config: config}).then(
								function (problems) {
									assertProblems(problems, [
									{
										id: RULE_ID,
										severity: 'warning',
										description: "Redundant double negation in an if statement condition."
									}]);
								},
								function (error) {
									worker.getTestState().callback(error);
								});
						});
						it("flag redundant double negation in while statement condition", function(callback) {
							var topic = "while (!!foo) { }";
							var config = { rules: {} };
							config.rules[RULE_ID] = 1;
							validate({buffer: topic, callback: callback, config: config}).then(
								function (problems) {
									assertProblems(problems, [
									{
										id: RULE_ID,
										severity: 'warning',
										description: "Redundant double negation in a while loop condition."
									}]);
								},
								function (error) {
									worker.getTestState().callback(error);
								});
						});
						it("flag redundant double negation in do/while statement condition", function(callback) {
							var topic = "do {} while(!!foo);";
							var config = { rules: {} };
							config.rules[RULE_ID] = 1;
							validate({buffer: topic, callback: callback, config: config}).then(
								function (problems) {
									assertProblems(problems, [
									{
										id: RULE_ID,
										severity: 'warning',
										description: "Redundant double negation in a do while loop condition."
									}]);
								},
								function (error) {
									worker.getTestState().callback(error);
								});
						});
						it("flag redundant double negation in for statement condition", function(callback) {
							var topic = "for (; !!foo; ) {}";
							var config = { rules: {} };
							config.rules[RULE_ID] = 1;
							validate({buffer: topic, callback: callback, config: config}).then(
								function (problems) {
									assertProblems(problems, [
									{
										id: RULE_ID,
										severity: 'warning',
										description: "Redundant double negation in a for loop condition."
									}]);
								},
								function (error) {
									worker.getTestState().callback(error);
								});
						});
						it("should not flag multiple redundant negation", function(callback) {
							var topic = "var foo = !!bar;";
							var config = { rules: {} };
							config.rules[RULE_ID] = 1;
							validate({buffer: topic, callback: callback, config: config}).then(
								function (problems) {
									assertProblems(problems, []);
								},
								function (error) {
									worker.getTestState().callback(error);
								});
						});
						it("should not flag multiple redundant negation 2", function(callback) {
							var topic = "function foo() {return !!bar;}";
							var config = { rules: {} };
							config.rules[RULE_ID] = 1;
							validate({buffer: topic, callback: callback, config: config}).then(
								function (problems) {
									assertProblems(problems, []);
								},
								function (error) {
									worker.getTestState().callback(error);
								});
						});
						it("should not flag multiple redundant negation 3", function(callback) {
							var topic = "var foo = bar ? !!baz : !!bat;";
							var config = { rules: {} };
							config.rules[RULE_ID] = 1;
							validate({buffer: topic, callback: callback, config: config}).then(
								function (problems) {
									assertProblems(problems, []);
								},
								function (error) {
									worker.getTestState().callback(error);
								});
						});
					});
					// no-extra-parens --------------------------------------------
					describe('no-extra-parens', function() {
						var RULE_ID = "no-extra-parens";
						it("flag redundant parentheses", function(callback) {
							var topic = "var a = (b * c);";
							var config = { rules: {} };
							config.rules[RULE_ID] = 2;
							validate({buffer: topic, callback: callback, config: config}).then(
								function (problems) {
									assertProblems(problems, [
									{
										id: RULE_ID,
										severity: 'error',
										description: "Gratuitous parentheses around expression."
									}]);
								},
								function (error) {
									worker.getTestState().callback(error);
								});
						});
						it("flag redundant parentheses 2", function(callback) {
							var topic = "(a * b) + c;";
							var config = { rules: {} };
							config.rules[RULE_ID] = 2;
							validate({buffer: topic, callback: callback, config: config}).then(
								function (problems) {
									assertProblems(problems, [
									{
										id: RULE_ID,
										severity: 'error',
										description: "Gratuitous parentheses around expression."
									}]);
								},
								function (error) {
									worker.getTestState().callback(error);
								});
						});
						it("flag redundant parentheses 3", function(callback) {
							var topic = "typeof (a);";
							var config = { rules: {} };
							config.rules[RULE_ID] = 2;
							validate({buffer: topic, callback: callback, config: config}).then(
								function (problems) {
									assertProblems(problems, [
									{
										id: RULE_ID,
										severity: 'error',
										description: "Gratuitous parentheses around expression."
									}]);
								},
								function (error) {
									worker.getTestState().callback(error);
								});
						});
						it("flag redundant parentheses 4", function(callback) {
							var topic = "(function(){} ? a() : b());";
							var config = { rules: {} };
							config.rules[RULE_ID] = 2;
							validate({buffer: topic, callback: callback, config: config}).then(
								function (problems) {
									assertProblems(problems, [
									{
										id: RULE_ID,
										severity: 'error',
										description: "Gratuitous parentheses around expression."
									}]);
								},
								function (error) {
									worker.getTestState().callback(error);
								});
						});
						it("should not flag redundant parentheses", function(callback) {
							var topic = "(0).toString();";
							var config = { rules: {} };
							config.rules[RULE_ID] = 1;
							validate({buffer: topic, callback: callback, config: config}).then(
								function (problems) {
									assertProblems(problems, []);
								},
								function (error) {
									worker.getTestState().callback(error);
								});
						});
						it("should not flag redundant parentheses 2", function(callback) {
							var topic = "({}.toString.call());";
							var config = { rules: {} };
							config.rules[RULE_ID] = 1;
							validate({buffer: topic, callback: callback, config: config}).then(
								function (problems) {
									assertProblems(problems, []);
								},
								function (error) {
									worker.getTestState().callback(error);
								});
						});
						it("should flag redundant parentheses", function(callback) {
							var topic = "(function(){} ? a() : b())";
							var config = { rules: {} };
							config.rules[RULE_ID] = 2;
							validate({buffer: topic, callback: callback, config: config}).then(
								function (problems) {
									assertProblems(problems, [
									{
										id: RULE_ID,
										severity: 'error',
										description: "Gratuitous parentheses around expression."
									}]);
								},
								function (error) {
									worker.getTestState().callback(error);
								});
						});
						it("should not flag redundant parentheses 4", function(callback) {
							var topic = "(/^a$/).test(x);";
							var config = { rules: {} };
							config.rules[RULE_ID] = 1;
							validate({buffer: topic, callback: callback, config: config}).then(
								function (problems) {
									assertProblems(problems, []);
								},
								function (error) {
									worker.getTestState().callback(error);
								});
						});
						it("should not flag redundant parentheses 5", function(callback) {
							var topic = "((function foo() {}))();";
							var config = { rules: {} };
							config.rules[RULE_ID] = [1, "functions"];
							validate({buffer: topic, callback: callback, config: config}).then(
								function (problems) {
									assertProblems(problems, [
									{
										id: RULE_ID,
										severity: 'warning',
										description: "Gratuitous parentheses around expression."
									}]);
								},
								function (error) {
									worker.getTestState().callback(error);
								});
						});
						it("should not flag redundant parentheses 6", function(callback) {
							var topic = "var y = (function () {return 1;});";
							var config = { rules: {} };
							config.rules[RULE_ID] = [1, "functions"];
							validate({buffer: topic, callback: callback, config: config}).then(
								function (problems) {
									assertProblems(problems, [
									{
										id: RULE_ID,
										severity: 'warning',
										description: "Gratuitous parentheses around expression."
									}]);
								},
								function (error) {
									worker.getTestState().callback(error);
								});
						});
						it("should not flag redundant parentheses 7", function(callback) {
							var topic = "(0).toString();";
							var config = { rules: {} };
							config.rules[RULE_ID] = [1, "functions"];
							validate({buffer: topic, callback: callback, config: config}).then(
								function (problems) {
									assertProblems(problems, []);
								},
								function (error) {
									worker.getTestState().callback(error);
								});
						});
						it("should not flag redundant parentheses 8", function(callback) {
							var topic = "({}.toString.call());";
							var config = { rules: {} };
							config.rules[RULE_ID] = [1, "functions"];
							validate({buffer: topic, callback: callback, config: config}).then(
								function (problems) {
									assertProblems(problems, []);
								},
								function (error) {
									worker.getTestState().callback(error);
								});
						});
						it("should not flag redundant parentheses 9", function(callback) {
							var topic = "(function(){} ? a() : b());";
							var config = { rules: {} };
							config.rules[RULE_ID] = [1, "functions"];
							validate({buffer: topic, callback: callback, config: config}).then(
								function (problems) {
									assertProblems(problems, []);
								},
								function (error) {
									worker.getTestState().callback(error);
								});
						});
						it("should not flag redundant parentheses 10", function(callback) {
							var topic = "(/^a$/).test(x);";
							var config = { rules: {} };
							config.rules[RULE_ID] = [1, "functions"];
							validate({buffer: topic, callback: callback, config: config}).then(
								function (problems) {
									assertProblems(problems, []);
								},
								function (error) {
									worker.getTestState().callback(error);
								});
						});
						it("should not flag redundant parentheses 11", function(callback) {
							var topic = "a = (b * c);";
							var config = { rules: {} };
							config.rules[RULE_ID] = [1, "functions"];
							validate({buffer: topic, callback: callback, config: config}).then(
								function (problems) {
									assertProblems(problems, []);
								},
								function (error) {
									worker.getTestState().callback(error);
								});
						});
						it("should not flag redundant parentheses 12", function(callback) {
							var topic = "(a * b) + c;";
							var config = { rules: {} };
							config.rules[RULE_ID] = [1, "functions"];
							validate({buffer: topic, callback: callback, config: config}).then(
								function (problems) {
									assertProblems(problems, []);
								},
								function (error) {
									worker.getTestState().callback(error);
								});
						});
						it("should not flag redundant parentheses 13", function(callback) {
							var topic = "typeof (a);";
							var config = { rules: {} };
							config.rules[RULE_ID] = [1, "functions"];
							validate({buffer: topic, callback: callback, config: config}).then(
								function (problems) {
									assertProblems(problems, []);
								},
								function (error) {
									worker.getTestState().callback(error);
								});
						});
						it("should not flag redundant parentheses 14", function(callback) {
							var topic = "while ((foo = bar())) {}";
							var config = { rules: {} };
							config.rules[RULE_ID] = ["error", "all", { "conditionalAssign": false }];
							validate({buffer: topic, callback: callback, config: config}).then(
								function (problems) {
									assertProblems(problems, []);
								},
								function (error) {
									worker.getTestState().callback(error);
								});
						});
						it("should not flag redundant parentheses 15", function(callback) {
							var topic = "if ((foo = bar())) {}";
							var config = { rules: {} };
							config.rules[RULE_ID] = ["error", "all", { "conditionalAssign": false }];
							validate({buffer: topic, callback: callback, config: config}).then(
								function (problems) {
									assertProblems(problems, []);
								},
								function (error) {
									worker.getTestState().callback(error);
								});
						});
						it("should not flag redundant parentheses 16", function(callback) {
							var topic = "do; while ((foo = bar()))";
							var config = { rules: {} };
							config.rules[RULE_ID] = ["error", "all", { "conditionalAssign": false }];
							validate({buffer: topic, callback: callback, config: config}).then(
								function (problems) {
									assertProblems(problems, []);
								},
								function (error) {
									worker.getTestState().callback(error);
								});
						});
						it("should not flag redundant parentheses 17", function(callback) {
							var topic = "for (;(a = b););";
							var config = { rules: {} };
							config.rules[RULE_ID] = ["error", "all", { "conditionalAssign": false }];
							validate({buffer: topic, callback: callback, config: config}).then(
								function (problems) {
									assertProblems(problems, []);
								},
								function (error) {
									worker.getTestState().callback(error);
								});
						});
						it("should not flag redundant parentheses 18", function(callback) {
							var topic = "function a(b) { return (b = 1);}";
							var config = { rules: {} };
							config.rules[RULE_ID] = ["error", "all", { "returnAssign": false }];
							validate({buffer: topic, callback: callback, config: config}).then(
								function (problems) {
									assertProblems(problems, []);
								},
								function (error) {
									worker.getTestState().callback(error);
								});
						});
						it("should not flag redundant parentheses 19", function(callback) {
							var topic = "function a(b) { return b ? (c = d) : (c = e);}";
							var config = { rules: {} };
							config.rules[RULE_ID] = ["error", "all", { "returnAssign": false }];
							validate({buffer: topic, callback: callback, config: config}).then(
								function (problems) {
									assertProblems(problems, []);
								},
								function (error) {
									worker.getTestState().callback(error);
								});
						});
						it("should not flag redundant parentheses 20", function(callback) {
							var topic = "x = a || (b && c);";
							var config = { rules: {} };
							config.rules[RULE_ID] = ["error", "all", { "nestedBinaryExpressions": false }];
							validate({buffer: topic, callback: callback, config: config}).then(
								function (problems) {
									assertProblems(problems, []);
								},
								function (error) {
									worker.getTestState().callback(error);
								});
						});
						it("should not flag redundant parentheses 21", function(callback) {
							var topic = "x = a + (b * c);";
							var config = { rules: {} };
							config.rules[RULE_ID] = ["error", "all", { "nestedBinaryExpressions": false }];
							validate({buffer: topic, callback: callback, config: config}).then(
								function (problems) {
									assertProblems(problems, []);
								},
								function (error) {
									worker.getTestState().callback(error);
								});
						});
						it("should not flag redundant parentheses 22", function(callback) {
							var topic = "x = (a * b) / c;";
							var config = { rules: {} };
							config.rules[RULE_ID] = ["error", "all", { "nestedBinaryExpressions": false }];
							validate({buffer: topic, callback: callback, config: config}).then(
								function (problems) {
									assertProblems(problems, []);
								},
								function (error) {
									worker.getTestState().callback(error);
								});
						});
					});
					// no-invalid-regexp --------------------------------------------
					describe('no-invalid-regexp', function() {
						var RULE_ID = "no-invalid-regexp";
						it("flag invalid regexp", function(callback) {
							var topic = "RegExp('[')";
							var config = { rules: {} };
							config.rules[RULE_ID] = 1;
							validate({buffer: topic, callback: callback, config: config}).then(
								function (problems) {
									assertProblems(problems, [
									{
										id: RULE_ID,
										severity: 'warning',
										start: 0
									}]);
								},
								function (error) {
									worker.getTestState().callback(error);
								});
						});
						it("flag invalid regexp - invalid flags", function(callback) {
							var topic = "RegExp('.', 'z')";
							var config = { rules: {} };
							config.rules[RULE_ID] = 1;
							validate({buffer: topic, callback: callback, config: config}).then(
								function (problems) {
									assertProblems(problems, [
									{
										id: RULE_ID,
										severity: 'warning',
										description: "Invalid flags supplied to RegExp constructor \'z\'"
									}]);
								},
								function (error) {
									worker.getTestState().callback(error);
								});
						});
						it("flag invalid regexp - new RegExp", function(callback) {
							var topic = "new RegExp('\\\\')";
							var config = { rules: {} };
							config.rules[RULE_ID] = 1;
							validate({buffer: topic, callback: callback, config: config}).then(
								function (problems) {
									assertProblems(problems, [
									{
										id: RULE_ID,
										severity: 'warning',
										start: 0
									}]);
								},
								function (error) {
									worker.getTestState().callback(error);
								});
						});
						it("should not flag invalid regexp flags", function(callback) {
							var topic = "new RegExp('.', 'y')";
							var config = { rules: {} };
							config.rules[RULE_ID] = ["error", { "allowConstructorFlags": ["u", "y"] }];
							validate({buffer: topic, callback: callback, config: config}).then(
								function (problems) {
									assertProblems(problems, []);
								},
								function (error) {
									worker.getTestState().callback(error);
								});
						});
						it("should not flag invalid regexp flags 2", function(callback) {
							var topic = "new RegExp('.', 'z')";
							var config = { rules: {} };
							config.rules[RULE_ID] = ["error", { "allowConstructorFlags": ["z"] }];
							validate({buffer: topic, callback: callback, config: config}).then(
								function (problems) {
									assertProblems(problems, []);
								},
								function (error) {
									worker.getTestState().callback(error);
								});
						});
						it("flag invalid regexp - invalid flags 2", function(callback) {
							var topic = "RegExp('.', 'z')";
							var config = { rules: {} };
							config.rules[RULE_ID] = ["error", { "allowConstructorFlags": ["u"] }];
							validate({buffer: topic, callback: callback, config: config}).then(
								function (problems) {
									assertProblems(problems, [
									{
										id: RULE_ID,
										severity: 'error',
										description: "Invalid flags supplied to RegExp constructor \'z\'"
									}]);
								},
								function (error) {
									worker.getTestState().callback(error);
								});
						});
					});
					// no-negated-in-lhs --------------------------------------------
					describe('no-negated-in-lhs', function() {
						var RULE_ID = "no-negated-in-lhs";
						it("flag negated in lhs", function(callback) {
							var topic = "if(!a in b) {}";
							var config = { rules: {} };
							config.rules[RULE_ID] = 1;
							validate({buffer: topic, callback: callback, config: config}).then(
								function (problems) {
									assertProblems(problems, [
									{
										id: RULE_ID,
										severity: 'warning',
										description: "The 'in' expression\'s left operand is negated"
									}]);
								},
								function (error) {
									worker.getTestState().callback(error);
								});
						});
						it("should not flag negated in lhs 2", function(callback) {
							var topic = "if(!(a in b)) {}";
							var config = { rules: {} };
							config.rules[RULE_ID] = 1;
							validate({buffer: topic, callback: callback, config: config}).then(
								function (problems) {
									assertProblems(problems, []);
								},
								function (error) {
									worker.getTestState().callback(error);
								});
						});
						it("should not flag negated in lhs 3", function(callback) {
							var topic = "if(('' + !a) in b) {}";
							var config = { rules: {} };
							config.rules[RULE_ID] = 1;
							validate({buffer: topic, callback: callback, config: config}).then(
								function (problems) {
									assertProblems(problems, []);
								},
								function (error) {
									worker.getTestState().callback(error);
								});
						});
					});
					// no-obj-calls --------------------------------------------
					describe('no-obj-calls', function() {
						var RULE_ID = "no-obj-calls";
						it("flag Math used as a function", function(callback) {
							var topic = "var x = Math();";
							var config = { rules: {} };
							config.rules[RULE_ID] = 1;
							validate({buffer: topic, callback: callback, config: config}).then(
								function (problems) {
									assertProblems(problems, [
									{
										id: RULE_ID,
										severity: 'warning',
										description: "\'Math\' is not a function."
									}]);
								},
								function (error) {
									worker.getTestState().callback(error);
								});
						});
						it("flag JSON used as a function", function(callback) {
							var topic = "var y = JSON();";
							var config = { rules: {} };
							config.rules[RULE_ID] = 1;
							validate({buffer: topic, callback: callback, config: config}).then(
								function (problems) {
									assertProblems(problems, [
									{
										id: RULE_ID,
										severity: 'warning',
										description: "\'JSON\' is not a function."
									}]);
								},
								function (error) {
									worker.getTestState().callback(error);
								});
						});
						it("should not flag math() call", function(callback) {
							var topic = "var x = math();";
							var config = { rules: {} };
							config.rules[RULE_ID] = 1;
							validate({buffer: topic, callback: callback, config: config}).then(
								function (problems) {
									assertProblems(problems, []);
								},
								function (error) {
									worker.getTestState().callback(error);
								});
						});
						it("should not flag json() call", function(callback) {
							var topic = "var x = json();";
							var config = { rules: {} };
							config.rules[RULE_ID] = 1;
							validate({buffer: topic, callback: callback, config: config}).then(
								function (problems) {
									assertProblems(problems, []);
								},
								function (error) {
									worker.getTestState().callback(error);
								});
						});
					});
					// no-eq-null --------------------------------------------
					describe('no-eq-null', function() {
						this.timeout(10000000);
						var RULE_ID = "no-eq-null";
						it("flag == null", function(callback) {
							var topic = "if (foo == null) { bar(); }";
							var config = { rules: {} };
							config.rules[RULE_ID] = 1;
							validate({buffer: topic, callback: callback, config: config}).then(
								function (problems) {
									assertProblems(problems, [
									{
										id: RULE_ID,
										severity: 'warning',
										description: "Use '===' to compare with 'null'."
									}]);
								},
								function (error) {
									worker.getTestState().callback(error);
								});
						});
						it("flag != null", function(callback) {
							var topic = "while (qux != null) { bar(); }";
							var config = { rules: {} };
							config.rules[RULE_ID] = 1;
							validate({buffer: topic, callback: callback, config: config}).then(
								function (problems) {
									assertProblems(problems, [
									{
										id: RULE_ID,
										severity: 'warning',
										description: "Use '!==' to compare with 'null'."
									}]);
								},
								function (error) {
									worker.getTestState().callback(error);
								});
						});
						it("should not flag !== null", function(callback) {
							var topic = "while (qux !== null) { bar(); }";
							var config = { rules: {} };
							config.rules[RULE_ID] = 1;
							validate({buffer: topic, callback: callback, config: config}).then(
								function (problems) {
									assertProblems(problems, []);
								},
								function (error) {
									worker.getTestState().callback(error);
								});
						});
						it("should not flag === null", function(callback) {
							var topic = "if (foo === null) { bar(); }";
							var config = { rules: {} };
							config.rules[RULE_ID] = 1;
							validate({buffer: topic, callback: callback, config: config}).then(
								function (problems) {
									assertProblems(problems, []);
								},
								function (error) {
									worker.getTestState().callback(error);
								});
						});
					});
					// no-else-return --------------------------------------------
					describe('no-else-return', function() {
						var RULE_ID = "no-else-return";
						it("flag else after return", function(callback) {
							var topic = 	"function foo() {\n" +
										"    if (x) {\n" +
										"        return y;\n" +
										"    } else {\n" +
										"        return z;\n" +
										"    }\n" +
										"}";
							var config = { rules: {} };
							config.rules[RULE_ID] = 1;
							validate({buffer: topic, callback: callback, config: config}).then(
								function (problems) {
									assertProblems(problems, [
									{
										id: RULE_ID,
										severity: 'warning',
										description: "Unnecessary \'else\' after \'return\'."
									}]);
								},
								function (error) {
									worker.getTestState().callback(error);
								});
						});
						it("flag else after return 2", function(callback) {
							var topic = 	"function foo() {\n" +
										"    if (x) {\n" +
										"        return y;\n" +
										"    } else {\n" +
										"        var f = 2;\n" +
										"    }\n" +
										"}";
							var config = { rules: {} };
							config.rules[RULE_ID] = 1;
							validate({buffer: topic, callback: callback, config: config}).then(
								function (problems) {
									assertProblems(problems, [
									{
										id: RULE_ID,
										severity: 'warning',
										description: "Unnecessary \'else\' after \'return\'."
									}]);
								},
								function (error) {
									worker.getTestState().callback(error);
								});
						});
						it("flag else after return 3", function(callback) {
							var topic = "function foo() {\n" +
										"    if (x) {\n" +
										"        if (y) {\n" +
										"            return y;\n" +
										"        } else {\n" +
										"            return x;\n" +
										"        }\n" +
										"    } else {\n" +
										"        return z;\n" +
										"    }\n" +
										"}";
							var config = { rules: {} };
							config.rules[RULE_ID] = 1;
							validate({buffer: topic, callback: callback, config: config}).then(
								function (problems) {
									assertProblems(problems, [
									{
										id: RULE_ID,
										severity: 'warning',
										description: "Unnecessary \'else\' after \'return\'."
									},
									{
										id: RULE_ID,
										severity: 'warning',
										description: "Unnecessary \'else\' after \'return\'."
									}]);
								},
								function (error) {
									worker.getTestState().callback(error);
								});
						});
						it("should not flag else after return 3", function(callback) {
							var topic = "function foo() {\n" +
										"    if (x) {\n" +
										"        if (y) {\n" +
										"            return y;\n" +
										"        }\n" +
										"        return x;\n" +
										"    }\n" +
										"    return z;\n" +
										"}";
							var config = { rules: {} };
							config.rules[RULE_ID] = 1;
							validate({buffer: topic, callback: callback, config: config}).then(
								function (problems) {
									assertProblems(problems, []);
								},
								function (error) {
									worker.getTestState().callback(error);
								});
						});
						it("should not flag else after return", function(callback) {
							var topic = 	"function foo() {\n" +
										"    if (x) {\n" +
										"        return y;\n" +
										"    }\n" +
										"    return z;\n" +
										"}";
							var config = { rules: {} };
							config.rules[RULE_ID] = 1;
							validate({buffer: topic, callback: callback, config: config}).then(
								function (problems) {
									assertProblems(problems, []);
								},
								function (error) {
									worker.getTestState().callback(error);
								});
						});
					});
					// no-empty-label --------------------------------------------
					describe('no-empty-label', function() {
						var RULE_ID = "no-empty-label";
						it("flag empty label", function(callback) {
							var topic = 	"labeled: var x = 10;";
							var config = { rules: {} };
							config.rules[RULE_ID] = 1;
							validate({buffer: topic, callback: callback, config: config}).then(
								function (problems) {
									assertProblems(problems, [
									{
										id: RULE_ID,
										severity: 'warning',
										description: "Unexpected label \"labeled\""
									}]);
								},
								function (error) {
									worker.getTestState().callback(error);
								});
						});
						it("should not flag label", function(callback) {
							var topic = 	"labeled: for (var i=10; i; i--) {}";
							var config = { rules: {} };
							config.rules[RULE_ID] = 1;
							validate({buffer: topic, callback: callback, config: config}).then(
								function (problems) {
									assertProblems(problems, []);
								},
								function (error) {
									worker.getTestState().callback(error);
								});
						});
					});
					// no-self-compare  --------------------------------------------
					describe('no-self-compare', function() {
						var RULE_ID = "no-self-compare";
						it("flag self compare", function(callback) {
							var topic = 	"var x = 10; if (x === x) {x = 20;}";
							var config = { rules: {} };
							config.rules[RULE_ID] = 1;
							validate({buffer: topic, callback: callback, config: config}).then(
								function (problems) {
									assertProblems(problems, [
									{
										id: RULE_ID,
										severity: 'warning',
										description: "Comparing to itself is potentially pointless."
									}]);
								},
								function (error) {
									worker.getTestState().callback(error);
								});
						});
						it("should not flag compare", function(callback) {
							var topic = 	"var x = 10; var y = 9; if (x === y) {x = 20;}";
							var config = { rules: {} };
							config.rules[RULE_ID] = 1;
							validate({buffer: topic, callback: callback, config: config}).then(
								function (problems) {
									assertProblems(problems, []);
								},
								function (error) {
									worker.getTestState().callback(error);
								});
						});
					});
					// no-irregular-whitespace --------------------------------------------
					describe('no-irregular-whitespace', function() {
						var RULE_ID = "no-irregular-whitespace";
						it("flag irregular whitespace", function(callback) {
							var topic = 	"function thing() /*\u00A0*/{}";
							var config = { rules: {} };
							config.rules[RULE_ID] = 1;
							validate({buffer: topic, callback: callback, config: config}).then(
								function (problems) {
									assertProblems(problems, [
									{
										id: RULE_ID,
										severity: 'warning',
										description: "Irregular whitespace not allowed"
									}]);
								},
								function (error) {
									worker.getTestState().callback(error);
								});
						});
						it("flag irregular whitespace", function(callback) {
							var topic = 	"function thing(/*\u3000*/){}";
							var config = { rules: {} };
							config.rules[RULE_ID] = 1;
							validate({buffer: topic, callback: callback, config: config}).then(
								function (problems) {
									assertProblems(problems, [
									{
										id: RULE_ID,
										severity: 'warning',
										description: "Irregular whitespace not allowed"
									}]);
								},
								function (error) {
									worker.getTestState().callback(error);
								});
						});
						it("flag irregular whitespace", function(callback) {
							var topic = 	"function thing/*\u205f*/(){}";
							var config = { rules: {} };
							config.rules[RULE_ID] = 1;
							validate({buffer: topic, callback: callback, config: config}).then(
								function (problems) {
									assertProblems(problems, [
									{
										id: RULE_ID,
										severity: 'warning',
										description: "Irregular whitespace not allowed"
									}]);
								},
								function (error) {
									worker.getTestState().callback(error);
								});
						});
						it("should not flag irregular whitespace", function(callback) {
							var topic = 	"function thing(){ return ' \u3000thing';}";
							var config = { rules: {} };
							config.rules[RULE_ID] = 1;
							validate({buffer: topic, callback: callback, config: config}).then(
								function (problems) {
									assertProblems(problems, []);
								},
								function (error) {
									worker.getTestState().callback(error);
								});
						});
						it("flag irregular whitespace inside string - skipString false", function(callback) {
							var topic = "function thing(){ return ' \u3000thing';}";
							var config = { rules: {} };
							config.rules[RULE_ID] = [1, { "skipStrings": false }];
							validate({buffer: topic, callback: callback, config: config}).then(
								function (problems) {
									assertProblems(problems, [
									{
										id: RULE_ID,
										severity: 'warning',
										description: "Irregular whitespace not allowed"
									}]);
								},
								function (error) {
									worker.getTestState().callback(error);
								});
						});
						it("flag irregular whitespace inside regexp - skipRegExps false", function(callback) {
							var topic = "function thing(){ return / \u00A0regexp/;}";
							var config = { rules: {} };
							config.rules[RULE_ID] = [1, { "skipRegExps": false }];
							validate({buffer: topic, callback: callback, config: config}).then(
								function (problems) {
									assertProblems(problems, [
									{
										id: RULE_ID,
										severity: 'warning',
										description: "Irregular whitespace not allowed"
									}]);
								},
								function (error) {
									worker.getTestState().callback(error);
								});
						});
					});
					// no-self-assign  --------------------------------------------
					describe('no-self-assign', function() {
						var RULE_ID = "no-self-assign";
						it("flag self in variable declarator", function(callback) {
							var topic = 	"var x = 10, b = b;";
							var config = { rules: {} };
							config.rules[RULE_ID] = 1;
							validate({buffer: topic, callback: callback, config: config}).then(
								function (problems) {
									assertProblems(problems, [
									{
										id: RULE_ID,
										severity: 'warning',
										description: "'b' is assigned to itself."
									}]);
								},
								function (error) {
									worker.getTestState().callback(error);
								});
						});
						it("flag self assign in assignment expression", function(callback) {
							var topic = 	"var x = 10; x =x;";
							var config = { rules: {} };
							config.rules[RULE_ID] = 1;
							validate({buffer: topic, callback: callback, config: config}).then(
								function (problems) {
									assertProblems(problems, [
									{
										id: RULE_ID,
										severity: 'warning',
										description: "'x' is assigned to itself."
									}]);
								},
								function (error) {
									worker.getTestState().callback(error);
								});
						});
						it("should not flag assign in assignment expression", function(callback) {
							var topic = 	"var x = 10, X = 9; x = X;";
							var config = { rules: {} };
							config.rules[RULE_ID] = 1;
							validate({buffer: topic, callback: callback, config: config}).then(
								function (problems) {
									assertProblems(problems, []);
								},
								function (error) {
									worker.getTestState().callback(error);
								});
						});
						it("should not flag assign in assignment expression 2", function(callback) {
							var topic = 	"var y, X = 9; y = X;";
							var config = { rules: {} };
							config.rules[RULE_ID] = 1;
							validate({buffer: topic, callback: callback, config: config}).then(
								function (problems) {
									assertProblems(problems, []);
								},
								function (error) {
									worker.getTestState().callback(error);
								});
						});
						it("should not flag operator assignments", function(callback) {
							var topic = 	"var a; a += a; a -= a; a *= a; a /= a;";
							var config = { rules: {} };
							config.rules[RULE_ID] = 1;
							validate({buffer: topic, callback: callback, config: config}).then(
								function (problems) {
									assertProblems(problems, []);
								},
								function (error) {
									worker.getTestState().callback(error);
								});
						});
					});
					// type-checked-consistent-return --------------------------------------------
					describe('type-checked-consistent-return', function() {
						var RULE_ID = "type-checked-consistent-return";
						it("flag return boolean and return no value", function(callback) {
							var topic = 	"function doSomething(condition) { if (condition) { return true; } else { return; }}";
							var config = { rules: {} };
							config.rules[RULE_ID] = 1;
							validate({buffer: topic, callback: callback, config: config}).then(
								function (problems) {
									assertProblems(problems, [
									{
										id: RULE_ID,
										severity: 'warning',
										description: "Inconsistent return types: 'boolean', 'undefined'"
									}]);
								},
								function (error) {
									worker.getTestState().callback(error);
								});
						});
						it("flag return boolean and return number", function(callback) {
							var topic = 	"function doSomething(condition) { if (condition) { return true; } else { return 2; }}";
							var config = { rules: {} };
							config.rules[RULE_ID] = 1;
							validate({buffer: topic, callback: callback, config: config}).then(
								function (problems) {
									assertProblems(problems, [
									{
										id: RULE_ID,
										severity: 'warning',
										description: "Inconsistent return types: 'boolean', 'number'"
									}]);
								},
								function (error) {
									worker.getTestState().callback(error);
								});
						});
						it("flag return no value and boolean", function(callback) {
							var topic = 	"function doSomething(condition) { if (condition) { return; } else { return false; }}";
							var config = { rules: {} };
							config.rules[RULE_ID] = 1;
							validate({buffer: topic, callback: callback, config: config}).then(
								function (problems) {
									assertProblems(problems, [
									{
										id: RULE_ID,
										severity: 'warning',
										description: "Inconsistent return types: 'undefined', 'boolean'"
									}]);
								},
								function (error) {
									worker.getTestState().callback(error);
								});
						});
						it("should not flag return booleans", function(callback) {
							var topic = 	"function doSomething(condition) { if (condition) { return true; } else { return false; }}";
							var config = { rules: {} };
							config.rules[RULE_ID] = 1;
							validate({buffer: topic, callback: callback, config: config}).then(
								function (problems) {
									assertProblems(problems, []);
								},
								function (error) {
									worker.getTestState().callback(error);
								});
						});
						it("should not flag return with no values", function(callback) {
							var topic = 	"function doSomething(condition) { if (condition) { return; } else { return; }}";
							var config = { rules: {} };
							config.rules[RULE_ID] = 1;
							validate({buffer: topic, callback: callback, config: config}).then(
								function (problems) {
									assertProblems(problems, []);
								},
								function (error) {
									worker.getTestState().callback(error);
								});
						});
						it("should not flag return null and object", function(callback) {
							var topic = 	"function doSomething(condition) { if (condition) { return null; } else { return {}; }}";
							var config = { rules: {} };
							config.rules[RULE_ID] = 1;
							validate({buffer: topic, callback: callback, config: config}).then(
								function (problems) {
									assertProblems(problems, []);
								},
								function (error) {
									worker.getTestState().callback(error);
								});
						});
						it("should not flag return null and string concatenation", function(callback) {
							var topic = 	"function doSomething(condition) { if (condition) { return null; } else { return \"\" + 15; }}";
							var config = { rules: {} };
							config.rules[RULE_ID] = 1;
							validate({buffer: topic, callback: callback, config: config}).then(
								function (problems) {
									assertProblems(problems, []);
								},
								function (error) {
									worker.getTestState().callback(error);
								});
						});
						it("should not flag return null and string", function(callback) {
							var topic = 	"function doSomething(condition) { if (condition) { return null; } else { return \"\"; }}";
							var config = { rules: {} };
							config.rules[RULE_ID] = 1;
							validate({buffer: topic, callback: callback, config: config}).then(
								function (problems) {
									assertProblems(problems, []);
								},
								function (error) {
									worker.getTestState().callback(error);
								});
						});
						it("flag number and boolean returns", function(callback) {
							var topic = 	"function doSomething(condition) { if (condition) { return 3; } else { return false; }}";
							var config = { rules: {} };
							config.rules[RULE_ID] = 1;
							validate({buffer: topic, callback: callback, config: config}).then(
								function (problems) {
									assertProblems(problems, [
									{
										id: RULE_ID,
										severity: 'warning',
										description: "Inconsistent return types: \'number\', \'boolean\'"
									}]);
								},
								function (error) {
									worker.getTestState().callback(error);
								});
						});
						it("should not flag return string and string concatenation", function(callback) {
							var topic = 	"function doSomething(condition) { if (condition) { return \"\"; } else { return \"\" + 15; }}";
							var config = { rules: {} };
							config.rules[RULE_ID] = 1;
							validate({buffer: topic, callback: callback, config: config}).then(
								function (problems) {
									assertProblems(problems, []);
								},
								function (error) {
									worker.getTestState().callback(error);
								});
						});
						it("should not flag return number and number addition", function(callback) {
							var topic = 	"function doSomething(condition) { if (condition) { return 9; } else { return 15 + 6; }}";
							var config = { rules: {} };
							config.rules[RULE_ID] = 1;
							validate({buffer: topic, callback: callback, config: config}).then(
								function (problems) {
									assertProblems(problems, []);
								},
								function (error) {
									worker.getTestState().callback(error);
								});
						});
						it("should not flag return number and number substraction", function(callback) {
							var topic = 	"function doSomething(condition) { if (condition) { return 9; } else { return 15 - 6; }}";
							var config = { rules: {} };
							config.rules[RULE_ID] = 1;
							validate({buffer: topic, callback: callback, config: config}).then(
								function (problems) {
									assertProblems(problems, []);
								},
								function (error) {
									worker.getTestState().callback(error);
								});
						});
						it("should not flag return number and variable number type - this is using the tern object to resolve type", function(callback) {
							// https://bugs.eclipse.org/bugs/show_bug.cgi?id=485693
							var topic =
								"/**\n" +
								" * @param {Number} one\n" +
								" */\n" +
								"function foo(one) {\n" +
								"	if(one === 10) {\n" +
								"		return 0;\n" +
								"	}\n" +
								"	var two = one;\n" +
								"	return two;\n" +
								"}";
							var config = { rules: {} };
							config.rules[RULE_ID] = 1;
							validate({buffer: topic, callback: callback, config: config}).then(
								function (problems) {
									assertProblems(problems, []);
								},
								function (error) {
									worker.getTestState().callback(error);
								});
						});
						it("should not flag return null and String", function(callback) {
							var topic =
								"var getProjectName = function(name2) {\n" +
								"	if(name2.indexOf(\" | \") !== -1) {\n" +
								"		var s = name2.split(\" | \");\n" +
								"		return s.length > 1 ?name2.split(\" | \")[1].trim() : name2;\n" +
								"	}\n" +
								"	return name2;\n" +
								"};";
							var config = { rules: {} };
							config.rules[RULE_ID] = 1;
							validate({buffer: topic, callback: callback, config: config}).then(
								function (problems) {
									assertProblems(problems, []);
								},
								function (error) {
									worker.getTestState().callback(error);
								});
						});
					});
					// forbiddenExportImport --------------------------------------------
					describe('forbiddenExportImport', function() {
						var RULE_ID = "semi";
						it("flag invalid import/export", function(callback) {
							var topic = "import * as test from \"./files/es_modules_dep1\"";
							var config = { rules: {} };
							config.rules[RULE_ID] = [2, "never"];
							var features = Object.create(null);
							features.modules = false;
							config.ecmaFeatures = features;
							
							validate({buffer: topic, callback: callback, config: config}).then(
								function (problems) {
									assertProblems(problems, [
									{
										id: "forbiddenExportImport",
										severity: 'error',
										description: '\'import\' and \'export\' may appear only with \'sourceType: module\'',
										start: 0,
										end: 6
									}]);
								},
								function (error) {
									worker.getTestState().callback(error);
								});
						});
					});
					// no-void --------------------------------------------
					describe('no-void', function() {
						var RULE_ID = "no-void";
						it("flag invalid void", function(callback) {
							var topic = "var foo = void bar();";
							var config = { rules: {} };
							config.rules[RULE_ID] = 2;
							var features = Object.create(null);
							features.modules = false;
							config.ecmaFeatures = features;
							
							validate({buffer: topic, callback: callback, config: config}).then(
								function (problems) {
									assertProblems(problems, [
									{
										id: "no-void",
										severity: 'error',
										description: 'Expected \'undefined\' and instead saw \'void\'.',
										start: 10,
										end: 20
									}]);
								},
								function (error) {
									worker.getTestState().callback(error);
								});
						});
					});

					// no-implicit-coercion --------------------------------------------
					describe('no-implicit-coercion', function() {
						var RULE_ID = "no-implicit-coercion";
						it("flag invalid coercion for !!", function(callback) {
							var topic = "var foo = {}; var b = !!foo;";
							var config = { rules: {} };
							config.rules[RULE_ID] = 2;
							
							validate({buffer: topic, callback: callback, config: config}).then(
								function (problems) {
									assertProblems(problems, [
									{
										id: "no-implicit-coercion",
										severity: 'error',
										description: 'use \'Boolean(foo)\' instead.',
										start: 22,
										end: 27
									}]);
								},
								function (error) {
									worker.getTestState().callback(error);
								});
						});
						it("flag invalid coercion for ~", function(callback) {
							var topic = "var foo = \"\"; var b =  ~foo.indexOf(\".\");";
							var config = { rules: {} };
							config.rules[RULE_ID] = 2;
							
							validate({buffer: topic, callback: callback, config: config}).then(
								function (problems) {
									assertProblems(problems, [
									{
										id: "no-implicit-coercion",
										severity: 'error',
										description: 'use \'foo.indexOf(".") !== -1\' instead.',
										start: 23,
										end: 40
									}]);
								},
								function (error) {
									worker.getTestState().callback(error);
								});
						});
						it("flag invalid coercion for +", function(callback) {
							var topic = "var foo = {}; var n = +foo;";
							var config = { rules: {} };
							config.rules[RULE_ID] = 2;
							
							validate({buffer: topic, callback: callback, config: config}).then(
								function (problems) {
									assertProblems(problems, [
									{
										id: "no-implicit-coercion",
										severity: 'error',
										description: 'use \'Number(foo)\' instead.',
										start: 22,
										end: 26
									}]);
								},
								function (error) {
									worker.getTestState().callback(error);
								});
						});
						it("flag invalid coercion for 1 *", function(callback) {
							var topic = "var foo = {}; var n = 1 * foo;";
							var config = { rules: {} };
							config.rules[RULE_ID] = 2;
							
							validate({buffer: topic, callback: callback, config: config}).then(
								function (problems) {
									assertProblems(problems, [
									{
										id: "no-implicit-coercion",
										severity: 'error',
										description: 'use \'Number(foo)\' instead.',
										start: 22,
										end: 29
									}]);
								},
								function (error) {
									worker.getTestState().callback(error);
								});
						});
						it("flag invalid coercion for string", function(callback) {
							var topic = "var foo = 0; var s = \"\" + foo;";
							var config = { rules: {} };
							config.rules[RULE_ID] = 2;
							
							validate({buffer: topic, callback: callback, config: config}).then(
								function (problems) {
									assertProblems(problems, [
									{
										id: "no-implicit-coercion",
										severity: 'error',
										description: 'use \'String(foo)\' instead.',
										start: 21,
										end: 29
									}]);
								},
								function (error) {
									worker.getTestState().callback(error);
								});
						});
						it("flag invalid coercion for string 2", function(callback) {
							var topic = "var foo = 0; foo += \"\";";
							var config = { rules: {} };
							config.rules[RULE_ID] = 2;
							
							validate({buffer: topic, callback: callback, config: config}).then(
								function (problems) {
									assertProblems(problems, [
									{
										id: "no-implicit-coercion",
										severity: 'error',
										description: 'use \'foo = String(foo)\' instead.',
										start: 13,
										end: 22
									}]);
								},
								function (error) {
									worker.getTestState().callback(error);
								});
						});
						it("should not flag invalid coercion for Boolean()", function(callback) {
							var topic = "var foo = 0; var b = Boolean(foo);";
							var config = { rules: {} };
							config.rules[RULE_ID] = 2;
							
							validate({buffer: topic, callback: callback, config: config}).then(
								function (problems) {
									assertProblems(problems, []);
								},
								function (error) {
									worker.getTestState().callback(error);
								});
						});
						it("should not flag invalid coercion for indexOf() !==", function(callback) {
							var topic = "var foo = \"\"; var b = foo.indexOf(\".\") !== -1;";
							var config = { rules: {} };
							config.rules[RULE_ID] = 2;
							
							validate({buffer: topic, callback: callback, config: config}).then(
								function (problems) {
									assertProblems(problems, []);
								},
								function (error) {
									worker.getTestState().callback(error);
								});
						});
						it("should not flag invalid coercion for ~", function(callback) {
							var topic = "var foo = 0; var n = ~foo;";
							var config = { rules: {} };
							config.rules[RULE_ID] = 2;
							
							validate({buffer: topic, callback: callback, config: config}).then(
								function (problems) {
									assertProblems(problems, []);
								},
								function (error) {
									worker.getTestState().callback(error);
								});
						});
						it("should not flag invalid coercion for Number()", function(callback) {
							var topic = "var foo = {}; var n = Number(foo);";
							var config = { rules: {} };
							config.rules[RULE_ID] = 2;
							
							validate({buffer: topic, callback: callback, config: config}).then(
								function (problems) {
									assertProblems(problems, []);
								},
								function (error) {
									worker.getTestState().callback(error);
								});
						});
						it("should not flag invalid coercion for parseFloat()", function(callback) {
							var topic = "var foo = {}; var n = parseFloat(foo);";
							var config = { rules: {} };
							config.rules[RULE_ID] = 2;
							
							validate({buffer: topic, callback: callback, config: config}).then(
								function (problems) {
									assertProblems(problems, []);
								},
								function (error) {
									worker.getTestState().callback(error);
								});
						});
						it("should not flag invalid coercion for parseInt()", function(callback) {
							var topic = "var foo = {}; var n = parseInt(foo, 10);";
							var config = { rules: {} };
							config.rules[RULE_ID] = 2;
							
							validate({buffer: topic, callback: callback, config: config}).then(
								function (problems) {
									assertProblems(problems, []);
								},
								function (error) {
									worker.getTestState().callback(error);
								});
						});
						it("should not flag invalid coercion for String()", function(callback) {
							var topic = "var foo = {}; var s = String(foo);";
							var config = { rules: {} };
							config.rules[RULE_ID] = 2;
							
							validate({buffer: topic, callback: callback, config: config}).then(
								function (problems) {
									assertProblems(problems, []);
								},
								function (error) {
									worker.getTestState().callback(error);
								});
						});
						it("should flag invalid coercion for + when disabled", function(callback) {
							var topic = "var foo = {}; var n = +foo;";
							var config = { rules: {} };
							config.rules[RULE_ID] = [2, {"number" : false}];
							
							validate({buffer: topic, callback: callback, config: config}).then(
								function (problems) {
									assertProblems(problems, []);
								},
								function (error) {
									worker.getTestState().callback(error);
								});
						});
						it("should flag invalid coercion for + when disabled 2", function(callback) {
							var topic = "/*eslint no-implicit-coercion: [2, {\"number\": false } ]*/\n" +
										"var foo = {}; var n = +foo;";
							var config = { rules: {} };
							config.rules[RULE_ID] = 2;
							
							validate({buffer: topic, callback: callback, config: config}).then(
								function (problems) {
									assertProblems(problems, []);
								},
								function (error) {
									worker.getTestState().callback(error);
								});
						});
					});
					// no-extend-native --------------------------------------------
					describe('no-extend-native', function() {
						var RULE_ID = "no-extend-native";
						it("flag invalid extend native", function(callback) {
							var topic = "Object.prototype.a = \"a\";";
							var config = { rules: {} };
							config.rules[RULE_ID] = 2;
							var features = Object.create(null);
							features.modules = false;
							config.ecmaFeatures = features;
							
							validate({buffer: topic, callback: callback, config: config}).then(
								function (problems) {
									assertProblems(problems, [
									{
										id: "no-extend-native",
										severity: 'error',
										description: 'Object prototype is read only, properties should not be added.',
										start: 0,
										end: 24
									}]);
								},
								function (error) {
									worker.getTestState().callback(error);
								});
						});
						it("flag invalid extend native", function(callback) {
							var topic = "Object.defineProperty(Array.prototype, \"times\", { value: 999 });";
							var config = { rules: {} };
							config.rules[RULE_ID] = 2;
							var features = Object.create(null);
							features.modules = false;
							config.ecmaFeatures = features;
							
							validate({buffer: topic, callback: callback, config: config}).then(
								function (problems) {
									assertProblems(problems, [
									{
										id: "no-extend-native",
										severity: 'error',
										description: 'Array prototype is read only, properties should not be added.',
										start: 0,
										end: 63
									}]);
								},
								function (error) {
									worker.getTestState().callback(error);
								});
						});
						it("should not flag invalid extend native because of exceptions value", function(callback) {
							var topic = "Object.defineProperty(Array.prototype, \"times\", { value: 999 });";
							var config = { rules: {} };
							config.rules[RULE_ID] = [2, {"exceptions" : ["Array"]}];
							var features = Object.create(null);
							features.modules = false;
							config.ecmaFeatures = features;
							
							validate({buffer: topic, callback: callback, config: config}).then(
								function (problems) {
									assertProblems(problems, []);
								},
								function (error) {
									worker.getTestState().callback(error);
								});
						});
					});
					// no-lone-blocks --------------------------------------------
					describe('no-lone-blocks', function() {
						var RULE_ID = "no-lone-blocks";
						it("flag invalid lone blocks", function(callback) {
							var topic = "{}";
							var config = { rules: {} };
							config.rules[RULE_ID] = 2;
							var features = Object.create(null);
							features.modules = false;
							config.ecmaFeatures = features;
							
							validate({buffer: topic, callback: callback, config: config}).then(
								function (problems) {
									assertProblems(problems, [
									{
										id: "no-lone-blocks",
										severity: 'error',
										description: 'Block is redundant.',
										start: 0,
										end: 2
									}]);
								},
								function (error) {
									worker.getTestState().callback(error);
								});
						});
						it("flag invalid lone blocks 2", function(callback) {
							var topic = "if (foo) {bar();{baz();}}";
							var config = { rules: {} };
							config.rules[RULE_ID] = 2;
							var features = Object.create(null);
							features.modules = false;
							config.ecmaFeatures = features;
							
							validate({buffer: topic, callback: callback, config: config}).then(
								function (problems) {
									assertProblems(problems, [
									{
										id: "no-lone-blocks",
										severity: 'error',
										description: 'Nested block is redundant.',
										start: 16,
										end: 24
									}]);
								},
								function (error) {
									worker.getTestState().callback(error);
								});
						});
						it("flag invalid lone blocks 3", function(callback) {
							var topic = "function bar() {{baz();}}";
							var config = { rules: {} };
							config.rules[RULE_ID] = 2;
							var features = Object.create(null);
							features.modules = false;
							config.ecmaFeatures = features;
							
							validate({buffer: topic, callback: callback, config: config}).then(
								function (problems) {
									assertProblems(problems, [
									{
										id: "no-lone-blocks",
										severity: 'error',
										description: 'Nested block is redundant.',
										start: 16,
										end: 24
									}]);
								},
								function (error) {
									worker.getTestState().callback(error);
								});
						});
						it("flag invalid lone blocks 4", function(callback) {
							var topic = "{function foo() {}}";
							var config = { rules: {} };
							config.rules[RULE_ID] = 2;
							var features = Object.create(null);
							features.modules = false;
							config.ecmaFeatures = features;
							
							validate({buffer: topic, callback: callback, config: config}).then(
								function (problems) {
									assertProblems(problems, [
									{
										id: "no-lone-blocks",
										severity: 'error',
										description: 'Block is redundant.',
										start: 0,
										end: 19
									}]);
								},
								function (error) {
									worker.getTestState().callback(error);
								});
						});
						it("flag invalid lone blocks 5", function(callback) {
							var topic = "{aLabel: {}}";
							var config = { rules: {} };
							config.rules[RULE_ID] = 2;
							var features = Object.create(null);
							features.modules = false;
							config.ecmaFeatures = features;
							
							validate({buffer: topic, callback: callback, config: config}).then(
								function (problems) {
									assertProblems(problems, [
									{
										id: "no-lone-blocks",
										severity: 'error',
										description: 'Block is redundant.',
										start: 0,
										end: 12
									}]);
								},
								function (error) {
									worker.getTestState().callback(error);
								});
						});
					});
					// quotes --------------------------------------------
					describe('quotes', function() {
						var RULE_ID = "quotes";
						it("flag invalid quotes", function(callback) {
							var topic = "var d = \"double\";";
							var config = { rules: {} };
							config.rules[RULE_ID] = [2, "single"];
							
							validate({buffer: topic, callback: callback, config: config}).then(
								function (problems) {
									assertProblems(problems, [
									{
										id: "quotes",
										severity: 'error',
										description: 'Strings must use single quotes (\').',
										start: 8,
										end: 16
									}]);
								},
								function (error) {
									worker.getTestState().callback(error);
								});
						});
						it("flag invalid quotes 2", function(callback) {
							var topic = "var unescaped = \"a string containing 'single' quotes\";";
							var config = { rules: {} };
							config.rules[RULE_ID] = [2, "single"];
							
							validate({buffer: topic, callback: callback, config: config}).then(
								function (problems) {
									assertProblems(problems, [
									{
										id: "quotes",
										severity: 'error',
										description: 'Strings must use single quotes (\').',
										start: 16,
										end: 53
									}]);
								},
								function (error) {
									worker.getTestState().callback(error);
								});
						});
						it("flag invalid quotes 3", function(callback) {
							var topic = "var single = 'single';";
							var config = { rules: {} };
							config.rules[RULE_ID] = [2, "double", {"avoidEscape": true}];
							
							validate({buffer: topic, callback: callback, config: config}).then(
								function (problems) {
									assertProblems(problems, [
									{
										id: "quotes",
										severity: 'error',
										description: 'Strings must use double quotes (").',
										start: 13,
										end: 21
									}]);
								},
								function (error) {
									worker.getTestState().callback(error);
								});
						});
					});
					// yoda --------------------------------------------
					describe('yoda', function() {
						var RULE_ID = "yoda";
						it("flag invalid yoda comparison", function(callback) {
							var topic = "if (\"red\" === color) {}";
							var config = { rules: {} };
							config.rules[RULE_ID] = [2, "never"];
							
							validate({buffer: topic, callback: callback, config: config}).then(
								function (problems) {
									assertProblems(problems, [
									{
										id: "yoda",
										severity: 'error',
										description: 'Expected literal to be on the right side of ===.',
										start: 4,
										end: 19
									}]);
								},
								function (error) {
									worker.getTestState().callback(error);
								});
						});
						it("flag invalid yoda comparison 2", function(callback) {
							var topic = "if (true === flag) {}";
							var config = { rules: {} };
							config.rules[RULE_ID] = [2, "never"];
							
							validate({buffer: topic, callback: callback, config: config}).then(
								function (problems) {
									assertProblems(problems, [
									{
										id: "yoda",
										severity: 'error',
										description: 'Expected literal to be on the right side of ===.',
										start: 4,
										end: 17
									}]);
								},
								function (error) {
									worker.getTestState().callback(error);
								});
						});
						it("flag invalid yoda comparison 3", function(callback) {
							var topic = "if (5 > count) {}";
							var config = { rules: {} };
							config.rules[RULE_ID] = [2, "never"];
							
							validate({buffer: topic, callback: callback, config: config}).then(
								function (problems) {
									assertProblems(problems, [
									{
										id: "yoda",
										severity: 'error',
										description: 'Expected literal to be on the right side of >.',
										start: 4,
										end: 13
									}]);
								},
								function (error) {
									worker.getTestState().callback(error);
								});
						});
						it("flag invalid yoda comparison 4", function(callback) {
							var topic = "if (-1 < count) {}";
							var config = { rules: {} };
							config.rules[RULE_ID] = [2, "never"];
							
							validate({buffer: topic, callback: callback, config: config}).then(
								function (problems) {
									assertProblems(problems, [
									{
										id: "yoda",
										severity: 'error',
										description: 'Expected literal to be on the right side of <.',
										start: 4,
										end: 14
									}]);
								},
								function (error) {
									worker.getTestState().callback(error);
								});
						});
						it("flag invalid yoda comparison 5", function(callback) {
							var topic = "if (0 <= x && x < 1) {}";
							var config = { rules: {} };
							config.rules[RULE_ID] = [2, "never"];
							
							validate({buffer: topic, callback: callback, config: config}).then(
								function (problems) {
									assertProblems(problems, [
									{
										id: "yoda",
										severity: 'error',
										description: 'Expected literal to be on the right side of <=.',
										start: 4,
										end: 10
									}]);
								},
								function (error) {
									worker.getTestState().callback(error);
								});
						});
						it("flag invalid yoda comparison 6", function(callback) {
							var topic = "if (color === \"blue\") {}";
							var config = { rules: {} };
							config.rules[RULE_ID] = [2, "always"];
							
							validate({buffer: topic, callback: callback, config: config}).then(
								function (problems) {
									assertProblems(problems, [
									{
										id: "yoda",
										severity: 'error',
										description: 'Expected literal to be on the left side of ===.',
										start: 4,
										end: 20
									}]);
								},
								function (error) {
									worker.getTestState().callback(error);
								});
						});
						it("flag invalid yoda comparison 7", function(callback) {
							var topic = "if (\"red\" === color) {}";
							var config = { rules: {} };
							config.rules[RULE_ID] = [2, "never", {onlyEquality: true}];
							
							validate({buffer: topic, callback: callback, config: config}).then(
								function (problems) {
									assertProblems(problems, [
									{
										id: "yoda",
										severity: 'error',
										description: 'Expected literal to be on the right side of ===.',
										start: 4,
										end: 19
									}]);
								},
								function (error) {
									worker.getTestState().callback(error);
								});
						});
						it("should not flag invalid yoda comparison", function(callback) {
							var topic = "if (5 & value) {}";
							var config = { rules: {} };
							config.rules[RULE_ID] = [2, "never"];
							
							validate({buffer: topic, callback: callback, config: config}).then(
								function (problems) {
									assertProblems(problems, []);
								},
								function (error) {
									worker.getTestState().callback(error);
								});
						});
						it("should not flag invalid yoda comparison 2", function(callback) {
							var topic = "if (value === \"red\") {}";
							var config = { rules: {} };
							config.rules[RULE_ID] = [2, "never"];
							
							validate({buffer: topic, callback: callback, config: config}).then(
								function (problems) {
									assertProblems(problems, []);
								},
								function (error) {
									worker.getTestState().callback(error);
								});
						});
						it("should not flag invalid yoda comparison 3", function(callback) {
							var topic = "function isReddish(color) {return (color.hue < 60 || 300 < color.hue);}";
							var config = { rules: {} };
							config.rules[RULE_ID] = [2, "never", {exceptRange: true}];
							
							validate({buffer: topic, callback: callback, config: config}).then(
								function (problems) {
									assertProblems(problems, []);
								},
								function (error) {
									worker.getTestState().callback(error);
								});
						});
						it("should not flag invalid yoda comparison 4", function(callback) {
							var topic = "if (x < -1 || 1 < x) {}";
							var config = { rules: {} };
							config.rules[RULE_ID] = [2, "never", {exceptRange: true}];
							
							validate({buffer: topic, callback: callback, config: config}).then(
								function (problems) {
									assertProblems(problems, []);
								},
								function (error) {
									worker.getTestState().callback(error);
								});
						});
						it("should not flag invalid yoda comparison 5", function(callback) {
							var topic = "if (count < 10 && (0 <= rand && rand < 1)) {}";
							var config = { rules: {} };
							config.rules[RULE_ID] = [2, "never", {exceptRange: true}];
							
							validate({buffer: topic, callback: callback, config: config}).then(
								function (problems) {
									assertProblems(problems, []);
								},
								function (error) {
									worker.getTestState().callback(error);
								});
						});
						it("should not flag invalid yoda comparison 6", function(callback) {
							var topic = "function howLong(arr) {return (0 <= arr.length && arr.length < 10) ? \"short\" : \"long\";}";
							var config = { rules: {} };
							config.rules[RULE_ID] = [2, "never", {exceptRange: true}];
							
							validate({buffer: topic, callback: callback, config: config}).then(
								function (problems) {
									assertProblems(problems, []);
								},
								function (error) {
									worker.getTestState().callback(error);
								});
						});
						it("should not flag invalid yoda comparison 7", function(callback) {
							var topic = "if (x < -1 || 9 < x) {}";
							var config = { rules: {} };
							config.rules[RULE_ID] = [2, "never", {onlyEquality: true}];
							
							validate({buffer: topic, callback: callback, config: config}).then(
								function (problems) {
									assertProblems(problems, []);
								},
								function (error) {
									worker.getTestState().callback(error);
								});
						});
						it("should not flag invalid yoda comparison 8", function(callback) {
							var topic = "if (x !== 'foo' && 'bar' != x) {}";
							var config = { rules: {} };
							config.rules[RULE_ID] = [2, "never", {onlyEquality: true}];
							
							validate({buffer: topic, callback: callback, config: config}).then(
								function (problems) {
									assertProblems(problems, []);
								},
								function (error) {
									worker.getTestState().callback(error);
								});
						});
						it("should not flag invalid yoda comparison 9", function(callback) {
							var topic = "if ('blue' == value) {}";
							var config = { rules: {} };
							config.rules[RULE_ID] = [2, "always"];
							
							validate({buffer: topic, callback: callback, config: config}).then(
								function (problems) {
									assertProblems(problems, []);
								},
								function (error) {
									worker.getTestState().callback(error);
								});
						});
						it("should not flag invalid yoda comparison 10", function(callback) {
							var topic = "if (-1 < str.indexOf(substr)) {}";
							var config = { rules: {} };
							config.rules[RULE_ID] = [2, "always"];
							
							validate({buffer: topic, callback: callback, config: config}).then(
								function (problems) {
									assertProblems(problems, []);
								},
								function (error) {
									worker.getTestState().callback(error);
								});
						});
					});
					// no-param-reassign --------------------------------------------
					describe('no-param-reassign', function() {
						var RULE_ID = "no-param-reassign";
						it("flag invalid param reassign", function(callback) {
							var topic = "function foo(bar) {bar = 13;}";
							var config = { rules: {} };
							config.rules[RULE_ID] = 2;
							
							validate({buffer: topic, callback: callback, config: config}).then(
								function (problems) {
									assertProblems(problems, [
									{
										id: "no-param-reassign",
										severity: 'error',
										description: "Assignment to function parameter \'bar\'.",
										start: 19,
										end: 22
									}]);
								},
								function (error) {
									worker.getTestState().callback(error);
								});
						});
						it("flag invalid param reassign 2", function(callback) {
							var topic = "function foo(bar) {bar++;}";
							var config = { rules: {} };
							config.rules[RULE_ID] = 2;
							
							validate({buffer: topic, callback: callback, config: config}).then(
								function (problems) {
									assertProblems(problems, [
									{
										id: "no-param-reassign",
										severity: 'error',
										description: "Assignment to function parameter \'bar\'.",
										start: 19,
										end: 22
									}]);
								},
								function (error) {
									worker.getTestState().callback(error);
								});
						});
						it("flag invalid param reassign 3", function(callback) {
							var topic = "function foo(bar) {bar.prop = 'value';}";
							var config = { rules: {} };
							config.rules[RULE_ID] = [2, {props: true}];
							
							validate({buffer: topic, callback: callback, config: config}).then(
								function (problems) {
									assertProblems(problems, [
									{
										id: "no-param-reassign",
										severity: 'error',
										description: "Assignment to property of function parameter \'bar\'.",
										start: 19,
										end: 22
									}]);
								},
								function (error) {
									worker.getTestState().callback(error);
								});
						});
						it("flag invalid param reassign 4", function(callback) {
							var topic = "function foo(bar) {delete bar.aaa}";
							var config = { rules: {} };
							config.rules[RULE_ID] = [2, {props: true}];
							
							validate({buffer: topic, callback: callback, config: config}).then(
								function (problems) {
									assertProblems(problems, [
									{
										id: "no-param-reassign",
										severity: 'error',
										description: "Assignment to property of function parameter \'bar\'.",
										start: 26,
										end: 29
									}]);
								},
								function (error) {
									worker.getTestState().callback(error);
								});
						});
						it("flag invalid param reassign 5", function(callback) {
							var topic = "function foo(bar) {bar.aaaa++;}";
							var config = { rules: {} };
							config.rules[RULE_ID] = [2, {props: true}];
							
							validate({buffer: topic, callback: callback, config: config}).then(
								function (problems) {
									assertProblems(problems, [
									{
										id: "no-param-reassign",
										severity: 'error',
										description: "Assignment to property of function parameter \'bar\'.",
										start: 19,
										end: 22
									}]);
								},
								function (error) {
									worker.getTestState().callback(error);
								});
						});
						it("should not flag invalid param reassign", function(callback) {
							var topic = "function foo(bar) {bar.prop = 'value';}";
							var config = { rules: {} };
							config.rules[RULE_ID] = [2, {props: false}];
							
							validate({buffer: topic, callback: callback, config: config}).then(
								function (problems) {
									assertProblems(problems, []);
								},
								function (error) {
									worker.getTestState().callback(error);
								});
						});
						it("should not flag invalid param reassign 2", function(callback) {
							var topic = "function foo(bar) {delete bar.aaa}";
							var config = { rules: {} };
							config.rules[RULE_ID] = [2, {props: false}];
							
							validate({buffer: topic, callback: callback, config: config}).then(
								function (problems) {
									assertProblems(problems, []);
								},
								function (error) {
									worker.getTestState().callback(error);
								});
						});
						it("should not flag invalid param reassign 3", function(callback) {
							var topic = "function foo(bar) {bar.aaaa++;}";
							var config = { rules: {} };
							config.rules[RULE_ID] = [2, {props: false}];
							
							validate({buffer: topic, callback: callback, config: config}).then(
								function (problems) {
									assertProblems(problems, []);
								},
								function (error) {
									worker.getTestState().callback(error);
								});
						});
						it("should not flag invalid param reassign 4", function(callback) {
							var topic = "function foo(bar) {var baz = bar; baz++;}";
							var config = { rules: {} };
							config.rules[RULE_ID] = [2, {props: false}];
							
							validate({buffer: topic, callback: callback, config: config}).then(
								function (problems) {
									assertProblems(problems, []);
								},
								function (error) {
									worker.getTestState().callback(error);
								});
						});
					});
					// no-native-reassign --------------------------------------------
					describe('no-native-reassign', function() {
						var RULE_ID = "no-native-reassign";
						it("flag invalid native reassign", function(callback) {
							var topic = "Object = null";
							var config = { rules: {} };
							config.rules[RULE_ID] = 2;
							
							validate({buffer: topic, callback: callback, config: config}).then(
								function (problems) {
									assertProblems(problems, [
									{
										id: "no-native-reassign",
										severity: 'error',
										description: 'Read-only global \'Object\' should not be modified.',
										start: 0,
										end: 6
									}]);
								},
								function (error) {
									worker.getTestState().callback(error);
								});
						});
						it("flag invalid native reassign 2", function(callback) {
							var topic = "undefined = 1";
							var config = { rules: {} };
							config.rules[RULE_ID] = 2;
							
							validate({buffer: topic, callback: callback, config: config}).then(
								function (problems) {
									assertProblems(problems, [
									{
										id: "no-native-reassign",
										severity: 'error',
										description: 'Read-only global \'undefined\' should not be modified.',
										start: 0,
										end: 9
									}]);
								},
								function (error) {
									worker.getTestState().callback(error);
								});
						});
						it("flag invalid native reassign 3", function(callback) {
							var topic = "/* eslint-env browser */ window = {}";
							var config = { rules: {} };
							config.rules[RULE_ID] = 2;
							
							validate({buffer: topic, callback: callback, config: config}).then(
								function (problems) {
									assertProblems(problems, [
									{
										id: "no-native-reassign",
										severity: 'error',
										description: 'Read-only global \'window\' should not be modified.',
										start: 25,
										end: 31
									}]);
								},
								function (error) {
									worker.getTestState().callback(error);
								});
						});
						it("flag invalid native reassign 4", function(callback) {
							var topic = "/* eslint-env browser */ top = {}";
							var config = { rules: {} };
							config.rules[RULE_ID] = 2;
							
							validate({buffer: topic, callback: callback, config: config}).then(
								function (problems) {
									assertProblems(problems, [
									{
										id: "no-native-reassign",
										severity: 'error',
										description: 'Read-only global \'top\' should not be modified.',
										start: 25,
										end: 28
									}]);
								},
								function (error) {
									worker.getTestState().callback(error);
								});
						});
						it("flag invalid native reassign 5", function(callback) {
							var topic = "/*globals a:false*/ a = 1";
							var config = { rules: {} };
							config.rules[RULE_ID] = 2;
							
							validate({buffer: topic, callback: callback, config: config}).then(
								function (problems) {
									assertProblems(problems, [
									{
										id: "no-native-reassign",
										severity: 'error',
										description: 'Read-only global \'a\' should not be modified.',
										start: 20,
										end: 21
									}]);
								},
								function (error) {
									worker.getTestState().callback(error);
								});
						});
						it("should not flag invalid native reassign", function(callback) {
							var topic = "Object = null";
							var config = { rules: {} };
							config.rules[RULE_ID] = [2, {exceptions: ["Object"]}];
							
							validate({buffer: topic, callback: callback, config: config}).then(
								function (problems) {
									assertProblems(problems, []);
								},
								function (error) {
									worker.getTestState().callback(error);
								});
						});
						it("should not flag native reassign 2", function(callback) {
							var topic = "/*globals a:true*/ a = 1";
							var config = { rules: {} };
							config.rules[RULE_ID] = 2;
							
							validate({buffer: topic, callback: callback, config: config}).then(
								function (problems) {
									assertProblems(problems, []);
								},
								function (error) {
									worker.getTestState().callback(error);
								});
						});
					});
					// no-unused-expressions --------------------------------------------
					describe('no-unused-expressions', function() {
						var RULE_ID = "no-unused-expressions";
						it("flag invalid unused expressions", function(callback) {
							var topic = "var a = 1; a + 3;";
							var config = { rules: {} };
							config.rules[RULE_ID] = 2;
							
							validate({buffer: topic, callback: callback, config: config}).then(
								function (problems) {
									assertProblems(problems, [
									{
										id: "no-unused-expressions",
										severity: 'error',
										description: 'Expected an assignment or function call and instead saw an expression.',
										start: 11,
										end: 17
									}]);
								},
								function (error) {
									worker.getTestState().callback(error);
								});
						});
						it("flag invalid unused expressions 2", function(callback) {
							var topic = "a || b";
							var config = { rules: {} };
							config.rules[RULE_ID] = [2, { "allowShortCircuit": true }];
							
							validate({buffer: topic, callback: callback, config: config}).then(
								function (problems) {
									assertProblems(problems, [
									{
										id: "no-unused-expressions",
										severity: 'error',
										description: 'Expected an assignment or function call and instead saw an expression.',
										start: 0,
										end: 6
									}]);
								},
								function (error) {
									worker.getTestState().callback(error);
								});
						});
						it("flag invalid unused expressions 3", function(callback) {
							var topic = "a ? b : 0";
							var config = { rules: {} };
							config.rules[RULE_ID] = [2, { "allowTernary": true }];
							
							validate({buffer: topic, callback: callback, config: config}).then(
								function (problems) {
									assertProblems(problems, [
									{
										id: "no-unused-expressions",
										severity: 'error',
										description: 'Expected an assignment or function call and instead saw an expression.',
										start: 0,
										end: 9
									}]);
								},
								function (error) {
									worker.getTestState().callback(error);
								});
						});
						it("flag invalid unused expressions 4", function(callback) {
							var topic = "a ? b : c()";
							var config = { rules: {} };
							config.rules[RULE_ID] = [2, { "allowTernary": true }];
							
							validate({buffer: topic, callback: callback, config: config}).then(
								function (problems) {
									assertProblems(problems, [
									{
										id: "no-unused-expressions",
										severity: 'error',
										description: 'Expected an assignment or function call and instead saw an expression.',
										start: 0,
										end: 11
									}]);
								},
								function (error) {
									worker.getTestState().callback(error);
								});
						});
						it("should not flag invalid unused expressions", function(callback) {
							var topic = "var a = 1; a = 3;";
							var config = { rules: {} };
							config.rules[RULE_ID] = 2;
							
							validate({buffer: topic, callback: callback, config: config}).then(
								function (problems) {
									assertProblems(problems, []);
								},
								function (error) {
									worker.getTestState().callback(error);
								});
						});
						it("should not flag invalid unused expressions 2", function(callback) {
							var topic = "a && b()";
							var config = { rules: {} };
							config.rules[RULE_ID] = [2, {allowShortCircuit: true}];
							
							validate({buffer: topic, callback: callback, config: config}).then(
								function (problems) {
									assertProblems(problems, []);
								},
								function (error) {
									worker.getTestState().callback(error);
								});
						});
						it("should not flag invalid unused expressions 3", function(callback) {
							var topic = "a() || (b = c)";
							var config = { rules: {} };
							config.rules[RULE_ID] = [2, {allowShortCircuit: true}];
							
							validate({buffer: topic, callback: callback, config: config}).then(
								function (problems) {
									assertProblems(problems, []);
								},
								function (error) {
									worker.getTestState().callback(error);
								});
						});
						it("should not flag invalid unused expressions 4", function(callback) {
							var topic = "a ? b() : c()";
							var config = { rules: {} };
							config.rules[RULE_ID] = [2, {allowTernary: true}];
							
							validate({buffer: topic, callback: callback, config: config}).then(
								function (problems) {
									assertProblems(problems, []);
								},
								function (error) {
									worker.getTestState().callback(error);
								});
						});
						it("should not flag invalid unused expressions 5", function(callback) {
							var topic = "a ? (b = c) : d()";
							var config = { rules: {} };
							config.rules[RULE_ID] = [2, {allowTernary: true}];
							
							validate({buffer: topic, callback: callback, config: config}).then(
								function (problems) {
									assertProblems(problems, []);
								},
								function (error) {
									worker.getTestState().callback(error);
								});
						});
						it("should not flag invalid unused expressions 6", function(callback) {
							var topic =
								"/*eslint-env amd */\n" +
								"define([\n" +
								"'module\n" +
								"], function(module) {});";
							var config = { rules: {} };
							config.rules[RULE_ID] = 2;
							
							validate({buffer: topic, callback: callback, config: config}).then(
								function (problems) {
									assertProblems(problems, [
									{
										severity: 'error',
										description: 'Unterminated string constant',
										start: 29,
										end: 30
									}]);
								},
								function (error) {
									worker.getTestState().callback(error);
								});
						});
					});
					// no-trailing-spaces --------------------------------------------
					describe('no-trailing-spaces', function() {
						var RULE_ID = "no-trailing-spaces";
						it("flag invalid trailing spaces", function(callback) {
							var topic =
									"			\n" +
									"var f = 10;             \n" +
									"			";
							var config = { rules: {} };
							config.rules[RULE_ID] = [2, {"skipBlankLines" : false}];
							
							validate({buffer: topic, callback: callback, config: config}).then(
								function (problems) {
									assertProblems(problems, [
									{
										id: "no-trailing-spaces",
										severity: 'error',
										description: 'Trailing spaces not allowed.',
										start: 0,
										end: 3
									},
									{
										id: "no-trailing-spaces",
										severity: 'error',
										description: 'Trailing spaces not allowed.',
										start: 15,
										end: 28
									},
									{
										id: "no-trailing-spaces",
										severity: 'error',
										description: 'Trailing spaces not allowed.',
										start: 29,
										end: 32
									}]);
								},
								function (error) {
									worker.getTestState().callback(error);
								});
						});
						it("flag invalid trailing spaces", function(callback) {
							var topic =
									"			\n" +
									"var f = 10;             \n" +
									"			";
							var config = { rules: {} };
							config.rules[RULE_ID] = [2, {"skipBlankLines" : true}];
							
							validate({buffer: topic, callback: callback, config: config}).then(
								function (problems) {
									assertProblems(problems, [
									{
										id: "no-trailing-spaces",
										severity: 'error',
										description: 'Trailing spaces not allowed.',
										start: 15,
										end: 28
									}]);
								},
								function (error) {
									worker.getTestState().callback(error);
								});
						});
					});
			});
		});
	};
});
