/*******************************************************************************
 * Copyright (c) 2017 IBM Corporation and others.
 * All rights reserved. This program and the accompanying materials are made 
 * available under the terms of the Eclipse Public License 2.0 
 * (http://www.eclipse.org/legal/epl-v10.html), and the Eclipse Distribution 
 * License v1.0 (http://www.eclipse.org/org/documents/edl-v10.html). 
 *
 * Contributors:
 *     IBM Corporation - initial API and implementation
 *******************************************************************************/
/*eslint-env node */
var path = require('path'),
	Promise = require('bluebird'),
	fs = Promise.promisifyAll(require('fs'));
	
var defaultIgnoreLines = [
	".cfignore",
	"/manifest.yml",
	".gitignore",
	".git",
	".hg",
	".svn",
	"_darcs",
	".DS_Store"
];
var globRegex = new RegExp("^\/$|^(([^\/]|[\\*\\?])+)?(\/([^\/]|[\\*\\?])*)*$");
/**
 * @description Class to handle cf ignore file
 * @since 17.0
 */
class CFIgnoreManager {
	/**
	 * @description Create a new instance of the class
	 */
	constructor() {		
		// By default, all . start hidden files are ignored.
		this.cfIgnoreRules = [];
	}
	
	/**
	 * @public
	 * @description Load cf ignore file and parse it. Note cf ignore only respect the .cfignore file on the project root(doesn't like .gitignore)
	 * @param {string} .cfignore file root directory path;
	 * @return {Promise} which resolves nothing, but means the cfignore file is loaded and parsed if exist.
	 */
	loadCfIgnoreFile(rootPath){
		var cfIgnorefile = path.join(rootPath,".cfignore");
		return fs.readFileAsync(cfIgnorefile, 'utf-8')
		.then(function(content){
			this.parse(content);
			return;
		}.bind(this))
		.catch(function(error){
			// ignore error
			return;
		});
	}
	
	/**
	 * @public
	 * @description Used to get filter function
	 * @return a filter function, which takes relative path to check if that path should be cf ignored
	 */
	generateFilter(){
		var rules = this.cfIgnoreRules;
		return function(pathRelativeToRoot){
			var result = rules.some(function(rule){
				if(rule.original.startsWith("\/") && !pathRelativeToRoot.startsWith("\/")){
					pathRelativeToRoot = "/" + pathRelativeToRoot;
				}
				if(rule.regex.test(pathRelativeToRoot)){
					return rule.exclude;
				}
			});
			return result;
		};
	}
	
	/**
	 * @private
	 * @description parse .cfignore file content, split file by line, and add rules for good lines
	 * @param {string} .cfignore file content
	 */
	parse(content){
		var lines = content.split(/\n/);
		lines = lines.concat(defaultIgnoreLines);
		lines.forEach(function(line){
			line = line.trim();
			if(line.startsWith("\\")){
				throw new Error("invalid glob pattern ", line);
			}
			if(line && !line.startsWith("#")){
				var ignore = true;
				if(line.startsWith("!")){
					ignore = false;
				}
				line = path.normalize(line);
				if(line.endsWith("/")){
					line = line.slice(0, -1);
				}
				this.addIgnorePattern(ignore, line);
				this.addIgnorePattern(ignore, path.join(line,"*"));
				this.addIgnorePattern(ignore, path.join(line,"**","*"));
				if(!line.startsWith("\/")){
					this.addIgnorePattern(ignore, path.join("**", line));
					this.addIgnorePattern(ignore, path.join("**", line,"*"));
					this.addIgnorePattern(ignore, path.join("**", line,"**","*"));
				}
			}
		}.bind(this));
	}
	
	/**
	 * @private
	 * @description Add a rule to cfIgnoreRules list
	 * @param {string} an un-empty string, used to convert into a regex as a single rule
	 */
	addIgnorePattern(exclude, line){
		var original = line;
		if (!globRegex.test(line)){
			throw new Error("invalid glob pattern ", line);
		}
		var charactors = line.split('');
		var outs= [];
		var double = false, i = 0;
		charactors.forEach(function(charactor){
			switch(charactor) {
				default:
					outs[i] = charactor;
					double = false;
					break;
				case '.':
				case '+':
				case '-':
				case '^':
				case '$':
				case '[':
				case ']':
				case '(':
				case ')':
					outs[i] = '\\' + charactor;
					double = false;
					break;
				case '?':
					outs[i] = '[^\/]';
					double = false;
					break;
				case '*':
					if (double) {
						outs[i - 1] = '.*';
					} else {
						outs[i] = '[^\/]*';
					}
					double = !double;
					break;
			}
			i++;
		});
		outs = outs.slice(0, i);
		this.cfIgnoreRules.push({exclude:exclude, original:original, regex:new RegExp("^" + outs.join("") + "$")});
	}
}

module.exports.CFIgnoreManager = CFIgnoreManager;
