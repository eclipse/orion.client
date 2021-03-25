/*******************************************************************************
 * @license
 * Copyright (c) 2013, 2016 IBM Corporation and others.
 * All rights reserved. This program and the accompanying materials are made
 * available under the terms of the Eclipse Public License 2.0
 * (http://www.eclipse.org/legal/epl-v10.html), and the Eclipse Distribution
 * License v1.0 (http://www.eclipse.org/org/documents/edl-v10.html).
 *
 * Contributors:
 *     IBM Corporation - initial API and implementation
 *******************************************************************************/
/*eslint-env amd*/
define([
	'orion/Deferred',
	'orion/objects',
	'javascript/lru',
	"acorn/dist/acorn",
	"acorn/dist/acorn_loose",
	"javascript/orionAcorn",
], function(Deferred, Objects, LRU, acorn, acorn_loose, OrionAcorn) {
	var registry;

	/**
	 * Provides a shared AST.
	 * @name javascript.ASTManager
	 * @class Provides a shared AST.
	 * @param {?} serviceRegistry The platform service registry
	 * @param {?} servjsProject The backing project context
	 */
	function ASTManager(serviceRegistry, jsProject) {
		this.cache = new LRU(10);
		this.orionAcorn = new OrionAcorn();
		this.jsProject = jsProject;
		registry = serviceRegistry;
	}

	/**
	 * @description Delegate to log timings to the metrics service
	 * @param {Number} end The end time
	 * @since 12.0
	 */
	function logTiming(end) {
		if(registry) {
			var metrics = registry.getService("orion.core.metrics.client"); //$NON-NLS-1$
			if(metrics) {
				metrics.logTiming('language tools', 'parse', end, 'application/javascript'); //$NON-NLS-1$ //$NON-NLS-2$ //$NON-NLS-3$
			}
		}
	}

	Objects.mixin(ASTManager.prototype, /** @lends javascript.ASTManager.prototype */ {
		/**
		 * @param {orion.editor.EditorContext} editorContext
		 * @returns {orion.Promise} A promise resolving to the AST.
		 */
		getAST: function(editorContext) {
			return editorContext.getFileMetadata().then(function(metadata) {
				var loc = this._getKey(metadata);
				var ast = this.cache.get(loc);
				if (ast) {
					return new Deferred().resolve(ast);
				}
				return editorContext.getText().then(function(text) {
					var options = Object.create(null);
					if(this.jsProject) {
						return this.jsProject.getComputedEnvironment().then(function(env) {
							options.ecmaVersion = typeof env.ecmaVersion === 'number' ? env.ecmaVersion : 6;
							options.sourceType = typeof env.sourceType === 'string' ? env.sourceType : "script";
							ast = this.parse(text, metadata ? metadata.location : 'unknown', options); //$NON-NLS-1$
							this.cache.put(loc, ast);
							return ast;
						}.bind(this));
					}
					ast = this.parse(text, metadata ? metadata.location : 'unknown', options); //$NON-NLS-1$
					this.cache.put(loc, ast);
					return ast;
				}.bind(this));
			}.bind(this));
		},
		/**
		 * Returns the key to use when caching
		 * @param {Object|String} metadata The file infos
		 * @since 8.0
		 */
		_getKey: function _getKey(metadata) {
			if(typeof metadata === 'string') {
				return metadata;
			}
			if(!metadata || !metadata.location) {
				return 'unknown'; //$NON-NLS-1$
			}
			return metadata.location;
		},
		/**
		 * @private
		 * @param {String} text The code to parse.
		 * @param {String} file The file name that we parsed
		 * @returns {Object} The AST.
		 */
		parse: function(text, file, options) {
			this.orionAcorn.initialize();
			var start = Date.now();
			this.orionAcorn.preParse(text, options, acorn, acorn_loose, file);
			try {
				var ast = acorn.parse.call(acorn, text, options);
			} catch(e) {
				ast = acorn_loose.parse_dammit.call(acorn_loose, text, options);
			}
			this.orionAcorn.postParse(ast, text);
			logTiming(Date.now() - start);
			return ast;
		},

		/**
		 * Callback from the orion.edit.model service
		 * @param {Object} event An <tt>orion.edit.model</tt> event.
		 * @see https://wiki.eclipse.org/Orion/Documentation/Developer_Guide/Plugging_into_the_editor#orion.edit.model
		 */
		onModelChanging: function(event) {
			if(this.inputChanged) {
				//TODO haxxor, eat the first model changing event which immediately follows
				//input changed
				this.inputChanged = null;
			} else {
				this.cache.remove(this._getKey(event.file));
			}
		},
		/**
		 * Callback from the orion.edit.model service
		 * @param {Object} event An <tt>orion.edit.model</tt> event.
		 * @see https://wiki.eclipse.org/Orion/Documentation/Developer_Guide/Plugging_into_the_editor#orion.edit.model
		 */
		onInputChanged: function(event) {
			this.inputChanged = event;
		},
		/**
		 * Callback from the FileClient
		 * @param {Object} event a <tt>Changed</tt> event
		 */
		onFileChanged: function(event) {
			if(event && event.type === 'Changed' && Array.isArray(event.modified)) {
				event.modified.forEach(function(file) {
					if(typeof file === 'string') {
						this.cache.remove(this._getKey(file));
					}
				}.bind(this));
			}
		}
	});
	return { ASTManager : ASTManager };
});
