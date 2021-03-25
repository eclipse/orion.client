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
    'orion/Deferred'
], function(Deferred) {

    'use strict';

    /**
     * Provides a simple implementation of hover evaluation provider.
     * 
     * This is a dumb implementation that evaluates a "possible" word at the
     * current cursor position using special characters as the delimiters.
     * Ideally, it should evaluate the node in the AST at this position.
     * 
     * To implement an ideal evaluation, register a separate provider service
     * for that language.
     * 
     * Examples that this dumb implementation doesn't work:
     *     C++:
     *         x->property      Hovering on "property"
     * 
     *     JavaScript:
     *         x.property       Hovering on "property"
     * 
     *     Lisp:
     *         (map x empty?)   Hovering at "?"
     * 
     * Examples that an ideal implementation should work:
     *     Javascript:
     *         x ? y : z
     *         should evaluate (x ? y : z) when hovering on "?"
     *         should evaluate y when hovering on "y"
     * 
     * @class {orion.debug.DebugDumbHover}
     * 
     */
    var DebugDumbHover = function() {};

    /**
     * All characters that split words
     */
    var DELIMITER_REGEX = /^[-!$%^&*()+|~=`{}\[\]:";'<>?,.\/\s]$/;

    /**
     * Find the possible word to evaluate
     * @private
     * @param {Object} editorContext
     * @param {Object} ctxt
     * @return {Promise.<string>}
     */
    DebugDumbHover.prototype.findHoverText = function(editorContext, ctxt) {
        var deferred = new Deferred();
        editorContext.getText().then(function(content) {
            var position = ctxt.offset;
            // Find start
            var start = position;
            while (start >= 0 && !content.charAt(start).match(DELIMITER_REGEX)) {
                start--;
            }
            start ++;

            // Find end
            var end = position;
            while (end < content.length && !content.charAt(end).match(DELIMITER_REGEX)) {
                end++;
            }
            if (start >= end) {
                return deferred.resolve(null);
            } else {
                return deferred.resolve(content.substr(start, end - start));
            }
        });
        return deferred;
    };

    return {
        DebugDumbHover: DebugDumbHover
    };

});
