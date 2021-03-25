/*******************************************************************************
 * Copyright (c) 2012, 2018 IBM Corporation and others.
 * All rights reserved. This program and the accompanying materials are made 
 * available under the terms of the Eclipse Public License 2.0 
 * (http://www.eclipse.org/legal/epl-v10.html), and the Eclipse Distribution 
 * License v1.0 (http://www.eclipse.org/org/documents/edl-v10.html). 
 *
 * Contributors:
 *     IBM Corporation - initial API and implementation
 *******************************************************************************/
/*eslint-env node*/
var express = require('express'),
	ETag = require('./util/etag'),
	fs = require('fs'),
	mkdirp = require('mkdirp'),
	nodePath = require('path'),
	request = require('request'),
	api = require('./api'),
	writeError = api.writeError,
	fileUtil = require('./fileUtil'),
	log4js = require('log4js'),
	logger = log4js.getLogger("file"),
	responseTime = require('response-time');

module.exports.router = function router(options) {
	var fileRoot = options.fileRoot;
	var workspaceRoot = options.workspaceRoot;
	if (!fileRoot) { throw new Error('options.fileRoot is required'); }
	if (!workspaceRoot) { throw new Error('options.workspaceRoot is required'); }
	
	var router = express.Router({mergeParams: true});
	router.use(responseTime({digits: 2, header: "X-File-Response-Time", suffix: true}));
	router.get('*', getFile);
	router.put('*', putFile);
	router.post('*', postFile);
	router.delete('*', deleteFile);

	fileUtil.addFileModificationListener("fileEndpoint", {handleFileModficationEvent: function(eventData){
		if(typeof eventData.type === "string"){
			api.logAccess(logger, eventData.req.user.username);
		}
	}});
	return router;
	
	function getParam(req, paramName) {
		return req.query[paramName];
	}

	/**
	 * @name writeFileContents
	 * @description Creates a read stream to the given file path and writes the file
	 * @param {HttpResponse} res The backing response
	 * @param {string} filepath The full path to the file
	 * @param {?} stats The stats object for the file from FS
	 * @param {ETag} etag The etag
	 */
	function writeFileContents(res, filepath, stats, etag) {
		var stream = fs.createReadStream(filepath);
		res.setHeader('Content-Length', stats.size);
		res.setHeader('ETag', etag);
		res.setHeader('Accept-Patch', 'application/json-patch; charset=UTF-8');
		api.addStrictTransportHeaders(res);
		api.setResponseNoCache(res);
		stream.pipe(res);
		stream.on('error', function(e) {
			// FIXME this is wrong, headers have likely been committed at this point
			writeError(500, res, e.toString());
		});
		stream.on('end', res.end.bind(res));
	}

	function handleDiff(req, res, rest, body) {
		var diffs = body.diff || [];
		var contents = body.contents;
		var file = fileUtil.getFile(req, rest);
		fileUtil.withStatsAndETag(file.path, function(error, stats, etag) {
			if (error) {
				logger.error(error);
				writeError(500, res, error);
				return;
			}

			var ifMatchHeader = req.headers['if-match'];
			if (ifMatchHeader && ifMatchHeader !== etag) {
				return api.sendStatus(412, res);
			}

			fs.readFile(file.path, function (error, data) {
				if (error) {
					logger.error(error);
					writeError(500, res, error);
					return;
				}
				try {
					var newContents = data.toString();
					if (newContents.length > 0) {
						var code = newContents.charCodeAt(0);
						if (code === 0xFEFF || code === 0xFFFE) {
							newContents = newContents.substring(1);
						}
					}
					var buffer = {
						_text: [newContents], 
						replaceText: function (text, start, end) {
							var offset = 0, chunk = 0, _length;
							while (chunk<this._text.length) {
								_length = this._text[chunk].length; 
								if (start <= offset + _length) { break; }
								offset += _length;
								chunk++;
							}
							var firstOffset = offset;
							var firstChunk = chunk;
							while (chunk<this._text.length) {
								_length = this._text[chunk].length; 
								if (end <= offset + _length) { break; }
								offset += _length;
								chunk++;
							}
							var lastOffset = offset;
							var lastChunk = chunk;
							var firstText = this._text[firstChunk];
							var lastText = this._text[lastChunk];
							var beforeText = firstText.substring(0, start - firstOffset);
							var afterText = lastText.substring(end - lastOffset);
							var params = [firstChunk, lastChunk - firstChunk + 1];
							if (beforeText) { params.push(beforeText); }
							if (text) { params.push(text); }
							if (afterText) { params.push(afterText); }
							Array.prototype.splice.apply(this._text, params);
							if (this._text.length === 0) { this._text = [""]; }
						},
						getText: function() {
							return this._text.join("");
						}
					};
					for (var i=0; i<diffs.length; i++) {
						var change = diffs[i];
						buffer.replaceText(change.text, change.start, change.end);
					}
					newContents = buffer.getText();
				} catch (ex) {
					writeError(500, res, ex);
					return;
				}

				var failed = false;
				if (contents) {
					if (newContents !== contents) {
						failed = true;
						newContents = contents;
					}
				}
				fs.writeFile(file.path, newContents, function(err) {
					if (err) {
						logger.error(err);
						writeError(500, res, err);
						return;
					}
					if (failed) {
						writeError(406, res, new Error('Bad file diffs. Please paste this content in a bug report: \u00A0\u00A0 \t' + JSON.stringify(body)));
						return;
					}
					fs.stat(file.path, function(error, stats) {
						if (error) {
							logger.error(error);
							writeError(500, res, error);
							return;
						}
						fileUtil.writeFileMetadata(req, res, api.join(fileRoot, file.workspaceId), api.join(workspaceRoot, file.workspaceId), file, stats, ETag.fromString(newContents) /*the new ETag*/);
						fileUtil.fireFileModificationEvent({ type: fileUtil.ChangeType.WRITE, file: file, contents: newContents, req: req});
					});
				});
			});
		});
	}

	/**
	 * @name getFile
	 * @description Fetches the requested file, folder or project depending on the parameters given in the request
	 * @param {XMLHttpRequest} req The original request
	 * @param {XMLHttpResponse} res The backing response
	 */
	function getFile(req, res) {
		var rest = req.params["0"].substring(1),
			readIfExists = req.headers ? Boolean(req.headers['read-if-exists']).valueOf() : false,
			file = fileUtil.getFile(req, rest);
		if(file.path && req.query && req.query.project === "true") {
			var n = req.query.names ? req.query.names.split(',') : [],
				names = {};
			n.forEach(function(item) {
				names[decodeURIComponent(item)] = Object.create(null);
			});
			var parentFileRoot = api.join(fileRoot, file.workspaceId);
			var parentWorkspaceRoot = api.join(workspaceRoot, file.workspaceId);
			return fileUtil.getProject(fileUtil.getMetastore(req), parentFileRoot, parentWorkspaceRoot, file, {names: names}).then(function(project) {
				return fileUtil.withStatsAndETag(project, function(error, stats, etag) {
					if (error && error.code === 'ENOENT') {
						api.sendStatus(204, res);
					} else if(error) {
						writeError(500, res, error);
					} else {
						fileUtil.writeFileMetadata(req, res, parentFileRoot, parentWorkspaceRoot, {workspaceDir: file.workspaceDir, workspaceId: file.workspaceId, path: project}, stats, etag, 0);
					}
				});
			}, function reject() {
				//don't send back 404, this API asks a question, it does not ask to actually get a resource
				api.sendStatus(204, res);
			});
		}
		return fileUtil.withStatsAndETag(file.path, function(error, stats, etag) {
			if (error) {
				if(error.code === 'ENOENT') {
					if(typeof readIfExists === 'boolean' && readIfExists) {
						api.sendStatus(204, res);
					} else {
						writeError(404, res, 'File not found: ' + rest);
					}
				} else if(error.code === 'ENAMETOOLONG') {
					writeError(400, res, 'The given file path is too long: '+file.path);
				} else if(error.code === 'ENOTDIR') {
					writeError(400, res, 'Resource is not a folder: '+file.path);
				} else {
					writeError(500, res, error);
				}
			} else if (stats.isFile() && getParam(req, 'parts') !== 'meta') {
				// GET file contents
				writeFileContents(res, file.path, stats, etag);
			} else {
				var depth = stats.isDirectory() && Number(getParam(req, 'depth')) || 0;
				fileUtil.writeFileMetadata(req, res, api.join(fileRoot, file.workspaceId), api.join(workspaceRoot, file.workspaceId), file, stats, etag, depth);
			}
		});
	}

	/**
	 * @name putFile
	 * @description Handle the PUT operation for files / folders
	 * @param {XMLHttpRequest} req The original request
	 * @param {XMLHttpResponse} res The backing response
	 */
	function putFile(req, res) {
		var rest = req.params["0"].substring(1);
		var file = fileUtil.getFile(req, rest);
		if (getParam(req, 'parts') === 'meta') {
			// TODO implement put of file attributes
			api.sendStatus(501, res);
			return;
		}
		function write() {
			mkdirp(nodePath.dirname(file.path), function(err) {
				if (err) {
					logger.error(err);
					return writeError(500, res, err);
				}
				var ws = fs.createWriteStream(file.path);
				ws.on('close', function() {
					fileUtil.withStatsAndETag(file.path, function(error, stats, etag) {
						if (error && error.code === 'ENOENT') {
							api.writeResponse(404, res);
							return;
						}
						fileUtil.writeFileMetadata(req, res, api.join(fileRoot, file.workspaceId), api.join(workspaceRoot, file.workspaceId), file, stats, etag);
						fileUtil.fireFileModificationEvent({ type: fileUtil.ChangeType.WRITE, file: file, req: req});
					});
				});
				ws.on('error', function(err) {
					logger.error(err);
					writeError(500, res, err);
				});
				if (req.query.source) {
					request(req.query.source).pipe(ws);
				} else {
					req.pipe(ws);
				}
			});
		}
		return fileUtil.withStatsAndETag(file.path, function(error, stats, etag) {
			if(error && (error.code === 'ENAMETOOLONG' || error.code === 'ENOTDIR')) {
				return api.writeError(400, res);
			}
			if(stats && stats.isDirectory()) {
				return api.writeError(400, res, "Cannot write contents to a folder: "+file.path);
			}
			var ifMatchHeader = req.headers['if-match'];
			if (!ifMatchHeader) {
				return write();
			} else if (ifMatchHeader !== etag) {
				return api.writeResponse(412, res);
			} else if (error) {
				if(error.code === 'ENOENT') {
					return api.writeResponse(404, res);
				} else if(error.code === 'ENOTDIR') {
					return api.writeResponse(400, res);
				}
			}
			write();
		});
	}

	function postFile(req, res) {
		var rest = req.params["0"].substring(1);
		var diffPatch = req.headers['x-http-method-override'];
		if (diffPatch === "PATCH") {
			handleDiff(req, res, rest, req.body);
			return;
		}
		var fileName = fileUtil.decodeSlug(req.headers.slug) || req.body && req.body.Name;
		if (!fileName) {
			writeError(400, res, new Error('Missing Slug header or Name property'));
			return;
		}

		var file = fileUtil.getFile(req, api.join(rest, fileName));
		fileUtil.handleFilePOST(workspaceRoot, fileRoot, req, res, file);
	}

	function deleteFile(req, res) {
		var rest = req.params["0"].substring(1);
		var file = fileUtil.getFile(req, rest);
		fileUtil.deleteFile(req, file, req.headers['if-match'], function(error) {
			if (error) {
				writeError(error.code || 500, res, error);
				return;
			}
			api.sendStatus(204, res);
		});
	}
};
