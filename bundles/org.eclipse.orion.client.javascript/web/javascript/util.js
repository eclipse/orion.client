/*******************************************************************************
 * @license
 * Copyright (c) 2015, 2016 IBM Corporation and others.
 * All rights reserved. This program and the accompanying materials are made 
 * available under the terms of the Eclipse Public License 2.0 
 * (http://www.eclipse.org/legal/epl-v10.html), and the Eclipse Distribution 
 * License v1.0 (http://www.eclipse.org/org/documents/edl-v10.html). 
 *
 * Contributors:
 *     IBM Corporation - initial API and implementation
 *******************************************************************************/
/*eslint-env amd*/
define([
], function() {
	/**
	 * @description Returns if the given character is upper case or not considering the locale
	 * @param {String} string A string of at least one char14acter
	 * @return {Boolean} True iff the first character of the given string is uppercase
	 */
	 function isUpperCase(string) {
		if (string.length < 1) {
		return false;
		}
		if (isNaN(string.charCodeAt(0))) {
			return false;
		}
		return string.toLocaleUpperCase().charAt(0) === string.charAt(0);
	}
	
	/**
	 * @description Match ignoring case and checking camel case.
	 * @param {String} prefix
	 * @param {String} target
	 * @returns {Boolean} If the two strings match
	 */
	function looselyMatches(prefix, target) {
		if (typeof prefix !== "string" || typeof target !== "string") {
			return false;
		}

		// Zero length string matches everything.
		if (prefix.length === 0) {
			return true;
		}

		// Exclude a bunch right away
		if (prefix.charAt(0).toLowerCase() !== target.charAt(0).toLowerCase()) {
			return false;
		}

		if (startsWith(target, prefix)) {
			return true;
		}

		var lowerCase = target.toLowerCase();
		if (startsWith(lowerCase, prefix)) {
			return true;
		}
		
		var _prefix = prefix.toLowerCase();

		var equalIndex = prefix.indexOf("=");
		if (equalIndex !== -1) {
			if (startsWith(target, prefix.substring(0, equalIndex))) {
				return true;
			}
		}
		// Test for camel characters in the prefix.
		if (prefix === _prefix) {
			return false;
		}
		//https://bugs.eclipse.org/bugs/show_bug.cgi?id=473777
		if(startsWith(lowerCase, _prefix)) {
			return true;
		}
		var prefixParts = toCamelCaseParts(prefix);
		var targetParts = toCamelCaseParts(target);

		if (prefixParts.length > targetParts.length) {
			return false;
		}

		for (var i = 0; i < prefixParts.length; ++i) {
			if (!startsWith(targetParts[i], prefixParts[i])) {
				return false;
			}
		}

		return true;
	}
	
	/**
	 * @description Returns if the string starts with the given prefix
	 * @param {String} s The string to check
	 * @param {String} pre The prefix 
	 * @returns {Boolean} True if the string starts with the prefix
	 */
	function startsWith(s, pre) {
		return s.slice(0, pre.length) === pre;
	}
	
	/**
	 * @description Convert an input string into parts delimited by upper case characters. Used for camel case matches.
	 * e.g. GroClaL = ['Gro','Cla','L'] to match say 'GroovyClassLoader'.
	 * e.g. mA = ['m','A']
	 * @function
	 * @public
	 * @param {String} str
	 * @return Array.<String>
	 */
	function toCamelCaseParts(str) {
		var parts = [];
		for (var i = str.length - 1; i >= 0; --i) {
			if (isUpperCase(str.charAt(i))) {
				parts.push(str.substring(i));
				str = str.substring(0, i);
			}
		}
		if (str.length !== 0) {
			parts.push(str);
		}
		return parts.reverse();
	}
	
	var emptyAST = {
		type: "Program", //$NON-NLS-0$
		body: [],
		comments: [],
		tokens: [],
		range: [0, 0],
		loc: {
			start: {},
			end: {}
		}
	};
	
	/**
	 * @description Creates a new empty AST for the fatal thrown error case
	 * @param {Object} error The fatal error thrown while trying to parse
	 * @param {String} name The name of the file we tried to parse
	 * @param {String} text The text we tried to parse
	 * @returns {Object} An empty AST with the fatal error attached in the errors array
	 * @since 11.0
	 */
	function errorAST(error, name, text) {
		var ast = emptyAST;
		ast.range[1] = typeof text === 'string' ? text.length : 0;
		ast.loc.start.line = error.lineNumber;
		ast.loc.start.column = 0;
		ast.loc.end.line = error.lineNumber;
		ast.loc.end.column = error.column;
		ast.errors = [error];
        ast.sourceFile  = Object.create(null);
        ast.sourceFile.text = text;
        ast.sourceFile.name = name;
        return ast;
	}
	
	/**
	 * @description Makes the errors from the given AST safe to transport (using postMessage for example)
	 * @param {Object} ast The AST to serialize errors for
	 * @returns {Array.<Object>} The searialized errors
	 * @since 11.0
	 */
	function serializeAstErrors(ast) {
		var errors = [];
		if(ast && ast.errors) {
			ast.errors.forEach(function(error) {
				var result = error ? JSON.parse(JSON.stringify(error)) : error; // sanitizing Error object
				if (error instanceof Error) {
					result.__isError = true;
					result.lineNumber = typeof result.lineNumber === 'number' ? result.lineNumber : error.lineNumber; //FF fails to include the line number from JSON.stringify
					result.message = result.message || error.message;
					result.name = result.name || error.name;
					result.stack = result.stack || error.stack;
				}
				var msg = error.message;
				result.message = msg = msg.replace(/^Line \d+: /, '');
				errors.push(result);
			});
		}
		return errors;
	}

	return {
		isUpperCase: isUpperCase,
		looselyMatches: looselyMatches,
		startsWith: startsWith,
		toCamelCaseParts: toCamelCaseParts,
		errorAST: errorAST,
		serializeAstErrors: serializeAstErrors
	};
});
