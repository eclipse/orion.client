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
"orion/Deferred"
], function(Deferred) {
	
	/**
	 * @name javascript.JSOutliner
	 * @description creates a new instance of the outliner
	 * @param {Worker} ternWorker The backing Tern worker 
	 * @param {Boolean} displayAST <code>True</code> to return the AST rather than a source outline
	 * @constructor
	 * @public
	 * @param {Worker} ternWorker
	 */
	function JSOutliner(ternWorker, displayAST) {
		this.ternWorker = ternWorker;
		this.displayAST = displayAST;
	}
	
	/**
	 * @name computeOutline
	 * @description callback from the <code>orion.edit.outliner</code> service to create
	 * an outline
	 * @function
	 * @public
	 * @memberof javascript.JSOutliner.prototype
	 * @param {orion.edit.EditorContext} editorContext The editor context
	 * @param {Object} options The options
	 * @returns {orion.Promise} to compute the outline
	 * @callback 
	 */
	JSOutliner.prototype.computeOutline = function(editorContext, options) {
		var deferred = new Deferred();
		editorContext.getFileMetadata().then(function(meta) {
			editorContext.getText().then(function(text) {
				var files = [{type: "full", name: meta.location, text: text}]; //$NON-NLS-1$
				this.ternWorker.postMessage({request: "outline", args: {ast: this.displayAST, files: files, meta: {location: meta.location}}}, function(response, error) { //$NON-NLS-1$
				if(response.outline) {
					deferred.resolve(response.outline);
				} else if(error) {
					deferred.reject(error);
				}
			});
			}.bind(this));
		}.bind(this));
		return deferred;
	};
	
	return {
		JSOutliner: JSOutliner
		};
});
