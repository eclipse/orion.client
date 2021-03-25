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

var index = require('./index');
var config = require('./config');

/**
 * Install the module
 * 
 * @param {Express} options.app
 * @param {SocketIO.Server} options.io
 */
function install(options, io) {
    if(!index.install(options, io)) {
        console.log('Debug server is not installed. Some features will be unavailable.');
    }
}

if (require.main === module) {
    var express = require('express');
    var http = require('http');
    var socketio = require('socket.io');

    // Start the standalone server
    var app = express();
    // Enables CORS
    var enableCORS = function(req, res, next) {
        res.header('Access-Control-Allow-Origin', config.expressCorsDomain);
        res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type');
        res.header('Access-Control-Allow-Credentials', true);

        if (req.method === 'OPTIONS') {
            res.send(200);
        } else {
            next();
        }
    };

    app.use(enableCORS);

    var server = http.createServer(app);
    var io = socketio.listen(server, { 'log level': 1, origins: config.socketioCorsDomain });
    index.install({ app: app}, io);
    app.get('/', function(req, res) {
        res.sendStatus(200);
    });
    app.use(function(req, res) {
        res.sendStatus(404);
    });
    var port = process.env.PORT || config.port;
    server.listen(port);
    console.log('Listening on port ' + port + '...');
}

module.exports.install = install;
