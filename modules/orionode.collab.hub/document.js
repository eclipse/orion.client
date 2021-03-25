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

var config = require('./config.js');
var jwt = require('jsonwebtoken');
var ot = require('ot');
var parseUrl = require('url').parse;
var Request = require('request');

var FILE_LOAD_URL = config.orion + config.fileLoadUrl;
var FILE_SAVE_URL = config.orion + config.fileSaveUrl;
var SAVE_FREQUENCY = config.saveFrequency;
var SERVER_TOKEN = jwt.sign({}, config.jwt_secret);

/**
* This class defines an active document.
* It includes document specific data about clients, deals with the OT and connects to the filesystem.
*/
class Document {

    /**
     * @param id - the doc id.
     * @param sessionId - the id of the session
     */
    constructor(id, sessionId, session) {
        /** @type {Map.<WebSocket, Client>} */
        this.clients = new Map();
        /** @type {ot.Server} */
        this.ot = null;
        this.id = id;
        this.sessionId = sessionId;
        this.awaitingDoc = false;
        this.waitingConnections = new Set();
        this.discard = false;
        this.session = session;
        this.saveTimeout = 0;
    }

    /**
     * Start OT server
     * 
     * @return {Promise}
     */
    startOT() {
        if (this.awaitingDoc) {
            return new Promise.resolve();
        }
        this.awaitingDoc = true;
        var self = this;
        return this.getDocument()
        .then(function(text, error) {
            if (error) {
                console.log('Failed to get initial content.');
            }
            self.ot = new ot.Server(text);
            console.log('OT instance started for ' + self.id);
            self.awaitingDoc = false;
            self.waitingConnections.forEach(function(c) {
                self.sendInit(c);
            });
            self.waitingConnections = new Set();
        });
    }

    /**
     * Cleanup
     */
    destroy() {
        console.log('OT instance ended for ' + this.id);
    }

    /**
     * Add a client to this document
     * 
     * @param {Socket.io} connection
     * @param {string} clientId
     * @param {Client} client
     */
    joinDocument(connection, clientId, client) {
        if (!this.clients.has(connection) && client) {
            this.clients.set(connection, client);
            client.selection = null;
        }

        var message = {
            'type': 'client-joined-doc',
            'clientId': clientId,
            'client': client,
            'doc': this.id
        };

        this.notifyOthers(connection, message);

        this.sendInit(connection);
    }

    /**
     * Remove a client from the document
     */
    leaveDocument(connection, clientId, callback) {
        var has = this.clients.has(connection);

        if (!has) {
            return;
        }

        //delete the client
        this.clients.delete(connection);

        var message = {
            'type': 'client-left-doc',
            'clientId': clientId,
            'doc': this.id
        };

        if (this.clients.size == 0) {
            this.saveDocument()
            .then(function() {
                callback(true);
            });
        } else {
            this.notifyOthers(null, message);
            callback(false);
        }
    }

    /**
     * Handle incoming message
     * 
     * @param {Socket.io} connection
     * @param {Object} msg
     * @param {Client} client
     */
    onmessage(connection, msg, client) {
        if (msg.type == 'join-document') {
            this.joinDocument(connection, msg.clientId, client);
        } else if (msg.type == 'operation') {
            try {
                var operation = this.newOperation(msg.operation, msg.revision);
                var outMsg = {
                    type: 'operation',
                    doc: this.id,
                    clientId: client.clientId,
                    operation: operation,
                    guid: msg.guid
                };
                connection.send(JSON.stringify({
                    'type': 'ack',
                    'doc': this.id
                }));
                this.notifyOthers(connection, outMsg);
            } catch (ex) {
                console.warn(ex);
                var self = this;
                this.clients.forEach(function(client, c) {
                    self.sendInit(c);
                });
            }
        } else if (msg.type == 'selection') {
            var client = this.clients.get(connection);
            if (client) {
                client.selection = msg.selection;
            }
            this.notifyOthers(connection, msg);
        } else if (msg.type == 'get-selection') {
            this.sendAllSelections(connection);
        }
    }

    /**
     * Initialize client's document
     * 
     * @param {Socket.io} c
     */
    sendInit(c) {
        var self = this;
        // if doc being grabbed by other user, add this user to waiting list for receiving it.
        if (this.awaitingDoc) {
            this.waitingConnections.add(c);
            return;
        }

        var message = JSON.stringify({
            type: 'init-document',
            operation: new ot.TextOperation().insert(this.ot.document),
            revision: this.ot.operations.length,
            doc: this.id
        }); 
        c.send(message);

        // Also send all peer selections
        this.clients.forEach(function(client) {
            c.send(JSON.stringify({
                type: 'selection',
                doc: self.id,
                clientId: client.clientId,
                selection: client.selection
            }));
        });
    }

    /**
     * Get document content
     * 
     * @return {Promise}
     */
    getDocument() {
        var self = this;
        return new Promise(function(resolve, reject) {
            Request({
                uri: FILE_LOAD_URL + self.sessionId + self.id, 
                headers: {
                    Authorization: 'Bearer ' + SERVER_TOKEN
                }
            }, function(error, response, body) {
                if (!error) {
                    resolve(body);
                } else {
                    reject(error);
                }
            });
        });
    }

    /**
     * Save this document
     * 
     * @param {string} [path] - Path to save. Default to this file. This
     *     parameter is useful when renaming a file.
     * 
     * @return {Promise}
     */
    saveDocument(path) {
        path = path || this.id;
        var self = this;
        return new Promise(function(resolve, reject) {
            if (self.discard) {
                resolve();
            }
            var headerData = {
                "Orion-Version": "1",
                "Content-Type": "text/plain; charset=UTF-8",
                "Authorization": 'Bearer ' + SERVER_TOKEN
            };
            Request({
                method: 'PUT',
                uri: FILE_SAVE_URL + self.sessionId  + path,
                headers: headerData,
                body: self.ot.document
            }, function(error, response, body) {
                if (body && !error) {
                    resolve();
                } else {
                    //reject();
                    console.error('Failed to save file ' + path);
                    resolve();
                }
            });
        });
    }

    /**
     * Send every client's selection
     * 
     * @param {Socket.io} connection
     */
    sendAllSelections(connection) {
        this.clients.forEach(function(client, clientConnection) {
            if (connection !== clientConnection) {
                connection.send(JSON.stringify({
                    clientId: client.clientId,
                    selection: client.selection
                }));
            }
        });
    }

    /**
     * Generate a transformed operation
     * This method takes a raw operation from a client, apply the operation to
     * the server and get the transformed operation.
     * 
     * @param {string} operation - opeartion JSON string
     * @param {number} revision
     * 
     * @return {ot.Operation} - transformed operation
     */
    newOperation(operation, revision) {
        var self = this;
        var operation = ot.TextOperation.fromJSON(operation);
        operation = this.ot.receiveOperation(revision, operation);
        // Save
        if (!this.saveTimeout) {
            this.saveTimeout = setTimeout(function() {
                self.saveTimeout = 0;
                self.saveDocument().then(function(success, error) {
                    if (error) {
                        console.error(error);
                    } else {
                        console.log(self.id + ' is saved.');
                    }
                })
            }, SAVE_FREQUENCY);
        }
        return operation;
    }

    /**
     * Broadcast message
     * 
     * @param {Socket.io} connection
     * @param {Object} message
     * @param {boolean} [includeSender=false]
     */
    notifyOthers(connection, message, includeSender) {
        includeSender = !!includeSender;
        var msgStr = JSON.stringify(message);
        this.session.clients.forEach(function(client, conn) {
            if (conn === connection && !includeSender) {
                return;
            }
            try {
                conn.send(msgStr);
            } catch (ex) {
                console.error(ex);
            }
        });
    }
}

module.exports = Document;
