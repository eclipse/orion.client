/*******************************************************************************
 * Copyright (c) 2017, 2019 IBM Corporation and others.
 * All rights reserved. This program and the accompanying materials are made 
 * available under the terms of the Eclipse Public License 2.0 
 * (http://www.eclipse.org/legal/epl-v10.html), and the Eclipse Distribution 
 * License v1.0 (http://www.eclipse.org/org/documents/edl-v10.html). 
 *
 * Contributors:
 *     IBM Corporation - initial API and implementation
 * 	   Remy Suen - initial API and implementation
 *******************************************************************************/
/*eslint-env mocha */
const assert = require("assert"),
	    path = require("path"),
	    fs = require('fs'),
	    testData = require('../support/test_data'),
	    testHelper = require('../support/testHelper');

var CONTEXT_PATH = testHelper.CONTEXT_PATH,
	WORKSPACE = testHelper.WORKSPACE,
	METADATA =  testHelper.METADATA,
	WORKSPACE_ID = testHelper.WORKSPACE_ID,
	IMPORT_PATH = CONTEXT_PATH + '/xfer/import',
	EXPORT_PATH = CONTEXT_PATH + '/xfer/export',
	FILE_PATH = CONTEXT_PATH + '/file',
	PREFIX = FILE_PATH + '/' + WORKSPACE_ID;

var request = testData.setupOrionServer();

describe("XFER endpoint", function() {
	/**
	 * From: org.eclipse.orion.server.tests.servlets.xfer.TransferTest.java
	 */
	this.timeout(20000);
	beforeEach(function(done) { // testData.setUp.bind(null, parentDir)
		testData.setUp(WORKSPACE, function(){
			testData.setUpWorkspace(request, done);
		});
	});
	afterEach("Remove .test_workspace", function(done) {
		testData.tearDown(testHelper.WORKSPACE, function(){
			testData.tearDown(path.join(METADATA, '.orion'), function(){
				testData.tearDown(METADATA, done);
			})
		});
	});
	// Bug 511513 - Export non-existing folder leaks server path
	it('testExport - bug 511513', function(done) {
		// make sure the folder doesn't actually exist
		assert.equal(fs.existsSync(WORKSPACE + "/donotexist"), false);
		// ask the server to export the non-existent folder
		request()
      .get(EXPORT_PATH + '/' + WORKSPACE_ID + "/donotexist.zip")
      .proxy(testHelper.TEST_PROXY)
			.expect(404)
			.end(function(err, res) {
				testHelper.throwIfError(err)
				// message body doesn't include the path
				assert.equal(res.body.Message.indexOf(WORKSPACE), -1);
				done();
			});
	});
	it("testExportProject", function(done) {
		testHelper.createDir(request, '/project', "exportSample")
			.end(function(err, res) {
				testHelper.throwIfError(err);
				testHelper.createFile(request, "/project/exportSample/", "exportTestFile.txt")
					.end(function(err, res) {
						testHelper.throwIfError(err);
						testHelper.setFileContents(request, res.body.Location, "This is some contents for initialization")
							.end(function(err, res) {
								testHelper.throwIfError(err);
								request()
                  .get(EXPORT_PATH + '/' + WORKSPACE_ID + '/project/exportSample.zip')
                  .proxy(testHelper.TEST_PROXY)
									.expect(200)
									.end(function(err,res){
										testHelper.throwIfError(err);
										request()
                    .get(EXPORT_PATH + '/' + WORKSPACE_ID + '/project/exportSample/')
                    .proxy(testHelper.TEST_PROXY)
										.expect(400)
										.end(function(err, res){
											testHelper.throwIfError(err);
											assert.equal(JSON.parse(res.error.text).Message, "Export is not a zip")
											done()
										})
									})
								//TODO extract and confirm zip?
							})
					});
			});
	});
	it("testImportFromURL", function(done) {
		var url = 'https://storage.googleapis.com/google-code-archive-downloads/v2/code.google.com/jsdoc-toolkit/jsdoc_toolkit-2.4.0.zip';
		testHelper.createDir(request, '/project', 'importFromUrlRaw')
			.end(function(err, res) {
				testHelper.throwIfError(err);
				request()
          .post(IMPORT_PATH + '/' + WORKSPACE_ID + '/project/importFromUrlRaw?source=' + encodeURIComponent(url))
          .proxy(testHelper.TEST_PROXY)
					.set('X-Xfer-Options', 'raw')
					.expect(201)
					.end(function(err, res) {
						testHelper.throwIfError(err);
						assert(res.header.location, "There was no location in the response");
						//TODO update after we decide if the location should be returned encoded
						assert.equal(decodeURIComponent(res.header.location), PREFIX + '/project/importFromUrlRaw', "The file location is not correct");
						done();
					});
			});
	});
	/**
	 * @see https://bugs.eclipse.org/bugs/show_bug.cgi?id=520782
	 */
	it("testImportFromURLNoHeader", function(done) {
		var url = 'https://storage.googleapis.com/google-code-archive-downloads/v2/code.google.com/jsdoc-toolkit/jsdoc_toolkit-2.4.0.zip';
		testHelper.createDir(request, '/project', 'importFromUrlNoHeader')
			.end(function(err, res) {
				testHelper.throwIfError(err);
				request()
          .post(IMPORT_PATH + '/' + WORKSPACE_ID + '/project/importFromUrlNoHeader?source=' + encodeURIComponent(url))
          .proxy(testHelper.TEST_PROXY)
					.expect(201)
					.end(function(err, res) {
						testHelper.throwIfError(err);
						assert(res.header.location, "There was no location in the response");
						//TODO update after we decide if the location should be returned encoded
						assert.equal(decodeURIComponent(res.header.location), PREFIX + '/project/importFromUrlNoHeader', "The file location is not correct");
						done();
					});
			});
	});
	it("testImportAndUnzipFromURL", function(done) {
		var url = 'https://storage.googleapis.com/google-code-archive-downloads/v2/code.google.com/jsdoc-toolkit/jsdoc_toolkit-2.4.0.zip';
		testHelper.createDir(request, '/project', 'importFromUrlAutoExtracted')
			.end(function(err, res) {
				testHelper.throwIfError(err);
				request()
          .post(IMPORT_PATH + '/' + WORKSPACE_ID + '/project/importFromUrlAutoExtracted?source=' + encodeURIComponent(url))
          .proxy(testHelper.TEST_PROXY)
					.set('X-Xfer-Options', 'unzip')
					.expect(201)
					.end(function(err, res) {
						testHelper.throwIfError(err);
						assert(res.header.location, "There was no location in the response");
						//TODO update after we decide if the location should be returned encoded
						assert.equal(decodeURIComponent(res.header.location), PREFIX + '/project/importFromUrlAutoExtracted', "The file location is not correct");
						done();
					});
			});
	});
	it("testImportAndUnzipFromNonArchiveURL", function(done) {
		var url = 'https://wiki.eclipse.org/Orion';
		testHelper.createDir(request, '/project', 'importFromUrlAutoExtractedNonArchive')
			.end(function(err, res) {
				testHelper.throwIfError(err);
				request()
          .post(IMPORT_PATH + '/' + WORKSPACE_ID + '/project/importFromUrlAutoExtractedNonArchive?source=' + encodeURIComponent(url))
          .proxy(testHelper.TEST_PROXY)
					.set('X-Xfer-Options', 'unzip')
					.expect(400)
					.end(done);
			});
	});
	it("testImportFromURLMalformed", function(done) {
		testHelper.createDir(request, '/project', 'importMalformedUrl')
			.end(function(err, res) {
				testHelper.throwIfError(err);
				request()
          .post(IMPORT_PATH + '/' + WORKSPACE_ID + '/project/importMalformedUrl?source=pumpkins')
          .proxy(testHelper.TEST_PROXY)
					.set('X-Xfer-Options', 'unzip')
					.expect(400)
					.end(done);
			});
	});
	/**
	 * TODO SSQ and MR need to review what is expected here
	 */
	it.skip("testImportAndUnzip", function(done) {
		testHelper.createDir(request, '/project', 'testImportFile')
			.end(function(err, res) {
				testHelper.throwIfError(err);
				var fname = path.dirname(__dirname) + '/testData/importTest/client.zip',
					lngth = -1,
					stats = fs.statSync(fname);
				assert(stats, "Could not get the file information for: "+fname);
				lngth = stats.size;
				request()
          .post(IMPORT_PATH + '/' + WORKSPACE_ID + '/project/testImportFile')
          .proxy(testHelper.TEST_PROXY)
					.set('Content-Type', 'application/octet-stream')
					.set('Content-Length', lngth)
					.set('Slug', 'client.zip')
					.expect(201)
					.end(function(err, res) {
						testHelper.throwIfError(err);
						var stream = fs.createReadStream(fname);
						stream.pipe(res);
						stream.on('error', function(e) {
							res.end();
						});
						stream.on('end', function() {
							done();
						});
					});
			});
	});
	it.skip("testImportFile", function(done) {
		testHelper.createDir(request, '/project', 'testImportFile')
			.end(function(err, res) {
				testHelper.throwIfError(err);
				var fname = path.dirname(__dirname) + '/testData/importTest/client.zip',
				lngth = -1,
				stats = fs.statSync(fname);
				request()
          .post(IMPORT_PATH + '/' + WORKSPACE_ID + '/project/testImportFile')
          .proxy(testHelper.TEST_PROXY)
					.set('X-Xfer-Options', 'raw,no-overwrite')
					.set('Content-Type', 'application/octet-stream')
					.set('Slug', 'client.zip')
					.expect(201)
					.end(function(err, res) {
						var stream = fs.createReadStream(fname);
						res.pipe(stream);
						stream.on('error', function(e) {
							res.end();
						});
						stream.on('end', function() {
							done();
						});
					});
			});
	});
	it("testImportEmojiFilenameBad", function(done) {
		var tempdir = fs.mkdtempSync(WORKSPACE + '/temp'),
			fileName = encodeURIComponent('\ud83d\ude0a\ud83d\udc31\ud83d\udc35.txt'),
			fileContents = 'Emoji characters: \ud83d\ude0a\ud83d\udc31\ud83d\udc35';
		fs.writeFileSync(tempdir+'/'+fileName, fileContents);
		request()
      .post(IMPORT_PATH + '/' + WORKSPACE_ID + tempdir)
      .proxy(testHelper.TEST_PROXY)
			.set('X-Xfer-Content-Length', fileContents.length)
			.set('X-Xfer-Options', 'raw')
			.set('Slug', fileName)
			.expect(500)
			.end(done);
	});
	/**
	 * TODO This test fails 
	 */
	it.skip("testImportEmojiFilename", function(done) {
		var tempdir = fs.mkdtempSync(WORKSPACE + '/temp'),
			fileName = encodeURIComponent('\ud83d\ude0a\ud83d\udc31\ud83d\udc35.txt'),
			fileContents = 'Emoji characters: \ud83d\ude0a\ud83d\udc31\ud83d\udc35';
		fs.writeFileSync(tempdir+'/'+fileName, fileContents);
		testHelper.createDir(request, '/project', 'testImportEmojiFilename')
			.end(function(err, res) {
				testHelper.throwIfError(err);
				var lgth = -1,
					fname = tempdir+'/'+fileName,
					stats = fs.statSync(fname);
					if(stats) {
						lgth = stats.size;
					}
			request()
        .post(IMPORT_PATH + '/' + WORKSPACE_ID + '/project/testImportEmojiFilename')
        .proxy(testHelper.TEST_PROXY)
				.set('X-Xfer-Content-Length', lgth)
				.set('X-Xfer-Options', 'raw')
				.set('Slug', fileName)
				.expect(200)
				.end(done);
		});
	});
	it.skip("testImportDBCSFilename");
	it.skip("testImportFileMultiPart");
	it.skip("testImportUnzipNonZipFile");
	it.skip("testImportWithPostZeroByteFile");
	it.skip("testImportWithPost");
	it.skip("testImportFilesWithoutOverride");
	it.skip("testImportFilesWithOverride");
	it.skip("testImportAndUnzipWithoutOverride");
	it.skip("testImportAndUnzipWithOverride");
});
