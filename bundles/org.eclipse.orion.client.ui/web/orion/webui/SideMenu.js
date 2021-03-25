/*******************************************************************************
 * @license
 * Copyright (c) 2014, 2019 IBM Corporation and others.
 * All rights reserved. This program and the accompanying materials are made 
 * available under the terms of the Eclipse Public License 2.0 
 * (http://www.eclipse.org/legal/epl-v10.html), and the Eclipse Distribution 
 * License v1.0 (http://www.eclipse.org/org/documents/edl-v10.html). 
 * 
 * Contributors: Anton McConville - IBM Corporation - initial API and implementation
 ******************************************************************************/
/*eslint-env browser, amd*/
/*global URL*/
define([
	'i18n!orion/nls/messages', 
	'orion/webui/littlelib', 
	'orion/PageUtil', 
	'orion/webui/tooltip', 
	'orion/util', 
	'orion/URL-shim'
], function(messages, lib, PageUtil, mTooltip, util) {

	var LOCAL_STORAGE_NAME = "sideMenuNavigation";
	var OPEN_STATE = "open";
	var CLOSED_STATE = "closed";
	var DEFAULT_STATE = OPEN_STATE;
	var TRANSITION_DURATION_MS = 301; /* this should always be greater than the duration of the left transition of .content-fixedHeight */

	function SideMenu(parentNode, contentNode) {
		this._parentNode = lib.node(parentNode);
		if (!this._parentNode) {
			throw new Error("Missing parentNode"); //$NON-NLS-0$
		}
		this._contentNode = lib.node(contentNode);

		this._categoryInfos = [];
		this._categorizedPageLinks = {};
		this._categorizedRelatedLinks = {};

		this._categorizedAnchors = null;
		this._state = util.readSetting(LOCAL_STORAGE_NAME) || DEFAULT_STATE;
		this._currentCategory = "";
		this._notificationTimeout = null;
		this._renderTimeout = null;
	}

	SideMenu.prototype = {
		constructor: SideMenu.prototype.constructor,
		// Should only be called once
		setCategories: function(categories) {
			this._categoryInfos = categories.getCategoryIDs().map(function(catId) {
				return categories.getCategory(catId);
			}).sort(function(c1, c2) {
				var o1 = c1.order || 100;
				var o2 = c2.order || 100;
				if (o1 < o2) {
					return -1;
				} else if (o2 < o1) {
					return 1;
				}
				return c1.textContent.localeCompare(c2.textContent);
			});
		},
		// Should only be called once
		setPageLinks: function(pageLinks) {
			this._categorizedPageLinks = {};
			pageLinks.getAllLinks().forEach(function(link) {
				var category = link.category;
				this._categorizedPageLinks[category] = this._categorizedPageLinks[category] || [];
				this._categorizedPageLinks[category].push({
					title: link.textContent,
					order: link.order || 100,
					href: link.href
				});
			}, this);
		},
		/**
		 * Called whenever the page target changes.
		 * @param {Object} relatedLinks
		 * @param {String[]} exclusions List of related link IDs that the page has requested to not be shown.
		 */
		setRelatedLinks: function(relatedLinks, exclusions) {
			this._categorizedRelatedLinks = {};
			relatedLinks.forEach(function(info) {
				var relatedLink = info.relatedLink;
				var command = info.command;
				var invocation = info.invocation;
				if (!exclusions || exclusions.indexOf(relatedLink.id) === -1) {
					var category = relatedLink.category;
					this._categorizedRelatedLinks[category] = this._categorizedRelatedLinks[category] || [];
					this._categorizedRelatedLinks[category].push({
						title: command.name,
						order: relatedLink.order || 100,
						href: command.hrefCallback.call(invocation.handler, invocation)
					});
				}
			}, this);
			this._updateCategoryAnchors();
			this._updateCategoryNotifications();
		},
		// Should only be called once
		render: function() {
			if (this._categorizedAnchors === null) {
				this._categorizedAnchors = {};
				var pageURL = new URL(window.location.href);
				pageURL.hash = "";

				this._currentCategory = "";
				Object.keys(this._categorizedPageLinks).some(function(category) {
					var links = this._categorizedPageLinks[category];
					if (links.some(function(link) {
						var linkURL = new URL(link.href);
						link.hash = "";
						return pageURL.pathname === linkURL.pathname;
					})) {
						this._currentCategory = category;
						return true;
					}
				}, this);
				
				var sideMenuHome = document.createElement("div"); //$NON-NLS-0$
				sideMenuHome.classList.add("sideMenuHome"); //$NON-NLS-0$
				this._sideMenuHome = sideMenuHome;
				
				var sideMenuList = document.createElement("ul"); //$NON-NLS-0$
				sideMenuList.classList.add("sideMenuList"); //$NON-NLS-0$
				this._sideMenuList = sideMenuList;

				this._categoryInfos.forEach(function(categoryInfo) {
					var listItem = document.createElement('li'); //$NON-NLS-0$
					listItem.classList.add("sideMenuItem"); //$NON-NLS-0$
					listItem.classList.add("sideMenu-notification"); //$NON-NLS-0$
					if (this._currentCategory === categoryInfo.id) {
						listItem.classList.add("sideMenuItemActive");
					}
					listItem.categoryId = categoryInfo.id;
					listItem.categoryName = categoryInfo.textContent || categoryInfo.id;
					var anchor = document.createElement("a"); //$NON-NLS-0$
					anchor.classList.add("submenu-trigger"); // styling
					if (typeof categoryInfo.imageDataURI === "string" && categoryInfo.imageDataURI.indexOf("data:image") === 0) {
						var img = document.createElement("img");
						img.width = "16";
						img.height = "16";
						img.src = categoryInfo.imageDataURI;
						anchor.appendChild(img);
					} else {
						var imageClass = categoryInfo.imageClass || "core-sprite-blank-menu-item";
						anchor.classList.add(imageClass);
					}
					listItem.appendChild(anchor);
					sideMenuList.appendChild(listItem);
					lib.setSafeAttribute(anchor, "aria-label", listItem.categoryName);
					if (this._currentCategory === categoryInfo.id) {
						lib.setSafeAttribute(anchor, "aria-current", "page");
					}
					anchor.commandTooltip = new mTooltip.Tooltip({
						node: anchor,
						text: listItem.categoryName,
						position: ["right", "above", "below", "left"] //$NON-NLS-3$ //$NON-NLS-2$ //$NON-NLS-1$ //$NON-NLS-0$
					});
					this._categorizedAnchors[categoryInfo.id] = anchor;
				}, this);
				
				// create top scroll button
				this._topScrollButton = document.createElement("button"); //$NON-NLS-0$
				this._topScrollButton.classList.add("sideMenuScrollButton"); //$NON-NLS-0$
				this._topScrollButton.classList.add("sideMenuTopScrollButton"); //$NON-NLS-0$
				this._topScrollButton.classList.add("core-sprite-openarrow"); //$NON-NLS-0$
				lib.setSafeAttribute(this._topScrollButton, "aria-label", messages["Up"]);
				this._topScrollButton.tabIndex = -1;
								
				this._topScrollButton.addEventListener("mousedown", function(){ //$NON-NLS-0$
					if (this._activeScrollInterval) {
						window.clearInterval(this._activeScrollInterval);
					}
					this._activeScrollInterval = window.setInterval(this._scrollUp.bind(this), 10);
				}.bind(this));
				this._topScrollButton.addEventListener("mouseup", function(){ //$NON-NLS-0$
					if (this._activeScrollInterval) {
						window.clearInterval(this._activeScrollInterval);
						this._activeScrollInterval = null;
					}
				}.bind(this));
				
				// create bottom scroll button
				this._bottomScrollButton = document.createElement("button"); //$NON-NLS-0$
				this._bottomScrollButton.classList.add("sideMenuScrollButton"); //$NON-NLS-0$
				this._bottomScrollButton.classList.add("sideMenuBottomScrollButton"); //$NON-NLS-0$
				this._bottomScrollButton.classList.add("core-sprite-openarrow"); //$NON-NLS-0$
				lib.setSafeAttribute(this._bottomScrollButton, "aria-label", messages["Down"]);
				this._bottomScrollButton.tabIndex = -1;
				
				this._bottomScrollButton.addEventListener("mousedown", function(){ //$NON-NLS-0$
					if (this._activeScrollInterval) {
						window.clearInterval(this._activeScrollInterval);
					}
					this._activeScrollInterval = window.setInterval(this._scrollDown.bind(this), 10);
				}.bind(this));
				this._bottomScrollButton.addEventListener("mouseup", function(){ //$NON-NLS-0$
					if (this._activeScrollInterval) {
						window.clearInterval(this._activeScrollInterval);
						this._activeScrollInterval = null;
					}
				}.bind(this));
				
				// add resize listener to window to update the scroll button visibility if necessary
				window.addEventListener("resize", function(){ //$NON-NLS-0$
					this._updateScrollButtonVisibility();
				}.bind(this));

				this._updateCategoryAnchors();
				this._show = function() {
					lib.setSafeAttribute(this._parentNode, "aria-label", messages.sidebar);
					this._parentNode.appendChild(sideMenuHome);
					this._parentNode.appendChild(this._topScrollButton);
					this._parentNode.appendChild(sideMenuList);
					this._parentNode.appendChild(this._bottomScrollButton);
					var activeLink = lib.$(".sideMenuItemActive", this._parentNode); //$NON-NLS-0$
					if (activeLink && activeLink.scrollIntoView) {
						activeLink.scrollIntoView();
					}
					this._updateScrollButtonVisibility();
					this._show = SideMenu.prototype._show;
				};				
				window.setTimeout(function() {
					this._show(); // this._show can be re-assigned
				}.bind(this), 1000); // we delay rendering to give a chance to set related links
			}

			if (this._state === CLOSED_STATE) {
				this._contentNode.classList.add("content-sideMenu-closed"); //$NON-NLS-0$
				if (this._renderTimeout) {
					window.clearTimeout(this._renderTimeout);
					this._renderTimeout = null;
				}
				this._renderTimeout = window.setTimeout(function() {
					this._parentNode.classList.add("sideMenu-closed"); //$NON-NLS-0$
					this._renderTimeout = null;
				}.bind(this), TRANSITION_DURATION_MS);
				this._parentNode.classList.add("animating"); //$NON-NLS-0$
			} else {
				if (this._renderTimeout) {
					window.clearTimeout(this._renderTimeout);
					this._renderTimeout = null;
				}
				this._parentNode.classList.remove("animating"); //$NON-NLS-0$
				this._parentNode.classList.remove("sideMenu-closed"); //$NON-NLS-0$
				this._contentNode.classList.remove("content-sideMenu-closed"); //$NON-NLS-0$
			}
		},
		_updateScrollButtonVisibility: function() {
			if (this._sideMenuList.scrollHeight > this._sideMenuList.offsetHeight) {
				if (0 < this._sideMenuList.scrollTop) {
					// show up arrow
					this._topScrollButton.classList.add("visible"); //$NON-NLS-0$
				} else {
					// hide up arrow
					this._topScrollButton.classList.remove("visible"); //$NON-NLS-0$
				}
				
				if (this._sideMenuList.scrollHeight > (this._sideMenuList.scrollTop + this._sideMenuList.offsetHeight)) {
					// show bottom arrow
					this._bottomScrollButton.classList.add("visible"); //$NON-NLS-0$
				} else {
					// hide bottom arrow
					this._bottomScrollButton.classList.remove("visible"); //$NON-NLS-0$
				}
			} else {
				// no overflow, hide both arrows
				this._topScrollButton.classList.remove("visible"); //$NON-NLS-0$
				this._bottomScrollButton.classList.remove("visible"); //$NON-NLS-0$
			}
		},
		_scrollDown: function(){
			this._sideMenuList.scrollTop = this._sideMenuList.scrollTop + 1;
			this._updateScrollButtonVisibility();
		},
		_scrollUp: function() {
			this._sideMenuList.scrollTop = this._sideMenuList.scrollTop - 1;
			this._updateScrollButtonVisibility();
		},
		hide: function() {
			util.saveSetting(LOCAL_STORAGE_NAME, CLOSED_STATE);
			this._parentNode.classList.add("sideMenu-closed"); //$NON-NLS-0$
			this._contentNode.classList.add("content-sideMenu-closed"); //$NON-NLS-0$
		},
		toggle: function() {
			// add animation if necessary
			var pageContent = this._contentNode;
			if (pageContent) {
				pageContent.classList.add("content-fixedHeight-animation"); //$NON-NLS-0$
			}

			if (this._state === OPEN_STATE) {
				this._state = CLOSED_STATE;
			} else {
				this._state = OPEN_STATE;
			}

			if (this._state === DEFAULT_STATE) {
				util.deleteSetting(LOCAL_STORAGE_NAME);
			} else {
				util.saveSetting(LOCAL_STORAGE_NAME, this._state);
			}
			this.render();
		},
		_updateCategoryAnchors: function() {			
			// treat *-scm and git categories as singleton if a related link exists
			var scmInScope = [];
			Object.keys(this._categorizedRelatedLinks).forEach(function(category) {
				if (category === "git" || category.match(/-scm$/)) {
					scmInScope.push(category);
				}
			});
			
			Object.keys(this._categorizedAnchors).forEach(function(category) {
				var anchor = this._categorizedAnchors[category];
				var links = [];
				if (category === this._currentCategory) {
					anchor.parentElement.style.display = "";
					anchor.href = "";
					anchor.onclick = function() {
						return false;
					};
					return;
				}

				if (this._categorizedPageLinks[category]) {
					links.push.apply(links, this._categorizedPageLinks[category]);
				}
				if (this._categorizedRelatedLinks[category]) {
					links.push.apply(links, this._categorizedRelatedLinks[category]);
				}
				if (links.length === 0 || (scmInScope.length !== 0 && (category === "git" || category.match(/-scm$/)) && scmInScope.indexOf(category) === -1)) {
					anchor.href = "";
					anchor.parentElement.style.display = "none";
				} else {
					anchor.parentElement.style.display = "";
					links.sort(function compareLinks(link1, link2) {
						if (link1.order < link2.order) {
							return -1;
						} else if (link2.order < link1.order) {
							return 1;
						}
						return link1.title.localeCompare(link2.title);
					});
					var bestLink = links.shift();
					anchor.href = bestLink.href;
					if(util.isElectron){
						anchor.target = "_blank";
					}
				}
			}, this);
			this._show();
		},
		_updateCategoryNotifications: function() {
			clearTimeout(this._notificationTimeout);
			this._notificationTimeout = setTimeout(this._updateCategoryNotifications.bind(this), 300000); // 5 minutes
			var resource = PageUtil.matchResourceParameters().resource;
			var resourceURL = new URL(resource, window.location.href).href;
			this._categoryInfos.forEach(function(categoryInfo) {
				if (categoryInfo.service && categoryInfo.service.getNotifications) {
					var listItem = this._categorizedAnchors[categoryInfo.id].parentElement;
					categoryInfo.service.getNotifications(resourceURL).then(function(notifications) {
						if (resource === PageUtil.matchResourceParameters().resource) {
							var level = "";
							notifications.forEach(function(notification) {
								if (notification.level === "info" && !level) {
									level = "info";
								} else if (notification.level === "warn" && (!level || level === "info")) {
									level = "warn";
								} else if (notification.level === "error" && level !== "error") {
									level = "error";
								}
							});
							if (level) {
								lib.setSafeAttribute(listItem, "level", level);
							} else {
								listItem.removeAttribute("level");
							}
						}
					}, function(err) {
						window.console.log(err);
					});
				}
			}, this);
		},
		_show : function(){
		}
	};
	return SideMenu;
});
