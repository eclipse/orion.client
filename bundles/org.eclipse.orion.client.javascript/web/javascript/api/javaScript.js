/*******************************************************************************
 * @license
 * Copyright (c) 2015, 2016 IBM Corporation and others.
 * All rights reserved. This program and the accompanying materials are made 
 * available under the terms of the Eclipse Public License 2.0 
 * (http://www.eclipse.org/legal/epl-v10.html), and the Eclipse Distribution 
 * License v1.0 (http://www.eclipse.org/org/documents/edl-v10.html). 
 * 
 * Contributors: IBM Corporation - initial API and implementation
 ******************************************************************************/
/*eslint-env amd */
define([
	"javascript/api/ternServer"
], function(TernServer) {
	
	var useworker = false,
		scriptresolver,
		ternserver;
	
	/**
	 * @name JavaScript
	 * @description Creates a new TernServer
	 * @param {ScriptResolver} scriptResolver The resolver used to find scripts for getFile
	 * @param {JavaScriptProject} jsProject The optional backing JavaScript project - used for reading / finding resources.
	 * @param {Boolean} useWorker If the backing TernServer instance should be run in a worker
	 * @returns {TernServer} A new TernServer instance
	 * @since 11.0
	 */
	function JavaScript(scriptResolver, jsProject, useWorker) {
		scriptresolver = scriptResolver;
		useworker = useWorker;
		if(!useworker) {
			ternserver = new TernServer(scriptresolver, jsProject);
			ternserver.startServer(null, function() {
				//just fire it up for now
			});
		}
	}
	
	JavaScript.prototype.Tern = Object.create(null);
	/**
     * @description Add a file to the Tern server
     * @param {String} file The fully qualified name of the file
     * @param {String} text The optional text of the file 
     */
    JavaScript.prototype.Tern.addFile = function addFile(file, text) {
    	ternserver.addFile(file, text);
    };
    /**
     * @description Checks if the type reference at the given offset matches the given origin type
     * @param {String} file The fully qualified name of the file context
     * @param {Number} offset The offset of the identifier to check
     * @param {Object} origin The original type information
     * @param {Array.<Object>} files The optional array of file objects
     * @param {Function} callback The callback which is called to return the results
     */
    JavaScript.prototype.Tern.checkRef = function checkRef(file, offset, origin, files, callback) {
    	ternserver.checkRef(file, offset, origin, files, callback);
    };
    /**
     * @description Computes content assist for the given options
     * @param {String} file The fully qualified name of the file context
     * @param {Number} offset The offset of the completion
     * @param {Boolean} keywords If keywords should be returned as well
     * @param {Array.<Object>} files The optional array of file objects
     * @param {Function} callback The callback which is called to return the results
     */
    JavaScript.prototype.Tern.completions = function completions(file, offset, keywords, files, callback) {
    	ternserver.completions(file, offset, keywords, files, callback);
    };
    /**
     * @description Computes the quickfixes for the given annotation, and optionally the list of similar annotations
     * @param {String} file The fully qualified name of the file context
     * @param {Number} offset The offset of the completion
     * @param {Object} annotation The annotation from the editor which has the minimum form: {start, end, id, fixid}
     * @param {Array.<Object>} annotations The array of similar annnotatons to the one the request is made to fix
     * @param {Array.<Object>} files The optional array of file objects
     * @param {Function} callback The callback which is called to return the results
     */
    JavaScript.prototype.Tern.fixes = function fixes(file, annotation, annotations, files, callback) {
    	ternserver.fixes(file, annotation, annotations, files, callback);
    };
    /**
     * @description Computes the definition of the identifier at the given offset
     * @param {String} file The fully qualified name of the file context
     * @param {Number} offset The offset of the completion
     * @param {Boolean} guess If we should take a guess at the definition if one cannot be computed
     * @param {Array.<Object>} files The optional array of file objects
     * @param {Function} callback The callback which is called to return the results
     */
    JavaScript.prototype.Tern.definition = function definition(file, offset, guess, files, callback) {
    	ternserver.definition(file, offset, guess, files, callback);
    };
    /**
     * @description Deletes the given file from the server. Does nothing if the file does not exist
     * @param {String] file The fully qualified name of the file to delete
     */
    JavaScript.prototype.Tern.delFile = function delFile(file) {
    	ternserver.delFile(file);
    };
    /**
     * @description Computes the documentation associated with the given offset in the file
     * @param {String} file The fully qualified name of the file context
     * @param {Number} offset The offset of the completion
     * @param {String} docFormat The format of the doc. If not given 'full' is assumed
     * @param {Array.<Object>} files The optional array of file objects
     * @param {Function} callback The callback which is called to return the results
     */
    JavaScript.prototype.Tern.documentation = function documentation(file, offset, docFormat, files, callback) {
    	ternserver.documentation(file, offset, docFormat, files, callback);
    };
    /**
     * @description Returns the list of environments from plugins in Tern, if any
     * @param {Function} callback The callback which is called to return the results
     */
    JavaScript.prototype.Tern.environments = function environments(callback) {
    	ternserver.environments(callback);
    };
    /**
     * @description Computes the implementation of the identifier at the given offset
     * @param {String} file The fully qualified name of the file context
     * @param {Number} offset The offset of the completion
     * @param {Boolean} guess If we should take a guess at the definition if one cannot be computed
     * @param {Array.<Object>} files The optional array of file objects
     * @param {Function} callback The callback which is called to return the results
     */
    JavaScript.prototype.Tern.implementation = function implementation(file, offset, guess, files, callback) {
    	ternserver.implementation(file, offset, guess, files, callback);
    };
    /**
     * @description Returns the list of plugins installed in Tern, if any
     * @param {Function} callback The callback which is called to return the results
     */
    JavaScript.prototype.Tern.installedPlugins = function installedPlugins(callback) {
    	ternserver.installedPlugins(callback);
    };
    /**
     * @description Runs ESLint on the given file context
     * @param {String} file The fully qualified name of the file context
     * @param {Object} rules The map of ESLint rules
     * @param {Object} env The map of existing environment names
     * @param {Array.<Object>} files The optional array of file objects
     * @param {Function} callback The callback which is called to return the results
     */
    JavaScript.prototype.Tern.lint = function lint(file, rules, env, files, callback) {
    	ternserver.lint(file, rules, env, files, callback);
    };
    /**
     * @description Computes an outline of the given file
     * @param {String} file The fully qualified name of the file context
     * @param {Array.<Object>} files The optional array of file objects
     * @param {Function} callback The callback which is called to return the results
     */
    JavaScript.prototype.Tern.outline = function outline(file, files, callback) {
    	ternserver.outline(file, files, callback);
    };
    /**
     * @description Computes occurrences for the given position
     * @param {String} file The fully qualified name of the file context
     * @param {Number} offset The offset of the cursor
     * @param {Array.<Object>} files The optional array of file objects
     * @param {Function} callback The callback which is called to return the results
     */
    JavaScript.prototype.Tern.occurrences = function outline(file, offset, files, callback) {
    	ternserver.occurrences(file, offset, files, callback);
    };
    /**
     * @description Computes a rename array for the identifier at the given offset
     * @param {String} file The fully qualified name of the file context
     * @param {Number} offset The offset of the completion
     * @param {String} newname The new name to change to
     * @param {Array.<Object>} files The optional array of file objects
     * @param {Function} callback The callback which is called to return the results
     */
    JavaScript.prototype.Tern.rename = function rename(file, offset, newname, files, callback) {
    	ternserver.rename(file, offset, newname, files, callback);
    };
	/**
	 * @description Start up the Tern server, send a message after trying
     * @param {Object} jsonOptions The optional map of JSON options to start the server with
     * @param {Function} callback The callback which is called to return the results
     */
    JavaScript.prototype.Tern.startServer = function startServer(jsonOptions, callback) {
		ternserver.startServer(jsonOptions, callback);
    };
    /**
     * @description Computes the type information at the given offset
     * @param {String} file The fully qualified name of the file context
     * @param {Number} offset The offset of the completion
     * @param {Function} callback The callback which is called to return the results
     */
    JavaScript.prototype.Tern.type = function type(file, offset, callback) {
    	ternserver.type(file, offset, callback);
    };
    
    return JavaScript;
});
