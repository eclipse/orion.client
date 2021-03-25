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
define(['domReady', 'orion/xhr', 'orion/PageUtil', 'orion/PageLinks', 'orion/xsrfUtils', './common', 'orion/URL-shim'], function(domReady, xhr, PageUtil, PageLinks, xsrfUtils, common) {

	function confirmResetUser(e) {
		e.preventDefault();

		var responseObject;

		if (document.getElementById("username").value === "" && document.getElementById("resetEmail").value === "") {
			common.showStatusMessage("Provide username or email to reset.");
			return;
		}
		var username = document.getElementById("username").value;
		var email =  document.getElementById("resetEmail").value;
		var mypostrequest = new XMLHttpRequest();
		mypostrequest.onreadystatechange = function() {
			if (mypostrequest.readyState === 4) {
				if (mypostrequest.status === 200) {
					responseObject = JSON.parse(mypostrequest.responseText);
					if (responseObject.Message) {
						common.showStatusMessage(responseObject.Message);
					} else {
						common.showStatusMessage();
					}
				} else {
					try {
						responseObject = JSON.parse(mypostrequest.responseText);
						if (responseObject.Message) {
							common.showStatusMessage(responseObject.Message);
							return;
						}
					} catch (e) {
						// not json
					}
					common.showStatusMessage(mypostrequest.statusText);
				}
			}
		};

		var formData = {
			UserName : username,
			Email: email
		};
		mypostrequest.open("POST", "../useremailconfirmation", true);
		mypostrequest.setRequestHeader("Content-type", "application/json;charset=UTF-8");
		mypostrequest.setRequestHeader("Orion-Version", "1");
		xsrfUtils.addCSRFNonce(mypostrequest);
		mypostrequest.send(JSON.stringify(formData));

		common.showStatusMessage("Sending password reset confirmation...");
	}

	function setUpResetPage () {
		document.getElementById("resetBtn").addEventListener("click", confirmResetUser, false);
	}

	domReady(function() {
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

		setUpResetPage();
	});
});
