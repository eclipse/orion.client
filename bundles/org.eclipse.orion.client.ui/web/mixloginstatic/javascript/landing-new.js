/*******************************************************************************
 * @license
 * Copyright (c) 2011, 2017 IBM Corporation and others.
 * All rights reserved. This program and the accompanying materials are made
 * available under the terms of the Eclipse Public License 2.0
 * (http://www.eclipse.org/legal/epl-v10.html), and the Eclipse Distribution
 * License v1.0 (http://www.eclipse.org/org/documents/edl-v10.html).
 *
 * Contributors: IBM Corporation - initial API and implementation
 ******************************************************************************/
/*eslint-env amd, browser*/
/*global $ URL*/
define(['domReady', 'orion/xhr', './common', './jquery', 'orion/URL-shim'], function(domReady, xhr, common) {

	var newsRssFeedUrl = "http://planetorion.org/news/feed/";

	function changeMainImage(imageId, containerId) {
		return function(e){
			$(".bannerImage").addClass("hide");
			$("#"+imageId).removeClass("hide");
			$(".contentContainer").removeClass("current");
			$("#"+containerId).addClass("current");
		}
	}

	function formHTML(newsFeedData, elementId, limit) {
		var html = "";
		var newsFeedEntries = newsFeedData && Array.isArray(newsFeedData.entries) ? newsFeedData.entries : [];
		// Limit for the number of items to display
		var limit;

		if (limit > newsFeedEntries.length) {
			limit = newsFeedEntries.length;
		} else {
			limit = limit || 4;
		}

		for (var i = limit-1; i >= 0; i--) {
			// Effectively reversing the object item order
			var n = limit - i - 1;

			// Building-out the HTML string
			html = html + "<h3><a href='" + newsFeedEntries[n].link + "'>" + newsFeedEntries[n].title + "</a></h3>" + "<p>" + newsFeedEntries[n].contentSnippet + "</p>";
		};

		insertFeed(elementId, html);
	}

	function insertFeed(elementId, html) {
		document.getElementById(elementId).innerHTML = html;
	}

	function parseRSS(url, callback, elementId) {
		$.ajax({
			url: document.location.protocol + "//ajax.googleapis.com/ajax/services/feed/load?v=1.0&num=10&callback=?&q=" + encodeURIComponent(url),
			dataType: "json",
			success: function(data) {
				callback(data.responseData ? data.responseData.feed : null, elementId, 3);
			}
		});
	}

	domReady(function() {
		common.checkUserCreationEnabled();

		var doc = $(document);
		var pos = $("#tryIt").offset().top;
		var buttonClone = $("#tryIt").clone();
		var buttonWidthOriginal = $("#tryIt").outerWidth();
		var btnOffset = ($("body").width() > 640) ? 10 : 0;

		var signinBtn = $("#signinBtn");

		if (common.getRedirect()) {
			signinBtn.attr("href", signinBtn.attr("href") + "?redirect=" + common.getRedirect());
		}

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

		// Listen for resize changes
		window.addEventListener("resize", function() {
			// Get screen size (inner/outerWidth, inner/outerHeight)
			pos = $(".buttonClone").length ? $(".buttonClone").offset().top : pos;
		}, false);

		// Listen for orientation changes
		window.addEventListener("orientationchange", function() {
			// Get screen size (inner/outerWidth, inner/outerHeight)
			pos = $(".buttonClone").length ? $(".buttonClone").offset().top : pos;
		}, false);

		// Parse and insert blogfeed
		parseRSS(newsRssFeedUrl, formHTML, "blogFeed");

		document.getElementById("powerEditorContainer").addEventListener("click", changeMainImage("powerEditorImage", "powerEditorContainer"));
		document.getElementById("versatileThemeContainer").addEventListener("click", changeMainImage("versatileThemeImage", "versatileThemeContainer"));
		document.getElementById("orionGitContainer").addEventListener("click", changeMainImage("orionGitImage", "orionGitContainer"));

		doc.on("scroll", function(e) {
			if ($(this).scrollTop() > pos - btnOffset) {
				var buttonWidth = $("body").width();
				$("#tryIt").addClass("fixed-button");
				buttonClone.removeAttr("id").addClass("buttonClone").css({"display" : "block", "visibility" : "hidden"}).appendTo(".orionExplained ~ p");
			} else {
				$("#tryIt").removeClass("fixed-button");
				$(".buttonClone").remove();
			}
		});
	});
});
