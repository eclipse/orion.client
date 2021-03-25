/*******************************************************************************
 * @license
 * Copyright (c) 2010, 2017 IBM Corporation and others.
 * All rights reserved. This program and the accompanying materials are made
 * available under the terms of the Eclipse Public License 2.0
 * (http://www.eclipse.org/legal/epl-v10.html), and the Eclipse Distribution
 * License v1.0 (http://www.eclipse.org/org/documents/edl-v10.html).
 *
 * Contributors: IBM Corporation - initial API and implementation
 ******************************************************************************/

/*eslint-env browser, amd*/
/** @namespace The global container for eclipse APIs. */
define([
	'i18n!orion/navigate/nls/messages',
	"orion/Deferred",
	"orion/i18nUtil",
	'orion/EventTarget'
], function(messages, Deferred, i18nUtil, EventTarget) {
	/**
	 * This helper method implements invocation of the service call,
	 * with retry on authentication error if needed.
	 * @private
	 */
	function _doServiceCall(fileService, funcName, funcArgs) {
		//if the function is not implemented in the file service, we throw an exception to the caller
		if(!fileService[funcName]){
			throw new Error(i18nUtil.formatMessage(messages["NotSupportFileSystem"], funcName));
		}
		return fileService[funcName].apply(fileService, funcArgs);
	}

	/**
	 * @description Copy
	 * @private
	 * @param sourceService
	 * @param sourceLocation
	 * @param targetService
	 * @param targetLocation
	 * @returns returns
	 */
	function _copy(sourceService, sourceLocation, targetService, targetLocation) {

		if (!sourceService.readBlob) {
			throw new Error(messages["SrcNotSupportBinRead"]);
		}

		if (!targetService.writeBlob) {
			throw new Error(messages["TargetNotSupportBinWrite"]);
		}

		if (sourceLocation[sourceLocation.length -1] !== "/") {
			return _doServiceCall(sourceService, "readBlob", [sourceLocation]).then(function(contents) { //$NON-NLS-1$
				return _doServiceCall(targetService, "writeBlob", [targetLocation, contents]); //$NON-NLS-1$
			});
		}

		var temp = targetLocation.substring(0, targetLocation.length - 1);
		var targetName = decodeURIComponent(temp.substring(temp.lastIndexOf("/")+1));
		var parentLocation = temp.substring(0, temp.lastIndexOf("/")+1);

		return _doServiceCall(targetService, "createFolder", [parentLocation, targetName]).then(function() { //$NON-NLS-1$
			return;
		}, function() {
			return;
		}).then(function() {
			return _doServiceCall(sourceService, "fetchChildren", [sourceLocation]).then(function(children) { //$NON-NLS-1$
				var results = [];
				for(var i = 0; i < children.length; ++i) {
					var childSourceLocation = children[i].Location;
					var childTemp =  childSourceLocation;
					if (children[i].Directory) {
						childTemp = childSourceLocation.substring(0, childSourceLocation.length - 1);
					}
					var childName = decodeURIComponent(childTemp.substring(childTemp.lastIndexOf("/")+1));

					var childTargetLocation = targetLocation + encodeURIComponent(childName);
					if (children[i].Directory) {
						childTargetLocation += "/";
					}
					results[i] = _copy(sourceService, childSourceLocation, targetService, childTargetLocation);
				}
				return Deferred.all(results);
			});
		});
	}


	/**
	 * Creates a new file client.
	 * @class The file client provides a convenience API for interacting with file services
	 * provided by plugins. This class handles authorization, and authentication-related
	 * error handling.
	 * @name orion.fileClient.FileClient
	 */
	function FileClient(serviceRegistry, filter) {
		var _patterns;
		var _services;
		var _names;

		EventTarget.attach(this);
		/* @callback */
		function _noMatch(loc) {
			var d = new Deferred();
			d.reject(messages["No Matching FileService for location:"] + loc);
			return d;
		}

		var _fileSystemsRoots = [];
		var _allFileSystemsService = {
			/* @callback */
			fetchChildren: function() {
				var d = new Deferred();
				d.resolve(_fileSystemsRoots);
				return d;
			},
			/* @callback */
			createWorkspace: function() {
				var d = new Deferred();
				d.reject(messages["no file service"]);
				return d;
			},
			/* @callback */
			loadWorkspaces: function() {
				var d = new Deferred();
				d.reject(messages['no file service']);
				return d;
			},
			/* @callback */
			loadWorkspace: function(loc) {
				var d = new Deferred();
				window.setTimeout(function() {
					d.resolve({
						Directory: true,
						Length: 0,
						LocalTimeStamp: 0,
						Name: messages["File Servers"],
						Location: "/",
						Children: _fileSystemsRoots,
						ChildrenLocation: "/"
					});
				}, 100);
				return d;
			},
			/* @callback */
			read: function(loc) {
				if (loc === "/") {
					return this.loadWorkspace(loc);
				}
				return _noMatch(loc);
			},
			/**
			 * @description Computes the project context from the given location
			 * @param {String} context The resource context to find the project for
			 * @since 14.0
			 */
			getProject: _noMatch,
			search: _noMatch,
			createProject: _noMatch,
			createFolder: _noMatch,
			createFile: _noMatch,
			deleteFile: _noMatch,
			moveFile: _noMatch,
			copyFile: _noMatch,
			write: _noMatch
		};

		/**
		 * @description Initialize the service
		 * @private
		 */
		function init() {
			if (_services) { return; }
			_patterns = [];
			_services = [];
			_names = [];

			var allReferences = serviceRegistry.getServiceReferences("orion.core.file"); //$NON-NLS-1$
			var _references = allReferences;
			if (filter) {
				_references = [];
				for(var i = 0; i < allReferences.length; ++i) {
					if (filter(allReferences[i])) {
						_references.push(allReferences[i]);
					}
				}
			}
			_references.sort(function (ref1, ref2) {
				var ranking1 = ref1.getProperty("ranking") || 0; //$NON-NLS-1$
				var ranking2 = ref2.getProperty("ranking")  || 0; //$NON-NLS-1$
				return ranking1 - ranking2;
			});
			for(var j = 0; j < _references.length; ++j) {
				_fileSystemsRoots[j] = {
					Directory: true,
					Length: 0,
					LocalTimeStamp: 0,
					Location: _references[j].getProperty("top"), //$NON-NLS-1$
					ChildrenLocation: _references[j].getProperty("top"), //$NON-NLS-1$
					Name: _references[j].getProperty("Name") || _references[j].getProperty("NameKey") //$NON-NLS-1$ //$NON-NLS-2$
				};

				var filetop = _references[j].getProperty("top"); //$NON-NLS-1$
				var patternStringArray = _references[j].getProperty("pattern") || (filetop ? filetop.replace(/([.*+?^=!:${}()|\[\]\/\\])/g, "\\$1") : ""); //$NON-NLS-1$ //$NON-NLS-2$
				if (!Array.isArray(patternStringArray)) {
					patternStringArray = [patternStringArray];
				}
				var patterns = [];
				for (var k = 0; k < patternStringArray.length; k++) {
					var patternString = patternStringArray[k];
					if (patternString[0] !== "^") {
						patternString = "^" + patternString;
					}
					patterns.push(new RegExp(patternString));
				}
				_patterns[j] = patterns;
				_services[j] = serviceRegistry.getService(_references[j]);
				_names[j] = _references[j].getProperty("Name") || _references[j].getProperty("NameKey"); //$NON-NLS-1$ //$NON-NLS-2$
			}
		}

		/**
		 * @description Returns the index of the service for the given item location
		 * @function
		 * @private
		 * @param {String} itemLocation
		 * @returns returns
		 */
		this._getServiceIndex = function(itemLocation) {
			init();
			// client must specify via "/" when a multi file service tree is truly wanted
			if (itemLocation === "/") {
				return -1;
			} else if (!itemLocation || itemLocation.length && itemLocation.length === 0) {
				// TODO we could make the default file service a preference but for now we use the first one
				return _services[0] ? 0 : -1;
			}
			for(var i = 0; i < _patterns.length; ++i) {
				for (var j = 0; j < _patterns[i].length; j++) {
					if (_patterns[i][j].test(itemLocation)) {
						return i;
					}
				}
			}
			return -1;
			//throw new Error(i18nUtil.formatMessage(messages['NoFileSrv'], itemLocation));
		};
		/**
		 * Returns the file service managing this location
		 * @param {String} itemLocation The location of the item
		 * @private
		 * @returns {FileClient} The service for the given item
		 */
		this._getService = function(itemLocation) {
			var i = this._getServiceIndex(itemLocation);
			return i === -1 ? _allFileSystemsService : _services[i];
		};
		/**
		 * Returns the name of the file service managing this location
		 * @param {String} itemLocation The location of the item
		 * @private
		 * @return {String} The name of this file service
		 */
		this._getServiceName = function(itemLocation) {
			var i = this._getServiceIndex(itemLocation);
			return i === -1 ? _allFileSystemsService.Name : _names[i];
		};
		/**
		 * Returns the root url of the file service managing this location
		 * @param {String} itemLocation The location of the item
		 * @private
		 * @return {String} The root URL of the given item
		 */
		this._getServiceRootURL = function(itemLocation) {
			var i = this._getServiceIndex(itemLocation);
			return i === -1 ? _allFileSystemsService.Location : _fileSystemsRoots[i].Location;
		};

		this._frozenEvent = {type: "Changed"};
		this._eventFrozenMode = false;

		serviceRegistry.registerService("orion.core.file.client", this); //$NON-NLS-1$
	}

	FileClient.prototype = /**@lends orion.fileClient.FileClient.prototype */ {
		freezeChangeEvents: function() {
			this._frozenEvent = {type: "Changed"};
			this._eventFrozenMode = true;
		},
		thawChangeEvents: function() {
			this._eventFrozenMode = false;
			this.dispatchEvent(this._frozenEvent);
		},
		isEventFrozen: function() {
			return this._eventFrozenMode;
		},

		/**
		 * Returns the file service managing this location
		 * @param {String} itemLocation The location of the item
		 * @public
		 * @returns {FileClient} The service for the given item
		 */
		getService: function(itemLocation) {
			return this._getService(itemLocation);
		},

		/**
		 * Returns the name of the file service managing this location
		 * @param {String} itemLocation The location of the item
		 * @public
		 * @return {String} The name of this file service
		 */
		fileServiceName: function(itemLocation) {
			return this._getServiceName(itemLocation);
		},

		/**
		 * Returns the root url of the file service managing this location
		 * @param {String} itemLocation The location of the item
		 * @public
		 * @return {String} The root URL of the given item
		 */
		fileServiceRootURL: function(itemLocation) {
			return this._getServiceRootURL(itemLocation);
		},

		/**
		 * Obtains the children of a remote resource
		 * @param {string} parentLocation The location of the item to obtain children for
		 * @public
		 * @return {Deferred} A deferred that will provide the array of child objects when complete
		 */
		fetchChildren: function(parentLocation) {
			return _doServiceCall(this._getService(parentLocation), "fetchChildren", arguments); //$NON-NLS-1$
		},

		/**
		 * Creates a new workspace with the given name. The resulting workspace is
		 * passed as a parameter to the provided onCreate function.
		 * @param {String} workspaceName The name of the new workspace
		 * @public
		 * @return {Deferred} A deferred that will create a workspace with the given name
		 */
		createWorkspace: function(workspaceName) {
			return _doServiceCall(this._getService(), "createWorkspace", arguments); //$NON-NLS-1$
		},

		/**
		 * Loads all the user's workspaces for the specified file system. Returns a deferred
		 * that will provide the loaded workspaces when ready.
		 * @public
		 * @return {Deferred} A deferred that will load all workspaces
		 */
		loadWorkspaces: function(systemLocation) {
			return _doServiceCall(this._getService(systemLocation), "loadWorkspaces", arguments); //$NON-NLS-1$
		},

		/**
		 * Loads the workspace with the given id and sets it to be the current
		 * workspace for the IDE. The workspace is created if none already exists.
		 * @param {String} workspaceLocation the location of the workspace to load
		 * @param {Function} onLoad the function to invoke when the workspace is loaded
		 * @public
		 * @return {Deferred} A deferred that will load the specified workspace
		 */
		loadWorkspace: function(workspaceLocation) {
			return _doServiceCall(this._getService(workspaceLocation), "loadWorkspace", arguments); //$NON-NLS-1$
		},
		
		/**
		 * Gets the workspace of the specified resource location.
		 * 
		 * @param resourceLocation the resource to lookup the workspace
		 * @return {Deferred} A deferred that will load the specified workspace
		 */
		getWorkspace: function(resourceLocation) {
			return _doServiceCall(this._getService(resourceLocation), "getWorkspace", arguments); //$NON-NLS-1$
		},

		/**
		 * @callback
		 */
		changeWorkspace: function(workspaceLocation) {
			return _doServiceCall(this._getService(), "changeWorkspace", arguments); //$NON-NLS-1$
		},
		/**
		 * @description Computes the project context from the given location
		 * @param {String} context The resource context to find the project for
		 * @since 14.0
		 */
		getProject: function getProject(resource) {
			return _doServiceCall(this._getService(resource), "getProject", arguments);	
		},
		_createArtifact: function(parentLocation, funcName, eventData, funcArgs) {
			return _doServiceCall(this._getService(parentLocation), funcName, funcArgs).then(function(result){
				if(this.isEventFrozen()) {
					if(!this._frozenEvent.created) {
						this._frozenEvent.created = [];
					}
					this._frozenEvent.created.push({parent: parentLocation, result: result, eventData: eventData});
				} else {
					this.dispatchEvent({ type: "Changed", created: [{parent: parentLocation, result: result, eventData: eventData}]}); //$NON-NLS-0$
				}
				return result;
			}.bind(this));
		},

		/**
		 * Adds a project to a workspace.
		 * @param {String} url The workspace location
		 * @param {String} projectName the human-readable name of the project
		 * @param {String} serverPath The optional path of the project on the server.
		 * @param {Boolean} create If true, the project is created on the server file system if it doesn't already exist
		 * @public
		 * @return {Deferred} A deferred that will create a new project in the workspace
		 */
		createProject: function(url, projectName, serverPath, create) {
			return _doServiceCall(this._getService(url), "createProject", arguments); //$NON-NLS-1$
			//return this._createArtifact(url, "createProject", arguments);
		},
		/**
		 * Creates a folder.
		 * @param {String} parentLocation The location of the parent folder
		 * @param {String} folderName The name of the folder to create
		 * @param {Object} eventData The event data that will be sent back.
		 * @return {Object} JSON representation of the created folder
		 * @public
		 * @return {Deferred} A deferred that will create a new folder in the workspace
		 */
		createFolder: function(parentLocation, folderName, eventData) {
			//return _doServiceCall(this._getService(parentLocation), "createFolder", arguments); //$NON-NLS-1$
			return this._createArtifact(parentLocation, "createFolder", eventData, arguments);
		},
		/**
		 * Create a new file in a specified location. Returns a deferred that will provide
		 * The new file object when ready.
		 * @param {String} parentLocation The location of the parent folder
		 * @param {String} fileName The name of the file to create
		 * @param {Object} eventData The event data that will be sent back.
		 * @public
		 * @return {Deferred} A deferred that will provide the new file object
		 */
		createFile: function(parentLocation, fileName, eventData) {
			//return _doServiceCall(this._getService(parentLocation), "createFile", arguments); //$NON-NLS-1$
			return this._createArtifact(parentLocation, "createFile", eventData, arguments);
		},
		/**
		 * Deletes a file, directory, project or workspace.
		 * @param {String} deleteLocation The location of the file or directory to delete.
		 * @param {Object} eventData The event data that will be sent back.
		 * @public
		 * @returns {Deferred} A deferred that will delete the given file
		 */
		deleteFile: function(deleteLocation, eventData) {
			//return _doServiceCall(this._getService(deleteLocation), "deleteFile", arguments); //$NON-NLS-1$
			return _doServiceCall(this._getService(deleteLocation), "deleteFile", arguments).then(function(result){ //$NON-NLS-0$
				if(this.isEventFrozen()) {
					if(!this._frozenEvent.deleted) {
						this._frozenEvent.deleted = [];
					}
					this._frozenEvent.deleted.push({deleteLocation: deleteLocation, eventData: eventData});
				} else {
					this.dispatchEvent({ type: "Changed", deleted: [{deleteLocation: deleteLocation, eventData: eventData}]}); //$NON-NLS-0$
				}
				return result;
			}.bind(this));
		},

		/**
		 * Moves a file or directory.
		 * @param {String} sourceLocation The location of the file or directory to move.
		 * @param {String} targetLocation The location of the target folder.
		 * @param {String} targetName The name of the destination file or directory in the case of a rename
		 * @public
		 * @returns {Deferred} A deferred that will move the given file to its new location
		 */
		moveFile: function(sourceLocation, targetLocation, targetName) {
			var sourceService = this._getService(sourceLocation);
			var targetService = this._getService(targetLocation);

			if (sourceService === targetService) {
				//return _doServiceCall(sourceService, "moveFile", arguments);
				return _doServiceCall(sourceService, "moveFile", arguments).then(function(result){ //$NON-NLS-0$
					if(this.isEventFrozen()) {
						if(!this._frozenEvent.moved) {
							this._frozenEvent.moved = [];
						}
						this._frozenEvent.moved.push({source: sourceLocation, target: targetLocation, result: result});
					} else {
						this.dispatchEvent({ type: "Changed", moved: [{source: sourceLocation, target: targetLocation, result: result}]}); //$NON-NLS-0$
					}
					return result;
				}.bind(this));
			}

			var isDirectory = sourceLocation[sourceLocation.length -1] === "/";
			var target = targetLocation;

			if (target[target.length -1] !== "/") {
				target += "/";
			}

			if (targetName) {
				target += encodeURIComponent(targetName);
			} else {
				var temp = sourceLocation;
				if (isDirectory) {
					temp = temp.substring(0, temp.length - 1);
				}
				target += temp.substring(temp.lastIndexOf("/")+1);
			}

			if (isDirectory && target[target.length -1] !== "/") {
				target += "/";
			}

			return _copy(sourceService, sourceLocation, targetService, target).then(function() {
				return _doServiceCall(sourceService, "deleteFile", [sourceLocation]); //$NON-NLS-1$
			});

		},

		/**
		 * Copies a file or directory.
		 * @param {String} sourceLocation The location of the file or directory to copy.
		 * @param {String} targetLocation The location of the target folder.
		 * @param {String} targetName The name of the destination file or directory in the case of a rename
		 * @public
		 * @returns {Deferred} A deferred that will copy the given file to its new location
		 */
		copyFile: function(sourceLocation, targetLocation, targetName) {
			var sourceService = this._getService(sourceLocation);
			var targetService = this._getService(targetLocation);

			if (sourceService === targetService) {
				//return _doServiceCall(sourceService, "copyFile", arguments);				 //$NON-NLS-1$
				return _doServiceCall(sourceService, "copyFile", arguments).then(function(result){ //$NON-NLS-0$
					if(this.isEventFrozen()) {
						if(!this._frozenEvent.copied) {
							this._frozenEvent.copied = [];
						}
						this._frozenEvent.copied.push({source: sourceLocation, target: targetLocation, result: result});
					} else {
						this.dispatchEvent({ type: "Changed", copied: [{source: sourceLocation, target: targetLocation, result: result}]}); //$NON-NLS-0$
					}
					return result;
				}.bind(this));
			}

			var isDirectory = sourceLocation[sourceLocation.length -1] === "/";
			var target = targetLocation;

			if (target[target.length -1] !== "/") {
				target += "/";
			}

			if (targetName) {
				target += encodeURIComponent(targetName);
			} else {
				var temp = sourceLocation;
				if (isDirectory) {
					temp = temp.substring(0, temp.length - 1);
				}
				target += temp.substring(temp.lastIndexOf("/")+1);
			}

			if (isDirectory && target[target.length -1] !== "/") {
				target += "/";
			}

			return _copy(sourceService, sourceLocation, targetService, target);
		},

		/**
		 * Returns the contents or metadata of the file at the given location.
		 *
		 * @param {String} readLocation The location of the file to get contents for
		 * @param {Boolean} [isMetadata] If defined and true, returns the file metadata,
		 *   otherwise file contents are returned
		 * @public
		 * @return {Deferred} A deferred that will be provided with the contents or metadata when available
		 */
		read: function(readLocation, isMetadata) {
			return _doServiceCall(this._getService(readLocation), "read", arguments); //$NON-NLS-1$
		},

		/**
		 * Returns the blob contents of the file at the given location.
		 *
		 * @param {String} readLocation The location of the file to get contents for
		 * @public
		 * @return {Deferred} A deferred that will be provided with the blob contents when available
		 */
		readBlob: function(readLocation) {
			return _doServiceCall(this._getService(readLocation), "readBlob", arguments); //$NON-NLS-1$
		},

		/**
		 * Writes the contents or metadata of the file at the given location.
		 *
		 * @param {String} writeLocation The location of the file to set contents for
		 * @param {String|Object} contents The content string, or metadata object to write
		 * @param {String|Object} args Additional arguments used during write operation (i.e. ETag)
		 * @public
		 * @return {Deferred} A deferred for chaining events after the write completes with new metadata object
		 */
		write: function(writeLocation, contents, args) {
			//return _doServiceCall(this._getService(writeLocation), "write", arguments); //$NON-NLS-1$
			return _doServiceCall(this._getService(writeLocation), "write", arguments).then(function(result){ //$NON-NLS-0$
				if(this.isEventFrozen()) {
					if(!this._frozenEvent.modified) {
						this._frozenEvent.modified = [];
					}
					this._frozenEvent.modified.push(writeLocation);
				} else {
					this.dispatchEvent({ type: "Changed", modified: [writeLocation]}); //$NON-NLS-0$
				}
				return result;
			}.bind(this));
		},

		/**
		 * Imports file and directory contents from another server
		 *
		 * @param {String} targetLocation The location of the folder to import into
		 * @param {Object} options An object specifying the import parameters
		 * @public
		 * @return {Deferred} A deferred for chaining events after the import completes
		 */
		remoteImport: function(targetLocation, options, parentLocation) {
			//return _doServiceCall(this._getService(targetLocation), "remoteImport", arguments); //$NON-NLS-1$
			return _doServiceCall(this._getService(targetLocation), "remoteImport", arguments).then(function(result){ //$NON-NLS-0$
				if(this.isEventFrozen()) {
					if(!this._frozenEvent.copied) {
						this._frozenEvent.copied = [];
					}
					this._frozenEvent.copied.push({target: parentLocation});
				} else {
					this.dispatchEvent({ type: "Changed", copied: [{target: parentLocation}]}); //$NON-NLS-0$
				}
				return result;
			}.bind(this));
		},

		/**
		 * Exports file and directory contents to another server
		 *
		 * @param {String} sourceLocation The location of the folder to export from
		 * @param {Object} options An object specifying the export parameters
		 * @public
		 * @return {Deferred} A deferred for chaining events after the export completes
		 */
		remoteExport: function(sourceLocation, options) {
			return _doServiceCall(this._getService(sourceLocation), "remoteExport", arguments); //$NON-NLS-1$
		},

		/**
		 * Find a string inside a file
		 *
		 * @param {String} sourceLocation The location of the folder to export from
		 * @param {String} findStr The string to search
		 * @public
		 * @return {Deferred} A deferred for chaining events after the export completes
		 */
		find: function(sourceLocation, findStr, option) {
			return _doServiceCall(this._getService(location), "find", arguments); //$NON-NLS-0$
		},

		/**
		 * Performs a search with the given search parameters.
		 * @param {Object} searchParams The JSON object that describes all the search parameters.
		 * @param {String} searchParams.resource Required. The location where search is performed. Required. Normally a sub folder of the file system. Empty string means the root of the file system.
		 * @param {String} searchParams.keyword The search keyword. Required but can be empty string.  If fileType is a specific type and the keyword is empty, then list up all the files of that type. If searchParams.regEx is true then the keyword has to be a valid regular expression.
		 * @param {String} searchParams.sort Required. Defines the order of the return results. Should be either "Path asc" or "Name asc". Extensions are possible but not currently supported.
		 * @param {boolean} searchParams.nameSearch Optional. If true, the search performs only file name search.
		 * @param {String} searchParams.fileType Optional. The file type. If specified, search will be performed under this file type. E.g. "*.*" means all file types. "html" means html files.
		 * @param {Boolean} searchParams.regEx Optional. The option of regular expression search.
		 * @param {integer} searchParams.start Optional. The zero based start number for the range of the returned hits. E.g if there are 1000 hits in total, then 5 means the 6th hit.
		 * @param {integer} searchParams.rows Optional. The number of hits of the range. E.g if there are 1000 hits in total and start=5 and rows=40, then the return range is 6th-45th.
		 * @param {String} searchParams.fileNamePatterns Optional. The file name patterns within which to search. If specified, search will be performed under files which match the provided patterns. Patterns should be comma-separated and may use "*" and "?" as wildcards.
		 * @param {[String]} searchParams.exclude Optional. An array of file / folder names to exclude from searching
		 * @public
		 */
		search: function(searchParams) {
			return _doServiceCall(this._getService(searchParams.resource), "search", arguments); //$NON-NLS-1$
		}
	};
	FileClient.prototype.constructor = FileClient;

	return {
		FileClient: FileClient
	};
});
