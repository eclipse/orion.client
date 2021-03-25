/*******************************************************************************
 * Copyright (c) 2012, 2017 IBM Corporation and others.
 * All rights reserved. This program and the accompanying materials are made 
 * available under the terms of the Eclipse Public License 2.0 
 * (http://www.eclipse.org/legal/epl-v10.html), and the Eclipse Distribution 
 * License v1.0 (http://www.eclipse.org/org/documents/edl-v10.html). 
 *
 * Contributors:
 *	 IBM Corporation - initial API and implementation
 *******************************************************************************/
/*eslint-env node*/
var express = require('express'),
	api = require('./api'),
	crypto = require('crypto'),
	log4js = require('log4js'),
	logger = log4js.getLogger("tasks"),
	responseTime = require('response-time');

var writeError = api.writeError, 
	writeResponse = api.writeResponse;
	
var KEEP_MS_EXPIRATION = 86400 * 1000 * 2; /* 2 days */
var TEMP_MS_EXPIRATION = 60 * 1000 * 15; /* 15 minutes */

var taskStore;
var taskRoot = "/task";

function orionTasksAPI(options) {
	taskRoot = options.taskRoot;
	if (!taskRoot) { throw new Error('options.taskRoot is required'); }
	taskStore = options && options.metastore;
	if (!taskStore) { throw new Error('options.metastore is required'); }

	return express.Router()
	.use(responseTime({digits: 2, header: "X-Tasks-Response-Time", suffix: true}))
	.param('id', function(req, res, next, value) {
		req.id = value;
		next();
	})
	.get('/id/:id', function(req, res/*, next*/) {
		taskStore.getTask(getTaskMeta(req), function(err, task) {
			if (err) {
				return writeError(500, res, err.toString());
			}
			if (!task || (task.username && task.username !== req.user.username)) {
				// task meta saved in fs doesn't have username, while task saved in RAM and mongo does.
				return writeError(404, res);
			}
			writeResponse(200, res, null, toJSON(task, true), true);
		});
	})
	.delete('', deleteAllOperations)
	.delete('/id/:id', deleteOperation)
	.get('/temp/:id', function(req, res/*, next*/) {
		taskStore.getTask(getTaskMeta(req), function(err, task) {
			if (err) {
				return writeError(500, res, err.toString());
			}
			if (!task || (task.username && task.username !== req.user.username)) {
				// task meta saved in fs doesn't have username, while task saved in RAM and mongo does.
				return writeError(404, res);
			}
			writeResponse(200, res, null, toJSON(task, false), true);
		});
	})
	.delete('/temp/:id', deleteOperation)
	.put('/temp/:id', cancelOperation)
	.put('/id/:id', cancelOperation);
}

function getTaskMeta(req, taskLocationOrKeep, taskId) {
	var keep;
	if (typeof taskLocationOrKeep === "string") {
		// This is when req doesn't have enough information needed
		keep = taskLocationOrKeep.startsWith("/id");
	} else if (typeof taskLocationOrKeep === "boolean") {
		keep = taskLocationOrKeep;
	} else {
		keep = req.url.startsWith("/id");
	}
	return {
		keep: keep,
		username: req.user.username,
		id: taskId || req.id
	};
}

var allTasks = {};
api.getOrionEE().on("close-server", function(data) {
	if (data.code) {
		logger.error("Cancelling all tasks in worker: " + process.pid);
		var keys = Object.keys(allTasks);
		keys.forEach(function(key) {
			logger.error("Cancelling: " + key + " url=" + allTasks[key].res.req.method + " " + allTasks[key].res.req.originalUrl + " pid=" + process.pid);
			allTasks[key].done({
				HttpCode: 500,
				Code: 0,
				Message: "Task was canceled"
			});
		});
	}
	data.promises.push(new Promise(function (fulfill) {
		var promises = [];
		var keys = Object.keys(allTasks);
		logger.info("Waiting for " + keys.length + " tasks in worker: " + process.pid);
		keys.forEach(function(key) {
			promises.push(allTasks[key].donePromise);
		});
		function done() {
			logger.info("Tasks completed for worker: " + process.pid);
			fulfill();
		}
		Promise.all(promises).then(done, done);
	}));
});

function Task(res, cancelable, lengthComputable, wait, keep) {
	this.timestamp = Date.now();
	this.id = crypto.randomBytes(5).toString('hex') + this.timestamp;
	this.cancelable = Boolean(cancelable);
	this.lengthComputable = Boolean(lengthComputable);
	this.keep = Boolean(keep);
	this.expires = this.timestamp + (this.keep ? KEEP_MS_EXPIRATION : TEMP_MS_EXPIRATION);
	this.total = this.loaded = 0;
	this.type = "loadstart";
	this.username = res.req.user.username;
	this.res = res;
	this.donePromise = new Promise(function(fulfill) {
		this.doneFulfill = function(result) {
			delete this.doneFulfill;
			delete allTasks[this.id];
			fulfill(result);
		}.bind(this);
	}.bind(this));

	//TODO temporarily disabled timeout to work around client bug.
	if (true || wait === 0) {
		this.start();
	} else {
		this.timeout = setTimeout(function() {
			delete this.timeout;
			this.start();
		}.bind(this), typeof wait === "number" ? wait : 100);
	}
}
Task.prototype = {
	start: function() {
		if (!this.isRunning()) return;
		allTasks[this.id] = this;
		this.started = true;
		this.toJSON = toJSON;
		taskStore.createTask(this, function(err) {
			var res = this.res;
			if (res.finished) {
				return;
			}
			if (err) {
				writeError(500, res, err.toString());
			} else {
				api.writeResponse(202, res, null, toJSON(this, true), true);
			}
		}.bind(this));
	},
	done: function(result) {
		if (this.result) return;
		this.result = result;

		switch (result.Severity) {
			case "Ok":
			case "Info":
				this.type = "loadend";
				break;
			case "Error":
			case "Warning":
				this.type = "error";
				break;
			default:
				this.type = "abort";
		}
		if (!this.started) {
			if (this.timeout) {
				clearTimeout(this.timeout);
				delete this.timeout;
			}
			taskStore.updateTask(this, function(err) {
				this.doneFulfill();
				var res = this.res;
				if (res.finished) {
					return;
				}
				if (err) {
					writeError(500, res, err.toString());
				} else {
					if (this.result.JsonData) {
						res.statusCode = this.result.HttpCode;
						api.writeResponse(this.result.HttpCode, res, null, this.result.JsonData, true);
					} else if (this.type === "error") {
						api.writeError(this.result.HttpCode, res, this.result.Message || "");
					}
				}
			}.bind(this));
		} else {
			taskStore.updateTask(this, function(err) {
				this.doneFulfill();
				if (err) {
					logger.error(err.toString());
				}
			}.bind(this));
		}
	},
	isRunning: function() {
		return this.type !== "error" && this.type !== "abort";
	},
	updateProgress: function(message, loaded, total) {
		if (!this.lengthComputable) return;
		this.type = "progress";
		if (typeof message === "string") this.message = message;
		if (typeof loaded === "number") this.loaded = loaded;
		if (typeof total === "number") this.total = total;
		taskStore.updateTask(this, function(err) {
			if (err) {
				logger.error(err.toString());
			}
		});
	},
};

function deleteOperation(req, res/*, next*/) {
	taskStore.getTask(getTaskMeta(req), function(err, task) {
		if (err) {
			return writeError(500, res, err.toString());
		}
		if (!task || (task.username && task.username !== req.user.username)) {
			// task meta saved in fs doesn't have username, while task saved in RAM and mongo does.
			return writeError(404, res, "Could not delete task that does not exist: " + req.id);
		}
		taskStore.deleteTask(getTaskMeta(req), function(err) {
			if (err) {
				return writeError(500, res, err.toString());
			}
			writeResponse(200, res, null, {});
		});
	});
}

/**
 * Deletes all completed operations that the user sending the request had created.
 */
function deleteAllOperations(req, res) {
	taskStore.getTasksForUser(req.user.username, function(err, tasks) {
		if (err) {
			return writeError(500, res, err.toString());
		}
		var locations = [];
		var doneCount = 0;
		var done = function() {
			if (!tasks.length || ++doneCount === tasks.length) {
				writeResponse(200, res, null, locations);
			}
		};
		if (!tasks.length) {
			done();
			return;
		}
		tasks.forEach(function(task) {
			if (task.result || task.Result) {
				// task in single user case doesn't have Location, it has keep instead
				taskStore.deleteTask(getTaskMeta(req, (task.Location && task.Location.substring(req.baseUrl.length)) || task.keep, task.id), done); /* task is completed */
			} else {
				locations.push(toJSON(task, true).Location);
				done();
			}
		});
	});
}

/**
 * @name cancelOperation
 * @description Cancel task operation by marking abort in task status
 */
function cancelOperation(req, res){
	if(!req.body.abort){
		return writeError(400, res, "Invalid request parameters, try {'abort':true}" + req.id);
	}
	taskStore.getTask(getTaskMeta(req), function(err, task) {
		if (err) {
			return writeError(500, res, err.toString());
		}
		if (!task || (task.username && task.username !== req.user.username)) {
			// task meta saved in fs doesn't have username, while task saved in RAM and mongo does.
			return writeError(404, res, "Could not cancel task that does not exist: " + req.id);
		}
		if (task.cancelable) {
			task.type = "abort";
		}
		taskStore.updateTask(task, function(err) {
			if (err) {
				writeError(500, res, err.toString());
			}
			writeResponse(200, res);
		});
	});
}


function toJSON(task, isWriteLocation) {
	var result;
	// task meta saved in fs doesn't have username, while task saved in RAM and mongo does.
	if (typeof task.username === 'string') { // This means this task object is the original Task object
		result = {
			lengthComputable: task.lengthComputable,
			cancelable: task.cancelable,
			expires: task.expires,
			timestamp: task.timestamp,
			type: task.type
		};
		if (task.lengthComputable) {
			result.loaded = task.loaded;
			result.total = task.total;
			result.message = task.message;
		}
		if (task.result) {
			result.Result = task.result;
		}
		if (task.keep && isWriteLocation) {
			// Do not set location so that tasks is deleted
			result.Location = taskRoot + "/id/" + task.id;
		} else if (isWriteLocation) {
			result.Location = taskRoot + "/temp/" + task.id;
		}
		
	} else {
		// When task object is task description not the Task object
		if(!isWriteLocation){
			task.Location && delete task.Location;
		}
		result = task;
	}
	return result;
}
	
module.exports = {
	router: orionTasksAPI,
	Task: Task,
};
