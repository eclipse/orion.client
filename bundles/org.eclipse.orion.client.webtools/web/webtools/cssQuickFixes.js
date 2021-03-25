 /*******************************************************************************
 * @license
 * Copyright (c) 2014 IBM Corporation and others.
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
'orion/metrics'
], function(Objects, Metrics) {
	
	/**
	 * @description Creates a new CSS quick fix computer
	 * @returns {webtools.CssQuickFixes} The new quick fix computer instance
	 * @since 8.0
	 */
	function CssQuickFixes() {
	}
	
	Objects.mixin(CssQuickFixes.prototype, /** @lends webtools.CssQuickFixes.prototype*/ {
		/**
		 * @description Editor command callback
		 * @function
		 * @param {orion.edit.EditorContext} editorContext The editor context
		 * @param {Object} context The context params
		 */
		execute: function(editorContext, context) {
			var id = context.annotation.fixid;
			if (!id){
				id = context.annotation.id;
			}
			Metrics.logEvent('language tools', 'quickfix', id, 'text/css'); //$NON-NLS-1$ //$NON-NLS-2$ //$NON-NLS-3$
		    var fixes = this[id];
	        if(fixes) {
	            return fixes(editorContext, context.annotation);
	        }
		    return null;
		},
		"ignore-on-line": function(editorContext, annotation) {
			return editorContext.getText().then(function(text) {
				// Find end of line
				var lineEnd = getLineEnd(text, annotation.end);
				var insertion = lineEnd;
				var insertionText = " /* csslint allow: " + annotation.id + " */"; //$NON-NLS-1$ //$NON-NLS-2$
				var trailing = text.substring(annotation.end, lineEnd);
				var match = /(\/\*[ \t]*csslint[ \t]*allow:[ \t]*)(\S.*\S)[ \t]*\*\//.exec(trailing);
				if (match){
					insertion = annotation.end + match.index + match[1].length + match[2].length;
					if (match[2].length === 0){
						insertionText = annotation.id;
					} else if (match[2].charAt(match[2].length -1) === ','){
						insertionText = ' ' + annotation.id; //$NON-NLS-1$
					} else {
						insertionText = ', ' + annotation.id; //$NON-NLS-1$
					}
				}
				return editorContext.setText(insertionText, insertion, insertion);
            });
		},
		"empty-rules": function(editorContext, annotation) {
			return editorContext.getText().then(function(text) {
				// Remove leading space
				var start = annotation.start;
				while (start >= 0 && /\s/.test(text[start-1])){
					start--;
				}
				var contents = text.substring(annotation.start);
				contents = contents.match(/^[^{]*{\s*}\s*/,'');
				if (contents){
					return editorContext.setText("", start, start+contents[0].length);
				}
				return null;
            });
		},
		"important": function(editorContext, annotation){
			return editorContext.getText().then(function(text) {
				// The annotation will select the property name. Get the complete property.
				var contents = text.substring(annotation.start);
				var startRange = contents.search(/\s*\!important/i);
				var endRange = contents.search(/[;}]/);
				if (startRange !== 1 && endRange !== -1 && startRange < endRange){
					contents = contents.substring(startRange, endRange);
					contents = contents.replace(/\s*\!important*[ \t]*/gi, "");
					return editorContext.setText(contents, annotation.start+startRange, annotation.start+endRange);
				}
				return null;
            });
		},
		"zero-units": function(editorContext, annotation) {
			return editorContext.getText().then(function(text) {
				var contents = text.substring(annotation.start, annotation.end);
				contents = contents.replace(/0px/gi,'0'); //$NON-NLS-0$
				return editorContext.setText(contents, annotation.start, annotation.end);
            });
		}
	});
	
	/**
     * @description Finds the end of the line in the given text starting at the given offset
     * @param {String} text The text
     * @param {Number} offset The offset 
     * @returns {Number} The offset in the text before the new line or end of file
     */
	function getLineEnd(text, offset) {
		if(!text) {
			return 0;
		}
		if(offset < 0) {
			return 0;
		}
		var off = offset;
		var char = text[off];
		while(off < text.length && !/[\r\n]/.test(char)) {
			char = text[++off];
		}
		return off;
	}
	
	return {
		CssQuickFixes: CssQuickFixes
	};
});
