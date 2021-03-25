/*******************************************************************************
 * @license
 * Copyright (c) 2010, 2019 IBM Corporation and others.
 * All rights reserved. This program and the accompanying materials are made 
 * available under the terms of the Eclipse Public License 2.0 
 * (http://www.eclipse.org/legal/epl-v10.html), and the Eclipse Distribution 
 * License v1.0 (http://www.eclipse.org/org/documents/edl-v10.html). 
 * 
 * Contributors: IBM Corporation - initial API and implementation
 ******************************************************************************/
/*eslint-env browser, amd*/
 
define([
	'i18n!orion/nls/messages',
	'orion/i18nUtil',
	'orion/webui/littlelib',
	'orion/commandsProxy',
	'orion/webui/dropdown',
	'text!orion/webui/dropdowntriggerbutton.html',
	'text!orion/webui/dropdowntriggerbuttonwitharrow.html',
	'text!orion/webui/checkedmenuitem.html',
	'orion/webui/tooltip',
	'orion/metrics',
	'orion/urlModifier'
], function(messages, i18nUtil, lib, mCommandsProxy, Dropdown, DropdownButtonFragment, DropdownButtonWithArrowFragment, CheckedMenuItemFragment, Tooltip, mMetrics, urlModifier) {
		/**
		 * @name orion.commands.NO_IMAGE
		 * @description Image data for 16x16 transparent png.
		 * @property
		 */
		var NO_IMAGE = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABAAAAAQAQMAAAAlPW0iAAAAA1BMVEUAAACnej3aAAAAAXRSTlMAQObYZgAAAAtJREFUCNdjIBEAAAAwAAFletZ8AAAAAElFTkSuQmCC"; //$NON-NLS-0$

		/* a function that can be set for retrieving bindings stored elsewhere, such as a command registry */
		var getBindings = null;
		
		/* key bindings registered locally
		 *
		 * object keyed by command id, value is { keyBinding: keyBinding, command: command, invocation: commandInvocation }
		 *
		 */
		var localKeyBindings = {};
		
		/*
		 * Set a function that will provide key bindings when key events are processed.  This is used when an external party
		 * (such as a command registry) wants its bindings to be honored by the command key listener.
		 */
		function setKeyBindingProvider(getBindingsFunction) {
			getBindings = getBindingsFunction;
		}

		/**
		 * Executes a binding if possible.
		 * @name orion.commands.executeBinding
		 * @function
		 * @static
		 * @param {Object} binding
		 * @returns {Boolean} <code>true</code> if the binding was executed, <code>false</code> otherwise.
		 */
		function executeBinding(binding) {
			var invocation = binding.invocation;
			if (invocation) {
				var command = binding.command;
				if (typeof(command.hrefCallback) === 'function') {
					var href = command.hrefCallback.call(invocation.handler || window, invocation);
					if (href.then){
						href.then(function(l){
							window.open(urlModifier(l));
						});
					} else {
						// We assume window open since there's no link gesture to tell us what to do.
						window.open(urlModifier(href));
					}
					return true;
				} else if (invocation.commandRegistry) {
					// See https://bugs.eclipse.org/bugs/show_bug.cgi?id=411282
					invocation.commandRegistry._invoke(invocation);
					return true;
				} else if (command.onClick || command.callback) {
					// TODO: what is this timeout for?
					window.setTimeout(function() {
						(command.onClick || command.callback).call(invocation.handler || window, invocation);
					}, 0);
					return true;
				}
			}
			return false;
		}

		/*
		 * Process a key event against the provided bindings.
		 */
		function _processKey(event, bindings) {
			for (var id in bindings) {
				if (bindings[id] && bindings[id].keyBinding && bindings[id].command) {
					if (bindings[id].keyBinding.match(event)) {
						var activeBinding = bindings[id];
						var keyBinding = activeBinding.keyBinding;
						// Check for keys that are scoped to a particular part of the DOM
						if (!keyBinding.domScope || lib.contains(lib.node(keyBinding.domScope), event.target)) {
							if (executeBinding(activeBinding)) {
								lib.stop(event);
								return;
							}
						}
					}
				}
			}
		}
		
		function getKeyBindings() {
			var allBindings = {};
			
			if (getBindings) {
				var i, keys, objectKey;
				keys = Object.keys(localKeyBindings);
				for (i=0; i<keys.length; i++) {
					objectKey = keys[i];
					allBindings[objectKey] = localKeyBindings[objectKey];
				}
				var otherBindings = getBindings();
				keys = Object.keys(otherBindings);
				for (i=0; i<keys.length; i++) {
					objectKey = keys[i];
					allBindings[objectKey] = otherBindings[objectKey];
				}
			} else {
				allBindings = localKeyBindings;
			}
			return allBindings;
		}
		
		function processKey(evt) {
			_processKey(evt, getKeyBindings());
		}
		
		window.document.addEventListener("keydown", function(evt) { //$NON-NLS-0$
			return mCommandsProxy.handleKeyEvent(evt, processKey);
		}, false);

	function _addImageToElement(command, element, name) {
		element.classList.add("commandImage"); //$NON-NLS-0$
		var node;
		if (command.imageClass) {
			if (command.addImageClassToElement) {
				element.classList.add(command.imageClass);
			} else {
				node = document.createElement("span"); //$NON-NLS-0$
				element.appendChild(node);
				node.classList.add(command.spriteClass);
				node.classList.add(command.imageClass);
			}
		} else {
			node = new Image();
			node.alt = command.name;
			node.name = name;
			node.id = name;
			node.src = command.image;
			element.appendChild(node);
		}
		return node;
	}

	function createDropdownMenu(parent, name, populateFunction, buttonClass, buttonIconClass, showName, selectionClass, positioningNode, displayDropdownArrow, extraClasses) {
		
		parent = lib.node(parent);
		if (!parent) {
			throw "no parent node was specified"; //$NON-NLS-0$
		}
		var range = document.createRange();
		range.selectNode(parent);
		var buttonFragment = displayDropdownArrow ? range.createContextualFragment(DropdownButtonWithArrowFragment) : range.createContextualFragment(DropdownButtonFragment);
		// bind name to fragment variable
		lib.processTextNodes(buttonFragment, {ButtonText: name});
		parent.appendChild(buttonFragment);

		var trigger = parent.firstChild;
		var inMenubar = false;
		var parentNode = parent.parentNode;
		while(parentNode && (document !== parentNode)) {
			if (parentNode.getAttribute("role") === "menubar") { //$NON-NLS-0$
				inMenubar = true;
				break;
			}
			parentNode = parentNode.parentNode;
		}
		if (inMenubar) {
			lib.setSafeAttribute(trigger, "role", "menuitem");
		} else {
			// menu button
			if (trigger.tagName.toLowerCase() !== "button") {
				lib.setSafeAttribute(trigger, "role", "button");
			}
		}

		var newMenu = parent.lastChild;
		var menuButton;
		var dropdownArrow;
		if (displayDropdownArrow) {
			menuButton = newMenu.previousSibling;
			dropdownArrow = menuButton.lastChild;
		} else {
			menuButton = newMenu.previousSibling;
		}
		if (buttonClass) {
			menuButton.classList.add(buttonClass); //$NON-NLS-0$
		} else {
			menuButton.classList.add("orionButton"); //$NON-NLS-0$
			menuButton.classList.add("commandButton"); //$NON-NLS-0$
		}
		if (extraClasses) {
			extraClasses.split(" ").forEach(menuButton.classList.add.bind(menuButton.classList));
		}
		
		if (buttonIconClass) {
			if(!showName) {
				menuButton.textContent = ""; //$NON-NLS-0$
				lib.setSafeAttribute(menuButton, "aria-label", name);
			}
			_addImageToElement({ spriteClass: "commandSprite", imageClass: buttonIconClass }, menuButton, name); //$NON-NLS-0$
			menuButton.classList.add("orionButton"); //$NON-NLS-0$
		}
		menuButton.dropdown = new Dropdown.Dropdown({
			dropdown: newMenu, 
			name: name,
			populate: populateFunction,
			selectionClass: selectionClass,
			skipTriggerEventListeners: !!dropdownArrow,
			positioningNode: positioningNode
		});
		newMenu.dropdown = menuButton.dropdown;
		return {menuButton: menuButton, menu: newMenu, dropdown: menuButton.dropdown, dropdownArrow: dropdownArrow};
	}
	
	function createCheckedMenuItem(parent, name, checked, onChange) {
		parent = lib.node(parent);
		if (!parent) {
			throw "no parent node was specified"; //$NON-NLS-0$
		}
		var range = document.createRange();
		range.selectNode(parent);
		var buttonFragment = range.createContextualFragment(CheckedMenuItemFragment);
		// bind name to fragment variable
		lib.processTextNodes(buttonFragment, {ItemText: name});
		parent.appendChild(buttonFragment);
		var itemParent = parent.lastChild;
		var checkbox = lib.$(".checkedMenuItem", itemParent); //$NON-NLS-0$
		checkbox.checked = checked;
		lib.setSafeAttribute(checkbox, "aria-checked", checked);
		checkbox.addEventListener("change", onChange, false); //$NON-NLS-0$
		return checkbox;
	}

	function createQuickfixItem(parentElement, command, commandInvocation, callback, prefService) {
		var element;
		var button;
		var clickTarget;
		var fixAllCheckbox;
		var fixAllLabel;
		
		var quickfixSettings = '/languageTools/quickfix'; //$NON-NLS-1$
		
		element = document.createElement("div");
		
		button = clickTarget = document.createElement("button");
		button.className = "orionButton"; //$NON-NLS-1$
		if (command.extraClass) {
			button.classList.add(command.extraClass);
		}
		button.classList.add("commandButton"); //$NON-NLS-1$
		
		var buttonText = command.name;
		if (commandInvocation.userData.annotation.data && commandInvocation.userData.annotation.data.ruleId){
			buttonText = i18nUtil.formatMessage(command.name, commandInvocation.userData.annotation.data.ruleId);
		}
		var text = document.createTextNode(buttonText);
		button.appendChild(text);
		
		var onClick = callback || command.callback;
		if (onClick) {
			var done = function() {
				if (fixAllCheckbox){
					if (fixAllCheckbox.checked){
						commandInvocation.userData.annotation.doFixAll = true;
					}
					if (prefService){
						prefService.get(quickfixSettings).then(function(prefs) {
							prefs[command.id] = fixAllCheckbox.checked;
							prefService.put(quickfixSettings, prefs);
						});
					}
				}
				onClick.call(commandInvocation.handler, commandInvocation);
				if (typeof commandInvocation.userData.postCallback === 'function'){
					commandInvocation.userData.postCallback();
				}
			};
			command.onClick = onClick;
			clickTarget.addEventListener("click", function(e) {
				var onClickThen;
				onClickThen = function (doIt) { if(doIt) {
						done();
					}
				};
				if(command.preCallback) {
					command.preCallback(commandInvocation).then( function(doIt) {
						onClickThen(doIt);
					});
				} else {
					onClickThen(true);
				}
				e.stopPropagation();
			}, false);
		}
		if (parentElement.nodeName.toLowerCase() === "ul") {
			var li = document.createElement("li");
			lib.setSafeAttribute(li, "role", "none");
			parentElement.appendChild(li);
			parentElement = li;
		} else {
			button.classList.add("commandMargins"); //$NON-NLS-0$
		}
		element.appendChild(button);
		
		// We check that the internal access to annotation model exists so if it breaks we don't show the checkbox at all rather than throw an error later
		if (command.fixAllEnabled && commandInvocation.userData.annotation._annotationModel){
			var id = command.id + 'fixAll'; //$NON-NLS-1$
			fixAllCheckbox = document.createElement('input');
			fixAllCheckbox.type = 'checkbox'; //$NON-NLS-1$
			fixAllCheckbox.className = "quickfixAllParameter"; //$NON-NLS-1$
			fixAllCheckbox.checked = true;
			fixAllCheckbox.id = id;
			
			fixAllLabel = document.createElement('label');
			fixAllLabel.htmlFor = id;
			fixAllLabel.className = "quickfixAllParameter"; //$NON-NLS-1$
			fixAllLabel.appendChild(document.createTextNode(messages['fixAll'])); 
			
			if (prefService){
				prefService.get(quickfixSettings).then(function(prefs) {
					if (typeof prefs[command.id] === 'boolean'){
						fixAllCheckbox.checked = prefs[command.id];
					}
					
				});
			}
			
			element.appendChild(fixAllCheckbox);
			element.appendChild(fixAllLabel);
		}
		parentElement.appendChild(element);
		return element;
	}
	
	function createCommandItem(parent, command, commandInvocation, id, keyBinding, useImage, callback) {
		var element;
		var clickTarget;
		useImage = useImage || (!command.name && command.hasImage && command.hasImage());
		
		var renderButton = function() {
				if (useImage) {
					if (command.hasImage && command.hasImage()) {
						_addImageToElement(command, element, id);
						// ensure there is accessible text describing this image
						if (command.name) {
							lib.setSafeAttribute(element, "aria-label", command.name);
						}
					} else {
						element.classList.add("commandButton"); //$NON-NLS-0$
						element.classList.add("commandMissingImageButton"); //$NON-NLS-0$
						element.appendChild(document.createTextNode(command.name));
					}
				} else {
					element.classList.add("commandButton"); //$NON-NLS-0$
					var text = document.createTextNode(command.name);
					element.appendChild(text);
				}
		};
		
		if (typeof(command.hrefCallback) === 'function') {
			element = clickTarget = document.createElement("a"); //$NON-NLS-0$
			element.id = id;
			if (useImage && command.hasImage()) {
				_addImageToElement(command, element, id);
				// ensure there is accessible text describing this image
				if (command.name) {
					lib.setSafeAttribute(element, "aria-label", command.name);
				}
			} else {
				element.className = "commandLink"; //$NON-NLS-0$
				element.appendChild(document.createTextNode(command.name));
			}
			var href = command.hrefCallback.call(commandInvocation.handler, commandInvocation);
			if (href.then){
				href.then(function(l){
					element.href = l;
				});
			} else if (href) {
				element.href = href; 
			} else {  // no href
				element.href = "#"; //$NON-NLS-0$
			}
			if(command.hrefTarget){
				element.target = command.hrefTarget;
			}
		} else {
			if (command.type === "switch") { //$NON-NLS-0$
				element = clickTarget = document.createElement("div"); //$NON-NLS-0$
				lib.setSafeAttribute(element, "role", "button");
				element.tabIndex = 0;
				element.className = "orionSwitch"; //$NON-NLS-0$
				if (command.name) {
					lib.setSafeAttribute(element, "aria-label", command.name);
				}
				lib.setSafeAttribute(element, "aria-pressed", command.checked ? "true" : "false");
				var span1 = document.createElement("span"); //$NON-NLS-0$
				span1.className = "orionSwitchInner"; //$NON-NLS-0$
				span1.classList.add(command.imageClass);
				var span2 = document.createElement("span"); //$NON-NLS-0$
				span2.className = "orionSwitchSwitch"; //$NON-NLS-0$
				element.appendChild(span1);
				element.appendChild(span2);
				element.addEventListener("keydown", function(e) { //$NON-NLS-0$
					if (e.keyCode === lib.KEY.ENTER || e.keyCode === lib.KEY.SPACE) {
						element.click();
						e.preventDefault();
					}
				}, false);
				element.addEventListener("click", function(e) { //$NON-NLS-0$
					toggleSwitch(element);
				}, false);
			} else if (command.type === "toggle") {  //$NON-NLS-0$
				element = clickTarget = document.createElement("button"); //$NON-NLS-0$
				element.className = "orionButton"; //$NON-NLS-0$
				element.classList.add(command.checked ? "orionToggleOn" : "orionToggleOff");  //$NON-NLS-1$ //$NON-NLS-0$
				if (command.extraClass) {
					element.classList.add(command.extraClass);
				}
				element.id = "orionToggle" + command.id; //$NON-NLS-0$
				if(parent.id) {
					element.id = element.id + parent.id;
				}
				renderButton();
			} else {
				element = clickTarget = document.createElement("button"); //$NON-NLS-0$
				element.className = "orionButton"; //$NON-NLS-0$
				if (command.extraClass) {
					element.classList.add(command.extraClass);
				}
				renderButton();
			}
			var onClick = callback || command.callback;
			if (onClick) {
				var done = function() {onClick.call(commandInvocation.handler, commandInvocation);};
				command.onClick = onClick;
				clickTarget.addEventListener("click", function(e) { //$NON-NLS-0$
					var onClickThen;
					if (command.type === "switch" || command.type === "toggle") { //$NON-NLS-1$ //$NON-NLS-0$
						onClickThen = function (doIt) {
							if (command.type === "toggle") { //$NON-NLS-0$
								if(doIt) {
									command.checked = !command.checked;
								}
								if (command.checked) {
									element.classList.remove("orionToggleOff"); //$NON-NLS-0$
									element.classList.add("orionToggleOn"); //$NON-NLS-0$
									element.classList.add("orionToggleAnimate"); //$NON-NLS-0$
								} else {
									element.classList.remove("orionToggleOn"); //$NON-NLS-0$
									element.classList.add("orionToggleOff"); //$NON-NLS-0$
									element.classList.add("orionToggleAnimate"); //$NON-NLS-0$
								}
							} else { // "switch"
								if(doIt) {
									command.checked = element.getAttribute("aria-pressed") === "true"; //$NON-NLS-0$ //$NON-NLS-1$
								} else {
									toggleSwitch(element); // don't do it, i.e. put it back
								}
							}
							if(doIt) {
								window.setTimeout(done, 250);
							}
						};
					} else {
						onClickThen = function (doIt) { if(doIt) {
								done();
							}
						};
					}
					if(command.preCallback) {
						command.preCallback(commandInvocation).then( function(doIt) {
							onClickThen(doIt);
						});
					} else {
						onClickThen(true);
					}
					e.stopPropagation();
				}, false);
			}
		}
		if (parent.nodeName.toLowerCase() === "ul") { //$NON-NLS-0$
			var li = document.createElement("li"); //$NON-NLS-0$
			lib.setSafeAttribute(li, "role", "none");
			parent.appendChild(li);
			parent = li;
		} else {
			element.classList.add("commandMargins"); //$NON-NLS-0$
		}
		parent.appendChild(element);
		if (command.tooltip) {
			element.commandTooltip = new Tooltip.Tooltip({
				node: element,
				text: command.tooltip,
				position: ["above", "below", "right", "left"] //$NON-NLS-3$ //$NON-NLS-2$ //$NON-NLS-1$ //$NON-NLS-0$
			});
		}
		if (keyBinding) {
			localKeyBindings[command.id] = { keyBinding: keyBinding, command: command, invocation: commandInvocation };
		}
		return element;
	}
	
	function toggleSwitch(element) {
		if (element.getAttribute("aria-pressed") === "true") { //$NON-NLS-0$ //$NON-NLS-1$
			lib.setSafeAttribute(element, "aria-pressed", "false");
		} else {
			lib.setSafeAttribute(element, "aria-pressed", "true");
		}
	}

	function createCommandMenuItem(parent, command, commandInvocation, keyBinding, callback, keyBindingString) {
		var element, li;
		var dropdown = parent.dropdown;
		if (typeof(command.hrefCallback) === 'function') {
			li = Dropdown.createMenuItem(command.name, "a"); //$NON-NLS-0$
			commandInvocation.domNode = element = li.firstElementChild;
			var href = command.hrefCallback.call(commandInvocation.handler, commandInvocation);
			if (href.then){
				href.then(function(l){
					element.href = l;
				});
			} else if (href) {
				element.href = href;
			} else {  // no href
				element.href = "#"; //$NON-NLS-0$
			}
			if(command.hrefTarget){
				element.target = command.hrefTarget;
			}
			element.addEventListener("keydown", function(e) { //$NON-NLS-0$
				if (e.keyCode === lib.KEY.ENTER || e.keyCode === lib.KEY.SPACE) {
					element.click();
				}
			}, false);
		} else {
			li = Dropdown.createMenuItem(command.name); //$NON-NLS-0$
			element = li.firstElementChild;
			var onClick = callback || command.callback;
			if (onClick) {
				command.onClick = onClick;
				element.addEventListener("click", function(e) { //$NON-NLS-0$
					if (dropdown){
						dropdown.close(true);
					}
					onClick.call(commandInvocation.handler, commandInvocation);
				}, false);
				element.addEventListener("keydown", function(e) { //$NON-NLS-0$
					if (e.keyCode === lib.KEY.ENTER || e.keyCode === lib.KEY.SPACE) {
						e.preventDefault(); /* prevents dropdown from receiving event and re-opening */
						element.click();
					}
				}, false);
			}
		}

		if (command.tooltip) {
			/* nested menu items may represent commands, hence require tooltips */
			element.commandTooltip = new Tooltip.Tooltip({
				node: element,
				text: command.tooltip,
				position: ["right", "above", "below", "left"] //$NON-NLS-3$ //$NON-NLS-2$ //$NON-NLS-1$ //$NON-NLS-0$
			});
		}
		
		if (keyBindingString) {
			Dropdown.appendKeyBindingString(element, keyBindingString);
		}
		
		parent.appendChild(li);
		
		if (keyBinding) {
			localKeyBindings[command.id] = { keyBinding: keyBinding, command: command, invocation: commandInvocation };
		}

		return element;
	}

	/**
	 * CommandInvocation is a data structure that carries all relevant information about a command invocation.
	 * It represents a unique invocation of a command by the user.  Each time a user invokes a command (by click, keystroke, URL),
	 * a new invocation is passed to the client.
	 * <p>Note:  When retrieving parameters from a command invocation, clients should always use {@link #parameters}
	 * rather than obtaining the parameter object originally specified for the command (using {@link #command}.parameters).
	 * This ensures that the parameter values for a unique invocation are used vs. any default parameters that may have been
	 * specified originally.  Similarly, if a client wishes to store data that will preserved across multiple invocations of a command,
	 * that data can be stored in the original parameters description and a reference maintained by the client.
	 * </p>
	 * 
	 * @name orion.commands.CommandInvocation
	 * @class Carries information about a command invocation.
	 * @param {Object} handler
	 * @param {Array} items
	 * @param {Object} [userData]
	 * @param {orion.commands.Command} command
	 * @param {orion.commandregistry.CommandRegistry} [commandRegistry]
	 */
	/**
	 * @name orion.commands.CommandInvocation#commandRegistry
	 * @type orion.commandregistry.CommandRegistry
	 */
	/**
	 * @name orion.commands.CommandInvocation#handler
	 * @type Object
	 */
	/**
	 * @name orion.commands.CommandInvocation#command
	 * @type orion.commands.Command
	 */
	/**
	 * @name orion.commands.CommandInvocation#items
	 * @type Array
	 */
	/**
	 * @name orion.commands.CommandInvocation#parameters
	 * @type orion.commands.ParametersDescription
	 */
	/**
	 * @name orion.commands.CommandInvocation#userData
	 * @type Object
	 */
	/**
	 * @name orion.commands.CommandInvocation#userData
	 * @type Object
	 */
	function CommandInvocation (handler, items, /* optional */userData, command, /* optional */ commandRegistry) {
		this.commandRegistry = commandRegistry;
		this.handler = handler;
		this.items = items;
		this.userData = userData;
		this.command = command;
		if (command.parameters) {
			this.parameters = command.parameters.makeCopy(); // so that we aren't retaining old values from previous invocations
		}
		this.id = command.id;
	}
	CommandInvocation.prototype = /** @lends orion.commands.CommandInvocation.prototype */ {
		/**
		 * Returns whether this command invocation can collect parameters.
		 * 
		 * @returns {Boolean} whether parameters can be collected
		 */
		collectsParameters: function() {
			return this.commandRegistry && this.commandRegistry.collectsParameters();
		},
	
		/**
		 * Makes and returns a (shallow) copy of this command invocation.
		 * @param {orion.commands.ParametersDescription} parameters A description of parameters to be used in the copy.  Optional.
		 * If not specified, then the existing parameters should be copied.
		 */
		makeCopy: function(parameters) {
			var copy =  new CommandInvocation(this.handler, this.items, this.userData, this.command, this.commandRegistry);
			copy.domNode = this.domNode;
			copy.domParent = this.domParent;
			if (parameters) {
				copy.parameters = parameters.makeCopy();
			} else if (this.parameters) {
				copy.parameters = this.parameters.makeCopy();
			}
			return copy;
		}

	};
	CommandInvocation.prototype.constructor = CommandInvocation;



	/**
	 * Constructs a new command with the given options.
	 * @param {Object} [options] The command options object.
	 * @param {String} [options.id] the unique id to be used when referring to the command in the command service.
	 * @param {String} [options.name] the name to be used when showing the command as text.
	 * @param {String} [options.tooltip] the tooltip description to use when explaining the purpose of the command.
	 * @param {Function} [options.callback] the callback to call when the command is activated.  The callback should either 
	 *  perform the command or return a deferred that represents the asynchronous performance of the command.  Optional.
	 * @param {Function} [options.hrefCallback] if specified, this callback is used to retrieve
	 *  a URL that can be used as the location for a command represented as a hyperlink.  The callback should return 
	 *  the URL.  In this release, the callback may also return a deferred that will eventually return the URL, but this 
	 *  functionality may not be supported in the future.  See https://bugs.eclipse.org/bugs/show_bug.cgi?id=341540.
	 *  Optional.
	 * @param {Function} [options.choiceCallback] a callback which retrieves choices that should be shown in a secondary
	 *  menu from the command itself.  Returns a list of choices that supply the name and image to show, and the callback
	 *  to call when the choice is made.  Optional.
	 * @param {String} [options.imageClass] a CSS class name suitable for showing a background image.  Optional.
	 * @param {Boolean} [options.addImageClassToElement] If true, the image class will be added to the element's
	 *  class list. Otherwise, a span element with the image class is created and appended to the element.  Optional.
	 * @param {String} [options.selectionClass] a CSS class name to be appended when the command button is selected. Optional.
	 * @param {String} [options.spriteClass] an additional CSS class name that can be used to specify a sprite background image.  This
	 *  useful with some sprite generation tools, where imageClass specifies the location in a sprite, and spriteClass describes the
	 *  sprite itself.  Optional.
	 * @param {Function} [options.visibleWhen] A callback that returns a boolean to indicate whether the command should be visible
	 *  given a particular set of items that are selected.  Optional, defaults to always visible.
	 * @param {orion.commands.ParametersDescription} [options.parameters] A description of parameters that should be collected before invoking
	 *  the command.
	 * @param {Image} [options.image] the image that may be used to represent the callback.  A text link will be shown in lieu
	 *  of an image if no image is supplied.  Optional.
	 * @class A command is an object that describes an action a user can perform, as well as when and
	 *  what it should look like when presented in various contexts.  Commands are identified by a
	 *  unique id.
	 * @name orion.commands.Command
	 */
	function Command (options) {
		this._init(options);
	}
	Command.prototype = /** @lends orion.commands.Command.prototype */ {
		_init: function(options) {
			this.id = options.id;  // unique id
			this.name = options.name;
			this.tooltip = options.tooltip;
			this.fixAllEnabled = options.fixAllEnabled; // optional toggle for quickfix command to apply to all annotations
			this.callback = options.callback; // optional callback that should be called when command is activated (clicked)
			this.preCallback = options.preCallback; // optional callback that should be called when command is activated (clicked)
			this.hrefCallback = options.hrefCallback; // optional callback that returns an href for a command link
			this.hrefTarget = options.hrefTarget; // optional href target determinds if a new tab should be opened
			this.choiceCallback = options.choiceCallback; // optional callback indicating that the command will supply secondary choices.  
														// A choice is an object with a name, callback, and optional image
			this.positioningNode = options.positioningNode; // optional positioning node choice command.
			this.image = options.image || NO_IMAGE;
			this.imageClass = options.imageClass;   // points to the location in a sprite
			this.addImageClassToElement = options.addImageClassToElement; // optional boolean if true will add the image class to the 
																		// element's class list
			this.extraClass = options.extraClass;
			this.selectionClass = options.selectionClass;
			this.spriteClass = options.spriteClass || "commandSprite"; // defines the background image containing sprites //$NON-NLS-0$
			this.visibleWhen = options.visibleWhen;
			this.parameters = options.parameters;  // only used when a command is used in the command registry. 
			this.isEditor = options.isEditor;
			this.type = options.type;
			this.checked = options.checked;
			this.track = options.track;
		},
		
		/**
		 * Populate the specified menu with choices using the choiceCallback.
		 * Used internally by the command service.  Not intended to be overridden or called
		 * externally.
		 */
		 populateChoicesMenu: function(parent, items, handler, userData, commandService) {
			var choices = this.getChoices(items, handler, userData);
			var addCheck = choices.some(function(choice) {
				return choice.checked;
			});
			choices.forEach(function(choice) {
				if (choice.name) {
					var itemNode = document.createElement("li"); //$NON-NLS-0$
					lib.setSafeAttribute(itemNode, "role", "none");
					parent.appendChild(itemNode);
					var node = document.createElement("span"); //$NON-NLS-0$
					node.tabIndex = -1; 
					node.classList.add("dropdownMenuItem"); //$NON-NLS-0$
					node.style.outline = "none";
					if (addCheck) {
						lib.setSafeAttribute(node, "role", "menuitemradio");
						lib.setSafeAttribute(node, "aria-checked", choice.checked ? "true" : "false");
						var check = document.createElement("span"); //$NON-NLS-0$
						check.classList.add("check"); //$NON-NLS-0$
						lib.setSafeAttribute(check, "role", "none");
						lib.setSafeAttribute(check, "aria-hidden", "true");
						check.appendChild(document.createTextNode(choice.checked ? "\u25CF" : "")); //$NON-NLS-1$ //$NON-NLS-0$
						node.appendChild(check);
					} else {
						lib.setSafeAttribute(node, "role", "menuitem");
					}
					if (choice.imageClass) {
						var image = document.createElement("span"); //$NON-NLS-0$
						image.classList.add(choice.imageClass);
						node.appendChild(image);
					}
					var span = document.createElement("span"); //$NON-NLS-0$
					var text = document.createTextNode(choice.name);
					span.appendChild(text);
					node.appendChild(span);
					itemNode.appendChild(node);
					node.choice = choice;
					node.addEventListener("click", function(event) { //$NON-NLS-0$
						mMetrics.logEvent("command", "invoke", this.id + ">" + choice.name); //$NON-NLS-2$ //$NON-NLS-1$ //$NON-NLS-0$
						choice.callback.call(choice, items);
					}.bind(this), false); 
					node.addEventListener("keydown", function(event) { //$NON-NLS-0$
						if (event.keyCode === lib.KEY.ENTER || event.keyCode === lib.KEY.SPACE) {
							mMetrics.logEvent("command", "invoke", this.id + ">" + choice.name); //$NON-NLS-3$ //$NON-NLS-1$ //$NON-NLS-0$
							choice.callback.call(choice, items);
						}
					}.bind(this), false);
				} else {  // anything not named is a separator
					commandService._generateMenuSeparator(parent);
				}
			}.bind(this));
		},
		
		/**
		 * Get the appropriate choices using the choiceCallback.
		 * Used internally by the command service.  Not intended to be overridden or called
		 * externally.
		 */
		getChoices: function(items, handler, userData) {
			if (this.choiceCallback) {
				return this.choiceCallback.call(handler, items, userData);
			}
			return null;
		},
		
		/**
		 * Make a choice callback appropriate for the given choice and items.
		 * Used internally by the command service.  Not intended to be overridden or called
		 * externally.
		 */
		makeChoiceCallback: function(choice, items) {
			return function(event) {
				if (choice.callback) {
					choice.callback.call(choice, items, event);
				}
			};
		},
		
		/**
		 * Return a boolean indicating whether this command has a specific image associated
		 * with it. Used internally by the command service.  Not intended to be overridden or called
		 * externally.
		 */
		hasImage: function() {
			return this.imageClass || this.image !== NO_IMAGE; //$NON-NLS-0$
		}
	};  // end Command prototype
	Command.prototype.constructor = Command;
	
	//return the module exports
	return {
		Command: Command,
		CommandInvocation: CommandInvocation,
		createDropdownMenu: createDropdownMenu,
		createCheckedMenuItem: createCheckedMenuItem,
		createQuickfixItem: createQuickfixItem,
		createCommandItem: createCommandItem,
		createCommandMenuItem: createCommandMenuItem,
		executeBinding: executeBinding,
		setKeyBindingProvider: setKeyBindingProvider,
		localKeyBindings: localKeyBindings,
		getKeyBindings: getKeyBindings,
		processKey: processKey,
		NO_IMAGE: NO_IMAGE,
		_testMethodProcessKey: _processKey  // only exported for test cases
	};
});
