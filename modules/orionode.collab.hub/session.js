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

'use strict';

var Document = require('./document.js');
var ot = require('ot');
var parseUrl = require('url').parse;

/**
 * This class record some connection status
 */
class ConnectionStatus {
    constructor() {
        this.created = Date.now();
        this.sample = [];
        this.domains = {};
        this.urls = {};
        this.firstDomain = null;
        this.totalMessageChars = 0;
        this.totalMessages = 0;
        this.connections = 0;
    }
};

/**
* This class defines an active session.
* It includes the list of connections, list of active documents, etc.
*/
class Session {

    constructor(sessionId) {
        /** @type {Map.<Socket.io, Client>} */
        this.clients = new Map();
        this.connectionStats = new ConnectionStatus();
        /** @type {Object.<string, Document>} */
        this.docs = {};
        this.sessionId = sessionId;
    }

    /**
     * Add a connection
     * 
     * @param {Socket.io} io
     * @param {Client} client
     */
    connectionJoined(io, client) {
        this.clients.set(io, client);
        this.connectionStats.connections++;
        this.notifyAll(io, {
            type: 'client-joined',
            clientId: client.clientId,
            name: client.name,
            color: client.color
        });
    }

    /**
     * Remove a connection
     * 
     * @param {Socket.io} io
     * @param {function} callback - calls when it's done, with a boolean
     *     parameter indicates whether there is no conenctions left.
     */
    connectionLeft(io, callback) {
        var self = this;
        var client = this.clients.get(io);
        if (client) {
            this.clients.delete(io);

            this.notifyAll(io, {
                type: 'client-left',
                clientId: client.clientId
            });

            // remove the user from the document
            var doc = client.doc;
            if (doc && this.docs[doc]) {
                // check with the document if this is the last user. If so, clear the doc from memory.
                this.docs[doc].leaveDocument(io, client.clientId, function(lastPerson) {
                    if (lastPerson) {
                        self.docs[doc].destroy();
                        delete self.docs[doc];
                    }
                    callback(!self.clients.size);
                });
            } else {
                callback(!self.clients.size);
            }
        }
    }

    /**
     * Handles incoming message
     * 
     * @param {Socket.io} io
     * @param {Object} msg
     */
    onmessage(io, msg) {
        var client = this.clients.get(io);
        var self = this;

        if (msg.type === 'ping') {
            io.send(JSON.stringify({
                type: 'pong'
            }));
            return;
        }

        // if its a doc specific message, only send it to the clients involved. Otherwise send to all.
        if (msg.doc) {
            if (msg.type === 'join-document') {
                this.joinDocument(io, msg, client, msg.doc);
                client.doc = msg.doc;
            } else {
                var doc = this.docs[msg.doc];
                if (doc) {
                    doc.onmessage(io, msg, client);
                } else {
                    io.send(JSON.stringify({
                        type: 'error',
                        error: 'Invalid document ' + msg.doc
                    }));
                }
            }
        } else {
            if (msg.type === 'leave-document') {
                if (client.doc && this.docs[client.doc]) {
                    this.leaveDocument(io, msg, client);
                }
            } else if (msg.type === 'update-client') {
                if (msg.name) {
                    client.name = msg.name;
                }
                if (msg.color) {
                    client.color = msg.color;
                }
                if (msg.location !== undefined) {
                    client.location = msg.location;
                }
                if (msg.editing !== undefined) {
                    client.editing = msg.editing;
                }
                var outMsg = client.serialize();
                outMsg.type = 'client-updated';
                this.notifyAll(io, outMsg);
            } else if (msg.type === 'get-clients') {
                this.clients.forEach(function(peerClient) {
                    var outMsg = peerClient.serialize();
                    outMsg.type = 'client-joined';
                    io.send(JSON.stringify(outMsg));
                });
            } else if (msg.type === 'file-operation') {
                var outMsg = {
                    type: 'file-operation',
                    clientId: client.clientId,
                    guid: msg.guid
                }
                // Check type
                msg.data = Array.isArray(msg.data) ? msg.data.slice() : [];
                outMsg.data = msg.data;
                // Need to be careful to deal with renaming and deleting
                // because the hub server might save a file after it is deleted
                try {
                    if (msg.operation === 'created') {
                        outMsg.operation = 'created';
                        this.notifyAll(io, outMsg);
                    } else if (msg.operation === 'moved') {
                        outMsg.operation = 'moved';
                        var promises = [];
                        msg.data.forEach(function(file) {
                            promises.push(new Promise(function(resolve, reject) {
                                var from = self.convertWorkspacePathToProject(file.source);
                                var to = self.convertWorkspacePathToProject(file.result.Location);
                                if (self.docs[from] && !self.docs[from].discard) {
                                    self.docs[from].saveDocument(to).then(function() {
                                        self.docs[from].discard = true;
                                        self.docs[from].destroy();
                                        delete self.docs[from];
                                        resolve();
                                    }).catch(function() {
                                        resolve();
                                    });
                                } else {
                                    resolve();
                                }
                            }));
                        });
                        Promise.all(promises).then(function() {
                            self.notifyAll(io, outMsg);
                        });
                    } else if (msg.operation === 'deleted') {
                        outMsg.operation = 'deleted';
                        msg.data.forEach(function(file) {
                            var from = self.convertWorkspacePathToProject(file.deleteLocation);
                            if (self.docs[from] && !self.docs[from].discard) {
                                self.docs[from].discard = true;
                                self.docs[from].destroy();
                                delete self.docs[from];
                            }
                        });
                        this.notifyAll(io, outMsg);
                    } else if(msg.operation === 'copied'){
                        outMsg.operation = 'copied';
                        this.notifyAll(io, outMsg);
                    } else {
                        io.send(JSON.stringify({
                            type: 'error',
                            error: 'Invalid file operation: ' + msg.operation
                        }));
                    }
                } catch (ex) {
                    io.send(JSON.stringify({
                        type: 'error',
                        error: 'Invalid operation.'
                    }));
                    console.error(ex);
                }
            } else {
                io.send(JSON.stringify({
                    type: 'error',
                    error: 'Unknown message type: ' + msg.type
                }));
            }
        }
    }

    /**
     * Join a document
     * 
     * @param {WebSocket} io
     * @param {Object} msg
     * @param {Client} client
     * @param {string} doc
     */
    joinDocument(io, msg, client, doc) {
        if (client.doc && this.docs[client.doc]) {
            this.leaveDocument(io, msg, client);
        }
        // if we don't have the document, let's start it up.
        if (!this.docs[doc]) {
            var self = this;
            this.docs[doc] = new Document(doc, this.sessionId, this);
            this.docs[doc].startOT()
            .then(function() {
                self.docs[doc].onmessage(io, msg, client);
            });
        } else {
            this.docs[doc].onmessage(io, msg, client);
        }
    }

    /**
     * Leave the client's document
     * 
     * @param {WebSocket} io
     * @param {Object} msg
     * @param {Client} client
     */
    leaveDocument(io, msg, client) {
        var self = this;
        var doc = client.doc;
        this.docs[doc].leaveDocument(io, msg.clientId, function(lastPerson) {
            if (lastPerson) {
                self.docs[doc].destroy();
                delete self.docs[doc];
            }
        });
        client.doc = '';
    }

    /**
     * Send message to all clients
     * 
     * @param {WebSocket} io
     * @param {Object} msg
     * @param {boolean} [includeSender=false]
     */
    notifyAll(io, msg, includeSender) {
        includeSender = !!includeSender;
        var msgStr = JSON.stringify(msg);
        this.clients.forEach(function(client, conn) {
            if (conn === io && !includeSender) {
                return;
            }
            try {
                conn.send(msgStr);
            } catch (ex) {
                console.error(ex);
            }
        });
    }

    /**
     * Convert a path from workspace to project relative path
     * 
     * @example
     *     convertWorkspacePathToProject('/file/myProj/myFile.txt') === 'myProj/myFile.txt';
     * 
     * @param {string} path
     * 
     * @return {string}
     */
    convertWorkspacePathToProject(path) {
        if (path.indexOf('/file/') === 0) {
            return path.substr(6);
        } else {
            return path.split('/').slice(7).join('/');
        }
    }
}

module.exports = Session;
