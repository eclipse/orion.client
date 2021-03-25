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
	'i18n!orion/edit/nls/messages',
	'orion/i18nUtil',
	'orion/objects',
	'orion/webui/littlelib',
	'orion/explorers/explorer-table',
	'orion/widgets/nav/common-nav',
	'orion/projectCommands',
	'orion/PageUtil',
	'orion/URITemplate',
	'orion/Deferred',
	'orion/bidiUtils',
	'orion/generalPreferences'
], function(messages, i18nUtil, objects, lib, mExplorer, mCommonNav, ProjectCommands,
	PageUtil, URITemplate, Deferred, bidiUtils, mGeneralPreferences) {

	var CommonNavExplorer = mCommonNav.CommonNavExplorer;
	var CommonNavRenderer = mCommonNav.CommonNavRenderer;
	var FileModel = mExplorer.FileModel;
	var uriTemplate = new URITemplate("#{,resource,params*}"); //$NON-NLS-0$

	function ProjectNavModel(serviceRegistry, root, fileClient, idPrefix, excludeFiles, excludeFolders, projectClient, fileMetadata, filteredResources) {
		this.projectClient = projectClient;
		this.project = root;
		this.fileMetadata = fileMetadata;
		this.filteredResources = filteredResources;
		FileModel.apply(this, arguments);
	}

	ProjectNavModel.prototype = Object.create(FileModel.prototype);
	objects.mixin(ProjectNavModel.prototype, /** @lends orion.sidebar.ProjectNavModel.prototype */ {
		processParent: function(item, children) {
			var res = FileModel.prototype.processParent.call(this, item, children);
			if (!item.Project) {
				item.Project = this.project;
			}
			for (var i = 0; i < children.length; i++) {
				children[i].Project = this.project;
			}
			return res;
		},
		getChildren: function(parentItem, /* function(items) */ onComplete) {
			if (parentItem.children) {
				onComplete(this.processParent(parentItem, parentItem.children));
				return;
			}
			if (parentItem.type === "Project") {
				var children = [];
				this.fileMetadata.type = "ProjectRoot"; //$NON-NLS-0$
				children.push(this.fileMetadata);
				Deferred.all((parentItem.Dependencies || []).map(function(dependency) {
					var item = {
						Dependency: dependency,
						Project: parentItem
					};
					children.push(item);
					return this.projectClient.getDependencyFileMetadata(dependency, parentItem.WorkspaceLocation).then(function(dependencyMetadata) {
						objects.mixin(item, dependencyMetadata);
					}, /* @callback */ function(error) {
						item.Directory = item.disconnected = true;
					});
				}.bind(this))).then(function() {
					this.processParent(parentItem, children);
					children.splice(children.indexOf(this.fileMetadata), 1);
					children.splice(0, 0, this.fileMetadata);
					onComplete(children);
				}.bind(this));
				return;
			}
			return FileModel.prototype.getChildren.call(this, parentItem, /* function(items) */ onComplete);
		},
		getId: function(item) {
			if (item.type === "Project") {
				item = {
					Location: item.ContentLocation
				};
			} else if (item.Dependency && item.disconnected) {
				item = item.Dependency;
			}
			return FileModel.prototype.getId.call(this, item);
		},
		hasChildren: function() {
			return true;
		}
	});

	/**
	 * @class orion.sidebar.ProjectNavExplorer
	 * @extends orion.explorers.CommonNavExplorer
	 */
	function ProjectNavExplorer(params) {
		this.projectClient = params.projectClient;
		CommonNavExplorer.apply(this, arguments);

		var _self = this;
		this.generalPreferences = new mGeneralPreferences.GeneralPreferences(this.preferences);
		this.dependenciesDisplatcher = ProjectCommands.getDependencyDispatcher();
		/**
		 * @callback
		 */
		this.dependneciesListener = function(evnt) {
			_self.changedItem.call(_self);
		};
		this._dependenciesEventTypes = ["create", "delete"];
		this._dependenciesEventTypes.forEach(function(eventType) {
			_self.dependenciesDisplatcher.addEventListener(eventType, _self.dependneciesListener);
		});
	}
	ProjectNavExplorer.prototype = Object.create(CommonNavExplorer.prototype);
	objects.mixin(ProjectNavExplorer.prototype, /** @lends orion.sidebar.ProjectNavExplorer.prototype */ {
		display: function(fileMetadata, redisplay) {
			if (!fileMetadata) {
				return new Deferred().reject();
			}

			return this.projectClient.getProject(fileMetadata).then(function(project) {
				fileMetadata = project;
				this.fileMetadata = fileMetadata;

				var parentProject;
				if (fileMetadata && fileMetadata.Parents && fileMetadata.Parents.length === 0) {
					parentProject = fileMetadata;
				} else if (fileMetadata && fileMetadata.Parents) {
					parentProject = fileMetadata.Parents[fileMetadata.Parents.length - 1];
				}

				if (!redisplay && parentProject && parentProject.Location === this.projectLocation) {
					return;
				}
				return this.projectClient.readProject(fileMetadata, this.workspaceMetadata).then(function(projectData) {
					this.projectLocation = parentProject ? parentProject.Location : null;
					projectData.type = "Project"; //$NON-NLS-0$
					projectData.Directory = true;
					projectData.fileMetadata = fileMetadata;
					return CommonNavExplorer.prototype.display.call(this, projectData, redisplay).then(function() {
						return this.expandItem(fileMetadata);
					}.bind(this));
				}.bind(this));
			}.bind(this));
		},
		/**
		 * @callback
		 */
		loadResourceList: function(path, force, postLoad) {
			if (path && typeof path === "object") {
				path = path.ChildrenLocation || path.ContentLocation;
			}
			if (this.treeRoot && path === this.treeRoot.ContentLocation) {
				this.display(this.fileMetadata, true);
			} else {
				this.scopeUp();
			}
		},
		createModel: function() {
			return new ProjectNavModel(this.registry, this.treeRoot, this.fileClient, this.parentId, this.excludeFiles, this.excludeFolders, this.projectClient, this.fileMetadata, this.filteredResources);
		},
		reroot: function(item) {
			var defer = new Deferred();
			this.projectClient.getProject(item).then(function(project) {
				this.display(project);
				defer.resolve(item);
			}.bind(this), function() {
				this.scopeUp(item.Location);
				defer.reject();
			}.bind(this));
			return defer;
		},
		registerCommands: function() {
			return CommonNavExplorer.prototype.registerCommands.call(this).then(function() {
				var commandRegistry = this.commandRegistry;
				var fileActionsScope = this.fileActionsScope;
				commandRegistry.registerCommandContribution("dependencyCommands", "orion.project.dependency.connect", 1); //$NON-NLS-1$ //$NON-NLS-0$
				commandRegistry.registerCommandContribution("dependencyCommands", "orion.project.dependency.disconnect", 2); //$NON-NLS-1$ //$NON-NLS-0$
				commandRegistry.registerCommandContribution(fileActionsScope, "orion.project.create.readme", 5, "orion.menuBarFileGroup/orion.newContentGroup"); //$NON-NLS-1$ //$NON-NLS-0$

				var position = 0;
				commandRegistry.addCommandGroup(fileActionsScope, "orion.newDependency", 6, messages["Dependency"], "orion.menuBarFileGroup/orion.newContentGroup"); //$NON-NLS-2$ //$NON-NLS-1$ //$NON-NLS-0$
				ProjectCommands.getAddDependencyCommands(commandRegistry).forEach(function(command) {
					commandRegistry.registerCommandContribution(fileActionsScope, command.id, position++, "orion.menuBarFileGroup/orion.newContentGroup/orion.newDependency"); //$NON-NLS-0$
				});
			}.bind(this));
		},
		scopeDown: false,
		scopeUp: function() {
			var input = PageUtil.matchResourceParameters();
			var resource = input.resource;
			delete input.navigate;
			delete input.resource;
			window.location.href = uriTemplate.expand({
				resource: resource,
				params: input
			});
			this.sidebar.setViewMode("nav"); //$NON-NLS-0$
		},
		getTreeRoot: function() {
			return this.fileMetadata;
		},
		changedItem: function(item, forceExpand) {
			if (!item || !this.model) {
				this.fileMetadata.children = null;
				return this.display(this.fileMetadata, true);
			}
			if (item.Projects) {
				return new Deferred().resolve();
			}
			return CommonNavExplorer.prototype.changedItem.call(this, item, forceExpand);
		},
		destroy: function() {
			var _self = this;
			this._dependenciesEventTypes.forEach(function(eventType) {
				_self.dependenciesDisplatcher.removeEventListener(eventType, _self.dependneciesListener);
			});
			if (_self.launchConfigurationListener) {
				this._launchConfigurationEventTypes.forEach(function(eventType) {
					_self.launchConfigurationDispatcher.removeEventListener(eventType, _self.launchConfigurationListener);
				});
			}
			CommonNavExplorer.prototype.destroy.call(this);
		}
	});

	function ProjectNavRenderer() {
		CommonNavRenderer.apply(this, arguments);
	}
	ProjectNavRenderer.prototype = Object.create(CommonNavRenderer.prototype);
	objects.mixin(ProjectNavRenderer.prototype, {
		getCellElement: function(col_no, item, tableRow) {
			var col = CommonNavRenderer.prototype.getCellElement.call(this, col_no, item, tableRow);
			if ((item.Dependency || item.type === "ProjectRoot") && col_no === 0) {
				col.className = item.type === "ProjectRoot" ? "projectNavColumn projectPrimaryNavColumn" : "projectNavColumn"; //$NON-NLS-2$ //$NON-NLS-1$ //$NON-NLS-0$
				var span = lib.$(".mainNavColumn", col); //$NON-NLS-0$
				span.classList.add("projectInformationNode"); //$NON-NLS-0$
				var nameText = item.Dependency ? item.Dependency.Name : (item.Project ? item.Project.Name : item.Name);
				if (bidiUtils.isBidiEnabled()) {
					nameText = bidiUtils.enforceTextDirWithUcc(nameText);
				}
				var itemNode = lib.$("a", col); //$NON-NLS-0$
				if (item.disconnected) {
					nameText = i18nUtil.formatMessage(messages.Disconnected, nameText);
					itemNode.removeAttribute("href"); //$NON-NLS-0$
				}
				lib.empty(itemNode);
				itemNode.appendChild(document.createTextNode(nameText));

				if (item.Dependency) {
					var actions = document.createElement("span");
					actions.className = "mainNavColumn"; //$NON-NLS-0$
					actions.style.cssFloat = "right"; //$NON-NLS-0$
					this.explorer.commandRegistry.renderCommands("dependencyCommands", actions, item, this, "tool"); //$NON-NLS-1$ //$NON-NLS-0$
					col.appendChild(actions);
				}
				return col;
			}
			return col;
		}
	});

	/**
	 * @name orion.sidebar.ProjectNavViewMode
	 * @class
	 */
	function ProjectNavViewMode(params) {
		this.preferences = params.preferences;
		this.commandRegistry = params.commandRegistry;
		this.contentTypeRegistry = params.contentTypeRegistry;
		this.fileClient = params.fileClient;
		this.editorInputManager = params.editorInputManager;
		this.parentNode = params.parentNode;
		this.sidebarNavInputManager = params.sidebarNavInputManager;
		this.toolbarNode = params.toolbarNode;
		this.serviceRegistry = params.serviceRegistry;
		this.projectClient = this.serviceRegistry.getService("orion.project.client"); //$NON-NLS-0$
		this.sidebar = params.sidebar;
		this.progressService = params.progressService;
		this.explorer = null;
		var sidebar = this.sidebar;

		this.editorInputManager.addEventListener("InputChanged", function(evnt) {
			this.showViewMode(evnt.metadata && !evnt.metadata.Projects);
			if (!sidebar.getActiveViewModeId()) {
				sidebar.setViewMode(sidebar.getDefaultViewModeId());
			}
		}.bind(this));
	}
	objects.mixin(ProjectNavViewMode.prototype, {
		label: messages["Project"],
		id: "projectNav", //$NON-NLS-0$
		create: function() {
			new mGeneralPreferences.GeneralPreferences(this.preferences).getPrefs().then(function(prefs) {
				var res = Object.create(null);
				if(typeof prefs.filteredResources === 'string') {
					prefs.filteredResources.split(',').forEach(function(item) {
						res[item.trim()] = true;
					});
				}
				this.explorer = new ProjectNavExplorer({
					name: messages["ProjectNavigator"],
					preferences: this.preferences,
					commandRegistry: this.commandRegistry,
					fileClient: this.fileClient,
					editorInputManager: this.editorInputManager,
					sidebar: this.sidebar,
					sidebarNavInputManager: this.sidebarNavInputManager,
					parentId: this.parentNode.id,
					projectClient: this.projectClient,
					rendererFactory: function(explorer) {
						return new ProjectNavRenderer({
							checkbox: false,
							treeTableClass: "miniNavTreeTable", //$NON-NLS-0$
							cachePrefix: "ProjectNav" //$NON-NLS-0$
						}, explorer, this.commandRegistry, this.contentTypeRegistry);
					}.bind(this),
					serviceRegistry: this.serviceRegistry,
					toolbarNode: this.toolbarNode,
					progressService: this.progressService,
					filteredResources: res
				});
				this.explorer.workspaceMetadata = this.workspaceMetadata;
				this.explorer.display(this.editorInputManager.getFileMetadata());
				this.toolbarNode.parentNode.classList.add("projectNavSidebarWrapper"); //$NON-NLS-0$
			}.bind(this));
		},
		destroy: function() {
			if (this.explorer) {
				this.explorer.destroy();
			}
			this.explorer = null;
			this.toolbarNode.parentNode.classList.remove("projectNavSidebarWrapper"); //$NON-NLS-0$
		},
		showViewMode: function(show) {
			var sidebar = this.sidebar;
			var showing = Boolean(sidebar.getViewMode(this.id));
			if (showing === show) {
				return;
			}
			if (show) {
				sidebar.addViewMode(this.id, this);
				sidebar.renderViewModeMenu();
			} else {
				sidebar.removeViewMode(this.id);
				sidebar.renderViewModeMenu();
			}
		}
	});

	return ProjectNavViewMode;
});
