/*******************************************************************************
 * @license
 * Copyright (c) 2009, 2012 IBM Corporation and others.
 * All rights reserved. This program and the accompanying materials are made 
 * available under the terms of the Eclipse Public License 2.0 
 * (http://www.eclipse.org/legal/epl-v10.html), and the Eclipse Distribution 
 * License v1.0 (http://www.eclipse.org/org/documents/edl-v10.html). 
 *
 * Contributors: IBM Corporation - initial API and implementation
 *******************************************************************************/
/*eslint-env browser, amd*/
define([
], function() {
	var inMemoryFilePattern = "/in_memory_fs/project/";
	var project = "/in_memory_fs/project/";
	//return module exports
	return {
		MEMORY_FILE_PATTERN: inMemoryFilePattern,
		MEMORY_FILE_PROJECT_PATTERN: project
	};
});
