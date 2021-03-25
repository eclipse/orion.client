/*******************************************************************************
 * @license
 * Copyright (c) 2013 IBM Corporation and others.
 * All rights reserved. This program and the accompanying materials are made
 * available under the terms of the Eclipse Public License 2.0
 * (http://www.eclipse.org/legal/epl-v10.html), and the Eclipse Distribution
 * License v1.0 (http://www.eclipse.org/org/documents/edl-v10.html).
 *
 * Contributors:
 *     IBM Corporation - initial API and implementation
 *******************************************************************************/
/*eslint-env browser, amd*/

define([
	'orion/extensionCommands', //$NON-NLS-0$
	'orion/compare/diffParser' //$NON-NLS-0$
], function(mExtensionCommands, mDiffParser) {

	function Differ(serviceRegistry, inputManager, editor) {
		this._serviceRegistry = serviceRegistry;
		this._inputManager = inputManager;
		this._editor = editor;
		this._enabled = false;
		this.init();
	}

	Differ.prototype = {
		init: function(){
			var that = this;
			this._changeListener = function() {
				if (that._enabled) {
					if (that.occurrenceTimer) {
						window.clearTimeout(that.occurrenceTimer);
					}
					that.occurrenceTimer = window.setTimeout(function() {
						that.occurrenceTimer = null;
						that.doDiff();
					}, 500);
				}
			};
			this._inputManager.addEventListener("InputChanged", function() { //$NON-NLS-0$
				var textView = that._editor.getTextView();
				if (textView) {
					textView.removeEventListener("ModelChanged", that._changeListener); //$NON-NLS-0$
				}
				var service = that.service = that.getDiffer();
				if (service) {
					if (textView) {
						textView.addEventListener("ModelChanged", that._changeListener); //$NON-NLS-0$
					}
				}
			});
		},
		
		isVisible: function() {
			return !!this.getDiffer();
		},

		getDiffer: function(){
			var metadata = this._inputManager.getFileMetadata();
			var diffServices = this._serviceRegistry.getServiceReferences("orion.edit.diff"); //$NON-NLS-0$
			for (var i = 0; i < diffServices.length; i++) {
				var serviceReference = diffServices[i];
				var info = {};
				info.validationProperties = serviceReference.getProperty("validationProperties"); //$NON-NLS-0$
				info.forceSingleItem = true;
				var validator = mExtensionCommands._makeValidator(info, this._serviceRegistry);
				if (validator.validationFunction.bind(validator)(metadata)) {
					return this._serviceRegistry.getService(serviceReference);
				}
			}
			return null;
		},

		showAnnotations: function(service){
			var that = this;
			var diffParser = new mDiffParser.DiffParser();
			var context = {
				metadata: this._inputManager.getFileMetadata()
			};
			service.computeDiff(this._editor.getEditorContext(), context).then(function(diffContent) {
				diffParser.setLineDelim("\n"); //$NON-NLS-0$
				diffParser.parse("", diffContent);
				var oBlocks = diffParser.getOriginalBlocks();
				var nBlocks = diffParser.getNewBlocks();
				var diffArray = diffParser.getDiffArray();
				var diffRanges = that.getDiffRanges(oBlocks, nBlocks, diffArray);
				if(that._enabled){//for cases when user turns off diffService computing diff
					that._editor.showDiffAnnotations(diffRanges);
				}
			});
		},
		
		getDiffRanges: function(originalHunkBlocks, newHunkBlocks){
			var diffResult = [];
			for (var i = 0; i < newHunkBlocks.length; i++) {
				var lineStart = newHunkBlocks[i][0];
				var oldSize = originalHunkBlocks[i][1];
				var newSize = newHunkBlocks[i][1];
				if (newSize === 0) {
					diffResult.push({
						lineStart: lineStart - 1,
						lineEnd: lineStart,
						type:"deleted" //$NON-NLS-0$
					});
				} else if (oldSize === 0) {
					diffResult.push({
						lineStart: lineStart - 1,
						lineEnd: lineStart + newSize - 1,
						type:"added" //$NON-NLS-0$
					});
				} else {
					diffResult.push({
						lineStart: lineStart - 1,
						lineEnd: lineStart + newSize - 1,
						type:"modified" //$NON-NLS-0$
					});
				}
			}
			return diffResult;
		},

		toggleEnabled: function(){
			this.setEnabled(!this.isEnabled());
		},

		setEnabled: function(state){
			this._enabled = state;
			this.doDiff();
		},

		isEnabled: function(){
			return this._enabled;
		},

		doDiff: function() {
			if (!this._enabled) {
				this._editor.showDiffAnnotations([]);
			} else {
				if (this.service) {
					var that = this;
					this._inputManager.save().then(function() {
						that.showAnnotations(that.service);
					});
				}
			}
		}

	};

	Differ.prototype.constructor = Differ;

	//return the module exports
	return {Differ: Differ};
});
