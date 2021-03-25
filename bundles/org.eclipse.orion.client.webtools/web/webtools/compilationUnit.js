/*******************************************************************************
 * @license
 * Copyright (c) 2015 IBM Corporation and others.
 * All rights reserved. This program and the accompanying materials are made 
 * available under the terms of the Eclipse Public License 2.0 
 * (http://www.eclipse.org/legal/epl-v10.html), and the Eclipse Distribution 
 * License v1.0 (http://www.eclipse.org/org/documents/edl-v10.html). 
 *
 * Contributors:
 *     IBM Corporation - initial API and implementation
 *******************************************************************************/
/* eslint-env amd */

/*
 * Extends the Compilation Unit in Javascript to pad the source file with newlines rather than just spaces.  This is needed for the cssLint validator
 * to run inside html style blocks as it is line/col based.
 */
define([
'orion/objects',
'orion/Deferred',
'javascript/compilationUnit'
], function(Objects, Deferred, CU) {
    
    Objects.mixin(CU.prototype, {
        
        /**
         * @description Returns a promise to build the backing source text for the compilation unit, padding the blocks with spaces and newlines
         * @function
         * @private
         * @returns Returns a promise that resolves to the source
         */
        getSource: function getSource() {
        	var promises = [];
        	if (this._ec && this._ec.getLineAtOffset){  // Tests use a fake editorContext with no line/offset functions
	            for (var i=0; i<this._blocks.length; i++) {
	            	var offset = this._blocks[i].offset;
	            	var length = this._blocks[i].text.length;
	            	promises.push(this._ec.getLineAtOffset(offset));
	            	promises.push(this._ec.getLineAtOffset(offset+length));
	            }
            }
            
        	var self = this;
            return Deferred.all(promises).then(function (lines){
            	var totalLength = 0;
            	var totalLines = 0;
            	var source = "";
            	for(var i = 0; i < self._blocks.length; i++) {
	                var block = self._blocks[i];
	    	        var pad = block.offset - totalLength;
	                var linePad = lines && lines.length > (i*2) ? lines[i*2] : 0;
	                linePad -= totalLines;
	    	        while(pad > 0 && linePad > 0){
	    	        	source += '\n'; //$NON-NLS-1$
	    	        	pad--;
	    	        	linePad --;
	    	        }
	                while(pad > 0) {
	                    source += ' '; //$NON-NLS-1$
	                    pad--;
	                }
	                source += block.text;
	                totalLength = source.length;
	                totalLines = lines && lines.length > (i*2) ? lines[(i*2)+1] : 0;
	            }
	            return source;
            });
        }
    });
    
    return CU;
});
