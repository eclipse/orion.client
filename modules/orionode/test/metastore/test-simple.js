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
	    path = require('path'),
	    testData = require('../support/test_data'),
	    testHelper = require('../support/testHelper');

var CONTEXT_PATH = testHelper.CONTEXT_PATH,
	WORKSPACE = testHelper.WORKSPACE,
	METADATA =  testHelper.METADATA,
	WORKSPACE_ID = testHelper.WORKSPACE_ID,
	PREFIX = CONTEXT_PATH + '/workspace';

var request = testData.setupOrionServer();

describe("Orion metastore", function() {
	beforeEach("Create the default workspace and create metadata", function(done) { // testData.setUp.bind(null, parentDir)
		testData.setUp(WORKSPACE, function(){
			testData.setUpWorkspace(request, done);
		}, false);
	});
	afterEach("Remove .test_workspace", function(done) {
		testData.tearDown(testHelper.WORKSPACE, function(){
			testData.tearDown(path.join(METADATA, '.orion'), function(){
				testData.tearDown(METADATA, done)
			})
		});
	});
	
	it.skip("testArchiveEmptyOrganizationalFolder");
	it.skip("testArchiveInvalidMetaDataFileInOrganizationalFolder");
	it.skip("testArchiveInvalidMetaDataFileInServerWorkspaceRoot");
	it.skip("testArchiveInvalidMetaDataFolderInOrganizationalFolder");
	it.skip("testArchiveInvalidMetaDataFileInServerWorkspaceRoot");
	it.skip("testArchiveInvalidMetaDataFolderInOrganizationalFolder");
	it.skip("testArchiveInvalidMetaDataFolderInServerWorkspaceRoot");
	it.skip("testCreateProjectNamed - anonymous-OrionContent", function(done) {
		testHelper.withWorkspace(request, PREFIX, WORKSPACE_ID)
			.end(function(err, res) {
				testHelper.throwIfError(err);
				assert(res.body, "There must be a workspace");
				request()
          .post(res.body.Location)
          .proxy(testHelper.TEST_PROXY)
					.set('Slug', WORKSPACE_ID)
					.expect(400)
					.end(done);
			});
	});
	it("testCreateProjectNamed - OrionContent", function(done) {
		testHelper.withWorkspace(request, PREFIX, WORKSPACE_ID)
			.end(function(err, res) {
				testHelper.throwIfError(err);
				assert(res.body, "There must be a workspace");
				request()
          .post(res.body.Location)
          .proxy(testHelper.TEST_PROXY)
					.set('Slug', 'OrionContent')
					.expect(201)
					.end(done);
			});
	});
	it("testCreateProjectNamed - user", function(done) {
		testHelper.withWorkspace(request, PREFIX, WORKSPACE_ID)
			.end(function(err, res) {
				testHelper.throwIfError(err);
				assert(res.body, "There must be a workspace");
				request()
          .post(res.body.Location)
          .proxy(testHelper.TEST_PROXY)
					.set('Slug', 'user')
					.expect(400)
					.end(done);
			});
	});
	it("testCreateProjectNamed - Orion Content", function(done) {
		testHelper.withWorkspace(request, PREFIX, WORKSPACE_ID)
			.end(function(err, res) {
				testHelper.throwIfError(err);
				assert(res.body, "There must be a workspace");
				request()
          .post(res.body.Location)
          .proxy(testHelper.TEST_PROXY)
					.set('Slug', 'Orion Content')
					.expect(201)
					.end(done);
			});
	});
	it("testCreateProjectUsingFileAPI", function(done) {
		testHelper.withWorkspace(request, PREFIX, WORKSPACE_ID)
			.end(function(err, res) {
				testHelper.throwIfError(err);
				assert(res.body, "There must be a workspace");
				request()
          .post(res.body.Location)
          .proxy(testHelper.TEST_PROXY)
					.set('Slug', 'testCreateProjectUsingFileAPI')
					.expect(201)
					.end(done);
			});
	});
	it("testCreateProjectWithAnInvalidWorkspaceId", function(done) {
		testHelper.withWorkspace(request, PREFIX, WORKSPACE_ID)
			.end(function(err, res) {
				testHelper.throwIfError(err);
				assert(res.body, "There must be a workspace");
				request()
          .post(PREFIX + '/77')
          .proxy(testHelper.TEST_PROXY)
					.set('Slug', 'testCreateProjectWithAnInvalidWorkspaceId')
					.expect(403)
					.end(done);
			});
	});
	it("testCreateProjectWithBarInName", function(done) {
		testHelper.withWorkspace(request, PREFIX, WORKSPACE_ID)
			.end(function(err, res) {
				testHelper.throwIfError(err);
				assert(res.body, "There must be a workspace");
				request()
          .post(res.body.Location)
          .proxy(testHelper.TEST_PROXY)
					.set('Slug', 'testCreateProjectWith|InName')
					.expect(201)
					.end(done);
			});
	});
	it("testCreateProjectWithDuplicateProjectName", function(done) {
		testHelper.withWorkspace(request, PREFIX, WORKSPACE_ID)
			.end(function(err, res) {
				testHelper.throwIfError(err);
				assert(res.body, "There must be a workspace");
				var ws = res.body.Location;
				request()
          .post(ws)
          .proxy(testHelper.TEST_PROXY)
					.set('Slug', 'testCreateProjectWithDuplicateProjectName')
					.expect(201)
					.end(function(err, res) {
						testHelper.throwIfError(err);
						request()
              .post(ws)
              .proxy(testHelper.TEST_PROXY)
							.set('Slug', 'testCreateProjectWithDuplicateProjectName')
							.expect(200)
							.end(done);
					});
			});
	});
	it("testCreateProjectWithEmojiChactersInName", function(done) {
		var emoji = encodeURIComponent("Project \ud83d\ude0a\ud83d\udc31\ud83d\udc35");
		testHelper.withWorkspace(request, PREFIX, WORKSPACE_ID)
			.end(function(err, res) {
				testHelper.throwIfError(err);
				assert(res.body, "There must be a workspace");
				request()
          .post(res.body.Location)
          .proxy(testHelper.TEST_PROXY)
					.set("Content-Type","text/html; charset=UTF-8")
					.set('Slug', emoji)
					.expect(201)
					.end(done);
			});
	});
	it.skip("testCreateProjectWithNoWorkspaceId", function(done) {
		// Skip because there's no way to test create Project without workspace ID throught Server Rest APIs(Java eqivalent test is call method directely)
		request()
      .post(PREFIX)
      .proxy(testHelper.TEST_PROXY)
			.set('Slug', 'testCreateProjectWithNoWorkspaceId')
			.expect(400)
			.end(done);
	});
	it("testCreateProjectWithURLAsName", function(done) {
		testHelper.withWorkspace(request, PREFIX, WORKSPACE_ID)
			.end(function(err, res) {
				testHelper.throwIfError(err);
				assert(res.body, "There must be a workspace");
				request()
          .post(res.body.Location)
          .proxy(testHelper.TEST_PROXY)
					.set('Slug', 'http://orion.eclipse.org/')
					.expect(400)
					.end(done);
			});
	});
	it("testCreateSecondWorkspace", function(done) {
		request()
      .post(PREFIX)
      .proxy(testHelper.TEST_PROXY)
			.type('json')
			.send({Name: 'Orion sandbox'})
			.set('Slug', 'Orion sandbox')
			.expect(201)
			.end(function(err, res) {
				testHelper.throwIfError(err);
				testHelper.withWorkspace(request, PREFIX, res.body.Name)
					.end(done);
			});
	});
	it("testCreateTwoWorkspacesWithSameName", function(done) {
		testHelper.withWorkspace(request, PREFIX, WORKSPACE_ID)
			.end(function(err, res) {
				testHelper.throwIfError(err);
				request()
          .post(PREFIX)
          .proxy(testHelper.TEST_PROXY)
					.set('Slug', 'Orion ws')
					.expect(201)
					.end(function(err, res) {
						testHelper.throwIfError(err);
						request()
              .post(PREFIX)
              .proxy(testHelper.TEST_PROXY)
							.set('Slug', 'Orion ws')
							.expect(201)
							.end(done);
					});
			});
	});
	it.skip("testCreateWorkspaceWithAnInvalidUserId");
	it.skip("testCreateWorkspaceWithNoUserId");
	it("testCreateWorkspaceWithNoWorkspaceName", function(done) {
		request()
      .post(PREFIX)
      .proxy(testHelper.TEST_PROXY)
			//.set('Slug', 'Orion workspace test')
			.expect(400)
			.end(done);
	});
	it("testDeleteSimpleProject", function(done) {
		testHelper.withWorkspace(request, PREFIX, WORKSPACE_ID)
			.end(function(err, res) {
				testHelper.throwIfError(err);
				request()
          .post(res.body.Location)
          .proxy(testHelper.TEST_PROXY)
					.type('json')
					.send({Name: 'testDeleteSimpleProject'})
					.expect(201)
					.end(function(err, res) {
						testHelper.throwIfError(err);
						var pLoc = res.body.Location;
						request()
              .delete(pLoc)
              .proxy(testHelper.TEST_PROXY)
							.expect(204)
							.end(function(err, res) {
								testHelper.throwIfError(err);
								request()
                  .get(pLoc)
                  .proxy(testHelper.TEST_PROXY)
									.expect(404)
									.end(done);
							});
					});
			});
	});
	it("testDeleteSimpleWorkspace", function(done) {
		request()
      .post(PREFIX)
      .proxy(testHelper.TEST_PROXY)
			.set('Slug', 'Orion sandbox')
			.expect(201)
			.end(function(err, res) {
				testHelper.throwIfError(err);
				testHelper.withWorkspace(request, PREFIX, res.body.Id)
					.end(function(err, res) {
						testHelper.throwIfError(err);
						var wLoc = res.body.Location;
						request()
              .delete(wLoc)
              .proxy(testHelper.TEST_PROXY)
							.expect(204)
							.end(function(err, res) {
								testHelper.throwIfError(err);
								request()
                  .get(wLoc)
                  .proxy(testHelper.TEST_PROXY)
									.expect(403)
									.end(done);
							});
					});
			});
	});
	it("testGetWorkspaces", function(done) {
		request()
      .get(PREFIX)
      .proxy(testHelper.TEST_PROXY)
			.expect(200)
			.end(function(err, res) {
				testHelper.throwIfError(err);
				assert(Array.isArray(res.body.Workspaces), "There must be a Workspaces array");
				done();
			});
	});
	it("testMoveProjectWithBarInProjectName", function(done) {
		testHelper.withWorkspace(request, PREFIX, WORKSPACE_ID)
			.end(function(err, res) {
				testHelper.throwIfError(err);
				var ws = res.body.Location;
				request()
          .post(ws)
          .proxy(testHelper.TEST_PROXY)
					.type('json')
					.send({Name: 'testMoveProjectWith|InProjectName'})
					.expect(201)
					.end(function(err, res) {
						testHelper.throwIfError(err);
						var pLoc = res.body.Location;
						request()
              .post(ws)
              .proxy(testHelper.TEST_PROXY)
							.type('json')
							.set('X-Create-Options', "move")
							.set('Slug', 'testMoveProjectWith|InProjectNameMOVED')
							.send({Location: pLoc})
							.expect(201)
							.end(function(err, res) {
								testHelper.throwIfError(err);
								request()
                  .get(res.body.Location)
                  .proxy(testHelper.TEST_PROXY)
									.expect(200)
									.end(done);
							});
					});
			});
	});
	it("testMoveSimpleProject", function(done) {
		testHelper.withWorkspace(request, PREFIX, WORKSPACE_ID)
			.end(function(err, res) {
				testHelper.throwIfError(err);
				var ws = res.body.Location;
				request()
          .post(ws)
          .proxy(testHelper.TEST_PROXY)
					.type('json')
					.send({Name: 'testMoveSimpleProject'})
					.expect(201)
					.end(function(err, res) {
						testHelper.throwIfError(err);
						var pLoc = res.body.Location;
						request()
              .post(ws)
              .proxy(testHelper.TEST_PROXY)
							.type('json')
							.set('X-Create-Options', "move")
							.set('Slug', 'testMoveSimpleProjectMOVED')
							.send({Location: pLoc})
							.expect(201)
							.end(function(err, res) {
								request()
                  .get(res.body.Location)
                  .proxy(testHelper.TEST_PROXY)
									.expect(200)
									.end(done);
							});
					});
			});
	});
	it.skip("testMoveProjectLinked");
	it.skip("testReadCorruptedProjectJson");
	it.skip("testReadCorruptedUserJson");
	it.skip("testReadCorruptedWorkspaceJson");
	it("testReadProject", function(done) {
		testHelper.withWorkspace(request, PREFIX, WORKSPACE_ID)
			.end(function(err, res) {
				testHelper.throwIfError(err);
				request()
          .post(res.body.Location)
          .proxy(testHelper.TEST_PROXY)
					.type('json')
					.send({Name: 'testReadProject', Directory: true})
					.expect(201)
					.end(function(err, res) {
						testHelper.throwIfError(err);
						request()
              .get(res.body.Location)
              .proxy(testHelper.TEST_PROXY)
							.expect(200)
							.end(function(err, res) {
								assert(res.body && res.body.Name === 'testReadProject', "The new project was not found after creation")
								done();
							});
					});
			})
	});
	it("testReadProjectThatDoesNotExist", function(done) {
		testHelper.withWorkspace(request, PREFIX, WORKSPACE_ID)
			.end(function(err, res) {
				testHelper.throwIfError(err);
				request()
          .get(path.join(res.body.Location, '/projectThatDoesNotExist'))
          .proxy(testHelper.TEST_PROXY)
					.expect(404)
					.end(done);
			});
	});
	it("testReadProjectWithWorkspaceThatDoesNotExist", function(done) {
		testHelper.withWorkspace(request, PREFIX, WORKSPACE_ID)
			.end(function(err, res) {
				testHelper.throwIfError(err);
				request()
          .get(path.join(path.dirname(res.body.Location), '/77', '/someProject'))
          .proxy(testHelper.TEST_PROXY)
					.expect(403)
					.end(done);
			});
	});
	it("testReadWorkspace", function(done) {
		testHelper.withWorkspace(request, PREFIX, WORKSPACE_ID)
			.end(function(err, res) {
				testHelper.throwIfError(err);
				assert(res.body && res.body.Location, "There should be a body in the response with a Location");
				done();
			});
	});
	it("testReadWorkspaceThatDoesNotExist", function(done) {
		request()
      .get(PREFIX + '/wsThatDoesNotExist')
      .proxy(testHelper.TEST_PROXY)
			.expect(403)
			.end(done);
	});
	it.skip("testUpdateProject");
	it.skip("testUpdateWorkspace");
});
