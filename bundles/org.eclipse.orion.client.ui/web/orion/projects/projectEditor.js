/*******************************************************************************
 * Copyright (c) 2013, 2019 IBM Corporation and others.
 * All rights reserved. This program and the accompanying materials are made
 * available under the terms of the Eclipse Public License 2.0
 * (http://www.eclipse.org/legal/epl-v10.html), and the Eclipse Distribution
 * License v1.0 (http://www.eclipse.org/org/documents/edl-v10.html).
 *
 * Contributors: IBM Corporation - initial API and implementation
 ******************************************************************************/

/*eslint-env browser, amd*/
define([
	'i18n!orion/edit/nls/messages',
	'orion/i18nUtil',
	'orion/util',
	'orion/URITemplate',
	'orion/webui/littlelib',
	'orion/Deferred',
	'orion/objects',
	'orion/projectCommands',
	'orion/PageLinks',
	'orion/explorers/explorer',
	'orion/section',
	'orion/webui/tooltip'
], function(messages, i18nUtil, util, URITemplate, lib, Deferred, objects, mProjectCommands, PageLinks, mExplorer, mSection, mTooltip) {

	var ID_COUNT = 0;

	var editTemplate = new URITemplate("#{,resource,params*}");

	function ProjectInfoModel(project){
		this.root = project;
	}

	ProjectInfoModel.prototype = new mExplorer.ExplorerModel();
	ProjectInfoModel.prototype.constructor = ProjectInfoModel;

	ProjectInfoModel.prototype.getRoot = function(onItem){
		return onItem(this.root);
	};

	ProjectInfoModel.prototype.getChildren = function(parent, onComplete){
		if(parent === this.root){
			onComplete([
				{id: "Name", displayName: messages.Name, value: parent.Name, no: 1},
				{id: "Description", displayName: messages.Description, value: parent.Description, no: 2},
				{id: "Url", displayName: messages.Site, value: parent.Url, href: parent.Url, no: 3}
				]);
		} else {
			onComplete([]);
		}
	};

	ProjectInfoModel.prototype.getId = function(item){
		return "ProjectInfo" + item.id;
	};

	function ProjectInfoRenderer(options, projectEditor, explorer){
		this._init(options);
		this.projectEditor = projectEditor;
		this.explorer = explorer;
	}

	ProjectInfoRenderer.prototype = new mExplorer.SelectionRenderer();
	ProjectInfoRenderer.prototype.constructor = ProjectInfoRenderer;

	ProjectInfoRenderer.prototype.getCellElement = function(col_no, item, tableRow){
		var labelID = tableRow.id + "Label"; //$NON-NLS-0$
		if(col_no===0) {
			var td = document.createElement("td");
			var b = document.createElement("span");
			b.className = "discreetInputLabel";
			b.id = labelID;
			b.appendChild(document.createTextNode(item.displayName));
			td.classList.add("discreetInputLabel");
			td.appendChild(b);
			td.width = "20%";
			return td;
		}
		if(col_no===1){
			var td;
			if(item.href){
				td = document.createElement("td");

				var urlInput = document.createElement("input");
				urlInput.classList.add("discreetInputHidden"); //$NON-NLS-0$
				lib.setSafeAttribute(urlInput, "aria-labelledby", labelID);

				var urlSelector = document.createElement("div");
				urlSelector.classList.add("discreetInput"); //$NON-NLS-0$
				urlSelector.classList.add("discreetInputURLWrapper"); //$NON-NLS-0$

				var urlLink = document.createElement("a");
				urlLink.href = item.value || "";
				urlLink.appendChild(document.createTextNode(item.value || ""));

				urlSelector.appendChild(urlLink);

				//show url input, hide selector
				urlSelector.onclick = function (event){
					urlSelector.classList.add("discreetInputHidden"); //$NON-NLS-0$
					urlLink.classList.add("discreetInputHidden"); //$NON-NLS-0$
					
					urlInput.classList.remove("discreetInputHidden"); //$NON-NLS-0$
					
					urlInput.focus();
				}.bind(this.projectEditor);

				//make the url editable when the link gains focus
				urlLink.onfocus = urlSelector.onclick;

				//Make pressing "Enter" on the selector do the same think as clicking it
				urlSelector.onkeyup = function(event){
					if(event.keyCode === lib.KEY.ENTER){
						urlSelector.onclick(event);
					}
				}.bind(this.projectEditor);

				urlLink.urlSelector = urlSelector; //refer to selector to be able to make it visible from within _renderEditableFields

				this.projectEditor._renderEditableFields(urlInput, item.id, item.no, urlLink);
				td.appendChild(urlInput);
				td.appendChild(urlSelector);
				return td;
			}
			td = document.createElement("td");
			var input = item.id==="Description" ? document.createElement("textArea") : document.createElement("input");
			lib.setSafeAttribute(input, "aria-labelledby", labelID);
			this.projectEditor._renderEditableFields(input, item.id, item.no, null);
			td.appendChild(input);
			return td;
		}

	};
	
	ProjectInfoRenderer.prototype.getSecondaryColumnStyle = function() {
		return "discreetInputCell"; //$NON-NLS-0$
	};


	function AdditionalInfoModel(project){
		this.root = project;
	}

	AdditionalInfoModel.prototype = new mExplorer.ExplorerModel();
	AdditionalInfoModel.prototype.constructor = AdditionalInfoModel;

	AdditionalInfoModel.prototype.getRoot = function(onItem){
		return onItem(this.root);
	};

	AdditionalInfoModel.prototype.getChildren = function(parent, onComplete){
		if(parent === this.root){
			for(var i=0; i<parent.Children.length; i++){
				parent.Children[i].parent = parent;
			}
			onComplete(parent.Children);
		} else {
			onComplete([]);
		}
	};

	AdditionalInfoModel.prototype.getId = function(item){
		return "AdditionalInfo" + mExplorer.ExplorerModel.prototype.getId.call(this, {Location: item.parent.Name + item.Name});
	};

	function AdditionalInfoRenderer(options, projectEditor, explorer){
		this._init(options);
		this.projectEditor = projectEditor;
		this.explorer = explorer;
	}

	AdditionalInfoRenderer.prototype = new mExplorer.SelectionRenderer();
	AdditionalInfoRenderer.prototype.constructor = AdditionalInfoRenderer;

	AdditionalInfoRenderer.prototype.getCellElement = function(col_no, item, tableRow){
		var labelID = tableRow.id + "Label"; //$NON-NLS-0$
		if(col_no===0) {
			var td = document.createElement("td");
			var b = document.createElement("span");
			b.className = "discreetInputLabel";
			b.id = labelID;
			b.appendChild(document.createTextNode(item.Name));
			td.classList.add("discreetInputLabel");
			td.appendChild(b);
			td.width = "20%";
			return td;
		}
		if(col_no===1){
			var td = document.createElement("td");
			if(item.Href){
				var a = document.createElement("a");
				var uriTemplate = new URITemplate(item.Href);
				a.href = uriTemplate.expand({OrionHome : PageLinks.getOrionHome()});
				a.appendChild(document.createTextNode(item.Value || " "));
				td.appendChild(a);
			} else {
				td.appendChild(document.createTextNode(item.Value || " "));
			}
			lib.setSafeAttribute(td, "aria-labelledby", labelID);
			return td;
		}

	};
	
	AdditionalInfoRenderer.prototype.getSecondaryColumnStyle = function() {
		return "discreetInfoCell"; //$NON-NLS-0$
	};

	function DependenciesModel(project, projectClient){
		this.root = project;
		this.projectClient = projectClient;
	}

	DependenciesModel.prototype = new mExplorer.ExplorerModel();
	DependenciesModel.prototype.constructor = DependenciesModel;

	DependenciesModel.prototype.getRoot = function(onItem){
		return onItem(this.root);
	};

	DependenciesModel.prototype.getChildren = function(parentItem, onComplete){
		if(parentItem === this.root){
			var children = [];
			Deferred.all((parentItem.Dependencies || []).map(function(dependency) {
				var item = {Dependency: dependency, Project: parentItem};
				children.push(item);
				return this.projectClient.getDependencyFileMetadata(dependency, parentItem.WorkspaceLocation).then(function(dependencyMetadata) {
					objects.mixin(item, dependencyMetadata);
				}, function(error) {
					item.Directory = item.disconnected = true;
				});
			}.bind(this))).then(function() {
				onComplete(children);
			}.bind(this));

		} else {
			onComplete([]);
		}
	};

	DependenciesModel.prototype.getId = function(item){
		return mExplorer.ExplorerModel.prototype.getId.call(this, item.Dependency);
	};

	function DependenciesRenderer(options, projectEditor, explorer){
		this._init(options);
		this.projectEditor = projectEditor;
		this.explorer = explorer;
		this.commandService = options.commandRegistry;
		this.actionScopeId = options.actionScopeId;
	}

	DependenciesRenderer.prototype = new mExplorer.SelectionRenderer();
	DependenciesRenderer.prototype.constructor = DependenciesRenderer;

	DependenciesRenderer.prototype.getCellElement = function(col_no, item, tableRow){
		if(col_no===0) {
			var td = document.createElement("td");

			if(item.Location){
				td.className = "navColumnNoIcon";
				var a = document.createElement("a");
				a.href = editTemplate.expand({resource: item.Location}); //$NON-NLS-0$
				a.appendChild(document.createTextNode(item.Dependency.Name));
				td.appendChild(a);
			} else {
				var name = item.Dependency.Name;
				if(item.disconnected){
					name = i18nUtil.formatMessage(messages.Disconnected, name);
				}
				td.appendChild(document.createTextNode(name));
			}
			return td;
		}
		if(col_no===1){
			var actionsColumn = this.getActionsColumn(item, tableRow, null, null, true);
			actionsColumn.style.textAlign = "right";
			return actionsColumn;
		}

	};

	function ProjectEditor(options){
		this.idCount = ID_COUNT++;
		this.serviceRegistry = options.serviceRegistry;
		this.fileClient = options.fileClient;
		this.progress = options.progress;
		this.preferences = options.preferences;
		this.projectClient = this.serviceRegistry.getService("orion.project.client");
		this.commandRegistry = options.commandRegistry;
		this._node = null;
		this.dependencyActions = "dependencyActions";
		this.createCommands();
	}
	ProjectEditor.prototype = {
		createCommands: function(){
			this.dependenciesDisplatcher = mProjectCommands.getDependencyDispatcher();
			var _self = this;

			this.dependneciesListener = function(event){_self.dependenciesChanged.call(_self, event);};
			this._dependenciesEventTypes = ["create", "delete"];
			this._dependenciesEventTypes.forEach(function(eventType) {
				_self.dependenciesDisplatcher.addEventListener(eventType, _self.dependneciesListener);
			});

//			mProjectCommands.createDependencyCommands(this.serviceRegistry, this.commandRegistry, this.fileClient, this.projectClient);
//			var dependencyTypes = this.projectClient.getProjectHandlerTypes();
			this.commandRegistry.registerCommandContribution(this.dependencyActions, "orion.project.dependency.connect", 1); //$NON-NLS-1$ //$NON-NLS-0$
			this.commandRegistry.registerCommandContribution(this.dependencyActions, "orion.project.dependency.disconnect", 2); //$NON-NLS-0$
		},
		changedItem: function(item){
			this.fileClient.read(this.parentFolder.Location, true).then(function(metadata){
				lib.empty(this.node);
				this.displayContents(this.node, metadata);
			}.bind(this));
		},
		display: function(node, projectData){
			this.node = node;
			this.node.className = "orionProject";
			this.projectData = projectData;
			if (util.isElectron) {
				this.node.style.display = "none";
			}
			
			function renderSections(sectionsOrder, sectionNames){
				sectionNames = sectionNames || {};
				sectionsOrder.forEach(function(sectionName){
					var span;
					switch (sectionName) {
						case "projectInfo":
							span = document.createElement("span");
							this.node.appendChild(span);
							this.renderProjectInfo(span, sectionNames[sectionName]);
							break;
						case "additionalInfo":
							span = document.createElement("span");
							this.node.appendChild(span);
							this.renderAdditionalProjectProperties(span);
							break;
						case "dependencies":
							span = document.createElement("span");
							span.id = "projectDependenciesNode";
							this.node.appendChild(span);
							this.renderDependencies(span, sectionNames[sectionName]);
							break;
					}
				}.bind(this));
			}

			var sectionsOrder = ["projectInfo", "additionalInfo", "dependencies"];
			this.preferences.get("/sectionsOrder").then(function(sectionsOrderPrefs){
				sectionsOrder = sectionsOrderPrefs["projectView"] || sectionsOrder;
				var sectionsNames = sectionsOrderPrefs["projectViewNames"] || [];
				renderSections.apply(this, [sectionsOrder, sectionsNames]);
			}.bind(this), function(error){
				renderSections.apply(this, [sectionsOrder, {}]);
				window.console.error(error);
			}.bind(this));

		},
		displayContents: function(node, parentFolder){
			this.parentFolder = parentFolder;
			this.projectClient.readProject(parentFolder).then(function(projectData){
				this.display.bind(this)(node, projectData);
			}.bind(this));
		},
		dependenciesChanged: function(event){
			var dependenciesNode = lib.node("projectDependenciesNode");
			if(!dependenciesNode){
				return;
			}
			if(event.project.ContentLocation === this.projectData.ContentLocation){
				if(event.type==="delete"){
					if(this.projectData.Dependencies && event.oldValue){
						for(var i=0; i<this.projectData.Dependencies.length; i++){
							if(this.projectData.Dependencies[i].Location === event.oldValue.Location){
								 this.projectData.Dependencies.splice(i, 1);
							}
						}
					}
				} else if(event.type === "create"){
					if(this.projectData.Dependencies && event.newValue){
						this.projectData.Dependencies.push(event.newValue);
					}
				}
			}
			lib.empty(dependenciesNode);
			this.renderDependencies(dependenciesNode, this.dependenciesSectionName);
		},
		_renderEditableFields: function(input, property, tabIndex, urlElement /*optional*/){
			var saveInput = function(event) {
				var properties = {};
				properties[property] = event.target.value;
				this.progress.progress(this.projectClient.changeProjectProperties(this.projectData, properties), "Saving project " + this.projectData.Name).then(
					function(newProjectData){
						if(newProjectData){
							this.projectData = newProjectData;
							input.value = event.target.value;

							//behave differently for inputs associated with urls
							//hide the <input> element and show the <a> urlElement
							if(urlElement){
								lib.empty(urlElement);
								urlElement.appendChild(document.createTextNode(event.target.value) || "");
								urlElement.href = event.target.value;
								urlElement.classList.remove("discreetInputHidden"); //$NON-NLS-0$
								if(urlElement.urlSelector){
									urlElement.urlSelector.classList.remove("discreetInputHidden"); //$NON-NLS-0$
								}

								input.classList.add("discreetInputHidden"); //$NON-NLS-0$
							}
						}
					}.bind(this)
				);
			}.bind(this);

			input.value = this.projectData[property] || "";
			input.classList.add("discreetInput"); //$NON-NLS-0$

			input.onkeyup = function(event){
				if(event.keyCode === lib.KEY.ENTER){
					// Excluding <textarea> because it is a multi-line input
					// which allows the user to press Enter for a new line
					if (input.tagName.toUpperCase() !== 'TEXTAREA') {
						input.blur();
					}
				}else if(event.keyCode === lib.KEY.ESCAPE){
					input.value = this.projectData[property] || ""; //restore previous value
					input.blur();
				}
			}.bind(this);
			input.onblur = function(event){
				saveInput(event);
			};
		},
		renderProjectInfo: function(parent, sectionName){

			var title = sectionName || messages.ProjectInfo;
			var projectInfoSection = new mSection.Section(parent, {
					id: "projectInfoSection" + this.idCount, 
					headerClass: ["sectionTreeTableHeader"], 
					title: title, 
					preferenceService: this.preferences, 
					canHide: true,
					hidden: true});
			var explorerParent = document.createElement("div");
			explorerParent.id = "projectInformationNode" + this.idCount;
			var projectInfoRenderer = new ProjectInfoRenderer({
				checkbox: false,
				treeTableClass: "sectionTreeTable",
				cachePrefix: "ProjectInfoExplorer" //$NON-NLS-0$
			}, this);
			var projectInfoExplorer = new mExplorer.Explorer(this.serviceRegistry, null, projectInfoRenderer, this.commandRegistry);
			projectInfoSection.embedExplorer(projectInfoExplorer, explorerParent);
			projectInfoExplorer.createTree(explorerParent, new ProjectInfoModel(this.projectData), {noSelection: true});
			return;
		},
		renderAdditionalProjectProperties: function(parent){
			this.projectClient.getMatchingProjectHandlers(this.parentFolder).then(function(matchingProjectHandlers){
			for(var projectHandlerIndex = 0; projectHandlerIndex<matchingProjectHandlers.length; projectHandlerIndex++){
				var projectHandler = matchingProjectHandlers[projectHandlerIndex];

				if(!projectHandler || !projectHandler.getAdditionalProjectProperties){
					continue;
				}
				this.progress.progress(projectHandler.getAdditionalProjectProperties(this.parentFolder, this.projectData), "Getting additional project information").then(function(additionalProperties){
					if(!additionalProperties || !additionalProperties.length || additionalProperties.length === 0){
						return;
					}
					for(var i=0; i<additionalProperties.length; i++){
						var cat = additionalProperties[i];
						if(!cat.Name){
							continue;
						}
						var additionalInfoSection = new mSection.Section(parent, {
								id: cat.Name + "Section" + this.idCount, 
								headerClass: ["sectionTreeTableHeader"], 
								title: cat.Name, 
								preferenceService: this.preferences, 
								canHide: true,
								hidden: true});
						var explorerParent = document.createElement("div");
						explorerParent.id = cat.Name + "Table" + this.idCount;
						var additionalInfoRenderer = new AdditionalInfoRenderer({
							treeTableClass: "sectionTreeTable",
							checkbox: false
						}, this);
						var additionalInfoExplorer = new mExplorer.Explorer(this.serviceRegistry, null, additionalInfoRenderer, this.commandRegistry);
						additionalInfoSection.embedExplorer(additionalInfoExplorer, explorerParent);
						additionalInfoExplorer.createTree(explorerParent, new AdditionalInfoModel(cat),  {noSelection: true});
					}
				}.bind(this));
			}
			}.bind(this));
		},
		
		renderDependencies: function(parent, sectionName){

			if(!this.projectData.Dependencies || this.projectData.Dependencies.length===0){
				return;
			}

			this.dependenciesSectionName = sectionName || "Associated Content";

			var dependenciesSection = new mSection.Section(parent, {
					id: "projectDependenciesSection", 
					headerClass: ["sectionTreeTableHeader"], 
					title: this.dependenciesSectionName, 
					preferenceService: this.preferences, 
					canHide: true,
					hidden: true});
			var dependenciesParent = document.createElement("div");
			dependenciesParent.id = "dependenciesNode";
			var dependenciesRenderer = new DependenciesRenderer({
				checkbox: false,
				treeTableClass: "sectionTreeTable",
				commandRegistry: this.commandRegistry,
				actionScopeId:  this.dependencyActions
			}, this);
			var dependenciesExplorer = new mExplorer.Explorer(this.serviceRegistry, null, dependenciesRenderer, this.commandRegistry);
			dependenciesExplorer.actionScopeId = this.dependencyActions;
			dependenciesSection.embedExplorer(dependenciesExplorer, dependenciesParent);
			dependenciesExplorer.createTree(dependenciesParent, new DependenciesModel(this.projectData, this.projectClient),  {indent: '8px', noSelection: true});

		},
		
		destroy: function(){
			var _self = this;
			this._dependenciesEventTypes.forEach(function(eventType) {
					_self.dependenciesDisplatcher.removeEventListener(eventType, _self.dependneciesListener);
				});
		}
	};

	return {ProjectEditor: ProjectEditor};
});
