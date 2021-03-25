/*******************************************************************************
 * Copyright (c) 2016, 2017 IBM Corporation and others.
 * All rights reserved. This program and the accompanying materials are made 
 * available under the terms of the Eclipse Public License 2.0 
 * (http://www.eclipse.org/legal/epl-v10.html), and the Eclipse Distribution 
 * License v1.0 (http://www.eclipse.org/org/documents/edl-v10.html). 
 *
 * Contributors:
 *	 IBM Corporation - initial API and implementation
 *******************************************************************************/
/*eslint-env node */
/*eslint no-console:1*/
var api = require('../api'), writeError = api.writeError;
var path = require("path");
var fs = require('fs');
var fileUtil = require('../fileUtil');
var Promise = require('bluebird');
var userProjects = require('./db/userProjects');

module.exports = function(options) {
	var SEPARATOR = "-";
    var workspaceDir = options.workspaceDir;
    if (!workspaceDir) { throw new Error('options.workspaceDir path required'); }

    var contextPath = options.configParams.get('orion.context.path');

    module.exports.getFile = getFile;
    module.exports.treeJSON = treeJSON;
    module.exports.getChildren = getChildren;
    module.exports.getSharedProjects = getSharedProjects;
    module.exports.projectExists = projectExists;
    module.exports.getfileRoot = getfileRoot;
    module.exports.decodeUserIdFromWorkspaceId = decodeUserIdFromWorkspaceId;
    module.exports.decodeWorkspaceNameFromWorkspaceId = decodeWorkspaceNameFromWorkspaceId;
    module.exports.getProjectRoot = getProjectRoot;
    module.exports.getRealLocation = getRealLocation;
    module.exports.getWorkspaceIdFromprojectLocation = getWorkspaceIdFromprojectLocation;

	function projectExists(fullpath) {
        return fs.existsSync(fullpath);
	}

    function getFile(res, filepath, stats, etag) {
        var stream = fs.createReadStream(filepath);
		api.addStrictTransportHeaders(res);
		api.setResponseNoCache(res);
        res.setHeader('Content-Length', stats.size);
        res.setHeader('ETag', etag);
        res.setHeader('Accept-Patch', 'application/json-patch; charset=UTF-8');
        stream.pipe(res);
        stream.on('error', function(e) {
            // FIXME this is wrong, headers have likely been committed at this point
            writeError(500, res, e.toString());
        });
        stream.on('end', res.end.bind(res));
    }

    function sharedJSON(name, location, children, parents, submodules) {
        var result = {
            "ContentLocation": location,
            "Location": contextPath + "/sharedWorkspace/tree" + location,
            "ChildrenLocation": contextPath + "/sharedWorkspace/tree" + location + "?depth=1",
            "Name": name,
            "Children": submodules && submodules.length ? submodules : undefined,
            "Parents": parents && parents.length ? parents : undefined
        };

        return result;
    }

    /**
     * if opening a file, we don't want to add the name to the location so addNameToLoc needs to be false
     * else undefined
     */
    function treeJSON(name, location, timestamp, dir, length, addNameToLoc) {
        location = api.toURLPath(location);
        if (typeof addNameToLoc == 'undefined' || addNameToLoc) {
            location += "/" + name;
        }
        var result = {
            Name: name,
            LocalTimeStamp: timestamp,
            Directory: dir,
            Length: length,
            Location: location ? contextPath +"/sharedWorkspace/tree/file" + location : contextPath +"/sharedWorkspace/tree",
            ChildrenLocation: dir ? (location ? contextPath +"/sharedWorkspace/tree/file" + location + "?depth=1": contextPath +"/sharedWorkspace/tree" + "?depth=1") : undefined,
            Parents: fileUtil.getParents(contextPath +'/sharedWorkspace/tree/file' + location.split('/').splice(0, 2).join('/'), location.split('/').splice(2).join('/')),
            Attributes: {
                ReadOnly: false
            }
        };
        result.ImportLocation = result.Location.replace(/\/sharedWorkspace\/tree\/file/, "/sharedWorkspace/tree/xfer/import").replace(/\/$/, "");
        result.ExportLocation = result.Location.replace(/\/sharedWorkspace\/tree\/file/, "/sharedWorkspace/tree/xfer/export").replace(/\/$/, "") + ".zip";
        return result;
    }

    /**
     * Returns a list of children of the given directory.
     */
    function getChildren(fileRoot, directory, depth, excludes) {
        return fs.readdirAsync(directory)
        .then(function(files) {
            return Promise.map(files, function(file) {
                if (Array.isArray(excludes) && excludes.indexOf(file) !== -1) {
                    return null; // omit
                }
                var filepath = path.join(directory, file);
                return fs.statAsync(filepath)
                .then(function(stats) {
                    var isDir = stats.isDirectory();
                    return treeJSON(file, fileRoot, 0, isDir, depth ? depth - 1 : 0);
                })
                .catch(function() {
                    return null; // suppress rejection
                });
            });
        })
        .then(function(results) {
            return results.filter(function(r) { return r; });
        });
    };

    /**
     * Returns the projects (Location and name) shared to this user.
     */
    function getSharedProjects(req, res, callback) {
        var projects = [];
        userProjects.getUserSharedProjects(req.user.username)
        .then(function(sharedProjects) {
            function add(lst) {
                lst.forEach(function(project) {
                    //update the name of the project to include the original owner's username,
                    //so that projects with the same name can be differentiated.
                    project.Name = project.Name + " (" + project.Location.split(path.sep)[2] + "'s workspace)";
                    projects.push(project);
                    if (project.Children) add(project.Children);
                });
            }
            if (sharedProjects) {
	            add(sharedProjects);
            }
            callback(projects);
        });
    }
    
    function getfileRoot(workspaceId) {
		var userId = decodeUserIdFromWorkspaceId(workspaceId);
		return path.join(userId.substring(0,2), userId, decodeWorkspaceNameFromWorkspaceId(workspaceId));
	}
	function decodeUserIdFromWorkspaceId(workspaceId) {
		var index = workspaceId.lastIndexOf(SEPARATOR);
		if (index === -1) return null;
		return workspaceId.substring(0, index);
	}
	
	function decodeWorkspaceNameFromWorkspaceId(workspaceId) {
		var index = workspaceId.lastIndexOf(SEPARATOR);
		if (index === -1) return null;
		return workspaceId.substring(index + 1);
	}

    /**
     * Removes the root server workspace, and trailing file tree within project.
     * Example:
     * input: "C:\Users\IBM_ADMIN\node.workspace\mo\mourad\OrionContent\web\hello.html"
     * return: "\mo\mourad\OrionContent\web" which is the unique project path format that can be found in the database.
     */
    function getProjectRoot(filepath) {
        var index = filepath.indexOf(workspaceDir);
        if (index === -1) return undefined;
        index += workspaceDir.length;
        filepath = filepath.substring(index);
        return filepath.split(path.sep).slice(0,5).join(path.sep);
    }
    
    /**
     * /user1-orionContent/test/testfile  -> /us/user1/orionContent/test
     */
    function getRealLocation(filepath) {
    	var segs = filepath.split(path.sep);
		var fileRoot = getfileRoot(segs[1]);
		var realPath = path.join("/", fileRoot, segs[2]);
		return realPath;
    }

    function getWorkspaceIdFromprojectLocation(projectLocation){
        var projectSegs = projectLocation.split("/");
		return projectSegs[2] + SEPARATOR + projectSegs[3];
    }
}
