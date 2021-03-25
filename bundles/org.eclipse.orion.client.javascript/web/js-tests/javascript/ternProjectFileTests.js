/*******************************************************************************
 * @license
 * Copyright (c) 2015, 2016 IBM Corporation, Inc. and others.
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
'chai/chai',
'mocha/mocha' //must stay at the end, not a module
], function(TestWorker, chai) {
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
	var defaultPlugins = [
		"node",
		"requirejs",
		"doc_comment",
		"jsdoc",
		"html",
		"open_impl",
		"amqp",
		"angular",
		"express",
		"mongodb",
		"mysql",
		"postgres",
		"redis",
		"plugins",
		"refs",
		"eslint"
	];
	var defaultPluginObject = {
		node:{},
		requirejs:{},
		amqp:{},
		angular:{},
		express:{},
		mongodb:{},
		mysql:{},
		postgres:{},
		redis:{}
	};
	var requiredPlugins = [
		"doc_comment",
		"jsdoc",
		"html",
		"open_impl",
		"plugins",
		"refs",
		"eslint",
		"outliner"
	];

	var defaultDefs = [
		"ecma5",
		"ecma6",
		"browser",
		"chai"
	];

	/**
	 * @description Checks if the given defs array has the given def in it
	 * @param {Array} defs The array of definitions
	 * @param {String} defName The name of the definition
	 * @returns {Boolean} if the array has the given definition in it or not
	 */
	function hasDef(defs, defName) {
		if(defs && Array.isArray(defs.defs)) {
			var _defs = defs.defs;
			for(var i = 0, len = _defs.length; i< len; i++) {
				if(_defs[i]["!name"] === defName) {
					return true;
				}
			}
		}
		return false;
	}

	/**
	 * @description Checks the returned state of the server
	 * @param {Array} expectedPlugins The plugins that are expected to be loaded
	 * @param {Array} expectedDefs The definitions that are expected to be loaded
	 * @param {Function} callback The function to call back to when the server responds
	 */
	function checkServerState(expectedPlugins, expectedDefs, callback) {
		worker.postMessage({request: "installed_plugins"}, function(plugins) {
			assert(plugins.plugins, "Tern returned no installed plugins");
			expectedPlugins.forEach(function(plugin) {
				assert(plugins.plugins[plugin], "The expected plugin '"+plugin+"' was not loaded");
			});
			worker.postMessage({request: "installed_defs"}, function(defs) {
				expectedDefs.forEach(function(def) {
					assert(hasDef(defs, def), "The expected definition file '"+def+"' was not loaded");
				});
				callback();
			});
		});
	}

	describe('Tern Project File Tests', function() {
		this.timeout(100000);

		before('Reset Tern Server', function(done) {
			worker.start(done); // Reset the tern server state to remove any prior files
		});

		it("non-existent contents", function(callback) {
			worker.postMessage({request: "start_server", args:{}}, /* @callback */ function(response) {
				assert(response, "We should have gotten a response");
				assert.equal("server_ready", response.state, "The server was not ready");
				checkServerState(requiredPlugins, [], callback);
			});
		});
		it("undefined contents", function(callback) {
			worker.postMessage({request: "start_server", args:{options: undefined}}, /* @callback */ function(response) {
				assert(response, "We should have gotten a response");
				assert.equal("server_ready", response.state, "The server was not ready");
				checkServerState(requiredPlugins, [], callback);
			});
		});
		it("null contents", function(callback) {
			worker.postMessage({request: "start_server", args:{options: null}}, /* @callback */ function(response) {
				assert(response, "We should have gotten a response");
				assert.equal("server_ready", response.state, "The server was not ready");
				checkServerState(requiredPlugins, [], callback);
			});
		});
		it("empty plugins contents", function(callback) {
			worker.postMessage({request: "start_server", args:{options: {plugins: {}}}}, /* @callback */ function(response) {
				assert(response, "We should have gotten a response");
				assert.equal("server_ready", response.state, "The server was not ready");
				checkServerState(requiredPlugins, [], callback);
			});
		});
		it("undefined plugins contents", function(callback) {
			worker.postMessage({request: "start_server", args:{options: {}}}, /* @callback */ function(response) {
				assert(response, "We should have gotten a response");
				assert.equal("server_ready", response.state, "The server was not ready");
				checkServerState(requiredPlugins, [], callback);
			});
		});
		it("empty defs contents", function(callback) {
			worker.postMessage({request: "start_server", args:{options: {defs: []}}}, /* @callback */ function(response) {
				assert(response, "We should have gotten a response");
				assert.equal("server_ready", response.state, "The server was not ready");
				checkServerState(requiredPlugins, [], callback);
			});
		});
		it("empty defs and plugins contents", function(callback) {
			worker.postMessage({request: "start_server", args:{options: {defs: [], plugins: {}}}}, /* @callback */ function(response) {
				assert(response, "We should have gotten a response");
				assert.equal("server_ready", response.state, "The server was not ready");
				checkServerState(requiredPlugins, [], callback);
			});
		});
		it("unknown def", function(callback) {
			worker.postMessage({request: "start_server", args:{options: {defs: ["foo"]}}}, /* @callback */ function(response) {
				assert(response, "We should have gotten a response");
				assert.equal("server_ready", response.state, "The server was not ready");
				checkServerState(requiredPlugins, [], callback);
			});
		});
		it("unknown def with known", function(callback) {
			worker.postMessage({request: "start_server", args:{options: {defs: ["foo", "ecma5"]}}}, /* @callback */ function(response) {
				assert(response, "We should have gotten a response");
				assert.equal("server_ready", response.state, "The server was not ready");
				checkServerState(requiredPlugins, ["ecma5"], callback);
			});
		});
		it("known defs", function(callback) {
			worker.postMessage({request: "start_server", args:{options: {defs: ["ecma5", "browser"]}}}, /* @callback */ function(response) {
				assert(response, "We should have gotten a response");
				assert.equal("server_ready", response.state, "The server was not ready");
				checkServerState(requiredPlugins, ["ecma5", "browser"], callback);
			});
		});
		/**
		 * @see https://bugs.eclipse.org/bugs/show_bug.cgi?id=488989
		 */
		it("mixed ecmaVersion 1", function(callback) {
			worker.postMessage({request: "start_server", args:{options: {ecmaVersion: 5, plugins: {}}}}, /* @callback */ function(response) {
				assert(response, "We should have gotten a response");
				assert.equal("server_ready", response.state, "The server was not ready");
				checkServerState(requiredPlugins, ["ecma5"], callback);
			});
		});
		/**
		 * @see https://bugs.eclipse.org/bugs/show_bug.cgi?id=488989
		 */
		it("mixed ecmaVersion 2", function(callback) {
			worker.postMessage({request: "start_server", args:{options: {ecmaVersion: 6, plugins: {}}}}, /* @callback */ function(response) {
				assert(response, "We should have gotten a response");
				assert.equal("server_ready", response.state, "The server was not ready");
				checkServerState(requiredPlugins, ["ecma5", "ecma6"], callback);
			});
		});
		/**
		 * @see https://bugs.eclipse.org/bugs/show_bug.cgi?id=488989
		 */
		it("mixed ecmaVersion 3", function(callback) {
			worker.postMessage({request: "start_server", args:{options: {ecmaVersion: 5, libs: ["ecma6"], plugins: {}}}}, /* @callback */ function(response) {
				assert(response, "We should have gotten a response");
				assert.equal("server_ready", response.state, "The server was not ready");
				checkServerState([], ["ecma5"], callback);
			});
		});
		/**
		 * @see https://bugs.eclipse.org/bugs/show_bug.cgi?id=488989
		 */
		it("mixed ecmaVersion 4", function(callback) {
			worker.postMessage({request: "start_server", args:{options: {ecmaVersion: 5, libs: ["ecma5"], plugins: {}}}}, /* @callback */ function(response) {
				assert(response, "We should have gotten a response");
				assert.equal("server_ready", response.state, "The server was not ready");
				checkServerState([], ["ecma5"], callback);
			});
		});
		/**
		 * @see https://bugs.eclipse.org/bugs/show_bug.cgi?id=488989
		 */
		it("mixed ecmaVersion 5", function(callback) {
			worker.postMessage({request: "start_server", args:{options: {ecmaVersion: 6, libs: ["ecma6"], plugins: {}}}}, /* @callback */ function(response) {
				assert(response, "We should have gotten a response");
				assert.equal("server_ready", response.state, "The server was not ready");
				checkServerState([], ["ecma5", "ecma6"], callback);
			});
		});
		/**
		 * @see https://bugs.eclipse.org/bugs/show_bug.cgi?id=488989
		 */
		it("mixed ecmaVersion 6", function(callback) {
			worker.postMessage({request: "start_server", args:{options: {ecmaVersion: 6, libs: ["ecma5"], plugins: {}}}}, /* @callback */ function(response) {
				assert(response, "We should have gotten a response");
				assert.equal("server_ready", response.state, "The server was not ready");
				checkServerState([], ["ecma5", "ecma6"], callback);
			});
		});
		/**
		 * @see https://bugs.eclipse.org/bugs/show_bug.cgi?id=488989
		 */
		it("mixed ecmaVersion 7", function(callback) {
			worker.postMessage({request: "start_server", args:{options: {ecmaVersion: 5, libs: ["ecma6", "ecma5"], plugins: {}}}}, /* @callback */ function(response) {
				assert(response, "We should have gotten a response");
				assert.equal("server_ready", response.state, "The server was not ready");
				checkServerState([], ["ecma5"], callback);
			});
		});
		/**
		 * @see https://bugs.eclipse.org/bugs/show_bug.cgi?id=488989
		 */
		it("mixed ecmaVersion 8", function(callback) {
			worker.postMessage({request: "start_server", args:{options: {ecmaVersion: 5, libs: ["ecma5", "ecma6"], plugins: {}}}}, /* @callback */ function(response) {
				assert(response, "We should have gotten a response");
				assert.equal("server_ready", response.state, "The server was not ready");
				checkServerState([], ["ecma5"], callback);
			});
		});
		it("bad ecmaVersion 1", function(callback) {
			worker.postMessage({request: "start_server", args:{options: {ecmaVersion: "3"}}}, /* @callback */ function(response) {
				assert(response, "We should have gotten a response");
				assert.equal("server_ready", response.state, "The server was not ready");
				checkServerState(requiredPlugins, [], callback);
			});
		});
		it("bad ecmaVersion 2", function(callback) {
			worker.postMessage({request: "start_server", args:{options: {ecmaVersion: {}}}}, /* @callback */ function(response) {
				assert(response, "We should have gotten a response");
				assert.equal("server_ready", response.state, "The server was not ready");
				checkServerState(requiredPlugins, [], callback);
			});
		});
		it("bad ecmaVersion 3", function(callback) {
			worker.postMessage({request: "start_server", args:{options: {ecmaVersion: true}}}, /* @callback */ function(response) {
				assert(response, "We should have gotten a response");
				assert.equal("server_ready", response.state, "The server was not ready");
				checkServerState(requiredPlugins, [], callback);
			});
		});
		it("ecmaVersion", function(callback) {
			worker.postMessage({request: "start_server", args:{options: {ecmaVersion: 5}}}, /* @callback */ function(response) {
				assert(response, "We should have gotten a response");
				assert.equal("server_ready", response.state, "The server was not ready");
				checkServerState(requiredPlugins, ["ecma5"], callback);
			});
		});
		it("bad dependencyBudget 1", function(callback) {
			worker.postMessage({request: "start_server", args:{options: {dependencyBudget: {}}}}, /* @callback */ function(response) {
				assert(response, "We should have gotten a response");
				assert.equal("server_ready", response.state, "The server was not ready");
				checkServerState(requiredPlugins, [], callback);
			});
		});
		it("bad dependencyBudget 2", function(callback) {
			worker.postMessage({request: "start_server", args:{options: {dependencyBudget: "34"}}}, /* @callback */ function(response) {
				assert(response, "We should have gotten a response");
				assert.equal("server_ready", response.state, "The server was not ready");
				checkServerState(requiredPlugins, [], callback);
			});
		});
		it("bad dependencyBudget 3", function(callback) {
			worker.postMessage({request: "start_server", args:{options: {dependencyBudget: false}}}, /* @callback */ function(response) {
				assert(response, "We should have gotten a response");
				assert.equal("server_ready", response.state, "The server was not ready");
				checkServerState(requiredPlugins, [], callback);
			});
		});
		it("dependencyBudget", function(callback) {
			worker.postMessage({request: "start_server", args:{options: {dependencyBudget: 3100}}}, /* @callback */ function(response) {
				assert(response, "We should have gotten a response");
				assert.equal("server_ready", response.state, "The server was not ready");
				checkServerState(requiredPlugins, [], callback);
			});
		});
		it("bad plugins 1", function(callback) {
			worker.postMessage({request: "start_server", args:{options: {plugins: []}}}, /* @callback */ function(response) {
				assert(response, "We should have gotten a response");
				assert.equal("server_ready", response.state, "The server was not ready");
				checkServerState(requiredPlugins, [], callback);
			});
		});
		it("bad plugins 2", function(callback) {
			worker.postMessage({request: "start_server", args:{options: {plugins: true}}}, /* @callback */ function(response) {
				assert(response, "We should have gotten a response");
				assert.equal("server_ready", response.state, "The server was not ready");
				checkServerState(requiredPlugins, [], callback);
			});
		});
		it("bad plugins 3", function(callback) {
			worker.postMessage({request: "start_server", args:{options: {plugins: 1}}}, /* @callback */ function(response) {
				assert(response, "We should have gotten a response");
				assert.equal("server_ready", response.state, "The server was not ready");
				checkServerState(requiredPlugins, [], callback);
			});
		});
		it("bad plugins 4", function(callback) {
			worker.postMessage({request: "start_server", args:{options: {plugins: "hello"}}}, /* @callback */ function(response) {
				assert(response, "We should have gotten a response");
				assert.equal("server_ready", response.state, "The server was not ready");
				checkServerState(requiredPlugins, [], callback);
			});
		});
		it("bad plugins decl 1", function(callback) {
			worker.postMessage({request: "start_server", args:{options: {plugins: {foo: true}}}}, /* @callback */ function(response) {
				assert(response, "We should have gotten a response");
				assert.equal("server_ready", response.state, "The server was not ready");
				checkServerState(requiredPlugins, [], callback);
			});
		});
		it("bad plugins decl 2", function(callback) {
			worker.postMessage({request: "start_server", args:{options: {plugins: {foo: null}}}}, /* @callback */ function(response) {
				assert(response, "We should have gotten a response");
				assert.equal("server_ready", response.state, "The server was not ready");
				checkServerState(requiredPlugins, [], callback);
			});
		});
		it("bad plugins decl 3", function(callback) {
			worker.postMessage({request: "start_server", args:{options: {plugins: {foo: undefined}}}}, /* @callback */ function(response) {
				assert(response, "We should have gotten a response");
				assert.equal("server_ready", response.state, "The server was not ready");
				checkServerState(requiredPlugins, [], callback);
			});
		});
		it("bad plugins decl 4", function(callback) {
			worker.postMessage({request: "start_server", args:{options: {plugins: {foo: ""}}}}, /* @callback */ function(response) {
				assert(response, "We should have gotten a response");
				assert.equal("server_ready", response.state, "The server was not ready");
				checkServerState(requiredPlugins, [], callback);
			});
		});
		it("bad plugins decl 5", function(callback) {
			worker.postMessage({request: "start_server", args:{options: {plugins: {foo: []}}}}, /* @callback */ function(response) {
				assert(response, "We should have gotten a response");
				assert.equal("server_ready", response.state, "The server was not ready");
				checkServerState(requiredPlugins, [], callback);
			});
		});
		it("bad defs 1", function(callback) {
			worker.postMessage({request: "start_server", args:{options: {defs: "hello"}}}, /* @callback */ function(response) {
				assert(response, "We should have gotten a response");
				assert.equal("server_ready", response.state, "The server was not ready");
				checkServerState(requiredPlugins, [], callback);
			});
		});
		it("bad defs 2", function(callback) {
			worker.postMessage({request: "start_server", args:{options: {defs: true}}}, /* @callback */ function(response) {
				assert(response, "We should have gotten a response");
				assert.equal("server_ready", response.state, "The server was not ready");
				checkServerState(requiredPlugins, [], callback);
			});
		});
		it("bad defs 3", function(callback) {
			worker.postMessage({request: "start_server", args:{options: {defs: []}}}, /* @callback */ function(response) {
				assert(response, "We should have gotten a response");
				assert.equal("server_ready", response.state, "The server was not ready");
				checkServerState(requiredPlugins, [], callback);
			});
		});
		it("bad defs 4", function(callback) {
			worker.postMessage({request: "start_server", args:{options: {defs: 1}}}, /* @callback */ function(response) {
				assert(response, "We should have gotten a response");
				assert.equal("server_ready", response.state, "The server was not ready");
				checkServerState(requiredPlugins, [], callback);
			});
		});
		it("plugins and bad defs 1", function(callback) {
			worker.postMessage({request: "start_server", args:{options: {plugins: {}, defs: 1}}}, /* @callback */ function(response) {
				assert(response, "We should have gotten a response");
				assert.equal("server_ready", response.state, "The server was not ready");
				checkServerState(requiredPlugins, [], callback);
			});
		});
		it("plugins and bad defs 2", function(callback) {
			worker.postMessage({request: "start_server", args:{options: {plugins: {}, defs: "hello"}}}, /* @callback */ function(response) {
				assert(response, "We should have gotten a response");
				assert.equal("server_ready", response.state, "The server was not ready");
				checkServerState(requiredPlugins, [], callback);
			});
		});
		it("plugins and bad defs 3", function(callback) {
			worker.postMessage({request: "start_server", args:{options: {plugins: {}, defs: true}}}, /* @callback */ function(response) {
				assert(response, "We should have gotten a response");
				assert.equal("server_ready", response.state, "The server was not ready");
				checkServerState(requiredPlugins, [], callback);
			});
		});
		it("plugins and bad defs entry 1", function(callback) {
			worker.postMessage({request: "start_server", args:{options: {plugins: {}, defs: [1]}}}, /* @callback */ function(response) {
				assert(response, "We should have gotten a response");
				assert.equal("server_ready", response.state, "The server was not ready");
				checkServerState(requiredPlugins, [], callback);
			});
		});
		it("plugins and bad defs entry 2", function(callback) {
			worker.postMessage({request: "start_server", args:{options: {plugins: {}, defs: ["hello"]}}}, /* @callback */ function(response) {
				assert(response, "We should have gotten a response");
				assert.equal("server_ready", response.state, "The server was not ready");
				checkServerState(requiredPlugins, [], callback);
			});
		});
		it("plugins and bad defs entry 3", function(callback) {
			worker.postMessage({request: "start_server", args:{options: {plugins: {}, defs: [null]}}}, /* @callback */ function(response) {
				assert(response, "We should have gotten a response");
				assert.equal("server_ready", response.state, "The server was not ready");
				checkServerState(requiredPlugins, [], callback);
			});
		});
		it("plugins and bad defs entry 4", function(callback) {
			worker.postMessage({request: "start_server", args:{options: {plugins: {}, defs: [undefined]}}}, /* @callback */ function(response) {
				assert(response, "We should have gotten a response");
				assert.equal("server_ready", response.state, "The server was not ready");
				checkServerState(requiredPlugins, [], callback);
			});
		});
		it("plugins and bad defs entry 5", function(callback) {
			worker.postMessage({request: "start_server", args:{options: {plugins: {}, defs: [{}]}}}, /* @callback */ function(response) {
				assert(response, "We should have gotten a response");
				assert.equal("server_ready", response.state, "The server was not ready");
				checkServerState(requiredPlugins, [], callback);
			});
		});
		it("plugins and bad defs entry 6", function(callback) {
			worker.postMessage({request: "start_server", args:{options: {plugins: {}, defs: [[]]}}}, /* @callback */ function(response) {
				assert(response, "We should have gotten a response");
				assert.equal("server_ready", response.state, "The server was not ready");
				checkServerState(requiredPlugins, [], callback);
			});
		});
		it("bad plugins and bad defs 1", function(callback) {
			worker.postMessage({request: "start_server", args:{options: {plugins: true, defs: true}}}, /* @callback */ function(response) {
				assert(response, "We should have gotten a response");
				assert.equal("server_ready", response.state, "The server was not ready");
				checkServerState(requiredPlugins, [], callback);
			});
		});
		/**
		 * https://bugs.eclipse.org/bugs/show_bug.cgi?id=484832
		 */
		it("plugins mixed in 1", function(callback) {
			worker.postMessage({request: "start_server", args:{options: {plugins: {"node": {}}}}}, /* @callback */ function(response) {
				assert(response, "We should have gotten a response");
				assert.equal("server_ready", response.state, "The server was not ready");
				checkServerState(["doc_comment",
									"jsdoc",
									"html",
									"open_impl",
									"plugins",
									"refs",
									"eslint",
									"outliner",
									"node"], [], callback);
			});
		});
		/**
		 * https://bugs.eclipse.org/bugs/show_bug.cgi?id=484832
		 */
		it("plugins mixed in 2", function(callback) {
			worker.postMessage({request: "start_server", args:{options: {plugins: {"node": {}, "requirejs": {}}}}}, /* @callback */ function(response) {
				assert(response, "We should have gotten a response");
				assert.equal("server_ready", response.state, "The server was not ready");
				checkServerState(["doc_comment",
									"jsdoc",
									"html",
									"open_impl",
									"plugins",
									"refs",
									"eslint",
									"outliner",
									"node",
									"requirejs"], [], callback);
			});
		});
		/**
		 * https://bugs.eclipse.org/bugs/show_bug.cgi?id=484832
		 */
		it("plugins mixed in 3", function(callback) {
			worker.postMessage({request: "start_server", args:{options: {plugins: {"node": {}, "foobar": {}}}}}, /* @callback */ function(response) {
				assert(response, "We should have gotten a response");
				assert.equal("server_ready", response.state, "The server was not ready");
				checkServerState(["doc_comment",
									"jsdoc",
									"html",
									"open_impl",
									"plugins",
									"refs",
									"eslint",
									"outliner",
									"node"], [], callback);
			});
		});
	});
});
