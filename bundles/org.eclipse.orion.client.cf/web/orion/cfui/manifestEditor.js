/*******************************************************************************
 * @license
 * Copyright (c) 2014, 2015 IBM Corporation and others.
 * All rights reserved. This program and the accompanying materials are made
 * available under the terms of the Eclipse Public License 2.0
 * (http://www.eclipse.org/legal/epl-v10.html), and the Eclipse Distribution
 * License v1.0 (http://www.eclipse.org/org/documents/edl-v10.html).
 *
 * Contributors: IBM Corporation - initial API and implementation
 ******************************************************************************/
/*eslint-env browser, amd*/
define(['i18n!cfui/nls/messages', 'require', 'orion/xhr', 'orion/Deferred', 'orion/operation', 'orion/cfui/cFClient'],
 function(messages, require, xhr, Deferred, operation, cFClient) {

 	var cfService = new cFClient.CFService();

	var settings = {
		filePath : null,
		projectName : null,
		services : null
	};

	/* XHR communication */
	var contentType = "application/json; charset=UTF-8";

	var handleResponse = function(deferred, result) {
		var response =  result.response ? JSON.parse(result.response) : null;

		if (result.xhr && result.xhr.status === 202) {
			var def = operation.handle(response.Location);
			def.then(deferred.resolve, function(data) {
				data.failedOperation = response.Location;
				deferred.reject(data);
			}, deferred.progress);
			deferred.then(null, function(error){def.reject(error);});
			return;
		}
		deferred.resolve(response);
		return;
	};

	var getMetadata = function(){
		var d = new Deferred();
		xhr("GET", settings.filePath + '?parts=meta', {
			headers : {
				"Orion-Version" : "1",
				"Content-Type" : contentType
			},
			timeout : 15000
		}).then(function(resp) {
			handleResponse(d, resp);
		}, function(error){
			d.reject(error);
		});
		return d;
	};

	/* best effort to retrieve available service instances */
	var cacheServices = function(){
		if(settings.services === null){
			cfService.getTarget().then(function(target){
				cfService.getServices(target).then(function(resp){

					var services = resp.Children;
					settings.services = services;
				});
			});
		}
	};

	var getProjectName = function(name){
		if(name.indexOf(" | ") !== -1){
			var s = name.split(" | ");
			return s.length > 1 ?name.split(" | ")[1].trim() : name;
		} else
			return name;
	};

	var slugify = function(input){
		return input.toLowerCase().replace(/\s+/g, '-').replace(/[^\w\-]+/g, '').trim();
	};

	var isEnabled = function(){
		var fileName = settings.filePath ? settings.filePath.split('/').pop() : null;
		return fileName.toLowerCase() === "manifest.yml";
	};

	var proposalCmp = function(p, q){
		return p.proposal.localeCompare(q.proposal);
	};

	var getPositions = function(template){

		var positions = [];
		var matches = template.match(/<\w+>/g);
		matches.forEach(function(match){
			positions.push({
				offset : template.indexOf(match),
				length : match.length
			});
		});

		return positions;
	};

	var keywords = [
		'name: ', 'memory: ', 'memory: 256M', 'memory: 512M', 'memory: 1024M',
		'host: ', 'buildpack: ', 'command: ', 'instances: ', 'instances: 1',
		'path: ', 'path: .', 'timeout: ', 'no-route: true', 'inherit: ',
		'domain: '
	];

	var lists = ['applications:', 'services:'];
	var objects = ['env:'];

	var manifestTemplate = [
		"---",
		"applications:",
		"- name: <name>",
		"  host: <host>",
		"  command: <command>",
		"  memory: 256M",
		"  instances: 1",
		"  path: ."
	];

	var cfManifestContentAssist = {

		computeContentAssist : function(editorContext, options){

			if(!isEnabled())
				return [];

			var proposals = [];
			var prefix = options.prefix;

			/* check if manifest template is required */
			if(options.offset === 0){

				if(settings.filePath !== null){
					var d = new Deferred();

					getMetadata().then(function(resp){

						var project = resp.Parents.pop();
						var projectName = getProjectName(project.Name);

						/* fill in host and application name */
						var proposal = manifestTemplate.join(options.delimiter);
						proposal = proposal.replace(/<name>/g, projectName);
						proposal = proposal.replace(/<host>/g, slugify(projectName));

						proposals.push({
							proposal : proposal,
							description : messages["manifestTemplate"],
							positions : getPositions(proposal)
						});

						d.resolve(proposals.sort(proposalCmp));

					}, function(error){
						d.reject();
					});

					return d;
				}

				var proposal = manifestTemplate.join(options.delimiter);

				proposals.push({
					proposal : proposal,
					description : messages["manifestTemplate"],
					positions : getPositions(proposal)
				});

				return proposals;
			}

			/* static keywords */
			keywords.forEach(function(keyword){
				if(keyword.indexOf(prefix) === 0){
					proposals.push({
						proposal : keyword.substring(prefix.length),
						description : keyword
					});
				}
			});

			/* list keywords */
			lists.forEach(function(keyword){
				if(keyword.indexOf(prefix) === 0){
					var delimiter = options.delimiter;

					var indentation = options.indentation;
					var proposal = keyword.substring(prefix.length) +
						delimiter + indentation + "- ";

					proposals.push({
						proposal : proposal,
						description : keyword
					});
				}
			});

			/* object keywords */
			objects.forEach(function(keyword){
				if(keyword.indexOf(prefix) === 0){
					var delimiter = options.delimiter;

					var indentation = options.indentation;
					var proposal = keyword.substring(prefix.length) +
						delimiter + indentation + "  ";

					proposals.push({
						proposal : proposal,
						description : keyword
					});
				}
			});

			/* add services as static keywords */
			if(settings.services !== null){
				settings.services.forEach(function(service){
					if(service.Name.indexOf(prefix) === 0){
						proposals.push({
							proposal : service.Name.substring(prefix.length),
							description : service.Name
						});
					}
				});
			}

			/* xhr properties */
			if(settings.filePath !== null){

				if("name: ".indexOf(prefix) === 0 || "host: ".indexOf(prefix) === 0 || "services: ".indexOf(prefix) === 0){
					var d = new Deferred();
					getMetadata().then(function(resp){

						var project = resp.Parents.pop();
						var projectName = getProjectName(project.Name);

						if("host: ".indexOf(prefix) === 0){
							proposals.unshift({
								proposal : "host: ".substring(prefix.length) + slugify(projectName),
								description : "host: " + slugify(projectName)
							});
						}

						if("name: ".indexOf(prefix) === 0){
							proposals.unshift({
								proposal : "name: ".substring(prefix.length) + projectName,
								description : "name: " + projectName
							});
						}

						if("services: ".indexOf(prefix) === 0 && settings.services !== null){
							var delimiter = options.delimiter;
							var indentation = options.indentation;
							var proposal = "services: ".substring(prefix.length) +
								delimiter + indentation + "- ";

							settings.services.forEach(function(service){
								proposals.push({
									proposal : proposal + service.Name,
									description : "services: " + service.Name
								});
							});
						}

						d.resolve(proposals.sort(proposalCmp));

					}, function(error){
						d.reject(error);
					});

					return d;
				}
			}

			return proposals.sort(proposalCmp);
		}
	};

	var cfManifestValidator = {

		computeProblems : function(editorContext, options){

			/* set up file path */
			settings.filePath = options.title;

			if(!isEnabled()){
				return {
					problems : []
				};
			}

			/* cache whatever's possible */
			cacheServices();

			var problems = [];
			return editorContext.getText().then(function(contents){
				var lines = contents.split(/\r?\n/);

				/* TODO: Turn into a configurable setting */
				/* missing command property should indicate a manifest warning */
				var missingCommand = false; /* true */
				var missingApplications = false; /* true */

				var applicationsLine = -1;

				for(var i=0; i<lines.length; ++i){

					var line = lines[i];
					line = line.split('#')[0]; /* bear in-line comments */

					var lineNumber = i + 1; /* start with 1 */

					/* empty lines are fine */
					if(line.length === 0 || !line.trim())
						continue;

					if(/^ *command: .*/.test(line))
						missingCommand = false;

					if(/^ *applications:.*/.test(line)){
						missingApplications = false;
						applicationsLine = lineNumber;
					}
				}

				if(missingCommand && !missingApplications){
					problems.push({
						description : messages["missingApplicationCommand"],
						start : 0,
						severity: "warning"
					});
				}

				if(settings.filePath !== null){

					var d = new Deferred();
					cfService.getManifestInfo(settings.filePath, true).then(function(resp){

						/* nothing to do */
						d.resolve({ problems : problems });

					}, function(error){
						if(error.JsonData){

							/* got error details */
							var details = error.JsonData;
							var errorLine = details.Line || applicationsLine;
							var problem = null;

							if(errorLine > 0){
								problem = {
									description : details.Message,
									line : errorLine,
									start : 1,
									end : lines[errorLine - 1].length + 1
								};
							} else {
								problem = {
									description : details.Message,
									start: 0
								};
							}

							if(details.Severity === "Warning")
								problem.severity = "warning";

							problems.push(problem);

						} else {
							problems.push({
								description : error.Message,
								start : 0
							});
						}

						d.resolve({ problems : problems });
					});

					return d;
				}

				return {
					problems : problems
				};
			});
		}
	};

	return {
		contentAssistImpl : cfManifestContentAssist,
		validatorImpl : cfManifestValidator
	};
});
