/*******************************************************************************
 * @license
 * Copyright (c) 2015 IBM Corporation and others.
 * All rights reserved. This program and the accompanying materials are made 
 * available under the terms of the Eclipse Public License 2.0 
 * (http://www.eclipse.org/legal/epl-v10.html), and the Eclipse Distribution 
 * License v1.0 (http://www.eclipse.org/org/documents/edl-v10.html).
 *
 * Contributors:
 *     IBM Corporation - initial API and implementation
 ******************************************************************************/
/*eslint-env amd*/
define([
], function() {
	
	var pos = 0, start = 0;
	
	/**
	 * @description Creates a new node
	 * @param {Number} start The start of the node in source
	 * @returns {Node} A new node
	 * @since 10.0
	 */
	function Node(start) {
		this.start = start;
		this.end = -1;
	}
	
	Node.prototype = {
		/**
		 * @description Completes the parsing of a function signature
		 * @function
		 * @param {Node} ret The return type node
		 * @param {Array.<Node>} params The parameters
		 * @returns {Node} The completed function node
		 */
		finishFunction: function(value, ret, params) {
			this.value = value;
			this.ret = ret;
			this.params = params;
			this.end = pos;
			return this;
		},
		/**
		 * @description Completes the parsing of a type signature
		 * @function
		 * @param {Node} value The type node
		 * @returns {Node} The completed type node
		 */
		finishType: function(value) {
			this.value = value;
			this.end = pos;
			return this;
		},
		/**
		 * @description Completes the parsing of an object expression signature
		 * @param {String} value The string value of the object
		 * @param {Array.<Node>} properties The array of object properties  
		 * @returns {Node} The completed type node
		 */
		finishObject: function(value, properties) {
			this.props = properties;
			this.end = pos;
			this.value = value;
			return this;
		},
		/**
		 * @description Completes the parsing of the function parameter
		 * @function
		 * @param {String} value The name of the param
		 * @param {Node} type The parsed type of the param
		 * @returns {Node} The new param node
		 */
		finishParam: function(value, type) {
			this.value = value;
			this.type = type;
			this.end = pos;
			return this;
		},
		/**
		 * @description Completes the parsing of an object property
		 * @function
		 * @param {String} id The identifier of the property
		 * @param {Node} value The value of the node
		 * @returns {Node} The new object property
		 */
		finishProperty: function(id, value) {
			this.id = id;
			this.value = value;
			this.end = pos;
			return this;
		},
		/**
		 * @description Completes the parsing of a union type
		 * @function
		 * @param {String} value The string value of the union type
		 * @param {Array.<Node>} types The array of types that  make up the union
		 * @returns {Node} The new union type
		 */
		finishUnion: function(value, types) {
			this.types = types;
			this.end = pos;
			this.value = value;
			return this;
		}
	};
	
	function isPunc(c) {
		return c === ')' || c === ':' || c === '{' || c === '}' || c === '[' || c === ']' || c === ',' || c === '|';
	}
	
	function eatWhitespace(sig) {
		var c = sig.charAt(pos);
		while(/\s/.test(c) && pos < sig.length) {
			pos++;
			c = sig.charAt(pos);
		}
	}
	
	function lex(sig) {
		eatWhitespace(sig);
		start = pos;
		var v = '', c = sig.charAt(pos);
		while(!/\s/.test(c) && pos < sig.length) {
			if(isPunc(c)) {
				if(v.length > 0) {
					return v;
				}
				//punctuators
				pos++;
				return c;
			} else if(c === '-') {
				//might be part of return arrow, peek ahead
				if(sig.charAt(pos+1) === '>') {
					//stop
					pos += 2;
					return '->'; //$NON-NLS-1$
				}
				v += c;
				pos++;
				c = sig.charAt(pos);
			} else if(c === '(') {
				if(v === 'fn') {
					v += c;
					pos++;
					return v; //start of a function, return it
				}
				return c;
			} else if(c === '|') {
				return v;
			} else if(c === '') {
				pos++; //don't stall on empty chars
			} else {
				v += c;
				pos++;
				c = sig.charAt(pos);
			}
		}
		return v;
	}
	
	/**
	 * @description Parses a function signature
	 * @param {String} sig The signature to parse
	 * @returns {Node} The parsed node
	 */
	function parseFunction(sig) {
		var v = lex(sig), node = new Node(start);
		if(v === 'fn(') {
			var params = [];
			if(sig.charAt(pos) !== ')') { //don't lex here, peek
				parseParam(sig, params);
			}
			lex(sig); //eat the closing brace
			var ret = parseReturnType(sig);
			return node.finishFunction(sig.substring(node.start, pos), ret, params);
		}
		return null;
	}
	
	/**
	 * @name _typeOrUnion
	 * @description description
	 * @private
	 * @param sig
	 * @returns returns
	 */
	function _typeOrUnion(sig) {
		var t;
		if(sig.charAt(pos) === 'f' && sig.charAt(pos+1) === 'n' && sig.charAt(pos+2) === '(') {
			t = parseFunction(sig);
		} else {
			t = parseType(sig);
		}
		if(sig.charAt(pos) === '|') {
			t = parseUnion(t, sig);
		}
		return t;
	}
	
	/**
	 * @description Parses a function parameter from the signature
	 * @param {String} sig The original signature
	 * @param {Array.<Node>} params The array of params to add to
	 */
	function parseParam(sig, params) {
		var v = lex(sig), n = new Node(start);
		var next = lex(sig);
		if(next === ':') {
			eatWhitespace(sig);
			params.push(n.finishParam(v, _typeOrUnion(sig)));
			eatWhitespace(sig);
			if(sig.charAt(pos) === ',') {
				lex(sig); //eat the comma
				parseParam(sig, params);
			}
		}
	}
	
	/**
	 * @description Parses the return type for a function signature
	 * @param {String} sig The original signature
	 * @returns returns
	 */
	function parseReturnType(sig) {
		eatWhitespace(sig);
		if(sig.charAt(pos) === '-' && sig.charAt(pos+1) === '>') {
			lex(sig);
			eatWhitespace(sig);
			return _typeOrUnion(sig);
		} else {
			return null;
		}
	}
	
	/**
	 * @description Parses a type signature
	 * @param {String} sig The type signature
	 * @returns {Node} The parsed node
	 */
	function parseType(sig) {
		var v = lex(sig), node = new Node(start);
		if(isPunc(v)) {
			if(v === '{') {
				var c = sig.charAt(pos);
				if(c === '}') {
					lex(sig);
					return node.finishObject(sig.substring(node.start, pos), []);
				}
				var props = [];
				while(c !== '}' && pos < sig.length) {
					parseProperty(sig, props);
					c = sig.charAt(pos);
					if(c === ',') {
						lex(sig); //eat the ','
					}
				}
				lex(sig); //eat the trailing }
				return node.finishObject(sig.substring(node.start, pos), props);
			} else if(v === '[') {
				_typeOrUnion(sig);
				lex(sig); //eat the trailing ]
				return node.finishType(sig.substring(node.start, pos));
			}
			//handle starting complex types
		} else if(typeof(v) === 'string') {
			return node.finishType(v);
		}
	}
	
	/**
	 * @description Parses a union type
	 * @param {Node} type The starting type of the union
	 * @param {String} sig The original signature
	 * @returns {Node} The parsed node
	 */
	function parseUnion(type, sig) {
		var node = new Node(type.start);
		var types = [];
		types.push(type);
		var c = sig.charAt(pos);
		while(c === '|' && pos < sig.length) {
			lex(sig); //eat the |
			if(sig.charAt(pos) === 'f' && sig.charAt(pos+1) === 'n' && sig.charAt(pos+2) === '(') {
				types.push(parseFunction(sig));
			} else {
				types.push(parseType(sig));
			}
			c = sig.charAt(pos);
		}
		return node.finishUnion(sig.substring(node.start, pos), types);
	}
	
	/**
	 * @description Parses and object property
	 * @param {String} sig The original signature
	 * @param {Array/<Node>} props The array to collect the parsed property into
	 */
	function parseProperty(sig, props) {
		var v = lex(sig), node = new Node(start);
		var next = lex(sig);
		if(next === ':') {
			if(sig.charAt(pos) === 'f' && sig.charAt(pos+1) === 'n' && sig.charAt(pos+2) === '(') {
				props.push(node.finishProperty(v, parseFunction(sig)));
			} else {
				props.push(node.finishProperty(v, parseType(sig)));
			}
		}
	}
	/**
	 * @description description
	 * @param signature
	 * @returns returns
	 */
	function parse(signature) {
		start = pos = 0;
		if(!signature || typeof(signature) !== 'string') {
			return null;
		} else {
			var s = signature.trim();
			if(/^fn\(/.test(s)) {
				return parseFunction(s);
			} else {
				return parseType(s);
			}
		}
		return null;
	}

	return {
		parse: parse
	};
});
