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
 * Helper script for Orion build-time minification.
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

var buildConfig = orion.build.getBuildObject(buildFile);
if (!buildConfig.bundles || !buildConfig.bundles.length)
	self.log("No bundles found in build file " + buildFile, Project.MSG_WARN);

orion.build.getBundles(buildConfig).forEach(function(bundle) {
	// Call the "copybackBundle" target
	var antcall = project.createTask("antcall");
	antcall.setTarget("copybackBundle");
	//antcall.setDynamicAttribute("out", attributes.get("out"));
	//antcall.setDynamicAttribute("bundle", (bundle.bundle + Packages.java.io.File.separator + "web"));

	var outParam = antcall.createParam();
	outParam.setName("out");
	outParam.setValue(attributes.get("out"));

	var bundleParam = antcall.createParam();
	bundleParam.setName("bundle");
	bundleParam.setValue(bundle.bundle + Packages.java.io.File.separator + "web");
	antcall.execute();
});
