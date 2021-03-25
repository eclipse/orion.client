/*******************************************************************************
 * @license
 * Copyright (c) 2011, 2015 IBM Corporation and others.
 * All rights reserved. This program and the accompanying materials are made
 * available under the terms of the Eclipse Public License 2.0
 * (http://www.eclipse.org/legal/epl-v10.html), and the Eclipse Distribution
 * License v1.0 (http://www.eclipse.org/org/documents/edl-v10.html).
 *
 * Contributors: IBM Corporation - initial API and implementation
 ******************************************************************************/
/*eslint-env amd, browser*/
/*global URL*/
define(['domReady', 'orion/xhr', 'orion/webui/littlelib', './common'], function(domReady, xhr, lib, common) {

	function setUpLoginPage () {
		document.getElementById("signInBtn").addEventListener("click", common.confirmLogin, false);

		document.getElementById("username").addEventListener("keypress", function(event) {
			if (event.keyCode === lib.KEY.ENTER) {
				common.confirmLogin();
				lib.stop(event);
			}
		});

		document.getElementById("password").addEventListener("keypress", function(event) {
			if (event.keyCode === lib.KEY.ENTER) {
				common.confirmLogin();
				lib.stop(event);
			}
		});

		xhr("GET", "../server-status.json", { //$NON-NLS-0$
			timeout: 15000,
			responseType: "json"
		}).then(function(result) {
			var messages = result.response.messages;
			if (messages.length > 0) {
				var currentDate = new Date();
				var startDate = new Date(messages[0].startdate);
				startDate.setHours(0, 0, 0, 0);
				if (startDate > currentDate) { return; }
				var endDate = new Date(messages[0].enddate);
				endDate.setHours(23, 59, 59);
				if (endDate <= currentDate)  { return; }
				document.getElementById("orionInfoArea").className = "orion-info";
				document.getElementById("orionInfoMessage").textContent = messages[0].title;
			}
		}, function() {
		});
	}

	domReady(function() {
		common.checkEmailConfigured();

		/* initialize metrics collection for this page */
		var url = new URL("../metrics", window.location); //$NON-NLS-0$
		xhr("GET", url.href, { //$NON-NLS-0$
			headers: {
				"Orion-Version": "1" //$NON-NLS-1$ //$NON-NLS-0$
			},
			log: false
		}).then(
			function(result) {
				result = JSON.parse(result.response);
				if (result.tid) {
					(function(i,s,o,g,r,a,m){i['GoogleAnalyticsObject']=r;i[r]=i[r]||function(){
					(i[r].q=i[r].q||[]).push(arguments)},i[r].l=1*new Date();a=s.createElement(o),
					m=s.getElementsByTagName(o)[0];a.async=1;a.src=g;m.parentNode.insertBefore(a,m)
					})(window,document,'script','//www.google-analytics.com/analytics.js',GA_ID);

					var args = {};
					if (result.siteSpeedSampleRate) {
						args.siteSpeedSampleRate = result.siteSpeedSampleRate;
					}
					window[GA_ID]("create", result.tid, args); //$NON-NLS-0$
					window[GA_ID]("send", "pageview"); //$NON-NLS-1$ //$NON-NLS-0$
				}
			}
		);

		var error = common.getParam("error");
		if (error) {
			var errorMessage = common.decodeBase64(error);

			common.showStatusMessage(errorMessage);
		}

		var oauth = common.getParam("oauth");
		if (oauth) {
			var redirectURL = window.location.href.replace("LoginWindow", "register");
			window.location.replace(redirectURL);
		}

		// FIX the hrefs of the various forms here.
		document.getElementById("signInWithGoogle").href = common.createOAuthLink("google");
		document.getElementById("signInWithGitHub").href = common.createOAuthLink("github");

		setUpLoginPage();
	});
});
