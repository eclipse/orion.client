/*******************************************************************************
 * @license
 * Copyright (c) 2015 IBM Corporation and others.
 * All rights reserved. This program and the accompanying materials are made 
 * available under the terms of the Eclipse Public License 2.0 
 * (http://www.eclipse.org/legal/epl-v10.html), and the Eclipse Distribution 
 * License v1.0 (http://www.eclipse.org/org/documents/edl-v10.html). 
 *
 * Contributors:
 *     IBM Corporation - Allow original requirejs plugin to find files in Orion workspace
 *******************************************************************************/
/* eslint-disable missing-nls */
/*eslint-env node, amd*/
/*globals tern tern*/
define([
	"tern/lib/infer", 
	"tern/lib/tern", 
	"./resolver", 
	"javascript/compilationUnit", 
	"javascript/finder"
], function(infer, tern, resolver, CU, Finder) {

  tern.registerPlugin("html", /* @callback */ function(server, options) {
	server._htmlDeps = Object.create(null);
	server._htmlDeps.map = Object.create(null);
	
	server.on("beforeLoad", function(file) {
      this._htmlDeps.file  = file.name;
    });
    server.on("reset", function() {
      	server._htmlDeps = Object.create(null);
		server._htmlDeps.map = Object.create(null);
    });
	
	function isHTML(name) {
		return /(?:html|htm|xhtml)$/g.test(name);
	}
	
    return {
      passes: {
        /**
		 * @callback
		 */
		postParse: function postParse(ast, text) {
			if(isHTML(ast.sourceFile.name)) {
				var deps = server._htmlDeps.map[server._htmlDeps.file];
				if(Array.isArray(deps)) {
					ast.dependencies = deps.slice(0);
				}
				resolver.doPostParse(server, ast, infer.cx().definitions);
			}
		},
		/**
		 * @callback
		 */
		preInfer: function preInfer(ast, scope) {
			if(isHTML(ast.sourceFile.name)) {
				resolver.doPreInfer(server);
				//should all be resolved by now, add them to the file mapping
				if(Array.isArray(ast.dependencies)) {
					for(var i = 0; i < ast.dependencies.length; i++) {
						var dep = ast.dependencies[i];
						var _f = resolver.getResolved(dep);
						if(_f && _f.file) {
							server.addFile(_f.file, _f.contents, server._htmlDeps.file);
						}
					}
				}
			}
		},
		/**
		 * @callback
		 */
		preParse: function preParse(text, options) {
			var f = options.directSourceFile.name;
			if(isHTML(f)) {
				// TODO We want to use a cuProvider to cache the CU, but there are no onModelChange events in the Tern server to recognize that the file contents have changed.
				var blocks = Finder.findScriptBlocks(text);
				if(Array.isArray(blocks)) {
					var cu = new CU(blocks, {location: f});
					var source = cu.getSource(); // this also sets the dependencies from the blocks
					server._htmlDeps.file = f;
					server._htmlDeps.map[f] = cu.getDependencies(); 
					return source;
				}
			}
		}
      }
    };
  });
});
