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

/*eslint-env browser, amd */
/* Initializes websocket connection */

define(['orion/EventTarget','socket.io/socket.io'], function(EventTarget, io) {
    'use strict;'

    var DEBUG = false;

    /**
     * Collab socket client
     * 
     * @class
     * @constructor
     * 
     * @param {string} sessionId
     */
	function CollabSocket(hubUrl, sessionId) {
        var self = this;
		
		this.socket = io.connect( hubUrl+ "?sessionId=" +sessionId, { path: "/socket.io/" });

        this.socket.on('connect', function() {
            self.dispatchEvent({
                type: 'ready'
            });
        });
        
        this.socket.on('disconnect', function() {
            self.dispatchEvent({
                type: 'close'
            });
        });
        
        this.socket.on('error', function(e) {
           self.dispatchEvent({
                type: 'error',
                error: e
            });
            console.error(e);
        });

        this.socket.on('message', function(data) {
            self.dispatchEvent({
                type: 'message',
                data: data
            });
            if (DEBUG) {
                var msgObj = JSON.parse(data);
                console.log('CollabSocket In: ' + msgObj.type, msgObj);
            }
        });

        EventTarget.attach(this);
	}

	CollabSocket.prototype.constructor = CollabSocket;

    /**
     * Send message
     * 
     * @param {string} message
     */
    CollabSocket.prototype.send = function(message) {
        this.socket.send(message);
        if (DEBUG) {
            var msgObj = JSON.parse(message);
            console.log('CollabSocket Out: ' + msgObj.type, msgObj);
        }
    };

    /**
     * Close this socket
     */
    CollabSocket.prototype.close = function() {
        this.socket.close();
    };

	return {
        CollabSocket: CollabSocket
    };
});
