/*******************************************************************************
 * Copyright (c) 2018 IBM Corporation and others.
 * All rights reserved. This program and the accompanying materials are made 
 * available under the terms of the Eclipse Public License 2.0 
 * (http://www.eclipse.org/legal/epl-v10.html), and the Eclipse Distribution 
 * License v1.0 (http://www.eclipse.org/org/documents/edl-v10.html). 
 *
 * Contributors:
 *	 IBM Corporation - initial API and implementation
 *******************************************************************************/
const path = require("path"),
    log4js = require('log4js'),
    net = require('net'),
	logger = log4js.getLogger("lsregistry");

var _byContentType = new Map(),
	_uninitialized = Object.create(null),
	_registeredTypes = Object.create(null);

/**
 * @name module.exports.installServer
 * @description Installs a language server with the given options
 * @function
 * @param {?} impl The implementation of the language server
 * @param {?} options The map of options to use when installing the server
 * @since 18.0
 */
module.exports.installServer = function installServer(impl, options) {
	if(!options || !options.io) {
		logger.error("Failed to install language server: no socketio implementation was given");
		return;
	}
	var socketio = options.io;
	if(typeof impl.id === 'string' && Array.isArray(impl.contentType)) {
		impl.contentType.forEach(contentType => {
			if(typeof contentType === 'string') {
				var servs = _byContentType.get(contentType);
				if(!Array.isArray(servs)) {
					servs = [];
				}
				servs.push(impl);
				_byContentType.set(contentType, servs);
				_registeredTypes[contentType] = true;
			}
		});
		//TODO should this be here, or just pass it all in to the LS and let them handle their own socket comms?
		socketio.of(impl.route).on('connect', function(socket) {
			socket.once('start', /* @callback */ function(msg) {
				impl.onStart(socket, msg, options, function(err) {
					if(err) {
						return socket.emit('error', err.message);
					}
					socket.emit('ready', JSON.stringify({workspaceDir: options.workspaceDir, processId: process.pid}));
				});
			}.bind(impl));
			socket.on('disconnect', function() {
				impl.onDisconnect(socket);
			}.bind(impl));
			socket.on('data', /* @callback */ function(data) {
                impl.onData(socket, data);
			}.bind(impl));
			socket.on('error', function(err) {
				impl.onError(err);
			}.bind(impl));
		}.bind(impl));
	}
};

/**
 * @name module.exports.findLanguageServers
 * @description Looks up all the registered language servers for the given content type
 * @function
 * @param {string} contentType The content type
 * @returns {[?]} Returns the array of language servers for the given content type or the empty array is none ara registered
 * @since 18.0
 */
module.exports.findLanguageServers = function findLanguageServers(contentType) {
	if(typeof contentType === 'string' && contentType) {
		var ls = _byContentType.get(contentType);
		if(Array.isArray(ls)) {
			return ls;
		}
	}
	return [];		
};

/**
 * @name module.exports.registeredServers
 * @description Returns the array of registered content types that have language servers available
 * @function
 * @returns {[string]} The array of content type ids that have language servers registered
 * @since 18.0
 */
module.exports.registeredServers = function registeredServers() {
	return Object.keys(_registeredTypes);	
};
