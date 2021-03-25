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
const	assert = require('assert'),
      testData = require("../support/test_data"),
      testHelper = require('../support/testHelper');

var CONTEXT_PATH = testHelper.CONTEXT_PATH,
    PREFIX = CONTEXT_PATH + '/version';

var request = testData.setupOrionServer();

describe("Version endpoint", function() {
    it("testVersion", async () => {
      let res = await request()
          .get(PREFIX)
          .proxy(testHelper.TEST_PROXY)
          .expect(200);
      assert(res.body, "There sould be a body in the response.");
      assert(res.body.build, "There should be a build in the body;");
    });
    it("testMultiLevelVersion", async () => {
      let res = await request()
          .get(PREFIX+PREFIX)
          .proxy(testHelper.TEST_PROXY)
          .expect(200);
      assert(res.body, "There sould be a body in the response.");
      assert(res.body.build, "There should be a build in the body;");
    }); 
});
