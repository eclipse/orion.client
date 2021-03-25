/*******************************************************************************
 * @license
 * Copyright (c) 2014 IBM Corporation and others.
 * All rights reserved. This program and the accompanying materials are made 
 * available under the terms of the Eclipse Public License 2.0 
 * (http://www.eclipse.org/legal/epl-v10.html), and the Eclipse Distribution 
 * License v1.0 (http://www.eclipse.org/org/documents/edl-v10.html). 
 * 
 * Contributors: IBM Corporation - initial API and implementation
 ******************************************************************************/
/*eslint-env browser, amd*/
/*global URL*/
define(["orion/xhr"], function(xhr) {

	var GA_ID = "OrionGA"; //$NON-NLS-0$
	var queue = [];
	var path;

	function GoogleAnalyticsImpl(servletPath) {
		path = servletPath;
	}

	GoogleAnalyticsImpl.prototype = {
		logEvent: function(category, action, label, value, details) {
			/* details are not to be sent to GA */
			if (window[GA_ID]) {
				window[GA_ID]("send", "event", category, action, label, value); //$NON-NLS-1$ //$NON-NLS-0$
			} else if (queue) {
				queue.push({command: "send", arg0: "event", arg1: category, arg2: action, arg3: label, arg4: value}); //$NON-NLS-1$ //$NON-NLS-0$
			}
		},
		logTiming: function(timingCategory, timingVar, timingValue, timingLabel) {
			if (window[GA_ID]) {
				window[GA_ID]("send", "timing", timingCategory, timingVar, Math.round(timingValue), timingLabel); //$NON-NLS-1$ //$NON-NLS-0$
			} else if (queue) {
				queue.push({command: "send", arg0: "timing", arg1: timingCategory, arg2: timingVar, arg3: Math.round(timingValue), arg4: timingLabel}); //$NON-NLS-1$ //$NON-NLS-0$
			}
		},
		pageLoad: function(href, page, title, args) {
			if (!path) {
				return;
			}

			xhr("GET", path, { //$NON-NLS-0$
				headers: {
					"Orion-Version": "1" //$NON-NLS-1$ //$NON-NLS-0$
				},
				log: false
			}).then(
				function(result) {
					result = JSON.parse(result.response);
					if (!result.tid) {
						/* not tracking */
						queue = null;
						return;
					}

					(function(i,s,o,g,r,a,m){i['GoogleAnalyticsObject']=r;i[r]=i[r]||function(){
					(i[r].q=i[r].q||[]).push(arguments)},i[r].l=1*new Date();a=s.createElement(o),
					m=s.getElementsByTagName(o)[0];a.async=1;a.src=g;m.parentNode.insertBefore(a,m)
					})(window,document,'script','//www.google-analytics.com/analytics.js',GA_ID);

					args = args || {};
					args.location = href;
					if (result.siteSpeedSampleRate) {
						args.siteSpeedSampleRate = result.siteSpeedSampleRate;
					}

					window[GA_ID]("create", result.tid, args); //$NON-NLS-0$
					window[GA_ID]("send", "pageview", { //$NON-NLS-1$ //$NON-NLS-0$
						page: page,
						title: title
					});

					/*
					 * For some reason the following argument values are sometimes get lost when included
					 * solely in the "create"/"send" calls above, in which case GA records the page as
					 * .../googleAnalytics.html (because this is the page running in this iframe).  The
					 * workaround is to set these values a second time below, which seems to make them stick.
					 */					
					window[GA_ID]("set", "page", page); //$NON-NLS-1$ //$NON-NLS-0$
					window[GA_ID]("set", "title", title); //$NON-NLS-1$ //$NON-NLS-0$
					window[GA_ID]("set", "location", href); //$NON-NLS-1$ //$NON-NLS-0$

					/* process events logged while initialization was occurring */
					if (queue) {
						queue.forEach(function(current) {
							window[GA_ID](current.command, current.arg0, current.arg1, current.arg2, current.arg3, current.arg4);
						});
					}
					queue = null; /* no longer needed */
				},
				/* @callback */ function(error) {
					queue = null;
				}
			);
		}
	};

	return GoogleAnalyticsImpl;
});
