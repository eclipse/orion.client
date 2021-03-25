/*******************************************************************************
 * @license
 * Copyright (c) 2017 IBM Corporation and others.
 * All rights reserved. This program and the accompanying materials are made 
 * available under the terms of the Eclipse Public License 2.0 
 * (http://www.eclipse.org/legal/epl-v10.html), and the Eclipse Distribution 
 * License v1.0 (http://www.eclipse.org/org/documents/edl-v10.html). 
 * 
 * Contributors: IBM Corporation - initial API and implementation
 ******************************************************************************/
/* eslint-env browser, amd */
/* global URL */
define(["orion/Deferred", "orion/debug/debugSocket"], function(Deferred, mDebugSocket) {

	/**
	 * A read-only file implementation that serves remote-only files streaming from the debugger adapter.
	 * 
	 * @class {orion.debug.DebugFileImpl}
	 * 
	 * @see https://github.com/Microsoft/vscode-debugadapter-node/blob/master/protocol/src/debugProtocol.ts SourceRequest
	 */
	function DebugFileImpl() {
	}

	DebugFileImpl.prototype = {
		fetchChildren: function(location) {
			return new Deferred().resolve([]);
		},
		loadWorkspaces: function() {
			return new Deferred().resolve({});
		},
		loadWorkspace: function(location) {
			return new Deferred().reject({
				error: 'Invalid operation'
			});
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
		_doCopyMove: function(sourceLocation, targetLocation, isMove, _name) {
			throw new Error("Not supported"); //$NON-NLS-0$
		},
		read: function(loc, isMetadata, acceptPatch, options) {
			if (loc === '/debug') {
				return new Deferred().resolve({});
			}
			if (isMetadata) {
				var url = new URL(loc);
				return new Deferred().resolve({
					"Name": url.pathname.substr(url.pathname.lastIndexOf('/') + 1),
					"Location": url.pathname,
					"Directory": false,
					"LocalTimeStamp": Date.now(),
					"Parents": [],
					"Attributes": {
						"ReadOnly": true,
						"Executable": false
					}
				});
			} else {
				var deferred = new Deferred();
				var locParams = loc.split('/');
				var socketId = isFinite(locParams[3]) ? Math.floor(locParams[3]) : -1;
				var sourceReference = isFinite(locParams[4]) ? Math.floor(locParams[4]) : 0;
				var debugSocket = mDebugSocket.debugSockets[socketId];
				if (!debugSocket) {
					deferred.reject({
						error: "Invalid socket ID"
					});
				} else if (!sourceReference) {
					deferred.reject({
						error: "Invalid source reference"
					});
				} else {
					debugSocket.request('source', {
						sourceReference: sourceReference
					}, function(response) {
						if (response.success) {
							deferred.resolve(response.body.content);
						} else {
							deferred.reject();
						}
					});
				}
				return deferred;
			}
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
			throw new Error("Not supported"); //$NON-NLS-0$
		},
		writeBlob: function(location, contents, args) {
			throw new Error("Not supported"); //$NON-NLS-0$
		},
		getProject: function getProject(resourceLocation, options) {
			return new Deferred().resolve(null);
		}
	};
	DebugFileImpl.prototype.constructor = DebugFileImpl;

	return DebugFileImpl;
});
