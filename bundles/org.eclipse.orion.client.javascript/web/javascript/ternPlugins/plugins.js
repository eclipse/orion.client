/*******************************************************************************
 * @license
 * Copyright (c) 2015, 2016 IBM Corporation and others.
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
	"tern/lib/tern"
], function(tern) {
	
	tern.registerPlugin('plugins', /* @callback */ function(server, options) { //$NON-NLS-1$
		return {};
	});
	
	tern.defineQueryType('installed_plugins', { //$NON-NLS-1$
		/**
		 * @callback
		 */
		run: function run(server, query) {
			if(server.options && typeof server.options.plugins === 'object') {
				return server.options.plugins;
			}
			return null;
		}
	});
	
	tern.defineQueryType('installed_defs', { //$NON-NLS-1$
		/**
		 * @callback
		 */
		run: function run(server, query) {
			if(server.options && typeof server.options.defs === 'object') {
				return server.options.defs;
			}
			return null;
		}
	});
	
	tern.defineQueryType('environments', { //$NON-NLS-1$
		/**
		 * @callback
		 */
		run: function run(server, query) {
			if(server.options && typeof server.options.plugins === 'object') {
				var plugins = server.options.plugins;
				var keys = Object.keys(plugins);
				var envs = Object.create(null);
				for(var i = 0; i < keys.length; i++) {
					var key = keys[i];
					var env = plugins[key].env;
					if(env) {
						envs[env] = true;
					} else {
						envs[plugins[key]] = true;
					}
				}
				return envs;
			}
			return null;
		}
	});
}); 
