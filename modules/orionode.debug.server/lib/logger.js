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

var config = require('../config');

'use strict';

/**
 * Message type
 * @readonly
 * @enum {number}
 * @name {Logger.MessageType}
 */
var MessageType = {
    NORMAL: 0,
    INITIALIZATION: 1,
    ERROR: 2,
    VERBOSE: 65536
};

/**
 * Logger service
 * @class {Logger}
 */
var Logger = function() { };

/**
 * Log a message
 * @param {string} message
 * @param {Logger.MessageType} type
 */
Logger.prototype.log = function(message, type) {
    if (config.verbose || !(type & MessageType.VERBOSE)) {
        if (type & MessageType.ERROR) {
            console.error(message);
        } else {
            console.log(message);
        }
    }
};

module.exports = new Logger();
module.exports.MessageType = MessageType;
