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
'orion/objects',
'orion/Deferred',
'javascript/finder'
], function(Objects, Deferred, Finder) {
	
	/**
	 * @name javascript.JavaScriptOccurrences
	 * @description creates a new instance of the outliner
	 * @constructor
	 * @public
	 * @param {Worker} ternWorker
	 */
	function JavaScriptOccurrences(ternWorker) {
		this.ternworker = ternWorker;
	}
	
	Objects.mixin(JavaScriptOccurrences.prototype, /** @lends javascript.JavaScriptOccurrences.prototype*/ {
		
		/**
		 * @name computeOccurrences
		 * @description Callback from the editor to compute the occurrences
		 * @function
		 * @public 
		 * @memberof javascript.JavaScriptOccurrences.prototype
		 * @param {Object} editorContext The current editor context
		 * @param {Object} ctxt The current selection context
		 */
		computeOccurrences: function(editorContext, ctxt) {
			var deferred = new Deferred();
			editorContext.getFileMetadata().then(function(meta) {
				editorContext.getText().then(function(text) {
					var word = Finder.findWord(text, ctxt.selection.end);
					if(word) {
						var files = [{type: "full", name: meta.location, text: text}]; //$NON-NLS-1$
						this.ternworker.postMessage({request: "occurrences", args: {params: {offset: ctxt.selection.end}, files: files, meta: {location: meta.location}}}, function(response, error) { //$NON-NLS-1$
							if(response.occurrences) {
								deferred.resolve(response.occurrences);
							} else if(error) {
								deferred.reject(error);
							}
						});
					} else {
						deferred.resolve([]);
					}
				}.bind(this));
				
			}.bind(this));
			return deferred;
		}
	});
	
	return {
		JavaScriptOccurrences: JavaScriptOccurrences
	};
});
