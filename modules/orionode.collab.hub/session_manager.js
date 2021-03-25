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

var Client = require('./client');
var config = require('./config');
var jwt = require('jsonwebtoken');
var Request = require('request');
var Session = require('./session');

var CHECK_SESSION_URL = config.orion + config.checkSessionUrl;

/**
 * Manage sessions and their entering and leaving connections
 */
class SessionManager {

    constructor() {
        /**
         * A map from session ID to session instance
         * @type {Object.<string, Session>}
         */
        this._sessions = {};
        /**
         * A map from session ID to a list of promise functions
         * @type {Object.<string, Object>}
         */
        this._sessionWaitingClients = {};
    }

    /**
     * Add a connection to session
     * 
     * @param {string} sessionId
     * @param {Socket.io} io
     * @param {string} clientId
     * @param {string} name
     * 
     * @throws {SessionNotFoundError}
     * 
     * @return {Promise}
     */
    addConnection(sessionId, io, clientId, name) {
        var self = this;
        return new Promise(function(resolve, reject) {
            var session = self._sessions[sessionId];
            if (!session) {
                if (self._sessionWaitingClients[sessionId]) {
                    // This session is initializing
                    self._sessionWaitingClients[sessionId].push({ resolve: resolve, reject, reject });
                } else {
                    // Initialize this session
                    self._sessionWaitingClients[sessionId] = [];
                    self._sessionWaitingClients[sessionId].push({ resolve: resolve, reject, reject });
                    // Check existence
                    Request({
                        uri: CHECK_SESSION_URL + sessionId,
                        headers: {
                            Authorization: 'Bearer ' + jwt.sign({}, config.jwt_secret)
                        }
                    }, function(err, response, body) {
                        if (err || response.statusCode === 404) {
                            self._sessionWaitingClients[sessionId].forEach(function(deferred) {
                                deferred.reject('Invalid session ID.');
                            });
                            delete self._sessionWaitingClients[sessionId];
                        } else {
                            // Add new session
                            session = new Session(sessionId);
                            self._sessions[sessionId] = session;
                            self.addConnectionToSession(session, io, new Client(clientId, name));
                            self._sessionWaitingClients[sessionId].forEach(function(deferred) {
                                deferred.resolve();
                            });
                            delete self._sessionWaitingClients[sessionId];
                        }
                    });
                }
            } else { 
                self.addConnectionToSession(session, io, new Client(clientId, name));
                resolve();
            }
        });
    }

    /**
     * Add a connection to an existing session
     * 
     * @param {Session} session
     * @param {Socket.io} io
     * @param {Client} client
     */
    addConnectionToSession(session, io, client) {
        var self = this;
        session.connectionJoined(io, client);

        io.on('message', function(msg) {
            var msgObj;
            try {
                msgObj = JSON.parse(msg);
            } catch(ex) {
                io.send(JSON.stringify({
                    type: 'error',
                    error: 'Invalid JSON.'
                }));
                return;
            }
            session.onmessage(io, msgObj);
        });

        io.on('disconnect', function(msg) {
            session.connectionLeft(io, function(empty) {
                if (empty) {
                    delete self._sessions[session.sessionId];
                }
            });
        });
    }
}

/**
 * Error for non-existing session
 */
class SessionNotFoundError extends Error {
    constructor(sessionId) {
        super('Session ID ' + sessionId + ' doesn\'t exist');
    }
}

module.exports = SessionManager;
