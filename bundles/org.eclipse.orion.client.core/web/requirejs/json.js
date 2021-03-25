/*******************************************************************************
 * @license
 * Copyright (c) 2015 IBM Corporation and others.
 * All rights reserved. This program and the accompanying materials are made 
 * available under the terms of the Eclipse Public License 2.0 
 * (http://www.eclipse.org/legal/epl-v10.html), and the Eclipse Distribution 
 * License v1.0 (http://www.eclipse.org/org/documents/edl-v10.html). 
 * 
 * Contributors: IBM Corporation - initial API and implementation
 ******************************************************************************/
/* eslint-env amd */
define([
'requirejs/text'
], function(text) {
	
	var map = Object.create(null);
	
	return {
        load : function(name, req, onLoad, config) {
    		text.get(req.toUrl(name), function(json) {
                    if (config.isBuild) {
                    	map[name] = json; //during build caching: http://requirejs.org/docs/plugins.html#apiwrite
                        onLoad(json);
                    } else {
                        try {
                            var _json = JSON.parse(json);
                        } catch (e) {
                            onLoad.error(e);
                        }
                        onLoad(_json);
                    }
                },
                onLoad.error, 
                {accept: 'application/json'} //$NON-NLS-1$
             );
		},
		write : function(pluginName, moduleName, write) {
			var _json = map[moduleName];
            if(_json) {
                write('define("'+ pluginName +'!'+ moduleName +'", function(){ return '+ _json +';});\n'); //$NON-NLS-1$ //$NON-NLS-2$ //$NON-NLS-3$
            }
        }
	};
});
