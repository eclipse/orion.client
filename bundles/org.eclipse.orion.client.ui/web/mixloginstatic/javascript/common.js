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
/*global $*/
define(['orion/PageUtil', 'orion/xsrfUtils', 'orion/PageLinks', './jquery'],function(PageUtil, xsrfUtils, PageLinks) {
    var errorClass = "has-error";
    var successClass = "success";
    var emailConfigured = true;

    function addClass(ele,cls) {
      if (!hasClass(ele,cls)) ele.className += " "+cls;
    }

    function confirmLogin(e, username, password) {
        if (e !== undefined) {
            e.preventDefault();
        }

        if (!username) {
            username = document.getElementById('username').value.trim();
            password = document.getElementById('password').value;
        }

        if (username.length > 0 && password.length > 0) {

            var mypostrequest = new XMLHttpRequest();
            mypostrequest.onreadystatechange = function() {
                if (mypostrequest.readyState === 4) {
                    if (mypostrequest.status !== 200 && window.location.href.indexOf("http") !== -1) {
                        var responseObject = JSON.parse(mypostrequest.responseText);
                        showStatusMessage(responseObject.error);
                    } else {
                        finishLogin();
                    }
                }
            };

            var parameters = "username=" + encodeURIComponent(username) + "&password=" + encodeURIComponent(password);
            mypostrequest.open("POST", "../login/form", true);
            mypostrequest.setRequestHeader("Content-type", "application/x-www-form-urlencoded");
            mypostrequest.setRequestHeader("Orion-Version", "1");
            xsrfUtils.addCSRFNonce(mypostrequest);
            mypostrequest.send(parameters);
        }
    }

    function checkEmailConfigured() {
        var checkemailrequest = new XMLHttpRequest();
        checkemailrequest.onreadystatechange = function() {
            if (checkemailrequest.readyState === 4) {
                if (checkemailrequest.status === 200) {
                    var responseObject = JSON.parse(checkemailrequest.responseText);
                    if (responseObject.EmailConfigured === false) {
                        if (document.getElementById("forgotPassword")) {
                            document.getElementById("forgotPassword").style.display = 'none';
                        }

                        if (document.getElementById("email")) {
                            document.getElementById("email").style.display = 'none';
                        }
                        
                        emailConfigured = false;
                    }
                }
            }
        };

        checkemailrequest.open("POST", "../useremailconfirmation/cansendemails", true);
        checkemailrequest.setRequestHeader("Content-type", "application/x-www-form-urlencoded");
        checkemailrequest.setRequestHeader("Orion-Version", "1");
        checkemailrequest.send();
    }

    function checkUserCreationEnabled() {
        var checkusersrequest = new XMLHttpRequest();
        checkusersrequest.onreadystatechange = function() {
            if (checkusersrequest.readyState === 4) {
                if (checkusersrequest.status === 200) {
                    var responseObject = JSON.parse(checkusersrequest.responseText);
                    var userCreationEnabled = responseObject.CanAddUsers;
                    var registrationURI = responseObject.RegistrationURI;
                    if (!userCreationEnabled && !registrationURI) {
                        var loginURL = "LoginWindow.html";
                        var redirect = getRedirect() ? "?redirect=" + getRedirect() : "";
                        var redirectURL = loginURL + redirect;
                        window.location.replace(redirectURL);
                    }
                }
            }
        };

        checkusersrequest.open("POST", "../login/canaddusers", true);
        checkusersrequest.setRequestHeader("Content-type", "application/x-www-form-urlencoded");
        checkusersrequest.setRequestHeader("Orion-Version", "1");
        xsrfUtils.addCSRFNonce(checkusersrequest);
        checkusersrequest.send();
    }

    function copyText(original, destination) {
        document.getElementById(destination).value = document.getElementById(original).value;
    }

    function createOAuthLink(oauth) {
        if (oauth !== "" && oauth !== null) {
            var redirect = getRedirect();
            if (redirect !== null && PageUtil.validateURLScheme(decodeURIComponent(redirect))) {
                return "../login/oauth/" + oauth + "?oauth="+oauth+"&redirect=" + redirect;
            } else {
                return "../login/oauth/" + oauth + "?oauth="+oauth;
            }
        }
    }

    function decodeBase64(input) {
        var _keyStr = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/=";
        var output = "";
        var chr1, chr2, chr3;
        var enc1, enc2, enc3, enc4;
        var i = 0;

        input = input.replace(/[^A-Za-z0-9\+\/\=]/g, "");

        while (i < input.length) {

            enc1 = _keyStr.indexOf(input.charAt(i++));
            enc2 = _keyStr.indexOf(input.charAt(i++));
            enc3 = _keyStr.indexOf(input.charAt(i++));
            enc4 = _keyStr.indexOf(input.charAt(i++));

            chr1 = (enc1 << 2) | (enc2 >> 4);
            chr2 = ((enc2 & 15) << 4) | (enc3 >> 2);
            chr3 = ((enc3 & 3) << 6) | enc4;

            output = output + String.fromCharCode(chr1);

            if (enc3 !== 64) {
                output = output + String.fromCharCode(chr2);
            }
            if (enc4 !== 64) {
                output = output + String.fromCharCode(chr3);
            }

        }
        output = output.replace(/\r\n/g, "\n");
        var utftext = "";

        for (var n = 0; n < output.length; n++) {

            var c = output.charCodeAt(n);

            if (c < 128) {
                utftext += String.fromCharCode(c);
            } else if ((c > 127) && (c < 2048)) {
                utftext += String.fromCharCode((c >> 6) | 192);
                utftext += String.fromCharCode((c & 63) | 128);
            } else {
                utftext += String.fromCharCode((c >> 12) | 224);
                utftext += String.fromCharCode(((c >> 6) & 63) | 128);
                utftext += String.fromCharCode((c & 63) | 128);
            }

        }

        return utftext;
    }

    function finishLogin() {
        var redirect = getRedirect();
        redirect = redirect === null ? PageLinks.getOrionHome() : redirect;

        if (redirect !== null) {
            redirect = decodeURIComponent(redirect);
            if(PageUtil.validateURLScheme(redirect)) {
                window.location = redirect;
                return;
            }
        }
        window.close();

    }

    function getParam(key) {
        var regex = new RegExp('[\\?&]' + key + '=([^&#]*)');
        var results = regex.exec(window.location.href);
        if (results === null) {
            return;
        }
        return results[1];
    }

    function getRedirect() {
        var regex = new RegExp('[\\?&]redirect=([^&#]*)');
        var results = regex.exec(window.location.href);
        if (!results) return null;
        return new URL(decodeURIComponent(results[1])).origin === window.location.origin ? results[1] : null;
    }

    function hasClass(ele,cls) {
      return !!ele.className.match(new RegExp('(\\s|^)'+cls+'(\\s|$)'));
    }

    function passwordSwitcher() {
        var switchContainer = $(this).parents("form").find(".pass-container.hide");

        $(this).parent().addClass("hide");
        $(this).prev().attr("disabled", "disabled");
        switchContainer.removeClass("hide")
        switchContainer.find("input").removeAttr("disabled");
    }

    function removeClass(ele,cls) {
      if (hasClass(ele,cls)) {
        var reg = new RegExp('(\\s|^)'+cls+'(\\s|$)');
        ele.className=ele.className.replace(reg,' ');
      }
    }

    function showStatusMessage(msg) {
        var statusField = $(".status");
        statusField.text("");

        if (typeof msg !== "undefined") {
            var passwordContainer = $(".pass-container"),
                loginContainer = $(".login-container"),
                emailContainer = $(".email-container"),
                resetContainer = $(".reset-container"),
                resetEmailContainer = $(".reset-email-container"),
                registrationRightSection = $(".right-section");

            var usernameField = document.getElementById("username");
            var username = usernameField.value.length > 0 ? usernameField.value : getParam("username");
            var userError = "User " + username + " already exists.";

            var userCreated = "All good to go! Please follow the instructions in the e-mail sent to you to login into Orion.";
            var linkedUserCreated = "Your account " + username + " has been successfully created. You have been sent an email address verification. Follow the instructions in this email to login to your Orion account."

            var resetMsg = "Username or email are required";
            var resetError = "User " + username + " not found.";

            if (document.getElementById("emailContainer") !== null) {
                var emailField = document.getElementById("email");
                var email = emailField.value;
                var emailInUseError = "Email address already in use: " + email + ".";
            }

            if (document.getElementById("resetEmail") !== null) {
                var emailField = document.getElementById("resetEmail");
                var email = emailField.value;
                var resetEmailError = "User with email " + email + " not found.";
            }

            var userEmailNotSet = "User " + username + " doesn't have its email set. Contact administrator to reset your password.";

            // Add the error class back. It will be removed in the switch statement if needed
            statusField.addClass(errorClass);

            switch (msg) {
                case "Password must be at least 8 characters long":
                case "Password not specified.":
                    passwordContainer.addClass(errorClass);
                    loginContainer.removeClass(errorClass);
                    emailContainer.removeClass(errorClass);
                    statusField.text(msg);
                    break;
                case "Password must contain at least one alpha character and one non alpha character":
                    passwordContainer.addClass(errorClass);
                    loginContainer.removeClass(errorClass);
                    emailContainer.removeClass(errorClass);
                    statusField.text("Password must contain at least one number or special character");
                    break;
                case userError:
                case "User login not specified":
                case "Username must contain at least 3 characters":
                    loginContainer.addClass(errorClass);
                    passwordContainer.removeClass(errorClass);
                    emailContainer.removeClass(errorClass);
                    statusField.text(msg);
                    break;
                case "Username must contain no more than 20 characters":
                    loginContainer.addClass(errorClass);
                    statusField.text("Usernames are limited to 20 characters");
                    break;
                case "Invalid user or password":
                    loginContainer.addClass(errorClass);
                    passwordContainer.addClass(errorClass);
                    statusField.text(msg);
                    break;
                case "User email is mandatory.":
                case "Invalid user email.":
                    emailContainer.addClass(errorClass);
                    statusField.text(msg);
                    break;
                case "Provide username or email to reset.":
                    resetContainer.addClass(errorClass);
                    resetEmailContainer.addClass(errorClass);
                    statusField.text(resetMsg);
                    break;
                case resetError:
                    resetContainer.addClass(errorClass);
                    statusField.text(resetError);
                    break;
                case resetEmailError:
                    resetEmailContainer.addClass(errorClass);
                    statusField.text(msg);
                    break;
                case emailInUseError:
                    emailContainer.addClass(errorClass);
                    statusField.text(msg);
                    break;
                case "Could not send confirmation email.":
                    statusField.text(msg);
                    break;
                case "Confirmation email has been sent.":
                    statusField.removeClass(errorClass);
                    statusField.text(msg);
                    break;
                case "Sending password reset confirmation...":
                case "Processing your request...":
                    statusField.removeClass(errorClass);
                    statusField.text(msg);
                    break;
                case userEmailNotSet:
                    statusField.text(userEmailNotSet);
                    break;
                case "Created":
                    registrationRightSection.addClass("hide");
                    loginContainer.removeClass(errorClass);
                    passwordContainer.removeClass(errorClass);
                    emailContainer.removeClass(errorClass);
                    statusField.removeClass(errorClass);
                    statusField.addClass(successClass);
                    statusField.text(userCreated);
                    break;
                case linkedUserCreated:
                    loginContainer.removeClass(errorClass);
                    emailContainer.removeClass(errorClass);
                    statusField.removeClass(errorClass);
                    statusField.addClass(successClass);
                    statusField.text(linkedUserCreated);
                    break;
                default:
                    loginContainer.removeClass(errorClass);
                    passwordContainer.removeClass(errorClass);
                    emailContainer.removeClass(errorClass);
                    statusField.text(msg);
            }
        }
    }

    function setUpPage() {
        $("form").on("input", ".has-error input", function() {
                var field = $(this);
                field.parent().removeClass(errorClass);
        });
    }

    function getEmailConfigured() {
    	return emailConfigured;
    }

    setUpPage();

    return {
        addClass: addClass,
        checkEmailConfigured: checkEmailConfigured,
        checkUserCreationEnabled: checkUserCreationEnabled,
        copyText: copyText,
        confirmLogin: confirmLogin,
        createOAuthLink: createOAuthLink,
        decodeBase64: decodeBase64,
        getParam: getParam,
        getRedirect: getRedirect,
        passwordSwitcher: passwordSwitcher,
        removeClass: removeClass,
        showStatusMessage: showStatusMessage,
        getEmailConfigured: getEmailConfigured
    };
});
