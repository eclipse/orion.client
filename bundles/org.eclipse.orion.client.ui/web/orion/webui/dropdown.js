/*******************************************************************************
 * @license
 * Copyright (c) 2012, 2019 IBM Corporation and others.
 * All rights reserved. This program and the accompanying materials are made 
 * available under the terms of the Eclipse Public License 2.0 
 * (http://www.eclipse.org/legal/epl-v10.html), and the Eclipse Distribution 
 * License v1.0 (http://www.eclipse.org/org/documents/edl-v10.html). 
 * 
 * Contributors: IBM Corporation - initial API and implementation
 ******************************************************************************/
/*eslint-env browser, amd*/
define(['orion/webui/littlelib', 'orion/EventTarget'], function(lib, EventTarget) {

	/**
	 * Attaches dropdown behavior to a given node.  Assumes the triggering node and dropdown node
	 * have the same parent.  Trigger should have "dropdownTrigger" class, and the dropdown node should 
	 * have "dropdownMenu" class.  Dropdown items should be <li> elements, so typically the dropdown node
	 * supplied is a <ul>.
	 *
	 * "dropdowntriggerbutton.html" contains an appropriate HTML fragment for a triggering button and associated
	 * dropdown.  Clients can add this fragment to the DOM and then attach Dropdown behavior to it.
	 * 
	 * Nested ("sub") menu behavior is accomplished by adding the class "dropdownSubMenu" to one of the <li> items.
	 * This item can then parent another trigger and <ul>.
	 *
	 * "submenutriggerbutton.html" contains an appropriate HTML fragment for a menu item that triggers a sub menu.
	 * Clients can add this fragment to a dropdown menu and then attach Dropdown behavior to the sub menu item.
	 *
	 * The items inside each <li> item in a dropdown can be almost any type of node.  The class "dropdownMenuItem" is
	 * used on the node inside the li to find items and style them appropriately.  There are HTML fragments for some
	 * common menu types.  For example, "checkedmenuitem.html" is a fragment appropriate for checked menu items.
	 *
	 * @param {Object} options The options object, which must minimally specify the dropdown dom node
	 * @param options.dropdown The node for the dropdown presentation.  Required.
	 * @param options.populate A function that should be called to populate the dropdown before it
	 * opens each time.  Optional.
	 * @param options.triggerNode The node which will listen for events that trigger the 
	 * opening of this drop down. If it is not specified the parent of the dropdown node will be searched
	 * for a node containing the dropdownTrigger class. Optional.
	 * @param options.parentDropdown The Dropdown that is the parent of this one if this is a sub-dropdown. Optional.
	 * @param options.positioningNode The Node that the dropdown uses so that it always renders under the positioningNode's left bottom corner. Optional.
	 * @param options.skipTriggerEventListeners A boolean indicating whether or not to skip adding event
	 * listeners to the triggerNode. Optional.
	 * 
	 * @name orion.webui.dropdown.Dropdown
	 *
	 */
	function Dropdown(options) {
		EventTarget.attach(this);
		this._init(options);		
	}
	Dropdown.prototype = /** @lends orion.webui.dropdown.Dropdown.prototype */ {
			
		_init: function(options) {
			this._dropdownNode = lib.node(options.dropdown);
			if (!this._dropdownNode) { throw "no dom node for dropdown found"; } //$NON-NLS-0$
			if (options.name) {
				lib.setSafeAttribute(this._dropdownNode, "aria-label", options.name);
			}
			this._populate = options.populate;
			this._selectionClass = options.selectionClass;
			this._parentDropdown = options.parentDropdown;
			this._positioningNode = options.positioningNode;
			this._trapTabs = options.trapTabs;
			
			if (!this._parentDropdown) {
				//if a parentDropdown isn't specified move up in dom tree looking for one
				var parentNode = this._dropdownNode.parentNode;
				while(parentNode && (document !== parentNode)) {
					if (parentNode.classList && parentNode.classList.contains("dropdownMenu")) { //$NON-NLS-0$
						this._parentDropdown = parentNode.dropdown;
						break;
					}
					parentNode = parentNode.parentNode;
				}
			}
			this._dropdownNode.tabIndex = -1;

			if (options.triggerNode) {
				this._triggerNode = options.triggerNode;
			} else {
				this._triggerNode = lib.$(".dropdownTrigger", this._dropdownNode.parentNode); //$NON-NLS-0$	
			}
			if (!this._triggerNode) { throw "no dom node for dropdown trigger found"; } //$NON-NLS-0$
			
			var triggerClickHandler = function(event) {
				var actionTaken = false;
				
				if (this._triggerNode.classList.contains("dropdownMenuItem")) { //$NON-NLS-0$
					// if the trigger is a dropdownMenuItem we only want it to open the submenu
					actionTaken = this.open(event);
				} else {
					actionTaken = this.toggle(event);
				}
				
				if (actionTaken) {
					lib.stop(event);
				}
			}.bind(this);
			
			if (!options.skipTriggerEventListeners) {
				// click on trigger opens or closes.
				this._triggerNode.addEventListener("click", triggerClickHandler, false); //$NON-NLS-0$

				// if trigger node is not key enabled, then add key handler for ENTER, SPACE and DOWN arrow
				if (this._triggerNode.tagName.toLowerCase() === "span") { //$NON-NLS-0$
					this._triggerNode.addEventListener("keydown", function(event) { //$NON-NLS-0$
						if (event.keyCode === lib.KEY.ENTER || event.keyCode === lib.KEY.SPACE) {
							triggerClickHandler(event);
						}
					}.bind(this), false);
				} else {
					// add key handler for DOWN arrow
					this._triggerNode.addEventListener("keydown", function(event) { //$NON-NLS-0$
						if (event.keyCode === lib.KEY.DOWN) {
							triggerClickHandler(event);
						}
					}.bind(this), false);
				}
			}
			
			var self = this;
			this._dropdownNode.addEventListener("mouseover", function(event) {
				if (event.target === event.currentTarget)
					return;
					
				var item = event.target;
				while (item !== event.currentTarget && item.tagName.toLowerCase() !== "li")  {
					item = item.parentNode;
				}
				
				var isMenuBarItem = item.parentNode.getAttribute("role") === "menubar";
				item = item.childNodes[0]; // the 'trigger'
				
				if (!item) return;
				
				if (isMenuBarItem) {
					var openMBItem = null;
					var menuBar = item.parentNode.parentNode;
					var mbItems = menuBar.dropdown.getItems();
					for (var i = 0; i < mbItems.length; i++) {
						var mbItem = mbItems[i];
						if (mbItem.classList.contains("dropdownTriggerOpen")) { //$NON-NLS-0$
							openMBItem = mbItem;
						}
					}
					
					// only open if there's already an opened menu bar item
					if (openMBItem && openMBItem !== item) {
						openMBItem.dropdown._closeSelectedSubmenu();
						openMBItem.dropdown.close(false);
						item.dropdown.open(event);
					}
				} else {
					if (item.dropdown) {
						item.dropdown.open(event);
					} else {
						self._closeSelectedSubmenu();
						lib.stop(event);
					}
					self._selectItem(item); // select the item on mouseover
				}
			}, false);
						
			// keys
			this._dropdownNode.addEventListener("keydown", this._dropdownKeyDown.bind(this), false); //$NON-NLS-0$
		},
		
		addTriggerNode: function(node){
			var self = this;
			node.addEventListener("click", function(event) { //$NON-NLS-0$
				if (self.toggle(event))  {
					lib.stop(event);
				}
			}, false);			
		},
		
		/**
		 * Toggle the open/closed state of the dropdown.  Return a boolean that indicates whether action was taken.
		 */			
		toggle: function(mouseEvent /* optional */) {
			if (this.isVisible()) {
				return this.close(true);
			}
			return this.open(mouseEvent);
		},
		
		/**
		 * Answers whether the dropdown is visible.
		 */			
		isVisible: function() {
			return this._isVisible;
		},
		
		/**
		 * Open the dropdown.
		 */			
		open: function(mouseEvent /* optional */) {
			var actionTaken = false;
			if (!this.isVisible()) {
				this.dispatchEvent({type: "triggered", dropdown: this, event: mouseEvent}); //$NON-NLS-0$
				if (this._populate) {
					this.empty();
					this._populate(this._dropdownNode);
				}
				var items = this.getItems();
				if (items.length > 0) {
					lib.setFramesEnabled(false);
					if (this._boundAutoDismiss) {
						lib.removeAutoDismiss(this._boundAutoDismiss);
					} 
					this._boundAutoDismiss = this._autoDismiss.bind(this);

					this._triggerNode.classList.add("dropdownTriggerOpen"); //$NON-NLS-0$
					lib.setSafeAttribute(this._triggerNode, "aria-expanded", "true");
					if (this._selectionClass) {
						this._triggerNode.classList.add(this._selectionClass);
					}
					this._dropdownNode.classList.add("dropdownMenuOpen"); //$NON-NLS-0$
					this._isVisible = true;
					
					if (this._dropdownNode.scrollHeight > this._dropdownNode.offsetHeight) {
						this._buttonsAdded = addScrollButtons.call(this);
					}

					// add auto dismiss.  Clicking anywhere but trigger or a submenu item means close.
					var submenuNodes = lib.$$array(".dropdownSubMenu", this._dropdownNode); //$NON-NLS-0$
					var list = [this._triggerNode].concat(submenuNodes);
					if (this._buttonsAdded) {
						list.push(this._topScrollButton);
						list.push(this._bottomScrollButton);
					}
					lib.addAutoDismiss(list, this._boundAutoDismiss);
					this._positionDropdown(mouseEvent);
					
					if (this._buttonsAdded) {
						positionScrollButtons.call(this);
					}					
					
					this._focusDropdownNode();
					actionTaken = true;
					
					if (this._parentDropdown) {
						this._parentDropdown.submenuOpen(this);
					}
					
					if (this._trapTabs) {
						lib.trapTabs(this._dropdownNode);
					}
				}
			}
			return actionTaken;
		},
		
		_focusDropdownNode :function() {//Sub classes can override this to set focus on different items.
			this._dropdownNode.focus();
		},
		
		_autoDismiss: function(event) {
			if (this.close(false)) {
				// only trigger dismissal of parent menus if
				// this dropdown's node contains the event.target
				if (this._dropdownNode.contains(event.target)) {
					// Dismiss parent menus
					var temp = this._parentDropdown;
					while (temp) {
						temp.close(false);
						temp = temp._parentDropdown;
					}
				}
			}
		},
		
		/**
		 * This method positions the dropdown menu.
		 * The specified mouseEvent is ignored. However, subclasses 
		 * can override this method if they wish to take the mouse 
		 * position contained in the mouse event into account.
		 * 
		 * @param {MouseEvent} mouseEvent
		 */
		_positionDropdown: function(mouseEvent) {//Sub classes can override this to position the drop down differently.
			this._dropdownNode.style.left = "";
			this._dropdownNode.style.top = "";
			
			if(this._positioningNode) {
				this._dropdownNode.style.left = this._positioningNode.offsetLeft + "px";
				return;
			}
			
			var bounds = lib.bounds(this._dropdownNode);
			var bodyBounds = lib.bounds(document.body);
			if (bounds.left + bounds.width > (bodyBounds.left + bodyBounds.width)) {
				if (this._triggerNode.classList.contains("dropdownMenuItem")) { //$NON-NLS-0$
					this._dropdownNode.style.left = -bounds.width + "px"; //$NON-NLS-0$
				} else {
					var totalBounds = lib.bounds(this._boundingNode(this._triggerNode));
					var triggerBounds = lib.bounds(this._triggerNode);
					this._dropdownNode.style.left = (triggerBounds.left - totalBounds.left - bounds.width + triggerBounds.width) + "px"; //$NON-NLS-0$
				}
			}
			
			//ensure menu fits on page vertically
			var overflowY = (bounds.top + bounds.height) - (bodyBounds.top + bodyBounds.height);
			if (0 < overflowY) {
				this._dropdownNode.style.top = Math.floor(this._dropdownNode.style.top - overflowY) + "px"; //$NON-NLS-0$
			}
		},
		
		_boundingNode: function(node) {
			var style = window.getComputedStyle(node, null);
			if (style === null) {
				return node;
			}
			var position = style.getPropertyValue("position"); //$NON-NLS-0$
			if (position === "absolute" || !node.parentNode || node === document.body) { //$NON-NLS-0$
				return node;
			}
			return this._boundingNode(node.parentNode);
		},
		
		/**
		 * Close the dropdown.
		 */			
		close: function(restoreFocus) {
			var actionTaken = false;
			if (this.isVisible()) {
				this._triggerNode.classList.remove("dropdownTriggerOpen"); //$NON-NLS-0$
				lib.setSafeAttribute(this._triggerNode, "aria-expanded", "false");
				if (this._selectionClass) {
					this._triggerNode.classList.remove(this._selectionClass);
				}
				this._dropdownNode.classList.remove("dropdownMenuOpen"); //$NON-NLS-0$
				lib.setFramesEnabled(true);
				if (restoreFocus) {
					lib.returnFocus(this._dropdownNode, this._triggerNode);
				}
				
				this._isVisible = false;
				if (this._selectedItem) {
					this._selectedItem.classList.remove("dropdownMenuItemSelected"); //$NON-NLS-0$		
					this._selectedItem = null;	
				}
				
				if (this._boundAutoDismiss) {
					lib.removeAutoDismiss(this._boundAutoDismiss);
					this._boundAutoDismiss = null;
				} 
				updateScrollButtonVisibility.call(this, true);
				actionTaken = true;
			}
			return actionTaken;
		},
		
		/**
		 *
		 */
		getItems: function() {
			var items = lib.$$array("li:not(.dropdownSeparator) [role^='menuitem']", this._dropdownNode, true); //$NON-NLS-0$
			// We only want the direct li children, not any descendants.  But we can't preface a query with ">"
			// So we do some reachy filtering here.
			var filtered = [];
			var self = this;
			items.forEach(function(item) {
				var menuitem = item;
				if (menuitem.parentNode.tagName.toLowerCase() === "label") {
					// if the parent is a label, go up one more (this can happen with input menu items, such as checkbox)
					menuitem = item.parentNode;
				}
				if (menuitem.parentNode.parentNode === self._dropdownNode) {
					filtered.push(menuitem);
				}
			});
			
			return filtered;
		},
		
		/**
		 *
		 */
		empty: function() {
			var items = lib.$$array("li", this._dropdownNode); //$NON-NLS-0$
			var self = this;
			// We only want the direct li children, not any descendants. 
			items.forEach(function(item) {
				if (item.parentNode === self._dropdownNode) {
					item.parentNode.removeChild(item);
				}
			});
		},
		
		 
		/**
		 * A key is down in the dropdown node
		 */
		 _dropdownKeyDown: function(event) {
		 	if (event.keyCode === lib.KEY.TAB && !this._trapTabs) {
		 		if (this._selectedItem || this._isVisible) {
		 			var keepIterating = true;
		 			while (keepIterating) {
						keepIterating = this.close(true);
						if (this._parentDropdown && keepIterating) {
							this._parentDropdown._dropdownNode.focus();
						}
					}
		 		}
		 		return;  // Allow the TAB to propagate
		 	}
			if (event.keyCode === lib.KEY.UP || event.keyCode === lib.KEY.DOWN || event.keyCode === lib.KEY.RIGHT || event.keyCode === lib.KEY.LEFT || event.keyCode === lib.KEY.ENTER || event.keyCode === lib.KEY.SPACE) {
				var items = this.getItems();
				var isMenuBar = this._dropdownNode.getAttribute("role") === "menubar";
				if (items.length && items.length > 0) {
					if (this._selectedItem) {
						var index = items.indexOf(this._selectedItem);
						// for inputs nested in labels, we should check the parent node since the label is the item
						if (index < 0) {
							index = items.indexOf(this._selectedItem.parentNode);
						}
						if (index >= 0) {
							if (event.keyCode === lib.KEY.UP) {
								if (isMenuBar) {
									if (this._selectedItem.classList.contains("dropdownTrigger") && this._selectedItem.dropdown) { //$NON-NLS-0$
										var dropdown = this._selectedItem.dropdown;
										dropdown.open();
										var menuitems = dropdown.getItems();
										dropdown._selectItem(menuitems[menuitems.length - 1]); // select last item in submenu
									}
								} else {
									this._selectItem(items[index > 0 ? index - 1 : items.length - 1]);
								}
							} else if (event.keyCode === lib.KEY.DOWN) {
								if (isMenuBar) {
									if (this._selectedItem.classList.contains("dropdownTrigger") && this._selectedItem.dropdown) { //$NON-NLS-0$
										this._selectedItem.dropdown.open();
										this._selectedItem.dropdown._selectItem(); // select first item in submenu
									}
								} else {
									this._selectItem(items[index < items.length - 1 ? index + 1 : 0]);
								}
							} else if (event.keyCode === lib.KEY.RIGHT) {
								if (isMenuBar) {
									this._selectItem(items[index < items.length - 1 ? index + 1 : 0]);
								} else {
									if (this._selectedItem.classList.contains("dropdownTrigger") && this._selectedItem.dropdown) { //$NON-NLS-0$
										this._selectedItem.dropdown.open();
										this._selectedItem.dropdown._selectItem(); // select first item in submenu
									} else {
										this._closeThenOpen(this._selectedItem, event.keyCode, true);
									}
								}
							} else if (event.keyCode === lib.KEY.LEFT) {
								if (isMenuBar) {
									this._selectItem(items[index > 0 ? index - 1 : items.length - 1]);
								} else {
									if (this._parentDropdown) {
										this.close(true);
										this._parentDropdown._dropdownNode.focus();
									} else {
										this._closeThenOpen(this._selectedItem, event.keyCode, true);
									}
								}
							} else if (event.keyCode === lib.KEY.ENTER || event.keyCode === lib.KEY.SPACE) {
								if (!(event.target === this._dropdownNode || event.target.getAttribute("role") === "menuitem")) {
									return;
								}
								if (this._selectedItem.classList.contains("dropdownTrigger") && this._selectedItem.dropdown) { //$NON-NLS-0$
									this._selectedItem.dropdown.open();
									this._selectedItem.dropdown._selectItem(); // select first item in submenu
								} else {
									this._selectedItem.click();
									// click handling auto closes menus without restoring focus to trigger, so need to restore here
									lib.returnFocus(this._dropdownNode, this._triggerNode);
								}
							}
						}
					} else {
						if (event.keyCode === lib.KEY.UP) {
							this._selectItem(items[items.length - 1]); // select last item in menu
						} else if (event.keyCode === lib.KEY.RIGHT || event.keyCode === lib.KEY.LEFT) {
							this._closeThenOpen(this._triggerNode, event.keyCode, false);
						} else {
							// DOWN, ENTER, or SPACE: select first item in menu
							if (event.keyCode === lib.KEY.ENTER || event.keyCode === lib.KEY.SPACE) {
								if (!(event.target === this._dropdownNode || event.target.getAttribute("role") === "menuitem")) {
									return;
								}
							}
							this._selectItem(items[0]);
						}
					}
					lib.stop(event);
				}
			} else if (event.keyCode === lib.KEY.ESCAPE) {
				this.close(true);
				if (this._parentDropdown) {
					this._parentDropdown._dropdownNode.focus();
				}
				lib.stop(event);
			}
		 },
		 
		 /**
		  * Closes the menubar menu containing the specified item
		  * and opens the menu next to it in the specified direction.
		  * @param {Object} item An item within a menu
		  * @param {Integer} direction Either KEY.RIGHT or KEY.LEFT typed by user
		  * @param {Boolean} select If true, select the first item
		  */
		 _closeThenOpen: function(item, direction, select) {
			while (item.parentNode && (document !== item.parentNode) && item.parentNode.getAttribute("role") !== "menubar")  {
				item = item.parentNode;
			}
			if (!item.parentNode || document === item.parentNode) {
				return; // item is not in a menubar
			}
			var trigger = item.childNodes[0];
			var menuBar = item.parentNode;
			var mbItems = menuBar.dropdown.getItems();
			var mbItem = null;
			for (var i = 0; i < mbItems.length; i++) {
				if (mbItems[i] === trigger) {
					if (direction === lib.KEY.LEFT) {
						mbItem = i > 0 ? mbItems[i - 1] : mbItems[mbItems.length - 1];
					} else {
						mbItem = i < mbItems.length - 1 ? mbItems[i + 1] : mbItems[0];
					}
					break;
				}
			}
			trigger.dropdown._closeSelectedSubmenu();
			trigger.dropdown.close(false);
			if (mbItem) {
				mbItem.dropdown.open();
				if (select) {
					mbItem.dropdown._selectItem();
				}

			}
		 },
		 
		 /**
		  * Selects the specified dropdown menu item or the first
		  * dropdown menu item if none is specified.
		  * @param {Object} item The dropdown menu item that should be selected. See @ref getItems() for details. Optional.
		  */
		 _selectItem: function(item) {
		 	var itemToSelect = item || this.getItems()[0];
		 	if (itemToSelect) {
		 		if (this._selectedItem) {
		 			this._selectedItem.classList.remove("dropdownMenuItemSelected"); //$NON-NLS-0$
			 	}
			 	this._selectedItem = itemToSelect;
			 	this._selectedItem.classList.add("dropdownMenuItemSelected"); //$NON-NLS-0$	
			 	this._selectedItem.focus();
			 	if (this._buttonsAdded) {
			 		var itemBounds = this._selectedItem.getBoundingClientRect();
			 		var menuBounds = this._dropdownNode.getBoundingClientRect();
			 		if (this._selectedItem.offsetTop < this._dropdownNode.scrollTop) {
		 				this._selectedItem.scrollIntoView(true);
		 				if (this._dropdownNode.scrollTop < 5) {
		 					this._dropdownNode.scrollTop = 0;
		 				}
		 			}
		 			else if (itemBounds.bottom > menuBounds.bottom) {
		 				this._selectedItem.scrollIntoView(false);
		 				if ((this._dropdownNode.scrollHeight - this._dropdownNode.scrollTop - this._dropdownNode.clientHeight) < 5) {
		 					this._dropdownNode.scrollTop = this._dropdownNode.scrollHeight - this._dropdownNode.clientHeight;
		 				}
		 			}
		 			updateScrollButtonVisibility.call(this);
				}
		 	}
		 },
		 
		 /**
		  * Closes this._selectedSubmenu, and its children, if it is open.
		  * Sets the this._selectedSubmenu to the one that's passed in.
		  * @param submenu The submenu that was opened and should be set as the next this._selectedSubmenu
		  */
		submenuOpen: function(submenu) {
			if (submenu !== this._selectedSubmenu) {
				//close the current menu and all its children
				this._closeSelectedSubmenu();
				this._selectedSubmenu = submenu;
			}
		 },
		 
		_closeSelectedSubmenu: function() {
			var currentSubmenu = this._selectedSubmenu;
			while(currentSubmenu) {
				currentSubmenu.close();
				currentSubmenu = currentSubmenu._selectedSubmenu;
			}
		 },
		 
		destroy: function() {
			this.empty();
			if (this._boundAutoDismiss) {
				lib.removeAutoDismiss(this._boundAutoDismiss);
				this._boundAutoDismiss = null;
			}
		},
		
		/**
		 * Creates a new menu item and appends it to the bottom of this dropdown.
		 * @param {String} text The text to display inside the new menu item. Optional.
		 * @param {String} innerNodeType The type of the inner node to create. The default is "span". Optional.
		 * @returns {Object} The top-most new element that was created
		 */
		appendMenuItem: function(text, innerNodeType) {
			var li = createMenuItem(text, innerNodeType);
			this._dropdownNode.appendChild(li);
			return li;
		},
		
		/**
		 * Creates a new separator and appends it to the bottom of this dropdown.
		 */
		appendSeparator: function() {
			// Add a separator
			var li = createSeparator();
			this._dropdownNode.appendChild(li);
			return li;
		}
	};
	
	/**
	 * Creates a new menu item and returns it to the caller.
	 * @param {String} text The text to display inside the new menu item. Optional.
	 * @param {String} innerNodeType The type of the inner node to create. The default is "span". Optional.
	 * @returns {Object} The top-most new element that was created
	 */
	function createMenuItem(text, innerNodeType) {
		innerNodeType = innerNodeType === undefined ? "span" : innerNodeType; //$NON-NLS-0$
	 	
	 	var element = document.createElement(innerNodeType); //$NON-NLS-0$
		element.className = "dropdownMenuItem"; //$NON-NLS-0$
		lib.setSafeAttribute(element, "role", "menuitem");
		element.tabIndex = -1;
		element.style.outline = "none";
		
		if (text) {
			var span = document.createElement("span");  //$NON-NLS-0$
			span.appendChild(document.createTextNode(text));
			span.classList.add("dropdownCommandName"); //$NON-NLS-0$
			element.appendChild(span);
		}
	 	
	 	var li = document.createElement("li"); //$NON-NLS-0$
		lib.setSafeAttribute(li, "role", "none");
	 	li.appendChild(element); //$NON-NLS-0$
		
		return li;
	}
	
	/**
	 * Creates a new separator menu item and returns it to the caller.
	 * @returns {Object} The new separator element that was created
	 */
	function createSeparator() {
		var li = document.createElement("li"); //$NON-NLS-0$
		li.classList.add("dropdownSeparator"); //$NON-NLS-0$
		return li;
	}
	
	/**
	 * Appends the specified keyBindingString to the specified menu item.
	 * @param {Object} element The menu item to append the keybinding string to. Required.
	 * @param {String} keyBindingString The keybinding string to append. Required.
	 */
	function appendKeyBindingString(element, keyBindingString) {
		var span = document.createElement("span"); //$NON-NLS-0$
		span.classList.add("dropdownKeyBinding"); //$NON-NLS-0$
		span.appendChild(document.createTextNode(keyBindingString));
		element.appendChild(span);
	}
	
	/**
	 * Adds scrolling feature to a list
	*/
	function addScrollButtons() {
		var dropdown = this;

		if(!this._topScrollButton && !this._bottomScrollButton) { // if scroll buttons haven't been made yet
			this._topScrollButton = document.createElement("button");
			this._bottomScrollButton = document.createElement("button");
			this._topScrollButton.classList.add("menuScrollButton", "menuTopScrollButton", "core-sprite-openarrow");
			this._bottomScrollButton.classList.add("menuScrollButton", "menuBottomScrollButton", "core-sprite-openarrow");

			this._topScrollButton.addEventListener("mousedown", function(evt){ //$NON-NLS-0$
				if (this._activeScrollInterval) {
					window.clearInterval(this._activeScrollInterval);
				}
				this._activeScrollInterval = window.setInterval(scrollUp.bind(null, evt.shiftKey ? 20 : 2), 10);
			}.bind(this));
			this._topScrollButton.addEventListener("mouseup", function(){ //$NON-NLS-0$
				if (this._activeScrollInterval) {
					window.clearInterval(this._activeScrollInterval);
					this._activeScrollInterval = null;
				}
			}.bind(this));
			
			this._bottomScrollButton.addEventListener("mousedown", function(evt){ //$NON-NLS-0$
				if (this._activeScrollInterval) {
					window.clearInterval(this._activeScrollInterval);
				}
				this._activeScrollInterval = window.setInterval(scrollDown.bind(null, evt.shiftKey ? 20 : 2), 10);
			}.bind(this));
			this._bottomScrollButton.addEventListener("mouseup", function(){ //$NON-NLS-0$
				if (this._activeScrollInterval) {
					window.clearInterval(this._activeScrollInterval);
					this._activeScrollInterval = null;
				}
			}.bind(this));
		
			this._dropdownNode.parentNode.insertBefore(this._topScrollButton, this._dropdownNode);
			this._dropdownNode.parentNode.insertBefore(this._bottomScrollButton, this._dropdownNode.nextElementSibling);
			this._dropdownNode.style.overflow = "hidden";
		}
		
		updateScrollButtonVisibility.call(this);
		return true;
		
		function scrollDown(increment) {
			dropdown._dropdownNode.scrollTop+=increment;
			updateScrollButtonVisibility.call(dropdown);
		}
		
		function scrollUp(increment) {
			dropdown._dropdownNode.scrollTop-=increment;
			updateScrollButtonVisibility.call(dropdown);
		}
	}
	
	/**
	 * Hides or shows the scroll buttons
	 * @param {Boolean} hideAll True if hiding both buttons. Required.
	 */
	function updateScrollButtonVisibility(hideAll) {
		if (hideAll && this._topScrollButton && this._bottomScrollButton) {
			this._topScrollButton.style.display = "none";
			this._bottomScrollButton.style.display = "none";	
		}
		else if (!hideAll) {
			if (this._dropdownNode.scrollTop > 0) {
				this._topScrollButton.style.display = "block";
			} 
			else {
				this._topScrollButton.style.display = "none";
			}	
			if (this._dropdownNode.scrollHeight > this._dropdownNode.scrollTop + this._dropdownNode.offsetHeight) {
				this._bottomScrollButton.style.display = "block";
			}	 
			else {
				this._bottomScrollButton.style.display = "none";
			}
		}
	}
	
	/**
	 * Positions the top and bottom scroll buttons according to where the dropdown list is positioned
	*/
	function positionScrollButtons() {
		this._topScrollButton.style.width = this._dropdownNode.clientWidth + 1 + "px";
		this._bottomScrollButton.style.width = this._dropdownNode.clientWidth + 1 + "px";
		this._topScrollButton.style.top = this._dropdownNode.style.top;
		this._topScrollButton.style.left = this._topScrollButton.parentNode.clientWidth + "px";
		this._bottomScrollButton.style.top = Number(this._dropdownNode.style.top.replace("px", "")) + (this._dropdownNode.clientHeight-this._bottomScrollButton.clientHeight + 1)+"px";
		this._bottomScrollButton.style.left = this._bottomScrollButton.parentNode.clientWidth + "px";
	}
		
	Dropdown.prototype.constructor = Dropdown;
	//return the module exports
	return {Dropdown: Dropdown,
			appendKeyBindingString: appendKeyBindingString,
			createMenuItem: createMenuItem,
			createSeparator: createSeparator};
});
