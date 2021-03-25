/*******************************************************************************
 * @license
 * Copyright (c) 2014, 2015 IBM Corporation and others.
 * All rights reserved. This program and the accompanying materials are made 
 * available under the terms of the Eclipse Public License 2.0 
 * (http://www.eclipse.org/legal/epl-v10.html), and the Eclipse Distribution 
 * License v1.0 (http://www.eclipse.org/org/documents/edl-v10.html). 
 * 
 * Contributors: IBM Corporation - initial API and implementation
 ******************************************************************************/
/*
 * Helper script for Orion build-time minification. This replaces any calls to the unminified `require.js`
 * with the minified `require.min.js` in each bundle's web content.
 */
/*global importPackage orion Packages project attributes self*/
/* eslint-disable missing-nls */
// Load helper library
(function() {
	var file = project.resolveFile(project.replaceProperties("${builder}/scripts/helpers.js"));
	var scanner = new Packages.java.util.Scanner(file, "UTF-8").useDelimiter("\\Z");
	var code = String(scanner.next());
	scanner.close();
	eval(code);
}());

var bundles = orion.build.getBundles(orion.build.getBuildObject(attributes.get("buildfile")));
bundles.forEach(function(bundle) {
	var task = project.createTask("replace");
	task.setToken("requirejs/require.js");
	task.setValue("requirejs/require.min.js");
	task.setDir(bundle.web);
	task.setIncludes("**/*.html");
	task.setIncludes("**/*.js");

	task.perform();
});
