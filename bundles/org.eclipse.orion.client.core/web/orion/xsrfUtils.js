/*******************************************************************************
 * Copyright (c) 2014 SAP AG and others.
 * All rights reserved. This program and the accompanying materials
 * are made available under the terms of the Eclipse Public License 2.0
 * which accompanies this distribution, and is available at
 * http://www.eclipse.org/legal/epl-v10.html
 *
 * Contributors:
 *     SAP AG - initial API and implementation
 *******************************************************************************/
define([],function(){
	var XSRF_TOKEN = "x-csrf-token";//$NON-NLS-0$

	/**
	 * extracts value of xsrf cookie if available
	 */
	function getCSRFToken() {
		if (typeof document === "undefined") return null;
		var cookies = document.cookie.split(";");//$NON-NLS-0$

		var i,n,v;
		for(i = 0; i<cookies.length; i++) {
			n = cookies[i].substr(0, cookies[i].indexOf("=")).trim();//$NON-NLS-0$
			v = cookies[i].substr(cookies[i].indexOf("=") + 1).trim();//$NON-NLS-0$

			if(n.endsWith(XSRF_TOKEN)) {
				return v;
			}
		}
	}

	/**
	 * adds xsrf nonce to header if set in cookies
	 * @param {Object} request header
	 */
	function setNonceHeader(headers) {
		var token = getCSRFToken();
		if (token) {
			headers[XSRF_TOKEN] = token;
		}
	}

	/**
	 * adds xsrf nonce to an XMLHTTPRequest object if set in cookies
	 * @param {Object} XMLHttpRequest object
	 */
	function addCSRFNonce(request) {
		var token = getCSRFToken();
		if(token) {
			request.setRequestHeader(XSRF_TOKEN, token);
		}
	}

	return {
		XSRF_TOKEN: XSRF_TOKEN,
		getCSRFToken: getCSRFToken,
		setNonceHeader: setNonceHeader,
		addCSRFNonce: addCSRFNonce
	};
});
