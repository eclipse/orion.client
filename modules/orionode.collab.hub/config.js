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

module.exports = {
	/**
	 * jwt_secret needs to be the same as the one in the server connected to the filesystem (orion)
	 */
	'jwt_secret': "orion collab",
	/**
	 * Orion url
	 */
	'orion': "http://localhost:8084/",
	/**
	 * Load url. Make sure end with /
	 */
	'fileLoadUrl': "sharedWorkspace/tree/load/",
	/**
	 * Save url. Make sure end with /
	 */
	'fileSaveUrl': "sharedWorkspace/tree/save/",
	/**
	 * Check session url. Make sure end with /
	 */
	'checkSessionUrl': "sharedWorkspace/tree/session/",
	/**
	 * Specify how long between every saving (in ms)
	 */
	'saveFrequency': 1000
}
