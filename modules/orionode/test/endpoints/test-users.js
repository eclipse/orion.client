/*******************************************************************************
 * Copyright (c) 2017 IBM Corporation and others.
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

	
const CONTEXT_PATH = testHelper.CONTEXT_PATH,
	WORKSPACE = testHelper.WORKSPACE;
	
let request = testData.setupOrionServer();

/**
 * Helper function to make a user for testing
 * @param {supertest} request The testing request
 * @since 18.0
 * @returns {supertest} Returns the testable result
 */
function createUser(request, data) {
	return request()
      .post(CONTEXT_PATH + '/users')
      .proxy(testHelper.TEST_PROXY)
			.set('Authorization', 'Basic '+btoa('admin:admin', "UTF8")) //simple test auth, just use btoa
			.send({UserName: data.username, FullName: data.fullname, Password: data.password, Email: data.email})
			.expect(200);
};

/**
 * These test are all skipped until we have proper authentication support
 */
describe("Users endpoint", function() {
	describe("Single user mode", function() {
		beforeEach(function(done) { // testData.setUp.bind(null, parentDir)
			testData.setUp(WORKSPACE, function() {
				testData.setUpWorkspace(request, done);
			});
		});
		afterEach("Remove .test_workspace", function(done) {
			testData.tearDown(testHelper.WORKSPACE, function(){
				testData.tearDown(path.join(testHelper.METADATA, '.orion'), function(){
					testData.tearDown(testHelper.METADATA, done)
				})
			});
		});
		it("testGetUsersList", function(done) {
			request()
        .get(CONTEXT_PATH + '/users')
        .proxy(testHelper.TEST_PROXY)
				.set('Orion-Version', 1)
				.expect(403, done);
		});
		it("testGetUser - anonymous", function(done) {
			request()
        .get(CONTEXT_PATH + '/users/anonymous')
        .proxy(testHelper.TEST_PROXY)
				.set('Orion-Version', 1)
				.expect(200)
				.end(function(err, res) {
					testHelper.throwIfError(err);
					assert(res, "There should have been a user record returned for 'anonymous' in single user mode");
					done();
				});
		});
		it("testGetUser - anonymous, trailing slash", function(done) {
			request()
        .get(CONTEXT_PATH + '/users/anonymous/')
        .proxy(testHelper.TEST_PROXY)
				.set('Orion-Version', 1)
				.expect(403, done);
		});
		it("testGetUser - non existent user", function(done) {
			request()
        .get(CONTEXT_PATH + '/users/nope')
        .proxy(testHelper.TEST_PROXY)
				.set('Orion-Version', 1)
				.expect(403, done);
		});
		it("testGetUser - non existent user, trailing slash", function(done) {
			request()
        .get(CONTEXT_PATH + '/users/nope/')
        .proxy(testHelper.TEST_PROXY)
				.set('Orion-Version', 1)
				.expect(403, done);
		});
		it("testGetUser - root", function(done) {
			request()
        .get(CONTEXT_PATH + '/users')
        .proxy(testHelper.TEST_PROXY)
				.set('Orion-Version', 1)
				.expect(403, done);
		});
		it("testGetUser - root, trailing slash", function(done) {
			request()
        .get(CONTEXT_PATH + '/users/')
        .proxy(testHelper.TEST_PROXY)
				.set('Orion-Version', 1)
				.expect(403, done);
		});
		it("testPutUser - anonymous", function(done) {
			request()
        .put(CONTEXT_PATH + '/users/anonymous')
        .proxy(testHelper.TEST_PROXY)
				.set('Orion-Version', 1)
				.send({Password: "newpw", FullName: "anonEmouse", Email: "anonEmouse@anon.ca"})
				.expect(200)
				.end(function(err, res) {
					testHelper.throwIfError(err);
					assert(res, "There should have been a user record returned for 'anonymous' after update");
					done();
				});
		});
		it("testPutUser - non existent user", function(done) {
			request()
        .put(CONTEXT_PATH + '/users/nope')
        .proxy(testHelper.TEST_PROXY)
				.set('Orion-Version', 1)
				.send({Password: "newpw", FullName: "anonEmouse", Email: "anonEmouse@anon.ca"})
				.expect(403, done);
		});
		it("testPutUser - non existent user, trailing slash", function(done) {
			request()
        .put(CONTEXT_PATH + '/users/nope/')
        .proxy(testHelper.TEST_PROXY)
				.set('Orion-Version', 1)
				.send({Password: "newpw", FullName: "anonEmouse", Email: "anonEmouse@anon.ca"})
				.expect(403, done);
		});
		it("testPutUser - root", function(done) {
			request()
        .put(CONTEXT_PATH + '/users')
        .proxy(testHelper.TEST_PROXY)
				.set('Orion-Version', 1)
				.send({Password: "newpw", FullName: "anonEmouse", Email: "anonEmouse@anon.ca"})
				.expect(404, done);
		});
		it("testPutUser - root, trailing slash", function(done) {
			request()
        .put(CONTEXT_PATH + '/users/')
        .proxy(testHelper.TEST_PROXY)
				.set('Orion-Version', 1)
				.send({Password: "newpw", FullName: "anonEmouse", Email: "anonEmouse@anon.ca"})
				.expect(404, done);
		});
		it("testPostUser - anonymous", function(done) {
			request()
        .post(CONTEXT_PATH + '/users/anonymous')
        .proxy(testHelper.TEST_PROXY)
				.set('Orion-Version', 1)
				.send({Password: "pw"})
				.expect(200)
				.end(function(err, res) {
					testHelper.throwIfError(err);
					assert(res, "There should have been a user record returned for 'anonymous' after update");
					done();
				});
		});
		it("testPostUser - anonymous, trailing slash", function(done) {
			request()
        .post(CONTEXT_PATH + '/users/anonymous/')
        .proxy(testHelper.TEST_PROXY)
				.set('Orion-Version', 1)
				.send({Password: "pw"})
				.expect(403, done);
		});
		it("testPostUser - non existent", function(done) {
			request()
        .post(CONTEXT_PATH + '/users/nope')
        .proxy(testHelper.TEST_PROXY)
				.set('Orion-Version', 1)
				.send({Password: "pw"})
				.expect(403, done);
		});
		it("testPostUser - non existent, trailing slash", function(done) {
			request()
        .post(CONTEXT_PATH + '/users/nope/')
        .proxy(testHelper.TEST_PROXY)
				.set('Orion-Version', 1)
				.send({Password: "pw"})
				.expect(403, done);
		});
		it("testPostUsers", function(done) {
			request()
        .post(CONTEXT_PATH + '/users')
        .proxy(testHelper.TEST_PROXY)
				.set('Orion-Version', 1)
				.send({Password: "pw", FullName: "user1", Email: "user1@email.ca", UserName: "user1"})
				.expect(400, done);
		});
		it("testPostUsers - trailing slash", function(done) {
			request()
        .post(CONTEXT_PATH + '/users/')
        .proxy(testHelper.TEST_PROXY)
				.set('Orion-Version', 1)
				.send({Password: "pw", FullName: "user1", Email: "user1@email.ca", UserName: "user1"})
				.expect(400, done);
		});
		it("testDeleteUser - anonymous", function(done) {
			request()
        .delete(CONTEXT_PATH + '/users/anonymous')
        .proxy(testHelper.TEST_PROXY)
				.set('Orion-Version', 1)
				.expect(400, done);
		});
		it("testDeleteUser - anonymous, trailing slash", function(done) {
			request()
        .delete(CONTEXT_PATH + '/users/anonymous/')
        .proxy(testHelper.TEST_PROXY)
				.set('Orion-Version', 1)
				.expect(403, done);
		});
		it("testDeleteUser - non existent user", function(done) {
			request()
        .delete(CONTEXT_PATH + '/users/nope')
        .proxy(testHelper.TEST_PROXY)
				.set('Orion-Version', 1)
				.expect(403, done);
		});
		it("testDeleteUser - non existent user, trailing slash", function(done) {
			request()
        .delete(CONTEXT_PATH + '/users/nope/')
        .proxy(testHelper.TEST_PROXY)
				.set('Orion-Version', 1)
				.expect(403, done);
		});
		it("testDeleteUser - sent to root", function(done) {
			request()
        .delete(CONTEXT_PATH + '/users')
        .proxy(testHelper.TEST_PROXY)
				.set('Orion-Version', 1)
				.expect(404, done);
		});
		it("testDeleteUser - sent to root trailing slash", function(done) {
			request()
        .delete(CONTEXT_PATH + '/users/')
        .proxy(testHelper.TEST_PROXY)
				.set('Orion-Version', 1)
				.expect(404, done);
		});
		
	});
	describe.skip("Login", function() {
		before("Start server in multi-tenant mode", function() {
			request = testData.setupOrionServer({
				"orion.single.user": false,
				"orion.auth.user.creation": "admin"
			});
		});
		after("Reset to default server state", function() {
			request = testData.setupOrionServer({});
		});
		it("logout");
		it("login");
		it("login / form");
		it("login / canaddusers");
	});
	describe.skip("Email confirmation", function() {
		before("Start server in multi-tenant mode", function() {
			request = testData.setupOrionServer({
				"orion.single.user": false,
				"orion.auth.user.creation": "admin"
			});
		});
		after("Reset to default server state", function() {
			request = testData.setupOrionServer({});
		});
		it("useremailconfirmation");
		it("useremailconfirmation / cansendemails");
		it("useremailconfirmation / resetPwd");
		it("useremailconfirmation / verifyEmail");
	});
	describe("Multi-tenant mode - ADMIN", function() {
		before("Start server in multi-tenant mode", function() {
			request = testData.setupOrionServer({
				"orion.single.user": false,
				"orion.auth.user.creation": "admin"
			});
		});
		after("Reset to default server state", function(done) {
			request = testData.setupOrionServer({});
			testData.tearDown(testHelper.WORKSPACE, function() {
				done();
			});
		});
		it("testGetUsers", function(done) {
			request()
        .get(CONTEXT_PATH + '/users')
        .proxy(testHelper.TEST_PROXY)
				.set('Orion-Version', 1)
				.set('Authorization', 'Basic '+ testHelper.btoa('admin:admin'))
				.expect(200)
				.end(function(err, res) {
					testHelper.throwIfError(err);
					assert(res, "There must be a response");
					assert(res.body, "There must be a response body");
					assert(Array.isArray(res.body.Users), "There must be a users array");
					done();
				});
		});
		it("testGetUsers - trailing slash", function(done) {
			request()
        .get(CONTEXT_PATH + '/users/')
        .proxy(testHelper.TEST_PROXY)
				.set('Orion-Version', 1)
				.set('Authorization', 'Basic '+ testHelper.btoa('admin:admin'))
				.expect(200)
				.end(function(err, res) {
					testHelper.throwIfError(err);
					assert(res, "There must be a response");
					assert(res.body, "There must be a response body");
					assert(Array.isArray(res.body.Users), "There must be a users array");
					done();
				});
		});
		it("testGetUser - non-existent", function(done) {
			request()
        .get(CONTEXT_PATH + '/users/nouser')
        .proxy(testHelper.TEST_PROXY)
				.set('Orion-Version', 1)
				.expect(400, done);
		});
		it("testGetUser - non-existent, trailing slash", function(done) {
			request()
        .get(CONTEXT_PATH + '/users/nouser/')
        .proxy(testHelper.TEST_PROXY)
				.set('Orion-Version', 1)
				.expect(400, done);
		});
		it("testPutUser - non existent user", function(done) {
			request()
        .put(CONTEXT_PATH + '/users/nouser')
        .proxy(testHelper.TEST_PROXY)
				.set('Orion-Version', 1)
				.send({Password: "newpw", FullName: "no", Email: "no@anon.ca"})
				.expect(400, done);
		});
		it("testPutUser - non existent user, trailing slash", function(done) {
			request()
        .put(CONTEXT_PATH + '/users/nouser/')
        .proxy(testHelper.TEST_PROXY)
				.set('Orion-Version', 1)
				.send({Password: "newpw", FullName: "anonEmouse", Email: "anonEmouse@anon.ca"})
				.expect(400, done);
		});
		it("testPutUser - root", function(done) {
			request()
        .put(CONTEXT_PATH + '/users')
        .proxy(testHelper.TEST_PROXY)
				.set('Orion-Version', 1)
				.send({Password: "newpw", FullName: "anonEmouse", Email: "anonEmouse@anon.ca"})
				.expect(404, done);
		});
		it("testPutUser - root, trailing slash", function(done) {
			request()
        .put(CONTEXT_PATH + '/users/')
        .proxy(testHelper.TEST_PROXY)
				.set('Orion-Version', 1)
				.send({Password: "newpw", FullName: "anonEmouse", Email: "anonEmouse@anon.ca"})
				.expect(404, done);
		});
		it("testPostUser - non existent", function(done) {
			request()
        .post(CONTEXT_PATH + '/users/nouser')
        .proxy(testHelper.TEST_PROXY)
				.set('Orion-Version', 1)
				.send({Password: "pw"})
				.expect(400, done);
		});
		it("testPostUser - non existent, trailing slash", function(done) {
			request()
        .post(CONTEXT_PATH + '/users/nouser/')
        .proxy(testHelper.TEST_PROXY)
				.set('Orion-Version', 1)
				.send({Password: "pw"})
				.expect(400, done);
		});
		it("testPostUsers", function(done) {
			request()
        .post(CONTEXT_PATH + '/users')
        .proxy(testHelper.TEST_PROXY)
				.set('Orion-Version', 1)
				.send({Password: "pw", FullName: "user12", Email: "user12@email.ca", UserName: "user12"})
				.expect(201, done);
		});
		it("testPostUsers - trailing slash", function(done) {
			request()
        .post(CONTEXT_PATH + '/users/')
        .proxy(testHelper.TEST_PROXY)
				.set('Orion-Version', 1)
				.send({Password: "pw", FullName: "user13", Email: "user13@email.ca", UserName: "user13"})
				.expect(201, done);
		});
		it("testDeleteUser - non existent user", function(done) {
			request()
        .delete(CONTEXT_PATH + '/users/nope')
        .proxy(testHelper.TEST_PROXY)
				.set('Orion-Version', 1)
				.expect(400, done);
		});
		it("testDeleteUser - non existent user, trailing slash", function(done) {
			request()
        .delete(CONTEXT_PATH + '/users/nope/')
        .proxy(testHelper.TEST_PROXY)
				.set('Orion-Version', 1)
				.expect(400, done);
		});
		it("testDeleteUser - sent to root", function(done) {
			request()
        .delete(CONTEXT_PATH + '/users')
        .proxy(testHelper.TEST_PROXY)
				.set('Orion-Version', 1)
				.expect(404, done);
		});
		it("testDeleteUser - sent to root trailing slash", function(done) {
			request()
        .delete(CONTEXT_PATH + '/users/')
        .proxy(testHelper.TEST_PROXY)
				.set('Orion-Version', 1)
				.expect(404, done);
		});
		it("testCreateDeleteUser - ADMIN", function(done) {
			var json = {UserName: "u12", Email: 'u12@bar.org', FullName: "u12 Bar", Password: "1234"};
			request()
        .post(CONTEXT_PATH + '/users')
        .proxy(testHelper.TEST_PROXY)
				.send(json)
				.expect(201)
				.end(function(err, res) {
					testHelper.throwIfError(err);
					request()
						.delete(CONTEXT_PATH + '/users/u12')
						.expect(200, done) //TODO what to do in single user mode?
				});
		});
	});
	/**
	 * All of these tests will return 4XX status codes when trying to create users because the property 
	 * orion.auth.user.creation is not set
	 */
	describe("Multi-tenant mode - NO ADMIN", function() {
		before("Start server in multi-tenant mode", function() {
			request = testData.setupOrionServer({
				"orion.single.user": false
			});
		});
		after("Reset to default server state", function(done) {
			request = testData.setupOrionServer({});
			testData.tearDown(testHelper.WORKSPACE, function() {
				done();
			});
		});
		it("testGetUsers", function(done) {
			request()
        .get(CONTEXT_PATH + '/users')
        .proxy(testHelper.TEST_PROXY)
				.set('Orion-Version', 1)
				.expect(403, done);
		});
		it("testGetUsers - trailing slash", function(done) {
			request()
        .get(CONTEXT_PATH + '/users/')
        .proxy(testHelper.TEST_PROXY)
				.set('Orion-Version', 1)
				.expect(403, done);
		});
		it("testGetUser - non-existent", function(done) {
			request()
        .get(CONTEXT_PATH + '/users/admin')
        .proxy(testHelper.TEST_PROXY)
				.set('Orion-Version', 1)
				.expect(403, done);
		});
		it("testGetUser - non-existent, trailing slash", function(done) {
			request()
        .get(CONTEXT_PATH + '/users/admin')
        .proxy(testHelper.TEST_PROXY)
				.set('Orion-Version', 1)
				.expect(403, done);
		});
		it("testPutUser - non existent user", function(done) {
			request()
        .put(CONTEXT_PATH + '/users/nope')
        .proxy(testHelper.TEST_PROXY)
				.set('Orion-Version', 1)
				.send({Password: "newpw", FullName: "anonEmouse", Email: "anonEmouse@anon.ca"})
				.expect(403, done);
		});
		it("testPutUser - non existent user, trailing slash", function(done) {
			request()
        .put(CONTEXT_PATH + '/users/nope/')
        .proxy(testHelper.TEST_PROXY)
				.set('Orion-Version', 1)
				.send({Password: "newpw", FullName: "anonEmouse", Email: "anonEmouse@anon.ca"})
				.expect(403, done);
		});
		it("testPutUser - root", function(done) {
			request()
        .put(CONTEXT_PATH + '/users')
        .proxy(testHelper.TEST_PROXY)
				.set('Orion-Version', 1)
				.send({Password: "newpw", FullName: "anonEmouse", Email: "anonEmouse@anon.ca"})
				.expect(404, done);
		});
		it("testPutUser - root, trailing slash", function(done) {
			request()
        .put(CONTEXT_PATH + '/users/')
        .proxy(testHelper.TEST_PROXY)
				.set('Orion-Version', 1)
				.send({Password: "newpw", FullName: "anonEmouse", Email: "anonEmouse@anon.ca"})
				.expect(404, done);
		});
		it("testPostUser - non existent", function(done) {
			request()
        .post(CONTEXT_PATH + '/users/nope')
        .proxy(testHelper.TEST_PROXY)
				.set('Orion-Version', 1)
				.send({Password: "pw"})
				.expect(403, done);
		});
		it("testPostUser - non existent, trailing slash", function(done) {
			request()
        .post(CONTEXT_PATH + '/users/nope/')
        .proxy(testHelper.TEST_PROXY)
				.set('Orion-Version', 1)
				.send({Password: "pw"})
				.expect(403, done);
		});
		it("testPostUsers", function(done) {
			request()
        .post(CONTEXT_PATH + '/users')
        .proxy(testHelper.TEST_PROXY)
				.set('Orion-Version', 1)
				.send({Password: "pw", FullName: "user1", Email: "user1@email.ca", UserName: "user1"})
				.expect(201, done);
		});
		it("testPostUsers - trailing slash", function(done) {
			request()
        .post(CONTEXT_PATH + '/users/')
        .proxy(testHelper.TEST_PROXY)
				.set('Orion-Version', 1)
				.send({Password: "pw", FullName: "user1", Email: "user1@email.ca", UserName: "user1"})
				.expect(404, done);
		});
		it("testDeleteUser - anonymous", function(done) {
			request()
        .delete(CONTEXT_PATH + '/users/anonymous')
        .proxy(testHelper.TEST_PROXY)
				.set('Orion-Version', 1)
				.expect(400, done);
		});
		it("testDeleteUser - anonymous, trailing slash", function(done) {
			request()
        .delete(CONTEXT_PATH + '/users/anonymous/')
        .proxy(testHelper.TEST_PROXY)
				.set('Orion-Version', 1)
				.expect(403, done);
		});
		it("testDeleteUser - non existent user", function(done) {
			request()
        .delete(CONTEXT_PATH + '/users/nope')
        .proxy(testHelper.TEST_PROXY)
				.set('Orion-Version', 1)
				.expect(403, done);
		});
		it("testDeleteUser - non existent user, trailing slash", function(done) {
			request()
        .delete(CONTEXT_PATH + '/users/nope/')
        .proxy(testHelper.TEST_PROXY)
				.set('Orion-Version', 1)
				.expect(403, done);
		});
		it("testDeleteUser - sent to root", function(done) {
			request()
        .delete(CONTEXT_PATH + '/users')
        .proxy(testHelper.TEST_PROXY)
				.set('Orion-Version', 1)
				.expect(404, done);
		});
		it("testDeleteUser - sent to root trailing slash", function(done) {
			request()
        .delete(CONTEXT_PATH + '/users/')
        .proxy(testHelper.TEST_PROXY)
				.set('Orion-Version', 1)
				.expect(404, done);
		});
		it("testCreateDuplicateUser", function(done) {
			var json = {UserName: "testCreateDuplicateUser", Email: 'testCreateDuplicateUser@bar.org', FullName: "testCreateDuplicateUser Bar", Password: "1234"};
			request()
        .post(CONTEXT_PATH + '/users')
        .proxy(testHelper.TEST_PROXY)
				.send(json)
				.expect(201, done);
		});
		it("testCreateUserWithNoUserName", function(done) {
			var json = {Email: 'testCreateDuplicateUser@bar.org', FullName: "testCreateDuplicateUser Bar", Password: "1234"};
			request()
        .post(CONTEXT_PATH + '/users')
        .proxy(testHelper.TEST_PROXY)
				.send(json)
				.expect(400, done);
		});
		it("testCreateUserWithNoEmail", function(done) {
			var json = {UserName: 'testCreateUserWithNoEmail', FullName: "testCreateDuplicateUser Bar", Password: "1234"};
			request()
        .post(CONTEXT_PATH + '/users')
        .proxy(testHelper.TEST_PROXY)
				.send(json)
				.expect(201, done);
		});
		it("testCreateUserDuplicateEmail", function(done) {
			var json = {UserName: "testCreateUserDuplicateEmail", Email: 'testCreateUserDuplicateEmail@bar.org', FullName: "testCreateUserDuplicateEmail Bar", Password: "1234"};
			request()
        .post(CONTEXT_PATH + '/users')
        .proxy(testHelper.TEST_PROXY)
				.send(json)
				.expect(201, done);
		});
		it("testCreateUserEmailDifferentCase", function(done) {
			var json = {UserName: "testCreateUserEmailDifferentCase", Email: 'testCreateUserEmailDifferentCase@bar.org', FullName: "testCreateUserEmailDifferentCase Bar", Password: "1234"};
			request()
        .post(CONTEXT_PATH + '/users')
        .proxy(testHelper.TEST_PROXY)
				.send(json)
				.expect(201, done);
		});
		it("testCreateDeleteUsers", function(done) {
			var json = {UserName: "testCreateDeleteUsers", Email: 'testCreateDeleteUsers@bar.org', FullName: "testCreateDeleteUsers Bar", Password: "1234"};
			request()
        .post(CONTEXT_PATH + '/users')
        .proxy(testHelper.TEST_PROXY)
				.send(json)
				.expect(201)
				.end(function(err, res) {
					testHelper.throwIfError(err);
					request()
            .delete(CONTEXT_PATH + '/users/testCreateDeleteUsers')
            .proxy(testHelper.TEST_PROXY)
						.expect(403, done) //TODO what to do in single user mode?
				});
		});
		it("testUpdateUsers", function(done) {
			var json = {UserName: "testUpdateUsers", Email: 'testUpdateUsers@bar.org', FullName: "testUpdateUsers Bar", Password: "1234"};
			request()
        .post(CONTEXT_PATH + '/users')
        .proxy(testHelper.TEST_PROXY)
				.send(json)
				.expect(201)
				.end(function(err, res) {
					testHelper.throwIfError(err);
					done();
				});
		});
		it("testResetUser", function(done) {
			var json = {roles: "admin", UserName: "testResetUser", Email: 'testResetUser@bar.org', FullName: "testResetUser Bar", Password: "1234"};
			request()
        .post(CONTEXT_PATH + '/users')
        .proxy(testHelper.TEST_PROXY)
				.send(json)
				.expect(201)
				.end(function(err, res) {
					testHelper.throwIfError(err);
					done();
				});
		});
		it("testCreateUser", function(done) {
			var json = {UserName: "testCreateUser", Email: 'testCreateUser@bar.org', FullName: "testCreateUser Bar", Password: "1234"};
			request()
        .post(CONTEXT_PATH + '/users')
        .proxy(testHelper.TEST_PROXY)
				.send(json)
				.expect(201)
				.end(function(err, res) {
					testHelper.throwIfError(err);
					done();
				});
		});
		it("testChangeUserName", function(done) {
			var json = {UserName: "testChangeUserName", Email: 'testChangeUserName@bar.org', FullName: "testChangeUserName Bar", Password: "1234"};
			request()
        .post(CONTEXT_PATH + '/users')
        .proxy(testHelper.TEST_PROXY)
				.send(json)
				.expect(201)
				.end(function(err, res) {
					testHelper.throwIfError(err);
					done();
				});
		});
		describe("Create users with invalid user names", function() {
			Array.from(" !@#$%^&*()-=_+[]{}\";':\\/><.,`~|\u001C\u204B").forEach(function(c) {
				const uname = "bad" + c + "name";
				it("testCreateUserBadName: "+uname, function(done) {
					request()
            .post(CONTEXT_PATH + '/users')
            .proxy(testHelper.TEST_PROXY)
						.send({
							UserName: uname, 
							Email: 'emailz', 
							FullName: "Bad"+c, 
							Password: "1234"})
						.expect(400, done);
				});
			});
		});
		describe("Create users with allowed UNICODE user names", function() {
			Array.from("\u225B\u1F707\u11ACB").forEach(function(c) {
				const uname = "good" + c + "name";
				it("testCreateUserBadName: "+uname, function(done) {
					request()
            .post(CONTEXT_PATH + '/users')
            .proxy(testHelper.TEST_PROXY)
						.send({
							UserName: uname, 
							Email: 'emailz', 
							FullName: "Good"+c, 
							Password: "1234"})
						.expect(201, done);
				});
			});
		});
	});
});
