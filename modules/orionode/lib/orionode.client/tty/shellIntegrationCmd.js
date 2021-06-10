/*******************************************************************************
 * @license
 * Copyright (c) 2017 IBM Corporation and others.
 * All rights reserved. This program and the accompanying materials are made 
 * available under the terms of the Eclipse Public License v1.0 
 * (http://www.eclipse.org/legal/epl-v10.html), and the Eclipse Distribution 
 * License v1.0 (http://www.eclipse.org/org/documents/edl-v10.html). 
 * 
 * Contributors: IBM Corporation - initial API and implementation
 ******************************************************************************/
/*eslint-env browser, amd*/
/*global Terminal*/
define([], function() {

    /**
     * Execute integration command from shell
     * @param {Socket.IO.Client} socket
     * @param {Array.<string>} args 
     */
    function execute(socket, args) {
        switch (args[0]) {
            case 'edit':
                edit(socket, args);
                break;
        }
    }

    function edit(socket, args) {
        var absPath = args[1];
        socket.emit('absolute2project', absPath, function(projPath) {
            var contextPath = new URL('..', location.href).pathname;
            window.open('../edit/edit.html#' + contextPath + '/file' + encodeURIComponent(projPath.replace('#', '%23')));
        });
    }

    return {
        execute: execute
    };
});