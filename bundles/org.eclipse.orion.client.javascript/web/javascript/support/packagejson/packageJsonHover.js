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
	'estraverse/estraverse',
	'javascript/support/packagejson/packageJsonMetadata',
	'javascript/finder',
	'javascript/support/eslint/eslintHover',
	'i18n!javascript/nls/messages',
	'orion/i18nUtil',
], function(Objects, URITemplate, Estraverse, Metadata, Finder, ESLintHover, Messages, i18nUtil) {

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
	function PackageJsonHover(jsonAstManager, scriptResolver) {
	    astManager = jsonAstManager;
	    resolver = scriptResolver;
	}
	
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
	 * @description Formats the hover link to open the path of the website
	 * @param {string} path The URL path to open
	 * @returns {?} The hover object
	 */
	function formatLinkHover(path) {
		var site = false,
			hover = {
                content: "",
                type: 'markdown',
                allowFullWidth: true
            };
        var match = /^\s*(?:http|https)\s*:\s*\/\s*\/\s*(.*)/i.exec(path);
        if(Array.isArray(match)) {
            var tmp = match[1];
            if(tmp.charAt(tmp.length-1) === '/') {
               tmp = tmp.slice(0, tmp.length-1);
           }
           site = tmp.indexOf('/') === -1;
        }
        var siteName = path.slice(path.lastIndexOf('/') + 1);
        if(site) {
            siteName = tmp;
            hover.content += '['+ siteName + ']('+path+')\n\n';
        } else {
           hover.content += '['+ siteName + '](' + path + ') - ' + path + '\n\n';
       }
       return hover;
	}
	
	/**
	 * @description Formats the simple literal entry hover
	 * @param {?} item The metadata item
	 * @returns {?} The hover object
	 */
	function formatSimpleHover(item) {
		var h = {
			type: 'markdown',
			content: ""
		};
		if(item.doc) {
			h.content += item.doc;
		} else if(item.description) {
			h.content += item.description;
		}
		if(item.url) {
			h.content += i18nUtil.formatMessage.call(null, Messages['onlineDocumentationProposalEntry'], item.url);
		}
		return h;
	}
	
	/**
	 * @description Perform the file nav hover
	 * @param {?} ast The AST
	 * @param {?} path The node value we are hovering over
	 * @returns {Deferred} The deferred to resolve to a hover
	 */
	function doFileHover(ast, path) {
		resolver.setSearchLocation(ast.root);
		return resolver.getWorkspaceFile(path).then(function(files) {
			return formatFilesHover(path, files);
   		});
	}
	
	/**
	 * @description Perform the actual hover
	 * @param {?} node The AST node we are hovering on
	 * @returns {?} The hover object or null
	 */
	function doDependencyHover(node) {
		if(node && node.parent) {
			var p = node.parent,
				n = node;
			if(p.value.range[0] === node.range[0]) {
				//hovering the version number, grab the key
				n = p.key;
			}
			//TODO we need to be able to reach out to NPM for some sueful information
		}
		return null;
	}
	
	/**
	 * @description Returns if the node is in the root object expression
	 * @param {?} node The AST node we are hovering over
	 * @returns {bool} True if the node is a root property, false otherwise
	 */
	function isRootNode(node) {
		if(node && node.parent) {
			var p = node.parent;
			if(p.type === Estraverse.Syntax.ObjectExpression) {
				return p.parent.type === Estraverse.Syntax.Program;
			}
			if(p.type === Estraverse.Syntax.Property && p.parent) {
				p = p.parent;
				return p && p.parent && p.parent.type === Estraverse.Syntax.Program;
			}
		}
		return false;
	}
	
	/**
	 * @description Returns if the node is within the eslintConfig entry
	 * @param {?} node The AST node we are hovering over
	 * @returns {bool} True if the node is contained within the eslintConfig entry, false otherwise
	 */
	function isEslint(node) {
		if(node) {
			var p = node.parent;
			while(p) {
				if(p.type === Estraverse.Syntax.Property && p.key.value === "eslintConfig") {
					return true;
				}
				p = p.parent;
			}
		}
		return false;
	}
	
	/**
	 * @description Computes the new parent property node from the given node. This is the first parent with type of "Property"
	 * @param {?} node The AST node context
	 * @returns {?} The first AST node parent of type "Property" or null
	 */
	function getParentProperty(node) {
		if(node && node.parent) {
			var p = node.parent;
			while(p)  {
				if(p.type === Estraverse.Syntax.Property) {
					return p;
				}
				p = p.parent;
			}
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
		var node = Finder.findNode(ctxt.offset, ast, {});
		if(node) {
			if(node.type === Estraverse.Syntax.Literal) {
				var item = Metadata[node.value];
				if(item && isRootNode(node)) {
					return formatSimpleHover(item);
				} 
				if(node.parent) {
					var p = node.parent;
					if(isEslint(node)) {
						return ESLintHover.doHover(node, ctxt);
					}
					switch(p.type) {
						case Estraverse.Syntax.Property: {
							if(typeof node.value === 'string') {
								if(/^(?:http|https):\/\//i.test(node.value)) {
									return formatLinkHover(node.value);
								} else if(node.value.indexOf('file:') === 0) {
									return doFileHover(ast, node.value.slice(5));
								} else if(ctxt.offset > p.key.range[1] && (p.key.value === "bin" || p.key.value === "main")) {
									return doFileHover(ast, node.value);
								} 
								var prop = getParentProperty(p);
								if(prop) {
									var key = prop.key.value;
									if(isRootNode(prop) && key === "dependencies" || key === "devDependencies" || key === "optionalDependencies" || key === "peerDependencies" || key === "bundledDependencies") {
										return doDependencyHover(node);
									} else if(key === "directories") {
										item = Metadata["directories_"+node.value];
										if(item) {
											return formatSimpleHover(item);
										}
									}
								}
							}
							break;
						}
						case Estraverse.Syntax.ArrayExpression: {
							var gp = p.parent;
							if(gp && gp.type === Estraverse.Syntax.Property) {
								if(gp.key.value === "files") {
									return doFileHover(ast, node.value);
								}
							}
							break;
						}
					}
				}
			}
		}
		return null;
	}
	
	Objects.mixin(PackageJsonHover.prototype, /** @lends javascript.support.packagejson.PackageJsonHover.prototype*/ {
	
	    /**
	     * @description Callback from the editor to compute the hover
	     * @function
	     * @public
	     * @param {?} editorContext The current editor context
	     * @param {?} ctxt The current selection context
	     */
	    computeHoverInfo: function computeHoverInfo(editorContext, ctxt) {
	        if (ctxt.proposal && ctxt.proposal.kind === 'packagejson') {
	            return ctxt.proposal.hover;
	        }
            return astManager.getWellFormedAST(editorContext, "package.json").then(function(ast) {
            	if(ast) {
            		return doHover(ast, ctxt);
            	}
            	return null;
            });
	    }
	});

	return PackageJsonHover;
});
