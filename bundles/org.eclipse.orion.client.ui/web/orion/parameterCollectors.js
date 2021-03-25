/*******************************************************************************
 * @license
 * Copyright (c) 2011, 2019 IBM Corporation and others.
 * All rights reserved. This program and the accompanying materials are made 
 * available under the terms of the Eclipse Public License 2.0 
 * (http://www.eclipse.org/legal/epl-v10.html), and the Eclipse Distribution 
 * License v1.0 (http://www.eclipse.org/org/documents/edl-v10.html). 
 *
 * Contributors:
 *     IBM Corporation - initial API and implementation
 *******************************************************************************/
/*eslint-env browser, amd*/

define(['i18n!orion/nls/messages', 'orion/webui/littlelib', 'orion/bidiUtils', 'orion/bidiFormat', 'orion/webui/tooltip'], 
        function(messages, lib, bidiUtils, bidiFormat, mTooltip) {

	
	/**
	 * Constructs a new command parameter collector.
	 * @name orion.parametercollectors.CommandParameterCollector
	 * @class <code>CommandParameterCollector</code> can collect parameters in a way that is integrated with the common 
	 * header elements of pages or sections.
	 * @param {Function} getElementsFunction
	 * @param {Function} toolbarLayoutFunction
	 * @extends orion.commandregistry.ParameterCollector
	 * @borrows orion.commandregistry.ParameterCollector#close as #close
	 * @borrows orion.commandregistry.ParameterCollector#collectParameters as #collectParameters
	 * @borrows orion.commandregistry.ParameterCollector#getFillFunction as #getFillFunction
	 * @borrows orion.commandregistry.ParameterCollector#open as #open
	 */	
	function CommandParameterCollector (getElementsFunction, toolbarLayoutFunction) {
		this._activeContainer = null;
		this._getElementsFunction = getElementsFunction;
		this._toolbarLayoutFunction = toolbarLayoutFunction;
	}
	
	CommandParameterCollector.prototype = /** @lends orion.parametercollectors.CommandParameterCollector.prototype */ {
	
		close: function () {
			if (this._activeElements) {
				lib.returnFocus(this._activeElements.slideContainer, this._oldFocusNode, function() {
					if (this._activeElements.parameterArea) {
						lib.empty(this._activeElements.parameterArea);
					}
					if (this._activeElements.slideContainer) {
						this._activeElements.slideContainer.classList.remove("slideContainerActive"); //$NON-NLS-0$
					}
					if (this._activeElements.dismissArea) {
						 lib.empty(this._activeElements.dismissArea);
					}
					if (this._activeElements.commandNode) {
						this._activeElements.commandNode.classList.remove("activeCommand"); //$NON-NLS-0$
					}
					if (this._activeElements.closeTooltip) {
			            this._activeElements.closeTooltip.destroy();
			            this._activeElements.closeTooltip = null;
			        }
					this._toolbarLayoutFunction(this._activeElements);
					if (this._activeElements.onClose) {
						this._activeElements.onClose();
					}
					if (this._oldFocusNode) {
						this._oldFocusNode = null;
					}
				}.bind(this));
			}
			this._activeElements = null;
		},
		
		open: function(commandNode, fillFunction, onClose, name) {
			if (typeof commandNode === "string") { //$NON-NLS-0$
				commandNode = lib.node(commandNode);
			}
			if (this._activeElements && this._activeElements.slideContainer && this._activeElements.commandNode === commandNode) {
				// already open.  Just return focus where it needs to be.
				if (this._activeElements.focusNode) {
					this._activeElements.focusNode.focus();
				}
				return true;
			}
			this.close();
			this._activeElements = null;
			// determine the closest parameter container to the command.
			this._activeElements = this._getElementsFunction(commandNode);
			if (this._activeElements && this._activeElements.parameterArea && this._activeElements.slideContainer) {
				this._activeElements.onClose = onClose;
				var focusNode = fillFunction(this._activeElements.parameterArea, this._activeElements.dismissArea, this._activeElements.slideContainer);
				if (!focusNode) {
					// no parameters were generated.  
					return false;
				}
				this._activeElements.focusNode = focusNode;
				var self = this;
				var close = lib.$$array("#closebox", this._activeElements.dismissArea || this._activeElements.parameterArea); //$NON-NLS-0$
				if (close.length === 0) {
					// add the close button if the fill function did not.
					var dismiss = this._activeElements.dismissArea || this._activeElements.parameterArea;
					close = document.createElement("button"); //$NON-NLS-0$
					close.id = "closebox"; //$NON-NLS-0$
					close.className ="imageSprite core-sprite-close dismissButton"; //$NON-NLS-0$
					lib.setSafeAttribute(close, "aria-label", messages['Close']);
					this._activeElements.closeTooltip = new mTooltip.Tooltip({
							node: close,
							text: messages['Close'],
							position: ["right", "below", "above", "left"] //$NON-NLS-3$ //$NON-NLS-2$ //$NON-NLS-1$ //$NON-NLS-0$
					});
					dismiss.appendChild(close);
					close.addEventListener("click", function(event) { //$NON-NLS-0$
						self.close();
					}, false);
				}
				// ESC closes slideout if it has focus
				this._activeElements.slideContainer.tabIndex = -1;
				this._activeElements.slideContainer.style.outline = "none";
				
				// all parameters have been generated.  Activate the area.
				lib.setSafeAttribute(this._activeElements.slideContainer, "role", "dialog");
				if (name) {
					lib.setSafeAttribute(this._activeElements.slideContainer, "aria-label", name);
				}
				this._activeElements.slideContainer.classList.add("slideContainerActive"); //$NON-NLS-0$
				this._toolbarLayoutFunction(this._activeElements);

				if (focusNode) {
					this._oldFocusNode = window.document.activeElement;
					var slideContainer = this._activeElements.slideContainer;
					window.setTimeout(function() {
						focusNode.focus();
						if (focusNode.select) {
							focusNode.select();
						}
						lib.trapTabs(slideContainer);
					}, 0);
				}
				if (this._activeElements.commandNode) {
					this._activeElements.commandNode.classList.add("activeCommand"); //$NON-NLS-0$
				}
				return true;
			}
			return false;
		},
		
		_collectAndCall: function(commandInvocation, parent) {
			var validate = function(name, value, node) {
				if (commandInvocation.parameters.validate(name, value)) {
					commandInvocation.parameters.setValue(name, value);
					return true;
				}
				node.classList.add("parameterInvalid");
				return false;
			};
			
			var isValid = function(field) { //$NON-NLS-0$
				if (field.type === "checkbox") { //$NON-NLS-0$
					if (!validate(field.parameterName, field.checked, field)) {
						return true;
					}
				} else if (field.type === "url" && field.nodeName === "DIV") { //$NON-NLS-0$
					if (!validate(field.parameterName, field.textContent.trim(), field)) {
						return true;
					}
				} else if (field.type !== "button") { //$NON-NLS-0$
					if (!validate(field.parameterName, field.value.trim(), field)) {
						return true;
					}
				} else if (field.type !== "textarea") { //$NON-NLS-0$
					if (!validate(field.parameterName, field.value.trim(), field)) {
						return true;
					}
				}
				return false;
			};

			if (lib.$$array("input", parent).some(isValid)) {  //$NON-NLS-0$
				return false;
			}
			
			if (lib.$$array("textArea", parent).some(isValid)) {  //$NON-NLS-0$
				return false;
			}
			
			if (lib.$$array("div[contenteditable=true]", parent).some(isValid)) {  //$NON-NLS-0$
				return false;
			}
			
			var getParameterElement = commandInvocation.parameters.getParameterElement;
			if (getParameterElement) {
				if (commandInvocation.parameters.some(function(param) {
					var field = getParameterElement(param, parent);
					if (field) {
						return isValid(field);
					}
					return false;
				})) {
					return false;
				}
			}
			if (commandInvocation.command.callback) {
				commandInvocation.command.callback.call(commandInvocation.handler, commandInvocation);
			}
			return true;
		},
		
		collectParameters: function(commandInvocation, cancelCallback, name) {
			if (commandInvocation.parameters) {
				if (commandInvocation.domNode) {
					commandInvocation.domNode.classList.add("commandMarker"); //$NON-NLS-0$
				}
				return this.open(commandInvocation.domNode || commandInvocation.domParent, this.getFillFunction(commandInvocation,null,cancelCallback), null, name);
			}
			return false;
		},
		
		getFillFunction: function(commandInvocation, closeFunction, cancelFunction) {
			var self = this;
			return function(parameterArea, dismissArea, containerArea) {
				var first = null;
				var localClose = function() {
					if (closeFunction) {
						closeFunction();
					}
					self.close();
				};
				var keyHandler = function(event) {
					event.target.classList.remove("parameterInvalid");  //$NON-NLS-0$
					if (event.keyCode === lib.KEY.ENTER && event.target.tagName !== "TEXTAREA") {  //$NON-NLS-0$
							self._collectAndCall(commandInvocation, parameterArea);
							localClose();
							lib.stop(event);
					}
					if (event.keyCode === lib.KEY.ESCAPE) {
						if (typeof(cancelFunction) === 'function') cancelFunction();
						localClose();
						lib.stop(event);
					}
				};
				
				if (containerArea) {
					containerArea.addEventListener("keydown", function(event) { //$NON-NLS-0$
						if (event.keyCode === lib.KEY.ESCAPE) {
							if (typeof(cancelFunction) === 'function') cancelFunction(); //$NON-NLS-0$
							localClose();
							lib.stop(event);
						}
					}, false);
				}

				var makeButton = function(text, parent) {
					var button = document.createElement("button"); //$NON-NLS-0$
					parent.appendChild(button);
					if (text) {
						button.appendChild(document.createTextNode(text)); //$NON-NLS-0$
					}
					button.classList.add("dismissButton"); //$NON-NLS-0$
					return button;
				};

				var parameters = commandInvocation.parameters;
				
				if (parameters.message) {
					var label = document.createElement("div"); //$NON-NLS-0$
					label.classList.add("parameterMessage"); //$NON-NLS-0$
					label.textContent = typeof parameters.message === "function" ? parameters.message(commandInvocation) : parameters.message;
					parameterArea.appendChild(label);
				}
				
				parameters.forEach(function(parm) {
					var field = parameters.getParameterElement ? parameters.getParameterElement(parm, parameterArea) : null;
					var label = null;
					if (!field && parm.label) {
						label = document.createElement("label"); //$NON-NLS-0$
						label.classList.add("parameterInput"); //$NON-NLS-0$
						lib.setSafeAttribute(label, "for", parm.name + "parameterCollector");
						if (parm.type !== "boolean") {
							label.textContent = parm.label;
						}
						parameterArea.appendChild(label);
					} 
					var type = parm.type;
					var id = parm.name + "parameterCollector"; //$NON-NLS-0$
					var parent = label || parameterArea;
					if (type === "text" && typeof(parm.lines) === "number" && parm.lines > 1) { //$NON-NLS-1$ //$NON-NLS-0$
						if (!field) {
							field = document.createElement("textarea"); //$NON-NLS-0$
							field.rows = parm.lines;
							field.type = "textarea"; //$NON-NLS-0$
							field.id = id;							
							parent.appendChild(field);
						}
						bidiUtils.initInputField(field);
					} else if (parm.type === "boolean") { //$NON-NLS-0$
						if (!field) {
							field = document.createElement("input"); //$NON-NLS-0$
							field.type = "checkbox"; //$NON-NLS-0$
							field.id = id;
							
							parent.appendChild(field);
						}
						if (parm.value) {
							field.checked = true;
						}
					} else if (parm.type === "button") { //$NON-NLS-0$
						if (!field) {
							field = makeButton(parm.value || "", parent);
							field.id = id;
						} else {
							if (parm.value) {
								field.value = parm.value;
							}
						}
					} else {
						var isSTT = (bidiUtils.isBidiEnabled() && parm.type === "url"); //$NON-NLS-0$
						if (!field) {
							field = (!isSTT ? document.createElement("input") : document.createElement("div")); //$NON-NLS-0$
							field.type = parm.type;
							field.id = id;
							if (isSTT) {
								field.contentEditable = true;							
							}
							parent.appendChild(field);
						}
						if (parm.value) {
							if (!isSTT) {
								field.value = parm.value;
							} else {
								lib.setSafeInnerHTML(field, bidiFormat.getHtml(parm.value, "url", {}, false, "en"));							
							}
						}					
						(!isSTT ? bidiUtils.initInputField(field) : bidiFormat.attach(field, "url", {}, false, "en"));
					}
					if (label && parm.type === "boolean") {
						// label text goes after checkbox
						label.appendChild(document.createTextNode(parm.label));
					}
					field.classList.add("parameterInput"); //$NON-NLS-0$
					// for fun
					lib.setSafeAttribute(field, "speech", "speech");
					lib.setSafeAttribute(field, "x-webkit-speech", "x-webkit-speech");
					field.parameterName = parm.name;
					if (!first) {
						first = field;
					}
					
					// for more fun
					if(parm.eventListeners.length > 0){
						parm.eventListeners.forEach(function(listener){
							field.addEventListener(listener.event, function(evt){
								return listener.handler(evt, commandInvocation);
							}, listener.capture);
						});
					}
					
					field.addEventListener("keydown", keyHandler, false); //$NON-NLS-0$
				});
				var parentDismiss = dismissArea;
				if (!parentDismiss) {
					parentDismiss = document.createElement("span"); //$NON-NLS-0$
					parentDismiss.classList.add("layoutRight"); //$NON-NLS-0$
					parentDismiss.classList.add("parametersDismiss"); //$NON-NLS-0$
					parameterArea.appendChild(parentDismiss);
				}
				var finish = function (collector) {
					if (collector._collectAndCall(commandInvocation, parameterArea)) {
						localClose();
					}
				};
				
				if (commandInvocation.parameters.hasOptionalParameters()) {
					commandInvocation.parameters.optionsRequested = false;
					
					var options = makeButton(messages["More"], parentDismiss); //$NON-NLS-0$
					options.addEventListener("click", function() { //$NON-NLS-0$
						commandInvocation.parameters.optionsRequested = true;
						finish(self);
					}, false);
				}
				// OK and cancel buttons
				var ok = makeButton(parameters.getSubmitName ? parameters.getSubmitName(commandInvocation) : messages["Submit"], parentDismiss);
					ok.addEventListener("click", function() { //$NON-NLS-0$
					finish(self);
				}, false);
				ok.addEventListener("keydown", keyHandler);
				
				var name = parameters.getCancelName ? parameters.getCancelName(commandInvocation) : null;
				var close = makeButton(name, parentDismiss);
				close.id = "closebox"; //$NON-NLS-0$
				if (!name) {				
					close.classList.add("imageSprite"); //$NON-NLS-0$
					close.classList.add("core-sprite-close"); //$NON-NLS-0$
					lib.setSafeAttribute(close, "aria-label", messages['Close']);
					self._activeElements.closeTooltip = new mTooltip.Tooltip({
							node: close,
							text: messages['Close'],
							position: ["right", "below", "above", "left"] //$NON-NLS-3$ //$NON-NLS-2$ //$NON-NLS-1$ //$NON-NLS-0$
					});
				}
				close.addEventListener("click", function(event) { //$NON-NLS-0$
					localClose();
					if (typeof(cancelFunction) === 'function') cancelFunction();
				}, false);
				close.addEventListener("keydown", keyHandler);
				return first;
			};
		 }
	};
	CommandParameterCollector.prototype.constructor = CommandParameterCollector;
	
	//return the module exports
	return {
		CommandParameterCollector: CommandParameterCollector
	};
});
