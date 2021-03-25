/*******************************************************************************
 * @license
 * Copyright (c) 2014, 2019 IBM Corporation and others. 
 * All rights reserved. This program and the accompanying materials are made 
 * available under the terms of the Eclipse Public License 2.0 
 * (http://www.eclipse.org/legal/epl-v10.html), and the Eclipse Distribution 
 * License v1.0 (http://www.eclipse.org/org/documents/edl-v10.html). 
 * 
 * Contributors: IBM Corporation - initial API and implementation
 ******************************************************************************/
/*eslint-env browser, amd*/
define([
	'orion/objects',
	'orion/webui/littlelib',
	'text!orion/webui/RichDropdown.html',
	'orion/webui/dropdown'
], function(
	objects, lib, RichDropdownTemplate, mDropdown
) {
	/**
	 * Creates a generic RichDropdown which can be appended to any dom node.
	 * 
	 * @param {DOMNode} options.parentNode The DOM node which this rich dropdown will be appended to
	 * @param {Function} options.populateFunction The function which will populate the dropdown when it is opened (see @ref orion.webui.dropdown)	 
	 * @param {String} options.buttonName Optional. A string to display on the dropdown trigger button.
	 * @param {DOMNode} options.buttonDecorator Optional. A DOM node will be inserted into the dropdown trigger button as a decorator.
	 * @param {Boolean} options.noDropdownArrow Optional. A boolean indicating that the dropdown arrow should be omitted from the dropdown trigger button.
	 */
	function RichDropdown(options) {
		this._parentNode = options.parentNode;
		this._buttonName = options.buttonName;
		this._id = options.id || "dropDown";
		this._buttonDecorator = options.buttonDecorator;
		this._populateFunction = options.populateFunction;
		this._noDropdownArrow = options.noDropdownArrow;
		this._initialize();
	}

	objects.mixin(RichDropdown.prototype, /** @lends orion.webui.RichDropdown.prototype */ {
		_initialize: function() {
			var wrapperNode = lib.createNodes(RichDropdownTemplate);
			
			this._dropdownTriggerButton = lib.$("button.dropdownTrigger", wrapperNode); //$NON-NLS-0$
			this._dropdownTriggerButton.id = this._id + "Button"; //$NON-NLS-0$
			this._dropdownTriggerButtonLabel = lib.$(".dropdownTriggerButtonLabel", this._dropdownTriggerButton); //$NON-NLS-0$
			this._dropdownTriggerButtonLabel.id = this._id + "Label"; //$NON-NLS-0$
			
			this._dropdownNode = lib.$("ul.dropdownMenu", wrapperNode); //$NON-NLS-0$
			this._dropdownNode.id = this._id + "Dropdown"; //$NON-NLS-0$
			
			if (this._buttonName) {
				this.setDropdownTriggerButtonName(this._buttonName, this._buttonDecorator);
			}
			
			var dropdownArrow = lib.$(".dropdownArrowDown", this._dropdownTriggerButton); //$NON-NLS-0$
			if (this._noDropdownArrow) {
				this._dropdownTriggerButton.removeChild(dropdownArrow);
			} else {
				this._dropdownButtonArrow = dropdownArrow;
			}
			lib.setSafeAttribute(this._dropdownTriggerButton, "aria-haspopup", "menu");
			lib.setSafeAttribute(this._dropdownTriggerButton, "aria-expanded", "false");
			lib.setSafeAttribute(this._dropdownTriggerButton, "aria-controls", this._dropdownNode.id);
			lib.setSafeAttribute(this._dropdownNode, "role", "menu");
						
			this._parentNode.appendChild(this._dropdownTriggerButton);
			this._parentNode.appendChild(this._dropdownNode);
			
			this._dropdownTriggerButton.dropdown = new mDropdown.Dropdown({dropdown: this._dropdownNode, populate: this._populateFunction, trapTabs: true});
		},
		
		/**
		 * @return {DOMNode} The DOM node of this dropdown's trigger button
		 */
		getDropdownTriggerButton: function() {
			return this._dropdownTriggerButton;
		},
		
		/**
		 * @return {DOMNode} The DOM node of this dropdown's dropdown list
		 */
		getDropdownNode: function() {
			return this._dropdownNode;
		},
		
		/**
		 * Sets the text label displayed in this dropdown's trigger button
		 * @param {String} name The string to display on the dropdown trigger button.
		 * @param {DOMNode} decorator Optional. A dom node which will be placed in front of the button name.
		 * @param {String} title Optional. A string to display as the dropdown trigger button's title.
		 */
		setDropdownTriggerButtonName: function(name, decorator, title) {
			var titleText = title || ""; //$NON-NLS-0$
			lib.empty(this._dropdownTriggerButtonLabel);
			
			if (decorator) {
				this._dropdownTriggerButtonLabel.appendChild(decorator);
			}
			
			var nameNode = document.createTextNode(name);
			this._dropdownTriggerButtonLabel.appendChild(nameNode);
			
			this._dropdownTriggerButton.title = titleText;
		},
		
		/**
		 * Replaces this dropdown's default trigger button label node with the one specified.
		 * 
		 * @param {DOMNode} labelNode A dom node which will replace the dropdownTriggerButtonLabel
		 */
		setCustomTriggerButtonLabelNode: function(labelNode) {
			labelNode.id = this._dropdownTriggerButtonLabel.id;
			this._dropdownTriggerButton.replaceChild(labelNode, this._dropdownTriggerButtonLabel);
			this._dropdownTriggerButtonLabel = labelNode;
		},
		
		/**
		 * @return {orion.webui.dropdown.Dropdown} This rich dropdown's generic dropdown javascript object
		 */
		getDropdown: function() {
			return this._dropdownTriggerButton.dropdown;
		},
		
		/**
		 * Destroys this dropdown and cleans up its resources.
		 */
		destroy: function() {
			if (this._dropdownTriggerButton) {
				if (this._dropdownTriggerButton.dropdown) {
					this._dropdownTriggerButton.dropdown.destroy();
					this._dropdownTriggerButton.dropdown = null;
				}
				this._dropdownTriggerButton = null;
			}
		}
	});
	

	return {
		RichDropdown: RichDropdown
	};
});
