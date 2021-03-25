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
define(['orion/collab/collabFileAnnotation'], function(mCollabFileAnnotation) {

    'use strict';

	var CollabFileAnnotation = mCollabFileAnnotation.CollabFileAnnotation;

    /**
	 * An annotation shows that a file is under editing
	 * 
	 * @constructor
	 * @name {orion.collab.CollabFileEditingAnnotation}
	 * @extends {orion.collab.CollabFileAnnotation}
	 * 
	 * @param {string} location - file location
	 * @param {Array.<string>} users - list of users that is modifying this file
	 */
	var CollabFileEditingAnnotation = function(location, users) {
		// Remove trailing "/"
		if(location.substr(-1) === '/') {
			location = location.substr(0, location.length - 1);
		}
		this.location = location;
		console.assert(Array.isArray(users));
		this.users = users;
	};

	CollabFileEditingAnnotation.prototype = Object.create(CollabFileAnnotation.prototype);

	/**
	 * Get description of this annotation which can be used in for example
	 * tooltip.
	 * 
	 * @return {string} - description
	 */
	CollabFileEditingAnnotation.prototype.getDescription = function() {
		return '<b>' + this.users.join('</b>, <b>') + '</b> ' + (this.users.length > 1 ? 'are' : 'is') + ' modifying this file.';
	};

	/**
	 * Generate a new HTML element of this annotation.
	 * 
	 * @return {Element} - the HTML element of this annotation
	 */
	CollabFileEditingAnnotation.prototype.generateHTML = function() {
		var element = document.createElement('div');
		element.innerHTML = '···';
		element.classList.add('editingAnnotation');
		return element;
	};

    return {
		CollabFileEditingAnnotation: CollabFileEditingAnnotation
	};
});
