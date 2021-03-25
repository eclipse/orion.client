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
	diff = require("./diff"),
	mTags = require("./tags"),
	clone = require("./clone"),
	git = require('nodegit'),
	url = require('url'),
	crypto = require('crypto'),
	async = require('async'),
	express = require('express'),
	remotes = require('./remotes'),
	branches = require('./branches'),
	tasks = require('../tasks'),
	responseTime = require('response-time');

module.exports = {};

module.exports.router = function(options) {
	var fileRoot = options.fileRoot;
	var gitRoot = options.gitRoot;
	if (!fileRoot) { throw new Error('options.fileRoot is required'); }
	if (!gitRoot) { throw new Error('options.gitRoot is required'); }
	
	var contextPath = options && options.configParams.get("orion.context.path") || "";
	fileRoot = fileRoot.substring(contextPath.length);
	
	module.exports.commitJSON = commitJSON;
	module.exports.getDiff = getDiff;
	module.exports.getCommitParents = getCommitParents;

	return express.Router()
	.use(responseTime({digits: 2, header: "X-GitapiCommit-Response-Time", suffix: true}))
	.use(options.checkUserAccess)
	.get('/:scope'+ fileRoot + '*', getCommit)
	.put('/:commit'+ fileRoot + '*', putCommit)
	.post('/:commit'+ fileRoot + '*', postCommit);

function commitJSON(commit, fileDir, diffs, parents) {
	return {
		"AuthorEmail": commit.author().email(), 
		"AuthorName": commit.author().name(),
		"AuthorImage": "https://www.gravatar.com/avatar/" + crypto.createHash('md5').update(commit.author().email().toLowerCase()).digest("hex") + "?d=mm",
		"Children":[],
		"CommitterEmail": commit.committer().email(),
		"CommitterName": commit.committer().name(),
		"ContentLocation": {pathname: gitRoot + "/commit/" + commit.sha() + fileDir, query: {parts: "body"}},
		"DiffLocation": gitRoot + "/diff/" + commit.sha() + fileDir,
		"Location": gitRoot + "/commit/" + commit.sha() + fileDir,
		"CloneLocation": gitRoot + "/clone" + fileDir,
		"Diffs": diffs,
		"Parents": parents,
		"Message": commit.message(),
		"Name": commit.sha(),
		"Time": commit.timeMs(),
		"Id": commit.sha(),
		"Type": "Commit"
	};
}

function getCommit(req, res) {
	if (req.query.parts === "body") {
		getCommitBody(req, res);
	} else {
		getCommitLog(req, res);
	}
}

function getCommitLog(req, res) {
	var task = new tasks.Task(res,false,false,0,false);
	var scope = api.decodeURIComponent(req.params.scope);
	var fileDir;

	var query = req.query;
	var page = Number(query.page) || 1;
	var pageSize = Number(query.pageSize) || 20;
	var mergeBase = "true" === query.mergeBase;
	var skipCount = (page-1)*pageSize;
	var filter = query.filter;
	var authoFilter = query.author;
	var committerFilter = query.committer;
	var sha1Filter = query.sha1;
	var fromDateFilter = query.fromDate ? parseInt(query.fromDate, 10) : 0;
	var toDateFilter = query.toDate ? parseInt(query.toDate, 10) : 0;
	var filterPath, repo;
	var behindCount = 0, aheadCount= 0;
	function filterCommit(commit) {
		if (sha1Filter && commit.sha() !== sha1Filter) return true;
		if (filter && commit.message().toLowerCase().indexOf(filter.toLowerCase()) === -1) return true;
		if (authoFilter && commit.author().toString().toLowerCase().indexOf(authoFilter.toLowerCase()) === -1) return true;
		if (committerFilter && commit.committer().toString().toLowerCase().indexOf(committerFilter.toLowerCase()) === -1) return true;
		if (fromDateFilter && commit.timeMs() < fromDateFilter) return true;
		if (toDateFilter && commit.timeMs() > toDateFilter) return true;
		return false;
	}
	function filterCommitPath(commit, fileDir, keep, ignore) {
		// check if this commit is from a branch that should be ignored
		for (var i = 0; i < ignore.length; i++) {
			if (ignore[i].equal(commit.id())) {
				for (var j = 0; j < commit.parentcount(); j++) {
					// check if this parent should be skipped or iterated over
					var shouldKeep = keep.some(function(oid) {
						return oid.equal(commit.parentId(j));
					});
					if (!shouldKeep) {
						ignore.push(commit.parentId(j));
					}
				}
				return Promise.resolve(true);
			}
		}

		var entryId;
		return commit.getEntry(filterPath)
		.then(function(entry) {
			entryId = entry.id();
			switch (commit.parentcount()) {
				case 0:
					// no parent then it was an ADD
					return false;
				case 1:
					return commit.getParents(1)
					.then(function(parents) {
						return parents[0].getEntry(filterPath);
					})
					.then(function(parentEntry) {
						// check if the file content changed
						return entryId.equal(parentEntry.id()) !== 0;
					})
					.catch(function(err) {
						if (err.toString().indexOf("does not exist in the given tree") !== -1) {
							// not found in parent, was an ADD
							return false;
						}
						throw err;
					});
				default:
					var parentOids = [];
					for (var i = 0; i < commit.parentcount(); i++) {
						parentOids.push(commit.parentId(i));
					}
					var parents;
					return commit.getParents(commit.parentcount())
					.then(function(_parents) {
						parents = _parents;
						// for every parent, check if the entry exists
						var promises = parents.map(function(parent) {
							return parent.getEntry(filterPath).catch(function(err) {
								if (err.toString().indexOf("does not exist in the given tree") !== -1) {
									return null;
								}
								throw err;
							});
						});
						return Promise.all(promises)
					})
					.then(function(entries) {
						// find the common ancestor amongst the parents
						return resolveAncestor(parentOids)
						.then(function(base) {
							for (var i = 0; i < entries.length; i++) {
								if (entries[i] !== null && entries[i].id().equal(entryId)) {
									// if the entry id is the same as a parent, that means
									// the content from the other branches should be ignored
									// as they have been discarded in favour of the changes
									// of this particular branch of history
									for (var j = 0; j < entries.length; j++) {
										if (i !== j && (base === null || !parents[j].id().equal(base))) {
											ignore.push(parents[j].id());
										}
									}
									// mark the common ancestor as not to be skipped over
									if (base !== null) {
										keep.push(base);
									}
									return true;
								}
							}
							return  false;
						});
					});
			}
		})
		.catch(function(err) {
			if (err.toString().indexOf("does not exist in the given tree") !== -1) {
				// doesn't exist, check if it was deleted
				if (commit.parentcount() === 0) {
					// no parent then definitely doesn't exist
					return true;
				}

				return commit.getParents(1)
				.then(function(parents) {
					return parents[0].getEntry(filterPath);
				})
				.then(function(parentEntry) {
					// if parent entry exists then the entry was deleted
					return false;
				})
				.catch(function(err) {
					return true;
				});
			}
			throw err;
		});
	}
	function resolveAncestor(parents) {
		var tree = parents.pop();
		var tree2 = parents.pop();
		return git.Merge.base(repo, tree, tree2).then(function(base) {
			if (parents.length === 0) {
				return base;
			} else {
				parents.push(base);
				return resolveAncestor(parents);
			}
		})
		.catch(function(err) {
			if (err.message === "no merge base found") {
				// two commits in unrelated histories
				return null;
			}
			throw err;
		});
	}
	var commits = [];
	function sendResponse(over) {
		var refs = scope.split("..");
		var toRef, fromRef; 
		if(refs.length === 1){
			toRef = refs[0];
		} else if(refs.length === 2){
			toRef = refs[1];
			fromRef = refs[0];
		}
		
		var resp = {
			"Children": commits,
			"RepositoryPath": filterPath,
			"Type": "Commit",
			"Location":gitRoot + "/commit/" + api.encodeURIComponent(scope) + fileRoot + req.params[0],
			"CloneLocation": gitRoot + "/clone" + fileDir
		};
		if(mergeBase){
			resp["AheadCount"] = aheadCount;
			resp["BehindCount"] = behindCount;
		}
	
		if (page && !over) {
			var nextLocation = url.parse(req.originalUrl, true);
			nextLocation.query.page = page + 1 + "";
			nextLocation.pathname = api.decodeStringLocation(nextLocation.pathname);
			nextLocation.search = null; //So that query object will be used for format
			resp['NextLocation'] = nextLocation;
		}

		if (page && page > 1) {
			var prevLocation = url.parse(req.originalUrl, true);
			prevLocation.query.page = page - 1 + "";
			prevLocation.pathname = api.decodeStringLocation(prevLocation.pathname);
			prevLocation.search = null;
			resp['PreviousLocation'] = prevLocation;
		}
		
		function generateCorrespondingRefJson(refname){
			return git.Reference.dwim(repo, refname).then(function(reference) {
				if(reference.isRemote()){
					var remoteNameCandidate = reference.shorthand();
					return git.Remote.list(repo)
					.then(function(array) {
						var remoteNameCandidateSegments = remoteNameCandidate.split("/");
						for (var i = 1; i <= remoteNameCandidateSegments.length; i++) {
							var joinedRemotename = remoteNameCandidateSegments.slice(0, i).join("/");
							if(array.some(function(item){
							return item === joinedRemotename;})){
								return joinedRemotename;
							}
						}
					}).then(function(remoteName){
						return Promise.all([repo.getRemote(remoteName), repo.getBranchCommit(reference)]);
					}) 
					.then(function(results){
						return remotes.remoteBranchJSON(reference, results[1], results[0], fileDir);
					});
				}else if(reference.isBranch()){
					var branch = branches.branchJSON(repo, reference, fileDir);
					return branches.getBranchCommit(repo, [branch])
					.then(function(){
						return branches.getBranchRemotes(repo, [branch], fileDir);
					}).then(function(){
						return branch;
					});
				}
			}).catch(function(){
				return null;   // when it's a commit, cannot dwim even
			});
		}
		
		return getCommitRefs(repo, fileDir, commits)
		.then(function(){
			if(fromRef){
				return Promise.resolve(generateCorrespondingRefJson(fromRef))
				.then(function(resultJson){
					if(resultJson){
						resp['fromRef'] = resultJson;
					}
				});
			}
		})
		.then(function(){
			if(toRef){
				return Promise.resolve(generateCorrespondingRefJson(toRef))
				.then(function(resultJson){
					if(resultJson){
						resp['toRef'] = resultJson;
					}
				});
			}
		})
		.then(function() {
			clone.freeRepo(repo);
			task.done({
				HttpCode: 200,
				Code: 0,
				DetailedMessage: "OK",
				JsonData: resp,
				Message: "OK",
				Severity: "Ok"
			});
		});
	}

	function log(repo, ref) {
		var revWalk = repo.createRevWalk();
		function setupRevWalk(callback) {
			revWalk.sorting(git.Revwalk.SORT.TOPOLOGICAL);
			git.Reference.dwim(repo, ref).then(
				function(reference) {
					return ref =  reference.name();
				},
				function rejected(){
					return;
				}
			)
			.then(function(){
				if (ref.indexOf("..") !== -1) {
						revWalk.pushRange(ref);
				} else {
					try {
						revWalk.push(ref);
					} catch (ex) {
						revWalk.pushRef( ref );
					}
				}
				return;
			}).then(callback);
		}

		setupRevWalk(function() {
			walk();
		});

		var count = 0;
		var keep = [];
		var ignore = [];
		var commitJSONs = {};
		filterPath = clone.getfileRelativePath(repo,req); 
		function walk() {
			return revWalk.next()
			.then(function(oid) {
				if (!oid) {
					sendResponse(true);
					return;
				}
				return repo.getCommit(oid)
				.then(function(commit) {
					function applyFilter(filter) {
						if (filter || filterCommit(commit) || page && count++ < skipCount) {//skip pages
							var keys = Object.keys(commitJSONs);
							for (var i = 0 ; i < keys.length; i++) {
								for (var j = 0; j < commitJSONs[keys[i]].Parents.length; j++) {
									if (commitJSONs[keys[i]].Parents[j].Name === commit.sha() && commit.parentcount() !== 0) {
										commitJSONs[keys[i]].Parents[j] = createParentJSON(commit.parentId(0).toString(), fileDir);
										return walk();
									}
								}
							}
							return walk();
						}
						return Promise.all([getDiff(repo, commit, fileDir), getCommitParents(repo, commit, fileDir)])
						.then(function(stuff) {
							var json = commitJSON(commit, fileDir, stuff[0], stuff[1]);
							commitJSONs[commit.sha()] = json;
							commits.push(json);
							if (pageSize && commits.length === pageSize) {//page done
								if (filterPath) {
									var missing = [];
									// look for commits that are pointing at a parent that
									// doesn't exist in the list of returned commits
									var keys = Object.keys(commitJSONs);
									for (var i = 0 ; i < keys.length; i++) {
										for (var j = 0; j < commitJSONs[keys[i]].Parents.length; j++) {
											var name = commitJSONs[keys[i]].Parents[j].Name;
											if (commitJSONs[name] === undefined) {
												// pointing at a commit that hasn't been resolved, mark it
												missing.push(name);
											}
										}
									}

									if (missing.length === 0) {
										sendResponse();
									} else {
										// resolve the parents so we actually have the JSON point
										// at the true parent commit related to the file
										var current = missing[0];
										revWalk = repo.createRevWalk();
										revWalk.sorting(git.Revwalk.SORT.TOPOLOGICAL);
										revWalk.push(missing[0]);
										resolveParents(missing, keep, ignore);
									}
								} else {
									sendResponse();
								}
								return;
							}
							walk();
						});
					}

					if (filterPath) {
						return filterCommitPath(commit, fileDir, keep, ignore).then(applyFilter);
					} else {
						return applyFilter(false);
					}
				});
			})
			.catch(function(error) {
				if (error.errno === git.Error.CODE.ITEROVER) {
					sendResponse(true);
				} else {
					clone.freeRepo(repo);
					task.done({
						HttpCode: 404,
						Code: 0,
						DetailedMessage: error.message,
						JsonData: {},
						Message: error.message,
						Severity: "Error"
					});
				}
			});
		}

		function resolveParents(missing, keep, ignore) {
			var candidate;
			return revWalk.next().then(function(oid) {
				return repo.getCommit(oid);
			})
			.then(function(commit) {
				candidate = commit;
				return filterCommitPath(commit, fileDir, keep, ignore);
			})
			.then(function(filter) {
				if (filter) {
					// have to filter this commit, keep going
					return resolveParents(missing, keep, ignore);
				} else {
					// this commit is not being filtered, update the parent information
					var keys = Object.keys(commitJSONs);
					for (var i = 0 ; i < keys.length; i++) {
						for (var j = 0; j < commitJSONs[keys[i]].Parents.length; j++) {
							if (commitJSONs[keys[i]].Parents[j].Name === missing[0]) {
								commitJSONs[keys[i]].Parents[j] = createParentJSON(candidate.sha(), fileDir);
							}
						}
					}

					// remove the resolved commit
					missing.shift();
					if (missing.length === 0) {
						sendResponse();
					} else {
						// still more to go, resolve the next one
						revWalk = repo.createRevWalk();
						revWalk.sorting(git.Revwalk.SORT.TOPOLOGICAL);
						revWalk.push(missing[0]);
						return resolveParents(missing, keep, ignore);
					}
				}
			})
			.catch(function(error) {
				if (error.errno === git.Error.CODE.ITEROVER) {
					sendResponse(true);
				} else {
					clone.freeRepo(repo);
					task.done({
						HttpCode: 404,
						Code: 0,
						DetailedMessage: error.message,
						JsonData: {},
						Message: error.message,
						Severity: "Error"
					});
				}
			});
		}
	}

	clone.getRepo(req)
	.then(function(_repo) {
		repo = _repo;
		fileDir = clone.getfileDir(repo,req);
		if (mergeBase) {
			var names = scope.split("..");
			var commit0, commit1,mergeBaseCommitOid;
			repo.getReferenceCommit(names[0])
			.then(function(commit) {
				return commit;
			}).catch(function() {
				return repo.getCommit(names[0]);
			}).then(function(commit) {
				commit0 = commit;
				return repo.getReferenceCommit(names[1]);
			}).catch(function() {
				return repo.getCommit(names[1]);
			})
			.then(function(commit) {
				commit1 = commit;
				// find the common ancestor for calculating incoming/outgoing changes
				return git.Merge.base(repo, commit0, commit1)
				.catch(function(err) {
					if (err.message === "no merge base found") {
						return null;
					}
					throw err;
				});
			})
			.then(function(oid) {
				var revWalkForCounting1 = repo.createRevWalk();
				var revWalkForCounting2 = repo.createRevWalk();
				revWalkForCounting1.sorting(git.Revwalk.SORT.TOPOLOGICAL);
				revWalkForCounting2.sorting(git.Revwalk.SORT.TOPOLOGICAL);
				if (oid === null) {
					// no common ancestor, just count everything
					revWalkForCounting1.push(commit0.id().tostrS()); // incoming changes
					revWalkForCounting2.push(commit1.id().tostrS()); // outgoing changes
				} else {
					mergeBaseCommitOid = oid;
					revWalkForCounting1.pushRange(mergeBaseCommitOid.tostrS() + ".." + commit0.id().tostrS()); // incoming changes
					revWalkForCounting2.pushRange(mergeBaseCommitOid.tostrS() + ".." + commit1.id().tostrS()); // outgoing changes
				}
				
				return Promise.all([countCommit(revWalkForCounting1),countCommit(revWalkForCounting2)]);	
			}).then(function(results){
				behindCount = results[0];
				aheadCount = results[1];
				if(mergeBaseCommitOid){
					log(repo, mergeBaseCommitOid.tostrS());
				} else {
					sendResponse(true);
				}
			});
		} else {
			log(repo, scope);
		}
	}).catch(function(err) {
		clone.freeRepo(repo);
		task.done({
			HttpCode: 400,
			Code: 0,
			DetailedMessage: err.message,
			JsonData: {},
			Message: err.message,
			Severity: "Error"
		});
	});
}

function countCommit(revWalk){
	var MAX_COMMITS_IN_FASTREVWALK = 30000;
	return revWalk.fastWalk(MAX_COMMITS_IN_FASTREVWALK)
	.then(function(commitOids) {
		return commitOids.length;
	});
}

function getCommitParents(repo, commit, fileDir) {
	return commit.parents().map(function(parent) {
		return createParentJSON(parent.toString(), fileDir);
	});
}

function createParentJSON(sha, fileDir) {
	return {
		"Location": gitRoot + "/commit/" + sha + fileDir,
		"Name": sha
	};
}

function getCommitRefs(repo, fileDir, commits) {
	return new Promise(function (fulfill){
		if (!commits.length) return fulfill();
		var map = {};
		commits.forEach(function(commit) {
			map[commit.Id] = commit;
		});
		git.Reference.list(repo)
		.then(function(refList) {
			async.each(refList, function(ref, cb) {
				return git.Reference.nameToId(repo, ref)
				.then(function(oid) {
					var fullName = ref;
					var id,commit;
					var shortName = ref.replace("refs/tags/", "").replace("refs/remotes/", "").replace("refs/heads/", "");
					if (ref.indexOf("refs/tags/") === 0) {
						var annotated = false;
						return git.Tag.lookup(repo,oid).then(function(tag){
							id = tag.targetId();
							// tag lookup succeeded, it's an annotated tag then
							annotated = true;
						}).catch(function(){
							id = oid.toString();
						})
						.then(function(){
							commit = map[id];
							if (commit) {
								var tags = commit.Tags || (commit.Tags = []);
								tags.push(mTags.tagJSON(fullName, shortName, id, undefined, fileDir, annotated));
							}
							cb();
						});
					} 
					id = oid.toString();
					commit = map[id];
					if (commit) {
						var branches = commit.Branches || (commit.Branches = []);
						branches.push({FullName: ref});
					}
					cb();
				})
				.catch(function() {
					// ignore errors looking up commits
					cb();
				});
			}, function() {
				fulfill(map);
			});
		});
	});
}

function getDiff(repo, commit, fileDir) {
	var tree1;
	var tree2;
	var _parent;

	return commit.getTree()
	.then(function(tree) {
		tree2 = tree;
	})
	.then(function() {
		return commit.getParents(1);
	})
	.then(function(parents) {
		return parents && parents[0] ? (_parent = parents[0]).getTree() : null;
	})
	.then(function(tree) {
		tree1 = tree;
	})
	.then(function() {
		return git.Diff.treeToTree(repo, tree1, tree2, null);
	})
	.then(function(diff) {
		return diff.patches();
	})
	.then(function(patches) {
		var range = "";
		if (_parent) range = _parent.id().toString() + "..";
		range += commit.id().toString();
		var page = 1, pageSize = 100;
		var diffs = patches.slice(0, pageSize).map(function(patch) {
			var newFile = patch.newFile();
			var newFilePath = newFile.path();
			var oldFile = patch.oldFile();
			var oldFilePath = oldFile.path();
			var type = diff.changeType(patch);
			var path1 = type !== "Deleted" ? newFilePath : oldFilePath;
			return {
				"ChangeType": type,
				"ContentLocation": contextPath + fileDir + "/" + path1,
				"DiffLocation": gitRoot + "/diff/" + range + fileDir + "/" + path1,
				"NewPath": newFilePath,
				"OldPath": oldFilePath,
				"Type": "Diff"
			};
		});
		var result = {
			"Type": "Diff",
			"Length": patches.length,
			"Children": diffs
		};
		if (patches.length > 100) {
			var nextLocation = url.parse(gitRoot + "/diff/" + range + fileDir, true);
			nextLocation.query.page = page + 1 + "";
			nextLocation.query.pageSize = pageSize + "";
			nextLocation = url.format(nextLocation);
			result.NextLocation = nextLocation;
		}
		return result;
	});
}

function getCommitBody(req, res) {
	var scope = req.params.scope;
	var filePath;
	var theRepo;
	clone.getRepo(req)
	.then(function(repo) {
		theRepo = repo;
		filePath = clone.getfileRelativePath(repo,req);
		return repo.getReferenceCommit(scope);
	})
	.catch(function() {
		return theRepo.getCommit(scope);
	})
	.then(function(commit) {
		return commit.getEntry(filePath);
	})
	.then(function(treeEntry) {
		return treeEntry.getBlob();
	})
	.then(function(blob) {
		var resp = blob.toString();
		writeResponse(200, res, {'Content-Type':'application/octect-stream','Content-Length': resp.length}, resp, false, true);
	}).catch(function(err) {
		writeError(404, res, err.message);
	})
	.finally(function() {
		clone.freeRepo(theRepo);
	});
}

function identifyNewCommitResource(req, res, newCommit) {
	var originalUrl = url.parse(req.originalUrl, true);
	var segments = originalUrl.pathname.split("/");
	var contextPathSegCount = req.contextPath.split("/").length - 1;
	segments[3 + contextPathSegCount] = segments[3 + contextPathSegCount] + ".." + api.encodeStringLocation(api.encodeURIComponent(newCommit));
	var location = url.format({pathname: segments.join("/"), query: originalUrl.query});
	writeResponse(200, res, null, {
		"Location": location
	}, false); // Avoid double encoding
}

function revert(req, res, commitToRevert) {
	var theRepo, theCommit, theRC;
	clone.getRepo(req)
	.then(function(repo) {
		theRepo = repo;
		return git.Commit.lookup(repo, commitToRevert);
	})
	.then(function(commit) {
		theCommit = commit;
		return git.Revert(theRepo, commit, new git.RevertOptions());
	})
	.then(function(rc) {
		theRC = rc;
		if (rc) return;
		var msg = 'Revert "' + theCommit.summary() + '"\n\nThis reverts commit ' + theCommit.sha() + '\n';
		return createCommit(theRepo, null, null, theCommit.author().name(), theCommit.author().email(), msg);
	})
	.then(function() {
		return theRepo.stateCleanup();
	})
	.then(function() {
		writeResponse(200, res, null, {
			"Result": theRC ? "FAILURE" : "OK"
		});
		return clone.getSignature(theRepo);
	})
	.then(function(sig) {
		return git.Reflog.read(theRepo, "HEAD").then(function(reflog) {
			return replaceMostRecentRefLogMessageHeaderfromCommit("revert", reflog, sig);
		});
	})
	.catch(function(err) {
		writeError(404, res, err.message);
	})
	.finally(function() {
		clone.freeRepo(theRepo);
	});
}

function cherryPick(req, res, commitToCherrypick) {
	var theRepo, theCommit, theRC, theHead;
	clone.getRepo(req)
	.then(function(repo) {
		theRepo = repo;
		return git.Reference.nameToId(theRepo, "HEAD");
	})
	.then(function(head) {
		theHead = head;
		return git.Commit.lookup(theRepo, commitToCherrypick);
	})
	.then(function(commit) {
		theCommit = commit;
		return git.Cherrypick.cherrypick(theRepo, commit, {});
	})
	.then(function(rc) {
		theRC = rc;
		if (rc) return;
		return createCommit(theRepo, null, null, theCommit.author().name(), theCommit.author().email(), theCommit.message());
	})
	.then(function() {
		return theRepo.stateCleanup();
	})
	.then(function() {
		return git.Reference.nameToId(theRepo, "HEAD");
	})
	.then(function(newHead) {
		writeResponse(200, res, null, {
			"Result": theRC ? "FAILED" : "OK",
			"HeadUpdated": !theRC && theHead !== newHead
		});
		return clone.getSignature(theRepo);
	})
	.then(function(sig) {
		return git.Reflog.read(theRepo, "HEAD").then(function(reflog) {
			return replaceMostRecentRefLogMessageHeaderfromCommit("cherrypick", reflog, sig);
		});
	})
	.catch(function(err) {
		if(err.message.indexOf("cannot create a tree") !== -1){
			writeResponse(200, res, null, {
				"HeadUpdated": true,
				"Result": "CONFLICTING"
			});
		}else{
			writeError(400, res, err.message);
		}
	})
	.finally(function() {
		clone.freeRepo(theRepo);
	});
}

function replaceMostRecentRefLogMessageHeaderfromCommit (toHeader,reflog, sig){
	var mostRecentReflog = reflog.entryByIndex(0);
	if(mostRecentReflog){
		var targetMessage = mostRecentReflog.message();
		if(/^commit(:\s)/.test(targetMessage)){
			var targetOID = mostRecentReflog.idOld();
			targetMessage = targetMessage.replace(/^commit(:\s)/,  toHeader+"$1");
			reflog.drop(0, 1);
			reflog.append(targetOID, sig, targetMessage);
			return reflog.write();
		}
	}
}

function rebase(req, res, commitToRebase, rebaseOperation) {
	var repo, head, commit, oid, paths;
	clone.getRepo(req)
	.then(function(_repo) {
		repo = _repo;
		return repo.getHeadCommit();
	})
	.then(function(_head) {
		head = _head;
		return commitToRebase ? repo.getReferenceCommit(commitToRebase) : head;
	})
	.then(function(_commit) {
		commit = _commit;
		var work;
		switch (rebaseOperation) {
			case "ABORT":
				work = git.Rebase.open(repo, {}).then(function(rebase){
					return rebase.abort();
				});
				break;
				
			case "CONTINUE":
				work = repo.continueRebase();
				break;
				
			case "SKIP":
				return git.Checkout.head(repo, {
					checkoutStrategy:
						git.Checkout.STRATEGY.FORCE |
						git.Checkout.STRATEGY.RECREATE_MISSING |
						git.Checkout.STRATEGY.REMOVE_UNTRACKED
				})
				.then(function() {
					return git.Rebase.open(repo, {});
				}).then(function(rebase) {
					if (rebase.operationCurrent() === rebase.operationEntrycount() - 1) {
						// if skipping the last operation, then we're done here
						return clone.getSignature(repo).then(function(sig) {
							rebase.finish(sig);
							// return the commit that we're currently on
							return head;
						});
					}
					// move to the next one and continue
					return rebase.next().then(function(rebaseOperation) {
						return repo.continueRebase();
					});
				});
				
			default:
				work = repo.rebaseBranches("HEAD", commitToRebase, null, null, null);
		}
		return work
		.then(function(_oid) {
			oid = _oid;
		})
		.catch(function(index) {
			if (rebaseOperation === "ABORT" || !index.entries) {
				throw index;
			}
			paths = {};
			index.entries().forEach(function(entry) {
				if (git.Index.entryIsConflict(entry)) {
					paths[entry.path] = "";
				}
			});
			return git.Checkout.index(repo, index, {
				checkoutStrategy: git.Checkout.STRATEGY.ALLOW_CONFLICTS,
				ourLabel: "HEAD",
				theirLabel: commit.sha()
			});
		});
	})
	.then(function() {
		var rebaseResult = rebaseOperation && paths ? "STOPPED" : "OK";
		if (rebaseOperation !== "ABORT") {
			if (!paths) {
				if (oid && oid.toString() === head.id().toString()) rebaseResult = "UP_TO_DATE";
				else if (oid && oid.toString() === commit.id().toString()) rebaseResult = "FAST_FORWARD";
			} else if (rebaseOperation !== "BEGIN") {
				rebaseResult = "FAILED_UNMERGED_PATHS";
			}
		} else if (rebaseOperation === "ABORT") {
			rebaseResult = "ABORTED";
		}
		writeResponse(200, res, null, {
			"Result": rebaseResult
		});
	})
	.catch(function(err) {
		writeError(400, res, err.message);
	})
	.finally(function() {
		clone.freeRepo(repo);
	});

}

function merge(req, res, branchToMerge, squash) {
	var repo, head, commit, oid, paths;
	var conflicting = false;
	clone.getRepo(req)
	.then(function(_repo) {
		repo = _repo;
		return repo.getHeadCommit();
	})
	.then(function(_head) {
		head = _head;
		return repo.getReferenceCommit(branchToMerge);
	})
	.then(function(_commit) {
		commit = _commit;
		if (squash) {
			// find a common ancestor
			return git.Merge.base(repo, head, commit.id()).then(function(base) {
				// the common ancestor is the commit we're trying to merge
				if (base.equal(commit.id())) {
					// already up-to-date, nothing to do
					oid = head;
					return;
				}

				var mergeIndex;
				// try to merge
				return git.Merge.commits(repo, head, commit)
				.then(function(index) {
					mergeIndex = index;
					return repo.getStatus();
				})
				.then(function(statuses) {
					paths = {};
					// see what's in the index/wd
					statuses = statuses.map(function(status) {
						return status.path();
					});
					// compare it with what's in the index
					var entries = mergeIndex.entries();
					entries.forEach(function(entry) {
						if (statuses.indexOf(entry.path) !== -1) {
							paths[entry.path] = "";
						}
					});
					// no conflicts, then we're fine
					if (Object.keys(paths).length === 0) {
						// common ancestor is HEAD, fast-forward
						if (base.equal(head.id())) {
							oid = commit.id();
						}

						conflicting = mergeIndex.hasConflicts();
						paths = undefined;
						// checkout the merged index
						return git.Checkout.index(repo, mergeIndex, {
							checkoutStrategy: git.Checkout.STRATEGY.FORCE
						});
					}
				});
			});
		}

		// try to find a common ancestor before merging
		return git.Merge.base(repo, head, commit.id())
		.then(function() {
			return repo.mergeBranches("HEAD", branchToMerge)
			.then(function(_oid) {
				oid = _oid;
			})
			.catch(function(index) {
				// the merge failed due to conflicts
				conflicting = true;
				return forceMerge(repo, head, commit, branchToMerge, false, function(conflictingPaths) {
					paths = conflictingPaths;
				});
			});
		})
		.catch(function(err) {
			if (err.message === "no merge base found") {
				// no common ancestor between the two branches, force the merge
				return forceMerge(repo, head, commit, branchToMerge, true, function(conflictingPaths) {
					paths = conflictingPaths;
				});
			}
			throw err;
		});
	})
	.then(function() {
		var mergeResult = squash ? "MERGED_SQUASHED" : "MERGED";
		if (oid && oid.toString() === head.id().toString()) {
			mergeResult = "ALREADY_UP_TO_DATE";
		} else if (oid && oid.toString() === commit.id().toString()) {
			mergeResult = squash ? "FAST_FORWARD_SQUASHED" : "FAST_FORWARD";
		} else if (paths) {
			mergeResult = "FAILED";
		} else if (conflicting) {
			mergeResult = "CONFLICTING";
		}
		writeResponse(200, res, null, {
			"Result": mergeResult,
			"FailingPaths": paths
		});
	})
	.catch(function(err) {
		writeError(400, res, err.message);
	})
	.finally(function() {
		clone.freeRepo(repo);
	});
}

/**
 * Force a merge from the specified commit onto HEAD. This may leave
 * the repository in a conflicted state. If there are no conflits, a
 * merge commit will be created to complete the merge.
 * 
 * @param {Repository} repo the repository to perform the merge in
 * @param {Commit} head the commit that HEAD is pointing at
 * @param {Commit} commit the commit to merge in
 * @param {String} branchToMerge the name of the other branch
 * @param {boolean} createMergeCommit <tt>true</tt> if a merge commit should be created automatically,
 *                                    <tt>false</tt> otherwise
 * @param {Function} conflictingPathsCallback the callback to notify if the merge fails due to
 *                                            conflicting paths in the working directory or the index
 */
function forceMerge(repo, head, commit, branchToMerge, createMergeCommit, conflictingPathsCallback) {
	return git.AnnotatedCommit.lookup(repo, commit.id())
	.then(function(annotated) {
		return git.Merge.merge(repo, annotated, null, null).then(function() {
			if (repo.state() !== git.Repository.STATE.MERGE) {
				throw new Error("Internal merge failure ");
			}
	
			if (createMergeCommit) {
				return clone.getSignature(repo).then(function(signature) {
					var message = "Merged branch '" + branchToMerge + "'"; 
					return createCommit(repo,
						signature.name(), signature.email(),
						signature.name(), signature.email(),
						message, false, false);
				});
			}
		}).catch (function(err) {
			return getConflictingPaths(repo, head, commit).then(conflictingPathsCallback);
		});
	});
}

function getConflictingPaths(repo, head, commit) {
	var tree2;
	var diffPaths = [];
	return commit.getTree()
	.then(function(tree) {
		tree2 = tree;
		// get the common ancestor between HEAD and the other branch
		return git.Merge.base(repo, head, commit)
		.then(function(ancestor) {
			return ancestor.getTree();
		})
		.catch(function() {
			// failed to find common ancestor, use HEAD tree instead
			return head.getTree();
		});
	})
	.then(function(tree) {
		// diff the two trees
		return git.Diff.treeToTree(repo, tree, tree2, null)
	})
	.then(function(diff) {
		return diff.patches();
	})
	.then(function(patches) {
		// get the path of every modified file
		patches.forEach(function(patch) {
			diffPaths.push(patch.newFile().path());
		});
		return repo.getStatusExt({
			flags: git.Status.OPT.INCLUDE_UNTRACKED |
				git.Status.OPT.RECURSE_UNTRACKED_DIRS
		});
	})
	.then(function(statuses) {
		var paths = {};
		// check what's in the index and wd
		statuses.forEach(function(file) {
			var path = file.path();
			if (file.statusBit() !== 0 && diffPaths.indexOf(path) !== -1) {
				// modified file in the index/wd conflicts with the merge
				paths[path] = "";
			}
		});
		return paths;
	});
}

function createCommit(repo, committerName, committerEmail, authorName, authorEmail, message, amend, insertChangeid){
	var index, oid, author, committer;
	var state = repo.state();
	var mergeRequired = state === git.Repository.STATE.MERGE;
	if (amend && mergeRequired) {
		// libgit2's API doesn't allow this
		throw new Error("Cannot amend a commit to have more merges");
	}
	return repo.index()
	.then(function(indexResult) {
		index = indexResult;
		return index.read(1);
	})
	.then(function() {
		return index.writeTree();
	})
	.then(function(oidResult) {
		oid = oidResult;
		return authorEmail ? Promise.resolve(git.Signature.now(authorName, authorEmail)) : clone.getSignature(repo);
	})
	.then(function(sig) {
		author = sig;
		return committerEmail ? Promise.resolve(git.Signature.now(committerName, committerEmail)) : clone.getSignature(repo);
	})
	.then(function(sig) {
		committer = sig;
		if(repo.isEmpty()){
			if(insertChangeid) {
				message = insertChangeId(message, oid, null, author, committer);
			}
			return repo.createCommit('HEAD', author, committer, message, oid, []);
		}
		return git.Reference.nameToId(repo, "HEAD")
		.then(function(head) {
			return repo.getCommit(head);
		})
		.then(function(parent) {				
			if(insertChangeid) {
				message = insertChangeId(message, oid, parent, author, committer);
			}
			if (amend) {
				return parent.amend("HEAD",  author, committer, null, message, oid);
			} else if (mergeRequired) {
				// get merge heads
				var oids = [];
				return repo.mergeheadForeach(function(oid) {
					oids.push(oid.tostrS());
				})
				.then(function() {
					// wait for all parents to be resolved
					return Promise.all(oids.map(function(oid) {
						return repo.getCommit(oid);
					}));
				})
				.then(function(parentCommits) {
					parentCommits.unshift(parent);
					// create the merge commit on top of the MERGE_HEAD parents
					return repo.createCommit("HEAD", author, committer, message, oid, parentCommits);
				});
			}
			return repo.createCommit("HEAD", author, committer, message, oid, [parent]);
		});
	})
	.then(function(id) {
		if (mergeRequired) {
			// a merge commit was created, cleanup MERGE_* files in .git/
			var retCode = repo.stateCleanup();
			if (retCode !== git.Error.CODE.OK) {
				throw new Error("Internal merge cleanup failed (error code " + retCode + ")");
			}
		}
		return git.Commit.lookup(repo, id);
	});
}

function tag(req, res, commitId, name, isAnnotated, message) {
	var theRepo, theDiffs, thisCommit, theParents, fileDir;
	clone.getRepo(req)
	.then(function(repo) {
		theRepo = repo;
		fileDir = clone.getfileDir(repo,req);
		return git.Commit.lookup(repo, commitId);
	})
	.then(function(commit) {
		thisCommit = commit;
		return  clone.getSignature(theRepo);
	})
	.then(function(tagger) {
		return isAnnotated ? theRepo.createTag (thisCommit, name, message, isAnnotated ? tagger : undefined) : theRepo.createLightweightTag(thisCommit, name);
	})
	.then(function() {
		return getDiff(theRepo, thisCommit, fileDir);
	})
	.then(function(diffs){
		theDiffs = diffs;
	})
	.then(function() {
		return getCommitParents(theRepo, thisCommit, fileDir);
	})
	.then(function(parents){
		writeResponse(200, res, null, commitJSON(thisCommit, fileDir, theDiffs, parents), true);
	})
	.catch(function(err) {
		writeError(403, res, err.message);
	})
	.finally(function() {
		clone.freeRepo(theRepo);
	});
}

function putCommit(req, res) {
	var commit = api.decodeURIComponent(req.params.commit);
	var tagName = req.body.Name;
	var isAnnotated = req.body.Annotated === undefined || req.body.Annotated;
	var message = req.body.Message || "";
	if (tagName) {
		tag(req, res, commit, tagName, isAnnotated, message);
	}
}

function postCommit(req, res) {
	var fileDir;
	if (typeof req.body.Merge === "string") {
		merge(req, res, req.body.Merge, req.body.Squash);
		return;
	}
	if (typeof req.body.Rebase === "string") {
		rebase(req, res, req.body.Rebase, req.body.Operation);
		return;
	}
	if (typeof req.body["Cherry-Pick"] === "string") {
		cherryPick(req, res, req.body["Cherry-Pick"]);
		return;
	}
	if (typeof req.body.Revert === "string") {
		revert(req, res, req.body.Revert);
		return;
	}
	if (typeof req.body.New === "string") {
		identifyNewCommitResource(req, res, req.body.New);
		return;
	}
	
	var commit = api.decodeURIComponent(req.params.commit);
	if (commit !== "HEAD") {
		writeError(404, res, "Needs to be HEAD");
		return;
	}
	
	if (!req.body.Message) {
		writeError(404, res, "Commit message cannot be empty.");
		return;
	}

	// Since ChangeId messagefoot is not showing in the box, so insert Message after empty Checking.
	var isInsertChangeId = req.body.ChangeId;	

	var theRepo, thisCommit;
	var theDiffs = [];
	
	clone.getRepo(req)
	.then(function(repo) {
		theRepo = repo;
		fileDir = clone.getfileDir(repo,req);
		return createCommit(repo, req.body.CommitterName, req.body.CommitterEmail, req.body.AuthorName, req.body.AuthorEmail, req.body.Message, req.body.Amend, isInsertChangeId);
	})
	.then(function(commit) {
		thisCommit = commit;
		return getDiff(theRepo, commit, fileDir);
	})
	.then(function(diffs){
		theDiffs = diffs;
	})
	.then(function() {
		return getCommitParents(theRepo, thisCommit, fileDir);
	})
	.then(function(parents){
		writeResponse(200, res, null, commitJSON(thisCommit, fileDir, theDiffs, parents), true);
	})
	.catch(function(err) {
		writeError(403, res, err.message);
	})
	.finally(function() {
		clone.freeRepo(theRepo);
	});
}

function generateChangeId(oid, firstParentId, authorId, committerId, message){
	var cleanMessage = clean(message);
	function clean(fullMessage) {
		return fullMessage.//
				replace(/^#.*$\n?/g, "").// //$NON-NLS-1$
				replace(/\n\n\n+/g, "\n").// //$NON-NLS-1$
				replace(/\n*$/g, "").// //$NON-NLS-1$
				replace(/\ndiff --git.*/g, "").// //$NON-NLS-1$
				trim();
	}
	var mergedMessage = ["tree ",oid,"\nparent ",firstParentId,"\nauthor ",authorId,"\ncommitter ",committerId,"\n\n",cleanMessage].join("");	
	var hash = crypto.createHash("sha1");
	hash.update(mergedMessage);
	return hash.digest('hex');
}

function insertChangeId(originalMessage, oid, parent, author ,committer){
	var lines = originalMessage.split("\n"); //$NON-NLS-1$
	// Has ChangeId do nothing, even if changeId is changed, do not replace it.
	if(!existingOfChangeId(lines)) {
		var footerFirstLine = indexOfFirstFooterLine(lines);
		var insertAfter = footerFirstLine;
		for (var i = footerFirstLine; i < lines.length; ++i) {
			if (lines[i].match(/^(Bug|Issue)[a-zA-Z0-9-]*:.*$/)) {
				insertAfter = i + 1;
				continue;
			}
			break;
		}
		
		// Generage ChangeId here only when necessary.
		var firstParentId = parent? parent.parentId(0) : "";
		var hashId = generateChangeId(oid, firstParentId, author.toString(), committer.toString(), originalMessage);
		var changeIdString = "Change-Id: I" + hashId;
		if ( lines.length === 1 ){
			lines.splice(1, 0, "\n"+changeIdString);	
		}else{
			lines.splice(insertAfter, 0, changeIdString);
		}
		originalMessage = lines.join("\n");
 	}
 	return originalMessage;
 	
 	
 	function existingOfChangeId(alllinesArray){
		if (alllinesArray.length === 0)
			return false;
		var inFooter = false;
		for (var m = alllinesArray.length - 1; m >= 0; --m) {
			if (!inFooter && isEmptyLine(alllinesArray[m])){
				// Fine the last not-empty line, or keep finding.
				continue;
			}
			inFooter = true;
			if (alllinesArray[m].match(/^\s*Change-Id: *I[a-f0-9]{40}$/)) {
				return true;
			}
		}
		// Went through all lines but didn't find Change-Id line.
		return false;
 	}
 	
 	function isEmptyLine(line){
		return line.trim().length === 0;
 	}
 		
 	function indexOfFirstFooterLine(lines){
 		var footerFirstLineNum = lines.length;
		for (var l = lines.length - 1; l > 1; --l) {
			if (lines[l].match(/^[a-zA-Z0-9-]+:.*$/)) {
				footerFirstLineNum = l;
				continue;
			}
			if (footerFirstLineNum !== lines.length && lines[l].length === 0){
				break;
			}
			if (footerFirstLineNum !== lines.length
					&& lines[l].match(/^[ \\[].*$/)) {
				footerFirstLineNum = l + 1;
				continue;
			}
			footerFirstLineNum = lines.length;
			break;
		}
		return footerFirstLineNum;
 	}
}
};
