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
	'js-tests/javascript/files/require_dep2'
], function(d2) {
/* eslint-disable */
	
	return {
		reExportFunc: d2.myfunc,
		reExportVar: d2.variable,
		foo: "Hello"
	};
	
});
