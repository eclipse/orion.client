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
	TEST_WORKSPACE_NAME = '.test_workspace',
	PREFIX_FILE = CONTEXT_PATH + '/file',
	PREFIX = CONTEXT_PATH + '/workspace';

var request = testData.setupOrionServer();

function byName(a, b) {
	return String.prototype.localeCompare.call(a.Name, b.Name);
}

// Retrieves the 0th Workspace in the list and invoke the callback
function withDefaultWorkspace(callback) {
	request()
    .get(PREFIX + '/' + WORKSPACE_ID)
    .proxy(testHelper.TEST_PROXY)
		.end(function(err, res) {
			testHelper.throwIfError(err);
			callback(res.body);
		});
}

describe("Workspace endpoint", function() {
	beforeEach(function(done) { // testData.setUp.bind(null, parentDir)
		testData.setUp(WORKSPACE, function(){
			testData.setUpWorkspace(request, done);
		}, false);
	});
	afterEach("Remove .test_workspace", function(done) {
		testData.tearDown(WORKSPACE, function(){
			testData.tearDown(path.join(METADATA, '.orion'), function(){
				testData.tearDown(METADATA, done);
			})
		});
	});

	/**
	 * From: org.eclipse.orion.server.tests.servlets.workspace.WorkspaceServiceTests.java
	 */
	it("testCreateProject", function(done) {
		withDefaultWorkspace(function(ws) {
			request()
        .post(ws.Location)
        .proxy(testHelper.TEST_PROXY)
				.set('Slug', 'testCreateProject')
				.expect(201)
				.end(done);
		});
	});
	it.skip("testEncodedProjectContentLocation");
	it("testGetWorkspaceContentLocation", function(done){
		testHelper.withWorkspace(request, PREFIX, WORKSPACE_ID)
			.end(function(err,  res) {
				testHelper.throwIfError(err);
				assert(res.body, "There must be a response body");
				assert(typeof res.body.ContentLocation === 'string', "There must be a content location for the workspace");
				done();
			});
	});
	it.skip("testGetDefaultContentLocation");
	it("testMoveBadRequest", function(done) {
		withDefaultWorkspace(function(ws) {
			request()
        .post(ws.Location)
        .proxy(testHelper.TEST_PROXY)
				.set('Slug', 'testMoveBadRequest')
				.expect(201)
				.end(function(err, res) {
					testHelper.throwIfError(err);
					request()
            .post(ws.Location)
            .proxy(testHelper.TEST_PROXY)
						.type('json')
						.set('Slug', 'testMoveBadRequest23')
						.set('Orion-Version', 1)
						.set('X-Create-Options', "move")
						.send({Location: 'badSourceProject'})
						.expect(403)
						.end(done);
				});
		});
	});
	it("testMoveFolderToProject", function(done) {
		withDefaultWorkspace(function(ws) {
			request()
        .post(ws.Location)
        .proxy(testHelper.TEST_PROXY)
				.set('Slug', 'testMoveFolderToProjectSrc')
				.send({Location: 'testMoveFolderToProjectSrc', Directory: true})
				.expect(201)
				.end(function(err, res) {
					testHelper.throwIfError(err);
					testHelper.createDir(request, '/testMoveFolderToProjectSrc', 'testFolder')
						.end(function(err, res) {
							testHelper.throwIfError(err);
							var fLoc = res.body.Location;
							request()
                .post(ws.Location)
                .proxy(testHelper.TEST_PROXY)
								.type('json')
								.set('Slug', 'testMoveFolderToProjectDest')
								.set('Orion-Version', 1)
								.set('X-Create-Options', "move")
								.send({Location: fLoc})
								.expect(201)
								.end(function(err, res) {
									testHelper.throwIfError(err);
									done();
								});
						})
				});
		});
	});
	it("testRenameProject", function(done) {
		var oldProjectLocation = PREFIX_FILE + '/' + WORKSPACE_ID + '/project';
		withDefaultWorkspace(function(workspace) {
			request()
        .post(workspace.Location)
        .proxy(testHelper.TEST_PROXY)
					.set('X-Create-Options', 'move')
					.send({Location: oldProjectLocation, Name: 'project_renamed'})
					.expect(201)
					.end(function(e, res) {
						testHelper.throwIfError(e, "Failed to rename project at " + oldProjectLocation);
						assert.equal(res.body.Name, 'project_renamed');

						// GETting the new ContentLocation should return the project metadata
						request()
              .get(res.body.ContentLocation)
              .proxy(testHelper.TEST_PROXY)
							.expect(200)
							.end(function(err, res) {
								testHelper.throwIfError(err, "Failed to get ContentLocation");

								// and GETting the ChildrenLocation should return the children
								request()
                  .get(res.body.ChildrenLocation)
                  .proxy(testHelper.TEST_PROXY)
										.expect(200)
										.end(/* @callback */ function(err, res){
											assert.ok(Array.isArray(res.body.Children), "has children");
											var foundFizz = res.body.Children.some(function(child) {
												return child.Name === 'fizz.txt';
											});
											assert.ok(foundFizz, 'fizz.txt was found at the new ContentLocation');
											done();
										});
							});
					});
		});
	});
	it("testMoveProject", function(done) {
		withDefaultWorkspace(function(ws) {
			request()
        .post(ws.Location)
        .proxy(testHelper.TEST_PROXY)
				.set('Slug', 'testMoveProject')
				.expect(201)
				.end(function(err, res) {
					testHelper.throwIfError(err);
					var pLoc = res.body.Location;
					request()
            .post(ws.Location)
            .proxy(testHelper.TEST_PROXY)
						.type('json')
						.set('X-Create-Options', "move")
						.set('Slug', 'testMOVEDProject')
						.send({Location: pLoc})
						.expect(201)
						.end(function(err, res) {
							done();
						});
				});
		});
	});
	it("testMoveProjectToProject", function(done) {
		withDefaultWorkspace(function(ws) {
			request()
        .post(ws.Location)
        .proxy(testHelper.TEST_PROXY)
				.set('Slug', 'testMoveProjectToFolderSrc')
				.send({Location: 'testMoveProjectToFolderSrc', Directory: true})
				.expect(201)
				.end(function(err, res) {
					testHelper.throwIfError(err);
					var pLoc = res.body.Location;
					request()
            .post(ws.Location)
            .proxy(testHelper.TEST_PROXY)
						.set('Slug', 'someFolder')
						.send({Location: 'someFolder', Directory: true})
						.expect(201)
						.end(function(err, res) {
							testHelper.throwIfError(err);
							request()
                .post(ws.Location)
                .proxy(testHelper.TEST_PROXY)
								.type('json')
								.set('X-Create-Options', "move")
								.set('Slug', 'someFolder')
								.send({Location: pLoc})
								.expect(200)
								.end(done);
						});
				});
		});
	});
	it("testMoveProjectToFolder", function(done) {
		testHelper.withWorkspace(request, PREFIX, WORKSPACE_ID)
			.end(function(err, res) {
				testHelper.throwIfError(err);
				var wLoc = res.body.Location;
				request()
          .post(wLoc)
          .proxy(testHelper.TEST_PROXY)
					.set('Slug', 'testMoveProjectToFolderSrc') // create the project to move
					.send({Location: 'testMoveProjectToFolderSrc', Directory: true})
					.expect(201)
					.end(function(err, res) {
						testHelper.throwIfError(err);
						var pLoc = res.body.Location;
						request()
              .post(wLoc)
              .proxy(testHelper.TEST_PROXY)
							.set('Slug', 'someOtherProject') //create the other project to move to 
							.send({Location: 'someOtherProject', Directory: true})
							.expect(201)
							.end(function(err, res) {
								testHelper.throwIfError(err);
								var spLoc = res.body.Location;
								request()
                  .post(spLoc)
                  .proxy(testHelper.TEST_PROXY)
									.type('json')
									.send({Name: 'someSubFolder', Directory: true})
									.expect(201)
									.end(function(err, res) {
										testHelper.throwIfError(err);
										request()
                      .post(res.body.Location)
                      .proxy(testHelper.TEST_PROXY)
											.type('json')
											.set('X-Create-Options', "move")
											.set('Slug', 'someSubFolder')
											.send({Location: pLoc, Name: 'testMoveProjectToFolderSrc'})
											.expect(201)
											.end(done);
									});
							});
					});
		});
	});
	it.skip("testCopyProjectNonDefaultLocation");
	it.skip("testCopyFolderToProject", function(done) {
		withDefaultWorkspace(function(ws) {
			request()
        .post(ws.Location)
        .proxy(testHelper.TEST_PROXY)
				.set('Slug', 'testCopyFolderToProject')
				.expect(201)
				.end(function(err, res) {
					testHelper.throwIfError(err);
					testHelper.createDir(request, '/testCopyFolderToProject', 'testDir')
						.end(function(err, res) {
							testHelper.throwIfError(err);
							var fLoc = res.body.Location;
							request()
                .post(ws.Location)
                .proxy(testHelper.TEST_PROXY)
								.type('json')
								.set('Slug', 'destinationProject')
								.set('X-Create-Options', "copy")
								.set('Orion-Version', 1)
								.send({Location: fLoc})
								.expect(201)
								.end(function(err, res) {
									testHelper.throwIfError(err);
									done();
								});
						});
				});
		});
		done();
	});
	it("testCopyProject", function(done) {
		withDefaultWorkspace(function(ws) {
			request()
        .post(ws.Location)
        .proxy(testHelper.TEST_PROXY)
				.set('Slug', 'testCopyProject')
				.expect(201)
				.end(function(err, res) {
					testHelper.throwIfError(err);
					done();
					//TODO
				});
		});
	});
	it("testCreateProjectBadName - space", function(done) {
		withDefaultWorkspace(function(ws) {
			request()
        .post(ws.Location)
        .proxy(testHelper.TEST_PROXY)
				.set('Slug', ' ')
				.expect(400)
				.end(done);
		});
	});
	it("testCreateProjectBadName - empty string", function(done) {
		withDefaultWorkspace(function(ws) {
			request()
        .post(ws.Location)
        .proxy(testHelper.TEST_PROXY)
				.set('Slug', '')
				.expect(400)
				.end(done);
		});
	});
	it("testCreateProjectBadName - slash", function(done) {
		withDefaultWorkspace(function(ws) {
			request()
        .post(ws.Location)
        .proxy(testHelper.TEST_PROXY)
				.set('Orion-Version', 1)
				.set('Slug', '/')
				.expect(400)
				.end(done);
		});
	});
	it.skip("testCreateProjectNonDefaultLocation", function(done) {
		// Node server currently does not provide the ability to create folder outside default workspace.ss
		withDefaultWorkspace(function(ws) {
			request()
        .post(ws.Location)
        .proxy(testHelper.TEST_PROXY)
				.set('Slug', 'testCrseateProjectNonDefaultLocation')
				.send({"ContentLocation": METADATA})
				.expect(403)
				.end(done);
		});
	});
	it("testCreateWorkspace", async () => {
		// This test should only run against multiuser case, and assuming the user is not authenticated, 
		//otherwise used is allowed to create workspace
		let res = await request()
      .post(PREFIX)
      .proxy(testHelper.TEST_PROXY)
			.set('Slug', 'whatever')
			.expect(201);
	});
	it("testCreateWorkspaceNullName", async () => {
		let res = await request()
      .post(PREFIX)
      .proxy(testHelper.TEST_PROXY)
      .expect(400);
	});
	it("testGetWorkspaceMetadata", function(done) {
		withDefaultWorkspace(function(workspace) {
			request()
        .get(workspace.Location)
        .proxy(testHelper.TEST_PROXY)
				.expect(200)
				.end(function(e, res) {
					testHelper.throwIfError(e, "Failed to get metadata from " + workspace.Location);
					assert.ok(res.body.Id);
					assert.equal(res.body.Name, TEST_WORKSPACE_NAME);
					// Orionode doesn't have "projects" so don't check res.body.Projects
					assert.ok(Array.isArray(res.body.Children));
					res.body.Children.sort(byName);
					assert.equal(res.body.Children.length, 1);
					assert.equal(res.body.Children[0].Name, "project");
					assert.equal(res.body.Children[0].Directory, true);
					var childrenLoc = res.body.Children[0].ChildrenLocation;
					assert.ok(childrenLoc);
					// Ensure that GET ChildrenLocation returns the child File objects.. mini /file test
					request()
            .get(childrenLoc)
            .proxy(testHelper.TEST_PROXY)
						.expect(200)
						.end(function(err, res) {
							testHelper.throwIfError(err, "Failed to get ChildrenLocation: " + childrenLoc);
							assert.ok(Array.isArray(res.body.Children));
							res.body.Children.sort(byName);
							assert.equal(res.body.Children.length, 2);
							assert.equal(res.body.Children[0].Name, 'fizz.txt');
							assert.equal(res.body.Children[1].Name, 'my folder');
							done();
						});
				});
		});
	});
	it("testChangeWorkspaceMetadata", function(done) {
		withDefaultWorkspace(function(workspace) {
			request()
        .put(workspace.Location)
        .proxy(testHelper.TEST_PROXY)
				.send({ Name: 'fizz buzz' })
				.expect(403, done);
		});
	});
	it("testGetProjectMetadata", function(done) {
		withDefaultWorkspace(function(ws) {
			request()
        .post(ws.Location)
        .proxy(testHelper.TEST_PROXY)
				.set('Slug', 'testGetProjectMetadata')
				.send({Location: 'testGetProjectMetadata', Directory: true})
				.expect(201)
				.end(function(err, res) {
					testHelper.throwIfError(err);
					request()
            .get(res.body.Location)
            .proxy(testHelper.TEST_PROXY)
						.expect(200)
						.end(function(err, res) {
							testHelper.throwIfError(err);
							assert.equal('testGetProjectMetadata', res.body.Name, "The project name is not the same");
							done();
						})
				});
		});
	});
	it("testDeleteProject", function(done) {
		withDefaultWorkspace(function(ws) {
			request()
        .post(ws.Location)
        .proxy(testHelper.TEST_PROXY)
				.set('Slug', 'testDeleteProject')
				.expect(201)
				.end(function(err, res) {
					testHelper.throwIfError(err);
					var _loc = res.body.Location;
					request()
            .delete(_loc)
            .proxy(testHelper.TEST_PROXY)
						.expect(204)
						.end(function(err, res) {
							testHelper.throwIfError(err);
							//now try to fetch it, should 404
							request()
                .get(_loc)
                .proxy(testHelper.TEST_PROXY)
								.expect(404)
								.end(done);
						});
				});
		});
	});
	it("testDeleteWorkspace", function(done) {
		withDefaultWorkspace(function(workspace) {
			request()
        .del(workspace.Location)
        .proxy(testHelper.TEST_PROXY)
				.expect(204, function(){
					request()
          .get(PREFIX)
          .proxy(testHelper.TEST_PROXY)
					.expect(200)
					.end(function(e, res) {
						testHelper.throwIfError(e, "Failed to get workspace");
						assert.ok(Array.isArray(res.body.Workspaces));
						// In Orionode, we have just a single workspace.
						assert.equal(res.body.Workspaces.length, 0);
						done();
					});
				});
		});
	});
	it("testGetWorkspaces", async () => {
		let res = await request()
      .get(PREFIX)
      .proxy(testHelper.TEST_PROXY)
			.expect(200);
    assert.ok(Array.isArray(res.body.Workspaces));
    // In Orionode, we have just a single workspace.
    assert.equal(res.body.Workspaces.length, 1);
    assert.ok(res.body.Workspaces[0].Id);
    assert.ok(res.body.Workspaces[0].Location);
    assert.equal(res.body.Workspaces[0].Location, PREFIX + '/' + WORKSPACE_ID);
    assert.equal(res.body.Workspaces[0].Name, TEST_WORKSPACE_NAME);
	});
});
