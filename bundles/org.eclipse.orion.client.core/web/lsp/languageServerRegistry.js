/*******************************************************************************
 * @license
 * Copyright (c) 2016, 2017 IBM Corporation and others.
 * All rights reserved. This program and the accompanying materials are made
 * available under the terms of the Eclipse Public License 2.0
 * (http://www.eclipse.org/legal/epl-v10.html), and the Eclipse Distribution
 * License v1.0 (http://www.eclipse.org/org/documents/edl-v10.html).
 *
 * Contributors:
 *     IBM Corporation - initial API and implementation
 *******************************************************************************/
/*eslint-env amd, es6*/
define([
	"lsp/languageServer"
], function(LanguageServer) {

	var _registry,
		_srvcreg,
		_contentTypes,
		_markerServiceID;

	/**
	 * @name LanguageServerRegistry
	 * @description The registry of all available language servers, cached by language ID
	 * @param {?} serviceRegistry The backing Orion service registry
	 * @returns {LanguageServerRegistry} A new instance of the registry
	 * @since 13.0
	 */
	function LanguageServerRegistry(serviceRegistry, markerServiceID) {
		_srvcreg = serviceRegistry;
		_markerServiceID = markerServiceID;
	}

	LanguageServerRegistry.prototype = {
		/**
		 * @name LanguageServerRegistry.prototype.init
		 * @description Initialize the language server registry if not already initialized
		 * @function
		 */
		init: function init() {
			if (!_registry && !_contentTypes && _srvcreg) {
				var srvcs = _srvcreg.getServiceReferences("orion.languages.server");
				if (srvcs) {
					_registry = new Map(); //map by languageId
					_contentTypes = new Map(); //map by contentTypes
					srvcs.forEach(function(ref) {
						var id = ref.getProperty("languageId"),
							contentTypes = ref.getProperty("contentType");
						if (id && contentTypes) {
							var languageServer = new LanguageServer(ref, id, _srvcreg, _markerServiceID);
							if (Array.isArray(contentTypes)) {
								for (var i = 0, max = contentTypes.length; i < max; i++) {
									_contentTypes.set(contentTypes[i], languageServer);
								}
							} else {
								_contentTypes.set(contentTypes, languageServer);
							}
							_registry.set(id, LanguageServer);
						}
					});
				}
			}
		},
		/**
		 * @name LanguageServerRegistry.prototype.getServerById
		 * @description Returns the registered language server for the given language id
		 * @function
		 * @param {String} languageId The id of the language to look for a server for
		 * @returns {LanguageServer} A language server impl - if one is mapped, null otherwise
		 */
		getServerById: function getServerById(languageId) {
			this.init();
			var value = _registry.get(languageId);
			return value ? value : null;
		},
		/**
		 * @name LanguageServerRegistry.prototype.getServerByContentType
		 * @description Returns the registered language server for the given content type
		 * @function
		 * @param {String} contentType The content type to look for a server for
		 * @returns {LanguageServer} A language server impl - if one is mapped
		 */
		getServerByContentType: function getServerByContentType(contentType) {
			if (!contentType) {
				return null;
			}
			this.init();
			var value = _contentTypes.get(contentType.id);
			return value ? value : null;
		}
	};

	return {
		LanguageServerRegistry: LanguageServerRegistry
	};
});
