/*******************************************************************************
 * @license
 * Copyright (c) 2010, 2019 IBM Corporation and others.
 * All rights reserved. This program and the accompanying materials are made
 * available under the terms of the Eclipse Public License 2.0
 * (http://www.eclipse.org/legal/epl-v10.html), and the Eclipse Distribution
 * License v1.0 (http://www.eclipse.org/org/documents/edl-v10.html).
 *
 * Contributors:
 *     IBM Corporation - initial API and implementation
 *     Casey Flynn - Google Inc.
 *******************************************************************************/
/*eslint-env browser, amd*/

define([
	'i18n!orion/edit/nls/messages',
	'orion/sidebar',
	'orion/inputManager',
	'orion/commands',
	'orion/globalCommands',
	'orion/editor/textModelFactory',
	'orion/editor/undoStack',
	'orion/folderView',
	'orion/editorView',
	'orion/editorPluginView',
	'orion/markdownView',
	'orion/markdownEditor',
	'orion/commandRegistry',
	'orion/contentTypes',
	'orion/fileClient',
	'orion/fileCommands',
	'orion/editorCommands',
	'orion/selection',
	'orion/status',
	'orion/progress',
	'orion/operationsClient',
	'orion/git/gitClient',
	'orion/ssh/sshTools', 
	'orion/outliner',
	'orion/dialogs',
	'orion/extensionCommands',
	'orion/projectCommands',
	'orion/searchClient',
	'orion/EventTarget',
	'orion/URITemplate',
	'orion/i18nUtil',
	'orion/PageUtil',
	'orion/util',
	'orion/objects',
	'orion/webui/littlelib',
	'orion/Deferred',
	'orion/projectClient',
	'orion/webui/splitter',
	'orion/webui/tooltip',
	'orion/webui/contextmenu',
	'orion/webui/menubar',
	'orion/bidiUtils',
	'orion/customGlobalCommands',
	'orion/generalPreferences',
	'orion/breadcrumbs',
	'orion/keyBinding',
	'orion/urlModifier',
	'orion/debug/breakpoint',
	'orion/editor/annotations',
	'orion/debug/debugService'
], function(
	messages, Sidebar, mInputManager, mCommands, mGlobalCommands,
	mTextModelFactory, mUndoStack,
	mFolderView, mEditorView, mPluginEditorView , mMarkdownView, mMarkdownEditor,
	mCommandRegistry, mContentTypes, mFileClient, mFileCommands, mEditorCommands, mSelection, mStatus, mProgress, mOperationsClient, mGitClient, mSshTools, mOutliner, mDialogs, mExtensionCommands, ProjectCommands, mSearchClient,
	EventTarget, URITemplate, i18nUtil, PageUtil, util, objects, lib, Deferred, mProjectClient, mSplitter, mTooltip, mContextMenu, mMenuBar, bidiUtils, mCustomGlobalCommands, mGeneralPrefs, mBreadcrumbs, mKeyBinding, urlModifier,
	mBreakpoint, mAnnotations, mDebugService
) {

var exports = {};

// Dynamically loaded
var mNativeDeployService = null;
var debugMessages = null;
var DebugFileImpl = null;

var AT = mAnnotations.AnnotationType;

var enableSplitEditor = true;

var MODE_SINGLE = 0;
var MODE_VERTICAL = 1;
var MODE_HORIZONTAL = 2;
var MODE_PIP = 3;

var uriTemplate = new URITemplate("#{,resource,params*}"); //$NON-NLS-0$

function MenuBar(options) {
	this.parentNode = options.parentNode;
	this.commandRegistry = options.commandRegistry;
	this.serviceRegistry = options.serviceRegistry;
	this.generalPreferences = options.generalPreferences;
	this.fileClient = options.fileClient;
	this.editorCommands = options.editorCommands;
	this.parentNode = options.parentNode;
	this.menuBarActionScope = "menuBarActions";
	this.toolsActionsScope = "menuBarActions"; //$NON-NLS-0$
	this.additionalActionsScope = "extraActions"; //$NON-NLS-0$
	this.createActionSections();
	
	this.runBarNode = lib.$(".runBar", this.parentNode); //$NON-NLS-0$
}
MenuBar.prototype = {};
objects.mixin(MenuBar.prototype, {
	createActionSections: function() {
		var _self = this;
		[this.additionalActionsScope].reverse().forEach(function(id) {
			if (!_self[id]) {
				var elem = document.createElement("ul"); //$NON-NLS-0$
				elem.id = id;
				elem.classList.add("commandList"); //$NON-NLS-0$
				elem.classList.add("layoutLeft"); //$NON-NLS-0$
				elem.classList.add("pageActions"); //$NON-NLS-0$
				if (id === _self.additionalActionsScope) {
					elem.classList.add("extraActions"); //$NON-NLS-0$
				}
				_self.parentNode.insertBefore(elem, _self.parentNode.firstChild);
				_self[id] = elem;
			}
		});

		// Create the main menu bar
		var editMenuBar = document.createElement("ul"); //$NON-NLS-0$
		var menuBarScope = editMenuBar.id = this.menuBarActionScope;
		lib.setSafeAttribute(editMenuBar, "role", "menubar");
		editMenuBar.style.outline = "none";
		var menuBar = new mMenuBar.MenuBar({
			dropdown: editMenuBar,
		});
		
		
		editMenuBar.classList.add("layoutLeft"); //$NON-NLS-0$
		editMenuBar.classList.add("commandList"); //$NON-NLS-0$
		editMenuBar.classList.add("pageActions"); //$NON-NLS-0$
		_self.parentNode.insertBefore(editMenuBar, _self.parentNode.firstChild);

		var commandRegistry = this.commandRegistry;
		var toolsActionsScope = this.toolsActionsScope;
		
		commandRegistry.addCommandGroup(menuBarScope, "orion.menuBarFileGroup", 1, messages["File"], null, messages["noActions"], null, null, "dropdownSelection"); //$NON-NLS-3$ //$NON-NLS-2$ //$NON-NLS-1$ //$NON-NLS-0$
		commandRegistry.addCommandGroup(menuBarScope, "orion.menuBarEditGroup", 2, messages["Edit"], null, messages["noActions"], null, null, "dropdownSelection"); //$NON-NLS-3$ //$NON-NLS-2$ //$NON-NLS-1$ //$NON-NLS-0$
		commandRegistry.addCommandGroup(menuBarScope, "orion.menuBarViewGroup", 3, messages["View"], null, messages["noActions"], null, null, "dropdownSelection"); //$NON-NLS-1$ //$NON-NLS-2$
		commandRegistry.addCommandGroup(menuBarScope, "orion.menuBarToolsGroup", 4, messages["Tools"], null, null, null, null, "dropdownSelection"); //$NON-NLS-1$ //$NON-NLS-2$
		
		commandRegistry.addCommandGroup(menuBarScope, "orion.newContentGroup", 0, messages["New"], "orion.menuBarFileGroup", null, null, null, "dropdownSelection"); //$NON-NLS-3$ //$NON-NLS-2$ //$NON-NLS-1$ //$NON-NLS-0$
		commandRegistry.addCommandGroup(menuBarScope, "orion.importGroup", 100, messages["Import"], "orion.menuBarFileGroup", null, null, null, "dropdownSelection"); //$NON-NLS-3$ //$NON-NLS-2$ //$NON-NLS-1$ //$NON-NLS-0$
		commandRegistry.addCommandGroup(menuBarScope, "orion.exportGroup", 1001, messages["Export"], "orion.menuBarFileGroup", null, null, null, "dropdownSelection"); //$NON-NLS-3$ //$NON-NLS-2$ //$NON-NLS-1$ //$NON-NLS-0$
	},
	createCommands: function() {
		var serviceRegistry = this.serviceRegistry;
		var commandRegistry = this.commandRegistry;
		var fileClient = this.fileClient;
		var editorCommands = this.editorCommands;
		var generalPreferences = this.generalPreferences;
		return editorCommands.createCommands().then(function() {
			editorCommands.registerCommands();
			editorCommands.registerContextMenuCommands();
			return mFileCommands.createFileCommands(serviceRegistry, commandRegistry, fileClient, generalPreferences).then(function() {
				return mExtensionCommands.createFileCommands(serviceRegistry, null, "all", true, commandRegistry).then(function() { //$NON-NLS-0$
					var projectClient = serviceRegistry.getService("orion.project.client"); //$NON-NLS-0$
					return projectClient.getProjectHandlerTypes().then(function(dependencyTypes){
						return projectClient.getProjectDeployTypes().then(function(deployTypes){
							return ProjectCommands.createProjectCommands(serviceRegistry, commandRegistry, fileClient, projectClient, dependencyTypes, deployTypes);
						}, function(){
							return ProjectCommands.createProjectCommands(serviceRegistry, commandRegistry, fileClient, projectClient, dependencyTypes);
						});
					});
				});
			});
		});
	},
	setActiveExplorer: function(explorer) {
		this.explorer = explorer;
	},
	setActiveEditorViewer: function(editorViewer) {
		this.editorViewer = editorViewer;
	},
	updateCommands: function() {
		var explorer = this.explorer;
		var visible, selection, treeRoot, metadata;
		if (explorer) {
			visible = explorer.isCommandsVisible();
			selection = explorer.selection;
			treeRoot = explorer.getTreeRoot();
		}
		var editorViewer = this.editorViewer;
		if (editorViewer) {
			metadata = editorViewer.inputManager.getFileMetadata();
			this.editorCommands.updateCommands(editorViewer.getCurrentEditorView());
		}
		var commandRegistry = this.commandRegistry, serviceRegistry = this.serviceRegistry;
		commandRegistry.registerSelectionService(this.menuBarActionScope, visible ? selection : null);
		mFileCommands.setExplorer(explorer);
		ProjectCommands.setExplorer(explorer);
		mFileCommands.updateNavTools(serviceRegistry, commandRegistry, explorer, null, [this.menuBarActionScope], treeRoot, true);
		commandRegistry.destroy(this.additionalActionsScope);
		commandRegistry.renderCommands(this.additionalActionsScope, this.additionalActionsScope, treeRoot, explorer, "button"); //$NON-NLS-0$
	}
});

function TextModelPool(options) {
	this.serviceRegistry = options.serviceRegistry;
	this.all = [];
	this.contextID = 0;
}
TextModelPool.prototype = {};
objects.mixin(TextModelPool.prototype, {
	create: function(serviceID) {
		var model = new mTextModelFactory.TextModelFactory().createTextModel({serviceRegistry: this.serviceRegistry});
		var undoStack = new mUndoStack.UndoStack(model, 500);
		serviceID += this.contextID++;
		var contextImpl = {};
		[
			"getText", //$NON-NLS-0$
			"setText" //$NON-NLS-0$
		].forEach(function(method) {
			contextImpl[method] = model[method].bind(model);
		});
		this.serviceRegistry.registerService(serviceID, contextImpl, null);
		var result = {
			model: model,
			undoStack: undoStack,
			serviceID: serviceID,
			registeredViewers: {}
		};
		this.all.push(result);
		return result;
	},
	search: function(resource) {
		for (var i = 0; i<this.all.length; i++) {
			var p = this.all[i];
			if (p.metadata && p.metadata.Location === resource) {
				return p;
			}
		}
		return null;
	},
	registerViewer: function(pool, viewerId) {
		if (!pool.registeredViewers.hasOwnProperty(viewerId)) {
			pool.registeredViewers[viewerId] = true;
		}
	},
	release: function(resource, viewerId) {
		for (var i = 0; i<this.all.length; i++) {
			var p = this.all[i];
			if (p.metadata && p.metadata.Location === resource) {
				if (p.registeredViewers.hasOwnProperty(viewerId)) {
					delete p.registeredViewers[viewerId];
				}
				if (Object.keys(p.registeredViewers).length === 0) {
					p.model.destroy();
					p.undoStack.destroy();
					this.all.splice(i, 1);
				}
			}
		}
	}
});

function TabWidget(options) {
	EventTarget.attach(this);
	objects.mixin(this, options);
	this.selectedFile = null;
	this.tabWidgetContextItemindex = 1;
	this.commandRegistry = options.commandRegistry;
	
	this.fileList = [];
	this.editorTabs = {};
	this.breadcrumbUniquifier = "_editor_" + this.id;
	var generalPrefs = this.generalPreferences || {};
	this.enableEditorTabs = util.isElectron ? true : generalPrefs.hasOwnProperty("enableEditorTabs") ? generalPrefs.enableEditorTabs : false;
	this.maximumEditorTabs = generalPrefs.hasOwnProperty("maximumEditorTabs") ? generalPrefs.maximumEditorTabs : 0;
	this.beingDragged = null;
	
	if (!this.enableEditorTabs) {
		this.maximumEditorTabs = 1;
	}

	// Used to hide horizontal scroll bar.
	var editorTabScrollHider = document.createElement("div");
	editorTabScrollHider.className = "editorTabContainerOuter";
	lib.setSafeAttribute(editorTabScrollHider, "role", "tablist");
	this.parent.appendChild(editorTabScrollHider);
	
	var editorTabContainer = this.editorTabContainer = document.createElement("div");
	editorTabContainer.className = "editorTabContainer";
	editorTabContainer.id = "editorTabContainer" + this.id;
	editorTabScrollHider.appendChild(editorTabContainer);

	editorTabContainer.addEventListener("dragenter", this.dragenterListener_.bind(this));

	var tabWidgetDropdownNode = this.tabWidgetDropdownNode = document.createElement("div");
	tabWidgetDropdownNode.id = "tabWidgetDropdownNode" + this.id;
	tabWidgetDropdownNode.className = "editorViewerTabDropdown";
	tabWidgetDropdownNode.style.display = "none";
	lib.setSafeAttribute(tabWidgetDropdownNode, "aria-haspopup", "true");

	this.parent.appendChild(tabWidgetDropdownNode);

	if (this.enableEditorTabs) {
		this.createDropdown_();
	}
	
	this.restoreTabsFromStorage(); // have to be after createDropdown_ call.
}

var LABEL_ID = 1;
TabWidget.prototype = {};
objects.mixin(TabWidget.prototype, {
	createDropdown_ : function() {
		var fileList = this.fileList;
		var that = this;
		this.widgetClick = function cb() {
			that.setWindowLocation(this.href);
		};

		var tabCommand = new mCommands.Command({
			selectionClass: "dropdownSelection",
			name: util.isMac ? messages["AllTabsDropDownMac"] : messages["AllTabsDropDown"],
			imageClass: "core-sprite-list",
			id: "orion.edit.selectEditor",
			visableWhen: function() {
				return true;
			},
			choiceCallback: function() {
				return fileList;
			}
		});
		this.commandRegistry.addCommand(tabCommand);
		this.commandRegistry.registerCommandContribution(this.tabWidgetDropdownNode.id, "orion.edit.selectEditor", 0);
		this.commandRegistry.renderCommands(this.tabWidgetDropdownNode.id, this.tabWidgetDropdownNode.id, this, this, "button");
		this.registerAdditionalCommands();
	},
	getMetadataByLocation_: function(location) {
		var metadata = null
		for (var i = this.fileList.length; i--;) {
			if (this.fileList[i].metadata.Location === location) {
				metadata = this.fileList[i].metadata;
				break;
			}
		}
		return metadata;
	},
	closeTab: function(metadata, isDirty) {
		if (!this.editorTabs.hasOwnProperty(metadata.Location)) {
			return;
		}
		var editorTab = this.editorTabs[metadata.Location];
		var editorTabNode = editorTab.editorTabNode;
		var href = editorTab.href;

		var tabClose = function() {
			this.removeTab(metadata);
			var evt = {
				type: "TabClosed",
				resource: metadata.Location
			};
			this.dispatchEvent(evt);
		}.bind(this);

		if (isDirty) {
			if (this.selectedFile.href !== href) {
				this.setWindowLocation(href);
			}
		}

		var closingEvent = {
			type: "TabClosing",
			isDirty: isDirty,
			editorTab: editorTabNode,
			callback: tabClose
		};
		this.dispatchEvent(closingEvent);
	},
	setWindowLocation: function(href) {
		window.location = urlModifier(href);
	},
	dragenterListener_: function(e) {
		e.preventDefault();
		var target = e.target;
		var draggedNode = this.beingDragged ? this.beingDragged.node : null;
		var insertBeforeNode = target.nextSibling;

		// Drag event from outside of this widget to the tab container.
		if (target.classList.contains("editorTabContainer") && draggedNode === null) {
			target = target.lastChild;
			insertBeforeNode = null;
		}
		var targetContainer = target.parentNode;
		if (target.classList.contains("editorTab")) {
			// Support for dragging between editors.
			if (!target.parentNode.contains(draggedNode)) {
				var evt = {type: "EditorTabTransfer", target: target, raisingId: this.id};
				this.dispatchEvent(evt);

				// Not a tab being dragged. Do nothing.
				if (!evt.beingDragged) {
					return;
				}

				var newTab = this.addTab(evt.beingDragged.metadata, evt.beingDragged.href);
				evt.beingDragged.parent.removeTab(evt.beingDragged.metadata);

				// add the hidden property to the newly created node.
				draggedNode = newTab.editorTabNode;
				draggedNode.classList.add('hideOnDrag');

				targetContainer = draggedNode.parentNode;

				// Update the being dragged in this class.
				this.beingDragged = {node: draggedNode, metadata: evt.beingDragged.metadata, href: evt.beingDragged.href, parent: this};

				// cleanup method after drag and drop.
				var afterDragActions =  {
					dragCleanup: function() {
						draggedNode.classList.remove('hideOnDrag');
						this.activateEditorViewer();
						draggedNode.click();
						this.beingDragged = null;
					}.bind(this)
				};

				this.afterDragActions = afterDragActions;
				evt.beingDragged.parent.afterDragActions = afterDragActions;

				// Clear the dragged object from the other tabWidget
				evt.beingDragged.parent.beingDragged = null;

				// If this is the only tab, do not remove it, and do not hide it.
				if (this.fileList.length > 1) {
					draggedNode.parentNode.removeChild(draggedNode);
				} else {
					draggedNode.classList.remove('hideOnDrag');
				}
			} else {
				if (target.nextSibling === draggedNode) {
					insertBeforeNode = target;
				}
				target.parentNode.removeChild(draggedNode);
			}

			if (insertBeforeNode) {
				targetContainer.insertBefore(draggedNode, insertBeforeNode);
			} else {
				targetContainer.appendChild(draggedNode);
			}
		}
	},
	setTabStorage: function() {
		var mappedFiles = this.fileList.map(function(f) {
			if (!f.metadata.Directory) {
				var parents = f.metadata.Parents.map(function(each){
					return {
						Name: each.Name,
						Location: each.Location,
						ChildrenLocation: each.ChildrenLocation,
						WorkspaceLocation: each.WorkspaceLocation
					};
				});
				return {metadata: {Location: f.metadata.Location, Name: f.metadata.Name, WorkspaceLocation: f.metadata.WorkspaceLocation, Directory: f.metadata.Directory, Parents: parents}, href: f.href, isTransient: f.isTransient};
			}
		});
		sessionStorage["editorTabs_" + this.id] = JSON.stringify(mappedFiles);
	},
	restoreTabsFromStorage: function() {
		if (sessionStorage.hasOwnProperty("editorTabs_" + this.id)) {
			try {
				var cachedTabs = JSON.parse(sessionStorage["editorTabs_" + this.id]);
				cachedTabs.reverse().forEach(function(cachedTab) {
					if (cachedTab) {
						this.addTab(cachedTab.metadata, cachedTab.href, true, cachedTab.isTransient);
					}
				}.bind(this));
			} catch (e) {
				delete sessionStorage["editorTabs_" + this.id];
			}
		}
	},
	registerAdditionalCommands: function() {
		var showTabDropdown = new mCommands.Command({
			name: messages["showTabDropdown"],
			id: "orion.edit.showTabDropdown",
			visibleWhen: function() {
				return true;
			},
			callback: function() {
				this.tabWidgetDropdownNode.firstChild.click();
			}.bind(this)
		});
		this.commandRegistry.addCommand(showTabDropdown);

		this.commandRegistry.registerCommandContribution(this.editorTabContainer.id , "orion.edit.showTabDropdown", 0, null, true, new mKeyBinding.KeyBinding('e', true, true), null, this);

		this.commandRegistry.renderCommands(this.editorTabContainer.id, this.editorTabContainer.id, this, this, "button");
	},
	createTab_ : function(metadata, href) {
		var that = this;
		var editorTab = document.createElement("div");
		editorTab.className = "editorTab";
		// NOTE: Setting role=presentation to this div otherwise VoiceOver reads "tab 1 of 1" for all tabs
		lib.setSafeAttribute(editorTab, "role", "presentation");
		lib.setSafeAttribute(editorTab, "draggable", true);
		if (!this.enableEditorTabs) {
			editorTab.classList.add("editorTabsDisabled");
		}
		this.editorTabContainer.appendChild(editorTab);
		
		var labelID = "editorTabLabel_" + LABEL_ID++;
		var panelIP = "editorViewerContent_Panel" + this.id;
		var editorTabContent = document.createElement("div");
		lib.setSafeAttribute(editorTabContent, "aria-labelledby", labelID);
		editorTabContent.tabIndex = 0;
		editorTabContent.className = "editorTabContent";
		lib.setSafeAttribute(editorTabContent, "role", "tab");
		lib.setSafeAttribute(editorTabContent, "aria-controls", panelIP);
		editorTab.appendChild(editorTabContent);

		var editorTabContentFocus = document.createElement("div");
		editorTabContentFocus.tabIndex = -1;
		editorTabContentFocus.className = "editorTabContentFocus";
		editorTabContent.appendChild(editorTabContentFocus);

		var dirtyIndicator = document.createElement("span");
		dirtyIndicator.classList.add("editorViewerHeaderDirtyIndicator");
		dirtyIndicator.textContent = "*";
		dirtyIndicator.style.display = "none";
		editorTabContentFocus.appendChild(dirtyIndicator);
		editorTabContentFocus.addEventListener("click", function(evt) {
			if (editorTabContentFocus !== document.activeElement) return;
			var panel = document.querySelector("#" + panelIP);
			if (!panel) return;
			var tabbable = lib.firstTabbable(panel);
			if (tabbable) {
				tabbable.focus();
			}
		});
		
		var curFileNode = document.createElement("span");
		curFileNode.id = labelID;
		curFileNode.className = "editorViewerHeaderTitle";
		editorTabContentFocus.appendChild(curFileNode);
		var curFileNodeName = metadata.Name || "";
		if (bidiUtils.isBidiEnabled()) {
			curFileNodeName = bidiUtils.enforceTextDirWithUcc(curFileNodeName);
		}
		curFileNode.textContent = curFileNodeName;

		var closeButton = document.createElement("div");
		lib.setSafeAttribute(closeButton, "role", "button");
		lib.setSafeAttribute(closeButton, "aria-label", messages["closeSelf"]);
		closeButton.tabIndex = 0;
		closeButton.className = "editorTabCloseButton core-sprite-close imageSprite ";
		// Unicode multiplication sign
		closeButton.metadata = metadata;
		closeButton.addEventListener("click", function(e) {
			e.stopPropagation();
			var isDirty = dirtyIndicator.style.display !== "none";
			that.closeTab(this.metadata, isDirty);
		});
		closeButton.addEventListener("keydown", function(e) {
			if (e.keyCode === lib.KEY.ENTER || e.keyCode === lib.KEY.SPACE) {
				e.stopPropagation();
				var isDirty = dirtyIndicator.style.display !== "none";
				that.closeTab(this.metadata, isDirty);
			}
		});
		editorTabContentFocus.appendChild(closeButton);
		editorTab.metadata = metadata;
		editorTab.href = href;
		
		var fileNodeTooltip = editorTabContent.tooltip = new mTooltip.Tooltip({
			node: curFileNode,
			position: ["below", "above", "right", "left"]
		});
	
		// Create breadcrumb for tooltip.
		var localBreadcrumbNode = document.createElement("div");
		var tipContainer = fileNodeTooltip.contentContainer();
		tipContainer.appendChild(localBreadcrumbNode);
		
		var makeHref = function(segment, folderLocation, folder) {
			var resource = folder ? folder.Location : folderLocation;
			segment.href = uriTemplate.expand({resource: resource});
			if (folder) {
				if (metadata && metadata.Location === folder.Location) {
					segment.addEventListener("click", function() { //$NON-NLS-0$
						if (this.sidebarNavInputManager){
							this.sidebarNavInputManager.reveal(folder);
						}
					}.bind(this));
				}
			}
		}.bind(this);
		
		var breadcrumbOptions = {
			container: localBreadcrumbNode,
			resource: metadata,
			workspaceRootSegmentName: this.fileClient.fileServiceName(metadata.Location),
			workspaceRootURL: metadata.WorkspaceLocation || this.fileClient.fileServiceRootURL(metadata.Location),
			makeFinalHref: true,
			makeHref: makeHref,
			// This id should be unique regardless of editor views open.
			id: "breadcrumb" + metadata.Location + this.breadcrumbUniquifier
		};
		
		var breadcrumb = new mBreadcrumbs.BreadCrumbs(breadcrumbOptions);
		
		var editorTabClickHandler = function(evt){
			if (evt.type === "click") {
				that.setWindowLocation(this.href);
			} else if (evt.type === "dblclick") {
				that.transientToPermanent(this.href);
			}
		};
		editorTab.addEventListener("click", editorTabClickHandler);
		editorTab.addEventListener("dblclick", editorTabClickHandler);
		editorTab.addEventListener("keydown", function(e) {
			if (e.keyCode === lib.KEY.ENTER || e.keyCode === lib.KEY.SPACE) {
				e.stopPropagation();
				that.setWindowLocation(this.href);
			}
		});

		editorTab.addEventListener("mouseup", function(e) {
			var button = e.which;
			if (button === 2) {
				e.preventDefault();
				var isDirty = dirtyIndicator.style.display !== "none";
				that.closeTab(this.metadata, isDirty);
			}
		});

		editorTab.addEventListener("dragstart", function(e) {
			if (that.fileList.length === 1) {
				e.preventDefault();
				return false;
			}
			that.beingDragged = {node: e.target, metadata: this.metadata, href: this.href, parent: that};
			setTimeout(function() {
				tipContainer.parentNode.classList.add('hideOnDrag');
				e.target.classList.add('hideOnDrag');
			});
		});
		
		editorTab.addEventListener("dragend", function(e) {
			if (that.afterDragActions) {
				setTimeout(function() {
					that.afterDragActions.dragCleanup();
					that.afterDragActions = null;
				}.bind(that));
			}
			that.beingDragged = null;
			tipContainer.parentNode.classList.remove('hideOnDrag');
			e.target.classList.remove('hideOnDrag');
		});
		return {
			editorTabNode: editorTab,
			dirtyIndicatorNode: dirtyIndicator,
			fileNameNode: curFileNode,
			breadcrumb: breadcrumb,
			closeButtonNode: closeButton,
			fileNodeToolTip: fileNodeTooltip,
			href: href,
			tabWidgetContextItemindex: 1
		};
	},
	getDraggedNode: function() {
		return this.beingDragged;
	},
	transientToPermanent: function(href){
		var hrefHash = href && decodeURIComponent(href.split("#")[1]);
		if(this.transientTab && hrefHash && hrefHash.indexOf(this.transientTab.location) === 0){
			this.fileList.some(function(file) {
				if (hrefHash.indexOf(file.metadata.Location) === 0) {
					file.isTransient = false;
					return true;
				}
			});
			this.transientTab && this.transientTab.editorTabNode.classList.remove("transient");
			this.transientTab = null;
		}
	},
	createNewBreadCrumb: function(tab, metadata){
		var localBreadcrumbNode = document.createElement("div");
		var tipContainer = tab.fileNodeToolTip.contentContainer();
		tipContainer.appendChild(localBreadcrumbNode);
		var makeHref = function(segment, folderLocation, folder) {
			var resource = folder ? folder.Location : this.fileClient.fileServiceRootURL(folderLocation);
			segment.href = uriTemplate.expand({resource: resource});
			if (folder) {
				if (metadata && metadata.Location === folder.Location) {
					segment.addEventListener("click", function() { //$NON-NLS-0$
						if (this.sidebarNavInputManager){
							this.sidebarNavInputManager.reveal(folder);
						}
					}.bind(this));
				}
			}
		}.bind(this);
		
		var breadcrumbOptions = {
			container: localBreadcrumbNode,
			resource: metadata,
			workspaceRootSegmentName: this.fileClient.fileServiceName(metadata.Location),
			workspaceRootURL: this.fileClient.fileServiceRootURL(metadata.Location),
			makeFinalHref: true,
			makeHref: makeHref,
			// This id should be unique regardless of editor views open.
			id: "breadcrumb" + metadata.Location + this.breadcrumbUniquifier
		};
		
		tab.breadcrumb = new mBreadcrumbs.BreadCrumbs(breadcrumbOptions);
	},
	addTab: function(metadata, href, isRestoreTabsFromStorage, isTransientFromStorage) {
		var fileList = this.fileList;
		var fileToAdd = null;
		var curEditorTabNode = null;
		var editorTab;
		var lastCloseButton = this.getCurrentEditorCloseButtonNode();
		
		// Remove checkmark next to selected file, remove selected tab style.
		if (this.selectedFile) {
			this.selectedFile.checked = false;
			curEditorTabNode = this.getCurrentEditorTabNode();
			curEditorTabNode.classList.remove("focusedEditorTab");
			lib.setSafeAttribute(curEditorTabNode.firstChild, "aria-selected", "false");
		}
		// If the editor tab exists, reuse it.
		if (this.editorTabs.hasOwnProperty(metadata.Location)) {
			// Remove the item from the file list if it is present.
			for (var i = this.fileList.length; i--;) {
				if (this.fileList[i].metadata.Location === metadata.Location) {
					fileToAdd = this.fileList.splice(i, 1)[0];
					fileToAdd.checked = true;
					editorTab = this.editorTabs[metadata.Location];
					break;
				}
			}
			// Add the file to our dropdown menu
			this.fileList.unshift(fileToAdd);
		} else if (!isRestoreTabsFromStorage && this.transientTab){
			this.transientTab.fileNameNode.textContent = metadata.Name;
			fileToAdd = {
				callback: this.widgetClick,
				checked:true,
				href: href,
				metadata: metadata,
				name: metadata.Name,
				isTransient: true
			};
			for (var i = 0; i < this.fileList.length; i++) {
				if (this.fileList[i].isTransient) {
					this.fileList.splice(i, 1)
					this.fileList.unshift(fileToAdd);
					var transientTab = this.editorTabs[this.transientTab.location];
					delete this.editorTabs[this.transientTab.location];
					transientTab.editorTabNode.metadata = metadata;
					transientTab.editorTabNode.href = href;
					transientTab.closeButtonNode.metadata = metadata;
					transientTab.location = metadata.Location
					transientTab.href = href;
					transientTab.breadcrumb.destroy();
					this.createNewBreadCrumb(transientTab, metadata);
					// Remove old breadcrum and add new, change the propertis of this editorTabs object, so that callbacks use new value.
					editorTab  = this.editorTabs[metadata.Location] = transientTab;
					break;
				}
			}
		} else {
			// Store file information
			var isTransient = true;
			if(isRestoreTabsFromStorage){
				isTransient = isTransientFromStorage;
			}else if(this.potentialTransientHref && new URL(this.potentialTransientHref).hash === new URL(href).hash){
				isTransient = false;
			}
			fileToAdd = {
				callback: this.widgetClick,
				checked:true,
				href: href,
				metadata: metadata,
				name: metadata.Name,
				isTransient: isTransient
			};
			// Create and store a new editorTab
			editorTab = this.editorTabs[metadata.Location] = this.createTab_(metadata, href);
			if(this.enableEditorTabs && isTransient){
				editorTab.editorTabNode.classList.add("transient");
				this.transientTab = editorTab;
				this.transientTab.location = metadata.Location;
			}
			// Add the file to our dropdown menu
			this.fileList.unshift(fileToAdd);
		}
		if(this.potentialTransientHref){
			// In the case doubleclick event reveived before the transient tab is created, 
			this.transientToPermanent(this.potentialTransientHref);
			this.potentialTransientHref = null;
		}

		// Style the editor tab
		editorTab.editorTabNode.classList.add("focusedEditorTab");
		lib.setSafeAttribute(editorTab.editorTabNode.firstChild, "aria-selected", "true");
		// Update the selected file
		this.selectedFile = this.fileList[0];
		// Enforce maximum editor tabs
		if (this.maximumEditorTabs > 0 && fileList.length > this.maximumEditorTabs) {
			var resourceClosing = fileList[fileList.length-1].metadata;
			this.removeTab(resourceClosing);
			this.dispatchEvent({type: "TabClosed", resource: resourceClosing.Location});
		}
		
		// Ensure it is visible
		this.scrollToTab(editorTab.editorTabNode);
		
		// If we have more than one open file, display the dropdown and close button on tabs
		if (this.fileList.length > 1) {
			lastCloseButton.style.display = "block";
			this.tabWidgetDropdownNode.style.display = "block";
		} else {
			editorTab.closeButtonNode.style.display = "none";
		}
		this.setTabStorage();
		return editorTab;
	},
	removeTab: function(metadata) {
		// Currently there is no support for an editor to be opened that does not have
		// an associated file.
		if (this.fileList.length === 1) {
			return;
		}

		var lastHref = this.selectedFile ? this.selectedFile.href : null;
		
		// If the tab being removed is selected, select the next file in the list
		if (this.selectedFile && this.selectedFile.metadata.Location === metadata.Location
			&& this.fileList.length > 1) {
			this.selectedFile = this.fileList[1];
		}
		for (var i = this.fileList.length; i--;) {
			if (this.fileList[i].metadata.Location === metadata.Location) {
				this.fileList.splice(i, 1);
			}
		}
		
		var tab = this.editorTabs[metadata.Location];
		lib.returnFocus(tab && tab.editorTabNode, lib.node("editorViewerContent_Panel" + this.id), function() {
			if (tab) {
				tab.breadcrumb.destroy();
				tab.fileNodeToolTip.destroy();
			}
			
			this.editorTabContainer.removeChild(tab.editorTabNode);
			delete this.editorTabs[metadata.Location];
			
			if (this.fileList.length < 2) {
				this.tabWidgetDropdownNode.style.display = "none";
				var closeButton = this.getCurrentEditorCloseButtonNode();
				closeButton.style.display = "none";
			}
	
			if (lastHref !== this.selectedFile.href) {
				this.activateEditorViewer();
				this.setWindowLocation(this.selectedFile.href);
			}
			this.setTabStorage();
		}.bind(this));
	},
	scrollToTab: function(tab) {
		var sib = tab.previousSibling;
		var offset = 30;
		if (sib) {
			offset = Math.floor(sib.offsetWidth / 2);
		}
		
		this.editorTabContainer.scrollLeft = tab.offsetLeft - offset;
	},
	getCurrentTabProperty: function(propertyName) {
		var fileMetadata = this.selectedFile && this.selectedFile.metadata ? this.selectedFile.metadata.Location : null;
		if (this.editorTabs.hasOwnProperty(fileMetadata)) {
			if (this.editorTabs[fileMetadata].hasOwnProperty(propertyName)) {
				return this.editorTabs[fileMetadata][propertyName];
			}
		}
		return null;
	},
	getCurrentTabDirtyIndicator: function() {
		return this.getCurrentTabProperty("dirtyIndicatorNode");
	},
	getCurrentEditorTabNode: function() {
		return this.getCurrentTabProperty("editorTabNode");
	},
	getCurrentEditorCloseButtonNode: function() {
		return this.getCurrentTabProperty("closeButtonNode");
	},
	updateDirtyIndicator: function(location, isDirty) {
		if (this.editorTabs.hasOwnProperty(location)) {
			var dirtyIndicator = this.editorTabs[location].dirtyIndicatorNode;
			if (dirtyIndicator) {
				dirtyIndicator.style.display = isDirty ? "block" : "none";
			}
			var breadcrumb = this.editorTabs[location].breadcrumb;
			if (breadcrumb) {
				dirtyIndicator = breadcrumb.dirty;
				if (dirtyIndicator) {
					dirtyIndicator.textContent = isDirty ? "*" : "";
				}
			}
		}
	}
});

function EditorViewer(options) {
	objects.mixin(this, options);
	this.id = this.id || ""; //$NON-NLS-0$
	this.selection = this.id ? new mSelection.Selection(this.serviceRegistry, "orion.page.selection" + this.id) : this.selection; //$NON-NLS-0$
	this.problemsServiceID = "orion.core.marker" + this.id; //$NON-NLS-0$
	this.editContextServiceID = "orion.edit.context" + this.id; //$NON-NLS-0$
	this.editModelContextServiceID = "orion.edit.model.context" + this.id; //$NON-NLS-0$
	this.shown = true;

	this.debugService = this.serviceRegistry.getService("orion.debug.service");
	
	var domNode = this.domNode = document.createElement("div"); //$NON-NLS-0$
	domNode.className = "editorViewerFrame"; //$NON-NLS-0$
	this.parent.appendChild(domNode);
	
	// Create the header 
	var headerNode = this.headerNode = document.createElement("div"); //$NON-NLS-0$
	headerNode.className = "editorViewerHeader"; //$NON-NLS-0$
	domNode.appendChild(headerNode);

	// Create the editor content area
	var contentNode = this.contentNode = document.createElement("div"); //$NON-NLS-0$
	contentNode.className = "editorViewerContent"; //$NON-NLS-0$
	contentNode.id = "editorViewerContent_Panel" + this.id;
	domNode.appendChild(contentNode);
	
	if (!enableSplitEditor) {
		headerNode.style.display = "none"; //$NON-NLS-0$
		contentNode.style.top = "0"; //$NON-NLS-0$
	}
	
	domNode.addEventListener("mousedown", function() { //$NON-NLS-0$
		this.activateContext.setActiveEditorViewer(this);
	}.bind(this), true);
	domNode.addEventListener("keyup", function() { //$NON-NLS-0$
		this.activateContext.setActiveEditorViewer(this);
	}.bind(this), true);
}
EditorViewer.prototype = {};
objects.mixin(EditorViewer.prototype, {
	
	create: function() {
		this.createTextModel();
		this.createInputManager();
		this.createTabWidget();
		this.createEditorView();
		this.createTabWidgetContextMenu();
		this.hookDebugService();
	},
	
	createTextModel: function() {
		this.pool = this.modelPool.create(this.editModelContextServiceID);
	},
	
	createEditorView: function() {
		this.editorView = new mEditorView.EditorView(this.defaultOptions());
	},
	createTabWidgetContextMenu: function(){
		var tabWidgetContextMenuNode = document.createElement("ul"); //$NON-NLS-0$
		tabWidgetContextMenuNode.className = "dropdownMenu"; //$NON-NLS-0$
		lib.setSafeAttribute(tabWidgetContextMenuNode, "role", "menu");
		tabWidgetContextMenuNode.style.zIndex = "201";  // Need to be greater than tooltipcontainer's zindex which is 200
		this.tabWidget.editorTabContainer.parentElement.appendChild(tabWidgetContextMenuNode);
		// Hook the context menu to the tabWidget's editorTabNode node
		var contextMenu = new mContextMenu.ContextMenu({
			dropdown: tabWidgetContextMenuNode,
			triggerNode: this.tabWidget.editorTabContainer
		});
		//function called when the context menu is triggered to set the nav selection properly
		var contextMenuTriggered = function(wrapper) {
			var re = wrapper.event;
			if (re.target) {
				this.commandRegistry.destroy(tabWidgetContextMenuNode); // remove previous content
				var target = re.target || re.srcElement;
				this.commandRegistry.renderCommands("tabWidgetContextMenuActions", tabWidgetContextMenuNode, target.metadata || target.parentElement.metadata, this, "menu", target.parentElement.href || ""); //$NON-NLS-1$ //$NON-NLS-2$
			}
		}.bind(this);
		contextMenu.addEventListener("triggered", contextMenuTriggered);
		this.registerTabWidgetContextMenu();
	},
	registerTabWidgetContextMenu: function(){
		var closeSelfTabWidgetCommand = new mCommands.Command({
			name: messages.closeSelf,
			id: "orion.tabWidget.closeself", //$NON-NLS-0$
			visibleWhen: /** @callback */ function(items, data) {
				return data.userData && Object.keys(this.tabWidget.editorTabs).length > 1;
			}.bind(this),
			callback: function(commandInvocation) {
				var targetEditorTab = this.tabWidget.editorTabs[commandInvocation.items.Location] || this.tabWidget.editorTabs[this.tabWidget.selectedFile.metadata.Location]; // the targetEditorTab is the activetab when user use keybinds to close, otherwise is the selected one.
				targetEditorTab.closeButtonNode.click();
			}.bind(this)
		});
		var closeOtherTabWidgetCommand = new mCommands.Command({
			name: messages.closeOthers,
			id: "orion.tabWidget.closeothers", //$NON-NLS-0$
			visibleWhen: /** @callback */ function(items, data) {
				return data.userData && Object.keys(this.tabWidget.editorTabs).length > 1;
			}.bind(this),
			callback: function(commandInvocation) {
				Object.keys(this.tabWidget.editorTabs).forEach(function(tab){
					if(commandInvocation.items.Location !== tab){
						this.tabWidget.editorTabs[tab].closeButtonNode.click();
					}
				}.bind(this));
			}.bind(this)
		});
		var closeToRight = new mCommands.Command({
			name: messages.closeTotheRight,
			id: "orion.tabWidget.closetoright", //$NON-NLS-0$
			visibleWhen: /** @callback */ function(items, data) {
				return data.userData && Object.keys(this.tabWidget.editorTabs).length > 1;
			}.bind(this),
			callback: function(commandInvocation) {
				// Get the right hand tabs from this.editorTab parent.
				var firstNodeIndexToRemove;
				Array.prototype.some.call(this.tabWidget.editorTabContainer.childNodes, function(node, index){
					if(node.metadata.Location === commandInvocation.items.Location){
						firstNodeIndexToRemove = index + 1;
						return true;
					}
				});
				var closingButtons = [];
				for(var j = firstNodeIndexToRemove; j < this.tabWidget.editorTabContainer.childNodes.length; j++){
					var closeButton = this.tabWidget.editorTabContainer.childNodes[j].querySelector(".editorTabCloseButton");
					closingButtons.push(closeButton);
				}
				closingButtons.forEach(function(closeButton){
					closeButton.click();
				});
			}.bind(this)
		});
		var keepOpen = new mCommands.Command({
			name: messages.keepOpen,
			id: "orion.tabWidget.keepOpen", //$NON-NLS-0$
			visibleWhen: /** @callback */ function(items, data) {
				return data.userData && this.tabWidget.transientTab && data.items.Location === this.tabWidget.transientTab.location;
			}.bind(this),
			callback: function(commandInvocation) {
				this.tabWidget.transientToPermanent(commandInvocation.userData);
			}.bind(this)
		});
		var nextTab = new mCommands.Command({
			name: messages["selectNextTab"],
			id: "orion.tabWidget.selectNextTab",
			visibleWhen: function(items, data) {
				return Object.keys(data.handler.tabWidget.editorTabs).length > 1;
			},
			callback: function(){
				var selectedTab = this.tabWidget.getCurrentEditorTabNode();
				if (selectedTab.nextSibling !== null) {
					selectedTab.nextSibling.click();
				} else {
					selectedTab.parentNode.firstChild.click();
				}
			}
		});
		var previousTab = new mCommands.Command({
			name: messages["selectPreviousTab"],
			id: "orion.tabWidget.selectPreviousTab",
			visibleWhen: function(items, data) {
				return Object.keys(data.handler.tabWidget.editorTabs).length > 1;
			},
			callback: function(){
				var selectedTab = this.tabWidget.getCurrentEditorTabNode();
				if (selectedTab.previousSibling !== null) {
					selectedTab.previousSibling.click();
				} else {
					selectedTab.parentNode.lastChild.click();
				}
			}
		});
		this.commandRegistry.addCommand(closeSelfTabWidgetCommand);
		this.commandRegistry.addCommand(closeOtherTabWidgetCommand);
		this.commandRegistry.addCommand(closeToRight);
		this.commandRegistry.addCommand(keepOpen);
		this.commandRegistry.addCommand(nextTab);
		this.commandRegistry.addCommand(previousTab);
		
		// tabWidget context menu
		this.commandRegistry.addCommandGroup("tabWidgetContextMenuActions", "orion.tabWidgetContextMenuGroup", 100, null, null, null, null, null, "dropdownSelection"); //$NON-NLS-1$ //$NON-NLS-2$
		this.commandRegistry.registerCommandContribution("tabWidgetContextMenuActions", "orion.tabWidget.closeself", this.tabWidget.tabWidgetContextItemindex++,"orion.tabWidgetContextMenuActions/orion.tabWidget.closeGroup",false, new mKeyBinding.KeyBinding(118, true)); //$NON-NLS-1$ //$NON-NLS-2$
		this.commandRegistry.registerCommandContribution("tabWidgetContextMenuActions", "orion.tabWidget.closeothers", this.tabWidget.tabWidgetContextItemindex++,"orion.tabWidgetContextMenuActions/orion.tabWidget.closeGroup",false, new mKeyBinding.KeyBinding(119, true)); //$NON-NLS-1$ //$NON-NLS-2$
		this.commandRegistry.registerCommandContribution("tabWidgetContextMenuActions", "orion.tabWidget.closetoright", this.tabWidget.tabWidgetContextItemindex++,"orion.tabWidgetContextMenuActions/orion.tabWidget.closeGroup"); //$NON-NLS-1$ //$NON-NLS-2$
		this.commandRegistry.registerCommandContribution("tabWidgetContextMenuActions", "orion.tabWidget.keepOpen", this.tabWidget.tabWidgetContextItemindex++,"orion.tabWidgetContextMenuActions/orion.tabWidget.others", false, new mKeyBinding.KeyBinding('K', true, true)); //$NON-NLS-1$ //$NON-NLS-2$
		this.commandRegistry.registerCommandContribution("tabWidgetContextMenuActions" , "orion.tabWidget.selectNextTab", this.tabWidget.tabWidgetContextItemindex++, "orion.tabWidgetContextMenuActions/orion.tabWidget.traverse", false, new mKeyBinding.KeyBinding(117, true), null, this);
		this.commandRegistry.registerCommandContribution("tabWidgetContextMenuActions" , "orion.tabWidget.selectPreviousTab", this.tabWidget.tabWidgetContextItemindex++, "orion.tabWidgetContextMenuActions/orion.tabWidget.traverse", false, new mKeyBinding.KeyBinding(117, true, true), null, this);
	},
	
	createTabWidget: function() {
		this.tabWidget = new TabWidget({
			parent: this.headerNode,
			commandRegistry: this.commandRegistry,
			id: this.id,
			fileClient: this.fileClient,
			generalPreferences: this.generalPreferences,
			inputManager: this.inputManager,
			tabWidgetContextItemindex: 1,
			activateEditorViewer: function() {
				this.activateContext.setActiveEditorViewer(this);
			}.bind(this)
		});

		this.tabWidget.addEventListener("TabClosing", function(evt) {
			var isDirty = evt.isDirty;
			if (isDirty) {
				if (this.inputManager._autoSaveEnabled) {
					this.inputManager.save();
					evt.callback();
				} else if (this.getOpenEditorCount(this.inputManager.getFileMetadata()) === 1) {
					var cancelCallback = function() { return; };
					this.inputManager.confirmUnsavedChanges(evt.callback, cancelCallback, evt.editorTab);
				} else {
					evt.callback();
				}
			} else {
				evt.callback();
			}
		}.bind(this));

		this.tabWidget.addEventListener("TabClosed", function(evt) {
			this.modelPool.release(evt.resource, this.id);
			if(this.tabWidget.transientTab && evt.resource === this.tabWidget.transientTab.location){
				 this.tabWidget.transientTab = null;
			}
		}.bind(this));

		this.tabWidget.addEventListener("EditorTabTransfer", function(evt) {
			this.activateContext.editorViewers.forEach(function(viewer) {
				if (viewer.tabWidget.getDraggedNode() !== null) {
					evt.beingDragged = viewer.tabWidget.getDraggedNode();
				}
			});
		}.bind(this));
	},
	
	createInputManager: function() {
		var inputManager = this.inputManager = new mInputManager.InputManager({
			serviceRegistry: this.serviceRegistry,
			fileClient: this.fileClient,
			progressService: this.progressService,
			statusReporter: this.statusReporter.bind(this),
			selection: this.selection,
			contentTypeRegistry: this.contentTypeRegistry,
			generalPreferences: this.generalPreferences,
			isEditorTabsEnabled: util.isElectron ? true : this.generalPreferences && this.generalPreferences.hasOwnProperty("enableEditorTabs") ? this.generalPreferences.enableEditorTabs : false,
			confirm: function(message, buttonCallbackList, targetNode){
				targetNode = targetNode || this.tabWidget.getCurrentEditorTabNode();
				this.commandRegistry.confirmWithButtons(targetNode, message, buttonCallbackList);
			}.bind(this),
			reveal: function(model) {
				this.sidebar.sidebarNavInputManager.reveal(model);
			}.bind(this),
			isUnsavedWarningNeeed:function(){
				return this.getOpenEditorCount(this.inputManager.getFileMetadata()) === 1;
			}.bind(this)
		});	
		inputManager.addEventListener("InputChanged", function(evt) { //$NON-NLS-0$
			var metadata = evt.metadata;
			if (metadata) {
				var tabHref = this.activateContext.computeNavigationHref(evt.metadata);
				var lastFile = PageUtil.hash();
				if (lastFile  === "#" + metadata.Location){
					sessionStorage.lastFile = lastFile;
				}
				this.tabWidget.addTab(metadata, tabHref);
			} else {
				delete sessionStorage.lastFile;
			}
			var view = this.getEditorView(evt.input, metadata);
			this.setEditor(view ? view.editor : null);
			this.addAnnotationsFromDebugService();
			this.updateDirtyIndicator();
			evt.editor = this.editor;
			this.pool.metadata = metadata;
			
			var editorView = this.getCurrentEditorView();
			if (editorView && editorView.editor && typeof editorView.editor.getTextView === 'function') {
				this.editor.isFileInitiallyLoaded = false;
				var textView = editorView.editor.getTextView();
				textView.addEventListener("ModelChanged", function(){
					if(this.editor.isFileInitiallyLoaded){
						if(this.tabWidget.transientTab && this.pool.metadata && this.tabWidget.transientTab.location === this.pool.metadata.Location){
							this.tabWidget.transientToPermanent(this.tabWidget.transientTab.href);
						}
					}
				}.bind(this));
				var flagInitialLoad = function(evt){
						if(typeof evt.contentsSaved === "undefined"){
							this.editor.isFileInitiallyLoaded = true; 
						}
						this.editor.removeEventListener("InputChanged", flagInitialLoad);
					}.bind(this);
				this.editor.addEventListener("InputChanged", flagInitialLoad);
			}
			
			if (this.shown) {
				var href = window.location.href;
				this.activateContext.setActiveEditorViewer(this);
				this.commandRegistry.processURL(href);
			}
		}.bind(this));
		inputManager.addEventListener("InputChanging", function(e) { //$NON-NLS-0$
			var previousPool = this.pool;
			var modelPool = this.modelPool;
			var p = modelPool.search(e.input.resource);
			if (p) {
				this.pool = p;
			} else {
				p = this.pool = modelPool.create(this.editModelContextServiceID);
			}

			modelPool.registerViewer(this.pool, this.id);

			// If the pool has been initialized and the input has changed
			// set the event metadata so InputManager will update.
			if (this.pool.metadata && previousPool !== this.pool) {
				e.metadata = p.metadata;
			}
			if (previousPool !== this.pool) {
				// This is necessary because the editor view is reused
				var editorView = this.editorView;
				editorView.model = this.pool.model;
				editorView.undoStack = this.pool.undoStack;
				editorView.editModelContextServiceID = this.pool.serviceID;
				var editor = editorView.editor;
				if (editor.installed) {
					this._recreate = true;
				}
			}
		}.bind(this));
		var fileClient = this.fileClient;

		this.fileClient.addEventListener("Changed", function(evt) {
			var that = this;
			var selectedMetadata = inputManager.getFileMetadata();
			if (evt.deleted) {
				evt.deleted.forEach(function(item) {
					var deleteLocation = item.deleteLocation;
					if (selectedMetadata.Location.indexOf(deleteLocation) === 0 || that.tabWidget.editorTabs.hasOwnProperty(deleteLocation)) {
						var metadata = that.tabWidget.getMetadataByLocation_(deleteLocation) || selectedMetadata;
						if (that.tabWidget.fileList.length < 2) {
							var newLocation;
							if (metadata.Parents) {
								metadata.Parents.some(function(p) {
									if (p.Location.indexOf(item.deleteLocation) !== 0) {
										newLocation = p.Location;
										return true;
									}
								});
							}
							inputManager.addEventListener("InputChanged", this.loadComplete = function() {
								inputManager.removeEventListener("InputChanged", this.loadComplete);
								that.tabWidget.closeTab(metadata, false);
							}.bind(this));
							window.location = urlModifier(that.activateContext.computeNavigationHref({Location: newLocation || metadata.WorkspaceLocation || fileClient.fileServiceRootURL(metadata.Location)}));
						} else {
							that.tabWidget.closeTab(metadata, false);
						}
					}
				});
			} else if (evt.hasOwnProperty("moved")) {
				evt.moved.forEach(function(item) {
					var sourceLocation = item.source;
					var metadata = that.tabWidget.getMetadataByLocation_(sourceLocation) || selectedMetadata;
					if (selectedMetadata && selectedMetadata.Location.indexOf(sourceLocation) === 0) {
						inputManager.addEventListener("InputChanged", this.loadComplete = function() {
							inputManager.removeEventListener("InputChanged", this.loadComplete);
							that.tabWidget.closeTab(metadata, false);
						}.bind(this));
						window.location = urlModifier(that.activateContext.computeNavigationHref({Location: item.result && item.result.Location || metadata.WorkspaceLocation || fileClient.fileServiceRootURL(selectedMetadata.Location)}));
					} else if (that.tabWidget.editorTabs.hasOwnProperty(sourceLocation)) {
						that.tabWidget.closeTab(metadata, false);
					}
				});
			}
		}.bind(this));

		this.selection.addEventListener("selectionChanged", function(evt) { //$NON-NLS-0$
			inputManager.setInput(evt.selection);
		});
	},

	hookDebugService: function() {
		// Handle breakpoint event and add annotation
		this.debugService.addEventListener("BreakpointAdded", function(e) {
			if (!this.editor) {
				return;
			}
			if (e.breakpoint.location === this.inputManager.getInput()) {
				var annotation = this.breakpointToAnnotation(e.breakpoint);
				var annotationModel = this.editor.getAnnotationModel();
				annotationModel.addAnnotation(annotation);
			}
		}.bind(this));
		this.debugService.addEventListener("BreakpointRemoved", function(e) {
			if (!this.editor) {
				return;
			}
			if (e.breakpoint.location === this.inputManager.getInput()) {
				var annotation = this.breakpointToAnnotation(e.breakpoint);
				var type = annotation.type;
				var annotationModel = this.editor.getAnnotationModel();
				var annotations = annotationModel.getAnnotations(annotation.start, annotation.end);
				while (annotations.hasNext()) {
					var annotation = annotations.next();
					if (annotation.type === type) {
						annotationModel.removeAnnotation(annotation);
					}
				}
			}
		}.bind(this));

		// Handle line focused event
		this.debugService.addEventListener("LineFocused", function(e) {
			if (!this.editor) {
				return;
			}
			if (e.location !== this.inputManager.getInput()) {
				return;
			}
			this.editor.highlightLine(e.line);
		}.bind(this));
		this.debugService.addEventListener("LineUnfocused", function(e) {
			if (!this.editor) {
				return;
			}
			this.editor.unhighlightLine();
		}.bind(this));
	},

	defaultOptions: function() {
		//Don't forward the complete activate context, only specify the things we want to see
		var context = Object.create(null);
		context.openEditor = this.activateContext.openEditor.bind(this.activateContext);
		return {
			activateContext: context,
			parent: this.contentNode,
			model: this.pool.model,
			undoStack: this.pool.undoStack,
			editModelContextServiceID: this.pool.serviceID,
			menuBar: this.menuBar,
			serviceRegistry: this.serviceRegistry,
			pluginRegistry: this.pluginRegistry,
			commandRegistry: this.commandRegistry,
			contentTypeRegistry: this.contentTypeRegistry,
			editorCommands: this.editorCommands,
			renderToolbars: this.renderToolbars,
			inputManager: this.inputManager,
			readonly: this.readonly,
			preferences: this.preferences,
			searcher: this.searcher,
			selection: this.selection,
			viewerID: this.id,
			problemsServiceID: this.problemsServiceID,
			editContextServiceID: this.editContextServiceID,
			fileService: this.fileClient,
			statusReporter: this.statusReporter.bind(this),
			statusService: this.statusService,
			progressService: this.progressService
		};
	},
	
	statusReporter: function(message, type, isAccessible) {
		var statusService = this.statusService;
		if (type === "progress") { //$NON-NLS-0$
			statusService.setProgressMessage(message);
		} else if (type === "error") { //$NON-NLS-0$
			statusService.setErrorMessage({Message: message, Severity: "Error"}); //$NON-NLS-0$
		} else {
			statusService.setMessage(message, null, isAccessible);
		}
	},
	
	getCurrentEditorView: function() {
		if (this.currentEditorView) {
			if (this.currentEditorView.editorID === "orion.editor.markdown") { //$NON-NLS-0$
				return this.editorView;
			}
		}
		return this.currentEditorView;
	},
	
	getEditorView: function (input, metadata) {
		var view = null;
		if (metadata && input) {
			var options = objects.mixin({
				input: input,
				metadata: metadata
			}, this.defaultOptions());
			//TODO better way of registering built-in editors
			if (metadata.Directory) {
				view = new mFolderView.FolderView(options);
			} else {
				var id = input.editor;
				this.editorView.setParent(this.contentNode);
				if (!id || id === "orion.editor") { //$NON-NLS-0$
					view = this.editorView;
				} else if (id === "orion.viewer.markdown") { //$NON-NLS-0$
					view = new mMarkdownView.MarkdownEditorView(options);
				} else if (id === "orion.editor.markdown") { //$NON-NLS-0$
					options.editorView = this.editorView;
					options.anchor = input.anchor;
					view = new mMarkdownEditor.MarkdownEditorView(options);
				} else {
					var editors = this.serviceRegistry.getServiceReferences("orion.edit.editor"); //$NON-NLS-0$
					for (var i=0; i<editors.length; i++) {
						if (editors[i].getProperty("id") === id) { //$NON-NLS-0$
							options.editorService = editors[i];
							view = new mPluginEditorView.PluginEditorView(options);
							break;
						}
					}
				}
			}
			view.editorID = id;
		}
		if (this.currentEditorView !== view || this._recreate) {
			this._recreate = false;
			this.commandRegistry.closeParameterCollector();
			if (this.currentEditorView) {
				this.currentEditorView.destroy();
			}
			if (this.pool.lastMetadata && metadata && this.pool.lastMetadata.Location !== metadata.Location) {
				this.pool.model.setText("");
			}
			this.currentEditorView = view;
			if (this.currentEditorView) {
				this.currentEditorView.create();
			}
		}
		this.pool.lastMetadata = metadata;
		return this.currentEditorView;
	},
	
	setEditor: function(newEditor) {
		if (this.editor === newEditor) { return; }
		if (this.editor) {
			this.editor.removeEventListener("DirtyChanged", this.editorDirtyListener); //$NON-NLS-0$
			this.editor.removeEventListener("UserAnnotationModified", this.editorAnnotationModifiedListener);
		}
		this.editor = newEditor;
		if (this.editor) {
			this.editor.addEventListener("DirtyChanged", this.editorDirtyListener = function() { //$NON-NLS-0$
				this.activateContext.editorViewers.forEach(function(editorViewer){
					editorViewer.updateDirtyIndicator();
				});
			}.bind(this));
			this.editor.addEventListener("UserAnnotationModified", this.editorAnnotationModifiedListener = function(e) {
				// Update debug service
				e.removed.forEach(function(annotation) {
					var breakpoint = this.annotationToBreakpoint(annotation);
					if (breakpoint) {
						this.debugService.removeBreakpoint(breakpoint);
					}
				}.bind(this));
				e.added.forEach(function(annotation) {
					var breakpoint = this.annotationToBreakpoint(annotation);
					if (breakpoint instanceof mBreakpoint.LineConditionalBreakpoint) {
						this.commandRegistry.prompt(this.domNode, messages["EnterCondition"], messages["OK"], messages["Cancel"], "true", false, function(condition) {
							if (condition) {
								breakpoint.condition = breakpoint.description = condition;
								this.debugService.addBreakpoint(breakpoint);
							}
						}.bind(this));
					} else {
						if (breakpoint) {
							this.debugService.addBreakpoint(breakpoint);
						}
					}
				}.bind(this));
			}.bind(this));
			// Listen annotation changes
			var annotationModel = this.editor.getAnnotationModel && this.editor.getAnnotationModel();
			annotationModel && annotationModel.addEventListener("Changed", this.annotationModelChangedListener = function(e) {
				if (e.changed.length === 0) {
					return;
				}
				this._annotationChangedContext.events.push(e);
				this._annotationChangedContext.locations.push(this.inputManager.getInput());
				var textModel = this.editor.getModel();
				if (textModel.getBaseModel) {
					textModel = textModel.getBaseModel();
				}
				this._annotationChangedContext.textModels.push(textModel);
				if (!this._annotationChangedContext.timeout) {
					this._annotationChangedContext.timeout = setTimeout(this._annotationChangedHandler.bind(this), 0);
				}
			}.bind(this));
			this.editor.addEventListener("TextViewUninstalled", this.editorUninstalledListener = function(e) {
				this.editor.removeEventListener("TextViewUninstalled", this.editorUninstalledListener);
				annotationModel && annotationModel.removeEventListener("Changed", this.annotationModelChangedListener);
			}.bind(this));
		}
	},

	_annotationChangedContext: {
		timeout: undefined,
		events: [],
		locations: [],
		textModels: []
	},

	/**
	 * Handle all annotation changed events in the last tick.
	 * This avoids duplicate events from a single text model.
	 */
	_annotationChangedHandler: function() {
		/** All events from last tick */
		var pendingEvents = this._annotationChangedContext.events;
		var pendingLocations = this._annotationChangedContext.locations;
		var pendingModels = this._annotationChangedContext.textModels;
		/** All unique events from last tick */
		var handlingEvents = [];
		var handlingLocations = [];
		var handlingModels = [];
		// Cleanup
		this._annotationChangedContext.timeout = undefined;
		this._annotationChangedContext.events = [];
		this._annotationChangedContext.locations = [];
		// Remove duplicate events
		for (var i = 0; i < pendingEvents.length; i++) {
			var duplicate = false;
			for (var j = 0; j < i; j++) {
				if (pendingEvents[i].textModelChangedEvent === pendingEvents[j].textModelChangedEvent) {
					duplicate = true;
				}
				break;
			}
			if (!duplicate) {
				handlingEvents.push(pendingEvents[i]);
				handlingLocations.push(pendingLocations[i]);
				handlingModels.push(pendingModels[i]);
			}
		}

		// Handle
		for (i = 0; i < handlingEvents.length; i++) {
			var e = handlingEvents[i];
			for (j = 0; j < e.changed.length; j++) {
				var annotation = e.changed[j];
				var location = handlingLocations[i];
				var oldLine;
				var newLine = handlingModels[i].getLineAtOffset(annotation.start);
				if (annotation._oldStart > e.textModelChangedEvent.start) {
					oldLine = newLine - e.textModelChangedEvent.addedLineCount + e.textModelChangedEvent.removedLineCount;
				} else {
					oldLine = handlingModels[i].getLineAtOffset(annotation._oldStart);
				}
				var before = null;
				var after = null;
				if (annotation.type === AT.ANNOTATION_BOOKMARK) {
					before = new mBreakpoint.LineBookmark(location, oldLine, annotation.title);
					after = new mBreakpoint.LineBookmark(location, newLine, annotation.title);
				} else if (annotation.type === AT.ANNOTATION_BREAKPOINT) {
					before = new mBreakpoint.LineBreakpoint(location, oldLine, annotation.title, true);
					after = new mBreakpoint.LineBreakpoint(location, newLine, annotation.title, true);
				} else if (annotation.type === AT.ANNOTATION_CONDITIONAL_BREAKPOINT) {
					before = new mBreakpoint.LineConditionalBreakpoint(location, oldLine, annotation.title, annotation.title, true);
					after = new mBreakpoint.LineConditionalBreakpoint(location, newLine, annotation.title, annotation.title, true);
				}
				if (before && after) {
					this.debugService.updateBreakpoint(before, after, true);
				}
			}
		}
	},

	addAnnotationsFromDebugService: function() {
		// Add local breakpoints to this editor
		this.debugService.getBreakpointsByLocation(this.inputManager.getInput()).then(function(breakpoints) {
			if (!this.editor || !this.editor.getAnnotationModel) {
				return;
			}
			var annotationModel = this.editor.getAnnotationModel();
			annotationModel.removeAnnotations(AT.ANNOTATION_BOOKMARK);
			annotationModel.removeAnnotations(AT.ANNOTATION_BREAKPOINT);
			annotationModel.removeAnnotations(AT.ANNOTATION_CONDITIONAL_BREAKPOINT);
			breakpoints.forEach(function(breakpoint) {
				var annotation = this.breakpointToAnnotation(breakpoint);
				if (annotation) {
					annotationModel.addAnnotation(annotation);
				}
			}.bind(this));
		}.bind(this));

		// Add current focused line
		this.debugService.getFocusedLine().then(function(lineWithLocation) {
			if (!this.editor) {
				return;
			}
			if (!lineWithLocation) {
				return;
			}
			var line = lineWithLocation.line;
			var location = lineWithLocation.location;
			if (location !== this.inputManager.getInput()) {
				return;
			}
			this.editor.highlightLine(line);
		}.bind(this));
	},
	
	annotationToBreakpoint: function(annotation) {
		var location = this.inputManager.getInput();
		var textModel = this.editor.getModel();
		if (textModel.getBaseModel) {
			textModel = textModel.getBaseModel();
		}
		var line = textModel.getLineAtOffset(annotation.start);
		if (annotation.type === AT.ANNOTATION_BOOKMARK) {
			return new mBreakpoint.LineBookmark(location, line, annotation.title);
		} else if (annotation.type === AT.ANNOTATION_BREAKPOINT) {
			return new mBreakpoint.LineBreakpoint(location, line, annotation.title, true);
		} else if (annotation.type === AT.ANNOTATION_CONDITIONAL_BREAKPOINT) {
			return new mBreakpoint.LineConditionalBreakpoint(location, line, annotation.title, annotation.title, true);
		}
		return null;
	},

	breakpointToAnnotation: function(breakpoint) {
		var annotationType = undefined;
		if (breakpoint instanceof mBreakpoint.LineBookmark) {
			annotationType = AT.ANNOTATION_BOOKMARK;
		} else if (breakpoint instanceof mBreakpoint.LineBreakpoint) {
			annotationType = AT.ANNOTATION_BREAKPOINT;
		} else if (breakpoint instanceof mBreakpoint.LineConditionalBreakpoint) {
			annotationType = AT.ANNOTATION_CONDITIONAL_BREAKPOINT;
		}
		if (annotationType) {
			var textModel = this.editor.getModel();
			if (textModel.getBaseModel) {
				textModel = textModel.getBaseModel();
			}
			var lineStart = textModel.getLineStart(breakpoint.line);
			var lineEnd = textModel.getLineEnd(breakpoint.line);
			return AT.createAnnotation(annotationType, lineStart, lineEnd, breakpoint.description);
		}
		return null;
	},

	updateDirtyIndicator: function(){
		if (this.editor && this.editor.isDirty) {
			var loc = this.inputManager.getFileMetadata().Location;
			var dirty = this.editor.isDirty();
			mGlobalCommands.setDirtyIndicator(dirty);
			// Update all dirty indicators for each tab associated with this file.
			this.activateContext.editorViewers.forEach(function(editorViewer) {
				editorViewer.tabWidget.updateDirtyIndicator(loc, dirty);
			});
		}
	},
	
	getOpenEditorCount: function(fileMetadata){
		var count = 0;
		this.activateContext.editorViewers.forEach(function(editorViewer){
			editorViewer.tabWidget.fileList.forEach(function(file) {
				if (file.metadata.Location === fileMetadata.Location) {
					count++;
				}
			});
		});
		return count;
	},
	
	setInput: function(hash) {
		this.inputManager.setInput(hash);
	}
});

function EditorSetup(serviceRegistry, pluginRegistry, preferences, readonly) {
	this.serviceRegistry = serviceRegistry;
	this.pluginRegistry = pluginRegistry;
	this.preferences = preferences;
	this.readonly = readonly;
	this.initializeServices();
	
	this.modelPool = new TextModelPool({serviceRegistry: this.serviceRegistry});

	this.editorDomNode = lib.node("editor"); //$NON-NLS-0$
	this.sidebarDomNode = lib.node("pageSidebar"); //$NON-NLS-0$
	this.sidebarToolbar = lib.node("sidebarToolbar"); //$NON-NLS-0$
	this.pageToolbar = lib.node("pageToolbar"); //$NON-NLS-0$
	lib.setSafeAttribute(lib.node("auxpane"), "aria-label", messages.Navigator);

	this.editorViewers = [];
}
EditorSetup.prototype = {};
objects.mixin(EditorSetup.prototype, {
	
	initializeServices: function() {
		var serviceRegistry = this.serviceRegistry;
		this.selection = new mSelection.Selection(serviceRegistry);
		this.operationsClient = new mOperationsClient.OperationsClient(serviceRegistry);
		this.statusService = new mStatus.StatusReportingService(serviceRegistry, this.operationsClient, "statusPane", "notifications", "notificationArea"); //$NON-NLS-2$ //$NON-NLS-1$ //$NON-NLS-0$ //$NON-NLS-3$
		this.commandRegistry = new mCommandRegistry.CommandRegistry({selection: this.selection});
		this.dialogService = new mDialogs.DialogService(serviceRegistry, this.commandRegistry);
		this.progressService = new mProgress.ProgressService(serviceRegistry, this.operationsClient, this.commandRegistry, null, this.preferences);
		this.getGeneralPreferences().then(function() {
			if (this.generalPreferences.enableDebugger) {
				this.nativeDeployService = new mNativeDeployService.NativeDeployService(serviceRegistry, this.commandRegistry);
				var debugFileService = new DebugFileImpl();
				serviceRegistry.registerService("orion.core.file", debugFileService, {
					Name: debugMessages["DebugWorkspace"],
					top: "/debug",
					pattern: "/debug"
				});
				new HoverEvaluationService(serviceRegistry, this);
			}
		}.bind(this));
		this.sshService = new mSshTools.SshService(serviceRegistry);
		this.gitClient = new mGitClient.GitService(serviceRegistry);
		
		// Editor needs additional services
		this.outlineService = new mOutliner.OutlineService({serviceRegistry: serviceRegistry, preferences: this.preferences});
		this.contentTypeRegistry = new mContentTypes.ContentTypeRegistry(serviceRegistry);
		this.fileClient = new mFileClient.FileClient(serviceRegistry);
		this.projectClient = new mProjectClient.ProjectClient(serviceRegistry, this.fileClient);
		this.searcher = new mSearchClient.Searcher({serviceRegistry: serviceRegistry, commandService: this.commandRegistry, fileService: this.fileClient});
		this.editorCommands = new mEditorCommands.EditorCommandFactory({
			serviceRegistry: serviceRegistry,
			commandRegistry: this.commandRegistry,
			fileClient: this.fileClient,
			preferences: this.preferences,
			renderToolbars: this.renderToolbars.bind(this),
			searcher: this.searcher,
			readonly: this.readonly,
			toolbarId: "menuBarActions", //$NON-NLS-0$
			saveToolbarId: "menuBarActions", //$NON-NLS-0$
			editToolbarId: "menuBarActions", //$NON-NLS-0$
			navToolbarId: "pageNavigationActions", //$NON-NLS-0$
			editorContextMenuId: "editorContextMenuActions", //$NON-NLS-0$
		});
		this.debugService = new mDebugService.DebugService(serviceRegistry);
		// Use localStorage based debug service until we find a good way to cache breakpoint position
		// this.debugService = new mDebugService.PreferenceDebugService(serviceRegistry, this.preferences);
	},
	
	getGeneralPreferences: function() {
		var deferred = new Deferred();
		new mGeneralPrefs.GeneralPreferences(this.preferences).getPrefs().then(function(prefs) {
			this.generalPreferences = prefs;
			// Load debug package if needed
			if (this.generalPreferences.enableDebugger && !mNativeDeployService) {
				require(['orion/debug/debugPackage'], function() {
					require([
						'orion/debug/nativeDeployService',
						'i18n!orion/debug/nls/messages',
						'orion/debug/debugFileImpl'
					], function(dymNativeDeployService, dyDebugMessage, dyDebugFileImpl) {
						mNativeDeployService = dymNativeDeployService;
						debugMessages = dyDebugMessage;
						DebugFileImpl = dyDebugFileImpl;
						deferred.resolve();
					});
				});
			} else {
				deferred.resolve();
			}
		}.bind(this));
		return deferred;
	},
	
	createBanner: function() {
			// Do not collapse sidebar, https://bugs.eclipse.org/bugs/show_bug.cgi?id=418558
		var collapseSidebar = false; //PageUtil.hash() !== ""
		return mGlobalCommands.generateBanner("orion-editor", this.serviceRegistry, this.commandRegistry, this.preferences, this.searcher, null, null, collapseSidebar, this.fileClient); //$NON-NLS-0$
	},
	
	createMenuBar: function() {
		var menuBar = this.menuBar = new MenuBar({
			parentNode: this.pageToolbar,
			fileClient: this.fileClient,
			editorCommands: this.editorCommands,
			commandRegistry: this.commandRegistry,
			serviceRegistry: this.serviceRegistry,
			generalPreferences: this.generalPreferences
		});
		return menuBar.createCommands();
	},
	
	createRunBar: function () {
		var menuBar = this.menuBar;
		var runBarParent = menuBar.runBarNode;
		return this.preferences.get('/runbar').then(function(prefs) {
			if (Boolean(prefs) && prefs.disabled === true) {
				var d = new Deferred();
				d.resolve();
				return d;
			}
			return mCustomGlobalCommands.createRunBar({
				parentNode: runBarParent,
				serviceRegistry: this.serviceRegistry,
				commandRegistry: this.commandRegistry,
				fileClient: this.fileClient,
				projectCommands: ProjectCommands,
				projectClient: this.serviceRegistry.getService("orion.project.client"),
				progressService: this.progressService,
				preferences: this.preferences,
				editorInputManager: this.editorInputManager,
				generalPreferences: this.generalPreferences
			}).then(function(runBar){
				if (runBar) {
					this.runBar = runBar;
					var displayRunBar = prefs.display === undefined  || prefs.display;
					if (!displayRunBar) {
						lib.node("runBarWrapper").style.display = "none";
					}
				}
			}.bind(this));
		}.bind(this));
	},
	
	createSideBar: function() {
		// Create input manager wrapper to handle multiple editors
		function EditorInputManager() {
			EventTarget.attach(this);
		}
		objects.mixin(EditorInputManager.prototype, {
			getFileMetadata: function() {
				return this.inputManager.getFileMetadata();
			},
			getContentType: function() {
				return this.inputManager.getContentType();
			},
			getEditor: function() {
				return this.inputManager.getEditor();
			},
			getInput: function() {
				return this.inputManager.getInput();
			},
			getTitle: function() {
				return this.inputManager.getTitle();
			},
			getReadOnly: function() {
				return this.inputManager.getReadOnly();
			},
			setInputManager: function(inputManager) {
				this.inputManager = inputManager;
				this.selection = inputManager.selection;
				this.editor = inputManager.editor;
			}
		});
		this.editorInputManager = new EditorInputManager();
		function SidebarNavInputManager() {
			EventTarget.attach(this);
		}
		this.sidebarNavInputManager = new SidebarNavInputManager();
		var sidebar = this.sidebar = new Sidebar({
			commandRegistry: this.commandRegistry,
			contentTypeRegistry: this.contentTypeRegistry,
			editorInputManager: this.editorInputManager,
			preferences: this.preferences,
			generalPreferences: this.generalPreferences,
			fileClient: this.fileClient,
			outlineService: this.outlineService,
			parent: this.sidebarDomNode,
			progressService: this.progressService,
			searcher: this.searcher,
			selection: this.selection,
			serviceRegistry: this.serviceRegistry,
			sidebarNavInputManager: this.sidebarNavInputManager,
			switcherScope: "menuBarActions", //$NON-NLS-0$
			editScope: "menuBarActions", //$NON-NLS-0$
			toolsScope: "menuBarActions", //$NON-NLS-0$
			menuBar: this.menuBar,
			toolbar: this.sidebarToolbar
		});
		SidebarNavInputManager.prototype.processHash = function() {
			var navigate = PageUtil.matchResourceParameters().navigate;
			if (typeof navigate === "string" && this.setInput && sidebar.getActiveViewModeId() === "nav") { //$NON-NLS-1$ //$NON-NLS-0$
				this.setInput(navigate);
			}
		};
		sidebar.create();
		this.editorCommands.setSideBar(sidebar);
		this.sidebarNavInputManager.addEventListener("rootChanged", function(evt) { //$NON-NLS-0$
			this.lastRoot = evt.root;
		}.bind(this));
		this.sidebarNavInputManager.addEventListener("filesystemChanged", function(evt) { //$NON-NLS-0$
			this.fileClient.loadWorkspaces(evt.newInput).then(function(workspaces) {
				var resource = PageUtil.matchResourceParameters().resource;
				this.fileClient.getWorkspace(resource).then(function(workspace) {
					if (!workspaces.some(function(w) {
						if (w.Id === workspace.Id) {
							window.location = uriTemplate.expand({resource: w.Location});
							return true;
						}
					})) {
						window.location = uriTemplate.expand({resource: evt.newInput});
					}
				});
			}.bind(this));
		}.bind(this));
		this.sidebarNavInputManager.addEventListener("fileDoubleClicked", function(evt) { //$NON-NLS-0$
			this.activeEditorViewer.tabWidget.potentialTransientHref = evt.href;
			this.activeEditorViewer.tabWidget.transientToPermanent(evt.href);
		}.bind(this));
		this.sidebarNavInputManager.addEventListener("create", function(evt) { //$NON-NLS-0$
			if (evt.newValue && !evt.ignoreRedirect) {
				window.location = urlModifier(this.computeNavigationHref(evt.newValue));
			}
		}.bind(this));
	},

	/**
	 * @description Creates a URL ref from the give location and options to be opened by the browser
	 * @function
	 * @param {Object} item The file metadata object which has at least a <code>Location</code> property
	 * @param {Object} options The map of options
	 * @returns {String} The computed URL to navigate to
	 * @since 9.0
	 */
	computeNavigationHref: function(item, options) {
		var openWithCommand = mExtensionCommands.getOpenWithCommand(this.commandRegistry, item);
		if (openWithCommand && typeof openWithCommand.hrefCallback === 'function') {
			return openWithCommand.hrefCallback({items: objects.mixin({}, item, {params: options})});
		}
		if(options) {
			return uriTemplate.expand({resource: item.Location, params: options});
		}
		return uriTemplate.expand({resource: item.Location});
	},

	/**
	 * @description Opens the given location
	 * @function
	 * @param {String} fileurl The URL to open
	 * @param {Object} options The map of options. 
	 * 
	 * Current set of understood options include:
	 *   start - (number) The start range to select when opening an editor
	 *   end - (number) The end range to select when opening an editor
	 *   mode - (string) Determines where the new file should open:
	 * 			'replace': replaces the current editor's content
	 * 			    'tab': opens the file in a new tab
	 * 			  'split': Splits the editor (if needed) and shows the new content in the non-active editor
	 *   name - (string) Name used to determine the default editor to be used.
	 *   forcePermanent - (boolean) If specified, and editor tabs are enabled, the newly created tab will be specified as non-transient.
	 * splitHint - (string) If the mode is 'split' and the editor has not yet been split this determines the
	 *             initial splitter mode. Can be one of 'horizontal', 'vertical' or 'picInPic'.
	 * 
	 * @since 9.0
	 */
	openEditor: function(loc, options) {
		var href = this.computeNavigationHref({Location: loc}, {start: options.start, end: options.end, line: options.line, offset: options.offset, length: options.length});
		var openEditorPromise = new Deferred();

		if (!href) {
			openEditorPromise.resolve();
			return openEditorPromise;
		}

			
		var mode = typeof(options.mode) === 'string' ? options.mode : 'replace'; //$NON-NLS-1$
		switch (mode) {
			case 'replace':
				var editorView = this.activeEditorViewer.getCurrentEditorView();
				if (editorView && editorView.editor) {
					var sel = editorView.editor.getSelection();
					var currentHref = this.computeNavigationHref({Location: this.activeEditorViewer.inputManager.getInput()}, {start: sel.start, end: sel.end});
					history.pushState({}, "", currentHref);
					this.lastHash = PageUtil.hash(); // Pushing to the history stack changes the hash
				}

				var inputManager = this.activeEditorViewer.inputManager;
				var activeEditorViewer = this.activeEditorViewer;
				var inputChangeListener = function() {
					inputManager.removeEventListener("InputChanged", inputChangeListener);
					if (options.forcePermanent) {
						activeEditorViewer.tabWidget.potentialTransientHref = href;
						activeEditorViewer.tabWidget.transientToPermanent(href);
					}
					openEditorPromise.resolve();
				};
				inputManager.addEventListener("InputChanged", inputChangeListener);

				var hash = href.split('#')[1];
				if (hash === window.location.hash.substring(1)) {
					this.activeEditorViewer.inputManager.setInput(hash);
				} else {
					window.location = urlModifier(href);
				}
				break;
			case 'tab':
				window.open(urlModifier(href));
				openEditorPromise.resolve();
				break;
			case 'split':
				var locWithParams = href.split('#')[1];
				if (!this.splitterMode || this.splitterMode === MODE_SINGLE) {
					var splitHint = typeof(options.splitHint) === 'string' ? options.splitHint : 'vertical'; //$NON-NLS-1$
					if (splitHint === 'horizontal') 
						this.setSplitterMode(MODE_HORIZONTAL, locWithParams);
					else if (splitHint === 'vertical') 
						this.setSplitterMode(MODE_VERTICAL, locWithParams);
					else if (splitHint === 'picInPic') 
						this.setSplitterMode(MODE_PIP, locWithParams);
				} else {
					this.editorViewers[1].inputManager.setInput(locWithParams);
				}
				openEditorPromise.resolve();
				break;
		}
		return openEditorPromise;
	},
	
	createEditorViewer: function(id) {
		var editorViewer = new EditorViewer({
			id: id,
			parent: this.editorDomNode,
			activateContext: this,
			modelPool: this.modelPool,
			menuBar: this.menuBar,
			serviceRegistry: this.serviceRegistry,
			pluginRegistry: this.pluginRegistry,
			commandRegistry: this.commandRegistry,
			contentTypeRegistry: this.contentTypeRegistry,
			editorCommands: this.editorCommands,
			renderToolbars: this.renderToolbars.bind(this),
			readonly: this.readonly,
			preferences: this.preferences,
			generalPreferences: this.generalPreferences,
			searcher: this.searcher,
			selection: this.selection,
			fileClient: this.fileClient,
			statusService: this.statusService,
			progressService: this.progressService,
			sidebar:this.sidebar
		});
		editorViewer.create();
		return editorViewer;
	},
	
	createSplitters: function(mode) {
		//TODO create as many splitters as necessary given the number of editors viewers.
		// Note that depending on the number of viewers it may be necessary to create intermediate parents
		if (this.editorSplitter) return;
		if (mode === MODE_SINGLE) return;
		
		var splitterDiv = document.createElement("div"); //$NON-NLS-0$
		splitterDiv.id = "editorSplitter"; //$NON-NLS-0$
		this.editorDomNode.appendChild(splitterDiv);
		
		var splitter = this.editorSplitter = new mSplitter.Splitter({
			node: splitterDiv,
			sidePanel: this.editorViewers[0].domNode,
			mainPanel: this.editorViewers[1].domNode,
			toggle: false,
			proportional: true,
			vertical: true,
			closeByDefault: false
		});
		splitter.addEventListener("resize", function (evt) { //$NON-NLS-0$
			this.editorViewers.forEach(function(viewer) {
				if (viewer.domNode === evt.node) {
					viewer.editorView.editor.resize();
				}
			});
		}.bind(this));
	},
	
	setInput: function(hash) {
		if (this.lastHash === hash) return;
		this.lastHash = hash;
		this.activeEditorViewer.setInput(hash);
		this.sidebarNavInputManager.processHash(hash);
	},
	
	load: function() {
		var lastEditedFile = sessionStorage.lastFile;
		var currentHash = PageUtil.hash();

		// If loading split panes, check to see if the second pane is loading window hash
		// and set input accordingly.
		if (this.editorViewers.length > 1) {
			var openFile = this.editorViewers[1].tabWidget.selectedFile.metadata.Location;
			if (openFile && currentHash === "" || currentHash.lastIndexOf(openFile, 1 ) === 1) {
				var editorHref = this.editorViewers[0].tabWidget.selectedFile.href;
				currentHash = "#" + editorHref.split("#")[1];
				lastEditedFile = null;
			}
		}
		if (lastEditedFile && lastEditedFile.lastIndexOf(currentHash, 0) === 0 && lastEditedFile !== currentHash) {
			// If the project didn't change, preserve resource parameters
			window.location.hash = currentHash = lastEditedFile;
		}
		this.setInput(currentHash);
		window.addEventListener("hashchange", function() { //$NON-NLS-0$
			this.setInput(PageUtil.hash());
		}.bind(this));
		window.onbeforeunload = function() {
			var dirty, autoSave;
			this.editorViewers.forEach(function(viewer) {
				var editor = viewer.editor;
				if (editor && editor.isDirty()) {
					dirty = true;
					if (viewer.inputManager.getAutoSaveEnabled()) {
						viewer.inputManager.save();
						autoSave = true;
					}
				}
			});
			var unsavedMessage = dirty ? (autoSave ? messages.unsavedAutoSaveChanges : messages.unsavedChanges) : undefined;
			if(util.isElectron && dirty){
				window.__electron.remote.dialog.showMessageBox(
					window.__electron.remote.getCurrentWindow(),
					{
						type: 'warning',
						buttons: [messages["OK"]],
						title: messages["Orion"],
						message: unsavedMessage
					});
			}
			return unsavedMessage;
		}.bind(this);
	},

	renderToolbars: function(metadata) {
		metadata = metadata || this.activeEditorViewer.inputManager.getFileMetadata();
		var menuBar = this.menuBar;
		var commandRegistry = this.commandRegistry;
		var editor = this.activeEditorViewer.editor;
		menuBar.updateCommands();
		["pageActions", "pageNavigationActions", "settingsActions"].forEach(function(id) { //$NON-NLS-2$ //$NON-NLS-1$ //$NON-NLS-0$ //$NON-NLS-3$
			var toolbar = lib.node(id);
			if (toolbar) {
				commandRegistry.destroy(toolbar);
				if (metadata) {
					commandRegistry.renderCommands(toolbar.id, toolbar, metadata, editor, "tool"); //$NON-NLS-0$
				}
			}
		});
	},
	
	setActiveEditorViewer: function(editorViewer) {
		var oldEditorViewer = this.activeEditorViewer;
		
		this.activeEditorViewer = editorViewer;
		
		this.menuBar.setActiveEditorViewer(editorViewer);
		
		var metadata = editorViewer.inputManager.getFileMetadata();
		
		if (oldEditorViewer !== editorViewer || this.lastTarget !== metadata) {
			this.renderToolbars(metadata);
		}
		
		this.setPageTarget(metadata);
	},
	
	setPageTarget: function (metadata) {
		if (this.lastTarget && metadata && this.lastTarget.Location === metadata.Location) return;
		this.lastTarget = metadata;
		
		var editorViewer = this.activeEditorViewer;
		var target = metadata, targetName;
		if (!target) { //evt.input === null || evt.input === undefined) {
			targetName = this.lastRoot ? this.lastRoot.Name : "";
			target = this.lastRoot;
		} else if (!util.isElectron && target && !target.Parents) {//If the target is file system root then we use the file service name
			targetName = this.fileClient.fileServiceName(target.Location);
		} else {
			targetName = target.Name;
		}
		// Exclude the "Show current folder" command: it's useless on editor page with built-in nav.
		// TODO the command exclusions should be an API and specified by individual pages (page links)?
		mGlobalCommands.setPageCommandExclusions(["orion.editFromMetadata"]); //$NON-NLS-0$
		mGlobalCommands.setPageTarget({
			task: messages["Editor"],
			name: targetName,
			target: target,
			makeAlternate: function() {
				if (metadata && metadata.parent) {
					return metadata.parent;
				} else if (metadata && metadata.Parents && metadata.Parents.length > 0) {
					if (metadata.Parents[0].Children) {
						return metadata.Parents[0];
					}
					// The mini-nav in sidebar wants to do the same work, can we share it?
					return this.progressService.progress(this.fileClient.read(metadata.Parents[0].Location, true), i18nUtil.formatMessage(messages.ReadingMetadata, metadata.Parents[0].Location));
				}
			}.bind(this),
			serviceRegistry: this.serviceRegistry,
			commandService: this.commandRegistry,
			searchService: this.searcher,
			fileService: this.fileClient
		});
		var editor = editorViewer.editor;
		if (editor) {
			mGlobalCommands.setDirtyIndicator(editor.isDirty());
		}
		if (metadata) {
			var params = PageUtil.matchResourceParameters(editorViewer.inputManager.getLocation());
			delete params.resource;
			window.location = uriTemplate.expand({resource: target.Location, params: params});
			this.lastHash = PageUtil.hash();
			this.editorInputManager.setInputManager(editorViewer.inputManager);
			this.editorInputManager.dispatchEvent({
				type: "InputChanged", //$NON-NLS-0$
				contentType: this.editorInputManager.getContentType(),
				metadata: metadata,
				editor: editor,
				location: window.location
			});
		}
	},

	setSplitterMode: function(mode, href) {
		var oldSplitterMode = this.splitterMode;
		if (this.splitterMode === mode) return;
		this.splitterMode = mode;
		
		if (mode !== MODE_SINGLE && this.editorViewers.length < 2) {
			this.editorViewers.push(this.createEditorViewer(this.editorViewers.length + "")); //$NON-NLS-0$
		}
		this.createSplitters(mode);
		
		var mainEditorViewerNode = this.editorViewers[0].domNode;
		mainEditorViewerNode.style.width = mainEditorViewerNode.style.height = "100%"; //$NON-NLS-0$

		var splitEditorViewerNode, splitterNode;
		if (this.editorViewers. length > 1) {
			splitEditorViewerNode = this.editorViewers[1].domNode;
			splitterNode = this.editorSplitter.$splitter;
			splitEditorViewerNode.classList.remove("editorViewerPicInPic"); //$NON-NLS-0$
			splitEditorViewerNode.style.display = "block"; //$NON-NLS-0$
			splitEditorViewerNode.style.width = splitEditorViewerNode.style.height = "100%"; //$NON-NLS-0$
			["top", "left", "right", "bottom", "width", "height"].forEach(function(p) { //$NON-NLS-5$ //$NON-NLS-4$ //$NON-NLS-3$ //$NON-NLS-2$ //$NON-NLS-1$ //$NON-NLS-6$
				splitEditorViewerNode.style[p] = ""; //$NON-NLS-0$
			});
			splitterNode.style.display = "block"; //$NON-NLS-0$
		}
		
		switch(mode){
			
			case MODE_PIP:
				splitterNode.style.display = "none"; //$NON-NLS-0$
				splitEditorViewerNode.classList.add("editorViewerPicInPic"); //$NON-NLS-0$
				break;
				
			case MODE_SINGLE:
				if (splitterNode) {
					splitterNode.style.display = "none"; //$NON-NLS-0$
				}
				if (splitEditorViewerNode) {
					splitEditorViewerNode.style.display = "none"; //$NON-NLS-0$
				}
				this.setActiveEditorViewer(this.editorViewers[0]);
				break;
				
			case MODE_HORIZONTAL:
				this.editorSplitter.setOrientation(mSplitter.ORIENTATION_VERTICAL, true);
				break;
			
			case MODE_VERTICAL:
				this.editorSplitter.setOrientation(mSplitter.ORIENTATION_HORIZONTAL, true);
				break;
		}
		
		this.editorViewers.forEach(function(viewer) {
			viewer.editorView.editor.resize();
		});
		
		if (oldSplitterMode === MODE_SINGLE && mode !== MODE_SINGLE) {
			this.lastTarget = null;
			this.editorViewers[1].shown = true;
			if (this.editorViewers[1].tabWidget.fileList.length > 0) {
				var selectedFile = this.editorViewers[1].tabWidget.selectedFile;
				if (selectedFile) {
					var params = PageUtil.matchResourceParameters(selectedFile.href);
					delete params.resource;
					href = uriTemplate.expand({resource: selectedFile.metadata.Location, params: params});
				}
			}
			if (href) {
				this.editorViewers[1].inputManager.setInput(href);
			} else {
				this.editorViewers[1].inputManager.setInput(PageUtil.hash());
			}
		} else if (oldSplitterMode !== undefined && oldSplitterMode !== MODE_SINGLE && mode === MODE_SINGLE) {
			var metadata = this.editorViewers[1].inputManager.getFileMetadata();
			var rootLocation = metadata.WorkspaceLocation || this.fileClient.fileServiceRootURL(metadata.Location);
			this.editorViewers[1].shown = false;
			var editorTabsEnabled = this.generalPreferences && this.generalPreferences.enableEditorTabs;
			if (!editorTabsEnabled) {
				this.editorViewers[1].inputManager.setInput(rootLocation);
			}
		}
		sessionStorage.splitterSelection = mode;
	},
	createSplitMenu: function() {
		var that = this;
		var currentChoice;
		var toolbar = "settingsActions"; //$NON-NLS-1$
		var changeSplitModeCommand;
		function callback() {
			this.checked = true;
			currentChoice.checked = false;
			currentChoice = this;
			changeSplitModeCommand.imageClass = this.imageClass;
			changeSplitModeCommand.name = this.name;
			that.setSplitterMode(this.mode);
			that.commandRegistry.destroy(toolbar);
			that.commandRegistry.renderCommands(toolbar, toolbar, that, that, "button"); //$NON-NLS-0$
		}
		var choices = this.splitMenuChoices = [
			{name: messages["SplitSinglePage"], mode: MODE_SINGLE, imageClass: "core-sprite-page", checked: true, callback: callback}, //$NON-NLS-0$
			{name: messages["SplitVertical"], mode: MODE_VERTICAL, imageClass: "core-sprite-vertical", callback: callback}, //$NON-NLS-0$
			{name: messages["SplitHorizontal"], mode: MODE_HORIZONTAL, imageClass: "core-sprite-horizontal", callback: callback}, //$NON-NLS-0$
			{name: messages["SplitPipInPip"], mode: MODE_PIP, imageClass: "core-sprite-pip", callback: callback}, //$NON-NLS-0$
		];
		currentChoice = choices[0];
		changeSplitModeCommand = new mCommands.Command({
			imageClass: currentChoice.imageClass,
			selectionClass: "dropdownSelection", //$NON-NLS-0$
			name: currentChoice.name,
			tooltip: messages["SplitModeTooltip"],
			id: "orion.edit.splitmode", //$NON-NLS-0$
			visibleWhen: function() {
				return true;
			},
			choiceCallback: function() {
				return choices;
			}
		});
		this.commandRegistry.addCommand(changeSplitModeCommand);
		this.commandRegistry.registerCommandContribution(toolbar, "orion.edit.splitmode", 0); //$NON-NLS-1$ //$NON-NLS-0$
	}
});

/**
 * Provides hover evaluation by project
 * @name orion.projects.HoverEvaluationService
 * @param {orion.serviceregistry.ServiceRegistry} serviceRegistry
 * @param {EditorSetup} setup - need this to get the current project
 */
var HoverEvaluationService = function(serviceRegistry, setup) {
	this._setup = setup;
	this._projectClient = serviceRegistry.getService("orion.project.client");
	serviceRegistry.registerService("orion.edit.hover", this, {
		name: 'Hover Evaluation',
		contentType: ["application/javascript", "text/x-c++src", "text/x-python"] // TODO: get by sub-services
	});
};

objects.mixin(HoverEvaluationService.prototype, /** @lends orion.projects.HoverEvaluationService.prototype */ {
		/**
		 * Evaluate the hover
		 * @param {Object} editorContext
		 * @param {Object} ctxt
		 * @return {Promise.<string>}
		 */
	computeHoverInfo: function(editorContext, ctxt) {
		var promise = new Deferred();
		var launchConf = this._setup.runBar.getSelectedLaunchConfiguration();
		if (launchConf) {
			this._projectClient.getProjectDeployService(launchConf.ServiceId, launchConf.Type).then(function(service){
				if (service && service.computeHoverInfo) {
					service.computeHoverInfo(launchConf, editorContext, ctxt).then(function(value) {
						promise.resolve(value);
					}, function() {
						promise.resolve(null);
					});
				} else {
					console.error('Failed to evaluate hover.');
					promise.resolve(null);
				}
			});
		} else {
			promise.resolve(null);
		}
		return promise;
	}
});

var setup;
exports.getEditorViewers = function() {
	if (!setup) return [];
	return setup.editorViewers;
};

exports.setUpEditor = function(serviceRegistry, pluginRegistry, preferences, readonly) {
	enableSplitEditor = util.readSetting("enableSplitEditor") !== "false"; //$NON-NLS-0$
	
	setup = new EditorSetup(serviceRegistry, pluginRegistry, preferences, readonly);
	Deferred.when(setup.createBanner(), function(result) {
		if (result && result.navSelection) {
			//TODO find a better way to give the selection to the navigator
			sessionStorage.navSelection = JSON.stringify(result.navSelection);
		}
		setup.getGeneralPreferences().then(function() {
			setup.createMenuBar().then(function() {
				setup.createSideBar();
				setup.createRunBar().then(function() {
					setup.editorViewers.push(setup.createEditorViewer());
					setup.setActiveEditorViewer(setup.editorViewers[0]);
					if (enableSplitEditor) {
						setup.createSplitMenu();
//						var mode = Number(sessionStorage.splitterSelection) || MODE_SINGLE;
//						setup.splitterMode = MODE_SINGLE;
//						setup.splitMenuChoices[mode].callback();
						setup.setSplitterMode(MODE_SINGLE);
					}
					setup.load();
				});
			});
		});
	});
};
return exports;
});
