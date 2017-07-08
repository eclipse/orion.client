/*******************************************************************************
 * Copyright (c) 2012, 2016, 2017 IBM Corporation and others.
 * All rights reserved. This program and the accompanying materials are made 
 * available under the terms of the Eclipse Public License v1.0 
 * (http://www.eclipse.org/legal/epl-v10.html), and the Eclipse Distribution 
 * License v1.0 (http://www.eclipse.org/org/documents/edl-v10.html). 
 *
 * Contributors:
 *     IBM Corporation - initial API and implementation
 *******************************************************************************/
/*eslint-env node*/
/*eslint-disable consistent-return*/
var ETag = require('./util/etag');
var path = require('path');
var Promise = require('bluebird');
var rimraf = require('rimraf');
var fse = require('fs-extra');
var api = require('./api');

var fs = Promise.promisifyAll(require('fs'));

/*
 * Utils for representing files as objects in the Orion File API
 * http://wiki.eclipse.org/Orion/Server_API/File_API
 */

/**
 * Builds up an array of a directory's children, as File objects.
 * @param {String} parentLocation Parent location in the file api for child items (ugh)
 * @param {Array} [exclude] Filenames of children to hide. If `null`, everything is included.
 * @param {Function} callback Invoked as func(error?, children)
 * @returns A promise
 */
var getChildren = exports.getChildren = function(fileRoot, workspaceRoot, workspaceDir, directory, depth, excludes) {
	return fs.readdirAsync(directory)
	.then(function(files) {
		return Promise.map(files, function(file) {
			if (Array.isArray(excludes) && excludes.indexOf(file) !== -1) {
				return null; // omit
			}
			var filepath = path.join(directory, file);
			return fs.statAsync(filepath)
			.then(function(stats) {
				return fileJSON(fileRoot, workspaceRoot, {workspaceDir: workspaceDir, path: filepath}, stats, depth ? depth - 1 : 0);
			})
			.catch(function() {
				return null; // suppress rejection
			});
		});
	}, function reject(err) {
		return [];
	})
	.then(function(results) {
		return results.filter(function(r) { return r; });
	}, function reject(err) {
		return [];
	});
};

/**
 * @parma {String} p A location in the local filesystem (eg C:\\Users\\whatever\\foo)
 * @throws {Error} If p is outside the workspaceDir (and thus is unsafe)
 */
var safePath = exports.safePath = function(workspaceDir, p) {
	workspaceDir = path.normalize(workspaceDir);
	p = path.normalize(p);
	var relativePath = path.relative(workspaceDir, p);
	if (relativePath.indexOf('..' + path.sep) === 0) {
		throw new Error('Path ' + p + ' is outside workspace');
	}
	return p;
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

var getMetastore = exports.getMetastore = function(req) {
	var ms = req.app.locals.metastore;
	if (!ms) {
		throw new Error("No metastore found");
	}
	return ms;
};

var getFile = exports.getFile = function(req, rest) {
	if (!rest) return null;
	var store = getMetastore(req);
	if (rest[0] === "/") rest = rest.substring(1);
	var segments = rest.split("/");
	var workspaceId = segments.shift();
	var workspaceDir = store.getWorkspaceDir(workspaceId);
	return {
		workspaceId: workspaceId,
		workspaceDir: workspaceDir,
		path: safeFilePath(workspaceDir, segments.join("/"))
	};
};

var getParents = exports.getParents = function(fileRoot, relativePath, includeFolder) {
	var segs = relativePath.split('/');
	if(segs && segs.length > 0 && segs[segs.length-1] === ""){// pop the last segment if it is empty. In this case wwwpath ends with "/".
		segs.pop();
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
 * @param {string} workspaceDir The root workspace directory
 * @param {string} fileRoot The root file path of the server
 * @param {Object} file The file we want the project for
 * @param {?} options The optional map of options to use while looking for a project
 * @returns {Promise} A promise to resolve the project
 * @since 14.0
 */
exports.getProject = function getProject(fileRoot, workspaceRoot, file, options) {
	var names = options && typeof options.names === "object" ? options.names : {};
	names['.git'] = {isDirectory: true};
	names['project.json'] = Object.create(null);
	return new Promise(function (resolve, reject) {
		function findProject(filepath) {
			if (filepath.length >= file.workspaceDir.length) {
				getChildren(fileRoot, workspaceRoot, file.workspaceDir, filepath, 1).then(function(children) {
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
				reject();
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
		if (error) { callback(error); }
		else {
			callback(null, stats);
		}
	});
};

exports.decodeSlug = function(slug) {
	if (typeof slug === "string") return decodeURIComponent(slug);
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
		var stream = fs.createReadStream(filepath);
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
 * Gets a boolean associated with a key. Copes with Orion server REST API's use of "true" and "false" strings.
 * @param {Object} obj
 * @param {String} key
 * @returns {Boolean} Returns <code>false</code> if there is no such key, or if the value is not the boolean <code>true</code> 
 * or the string <code>"true"</code>.
 */
function getBoolean(obj, key) {
	var val = obj[key];
	return Object.prototype.hasOwnProperty.call(obj, key) && (val === true || val === 'true');
}

/**
 * File decorator interface.
 */
exports.FileDecorator = FileDecorator;
function FileDecorator() {
}
Object.assign(FileDecorator.prototype, {
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
	return fileJSON(fileRoot, workspaceRoot, file, stats, depth, metadataMixins)
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
function fileJSON(fileRoot, workspaceRoot, file, stats, depth, metadataMixins) {
	depth = depth || 0;
	var isDir = stats.isDirectory();
	var wwwpath = api.toURLPath(file.path.substring(file.workspaceDir.length + 1));
	var result = {
		Name: path.basename(file.path),
		Location: getFileLocation(fileRoot, wwwpath, isDir),
		Directory: isDir,
		LocalTimeStamp: stats.mtime.getTime(),
		Parents: getParents(fileRoot, wwwpath),
		Attributes: {
			// TODO fix this
			ReadOnly: false, //!(stats.mode & USER_WRITE_FLAG === USER_WRITE_FLAG),
			Executable: false //!(stats.mode & USER_EXECUTE_FLAG === USER_EXECUTE_FLAG)
		}
	};
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
	return getChildren(fileRoot, workspaceRoot, file.workspaceDir, file.path, depth)
	.then(function(children) {
		result.Children = children;
		return result;
	});
}

/**
 * Helper for fulfilling a file POST request (for example, copy, move, or create).
 * @param {String} workspaceRoot The route of the /workspace handler (not including context path)
 * @param {String} fileRoot The route of the /file handler (not including context path)
 * @param {Object} req
 * @parma {Object} res
 * @param {String} wwwpath
 * @param {String} destFile
 * @param {Object} [metadata] Additional metadata to be mixed in to the File response.
 * @param {Number} [statusCode] Status code to send on a successful response. By default, `201 Created` is sent if
 * a new resource was created, and and `200 OK` if an existing resource was overwritten.
 */
exports.handleFilePOST = function(workspaceRoot, fileRoot, req, res, destFile, metadataMixins, statusCode) {
	var isDirectory = req.body && getBoolean(req.body, 'Directory');
	var writeResponse = function(isOverwrite) {
		// TODO: maybe set ReadOnly and Executable based on fileAtts
		if (typeof statusCode === 'number') {
			res.status(statusCode);
		} else {
			// Status code 200 indicates that an existing resource was replaced, or we're POSTing to a URL
			res.status(isOverwrite ? 200 : 201);
		}
		return fs.statAsync(destFile.path)
		.then(function(stats) {
			return writeFileMetadata(req, res, api.join(fileRoot, destFile.workspaceId), api.join(workspaceRoot, destFile.workspaceId), destFile, stats, /*etag*/null, /*depth*/0, metadataMixins);
		})
		.catch(function(err) {
			api.writeError(500, res, err.message);
		});
	};
	fs.statAsync(destFile.path)
	.catchReturn({ code: 'ENOENT' }, null) // suppress reject when file does not exist
	.then(function(stats) {
		return !!stats; // just return whether the file existed
	})
	.then(function(destExists) {
		var xCreateOptions = (req.headers['x-create-options'] || "").split(",");
		var isCopy = xCreateOptions.indexOf('copy') !== -1, isMove = xCreateOptions.indexOf('move') !== -1;
		if (isCopy && isMove) {
			return api.writeResponse(400, res, null, 'Illegal combination of X-Create-Options.', true);
		}
		if (xCreateOptions.indexOf('no-overwrite') !== -1 && destExists) {
			return api.writeError(412, res, new Error('A file or folder with the same name already exists at this location.'));
		}

		if (isCopy || isMove) {
			var sourceUrl = req.body.Location;
			if (!sourceUrl) {
				return api.writeError(400, res, 'Missing Location property in request body');
			}
			var sourceFile = getFile(req, sourceUrl.replace(new RegExp("^"+fileRoot), ""));
			return fs.statAsync(sourceFile.path)
			.then(function(/*stats*/) {
				return isCopy ? copy(sourceFile.path, destFile.path) : fs.renameAsync(sourceFile.path, destFile.path);
			})
			.then(writeResponse.bind(null, destExists))
			.catch(function(err) {
				if (err.code === 'ENOENT') {
					return api.writeError(404, res, 'File not found:' + sourceUrl);
				}
				return api.writeError(500, res, err);
			});
		}
		// Just a regular file write
		return Promise.resolve()
		.then(function(){
			return destExists ? fs.unlinkAsync(destFile.path) : null;
		})
		.then(function() {
			return isDirectory ? fs.mkdirAsync(destFile.path) : fs.writeFileAsync(destFile.path, '');
		})
		.then(writeResponse.bind(null, destExists))
		.catch(api.writeError.bind(null, 500, res));
	});
};
