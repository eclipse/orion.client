/*******************************************************************************
 * @license
 * Copyright (c) 2015, 2017 IBM Corporation, Inc. and others.
 * All rights reserved. This program and the accompanying materials are made
 * available under the terms of the Eclipse Public License 2.0
 * (http://www.eclipse.org/legal/epl-v10.html), and the Eclipse Distribution
 * License v1.0 (http://www.eclipse.org/org/documents/edl-v10.html).
 *
 * Contributors:
 *   IBM Corporation - Various improvements
 ******************************************************************************/
/*eslint-env amd, browser, node */
define([
	'i18n!javascript/nls/messages',
    'orion/Deferred',
	'orion/objects',
	'javascript/finder',
	'orion/editor/templates',
	'javascript/hover',
	'javascript/util',
	'javascript/contentAssist/sigparser',
	'orion/i18nUtil'
], function(Messages, Deferred, Objects, Finder, mTemplates, Hover, Util, SigParser, i18nUtil) {
	/**
	 * @description Creates a new TernContentAssist object
	 * @constructor
	 * @public
	 * @param {javascript.ASTManager} astManager An AST manager to create ASTs with
	 * @param {TernWorker} ternWorker The worker running Tern
	 * @param {?} cuprovider The CU Provider that caches compilation units
	 * @param {JavaScriptProject} jsproject The backing Javascript project
	 */
	function TernContentAssist(astManager, ternWorker, cuprovider, jsproject) {
		this.astManager = astManager;
		this.ternworker = ternWorker;
		this.cuprovider = cuprovider;
		this.timeout = null;
		this.jsProject = jsproject;
	}

	/**
	 * Main entry point to provider
	 */
	Objects.mixin(TernContentAssist.prototype, {

		/**
		 * @private
		 */
		_getPrefixStart: function(text, offset) {
			var index = offset;
			while (index > 0) {
				var char = text.substring(index - 1, index);
				if (/[A-Za-z0-9_$]/.test(char)) {
					index--;
				} else {
					break;
				}
			}
			return index;
		},
		/**
		 * @callback 
		 */
		computePrefix: function(editorContext, offset) {
			return editorContext.getText().then(function (text) {
				return text.substring(this._getPrefixStart(text, offset), offset);
			}.bind(this));
		},
		/**
		 * Called by the framework to initialize this provider before any <tt>computeContentAssist</tt> calls.
		 */
		initialize: function() {
		    //override
		},

		/**
		 * @description Implements the Orion content assist API v4.0
		 */
		computeContentAssist: function(editorContext, params) {
			return editorContext.getFileMetadata().then(function(meta) {
			    if(meta.contentType.id === 'text/html') {
			        return editorContext.getText().then(function(text) {
			        	var cu = this.cuprovider.getCompilationUnit(function(){
		            		return Finder.findScriptBlocks(text);
		            	}, meta);
    			        if(cu.validOffset(params.offset)) {
    			            return this.astManager.getAST(cu.getEditorContext()).then(function(ast) {
			            		return this.doAssist(ast, params, meta, {ecma5:true, ecma6:true, ecma7: true, browser:true}, text);
			            	}.bind(this));
    			        }
    			        return [];
			        }.bind(this));
			    } 
		        return this.astManager.getAST(editorContext).then(function(ast) {
	        		return this.doAssist(ast, params, meta, {ecma5: true, ecma6: true, ecma7: true});
	        	}.bind(this));
			}.bind(this));
		},

		doAssist: function(ast, params, meta, envs, htmlsource) {
			return this.jsProject.getComputedEnvironment().then(function(cenv) {
				Objects.mixin(envs, cenv && cenv.envs ? cenv.envs : {});
			    var files = [
			    	{type:'full', name: meta.location, text: htmlsource ? htmlsource : ast.sourceFile.text} //$NON-NLS-1$
			    ];
			    if(typeof params.keywords === 'undefined') {
			    	params.keywords = true;
			    }
			    params.ecma = typeof cenv.ecmaVersion === 'number' ? cenv.ecmaVersion : 6;
			    var env = this.getActiveEnvironments(ast, envs);
			    var args = {params: params, meta: meta, envs: env, files: files};
				var deferred = new Deferred();
				var that = this;
				this.ternworker.postMessage({request: 'completions', args: args}, //$NON-NLS-1$
					/* @callback */ function(response, err) {
						clearTimeout(that.timeout);
						var p = [];
						if(Array.isArray(response.proposals)) {
							p = response.proposals;
						}
			        	deferred.resolve(sortProposals(p, args));
					}
	        	);
				
				if(this.timeout) {
					clearTimeout(this.timeout);
				}
				this.timeout = setTimeout(function() {
					if(deferred) {
						// In the editor we can't return an error message here or it will be treated as a proposal and inserted into text
						deferred.resolve(params.timeoutReturn ? params.timeoutReturn : []);
					}
					that.timeout = null;
				}, params.timeout ? params.timeout : 5000);
				return deferred;
			}.bind(this));
		},
		getActiveEnvironments: function getActiveEnvironements(ast, defenvs) {
			var env = Object.create(null);
			Objects.mixin(env, defenvs);
			if(ast.comments) {
				for(var i = 0; i < ast.comments.length; i++) {
					var comment = ast.comments[i];
					if (comment.type === "Block") {
			            var value = comment.value.trim();
			            var match = /^(eslint-\w+|eslint|globals?)(\s|$)/.exec(value);
						if (match) {
			                value = value.substring(match.index + match[1].length);
			                if(match[1] === 'eslint-env') {
			                	// Collapse whitespace around ,
							    var string = value.replace(/\s*,\s*/g, ",");
							    string.split(/,+/).forEach(function(_name) {
							        var _n = _name.trim();
							        if (!_n) {
							            return;
							        }
							        env[_n] = true;
							    });
			                }
			            }
			        }
				}
			}
			//correct the missing mappings
			if(env.amd) {
				env.requirejs = true;
			}
			if(env.mongo) {
				env.mongdb = true;
			}
			if(env.pg) {
				env.postgres = true;
			}
		    return env;
		}
	});

	var operators = {
		'async': true,
		'await': true,
    	'delete': true,
    	'new': true,
    	'instanceof': true,
    	'super': true,
    	'this': true,
    	'typeof': true,
    	'void': true,
    	'yield': true
    };

    /**
     * @description Returns the root URL to use for the online doc portion of a keyword proposal
     * @param keyword
     * @returns returns
     */
    function getKeywordLink(keyword) {
    	var key = keyword;
    	switch(keyword) {
    		case 'async': {
    			key = 'async_function';
    			break;
    		}
    		case 'do': {
    			key = 'do...while'; //$NON-NLS-1$
    			break;
    		}
    		case 'in': {
    			key = 'for...in'; //$NON-NLS-1$
    			break;
    		}
    		case 'try':
    		case 'catch':
    		case 'finally': {
    			key = 'try...catch'; //$NON-NLS-1$
    			break;
    		}
    		case 'case':
    		case 'default' : {
    			key = 'switch'; //$NON-NLS-1$
    			break;
    		}
    		case 'if':
    		case 'else': {
    			key = 'if...else'; //$NON-NLS-1$
    			break;
    		}
    	}
    	if(operators[keyword]) {
    		return 'https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Operators/'+key; //$NON-NLS-1$
    	} else if(keyword === 'extends') {
    		return 'https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Classes/'+key; //$NON-NLS-1$
    	}
    	return 'https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Statements/'+key; //$NON-NLS-1$
    }

    /**
	 * @name _formatTernProposal
	 * @description Formats the proposal
	 * @function
	 * @private
	 * @param {tern.Completion} completion The Tern proposal object
	 * @param {Object} args The arguments from the original
	 * @returns {orion.Proposal} An Orion-formatted proposal object
	 */
	function _formatTernProposal(completion, args) {
	    var proposal = {
            relevance: 100,
            style: 'emphasis', //$NON-NLS-1$
            overwrite: true,
            kind: 'js' //$NON-NLS-1$
        };
        if(typeof completion.overwrite === 'boolean') {
        	proposal.overwrite = completion.overwrite;
        }
        if(typeof completion.prefix === 'string'){
        	proposal.prefix = completion.prefix;
    	} else if (typeof args.params.prefix === 'string') {
        	proposal.prefix = args.params.prefix;
        }
        proposal.name = proposal.proposal = completion.name;
        if(typeof completion.type !== 'undefined') {
            if(/^fn/.test(completion.type)) {
            	proposal.tags = [{cssClass: /^[A-Z]/.test(proposal.name) ? 'iconClass' : 'iconFunction'}];
            	calculateFunctionProposal(completion, args, proposal);
            } else if(completion.type === 'template' || completion.type === 'jsdoc_template') {
            	var prefix = proposal.prefix;
            	if (!prefix){
            		prefix = args.params.prefix;
            	}
            	var template = completion.template;
            	if (args.params.indentation){
            		template = template.replace(/\n([\t ]*)/g, "\n" + args.params.indentation + "$1"); //$NON-NLS-1$ //$NON-NLS-2$
            	}
            	var _t = new mTemplates.Template(prefix, completion.description, template, completion.name);
            	var _prop = _t.getProposal(prefix, args.params.offset, {});
            	if(completion.overwrite) {
            		_prop.overwrite = completion.overwrite;
            	}
            	var obj = Object.create(null);
		        obj.type = 'markdown'; //$NON-NLS-1$
		        
		        obj.content = '';
			    if(!completion.doc) {
			        obj.content += Messages['templateHoverHeader'];
		        	obj.content += _prop.proposal;
			    } else {
			    	var _h = Hover.formatMarkdownHover(completion.doc);
			    	if(_h) {
			    		obj.content += _h.content;
			    	} else {
			    		obj.content += proposal.name;
			    	}
			    }
			    if(completion.url) {
			        obj.content += i18nUtil.formatMessage.call(null, Messages['onlineDocumentationProposalEntry'], completion.url);
			    }
		        _prop.hover = obj;
		        _prop.style = 'emphasis'; //$NON-NLS-1$
		        _prop.kind = 'js'; //$NON-NLS-1$
		        if(typeof completion.prefix === 'string') {
		        	_prop.prefix = completion.prefix;
		        }
		        _prop.tags = [{cssClass: "iconTemplate"}];
		        return _prop;
            } else {
            	if(typeof completion.description === 'string') {
            		proposal.description = completion.description;
            	} else {
	    		    proposal.description = convertTypes(' : ' + completion.type); //$NON-NLS-1$
			    }
			    switch(completion.type) {
			    	case "bool": {
			    		proposal.tags = [{cssClass: "iconBoolean"}];
			    		break;
		    		}
			    	case "string": {
			    		proposal.tags = [{cssClass: "iconString"}];
			    		break;
		    		}
			    	case "number": {
			    		proposal.tags = [{cssClass: "iconNumber"}];
			    		break;
		    		}
		    		default: {
		    			proposal.tags = [{cssClass: "iconObject"}];
		    		}
			    }
		    }
        } else if(completion.isKeyword) {
        	proposal.relevance -= 2; //103
        	proposal.description = "";
        	proposal.isKeyword = true;
        	completion.doc = Messages['keywordHoverProposal'];
        	completion.url = getKeywordLink(proposal.name);
        	proposal.tags = [{cssClass: "iconKeyword"}];
        } else {
        	proposal.description = '';
        }
        obj = Object.create(null);
        obj.type = 'markdown'; //$NON-NLS-1$
        obj.content = '';
        if(!completion.doc) {
            obj.content += proposal.name;
        } else {
        	if(completion.doc.indexOf('@deprecated') > -1) {
        		proposal.style = 'strikethrough';
        	}
        	_h = Hover.formatMarkdownHover(completion.doc);
        	if(_h) {
        		obj.content += _h.content;
        	} else {
        		obj.content += proposal.name;
        	}
        }
        if(completion.url) {
            obj.content += i18nUtil.formatMessage.call(null, Messages['onlineDocumentationProposalEntry'], completion.url);
        }
        proposal.hover = obj;
        return proposal;
	}

  	 /**
	 * @description Convert an array of parameters into a string and also compute linked editing positions
	 * @function
	 * @private
	 * @param {Object} completion The Tern completion
	 * @param {Object} params The service parameters
	 */
	function calculateFunctionProposal(completion, args, proposal) {
		var positions = [];
		proposal.relevance += 5;
		var sig = SigParser.parse(completion.type);
		if(sig.ret) {
			if(sig.ret.value) {
				proposal.description = convertTypes(' : '+sig.ret.value); //$NON-NLS-1$
			} else if(sig.ret.ret) {
				proposal.description = ' : function';  //$NON-NLS-1$
			} else {
				proposal.description = '';
			}
		} else {
			proposal.description = '';
		}
		var _p = completion.name + '(';
		var params = sig.params;
		if(params) {
			for(var i = 0; i < params.length; i++) {
				var param = params[i];
				positions.push({offset: args.params.offset+_p.length-args.params.prefix.length, length: param.value.length});
				_p += param.value;
				if(i < params.length-1) {
					_p += ', '; //$NON-NLS-1$
				}
			}
		}
		_p += ')';
		proposal.name = proposal.proposal = _p;
		proposal.escapePosition = args.params.offset - args.params.prefix.length + _p.length;
		if(positions.length > 0) {
			proposal.positions = positions;
		}
	}

	/**
	 * @description Convert the Tern types to be more Orion-like
	 * @param {String} type The type computed from Tern
	 * @returns {String} The formatted type sig
	 */
	function convertTypes(type) {
		return type.replace(/:\s*\?/g, ': any'); //$NON-NLS-1$
	}

	var sorter = function(l,r) {
		// sort by relevance and then by name
		if (l.relevance > r.relevance) {
			return -1;
		} else if (r.relevance > l.relevance) {
			return 1;
		}

		var ldesc = l.name;
		var rdesc = r.name;
		if (ldesc < rdesc) {
			return -1;
		} else if (rdesc < ldesc) {
			return 1;
		}
		return 0;
	};

	/**
	 * @name formatOrigin
	 * @description Formats the origin into a readable string that can fit in content assist.
	 * @param origin {String} the origin string to format
	 * @returns returns a formatted origin string, may be the same as the origin
	 */
	function formatOrigin(origin) {
		var o = origin;
		if(o.indexOf("!known_modules.") === 0) {
			o = o.slice(0, "!known_modules.".length);
		}
		var match = /([^/.]+\/[^\/]+)$/g.exec(o);  // Shortens long / separated file paths to the last two segments
		if(match) {
			return match[1];
		}
		match = /\/([^\/]+)$/g.exec(o);  // Removes leading slash from a file path
		if(match) {
			return match[1];
		}
		return o;
	}

	function sortProposals(completions, args) {
		var envs = args.envs ? args.envs : {};
	    //bucket them by origin
	    var _p = Object.create(null); // Grouped proposals from env and indexes
	    var _d = Object.create(null); // Grouped proposals from dependencies 
	    var locals = []; // Proposals from local scope
	    var keywords = [];
	    var templates = [];
	    for(var i = 0; i < completions.length; i++) {
	        var _c = completions[i];
	        var _prefix = typeof _c.prefix === 'string' ? _c.prefix : args.params.prefix;
	        if(Util.looselyMatches(_prefix, _c.name)) {
    	        var _o = _c.origin;
    	        if(_c.isKeyword) {
    	        	keywords.push(_formatTernProposal(_c, args));
    	        	continue;
    	        } else if(typeof _o === 'undefined') {
    	        	if(_c.type === 'template') {
    	        		templates.push(_formatTernProposal(_c, args));
    	        	} else {
	    	        	locals.push(_formatTernProposal(_c, args));
		        	}
    	        	continue;
    	        }
    	        _o = _o ? _o : '?';
    	        if(_o === args.meta.location) {
    	            locals.push(_formatTernProposal(_c, args));
    	        } else {
					var orig = formatOrigin(_o);
					var propMap = _p;
					if (!envs[_o]){
						// Must be a file dependency
						propMap = _d;
					}
					if(!Array.isArray(propMap[orig])) {
						propMap[orig] = [];
					}					
					propMap[orig].push(_formatTernProposal(_c, args));
    	        }
	        }
	    }
	    // Locals, then dependencies, then keywords, then environment/indexes
	    var proposals = [].concat(locals.sort(sorter));
	    var keys = Object.keys(_d);
	    for(i = 0; i < keys.length; i++) {
	        var key = keys[i];
	        proposals.push({
					proposal: '',
					description: key, //$NON-NLS-0$
					style: 'noemphasis_title', //$NON-NLS-0$
					unselectable: true
				});
	        proposals = proposals.concat(_d[key].sort(sorter));
	    }
	    keys = Object.keys(_p);
	    for(i = 0; i < keys.length; i++) {
	        key = keys[i];
	        proposals.push({
					proposal: '',
					description: key, //$NON-NLS-0$
					style: 'noemphasis_title', //$NON-NLS-0$
					unselectable: true
				});
	        proposals = proposals.concat(_p[key].sort(sorter));
	    }
	    if(templates.length > 0) {
	    	templates.sort(function(p1, p2) {
				if (p1.name < p2.name) {
					return -1;
				}
				if (p1.name > p2.name) {
					return 1;
				}
				return 0;
			});
			templates.splice(0, 0, {
				proposal: '',
				description: Messages['templateAssistHeader'],
				style: 'noemphasis_title', //$NON-NLS-1$
				unselectable: true
			});
			proposals = proposals.concat(templates);
	    }
	    if(keywords.length > 0) {
	    	keywords.sort(sorter);
	    	keywords.splice(0, 0, {
					proposal: '',
					description: Messages['keywordAssistHeader'],
					style: 'noemphasis_title', //$NON-NLS-1$
					unselectable: true
				});
			proposals = proposals.concat(keywords);
	    } 
	    return proposals;
	}

	return {
		TernContentAssist : TernContentAssist
	};
});
