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

/*eslint-env browser, amd*/
define([
    'i18n!orion/debug/nls/messages',
	'socket.io/socket.io',
	'orion/Deferred',
	'orion/i18nUtil',
	'orion/EventTarget',
    'orion/debug/breakpoint'
], function(messages, io, Deferred, i18nUtil, EventTarget, mBreakpoint) {

    'use strict';

    var DEBUG = false;

    var ID_INCREMENT = 0;

    var CONTEXT_PATH = new URL('..', location.href).pathname;

    /**
     * A map from id to a socket instance
     * @type {Object.<int, orion.debug.DebugSocket>}
     */
    var debugSockets = {};

    /**
     * A debug socket provides the interface between orion and orion debug server.
     * 
     * @class {orion.debug.DebugSocket}
     * 
     * @see https://github.com/Microsoft/vscode-debugadapter-node/blob/master/protocol/src/debugProtocol.ts
     * @fires {StatusEvent} - Reports the debugger's status (idle, running or paused)
     * @fires {DebugProtocol.Event} event - Events from the debug adapter
     * @fires {CapabilitiesEvent} - Reports the capabilities of the current adapter
     * 
     * @param {orion.serviceregistry.ServiceRegistry} serviceRegistry
     */
    var DebugSocket = function(serviceRegistry) {
        EventTarget.attach(this);
        this._id = ID_INCREMENT++;
        debugSockets[this._id] = this;
        this._debugService = serviceRegistry.getService('orion.debug.service');
        this._messageService = serviceRegistry.getService('orion.page.message');
		this._socket = null;
        this._connectionId = undefined;
        this.supportsConfigurationDoneRequest = false;
        this.supportsConditionalBreakpoints = false;
        this.supportsEvaluateForHovers = false;

        this._launched = false;
        this._remoteRoot = '';
        this._localRoot = '';
        this._status = StatusEvent.STATUS.IDLE;
        this._project = null;

        this._frameId = undefined;

        this._breakpointModifiedHandler = this._handleBreakpointModified.bind(this);
        this._debugService.addEventListener('BreakpointAdded', this._breakpointModifiedHandler);
        this._debugService.addEventListener('BreakpointRemoved', this._breakpointModifiedHandler);
        this._debugService.addEventListener('BreakpointEnabled', this._breakpointModifiedHandler);
        this._debugService.addEventListener('BreakpointDisabled', this._breakpointModifiedHandler);
    };

    /**
     * Destroy this socket.
     * Unused.
     */
    DebugSocket.prototype.destroy = function() {
        if (this._socket) {
            this.disconnect();
        }
        delete debugSockets[this._id];
        this._debugService.removeEventListener('BreakpointAdded', this._breakpointModifiedHandler);
        this._debugService.removeEventListener('BreakpointRemoved', this._breakpointModifiedHandler);
        this._debugService.removeEventListener('BreakpointEnabled', this._breakpointModifiedHandler);
        this._debugService.removeEventListener('BreakpointDisabled', this._breakpointModifiedHandler);
    };

    /**
     * Getter of ID
     * @return {string}
     */
    DebugSocket.prototype.getId = function() {
        return this._id.toString();
    };

    /**
     * Set project
     * @param {Object} project
     */
    DebugSocket.prototype.setProject = function(project) {
        this._project = project;
    };

    /**
     * Launch a debug target
     * 
     * @param {Object} config - launch config
     */
    DebugSocket.prototype.launch = function(config) {
        var that = this;
        if (this._socket) {
            throw new Error('Cannot launch multiple targets.');
        }

        // Make a clone
        config = JSON.parse(JSON.stringify(config));

        console.assert(this._project);
        this._remoteRoot = config.remoteRoot.replace(/\/$/, '');
        this._localRoot = this._project.Location.replace(/\/$/, '');

        var serverUrl = config.remote ? new URL(config.debugServer) : new URL('..', location.href);
        var socketioHost = serverUrl.protocol + '//' + serverUrl.host;
        var socketioPath = serverUrl.pathname.replace(/\/$/, '') + '/socket.io';
		this._socket = io.connect(socketioHost + '/debug', { path: socketioPath });

        config.launchArguments.type = config.type;
        config.launchArguments.request = 'launch';

        this._socket.on('connect', /** @this SocketIO.client */ function() {
            if (!that._socket) {
                // An unexpected reconnection
                this.disconnect();
                return;
            }
            that.dispatchEvent(new LaunchEvent());
            // Launch adapter
            that.setStatus(StatusEvent.STATUS.RUNNING);
            that._socket.emit('init', that._getInitCmd(config.type), function(response) {
                if (!response.success) {
                    that.disconnect();
                    that._reportError(response.message);
                } else {
                    that._setCapabilities(response.body);
                    that.dispatchEvent(new CapabilitiesEvent(response.body));
                }
                if (DEBUG) {
                    console.info('Response:', response);
                }
            });
        });

        this._socket.on('disconnect', function() {
            that._socket = null;
            that._connectionId = undefined;
            that.setStatus(StatusEvent.STATUS.IDLE);
        });

        this._socket.on('ready', function(connectionId) {
            that._connectionId = connectionId;
            // Launch target
            that.request('launch', config.launchArguments, function(response) {
                if (!response.success) {
                    that.disconnect();
                    that._reportError(response.message);
                }
            });
        });

        this._socket.on('fail', function(err) {
            that._reportError(err);
            that.disconnect();
        });

        this._socket.on('event', function(event) {
            that.dispatchEvent(event);
            if (DEBUG) {
                console.info('Event:', event);
            }
        });
    };

    /**
     * Setter of status
     * @param {StatusEvent.Status} status
     */
    DebugSocket.prototype.setStatus = function(status) {
        this._status = status;
        this.dispatchEvent(new StatusEvent(status));
    };

    /**
     * Setter of status
     * @return {StatusEvent.Status}
     */
    DebugSocket.prototype.getStatus = function() {
        return this._status;
    };

    /**
     * Make a request
     * @see https://github.com/Microsoft/vscode-debugadapter-node/blob/master/protocol/src/debugProtocol.ts
     * @param {string} command
     * @param {Object} args
     * @param {function} callback
     */
    DebugSocket.prototype.request = function(command, args, callback) {
        if (!args) {
            args = {};
        }
        var request = {
            "command": command,
            "arguments": args
        };
        if (DEBUG) {
            console.info('Request:', request);
        }
        this._socket.emit('request', request, function(response) {
            if (DEBUG) {
                console.info('Response:', response);
            }
            if (callback) {
                callback(response);
            }
        });
    };

    /**
     * Disconnect from debug server
     */
    DebugSocket.prototype.disconnect = function() {
        this._socket.disconnect();
    };

    /**
     * Convert absolute source path to relative project path
     * @param {string} path - absolute path
     * @return {string} - project path
     */
    DebugSocket.prototype.absoluteToProjectPath = function(path) {
        var project = path.startsWith(this._remoteRoot) ? this._localRoot + path.substr(this._remoteRoot.length) : path;
        if (!this._remoteRoot.startsWith('/')) {
            // Windows
            project = project.replace('\\', '/');
        }
        return project;
    };

    /**
     * Convert relative project path to absolute source path
     * @param {string} path - project path
     * @return {string} - absolute path
     */
    DebugSocket.prototype.projectToAbsolutePath = function(path) {
        var absolute = path.startsWith(this._localRoot) ? this._remoteRoot + path.substr(this._localRoot.length) : path;
        if (!this._remoteRoot.startsWith('/')) {
            // Windows
            absolute = absolute.replace('/', '\\');
        }
        return absolute;
    };

    /**
     * Get ID
     * @return {int}
     */
    DebugSocket.prototype.getId = function() {
        return this._id;
    };

    /**
     * Get conenction ID
     * @return {string}
     */
    DebugSocket.prototype.getConnectionId = function() {
        return this._connectionId;
    };

    /**
     * Config the adapter (set breakpoints)
     * 
     * @param {function} callback
     */
    DebugSocket.prototype.config = function(callback) {
        var that = this;
        this._debugService.getBreakpointsByPrefix(this._localRoot).then(function(breakpointsByLocation) {
            var i = -1;
            var locations = Object.keys(breakpointsByLocation);
            // TODO (maybe): send breakpoint requests concurrently to improve performance
            var setNext = function(response) {
                if (++i >= locations.length) {
                    that._debugService.getGlobalBreakpoints().then(function(breakpoints) {
                        that._setExceptionBreakpoints(breakpoints, function() {
                            callback();
                        });
                    });
                    return;
                }
                that._setBreakpointsForFile(locations[i], breakpointsByLocation[locations[i]], setNext);
            };
            setNext();
        });
    };

    /**
     * Set frame ID
     * @param {number} frameId
     */
    DebugSocket.prototype.setFrameId = function(frameId) {
        this._frameId = frameId;
    };

    /**
     * Whether this debug socket can evaluate (i.e. connected to a debugger)
     * @return {boolean}
     */
    DebugSocket.prototype.canEvaluate = function() {
        return this._socket && this._frameId;
    };

    /**
     * Evaluate an expression
     * @param {string} expression
     * @param {string} context - one of "watch", "hover" and "repl"
     * @param {function} callback - the first argument will be the result of this evaluation
     */
    DebugSocket.prototype.evaluate = function(expression, context, callback) {
        if (this.canEvaluate()) {
            if (context === 'hover' && !this.supportsEvaluateForHovers) {
                // context = 'watch';
                console.log('Warning: this debug adapter doesn\'t support side effect free hover evaluation');
            }
            this.request('evaluate', {
                expression: expression,
                frameId: this._frameId,
                context: context
            }, function(response) {
                if (response.success) {
                    callback(response.body);
                } else {
                    callback(null);
                }
            });
        } else {
            callback(null);
        }
    };

    /**
     * Set breakpoints for a file
     * @private
     * @param {string} location
     * @param {Array.<orion.debug.IBreakpoint>} breakpoints
     * @param {function=} callback - take the first parameter as the response
     */
    DebugSocket.prototype._setBreakpointsForFile = function(location, breakpoints, callback) {
        console.assert(this._socket);
        var that = this;
        callback = callback || function() { };
        var plainBreakpoints = [];
        var lines = []; // Deprecated lines property. For backward compatibility only.
        var supportsConditionalBreakpoints = this.supportsConditionalBreakpoints;
        breakpoints.forEach(function(breakpoint) {
            if (breakpoint instanceof mBreakpoint.LineBreakpoint) {
                if (breakpoint.enabled) {
                    plainBreakpoints.push({
                        line: breakpoint.line
                    });
                    lines.push(breakpoint.line);
                }
            } else if (breakpoint instanceof mBreakpoint.LineConditionalBreakpoint) {
                if (supportsConditionalBreakpoints && breakpoint.enabled) {
                    plainBreakpoints.push({
                        line: breakpoint.line,
                        condition: breakpoint.condition
                    });
                }
            }
        });
        var source;
        if (location.startsWith(CONTEXT_PATH + '/debug')) {
            var reference = parseInt(location.substr(CONTEXT_PATH.length).split('/')[4], 10);
            if (!isFinite(reference)) {
                reference = 0; // invalid
            }
            source = {
                sourceReference: reference
            };
        } else {
            source = {
                path: this.projectToAbsolutePath(location)
            };
        }
        this.request('setBreakpoints', {
            source: source,
            breakpoints: plainBreakpoints,
            lines: lines
        }, function(response) {
            // TODO: verify the breakpoint
            if (!response.success) {
                that._reportError(i18nUtil.formatMessage(messages['FailedToSetBreakpointAt${0}'], location));
            } else {
                response.body.breakpoints.forEach(function(breakpoint) {
                    if (!breakpoint.verified) {
                        that._reportError(i18nUtil.formatMessage(messages['${0}:${1}IsNotAValidBreakpoint'], location, breakpoint.line));
                    }
                });
            }
            callback();
        });
    };


    /**
     * Set exception breakpoints
     * @private
     * @param {Array.<orion.debug.IBreakpoint>} breakpoints
     * @param {function=} callback - take the first parameter as the response
     */
    DebugSocket.prototype._setExceptionBreakpoints = function(breakpoints, callback) {
        var that = this;
        callback = callback || function() { };
        var filters = [];
        breakpoints.forEach(function(breakpoint) {
            if (breakpoint instanceof mBreakpoint.ExceptionBreakpoint && breakpoint.enabled) {
                for (var i = 0; i < that.exceptionBreakpointFilters.length; i++) {
                    if (that.exceptionBreakpointFilters[i].filter === breakpoint.label) {
                        filters.push(breakpoint.label);
                        break;
                    }
                }
            }
        });
        if (filters.length > 0) {
            this.request('setExceptionBreakpoints', {
                filters: filters
            }, function(response) {
                if (!response.success) {
                    that._reportError(messages['FailedToSetExceptionBreakpoints']);
                }
                callback();
            });
        } else {
            callback();
        }
    };

    /**
     * Handle breadpoint added event
     * @private
     * @param {Object} e
     */
    DebugSocket.prototype._handleBreakpointModified = function(e) {
        if (!this._socket) {
            return;
        }
        var that = this;
        var breakpoint = e.breakpoint;
        if (breakpoint instanceof mBreakpoint.LineBreakpoint || breakpoint instanceof mBreakpoint.LineConditionalBreakpoint) {
            var location = breakpoint.location;
            this._debugService.getBreakpointsByLocation(location).then(function(breakpoints) {
                that._setBreakpointsForFile(location, breakpoints);
            });
        } else if (breakpoint instanceof mBreakpoint.ExceptionBreakpoint) {
            this._debugService.getGlobalBreakpoints(location).then(function(breakpoints) {
                that._setExceptionBreakpoints(breakpoints);
            });
        }
    };

    /**
     * Set adapter capabilities
     * @param {Object} capabilities
     */
    DebugSocket.prototype._setCapabilities = function(capabilities) {
        this.supportsConfigurationDoneRequest = !!capabilities.supportsConfigurationDoneRequest;
        this.supportsConditionalBreakpoints = !!capabilities.supportsConditionalBreakpoints;
        this.supportsEvaluateForHovers = !!capabilities.supportsEvaluateForHovers;
        this.exceptionBreakpointFilters = capabilities.exceptionBreakpointFilters || [];
    };

    /**
     * Get command for initialization
     * @private
     * @param {string} type - type of debugger
     * @return {Oject} - initialization command
     */
    DebugSocket.prototype._getInitCmd = function(type) {
        return {
            "command": "initialize",
            "arguments": {
                "clientID": "orion",
                "adapterID": type,
                "pathFormat": "path",
                "linesStartAt1": false,
                "columnsStartAt1": false,
                "supportsVariableType": true,
                "supportsVariablePaging": false,
                "supportsRunInTerminalRequest": false
            }
        };
    };

    /**
     * Report an error
     * @private
     * @param {string} message
     */
    DebugSocket.prototype._reportError = function(message) {
        if (DEBUG) {
            console.error(message);
        }
        this._messageService.setProgressResult(new Error(message));
    };

    /**
     * Status event argument
     * @param {StatusEvent.Status} status
     */
    var StatusEvent = function(status) {
        this.type = 'status';
        this.status = status;
    };

    /**
     * Status enum
     * @enum {string}
     * @name {StatusEvent.Status}
     */
    StatusEvent.STATUS = StatusEvent.prototype.STATUS = {
        IDLE: 'idle',
        RUNNING: 'running',
        PAUSED: 'paused'
    };

    /**
     * Capabilities event argument
     * @see https://github.com/Microsoft/vscode-debugadapter-node/blob/master/protocol/src/debugProtocol.ts
     * @param {DebugProtocol.Capabilities} capabilities
     */
    var CapabilitiesEvent = function(capabilities) {
        this.type = 'capabilities';
        this.capabilities = capabilities;
    };

    /**
     * Launch event argument
     */
    var LaunchEvent = function() {
        this.type = 'launch';
    };

    return {
        DebugSocket: DebugSocket,
        StatusEvent: StatusEvent,
        debugSockets: debugSockets
    };
});
