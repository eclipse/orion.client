/*******************************************************************************
 * @license
 * Copyright (c) 2016 IBM Corporation and others.
 * All rights reserved. This program and the accompanying materials are made 
 * available under the terms of the Eclipse Public License 2.0 
 * (http://www.eclipse.org/legal/epl-v10.html), and the Eclipse Distribution 
 * License v1.0 (http://www.eclipse.org/org/documents/edl-v10.html). 
 * 
 * Contributors: IBM Corporation - initial API and implementation
 ******************************************************************************/
/* eslint-env amd */
define([
	'./files/require_dep3a'
], function(d2) {
/* eslint-disable */
	var foo = new d2();
	return {
		reExportFunc: d2.prototype.myfunc,
		reExportVar: d2.prototype.variable,
		foo: foo
	};
	
});
