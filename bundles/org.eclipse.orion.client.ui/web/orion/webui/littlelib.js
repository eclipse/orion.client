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
define(["orion/util"], function(util) {
	/**
	 * @name orion.webui.littlelib
	 * @class A small library of DOM and UI helpers.
	 */

	/**
	 * Holds useful <code>keyCode</code> values.
	 * @name orion.webui.littlelib.KEY
	 * @static
	 */
	var KEY = {
		BKSPC: 8,
		TAB: 9,
		ENTER: 13,
		SHIFT: 16,
		CONTROL: 17,
		ALT: 18,
		ESCAPE: 27,
		SPACE: 32,
		PAGEUP: 33,
		PAGEDOWN: 34,
		END: 35,
		HOME: 36,
		LEFT: 37,
		UP: 38,
		RIGHT: 39,
		DOWN: 40,
		INSERT: 45,
		DEL: 46,
		COMMAND: 91
	};

	/**
	 * Alias for <code>node.querySelector()</code>.
	 * @name orion.webui.littlelib.$
	 * @function
	 * @static
	 * @param {String} selectors Selectors to match on.
	 * @param {Node} [node=document] Node to query under.
	 * @returns {Element}
	 */
	function $(selector, node) {
		if (!node) {
			node = document;
		}
		return node.querySelector(selector);
	}

	/**
	 * Alias for <code>node.querySelectorAll()</code>.
	 * @name orion.webui.littlelib.$$
	 * @function
	 * @static
	 * @param {String} selectors Selectors to match on.
	 * @param {Node} [node=document] Node to query under.
	 * @returns {NodeList}
	 */
	function $$(selector, node) {
		if (!node) {
			node = document;
		}
		return node.querySelectorAll(selector);
	}

	/**
	 * Identical to {@link orion.webui.littlelib.$$}, but returns an Array instead of a NodeList.
	 * @name orion.webui.littlelib.$$array
	 * @function
	 * @static
	 * @param {String} selectors Selectors to match on.
	 * @param {Node} [node=document] Node to query under.
	 * @returns {Element[]}
	 */
	function $$array(selector, node) {
		return Array.prototype.slice.call($$(selector,node));
	}

	/**
	 * Alias for <code>document.getElementById</code>, but returns the input unmodified when passed a Node (or other non-string).
	 * @function
	 * @param {String|Element} elementOrId
	 * @returns {Element}
	 */
	function node(either) {
		var theNode = either;
		if (typeof(either) === "string") { //$NON-NLS-0$
			theNode = document.getElementById(either);
		}	
		return theNode;
	}

	/**
	 * Returns whether <code>child</code> is a descendant of <code>parent</code> in the DOM order.
	 * @function
	 * @param {Node} parent
	 * @param {Node} child
	 * @returns {Boolean}
	 */
	function contains(parent, child) {
		if (!parent || !child) { return false; }
		if (parent === child) { return true; }
		var compare = parent.compareDocumentPosition(child);  // useful to break out for debugging
		return Boolean(compare & 16);
	}

	/**
	 * Returns the bounds of a node. The returned coordinates are absolute (not relative to the viewport).
	 * @function
	 * @param {Node} node
	 * @returns {Object}
	 */
	function bounds(node) {
		var clientRect = node.getBoundingClientRect();
		var scrollLeft = Math.max(document.documentElement.scrollLeft, document.body.scrollLeft);
		var scrollTop = Math.max(document.documentElement.scrollTop, document.body.scrollTop);
		return { 
			left: clientRect.left + scrollLeft,
			top: clientRect.top + scrollTop,
			width: clientRect.width,
			height: clientRect.height
		};
	}

	/**
	 * Removes all children of the given node.
	 * @name orion.webui.littlelib.empty
	 * @function
	 * @static
	 * @param {Node} node
	 */
	function empty(node) {
		while (node && node.hasChildNodes()) {
			var child = node.firstChild;
			node.removeChild(child);
		}
	}

	function _getTabIndex(node) {
		var result = node.tabIndex;
		if (result === 0 && util.isIE) {
			/*
			 * The default value of tabIndex is 0 on IE, even for elements that are not focusable
			 * by default (http://msdn.microsoft.com/en-us/library/ie/ms534654(v=vs.85).aspx).
			 * Handle this browser difference by treating this value as -1 if the node is a type
			 * that is not focusable by default according to the MS doc and has not had this
			 * attribute value explicitly set on it.
			 */
			var focusableElements = {
				a: true,
				body: true,
				button: true,
				frame: true,
				iframe: true,
				img: true,
				input: true,
				isindex: true,
				object: true,
				select: true,
				textarea: true
			};
			if (!focusableElements[node.nodeName.toLowerCase()] && !node.attributes.tabIndex) {
				result = -1;
			}
		}
		return result;
	}
	
	/* 
	 * Inspired by http://brianwhitmer.blogspot.com/2009/05/jquery-ui-tabbable-what.html
	 */
	function firstTabbable(node, allowFocusable) {
		var tabIndex = _getTabIndex(node);
		if ((tabIndex >= 0 || allowFocusable && tabIndex >= -1) && !node.disabled && node.offsetParent && window.getComputedStyle(node).visibility === "visible") {
			return node;
		}
		if (node.hasChildNodes()) {
			for (var i=0; i<node.childNodes.length; i++) {
				var result = firstTabbable(node.childNodes[i]);
				if (result) {
					return result;
				}
			}
		}
		return null;
	}

	function lastTabbable(node) {
		if (node.hasChildNodes()) {
			for (var i = node.childNodes.length-1; i >= 0; i--) {
				var result = lastTabbable(node.childNodes[i]);
				if (result) {
					return result;
				}
			}
		}
		if (_getTabIndex(node) >= 0 && !node.disabled && node.offsetParent && window.getComputedStyle(node).visibility === "visible") {
			return node;
		}
		return null;
	}

	/*
	 * Special hook to show the context menu on Shift + F10 (macs only)
	 */
	function installShowContextMenu() {
		if (util.isMac) {
			document.addEventListener("keydown", function (evt) {
				if (evt.keyCode === 121 && evt.shiftKey) {
					var rect, xPos, yPos;
					var focusElement = document.activeElement;
	
					if (focusElement.contentEditable === "true") {
						var selection = window.getSelection();
						var range = selection.getRangeAt(0); //get the text range
						rect = range.getBoundingClientRect();
						xPos = rect.left;
						yPos = rect.top + rect.height;
						
					} else {
						rect = bounds(focusElement);
						xPos = rect.left + (rect.width/2);
						yPos = rect.top + (rect.height/2);
					}
	
					var e = focusElement.ownerDocument.createEvent("MouseEvents");
					e.initMouseEvent("contextmenu", true, true,
						focusElement.ownerDocument.defaultView, 1, 0, 0, xPos, yPos, false,
						false, false, false,2, null);
					return !focusElement.dispatchEvent(e);				
				}
			}, true);
		}
	}
	installShowContextMenu();
	
	/* Trap the tabs within the given parent */
	function trapTabs(parentElement) {
		if (parentElement.tabTrapInstalled)
			return;
		
		parentElement.addEventListener("keydown", function (e) { //$NON-NLS-0$
			if(e.keyCode === KEY.TAB) {
				var first = firstTabbable(parentElement);
				var last = lastTabbable(parentElement);
				
				if (first && last) {
					if (e.target === last && !e.shiftKey) {
						// wrap to first tabbable
						first.focus();
						stop(e);
					}
					else if (e.target === first && e.shiftKey) {
						// wrap to last tabbable
						last.focus();
						stop(e);
					}
				}
			} 
		}, true);
		parentElement.tabTrapInstalled = true;
	}
	
	var variableRegEx = /\$\{([^\}]+)\}/;
	// Internal helper
	function processNodes(node, replace) {
		if (node.nodeType === 3) { // TEXT_NODE
			var matches = variableRegEx.exec(node.nodeValue);
			if (matches && matches.length > 1) {
				replace(node, matches);
			}
		} else if (node.nodeType === 1) { // ELEMENT_NODE
			processElementNode(node, replace, "alt"); //$NON-NLS-0$
			//processElementNode(node, replace, "title"); //$NON-NLS-0$
			//processElementNode(node, replace, "placeholder"); //$NON-NLS-0$
			processElementNode(node, replace, "aria-label"); //$NON-NLS-0$
		}
		if (node.hasChildNodes()) {
			for (var i=0; i<node.childNodes.length; i++) {
				processNodes(node.childNodes[i], replace);
			}
		}
	}
	
	function processElementNode(node, replace, attribute) {
		var value = node.getAttribute(attribute);
		if (value) {
			var matches = variableRegEx.exec(value);
			if (matches && matches.length > 1) {
				replace(node, matches, attribute);
			}
		}		
	}

	/**
	 * @name pixelValueOf
	 * @description Returns the pixel value of the given CSS attribute
	 * @param node The element whose style is to be checked
	 * @param attrName The name of the attribute to check. Use the literal CSS name
	 * (i.e. 'padding-left' rather than 'paddingLeft').
	 * @returns returns The value (in pixels) of the attribute. If the value cannot be parsed to an int the zero is returned
	 */
	function pixelValueOf(node, attrName) {
		if (!node || !attrName) {
			return 0;
		}
		
		var doc = node.ownerDocument;
		var win =  doc.defaultView || doc.parentWindow;
		if (win.getComputedStyle) {
			var style = win.getComputedStyle(node, null);
			var value = style.getPropertyValue(attrName);
			// Ensure that value ends in "px"
			if (value.length > 2 && value.indexOf("px", value.length - 2) !== -1) {
				value = value.slice(0,-2);
				var intVal = parseInt(value,10);
				if (intVal !== intVal) {
					return 0;  // value was NaN
				} else {
					return intVal;
				}
			}
		}
		return 0;
	}
	
	/**
	 * Performs substitution of strings into textContent within the given node and its descendants. An occurrence of <code>${n}</code>
	 * in text content will be replaced with the string <code>messages[n]</code>.
	 * <p>This function is recommended for binding placeholder text in template-created DOM elements to actual display strings.</p>
	 * @name orion.webui.littlelib.processTextNodes
	 * @function
	 * @param {Node} node The node to perform replacement under.
	 * @param {String[]} messages The replacement strings.
	 */
	function processTextNodes(node, messages) {
		processNodes(node, function(targetNode, matches, attribute) {
			var replaceText = messages[matches[1]] || matches[1];
			if (targetNode.nodeType === 3) { // TEXT_NODE
				targetNode.parentNode.replaceChild(document.createTextNode(replaceText), targetNode);
			} else if (targetNode.nodeType === 1 && attribute) { // ELEMENT_NODE
				setSafeAttribute(targetNode, attribute, replaceText);
			}
		});
	}

	/**
	 * Performs substitution of DOM nodes into textContent within the given node and its descendants. An occurrence of <code>${n}</code>
	 * in text content will be replaced by the DOM node <code>replaceNodes[n]</code>.
	 * <p>This function is recommended for performing rich-text replacement within a localized string. The use of actual DOM nodes
	 * avoids the need for embedded HTML in strings.</p>
	 * @name orion.webui.littlelib.processDOMNodes
	 * @function
	 * @param {Node} node The node to perform replacement under.
	 * @param {Node[]} replaceNodes The replacement nodes.
	 */
	function processDOMNodes(node, replaceNodes) {
		processNodes(node, function(targetNode, matches) {
			var replaceNode = replaceNodes[matches[1]];
			if (replaceNode) {
				var range = document.createRange();
				var start = matches.index;
				range.setStart(targetNode, start);
				range.setEnd(targetNode, start + matches[0].length);
				range.deleteContents();
				range.insertNode(replaceNode);
			}
		});
	}

	/**
	 * Adds auto-dismiss functionality to the document. When a click event occurs whose <code>target</code> is not a descendant of
	 * one of the <code>excludeNodes</code>, the <code>dismissFunction</code> is invoked.
	 * @name orion.webui.littlelib.addAutoDismiss
	 * @function
	 * @static
	 * @param {Node[]} excludeNodes Clicks targeting any descendant of these nodes will not trigger the dismissFunction.
	 * @param {Function} dismissFunction The dismiss handler.
	 */
	
	var autoDismissNodes = null;

	function addAutoDismiss(excludeNodes, dismissFunction) {
		// auto dismissal.  Click anywhere else means close.
		function onclick(event) {
			autoDismissNodes.forEach(function(autoDismissNode) {
				var excludeNodeInDocument = false;
				var excluded = autoDismissNode.excludeNodes.some(function(excludeNode) {
					if(document.body.contains(excludeNode)) {
						excludeNodeInDocument = true;
						return excludeNode.contains(event.target);
					}
					return false;
				});
				if (excludeNodeInDocument && !excluded) {
					try {
						autoDismissNode.dismiss(event);
					} catch (e) {
						if (typeof console !== "undefined" && console) { //$NON-NLS-0$
							console.error(e && e.message);
						}
					}
				}
			});
			autoDismissNodes = autoDismissNodes.filter(function(autoDismissNode) {
				// true if at least one excludeNode is in document.body
				return autoDismissNode.excludeNodes.some(function(excludeNode) {
					return document.body.contains(excludeNode);
				});
			});
		}

		// Hook listener only once
		if (autoDismissNodes === null) {
			autoDismissNodes = [];
			document.addEventListener("click", onclick, true); //$NON-NLS-0$
			if (util.isIOS) {
				document.addEventListener("touchend", function(event){
					function unhook(){
						event.target.removeEventListener("click", unhook);
					}
					if (event.touches.length === 0) {
						// we need a click eventlistener on the target to have ios really trigger a click
						event.target.addEventListener("click", unhook);
					}	
				}, false);
			}
		}
		
		autoDismissNodes.push({excludeNodes: excludeNodes, dismiss: dismissFunction});
	}
	
	/**
	 * Removes all auto-dismiss nodes which trigger the specified dismiss function.
	 * 
	 * @name orion.webui.littlelib.removeAutoDismiss
	 * @function
	 * @static
	 * @param {Function} dismissFunction The dismiss function to look for.
	 */
	function removeAutoDismiss(dismissFunction) {
		autoDismissNodes = autoDismissNodes.filter(function(autoDismissNode) {
			return dismissFunction !== autoDismissNode.dismiss;
		});
	}
	
	/**
	 * Returns the parent of the node that has the vertical scroll bar.
	 * 
	 * @name orion.webui.littlelib.getOffsetParent
	 * @function
	 * @static
	 * @param {Element} node The node to lookup the offset parent
	 */
	function getOffsetParent(node) {
		var offsetParent = node.parentNode, documentElement = document.documentElement;
		while (offsetParent && offsetParent !== documentElement) {
			var style = window.getComputedStyle(offsetParent, null);
			if (!style) { break; }
			var overflow = style.getPropertyValue("overflow-y"); //$NON-NLS-0$
			if (overflow === "auto" || overflow === "scroll") { break; } //$NON-NLS-1$ //$NON-NLS-0$
			offsetParent = offsetParent.parentNode;
		}
		return offsetParent;
	}
	
	function getPathTo(element) {
		if (!element) return "";
		if (element.id !== "") {
			return 'id("' + element.id +'")';
		}
		if (element === document.body) {
			return element.tagName;
		}
		var ix= 0;
		var siblings = element.parentNode && element.parentNode.childNodes || [];
		for (var i= 0; i < siblings.length; i++) {
			var sibling = siblings[i];
			if (sibling === element) {
				return getPathTo(element.parentNode)+ '/'+ element.tagName+'['+(ix+1)+']';
			}
			if (sibling.nodeType === Node.ELEMENT_NODE && sibling.tagName === element.tagName) {
				ix++;
			}
		}
	}
	
	/**
	 * Return focus to the element that was active before the <code>hidingParent</code> was
	 * shown if the parent contains the active element. If the previous active node is no
	 * longer available, the first tabbable in the nearest ancestor is focused.
	 * 
	 * @name orion.webui.littlelib.returnFocus
	 * @function
	 * @static
	 * @param {Element} hidingParent The node that is hiding
	 * @param {Element} previousActiveElement The previously focus node
	 */
	function returnFocus(hidingParent, previousActiveElement, hideCallback) {
		var activeElement = document.activeElement;
		var focusPath = getPathTo(previousActiveElement);
		var hasFocus = hidingParent && (hidingParent === activeElement || (hidingParent.compareDocumentPosition(activeElement) & 16) !== 0);
		var deferred;
		if (hideCallback) {
			deferred = hideCallback();
		}
		function restore() {
			var temp = previousActiveElement;
			if (hasFocus) {
				while (temp && temp !== document.body) {
					if (document.compareDocumentPosition(temp) !== 1 && temp.offsetParent) {
						var tabbable = firstTabbable(temp, previousActiveElement === temp);
						if (tabbable) {
							temp = tabbable;
							break;
						}
					}
					if (temp.classList.contains("contextMenu")) {
						if (temp.triggerNode) {
							temp = temp.triggerNode;
							continue;
						}
						break;
					}
					temp = temp.parentNode;
				}
				if (!temp && focusPath) {
					temp = document.evaluate(focusPath, document, null, XPathResult.FIRST_ORDERED_NODE_TYPE, null).singleNodeValue;
				}
				if (temp) {
					temp.focus();
					return true;
				}
			}
			return false;
		}
		return deferred && deferred.then ? deferred.then(restore) : restore();
	}
	
	/**
	 * Cancels the default behavior of an event and stops its propagation.
	 * @name orion.webui.littlelib.stop
	 * @function
	 * @static
	 * @param {Event} event
	 */
	function stop(event) {
		if (window.document.all) { 
			event.keyCode = 0;
		}
		if (event.preventDefault) {
			event.preventDefault();
			event.stopPropagation();
		}
	}
	
	function setFramesEnabled(enable) {
		var frames = document.getElementsByTagName("iframe"); //$NON-NLS-0$
		for (var i = 0; i<frames.length; i++) {
			if (frames[i].parentNode === document.body) continue;
			frames[i].parentNode.style.pointerEvents = enable ? "" : "none"; //$NON-NLS-0$
		}
	}
	
	/**
	 * Given a non-empty string, returns a string with no spaces in it (valid HTML5 id attribute).
	 * Also removes any punctuation except for '_', '-', and '.' for compatibility with HTML4.
	 * @name orion.webui.littlelib.validId
	 * @function
	 * @static
	 * @param {String} str	A non-empty string
	 * @returns A valid html id string
	 */
	function validId(str) {
		return str.replace(/\s/g, '-').replace(/[^A-Za-z0-9_.-]/g, '.');
	}
	
	/**
	 * Maps a <code>keyCode</code> to <tt>KEY</tt> name. This is the inverse of {@link orion.webui.littlelib.KEY}.
	 * @private
	 */
	var KEY_CODE = Object.create(null);
	Object.keys(KEY).forEach(function(name) {
		KEY_CODE[KEY[name]] = name;
	});

	/**
	 * @param {Number} keyCode
	 * @returns The name of the <code>lib.KEY</code> entry for keyCode, or null.
	 */
	function keyName(keyCode) {
		return KEY_CODE[keyCode] || null;
	}

	/**
	 * Creates DOM nodes from the specified template string.
	 * 
	 * @param {String} templateString 	A string containing the HTML template to use
	 * @param {Node} parentNode 		Optional. The parent node to insert the new nodes into. 
	 * 									The parent's contents will be completely replaced.
	 * @returns If the template string contains a single node or a wrapper node which
	 * 			wraps all the other nodes that single DOM node will be returned. 
	 * 			Otherwise if the template string contains multiple top-level nodes an
	 * 			{HTMLCollection} object containing all the top-level nodes will be returned.
	 */
	function createNodes(templateString, parentNode) {
		var parent = parentNode;
		var newNodes = null;
		
		if (undefined === parent) {
			parent = document.createElement("div"); //$NON-NLS-0$
		}

		setSafeInnerHTML(parent, templateString);	
		if (parent.children.length > 1) {
			newNodes = parent.children;
		} else {
			newNodes = parent.firstChild;
		}
		
		return newNodes;
	}

  /**
   * @description This function is a delegate to set the value of an attribute on a given node
   * @param {Element} node
   * @param {string} name
   * @param {?} value
   * @since 20.0
   */
  function setSafeAttribute(node, name, value) {
	if(node instanceof Element && name !== null && name !== undefined) {
			//TODO - add more checks, this is not sufficient
	  node.setAttribute(name, value);
	}
	}
	
	/**
   * @description This function is a delegate to set the value of innerHTML on a given node
   * @param {Element} node
   * @param {string} value
   * @since 20.0
   */
  function setSafeInnerHTML(node, value) {
	if(node instanceof Element && (value instanceof String || typeof value === "string")) {
			//TODO - we do not allow third party content, so not a problem currently
	  node.innerHTML = value;
	}
  }

	//return module exports
	return {
		$: $,
		$$: $$,
		$$array: $$array,
		node: node,
		contains: contains,
		bounds: bounds,
		empty: empty,
		firstTabbable: firstTabbable,
		lastTabbable: lastTabbable,
		trapTabs: trapTabs,
		pixelValueOf: pixelValueOf,
		stop: stop,
		processTextNodes: processTextNodes,
		processDOMNodes: processDOMNodes,
		addAutoDismiss: addAutoDismiss,
		setFramesEnabled: setFramesEnabled,
		validId: validId,
		getOffsetParent: getOffsetParent,
		removeAutoDismiss: removeAutoDismiss,
		returnFocus: returnFocus,
		keyName: keyName,
		KEY: KEY,
		createNodes: createNodes,
		setSafeAttribute: setSafeAttribute,
		setSafeInnerHTML: setSafeInnerHTML
	};
});
