/*******************************************************************************
 * Copyright (c) 2017, 2019 IBM Corporation and others.
 * All rights reserved. This program and the accompanying materials are made 
 * available under the terms of the Eclipse Public License 2.0 
 * (http://www.eclipse.org/legal/epl-v10.html), and the Eclipse Distribution 
 * License v1.0 (http://www.eclipse.org/org/documents/edl-v10.html). 
 *
 * Contributors:
 *     IBM Corporation - initial API and implementation
 *******************************************************************************/
/*eslint-env mocha */
const assert = require("assert"),
	fs = require("fs"),
	path = require("path"),
	cfIgnore = require("../../lib/cf/cfIgnore");
	
var relativePathList = []; // path(relative Path to test against), expect(true if it should be ignored)
describe("Test CFIgnore API", function() {
	before("prepare test data", function(done){
		// for default files
		relativePathList = relativePathList.concat([{
			path: ".git/123",
			expect: true
		}, {
			path: "asd/.git/123",
			expect: true
		}, {
			path: ".cfignore",
			expect: true
		}, {
			path: "asd/app.js",
			expect: false
		}, {
			path: "server.js",
			expect: false
		}, {
			path: "manifest.yml",
			expect: true
		}, {
			path: "public/assets/manifest.yml",
			expect: false
		}]);
		
		// for rule: 'zxc*'
		relativePathList = relativePathList.concat([{
			path: "zxc/123",
			expect: true // different from .gitignore where * doesn't match slash
		}, {
			path: "zxcasd",
			expect: true
		}, {
			path: "zxc456/123",
			expect: true
		}, {
			path: "123/zxcasd.js",
			expect: true
		}, {
			path: "123zxcfd",
			expect: false
		}]);
		
		// for rule: 'poi'
		relativePathList = relativePathList.concat([{
			path: "123poi",
			expect: false
		}, {
			path: "poi/123",
			expect: true
		}, {
			path: "poi",
			expect: true
		}, {
			path: "poi.js",
			expect: false
		}, {
			path: "poiasd",
			expect: false
		}, {
			path: "345/poi/123",
			expect: true
		},{
			path: "123/poi",
			expect: true
		}]);
		
		// for rule: 'qwe/'
		relativePathList = relativePathList.concat([{
			path: "qwe/123",
			expect: true
		}, {
			path: "qwer/123",
			expect: false
		}, {
			path: "tyu/qwe/123",
			expect: true
		}, {
			path: "qwe",
			expect: true //this is a bit unexpected, but it is ignored
		}, {
			path: "qwe/123/456",
			expect: true
		}]);
		
		// for rule: 'tyt*/'
		relativePathList = relativePathList.concat([{
			path: "tytasd/123",
			expect: true
		}, {
			path: "tyt/123",
			expect: true
		}, {
			path: "tytfile",
			expect: true  // trailing slash doesn't mean this has to be a folder, wield but this is how it works
		}, {
			path: "123tytasd/123",
			expect: false
		}]);
		
		// for rule: '*jkl'
		relativePathList = relativePathList.concat([{
			path: "asdjkl",
			expect: true
		}, {
			path: "asdjkl.js",
			expect: false
		}, {
			path: "jkl",
			expect: true 
		}, {
			path: "jkl/123",
			expect: true
		}, {
			path: "jjjjkl/123",
			expect: true
		}, {
			path: "jkl123/123",
			expect: false
		}, {
			path: "123/jkl/123",
			expect: true
		}, {
			path: "123/jklm/123",
			expect: false
		}]);
		
		// for rule: '**jkm'
		relativePathList = relativePathList.concat([{
			path: "asdjkm",
			expect: true
		}, {
			path: "asdjkm.js",
			expect: false
		}, {
			path: "jkm",
			expect: true 
		}, {
			path: "jkm/123",
			expect: true
		}, {
			path: "jjjjkm/123",
			expect: true
		}, {
			path: "jkm123/123",
			expect: false
		}, {
			path: "123/jkm/123",
			expect: true
		}, {
			path: "123/jkm4/123",
			expect: false
		}]);
		
		// for rule: 'c*v'
		relativePathList = relativePathList.concat([{
			path: "cv",
			expect: true
		}, {
			path: "cav",
			expect: true
		},{
			path: "caasdv",
			expect: true
		}, {
			path: "cafv/123",
			expect: true 
		}, {
			path: "123/cav",
			expect: true
		}, {
			path: "123/cafv/123",
			expect: true
		}, {
			path: "acgv",
			expect: false
		}, {
			path: "cva",
			expect: false
		}, {
			path: "c/mnb/v",
			expect: false
		}, {
			path: "c/v",
			expect: false
		}, {
			path: "c/v/b",
			expect: false
		}]);
		
		// for rule: 'b**n'
		relativePathList = relativePathList.concat([{
			path: "bn",
			expect: true
		}, {
			path: "ban",
			expect: true
		},{
			path: "baasdn",
			expect: true
		}, {
			path: "bafn/123",
			expect: true 
		}, {
			path: "123/ban",
			expect: true
		}, {
			path: "123/bafn/123",
			expect: true
		}, {
			path: "abgn",
			expect: false
		}, {
			path: "bna",
			expect: false
		}, {
			path: "b/zxc/n",
			expect: true
		}, {
			path: "b/n",
			expect: true
		}, {
			path: "b/n/z",
			expect: true
		}]);
		
		// for rule: 'r/**/i'
		relativePathList = relativePathList.concat([{
			path: "r123i",
			expect: false
		}, {
			path: "r/a/i",
			expect: true
		},{
			path: "r/i",
			expect: false
		}, {
			path: "r/1/2/i",
			expect: true 
		}]);
		
		// for rule: 'd/*.html'
		relativePathList = relativePathList.concat([{
			path: "d/asd.html",
			expect: true
		}, {
			path: "asd.html",
			expect: false
		}, {
			path: "dasd.html",
			expect: false
		}, {
			path: "123/d/asd.html",
			expect: true
		}, {
			path: "d/q/asd.html",
			expect: false 
		}]);
		
		// for rule: '/tmp'
		relativePathList = relativePathList.concat([{
			path: "tmp.js",
			expect: false
		}, {
			path: "tmp",
			expect: true
		}, {
			path: "123/tmp",
			expect: false
		}, {
			path: "tmp/123",
			expect: true
		}]);
		
		// for rule: '**/jjj'
		relativePathList = relativePathList.concat([{
			path: "jjj",
			expect: true
		}, {
			path: "123/jjj",
			expect: true
		}, {
			path: "jjj/123",
			expect: true
		}, {
			path: "123/kkk/jjj",
			expect: true
		}, {
			path: "123/kkk/lll/jjj",
			expect: true
		}, {
			path: "123rjjj",
			expect: false
		}, {
			path: "123/jjj/123",
			expect: true
		}, {
			path: "123/jjj123/123",
			expect: false
		},]);
		
		// for rule: '/**qqq'
		relativePathList = relativePathList.concat([{
			path: "qqq",
			expect: true
		},{
			path: "123qqq",
			expect: true
		}, {
			path: "123/qqq",
			expect: true
		}, {
			path: "123/123qqq",
			expect: true
		}, {
			path: "123/kkk/qqq",
			expect: true
		}, {
			path: "123/kkk/lll/123qqq",
			expect: true
		}, {
			path: "123/qqq/123",
			expect: true
		}, {
			path: "123/asdqqq/123",
			expect: true
		}, {
			path: "123/asdqqq123/123",
			expect: false
		}]);
		
		// for rule: '/*ooo'
		relativePathList = relativePathList.concat([{
			path: "ooo",
			expect: true
		},{
			path: "123ooo",
			expect: true
		}, {
			path: "123/ooo",
			expect: false
		}, {
			path: "123/123ooo",
			expect: false
		}, {
			path: "123/kkk/ooo",
			expect: false
		}, {
			path: "123/kkk/lll/123ooo",
			expect: false
		}, {
			path: "123/ooo/123",
			expect: false
		}, {
			path: "123/asdooo/123",
			expect: false
		}, {
			path: "123/asdooo123/123",
			expect: false
		}]);
		
		// for rule: 'si*qu*'
		relativePathList = relativePathList.concat([{
			path: "si123qu123",
			expect: true
		}, {
			path: "siqu",
			expect: true
		}, {
			path: "123sidqud",
			expect: false
		}, {
			path: "sizxcqu/123",
			expect: true
		}, {
			path: "sizxcqu123/123",
			expect: true
		}, {
			path: "123/123sidqud",
			expect: false
		}, {
			path: "si123qu/234/123",
			expect: true
		}]);
		
		// for rule: 'zx*90**/'
		relativePathList = relativePathList.concat([{
			path: "zx12390asd",
			expect: true
		}, {
			path: "zx12390as1/123",
			expect: true
		}, {
			path: "zx90",
			expect: true
		}, {
			path: "zx12390/asd/123",
			expect: true
		}, {
			path: "123/zx12390/asd/123",
			expect: true
		}, {
			path: "123/zx12390asd",
			expect: true
		}]);
		
		// for rule: dir1/**/*.so
		relativePathList = relativePathList.concat([{
			path: "dir1/dir2/dir3/file1.so",
			expect: true
		}, {
			path: "different-dir/dir2/file.so",
			expect: false
		}]);
		
		// for rule: stuff/*; !stuff/*.c ;stuff/exclude.c applies the patterns in order from top to bottom
		relativePathList = relativePathList.concat([{
			path: "stuff/something.txt",
			expect: true
		}, {
			path: "stuff/exclude.c",
			expect: true
		}, {
			path: "stuff/include.c",
			expect: false
		}]);
		
		// create a .cfignore file in support directory
		var cfIngoreContent = [
			"#This is cf Ignore file",
			
			"zxc*",
			"poi",
			"qwe/",
			"tyt*/",
			"*jkl",
			"**jkm",
			"c*v",
			"b**n",
			"r/**/i",
			"d/*.html",
			"/tmp",
			"**/jjj",
			"/**qqq",
			"/*ooo",
			"si*qu*",
			"zx*90**/",
			
			"dir1/**/*.so",
			
			"stuff/*",
			"!stuff/*.c",
			"stuff/exclude.c",

		];
		fs.writeFile(path.join(__dirname, "../support/.cfignore"), cfIngoreContent.join("\n"), "utf-8", function(err){
			done();
		});
	});
	
	after("clean cfignore file", function(done){
		fs.unlink(path.join(__dirname, "../support/.cfignore"), done);
	});
	
	it("Test CFIgnore API", function() {
		var cFIgnoreManager = new cfIgnore.CFIgnoreManager();
		return cFIgnoreManager.loadCfIgnoreFile(path.join(__dirname, "../support/"))
		.then(function(){
			var filter = cFIgnoreManager.generateFilter();
			for(var i = 0; i < relativePathList.length -1; i++){
				try{
					assert.equal(filter(relativePathList[i].path), relativePathList[i].expect, relativePathList[i].path + " is not respected by cf ignore rules");
				}catch(err){
					console.error(err.message);
					continue;
				}
			}
			return;
		});
	});
});
