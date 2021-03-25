/*******************************************************************************
 * @license
 * Copyright (c) 2017 IBM Corporation and others.
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
	"tern/lib/tern",
	"javascript/finder"
], function(tern, Finder) {

	tern.registerPlugin("async_await", /* @callback */ function(server, options) {
		var cachedQuery;
		
		return {
			passes: {
     			/**
     			 * @callback
     			 */
     			completion: function(file, query) {
     				cachedQuery = query;
     			},
		      	/**
		      	 * @callback
		      	 */
		      	variableCompletion: function(file, start, end, gather) {
		      		if(cachedQuery.ecma >= 9 && (cachedQuery.includeKeywords || cachedQuery.includeKeywords === undefined)) {
		      			//always add async
		      			gather('async', null, 0, function(c) {
	      					c.isKeyword = true;
	      				});
	      				//optionally add await, iff we are inside an async closure
		      			var node = Finder.findNode(start, file.ast, {parents: true});
		      			if(node && Finder.inAsync(node)) {
		      				gather('await', null, 0, function(c) {
		      					c.isKeyword = true;
		      				});
		      			}
					}
				}
			}
		};
	});

});
