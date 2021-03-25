/*******************************************************************************
 * @license
 * Copyright (c) 2014, 2016 IBM Corporation and others.
 * All rights reserved. This program and the accompanying materials are made
 * available under the terms of the Eclipse Public License 2.0
 * (http://www.eclipse.org/legal/epl-v10.html), and the Eclipse Distribution
 * License v1.0 (http://www.eclipse.org/org/documents/edl-v10.html).
 *
 * Contributors: IBM Corporation - initial API and implementation
 ******************************************************************************/
/*eslint-env browser, amd*/
define([
], function() {

	var _services = [];
	var timingVars = Object.create(null);

	/**
	 * @name Metrics
	 * @description Creates a new instance of the metrics service
	 * @param {Object} serviceRegistry The backing service registry to register the new service with
	 * @param {Object} args An object of additional arguments
	 * @param {Array} serviceArray An array of logging services (optional; for use when no service registry is present) 
	 * @returns {Metrics} A new Metrics instance
	 * @since 12.0
	 */
	function Metrics(serviceRegistry, args, serviceArray) {
		var services = serviceArray || [];
		if (serviceRegistry) {
			var refs = serviceRegistry.getServiceReferences("orion.metrics"); //$NON-NLS-0$
			refs.forEach(function(current) {
				services.push(serviceRegistry.getService(current));
			});
		}
		
		/* the following definitions are from https://developers.google.com/analytics/devguides/collection/analyticsjs/pages */
		var href = window.location.protocol + '//' + window.location.hostname + window.location.pathname + window.location.search; //$NON-NLS-0$
		var page = window.location.pathname + window.location.search;
		var title = document.title;

		_services = services;
		_services.forEach(function(current) {
			current.pageLoad(href, page, title, args);
		});

		if (serviceRegistry) {
			serviceRegistry.registerService("orion.core.metrics.client", this); //$NON-NLS-1$
		}
	}
	
	/** @callback */
	function _logTiming(timingCategory, timingVar, timingValue, timingLabel) {
		_services.forEach(function(current) {
			current.logTiming(timingCategory, timingVar, timingValue, timingLabel);
		});
	}

	/** @callback */
	function _logAudit(action, type, value, error) {
		_services.forEach(function(current) {
			if (current.logAudit) {
				current.logAudit(action, type, value, error);
			}
		});
	}

	/** @callback */
	function _logEvent(category, action, label, value, details) {
		_services.forEach(function(current) {
			current.logEvent(category, action, label || "", value, details);
		});
	}

	/** @callback */
	function _logPageLoadTiming(timingVar, timingLabel) {
		/* 
		 * The level of window.performance implementation varies across the browsers,
		 * so check for the existence of all utilized functions up-front.
		 */
		if (window.performance) {
			 /* ensure that no more timings of this type are logged for this page */
			if (window.performance.getEntriesByName && window.performance.mark) {
				if (window.performance.getEntriesByName(timingVar).length) {
					return;
				}
				window.performance.mark(timingVar);
			} else {
				if (timingVars[timingVar]) {
					return;
				}
				timingVars[timingVar] = Date.now();				
			}
			_logTiming("page", timingVar, window.performance.now(), timingLabel); //$NON-NLS-0$
		}
	}
	
	Metrics.prototype = {
		/**
		 * @description Log a timing
		 * @function
		 * @param {String} timingCategory The name of the category to log to
		 * @param {String} timingVar The name of the variable to log to
		 * @param {Number} timingValue The timing to log
		 * @param {String} timingLabel A label for the new timing
		 */
		logTiming: function(timingCategory, timingVar, timingValue, timingLabel) {
			_logTiming(timingCategory, timingVar, timingValue, timingLabel);
		},
		/**
		 * @description Log an event
		 * @function
		 * @param {String} category The name of the category to log to
		 * @param {String} action The name of the action logged
		 * @param {String} label A label for the event
		 * @param {String} value The event value to log
		 * @param {String} details Additional details about the event being logged
		 */
		logEvent: function(category, action, label, value, details) {
			_logEvent(category, action, label, value, details);
		},
		/**
		 * @description Log how long it took to load a page
		 * @function
		 * @param {Number} timingVar The timing to log
		 * @param {String} timingLabel A label for the new timing
		 */
		logPageLoadTiming: function(timingVar, timingLabel) {
			_logPageLoadTiming(timingVar, timingLabel);
		},
		/**
		 * @description Log an audit event
		 * @function
		 * @param {String} action The name of the action logged
		 * @param {String} type The type of target acted upon
		 * @param {String} value The event value to log
		 */
		logAudit: function(action, type, value, error) {
			_logAudit(action, type, value, error);
		}
	};
	
	return {
		Metrics: Metrics,
		logTiming: _logTiming,
		logEvent: _logEvent,
		logAudit: _logAudit,
		logPageLoadTiming: _logPageLoadTiming
	};
});
