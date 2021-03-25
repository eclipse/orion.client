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
/* eslint-disable missing-nls */
/*eslint-env browser, amd*/
define(["orion/Deferred", "orion/xhr", "orion/URL-shim", "orion/operation", "orion/form"], function(Deferred, xhr, _, operation, form) {

	/**
	 * An implementation of the file service that understands the Orion
	 * server file API. This implementation is suitable for invocation by a remote plugin.
	 */
	function makeAbsolute(loc) {
		return new URL(loc, self.location.href).href;
	}

	function _normalizeLocations(data) {
		if (data && typeof data === "object") {
			Object.keys(data).forEach(function(key) {
				var value = data[key];
				if (key.indexOf("Location") !== -1) {
					data[key] = makeAbsolute(value);
				} else {
					_normalizeLocations(value);
				}
			});
		}
		return data;
	}

	function _copyLocation(loc, remove, append) {
		var result = loc;
		if (remove) {
			result = result.substring(0, result.lastIndexOf("/", result.length - (result[result.length - 1] === "/" ? 2 : 1)));
		}
		if (append) {
			result += append;
		}
		return result;
	}

	//Note: this is very dependent on the server side code
	function _copyLocations(target, source, remove, append) {
		["Location", "ImportLocation", "ExportLocation"].forEach(function(key) {
			if (source[key] && !target[key]) {
				target[key] = _copyLocation(source[key], remove, append);
			}
		});
		if (source.Git && !target.Git) {
			target.Git = {};
			target.Git.CloneLocation = source.Git.CloneLocation;
			target.Git.DefaultRemoteBranchLocation = source.Git.DefaultRemoteBranchLocation;
			Object.keys(source.Git).forEach(function(key) {
				if (!target.Git[key]) {
					target.Git[key] = _copyLocation(source.Git[key], remove, append);
				}
			});
		}
		if (source.JazzHub && !target.JazzHub) {
			target.JazzHub = source.JazzHub;
		}
	}

	function expandLocations(metadata) {
		if (!metadata.Parents) { return; }
		var temp = metadata;
		metadata.Parents.forEach(function(p) {
			_copyLocations(p, temp, true, "/");
			p.ChildrenLocation = p.Location + "?depth=1";
			p.Children.forEach(function(child) {
				_copyLocations(child, p, false, child.Name + (child.Directory ? "/" : ""));
				if (child.Directory) {
					child.ChildrenLocation = child.Location + "?depth=1";
				}
			});
			temp = p;
		});
	}

	// java servers are semi-colon challenged
	function cleanseUrl(path) {
		if (path) {
			path = path.replace(";", "%3B");
		}
		return path;
	}

	function _xhr(method, url, options) {
		return xhr(method, cleanseUrl(url), options);
	}

	// Wrap orion/xhr to handle long-running operations.
	function sftpOperation() {
		return _xhr.apply(null, Array.prototype.slice.call(arguments)).then(function(result) {
			if (result.xhr && result.xhr.status === 202) {
				var response = result.response ? JSON.parse(result.response) : null;
				var d = new Deferred();
				operation.handle(response.Location, function(operation) {
					return operation.Result; // Final result of SFTP task is the operation's status.
				}).then(d.resolve, d.reject, d.progress);
				return d;
			}
			return result.response ? JSON.parse(result.response) : null;
		});
	}

	function _generateLuceneQuery(searchParams) {
		var newKeyword = searchParams.keyword;
		var caseSensitiveFlag = "",
			wholeWordFlag = "",
			regExFlag = "",
			excluded = "";
		if (searchParams.caseSensitive) {
			caseSensitiveFlag = "+CaseSensitive:" + searchParams.caseSensitive;
		}
		if (searchParams.wholeWord) {
			wholeWordFlag = "+WholeWord:" + searchParams.wholeWord;
		}
		if (searchParams.regEx) {
			regExFlag = "+RegEx:" + searchParams.regEx;
		}
		if (Array.isArray(searchParams.exclude)) {
			searchParams.exclude.forEach(function(item, index) {
				excluded += encodeURIComponent(item);
				if (index < searchParams.exclude.length - 1) {
					excluded += ",";
				}
			});
		}
		var newSort = searchParams.sort;
		if (searchParams.nameSearch) { //Search file name only
			var wildcard = (/\*$/.test(searchParams.keyword) ? "" : "*");
			newKeyword = "NameLower:" + newKeyword + wildcard;
		} else {
			//If searching on a specific file type, we want to inject the file type into the query string so that it will be passed to the search engine.
			if (searchParams.fileType && searchParams.fileType !== "*.*") {
				//If the search string is not empty, we just combine the file type.
				if (newKeyword !== "") {
					//If the search string contains white space, we should add double quato at both end.
					if (newKeyword.indexOf(" ") >= 0) {
						newKeyword = "\"" + newKeyword + "\"";
					}
					newKeyword = encodeURIComponent(newKeyword) + "+NameLower:*." + searchParams.fileType;
				} else { //If the search string is empty, we have to simulate a file name search on *.fileType.
					newKeyword = "NameLower:*." + searchParams.fileType;
					newSort = newSort.replace("Path", "NameLower");
				}
			} else if (searchParams.fileNamePatterns && (searchParams.fileNamePatterns.length > 0)) {
				//If the search string is not empty, we just combine the file type.
				if (newKeyword !== "") {
					//If the search string contains white space, we should add double quotes at both ends.
					if (newKeyword.indexOf(" ") >= 0) {
						newKeyword = "\"" + newKeyword + "\"";
					}
					newKeyword = encodeURIComponent(newKeyword) + "+Name:" + searchParams.fileNamePatterns.join("/");
				} else { //If the search string is empty, we have to simulate a file name search on *.fileType.
					newKeyword = "Name:" + searchParams.fileNamePatterns.join("/");
					newSort = newSort.replace("Path", "Name");
				}
			} else if (newKeyword.indexOf(" ") >= 0) { //If the search string contains white space, we should add double quato at both end.
				newKeyword = encodeURIComponent("\"" + newKeyword + "\"");
			} else {
				newKeyword = encodeURIComponent(newKeyword);
			}
		}
		var q = "?" + "sort=" + newSort + "&rows=" + searchParams.rows + "&start=" + searchParams.start + "&q=" + newKeyword +
			caseSensitiveFlag + wholeWordFlag + regExFlag + "+Location:" + searchParams.resource + "*";
		if (excluded) {
			q = q + "+Exclude:" + excluded;
		}
		return q;
	}

	/**
	 * @class Provides operations on files, folders, and projects.
	 * @name FileServiceImpl
	 */
	function FileServiceImpl(fileBase, workspaceBase) {
		this.fileBase = fileBase;
		this.workspaceBase = workspaceBase;
		this.makeAbsolute = workspaceBase && workspaceBase.indexOf("://") !== -1;
	}

	FileServiceImpl.prototype = /**@lends eclipse.FileServiceImpl.prototype */ {
		/**
		 * Obtains the children of a remote resource
		 * @param {String} loc The location of the item to obtain children for
		 * @param {?} options The optional collection of options to pass into the request
		 * @return A deferred that will provide the array of child objects when complete
		 */
		fetchChildren: function(loc, options) {
			var fetchLocation = loc;
			if (fetchLocation === this.fileBase || fetchLocation === this.workspaceBase) {
				return this.loadWorkspaces().then(function(workspaces) {
					return Deferred.all(workspaces.map(function(workspace) {
						return this.read(workspace.Location, true);
					}.bind(this)));
				}.bind(this));
			}
			//If fetch location does not have ?depth=, then we need to add the depth parameter. Otherwise server will not return any children
			if (fetchLocation.indexOf("?depth=") === -1) { //$NON-NLS-0$
				fetchLocation += "?depth=1"; //$NON-NLS-0$
			}
			var opts = {
				headers: {
					"Orion-Version": "1",
					"Content-Type": "charset=UTF-8"
				},
				timeout: 15000
			};
			if (options && typeof options.readIfExists === 'boolean') {
				opts.headers["read-if-exists"] = Boolean(options.readIfExists).toString();
			}
			// console.log("get children");
			return _xhr("GET", fetchLocation, opts).then(function(result) {
				var jsonData = result.response ? JSON.parse(result.response) : {};
				return jsonData.Children || [];
			}).then(function(result) {
				if (this.makeAbsolute) {
					_normalizeLocations(result);
				}
				return result;
			}.bind(this));
		},

		/**
		 * Creates a new workspace with the given name. The resulting workspace is
		 * passed as a parameter to the provided onCreate function.
		 * @param {String} _name The name of the new workspace
		 */
		createWorkspace: function(_name, id) {
			//return the deferred so client can chain on post-processing
			var data = {};
			data.Id = id;
			return _xhr("POST", this.workspaceBase, {
				headers: {
					"Orion-Version": "1",
					"Content-Type": "application/json;charset=UTF-8",
					"Slug": form.encodeSlug(_name)
				},
				data: JSON.stringify(data),
				timeout: 15000
			}).then(function(result) {
				var jsonData = result.response ? JSON.parse(result.response) : {};
				return jsonData;
			});
		},

		/**
		 * Loads all the user's workspaces. Returns a deferred that will provide the loaded
		 * workspaces when ready.
		 */
		loadWorkspaces: function() {
			return _xhr("GET", this.workspaceBase, {
				headers: {
					"Orion-Version": "1"
				},
				timeout: 15000
			}).then(function(result) {
				var jsonData = result.response ? JSON.parse(result.response) : {};
				return jsonData.Workspaces;
			}).then(function(result) {
				if (this.makeAbsolute) {
					_normalizeLocations(result);
				}
				return result;
			}.bind(this));
		},

		/**
		 * Loads the workspace with the given id and sets it to be the current
		 * workspace for the IDE. The workspace is created if none already exists.
		 * @param {String} loc the location of the workspace to load
		 * @param {Function} onLoad the function to invoke when the workspace is loaded
		 */
		loadWorkspace: function(loc) {
			if (loc === this.fileBase) {
				loc = null;
			}
			return _xhr("GET", loc ? loc : this.workspaceBase, {
				headers: {
					"Orion-Version": "1"
				},
				timeout: 15000,
				log: false
			}).then(function(result) {
				var jsonData = result.response ? JSON.parse(result.response) : {};
				//in most cases the returned object is the workspace we care about
				if (loc) {
					return jsonData;
				}
				//user didn't specify a workspace so we are at the root
				//just pick the first location in the provided list
				if (jsonData.Workspaces.length > 0) {
					return this.loadWorkspace(jsonData.Workspaces[0].Location);
				}
				//no workspace exists, and the user didn't specify one. We'll create one for them
				return this.createWorkspace("Orion Content");
			}.bind(this)).then(function(result) {
				if (this.makeAbsolute) {
					_normalizeLocations(result);
				}
				return result;
			}.bind(this));
		},
		
		getWorkspace: function(resourceLocation) {
			//TODO move this to server to avoid path math?
			var id = resourceLocation || "";
			if (id.indexOf(this.fileBase) === 0) id = id.substring(this.fileBase.length);
			else if (id.indexOf(this.workspaceBase) === 0) id = id.substring(this.workspaceBase.length);
			id = id.split("/");
			id = id.length > 0 && id[1];
			return this.loadWorkspaces().then(function(workspaces) {
				var loc = "";
				workspaces.some(function(workspace) {
					if (workspace.Id === id) {
						loc = workspace.Location;
						return true;
					}
				});
				return this.loadWorkspace(loc);
			}.bind(this));
		},

		changeWorkspace: function(loc) {
			return _xhr("PUT", this.workspaceBase, {
				headers: {
					"Orion-Version": "1",
					"Content-Type": "application/json;charset=UTF-8"
				},
				timeout: 15000,
				data: JSON.stringify({
					Location: loc
				})
			}).then(function(result) {
				var jsonData = result.response ? JSON.parse(result.response) : {};
				return jsonData.Workspaces;
			}).then(function(result) {
				if (this.makeAbsolute) {
					_normalizeLocations(result);
				}
				return result;
			}.bind(this));
		},

		/**
		 * Adds a project to a workspace.
		 * @param {String} loc The workspace location
		 * @param {String} projectName the human-readable name of the project
		 * @param {String} serverPath The optional path of the project on the server.
		 * @param {Boolean} create If true, the project is created on the server file system if it doesn't already exist
		 */
		createProject: function(loc, projectName, serverPath, create) {
			if (!loc) { // null, undefined, '' ...
				// window.document.eas.status.setErrorMessage("<enter message here>");
				console.error("url is undefined, make sure you're signed in before creating a project");
				return;
			}
			var data = {
				Name: projectName,
				Directory: true
			};
			if (serverPath) {
				data.ContentLocation = serverPath;
			}
			if (create) {
				data.CreateIfDoesntExist = create;
			}
			return _xhr("POST", loc, {
				headers: {
					"Orion-Version": "1",
					"Content-Type": "application/json;charset=UTF-8"
				},
				timeout: 15000,
				data: JSON.stringify(data)
			}).then(function(result) {
				return result.response ? JSON.parse(result.response) : null;
			}).then(function(result) {
				if (this.makeAbsolute) {
					_normalizeLocations(result);
				}
				return result;
			}.bind(this));
		},
		/**
		 * @description Computes the project context from the given location
		 * @param {String} resourceLocation The resource context to find the project for
		 * @param {?} options The options map
		 * @since 14.0
		 */
		getProject: function getProject(resourceLocation, options) {
			var url = new URL(resourceLocation, self.location);
			url.query.set("project", "true");
			if(options && Array.isArray(options.names)) {
				var names = '';
				options.names.forEach(function(item, index) {
					names += encodeURIComponent(item);
					if (index < options.names.length - 1) {
						names += ",";
					}
				});
				url.query.set("names", names);
			}
			return _xhr("GET", url.href, {
				headers: {
					"Orion-Version": "1"
				},
				timeout: 15000,
				log: false
			}).then(function(result) {
				return result.response ? JSON.parse(result.response) : null;
			},/* @callback */ function reject(err) {
				return null;
			});
		},
		/**
		 * Creates a folder.
		 * @param {String} parentLocation The location of the parent folder
		 * @param {String} folderName The name of the folder to create
		 * @return {Object} JSON representation of the created folder
		 */
		createFolder: function(parentLocation, folderName) {
			return _xhr("POST", parentLocation, {
				headers: {
					"Orion-Version": "1",
					"X-Create-Options": "no-overwrite",
					"Slug": form.encodeSlug(folderName),
					"Content-Type": "application/json;charset=UTF-8"
				},
				data: JSON.stringify({
					"Name": folderName,
					"LocalTimeStamp": "0",
					"Directory": true
				}),
				timeout: 15000
			}).then(function(result) {
				return result.response ? JSON.parse(result.response) : null;
			}).then(function(result) {
				if (this.makeAbsolute) {
					_normalizeLocations(result);
				}
				return result;
			}.bind(this));
		},
		/**
		 * Create a new file in a specified location. Returns a deferred that will provide
		 * The new file object when ready.
		 * @param {String} parentLocation The location of the parent folder
		 * @param {String} fileName The name of the file to create
		 * @return {Object} A deferred that will provide the new file object
		 */
		createFile: function(parentLocation, fileName) {
			return _xhr("POST", parentLocation, {
				headers: {
					"Orion-Version": "1",
					"X-Create-Options": "no-overwrite",
					"Slug": form.encodeSlug(fileName),
					"Content-Type": "application/json;charset=UTF-8"
				},
				data: JSON.stringify({
					"Name": fileName,
					"LocalTimeStamp": "0",
					"Directory": false
				}),
				timeout: 15000
			}).then(function(result) {
				return result.response ? JSON.parse(result.response) : null;
			}).then(function(result) {
				if (this.makeAbsolute) {
					_normalizeLocations(result);
				}
				return result;
			}.bind(this));
		},
		/**
		 * Deletes a file, directory, or project.
		 * @param {String} loc The location of the file or directory to delete.
		 */
		deleteFile: function(loc) {
			return _xhr("DELETE", loc, {
				headers: {
					"Orion-Version": "1"
				},
				timeout: 15000
			}).then(function(result) {
				return result.response ? JSON.parse(result.response) : null;
			}).then(function(result) {
				if (this.makeAbsolute) {
					_normalizeLocations(result);
				}
				return result;
			}.bind(this));
		},

		/**
		 * Moves a file or directory.
		 * @param {String} sourceLocation The location of the file or directory to move.
		 * @param {String} targetLocation The location of the target folder.
		 * @param {String} fileName The name of the destination file or directory in the case of a rename
		 */
		moveFile: function(sourceLocation, targetLocation, fileName) {
			return this._doCopyMove(sourceLocation, targetLocation, true, fileName).then(function(result) {
				if (this.makeAbsolute) {
					_normalizeLocations(result);
				}
				return result;
			}.bind(this));
		},

		/**
		 * Copies a file or directory.
		 * @param {String} sourceLocation The location of the file or directory to copy.
		 * @param {String} targetLocation The location of the target folder.
		 * @param {String} fileName The name of the destination file or directory in the case of a rename
		 */
		copyFile: function(sourceLocation, targetLocation, fileName) {
			return this._doCopyMove(sourceLocation, targetLocation, false, fileName).then(function(result) {
				if (this.makeAbsolute) {
					_normalizeLocations(result);
				}
				return result;
			}.bind(this));
		},

		_doCopyMove: function(sourceLocation, targetLocation, isMove, _name) {
			if (!_name) {
				//take the last segment (trailing slash will product an empty segment)
				var segments = sourceLocation.split("/");
				_name = segments.pop() || segments.pop();
			}
			return _xhr("POST", targetLocation, {
				headers: {
					"Orion-Version": "1",
					"Slug": form.encodeSlug(_name),
					"X-Create-Options": "no-overwrite," + (isMove ? "move" : "copy"),
					"Content-Type": "application/json;charset=UTF-8"
				},
				data: JSON.stringify({
					"Location": sourceLocation,
					"Name": _name
				}),
				timeout: 15000
			}).then(function(result) {
				return result.response ? JSON.parse(result.response) : null;
			});
		},
		/**
		 * Returns the contents or metadata of the file at the given location.
		 *
		 * @param {String} loc The location of the file to get contents for
		 * @param {Boolean} [isMetadata] If defined and true, returns the file metadata,
		 *   otherwise file contents are returned
		 * @return A deferred that will be provided with the contents or metadata when available
		 */
		read: function(loc, isMetadata, acceptPatch, options) {
			if (typeof acceptPatch === 'object') {
				options = acceptPatch;
				acceptPatch = false;
			}
			var url = new URL(loc, self.location);
			if (isMetadata) {
				if (options && options.parts !== undefined) {
					url.query.set("parts", options.parts);
				} else {
					url.query.set("parts", "meta");
				}
			}
			if (options && options.startLine !== undefined) {
				url.query.set("start", options.startLine.toString());
			}
			if (options && options.pageSize !== undefined) {
				url.query.set("count", options.pageSize.toString());
			}
			var timeout = options && options.timeout ? options.timeout : 15000,
				opts = {
					timeout: timeout,
					headers: {
						"Orion-Version": "1",
						"Accept": "application/json, *.*"
					},
					log: false
				};
			if (options && typeof options.readIfExists === 'boolean') {
				opts.headers["read-if-exists"] = Boolean(options.readIfExists).toString();
			}
			return _xhr("GET", url.href, opts).then(function(result) {
				if (isMetadata) {
					var r = result.response ? JSON.parse(result.response) : null;
					if (url.query.get("tree") === "compressed") {
						expandLocations(r);
					}
					return r;
				}
				if (result.xhr.status === 204) {
					return null;
				}
				if (acceptPatch) {
					return {
						result: result.response,
						acceptPatch: result.xhr.getResponseHeader("Accept-Patch")
					};
				}
				return result.response;
			}).then(function(result) {
				if (this.makeAbsolute && result) { //can be null on 204
					_normalizeLocations(acceptPatch ? result.result : result);
				}
				return result;
			}.bind(this));
		},
		/**
		 * Writes the contents or metadata of the file at the given location.
		 *
		 * @param {String} location The location of the file to set contents for
		 * @param {String|Object} contents The content string, object describing the location of content, or a metadata object to write
		 * @param {String|Object} args Additional arguments used during write operation (i.e. ETag)
		 * @return A deferred for chaining events after the write completes with new metadata object
		 */
		write: function(loc, contents, args) {
			var url = new URL(loc, self.location);

			var headerData = {
				"Orion-Version": "1",
				"Content-Type": "text/plain;charset=UTF-8"
			};
			if (args && args.ETag) {
				headerData["If-Match"] = args.ETag;
			}
			var options = {
				timeout: 15000,
				headers: headerData,
				data: contents,
				log: false
			};

			// check if we have raw contents or something else
			var method = "PUT";
			if (typeof contents !== "string") {
				// look for remote content
				if (contents.sourceLocation) {
					options.query = {
						source: contents.sourceLocation
					};
					options.data = null;
				} else if (contents.diff) {
					method = "POST";
					headerData["X-HTTP-Method-Override"] = "PATCH";
					headerData["Content-Type"] = "application/json;charset=UTF-8";
					options.data = JSON.stringify(options.data);
				} else {
					// assume we are putting metadata
					url.query.set("parts", "meta");
				}
			}
			return _xhr(method, url.href, options).then(function(result) {
				return result.response ? JSON.parse(result.response) : null;
			}).then(function(result) {
				if (this.makeAbsolute) {
					_normalizeLocations(result);
				}
				return result;
			}.bind(this));
		},
		/**
		 * Imports file and directory contents from another server
		 *
		 * @param {String} targetLocation The location of the folder to import into
		 * @param {Object} options An object specifying the import parameters
		 * @return A deferred for chaining events after the import completes
		 */
		remoteImport: function(targetLocation, options) {
			var headerData = {
				"Orion-Version": "1"
			};
			if (options.OptionHeader) {
				headerData["X-Xfer-Options"] = options.OptionHeader;
				delete options.OptionHeader;
			}
			return sftpOperation("POST", targetLocation, {
				headers: headerData,
				data: JSON.stringify(options),
				timeout: 15000
			}).then(function(result) {
				if (this.makeAbsolute) {
					_normalizeLocations(result);
				}
				return result;
			}.bind(this));
		},
		/**
		 * Exports file and directory contents to another server
		 *
		 * @param {String} sourceLocation The location of the folder to export from
		 * @param {Object} options An object specifying the export parameters
		 * @return A deferred for chaining events after the export completes
		 */
		remoteExport: function(sourceLocation, options) {
			var headerData = {
				"Orion-Version": "1"
			};
			if (options.OptionHeader) {
				headerData["X-Xfer-Options"] = options.OptionHeader;
				delete options.OptionHeader;
			}
			return sftpOperation("POST", sourceLocation, {
				headers: headerData,
				data: JSON.stringify(options),
				timeout: 15000
			}).then(function(result) {
				if (this.makeAbsolute) {
					_normalizeLocations(result);
				}
				return result;
			}.bind(this));
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
			var url = new URL(sourceLocation, self.location);
			url.query.set("findStr", findStr);
			return _xhr("GET", url.href, {
				timeout: 120000,
				headers: {
					"Orion-Version": "1"
				},
				log: false
			}).then(function(result) {
				return result.response ? JSON.parse(result.response) : null;
			}.bind(this));
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
		 * @param {integer} searchParams.start Optional. The zero based strat number for the range of the returned hits. E.g if there are 1000 hits in total, then 5 means the 6th hit.
		 * @param {integer} searchParams.rows Optional. The number of hits of the range. E.g if there are 1000 hits in total and start=5 and rows=40, then the return range is 6th-45th.
		 * @param {String} searchParams.fileNamePatterns Optional. The file name patterns within which to search. If specified, search will be performed under files which match the provided patterns. Patterns should be comma-separated and may use "*" and "?" as wildcards.
		 *															E.g. "*" means all files. "*.html,test*.js" means all html files html files and all .js files that start with "test".
		 * @param {[String]} searchParams.exclude Optional. An array of file / folder names to exclude while searching.
		 */
		search: function(searchParams) {
			var query = _generateLuceneQuery(searchParams);
			return _xhr("GET", this.fileBase + "/../filesearch" + query, {
				headers: {
					"Accept": "application/json",
					"Orion-Version": "1"
				}
			}).then(function(result) {
				return result.response ? JSON.parse(result.response) : {};
			}).then(function(result) {
				if (this.makeAbsolute) {
					_normalizeLocations(result);
				}
				return result;
			}.bind(this));
		}
	};

	function _handleError(error) {
		var errorMessage = "Unknown Error";
		if (error.status && (error.status === 404 || error.status === 410)) {
			errorMessage = "File not found.";
		} else if (error.xhr && error.xhr.statusText) {
			errorMessage = error.xhr.statusText;
		}
		var errorObj = {
			Severity: "Error",
			Message: errorMessage
		};
		error.responseText = JSON.stringify(errorObj);
		return new Deferred().reject(error);
	}

	function _call2(method, url, headerData, body) {
		var options = {
			//timeout: 15000,
			responseType: "arraybuffer",
			headers: headerData ? headerData : {
				"Orion-Version": "1"
			},
			data: body,
			log: false
		};
		return _xhr(method, url, options).then(function(result) {
			return result.response;
		}, function(error) {
			return _handleError(error);
		}).then(function(result) {
			if (this.makeAbsolute) {
				_normalizeLocations(result);
			}
			return result;
		}.bind(this));
	}

	if (self.Blob) {
		FileServiceImpl.prototype.readBlob = function(loc) {
			return _call2("GET", loc).then(function(result) {
				return result;
			});
		};

		FileServiceImpl.prototype.writeBlob = function(loc, contents, args) {
			var headerData = {};
			if (args && args.ETag) {
				headerData["If-Match"] = args.ETag;
			}
			return _call2("PUT", loc, headerData, contents);
		};
	}

	return FileServiceImpl;
});
