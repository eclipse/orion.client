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
/*eslint-env browser,amd*/
define([], function(){

	function _appendIndentation(res, indentation){
		var tmp = "";
		for(var i=0; i<indentation; ++i)
			tmp += " "; //$NON-NLS-0$

		res.push(tmp);
	}

	function _toYMLArray(res, arr, indentation){
		arr.forEach(function(element){
			_appendIndentation(res, indentation);
			res.push("- "); //$NON-NLS-0$

			if(typeof(element) === "string"){ //$NON-NLS-0$
				res.push(element + "\n"); //$NON-NLS-0$
			} else if(typeof(element) === "object"){ //$NON-NLS-0$
				_toYMLObject(res, element, indentation + 2, false);
			} else {
				throw new Error("Could not parse JSON to YML");
			}
		});
	}

	function _toYMLObject(res, json, indentation, indentFirst){
		Object.keys(json).forEach(function(property, i) {

			if(i !== 0 || indentFirst)
				_appendIndentation(res, indentation);

			res.push(property + ":"); //$NON-NLS-0$
			var val = json[property];
			if(typeof(val) === "string" || typeof(val) === "boolean"){ //$NON-NLS-0$ //$NON-NLS-1$
				res.push(" " + val + "\n"); //$NON-NLS-0$ //$NON-NLS-1$
			} else if(val instanceof Array){
				res.push("\n"); //$NON-NLS-0$
				_toYMLArray(res, val, indentation);
			} else if(typeof(val) === "object"){ //$NON-NLS-0$
				res.push("\n"); //$NON-NLS-0$
				_toYMLObject(res, val, indentation + 2, true);
			} else {
				throw new Error("Could not parse JSON to YML");
			}
		});
	}

	return {

		toYML : function(manifest){
			var res = ["---\n"]; //$NON-NLS-0$
			_toYMLObject(res, manifest, 0, false);
			return res.join("");
		},

		applyInstrumentation : function(manifest, instrumentation){

			if(!manifest || !manifest.applications || !(manifest.applications instanceof Array))
				return null;

			/* create deep copy */
			var serialized = JSON.stringify(manifest);
			var instrumentedManifest = JSON.parse(serialized);

			Object.keys(instrumentation).forEach(function(key){
				var value = instrumentation[key];
				instrumentedManifest.applications.forEach(function(application){
					if (Object.prototype.hasOwnProperty.call(application, key))
						application[key] = value;
				});
			});

			return instrumentedManifest;
		}
	};
});
