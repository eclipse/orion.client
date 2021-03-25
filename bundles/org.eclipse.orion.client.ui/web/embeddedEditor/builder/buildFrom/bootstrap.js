/*******************************************************************************
 * @license
 * Copyright (c) 2011, 2012 IBM Corporation and others.
 * All rights reserved. This program and the accompanying materials are made 
 * available under the terms of the Eclipse Public License 2.0 
 * (http://www.eclipse.org/legal/epl-v10.html), and the Eclipse Distribution 
 * License v1.0 (http://www.eclipse.org/org/documents/edl-v10.html). 
 *
 * Contributors:
 *     IBM Corporation - initial API and implementation
 *******************************************************************************/
/*eslint-env browser, amd*/

define(['orion/Deferred', 'orion/serviceregistry'], function(Deferred, mServiceregistry) {

	var once; // Deferred

	function startup() {
		if (once) {
			return once;
		}
		once = new Deferred();
		// initialize service registry and EAS services
		var serviceRegistry = new mServiceregistry.ServiceRegistry();
		var result = {
			serviceRegistry: serviceRegistry
		};
		return once.resolve(result);
	}
	return {startup: startup};
});
