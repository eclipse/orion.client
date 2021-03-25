/*******************************************************************************
 * @license
 * Copyright (c) 2017 IBM Corporation and others.
 * All rights reserved. This program and the accompanying materials are made
 * available under the terms of the Eclipse Public License 2.0
 * (http://www.eclipse.org/legal/epl-v10.html), and the Eclipse Distribution
 * License v1.0 (http://www.eclipse.org/org/documents/edl-v10.html).
 *
 * Contributors: IBM Corporation - initial API and implementation
 ******************************************************************************/

define([], function() {
	function qualifyURL(url) {
		return new URL(url, self.location.href).href;
	}
	return function(notify) {
		return qualifyURL(notify ? '../mixloginstatic/landing.html?redirect=' + encodeURIComponent(notify) + '&key=FORMOAuthUser' : '../mixloginstatic/LoginWindow.html');
	};
});
