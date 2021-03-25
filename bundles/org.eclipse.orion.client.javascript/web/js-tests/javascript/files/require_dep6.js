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
	'orion/objects'
], function(Objects) {
/* eslint-disable */
	/**
	 * @name Foo
	 * @description Simple type constructor
	 * @returns {Foo} A new Foo instance
	 * @constructor 
	 * @since 10.0
	 */
	function Foo() {
	}
	//Foo.prototype.constructor = Foo;
	
	Objects.mixin(Foo.prototype, {
		/**
	     * @description A simple string var
	     * @type String
	     */
		protoVar: "hello",
		/**
		 * @name myfunc
		 * @description A simple function expression
		 * @returns {Null}
		 */
		protoFunc: function() {},
	});

	var localVar = "hello";
	function localFunc() {}
	
	var indirect = {indCTor: Foo, indFunc: localFunc, indVar: localVar};
	var protos = {pFunc: new Foo().protoFunc, pVar: new Foo().protoVar}
	
	return {directFoo:Foo,
			directFunc: localFunc,
			directVar: localVar,
			memberFoo: indirect.indCTor,
			memberFunc: indirect.indFunc,
			memberVar: indirect.indVar,
			protoFunc: protos.pFunc,
			protoVar: protos.pVar
			};
	
});
