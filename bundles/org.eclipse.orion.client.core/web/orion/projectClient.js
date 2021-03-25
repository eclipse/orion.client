/*******************************************************************************
 * @license
 * Copyright (c) 2013, 2017 IBM Corporation and others.
 * All rights reserved. This program and the accompanying materials are made
 * available under the terms of the Eclipse Public License 2.0
 * (http://www.eclipse.org/legal/epl-v10.html), and the Eclipse Distribution
 * License v1.0 (http://www.eclipse.org/org/documents/edl-v10.html).
 *
 * Contributors: IBM Corporation - initial API and implementation
 ******************************************************************************/

/*eslint-env browser, amd*/
define([
	'orion/Deferred',
	'orion/objects',
	'orion/extensionCommands',
	'orion/i18nUtil',
], function(Deferred, objects, mExtensionCommands, i18nUtil){

	function _toJSON(text) {
		try {
			return text ? JSON.parse(text) : {};
		} catch (e) {
			return {__TEXT__: String(text)};
		}
	}

	/**
	 * @param {Object} target
	 * @param {orion.serviceregistry.ServiceReference} serviceReference
	 */
	function mixinProperties(target, serviceReference) {
		serviceReference.getPropertyKeys().forEach(function(key) {
			target[key] = serviceReference.getProperty(key);
		});
	}

	/**
	 * Creates a new project client.
	 * @class Project client provides client-side API to handle projects based on given file client.
	 * @name orion.projectClient.ProjectClient
	 */
	function ProjectClient(serviceRegistry, fileClient) {
		this.serviceRegistry = serviceRegistry;
		this.fileClient = fileClient;
		this.allProjectHandlersReferences = serviceRegistry.getServiceReferences("orion.project.handler"); //$NON-NLS-0$
		this.allProjectDeployReferences = serviceRegistry.getServiceReferences("orion.project.deploy"); //$NON-NLS-0$
		this._serviceRegistration = serviceRegistry.registerService("orion.project.client", this); //$NON-NLS-0$
		this._launchConfigurationsDir = "launchConfigurations"; //$NON-NLS-0$
	}

	ProjectClient.prototype = /**@lends orion.ProjectClient.ProjectClient.prototype */ {
		_getProjectJsonData : function(folderMetadata, children, workspace){
            var deferred = new Deferred();
            var json = {};
            json.Name = folderMetadata.Name;
            json.ContentLocation = folderMetadata.Location;
            json.WorkspaceLocation = workspace.Location;
            var projectId;
            workspace.Children.some(function(child) {
                if (child.Location === folderMetadata.Location) {
                    projectId = child.Id;
                    return true;
                }
                return false;
            });
            workspace.Projects && workspace.Projects.some(function(project) {
                if (project.Id === projectId) {
                    json.ProjectLocation = project.Location;
                    return true;
                }
                return false;
            });
            var fileLocation = null;
            for(var i=0; i<children.length; i++){
                if(children[i].Name === "project.json"){
                    fileLocation = children[i].Location;
                    break;
                }
            }
            if (fileLocation) {
                this.fileClient.read(fileLocation).then(function(content) {
                    objects.mixin(json, _toJSON(content));
                    json.ProjectJsonLocation = fileLocation;
                    deferred.resolve(json);
                }, function() {
                    deferred.resolve(json);
                }, deferred.progress);
            } else {
                deferred.resolve(json);
            }
            return deferred;
        },
        
		getProject: function (metadata) {
			if (!metadata || metadata.Projects || !metadata.Parents) {
				return new Deferred().resolve(null);
			}
			while (metadata.parent && metadata.parent.parent && metadata.parent.parent.type !== "ProjectRoot") {
				metadata = metadata.parent;
			}
			if (metadata.Parents && metadata.Parents.length > 0) {
				var topParent = metadata.Parents[metadata.Parents.length - 1];
				if (topParent.Children) {
					topParent.ContentLocation = topParent.Location;
					return new Deferred().resolve(topParent);
				}
				return this.fileClient.read(topParent.Location, true).then(function(project) {
					project.ContentLocation = project.Location;
					return project;
				});
			}
			if (!metadata.Directory) {
				// climbed the metadata and still a file,
				// must be a file in the workspace root and therefore has no validly associated project
				return new Deferred().resolve(null);
			}
			metadata.ContentLocation = metadata.Location;
			return new Deferred().resolve(metadata);
		},
		
        readAllProjects : function(workspaceMetadata){
			var deferred = new Deferred();

			if(!workspaceMetadata.Children){
				deferred.resolve([]);
				return deferred;
			}
			var projects = [];
			var projectDeferrds = [];
			for(var i=0; i<workspaceMetadata.Children.length; i++){
				var projectDeferred = new Deferred();
				this.readProject(workspaceMetadata.Children[i], workspaceMetadata).then(projectDeferred.resolve,
					function(error){
						this.resolve(null);
					}.bind(projectDeferred));
				projectDeferrds.push(projectDeferred);
				projectDeferred.then(function(projectMetadata){
					if(projectMetadata){
						projects.push(projectMetadata);
					}
				});
			}
			Deferred.all(projectDeferrds).then(function(){
				deferred.resolve(projects);
			});
			return deferred;
		},
		readProject : function(fileMetadata, workspaceMetadata){
			var that = this;
			var deferred = new Deferred();

			function readProjectFromWorkspace(fileMetadata, workspace, deferred){
				if(fileMetadata.Parents && fileMetadata.Parents.length>0){
					var topFolder = fileMetadata.Parents[fileMetadata.Parents.length-1];
					if(topFolder.Children){
						that._getProjectJsonData.bind(that)(topFolder, topFolder.Children, workspace).then(deferred.resolve, deferred.reject, deferred.progress);
					} else if(topFolder.ChildrenLocation) {
						this.fileClient.fetchChildren(topFolder.ChildrenLocation).then(function(children){
							that._getProjectJsonData.bind(that)(topFolder, children, workspace).then(deferred.resolve, deferred.reject, deferred.progress);
						},
						deferred.reject,
						deferred.progress);
					} else {
						deferred.resolve(null);
					}
					return deferred;
				} else if(fileMetadata.Children) {
					that._getProjectJsonData.bind(that)(fileMetadata, fileMetadata.Children, workspace).then(deferred.resolve, deferred.reject, deferred.progress);
					return deferred;
				} else if(fileMetadata.ChildrenLocation){
					this.fileClient.fetchChildren(fileMetadata.ChildrenLocation).then(function(children){
						that._getProjectJsonData.bind(that)(fileMetadata, children, workspace).then(deferred.resolve, deferred.reject, deferred.progress);
					},
					deferred.reject,
					deferred.progress);
					return deferred;
				} else {
					deferred.resolve(null);
					return deferred;
				}
			}
			if(workspaceMetadata){
				readProjectFromWorkspace.call(that, fileMetadata, workspaceMetadata, deferred);
			} else {
				this.fileClient.getWorkspace(fileMetadata.Location).then(function(workspace){
					readProjectFromWorkspace.call(that, fileMetadata, workspace, deferred);
				});
			}
			return deferred;
		},

		/**
		 * Initializes a project in a folder.
		 * @param {String} contentLocation The location of the parent folder
		 * @return {Object} projectMetadata JSON representation of the created folder
		 */
		initProject : function(contentLocation, projectMetadata) {
			return new Deferred().resolve({ContentLocation: contentLocation, projectMetadata: projectMetadata});
		},
		
		createProject: function(workspaceLocation, projectMetadata){
			var deferred = new Deferred();

			this.fileClient.createProject(workspaceLocation, projectMetadata.Name, projectMetadata.ContentLocation, true).then(
				function(fileMetadata){
					delete projectMetadata.Name;
					deferred.resolve(this.initProject(fileMetadata.ContentLocation, projectMetadata));
				}.bind(this),
				function(error){
					deferred.reject(error);
				},
				function(progress){
					deferred.progress(progress);
				}
			);

			return deferred;
		},

		getDependencyFileMetadata : function(dependency, workspaceLocation){
		var deferred = new Deferred();
		var that = this;
		function getLastChild(childrenLocation, path){
			this.fileClient.fetchChildren(childrenLocation).then(function(children){
				for(var i=0; i<children.length; i++){
					if(children[i].Name === path[0]){
						if(path.length===1){
							deferred.resolve(children[i]);
						} else {
							getLastChild.bind(that)(children[i].ChildrenLocation, path.splice(1, path.length-1));
						}
						return;
					}
				}
					deferred.reject(dependency.Location + " could not be found in your workspace");
			}, function(error){deferred.reject(error);});
		}

		if(dependency.Type==="file"){
			var path = dependency.Location.split("/");
			this.fileClient.loadWorkspace(workspaceLocation).then(function(workspace){
						for(var i=0; i<workspace.Children.length; i++){
							if(workspace.Children[i].Name===path[0]){
								if(path.length===1){
									deferred.resolve(workspace.Children[i]);
								} else {
									getLastChild.bind(that)(workspace.Children[i].ChildrenLocation, path.splice(1, path.length-1));
								}
								return;
							}
						}
						deferred.reject(dependency.Location + " could not be found in your workspace");
			}, function(error){deferred.reject(error);});
			return deferred;
		}
		return this.getProjectHandler(dependency.Type).then(function(handler) {
			if(handler===null){
				deferred.reject(dependency.Type + " is not supported.");
				return deferred;
			}

			var validator;
			if(handler.validationProperties){
				validator = mExtensionCommands._makeValidator(handler, this.serviceRegistry, []);
			}

			this.fileClient.loadWorkspace(workspaceLocation).then(function(workspace){
				var checkdefs = [];
				var found = false;
				for(var i=0; i<workspace.Children.length; i++){
					if(found===true){
						break;
					}
					if(validator && validator.validationFunction(workspace.Children[i])){
						var def = handler.getDependencyDescription(workspace.Children[i]);
						checkdefs.push(def);
						(function(i, def){
							def.then(function(matches){
								if(matches && (matches.Location === dependency.Location || matches.Location === dependency.Location + "/")){
									found = true;
									deferred.resolve(workspace.Children[i]);
								}
							});
						})(i, def);
					}
				}
				Deferred.all(checkdefs).then(function(){
					if(!found){
						deferred.reject(dependency.Name + " could not be found in your workspace");
					}
				});
			}, deferred.reject);
			return deferred;
		}.bind(this));
	},
	/**
		* @param {Object} projectMetadata Project metadata
		* @param {Object} dependency The JSON representation of the dependency
		* @param {String} dependency.Type Type of the dependency (i.e. "file")
		* @param {String} dependency.Name String description of the dependency (i.e. folder name)
		* @param {String} dependency.Location Location of the dependency understood by the plugin of given type
		*/
	addProjectDependency: function(projectMetadata, dependency){
		var deferred = new Deferred();
		this.fileClient.fetchChildren(projectMetadata.ContentLocation).then(function(children){
			var writeContent = function (fileLocation, content) {
				var projectJson = _toJSON(content);
				try{
					if(!projectJson.Dependencies){
						projectJson.Dependencies = [];
					}
					for(var j=0; j<projectJson.Dependencies.length; j++){
						if(projectJson.Dependencies[j].Location === dependency.Location){
							deferred.resolve(projectJson);
							return;
						}
					}
					projectJson.Dependencies.push(dependency);
					var json = JSON.stringify(projectJson);
					this.fileClient.write(fileLocation, json).then(
						function(){
							projectJson.ContentLocation = projectMetadata.ContentLocation;
							projectJson.Name = projectMetadata.Name;
							deferred.resolve(projectJson);
						},
						deferred.reject
					);
					deferred.resolve(projectJson);
				} catch (e){
					deferred.reject(e);
				}
			}.bind(this);
			var fileLocation = null;
			for(var i=0; i<children.length; i++){
				if(children[i].Name==="project.json"){
					fileLocation = children[i].Location;
					break;
				}
			}
			if (fileLocation) {
				this.fileClient.read(fileLocation).then(function(content) {
					writeContent(fileLocation, content);
				}.bind(this), deferred.reject, deferred.progress);
			} else {
				this.fileClient.createFile(projectMetadata.ContentLocation, "project.json").then(function(fileMetaData) {
					writeContent(fileMetaData.Location, "{}");
				}.bind(this), deferred.reject, deferred.progress);
			}
		}.bind(this), deferred.reject, deferred.progress);
		return deferred;
	},

	removeProjectDependency: function(projectMetadata, dependency){
		var deferred = new Deferred();
		this.fileClient.fetchChildren(projectMetadata.ContentLocation).then(function(children){
			for(var i=0; i<children.length; i++){
				if(children[i].Name==="project.json"){
					this.fileClient.read(children[i].Location).then(function(content){
						try{
							var projectJson = _toJSON(content);
							if(!projectJson.Dependencies){
								projectJson.Dependencies = [];
							}
							for(var j=projectJson.Dependencies.length-1; j>=0; j--){
								if(projectJson.Dependencies[j].Location === dependency.Location && projectJson.Dependencies[j].Type === dependency.Type){
									projectJson.Dependencies.splice(j,1);
								}
							}
							this.fileClient.write(children[i].Location, JSON.stringify(projectJson)).then(
								function(){
									projectJson.ContentLocation = projectMetadata.ContentLocation;
									projectJson.Name = projectMetadata.Name;
									deferred.resolve(projectJson);
								},
								deferred.reject
							);

						} catch (e){
							deferred.reject(e);
						}
					}.bind(this), deferred.reject, deferred.progress);
					return;
				}
			}
		}.bind(this), deferred.reject);
		return deferred;
	},

	changeProjectProperties: function(projectMetadata, properties){
		if(!properties){
			return;
		}
		var deferred = new Deferred();

		function saveProperties(projectJsonLocation){
			this.fileClient.read(projectJsonLocation).then(function(content){
				try{
					var projectJson = _toJSON(content);
					for(var key in properties){
						projectJson[key] = properties[key];
					}
					this.fileClient.write(projectJsonLocation, JSON.stringify(projectJson)).then(
						function(){
							projectJson.ContentLocation = projectMetadata.ContentLocation;
							projectJson.ProjectJsonLocation = projectJsonLocation;
							projectJson.Name = projectMetadata.Name;
							deferred.resolve(projectJson);
						},
						deferred.reject
					);

				} catch (e){
					deferred.reject(e);
				}
			}.bind(this), deferred.reject);
		}

		if(projectMetadata.ProjectJsonLocation){
			saveProperties.bind(this)(projectMetadata.ProjectJsonLocation);
		}
		return deferred;
	},

	getProjectHandlerTypes: function(){
		var types = [];
		for(var i=0; i<this.allProjectHandlersReferences.length; i++){
			types.push(this.allProjectHandlersReferences[i].getProperty("type"));
		}
		return types;
	},

	_getProjectDeployService: function(serviceReference){
		var service = this.serviceRegistry.getService(serviceReference);
		mixinProperties(service, serviceReference);
		/*
		Expected properties:
		id, nls, name{Key}, tooltip{Key}, parameters, optionalParameters, validationProperties, logLocationTemplate
		*/
		service.id = serviceReference.getProperty("id");
		service.name = serviceReference.getProperty("name");
		service.tooltip = serviceReference.getProperty("tooltip");
		service.parameters = serviceReference.getProperty("parameters");
		service.optionalParameters = serviceReference.getProperty("optionalParameters");
		service.validationProperties = serviceReference.getProperty("validationProperties");
		service.logLocationTemplate = serviceReference.getProperty("logLocationTemplate");
		return service;
	},

	matchesDeployService: function(item, service){
		var validator = mExtensionCommands._makeValidator(service, this.serviceRegistry, []);
		return validator.validationFunction(item);
	},

	getProjectDeployTypes: function(){
		function compareByPriority(ref1,ref2) {
			var prio1 = ref1.getProperty("priorityForDefault") || 0;
			var prio2 = ref2.getProperty("priorityForDefault") || 0;
		  if (prio1 > prio2)
		     return -1;
		  if (prio1 < prio2)
		    return 1;
		  return 0;
		}
		var sortedReferences = this.allProjectDeployReferences.sort(compareByPriority);
		var types = [];
		for(var i=0; i<sortedReferences.length; i++){
			types.push(sortedReferences[i].getProperty("id"));
		}
		return types;
	},

	getProjectDeployService: function(serviceId, type){
		var foundRef;
		// Find by id
		this.allProjectDeployReferences.some(function(serviceRef) {
			if(serviceRef.getProperty("id") === serviceId){
				return (foundRef = serviceRef); // break
			}
			return false;
		});
		if(type){
			// Find by type
			this.allProjectDeployReferences.some(function(serviceRef) {
				if ((serviceRef.getProperty("deployTypes") || []).indexOf(type) !== -1) {
					return (foundRef = serviceRef); // break
				}
				return false;
			});
		}
		return this._getProjectDeployService(foundRef);
	},

	_getProjectHandlerService: function(serviceReference){
		/*
		Expected properties:
		id, nls, type,
		addParameters || addParamethers,
		optionalParameters || optionalParamethers,
		addDependencyName{Key}, addDependencyTooltip{Key}, addProjectName{Key} addProjectTooltip{Key},
		actionComment, validationProperties
		*/
		var service = this.serviceRegistry.getService(serviceReference);
		mixinProperties(service, serviceReference);

		// Canonicalize legacy names
		service.addParameters = service.addParameters || service.addParamethers;
		service.optionalParameters = service.optionalParameters || service.optionalParamethers;
		delete service.addParamethers;
		delete service.optionalParamethers;
		return service;
	},

	/**
	 * @returns {orion.Promise} A promise resolving to the handler (the returned handler is localized)
	 */
	getProjectHandler: function(type){
		for(var i=0; i<this.allProjectHandlersReferences.length; i++){
			if(this.allProjectHandlersReferences[i].getProperty("type") === type){
				var handler = this._getProjectHandlerService(this.allProjectHandlersReferences[i]);
				return new Deferred().resolve(handler); // this is not optimal -- we should not need a promise here...
			}
		}
		return new Deferred().reject();
	},

	getMatchingProjectHandlers: function(item){
		var handlers = [];
		for(var i=0; i<this.allProjectHandlersReferences.length; i++){
			var handlerInfo = this.allProjectHandlersReferences[i]._properties;
			var validator = mExtensionCommands._makeValidator(handlerInfo, this.serviceRegistry, []);
			if(validator.validationFunction(item)){
				handlers.push(this._getProjectHandlerService(this.allProjectHandlersReferences[i]));
			}
		}
		return handlers;
	},

	getLaunchConfigurationsDir: function(projectMetadata, create){
		var deferred = new Deferred();
		var fetchLocation = projectMetadata.ContentLocation;
		if(fetchLocation) {
			if (fetchLocation.indexOf("?depth=") === -1) { //$NON-NLS-0$
				fetchLocation += "?depth=1"; //$NON-NLS-0$
			}
			this.fileClient.read(fetchLocation, true).then(function(projectDir){
				var children = projectDir.Children;
				for(var i=0; i<children.length; i++){
					if(children[i].Name && children[i].Name===this._launchConfigurationsDir){
						deferred.resolve(children[i]);
						return deferred;
					}
				}
				if(create){
					this.fileClient.createFolder(projectMetadata.ContentLocation, this._launchConfigurationsDir).then(
						function(result){
							result.parent = projectDir;
							deferred.resolve(result);
						}, deferred.reject);
				} else {
					deferred.resolve(null);
				}
			}.bind(this), deferred.reject);
		} else {
			deferred.reject();
		}
		return deferred;
	},

	getProjectLaunchConfigurations: function(projectMetadata){
		var deferred = new Deferred();

		this.getLaunchConfigurationsDir(projectMetadata).then(function func(launchConfMeta){
			if(!launchConfMeta){
				deferred.resolve([]);
				return deferred;
			}
			if(launchConfMeta.Children){
				var readConfigurationDeferreds = [];
				for(var i=0; i<launchConfMeta.Children.length; i++){

					var fileName = launchConfMeta.Children[i].Name;
					if(fileName.indexOf(".launch", fileName.length - ".launch".length) === -1) //$NON-NLS-0$ //$NON-NLS-1$
						continue;

					var def = new Deferred();
					var file = launchConfMeta.Children[i];
					readConfigurationDeferreds.push(def);
					(function(def, file){
					this.fileClient.read(file.Location).then(function(launchConf){
						try{
							launchConf = JSON.parse(launchConf);
							launchConf.Name = file.Name.replace(".launch", "");
							launchConf.project = projectMetadata;
							launchConf.File = file;
							launchConf.File.parent = launchConfMeta;
							if (!launchConf.Params) {
								launchConf.Params = {};
							}
							
							launchConf.Params.DevMode = undefined; //reset value
							
							// check if the deploy service supports DevMode and 
							// modify the launch configuration object accordingly
							var deployService = this.getProjectDeployService(launchConf.ServiceId, launchConf.Type);
							
							if (deployService.logLocationTemplate) {
								launchConf.Params.LogLocationTemplate = deployService.logLocationTemplate;
							}
							
							if(deployService && deployService.getDevMode) {
								//copy Java - no path, assume manifest.yml
								var confLoc = projectMetadata.ContentLocation + (typeof launchConf.Path === 'string' ? launchConf.Path : "manifest.yml");
								deployService.getDevMode(confLoc).then(function(devModeParam){
									if (devModeParam) {
										launchConf.Params.DevMode = devModeParam;
									}
									def.resolve(launchConf);
								}, function(){
									def.resolve(launchConf);
								});
							} else {
								def.resolve(launchConf);
							}
						} catch(e){
							console.error(e);
							def.resolve();
						}
					}.bind(this), function(e){
						console.error(e);
						def.resolve();
					});
					}).bind(this)(def, file);
				}
				Deferred.all(readConfigurationDeferreds).then(function(result){
					if(!result || !result.length){
						deferred.resolve([]);
						return;
					}

					for(var i=result.length-1; i>=0; i--){
						if(!result[i]){
							result.splice(i, 1);
						}
					}
					deferred.resolve(result);
				}, deferred.reject);
			} else {
				this.fileClient.fetchChildren(launchConfMeta.ChildrenLocation).then(function(children){
					launchConfMeta.Children = children;
					func.bind(this)(launchConfMeta);
				}.bind(this), deferred.reject);
			}
		}.bind(this), deferred.reject);

		return deferred;
	},

	formLaunchConfiguration: function(configurationName, serviceId, params, url, manageUrl, path, deployType, file){
		var launchConfigurationEnry = {
			Name: configurationName,
			ServiceId: serviceId,
			Params: params,
			Url: url,
			ManageUrl: manageUrl,
			Path: path,
			File: file
		};

		if(deployType){
			launchConfigurationEnry.Type = deployType;
		}
		return launchConfigurationEnry;
	},

	formPluginLaunchConfiguration: function(lc){
		return {
			ConfigurationName: lc.Name,
			Parameters: lc.Params,
			Type: lc.Type,
			Path: lc.Path,
			File: lc.File,
			ServiceId: lc.ServiceId
		};
	},

	_updateOrCreate : function(parent, fileName, contents){
		var self = this;
		var deferred = new Deferred();
		for(var i=0; i<parent.Children.length; ++i){
			if(parent.Children[i].Name === fileName){
				self.fileClient.write(parent.Children[i].Location, contents).then(function(){
					deferred.resolve(parent.Children[i]);
				}, deferred.reject);
				return deferred;
			}
		}

		self.fileClient.createFile(parent.Location, fileName).then(function(result){
			self.fileClient.write(result.Location, contents).then(function(){
					deferred.resolve(result);
				}, deferred.reject);
		});

		return deferred;
	},

	normalizeFileName : function(fileName, extension){
		var tmp = fileName;
		tmp = tmp.replace(/\ /g,' '); //$NON-NLS-0$
		tmp = tmp.replace(/[^\w\d\s-]/g, '');

		if(tmp.indexOf(extension) < 0)
			tmp += extension;

		return tmp;
	},

	_ensureLaunchConfigurationDir: function(projectMetadata, launchConfDir){
		var deferred = new Deferred();
		if(launchConfDir){
			deferred.resolve(launchConfDir);
			return deferred;
		}

		this.getLaunchConfigurationsDir(projectMetadata, true).then(function func(_launchConfDir){
			if(_launchConfDir.Children){
				deferred.resolve(_launchConfDir);
			} else {
				this.fileClient.fetchChildren(_launchConfDir.ChildrenLocation).then(function(children){
					_launchConfDir.Children = children;
					func.bind(this)(_launchConfDir);
				}.bind(this), deferred.reject);
			}
		}.bind(this));

		return deferred;
	},

	saveProjectLaunchConfiguration: function(projectMetadata, configurationName, serviceId, params, url, manageUrl, path, deployType){
		var deferred = new Deferred();

		var configurationFile = this.normalizeFileName(configurationName, ".launch"); //$NON-NLS-0$
		var launchConfigurationEntry = this.formLaunchConfiguration(configurationName, serviceId, params, url, manageUrl, path, deployType);

		this._ensureLaunchConfigurationDir(projectMetadata).then(
			function(launchConfDir){
				/* TODO this is hack, we should handle launch conf represenations and persisting them in a civilized way */
				var launchConfToSave = objects.clone(launchConfigurationEntry);
				launchConfToSave.Name = undefined;
				
				var launchConfigurationContents = JSON.stringify(launchConfToSave, null, 2);
				this._updateOrCreate(launchConfDir, configurationFile, launchConfigurationContents).then(
					function(result){
						launchConfigurationEntry.File = result;
						launchConfigurationEntry.File.parent = launchConfDir;
						
						
						
						// check if the deploy service supports DevMode and 
						// modify the launch configuration object accordingly
						var deployService = this.getProjectDeployService(launchConfigurationEntry.ServiceId, launchConfigurationEntry.Type);
						
						if (deployService.logLocationTemplate) {
							launchConfigurationEntry.Params.LogLocationTemplate = deployService.logLocationTemplate;
						}
						
						if(deployService && deployService.getDevMode) {
							//copy Java - if not path in launch config, assume manifest.yml
							var confLoc = projectMetadata.ContentLocation + (typeof launchConfigurationEntry.Path === 'string' ? launchConfigurationEntry.Path : "manifest.yml");
							deployService.getDevMode(confLoc).then(function(devModeParam){
								if (devModeParam) {
									launchConfigurationEntry.Params.DevMode = devModeParam;
								}
								deferred.resolve(launchConfigurationEntry);
							}, function(){
								deferred.resolve(launchConfigurationEntry);
							});
						} else {
							deferred.resolve(launchConfigurationEntry);
						}
					}.bind(this), deferred.reject
				);
			}.bind(this), deferred.reject
		);
		return deferred;
	},

	deleteProjectLaunchConfiguration: function(launchConf){
		var deferred = new Deferred();

		if(!launchConf.File || !launchConf.File.Location){
			/* nothing to do */
			deferred.resolve();
			return deferred;
		}

		this.fileClient.deleteFile(launchConf.File.Location).then(deferred.resolve, deferred.reject);
		return deferred;
	}

	};//end ProjectClient prototype
	ProjectClient.prototype.constructor = ProjectClient;

	//return the module exports
	return {ProjectClient: ProjectClient};
});
