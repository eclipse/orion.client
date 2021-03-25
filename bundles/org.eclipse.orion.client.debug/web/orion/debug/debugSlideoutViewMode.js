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
/* eslint-env browser, amd */
define([
	'orion/webui/Slideout',
    'orion/globalCommands',
    'orion/debug/debugPane'
], function(mSlideout, mGlobalCommands, mDebugPane) {

    'use strict';

    /**
     * A wrapper for Debug UIs.
     * @class {orion.debug.DebugSlideoutViewMode}
     * @extends {orion.webui.SlideoutViewMode}
     * 
     * @param {orion.webui.Slideout} slideout
     * @param {orion.serviceregistry.ServiceRegistry} serviceRegistry
	 * @param {orion.commandregistry.CommandRegistry} commandRegistry
	 * @param {orion.preferences.PreferencesService} preferences
     */
    var DebugSlideoutViewMode = function(slideout, serviceRegistry, commandRegistry, preferences) {
		mSlideout.SlideoutViewMode.call(this, slideout);

        this._serviceRegistry = serviceRegistry;
        this._commandRegistry = commandRegistry;
        this._preferences = preferences;

        this._domWrapper = document.createElement('div');
        this._domWrapper.classList.add('debugPaneWrapper');

        /** @type {orion.debug.DebugSocket} */
        this._current = null;

        /**
         * A map from debug socket ID to a debug pane
         * @type {Object.<string, orion.debug.DebugPane>}
         */
        this._panes = {};
    };

	DebugSlideoutViewMode.prototype = Object.create(mSlideout.SlideoutViewMode.prototype);
	DebugSlideoutViewMode.prototype.constructor = DebugSlideoutViewMode;

    /**
     * Whether the pane is visible
     * @return {boolean}
     */
    DebugSlideoutViewMode.prototype.isVisible = function() {
        return this._slideout.isVisible() && (this === this._slideout.getCurrentViewMode());
    };

    /**
     * Getter of the dom node
     * @return {Element}
     */
    DebugSlideoutViewMode.prototype.getWrapperNode = function() {
        return this._domWrapper;
    };

    /**
     * Connect a debug socket to a debug pane
     * @param {orion.debug.DebugSocket} debugSocket
     */
    DebugSlideoutViewMode.prototype.connect = function(debugSocket) {
        var pane = new mDebugPane.DebugPane(this._serviceRegistry, this._commandRegistry, this._preferences, this, debugSocket);
        this._panes[debugSocket.getId()] = pane;
    };

    /**
     * Disconnect a debug socket from its debug pane
     * @param {orion.debug.DebugSocket} debugSocket
     */
    DebugSlideoutViewMode.prototype.disconnect = function(debugSocket) {
        var pane = this._panes[debugSocket.getId()];
        delete this._panes[debugSocket.getId()];
        if (this._current === debugSocket) {
            this.deactivate();
        }
        pane.destroy();
    };

    /**
     * Show the pane for the given debug socket
     * @param {orion.debug.DebugSocket} debugSocket
     */
    DebugSlideoutViewMode.prototype.activate = function(debugSocket) {
        if (this._current) {
            if (this._current === debugSocket) {
                return;
            }
            this.deactivate();
        }
        var pane = this._panes[debugSocket.getId()];
        this._current = debugSocket;
        this._domWrapper.appendChild(pane.getDomNode());
    };

    /**
     * Hide the showing pane
     */
    DebugSlideoutViewMode.prototype.deactivate = function() {
        if (this._current) {
            this._domWrapper.removeChild(this._domWrapper.firstChild);
            this._current = null;
        }
    };

    /**
     * Show itself if the given pane is the current debug socket
     * @param {orion.debug.DebugSocket} debugSocket
     */
    DebugSlideoutViewMode.prototype.showIfActivated = function(debugSocket) {
        if (debugSocket === this._current && !this.isVisible()) {
            var mainSplitter = mGlobalCommands.getMainSplitter();
            if (mainSplitter.splitter.isClosed()) {
                mainSplitter.splitter.toggleSidePanel();
            }
            this.show();
        }
    };

    return {
        DebugSlideoutViewMode: DebugSlideoutViewMode
    };

});
