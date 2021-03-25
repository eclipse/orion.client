/*******************************************************************************
 * @license
 * Copyright (c) 2014 IBM Corporation and others.
 * All rights reserved. This program and the accompanying materials are made 
 * available under the terms of the Eclipse Public License 2.0 
 * (http://www.eclipse.org/legal/epl-v10.html), and the Eclipse Distribution 
 * License v1.0 (http://www.eclipse.org/org/documents/edl-v10.html). 
 * 
 * Contributors: IBM Corporation - initial API and implementation
 ******************************************************************************/
/*
 * Helpers for the grunt build script.
 */
/*eslint-env browser, node*/
/*eslint no-new-func:0*/
var _path = require("path");
module.exports = function(grunt) {
	var self = {};

	function replaceProperties(str, props) {
		props = props || {};
		return str.replace(/\$\{([^}]*)\}/g, function(match, propertyName) {
			if (props[propertyName] === undefined)
				throw new Error("Property not found, cannot replace: " + propertyName);
			// grunt.log.writeln("Replace ", propertyName, "with", props[propertyName]);
			return props[propertyName];
		});
	}

	self.loadBuildConfig = function(configPath) {
		return (new Function("var bc = " + grunt.file.read(configPath) + "; return bc;"))();
	};

	/**
	 * @returns {Bundle[]} where Bundle is {{ name: string, path: string, web: string }}
	 */
	self.parseBundles = function(buildConfig, replacements) {
		return buildConfig.bundles.map(function(path) {
			path = replaceProperties(path, replacements);
			return {
				name: _path.basename(path),
				path: path,
				web: _path.join(path, "web")
			};
		});
	};
	
	/**
	 * @returns {Bundle[]} where Bundle is {{ name: string, path: string, web: string }}
	 */
	self.parseModules = function(buildConfig) {
		return buildConfig.modules.map(function(module) {
			return module.name;
		});
	};

	/**
	 * @returns {Object} A copy of `config` with the `excludeModules` removed from its `modules` section.
	 */
	self.filterBuildConfig = function(config, excludeModules, extraModules, extraPaths) {
		excludeModules = excludeModules || [];
		var clone = JSON.parse(JSON.stringify(config));
		clone.modules = clone.modules && clone.modules.filter(function(module) {
			var baseName = module.name.split("/").pop();
			return excludeModules.indexOf(baseName) === -1;
		});
		extraModules.forEach(function(m) {
			m.excludeShallow = clone.modules[0].excludeShallow;
		});
		clone.modules = clone.modules.concat(extraModules || []);
		for (var p in extraPaths || {}) {
			clone.paths[p] = extraPaths[p];
		}
		return clone;
	};

	self.mixin = function(target/*, source..*/) {
		if (!target || typeof target !== "object")
			throw new Error("target is required");
		for (var j = 1; j < arguments.length; j++) {
			var source = arguments[j];
			for (var key in source)
				if (Object.prototype.hasOwnProperty.call(source, key))
					target[key] = source[key];
		}
		return target;
	};

	return self;
};
