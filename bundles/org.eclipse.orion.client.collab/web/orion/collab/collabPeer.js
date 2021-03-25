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

/*eslint-env browser, amd */
define([], function() {

    'use strict';

	/**
	 * A record of a collaborator
	 * 
	 * @class
	 * @name orion.collabClient.CollabPeer
	 * 
	 * @param {string} id -
	 * @param {string} name -
	 * @param {string} color -
	 */
	var CollabPeer = function(id, name, color) {
		this.id = id;
		this.name = name;
		this.color = color;
	};

    return {
        CollabPeer: CollabPeer
    };
});
