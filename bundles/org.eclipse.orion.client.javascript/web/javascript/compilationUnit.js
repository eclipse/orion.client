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
'orion/Deferred'
], function(Deferred) {

    /**
     * @name CompilationUnit
     * @description Creates a new CompilationUint instance. These instances should not be cached as they do
     * not respond to model change events.
     * @constructor
     * @param {Array.<String>} sourceblocks The blocks of source to combine into one unit
     * @param {Object} metadata The metadata describing the file this unit represents
     * @param {Object} editorContext Optional editor context for the source file. Delegated to for setText and to get line information
     * @returns {CompilationUnit} The new CompiationUnit instance
     * @since 8.0
     */
    function CompilationUnit(sourceblocks, metadata, editorContext) {
        this._blocks = sourceblocks;
        this._metadata = metadata;
        if (metadata){
        	// The context returned by getEditorContext only contains javascript text so set the content type to match
        	this._metadata.contentType = {id: 'application/javascript'}; //$NON-NLS-1$
        }
        this._ec = editorContext;
        this._deps = [];
    }

    /**
     * @description Builds the backing source for the compilation unit
     * @function
     * @private
     */
    CompilationUnit.prototype._init = function _init() {
		var wrappedFunctionCallPrefix = "";  // Previously to avoid ESLint warnings we prefixed function calls with 'this.' See Bug 481137
        var _cursor = 0;
        this._source = '';
        this._blocks.sort(function(a, b){
        	var _a = a.offset ? a.offset : 0;
        	var _b = b.offset ? b.offset : 0;
        	return _a - _b;
        });
        for(var i = 0; i < this._blocks.length; i++) {
            var block = this._blocks[i];
            if(block.dependencies) {
            	this._deps.push(block.dependencies);
            }
            var pad = block.offset - _cursor;
            if(block.isWrappedFunctionCall){
				if (pad < wrappedFunctionCallPrefix.length){
					continue;
				}
				pad -= wrappedFunctionCallPrefix.length;
				while(pad > 0) {
                	this._source += ' '; //$NON-NLS-1$
                	pad--;
            	}
            	this._source += wrappedFunctionCallPrefix;
            	this._source += block.text;
            	if (block.text && block.text.charAt(block.text.length-1) !== ';'){
            		this._source += ';';
            	}
            } else {
	            while(pad > 0) {
	                this._source += ' '; //$NON-NLS-1$
	                pad--;
	            }
	            this._source += block.text;
            }

            _cursor = this._source.length;
        }
    };

    /**
     * @description Returns the source of this compilation unit
     * @function
     * @returns {String} The source of the compilation unit
     */
    CompilationUnit.prototype.getSource = function getSource() {
    	if(!this._source) {
            this._init();
        }
        return this._source;
    };

    /**
     * @description Returns if the given offset is valid compared to the blocks of code
     * that make up this unit
     * @function
     * @param {Number} offset The offset to check
     * @returns {Boolean} If the given offset is within any of the backing code blocks
     */
    CompilationUnit.prototype.validOffset = function validOffset(offset) {
        if(!this._blocks || this._blocks.length < 1 || offset < 0) {
	        return false;
	    }
	    for(var i = 0; i < this._blocks.length; i++) {
	        var block = this._blocks[i];
	        var idx = block.offset;
	        if(offset >= idx && offset <= idx+block.text.length) {
	            return true;
	        }
	    }
	    return false;
    };

    /**
     * @description Returns an EditorContext-like object that can resolve promises for <code>getText</code> and <code>getFileMetadata</code>
     * @function
     * @returns {Object} The EditorContext object to use when parsing
     */
   CompilationUnit.prototype.getEditorContext = function getEditorContext() {
        var proxy = Object.create(null);
        var that = this;
        proxy.getText = function() {
            return new Deferred().resolve(that.getSource());
        };
        proxy.getFileMetadata = function() {
            return new Deferred().resolve(that._metadata);
        };
        proxy.setText = function(text, start, end) {
            if(that._ec) {
                return that._ec.setText(text, start, end);
            }
            return new Deferred().resolve(null);
        };
        // Our tooling needs access to other functions on the editorContext so copy them here
        if (that._ec){
	        	proxy.getSelections = that._ec.getSelections;
	        	proxy.setSelection = that._ec.setSelection;
	        	proxy.syntaxCheck = that._ec.syntaxCheck;
	        	proxy.setCaretOffset = that._ec.setCaretOffset;
	    	}
        return proxy;
    };

    /**
     * @description Returns the computed list of dependencies
     * @function
     * @returns {Array.<string>} Returns the array of dependencies, or an empty array, never null
     * @since 9.0
     */
    CompilationUnit.prototype.getDependencies = function getDependencies() {
    	return this._deps;
    };

    return CompilationUnit;
});
