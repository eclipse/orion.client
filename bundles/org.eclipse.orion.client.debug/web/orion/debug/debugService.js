/*******************************************************************************
 * @license
 * Copyright (c) 2017, 2019 IBM Corporation and others.
 * All rights reserved. This program and the accompanying materials are made
 * available under the terms of the Eclipse Public License 2.0
 * (http://www.eclipse.org/legal/epl-v10.html), and the Eclipse Distribution
 * License v1.0 (http://www.eclipse.org/org/documents/edl-v10.html).
 *
 * Contributors: IBM Corporation - initial API and implementation
 ******************************************************************************/
/* eslint-env browser, amd */
define([
    'orion/Deferred',
    'orion/EventTarget',
    'orion/debug/breakpoint',
    'orion/util'
], function(Deferred, EventTarget, mBreakpoint, util) {

    'use strict';

    /**
     * A debug service provides breakpoints, watches and highlighted lines management.
     * Here management means loading and saving data from storage, apis of getters and setters, and correspoding events.
     * Note that breakpoints from streaming (remote-only) files won't be presisted.
     * 
     * TODO: The current implementation doesn't use any lock, so if the user adds a breakpoint while updating the preference,
     * the processing data will be lost.
     * 
     * @class {orion.debug.DebugService}
     * @param {orion.serviceregistry.ServiceRegistry} serviceRegistry
     */
    var DebugService = function(serviceRegistry) {
        EventTarget.attach(this);

        /**
         * @type {string}
         * @private
         */
        this._focusedFile = undefined;
        /**
         * @type {number}
         * @private
         */
        this._focusedLine = undefined;

        /**
         * @type {Object.<string, Array.<orion.debug.IBreakpoint>>}
         * @private
         */
        this._breakpointsByLocation = {};

        /**
         * @type {Array.<orion.debug.IBreakpoint>}
         * @private
         */
        this._globalBreakpoints = [];

        /**
         * The set of watches.
         * @type {Object.<string, boolean>}
         * @private
         */
        this._watches = {};

        this._loadFromStorage();

        serviceRegistry.registerService('orion.debug.service', this);
    };

    /**
     * Load breakpoints and watches from storage
     * @private
     */
    DebugService.prototype._loadFromStorage = function() {
        var that = this;

        // Load beakpoints
        this._getBreakpointsFromStorage().then(function(breakpoints) {
            for (var location in breakpoints) {
                if (breakpoints.hasOwnProperty(location)) {
                    var docBreakpoints = that._breakpointsByLocation[location] = [];
                    if (Array.isArray(breakpoints[location])) {
                        breakpoints[location].forEach(function(serializedBreakpoint) {
                            var breakpoint = mBreakpoint.deserialize(serializedBreakpoint);
                            if (breakpoint) {
                                docBreakpoints.push(breakpoint);
                            }
                            that.dispatchEvent({
                                type: 'BreakpointAdded',
                                breakpoint: breakpoint
                            });
                        });
                    }
                }
            }
        });

        // Load breakpoints without location property
        this._getGlobalBreakpointsFromStorage().then(function(globalBreakpoints) {
            for (var i = 0; i < globalBreakpoints.length; i++) {
                var globalBreakpoint = mBreakpoint.deserialize(globalBreakpoints[i]);
                if (globalBreakpoint) {
                    that._globalBreakpoints.push(globalBreakpoint);
                }
                that.dispatchEvent({
                    type: 'BreakpointAdded',
                    breakpoint: globalBreakpoint
                });
            }
        });

        // Load watches
        this._getWatchesFromStorage().then(function(watches) {
            that._watches = watches;
            Object.keys(watches).forEach(function(watch) {
                that.dispatchEvent({
                    type: 'WatchAdded',
                    watch: watch
                });
            });
        });
    };

    /**
     * Get item from storage
     * @private
     * @param {string} key
     * @return {Deferred.<string>}
     */
    DebugService.prototype._storageGetItem = function(key) {
        return new Deferred().resolve(util.readSetting(key));
    };

    /**
     * Get item from storage
     * @private
     * @param {string} key
     * @param {string} value
     * @return {Deferred}
     */
    DebugService.prototype._storageSetItem = function(key, value) {
        util.saveSetting(key, value);
        return new Deferred().resolve();
    };

    /**
     * Get the serialized breakpoints from storage
     * @private
     * @return {Deferred.<Object.<string, Array.<Object>>>}
     */
    DebugService.prototype._getBreakpointsFromStorage = function() {
        var that = this;
        return this._storageGetItem('orion.debug.breakpoints').then(function(storageText) {
            try {
                return JSON.parse(storageText) || {};
            } catch(ex) {
                if (storageText) {
                    console.error('Invalid breakpoints storage.');
                }
                return that._setBreakpointsToStorage({}).then(function() {
                    return {};
                });
            }
        });
    };

    /**
     * Set the serialized breakpoints to storage
     * @param {Object.<string, Array.<Object>>} breakpoints
     * @return {Deferred}
     */
    DebugService.prototype._setBreakpointsToStorage = function(breakpoints) {
        return this._storageSetItem('orion.debug.breakpoints', JSON.stringify(breakpoints));
    };

    /**
     * Get the serialized breakpoints without location property from storage
     * @private
     * @return {Deferred.<Array.<Object>>}
     */
    DebugService.prototype._getGlobalBreakpointsFromStorage = function() {
        var that = this;
        return this._storageGetItem('orion.debug.globalBreakpoints').then(function(storageText) {
            try {
                return JSON.parse(storageText) || [];
            } catch(ex) {
                if (storageText) {
                    console.error('Invalid non-location breakpoints storage.');
                }
                return that._setGlobalBreakpointsToStorage([]).then(function() {
                    return [];
                });
            }
        });
    };

    /**
     * Set the serialized breakpoints without location property to storage
     * @param {Deferred.<Array.<Object>>} breakpoints
     */
    DebugService.prototype._setGlobalBreakpointsToStorage = function(breakpoints) {
        return this._storageSetItem('orion.debug.globalBreakpoints', JSON.stringify(breakpoints));
    };

    /**
     * Get the list fo watches from storage
     * @private
     * @return {Deferred.<Object.<string, boolean>>}
     */
    DebugService.prototype._getWatchesFromStorage = function() {
        var that = this;
        return this._storageGetItem('orion.debug.watches').then(function(watchListText) {
            try {
                var watchList = JSON.parse(watchListText) || [];
                var watches = {};
                watchList.forEach(function (watch) {
                    watches[watch] = true;
                });
                return watches;
            } catch(ex) {
                if (watchListText) {
                    console.error('Invalid watches storage.');
                }
                that._setWatchesToStorage({}).then(function() {
                    return {};
                });
            }
        });
    };

    /**
     * Get the list fo watches from storage
     * @private
     * @param {Deferred.<Object.<string, boolean>>} watches
     */
    DebugService.prototype._setWatchesToStorage = function(watches) {
        return this._storageSetItem('orion.debug.watches', JSON.stringify(Object.keys(watches)));
    };

    /**
     * Add a breakpoint
     * @param {orion.debug.IBreakpoint} breakpoint
     */
    DebugService.prototype.addBreakpoint = function(breakpoint) {
        this.updateBreakpoint(null, breakpoint, false);

        this.dispatchEvent({
            type: 'BreakpointAdded',
            breakpoint: breakpoint
        });
    };

    /**
     * Remove a breakpoint
     * @param {orion.debug.IBreakpoint} breakpoint
     */
    DebugService.prototype.removeBreakpoint = function(breakpoint) {
        var that = this;
        var compareString = breakpoint.getCompareString();
        if (!this._breakpointsByLocation[breakpoint.location]) {
            this._breakpointsByLocation[breakpoint.location] = [];
        }
        var docBreakpoints = this._breakpointsByLocation[breakpoint.location];
        for (var i = docBreakpoints.length - 1; i >= 0; i--) {
            if (docBreakpoints[i].getCompareString() === compareString) {
                docBreakpoints.splice(i, 1);
            }
        }

        // Also update storage
        var serializedBreakpoint = breakpoint.serialize();
        this._getBreakpointsFromStorage().then(function(breakpoints) {
            if (!breakpoints[breakpoint.location]) {
                breakpoints[breakpoint.location] = [];
            }
            var docSerializedBreakpoints = breakpoints[breakpoint.location];
            for (var i = docSerializedBreakpoints.length - 1; i >= 0; i--) {
                if (mBreakpoint.deserialize(docSerializedBreakpoints[i]).getCompareString() === compareString) {
                    docSerializedBreakpoints.splice(i, 1);
                }
            }
            that._setBreakpointsToStorage(breakpoints);
        });

        this.dispatchEvent({
            type: 'BreakpointRemoved',
            breakpoint: breakpoint
        });
    };

    /**
     * Enable a breakpoint
     * @param {orion.debug.IBreakpoint} breakpoint - the "enabled" property will be ignored
     */
    DebugService.prototype.enableBreakpoint = function(breakpoint) {
        // Make a clone
        breakpoint = mBreakpoint.deserialize(breakpoint.serialize());
        if (!breakpoint.hasOwnProperty('enabled')) {
            return;
        }
        breakpoint.enabled = true;

        this.updateBreakpoint(breakpoint, breakpoint, false);

        this.dispatchEvent({
            type: 'BreakpointEnabled',
            breakpoint: breakpoint
        });
    };

    /**
     * Disable a breakpoint
     * @param {orion.debug.IBreakpoint} breakpoint - the "enabled" property will be ignored
     */
    DebugService.prototype.disableBreakpoint = function(breakpoint) {
        // Make a clone
        breakpoint = mBreakpoint.deserialize(breakpoint.serialize());
        if (!breakpoint.hasOwnProperty('enabled')) {
            return;
        }
        breakpoint.enabled = false;

        this.updateBreakpoint(breakpoint, breakpoint, false);

        this.dispatchEvent({
            type: 'BreakpointDisabled',
            breakpoint: breakpoint
        });
    };

    /**
     * Update breakpoint both locally and in storage
     * @param {orion.debug.IBreakpoint} before - breakpoint before change. the "enabled" property will be ignored
     * @param {orion.debug.IBreakpoint} after - breakpoint after change.
     * @param {boolean} inheritEnabled - if true, the new breakpoint will use the current "enabled" value
     */
    DebugService.prototype.updateBreakpoint = function(before, after, inheritEnabled) {
        var that = this;
        var compareString = before ? before.getCompareString() : '';

        // Breakpoints with location and the ones without location should be stored at different places
        if (after.location) {
            if (before && !this._breakpointsByLocation[before.location]) {
                this._breakpointsByLocation[before.location] = [];
            }
            if (!this._breakpointsByLocation[after.location]) {
                this._breakpointsByLocation[after.location] = [];
            }
            // Delete existing breakpoints
            if (before) {
                var docBreakpoints = this._breakpointsByLocation[before.location];
                for (var i = docBreakpoints.length - 1; i >= 0; i--) {
                    if (docBreakpoints[i].getCompareString() === compareString) {
                        if (inheritEnabled && after.enabled !== undefined) {
                            after.enabled = docBreakpoints[i].enabled;
                        }
                        docBreakpoints.splice(i, 1);
                    }
                }
            }
            // Add a new one
            this._breakpointsByLocation[after.location].push(after);

            // Also update storage
            this._getBreakpointsFromStorage().then(function(breakpoints) {
                if (before && !breakpoints[before.location]) {
                    breakpoints[before.location] = [];
                }
                if (!breakpoints[after.location]) {
                    breakpoints[after.location] = [];
                }
                // Delete existing breakpoints
                if (before) {
                    var docSerializedBreakpoints = breakpoints[before.location];
                    for (var i = docSerializedBreakpoints.length - 1; i >= 0; i--) {
                        if (mBreakpoint.deserialize(docSerializedBreakpoints[i]).getCompareString() === compareString) {
                            docSerializedBreakpoints.splice(i, 1);
                        }
                    }
                }
                // Add a new one
                breakpoints[after.location].push(after.serialize());
                // Store
                that._setBreakpointsToStorage(breakpoints);
            });
        } else {
            // Delete existing breakpoints
            for (var i = this._globalBreakpoints.length - 1; i >= 0; i--) {
                if (this._globalBreakpoints[i].getCompareString() === compareString) {
                    this._globalBreakpoints.splice(i, 1);
                }
            }
            // Add a new one
            this._globalBreakpoints.push(after);

            // Update storage
            this._getGlobalBreakpointsFromStorage().then(function(breakpoints) {
                // Delete exsiting breakpoints
                for (var i = breakpoints.length - 1; i >= 0; i--) {
                    if (mBreakpoint.deserialize(breakpoints[i]).getCompareString() === compareString) {
                        breakpoints.splice(i, 1);
                    }
                }
                // Add a new one
                breakpoints.push(after.serialize());
                // Store
                that._setGlobalBreakpointsToStorage(breakpoints);
            });
        }
    };

    /**
     * Get breakpoints by document location
     * @param {string} location
     * @return {Array.<orion.debug.IBreakpoint>}
     */
    DebugService.prototype.getBreakpointsByLocation = function(location) {
        if (this._breakpointsByLocation[location]) {
            return this._breakpointsByLocation[location].slice();
        } else {
            return [];
        }
    };

    /**
     * Get breakpoints by document location prefix
     * @param {string} prefix
     * @return {Object.<string, Array.<orion.debug.IBreakpoint>>}
     */
    DebugService.prototype.getBreakpointsByPrefix = function(prefix) {
        var breakpointSets = {};
        for (var location in this._breakpointsByLocation) {
            if (this._breakpointsByLocation.hasOwnProperty(location)) {
                if (location.startsWith(prefix)) {
                    breakpointSets[location] = this._breakpointsByLocation[location];
                }
            }
        }
        return breakpointSets;
    };

    /**
     * Get all breakpoints
     * @return {Array.<orion.debug.IBreakpoint>}
     */
    DebugService.prototype.getBreakpoints = function() {
        var breakpointSets = [];
        for (var location in this._breakpointsByLocation) {
            if (this._breakpointsByLocation.hasOwnProperty(location)) {
                breakpointSets.push(this._breakpointsByLocation[location]);
            }
        }
        return Array.prototype.concat.apply([], breakpointSets);
    };

    /**
     * Get breakpoints that doesn't have location property (e.g. exception breakpoints)
     * @return {Array.<orion.debug.IBreakpoint>}
     */
    DebugService.prototype.getGlobalBreakpoints = function() {
        return this._globalBreakpoints.slice();
    };

    /**
     * Add a watch
     * @param watch {string}
     */
    DebugService.prototype.addWatch = function(watch) {
        var that = this;
        this._watches[watch] = true;

        // Store it
        this._getWatchesFromStorage().then(function(storedWatches) {
            if (!storedWatches[watch]) {
                storedWatches[watch] = true;
                that._setWatchesToStorage(storedWatches);
            }
        });
        
        this.dispatchEvent({
            type: 'WatchAdded',
            watch: watch
        });
    };

    /**
     * Add a watch
     * @param watch {string}
     */
    DebugService.prototype.removeWatch = function(watch) {
        var that = this;
        if (this._watches[watch]) {
            delete this._watches[watch];
        }

        // Store it
        this._getWatchesFromStorage().then(function(storedWatches) {
            if (storedWatches[watch]) {
                delete storedWatches[watch];
                that._setWatchesToStorage(storedWatches);
            }
        });

        this.dispatchEvent({
            type: 'WatchRemoved',
            watch: watch
        });
    };

    /**
     * Get all watches
     * @return {Array.<string>}
     */
    DebugService.prototype.getWatches = function() {
        return Object.keys(this._watches);
    };

    /**
     * Focus this line in the editor. There is at most one line to be focused,
     * so any consequencecalls will override this call.
     * @param {string} location
     * @param {number} line
     */
    DebugService.prototype.focusLine = function(location, line) {
        this._focusedFile = location;
        this._focusedLine = line;
        this.dispatchEvent({
            type: 'LineFocused',
            location: location,
            line: line
        });
    };

    /**
     * Unfocus the focused line (if available).
     */
    DebugService.prototype.unfocusLine = function() {
        this._focusedFile = undefined;
        this._focusedLine = undefined;
        this.dispatchEvent({
            type: 'LineUnfocused'
        });
    };

    /**
     * Get the currently focused line and its location
     * @return {Object}
     */
    DebugService.prototype.getFocusedLine = function() {
        if (this._focusedFile) {
            return {
                location: this._focusedFile,
                line: this._focusedLine
            };
        } else {
            return null;
        }
    };

    /**
     * A debug service using preference
     * 
     * @class {orion.debug.DebugService}
     * @param {orion.serviceregistry.ServiceRegistry} serviceRegistry
     * @param {orion.PreferencesService} preferences
     */
    var PreferenceDebugService = function(serviceRegistry, preferences) {
        /**
         * @private
         */
        this._preferences = preferences;
        DebugService.call(this, serviceRegistry);
    };

    PreferenceDebugService.prototype = Object.create(DebugService.prototype);
    PreferenceDebugService.prototype.constructor = PreferenceDebugService;

    /**
     * Get item from storage
     * @private
     * @param {string} key
     * @return {Deferred.<string>}
     */
    PreferenceDebugService.prototype._storageGetItem = function(key) {
        return this._preferences.get('/debug', key).then(function(obj) {
            return obj && obj[key];
        });
    };

    /**
     * Get item from storage
     * @private
     * @param {string} key
     * @param {string} value
     * @return {Deferred}
     */
    PreferenceDebugService.prototype._storageSetItem = function(key, value) {
        var obj = {};
        obj[key] = value;
        return this._preferences.put('/debug', obj);
    };

    return {
        DebugService: DebugService,
        PreferenceDebugService: PreferenceDebugService
    };

});
