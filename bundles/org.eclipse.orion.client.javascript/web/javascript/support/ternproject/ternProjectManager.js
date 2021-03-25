/*******************************************************************************
 * @license
 * Copyright (c) 2015, 2018 IBM Corporation and others.
 * All rights reserved. This program and the accompanying materials are made
 * available under the terms of the Eclipse Public License 2.0
 * (http://www.eclipse.org/legal/epl-v10.html), and the Eclipse Distribution
 * License v1.0 (http://www.eclipse.org/org/documents/edl-v10.html).
 *
 * Contributors:
 *     IBM Corporation - initial API and implementation
 *******************************************************************************/
 /*eslint-env amd, browser*/
define([
	'orion/objects',
	'orion/Deferred',
	'orion/URITemplate',
	'orion/i18nUtil',
	'javascript/support/ternproject/ternProjectValidator',
	'i18n!javascript/nls/problems',
	'javascript/plugins/ternDefaults'
], function(Objects, Deferred, URITemplate, i18nUtil, Validator, Messages, TernDefaults) {

	/**
	 * @description Creates a new Tern project manager
	 * @constructor
	 * @public
	 * @param {TernWorker} ternWorker The running Tern worker
	 * @param {ScriptResolver} scriptResolver The backing script resolver
	 * @param {ServiceRegistry} serviceRegistry The service registry 
	 * @since 8.0
	 */
	function TernProjectManager(ternWorker, scriptResolver, serviceRegistry, setStarting) {
		this.ternWorker = ternWorker;
		this.scriptResolver = scriptResolver;
		this.projectLocation = null;
		this.currentFile = null;
		this.registry = serviceRegistry;
		this.starting = setStarting;
		this.json = null;
		this.modified = false;
		this.ineditor = false;
	}

	Objects.mixin(TernProjectManager.prototype, {
		/**
		 * @description Report a problem with the file to the page status
		 * @function
		 * @private
		 */
		_report: function _report(heading, message) {
			if(!this.inEditor) {
				var head = heading;
				if(!head) {
					head = Messages['problemInFile'];
				}
				var msg = Object.create(null);
				msg.HTML = true;
				msg.Severity = "Error"; //$NON-NLS-1$
				msg.Message = "<b>"+head+"</b>" + //$NON-NLS-1$ //$NON-NLS-2$
							  "<p>"+message+"</p>"; //$NON-NLS-1$ //$NON-NLS-2$
				if(this.currentFile) {
					var href = new URITemplate("#{,resource,params*}").expand( //$NON-NLS-1$
							{
								resource: this.currentFile,
								params: {}
							});
					msg.Message += "<p><a href=\""+href+"\" alt=\""+Messages['openFile']+"\">"+Messages['openFile']+"</a></p>"; //$NON-NLS-1$ //$NON-NLS-2$ //$NON-NLS-3$ //$NON-NLS-4$
				}
				this.registry.getService("orion.page.message").setProgressResult(msg); //$NON-NLS-1$
			}
		},
		
		/**
		 * @description Refreshes the held info in the manager and sends out a server start request
		 * as needed
		 * @function
		 * @param {String} file The fully qualified name of the file
		 */
		refresh : function(file, contents, env) {
			this.currentFile = file;
			try {
				this.json = contents ? JSON.parse(contents) : Object.create(null);
				this._simpleValidate(this.json);
			} catch(err) {
				this._report(Messages['errorParsing'], err);
				this.json = Object.create(null);
			}
			return this.loadTernProjectOptions(this.json, env);
		},
		
		/**
		 * @description description
		 * @function
		 * @private
		 * @param {Object} json
		 * @returns returns
		 */
		_simpleValidate: function _simpleValidate(json) {
			this._hasValidationProblem = false;
			if(!this.inEditor) {
				var problems = Validator.validate(json);
				if(problems.length > 1) {
					var pbString = '<ul>'; //$NON-NLS-1$
					problems.forEach(function(pb) {
						pbString += "<li>"+pb+"</li>"; //$NON-NLS-1$ //$NON-NLS-2$
					});
					pbString += "</ul>"; //$NON-NLS-1$
					this._hasValidationProblem = true;
					this._report(Messages['multiAttrProblems'], pbString);
				} else if(problems.length === 1) {
					this._hasValidationProblem = true;
					this._report(Messages['attrProblem'], problems[0]);
				}
			}
		},
		
		/**
		 * Loads the given jsonOptions into Tern, either by restarting the Tern server with new initialization options
		 * or by adding additional type information to the running Tern server.  The messages sent to Tern are processed
		 * asynchronously and will not be complete when this function returns.
		 * @param {?} jsonOptions options to load into Tern
		 * @param {?} env the optional computed environment
		 */
		loadTernProjectOptions: function(jsonOptions, env) {
			var opts = prepareOptions(jsonOptions || Object.create(null), env);
			opts.projectLoc = this.projectLocation;
			if (Array.isArray(opts.loadEagerly) && opts.loadEagerly.length > 0) {
				var fileLoadPromises = [];
				this._fileLoadWarnings = [];
				var filesToLoad = [];
				for (var i = 0; i < opts.loadEagerly.length; i++) {
					var filename = opts.loadEagerly[i];
					var ext = 'js'; //$NON-NLS-1$
					if (filename.match(/\.html$/)){
						ext = 'html'; //$NON-NLS-1$
					} else if (filename.match(/\.htm$/)){
						ext = 'htm'; //$NON-NLS-1$
					}
					if(this.projectLocation) {
						this.scriptResolver.setSearchLocation(this.projectLocation);
					}
					fileLoadPromises.push(this.scriptResolver.getWorkspaceFile(filename, {ext: ext}).then(function(_filename, files) {
						if (Array.isArray(files) && files.length > 0){
							if (files.length > 1) {
								this._fileLoadWarnings.push(i18nUtil.formatMessage(Messages['multipleFileMatchesProblem'], _filename, files[0].location));
							}
							filesToLoad.push(files[0].location);
						} else {
							this._fileLoadWarnings.push(i18nUtil.formatMessage(Messages['noFileMatchProblem'], _filename));
						}
					}.bind(this, filename)));
				}
				if (!this._hasValidationProblem){
					this.registry.getService("orion.page.message").setProgressMessage(Messages['fileMatchProgress']); //$NON-NLS-1$
				}
				opts.loadEagerly = filesToLoad;
				if(fileLoadPromises.length > 0) {
					return Deferred.all(fileLoadPromises).then(function(){
						if (!this._hasValidationProblem){  // Don't hide validation warnings
							this.registry.getService("orion.page.message").close(); //$NON-NLS-1$
							if (this._fileLoadWarnings.length > 0){
								var message = "";
								for (var j=0; j<this._fileLoadWarnings.length && j<10; j++) {
									message += this._fileLoadWarnings[j] + '<br>'; //$NON-NLS-1$
								}
								if (this._fileLoadWarnings.length > 10){
									message += i18nUtil.formatMessage(Messages['tooManyFileMatchProblems'],this._fileLoadWarnings.length-10) + '<br>'; //$NON-NLS-1$
								}
								this._report(Messages['fileMatchProblems'], message);
							}
						}
						this._fileLoadWarnings = [];
						this.ternWorker.postMessage({request: "start_server", args: {options: opts}}); //$NON-NLS-1$
					}.bind(this));
				}
				this.ternWorker.postMessage({request: "start_server", args: {options: opts}}); //$NON-NLS-1$
			} else {
				this.ternWorker.postMessage({request: "start_server", args: {options: opts}}); //$NON-NLS-1$
			}
		},
		/**
		 * @callback
		 */
		onDeleted: function onDeleted(jsProject, qualifiedName, fileName) {
			if(jsProject.importantChange(qualifiedName, fileName) && qualifiedName.indexOf(jsProject.getProjectPath()) === 0) {
				jsProject.getComputedEnvironment().then(function(env) {
					this.loadTernProjectOptions(null, env);	
				}.bind(this));
			}
		},
		/**
		 * @callback
		 */
		onMoved: function onMoved(jsProject, qualifiedName, fileName, toQualified, toName) {
			if(jsProject.importantChange(qualifiedName, fileName) && qualifiedName.indexOf(jsProject.getProjectPath()) === 0) {
				//same as a delete
				return jsProject.getComputedEnvironment().then(function(env) {
					this.loadTernProjectOptions(null, env);	
				}.bind(this));
			}
			if(jsProject.importantChange(toQualified, toName) && toQualified.indexOf(jsProject.getProjectPath()) === 0) {
				//same as adding
				return jsProject.getComputedEnvironment().then(function(env) {
					var file = env.ternproject ? env.ternproject.file : null;
					if(file && file.contents) {
						this.refresh(file.name, file.contents, env);
					} else {
						this.loadTernProjectOptions(null, env);
					}
				}.bind(this));
			}
		},
		/**
		 * @callback 
		 */
		onModified: function onModified(jsProject, fullPath, shortName) {
			this.modified = jsProject.importantChange(fullPath, shortName);
			if(this.modified && !this.ineditor) {
				this.modified = false;
				this.starting();
				//contents changed while not editing, restart
				return jsProject.getComputedEnvironment().then(function(env) {
					var file = env.ternproject ? env.ternproject.file : null;
					if(file && file.contents) {
						this.refresh(file.name, file.contents, env);
					} else {
						this.loadTernProjectOptions(null, env);
					}
				}.bind(this));
			}
		},
		/**
		 * @callback 
		 */
		onInputChanged: function onInputChanged(jsProject, evnt, projectName) {
			var loc = evnt.file.location ? evnt.file.location : evnt.file.Location,
				_name = evnt.file.name ? evnt.file.name : evnt.file.Name;
			this.ineditor = jsProject.importantChange(loc, _name);
			if(this.modified && !this.ineditor) {
				this.modified = false;
				this.starting();
				return jsProject.getComputedEnvironment().then(function(env) {
					var file = env.ternproject ? env.ternproject.file : null;
					if(file && file.contents) {
						this.refresh(file.name, file.contents, env);
					} else {
						this.loadTernProjectOptions(null, env);
					}
				}.bind(this));
			}
		},	
		/**
		 * @callback
		 */
		onProjectChanged: function onProjectChanged(jsProject, evnt, projectName) {
			this.projectLocation = projectName;
			var loc = evnt.file.location ? evnt.file.location : evnt.file.Location,
				_name = evnt.file.name ? evnt.file.name : evnt.file.Name;
			this.ineditor = this.modified = jsProject.importantChange(loc, _name);
			this.scriptResolver.setSearchLocation(projectName);
			if(!this.ineditor) {
				this.starting();
				return jsProject.getComputedEnvironment().then(function(env) {
					if(!projectName) {
						return this.loadTernProjectOptions(); // code editor sends out bogus events for files that have no projects
					}
					var file = env.ternproject ? env.ternproject.file : null;
					if(file && file.contents) {
						this.refresh(file.name, file.contents, env);
					} else {
						this.loadTernProjectOptions(null, env);
					}
				}.bind(this));
			}
		}
	});

	/**
	 * @description merges the configurations from the actual .tern-project file and the computed project setup
	 * @param {?} json The JSON from the actual .tern-project file
	 * @param {?} env The computed environment
	 * @since 14.0
	 */
	function prepareOptions(json, env) {
		if(typeof env.ecmaVersion === 'number') {
			if(!json.ecmaVersion) {
				//just set it
				json.ecmaVersion = env.ecmaVersion;
			} else if(env.ecmaVersion > json.ecmaVersion){
				//only set it if its greater (more compatible) - don't downgrade ECMA via multiple configs
				json.ecmaVersion = env.ecmaVersion;
			}
		}
		if(env && env.envs) {
			//TODO make this more dynamic once we have the ability to install definition files and plugins
			TernDefaults.defNames.forEach(function(def) {
				if(env.envs[def]) {
					if(!Array.isArray(json.libs)) {
						json.libs = [def];	
					} else if(json.libs.indexOf(def) < 0) {
						json.libs.push(def);
					}
				}
			});
			if(Array.isArray(env.defs)) {
				if(!Array.isArray(json.libs)) {
					json.libs = [];
				}
				env.defs.forEach(function(def) {
					if(json.libs.indexOf(def) < 0) {
						json.libs.push(def);
					}
				});
			}
			Object.keys(TernDefaults.plugins.optional).forEach(function(key) {
				if(env.envs[key]) {
					if(!json.plugins) {
						json.plugins = {};
					}
					if(!json.plugins[key]) {
						json.plugins[key] = {};
					}
				}				
			});
		}
		return json;
	}

	return {
		TernProjectManager : TernProjectManager
	};
});
