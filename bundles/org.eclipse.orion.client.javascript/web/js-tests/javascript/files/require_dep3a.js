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
], function() {

	/**
	 * @name Foo
	 * @description Simple type constructor
	 * @returns {Foo} A new Foo instance
	 * @constructor 
	 * @since 10.0
	 */
	function Foo() {
	}
	
	/**
     * @description A simple string var
     * @type String
     */
	Foo.prototype.variable = "hello",
	/**
	 * @name myfunc
	 * @description A simple function expression
	 * @returns {Null}
	 */
	Foo.prototype.myfunc = function() {};
	
	return Foo;
});
