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
'js-tests/javascript/testingWorker',
'javascript/jsonAstManager',
'javascript/support/ternproject/ternProjectHover',
'chai/chai',
'orion/Deferred',
'i18n!javascript/nls/messages',
'mocha/mocha' //must stay at the end, not a module
], function(TestWorker, ASTManager, Hover, chai, Deferred, Messages) {
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

	var scriptResolver = {
		getWorkspaceFile: function getWorkspaceFile() {
			return new Deferred().resolve({name: "testfile", location: "location/testfile"});
		}
	};

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

	describe('Tern Project File  Hover Tests', function() {
		this.timeout(20000);
		it("Simple hover, no contents, application/json", function(done) {
			var options = {
				buffer: "",
				offset: 0,
				file: ".tern-project",
				contentType: "application/json",
				callback: done
			};
			return testHover(options, null);
		});
		it("Simple hover, no contents, javascript/config", function(done) {
			var options = {
				buffer: "",
				offset: 0,
				file: ".tern-project",
				contentType: "javascript/config",
				callback: done
			};
			return testHover(options, null);
		});
		it("Simple hover, not .tern-project file, application/json", function(done) {
			var options = {
				buffer: "",
				offset: 0,
				file: "somefile.js",
				contentType: "application/json",
				callback: done
			};
			return testHover(options, null);
		});
		it("Empty object", function(done) {
			var options = {
				buffer: "{}",
				offset: 1,
				file: ".tern-project",
				contentType: "javascript/config",
				callback: done
			};
			return testHover(options, null);
		});
		it("Empty object, extra whitespace", function(done) {
			var options = {
				buffer: "  {   }",
				offset: 6,
				file: ".tern-project",
				contentType: "javascript/config",
				callback: done
			};
			return testHover(options, null);
		});
		it("Plugins entry", function(done) {
			var options = {
				buffer: '{"plugins": {}}',
				offset: 4,
				file: ".tern-project",
				contentType: "javascript/config",
				callback: done
			};
			return testHover(options, {
				content: Messages.plugins,
				type: "markdown"
			});
		});
		it("Libs entry", function(done) {
			var options = {
				buffer: '{"libs": []}',
				offset: 4,
				file: ".tern-project",
				contentType: "javascript/config",
				callback: done
			};
			return testHover(options, {
				content: Messages.libs,
				type: "markdown"
			});
		});
		it("DontLoad entry", function(done) {
			var options = {
				buffer: '{"dontLoad": []}',
				offset: 4,
				file: ".tern-project",
				contentType: "javascript/config",
				callback: done
			};
			return testHover(options, {
				content: Messages.dontLoad,
				type: "markdown"
			});
		});
		it("DependencyBudget entry - .eslintrc", function(done) {
			var options = {
				buffer: '{"dependencyBudget": 20000}',
				offset: 4,
				file: ".tern-project",
				contentType: "javascript/config",
				callback: done
			};
			return testHover(options, {
				content: Messages.dependencyBudget,
				type: "markdown"
			});
		});
		it("EcmaVersion entry", function(done) {
			var options = {
				buffer: '{"ecmaVersion": 6}',
				offset: 4,
				file: ".tern-project",
				contentType: "javascript/config",
				callback: done
			};
			return testHover(options, {
				content: Messages.ecmaVersionDescription,
				type: "markdown"
			});
		});
		it("LoadEagerly entry", function(done) {
			var options = {
				buffer: '{"loadEagerly": []}',
				offset: 4,
				file: ".tern-project",
				contentType: "javascript/config",
				callback: done
			};
			return testHover(options, {
				content: Messages.loadEagerly,
				type: "markdown"
			});
		});
		it("Node plugin entry", function(done) {
			var options = {
				buffer: '{"plugins": {"node": {}}}',
				offset: 16,
				file: ".tern-project",
				contentType: "javascript/config",
				callback: done
			};
			return testHover(options, {
				content: Messages.orionNodePluginDescription,
				type: "markdown"
			});
		});
		it("RequireJS plugin entry", function(done) {
			var options = {
				buffer: '{"plugins": {"requirejs": {}}}',
				offset: 16,
				file: ".tern-project",
				contentType: "javascript/config",
				callback: done
			};
			return testHover(options, {
				content: Messages.orionRequirePluginDescription,
				type: "markdown"
			});
		});
		it("Redis plugin entry", function(done) {
			var options = {
				buffer: '{"plugins": {"redis": {}}}',
				offset: 16,
				file: ".tern-project",
				contentType: "javascript/config",
				callback: done
			};
			return testHover(options, {
				content: Messages.orionRedisPluginDescription,
				type: "markdown"
			});
		});
		it("Unknown plugin entry", function(done) {
			var options = {
				buffer: '{"plugins": {"myplugin": {}}}',
				offset: 16,
				file: ".tern-project",
				contentType: "javascript/config",
				callback: done
			};
			return testHover(options, null);
		});
		it("Ecma5 lib entry", function(done) {
			var options = {
				buffer: '{"libs": ["ecma5"]}',
				offset: 13,
				file: ".tern-project",
				contentType: "javascript/config",
				callback: done
			};
			return testHover(options, {
				content: Messages.ecma5,
				type: "markdown"
			});
		});
		it("Ecma7 lib entry", function(done) {
			var options = {
				buffer: '{"libs": ["ecma7"]}',
				offset: 13,
				file: ".tern-project",
				contentType: "javascript/config",
				callback: done
			};
			return testHover(options, {
				content: Messages.ecma7,
				type: "markdown"
			});
		});
	});
});
