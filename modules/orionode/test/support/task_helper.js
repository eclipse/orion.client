/******************************************************************************
 * Copyright (c) 2017 Remy Suen and others.
 * All rights reserved. This program and the accompanying materials are made 
 * available under the terms of the Eclipse Public License 2.0 
 * (http://www.eclipse.org/legal/epl-v10.html), and the Eclipse Distribution 
 * License v1.0 (http://www.eclipse.org/org/documents/edl-v10.html). 
 *
 * Contributors:
 *     Remy Suen - initial API and implementation
 *****************************************************************************/
/*eslint-env node*/
var express = require('express');
var bodyParser = require('body-parser');
var api = require('../../lib/api');
var tasks = require('../../lib/tasks');

var taskList = {};

function router(options) {
	var root = options.root;
	if (!root) { throw new Error('options.root path required'); }

	return express.Router()
	.use(bodyParser.json())
	.post('*', doDelete)
	.put('*', doPut);
}

function doDelete(req, res) {
	var id = req.url.substr(req.url.lastIndexOf('/') + 1);
	taskList[id].done({
		HttpCode: 200,
		Code: 0,
		DetailedMessage: "OK",
		JsonData: {},
		Message: "OK",
		Severity: "Ok"
	});
	res.status(200).json({});
}

function doPut(req, res) {
	var task = new tasks.Task(res, true, false, 0, false);
	taskList[task.id] = task;
}

module.exports = {
	router: router
};
