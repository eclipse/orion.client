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
const assert = require("assert"),
	path = require("path"),
	testData = require("../support/test_data"),
	testHelper = require('../support/testHelper');

var CONTEXT_PATH = testHelper.CONTEXT_PATH,
	WORKSPACE = testHelper.WORKSPACE,
	MEATASTORE =  testHelper.METADATA,
	PREFIX_CF = "/cfapi",
	MANIFESTS = "/manifests",
	PREFIX_MANIFESTS = CONTEXT_PATH + PREFIX_CF + MANIFESTS,
	TASK_PREFIX = CONTEXT_PATH + '/task',
	PREFIX_FILE = CONTEXT_PATH + '/file';

var request = testData.setupOrionServer();

/**
 * Renames the file with the given full /file path to 'manifest.yml' so the endpoint will read it
 * @param {?} request The original request
 * @param {string} filePath The full /file path of the file to rename
 */
async function getTestFile(request, filePath) {
	let res = await request()
    .post(path.dirname(filePath))
    .proxy(testHelper.TEST_PROXY)
		.type('json')
		.set('X-Create-Options', "copy,overwrite")
		.set('Slug', 'manifest.yml')
    .send({Location: filePath});
  if(res.statusCode !== 200 && res.statusCode !== 201) {
    throw new Error("Test file was not moved successfully");
  }
	return res;
}

describe("CloudFoundry manifest", function() {
	beforeEach(function(done) {
		testData.setUp(WORKSPACE, function() {
			testData.setUpWorkspace(request, function() {
				testData.setUpCF(WORKSPACE, done);
			});
		}, false);
	});
	afterEach("Remove Workspace and Metastore", function(done) {
		testData.tearDown(WORKSPACE, function(){
			testData.tearDown(path.join(MEATASTORE, '.orion'), function(){
				testData.tearDown(MEATASTORE, done);
			});
		});
	});
	/**
	 * From: org.eclipse.orion.server.tests.cf.ManifestParserTest.java
	 */
	describe("Manifest parser tests", function() {
		it("testSimpleTwoApps", async () => {
			let res = await testHelper.withWorkspace(request, testHelper.WORKSPACE_PATH, testHelper.WORKSPACE_ID);
      res = await request()
        .get(path.join(res.body.ContentLocation, "cftests", "simpleTwoApps.yml"))
        .proxy(testHelper.TEST_PROXY)
        .expect(200)
        .query({parts: 'meta'});
      var fLoc = res.body.Location;
      res = await getTestFile(request, fLoc);
      res = await request()
          .get(path.join(PREFIX_MANIFESTS, res.body.Location))
          .proxy(testHelper.TEST_PROXY)
          .query({Strict: true})
          .expect(200);
      assert(res.body.Contents);
      assert.equal(res.body.Type, "Manifest", "The manifest should have been parsed as type 'Manifest'")
		});
		it("testSimpleGlobalProps", async () => {
			let res = await testHelper.withWorkspace(request, testHelper.WORKSPACE_PATH, testHelper.WORKSPACE_ID);
      res = await request()
        .get(path.join(res.body.ContentLocation, "cftests", "simpleGlobalProps.yml"))
        .proxy(testHelper.TEST_PROXY)
        .expect(200)
        .query({parts: 'meta'});
      var fLoc = res.body.Location;
      res = await getTestFile(request, fLoc);
      res = await request()
        .get(path.join(PREFIX_MANIFESTS, res.body.Location))
        .proxy(testHelper.TEST_PROXY)
        .query({Strict: true})
        .expect(200);
      assert(res.body.Contents);
      assert.equal(res.body.Type, "Manifest", "The manifest should have been parsed as type 'Manifest'")
		});
		it("testAppCustomConfig", async () => {
			let res = await testHelper.withWorkspace(request, testHelper.WORKSPACE_PATH, testHelper.WORKSPACE_ID);
      res = await request()
        .get(path.join(res.body.ContentLocation, "cftests", "appCustomConfig.yml"))
        .proxy(testHelper.TEST_PROXY)
        .expect(200)
        .query({parts: 'meta'});
      var fLoc = res.body.Location;
      res = await getTestFile(request, fLoc);
      res = await request()
        .get(path.join(PREFIX_MANIFESTS, res.body.Location))
        .proxy(testHelper.TEST_PROXY)
        .query({Strict: true})
        .expect(200);
      assert(res.body.Contents);
      assert.equal(res.body.Type, "Manifest", "The manifest should have been parsed as type 'Manifest'")
		});
		it("testGlobalAndInherit", async () => {
			let res = await testHelper.withWorkspace(request, testHelper.WORKSPACE_PATH, testHelper.WORKSPACE_ID);
      res = await request()
        .get(path.join(res.body.ContentLocation, "cftests", "globalAndInherit.yml"))
        .proxy(testHelper.TEST_PROXY)
        .expect(200)
        .query({parts: 'meta'});
      var fLoc = res.body.Location;
      res = await getTestFile(request, fLoc);
      res = await request()
        .get(path.join(PREFIX_MANIFESTS, res.body.Location))
        .proxy(testHelper.TEST_PROXY)
        .query({Strict: true})
        .expect(200);
      assert(res.body.Contents);
      assert.equal(res.body.Type, "Manifest", "The manifest should have been parsed as type 'Manifest'")
		});
		it("testSimpleGlobals", async () => {
			let res = await testHelper.withWorkspace(request, testHelper.WORKSPACE_PATH, testHelper.WORKSPACE_ID);
      res = await request()
        .get(path.join(res.body.ContentLocation, "cftests", "simpleGlobal.yml"))
        .proxy(testHelper.TEST_PROXY)
        .expect(200)
        .query({parts: 'meta'});
      var fLoc = res.body.Location;
      res = await getTestFile(request, fLoc);
      res = await request()
        .get(path.join(PREFIX_MANIFESTS, res.body.Location))
        .proxy(testHelper.TEST_PROXY)
        .query({Strict: true})
        .expect(200);
      assert(res.body.Contents);
      assert.equal(res.body.Type, "Manifest", "The manifest should have been parsed as type 'Manifest'")
		});
		it("testAppsWithNestedServices", async () => {
			let res = await testHelper.withWorkspace(request, testHelper.WORKSPACE_PATH, testHelper.WORKSPACE_ID);
      res = await request()
        .get(path.join(res.body.ContentLocation, "cftests", "appsNestedServices.yml"))
        .proxy(testHelper.TEST_PROXY)
        .expect(200)
        .query({parts: 'meta'});
      var fLoc = res.body.Location;
      res = await getTestFile(request, fLoc);
      res = await request()
        .get(path.join(PREFIX_MANIFESTS, res.body.Location))
        .proxy(testHelper.TEST_PROXY)
        .query({Strict: true})
        .expect(200);
      assert(res.body.Contents);
      assert.equal(res.body.Type, "Manifest", "The manifest should have been parsed as type 'Manifest'")
		});
		it("testMultiAppsWithNestedServices", async () => {
			let res = await testHelper.withWorkspace(request, testHelper.WORKSPACE_PATH, testHelper.WORKSPACE_ID);
      res = await request()
        .get(path.join(res.body.ContentLocation, "cftests", "multiAppsNestedServices.yml"))
        .proxy(testHelper.TEST_PROXY)
        .expect(200)
        .query({parts: 'meta'});
      var fLoc = res.body.Location;
      res = await getTestFile(request, fLoc);
      res = await request()
        .get(path.join(PREFIX_MANIFESTS, res.body.Location))
        .proxy(testHelper.TEST_PROXY)
        .query({Strict: true})
        .expect(200);
      assert(res.body.Contents);
      assert.equal(res.body.Type, "Manifest", "The manifest should have been parsed as type 'Manifest'")
		});
		it("testComplexEnvAndApps", async () => {
			let res = await testHelper.withWorkspace(request, testHelper.WORKSPACE_PATH, testHelper.WORKSPACE_ID);
      res = await request()
        .get(path.join(res.body.ContentLocation, "cftests", "complexEnvAndApps.yml"))
        .proxy(testHelper.TEST_PROXY)
        .expect(200)
        .query({parts: 'meta'});
      var fLoc = res.body.Location;
      res = await getTestFile(request, fLoc);
      res = await request()
        .get(path.join(PREFIX_MANIFESTS, res.body.Location))
        .proxy(testHelper.TEST_PROXY)
        .query({Strict: true})
        .expect(200);
      assert(res.body.Contents);
      assert.equal(res.body.Type, "Manifest", "The manifest should have been parsed as type 'Manifest'")
		});
		it("testInheritWithMultisections", async () => {
			let res = await testHelper.withWorkspace(request, testHelper.WORKSPACE_PATH, testHelper.WORKSPACE_ID);
      res = await request()
        .get(path.join(res.body.ContentLocation, "cftests", "inheritMultiSection.yml"))
        .proxy(testHelper.TEST_PROXY)
        .expect(200)
        .query({parts: 'meta'});
      var fLoc = res.body.Location;
      res = await getTestFile(request, fLoc);
      res = await request()
        .get(path.join(PREFIX_MANIFESTS, res.body.Location))
        .proxy(testHelper.TEST_PROXY)
        .query({Strict: true})
        .expect(200);
      assert(res.body.Contents);
      assert.equal(res.body.Type, "Manifest", "The manifest should have been parsed as type 'Manifest'")
		});
		it("testMultiEntriesWithComments", async () => {
			let res = await testHelper.withWorkspace(request, testHelper.WORKSPACE_PATH, testHelper.WORKSPACE_ID);
      res = await request()
        .get(path.join(res.body.ContentLocation, "cftests", "multiNestedComments.yml"))
        .proxy(testHelper.TEST_PROXY)
        .expect(200)
        .query({parts: 'meta'});
      var fLoc = res.body.Location;
      res = await getTestFile(request, fLoc);
      res = await request()
        .get(path.join(PREFIX_MANIFESTS, res.body.Location))
        .proxy(testHelper.TEST_PROXY)
        .query({Strict: true})
        .expect(200);
      assert(res.body.Contents);
      assert.equal(res.body.Type, "Manifest", "The manifest should have been parsed as type 'Manifest'")
		});
		it("testArgReplace", async () => {
			let res = await testHelper.withWorkspace(request, testHelper.WORKSPACE_PATH, testHelper.WORKSPACE_ID);
      res = await request()
        .get(path.join(res.body.ContentLocation, "cftests", "argReplace.yml"))
        .proxy(testHelper.TEST_PROXY)
        .expect(200)
        .query({parts: 'meta'});
      var fLoc = res.body.Location;
      res = await getTestFile(request, fLoc);
      res = await request()
        .get(path.join(PREFIX_MANIFESTS, res.body.Location))
        .proxy(testHelper.TEST_PROXY)
        .query({Strict: true})
        .expect(200);
      assert(res.body.Contents);
      assert.equal(res.body.Type, "Manifest", "The manifest should have been parsed as type 'Manifest'")
		});
		it("testLongCommandString", async () => {
			let res = await testHelper.withWorkspace(request, testHelper.WORKSPACE_PATH, testHelper.WORKSPACE_ID);
      res = await request()
        .get(path.join(res.body.ContentLocation, "cftests", "longCommand.yml"))
        .proxy(testHelper.TEST_PROXY)
        .expect(200)
        .query({parts: 'meta'});
      var fLoc = res.body.Location;
      res = await getTestFile(request, fLoc);
      res = await request()
        .get(path.join(PREFIX_MANIFESTS, res.body.Location))
        .proxy(testHelper.TEST_PROXY)
        .query({Strict: true})
        .expect(200);
      assert(res.body.Contents);
      assert.equal(res.body.Type, "Manifest", "The manifest should have been parsed as type 'Manifest'")
		});
		it("testMultiNestingNoSpacing", async () => {
			let res = await testHelper.withWorkspace(request, testHelper.WORKSPACE_PATH, testHelper.WORKSPACE_ID);
      res = await request()
        .get(path.join(res.body.ContentLocation, "cftests", "multiNestingNoSpacing.yml"))
        .proxy(testHelper.TEST_PROXY)
        .expect(200)
        .query({parts: 'meta'});
      var fLoc = res.body.Location;
      res = await getTestFile(request, fLoc);
      res = await request()
        .get(path.join(PREFIX_MANIFESTS, res.body.Location))
        .proxy(testHelper.TEST_PROXY)
        .query({Strict: true})
        .expect(200);
      assert(res.body.Contents);
      assert.equal(res.body.Type, "Manifest", "The manifest should have been parsed as type 'Manifest'")
		});
		it("testMultiNestingWithMultiComments", async () => {
			let res = await testHelper.withWorkspace(request, testHelper.WORKSPACE_PATH, testHelper.WORKSPACE_ID);
      res = await request()
        .get(path.join(res.body.ContentLocation, "cftests", "multiNestingComments.yml"))
        .proxy(testHelper.TEST_PROXY)
        .expect(200)
        .query({parts: 'meta'});
      var fLoc = res.body.Location;
      res = await getTestFile(request, fLoc);
      res = await request()
        .get(path.join(PREFIX_MANIFESTS, res.body.Location))
        .proxy(testHelper.TEST_PROXY)
        .query({Strict: true})
        .expect(200);
      assert(res.body.Contents);
      assert.equal(res.body.Type, "Manifest", "The manifest should have been parsed as type 'Manifest'")
		});
		it("testParseNoFileAtRoot", async () => {
			let res = await testHelper.withWorkspace(request, testHelper.WORKSPACE_PATH, testHelper.WORKSPACE_ID);
      res = await request()
        .get(path.join(res.body.ContentLocation, "cftests", "simpleTwoApps.yml"))
        .proxy(testHelper.TEST_PROXY)
        .expect(200)
        .query({parts: 'meta'});
      res = await request()
        .get(path.join(PREFIX_MANIFESTS, 'foobar'))
        .proxy(testHelper.TEST_PROXY)
        .query({Strict: true})
        .expect(403);
		});
		it("testParseNoFileWithBareFilePath", async () => {
			let res = await testHelper.withWorkspace(request, testHelper.WORKSPACE_PATH, testHelper.WORKSPACE_ID);
      res = await request()
        .get(path.join(res.body.ContentLocation, "cftests", "simpleTwoApps.yml"))
        .proxy(testHelper.TEST_PROXY)
        .expect(200)
        .query({parts: 'meta'});
      res = await request()
        .get(path.join(PREFIX_MANIFESTS, PREFIX_FILE, 'foobar'))
        .proxy(testHelper.TEST_PROXY)
        .query({Strict: true})
        .expect(403);
		});
		/**
		 * This should likely return a 404 since the file does not exist
		 */
		it.skip("testParseNoFileWithProjectFilePath", function(done) {
			testHelper.withWorkspace(request, testHelper.WORKSPACE_PATH, testHelper.WORKSPACE_ID)
				.end(function(err, res) {
					testHelper.throwIfError(err);
					var wLoc = res.body.Location;
					request()
            .get(path.join(res.body.ContentLocation, "cftests", "simpleTwoApps.yml"))
            .proxy(testHelper.TEST_PROXY)
						.expect(200)
						.query({parts: 'meta'})
						.end(function(err, res) {
							testHelper.throwIfError(err);
							var fLoc = res.body.Location;
							request()
                .get(path.join(PREFIX_MANIFESTS, PREFIX_FILE, WORKSPACE_ID, "cftests", 'foobar'))
                .proxy(testHelper.TEST_PROXY)
								.query({Strict: true})
								.expect(404)
								.end(done);
						})
				});
		});
		it("testQuotedManifestProperties", async () => {
			let res = await testHelper.withWorkspace(request, testHelper.WORKSPACE_PATH, testHelper.WORKSPACE_ID);
      res = await request()
        .get(path.join(res.body.ContentLocation, "cftests", "quotedPropertiesManifest.yml"))
        .proxy(testHelper.TEST_PROXY)
        .expect(200)
        .query({parts: 'meta'});
      var fLoc = res.body.Location;
      res = await getTestFile(request, fLoc);
      res = await request()
        .get(path.join(PREFIX_MANIFESTS, res.body.Location))
        .proxy(testHelper.TEST_PROXY)
        .query({Strict: true})
        .expect(200);
      assert(res.body.Contents);
      assert.equal(res.body.Type, "Manifest", "The manifest should have been parsed as type 'Manifest'")
		});
		it("testTargetBaseManifestProperties", async () => {
			let res = await testHelper.withWorkspace(request, testHelper.WORKSPACE_PATH, testHelper.WORKSPACE_ID);
      res = await request()
        .get(path.join(res.body.ContentLocation, "cftests", "targetBaseManifest.yml"))
        .proxy(testHelper.TEST_PROXY)
        .expect(200)
        .query({parts: 'meta'});
      var fLoc = res.body.Location;
      res = await getTestFile(request, fLoc);
      res = await request()
        .get(path.join(PREFIX_MANIFESTS, res.body.Location))
        .proxy(testHelper.TEST_PROXY)
        .query({Strict: true})
        .expect(200);
      assert(res.body.Contents);
      assert.equal(res.body.Type, "Manifest", "The manifest should have been parsed as type 'Manifest'")
		});
		it("testServicesWithSpacesManifest", async () => {
			let res = await testHelper.withWorkspace(request, testHelper.WORKSPACE_PATH, testHelper.WORKSPACE_ID);
      res = await request()
        .get(path.join(res.body.ContentLocation, "cftests", "servicesWithSpaces.yml"))
        .proxy(testHelper.TEST_PROXY)
        .expect(200)
        .query({parts: 'meta'});
      var fLoc = res.body.Location;
      res = await getTestFile(request, fLoc);
      res = await request()
        .get(path.join(PREFIX_MANIFESTS, res.body.Location))
        .proxy(testHelper.TEST_PROXY)
        .query({Strict: true})
        .expect(200);
      assert(res.body.Contents);
      assert.equal(res.body.Type, "Manifest", "The manifest should have been parsed as type 'Manifest'")
		});
		it("testMissingPropertyName", async () => {
			let res = await testHelper.withWorkspace(request, testHelper.WORKSPACE_PATH, testHelper.WORKSPACE_ID);
      res = await request()
        .get(path.join(res.body.ContentLocation, "cftests", "missingPropertyName.yml"))
        .proxy(testHelper.TEST_PROXY)
        .expect(200)
        .query({parts: 'meta'});
      var fLoc = res.body.Location;
      res = await getTestFile(request, fLoc);
      res = await request()
        .get(path.join(PREFIX_MANIFESTS, res.body.Location))
        .proxy(testHelper.TEST_PROXY)
        .query({Strict: true})
        .expect(202);
      assert(res.body.Location);
      assert(res.body.Location.startsWith(TASK_PREFIX));
		});
		it("testMissingPropertyValue", async () => {
			let res = await testHelper.withWorkspace(request, testHelper.WORKSPACE_PATH, testHelper.WORKSPACE_ID);
      res = await request()
        .get(path.join(res.body.ContentLocation, "cftests", "missingPropertyValue.yml"))
        .proxy(testHelper.TEST_PROXY)
        .expect(200)
        .query({parts: 'meta'});
      var fLoc = res.body.Location;
      res = await getTestFile(request, fLoc);
      res = await request()
        .get(path.join(PREFIX_MANIFESTS, res.body.Location))
        .proxy(testHelper.TEST_PROXY)
        .query({Strict: true})
        .expect(202);
      assert(res.body.Location);
      assert(res.body.Location.startsWith(TASK_PREFIX));
		});
		it("testBadPropertyShape", async () => {
			let res = await testHelper.withWorkspace(request, testHelper.WORKSPACE_PATH, testHelper.WORKSPACE_ID);
      res = await request()
        .get(path.join(res.body.ContentLocation, "cftests", "badPropertyShape.yml"))
        .proxy(testHelper.TEST_PROXY)
        .expect(200)
        .query({parts: 'meta'});
      var fLoc = res.body.Location;
      res = await getTestFile(request, fLoc);
      res = await request()
        .get(path.join(PREFIX_MANIFESTS, res.body.Location))
        .proxy(testHelper.TEST_PROXY)
        .query({Strict: true})
        .expect(202);
      assert(res.body.Location);
      assert(res.body.Location.startsWith(TASK_PREFIX));
		});
		it("testBadIndent", async () => {
			let res = await testHelper.withWorkspace(request, testHelper.WORKSPACE_PATH, testHelper.WORKSPACE_ID);
      res = await request()
        .get(path.join(res.body.ContentLocation, "cftests", "badIndent.yml"))
        .proxy(testHelper.TEST_PROXY)
        .expect(200)
        .query({parts: 'meta'});
      var fLoc = res.body.Location;
      res = await getTestFile(request, fLoc);
      res = await request()
        .get(path.join(PREFIX_MANIFESTS, res.body.Location))
        .proxy(testHelper.TEST_PROXY)
        .query({Strict: true})
        .expect(202);
      assert(res.body.Location);
      assert(res.body.Location.startsWith(TASK_PREFIX));
		});
		/**
		 * Even though this is asking the endpoint for a file that does not exist (using the /file endpoint)
		 * we get back 200, due to the fact that we generate a default manifest for the user if there isn't one.
		 */
		it("testNonExistentFile", async () => {
			let res = await testHelper.withWorkspace(request, testHelper.WORKSPACE_PATH, testHelper.WORKSPACE_ID);
      res = await request()
        .get(path.join(res.body.ContentLocation, "cftests", "foo.yml"))
        .proxy(testHelper.TEST_PROXY)
        .expect(404)
        .query({parts: 'meta'});
      res = await request()
        .get(path.join(PREFIX_MANIFESTS, '/cftests/foo.yml')) // no /file endpoint, 403 is returned
        .proxy(testHelper.TEST_PROXY)
        .query({Strict: true})
        .expect(403);
		});
		it("testNonExistentFileWithFileRoute", async () => {
			let res = await testHelper.withWorkspace(request, testHelper.WORKSPACE_PATH, testHelper.WORKSPACE_ID);
      var wCL = res.body.ContentLocation;
      res = await request()
        .get(path.join(wCL, "cftests", "foo.yml"))
        .proxy(testHelper.TEST_PROXY)
        .expect(404)
        .query({parts: 'meta'});
      res = await request()
        .get(path.join(PREFIX_MANIFESTS, wCL, 'cftests', 'foo.yml'))
        .proxy(testHelper.TEST_PROXY)
        .query({Strict: true})
        .expect(404);
		});
		it("testNonExistentFileWithFileRouteNonStrict", async () => {
			let res = await testHelper.withWorkspace(request, testHelper.WORKSPACE_PATH, testHelper.WORKSPACE_ID);
			var wCL = res.body.ContentLocation;
      res = await request()
        .get(path.join(wCL, "cftests", "foo.yml"))
        .proxy(testHelper.TEST_PROXY)
        .expect(404)
        .query({parts: 'meta'});
      res = await request()
        .get(path.join(PREFIX_MANIFESTS, wCL, 'cftests', 'foo.yml'))
        .proxy(testHelper.TEST_PROXY)
        //.query({Strict: true}) non-strict should look for a manifest.yml in the directory
        .expect(200);
		});
		it("testEmptyFilePath", async () => {
			let res = await testHelper.withWorkspace(request, testHelper.WORKSPACE_PATH, testHelper.WORKSPACE_ID);
      res = await request()
        .get(path.join(res.body.ContentLocation, "cftests", "foo.yml"))
        .proxy(testHelper.TEST_PROXY)
        .expect(404)
        .query({parts: 'meta'});
      res = await request()
        .get(path.join(PREFIX_MANIFESTS, ''))
        .proxy(testHelper.TEST_PROXY)
        .query({Strict: true})
        .expect(403);
		});
		it("testUndefinedFilePath", async () => {
			let res = await testHelper.withWorkspace(request, testHelper.WORKSPACE_PATH, testHelper.WORKSPACE_ID);
      res = await request()
        .get(path.join(res.body.ContentLocation, "cftests", "foo.yml"))
        .proxy(testHelper.TEST_PROXY)
        .expect(404)
        .query({parts: 'meta'});
      res = await request()
        .get(PREFIX_MANIFESTS)
        .proxy(testHelper.TEST_PROXY)
        .query({Strict: true})
        .expect(403);
		});
		/**
		 * TODO - this relies on the ManifestTransformator in Java, which we don't have in node
		 */
		it.skip("testManifestGlobalProperties");
	});
	/**
	 * TODO
	 */
	describe("Manifest utils tests", function() {
		it("testSingleInheritancePropagation");
		it("testSingleRelativeInheritance");
		it("testFlatSingleRelativeInheritance");
		it("testInnerSingleRelativeInheritance");
		it("testSingleInheritanceOutsideSandbox");
		it("testFlatComplexInheritance");
		it("testInheritanceCycle");
		it("testComplexInheritance");
		it("testEnvInheritance");
	});
});
