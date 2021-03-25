/*******************************************************************************
 * @license
 * Copyright (c) 2012 IBM Corporation and others.
 * All rights reserved. This program and the accompanying materials are made 
 * available under the terms of the Eclipse Public License 2.0 
 * (http://www.eclipse.org/legal/epl-v10.html), and the Eclipse Distribution 
 * License v1.0 (http://www.eclipse.org/org/documents/edl-v10.html). 
 * 
 * Contributors: IBM Corporation - initial API and implementation
 ******************************************************************************/
/*eslint-env browser, amd*/
define(["orion/plugin", "i18n!myMessageBundle/nls/cmdMessages"], function(PluginProvider, messages) {
	var provider = new PluginProvider({
		name: "3rd party i18n NLS test", //$NON-NLS-0$
		description: "Testing translation from a plugin" //$NON-NLS-0$
	});
	var commandName = messages.MyCommandName,
	    commandTooltip = messages.MyCommandTooltip;

	provider.registerService("orion.edit.command", { //$NON-NLS-0$
		run: function() {
			return messages["MyInsertedText"]; //$NON-NLS-0$
		}
	}, {
		id: "example.nls.textsetter", //$NON-NLS-0$
		name: commandName,
		tooltip: commandTooltip,
	});
	provider.connect();
});
