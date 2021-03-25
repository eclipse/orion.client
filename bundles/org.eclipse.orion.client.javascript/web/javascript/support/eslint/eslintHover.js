/*******************************************************************************
 * @license
 * Copyright (c) 2017 IBM Corporation and others.
 * All rights reserved. This program and the accompanying materials are made
 * available under the terms of the Eclipse Public License 2.0
 * (https://www.eclipse.org/legal/epl-v10.html), and the Eclipse Distribution
 * License v1.0 (https://www.eclipse.org/org/documents/edl-v10.html).
 *
 * Contributors:
 *     IBM Corporation - initial API and implementation
 *******************************************************************************/
define([
	'orion/objects',
	'orion/URITemplate',
	'estraverse/estraverse',
	'javascript/ruleData',
	'javascript/finder',
	'i18n!javascript/nls/messages',
	'orion/i18nUtil',
], function(Objects, URITemplate, Estraverse, RuleData, Finder, Messages, i18nUtil) {

	var astManager,
		resolver,
		project,
		rootItems = Object.freeze({
			ecmaFeatures_experimentalObjectRestSpread: {
				doc: Messages.eslintObjectSpread,
				url: "https://eslint.org/docs/user-guide/configuring#specifying-parser-options"
			},
			ecmaFeatures_globalReturn: {
				doc: Messages.eslintGlobalReturn,
				url: "https://eslint.org/docs/user-guide/configuring#specifying-parser-options"
			},
			ecmaFeatures_impliedStrict: {
				doc: Messages.eslintImpliedStrict,
				url: "https://eslint.org/docs/user-guide/configuring#specifying-parser-options"
			},
			ecmaFeatures_jsx: {
				doc: Messages.eslintJSX,
				url: "https://eslint.org/docs/user-guide/configuring#specifying-parser-options"
			},
			env: {
				doc: Messages.envDoc,
				url: "https://eslint.org/docs/user-guide/configuring#specifying-environments"
			},
			"extends": {
				doc: Messages.eslintExtendsDoc,
				url: "https://eslint.org/docs/user-guide/configuring#extending-configuration-files"
			},
			globals: {
				doc: Messages.eslintGlobalsDoc,
				url: "https://eslint.org/docs/user-guide/configuring#specifying-globals"
			},
			parser: {
				doc: Messages.eslintParserDoc,
				url: "https://eslint.org/docs/user-guide/configuring#specifying-parser"
			},
			parserOptions: {
				doc: Messages.eslintParserOptionsDoc,
				url: "https://eslint.org/docs/user-guide/configuring#specifying-parser-options"
			},
			parserOptions_ecmaVersion: {
				doc: Messages.eslintEcmaVersion,
				url: "https://eslint.org/docs/user-guide/configuring#specifying-parser-options"
			},
			parserOptions_sourceType: {
				doc: Messages.eslintSourceType,
				url: "https://eslint.org/docs/user-guide/configuring#specifying-parser-options"
			},
			parserOptions_ecmaFeatures: {
				doc: Messages.eslintParserOptionsDoc,
				url: "https://eslint.org/docs/user-guide/configuring#specifying-parser-options"
			},
			plugins: {
				doc: Messages.eslintPluginsDoc,
				url: "https://eslint.org/docs/user-guide/configuring#configuring-plugins"
			},
			rules: {
				doc: Messages.rulesDoc,
				url: "https://eslint.org/docs/user-guide/configuring#configuring-rules"
			},
			settings: {
				doc: Messages.eslintSettingsDoc,
				url: "https://eslint.org/docs/user-guide/configuring#adding-shared-settings"
			}
		});
	
	/**
	 * @name javascript.TernProjectHover
	 * @description creates a new instance of the hover
	 * @constructor
	 * @public
	 * @param {javascript.JsonAstManager} jsonAstManager
	 * @param {ScriptResolver} scriptResolver
	 * @param {JavaScriptProject} jsProject The backing JavaScript project context
	 * @since 15.0
	 */
	function ESLintHover(jsonAstManager, scriptResolver, jsProject) {
	    astManager = jsonAstManager;
	    resolver = scriptResolver;
	    project = jsProject;
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
            hover.content += '[!['+siteName+'](../../../webtools/images/html.png)';
       		hover.content += siteName + ']('+path+')\n\n';
        } else {
           hover.content += '[![' + siteName + '](../../../webtools/images/html.png)';
           hover.content += siteName + '](' + path + ') - ' + path + '\n\n';
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
	 * @description Computes the hover information to return
	 * @param {?} ast The AST or AST node to visit. It can be a normal AST node if this function is called from the API
	 * @param {?} ctxt The context from the framework
	 * @returns {?} The formatted markdown hover or null
	 */
	function doHover(ast, ctxt) {
		var node = ast;
		if(ast.type === "Program") {
			node = Finder.findNode(ctxt.offset, ast, {});
		}
		if(node) {
			if(node.type === Estraverse.Syntax.Literal) {
				var item = rootItems[node.value];
				if(item) {
					return formatSimpleHover(item);
				}
				item = RuleData.metadata[node.value];
				if(item) {
					return formatSimpleHover(item);
				} 
				if(node.parent) {
					var p = node.parent;
					switch(p.type) {
						case Estraverse.Syntax.Property: {
							if(typeof node.value === 'string') {
								if(/^(?:http|https):\/\//i.test(node.value)) {
									return formatLinkHover(node.value);
								}
								if(p.key.value === "extends" && (ctxt.offset >= node.range[0] && ctxt.offset <= node.range[1])) {
									if(node.value.indexOf("eslint:") < 0) {
										return doFileHover(ast, node.value);
									}
								}
								var gp = p.parent;
								if(gp && gp.type === "ObjectExpression") {
									p = gp.parent;
									if(p.key.value === "parserOptions" || p.key.value === "ecmaFeatures") {
										var key = p.key.value+'_'+node.value;
										item = rootItems[key];
										if(item) {
											return formatSimpleHover(item);
										}
									}
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
	
	Objects.mixin(ESLintHover.prototype, /** @lends javascript.support.packagejson.PackageJsonHover.prototype*/ {
	    /**
	     * @description Callback from the editor to compute the hover
	     * @function
	     * @public
	     * @param {?} editorContext The current editor context
	     * @param {?} ctxt The current selection context
	     */
	    computeHoverInfo: function computeHoverInfo(editorContext, ctxt) {
	        if (ctxt.proposal && ctxt.proposal.kind === 'eslint') {
	            return ctxt.proposal.hover;
	        }
	        return editorContext.getFileMetadata().then(function metadata(meta) {
	        	if(meta.name !== project.PACKAGE_JSON && project.lintFiles.indexOf(meta.name) > -1) {
	        		//we don;t want to be included in package.json hover all the time - only if it calls back to this hover support
	        		//when eslintOptions are present
	        		return astManager.getWellFormedAST(editorContext, meta.name).then(function(ast) {
		            	if(ast) {
		            		return doHover(ast, ctxt);
		            	}
		            	return null;
		            });
	        	}
	        	return null;
	        });
	    }
	});

	return {
		ESLintHover: ESLintHover,
		doHover: doHover
	};
});
