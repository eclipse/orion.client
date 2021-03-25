/*******************************************************************************
 * @license
 * Copyright (c) 2011, 2019 IBM Corporation and others.
 * All rights reserved. This program and the accompanying materials are made 
 * available under the terms of the Eclipse Public License 2.0 
 * (http://www.eclipse.org/legal/epl-v10.html), and the Eclipse Distribution 
 * License v1.0 (http://www.eclipse.org/org/documents/edl-v10.html). 
 *
 *******************************************************************************/
define ([
  "orion/webui/littlelib",
	"orion/util",
	"orion/bidiFormat"
],
function(lib, util, bidiFormat) { /* BDL */
	
	var bidiEnabledStorage = "/orion/preferences/bidi/bidiEnabled"; //$NON-NLS-0$
	var bidiLayoutStorage = "/orion/preferences/bidi/bidiLayout"; //$NON-NLS-0$	
	var LRE = "\u202A";	//$NON-NLS-0$
	var PDF = "\u202C"; //$NON-NLS-0$
	var RLE = "\u202B"; //$NON-NLS-0$
		
	function setBrowserLangDirection() {
		
		var lang;
		if (window.dojoConfig) {
			lang = window.dojoConfig.locale;
		}
		if (!lang) {
			lang = navigator.languages ? navigator.languages[0] : navigator.language || navigator.userLanguage;
		}
		var isBidi = lang && "ar iw he".indexOf(lang.substring(0, 2)) !== - 1;

		if (isBidi && isBidiEnabled()) {
			var htmlElement = document.getElementsByTagName("html")[0];
			if (htmlElement){ //should be always true
				lib.setSafeAttribute(htmlElement, "dir", "rtl");
			}
		}
	}
	
	setBrowserLangDirection();
	
	var bidiLayout = getBidiLayout();

	/**
	 * checks if directionality should be applied in Orion.
	 * @returns {Boolean} true if globalization settings exist and bidi is enabled.
	 */		
	function isBidiEnabled() {
		var bidiEnabled = util.readSetting(bidiEnabledStorage);
		if (bidiEnabled && bidiEnabled === "true") {		//$NON-NLS-0$
			return true;
		}
		return false;
	}
	
	/**
	 * returns bidiLayout value set in globalization settings.
	 * @returns {String} text direction.
	 */	
	function getBidiLayout() {
		var _bidiLayout = util.readSetting(bidiLayoutStorage);
		if (_bidiLayout && (_bidiLayout === "rtl" || _bidiLayout === "ltr" || _bidiLayout === "auto")) {	//$NON-NLS-0$ //$NON-NLS-1$ //$NON-NLS-2$
			return _bidiLayout;
		}
		return "ltr";	//$NON-NLS-0$
	}
	
	/**
	 * returns text direction.
	 * this method is used for handling direction by adding a dir attribute in an HTML element.
	 * if bidiLayout is set to ltr > return ltr
	 * if bidiLayout is set to rtl > return rtl
	 * if bidiLayout is set to auto > check for first strong character in text and return ltr or rtl accordingly.
	 * @param {String} the text on which to set directionality
	 * @returns {String} text direction. rtl or ltr.
	 */	
	function getTextDirection(text) {
		bidiLayout = getBidiLayout();
		if (!isBidiEnabled()) {
			return "";
		}
		if (bidiLayout === "auto" && util.isIE) {	//$NON-NLS-0$
			return checkContextual(text);
		}
		return bidiLayout;
	}
	
	/**
	 * Wraps text by UCC (Unicode control characters) according to text direction
	 * In some cases defining the dir attribute in a different direction than the GUI orientation, 
	 * changes the alignment of the text and/or adjacent elements such as icons.
	 * This doesn't follow the bidi standards (static text should be aligned following GUI direction).
	 * Therefore the only solution is to use UCC (Unicode control characters) to display the text in a correct orientation.
	 * (the text is changed for display purposes only. The original text in the repository remains unchanged)
	 * @param {String} the text to be wrapped
	 * @returns {String} text after adding ucc characters.
	 */		
	function enforceTextDirWithUcc ( text ) {
		if (isBidiEnabled() && text.trim()) {
			bidiLayout = getBidiLayout();
			var dir = bidiLayout === "auto" ? checkContextual( text ) : bidiLayout;	//$NON-NLS-0$
			return ( dir === "ltr" ? LRE : RLE ) + text + PDF;	//$NON-NLS-0$
		}
		return text;	
	}
	
	/**
	 * Finds the first strong (directional) character.
	 * If it is Latin, return ltr. If it is bidi, return rtl. Otherwise, return ltr as default. 
	 * @param {String} the text to be examined
	 * @returns {String} text direction. rtl or ltr.
	 */			
	function checkContextual ( text ) {
		// look for strong (directional) characters
		var fdc = /[A-Za-z\u05d0-\u065f\u066a-\u06ef\u06fa-\u07ff\ufb1d-\ufdff\ufe70-\ufefc]/.exec( text );
		// if found, return the direction that defined by the character, else return ltr as defult.
		return fdc ? fdc[0] <= "z" ? "ltr" : "rtl"  : "ltr";	//$NON-NLS-0$ //$NON-NLS-1$ //$NON-NLS-2$ //$NON-NLS-3$
	}
	
	function addBidiEventListeners ( input ) {
		if (!input._hasBidiEventListeners) {
			input._hasBidiEventListeners = true;

			var eventTypes = ["keyup", "cut", "paste"];
			for (var i = 0; i < eventTypes.length; ++i) {
				input.addEventListener(eventTypes[i], handleInputEvent.bind(this),
					false);
			}
		}
	}
	
	function handleInputEvent ( event ) {
		var input = event.target;
		if (input) {
			input.dir = getTextDirection(input.value || input.textContent); // resolve dir attribute of the element
		}
	}
	
	function initInputField ( input ) {
		if (isBidiEnabled() && input) {
			input.dir = getTextDirection(input.value || input.textContent); // resolve dir attribute of the element

			if (util.isIE) {
				addBidiEventListeners(input);
			}
		}
	}
	
	function enforceTextDir(range) {
		var comments = [{name:"comment block"}, 
		                {name:"comment line double-slash"},
		                {name:"comment block documentation"},
		                {name:"comment line double-slash jade"},
		                {name:"comment line"},
		                {name:"comment line number-sign php"},
		                {name:"comment block xml"}
		];
		var text = range.text;
		var style = range.style;
		if (isBidiEnabled() && style && style.styleClass && style.styleClass.startsWith("comment") && text.length > 0) {
			for (var i = 0; i < comments.length; i++) {
				if (style.styleClass === comments[i].name) {
					var newStyle = style;
					if (typeof newStyle.attributes === "undefined") {
						newStyle.attributes = {};
					}
					newStyle.attributes.dir = getTextDirection(text);
					range.style = newStyle;		
					return range;
				}
			}
		}
		return range;
	}
	
	function enforceSTT(text, type) {
		if (isBidiEnabled() && text && type) {
			return bidiFormat.getString(text, type, {subDir : getBidiLayout()} , false, 'en');
		}
	    return text;
	}

		
	return {
		isBidiEnabled: isBidiEnabled,
		getTextDirection: getTextDirection,		
		enforceTextDirWithUcc: enforceTextDirWithUcc,
		initInputField: initInputField,
		enforceTextDir: enforceTextDir,
		enforceSTT: enforceSTT
	};
});
