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
	
var buildConfigModules = orion.build.getBuildObject(buildFile).modules || [];
if (!buildConfigModules.length)
	self.log("No modules found in build file " + buildFile, Project.MSG_WARN);
var bundles = orion.build.getBundles(orion.build.getBuildObject(attributes.get("buildfile")));
if (!bundles.length)
	self.log("No bundles found in build file " + buildFile, Project.MSG_WARN);

self.log("Generate fingerprint for JS files");
var fingerprintModules = [new Packages.java.io.File(todir, "javascript/plugins/ternWorker.js")], jsMaps = [];
buildConfigModules.forEach(function(optimizedModule, i) {
	var srcFile = new Packages.java.io.File(todir, optimizedModule.name + ".js");
	var checksum = project.createTask("checksum");
	checksum.setFile(srcFile);
	checksum.setAlgorithm("SHA-1");
	checksum.setProperty("fingerprint.hash.js." + i);
	checksum.perform();
	var orgName = optimizedModule.name;
	var mappedName = optimizedModule.name + "." + project.getProperty("fingerprint.hash.js." + i);
	jsMaps.push({name: orgName, mappedName: mappedName});
	var destFile = new Packages.java.io.File(todir, mappedName + ".js");
	fingerprintModules.push(destFile);
	var task = project.createTask("copy");
	task.setFile(srcFile);
	task.setTofile(destFile);
	task.setOverwrite(true); // overwrite destination files, even if newer
	task.setVerbose(true);
	task.perform();
});

self.log("Generate fingerprint for CSS files");
var cssMaps = [];
buildConfigModules.forEach(function(optimizedModule, i) {
	var srcFile = new Packages.java.io.File(todir, optimizedModule.name + ".css");
	if (!srcFile.exists()) {
		return;
	}
	var checksum = project.createTask("checksum");
	checksum.setFile(srcFile);
	checksum.setAlgorithm("SHA-1");
	checksum.setProperty("fingerprint.hash.css." + i);
	checksum.perform();
	var orgName = srcFile.getName();
	var mappedName = orgName.substring(0, orgName.length() - 4) + "." + project.getProperty("fingerprint.hash.css." + i) + ".css";
	cssMaps.push({name: orgName, mappedName: mappedName});
	var destFile = new Packages.java.io.File(srcFile.getParent(), mappedName);
	var task = project.createTask("copy");
	task.setFile(srcFile);
	task.setTofile(destFile);
	task.setOverwrite(true); // overwrite destination files, even if newer
	task.setVerbose(true);
	task.perform();
});

self.log("Replace fingerprint in optimized JS files");
fingerprintModules.forEach(function(m) {
	jsMaps.forEach(function(map) {
		var task = project.createTask("replace");
		task.setToken('"' + map.name + '"');
		task.setValue('"' + map.mappedName + '"');
		task.setFile(m);
		task.perform();	
	});
});

self.log("Replace fingerprint JS/CSS in HTML files");
bundles.forEach(function(bundle) {
	jsMaps.forEach(function(map) {
		var task = project.createTask("replace");
		task.setToken('"' + map.name + '"');
		task.setValue('"' + map.mappedName + '"');
		task.setDir(bundle.web);
		task.setIncludes("**/*.html");
		task.setExcludes("**/embeddedEditor/**");
		task.perform();	
	});
	cssMaps.forEach(function(map) {
		var task = project.createTask("replace");
		task.setToken('"' + map.name + '"');
		task.setValue('"' + map.mappedName + '"');
		task.setDir(bundle.web);
		task.setIncludes("**/*.html");
		task.setExcludes("**/embeddedEditor/**");
		task.perform();	
	});
});

