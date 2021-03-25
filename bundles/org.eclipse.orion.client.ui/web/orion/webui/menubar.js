/*******************************************************************************
 * @license
 * Copyright (c) 2014 IBM Corporation and others.
 * All rights reserved. This program and the accompanying materials are made 
 * available under the terms of the Eclipse Public License 2.0 
 * (http://www.eclipse.org/legal/epl-v10.html), and the Eclipse Distribution 
 * License v1.0 (http://www.eclipse.org/org/documents/edl-v10.html). 
 * 
 * Contributors: IBM Corporation - initial API and implementation
 ******************************************************************************/
/*eslint-env browser, amd*/
define([
	'orion/webui/littlelib', 
	'orion/webui/dropdown', 
	'orion/objects'
], function(lib, mDropdown, objects) {

	var Dropdown = mDropdown.Dropdown;
	/**
	 * @class orion.webui.MenuBar
	 * @extends orion.webui.Dropdown
	 * 
	 * Attaches menubar behavior to a given node.  
	 *
	 * @see orion.webui.Dropdown for more documentation
	 *
	 * @name orion.webui.contextmenu.MenuBar
	 *
	 */
	function MenuBar(options) {
		options.skipTriggerEventListeners = true; //we want different event listeners on the trigger node
		Dropdown.call(this, options); //invoke super constructor
		
		this._initialize();
		this._dropdownNode.tabIndex = -1;
	}
	
	MenuBar.prototype = Object.create(Dropdown.prototype);
	MenuBar.prototype.constructor = MenuBar;
	
	objects.mixin(MenuBar.prototype, /** @lends orion.webui.contextmenu.ContextMenu.prototype */ {
			
		_initialize: function() {
			if (!this._dropdownNode.dropdown) {
				//used by commandRegistry to set the parentNode of a child dropdown menu
				this._dropdownNode.dropdown = this;
			}
		},
		 _selectItem: function(item){
		 	var itemToSelect = item || this.getItems()[0];
		 	if (itemToSelect) {
			 	this._selectedItem = itemToSelect;
			 	this._selectedItem.focus();
		 	}
		 },
	});

	
	// overrides Dropdown.protoype.open
	MenuBar.prototype.open = function(event) {
	};
	
	// overrides Dropdown.protoype.close
	MenuBar.prototype.close = function(restoreFocus) {
	};
	
	// overrides Dropdown.protoype._positionDropdown
	MenuBar.prototype._positionDropdown = function(mouseEvent) {
	};
	
	//return the module exports
	return {MenuBar: MenuBar};
});
