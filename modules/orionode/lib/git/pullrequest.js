/*******************************************************************************
 * Copyright (c) 2012, 2017 IBM Corporation and others.
 * All rights reserved. This program and the accompanying materials are made 
 * available under the terms of the Eclipse Public License 2.0 
 * (http://www.eclipse.org/legal/epl-v10.html), and the Eclipse Distribution 
 * License v1.0 (http://www.eclipse.org/org/documents/edl-v10.html). 
 *
 * Contributors:
 *		 IBM Corporation - initial API and implementation
 *******************************************************************************/
/*eslint-env node */
var clone = require('./clone'),
	express = require('express'),
	request = require('request'),
	url = require("url"),
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

	return express.Router()
	.use(responseTime({digits: 2, header: "X-GitapiPullrequest-Response-Time", suffix: true}))
	.use(options.checkUserAccess)
	.post(fileRoot + '*', getPullRequest);
	
function pullRequestJSON(cloneDir,remoteDir,bodyJson) {
	var children = [];
	for(var i = 0; i < bodyJson.length; i ++){
		var child = 
		{
			"CloneLocation": cloneDir,
			"RemoteLocation": remoteDir,
			"Type":"PullRequest",
			"PullRequest": bodyJson[i]
		};
		children.push(child); 
	}
	var pullrequestJson =  {
		"Type":"PullRequest",
		"Children":children
	};	
	return pullrequestJson;
}

function getPullRequest(req, res) {
	var gitUrl = req.body["GitUrl"];	
	var gitSshUsername = req.body["GitSshUsername"];
	var gitSshPassword = req.body["GitSshPassword"];
	var authHeader;
	if(gitSshUsername && gitSshPassword){
		var header = gitSshUsername + ':' + gitSshPassword;
		authHeader = 'Basic ' + toBase64(header);
	}
	
	var clientID,clientSecret;
	if(options.configParams){
		clientID =  options.configParams.get("orion.oauth.github.client");
		clientSecret =  options.configParams.get("orion.oauth.github.secret");
	}
    
	var task = new tasks.Task(res, false, true, 0, false);
	if(gitUrl){
		var isSsh = false;
		if (gitUrl.indexOf("@") < gitUrl.indexOf(":") && gitUrl.indexOf("https://") === -1){
			gitUrl = "ssh://" + gitUrl;
			isSsh = true;
		}
		var parsedURL = url.parse(gitUrl);
		var pathnames = parsedURL["pathname"].split("/");   
		var username = isSsh ? pathnames[1].substr(1) : pathnames[1];
		var projectname = pathnames[2].replace(/\.git$/g, "");
		var pullrequestUrl = "https://api.github.com/repos/" + username +"/" + projectname + "/pulls";
		if(clientID && clientSecret){
			pullrequestUrl += "?client_id="+clientID+"&client_secret="+clientSecret;
		}
	}
	var userAgentHeader = {
		url: pullrequestUrl,
		headers: authHeader ? {'User-Agent': 'request',	'Authorization': authHeader} : {'User-Agent': 'request'}
	};
	
	var fileDir, cloneDir, remoteDir,bodyJson, theRepo;
	clone.getRepo(req)
	.then(function(repo) {
		fileDir = clone.getfileDir(repo,req); 
		cloneDir = gitRoot + "/clone" + fileDir;
		remoteDir = gitRoot + "/remote" + fileDir;
		return request(userAgentHeader, function (error, response, body) {
				if (!error && response.statusCode === 200) {
					bodyJson = JSON.parse(body);
					task.done({
						HttpCode: 200,
						Code: 0,
						DetailedMessage: "OK",
						JsonData: pullRequestJSON(cloneDir,remoteDir,bodyJson),
						Message: "OK",
						Severity: "Ok"
					});
				} else if (!error && (response.statusCode === 404 || response.statusCode === 401)) {
					var message = "Repository not found, might be a private repository that requires authentication.";
					if(response.statusCode === 401){
						message = "Not authorized to get the repository information.";
					}
					task.done({
						HttpCode: 401,
						Code: 0,
						JsonData: {"Url": gitUrl},
						DetailedMessage: message,
						Message: message,
						Severity: "Error"
					});
				} else if (!error && response.statusCode === 403 && body.indexOf(" rate limit exceeded") !== -1) {
					task.done({
						HttpCode: 403,
						Code: 0,
						JsonData: {},
						DetailedMessage: "Pull requests for this repository will not be displayed because you have reached the GitHUB API limit while requesting your pull request list." 
							+ isSsh ? "Please consider cloning the repo with HTTPS protocol instead of SSH. This will increase our API limit." : "",
						Message: "Unable to fetch pull request info.",
						Severity: "Warning"
					});
				}else {
					task.done({
						HttpCode: 403,
						Code: 0,
						JsonData: {},
						DetailedMessage: "Unable to fetch pull request info.",
						Message: "Unable to fetch pull request info.",
						Severity: "Error"
					});
				}
			});
	}).catch(function(err){
		clone.handleRemoteError(task, err, gitRoot + "/clone" + fileDir);
	})
	.finally(function() {
		clone.freeRepo(theRepo);
	});
	function toBase64 (str) {
		return (new Buffer(str || '', 'utf8')).toString('base64');
	}
}
};
