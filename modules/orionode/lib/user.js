/*******************************************************************************
 * Copyright (c) 2016 IBM Corporation and others.
 * All rights reserved. This program and the accompanying materials are made 
 * available under the terms of the Eclipse Public License v1.0 
 * (http://www.eclipse.org/legal/epl-v10.html), and the Eclipse Distribution 
 * License v1.0 (http://www.eclipse.org/org/documents/edl-v10.html). 
 *
 * Contributors:
 *	 IBM Corporation - initial API and implementation
 *******************************************************************************/
/*eslint-env node*/

var express = require('express'),
	crypto = require('crypto'),
	passport = require('passport'),
	cookieParser = require('cookie-parser'),
	bodyParser = require('body-parser'),
	Promise = require('bluebird'),
	nodemailer = require('nodemailer'),
	fs = require('fs'),
	args = require('./args'),
	api = require('./api'),
	generator = require('generate-password'),
	log4js = require('log4js'),
	logger = log4js.getLogger("user"),
	jwt = require('jsonwebtoken');
	
var AUTH_TOKEN_BYTES = 48;
	
var CONFIRM_MAIL = "./multitenant/EmailConfirmation.txt",
	PWD_CONFIRM_RESET_MAIL = "./multitenant/EmailConfirmationPasswordReset.txt",
	PWD_RESET_MAIL = "./multitenant/PasswordReset.txt";

var CONFIRM_MAIL_AUTH = "/useremailconfirmation/verifyEmail?authToken=",
	RESET_PWD_AUTH = "/useremailconfirmation/resetPwd?authToken=";

function userJSON(user) {
	return {
		FullName: user.fullname,
		UserName: user.username,
		Location: "/users/" + user.username,
		Email: user.email,
		EmailConfirmed: user.isAuthenticated,
		HasPassword: true,
		OAuth: user.oauth || undefined,
		LastLoginTimestamp: user.login_timestamp ? user.login_timestamp.getTime() : 0,
		DiskUsageTimestamp: user.disk_usage_timestamp ? user.disk_usage_timestamp.getTime() : 0,
		DiskUsage: user.disk_usage || 0 ,
		jwt: user.jwt
	};
}

function logError(/*error..*/) {
	logger.error.apply(logger, arguments);
}

function sendMail(opt){
	var read = function(cb) {
		var emailText;
		fs.readFile(opt.template, 'utf8', function (err,data) {
			if (err) {
				return cb(err);
			}
			var authUrl = opt.req.protocol + '://' + opt.req.get('host') + opt.auth + opt.user.authToken;
			emailText  = data.replace(/<EMAIL>/g, opt.user.email || "");
			emailText  = emailText.replace(/<USER>/g, opt.user.username || "");
			emailText  = emailText.replace(/<URL>/g, authUrl);
			emailText  = emailText.replace(/<PASSWORD>/g, opt.pwd || "");
			var subjLineIndex = emailText.indexOf("\n");
			var subject = emailText.substr(0, subjLineIndex);
			var body = emailText.substr(subjLineIndex);
			cb(null, subject, body);
		});
	};
	read(function(err, subject, body){
		logError(err);
		var smtpConfig = {
			host: opt.options.configParams["mail.smtp.host"],
			port: opt.options.configParams["mail.smtp.port"],
			secure: true,
			auth: {
				user: opt.options.configParams["mail.smtp.user"],
				pass: opt.options.configParams["mail.smtp.password"]
			}
		};

		if (opt.options.configParams["mail.from"]) {
			var transport = nodemailer.createTransport(smtpConfig);
			var mailOptions = {
				from: opt.options.configParams["mail.from"],
				to: opt.user.email,
				subject: subject,
				text: body, 
			};
			transport.sendMail(mailOptions, function(error, info){
				if (error){
					return logger.info(error + " " + info);
				}
				//logger.info('Message sent: ' + info.response);
			});
		} else {
			// dev
			logger.info(body);
		}
	});
}

function metastore(req) {
	var ms = req.app.locals.metastore;
	if (!ms) {
		throw new Error("No metastore found");
	}
	return ms;
}

function doLogin(req, user, callback) {
	req.logIn(user, function(err) {
		if (err) {
			logError(err);
			return callback(err);
		}
		user.login_timestamp = Date.now();
		metastore(req).updateUser(user.username, user, function(err) {
			if (err) {
				logError(err);
				return callback(err);
			}
			callback(null);
		});
	});
}

module.exports.router = function(options) {
	var app = express.Router();
	app.use(bodyParser.json());
	app.use(bodyParser.urlencoded({ extended: false }));
	app.use(cookieParser());
	
	function canAddUsers() {
		return !options.configParams["orion.auth.user.creation"];
	}
	function isAdmin(username) {
		return (options.configParams["orion.auth.user.creation"] || "").split(",").some(function(user) {
			return user === username;
		});
	}
	function oauth(id, username, email, req, done) {
		if (req.params["0"] === "/link") {
			return done(null, {
				__linkUser: true,
				email: email,
				username: username,
				id: id
			});
		}
		metastore(req).getUserByOAuth(id, function(err, user) {
			if (err) {
				return done(err);
			}
			if (!user) {
				return done(null, {
					__newUser: true,
					email: email,
					username: username,
					id: id
				});
			}
			done(null, user);
		});
	}
	function createNewUser(req, res, err, user, info) {
		if (err) {
			logError(req.url, err);
			res.status(500).send("An internal error occurred");
			return;
		}
		if (user) {
			if (user.__newUser) {
				if (!canAddUsers()) {
					var errorUrl = "/mixloginstatic/LoginWindow.html?error=" +
						new Buffer("There is no Orion account associated with this Id. Please register or contact your system administrator for assistance.").toString('base64');
					return res.redirect(errorUrl);
				}
				var registerUrl = "/mixloginstatic/LoginWindow.html";
				registerUrl += "?oauth=create&email=" + user.email;
				registerUrl += "&username=" + user.username;
				registerUrl += "&identifier=" + user.id;
				return res.redirect(registerUrl);
			} else if (user.__linkUser) {
				return res.status(200).send("<html><head></head><body onload=\"window.opener.handleOAuthResponse('" + user.id + "');window.close();\"></body></html>");
			}
		}
		doLogin(req, user, function(err) {
			if (err) {
				return res.status(500).json({ Severity: "Error", Message: "Problem logging in" });
			}
			return res.redirect("/");
		});
	}

	if (options.configParams["orion.oauth.google.client"]) {
		var GoogleStrategy = require('passport-google-oauth20').Strategy;
		passport.use(new GoogleStrategy({
			clientID: options.configParams["orion.oauth.google.client"],
			clientSecret: options.configParams["orion.oauth.google.secret"],
			passReqToCallback: true,
			callbackURL: (options.configParams["orion.auth.host"] || "") + "/auth/google/callback",
			scope: "openid email"
		}, /* @callback */ function(req, accessToken, refreshToken, profile, done) {
			var email = profile.emails[0].value;
			oauth(profile.provider + "/" + profile.id, email.split("@")[0], email, req, done);
		}));
		app.get('/login/oauth/google', passport.authenticate('google'));
		app.get('/mixlogin/manageoauth/oauth/google', passport.authenticate('google', {callbackURL: (options.configParams["orion.auth.host"] || "") + "/auth/google/callback/link"}));
		app.get('/auth/google/callback*', function(req, res) {
			return passport.authenticate('google', {callbackURL: (options.configParams["orion.auth.host"] || "") + "/auth/google/callback" + (req.params["0"] || "")}, function(err, user, info){
				createNewUser(req,res,err,user,info);
			})(req,res);
		});
	}

	if (options.configParams["orion.oauth.github.client"]) {
		var GithubStrategy = require('passport-github2').Strategy;
		passport.use(new GithubStrategy({
			clientID: options.configParams["orion.oauth.github.client"],
			clientSecret: options.configParams["orion.oauth.github.secret"],
			passReqToCallback: true,
			callbackURL: (options.configParams["orion.auth.host"] || "") + "/auth/github/callback",
			scope: "user:email"
		}, /* @callback */ function(req, accessToken, refreshToken, profile, done) {
			var email = profile.emails[0].value;
			oauth(profile.provider + "/" + profile.id, profile.username, email, req, done);
		}));
		app.get('/login/oauth/github', passport.authenticate('github'));
		app.get('/mixlogin/manageoauth/oauth/github', passport.authenticate('github', {callbackURL: (options.configParams["orion.auth.host"] || "") + "/auth/github/callback/link"}));
		app.get('/auth/github/callback*', function(req, res) {
			return passport.authenticate('github', {callbackURL: (options.configParams["orion.auth.host"] || "") + "/auth/github/callback" + (req.params["0"] || "")}, function(err, user, info){
				createNewUser(req,res,err,user,info);
			})(req,res);
		});
	}

	app.post('/logout', function(req, res){
		req.logout();
		res.end();
	});
	
	app.post('/login/form', function(req, res, next) {
		passport.authenticate('local', function(err, user, info) {
			if (err) { 
				return next(err);  
			}
			if (!user) {
				return api.writeResponse(401, res, null, {error: info.message});
			}
			doLogin(req, user, function(err) {
				if (err) {
					return next(err);
				}
				return res.status(200).end();
			});
		})(req, res, next);
	});

	function checkUserAccess(req, res, next) {
		if (!req.user || !(req.params.id === req.user.username || isAdmin(req.user.username))) {
			return res.status(403).end();
		}
		next();
	}

	app.get("/users", checkUserAccess, function(req,res) {
		var start = Math.max(0, Number(req.query.start)) || 0;
		var rows = Math.max(0, Number(req.query.rows)) || 20;
		metastore(req).getAllUsers(start, rows, function(err, users) {
			if (err) {
				return res.status(404).end();
			}
			start = Math.min(users.length, start);
			rows = Math.min(users.length, rows);
			var end = start + rows;
			var result = [];
			for (var i=start; i<end; i++) {
				result.push(userJSON(users[i]));
			}
			return api.writeResponse(200, res, null,{
				Users: result,
				UsersStart: start,
				UsersRows: rows,
				UsersLength: users.length
			});
		});
	});

	app.get("/users/:id", checkUserAccess, function(req,res){
		metastore(req).getUser(req.params.id, function(err, user) {
			if (err) return res.status(404).end();
			if (!user) {
				res.writeHead(400, "User not fount: " + req.params.id);
				return res.end();
			}
			return api.writeResponse(200, res, null, userJSON(user));
		});
	});

	app.put("/users/:id", checkUserAccess, function(req,res){
		var id = req.params.id;
		var store = metastore(req);
		store.getUser(id, function(err, user) {
			if (err) return res.status(404).end();
			if (!user) {
				res.writeHead(400, "User not found: " + req.params.id);
				return res.end();
			}
			var hasNewPassword = typeof req.body.Password !== "undefined";
			var promiseChain = Promise.resolve();
			// users other than admin have to know the old password to set a new one
			if (!isAdmin(id)) {
				//TODO
			}
			if (hasNewPassword) user.password = req.body.Password;
			if (typeof req.body.UserName !== "undefined") user.username = req.body.UserName;
			if (typeof req.body.FullName !== "undefined") user.fullname = req.body.FullName;
			if (typeof req.body.Email !== "undefined") user.email = req.body.Email;
			if (typeof req.body.OAuth !== "undefined") {
				promiseChain = promiseChain.then(function() {
					return new Promise(function(resolve, reject){
						store.getUserByOAuth(req.body.OAuth, function(err, existing) {
							if (err) {
								reject(err);
								return;
							}
							if (existing && existing.length) {
								res.writeHead(409, "This account is already linked to someone else");
								res.end();
								reject();
								return;
							}
							user.oauth = req.body.OAuth;
							resolve();
						});
					});
				});
			}
			promiseChain.then(function() {
				store.updateUser(id, user, function(err) {
					if (err) {
						return res.writeHead(400, "Failed to update: " + id);
					}
					return res.status(200).end();
				});
			}).catch(function(err) {
				if (err) {
					// Indicated unhandled error
					res.writeHead(500, "An internal error has occured");
					res.send();
				}
			});
		});
	});

	app.delete("/users/:id", checkUserAccess, function(req,res){
		metastore(req).deleteUser(req.params.id, function(err) {
			if (err) return res.status(400).end();
			return res.status(200).end();
		});
	});

	app.post("/users/:id", checkUserAccess, function(req,res){
		var id = req.params.id;
		var newPassword = req.body.Password;
		if (!newPassword) {
			return res.status(400).json({Message: "Password is required"});
		}
		var store = metastore(req);
		store.getUser(id, function(err, user) {
			if (err) return res.status(404).end();
			if (!user) {
				res.writeHead(400, "User not found: " + req.params.id);
				return res.end();
			}
			store.updateUser(id, { password: newPassword }, function(err, user) {
				if (err) {
					return res.writeHead(400, "Failed to update: " + req.params.id);
				}
				return res.status(200).end();
			});
		});
	});

	app.post('/users', function(req, res){
		// If there are admin accounts, only admin accounts can create users
		if (options.configParams["orion.auth.user.creation"] && !isAdmin(req.user && req.user.username)) {
			return res.status(403).end();
		}
		var userData = {
			username: req.body.UserName,
			email: req.body.Email,
			fullname: req.body.FullName,
			oauth: req.body.identifier,
			password: req.body.Password
		};
		var store = metastore(req);
		store.createUser(userData, function(err, user) {
			if (err) {
				return api.writeResponse(404, res, null, {Message: err.message});
			}
			if (options.configParams["orion.auth.user.creation.force.email"]) {
				sendMail({user: user, options: options, template: CONFIRM_MAIL, auth: CONFIRM_MAIL_AUTH, req: req});
			} else {
				user.isAuthenticated = true;	
			}
			return api.writeResponse(201, res, null, {error: "Created"});
		});
	});

	//auth token verify
	app.get('/useremailconfirmation/verifyEmail', function(req,res){
		var authToken = req.query.authToken;
		var store = metastore(req)
		store.confirmEmail(authToken, function(err, user) {
			if (err) {
				return logError(err);
			}
			return res.status(200).send("<html><body><p>Your email address has been confirmed. Thank you! <a href=\"" + ( req.protocol + '://' + req.get('host'))
			+ "\">Click here</a> to continue and login to your account.</p></body></html>");
		});
	});

	app.get('/useremailconfirmation/resetPwd', function(req,res){
		var authToken = req.query.authToken;
		var store = metastore(req);
		store.confirmEmail(authToken, function(err, user) {
			if (err) {
				return logError(err);
			}
			//generate pwd
			var password = generator.generate({
				length: 8,
				numbers: true,
				excludeSimilarCharacters:true
			});
			user.password = password;
			store.updateUser(user.username, user, function(err, user) {
				if (err) {
					return logError(err);
				}
				sendMail({user: user, options: options, template: PWD_RESET_MAIL, auth: "", req: req, pwd: password});
				return res.status(200).send("<html><body><p>Your password has been successfully reset. Your new password has been sent to the email address associated with your account.</p></body></html>");
			});
		});
	});

	app.post("/useremailconfirmation/cansendemails", /* @callback */ function(req, res){
		res.status(200).json({EmailConfigured: !!options.configParams["mail.smtp.host"]});
	});

	app.post('/useremailconfirmation', function(req, res){
		var store = metastore(req);
		var resetPwd = function(err, user) {
			if (err || !user) {
				res.writeHead(404, "User " +  (req.body.UserName || req.body.Email) + " not found");
				return res.end();
			}
			if (!user.isAuthenticated){
				res.writeHead(400, "Email confirmation has not completed. Please follow the instructions from the confirmation email in your inbox and then request a password reset again.");
				return res.end();
			}
			crypto.randomBytes(AUTH_TOKEN_BYTES, function(randomBytes) {
				store.updateUser(user.username, { authToken: randomBytes }, function(err, user) {
					if (err) {
						logError(err);
						res.status(500).json({ Severity: "Error", Message: "Error updating user" });
						return;
					}
					sendMail({user: user, options: options, template: PWD_CONFIRM_RESET_MAIL, auth: RESET_PWD_AUTH, req: req});
					return res.status(200).json({"Severity":"Info","Message":"Confirmation email has been sent.","HttpCode":200,"BundleId":"org.eclipse.orion.server.core","Code":0});
				});
			});
		};
		if (req.body.UserName) {
			store.getUser(req.body.UserName, resetPwd);
		} else if (req.body.Email) {
			store.getUserByEmail(req.body.Email, resetPwd);
		}
	});

	app.post('/login/canaddusers', /* @callback */ function(req, res) {
		return res.status(200).json({
			CanAddUsers: canAddUsers(), 
			ForceEmail: !!options.configParams["orion.auth.user.creation.force.email"], 
			RegistrationURI:options.configParams["orion.auth.registration.uri"] || undefined});
	});
	
	app.post('/login', function(req, res) {
		if (!req.user) {
			return res.status(200).end();
		}
		//add the web token with the response
		if (options.configParams["orion.jwt.secret"]) {
			req.user.jwt = jwt.sign({'username': req.user.username}, options.configParams["orion.jwt.secret"]);
		}
		var user = userJSON(req.user)
		return res.status(200).json(user);
	});
	
	return app;
};
