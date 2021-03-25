/*******************************************************************************
 * Copyright (c) 2017 IBM Corporation and others.
 * All rights reserved. This program and the accompanying materials are made 
 * available under the terms of the Eclipse Public License 2.0 
 * (http://www.eclipse.org/legal/epl-v10.html), and the Eclipse Distribution 
 * License v1.0 (http://www.eclipse.org/org/documents/edl-v10.html). 
 *
 * Contributors:
 *	 IBM Corporation - initial API and implementation
 *******************************************************************************/

/**
 * @fileoverview
 * A post-install script to install all debug adapters.
 * 
 * To work with npm v3+ with flattened package, all adapters have to be
 * installed separately instead of being installed as an npm module.
 */

'use strict';

var fs = require('fs');
var exec = require('child_process').exec;
var adapters = require('./adapters.json');
var adapterNames = Object.keys(adapters);
var installedIndex = -1;

process.stdout.write('Installing debugger adapters...\n');

try {
    fs.statSync('adapters');
} catch (ex) {
    fs.mkdirSync('adapters');
}

process.chdir('adapters');

installNext();

function installNext() {
    installedIndex++;
    if (installedIndex >= adapterNames.length) {
        // All done
        process.stdout.write('All debugger adapters have been installed.\n');
        process.chdir('..');
        process.exit(0);
    }
    var packageName = adapterNames[installedIndex];
    var packageInfo = adapters[packageName];
    if (typeof packageInfo === "string") {
        packageInfo = {
            repository: packageInfo
        };
    }
    var packageGit = packageInfo.repository;
    var packageBuild = packageInfo.build;
    process.stdout.write(' - Installing ' + packageName + '...');
    var exist = true;
    try {
        fs.statSync(packageName);
    } catch (ex) {
        exist = false;
    }
    if (exist) {
        process.stdout.write(' Existing.\n');
        installNext();
        return;
    }
    exec('git clone ' + packageGit + ' ' + packageName + ' --depth 1', function(err) {
        if (err) {
            process.stderr.write('Error when cloning: ' + packageName + '@' + packageGit + ':\n');
            process.stderr.write(JSON.stringify(err));
            process.stderr.write('\n');
            installNext();
        } else {
            process.chdir(packageName);
            exec('npm install', function(err) {
                if (err) {
                    process.stderr.write('Error when installing: ' + packageName + '@' + packageGit + ':\n');
                    process.stderr.write(JSON.stringify(err));
                    process.stderr.write('\n');
                    process.stdout.write(' Done.\n');
                    process.chdir('..');
                    installNext();
                    return;
                }
                if (packageBuild) {
                    exec(packageBuild, function(err) {
                        if (err) {
                            process.stderr.write('Error when Building: ' + packageName + '@' + packageGit + ':\n');
                            process.stderr.write(JSON.stringify(err));
                            process.stderr.write('\n');
                        }
                        process.stdout.write(' Done.\n');
                        process.chdir('..');
                        installNext();
                    });
                } else {
                    process.stdout.write(' Done.\n');
                    process.chdir('..');
                    installNext();
                }
            });
        }
    });
}
