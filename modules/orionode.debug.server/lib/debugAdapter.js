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

var cp = require('child_process');
var ProtocolServer = require('./protocol').ProtocolServer;
var DebugProtocol = require('vscode-debugprotocol');

/**
 * A debug adapter that implements the Visual Studio Code Debug Protocol
 * 
 * @see https://github.com/Microsoft/vscode-debugadapter-node/blob/master/protocol/src/debugProtocol.ts
 * 
 * @param {Object} debuggerConfig
 * @param {string} cwd
 */
var DebugAdapter = function(debuggerConfig, cwd) {
    ProtocolServer.call(this);

    var that = this;

    // Save CWD
    // We can safely do this because node is a single thread environment
    var cwdOrig = process.cwd();

    // Go to adapter CWD
    process.chdir(cwd);

    // Spawn adapter process
    var program, args;
    if (debuggerConfig.runtime) {
        program = debuggerConfig.runtime;
        args = debuggerConfig.runtimeArgs || [];
        // args = args.concat(['--debug', debuggerConfig.program]);
        args = args.concat([debuggerConfig.program]);
        args = args.concat(debuggerConfig.args || []);
    } else {
        program = debuggerConfig.program;
        args = debuggerConfig.args || [];
    }
    this._adapter = cp.spawn(program, args);
    this._adapterOn = !!this._adapter;
    this.start(this._adapter.stdout, this._adapter.stdin);
    this._adapter.stderr.on('data', function(data) {
        console.error(data.toString());
    });
    this._adapter.on('exit', function() {
        that._adapterOn = false;
        that.emit('disposed');
    });

    // Received data
    this._rawData = new Buffer(0);

    // Restore CWD
    process.chdir(cwdOrig);
};

DebugAdapter.prototype = Object.create(ProtocolServer.prototype);
DebugAdapter.prototype.constructor = DebugAdapter;

/**
 * Handle a request from the debugger
 * @param {DebugProtocol.Request} request
 */
DebugAdapter.prototype.dispatchRequest = function(request) {
    this.emit('request', request);
};

/**
 * Handle an event from the debugger
 * @param {DebugProtocol.Event} event
 */
DebugAdapter.prototype.handleEvent = function(event) {
    this.emit('event', event);
};

/**
 * Dispose the adapter.
 * Always dispose a debugger! Otherwise the subprocess won't exit.
 */
DebugAdapter.prototype.dispose = function() {
    var that = this;
    if (this._adapterOn) {
        this.sendRequest('disconnect', {
            restart: false
        }, 1000, function(response) {
            that._adapter.kill('SIGINT');
        });
    }
};

module.exports = DebugAdapter;
