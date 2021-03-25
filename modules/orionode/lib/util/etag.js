/*******************************************************************************
 * Copyright (c) 2016 IBM Corporation and others.
 * All rights reserved. This program and the accompanying materials are made 
 * available under the terms of the Eclipse Public License 2.0 
 * (http://www.eclipse.org/legal/epl-v10.html), and the Eclipse Distribution 
 * License v1.0 (http://www.eclipse.org/org/documents/edl-v10.html). 
 *
 * Contributors:
 *     IBM Corporation - initial API and implementation
 *******************************************************************************/
/*eslint-env node*/
var crypto = require("crypto");

// Returns a hash that Orion uses for calculating ETags.
//
//   var tag = ETag()
//   var readable = fs.createReadStream("foo.txt")
//   readable.pipe(tag)
//   readable.on("end", function() {
//     var value = tag.read() // The ETag value
//     tag.read()             // subsequent reads return null
//   })
function ETag() {
	var hash = crypto.createHash("sha1");
	hash.setEncoding("base64");
	return hash;
}

ETag.fromString = function(s) {
	var tag = ETag();
	tag.write(s);
	tag.end();
	return tag.read();
};

module.exports = ETag;
