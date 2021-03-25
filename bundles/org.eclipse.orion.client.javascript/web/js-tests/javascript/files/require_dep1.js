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
], function() {
/* eslint-disable */
    /**
     * @description A simple string var
     * @type String
     */
	var variable = "hello";
	
	/**
	 * @name myfunc
	 * @description A simple function declaration
	 * @returns {Null}
	 */
	function myfunc() {
		return null;
	}
	
	return {
		variable: variable,
		myfunc: myfunc
	}
});
