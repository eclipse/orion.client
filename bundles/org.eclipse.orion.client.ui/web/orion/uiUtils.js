/*******************************************************************************
 * @license
 * Copyright (c) 2009, 2012, 2017 IBM Corporation and others.
 * All rights reserved. This program and the accompanying materials are made 
 * available under the terms of the Eclipse Public License 2.0 
 * (http://www.eclipse.org/legal/epl-v10.html), and the Eclipse Distribution 
 * License v1.0 (http://www.eclipse.org/org/documents/edl-v10.html). 
 *
 * Contributors: IBM Corporation - initial API and implementation
 *******************************************************************************/
/*eslint-env browser, amd*/
define([
	'i18n!orion/nls/messages',
	'orion/webui/littlelib',
	'orion/i18nUtil',
	'orion/bidiUtils',
	'orion/urlModifier'
], function(messages, lib, i18nUtil, bidiUtils, urlModifier) {
	/**
	 * This class contains static utility methods. It is not intended to be instantiated.
	 * @class This class contains static utility methods.
	 * @name orion.uiUtils
	 */

	var isMac = navigator.platform.indexOf("Mac") !== -1; //$NON-NLS-0$

	// Maps keyCode to display symbol
	var keySymbols = Object.create(null);
	keySymbols[lib.KEY.DOWN]  = "\u2193"; //$NON-NLS-0$
	keySymbols[lib.KEY.UP]    = "\u2191"; //$NON-NLS-0$
	keySymbols[lib.KEY.RIGHT] = "\u2192"; //$NON-NLS-0$
	keySymbols[lib.KEY.LEFT]  = "\u2190"; //$NON-NLS-0$
	if (isMac) {
		keySymbols[lib.KEY.BKSPC]    = "\u232b"; //$NON-NLS-0$
		keySymbols[lib.KEY.DEL]      = "\u2326"; //$NON-NLS-0$
		keySymbols[lib.KEY.END]      = "\u21f2"; //$NON-NLS-0$
		keySymbols[lib.KEY.ENTER]    = "\u23ce"; //$NON-NLS-0$
		keySymbols[lib.KEY.ESCAPE]   = "\u238b"; //$NON-NLS-0$
		keySymbols[lib.KEY.HOME]     = "\u21f1"; //$NON-NLS-0$
		keySymbols[lib.KEY.PAGEDOWN] = "\u21df"; //$NON-NLS-0$
		keySymbols[lib.KEY.PAGEUP]   = "\u21de"; //$NON-NLS-0$
		keySymbols[lib.KEY.SPACE]    = "\u2423"; //$NON-NLS-0$
		keySymbols[lib.KEY.TAB]      = "\u21e5"; //$NON-NLS-0$
	}

	function getUserKeyStrokeString(binding) {
		var userString = "";

		if (isMac) {
			if (binding.mod4) {
				userString+= "\u2303"; //Ctrl //$NON-NLS-0$
			}
			if (binding.mod3) {
				userString+= "\u2325"; //Alt //$NON-NLS-0$
			}
			if (binding.mod2) {
				userString+= "\u21e7"; //Shift //$NON-NLS-0$
			}
			if (binding.mod1) {
				userString+= "\u2318"; //Command //$NON-NLS-0$
			}
		} else {
			var PLUS = "+"; //$NON-NLS-0$;
			if (binding.mod1)
				userString += messages.KeyCTRL + PLUS;
			if (binding.mod2)
				userString += messages.KeySHIFT + PLUS;
			if (binding.mod3)
				userString += messages.KeyALT + PLUS;
		}
		
		if (binding.alphaKey) {
			return userString+binding.alphaKey;
		}
		if (binding.type === "keypress") {
			return userString+binding.keyCode; 
		}

		// Check if it has a special symbol defined
		var keyCode = binding.keyCode;
		var symbol = keySymbols[keyCode];
		if (symbol) {
			return userString + symbol;
		}

		// Check if it's a known named key from lib.KEY
		var keyName = lib.keyName(keyCode);
		if (keyName) {
			// Some key names are translated, so check for that.
			keyName = messages["Key" + keyName] || keyName; //$NON-NLS-0$
			return userString + keyName;
		}

		var character;
		switch (binding.keyCode) {
			case 59:
				character = binding.mod2 ? ":" : ";"; //$NON-NLS-1$ //$NON-NLS-0$
				break;
			case 61:
				character = binding.mod2 ? "+" : "="; //$NON-NLS-1$ //$NON-NLS-0$
				break;
			case 188:
				character = binding.mod2 ? "<" : ","; //$NON-NLS-1$ //$NON-NLS-0$
				break;
			case 190:
				character = binding.mod2 ? ">" : "."; //$NON-NLS-1$ //$NON-NLS-0$
				break;
			case 191:
				character = binding.mod2 ? "?" : "/"; //$NON-NLS-1$ //$NON-NLS-0$
				break;
			case 192:
				character = binding.mod2 ? "~" : "`"; //$NON-NLS-1$ //$NON-NLS-0$
				break;
			case 219:
				character = binding.mod2 ? "{" : "["; //$NON-NLS-1$ //$NON-NLS-0$
				break;
			case 220:
				character = binding.mod2 ? "|" : "\\"; //$NON-NLS-1$ //$NON-NLS-0$
				break;
			case 221:
				character = binding.mod2 ? "}" : "]"; //$NON-NLS-1$ //$NON-NLS-0$
				break;
			case 222:
				character = binding.mod2 ? '"' : "'"; //$NON-NLS-1$ //$NON-NLS-0$
				break;
			}
		if (character) {
			return userString+character;
		}
		if (binding.keyCode >= 112 && binding.keyCode <= 123) {
			return userString+"F"+ (binding.keyCode - 111); //$NON-NLS-0$
		}
		return userString+String.fromCharCode(binding.keyCode);
	}

	function getUserKeyString(binding) {
		var result = "";
		var keys = binding.getKeys();
		for (var i = 0; i < keys.length; i++) {
			if (i !== 0) {
				result += " "; //$NON-NLS-0$
			}
			result += getUserKeyStrokeString(keys[i]);
		}
		return result;
	}

	/**
	 * @name orion.uiUtils.getUserText
	 * @function
	 * @param {Object} options The options object
	 * @param {String} options.id
	 * @param {Element} options.refNode
	 * @param {Boolean} options.hideRefNode
	 * @param {String} options.initialText
	 * @param {Function} options.onComplete
	 * @param {Function} options.onEditDestroy
	 * @param {String} options.selectTo
	 * @param {Boolean} options.isInitialValid
	 * @param {Boolean} options.insertAsChild
	 */
	function getUserText(options) {
		var id = options.id;
		var refNode = options.refNode;
		var hideRefNode = options.hideRefNode;
		var initialText = options.initialText;
		var onComplete = options.onComplete;
		var onEditDestroy = options.onEditDestroy;
		var selectTo = options.selectTo;
		var isInitialValid = options.isInitialValid;
		var insertAsChild = options.insertAsChild;
		var previousActiveElement = document.activeElement;
		
		var done = false;
		var handler = function(isKeyEvent) {
			return function(event) {
				if (done) {
					return;
				}
				var editBox = lib.node(id),
					newValue = editBox.value;
				if (!editBox) {
					return;
				}
				function hide() {
					done = true;
					lib.returnFocus(editBox, previousActiveElement, function() {
						if (hideRefNode) {
							refNode.style.display = "";
						}
					});
					// some clients remove temporary dom structures in the onComplete processing, so check that we are still in DOM
					if (editBox.parentNode) {
						editBox.parentNode.removeChild(editBox);
					}
					if (onEditDestroy) {
						onEditDestroy();
					}
				}
				if (isKeyEvent && event.keyCode === lib.KEY.ESCAPE) {
					hide();
					return;
				}
				if (isKeyEvent && event.keyCode !== lib.KEY.ENTER) {
					return;
				} else if (newValue.length === 0 || (!isInitialValid && newValue === initialText)) {
					// Do nothing
				} else {
					onComplete(newValue);
				}
				hide();
			};
		};
	
		// Swap in an editable text field
		var editBox = document.createElement("input"); //$NON-NLS-0$
		editBox.id = id;
		editBox.value = initialText || "";
		if (insertAsChild) {
			refNode.appendChild(editBox);
		} else {
			refNode.parentNode.insertBefore(editBox, refNode.nextSibling);
		}
		editBox.classList.add("userEditBoxPrompt"); //$NON-NLS-0$
		if (hideRefNode) {
			refNode.style.display = "none"; //$NON-NLS-0$
		}	
		bidiUtils.initInputField(editBox);
		editBox.addEventListener("keydown", handler(true), false); //$NON-NLS-0$
		editBox.addEventListener("blur", handler(false), false); //$NON-NLS-0$
		window.setTimeout(function() {
			editBox.focus(); 
			if (initialText) {
				var box = lib.node(id);
				var end = selectTo ? initialText.indexOf(selectTo) : -1;
				if (end > 0) {
					if(box.createTextRange) {
						var range = box.createTextRange();
						range.collapse(true);
						range.moveStart("character", 0); //$NON-NLS-0$
						range.moveEnd("character", end); //$NON-NLS-0$
						range.select();
					} else if(box.setSelectionRange) {
						box.setSelectionRange(0, end);
					} else if(box.selectionStart !== undefined) {
						box.selectionStart = 0;
						box.selectionEnd = end;
					}
				} else {
					box.select();
				}
			}
		}, 0);
	}
	
	/**
	 * Returns whether the given event should cause a reference
	 * to open in a new window or not.
	 * @param {Object} event The key event
	 * @name orion.util#openInNewWindow
	 * @function
	 */
	function openInNewWindow(event) {
		var isMac = window.navigator.platform.indexOf("Mac") !== -1; //$NON-NLS-0$
		return (isMac && event.metaKey) || (!isMac && event.ctrlKey);
	}
	
	/**
	 * Opens a link in response to some event. Whether the link
	 * is opened in the same window or a new window depends on the event
	 * @param {String} href The link location
	 * @name orion.util#followLink
	 * @function
	 */
	function followLink(href, event) {
		if (event && openInNewWindow(event)) {
			window.open(urlModifier(href));
		} else {
			window.location = urlModifier(href);
		}
	}
	
	function createButton(text, callback) {
		var button = document.createElement("button"); //$NON-NLS-0$
		button.className = "orionButton commandButton commandMargins"; //$NON-NLS-0$
		button.addEventListener("click", function(e) { //$NON-NLS-0$
			callback();
			lib.stop(e);
		}, false);
		if (text) {
			button.appendChild(document.createTextNode(text));
		}
		return button;	
	}
	
	function createDropdownButton(parent, name, populateFunction) {
	}

	/**
	 * Returns whether <code>element</code> or its parent is an HTML5 form element.
	 * @param {Element} element
	 * @param {Element} parentLimit
	 * @function
	 * @returns {Boolean}
	 */
	function isFormElement(element, parentLimit) {
		if (!element || !element.tagName) return false;
		switch (element.tagName.toLowerCase()) {
			case "button": //$NON-NLS-0$
			case "fieldset": //$NON-NLS-0$
			case "form": //$NON-NLS-0$
			case "input": //$NON-NLS-0$
			case "keygen": //$NON-NLS-0$
			case "label": //$NON-NLS-0$
			case "legend": //$NON-NLS-0$
			case "meter": //$NON-NLS-0$
			case "optgroup": //$NON-NLS-0$
			case "output": //$NON-NLS-0$
			case "progress": //$NON-NLS-0$
			case "select": //$NON-NLS-0$
			case "textarea": //$NON-NLS-0$
				return true;
		}
		if (element.parentNode === parentLimit) return false;
		return element.parentNode && isFormElement(element.parentNode, parentLimit);
	}

	/**
	 * Returns the folder name from path.
	 * @param {String} filePath
	 * @param {Boolean} keepTailSlash
	 * @returns {String}
	 */
	function path2FolderName(filePath, keepTailSlash){
		var pathSegs = filePath.split("/");
		pathSegs.splice(pathSegs.length -1, 1);
		return keepTailSlash ? pathSegs.join("/") + "/" : pathSegs.join("/");
	}
	
	function _timeDifference(timeStamp) {
		var commitDate = new Date(timeStamp);
	    var difference = Date.now() - commitDate.getTime();
	    var yearDiff = Math.floor(difference/1000/60/60/24/365);
	    difference -= yearDiff*1000*60*60*24*365;
	    var monthDiff = Math.floor(difference/1000/60/60/24/30);
	    difference -= monthDiff*1000*60*60*24*30;
	    var daysDifference = Math.floor(difference/1000/60/60/24);
	    difference -= daysDifference*1000*60*60*24;
		var hoursDifference = Math.floor(difference/1000/60/60);
	    difference -= hoursDifference*1000*60*60;
	    var minutesDifference = Math.floor(difference/1000/60);
	    difference -= minutesDifference*1000*60;
	    var secondsDifference = Math.floor(difference/1000);
	    return {year: yearDiff, month: monthDiff, day: daysDifference, hour: hoursDifference, minute: minutesDifference, second: secondsDifference};
	}
	
	function _generateTimeString(number, singleTerm, term) {
		if(number > 0) {
			if(number === 1) {
				return messages[singleTerm];
			}
			return i18nUtil.formatMessage(messages[term], number);
		}
		return "";
	}
	
	/**
	 * Returns the time duration passed by now. E.g. "2 minutes", "an hour", "a day", "3 months", "2 years"
	 * @param {String} timeStamp
	 * @returns {String} If the duration is less than 1 minute, it returns empty string "". Otherwise it returns a duration value.
	 */
	function timeElapsed(timeStamp) {
		var diff = _timeDifference(timeStamp);
		var yearStr = _generateTimeString(diff.year, "a year", "years");
		var monthStr = _generateTimeString(diff.month, "a month", "months");
		var dayStr = _generateTimeString(diff.day, "a day", "days");
		var hourStr = _generateTimeString(diff.hour, "an hour", "hours");
		var minuteStr = _generateTimeString(diff.minute, "a minute", "minutes");
		var disPlayStr = "";
		if(yearStr) {
			disPlayStr = diff.year > 0 ? yearStr : yearStr + monthStr;
		} else if(monthStr) {
			disPlayStr = diff.month > 0 ? monthStr : monthStr + dayStr;
		} else if(dayStr) {
			disPlayStr = diff.day > 0 ? dayStr : dayStr + hourStr;
		} else if(hourStr) {
			disPlayStr = diff.hour > 0 ? hourStr : hourStr + minuteStr;
		} else if(minuteStr) {
			disPlayStr = minuteStr;
		}
		return disPlayStr;	
	}
	/**
	 * Returns the displayable time duration passed by now. E.g. "just now", "2 minutes ago", "an hour ago", "a day ago", "3 months ago", "2 years ago"
	 * @param {String} timeStamp
	 * @returns {String} If the duration is less than 1 minute, it returns empty string "just now". Otherwise it returns a duration value.
	 */
	function displayableTimeElapsed(timeStamp) {
		var duration = timeElapsed(timeStamp);
		if(duration) {
			return i18nUtil.formatMessage(messages["timeAgo"], duration);
		}
		return messages["justNow"];
	}
	
	/**
	 * Returns the initial of given name.
	 * For standard names: "First [Midddles] Last", returns capital "FL";
	 * For others, returns substr(0, 2).
	 * 
	 * @param {string} name -
	 * @return {string} - initial
	 */
	function getNameInitial(name) {
		var namePart = name.split(' ');
		if (namePart.length >= 2) {
			return (namePart[0].charAt(0) + namePart[namePart.length - 1].charAt(0)).toUpperCase();
		} else {
			return name.substr(0, 2);
		}
	}
	//return module exports
	return {
		getUserKeyString: getUserKeyString,
		getUserText: getUserText,
		openInNewWindow: openInNewWindow,
		followLink: followLink,
		createButton: createButton,
		createDropdownButton: createDropdownButton,
		isFormElement: isFormElement,
		path2FolderName: path2FolderName,
		timeElapsed: timeElapsed,
		displayableTimeElapsed: displayableTimeElapsed,
		getNameInitial: getNameInitial
	};
});
