/*******************************************************************************
 * @license
 * Copyright (c) 2013, 2017 IBM Corporation and others.
 * All rights reserved. This program and the accompanying materials are made
 * available under the terms of the Eclipse Public License 2.0
 * (http://www.eclipse.org/legal/epl-v10.html), and the Eclipse Distribution
 * License v1.0 (http://www.eclipse.org/org/documents/edl-v10.html).
 *
 * Contributors:
 *     IBM Corporation - initial API and implementation
 *******************************************************************************/
/*eslint-env amd*/
/**
 * @see http://wiki.eclipse.org/Orion/Dependency_resolution
 */
define([
	'orion/objects',
	'orion/Deferred',
	'javascript/lru'
], function(Objects, Deferred, LRU) {

	/**
	 * @name ScriptResolver
	 * @description Creates a new script resolver for finding workspace file based
	 * on a given logical path and search options
	 * @param {orion.ServiceRegistry} serviceRegistry The service registry object
	 * @constructor
	 * @since 8.0
	 */
	function ScriptResolver(serviceRegistry) {
		this.serviceRegistry = serviceRegistry;
		this.cache = new LRU(10);
	}

	function getKey(loc, _name) {
		if (loc) {
			return loc + _name;
		}
		return _name;
	}

	Objects.mixin(ScriptResolver.prototype, {
		/**
		 * Returns an array of workspace file that match the given logical name and options
		 * @param {String} logicalName The name of the file to look up, for example, 'orion/objects'
		 * @param {Object} options The map of search options.
		 *
		 * >Supported options include:
		 * >  * ext - the file extension type to look for, for example 'js'
		 * >  * icon - the URL or relative path to the icon to describe found files
		 * >  * type - the name to use for the content type of any found files
		 *
		 * @returns {Deferred} Array of found files or ```null```
		 */
		getWorkspaceFile: function getWorkspaceFile(logicalName, options) {
			if (logicalName) {
				return this._getFile(logicalName, options);
			}
			return new Deferred().resolve(null);
		},
		getFileClient: function getFileClient() {
			if (!this.fileclient) {
				this.fileclient = this.serviceRegistry.getService("orion.core.file.client"); //$NON-NLS-1$
			}
			return this.fileclient;
		},
		setSearchLocation: function setSearchLocation(searchLocation) {
			this.searchLocation = searchLocation;
		},
		getSearchLocation: function getSearchLocation() {
			if (typeof this.searchLocation === 'string' && this.searchLocation.length > 0) {
				return new Deferred().resolve(this.searchLocation);
			}
			return this.getFileClient().fileServiceRootURL();
		},
		_getFile: function _getFile(name, options) {
			var files = this.cache.get(getKey(this.searchLocation, name));
			if (files) {
				return new Deferred().resolve(files);
			}
			var opts = options ? options : Object.create(null);
			var ext = opts.ext ? opts.ext : 'js'; //$NON-NLS-1$
			var icon = opts.icon ? opts.icon : '../javascript/images/javascript.png'; //$NON-NLS-1$
			var type = opts.type ? opts.type : 'JavaScript'; //$NON-NLS-1$
			var dotext = '.' + ext;
			var pref = this._removePrefix(name);
			var filename = pref.length > 1 ? pref[1] : pref[0];
			var idx = filename.lastIndexOf('/'),
				extidx = filename.lastIndexOf('.');
			if(extidx > idx) {
				ext = filename.slice(extidx+1);
				dotext = '.'+ext;
			}
			var searchname = filename.slice(idx + 1);

			// Search for it
			return this.getSearchLocation().then(function(searchLocation) {
				return this.getFileClient().search({
					resource: searchLocation,
					keyword: searchname,
					caseSensitive: true,
					wholeWord: true,
					sort: 'Name asc', //$NON-NLS-1$
					nameSearch: true,
					fileType: ext,
					start: 0,
					rows: 30,
					exclude: ['node_modules']
				}).then(function(res) {
					var r = res.response;
					var len = r.docs.length;
					if (r.numFound > 0) {
						files = [];
						var testname = filename.replace(/(?:\.?\.\/)*/, '');
						testname = testname.replace(new RegExp("\\" + dotext + "$"), ''); //$NON-NLS-1$
						testname = testname.replace(/\\/g, "/");
						testname = testname.replace(/\//g, "\\/"); //$NON-NLS-1$
						for (var i = 0; i < len; i++) {
							var file = r.docs[i];
							//TODO haxxor - only keep ones that end in the logical name or the mapped logical name
							var regex = ".*(?:" + testname + ")$"; //$NON-NLS-1$ //$NON-NLS-2$
							if (new RegExp(regex).test(file.Location.slice(0, file.Location.length - dotext.length))) {
								files.push(this._newFileObj(file.Name, file.Location, this._trimName(file.Path), icon, type));
							}
						}
						if (files.length > 0) {
							this.cache.put(getKey(this.searchLocation, filename), files);
							return files;
						}
					}
					return null;
				}.bind(this));
			}.bind(this));
		},

		/**
		 * @description Removes the prefix of a name a la requirejs
		 * @param {String} name The name to remove the prefix from
		 * @returns {Array.<String>} The array of prefix followed by the trimmed name, or an array with a single entry (if no prefix was removed).
		 * @since 10.0
		 */
		_removePrefix: function _removePrefix(name) {
			var idx = name.indexOf('!');
			if (idx > -1) {
				return name.split('!');
			}
			return [name];
		},

		/**
		 * @description Resolves the files that match the given location
		 * @function
		 * @param {String} path The path to resolve against
		 * @param {Array} files The array of files
		 * @param {Object} metadata The file metadata from the workspace
		 * @returns {Array} The filtered list of files for the relative path or an empty array, never null
		 * @since 8.0
		 */
		resolveRelativeFiles: function resolveRelativeFiles(path, files, metadata) {
			if (files && files.length > 0 && metadata) {
				var filepath = metadata.location;
				var _files = [];
				var pref = this._removePrefix(path);
				var _p = pref.length > 1 ? pref[1] : pref[0];
				filepath = filepath.slice(0, filepath.lastIndexOf('/'));
				var relative = false;
				if (_p.charAt(0) !== '.') {
					filepath = this._appendPath(filepath, _p);
				} else {
					relative = true;
					//resolve the realtive path
					var rel = /^\.\.\//.exec(_p);
					if (rel) {
						while (rel !== null) {
							filepath = filepath.slice(0, filepath.lastIndexOf('/'));
							_p = _p.slice(3);
							rel = /^\.\.\//.exec(_p);
						}
						filepath = this._appendPath(filepath, _p);
					} else {
						while (/^\.\//.test(_p)) {
							_p = _p.slice(2);
						}
						filepath = this._appendPath(filepath, _p);
					}
				}
				for (var i = 0; i < files.length; i++) {
					var file = files[i];
					var loc = file.location ? file.location : file.Location;
					if (loc === filepath) {
						_files.push(file);
					} else if (this._samePaths(file, filepath, metadata)) {
						_files.push(file);
					} else if (!relative) {
						var idx = loc.lastIndexOf('.');
						var p1 = loc;
						if (idx > -1) {
							p1 = loc.slice(0, idx);
						}
						var _test = _p.replace(/[/?|{}()*.#$^]/g, '\\$&'); //$NON-NLS-1$
						var reg = new RegExp(_test + "$");
						if (reg.test(p1)) {
							_files.push(file);
						}
					}
				}
				return _files;
			}
			return [];
		},

		/**
		 * Returns if the two paths are the same
		 * @param {String} file The first path
		 * @param {String} path2 The second path
		 * @returns {Boolean} If the paths are the same
		 */
		_samePaths: function _samePaths(file, path2, meta) {
			if (file === null) {
				return path2 === null;
			}
			if (typeof file === 'undefined') {
				return typeof path2 === 'undefined';
			}
			if (path2 === null) {
				return file === null;
			}
			if (typeof path2 === 'undefined') {
				return typeof file === 'undefined';
			}
			//get rid of extensions and compare the names
			var loc = file.location ? file.location : file.Location;
			if (!loc) {
				return false;
			}
			var idx = loc.lastIndexOf('.');
			var p1 = loc;
			if (idx > -1) {
				p1 = loc.slice(0, idx);
			}
			if (path2 === p1) {
				return true; //could be that only the extension was missing from the other path
			}
			idx = path2.lastIndexOf('.');
			var p2 = path2;
			if (idx > -1) {
				p2 = path2.slice(0, idx);
			}
			if (p1 === p2) {
				return true;
			} else if (p1 === decodeURIComponent(p2)) {
				return true;
			}
			return false;
		},

		/**
		 * @description Adds the additional path to the given path
		 * @function
		 * @private
		 * @param {String} path The original path
		 * @param {String} addition The additonal path to append
		 * @returns {String | null} Returns the new path as a string or null if either of the parameters are not strings
		 * @since 8.0
		 */
		_appendPath: function _appendPath(path, addition) {
			if (typeof path === 'string' && typeof addition === 'string') {
				var newpath = path;
				if (newpath.charAt(newpath.length - 1) !== '/') {
					newpath += '/';
				}
				if (addition.charAt(0) === '/') {
					newpath += addition.slice(1);
				} else {
					newpath += addition;
				}
				return newpath;
			}
			return null;
		},

		_trimName: function _trimeName(name) {
			//TODO haxxor - we don't need to see the root client path
			return name.replace(/^(?:org\.eclipse\.orion\.client)?(?:\/)?bundles\//, '');
		},

		_newFileObj: function _newFileObj(name, location, path, icon, type) {
			var meta = Object.create(null);
			meta.name = name;
			meta.location = location;
			meta.path = path;
			meta.contentType = Object.create(null);
			if (icon) {
				meta.contentType.icon = icon;
			}
			if (type) {
				meta.contentType.name = type;
			}
			return meta;
		}
	});

	return {
		ScriptResolver: ScriptResolver
	};
});
