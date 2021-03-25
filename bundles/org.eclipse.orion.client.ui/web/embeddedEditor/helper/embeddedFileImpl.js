/*******************************************************************************
 * @license
 * Copyright (c) 2014, 2017 IBM Corporation and others.
 * All rights reserved. This program and the accompanying materials are made 
 * available under the terms of the Eclipse Public License 2.0 
 * (http://www.eclipse.org/legal/epl-v10.html), and the Eclipse Distribution 
 * License v1.0 (http://www.eclipse.org/org/documents/edl-v10.html). 
 * 
 * Contributors: IBM Corporation - initial API and implementation
 ******************************************************************************/

/*eslint-env browser, amd*/
/*global URL*/
define([
	"orion/Deferred", 
	"embeddedEditor/helper/memoryFileSysConst", 
	"orion/encoding-shim", 
	"orion/URL-shim"
], function(Deferred, memoryFileSysConst) {
	function EmbeddedFileImpl(fileBase) {
		this.fileBase = fileBase;
		this.fileRoot = {};
		this.fileRoot[memoryFileSysConst.MEMORY_FILE_PROJECT_PATTERN] = {Location: memoryFileSysConst.MEMORY_FILE_PROJECT_PATTERN, Directory: true};
	}
	
	EmbeddedFileImpl.prototype = {
		fetchChildren: function(/*fLocation*/) {
			return new Deferred().resolve([]);
		},
		loadWorkspaces: function() {
			return new Deferred().resolve([]);
		},
		loadWorkspace: function(/*fLocation*/) {
			return new Deferred().resolve([]);
		},
		createProject: function(/*url, projectName, serverPath, create*/) {
			throw new Error("Not supported"); //$NON-NLS-0$ 
		},
		createFolder: function(/*parentLocation, folderName*/) {
			throw new Error("Not supported"); //$NON-NLS-0$ 
		},
		createFile: function(parentLocation, fileName) {
			var fileLocation = parentLocation + fileName;
			this._getFile(fileLocation, true);
			return this.read(fileLocation, true);
		},
		moveFile: function(/*sourceLocation, targetLocation, name*/) {
			throw new Error("Not supported"); //$NON-NLS-0$ 
		},
		copyFile: function(/*sourceLocation, targetLocation, name*/) {
			throw new Error("Not supported"); //$NON-NLS-0$ 
		},
		remoteImport: function(/*targetLocation, options*/) {
			throw new Error("Not supported"); //$NON-NLS-0$ 
		},
		remoteExport: function(/*sourceLocation, options*/) {
			throw new Error("Not supported"); //$NON-NLS-0$ 
		},
		readBlob: function(/*fLocation*/) {
			throw new Error("Not supported"); //$NON-NLS-0$ 
		},
		writeBlob: function(/*fLocation, contents, args*/) {
			throw new Error("Not supported"); //$NON-NLS-0$ 
		},
		/**
		 * @name getProject
		 * @description Returns the project context for the given resource
		 * @function
		 * @returns {?} The project context
		 * @callback
		 * @since 14.0
		 */
		getProject: function getProject(resourceLocation) {
			return this.fileRoot[memoryFileSysConst.MEMORY_FILE_PROJECT_PATTERN];		
		},
		_getFile: function(fLocation, create) {
			var locationURL = new URL(fLocation);
			var filePath = locationURL.pathname;
			if (this.fileRoot[filePath] === undefined && create) {
				this.fileRoot[filePath] = {
					Name: locationURL.pathname.split("/").pop(),
					Location: filePath,
					LocalTimeStamp: Date.now(),
					ETag: 0
				};
			}
			return this.fileRoot[filePath];
		},
		/**
		 * Returns the contents or metadata of the file at the given location.
		 *
		 * @param {String} location The location of the file to get contents for
		 * @param {Boolean} [isMetadata] If defined and true, returns the file metadata, 
		 *   otherwise file contents are returned
		 * @param {Boolean} acceptPatch
		 * @param {?} options The set of options for the read, or undefined
		 * @return {Deferred} A deferred that will be provided with the contents or metadata when available
		 * @callback
		 */
		read: function(fLocation, isMetadata, acceptPatch, options) {
			var file = this._getFile(fLocation),
				opts = options ? options : Object.create(null);
			if (file === undefined) {
				if(opts.readIfExists) {
					//read-if-exists is spec'd to return null
					return new Deferred().resolve(null);
				}
				return new Deferred().resolve(isMetadata ? {} : "");
			} 
			if(isMetadata){
				var parents = fLocation === memoryFileSysConst.MEMORY_FILE_PROJECT_PATTERN ? [] : [this.fileRoot[memoryFileSysConst.MEMORY_FILE_PROJECT_PATTERN]];
				var meta = {
					Length: file.length,
					Directory: Boolean(file.Directory),
					LocalTimeStamp: file.LocalTimeStamp,
					ETag: file.ETag,
					Location: file.Location,
					Name: file.Name,
					Parents: parents
				};
				return new Deferred().resolve(meta);
			}
			return new Deferred().resolve(file.contents);
		},
		/**
		 * Writes the contents or metadata of the file at the given location.
		 *
		 * @param {String} location The location of the file to set contents for
		 * @param {String|Object} contents The content string, object describing the location of content, or a metadata object to write
		 * @param {String|Object} args Additional arguments used during write operation (i.e. ETag) 
		 * @return A deferred for chaining events after the write completes with new metadata object
		 * @callback
		 */		
		write: function(fLocation, contents, args) {
			var file = this._getFile(fLocation, true);
			if (typeof contents === "string") {
				file.ETag++;
				file.LocalTimeStamp = Date.now();
				file.contents = contents;
			}
			return this.read(fLocation, true);
		},
		/**
		 * Deletes a file, directory, or project.
		 * @param {String} location The location of the file or directory to delete.
		 */
		deleteFile: function(fLocation) {
			var locationURL = new URL(fLocation);
			var filePath = locationURL.pathname;
			delete this.fileRoot[filePath];
			return new Deferred().resolve();
		}
	};
	EmbeddedFileImpl.prototype.constructor = EmbeddedFileImpl;

	return EmbeddedFileImpl;
});
