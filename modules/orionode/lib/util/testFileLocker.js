/*******************************************************************************
 * Copyright (c) 2018 IBM Corporation and others.
 * All rights reserved. This program and the accompanying materials are made 
 * available under the terms of the Eclipse Public License 2.0 
 * (http://www.eclipse.org/legal/epl-v10.html), and the Eclipse Distribution 
 * License v1.0 (http://www.eclipse.org/org/documents/edl-v10.html). 
 *
 * Contributors:
 *     IBM Corporation - initial API and implementation
 *******************************************************************************/
var FileLocker = require("./fileLocker");

var locker = new FileLocker(".lock");
locker._acquireLock(true).then(function() {
	console.log("locked");
	setTimeout(function() {
		locker._releaseLock().then(function() {
			console.log("released");
		}, function() {
			console.log("release failed");
		});
	}, 15000);
}, function() {
	console.log("failed");
});
