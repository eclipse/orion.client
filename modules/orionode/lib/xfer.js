/*******************************************************************************
 * Copyright (c) 2016, 2017 IBM Corporation and others.
 * All rights reserved. This program and the accompanying materials are made 
 * available under the terms of the Eclipse Public License v1.0 
 * (http://www.eclipse.org/legal/epl-v10.html), and the Eclipse Distribution 
 * License v1.0 (http://www.eclipse.org/org/documents/edl-v10.html). 
 *
 * Contributors:
 * IBM Corporation - initial API and implementation
 *******************************************************************************/
/*eslint-env node */
var api = require('./api'), writeError = api.writeError, writeResponse = api.writeResponse;
var archiver = require('archiver');
var unzip = require('unzip2');
var request = require('request');
var express = require('express');
var path = require('path');
var os = require('os');
//var Busboy = require('busboy');
var Promise = require('bluebird');
var mkdirp = require('mkdirp');
var fs = Promise.promisifyAll(require('fs'));
var fileUtil = require('./fileUtil');
var log4js = require('log4js');
var logger = log4js.getLogger("xfer");

function getUploadsFolder(options) {
	if (options.options) {
		return path.join(options.options.configParams['orion.single.user'] ? 
			path.join(os.homedir(), ".orion") : options.options.workspaceDir, ".uploads");
	}
	return path.join(os.homedir(), ".orion");
}

var UPLOADS_FOLDER;
var fileRoot;

/**
 * @callback
 */
module.exports.router = function(options) {
	fileRoot = options.fileRoot;
	if (!fileRoot) { throw new Error('options.fileRoot is required'); }
	module.exports.write = write;
	module.exports.getUploadDir = getUploadDir;
	
	UPLOADS_FOLDER = getUploadsFolder(options);
	
	mkdirp(UPLOADS_FOLDER, function (err) {
		if (err) logger.error(err);
	});

	return express.Router()
	.get('/export*', getXfer)
	.post('/import*', postImportXfer);
}

module.exports.getXferFrom = getXferFrom;
module.exports.postImportXferTo = postImportXferTo;

function getOptions(req) {
	return req.get("X-Xfer-Options").split(",");
}
	
function reportTransferFailure(res, err) {
	var message = "File transfer failed";
	if (err.message) {
		message += ": " + err.message;
	}
	return writeResponse(400, res, null, {
				Severity: "Error",
				HttpCode: 400,
				Code: 0,
				Message: message,
				DetailedMessage: message
	});
}

function postImportXfer(req, res) {
	var rest = req.params["0"];
	var file = fileUtil.getFile(req, rest);
	postImportXferTo(req, res, file);
}

function postImportXferTo(req, res, file) {
	var xferOptions = getOptions(req);
	if (xferOptions.indexOf("sftp") !== -1) {
		return writeError(500, res, "Not implemented yet.");
	}
	var sourceURL = req.query.source;
	var shouldUnzip = xferOptions.indexOf("raw") === -1;
	var fileName = req.get("Slug");
	if (!fileName) {
		if (sourceURL) {
			fileName = path.basename(sourceURL);
		}
	}
	if (!fileName && !unzip) {
		return writeError(400, res, "Transfer request must indicate target filename");
	}
	function upload(request) {
		var tempFile = path.join(UPLOADS_FOLDER, Date.now() + fileName);
		var ws = fs.createWriteStream(tempFile);
		ws.on('error', function(err) {
			reportTransferFailure(res, err);
		});
		ws.on('finish', function() {
			completeTransfer(req, res, tempFile, file, fileName, xferOptions, shouldUnzip);
		});
		request.pipe(ws);
	}
	var length = -1;
	if (!sourceURL) {
		var lengthStr = req.get("X-Xfer-Content-Length") || req.get("Content-Length");
		if (lengthStr) length = Number(lengthStr);
	} else {
		upload(request(sourceURL));
		return;
	}
	if (req.get("Content-Type") === "application/octet-stream") {
		upload(req);
		return;
	}
	writeError(500, res, "Not implemented yet.");
//	var busboy = new Busboy({ headers: req.headers });
//	busboy.on('file', function(fieldname, file, filename, encoding, mimetype) {
//		console.log('File [' + fieldname + ']: filename: ' + filename + ', encoding: ' + encoding + ', mimetype: ' + mimetype);
//		file.on('data', function(data) {
//			console.log('File [' + fieldname + '] got ' + data.length + ' bytes');
//		});
//		file.on('end', function() {
//			console.log('File [' + fieldname + '] Finished');
//		});
//	});
//	busboy.on('finish', function() {
//		console.log('Done parsing form!');
//		res.writeHead(303, { Connection: 'close', Location: '/' });
//		res.end();
//	});
//	req.pipe(busboy);
}

function excluded(excludes, rootName, outputName) {
	if (rootName === outputName) {
		return false;
	}
	if (excludes.indexOf(path.basename(outputName)) !== -1) {
		return true;
	}
	return excluded(excludes, rootName, path.dirname(outputName));
}

function completeTransfer(req, res, tempFile, file, fileName, xferOptions, shouldUnzip) {
	var overwrite = xferOptions.indexOf("overwrite-older") !== -1;
	function overrideError(files) {
		writeResponse(400, res, null, {
			Severity: "Error",
			HttpCode:400,
			Code: 0,
			Message: "Failed to transfer all files to " + file.path.substring(file.workspaceDir.length) + 
				", the following files could not be overwritten: " + files.join(","),
			JsonData: {
				ExistingFiles: files
			}
		});
	}
	if (shouldUnzip) {
		var excludes = (req.query.exclude || "").split(",");
		if (fs.existsSync(path.join(file.path, ".git"))) {
			excludes.push(".git");
		}
		var failed = [];
		fs.createReadStream(tempFile)
		.pipe(unzip.Parse())
		.on('entry', function (entry) {
			var entryName = entry.path;
			var type = entry.type; // 'Directory' or 'File' 
			var outputName = path.join(file.path, entryName);
			if (!excluded(excludes, file.path, outputName)) {
				if (type === "File") {
					if (!overwrite && fs.existsSync(outputName)) {
						failed.push(entryName);
						entry.autodrain();
						return;
					}
					// make sure all sub folders exist
					var subfolderPath = path.join(file.path, path.dirname(entryName));
					if (!fs.existsSync(subfolderPath)) {
						mkdirp.sync(subfolderPath);
					}
					var writeStream = fs.createWriteStream(outputName);
					writeStream.on('error', function(err) {
						if (res) {
							reportTransferFailure(res, err);
							res = null;
						}
					});
					entry.pipe(writeStream);
				} else if (type === "Directory") {
					if (!fs.existsSync(outputName)) {
						mkdirp.sync(outputName);
					}
				}
			} else {
				entry.autodrain();
			}
		})
		.on('error', function(error) {
			if (res) {
				writeResponse(200, res, null, {
					Severity: "Error",
					HttpCode:400,
					Code: 0,
					Message: "Failed during file unzip: " + error.message
				});
				res = null;
			}
		})
		.on('close', function() {
			fs.unlink(tempFile);
			if (res) {
				if (failed.length) {
					return overrideError(failed);
				}
				res.setHeader("Location", api.join(fileRoot, file.workspaceId, file.path.substring(file.workspaceDir.length)));
				res.status(201).end();
				res = null;
			}
		});
	} else {
		var newFile = path.join(file.path, fileName);
		if (!overwrite && fs.existsSync(newFile)) {
			return overrideError([fileName]);
		}
		fs.rename(tempFile, newFile, function(err) {
			if (err) {
				return writeError(400, res, "Transfer failed");
			}
			res.setHeader("Location", api.join(fileRoot, file.workspaceId, file.path.substring(file.workspaceDir.length)));
			res.status(201).end();
		});
	}
}
	
function getXfer(req, res) {
	var rest = req.params["0"];
	var file = fileUtil.getFile(req, rest);
	
	if (path.extname(file.path) !== ".zip") {
		return writeError(400, res, "Export is not a zip");
	}
	
	getXferFrom(req, res, file);
}

function getXferFrom(req, res, file) {
	var filePath = file.path.replace(/.zip$/, "");
	var zip = archiver('zip');
	zip.pipe(res);
	write(zip, filePath, filePath)
	.then(function() {
		zip.finalize();
	})
	.catch(function(err) {
		if (err.code === "ENOENT") {
			// bug 511513, use a custom message so that the server's workspace path isn't leaked
			writeError(404, res, "Folder '" + filePath.substring(file.workspaceDir.length + 1) + "' does not exist");
		} else {
			writeError(500, res, err.message);
		}
	});
}

function write (zip, base, filePath) {
	return fs.statAsync(filePath)
	.then(function(stats) {
		/*eslint consistent-return:0*/
		if (stats.isDirectory()) {
			if (filePath.substring(filePath.length-1) !== "/") filePath = filePath + "/";
			return fs.readdirAsync(filePath)
			.then(function(directoryFiles) {
				var SUBDIR_SEARCH_CONCURRENCY = 10;
				return Promise.map(directoryFiles, function(entry) {
					return write(zip, base, filePath + entry);
				},{ concurrency: SUBDIR_SEARCH_CONCURRENCY});
			});
		}
		zip.file(filePath, { name: filePath.substring(base.length).replace(/\\/g, "/") });
	});
}
function getUploadDir(){
	return UPLOADS_FOLDER;
}
