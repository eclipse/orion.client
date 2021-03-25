/*******************************************************************************
 * Copyright (c) 2016 IBM Corporation and others.
 * All rights reserved. This program and the accompanying materials are made 
 * available under the terms of the Eclipse Public License 2.0 
 * (http://www.eclipse.org/legal/epl-v10.html), and the Eclipse Distribution 
 * License v1.0 (http://www.eclipse.org/org/documents/edl-v10.html). 
 *
 * Contributors:
 *	 IBM Corporation - initial API and implementation
 *******************************************************************************/
/*eslint-env browser, node*/
var electron = require('electron');
var nodeUrl = require('url');
var dragSrcEl = null;
var contextSrcEl = null;
var activeIndex = 0;
var isInitiatingWorkspace = false;
var needToCleanFrames = [];

function redrawButtons() {
	var bar = document.querySelector("#bar");
	var buttons = document.createElement("span");
	buttons.classList.add("tabButtons");
	function historyBack() {
		var active = getActiveTab();
		if (!active) return;
		active.contentWindow.history.back();
	}

	function historyForward() {
		var active = getActiveTab();
		if (!active) return;
		active.contentWindow.history.forward();
	}
	function refreshPage() {
		var active = getActiveTab();
		if (!active) return;
		active.contentWindow.location.reload();
	}
	var back = document.createElement("button"),
		backTitle = process.platform === "darwin"? "Back (Cmd+Left)" :"Back (Alt+Left)";
	back.title = backTitle;
	back.setAttribute("aria-label", backTitle);
	back.textContent = "<";
	back.classList.add("tabButton");
	back.addEventListener("click", historyBack);
	buttons.appendChild(back);
	
	var forward = document.createElement("button"),
		forwardTitle = process.platform === "darwin"? "Forward (Cmd+Right)" :"Forward (Alt+Right)";
	forward.title = forwardTitle;
	forward.setAttribute("aria-label", forwardTitle);
	forward.textContent = ">";
	forward.classList.add("tabButton");
	forward.addEventListener("click", historyForward);
	buttons.appendChild(forward);
	
	var refresh = document.createElement("button"),
		refreshTitle = process.platform === "darwin"? "Refresh (Cmd+R)" :"Refresh (Ctrl+R)";
	refresh.title = refreshTitle;
	refresh.setAttribute("aria-label", refreshTitle);
	refresh.textContent = "\u27F2";
	refresh.classList.add("tabButton");
	refresh.addEventListener("click", refreshPage);
	buttons.appendChild(refresh);
	
	bar.appendChild(buttons);
	return {
		refreshPage:refreshPage,
		historyForward:historyForward,
		historyBack:historyBack
	};
}

function closeAllTabs(){
	var tabbuttons = document.querySelectorAll(".tabItem");
	for (var j = 0; j < tabbuttons.length; j++) {
		tabbuttons[j].lastChild.click();
	}
}

function addNewTab(id, iframe) {
	var bar = document.querySelector("#bar");
	var tabParent = bar.querySelector("ul");
	if (!tabParent) {
		tabParent = document.createElement("ul");
		bar.appendChild(tabParent);
	}
	var tab = document.createElement("li");
	var title = iframe.contentDocument.title;
	tab.setAttribute('id', "tab" + id);
	tab.setAttribute('draggable', true);
	tab.classList.add("tabItem");
	var text = document.createElement("span");
	text.classList.add("tabLabel");
	text.textContent = title;
	var icon = document.createElement("img");
	icon.classList.add("tabIcon");
	tab.appendChild(icon);
	tab.appendChild(text);
	tab.title = title;

	var closeBt = document.createElement("span");
	closeBt.classList.add("close");
	closeBt.textContent = "x";
	tab.appendChild(closeBt);
	closeBt.addEventListener("click", function(evt) {
		iframe.parentNode.removeChild(iframe);
		tab.parentNode.removeChild(tab);
		update();
		evt.preventDefault();
		evt.stopPropagation();
	});

	function setActive() {
		var currentTabcontents = document.querySelectorAll(".tabContent");
		var tabbuttons = document.querySelectorAll(".tabItem");
		for (var j = 0; j < tabbuttons.length; j++) {
			tabbuttons[j].classList.remove("active");
			currentTabcontents[j].classList.remove("active");
		}
		tab.classList.add("active");
		iframe.classList.add("active");
	}

	tab.addEventListener("click", function(evt) {
		if (evt.button === 1 && tabParent.childNodes.length > 1) {
			// middle button clicked, close the tab if there are two or more
			// tabs around
			iframe.parentNode.removeChild(iframe);
			tab.parentNode.removeChild(tab);
			update();
			evt.preventDefault();
			evt.stopPropagation();
		} else {
			setActive();
			evt.preventDefault();
			evt.stopPropagation();
			var menu = document.querySelector("#context-menu");
			menu.classList.remove('context-menu-items-open');
		}
	});

	tab.addEventListener('dragstart', function(evt) {
		setActive();
		dragSrcEl = tab;
		var crt = this.cloneNode(true);
		crt.style.display = "none";
		evt.dataTransfer.setDragImage(crt, 0, 0);
		evt.dataTransfer.effectAllowed = "move";
	});
	tab.addEventListener('dragenter', function(evt) {
		if (evt.preventDefault) {
			evt.preventDefault(); // Necessary. Allows us to drop.
		}
		if (dragSrcEl) {
			if (tab.isSameNode(dragSrcEl.previousSibling)) {
				// drag forward
				var replacedTab1 = tabParent.replaceChild(dragSrcEl, tab);
				tabParent.insertBefore(replacedTab1, dragSrcEl.nextSibling);
			} else {
				// drag back
				var replacedTab2 = tabParent.replaceChild(dragSrcEl, tab);
				tabParent.insertBefore(replacedTab2, dragSrcEl);
			}
		}
		return false;
	});
	tab.addEventListener('dragover', function(evt) {
		if (evt.preventDefault) {
			evt.preventDefault(); // Necessary. Allows us to drop.
		}
		return false;
	});
	tab.addEventListener('drop', function(evt) {
		if (evt.stopPropagation) {
			evt.stopPropagation(); // stops the browser from redirecting.
		}
		return false;
	});
	tab.addEventListener("contextmenu", function(evt) {
		var menu = document.querySelector("#context-menu");
		var activeClassName = "context-menu-items-open";
		contextSrcEl = tab;
		evt.preventDefault();
		menu.classList.remove(activeClassName); // Close old one 
		positionMenu(evt);	// calculate new pisition
		menu.classList.add(activeClassName); // Open new One
	});
	tabParent.appendChild(tab);
	update();
	return tab;
}

function setTabLabel(id, str) {
	var tab = document.getElementById("tab" + id);
	var text = tab.querySelector(".tabLabel");
	tab.title = text.textContent = str;
}
function setTabIcon(id,head) {
	var linkIconElement = Array.prototype.find.call(head.childNodes, function(node){
		return node.nodeName === 'LINK' && node.rel === 'icon';
	});
	if(linkIconElement && linkIconElement.href){
		var tab = document.getElementById("tab" + id);
		var icon = tab.querySelector(".tabIcon");
		icon.src = linkIconElement.href;
	}
}

function update() {
	var bar = document.querySelector("#bar");
	if (!bar) return;
	var ul = bar.querySelector("ul");
	if (!ul) return;
	var items = ul.querySelectorAll("li");
	// Activate first tab if none is active
	if (!getActiveTab() && items.length) {
		document.querySelectorAll(".tabContent")[0].classList.add("active");
		items[0].classList.add("active");
	}
	// Hide close if only one tab is shown
	Array.prototype.forEach.call(items, function(tab) {
		tab.querySelector(".close").style.display = "";
	});
	if (items.length === 1) {
		items[0].querySelector(".close").style.display = "none";
	}
	// Shrink tabs if necessary
	Array.prototype.forEach.call(items, function(tab) {
		tab.style.flexBasis = "";
	});
	if(ul.lastChild){
		if (bar.getBoundingClientRect().right < ul.lastChild.getBoundingClientRect().right) {
			Array.prototype.forEach.call(items, function(tab) {
				tab.style.flexBasis = "0";
			});
		}
	}
	if(needToCleanFrames.length > 0){
		needToCleanFrames.forEach(function(iframe){
			iframe.parentNode.removeChild(iframe);
		});
		needToCleanFrames = [];
	}
}

function getActiveTab() {
	return document.querySelector(".tabContent.active");
}

function load() {
	var pageControlCallbacks = redrawButtons();
	createTab(window.location.hash.substr(1));
	registerElectronMenu(pageControlCallbacks);
	window.addEventListener("resize", function() {
		if (this.timeout) window.clearTimeout(this.timeout);
		this.timeout = window.setTimeout(function() {
			update();
		}, 50);
	});
	registerContextMenu();
	collectTabsUrl();
}

function registerElectronMenu(pageControlCallbacks){
	function switchForwardTabs(){
		var activeTab = document.querySelector(".tabItem.active");
		var nextTabButton = activeTab.nextSibling;
		nextTabButton ? nextTabButton.click() : activeTab.parentNode.firstChild.click();
	}
	function switchBackwardTabs(){
		var activeTab = document.querySelector(".tabItem.active");
		var previousTabButton = activeTab.previousSibling;
		previousTabButton ? previousTabButton.click() : activeTab.parentNode.lastChild.click();
	}
	var Menu = electron.remote.Menu;
	var menu = Menu.getApplicationMenu();
	menu.append(new electron.remote.MenuItem( // The main purpose of creating menu if for key binding
		{
			label: "Navigation",  
			submenu: [
				{label: "Back", accelerator:process.platform === "darwin"? "CmdOrCtrl+Left" :"Alt+Left", click: pageControlCallbacks.historyBack},
				{label: "Forward", accelerator:process.platform === "darwin"? "CmdOrCtrl+Right" :"Alt+Right", click: pageControlCallbacks.historyForward},
				{label: "Refresh", accelerator:process.platform === "darwin"? "CmdOrCtrl+R" :"Ctrl+R", click: pageControlCallbacks.refreshPage},
				{label: "RefreshOnF5", accelerator:process.platform === "darwin"? "" :"F5", visible:false, click: pageControlCallbacks.refreshPage},
				{label: "Move to Next Tab", accelerator:process.platform === "darwin"? "Ctrl+Tab" :"Ctrl+Tab", click: switchForwardTabs},
				{label: "Move to Previous Tab", accelerator:process.platform === "darwin"? "Ctrl+Shift+Tab" :"Ctrl+Shift+Tab", click: switchBackwardTabs}
			]
		}
	));
	Menu.setApplicationMenu(menu);
}

function bindfocus(){
	getActiveTab().focus();
}

function createTab(url) {
	var iframes = document.querySelectorAll(".tabContent");
	var urlSegs = url.split("#");
	var potentialExsitingIframe = Array.prototype.find.call(iframes,function(iframe){
		if(urlSegs[0].indexOf("/edit/edit.html") !== -1){
			return iframe.contentWindow.location.href.indexOf(urlSegs[0]) === 0;  // Always open the Editor page in this case
		}else if(urlSegs[0].indexOf("/git/git-repository.html") !== -1){
			if(urlSegs[1] && urlSegs[1].indexOf("/gitapi/commit") !== -1){
				return iframe.contentWindow.location.href === url;   // Find exactly the git page of the exact Commit or should open a new git tab
			}else{ // For all the other cases
				return iframe.contentWindow.location.href.indexOf(urlSegs[0]+"#/gitapi/clone") === 0  // Find a /clone git page, or should open a new git tab 
			}
		}else{
			return iframe.contentWindow.location.href.indexOf(urlSegs[0]) === 0;  // For all the other cases, open the same html page, like settings
		}
	});
	if(potentialExsitingIframe){
		if(urlSegs[0].indexOf("/edit/edit.html") !== -1 && urlSegs[1] && urlSegs[1].split("/").length > 4){
			potentialExsitingIframe.src = url; // Change the src only if it's edit page and the url is targeting some file inside the project folder 
		}
		if(urlSegs[1] && urlSegs[1].indexOf("/gitapi/clone") !== -1){
			potentialExsitingIframe.contentWindow.location.reload();  // Refresh the git page in this case, to get the correct contents, otherwise user have to refresh the page themselves.
		}
		clickTab(potentialExsitingIframe.id.substr(6));
	}else{
		var iframe = document.createElement("iframe");
		iframe.frameBorder = "0";
		iframe.classList.add("tabContent");
		iframe.src = url;
		var id = Date.now();
		iframe.id = "iframe" + id;
		iframe.addEventListener("load", function() {
			iframe.contentWindow.confirm = window.confirm;
			iframe.contentWindow.alert = window.alert;
			iframe.contentWindow.__electron = electron;
	
			var target = iframe.contentDocument.querySelector('head > title');
			if (target) {
				var observer = new window.WebKitMutationObserver(function(mutations) {
					if (mutations) {
						setTabLabel(id, iframe.contentDocument.title);
						setTabIcon(id,iframe.contentDocument.head);
					}
				});
				observer.observe(target, {
					subtree: true,
					characterData: true,
					childList: true
				});
			}
			setTabLabel(id, iframe.contentDocument.title);
			setTabIcon(id, iframe.contentDocument.head);
			iframe.contentWindow.addEventListener("click", function() {
				var menu = document.querySelector("#context-menu");
				var activeClassName = "context-menu-items-open";
				menu.classList.remove(activeClassName);
			});
			if(isInitiatingWorkspace){
				var tabbuttons = document.querySelectorAll(".tabItem");
				tabbuttons[activeIndex] && tabbuttons[activeIndex].click();
				isInitiatingWorkspace = false;
			}
		});
		document.body.appendChild(iframe);
		var srcUrl = nodeUrl.parse(url);
		if(srcUrl.pathname === "/" || srcUrl.pathname.endsWith(".html")){
			addNewTab(id, iframe).click();
		}else{
			needToCleanFrames.push(iframe);
		}
	}
}

function clickTab(id){
	var correspondingTabId = 'tab' + id;
	var correspondingTab = document.querySelector('#'+correspondingTabId);
	correspondingTab.click();
}
function setActiveIndex(index){
	isInitiatingWorkspace = true;
	activeIndex = index;
}

function registerContextMenu() {
	var menu = document.querySelector("#context-menu");
	var menuitem = document.querySelector(".context-menu-item");
	menuitem.addEventListener("mouseover", function(){
		menuitem.classList.add('context-menu-item-selected');
	});
	menuitem.addEventListener("mouseleave", function(){
		menuitem.classList.remove('context-menu-item-selected');
	});
	// Register on document to make sure click on empty spaces after the tab buttons can close the context menu as well.
	document.addEventListener("click", function(evt) { 
		if (clickInsideElement(evt, 'context-menu-item')) {
			var correspondingiframeId = 'iframe' + contextSrcEl.id.substr(3);
			var corrspondingiframe = document.querySelector('#'+correspondingiframeId);
			// Remove all the other tab buttons first
			var allTabButtons = document.querySelectorAll('.tabs > ul > li');
			var alliframes = document.querySelectorAll('.tabContent');
			if(allTabButtons.length > 1){
				Array.prototype.forEach.call(allTabButtons, function(eachOne) {
					if(eachOne.id !== contextSrcEl.id){
						contextSrcEl.parentNode.removeChild(eachOne);
					}
				});
				Array.prototype.forEach.call(alliframes, function(eachOne) {
					if(eachOne.nodeName === 'IFRAME' && eachOne.id !== correspondingiframeId){
						 corrspondingiframe.parentNode.removeChild(eachOne);
					}
				});
				update();
				evt.preventDefault();
				evt.stopPropagation();
			}
		}
		menu.classList.remove('context-menu-items-open');
	});
}
function clickInsideElement(e, className) {
	var el = e.srcElement || e.target;
	if (el.classList.contains(className)) {
		return el;
	}
	while (el) {
		if (el.classList && el.classList.contains(className)) {
			return el;
		}
		el = el.parentNode;
	}
	return false;
}

function positionMenu(e) {
	var menu = document.querySelector("#context-menu");
	var menuWidth;
	var menuHeight;
	var windowWidth;
	var windowHeight;
	var clickCoords;
	var clickCoordsX;
	var clickCoordsY;
	clickCoords = getPosition(e);
	clickCoordsX = clickCoords.x;
	clickCoordsY = clickCoords.y;

	menuWidth = menu.offsetWidth + 4;
	menuHeight = menu.offsetHeight + 4;
	windowWidth = window.innerWidth;
	windowHeight = window.innerHeight;

	if ((windowWidth - clickCoordsX) < menuWidth) {
		menu.style.left = windowWidth - menuWidth + "px";
	} else {
		menu.style.left = clickCoordsX + "px";
	}
	if ((windowHeight - clickCoordsY) < menuHeight) {
		menu.style.top = windowHeight - menuHeight + "px";
	} else {
		menu.style.top = clickCoordsY + "px";
	}
}
function getPosition(e) {
	var posx = 0;
	var posy = 0;
	if (!e) var e = window.event;
	if (e.pageX || e.pageY) {
		posx = e.pageX;
		posy = e.pageY;
	} else if (e.clientX || e.clientY) {
		posx = e.clientX + document.body.scrollLeft +
			document.documentElement.scrollLeft;
		posy = e.clientY + document.body.scrollTop +
			document.documentElement.scrollTop;
	}
	return {
		x: posx,
		y: posy
	};
}
function collectTabsUrl(){
	var ipcRenderer = electron.ipcRenderer;
	ipcRenderer.on('collect-tabs-info',function(event, arg){
		var iframes = document.querySelectorAll(".tabContent");
		var activeTabIndex = 0;
		var tabUrls = Array.prototype.map.call(iframes,function(iframe,index){
			if(iframe.classList.contains("active")){
				activeTabIndex = index;
			}
			return iframe.contentWindow.location.href.replace(/http:\/\/localhost:\w+\//, "");
		});
		ipcRenderer.send("collected-tabs-info-" + arg, tabUrls, activeTabIndex);
	});
}
