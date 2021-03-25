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
	'orion/Deferred',
    'orion/debug/debugSocket',
    'orion/debug/debugDumbHover',
    'orion/PageUtil'
], function(messages, Deferred, mDebugSocket, mDebugDumbHover, PageUtil) {

    'use strict';

    /**
     * A debug service provides breakpoints, watches and highlighted lines management.
     * Here management means loading and saving data from storage, apis of getters and setters, and correspoding events.
     * Note that breakpoints from streaming (remote-only) files won't be presisted.
     * 
     * @class {orion.debug.NativeDeployService}
     * @param {orion.serviceregistry.ServiceRegistry} serviceRegistry
     * @param {orion.commandregistry.CommandRegistry} commandRegistry
     */
    var NativeDeployService = function(serviceRegistry, commandRegistry) {
        this._serviceRegistry = serviceRegistry;
        this._commandRegistry = commandRegistry;
        this._dumbHover = new mDebugDumbHover.DebugDumbHover();

        /**
         * Debug sockets for each configuration.
         * TODO: Currently there is no way to remove a debug socket from here.
         * @private
         * @type {Object.<string, DebugSocket>}
         */
        this._debugSockets = {};

        this._debugPanes = null;

        // Register itself
        serviceRegistry.registerService("orion.project.deploy", this, {
            id: "org.eclipse.orion.client.debug.deploy",
            deployTypes: ["Native"],
            priorityForDefault: 8,
			name: messages["createNew"],
			tooltip: messages["createNewTooltip"]
        });
    };

    /**
     * Create a debug socket if it hasn't been created.
     * @param {Object} launchConf
     * @return {orion.debug.DebugSocket}
     */
    NativeDeployService.prototype._ensureDebugSocket = function(launchConf) {
        var that = this;
        var confLocation = launchConf.File.Location;
        var debugSocket = null;
        if (this._debugSockets[confLocation]) {
            // Get the existing one
            debugSocket = this._debugSockets[confLocation];
        } else {
            // Create a new debug socket
            if (!this._debugPanes) {
                this._debugPanes = this._serviceRegistry.getService("orion.debug.debugPanes");
            }
            var debugSocket = new mDebugSocket.DebugSocket(this._serviceRegistry);
            this._debugSockets[confLocation] = debugSocket;
            this._debugPanes.connect(debugSocket);
            debugSocket.addEventListener("status", function(e) {
                that._commandRegistry.runCommand("orion.launchConfiguration.checkStatus", launchConf);
            });
        }
        this._debugPanes.activate(debugSocket);
        return debugSocket;
    };

    /**
     * Get deploy progress message
     * @param {Object} project
     * @param {Object} launchConf
     * @return {string}
     */
    NativeDeployService.prototype.getDeployProgressMessage = function(project, launchConf) {
        return messages['launching'];
    };

    /**
     * Deploy a configuration
     * @param {Object} project
     * @param {Object} launchConf
     * @return {Deferred}
     */
    NativeDeployService.prototype.deploy = function(project, launchConf) {
        if (launchConf.ConfigurationName) {
            var debugSocket = this._ensureDebugSocket(launchConf);
            debugSocket.setProject(project);
            return this.start(launchConf);
        } else {
            return this.edit(project, launchConf);
        }
    };

    /**
     * Edit a configuration
     * @param {Object} project
     * @param {Object} launchConf
     * @return {Deferred}
     */
    NativeDeployService.prototype.edit = function(project, launchConf) {
        var currentFile = PageUtil.matchResourceParameters(location.hash).resource;
        if (currentFile.startsWith(project.ContentLocation)) {
            currentFile = '${workspaceRoot}/' + currentFile.substr(project.ContentLocation.length);
        } else {
            currentFile = null;
        }
        var url = new URL('../orion/debug/debugDeploymentWizard.html', location.href);
        url.hash = '#' + encodeURIComponent(JSON.stringify({
            ContentLocation: project.ContentLocation,
            AppPath: typeof launchConf.Path === 'string' ? launchConf.Path : 'manifest.yml',
            ConfParams: launchConf.Parameters,
            ConfName: launchConf.ConfigurationName,
            ProjName: project.Name,
            CurrentFile: currentFile
        }));
        return new Deferred().resolve({
            UriTemplate: url.href,
            Width: '500px',
            Height: '470px',
            UriTemplateId: 'org.eclipse.orion.client.debug.deploy.uritemplate'
        });
    };

    /**
     * Get the state of debugger
     * @param {Object} launchConf
     * @return {Deferred}
     */
    NativeDeployService.prototype.getState = function(launchConf) {
        var debugSocket = this._ensureDebugSocket(launchConf);
        var status = debugSocket.getStatus();
        if (status === mDebugSocket.StatusEvent.STATUS.IDLE) {
            return new Deferred().resolve({
                Name: launchConf.name,
                State: 'STOPPED',
                Message: messages['debugeeStopped']
            });
        } else if (status === mDebugSocket.StatusEvent.STATUS.RUNNING) {
            return new Deferred().resolve({
                Name: launchConf.name,
                State: 'STARTED',
                Message: messages['debugeeRunning']
            });
        } else {
            return new Deferred().resolve({
                Name: launchConf.name,
                State: 'PAUSED',
                Message: messages['debugeePaused']
            });
        }
    };

    /**
     * Get the state of debugger
     * @param {Object} launchConf
     * @return {Deferred}
     */
    NativeDeployService.prototype.start = function(launchConf) {
        var debugSocket = this._ensureDebugSocket(launchConf);
        try {
            debugSocket.launch(launchConf.Parameters);
            return new Deferred().resolve({
                Name: launchConf.name,
                State: 'STARTED',
                Message: messages['debugeeRunning']
            });
        } catch (ex) {
            return this.getState(launchConf);
        }
    };

    /**
     * Get the state of debugger
     * @param {Object} launchConf
     * @return {Deferred}
     */
    NativeDeployService.prototype.stop = function(launchConf) {
        var debugSocket = this._ensureDebugSocket(launchConf);
        var deferred = new Deferred();
        debugSocket.disconnect();
        deferred.resolve({
            Name: launchConf.name,
            State: 'STOPPED',
            Message: messages['debugeeStopped']
        });
        return deferred;
    };

    /**
     * Hover evaluation
     * @param {Object} launchConf
     * @param {Object} editorContext
     * @param {Object} ctxt
     * @return {Promise.<string>}
     */
    NativeDeployService.prototype.computeHoverInfo = function(launchConf, editorContext, ctxt) {
        var that = this;
        var debugSocket = this._ensureDebugSocket(launchConf);
        if (debugSocket.canEvaluate()) {
            var hoverResultDeferred = new Deferred();
            var hoverProviders = this._serviceRegistry.getServiceReferences("orion.debug.hoverEvaluationProvider");
            editorContext.getFileMetadata().then(function(metadata) {
                var contentType = metadata.contentType.id;
                var hoverTextDeferred = null;
                for (var i = 0; i < hoverProviders.length; i++) {
                    var contentTypes = hoverProviders[i].getProperty('contentType');
                    if (contentTypes && contentTypes.indexOf(contentType) !== -1) {
                        hoverTextDeferred = that._serviceRegistry.getService(hoverProviders[i]).findHoverText(editorContext, ctxt);
                        break;
                    }
                }
                if (!hoverTextDeferred) {
                    hoverTextDeferred = that._dumbHover.findHoverText(editorContext, ctxt);
                }
                hoverTextDeferred.then(function(toEvaluate) {
                    if (toEvaluate === null) {
                        hoverResultDeferred.resolve(null);
                    } else {
                        debugSocket.evaluate(toEvaluate, 'hover', function(result) {
                            hoverResultDeferred.resolve(result ? result.result : null);
                        });
                    }
                });
            });
            return hoverResultDeferred;
        } else {
            return new Deferred().resolve(null);
        }
    };

    return {
        NativeDeployService: NativeDeployService
    };
});
