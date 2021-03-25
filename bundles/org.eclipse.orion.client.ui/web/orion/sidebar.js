/*******************************************************************************
 * @license
 * Copyright (c) 2011, 2019 IBM Corporation and others.
 * All rights reserved. This program and the accompanying materials are made 
 * available under the terms of the Eclipse Public License 2.0 
 * (http://www.eclipse.org/legal/epl-v10.html), and the Eclipse Distribution 
 * License v1.0 (http://www.eclipse.org/org/documents/edl-v10.html). 
 *
 * Contributors: IBM Corporation - initial API and implementation
 *******************************************************************************/

/*eslint-env browser, amd*/
define([
	'orion/objects', 
	'orion/commands', 
	'orion/outliner', 
	'orion/webui/littlelib',
	'orion/widgets/nav/mini-nav',
	'orion/widgets/nav/project-nav',
	'orion/globalCommands',
	'i18n!orion/edit/nls/messages',
	'orion/search/InlineSearchPane',
	'orion/keyBinding',
	'orion/problems/problemsView',
	'orion/keyBinding',
	'orion/util',
	'orion/webui/Slideout'
],	function(objects, mCommands, mOutliner, lib, MiniNavViewMode, ProjectNavViewMode, mGlobalCommands, messages, InlineSearchPane, mKeyBinding, mProblemsView, KeyBinding, util, mSlideout) {

	/**
	 * @name orion.sidebar.Sidebar
	 * @class Sidebar that appears alongside an {@link orion.editor.Editor} in the Orion IDE.
	 * @param {Object} params
	 * @param {orion.commandregistry.CommandRegistry} params.commandRegistry
	 * @param {orion.preferences.PreferencesService} params.preferences
	 * @param {edit.GeneralPreferences} params.generalPreferences
	 * @param {orion.core.ContentTypeRegistry} params.contentTypeRegistry
	 * @param {orion.fileClient.FileClient} params.fileClient
	 * @param {orion.editor.InputManager} params.editorInputManager
	 * @param {orion.outliner.OutlineService} params.outlineService
	 * @param {orion.progress.ProgressService} params.progressService
	 * @param {orion.serviceregistry.ServiceRegistry} params.serviceRegistry
	 * @param {Object} [params.sidebarNavInputManager]
	 * @param {Element|String} params.parent
	 * @param {Element|String} params.toolbar
	 * @param {Element|String} params.switcherScope
	 * @param {Element|String} params.editScope
	 */
	function Sidebar(params) {
		this.params = params;
		this.preferences = params.preferences;
		this.generalPreferences = params.generalPreferences;
		this.commandRegistry = params.commandRegistry;
		this.contentTypeRegistry = params.contentTypeRegistry;
		this.fileClient = params.fileClient;
		this.searcher = params.searcher;
		this.editorInputManager = params.editorInputManager;
		this.outlineService = params.outlineService;
		this.parentNode = lib.node(params.parent);
		this.toolbarNode = lib.node(params.toolbar);
		this.serviceRegistry = params.serviceRegistry;
		this.sidebarNavInputManager = params.sidebarNavInputManager;
		this.menuBar = params.menuBar;
		this.viewModes = {};
		this.activeViewMode = null;
		this.switcherScope = params.switcherScope;
		this.editScope = params.editScope;
		this.toolsScope = params.toolsScope;
		this.switcherNode = null;
		this.progressService = params.progressService;
	}
	objects.mixin(Sidebar.prototype, /** @lends orion.sidebar.Sidebar.prototype */ {
		create: function() {
			if (this.created) {
				return;
			}
			this.created = true;
			this._createViewModeMenu();
			this._createNavigationViewMode();
			this._createProjectViewMode();
			this._createSlideout();
			this._createOutliner();
			this._createInlineSearchPane();
			this._createProblemsPane();
			if (this.generalPreferences.enableDebugger) {
				this._createDebugPane();
			}
		},
		showToolbar: function() {
			this.toolbarNode.style.display = "block"; //$NON-NLS-0$
			this.parentNode.classList.remove("toolbarTarget-toolbarHidden"); //$NON-NLS-0$
		},
		hideToolbar: function() {
			this.toolbarNode.style.display = "none"; //$NON-NLS-0$
			this.parentNode.classList.add("toolbarTarget-toolbarHidden"); //$NON-NLS-0$
		},
		/** @private */
		viewModeMenuCallback: function() {
			var _self = this;
			var active = this.getActiveViewModeId();
			return Object.keys(this.viewModes).map(function(modeId) {
				var mode = _self.getViewMode(modeId);
				return {
					checked: modeId === active,
					name: mode.label || modeId,
					callback: _self.setViewMode.bind(_self, modeId)
				};
			});
		},
		getActiveViewModeId: function() {
			return this.activeViewModeId;
		},
		getDefaultViewModeId: function() {
			var id = util.readSetting("sidebarActiveViewModeId");
			if (id && this.getViewMode(id)) {
				return id;
			}
			return this.getNavigationViewMode().id;
		},
		/**
		 * @param {String} id
		 * @param {orion.sidebar.ViewMode} mode
		 */
		addViewMode: function(id, mode) {
			if (!id) {
				throw new Error("Invalid id: " + id); //$NON-NLS-0$
			}
			if (!mode || typeof mode !== "object") { //$NON-NLS-0$
				throw new Error("Invalid mode: "  + mode); //$NON-NLS-0$
			}
			if (!Object.prototype.hasOwnProperty.call(this.viewModes, id)) {
				this.viewModes[id] = mode;
			}
		},
		/**
		 * @param {String} id
		 */
		removeViewMode: function(id) {
			var mode = this.getViewMode(id);
			if (mode && typeof mode.destroy === "function") { //$NON-NLS-0$
				mode.destroy();
			}
			delete this.viewModes[id];
			if (this.getActiveViewModeId() === id) {
				this.activeViewModeId = null;
				util.deleteSetting("sidebarActiveViewModeId");
			}
		},
		/**
		 * @param {String} id
		 */
		getViewMode: function(id) {
			if (Object.prototype.hasOwnProperty.call(this.viewModes, id)) {
				return this.viewModes[id];
			}
			return null;
		},
		/**
		 * @param {String} id
		 */
		setViewMode: function(id) {
			var mode = this.activeViewMode;
			if (mode && typeof mode.destroy === "function") { //$NON-NLS-0$
				mode.destroy();
			}
			// clean out any toolbar contributions
			if (this.toolbarNode) {
				this.commandRegistry.destroy(this.toolbarNode);
			}
			lib.empty(this.parentNode);
			mode = this.activeViewMode = this.getViewMode(id);
			this.activeViewModeId = mode ? id : null;
			if (this.activeViewModeId) {
				util.saveSetting("sidebarActiveViewModeId", this.activeViewModeId);
			} else {
				util.deleteSetting("sidebarActiveViewModeId");
			}
			if (mode && typeof mode.create === "function") { //$NON-NLS-0$
				mode.create();
			}
		},
		renderViewModeMenu: function() {
			var switcher = this.switcherNode;
			this.commandRegistry.destroy(switcher);
			this.commandRegistry.renderCommands(switcher.id, switcher, null, this, "button"); //$NON-NLS-0$
		},
		
		getInlineSearchPane: function() {
			return this._inlineSearchPane;
		},

		getNavigationViewMode: function() {
			return this._navigationViewMode;
		},

		getProjectViewMode: function() {
			return this.projectViewMode;
		},

		getOutliner: function() {
			return this.outliner;
		},
		
		_createViewModeMenu: function() {
			this.switcherNode = lib.node(this.switcherScope);
			var changeViewModeCommand = new mCommands.Command({
				name: messages["SidePanel"],
				imageClass: "core-sprite-outline", //$NON-NLS-0$
				selectionClass: "dropdownSelection", //$NON-NLS-0$
				tooltip: messages["SidePanelTooltip"],
				id: "orion.sidebar.viewmode", //$NON-NLS-0$
				visibleWhen: function() {
					var mainSplitter = mGlobalCommands.getMainSplitter();
					if (mainSplitter) {
						return !mainSplitter.splitter.isClosed();
					}
					return true;
				},
				choiceCallback: this.viewModeMenuCallback.bind(this)
			});
			this.commandRegistry.addCommand(changeViewModeCommand);
			if (!util.isElectron) {
				this.commandRegistry.registerCommandContribution(this.switcherNode.id, "orion.sidebar.viewmode", 2, "orion.menuBarViewGroup"); //$NON-NLS-1$ //$NON-NLS-0$
			}
		},
		_createNavigationViewMode: function() {
			this._navigationViewMode = new MiniNavViewMode({
				commandRegistry: this.commandRegistry,
				contentTypeRegistry: this.contentTypeRegistry,
				preferences: this.preferences,
				fileClient: this.fileClient,
				editorInputManager: this.editorInputManager,
				parentNode: this.parentNode,
				sidebarNavInputManager: this.sidebarNavInputManager,
				serviceRegistry: this.serviceRegistry,
				toolbarNode: this.toolbarNode,
				sidebar: this,
				progressService: this.progressService
			});
		},
		_createProjectViewMode: function() {
			this.projectViewMode = new ProjectNavViewMode({
				commandRegistry: this.commandRegistry,
				contentTypeRegistry: this.contentTypeRegistry,
				preferences: this.preferences,
				fileClient: this.fileClient,
				editorInputManager: this.editorInputManager,
				parentNode: this.parentNode,
				sidebarNavInputManager: this.sidebarNavInputManager,
				serviceRegistry: this.serviceRegistry,
				toolbarNode: this.toolbarNode,
				sidebar: this,
				progressService: this.progressService
			});
		},
		_createOutliner: function() {
			// Outliner is responsible for adding its view mode(s) to this sidebar
			this.outliner = new mOutliner.Outliner(this._slideout,
			{
				toolbar: this.toolbarNode,
				serviceRegistry: this.serviceRegistry,
				contentTypeRegistry: this.contentTypeRegistry,
				preferences: this.preferences,
				outlineService: this.outlineService,
				commandService: this.commandRegistry,
				inputManager: this.editorInputManager,
				progressService: this.progressService,
				sidebar: this,
				switcherNode: this.switcherNode
			});
		},
		_createSlideout: function() {
			this._slideout = new mSlideout.Slideout(this.toolbarNode.parentNode);
			
			// add Slideout menu group to View menu
			this.commandRegistry.addCommandGroup(this.switcherNode.id, 
				"orion.slideoutMenuGroup", //$NON-NLS-0$
				3, 
				messages["Slideout"], //$NON-NLS-0$
				"orion.menuBarViewGroup", //$NON-NLS-0$
				null, 
				null, 
				null, 
				"dropdownSelection"); //$NON-NLS-0$
		},
		
		_createProblemsPane: function() {
			this._problemsPane = new mProblemsView.ProblemsView({serviceRegistry: this.serviceRegistry, 
				commandRegistry: this.commandRegistry, 
				contentTypeRegistry: this.contentTypeRegistry, 
				preferences: this.preferences,
				fileClient: this.fileClient}, this._slideout);
			var problemsInFolderCommand = new mCommands.Command({
				name: messages["showProblems"], //$NON-NLS-0$
				id: "orion.problemsInFolder", //$NON-NLS-0$
				visibleWhen: function(item) {
					if (Array.isArray(item)) {
						if(item.length === 1 && item[0].Location && item[0].Parents){
							return true;
						}
					} else if (item && item.Location && item.Parents) {
						return true;
					}
					return false;
				},
				callback: function (data) {
					this._problemsPane.show();
					var item;
					if (Array.isArray(data.items)) {
						item = data.items[0];
					} else {
						item = data.items;
					}
					var loc;
					if(item.Directory) {
						loc = item.Location;
					} else {
						loc = item.Parents[0] ? item.Parents[0].Location : item.Location;
					}
					this._problemsPane.validate(loc);
				}.bind(this)
			});
			
			this.commandRegistry.addCommand(problemsInFolderCommand);
			this.commandRegistry.registerCommandContribution(this.toolsScope, "orion.problemsInFolder", 2, "orion.menuBarToolsGroup", false, new KeyBinding.KeyBinding('p', true, false, true));  //$NON-NLS-1$ //$NON-NLS-0$
 		},
 		fillSearchPane: function(searchParams, searchResult) {
 			var mainSplitter = mGlobalCommands.getMainSplitter();
			if (mainSplitter.splitter.isClosed()) {
				mainSplitter.splitter.toggleSidePanel();
			}
			this._inlineSearchPane.setSearchText(searchParams.keyword);
			this._inlineSearchPane.setSearchScope(searchParams.resource);
			this._inlineSearchPane.setSearchOptionButtons(searchParams);
			this._inlineSearchPane.setFileNamePatterns(searchParams.fileNamePatterns);
			this._inlineSearchPane.show();
			this._inlineSearchPane.showSearchOptions();
			if(!searchResult) {
				this._inlineSearchPane.search();
			} else {
				this._inlineSearchPane.fillSearchResult(searchResult);
			}

 		},
		_createInlineSearchPane: function() {
			this._inlineSearchPane = new InlineSearchPane(this._slideout,
			{
				serviceRegistry: this.serviceRegistry,
				commandRegistry: this.commandRegistry,
				fileClient: this.fileClient,
				searcher: this.searcher,
				preferences: this.preferences,
				inputManager: this.editorInputManager
			});
			
			this._lastSearchRoot = null;
			// set the scope to the explorer's root
			this.sidebarNavInputManager.addEventListener("rootChanged", function(event){ //$NON-NLS-0$
				this._lastSearchRoot = event.root;
			}.bind(this));
			
			this.toolbarNode.parentNode.addEventListener("scroll", function(){ //$NON-NLS-0$
				if (this._inlineSearchPane.isVisible()) {
					this.toolbarNode.parentNode.scrollTop = 0;
				}
			}.bind(this));
			
			var getSearchText = function () {
				var editor = this.editorInputManager.getEditor();
				if (editor && editor.getSelectionText) {
					return editor.getSelectionText("");
				}
				return "";
			}.bind(this);
			
			var openSearchCommand = new mCommands.Command({
				name: messages["Search"], //$NON-NLS-0$
				id: "orion.openSearch", //$NON-NLS-0$
				visibleWhen: function() {
					return true;
				},
				callback: function (data) {
					if (this._inlineSearchPane.isVisible()) {
						var searchText = getSearchText();
						if(searchText) {
							this._inlineSearchPane.setSearchText(searchText);
							this._inlineSearchPane.showSearchOptions();
							this._inlineSearchPane.focusOnTextInput();
						} else {
							this._inlineSearchPane.hide();
						}
					} else {
						this._inlineSearchPane.updateSearchScopeFromSelection(data.items.length > 0 ? (typeof data.items[0] === 'string' ? this.editorInputManager.inputManager.getFileMetadata() : data.items[0])
							: data.items);
						var mainSplitter = mGlobalCommands.getMainSplitter();
						if (mainSplitter.splitter.isClosed()) {
							mainSplitter.splitter.toggleSidePanel();
						}
						this._inlineSearchPane.setSearchText(getSearchText());
						var seachScopeOption = this._inlineSearchPane.getSearchScopeOption();
						this._inlineSearchPane.updateScopeOptions(seachScopeOption);
						this._inlineSearchPane.show();
						this._inlineSearchPane.showSearchOptions();	
					}
				}.bind(this)
			});
			this.commandRegistry.addCommand(openSearchCommand);
			this.commandRegistry.registerCommandContribution(this.editScope, "orion.openSearch", 101, "orion.menuBarEditGroup/orion.findGroup", false, new mKeyBinding.KeyBinding('h', true, true)); //$NON-NLS-2$ //$NON-NLS-1$ //$NON-NLS-3$
		},

		_createDebugPane: function() {
			require(['orion/debug/debugSlideoutViewMode'], function(mDebugSlideoutViewMode) {
				this._debugPanes = new mDebugSlideoutViewMode.DebugSlideoutViewMode(this._slideout, this.serviceRegistry, this.commandRegistry, this.preferences);
				this.serviceRegistry.registerService("orion.debug.debugPanes", this._debugPanes);

				var showDebugCommand = new mCommands.Command({
					name: messages["Show Debug"],
					id: "orion.showDebug",
					visibleWhen: function() {
						return true;
					},
					callback: function(data) {
						if (this._debugPanes.isVisible()) {
							this._debugPanes.hide();
						} else {
							var mainSplitter = mGlobalCommands.getMainSplitter();
							if (mainSplitter.splitter.isClosed()) {
								mainSplitter.splitter.toggleSidePanel();
							}
							this._debugPanes.show();
						}
					}.bind(this)
				});

				this.commandRegistry.addCommand(showDebugCommand);

				this.commandRegistry.registerCommandContribution(this.switcherNode.id, "orion.showDebug", 2, "orion.menuBarViewGroup/orion.slideoutMenuGroup", false, new KeyBinding.KeyBinding('e', true, false, false));
			}.bind(this));
		}
	});

	/**
	 * @name orion.sidebar.ViewMode
	 * @class Interface for a view mode that can provide content to a {@link orion.sidebar.Sidebar}.
	 */
	/**
	 * @name orion.sidebar.ViewMode#create
	 * @function
	 */
	/**
	 * @name orion.sidebar.ViewMode#destroy
	 * @function
	 */
	/**
	 * @name orion.sidebar.ViewMode#label
	 * @type String
	 */
	return Sidebar;
});
