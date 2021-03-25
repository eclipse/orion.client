/*******************************************************************************
 * Copyright (c) 2013 IBM Corporation and others.
 * All rights reserved. This program and the accompanying materials are made
 * available under the terms of the Eclipse Public License 2.0
 * (http://www.eclipse.org/legal/epl-v10.html), and the Eclipse Distribution
 * License v1.0 (http://www.eclipse.org/org/documents/edl-v10.html).
 *
 * Contributors: IBM Corporation - initial API and implementation
 ******************************************************************************/

/*eslint-env browser, amd*/
/*global URL*/
define([
	'orion/objects',
	'orion/webui/littlelib',
	'orion/webui/splitter',
	'orion/URL-shim'
], function(objects, lib, mSplitter) {

	function PropertyPanelMaker(options) {
		this._parent = lib.node(options.parent);
		this._editorView = options.editorView;

		this._splitterResizeListener = function(/*e*/) {
			this._editorView.editor.resize();
		}.bind(this);
	}

	objects.mixin(PropertyPanelMaker.prototype, /** @lends orion.PropertyPanel.PropertyPanelMaker.prototype */ {
		install: function() {
			this._rootDiv = document.createElement("div"); //$NON-NLS-0$
			this._rootDiv.style.position = "absolute"; //$NON-NLS-0$
			this._rootDiv.style.width = "100%"; //$NON-NLS-0$
			this._rootDiv.style.height = "100%"; //$NON-NLS-0$
			this._parent.appendChild(this._rootDiv);

			this._editorDiv = document.createElement("div"); //$NON-NLS-0$
			this._rootDiv.appendChild(this._editorDiv);

			this._splitterDiv = document.createElement("div"); //$NON-NLS-0$
			this._splitterDiv.id = "orion.PropertyPanel.splitter";
			this._rootDiv.appendChild(this._splitterDiv);

			this._propertyWrapperDiv = document.createElement("div"); //$NON-NLS-0$
			this._propertyWrapperDiv.id = "orion.PropertyPanel.container";
			this._propertyWrapperDiv.style.overflowX = "hidden"; //$NON-NLS-0$
			this._propertyWrapperDiv.style.overflowY = "auto"; //$NON-NLS-0$
			this._rootDiv.appendChild(this._propertyWrapperDiv);

			this._splitter = new mSplitter.Splitter({
				node: this._splitterDiv,
				sidePanel: this._editorDiv,
				mainPanel: this._propertyWrapperDiv,
				toggle: true,
				vertical: true,
				closeReversely: true
			});
			this._splitter.addEventListener("resize", this._splitterResizeListener); //$NON-NLS-0$		
		},
		uninstall: function() {
			this._splitter.removeEventListener("resize", this._splitterResizeListener); //$NON-NLS-0$
			//lib.empty(this._parent);
		},
		setEditorView: function(view) {
			this._editorView = view;
			//this._editorView.setParent(this._editorDiv);
		}
	});

	return {
		PropertyPanelMaker: PropertyPanelMaker
	};
});
