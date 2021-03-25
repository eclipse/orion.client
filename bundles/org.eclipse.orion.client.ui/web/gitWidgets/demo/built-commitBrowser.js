/*******************************************************************************
 * @license
 * Copyright (c) 2011, 2012 IBM Corporation and others.
 * All rights reserved. This program and the accompanying materials are made 
 * available under the terms of the Eclipse Public License 2.0 
 * (http://www.eclipse.org/legal/epl-v10.html), and the Eclipse Distribution 
 * License v1.0 (http://www.eclipse.org/org/documents/edl-v10.html). 
 *
 * Contributors:
 *     IBM Corporation - initial API and implementation
 *******************************************************************************/
/*eslint-env browser, amd*/
define(['gitWidgets/builder/commitBrowser'],
function(mCommitBrowser) {
	var commitBrowser = new mCommitBrowser("commitBrowser", "../../git/plugins/gitPlugin.html");
	commitBrowser.startup().then(function() {
		//How to get the 2th, 3th and 4th parameters for demo
		//Open the git repository page, select a commit from the history section
		//In the debugger, set a break point at the first line at GitRepositoryExplorer.prototype.displayDiffs function in GitRepositoryExplorer.js
		//Inspect "commit" param
		//2th param: commit.DiffLocation
		//3th param: commit.Parents[0].Name
		//4th param: commit.Name (optional)
		commitBrowser.displayCommit(null, "/gitapi/diff/d7cb9bb433a8fab1a509e4acb7cf059da8635a2d/file/libingw-OrionContent/OrionClient/", 
		"815951d96103ca75245f0849cc26afc24581dbb4", "d7cb9bb433a8fab1a509e4acb7cf059da8635a2d"); 
	});
});
