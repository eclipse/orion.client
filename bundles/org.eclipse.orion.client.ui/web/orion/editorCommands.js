/*******************************************************************************
 * @license
 * Copyright (c) 2011, 2019 IBM Corporation and others.
 * All rights reserved. This program and the accompanying materials are made
 * available under the terms of the Eclipse Public License 2.0
 * (http://www.eclipse.org/legal/epl-v10.html), and the Eclipse Distribution
 * License v1.0 (http://www.eclipse.org/org/documents/edl-v10.html).
 *
 * Contributors:
 *     IBM Corporation - initial API and implementation
 *******************************************************************************/
/*eslint-env browser, amd*/
/*global console prompt */

define([
	'i18n!orion/edit/nls/messages',
	'orion/i18nUtil',
	'orion/webui/littlelib',
	'orion/fileUtils',
	'orion/widgets/input/DropDownMenu',
	'orion/Deferred',
	'orion/URITemplate',
	'orion/commands',
	'orion/keyBinding',
	'orion/commandRegistry',
	'orion/extensionCommands',
	'orion/contentTypes',
	'orion/searchUtils',
	'orion/objects',
	'orion/PageUtil',
	'orion/PageLinks',
	'orion/editor/annotations',
	'orion/regex',
	'orion/PageUtil',
	'orion/uiUtils',
	'orion/util',
	'orion/urlModifier'
], function(messages, i18nUtil, lib, fileUtil, DropDownMenu, Deferred, URITemplate, mCommands, mKeyBinding, mCommandRegistry, mExtensionCommands, mContentTypes, mSearchUtils, objects, mPageUtil, PageLinks, mAnnotations, regex, PageUtil, mUIUtils, util, urlModifier) {

	var exports = {};

	var contentTypesCache = null;

	function createDelegatedUI(options) {
		var uriTemplate = new URITemplate(options.uriTemplate);
		var params = options.params || {};
		params.OrionHome = params.OrionHome || PageLinks.getOrionHome();
		var href = uriTemplate.expand(params);
		var delegatedParent = document.createElement("div"); //$NON-NLS-0$
		var iframe = document.createElement("iframe"); //$NON-NLS-0$
		iframe.id = options.id;
		iframe.name = options.id;
		iframe.type = "text/html"; //$NON-NLS-0$
		iframe.sandbox = "allow-scripts allow-same-origin allow-forms allow-popups"; //$NON-NLS-0$
		iframe.frameborder = options.border !== undefined ? options.border : 1;
		iframe.src = urlModifier(href);
		iframe.className = "delegatedUI"; //$NON-NLS-0$
		if (options.width) {
			delegatedParent.style.width = options.width;
			iframe.style.width = options.width;
		}
		if (options.height) {
			delegatedParent.style.height = options.height;
			iframe.style.height = options.height;
		}
		iframe.style.visibility = 'hidden'; //$NON-NLS-0$
		if (options.parent !== null) {
			(options.parent || window.document.body).appendChild(delegatedParent);
		}
		delegatedParent.appendChild(iframe);
		iframe.style.left = options.left || (window.innerWidth - parseInt(iframe.clientWidth, 10))/2 + "px"; //$NON-NLS-0$
		iframe.style.top = options.top || (window.innerHeight - parseInt(iframe.clientHeight, 10))/2 + "px"; //$NON-NLS-0$
		iframe.style.visibility = '';
		// Listen for notification from the iframe.  We expect either a "result" or a "cancelled" property.
		window.addEventListener("message", function _messageHandler(event) { //$NON-NLS-0$
			if (event.source !== iframe.contentWindow) {
				return;
			}
			if (typeof event.data === "string") { //$NON-NLS-0$
				var data = JSON.parse(event.data);
				if (data.pageService === "orion.page.delegatedUI" && data.source === options.id) { //$NON-NLS-0$
					if (data.cancelled) {
						// console.log("Delegated UI Cancelled");
						if (options.cancelled) {
							options.cancelled();
						}
					} else if (data.result) {
						if (options.done) {
							options.done(data.result);
						}
					} else if (data.Status || data.status) {
						if (options.status) {
							options.status(data.Status || data.status);
						}
					}
					window.removeEventListener("message", _messageHandler, false); //$NON-NLS-0$
					if (delegatedParent.parentNode) {
						delegatedParent.parentNode.removeChild(delegatedParent);
					}
				}
			}
		}, false);

		return delegatedParent;
	}
	exports.createDelegatedUI = createDelegatedUI;

	/**
	 * Handles a status message from a service by forwarding to the <tt>orion.page.message</tt> service
	 * and stripping HTML.
	 * @param {orion.serviceregistry.ServiceRegistry} serviceRegistry
	 * @param {Object|string} status
	 * @returns {orion.Promise}
	 */
	function handleStatusMessage(serviceRegistry, status) {
		if (status && typeof status.HTML !== "undefined") { //$NON-NLS-0$
			delete status.HTML;
		}
		var statusService = serviceRegistry.getService("orion.page.message"); //$NON-NLS-0$
		if (statusService) {
			return statusService.setProgressResult(status).then(null, function(e) {
				console.log(e);
				throw e; // reject
			});
		} else {
			console.log(status);
			return new Deferred().resolve(status);
		}
	}

	function errorTransformer(error) {
		return {_error: error};
	}

	function EditorCommandFactory (options) {
		this.serviceRegistry = options.serviceRegistry;
		this.commandService = options.commandRegistry;
		this.fileClient = options.fileClient;
		this.preferences = options.preferences;
		this.inputManager = options.inputManager;
		this.renderToolbars = options.renderToolbars;
		this.toolbarId = options.toolbarId;
		this.saveToolbarId = options.saveToolbarId;
		this.editToolbarId = options.editToolbarId;
		this.pageNavId = options.navToolbarId;
		this.editorContextMenuId = options.editorContextMenuId;
		this.isReadOnly = options.readonly;
		this.textSearcher = options.textSearcher;
		this.searcher = options.searcher;
		this.localSettings = options.localSettings;
		this.editorPreferences = options.editorPreferences;
		this.differ = options.differ;
		this.blamer = options.blamer;
		this.formatter = options.formatter;
		this.references = options.references;
		this.openDecl = options.openDecl;
		
		var that = this;
		this.listener = {
			onServiceAdded: function(event) {
				that._onServiceAdded(event.serviceReference);
			},
			onServiceRemoved: function(event) {
				that._onServiceRemoved(event.serviceReference);
			}
		};
		this.serviceRegistry.addEventListener("registered", this.listener.onServiceAdded); //$NON-NLS-0$
		this.serviceRegistry.addEventListener("unregistering", this.listener.onServiceRemoved); //$NON-NLS-0$
	}
	EditorCommandFactory.prototype = {
		/**
		 * Creates the common text editing commands. Also generates commands for any installed plug-ins that
		 * contribute editor actions.
		 */
		createCommands: function() {
			this._createSettingsCommand();
			this._createGotoLineCommnand();
			this._createFindCommnand();
			this._createBlameCommand();
			this._createDiffCommand();
			this._createShowTooltipCommand();
			this._createUndoStackCommands();
			this._createClipboardCommands();
			this._createDelimiterCommands();
			this._createEncodingCommand();
			this._createFormatterCommand();
			this._createSaveCommand();
			this._createOpenFolderCommand();
			this._createOpenRecentCommand();
			this._createSwitchWorkspaceCommand();
			this._createReferencesCommand();
			this._createOpenDeclCommand();
			
			return this._createEditCommands();
		},
		//TODO: We need a better way invoke side bar action 
		setSideBar: function(sideBar) {
			this.sideBar = sideBar;
		},
		getEditCommands: function() {
			var commands = [];
			var commandRegistry = this.commandService;
			for (var commandId in commandRegistry._commandList) {
				var command = commandRegistry._commandList[commandId];
				if (command.editInfo) {
					commands.push(command);
				}
			}
			return commands;
		},
		updateCommands: function(target) {
			target = target || {};
			this.editor = target.editor;
			this.inputManager = target.inputManager || target.editorInputManager;
			this.localSettings = target.localSettings;
			this.differ = target.differ;
			this.blamer = target.blamer;
			this.formatter = target.formatter;
			this.references = target.references;
			this.openDecl = target.openDecl;
			this.textSearcher = target.textSearcher;
			
			if (this._recreateEditCommands) {
				this._createEditCommands().then(function() {
					this.registerCommands();
					this.registerContextMenuCommands();
					if (this.renderToolbars) {
						this.renderToolbars();
					}
				}.bind(this));
			}
		},
		_registerCommandGroups: function(scopeId, rootPath) {
			var commandRegistry = this.commandService;
			var serviceRegistry = this.serviceRegistry, parentPath;
			var groupReferences = serviceRegistry.getServiceReferences("orion.edit.command.category"); //$NON-NLS-0$
			groupReferences.forEach(function(serviceReference) {
				var groupInfo = {};
				var propertyNames = serviceReference.getPropertyKeys();
				for (var j = 0; j < propertyNames.length; j++) {
					groupInfo[propertyNames[j]] = serviceReference.getProperty(propertyNames[j]);
				}
				parentPath = rootPath;
				if (groupInfo.parentPath) {
					parentPath += "/" + groupInfo.parentPath;
				}
				commandRegistry.addCommandGroup(scopeId, groupInfo.id, groupInfo.position || 101, groupInfo.name, parentPath, null, groupInfo.imageClass);
			}.bind(this));			
		},
		registerCommands: function() {
			var commandRegistry = this.commandService;
			if (this.preferences) {
				this.preferences.get('/editorSettingsActions').then(function(prefs) {
					if (!Boolean(prefs) || !Boolean(prefs.disabled)) {
						commandRegistry.registerCommandContribution("settingsActions", "orion.edit.settings", 1, null, false, new mKeyBinding.KeyBinding("s", true, true), null, this); //$NON-NLS-2$ //$NON-NLS-1$ //$NON-NLS-0$
					}
				}.bind(this));
			}
			commandRegistry.registerCommandContribution(this.editToolbarId || this.toolbarId, "orion.edit.undo", 400, this.editToolbarId ? "orion.menuBarEditGroup/orion.edit.undoGroup" : null, !this.editToolbarId, new mKeyBinding.KeyBinding('z', true), null, this); //$NON-NLS-2$ //$NON-NLS-1$ //$NON-NLS-3$
			commandRegistry.registerCommandContribution(this.editToolbarId || this.toolbarId, "orion.edit.redo", 401, this.editToolbarId ? "orion.menuBarEditGroup/orion.edit.undoGroup" : null, !this.editToolbarId, util.isMac ? new mKeyBinding.KeyBinding('z', true, true) : new mKeyBinding.KeyBinding('y', true), null, this); //$NON-NLS-3$ //$NON-NLS-2$ //$NON-NLS-1$ //$NON-NLS-4$
			commandRegistry.registerCommandContribution(this.saveToolbarId || this.toolbarId, "orion.edit.openFolder", 1, this.saveToolbarId ? "orion.menuBarFileGroup/orion.edit.saveGroup" : null, false, new mKeyBinding.KeyBinding('o', true)); //$NON-NLS-2$ //$NON-NLS-1$ //$NON-NLS-0$
			commandRegistry.registerCommandContribution(this.saveToolbarId || this.toolbarId, "orion.edit.openRecent", 3, this.saveToolbarId ? "orion.menuBarFileGroup/orion.edit.saveGroup" : null, false, null); //$NON-NLS-2$ //$NON-NLS-1$ //$NON-NLS-0$
			commandRegistry.registerCommandContribution(this.saveToolbarId || this.toolbarId, "orion.edit.switchWorkspace", 0, this.saveToolbarId ? "orion.menuBarFileGroup/orion.edit.workspaceGroup" : null, false, null); //$NON-NLS-2$ //$NON-NLS-1$ //$NON-NLS-0$
			commandRegistry.registerCommandContribution(this.saveToolbarId || this.toolbarId, "orion.openResource", 1, this.saveToolbarId ? "orion.menuBarFileGroup/orion.edit.saveGroup" : null, false, new mKeyBinding.KeyBinding('f', true, true)); //$NON-NLS-2$ //$NON-NLS-1$ //$NON-NLS-0$
			commandRegistry.registerCommandContribution(this.saveToolbarId || this.toolbarId, "orion.edit.save", 2, this.saveToolbarId ? "orion.menuBarFileGroup/orion.edit.saveGroup" : null, false, new mKeyBinding.KeyBinding('s', true), null, this); //$NON-NLS-3$ //$NON-NLS-2$ //$NON-NLS-1$ //$NON-NLS-3$
			commandRegistry.registerCommandContribution(this.saveToolbarId || this.toolbarId, "eclipse.file.refresh", 3, this.saveToolbarId ? "orion.menuBarFileGroup/orion.edit.saveGroup" : null, false, null, null, this);
			commandRegistry.registerCommandContribution(this.editToolbarId || this.pageNavId, "orion.edit.gotoLine", 3, this.editToolbarId ? "orion.menuBarEditGroup/orion.findGroup" : null, !this.editToolbarId, new mKeyBinding.KeyBinding('g', !util.isMac, false, false, util.isMac), new mCommandRegistry.URLBinding("gotoLine", "line"), this); //$NON-NLS-4$ //$NON-NLS-3$ //$NON-NLS-2$ //$NON-NLS-1$ //$NON-NLS-5$
			commandRegistry.registerCommandContribution(this.editToolbarId || this.pageNavId, "orion.edit.find", 0, this.editToolbarId ? "orion.menuBarEditGroup/orion.findGroup" : null, !this.editToolbarId, new mKeyBinding.KeyBinding('f', true), new mCommandRegistry.URLBinding("find", "find"), this); //$NON-NLS-4$ //$NON-NLS-3$ //$NON-NLS-2$ //$NON-NLS-1$ //$NON-NLS-5$
			commandRegistry.registerCommandContribution(this.editToolbarId || this.pageNavId , "orion.edit.format", 2, this.editToolbarId ? "orion.menuBarEditGroup/orion.edit.formatGroup" : null, !this.editToolbarId, new mKeyBinding.KeyBinding('f', false, true, true), new mCommandRegistry.URLBinding("format", "format"), this); //$NON-NLS-4$ //$NON-NLS-3$ //$NON-NLS-2$ //$NON-NLS-1$ //$NON-NLS-5$
			commandRegistry.registerCommandContribution(this.toolbarId, "orion.keyAssist", 0, "orion.menuBarToolsGroup", false, new mKeyBinding.KeyBinding(191, false, true, !util.isMac, util.isMac)); //$NON-NLS-1$ //$NON-NLS-0$ //$NON-NLS-2$
			commandRegistry.registerCommandContribution(this.toolbarId , "orion.edit.showTooltip", 1, "orion.menuBarToolsGroup", false, null, null, this);//$NON-NLS-1$ //$NON-NLS-2$ 
			commandRegistry.registerCommandContribution(this.toolbarId , "orion.edit.showLineTooltip", 1, "orion.menuBarToolsGroup", false, new mKeyBinding.KeyBinding(112, true, true), null, this);//$NON-NLS-1$ //$NON-NLS-2$ 
			commandRegistry.registerCommandContribution(this.toolbarId , "orion.edit.blame", 2, "orion.menuBarToolsGroup", false, new mKeyBinding.KeyBinding('b', true, true), new mCommandRegistry.URLBinding("blame", "blame"), this); //$NON-NLS-4$ //$NON-NLS-3$ //$NON-NLS-2$ //$NON-NLS-1$ //$NON-NLS-5$
			commandRegistry.registerCommandContribution(this.toolbarId , "orion.edit.diff", 3, "orion.menuBarToolsGroup", false, new mKeyBinding.KeyBinding('d', true, true), new mCommandRegistry.URLBinding("diff", "diff"), this); //$NON-NLS-4$ //$NON-NLS-3$ //$NON-NLS-2$ //$NON-NLS-1$ //$NON-NLS-5$
			commandRegistry.registerCommandContribution(this.toolbarId , "orion.edit.references", 5, "orion.menuBarToolsGroup", false, new mKeyBinding.KeyBinding('y', true, true), null, this);
			commandRegistry.registerCommandContribution(this.toolbarId , "orion.edit.open.declaration", 5, "orion.menuBarToolsGroup", false, new mKeyBinding.KeyBinding(114, false, false), null, this);

			// 'Delimiters' cascade
			var index = 0;
			commandRegistry.addCommandGroup(this.toolbarId, "orion.editorMenuBarMenuDelimitersGroup", 999, messages["Convert Line Delimiters"], "orion.menuBarToolsGroup"); //$NON-NLS-2$ //$NON-NLS-1$ //$NON-NLS-0$
			commandRegistry.registerCommandContribution(this.toolbarId, "orion.edit.convert.crlf", index++, "orion.menuBarToolsGroup/orion.editorMenuBarMenuDelimitersGroup", false, null, null, this); //$NON-NLS-1$ //$NON-NLS-2$
			commandRegistry.registerCommandContribution(this.toolbarId, "orion.edit.convert.lf", index++, "orion.menuBarToolsGroup/orion.editorMenuBarMenuDelimitersGroup", false, null, null, this); //$NON-NLS-1$ //$NON-NLS-2$

			commandRegistry.registerCommandContribution(this.toolbarId, "orion.edit.reloadWithEncoding", 1000, "orion.menuBarToolsGroup"); //$NON-NLS-1$ //$NON-NLS-2$
			
			this._registerCommandGroups(this.toolbarId, "orion.menuBarToolsGroup"); //$NON-NLS-1$

			// KB exists so that we can pass an array (from info.key) rather than actual arguments
			function createKeyBinding(args) {
				if (!args) { return null; }
				var keyBinding = new mKeyBinding.KeyBinding();
				mKeyBinding.KeyBinding.apply(keyBinding, args);
				return keyBinding;
			}
			var commands = this.getEditCommands();
			for (var i = 0, position = 100; i < commands.length; i++, position++) {
				var command = commands[i], info = command.editInfo;
				
				// Handle quick fixes
				if (info.scopeId) {
					commandRegistry.registerCommandContribution(info.scopeId, command.id, position, info.scopeId + "Group", info.bindingOnly, createKeyBinding(info.key), null, this); //$NON-NLS-0$
				} else {
					var parentPath = "orion.menuBarToolsGroup"; //$NON-NLS-1$
					if (info.parentPath) {
						parentPath += "/" + info.parentPath;
					}
					commandRegistry.registerCommandContribution(this.toolbarId, command.id, position, parentPath, info.bindingOnly, createKeyBinding(info.key), null, this);
				}
			}
		},
		registerContextMenuCommands: function() {
			var commandRegistry = this.commandService;
			// main context menu
			commandRegistry.addCommandGroup(this.editorContextMenuId, "orion.editorContextMenuGroup", 100, null, null, null, null, null, "dropdownSelection"); //$NON-NLS-1$ //$NON-NLS-2$
			
			var index = 1;
			//TODO - non-nls is wrong, check accelerator conflicts etc.
			commandRegistry.registerCommandContribution(this.editorContextMenuId, "orion.edit.copy", index++, "orion.editorContextMenuGroup/orion.edit.copyGroup", false, new mKeyBinding.KeyBinding('c', true)); //$NON-NLS-1$ //$NON-NLS-2$
			commandRegistry.registerCommandContribution(this.editorContextMenuId, "orion.edit.cut", index++, "orion.editorContextMenuGroup/orion.edit.copyGroup", false, new mKeyBinding.KeyBinding('x', true)); //$NON-NLS-1$ //$NON-NLS-2$
			commandRegistry.registerCommandContribution(this.editorContextMenuId, "orion.edit.paste", index++, "orion.editorContextMenuGroup/orion.edit.copyGroup", false, new mKeyBinding.KeyBinding('v', true)); //$NON-NLS-1$ //$NON-NLS-2$
			commandRegistry.registerCommandContribution(this.editorContextMenuId, "orion.edit.undo", index++, "orion.editorContextMenuGroup/orion.edit.undoGroup", false); //$NON-NLS-1$ //$NON-NLS-2$
			commandRegistry.registerCommandContribution(this.editorContextMenuId, "orion.edit.redo", index++, "orion.editorContextMenuGroup/orion.edit.undoGroup", false); //$NON-NLS-1$ //$NON-NLS-2$
			commandRegistry.registerCommandContribution(this.editorContextMenuId, "orion.edit.find", index++,"orion.editorContextMenuGroup/orion.findGroup", false); //$NON-NLS-1$ //$NON-NLS-2$
			commandRegistry.registerCommandContribution(this.editorContextMenuId, "orion.edit.gotoLine", index++, "orion.editorContextMenuGroup/orion.findGroup", false); //$NON-NLS-1$ //$NON-NLS-2$
			commandRegistry.registerCommandContribution(this.editorContextMenuId, "orion.quickSearch", index++, "orion.editorContextMenuGroup/orion.findGroup", false); //$NON-NLS-1$ //$NON-NLS-2$
			commandRegistry.registerCommandContribution(this.editorContextMenuId, "orion.openSearch", index++, "orion.editorContextMenuGroup/orion.findGroup", false); //$NON-NLS-1$ //$NON-NLS-2$
			commandRegistry.registerCommandContribution(this.editorContextMenuId , "orion.edit.format", index++, "orion.editorContextMenuGroup/orion.edit.formatGroup", false); //$NON-NLS-4$ //$NON-NLS-3$ //$NON-NLS-2$

			// 'Tools' cascade
			commandRegistry.addCommandGroup(this.editorContextMenuId, "orion.editorContextMenuToolsGroup", 400, messages["Tools"], "orion.editorContextMenuGroup"); //$NON-NLS-2$ //$NON-NLS-1$ //$NON-NLS-0$
			commandRegistry.registerCommandContribution(this.editorContextMenuId, "orion.edit.reloadWithEncoding", 1000, "orion.editorContextMenuGroup/orion.editorContextMenuToolsGroup"); //$NON-NLS-1$ //$NON-NLS-2$
			commandRegistry.registerCommandContribution(this.editorContextMenuId , "orion.edit.blame", 1, "orion.editorContextMenuGroup/orion.editorContextMenuToolsGroup", false); //$NON-NLS-1$ //$NON-NLS-2$
			commandRegistry.registerCommandContribution(this.editorContextMenuId , "orion.edit.diff", 2, "orion.editorContextMenuGroup/orion.editorContextMenuToolsGroup", false); //$NON-NLS-1$ //$NON-NLS-2$
			commandRegistry.registerCommandContribution(this.editorContextMenuId , "orion.edit.references", 5, "orion.editorContextMenuGroup/orion.editorContextMenuToolsGroup", false);
			commandRegistry.registerCommandContribution(this.editorContextMenuId , "orion.edit.open.declaration", 4, "orion.editorContextMenuGroup/orion.editorContextMenuToolsGroup", false);

			// 'Delimiters' cascade
			commandRegistry.addCommandGroup(this.editorContextMenuId, "orion.editorContextMenuDelimitersGroup", 999, messages["Convert Line Delimiters"], "orion.editorContextMenuGroup/orion.editorContextMenuToolsGroup"); //$NON-NLS-2$ //$NON-NLS-1$ //$NON-NLS-0$
			commandRegistry.registerCommandContribution(this.editorContextMenuId, "orion.edit.convert.crlf", index++, "orion.editorContextMenuGroup/orion.editorContextMenuToolsGroup/orion.editorContextMenuDelimitersGroup"); //$NON-NLS-1$ //$NON-NLS-2$
			commandRegistry.registerCommandContribution(this.editorContextMenuId, "orion.edit.convert.lf", index++, "orion.editorContextMenuGroup/orion.editorContextMenuToolsGroup/orion.editorContextMenuDelimitersGroup"); //$NON-NLS-1$ //$NON-NLS-2$

			this._registerCommandGroups(this.editorContextMenuId, "orion.editorContextMenuGroup/orion.editorContextMenuToolsGroup"); //$NON-NLS-1$

			// Register extra tools commands
			var commands = this.getEditCommands();
			for (var i = 0, position = 100; i < commands.length; i++, position++) {
				var command = commands[i], info = command.editInfo;
				var parentPath = "orion.editorContextMenuGroup/orion.editorContextMenuToolsGroup"; //$NON-NLS-1$
				if (info.parentPath) {
					parentPath += "/" + info.parentPath;
				}
				this.commandService.registerCommandContribution(this.editorContextMenuId, command.id, position, parentPath);
			}
		},
		overwriteKeyBindings: function(editor) {
			var that = this;
			this.editor = editor;
			if (editor.getTextView && editor.getTextView()) {
				var textView = editor.getTextView();
				textView.setKeyBinding(new mKeyBinding.KeyBinding('s', true), "save"); //$NON-NLS-1$ //$NON-NLS-2$
				var saveCommand = that.commandService.findCommand("orion.edit.save"); //$NON-NLS-0$
				if (saveCommand) {
					textView.setAction("save", function() { //$NON-NLS-0$
						saveCommand.callback.call({inputManager: that.inputManager});
						return true;
					}, saveCommand); //$NON-NLS-0$
				}

				textView.setAction("gotoLine", function (data) { //$NON-NLS-0$
					if (data) {
						editor.onGotoLine(data.line - 1, 0, undefined, data.callback);
						return true;
					}
					that.commandService.runCommand("orion.edit.gotoLine"); //$NON-NLS-0$
					return true;
				}, that.commandService.findCommand("orion.edit.gotoLine")); //$NON-NLS-0$
				
				if(this.textSearcher) {
					textView.setAction("find", function (data) { //$NON-NLS-0$
						if (data) {
							that.textSearcher.show(data);
							return true;
						}
						that.commandService.runCommand("orion.edit.find"); //$NON-NLS-0$
						return true;
					}, that.commandService.findCommand("orion.edit.find")); //$NON-NLS-0$
				}
				
				// Support future key binding changes
				this.bindingChangeListener = function(args) {
					this._handleBindingChanges(textView, args);
				}.bind(this);
				this.commandService.addEventListener("bindingChanged", this.bindingChangeListener);
			}
		},
		_handleBindingChanges: function(textView, args) {
			// Only execute if this is a textView action
			var actions = textView.getActions(true);
			if (actions.indexOf(args.id) !== -1) {
				if (args.prevBinding) {
					textView.setKeyBinding(args.prevBinding, null);
				}
				textView.setKeyBinding(args.newBinding, args.id);
			}
		},
		showKeyBindings: function(keyAssist) {
			var editor = this.editor;
			if (editor && editor.getTextView && editor.getTextView()) {
				var textView = editor.getTextView();
				// Remove actions without descriptions
				var editorActions = textView.getActions(true).filter(function (element) {
					var desc = textView.getActionDescription(element);
					return desc && desc.name;
				});
				editorActions.sort(function (a, b) {
					return textView.getActionDescription(a).name.localeCompare(textView.getActionDescription(b).name);
				});
				keyAssist.createHeader(messages["Editor"], "EditorScope"); //$NON-NLS-0$
				var execute = function (actionID) {
					return function () {
						textView.focus();
						return textView.invokeAction(actionID);
					};
				};
				var scopes = {}, binding;
				for (var i = 0; i < editorActions.length; i++) {
					var actionID = editorActions[i];
					var actionDescription = textView.getActionDescription(actionID);
					var bindings = textView.getKeyBindings(actionID);
					if (bindings.length > 0) {
						for (var j = 0; j < bindings.length; j++) {
							binding = bindings[j];
							if (binding.scopeName) {
								if (!scopes[binding.scopeName]) {
									scopes[binding.scopeName] = [];
								}
								scopes[binding.scopeName].push({binding: binding, name: actionDescription.name, execute: execute(actionID)});
							} else {
								keyAssist.createItem(binding, actionDescription.name, actionID, execute(actionID));
							}
						}
					} else {
						keyAssist.createItem(null, actionDescription.name, actionID, execute(actionID)); //$NON-NLS-1$
					}
				}
				for (var scopedBinding in scopes) {
					if (scopes[scopedBinding].length) {
						keyAssist.createHeader(scopedBinding, lib.validId(scopedBinding) + "Scope"); //$NON-NLS-0$
						for (var k = 0; k < scopes[scopedBinding].length; k++) {
							binding = scopes[scopedBinding][k];
							keyAssist.createItem(binding.binding, binding.name, binding.name, binding.execute);
						}
					}
				}
			}
		},
		_createSettingsCommand: function() {
			var that = this;
			var settingsCommand = new mCommands.Command({
				imageClass: "core-sprite-wrench", //$NON-NLS-0$
				name: messages.EditorSettings,
				tooltip: messages.LocalEditorSettings,
				id: "orion.edit.settings", //$NON-NLS-0$
				visibleWhen: /** @callback */ function(items, data) {
					var editor = data.handler.editor || that.editor;
					return editor && editor.installed && data.handler.localSettings;
				},
				callback: function(data) {
					var localSettings = this.localSettings || that.localSettings;
					var dropDown = settingsCommand.settingsDropDown;
					if (!dropDown || dropDown.isDestroyed()) {
						dropDown = settingsCommand.settingsDropDown = new DropDownMenu(data.domNode.parentNode, data.domNode, {
							noClick: true,
							selectionClass: 'dropdownSelection' //$NON-NLS-0$
						});
						dropDown.updateContent = localSettings.show.bind(localSettings);
						var menu = dropDown.getContentNode();
						menu.tabIndex = menu.style.marginTop = 0;
					}					
					dropDown.click();
				}
			});
			this.commandService.addCommand(settingsCommand);
		},
		
		_createDelimiterCommands: function() {
			
			var that = this;
			var convert = function (delimiter) {
				var editor = that.editor;
				if (editor && editor.getModel()) {
					var textModel = editor.getModel();
					textModel.setLineDelimiter(delimiter, true);
					var progress = that.serviceRegistry.getService("orion.page.progress"); //$NON-NLS-0$
					if (progress) {
						var message = messages [delimiter === "\r\n" ? "ConversionCompleteCRLF" : "ConversionCompleteLF"];
						progress.setProgressResult( {Message: message});
					}
					editor.focus();
				}
			};
			
			var convertToCrLfCommand = new mCommands.Command({
				name: messages["Windows (CR/LF)"],
				id: "orion.edit.convert.crlf", //$NON-NLS-1$
				visibleWhen: /** @callback */ function(items, data) {
					var editor = data.handler.editor || that.editor;
					return editor && editor.installed;
				},
				callback: function() {
					convert ("\r\n"); //$NON-NLS-1$
				}
			});
			this.commandService.addCommand(convertToCrLfCommand);
			
			var convertToLfCommand = new mCommands.Command({
				name: messages["Unix (LF)"],
				id: "orion.edit.convert.lf", //$NON-NLS-1$
				visibleWhen: /** @callback */ function(items, data) {
					var editor = data.handler.editor || that.editor;
					return editor && editor.installed;
				},
				callback: function() {
					convert ("\n"); //$NON-NLS-1$
				}
			});
			this.commandService.addCommand(convertToLfCommand);
		},
		
		_createClipboardCommands: function() {
			
			//TODO - test to see whether copy/cut/paste is supported instead of IE
			if (util.isIE || util.isElectron) {
				var that = this;
				
				var copyCommand = new mCommands.Command({
					name: messages.Copy,
					id: "orion.edit.copy", //$NON-NLS-0$
					visibleWhen: /** @callback */ function(items, data) {
						var editor = data.handler.editor || that.editor;
						return editor && editor.installed;
					},
					callback: function() {
						var editor = this.editor || that.editor;
						if (editor && editor.getTextView && editor.getTextView()) {
							var textView = editor.getTextView();
							textView.copy();
							editor.focus();
						}
					}
				});
				this.commandService.addCommand(copyCommand);
				
				var cutCommand = new mCommands.Command({
					name: messages.Cut,
					id: "orion.edit.cut", //$NON-NLS-0$
					visibleWhen: /** @callback */ function(items, data) {
						var editor = data.handler.editor || that.editor;
						return editor && editor.installed;
					},
					callback: function() {
						var editor = this.editor || that.editor;
						if (editor && editor.getTextView && editor.getTextView()) {
							var textView = editor.getTextView();
							textView.cut();
							editor.focus();
						}
					}
				});
				this.commandService.addCommand(cutCommand);
				
				var pasteCommand = new mCommands.Command({
					name: messages.Paste,
					id: "orion.edit.paste", //$NON-NLS-0$
					visibleWhen: /** @callback */ function(items, data) {
						var editor = data.handler.editor || that.editor;
						return editor && editor.installed;
					},
					callback: function() {
						var editor = this.editor || that.editor;
						if (editor && editor.getTextView && editor.getTextView()) {
							var textView = editor.getTextView();
							textView.paste();
							editor.focus();
						}
					}
				});
				this.commandService.addCommand(pasteCommand);
			}
		},
		_createUndoStackCommands: function() {
			var that = this;
			var undoCommand = new mCommands.Command({
				name: messages.Undo,
				id: "orion.edit.undo", //$NON-NLS-0$
				visibleWhen: /** @callback */ function(items, data) {
					var editor = data.handler.editor || that.editor;
					return editor && editor.installed;
				},
				callback: function() {
					var editor = this.editor || that.editor;
					editor.getUndoStack().undo();
				}
			});
			this.commandService.addCommand(undoCommand);

			var redoCommand = new mCommands.Command({
				name: messages.Redo,
				id: "orion.edit.redo", //$NON-NLS-0$
				visibleWhen: /** @callback */ function(items, data) {
					var editor = data.handler.editor || that.editor;
					return editor && editor.installed;
				},
				callback: function() {
					var editor = this.editor || that.editor;
					editor.getUndoStack().redo();
				}
			});
			this.commandService.addCommand(redoCommand);
		},
		_createSaveCommand: function() {
			var that = this;
			var saveCommand = new mCommands.Command({
				name: messages.Save,
				tooltip: messages.saveFile,
				imageClass : "core-sprite-save", //$NON-NLS-0$
				id: "orion.edit.save", //$NON-NLS-0$
				visibleWhen: /** @callback */ function(items, data) {
					var inputManager = data.handler.inputManager || that.inputManager;
					var editor = data.handler.editor || that.editor || (inputManager && inputManager.getEditor());
					if (!editor || !editor.installed || !inputManager || !inputManager.isSaveEnabled()) {
						return false;
					}
					return true;
				},
				callback: function() {
					var inputManager = this.inputManager || that.inputManager;
					inputManager.save();
				}
			});
			this.commandService.addCommand(saveCommand);
		},
		_createSwitchWorkspaceCommand: function() {
			var that = this;
			var fileSystem = this.fileClient.fileServiceRootURL(window.location.hash.substring(1));
			this.fileClient.loadWorkspaces(fileSystem).then(function(workspaces) {
				if (this.sideBar) {
					this.sideBar.sidebarNavInputManager.addEventListener("filesystemChanged", function(evt) {
						fileSystem = evt.newInput;
						this.fileClient.loadWorkspaces(fileSystem).then(function(newWorkspaces) {
							workspaces = newWorkspaces;
						});
					}.bind(this));
				}
				this.fileClient.addEventListener("Changed", function(evt) {
					if (evt.deleted) {
						if (evt.deleted.some(function(item) {
							return fileUtil.isAtRoot(item.deleteLocation);
						})) {
							this.fileClient.loadWorkspaces(fileSystem).then(function(newWorkspaces) {
								workspaces = newWorkspaces;
							});
						}
					}
				}.bind(this));
				var uriTemplate = new URITemplate("#{,resource,params*}"); //$NON-NLS-0$
				var command = new mCommands.Command({
					name: messages.SwitchWorkspace,
					tooltip: messages.SwitchWorkspaceTip,
					id: "orion.edit.switchWorkspace", //$NON-NLS-0$
					visibleWhen: /** @callback */ function(items, data) {
						return workspaces && workspaces.length > 1;
					},
					choiceCallback: function() {
						var inputManager = this.inputManager || that.inputManager;
						var metadata = inputManager && inputManager.getFileMetadata();
						return workspaces.map(function(w) {
							return {
								name: w.Name,
								checked: metadata && (metadata.WorkspaceLocation || metadata.Location) === w.Location,
								callback: function() {
									window.location = uriTemplate.expand({resource: w.Location});
								}
							};
						});
					}
				});
				that.commandService.addCommand(command);
			}.bind(this));
		},
		_createOpenFolderCommand: function() {
			var that = this;
			var openFolderCommand = new mCommands.Command({
				name: messages.OpenFolder,
				tooltip: messages.OpenFolderTip,
				id: "orion.edit.openFolder", //$NON-NLS-0$
				visibleWhen: /** @callback */ function(items, data) {
					return util.isElectron;
				},
				callback: function() {
					window.__electron.remote.dialog.showOpenDialog({properties: ['openDirectory']}, function(result) {
						if (!result) return;
						that.fileClient.changeWorkspace(result[0]).then(function() {
							util.deleteSetting("/inlineSearchOtherScope");
							var searchClient = that.serviceRegistry.getService("orion.core.search.client");
							if (searchClient) {
								searchClient.setLocationOther(null);
							}
							delete sessionStorage.lastFile;
						});			
					});
				}
			});
			this.commandService.addCommand(openFolderCommand);
		},
		_createOpenRecentCommand: function() {
			var that = this;		
			if(this.preferences){
				this.preferences.get("/workspace",undefined, {noCache:true}).then(function(prefs) {
					return prefs.recentWorkspaces;
				}).then(function(recentworkspaces){
					var openRecentCommand = new mCommands.Command({
						name: messages.OpenRecent,
						selectionClass: "dropdownSelection", //$NON-NLS-0$
						id: "orion.edit.openRecent", //$NON-NLS-0$
						visibleWhen: /** @callback */ function(items, data) {
							return util.isElectron && !!recentworkspaces;
						},
						choiceCallback: function() {
							return recentworkspaces.map(function(folderLocation) {
								return {
									name: folderLocation,
									callback: function() {
										that.fileClient.changeWorkspace(folderLocation).then(function() {
											util.deleteSetting("/inlineSearchOtherScope");
											var searchClient = that.serviceRegistry.getService("orion.core.search.client");
											if (searchClient) {
												searchClient.setLocationOther(null);
											}
											delete sessionStorage.lastFile;
										});
									}
								};
							});
						}
					});
				that.commandService.addCommand(openRecentCommand);
			});
			}
		},
		_createEncodingCommand: function() {
			var that = this;
			var ENCODING_LIST = [
				"UTF-8", "UTF-16LE", //$NON-NLS-1$ //$NON-NLS-2$
				
				"iso-8859-1", "iso-8859-2", "iso-8859-3", "iso-8859-4", //$NON-NLS-3$ //$NON-NLS-2$ //$NON-NLS-1$ //$NON-NLS-4$
				"iso-8859-5", "iso-8859-6", "iso-8859-7", "iso-8859-8", //$NON-NLS-3$ //$NON-NLS-2$ //$NON-NLS-1$ //$NON-NLS-4$
				"iso-8859-9", "iso-8859-10", "iso-8859-11", "iso-8859-12", //$NON-NLS-3$ //$NON-NLS-2$ //$NON-NLS-1$ //$NON-NLS-4$
				"iso-8859-13", "iso-8859-14", "iso-8859-15", "iso-8859-16", //$NON-NLS-3$ //$NON-NLS-2$ //$NON-NLS-1$ //$NON-NLS-4$
				
				"windows-1250", "windows-1251", "windows-1252", "windows-1253", //$NON-NLS-3$ //$NON-NLS-2$ //$NON-NLS-1$ //$NON-NLS-4$
				"windows-1254", "windows-1255", "windows-1256", "windows-1258", //$NON-NLS-3$ //$NON-NLS-2$ //$NON-NLS-1$ //$NON-NLS-4$
				
				"gb18030", "gb2312", "gbk", "Big5", //$NON-NLS-3$ //$NON-NLS-2$ //$NON-NLS-1$ //$NON-NLS-4$
				"Big5-HKSCS", "koi8-r", "koi8-u", "euc-jp", //$NON-NLS-3$ //$NON-NLS-2$ //$NON-NLS-1$ //$NON-NLS-4$
				"euc-tw", "shift-jis", "iso-2022-jp", "iso-2022-kr", //$NON-NLS-3$ //$NON-NLS-2$ //$NON-NLS-1$ //$NON-NLS-4$
				"iso-2022-cn", "hz", "MacRoman", //$NON-NLS-3$ //$NON-NLS-2$ //$NON-NLS-1$ //$NON-NLS-4$
			];
			var uriTemplate = new URITemplate("#{,resource,params*}"); //$NON-NLS-0$
			var changeEncodingCommand = new mCommands.Command({
				name: messages["ReloadWith"],
				selectionClass: "dropdownSelection", //$NON-NLS-0$
				id: "orion.edit.reloadWithEncoding", //$NON-NLS-0$
				visibleWhen: function() {
					var editor = that.editor;
					return editor && editor.installed;
				},
				choiceCallback: function() {
					return ENCODING_LIST.map(function(encoding) {
						return {
							name: encoding,
							callback: function() {
								var input = PageUtil.matchResourceParameters();
								var resource = input.resource;
								delete input.resource;
								delete input.encoding;
								if (this.name !== "UTF-8") {
									input.encoding = this.name;
								}
								window.location.href = uriTemplate.expand({resource: resource, params: input});
							}
						};
					});
				}
			});
			this.commandService.addCommand(changeEncodingCommand);
		},
		_createGotoLineCommnand: function() {
			var that = this;

			// page navigation commands (go to line)
			var lineParameter = new mCommandRegistry.ParametersDescription(
				[new mCommandRegistry.CommandParameter('line', 'number', messages.gotoLinePrompt)], //$NON-NLS-2$ //$NON-NLS-1$ //$NON-NLS-0$
				{hasOptionalParameters: false},
				function(data) {
					var editor = data.handler.editor || that.editor;
					var line = editor.getModel().getLineAtOffset(editor.getCaretOffset()) + 1;
					return [new mCommandRegistry.CommandParameter('line', 'number', messages.gotoLinePrompt, line.toString())]; //$NON-NLS-2$ //$NON-NLS-1$ //$NON-NLS-0$
				}
			);

			var gotoLineCommand =  new mCommands.Command({
				name: messages.gotoLine,
				tooltip: messages.gotoLineTooltip,
				id: "orion.edit.gotoLine", //$NON-NLS-0$
				visibleWhen: /** @callback */ function(items, data) {
					var editor = data.handler.editor || that.editor;
					return editor && editor.installed;
				},
				parameters: lineParameter,
				callback: function(data) {
					var line;
					var editor = this.editor || that.editor;
					var model = editor.getModel();
					if (data.parameters && data.parameters.valueFor('line')) { //$NON-NLS-0$
						line = data.parameters.valueFor('line'); //$NON-NLS-0$
					} else if(!util.isElectron){
						line = model.getLineAtOffset(editor.getCaretOffset());
						line = prompt(messages.gotoLinePrompt, line + 1);
						if (line) {
							line = parseInt(line, 10);
						}
					}
					if (line) {
						editor.onGotoLine(line - 1, 0);
					}
				}
			});
			this.commandService.addCommand(gotoLineCommand);
		},
		_createFindCommnand: function() {
			var that = this;

			// find&&replace commands (find)
			var findParameter = new mCommandRegistry.ParametersDescription(
				[new mCommandRegistry.CommandParameter('find', 'text', 'Find:')], //$NON-NLS-2$ //$NON-NLS-1$ //$NON-NLS-0$
				{clientCollect: true},
				function(data) {
					var editor = data.handler.editor || that.editor;
					var textSearcher = data.handler.textSearcher || that.textSearcher;
					var selection = editor.getSelection();
					var searchString = "";
					if (selection.end > selection.start) {
						var model = editor.getModel();
						searchString = model.getText(selection.start, selection.end);
						if (textSearcher && textSearcher.getOptions().regex) {
							searchString = regex.escape(searchString);
						}
					}
					return [new mCommandRegistry.CommandParameter('find', 'text', 'Find:', searchString)]; //$NON-NLS-2$ //$NON-NLS-1$ //$NON-NLS-0$
				}
			);
			var findCommand =  new mCommands.Command({
				name: messages.Find,
				tooltip: messages.Find,
				id: "orion.edit.find", //$NON-NLS-0$
				visibleWhen: /** @callback */ function(items, data) {
					var editor = data.handler.editor || that.editor;
					var textSearcher = data.handler.textSearcher || that.textSearcher;
					return editor && editor.installed && textSearcher;
				},
				parameters: findParameter,
				callback: function(data) {
					var node = lib.node("replaceCompareDiv"); //$NON-NLS-0$
					if (node && node.classList.contains("replaceCompareDivVisible")) { //$NON-NLS-0$
						return false; //TODO is there a better way of preventing the command from being executed?
					}
					var editor = this.editor || that.editor;
					var textSearcher = this.textSearcher || that.textSearcher;
					if (findCommand.textSearcher && findCommand.textSearcher !== textSearcher) {
						findCommand.textSearcher.hide();
					}
					findCommand.textSearcher = textSearcher;
					var searchString = "";
					var parsedParam = null;
					var selection = editor.getSelection();
					if (data.parameters && data.parameters.valueFor('find')) { //$NON-NLS-0$
						searchString = data.parameters.valueFor('find'); //$NON-NLS-0$
						parsedParam = mPageUtil.matchResourceParameters();
						mSearchUtils.convertFindURLBinding(parsedParam);
					} else if (selection.end > selection.start) {//$NON-NLS-0$ If there is selection from editor, we want to use it as the default keyword
						var model = editor.getModel();
						searchString = model.getText(selection.start, selection.end);
						if (textSearcher.getOptions().regex) {
							searchString = regex.escape(searchString);
						}
					}
					if(parsedParam){
						//If the incoming resource does not match the current inputManager's, we should ignore it.
						//This could happen when clicking on a file and then clicking on another in the global search result page.
						var fileMetadata = (this.inputManager || that.inputManager).getFileMetadata();
						if(!fileMetadata || parsedParam.resource !== fileMetadata.Location) {
							return;
						}
						textSearcher.setOptions({regex: parsedParam.regEx, caseInsensitive: !parsedParam.caseSensitive, wholeWord: parsedParam.wholeWord});
						var tempOptions = {};
						if(parsedParam.atLine){
							tempOptions.start = editor.getModel().getLineStart(parsedParam.atLine-1);
						}
						textSearcher.show({findString: searchString, replaceString: parsedParam.replaceWith});
						textSearcher.find(true, tempOptions);
						that.commandService.closeParameterCollector(); //TODO is there a better way of hiding the parameter collector?
					} else {
						textSearcher.show({findString: searchString});
					}
				}
			});
			this.commandService.addCommand(findCommand);
		},

		_createBlameCommand: function(){
			var that = this;
			var blameCommand = new mCommands.Command({
				name: messages.Blame,
				tooltip: messages.BlameTooltip,
				id: "orion.edit.blame", //$NON-NLS-0$
				parameters: new mCommandRegistry.ParametersDescription([new mCommandRegistry.CommandParameter('blame', 'boolean')], {clientCollect: true}), //$NON-NLS-1$ //$NON-NLS-0$
				visibleWhen: /** @callback */ function(items, data) {
					var editor = data.handler.editor || that.editor;
					var blamer = data.handler.blamer || that.blamer;
					return editor && editor.installed && blamer && blamer.isVisible();
				},
				callback: function(data) {
					var visible = false;
					var editor = this.editor || that.editor;
					var blamer = this.blamer || that.blamer;
					var annotations = editor.getAnnotationModel().getAnnotations();
					while (annotations.hasNext()) {
						var annotation = annotations.next();
						if (annotation.type === mAnnotations.AnnotationType.ANNOTATION_BLAME) {
							visible = true;
							break;
						}
					}
					visible = !visible;
					if (data.parameters && data.parameters.valueFor('blame')) { //$NON-NLS-0$
						visible = data.parameters.valueFor('blame') === "true"; //$NON-NLS-1$ //$NON-NLS-0$
					}
					if (visible) {
						blamer.doBlame();
					} else{
						editor.showBlame([]);
					}
					editor.focus();
				}
			});
			this.commandService.addCommand(blameCommand);
		},

		_createFormatterCommand: function(){
			var that = this;
			var formatterCommand = new mCommands.Command({
				name: messages.Format,
				tooltip: messages.FormatTooltip,
				id: "orion.edit.format", //$NON-NLS-0$
				parameters: new mCommandRegistry.ParametersDescription([new mCommandRegistry.CommandParameter('formatter', 'boolean')], {clientCollect: true}), //$NON-NLS-1$ //$NON-NLS-0$
				visibleWhen: /** @callback */ function(items, data) {
					var inputManager = data.handler.inputManager || that.inputManager;
					if (inputManager && inputManager.getReadOnly()) {
						return false;
					}
					var editor = data.handler.editor || that.editor;
					var formatter = data.handler.formatter || that.formatter;
					return editor && editor.installed && formatter && formatter.isVisible();
				},
				callback: function(data) {
					var editor = this.editor || that.editor;
					var formatter = this.formatter || that.formatter;
					formatter.doFormat();
					editor.focus();
				}
			});
			this.commandService.addCommand(formatterCommand);
		},
		
		/**
		 * @name _createReferencesCommand
		 * @description Creates the retargettable 'References' command
		 * @function
		 * @private
		 * @since 17.0
		 */
		_createReferencesCommand: function _createReferencesCommand(){
			var refsCommand = new mCommands.Command({
				name: messages.References,
				tooltip: messages.ReferencesTooltip,
				id: "orion.edit.references",
				parameters: new mCommandRegistry.ParametersDescription([new mCommandRegistry.CommandParameter('references', 'boolean')], {clientCollect: true}),
				visibleWhen: /** @callback */ function(items, data) {
					var inputManager = data.handler.inputManager || this.inputManager;
					if (inputManager && inputManager.getReadOnly()) {
						return false;
					}
					var editor = data.handler.editor || this.editor;
					var refs = data.handler.references || this.references;
					return editor && editor.installed && refs && refs.isVisible();
				}.bind(this),
				callback: /* @callback */ function(data) {
					var statusService = this.serviceRegistry.getService("orion.page.message");
					var progress = this.serviceRegistry.getService("orion.page.progress"); //$NON-NLS-0$
					var msg = i18nUtil.formatMessage(messages.running, messages.FindReferences);
					var serviceCall = this.references.findReferences(data);
					if (statusService) {
						statusService.createProgressMonitor(serviceCall, msg);
					}
					progress.showWhile(serviceCall, msg).then(function(result) {
						if(this.sideBar) {
							this.sideBar.fillSearchPane(result.searchParams, result.refResult ? result : null);
						}
					}.bind(this));
					this.editor.focus();
				}.bind(this)
			});
			this.commandService.addCommand(refsCommand);
		},
		
		/**
		 * @name _createReferencesCommand
		 * @description Creates the retargettable 'References' command
		 * @function
		 * @private
		 * @since 17.0
		 */
		_createOpenDeclCommand: function _createOpenDeclCommand(){
			var declCommand = new mCommands.Command({
				name: messages.OpenDeclaration,
				tooltip: messages.OpenDeclarationTooltip,
				id: "orion.edit.open.declaration",
				parameters: new mCommandRegistry.ParametersDescription([new mCommandRegistry.CommandParameter('declaration', 'boolean')], {clientCollect: true}),
				visibleWhen: /** @callback */ function(items, data) {
					var inputManager = data.handler.inputManager || this.inputManager;
					if (inputManager && inputManager.getReadOnly()) {
						return false;
					}
					var editor = data.handler.editor || this.editor;
					var decl = data.handler.openDecl || this.openDecl;
					return editor && editor.installed && decl && decl.isVisible();
				}.bind(this),
				callback: /* @callback */ function(data) {
					var statusService = this.serviceRegistry.getService("orion.page.message");
					var progress = this.serviceRegistry.getService("orion.page.progress"); //$NON-NLS-0$
					var msg = i18nUtil.formatMessage(messages.running, messages.FindDeclaration);
					var serviceCall = this.openDecl.findDeclaration(data);
					if (statusService) {
						statusService.createProgressMonitor(serviceCall, msg);
					}
					progress.showWhile(serviceCall, msg).then(function(result) {
						return this.editor.getEditorContext().openEditor(result.file, result);
					}.bind(this));
					this.editor.focus();
				}.bind(this)
			});
			this.commandService.addCommand(declCommand);
		},

		_createDiffCommand: function(){
			var that = this;
			var diffCommand = new mCommands.Command({
				name: messages.Diff,
				tooltip: messages.DiffTooltip,
				id: "orion.edit.diff", //$NON-NLS-0$
				visibleWhen: /** @callback */ function(items, data) {
					var editor = data.handler.editor || that.editor;
					var differ = data.handler.differ || that.differ;
					return editor && editor.installed && differ && differ.isVisible();
				},
				callback: function() {
					var editor = this.editor || that.editor;
					var differ = this.differ || that.differ;
					differ.toggleEnabled();
					var editorPreferences = this.editorPreferences;
					editorPreferences.getPrefs(function(pref){
						pref.diffService = differ.isEnabled();
						editorPreferences.setPrefs(pref);
					});
					editor.focus();
				}
			});
			this.commandService.addCommand(diffCommand);
		},

		_createShowTooltipCommand: function(){
			var that = this;
			
			function doit(all) {
				var editor = this.editor;
				var tooltip = editor.getTooltip();
				var tv = editor.getTextView();
				var offset = tv.getCaretOffset();
				var pos = tv.getLocationAtOffset(offset);
				tooltip.show({
					x: pos.x,
					y: pos.y,
					getTooltipInfo: function() {
						return editor._getTooltipInfo(this.x, this.y, all);
					}
				}, false, true);
			}
			
			var showLineTooltipCommand = new mCommands.Command({
				name: messages.showLineTooltip,
				tooltip: messages.showLineTooltipTooltip,
				id: "orion.edit.showLineTooltip", //$NON-NLS-0$
				visibleWhen: /** @callback */ function(items, data) {
					var editor = data.handler.editor || that.editor;
					return editor && editor.installed;
				},
				callback: function() {
					doit.bind(this)(true);
				}
			});
			this.commandService.addCommand(showLineTooltipCommand);
		},

		_onServiceRemoved: function(serviceReference) {
			if (serviceReference.getProperty("objectClass").indexOf("orion.edit.command") !== -1) { //$NON-NLS-1$ //$NON-NLS-2$
				this._recreateEditCommands = true;
			}
		},
		_onServiceAdded: function(serviceReference) {
			if (serviceReference.getProperty("objectClass").indexOf("orion.edit.command") !== -1) { //$NON-NLS-1$ //$NON-NLS-2$
				this._recreateEditCommands = true;
			}
			if (serviceReference.getProperty("objectClass").indexOf("orion.core.contenttype") !== -1) { //$NON-NLS-1$ //$NON-NLS-2$
				contentTypesCache = null;
			}
		},
		_createEditCommands: function() {
			var that = this;
			this._recreateEditCommands = false;

			function getContentTypes(serviceRegistry) {
				if (contentTypesCache) {
					return contentTypesCache;
				}
				var contentTypeService = serviceRegistry.getService("orion.core.contentTypeRegistry"); //$NON-NLS-0$
				//TODO Shouldn't really be making service selection decisions at this level. See bug 337740
				if (!contentTypeService) {
					contentTypeService = new mContentTypes.ContentTypeRegistry(serviceRegistry);
					contentTypeService = serviceRegistry.getService("orion.core.contentTypeRegistry"); //$NON-NLS-0$
				}
				return contentTypeService.getContentTypes().then(function(ct) {
					contentTypesCache = ct;
					return contentTypesCache;
				});
			}

			// add the commands generated by plug-ins who implement the "orion.edit.command" extension.
			//
			// Note that the shape of the "orion.edit.command" extension is not in any shape or form that could be considered final.
			// We've included it to enable experimentation. Please provide feedback in the following bug:
			// https://bugs.eclipse.org/bugs/show_bug.cgi?id=337766
			//
			// iterate through the extension points and generate commands for each one.
			var serviceRegistry = this.serviceRegistry;
			var commandRegistry = this.commandService;
			var actionReferences = serviceRegistry.getServiceReferences("orion.edit.command"); //$NON-NLS-0$
			var progress = serviceRegistry.getService("orion.page.progress"); //$NON-NLS-0$
			var statusService = serviceRegistry.getService("orion.page.message"); //$NON-NLS-0$
			var handleStatus = handleStatusMessage.bind(null, serviceRegistry);
			var makeCommand = function(info, service, options) {
				var commandVisibleWhen = options.visibleWhen;
				options.visibleWhen = function(items, data) {
					var editor = data.handler.editor || that.editor;
					var inputManager = data.handler.inputManager || that.inputManager;
					if (!editor || !editor.installed || !inputManager) {
						return false;
					}
					if (info.editor && editor.id && info.editor !== editor.id) {
						return false;
					}
					if (that.inputManager.getReadOnly()) {
						return false;
					}
					return !commandVisibleWhen || commandVisibleWhen(inputManager.getFileMetadata());
				};
				options.callback = function(data) {
					var editor = this.editor || that.editor;
					var inputManager = this.inputManager || that.inputManager;
					
					// When in the split editor quickfixes should be applied to the editor the annotation is in, not the editor with focus
					if (info.scopeId === "orion.edit.quickfix" && data.userData.annotation.creatorID){
						editor = data.userData.annotation.creatorID;
					}
					
					//TODO should all text editors have selection?
					var selection = editor.getSelection ? editor.getSelection() : {start: 0, end: 0};
					var model = editor.getModel();

					/*
					 * Processes the result object from old run() API.
					 * @deprecated: command services should implement execute() instead.
					 */
					var processEditorResult = function(result) {
						if (typeof result === "object" && result) { //$NON-NLS-0$
							if (result.text) {
								editor.setText(result.text);
							}
							if (result.selection) {
								if (editor.setSelection) {
									editor.setSelection(result.selection.start, result.selection.end, true /*scroll to*/);
								}
								editor.focus();
							}
						} else if (typeof result === 'string') { //$NON-NLS-0$
							editor.setText(result, selection.start, selection.end, true /*scroll to*/);
							if (editor.setSelection) {
								editor.setSelection(selection.start, selection.start + result.length);
							}
							editor.focus();
						}
					};

					var serviceCall, handleResult;
					if (service.execute) {
						var context = {
							contentType: inputManager.getContentType(),
							input: inputManager.getInput(),
							offset: editor.getCaretOffset(),
							readonly: inputManager.getReadOnly()
						};
						
						// Provide the quick fix command with the selected annotation
						if (info.scopeId === "orion.edit.quickfix") {
							context.annotation = {
								start: data.userData.annotation.start,
								end: data.userData.annotation.end,
								title: data.userData.annotation.title,
								id: data.userData.annotation.id,
								data: data.userData.annotation.data
							};
							// Also include other annotations with the same id
							// TODO: We are using the internals of the annotation model here
							// TODO We also check the model existence in commands.js
							if (data.userData.annotation.doFixAll && data.userData.annotation._annotationModel){
								context.doFixAll = true;
								context.annotations = [];
								var allAnnotations = data.userData.annotation._annotationModel._annotations;
								for (var i=0; i<allAnnotations.length; i++) {
									if (allAnnotations[i].id === data.userData.annotation.id){
										context.annotations.push(
											{
												start: allAnnotations[i].start,
												end: allAnnotations[i].end,
												title: allAnnotations[i].title,
												id: allAnnotations[i].id,
												data: allAnnotations[i].data
											}
										);
									}
								}
							}
						}
						var editorContext = editor.getEditorContext();
						// Hook up delegated UI and Status handling
						editorContext.openDelegatedUI = function(/*options, ..*/) {
							var options1 = arguments[0];
							options1 = options1 || {};
							options1.done = processEditorResult;
							options1.status = handleStatus;
							options1.params = options1.params || {};
							objects.mixin(options1.params, inputManager.getFileMetadata());
							createDelegatedUI.apply(null, Array.prototype.slice.call(arguments));
						};
						editorContext.setStatus = handleStatus;
						
						editor.focus();
						serviceCall = service.execute(editorContext, context); 
					} else {
						serviceCall = service.run(model.getText(selection.start,selection.end), model.getText(), selection, inputManager.getInput());
					}
					handleResult = function(result) {
						if (result && result.uriTemplate) {
							var options1 = {};
							options1.uriTemplate = result.uriTemplate;
							options1.params = inputManager.getFileMetadata();
							options1.id = info.id;
							options1.width = result.width;
							options1.height = result.height;
							options1.done = processEditorResult;
							options1.status = handleStatus;
							createDelegatedUI(options1);
						} else if (result && result.searchParams) {
							if(that.sideBar) {
								that.sideBar.fillSearchPane(result.searchParams, result.refResult ? result : null);
							}
						} else if (result && (result.Status || result.status)) {
							handleStatus(result.Status || result.status);
						} else {
							processEditorResult(result);
						}
					};
					var msg = i18nUtil.formatMessage(messages.running, options.name);
					if (statusService) {
						statusService.createProgressMonitor(serviceCall, msg);
					}
					progress.showWhile(serviceCall, msg).then(handleResult);
					return true;
				};
				return new mCommands.Command(options);
			};
			return Deferred.when(getContentTypes(this.serviceRegistry), function() {
				// Create Commands
				var commandPromises = [];
				actionReferences.forEach(function(serviceReference) {
					var service = that.serviceRegistry.getService(serviceReference);
					var info = {};
					var propertyNames = serviceReference.getPropertyKeys();
					for (var j = 0; j < propertyNames.length; j++) {
						info[propertyNames[j]] = serviceReference.getProperty(propertyNames[j]);
					}
					info.forceSingleItem = true;  // for compatibility with mExtensionCommands._createCommandOptions

					var deferred = mExtensionCommands._createCommandOptions(info, serviceReference, that.serviceRegistry, contentTypesCache, false, /* @callback */ function(items) {
						if (info.scopeId === "orion.edit.quickfix" && items.annotation !== undefined && items.readonly !== undefined){
							// Quick fixes validate based on annotation and readonly, if in split editor mode, validate the annotation's editor, not the active editor (Bug 496208)
							return items;
						}
						// items is the editor and we care about the file metadata for validation
						return that.inputManager.getFileMetadata();
					}).then(function(commandOptions){
						var command = makeCommand(info, service, commandOptions);
						command.editInfo = info;
						commandRegistry.addCommand(command);
						return command;
					});
					commandPromises.push(deferred);
				});
				return Deferred.all(commandPromises, errorTransformer);
			});
		}
	};
	exports.EditorCommandFactory = EditorCommandFactory;
	exports.handleStatusMessage = handleStatusMessage;

	return exports;
});
