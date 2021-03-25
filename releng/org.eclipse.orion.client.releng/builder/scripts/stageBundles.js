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
 * Helper script for Orion build-time minification. Reads bundles from the provided @{buildfile}
 * and copies their web folders to @{todir}.
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

var Project = Packages.org.apache.tools.ant.Project;
var buildFile = attributes.get("buildfile");
var todir = attributes.get("todir");

if (!buildFile || !todir)
	throw new Error("Missing attribute");
	
var buildConfigBundles = orion.build.getBuildObject(buildFile).bundles || [];
if (!buildConfigBundles.length)
	self.log("No bundles found in build file " + buildFile, Project.MSG_WARN);

// Create a fileset for every bundle's web/ folder
var buildConfig = orion.build.getBuildObject(buildFile),
    bundles = orion.build.getBundles(buildConfig);
var filesets = bundles.map(function(bundle) {
	var fileset = project.createDataType("fileset");
	fileset.setDir(bundle.web);
	fileset.setIncludes("**");
	fileset.setExcludes("**/node_modules/**");
	return fileset;
});

// Execute a <copy> task for each fileset
filesets.forEach(function(fileset, i) {
	self.log("About to stage bundle " + bundles[i].web);
	var task = project.createTask("copy");
	task.addFileset(fileset);
	task.setTodir(new Packages.java.io.File(todir));
	task.setOverwrite(true); // overwrite destination files, even if newer
	task.setVerbose(true);
	task.perform();
});
