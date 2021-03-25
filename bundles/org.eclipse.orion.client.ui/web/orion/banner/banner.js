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
 *******************************************************************************/
/*eslint-env browser, amd*/
define(['i18n!orion/nls/messages', 'orion/webui/littlelib', 'text!orion/banner/banner.html'], function(messages, lib, template) {
	
	function Banner() {
	}
	
	Banner.prototype.create = function(parentNode) {
		if (!document.getElementById("banner")) {
			var range = document.createRange();
			range.selectNode(parentNode);
			var headerFragment = range.createContextualFragment(template);
			// do the i18n string substitutions
			lib.processTextNodes(headerFragment, messages);
	
			if (parentNode.firstChild) {
				parentNode.insertBefore(headerFragment, parentNode.firstChild);
			} else {
				parentNode.appendChild(headerFragment);
			}
		}
	};
	
	return Banner;
});
