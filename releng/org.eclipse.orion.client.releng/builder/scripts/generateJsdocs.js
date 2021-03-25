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
 * Helper script for Orion build-time minification. Reads bundles from @{buildfile} and invokes
 * JSDoc on them using the provided @{jar}, passing command-line arguments <argline>s and <arg>s.
 */
/*global importPackage orion Packages project attributes elements self*/
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
var jar = attributes.get("jar");
var argLines  = orion.build.listToArray(elements.get("argline")),
    argValues = orion.build.listToArray(elements.get("arg"));

var jsdocs = orion.build.getBuildObject(buildFile).jsdocs || [];
if (!jsdocs.length)
	self.log("No jsdocs found in build file " + buildFile, Project.MSG_WARN);

var _self = self;
var folders = jsdocs.map(function(docFolder) {
	var dir = project.resolveFile(project.replaceProperties(docFolder));
	if (!dir.exists() || !dir.isDirectory()) {
		_self.log("Folder " + dir.getPath() + " does not exist", Project.MSG_WARN);
		return null;
	}
	return dir;
}).filter(function(a) { return !!a; });

// Perform JSDoc java task
var task = project.createTask("java");
task.setJar(project.resolveFile(jar));
task.setFork(true);

// Add whatever <argline>s and <arg>s were passed to us
argLines.forEach(function(line) {
	var value = project.replaceProperties(line.getValue());
	task.createArg().setLine(value);
});
argValues.forEach(function(arg) {
	var value = project.replaceProperties(arg.getValue());
	task.createArg().setValue(value);
});

// Then add args for each folder
folders.forEach(function(folder) {
	var javaArg = task.createArg();
	javaArg.setFile(folder);
});

task.perform();
