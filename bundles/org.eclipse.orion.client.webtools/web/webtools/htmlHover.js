 /*******************************************************************************
 * @license
 * Copyright (c) 2015, 2017 IBM Corporation and others.
 * All rights reserved. This program and the accompanying materials are made 
 * available under the terms of the Eclipse Public License 2.0 
 * (http://www.eclipse.org/legal/epl-v10.html), and the Eclipse Distribution 
 * License v1.0 (http://www.eclipse.org/org/documents/edl-v10.html). 
 *
 * Contributors:
 *     IBM Corporation - initial API and implementation
 *******************************************************************************/
/*eslint-env amd, node*/
define([
'orion/objects',
'orion/URITemplate',
'webtools/util'
], function(Objects, URITemplate, util) {
	
	/**
	 * @description creates a new instance of the hover support
	 * @constructor
	 * @public
	 * @param {Object} htmlAstManager The shared AST manager for HTML DOMs
	 * @param {Object} resolver The shared script resolver
	 * @since 8.0
	 */
	function HTMLHover(htmlAstManager, resolver) {
	    this.htmlAstManager = htmlAstManager;
	    this.resolver = resolver;
	}
	
	Objects.mixin(HTMLHover.prototype, /** @lends webtools.HTMLHover.prototype*/ {
		
		_hoverableTags: ['div', 'h1', 'h2', 'h3', 'h4', 'h5', 'body', 'p', 'ol', 'ul', 'li', 'table', 'td', 'tr', 'textarea', 'select', 'form', 'pre'],
		
		/**
		 * @description Callback from the editor to compute the hover
		 * @function
		 * @public 
		 * @memberof webtools.HTMLHover.prototype
		 * @param {Object} editorContext The current editor context
		 * @param {Object} ctxt The current selection context
		 * @callback
		 */
		computeHoverInfo: function computeHover(editorContext, ctxt) {
			if(ctxt.proposal && ctxt.proposal.kind === 'html') {
				return ctxt.proposal.hover ? ctxt.proposal.hover : (ctxt.proposal.name ? ctxt.proposal.name : ctxt.proposal.description);
			}
			var that = this;
			return that.htmlAstManager.getAST(editorContext).then(function(ast) {
			    if(ast) {
			        var node = util.findNodeAtOffset(ast, ctxt.offset);
			        if(node) {
			            switch(node.type) {
			                case 'tag': {
			                	if (that._hoverableTags.indexOf(node.name) >= 0){
			                		//return that._getTagContentsHover(editorContext, node.range);
			                	}
			                    break;
			                }
			                case 'attr': {
			                    var path = node.value;
			                    switch(node.name) {
			                        case 'href': {
			                            if(/\.(?:png|jpg|jpeg|bmp|gif)$/.test(path)) {
                            	            return that._getImageHover(editorContext, path);
                            	        } else if(/^data:image.*;base64/i.test(path)) {
                            	            return that._getImageHover(editorContext, path, true);
                            	        }
			                            return that._getFileHover(editorContext, path);
			                        }
			                        case 'src': {
			                            if(/\.(?:png|jpg|jpeg|bmp|gif)$/.test(path)) {
                            	            return that._getImageHover(editorContext, path);
                            	        } else if(/^data:image.*;base64/i.test(path)) {
                            	            return that._getImageHover(editorContext, path, true);
                            	        } else if(/\.js$/i.test(path)) {
                            	            return that._getFileHover(editorContext, path);
                            	        }
                            	        break;
			                        }
			                        case 'style': {
			                            //TODO support embedded style sheets
			                            break;
			                        }
			                    }
			                    break;
			                }
			            }
			        }
			    }
			    return null; 
			});
		},

		_getFileHover: function _getFileHover(editorContext, path) {
		    if(path) {
		        if(/^http/i.test(path)) {
    	            return this._formatFilesHover(path);
    	        }
		        var that = this;
		        var opts;
		        if(/\.css$/i.test(path)) {
		            opts = {ext:'css', type:'CSS', icon:'../webtools/images/css.png'}; //$NON-NLS-3$ //$NON-NLS-1$ //$NON-NLS-2$
		        } else if(/\.htm.*/i.test(path)) {
		            opts = {ext:'html', type:'HTML', icon:'../webtools/images/html.png'}; //$NON-NLS-3$ //$NON-NLS-1$ //$NON-NLS-2$
		        } else if(!/\.js$/i.test(path)) {
		            return null;
		        }
		        return editorContext.getFileMetadata().then(function(meta) {
		        	if(Array.isArray(meta.parents) && meta.parents.length > 0) {
						that.resolver.setSearchLocation(meta.parents[meta.parents.length - 1].Location);
					} else {
						that.resolver.setSearchLocation(null);	
					}
    		        return that.resolver.getWorkspaceFile(path, opts).then(function(files) {
    		        	var rels  = that.resolver.resolveRelativeFiles(path, files, meta);
        		    	if(rels && rels.length > 0) {
        		        	return that._formatFilesHover(path, rels);
        		    	}
    		        });    
		        });
		    }
		    return null;
		},
		
		/**
    	 * @description Formats the list of files as links for the hover
    	 * @function
    	 * @private
    	 * @param {String} path The path we are navigating to
    	 * @param {Array.<javascript.ScriptResolver.File>} files The array of files to linkify
    	 * @returns {String} The mardown to show in the hover
    	 */
    	_formatFilesHover: function _formatFilesHover(path, files) {
    	    if(path) {
    	        var title = null;
    	        if(files && files.length > 1) {
    	            '###Open file for \''+path+'\'###';
    	        }
    	        var hover = '';
    	        if(Array.isArray(files)) {  
        	        for(var i = 0; i < files.length; i++) {
        	            var file = files[i];
        	            if(file.name && file.path && file.contentType) {
        	                hover += '[';
        	                if(file.contentType.icon) {
        	                    hover += '!['+file.contentType.name+']('+file.contentType.icon+')';
        	                }
        	                var href = new URITemplate("#{,resource,params*}").expand(
        		                      {
        		                      resource: file.location, 
        		                      params: {}
        		                      });
        	                hover += file.name + ']('+href+') - '+file.path+'\n\n';
        	            }
        	            
        	        }
    	        } else {
    	            var site = false;
    	            var tmp = /^\s*http\s*:\s*\/\s*\/\s*(.*)/i.exec(path);
    	            if(tmp) {
    	                tmp = tmp[1];
    	                if(tmp.charAt(tmp.length-1) === '/') {
    	                   tmp = tmp.slice(0, tmp.length-1);
    	               }
    	               site = tmp.indexOf('/') === -1;
    	            }
    	            var name = path.slice(path.lastIndexOf('/')+1);
    	            if(site) {
    	                name = tmp;
    	            }
    	            if(site) {
    	               name = tmp;
    	               //title = '###Open site \''+name+'\'';
    	               hover += '[!['+name+'](../webtools/images/html.png)';
    	               hover += name + ']('+path+')\n\n';
    	            } else {
    	               //title = '###Open file for \''+name+'\'###';
        	            var img = null;
        	             if(/\.css$/i.test(path)) {
        		            img = '../webtools/images/css.png';
        		        } else if(/\.htm.*/i.test(path)) {
        		            img = '../webtools/images/html.png';
        		        } else {
        		            img = '../webtools/images/file.png';
        		        }
        		        hover += '[!['+name+']('+img+')';
    	                hover += name + ']('+path+') - '+path+'\n\n';
	                }
    	        }
    	        if(hover !== '') {
    	           return {title: title, content: hover, type:'markdown', allowFullWidth: true};
    	        }
    	    }
    	    return null;
    	},
		
		_getImageHover: function _getImageHover(editorContext, path, base64) {
		      if(path) {
		          if(/^http/i.test(path) || base64) {
    		          var html = '<html><body style="margin:1px;"><img src="'+path+'" style="width:100%;height:100%;"/></body></html>'; //$NON-NLS-0$  //$NON-NLS-1$
    			      return {type: "html", content: html, width: "100px", height: "100px"};  //$NON-NLS-0$  //$NON-NLS-1$  //$NON-NLS-2$
		          }
	              var idx = path.lastIndexOf('.');
	              if(idx > -1) {
	                  var ext = path.slice(idx+1);
	                  var that = this;
	                  return editorContext.getFileMetadata().then(function(meta) {
	                  	if(Array.isArray(meta.parents) && meta.parents.length > 0) {
							that.resolver.setSearchLocation(meta.parents[meta.parents.length - 1].Location);
						} else {
							that.resolver.setSearchLocation(null);	
						}
	                    return that.resolver.getWorkspaceFile(path, {ext:ext, type:'Image', icon:'../webtools/images/file.png'}).then(function(files) {
                			if(files && files.length > 0) {
                		    	var resolved = that.resolver.resolveRelativeFiles(path, files, meta);
                		        if(resolved && resolved.length > 0) {
                		        	var html = '<html><body style="margin:1px;"><img src="'+resolved[0].location+'" style="width:100%;height:100%;"/></body></html>'; //$NON-NLS-0$  //$NON-NLS-1$
    			                    return {type: "html", content: html, width: "100px", height: "100px"};  //$NON-NLS-0$  //$NON-NLS-1$  //$NON-NLS-2$
                		       	}
                		    }
            	        });
	              	});
	              }
		      }
		},
		
		_getColorHover: function _getColorHover(colorID){
			var html = '<html><body style=\"background-color: ' + colorID + ';\"></html>'; //$NON-NLS-0$  //$NON-NLS-1$
			return {type: "html", content: html, width: "50px", height: "25px"};  //$NON-NLS-0$  //$NON-NLS-1$  //$NON-NLS-2$
		},
		
		_getTagContentsHover: function _getTagContentsHover(editorContext, range){
			if (range){
				var self = this;
				return editorContext.getText().then(function(text) {
					if(range[0] >= 0 && range[0] < text.length && range[1] > range[0] && range[1] <= text.length){
						var start = self._findTagStart(text, range[0]);
						if (start === null){
							return null;
						}
						var html = "<body style=\"background-color:white\">" + text.substring(start, range[1]) + "</body>";  //$NON-NLS-0$  //$NON-NLS-1$
						return {type: "html", content: html};  //$NON-NLS-0$  //$NON-NLS-1$
					}
				});
			}
			return null;
		},
		
		/**
		 * @description Returns the offset that the tag starts with (location of '<');
		 * @param {String} contents The text to search for the tag start
		 * @param {Number} offset The offset in the contents to start the search
		 * @returns {Number} offset of the tag or <code>null</code>
		 * @since 8.0
		 */
		_findTagStart: function(contents, offset) {
			if(contents && offset) {
				var pos = offset;
				while(pos >= 0) {
					if(contents.charAt(pos) === '<') {
						return pos;
					}
					pos--;
				}
			}
			return null;
		}
		
	});
	
	return {
		HTMLHover: HTMLHover
	};
});
