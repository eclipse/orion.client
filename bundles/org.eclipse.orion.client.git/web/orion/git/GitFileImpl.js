/*******************************************************************************
 * @license
 * Copyright (c) 2014, 2016 IBM Corporation and others.
 * All rights reserved. This program and the accompanying materials are made 
 * available under the terms of the Eclipse Public License 2.0 
 * (http://www.eclipse.org/legal/epl-v10.html), and the Eclipse Distribution 
 * License v1.0 (http://www.eclipse.org/org/documents/edl-v10.html). 
 * 
 * Contributors: IBM Corporation - initial API and implementation
 ******************************************************************************/

/*eslint-env browser, amd*/
/*global URL*/
define(["orion/xhr", "orion/Deferred", "orion/encoding-shim", "orion/URL-shim"], function(xhr, Deferred) {
	
	function GitFileImpl(fileBase) {
		this.fileBase = fileBase;
	}
	
	var GIT_TIMEOUT = 60000;
	
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

	GitFileImpl.prototype = {
		fetchChildren: function(location, options) {
			var fetchLocation = location;
			if (fetchLocation===this.fileBase) {
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
					"Orion-Version": "1", //$NON-NLS-0$  //$NON-NLS-1$
					"Content-Type": "charset=UTF-8" //$NON-NLS-0$  //$NON-NLS-1$
				},
				timeout: GIT_TIMEOUT
			};
			if (options && typeof options.readIfExists === 'boolean') {
				opts.headers["read-if-exists"] = Boolean(options.readIfExists).toString();
			}
			return xhr("GET", fetchLocation, opts).then(function(result) {  //$NON-NLS-0$
				var jsonData = result.response ? JSON.parse(result.response) : {};
				return jsonData.Children || [];
			});
		},
		loadWorkspaces: function() {
			var loc = this.fileBase;
			var suffix = "/gitapi";
			if (loc && loc.indexOf(suffix, loc.length - suffix.length) !== -1) {
				loc += "/tree";
			}
			return xhr("GET", loc, {
				headers: {
					"Orion-Version": "1"
				},
				timeout: GIT_TIMEOUT
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
		loadWorkspace: function(loc) {
			var suffix = "/gitapi";
			if (loc && loc.indexOf(suffix, loc.length - suffix.length) !== -1) {
				loc += "/tree";
			}
			return xhr("GET", loc, {
				headers: {
					"Orion-Version": "1"
				},
				timeout: GIT_TIMEOUT,
				log: false
			}).then(function(result) {
				var jsonData = result.response ? JSON.parse(result.response) : {};
				//in most cases the returned object is the workspace we care about
				//user didn't specify a workspace so we are at the root
				//just pick the first location in the provided list
				if (jsonData.Workspaces && jsonData.Workspaces.length > 0) {
					return this.loadWorkspace(jsonData.Workspaces[0].Location);
				}
				return jsonData;
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
			id = id.split("/");
			if (id.length > 3 && (id[2] === "file" || id[2] === "workspace")) id = id[3];
			if (id.length > 4 && (id[3] === "file" || id[3] === "workspace")) id = id[4];
			if (id.length > 5 && (id[4] === "file" || id[4] === "workspace")) id = id[5];
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
		createProject: function(url, projectName, serverPath, create) {
			throw new Error("Not supported"); //$NON-NLS-0$ 
		},
		createFolder: function(parentLocation, folderName) {
			throw new Error("Not supported"); //$NON-NLS-0$ 
		},
		createFile: function(parentLocation, fileName) {
			throw new Error("Not supported"); //$NON-NLS-0$ 
		},
		deleteFile: function(location) {
			throw new Error("Not supported"); //$NON-NLS-0$ 
		},
		moveFile: function(sourceLocation, targetLocation, name) {
			throw new Error("Not supported"); //$NON-NLS-0$ 
		},
		copyFile: function(sourceLocation, targetLocation, name) {
			throw new Error("Not supported"); //$NON-NLS-0$ 
		},
		read: function(location, isMetadata, acceptPatch, options) {
			if (typeof acceptPatch === 'object') {
				options = acceptPatch;
				acceptPatch = false;
			}
			var url = new URL(location, window.location);
			if (isMetadata) {
				url.query.set("parts", "meta"); //$NON-NLS-0$  //$NON-NLS-1$
			}
			var opts = {
				timeout: GIT_TIMEOUT,
				headers: { "Orion-Version": "1" }, //$NON-NLS-0$  //$NON-NLS-1$
				log: false
			};
			if (options && typeof options.readIfExists === 'boolean') {
				opts.headers["read-if-exists"] = Boolean(options.readIfExists).toString();
			}
			return xhr("GET", url.href, opts).then(function(result) {
				if (isMetadata) {
					return result.response ? JSON.parse(result.response) : null;
				} else {
					return result.response;
				}
			});
		},
		write: function(location, contents, args) {
			throw new Error("Not supported"); //$NON-NLS-0$ 
		},
		remoteImport: function(targetLocation, options) {
			throw new Error("Not supported"); //$NON-NLS-0$ 
		},
		remoteExport: function(sourceLocation, options) {
			throw new Error("Not supported"); //$NON-NLS-0$ 
		},
		readBlob: function(location) {
			return xhr("GET", location, { //$NON-NLS-0$ 
				responseType: "arraybuffer", //$NON-NLS-0$ 
				timeout: GIT_TIMEOUT
			}).then(function(result) {
				return result.response;
			});
		},
		writeBlob: function(location, contents, args) {
			throw new Error("Not supported"); //$NON-NLS-0$ 
		}
	};
	GitFileImpl.prototype.constructor = GitFileImpl;

	return GitFileImpl;
});
