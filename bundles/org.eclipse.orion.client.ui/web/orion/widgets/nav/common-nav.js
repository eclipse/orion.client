/*******************************************************************************
 * @license
 * Copyright (c) 2013, 2019 IBM Corporation and others.
 * All rights reserved. This program and the accompanying materials are made
 * available under the terms of the Eclipse Public License 2.0
 * (http://www.eclipse.org/legal/epl-v10.html), and the Eclipse Distribution
 * License v1.0 (http://www.eclipse.org/org/documents/edl-v10.html).
 *
 * Contributors: IBM Corporation - initial API and implementation
 ******************************************************************************/
/*global URL*/
/*eslint-env browser, amd*/
define([
	'i18n!orion/edit/nls/messages',
	'orion/objects',
	'orion/Deferred',
	'orion/webui/littlelib',
	'orion/explorers/explorer-table',
	'orion/explorers/navigatorRenderer',
	'orion/keyBinding',
	'orion/fileCommands',
	'orion/projectCommands',
	'orion/extensionCommands',
	'orion/globalCommands',
	'orion/selection',
	'orion/URITemplate',
	'orion/PageUtil',
	'orion/webui/contextmenu',
	'orion/generalPreferences',
	'orion/metrics',
	'orion/util'
], function(
	messages, objects, Deferred, lib, mExplorer, mNavigatorRenderer, mKeyBinding,
	FileCommands, ProjectCommands, ExtensionCommands, mGlobalCommands, Selection, URITemplate, PageUtil, mContextMenu, mGeneralPreferences, mMetrics, util
) {
	var _DEBUG = false;
	var FileExplorer = mExplorer.FileExplorer;
	var KeyBinding = mKeyBinding.KeyBinding;
	var NavigatorRenderer = mNavigatorRenderer.NavigatorRenderer;

	var uriTemplate = new URITemplate("#{,resource,params*}"); //$NON-NLS-0$

	/**
	 * @class orion.sidebar.CommonNavExplorer
	 * @extends orion.explorers.FileExplorer
	 */
	function CommonNavExplorer(params) {
		params.setFocus = false; // do not steal focus on load
		params.cachePrefix = null; // do not persist table state
		params.modelEventDispatcher = FileCommands.getModelEventDispatcher();
		params.dragAndDrop = FileCommands.uploadFile;
		FileExplorer.apply(this, arguments);
		this.preferences = params.preferences;
		this.generalPreferences = new mGeneralPreferences.GeneralPreferences(this.preferences);
		this.commandRegistry = params.commandRegistry;
		this.serviceRegistry = params.serviceRegistry;
		this.editorInputManager = params.editorInputManager;
		this.progressService = params.progressService;
		this.sidebar = params.sidebar;
		var sidebarNavInputManager = this.sidebarNavInputManager = params.sidebarNavInputManager;
		this.toolbarNode = params.toolbarNode;

		this.fileActionsScope = "menuBarActions"; //$NON-NLS-0$
		this.editActionsScope = "menuBarActions"; //$NON-NLS-0$
		this.viewActionsScope = "menuBarActions"; //$NON-NLS-0$
		this.toolsActionsScope = "menuBarActions"; //$NON-NLS-0$
		this.additionalActionsScope = "extraActions"; //$NON-NLS-0$

		this._parentNode = lib.node(this.parentId);
		this._sidebarContextMenuNode = document.createElement("ul");
		this._sidebarContextMenuNode.className = "dropdownMenu"; //$NON-NLS-0$
		lib.setSafeAttribute(this._sidebarContextMenuNode, "role", "menu");
		this._sidebarContextMenuNode.id = this.parentId + "ContextMenu"; //$NON-NLS-0$

		this._parentNode.parentNode.insertBefore(this._sidebarContextMenuNode, this._parentNode);
		this.isDesktopSelectionMode().then(function (desktopMode) {
			if(desktopMode){
				this._parentNode.parentNode.classList.add("desktopmode");
			}
		}.bind(this));

		this.contextMenuActionsScope = this._sidebarContextMenuNode.id + "commonNavContextMenu"; //$NON-NLS-0$

		this.treeRoot = {}; // Needed by FileExplorer.prototype.loadResourceList
		var _self = this;
		this.editorInputListener = function(evnt) {
			_self.reveal(evnt.metadata).then(function() {
				mMetrics.logPageLoadTiming("complete", window.location.pathname); //$NON-NLS-0$
			});
		};
		this.editorInputManager.addEventListener("InputChanged", this.editorInputListener);
		if (sidebarNavInputManager) {
			sidebarNavInputManager.reveal = function(metadata) {
				_self.reveal(metadata);
			};

			// Broadcast changes of our explorer root to the sidebarNavInputManager
			this.addEventListener("rootChanged", function(evnt) {
				sidebarNavInputManager.dispatchEvent(evnt);
			});
			this.addEventListener("fileDoubleClicked", function(evnt) {
				sidebarNavInputManager.dispatchEvent(evnt);
			});
		}
		this.selection = new Selection.Selection(this.registry, "commonNavFileSelection"); //$NON-NLS-0$
		this._selectionListener = function(evnt) {
			_self.updateCommands(evnt.selections);
			if (sidebarNavInputManager) {
				_self.sidebarNavInputManager.dispatchEvent(evnt);
			}
		};
		this.selection.addEventListener("selectionChanged", this._selectionListener);
		mGlobalCommands.getMainSplitter().splitter.addEventListener("toggle", this._splitterToggleListener = /* @callback */ function(e) {
			this.updateCommands();
		}.bind(this));
		this.commandsRegistered = this.registerCommands();

		this._createContextMenu();
	}
	CommonNavExplorer.prototype = Object.create(FileExplorer.prototype);
	objects.mixin(CommonNavExplorer.prototype, /** @lends orion.sidebar.CommonNavExplorer.prototype */ {
		isDesktopSelectionMode: function() {
			return this.generalPreferences.getPrefs().then(function(genealPrefs) {
				return util.isElectron ? true : genealPrefs.desktopSelectionPolicy;
			});
		},
		isEditorTabsEnabled: function() {
			return this.generalPreferences.getPrefs().then(function(genealPrefs) {
				return util.isElectron ? true : genealPrefs.enableEditorTabs;
			});
		},
		onModelCreate: function(evt) {
			return FileExplorer.prototype.onModelCreate.call(this, evt).then(function() {
				if (evt && evt.select) {
					this.sidebarNavInputManager.dispatchEvent(evt);
				}
			}.bind(this));
		},
		createActionSections: function() {
			var _self = this;
			// Create some elements that we can hang actions on. Ideally we'd have just 1, but the
			// CommandRegistry seems to require dropdowns to have their own element.
			[].forEach(function(id) {
				if (!_self[id]) {
					var elem = document.createElement("ul");
					elem.id = id;
					elem.classList.add("commandList"); //$NON-NLS-0$
					elem.classList.add("layoutLeft"); //$NON-NLS-0$
					elem.classList.add("pageActions"); //$NON-NLS-0$
					_self.toolbarNode.appendChild(elem);
					_self[id] = elem;
				}
			});
		},

		destroy: function() {
			var _self = this;
			FileExplorer.prototype.destroy.call(this);
			[].forEach(function(id) {
				delete _self[id];
			});
			this.editorInputManager.removeEventListener("InputChanged", this.editorInputListener);
			this.selection.removeEventListener("selectionChanged", this._selectionListener);
			var mainSplitter = mGlobalCommands.getMainSplitter();
			if (mainSplitter) {
				mainSplitter.splitter.removeEventListener("toggle", this._splitterToggleListener);
			}
			if (this._contextMenu) {
				this._contextMenu.destroy();
				this._contextMenu = null;
			}
			if (this._sidebarContextMenuNode) {
				this._parentNode.parentNode.removeChild(this._sidebarContextMenuNode);
				this._sidebarContextMenuNode = null;
			}
		},
		display: function(root, force) {
			return this.loadRoot(root, force).then(function() {
				this.updateCommands();
				return this.reveal(this.editorInputManager.getFileMetadata()).then(function() {
					mMetrics.logPageLoadTiming("complete", window.location.pathname); //$NON-NLS-0$
				});
			}.bind(this));
		},
		/**
		 * Loads the given children location as the root.
		 * @param {String|Object} childrentLocation The childrenLocation or an object with a ChildrenLocation field.
		 * @returns {orion.Promise}
		 */
		loadRoot: function(childrenLocation, force) {
			return this.commandsRegistered.then(function() {
				if (childrenLocation && typeof childrenLocation === "object") {
					return this.load(childrenLocation);
				}
				return this.loadResourceList(childrenLocation, force);
			}.bind(this));
		},
		scope: function(childrenLocation) {
			childrenLocation = (childrenLocation && childrenLocation.ChildrenLocation) || childrenLocation || "";
			var params = PageUtil.matchResourceParameters();
			var resource = params.resource;
			delete params.resource;
			if (childrenLocation) {
				if (params.navigate === childrenLocation) {
					return;
				}
				params.navigate = childrenLocation;
			} else {
				delete params.navigate;
			}
			window.location.href = uriTemplate.expand({
				resource: resource,
				params: params
			});
		},
		scopeUp: function() {
			var prnt = this.treeRoot.Parents && this.treeRoot.Parents[0];
			Deferred.when(prnt && prnt.ChildrenLocation || this.fileClient.getWorkspace(this.treeRoot.Location)).then(function(navigate) {
				this.scope(navigate);
			}.bind(this));
		},
		scopeDown: function(item) {
			this.scope(item.ChildrenLocation);
		},
		isCommandsVisible: function() {
			var mainSplitter = mGlobalCommands.getMainSplitter();
			if (mainSplitter) {
				return !mainSplitter.splitter.isClosed();
			}
			return !this.destroyed;
		},
		// Returns a deferred that completes once file command extensions have been processed
		registerCommands: function() {
			var commandRegistry = this.commandRegistry;
			var fileActionsScope = this.fileActionsScope;
			var editActionsScope = this.editActionsScope;
			var viewActionsScope = this.viewActionsScope;
			var contextMenuActionsScope = this.contextMenuActionsScope;

			var renameBinding = new KeyBinding(113); // F2
			var delBinding = new KeyBinding(46); // Delete
			var cutBinding = new KeyBinding('x', true); /* Ctrl+X */ //$NON-NLS-0$
			var copySelections = new KeyBinding('c', true); /* Ctrl+C */ //$NON-NLS-0$
			var pasteSelections = new KeyBinding('v', true); /* Ctrl+V */ //$NON-NLS-0$
			var upFolder = new KeyBinding(38, false, false, true); /* Alt+UpArrow */
			var downFolder = new KeyBinding(40, false, false, true); /* Alt+DownArrow */
			downFolder.domScope = upFolder.domScope = pasteSelections.domScope = copySelections.domScope = cutBinding.domScope = delBinding.domScope = typeof this.parentId === "string" ? this.parentId : this.parentId.id;
			downFolder.scopeName = upFolder.scopeName = pasteSelections.scopeName = copySelections.scopeName = cutBinding.scopeName = delBinding.scopeName = messages.Navigator;

			// New actions
			commandRegistry.registerCommandContribution(fileActionsScope, "eclipse.newFile", 1, "orion.menuBarFileGroup/orion.newContentGroup/orion.new.default"); //$NON-NLS-1$ //$NON-NLS-0$
			commandRegistry.registerCommandContribution(fileActionsScope, "eclipse.newFolder", 2, "orion.menuBarFileGroup/orion.newContentGroup/orion.new.default", false, null /*, new mCommandRegistry.URLBinding("newFolder", "name")*/ ); //$NON-NLS-2$ //$NON-NLS-1$ //$NON-NLS-0$
			commandRegistry.registerCommandContribution(fileActionsScope, "orion.new.project", 3, "orion.menuBarFileGroup/orion.newContentGroup/orion.new.default"); //$NON-NLS-2$ //$NON-NLS-1$ //$NON-NLS-0$

			if (!util.isElectron) {
				// Import actions
				commandRegistry.registerCommandContribution(fileActionsScope, "orion.import", 1, "orion.menuBarFileGroup/orion.importGroup"); //$NON-NLS-1$ //$NON-NLS-0$
				commandRegistry.registerCommandContribution(fileActionsScope, "orion.importZipURL", 2, "orion.menuBarFileGroup/orion.importGroup"); //$NON-NLS-1$ //$NON-NLS-0$

				// Export actions
				commandRegistry.registerCommandContribution(fileActionsScope, "eclipse.downloadSingleFile", 1, "orion.menuBarFileGroup/orion.exportGroup"); //$NON-NLS-1$ //$NON-NLS-0$
				commandRegistry.registerCommandContribution(fileActionsScope, "eclipse.downloadFile", 2, "orion.menuBarFileGroup/orion.exportGroup"); //$NON-NLS-1$ //$NON-NLS-0$
			}

			// Edit actions
			commandRegistry.registerCommandContribution(editActionsScope, "eclipse.cut", 1, "orion.menuBarEditGroup/orion.clipboardGroup", false, cutBinding); //$NON-NLS-1$ //$NON-NLS-0$
			commandRegistry.registerCommandContribution(editActionsScope, "eclipse.copySelections", 2, "orion.menuBarEditGroup/orion.clipboardGroup", false, copySelections); //$NON-NLS-1$ //$NON-NLS-0$
			commandRegistry.registerCommandContribution(editActionsScope, "eclipse.pasteSelections", 3, "orion.menuBarEditGroup/orion.clipboardGroup", false, pasteSelections); //$NON-NLS-1$ //$NON-NLS-0$
			commandRegistry.registerCommandContribution(editActionsScope, "eclipse.deleteFile", 4, "orion.menuBarEditGroup/orion.clipboardGroup", false, delBinding); //$NON-NLS-1$ //$NON-NLS-0$
			commandRegistry.registerCommandContribution(editActionsScope, "eclipse.compareWith", 5, "orion.menuBarEditGroup/orion.compareGroup"); //$NON-NLS-1$ //$NON-NLS-0$
			commandRegistry.registerCommandContribution(editActionsScope, "eclipse.compareWithEachOther", 6, "orion.menuBarEditGroup/orion.compareGroup"); //$NON-NLS-1$ //$NON-NLS-0$

			commandRegistry.registerCommandContribution(editActionsScope, "eclipse.renameResource", 1, "orion.menuBarEditGroup/orion.edit.formatGroup", false, renameBinding); //$NON-NLS-1$ //$NON-NLS-0$
			// View actions
			if (!util.isElectron) {
				commandRegistry.registerCommandContribution(viewActionsScope, "eclipse.downFolder", 1, "orion.menuBarViewGroup", false, downFolder); //$NON-NLS-1$ //$NON-NLS-0$
				commandRegistry.registerCommandContribution(viewActionsScope, "eclipse.upFolder", 0, "orion.menuBarViewGroup", false, upFolder); //$NON-NLS-1$ //$NON-NLS-0$
			}

			commandRegistry.addCommandGroup(viewActionsScope, "eclipse.openWith", 1000, messages["OpenWith"], "orion.menuBarViewGroup", null, null, null, "dropdownSelection"); //$NON-NLS-2$ //$NON-NLS-1$ //$NON-NLS-0$
			commandRegistry.addCommandGroup(viewActionsScope, "eclipse.fileCommandExtensions", 1000, messages["OpenRelated"], "orion.menuBarViewGroup"); //$NON-NLS-1$ //$NON-NLS-0$

			// Context Menu
			commandRegistry.addCommandGroup(contextMenuActionsScope, "orion.commonNavContextMenuGroup", 100, null, null, null, null, null, "dropdownSelection"); //$NON-NLS-1$ //$NON-NLS-0$

			// Context Menu new artifact actions
			commandRegistry.addCommandGroup(contextMenuActionsScope, "orion.New", 0, messages["New"], "orion.commonNavContextMenuGroup/orion.newGroup", null, null, null, "dropdownSelection"); //$NON-NLS-2$ //$NON-NLS-1$ //$NON-NLS-0$
			commandRegistry.registerCommandContribution(contextMenuActionsScope, "eclipse.newFile", 1, "orion.commonNavContextMenuGroup/orion.newGroup/orion.New"); //$NON-NLS-1$ //$NON-NLS-0$
			commandRegistry.registerCommandContribution(contextMenuActionsScope, "eclipse.newFolder", 2, "orion.commonNavContextMenuGroup/orion.newGroup/orion.New", false, null /*, new mCommandRegistry.URLBinding("newFolder", "name")*/ ); //$NON-NLS-2$ //$NON-NLS-1$ //$NON-NLS-0$
			commandRegistry.registerCommandContribution(contextMenuActionsScope, "orion.new.project", 3, "orion.commonNavContextMenuGroup/orion.newGroup/orion.New"); //$NON-NLS-2$ //$NON-NLS-1$ //$NON-NLS-0$

			// Context Menu edit group actions
			commandRegistry.registerCommandContribution(contextMenuActionsScope, "eclipse.cut", 1, "orion.commonNavContextMenuGroup/orion.editGroup", false); //$NON-NLS-1$ //$NON-NLS-0$
			commandRegistry.registerCommandContribution(contextMenuActionsScope, "eclipse.copySelections", 2, "orion.commonNavContextMenuGroup/orion.editGroup", false); //$NON-NLS-1$ //$NON-NLS-0$
			commandRegistry.registerCommandContribution(contextMenuActionsScope, "eclipse.pasteSelections", 3, "orion.commonNavContextMenuGroup/orion.editGroup", false); //$NON-NLS-1$ //$NON-NLS-0$
			commandRegistry.registerCommandContribution(contextMenuActionsScope, "eclipse.deleteFile", 4, "orion.commonNavContextMenuGroup/orion.editGroup", false); //$NON-NLS-1$ //$NON-NLS-0$
			commandRegistry.registerCommandContribution(contextMenuActionsScope, "eclipse.renameResource", 5, "orion.commonNavContextMenuGroup/orion.editGroup", false); //$NON-NLS-1$ //$NON-NLS-0$
			commandRegistry.registerCommandContribution(contextMenuActionsScope, "eclipse.file.refresh", 6, "orion.commonNavContextMenuGroup/orion.editGroup", false); //$NON-NLS-1$ //$NON-NLS-0$

			// Context Menu related actions
			commandRegistry.addCommandGroup(contextMenuActionsScope, "orion.OpenWith", 1001, messages["OpenWith"], "orion.commonNavContextMenuGroup/orion.relatedActions", null, null, null, "dropdownSelection"); //$NON-NLS-2$ //$NON-NLS-1$ //$NON-NLS-0$
			commandRegistry.addCommandGroup(contextMenuActionsScope, "orion.Extensions", 1002, messages["OpenRelated"], "orion.commonNavContextMenuGroup/orion.relatedActions", null, null, null, "dropdownSelection"); //$NON-NLS-2$ //$NON-NLS-1$ //$NON-NLS-0$
			commandRegistry.registerCommandContribution(contextMenuActionsScope, "eclipse.compareWith", 6, "orion.commonNavContextMenuGroup/orion.relatedActions"); //$NON-NLS-1$ //$NON-NLS-0$
			commandRegistry.registerCommandContribution(contextMenuActionsScope, "eclipse.compareWithEachOther", 7, "orion.commonNavContextMenuGroup/orion.relatedActions"); //$NON-NLS-1$ //$NON-NLS-0$

			if (!util.isElectron) {
				// Context Menu import/export actions
				commandRegistry.addCommandGroup(contextMenuActionsScope, "orion.ImportGroup", 1003, messages["Import"], "orion.commonNavContextMenuGroup/orion.ImportExport", null, null, null, "dropdownSelection"); //$NON-NLS-2$ //$NON-NLS-1$ //$NON-NLS-0$
				commandRegistry.addCommandGroup(contextMenuActionsScope, "orion.ExportGroup", 1004, messages["Export"], "orion.commonNavContextMenuGroup/orion.ImportExport", null, null, null, "dropdownSelection"); //$NON-NLS-2$ //$NON-NLS-1$ //$NON-NLS-0$
				commandRegistry.registerCommandContribution(contextMenuActionsScope, "orion.import", 1, "orion.commonNavContextMenuGroup/orion.ImportExport/orion.ImportGroup"); //$NON-NLS-1$ //$NON-NLS-0$
				commandRegistry.registerCommandContribution(contextMenuActionsScope, "orion.importZipURL", 2, "orion.commonNavContextMenuGroup/orion.ImportExport/orion.ImportGroup"); //$NON-NLS-1$ //$NON-NLS-0$
				commandRegistry.registerCommandContribution(contextMenuActionsScope, "eclipse.downloadSingleFile", 1, "orion.commonNavContextMenuGroup/orion.ImportExport/orion.ExportGroup"); //$NON-NLS-1$ //$NON-NLS-0$
				commandRegistry.registerCommandContribution(contextMenuActionsScope, "eclipse.downloadFile", 2, "orion.commonNavContextMenuGroup/orion.ImportExport/orion.ExportGroup"); //$NON-NLS-1$ //$NON-NLS-0$
			}

			// Context Menu search action
			commandRegistry.registerCommandContribution(contextMenuActionsScope, "orion.openSearch", 1, "orion.commonNavContextMenuGroup"); //$NON-NLS-0$
			commandRegistry.registerCommandContribution(contextMenuActionsScope, "orion.problemsInFolder", 2, "orion.commonNavContextMenuGroup"); //$NON-NLS-0$


			// Retrieve and register extension commands
			ExtensionCommands.getOpenWithCommands(commandRegistry).forEach(function(command) {
				commandRegistry.registerCommandContribution(viewActionsScope, command.id, 1, "orion.menuBarViewGroup/eclipse.openWith"); //$NON-NLS-0$
				commandRegistry.registerCommandContribution(contextMenuActionsScope, command.id, 1, "orion.commonNavContextMenuGroup/orion.relatedActions/orion.OpenWith"); //$NON-NLS-0$
			});

			//TODO getFileCommands should return commands
			ExtensionCommands.getFileCommandIds().forEach(function(commandId) {
				commandRegistry.registerCommandContribution(viewActionsScope, commandId, 1, "orion.menuBarViewGroup/eclipse.fileCommandExtensions"); //$NON-NLS-0$
				commandRegistry.registerCommandContribution(contextMenuActionsScope, commandId, 1, "orion.commonNavContextMenuGroup/orion.relatedActions/orion.Extensions"); //$NON-NLS-0$
			});

			return Deferred.all([
				// Retrieve and register project commands
				this.preferences.get("/common-nav").then(function(prefs) { //$NON-NLS-0$
					var show = prefs["showNewProjectCommands"];
					if (show === undefined || show) {
						commandRegistry.addCommandGroup(fileActionsScope, "orion.projectsNewGroup", 100, messages["Project"], "orion.menuBarFileGroup/orion.newContentGroup"); //$NON-NLS-1$ //$NON-NLS-0$
						commandRegistry.addCommandGroup(contextMenuActionsScope, "orion.projectsNewGroup", 100, messages["Project"], "orion.commonNavContextMenuGroup/orion.newGroup/orion.New"); //$NON-NLS-1$ //$NON-NLS-0$
						var position = 0;
						ProjectCommands.getCreateProjectCommands(commandRegistry).forEach(function(command) {
							if (!util.isElectron) {
								commandRegistry.registerCommandContribution(fileActionsScope, command.id, position, "orion.menuBarFileGroup/orion.newContentGroup/orion.projectsNewGroup"); //$NON-NLS-0$
								commandRegistry.registerCommandContribution(contextMenuActionsScope, command.id, position, "orion.commonNavContextMenuGroup/orion.newGroup/orion.New/orion.projectsNewGroup"); //$NON-NLS-0$
							}
							position++;
						});
					}
				}),
				//Collaboration Mode
				this.preferences.get("/plugins").then(function(plugins) {
					if (plugins["collab/plugins/collabPlugin.html"]) {
						commandRegistry.registerCommandContribution(contextMenuActionsScope, "orion.collab.shareProject", 1);
						commandRegistry.registerCommandContribution(contextMenuActionsScope, "orion.collab.unshareProject", 1);
					}
				})
			]);
		},
		/**
		 * @callback
		 */
		updateCommands: function(selections) {
			var visible = this.isCommandsVisible();
			this.createActionSections();
			var commandRegistry = this.commandRegistry;
			var menuBar = this.sidebar.menuBar;
			menuBar.setActiveExplorer(this);
			menuBar.updateCommands();
			commandRegistry.registerSelectionService(this.contextMenuActionsScope, visible ? this.selection : null);
			if (this._sidebarContextMenuNode) {
				this._populateContextMenu(this._sidebarContextMenuNode);
			}
		},

		getEditActionsScope: function() {
			return this.editActionsScope;
		},

		getTreeRoot: function() {
			return this.treeRoot;
		},

		_populateContextMenu: function(contextMenuNode) {
			var selectionService = this.selection;
			var selections = selectionService.getSelections();
			var items = null;

			this.commandRegistry.destroy(contextMenuNode); // remove previous content

			if (!selections || (Array.isArray(selections) && !selections.length)) {
				//no selections, use this.treeRoot to determine commands
				items = this.getTreeRoot();
			}
			this.commandRegistry.renderCommands(this.contextMenuActionsScope, contextMenuNode, items, this, "menu"); //$NON-NLS-0$
		},

		refreshSelection: function() {
			//Do nothing
		},

		_createContextMenu: function() {
			//function called when the context menu is triggered to set the nav selection properly
			var contextMenuTriggered = function(eventWrapper) {
				var navHandler = this.getNavHandler();
				var navDict = this.getNavDict();
				var evnt = eventWrapper.event;
				var item = null;

				if (evnt.target) {
					var node = evnt.target;
					while (this._parentNode.contains(node)) {
						if ("TR" === node.nodeName) { //TODO this is brittle, see if a better way exists
							var rowId = node.id;
							item = navDict.getValue(rowId);
							break;
						}
						node = node.parentNode;
					}

					if (item && !navHandler.isDisabled(item.rowDomNode)) {
						// only modify the selection if the item that the context menu
						// was triggered on isn't already part of the selection
						var existingSels = navHandler.getSelection();
						if (-1 === existingSels.indexOf(item.model)) {
							navHandler.cursorOn(item.model, true, false, true);
							navHandler.setSelection(item.model, false, true);
						}
					} else {
						// context menu was triggered on sidebar itself,
						// clear previous selections
						var triggerX = evnt.offsetX === undefined ? evnt.layerX : evnt.offsetX;
						if (triggerX > 0) { // X coordinate should be greater than 0 if mouse right button was used
							this.selection.setSelections(null);
							navHandler.refreshSelection(true, true);
						}
					}
					mMetrics.logEvent("contextMenu", "opened", "navigator"); //$NON-NLS-1$ //$NON-NLS-2$ //$NON-NLS-3$
				}
			}.bind(this);

			var contextMenu = new mContextMenu.ContextMenu({
				dropdown: this._sidebarContextMenuNode,
				triggerNode: this._parentNode
			});

			contextMenu.addEventListener("triggered", contextMenuTriggered);

			this._contextMenu = contextMenu;
		}
	});

	function CommonNavRenderer() {
		NavigatorRenderer.apply(this, arguments);
	}
	CommonNavRenderer.prototype = Object.create(NavigatorRenderer.prototype);
	objects.mixin(CommonNavRenderer.prototype, {
		showFolderLinks: true,
		oneColumn: true,
		_preventLinkBehavior: function(linkNode) {
			linkNode.addEventListener("click", function(evt) {
				this.explorer.isDesktopSelectionMode().then(function(desktopMode) {
					if(desktopMode){
 						evt.preventDefault();
 					}
				});
			}.bind(this));
			linkNode.addEventListener("dblclick", function(evt) {
				this.explorer.isDesktopSelectionMode().then(function(desktopMode) {
					if(desktopMode){
						evt.preventDefault();
					}else{
						this.explorer.handleLinkDoubleClick(linkNode, evt);
					}
				});
			}.bind(this));
		},
		createFolderNode: function(folder) {
			var folderNode = NavigatorRenderer.prototype.createFolderNode.call(this, folder);
			if (this.showFolderLinks && folderNode.tagName === "A") {
				folderNode.href = uriTemplate.expand({
					resource: folder.Location
				});
				folderNode.classList.add("commonNavFolder"); //$NON-NLS-0$
			} else {
				folderNode.classList.add("nav_fakelink"); //$NON-NLS-0$
			}
			this._preventLinkBehavior(folderNode);
			return folderNode;
		},
		/**
		 * @callback
		 */
		updateFileNode: function(file, fileNode, isImage) {
			this._preventLinkBehavior(fileNode);
		},
		/**
		 * Overrides NavigatorRenderer.prototype.rowCallback
		 * @param {Element} rowElement
		 */
		rowCallback: function(rowElement, model) {
			NavigatorRenderer.prototype.rowCallback.call(this, rowElement, model);

			// Search for the model in the Cut buffer and disable it if it is found
			var cutBuffer = FileCommands.getCutBuffer();
			if (cutBuffer) {
				var matchFound = cutBuffer.some(function(cutModel) {
					return FileCommands.isEqualToOrChildOf(model, cutModel);
				});

				if (matchFound) {
					var navHandler = this.explorer.getNavHandler();
					navHandler.disableItem(model);
				}
			}
		},
		emptyCallback: function() {}
	});

	return {
		CommonNavExplorer: CommonNavExplorer,
		CommonNavRenderer: CommonNavRenderer
	};
});
