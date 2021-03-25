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
/*eslint-env node */
var api = require('../api'), writeError = api.writeError, writeResponse = api.writeResponse,
	git = require('nodegit'),
	async = require('async'),
	url = require('url'),
	clone = require('./clone'),
	express = require('express'),
	responseTime = require('response-time');

module.exports = {};

module.exports.router = function(options) {
	var fileRoot = options.fileRoot;
	var gitRoot = options.gitRoot;
	if (!fileRoot) { throw new Error('options.fileRoot is required'); }
	if (!gitRoot) { throw new Error('options.gitRoot is required'); }

	var contextPath = options && options.configParams.get("orion.context.path") || "";
	fileRoot = fileRoot.substring(contextPath.length);

	module.exports.tagJSON = tagJSON;

	return express.Router()
	.use(responseTime({digits: 2, header: "X-GitapiTags-Response-Time", suffix: true}))
	.use(options.checkUserAccess)
	.get(fileRoot + '*', getTags)
	.get('/:tagName*', getTags)
	.delete('/:tagName*', deleteTag);

function tagJSON(fullName, shortName, sha, timestamp, fileDir, annotated) {
	return {
		"FullName": fullName,
		"Name": shortName,
		"CloneLocation": gitRoot + "/clone" + fileDir,
		"CommitLocation": gitRoot + "/commit/" + sha + fileDir,
		"LocalTimeStamp": timestamp,
		"Location": gitRoot + "/tag/" + api.encodeURIComponent(shortName) + fileDir,
		"TagType": annotated ? "ANNOTATED" : "LIGHTWEIGHT",
		"TreeLocation": gitRoot + "/tree" + fileDir + "/" + api.encodeURIComponent(shortName),
		"Type": "Tag"
	};
}

function getTagCommit(repo, ref) {
	return repo.getReferenceCommit(ref)
	.catch(function() {
		return repo.getTagByName(ref.shorthand())
		.then(function(tag){
			return repo.getCommit(tag.targetId());
		});
	});
}

/**
 * @param {NodeGit.Repository} repo the Git repository that owns the given referenced
 * @param {NodeGit.Reference} ref the reference to check whether it's pointing at an annotated tag or not
 * @return {boolean|String} <tt>true</tt> if the reference points at an annotated tag,
 * 							<tt>false</tt> if it points at a commit object,
 * 							a <tt>String</tt> error message if it points at another Git object type
 */
function isAnnotated(repo, ref) {
	// get the object being referenced and check its type
	return git.Object.lookup(repo, ref.target(), git.Object.TYPE.ANY)
	.then(function(object) {
		var type = object.type();
		if (type === git.Object.TYPE.TAG) {
			// referenced object is a tag, annotated tag then
			return true;
		} else if (type !== git.Object.TYPE.COMMIT) {
			// otherwise, should be pointing at a commit and not an annotated tag,
			// but if not, then something is wrong
			return "Invalid object type found for '" + theRef.name() + "' (" + type + ")";
		}
		return false;
	});
}

function getTags(req, res) {
	var tagName = api.decodeURIComponent(req.params.tagName || "");
	var fileDir;
	var query = req.query;
	var page = Number(query.page) || 1;
	var filter = query.filter;
	var pageSize = Number(query.pageSize) || Number.MAX_SAFE_INTEGER;

	var theRepo, theRef;
	var tags = [];
	var count = 0, tagCount = 0;

	if (tagName) {
		return clone.getRepo(req)
		.then(function(repo) {
			theRepo = repo;
			fileDir = clone.getfileDir(repo,req);
			return git.Reference.lookup(theRepo, "refs/tags/" + tagName);
		})
		.then(function(ref) {
			theRef = ref;
			// get the object being referenced and check its type
			return isAnnotated(theRepo, ref);
		})
		.then(function(annotated) {
			if (typeof annotated === 'string') {
				return writeError(400, res, annotated);
			}

			return getTagCommit(theRepo, theRef)
			.then(function(commit) {
				writeResponse(200, res, null, tagJSON(theRef.name(), theRef.shorthand(), commit.sha(), commit.timeMs(), fileDir, annotated), true);
			});
		})
		.catch(function(err) {
			writeError(404, res, err.message);
		})
		.finally(function() {
			clone.freeRepo(theRepo);
		});
	}

	return clone.getRepo(req)
	.then(function(repo) {
		theRepo = repo;
		fileDir = clone.getfileDir(repo,req);
		return git.Reference.list(theRepo);
	})
	.then(function(referenceList) {
		referenceList = referenceList.filter(function(ref) {
			if (ref.indexOf("refs/tags/") === 0) {
				var shortname = ref.replace("refs/tags/", "");
				if (!filter || shortname.indexOf(filter) !== -1) {
					if (!page || count++ >= (page-1)*pageSize && tagCount <= pageSize) {
						tagCount++;
						return true;
					}
				}
			}
		});
		return Promise.all(referenceList.map(function(ref) {
			return git.Reference.lookup(theRepo, ref);
		}))
		.then(function(referenceList) {
			return new Promise(function(fulfill) {
				async.each(referenceList, function(ref,callback) {
					isAnnotated(theRepo, ref)
					.then(function(annotated) {
						if (typeof annotated === 'string') {
							return writeError(400, res, annotated);
						}
						getTagCommit(theRepo, ref)
						.then(function(commit) {
							tags.push(tagJSON(ref.name(), ref.shorthand(), commit.sha(), commit.timeMs(), fileDir, annotated));
							callback();
						})
						.catch(function(err) {
							// ignore errors looking up commits
							tags.push(tagJSON(ref.name(), ref.shorthand(), ref.target().toString(), 0, fileDir, annotated));
							callback();
						});
					});
				}, function(err) {
					fulfill();
					if (err) {
						return writeError(403, res);
					}
					var resp = {
						"Children": tags,
						"Type": "Tag",
					};
		
					if (page && page*pageSize < count) {
						var nextLocation = url.parse(req.originalUrl, true);
						nextLocation.query.page = page + 1 + "";
						nextLocation.search = null; //So that query object will be used for format
						nextLocation.pathname = api.decodeStringLocation(nextLocation.pathname);
						resp['NextLocation'] = nextLocation;
					}
		
					if (page && page > 1) {
						var prevLocation = url.parse(req.originalUrl, true);
						prevLocation.query.page = page - 1 + "";
						prevLocation.search = null;
						prevLocation.pathname = api.decodeStringLocation(prevLocation.pathname);
						resp['PreviousLocation'] = prevLocation;
					}
		
					writeResponse(200, res, null, resp, true);
				});
			});
		});
	})
	.catch(function(err) {
		writeError(403, res, err.message);
	})
	.finally(function() {
		clone.freeRepo(theRepo);
	});
}

function deleteTag(req, res) {
	var theRepo;
	var tagName = api.decodeURIComponent(req.params.tagName);
	return clone.getRepo(req)
	.then(function(repo) {
		theRepo = repo;
		return git.Tag.delete(repo, tagName);
	})
	.then(function(resp) {
		if (!resp) {
			writeResponse(200, res)
		} else {
			writeError(403, res);
		} 
	})
	.catch(function(err) {
		writeError(403, res, err.message);
	})
	.finally(function() {
		clone.freeRepo(theRepo);
	});
}
};
