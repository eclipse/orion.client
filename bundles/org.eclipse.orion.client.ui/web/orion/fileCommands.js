/*******************************************************************************
 * @license
 * Copyright (c) 2011, 2017 IBM Corporation and others.
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
/*global confirm*/

define(['i18n!orion/navigate/nls/messages', 'orion/webui/littlelib', 'orion/i18nUtil', 'orion/uiUtils', 'orion/fileUtils', 'orion/commands', 'orion/fileDownloader',
	'orion/commandRegistry', 'orion/contentTypes', 'orion/compare/compareUtils', 
	'orion/Deferred', 'orion/webui/dialogs/DirectoryPrompterDialog',
	'orion/EventTarget', 'orion/form', 'orion/xhr', 'orion/bidiUtils', 'orion/util', 'orion/urlModifier', 'orion/metrics'],
	function(messages, lib, i18nUtil, mUIUtils, mFileUtils, mCommands, mFileDownloader, mCommandRegistry, mContentTypes, mCompareUtils, Deferred, DirPrompter, EventTarget, form, xhr, bidiUtils, util, urlModifier, mMetrics) {

	/**
	 * Utility methods
	 * @class This class contains static utility methods for creating and managing commands 
	 * related to file management.
	 * @name orion.fileCommands
	 */
	var fileCommandUtils = {};

	var selectionListenerAdded = false;

	// This variable is used by a shared error handler so it is set up here.  Anyone using the error handler should set this
	// variable first.
	var progressService = null;
	
	var lastItemLoaded = {Location: null};

	var explorer;
	fileCommandUtils.setExplorer = function(newExplorer) {
		explorer = newExplorer;
	};
		
	/**
	 * Returns a shared model event dispatcher that can be used by multiple <code>orion.explorer.FileExplorer</code>
	 * so that all explorers are notified of model changes from other explorers.
	 * @name orion.fileCommands#getModelEventDispatcher
	 * @function
	 */
	var sharedModelEventDispatcher;
	fileCommandUtils.getModelEventDispatcher = function() {
		if (!sharedModelEventDispatcher) {
			sharedModelEventDispatcher = new EventTarget();
		}
		return sharedModelEventDispatcher;
	};

	function dispatchModelEventOn(event) {
		var dispatcher = sharedModelEventDispatcher;
		if (dispatcher && typeof dispatcher.dispatchEvent === "function") { //$NON-NLS-0$
			dispatcher.dispatchEvent(event);
		}
	}
	
	function removeLastModifiedFile(contentLocation){
		var lastEditedFile = sessionStorage.lastFile;
		if (lastEditedFile && lastEditedFile.lastIndexOf("#" + contentLocation, 0) === 0){
			delete sessionStorage.lastFile
		}
	}

	/**
	 * Uploads a file
	 * @name orion.fileCommands#uploadFile
	 * @function
	 * @param {Object} targetFolder
	 * @param {Object} file
	 * @param {orion.explorer.FileExplorer} explorer
	 * @param {orion.EventTarget} [explorer.modelEventDispatcher] If supplied, this dispatcher will be invoked to dispatch 
	 * events describing the file upload.
	 * @param {Boolean} unzip
	 * @param {Boolean} force
	 * @param {Boolean} preventNotification Optional. true if a model event should not be dispatched after the file is uploaded, false otherwise
	 * @returns {XMLHttpRequest} The XMLHttpRequest object that was created and used for the upload.
	 */
	fileCommandUtils.uploadFile = function(targetFolder, file, explorer, unzip, force, preventNotification) {
		var xferOptions = force ? "overwrite-older": "no-overwrite";
		// TODO if we want to unzip zip files, don't use this...
		if (!unzip) {
			 xferOptions += "," + "raw";
		}

		var opts = {
			headers: {
				"Slug": form.encodeSlug(file.name), //$NON-NLS-0$
				"Orion-Version": "1", //$NON-NLS-1$ //$NON-NLS-0$
				"X-Xfer-Options": xferOptions, //$NON-NLS-0$
				"Content-Type": "application/octet-stream" //$NON-NLS-1$ //$NON-NLS-0$
			},
			data: file,
			upload: true
		};

		var ignoreError = false;
		var promise = new Deferred();
		var xhrPromise = xhr("POST", targetFolder.ImportLocation, opts).then(
			function(result) {
				if (!preventNotification) {
					//TODO Not sure if we should send out event from file Client here
					dispatchModelEventOn({ type: "create", parent: targetFolder, newValue: null /* haven't fetched the new file in Orion yet */ }); //$NON-NLS-0$	
				}
				promise.resolve(result);
				var destination = targetFolder.Location + (/\/$/.test(targetFolder.Location) ? "" : "/") + file.name;
				mMetrics.logAudit("import", "orion-file", {id: util.computeAuditId(this.fileClient, destination), isData: true, requestData: {extractArchive: unzip}});
			}.bind(this),
			function(error) {
				if (ignoreError) {
					return;
				}

				var result = {};
				try {
					result = JSON.parse(error.responseText);
				} catch(e) {
				}
				if (error.status === 400) {
				 	if (result.JsonData && result.JsonData.ExistingFiles) {
				 		var retry = function() {
							fileCommandUtils.uploadFile(targetFolder, file, explorer, unzip, true, preventNotification).then(
								promise.resolve,
								promise.reject,
								promise.progress);
				 		};
				 		var retryMessage = result.Message + "\n\nWould you like to retry the import with forced overwrite?";

				 		if (explorer && explorer.serviceRegistry) {
				 			explorer.serviceRegistry.getService("orion.page.dialog").confirm(retryMessage, function(response) {
			 					if (response) {
			 						retry();
		 						} else {
		 							result.userCanceled = true;
		 							promise.reject(result);
		 						}
							});
			 				return;
				 		}
			 			if (confirm(retryMessage)) {
			 				retry();
			 				return;
		 				}
					}
				}
				promise.reject(result);
				var destination = targetFolder.Location + (/\/$/.test(targetFolder.Location) ? "" : "/") + file.name;
				mMetrics.logAudit("import", "orion-file", {id: util.computeAuditId(this.fileClient, destination), isData: true, requestData: {extractArchive: unzip}}, {status: error.status || 500, response: error.responseText});
			}.bind(this),
			function(progress) {
				promise.progress(progress);
			}
		);
		promise.then(null, function(error) {
			if (error instanceof Error && error.name === "Cancel") {
				ignoreError = true;
				xhrPromise.cancel();
			}
		});
		
		return promise;
	};

	/**
	 * Updates the explorer toolbar.
	 * @name orion.fileCommands#updateNavTools
	 * @function
	 * @param {orion.serviceregistry.ServiceRegistry} serviceRegistry
	 * @param {orion.commandregistry.CommandRegistry} commandRegistry
	 * @param {orion.explorer.Explorer} explorer
	 * @param {String} toolbarId Gives the scope for toolbar commands. Commands in this scope are rendered with the <code>item</code>
	 * parameter as their target.
	 * @param {String} [selectionToolbarId] Gives the scope for selection-based commands. Commands in this scope are rendered
	 * with current selection as their target.
	 * @param {Object} item The model item to render toolbar commands against.
	 * @param {Boolean} [rootSelection=false] If <code>true</code>, any selection-based commands will be rendered with the <code>explorer</code>'s 
	 * treeRoot as their target, when no selection has been made. If <code>false</code>, any selection-based commands will be inactive when no 
	 * selection has been made.
	 */
	fileCommandUtils.updateNavTools = function(registry, commandRegistry, theExplorer, toolbarId, selectionToolbarId, toolbarItem, rootSelection) {
		explorer = theExplorer;
		function updateSelectionTools(selectionService, item) {
			var ids = Array.isArray(selectionToolbarId) ? selectionToolbarId : [selectionToolbarId];
			ids.forEach(function(id) {
				var selectionTools = lib.node(id);
				if (selectionTools) {
					// Hacky: check for a local selection service of the selectionToolbarId, or the one associated with the commandRegistry
					var contributions = commandRegistry._contributionsByScopeId[id];
					selectionService = selectionService || (contributions && contributions.localSelectionService) || commandRegistry.getSelectionService(); //$NON-NLS-0$
					if (contributions && selectionService) {
						selectionService.getSelections(function(selections) {
							commandRegistry.destroy(selectionTools);
							var isNoSelection = !selections || (Array.isArray(selections) && !selections.length);
							if (rootSelection && isNoSelection) {
								commandRegistry.renderCommands(selectionTools.id, selectionTools, item, explorer, "menubar");  //$NON-NLS-0$
							} else {
								commandRegistry.renderCommands(selectionTools.id, selectionTools, null, explorer, "menubar"); //$NON-NLS-1$ //$NON-NLS-0$
							}
						});
					}
				}
			});
		}

		if (toolbarId) {
			var toolbar = lib.node(toolbarId);
			if (toolbar) {
				commandRegistry.destroy(toolbar);
			} else {
				throw new Error("could not find toolbar " + toolbarId); //$NON-NLS-0$
			}
			// close any open slideouts because if we are retargeting the command
			if (lastItemLoaded.Location && toolbarItem.Location !== lastItemLoaded.Location) {
				commandRegistry.closeParameterCollector();
				lastItemLoaded.Location = toolbarItem.Location;
			}
			commandRegistry.renderCommands(toolbar.id, toolbar, toolbarItem, explorer, "button"); //$NON-NLS-0$
		}
		
		if (selectionToolbarId) {
			updateSelectionTools(null, explorer ? explorer.getTreeRoot() : null);
		}

		// Attach selection listener once, keep forever
		if (!selectionListenerAdded) {
			selectionListenerAdded = true;
			var selectionService = registry.getService("orion.page.selection"); //$NON-NLS-0$
			selectionService.addEventListener("selectionChanged", function(event) { //$NON-NLS-0$
				updateSelectionTools(selectionService, explorer ? explorer.getTreeRoot() : null);
			});
		}
	};
	
	function errorHandler(error) {
		if (progressService) {
			progressService.setProgressResult(error);
		} else {
			window.console.log(error);
		}
	}

	
	function getNewItemName(explorer, item, domId, defaultName, onDone) {
		var refNode, name;
		var hideRefNode = true;
		var insertAsChild = false;
		
		var placeholder = explorer.makeNewItemPlaceholder(item, domId, true);
		if (placeholder) {
			refNode = placeholder.refNode;
			hideRefNode = false;
			insertAsChild = true;
		} else {
			refNode = lib.node(domId);
		}

		if (refNode) {
			var done = function(name) { 
				if (name) {
					onDone(name);
				}
			};
			
			mUIUtils.getUserText({
				id: domId+"EditBox", //$NON-NLS-0$
				refNode: refNode,
				hideRefNode: hideRefNode,
				initialText: defaultName,
				onComplete: done,
				onEditDestroy: placeholder.destroyFunction,
				isInitialValid: true,
				insertAsChild: insertAsChild
			});
		} else {
			name = window.prompt(defaultName);
			if (name) {
				onDone(name);
			}
		}
	}
	
	function forceSingleItem(item) {
		if (!item) {
			return {};
		}
		if (Array.isArray(item)) {
			if (item.length === 1) {
				item = item[0];
			} else {
				item = {};
			}
		}
		return item;
	}

	function createProject(explorer, fileClient, progress, name, populateFunction, progressMessage) {
		// set progress variable so error handler can use
		progressService = progress;
		if (name) {
			var loadedWorkspace;
			if (mFileUtils.isAtRoot(explorer.treeRoot.ChildrenLocation)) {
				loadedWorkspace = explorer.treeRoot;
			} else {
				loadedWorkspace = progressService.progress(fileClient.loadWorkspace(explorer.treeRoot.Location), "Loading workspace"); //$NON-NLS-0$
			}
			Deferred.when(loadedWorkspace, function(workspace) {
				var deferred = fileClient.createProject(workspace.ChildrenLocation, name);
				if (progressMessage) {
					deferred = progress.showWhile(deferred, progressMessage);
				}
				deferred.then(function(project) {
					// we need folder metadata for the commands, not the project object
					progress.progress(fileClient.read(project.ContentLocation, true), "Reading metadata of newly created project " + name).then(function(folder) {
						if (populateFunction) {
							populateFunction(folder);
						}
						//TODO Not sure if we should send out event from file Client here
						dispatchModelEventOn({type: "create", parent: loadedWorkspace, newValue: folder }); //$NON-NLS-0$
					}, errorHandler);
					mMetrics.logAudit("create", "orion-file", {id: util.computeAuditId(fileClient, project.Location), isData: true});
				},
				function(error) {
					mMetrics.logAudit("create", "orion-file", {id: util.computeAuditId(fileClient, workspace.ChildrenLocation + '/' + name), isData: true}, error);
					if (error.status === 400 || error.status === 412) {
						var resp = error.responseText;
						if (typeof resp === "string") {
							try {
								resp = JSON.parse(resp);
								resp.Message = i18nUtil.formatMessage(messages["FailedToCreateProject"], name);
								error = resp;
							} catch(error) {}
						}
					}
					errorHandler(error);
				});
			}, errorHandler);
		}
	}

	// Shared for the whole page
	var bufferedSelection = [];
	
	var isCutInProgress = false;
	
	/**
	 * Returns the buffer containing the cut selections or null if a 
	 * cut operation is not in progress.
	 * @name orion.fileCommands#getCutBuffer
	 * @function
	 * @returns {Array} bufferedSelection or null
	 */
	fileCommandUtils.getCutBuffer = function() {
		return isCutInProgress ? bufferedSelection : null;	
	};
	
	/**
	 * Tests whether or not the specified model is equal to
	 * or a child of the specified bufferedModel.
	 * 
	 * @returns true if the test passes, false otherwise
	 */
	fileCommandUtils.isEqualToOrChildOf = function(model, bufferedModel) {
		if (model.Location === bufferedModel.Location) {
			return true;
		} else if (-1 !== model.Location.indexOf(bufferedModel.Location)) {
			// model may be a child of bufferedModel
			if (model.parent === bufferedModel.parent) {
				// model is not a child but rather a file in the same 
				// directory with a name that starts with bufferedModel's name
				return false;
			}
			return true;
		}
		
		return false;
	};
	
	/**
	 * Creates the commands related to file management.
	 * @param {orion.serviceregistry.ServiceRegistry} serviceRegistry The service registry to use when creating commands
	 * @param {orion.commandregistry.CommandRegistry} commandRegistry The command registry to get commands from
	 * describing model changes that are performed by file commands.
	 * @param {orion.fileClient.FileClient} fileClient The file system client that the commands should use
	 * @param {object} prefs GeneralPreferences
	 * @name orion.fileCommands#createFileCommands
	 * @function
	 */
	fileCommandUtils.createFileCommands = function(serviceRegistry, commandService, fileClient, prefs) {
		progressService = serviceRegistry.getService("orion.page.progress"); //$NON-NLS-0$
		
		var dispatchModelEvent = dispatchModelEventOn.bind(null);
		var generalPrefs = prefs;
		
		function contains(arr, item) {
			return arr.indexOf(item) !== -1;
		}
		
		function stripPath(location) {
			location = mFileUtils.makeRelative(location);
			// get hash part and strip query off
			var splits = location.split('#'); //$NON-NLS-0$
			var path = splits[splits.length-1];
			var qIndex = path.indexOf("/?"); //$NON-NLS-0$
			if (qIndex > 0) {
				//remove the query but not the trailing separator
				path = path.substring(0, qIndex+1);
			}
			return path;
		}

		function canCreateProject(item) {
			if (!explorer || !explorer.isCommandsVisible()) {
				return false;
			}
			item = forceSingleItem(item);
			return item.Location && mFileUtils.isAtRoot(item.Location);
		}

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
		
		function makeMoveCopyTargetChoices(items, userData, isCopy) {
			items = Array.isArray(items) ? items : [items];
			var callback = function(selectedItems) {
				if (!Array.isArray(selectedItems)) {
					selectedItems = [selectedItems];
				}
				var deferreds = [];
				var choice = this;
				selectedItems.forEach(function(item) {
					var func = isCopy ? fileClient.copyFile : fileClient.moveFile;
					deferreds.push(func.apply(fileClient, [item.Location, choice.path, item.Name]).then(
						function(newItem) {
							sendCopyOrMoveAuditEvent(isCopy, fileClient, item.Location, newItem.Location, null, newItem.Directory);
						},
						function(error) {
							errorHandler(error);
							var destination = choice.path + (/\/$/.test(choice.path) ? "" : "/") + item.Name;
							sendCopyOrMoveAuditEvent(isCopy, fileClient, item.Location, destination, error);
						}
					));
				});
				Deferred.all(deferreds).then(function() {
				});
			};
			
			var prompt = function(selectedItems) {
				var dialog = new DirPrompter.DirectoryPrompterDialog({
					title: messages["Choose a Folder"],
					serviceRegistry: serviceRegistry,
					fileClient: fileClient,				
					func: function(targetFolder) { 
						if (targetFolder && targetFolder.Location) {
							if (!Array.isArray(selectedItems)) {
								selectedItems = [selectedItems];
							}
							var deferreds = [];
							selectedItems.forEach(function(item) {
								var location = targetFolder.Location;
								var name = item.Name || null;
								var func = isCopy ? fileClient.copyFile : fileClient.moveFile;
								var message = i18nUtil.formatMessage(isCopy ? messages["Copying ${0}"] : messages["Moving ${0}"], item.Location);
								function doOperation() {
									if (location) {
										var deferred = func.apply(fileClient, [item.Location, targetFolder.Location, name]);
										deferreds.push(progressService.showWhile(deferred, message).then(
											function(result) {
												sendCopyOrMoveAuditEvent(isCopy, fileClient, item.Location, result.Location, null, result.Directory);
											},
											function(error) {
												errorHandler(error);
												var destination = targetFolder.Location + (/\/$/.test(targetFolder.Location) ? "" : "/") + name;
												sendCopyOrMoveAuditEvent(isCopy, fileClient, item.Location, destination, error);
											}
										));
									}
								}
								if (isCopy && item.parent && item.parent.Location === location) {
									commandService.prompt(null, i18nUtil.formatMessage(messages['EnterName'], bidiUtils.enforceTextDirWithUcc(item.Name)), messages['Ok'], messages['Cancel'], 
										i18nUtil.formatMessage(messages['Copy of ${0}'], item.Name), false, function(newName) {
											// user cancelled?  don't copy this one
											if (!newName) {
												location = null;
											}
											name = newName;
											doOperation();
										});
								}else{
									doOperation();
								}
							});
							Deferred.all(deferreds).then(function() {
							});
						}
					}
				});
				dialog.show();
			};
			
			// Remember all source paths so we do not propose to move/copy a source to its own location
			var sourceLocations = [];
			for (var i=0; i<items.length; i++) {
				// moving or copying to the parent location is a no-op (we don't support rename or copy with rename from this menu)
				if (items[i].parent && items[i].parent.Location ) {
					items[i].parent.stripped = items[i].parent.stripped || stripPath(items[i].parent.Location);
					if (!contains(sourceLocations, items[i].parent.stripped)) {
						sourceLocations.push(items[i].parent.stripped);
					}
				}
				// moving a directory into itself is not supported
				if (items[i].Directory && !isCopy) {
					items[i].stripped = items[i].stripped || stripPath(items[i].Location);
					sourceLocations.push(items[i].stripped);
				}
			}
	
			var choices = [];
			var proposedPaths = [];
			// All children of the root that are folders should be available for choosing.
			var topLevel = explorer.treeRoot.Children || (explorer.treeRoot.Workspace ? explorer.treeRoot.Workspace.Children : {});
			for (i=0; i<topLevel.length; i++) {
				var child = topLevel[i];
				child.stripped = child.stripped || (child.Directory ? stripPath(child.Location) : null);
				if (child.stripped && !contains(sourceLocations, child.stripped)) {
					proposedPaths.push(child);
				}
			}
			// sort the choices
			proposedPaths.sort(function(a,b) {
				if (a.stripped < b.stripped) {
					return -1;
				}
				if (a.stripped > b.stripped) {
					return 1;
				}
				return 0;
			});
			// now add them
			for (i=0; i<proposedPaths.length; i++) {
				var item = proposedPaths[i];
				var displayPath = item.Name;
				// we know we've left leading and trailing slash so slashes is splits + 1
				var slashes = item.stripped.split('/').length + 1; //$NON-NLS-0$
				// but don't indent for leading or trailing slash
				// TODO is there a smarter way to do this?
				for (var j=0; j<slashes-2; j++) {
					displayPath = "  " + displayPath; //$NON-NLS-0$
				}
				choices.push({name: displayPath, path: item.stripped, item: item, callback: callback});
			}
			if (proposedPaths.length > 0) {
				choices.push({});  //separator
			}
			choices.push({name: messages["ChooseFolder"], callback: prompt});
			return choices;
		}

		var oneOrMoreFilesOrFolders = function(item) {
			if (explorer && !explorer.isCommandsVisible()) {
				return false;
			}
			var items = Array.isArray(item) ? item : [item];
			if (items.length === 0) {
				return false;
			}
			for (var i=0; i < items.length; i++) {
				item = items[i];
				if (!item.Location) {
					return false;
				}
			}
			return true;
		};

		/**
		 * Helper to find the parent of item (for the purposes of rename, move, etc) and the canonical item itself
		 * (if item is a top-level folder).
		 * @returns {orion.Promise|Object}
		 */
		function getLogicalModelItems(item) {
			if (item.parent) {
				// synthetic 'parent' field added by FileExplorer
				return { item: item, parent: item.parent };
			} else if (item.Parents && item.Parents[0]) {
				return { item: item, parent: item.Parents[0] };
			}
			// item is a top-level folder (ie. project). Find the workspace (which is the parent for rename purposes)
			return fileClient.getWorkspace(item.Location).then(function(workspace) {
				return Deferred.when(workspace.Children || fileClient.fetchChildren(workspace)).then(function(children) {
					workspace.Children = children;
					var itemIsProject = workspace.Children.some(function(child) {
						if (child.Location === item.Location) {
							// This is the "canonical" project, with the Id field that we want.
							item = child;
							return true;
						}
						return false;
					});
					return { item: item, parent: (itemIsProject ? workspace : null) };
				});
			});
		}
		
		/*
		* Iterate over an array of items and return the target folder. The target
		* folder of an item is either itself (if it is a dir) or its parent. If there
		* are multiple target folders, return the first.
		* 
		* If the root folder is allowed, all items need to be directories
		*/
		function getTargetFolder(items, allowRoot) {
			var folder;
			if (!Array.isArray(items)) {
				items = [items];
			}
			items.some(function(currentItem) {
				var testFolder;
				if (currentItem.Directory) {
					testFolder = currentItem;
				} else {
					testFolder = currentItem.parent;
				}
				if (testFolder) {
					folder = testFolder;
					return true;
				}
				return false;
			});
			if (!allowRoot && folder && mFileUtils.isAtRoot(folder.Location)) {
				return null;
			}
			return folder;
		}
		
		function checkFolderSelection(item, allowRoot) {
			if (!explorer || !explorer.isCommandsVisible()) {
				return false;
			}
			return getTargetFolder(item, allowRoot);
		}
		
		function doMove(item, newText) {
			var moveLocation = item.Location;
			Deferred.when(getLogicalModelItems(item), function(logicalItems) {
				item = logicalItems.item;
				var parent = logicalItems.parent;
				var parentLocation = parent.Location || parent.WorkspaceLocation;
				var deferred = fileClient.moveFile(moveLocation, parentLocation, newText);
				progressService.showWhile(deferred, i18nUtil.formatMessage(messages["Renaming ${0}"], moveLocation)).then(
					function(newItem) {
						if (!item.parent) {
							item.parent = parent;
						}
						sendCopyOrMoveAuditEvent(false, fileClient, moveLocation, newItem.Location, null, newItem.Directory);
					},
					function(error) {
						errorHandler(error);
						var destination = parentLocation + (/\/$/.test(parentLocation) ? "" : "/") + newText;
						sendCopyOrMoveAuditEvent(false, fileClient, moveLocation, destination, error);
					}
				);
			});
		}
		
		var editAndRename = function(item, data) {
			// we want to popup the edit box over the name in the explorer.
			// if we can't find it, we'll pop it up over the command dom element.
			var refNode = explorer.getNameNode(item);
			if (!refNode) {
				if (!data) {
					return;
				}
				refNode = data.domParent || data.domNode;
			}
			var id = refNode.id+"EditBox"; //$NON-NLS-0$
			if (lib.node(id)) {
				return;
			}
			
			mUIUtils.getUserText({
				id: id, 
				refNode: refNode, 
				hideRefNode: true, 
				initialText: item.Name,
				onComplete: doMove.bind(null, item), 
				selectTo: item.Directory ? "" : "." //$NON-NLS-1$ //$NON-NLS-0$
			});
		};

		var renameCommand = new mCommands.Command({
				name: messages["Rename"],
				tooltip: messages["RenameFilesFolders"],
				imageClass: "core-sprite-rename", //$NON-NLS-0$
				id: "eclipse.renameResource", //$NON-NLS-0$
				visibleWhen: function(item) {
					if (!explorer || !explorer.isCommandsVisible()) {
						return false;
					}
					if (Array.isArray(item)) {
						return item.length === 1 && item[0].Name;
					}
					return item.Location && !item.Projects;
				},
				parameters: new mCommandRegistry.ParametersDescription(null, {},
					function(commandInvocation) {
						var items = Array.isArray(commandInvocation.items) ? commandInvocation.items : [commandInvocation.items];
						var treeRoot = explorer.treeRoot;
						if (items.some(function(item) { return (item === treeRoot); })) {
							// Renaming root of file explorer -- want a popup param collector since there is no convenient inplace rename node.
							return [
								new mCommandRegistry.CommandParameter('name', 'text', messages['Name:'], treeRoot.Name) //$NON-NLS-1$ //$NON-NLS-0$
							];
						}
						return null; // will do inplace rename in the callback
					}),
				callback: function(data) {
					var item = forceSingleItem(data.items);
					
					var name;
					if (data.parameters.hasParameters() && (name = data.parameters.valueFor("name")) !== null) { //$NON-NLS-0$
						doMove(item, name);
					} else {
						editAndRename(item, data);
					}
				}
			});
		commandService.addCommand(renameCommand);
		
		var contentTypeService = new mContentTypes.ContentTypeRegistry(serviceRegistry);
		var compareWithEachOtherCommand = new mCommands.Command({
				name: messages["CompareEach"],
				tooltip: messages["Compare 2 files"],
				id: "eclipse.compareWithEachOther", //$NON-NLS-0$
				visibleWhen: function(item) {
					if (!explorer || !explorer.isCommandsVisible()) {
						return false;
					}
					if (Array.isArray(item)) {
						if(item.length === 2 && !item[0].Directory && !item[1].Directory){
							return true;//We should not limit the content type to the known text files here. It is preventing user from comparing two unknown(by Orion) text files.
							/*
							var contentType1 = contentTypeService.getFilenameContentType(item[0].Name);
							var contentType2 = contentTypeService.getFilenameContentType(item[1].Name);
							if(contentType1 && (contentType1['extends'] === "text/plain" || contentType1.id === "text/plain") && //$NON-NLS-2$ //$NON-NLS-1$ //$NON-NLS-0$
							   contentType2 && (contentType2['extends'] === "text/plain" || contentType2.id === "text/plain")){ //$NON-NLS-2$ //$NON-NLS-1$ //$NON-NLS-0$
								return true;
							}*/
						} else if(item.length === 2 && item[0].Directory && item[1].Directory){
							return true;
						}
					}
					return false;
				},
				hrefCallback: function(data) {
					if(data.items[0].Directory && data.items[1].Directory){
						return mCompareUtils.generateCompareTreeHref(data.items[0].Location, {compareTo: data.items[1].Location, readonly: true});
					}
					return mCompareUtils.generateCompareHref(data.items[0].Location, {compareTo: data.items[1].Location, readonly: false, readonlyRight: false}); //$NON-NLS-0$
				}
			});
		commandService.addCommand(compareWithEachOtherCommand);
		
		var compareWithCommand = new mCommands.Command({
			name : messages["Compare with..."],
			tooltip: messages["CompareFolders"], 
			id: "eclipse.compareWith", //$NON-NLS-0$
			visibleWhen: function(item) {
				if (!explorer || !explorer.isCommandsVisible()) {
					return false;
				}
				if (Array.isArray(item)) {
					if(item.length === 1 && item[0].Directory){
						return true;
					}
				}
				return false;
			},
			callback: function(data) {
				var dialog = new DirPrompter.DirectoryPrompterDialog({
					title: messages["Choose a Folder"],
					serviceRegistry: serviceRegistry,
					fileClient: fileClient,				
					func: function(targetFolder) { 
						if (targetFolder && targetFolder.Location) {
							var compareURL = mCompareUtils.generateCompareTreeHref(data.items[0].Location, {compareTo: targetFolder.Location, readonly: true});
							window.open(urlModifier(compareURL));
						}
					}
				});
				dialog.show();
			} 
		});
		commandService.addCommand(compareWithCommand);
		
		var downloadSingleFileCommand = new mCommands.Command({
			name : messages["Download"],
			tooltip: messages["Download_tooltips"], 
			id: "eclipse.downloadSingleFile", //$NON-NLS-0$
			visibleWhen: function(item) {
				if (!explorer || !explorer.isCommandsVisible()) {
					return false;
				}
				if (Array.isArray(item)) {
					if(item.length === 1 && !item[0].Directory){
						return true;
					}
				}
				return false;
			},
			callback: function(data) {
				var statusService = serviceRegistry.getService("orion.page.message"); //$NON-NLS-0$
				var downloader = new mFileDownloader.FileDownloader(fileClient, statusService, progressService);
				var items = Array.isArray(data.items) ? data.items : [data.items];
				var contentType = contentTypeService.getFilenameContentType(items[0].Name);
				downloader.downloadFromLocation(items[0], contentType);
			} 
		});
		commandService.addCommand(downloadSingleFileCommand);
		
		var deleteCommand = new mCommands.Command({
			name: messages["Delete"],
			imageClass: "core-sprite-trashcan", //$NON-NLS-0$
			id: "eclipse.deleteFile", //$NON-NLS-0$
			visibleWhen: oneOrMoreFilesOrFolders,
			callback: function(data) {
				var items = Array.isArray(data.items) ? data.items : [data.items];
				var deleteItemName = items.length === 1 ? items[0].Name : '';			
				if (bidiUtils.isBidiEnabled()) {
					deleteItemName = bidiUtils.enforceTextDirWithUcc(deleteItemName);
				}
				var confirmMessage = items.length === 1 ? i18nUtil.formatMessage(messages["DeleteTrg"], deleteItemName) : i18nUtil.formatMessage(messages["delete item msg"], items.length);
				serviceRegistry.getService("orion.page.dialog").confirm(confirmMessage,  //$NON-NLS-0$
					function(doit) {
						if (!doit) {
							return;
						}
						fileClient.freezeChangeEvents();
						var deferredDeletes = items.map(function(item) {
							var deleteLocation = item.Location;
							return Deferred.when(getLogicalModelItems(item), function(logicalItems) {
								item = logicalItems.item;
								var _delete = fileClient.deleteFile(deleteLocation, {itemLocation: item.Location});
								removeLastModifiedFile(item.Location);
								return progressService.showWhile(_delete, i18nUtil.formatMessage(messages["Deleting ${0}"], deleteLocation)).then(
									function() {
										var id = util.computeAuditId(fileClient, deleteLocation);
										if (id.split("/").length > 1) {
											/* typical case, deletion of a resource that's not a workspace */
											mMetrics.logAudit("delete", "orion-file", {id: id, isData: true});
										} else {
											/* workspace deletion */
											mMetrics.logAudit("delete", "orion-workspace", {id: item.Name, isData: true});
										}

										// Remove deleted item from copy/paste buffer
										bufferedSelection = bufferedSelection.filter(function(element){
											// deleted item is neither equivalent nor a parent of the array element
											return !fileCommandUtils.isEqualToOrChildOf(element, item);
										});
									},
									function(error) {
										var id = util.computeAuditId(fileClient, deleteLocation);
										if (id.split("/").length > 1) {
											/* typical case, deletion of a resource that's not a workspace */
											mMetrics.logAudit("delete", "orion-file", {id: id, isData: true}, error);
										} else {
											/* workspace deletion */
											mMetrics.logAudit("delete", "orion-workspace", {id: item.Name, isData: true}, error);
										}
										errorHandler(error);
									}
								);
							});
						});
						Deferred.all(deferredDeletes).then(function() {
							fileClient.thawChangeEvents();
						}, errorHandler);
					}, null, messages["Delete"]
				);	
			}});
		commandService.addCommand(deleteCommand);
	
		var downloadCommand = new mCommands.Command({
			name: messages["Zip"],
			tooltip: messages["ZipDL"],
			imageClass: "core-sprite-exportzip", //$NON-NLS-0$
			id: "eclipse.downloadFile", //$NON-NLS-0$
			visibleWhen: function(item) {
				if (!explorer || !explorer.isCommandsVisible()) {
					return false;
				}
				item = forceSingleItem(item);
				return item.ExportLocation && item.Directory;
			},
			hrefCallback: function(data) {
				return forceSingleItem(data.items).ExportLocation;
			}
		});
		commandService.addCommand(downloadCommand);

		function createUniqueNameArtifact(parentItem, prefix, createFunction) {
			// get the list of files that already exists in the selected directory and ensure 
			// that the new file's initial name is unique within that directory
						
			var findUniqueName = function(children) {
				var attempt = 0;
				var uniqueName = prefix;
				
				// find a unique name for the new artifact
				var possiblyCollidingNames = children.filter(function(child){
					return 0 === child.Name.indexOf(prefix);
				}).map(function(child){
					return child.Name;
				});
				
				while (-1 !== possiblyCollidingNames.indexOf(uniqueName)){
					attempt++;
					uniqueName = prefix.concat(" (").concat(attempt).concat(")");  //$NON-NLS-1$ //$NON-NLS-0$
				}
				
				return uniqueName;
			};
			
			if (parentItem.children) {
				var uniqueName = findUniqueName(parentItem.children);
				createFunction(uniqueName); // create the artifact
			} else {
				// children have not already been fetched, get them
				var location = parentItem.ChildrenLocation;
				progressService.progress(fileClient.fetchChildren(location), messages["Fetching children of "] + parentItem.Name).then( //$NON-NLS-0$
					function(children){
						var uniqueName = findUniqueName(children);
						createFunction(uniqueName); // create the artifact
					},
					errorHandler);	
			}
		}		

		function getGeneralPreferenceValue(key, defaultValue) {
			if (generalPrefs) {
				return generalPrefs.hasOwnProperty(key) ? generalPrefs[key] : defaultValue;
			}
			return defaultValue;
		}

		var isFileCreationAtRootEnabled = function() {
			return getGeneralPreferenceValue("enableFileCreationAtRoot", false);
		};

		var isFolderCreationAtRootEnabled = function() {
			return getGeneralPreferenceValue("enableFolderCreationAtRoot", false);
		};
		
		var isRefreshButtonEnabled = function() {
			return getGeneralPreferenceValue("enableRefreshButton", false);
		};
		
		var refreshCommand = new mCommands.Command({
			name: messages["Refresh"],
			id: "eclipse.file.refresh",
			callback: function() {
				var fc = serviceRegistry.getService("orion.core.file.client"); //$NON-NLS-1$
				fc.dispatchEvent({
					type: "Changed",
					refresh: [{}]
				});
			},
			visibleWhen: function() {
				return isRefreshButtonEnabled();
			}
		});

		commandService.addCommand(refreshCommand);
		
		/**
		 * Creates a new file or folder as a child of the specified parentItem.
		 */
		function createNewArtifact(namePrefix, parentItem, isDirectory) {
			var createFunction = function(name) {
				if (name) {
					var location = parentItem.Location;
					var functionName = isDirectory ? "createFolder" : "createFile";
					var deferred = fileClient[functionName](location, name, {select: true});
					progressService.showWhile(deferred, i18nUtil.formatMessage(messages["Creating ${0}"], name)).then(
						function(newArtifact) {
							mMetrics.logAudit("create", "orion-file", {id: util.computeAuditId(fileClient, newArtifact.Location), isData: true});
						},
						function(error) {
							var destination = location + (/\/$/.test(location) ? "" : "/") + name;
							mMetrics.logAudit("create", "orion-file", {id: util.computeAuditId(fileClient, destination), isData: true}, error);
							if (error.status === 400 || error.status === 412) {
								var resp = error.responseText;
								if (typeof resp === "string") {
									try {
										resp = JSON.parse(resp);
										resp.Message = i18nUtil.formatMessage(messages["FailedToCreateFile"], name);
										error = resp;
									} catch(error) {}
								}
							}
							errorHandler(error);
						}
					);
				}
			};
			
			createUniqueNameArtifact(parentItem, namePrefix, function(uniqueName){
				getNewItemName(explorer, parentItem, explorer.getRow(parentItem), uniqueName, function(name) {
					createFunction(name);
				});
			});
		}
		
		var getParentItem = function(selections, items){
			var item = getTargetFolder(selections);
			if (!item || !item.Location) {
				item = explorer.treeRoot;
				if (item.Project) {
					item = item.children[0];
				}
			}
			return item;
		};
		
		var newFileCommand = new mCommands.Command({
			name: messages["New File"],
			tooltip: messages["Create a new file"],
			imageClass: "core-sprite-new_file", //$NON-NLS-0$
			id: "eclipse.newFile", //$NON-NLS-0$
			callback: function(data) {
				var item = getParentItem(data.items);
				createNewArtifact(messages["New File"], item, false);
			},
			visibleWhen: function(item) {
				return isFileCreationAtRootEnabled() || checkFolderSelection(item) || util.isElectron;
			}
		});
		commandService.addCommand(newFileCommand);
		
		var newFolderCommand = new mCommands.Command({
			name: messages['New Folder'],
			tooltip: messages["Create a new folder"],
			imageClass: "core-sprite-new_folder", //$NON-NLS-0$
			id: "eclipse.newFolder", //$NON-NLS-0$
			callback: function(data) {
				var item = getParentItem(data.items);
				createNewArtifact(messages["New Folder"], item, true);
			},
			visibleWhen: function(item) {
				return isFolderCreationAtRootEnabled() || (checkFolderSelection(item) && !mFileUtils.isAtRoot(item.Location));
			}
		});
		commandService.addCommand(newFolderCommand);

		var zipURLParameters = new mCommandRegistry.ParametersDescription([new mCommandRegistry.CommandParameter('url', 'url', messages['File URL:'], 'URL'), new mCommandRegistry.CommandParameter('unzip', 'boolean', messages["Unzip *.zip files"], true)]);//$NON-NLS-4$  //$NON-NLS-3$  //$NON-NLS-2$  //$NON-NLS-1$ //$NON-NLS-0$

		var importZipURLCommand = new mCommands.Command({
			name: messages["Import from HTTP..."],
			tooltip: messages["ImportURL"],
			id: "orion.importZipURL", //$NON-NLS-0$
			parameters: zipURLParameters,
			callback: function(data) {
				var targetFolder = getTargetFolder(data.items);
				var sourceURL = data.parameters && data.parameters.valueFor("url"); //$NON-NLS-0$
				if (targetFolder && sourceURL) {
					var importURL = targetFolder.ImportLocation + (targetFolder.ImportLocation.indexOf("?")=== -1 ? "?":"&") + "source="+encodeURIComponent(sourceURL); //$NON-NLS-3$ //$NON-NLS-2$ //$NON-NLS-1$ //$NON-NLS-0$
					var expandZip = data.parameters && data.parameters.valueFor("unzip") && (sourceURL.indexOf(".zip") === sourceURL.length-4); //$NON-NLS-1$ //$NON-NLS-0$
					var optionHeader = expandZip ? "" : "raw"; //$NON-NLS-1$ //$NON-NLS-0$
					var deferred = fileClient.remoteImport(importURL, {"OptionHeader":optionHeader}, targetFolder.Location); //$NON-NLS-0$
					progressService.showWhile(deferred, i18nUtil.formatMessage(messages["Importing from ${0}"], sourceURL)).then(
						function() {
						}
					);
				}
			},
			visibleWhen: function(item) {
				return isFileCreationAtRootEnabled() || checkFolderSelection(item);
			}
		});
		commandService.addCommand(importZipURLCommand);
		
		var newProjectCommand = new mCommands.Command({
			name: messages["New Folder"],
			imageClass: "core-sprite-new_folder", //$NON-NLS-0$
			tooltip: messages["Create an empty folder"],
			description: messages["CreateEmptyMsg"],
			id: "orion.new.project", //$NON-NLS-0$
			callback: function(data) {
				var item;
				if (getTargetFolder(data.items)) {
					newFolderCommand.callback(data);
				} else {
					item = forceSingleItem(data.items);
					var defaultName = messages['New Folder']; //$NON-NLS-0$
					createUniqueNameArtifact(item, defaultName, function(uniqueName){
						getNewItemName(explorer, item, explorer.getRow(item), uniqueName, function(name) {
							createProject(explorer, fileClient, progressService, name);
						});
					});
				} 
			},
			visibleWhen: function(item) {
				return canCreateProject(item) && !isFolderCreationAtRootEnabled();
			}
		});
		commandService.addCommand(newProjectCommand);
		
		var goUpCommand = new mCommands.Command({
			name: messages["Go Up"],
			tooltip: messages["GoUpToParent"],
			imageClass: "core-sprite-go-up", //$NON-NLS-0$
//			addImageClassToElement: true,
			id: "eclipse.upFolder", //$NON-NLS-0$
			callback: function(data) {
				if (typeof explorer.scopeUp === "function") { //$NON-NLS-0$
					explorer.scopeUp();
				}
			},
			visibleWhen: function(item) {
				if (!explorer || !explorer.isCommandsVisible()) {
					return false;
				}
				item = explorer.treeRoot;
				return item.Parents || item.type === "Project"; //$NON-NLS-0$
			}
		});
		commandService.addCommand(goUpCommand);

		var goIntoCommand = new mCommands.Command({
			name: messages["Go Into"],
			tooltip: messages["GoSelectedFolder"],
			imageClass: "core-sprite-go-down", //$NON-NLS-0$
			id: "eclipse.downFolder", //$NON-NLS-0$
			callback: function(data) {
				if (typeof explorer.scopeDown === "function") { //$NON-NLS-0$
					explorer.scopeDown(data.items[0]);
				}
			},
			visibleWhen: function(item) {
				if (!explorer || !explorer.isCommandsVisible()) {
					return false;
				}
				if (typeof explorer.scopeDown !== "function") { //$NON-NLS-0$
					return false;
				}
				item = forceSingleItem(item);
				return item.Directory && item.Location !== explorer.treeRoot.Location;
			}
		});
		commandService.addCommand(goIntoCommand);
					
		var importCommand = new mCommands.Command({
			name : messages["File or zip archive"],
			tooltip: messages["ImportLcFile"],
			imageClass: "core-sprite-importzip", //$NON-NLS-0$
			id: "orion.import", //$NON-NLS-0$
			callback : function(data) {
				var item = getTargetFolder(data.items);
				var fileInput = lib.node("fileSelectorInput");
				var cloneInput = fileInput.cloneNode(); // clone file input before its value is changed
				var expandItem = explorer.treeRoot.ChildrenLocation === item.ChildrenLocation ? false : true;

				var changeListener = function(){ //$NON-NLS-0$
					if (fileInput.files && fileInput.files.length > 0) {
						for (var i = 0; i < fileInput.files.length; i++) {
							explorer._uploadFile(item, fileInput.files.item(i), expandItem);
						}
					}
					
					fileInput.removeEventListener("change", changeListener);
				};
				
				fileInput.addEventListener("change", changeListener);
				fileInput.click();
				
				//replace original fileInput so that "change" event always fires
				fileInput.parentNode.replaceChild(cloneInput, fileInput);
				
			},
			visibleWhen: function(item) {
				return isFileCreationAtRootEnabled() || checkFolderSelection(item);
			}
		});
		commandService.addCommand(importCommand);
		
		var copyCommand = new mCommands.Command({
			name : messages["Copy to"],
			tooltip: "Copy files and folders to a specified location", //$NON-NLS-0$
			id: "eclipse.copyFile", //$NON-NLS-0$
			choiceCallback: function(items, userData) {
				return makeMoveCopyTargetChoices(items, userData, true);
			},
			visibleWhen: oneOrMoreFilesOrFolders 
		});
		commandService.addCommand(copyCommand);
		
		var moveCommand = new mCommands.Command({
			name : messages["Move to"],
			tooltip: messages["MvToLocation"],
			id: "eclipse.moveFile", //$NON-NLS-0$
			choiceCallback: function(items, userData) {
				return makeMoveCopyTargetChoices(items, userData, false);
			},
			visibleWhen: oneOrMoreFilesOrFolders
		});
		commandService.addCommand(moveCommand);
		
		var copyToBuffer = function(data) {
			var navHandler = explorer.getNavHandler();
			// re-enable items that were previously cut and not yet pasted, if any
			if (isCutInProgress) {
				bufferedSelection.forEach(function(previouslyCutItem){
					navHandler.enableItem(previouslyCutItem);
				});
			}
			isCutInProgress = false; // reset the state, caller should set to true if necessary
			bufferedSelection = data.items;
		};
		
		var cutCommand = new mCommands.Command({
			name: messages["Cut"],
			id: "eclipse.cut", //$NON-NLS-0$
			callback: function(data) {
				var navHandler = explorer.getNavHandler();
				
				copyToBuffer(data);
				
				if (bufferedSelection.length) {
					isCutInProgress = true;
					// disable cut items in explorer
					bufferedSelection.forEach(function(cutItem){
						navHandler.disableItem(cutItem);
					});
				}
			},
			visibleWhen: oneOrMoreFilesOrFolders
		});
		commandService.addCommand(cutCommand);
		
		var copyToBufferCommand = new mCommands.Command({
			name: messages["Copy"],
			id: "eclipse.copySelections", //$NON-NLS-0$
			callback: copyToBuffer,
			visibleWhen: oneOrMoreFilesOrFolders
		});
		commandService.addCommand(copyToBufferCommand);
		
		var canPaste = function(items){
			if (!explorer || !explorer.isCommandsVisible()) {
				return false;
			}
			var folder = checkFolderSelection(items, true);
			if (folder && mFileUtils.isAtRoot(folder.Location)) {
				if (bufferedSelection && bufferedSelection.some(function(currentItem) {
					if (!currentItem.Directory) return true;
				})) {
					return false;
				}
			}
			return true;
		};
		
		var pasteFromBufferCommand = new mCommands.Command({
				name: messages["Paste"],
				id: "eclipse.pasteSelections", //$NON-NLS-0$
				visibleWhen: canPaste,
				callback: function(data) {
					var item = getTargetFolder(data.items, true);
					if (bufferedSelection.length > 0 && item) {
						// Do not allow pasting into the Root of the Workspace
						if (mFileUtils.isAtRoot(item.Location) && !item.Directory) {
							errorHandler(messages["Cannot paste into the root"]);
							return;
						}
						var fileOperation = isCutInProgress ? fileClient.moveFile : fileClient.copyFile;
						var deferreds = [];
						fileClient.freezeChangeEvents();
						bufferedSelection.forEach(function(selectedItem) {
							var location = selectedItem.Location;
							var name = selectedItem.Name || null;
							if (location) {
								var itemLocation = item.Location || item.ContentLocation;
								var prompt = false;
								if (selectedItem.parent && selectedItem.parent.Location === itemLocation) {
									prompt = true;
								} else {
									//TODO: if tree is not expanded, the children must be fetched from the server.
									var children = item.Children || item.children;
									if (children) {
										prompt = children.some(function(child) {
											return child.Name === selectedItem.Name;
										});
									}
								}
								function doOperation() {
									if (location) {
										var deferred1 = fileOperation.apply(fileClient, [location, itemLocation, name]);
										var messageKey1 = isCutInProgress ? "Moving ${0}": "Pasting ${0}"; //$NON-NLS-1$ //$NON-NLS-0$
										deferreds.push(progressService.showWhile(deferred1, i18nUtil.formatMessage(messages[messageKey1], location)).then(
											function(result) {
												sendCopyOrMoveAuditEvent(!isCutInProgress, fileClient, location, result.Location, null, result.Directory);
											},
											function(error) {
												errorHandler(error);
												var destination = itemLocation + (/\/$/.test(itemLocation) ? "" : "/") + name;
												sendCopyOrMoveAuditEvent(!isCutInProgress, fileClient, location, destination, error);
											}
										));
									}
								}
								if (prompt) {
									var node = document.getElementById(explorer.model.getId(item) + "MainCol");
									commandService.prompt(node, i18nUtil.formatMessage(messages['EnterName'], bidiUtils.enforceTextDirWithUcc(selectedItem.Name)), messages['Ok'], messages['Cancel'], 
										i18nUtil.formatMessage(messages['Copy of ${0}'], selectedItem.Name), false, function(newname) {
											// user cancelled?  don't copy this one
											if (!newname) {
												location = null;
											}
											name = newname;
											doOperation();
									}, "below");
								}else{
									doOperation();
								}
							}
						});
						Deferred.all(deferreds).then(function() {
							fileClient.thawChangeEvents();
							
							if (isCutInProgress) {
								var navHandler = explorer.getNavHandler();
								bufferedSelection.forEach(function(pastedItem){
									navHandler.enableItem(pastedItem);
								});
								bufferedSelection = [];
								isCutInProgress = false;
							}
						});
					}
				}
			});
		commandService.addCommand(pasteFromBufferCommand);
		return new Deferred().resolve();
	};
		
	fileCommandUtils.createNewContentCommand = function(id, name, href, hrefContent, explorer, fileClient, progress, progressMessage) {
		var parametersArray = href ? [] : [
			new mCommandRegistry.CommandParameter("folderName", "text", messages['Folder name:'], name), //$NON-NLS-1$ //$NON-NLS-0$
			new mCommandRegistry.CommandParameter("url", "url", messages['Extracted from:'], hrefContent), //$NON-NLS-1$ //$NON-NLS-0$
			new mCommandRegistry.CommandParameter("unzip", "boolean", messages['Unzip *.zip files'], true) //$NON-NLS-1$ //$NON-NLS-0$
		];
		var parameterDescription = null;
		if (parametersArray.length > 0) {
			parameterDescription = new mCommandRegistry.ParametersDescription(parametersArray);
		}

		var newContentCommand = new mCommands.Command({
			name: name,
			parameters: parameterDescription,
			id: id,
			callback: function(data) {
				if (href) {
					window.open(urlModifier(href));
				} else {
					if (data.parameters && data.parameters.valueFor('folderName')) { //$NON-NLS-0$
						var newFolderName = data.parameters.valueFor('folderName'); //$NON-NLS-0$
						createProject(explorer, fileClient, progress, newFolderName, 
							function(folder) {
								data.parameters.clientCollect = true;
								data.commandRegistry.runCommand("orion.importZipURL", folder, explorer, data.parameters); //$NON-NLS-0$
							}); 
					} else {
						getNewItemName(explorer, data.items, data.domNode.id, name, function(name) {
								createProject(explorer, fileClient, progress, name,
								function(folder) {
									data.commandRegistry.runCommand("orion.importZipURL", folder, explorer, data.parameters); //$NON-NLS-0$
								});
							});
					}
				}
			},
			visibleWhen: function(item) {
				if (!explorer || !explorer.isCommandsVisible()) {
					return false;
				}
				item = forceSingleItem(item);
				return item.Location && mFileUtils.isAtRoot(item.Location);
			}
		});
		return newContentCommand;
	};
	
	return fileCommandUtils;
});
