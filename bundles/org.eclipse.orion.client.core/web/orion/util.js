/*******************************************************************************
 * @license
 * Copyright (c) 2012, 2019 IBM Corporation and others.
 * All rights reserved. This program and the accompanying materials are made 
 * available under the terms of the Eclipse Public License 2.0 
 * (http://www.eclipse.org/legal/epl-v10.html), and the Eclipse Distribution 
 * License v1.0 (http://www.eclipse.org/org/documents/edl-v10.html). 
 *
 * Contributors: IBM Corporation - initial API and implementation
 *******************************************************************************/

/*eslint-env browser, amd*/
define(function() {

	var userAgent = navigator.userAgent;
	var isIE = (userAgent.indexOf("MSIE") !== -1 || userAgent.indexOf("Trident") !== -1) ? document.documentMode : undefined; //$NON-NLS-1$ //$NON-NLS-0$
	var isFirefox = parseFloat(userAgent.split("Firefox/")[1] || userAgent.split("Minefield/")[1]) || undefined; //$NON-NLS-1$ //$NON-NLS-0$
	var isOpera = userAgent.indexOf("Opera") !== -1 ? parseFloat(userAgent.split("Version/")[1]) : undefined; //$NON-NLS-0$
	var isChrome = parseFloat(userAgent.split("Chrome/")[1]) || undefined; //$NON-NLS-0$
	var isSafari = userAgent.indexOf("Safari") !== -1 && !isChrome; //$NON-NLS-0$
	var isWebkit = parseFloat(userAgent.split("WebKit/")[1]) || undefined; //$NON-NLS-0$
	var isAndroid = userAgent.indexOf("Android") !== -1; //$NON-NLS-0$
	var isIPad = userAgent.indexOf("iPad") !== -1; //$NON-NLS-0$
	var isIPhone = userAgent.indexOf("iPhone") !== -1; //$NON-NLS-0$
	var isIOS = isIPad || isIPhone;
	var isElectron = userAgent.indexOf("Electron") !== -1; //$NON-NLS-0$
	var isMac = navigator.platform.indexOf("Mac") !== -1; //$NON-NLS-0$
	var isWindows = navigator.platform.indexOf("Win") !== -1; //$NON-NLS-0$
	var isLinux = navigator.platform.indexOf("Linux") !== -1; //$NON-NLS-0$
	var isTouch = typeof document !== "undefined" && "ontouchstart" in document.createElement("input"); //$NON-NLS-1$ //$NON-NLS-0$
	
	var platformDelimiter = isWindows ? "\r\n" : "\n"; //$NON-NLS-1$ //$NON-NLS-0$

	function formatMessage(msg) {
		var args = arguments;
		return msg.replace(/\$\{([^\}]+)\}/g, function(str, index) { return args[(index << 0) + 1]; });
	}
	
	var XHTML = "http://www.w3.org/1999/xhtml"; //$NON-NLS-0$
	function createElement(document, tagName) {
		if (document.createElementNS) {
			return document.createElementNS(XHTML, tagName);
		}
		return document.createElement(tagName);
	}
	function confineDialogTab(firstElement, lastElement) {
		lastElement.addEventListener("keydown", function(evt) {
			if(evt.keyCode === 9 && !evt.shiftKey) {
				evt.preventDefault();
				firstElement.focus();
			}
		});
		firstElement.addEventListener("keydown", function(evt) {
			if(evt.keyCode === 9 && evt.shiftKey) {
				evt.preventDefault();
				lastElement.focus();
			}
		});
	}

	/**
	 * @description Save the setting to persistent storage.
	 * 
	 * Currently this function saves to localStorage
	 * @param {string} key 
	 * @param {string} value
	 * @since 20.0
	 */
	function saveSetting(key, value) {
		//TODO make this pluggable to not only work with localStorage
		localStorage.setItem(key, value);
	}

	/**
	 * @description Retrieve the setting from persistent storage.
	 * 
	 * Currently this function reads from localStorage
	 * @param {string} key 
	 * @since 20.0
	 */
	function readSetting(key) {
		//TODO make this pluggable to not only work with localStorage
		return localStorage.getItem(key);
	}

	/**
	 * @description Remove the setting from persistent storage.
	 * 
	 * Currently this function removes from localStorage
	 * @param {string} key 
	 * @since 20.0
	 */
	function deleteSetting(key) {
		//TODO make this pluggable to not only work with localStorage
		localStorage.removeItem(key);
	}

	/**
	 * @description Clears out the saved settings from persistent storage
	 * 
	 * @since 20.0
	 */
	function clearSettings() {
		//TODO make this pluggable to not only work with localStorage
		localStorage.clear();
	}

	function computeAuditId(fileClient, path, removeWorkspaceSegment) {
		var rootUrl = fileClient.fileServiceRootURL(path);
		var rootSegmentsCount = rootUrl.split('/').length;
		var segmentsToRemove = rootSegmentsCount + (removeWorkspaceSegment ? 1 : 0);
		return path.split('/').slice(segmentsToRemove).join('/');
	}

	return {
		readSetting: readSetting,
		saveSetting: saveSetting,
		deleteSetting: deleteSetting,
		clearSettings: clearSettings,

		formatMessage: formatMessage,
		
		createElement: createElement,
		confineDialogTab: confineDialogTab,
		
		computeAuditId: computeAuditId,
		
		/** Browsers */
		isIE: isIE,
		isFirefox: isFirefox,
		isOpera: isOpera,
		isChrome: isChrome,
		isSafari: isSafari,
		isWebkit: isWebkit,
		isAndroid: isAndroid,
		isIPad: isIPad,
		isIPhone: isIPhone,
		isIOS: isIOS,
		isElectron: isElectron,
		
		/** OSs */
		isMac: isMac,
		isWindows: isWindows,
		isLinux: isLinux,

		/** Capabilities */
		isTouch: isTouch,

		platformDelimiter: platformDelimiter
	};
});
