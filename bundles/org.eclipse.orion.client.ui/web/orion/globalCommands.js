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
define([
	'module',
	'i18n!orion/nls/messages', 
	'i18n!orion/widgets/nls/messages', 
	'i18n!orion/edit/nls/messages',  
	'require', 
	'orion/commonHTMLFragments', 
	'orion/keyBinding', 
	'orion/EventTarget', 
	'orion/commands',
	'orion/parameterCollectors', 
	'orion/extensionCommands', 
	'orion/webui/littlelib', 
	'orion/i18nUtil',
	'orion/webui/splitter', 
	'orion/webui/dropdown', 
	'orion/webui/tooltip', 
	'orion/contentTypes', 
	'orion/keyAssist',
	'orion/widgets/themes/ThemePreferences', 
	'orion/widgets/themes/container/ThemeData', 
	'orion/Deferred',
	'orion/widgets/UserMenu',
	'orion/PageLinks', 
	'orion/webui/dialogs/OpenResourceDialog', 
	'!orion/banner/banner',
	'text!orion/banner/footer.html', 
	'text!orion/banner/toolbar.html',
	'orion/util', 
	'orion/customGlobalCommands', 
	'orion/webui/SideMenu', 
	'orion/objects', 
	"orion/metrics"
], function (module, messages, widgetMessages, editMessages, require, commonHTML, KeyBinding, EventTarget, mCommands, mParameterCollectors, mExtensionCommands,
		lib, i18nUtil, mSplitter, mDropdown, mTooltip, mContentTypes, mKeyAssist, mThemePreferences, mThemeData, Deferred,
		mUserMenu, PageLinks, openResource, Banner, FooterTemplate, ToolbarTemplate, util, mCustomGlobalCommands, SideMenu, objects, mMetrics) {
	/**
	 * This class contains static utility methods. It is not intended to be instantiated.
	 *
	 * @class This class contains static utility methods for creating and managing global commands.
	 * @name orion.globalCommands
	 */

	var METRICS_MAXLENGTH = 256;

	var customGlobalCommands = {
		createMenuGenerator: mCustomGlobalCommands.createMenuGenerator || function (serviceRegistry, keyAssistFunction) {
			var userMenuPlaceholder = lib.node("userMenu"); //$NON-NLS-0$
			if (!userMenuPlaceholder) {
				return;
			}
			if (util.isElectron) {
				lib.$("span", lib.node("userTrigger")).className += " core-sprite-questionmark";
			}
			else {
				lib.$("span", lib.node("userTrigger")).className += " core-sprite-silhouette";
			}
			
			var optionsLabel = widgetMessages['Help'];
			var dropdownNode = lib.node("userDropdown"); //$NON-NLS-0$
			var userDropdown = new mDropdown.Dropdown({
				dropdown: dropdownNode,
				name: optionsLabel,
				selectionClass: "dropdownSelection" //$NON-NLS-0$
			});
			var menuGenerator = new mUserMenu.UserMenu({
				dropdownNode: dropdownNode,
				dropdown: userDropdown,
				serviceRegistry: serviceRegistry
			});
			var dropdownTrigger = lib.node("userTrigger"); //$NON-NLS-0$
			lib.setSafeAttribute(dropdownTrigger, "aria-label", optionsLabel);

			dropdownTrigger.tooltip = new mTooltip.Tooltip({
				node: dropdownTrigger,
				text: optionsLabel,
				position: ["below", "left"] //$NON-NLS-1$ //$NON-NLS-0$
			});

			/*
			 * To add user name call: setUserName(serviceRegistry, dropdownTrigger);
			 */
			menuGenerator.setKeyAssist(keyAssistFunction);

			return menuGenerator;
		},
		beforeGenerateRelatedLinks: mCustomGlobalCommands.beforeGenerateRelatedLinks || function (serviceRegistry, item, exclusions, commandRegistry, alternateItem) {
			return true;
		},
		// each relatedLink is { relatedLink: Object, command: Command, invocation: CommandInvocation }
		addRelatedLinkCommands: mCustomGlobalCommands.addRelatedLinkCommands || function (commandRegistry, relatedLinks, inactive, exclusions) {
			if (this.sideMenu) {
				this.sideMenu.setRelatedLinks(relatedLinks, exclusions);
			}
		},
		afterGenerateRelatedLinks: mCustomGlobalCommands.afterGenerateRelatedLinks || function (serviceRegistry, item, exclusions, commandRegistry, alternateItem) {},
		afterSetPageTarget: mCustomGlobalCommands.afterSetPageTarget || function (options) {},
		generateNavigationMenu: mCustomGlobalCommands.generateNavigationMenu || function (parentId, serviceRegistry, commandRegistry, prefsService, searcher, handler, /* optional */ editor) {
			var sideMenuParent = lib.node("sideMenu"); //$NON-NLS-0$
			if (sideMenuParent) {
				this.sideMenu = new SideMenu(sideMenuParent, lib.node("pageContent")); //$NON-NLS-0$
				var nav = lib.node('centralNavigation'); //$NON-NLS-0$
				if (nav) {
					new mTooltip.Tooltip({
						node: nav,
						text: messages["CentralNavTooltip"],
						position: ["right"] //$NON-NLS-0$
					});
					nav.addEventListener("click", this.sideMenu.toggle.bind(this.sideMenu));
				}

				var sideMenuToggle = lib.node("sideMenuToggle"); //$NON-NLS-0$
				if (sideMenuToggle) {
					sideMenuToggle.addEventListener("click", this.sideMenu.toggle.bind(this.sideMenu));
				}
			}
		},
		afterGenerateNavigationMenu: mCustomGlobalCommands.afterGenerateNavigationMenu || function (parentId, serviceRegistry, commandRegistry, prefsService, searcher, handler, /* optional */ editor) {
			// No-op
		},
		afterGenerateBanner: mCustomGlobalCommands.afterGenerateBanner || function (parentId, serviceRegistry, commandRegistry, prefsService, searcher, handler, /* optional */ editor) {}
	};

	var authenticationIds = [];
	var authRendered = {};

	function getLabel(authService, serviceReference) {
		return authService.getLabel ? authService.getLabel() : new Deferred().resolve(serviceReference.properties.name);
	}

	function startProgressService(serviceRegistry) {
		var progressPane = lib.node("progressPane"); //$NON-NLS-0$
		lib.setSafeAttribute(progressPane, "aria-label", messages['Operations']);
		var progressService = serviceRegistry.getService("orion.page.progress"); //$NON-NLS-0$
		if (progressService) {
			progressService.init.bind(progressService)("progressPane"); //$NON-NLS-0$
		}
	}

	/**
	 * Adds the user-related commands to the toolbar
	 *
	 * @name orion.globalCommands#generateUserInfo
	 * @function
	 */

	function generateUserInfo(serviceRegistry, keyAssistFunction, prefsService) {
		prefsService.get("/userMenu").then(function(prefs) {
			if (Boolean(prefs) && prefs.disabled === true) {
				var menu = lib.node("userMenu");
				if (Boolean(menu)) {
					menu.parentElement.removeChild(menu);
				}
				return;
			}
			var authServices = serviceRegistry.getServiceReferences("orion.core.auth"); //$NON-NLS-0$
			authenticationIds = [];

			var menuGenerator = customGlobalCommands.createMenuGenerator.call(this, serviceRegistry, keyAssistFunction, prefsService);

			if (!menuGenerator) { return; }

			for (var i = 0; i < authServices.length; i++) {
				var servicePtr = authServices[i];
				var authService = serviceRegistry.getService(servicePtr);
				getLabel(authService, servicePtr).then(function (label) {
					authService.getKey().then(function (key) {
						authenticationIds.push(key);
						authService.getUser().then(function (jsonData) {
							menuGenerator.addUserItem(key, authService, label, jsonData);
						}, function (errorData, jsonData) {
							menuGenerator.addUserItem(key, authService, label, jsonData);
						});
						window.addEventListener("storage", function (e) {
							if (authRendered[key] === util.readSetting(key)) {
								return;
							}

							authRendered[key] = util.readSetting(key);

							authService.getUser().then(function (jsonData) {
								menuGenerator.addUserItem(key, authService, label, jsonData);
							}, function (errorData) {
								menuGenerator.addUserItem(key, authService, label);
							});
						}, false);
					});
				});
			}
		});
	}

	// Related links menu management. The related menu is reused as content changes. If the menu becomes empty, we hide the dropdown.
	var pageItem;
	var exclusions = [];
	var title;

	/**
	 * Adds the related links to the banner
	 *
	 * @name orion.globalCommands#generateRelatedLinks
	 * @function
	 */
	function generateRelatedLinks(serviceRegistry, item, exclusions, commandRegistry, alternateItem) {
		var globalArguments = arguments;
		var contentTypesCache;

		function getContentTypes() {
			if (contentTypesCache) {
				return contentTypesCache;
			}
			var contentTypeService = serviceRegistry.getService("orion.core.contentTypeRegistry"); //$NON-NLS-0$
			// TODO Shouldn't really be making service selection decisions at this level. See bug 337740
			if (!contentTypeService) {
				contentTypeService = new mContentTypes.ContentTypeRegistry(serviceRegistry);
				contentTypeService = serviceRegistry.getService("orion.core.contentTypeRegistry"); //$NON-NLS-0$
			}
			return contentTypeService.getContentTypes().then(function (ct) {
				contentTypesCache = ct;
				return contentTypesCache;
			});
		}
		function getServiceProperties(serviceReference) {
			var info = {}, keys = serviceReference.getPropertyKeys(), key;
			for (var i=0; i < keys.length; i++) {
				key = keys[i];
				info[key] = serviceReference.getProperty(key);
			}
			return info;
		}
		function getNavCommandRef(navCommandsRefs, id) {
			var commandRef = null;
			navCommandsRefs.some(function(ref) {
				if (id === ref.getProperty("id")) { //$NON-NLS-0$
					return !!(commandRef = ref);
				}
				return false;
			});
			return commandRef;
		}
		var alternateItemDeferred;
		/**
		 * Creates a CommandInvocation for given commandItem.
		 * @returns {orion.Promise} A promise resolving to: commandItem with its "invocation" field set, or undefined if we failed
		 */
		function setInvocation(commandItem) {
			var command = commandItem.command;
			if (!command.visibleWhen || command.visibleWhen(item)) {
				commandItem.invocation = new mCommands.CommandInvocation(item, item, null, command, commandRegistry);
				return new Deferred().resolve(commandItem);
			} else if (typeof alternateItem === "function") {
				if (!alternateItemDeferred) {
					alternateItemDeferred = alternateItem();
				}
				return Deferred.when(alternateItemDeferred, function (newItem) {
					if (newItem && (item === pageItem)) {
						// there is an alternate, and it still applies to the current page target
						if (!command.visibleWhen || command.visibleWhen(newItem)) {
							commandItem.invocation = new mCommands.CommandInvocation(newItem, newItem, null, command, commandRegistry);
							return commandItem;
						}
					}
				});
			}
			return new Deferred().resolve();
		}
		/**
		 * @returns {orion.Promise} resolving to a commandItem { relatedLink: Object, command: Command}
		*/
		function commandItem(relatedLink, commandOptionsPromise, command) {
			if (command) {
				return new Deferred().resolve({ relatedLink: relatedLink, command: command});
			}
			return commandOptionsPromise.then(function(commandOptions) {
				return { relatedLink: relatedLink, command: new mCommands.Command(commandOptions) };
			});
		}

		var contributedLinks = serviceRegistry && serviceRegistry.getServiceReferences("orion.page.link.related"); //$NON-NLS-0$
		if (!contributedLinks || contributedLinks.length === 0) {
			return;
		}

		var thisGlobalCommands = this;
		Deferred.when(getContentTypes(), function () {
			if (!customGlobalCommands.beforeGenerateRelatedLinks.apply(thisGlobalCommands, globalArguments)) {
				return;
			}

			// assemble the related links.
			var navCommands = serviceRegistry.getServiceReferences("orion.navigate.command"); //$NON-NLS-0$
			var deferredCommandItems = [];
			contributedLinks.forEach(function(contribution) {
				var info = getServiceProperties(contribution);
				if (!info.id) {
					return; // skip
				}
				// First see if we have a uriTemplate and name, which is enough to build a command internally.
				var commandOptionsPromise;
				if (((info.nls && info.nameKey) || info.name) && info.uriTemplate) {
					commandOptionsPromise = mExtensionCommands._createCommandOptions(info, contribution, serviceRegistry, contentTypesCache, true);
					deferredCommandItems.push(commandItem(info, commandOptionsPromise, null));
					return;
				}
				// Otherwise, check if this related link references an orion.navigate.command contribution
				var navRef = getNavCommandRef(navCommands, info.id);
				if (!navRef)
					return; // skip: no nav command

				// Build relatedLink info by merging the 2 contributions. info has "id", "category"; navInfo has everything else
				var navInfo = getServiceProperties(navRef), relatedLink = {};
				objects.mixin(relatedLink, navInfo, info); // {} <- navInfo <- info
				var command;
				if ((command = commandRegistry.findCommand(info.id))) {
					// A Command exists already, use it
					deferredCommandItems.push(commandItem(relatedLink, null, command));
				} else {
					// Create a new Command for the nav contribution
					commandOptionsPromise = mExtensionCommands._createCommandOptions(navInfo, navRef, serviceRegistry, contentTypesCache, true);
					deferredCommandItems.push(commandItem(relatedLink, commandOptionsPromise, null));
				}
			});

			function continueOnError(error) {
				return error;
			}

			Deferred.all(deferredCommandItems, continueOnError).then(function(commandItems) {
				commandItems.sort(function(a, b) {
					return a.command.name.localeCompare(b.command.name);
				});
				return Deferred.all(commandItems.map(setInvocation), continueOnError).then(function(invoked) {
					var nonInvoked = [];
					// Filter out any holes caused by setInvocation() failing
					invoked = invoked.filter(function(item, i) {
						if (item) {
							return true;
						}
						nonInvoked.push(commandItems[i]);
						return false;
					});
					// Finally pass the relatedLinks data to customGlobalCommands
					customGlobalCommands.addRelatedLinkCommands.call(thisGlobalCommands, commandRegistry, invoked, nonInvoked, exclusions);
					customGlobalCommands.afterGenerateRelatedLinks.apply(thisGlobalCommands, globalArguments);
				});
			});
		});
	}

	function renderGlobalCommands(commandRegistry) {
		var globalTools = lib.node("globalActions"); //$NON-NLS-0$
		if (globalTools) {
			commandRegistry.destroy(globalTools);
			commandRegistry.renderCommands(globalTools.id, globalTools, {}, {}, "tool"); //$NON-NLS-0$
		}
	}

	/**
	 * Support for establishing a page item associated with global commands and related links
	 */
	function setPageCommandExclusions(excluded) {
		exclusions = excluded;
	}

	/**
	 * Set a dirty indicator for the page. An in-page indicator will always be set. If the document has a title (set via setPageTarget), then
	 * the title will also be updated with a dirty indicator.
	 */
	function setDirtyIndicator(isDirty) {
		if (title) {
			if (title.charAt(0) === '*' && !isDirty) {
				title = title.substring(1);
			}
			if (isDirty && title.charAt(0) !== '*') {
				title = '*' + title;
			}
			window.document.title = title;
		}
	}

	/**
	 * Set the target of the page so that common infrastructure (breadcrumbs, related menu, etc.) can be added for the page.
	 * @name orion.globalCommands#setPageTarget
	 * @function
	 *
	 * @param {Object} options The target options object.
	 * @param {String} options.task the name of the user task that the page represents.
	 * @param {Object} options.target the metadata describing the page resource target. Optional.
	 * @param {String} options.name the name of the resource that is showing on the page. Optional. If a target parameter is supplied, the
	 * target metadata name will be used if a name is not specified in the options.
	 * @param {String} options.title the title to be used for the page. Optional. If not specified, a title will be constructed using the task
	 * and/or name.
	 * @param {Function} options.makeAlternate a function that can supply alternate metadata for the related pages menu if the target does not
	 * validate against a contribution. Optional.
	 * Optional. If not specified, and if a target is specified, the breadcrumb link will refer to the Navigator.
	 * @param {orion.serviceregistry.ServiceRegistry} options.serviceRegistry the registry to use for obtaining any unspecified services. Optional. If not specified, then
	 * any banner elements requiring Orion services will not be provided.
	 * @param {orion.commandregistry.CommandRegistry} options.commandService the commandService used for accessing related page commands. Optional. If not specified, a
	 * related page menu will not be shown.
	 * @param {orion.searchClient.Searcher} options.searchService the searchService used for scoping the searchbox. Optional. If not specified, the searchbox will
	 * not be scoped.
	 * @param {orion.fileClient.FileClient} options.fileService the fileService used for retrieving additional metadata and managing the breadcrumb for multiple
	 * file services. If not specified, there may be reduced support for multiple file implementations.
	 */
	function setPageTarget(options) {
		var pageName;
		var serviceRegistry = options.serviceRegistry;
		if (options.target) { // we have metadata
			if (options.searchService) {
				options.searchService.setLocationByMetaData(options.target, {index: "last"});
			}
			pageName = options.name || options.target.Name;
			pageItem = options.target;
			generateRelatedLinks.call(this, serviceRegistry, options.target, exclusions, options.commandService, options.makeAlternate);
		} else {
			pageName = options.name;
			generateRelatedLinks.call(this, serviceRegistry, {NoTarget: ""}, exclusions, options.commandService, options.makeAlternate);
		}
		title = options.title;
		if (!title) {
			if (pageName) {
				title = i18nUtil.formatMessage(messages["PageTitleFormat"], pageName, options.task);
			} else {
				title = options.task;
			}
		}
		window.document.title = title;
		customGlobalCommands.afterSetPageTarget.apply(this, arguments);
	}

	function boundingNode(node) {
		var style = window.getComputedStyle(node, null);
		if (style === null) {
			return node;
		}
		var position = style.getPropertyValue("position"); //$NON-NLS-0$
		if (position === "absolute" || !node.parentNode || node === document.body) {
			return node;
		}
		return boundingNode(node.parentNode);
	}

	function getToolbarElements(toolNode) {
		var elements = {};
		var toolbarNode = null;
		if (typeof toolNode === "string") {
			toolNode = lib.node(toolNode);
		}
		// no reference node has been given, so use the main toolbar.
		if (!toolNode) {
			toolNode = lib.node("pageActions"); //$NON-NLS-0$
		}
		var node = toolNode;
		// the trickiest part is finding where to start looking (section or main toolbar).
		// We need to walk up until we find a "toolComposite"
		while (node && node.classList) {
			if (node.classList.contains("toolComposite")) { //$NON-NLS-0$
				toolbarNode = node;
				break;
			}
			node = node.parentNode;
		}
		if (toolNode.classList.contains("commandMarker")) { //$NON-NLS-0$
			elements.commandNode = toolNode;
		}
		if (!toolbarNode) {
			toolbarNode = lib.node("pageToolbar"); //$NON-NLS-0$
		}
		if (toolbarNode) {
			elements.slideContainer = lib.$(".slideParameters", toolbarNode); //$NON-NLS-0$
			elements.parameterArea = lib.$(".parameters", toolbarNode); //$NON-NLS-0$
			elements.dismissArea = lib.$(".parametersDismiss", toolbarNode); //$NON-NLS-0$
			elements.notifications = lib.$("#notificationArea", toolbarNode); //$NON-NLS-0$
			if (toolbarNode.parentNode) {
				elements.toolbarTarget = lib.$(".toolbarTarget", toolbarNode.parentNode); //$NON-NLS-0$
				if (elements.toolbarTarget) {
					var bounds = lib.bounds(elements.toolbarTarget);
					var parentBounds = lib.bounds(boundingNode(elements.toolbarTarget.parentNode));
					elements.toolbarTargetY = bounds.top - parentBounds.top;
					elements.toolbar = toolbarNode;
				}
			}
		}
		return elements;
	}

	function layoutToolbarElements(elements) {
		var slideContainer = elements.slideContainer;
		if (slideContainer) {
			slideContainer.style.left = "";
			slideContainer.style.top = "";
			if (slideContainer.classList.contains("slideContainerActive")) { //$NON-NLS-0$
				var bounds = lib.bounds(slideContainer);
				var parentBounds = lib.bounds(slideContainer.parentNode);
				slideContainer.style.left = ((parentBounds.width - bounds.width) / 2) + "px"; //$NON-NLS-0$
				slideContainer.style.top = "0"; //$NON-NLS-0$
			}
		}
	}

	var mainSplitter = null;

	function getMainSplitter() {
		return mainSplitter;
	}

	var keyAssist = null;
	function getKeyAssist() {
		return keyAssist;
	}

	var globalEventTarget = new EventTarget();
	function getGlobalEventTarget() {
		return globalEventTarget;
	}

	/**
	 * Generates the banner at the top of a page.
	 *
	 * @name orion.globalCommands#generateBanner
	 * @function
	 *
	 * @param parentId
	 * @param serviceRegistry
	 * @param commandRegistry
	 * @param prefsService
	 * @param searcher
	 * @param handler
	 * @param editor - no longer used
	 * @param {Boolean} closeSplitter true to make the splitter's initial state "closed".
	 */
	function generateBanner(parentId, serviceRegistry, commandRegistry, prefsService, searcher, handler, /* optional */ editor, closeSplitter, fileClient) {
		serviceRegistry.registerService("orion.metrics", {
			/** @callback */
			logEvent: function(category, action, label, value) {
			},
			logTiming: function(timingCategory, timingVar, timingValue, timingLabel) {
				if (timingCategory === "page" && timingVar === "complete") {
					var pageLoader = require.defined("orion/splash") && require("orion/splash").getPageLoader();
					if (pageLoader) pageLoader.takeDown();
				}
				if (util.readSetting("consoleMetrics")) {
					window.console.log(timingCategory + " " + timingVar + " " + timingValue + " " + timingLabel);
				}
			},
			/** @callback */
			pageLoad: function(href, page, title, args) {
			}
		}, {});
		var metrics = new mMetrics.Metrics(serviceRegistry);
		prefsService.addChangeListener(function(name, value) {
			if (value.length < METRICS_MAXLENGTH && name.indexOf("/git/credentials/") !== 0) { //$NON-NLS-0$
				metrics.logEvent("preferenceChange", name, value); //$NON-NLS-0$
			}
		});
		window.addEventListener("error", function(e) {
			var index = e.filename.lastIndexOf("/");
			var filename = e.filename.substring(index + 1);
			if (filename) {
				var errorString = e.message + " (" + filename + ": " + e.lineno + (e.colno ? ", " + e.colno : "") + ")"; //$NON-NLS-3$ //$NON-NLS-2$ //$NON-NLS-1$ //$NON-NLS-0$
				metrics.logEvent("runtime", "uncaughtError", errorString); //$NON-NLS-1$ //$NON-NLS-0$
			} else {
				errorString = e.message + " (" + e.filename + ": " + e.lineno + (e.colno ? ", " + e.colno : "") + ")"; //$NON-NLS-3$ //$NON-NLS-2$ //$NON-NLS-1$ //$NON-NLS-0$
				metrics.logEvent("runtime", "uncaughtErrorUnknownFile", errorString); //$NON-NLS-1$ //$NON-NLS-0$
			}

			if (e.error) {
				var stackString = e.error.stack.replace(new RegExp(window.location.origin, "g"), "");
				metrics.logEvent("runtime", "uncaughtErrorStack", stackString); //$NON-NLS-1$ //$NON-NLS-0$
			}
		});

		var themeVal = util.readSetting("pageTheme");
		if (themeVal && typeof themeVal === "string" || themeVal instanceof String && themeVal.length > 0) {
			themeVal.split(" ").forEach(function(clazz) {
				if (!document.body.classList.contains(clazz)) {
					document.body.classList.add(clazz);
				}
			});
		}
		
		// forward the preference service on to the command registry
		commandRegistry.setServiceRegistry(serviceRegistry);

		new mThemePreferences.ThemePreferences(prefsService, new mThemeData.ThemeData(serviceRegistry)).apply();

		var parent = lib.node(parentId);

		if (!parent) {
			throw i18nUtil.formatMessage("could not find banner parent, id was ${0}", parentId);
		}
		// place the HTML fragment for the header.
		new Banner().create(parent);
		
		// TODO not entirely happy with this. Dynamic behavior that couldn't be in the html template, maybe it could be
		// dynamically bound in a better way like we do with NLS strings
		var home = lib.node("home"); //$NON-NLS-0$
		if (home) {
			home.href = require.toUrl("edit/edit.html"); //$NON-NLS-0$
			lib.setSafeAttribute(home, "aria-label", messages['Orion Home']);
		}

		var toolbar = lib.node("pageToolbar"); //$NON-NLS-0$
		if (toolbar) {
			lib.setSafeAttribute(toolbar, "aria-label", messages.toolbar);
			toolbar.classList.add("toolbarLayout"); //$NON-NLS-0$
			lib.setSafeInnerHTML(toolbar, ToolbarTemplate + commonHTML.slideoutHTMLFragment("mainToolbar"));
		}
		var closeNotification = lib.node("closeNotifications"); //$NON-NLS-0$
		if (closeNotification) {
			lib.setSafeAttribute(closeNotification, "aria-label", messages['Close notification']);
		}

		//Hack for FF17 Bug#415176
		if (util.isFirefox <= 17) {
			var staticBanner = lib.node("staticBanner"); //$NON-NLS-0$
			if (staticBanner) {
				staticBanner.style.width = "100%"; //$NON-NLS-0$
				staticBanner.style.MozBoxSizing = "border-box"; //$NON-NLS-0$
			}
		}

		var footer = lib.node("footer"); //$NON-NLS-0$
		if (footer && FooterTemplate) {
			lib.setSafeInnerHTML(footer, FooterTemplate);
			// do the i18n string substitutions
			var config = module.config && module.config() || {};
			if (config.ShutdownDate) {
				messages.ShutdownWarning = i18nUtil.formatMessage(messages.ShutdownWarning, config.ShutdownDate);
			} else {
				messages.ShutdownWarning = " ";
			}
			lib.processTextNodes(footer, messages);
			var sideMenuNode = lib.node("sideMenu"); //$NON-NLS-0$
			if (sideMenuNode) {
				sideMenuNode.classList.add("content-fixedHeight-withFooter");
			}
			var content = lib.$(".content-fixedHeight"); //$NON-NLS-0$
			if (content) {
				content.classList.add("content-fixedHeight-withFooter");
			}
			footer.classList.add("footer-visible");
		}

		// Set up a custom parameter collector that slides out of adjacent tool areas.
		commandRegistry.setParameterCollector(new mParameterCollectors.CommandParameterCollector(getToolbarElements, layoutToolbarElements));

		document.addEventListener("keydown", function (e) {
			if (e.keyCode === lib.KEY.ESCAPE) {
				var statusService = serviceRegistry.getService("orion.page.message"); //$NON-NLS-0$
				if (statusService) {
					statusService.setProgressMessage("");
				}
			}
		}, false);

		customGlobalCommands.generateNavigationMenu.apply(this, arguments);
		customGlobalCommands.afterGenerateNavigationMenu.apply(this, arguments);

		// generate primary nav links.
		var categoriesPromise = PageLinks.getCategoriesInfo(serviceRegistry);
		var pageLinksPromise = PageLinks.getPageLinksInfo(serviceRegistry, "orion.page.link");
		Deferred.all([ categoriesPromise, pageLinksPromise ]).then(function(results) {
			if (this.sideMenu) {
				var categoriesInfo = results[0], pageLinksInfo = results[1];
				this.sideMenu.setCategories(categoriesInfo);
				this.sideMenu.setPageLinks(pageLinksInfo);

				// Now we have enough to show the sidemenu with its close-to-final layout
				this.sideMenu.render();
			}
		}.bind(this));

		// hook up split behavior - the splitter widget and the associated global command/key bindings.
		var splitNode = lib.$(".split"); //$NON-NLS-0$
		if (splitNode) {
			var side = lib.$(".sidePanelLayout"); //$NON-NLS-0$
			var main = lib.$(".mainPanelLayout"); //$NON-NLS-0$
			if (side && main) {
				mainSplitter = {
					side: side,
					main: main
				};
				mainSplitter.splitter = new mSplitter.Splitter({
					node: splitNode,
					sidePanel: side,
					mainPanel: main,
					toggle: true,
					closeByDefault: closeSplitter
				});
				var toggleSidePanelCommand = new mCommands.Command({
					name: messages["Toggle Side Panel"],
					tooltip: messages["Open or close the side panel"],
					id: "orion.toggleSidePane", //$NON-NLS-0$
					callback: function () {
						mainSplitter.splitter.toggleSidePanel();
					}
				});
				commandRegistry.addCommand(toggleSidePanelCommand);
				commandRegistry.registerCommandContribution("pageActions", "orion.toggleSidePane", 1, null, true, new KeyBinding.KeyBinding('l', util.isMac ? false : true, true, false, util.isMac ? true : false)); //$NON-NLS-2$ //$NON-NLS-1$ //$NON-NLS-0$
			}
		}

		// Assemble global commands, those that could be available from any page due to header content or common key bindings.

		// open resource
		var showingResourceDialog = false;
		var openResourceDialog = function (searcher, serviceRegistry, commandRegistry) {
			if (showingResourceDialog) {
				return;
			}
			var progress = serviceRegistry.getService("orion.page.progress"); //$NON-NLS-0$
			var prefs = serviceRegistry.getService("orion.core.preference"); //$NON-NLS-0$
			var dialog = new openResource.OpenResourceDialog({
				searcher: searcher,
				progress: progress,
				prefService: prefs,
				serviceRegistry: serviceRegistry,
				commandRegistry: commandRegistry,
				searchRenderer: searcher.defaultRenderer,
				onHide: function () {
					showingResourceDialog = false;
				}
			});
			window.setTimeout(function () {
				showingResourceDialog = true;
				dialog.show();
			}, 0);
		};

		var openResourceCommand = new mCommands.Command({
			name: messages["FindFile"],
			tooltip: messages["ChooseFileOpenEditor"],
			id: "orion.openResource", //$NON-NLS-0$
			callback: function (data) {
				openResourceDialog(searcher, serviceRegistry, commandRegistry);
			}
		});

		commandRegistry.addCommand(openResourceCommand);
		commandRegistry.registerCommandContribution("globalActions", "orion.openResource", 100, null, true, new KeyBinding.KeyBinding('f', true, true)); //$NON-NLS-2$ //$NON-NLS-1$ //$NON-NLS-0$
		var noBanner = false;
		var toggleBannerFunc = function () {
			if (noBanner) {
				return false;
			}
			var header = lib.node("banner"); //$NON-NLS-0$
			var footer = lib.node("footer"); //$NON-NLS-0$
			var sideMenuNode = lib.node("sideMenu"); //$NON-NLS-0$
			var content = lib.$(".content-fixedHeight"); //$NON-NLS-0$
			var maximized = header.classList.contains("banner-maximized"); //$NON-NLS-0$
			if (maximized) {
				header.classList.remove("banner-maximized"); //$NON-NLS-0$
				footer.classList.remove("footer-maximized"); //$NON-NLS-0$
				content.classList.remove("content-fixedHeight-maximized"); //$NON-NLS-0$
				if (sideMenuNode) {
					sideMenuNode.classList.remove("sideMenu-maximized"); //$NON-NLS-0$
				}
			} else {
				header.classList.add("banner-maximized"); //$NON-NLS-0$
				footer.classList.add("footer-maximized"); //$NON-NLS-0$
				content.classList.add("content-fixedHeight-maximized"); //$NON-NLS-0$
				if (sideMenuNode) {
					sideMenuNode.classList.add("sideMenu-maximized"); //$NON-NLS-0$
				}
			}
			getGlobalEventTarget().dispatchEvent({type: "toggleTrim", maximized: !maximized}); //$NON-NLS-0$
			return true;
		};


		var noTrim = window.orionNoTrim || util.readSetting("orionNoTrim") || false;
		if (noTrim) {
			toggleBannerFunc();
			noBanner = true;
			if (noTrim !== "bannerOnly") this.sideMenu.hide();
		} else {
			// Toggle trim command
			var toggleBanner = new mCommands.Command({
				name: messages["Toggle Banner and Footer"],
				tooltip: messages["HideShowBannerFooter"],
				id: "orion.toggleTrim", //$NON-NLS-0$
				callback: toggleBannerFunc
			});
			commandRegistry.addCommand(toggleBanner);
			commandRegistry.registerCommandContribution("globalActions", "orion.toggleTrim", 100, null, true, new KeyBinding.KeyBinding("m", true, true)); //$NON-NLS-2$ //$NON-NLS-1$ //$NON-NLS-0$

			// Open configuration page, Ctrl+Shift+F1
			var configDetailsCommand = new mCommands.Command({
				name: messages["System Configuration Details"],
				tooltip: messages["System Config Tooltip"],
				id: "orion.configDetailsPage", //$NON-NLS-0$
				hrefCallback: function () {
					return require.toUrl("about/about.html"); //$NON-NLS-0$
				}
			});

			commandRegistry.addCommand(configDetailsCommand);
			commandRegistry.registerCommandContribution("globalActions", "orion.configDetailsPage", 100, null, true, new KeyBinding.KeyBinding(112, true, true, true)); //$NON-NLS-2$ //$NON-NLS-1$ //$NON-NLS-0$

			// Background Operations Page, Ctrl+Shift+O
			var operationsCommand = new mCommands.Command({
				name: messages["Background Operations"],
				tooltip: messages["Background Operations Tooltip"],
				id: "orion.backgroundOperations", //$NON-NLS-0$
				hrefCallback: function () {
					return require.toUrl("operations/list.html"); //$NON-NLS-0$
				}
			});

			commandRegistry.addCommand(operationsCommand);
			commandRegistry.registerCommandContribution("globalActions", "orion.backgroundOperations", 100, null, true, new KeyBinding.KeyBinding('o', true, true)); //$NON-NLS-2$ //$NON-NLS-1$ //$NON-NLS-0$

			var showTooltipCommand = new mCommands.Command({
				name: editMessages.showTooltip,
				tooltip: editMessages.showTooltipTooltip,
				id: "orion.edit.showTooltip", //$NON-NLS-0$
				visibleWhen: /** @callback */ function(items, data) {
					return true;
				},
				callback: function() {
					var domFocus = document.activeElement, label, tooltip;
					if (this.editor && this.editor._domNode.contains(domFocus)) {
						var editor = this.editor;
						tooltip = editor.getTooltip();
						var tv = editor.getTextView();
						var offset = tv.getCaretOffset();
						var pos = tv.getLocationAtOffset(offset);
						tooltip.show({
							x: pos.x,
							y: pos.y,
							getTooltipInfo: function() {
								return editor._getTooltipInfo(this.x, this.y);
							}
						}, false, true);
					} else if (domFocus.commandTooltip || domFocus.tooltip) {
						tooltip = domFocus.commandTooltip ? domFocus.commandTooltip : domFocus.tooltip;
						tooltip._showByKB = true;
						tooltip.show(0);
					} else if (domFocus.id && (label = document.querySelector("label[for=" + domFocus.id.replace(/./g, "\\.") + "]")) && label.tooltip) {
						tooltip = label.tooltip;
						tooltip._showByKB = true;
						tooltip.show(0);
					}
				}
			});
			commandRegistry.addCommand(showTooltipCommand);
			commandRegistry.registerCommandContribution("globalActions" , "orion.edit.showTooltip", 1, null, true, new KeyBinding.KeyBinding(112, false, true), null, this);//$NON-NLS-1$

			var focusNextSplitter = new mCommands.Command({
				name: messages.nextSplitter,
				tooltip: messages.nextSplitterTooltip,
				id: "orion.focusSplitter", //$NON-NLS-0$
				visibleWhen: /** @callback */ function(items, data) {
					return true;
				},
				callback: function() {
					var curFocus = document.activeElement;
					
					var items = lib.$$array(".split", document.body, true); //$NON-NLS-0$
					if (items.length > 0) {
						var theSplitter = items[0];
						
						// Filter out invisible splitters
						for (var j = 0; j < items.length; j++) {
							if (!items[j].offsetParent) {
								items.slice(items[j], 1);
							}
						}
							
						for (var i = 0; i < items.length; i++) {
							var splitter = items[i];
							// If a splitter is the current focus then we choose the next one..
							if (splitter === curFocus) {
								if (i < items.length-1) {
									theSplitter = items[i+1];
									break;
								}
							}
						}
						
						theSplitter.tabIndex = "0"; // Allow the splitter to take focus
						theSplitter.focus();
					}
				}
			});
			commandRegistry.addCommand(focusNextSplitter);
			commandRegistry.registerCommandContribution("globalActions" , "orion.focusSplitter", 1, null, true, new KeyBinding.KeyBinding(190, true, true), null, this);//$NON-NLS-1$

			// Key assist
			keyAssist = new mKeyAssist.KeyAssistPanel({
				commandRegistry: commandRegistry
			});
			var keyAssistCommand = mKeyAssist.createCommand(keyAssist, "globalActions", commandRegistry);

			renderGlobalCommands(commandRegistry);

			generateUserInfo(serviceRegistry, keyAssistCommand.callback, prefsService);
		}


		// now that footer containing progress pane is added
		startProgressService(serviceRegistry);

		// check for commands in the hash
		window.addEventListener("hashchange", function () {
			commandRegistry.processURL(window.location.href);
		}, false);
		
	    // System Editor
		if (util.isElectron) {
			serviceRegistry.registerService("orion.navigate.command", {
				run: function(item) {
					prefsService.get("/workspace").then(function(prefs) {
						var workspaceDir = prefs.currentWorkspace.replace(/\\/g, "/");
						window.__electron.shell.openItem(workspaceDir+item[0].Location.slice(5)); // slice off '/file'
					});
				}
			}, {
				name: messages["Orion System Editor"],
				id: "orion.system.editor",
				tooltip: messages["System Editor Tooltip"]
			});
		}

		return customGlobalCommands.afterGenerateBanner.apply(this, arguments);
	}

	// return the module exports
	return {
		generateBanner: generateBanner,
		getToolbarElements: getToolbarElements,
		getMainSplitter: getMainSplitter,
		getKeyAssist: getKeyAssist,
		getGlobalEventTarget: getGlobalEventTarget,
		layoutToolbarElements: layoutToolbarElements,
		setPageTarget: setPageTarget,
		setDirtyIndicator: setDirtyIndicator,
		setPageCommandExclusions: setPageCommandExclusions
	};
});
