/*******************************************************************************
 * @license
 * Copyright (c) 2017 IBM Corporation, Inc. and others.
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
'javascript/jsonAstManager',
'javascript/support/eslint/eslintHover',
'chai/chai',
'orion/Deferred',
'i18n!javascript/nls/messages',
'mocha/mocha' //must stay at the end, not a module
], function(ASTManager, Hover, chai, Deferred, Messages) {
	var assert = chai.assert;

	var jsProject = {
		PACKAGE_JSON: "package.json",
		lintFiles: [".eslintrc", ".eslintrc.json", ".eslintrc.js", ".eslintrc.yml", ".eslintrc.yaml", "package.json"],
		getEcmaLevel: function getEcmaLevel() {},
		getESlintOptions: function getESlintOptions() {
			return new Deferred().resolve(null);
		},
		getComputedEnvironment: function getComputedEnvironment() {
			return new Deferred().resolve({});
		}
	};
	
	var scriptResolver = {
		getWorkspaceFile: function getWorkspaceFile() {
			return new Deferred().resolve({name: "testfile", location: "location/testfile"});
		}
	};
	
	return function(worker) {
		var astManager = new ASTManager.JsonAstManager(),
			hover = new Hover.ESLintHover(astManager, scriptResolver, jsProject);
		
		/**
		 * @description Sets up the test
		 * @param {Object} options The options the set up with
		 * @returns {Object} The object with the initialized values
		 */
		function setup(options) {
			var state = Object.create(null),
				buffer = state.buffer = typeof options.buffer === 'undefined' ? '' : options.buffer,
				offset = state.offset = typeof options.offset === 'undefined' ? 0 : options.offset,
				contentType = options.contentType,
				file = state.file = options.file;
			assert(options.callback, 'You must provide a test callback for worker-based tests');
			assert(contentType, "You must provide a content type to each test.");
			assert(file, "You must provide a file name for each test.");
			state.callback = options.callback;
			worker.setTestState(state);
			
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
				    o.name = file;
				    return new Deferred().resolve(o);
				}
			};
			astManager.onModelChanging({file: {location: file}});
			var params = {offset: offset};
			return {
				editorContext: editorContext,
				params: params
			};
		}
	
		/**
		 * @description Checks the hover object returned against the expected hover
		 * @param {Object} options The options to test with
		 * @param {?} expectedHover The hover object we were expecting to get
		 */
		function testHover(options, expectedHover) {
			var _p = setup(options);
			assert(_p, 'setup() should have completed normally');
			hover.computeHoverInfo(_p.editorContext, _p.params).then(function computeHoverInfo(hover) {
				try {
					if(!expectedHover) {
						assert(!hover, "No hover should have been returned: "+JSON.stringify(hover));
					} else {
						assert(hover, "A hover should have been returned. Expected: "+JSON.stringify(expectedHover));
						assert.equal(hover.type, expectedHover.type, "The hover types do not match.");
						//Check that the message is the same, ignoring the 'Online Documentation' link (since we can't build it in the tests)
						assert(hover.content.indexOf(expectedHover.content) === 0, "The hover content does not match.");
					}
					worker.getTestState().callback();
				} catch(err) {
					worker.getTestState().callback(err);
				}
			}, function promiseError(error) {
				worker.getTestState().callback(error);
			});
		}
		
		describe('ESlint Hover Tests', function() {
			this.timeout(20000);
			it("Simple hover, no contents, application/json", function(done) {
				var options = {
					buffer: "",
					offset: 0,
					file: ".eslintrc",
					contentType: "application/json",
					callback: done
				};
				return testHover(options, null);
			});
			it("Simple hover, no contents, javascript/config - .eslintrc", function(done) {
				var options = {
					buffer: "",
					offset: 0,
					file: ".eslintrc",
					contentType: "javascript/config",
					callback: done
				};
				return testHover(options, null);
			});
			it("Simple hover, no contents, javascript/config - .eslintrc.json", function(done) {
				var options = {
					buffer: "",
					offset: 0,
					file: ".eslintrc.json",
					contentType: "javascript/config",
					callback: done
				};
				return testHover(options, null);
			});
			it("Simple hover, no contents, javascript/config - .eslintrc.js", function(done) {
				var options = {
					buffer: "",
					offset: 0,
					file: ".eslintrc.js",
					contentType: "javascript/config",
					callback: done
				};
				return testHover(options, null);
			});
			it("Simple hover, no contents - .eslintrc.yml", function(done) {
				var options = {
					buffer: "",
					offset: 0,
					file: ".eslintrc.yml",
					contentType: "application/yml",
					callback: done
				};
				return testHover(options, null);
			});
			it("Simple hover, no contents - .eslintrc.yaml", function(done) {
				var options = {
					buffer: "",
					offset: 0,
					file: ".eslintrc.yaml",
					contentType: "application/yaml",
					callback: done
				};
				return testHover(options, null);
			});
			it("Simple hover, not eslint file, application/json", function(done) {
				var options = {
					buffer: "",
					offset: 0,
					file: "somefile",
					contentType: "application/json",
					callback: done
				};
				return testHover(options, null);
			});
			it("Empty object - .eslintrc", function(done) {
				var options = {
					buffer: "{}",
					offset: 1,
					file: ".eslintrc",
					contentType: "javascript/config",
					callback: done
				};
				return testHover(options, null);
			});
			it("Empty object, extra whitespace - .eslintrc", function(done) {
				var options = {
					buffer: "  {   }",
					offset: 6,
					file: ".eslintrc",
					contentType: "javascript/config",
					callback: done
				};
				return testHover(options, null);
			});
			it("Rules entry - .eslintrc", function(done) {
				var options = {
					buffer: '{"rules": {}}',
					offset: 4,
					file: ".eslintrc",
					contentType: "javascript/config",
					callback: done
				};
				return testHover(options, {
					content: Messages.rulesDoc,
					type: "markdown"
				});
			});
			it("ENV entry - .eslintrc", function(done) {
				var options = {
					buffer: '{"env": {}}',
					offset: 4,
					file: ".eslintrc",
					contentType: "javascript/config",
					callback: done
				};
				return testHover(options, {
					content: Messages.envDoc,
					type: "markdown"
				});
			});
			it("Globals entry - .eslintrc", function(done) {
				var options = {
					buffer: '{"globals": {}}',
					offset: 4,
					file: ".eslintrc",
					contentType: "javascript/config",
					callback: done
				};
				return testHover(options, {
					content: Messages.eslintGlobalsDoc,
					type: "markdown"
				});
			});
			it("Parser entry - .eslintrc", function(done) {
				var options = {
					buffer: '{"parser": "acorn"}',
					offset: 4,
					file: ".eslintrc",
					contentType: "javascript/config",
					callback: done
				};
				return testHover(options, {
					content: Messages.eslintParserDoc,
					type: "markdown"
				});
			});
			it("Plugins entry - .eslintrc", function(done) {
				var options = {
					buffer: '{"plugins": "acorn"}',
					offset: 4,
					file: ".eslintrc",
					contentType: "javascript/config",
					callback: done
				};
				return testHover(options, {
					content: Messages.eslintPluginsDoc,
					type: "markdown"
				});
			});
			it("Settings entry - .eslintrc", function(done) {
				var options = {
					buffer: '{"settings": {"acorn": true}',
					offset: 4,
					file: ".eslintrc",
					contentType: "javascript/config",
					callback: done
				};
				return testHover(options, {
					content: Messages.eslintSettingsDoc,
					type: "markdown"
				});
			});
			it("Extends entry - .eslintrc", function(done) {
				var options = {
					buffer: '{"extends": "acorn"}',
					offset: 4,
					file: ".eslintrc",
					contentType: "javascript/config",
					callback: done
				};
				return testHover(options, {
					content: Messages.eslintExtendsDoc,
					type: "markdown"
				});
			});
			it("ParserOptions entry - .eslintrc", function(done) {
				var options = {
					buffer: '{"parserOptions": {}}',
					offset: 4,
					file: ".eslintrc",
					contentType: "javascript/config",
					callback: done
				};
				return testHover(options, {
					content: Messages.eslintParserOptionsDoc,
					type: "markdown"
				});
			});
			it("ParserOptions.ecmaVersion entry - .eslintrc", function(done) {
				var options = {
					buffer: '{"parserOptions": {"ecmaVersion": 5}}',
					offset: 24,
					file: ".eslintrc",
					contentType: "javascript/config",
					callback: done
				};
				return testHover(options, {
					content: Messages.eslintEcmaVersion,
					type: "markdown"
				});
			});
			it("ParserOptions.sourceType entry - .eslintrc", function(done) {
				var options = {
					buffer: '{"parserOptions": {"sourceType": "module"}}',
					offset: 24,
					file: ".eslintrc",
					contentType: "javascript/config",
					callback: done
				};
				return testHover(options, {
					content: Messages.eslintSourceType,
					type: "markdown"
				});
			});
			it("ParserOptions.ecmaFeatures entry - .eslintrc", function(done) {
				var options = {
					buffer: '{"parserOptions": {"ecmaFeatures": {}}}',
					offset: 24,
					file: ".eslintrc",
					contentType: "javascript/config",
					callback: done
				};
				return testHover(options, {
					content: Messages.eslintParserOptionsDoc,
					type: "markdown"
				});
			});
			it("ParserOptions.ecmaFeatures.jsx entry - .eslintrc", function(done) {
				var options = {
					buffer: '{"parserOptions": {"ecmaFeatures": {"jsx": true}}}',
					offset: 38,
					file: ".eslintrc",
					contentType: "javascript/config",
					callback: done
				};
				return testHover(options, {
					content: Messages.eslintJSX,
					type: "markdown"
				});
			});
			it("ParserOptions.ecmaFeatures.impliedStrict entry - .eslintrc", function(done) {
				var options = {
					buffer: '{"parserOptions": {"ecmaFeatures": {"impliedStrict": true}}}',
					offset: 38,
					file: ".eslintrc",
					contentType: "javascript/config",
					callback: done
				};
				return testHover(options, {
					content: Messages.eslintImpliedStrict,
					type: "markdown"
				});
			});
			it("ParserOptions.ecmaFeatures.globalReturn entry - .eslintrc", function(done) {
				var options = {
					buffer: '{"parserOptions": {"ecmaFeatures": {"globalReturn": true}}}',
					offset: 38,
					file: ".eslintrc",
					contentType: "javascript/config",
					callback: done
				};
				return testHover(options, {
					content: Messages.eslintGlobalReturn,
					type: "markdown"
				});
			});
			it("ParserOptions.ecmaFeatures.experimentalObjectRestSpread entry - .eslintrc", function(done) {
				var options = {
					buffer: '{"parserOptions": {"ecmaFeatures": {"experimentalObjectRestSpread": true}}}',
					offset: 38,
					file: ".eslintrc",
					contentType: "javascript/config",
					callback: done
				};
				return testHover(options, {
					content: Messages.eslintObjectSpread,
					type: "markdown"
				});
			});
		});
	};
});
