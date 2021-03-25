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
	'orion/commands',
	'orion/keyBinding',
	'orion/explorers/navigationUtils',
	'orion/bidiUtils',
	'orion/PageUtil',
	'orion/uiUtils',
	'orion/webui/littlelib',
	'orion/webui/dropdown',
	'orion/webui/tooltip',
	'text!orion/webui/submenutriggerbutton.html',
	'orion/metrics',
	'orion/Deferred',
	'orion/EventTarget'
], function(messages, Commands, mKeyBinding, mNavUtils, bidiUtils, PageUtil, UIUtil, lib, mDropdown, mTooltip, SubMenuButtonFragment, mMetrics, mDeferred, mEventTarget) {

	/**
	 * Constructs a new command registry with the given options.
	 * @class CommandRegistry can render commands appropriate for a particular scope and DOM element.
	 * @name orion.commandregistry.CommandRegistry
	 * @param {Object} options The registry options object
	 * @param {orion.selection.Selection} [options.selection] Optional selection service.
	 */
	function CommandRegistry(options) {
		this._commandList = {};
		this._contributionsByScopeId = {};
		this._activeBindings = {};
		this._urlBindings = {};
		this._pendingBindings = {}; // bindings for as-yet-unknown commands
		this._parameterCollector = null;
		this._init(options || {});
	}
	CommandRegistry.prototype = /** @lends orion.commandregistry.CommandRegistry.prototype */ {
		_init: function(options) {
			this._selectionService = options.selection;
			var self = this;
			Commands.setKeyBindingProvider(function() { return self._activeBindings; });

			// Make the CommandRegistry an EventTarget. This is somewhat different from the normal pattern
			// so that we can override the normal 'addEventTarget' processing (see below)
			mEventTarget.attach(CommandRegistry.prototype);

			// Add a listener so our bindings get updated immediately
			this.addEventListener("bindingChanged", function(info) {
				this._handleBindingChanges(info);
			}.bind(this));

		
			/**
			 * @name addEventListener
			 * 
			 * @description This is an override of the normal addEventListener to allow it to
			 * keep listeners synch'd with the current binding overrides whether or not they get added before or
			 * after the actual binding overrides have been retrieved from the preference store.
			 * 
			 * Once the overrides preference is loaded any currently registered listeners are informed of the current
			 * binding overrides. Subsequent listeners are also informed when they get added.
			 * @param eventType The type of event being listened on.
			 * @param listener The listener to call when the event is dispatched.
			 */
			this.addEventListener = function(eventType, listener) {
				// if we've already received the overrides from the preference store then broadcast them to the new listener
				if (this._bindingOverrides && eventType === "bindingChanged") {
					this._updateBindingOverrides(listener);
				}
				
				// hook the listener for future changes
				CommandRegistry.prototype.addEventListener.call(this, eventType, listener);
			}
		},
		
		/**
		 * Process the provided URL to determine whether any commands should be invoked.  Note that we never
		 * invoke a command callback by URL, only its parameter collector.  If a parameter collector is not
		 * specified, commands in the URL will be ignored.
		 *
		 * @param {String} url a url that may contain URL bindings.
		 */
		processURL: function(url) {
			for (var id in this._urlBindings) {
				if (this._urlBindings[id] && this._urlBindings[id].urlBinding && this._urlBindings[id].command) {
					var match = this._urlBindings[id].urlBinding.match(url);
					if (match) {
						var urlBinding = this._urlBindings[id];
						var command = urlBinding.command;
						var invocation = urlBinding.invocation;
						// If the command has not rendered (visibleWhen=false, etc.) we don't have an invocation.
						if (invocation && invocation.parameters && command.callback) {
							invocation.parameters.setValue(match.parameterName, match.parameterValue);
							var self = this;
							window.setTimeout(function() {
								self._invoke(invocation);
							}, 0);
							return;
						}
					}
				}
			}
		},
		
		/**
		 * @param {String} commandId
		 * @returns {orion.commands.Command}
		 */
		findCommand: function(commandId) {
			return this._commandList[commandId];
		}, 
		
		/**
		 * Run the command with the specified commandId.
		 *
		 * @param {String} commandId the id of the command to run.
		 * @param {Object} item the item on which the command should run.
		 * @param {Object} handler the handler for the command.
		 * @param {orion.commands.ParametersDescription} [parameters] Parameters used on this invocation. Optional.
		 * @param {Object} [userData] Optional user data that should be attached to generated command callbacks.
		 * @param {DOMElement} [parent] Optional parent for the parameter collector.
		 *
		 * Note:  The current implementation will only run the command if a URL binding has been
		 * specified, or if an item to run the command against has been specified.  
		 */
		runCommand: function(commandId, item, handler, parameters, userData, parent) {
			var self = this;
			if (item) {
				var command = this._commandList[commandId];
				var enabled = command && (command.visibleWhen ? command.visibleWhen(item) : true);
				if (enabled && command.callback) {
					var commandInvocation = new Commands.CommandInvocation(handler, item, userData, command, self);
					commandInvocation.domParent = parent;
					return self._invoke(commandInvocation, parameters);
				}
			} else {
				//TODO should we be keeping invocation context for commands without bindings? 
				var binding = this._urlBindings[commandId];
				if (binding && binding.command) {
					if (binding.command.callback) {
						return self._invoke(binding.invocation, parameters);
					}
				}
			}
		},
		
		/**
		 * Return the default selection service that is being used when commands should apply against a selection.
		 */
		getSelectionService: function() {
			return this._selectionService;
		},


		/**
		 * Interface for a parameter collector.
		 * @name orion.commandregistry.ParameterCollector
		 * @class
		 */
		/**
		 * Open a parameter collector and return the dom node where parameter information should be inserted.
		 * @name orion.commandregistry.ParameterCollector#open
		 * @function
		 * @param {String|DOMElement} commandNode the node containing the triggering command
		 * @param {Function} fillFunction a function that will fill the parameter area
		 * @param {Function} onClose a function that will be called when the parameter area is closed
		 * @returns {Boolean} Whether the node is open.
		 */
		/**
		 * Closes any active parameter collectors.
		 * @name orion.commandregistry.ParameterCollector#close
		 * @function
		 */
		/**
		 * Returns a function that can be used to fill a specified parent node with parameter information.
		 * @name orion.commandregistry.ParameterCollector#getFillFunction
		 * @function
		 * @param {orion.commands.CommandInvocation} the command invocation used when gathering parameters
		 * @param {Function} closeFunction an optional function called when the area must be closed. 
		 * @returns {Function} a function that can fill the specified dom node with parameter collection behavior
		 */
		/**
		 * Collect parameters for the given command.
		 * @name orion.commandregistry.ParameterCollector#collectParameters
		 * @function
		 * @param {orion.commands.CommandInvocation} commandInvocation The command invocation
		 * @returns {Boolean} Whether or not required parameters were collected.
		 */
		/**
		 * Provide an object that can collect parameters for a given "tool" command.  When a command that
		 * describes its required parameters is shown in a toolbar (as an image, button, or link), clicking
		 * the command will invoke any registered parameterCollector before calling the command's callback.
		 * This hook allows a page to define a standard way for collecting required parameters that is 
		 * appropriate for the page architecture.  If no parameterCollector is specified, then the command callback
		 * will be responsible for collecting parameters.
		 *
		 * @param {orion.commandregistry.ParameterCollector} parameterCollector
		 */
		setParameterCollector: function(parameterCollector) {
			this._parameterCollector = parameterCollector;
		},

		/**
		 * Open a parameter collector suitable for collecting information about a command.
		 * Once a collector is created, the specified function is used to fill it with
		 * information needed by the command.  This method is used for commands that cannot
		 * rely on a simple parameter description to collect parameters.  Commands that describe
		 * their required parameters do not need to use this method because the command framework
		 * will open and close parameter collectors as needed and call the command callback with
		 * the values of those parameters.
		 *
		 * @param {DOMElement} node the dom node that is displaying the command, or a node in the parameter collector area
		 * @param {Function} fillFunction a function that will fill the parameter area
		 * @param {Function} onClose a function that will be called when the user closes the collector
		 * @param {String} name the label that will be used for the dialog title
		 */
		openParameterCollector: function(node, fillFunction, onClose, name) {
			if (this._parameterCollector) {
				this._parameterCollector.close();
				this._parameterCollector.open(node, fillFunction, onClose, name);
			}
		},
		
		/**
		 * Open a parameter collector to confirm a command.
		 *
		 * @param {DOMElement} node the dom node that is displaying the command
		 * @param {String} message the message to show when confirming the command
		 * @param {String} yesString the label to show on a yes/true choice
		 * @param {String} noString the label to show on a no/false choice
		 * @param {Boolean} modal indicates whether the confirmation prompt should be modal.
		 * @param {Function} onConfirm a function that will be called when the user confirms the command.  The function
		 * will be called with boolean indicating whether the command was confirmed.
		 */
		confirm: function(node, message, yesString, noString, modal, onConfirm) {
			this._popupDialog(modal,"CONFIRM", node, message, [{label:yesString,callback:onConfirm,type:"ok"},{label:noString,callback:null,type:"cancel"}]);
		},
		
		/**
		 * Open an alert tooltip
		 *
		 * @param {DOMElement} node the dom node that is displaying the command
		 * @param {String} message the message to show when confirming the command
		 * @param {String} yesString the label to show on a yes/true choice
		 * @param {Function} onConfirm a function that will be called when the user confirms the command.  The function
		 * will be called with boolean indicating whether the command was confirmed.
		 */
		alert: function(node, message, yesString, onConfirm) {
			this._popupDialog(false, "ALERT", node, message, [{label:yesString,callback:onConfirm,type:"ok"}]);
		},
		
		/**
		 * Open a parameter collector to confirm a command or collect user input.
		 *
		 * @param {Boolean} modal indicates whether the confirmation prompt should be modal.
		 * @param {String}  determines the popup dialog's type, could be "PROMPT", "CONFIRM" or "ALERT"
		 * @param {DOMElement} node the dom node that is displaying the command
		 * @param {String} message the message to show when confirming the command
		 * @param {Array} an array of button label, callback, type objects; if the type is "yes", either input.value or true will be passed to callback depends on the dialog's type
		 * @param {String} default message in the input box.
		 * @param [Optional]{String} postion of the popupDialog if specified, have to be one of "below", "right"
		 */
		_popupDialog: function(modal, style, node, message, buttonStringCallList, defaultInput, positionString) {
			var result;
			if (this._parameterCollector && !modal) {
				var self = this;
				var closeFunction = function(){self._parameterCollector.close();};
				var fillFunction = function(parent, buttonParent) {
					var label = document.createElement("span"); //$NON-NLS-0$
					label.classList.add("parameterPrompt"); //$NON-NLS-0$
					label.textContent = message;
					parent.appendChild(label);
					if(style === "PROMPT"){
						var input = document.createElement("input");
						lib.setSafeAttribute(input, "value", defaultInput);
						input.classList.add("parameterInput");
						bidiUtils.initInputField(input);
						parent.appendChild(input);
						input.addEventListener("keydown", function(evt){
							if(lib.KEY.ENTER === evt.keyCode){
								buttonStringCallList[0].callback && buttonStringCallList[0].callback(input.value);  // as defined in propmt method, the first button is ok button
								closeFunction();
							}else if(lib.KEY.ESCAPE === evt.keyCode){
								buttonStringCallList[1].callback && buttonStringCallList[1].callback("");   // as defined in propmt method, the second button is cancel button
								closeFunction();
							}
						}, false);
					}
					
					var buttons = Object.keys(buttonStringCallList).map(function(key){
						var button = document.createElement("button"); //$NON-NLS-0$
						button.addEventListener("click", function(event) { //$NON-NLS-0$
							if(buttonStringCallList[key].type === "ok"){
								result = style === "PROMPT" ? input.value : true;
							}else if(buttonStringCallList[key].type === "cancel"){
								result = style === "PROMPT" ? "" : false;
							}else{
								result = true;
							}
							buttonStringCallList[key].callback && buttonStringCallList[key].callback(result);
							closeFunction();
						}, false);
						buttonParent.appendChild(button);
						button.appendChild(document.createTextNode(buttonStringCallList[key]["label"])); //$NON-NLS-0$
						button.className = "dismissButton";
						return button;
					});
					return style === "PROMPT" ? input : buttons[0];
				};
				this._parameterCollector.close();
				if(!node){
					// Do this if this is a confirm or if this is a prompt but without node specified.
					var opened = this._parameterCollector.open(node, fillFunction, function(){}, messages[style]);
				}
				if (!opened) {
					var tooltip = new mTooltip.Tooltip({
						node: node,
						afterHiding: function() {
							this.destroy();
						},
						trigger: "click", //$NON-NLS-0$
						position: positionString ? positionString : style !== "PROMPT" ? ["below", "right", "above", "left"] : ["right","above", "below", "left"]//$NON-NLS-4$ //$NON-NLS-3$ //$NON-NLS-2$ //$NON-NLS-1$
					});
					var parameterArea = tooltip.contentContainer();
					parameterArea.classList.add("parameterPopup"); //$NON-NLS-0$
					var parent = parameterArea.parentNode;
					lib.setSafeAttribute(parent, "role", "dialog");
					lib.setSafeAttribute(parent, "aria-modal", "true");
					var dialogName = node.getAttribute("aria-label") || node.textContent || messages[style] || messages["Command"];
					lib.setSafeAttribute(parent, "aria-label", dialogName);
					var originalFocusNode = window.document.activeElement;
					closeFunction = function() {
						lib.returnFocus(parameterArea, originalFocusNode);
						tooltip.destroy();
					};
					var messageArea = document.createElement("div"); //$NON-NLS-0$
					messageArea.classList.add("parameterMessage"); //$NON-NLS-0$
					parameterArea.appendChild(messageArea);
					
					var buttonArea = document.createElement("div"); //$NON-NLS-0$
					parameterArea.appendChild(buttonArea);
					buttonArea.classList.add("layoutRight"); //$NON-NLS-0$
					buttonArea.classList.add("parametersDismiss"); //$NON-NLS-0$
				
					var focusNode = fillFunction(messageArea, buttonArea);
					tooltip.show();
					if (focusNode) {
						window.setTimeout(function() {
							focusNode.focus();
							if (focusNode.select) {
								focusNode.select();
							}
						}, 0);	
					}
				}
			}else{
				result = window.confirm(message);
				buttonStringCallList[0].callback(result);
			}
		},
		
		/**
		 * Open a tolltip parameter collector to collect user input.
		 *
		 * @param {DOMElement} node the dom node that is displaying the command
		 * @param {String} message the message to show when confirming the command
		 * @param {String} yesString the label to show on a yes/true choice
		 * @param {String} noString the label to show on a no/false choice
		 * @param {String} default message in the input box.
		 * @param {Boolean} modal indicates whether the confirmation prompt should be modal.
		 * @param {Function} onConfirm a function that will be called when the user confirms the command.  The function
		 * will be called with boolean indicating whether the command was confirmed.
		 * @param [Optional]{String} postion of the popupDialog if specified, have to be one of "below", "right"
		 */
		prompt: function(node, message, yesString, noString, defaultInput, modal, onConfirm, positionString) {
			var position = null;
			if(positionString === "below"){position = ["below", "right", "above", "left"];}
			else if(positionString === "right"){position = ["right", "above", "below", "left"];}
			this._popupDialog(modal,"PROMPT", node, message, [{label:yesString,callback:onConfirm,type:"ok"},{label:noString,callback:null,type:"cancel"}], defaultInput, position);
		},
		
		/**
		 * Open a dialog with several buttons.
		 *
		 * @param {DOMElement} node the dom node that is displaying the command
		 * @param {String} message the message to show when confirming the command
		 * @param {Array} an array of button label, callback, type objects;
		 */
		confirmWithButtons: function(node, message, buttonsCallbackList){
			this._popupDialog(false, "CONFIRM", node, message, buttonsCallbackList);
		},
		
		/**
		 * Close any active parameter collector.  This method should be used to deactivate a
		 * parameter collector that was opened with <code>openParameterCollector</code>.
		 * Commands that describe their required parameters do not need to use this method 
		 * because the command framework will open and close parameter collectors as needed and 
		 * call the command callback with the values of those parameters.
		 */
		closeParameterCollector: function() {
			if (this._parameterCollector) {
				this._parameterCollector.close();
			}
		},
		
		/**
		 * Returns whether this registry has been configured to collect command parameters
		 *
		 * @returns {Boolean} whether or not this registry is configured to collect parameters.
		 */
		collectsParameters: function() {
			return this._parameterCollector;
		},
		
		/*
		 * Invoke the specified command, collecting parameters if necessary.  This is used inside the framework
		 * when the user invokes a command. If parameters are specified, then these parameters should be used
		 * in lieu of the invocation's parameters.
		 *
		 */
		_invoke: function(commandInvocation, parameters) {
			return this._collectAndInvoke(commandInvocation.makeCopy(parameters), false);
		},
		
		/*
		 * This method is the actual implementation for collecting parameters and invoking a callback.
		 * "forceCollect" specifies whether we should always collect parameters or consult the parameters description to see if we should.
		 */
		_collectAndInvoke: function(commandInvocation, forceCollect, cancelCallback) {
			if (commandInvocation) {
				// Establish whether we should be trying to collect parameters. 
				if (this._parameterCollector && commandInvocation.parameters && commandInvocation.parameters.hasParameters() && 
					(forceCollect || commandInvocation.parameters.shouldCollectParameters())) {
					var collecting = false;
					commandInvocation.parameters.updateParameters(commandInvocation);
					// Consult shouldCollectParameters() again to verify we still need collection. Due to updateParameters(), the CommandInvocation
					// could have dynamically set its parameters to null (meaning no collection should be done).
					if (commandInvocation.parameters.shouldCollectParameters()) {
						var dialogName = messages["Command"]; // default name
						if (commandInvocation.domNode && commandInvocation.domNode.textContent) {
							dialogName = commandInvocation.domNode.textContent;
						}
						collecting = this._parameterCollector.collectParameters(commandInvocation,cancelCallback, dialogName);
						// The parameter collector cannot collect.  We will do a default implementation using a popup.
						if (!collecting) {
							var tooltip = new mTooltip.Tooltip({
								node: commandInvocation.domNode || commandInvocation.domParent,
								afterHiding: function() {
									this.destroy();
									if (commandInvocation.domParent) commandInvocation.domParent.classList.remove("parameterPopupOpen"); //$NON-NLS-1$
								},
								trigger: "click", //$NON-NLS-0$
								position: ["below", "right", "above", "left"] //$NON-NLS-4$ //$NON-NLS-3$ //$NON-NLS-2$ //$NON-NLS-1$
							});
							var parameterArea = tooltip.contentContainer();
							parameterArea.classList.add("parameterPopup"); //$NON-NLS-0$
							var parent = parameterArea.parentNode;
							lib.setSafeAttribute(parent, "role", "dialog");
							lib.setSafeAttribute(parent, "aria-modal", "true");
							lib.setSafeAttribute(parent, "aria-label", dialogName);
							var originalFocusNode = window.document.activeElement;
							var focusNode = this._parameterCollector.getFillFunction(commandInvocation, function() {
								lib.returnFocus(parameterArea, originalFocusNode);
								tooltip.destroy();
								if (commandInvocation.domParent) commandInvocation.domParent.classList.remove("parameterPopupOpen"); //$NON-NLS-0$
							}, cancelCallback)(parameterArea);
							tooltip.show();
							if (commandInvocation.domParent) commandInvocation.domParent.classList.add("parameterPopupOpen"); //$NON-NLS-0$
							if (focusNode) {
								window.setTimeout(function() {
									focusNode.focus();
									if (focusNode.select) {
										focusNode.select();
									}
								}, 0);
							}
							collecting = true;
						}
					}
					if (!collecting) {
						mMetrics.logEvent("command", "invoke", commandInvocation.command.id); //$NON-NLS-2$ //$NON-NLS-1$
						// Just call the callback with the information we had.
						return commandInvocation.command.callback.call(commandInvocation.handler || window, commandInvocation);
					}
				} else {
					mMetrics.logEvent("command", "invoke", commandInvocation.command.id); //$NON-NLS-2$ //$NON-NLS-1$
					// We should not be trying to collect parameters, just call the callback.
					return commandInvocation.command.callback.call(commandInvocation.handler || window, commandInvocation);
				}
			} else {
				window.console.log("Client attempted to invoke command without an available (rendered) command invocation"); //$NON-NLS-0$
			}
		},
		
		/**
		 * Collect the parameters specified in the given command invocation.  If parameters are
		 * collected successfully, invoke the command's callback. This method is used by clients who want to 
		 * control the timing of parameter collection.  For example, if a command must be executed before it can
		 * be determined what parameters are known, the client can try the command in the callback and then call
		 * this function if parameters are needed.  In this case, clients typically configure the parameters description
		 * options with "options.clientWillCollect" set to true.
		 *
		 * @see orion.commands.ParametersDescription
		 *
		 * @param {orion.commands.CommandInvocation} commandInvocation the current invocation of the command 
		 */
		collectParameters: function(commandInvocation,cancelCallback) {
			this._collectAndInvoke(commandInvocation, true, cancelCallback); 
		},
		
		/**
		 * Show the keybindings that are registered with the command registry inside the specified target node.
		 * @param {KeyAssistPanel} keyAssist the key assist panel
		 */
		showKeyBindings: function(keyAssist) {
			var scopes = {};
			var binding;
			// see commands.js _processKey
			function execute(activeBinding) {
				return function() {
					Commands.executeBinding(activeBinding);
				};
			}
			
			var bindings = [];
			for (var aBinding in this._activeBindings) {
				binding = this._activeBindings[aBinding];
				if (binding && binding.keyBinding && binding.command && (binding.command.name || binding.command.tooltip)) {
					bindings.push(binding);
				}
			}
			bindings.sort(function (a, b) {
				var ta = a.command.name || a.command.tooltip;
				var tb = b.command.name || b.command.tooltip;
				return ta.localeCompare(tb);
			});
			for (var i=0; i<bindings.length; i++) {
				binding = bindings[i];
				// skip scopes and process at end
				if (binding.keyBinding.scopeName) {
					if (!scopes[binding.keyBinding.scopeName]) {
						scopes[binding.keyBinding.scopeName] = [];
					}
					scopes[binding.keyBinding.scopeName].push(binding);
				} else {
					keyAssist.createItem(binding.keyBinding, binding.command.name || binding.command.tooltip, binding.command.id, execute(binding));
				}
			}
			for (var scopedBinding in scopes) {
				if (scopes[scopedBinding].length && scopes[scopedBinding].length > 0) {
					keyAssist.createHeader(scopedBinding, lib.validId(scopedBinding) + "Scope"); //$NON-NLS-0$
					scopes[scopedBinding].forEach(function(binding) {
						keyAssist.createItem(binding.keyBinding, binding.command.name || binding.command.tooltip, binding.command.id, execute(binding));
					});
				}	
			}
		},
		
		_handleBindingChanges: function(args) {
			// Change the command's current binding
			var command = this.findCommand(args.id);
			if (command) {
				// Add the new binding (overrides any existing one)
				var curBinding = this._activeBindings[args.id];
				if (curBinding) {
					curBinding.keyBinding = args.newBinding;
				} else {
					this._addBinding(command, "key", args.newBinding); //$NON-NLS-1$
				}
			}
			
			// Now see if we have any menu items to update
			if (this._renderedCommands && this._renderedCommands[args.id]) {
				var scopes = this._renderedCommands[args.id];
				var keys = Object.keys(scopes);
				for (var i=0; i<keys.length; i++) {
					var invocation = scopes[keys[i]];
					var bindingString = UIUtil.getUserKeyString(args.newBinding);
					var newElement = Commands.createCommandMenuItem(invocation.domParent, invocation.command, invocation, null, invocation.onClick, bindingString);
					invocation.domNode.parentNode.replaceChild(newElement, invocation.domNode);
					invocation.domNode = newElement;
				}
			}
		},
		
		/**
		 * @name createBindingOverride
		 * @description Creates an override for the binding of a particular Command or Text Action.
		 * @param id The id of the Command or Text Action being overridden
		 * @param newBinding The new binding to use
		 * @param prevBinding The binding (if any) being overridden. Note that this is needed to ensure that
		 * we override the correct Text Action (which can have multiple bindings for the same id).
		 */
		createBindingOverride: function(id, newBinding, prevBinding) {
			if (!this._bindingOverrides) {
				this._bindingOverrides = [];
			}

			// Capture this change			
			this._bindingOverrides.push ({id: id, newBinding: newBinding, prevBinding: prevBinding});

			// Update the preference store
			if (this._prefService) {
				var overridesStr = JSON.stringify(this._bindingOverrides);
				this._prefService.put("/KeyBindings", {overridesJSON: overridesStr}); //$NON-NLS-1$
			}
			
			// Handle the change locally
			var bindingChangeEvent = {type: "bindingChanged", id: id, newBinding: newBinding, prevBinding: prevBinding}; //$NON-NLS-1$
			this.dispatchEvent(bindingChangeEvent);
		},

		/**
		 * @name _registerRenderedCommand
		 * @description Keeps a record of the 'invocation' object for a rendered command. The invocation contains
		 * a lot of information about the rendered item (including the DOM element created to show it). This is currently
		 * used to update the menu item's key binding info if its binding changes.
		 * 
		 * @param actionID The actionID of the menu item
		 * @param scopeID The scopeID of this particular invocation (two different menus can be created using the same commands)
		 * @param invocation The invocation record to store
		 */
		_registerRenderedCommand: function(actionID, scopeID, invocation) {
			if (!this._renderedCommands) {
				this._renderedCommands = {};
			}
			var scopes = this._renderedCommands[actionID];
			if (!scopes) {
				scopes = this._renderedCommands[actionID] = {};
			}
			scopes[scopeID] = invocation;
		},
		
		_getBindingOverrides: function() {
			// Get the key binding overrides from the preference store
			return this._prefService.get("/KeyBindings").then(function(bindingPrefs) { //$NON-NLS-1$
				var overrides = [];
				
				var prefVal = bindingPrefs["overridesJSON"]; //$NON-NLS-1$
				if (prefVal) {
					// Sometimes we get the parsing done for us, sometimes not...wtf?
					if (typeof prefVal === "string") {
						overrides = JSON.parse(prefVal);
					} else {
						overrides = prefVal;
					}
				}
				
				// Turn the Objects back into KeyStrokes
				for (var i = 0; i < overrides.length; i++) {
					var bindingChange = overrides[i];
					if (bindingChange.newBinding) {
						var nb = bindingChange.newBinding;
						overrides[i].newBinding = new mKeyBinding.KeyStroke(nb.keyCode, nb.mod1, nb.mod2, nb.mod3, nb.mod4, nb.type);
					}
					if (bindingChange.prevBinding) {
						var pb = bindingChange.prevBinding;
						overrides[i].prevBinding = new mKeyBinding.KeyStroke(pb.keyCode, pb.mod1, pb.mod2, pb.mod3, pb.mod4, pb.type);
					}
				}
				
				return new mDeferred().resolve(overrides);
			}.bind(this));
		},
		
		/**
		 * @name getBindingOverride
		 * @description returns the binding that the given id should be overridden with (or null if no override exists). Note that
		 * this method is only valid for Commands, not Text Actions,
		 * @param cmdId The id of the Command to check
		 * @returns returns the new KeyStroke if there's an override else null
		 */
		getBindingOverride: function(cmdId) {
			// If we haven't recieved the overrides yet
			if (!this._bindingOverrides)
				return null;
			
			// Here we want the *last* override so we iterate backwards
			for (var i = (this._bindingOverrides.length - 1); i >= 0; i--) {
				var override = this._bindingOverrides[i];
				if (override.id === cmdId) {
					return override.newBinding;
				}
			}
			return null;
		},
		
		/** 
		 * Add a command to the command registry.  Nothing will be shown in the UI
		 * until this command is referenced in a contribution.
		 * @param {orion.commands.Command} command The command being added.
		 * @see registerCommandContribution
		 */
		addCommand: function(command) {
			this._commandList[command.id] = command;
			// Resolve any pending key/url bindings against this command
			var pending = this._pendingBindings[command.id];
			if (pending) {
				var _self = this;
				pending.forEach(function(binding) {
					_self._addBinding(command, binding.type, binding.binding, binding.bindingOnly);
				});
				delete this._pendingBindings[command.id];
			}
		},
		
		/**
		 * Registers a command group and specifies visual information about the group.
		 * @param {String} scopeId The id of a DOM element in which the group should be visible.  Required.
		 *  When commands are rendered for a particular element, the group will be shown only if its scopeId
		 *  matches the id being rendered.
		 * @param {String} groupId The id of the group, must be unique.  May be used for a dom node id of
		 *  the element representing the group
		 * @param {Number} position The relative position of the group within its parent.  Required.
		 * @param {String} [title] The title of the group, optional
		 * @param {String} [parentPath] The path of parent groups, separated by '/'.  For example,
		 *  a path of "group1Id/group2Id" indicates that the group belongs as a child of 
		 *  group2Id, which is itself a child of group1Id.  Optional.
		 * @param {String} [emptyGroupMessage] A message to show if the group is empty and the user activates the UI element
		 *  representing the group.  Optional.  If not specified, then the group UI element won't be shown when it is empty.
		 * @param {String} [imageClass] CSS class of an image to use for this group.
		 * @param {String} [tooltip] Tooltip to show on this group. If not provided, and the group uses an <code>imageClass</code>,
		 * the <code>title</code> will be used as the tooltip.
		 * @param {String} [selectionClass] CSS class to be appended when the command button is selected. Optional.
		 * @param {String} or {boolean} [defaultActionId] Id of an action from this group that should be invoked when the group is selected. This will add an
		 * arrow to the group that will open the dropdown. Optionally this can be set to <code>true</code> instead of adding a particular action.
		 * If set to <code>true</code> the group will be rendered as if there was a default action, but instead of invoking the default action it will
		 * open the dropdown. Optional.
		 * @param {String} [extraClasses] A string containing space separated css classes that will be applied to group button
		 */	
		addCommandGroup: function(scopeId, groupId, position, title, parentPath, emptyGroupMessage, imageClass, tooltip, selectionClass, defaultActionId, extraClasses) {
			if (!this._contributionsByScopeId[scopeId]) {
				this._contributionsByScopeId[scopeId] = {};
			}
			var parentTable = this._contributionsByScopeId[scopeId];
			if (parentPath) {
				parentTable = this._createEntryForPath(parentTable, parentPath);		
			}
			
			if (parentTable[groupId]) {
				// update existing group definition if info has been supplied
				if (title) {
					parentTable[groupId].title = title;
				}
				if (position) {
					parentTable[groupId].position = position;
				}
				if (imageClass) {
					parentTable[groupId].imageClass = imageClass;
				}
				if (tooltip) {
					parentTable[groupId].tooltip = tooltip;
				}
				if (selectionClass) {
					parentTable[groupId].selectionClass = selectionClass;
				}
				
				if (extraClasses) {
					parentTable[groupId].extraClass = extraClasses;
				}
				
				if(defaultActionId === true){
					parentTable[groupId].pretendDefaultActionId = true;
				} else {
					parentTable[groupId].defaultActionId = defaultActionId;
				}
				

				parentTable[groupId].emptyGroupMessage = emptyGroupMessage;
			} else {
				// create new group definition
				parentTable[groupId] = {title: title, 
										position: position, 
										emptyGroupMessage: emptyGroupMessage,
										imageClass: imageClass,
										tooltip: tooltip,
										selectionClass: selectionClass,
										defaultActionId: defaultActionId === true ? null : defaultActionId,
										pretendDefaultActionId: defaultActionId === true,
										children: {},
										extraClasses: extraClasses};
				parentTable.sortedContributions = null;
			}
		},
		
		_createEntryForPath: function(parentTable, parentPath) {
			if (parentPath) {
				var segments = parentPath.split("/"); //$NON-NLS-0$
				segments.forEach(function(segment) {
					if (segment.length > 1) {
						if (!parentTable[segment]) {
							// empty slot with children
							parentTable[segment] = {position: 0, children: {}};
							parentTable.sortedContributions = null;
						} 
						parentTable = parentTable[segment].children;
					}
				});
			}
			return parentTable;	
		},
		
		/**
		 * Register a selection service that should be used for certain command scopes.
		 * @param {String} scopeId The id describing the scope for which this selection service applies.  Required.
		 *  Only contributions made to this scope will use the selection service.
		 * @param {orion.selection.Selection} selectionService the selection service for the scope.
		 */
		registerSelectionService: function(scopeId, selectionService) {
			if (!this._contributionsByScopeId[scopeId]) {
				this._contributionsByScopeId[scopeId] = {};
			}
			this._contributionsByScopeId[scopeId].localSelectionService = selectionService;
		},
		
		/**
		 * Register the serviceRegistry. Use this gain access to any other services we need (i.e. the preferenceService)
		 * @param serviceRegistry {orion.serviceregistry.ServiceRegistry} the current service registry.
		 */
		setServiceRegistry: function(serviceRegistry) {
			this._serviceRegistry = serviceRegistry;
			this._prefService = serviceRegistry.getService("orion.core.preference"); //$NON-NLS-1$

			if (this._prefService) {
				// Get the overrides from the preference store
				this._getBindingOverrides().then(function(overrides) {
					this._bindingOverrides = overrides;
					
					// Update all folks that are listening
					this._updateBindingOverrides();
				}.bind(this));
	
				// listen for changes from other pages
				this._prefService.addEventListener("changed", function (e) {
					if (e.namespace === "/KeyBindings") { //$NON-NLS-1$
						// Refresh the binding overrides
						this._getBindingOverrides().then(function(overrides) {
							if (overrides.length > this._bindingOverrides.length) {
								// handle any new changes
								for (var i = this._bindingOverrides.length; i < overrides.length; i++) {
									var override = overrides[i];
									var bindingChangeEvent = {type: "bindingChanged", id: override.id, newBinding: override.newBinding,  //$NON-NLS-1$
																prevBinding: override.prevBinding};
									this.dispatchEvent(bindingChangeEvent);
								}
							}
							this._bindingOverrides = overrides;
						}.bind(this));
					}
				}.bind(this));
			}
		},

		_updateBindingOverrides: function(listener) {
			for(var i = 0; i < this._bindingOverrides.length; i++) {
				var override = this._bindingOverrides[i];
				var bindingChangeEvent = {type: "bindingChanged", id: override.id, newBinding: override.newBinding,  //$NON-NLS-1$
					prevBinding: override.prevBinding};
				if (listener) {
					listener(bindingChangeEvent);
				} else {
					this.dispatchEvent(bindingChangeEvent);
				}
			}
		},
		
		/**
		 * Register a command contribution, which identifies how a command appears
		 * on a page and how it is invoked.
		 * @param {String} scopeId The id describing the scope of the command.  Required.
		 *  This scope id is used when rendering commands.
		 * @param {String} commandId the id of the command.  Required.
		 * @param {Number} position the relative position of the command within its parent.  Required.
		 * @param {String} [parentPath=null] the path of any parent groups, separated by '/'.  For example,
		 *  a path of "group1Id/group2Id/command" indicates that the command belongs as a child of 
		 *  group2Id, which is itself a child of group1Id.  Optional.
		 * @param {boolean} [bindingOnly=false] if true, then the command is never rendered, but the key or URL binding is hooked.
		 * @param {orion.KeyBinding} [keyBinding] a keyBinding for the command.  Optional.
		 * @param {orion.commands.URLBinding} [urlBinding] a url binding for the command.  Optional.
		 * @param {Object} [handler] the object that should perform the command for this contribution.  Optional.
		 */
		registerCommandContribution: function(scopeId, commandId, position, parentPath, bindingOnly, keyBinding, urlBinding, handler) {
			if (!this._contributionsByScopeId[scopeId]) {
				this._contributionsByScopeId[scopeId] = {};
			}
			var parentTable = this._contributionsByScopeId[scopeId];
			if (parentPath) {
				parentTable = this._createEntryForPath(parentTable, parentPath);		
			} 
			
			// store the contribution
			parentTable[commandId] = {position: position, handler: handler};
			
			var command;
			if (this._bindingOverrides) {
				var bindingOverride = this.getBindingOverride(commandId, keyBinding);
				if (bindingOverride) {
					keyBinding = bindingOverride;
				}
			}
			// add to the bindings table now
			if (keyBinding) {
				command = this._commandList[commandId];
				if (command) {
					this._addBinding(command, "key", keyBinding, bindingOnly); //$NON-NLS-0$
				} else {
					this._addPendingBinding(commandId, "key", keyBinding, bindingOnly); //$NON-NLS-0$
				}
			}
			
			// add to the url key table
			if (urlBinding) {
				command = this._commandList[commandId];
				if (command) {
					this._addBinding(command, "url", urlBinding, bindingOnly); //$NON-NLS-0$
				} else {
					this._addPendingBinding(commandId, "url", urlBinding, bindingOnly); //$NON-NLS-0$
				}
			}
			// get rid of sort cache because we have a new contribution
			parentTable.sortedContributions = null;
		},
		
		unregisterCommandContribution: function(scopeId, commandId, parentPath){
			if (!this._contributionsByScopeId[scopeId]) {
				// scope does not exist
				return;
			}
			delete this._commandList[commandId];
			delete this._activeBindings[commandId];
			delete this._urlBindings[commandId];
			delete this._pendingBindings[commandId];
			var parentTable = this._contributionsByScopeId[scopeId];
			if(parentPath){
				var segments = parentPath.split("/"); //$NON-NLS-0$
				segments.forEach(function(segment) {
					if (segment.length > 1) {
						if (!parentTable[segment]) {
							// command does not exist in given path
							return;
						} 
						parentTable = parentTable[segment].children;
					}
				});
			}
			delete parentTable[commandId];
			
			parentTable.sortedContributions = null;
		},

		/**
		 * @param {String} type One of <code>"key"</code>, <code>"url"</code>.
		 */
		_addBinding: function(command, type, binding, bindingOnly) {
			if (!command.id) {
				throw new Error("No command id: " + command); //$NON-NLS-1$
			}
			if (type === "key") { //$NON-NLS-0$
				this._activeBindings[command.id] = {command: command, keyBinding: binding, bindingOnly: bindingOnly};
			} else if (type === "url") { //$NON-NLS-0$
				this._urlBindings[command.id] = {command: command, urlBinding: binding, bindingOnly: bindingOnly};
			}
		},

		/**
		 * Remembers a key or url binding that has not yet been resolved to a command.
		 * @param {String} type One of <code>"key"</code>, <code>"url"</code>.
		 */
		_addPendingBinding: function(commandId, type, binding, bindingOnly) {
			this._pendingBindings[commandId] = this._pendingBindings[commandId] || [];
			this._pendingBindings[commandId].push({
				type: type,
				binding: binding,
				bindingOnly: bindingOnly
			});
		},

		_checkForTrailingSeparator: function(parent, style, autoRemove) {
			var last;
			if (style === "tool" || style === "button") { //$NON-NLS-1$ //$NON-NLS-0$
				last = parent.childNodes.length > 0 ? parent.childNodes[parent.childNodes.length-1] : null;
				if (last && last.classList.contains("commandSeparator")) { //$NON-NLS-0$
					if (autoRemove) {
						parent.removeChild(last);
						return false;
					} 
					return true;
				}
			}
			if (style === "menu") { //$NON-NLS-0$
				var items = lib.$$array("li > *", parent); //$NON-NLS-0$
				if (items.length > 0 && items[items.length - 1].classList.contains("dropdownSeparator")) { //$NON-NLS-0$
					last = items[items.length - 1];
					if (autoRemove) {
						// reachy reachy.  Remove the anchor's li parent
						last.parentNode.parentNode.removeChild(last.parentNode);
						return false;
					} else {
						return true;
					}
				}
			}
			return false;
		},

		/**
		 * Render the commands that are appropriate for the given scope.
		 * @param {String} scopeId The id describing the scope for which we are rendering commands.  Required.
		 *  Only contributions made to this scope will be rendered.
		 * @param {DOMElement} parent The element in which commands should be rendered.  If commands have been
		 *  previously rendered into this element, it is up to the caller to empty any previously generated content.
		 * @param {Object} [items] An item or array of items to which the command applies.  Optional.  If no
		 *  items are specified and a selection service was specified at creation time, then the selection
		 *  service will be used to determine which items are involved. 
		 * @param {Object} handler The object that should perform the command
		 * @param {String} renderType The style in which the command should be rendered.  "tool" will render
		 *  a tool image in the dom.  "button" will render a text button.  "menu" will render menu items.  
		 * @param {Object} [userData] Optional user data that should be attached to generated command callbacks
		 * @param {Object[]} [domNodeWrapperList] Optional an array used to record any DOM nodes that are rendered during this call.
		 *  If an array is provided, then as commands are rendered, an object will be created to represent the command's node.  
		 *  The object will always have the property "domNode" which contains the node created for the command.  If the command is
		 *  rendered using other means (toolkit widget) then the optional property "widget" should contain the toolkit
		 *  object that represents the specified dom node.
		 */	
		renderCommands: function(scopeId, parent, items, handler, renderType, userData, domNodeWrapperList) {
			if (typeof(scopeId) !== "string") { //$NON-NLS-0$
				throw "a scope id for rendering must be specified"; //$NON-NLS-0$
			}
			parent = lib.node(parent);
			if (!parent) { 
				throw "no parent";  //$NON-NLS-0$
			}

			var contributions = this._contributionsByScopeId[scopeId];

			if (!items && contributions) {
				var selectionService = contributions.localSelectionService || this._selectionService;
				var self = this;
				if (selectionService) {
					selectionService.getSelections(function(selections) {
						self.renderCommands(scopeId, parent, selections, handler, renderType, userData);
					});
				}
				return;
			} 
			if (contributions) {
				this._render(scopeId, contributions, parent, items, handler, renderType || "button", userData, domNodeWrapperList); //$NON-NLS-0$
				
				// If the last thing we rendered was a group, it's possible there is an unnecessary trailing separator.
				this._checkForTrailingSeparator(parent, renderType, true);
			}
		},
		
		/**
		 * Destroy all DOM nodes and any other resources used by rendered commands.
		 * This call does not remove the commands from the command registry.  Clients typically call this
		 * function to empty a command area when a client wants to render the commands again due to some 
		 * change in state.  
		 * @param {String|DOMElement} parent The id or DOM node that should be emptied.
		 */
		destroy: function(parent) {
			parent = lib.node(parent);
			if (!parent) { 
				throw "no parent";  //$NON-NLS-0$
			}
			while (parent.hasChildNodes()) {
				var node = parent.firstChild;
				if (node.commandTooltip) {
					node.commandTooltip.destroy();
				}
				if (node.emptyGroupTooltip) {
					node.emptyGroupTooltip.destroy();
				}
				this.destroy(node);
				parent.removeChild(node);
			}
		},
		
		_render: function(scopeId, contributions, parent, items, handler, renderType, userData, domNodeWrapperList, extraClasses) {
			// sort the items
			var sortedByPosition = contributions.sortedContributions;
			
			if (!sortedByPosition) {
				sortedByPosition = [];
				var pushedItem = false;
				for (var key in contributions) {
					if (Object.prototype.hasOwnProperty.call(contributions, key)) {
						var item = contributions[key];
						if (item && typeof(item.position) === "number") { //$NON-NLS-0$
							item.id = key;
							sortedByPosition.push(item);
							pushedItem = true;
						}
					}
				}
				if (pushedItem) {
					sortedByPosition.sort(function(a,b) {
						return a.position-b.position;
					});
					contributions.sortedContributions = sortedByPosition;
				}
			}
			// now traverse the sorted contributions and render as we go
			var index = 0;
			var self = this;
			sortedByPosition.forEach(function(contribution) {
				var id, invocation;
				
				if( !contribution.imageClass ){
					contribution.imageClass = null;
				}
				
				if (contribution.children && Object.getOwnPropertyNames(contribution.children).length > 0) {
					
					var childContributions = contribution.children;
					var created;
					
					if (renderType === "tool" || renderType === "button" || renderType === "menubar") { //$NON-NLS-0$ //$NON-NLS-1$
						if (contribution.title) {
							// We need a named menu button.  We used to first render into the menu and only 
							// add a menu button in the dom when we knew items were actually rendered.
							// For performance, though, we need to be asynchronous in traversing children, so we will 
							// add the menu button always and then remove it if we don't need it.  
							// If we wait until the end of asynch processing to add the menu button, the layout will have 
							// to be redone. The down side to always adding the menu button is that we may find out we didn't
							// need it after all, which could cause layout to change.
							var defaultInvocation;
							if(contribution.defaultActionId){
								contribution.pretendDefaultActionId = contribution.defaultActionId === true;
								var defaultChild = self._commandList[contribution.defaultActionId];
								if(defaultChild && (defaultChild.visibleWhen ? defaultChild.visibleWhen(items) : true)){
									defaultInvocation = new Commands.CommandInvocation(handler, items, userData, defaultChild, self);
									defaultInvocation.domParent = parent;
								} else {
									contribution.pretendDefaultActionId = true;
								}
							}
						
							created = self._createDropdownMenu(parent, contribution.title, null /*nested*/, null /*populateFunc*/, contribution.imageClass, contribution.tooltip, contribution.selectionClass, null, defaultInvocation, contribution.pretendDefaultActionId, contribution.extraClasses);
							
							if(domNodeWrapperList){
								mNavUtils.generateNavGrid(domNodeWrapperList, created.menuButton);
							}

							// render the children asynchronously
							if (created) {
								// If this is the first dropdown in the menu bar then make it tabbable
								if (renderType === "menubar") {
									created.menuButton.tabIndex = parent.childElementCount === 1 ? "0" : "-1";
									created.menuButton.addEventListener("focus", function(evt) {
										var menuItem = evt.currentTarget;
										var menubarDropdown = menuItem.parentNode.parentNode.dropdown;
										menubarDropdown._selectItem(menuItem);
									}, true);
								}
								
//								window.setTimeout(function() {
									self._render(scopeId, contribution.children, created.menu, items, handler, "menu", userData, domNodeWrapperList);  //$NON-NLS-0$
									// special post-processing when we've created a menu in an image bar.  We want to get rid 
									// of a trailing separator in the menu first, and then decide if our menu is necessary
									self._checkForTrailingSeparator(created.menu, "menu", true);  //$NON-NLS-0$
									// now determine if we actually needed the menu or not
									
									if (created.menu.childNodes.length === 0) {
										if (contribution.emptyGroupMessage) {
											if (!created.menuButton.emptyGroupTooltip) {
												created.menuButton.emptyGroupTooltip = new mTooltip.Tooltip({
													node: created.menuButton,
													text: contribution.emptyGroupMessage,
													trigger: "click", //$NON-NLS-0$
													position: ["below", "right", "above", "left"] //$NON-NLS-3$ //$NON-NLS-2$ //$NON-NLS-1$ //$NON-NLS-0$
												});
											}
										} else {
											if(domNodeWrapperList){
												mNavUtils.removeNavGrid(domNodeWrapperList, created.menuButton);
											}
											function remove(child) {
												if (child && child.parentNode) {
													child.parentNode.removeChild(child);
												}
											}
											remove(created.menu);
											remove(created.menuButton);
											remove(created.destroyButton);
										}
									} else {
										created.menuButton.style.visibility = "visible";  //$NON-NLS-0$
									}
//								}, 0);
							}
						} else {  
							// rendering a group using a separator on each end. We do it synchronously because order matters with
							// non grouped items.
							var sep;
							// Only draw a separator if there is a non-separator preceding it.
							if (parent.childNodes.length > 0 && !self._checkForTrailingSeparator(parent, renderType)) {
								sep = self.generateSeparatorImage(parent);
							}
							self._render(scopeId, childContributions, parent, items, handler, renderType, userData, domNodeWrapperList); 
	
							// make sure that more than just the separator got rendered before rendering a trailing separator
							if (parent.childNodes.length > 0) {
								var lastRendered = parent.childNodes[parent.childNodes.length - 1];
								if (lastRendered !== sep) {
									sep = self.generateSeparatorImage(parent);
								}
							}
						}
					} else {
						// group within a menu
						if (contribution.title) {
							var subMenu = self._createDropdownMenu(parent, contribution.title, true, null, null, contribution.imageClass);
							if (subMenu) {
								self._render(scopeId, childContributions, subMenu.menu, items, handler, "menu", userData, domNodeWrapperList);  //$NON-NLS-0$
								// special post-processing when we've created a menu in an image bar.  We want to get rid 
								// of a trailing separator in the menu first, and then decide if our menu is necessary
								self._checkForTrailingSeparator(subMenu.menu, "menu", true);  //$NON-NLS-0$
								// If no items rendered in the submenu, we don't need it.
								if (subMenu.menu.childNodes.length === 0 && subMenu.destroyButton) {
									parent.removeChild(subMenu.destroyButton);
								}
							}
						} else {  
							// menu items with leading and trailing separators
							// don't render a separator if there is nothing preceding
							if (parent.childNodes.length > 0) {
								self._generateMenuSeparator(parent);
							}
							// synchronously render the children since order matters
							self._render(scopeId, childContributions, parent, items, handler, renderType, userData, domNodeWrapperList); 
							// Add a trailing separator if children rendered.
							if (parent.childNodes.length > 0) {
								self._generateMenuSeparator(parent);
							}
						}
					}
				} else {
					// processing atomic commands
					var command = self._commandList[contribution.id];
					var render = command ? true : false;
					var keyBinding = null;
					var urlBinding = null;
					if (command) {
						invocation = new Commands.CommandInvocation(contribution.handler || handler, items, userData, command, self);
						invocation.domParent = parent;
						var enabled = false;
						try {
							enabled = render && (command.visibleWhen ? command.visibleWhen(items, invocation) : true);
						} catch (e) {
							console.log(e);
							throw e;
						}
						// ensure that keybindings are bound to the current handler, items, and user data
						if (self._activeBindings[command.id] && self._activeBindings[command.id].keyBinding) {
							keyBinding = self._activeBindings[command.id];
							if (enabled) {
								keyBinding.invocation = invocation;
							} else {
								keyBinding.invocation = null;
							}
							// if it is a binding only, don't render the command.
							if (keyBinding.bindingOnly) {
								render = false;
							}
						}
						
						// same for url bindings
						if (self._urlBindings[command.id] && self._urlBindings[command.id].urlBinding) {
							urlBinding = self._urlBindings[command.id];
							if (enabled) {
								urlBinding.invocation = invocation;
							} else {
								urlBinding.invocation = null;
							}
							if (urlBinding.bindingOnly) {
								render = false;
							}
						}
						render = render && enabled;
					}
					if (render) {
						if (command.choiceCallback) {
							// special case.  The item wants to provide a set of choices
							var menuParent;
							var nested;
							if (renderType === "tool" || renderType === "button") { //$NON-NLS-1$ //$NON-NLS-0$
								menuParent = parent;
								nested = false;
								if (parent.nodeName.toLowerCase() === "ul") { //$NON-NLS-0$
									menuParent = document.createElement("li"); //$NON-NLS-0$
									lib.setSafeAttribute(menuParent, "role", "none");
									parent.appendChild(menuParent);
								}
							} else {
								menuParent = parent;
								nested = true;
							}
							// dropdown button
							var populateFunction = function(menu) {
								command.populateChoicesMenu(menu, items, handler, userData, self);
							};
							self._createDropdownMenu(menuParent, command.name, nested, populateFunction.bind(command), command.imageClass, command.tooltip || command.title, command.selectionClass, command.positioningNode);
						} else {
							// Rendering atomic commands as buttons or menus
							invocation.handler = invocation.handler || this;
							invocation.domParent = parent;
							var element;
							/**
							 * @callback
							 */
							var onClick = function(e) {
								self._invoke(invocation);
							};
							if (renderType === "menu") {
								var bindingString = null;
								if (keyBinding && keyBinding.keyBinding) {
									bindingString = UIUtil.getUserKeyString(keyBinding.keyBinding);
								}
								element = Commands.createCommandMenuItem(parent, command, invocation, null, onClick, bindingString);
								
								// Register this command as being rendered (do we want to register all the commands ?)
								invocation.onClick = onClick;  // cache the handler
								self._registerRenderedCommand(command.id, scopeId, invocation);
							} else if (renderType === "quickfix") {
								id = renderType + command.id + index; // using the index ensures unique ids within the DOM when a command repeats for each item
								parent.classList.add('quickFixList'); //$NON-NLS-1$
								var QUICKFIX_ID = 'quickfixDetails'; //$NON-NLS-1$
								var quickfixDetails = parent.childNodes.item(QUICKFIX_ID);
								if (command.id === 'ignore.in.file.fix' || command.id === 'css.ignore.on-line.fix'){
									if (!quickfixDetails){
										quickfixDetails = document.createElement("div");
										quickfixDetails.id = QUICKFIX_ID;
										parent.appendChild(quickfixDetails);
									}
									element = Commands.createQuickfixItem(quickfixDetails, command, invocation, onClick, self._prefService);
								} else {
									var commandDiv = document.createElement("div");
									if (quickfixDetails){
										parent.insertBefore(commandDiv, quickfixDetails);
									} else {
										parent.appendChild(commandDiv);
									}
									element = Commands.createQuickfixItem(commandDiv, command, invocation, onClick, self._prefService);
								}
							} else {
								id = renderType + command.id + index;  // // using the index ensures unique ids within the DOM when a command repeats for each item
								element = Commands.createCommandItem(parent, command, invocation, id, null, renderType === "tool", onClick);
							}
							mNavUtils.generateNavGrid(domNodeWrapperList, element, null, null, true);
							invocation.domNode = element;
							index++;
						}
					} 
				}
			});
		},
		
		/*
		 * private.  Parent must exist in the DOM.
		 */
		_createDropdownMenu: function(parent, name, nested, populateFunction, icon, tooltip, selectionClass, positioningNode, defaultInvocation, pretendDefaultActionId, extraClasses) {
			parent = lib.node(parent);
			// We create dropdowns asynchronously so it's possible that the parent has been removed from the document 
			// by the time we are called.  If so, don't bother building a submenu for an orphaned menu.
			if (!parent || !lib.contains(document.body, parent)) {
				return null;
			}
			var menuButton, newMenu, dropdownArrow;
			var destroyButton, menuParent = parent;
			if (nested) {
				var range = document.createRange();
				range.selectNode(parent);
				var buttonFragment = range.createContextualFragment(SubMenuButtonFragment);
				// bind name to fragment variable
				lib.processTextNodes(buttonFragment, {ButtonText: name});
				parent.appendChild(buttonFragment);
				destroyButton = parent.lastChild;
				newMenu = destroyButton.lastChild;
				menuButton = newMenu.previousSibling;
				menuButton.dropdown = new mDropdown.Dropdown({dropdown: newMenu, name: name, populate: populateFunction, parentDropdown: parent.dropdown});
				newMenu.dropdown = menuButton.dropdown;
			} else {
				if (parent.nodeName.toLowerCase() === "ul") { //$NON-NLS-0$
					menuParent = document.createElement("li"); //$NON-NLS-0$
					lib.setSafeAttribute(menuParent, "role", "none");
					parent.appendChild(menuParent);
					destroyButton = menuParent;
				}
				var buttonCss = null;
				if (icon) {
					buttonCss = "dropdownButtonWithIcon"; //$NON-NLS-0$ // This class distinguishes dropdown buttons with an icon from those without
					tooltip = tooltip || name; // No text and no tooltip => fallback to name
				}
				tooltip = icon ? (tooltip || name) : tooltip;
				var created = Commands.createDropdownMenu(menuParent, name, populateFunction, buttonCss, icon, false, selectionClass, positioningNode, defaultInvocation || pretendDefaultActionId, extraClasses);
				dropdownArrow = created.dropdownArrow;
				menuButton = created.menuButton;
				if (dropdownArrow) {
					if (defaultInvocation) {
						defaultInvocation.domNode = created.menuButton;
					}
					var self = this;
					menuButton.onclick = function(evt){
						var bounds = lib.bounds(dropdownArrow);
						if ((evt.clientX >= bounds.left || pretendDefaultActionId === true) && created.dropdown) {
							created.dropdown.toggle(evt);
						} else {
							self._invoke(defaultInvocation);
						}
					};
					if (created.dropdown) {
						menuButton.onkeydown = function(evt) {
							if (lib.KEY.DOWN === evt.keyCode) {
								created.dropdown.toggle(evt);
								lib.stop(evt);
							}
						};
					}
				}
				newMenu = created.menu;
				var tooltipText, hasDefault = defaultInvocation && defaultInvocation.command && (defaultInvocation.command.tooltip || defaultInvocation.command.name);
				if (hasDefault) {
					tooltipText = defaultInvocation.command.tooltip || defaultInvocation.command.name;
				} else {
					tooltipText = tooltip;
				}
				if (tooltipText) {
					menuButton.commandTooltip = new mTooltip.Tooltip({
						node: menuButton,
						text: tooltipText,
						position: ["above", "below", "right", "left"] //$NON-NLS-3$ //$NON-NLS-2$ //$NON-NLS-1$ //$NON-NLS-0$
					});					
				}
			}
			
			return {menuButton: menuButton, menu: newMenu, dropdown: menuButton.dropdown, destroyButton: destroyButton, dropdownArrow: dropdownArrow};
		},
		
		_generateMenuSeparator: function(dropdown) {
			if (!this._checkForTrailingSeparator(dropdown, "menu")) { //$NON-NLS-0$
				var item = document.createElement("li"); //$NON-NLS-0$
				item.classList.add("dropdownSeparator"); //$NON-NLS-0$
				lib.setSafeAttribute(item, "role", "none");
				var sep = document.createElement("span"); //$NON-NLS-0$
				sep.classList.add("dropdownSeparator"); //$NON-NLS-0$
				lib.setSafeAttribute(sep, "role", "separator");
				item.appendChild(sep);
				dropdown.appendChild(item);
			}
		},
		
				
		/**
		 * Add a dom node appropriate for using a separator between different groups
		 * of commands.  This function is useful when a page is precisely arranging groups of commands
		 * (in a table or contiguous spans) and needs to use the same separator that the command registry
		 * would use when rendering different groups of commands.
		 * @param {DOMElement} parent
		 */
		generateSeparatorImage: function(parent) {
			var sep;
			if (parent.nodeName.toLowerCase() === "ul") { //$NON-NLS-0$
				sep = document.createElement("li"); //$NON-NLS-0$
				lib.setSafeAttribute(sep, "role", "none");
				parent.appendChild(sep);
			} else {
				sep = document.createElement("span"); //$NON-NLS-0$
				parent.appendChild(sep);
			}
			sep.classList.add("core-sprite-sep");  // location in sprite //$NON-NLS-0$
			sep.classList.add("imageSprite");  // sets sprite background //$NON-NLS-0$
			sep.classList.add("commandSeparator"); //$NON-NLS-0$
			return sep;
		}

	};  // end command registry prototype
	CommandRegistry.prototype.constructor = CommandRegistry;

	/**
	 * A URL binding defines how a URL token is bound to a command, and what parameter
	 * is provided
	 * @param {String} token the token in a URL query parameter that identifies the command
	 * @param {String} parameterName the name of the parameter being specified in the value of the query 
	 * 
	 * @name orion.commands.URLBinding
	 * @class
	 */
	function URLBinding (token, parameterName) {
		this.token = token;
		this.parameterName = parameterName;
	}
	URLBinding.prototype = /** @lends orion.commands.URLBinding.prototype */ {
		/**
		 * Returns whether this URL binding matches the given URL
		 * 
		 * @param url the URL.
		 * @returns {Boolean} whether this URL binding matches
		 */
		match: function (url) {
			//ensure this is only the hash portion
			var params = PageUtil.matchResourceParameters(url);
			if (typeof params[this.token] !== "undefined") { //$NON-NLS-0$
				this.parameterValue = params[this.token];
				return this;
			}
			return null;
		}
	};
	URLBinding.prototype.constructor = URLBinding;
	
	/**
	 * A CommandEventListener defines an (optional) UI event listener.
	 * 
	 * @param {String} name the name of the event
	 * @param {Function} handler the event handler function. The handler is provided two parameters on invocation, i. e.
	 * 			the DOM event and the undergoing commandInvocation objects.
	 * @param {Boolean} [capture] the (optional) flag used to determine whether to capture the event or not
	 */
	function CommandEventListener (event, handler, capture) {
		this.event = event;
		this.handler = handler;
		this.capture = capture || false;
	}
	CommandEventListener.prototype.constructor = CommandEventListener;
	
	
	/**
	 * A CommandParameter defines a parameter that is required by a command.
	 *
	 * @param {String} name the name of the parameter
	 * @param {String} type the type of the parameter, one of the HTML5 input types, or "boolean"
	 * @param {String} [label] the (optional) label that should be used when showing the parameter
	 * @param {String} [value] the (optional) default value for the parameter
	 * @param {Number} [lines] the (optional) number of lines that should be shown when collecting the value.  Valid for type "text" only.
	 * @param {Object|Array} [eventListeners] the (optional) array or single command event listener
	 * @param {Function} [validator] a (optional) validator function
	 * 
	 * @name orion.commands.CommandParameter
	 * @class
	 */
	function CommandParameter (name, type, label, value, lines, eventListeners, validator) {
		this.name = name;
		this.type = type;
		this.label = label;
		this.value = value;
		this.lines = lines || 1;
		this.validator = validator;
		
		this.eventListeners = (Array.isArray(eventListeners)) ?
			eventListeners : (eventListeners ? [eventListeners] : []);
	}
	CommandParameter.prototype = /** @lends orion.commands.CommandParameter.prototype */ {
		/**
		 * Returns whether the user has requested to assign values to optional parameters
		 * 
		 * @returns {Boolean} whether the user has requested optional parameters
		 */
		optionsRequested: function () {
			return this.optionsRequested;
		}
	};
	CommandParameter.prototype.constructor = CommandParameter;
	
	/**
	 * A ParametersDescription defines the parameters required by a command, and whether there are additional
	 * optional parameters that can be specified.  The command registry will attempt to collect required parameters
	 * before calling a command callback.  The command is expected to provide UI for optional parameter, when the user has
	 * signaled a desire to provide optional information.
	 *
	 * @param {orion.commands.CommandParameter[]} parameters an array of CommandParameters that are required
	 * @param {Object} options The parameters description options object.
	 * @param {Boolean} options.hasOptionalParameters specifies whether there are additional optional parameters
	 *			that could be collected.  If true, then the collector will show an affordance for invoking an 
	 *			additional options collector and the client can use the optionsRequested flag to determine whether
	 *			additional parameters should be shown.  Default is false.
	 * @param {Boolean} options.clientCollect specifies whether the client will collect the parameters in its
	 *			callback.  Default is false, which means the callback will not be called until an attempt has
	 *			been made to collect parameters.
	 * @param {Function} options.getParameterElement a function used to look up the DOM element for a given parameter.
	 * @param {Function} options.getSubmitName a function used to return a name to use for the Submit button.
	 *
	 * @param {Function} [getParameters] a function used to define the parameters just before the command is invoked.  This is used
	 *			when a particular invocation of the command will change the parameters. The function will be passed
	 *          the CommandInvocation as a parameter. Any stored parameters will be ignored, and
	 *          replaced with those returned by this function. If no parameters (empty array or <code>null</code>) are returned,
	 *          then it is assumed that the command should not try to obtain parameters before invoking the command's callback
	 *          (similar to <code>options.clientCollect === true</code>).
	 * @name orion.commands.ParametersDescription
	 * @class
	 */
	function ParametersDescription (parameters, options, getParameters) {
		this._storeParameters(parameters);
		this._hasOptionalParameters = options && options.hasOptionalParameters;
		this._options = options;  // saved for making a copy
		this.optionsRequested = false;
		this.getParameters = getParameters;
		this.clientCollect = options && options.clientCollect;
		this.getParameterElement = options && options.getParameterElement;
		this.getSubmitName = options && options.getSubmitName;
		this.getCancelName = options && options.getCancelName;
		this.message = options && options.message;
	}
	ParametersDescription.prototype = /** @lends orion.commands.ParametersDescription.prototype */ {	
	
		_storeParameters: function(parameterArray) {
			this.parameterTable = null;
			if (parameterArray) {
				var table = this.parameterTable = {};
				parameterArray.forEach(function(parameter) {
					table[parameter.name] = parameter;
				});
			}
		},
		
		/**
		 * Update the stored parameters by running the stored function if one has been supplied.
		 */
		updateParameters: function(commandInvocation) {
			if (typeof this.getParameters === "function") { //$NON-NLS-0$
				this._storeParameters(this.getParameters(commandInvocation));
			}
		},
		
		/**
		 * Returns a boolean indicating whether any parameters have been specified.
		 *
		 * @returns {Boolean} whether there are parameters to collect.
		 */
		hasParameters: function() {
			return this.parameterTable !== null;
		},
		
		/**
		 * Returns a boolean indicating whether a collector should try to collect parameters.  If there
		 * are no parameters specified, or the client is expecting to collect them, this will return
		 * <code>false</code>.
		 *
		 * @returns {Boolean} indicating whether the caller should attempt to collect the parameters.
		 */
		shouldCollectParameters: function() {
			return !this.clientCollect && this.hasParameters();
		},
				
		/**
		 * Returns the CommandParameter with the given name, or <code>null</code> if there is no parameter
		 * by that name.
		 *
		 * @param {String} name the name of the parameter
		 * @returns {orion.commands.CommandParameter} the parameter with the given name
		*/
		parameterNamed: function(name) {
			return this.parameterTable[name];
		},
		
		/**
		 * Returns the value of the parameter with the given name, or <code>null</code> if there is no parameter
		 * by that name, or no value for that parameter.
		 *
		 * @param {String} name the name of the parameter
		 * @returns {String} the value of the parameter with the given name
		 */
		valueFor: function(name) {
			var parm = this.parameterTable[name];
			if (parm) {
				return parm.value;
			}
			return null;
		},
		
		/**
		 * Sets the value of the parameter with the given name.
		 *
		 * @param {String} name the name of the parameter
		 * @param {String} value the value of the parameter with the given name
		 */
		setValue: function(name, value) {
			var parm = this.parameterTable[name];
			if (parm) {
				parm.value = value;
			}
		},
		 
		/**
		 * Evaluate the specified function for each parameter.
		 *
		 * @param {Function} func a function which operates on a provided command parameter
		 *
		 */
		forEach: function(func) {
			for (var key in this.parameterTable) {
				if (this.parameterTable[key].type && this.parameterTable[key].name) {
					func(this.parameterTable[key]);
				}
			}
		},
		
		validate: function(name, value) {
			var parm = this.parameterTable[name];
			if (parm && parm.validator) {
				return parm.validator(value);
			}
			return true;
		},
		
		/**
		 * Make a copy of this description.  Used for collecting values when a client doesn't want
		 * the values to be persisted across different objects.
		 *
		 */
		 makeCopy: function() {
			var parameters = [];
			this.forEach(function(parm) {
				var newParm = new CommandParameter(parm.name, parm.type, parm.label, parm.value, parm.lines, parm.eventListeners, parm.validator);
				parameters.push(newParm);
			});
			var copy = new ParametersDescription(parameters, this._options, this.getParameters);
			// this value may have changed since the options
			copy.clientCollect = this.clientCollect;
			copy.message = this.message;
			return copy;
			
		 },
		 /**
		  * Return a boolean indicating whether additional optional parameters are available.
		  */
		 hasOptionalParameters: function() {
			return this._hasOptionalParameters;
		 }
	};
	ParametersDescription.prototype.constructor = ParametersDescription;

	//return the module exports
	return {
		CommandRegistry: CommandRegistry,
		URLBinding: URLBinding,
		ParametersDescription: ParametersDescription,
		CommandParameter: CommandParameter,
		CommandEventListener: CommandEventListener
	};
});
