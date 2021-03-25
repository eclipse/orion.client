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

var adaptersList = require('../adapters.json');
var logger = require('./logger');
var DebugAdapter = require('./debugAdapter');
var path = require('path');

var adaptersConfig = {};
var adaptersCwd = {};
var adaptersTemplate = {};

var adapterModules = Object.keys(adaptersList);

// Get all available debug adapters
adapterModules.forEach(function(adapterModule) {
    var packageInfo = null;
    try {
        packageInfo = require(path.join('..', 'adapters', adapterModule, 'package.json'));
        var adaptersProvided = packageInfo.contributes.debuggers;
        adaptersProvided.forEach(function(adapterInfo) {
            var adapterType = adapterInfo.type;
            if (adaptersConfig[adapterType]) {
                logger.log(adapterType + ' has been registered.', logger.MessageType.ERROR);
            } else if (adaptersList[adapterModule].ignore && adaptersList[adapterModule].ignore.indexOf(adapterType) !== -1) {
                logger.log('Ignore ' + adapterType + '.', logger.MessageType.INITIALIZATION | logger.MessageType.VERBOSE);
            } else {
                adaptersConfig[adapterType] = adapterInfo;
                adaptersCwd[adapterType] = path.join(__dirname, '..', 'adapters', adapterModule);
                adaptersTemplate[adapterType] = adaptersList[adapterModule].templates || adaptersConfig[adapterType].initialConfigurations || [];
                if (!Array.isArray(adaptersTemplate[adapterType])) {
                    adaptersTemplate[adapterType] = [];
                }
            }
        });
    } catch (ex) {
        logger.log(adapterModule + ' cannot be loaded.', logger.MessageType.ERROR);
    }
});

logger.log('Loaded debug adapters: ' + Object.keys(adaptersConfig).join(', ') + '.', logger.MessageType.INITIALIZATION);

/**
 * Create a new adapter instance
 * @param {string} type - adapter type name
 * @return {DebugAdapter}
 */
function createAdapter(type) {
    var adapterConfig = adaptersConfig[type];
    if (!adapterConfig) {
        throw new Error('Adapter type ' + type + ' has not been registered.');
    }
    return new DebugAdapter(adaptersConfig[type], adaptersCwd[type]);
}

/**
 * Get all templates by an adapter type
 * @param {Array.<Object>} type
 * @return {Array.<Object>} - templates for the given type
 */
function getTemplates(type) {
    return adaptersTemplate[type] || [];
}

module.exports.createAdapter = createAdapter;
module.exports.getTemplates = getTemplates;
module.exports.types = Object.keys(adaptersConfig);
