/*******************************************************************************
 * @license
 * Copyright (c) 2016 IBM Corporation and others.
 * All rights reserved. This program and the accompanying materials are made 
 * available under the terms of the Eclipse Public License 2.0 
 * (http://www.eclipse.org/legal/epl-v10.html), and the Eclipse Distribution 
 * License v1.0 (http://www.eclipse.org/org/documents/edl-v10.html). 
 *
 * Contributors: IBM Corporation - initial API and implementation
 *******************************************************************************/
/*eslint-env browser, amd*/
define([
	'orion/editor/textModel',
	'orion/editor/projectionTextModel'
], function(mTextModel, mProjectionTextModel) {
	
	/**
	 * TextModelFactory generates all the base text model and projection model for the editors
	 */
	function TextModelFactory() {
	}
	TextModelFactory.prototype = {
		/**
		 * Create a text model instance for editor. A customized TextModelFactory can return a sub class of mTextModel.TextModel.
		 */
		createTextModel: function(/*options*/) {
			return new mTextModel.TextModel();
		},
		/**
		 * Create a projection text model instance for editor. A customized TextModelFactory can create a sub class of mTextModel.TextModel 
		 * or a sub class of mProjectionTextModel.ProjectionTextModel.
		 */
		createProjectionTextModel: function(baseModel, options) {
			return new mProjectionTextModel.ProjectionTextModel(baseModel ? baseModel: this.createTextModel(options));
		}
	};
	return {
		TextModelFactory: TextModelFactory
	};
});
