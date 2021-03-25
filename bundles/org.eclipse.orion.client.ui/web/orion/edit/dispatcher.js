/*******************************************************************************
 * @license
 * Copyright (c) 2011, 2012 IBM Corporation and others.
 * All rights reserved. This program and the accompanying materials are made
 * available under the terms of the Eclipse Public License 2.0
 * (http://www.eclipse.org/legal/epl-v10.html), and the Eclipse Distribution
 * License v1.0 (http://www.eclipse.org/org/documents/edl-v10.html).
 *
 * Contributors: IBM Corporation - initial API and implementation
 ******************************************************************************/
/*eslint-env browser, amd*/
define([], function() {
	/**
	 * @name orion.edit.Dispatcher
	 * @class Forwards events from an {@link orion.editor.Editor} to interested services.
	 * @param {orion.serviceregistry.ServiceRegistry} serviceRegistry
	 * @param {orion.core.ContentTypeRegistry}
	 * @param {orion.editor.Editor} editor
	 * @param {orion.editor.InputManger} inputManager
	 */
	function Dispatcher(serviceRegistry, contentTypeRegistry, editor, inputManager) {
		this.serviceRegistry = serviceRegistry;
		this.editor = editor;
		this.inputManager = inputManager;
		this.ctRegistry = contentTypeRegistry;
		this.serviceReferences = {};

		var that = this;
		this.inputManager.addEventListener("InputChanged", function(e) {
			that.contentType = e.contentType;
			that.updateListeners();
		}.bind(this));
		this.listener = {
			onServiceAdded: function(evnt) {
				that._onServiceAdded(evnt.serviceReference);
			},
			onServiceRemoved: function(evnt) {
				that._onServiceRemoved(evnt.serviceReference);
			}
		};
		this.serviceRegistry.addEventListener("registered", this.listener.onServiceAdded);
		this.serviceRegistry.addEventListener("unregistering", this.listener.onServiceRemoved);
	}
	Dispatcher.prototype = /** @lends orion.edit.Dispatcher.prototype */ {
		updateListeners: function() {
			this._removeAllListeners();

			var serviceRegistry = this.serviceRegistry,
			    serviceRefs = serviceRegistry.getServiceReferences("orion.edit.model"); //$NON-NLS-0$
			for (var i=0; i < serviceRefs.length; i++) {
				this._wireServiceReference(serviceRefs[i]);
			}
		},
		_wireServiceReference: function(serviceRef) {
			var refContentType = serviceRef.getProperty("contentType"); //$NON-NLS-0$
			if (typeof refContentType !== "undefined" && refContentType !== null) {
				// See if the registered service is interested in the current ContentType.
				var _self = this;
				var inputContentType = this.contentType;
				if (this.ctRegistry.isSomeExtensionOf(inputContentType, refContentType)) {
					_self._wireService(serviceRef, _self.serviceRegistry.getService(serviceRef));
				}
			}
		},
		_wireService: function(serviceReference, service) {
			var textView = this.editor.getTextView();
			if (!textView)
				throw new Error("TextView not installed"); //$NON-NLS-1$
			var keys = Object.keys(service);
			for (var i=0; i < keys.length; i++) {
				var key = keys[i], method = service[key];
				if (key.substr(0, 2) !== "on" || typeof method !== "function") {
					continue;
				}
				var type = key.substr(2);
				this._wireServiceMethod(serviceReference, service, method, textView, type);
			}
		},
		/**
		 * @callback
		 */
		_wireServiceMethod: function(serviceReference, service, serviceMethod, textView, type) {
//			console.log("  Add listener " + type + " for " + serviceReference.getProperty('service.id'));
			var _self = this;
			var listener = function(evnt) {
				// Inject metadata about the file being edited into the event.
				evnt.file = _self.getServiceFileObject();
				serviceMethod(evnt).then(/*No return value*/);
			};
			var serviceId = serviceReference.getProperty('service.id'); //$NON-NLS-0$
			this.serviceReferences[serviceId] = this.serviceReferences[serviceId] || [];
			this.serviceReferences[serviceId].push([textView, type, listener]);
			textView.addEventListener(type, listener);
		},
		_onServiceRemoved: function(serviceReference) {
			var serviceId = serviceReference.getProperty('service.id'); //$NON-NLS-1$
			this._removeListeners(serviceId);
		},
		_onServiceAdded: function(serviceReference) {
			if (serviceReference.getProperty("objectClass").indexOf("orion.edit.model") !== -1) { //$NON-NLS-0$ //$NON-NLS-2$
				this._wireServiceReference(serviceReference);
			}
		},
		_removeListeners: function(serviceId) {
			var serviceReferences = this.serviceReferences[serviceId];
			if (serviceReferences) {
				for (var i=0; i < serviceReferences.length; i++) {
					var listener = serviceReferences[i];
					var textView = listener[0], type = listener[1], func = listener[2];
//					console.log("  Remove listener " + type + " for " + serviceId);
					textView.removeEventListener(type, func);
				}
				delete this.serviceReferences[serviceId];
			}
		},
		_removeAllListeners: function() {
			var keys = Object.keys(this.serviceReferences);
			for (var i=0; i < keys.length; i++) {
				this._removeListeners(keys[i]);
			}
		},
		/**
		 * @since 8.0
		 */
		getServiceFileObject: function() {
			var metadata = this.inputManager.getFileMetadata();
			if (!metadata) {
				return null;
			}
			return Dispatcher.toServiceFileObject(metadata, this.inputManager.getContentType());
		}
	};

	/**
	 * @since 8.0
	 */
	Dispatcher.toServiceFileObject = function(metadata, contentType) {
		var data = Object.create(null);
		data.name = metadata.Name;
		data.location = metadata.Location;
		data.parents = metadata.Parents;

		if (contentType) {
			data.contentType = Object.create(null);
			data.contentType.id = contentType.id;
			data.contentType.name = contentType.name;
			data.contentType.imageClass = contentType.imageClass;
			data.contentType.extension = contentType.extension;
		}
		return data;
	};

	return {Dispatcher: Dispatcher};
});
