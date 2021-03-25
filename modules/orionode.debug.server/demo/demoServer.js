/*******************************************************************************
 * Copyright (c) 2017 IBM Corporation and others.
 * All rights reserved. This program and the accompanying materials are made 
 * available under the terms of the Eclipse Public License 2.0 
 * (http://www.eclipse.org/legal/epl-v10.html), and the Eclipse Distribution 
 * License v1.0 (http://www.eclipse.org/org/documents/edl-v10.html). 
 *
 * Contributors:
 *	 IBM Corporation - initial API and implementation
 *******************************************************************************/

'use strict';

var path = require('path');
var express = require('express');
var http = require('http');
var socketio = require('socket.io');
var debugServer = require('../server');

// Start the standalone server
var app = express();
var server = http.createServer(app);
var io = socketio.listen(server, { 'log level': 1 });

debugServer.install({ app: app, io: io });

app.use(express.static('./demo/public'));
server.listen(3000, function() {
    console.log('Listening ' + 3000);
});
