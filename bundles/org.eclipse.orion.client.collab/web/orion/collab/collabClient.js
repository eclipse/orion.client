/*******************************************************************************
 * @license
 * Copyright (c) 2016, 2017 IBM Corporation and others.
 * All rights reserved. This program and the accompanying materials are made
 * available under the terms of the Eclipse Public License 2.0
 * (http://www.eclipse.org/legal/epl-v10.html), and the Eclipse Distribution
 * License v1.0 (http://www.eclipse.org/org/documents/edl-v10.html).
 *
 * Contributors: IBM Corporation - initial API and implementation
 ******************************************************************************/

/*eslint-env browser, amd */
define(['orion/collab/ot', 'orion/collab/collabFileAnnotation', 'orion/collab/otAdapters',
	'orion/collab/collabPeer', 'orion/collab/collabSocket', 'orion/collab/collabFileCommands',
	'orion/collab/collabFileEditingAnnotation'],
	function(ot, mCollabFileAnnotation, mOtAdapters, mCollabPeer, mCollabSocket, mCollabFileCommands,
		mCollabFileEditingAnnotation) {

    'use strict';

	var mAnnotations;
	var mTreeTable;
	var AT;

	var contextPath = location.pathname.substr(0, location.pathname.lastIndexOf('/edit/edit.html'));
	// This is a workaround of split window. Basically this guid let the collab client ignore all file operations and text operations from the same guid.
	// However, when there are two split windows on a same file, a text operation will still be sent twice, which needs to be fixed. (TODO)
	var guid = Math.floor(Math.random() * 0x100000000).toString(16) + '.' + Math.floor(Math.random() * 0x100000000).toString(16) + '.' + Math.floor(Math.random() * 0x100000000).toString(16) + '.' + Math.floor(Math.random() * 0x100000000).toString(16) + '.' + Math.floor(Math.random() * 0x100000000).toString(16) + '.' + Math.floor(Math.random() * 0x100000000).toString(16) + '.' + Math.floor(Math.random() * 0x100000000).toString(16) + '.' + Math.floor(Math.random() * 0x100000000).toString(16);

	function init(callback) {
		require(['orion/editor/annotations', 'orion/webui/treetable'], function(_mAnnotations, _mTreeTable) {
			mAnnotations = _mAnnotations;
			mTreeTable = _mTreeTable;
			AT = mAnnotations.AnnotationType;
			mCollabFileCommands.init(function() {
				callback();
			});
		});
	}

	var CollabFileAnnotation = mCollabFileAnnotation.CollabFileAnnotation;
	var CollabFileEditingAnnotation = mCollabFileEditingAnnotation.CollabFileEditingAnnotation;
	var OrionCollabSocketAdapter = mOtAdapters.OrionCollabSocketAdapter;
	var OrionEditorAdapter = mOtAdapters.OrionEditorAdapter;
	var CollabPeer = mCollabPeer.CollabPeer;
	
	// ms to delay updating collaborator annotation.
	// We need this delay because the annotation is updated asynchronizedly and is transferd in multiple
	// packages. We don't want the UI to refresh too frequently.
	var COLLABORATOR_ANNOTATION_UPDATE_DELAY = 50;

	var SOCKET_RECONNECT_MAX_ATTEMPT = 5;
	var SOCKET_RECONNECT_DELAY = 100;
	var SOCKET_PING_TIMEOUT = 25000;

	/**
	 * Creates a new collaboration client.
	 * @class 
	 * @name orion.collabClient.CollabClient
	 */
	function CollabClient(editor, inputManager, fileClient, serviceRegistry, commandRegistry, preferences) {
		mCollabFileCommands.createFileCommands(serviceRegistry, commandRegistry, fileClient);
		this.editor = editor;
		this.inputManager = inputManager;
		this.fileClient = fileClient;
		this.preferences = preferences;
		this.textView = this.editor.getTextView();
		var self = this;
		this.collabMode = false;
		this.clientId = '';
		this.clientDisplayedName = '';
		this.fileClient.addEventListener('Changed', self.sendFileOperation.bind(self));
		this.serviceRegistry = serviceRegistry;
		this.editor.addEventListener('InputContentsSet', function(event) {self.viewInstalled.call(self, event);});
		this.editor.addEventListener('TextViewUninstalled', function(event) {self.viewUninstalled.call(self, event);});
		this.projectSessionID = '';
		this.inputManager.addEventListener('InputChanged', function(e) {
			self.onInputChanged(e)
		});
		this.ot = null;
		this.otOrionAdapter = null;
		this.otSocketAdapter = null;
		this.socketReconnectAttempt = 0;
		this.socketIntentionalyClosing = false;
		this.socketPingTimeout = 0;
		this.awaitingClients = false;
		this.collabFileAnnotations = {};
		// Timeout id to indicate whether a delayed update has already been assigned
		this.collabFileAnnotationsUpdateTimeoutId = 0;
		/**
		 * A map of clientid -> peer
		 * @type {Object.<string, CollabPeer>}
		 */
		this.peers = {};
		this.editing = false;
		this.guid = guid;
		// Initialize current project
		var file = this.inputManager.getInput();
		var metadata = this.inputManager.getFileMetadata();
		if (metadata) {
			this.onInputChanged({
				metadata: metadata,
				input: {
					resource: file
				}
			});
		}
	}

	CollabClient.prototype = {

		/**
		 * getter of clientId
		 * @return {string}
		 */
		getClientId: function() {
			return this.clientId;
		},

		/**
		 * getter of clientDisplayedName
		 * @return {string}
		 */
		getClientDisplayedName: function() {
			return this.clientDisplayedName;
		},

		/**
		 * Initialize client name and id
		 * @param {function} callback
		 */
		initClientInfo: function(callback) {
			var self = this;
			var userService = this.serviceRegistry.getService("orion.core.user"); 
			var authServices = this.serviceRegistry.getServiceReferences("orion.core.auth");
			var authService = this.serviceRegistry.getService(authServices[0]);
			authService.getUser().then(function(jsonData) {
				userService.getUserInfo(contextPath + jsonData.Location).then(function(accountData) {
					var username = accountData.UserName;
					self.clientDisplayedName = accountData.FullName || username;
					var MASK = 0xFFFFFF + 1;
					var MAGIC = 161803398 / 2 % MASK;
					self.clientId = username + '.' + guid.substr(0, 4);
					callback();
				}, function(err) {
					console.error(err);
				});
			});
		},

		/**
		 * Input changed handler
		 */
		onInputChanged: function(e) {
			this.location = e.input.resource;
			this.updateSelfFileAnnotation();
			this.destroyOT();
			this.sendCurrentLocation();
			if (e.metadata.Attributes) {
				var projectSessionID = e.metadata.Attributes.hubID;
				if (this.projectSessionID !== projectSessionID) {
					this.projectSessionID = projectSessionID;
					this.projectChanged(projectSessionID);
				}
			}
		},

		/**
		 * Send current location to collab peers
		 */
		sendCurrentLocation: function() {
			if (this.otSocketAdapter && this.otSocketAdapter.authenticated) {
				this.otSocketAdapter.sendLocation(this.currentDoc());
			}
		},

		/**
		 * Reset the record of collaborator file annotation and request to update UI
		 */
		resetCollabFileAnnotation: function() {
			this.collabFileAnnotations = {};
			this._requestFileAnnotationUpdate();
		},

		/**
		 * Add or update a record of collaborator file annotation and request to update UI
		 * 
		 * @param {string} clientId
		 * @param {string} url
		 * @param {boolean} editing
		 */
		addOrUpdateCollabFileAnnotation: function(clientId, contextP, url, editing) {
			var peer = this.getPeer(clientId);
			// Peer might be loading. Once it is loaded, this annotation will be automatically updated,
			// so we can safely leave it blank.
			var name = (peer && peer.name) ? peer.name : 'Unknown';
			var color = (peer && peer.color) ? peer.color : '#000000';
			if (url) {
				url = contextP + this.getFileSystemPrefix() + url;
			}
			this.collabFileAnnotations[clientId] = new CollabFileAnnotation(name, color, url, this.projectRelativeLocation(url), editing);
			this._requestFileAnnotationUpdate();
		},

		/**
		 * Remove a collaborator's file annotation by id and request to update UI
		 * 
		 * @param {string} clientId -
		 */
		removeCollabFileAnnotation: function(clientId) {
			if (this.collabFileAnnotations.hasOwnProperty(clientId)) {
				delete this.collabFileAnnotations[clientId];
				this._requestFileAnnotationUpdate();
			}
		},

		/**
		 * Request a file annotation UI update
		 */
		_requestFileAnnotationUpdate: function() {
			var self = this;
			if (!this.collabFileAnnotationsUpdateTimeoutId) {
				// No delayed update is assigned. Assign one.
				// This is necessary because we don't want duplicate UI action within a short period.
				this.collabFileAnnotationsUpdateTimeoutId = setTimeout(function() {
					self.collabFileAnnotationsUpdateTimeoutId = 0;
					var annotations = [];
					var editingFileUsers = {}; // map from location to list of usernames indicating all users that are typing on this file
					for (var key in self.collabFileAnnotations) {
						if (self.collabFileAnnotations.hasOwnProperty(key)) {
							var annotation = self.collabFileAnnotations[key];
							annotations.push(annotation);
							if (annotation.editing) {
								if (!editingFileUsers[annotation.location]) {
									editingFileUsers[annotation.location] = [];
								}
								editingFileUsers[annotation.location].push(annotation.name);
							}
						}
					}
					// Add editing annotations
					for (var location in editingFileUsers) {
						if (editingFileUsers.hasOwnProperty(location)) {
							annotations.push(new CollabFileEditingAnnotation(location, editingFileUsers[location]));
						}
					}
					self.fileClient.dispatchEvent({
						type: 'AnnotationChanged',
						removeTypes: [CollabFileAnnotation],
						annotations: annotations
					});
				}, COLLABORATOR_ANNOTATION_UPDATE_DELAY);
			}
		},

		/**
		 * Determine whether a client has a file annotation
		 * 
		 * @return {boolean} -
		 */
		collabHasFileAnnotation: function(clientId) {
			return !!this.collabFileAnnotations[clientId];
		},

		/**
		 * Get the client's file annotation
		 * 
		 * @return {CollabFileAnnotation} -
		 */
		getCollabFileAnnotation: function(clientId) {
			return this.collabFileAnnotations[clientId];
		},

		/**
		 * Update the current client's file annotation
		 */
		updateSelfFileAnnotation: function() {
			if (this.collabMode) {
				this.addOrUpdateCollabFileAnnotation(this.getClientId(), contextPath, this.currentDoc(), this.editing);
			}
		},

		/**
		 * Add or update peer record
		 * 
		 * @param {CollabPeer} peer -
		 */
		addOrUpdatePeer: function(peer) {
			if (this.peers[peer.id]) {
				// Update
				this.peers[peer.id] = peer;
			} else {
				// Add
				this.peers[peer.id] = peer;
			}
			if (this.collabHasFileAnnotation(peer.id)) {
				var annotation = this.getCollabFileAnnotation(peer.id);
				this.addOrUpdateCollabFileAnnotation(peer.id, contextPath, annotation.location);
			}
			if (this.otOrionAdapter && this.textView) {
				// Make sure we have view installed
				this.otOrionAdapter.updateLineAnnotationStyle(peer.id);
			}
		},

		/**
		 * Get peer by id
		 * 
		 * @return {CollabPeer} -
		 */
		getPeer: function(clientId) {
			return this.peers[clientId];
		},

		/**
		 * Get all peers
		 */
		getAllPeers: function(clientId) {
			return this.peers;
		},

		/**
		 * Remove a peer by its ID if it exists
		 * This method also removes all the removing client's annotation
		 */
		removePeer: function(clientId) {
			if (this.peers.hasOwnProperty(clientId)) {
				delete this.peers[clientId];
				this.removeCollabFileAnnotation(clientId);
			}
		},

		/**
		 * Remove all peers
		 */
		clearPeers: function() {
			this.peers = {};
		},

		startOT: function(revision, operation, clients) {
			if (this.ot) {
				this.otOrionAdapter.detach();
			}
			var selection = this.textView.getSelection();
			this.textView.getModel().setText(operation[0], 0);
			this.textView.setSelection(selection.start, selection.end);
			this.otOrionAdapter = new OrionEditorAdapter(this.editor, this, AT);
			this.ot = new ot.EditorClient(revision, clients, this.otSocketAdapter, this.otOrionAdapter, this.getClientId());
			// Give initial cursor position
			this.otOrionAdapter.onFocus();
			this.editor.markClean();
		},

		destroyOT: function() {
			if (this.ot && this.otOrionAdapter) {
				this.otOrionAdapter.detach();
				//reset to regular undo/redo behaviour
				if (this.textView) {
					this.editor.getTextActions().init();
				}
				this.ot = null;
				if (this.otSocketAdapter) {
					var msg = {
				      'type': 'leave-document',
				      'clientId': this.getClientId()
				    };
					this.otSocketAdapter.send(JSON.stringify(msg));
				}
			}
		},

		/**
		 *  peal /shardworkspace/tree/file/user-orionContent/testfolder/testfile of /file/user-orionContent/testfolder/testfile to /user-orionContent/testfolder/testfile
		 */
		currentDoc: function() {
			var workspace = this.getFileSystemPrefix();
			return this.location.substring(this.location.indexOf(workspace) + workspace.length);
		},

		getFileSystemPrefix: function() {
			return this.location.substr(contextPath.length).indexOf('/sharedWorkspace') === 0 ? '/sharedWorkspace/tree/file' : '/file';
		},

		viewInstalled: function(event) {
			var self = this;
			var ruler = this.editor._annotationRuler;
			ruler.addAnnotationType(AT.ANNOTATION_COLLAB_LINE_CHANGED, 1);
			ruler = this.editor._overviewRuler;
			ruler.addAnnotationType(AT.ANNOTATION_COLLAB_LINE_CHANGED, 1);
			this.textView = this.editor.getTextView();
			if (this.viewFocusHandlerTarget) {
				this.viewFocusHandlerTarget.removeEventListener('Focus', this.viewFocusHandler);
				this.viewFocusHandlerTarget = this.viewFocusHandler = null;
			}
			this.textView.addEventListener('Focus', this.viewFocusHandler = function() {
				self.sendCurrentLocation();
			});
			this.viewFocusHandlerTarget = this.textView;
			if (this.otSocketAdapter) {
				this.otSocketAdapter.sendInit();
			}
		},

		viewUninstalled: function(event) {
			if (this.viewFocusHandlerTarget) {
				this.viewFocusHandlerTarget.removeEventListener('Focus', this.viewFocusHandler);
				this.viewFocusHandlerTarget = this.viewFocusHandler = null;
			}
			this.textView = null;
			this.destroyOT();
		},

		socketConnected: function() {
			var self = this;
			this.otSocketAdapter = new OrionCollabSocketAdapter(this, this.socket);
			this.socketReconnectAttempt = 0;
			if (!this.clientId) {
				this.initClientInfo(function() {
					self.otSocketAdapter.authenticate();
				});
			} else {
				this.otSocketAdapter.authenticate();
			}
			this.inputManager.syncEnabled = false;
			this.issueNextPing();
		},

		socketDisconnected: function() {
			this.socket = null;
			this.otSocketAdapter = null;
			this.inputManager.syncEnabled = true;
			this.destroyOT();
			this.resetCollabFileAnnotation();
			if (!this.socketIntentionalyClosing) {
				if (this.socketReconnectAttempt < SOCKET_RECONNECT_MAX_ATTEMPT) {
					var self = this;
					this.socketReconnectAttempt++;
					setTimeout(function() {
						self.projectChanged(self.projectSessionID);
					}, SOCKET_RECONNECT_DELAY);
				} else {
					console.error('Network error. Cannot enable collaboration feature.');
				}
			}
		},

		issueNextPing: function() {
			var self = this;
			if (this.socketPingTimeout) {
				clearTimeout(this.socketPingTimeout);
			}
			this.socketPingTimeout = setTimeout(function() {
				self.socketPingTimeout = 0;
				if (self.socket) {
					self.socket.send(JSON.stringify({
						type: 'ping'
					}));
					self.issueNextPing();
				}
			}, SOCKET_PING_TIMEOUT);
		},

		projectChanged: function(projectSessionID) {
			var self = this;
			if (this.socket) {
				// Close the current session
				this.socketIntentionalyClosing = true;
				this.socket.close();
				setTimeout(function() {
					// Polling until 'close' event is triggered
					// 'close' event won't wait for any IO operations thus
					// this.socket should be null in the next event loop 
					self.projectChanged(projectSessionID);
				}, 0);
				return;
			}
			this.socketIntentionalyClosing = false;
			// Initialize collab socket
			if (projectSessionID) {
				this.preferences.get("/collab").then(function(collabOptions) {
					self.socket = new mCollabSocket.CollabSocket(collabOptions.hubUrl, projectSessionID);
					self.socket.addEventListener('ready', function onReady() {
						self.socket.removeEventListener('ready', onReady);
						self.socketConnected();
					});
					self.socket.addEventListener('close', function onClose() {
						self.socket.removeEventListener('close', onClose);
						self.socketDisconnected();
					});
				});
				this.collabMode = true;
			} else {
				this.collabMode = false;
			}
			this.clearPeers();
			this.resetCollabFileAnnotation();
		},

		sendFileOperation: function(evt) {
			if (!this.otSocketAdapter) return;
			if (!this.ignoreNextFileOperation) {
				var operation = evt.created ? 'created' : evt.moved ? 'moved' : evt.deleted ? 'deleted' : evt.copied ? 'copied' : '';
				if (operation) {
				    var msg = {
						'type': 'file-operation',
						'operation': operation,
						'data': evt[operation],
						'clientId': this.getClientId(),
						'guid': this.fileClient.guid || this.guid
				    };
					this.otSocketAdapter.send(JSON.stringify(msg));
				}
			}
			this.ignoreNextFileOperation = false;
		},

		handleFileOperation: function(msg) {
			if (!this.ignoreNextFileOperation) {
				if (msg.guid !== guid) {
					var evt = this.makeFileClientEvent(msg.operation, msg.data);
					this.dispatchFileClientEvent(evt);
				}
			}
			this.ignoreNextFileOperation = false;
		},

		/**
		 * Make a event for FileClient by data received from peers. The event
		 * That this method made also prevent UI changes (e.g. expanding the
		 * file tree).
		 * 
		 * @param {stirng} operation
		 * @param {Array} data
		 */
		makeFileClientEvent: function(operation, data) {
			/**
			** we can't trigger the event directly since the user might be on a seperate file system.
			*/
			data = data[0];
			var evt = {
				type: 'Changed',
				silent: true
			};

			var evtData = {'select': false};

			switch (operation) {
				case 'created':
					var parentLocation = this.transformLocation(data.parent);
					var result = data.result;
					if (result) {
						result.Parents = []; //is parents even needed for this operation?
						result.Location = this.transformLocation(result.Location);
					}
					evt.created = [{'parent': parentLocation, 'result': result, 'eventData': evtData}];
					break;
				case 'deleted':
					var deleteLocation = this.transformLocation(data.deleteLocation);
					evt.deleted = [{'deleteLocation': deleteLocation, 'eventData': evtData}];
					break;
				case 'moved':
					var sourceLocation = this.transformLocation(data.source);
					var targetLocation = this.transformLocation(data.target);
					var result = data.result;
					result.Parents = []; //is parents even needed for this operation?
					result.Location = this.transformLocation(result.Location);
					evt.moved = [{'source': sourceLocation, 'target': targetLocation, 'result': result, 'eventData': evtData}];
					break;
				case 'copied':
					var sourceLocation = this.transformLocation(data.source);
					var targetLocation = this.transformLocation(data.target);
					var result = data.result;
					result.Parents = []; //is parents even needed for this operation?
					result.Location = this.transformLocation(result.Location);
					evt.copied = [{'source': sourceLocation, 'target': targetLocation, 'result': result, 'eventData': evtData}];
					break;
			}

			return evt;
		},

		/**
		 * For example we need to convert a '/file/web-orionContent/potato.js' to '/sharedWorkspace/tree/file/web-orionContent/potato.js'
		 * and vice-versa, depending on our file system and the sender's filesystem.
		 */
		transformLocation: function(location) { //Location = "/file/orders-api-uselessTesting_X/app.js"
			var filePath = location.replace(/^.*\/file/, "");
			var loc = this.getFileSystemPrefix();
			return contextPath + loc + filePath;
		},

		/*
		 *  Generate the location string for the tooltip for each collabrator.
		 */
		projectRelativeLocation: function(location) {
			if (location.substr(contextPath.length).indexOf('/file/') === 0) {
				// Local workspace
				return location.substr(contextPath.length).split("/").slice(3).join('/')
			} else {
				// Shared workspace
				return location.substr(contextPath.length).split('/').slice(5).join('/');
			}
		},

		dispatchFileClientEvent: function(evt) {
			this.ignoreNextFileOperation = true;
			this.fileClient.dispatchEvent(evt);
		}
	};

	CollabClient.prototype.constructor = CollabClient;

	return {
		CollabClient: CollabClient,
		init: init
	};
});
