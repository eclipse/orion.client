/*******************************************************************************
 * @license
 * Copyright (c) 2012, 2019 IBM Corporation and others.
 * All rights reserved. This program and the accompanying materials are made 
 * available under the terms of the Eclipse Public License 2.0 
 * (http://www.eclipse.org/legal/epl-v10.html), and the Eclipse Distribution 
 * License v1.0 (http://www.eclipse.org/org/documents/edl-v10.html). 
 * 
 * Contributors: Anton McConville - IBM Corporation - initial API and implementation
 ******************************************************************************/
/*eslint-env browser, amd*/
define(['orion/objects', 'orion/webui/littlelib'], function(objects, lib) {

	function SettingsInfo(options, node) {
		objects.mixin(this, options);
		this.node = node || document.createElement('div'); //$NON-NLS-0$
	}
	objects.mixin(SettingsInfo.prototype, {
		show: function() {
			if (this.content) {
				this.node.style.width = '500px';
				lib.setSafeInnerHTML(this.node, this.content);
				this.node.firstElementChild.style.margin = 0; // remove excess top/bottom margin from markd p
			}
        },

		destroy: function() {
			if (this.node) {
				lib.empty(this.node);
				this.node = null;
			}
		},
    });
    return SettingsInfo;
});
