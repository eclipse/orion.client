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
/*eslint-env node*/

var express = require('express'),
	expressSession = require('express-session'),
	MongoStore = require('connect-mongo')(expressSession),
	cookieParser = require('cookie-parser'),
	mongoose = require('mongoose'),
	Promise = require('bluebird');
	
function projectJSON(project) {
	return {
		Location: project.projectpath,
        HubID: project.hubid,
        Owner: project.username,
        Users: project.users
	};
}

mongoose.Promise = Promise;

module.exports = function(options) {
    var workspaceRoot = options.workspaceDir;
    if (!workspaceRoot) { throw new Error('options.workspaceDir path required'); }

	var sharedUtil = require('../sharedUtil');
	var path = require('path');
	var userProjectsCollection = require('./userProjects');

	var app = express.Router();
	module.exports.getHubID = getHubID;
	module.exports.getProjectPathFromHubID = getProjectPathFromHubID;
	module.exports.addUserToProject = addUserToProject;
	module.exports.removeUserFromProject = removeUserFromProject;
	module.exports.getUsersInProject = getUsersInProject;

	var sharedProjectsSchema = new mongoose.Schema({
		location: {
            type: String,
            unique: true,
            required: true
        },
        hubid: {
            type: String,
            unique: true,
            required: true
        },
        owner: {
			type: String
		},
		users: [String]
	});
	
	var sharedProject = mongoose.model('sharedProject', sharedProjectsSchema);
	
	app.use(cookieParser());
	app.use(expressSession({
		resave: false,
		saveUninitialized: false,
		secret: 'keyboard cat',
		store: new MongoStore({ mongooseConnection: mongoose.connection })
	}));	

	/**START OF HELPER FUNCTIONS**/
	
	/**
	 * Returns true if the user owns the project,
	 * and therefore is allowed to share/unshare it.
	 *
	 * Not necessary since we append the user workspaceroot before taking project root.
	 */
	function isProjectOwner(user, projectpath) {
		//TODO
		return false;
	}

	/**
	 * Adds the project and a new hubID to the sharedProjects db document.
	 */
	function addProject(project) {
		var hub = generateUniqueHubId();
		//TODO Also add name of project owner? Replace by projectJSON all over the file.
		var query = sharedProject.findOne({location: project});
		return query.exec()
		.then(function(doc) {
			return doc ? Promise.resolve(doc) : sharedProject.create({location: project, hubid: hub});
		});
	}

	/**
	 * Removes project from shared projects.
	 * Also removes all references from the other table.
	 */
	function removeProject(project) {
		return sharedProject.findOne({'location': project}).exec()
		.then(function(doc) {
			if (doc.users.length > 0) {
				return userProjectsCollection.removeProjectReferences(doc.users, project).exec();
			}
		})
		.then(function() {
			return sharedProject.remove({location: project}).exec();
		});
	}
	
	/**
	 * For example if the project is renamed.
	 */
	function updateProject(projectpath, data) {
		//TODO
		return false;
	}
	
	/**
	 * returns a unique hubID
	 */
	function generateUniqueHubId() {
		//TODO ensure generated hub id is unique (not in db)
		// do {
		var length = 10;
		var letters = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUV0123456789';
		var s = '';
		for (var i=0; i<length; i++) {
			s += letters.charAt(Math.floor(Math.random() * letters.length));
		}
		// } while (s == 0); //TODO actually check in db for value existence

		return s;
	}
	
    function getHubID(filepath) {
        var project = sharedUtil.getProjectRoot(filepath);

		var query = sharedProject.findOne({
			location: project,
			'users.0': { $exists: true }
		}, 'hubid');
		return query.exec()
		.then(function(doc) {
			return doc ? doc.hubid : undefined;
		});
    }


	/**
	* returns the project path associated with the given hib id (if exists)
	**/
	function getProjectPathFromHubID(id) {
		var query = sharedProject.findOne({hubid: id}, 'location');
		return query.exec()
		.then(function(doc) {
			return doc ? doc.location : undefined;
		});
	}

	/**
	 * Returns the list of users that the project is shared with.
	 */
	function getUsersInProject(project) {
		return sharedProject.findOne({'location': project}).exec()
		.then(function(doc) {
			return doc ? doc.users : undefined;
		});
	}

	/**
	 * Adds user to project's user list.
	 */
	function addUserToProject(user, project) {
		return addProject(project)
		.then(function(doc) {
			if (doc.users.indexOf(user) === -1) {
				return sharedProject.findOneAndUpdate({'location': project}, {$addToSet: {'users': user} }, {
					safe: true,
					w: 'majority'
				}).exec();
			}
		});

		// return sharedProject.findOne({'location': project}).exec()
		// .then(function(doc) {
		// 	if (!doc) {
		// 		return addProject(project);
		// 	} else {
		// 		return Promise.resolve(doc);
		// 	}
		// }).then(function(doc) {
		// 	if (doc.users.indexOf(user) === -1) {
		// 		return sharedProject.findOneAndUpdate({'location': project}, {$addToSet: {'users': user} }, {
		//  		safe: true,
		//  		w: 'majority'
		//  	}).exec();
		// 	}
		// });
	}

	/**
	 * Remove user from project's user list.
	 */
	function removeUserFromProject(user, project) {
		return sharedProject.findOne({'location': project}).exec()
		.then(function(doc) {
			return sharedProject.findOneAndUpdate({'location': project}, {$pull: {'users': { $in: [user]}} }, {
				safe: true,
				w: 'majority'
			}).exec();
		});
	}

	/**END OF HELPER FUNCTIONS**/

	/**
	 * req.body.project should be the project name.
	 */
	app.post('/:project', function(req, res) {
		var project = req.params.project;
		project = path.join("/",req.user._doc.workspace,project);

		if (!sharedUtil.projectExists(path.join(req.user.workspaceDir, project))) {
			throw new Error("Project does not exist");
		}

		//if add project was successful, return
		addProject(project)
		.then(function(result) {
			res.end();
		});
	});

	/**
	 * req.body.project should be the project name.
	 */
	app.delete('/:project', function(req, res) {
		var project = req.params.project;
		project = path.join("/",req.user._doc.workspace,project);

		if (!sharedUtil.projectExists(path.join(req.user.workspaceDir, project))) {
			throw new Error("Project does not exist");
		}

		//if remove project was successful, return 200
		removeProject(project)
		.then(function(result) {
			res.end();
		});
	});
	
	app.put('/:project', function(req, res) {
		res.end();
	});
	
	return app;
};
