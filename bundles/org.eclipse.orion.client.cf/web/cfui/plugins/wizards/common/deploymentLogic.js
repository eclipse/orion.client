/*******************************************************************************
 * @license
 * Copyright (c) 2014, 2015 IBM Corporation and others.
 * All rights reserved. This program and the accompanying materials are made
 * available under the terms of the Eclipse Public License 2.0
 * (http://www.eclipse.org/legal/epl-v10.html), and the Eclipse Distribution
 * License v1.0 (http://www.eclipse.org/org/documents/edl-v10.html).
 *
 * Contributors: IBM Corporation - initial API and implementation
 ******************************************************************************/
/*eslint-env browser, amd*/
/*global URL*/
define([
	'i18n!cfui/nls/messages',
	'orion/Deferred',
	'orion/webui/dialogs/ConfirmDialog',
	'orion/i18nUtil',
	'cfui/cfUtil',
], function(messages, Deferred, mConfirmDialog, i18nUtil, mCfUtil){

	function _getManifestInstrumentation(manifestContents, results){
		manifestContents = manifestContents || { applications: [{}] };
		var manifestInstrumentation = {};

		if(!manifestContents.applications.length)
			manifestContents.applications.push({});

		if(manifestContents.applications[0].host !== results.host)
			manifestInstrumentation.host = results.host;
		
		if(manifestContents.applications[0].domain !== results.domain)
			manifestInstrumentation.domain = results.domain;

		var manifestServices = manifestContents.applications[0].services;
		var selectedServices = results.services;
		if ((!manifestServices || manifestServices.length === 0) && selectedServices.length > 0) {
			manifestInstrumentation.services = results.services;
		} else if (manifestServices && manifestServices.length !== selectedServices.length) {
			manifestInstrumentation.services = results.services;
		} else if (manifestServices && manifestServices.length === selectedServices.length) {
			for (var i=0; i<manifestServices.length; i++){
				if (manifestServices[i] !== selectedServices[i]){
					manifestInstrumentation.services = results.services;
					break;
				}
			}
		}

		var manifestCommand = manifestContents.applications[0].command || "";
		if(manifestCommand !== results.command && typeof results.command === "string") //$NON-NLS-0$
			manifestInstrumentation.command = results.command;
		
		var manifestPath = manifestContents.applications[0].path || "";
		if(manifestPath !== results.path && typeof results.path === "string") //$NON-NLS-0$
			manifestInstrumentation.path = results.path;
		
		var manifestBuildpack = manifestContents.applications[0].buildpack || "";
		if(manifestBuildpack !== results.buildpack && typeof results.buildpack === "string") //$NON-NLS-0$
			manifestInstrumentation.buildpack = results.buildpack;
		
		if(manifestContents.applications[0].memory !== results.memory && typeof results.memory === "string") //$NON-NLS-0$
			manifestInstrumentation.memory = results.memory;
		
		if(manifestContents.applications[0].instances !== results.instances && typeof results.instances !== "undefined") //$NON-NLS-0$
			manifestInstrumentation.instances = results.instances;

		var manifestTimeout = manifestContents.applications[0].timeout || "";
		if(manifestTimeout !== results.timeout && typeof results.timeout !== "undefined") //$NON-NLS-0$
			manifestInstrumentation.timeout = results.timeout;

		return manifestInstrumentation;
	}

	/**
	 * A utility trigger factory for Cloud Foundry deployment logic
	 * after the 'Deploy' button in a deployment wizard was clicked.
	 */
	function buildDeploymentTrigger(options){
		options = options || {};

		return function(results){
			var initialConfName = options.ConfName;
			var confName = results.ConfName;

			var disableUI = options.disableUI;
			var enableUI = options.enableUI;
			var showMessage = options.showMessage;
			var closeFrame = options.closeFrame;

			var postMsg = options.postMsg;
			var postError = options.postError;

			var fileService = options.FileService;
			var targetSelection = options.getTargetSelection();

			var userManifest = options.Manifest;
			var contentLocation = options.ContentLocation;
			var appPath = options.getManifestPath();

			var selection = targetSelection.getSelection();
			if(selection === null || selection.length === 0){
				closeFrame();
				return;
			}

			/* disable any UI at this point */
			disableUI();

			var instrumentation = _getManifestInstrumentation(userManifest, results);
			
			var appName = results.name;
			var target = selection;

			if (!confName){
				postError(new Error("Could not determine the launch config name"));
				return;
			}
			return checkContinue(fileService, contentLocation, initialConfName, confName).then(function(keepGoing) {
				if (!keepGoing) {
					enableUI();
					return;
				}

				showMessage(messages["saving..."]); //$NON-NLS-0$
				return mCfUtil.prepareLaunchConfigurationContent(confName, target, appName, appPath, instrumentation).then(
					function(launchConfigurationContent){
						postMsg(launchConfigurationContent);
					});
			}).then(null, function(error){
				postError(error, selection);
			});
		};
	}

	/**
	 * @returns {orion.Promise} resolving to boolean <tt>true</tt> if save should continue, <tt>false</tt> to abort
	 */
	function checkContinue(fileService, contentLocation, confNameInitial, confName) {
		if (confName === confNameInitial) {
			return new Deferred().resolve(true);
		}
		return launchConfigExists(fileService, contentLocation, confName).then(function(exists) {
			if (!exists) {
				return true;
			}
			return confirmOverwrite(confName);
		});
	}

	function confirmOverwrite(confName) {
		var confirmDialog = new mConfirmDialog.ConfirmDialog({
			title: messages["overwriteTitle"], //$NON-NLS-0$
			confirmMessage: i18nUtil.formatMessage(messages["overwriteConfirm"], confName), //$NON-NLS-0$
		});
		var d = new Deferred();
		confirmDialog.addEventListener("dismiss", function(event) { //$NON-NLS-0$
			d.resolve(event.value);
		});
		confirmDialog.show();
		return d;
	}

	/**
	 * @returns {orion.Promise} resolving to <tt>true</tt> if the config exists, otherwise <tt>false</tt>.
	 */
	function launchConfigExists(fileService, contentLocation, confName) {
		return readLaunchConfigsFolder(fileService, contentLocation).then(function(children){
			for(var i=0; i<children.length; i++){
				var childName = children[i].Name.replace(/\.launch$/, ""); //$NON-NLS-0$
				if (confName === childName){
					return true;
				}
			}
			return false;
		}, function(error) {
			if (error.status === 404 || error.status === 410) {
				return false;
			}
			throw error;
		});
	}

	/**
	 * Calculates a uniqe name for the launch config
	 * @returns {orion.Promise} resolving to String
	 */
	function uniqueLaunchConfigName(fileService, contentLocation, baseName) {
		return readLaunchConfigsFolder(fileService, contentLocation).then(function(children) {
			var counter = 0;
			for(var i=0; i<children.length; i++){
				var childName = children[i].Name.replace(/\.launch$/, ""); //$NON-NLS-0$
				if (baseName === childName){
					if (counter === 0) counter++;
					continue;
				}
				childName = childName.replace(baseName + "-", "");
				var launchConfCounter = parseInt(Number(childName), 10);
				if (!isNaN(launchConfCounter) && launchConfCounter >= counter)
					counter = launchConfCounter + 1;
			}
			return (counter > 0 ? baseName + "-" + counter : baseName);
		}, function(error){
			if (error.status === 404 || error.status === 410){
				return baseName;
			}
			throw error;
		});
	}

	/**
	 * @returns {orion.Promise} resolving to {File[]}. Rejects if launch configs folder does not exist.
	 */
	function readLaunchConfigsFolder(fileService, contentLocation) {
		return fileService.read(contentLocation + "launchConfigurations?depth=1", true).then(function(projectDir) {
			if (projectDir.Directory) {
				return projectDir.Children;
			}
			var msg = i18nUtil.formatMessage(messages["nameTaken"], "launchConfigurations"); //$NON-NLS-1$ //$NON-NLS-0$
			var error = new Error(msg);
			error.Message = msg;
			throw error;
		});
	}

	return {
		buildDeploymentTrigger : buildDeploymentTrigger,
		uniqueLaunchConfigName: uniqueLaunchConfigName,
	};
});
