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
define(['domReady', 'orion/xhr', 'orion/xsrfUtils', './common'], function(domReady, xhr, xsrfUtils, common) {
	
	function confirmAgreement() {
		if (!document.getElementById("agreement").checked) {
			common.showStatusMessage("You must agree to the Eclipse Foundation Terms of Use and Privacy Policy to create an account.");
			return false;
		}
		return true;
	}
	
	function confirmCreateUser(e) {
		e.preventDefault();
		
		if (!confirmAgreement()) return;

		var linkedUser = common.getParam("oauth") === "create" ? true : false;
		var authForm = document.getElementById("orion-auth"),
			authFormElements = document.getElementById("form-elements"),
			signUpBtn = document.getElementById("signUpBtn"),
			processClass = "in-progress",
			regCompleteClass = "complete";

		if (linkedUser) {
			var identifier = common.getParam("identifier");
			var password = generateRandomPassword();
		} else {
			var password = document.getElementById("password").value;
		}
		var username = document.getElementById("username").value;
		var email =  document.getElementById("email").value;

		var mypostrequest = new XMLHttpRequest();
		mypostrequest.onreadystatechange = function() {
			if (mypostrequest.readyState === 4) {
				if (mypostrequest.status !== 200 && window.location.href.indexOf("http") !== -1) {
					if (!mypostrequest.responseText) {
						return;
					}
					var responseObject = JSON.parse(mypostrequest.responseText);
					common.showStatusMessage(responseObject.Message);
					if(mypostrequest.status === 201){
						common.showStatusMessage(mypostrequest.statusText);
						common.addClass(authForm, regCompleteClass);
						if (!common.getEmailConfigured()) {
							common.confirmLogin(e, username, password);
						}
					}
					common.removeClass(authForm, processClass);
					authFormElements.removeAttribute("disabled");
					signUpBtn.removeAttribute("disabled");
				} else {
					common.confirmLogin(e);
				}
			}
		};

		var formData = {
			UserName : username,
			Password : password,
			Email: email
		};

		if (linkedUser) {
			formData.identifier = identifier;
		}

		mypostrequest.open("POST", "../users", true);
		mypostrequest.setRequestHeader("Content-type", "application/json;charset=UTF-8");
		mypostrequest.setRequestHeader("Orion-Version", "1");
		xsrfUtils.addCSRFNonce(mypostrequest);
		mypostrequest.send(JSON.stringify(formData));
		common.showStatusMessage("Processing your request...");

		common.addClass(authForm, processClass);
		authFormElements.setAttribute("disabled", "disabled");
		signUpBtn.setAttribute("disabled", "disabled");
	}

	function generateRandomPassword() {
		// Passwords are a mix of both alpha and non-alpha characters
		var alphaCharacters = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz";
		var nonAlphaCharacters = "0123456789";
		var minLength = 7;
		var password = "";
		for(var i = 0; i < minLength; i++) {
			password += alphaCharacters.charAt(Math.floor(Math.random() * alphaCharacters.length));
		}
		for(var i = 0; i < minLength; i++) {
			password += nonAlphaCharacters.charAt(Math.floor(Math.random() * nonAlphaCharacters.length));
		}
		return password;
	}

	function setUpRegisterPage() {
		var oauth = common.getParam("oauth");
		if (oauth) {
			var email = common.getParam("email");
			var username = common.getParam("username");

			document.getElementById("passwordContainer").style.display = "none";
			document.getElementById("repeatPasswordContainer").style.display = "none";
			document.getElementById("rightSection").style.display = "none";
			document.getElementById("description").textContent = "Almost there! This account will be associated with your Google or Github account in the future.";
			document.getElementById("username").value = username;
			document.getElementById("email").value = email;
			document.getElementById("signUpBtn").addEventListener("click", confirmCreateUser, false);
		} else {
			document.getElementById("signUpBtn").addEventListener("click", confirmCreateUser, false);
			document.getElementById("show-password").addEventListener("click", common.passwordSwitcher);
			document.getElementById("hide-password").addEventListener("click", common.passwordSwitcher);

			document.getElementById("password").addEventListener("keyup", function() {
				common.copyText("password", "repeatPassword");
			});

			document.getElementById("repeatPassword").addEventListener("keyup", function() {
				common.copyText("repeatPassword", "password");
			});
		}

		// FIX the hrefs of the various forms here.
		document.getElementById("signInWithGoogle").href = common.createOAuthLink("google");
		document.getElementById("signInWithGitHub").href = common.createOAuthLink("github");
		
		function clickHandler(evt) {
			if (!confirmAgreement()) evt.preventDefault();
		}
		document.getElementById("signInWithGoogle").addEventListener("click", clickHandler);
		document.getElementById("signInWithGitHub").addEventListener("click", clickHandler);
	}

	domReady(function() {
		common.checkUserCreationEnabled();
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

		setUpRegisterPage();
	});
});
