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
	fileUtil= require('../../fileUtil'),
	Promise = require('bluebird');

function userProjectJSON(username) {
	return {
		username: username,
		sharedProjects: []
	};
}

mongoose.Promise = Promise;

module.exports = function(options) {
    var workspaceRoot = options.workspaceDir;
    if (!workspaceRoot) { throw new Error('options.workspaceDir path required'); }

	var sharedUtil = require('../sharedUtil');
	var projectsCollection = require('./sharedProjects');
	var path = require('path');

	var app = express.Router();
	module.exports.getUserSharedProjects = getUserSharedProjects;
	module.exports.removeProjectReferences = removeProjectReferences;

	var userProjectsSchema = new mongoose.Schema({
		username: {
			type: String,
			unique: true,
			required: true
		},
		sharedProjects : [String]
	});
	
	var userProject = mongoose.model('userProject', userProjectsSchema);

	app.use(cookieParser());
	app.use(expressSession({
		resave: false,
		saveUninitialized: false,
		secret: 'keyboard cat',
		store: new MongoStore({ mongooseConnection: mongoose.connection })
	}));
	
	/**START OF HELPER FUNCTIONS**/

	/**
	 * adds user if not exists.
	 */
	function addUser(username) {
		return userProject.findOne({'username': username}).exec()
		.then(function(doc) {
			if (!doc) {
				return userProject.create(userProjectJSON(username));
			}
			return Promise.resolve(doc);
		});
	}
	
	/**
	 * Adds project to user's shared projects.
	 */
	function addProjectToUser(user, project) {
		return addUser(user)
		.then(function(doc) {
			return userProject.findOneAndUpdate({username: user}, {$addToSet: {'sharedProjects': project} }, {
				safe: true,
				w: 'majority'
			}).exec();
		});
	}
	
	/**
	 * Removes a project from a user's shared projects.
	 */
	function removeProjectFromUser(user, project) {
		return userProject.findOneAndUpdate({username: user}, {$pull: {'sharedProjects': { $in: [project]}} }, {
			safe: true,
			w: 'majority'
		}).exec();
	}
	
	/**
	 * Removes all references from project (project made private by user).
	 */
	function removeProjectReferences(userlist, project) {
		var promises = [];
		userlist.forEach(function(user) {
			promises.push(removeProjectFromUser(user, project));
		});

		return Promise.all(promises);
	}

	/**
	 * returns a list of projects shared to the user.
	 */
	function getUserSharedProjects(user) {
		return userProject.findOne({'username': user}, 'sharedProjects')
		.then(function(doc) {
			if (!doc) {
				return undefined;
			}
			var projects = doc.sharedProjects;
			projects = projects.map(function(project) {
				var name = path.win32.basename(project);
				return {'Name': name, 'Location': project};
			});
			return projects;
		});
	}
	
	/**END OF HELPER FUNCTIONS**/
	
	/**
	 * Adds a project to a user's shared project list.
	 */
	app.post('/:project/:user', function(req, res) {
		//TODO make sure project has been shared first.
		var project = fileUtil.getFile(req, decodeURIComponent(req.params.project).substring(5 + req.contextPath.length));
		var user = req.params.user;

		if (!sharedUtil.projectExists(project.path)) {
			throw new Error("Project does not exist");
		}

		project = sharedUtil.getProjectRoot(project.path);

		projectsCollection.addUserToProject(user, project)
		.then(function(doc) {
			return addProjectToUser(user, project);
		})
		.then(function(result) {
			return res.end();
		})
		.catch(function(err){
			// just need one of these
			console.log('error:', err);
			res.end();
		});
	});
	
	/**
	 * Removes a project from a user's shared project list.
	 * Project might have been deleted or just user removed from shared list.
	 */
	app.delete('/:project/:user', function(req, res) {
		var project = fileUtil.getFile(req, decodeURIComponent(req.params.project).substring(5 + req.contextPath.length));
		var user = req.params.user;
		project = sharedUtil.getProjectRoot(project.path);

		projectsCollection.removeUserFromProject(user, project)
		.then(function() {
			return removeProjectFromUser(user, project);
		})
		.then(function(result) {
			res.end();
		});
	});
	
	return app;
};
