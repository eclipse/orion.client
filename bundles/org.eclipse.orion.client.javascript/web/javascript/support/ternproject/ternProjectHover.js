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
/* global doctrine */
define([
	'orion/objects',
	'orion/URITemplate',
	'i18n!javascript/nls/messages',
	'orion/i18nUtil',
	'plugins/languages/json/visitor',
	'javascript/plugins/ternMetadata'
], function(Objects, URITemplate, Messages, i18nUtil, Visitor, TernMetadata) {

	var astManager,
		resolver;
	
	/**
	 * @name javascript.TernProjectHover
	 * @description creates a new instance of the hover
	 * @constructor
	 * @public
	 * @param {javascript.JsonAstManager} jsonAstManager
	 * @param {ScriptResolver} scriptResolver
	 * @since 15.0
	 */
	function TernProjectHover(jsonAstManager, scriptResolver) {
	    astManager = jsonAstManager;
	    resolver = scriptResolver;
	}
	
	/**
	 * The initial listing of hover information
	 */
	var hovers = Object.create(null);
	
	//mixin the tern data
	Objects.mixin(hovers, TernMetadata.attributes);
	Objects.mixin(hovers, TernMetadata.definitions);
	Objects.mixin(hovers, TernMetadata.plugins.required.doc_comment);
	Objects.mixin(hovers, TernMetadata.plugins.optional);
	
	/**
     * @description Formats the list of files as links for the hover
     * @function
     * @private
     * @param {String} path The path we are navigating to
     * @param {Array.<javascript.ScriptResolver.File>} files The array of files to linkify
     * @returns {String} The mardown to show in the hover
     */
    function formatFilesHover(path, files) {
        if (path && files) {
            var title = null;
            if (files.length > 1) {
                title = i18nUtil.formatMessage('###${0} \'${1}\'###', Messages['openFileForTitle'], path); //$NON-NLS-1$
            }
            var hover = '';
            for (var i = 0; i < files.length; i++) {
                var file = files[i];
                if (file.name && file.path && file.contentType) {
                    hover += '[';
                    var href = new URITemplate("#{,resource,params*}").expand( //$NON-NLS-1$
                        {
                            resource: file.location,
                            params: {}
                        });
                    hover += file.name + '](' + href + ') - ' + file.path + '\n\n'; //$NON-NLS-3$ //$NON-NLS-2$ //$NON-NLS-1$
                }
            }
            return {
                title: title,
                content: hover,
                type: 'markdown',
                allowFullWidth: true
            };
        }
        return null;
    }
	
	/**
	 * @description Computes the hover information to return
	 * @param {?} ast The AST to visit
	 * @param {?} ctxt The context from the framework
	 * @returns {?} The formatted markdown hover or null
	 */
	function doHover(ast, ctxt) {
		var node = Visitor.findNodeAtOffset(ast, ctxt.offset);
		if(node) {
			if(node.type === 'string' && node.value) {
				var item = hovers[node.value];
				if(item) {
					var h = {
						type: 'markdown',
						content: ""
					};
					if(item.doc) {
						h.content += item.doc;
					} else if(item.description) {
						h.content += item.description;
					}
					if(item.version) {
						h.content += i18nUtil.formatMessage('\n\n__${0}__: ', Messages['versionHoverTitle'])+item.version;
					}
					if(item.url) {
						h.content += i18nUtil.formatMessage.call(null, Messages['onlineDocumentationProposalEntry'], item.url);
					}
					return h;
				} else if(node.parent) {
					var p = node.parent;
					if(p && p.type === 'array') {
						var gp = p.parent;
						if(gp && Array.isArray(gp.children) && gp.children.length > 1) {
							var child = gp.children[0];
							if(child.type === 'string' && (child.value === 'loadEagerly' || child.value === 'dontLoad' || 
								(child.value === "libs" && node.value.startsWith(".definitions")))) {
								//resolve file hovers
								resolver.setSearchLocation(ast.root);
								return resolver.getWorkspaceFile(node.value).then(function(files) {
                        			return formatFilesHover(node.value, files);
                   				});
							}
						}
					}
				}
			}
		}
		return null;
	}
	
	Objects.mixin(TernProjectHover.prototype, /** @lends javascript.TernProjectHover.prototype*/ {
	
	    /**
	     * @description Callback from the editor to compute the hover
	     * @function
	     * @public
	     * @param {?} editorContext The current editor context
	     * @param {?} ctxt The current selection context
	     */
	    computeHoverInfo: function computeHoverInfo(editorContext, ctxt) {
	        if (ctxt.proposal && ctxt.proposal.kind === 'ternproject') {
	            return ctxt.proposal.hover;
	        }
            return astManager.getAST(editorContext, ".tern-project").then(function(ast) {
            	if(ast) {
            		return doHover(ast, ctxt);
            	}
            	return null;
            });
	    }
	});

	return TernProjectHover;
});
