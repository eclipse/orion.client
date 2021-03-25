/*******************************************************************************
 * @license
 * Copyright (c) 2014, 2019 IBM Corporation and others. All rights reserved.
 * This program and the accompanying materials are made available under the
 * terms of the Eclipse Public License 2.0
 * (http://www.eclipse.org/legal/epl-v10.html), and the Eclipse Distribution
 * License v1.0 (http://www.eclipse.org/org/documents/edl-v10.html).
 * 
 * Contributors: 
 *	IBM Corporation - initial API and implementation
 ******************************************************************************/
/*eslint-env browser, amd*/
define([
	'i18n!orion/editor/nls/messages',
	'orion/editor/find',
	'orion/objects',
	'orion/editor/util',
	'orion/util',
	'orion/webui/littlelib'
], function(messages, mFind, objects, textUtil, util, lib) {
	
	function FindUI(editor, undoStack, options) {
		mFind.Find.call(this, editor, undoStack, options);
	}
	
	FindUI.prototype = new mFind.Find();
	
	objects.mixin(FindUI.prototype, {
		getFindString: function() {
			var input = this._findInput;
			if (!input) {
				return mFind.Find.prototype.getFindString.call(this);
			}
			return input.value;
		},
		getReplaceString: function() {
			var input = this._replaceInput;
			if (!input) {
				return mFind.Find.prototype.getReplaceString(this);
			}
			return input.value;
		},
		hide: function() {
			var visible = this.isVisible();
			mFind.Find.prototype.hide.call(this);
			if (visible) {
				this._rootDiv.className = "textViewFind"; //$NON-NLS-0$
			}
		},
		show: function(options) {
			mFind.Find.prototype.show.call(this, options);
			var findString = options.findString;
			var replaceString = options.replaceString;
			var input = this._findInput;
			if (!input) {
				this._create();
				input = this._findInput;
			}
			if (findString) {
				input.value = findString;
			}
			if (replaceString) {
				var replaceInput = this._replaceInput;
				replaceInput.value = replaceString;
			}
			var that = this;
			this.setOptions({selectedLines: true, multipleLine: true});
			window.setTimeout(function() {
				that._rootDiv.className = "textViewFind show"; //$NON-NLS-0$
				input.select();
				input.focus();
			}, 0);
		},
		postSelectedLines: function(/*selectedLines*/) {
			if(this._selectedLinesUI) {
				this._checked(this._selectedLines, this._selectedLinesUI);
			}
		},
		_create: function() {
			var that = this;
			var view = this._editor.getTextView();
			var parent = view.getOptions("parent"); //$NON-NLS-0$
			var document = parent.ownerDocument; //$NON-NLS-0$
			var root = util.createElement(document, 'div'); //$NON-NLS-0$
			root.className = "textViewFind"; //$NON-NLS-0$
			textUtil.addEventListener(root, "keydown", function(e) { that._handleKeyDown(e); }); //$NON-NLS-0$
			this._rootDiv = root;
			lib.setSafeAttribute(root, "role", "dialog");
			lib.setSafeAttribute(root, "aria-label", messages.findReplace);
			this._createContents(document, root);
			view._rootDiv.insertBefore(root, view._rootDiv.firstChild);
		},
		_createContents: function(document, parent) {
			var that = this;
			var findInput = util.createElement(document, 'input'); //$NON-NLS-0$
			findInput.className = "textViewFindInput"; //$NON-NLS-0$
			this._findInput = findInput;
			findInput.type = "text"; //$NON-NLS-0$
			findInput.placeholder = messages.findWhat;
			textUtil.addEventListener(findInput, "input", function(evt) { //$NON-NLS-0$
				return that._handleInput(evt);
			});
			parent.appendChild(findInput);

			var group = util.createElement(document, 'span'); //$NON-NLS-0$
			that._createButton(document, group, messages.next, function() { that.find(true); });
			that._createButton(document, group, messages.previous, function() { that.find(false); });
			parent.appendChild(group);
			
			var readonly = that._editor.getTextView().getOptions("readonly"); //$NON-NLS-0$
			if (!readonly) {
				// create replace text
				var replaceInput = util.createElement(document, 'input'); //$NON-NLS-0$
				replaceInput.className = "textViewReplaceInput"; //$NON-NLS-0$
				this._replaceInput = replaceInput;
				replaceInput.type = "text"; //$NON-NLS-0$
				replaceInput.placeholder = messages.replaceWith;
				parent.appendChild(replaceInput);
				group = util.createElement(document, 'span'); //$NON-NLS-0$
				that._createButton(document, group, messages.replace, function() { that.replace(); });
				that._createButton(document, group, messages.replaceAll, function() { that.replaceAll(); });
				parent.appendChild(group);
			}

			group = util.createElement(document, 'span'); //$NON-NLS-0$
			that._selectedLinesUI = that._createButton(document, group, messages.selectedLines, function(evt) { that._toggle("selectedLines", evt.target); }, this._selectedLines, messages.selectedLinesTooltip, messages.selectedLinesTooltip); //$NON-NLS-0$
			that._createButton(document, group, messages.regex, function(evt) { that._toggle("regex", evt.target); }, this._regex, messages.regexTooltip, messages.regexTooltip); //$NON-NLS-0$
			that._createButton(document, group, messages.caseInsensitive, function(evt) { that._toggle("caseInsensitive", evt.target); }, this._caseInsensitive, messages.caseInsensitiveTooltip, messages.caseInsensitiveTooltip); //$NON-NLS-0$
			that._createButton(document, group, messages.wholeWord, function(evt) { that._toggle("wholeWord", evt.target); }, this._wholeWord, messages.wholeWordTooltip, messages.wholeWordTooltip); //$NON-NLS-0$
			parent.appendChild(group);

			var close = that._createButton(document, parent, "", function() { that.hide(); }); //$NON-NLS-0$
			close.className = "textViewFindCloseButton"; //$NON-NLS-0$
			close.title = messages.closeTooltip;
			util.confineDialogTab(findInput, close);
		},
		_createButton: function(document, parentDom, text, callback, checked, tooltip, ariaLabel) {
			var button  = document.createElement("button"); //$NON-NLS-0$
			button.type = "button"; //$NON-NLS-0$
			this._checked(checked, button);
			if (tooltip) button.title = tooltip;
			textUtil.addEventListener(button, "click", function(evt) { callback.call(this, evt); }, false); //$NON-NLS-0$
			if (text) {
				button.appendChild(document.createTextNode(text)); //$NON-NLS-0$
			}
			if (ariaLabel) {
				lib.setSafeAttribute(button, "aria-label", ariaLabel);
			}
			parentDom.appendChild(button);
			return button;
		},
		_toggle: function(prop, button) {
			var options = {};
			options[prop] = !this["_" + prop]; //$NON-NLS-0$
			this._checked(options[prop], button);
			this.setOptions(options);
		},
		_checked: function(checked, button) {
			button.className = "textViewFindButton"; //$NON-NLS-0$
			if (checked) {
				button.className += " checked"; //$NON-NLS-0$
			}
		},
		_handleInput: function() {
			if (this._incremental) {
				this.find(true, null, true);
			}
			return true;
		},
		_handleKeyDown: function(evt) {
			var handled;
			var ctrlKeyOnly = (util.isMac ? evt.metaKey : evt.ctrlKey) && !evt.altKey && !evt.shiftKey;
			if (ctrlKeyOnly && evt.keyCode === 70/*"f"*/ ) {
				handled = true;
			}
			//We can't use ctrlKeyOnly on "k" because ctrl+shift+k means find previous match when the find bar gets focus
			if (((util.isMac ? evt.metaKey : evt.ctrlKey) && !evt.altKey && evt.keyCode === 75/*"k"*/) || evt.keyCode === 13/*enter*/){
				if (evt.keyCode === 13) {
					this.find(this._reverse ? evt.shiftKey : !evt.shiftKey);
				} else {
					this.find(!evt.shiftKey);
				}
				handled = true;
			}
			if (ctrlKeyOnly &&  evt.keyCode === 82 /*"r"*/){
				this.replace();
				handled = true;
			}
			if (evt.keyCode === 27/*ESC*/){
				this.hide();
				handled = true;
			}
			if (handled) {
				if (evt.stopPropagation) { 
					evt.stopPropagation(); 
				}
				if (evt.preventDefault) { 
					evt.preventDefault(); 
				}
				evt.cancelBubble = true;
				return false;
			}
			return true;
		}
	});

	return {FindUI: FindUI};
});
