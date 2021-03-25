/*******************************************************************************
* @license
* Copyright (c) 2016 IBM Corporation and others.
* All rights reserved. This program and the accompanying materials are made 
* available under the terms of the Eclipse Public License 2.0 
* (http://www.eclipse.org/legal/epl-v10.html), and the Eclipse Distribution 
* License v1.0 (http://www.eclipse.org/org/documents/edl-v10.html). 
*
* Contributors:
*     IBM Corporation - initial API and implementation
*******************************************************************************/
/*eslint-env amd */
define([
	"tern/lib/tern",
	"javascript/orionAcorn"
], function(tern, OrionAcorn) {
	
	var orionAcorn = new OrionAcorn();

	tern.registerPlugin("ast", /* @callback */ function(server, options) { //$NON-NLS-1$
		server.on("reset", function() { //$NON-NLS-1$
			orionAcorn.initialize();
		});

		return {
			passes: {
				/**
				 * We use the custom parseOptions event rather than preParse so that we aren't skipped due to other
				 * plugins contributing to that event (such as the html plugin).
				 * @callback
				 */
				parseOptions: orionAcorn.preParse.bind(orionAcorn),
				/**
				 * @callback
				 */
				postParse: orionAcorn.postParse.bind(orionAcorn)
			}
		};
	});
});
