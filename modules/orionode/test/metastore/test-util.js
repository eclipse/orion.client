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
const testData = require('../support/test_data'),
	    testHelper = require('../support/testHelper');

var request = testData.setupOrionServer();

describe("Orion metadata utils", function() {
	/**
	 * From: org.eclipse.orion.server.tests.metastore.SimpleUserPasswordUtilTests.java
	 * 
	 * TODO we currently don't have extra hooks to do these operations directly. We might add them 
	 * in the future
	 */
	describe.skip("Simple user password util tests", function() {
		it("testEncryptPassword");
		it("testDecryptPassword");
	});
	/**
	 * From: org.eclipse.orion.server.tests.metastore.SimpleMetaStoreUtilTests.java
	 * TODO we currently don't have extra hooks to do these operations directly. We might add them 
	 * in the future
	 */
	describe.skip("Simple metastore util tests", function() {
		it("testCreateMetaFile");
		it("testCreateMetaFileWithBadName");
		it("testCreateMetaFolder");
		it("testDeleteMetaFile");
		it("testDeleteMetaFolder");
		it("testEncodedProjectContentLocation");
		it("testEncodedWorkspaceId");
		it("testListMetaFilesAndFolders");
		it("testReadMetaFile");
		it("testReadMetaFolder");
		it("testUpdateMetaFile");
	});
});
