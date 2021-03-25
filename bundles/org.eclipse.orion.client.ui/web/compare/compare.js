/*******************************************************************************
 * @license
 * Copyright (c) 2011, 2012 IBM Corporation and others. All rights reserved. This
 * program and the accompanying materials are made available under the terms of
 * the Eclipse Public License 2.0 (http://www.eclipse.org/legal/epl-v10.html),
 * and the Eclipse Distribution License v1.0
 * (http://www.eclipse.org/org/documents/edl-v10.html).
 * 
 * Contributors: IBM Corporation - initial API and implementation
 ******************************************************************************/

/*eslint-env browser, amd*/
define(['orion/browserCompatibility', 'orion/bootstrap', 'orion/Deferred', 'orion/status', 'orion/progress', 'orion/operationsClient', 'orion/commandRegistry', 'orion/fileClient', 'orion/searchClient', 'orion/globalCommands',
		'orion/compare/compareCommands', 'orion/compare/resourceComparer', 'orion/widgets/themes/ThemePreferences', 'orion/widgets/themes/editor/ThemeData', 'orion/compare/compareUtils', 'orion/contentTypes', 'orion/PageUtil', 'i18n!orion/compare/nls/messages'],
		function(mBrowserCompatibility, mBootstrap, Deferred, mStatus, mProgress, mOperationsClient, mCommandRegistry, mFileClient, mSearchClient, mGlobalCommands, mCompareCommands, mResourceComparer, mThemePreferences, mThemeData, mCompareUtils, mContentTypes, PageUtil, messages) {
	mBootstrap.startup().then(function(core) {
		var serviceRegistry = core.serviceRegistry;
		var preferences = core.preferences;
		var commandService = new mCommandRegistry.CommandRegistry({ });
		// File operations
		var fileClient = new mFileClient.FileClient(serviceRegistry);
		var contentTypeService = new mContentTypes.ContentTypeRegistry(serviceRegistry);
		var searcher = new mSearchClient.Searcher({
			serviceRegistry: serviceRegistry, commandService: commandService, fileService: fileClient
		});
		var operationsClient = new mOperationsClient.OperationsClient(serviceRegistry);
		var statusService = new mStatus.StatusReportingService(serviceRegistry, operationsClient, "statusPane", "notifications", "notificationArea"); //$NON-NLS-2$ //$NON-NLS-1$ //$NON-NLS-0$
		var progressService = new mProgress.ProgressService(serviceRegistry, operationsClient, commandService);
		var themePreferences = new mThemePreferences.ThemePreferences(preferences, new mThemeData.ThemeData());
		themePreferences.apply();
		mGlobalCommands.generateBanner("orion-compare", serviceRegistry, commandService, preferences, searcher); //$NON-NLS-0$
		mGlobalCommands.setPageTarget({
			task: messages["Compare"],
			serviceRegistry: serviceRegistry,
			commandService: commandService
		});
		var diffProvider = new mResourceComparer.DefaultDiffProvider(serviceRegistry);
		var cmdProvider = new mCompareCommands.CompareCommandFactory({commandService: commandService, commandSpanId: "pageNavigationActions"}); //$NON-NLS-0$
		
		var startWithFileNames = function(fileNames, compareParams){
				var options = {
					newFileName: fileNames ? fileNames[0] : undefined,
					oldFileName: fileNames ? fileNames[1] : undefined,
					readonly: compareParams.readonly === "true", //$NON-NLS-0$
					readonlyRight: typeof compareParams.readonlyRight === "undefined" || compareParams.readonlyRight === "true", //$NON-NLS-1$ //$NON-NLS-0$
					generateLink: true,
					hasConflicts: compareParams.conflict === "true", //$NON-NLS-0$
					diffProvider: diffProvider,
					searcher: searcher,
					resource: compareParams.resource,
					compareTo: compareParams.compareTo
				};
				var viewOptions = {
					parentDivId: "compareContainer", //$NON-NLS-0$
					commandProvider: cmdProvider,
					showTitle: true,
					showLineStatus: true,
					blockNumber: typeof compareParams.block === "undefined" ? 1 : compareParams.block, //$NON-NLS-0$
					changeNumber: typeof compareParams.change === "undefined" ? 0 : compareParams.change //$NON-NLS-0$
				};
				var comparer = new mResourceComparer.ResourceComparer(serviceRegistry, commandService, options, viewOptions);
				comparer.start();
		};
		
		var startWidget = function(){
			var compareParams = PageUtil.matchResourceParameters();
			var resolveFileNames;
			if(compareParams.compareTo) {
				resolveFileNames =  Deferred.all([fileClient.read(compareParams.resource, true), 
									fileClient.read(compareParams.compareTo, true)], 
									function(/*error*/) { startWithFileNames(null, compareParams); }).then( function(metadatas) {
										var fileNames = null;
										if(metadatas.length === 2) {
											fileNames = metadatas.map(function (metadata) {return mCompareUtils.fullNameByMeta(metadata);});
										}
										return new Deferred().resolve(fileNames);
									});
			} else {
				resolveFileNames =  diffProvider.getComplexFileURL(compareParams.resource).then(function (json){
					if(json.New || json.NewLocation) {
						return Deferred.all([fileClient.read(json.New || json.NewLocation, true)], 
											function(/*error*/) {
												startWithFileNames(null, compareParams); 
											}).then( function(metadatas) {
												var fileNames = null;
												if(metadatas.length === 1) {
													fileNames = metadatas.map(function (metadata) {return mCompareUtils.fullNameByMeta(metadata);});
												}
												return new Deferred().resolve(fileNames ? [fileNames[0], fileNames[0]] : null);
											});
						
					} else {
						return new Deferred().resolve();
					}
				});
			}
			resolveFileNames.then(function (fileNames) {
				startWithFileNames(fileNames, compareParams);
			});
		};
		startWidget();
		// every time the user manually changes the hash, we need to reastart the compare widget.
		window.addEventListener("hashchange", function() { //$NON-NLS-0$
			startWidget();
		}, false);		
	});
});
