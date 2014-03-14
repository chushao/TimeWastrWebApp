'use strict';

var path = require('path');
var config = require(path.join(__dirname, '..', '/config/config.js'));
var Account = require(path.join(__dirname, '..', '/models/account'));
var Token = require(path.join(__dirname, '..', '/models/account')).Token;
var flash = require(path.join(__dirname, '..', '/include/utils')).flash;
var request = require('request');

/**
* @module Routes
*/


module.exports = function (app, passport) {

    app.get('/register/:email/:password', function(req, res) {
        var email = req.params.email;
        var password = req.params.password;
        var user = new Account({email: email});
        var message;

        Account.register(user, password, function(error, account) {
            if (error) {
                if (error.name === 'BadRequesterroror' && error.message && error.message.indexOf('exists') > -1) {
                    message = flash(null, 'Sorry. That email already exists. Try again.');
                }
                else if (error.name === 'BadRequesterroror' && error.message && error.message.indexOf('argument not set')) {
                    message =  flash (null, 'It looks like you\'re missing a required argument. Try again.');
                }
                else {
                    console.log(error);
                    message = flash(null, 'Sorry. There was an error processing your request. Please try again or contact technical support.');
                }

                res.render('register', message);
            }
            else {
                //Successfully registered user
                //console.log(req.header.host);
                //TODO don't hardcode
                var url = process.env.urlpath === 'heroku' ? 'http://timewastr.herokuapp.com/login' : 'http://localhost:1337/login';
                request.post( 
                    url,
                    { form: {email: email,
                            password: password } },
                    function (err, response, body) {
                        if (!err && response.statusCode == 200) {
                            console.log("ASDF");
                            var json = JSON.stringify(eval("("+body+")"));
                            res.send(json);
                        }
                    }
                );

                //console.log(account);
                //res.redirect('login/'+email+'/'+password);
            }
        });
    });

    app.get('/login', function(req, res) {
        res.render('login');
    });
    
    app.post('/login',  passport.authenticate('local', {session: false}) , function(req, res) {
        console.log("MOO");
        if (req.user) {
            Account.createUserToken(req.user.email, function(err, usersToken) {
                 console.log('token generated: ' +usersToken);
                // console.log(err);
                if (err) {
                    res.json({error: 'Issue generating token'});
                } else {
                    res.json({token : usersToken});

                }
            });
        } else {
            res.json({error: 'AuthError'});
        }
    });

    app.get('/favorites/add/:token/', function(req, res) {
        //Generate a string of /favortes/add/1234.21232/?title=The cat is fat&articleLink=http://www.google.com for parsing
        var incomingToken = req.params.token;
        console.log('incomingToken: ' + incomingToken);
        var decoded = Account.decode(incomingToken);
        //Now do a lookup on that email in mongodb ... if exists it's a real user
        if (decoded && decoded.email) {
            Account.findUser(decoded.email, incomingToken, function(err, user) {
                if (err) {
                    console.log(err);
                    res.json({error: 'Issue finding user.'});
                } else {
                    if (Token.hasExpired(user.token.date_created)) {
                        console.log("Token expired...TODO: Add renew token funcitionality.");
                        res.json({error: 'Token expired. You need to log in again.'});
                    } else {
                        Account.findOne( {email: decoded.email}, function(err, usr) {
                            usr.favorites.push({
                                "title" : req.query.title,
                                "articleLink" : req.query.articleLink
                            });
                            usr.save( function(err, data) {
                                if (err) {
                                    console.log(err);
                                    res.json({
                                        message: err
                                    });
                                } else {
                                    console.log(data);
                                    res.json({
                                        message: "Success"
                                    });
                                }
                            });
                        });
                    }
                }
            });
        } else {
            console.log('Whoa! Couldn\'t even decode incoming token!');
            res.json({error: 'Issue decoding incoming token.'});
        }
    });


    app.get('/favorites/remove/:token/', function(req, res) {
                //Generate a string of /favortes/add/1234.21232/?title=The cat is fat&articleLink=http://www.google.com for parsing
        var incomingToken = req.params.token;
        console.log('incomingToken: ' + incomingToken);
        var decoded = Account.decode(incomingToken);
        //Now do a lookup on that email in mongodb ... if exists it's a real user
        if (decoded && decoded.email) {
            Account.findUser(decoded.email, incomingToken, function(err, user) {
                if (err) {
                    console.log(err);
                    res.json({error: 'Issue finding user.'});
                } else {
                    if (Token.hasExpired(user.token.date_created)) {
                        console.log("Token expired...TODO: Add renew token funcitionality.");
                        res.json({error: 'Token expired. You need to log in again.'});
                    } else {
                        Account.findOne( {email: decoded.email}, function(err, usr) {
                            var objId = "";
                            //Because mongoose can go fucking suck it due to their own bug
                            var x = JSON.parse(JSON.stringify(usr.favorites));
                            console.log(x.length);
                            for (var i  = 0; i < x.length; i++) {
                                console.log(x[i]);
                                for (var key in x[i]) {
                                    if(x[i].articleLink === req.query.articleLink) {
                                        objId = x[i]._id;
                                    }
                                } 

                            }
                            usr.favorites.remove(objId);
                            usr.save( function(err, data) {
                                if (err) {
                                    console.log(err);
                                    res.json({
                                        message: err
                                    });
                                } else {
                                    console.log(data);
                                    res.json({
                                        message: "Success"
                                    });
                                }

                            });
                        });
                    }
                }
            });
        } else {
            console.log('Whoa! Couldn\'t even decode incoming token!');
            res.json({error: 'Issue decoding incoming token.'});
        }
    });


    app.get('/favorites/list/:token', function(req, res) {
        var incomingToken = req.params.token;
        console.log('incomingToken: ' + incomingToken);
        var decoded = Account.decode(incomingToken);
        //Now do a lookup on that email in mongodb ... if exists it's a real user
        if (decoded && decoded.email) {
            Account.findUser(decoded.email, incomingToken, function(err, user) {
                if (err) {
                    console.log(err);
                    res.json({error: 'Issue finding user.'});
                } else {
                    if (Token.hasExpired(user.token.date_created)) {
                        console.log("Token expired...TODO: Add renew token funcitionality.");
                        res.json({error: 'Token expired. You need to log in again.'});
                    } else {
                        Account.findOne( {email: decoded.email}, function(err, usr) {
                            console.log(usr.favorites);
                            var jsonObj = {};
                            //gotta convert this shit from an array to a JSON object... fucking mongoose
                            var str = JSON.parse(JSON.stringify(usr.favorites));
                            for (var i = 0; i < str.length; i++) {
                                console.log(str[i]);
                                jsonObj[i] = str[i];
                            }

                            console.log("MOO");
                            res.json(jsonObj);
                        });
                    }
                }
            });
        } else {
            console.log('Whoa! Couldn\'t even decode incoming token!');
            res.json({error: 'Issue decoding incoming token.'});
        }
    });



    app.get('/apitest/:token', function(req, res) {
        var incomingToken = req.params.token;
        console.log('incomingToken: ' + incomingToken);
        var decoded = Account.decode(incomingToken);
        //Now do a lookup on that email in mongodb ... if exists it's a real user
        if (decoded && decoded.email) {
            Account.findUser(decoded.email, incomingToken, function(err, user) {
                if (err) {
                    console.log(err);
                    res.json({error: 'Issue finding user.'});
                } else {
                    if (Token.hasExpired(user.token.date_created)) {
                        console.log("Token expired...TODO: Add renew token funcitionality.");
                        res.json({error: 'Token expired. You need to log in again.'});
                    } else {
                        res.json({
                            user: {
                                email: user.email,
                                full_name: user.full_name,
                                token: user.token.token,
                                message: "This is just a simulation of an API endpoint; and we wouldn't normally return the token in the http response...doing so for test purposes only :)"
                            }
                        });
                    }
                }
            });
        } else {
            console.log('Whoa! Couldn\'t even decode incoming token!');
            res.json({error: 'Issue decoding incoming token.'});
        }
    });
    app.get('/logout/:token', function(req, res) {
        var messages = flash('Logged out', null);
        var incomingToken = req.params.token;
        console.log('LOGOUT: incomingToken: ' + incomingToken);
        if (incomingToken) {
            var decoded = Account.decode(incomingToken);
            if (decoded && decoded.email) {
                console.log("past first check...invalidating next...")
                Account.invalidateUserToken(decoded.email, function(err, user) {
                    console.log('Err: ', err);
                    console.log('user: ', user);
                    if (err) {
                        console.log(err);
                        res.json({error: 'Issue finding user (in unsuccessful attempt to invalidate token).'});
                    } else {
                        console.log("sending 200")
                        res.json({message: 'logged out'});
                    }
                });
            } else {
                console.log('Whoa! Couldn\'t even decode incoming token!');
                res.json({error: 'Issue decoding incoming token.'});
            }
        }
    });

};
