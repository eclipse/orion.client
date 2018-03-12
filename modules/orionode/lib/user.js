/*******************************************************************************
 * Copyright (c) 2016, 2018 IBM Corporation and others.
 * All rights reserved. This program and the accompanying materials are made 
 * available under the terms of the Eclipse Public License v1.0 
 * (http://www.eclipse.org/legal/epl-v10.html), and the Eclipse Distribution 
 * License v1.0 (http://www.eclipse.org/org/documents/edl-v10.html). 
 *
 * Contributors:
 *	 IBM Corporation - initial API and implementation
 *******************************************************************************/
const express = require('express'),
	crypto = require('crypto'),
	passport = require('passport'),
	Promise = require('bluebird'),
	nodemailer = require('nodemailer'),
	fs = require('fs'),
	api = require('./api'),
	generator = require('generate-password'),
	log4js = require('log4js'),
	logger = log4js.getLogger("user"),
	jwt = require('jsonwebtoken'),
	url = require('url'),
	checkRights = require('./accessRights').checkRights,
	fileUtil = require('./fileUtil');
	
const AUTH_TOKEN_BYTES = 48,
	EMAIL_QUERY_PARAM = "EmailConfirmationId",
	PASSWORD_QUERY_PARAM = "PasswordResetId",
	CONFIRM_MAIL = "./multitenant/EmailConfirmation.txt",
	PWD_CONFIRM_RESET_MAIL = "./multitenant/EmailConfirmationPasswordReset.txt",
	PWD_RESET_MAIL = "./multitenant/PasswordReset.txt";

/**
 * Composes the email URL path to use for email address confirmations and password resets
 * @param {string} user The user ID
 * @param {string} param The query param name
 * @since 18.0
 */
function getEmaillUrl(user, param) {
	return "/useremailconfirmation/"+user+"?"+param+"=";
}
/**
  * Checks if user creation has been enabled in the server configuration
  * @param {?} options The map of server options
  * @see https://wiki.eclipse.org/Orion/Server_admin_guide#Allowing_users_to_create_accounts
  * @since 18.0
  */
 function canAddUsers(options) {
	return !options.configParams.get("orion.auth.user.creation");
}

 /**
  * Checks if the 'admin' user has been enabled in the server configuration
  * @param {?} options The map of server options
  * @see https://wiki.eclipse.org/Orion/Server_admin_guide#Allowing_users_to_create_accounts
  * @since 18.0
  */
function isAdmin(options, username) {
	return (options.configParams.get("orion.auth.user.creation") || "").split(",").some(function(user) {
		return user === username;
	});
}

/**
 * Write out the JSON for the given user metadata
 * @param {{?}} user The user to write JSON for
 * @param {{?}} options The map of server options
 * @returns {?} A new JSON object for the user
 */
function userJSON(user, options) {
	return {
		FullName: user.fullname,
		UserName: user.username,
		Email: user.email,
		EmailConfirmed: emailConfirmed(user),
		HasPassword: true,
		OAuth: user.oauth || undefined,
		LastLoginTimestamp: user.login_timestamp ? user.login_timestamp.getTime() : 0,
		DiskUsageTimestamp: user.disk_usage_timestamp ? user.disk_usage_timestamp.getTime() : 0,
		DiskUsage: user.disk_usage || 0 ,
		jwt: user.jwt
	};
}

/**
 * Returns if the user has confirmed thier email. This checks two different flags based on which metastore 
 * handled the verification
 * @param {{?}} user The user object
 * @since 18.0
 */
function emailConfirmed(user) {
	return Boolean(user && (user.emailConfirmed || user.isAuthenticated));
}

/**
 * Sends a mail to the given recipient using the given template (both from the 'opt' map)
 * @param {{?}} opt The map of options
 * @param {fn(Error, {?})} callback The callback when the email has been sent or an error occurs
 */
function sendMail(opt, callback){
	fs.readFile(opt.template, 'utf8', function (err,data) {
		if (err) {
			return callback(err);
		}
		const authUrl = opt.req.protocol + '://' + opt.req.get('host') + opt.auth + opt.user.authToken;
		let emailText  = data.replace(/<EMAIL>/g, opt.user.email || "");
		emailText  = emailText.replace(/<USER>/g, opt.user.username || "");
		emailText  = emailText.replace(/<URL>/g, authUrl);
		emailText  = emailText.replace(/<PASSWORD>/g, opt.pwd || "");
		const subjLineIndex = emailText.indexOf("\n"),
			subject = emailText.substr(0, subjLineIndex),
			body = emailText.substr(subjLineIndex),
			smtpConfig = {
				host: opt.options.configParams.get("mail.smtp.host"),
				port: opt.options.configParams.get("mail.smtp.port"),
				secure: true,
				auth: {
					user: opt.options.configParams.get("mail.smtp.user"),
					pass: opt.options.configParams.get("mail.smtp.password")
				}
			};
		if (opt.options.configParams.get("mail.from")) {
			const transport = nodemailer.createTransport(smtpConfig);
			const mailOptions = {
				from: opt.options.configParams.get("mail.from"),
				to: opt.user.email,
				subject: subject,
				text: body, 
			};
			transport.sendMail(mailOptions, function(error, info) {
				if (error) {
					logger.error(error + " " + info);
					callback(error);
				}
				callback(null, info);
			});
		} else {
			// used for local dev testing (no email is sent, logged to console)
			logger.info(body);
			callback(null);
		}
	});
}

/**
 * Log in
 * @param {XMLHttpRequest} req 
 * @param {{?}} user 
 * @param {fn(Error)} callback 
 */
function doLogin(req, user, callback) {
	req.logIn(user, function(err) {
		if (err) {
			logger.error(err);
			return callback(err);
		}
		user.login_timestamp = Date.now();
		fileUtil.getMetastoreSafe(req).then(function(store) {
			store.updateUser(user.username, user, function(err) {
				if (err) {
					logger.error(err);
					return callback(err);
				}
				callback(null);
			});
		}, function noMetastore(err) {
			callback(err);
		});
	});
}

/**
 * Do OAuth authentication 
 * @param {string} id 
 * @param {string} username 
 * @param {string} email 
 * @param {XMLHttpRequest} req 
 * @param {fn(Error, {?})} done 
 */
function oauth(id, username, email, req, done) {
	if (req.params["0"] === "/link") {
		return done(null, {
			__linkUser: true,
			email: email,
			username: username,
			id: id
		});
	}
	fileUtil.getMetastoreSafe(req).then(function(store) {
		store.getUserByOAuth(id, function(err, user) {
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
		}, function noMetastore(err) {
			done(err);
		});
	});
}

/**
 * Reset the password for the given user / request
 * @param {XMLHttpRequest} req The original request
 * @param {XMLHttpResponse} res The response object
 * @param {{?}} options The map of server options
 * @param {Error} err The error from the caller or null
 * @param {{?}} user The user metadata
 */
function resetPassword(req, res, options, err, user) {
	if (err || !user) {
		return api.writeError(404, res, "User " +  (req.body.UserName || req.body.Email) + " not found");
	}
	if (!emailConfirmed(user)) {
		return api.writeError(400, res, "Email confirmation has not completed. Please follow the instructions from the confirmation email in your inbox and then request a password reset again.");
	}
	crypto.randomBytes(AUTH_TOKEN_BYTES, function(randomBytes) {
		fileUtil.getMetastoreSafe().then(function(store) {
			store.updateUser(user.username, { authToken: randomBytes }, function(err, user) {
				if (err) {
					logger.error(err);
					return api.writeError(500, res,  "Error updating user");
				}
				const emailUrl = getEmaillUrl(user.username, PASSWORD_QUERY_PARAM);
				return sendMail({user: user, options: options, template: PWD_CONFIRM_RESET_MAIL, auth: emailUrl, req: req}, /* @callback */ function(err, info) {
					if(err) {
						return api.writeError(500, res, err);
					}
					return api.writeResponse(200, res, null, {"Severity":"Info","Message":"Confirmation email has been sent.","HttpCode":200,"BundleId":"org.eclipse.orion.server.core","Code":0});
				});
			});
		});
	});
}

/**
 * Creates a new user
 * @param {XMLHttpRequest} req The original request
 * @param {XMLHttpResponse} res The rsponse object
 * @param {Error} err The caller error, or null
 * @param {{?}} user The user metadata
 * @param {{?}} options Map of server options
 */
function createNewUser(req, res, err, user, options) {
	if (err) {
		logger.error(req.url, err);
		return api.writeError(500, res, "An internal error has occured");
	}
	if (user) {
		if (user.__newUser) {
			if (!canAddUsers(options)) {
				let errorUrl = "/mixloginstatic/LoginWindow.html?error=" +
					new Buffer("There is no Orion account associated with this Id. Please register or contact your system administrator for assistance.").toString('base64');
				return res.redirect(errorUrl);
			}
			let registerUrl = "/mixloginstatic/LoginWindow.html";
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

/**
 * Optionally configures Google OAuth. Checks for the server property 'orion.oauth.google.client', and if found optionally 
 * sets up the support.
 * @param {express.Router} app The backing app
 * @param {{?}} options The map of server options
 * @see https://wiki.eclipse.org/Orion/Server_admin_guide#Setting_up_Google_OAuth_authentication
 */
function configureGoogleOAuth(app, options) {
	if (options.configParams.get("orion.oauth.google.client")) {
		const GoogleStrategy = require('passport-google-oauth20').Strategy;
		passport.use(new GoogleStrategy({
			clientID: options.configParams.get("orion.oauth.google.client"),
			clientSecret: options.configParams.get("orion.oauth.google.secret"),
			passReqToCallback: true,
			callbackURL: (options.configParams.get("orion.auth.host") || "") + "/auth/google/callback",
			scope: "openid email"
		}, /* @callback */ function(req, accessToken, refreshToken, profile, done) {
			const email = profile.emails[0].value;
			oauth(profile.provider + "/" + profile.id, email.split("@")[0], email, req, done);
		}));
		app.get('/login/oauth/google', options.basicMiddleware, passport.authenticate('google'));
		app.get('/mixlogin/manageoauth/oauth/google', options.basicMiddleware, passport.authenticate('google', {callbackURL: (options.configParams.get("orion.auth.host") || "") + "/auth/google/callback/link"}));
		app.get('/auth/google/callback*', options.basicMiddleware, function(req, res) {
			return passport.authenticate('google', {callbackURL: (options.configParams.get("orion.auth.host") || "") + "/auth/google/callback" + (req.params["0"] || "")}, /* @callback */ function(err, user, info){
				createNewUser(req,res,err,user, options);
			})(req,res);
		});
	}
}

/**
 * Optionally configures GitHub OAuth. Checks for the server property 'orion.oauth.github.client', and if found optionally 
 * sets up the support.
 * @param {express.Router} app The backing app
 * @param {{?}} options The map of server options
 * @see https://wiki.eclipse.org/Orion/Server_admin_guide#Setting_up_GitHub_OAuth_authentication
 */
function configureGithubOAuth(app, options) {
	if (options.configParams.get("orion.oauth.github.client")) {
		const GithubStrategy = require('passport-github2').Strategy;
		passport.use(new GithubStrategy({
			clientID: options.configParams.get("orion.oauth.github.client"),
			clientSecret: options.configParams.get("orion.oauth.github.secret"),
			passReqToCallback: true,
			callbackURL: (options.configParams.get("orion.auth.host") || "") + "/auth/github/callback",
			scope: "user:email"
		}, /* @callback */ function(req, accessToken, refreshToken, profile, done) {
			const email = profile.emails[0].value;
			oauth(profile.provider + "/" + profile.id, profile.username, email, req, done);
		}));
		app.get('/login/oauth/github', options.basicMiddleware, passport.authenticate('github'));
		app.get('/mixlogin/manageoauth/oauth/github', options.basicMiddleware, passport.authenticate('github', {callbackURL: (options.configParams.get("orion.auth.host") || "") + "/auth/github/callback/link"}));
		app.get('/auth/github/callback*', options.basicMiddleware, function(req, res) {
			return passport.authenticate('github', {callbackURL: (options.configParams.get("orion.auth.host") || "") + "/auth/github/callback" + (req.params["0"] || "")}, /* @callback */ function(err, user, info){
				createNewUser(req,res,err,user, options);
			})(req,res);
		});
	}
}

/**
 * The API function to return a router
 * @param {{?}} options The map of server options
 * @returns {express.Router} Returns the new router for the endpoint
 */
module.exports.router = function router(options) {
	const app = express.Router();
	
	configureGoogleOAuth(app, options);
	configureGithubOAuth(app, options);

	app.post('/logout', options.authenticate, options.basicMiddleware, function(req, res) {
		req.logout();
		api.writeResponse(null, res);
	});
	
	app.post('/login/form', options.authenticate, options.basicMiddleware, function(req, res, next) {
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

	/**
	 * Checks is the logged in user has access to the requested resource
	 * @param {XMLHttpRequest} req The backing request
	 * @param {XMLHttpResponse} res The response object
	 * @param {fn} next The next function to skip ahead
	 */
	function checkUserAccess(req, res, next) {
		const isadmin = isAdmin(options, req.user.username);
		if (!req.user || !(req.params.id === req.user.username || isadmin)) {
			return api.writeResponse(403, res);
		}
		const contextPath = options.configParams.get("orion.context.path") || "",
			listenContextPath = options.configParams.get("orion.context.listenPath") || false,
			uri = url.parse(req.originalUrl.substring(listenContextPath ? contextPath.length : 0)).pathname;
		if(isadmin) {
			return next();
		}
		checkRights(req.user.username, uri, req, res, next);
	}

	app.get("/users", options.authenticate, options.basicMiddleware, options.CSRF, checkUserAccess, function(req, res) {
		let start = Math.max(0, Number(req.query.start)) || 0,
			rows = Math.max(0, Number(req.query.rows)) || 20;
		fileUtil.getMetastoreSafe(req).then(function(store) {
			store.getAllUsers(start, rows, function(err, users) {
				if (err) {
					return api.writeResponse(404, res);
				}
				const result = [];
				if(Array.isArray(users) || users.length > 0) {
					return users.forEach((user, index) => {
						store.getUser(user, function(err, userInfo) {
							result.push(userJSON(userInfo, options));
							if(index >= users.length-1) {
								return api.writeResponse(200, res, null, {
									Users: result,
									UsersStart: start,
									UsersRows: rows,
									UsersLength: users.length
								});
							}
						});
					});
				}
				return api.writeResponse(200, res, null, {
					Users: result,
					UsersStart: start,
					UsersRows: rows,
					UsersLength: result.length
				});
			});
		}, function noMetastore(err) {
			return api.writeError(500, res, err);
		});
	});

	app.get("/users/:id", options.authenticate, options.basicMiddleware, options.CSRF, checkUserAccess, function(req, res) {
		fileUtil.getMetastoreSafe(req).then(function(store) {
			store.getUser(req.params.id, function(err, user) {
				if (err) {
					return api.writeResponse(404, res);
				}
				if (!user) {
					return api.writeError(400, res, "User not found: " + req.params.id);
				}
				return api.writeResponse(200, res, null, userJSON(user, options));
			});
		}, function noMetastore(err) {
			return api.writeError(500, res, err);
		});
	});

	app.put("/users/:id", options.authenticate, options.basicMiddleware, options.CSRF, checkUserAccess, function(req, res) {
		const id = req.params.id;
		fileUtil.getMetastoreSafe(req).then(function(store) {
			store.getUser(id, function(err, user) {
				if (err) {
					return api.writeResponse(404, res);
				}
				if (!user) {
					return api.writeError(400, res, "User not found: " + id);
				}
				let promiseChain = Promise.resolve();
				if (typeof req.body.Password !== "undefined") {
					user.password = req.body.Password;
				}
				if (typeof req.body.UserName !== "undefined") {
					user.username = req.body.UserName;
				}
				if (typeof req.body.FullName !== "undefined") {
					user.fullname = req.body.FullName;
				}
				if (typeof req.body.Email !== "undefined") {
					user.email = req.body.Email;
				}
				if (typeof req.body.OAuth !== "undefined") {
					return store.getUserByOAuth(req.body.OAuth, function(err, existing) {
						if (err) {
							api.writeError(500, res, err.message);
							return;
						}
						if (existing && (id !== existing.username)) {
							api.writeError(409, res, "This account is already linked to someone else");
							return;
						}
						user.oauth = req.body.OAuth;
						return store.updateUser(id, user, function(err) {
							if (err) {
								return api.writeError(400, res, "Failed to update: " + id);
							}
							return api.writeResponse(200, res);
						});
					});
				}
				return store.updateUser(id, user, function(err) {
					if (err) {
						return api.writeError(400, res, "Failed to update: " + id);
					}
					return api.writeResponse(200, res);
				});
			});
		}, function noMetastore(err) {
			return api.writeError(500, res, err);
		});
	});

	app.delete("/users/:id", options.authenticate, options.basicMiddleware, options.CSRF, checkUserAccess, function(req, res) {
		fileUtil.getMetastoreSafe(req).then(function(store) {
			store.deleteUser(req.params.id, function(err) {
				if (err) {
					return api.writeResponse(400, res);
				}
				return api.writeResponse(200, res);
			});
		}, function noMetastore(err) {
			return api.writeError(500, res, err);
		});
	});

	app.post("/users/:id", options.authenticate, options.basicMiddleware, options.CSRF, checkUserAccess, function(req, res) {
		const id = req.params.id,
			newPassword = req.body.Password;
		if (!newPassword) {
			return api.writeResponse(400, res, null, {Message: "Password is required"});
		}
		fileUtil.getMetastoreSafe(req).then(function(store) {
			store.getUser(id, function(err, user) {
				if (err) {
					return api.writeResponse(404, res);
				}
				if (!user) {
					return api.writeError(400, res, "User not found: " + id);
				}
				store.updateUser(id, { password: newPassword }, /* @callback */ function(err, user) {
					if (err) {
						return api.writeError(400, res, "Failed to update: " + id);
					}
					return api.writeResponse(200, res);
				});
			});
		}, function noMetastore(err) {
			return api.writeError(500, res, err);
		});
	});

	app.post('/users', options.authenticate, options.basicMiddleware, options.CSRF, function(req, res) {
		// If there are admin accounts, only admin accounts can create users
		const admins = options.configParams.get("orion.auth.user.creation");
		if (typeof admins === 'string' && admins.length > 0) {
			if(!isAdmin(options, req.user && req.user.username)) {
				return api.writeResponse(403, res);
			}
		}
		const uname = req.body.UserName;
		if(typeof uname === 'string') {
			if(Boolean(options.configParams.get('orion.auth.disable.account.rules'))) {
				if(uname.length < 3) {
					return api.writeResponse(400, res, null, {Message: "User name must be 3 characters or longer"});
				}
				if(uname.length > 20) {
					return api.writeResponse(400, res, null, {Message: "User name must be 20 characters or shorter"});
				}
			}
			for (let i = 0, len = uname.length; i < len; i++) {
				const c = uname.charAt(i);
				if(!api.isLetterOrDigit(c)) {
					return api.writeResponse(400, res, null, {Message: "Invalid character in user name: "+c});
				}
			}
		} else {
			return api.writeResponse(400, res, null, {Message: "Invalid user name for new user"});
		}
		const userData = {
			username: uname,
			email: req.body.Email,
			fullname: req.body.FullName,
			oauth: req.body.identifier,
			password: req.body.Password,
			properties:{}
		};
		fileUtil.getMetastoreSafe(req).then(function(store) {
			store.createUser(userData, function(err, user) {
				if (err) {
					return api.writeResponse(err.code || 404, res, null, {Message: err.message});
				}
				if (options.configParams.get("orion.auth.user.creation.force.email")) {
					const emailUrl = getEmaillUrl(user.username, EMAIL_QUERY_PARAM);
					return sendMail({user: user, options: options, template: CONFIRM_MAIL, auth: emailUrl, req: req}, /* @callback */ function(err, info) {
						if(err) {
							return api.writeError(500, res, err);
						}
						return api.writeResponse(201, res, null, {Message: "Created"});
					});
				}
				//user.emailConfirmed = true;
				store.updateUser(user.username, user, /* @callback */ function(err, user) {
					if (err) {
						logger.error(err);
						return api.writeError(500, res, err);
					}
					return api.writeResponse(201, res, null, {Message: "Created"});
				});
			});
		}, function noMetastore(err) {
			return api.writeError(500, res, err);
		});
	});

	app.get('/useremailconfirmation/:id', options.basicMiddleware, function(req, res) {
		const isVerifyEmail = Boolean(req.query.EmailConfirmationId),
				isChangePassword = Boolean(req.query.PasswordResetId),
				id = req.params.id;
		fileUtil.getMetastoreSafe(req).then(function(store) {
			store.getUser(id, (err, user) => {
				if (err) {
					return api.writeResponse(404, res);
				}
				if (!user) {
					return api.writeError(400, res, "User not found: " + id);
				}
				if(isVerifyEmail) {
					return store.confirmEmail(user, req.query.EmailConfirmationId, /* @callback */ function(err, user) {
						if (err) {
							return logger.error(err);
						}
						//TODO NLS this string
						return api.writeResponse(200, res, null, "<html><body><p>Your email address has been confirmed. Thank you! <a href=\"" + ( req.protocol + '://' + req.get('host'))
						+ "\">Click here</a> to continue and login to your account.</p></body></html>");
					});
				} else if (isChangePassword) {
					return store.confirmEmail(user, req.query.PasswordResetId, function(err, user) {
						if (err) {
							return logger.error(err);
						}
						//generate pwd
						const password = generator.generate({
							length: 8,
							numbers: true,
							excludeSimilarCharacters:true
						});
						user.password = password;
						store.updateUser(user.username, user, function(err, user) {
							if (err) {
								return logger.error(err);
							}
							return sendMail({user: user, options: options, template: PWD_RESET_MAIL, auth: "", req: req, pwd: password}, /* @callback */ function(err, info) {
								if(err) {
									return api.writeError(500, res, err);
								}
								//TODO NLS this message
								return api.writeResponse(200, res, null, "<html><body><p>Your password has been successfully reset. Your new password has been sent to the email address associated with your account.</p></body></html>");
							});
						});
					});
				}
			});
		}, function noMetastore(err) {
			return api.writeError(500, res, err);
		});
	});

	app.post("/useremailconfirmation/cansendemails", options.basicMiddleware, /* @callback */ function(req, res) {
		api.writeResponse(200, res, null, {EmailConfigured: Boolean(options.configParams.get("mail.smtp.host"))});
	});

	app.post('/useremailconfirmation', options.basicMiddleware, function(req, res){
		fileUtil.getMetastoreSafe(req).then(function(store) {
			if (req.body.UserName) {
				store.getUser(req.body.UserName, function(err, user) {
					return resetPassword(req, res, options, err, user);
				});
			} else if (req.body.Email) {
				store.getUserByEmail(req.body.Email, function(err, user) {
					return resetPassword(req, res, options, err, user);
				});
			}
		});
	});

	app.post('/login/canaddusers', options.basicMiddleware, /* @callback */ function(req, res) {
		return api.writeResponse(200, res, null, {
			CanAddUsers: canAddUsers(options), 
			ForceEmail: Boolean(options.configParams.get("orion.auth.user.creation.force.email")), 
			RegistrationURI:options.configParams.get("orion.auth.registration.uri") || undefined});
	});
	
	app.post('/login', options.authenticate, options.basicMiddleware, function(req, res) {
		if (!req.user) {
			return api.writeResponse(200, res);
		}
		//add the web token with the response
		if (options.configParams.get("orion.collab.enabled") && options.configParams.get("orion.jwt.secret")) {
			req.user.jwt = jwt.sign({'username': req.user.username}, options.configParams.get("orion.jwt.secret"));
		}
		return api.writeResponse(200, res, null, userJSON(req.user, options));
	});
	
	return app;
};
