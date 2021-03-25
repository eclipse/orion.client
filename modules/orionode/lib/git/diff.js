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
/*eslint-env node */
var git = require('nodegit'),
	url = require('url'),
	api = require('../api'), writeError = api.writeError, writeResponse = api.writeResponse,
	clone = require('./clone'),
	fs = require('fs'),
	path = require('path'),
	mkdirp = require('mkdirp'),
	mDiff = require('diff'),
	request = require('request'),
	multiparty = require('multiparty'),
	express = require('express'),
	async = require('async'),
	responseTime = require('response-time');

module.exports = {};

module.exports.router = function(options) {
	var fileRoot = options.fileRoot;
	var gitRoot = options.gitRoot;
	if (!fileRoot) { throw new Error('options.fileRoot is required'); }
	if (!gitRoot) { throw new Error('options.gitRoot is required'); }
	
	var contextPath = options && options.configParams.get("orion.context.path") || "";
	fileRoot = fileRoot.substring(contextPath.length);
	
	module.exports.changeType = changeType;

	return express.Router()
	.use(responseTime({digits: 2, header: "X-GitapiDiff-Response-Time", suffix: true}))
	.use(options.checkUserAccess)
	.get(fileRoot + '*', getDiff)
	.get('/:scope'+ fileRoot + '*', getDiff)
	.post('/:scope'+ fileRoot + '*', postDiff);

function getDiff(req, res) {
	var query = req.query;
	var parts = (query.parts || "").split(",");
	var ignoreWS = query.ignoreWS === "true";
	var paths = query.Path;
	var scope = api.decodeURIComponent(req.params.scope || "");
	var filePath; 
	
	var diff, repo;
	return clone.getRepo(req)
	.then(function(r) {
		repo = r;
		filePath = clone.getfileRelativePath(repo,req); 
		var fileDir = clone.getfileDir(repo,req); 
		var includeURIs = parts.indexOf("uris") !== -1;
		var includeDiff = parts.indexOf("diff") !== -1;
		var includeDiffs = parts.indexOf("diffs") !== -1;
		var URIs, diffContents = [], diffs = [];
		if (includeURIs) {
			var p = api.toURLPath(path.join(fileDir, filePath));
			URIs = {
				"BaseLocation": getBaseLocation(scope, p),
				"CloneLocation": gitRoot + "/clone" + fileDir,
				"Location": path.join(gitRoot, "/diff", api.encodeURIComponent(scope), fileDir, filePath),
				"NewLocation": getNewLocation(scope, p, req.contextPath),
				"OldLocation": getOldLocation(scope, p),
				"Type": "Diff"
			};
		}
		if (includeDiffs) {
			diffs = {
				"Type": "Diff",
				"Children": []
			};
		}
		function done() {
			var body = "";
			if (includeDiff && includeURIs) {
				body += "--BOUNDARY\n";
				body += "Content-Type: application/json\n\n";
				body += JSON.stringify(api.encodeLocation(URIs));
				body += "--BOUNDARY\n";
				body += "Content-Type: plain/text\n\n";
				body += diffContents.join("");
				res.setHeader('Content-Type', 'multipart/related; boundary="BOUNDARY"');
			} else if (includeDiff) {
				body += diffContents.join("");
				api.setResponseNoCache(res);
				res.setHeader("Content-Disposition", "attachment; filename=\"changes.patch\"");
				res.setHeader('Content-Type', 'plain/text');
			} else if (includeDiffs) {
				body += JSON.stringify(api.encodeLocation(diffs));
				res.setHeader('Content-Type', 'application/json');
			} else if (includeURIs) {
				body += JSON.stringify(api.encodeLocation(URIs));
				res.setHeader('Content-Type', 'application/json');
			}
			return writeResponse(200, res, null, body);
		}
		if (includeDiff || includeDiffs) {
			var diffOptions = getOptions(ignoreWS, filePath, paths);
			if (scope.indexOf("..") !== -1) {
				diff = getDiffBetweenTwoCommits(repo, scope.split(".."), diffOptions);
			} else if (scope === "Default") {
				diff = getDiffBetweenWorkingTreeAndHead(repo, diffOptions);
			} else if (scope === "Cached") {
				diff = getDiffBetweenIndexAndHead(repo, diffOptions);
			} else {
				diff = getDiffBetweenWorkingTreeAndHead(repo, diffOptions);
			}
			return diff
			.then(function(diff) {
				return processDiff(diff, filePath, paths, fileDir, includeDiff, includeDiffs, query, scope, diffContents, diffs);
			})
			.then(done)
			.catch(function(err) {
				writeError(404, res, err.message);
			});
		}
		done();
	})
	.catch(function(err) {
		writeError(404, res, err.message);
	})
	.finally(function() {
		clone.freeRepo(repo);
	});
}

function changeType(patch) {
	if (patch.isAdded()) return "ADD";
	if (patch.isDeleted()) return "DELETE";
	if (patch.isModified()) return "MODIFY";
	return "";
}

function getOldLocation(scope, path) {
	if (scope.indexOf("..") !== -1) {
		var commits = scope.split("..");
		return {pathname: gitRoot + "/commit/" + api.encodeURIComponent(commits[0]) + path, query: {parts: "body"}};
	} else if (scope === "Cached") {
		return {pathname: gitRoot + "/commit/HEAD" + path, query: {parts: "body"}};
	} else if (scope === "Default") {
		return gitRoot + "/index" + path;
	}
	return {pathname: gitRoot + "/commit/" + api.encodeURIComponent(scope) + path, query: {parts: "body"}};
}

function getNewLocation(scope, path ,contextPath) {
	if (scope.indexOf("..") !== -1) {
		var commits = scope.split("..");
		return {pathname: gitRoot + "/commit/" + api.encodeURIComponent(commits[1]) + path, query: {parts: "body"}};
	} else if (scope === "Cached") {
		return gitRoot + "/index" + path;
	}
	if (path.startsWith(fileRoot)) {
		path = contextPath + path; // Since git endpoint's fileRoot doesn't have contextPath part
	}
	return path;
}

function getBaseLocation(scope, path) {
	if (scope.indexOf("..") !== -1) {
		var commits = scope.split("..");
		//TODO find merge base
		return {pathname: gitRoot + "/commit/" + api.encodeURIComponent(commits[1]) + path, query: {parts: "body"}};
	} else if (scope === "Cached") {
		return {pathname: gitRoot + "/commit/HEAD" + path, query: {parts: "body"}};
	}
	return gitRoot + "/index" + path;
}

function processDiff(diff, filePath, paths, fileDir, includeDiff, includeDiffs, query, scope, diffContents, diffs) {
	var result = [];
	if (includeDiff) {
		result.push(diff.toBuf(git.Diff.FORMAT.PATCH)
		.then(function(buf) {
			diffContents.push(buf.toString());
		}));
	}
	if (includeDiffs) {
		var page = Number(query.page) || 1;
		var pageSize = Number(query.pageSize) || Number.MAX_SAFE_INTEGER;
		result.push(diff.patches()
		.then(function(patches) {
			var start = pageSize * (page - 1);
			var end = Math.min(pageSize + start, patches.length);
			var i = start;
			patches.forEach(function(patch, pi) {
				var newFile = patch.newFile();
				var newFilePath = newFile.path();
				var oldFile = patch.oldFile();
				var oldFilePath = oldFile.path();
				// Need when both filePath and paths are set, otherwise options.pathspec will take care of filtering the patches
				if ((!filePath || newFilePath.startsWith(filePath)) && (!paths || paths.indexOf(newFilePath) !== -1)) {
	
					if (start <= pi && pi < end) {
						i = pi;
						var type = changeType(patch);
						var p1 = api.toURLPath(path.join(fileDir, type !== "Deleted" ? newFilePath : oldFilePath));
						diffs.Children.push({
							"ChangeType": type,
							"ContentLocation": p1,
							"DiffLocation": gitRoot + "/diff/" + api.encodeURIComponent(scope) + p1,
							"NewPath": newFilePath,
							"OldPath": oldFilePath,
							"Type": "Diff"
						});
					}
				}
			});
			diffs.Length = patches.length;
			if (i < patches.length - 1) {
				diffs.NextLocation  = {pathname: gitRoot + "/diff/" + scope + fileDir, query: {page: page + 1, pageSize:pageSize}};
			}
		}));
	}
	return Promise.all(result);
}

function getOptions(ignoreWS, filePath, paths) {
	var result = {
		flags: ignoreWS ? git.Diff.OPTION.IGNORE_WHITESPACE : 0
	};
	if (filePath) {
		result.pathspec = filePath;	
	} else if (paths) {
		result.pathspec = paths;
	}
	return result;
}

function getDiffBetweenWorkingTreeAndIndex(repo, options) {
	options.flags |=
		git.Diff.OPTION.SHOW_UNTRACKED_CONTENT |
		git.Diff.OPTION.INCLUDE_UNTRACKED | 
		git.Diff.OPTION.RECURSE_UNTRACKED_DIRS |
		git.Diff.OPTION.IGNORE_SUBMODULES;
	return git.Diff.indexToWorkdir(repo, null, options);
}

function getDiffBetweenIndexAndHead(repo, options) {
	return repo.head()
	.then(function(ref) {
		return repo.getReferenceCommit(ref);
	})
	.then(function(commit) {
		return commit.getTree();
	})
	.then(function(tree) {
		return git.Diff.treeToIndex(repo, tree, null, options);
	});
}

function getDiffBetweenWorkingTreeAndHead(repo, options) {
	options.flags |=
		git.Diff.OPTION.SHOW_UNTRACKED_CONTENT |
		git.Diff.OPTION.INCLUDE_UNTRACKED | 
		git.Diff.OPTION.RECURSE_UNTRACKED_DIRS |
		git.Diff.OPTION.IGNORE_SUBMODULES;
	return repo.head()
	.then(function(ref) {
		return repo.getReferenceCommit(ref);
	})
	.then(function(commit) {
		return commit.getTree();
	})
	.then(function(tree) {
		return git.Diff.treeToWorkdir(repo, tree, options);
	});
}

function getDiffBetweenTwoCommits(repo, commits, options) {
	var tree1;
	var tree2;

	return repo.getCommit(commits[0])
	.then(function(commit) {
		return commit.getTree();
	})
	.then(function(tree) {
		tree1 = tree;
	})
	.then(function() {
		return repo.getCommit(commits[1]);
	})
	.then(function(commit) {
		return commit.getTree();
	})
	.then(function(tree) {
		tree2 = tree;
	})
	.then(function() {
		return git.Diff.treeToTree(repo, tree1, tree2, options);
	});
}

function applyPatch(req, res) {
	var theRepo;
	return clone.getRepo(req)
	.then(function(repo) {
		theRepo = repo;
		var radio = "", patchUrl = "", file = "";
		var form = new multiparty.Form();
		form.on("part", function(part) {
			if (part.name === "radio") {
				part.on("data", function(d) {
					radio += d;
				});
			}
			if (part.name === "url") {
				part.on("data", function(d) {
					patchUrl += d;
				});
			}
			if (part.name === "uploadedfile") {
				part.on("data", function(d) {
					file += d;
				});
			}
			part.resume();
		});
		form.on("error", function(err) {
			clone.freeRepo(theRepo);
			writeError(404, res, err.message);
		});
		form.on('close', function() {
			function apply() {
				var failed = [], successed = [];
				mDiff.applyPatches(file, {
					getUnprefixFile: function(f) {
						return f.split("/").slice(1).join("/");
					},
					getFile: function(f) {
						return path.join(repo.workdir(), this.getUnprefixFile(f));
					},
					loadFile: function(index, cb) {
						if (!index.oldFileName) {
							return cb({message: "Patch is not valid: missing old file name."});
						}
						if (index.oldFileName === "/dev/null") {
							return cb(null, "");
						}
						fs.readFile(this.getFile(index.oldFileName), "utf8", cb);
					},
					patched: function(index, content, cb) {
						if (content === false || !index.newFileName) {
							failed.push(index);
							cb();
							return;
						}
						successed.push(index);
						if (index.newFileName === "/dev/null") {
							fs.unlink(this.getFile(index.oldFileName));
							cb();
							return;
						}
						var fileName = this.getFile(index.newFileName);
						mkdirp(path.dirname(fileName), function (err) {
							if (err) {
								failed.push(index);
								cb(err);
								return;
							}
							fs.writeFile(fileName, content, "utf8", function(err) {
								if (err) {
									failed.push(index);
									cb(err);
									return;
								}
							});
						});
						cb();
						return;
					},
					complete: function(err) {
						if (err) {
							clone.freeRepo(theRepo);
							return writeError(404, res, err.message);
						}
						var jsonData = {
							modifiedFiles: successed.map(function(index) {
								return this.getUnprefixFile(index.oldFileName);
							}.bind(this))
						};
						if (failed.length) {
							var result = {
								Message: "Some files did not apply: " + failed.map(function(index) {
									return this.getUnprefixFile(index.oldFileName);
								}.bind(this)).join(","),
								HttpCode: 400,
								Code: 0,
								JsonData: jsonData
							};
							clone.freeRepo(theRepo);
							return writeResponse(400, res, null, result);
						}
						clone.freeRepo(theRepo);
						writeResponse(200, res, null, {
							Message: "Ok",
							HttpCode: 200,
							JsonData: jsonData
						});
					}
				});
			}
			if (radio === "fileRadio") {
				apply();
			} else if (radio === "urlRadio") {
				request(patchUrl, function (error, response, body) {
					if (!error && response.statusCode === 200) {
						file = body;
						apply();
					} else {
						clone.freeRepo(theRepo);
						writeError(404, res, "Fail to fetch url");
					}
				});
			}
		});
		form.parse(req);
	})
	.catch(function(err) {
		clone.freeRepo(theRepo);
		writeError(404, res, err.message);
	});
}

function postDiff(req, res) {
	if (req.get('Content-Type').indexOf("multipart") === 0) {
		return applyPatch(req, res);
	}
	var newCommit = req.body.New;
	var originalUrl = url.parse(req.originalUrl, true);
	var segments = originalUrl.pathname.split("/");
	var contextPathSegCount = req.contextPath.split("/").length - 1;
	segments[3 + contextPathSegCount] = segments[3 + contextPathSegCount] + ".." + api.encodeStringLocation(api.encodeURIComponent(newCommit));
	var location = url.format({pathname: segments.join("/"), query: originalUrl.query});
	writeResponse(200, res, {'Location':location}, {Location: location}, false); // Avoid triple encoding
}
};
