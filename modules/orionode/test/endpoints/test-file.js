/*******************************************************************************
 * Copyright (c) 2017, 2019 IBM Corporation and others.
 * All rights reserved. This program and the accompanying materials are made 
 * available under the terms of the Eclipse Public License 2.0 
 * (http://www.eclipse.org/legal/epl-v10.html), and the Eclipse Distribution 
 * License v1.0 (http://www.eclipse.org/org/documents/edl-v10.html). 
 *
 * Contributors:
 *     IBM Corporation - initial API and implementation
 *******************************************************************************/
/*eslint-env mocha */
const assert = require('assert'),
	nodeUtil = require('util'),
	path = require('path'),
	stream = require('stream'),
	fs = require('fs'),
	testData = require('../support/test_data'),
	testHelper = require('../support/testHelper'),
	file = require('../../lib/file'),
	fileUtil = require('../../lib/fileUtil');
	
var CONTEXT_PATH = testHelper.CONTEXT_PATH,
	WORKSPACE = testHelper.WORKSPACE,
	METADATA =  testHelper.METADATA,
	WORKSPACE_ID = testHelper.WORKSPACE_ID,
	PREFIX = CONTEXT_PATH + '/file/' + WORKSPACE_ID;

var request = testData.setupOrionServer();

function byName(a, b) {
	return String.prototype.localeCompare.call(a.Name, b.Name);
}

// Writeable stream that buffers everything sent to it
function BufStream() {
	this.bufs = [];
	stream.Writable.apply(this, arguments);
}
nodeUtil.inherits(BufStream, stream.Writable);
BufStream.prototype._write = function(chunk, enc, cb) {
	this.bufs.push(Buffer.isBuffer(chunk) ? chunk : new Buffer(chunk, enc));
	cb();
};
BufStream.prototype.data = function() {
	return Buffer.concat(this.bufs);
};

/**
 * Unit test for the file REST API.
 * see http://wiki.eclipse.org/Orion/Server_API/File_API
 */
describe('File endpoint', function() {
	beforeEach(function(done) { // testData.setUp.bind(null, parentDir)
		testData.setUp(WORKSPACE, function(){
			testData.setUpWorkspace(request, done);
		});
	});
	afterEach("Remove .test_workspace", function(done) {
		testData.tearDown(testHelper.WORKSPACE, function(){
			testData.tearDown(path.join(METADATA, '.orion'), function(){
				testData.tearDown(METADATA, done);
			});
		});
	});
	/**
	 * This group of tests simply try to pass all kinds of bad data and intentionally mis-use
	 * the endpoint
	 * @since 17.0
	 */
	describe('Bad usage', function() {
		it("instantiate without fileRoot", function() {
			try {
				file({})
			} catch(err) {
				assert('options.fileRoot is required', err.message, 'The error message for leaving out fileRoot is wrong');
			}
		});
		it("instantiate without workspaceRoot", function() {
			try {
				file({fileRoot: 'myroot'});
			} catch(err) {
				assert('options.workspaceRoot is required', err.message, 'The error message for leaving out workspaceRoot is wrong');
			}
		});
		it('write file contents to directory', function(done) {
			request()
        .post(PREFIX + '/project')
        .proxy(testHelper.TEST_PROXY)
				.type('json')
				.send({Name: 'testDir', Directory: true})
				.expect(201)
				.end(function(err, res) {
					testHelper.throwIfError(err);
					request()
            .put(res.body.Location)
            .proxy(testHelper.TEST_PROXY)
						.send('directory contents')
						.expect(400, done);
				})
		});
		it("testPostFileNoName", function(done) {
			request()
        .post(path.join(PREFIX, '/project'))
        .proxy(testHelper.TEST_PROXY)
				.type('json')
				.send({})
				.expect(400, done);
		});
		/**
		 * @see https://bugs.eclipse.org/bugs/show_bug.cgi?id=528269
		 */
		it('GET file contents path too long', function(done) {
			request()
      .get(PREFIX + '/path_name_exceeds_4096_characters/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/fizz.txt')
      .proxy(testHelper.TEST_PROXY)
			.expect(400, done);
		});
		/**
		 * @see https://bugs.eclipse.org/bugs/show_bug.cgi?id=528269
		 */
		it('GET metadata file contents path too long', function(done) {
			request()
			.get(PREFIX + '/path_name_exceeds_4096_characters/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/fizz.txt')
      .proxy(testHelper.TEST_PROXY)
      .query({parts: 'meta'})
			.expect(400, done);
		});
		/**
		 * @see https://bugs.eclipse.org/bugs/show_bug.cgi?id=528269
		 */
		it('PUT file contents path too long', function(done) {
			request()
			.put(PREFIX + '/path_name_exceeds_4096_characters/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/fizz.txt')
      .proxy(testHelper.TEST_PROXY)
      .send("some fun text")
			.expect(400, done);
		});
		/**
		 * @see https://bugs.eclipse.org/bugs/show_bug.cgi?id=528269
		 */
		it('DEL file contents path too long', function(done) {
			request()
			.del(PREFIX + '/path_name_exceeds_4096_characters/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/fizz.txt')
      .proxy(testHelper.TEST_PROXY)
      .expect(400, done);
		});
		/**
		 * @see https://bugs.eclipse.org/bugs/show_bug.cgi?id=528269
		 */
		it('GET folder path too long', function(done) {
			request()
			.get(PREFIX + '/path_name_exceeds_4096_characters/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/')
      .proxy(testHelper.TEST_PROXY)
      .expect(400, done);
		});
		/**
		 * @see https://bugs.eclipse.org/bugs/show_bug.cgi?id=528269
		 */
		it('GET folder metadata path too long', function(done) {
			request()
			.get(PREFIX + '/path_name_exceeds_4096_characters/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/')
      .proxy(testHelper.TEST_PROXY)
      .query({parts: 'meta'})
			.expect(400, done);
		});
		/**
		 * @see https://bugs.eclipse.org/bugs/show_bug.cgi?id=528269
		 */
		it('PUT folder path too long', function(done) {
			request()
			.put(PREFIX + '/path_name_exceeds_4096_characters/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/')
      .proxy(testHelper.TEST_PROXY)
      .expect(400, done);
		});
		/**
		 * @see https://bugs.eclipse.org/bugs/show_bug.cgi?id=528269
		 */
		it('DEL folder path too long', function(done) {
			request()
			.del(PREFIX + '/path_name_exceeds_4096_characters/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/subdirectory/')
      .proxy(testHelper.TEST_PROXY)
      .expect(400, done);
		});
		/**
		 * @see https://bugs.eclipse.org/bugs/show_bug.cgi?id=528420
		 */
		it('GET file - bad single quoted file after file', function(done) {
			testHelper.createFile(request, '/project', '/fooFile.txt')
			.then(function(res) {
				request()
          .get(PREFIX + '/project/fooFile.txt/\'bad00001')
          .proxy(testHelper.TEST_PROXY)
					.expect(400, done);
			});
		});
		/**
		 * @see https://bugs.eclipse.org/bugs/show_bug.cgi?id=528420
		 */
		it('GET file - bad file after file', function(done) {
			testHelper.createFile(request, '/project', '/fooFile.txt')
			.then(function(res) {
				request()
          .get(PREFIX + '/project/fooFile.txt/bad00002')
          .proxy(testHelper.TEST_PROXY)
					.expect(400, done);
			});
		});
		/**
		 * @see https://bugs.eclipse.org/bugs/show_bug.cgi?id=528420
		 */
		it('GET file - bad double quoted file after file', function(done) {
			testHelper.createFile(request, '/project', '/fooFile.txt')
			.then(function(res) {
				request()
          .get(PREFIX + '/project/fooFile.txt/"bad00003')
          .proxy(testHelper.TEST_PROXY)
					.expect(400, done);
			});
		});
		/**
		 * @see https://bugs.eclipse.org/bugs/show_bug.cgi?id=528420
		 */
		it('POST file - bad double quoted folder after file', function(done) {
			request()
        .post(PREFIX + '/project/fooFiletxt/"bad00003')
        .proxy(testHelper.TEST_PROXY)
				.type('json')
				.send({Location: '"bad00003', Directory: true})
				.expect(400, done);
		});
		/**
		 * @see https://bugs.eclipse.org/bugs/show_bug.cgi?id=528420
		 */
		it('PUT file - bad double quoted folder after file', function(done) {
			testHelper.createFile(request, '/project', '/fooFile.txt')
			.then(function(res) {
				request()
          .put(PREFIX + '/project/fooFile.txt/"bad00003')
          .proxy(testHelper.TEST_PROXY)
					.send("Hello!")
					.expect(400, done);
			});
		});
		/**
		 * @see https://bugs.eclipse.org/bugs/show_bug.cgi?id=528420
		 */
		it('DEL file - bad double quoted folder after file', function(done) {
			testHelper.createFile(request, '/project', '/fooFile.txt')
			.then(function(res) {
				request()
          .del(PREFIX + '/project/fooFile.txt/"bad00003')
          .proxy(testHelper.TEST_PROXY)
					.expect(400, done);
			});
		});
	})
	/**
	 * http://wiki.eclipse.org/Orion/Server_API/File_API#Actions_on_files
	 */
	describe('Actions on files', function() {
		describe('contents', function() {
			it("testGetProject - no file context", function(done) {
				testHelper.createFile(request, '/project', '/fooFile.txt')
				.then(function(res) {
					request()
            .get(PREFIX + '/project/fooFile.txt')
            .proxy(testHelper.TEST_PROXY)
						.expect(200)
						.end(function(err, res) {
							testHelper.throwIfError(err);
							request()
                .get(PREFIX) //no file context - expect null returned
                .proxy(testHelper.TEST_PROXY)
								.query({project: true, names: 'package.json,.tern-project'})
								.expect(204)
								.end(function(err, res) {
									testHelper.throwIfError(err);
									assert(!res.body.Project, "The project context should be null");
									done();
								});	
						});	
				});
			});
			it("testGetProject - file context, no 'project-like'", function(done) {
				testHelper.createFile(request, '/project', '/foo2File.txt')
				.then(function(res) {
					var f = path.join(PREFIX, '/project', 'foo2File.txt');
					request()
            .get(f)
            .proxy(testHelper.TEST_PROXY)
						.expect(200)
						.end(function(err, res) {
							testHelper.throwIfError(err);
							request()
                .get(f) //file context with no matching "project-like" names - expect null returned
                .proxy(testHelper.TEST_PROXY)
								.query({project: true, names: 'package.json,.tern-project'})
								.expect(204)
								.end(function(err, res) {
									testHelper.throwIfError(err);
									assert(!res.body.Project, "The project context should be null");
									done();
								});	
						});	
				});
			});
			it("testGetProject - file context / pass project folder name", function(done) {
				testHelper.createFile(request, '/project', '/foo3File.txt')
				.then(function(res) {
					var f = path.join(PREFIX, '/project', 'foo3File.txt');
					request()
            .get(f)
            .proxy(testHelper.TEST_PROXY)
						.expect(200)
						.end(function(err, res) {
							testHelper.throwIfError(err);
							request()
                .get(f) //file context with no matching "project-like" names - expect null returned
                .proxy(testHelper.TEST_PROXY)
								.query({project: true, names: 'project'}) // still null, only file names can be passed in
								.expect(204)
								.end(function(err, res) {
									testHelper.throwIfError(err);
									assert(!res.body.Project, "The project context should be null");
									done();
								});	
						});	
				});
			});
			it("testGetProject - file context / pass .tern-project name", function(done) {
				testHelper.createDir(request, '/project', 'subDir')
				.then(function(res) {
					testHelper.createFile(request, '/project', '.tern-project')
					.then(function(res) {
						testHelper.createFile(request, '/project', '/subDir/foo4File.txt')
						.then(function(res) {
							var f = path.join(PREFIX, '/project', '/subDir', 'foo4File.txt');
							request()
                .get(f)
                .proxy(testHelper.TEST_PROXY)
								.expect(200)
								.end(function(err, res) {
									testHelper.throwIfError(err);
									request()
                    .get(f)
                    .proxy(testHelper.TEST_PROXY)
										.query({project: true, names: '.tern-project'})
										.expect(200)
										.end(function(err, res) {
											testHelper.throwIfError(err);
											assert(res.body, "The project context should not be null");
											assert.equal(res.body.Name, "project", "The found project should have the name 'project'");
											done();
										});	
								});	
							});
						});
				});
			});
			it("testGetProject - file context / pass no name, has .git folder", function(done) {
				testHelper.createDir(request, '/project', '.git')
				.then(function(res) {
						testHelper.createFile(request, '/project', 'foo5File.txt')
						.then(function(res) {
							var f = path.join(PREFIX, '/project', 'foo5File.txt');
							request()
                .get(f)
                .proxy(testHelper.TEST_PROXY)
								.expect(200)
								.end(function(err, res) {
									testHelper.throwIfError(err);
									request()
                    .get(f)
                    .proxy(testHelper.TEST_PROXY)
										.query({project: true})
										.expect(200)
										.end(function(err, res) {
											testHelper.throwIfError(err);
											assert(res.body, "The project context should not be null");
											assert.equal(res.body.Name, "project", "The found project should have the name 'project'");
											done();
										});	
								});	
						});
				});
			});
			it("testGetProject - file context / pass no name, has project.json file folder", function(done) {
				testHelper.createFile(request, '/project', 'project.json')
				.then(function(res) {
						testHelper.createFile(request, '/project', 'foo5File.txt')
						.then(function(res) {
							var f = path.join(PREFIX, '/project', 'foo5File.txt');
							request()
                .get(f)
                .proxy(testHelper.TEST_PROXY)
								.expect(200)
								.end(function(err, res) {
									testHelper.throwIfError(err);
									request()
                    .get(f)
                    .proxy(testHelper.TEST_PROXY)
										.query({project: true})
										.expect(200)
										.end(function(err, res) {
											testHelper.throwIfError(err);
											assert(res.body, "The project context should not be null");
											assert.equal(res.body.Name, "project", "The found project should have the name 'project'");
											done();
										});	
								});
						});
				});
			});
			it("testGenericFileHandler", function(done) {
				testHelper.createFile(request, '/project', '/genericFileHandler.txt', 'Tests the generic file handler')
					.then(function(res) {
						request()
              .get(PREFIX + '/project/genericFileHandler.txt')
              .proxy(testHelper.TEST_PROXY)
							.expect(200, '', done); // Creating a file and providing contents is not currently supported in a single request. The client must first create a file with a POST as in the previous section, and then perform a PUT on the location specified in the POST response to provide file contents.
					});
			});
			/**
			 * @see https://bugs.eclipse.org/bugs/show_bug.cgi?id=521132
			 */
			it("get file/ root", function(done) {
				request()
          .get(CONTEXT_PATH + '/file/')
          .proxy(testHelper.TEST_PROXY)
					.expect(403, done);
			});
			it("read workspace.json", function(done) { 
				request()
          .get(PREFIX + '/workspace.json')
          .proxy(testHelper.TEST_PROXY)
					.expect(200, done);
			});
			it("testGetFile - readIfExists header", function(done) {
				request()
          .get(path.join(PREFIX, '/project', 'doesNotExist.txt'))
          .proxy(testHelper.TEST_PROXY)
					.set('read-if-exists', true)
					.expect(204, done);
			});
			it("testGetFile - readIfExists query param", function(done) {
				request()
          .get(path.join(PREFIX, '/project', 'doesNotExist.txt'))
          .proxy(testHelper.TEST_PROXY)
					.query({readIfExists: true})
					.expect(404, done);
			});
			it("testGzippedResponseCharset", function(done) {
				var fileName = '\u4f60\u597d\u4e16\u754c.txt';
				testHelper.createFile(request, '/project', fileName, 'Odd contents')
					.then(function(res) {
						request()
              .get(PREFIX + '/project/'+encodeURIComponent(fileName)+'?parts=meta')
              .proxy(testHelper.TEST_PROXY)
							.set('Charset', 'UTF-8')
							.set('Content-Type', 'text/plain')
							.end(function(err, res) {
								testHelper.throwIfError(err);
								assert(res.headers, "There are no headers in the response");
								//assert(res.headers['content-encoding'], "Encoding header not set");
								//assert.equal(res.headers['content-encoding'], 'UTF-8', 'The header content encoding does not match the expected encoding of UTF-8');
								//TODO The Java server checked for encoding of gzip
								done();
							})
					});
			});
			it("get file that does not exist", function(done) {
				request()
          .get(PREFIX + '/project/i-dont-exist.jpg')
          .proxy(testHelper.TEST_PROXY)
					.expect(404, done);
			});
			it('get file contents', function(done) {
				request()
        .get(PREFIX + '/project/fizz.txt')
        .proxy(testHelper.TEST_PROXY)
				.expect(200, 'hello world', done);
			});
			it('file contents has ETag header', function(done) {
				request()
        .get(PREFIX + '/project/fizz.txt')
        .proxy(testHelper.TEST_PROXY)
				.end(function(err, res) {
					testHelper.throwIfError(err);
					assert.notEqual(res.headers.etag, null);
					done();
				});
			});
			it("testListenerWriteFile", function(done) {
				testHelper.createFile(request, '/project', '/fileWriteListener.txt')
					.then(function(res) {
						assert(res.statusCode === 201);
						fileUtil.addFileModificationListener("testListenerWriteFile", {
							handleFileModficationEvent: function handleFileModficationEvent(eventData) {
								assert(eventData, "No event data was fired");
								assert.equal(eventData.type, "write", "Event type is wrong");
								assert(eventData.file.path.indexOf(PREFIX + '/project/fileWriteListener.txt'));
								done();
							}
						});
						request()
              .put(PREFIX + '/project/fileWriteListener.txt')
              .proxy(testHelper.TEST_PROXY)
							.send('Listen for me listener!')
							.end(function(err, res) {
								fileUtil.removeFileModificationListener("testListenerWriteFile");
								testHelper.throwIfError(err);
							});
					})
			});
			it("testListenerWriteFile - unnamed listener", function(done) {
				testHelper.createFile(request, '/project', '/fileWriteListener.txt')
					.then(function(res) {
						assert(res.statusCode === 201);
						fileUtil.addFileModificationListener({
							handleFileModficationEvent: function handleFileModficationEvent(eventData) {
								assert(eventData, "No event data was fired");
								assert.equal(eventData.type, "write", "Event type is wrong");
								assert(eventData.file.path.indexOf(PREFIX + '/project/fileWriteListener.txt'));
								done();
							}
						});
						request()
              .put(PREFIX + '/project/fileWriteListener.txt')
              .proxy(testHelper.TEST_PROXY)
							.send('Listen for me listener!')
							.end(function(err, res) {
								fileUtil.removeFileModificationListener();
								testHelper.throwIfError(err);
							});
					})
			});
			it("testWriteFileInvalidUTF8", function(done) {
				testHelper.createFile(request, '/project', 'badutf8.binary')
					.then(function(res) {
						assert(res.statusCode === 201);
						var bytes = new Buffer([0, 0xC0, 0xC1, 0xF5, 0xF6, 0xF7, 0xF8, 0xF9, 0xFA, 0xFB, 0xFC, 0xFD, 0xFE, 0xFF]);
						request()
              .put(PREFIX + '/project/badutf8.binary')
              .proxy(testHelper.TEST_PROXY)
							.send(bytes)
							.expect(200)
							.end(function(err, res) {
								testHelper.throwIfError(err)
								var bs = new BufStream();
								var r = request()
                  .get(PREFIX + '/project/badutf8.binary')
                  .proxy(testHelper.TEST_PROXY)
									.pipe(bs);
								r.on('finish', function() {
									var data = bs.data();
									assert.equal(data.length, bytes.length);
									assert.ok(data.equals(bytes), "Buffers are identical");
									done();
								});
							});
					})
			});
			it("testFileWriteBOM", function(done) {
				request()
          .post(PREFIX + '/project')
          .proxy(testHelper.TEST_PROXY)
					.type('json')
					.send({"Name": "testBomFEFF.txt"})
					.expect(201)
					.end(function(err, res) {
						testHelper.throwIfError(err);
						request()
              .put(res.body.Location)
              .proxy(testHelper.TEST_PROXY)
							.send(String.fromCharCode(0xFEFF) + 'content with BOM of 0xFEFF')
							.expect(200, done);
					});
			});
			it("testWriteFileFromURL", function(done) {
				request()
          .post(PREFIX + '/project')
          .proxy(testHelper.TEST_PROXY)
					.type('json')
					.send({"Name": "testWriteFileFromURL.txt"})
					.expect(201)
					.end(function(err, res) {
						testHelper.throwIfError(err);
						request()
							.put(PREFIX + '/project/testWriteFileFromURL.txt?source=http://eclipse.org/eclipse/project-info/home-page-one-liner.html')
              .proxy(testHelper.TEST_PROXY)
              .type('text')
							.expect(200)
							.end(function(err, res) {
								testHelper.throwIfError(err);
								request()
                  .get(PREFIX + '/project/testWriteFileFromURL.txt')
                  .proxy(testHelper.TEST_PROXY)
									.type('text')
									.expect(200)
									.end(function(err, res) {
										testHelper.throwIfError(err);
										assert.equal(res.text, '<a href=\"/eclipse/\">Eclipse Project</a>', "The content of the created file does not match");
										done();
									});
							});
					});
			});
			it("testWriteImageFromURL", function(done) {
				request()
          .post(PREFIX + '/project')
          .proxy(testHelper.TEST_PROXY)
					.type('json')
					.send({"Name": "testWriteGif.gif"})
					.expect(201)
					.end(function(err, res) {
						testHelper.throwIfError(err);
						request()
							.put(PREFIX + '/project/testWriteGif.gif?source=http://eclipse.org/eclipse/development/images/Adarrow.gif')
              .proxy(testHelper.TEST_PROXY)
              .set("content-type", 'image/gif')
							.expect(200)
							.end(function(err, res) {
								testHelper.throwIfError(err);
								request()
                  .get(PREFIX + '/project/testWriteGif.gif')
                  .proxy(testHelper.TEST_PROXY)
									.set("content-type", 'image/gif')
									.expect(200)
									.end(function(err, res) {
										testHelper.throwIfError(err);
										assert.equal(res.headers['content-length'], 857, "The content length is not the same");
										done();
									});
							});
					});
			});
			it('put file contents', function(done) {
				var newContents = 'The time is now ' + Date.now();
				request()
          .put(PREFIX + '/project/fizz.txt')
          .proxy(testHelper.TEST_PROXY)
					.send(newContents)
					.expect(200)
					.end(function(err, res) {
						testHelper.throwIfError(err);
						var body = res.body;
						assert.equal(body.Directory, false);
						assert.ok(body.ETag, 'has an ETag');
						assert.equal(body.Location, PREFIX + '/project/fizz.txt');
						assert.equal(body.Name, 'fizz.txt');
						done();
					});
			});
			it('put binary file', function(done) {
				var newContents = new Buffer([0x42, 0xff]); // this is an invalid UTF-8 sequence
				request()
          .put(PREFIX + '/project/fizz.raw')
          .proxy(testHelper.TEST_PROXY)
					.type('application/octet-stream')
					.send(newContents)
					.expect(200)
					.end(function(err, res) {
						testHelper.throwIfError(err, "Failed to PUT");
						var body = res.body;
						assert.ok(body.ETag, 'has an ETag');
						assert.equal(body.Location, PREFIX + '/project/fizz.raw');
						assert.equal(body.Name, 'fizz.raw');

						// GET the file and ensure its contents are what was sent
						var bufStream = new BufStream();
						var req = request()
            .get(body.Location)
            .proxy(testHelper.TEST_PROXY)
						.pipe(bufStream);
						req.on("finish", function() {
							var data = bufStream.data();
							assert.equal(data.length, newContents.length);
							assert.ok(data.equals(newContents), "Buffers are identical");
							done();
						});
						req.on("error", done);
					});
			});
			it('conditionally overwrite contents using If-Match', function(done) {
				var url = PREFIX + '/project/fizz.txt';
				request()
          .get(url)
          .proxy(testHelper.TEST_PROXY)
					.query({ parts: 'meta' })
					.end(function(err, res) {
						testHelper.throwIfError(err);
						var etag = res.body.ETag;
						assert.notEqual(res.body.ETag, null);
						request()
            .put(url)
            .proxy(testHelper.TEST_PROXY)
						.set('If-Match', etag + '_blort')
						.expect(412)
						.end(/* @callback */ function(err, res) {
							testHelper.throwIfError(err, "Failed to PUT " + url);
							request(url)
              .put(url)
              .proxy(testHelper.TEST_PROXY)
							.set('If-Match', etag)
							.expect(200)
							.end(done);
						});
					});
			});
		});
		describe('diff', function() {
			it("testPatchEmptyFile", function(done) {
				testHelper.createFile(request, '/project', 'testPatchEmptyFile.txt')
					.then(function(res) {
						var url = PREFIX + '/project/testPatchEmptyFile.txt';
						request()
              .post(url)
              .proxy(testHelper.TEST_PROXY)
							.set('X-HTTP-Method-Override', 'PATCH')
							.type('json')
							.send({ diff: [{ start: 0, end: 0, text: "Hi!" }] })
							.expect(200)
							.end(/* @callback */ function(err, res) {
								testHelper.throwIfError(err);
								request()
                  .get(url)
                  .proxy(testHelper.TEST_PROXY)
									.expect(200, 'Hi!', done);
							});
					});
			});
			it("testPatchEmptyFileBadEndRange", function(done) {
				testHelper.createFile(request, '/project', 'testPatchEmptyFileBadEndRange.txt')
					.then(function(res) {
						var url = PREFIX + '/project/testPatchEmptyFileBadEndRange.txt';
						request()
              .post(url)
              .proxy(testHelper.TEST_PROXY)
							.set('X-HTTP-Method-Override', 'PATCH')
							.type('json')
							.send({ diff: [{ start: 0, end: 11, text: "Hi!" }] })
							.expect(500)
							.end(done);
					});
			});
			it('applies a patch with JSON Content-Type', function(done) {
				var url = PREFIX + '/project/fizz.txt';
				request()
          .post(url)
          .proxy(testHelper.TEST_PROXY)
					.set('X-HTTP-Method-Override', 'PATCH')
					.type('json')
					.send({ diff: [{ start: 0, end: 1, text: "j" }] })
					.expect(200)
					.end(/* @callback */ function(err, res) {
						testHelper.throwIfError(err);
						request().get(url).expect(200, 'jello world', done);
					});
			});
			it('applies a patch with JSON + charset Content-Type', function(done) {
				var url = PREFIX + '/project/fizz.txt';
				request()
        .post(url)
        .proxy(testHelper.TEST_PROXY)
				.set('X-HTTP-Method-Override', 'PATCH')
				.type('application/json;charset=UTF-8')
				.send({ diff: [{ start: 0, end: 1, text: "j" }] })
				.expect(200)
				.end(/* @callback */ function(err, res) {
					testHelper.throwIfError(err);
					request().get(url).expect(200, 'jello world', done);
				});
			});
			it('tolerates an empty patch', function(done) {
				var url = PREFIX + '/project/fizz.txt';
				request()
        .post(url)
        .proxy(testHelper.TEST_PROXY)
				.set('X-HTTP-Method-Override', 'PATCH')
				.type('text')
				.send(JSON.stringify({}))
				.expect(200)
				.end(/* @callback */ function(err, res) {
					testHelper.throwIfError(err);
					done();
				});
			});
			it('gives consistent ETag between POST and GET', function(done) {
				var url = PREFIX + '/project/fizz.txt';
				request()
        .post(url)
        .proxy(testHelper.TEST_PROXY)
				.set('X-HTTP-Method-Override', 'PATCH')
				.type('text')
				.send(JSON.stringify({
					// Change "hello world" to "hello worf"
					diff: [{
						start: 9,
						end: 11,
						text: "f"
					}]
				}))
				.expect(200)
				.end(function(err, res) {
					testHelper.throwIfError(err);
					var etag = res.headers.etag;
					request()
          .get(url)
          .proxy(testHelper.TEST_PROXY)
					.query({ parts: 'meta' })
					.expect(200)
					.end(function(err, res) {
						testHelper.throwIfError(err);
						assert.equal(etag, res.headers.etag, "Expect same ETag we got from the POST");
						done();
					});
				});
			});
		});
		describe('metadata', function() {
			it('testGetMetadata', function(done) {
				testHelper.createFile(request, '/project', 'someMetaFile.txt')
				.then(function(res) {
					request()
            .put(res.body.Location)
            .proxy(testHelper.TEST_PROXY)
						.query({parts: 'meta'})
						.expect(501, done);
				});
			});
			it("testETagPutNotMatch", function(done) {
				testHelper.createFile(request, '/project', 'testETagPutNotMatch.txt')
					.then(function(res) {
						var url = PREFIX + '/project/testETagPutNotMatch.txt';
						request()
              .get(url)
              .proxy(testHelper.TEST_PROXY)
							.query({parts: 'meta'})
							.expect(200)
							.end(function(err, res) {
								testHelper.throwIfError(err);
								var etag = res.headers.etag;
								assert(etag, "There should be an etag");
								//change the file on disk
								fs.writeFileSync(path.join(WORKSPACE, 'project/testETagPutNotMatch.txt'), "changed");
								//now a put should fail since the etags don't match
								request()
                  .put(url)
                  .proxy(testHelper.TEST_PROXY)
									.set("If-Match", etag)
									.send("new contents")
									.expect(412)
									.end(done)
							})
					});
			});
			/**
			 * @see https://bugs.eclipse.org/bugs/show_bug.cgi?id=521201
			 */
			it.skip("testMetadataHandling", function(done) {
				testHelper.createFile(request, '/project', 'testMetadataHandling.txt')
					.then(function(res) {
						var url = PREFIX + '/project/testMetadataHandling.txt';
						request()
              .get(url)
              .proxy(testHelper.TEST_PROXY)
							.query({parts: 'meta'})
							.expect(200)
							.end(function(err, res) {
								testHelper.throwIfError(err);
								request()
                  .put(url)
                  .proxy(testHelper.TEST_PROXY)
									.query({parts: 'meta'})
									.type('json')
									.send({Attributes: {ReadOnly: true, Executable: true}})
									.expect(204)
									.end(function(err, res) {
										testHelper.throwIfError(err);
										request()
                      .get(url)
                      .proxy(testHelper.TEST_PROXY)
											.query({parts: 'meta'})
											.expect(200)
											.end(function(err, res) {
												testHelper.throwIfError(err)
												assert(res.text, "There should be text returned");
												try {
													var v = JSON.parse(res.text);
													assert(v.Attributes, "There sbhould be an Attributes entry");
													assert.equal(v.Attributes.ReadOnly, true, "The file meta should be readonly");
													assert.equal(v.Attributes.Executable, true, "The file meta should be executable");
													done();
												} catch(e) {
													done(e);
												}
											});
									});
							})
					})
			});
			it("testETagDeletedFile", function(done) {
				testHelper.createFile(request, '/project', 'testETagDeletedFile.txt')
				.then(function(res) {
					var url = PREFIX + '/project/testETagDeletedFile.txt';
					request()
            .get(url)
            .proxy(testHelper.TEST_PROXY)
						.query({parts: 'meta'})
						.expect(200)
						.end(function(err, res) {
							testHelper.throwIfError(err);
							var etag = res.headers.etag;
							assert(etag, "There should be an etag");
							//delete the file
							request()
                .del(url)
                .proxy(testHelper.TEST_PROXY)
								.expect(200)
								.end(function(err, res) {
									//now a put should fail since the etags don't match
									request()
                    .put(url)
                    .proxy(testHelper.TEST_PROXY)
										.set("If-Match", etag)
										.send("new contents")
										.expect(412)
										.end(done);
								});
						})
				});
			});
			it("testETagHandling", function(done) {
				testHelper.createFile(request, '/project', 'testETagHandling.txt')
					.then(function(res) {
						var url = PREFIX + '/project/testETagHandling.txt';
						request()
              .get(url)
              .proxy(testHelper.TEST_PROXY)
							.query({parts: 'meta'})
							.expect(200)
							.end(function(err, res) {
								testHelper.throwIfError(err);
								var etag1 = res.headers.etag;
								assert(etag1, "There should have been an etag header entry");
								assert.equal(etag1, res.body.ETag, "The body and header etags do not match");
								//modify and re-check
								request()
                  .put(url)
                  .proxy(testHelper.TEST_PROXY)
									.set("If-Match", etag1)
									.type("text/plain;charset=UTF-8")
									.send("new contents for you")
									.expect(200)
									.end(function(err, res) {
										testHelper.throwIfError(err);
										var etag2 = res.headers.etag;
										assert(etag2, "There should have been an etag header entry");
										assert.equal(etag2, res.body.ETag, "The body and header etags do not match");
										assert.notEqual(etag1, etag2, "The etag should have changed after a put");
										done();
									});
							});
					});
			});
			/**
			 * @see https://bugs.eclipse.org/bugs/show_bug.cgi?id=521201
			 */
			it.skip("testListenerMetadataHandling", function(done) {
				testHelper.createFile(request, '/project', 'testListenerMetadataHandling.txt')
					.then(function(done) {
						fileUtil.addFileModificationListener("testListenerMetadataHandling", {
							handleFileModficationEvent: function handleFileModficationEvent(eventData) {
								assert(eventData, "No event data was fired");
								assert.equal(eventData.type, "put_info", "Event type is not put_info");
								done();
							}
						});
						var url = PREFIX + '/project/testListenerMetadataHandling.txt';
						request()
              .put(url)
              .proxy(testHelper.TEST_PROXY)
							.query({parts: 'meta'})
							.expect(204)
							.end(function(err, res) {
								fileUtil.removeFileModificationListener("testListenerMetadataHandling");
								testHelper.throwIfError(err);
							})
					})
			});
			it('get file metadata', function(done) {
				request()
        .get(PREFIX + '/project/fizz.txt')
        .proxy(testHelper.TEST_PROXY)
				.query({ parts: 'meta' })
				.expect(200)
				.end(function(err, res) {
					testHelper.throwIfError(err);
					var body = res.body;
					assert.deepEqual(body.Attributes, {ReadOnly: false, Executable: false});
					assert.equal(body.Directory, false);
					assert.notEqual(body.ETag, null);
					assert.equal(typeof body.LocalTimeStamp, 'number');
					assert.equal(body.Location, PREFIX + '/project/fizz.txt');
					assert.equal(body.Name, 'fizz.txt');
					assert.equal(body.Parents.length, 1);
					assert.deepEqual(body.Parents[0], {
						ChildrenLocation: PREFIX + '/project/?depth=1',
						Location: PREFIX + '/project/',
						Name: 'project'
					});
					done();
				});
			});
			it('file metadata has ETag header', function(done) {
				request()
        .get(PREFIX + '/project/fizz.txt')
        .proxy(testHelper.TEST_PROXY)
				.query({ parts: 'meta' })
				.end(function(err, res) {
					testHelper.throwIfError(err);
					assert.notEqual(res.headers.etag, null);
					done();
				});
			});
			it('has a correct "Parents" field', function(done) {
				request()
        .get(PREFIX + '/project/my%20folder/my%20subfolder/quux.txt')
        .proxy(testHelper.TEST_PROXY)
				.query({ parts: 'meta' })
				.expect(200)
				.end(function(err, res) {
					testHelper.throwIfError(err);
					assert.ok(res.body.Parents);
					assert.equal(res.body.Parents.length, 3);
					assert.equal(res.body.Parents[0].ChildrenLocation, PREFIX + '/project/my folder/my subfolder/?depth=1');
					assert.equal(res.body.Parents[0].Location, PREFIX + '/project/my folder/my subfolder/');
					assert.equal(res.body.Parents[0].Name, 'my subfolder');
					assert.equal(res.body.Parents[1].Name, 'my folder');
					assert.equal(res.body.Parents[2].Name, 'project');
					done();
				});
			});
		});
		/**
		 * http://wiki.eclipse.org/Orion/Server_API/File_API#Creating_files_and_directories
		 */
		describe('creating', function() {
			it("testCreateEmptyFile", function(done) {
				request()
          .post(PREFIX + '/project')
          .proxy(testHelper.TEST_PROXY)
					.type('json')
					.send({Name: 'newEmptyFile.txt'})
					.expect(201)
					.end(done)
			});
			it("testCreateFileEncodedName", function(done) {
				var fileName = "http%2525253A%2525252F%2525252Fwww.example.org%2525252Fwinery%2525252FTEST%2525252Fjclouds1";
				request()
          .post(PREFIX + '/project')
          .proxy(testHelper.TEST_PROXY)
					.type('json')
					.send({Name: encodeURIComponent(fileName)})
					.expect(201)
					.end(done)
			});
			it("testCreateFileEncodedNameSlug", function(done) {
				var fileName = "http%2525253A%2525252F%2525252Fwww.example.org%2525252Fwinery%2525252FTEST%2525252Fjclouds1";
				request()
          .post(PREFIX + '/project')
          .proxy(testHelper.TEST_PROXY)
					.set('Slug', encodeURIComponent(fileName))
					.expect(201)
					.end(done)
			});
			it("testCreateFileDBCSName", function(done) {
				var fileName = "\u4f60\u597d\u4e16\u754c";
				request()
          .post(PREFIX + '/project')
          .proxy(testHelper.TEST_PROXY)
					.type('json')
					.send({Name: encodeURIComponent(fileName)})
					.expect(201)
					.end(done)
			});
			it("testCreateFileDBCSSlugName", function(done) {
				var fileName = "\u4f60\u597d\u4e16\u754c";
				request()
          .post(PREFIX + '/project')
          .proxy(testHelper.TEST_PROXY)
					.set('Slug', encodeURIComponent(fileName))
					.expect(201)
					.end(done)
			});
			it("testCreateFileOverwrite", function(done) {
				testHelper.createFile(request, '/project', 'testCreateFileOverwrite.txt')
					.then(function(res) {
						request()
              .post(PREFIX + '/project')
              .proxy(testHelper.TEST_PROXY)
							.set('Slug', 'testCreateFileOverwrite.txt')
							.expect(200)
							.end(function(err, res) {
								testHelper.throwIfError(err);
								request()
                  .post(PREFIX + '/project')
                  .proxy(testHelper.TEST_PROXY)
									.set('X-Create-Options', 'no-overwrite')
									.set('Slug', 'testCreateFileOverwrite.txt')
									.expect(412)
									.end(done);
							});
					});
			});
			it("testCreateTopLevelFile", function(done) {
				request()
        .post(PREFIX)
        .proxy(testHelper.TEST_PROXY)
				.type('json')
				.set('Slug', 'topLevelFile.txt')
				.send({Name: 'topLevelFile.txt', Directory: false})
				.expect(201)
				.end(function(err, res) {
					testHelper.throwIfError(err);
					assert.equal(res.body.Name, 'topLevelFile.txt');
					assert.equal(res.body.Directory, false);
					done();
				});
			});
			it('works with Slug header', function(done) {
				request()
        .post(PREFIX + '/project')
        .proxy(testHelper.TEST_PROXY)
				.set('Slug', 'newfile.txt')
				.expect(201)
				.end(function(err, res) {
					testHelper.throwIfError(err);
					assert.equal(res.body.Name, 'newfile.txt');
					assert.equal(res.body.Directory, false);
					done();
				});
			});
			it('works with "Name" field', function(done) {
				request()
        .post(PREFIX + '/project')
        .proxy(testHelper.TEST_PROXY)
				.send({ Name: 'newfile.txt' })
				.expect(201)
				.end(function(err, res) {
					testHelper.throwIfError(err);
					assert.equal(res.body.Name, 'newfile.txt');
					assert.equal(res.body.Directory, false);
					done();
				});
			});
		});
		// Unimplemented features:
		// 'should implement GET file metadata and contents'
		// 'should implement PUT file contents with different HTTP input'
		// 'should implement PUT file metadata'
		// 'should implement PUT metadata and contents'
	});
	/**
	 * http://wiki.eclipse.org/Orion/Server_API/File_API#Actions_on_directories
	 */
	describe('Actions on directories', function() {
		describe('metadata', function() {
			it('get directory metadata', function(done) {
				request()
        .get(PREFIX + '/project/my%20folder')
        .proxy(testHelper.TEST_PROXY)
				.expect(200)
				.end(function(err, res) {
					testHelper.throwIfError(err);
					var body = res.body;
					assert.equal(body.Children, null, 'Children should be absent');
					assert.equal(body.ChildrenLocation, PREFIX + '/project/my folder/?depth=1');
					assert.equal(body.Directory, true);
					assert.equal(body.Name, 'my folder');
					assert.equal(body.Location, PREFIX + '/project/my folder/');
					done();
				});
			});
			it('has a correct "Parents" field', function(done) {
				request()
        .get(PREFIX + '/project/my%20folder/my%20subfolder')
        .proxy(testHelper.TEST_PROXY)
				.expect(200)
				.end(function(err, res) {
					testHelper.throwIfError(err);
					assert.ok(res.body.Parents);
					assert.equal(res.body.Parents.length, 2);
					assert.equal(res.body.Parents[0].ChildrenLocation, PREFIX + '/project/my folder/?depth=1');
					assert.equal(res.body.Parents[0].Location, PREFIX + '/project/my folder/');
					assert.equal(res.body.Parents[0].Name, 'my folder');
					assert.equal(res.body.Parents[1].Name, 'project');
					done();
				});
			});
		});

		describe('contents', function() {
			it("testDirectoryDepth", function(done) {
				testHelper.mkdirp(WORKSPACE, 'project/testDirectoryDepth/d1/d2/d3');
				request()
          .get(PREFIX + '/project/testDirectoryDepth')
          .proxy(testHelper.TEST_PROXY)
					.query({depth: 1})
					.expect(200)
					.end(function(err, res) {
						testHelper.throwIfError(err);
						assert(Array.isArray(res.body.Children), "We shoudl have gotten children back");
						assert.equal(res.body.Children.length, 1, "We shold have only gotten one child");
						assert.equal(res.body.Children[0].Name, "d1", "We got the wrong first child directory");
						done();
					});
			});
			it("testReadDirectory", function(done) {
				request()
          .get(PREFIX + '/project/my%20folder')
          .proxy(testHelper.TEST_PROXY)
					.query({ depth: 0 })
					.expect(200)
					.end(function(err, res) {
						testHelper.throwIfError(err);
						assert(res.body, "There should have been a body in the response");
						assert(res.body.Directory, "Should have gotten a folder");
						assert.equal(res.body.Name, 'my folder', "The folder name is not correct");
						done();
					});
			});
			it('get directory contents', function(done) {
				request()
        .get(PREFIX + '/project/my%20folder')
        .proxy(testHelper.TEST_PROXY)
				.query({ depth: 1 })
				.expect(200)
				.end(function(err, res) {
					testHelper.throwIfError(err);
					var body = res.body;
					assert.equal(body.ChildrenLocation, PREFIX + '/project/my folder/?depth=1');
					assert.equal(Array.isArray(body.Children), true);
					body.Children.sort(byName);
					assert.equal(body.Children.length, 2);
					assert.equal(body.Children[0].Name, 'buzz.txt');
					assert.equal(body.Children[0].Directory, false);
					assert.equal(body.Children[0].Location, PREFIX + '/project/my folder/buzz.txt');
					assert.equal("ChildrenLocation" in body.Children[0], false, "Child file has no ChildrenLocation");
					assert.equal(body.Children[1].Name, 'my subfolder');
					assert.equal(body.Children[1].Directory, true);
					assert.equal(body.Children[1].Location, PREFIX + '/project/my folder/my subfolder/');
					assert.equal("ChildrenLocation" in body.Children[1], true, "Child folder has ChildrenLocation"); 
					done();
				});
			});
		});

		/**
		 * http://wiki.eclipse.org/Orion/Server_API/File_API#Creating_files_and_directories
		 */
		describe('creating', function() {
			/**
			 * @see https://bugs.eclipse.org/bugs/show_bug.cgi?id=521205
			 */
			it("testListenerCreateDirectory", function(done) {
				fileUtil.addFileModificationListener("testListenerCreateDirectory", {
					handleFileModficationEvent: function handleFileModficationEvent(eventData) {
						assert(eventData, "No event data was fired");
						assert.equal(eventData.type, fileUtil.ChangeType.MKDIR, "Event type is not mkdir");
						done();
					}
				});
				request()
          .post(PREFIX + '/project')
          .proxy(testHelper.TEST_PROXY)
					.type('json')
					.send({Name: 'testListenerCreateDirectory', Directory: true})
					.expect(201)
					.end(function(err, res) {
						testHelper.throwIfError(err);
						fileUtil.removeFileModificationListener("testListenerCreateDirectory");
					})
			});
			/**
			 * @see https://bugs.eclipse.org/bugs/show_bug.cgi?id=521205
			 */
			it("testListenerCreateDirectory - No listener name", function(done) {
				fileUtil.addFileModificationListener({
					handleFileModficationEvent: function handleFileModficationEvent(eventData) {
						assert(eventData, "No event data was fired");
						assert.equal(eventData.type, fileUtil.ChangeType.MKDIR, "Event type is not mkdir");
						done();
					}
				});
				request()
          .post(PREFIX + '/project')
          .proxy(testHelper.TEST_PROXY)
					.type('json')
					.send({Name: 'testListenerCreateDirectory', Directory: true})
					.expect(201)
					.end(function(err, res) {
						testHelper.throwIfError(err);
						fileUtil.removeFileModificationListener();
					})
			});
			/**
			 * @see https://bugs.eclipse.org/bugs/show_bug.cgi?id=521257
			 * This test passes on the Java server
			 */
			it("testFolderWithIPv6Name", function(done) {
				var folderName = "[bork]";
				request()
          .post(PREFIX + '/project')
          .proxy(testHelper.TEST_PROXY)
					.type('json')
					.send({Name: folderName, Directory: true})
					.expect(201)
					.end(function(err, res) {
						testHelper.throwIfError(err);
						request()
            .post(res.body.Location)
            .proxy(testHelper.TEST_PROXY)
						.type('json')
						.set('Slug', 'test.txt')
						.send({"Name":"test.txt","Directory":false})
							.expect(201)
							.end(function(err, res) {
								testHelper.throwIfError(err);
								request()
                  .get(res.body.Location)
                  .proxy(testHelper.TEST_PROXY)
									.query({parts: 'meta'})
									.expect(200)
									.end(done);
							});
					});
			});
			it('works with Slug header', function(done) {
				request()
        .post(PREFIX + '/project')
        .proxy(testHelper.TEST_PROXY)
				.type('json')
				.set('Slug', 'new directory')
				.send({ Directory: true })
				.expect(201)
				.end(function(err, res) {
					testHelper.throwIfError(err);
					assert.equal(res.body.Directory, true);
					assert.equal(res.body.Location, PREFIX + '/project/new directory/'); //FIXME
					assert.equal(res.body.Name, 'new directory');
					done();
				});
			});
			it('works with "Name" field', function(done) {
				request()
        .post(PREFIX + '/project')
        .proxy(testHelper.TEST_PROXY)
				.type('json')
				.send({ Name: 'new directory', Directory: true })
				.expect(201)
				.end(function(err, res) {
					testHelper.throwIfError(err);
					assert.equal(res.body.Directory, true);
					assert.equal(res.body.Location, PREFIX + '/project/new directory/'); // FIXME
					assert.equal(res.body.Name, 'new directory');
					done();
				});
			});
			it('works when a string-typed Directory "true" is provided', function(done) {
				request()
        .post(PREFIX + '/project')
        .proxy(testHelper.TEST_PROXY)
				.type('json')
				.send({ Name: 'new directory', Directory: 'true' }) //only works because of the truthy value of a non-empty string
				.expect(201)
				.end(function(err, res) {
					testHelper.throwIfError(err);
					assert.equal(res.body.Directory, true);
					assert.equal(res.body.Location, PREFIX + '/project/new directory/'); // FIXME
					assert.equal(res.body.Name, 'new directory');
					done();
				});
			});
			it('works when a string-typed Directory "false" is provided', function(done) {
				request()
        .post(PREFIX + '/project')
        .proxy(testHelper.TEST_PROXY)
				.type('json')
				.set('Slug', 'Not a directory')
				.send({ Directory: false })
				.expect(201)
				.end(function(err, res) {
					testHelper.throwIfError(err);
					assert.equal(res.body.Directory, false);
					assert.equal(res.body.Location, PREFIX + '/project/Not a directory'); //FIXME
					assert.equal(res.body.Name, 'Not a directory');
					done();
				});
			});
		});
		// Unimplemented features:
		// 'should implement PUT directory metadata'
	});

	/**
	 * http://wiki.eclipse.org/Orion/Server_API/File_API#Copy.2C_move.2C_and_delete
	 */
	describe('delete', function() {
		it("testDeleteEmptyDir", function(done) { 
			testHelper.createDir(request, "/project", "testDeleteEmptyDir")
				.then(function(res) {
					request()
            .del(PREFIX + '/project/testDeleteEmptyDir')
            .proxy(testHelper.TEST_PROXY)
						.expect(204)
						.end(function(err, res) {
							testHelper.throwIfError(err);
							request()
                .get(PREFIX + '/project/testDeleteEmptyDir')
                .proxy(testHelper.TEST_PROXY)
								.expect(404)
								.end(done);
						});
				});
		});
		it("testListenerDeleteEmptyDir", function(done) {
			testHelper.createDir(request, "/project", "testDeleteEmptyDir")
			.then(function(res) {
				fileUtil.addFileModificationListener("testListenerDeleteEmptyDir", {
					handleFileModficationEvent: function handleFileModficationEvent(eventData) {
						assert(eventData, "No event data was fired");
						assert.equal(eventData.type, "delete", "Event type is not delete");
					}
				});
				request()
          .del(PREFIX + '/project/testDeleteEmptyDir')
          .proxy(testHelper.TEST_PROXY)
					.expect(204)
					.end(function(err, res) {
						testHelper.throwIfError(err);
						request()
              .get(PREFIX + '/project/testDeleteEmptyDir')
              .proxy(testHelper.TEST_PROXY)
							.expect(404)
							.end(function(err, res) {
								fileUtil.removeFileModificationListener("testListenerDeleteEmptyDir");
								done();
							});
					});
			});
		});
		it("testDeleteFile", function(done) {
			testHelper.createFile(request, "/project", "testDeleteFile.bmp")
				.then(function(res) { 
					request()
          .del(PREFIX + '/project/testDeleteFile.bmp')
          .proxy(testHelper.TEST_PROXY)
					.expect(204)
					.end(/* @callback */ function(err, res) {
						testHelper.throwIfError(err, "failed to DELETE file");
						// subsequent requests should 404
						request()
              .get(PREFIX + '/project/testDeleteFile.bmp')
              .proxy(testHelper.TEST_PROXY)
							.expect(404)
							.end(done);
					});
				})
		});
		it("testListenerDeleteFile", function(done) {
			testHelper.createFile(request, "/project", "testDeleteFileListener.txt")
				.then(function(res) {
					fileUtil.addFileModificationListener("testListenerDeleteFile", {
						handleFileModficationEvent: function handleFileModficationEvent(eventData) {
							assert(eventData, "No event data was fired");
							assert.equal(eventData.type, "delete", "Event type is not delete");
						}
					});
					request()
            .del(PREFIX + '/project/testDeleteFileListener.txt')
            .proxy(testHelper.TEST_PROXY)
						.expect(204)
						.end(function(err, res) {
							testHelper.throwIfError(err);
							request()
                .get(PREFIX + '/project/testDeleteFileListener.txt')
                .proxy(testHelper.TEST_PROXY)
								.expect(404)
								.end(function(err, res) {
									fileUtil.removeFileModificationListener("testListenerDeleteFile");
									done();
								});
						});
				});
		});
		it("testDeleteNonEmptyDirectory", function(done) {
			testHelper.createDir(request, "/project", "testDeleteNonEmptyDirectory")
				.then(function(res) {
					testHelper.createFile(request, "/project/testDeleteNonEmptyDirectory", "file.txt")
						.then(function(res) {
							request()
              .del(PREFIX + '/project/testDeleteNonEmptyDirectory')
              .proxy(testHelper.TEST_PROXY)
							.expect(204)
							.end(function(err, res) {
								testHelper.throwIfError(err);
								request()
                  .get(PREFIX + '/project/testDeleteNonEmptyDirectory')
                  .proxy(testHelper.TEST_PROXY)
									.expect(404)
									.end(done);
							});
						});
				});
		});
		it("testListenerDeleteNonEmptyDirectory", function(done) {
			testHelper.createDir(request, "/project", "testListenerDeleteNonEmptyDirectory")
				.then(function(res) {
					testHelper.createFile(request, "/project/testListenerDeleteNonEmptyDirectory", "file.txt")
						.then(function(res) {
							fileUtil.addFileModificationListener("testListenerDeleteNonEmptyDirectory", {
								handleFileModficationEvent: function handleFileModficationEvent(eventData) {
									assert(eventData, "No event data was fired");
									assert.equal(eventData.type, "delete", "Event type is not delete");
								}
							});
							request()
              .del(PREFIX + '/project/testListenerDeleteNonEmptyDirectory')
              .proxy(testHelper.TEST_PROXY)
							.expect(204)
							.end(function(err, res) {
								testHelper.throwIfError(err);
								request()
                  .get(PREFIX + '/project/testListenerDeleteNonEmptyDirectory')
                  .proxy(testHelper.TEST_PROXY)
									.expect(404)
									.end(function(err, res) {
										fileUtil.removeFileModificationListener("testListenerDeleteNonEmptyDirectory");
										done();
									});
							});
						});
				});
		});
		it('delete a file', function(done) {
			request()
      .del(PREFIX + '/project/my%20folder/buzz.txt')
      .proxy(testHelper.TEST_PROXY)
			.expect(204)
			.end(/* @callback */ function(err, res) {
				testHelper.throwIfError(err, "failed to DELETE file");
				// subsequent requests should 404
				request()
        .get(PREFIX + '/project/my%20folder/buzz.txt')
        .proxy(testHelper.TEST_PROXY)
				.expect(404)
				.end(done);
			});
		});
		it('delete a directory', function(done) {
			request()
      .del(PREFIX + '/project/my%20folder')
      .proxy(testHelper.TEST_PROXY)
			.expect(204)
			.end(/* @callback */ function(err, res) {
				testHelper.throwIfError(err, "Failed to DELETE folder");
				// the directory is gone:
				request()
        .get(PREFIX + '/project/my%20folder')
        .proxy(testHelper.TEST_PROXY)
				.expect(404)
				.end(/* @callback */ function(err, res) {
					testHelper.throwIfError(err);
					// and its contents are gone:
					request()
          .get(PREFIX + '/project/my%20folder/buzz.txt')
          .proxy(testHelper.TEST_PROXY)
					.expect(404)
					.end(done);
				});
			});
		});
		it('conditional delete using If-Match', function(done) {
			var url = PREFIX + '/project/fizz.txt';
			request()
      .get(url)
      .proxy(testHelper.TEST_PROXY)
			.query({ parts: 'meta' })
			.end(function(err, res) {
				testHelper.throwIfError(err, "Failed to get folder");
				var etag = res.body.ETag;
				assert.notEqual(res.body.ETag, null);
				request()
        .del(url)
        .proxy(testHelper.TEST_PROXY)
				.set('If-Match', etag + '_blort')
				.expect(412)
				.end(/* @callback */ function(err, res) {
					testHelper.throwIfError(err, "Expected precondition to fail");
					request(url)
          .del(url)
          .proxy(testHelper.TEST_PROXY)
					.set('If-Match', etag)
					.expect(204)
					.end(done);
				});
			});
		});
	});
	/**
	 * http://wiki.eclipse.org/Orion/Server_API/File_API#Copy.2C_move.2C_and_delete
	 * and 
	 * http://wiki.eclipse.org/Orion/Server_API/File_API#Notes_on_POST_method
	 */
	describe('copy', function() {
		it("testCopyFileInvalidSource", function(done) {
			testHelper.createDir(request, '/project', 'testCopyFileInvalidSource')
				.then(function(res) {
					assert(res.statusCode === 201);
					var url = PREFIX + '/project/someFileThatDoesNotExist.txt'
					request()
            .post(PREFIX + '/project/testCopyFileInvalidSource')
            .proxy(testHelper.TEST_PROXY)
						.set('X-Create-Options', 'copy')
						.set('Slug', 'someFileThatDoesNotExist.txt')
						.send({Location: url})
						.expect(404)
						.end(done)
				});
		});
		it("testCopyFileNoOverwrite", function(done) {
			testHelper.createDir(request, '/project', 'testCopyFileNoOverwrite')
				.then(function(res) {
					testHelper.createFile(request, '/project', 'copyNoOverwrite.txt')
						.then(function(res) {
							assert(res.statusCode === 201);
							var url = PREFIX + '/project/copyNoOverwrite.txt'
							request()
                .post(PREFIX + '/project/testCopyFileNoOverwrite')
                .proxy(testHelper.TEST_PROXY)
								.set('Slug', 'copyNO2.txt')
								.set('X-Create-Options', 'copy')
								.send({Location: url})
								.expect(201)
								.end(done)
						});
				});
		});
		/**
		 * @see https://bugs.eclipse.org/bugs/show_bug.cgi?id=521138
		 * The event type is 'rename' when it should be copy_into
		 */
		it.skip("testListenerCopyFile", function(done) {
			testHelper.createDir(request, '/project', 'testListenerCopyFile')
			.then(function(res) {
				testHelper.createFile(request, '/project', 'copyListener.txt')
					.then(function(res) {
						assert(res.statusCode === 201);
						fileUtil.addFileModificationListener("testListenerCopyFile", {
							handleFileModficationEvent: function handleFileModficationEvent(eventData) {
								assert(eventData, "No event data was fired");
								assert.equal(eventData.type, fileUtil.ChangeType.COPY_INTO, "Event type is not copy_into");
								done();
							}
						});
						var url = PREFIX + '/project/copyListener.txt'
						request()
              .post(PREFIX + '/project/testListenerCopyFile')
              .proxy(testHelper.TEST_PROXY)
							.set('Slug', 'copyListener2.txt')
							.set('X-Create-Options', 'copy')
							.send({Location: url})
							.expect(201)
							.end(function(err, res) {
								fileUtil.removeFileModificationListener("testListenerCopyFile");
								testHelper.throwIfError(err);
							})
					});
			});
		});
		it("testCopyFileOverwrite", function(done) {
			request()
        .post(PREFIX + '/project/my%20folder') //create a file will will overwrite
        .proxy(testHelper.TEST_PROXY)
				.set('Slug', 'fizz2.txt')
				.expect(201)
				.end(function(err, res) {
					testHelper.throwIfError(err);
					request()
            .post(PREFIX + '/project/my%20folder')
            .proxy(testHelper.TEST_PROXY)
						.set('Slug', 'fizz2.txt')
						.set('X-Create-Options', 'copy,overwrite')
						.send({ Location: PREFIX + '/project/fizz.txt' })
						.expect(200) //spec'd to return 200 of over-writing move
						.end(function(err, res) {
							testHelper.throwIfError(err);
							done();
						});
				});
		});
		it('copy a file', function(done) {
			request()
      .post(PREFIX + '/project/my%20folder')
      .proxy(testHelper.TEST_PROXY)
			.set('Slug', 'copy_of_fizz.txt')
			.set('X-Create-Options', 'copy')
			.send({ Location: PREFIX + '/project/fizz.txt' })
			.expect(201)
			.end(function(err, res) {
				testHelper.throwIfError(err);
				assert.equal(res.body.Name, 'copy_of_fizz.txt');
				done();
			});
		});
		it('copy a file overwrites when "no-overwrite" is not set', function(done) {
			// cp project/fizz.txt "project/my folder/buzz.txt"
			request()
      .post(PREFIX + '/project/my%20folder')
      .proxy(testHelper.TEST_PROXY)
			.set('Slug', 'buzz.txt')
			.set('X-Create-Options', 'copy')
			.send({ Location: PREFIX + '/project/fizz.txt' })
			.expect(200) // 200 means overwritten
			.end(function(err, res) {
				testHelper.throwIfError(err, "Failed to overwrite");
				// It's in the expected place:
				assert.equal(res.body.Name, 'buzz.txt');
				assert.equal(res.body.Parents[0].Name, 'my folder');
				// And has the expected contents:
				request()
				.get(res.body.Location)
				.expect(200, 'hello world', done);
			});
		});
		it('copy a directory', function(done) {
			request()
      .post(PREFIX + '/project/')
      .proxy(testHelper.TEST_PROXY)
			.set('Slug', 'copy_of_my_folder')
			.set('X-Create-Options', 'copy')
			.send({ Location: PREFIX + '/project/my folder' })
			.expect(201)
			.end(function(err, res) {
				testHelper.throwIfError(err);
				// Ensure the copy has the expected children
				assert.ok(res.body.ChildrenLocation);
				request()
        .get(res.body.ChildrenLocation)
        .proxy(testHelper.TEST_PROXY)
				.expect(200)
				.end(function(err, res) {
					testHelper.throwIfError(err);
					res.body.Children.sort(byName);
					assert.equal(res.body.Children[0].Name, 'buzz.txt');
					assert.equal(res.body.Children[1].Name, 'my subfolder');
					done();
				});
			});
		});
	});
	/**
	 * http://wiki.eclipse.org/Orion/Server_API/File_API#Copy.2C_move.2C_and_delete
	 */
	describe('move/rename', function() {
		it("testMoveFileNoOverwrite", function(done) {
			 testHelper.createDir(request, '/project', '/moveToFolder')
				.then(function(res) {
					request()
            .post(PREFIX + '/project/moveToFolder') //move it to
            .proxy(testHelper.TEST_PROXY)
						.set('X-Create-Options', 'move')
						.set('Slug', 'fizz.txt')
						.send({Location: PREFIX + '/project/fizz.txt'})
						.expect(201)
						.end(function(err, res) {
							testHelper.throwIfError(err);
							done();
						});
				})
		});
		it("testMoveFileOverwrite", function(done) {
			testHelper.createDir(request, '/project', '/moveToFolder')
			   .then(function(res) {
				   testHelper.createFile(request, "/project/moveToFolder", "fizz.txt")
				   	.then(function(res) {
						request()
            .post(PREFIX + '/project/moveToFolder') //move it to
            .proxy(testHelper.TEST_PROXY)
						.set('X-Create-Options', 'move')
						.set('Slug', 'fizz.txt')
						.send({Location: PREFIX + '/project/fizz.txt'})
						.expect(200)
						.end(function(err, res) {
							testHelper.throwIfError(err);
							done();
						});
					})
			   })
	   });
		it("testMoveFileNoOverwrite", function(done) {
			testHelper.createDir(request, '/project', '/moveToFolder2')
				.then(function(res) {
					request()
            .post(PREFIX + '/project/moveToFolder2') //move it to
            .proxy(testHelper.TEST_PROXY)
						.set('X-Create-Options', 'copy,no-overwrite')
						.set('Slug', 'fizz.txt')
						.send({Location: PREFIX + '/project/fizz.txt'})
						.expect(412)
						.end(function() {
							done();
						});
				})
		});
		/**
		 * @see https://bugs.eclipse.org/bugs/show_bug.cgi?id=521138
		 */
		it.skip("testListenerMoveFileNoOverwrite", function(done) {
			fileUtil.addFileModificationListener("testListenerMoveFileNoOverwrite", {
				handleFileModficationEvent: function handleFileModficationEvent(eventData) {
					assert(eventData, "No event data was fired");
					assert.equal(eventData.type, "move", "Event type is not move");
					done();
				}
			});
			testHelper.createDir(request, '/project', '/moveToFolder3')
				.then(function(res) {
					request()
            .post(PREFIX + '/project/moveToFolder3') //move it to
            .proxy(testHelper.TEST_PROXY)
						.set('X-Create-Options', 'move')
						.set('Slug', 'fizz.txt')
						.send({Location: PREFIX + '/project/fizz.txt'})
						.expect(201)
						.end(function(err, res) {
							fileUtil.removeFileModificationListener("testListenerMoveFileNoOverwrite");
							testHelper.throwIfError(err);
						});
				})
		});
		it("testListenerRenameFile", function(done) {
			testHelper.createDir(request, '/project', '/moveToFolder4')
				.then(function(res) {
					fileUtil.addFileModificationListener("testListenerRenameFile", {
						handleFileModficationEvent: function handleFileModficationEvent(eventData) {
							assert(eventData, "No event data was fired");
							assert.equal(eventData.type, "rename", "Event type is not rename");
							done();
						}
					})
					request()
            .post(PREFIX + '/project/moveToFolder4') //move it to
            .proxy(testHelper.TEST_PROXY)
						.set('X-Create-Options', 'copy,no-overwrite')
						.set('Slug', 'fizz.txt')
						.send({Location: PREFIX + '/project/fizz.txt'})
						.expect(201)
						.end(function(err, res) {
							fileUtil.removeFileModificationListener("testListenerRenameFile");
							testHelper.throwIfError(err);
						});
				})
		});
		it("testRenameFileChangeCase", function(done) {
			var fileNameLowerCase = "testrenamefilechangecase";
			var fileNameLowerCase2 = "testrenamefilechangecase2";
			var fileNameUpperCase = "testRenameFileChangeCase";
			testHelper.createFile(request, '/project', fileNameLowerCase, 'Odd contents')
				.then(function(res) {
					testHelper.createFile(request, '/project', fileNameLowerCase2, 'Odd contents2')
						.then(function(res) {
							// Try rename testrenamefilechangecase to testRenameFileChangeCase
							request()
              .post(PREFIX + '/project/')
              .proxy(testHelper.TEST_PROXY)
							.set('Slug', fileNameUpperCase)
							.set('X-Create-Options', 'move,no-overwrite')
							.send({ Location: PREFIX + '/project/' + fileNameLowerCase})
							.end(function(err, res) {
								assert(res.statusCode === 200 || res.statusCode === 201); // The statusCode returned from rename, might be 200 or 201 depends on the filesystem.
								testHelper.throwIfError(err);
								assert.equal(res.body.Name, fileNameUpperCase);
								// Try rename testRenameFileChangeCase to testrenamefilechangecase2
								request()
                .post(PREFIX + '/project/')
                .proxy(testHelper.TEST_PROXY)
								.set('Slug', fileNameLowerCase2)
								.set('X-Create-Options', 'move,no-overwrite')
								.send({ Location: PREFIX + '/project/' + fileNameUpperCase})
								.expect(412, done);
							});
						})
				});
		});
		it('move & rename a file', function(done) {
			request()
        .post(PREFIX + '/project/my%20folder')
        .proxy(testHelper.TEST_PROXY)
				.set('Slug', 'fizz_moved.txt')
				.set('X-Create-Options', 'move')
				.send({ Location: PREFIX + '/project/fizz.txt' })
				.expect(201)
				.end(function(err, res) {
					testHelper.throwIfError(err);
					assert.equal(res.body.Name, 'fizz_moved.txt');
					done();
				});
		});
		it('move & rename a directory', function(done) {
			request()
        .post(PREFIX + '/project/my%20folder')
        .proxy(testHelper.TEST_PROXY)
				.set('Slug', 'fizz_moved.txt')
				.set('X-Create-Options', 'move')
				.send({ Location: PREFIX + '/project/fizz.txt' })
				.expect(201)
				.end(function(err, res) {
					testHelper.throwIfError(err);
					assert.equal(res.body.Name, 'fizz_moved.txt');
					done();
				});
		});
		it("Bug 521429", function(done) {
			testHelper.createDir(request, '/project', '/moveTo,Folder')
			   .then(function(res) {
				   testHelper.createFile(request, "/project/moveTo,Folder", "fizz.txt")
				   	.then(function(res) {
						request()
            .post(PREFIX + '/project/moveTo%2CFolder') //move it to
            .proxy(testHelper.TEST_PROXY)
						.set('X-Create-Options', 'move')
						.set('Slug', 'fizz1.txt')
						.send({Location: PREFIX + '/project/moveTo%2CFolder/fizz.txt'})
						.expect(201)
						.end(function(err, res) {
							assert.equal(res.body.Location, PREFIX + "/project/moveTo%2CFolder/fizz1.txt");
							done();
						});
					})
			   })
	   });
	});
});
