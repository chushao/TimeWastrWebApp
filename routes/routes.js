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
                request.post( 
                    //TODO don't hardcode
                    'http://localhost:1337/login',
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
    app.get('/logout(\\?)?', function(req, res) {
        var messages = flash('Logged out', null);
        var incomingToken = req.headers.token;
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
