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
define([
	"tern/lib/tern",
	"tern/lib/infer",
	"javascript/lru"
], function(tern, infer, LRU) {
	
	var _resolved = new LRU(),
		_files = new LRU();
	
	function moduleResolve(_name /*, parentFile*/) {
		var resolved = getResolved(_name);
		if (resolved && typeof resolved.contents === "string") {
			return resolved;
		}
		return null;
	}
	
	/**
	 * @description Get the resolved file for the given logical name
	 * @param {String} _name The logical name 
	 * @sinnce 9.0
	 */
	function getResolved(_name) {
		var val = _resolved.get(_name);
		if(val) {
			var _f = _files.get(val.file);
			if(_f && _f.file) {
				return _f;
			}
			return val;
		}
		return null;
	}
	
	/**
	 * @description Resolves the computed dependencies
	 * @param {TernServer} server The Tern server
	 * @param {String} loc The original file context location (from the AST)
	 * @since 9.0
	 */
	function resolveDependencies(server, loc) {
	    _resolved.keys().forEach(/* @callback */ function(key) {
	        //we will try again for a timed out read
	        var value = _resolved.get(key);
	        if (value && (value.pending || value.file)) {
	      	  return;
	        }
	  		resolve(server, key, loc);
	    });
	}
	
	/**
	 * @description Resolves the given key (logical name) via the server. This function starts an asynchronous job to resolve the
	 * script via the scriptResolver in the client
	 * @param {TernServer} server The server
	 * @param {String} key The logical name to resolve
	 * @param {String} loc The original file context location (from the AST)
	 * @since 9.0
	 */
	function resolve(server, key, loc) {
		var item = _resolved.get(key);
		if(item.pending || item.err) {
			//if we are waiting don't fire off another request
			return;
		}
		var resetPending = function(key) {
			var r = _resolved.get(key);
			clearTimeout(r.timeout);
			r.file = null;
			r.contents = '';
			r.err = "Read operation timed out."; //$NON-NLS-1$
			delete r.pending;
			server.finishAsyncAction(r.err);
		};
  		server.startAsyncAction();
  		item.pending = true;
  		item.timeout = setTimeout(resetPending, 10000, key);
		server.options.getFile({logical: key, file: loc, env: item.env}, function(err, _file) {
			clearTimeout(item.timeout);
			item.file = _file.file;
			if(!_files.containsKey(_file.file)) {
				_files.put(_file.file, {file: _file.file, contents: typeof _file.contents === 'string' ? _file.contents : ''});
			}
	   		item.logical = _file.logical;
	   		item.err = err;
	   		delete item.pending;
	   		server.finishAsyncAction(err);
		});
	}
	
	/**
	 * @description Callback to cycle waiting for async jobs to finish
	 * @param {TernServer} server The server
	 */
	function waitOnResolve(server) {
    	var done = function() {
      		clearTimeout(timeout);
      		doPreInfer(server);
    	};
    	var timeout = setTimeout(done, server.options.fetchTimeout);
	}
	/**
	 * @description Default callback to be used durning the pre-infer phase of plugin loading
	 * @param {TernServer} server The server
	 * @param {Object} resolved The object containing names to be resolved
	 * @since 9.0
	 */
	function doPreInfer(server) {
	  	if(server.pending) {
			return waitOnResolve(server);
		}
		var done = true;
		var keys = _resolved.keys();
		for(var i = 0; i < keys.length; i++) {
			if(_resolved.get(keys[i]).pending) {
				done = false;
				break;
			}
		}
		if(!done) {
			return waitOnResolve(server);
		}
	}
	
	/**
	 * @description Default callback to be used durning the post-parse phase of plugin loading
	 * @param {TernServer} server The server
	 * @param {Object} ast The backing AST that was just parsed
	 * @param {Object} ignores A mapping of names that can be ignored
	 * @param {Function} test An optional function callback to test the name of the dependency
	 * @since 9.0
	 */
	function doPostParse(server, ast, ignores, test) {
		if(Array.isArray(ast.dependencies) && ast.dependencies.length > 0) {
			for(var i = 0; i < ast.dependencies.length; i++) {
				var _d = _getDependencyName(ast.dependencies[i]);
				if(_d) {
					var val = _resolved.get(_d);
					if(val && typeof val === 'object') {
						continue; //we already resolved it or are trying, keep going
					}
					if(typeof ignores === 'object') {
						if(ignores[_d]) {
							continue;
						}
						if(typeof ignores.node === 'object' && ignores.node[_d]) {
							continue;
						}
						if(typeof ignores.requirejs === 'object' && ignores.requirejs[_d]) {
							continue;
						}
					}
					/**
					 * @since 11.0
					 * @see https://bugs.eclipse.org/bugs/show_bug.cgi?id=481271
					 */
					if(typeof test === 'function' && !test(_d)) {
						continue;
					}
					var f = Object.create(null);
					f.env = ast.dependencies[i].env;
					_resolved.put(_d, f);
				}
			}
			resolveDependencies(server, ast.sourceFile ? ast.sourceFile.name : null);
		}  	
	}
	
	/**
	 * @description Resolve the dependency name
	 * @param {Object|String} dep
	 * @since 10.0
	 */
	function _getDependencyName(dep) {
		if(typeof dep === 'string') {
			return dep;
		} else if(dep && typeof dep === 'object') {
			return dep.value;
		}
		return null;
	}
	
	/**
	 * @name possibleMatch
	 * @description Checks if the given file name is a possible match to the given logical name
	 * @param {String} fileName The full path of the file loaded by Tern
	 * @param {String} logicalName The logical name from the cached entry in error state 
	 * @returns {bool} True if it is a possible match, false otherwise
	 */
	function possibleMatch(fileName, logicalName) {
		if(fileName && logicalName) {
			var f = fileName;
			f = f.slice(0, f.lastIndexOf('.js'));
			return f.lastIndexOf(logicalName) === f.length-1;
		}
		return false;
	}
	
	/**
	 * @name doReset
	 * @description Perform any reset actions
	 * @since 15.0
	 */
	function doReset() {
		_resolved.clear();
	    _files.clear();
	}
	
	/**
	 * @name doPreParse
	 * @description Perform any pre-parse actions
	 * @param {string} text The text of the file about to be parsed
	 * @param {?} options The map of options for the parse
	 * @since 15.0
	 */
	function doPreParse(text, options) {
		var file = options.directSourceFile;
    	if(file && file.name) {
    		//update the cached source for this file if it exists
    		var f = _files.get(file.name);
			if(f) {
				f.contents = text;
			}
    		//if a file is parsed and is cached in an error state, it means the file has been created
			//in the editor - remove it from the cache so it will be re-fetched the next time it is 
			//requested as a dependency
			_resolved.keys().forEach(function(key) {
				var val = _resolved.get(key);
				if(val && val.err) {
					if(possibleMatch(file.name, val.logical)) {
						_resolved.remove(key);
						console.log("removed: "+file.name+" from resolver cache");
					}
				}
			});
    	}
	}
	
	tern.registerPlugin("resolver", /* @callback */ function resolverPluginHandler(server, options) {
	    server.loadPlugin("modules"); //$NON-NLS-1$
	    server.mod.modules.resolvers.push(moduleResolve);
		server.on("postParse", /* @callback */ function postParseHandler(ast, text) {
			var cx = infer.cx();
			doPostParse(server, ast, cx ? cx.definitions : null, null);
	    });
	    server.on("preInfer", /* @callback */ function preInferHandler(ast, scope){
	    	doPreInfer(server);
	    });
	    server.on("preParse", function preParseHandler(text, options) {
	    	doPreParse(text, options);
	    });
	    server.on("reset", function resetHandler() {
	    	doReset();
	    });
  });
  
  return {
			doPostParse: doPostParse,
			doPreInfer: doPreInfer,
			getResolved: getResolved,
			doReset: doReset,
			doPreParse: doPreParse
		};
});
