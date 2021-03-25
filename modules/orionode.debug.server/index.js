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

var createDebugServer;
var AdapterManager;
var fs = require('fs');

/**
 * Install endpoints
 * 
 * @param {Object} options
 * @param {Express} options.app
 * @param {SocketIO.Server} options.io
 * @param {string} [options.listenPath]
 * @param {string} [options.workspaceDir]
 * @return {boolean} - success
 */
function install(options, io) {
    try {
        AdapterManager = require('./lib/adapterManager');
        createDebugServer = require('./lib/debugServer');
    } catch (ex) {
        return false;
    }
    var app = options.app;

    /** @type {Map.<string, DebugAdapter>} */
    var adapterPool = new Map();

    // Streaming files from debug adapters
    app.use('/debug/file', require('./lib/debugFile')(adapterPool));

    // Get workspace path of the Orion user when this debug server runs as a module of Orionode)
    app.get('/debug/workspacePath', function(req, res) {
        if (req.user) {
            var fullWorkspace;
            if (req.user.workspaceDir) {
                fullWorkspace = req.user.workspaceDir;
            } else {
                fullWorkspace = options.workspaceDir;
            }
            fs.realpath(fullWorkspace, function(err, realWorkspace) {
                if (err) {
                    res.send(fullWorkspace);
                } else {
                    res.send(realWorkspace);
                }
            });
        } else {
            res.sendStatus(204);
        }
    });

    // Get all available adapter types
    app.get('/debug/adapterTypes', function(req, res) {
        res.header('Content-Type', 'application/json');
        res.send(JSON.stringify(AdapterManager.types));
    });

    // Get the list of template of a specific adapter
    app.get('/debug/templates/:type', function(req, res) {
        res.header('Content-Type', 'application/json');
        res.send(JSON.stringify(AdapterManager.getTemplates(req.params.type)));
    });

    // Main logic
    io.of('/debug').on('connection', createDebugServer(adapterPool));

    return true;
}

module.exports.install = install;
