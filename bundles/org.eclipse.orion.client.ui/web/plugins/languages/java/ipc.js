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
/*eslint-env amd, browser*/
define([
	"orion/Deferred",
	"socketio/socket.io"
], function(Deferred, io) {
	
	var messageTypes = {
		/**
		 * @description The initialize request is sent as the first request from the client to the server.
		 * @kind request
		 * @see https://github.com/Microsoft/language-server-protocol/blob/master/protocol.md#initialize-request
		 */
		initialize: 'initialize',
		/**
		 * @kind notification
		 * @see https://github.com/Microsoft/language-server-protocol/blob/master/protocol.md#logmessage-notification
		 */
		logMessage: 'window/logMessage',
		/**
		 * @kind notification
		 * @see https://github.com/Microsoft/language-server-protocol/blob/master/protocol.md#status-notification
		 */
		status: 'language/status'
	};
	
	/**
	 * @name IPC
	 * @description Creates a new IPC class
	 * @param {String} channel The channel
	 * @param {String} language The id of the language 
	 * @returns {IPC} A new class
	 * @since 13.0
	 */
	function IPC(channel) {
		this.socket = null;
		this.channel = channel;
		this.id = 1;
		this.requests = {};
		this.initialized = false;
		this.queue = [];
	}
	/**
	 * The collection of message types corresponding to the launguage server protocol
	 * @see https://github.com/Microsoft/language-server-protocol/blob/master/protocol.md
	 */
	IPC.prototype.MESSAGE_TYPES = messageTypes; //TODO should be a clone, not a live copy

	/**
	 * @name IPC.prototype.sendMessage
	 * @description Send a message over the socket
	 * @function
	 * @param {number} id The id of the message
	 * @param {String} message The name of the message to send
	 * @param {?} params The object of parameters for the message
	 */
	IPC.prototype.sendMessage = function sendMessage(id, message, params) {
		var json = {
			"jsonrpc": "2.0",
			"method": message,
			"params": params
		};
		if (id) {
			json.id = id;
		}
		if (!this.initialized && message !== this.MESSAGE_TYPES.initialize) {
			this.queue.push(json);
		} else {
			this.socket.emit('data', json);
		}
		if (id) {
			return this.requests[id] = new Deferred();
		}
	};
	
	/**
	 * @name _notifyListeners
	 * @description Notify the given list of listeners with the given data. If no type is given, 'data.method' will be queried. If there is no
	 * 'data.method' property, no work is done
	 * @private
	 * @param {Array.<{}>} listeners The list of listeners to notify
	 * @param {String} type The type of listener to notify 
	 * @param {?} data The data to tell the listeneres about
	 */
	IPC.prototype._notifyListeners = function _notifyListeners(type, data) {
		if (type) {
			var evt = {
				type: type,
				data: data
			};
			this.lspService.dispatchEvent(evt);
		}
	}

	/**
	 * @name IPC.prototype.connect
	 * @description Connects to the class channel name 
	 * @function
	 */
	IPC.prototype.connect = function connect() {
		var d = new Deferred();
		this.socket = io('/jdt')//.connect(this.channel);

		this.socket.on('connect', function() {
			this.socket.emit('start');
		}.bind(this));
		this.socket.on('fail', function(error) {
			console.log(error);
		});
		this.socket.on('error', function(error) {
			console.log(error);
		});
		this.socket.on('data', function(data) {
			try {
				if(!data) {
					this._notifyListeners(this.MESSAGE_TYPES.logMessage, "Dropped response with null data.");
					return;
				}
				if (data && data.id) {
					var deferred = this.requests[data.id];
					if(deferred) {
						if(data.error) {
							deferred.reject(data.error);
						} else {
							deferred.resolve(data.result);
						}
						delete this.requests[data.id];
					}
				}
				this._notifyListeners(data.method, data);
			} catch(err) {
				this._notifyListeners(this.MESSAGE_TYPES.logMessage, err.toString());
			}
		}.bind(this));
		this.socket.on('ready', function(data) {
			var pid;
			try {
				var json  = JSON.parse(data);
				this.workspaceDir = json.workspaceDir;
				pid = json.processId;
			} catch(err) {
				this._notifyListeners(this.MESSAGE_TYPES.logMessage, err.toString());
			}
			this.initialize(pid, this.workspaceDir).then(/* @callback */ function initializeCallback(result) {
				this.initialized = true;
				this.capabilities = result.capabilities;
				d.resolve(this.capabilities);
				this.queue.forEach(function queueFlushCallback(item) {
					this.socket.emit('data', item);
					this._notifyListeners(this.MESSAGE_TYPES.logMessage, JSON.stringify(item));
				}.bind(this));
				this.queue = [];
			}.bind(this));
		}.bind(this));
		return d;
	};
	
		/**
	 * @name IPC.prototype.initialize
	 * @description The initialize request is sent as the first request from the client to the server.
	 * @param {String} processId The id of the process
	 * @param {String} workspaceDir The root of the current workspace 
	 * @function
	 * @returns {Deferred} The deferred that resolves to the result of the request
	 */
	IPC.prototype.initialize = function initialize(processId, workspaceDir) {
		return this.sendMessage(this.id++, messageTypes.initialize, {
			rootPath: workspaceDir,
			processId: processId,
			capabilities: {
				textDocument: {
					completion: {
						completionItem: {
							snippetSupport: true
						}
					}
				}
			}
		});
	};

	return IPC;
});
