/*******************************************************************************
 * @license
 * Copyright (c) 2012, 2019 IBM Corporation and others.
 * All rights reserved. This program and the accompanying materials are made 
 * available under the terms of the Eclipse Public License 2.0 
 * (http://www.eclipse.org/legal/epl-v10.html), and the Eclipse Distribution 
 * License v1.0 (http://www.eclipse.org/org/documents/edl-v10.html). 
 * 
 * Contributors: IBM Corporation - initial API and implementation
 ******************************************************************************/
/*eslint-env browser, amd*/
define([
	'orion/explorers/explorer',
	'orion/section',
	'orion/Deferred',
	'orion/objects',
	'orion/webui/dialogs/ConfirmDialog',
	'orion/widgets/input/SettingsCheckbox',
	'orion/widgets/input/SettingsTextfield',
	'orion/widgets/input/SettingsSelect',
	'i18n!orion/settings/nls/messages',
	'orion/i18nUtil',
	'orion/commands',
	'orion/PageUtil',
	'orion/webui/littlelib',
	'orion/URITemplate'
], function(mExplorer, mSection, Deferred, objects, mConfirmDialog, SettingsCheckbox, SettingsTextfield, 
		SettingsSelect, messages, i18nUtil, Commands, PageUtil, lib, URITemplate) {
	var Explorer = mExplorer.Explorer,
	    SelectionRenderer = mExplorer.SelectionRenderer,
	    Section = mSection.Section,
	    Command = Commands.Command,
	    ConfirmDialog = mConfirmDialog.ConfirmDialog;

	var SECTION_HIDE = '/settings/sectionExpand'; //$NON-NLS-1$
	var editTemplate = new URITemplate("/edit/edit.html#{,resource,params*}"); //$NON-NLS-0$

	/**
	 * @name orion.settings.ui.PropertyWidget
	 * @class Base mixin for plugin settings widgets.
	 * @description Base mixin for plugin settings widgets.
	 */
	/**
	 * @name orion.settings.ui.PropertyWidget#property
	 * @field
	 * @type orion.metatype.AttributeDefinition
	 */
	var PropertyWidget = function(options) {
		objects.mixin(this, options);
		this.fieldlabel = this.property.getName(); // TODO nls
	};
	objects.mixin(PropertyWidget.prototype, /** @lends orion.settings.ui.PropertyWidget.prototype */ {
		postCreate: function() {
			var property = this.property, config = this.config, properties = config.getProperties();
			var value;
			if (properties && typeof properties[property.getId()] !== 'undefined') {
				value = properties[property.getId()];
			} else {
				value = property.getDefaultValue();
			}
			if (typeof this.updateField === 'function') {
				this.updateField(value);
			}
		},
		/**
		 * Sets the model value to reflect the given UI event.
		 * @param {Object} uiValue
		 */
		changeProperty: null, /*function() {},*/
		/**
		 * Sets the UI field to reflect the modelValue.
		 * @param {Object} modelValue
		 */
		updateField: null /*function(modelValue) {}*/
	});

	/**
	 * Widget displaying a string-typed plugin setting. Mixes in SettingsTextfield and PropertyWidget.
	 * @callback
	 */
	var PropertyTextField = function(options) {
		PropertyWidget.apply(this, arguments);
		SettingsTextfield.apply(this, arguments);
		if (this.node && options.indent) {
			var spans = this.node.getElementsByTagName('span');
			if (spans) {
				var span = spans[0];
				var existingClassName = span.className;
				if (existingClassName) {
					span.className += " setting-indent";
				} else {
					span.className = "setting-indent";
				}
			}
		}
	};
	objects.mixin(PropertyTextField.prototype, SettingsTextfield.prototype, PropertyWidget.prototype, {
		postCreate: function() {
			SettingsTextfield.prototype.postCreate.apply(this, arguments);
			PropertyWidget.prototype.postCreate.apply(this, arguments);
			var type = this.property.getType();
			if (type === 'number') {
				this.textfield.type = 'number'; //$NON-NLS-0$
			} else {
				this.textfield.type = 'text'; //$NON-NLS-0$
			}
		},
		/**
		 * @callback
		 */
		change: function(event) {
			this.changeProperty(this.textfield.value);
		},
		updateField: function(value) {
			this.textfield.value = value;
		}
	});

	/**
	 * Widget displaying a boolean-typed plugin setting. Mixes in SettingsCheckbox and PropertyWidget.
	 */
	var PropertyCheckbox = function(options) {
		PropertyWidget.apply(this, arguments);
		SettingsCheckbox.apply(this, arguments);
		if (this.node && options.indent) {
			var spans = this.node.getElementsByTagName('span');
			if (spans) {
				var span = spans[0];
				var existingClassName = span.className;
				if (existingClassName) {
					span.className += " setting-indent";
				} else {
					span.className = "setting-indent";
				}
			}
		}
	};
	objects.mixin(PropertyCheckbox.prototype, SettingsCheckbox.prototype, PropertyWidget.prototype, {
		change: function(event) {
			this.changeProperty(event.target.checked);
		},
		postCreate: function() {
			PropertyWidget.prototype.postCreate.call(this);
			SettingsCheckbox.prototype.postCreate.call(this);
		},
		updateField: function(value) {
			this.checkbox.checked = value;
		}
	});

	/**
	 * Widget displaying a plugin setting whose value is restricted to an enumerated set (options). Mixes in SettingsSelect and PropertyWidget.
	 * @callback
	 */
	var PropertySelect = function(options) {
		PropertyWidget.apply(this, arguments);
		SettingsSelect.apply(this, arguments);
		if (this.node && options.indent) {
			var spans = this.node.getElementsByTagName('span');
			if (spans) {
				var span = spans[0];
				var existingClassName = span.className;
				if (existingClassName) {
					span.className += " setting-indent";
				} else {
					span.className = "setting-indent";
				}
			}
		}
	};
	objects.mixin(PropertySelect.prototype, SettingsSelect.prototype, PropertyWidget.prototype, {
		postCreate: function() {
			var values = this.property.getOptionValues();
			var labels = this.property.getOptionLabels(); // TODO nls
			this.options = values.map(function(value, i) {
				var label = typeof labels[i] === 'string' ? labels[i] : value;
				return {value: label, label: label};
			});
			SettingsSelect.prototype.postCreate.apply(this, arguments);
			PropertyWidget.prototype.postCreate.apply(this, arguments);
		},
		/**
		 * @callback
		 */
		change: function(event) {
			SettingsSelect.prototype.change.apply(this, arguments);
			var selectedOptionValue = this.property.getOptionValues()[this.getSelectedIndex()];
			if (typeof selectedOptionValue !== 'undefined') {
				this.changeProperty(selectedOptionValue);
			}
		},
		updateField: function(value) {
			var index = this.property.getOptionValues().indexOf(value);
			if (index !== -1) {
				this.setSelectedIndex(index);
			}
		}
	});

	/**
	 * Container widget displaying the plugin settings of a single {@link orion.cm.Configuration}. Each setting is
	 * rendered by instantiating an appropriate Property* widget and adding it as a child of this widget.
	 */
	var PropertiesWidget = function(options, parentNode) {
		objects.mixin(this, options);
		if (!parentNode) { throw new Error("parentNode is required"); } //$NON-NLS-1$
		this.node = parentNode;
		this.messageService = this.serviceRegistry.getService("orion.page.message"); //$NON-NLS-0$
		this.updateMessage = i18nUtil.formatMessage(messages["SettingUpdateSuccess"], this.categoryTitle);
		var configAdmin = this.serviceRegistry.getService('orion.cm.configadmin'); //$NON-NLS-0$
		var preferences = this.serviceRegistry.getService('orion.core.preference'); //$NON-NLS-0$
		this.controller = new ConfigController(preferences, configAdmin, this.setting.getPid());
	};
	objects.mixin(PropertiesWidget.prototype, {
		createElements: function() {
			this.children = [];
			this.initConfiguration().then(function(configuration) {
				this.createChildren(configuration);
			}.bind(this));
		},
		startup: function() {
			this.createElements();
		},
		destroy: function() {
			if (this.children) {
				this.children.forEach(function(child) {
					child.destroy();
				});
			}
		},
		addChild: function(childWidget) {
			this.children.push(childWidget);
			this.node.appendChild(childWidget.node);
			childWidget.show();
		},
		createChildren: function(configuration, parentAttribute) {
			var root = parentAttribute ? parentAttribute : this.setting;
			root.getAttributeDefinitions().forEach(function(property) {
				var dependsOn = property.getDependsOn(), 
					options = {
						indent: typeof dependsOn === 'string',
						config: configuration,
						property: property,
						changeProperty: this.changeProperty.bind(this, property) ,
						serviceRegistry: this.serviceRegistry
					},
					widget;
				if (property.getOptionValues()) {
					// Enumeration
					widget = new PropertySelect(options);
				} else {
					switch (property.getType()) {
						case 'boolean':
							widget = new PropertyCheckbox(options);
							break;
						case 'number':
						case 'string':
							widget = new PropertyTextField(options);
							break;
					}
				}
				this.addChild(widget);
				if(Array.isArray(property.children) && property.children.length > 0) {
					this.createChildren(configuration, property);
				}
			}.bind(this));
		},
		initConfiguration: function() {
			return this.controller.initConfiguration();
		},
		changeProperty: function(attributeDefinition, value) {
			var _self = this;
			return this.controller.changeProperty(this.setting, attributeDefinition.getId(), value).then(function() {
				_self.messageService.setProgressResult(_self.updateMessage);
			});
		}
	});

	/**
	 * Controller for modifying a configuration
	 */
	function ConfigController(preferences, configAdmin, pid) {
		this.preferences = preferences;
		this.configAdmin = configAdmin;
		this.pid = pid;
		this.config = this.defaultConfig = this.configPromise = null;
	}
	objects.mixin(ConfigController.prototype, {
		/** Creates a new configuration if necessary */
		initConfiguration: function() {
			var configuration = this.config;
			if (!configuration) {
				var pid = this.pid, self = this;
				this.configPromise = this.configPromise ||
					Deferred.all([
						this.configAdmin.getDefaultConfiguration(pid),
						this.configAdmin.getConfiguration(pid)
					]).then(function(result) {
						self.defaultConfig = result[0];
						self.config = result[1];
						return self.config;
					});
				return this.configPromise;
			}
			return new Deferred().resolve(configuration);
		},
		changeProperty: function(setting, attributeId, value) {
			return this.initConfiguration().then(function(configuration) {
				var props = configuration.getProperties() || {};
				props[attributeId] = value;
				// Decide if this configuration equals the setting's default values.
				var defaultProps = this.getDefaultProps();
				var isNoop = setting.isDefaults(props, defaultProps);
				if (isNoop) {
					//TODO stop reaching into preferences service
					var data = {};
					data[props.pid] = props;
					this.preferences._valueChanged("/cm/configurations", data); //$NON-NLS-1$
					// Entire configuration is a no-op (i.e. it equals its default values) so remove it entirely
					return this.remove();
				}
				configuration.update(props);
			}.bind(this));
		},
		getDefaultProps: function() {
			return this.defaultConfig ? this.defaultConfig.getProperties() : null;
		},
		/** Reset the configuration back to the effective defaults, whatever they are */
		reset: function() {
			return this.initConfiguration().then(function(configuration) {
				var defaultProps = this.getDefaultProps();
				if (!defaultProps) {
					return this.remove();
				}
				configuration.update(defaultProps);
			}.bind(this));
		},
		/** Remove the configuration */
		remove: function() {
			return this.initConfiguration().then(function(configuration) {
				configuration.remove();
				this.config = null;
				this.configPromise = null;
			}.bind(this));
		}
	});

	/**
	 * Renderer for SettingsList.
	 */
	function SettingsRenderer(settingsListExplorer, serviceRegistry) {
		this.serviceRegistry = serviceRegistry;
		this.childWidgets = [];
		SelectionRenderer.call(this, {cachePrefix: 'pluginSettings', noRowHighlighting: true}, settingsListExplorer); //$NON-NLS-0$
	}
	SettingsRenderer.prototype = Object.create(SelectionRenderer.prototype);
	/** @callback */
	SettingsRenderer.prototype.getCellElement = function(col_no, /*Setting*/ setting, rowElement) {
		var sectionId = setting.getPid(), headerId = sectionId + 'header'; //$NON-NLS-0$
		
		var settingSection = document.createElement('div');
		settingSection.id = sectionId;
		settingSection.className = 'setting-row'; //$NON-NLS-0$

		var sectionHeader = document.createElement('div'); //$NON-NLS-0$
		sectionHeader.id = headerId;
		// setting-header-generated sets the heading to be 0 width as there are no categories on generated settings pages
		sectionHeader.className = 'setting-header setting-header-generated'; //$NON-NLS-0$
//		sectionHeader.textContent = setting.getName(); // if there are ever multiple sections, use section header

		var propertiesElement = document.createElement('div');
		propertiesElement.className = 'setting-content'; //$NON-NLS-0$
		var propertiesWidget = this.createPropertiesWidget(propertiesElement, setting);
		this.childWidgets.push(propertiesWidget);
		propertiesWidget.startup();

		settingSection.appendChild(sectionHeader);
		settingSection.appendChild(propertiesElement);
		rowElement.appendChild(settingSection);
//		mNavUtils.addNavGrid(this.explorer.getNavDict(), setting, link);
	};
	SettingsRenderer.prototype.createPropertiesWidget = function(parent, setting) {
		return new PropertiesWidget({serviceRegistry: this.serviceRegistry, setting: setting, categoryTitle: this.explorer.categoryTitle}, parent);
	};
	/** @callback */
	SettingsRenderer.prototype.renderTableHeader = function(tableNode) {
		return document.createElement('div');
	};
	SettingsRenderer.prototype.destroy = function() {
		if (this.childWidgets) {
			this.childWidgets.forEach(function(widget) {
				widget.destroy();
			});
		}
		this.childWidgets = null;
	};
	/**
	 * Explorer for SettingsList.
	 */
	function SettingsListExplorer(serviceRegistry, categoryTitle) {
		Explorer.call(this, serviceRegistry, undefined, new SettingsRenderer(this, serviceRegistry));
		this.categoryTitle = categoryTitle;
	}
	SettingsListExplorer.prototype = Object.create(Explorer.prototype);
	SettingsListExplorer.prototype.destroy = function() {
		if (this.renderer) {
			this.renderer.destroy();
		}
	};

	/**
	 * Widget showing list of Plugin Settings.
	 * Requires the 'orion.cm.configadmin' service.
	 * @param {DomNode|String} options.parent
	 * @param {orion.serviceregistry.ServiceRegistry} options.serviceRegistry
	 * @param {orion.settings.Settings[]} options.settings
	 */
	function SettingsList(options) {
		this.serviceRegistry = options.serviceRegistry;
		this.prefService = this.serviceRegistry.getService('orion.core.preference'); //$NON-NLS-1$
		var commandRegistry = this.commandRegistry = options.commandRegistry;
		this.settings = options.settings;
		this.title = options.title;
		this.fileClient = options.fileClient;
		if (!options.parent || !options.serviceRegistry || !options.settings || !options.title) {
			throw new Error('Missing required option'); //$NON-NLS-0$
		}
		this.parent = typeof options.parent === 'string' ? document.getElementById('parent') : options.parent; //$NON-NLS-0$ //$NON-NLS-1$

		var restoreCommand = new Command({
			id: "orion.pluginsettings.restore", //$NON-NLS-0$
			name: messages["Restore"],
			callback: function(data) {
				var dialog = new ConfirmDialog({
					confirmMessage: messages["ConfirmRestore"],
					title: messages["Restore"]
				});
				dialog.show();
				var _self = this;
				dialog.addEventListener("dismiss", function(event) {
					if (event.value) {
						var previousActiveElement = document.activeElement;
						lib.returnFocus(_self.parent, previousActiveElement, function() {
							return _self.restore(data.items ? data.items.pid : undefined);
						});
					}
				});
			}.bind(this)
		});
		commandRegistry.addCommand(restoreCommand);
		commandRegistry.registerCommandContribution("restoreDefaults", "orion.pluginsettings.restore", 2); //$NON-NLS-1$ //$NON-NLS-2$

		this.render(this.parent, this.serviceRegistry, this.settings, this.title);
	}

	function getEslintSettings(fileClient, projectPath, callback) {
		var eslintrcjs = projectPath + SettingsList.prototype.ESLINTRC_JS;
		return fileClient.read(eslintrcjs, false, false, {readIfExists: true}).then(function(contents) {
			if (contents !== null) {
				callback({contents: contents, name: SettingsList.prototype.ESLINTRC_JS, location: eslintrcjs});
				return;
			}
			var eslintrcjson = projectPath + SettingsList.prototype.ESLINTRC_JSON;
			return fileClient.read(eslintrcjson, false, false, {readIfExists: true}).then(function(contents) {
				if (contents !== null) {
					callback({contents: contents, name: SettingsList.prototype.ESLINTRC_JSON, location: eslintrcjson});
					return;
				}
				var eslintrc = projectPath + SettingsList.prototype.ESLINTRC;
				return fileClient.read(eslintrc, false, false, {readIfExists: true}).then(function(contents) {
					if (contents !== null) {
						callback({contents: contents, name: SettingsList.prototype.ESLINTRC, location: eslintrc});
						return;
					}
					var eslintrcYaml = projectPath + SettingsList.prototype.ESLINTRC_YAML;
					return fileClient.read(eslintrcYaml, false, false, {readIfExists: true}).then(function(contents) {
						if (contents !== null) {
							callback({contents: contents, name: SettingsList.prototype.ESLINTRC_YAML, location: eslintrcYaml});
							return;
						}
						var eslintrcYml = projectPath + SettingsList.prototype.ESLINTRC_YML;
						return fileClient.read(eslintrcYml, false, false, {readIfExists: true}).then(function(contents) {
							if (contents !== null) {
								callback({contents: contents, name: SettingsList.prototype.ESLINTRC_YML, location: eslintrcYml});
								return;
							}
							var packageJson = projectPath + SettingsList.prototype.PACKAGE_JSON;
							return fileClient.read(packageJson, false, false, {readIfExists: true}).then(function(contents) {
								if(contents !== null) {
									var vals = JSON.parse(contents);
									if(vals.eslintConfig !== null && typeof vals.eslintConfig === 'object' && Object.keys(vals.eslintConfig).length > 0) {
										callback({contents: contents, name: SettingsList.prototype.PACKAGE_JSON, location: packageJson});
									}
								}
								return;
							});
						});
					});
				});
			});
		});
	}
	
	function getFormattingSettings(fileClient, projectPath, callback) {
		var jsbeautifyrc = projectPath + SettingsList.prototype.JSBEAUTIFYRC;
		return fileClient.read(jsbeautifyrc, false, false, {readIfExists: true}).then(function(contents) {
			if (contents !== null) {
				callback({contents: contents, name: SettingsList.prototype.JSBEAUTIFYRC, location: jsbeautifyrc});
				return;
			}
		}.bind(this));
	}

	SettingsList.prototype = {
		/**
		 * The .eslintrc file name
		 * @see http://eslint.org/docs/user-guide/configuring#configuration-file-formats
		 */
		ESLINTRC : '.eslintrc',
		/**
		 * The .eslintrc.js file name
		 * @see http://eslint.org/docs/user-guide/configuring#configuration-file-formats
		 */
		ESLINTRC_JS : '.eslintrc.js',
		/**
		 * The .eslintrc.yaml file name
		 * @see http://eslint.org/docs/user-guide/configuring#configuration-file-formats
		 */
		ESLINTRC_YAML : '.eslintrc.yaml',
		/**
		 * The .eslintrc.yml file name
		 * @see http://eslint.org/docs/user-guide/configuring#configuration-file-formats
		 */
		ESLINTRC_YML : '.eslintrc.yml',
		/**
		 * The .eslintrc.json file name
		 * @see http://eslint.org/docs/user-guide/configuring#configuration-file-formats
		 */
		ESLINTRC_JSON : '.eslintrc.json',
		/**
		 * The package.json file name
		 */
		PACKAGE_JSON : 'package.json',
		/**
		 * The .jsbeautifyrc file name
		 * @see https://github.com/beautify-web/js-beautify/blob/master/README.md
		 */
		JSBEAUTIFYRC : '.jsbeautifyrc',
		
		_makeSection: function(parent, sectionId, title, hasMultipleSections) {
			var that = this;
			function updateHideSetting(newValue){
				if (that.prefService){
					that.prefService.get(SECTION_HIDE).then(function(prefs) {
						prefs[sectionId] = !newValue;
						that.prefService.put(SECTION_HIDE, prefs);
					});
				}
			}
			var section = new Section(parent, { id: sectionId, title: title, useAuxStyle: true, canHide: hasMultipleSections, onExpandCollapse: updateHideSetting});
			return section;
		},
		destroy: function() {
			this.explorer.destroy();
			this.destroyed = true;
		},
		restore: function(pid) {
			var deferreds = [];
			for(var i = 0; i < this.settings.length; i++) {
				var setting = this.settings[i];
				var preferences = this.serviceRegistry.getService('orion.core.preferences'); //$NON-NLS-1$
				if(pid) {
					if(setting.getPid() === pid) {
						deferreds.push(new ConfigController(preferences, this.serviceRegistry.getService('orion.cm.configadmin'), setting.getPid()).reset()); //$NON-NLS-1$
						deferreds.push(new ConfigController(this.prefService, this.serviceRegistry.getService('orion.cm.configadmin'), setting.getPid()).reset()); //$NON-NLS-1$
					}
				} else {
					deferreds.push(new ConfigController(preferences, this.serviceRegistry.getService('orion.cm.configadmin'), setting.getPid()).reset()); //$NON-NLS-1$
					deferreds.push(new ConfigController(this.prefService, this.serviceRegistry.getService('orion.cm.configadmin'), setting.getPid()).reset()); //$NON-NLS-1$
				}
			}
			if(deferreds.length > 0) { 
				return Deferred.all(deferreds, function(err) { return err; }).then(function() {
					lib.setSafeInnerHTML(this.parent, "");
					this.render(this.parent, this.serviceRegistry, this.settings, this.title);
					this.serviceRegistry.getService("orion.page.message").setProgressResult(messages["settingsRestored"]); //$NON-NLS-1$
				}.bind(this));
			}
			return new Deferred().resolve();
		},
		render: function(parent, serviceRegistry, settings, categoryTitle) {
			var pageParams = PageUtil.matchResourceParameters();
			var projectName;
			switch(pageParams.category) {
				case "javascript" : {
					if (pageParams.resource && pageParams.resource.length !== 0) {
						// resource name starts with /file/ and ends with '/'
						projectName = pageParams.resource.substring(6, pageParams.resource.length - 1);
						getEslintSettings(
							this.fileClient,
							pageParams.resource,
							function(file) {
								if (!this.destroyed) {
									var infoText = document.createElement("div"); //$NON-NLS-0$
									infoText.classList.add("setting-info"); //$NON-NLS-0$
									infoText.textContent = messages.SettingWarning;
									var icon = document.createElement("span"); //$NON-NLS-0$
									icon.classList.add("core-sprite-warning"); //$NON-NLS-0$
									icon.classList.add("icon-inline"); //$NON-NLS-0$
									icon.classList.add("imageSprite"); //$NON-NLS-0$
									var link = document.createElement("a"); //$NON-NLS-0$
									link.href = editTemplate.expand({resource: file.location});
									link.appendChild(document.createTextNode(file.name));
									var projectText = document.createElement("span"); //$NON-NLS-0$
									projectText.textContent = projectName;
									lib.processDOMNodes(infoText, [icon, link, projectText]);
									if (parent.firstChild) {
										parent.insertBefore(infoText, parent.firstChild);
									} else {
										parent.appendChild(infoText);
									}
									return true;
								}
						}.bind(this));
					}
					break;
				}
				case "javascriptFormatting" : {
					if (pageParams.resource && pageParams.resource.length !== 0) {
						// resource name starts with /file/ and ends with '/'
						projectName = pageParams.resource.substring(6, pageParams.resource.length - 1);
						getFormattingSettings(
							this.fileClient,
							pageParams.resource,
							function(file) {
								if (!this.destroyed) {
									var infoText = document.createElement("div"); //$NON-NLS-0$
									infoText.classList.add("setting-info"); //$NON-NLS-0$
									infoText.textContent = messages.SettingWarning;
									var icon = document.createElement("span"); //$NON-NLS-0$
									icon.classList.add("core-sprite-warning"); //$NON-NLS-0$
									icon.classList.add("icon-inline"); //$NON-NLS-0$
									icon.classList.add("imageSprite"); //$NON-NLS-0$
									var link = document.createElement("a"); //$NON-NLS-0$
									link.href = editTemplate.expand({resource: file.location});
									link.appendChild(document.createTextNode(file.name));
									var projectText = document.createElement("span"); //$NON-NLS-0$
									projectText.textContent = projectName;
									lib.processDOMNodes(infoText, [icon, link, projectText]);
									if (parent.firstChild) {
										parent.insertBefore(infoText, parent.firstChild);
									} else {
										parent.appendChild(infoText);
									}
									return true;
								}
							}.bind(this));
					}
				}
			}
			for (var i=0; i<settings.length; i++) {
				var setting = settings[i];
				var sectionId = 'settings.section.'; //$NON-NLS-1$
				if (setting.pid){
					sectionId += setting.pid;
				} else {
					sectionId += i;
				}
				var section = this._makeSection(parent, sectionId, setting.getName() || "Unnamed", settings.length > 1); //$NON-NLS-0$
				this.commandRegistry.renderCommands("restoreDefaults", section.getActionElement(), settings[i], this, "button"); //$NON-NLS-1$ //$NON-NLS-0$ //$NON-NLS-2$
				
				// Add a class name based on the category (all settings on the page have the same category currently)
				if(setting.category){
					// This does not match the full spec of legal class names, but we avoid categories breaking the UI, Bug 444194
					var className = setting.category.replace(/[^_0-9a-zA-Z-]/gi, '-') + "SettingsTable"; //$NON-NLS-0$ //$NON-NLS-1$
					section.getContentElement().classList.add(className);
				}
				
				this.explorer = new SettingsListExplorer(serviceRegistry, categoryTitle);
				this.explorer.createTree(section.getContentElement().id, new mExplorer.SimpleFlatModel([setting], 'setting-', //$NON-NLS-0$
					function(item) {
						return item.getPid();
					}),
					{	tableElement: 'div', //$NON-NLS-0$
						tableBodyElement: 'div', //$NON-NLS-0$
						tableRowElement: 'div', //$NON-NLS-0$
						noSelection: true // Until we support selection based commands, don't allow selection
					});
				
				if (this.prefService && setting.pid && settings.length > 1){
					this.prefService.get(SECTION_HIDE).then(function(theSection, prefs) {
						if (typeof prefs[theSection.id] === 'boolean'){
							theSection.setHidden(prefs[theSection.id]);
						} else {
							theSection.setHidden(true);
						}
					}.bind(null, section));
				} else if (settings.length > 1) {
					section.setHidden(true);
				}
			}
		}
	};

	return SettingsList;
});
