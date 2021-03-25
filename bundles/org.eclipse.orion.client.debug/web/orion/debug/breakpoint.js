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
define([], function() {

    'use strict';

    /**
     * Breakpoint interface
     * @interface {orion.debug.IBreakpoint}
     */
    var IBreakpoint = function() {
        /** @type {string} */
        this.location;
        /** @type {string} */
        this.description;
    };

    /**
     * Serilize this breakpoint to a plain object
     * @return {Object}
     */
    IBreakpoint.prototype.serialize = function() { };

    /**
     * Get a string representing the breakpoint. Two breakpoints are considered
     * to be equivalent if and only if this method returns an exactly same
     * string.
     * @example if (lhs.getCompareString() === rhs.getCompareString()) { }
     * @return {string}
     */
    IBreakpoint.prototype.getCompareString = function() { };

    /**
     * Line bookmark class.
     * 
     * @class {orion.debug.LineBookmark}
     * @implements {orion.debug.IBreakpoint}
     * 
     * @param {string} location - Location of document
     * @param {number} line
     * @param {string} description - Description HTML
     */
    var LineBookmark = function(location, line, description) {
        this.location = location;
        this.line = line;
        this.description = description;
    };

    /**
     * Serilize this breakpoint to a plain object
     * @return {Object}
     */
    LineBookmark.prototype.serialize = function() {
        return {
            type: 'LineBookmark',
            location: this.location,
            line: this.line,
            description: this.description
        };
    };

    /**
     * Get compare string
     * @return {string}
     */
    LineBookmark.prototype.getCompareString = function() {
        var serializedData = this.serialize();
        return JSON.stringify(serializedData);
    };

    /**
     * Line breakpoint class.
     * 
     * @class {orion.debug.LineBreakpoint}
     * @implements {orion.debug.IBreakpoint}
     * 
     * @param {string} location - Location of document
     * @param {number} line
     * @param {string} description - Description HTML
     * @param {boolean} enabled
     */
    var LineBreakpoint = function(location, line, description, enabled) {
        this.location = location;
        this.line = line;
        this.description = description;
        this.enabled = enabled;
    };

    /**
     * Serilize this breakpoint to a plain object
     * @return {Object}
     */
    LineBreakpoint.prototype.serialize = function() {
        return {
            type: 'LineBreakpoint',
            location: this.location,
            line: this.line,
            description: this.description,
            enabled: this.enabled
        };
    };

    /**
     * Get compare string
     * @return {string}
     */
    LineBreakpoint.prototype.getCompareString = function() {
        var serializedData = this.serialize();
        delete serializedData['enabled'];
        return JSON.stringify(serializedData);
    };

    /**
     * Line conditional breakpoint class.
     * 
     * @class {orion.debug.LineConditionalBreakpoint}
     * @implements {orion.debug.IBreakpoint}
     * 
     * @param {string} location - Location of document
     * @param {number} line
     * @param {string} description - Description HTML
     * @param {string} condition
     * @param {boolean} enabled
     */
    var LineConditionalBreakpoint = function(location, line, description, condition, enabled) {
        this.location = location;
        this.line = line;
        this.description = description;
        this.condition = condition;
        this.enabled = enabled;
    };

    /**
     * Serilize this breakpoint to a plain object
     * @return {Object}
     */
    LineConditionalBreakpoint.prototype.serialize = function() {
        return {
            type: 'LineConditionalBreakpoint',
            location: this.location,
            line: this.line,
            description: this.description,
            condition: this.condition,
            enabled: this.enabled
        };
    };

    /**
     * Get compare string
     * @return {string}
     */
    LineConditionalBreakpoint.prototype.getCompareString = function() {
        var serializedData = this.serialize();
        delete serializedData['enabled'];
        return JSON.stringify(serializedData);
    };

    /**
     * Function breakpoint class.
     * 
     * @class {orion.debug.FunctionBreakpoint}
     * @implements {orion.debug.IBreakpoint}
     * 
     * @param {string} location - Location of document
     * @param {string} functionName - function name
     * @param {string} description - Description HTML
     * @param {boolean} enabled
     */
    var FunctionBreakpoint = function(location, functionName, description, enabled) {
        this.location = location;
        this.function = functionName;
        this.description = description;
        this.enabled = enabled;
    };

    /**
     * Serilize this breakpoint to a plain object
     * @return {Object}
     */
    FunctionBreakpoint.prototype.serialize = function() {
        return {
            type: 'FunctionBreakpoint',
            location: this.location,
            function: this.function,
            description: this.description,
            enabled: this.enabled
        };
    };

    /**
     * Get compare string
     * @return {string}
     */
    FunctionBreakpoint.prototype.getCompareString = function() {
        var serializedData = this.serialize();
        delete serializedData['enabled'];
        return JSON.stringify(serializedData);
    };

    /**
     * Exception breakpoint class.
     * 
     * @class {orion.debug.ExceptionBreakpoint}
     * @implements {orion.debug.IBreakpoint}
     * 
     * @param {string} label - exception label
     * @param {string} description - Description HTML
     * @param {boolean} enabled
     */
    var ExceptionBreakpoint = function(label, description, enabled) {
        this.label = label;
        this.description = description;
        this.enabled = enabled;
    };

    /**
     * Serilize this breakpoint to a plain object
     * @return {Object}
     */
    ExceptionBreakpoint.prototype.serialize = function() {
        return {
            type: 'ExceptionBreakpoint',
            label: this.label,
            description: this.description,
            enabled: this.enabled
        };
    };

    /**
     * Get compare string
     * @return {string}
     */
    ExceptionBreakpoint.prototype.getCompareString = function() {
        var serializedData = this.serialize();
        delete serializedData['enabled'];
        return JSON.stringify(serializedData);
    };

    /**
     * Deserialize a breakpoint from a plain object
     * @param {Object}
     * @return {orion.debug.IBreakpoint}
     */
    function deserialize(plain) {
        plain = plain || {};
        plain.location = plain.location || "";
        plain.description = plain.description || "";
        switch (plain.type) {
            case 'LineBookmark':
                if (!isFinite(plain.line)) break;
                return new LineBookmark(plain.location, plain.line, plain.description);

            case 'LineBreakpoint':
                if (!isFinite(plain.line)) break;
                return new LineBreakpoint(plain.location, plain.line, plain.description, !!plain.enabled);

            case 'LineConditionalBreakpoint':
                if (!isFinite(plain.line)) break;
                if (!plain.condition) break;
                return new LineConditionalBreakpoint(plain.location, plain.line, plain.description, plain.condition, !!plain.enabled);

            case 'FunctionBreakpoint':
                if (!plain.function) break;
                return new FunctionBreakpoint(plain.location, plain.function, plain.description, !!plain.enabled);

            case 'ExceptionBreakpoint':
                if (!plain.label) break;
                return new ExceptionBreakpoint(plain.label, plain.description, !!plain.enabled);
        }
        return null;
    };

    return {
        LineBookmark: LineBookmark,
        LineBreakpoint: LineBreakpoint,
        LineConditionalBreakpoint: LineConditionalBreakpoint,
        FunctionBreakpoint: FunctionBreakpoint,
        ExceptionBreakpoint: ExceptionBreakpoint,
        deserialize: deserialize
    };

});
