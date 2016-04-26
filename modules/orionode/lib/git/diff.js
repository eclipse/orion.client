	var scope = decodeURIComponent(req.params.scope || "");
		if (scope.indexOf("..") !== -1) {
			diff = getDiffBetweenTwoCommits(repo, scope.split(".."));
		} else if (scope === "Default") {
			diff = getDiffBetweenWorkingTreeAndHead(repo);
		} else if (scope === "Cached") {
			diff = getDiffBetweenIndexAndHead(repo);
			diff = getDiffBetweenWorkingTreeAndHead(repo);
		return diff
		.then(function(diff) {
			processDiff(diff, filePath, paths, fileDir, req, res, parts.indexOf("diff") !== -1, parts.indexOf("uris") !== -1, parts.indexOf("diffs") !== -1, query, scope);
		});
	if (patch.isAdded()) return "Added";
	if (patch.isDeleted()) return "Removed";
	if (patch.isModified()) return "Changed";
		return "/gitapi/commit/" + encodeURIComponent(commits[0]) + path + "?parts=body";
	return "/gitapi/commit/" + encodeURIComponent(scope) + path + "?parts=body";
		return "/gitapi/commit/" + encodeURIComponent(commits[1]) + path + "?parts=body";
		return "/gitapi/commit/" + encodeURIComponent(commits[1]) + path + "?parts=body";
function processDiff(diff, filePath, paths, fileDir, req, res, includeDiff, includeURIs, includeDiffs, query, scope) {
	var URIs = [], diffContents = [], diffs = [], patches = [], i;
	diff.patches()
				
				if (includeURIs) {
					var p = api.toURLPath(path.join(fileDir, newFilePath));
					URIs.push({
						"Base": getBaseLocation(scope, p),
						"CloneLocation": "/gitapi/clone" + fileDir,
						"Location": "/gitapi/diff/" + encodeURIComponent(scope) + fileDir + filePath,
						"New": getNewLocation(scope, p),
						"Old": getOldLocation(scope, p),
						"Type": "Diff"
					});
				}
				
						"DiffLocation": "/gitapi/diff/" + encodeURIComponent(scope) + p1,
					buffer.push("index " + oldFile.id().toString().substring(0, 7) + ".." + newFile.id().toString().substring(0, 7) + " " + newFile.mode().toString(8) + "\n");
					buffer.push("--- a/" + oldFilePath + "\n");
					buffer.push("+++ b/" + newFilePath + "\n"); 
											prefix = "\\ No newline at end of file";
											break;
											prefix = "\\ No newline at end of file";
									var content = line.content();
									var index = content.indexOf("\n");
									if (index !== -1) content = content.substring(0, index  + 1); 
									buffer.push(prefix + content);
	})
	.done(function() {
		var body = "";
		if (includeDiff && includeURIs) {
			body += "--BOUNDARY\n";
			body += "Content-Type: application/json\n\n";
			body += JSON.stringify(URIs[0]);
			body += "--BOUNDARY\n";
			body += "Content-Type: plain/text\n\n";
			body += diffContents.join("");
			res.setHeader('Content-Type', 'multipart/related; boundary="BOUNDARY"');
		} else if (includeDiff) {
			body += diffContents.join("");
			res.setHeader("Cache-Control", "no-cache");
			res.setHeader("Content-Disposition", "attachment; filename=\"changes.patch\"");
			res.setHeader('Content-Type', 'plain/text');
		} else if (includeDiffs) {
			var result = {
				"Type": "Diff",
				"Length": patches.length,
				"Children": diffs
			};
			if (i < patches.length) {
				result.NextLocation = "";
			}
			body += JSON.stringify(result);
			res.setHeader('Content-Type', 'application/json');
		} else if (includeURIs) {
			body += JSON.stringify(URIs[0]);
			res.setHeader('Content-Type', 'application/json');
		}
		res.setHeader('Content-Length', body.length);
		return res.status(200).end(body);
function getDiffBetweenWorkingTreeAndHead(repo) {
	return git.Diff.indexToWorkdir(repo, null, {
		flags: 
			git.Diff.OPTION.SHOW_UNTRACKED_CONTENT |
			git.Diff.OPTION.INCLUDE_UNTRACKED | 
			git.Diff.OPTION.RECURSE_UNTRACKED_DIRS |
			git.Diff.OPTION.IGNORE_SUBMODULES,
		contextLines: 0
function getDiffBetweenIndexAndHead(repo) {
		return git.Diff.treeToWorkdir(repo, tree, null);
function getDiffBetweenTwoCommits(repo, commits) {
		return git.Diff.treeToTree(repo, tree1, tree2, null);
	segments[3] = segments[3] + ".." + encodeURIComponent(newCommit);