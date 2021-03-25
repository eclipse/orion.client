/*******************************************************************************
 * Copyright (c) 2012, 2017 IBM Corporation and others.
 * All rights reserved. This program and the accompanying materials are made 
 * available under the terms of the Eclipse Public License 2.0 
 * (http://www.eclipse.org/legal/epl-v10.html), and the Eclipse Distribution 
 * License v1.0 (http://www.eclipse.org/org/documents/edl-v10.html). 
 *
 * Contributors:
 *     IBM Corporation - initial API and implementation
 *******************************************************************************/
/*eslint-env node, es6*/
/*eslint-disable consistent-return*/
var ETag = require('./util/etag'),
	path = require('path'),
	Promise = require('bluebird'),
	rimraf = require('rimraf'),
	fse = require('fs-extra'),
	api = require('./api'),
	log4js = require('log4js'),
	logger = log4js.getLogger("file"),
	constants = require("constants"),
	fs = Promise.promisifyAll(require('fs'));
	
var ISFS_CASE_INSENSITIVE;

var isWin = /^win/.test(process.platform);

var ChangeType = module.exports.ChangeType = Object.freeze({
	/**
	 * Copy of a file/folder to a new location.
	 * @since 16.0
	 */
	COPY_INTO: "copy_into",
	/**
	 * Deletion of an item.
	 * @since 16.0
	 */
	DELETE: "delete",
	/**
	 * Creation of a directory.
	 * @since 16.0
	 */
	MKDIR: "mkdir",
	/**
	 * Move of an item from one location to another.
	 * @since 16.0
	 */
	MOVE: "move",
	/**
	 * Attributes of a file/folder changed.
	 * @since 16.0
	 */
	PUTINFO: "putinfo",
	/**
	 * A resource has been renamed
	 * @deprecated This is not a spec'd event type from the Java API
	 * @since 17.0
	 */
	RENAME: "rename",
	/**
	 * Content written to a file.
	 * @since 16.0
	 */
	WRITE: "write"
});

/*
 * Utils for representing files as objects in the Orion File API
 * http://wiki.eclipse.org/Orion/Server_API/File_API
 */

/**
 * Builds up an array of a directory's children, as File objects.
 * @param {Store} store the file system store
 * @param {String} parentLocation Parent location in the file api for child items (ugh)
 * @param {Array} [exclude] Filenames of children to hide. If `null`, everything is included.
 * @param {Function} callback Invoked as func(error?, children)
 * @returns A promise
 */
var getChildren = exports.getChildren = function(store, fileRoot, workspaceRoot, workspaceDir, directory, depth, excludes) {
	return fs.readdirAsync(directory)
	.then(function(files) {
		return Promise.map(files, function(file) {
			if (Array.isArray(excludes) && excludes.indexOf(file) !== -1) {
				return null; // omit
			}
			var filepath = path.join(directory, file);
			return fs.statAsync(filepath)
			.then(function(stats) {
				return fileJSON(store, fileRoot, workspaceRoot, {workspaceDir: workspaceDir, path: filepath}, stats, depth ? depth - 1 : 0);
			})
			.catch(function() {
				return null; // suppress rejection
			});
		});
	}, /* @callback */ function reject(err) {
		return [];
	})
	.then(function(results) {
		return results.filter(function(r) { return r; });
	}, /* @callback */ function reject(err) {
		return [];
	});
};

/**
 * @parma {String} p A location in the local filesystem (eg C:\\Users\\whatever\\foo)
 * @throws {Error} If p is outside the workspaceDir (and thus is unsafe)
 */
var safePath = exports.safePath = function(workspaceDir, p) {
	let newpath = path.normalize(p);
	var relativePath = path.relative(path.normalize(workspaceDir), newpath);
	if (relativePath.indexOf('..' + path.sep) === 0) {
		throw new Error('Path ' + newpath + ' is outside workspace');
	}
	return newpath;
};

/**
 * @param {String} filepath The URL-encoded path, for example 'foo/My%20Work/baz.txt'
 * @returns {String} The filesystem path represented by interpreting 'path' relative to the workspace dir.
 * The returned value is URL-decoded.
 * @throws {Error} If rest is outside of the workspaceDir (and thus is unsafe)
 */
var safeFilePath = exports.safeFilePath = function(workspaceDir, filepath) {
	return safePath(workspaceDir, path.join(workspaceDir, filepath));
};

/**
 * Fetch the metastore for the given request. This function will throw an exception is the metastore cannot be found.
 * @deprecated Use {@link getMetastoreSafe} instead
 * @param {XMLHttpRequest} req The request
 * @returns {{?}} the metastore
 * @throws {Error} Throws an error if the metastore cannot be found.
 */
var getMetastore = exports.getMetastore = function(req) {
	var ms = req.app.locals.metastore;
	if (!ms) {
		throw new Error("No metastore found");
	}
	return ms;
};

/**
 * Fetch the metastore for the given request in a safe manner using a promise
 * @param {XMLHttpRequest} req The request
 * @returns {Promise} A promise to resolve the metastore
 * @since 18.0
 */
module.exports.getMetastoreSafe = function getMetastoreSafe(req) {
	var ms = req.app.locals.metastore;
	if (!ms) {
		return Promise.reject(new Error("No metastore found"));
	}
	return Promise.resolve(ms);
};

/**
 * Get the file from the workspace
 * @param {?} req The request
 * @param {string} rest The rets of the path
 * @returns {?} 
 */
var getFile = exports.getFile = function(req, rest) {
	if (!rest) {
		return null;
	}
	var store = getMetastore(req);
	if (rest[0] === "/") {
		rest = rest.substring(1);
	}
	var segments = rest.split("/");
	var workspaceId = segments.shift();
	var workspaceDir = store.getWorkspaceDir(workspaceId);
	return {
		workspaceId: workspaceId,
		workspaceDir: workspaceDir,
		path: safeFilePath(workspaceDir, segments.join("/"))
	};
};

/**
 * Collects the parents for thr given file path
 * @param {string} fileRoot The root file path
 * @param {string} relativePath The relative path for the file
 * @param {boolean} includeFolder If the folder itself should be included
 */
var getParents = exports.getParents = function(fileRoot, relativePath, includeFolder) {
	var segs = relativePath.split('/');
	if(segs && segs.length > 0 && segs[segs.length-1] === ""){// pop the last segment if it is empty. In this case wwwpath ends with "/".
		segs.pop();
	}
	if (relativePath[0] === '/') {
		segs.shift();//Remove the empty segment from beginning
	}
	if(!includeFolder) {
		segs.pop();//The last segment now is the directory itself. We do not need it in the parents array.
	}
	var loc = fileRoot;
	var parents = [];
	for (var i=0; i < segs.length; i++) {
		var seg = segs[i];
		loc = api.join(loc, seg);
		var location = loc + "/";
		parents.push({
			Name: seg,
			ChildrenLocation: {pathname: location, query: {depth:1}}, 
			Location: location
		});
	}
	return parents.reverse();
};

/**
 * @description Tries to compute the project path for the given file path
 * @param {Store} store the file system store
 * @param {string} workspaceDir The root workspace directory
 * @param {string} fileRoot The root file path of the server
 * @param {Object} file The file we want the project for
 * @param {?} options The optional map of options to use while looking for a project
 * @returns {Promise} A promise to resolve the project
 * @since 14.0
 */
exports.getProject = function getProject(store, fileRoot, workspaceRoot, file, options) {
	var names = options && typeof options.names === "object" ? options.names : {};
	names['.git'] = {isDirectory: true};
	names['project.json'] = Object.create(null);
	return new Promise(function (resolve, reject) {
		function findProject(filepath) {
			if (filepath.length >= file.workspaceDir.length) {
				getChildren(store, fileRoot, workspaceRoot, file.workspaceDir, filepath, 1).then(function(children) {
					if(Array.isArray(children) && children.length > 0) {
						for(var i = 0, len = children.length; i < len; i++) {
							var c = children[i],
								n = names[c.Name];
							if(n && (c.Directory && n.isDirectory || !c.Directory && !n.isDirectory)) {
								return resolve(filepath);
							}
						}
					}
					findProject(path.dirname(filepath));
				});
			} else {
				return reject(new Error());
			}
		}
		findProject(file.path);
	});
};

/**
 * Performs the equivalent of rm -rf on a directory.
 * @param {Function} callback Invoked as callback(error)
 */
exports.rumRuff = function(dirpath, callback) {
	rimraf(dirpath, callback);
};

/**
 * Copy srcPath to destPath
 * @param {String} srcPath
 * @param {String} destPath
 * @param {Function} callback Invoked as callback(error?, destPath)
 * @returns promise
 */
var copy = exports.copy = function(srcPath, destPath, callback) {
	return new Promise(function(fulfill, reject) {
		return fse.copy(srcPath, destPath, {clobber: true, limit: 32}, function(err) {
			if (err) {
				logger.error(err);
				if (callback) callback(err);
				return reject(err);
			}
			if (callback) callback(null, destPath);
			fulfill(destPath);
		});
	});
};

/**
 * @param {Function} callback Invoked as callback(error, stats)
 * @deprecated just use Promise.promisify(fs).statAsync() instead
 */
exports.withStats = function(filepath, callback) {
	fs.stat(filepath, function(error, stats) {
		if (error) {
			logger.error(error);
			callback(error); 
		}
		else {
			callback(null, stats);
		}
	});
};

exports.decodeSlug = function(slug) {
	if (typeof slug === "string") return decodeURIComponent(slug);
	return slug;
};


exports.encodeSlug = function(slug) {
	if (typeof slug === "string") return encodeURIComponent(slug);
	return slug;
};

/**
 * Gets the stats for filepath and calculates the ETag based on the bytes in the file.
 * @param {Function} callback Invoked as callback(error, stats, etag) -- the etag can be null if filepath represents a directory.
 */
exports.withStatsAndETag = function(filepath, callback) {
	fs.stat(filepath, function(error, stats) {
		if (error) {
			callback(error);
			return;
		}
		if (!stats.isFile()) {
			// no etag
			callback(null, stats, null);
			return;
		}
		var etag = ETag();
		var stream = fs.createReadStream(filepath, {encoding:'utf8'});
		stream.pipe(etag);
		stream.on('error', callback);
		stream.on('end', function() {
			callback(null, stats, etag.read());
		});
	});
};
exports.withETag = function(filepath, callback) {
	var etag = ETag();
	var stream = fs.createReadStream(filepath);
	stream.pipe(etag);
	stream.on('error', callback);
	stream.on('end', function() {
		callback(null, etag.read());
	});
};

/**
 * @returns {String} The Location of for a file resource.
 */
function getFileLocation(fileRoot, wwwpath, isDir) {
	var filepath = api.join(fileRoot, wwwpath);
	if(isDir && filepath.lastIndexOf('/') !== filepath.length-1) {
		filepath += '/';
	}
	return filepath;
}

/**
 * File decorator interface.
 */
exports.FileDecorator = FileDecorator;
function FileDecorator() {
}
Object.assign(FileDecorator.prototype, {
	/**
	 * @callback
	 */
	decorate: function(req, file, json) {
	}
});

var decorators = [];
/**
 * Shared decorator, used by workspace as well.
 */
exports.getDecorators = function(){
	return decorators;
};
/**
 * Used to add different decorators to generate respond json.
 * @param {FileDecorator} decorator to be added;
 */
exports.addDecorator = function(decorator) {
	decorators.push(decorator);
};

/**
 * Helper for fulfilling a file metadata GET request.
 * @param {String} fileRoot The "/file" prefix or equivalent.
 * @param {String} workspaceRoot The "/file" prefix or equivalent.
 * @param {Object} req HTTP request object
 * @param {Object} res HTTP response object
 * @param {String} file The physical path and workspaceDir to the file on the server.
 * @param {Object} stats
 * @param {String} etag
 * @param {Boolean} [includeChildren=false]
 * @param {Object} [metadataMixins] Additional metadata to mix in to the response object.
 */
var writeFileMetadata = exports.writeFileMetadata = function(req, res, fileRoot, workspaceRoot, file, stats, etag, depth, metadataMixins) {
	var result;
	var store = getMetastore(req);
	return fileJSON(store, fileRoot, workspaceRoot, file, stats, depth, metadataMixins)
	.then(function(originalJson) {
		result = originalJson;
		return Promise.map(decorators, function(decorator){
			return decorator.decorate(req, file, result);			
		});
	})
	.then(function(){
		if (etag) {
			result.ETag = etag;
			res.setHeader('ETag', etag);
		}
		return api.writeResponse(null, res, null, result, true, true);
	})
	.catch(api.writeError.bind(null, 500, res));
};
function fileJSON(store, fileRoot, workspaceRoot, file, stats, depth, metadataMixins) {
	depth = depth || 0;
	var isDir = stats.isDirectory();
	var wwwpath = api.toURLPath(file.path.substring(file.workspaceDir.length));
	var getName;
	if (isWorkspaceFile(file)) {
		getName = new Promise(function(resolve, reject) {
			store.getWorkspace(file.workspaceId, function(err, workspace) {
				if (err) return reject(err);
				resolve(workspace.name);
			});
		});
	} else {
		getName = Promise.resolve(path.basename(file.path));
	}
	return getName.then(function(fileName) {
		var result = {
			Name: fileName,
			Location: getFileLocation(fileRoot, wwwpath, isDir),
			Directory: isDir,
			LocalTimeStamp: stats.mtime.getTime(),
			Length: stats.size,
			Parents: getParents(fileRoot, wwwpath)
		};
		if (!isWin) {
			result.Attributes = {
				ReadOnly: !((stats.mode & constants.S_IWUSR) === constants.S_IWUSR),
				Executable: (stats.mode & constants.S_IXUSR) === constants.S_IXUSR
			};
		}
		if (metadataMixins) {
			Object.keys(metadataMixins).forEach(function(property) {
				result[property] = metadataMixins[property];
			});
		}
		result.WorkspaceLocation = workspaceRoot;
		if (!isDir) {
			return Promise.resolve(result);
		}
		// Orion's File Client expects ChildrenLocation to always be present
		result.ChildrenLocation = {pathname: result.Location, query: {depth:1}};
		result.ImportLocation = result.Location.replace(/\/file/, "/xfer/import").replace(/\/$/, "");
		result.ExportLocation = result.Location.replace(/\/file/, "/xfer/export").replace(/\/$/, "") + ".zip";
		if (depth <= 0) {
			return Promise.resolve(result);
		}
		return getChildren(store, fileRoot, workspaceRoot, file.workspaceDir, file.path, depth)
		.then(function(children) {
			result.Children = children;
			return result;
		});
	});
}
/**
 * Returns if the underlying file system is case sensitive
 * @param {?} file The file object
 * @returns {bool} True if the underlying filesystem is case-sensitive, false otherwise; By default, window=true; Mac=false; Linux=false
 * @since 17.0
 */
var isFSCaseInsensitive = exports.isFSCaseInsensitive = function isFSCaseInsensitive(file) {
	if(typeof ISFS_CASE_INSENSITIVE === 'undefined'){
		try {
			var lowerCaseStat = fs.statSync(file.path.toLowerCase());
			var upperCaseStat = fs.statSync(file.path.toUpperCase());
			if(lowerCaseStat && upperCaseStat) {
				return ISFS_CASE_INSENSITIVE = lowerCaseStat.dev === upperCaseStat.dev && lowerCaseStat.ino === upperCaseStat.ino;
			}
		}catch(err){
			if(err.code === 'ENOENT'){
				return ISFS_CASE_INSENSITIVE = false;
			}
		}
		return ISFS_CASE_INSENSITIVE = false;
	}
};
/**
 * Returns if the two files are referencing the same path, not considering the case-sensitivity of the underlying file system, only check if lower case path is same
 * @param {XMLHttpRequest} req The backing request
 * @param {string} fileRoot The file root
 * @param {?} dest The destination file object
 */
var istheSamePath = exports.istheSamePath = function istheSamePath(req, fileRoot, dest) {
	var originalFile = getFile(req, req.body.Location.replace(new RegExp("^"+fileRoot), ""));
	return path.dirname(originalFile.path).toLowerCase() === path.dirname(dest.path).toLowerCase() && dest.path.toLowerCase() === originalFile.path.toLowerCase();
};
function isProjectFile(file) {
	var relativePath = file.path.substr(file.workspaceDir.length);
	if(relativePath.lastIndexOf("/") === relativePath.length - 1){
		relativePath = relativePath.substr(0, relativePath.length - 1);
	}
	return relativePath.split("/").length === 2;
}
function isWorkspaceFile(file) {
	return file.workspaceDir === file.path;
}
function isParentOf(_filePath, _otherPath) {
	var filePath = path.normalize(path.resolve(_filePath));
	var otherPath = path.normalize(path.resolve(_otherPath));
	var root = path.parse(otherPath).root;
	while (otherPath !== root) {
		otherPath = path.dirname(otherPath);
		if (filePath === otherPath) return true;
	}
	return false;
}
/**
 * Helper for fulfilling a file POST request (for example, copy, move, or create).
 * @param {string} workspaceRoot The route of the /workspace handler (not including context path)
 * @param {string} fileRoot The route of the /file handler (not including context path)
 * @param {XMLHttpRequest} req The backing request
 * @param {XMLHttpResponse} res The response
 * @param {?} destFile The destination file object
 * @param {?} metadataMixins Additional metadata to be mixed in to the File response.
 */
exports.handleFilePOST = function(workspaceRoot, fileRoot, req, res, destFile, metadataMixins) {
	var isDirectory = req.body && req.body.Directory,
		xCreateOptions = (req.headers['x-create-options'] || "").split(","),
		isCopy = xCreateOptions.indexOf('copy') !== -1, 
		isMove = xCreateOptions.indexOf('move') !== -1,
		isNonWrite = isCopy || isMove,
		sourceUrl = req.body.Location;
	if (isCopy && isMove) {
		return api.writeResponse(400, res, null, 'Illegal combination of X-Create-Options.', true);
	} else if (isNonWrite && !sourceUrl) {
		return api.writeError(400, res, 'Missing Location property in request body');
	}
	return fs.stat(destFile.path, /* @callback */ function(err, stats) {
		var destExists = true;
		if(err) {
			destExists = false;
			if(err.code !== 'ENOENT') {
				var message = String("Failed to write file to: ").concat(destFile.path.slice(destFile.workspaceDir.length));
				if(isMove) {
					message = String("Failed to move file to: ").concat(destFile.path.slice(destFile.workspaceDir.length));
				} else if(isCopy) {
					message = String("Failed to copy file to: ").concat(destFile.path.slice(destFile.workspaceDir.length));
				}
				return api.writeError(500, res, new Error(message));
			}
		}
		if (xCreateOptions.indexOf('no-overwrite') !== -1 && destExists) {
			if(!isMove || !istheSamePath(req, fileRoot, destFile) || !isFSCaseInsensitive(destFile)){
				return api.writeError(412, res, new Error('A file or folder with the same name already exists at this location.'));
			}
		}
		var project = {};
		if (isNonWrite) {
			var uri = sourceUrl.substring(typeof req.contextPath === 'string' ? req.contextPath.length : 0);
			return req.user.checkRights(req.user.username, uri, req, res, function(){
				var sourceFile = getFile(req, api.decodeURIComponent(sourceUrl.replace(new RegExp("^"+fileRoot), "")));
				return fs.stat(sourceFile.path, function(err, stats) {
					if(err) {
						if (err.code === 'ENOENT') {
							return api.writeError(typeof err.code === 'number' || 404, res, 'File not found:' + sourceUrl);
						}
						return api.writeError(500, res, err);
					}
					if (isParentOf(sourceFile.path, destFile.path)) {
						return api.writeError(400, res, "The destination cannot be a descendent of the source location");
					}
					if (isCopy) {
						return copy(sourceFile.path, destFile.path)
						.then(function() {
							var eventData = { type: ChangeType.RENAME, isDir: stats.isDirectory(), file: destFile, sourceFile: sourceFile, req: req};
							exports.fireFileModificationEvent(eventData);
							return done();
						});
					}
					return fs.rename(sourceFile.path, destFile.path, function(err) {
						if(err) {
							var newerr = new Error("Failed to move project: " + sourceUrl);
							newerr.code = 403;
							return api.writeError(403, res, newerr);
						}
						if (isProjectFile(sourceFile) && stats.isDirectory()) {
							project.originalPath = sourceFile.path;
						}
						var eventData = { type: ChangeType.RENAME, isDir: stats.isDirectory(), file: destFile, sourceFile: sourceFile, req: req};
						exports.fireFileModificationEvent(eventData);
						// Rename always returns 200 no matter the file system is realy rename or creating a new file.
						return done();
					});
				});
			}, "GET");
		}
		function done() {
			var store = exports.getMetastore(req);
			if (isProjectFile(destFile) && isDirectory) {
				project.projectName = path.basename(destFile.path);
				project.contentLocation = destFile.path;
			}
			return (store.createRenameDeleteProject ? store.createRenameDeleteProject(destFile.workspaceId, project) : Promise.resolve())
			.then(function() {
				res.status(destExists ? 200 : 201);
				return fs.stat(destFile.path, function(err, stats) {
					if(err) {
						logger.error(err);
						return api.writeError(500, res, err.message);
					}
					return writeFileMetadata(req, res, api.join(fileRoot, destFile.workspaceId), api.join(workspaceRoot, destFile.workspaceId), destFile, stats, /*etag*/null, /*depth*/0, metadataMixins);
				});
			})
			.catch(function(err) {
				return api.writeError(500, res, err);
			});
		}
		function writeNew() {
			if (isDirectory) {
				return fs.mkdir(destFile.path, function(err) {
					if(err) {
						return api.writeError(500, res, "Failed to create new folder: " + destFile.path);
					}
					exports.fireFileModificationEvent({type: ChangeType.MKDIR, file: destFile, req: req});
					done();
				});
			}
			var eventData = { type: ChangeType.WRITE, file: destFile, req: req};
			return fs.writeFile(destFile.path, '', function(err) {
				if(err) {
					return api.writeError(500, res, "Failed to create new file: " + destFile.path);
				}
				exports.fireFileModificationEvent(eventData);
				done();
			});
		}
		if(destExists) {
			return fs.unlink(destFile.path, function(err) {
				if(err) {
					return api.writeError(500, res, "Failed to unlink file: " + destFile.path);
				}
				writeNew();
			});
		}
		writeNew();
	});
};

exports.deleteFile = function(req, file, matchEtag, callback) {
	exports.withStatsAndETag(file.path, function(error, stats, etag) {
		var store = exports.getMetastore(req);
		function done(error) {
			if (error) {
				error.code = 500;
				callback(error);
				return;
			}
			var eventData = { type: exports.ChangeType.DELETE, file: file, req: req};
			exports.fireFileModificationEvent(eventData);
			callback(null);
		}
		function checkMetadata(error) {
			if (!error) {
				if (file.path === file.workspaceDir) {
					return store.deleteWorkspace(file.workspaceId, done);
				} else if (store.createRenameDeleteProject && isProjectFile(file)) {
					return store.createRenameDeleteProject(file.workspaceId, {originalPath: file.path})
					.then(done, done);
				}
			}
			done(error);
		}
		if (error) {
			if(error.code === 'ENOENT') {
				return checkMetadata();
			} else if(error.code === 'ENAMETOOLONG') {
				var err = new Error("Requested file path is too long");
				err.code = 400;
				return callback(err);
			} else if(error.code === 'ENOTDIR') {
				var err = new Error("Requested folder path is invalid");
				err.code = 400;
				return callback(err);
			}
		} else if (matchEtag && matchEtag !== etag) {
			var err = new Error("");
			err.code = 412;
			return callback(err);
		}
		if (stats.isDirectory()) {
			exports.rumRuff(file.path, function(err){
				if (err) {
					logger.error(err);
					return done(err);
				}
				
				checkMetadata();
			});
		} else {
			fs.unlink(file.path, checkMetadata);
		}
	});
};

var _listeners = new Map();
exports.addFileModificationListener = function(listenerId, theListener) {
	if(listenerId && typeof listenerId === 'object') {
		//unnamed listener, the legacy way
		var arr = _listeners.get('<legacy>');
		if(!Array.isArray(arr)) {
			arr = [];
		}
		arr.push(listenerId);
		_listeners.set('<legacy>', arr);
	} else {
		_listeners.set(listenerId, theListener);
	}
};

/**
 * Removes the listener with the given identifier. If no identifier is given the last 
 * legacy listener to be registered is removed
 * @param {string} id The identifier of the listener to remove
 * @since 17.0
 */
exports.removeFileModificationListener = function(id) {
	if(id) {
		_listeners.delete(id);
	} else {
		var arr = _listeners.get('<legacy>');
		if(Array.isArray(arr)) {
			arr.pop();
			_listeners.set('<legacy>', arr);
		}
	}
};

/**
 * Fire the given event to all regsitered listeners
 * @param {?} eventData The event object
 * @see {ChangeType} For a listing of available event types
 */
exports.fireFileModificationEvent = function(eventData) {
	_listeners.forEach(/* @callback */ function(val, key, map) {
		if(typeof val.handleFileModficationEvent === 'function') {
			//logger.debug('notifying "'+key+'" ('+eventData.type+'): '+JSON.stringify(eventData.file, null, '\t'));
			val.handleFileModficationEvent(eventData);
		} else if(Array.isArray(val)) {
			val.forEach(function(listener) {
				if(typeof listener.handleFileModficationEvent === 'function') {
					//logger.debug('notifying legacy listener ('+eventData.type+'): '+JSON.stringify(eventData.file, null, '\t'));
					listener.handleFileModficationEvent(eventData);
				}
			})
		}
	});
};
