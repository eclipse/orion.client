/*******************************************************************************
 * Copyright (c) 2016, 2018 IBM Corporation and others.
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

var pbewithmd5anddes = {
	KDF: function (password, salt, iterations) {
		var pwd = new Buffer(password, 'utf-8');
		var key = Buffer.concat([pwd, salt]);
		var i;
		for (i = 0; i < iterations; i += 1) {
			key = crypto.createHash("md5").update(key).digest();
		}
		return key;
	},
	getKeyIV: function (password, salt, iterations) {
		var key = this.KDF(password, salt, iterations);
		var keybuf = new Buffer(key, 'binary').slice(0, 8);
		var ivbuf = new Buffer(key, 'binary').slice(8, 16);
		return [keybuf, ivbuf];
	},
	decrypt: function(payload,password,salt,iterations) {
		var encryptedBuffer = new Buffer(payload,'base64');
		var kiv = this.getKeyIV(password,salt,iterations);
		var decipher = crypto.createDecipheriv('des', kiv[0],kiv[1]);
		var decrypted = [];
		decrypted.push(decipher.update(encryptedBuffer));
		decrypted.push(decipher.final());
		return decrypted.join('');
	},
	encrypt: function(payload,password,salt,iterations) {
		var kiv = this.getKeyIV(password,salt,iterations);
		var cipher = crypto.createCipheriv('des', kiv[0],kiv[1]);
		var encrypted = [];
		encrypted.push(cipher.update(payload,'utf-8','hex'));
		encrypted.push(cipher.final('hex'));
		return new Buffer(encrypted.join(''),'hex').toString('base64');
	}
};

var SALT_SEPARATOR = ",";

module.exports = {
	encrypt: function(text, password, salt) {
		var _salt = salt ? new Buffer(salt,'utf-8') : crypto.randomBytes(8);
		var encrypted = pbewithmd5anddes.encrypt(text, password, _salt, 1024);
		if (salt) return encrypted;
		return _salt.toString('base64') + SALT_SEPARATOR + encrypted;
	},
	decrypt: function(encryptedText, password, salt) {
		var _salt = salt ? new Buffer(salt,'utf-8') : null, saltPos = -1;
		if (!_salt) {
			saltPos = encryptedText.indexOf(SALT_SEPARATOR);
			if(saltPos === -1){
				return encryptedText; //in this case, the secret wasn't encrypted.
			}
			_salt = new Buffer(encryptedText.substring(0, saltPos), 'base64');
		}
		var encryptedPassword = encryptedText.substring(saltPos + 1);
		return pbewithmd5anddes.decrypt(encryptedPassword, password, _salt, 1024);
	},
	/**
	 * Generates an auth token of the given number of bytes
	 * @param {number} bytes The number of bytes in length to make the token
	 * @param {fn} callback The callback to be called with the new auth token
	 * @since 18.0
	 */
	generateAuthToken: function generateAuthToken(bytes, callback) {
		crypto.randomBytes(bytes, function(err, randomBytes) {
			if(err) {
				return callback(err);
			}
			callback(null, randomBytes.toString('hex'));
		});
	}
};
