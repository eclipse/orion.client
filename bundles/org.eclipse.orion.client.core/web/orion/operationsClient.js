/*******************************************************************************
 * @license
 * Copyright (c) 2011, 2014 IBM Corporation and others.
 * All rights reserved. This program and the accompanying materials are made
 * available under the terms of the Eclipse Public License 2.0
 * (http://www.eclipse.org/legal/epl-v10.html), and the Eclipse Distribution
 * License v1.0 (http://www.eclipse.org/org/documents/edl-v10.html).
 *
 * Contributors:
 *     IBM Corporation - initial API and implementation
 *******************************************************************************/
/*eslint-env browser, amd*/
define(['i18n!orion/operations/nls/messages', "orion/Deferred"], function(messages, Deferred) {
	
	var NAMESPACE = "/operations";

    function _doServiceCall(operationsService, funcName, funcArgs) {
        return operationsService[funcName].apply(operationsService, funcArgs);
    }

    function _getOperations(operationsService, options) {
        return _doServiceCall(operationsService, "getOperations", [options]); //$NON-NLS-0$
    }

    function NoMatchingOperationsClient(location) {
        this._location = location;
    }

    function returnNoMatchingError() {
        var result = new Deferred();
        result.reject(messages["NoMatchingOpSrvLocation"] + this._location);
        return result;
    }

    NoMatchingOperationsClient.prototype = {
        getOperation: returnNoMatchingError,
        getOperations: returnNoMatchingError,
        removeCompletedOperations: returnNoMatchingError,
        removeOperation: returnNoMatchingError,
        cancelOperation: returnNoMatchingError
    };

    NoMatchingOperationsClient.prototype.constructor = NoMatchingOperationsClient;

    function OperationsClient(serviceRegistry) {
        this._services = [];
        this._patterns = [];
        this._operationListeners = [];
        this._currentLongpollingIds = [];
        this._preferenceService = serviceRegistry.getService("orion.core.preference"); //$NON-NLS-0$
        var operationsServices = serviceRegistry.getServiceReferences("orion.core.operation"); //$NON-NLS-0$
        for (var i = 0; i < operationsServices.length; i++) {
            var servicePtr = operationsServices[i];
            var operationsService = serviceRegistry.getService(servicePtr);
            this._services[i] = operationsService;

            var patternString = operationsServices[i].getProperty("pattern") || ".*"; //$NON-NLS-1$ //$NON-NLS-0$
            if (patternString[0] !== "^") { //$NON-NLS-0$
                patternString = "^" + patternString; //$NON-NLS-0$
            }
            this._patterns[i] = new RegExp(patternString);
        }

        this._getService = function(location) {
            if (!location) {
                return this._services[0];
            }
            for (var j = 0; j < this._patterns.length; ++j) {
                if (this._patterns[j].test(location)) {
                    return this._services[j];
                }
            }
            this._preferenceService.remove(NAMESPACE, location);
            return new NoMatchingOperationsClient(location);
        };
    }

    function _mergeOperations(lists) {
        var result = {
            Children: []
        };
        for (var i = 0; i < lists.length; i++) {
            result.Children = result.Children.concat(lists[i].Children);
        }
        return result;
    }

    function _notifyChangeListeners(result) {
        for (var i = 0; i < this._operationListeners.length; i++) {
            this._operationListeners[i](result);
        }
    }

    OperationsClient.prototype = {
        addOperation: function(operationLocation, data) {
            var that = this;
            return this._preferenceService.get(NAMESPACE).then(function(globalOperations) {
                var operationLocations = Object.keys(globalOperations);
                var now = Date.now();
                for (var j = 0; j < operationLocations.length; j++) {
                	var location = operationLocations[j];
                    var expires = globalOperations[location].expires;
                    if (expires < now) {
                        delete globalOperations[location];
                    }
                }
                globalOperations[operationLocation] = data;
                return that._preferenceService.put(NAMESPACE, globalOperations, {clear: true});
            });
        },
        getOperations: function() {
            return this._preferenceService.get(NAMESPACE);
        },
        getOperation: function(operationLocation) {
            return _doServiceCall(this._getService(operationLocation), "getOperation", arguments); //$NON-NLS-0$
        },
        removeCompletedOperations: function() {
            var results = [];
            var that = this;
            for (var i = 0; i < this._services.length; i++) {
                var pattern = this._patterns[i];
                var def = new Deferred();
                results[i] = def.promise;
                _doServiceCall(this._services[i], "removeCompletedOperations").then(function(def) {
                    return function(operationsLeft) {
                        if (!Array.isArray(operationsLeft)) {
                            return;
                        }
                        that._preferenceService.get(NAMESPACE).then(function(globalOperations) {
                            var operationLocations = Object.keys(globalOperations);
                            for (var j = 0; j < operationLocations.length; j++) {
                                var location = operationLocations[j];
                                if (pattern.test(location)) {
                                    if (operationsLeft.indexOf(location) < 0) {
                                        delete globalOperations[location];
                                    }
                                }
                            }
                            that._preferenceService.put(NAMESPACE, globalOperations, {clear: true}).then(def.resolve, def.reject);
                        });
                    };
                }(def), function(def) {
                    return function(error) {
                        def.reject(error);
                    };
                }(def));
            }
            return Deferred.all(results);
        },

        removeOperation: function(operationLocation) {
            var that = this;
            return _doServiceCall(this._getService(operationLocation), "removeOperation", arguments).then(function(result) {
            	return that._preferenceService.remove(NAMESPACE, operationLocation);
            }, function(error) {
                return error;
            }, function(progress) {
                return progress;
            });
        }
    };

    OperationsClient.prototype.constructor = OperationsClient;

    return {
        OperationsClient: OperationsClient
    };
});
