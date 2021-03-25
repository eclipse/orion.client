/*******************************************************************************
  * @license
 * Copyright (c) 2013 IBM Corporation and others.
 * All rights reserved. This program and the accompanying materials are made 
 * available under the terms of the Eclipse Public License 2.0 
 * (http://www.eclipse.org/legal/epl-v10.html), and the Eclipse Distribution 
 * License v1.0 (http://www.eclipse.org/org/documents/edl-v10.html). 
 * 
 * Contributors: IBM Corporation - initial API and implementation
 ******************************************************************************/

/*eslint-env browser,amd*/
require([
	"cfui/plugins/cFDeployService",
	"orion/serviceregistry",
	'orion/fileClient',
	'orion/projectClient',
	'orion/cfui/cFClient',
	"orion/plugin", 
	"i18n!cfui/nls/messages"
], function(CFDeployService,  mServiceRegistry, mFileClient, mProjectClient, CFClient, PluginProvider, messages){
	
	var serviceRegistry = new mServiceRegistry.ServiceRegistry();
	var provider = new PluginProvider({
		name: "Cloud Foundry Deploy",
		version: "1.0",
		description: "This plug-in integrates with Cloud Foundry."
	}, serviceRegistry);
		
	var fileClient = new mFileClient.FileClient(serviceRegistry);
	var projectClient = new mProjectClient.ProjectClient(serviceRegistry, fileClient);
	var cFService = new CFClient.CFService();
	provider.registerServiceProvider("orion.project.deploy",
		new CFDeployService({serviceRegistry: serviceRegistry, fileClient: fileClient, projectClient: projectClient, cFService: cFService}),
		{
			id: "org.eclipse.orion.client.cf.deploy",
			deployTypes: ["Cloud Foundry"],
			name: messages["createNew"],
			tooltip: messages["createNewTooltip"],
			validationProperties: [{source: "NoShow" }],
			logLocationTemplate: "{+OrionHome}/cfui/logs.html#{Name,Target*}",
			priorityForDefault: 9
		});

	function GenericDeploymentWizard(){}
	GenericDeploymentWizard.prototype = {
		constructor : GenericDeploymentWizard,
		
		getInitializationParameters : function(){
			return {
				LocationTemplate : "{+OrionHome}/cfui/plugins/wizards/generic/genericDeploymentWizard.html",
				Width : "478px",
				Height : "490px"
			};
		}
	};
	var genericDeploymentWizard = new GenericDeploymentWizard();
	provider.registerServiceProvider("orion.project.deploy.wizard", genericDeploymentWizard, {
		id : "org.eclipse.orion.client.cf.wizard.generic"
	});
			
	provider.connect();
});
