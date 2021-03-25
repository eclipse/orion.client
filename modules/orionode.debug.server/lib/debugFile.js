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

var express = require('express');

var TIMEOUT = 10000;

/**
 * Create a router for debug file
 * @param {Map.<string, DebugAdapter>} adapterPool
 * @return {Express.Router}
 */
function createDebugFileRouter(adapterPool) {
    var router = express.Router();

    router.get('/:connectionId/:referenceId/*', function(req, res) {
        if (!adapterPool.has(req.params.connectionId)) {
            res.sendStatus(404);
            return;
        }
        var adapter = adapterPool.get(req.params.connectionId);
        adapter.sendRequest('source', { sourceReference: parseInt(req.params.referenceId, 10) }, TIMEOUT, function(response) {
            if (!response.success) {
                res.sendStatus(404);
                return;
            } else {
                if (response.body.mimeType) {
                    res.setHeader('Content-Type', response.body.mimeType);
                }
                res.write(response.body.content);
                res.end();
            }
        });
    });

    return router;
};

module.exports = createDebugFileRouter;
