/*******************************************************************************
 * @license
 * Copyright (c) 2010, 2017 IBM Corporation and others.
 * All rights reserved. This program and the accompanying materials are made
 * available under the terms of the Eclipse Public License 2.0
 * (http://www.eclipse.org/legal/epl-v10.html), and the Eclipse Distribution
 * License v1.0 (http://www.eclipse.org/org/documents/edl-v10.html).
 *
 * Contributors: IBM Corporation - initial API and implementation
 ******************************************************************************/
/*eslint-env browser, amd*/
define([
	'orion/Deferred',
	'orion/edit/editorContext',
], function(Deferred, EditorContext) {

	function getFilteredValidator(validator, contentType, contentTypeService) {
		var contentTypeIds = validator.getProperty("contentType"); //$NON-NLS-0$
		return contentTypeService.isSomeExtensionOf(contentType, contentTypeIds).then(function(result) {
			return result ? validator : null;
		});
	}

	function clamp(n, min, max) {
		n = Math.max(n, min);
		n = Math.min(n, max);
		return n;
	}

    function extractProblems(data) {
		data = data || {};
		var problems = data.problems || data.errors || data;
		return Array.isArray(problems) ? problems : [];
	}

	function _fixup(problems, model) {
		for (var i=0; i < problems.length; i++) {
			var problem = problems[i];

			problem.description = problem.description || problem.reason;
			problem.severity = problem.severity || "error"; //$NON-NLS-0$
			problem.start = typeof problem.start === "number" ? problem.start : problem.character;

			// Range check
			if (typeof problem.line === "number") {
				// start, end are line offsets: 1-based in range [1 .. length+1]
				var lineLength = model.getLine(problem.line - 1, false).length;
				problem.start = clamp(problem.start, 1, lineLength);
				problem.end = typeof problem.end === "number" ? problem.end : -1;
				problem.end = clamp(problem.end, problem.start + 1, lineLength + 1);

				// TODO probably need similar workaround for bug 423482 here
			} else {
				// start, end are document offsets (0-based)
				var charCount = model.getCharCount();
				problem.start = clamp(problem.start, 0, charCount); // leave room for end
				problem.end = typeof problem.end === "number" ? problem.end : -1;
				problem.end = clamp(problem.end, problem.start, charCount);

				// Workaround: if problem falls on the empty, last line in the buffer, move it to a valid line.
				// https://bugs.eclipse.org/bugs/show_bug.cgi?id=423482
				if (problem.end === charCount && model.getLineCount() > 1 && charCount === model.getLineStart(model.getLineCount() - 1)) {
					var prevLine = model.getLineCount() - 2, prevLineStart = model.getLineStart(prevLine), prevLineEnd = model.getLineEnd(prevLine);
					if (prevLineStart === prevLineEnd) {
						// Empty range on an empty line seems to be OK, if not at EOF
						problem.start = problem.end = prevLineEnd;
					} else {
						problem.start = prevLineEnd - 1;
						problem.end = prevLineEnd;
					}
				}
			}
		}
	}

	/**
	 * @name orion.SyntaxChecker
	 * @class Provides access to validation services registered with the service registry.
	 * @description Provides access to validation services registered with the service registry.
	 */
	function SyntaxChecker(serviceRegistry, model) {
		this.registry = serviceRegistry;
		this.textModel = model;
	}

	SyntaxChecker.prototype = /** @lends orion.SyntaxChecker.prototype */ {
		/**
		 * @name initialize
		 * @description Allows providers that implement this function to pre-initisalize their state, etc, before being called later to actually perform validation
		 * @function
		 * @public
		 * @param {String} loc The location path to initialize from
		 * @param {Object} contentType The optional content type
		 * @since 12.0
		 */
		initialize: function initialize(loc, contentType) {
			if(!contentType) {
				//initialize all of them
				this.registry.getServiceReferences("orion.edit.validator").forEach(function(ref) {
					var _v = this.registry.getService(ref);
					if(_v && typeof _v.initialize === "function") {
						_v.initialize(loc);
					}
				}.bind(this));
				return;
			}
			this.getValidators(loc, contentType).then(function(validators) {
				if(Array.isArray(validators) && validators.length > 0) {
					validators.forEach(function(validator) {
						var _v = this.registry.getService(validator);
						if(_v && typeof _v.initialize === "function") {
							_v.initialize(loc, contentType);
						}
					}.bind(this));
				}
			}.bind(this));
		},
		/**
		 * @description Looks up applicable validators, calls them to obtain problems, passes problems to the marker service.
		 * @function
		 * @public
		 * @param {Object} contentType The content type of the file to check
		 * @param {String} loc The fully qualified path of the file to check
		 * @param {String} message The message to display
		 * @param {String} contents The file contents to check
		 * @param {Object} editorContext The backing editor content to run with
		 * @returns {Array.<Object>} The array of problem objects or the empty array
		 * @see https://wiki.eclipse.org/Orion/Documentation/Developer_Guide/Plugging_into_the_editor#The_Problem_object
		 */
		checkSyntax: function checkSyntax(contentType, loc, message, contents, editorContext) {
			if (!contentType || message) {
				return new Deferred().resolve([]);
			}
			if (!message) {
				var serviceRegistry = this.registry;
				return this.getValidators(loc, contentType).then(function(validators) {
					if(validators.length === 0) {
						return new Deferred().resolve();
					}
					var progress = serviceRegistry.getService("orion.page.progress");
					var problemPromises = validators.map(function(validator) {
						var service = serviceRegistry.getService(validator);
						var promise;
						if (service.computeProblems) {
							var context = {
								contentType: contentType.id,
								title: loc
							};
							promise = service.computeProblems(editorContext ? editorContext : EditorContext.getEditorContext(serviceRegistry), context);
						} else if (service.checkSyntax) {
							// Old API
							promise = service.checkSyntax(loc, contents);
						}
						return progress.progress(promise, "Validating " + loc).then(extractProblems);
					});

					return Deferred.all(problemPromises, function(error) {return {_error: error}; })
						.then(function(results) {
							var problems = [];
							for (var i=0; i < results.length; i++) {
								var probs = results[i];
								if (!probs._error) {
									_fixup(probs, this.textModel);
									problems = problems.concat(probs);
								}
							}
							return new Deferred().resolve(problems);
							//serviceRegistry.getService("orion.core.marker")._setProblems(problems); //$NON-NLS-0$
						}.bind(this));
				}.bind(this),
				/* @callback */ function(err) {
					return new Deferred().resolve([]);
				});
			}
		},
		/**
		 * @description Allows the text model to be set
		 * @function
		 * @public
		 * @param {editor.TextModel} model The new model to set
		 */
		setTextModel: function setTextModel(model) {
			this.textModel = model;
		},
		/**
		 * @name getValidators
		 * @description Returns the filtered list of validators that aply to the given location and content type
		 * @function
		 * @public
		 * @param {String} loc The location of the resource
		 * @param {Object} contentType The content type object
		 * @returns {Deferred} The deferred to resolve the array of applicable validators
		 * @since 12.0
		 */
		getValidators: function getValidators(loc, contentType) {
			var contentTypeService = this.registry.getService("orion.core.contentTypeRegistry"); //$NON-NLS-0$
			var validators = this.registry.getServiceReferences("orion.edit.validator"); //$NON-NLS-0$
			var filteredValidators = [];
			for (var i=0; i < validators.length; i++) {
				var serviceReference = validators[i];
				var pattern = serviceReference.getProperty("pattern"); // backwards compatibility //$NON-NLS-0$
				if (serviceReference.getProperty("contentType")) { //$NON-NLS-0$
					filteredValidators.push(getFilteredValidator(serviceReference, contentType, contentTypeService));
				} else if (pattern && new RegExp(pattern).test(loc)) {
					var d = new Deferred();
					d.resolve(serviceReference);
					filteredValidators.push(d);
				}
			}
			// Return a promise that gives the validators that aren't null
			return Deferred.all(filteredValidators, function(error) {return {_error: error}; }).then(
				function(validators) {
					var capableValidators = [];
					for (i=0; i < validators.length; i++) {
						var validator = validators[i];
						if (validator && !validator._error) {
							capableValidators.push(validator);
						}
					}
					return capableValidators;
				});
		}
	};
	return {
		SyntaxChecker: SyntaxChecker
	};
});
