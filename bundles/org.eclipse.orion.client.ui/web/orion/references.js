/*******************************************************************************
 * @license
 * Copyright (c) 2017 IBM Corporation and others.
 * All rights reserved. This program and the accompanying materials are made 
 * available under the terms of the Eclipse Public License 2.0 
 * (http://www.eclipse.org/legal/epl-v10.html), and the Eclipse Distribution 
 * License v1.0 (http://www.eclipse.org/org/documents/edl-v10.html). 
 *
 * Contributors:
 *     IBM Corporation - initial API and implementation
 *******************************************************************************/
/*eslint-env browser, amd*/
/*eslint-disable no-implicit-coercion */
define([], function() {

	/**
	 * @name References
	 * @description Creates a new instance of the References command
	 * @constructor
	 * @param {ServiceRegistry} serviceRegistry The backing service registry
	 * @param {InputManager} inputManager The backing input manager to get content type information from
	 * @param {EditorView} editor The editor view to work against
	 * @since 17.0
	 */
	function References(serviceRegistry, inputManager, editor) {
		this.serviceRegistry = serviceRegistry;
		this.inputManager = inputManager;
		this.editor = editor;
	}

	function _getDelegate(data) {
		var inputManagerContentType = data.inputManager.getContentType();
		var refs = data.serviceRegistry.getServiceReferences("orion.edit.references");
		for (var i = 0; i < refs.length; i++) {
			var serviceReference = refs[i];
			var contentTypes = serviceReference.getProperty("contentType");
			if (inputManagerContentType && inputManagerContentType.id) {
				var inputContentType = inputManagerContentType.id;
				if (Array.isArray(contentTypes)) {
					for (var j = 0, max = contentTypes.length; j < max; j++) {
						if (contentTypes[j] === inputContentType) {
							return data.serviceRegistry.getService(serviceReference);
						}
					}
				} else if (inputContentType === contentTypes) {
					return data.serviceRegistry.getService(serviceReference);
				}
			}
		}
		return null;
	}
	
	References.prototype = {
		/**
		 * @name isVisible
		 * @description Returns if this command should be visible or not
		 * @function
		 * @returns {boolean} 'true' if there is a delegate for the backing content type, 'false' otherwise
		 */
		isVisible: function isVisible() {
			return !!_getDelegate(this);
		},
		/**
		 * @name findReferences
		 * @description The delegate function that calls the service contribution
		 * @function
		 * @returns {[{?}]} The array of reference objects
		 */
		findReferences: function findReferences() {
			var service = _getDelegate(this);
			if (service) {
				var selection = this.editor.getSelection();
				var context = {
					start: selection.start,
					end: selection.end,
					offset: selection.start
				};
				return service.findReferences(this.editor.getEditorContext(), context);
			}
		}
	};
	return {
		References: References
	};
});
