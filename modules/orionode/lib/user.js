/*******************************************************************************
 * Copyright (c) 2016, 2017 IBM Corporation and others.
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
	Promise = require('bluebird'),
	nodemailer = require('nodemailer'),
	fs = require('fs'),
	api = require('./api'),
	generator = require('generate-password'),
	log4js = require('log4js'),
	logger = log4js.getLogger("user"),
	jwt = require('jsonwebtoken'),
	checkRights = require('./accessRights').checkRights
	responseTime = require('response-time');
	
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
			host: opt.options.configParams.get("mail.smtp.host"),
			port: opt.options.configParams.get("mail.smtp.port"),
			secure: true,
			auth: {
				user: opt.options.configParams.get("mail.smtp.user"),
				pass: opt.options.configParams.get("mail.smtp.password")
			}
		};

		if (opt.options.configParams.get("mail.from")) {
			var transport = nodemailer.createTransport(smtpConfig);
			var mailOptions = {
				from: opt.options.configParams.get("mail.from"),
				to: opt.user.email,
				subject: subject,
				text: body, 
			};
			transport.sendMail(mailOptions, function(error, info){
				if (error){
					return logger.error(error + " " + info);
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
	app.use(cookieParser());
	app.use(responseTime({digits: 2, header: "X-User-Response-Time", suffix: true}));
	
	function canAddUsers() {
		return !options.configParams.get("orion.auth.user.creation");
	}
	function isAdmin(username) {
		return (options.configParams.get("orion.auth.user.creation") || "").split(",").some(function(user) {
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
			return api.writeError(500, res, "An internal error has occured");
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
				return api.writeResponse(200, res, null, "<html><head></head><body onload=\"window.opener.handleOAuthResponse('" + user.id + "');window.close();\"></body></html>");
			}
		}
		doLogin(req, user, function(err) {
			if (err) {
				return api.writeError(500, res, "Problem logging in");
			}
			return res.redirect("/");
		});
	}

	if (options.configParams.get("orion.oauth.google.client")) {
		var GoogleStrategy = require('passport-google-oauth20').Strategy;
		passport.use(new GoogleStrategy({
			clientID: options.configParams.get("orion.oauth.google.client"),
			clientSecret: options.configParams.get("orion.oauth.google.secret"),
			passReqToCallback: true,
			callbackURL: (options.configParams.get("orion.auth.host") || "") + "/auth/google/callback",
			scope: "openid email"
		}, /* @callback */ function(req, accessToken, refreshToken, profile, done) {
			var email = profile.emails[0].value;
			oauth(profile.provider + "/" + profile.id, email.split("@")[0], email, req, done);
		}));
		app.get('/login/oauth/google', passport.authenticate('google'));
		app.get('/mixlogin/manageoauth/oauth/google', passport.authenticate('google', {callbackURL: (options.configParams.get("orion.auth.host") || "") + "/auth/google/callback/link"}));
		app.get('/auth/google/callback*', function(req, res) {
			return passport.authenticate('google', {callbackURL: (options.configParams.get("orion.auth.host") || "") + "/auth/google/callback" + (req.params["0"] || "")}, function(err, user, info){
				createNewUser(req,res,err,user,info);
			})(req,res);
		});
	}

	if (options.configParams.get("orion.oauth.github.client")) {
		var GithubStrategy = require('passport-github2').Strategy;
		passport.use(new GithubStrategy({
			clientID: options.configParams.get("orion.oauth.github.client"),
			clientSecret: options.configParams.get("orion.oauth.github.secret"),
			passReqToCallback: true,
			callbackURL: (options.configParams.get("orion.auth.host") || "") + "/auth/github/callback",
			scope: "user:email"
		}, /* @callback */ function(req, accessToken, refreshToken, profile, done) {
			var email = profile.emails[0].value;
			oauth(profile.provider + "/" + profile.id, profile.username, email, req, done);
		}));
		app.get('/login/oauth/github', passport.authenticate('github'));
		app.get('/mixlogin/manageoauth/oauth/github', passport.authenticate('github', {callbackURL: (options.configParams.get("orion.auth.host") || "") + "/auth/github/callback/link"}));
		app.get('/auth/github/callback*', function(req, res) {
			return passport.authenticate('github', {callbackURL: (options.configParams.get("orion.auth.host") || "") + "/auth/github/callback" + (req.params["0"] || "")}, function(err, user, info){
				createNewUser(req,res,err,user,info);
			})(req,res);
		});
	}

	app.post('/logout', options.authenticate, function(req, res){
		req.logout();
		api.writeResponse(null, res);
	});
	
	app.post('/login/form', options.authenticate, function(req, res, next) {
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
				return api.writeResponse(200, res);
			});
		})(req, res, next);
	});

	function checkUserAccess(req, res, next) {
		if (!req.user || !(req.params.id === req.user.username || isAdmin(req.user.username))) {
			return api.writeResponse(403, res);
		}
		var contextPath = options.configParams.get("orion.context.path") || "";
		var listenContextPath = options.configParams.get("orion.context.listenPath") || false;
		var uri = req.originalUrl.substring(listenContextPath ? contextPath.length : 0);
		checkRights(req.user.username, uri, req, res, next);
	}

	app.get("/users", options.authenticate, checkUserAccess, function(req,res) {
		var start = Math.max(0, Number(req.query.start)) || 0;
		var rows = Math.max(0, Number(req.query.rows)) || 20;
		metastore(req).getAllUsers(start, rows, function(err, users) {
			if (err) {
				return api.writeResponse(404, res);
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

	app.get("/users/:id", options.authenticate, checkUserAccess, function(req,res){
		metastore(req).getUser(req.params.id, function(err, user) {
			if (err) {
				return api.writeResponse(404, res);
			}
			if (!user) {
				return api.writeError(400, res, "User not found: " + req.params.id);
			}
			return api.writeResponse(200, res, null, userJSON(user));
		});
	});

	app.put("/users/:id", options.authenticate, checkUserAccess, function(req,res){
		var id = req.params.id;
		var store = metastore(req);
		store.getUser(id, function(err, user) {
			if (err) {
				return api.writeResponse(404, res);
			}
			if (!user) {
				return api.writeError(400, res, "User not found: " + req.params.id);
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
								api.writeError(409, res, "This account is already linked to someone else");
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
						return api.writeError(400, res, "Failed to update: " + id);
					}
					return api.writeResponse(200, res);
				});
			}).catch(function(err) {
				if (err) {
					// Indicated unhandled error
					return api.writeError(500, res, "An internal error has occured");
				}
			});
		});
	});

	app.delete("/users/:id", options.authenticate, checkUserAccess, function(req,res){
		metastore(req).deleteUser(req.params.id, function(err) {
			if (err) return api.writeResponse(400, res);
			return api.writeResponse(200, res);
		});
	});

	app.post("/users/:id", options.authenticate, checkUserAccess, function(req,res){
		var id = req.params.id;
		var newPassword = req.body.Password;
		if (!newPassword) {
			return api.writeResponse(400, res, null, {Message: "Password is required"});
		}
		var store = metastore(req);
		store.getUser(id, function(err, user) {
			if (err) {
				return api.writeResponse(404, res);
			}
			if (!user) {
				return api.writeError(400, res, "User not found: " + req.params.id);
			}
			store.updateUser(id, { password: newPassword }, function(err, user) {
				if (err) {
					return api.writeError(400, res, "Failed to update: " + req.params.id);
				}
				return api.writeResponse(200, res);
			});
		});
	});

	app.post('/users', options.authenticate, function(req, res){
		// If there are admin accounts, only admin accounts can create users
		if (options.configParams.get("orion.auth.user.creation") && !isAdmin(req.user && req.user.username)) {
			return api.writeResponse(403, res);
		}
		if(req.body.UserName === "anonymous"){
			api.writeError(400, res, "User name can not be anonymous");
		}
		var userData = {
			username: req.body.UserName,
			email: req.body.Email,
			fullname: req.body.FullName,
			oauth: req.body.identifier,
			password: req.body.Password,
			properties:{}
		};
		var store = metastore(req);
		store.createUser(userData, function(err, user) {
			if (err) {
				return api.writeResponse(404, res, null, {Message: err.message});
			}
			if (options.configParams.get("orion.auth.user.creation.force.email")) {
				sendMail({user: user, options: options, template: CONFIRM_MAIL, auth: CONFIRM_MAIL_AUTH, req: req});
				return api.writeResponse(201, res, null, {error: "Created"});
			}
			user.isAuthenticated = true;
			store.updateUser(user.username, user, function(err, user) {
				if (err) {
					return logError(err);
				}
				return api.writeResponse(201, res, null, {error: "Created"});
			});
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
			return api.writeResponse(200, res, null, "<html><body><p>Your email address has been confirmed. Thank you! <a href=\"" + ( req.protocol + '://' + req.get('host'))
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
				return api.writeResponse(200, res, null, "<html><body><p>Your password has been successfully reset. Your new password has been sent to the email address associated with your account.</p></body></html>");
			});
		});
	});

	app.post("/useremailconfirmation/cansendemails", /* @callback */ function(req, res){
		api.writeResponse(200, res, null, {EmailConfigured: Boolean(options.configParams.get("mail.smtp.host"))});
	});

	app.post('/useremailconfirmation', function(req, res){
		var store = metastore(req);
		var resetPwd = function(err, user) {
			if (err || !user) {
				return api.writeError(404, res, "User " +  (req.body.UserName || req.body.Email) + " not found");
			}
			if (!user.isAuthenticated){
				return api.writeError(400, res, "Email confirmation has not completed. Please follow the instructions from the confirmation email in your inbox and then request a password reset again.");
			}
			crypto.randomBytes(AUTH_TOKEN_BYTES, function(randomBytes) {
				store.updateUser(user.username, { authToken: randomBytes }, function(err, user) {
					if (err) {
						logError(err);
						return api.writeError(500, res,  "Error updating user");
					}
					sendMail({user: user, options: options, template: PWD_CONFIRM_RESET_MAIL, auth: RESET_PWD_AUTH, req: req});
					return api.writeResponse(200, res, null, {"Severity":"Info","Message":"Confirmation email has been sent.","HttpCode":200,"BundleId":"org.eclipse.orion.server.core","Code":0});
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
		return api.writeResponse(200, res, null, {
			CanAddUsers: canAddUsers(), 
			ForceEmail: Boolean(options.configParams.get("orion.auth.user.creation.force.email")), 
			RegistrationURI:options.configParams.get("orion.auth.registration.uri") || undefined});
	});
	
	app.post('/login', options.authenticate, function(req, res) {
		if (!req.user) {
			return api.writeResponse(200, res);
		}
		//add the web token with the response
		if (options.configParams.get("orion.collab.enabled") && options.configParams.get("orion.jwt.secret")) {
			req.user.jwt = jwt.sign({'username': req.user.username}, options.configParams.get("orion.jwt.secret"));
		}
		return api.writeResponse(200, res, null, userJSON(req.user));
	});
	
	return app;
};
