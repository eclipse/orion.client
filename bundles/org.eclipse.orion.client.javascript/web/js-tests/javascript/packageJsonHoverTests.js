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
'javascript/support/packagejson/packageJsonHover',
'chai/chai',
'orion/Deferred',
'i18n!javascript/nls/messages',
'mocha/mocha' //must stay at the end, not a module
], function(ASTManager, Hover, chai, Deferred, Messages) {
	var assert = chai.assert;

	var scriptResolver = {
		getWorkspaceFile: function getWorkspaceFile() {
			return new Deferred().resolve({name: "testfile", location: "location/testfile"});
		}
	};
	
	return function(worker) {
		var astManager = new ASTManager.JsonAstManager(),
			hover = new Hover(astManager, scriptResolver);
		
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
		
		describe('Package.json Hover Tests', function() {
			this.timeout(20000);
			it("Simple hover, no contents, application/json", function(done) {
				var options = {
					buffer: "",
					offset: 0,
					file: "package.json",
					contentType: "application/json",
					callback: done
				};
				return testHover(options, null);
			});
			it("Simple hover, no contents, javascript/config", function(done) {
				var options = {
					buffer: "",
					offset: 0,
					file: "package.json",
					contentType: "javascript/config",
					callback: done
				};
				return testHover(options, null);
			});
			it("Simple hover, not package.json file, application/json", function(done) {
				var options = {
					buffer: "",
					offset: 0,
					file: "somefile.json",
					contentType: "application/json",
					callback: done
				};
				return testHover(options, null);
			});
			it("Empty object", function(done) {
				var options = {
					buffer: "{}",
					offset: 1,
					file: "package.json",
					contentType: "javascript/config",
					callback: done
				};
				return testHover(options, null);
			});
			it("Empty object, extra whitespace", function(done) {
				var options = {
					buffer: "  {   }",
					offset: 6,
					file: "package.json",
					contentType: "javascript/config",
					callback: done
				};
				return testHover(options, null);
			});
			it("Name entry", function(done) {
				var options = {
					buffer: '{"name": "mypackage"}',
					offset: 4,
					file: "package.json",
					contentType: "javascript/config",
					callback: done
				};
				return testHover(options, {
					content: Messages.packageNameDoc,
					type: "markdown"
				});
			});
			it("Version entry", function(done) {
				var options = {
					buffer: '{"version": "3.4.5"}',
					offset: 4,
					file: "package.json",
					contentType: "javascript/config",
					callback: done
				};
				return testHover(options, {
					content: Messages.packageVersionDoc,
					type: "markdown"
				});
			});
			it("Description entry", function(done) {
				var options = {
					buffer: '{"description": "Some cool test package"}',
					offset: 4,
					file: "package.json",
					contentType: "javascript/config",
					callback: done
				};
				return testHover(options, {
					content: Messages.packageDescriptionDoc,
					type: "markdown"
				});
			});
			it("Keywords entry - .eslintrc", function(done) {
				var options = {
					buffer: '{"keywords": ["one", "two", "three"]}',
					offset: 4,
					file: "package.json",
					contentType: "javascript/config",
					callback: done
				};
				return testHover(options, {
					content: Messages.packageKeywordsDoc,
					type: "markdown"
				});
			});
			it("Homepage entry", function(done) {
				var options = {
					buffer: '{"homepage": "https://mypage.org"}',
					offset: 4,
					file: "package.json",
					contentType: "javascript/config",
					callback: done
				};
				return testHover(options, {
					content: Messages.packageHomepageDoc,
					type: "markdown"
				});
			});
			it("Bugs entry", function(done) {
				var options = {
					buffer: '{"bugs": "bugzilla"}',
					offset: 4,
					file: "package.json",
					contentType: "javascript/config",
					callback: done
				};
				return testHover(options, {
					content: Messages.packageBugsDoc,
					type: "markdown"
				});
			});
			it("License entry", function(done) {
				var options = {
					buffer: '{"license": "MIT"}',
					offset: 4,
					file: "package.json",
					contentType: "javascript/config",
					callback: done
				};
				return testHover(options, {
					content: Messages.packageLicenseDoc,
					type: "markdown"
				});
			});
			it("Author entry", function(done) {
				var options = {
					buffer: '{"author": "me"}',
					offset: 4,
					file: "package.json",
					contentType: "javascript/config",
					callback: done
				};
				return testHover(options, {
					content: Messages.packageAuthorDoc,
					type: "markdown"
				});
			});
			it("Contributors entry", function(done) {
				var options = {
					buffer: '{"contributors": [{"name": "me", "webpage": "me.com"}]}',
					offset: 4,
					file: "package.json",
					contentType: "javascript/config",
					callback: done
				};
				return testHover(options, {
					content: Messages.packageContributorsDoc,
					type: "markdown"
				});
			});
			it("Files entry", function(done) {
				var options = {
					buffer: '{"files": ["./myfile.js"]}',
					offset: 4,
					file: "package.json",
					contentType: "javascript/config",
					callback: done
				};
				return testHover(options, {
					content: Messages.packageFilesDoc,
					type: "markdown"
				});
			});
			it("Main entry", function(done) {
				var options = {
					buffer: '{"main": "./index.js"}',
					offset: 4,
					file: "package.json",
					contentType: "javascript/config",
					callback: done
				};
				return testHover(options, {
					content: Messages.packageMainDoc,
					type: "markdown"
				});
			});
			it("Bin entry", function(done) {
				var options = {
					buffer: '{"bin": "./foo.js"}',
					offset: 4,
					file: "package.json",
					contentType: "javascript/config",
					callback: done
				};
				return testHover(options, {
					content: Messages.packageBinDoc,
					type: "markdown"
				});
			});
			it("BundledDependencies entry", function(done) {
				var options = {
					buffer: '{"bundledDependencies": {}}',
					offset: 4,
					file: "package.json",
					contentType: "javascript/config",
					callback: done
				};
				return testHover(options, {
					content: Messages.packageBundledDepsDoc,
					type: "markdown"
				});
			});
			it("Config entry", function(done) {
				var options = {
					buffer: '{"config": {}}',
					offset: 4,
					file: "package.json",
					contentType: "javascript/config",
					callback: done
				};
				return testHover(options, {
					content: Messages.packageConfigDoc,
					type: "markdown"
				});
			});
			it("CPU entry", function(done) {
				var options = {
					buffer: '{"cpu": "x86"}',
					offset: 4,
					file: "package.json",
					contentType: "javascript/config",
					callback: done
				};
				return testHover(options, {
					content: Messages.packageCpuDoc,
					type: "markdown"
				});
			});
			it("Dependencies entry", function(done) {
				var options = {
					buffer: '{"dependencies": {}}',
					offset: 4,
					file: "package.json",
					contentType: "javascript/config",
					callback: done
				};
				return testHover(options, {
					content: Messages.packageDependenciesDoc,
					type: "markdown"
				});
			});
			it("DevDependencies entry", function(done) {
				var options = {
					buffer: '{"devDependencies": {}}',
					offset: 4,
					file: "package.json",
					contentType: "javascript/config",
					callback: done
				};
				return testHover(options, {
					content: Messages.packageDevDepsDoc,
					type: "markdown"
				});
			});
			it("Directories entry", function(done) {
				var options = {
					buffer: '{"directories": []}',
					offset: 4,
					file: "package.json",
					contentType: "javascript/config",
					callback: done
				};
				return testHover(options, {
					content: Messages.packageDirectoriesDoc,
					type: "markdown"
				});
			});
			it("Engines entry", function(done) {
				var options = {
					buffer: '{"engines": []}',
					offset: 4,
					file: "package.json",
					contentType: "javascript/config",
					callback: done
				};
				return testHover(options, {
					content: Messages.packageEnginesDoc,
					type: "markdown"
				});
			});
			it("EnginesStrict entry", function(done) {
				var options = {
					buffer: '{"engineStrict": []}',
					offset: 4,
					file: "package.json",
					contentType: "javascript/config",
					callback: done
				};
				return testHover(options, {
					content: Messages.packageEngineStrictDoc,
					type: "markdown"
				});
			});
			it("ESLintConfig entry", function(done) {
				var options = {
					buffer: '{"eslintConfig": []}',
					offset: 4,
					file: "package.json",
					contentType: "javascript/config",
					callback: done
				};
				return testHover(options, {
					content: Messages.packageEslintConfigDoc,
					type: "markdown"
				});
			});
			it("OptionalDependencies entry", function(done) {
				var options = {
					buffer: '{"optionalDependencies": []}',
					offset: 4,
					file: "package.json",
					contentType: "javascript/config",
					callback: done
				};
				return testHover(options, {
					content: Messages.packageOptionalDepsDoc,
					type: "markdown"
				});
			});
			it("OS entry", function(done) {
				var options = {
					buffer: '{"os": "windows"}',
					offset: 4,
					file: "package.json",
					contentType: "javascript/config",
					callback: done
				};
				return testHover(options, {
					content: Messages.packageOsDoc,
					type: "markdown"
				});
			});
			it("PeerDependencies entry", function(done) {
				var options = {
					buffer: '{"peerDependencies": []}',
					offset: 4,
					file: "package.json",
					contentType: "javascript/config",
					callback: done
				};
				return testHover(options, {
					content: Messages.packagePeerDepsDoc,
					type: "markdown"
				});
			});
			it("PreferGlobal entry", function(done) {
				var options = {
					buffer: '{"preferGlobal": true}',
					offset: 4,
					file: "package.json",
					contentType: "javascript/config",
					callback: done
				};
				return testHover(options, {
					content: Messages.packagePreferGlobalDoc,
					type: "markdown"
				});
			});
			it("Private entry", function(done) {
				var options = {
					buffer: '{"private": true}',
					offset: 4,
					file: "package.json",
					contentType: "javascript/config",
					callback: done
				};
				return testHover(options, {
					content: Messages.packagePrivateDoc,
					type: "markdown"
				});
			});
			it("PublishConfig entry", function(done) {
				var options = {
					buffer: '{"publishConfig": {}}',
					offset: 4,
					file: "package.json",
					contentType: "javascript/config",
					callback: done
				};
				return testHover(options, {
					content: Messages.packagePublishConfigDoc,
					type: "markdown"
				});
			});
			it("Repository entry", function(done) {
				var options = {
					buffer: '{"repository": "myrepo.org"}',
					offset: 4,
					file: "package.json",
					contentType: "javascript/config",
					callback: done
				};
				return testHover(options, {
					content: Messages.packageRepositoryDoc,
					type: "markdown"
				});
			});
			it("Scripts entry", function(done) {
				var options = {
					buffer: '{"scripts": {}}',
					offset: 4,
					file: "package.json",
					contentType: "javascript/config",
					callback: done
				};
				return testHover(options, {
					content: Messages.packageScriptsDoc,
					type: "markdown"
				});
			});
			it("Directories - bin entry", function(done) {
				var options = {
					buffer: '{"directories": {"bin": "./bin"}}',
					offset: 19,
					file: "package.json",
					contentType: "javascript/config",
					callback: done
				};
				return testHover(options, {
					content: Messages.packageDirBinDoc,
					type: "markdown"
				});
			});
			it("Directories - doc entry", function(done) {
				var options = {
					buffer: '{"directories": {"doc": "./doc"}}',
					offset: 19,
					file: "package.json",
					contentType: "javascript/config",
					callback: done
				};
				return testHover(options, {
					content: Messages.packageDirDocDoc,
					type: "markdown"
				});
			});
			it("Directories - example entry", function(done) {
				var options = {
					buffer: '{"directories": {"example": "./exp"}}',
					offset: 19,
					file: "package.json",
					contentType: "javascript/config",
					callback: done
				};
				return testHover(options, {
					content: Messages.packageDirExamplesDoc,
					type: "markdown"
				});
			});
			it("Directories - lib entry", function(done) {
				var options = {
					buffer: '{"directories": {"lib": "./lib"}}',
					offset: 19,
					file: "package.json",
					contentType: "javascript/config",
					callback: done
				};
				return testHover(options, {
					content: Messages.packageDirLibDoc,
					type: "markdown"
				});
			});
			it("Directories - man entry", function(done) {
				var options = {
					buffer: '{"directories": {"man": "./manual"}}',
					offset: 19,
					file: "package.json",
					contentType: "javascript/config",
					callback: done
				};
				return testHover(options, {
					content: Messages.packageDirManDoc,
					type: "markdown"
				});
			});
			it("Directories - test entry", function(done) {
				var options = {
					buffer: '{"directories": {"test": "./tests"}}',
					offset: 19,
					file: "package.json",
					contentType: "javascript/config",
					callback: done
				};
				return testHover(options, {
					content: Messages.packageDirTestDoc,
					type: "markdown"
				});
			});
			it("ESLint config - rules entry", function(done) {
				var options = {
					buffer: '{"eslintConfig": {"rules": {}}}',
					offset: 20,
					file: "package.json",
					contentType: "javascript/config",
					callback: done
				};
				return testHover(options, {
					content: Messages.rulesDoc,
					type: "markdown"
				});
			});
		});
	};
});
