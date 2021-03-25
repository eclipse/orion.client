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
/*eslint-env amd, mocha, browser, chai*/
/* eslint-disable missing-nls */
define([
'js-tests/javascript/testingWorker',
'javascript/support/ternproject/ternProjectManager',
'javascript/scriptResolver',
'orion/Deferred',
'orion/serviceregistry',
'chai/chai',
'mocha/mocha' //must stay at the end, not a module
], function(TestWorker, Manager, Resolver, Deferred, mServiceRegistry, chai) {
	var assert = chai.assert;
	var worker;
	before("reset timeout", function(done) {
		worker = TestWorker.instance({delayedStart: true});
		this.timeout(40000);
		worker.start(done);
	});
	after("stop the worker", function() {
		if(worker) {
			worker.terminate();
		}
	});
	
	var testFileClient = {
		createTestFiles: function(files) {
			assert(Array.isArray(files), 'Cannot create test files with no file names array');
			var _f = [];
			for (var i = 0; i < files.length; i++) {
				var _n = files[i];
				_f.push({
					Name: _n,
					name: _n,
					Path: this.fileServiceRootURL() + '/' + _n,
					path: this.fileServiceRootURL() + '/' + _n,
					Location: this.fileServiceRootURL() + '/' + _n,
					location: this.fileServiceRootURL() + '/' + _n,
					contentType: {
						name: 'JavaScript'
					}
				});
			}
			this.testfiles = _f;
			return _f;
		},
		fileServiceRootURL: function() {return 'TestingRoot';},
		/**
		 * @callback
		 */
		search: function(opts) {
			var files = this.testfiles;
			assert(Array.isArray(files), 'Failed to create test files during fileclient#search callback');
			var res = Object.create(null);
			res.response  = Object.create(null);
			res.response.numFound = files.length;
			res.response.docs = files;
			return new Deferred().resolve(res);
		}
	};
	
	var progressService = {
		setProgressMessage: function(message){
			this.lastMessage = message;
		},
		setProgressResult: function(message){
			this.lastResult = message.Message;
		},
		close: function(){
			this.closed = true;
		}
	};

	var serviceRegistry = new mServiceRegistry.ServiceRegistry();
	serviceRegistry.registerService("orion.core.file.client", testFileClient);
	serviceRegistry.registerService("orion.page.message", progressService);
	var resolver = new Resolver.ScriptResolver(serviceRegistry);
	var ternManager = new Manager.TernProjectManager(worker, resolver, serviceRegistry);
	
	function testLoadOptions(jsonOptions, expectedResultSnippet){
		assert.equal(progressService.lastMessage, null, "No options loaded, should have no progress message");
		assert(progressService.closed, "No options loaded, progress should be closed");
		return ternManager.loadTernProjectOptions(jsonOptions).then(function(){
			assert.equal(progressService.lastMessage, "Validating loadEagerly paths in your .tern-project file.", "Validating paths message does not match");
			if (expectedResultSnippet){
				assert(progressService.lastResult, "No result message was generated");
				assert(progressService.lastResult.indexOf(expectedResultSnippet) >= 0, "Result message does not contain expected snippet.\nExpected: " + expectedResultSnippet + "\nActual: " + progressService.lastResult);
			} else {
				assert.equal(progressService.lastResult, null, "Did not expected a result message");
			}
		});
	}
	
	describe("Tern Project Manager tests", function() {
		//we don't reset the server because the manager drives starts
		this.timeout(10000);
		before(function() {
			worker.ignore404s(true);
		});
		beforeEach(function(){
			progressService.lastMessage = null;
			progressService.lastResult = null;
			progressService.closed = true;
		});
		it("Test loadEagerly 1 - file exists", function() {
			testFileClient.createTestFiles(['test1.js']);
			return testLoadOptions({loadEagerly: ["test1.js"]}, null);
		});
		it("Test loadEagerly 2 - file does not exist", function() {
			return testLoadOptions({loadEagerly: ["test2.js"]}, "No file match found for: test2.js");
		});
		it("Test loadEagerly 3 - multiple matching files exist", function() {
			testFileClient.createTestFiles(['a/test3.js', 'b/test3.js']);
			return testLoadOptions({loadEagerly: ["test3.js"]}, "Multiple file matches found for: test3.js");
		});
		it("Test loadEagerly 4 - multiple file exists", function() {
			testFileClient.createTestFiles(['test4a.js', 'test4b.js']);
			return testLoadOptions({loadEagerly: ["test4a.js", "test4b.js"]}, null);
		});
		it("Test loadEagerly 5 - multiple file does not exist", function() {
			return testLoadOptions({loadEagerly: ["test5a.js", "test5b.js"]}, "No file match found for: test5a.js");
		});
		it("Test loadEagerly 6 - multiple files with multiple matches", function() {
			testFileClient.createTestFiles(['a/test6.js', 'b/test6.js']);
			return testLoadOptions({loadEagerly: ["test6.js", "test6.js"]}, "Multiple file matches found for: test6.js");
		});
		it("Test loadEagerly 7 - file exists in folder", function() {
			testFileClient.createTestFiles(['a/b/c/test7.js']);
			return testLoadOptions({loadEagerly: ["test7.js"]}, null);
		});
		it("Test loadEagerly 8 - file exists and found in folder", function() {
			testFileClient.createTestFiles(['a/b/c/test8.js']);
			return testLoadOptions({loadEagerly: ["a/b/c/test8.js"]}, null);
		});
		it("Test loadEagerly 9 - multiple file matches but exact path specified", function() {
			testFileClient.createTestFiles(['test9.js', 'a/test9.js', 'a/b/c/test9.js']);
			return testLoadOptions({loadEagerly: ["a/test9.js"]}, null);
		});
	});
});
