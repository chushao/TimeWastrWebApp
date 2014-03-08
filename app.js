
/**
 * Module dependencies.
 */

 var express = require('express');
 var routes = require('./routes');
 var user = require('./routes/user');
 var http = require('http');
 var path = require('path');
 var login = require('./routes/login');
 var flash = require('connect-flash');
 var util = require('util');
 var User = require('./models/user');
 var sys = require('sys');

//for parsing html
var cheerio = require('cheerio');
var request = require('request');
//Database set up
var mongo = require('mongodb');
var mongoose = require('mongoose');
mongoose.connect(process.env.MONGOHQ_URL || 'mongodb://localhost/balancr');
var User = mongoose.model('User');
//This line will drop the database
//User.remove().exec();

//facebook authentication
var authids = require('./auth.js');
var passport = require('passport');
var FacebookStrategy = require('passport-facebook').Strategy;
var LocalStrategy = require('passport-local').Strategy;




function findById(id, fn) {
	var index = id - 1;
	if(userlist[index]) {
		fn(null, userlist[index]);
	}
	else {
		fn(new Error('User ' + id + ' does not exist.'));
	}
}


function findByUsername(username, fn) {
	console.log('findByUsername');
	for(var i = 0, len = userlist.length; i < len; i++) {
		var currUser = userlist[i];
		console.log(currUser);
		if(currUser.username === username) {
			console.log('match found!');
			return fn(null, currUser);
		}
	}
	return fn(null, null);
}

function findByEmail(username, fn) {
	console.log('findByUsername');
	for(var i = 0, len = userlist.length; i < len; i++) {
		var currUser = userlist[i];
		console.log(currUser);
		if(currUser.email === username) {
			console.log('match found!');
			return fn(null, currUser);
		}
	}
	return fn(null, null);
}

//serialize and deserialize (for persistent sessions)
passport.serializeUser(function (user, done) {
	done(null, user.id);
});

passport.deserializeUser(function (id, done) {
	User.findOne( { id: id }, function (err, user) {
		done(err, user);
	});
});

//local login

passport.use(new LocalStrategy ({
	usernameField: 'email',
	passwordField: 'password'
},
function(email, password, done) {
	User.isValidUserPassword(email, password, done);
}));

//Facebook login
passport.use(new FacebookStrategy({
	clientID: authids.facebook.clientID,
	clientSecret: authids.facebook.clientSecret,
	callbackURL: authids.facebook.callbackURL,
	profileFields: ['id','email','username']
},
function(accessToken, refreshToken, profile, done) {
	
	process.nextTick(function () {

		User.findOne( { email: profile.username}, function (err, user) {
			if(err) {
				console.log(err);
				return done(err, null);
			}
			else if(!user){
				var newUser = new User({
					email: profile.username,
					id: profile.id,
					username: profile.username,
					goal: 50,
					work: true,
					exercise: true,
					entertainment: true,
					social: true,
					school: true,
					errands: true,
					family: true,
					other: true
				});
				newUser.save(); 
				return done(null, newUser);
			}
			else {
				return done(null, user);
			}
		});
	});
}
));



var app = express();



// all environments
app.set('port', process.env.PORT || 3000);
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'jade');
app.use(express.favicon());
app.use(express.logger('dev'));
app.use(express.json());
app.use(express.urlencoded());
app.use(express.methodOverride());
app.use(express.bodyParser());
app.use(express.cookieParser());
app.use(express.session({ secret: '08D8AF524EC4850DAE5B66ECD9E57' }));
app.use(passport.initialize());
app.use(passport.session());
app.use(app.router);
app.use(express.static(path.join(__dirname, 'public')));


//correctly routes to facebook for login
app.get('/auth/facebook',
	passport.authenticate('facebook'), function (req, res){
		console.log("you shouldn't see this");
	});

//doesn't currently work
app.get('/auth/facebook/callback',
	passport.authenticate('facebook', { scope: [ 'email' ], display: 'touch', failureRedirect: '/' }),
	function (req, res) {
		res.redirect('/workplay'); 
	});


//dunno if this works
function ensureAuthenticated(req, res, next) {
	if (req.isAuthenticated()) { return next(); }
	res.redirect('/');
}


//html grabber

function grabHTML(err, resp, html) {
	if (err) {
		return console.log(err);
	}
	body = "";
	var parseHTML = cheerio.load(html);
	parseHTML('div[itemprop="articleBody"]').map(function(i, div) {
		var b = div.children;
		function parseChildren(i) {
			if (i < b.length) {
				if (b[i].children && b[i].name === 'p') { 
					if (b[i].children[0]) {
						if (b[i].children[0].data) {
							body = body + b[i].children[0].data;
						}			
					}
				}
				if (b[i].children && b[i].name === 'div') {
					function parseChildren2(j) {
						if (j < b[i].children.length) {
							if (b[i].children[j] && b[i].children[j].name === 'p') {
								if (b[i].children[j].children[0].data.length) {
									body = body + b[i].children[j].children[0].data;	
								}
							}
							
							parseChildren2(j+1);
						}
					}
					parseChildren2(0);
				}
				

				parseChildren(i+1);
			}
		}
		parseChildren(0);
		//console.log(body);
	});

}



// development only
if ('development' == app.get('env')) {
	app.use(express.errorHandler());
}


//app.get('/users', user.list);

//nav items
app.get('/', routes.index);

app.get('/example', function(req, res) {
	//This part needs to be converted dynamically
	var URL = 'http://www.smartplanet.com/blog/the-report/tomorrows-truck-loses-weight-but-at-what-environmental-cost/';
	request(URL, function(err, resp, html) {
		if (err) {
			return console.log(err);
		}
		body = "";
		var parseHTML = cheerio.load(html);
		parseHTML('div[itemprop="articleBody"]').map(function(i, div) {
			var b = div.children;
			function parseChildren(i) {
				if (i < b.length) {
					if (b[i].children && b[i].name === 'p') { 
						if (b[i].children[0]) {
							if (b[i].children[0].data) {
								body = body + b[i].children[0].data;
							}			
						}
					}
					if (b[i].children && b[i].name === 'div') {
						function parseChildren2(j) {
							if (j < b[i].children.length) {
								if (b[i].children[j] && b[i].children[j].name === 'p') {
									if (b[i].children[j].children[0].data.length) {
										body = body + b[i].children[j].children[0].data;	
									}
								}

								parseChildren2(j+1);
							}
						}
						parseChildren2(0);
					}


					parseChildren(i+1);
				}
			}
			parseChildren(0);
		res.send(body);
	});

	});

});

app.get('/home', ensureAuthenticated, function(req, res){
	User.findOne({username: req.user.username}, 'activities', function(error, data){
		var work = 0;
		var play = 0;
		//weirdass way of looping loops
		function calculate(i) { 
			if( i < data.activities.length ) {
				var date = new Date(data.activities[i].date);
				var today = new Date();
				date.setHours(0,0,0,0);
				today.setHours(0,0,0,0);
				if (date.getTime() == today.getTime()) {
					if (data.activities[i].minutes) {
						if (data.activities[i].work) {
							work = work + data.activities[i].timeSpent;
						} else {
							play = play + data.activities[i].timeSpent;
						}
					} else {
						if (data.activities[i].work) {
							work = work + (data.activities[i].timeSpent * 60);
						} else {
							play = play + (data.activities[i].timeSpent * 60);
						}
					}
				}
				calculate(i+1);
			}
			
		}
		calculate(0);
		var workPercent = Math.round( ((work / (work + play)) * 100) * 100) / 100;
		var playPercent = Math.round( ((play / (work + play)) * 100) * 100) / 100; 
		var workGraph = isNaN(workPercent) ? 50 : workPercent;
		var playGraph = isNaN(playPercent) ? 50 : playPercent;
		if (isNaN(workPercent)) { workPercent = 0;}
		if (isNaN(playPercent)) { playPercent = 0;}
		res.render('home', {pageData: {wpDate: 'today', workGraph: workGraph, playGraph: playGraph, workPercent: workPercent, playPercent: playPercent, ab: false }});
	});


});


app.get('/workplay/all', ensureAuthenticated, function(req,res) {
	User.findOne({username: req.user.username}, 'activities', function(error, data){
		var work = 0;
		var play = 0;
		//weirdass way of looping loops
		function calculate(i) {
			if( i < data.activities.length ) {
				if (data.activities[i].minutes) {
					if (data.activities[i].work) {
						work = work + data.activities[i].timeSpent;
					} else {
						play = play + data.activities[i].timeSpent;
					}
				} else {
					if (data.activities[i].work) {
						work = work + (data.activities[i].timeSpent * 60);
					} else {
						play = play + (data.activities[i].timeSpent * 60);
					}
				}
				calculate(i+1);
			}
			
		}
		calculate(0);
		var workPercent = Math.round( ((work / (work + play)) * 100) * 100) / 100;
		var playPercent = Math.round( ((play / (work + play)) * 100) * 100) / 100;
		var workGraph = isNaN(workPercent) ? 50 : workPercent;
		var playGraph = isNaN(playPercent) ? 50 : playPercent;
		if (isNaN(workPercent)) { workPercent = 0;}
		if (isNaN(playPercent)) { playPercent = 0;}
		res.render('workplay', {pageData: {wpDate: 'all', workGraph: workGraph, playGraph: playGraph, workPercent: workPercent, playPercent: playPercent }});
		
	});
});

app.get('/workplay/:year/:month/:day', ensureAuthenticated, function(req,res) {
		//Convert year/month/day from path to databasecall
		var queryDate = req.params.year+'-'+req.params.month+'-'+req.params.day;
		User.findOne({username: req.user.username}, 'activities', function(error, data){	
			var work = 0;
			var play = 0;
		//weirdass way of looping loops
		function calculate(i) { 
			if( i < data.activities.length ) {
				var date = new Date(data.activities[i].date);
				var qDate = new Date(queryDate);
				date.setHours(0,0,0,0);
				qDate.setHours(0,0,0,0);
				if (date.getTime() == qDate.getTime()) {
					if (data.activities[i].minutes) {
						if (data.activities[i].work) {
							work = work + data.activities[i].timeSpent;
						} else {
							play = play + data.activities[i].timeSpent;
						}
					} else {
						if (data.activities[i].work) {
							work = work + (data.activities[i].timeSpent * 60);
						} else {
							play = play + (data.activities[i].timeSpent * 60);
						}
					}
				}
				calculate(i+1);
			}
			
		}
		calculate(0);
		var workPercent = Math.round( ((work / (work + play)) * 100) * 100) / 100;
		var playPercent = Math.round( ((play / (work + play)) * 100) * 100) / 100; 
		var workGraph = isNaN(workPercent) ? 50 : workPercent;
		var playGraph = isNaN(playPercent) ? 50 : playPercent;
		if (isNaN(workPercent)) { workPercent = 0;}
		if (isNaN(playPercent)) { playPercent = 0;}
		res.render('workplay', {pageData: {wpDate: queryDate, workGraph: workGraph, playGraph: playGraph, workPercent: workPercent, playPercent: playPercent }});
		
	});
});


app.post('/edit', ensureAuthenticated, function(req, res) {
	User.findOne({username: req.user.username}, function(error, data) {
		console.log(req.body);
		data.activities.remove(req.body.activityID);
		data.save(edit);
		function edit(err) {
			if (err) {
				console.log(err);
			} else {
				var minutes = (req.body.timeUnit.indexOf("minute") !== -1) ? true : false;
				console.log('minutes: '+minutes);
				var work = (req.body.workplay == 'Work') ? true : false;

				data.activities.push({
					"activity" : req.body.activity,
					"category" : req.body.category,
					"timeSpent" : req.body.duration,
					"minutes" : minutes,
					"work" : work,
					"date" : req.body.date
				});
				data.save( function(error, data){
					if(error){
						console.log(error);
					} else{
						console.log(data);
					}
				});

			}
			res.redirect('/details/category/all');
		}
	});
});

app.post('/delete', ensureAuthenticated, function(req, res) {
	User.findOne({username: req.user.username}, function(error, data) {
		console.log(req.body);
		data.activities.remove(req.body.activityID);
		data.save(edit);
		function edit(err) {
			if (err) {
				console.log(err);
			} else {
				console.log(data);
			}
			res.redirect('/details/category/all');
		}
	});

});
app.get('/signup', routes.signup);
app.post('/signup', function (req, res, next) {
	User.signup(req.body.email, req.body.password, function(err, user){
		if(err) throw err;
		req.login(user, function(err){
			if(err) return next(err);
			return res.redirect("/home");
		});
	});
});
app.get('/resetpassword', routes.resetpassword);

//Unused for now
//app.get('/login', login.view);

app.get('/logout', function(req, res){
	req.logout();
	res.redirect('/');
});

//local submission of email and password
app.post('/login',
	passport.authenticate('local', {failureRedirect: '/'}),
	function (req, res) {
		res.redirect('/home');
	}
	);


http.createServer(app).listen(app.get('port'), function(){
	console.log('Express server listening on port ' + app.get('port'));
});
