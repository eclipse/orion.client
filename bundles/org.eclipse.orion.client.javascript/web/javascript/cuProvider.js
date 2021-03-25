/*******************************************************************************
 * @license
 * Copyright (c) 2015, 2016 IBM Corporation and others.
 * All rights reserved. This program and the accompanying materials are made
 * available under the terms of the Eclipse Public License 2.0
 * (http://www.eclipse.org/legal/epl-v10.html), and the Eclipse Distribution
 * License v1.0 (http://www.eclipse.org/org/documents/edl-v10.html).
 *
 * Contributors:
 *     IBM Corporation - initial API and implementation
 *******************************************************************************/
/* eslint-env amd */
define([
'javascript/lru',
'javascript/compilationUnit'
], function(LRU, CU) {

	var _cache = new LRU(10);
	var _useCache = true;
	var inputChanged = null;

	/**
	 * @description fetches or creates a compilation unit for the given information
	 * @param {Function} sourceblocks a function that returns the blocks of source
	 * @param {Object} metadata The file metadata
	 * @param {orion.editor.EditorContext} editorContext The editor context
	 * @returns {javascript.CompilationUnit} The compilation unit for the given information
	 */
	function getCompilationUnit(getSourceBlocks, metadata, editorContext) {
		if (_useCache){
			var cu = _cache.get(metadata.location);
			if(cu) {
				return cu;
			}
		}
		var blocks = getSourceBlocks();
		if (!blocks){
			blocks = [];
		}
		cu = new CU(blocks, metadata, editorContext);
		if (_useCache){
			_cache.put(metadata.location, cu);
		}
		return cu;
	}

	/**
	 * Callback from the orion.edit.model service
	 * @param {Object} event An <tt>orion.edit.model</tt> event.
	 * @see https://wiki.eclipse.org/Orion/Documentation/Developer_Guide/Plugging_into_the_editor#orion.edit.model
	 */
	function onModelChanging(evnt) {
		if(inputChanged) {
			//TODO haxxor, eat the first model changing event which immediately follows
			//input changed
			inputChanged = null;
		} else {
			_cache.remove(_getKey(evnt.file));
		}
	}
	
	/**
	 * Allows a caller to turn off the cache cuProvider is using, creating a new CU each time one is requested.
	 * Intended for use in testing where no onModelChanging events are fired.
	 * @param useCache whether to use the cache (default) or not
	 */
	function setUseCache(useCache){
		_useCache = useCache;
	}

	/**
	 * Returns the key to use when caching
	 * @param {Object|String} metadata The file infos
	 * @since 8.0
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
	 * Callback from the orion.edit.model service
	 * @param {Object} event An <tt>orion.edit.model</tt> event.
	 * @see https://wiki.eclipse.org/Orion/Documentation/Developer_Guide/Plugging_into_the_editor#orion.edit.model
	 */
	function onInputChanged(evnt) {
		inputChanged = evnt;
	}
	
	/**
	 * Callback from the FileClient
	 * @param {Object} event a <tt>fileChanged</tt> event
	 */
	function onFileChanged(event) {
		if(event && event.type === 'Changed' && Array.isArray(event.modified)) {
			//event = {type, files: [{name, location, metadata: {contentType}}]}
			event.modified.forEach(function(file) {
				if(typeof file === 'string') {
					_cache.remove(_getKey(file));
				}
			});
		}
	}
	
	return {
		getCompilationUnit: getCompilationUnit,
		onModelChanging: onModelChanging,
		onFileChanged: onFileChanged,
		onInputChanged: onInputChanged,
		setUseCache: setUseCache
	};
});
