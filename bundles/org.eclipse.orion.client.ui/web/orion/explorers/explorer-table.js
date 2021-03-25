/*******************************************************************************
 * @license
 * Copyright (c) 2009, 2017 IBM Corporation and others.
 * All rights reserved. This program and the accompanying materials are made
 * available under the terms of the Eclipse Public License 2.0
 * (http://www.eclipse.org/legal/epl-v10.html), and the Eclipse Distribution
 * License v1.0 (http://www.eclipse.org/org/documents/edl-v10.html).
 *
 * Contributors: 
 *     IBM Corporation - initial API and implementation
 *     Casey Flynn - Google Inc.
 ******************************************************************************/

/*eslint-env browser, amd*/
define([
	'i18n!orion/navigate/nls/messages',
	'orion/Deferred',
	'orion/webui/littlelib',
	'orion/i18nUtil',
	'orion/fileUtils',
	'orion/explorers/explorer',
	'orion/EventTarget',
	'orion/objects',
	'orion/util',
	'orion/generalPreferences',
	'orion/urlModifier',
	'orion/metrics'
], function(messages, Deferred, lib, i18nUtil, mFileUtils, mExplorer, EventTarget, objects, util, mGeneralPrefs, urlModifier, mMetrics) {

	var generalPreferences;
	
	/**
	 * Tree model used by the FileExplorer
	 * @param {?} serviceRegistry The backing registry
	 * @param {?} root The root item for the model
	 * @param {FileClient} fileClient The backing FileClient instance
	 * @param {string} idPrefix The prefix to  use for the new model nodes
	 * @param {boolean} excludeFiles The optional flag for if files should be left out of the model
	 * @param {boolean} excludeFolders The optional flag for if folders should be left out of the model
	 * @param {?} filteredResources The optional map of names to be left out of the model (filtered)
	 */
	function FileModel(serviceRegistry, root, fileClient, idPrefix, excludeFiles, excludeFolders, filteredResources) {
		this.registry = serviceRegistry;
		this.root = root;
		this.fileClient = fileClient;
		this.idPrefix = idPrefix || "";
		if (typeof this.idPrefix !== "string") {
			this.idPrefix = this.idPrefix.id;
		}
		this.excludeFiles = Boolean(excludeFiles);
		this.excludeFolders = Boolean(excludeFolders);
		if(!this.filteredResources) {
			//is set from project nav not via arguments
			this.filteredResources = filteredResources;
		}
		this.filter = new FileFilter(this.filteredResources);
		this._annotations = [];
		// Listen to annotation changed events
		this._annotationChangedHandler = this._handleAnnotationChanged.bind(this)
		this.fileClient.addEventListener('AnnotationChanged', this._annotationChangedHandler);
	}
	FileModel.prototype = new mExplorer.ExplorerModel();
	objects.mixin(FileModel.prototype, /** @lends orion.explorer.FileModel.prototype */ {
		destroy: function () {
			this.fileClient.removeEventListener("AnnotationChanged", this._annotationChangedHandler);
			mExplorer.ExplorerModel.prototype.destroy.call(this);
		},

		getRoot: function(onItem){
			onItem(this.root);
		},

		/*
		 *	Process the parent and children, doing any filtering or sorting that may be necessary.
		 */
		processParent: function(parentItem, children) {
			// Note that the Parents property is not available for metadatas retrieved with fetchChildren().
			var parents = parentItem.Projects ? [] : [parentItem].concat(parentItem.Parents || []);
			if (this.excludeFiles || this.excludeFolders || this.filteredResources) {
				var filtered = [];
				children.forEach(function(child) {
					var exclude = child.Directory ? this.excludeFolders : this.excludeFiles;
					if(this.filteredResources && this.filter) {
						exclude = exclude || this.filter.isFiltered(child.Name);
					}
					if (!exclude) {
						filtered.push(child);
						child.parent = parentItem;
						if (!child.Parents) {
							child.Parents = parents;
						}
					}
				}.bind(this));
				children = filtered;
			} else {
				children.forEach(function(child) {
					child.parent = parentItem;
					if (!child.Parents) {
						child.Parents = parents;
					}
				});
			}

			//link the parent and children together
			parentItem.children = children;

			// not ideal, but for now, sort here so it's done in one place.
			// this should really be something pluggable that the UI defines
			parentItem.children.sort(this.sortChildren);
			return children;
		},

		sortChildren: function(a, b) {
			var isDir1 = a.Directory;
			var isDir2 = b.Directory;
			if (isDir1 !== isDir2) {
				return isDir1 ? -1 : 1;
			}
			var n1 = a.Name && a.Name.toLowerCase();
			var n2 = b.Name && b.Name.toLowerCase();
			if (n1 < n2) {
				return -1;
			}
			if (n1 > n2) {
				return 1;
			}
			return 0;
		},

		getChildren: function(parentItem, /* function(items) */ onComplete) {
			// the parent already has the children fetched
			if (parentItem.children) {
				onComplete(parentItem.children);
			} else if (parentItem.Directory !== undefined && parentItem.Directory === false) {
				onComplete([]);
			} else if (parentItem.Children) {
				onComplete(this.processParent(parentItem, parentItem.Children));
			} else if (parentItem.Location) {
				var progress = null;
				if (this.registry) {
					progress = this.registry.getService("orion.page.progress"); //$NON-NLS-0$
				}
				(progress ? progress.progress(this.fileClient.fetchChildren(parentItem.ChildrenLocation), messages["Fetching children of "] + parentItem.Name) : this.fileClient.fetchChildren(parentItem.ChildrenLocation)).then(
					function(children) {
						if (this.destroyed) {
							return;
						}
						onComplete(this.processParent(parentItem, children));
					}.bind(this),
					function() {
						onComplete([]);
					}
				);
			} else {
				onComplete([]);
			}
		},

		hasChildren: function() {
			var result = false;
			if (this.root.Children) {
				result = this.root.Children.length > 0;
			}
			return result;
		},

		getAnnotations: function() {
			return this._annotations;
		},

		_handleAnnotationChanged: function(evt) {
			var model = this;
			if (evt.removeTypes) {
				for (var i = this._annotations.length - 1; i >= 0; i--) {
					for (var j = 0; j < evt.removeTypes.length; j++) {
						if (this._annotations[i] instanceof evt.removeTypes[j]) {
							this._annotations.splice(i, 1);
							break;
						}
					}
				}
			}
			evt.annotations.forEach(function(annotation) {
				model._annotations.push(annotation);
			});
		}
	});

	FileModel.prototype.constructor = FileModel;

	/**
	 * String matcher used by FileModel
	 * @param {string[]} filteredResources - file names or patterns to filter, where a pattern may contain:
	 * 										 	* to match one or more characters in a path segment
	 * 											? to match on one character in a path segment
	 */
	function FileFilter(filteredResources) {
		this._fileRegex = [];
		this._fileLookup = {};
		this._create(filteredResources);
	}
	
	objects.mixin(FileFilter.prototype, /** @lends orion.explorer.FileFilter.prototype */ {
		_create: function(filteredResources) {
			if (filteredResources) {
				Object.keys(filteredResources).forEach(function(resourceName) {
					if (this._isExpression(resourceName)) {
						this._fileRegex.push(this._buildExpression(resourceName));
					} else {
						this._fileLookup[resourceName] = true;
					}
				}.bind(this));
			}
		},
		_isExpression: function(fileFilter) {
			if (fileFilter) {
				return (fileFilter.indexOf("*") > -1) || (fileFilter.indexOf("?") > -1);
			}
			return false;
		},
		_buildExpression: function(fileFilter) {
			// Escape all regular expression characters except for * and .
			var escaped = fileFilter.replace(/[\-\[\]\/\{\}\(\)\+\.\\\^\$\|\,\#]/g, "\\$&");
			// Replace * with .*
			escaped = escaped.replace(/\*/g, ".+");
			// Replace ? with .
			escaped = escaped.replace(/\?/g, ".");
			// Add ^ and $ to the string
			return new RegExp("^" + escaped + "$");
		},
		_isFilteredByRegex: function(fileName) {
			for (var i=0; i<this._fileRegex.length; i++) {
				if (this._fileRegex[i].test(fileName)) {
					return true;
				}
			}
			return false;
		},
		isFiltered: function(fileName) {
			if (this._fileLookup.hasOwnProperty(fileName)) {
				return true;
			}
			return this._isFilteredByRegex(fileName);
		}
	});


	/**
	 * Creates a new file explorer.
	 * @name orion.explorer.FileExplorer
	 * @class A user interface component that displays a table-oriented file explorer
	 * @extends orion.explorer.Explorer
	 *
	 * @param {Object} options.treeRoot an Object representing the root of the tree.
	 * @param {orion.selection.Selection} options.selection the selection service used to track selections.
	 * @param {orion.fileClient.FileClient} options.fileClient the file service used to retrieve file information
	 * @param {String|Element} options.parentId the id of the parent DOM element, or the parent DOM element itself.
	 * @param {Function} options.rendererFactory a factory that creates a renderer
	 * @param {Boolean} options.excludeFiles specifies that files should not be shown. Optional.
	 * @param {Boolean} options.excludeFolders specifies that folders should not be shown.  Optional.
	 * @param {Object} [options.navHandlerFactory] Optional factory to use for creating the explorer's nav handler. Must provide a function
	 * <code>createNavHandler(explorer, explorerNavDict, options)</code>.
	 * @param {orion.serviceregistry.ServiceRegistry} options.serviceRegistry  the service registry to use for retrieving other
	 *	Orion services.  Optional.  If not specified, then some features of the explorer will not be enabled, such as status reporting,
	 *  honoring preference settings, etc.
	 * @param {Boolean} [options.setFocus=true] Whether the explorer should steal keyboard focus when rendered. The default is to steal focus.
	 */
	/**
	 * Root model item of the tree.
	 * @name orion.explorer.FileExplorer#treeRoot
	 * @field
	 * @type Object
	 */
	/**
	 * Dispatches events describing model changes.
	 * @name orion.explorer.FileExplorer#modelEventDispatcher
	 * @type orion.EventTarget
	 */
	/**
	 * Handles model changes.
	 * @name orion.explorer.FileExplorer#modelHandler
	 * @type orion.explorer.FileExplorer.ModelHandler
	 */
	function FileExplorer(options) {
		EventTarget.attach(this);
		this.registry = options.serviceRegistry;
		if(this.registry) {
			this.preferences = this.registry.getService('orion.core.preference');
		}
		if(this.preferences) {
			this.generalPrefs = new mGeneralPrefs.GeneralPreferences(this.preferences);
		}
		this.treeRoot = options.treeRoot;
		this.selection = options.selection;
		this.fileClient = options.fileClient;
		this.excludeFiles = options.excludeFiles;
		this.excludeFolders = options.excludeFolders;
		this.navHandlerFactory = options.navHandlerFactory;
		this.parentId = options.parentId;
		this.renderer = options.rendererFactory(this);
		this.dragAndDrop = options.dragAndDrop;
		this.setFocus = options.setFocus;
		this.role = options.role || "treegrid";
		this.name = options.name;
		this.model = null;
		this.myTree = null;
		this.checkbox = false;
		this._hookedDrag = false;
		this.filteredResources = options.filteredResources;
		this._annotations = [];
		var modelEventDispatcher = options.modelEventDispatcher ? options.modelEventDispatcher : new EventTarget();
		this.modelEventDispatcher = modelEventDispatcher;
		// Listen to all resource changed events
		this.fileClient.addEventListener("Changed", this._resourceChangedHandler = this.handleResourceChange.bind(this));
		// Listen to annotation changed events
		this.fileClient.addEventListener('AnnotationChanged', this._annotationChangedHandler = this._handleAnnotationChanged.bind(this));
		// Listen to model changes from fileCommands
		var _self = this;
		this._modelListeners = {};
		//We still need to listen to the "create project" events.
		//Refer to projectCommnads.js for details on how special UI model calculation is done for the event.
		["create"].forEach(function(eventType) { //$NON-NLS-1$//$NON-NLS-0$
			modelEventDispatcher.addEventListener(eventType, _self._modelListeners[eventType] = _self.modelHandler[eventType].bind(_self));
		});

		var parentNode = lib.node(this.parentId);
		this._clickListener = function(evt) {
			if (!(evt.metaKey || evt.altKey || evt.shiftKey || evt.ctrlKey)) {
				var navHandler = _self.getNavHandler();
				if (navHandler && navHandler.getSelectionPolicy() !== "cursorOnly") {
					var temp = evt.target;
					while (temp && temp !== parentNode) {
						if (temp._item) {
							break;
						}
						temp = temp.parentNode;
					}
					if (temp && temp._item) {
						var link = lib.$("a", evt.target);
						if (link) {
							if (evt.type === "click") {
								window.location.href = urlModifier(link.href);
								//_self._clickLink(link);
							} else if (evt.type === "dblclick") {
								this.isEditorTabsEnabled().then(function(editorTabsEnabled) {
									if(editorTabsEnabled){
										var target = evt.target || evt.srcElement;
										var href = target.querySelector("a").href;
										this.dispatchEvent({
											type: "fileDoubleClicked",
											href: href
										});
									}else{
										this.isDesktopSelectionMode().then(function(desktopMode){
											if(desktopMode){
												this.handleLinkDoubleClick(link, evt);
											}
										}.bind(this));
									}
								}.bind(this));
							}
						}
					}
				}
			}
		};
		if (parentNode) {
			parentNode.addEventListener("click", this._clickListener.bind(this));
			parentNode.addEventListener("dblclick", this._clickListener.bind(this));
		}
		
		// Set general preferences
		if(this.generalPrefs) {
			this.generalPrefs.getPrefs().then(function(generalPrefs) {
				generalPreferences = generalPrefs;
			});
		}
	}
	
	var dragStartTarget, dropEffect;

	FileExplorer.prototype = Object.create(mExplorer.Explorer.prototype);
	objects.mixin(FileExplorer.prototype, /** @lends orion.explorer.FileExplorer.prototype */ {
		destroy: function() {
			var _self = this;
			Object.keys(this._modelListeners).forEach(function(eventType) {
				_self.modelEventDispatcher.removeEventListener(eventType, _self._modelListeners[eventType]);
			});
			var parentNode = lib.node(this.parentId);
			if (parentNode) {
				parentNode.removeEventListener("click", this._clickListener);
			}
			this.fileClient.removeEventListener("Changed", this._resourceChangedHandler);
			this.fileClient.removeEventListener("AnnotationChanged", this._annotationChangedHandler);
			mExplorer.Explorer.prototype.destroy.call(this);
		},
		_isFileCreationAtRootEnabled : function() {
			if (generalPreferences && generalPreferences.hasOwnProperty("enableFileCreationAtRoot")) {
				return generalPreferences.enableFileCreationAtRoot;
			}
			return false;
		},
		_getUIModel: function(loc) {
			if (!this.model || !loc) {
				return null;
			}
			var elementNode;
			// Special case in electron, or when create file at root enabled.
			// Need to find the workspace element to create file at workspace level.
			if (this.treeRoot && loc === this.treeRoot.Location) {
				elementNode = this.treeRoot;
			} else if (loc === "/file") {
				if (util.isElectron || this._isFileCreationAtRootEnabled()) {
					elementNode = this.model.root;
				}
			} else {
				var elementId = this.model.getId({
					Location: loc
				});
				elementNode = lib.node(elementId) && lib.node(elementId)._item || null;
			}
			return elementNode;
		},
		handleResourceChange: function(evt) {
			if (!this.model) {
				return new Deferred().resolve();
			}
			if (evt && evt.deleted) {
				return this._handleResourceDelete(evt);
			}
			if (evt && (evt.moved || evt.copied)) {
				return this._handleResourceMoveOrCopy(evt);
			}
			if (evt && evt.created) {
				return this._handleResourceCreate(evt);
			}
			if (evt && evt.refresh) {
				return this._handleResourceRefresh(evt);
			}
			return new Deferred().resolve();
		},
		_handleResourceCreate: function(evt) {
			//Convert the item array( {parent, result} ) to an array of {newValue, oldValue, parent}
			var items = evt.created.map(function(createdItem) {
				return {
					type: "create",
					select: createdItem.eventData ? createdItem.eventData.select : false,
					newValue: createdItem.result,
					parent: this._getUIModel(createdItem.parent),
					silent: evt.silent
				};
			}.bind(this));
			return this.onModelCreate(items[0]).then(function( /*result*/ ) {
				return items[0];
			});
		},
		_handleResourceDelete: function(evt) {
			//Convert the location array( a string array) to an array of {newValue, oldValue, parent}
			var items = evt.deleted.map(function(deletedItem) {
				var loc = deletedItem.eventData && deletedItem.eventData.itemLocation ? deletedItem.eventData.itemLocation : deletedItem.deleteLocation;
				var uiModel = this._getUIModel(loc);
				return {
					oldValue: uiModel,
					newValue: null,
					parent: uiModel ? uiModel.parent : null,
					silent: evt.silent
				};
			}.bind(this));
			var newEvent = {
				items: items
			};
			return this.onModelDelete(newEvent).then(function( /*result*/ ) {
				return items[0];
			});
		},
		_handleResourceRefresh: function(evt) {
			// Get previous selection to display after refresh.
			var selected = this.selection && this.selection.getSelection() ? this.selection.getSelection() : null;
			// If no item is selected, default to the item in the current window hash
			if (!selected) {
				selected = {Location: window.location.href.split("#")[1]};
			}
			var selectedItem = this._getUIModel(selected.Location);
			var promises = evt.refresh.map(function(refreshItem) {
				var item = refreshItem && refreshItem.Location ? refreshItem : this.model.root;
				return new Deferred().resolve(this.changedItem(item, item === this.model.root));
			}.bind(this));
			return Deferred.all(promises).then(function() {
				if (selectedItem) {
					this.reveal(selectedItem, true);
				}
			}.bind(this));
		},
		_handleResourceMoveOrCopy: function(evt) {
			//Convert the item array( {source, target, result} ) to an array of {newValue, oldValue, parent}
			var itemArray = evt.moved ? evt.moved : evt.copied;
			var items = itemArray.map(function(movedItem) {
				return {
					oldValue: this._getUIModel(movedItem.source),
					newValue: movedItem.result,
					parent: this._getUIModel(movedItem.target),
					silent: evt.silent
				};
			}.bind(this));
			var newEvent = {
				items: items
			};
			var moveOrCopy = evt.moved ? this.onModelMove.bind(this) : this.onModelCopy.bind(this);
			return moveOrCopy(newEvent).then(function( /*result*/ ) {
				return items[0];
			});
		},
		//		_clickLink: function(linkElement) {
		//			if (linkElement.tagName === "A") { //$NON-NLS-0$
		//				var temp = linkElement;
		//				while (temp) {
		//					if (temp._item) {
		//						break;
		//					}
		//					temp = temp.parentNode;
		//				}
		//				if (temp && temp._item) {
		//					this.onLinkClick({type: "linkClick", item: temp._item}); //$NON-NLS-0$
		//				}
		//			}
		//		},
		//		onLinkClick: function(clickEvent) {
		//			this.dispatchEvent(clickEvent);
		//		},

		_handleAnnotationChanged: function(evt) {
			if (this.myTree) {
				this.myTree.requestAnnotationRefresh();
			}
		},

		onModelCreate: function(modelEvent) {
			return this.changedItem(modelEvent.parent, !modelEvent.silent);
		},
		onModelCopy: function(modelEvent) {
			var ex = this,
				changedLocations = {};
			(modelEvent.items || [modelEvent]).forEach(function(item) {
				var itemParent = item.parent;
				itemParent = itemParent || ex.treeRoot;
				changedLocations[itemParent.Location] = itemParent;
			});
			return Deferred.all(Object.keys(changedLocations).map(function(loc) {
				return ex.changedItem(changedLocations[loc], !modelEvent.silent);
			}));
		},
		onModelMove: function(modelEvent) {
			var ex = this,
				changedLocations = {};
			(modelEvent.items || [modelEvent]).forEach(function(item) {
				var treeRoot = ex.treeRoot;
				if (item.oldValue && (treeRoot.Location || treeRoot.ContentLocation) === item.oldValue.Location) {
					// the treeRoot was moved
					var oldRoot = ex.treeRoot;
					var newItem = item.newValue;
					var realNewItem = newItem.ChildrenLocation ? newItem : this.fileClient.read(newItem.ContentLocation, true);
					return Deferred.when(realNewItem, function(newItem) {
						ex.dispatchEvent({
							type: "rootMoved",
							oldValue: oldRoot,
							newValue: newItem
						});
						ex.loadResourceList(newItem);
					});
				}
				var itemParent = item.oldValue ? item.oldValue.parent : null;
				if (itemParent) {
					changedLocations[itemParent.Location] = itemParent;
				}
				itemParent = item.parent;
				if (itemParent) {
					changedLocations[itemParent.Location] = itemParent;
				}

				// If the renamed item was an expanded directory, force an expand.
				if (item.oldValue && item.oldValue.Directory && item.newValue && ex.isExpanded(item.oldValue)) {
					changedLocations[item.newValue.Location] = item.newValue;
				}
			});
			return Deferred.all(Object.keys(changedLocations).map(function(loc) {
				return ex.changedItem(changedLocations[loc], !modelEvent.silent);
			}));
		},
		onModelDelete: function(modelEvent) {
			var items = modelEvent.items || [modelEvent];
			var ex = this,
				treeRoot = ex.treeRoot;
			var newRoot;
			var treeRootDeleted = items.some(function(item) {
				if (!item.oldValue) {
					return false;
				}
				if (item.oldValue.Location === (treeRoot.Location || treeRoot.ContentLocation)) {
					if (item.parent && item.oldValue.Location !== (item.parent.Location || item.parent.ContentLocation)) {
						newRoot = item.parent;
					}
					return true;
				}
				return false;
			});
			if (treeRootDeleted) {
				return this.loadResourceList(newRoot);
			}
			// Refresh every parent folder
			var changedLocations = {};
			items.forEach(function(item) {
				var parent = item.parent;
				if (parent) {
					changedLocations[parent.Location] = parent;
				}
			});
			return Deferred.all(Object.keys(changedLocations).map(function(loc) {
				return ex.changedItem(changedLocations[loc], !modelEvent.silent);
			}));
		},

		/**
		 * Handles model changes. Subclasses can override these methods to control how the FileExplorer reacts to various types of model changes.
		 * The default implementations generally just refresh the affected row(s) in the explorer.
		 * @name orion.explorer.FileExplorer.ModelHandler
		 * @class Handles model changes in a FileExplorer.
		 */
		modelHandler: /** @lends orion.explorer.FileExplorer.ModelHandler.prototype */ {
			copy: function(modelEvent) {
				if (modelEvent.count) {
					return; // Handled in copyMultiple
				}
				return this.onModelCopy(modelEvent);
			},
			copyMultiple: function(modelEvent) {
				return this.onModelCopy(modelEvent);
			},
			create: function(modelEvent) {
				// refresh the node
				modelEvent.select = true;
				return this.onModelCreate(modelEvent);
			},
			"delete": function(modelEvent) {
				if (modelEvent.count) {
					return; //Handled in deleteMultiple
				}
				return this.onModelDelete(modelEvent);
			},
			deleteMultiple: function(modelEvent) {
				return this.onModelDelete(modelEvent);
			},
			"import": function(modelEvent) {
				var target = modelEvent.target;
				return this.changedItem(target, true);
			},
			move: function(modelEvent) {
				if (modelEvent.count) {
					return; //Handled in moveMultiple
				}
				return this.onModelMove(modelEvent);
			},
			moveMultiple: function(modelEvent) {
				return this.onModelMove(modelEvent);
			}
		},

		/**
		 * @param {Object} parentItem The item in the model which represents the new item's parent
		 * @param {Object} child An object describing the child that a placeholder needs to be created for.
		 * 			child.Name {String} The name of the child artifact
		 * 			child.Directory {Boolean} true if the child is a directory, false otherwise
		 * @param {String} domId The prefix to use for the Id of the newly created DOM nodes
		 * @returns A deferred that resolves with the placeholder object (see explorer.js->makeNewItemPlaceholder())
		 */
		makeNewChildItemPlaceholder: function(parentItem, child, domId) {
			var deferred = new Deferred();

			this.model.getChildren(parentItem, function(children) {
				var item = null;
				var insertAfter = false;
				if (children) {
					if (!child.Location) {
						child.Location = parentItem.Location + child.Name + child.Directory ? "/" : "";
					}
					children.push(child);
					children.sort(this.model.sortChildren);
					var childIndex = children.indexOf(child);
					var nextIndex = childIndex + 1;
					if (children.length > nextIndex) {
						item = children[nextIndex];
					} else {
						var previousIndex = childIndex - 1;
						//should be placed last
						if (0 <= previousIndex) {
							item = children[previousIndex];
						} else {
							item = parentItem;
						}

						insertAfter = true;
					}
				} else {
					//place before parentItem
					item = parentItem;
				}

				var placeholder = this.makeNewItemPlaceholder(item, domId, insertAfter);
				deferred.resolve(placeholder);
			}.bind(this));

			return deferred;
		},

		_makeDropTarget: function(item, node, persistAndReplace) {
			var that = this;
			if (this.dragAndDrop) {
				var explorer = this;
				var performDrop = this.dragAndDrop;

				function findItemfromNode(target) {
					var tmp = target;
					var source;
					while (tmp) {
						if (tmp._item) {
							source = tmp._item;
							break;
						}
						tmp = tmp.parentNode;
					}
					return source;
				}

				var dragStart = function(evt) {
					var currentSelections = that.selection.getSelections();
					if(currentSelections.length > 1){
						dragStartTarget = currentSelections;
						var crt = this.cloneNode(true);
						crt.style.display = "none";
						evt.dataTransfer.setDragImage(crt, 0, 0);
						// For Electron Orion, export multiple selections using Electron APIs
					}else{
						dragStartTarget = evt.target;
						var source = findItemfromNode(dragStartTarget);
						if (source) {
							var exportName = source.Directory ? source.Name + ".zip" : source.Name;
							var downloadUrl = new URL(source.Directory ? (source.ExportLocation || source.Location) : source.Location, self.location.href).href;
							evt.dataTransfer.setData('DownloadURL', "application/zip,application/octet-stream:" + exportName + ":" + downloadUrl);
						}
 					}
				};

				if (persistAndReplace) {
					if (this._oldDragStart) {
						node.removeEventListener("dragstart", this._oldDragStart, false);
					}
					this._oldDragStart = dragStart;
				}
				node.addEventListener("dragstart", dragStart, false);


				var dragEnd = function(evt) {
					dragStartTarget = null;
				};
				if (persistAndReplace) {
					if (this._oldDragEnd) {
						node.removeEventListener("dragend", this._oldDragEnd, false);
					}
					this._oldDragEnd = dragEnd;
				}
				node.addEventListener("dragend", dragEnd, false);

				var dragLeave = function(evt) {
					node.classList.remove("dragOver"); //$NON-NLS-0$
					evt.preventDefault();
					evt.stopPropagation();
				};
				// if we are rehooking listeners on a node, unhook old before hooking and remembering new
				if (persistAndReplace) {
					if (this._oldDragLeave) {
						node.removeEventListener("dragleave", this._oldDragLeave, false);
					}
					this._oldDragLeave = dragLeave;
				}
				node.addEventListener("dragleave", dragLeave, false);

				var dragEnter = function(evt) {
					if (dragStartTarget) {
						var copy = util.isMac ? evt.altKey : evt.ctrlKey;
						dropEffect = evt.dataTransfer.dropEffect = copy ? "copy" : "move"; //$NON-NLS-1$ //$NON-NLS-0$
					} else {
						/* accessing dataTransfer.effectAllowed here throws an error on IE */
						if (!util.isIE && (evt.dataTransfer.effectAllowed === "all" ||
								evt.dataTransfer.effectAllowed === "uninitialized" ||
								evt.dataTransfer.effectAllowed.indexOf("copy") >= 0)) { //$NON-NLS-0$
							evt.dataTransfer.dropEffect = "copy"; //$NON-NLS-0$
						}
					}
					node.classList.add("dragOver"); //$NON-NLS-0$
					lib.stop(evt);
				};
				if (persistAndReplace) {
					if (this._oldDragEnter) {
						node.removeEventListener("dragenter", this._oldDragEnter, false);
					}
					this._oldDragEnter = dragEnter;
				}
				node.addEventListener("dragenter", dragEnter, false);

				// this listener is the same for any time, so we don't need to remove/rehook.
				var dragOver = function(evt) {
					if (dragStartTarget) {
						var copy = util.isMac ? evt.altKey : evt.ctrlKey;
						dropEffect = evt.dataTransfer.dropEffect = copy ? "copy" : "move"; //$NON-NLS-1$ //$NON-NLS-0$
					} else {
						// default behavior is to not trigger a drop, so we override the default
						// behavior in order to enable drop.
						// we have to specify "copy" again here, even though we did in dragEnter
						/* accessing dataTransfer.effectAllowed here throws an error on IE */
						if (!util.isIE && (evt.dataTransfer.effectAllowed === "all" ||
								evt.dataTransfer.effectAllowed === "uninitialized" ||
								evt.dataTransfer.effectAllowed.indexOf("copy") >= 0)) { //$NON-NLS-0$
							evt.dataTransfer.dropEffect = "copy"; //$NON-NLS-0$
						}
					}
					lib.stop(evt);
				};
				if (persistAndReplace && !this._oldDragOver) {
					node.addEventListener("dragover", dragOver, false);
					this._oldDragOver = dragOver;
				}

				var progress = null;
				var statusService = null;
				if (explorer.registry) {
					progress = explorer.registry.getService("orion.page.progress"); //$NON-NLS-0$
					statusService = explorer.registry.getService("orion.page.message"); //$NON-NLS-0$
				}

				var errorHandler = function(error) {
					if (statusService) {
						var errorMessage = null;
						if ("string" === typeof error) {
							errorMessage = {
								Severity: "Error",
								Message: error
							};
						} else if (error && error.error) {
							errorMessage = {
								Severity: "Error",
								Message: error.error
							};
						} else {
							errorMessage = error;
						}
						statusService.setProgressResult(errorMessage);
					} else {
						window.console.log(error);
					}
				};

				function dropFileEntry(entry, target, explorer, performDrop, fileClient, deferredWrapper) {
					var preventNotification = false;
					var targetIsRoot = mFileUtils.isAtRoot(target.Location);
					if (deferredWrapper) {
						//this is a recursive call
						preventNotification = true;
						deferredWrapper.entryCount++;
					} else if (entry.isDirectory) {
						preventNotification = true; //we don't want to notify for each item that is in the folder
						deferredWrapper = {
							entryCount: 1,
							deferred: new Deferred()
						};
						explorer._makeUploadNode(target, entry.name, true).then(function(uploadNodeContainer) {
							var cleanup = function() {
								uploadNodeContainer.destroyFunction();
								if (targetIsRoot) {
									explorer.loadResourceList(explorer.treeRoot.Path, true);
								} else {
									explorer.changedItem(target);
								}
							};
							deferredWrapper.deferred.then(cleanup, cleanup);
						});
					}

					var decrementEntryCount = function() {
						if (deferredWrapper) {
							deferredWrapper.entryCount--;
							if (0 === deferredWrapper.entryCount) {
								deferredWrapper.deferred.resolve();
							}
						}
					};

					var internalErrorHandler = function(error) {
						if (statusService) {
							var errorMessage = null;
							if ("string" === typeof error) {
								errorMessage = {
									Severity: "Error",
									Message: error
								};
							} else if (error && error.error) {
								errorMessage = {
									Severity: "Error",
									Message: error.error
								};
							} else {
								errorMessage = error;
							}
							statusService.setProgressResult(errorMessage);
						} else {
							window.console.log(error);
						}
						decrementEntryCount();
					};

					if (!target.Location && target.fileMetadata) {
						target = target.fileMetadata;
					}
					if (entry.isFile) {
						// can't drop files directly into workspace.
						if (targetIsRoot) {
							internalErrorHandler(messages["CreateFolderErr"]);
						} else {
							entry.file(function(file) {
								if (deferredWrapper) {
									// this is part of a folder upload, upload the file directly without showing
									// progress for it but call decrementEntryCount when the upload finishes
									var d = new Deferred();
									if(file.name.indexOf(".zip") === file.name.length - 4){
										var dialog = explorer.serviceRegistry.getService("orion.page.dialog");								
										dialog.confirm(i18nUtil.formatMessage(messages["Unzip ${0}?"], file.name), function(result){
											if(!result){
												result = false;
											}
											d.resolve(result);
										});	
									}else{
										d.resolve(false);
									}
									Deferred.when(d, function(unzip){
										performDrop(target, file, explorer, unzip, false, true).then(
											decrementEntryCount,
											function(error) {
												decrementEntryCount();
												var errorMessage = messages["UploadingFileErr"] + file.name;
												if (error && error.Message) {
													errorMessage += " [" + error.Message + "]";
												}
												if (statusService) {
													statusService.setProgressResult({
														Severity: "Error",
														Message: errorMessage
													});
												} else {
													window.console.log(errorMessage);
												}
											}
										);
									});
								} else {
									explorer._uploadFile(item, file, true);
								}
							}.bind(this));
						}
					} else if (entry.isDirectory) {
						var dirReader = entry.createReader();
						var traverseChildren = function(folder) {
							dirReader.readEntries(function(entries) {
								for (var i = 0; i < entries.length; i++) {
									dropFileEntry(entries[i], folder, explorer, performDrop, fileClient, deferredWrapper);
								}
								decrementEntryCount();
							});
						};

						if (targetIsRoot) {
							(progress ? progress.progress(fileClient.createProject(target.ChildrenLocation, entry.name), i18nUtil.formatMessage(messages["Creating ${0}"], entry.name)) :
								fileClient.createProject(target.ChildrenLocation, entry.name)).then(function(project) {
								(progress ? progress.progress(fileClient.read(project.ContentLocation, true), i18nUtil.formatMessage(messages["Loading ${0}"], project.name)) :
									fileClient.read(project.ContentLocation, true)).then(function(folder) {
									traverseChildren(folder);
								}, internalErrorHandler);
							}, internalErrorHandler);
						} else {
							(progress ? progress.progress(fileClient.createFolder(target.Location, entry.name), i18nUtil.formatMessage(messages["Creating ${0}"], entry.name)) :
								fileClient.createFolder(target.Location, entry.name)).then(function(subFolder) {
								var dispatcher = explorer.modelEventDispatcher;
								if (!preventNotification) {
									dispatcher.dispatchEvent({
										type: "create",
										parent: item,
										newValue: subFolder
									});
								}
								traverseChildren(subFolder);
							}, internalErrorHandler);
						}
					}
				}

				var drop = function(evt) {
					var i, deferred;
					node.classList.remove("dragOver"); //$NON-NLS-0$
					var currentSelections = this.selection.getSelections();
					
					function sendCopyOrMoveAuditEvent(isCopy, fileClient, source, destination, error, isDirectory) {
						if (/\/$/.test(source) && !/\/$/.test(destination)) {
							destination = destination + '/';
						}
						if (isCopy) {
							var details = {
								id: util.computeAuditId(fileClient, destination),
								isData: true,
								requestData: {
									source: util.computeAuditId(fileClient, source, true),
									trigger: "File Copy"
								}
							};
							mMetrics.logAudit("create", "orion-file", details, error);
							if (!error && !isDirectory) {
								mMetrics.logAudit("edit", "orion-file", details);
							}
						} else { /* move */
							var details = {
								id: util.computeAuditId(fileClient, source),
								isData: true,
								requestData: {
									updateType: "Path Change",
									initialValue: util.computeAuditId(fileClient, source, true),
									newValue: util.computeAuditId(fileClient, destination, true)
								}
							};
							mMetrics.logAudit("update", "orion-file", details, error);
						}		
					}

					function finishDrop(source){
						var fileClient = explorer.fileClient;
						var isCopy = dropEffect === "copy";
						var func = isCopy ? fileClient.copyFile : fileClient.moveFile;
						deferred = func.apply(fileClient, [source.Location, item.Location, source.Name]);
						if (progress) {
							var message = i18nUtil.formatMessage(messages[isCopy ? "Copying ${0}" : "Moving ${0}"], source.Location); //$NON-NLS-1$ //$NON-NLS-0$
							deferred = progress.showWhile(deferred, message);
						}
						deferred.then(function(result) {
							var dispatcher = explorer.modelEventDispatcher;
							dispatcher.dispatchEvent({
								type: isCopy ? "copy" : "move",
								oldValue: source,
								newValue: result,
								parent: item
							});
							sendCopyOrMoveAuditEvent(isCopy, fileClient, source.Location, result.Location, null, result.Directory);
						}, function(error) {
							var destination = item.Location + (/\/$/.test(item.Location) ? "" : "/") + source.Name;
							sendCopyOrMoveAuditEvent(isCopy, fileClient, source.Location, destination, error);
							if (error.status === 400 || error.status === 412) {
								var resp = error.responseText;
								if (typeof resp === "string") {
									try {
										resp = JSON.parse(resp);
										resp.Message = messages[isCopy ? "CopyFailed" : "MoveFailed"];
										error = resp;
									} catch (error) {}
								}
							}
							errorHandler(error);
						});
					}
					if (dragStartTarget) {
						if(Array.isArray(dragStartTarget)){
							dragStartTarget.forEach(function(each){
								finishDrop(each);
							});	
						}else{
							var source = findItemfromNode(dragStartTarget);
							if (!source) {
								return;
							}
							finishDrop(source);
						}
						// webkit supports testing for and traversing directories
						// http://wiki.whatwg.org/wiki/DragAndDropEntries
					} else if (evt.dataTransfer.items && evt.dataTransfer.items.length > 0) {
						for (i = 0; i < evt.dataTransfer.items.length; i++) {
							var entry = null;
							if (typeof evt.dataTransfer.items[i].getAsEntry === "function") {
								entry = evt.dataTransfer.items[i].getAsEntry();
							} else if (typeof evt.dataTransfer.items[i].webkitGetAsEntry === "function") {
								entry = evt.dataTransfer.items[i].webkitGetAsEntry();
							}
							if (entry) {
								dropFileEntry(entry, item, explorer, performDrop, explorer.fileClient);
							}
						}
					} else if (evt.dataTransfer.files && evt.dataTransfer.files.length > 0) {
						for (i = 0; i < evt.dataTransfer.files.length; i++) {
							var file = evt.dataTransfer.files[i];
							// this test is reverse engineered as a way to figure out when a file entry is a directory.
							// The File API in HTML5 doesn't specify a way to check explicitly (when this code was written).
							// see http://www.w3.org/TR/FileAPI/#file
							if (!file.size && !file.type) {
								errorHandler(i18nUtil.formatMessage(messages["FolderDropNotSupported"], file.name));
							} else if (mFileUtils.isAtRoot(item.Location)) {
								errorHandler(messages["CreateFolderErr"]);
							} else {
								explorer._uploadFile(item, file, true);
							}
						}
					}
					lib.stop(evt);
				};

				if (persistAndReplace) {
					if (this._oldDrop) {
						node.removeEventListener("drop", this._oldDrop, false);
					}
					this._oldDrop = drop;
				}
				node.addEventListener("drop", drop.bind(this), false);
			}
		},

		/**
		 * Uploads the specified file as a child of the specified parent item.
		 *
		 * @param {Object} parentItem The item in the model representing the folder under which the file should be placed.
		 * @param {File} file The file to upload.
		 * @param {Boolean} expandParent Specifies whether or not the parentItem should be expanded after the upload completes.
		 */
		_uploadFile: function(parentItem, file, expandParent) {
			var targetItem = parentItem;
			if (!targetItem.Location && targetItem.fileMetadata) {
				targetItem = targetItem.fileMetadata;
			}
			var uploadImpl = function() {
				this._makeUploadNode(targetItem, file.name, false).then(function(uploadNodeContainer) {
					var refNode = uploadNodeContainer.refNode; //td
					var progressBar = uploadNodeContainer.progressBar;
					var cancelButton = uploadNodeContainer.cancelButton;
					var destroy = uploadNodeContainer.destroyFunction;
					var ignoreErrors = false;

					var statusService = this.registry.getService("orion.page.message"); //$NON-NLS-0$
					var d = new Deferred();
					if(file.name.indexOf(".zip") === file.name.length - 4){
						var dialog = this.serviceRegistry.getService("orion.page.dialog");								
						dialog.confirm(i18nUtil.formatMessage(messages["Unzip ${0}?"], file.name), function(result){
							if(!result){
								result = false;
							}
							d.resolve(result);
						});	
					}else{
						d.resolve(false);
					}
					Deferred.when(d, function(unzip){
						var promise = this.dragAndDrop(targetItem, file, this, unzip, false, true);
						var done = function() {
							destroy();
							this.fileClient.dispatchEvent({
								type: "Changed",
								created: [{
									parent: targetItem.Location,
									eventData: {
										select: false
									}
								}]
							});
						}.bind(this);
						promise.then(
							done,
							function(error) {
								done();
								if (ignoreErrors || error.userCanceled) {
									return;
								}
								var errorMessage = messages["UploadingFileErr"] + file.name;
								if (event && event.Message) {
									errorMessage += " [" + event.Message + "]";
								}
								if (statusService) {
									statusService.setProgressResult({
										Severity: "Error",
										Message: errorMessage
									});
								} else {
									window.console.log(errorMessage);
								}
							},
							function(event) {
								var percentageText = "";
								if (event.lengthComputable) {
									percentageText = Math.floor(event.loaded / event.total * 100) + "%";
									progressBar.style.width = percentageText;
									var loadedKB = Math.round(event.loaded / 1024);
									var totalKB = Math.round(event.total / 1024);
									progressBar.title = messages["Upload progress: "] + percentageText + ",  " + loadedKB + "/" + totalKB + " KB"; //$NON-NLS-2$ //$NON-NLS-1$ //$NON-NLS-0$
									refNode.title = progressBar.title;
								}
							}
						);
	
						cancelButton.addEventListener("click", function() {
							ignoreErrors = true;
							promise.cancel();
						});
					}.bind(this));
				}.bind(this));
			}.bind(this);

			if (expandParent) {
				this.expandItem(targetItem, false).then(uploadImpl);
			} else {
				uploadImpl();
			}

		},

		/**
		 * Creates a placeholder node in the navigator which shows the name
		 * of the artifact being uploaded as well as progress and an option
		 * to cancel the upload (if possible).
		 *
		 * @param {Object} parentItem The item in the model representing the folder under which the file should be placed. Workspace root is supported.
		 * @param {String} artifactName The name of the file or folder being uploaded.
		 * @param {Boolean} isDirectory true if the artifact is a directory, false otherwise
		 *
		 * @returns {orion.Deferred.promise} which resolves with the following object:
		 * 		 {Object} nodeContainer An object containing the following:
		 * 			nodeContainer.refNode The td of the newly created DOM node
		 * 			nodeContainer.tempNode The tr of the newly created DOM node (this is the top-level DOM node)
		 * 			nodeContainer.progressBar The DOM node containing the progress bar
		 * 			nodeContainer.cancelButton The DOM node of the upload cancel button (only if isFile === true)
		 * 			nodeContainer.destroyFunction The function that should be called to remove the temporary upload node from the navigator
		 */
		_makeUploadNode: function(parentItem, artifactName, isDirectory) {

			var domId = this.getRow(parentItem) ? this.getRow(parentItem).id : this.parentId;
			var child = {
				Name: artifactName,
				Directory: isDirectory
			};

			return this.makeNewChildItemPlaceholder(parentItem, child, domId).then(function(placeholder) {
				var nodeContainer = null;
				var refNode, wrapperNode;
				if (placeholder) {
					nodeContainer = {};
					refNode = placeholder.refNode;
					wrapperNode = placeholder.wrapperNode;
					refNode.classList.add("uploadNode"); //$NON-NLS-0$

					nodeContainer.refNode = refNode;
					nodeContainer.wrapperNode = wrapperNode;

					var textSpan = document.createElement("span");
					textSpan.classList.add("uploadNodeText");
					textSpan.appendChild(document.createTextNode(artifactName));
					refNode.appendChild(textSpan);

					var progressBarWrapper = document.createElement("span");
					progressBarWrapper.classList.add("progressBarWrapper"); //$NON-NLS-0$

					var progressBar = document.createElement("span");
					progressBar.classList.add("progressBar"); //$NON-NLS-0$
					progressBarWrapper.appendChild(progressBar);
					refNode.appendChild(progressBarWrapper);

					nodeContainer.progressBar = progressBar;

					if (isDirectory) {
						progressBar.classList.add("continuous"); //$NON-NLS-0$
						refNode.title = messages["Uploading "] + artifactName;
						progressBar.title = refNode.title;
					} else {
						var cancelButton = document.createElement("button");
						cancelButton.classList.add("imageSprite"); //$NON-NLS-0$
						cancelButton.classList.add("core-sprite-delete"); //$NON-NLS-0$
						cancelButton.classList.add("uploadCancelButton"); //$NON-NLS-0$
						cancelButton.title = messages["Cancel upload"];
						refNode.appendChild(cancelButton);

						nodeContainer.cancelButton = cancelButton;
					}

					nodeContainer.destroyFunction = placeholder.destroyFunction;
				}

				return nodeContainer;
			}.bind(this));
		},

		/**
		 * @name orion.explorer.FileExplorer#createModel
		 * @function Creates the explorer model.
		 * @returns {orion.explorer.FileModel}
		 */
		createModel: function() {
			return new FileModel(this.registry, this.treeRoot, this.fileClient, this.parentId, this.excludeFiles, this.excludeFolders, this.filteredResources);
		},

		/**
		 * @name orion.explorer.FileExplorer#changedItem
		 * @function
		 * we have changed an item on the server at the specified parent node
		 * @param {Object} parent The parent item under which the change occurred.
		 * @param {Boolean} forceExpand
		 * @returns {orion.Promise}
		 */
		changedItem: function(parentItem, forceExpand) {
			if (!parentItem) {
				return new Deferred().resolve();
			}
			if (this.treeRoot && this.treeRoot.Location === parentItem.Location) {
				return this.loadResourceList(this.treeRoot, forceExpand);
			}
			var that = this;
			var deferred = new Deferred();
			parentItem.children = parentItem.Children = null;
			this.model.getChildren(parentItem, function(children) {
				//If a key board navigator is hooked up, we need to sync up the model
				if (that.getNavHandler()) {
					//that._initSelModel();
				}
				that.myTree.refresh.bind(that.myTree)(parentItem, children, forceExpand);
				deferred.resolve(children);
			});
			return deferred;
		},

		/**
		 * Shows the given item.
		 * @param {Object} The item to be shown.
		 * @param {Booelan} [reroot=true] whether the receiver should re-root the tree if the item is not displayable.
		 * @returns {orion.Promise}
		 */
		showItem: function(item, reroot) {
			var deferred = new Deferred();
			if (!item || !this.model || !this.myTree) {
				return deferred.reject();
			}
			if (!this.myTree.showRoot && (item.Location === this.treeRoot.Location || item.Location === this.treeRoot.ContentLocation)) {
				return deferred.resolve(this.treeRoot);
			}
			var row = this.getRow(item);
			if (row) {
				deferred.resolve(row._item || item);
			} else if (item.Parents && item.Parents.length > 0) {
				item.Parents[0].Parents = item.Parents.slice(1);
				return this.expandItem(item.Parents[0], reroot).then(function(parent) {
					// Handles model out of sync
					var row = this.getRow(item);
					if (!row) {
						return this.changedItem(parent, true).then(function() {
							var row = this.getRow(item);
							if (!row) {
								parent.children.unshift(item);
								this.myTree.refresh(parent, parent.children, false);
								row = this.getRow(item);
							}
							return row ? row._item : new Deferred().reject();
						}.bind(this));
					}
					return row._item || item;
				}.bind(this));
			} else {
				// Handles file not in current tree
				if (reroot === undefined || reroot) {
					return this.reroot(item);
				}
				return deferred.reject();
			}
			return deferred;
		},

		/**
		 * Expands the given item.
		 * @param {Object} The item to be expanded.
		 * @param {Booelan} [reroot=true] whether the receiver should re-root the tree if the item is not displayable.
		 * @returns {orion.Promise}
		 */
		expandItem: function(item, reroot) {
			var deferred = new Deferred();
			this.showItem(item, reroot).then(function(result) {
				if (item.Children && !result.Children) {
					result.Children = item.Children;
				}
				if (this.myTree.isExpanded(result)) {
					deferred.resolve(result);
				} else {
					this.myTree.expand(this.model.getId(result), function() {
						deferred.resolve(result);
					});
				}
			}.bind(this), deferred.reject);
			return deferred;
		},

		/**
		 * Create and return the row for the given item
		 * @param {Object} The parent of the row.
		 * @param {Object} The contents of the row.
		 */
		insertMissingItem: function(parent, item) {
			return null;
		},

		/**
		 * Shows and selects the given item.
		 * @param {Object} The item to be revealed.
		 * @param {Booelan} [reroot=true] whether the receiver should re-root the tree if the item is not displayable.
		 * @returns {orion.Promise}
		 */
		reveal: function(item, reroot) {
			return this.showItem(item, reroot).then(function(result) {
				this.select(result);
			}.bind(this));
		},

		/**
		 * Re-roots the tree so that the given item is displayable.
		 * @param {Object} The item to be expanded.
		 * @returns {orion.Promise}
		 */
		reroot: function(item) {
			// Do nothing by default
			return new Deferred().reject();
		},

		/**
		 * Returns whether the given item is expanded.
		 * @param {Object} The item to be expanded.
		 * @returns {orion.Promise}
		 */
		isExpanded: function(item) {
			var rowId = this.model.getId(item);
			return this.renderer.tableTree.isExpanded(rowId);
		},

		/**
		 * Returns the node that a rename text input box should appear over top of.
		 * @name orion.explorer.FileExplorer#getNameNode
		 * @function
		 * @param {Object} item Item being renamed
		 * @returns {Element}
		 */
		getNameNode: function(item) {
			var rowId = this.model.getId(item);
			if (rowId) {
				// I know this from my renderer below.
				// TODO This approach fails utterly for a custom renderer, better hope they override this method.
				return lib.node(rowId + "NameLink"); //$NON-NLS-0$
			}
		},

		/**
		 * The explorerNavHandler hooked up by the explorer will call this function when left arrow key is pressed on a
		 * top level item that is aleady collapsed. The default implementation does nothing.
		 * @name orion.explorer.FileExplorer#scopeUp
		 * @function
		 */
		scopeUp: function() {},

		/**
		 * The explorerNavHandler hooked up by the explorer will call this function when the focus into command is clicked.
		 * The default implementation does nothing.
		 * @name orion.explorer.FileExplorer#scopeDown
		 * @function
		 */
		scopeDown: function(item) {},

		/**
		 * Load the resource at the given path.
		 * @name orion.explorer.FileExplorer#loadResourceList
		 * @function
		 * @param {String|Object} path The path of the resource to load, or an object with a ChildrenLocation or ContentLocation field giving the path.
		 * @param {Boolean} [force] If true, force reload even if the path is unchanged. Useful
		 * when the client knows the resource underlying the current path has changed.
		 * @param {Function} postLoad a function to call after loading the resource. <b>Deprecated</b>: use the returned promise instead.
		 * @returns {orion.Promise}
		 */
		loadResourceList: function(path, force, postLoad) {
			if (path && typeof path === "object") {
				path = path.ChildrenLocation || path.ContentLocation;
			}
			path = mFileUtils.makeRelative(path);
			var self = this;
			if (force || path !== this.treeRoot.Path || path !== this._lastPath) {
				this._lastPath = path;
				return this.load(this.fileClient.read(path, true), i18nUtil.formatMessage(messages["Loading ${0}"], path), postLoad).then(function() {
					self.treeRoot.Path = path;
					return self.treeRoot;
				}, function(err) {
					self.treeRoot.Path = null;
					return new Deferred().reject(err);
				});
			}
			return new Deferred().resolve(self.treeRoot);
		},

		/**
		 * Load the explorer with the given root
		 * @name orion.explorer.FileExplorer#load
		 * @function
		 * @param {Object} root a root object or a deferred that will return the root of the FileModel
		 * @param {String} progress a string progress message describing the fetch of the root
		 * @returns {orion.Promise} A promise that resolves to the loaded <code>treeRoot</code>, or rejects with an error.
		 */
		load: function(root, progressMessage, postLoad) {
			var parent = lib.node(this.parentId);

			// Progress indicator
			var progress = lib.node("progress"); //$NON-NLS-0$
			if (!progress) {
				progress = document.createElement("div");
				progress.id = "progress"; //$NON-NLS-0$
				progress.classList.add("fileExplorerProgressDiv"); //$NON-NLS-0$
				lib.empty(parent);
				parent.appendChild(progress);
			}
			lib.empty(progress);

			var progressTimeout = setTimeout(function() {
				lib.empty(progress);
				progress.appendChild(document.createTextNode(progressMessage));
			}, 500); // wait 500ms before displaying

			var self = this;
			return Deferred.when(root,
				function(root) {
					clearTimeout(progressTimeout);
					if (self.destroyed) {
						return;
					}
					self.treeRoot = {};
					// copy properties from root json to our object
					for (var property in root) {
						self.treeRoot[property] = root[property];
					}
					self.model = self.createModel();
					if (self.dragAndDrop) {
						if (self._hookedDrag) {
							// rehook on the parent to indicate the new root location
							self._makeDropTarget(self.treeRoot, parent, true);
						} else {
							// uses two different techniques from Modernizr
							// first ascertain that drag and drop in general is supported
							var supportsDragAndDrop = parent && ('draggable' in parent || 'ondragstart' in parent && 'ondrop' in parent);
							// then check that file transfer is actually supported, since this is what we will be doing.
							// For example IE9 has drag and drop but not file transfer
							supportsDragAndDrop = supportsDragAndDrop && !!(window.File && window.FileList && window.FileReader);
							self._hookedDrag = true;
							if (supportsDragAndDrop) {
								self._makeDropTarget(self.treeRoot, parent, true);
							} else {
								self.dragAndDrop = null;
								window.console.log("Local file drag and drop is not supported in this browser."); //$NON-NLS-0$
							}
						}
					}

					var deferred = new Deferred();
					self.createTree(self.parentId, self.model, {
						role: self.role,
						name: self.name,
						onComplete: function(tree) {
							deferred.resolve(tree);
						},
						navHandlerFactory: self.navHandlerFactory,
						showRoot: self.showRoot,
						setFocus: typeof self.setFocus === "undefined" ? true : self.setFocus,
						selectionPolicy: self.renderer.selectionPolicy
					});

					return deferred.then(function() {
						if (typeof postLoad === "function") {
							try {
								postLoad();
							} catch (e) {
								if (self.registry) {
									self.registry.getService("orion.page.message").setErrorMessage(e); //$NON-NLS-0$
								}
							}
						}
						if (typeof self.onchange === "function") {
							self.onchange(self.treeRoot);
						}
						self.dispatchEvent({
							type: "rootChanged",
							root: self.treeRoot
						});
						return self.treeRoot;
					});
				},
				function(error) {
					clearTimeout(progressTimeout);
					// Show an error message when a problem happens during getting the workspace
					if (self.registry) {
						self.registry.getService("orion.page.message").setProgressResult(error); //$NON-NLS-0$
					}
					self.dispatchEvent({
						type: "rootChanged",
						root: self.treeRoot
					});
					return new Deferred().reject(error);
				}
			);
		},
		/**
		 * Called when the root item changes. This can be overridden.
		 * @name orion.explorer.FileExplorer#onchange
		 * @function
		 * @param {Object} item
		 */
		onchange: function(item) {}
	});
	FileExplorer.prototype.constructor = FileExplorer;

	//return module exports
	return {
		FileExplorer: FileExplorer,
		FileModel: FileModel,
		FileFilter: FileFilter,
	};
});
