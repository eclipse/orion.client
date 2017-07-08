define([
	"orion/plugin",
	'i18n!collab/nls/collabmessages', 
	"orion/Deferred", 
	"orion/i18nUtil",
	'orion/EventTarget',
	"orion/collab/collabFileImpl",
	"plugins/filePlugin/fileImpl"
], function(PluginProvider, messages, Deferred, i18nUtil, EventTarget, collabFileImpl, FileServiceImpl) {
		var headers = {
			name: "Orion Collaboration Support",
			version: "1.0",
			description: "This plug-in provides Orion collaboration feature."
		};
		var provider = new PluginProvider(headers);
		var collabBase = new URL("../../sharedWorkspace/tree", location.href).pathname;
		var service = new collabFileImpl(collabBase);
		// var service = new FileServiceImpl('/sharedWorkspace/tree', '/sharedWorkspace/tree');
		provider.registerService("orion.core.file", service, {
			Name: messages["SharedWorkspace"],
			top: collabBase,
			pattern: collabBase
		});

		provider.connect();
});
