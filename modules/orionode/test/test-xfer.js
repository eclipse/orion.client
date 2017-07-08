/******************************************************************************
 * Copyright (c) 2017 Remy Suen and others.
 * All rights reserved. This program and the accompanying materials are made
 * available under the terms of the Eclipse Public License v1.0
 * (http://www.eclipse.org/legal/epl-v10.html), and the Eclipse Distribution
 * License v1.0 (http://www.eclipse.org/org/documents/edl-v10.html).
 *
 * Contributors:
 *     Remy Suen - initial API and implementation
 *****************************************************************************/
/*eslint-env node, mocha, assert, express*/
var path = require('path');
var fs = require('fs');
var assert = require('assert');
var express = require('express');
var supertest = require('supertest');
var xfer = require('../lib/xfer');

var CONTEXT_PATH = '';
var WORKSPACE = path.join(__dirname, '.test_workspace');
var WORKSPACE_ID = "orionode";

var app = express();
app.locals.metastore = require('../lib/metastore/fs/store')({workspaceDir: WORKSPACE});
app.locals.metastore.setup(app);
app.use(CONTEXT_PATH + '/xfer', require("../lib/xfer").router({ fileRoot: CONTEXT_PATH + "/xfer" }));

var request = supertest.bind(null, app);

describe("Xfer API", function() {
	beforeEach(function() {
	});

	describe('Export', function(done) {
		// Bug 511513 - Export non-existing folder leaks server path
		it('bug 511513', function(finished) {
			// make sure the folder doesn't actually exist
			assert.equal(fs.existsSync(WORKSPACE + "/donotexist"), false);
			// ask the server to export the non-existent folder
			request()
			.get(CONTEXT_PATH + "/xfer/export/"+ WORKSPACE_ID + "/donotexist.zip")
			.expect(404)
			.end(function(err, res) {
				assert.ifError(err);
				// message body doesn't include the path
				assert.equal(res.body.Message.indexOf(WORKSPACE), -1);
				finished();
			});
		});
	}); // describe("Export")
}); // describe("Xfer API")
