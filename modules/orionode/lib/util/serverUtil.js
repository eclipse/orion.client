/*******************************************************************************
 * Copyright (c) 2018 IBM Corporation and others.
 * All rights reserved. This program and the accompanying materials are made 
 * available under the terms of the Eclipse Public License 2.0 
 * (http://www.eclipse.org/legal/epl-v10.html), and the Eclipse Distribution 
 * License v1.0 (http://www.eclipse.org/org/documents/edl-v10.html). 
 *
 * Contributors:
 *     IBM Corporation - initial API and implementation
 *******************************************************************************/
/*eslint-env node*/
var api = require("../api");
var log4js = require("log4js");

function shutdown(code, shutdownTimeout, logger) {
	var _shutdownTimer;
	_shutdownTimer = setTimeout(function() {
		_shutdownTimer = null;
		serverExit(1);
		setTimeout(function() {
			logger.warn("Exiting after hard shutdown timed out, pid: " + process.pid);
			process.exit(2);
		}, shutdownTimeout / 10);
	}, shutdownTimeout);
	function serverExit(code) {
		(code ? logger.warn : logger.info).bind(logger)("Initiating shutdown, pid: " + process.pid + " with code: " + code + " (code=1 means hard)");
		function done() {
			if (_shutdownTimer) clearTimeout(_shutdownTimer);
			logger.info("Exiting after all tasks ended, pid: " + process.pid + " code: " + (code || 0) + " (code=1 means hard)");
			log4js.shutdown(function() {
				process.exit(code || 0);
			});
		}
		var data = {
			code: code,
			promises: []
		};
		api.getOrionEE().emit("close-socket", data);
		api.getOrionEE().emit("close-server", data);
		return Promise.all(data.promises).then(done, done);
	}
	serverExit(code);
}

module.exports.shutdown = shutdown;
