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

'use strict';

/**
 * A client record
 */
class Client {
    /**
     * @param {string} clientId
     * @param {string} name
     */
    constructor(clientId, name) {
        this.clientId = clientId;
        this.name = name;
        this.color = generateColorByName(name);
        /** Location for internal track */
        this.doc = '';
        /** Location for display */
        this.location = '';
        /** @type ot.Selection */
        this.selection = null;
        this.editing = false;
    }

    /**
     * Serialize this client to a JSON object
     */
    serialize() {
        return {
            clientId: this.clientId,
            name: this.name,
            color: this.color,
            location: this.location,
            editing: this.editing
        }
    }
};

var MASK = 360;
var PRIME = 271;
var SATURATION = 0.7;
var LIGHTNESS = 0.5;

/**
 * Generate an RGB value from a string
 * 
 * @param {string} str
 * 
 * @return {string} - RGB value
 */
function generateColorByName(str) {
    var hue = 0;
    for (var i = 0; i < str.length; i++) {
        hue = (hue * PRIME + str.charCodeAt(i)) % MASK;
    }
    hue = Math.floor(hue * PRIME) % MASK / MASK;
    var rgb = hslToRgb(hue, SATURATION, LIGHTNESS);
    return ('#' + rgb[0].toString(16) + rgb[1].toString(16) + rgb[2].toString(16)).toUpperCase();
}

function hslToRgb(h, s, l){
    var r, g, b;
    if(s == 0){
        r = g = b = l; // achromatic
    }else{
        var hue2rgb = function (p, q, t){
            if(t < 0) t += 1;
            if(t > 1) t -= 1;
            if(t < 1/6) return p + (q - p) * 6 * t;
            if(t < 1/2) return q;
            if(t < 2/3) return p + (q - p) * (2/3 - t) * 6;
            return p;
        };
        var q = l < 0.5 ? l * (1 + s) : l + s - l * s;
        var p = 2 * l - q;
        r = hue2rgb(p, q, h + 1/3);
        g = hue2rgb(p, q, h);
        b = hue2rgb(p, q, h - 1/3);
    }
    return [Math.round(r * 255), Math.round(g * 255), Math.round(b * 255)];
}

module.exports = Client;
