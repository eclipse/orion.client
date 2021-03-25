/*******************************************************************************
 * @license
 * Copyright (c) 2014, 2017 IBM Corporation and others.
 * All rights reserved. This program and the accompanying materials are made
 * available under the terms of the Eclipse Public License 2.0
 * (http://www.eclipse.org/legal/epl-v10.html), and the Eclipse Distribution
 * License v1.0 (http://www.eclipse.org/org/documents/edl-v10.html).
 *
 * Contributors:
 *     IBM Corporation - initial API and implementation
 *******************************************************************************/
/*eslint-env amd*/
define("webtools/cssValidator", [
	"orion/objects",
	"webtools/compilationUnit",
	"webtools/util",
	"i18n!webtools/nls/problems",
	"orion/i18nUtil"
], function(Objects, CU, Util, Messages, i18nUtil) {

	/**
	 * @description Creates a new validator
	 * @constructor
	 * @public
	 * @param {CssResultManager} cssResultManager The back result manager
	 * @since 6.0
	 */
	function CssValidator(cssResultManager) {
	    this.cssResultManager = cssResultManager;
	}

	Objects.mixin(CssValidator.prototype, /** @lends webtools.CssValidator.prototype*/ {
		
		/**
		 * @description Callback to create problems from orion.edit.validator
		 * @function
		 * @public
		 * @param {orion.edit.EditorContext} editorContext The editor context
		 * @param {Object} context The in-editor context (selection, offset, etc)
		 * @returns {orion.Promise} A promise to compute some problems
		 * @callback
		 */
		computeProblems: function(editorContext, context) {
			return editorContext.getFileMetadata().then(function(meta) {
			    if(meta && meta.contentType.id === "text/html") {
			    	// Only run the validator if we have line information because cssLint uses line num and column, not offsets
			    	if (!editorContext.getLineAtOffset){
			    		return null;
			    	}
			        return editorContext.getText().then(function(text) {
    			         var blocks = Util.findStyleBlocks(text, context.offset);
    			         if(blocks && blocks.length > 0) {
    			             var cu = new CU(blocks, meta, editorContext);
    			             return this.cssResultManager.getResult(cu.getEditorContext()).then(function(results) {
                			    if(results) {
                			         return this._computeProblems(results);
                			    }
                			    return null;
        			         }.bind(this));
    			         }
			         }.bind(this));
			    }
			    return this.cssResultManager.getResult(editorContext).then(function(results) {
    			    if(results) {
    			         return this._computeProblems(results);
    			    }
    			    return null;
    			}.bind(this));
			}.bind(this));
		},
		
		/**
		 * @description Create the problems
		 * @function
		 * @private
		 * @param {String} contents The file contents
		 * @returns {Array} The problem array
		 */
		_computeProblems: function(results) {
			    var messages = results.messages,
			    problems = [],
			    cssRuleId;
			for (var i=0; i < messages.length; i++) {
				var message = messages[i],
					range = null,
					id = this._getProblemId(message);
				if(!id) {
					continue;
				}
				if(message.token) {
				    range = [message.token.range[0]+1, message.token.range[1]+1];
				} else if (message.line) {
					range = this._getProblemRange(message);
				} else {
					range = [0,0];
					// Try to select the first rule identifier as 0,0 ranges are hard to see
					if (results.tokens){
						for (var j = 0; j < results.tokens.length; j++) {
							var token = results.tokens[j];
							if (token.type === 'IDENT'){
								message.line = undefined; // Tokens use offset range, not line+range
								range = token.range;
								break;
							}
						}
					}
				}
				// We don't want the ignore quickfix to show up for certain problems (Bug 514433)
				cssRuleId = undefined;
				var noIgnoreQuickfix = ['errors', 'import-ie-limit', 'floats', 'font-faces', 'font-sizes', 'selector-max-approaching', 'selector-max']; //$NON-NLS-1$ //$NON-NLS-2$ //$NON-NLS-3$ //$NON-NLS-4$ //$NON-NLS-5$ //$NON-NLS-6$ //$NON-NLS-7$
				if (noIgnoreQuickfix.indexOf(id) === -1){
					cssRuleId = id;
				}
				if(range) {
    				problems.push({
						id: id,
						description: this._getMessage(message),
						line: message.line,
						start: range[0],
						end: range[1],
						severity: message.type,
						data: {
							ruleSource: 'css', //$NON-NLS-1$
							cssRuleId: cssRuleId
						}
					});
				}
			}
			return {problems: problems};
		},
		 /**
 		 * @name _getMessage
 		 * @description Get the message from the problem object. This fuction also checks for an
 		 * NLS'd version of the message using its problem id
 		 * @function
 		 * @private
 		 * @param {?} problem The problem object
 		 * @returns {string} The problem message to display to the user
 		 * @since 13.0
 		 */
 		_getMessage: function _getMessage(problem) {
		 	var id = this._getProblemId(problem);
		 	if(id) {
		 		var key = problem.data && problem.data.nls ? problem.data.nls : id,
		 			m = Messages[key];
		 		if(m) {
		 			return i18nUtil.formatMessage.call(null, m, problem.data || {});
		 		}
		 	}
		 	return problem.message;
		 },
		 
		/**
		 * @description Computes the problem id to use in the framework from the cssLint message
		 * @param {Object} message The original CSSLint problem message
		 * @returns {String} The problem id to pass into the framework
		 * @since 8.0
		 */
		_getProblemId: function(message) {
		    if(message.rule) {
		        if(message.rule.id) {
		            return message.rule.id;
		        }
		    }
		    if(message.data && message.data.nls) {
		    	return message.data.nls;
		    }
		    return null;
		},
		
		/**
		 * @description Computes the problem range (within the line) for the problem annotation
		 * @param {Object} message The original CSSLint problem message
		 * @returns {Object} Object containing start and end properties to pass into the framework
		 * @since 8.0
		 */
		_getProblemRange: function(message) {
			if (!message.rule || !message.rule.id || message.rule.id === "errors"){
				// Parsing errors often don't have a token to select, so instead select the line
				return [1, message.evidence.length + 1];
			}
		    var token = this._findToken(message.evidence, message.col);
		    var end = message.col + (token ? token.length : 1);
		    return [message.col, end];
		},
		
		_punc: "\n\t\r (){}[]:;,",  //$NON-NLS-0$
		
		/**
		 * @description Returns the token or word found at the given offset
		 * @param {String} contents The text to search for the token
		 * @param {Number} offset The offset in the contents to start the search
		 * @returns {String} Returns the computed token from the given string and offset or <code>null</code>
		 * @since 8.0
		 */
		_findToken: function(contents, offset) {
			if(contents && offset) {
				var ispunc = this._punc.indexOf(contents.charAt(offset)) > -1;
				var pos = ispunc ? offset-1 : offset;
				while(pos >= 0) {
					if(this._punc.indexOf(contents.charAt(pos)) > -1) {
						break;
					}
					pos--;
				}
				var s = pos;
				pos = offset;
				while(pos <= contents.length) {
					if(this._punc.indexOf(contents.charAt(pos)) > -1) {
						break;
					}
					pos++;
				}
				if((s === offset || (ispunc && (s === offset-1))) && pos === offset) {
					return null;
				}
				else if(s === offset) {
					return contents.substring(s, pos);
				}
				return contents.substring(s+1, pos);
			}
			return null;
		},
		
	});
	
	return CssValidator;
});
