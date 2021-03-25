/*******************************************************************************
 * @license
 * Copyright (c) 2017 IBM Corporation and others.
 * All rights reserved. This program and the accompanying materials are made
 * available under the terms of the Eclipse Public License 2.0
 * (http://www.eclipse.org/legal/epl-v10.html), and the Eclipse Distribution
 * License v1.0 (http://www.eclipse.org/org/documents/edl-v10.html).
 *
 * Contributors:
 *     IBM Corporation - initial API and implementation
 *******************************************************************************/
/*eslint-env amd, es6*/
define([
	"orion/Deferred",
	"plugins/languages/json/parser"
], function(Deferred, Parser) {
	var registry,
		cache = new Map();

	/**
	 * Provides a shared AST.
	 * @name json.ASTManager
	 * @class Provides a shared AST.
	 * @param {?} serviceRegistry The platform service registry
	 * @since 14.0
	 */
	function JsonAstManager(serviceRegistry) {
		registry = serviceRegistry;
	}

	/**
	 * @description Delegate to log timings to the metrics service
	 * @param {Number} end The end time
	 */
	function logTiming(end) {
		if(registry) {
			var metrics = registry.getService("orion.core.metrics.client"); //$NON-NLS-1$
			if(metrics) {
				metrics.logTiming('language tools', 'parse', end, 'application/json'); //$NON-NLS-1$ //$NON-NLS-2$ //$NON-NLS-3$
			}
		}
	}

	/**
	 * @name getAST
	 * @description Returns the shared AST (if one has been created previously), or creates a new AST and returns it.
	 * This function will wait for an AST to be created before returning
	 * 
	 * @param {orion.editor.EditorContext} editorContext
	 * @returns {Deferred} A promise resolving to the AST.
	 */
	JsonAstManager.prototype.getAST = function getAST(editorContext) {
		return editorContext.getFileMetadata().then(function(metadata) {
			var loc = _getKey(metadata);
			var ast = cache.get(loc);
			if (ast) {
				return new Deferred().resolve(ast);
			}
			return editorContext.getText().then(function(text) {
				ast = parse(text);
				cache.set(loc, ast);
				return ast;
			});
		});
	};

	/**
	 * @name onModelChanging
	 * @description Callback from the orion.edit.model service
	 * @param {Object} event An <tt>orion.edit.model</tt> event.
	 * @see https://wiki.eclipse.org/Orion/Documentation/Developer_Guide/Plugging_into_the_editor#orion.edit.model
	 */
	JsonAstManager.prototype.onModelChanging = function onModelChanging(evnt) {
		cache.delete(_getKey(evnt.file));
	};
	
	/**
	 * @name onFileChanged
	 * @description Callback from the FileClient
	 * @param {Object} event a <tt>Changed</tt> event
	 */
	JsonAstManager.prototype.onFileChanged = function onFileChanged(evnt) {
		if(evnt && evnt.type === 'Changed' && Array.isArray(evnt.modified)) {
			evnt.modified.forEach(function(file) {
				if(typeof file === 'string') {
					cache.delete(_getKey(file));
				}
			});
		}
	};

	/**
	 * @name _getKey
	 * @description Returns the key to use when caching
	 * @param {?|String} metadata The file infos
	 */
	function _getKey(metadata) {
		if(typeof metadata === 'string') {
			return metadata;
		}
		if(!metadata || !metadata.location) {
			return 'unknown'; //$NON-NLS-1$
		}
		return metadata.location;
	}

	/**
	 * @name parse
	 * @description Parses the text and returns an AST
	 * @param {String} text The code to parse.
	 * @returns {?} The AST.
	 */
	function parse(text) {
		var start = Date.now();
		var errors = [];
		try {
			var ast = Parser.parseTree(text, errors, {});
		} catch(e) {
		}
		ast.errors = errors;
		logTiming(Date.now() - start);
		return ast;
	}
	
	return JsonAstManager;
});
