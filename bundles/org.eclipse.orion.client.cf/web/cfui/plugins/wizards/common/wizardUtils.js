/*******************************************************************************
 * @license
 * Copyright (c) 2014, 2019 IBM Corporation and others.
 * All rights reserved. This program and the accompanying materials are made 
 * available under the terms of the Eclipse Public License 2.0 
 * (http://www.eclipse.org/legal/epl-v10.html), and the Eclipse Distribution 
 * License v1.0 (http://www.eclipse.org/org/documents/edl-v10.html). 
 * 
 * Contributors: IBM Corporation - initial API and implementation
 ******************************************************************************/
/*eslint-env browser, amd*/
define(['i18n!cfui/nls/messages', 'orion/Deferred', 'cfui/cfUtil',  'orion/urlUtils', 'orion/webui/littlelib'], 
		function(messages, Deferred, mCfUtil, URLUtil, lib){
	
	/**
	 * Common wizard utilities.
	 */
	var WizardUtils = {
			
		/**
		 * Posts the given status message.
		 */
		defaultPostMsg : function(status){
			window.parent.postMessage(JSON.stringify({pageService: "orion.page.delegatedUI", //$NON-NLS-0$
				 source: "org.eclipse.orion.client.cf.deploy.uritemplate",  //$NON-NLS-0$
				 status: status}), "*"); //$NON-NLS-0$
		},
		
		/**
		 * Builds the post error.
		 */
		buildDefaultPostError : function(defaultDecorateError){
			return function(error, target){
				if(error.HttpCode !== 401){
					error = defaultDecorateError(error, target);
					window.parent.postMessage(JSON.stringify({pageService: "orion.page.delegatedUI", //$NON-NLS-0$
						source: "org.eclipse.orion.client.cf.deploy.uritemplate", //$NON-NLS-0$
						status: error}), "*"); //$NON-NLS-0$
				}
			};
		},
		
		/**
		 *  Posts to close the plugin frame.
		 */
		defaultCloseFrame : function(){
			window.parent.postMessage(JSON.stringify({pageService: "orion.page.delegatedUI", //$NON-NLS-0$
				 source: "org.eclipse.orion.client.cf.deploy.uritemplate", cancelled: true}), "*"); //$NON-NLS-0$ //$NON-NLS-1$
		},
		
		/**
		 * Parses the given message creating a decorated UI.
		 */
		defaultParseMessage : function(msg){
			if (msg.HTML) {
				// msg is HTML to be inserted directly
				var span = document.createElement("span");
				lib.setSafeInnerHTML(span, msg.Message);
				return span;
			}
			msg = msg.Message || msg;
			
			var chunks, msgNode;
			try {
				chunks = URLUtil.detectValidURL(msg);
			} catch (e) {
				/* contained a corrupt URL */
				chunks = [];
			}
			
			if (chunks.length) {
				msgNode = document.createDocumentFragment();
				URLUtil.processURLSegments(msgNode, chunks);
				
				/* all status links open in new window */
				Array.prototype.forEach.call(lib.$$("a", msgNode), function(link) { //$NON-NLS-0$
					link.target = "_blank"; //$NON-NLS-0$
				});
			}
			
			return msgNode || document.createTextNode(msg);
		},
		
		/**
		 * Displays the message bar panel with the given message.
		 */
		defaultShowMessage : function(message){
			document.getElementById('messageLabel').classList.remove("errorMessage"); //$NON-NLS-0$//$NON-NLS-1$
			document.getElementById('messageContainer').classList.remove("errorMessage"); //$NON-NLS-0$ //$NON-NLS-1$
			lib.empty(document.getElementById('messageText')); //$NON-NLS-0$
			
			document.getElementById('messageText').style.width = "100%"; //$NON-NLS-0$ //$NON-NLS-1$
			document.getElementById('messageText').appendChild(WizardUtils.defaultParseMessage(message)); //$NON-NLS-0$
			
			document.getElementById('messageButton').className = ""; //$NON-NLS-0$
			document.getElementById('messageContainer').classList.add("showing"); //$NON-NLS-0$ //$NON-NLS-1$
		},
		
		/**
		 * Hides the message bar panel.
		 */
		defaultHideMessage : function(){
			document.getElementById('messageLabel').classList.remove("errorMessage"); //$NON-NLS-0$ //$NON-NLS-1$
			document.getElementById('messageContainer').classList.remove("errorMessage"); //$NON-NLS-0$ //$NON-NLS-1$
			lib.empty(document.getElementById('messageText')); //$NON-NLS-0$
			document.getElementById('messageContainer').classList.remove("showing"); //$NON-NLS-0$ //$NON-NLS-1$
		},
		
		/**
		 * Displays the message bar panel with the given error message.
		 */
		defaultShowError : function(message){
			document.getElementById('messageLabel').classList.add("errorMessage"); //$NON-NLS-0$ //$NON-NLS-1$
			document.getElementById('messageContainer').classList.add("errorMessage"); //$NON-NLS-0$ //$NON-NLS-1$
			lib.empty(document.getElementById('messageText')); //$NON-NLS-0$
			
			document.getElementById('messageText').style.width = "calc(100% - 10px)"; //$NON-NLS-0$ //$NON-NLS-1$
			document.getElementById('messageText').appendChild(WizardUtils.defaultParseMessage(message)); //$NON-NLS-0$
			lib.empty(document.getElementById('messageButton')); //$NON-NLS-0$
			
			document.getElementById('messageButton').className = "dismissButton core-sprite-close imageSprite"; //$NON-NLS-0$ //$NON-NLS-1$
			document.getElementById('messageButton').onclick = WizardUtils.defaultHideMessage; //$NON-NLS-0$
			document.getElementById('messageContainer').classList.add("showing"); //$NON-NLS-0$ //$NON-NLS-1$
		},
		
		/**
		 * Makes the current iframe draggable.
		 */
		makeDraggable : function(frameHolder){
			var iframe = window.frameElement;
		    setTimeout(function(){
		    	
				var titleBar = document.getElementById('titleBar'); //$NON-NLS-0$
				titleBar.addEventListener('mousedown', function(e) { //$NON-NLS-0$
					if (e.srcElement.id !== 'closeDialog') {
						frameHolder._dragging = true;
						if (titleBar.setCapture)
							titleBar.setCapture();
						
						frameHolder.start = {
							screenX: e.screenX,
							screenY: e.screenY
						};
					}
				});
				
				titleBar.addEventListener('mousemove', function(e) { //$NON-NLS-0$
					if (frameHolder._dragging) {
						var dx = e.screenX - frameHolder.start.screenX;
						var dy = e.screenY - frameHolder.start.screenY;
						
						frameHolder.start.screenX = e.screenX;
						frameHolder.start.screenY = e.screenY;
						
						var x = parseInt(iframe.style.left) + dx;
						var y = parseInt(iframe.style.top) + dy;
						
						iframe.style.left = x+"px"; //$NON-NLS-0$
						iframe.style.top = y+"px"; //$NON-NLS-0$
					}
				});
				
				titleBar.addEventListener('mouseup', function(e) { //$NON-NLS-0$
					frameHolder._dragging = false;
					if (titleBar.releaseCapture) {
						titleBar.releaseCapture();
					}
				});
		    });
		},
		
		/**
		 * Summons the available clouds with the
		 * default one if present.
		 */
		loadClouds : function(options){
			options = options || {};
			
			var message = options.message || messages["loadingDeploymentSettings..."];
			var showMessage = options.showMessage;
			var hideMessage = options.hideMessage;
			
			var preferences = options.preferences;
			var fileClient = options.fileClient;
			var resource = options.resource;
			
			var d = new Deferred();
			showMessage(message);

			fileClient.read(resource.ContentLocation, true).then(
				function(result){
					mCfUtil.getTargets(preferences, result).then(function(result){
					hideMessage();
					d.resolve(result);
				}, d.reject);
			}, d.reject);
			
			return d;
		}
	};
	
	return WizardUtils;
});
