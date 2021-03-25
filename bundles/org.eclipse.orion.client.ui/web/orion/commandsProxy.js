/*******************************************************************************
 * @license
 * Copyright (c) 2010,2012 IBM Corporation and others.
 * All rights reserved. This program and the accompanying materials are made 
 * available under the terms of the Eclipse Public License 2.0 
 * (http://www.eclipse.org/legal/epl-v10.html), and the Eclipse Distribution 
 * License v1.0 (http://www.eclipse.org/org/documents/edl-v10.html). 
 * 
 * Contributors: IBM Corporation - initial API and implementation
 ******************************************************************************/
/*eslint-env browser, amd*/
 
define([
	'orion/util',
	'orion/webui/littlelib'
], function(util, lib) {
	
	function handleKeyEvent(evt, processKeyFunc) {
		function isContentKey(e) {
			// adapted from handleKey in http://git.eclipse.org/c/platform/eclipse.platform.swt.git/plain/bundles/org.eclipse.swt/Eclipse%20SWT%20Custom%20Widgets/common/org/eclipse/swt/custom/StyledText.java
			if (util.isMac) {
				// COMMAND+ALT combinations produce characters on the mac, but COMMAND or COMMAND+SHIFT do not.
				if (e.metaKey && !e.altKey) {  //command without alt
					// see https://bugs.eclipse.org/bugs/show_bug.cgi?id=390341
					// special case for select all, cut, copy, paste, and undo.  A slippery slope...
					if (!e.shiftKey && !e.ctrlKey && (e.keyCode === 65 || e.keyCode === 67 || e.keyCode === 86 || e.keyCode === 88 || e.keyCode === 90)) {
						return true;
					}
					return false;
				}
				if (e.ctrlKey) {
					return false;
				}
			} else {
				// CTRL or ALT combinations are not characters, however both of them together (CTRL+ALT)
				// are the Alt Gr key on some keyboards.  See Eclipse bug 20953. If together, they might
				// be a character. However there aren't usually any commands associated with Alt Gr keys.
				if (e.ctrlKey && !e.altKey) {
					// special case for select all, cut, copy, paste, and undo.  
					if (!e.shiftKey && (e.keyCode === 65 || e.keyCode === 67 || e.keyCode === 86 || e.keyCode === 88 || e.keyCode === 90)) {
						return true;
					}
					return false;
				}
				if (e.altKey && !e.ctrlKey) {
					return false;
				}
				if (e.ctrlKey && e.altKey){
					return false;
				}
			}
			if (e['char']) { //$NON-NLS-0$
				return e['char'].length > 0;  // empty string for non characters //$NON-NLS-0$
			} else if (e.charCode || e.keyCode) {
				var keyCode= e.charCode || e.keyCode;
				// anything below SPACE is not a character except for line delimiter keys, tab, and delete.
				switch (keyCode) {
					case 8:  // backspace
					case 9:  // tab
					case 13: // enter
					case 46: // delete
						return true;
					default:
						return (keyCode >= 32 && keyCode < 112) || // space key and above until function keys
							keyCode > 123; // above function keys  
				}
			}
			// If we can't identify as a character, assume it's not
			return false;
		}
		
		evt = evt || window.event;
		if (isContentKey(evt)) {
			// bindings that are text content keys are ignored if we are in a text field or editor
			// see https://bugs.eclipse.org/bugs/show_bug.cgi?id=375058
			if (evt.target.contentEditable === "true") { //$NON-NLS-0$
				return;
			}
			var tagType = evt.target.nodeName.toLowerCase();
			if (tagType === 'input') { //$NON-NLS-0$
				var inputType = evt.target.type.toLowerCase();
				// Any HTML5 input type that involves typing text should be ignored
				switch (inputType) {
					case "text": //$NON-NLS-0$
					case "password": //$NON-NLS-0$
					case "search": //$NON-NLS-0$
					case "color": //$NON-NLS-0$
					case "date": //$NON-NLS-0$
					case "datetime": //$NON-NLS-0$
					case "datetime-local": //$NON-NLS-0$
					case "email": //$NON-NLS-0$
					case "month": //$NON-NLS-0$
					case "number": //$NON-NLS-0$
					case "range": //$NON-NLS-0$
					case "tel": //$NON-NLS-0$
					case "time": //$NON-NLS-0$
					case "url": //$NON-NLS-0$
					case "week": //$NON-NLS-0$
						return;
				}
			} else if (tagType === 'textarea') { //$NON-NLS-0$
				return;
			}
		}
		processKeyFunc(evt);
	}
		
	function CommandsProxy() {
		this._init();
	}
	CommandsProxy.prototype = {
		destroy: function() {
			if (this._listener) {
				document.removeEventListener("keydown", this._listener); //$NON-NLS-0$
				this._listener = null;
			}
		},
		setProxy: function(proxy) {
			this.proxy = proxy;
		},
		setKeyBindings: function(bindings) {
			this.bindings = bindings;
		},
		_init: function() {
			var self = this;
			document.addEventListener("keydown", this._listener = function(evt) { //$NON-NLS-0$
				return handleKeyEvent(evt, function(evt) {
					var proxy = self.proxy;
					var bindings = self.bindings;
					if (!bindings || !proxy) {
						return;
					}
					for (var i=0; i<bindings.length; i++) {
						if (bindings[i].match(evt)) {
							proxy.processKey({
								type: evt.type,
								keyCode: evt.keyCode,
								altKey: evt.altKey,
								ctrlKey: evt.ctrlKey,
								metaKey: evt.metaKey,
								shiftKey: evt.shiftKey
							});
							lib.stop(evt);
						}
					}
				});
			});
		}
	};
	
	//return the module exports
	return {
		handleKeyEvent: handleKeyEvent,
		CommandsProxy: CommandsProxy
	};
});
