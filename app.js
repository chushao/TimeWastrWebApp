
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
		console.log("you shouldn't see this")
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
	res.redirect('/')
}



// development only
if ('development' == app.get('env')) {
	app.use(express.errorHandler());
}


//app.get('/users', user.list);

//nav items
app.get('/', routes.index);

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

app.get('/home_a', ensureAuthenticated, function(req, res){
	User.findOne({username: req.user.username}, function(error, data){
		var work = 0;
		var exercise = 0;
		var entertainment = 0;
		var school = 0;
		var social = 0;
		var errands = 0;
		var family = 0;
		var other = 0;
		//weirdass way of looping loops
		function calculate(i) { 
			if( i < data.activities.length ) {
				var date = new Date(data.activities[i].date);
				var today = new Date();
				date.setHours(0,0,0,0);
				today.setHours(0,0,0,0);
				if (date.getTime() == today.getTime()) {
					switch(data.activities[i].category) {
						case "Work":
						work = data.activities[i].minutes ? work + data.activities[i].timeSpent : work + (data.activities[i].timeSpent * 60);
						break;
						case "Exercise":
						exercise = data.activities[i].minutes ? exercise + data.activities[i].timeSpent : exercise + (data.activities[i].timeSpent * 60);
						break;
						case "Entertainment":
						entertainment = data.activities[i].minutes ? entertainment + data.activities[i].timeSpent : entertainment + (data.activities[i].timeSpent * 60);
						break;
						case "School":
						school = data.activities[i].minutes ? school + data.activities[i].timeSpent : school + (data.activities[i].timeSpent * 60);
						break;
						case "Social":
						social = data.activities[i].minutes ? social + data.activities[i].timeSpent : social + (data.activities[i].timeSpent * 60);
						break;
						case "Errands":
						errands = data.activities[i].minutes ? errands + data.activities[i].timeSpent : errands + (data.activities[i].timeSpent * 60);
						break;
						case "Family":
						family = data.activities[i].minutes ? family + data.activities[i].timeSpent : family + (data.activities[i].timeSpent * 60);
						break;
						default: //also case other
						other = data.activities[i].minutes ? other + data.activities[i].timeSpent : other + (data.activities[i].timeSpent * 60);
						break;
					}
				}
				calculate(i+1);
			}
			
		}
		calculate(0);

		total = 0;
		if (data.work) { total += work; }
		if (data.exercise) { total += exercise; }
		if (data.entertainment) { total += entertainment; } 
		if (data.school) { total += school; }
		if (data.social) { total += social; }
		if (data.errands) { total += errands; }
		if (data.family) { total += family; }
		if (data.other) { total += other; }

		var workPercent = Math.round( ((work / total) * 100) * 100) / 100;
		var exercisePercent = Math.round( ((exercise / total) * 100) * 100) / 100;
		var entertainmentPercent = Math.round( ((entertainment / total) * 100) * 100) / 100;
		var schoolPercent = Math.round( ((school / total) * 100) * 100) / 100;
		var socialPercent = Math.round( ((social / total) * 100) * 100) / 100;
		var errandsPercent = Math.round( ((errands / total) * 100) * 100) / 100;
		var familyPercent = Math.round( ((family / total) * 100) * 100) / 100;
		var otherPercent = Math.round( ((other / total) * 100) * 100) / 100;
		var workGraph = isNaN(work) ? 0 : work;
		var exerciseGraph = isNaN(exercise) ? 0 : exercise;
		var entertainmentGraph = isNaN(entertainment) ? 0 : entertainment;
		var schoolGraph = isNaN(school) ? 0 : school;
		var socialGraph = isNaN(social) ? 0 : social;
		var errandsGraph = isNaN(errands) ? 0 : errands;
		var familyGraph = isNaN(family) ? 0 : family;
		var otherGraph = isNaN(other) ? 0 : other;

		if (isNaN(workPercent)) { workPercent = 0;}
		if (isNaN(exercisePercent)) { exercisePercent = 0;}
		if (isNaN(entertainmentPercent)) { entertainmentPercent = 0;}
		if (isNaN(schoolPercent)) { schoolPercent = 0; }
		if (isNaN(socialPercent)) { socialPercent = 0; }
		if (isNaN(errandsPercent)) { errandsPercent = 0; }
		if (isNaN(familyPercent)) { familyPercent = 0; }
		if (isNaN(otherPercent)) { otherPercent = 0; }


		//mothereffing edge case
		if ( (workPercent == 0) && (exercisePercent == 0) && 
			(entertainmentPercent == 0) && (schoolPercent == 0) && (socialPercent == 0) && (errandsPercent == 0) && (familyPercent == 0) && (otherPercent == 0)) {
			workGraph = 12.5;
		workPercent = 0;
		exerciseGraph = 12.5;
		exercisePercent = 0;
		entertainmentGraph = 12.5;
		entertainmentPercent = 0;
		schoolGraph = 12.5;
		schoolPercent = 0;
		socialGraph = 12.5;
		socialPercent = 0;
		errandsGraph = 12.5;
		errandsPercent = 0;
		familyGraph = 12.5;
		familyPercent = 0;
		otherGraph = 12.5;
		otherPercent = 0;
	}

	res.render('home', { pageData: {
		dDate: 'Today', 
		workPercent: workPercent, 
		exercisePercent: exercisePercent, 
		entertainmentPercent: entertainmentPercent, 
		schoolPercent: schoolPercent, 
		socialPercent: socialPercent,
		errandsPercent: errandsPercent,
		familyPercent: familyPercent,
		otherPercent: otherPercent,
		workGraph: workGraph,
		exerciseGraph: exerciseGraph,
		entertainmentGraph: entertainmentGraph,
		schoolGraph: schoolGraph,
		socialGraph: socialGraph,
		errandsGraph: errandsGraph,
		familyGraph: familyGraph,
		otherGraph: otherGraph,
		workOn: data.work,
		exerciseOn: data.exercise,
		entertainmentOn: data.entertainment,
		schoolOn: data.school,
		socialOn: data.social,
		errandsOn: data.errands,
		familyOn: data.family,
		otherOn: data.other,
		ab: true  }
	});
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

app.get('/workplay/:yearStart/:monthStart/:dayStart/:yearEnd/:monthEnd/:dayEnd', ensureAuthenticated, function(req,res) {
		//Convert year/month/day from path to databasecall
		var startDate = req.params.yearStart+'-'+req.params.monthStart+'-'+req.params.dayStart;
		var endDate = req.params.yearEnd+'-'+req.params.monthEnd+'-'+req.params.dayEnd;
		User.findOne({username: req.user.username}, 'activities', function(error, data){	
			var work = 0;
			var play = 0;
		//weirdass way of looping loops
		function calculate(i) { 
			if( i < data.activities.length ) {
				var date = new Date(data.activities[i].date);
				var sDate = new Date(startDate);
				var eDate = new Date(endDate);
				date.setHours(0,0,0,0);
				sDate.setHours(0,0,0,0);
				eDate.setHours(0,0,0,0);

				if ((date.getTime() >= sDate.getTime()) && (date.getTime() <= eDate.getTime())) {
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
		res.render('workplay', {pageData: {wpDate: startDate+' to '+endDate, workGraph: workGraph, playGraph: playGraph, workPercent: workPercent, playPercent: playPercent }});
		
	});
});

app.get('/workplay', ensureAuthenticated, function(req, res){
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
		res.render('workplay', {pageData: {wpDate: 'today', workGraph: workGraph, playGraph: playGraph, workPercent: workPercent, playPercent: playPercent }});
	});


});

app.get('/add', ensureAuthenticated, function(req, res){
	User.findOne({username: req.user.username}, function(error, data){
		res.render('add', { pageData: {
			workOn: data.work,
			exerciseOn: data.exercise,
			entertainmentOn: data.entertainment,
			schoolOn: data.school,
			socialOn: data.social,
			errandsOn: data.errands,
			familyOn: data.family,
			otherOn: data.other }
		});
	});
});

app.get('/categories', ensureAuthenticated, function(req, res){
	User.findOne({username: req.user.username}, function(error, data){
		var work = 0;
		var exercise = 0;
		var entertainment = 0;
		var school = 0;
		var social = 0;
		var errands = 0;
		var family = 0;
		var other = 0;
		//weirdass way of looping loops
		function calculate(i) { 
			if( i < data.activities.length ) {
				var date = new Date(data.activities[i].date);
				var today = new Date();
				date.setHours(0,0,0,0);
				today.setHours(0,0,0,0);
				if (date.getTime() == today.getTime()) {
					switch(data.activities[i].category) {
						case "Work":
						work = data.activities[i].minutes ? work + data.activities[i].timeSpent : work + (data.activities[i].timeSpent * 60);
						break;
						case "Exercise":
						exercise = data.activities[i].minutes ? exercise + data.activities[i].timeSpent : exercise + (data.activities[i].timeSpent * 60);
						break;
						case "Entertainment":
						entertainment = data.activities[i].minutes ? entertainment + data.activities[i].timeSpent : entertainment + (data.activities[i].timeSpent * 60);
						break;
						case "School":
						school = data.activities[i].minutes ? school + data.activities[i].timeSpent : school + (data.activities[i].timeSpent * 60);
						break;
						case "Social":
						social = data.activities[i].minutes ? social + data.activities[i].timeSpent : social + (data.activities[i].timeSpent * 60);
						break;
						case "Errands":
						errands = data.activities[i].minutes ? errands + data.activities[i].timeSpent : errands + (data.activities[i].timeSpent * 60);
						break;
						case "Family":
						family = data.activities[i].minutes ? family + data.activities[i].timeSpent : family + (data.activities[i].timeSpent * 60);
						break;
						default: //also case other
						other = data.activities[i].minutes ? other + data.activities[i].timeSpent : other + (data.activities[i].timeSpent * 60);
						break;
					}
				}
				calculate(i+1);
			}
			
		}
		calculate(0);

		total = 0;
		if (data.work) { total += work; }
		if (data.exercise) { total += exercise; }
		if (data.entertainment) { total += entertainment; } 
		if (data.school) { total += school; }
		if (data.social) { total += social; }
		if (data.errands) { total += errands; }
		if (data.family) { total += family; }
		if (data.other) { total += other; }

		var workPercent = Math.round( ((work / total) * 100) * 100) / 100;
		var exercisePercent = Math.round( ((exercise / total) * 100) * 100) / 100;
		var entertainmentPercent = Math.round( ((entertainment / total) * 100) * 100) / 100;
		var schoolPercent = Math.round( ((school / total) * 100) * 100) / 100;
		var socialPercent = Math.round( ((social / total) * 100) * 100) / 100;
		var errandsPercent = Math.round( ((errands / total) * 100) * 100) / 100;
		var familyPercent = Math.round( ((family / total) * 100) * 100) / 100;
		var otherPercent = Math.round( ((other / total) * 100) * 100) / 100;
		var workGraph = isNaN(work) ? 0 : work;
		var exerciseGraph = isNaN(exercise) ? 0 : exercise;
		var entertainmentGraph = isNaN(entertainment) ? 0 : entertainment;
		var schoolGraph = isNaN(school) ? 0 : school;
		var socialGraph = isNaN(social) ? 0 : social;
		var errandsGraph = isNaN(errands) ? 0 : errands;
		var familyGraph = isNaN(family) ? 0 : family;
		var otherGraph = isNaN(other) ? 0 : other;

		if (isNaN(workPercent)) { workPercent = 0;}
		if (isNaN(exercisePercent)) { exercisePercent = 0;}
		if (isNaN(entertainmentPercent)) { entertainmentPercent = 0;}
		if (isNaN(schoolPercent)) { schoolPercent = 0; }
		if (isNaN(socialPercent)) { socialPercent = 0; }
		if (isNaN(errandsPercent)) { errandsPercent = 0; }
		if (isNaN(familyPercent)) { familyPercent = 0; }
		if (isNaN(otherPercent)) { otherPercent = 0; }


		//mothereffing edge case
		if ( (workPercent == 0) && (exercisePercent == 0) && 
			(entertainmentPercent == 0) && (schoolPercent == 0) && (socialPercent == 0) && (errandsPercent == 0) && (familyPercent == 0) && (otherPercent == 0)) {
			workGraph = 12.5;
		workPercent = 0;
		exerciseGraph = 12.5;
		exercisePercent = 0;
		entertainmentGraph = 12.5;
		entertainmentPercent = 0;
		schoolGraph = 12.5;
		schoolPercent = 0;
		socialGraph = 12.5;
		socialPercent = 0;
		errandsGraph = 12.5;
		errandsPercent = 0;
		familyGraph = 12.5;
		familyPercent = 0;
		otherGraph = 12.5;
		otherPercent = 0;
	}

	res.render('categories', { pageData: {
		dDate: 'Today', 
		workPercent: workPercent, 
		exercisePercent: exercisePercent, 
		entertainmentPercent: entertainmentPercent, 
		schoolPercent: schoolPercent, 
		socialPercent: socialPercent,
		errandsPercent: errandsPercent,
		familyPercent: familyPercent,
		otherPercent: otherPercent,
		workGraph: workGraph,
		exerciseGraph: exerciseGraph,
		entertainmentGraph: entertainmentGraph,
		schoolGraph: schoolGraph,
		socialGraph: socialGraph,
		errandsGraph: errandsGraph,
		familyGraph: familyGraph,
		otherGraph: otherGraph,
		workOn: data.work,
		exerciseOn: data.exercise,
		entertainmentOn: data.entertainment,
		schoolOn: data.school,
		socialOn: data.social,
		errandsOn: data.errands,
		familyOn: data.family,
		otherOn: data.other  }
	});
});
});

app.get('/categories/all', ensureAuthenticated, function(req, res){
	User.findOne({username: req.user.username}, function(error, data){
		var work = 0;
		var exercise = 0;
		var entertainment = 0;
		var school = 0;
		var social = 0;
		var errands = 0;
		var family = 0;
		var other = 0;
		//weirdass way of looping loops
		function calculate(i) { 
			if( i < data.activities.length ) {
				switch(data.activities[i].category) {
					case "Work":
					work = data.activities[i].minutes ? work + data.activities[i].timeSpent : work + (data.activities[i].timeSpent * 60);
					break;
					case "Exercise":
					exercise = data.activities[i].minutes ? exercise + data.activities[i].timeSpent : exercise + (data.activities[i].timeSpent * 60);
					break;
					case "Entertainment":
					entertainment = data.activities[i].minutes ? entertainment + data.activities[i].timeSpent : entertainment + (data.activities[i].timeSpent * 60);
					break;
					case "School":
					school = data.activities[i].minutes ? school + data.activities[i].timeSpent : school + (data.activities[i].timeSpent * 60);
					break;
					case "Social":
					social = data.activities[i].minutes ? social + data.activities[i].timeSpent : social + (data.activities[i].timeSpent * 60);
					break;
					case "Errands":
					errands = data.activities[i].minutes ? errands + data.activities[i].timeSpent : errands + (data.activities[i].timeSpent * 60);
					break;
					case "Family":
					family = data.activities[i].minutes ? family + data.activities[i].timeSpent : family + (data.activities[i].timeSpent * 60);
					break;
						default: //also case other
						other = data.activities[i].minutes ? other + data.activities[i].timeSpent : other + (data.activities[i].timeSpent * 60);
						break;
					}
					calculate(i+1);
				}
				
			}
			calculate(0);
			
			total = 0;
			if (data.work) { total += work; }
			if (data.exercise) { total += exercise; }
			if (data.entertainment) { total += entertainment; } 
			if (data.school) { total += school; }
			if (data.social) { total += social; }
			if (data.errands) { total += errands; }
			if (data.family) { total += family; }
			if (data.other) { total += other; }

			var workPercent = Math.round( ((work / total) * 100) * 100) / 100;
			var exercisePercent = Math.round( ((exercise / total) * 100) * 100) / 100;
			var entertainmentPercent = Math.round( ((entertainment / total) * 100) * 100) / 100;
			var schoolPercent = Math.round( ((school / total) * 100) * 100) / 100;
			var socialPercent = Math.round( ((social / total) * 100) * 100) / 100;
			var errandsPercent = Math.round( ((errands / total) * 100) * 100) / 100;
			var familyPercent = Math.round( ((family / total) * 100) * 100) / 100;
			var otherPercent = Math.round( ((other / total) * 100) * 100) / 100;
			var workGraph = isNaN(work) ? 0 : work;
			var exerciseGraph = isNaN(exercise) ? 0 : exercise;
			var entertainmentGraph = isNaN(entertainment) ? 0 : entertainment;
			var schoolGraph = isNaN(school) ? 0 : school;
			var socialGraph = isNaN(social) ? 0 : social;
			var errandsGraph = isNaN(errands) ? 0 : errands;
			var familyGraph = isNaN(family) ? 0 : family;
			var otherGraph = isNaN(other) ? 0 : other;

			if (isNaN(workPercent)) { workPercent = 0;}
			if (isNaN(exercisePercent)) { exercisePercent = 0;}
			if (isNaN(entertainmentPercent)) { entertainmentPercent = 0;}
			if (isNaN(schoolPercent)) { schoolPercent = 0; }
			if (isNaN(errandsPercent)) { errandsPercent = 0; }
			if (isNaN(familyPercent)) { familyPercent = 0; }
			if (isNaN(otherPercent)) { otherPercent = 0; }
			if (isNaN(socialPercent)) { socialPercent = 0; }


		//mothereffing edge case
		if ( (workPercent == 0) && (exercisePercent == 0) && 
			(entertainmentPercent == 0) && (schoolPercent == 0) && (socialPercent == 0) && (errandsPercent == 0) && (familyPercent == 0) && (otherPercent == 0)) {
			workGraph = 12.5;
		workPercent = 0;
		exerciseGraph = 12.5;
		exercisePercent = 0;
		entertainmentGraph = 12.5;
		entertainmentPercent = 0;
		schoolGraph = 12.5;
		schoolPercent = 0;
		socialGraph = 12.5;
		socialPercent = 0;
		errandsGraph = 12.5;
		errandsPercent = 0;
		familyGraph = 12.5;
		familyPercent = 0;
		otherGraph = 12.5;
		otherPercent = 0;
	}

	res.render('categories', { pageData: {
		dDate: 'All', 
		workPercent: workPercent, 
		exercisePercent: exercisePercent, 
		entertainmentPercent: entertainmentPercent, 
		schoolPercent: schoolPercent, 
		socialPercent: socialPercent,
		errandsPercent: errandsPercent,
		familyPercent: familyPercent,
		otherPercent: otherPercent,
		workGraph: workGraph,
		exerciseGraph: exerciseGraph,
		entertainmentGraph: entertainmentGraph,
		schoolGraph: schoolGraph,
		socialGraph: socialGraph,
		errandsGraph: errandsGraph,
		familyGraph: familyGraph,
		otherGraph: otherGraph,
		workOn: data.work,
		exerciseOn: data.exercise,
		entertainmentOn: data.entertainment,
		schoolOn: data.school,
		socialOn: data.social,
		errandsOn: data.errands,
		familyOn: data.family,
		otherOn: data.other  }
	});
});
});


app.get('/categories/:year/:month/:day', ensureAuthenticated, function(req, res){
	User.findOne({username: req.user.username}, function(error, data){
		var work = 0;
		var exercise = 0;
		var entertainment = 0;
		var school = 0;
		var social = 0;
		var errands = 0;
		var family = 0;
		var other = 0;
		var queryDate = req.params.year+'-'+req.params.month+'-'+req.params.day;

		//weirdass way of looping loops
		function calculate(i) { 
			if( i < data.activities.length ) {
				var date = new Date(data.activities[i].date);
				var qDate = new Date(queryDate);
				date.setHours(0,0,0,0);
				qDate.setHours(0,0,0,0);
				if (date.getTime() == qDate.getTime()) {
					switch(data.activities[i].category) {
						case "Work":
						work = data.activities[i].minutes ? work + data.activities[i].timeSpent : work + (data.activities[i].timeSpent * 60);
						break;
						case "Exercise":
						exercise = data.activities[i].minutes ? exercise + data.activities[i].timeSpent : exercise + (data.activities[i].timeSpent * 60);
						break;
						case "Entertainment":
						entertainment = data.activities[i].minutes ? entertainment + data.activities[i].timeSpent : entertainment + (data.activities[i].timeSpent * 60);
						break;
						case "School":
						school = data.activities[i].minutes ? school + data.activities[i].timeSpent : school + (data.activities[i].timeSpent * 60);
						break;
						case "Social":
						social = data.activities[i].minutes ? social + data.activities[i].timeSpent : social + (data.activities[i].timeSpent * 60);
						break;
						case "Errands":
						errands = data.activities[i].minutes ? errands + data.activities[i].timeSpent : errands + (data.activities[i].timeSpent * 60);
						break;
						case "Family":
						family = data.activities[i].minutes ? family + data.activities[i].timeSpent : family + (data.activities[i].timeSpent * 60);
						break;
						default: //also case other
						other = data.activities[i].minutes ? other + data.activities[i].timeSpent : other + (data.activities[i].timeSpent * 60);
						break;
					}
				}
				calculate(i+1);
			}
			
		}
		calculate(0);

		total = 0;
		if (data.work) { total += work; }
		if (data.exercise) { total += exercise; }
		if (data.entertainment) { total += entertainment; } 
		if (data.school) { total += school; }
		if (data.social) { total += social; }
		if (data.errands) { total += errands; }
		if (data.family) { total += family; }
		if (data.other) { total += other; }


		var workPercent = Math.round( ((work / total) * 100) * 100) / 100;
		var exercisePercent = Math.round( ((exercise / total) * 100) * 100) / 100;
		var entertainmentPercent = Math.round( ((entertainment / total) * 100) * 100) / 100;
		var schoolPercent = Math.round( ((school / total) * 100) * 100) / 100;
		var socialPercent = Math.round( ((social / total) * 100) * 100) / 100;
		var errandsPercent = Math.round( ((errands / total) * 100) * 100) / 100;
		var familyPercent = Math.round( ((family / total) * 100) * 100) / 100;
		var otherPercent = Math.round( ((other / total) * 100) * 100) / 100;
		var workGraph = isNaN(work) ? 0 : work;
		var exerciseGraph = isNaN(exercise) ? 0 : exercise;
		var entertainmentGraph = isNaN(entertainment) ? 0 : entertainment;
		var schoolGraph = isNaN(school) ? 0 : school;
		var socialGraph = isNaN(social) ? 0 : social;
		var errandsGraph = isNaN(errands) ? 0 : errands;
		var familyGraph = isNaN(family) ? 0 : family;
		var otherGraph = isNaN(other) ? 0 : other;

		if (isNaN(workPercent)) { workPercent = 0;}
		if (isNaN(exercisePercent)) { exercisePercent = 0;}
		if (isNaN(entertainmentPercent)) { entertainmentPercent = 0;}
		if (isNaN(schoolPercent)) { schoolPercent = 0; }
		if (isNaN(socialPercent)) { socialPercent = 0; }
		if (isNaN(errandsPercent)) { errandsPercent = 0; }
		if (isNaN(familyPercent)) { familyPercent = 0; }
		if (isNaN(otherPercent)) { otherPercent = 0; }


		//mothereffing edge case
		if ( (workPercent == 0) && (exercisePercent == 0) && 
			(entertainmentPercent == 0) && (schoolPercent == 0) && (socialPercent == 0) && (errandsPercent == 0) && (familyPercent == 0) && (otherPercent == 0)) {
			workGraph = 12.5;
		workPercent = 0;
		exerciseGraph = 12.5;
		exercisePercent = 0;
		entertainmentGraph = 12.5;
		entertainmentPercent = 0;
		schoolGraph = 12.5;
		schoolPercent = 0;
		socialGraph = 12.5;
		socialPercent = 0;
		errandsGraph = 12.5;
		errandsPercent = 0;
		familyGraph = 12.5;
		familyPercent = 0;
		otherGraph = 12.5;
		otherPercent = 0;
	}

	res.render('categories', { pageData: { 
		dDate: queryDate,
		workPercent: workPercent, 
		exercisePercent: exercisePercent, 
		entertainmentPercent: entertainmentPercent, 
		schoolPercent: schoolPercent, 
		socialPercent: socialPercent,
		errandsPercent: errandsPercent,
		familyPercent: familyPercent,
		otherPercent: otherPercent,
		workGraph: workGraph,
		exerciseGraph: exerciseGraph,
		entertainmentGraph: entertainmentGraph,
		schoolGraph: schoolGraph,
		socialGraph: socialGraph,
		errandsGraph: errandsGraph,
		familyGraph: familyGraph,
		otherGraph: otherGraph,
		workOn: data.work,
		exerciseOn: data.exercise,
		entertainmentOn: data.entertainment,
		schoolOn: data.school,
		socialOn: data.social,
		errandsOn: data.errands,
		familyOn: data.family,
		otherOn: data.other  }
	});
});
});

app.get('/categories/:yearStart/:monthStart/:dayStart/:yearEnd/:monthEnd/:dayEnd', ensureAuthenticated, function(req, res){
	User.findOne({username: req.user.username}, function(error, data){
		var work = 0;
		var exercise = 0;
		var entertainment = 0;
		var school = 0;
		var social = 0;
		var errands = 0;
		var family = 0;
		var other = 0;

		var startDate = req.params.yearStart+'-'+req.params.monthStart+'-'+req.params.dayStart;
		var endDate = req.params.yearEnd+'-'+req.params.monthEnd+'-'+req.params.dayEnd;

		//weirdass way of looping loops
		function calculate(i) { 
			if( i < data.activities.length ) {
				var date = new Date(data.activities[i].date);
				var sDate = new Date(startDate);
				var eDate = new Date(endDate);
				date.setHours(0,0,0,0);
				sDate.setHours(0,0,0,0);
				eDate.setHours(0,0,0,0);

				if ((date.getTime() >= sDate.getTime()) && (date.getTime() <= eDate.getTime())) {
					switch(data.activities[i].category) {
						case "Work":
						work = data.activities[i].minutes ? work + data.activities[i].timeSpent : work + (data.activities[i].timeSpent * 60);
						break;
						case "Exercise":
						exercise = data.activities[i].minutes ? exercise + data.activities[i].timeSpent : exercise + (data.activities[i].timeSpent * 60);
						break;
						case "Entertainment":
						entertainment = data.activities[i].minutes ? entertainment + data.activities[i].timeSpent : entertainment + (data.activities[i].timeSpent * 60);
						break;
						case "School":
						school = data.activities[i].minutes ? school + data.activities[i].timeSpent : school + (data.activities[i].timeSpent * 60);
						break;
						case "Social":
						social = data.activities[i].minutes ? social + data.activities[i].timeSpent : social + (data.activities[i].timeSpent * 60);
						break;
						case "Errands":
						errands = data.activities[i].minutes ? errands + data.activities[i].timeSpent : errands + (data.activities[i].timeSpent * 60);
						break;
						case "Family":
						family = data.activities[i].minutes ? family + data.activities[i].timeSpent : family + (data.activities[i].timeSpent * 60);
						break;
						default: //also case other
						other = data.activities[i].minutes ? other + data.activities[i].timeSpent : other + (data.activities[i].timeSpent * 60);
						break;
					}
				}
				calculate(i+1);
			}
			
		}
		calculate(0);


		
		total = 0;
		if (data.work) { total += work; }
		if (data.exercise) { total += exercise; }
		if (data.entertainment) { total += entertainment; } 
		if (data.school) { total += school; }
		if (data.social) { total += social; }
		if (data.errands) { total += errands; }
		if (data.family) { total += family; }
		if (data.other) { total += other; }


		var workPercent = Math.round( ((work / total) * 100) * 100) / 100;
		var exercisePercent = Math.round( ((exercise / total) * 100) * 100) / 100;
		var entertainmentPercent = Math.round( ((entertainment / total) * 100) * 100) / 100;
		var schoolPercent = Math.round( ((school / total) * 100) * 100) / 100;
		var socialPercent = Math.round( ((social / total) * 100) * 100) / 100;
		var errandsPercent = Math.round( ((errands / total) * 100) * 100) / 100;
		var familyPercent = Math.round( ((family / total) * 100) * 100) / 100;
		var otherPercent = Math.round( ((other / total) * 100) * 100) / 100;
		var workGraph = isNaN(work) ? 0 : work;
		var exerciseGraph = isNaN(exercise) ? 0 : exercise;
		var entertainmentGraph = isNaN(entertainment) ? 0 : entertainment;
		var schoolGraph = isNaN(school) ? 0 : school;
		var socialGraph = isNaN(social) ? 0 : social;
		var errandsGraph = isNaN(errands) ? 0 : errands;
		var familyGraph = isNaN(family) ? 0 : family;
		var otherGraph = isNaN(other) ? 0 : other;


		if (isNaN(workPercent)) { workPercent = 0;}
		if (isNaN(exercisePercent)) { exercisePercent = 0;}
		if (isNaN(entertainmentPercent)) { entertainmentPercent = 0;}
		if (isNaN(schoolPercent)) { schoolPercent = 0; }
		if (isNaN(socialPercent)) { socialPercent = 0; }
		if (isNaN(errandsPercent)) { errandsPercent = 0; }
		if (isNaN(familyPercent)) { familyPercent = 0; }
		if (isNaN(otherPercent)) { otherPercent = 0; }

		//mothereffing edge case
		if ( (workPercent == 0) && (exercisePercent == 0) && 
			(entertainmentPercent == 0) && (schoolPercent == 0) && (socialPercent == 0) && (errandsPercent == 0) && (familyPercent == 0) && (otherPercent == 0)) {
			workGraph = 12.5;
		workPercent = 0;
		exerciseGraph = 12.5;
		exercisePercent = 0;
		entertainmentGraph = 12.5;
		entertainmentPercent = 0;
		schoolGraph = 12.5;
		schoolPercent = 0;
		socialGraph = 12.5;
		socialPercent = 0;
		errandsGraph = 12.5;
		errandsPercent = 0;
		familyGraph = 12.5;
		familyPercent = 0;
		otherGraph = 12.5;
		otherPercent = 0;
	}

	res.render('categories', { pageData: { 
		dDate: startDate+ ' to ' +endDate,
		workPercent: workPercent, 
		exercisePercent: exercisePercent, 
		entertainmentPercent: entertainmentPercent, 
		schoolPercent: schoolPercent, 
		socialPercent: socialPercent,
		errandsPercent: errandsPercent,
		familyPercent: familyPercent,
		otherPercent: otherPercent,
		workGraph: workGraph,
		exerciseGraph: exerciseGraph,
		entertainmentGraph: entertainmentGraph,
		schoolGraph: schoolGraph,
		socialGraph: socialGraph,
		errandsGraph: errandsGraph,
		familyGraph: familyGraph,
		otherGraph: otherGraph,
		workOn: data.work,
		exerciseOn: data.exercise,
		socialOn: data.social,
		entertainmentOn: data.entertainment,
		schoolOn: data.school,
		errandsOn: data.errands,
		familyOn: data.family,
		otherOn: data.other }
	});
});
});
app.get('/statistics', ensureAuthenticated, function(req, res) {
	User.findOne({username: req.user.username}, function(error, data){


		var work = 0;
		var play = 0;
		var catArr = {
			work: 0, 
			exercise: 0, 
			entertainment: 0, 
			school: 0, 
			errands: 0, 
			family: 0, 
			social: 0, 
			other: 0
		};
		var longestActivityName = "";
		var longestActivityTime = 0;
		var today = new Date();
		today.setHours(0,0,0,0);
		var sevendaysago = new Date();
		sevendaysago.setHours(0,0,0,0);
		sevendaysago.setDate(sevendaysago.getDate()-7);

		function calculate(i) { 
			
			if( i < data.activities.length ) {
				var date = new Date(data.activities[i].date);
				date.setHours(0,0,0,0);
				if ((date.getTime() >= sevendaysago.getTime()) && (date.getTime() <= today.getTime())) {
					if (data.activities[i].timeSpent > longestActivityTime) {
						longestActivityTime = data.activities[i].timeSpent;
						longestActivityName = data.activities[i].activity;
					}
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

					switch(data.activities[i].category) {
						case "Work":
						catArr.work = data.activities[i].minutes ? catArr.work + data.activities[i].timeSpent : catArr.work + (data.activities[i].timeSpent * 60);
						break;
						case "Exercise":
						catArr.exercise = data.activities[i].minutes ? catArr.exercise + data.activities[i].timeSpent : catArr.exercise + (data.activities[i].timeSpent * 60);
						break;
						case "Entertainment":
						catArr.entertainment = data.activities[i].minutes ? catArr.entertainment + data.activities[i].timeSpent : catArr.entertainment + (data.activities[i].timeSpent * 60);
						break;
						case "School":
						catArr.school = data.activities[i].minutes ? catArr.school  + data.activities[i].timeSpent : catArr.school + (data.activities[i].timeSpent * 60);
						break;
						case "Social":
						catArr.social = data.activities[i].minutes ? catArr.social + data.activities[i].timeSpent : catArr.social + (data.activities[i].timeSpent * 60);
						break;
						case "Errands":
						catArr.errands = data.activities[i].minutes ? catArr.errands + data.activities[i].timeSpent : catArr.errands + (data.activities[i].timeSpent * 60);
						break;
						case "Family":
						catArr.family = data.activities[i].minutes ? catArr.family + data.activities[i].timeSpent : catArr.family + (data.activities[i].timeSpent * 60);
						break;
						default: //also case other
						catArr.other = data.activities[i].minutes ? catArr.other + data.activities[i].timeSpent : catArr.other + (data.activities[i].timeSpent * 60);
						break;
					}
					calculate(i+1);
				}
			}

		}
		calculate(0);
		var bestActivity = "";
		var tempVal = 0;
		var activityVal = 0;
		for (var key in catArr) {
			activityVal += catArr[key];
			if (catArr[key] > tempVal) {
				bestActivity = key + "";
				tempVal = catArr[key];
			}
			
		}
		var activityPercent = Math.round( ((tempVal/activityVal) * 100) * 100) /100;
		var playGoal = 100 - data.goal;
		var workGoal = data.goal;
		var currentWorkGoal = Math.round( ((work / (work + play)) * 100) * 100) / 100;
		var currentPlayGoal = Math.round( ((play / (work + play)) * 100) * 100) / 100; 
		//TODO BUG IN THIS CALCULATION. NEED TO FIX. 
		var totalPercentAway = Math.round(Math.abs(playGoal - currentPlayGoal) * 100) / 100;

		if(isNaN(totalPercentAway)) {
			console.log("totalPercentAway is not a number");
			console.log(totalPercentAway);
			totalPercentAway = -1;
		}

		res.render('statistics', { pageData: { 
			longestActivityName: longestActivityName,
			bestActivity: bestActivity,
			activityPercent: activityPercent,
			playGoal: playGoal,
			workGoal: workGoal,
			currentPlayGoal: currentPlayGoal,
			currentWorkGoal: currentWorkGoal,
			totalPercentAway: totalPercentAway
		}
	});
	});

});
app.get('/settings', ensureAuthenticated, function(req, res) {
	User.findOne({username: req.user.username}, function(error, user){
		var work = user.work;
		var exercise = user.exercise;
		var entertainment = user.entertainment;
		var school = user.school;
		var errands = user.errands;
		var family = user.family;
		var social = user.social;
		var other = user.other;
		var workGoal = user.goal;
		var playGoal = 100 - user.goal;
		res.render('settings', { pageData: { 
			work: work,
			exercise: exercise,
			entertainment: entertainment,
			school: school,
			errands: errands,
			family: family,
			social: social,
			other: other,
			workGoal: workGoal,
			playGoal: playGoal
		}});
	});
});

app.post('/settings', ensureAuthenticated, function(req, res) {
	// Couldn't figure out how to use upsert, gonna use two DB calls because IDGAF
	User.findOne({username: req.user.username}, function(error, user){
		user.work = req.body.work == 'on' ? true : false;
		user.exercise = req.body.exercise == 'on' ? true : false;
		user.entertainment = req.body.entertainment == 'on' ? true : false;
		user.school = req.body.school == 'on' ? true : false;
		user.errands = req.body.errands == 'on' ? true : false;
		user.family = req.body.family == 'on' ? true : false;
		user.social = req.body.family == 'on' ? true : false;
		user.other = req.body.family == 'on' ? true : false;
		user.goal = req.body.workGoal;

		user.save(function(err) {
			if (err){
				console.log(err);
			}
		});

	});	
	res.redirect('/settings');
});


app.get('/add', ensureAuthenticated, routes.add);
app.post('/add', ensureAuthenticated, function(req, res) {
	User.findOne({username: req.user.username}, function(error, user){
		if(error){
			console.log(error);
		}
		else if(user == null){
			console.log('no such user!')
		} else{
				//Data converter
				var timeUnit = ((req.body.timeUnit == "minutes") || (req.body.timeUnit == "minute")) ? timeUnit = true : timeUnit = false;
				var workUnit = req.body.workplayRadios == 'work' ? workUnit = true : workUnit = false;
				user.activities.push({
					"activity" : req.body.activity,
					"category" : req.body.category,
					"timeSpent" : req.body.timeSpent,
					"minutes" : timeUnit,
					"work" : workUnit,
					"date" : req.body.date
				});
				user.save( function(error, data){
					if(error){
						console.log(error);
					} else{
						console.log(data);
					}
				});
			}
		});
	res.redirect('/workplay');
});

//other items
app.get('/calendar/:path', ensureAuthenticated, function(req, res) {
	res.render('calendar', { title: 'calendar' });
});
app.post('/calendar/:path', ensureAuthenticated, function(req, res) {
	if (req.body.start[1] == '') {
		var dateArr = req.body.start[0].split("-");
		var redirString = "/" + req.params.path + "/" + dateArr[0] + "/" + dateArr[1] + "/" + dateArr[2];
		res.redirect(redirString);
	} else {
		var startArr = req.body.start[0].split("-");
		var endArr = req.body.start[1].split("-");
		var redirString = "/" + req.params.path + "/" + startArr[0] + "/" + startArr[1] + "/" + startArr[2] + "/" + endArr[0] + "/" + endArr[1] + "/" + endArr[2];
		res.redirect(redirString);

	}
});
app.get('/details/:type/:category', ensureAuthenticated, function(req,res) {
	User.findOne({username: req.user.username}, function(error, data){
		var iterativeObj = [];
		function calculate(i) { 
			if( i < data.activities.length ) {
				console.log(data.activities[i]);
				if (req.params.type == 'workplay') {
					if (req.params.category == 'work' && data.activities[i].work) {
						if (data.activities[i].timeSpent == '1') {
							var minutesStr = data.activities[i].minutes ? 'minute' : 'hour';
						} else {
							var minutesStr = data.activities[i].minutes ? 'minutes' : 'hours';
						}
						var workplay = data.activities[i].work ? 'Work' : 'Play';
						var date = new Date(data.activities[i].date),
							mm = date.getMonth() + 1,
							dd = date.getDate(),
							yyyy = date.getFullYear();
						if (mm < 10) { mm = '0' + mm; }
						if (dd < 10) { dd = '0' + dd; }
						date = mm + '/' + dd + '/' + yyyy;
						var pushObj = {
							activityID: data.activities[i]._id,
							activity: data.activities[i].activity,
							date: data.activities[i].date,
							parsedDate: date,
							durationTime: data.activities[i].timeSpent,
							durationStr: minutesStr,
							category: data.activities[i].category,
							workplay: workplay
						};
						iterativeObj.push(pushObj);
					} else if (req.params.category == 'play' && !data.activities[i].work) {
						if (data.activities[i].timeSpent == '1') {
							var minutesStr = data.activities[i].minutes ? 'minute' : 'hour';
						} else {
							var minutesStr = data.activities[i].minutes ? 'minutes' : 'hours';
						}
						var workplay = data.activities[i].work ? 'Work' : 'Play';
						var date = new Date(data.activities[i].date),
							mm = date.getMonth() + 1,
							dd = date.getDate(),
							yyyy = date.getFullYear();
						if (mm < 10) { mm = '0' + mm; }
						if (dd < 10) { dd = '0' + dd; }
						date = mm + '/' + dd + '/' + yyyy;
						var pushObj = {
							activityID: data.activities[i]._id,
							activity: data.activities[i].activity,
							date: data.activities[i].date,
							parsedDate: date,
							durationTime: data.activities[i].timeSpent,
							durationStr: minutesStr,
							category: data.activities[i].category,
							workplay: workplay
						};
						iterativeObj.push(pushObj);
					}

				} else if (req.params.type == 'category') {
					if (req.params.category.toLowerCase() == data.activities[i].category.toLowerCase()) {
						if (data.activities[i].timeSpent == '1') {
							var minutesStr = data.activities[i].minutes ? 'minute' : 'hour';
						} else {
							var minutesStr = data.activities[i].minutes ? 'minutes' : 'hours';
						}
						var workplay = data.activities[i].work ? 'Work' : 'Play';
						var date = new Date(data.activities[i].date),
							mm = date.getMonth() + 1,
							dd = date.getDate(),
							yyyy = date.getFullYear();
						if (mm < 10) { mm = '0' + mm; }
						if (dd < 10) { dd = '0' + dd; }
						date = mm + '/' + dd + '/' + yyyy;
						var pushObj = {
							activityID: data.activities[i]._id,
							activity: data.activities[i].activity,
							date: data.activities[i].date,
							parsedDate: date,
							durationTime: data.activities[i].timeSpent,
							durationStr: minutesStr,
							category: data.activities[i].category,
							workplay: workplay
						};
					} else if (req.params.category == 'all') {
						if (data.activities[i].timeSpent == '1') {
							var minutesStr = data.activities[i].minutes ? 'minute' : 'hour';
						} else {
							var minutesStr = data.activities[i].minutes ? 'minutes' : 'hours';
						}
						var workplay = data.activities[i].work ? 'Work' : 'Play';
						var date = new Date(data.activities[i].date),
							mm = date.getMonth() + 1,
							dd = date.getDate(),
							yyyy = date.getFullYear();
						if (mm < 10) { mm = '0' + mm; }
						if (dd < 10) { dd = '0' + dd; }
						date = mm + '/' + dd + '/' + yyyy;
						var pushObj = {
							activityID: data.activities[i]._id,
							activity: data.activities[i].activity,
							date: data.activities[i].date,
							parsedDate: date,
							durationTime: data.activities[i].timeSpent,
							durationStr: minutesStr,
							category: data.activities[i].category,
							workplay: workplay
						};
						iterativeObj.push(pushObj);
					} else {

					}

				}
				calculate(i+1);
			}
			
		}
		calculate(0);
		res.render('details', { pageData: { 
			detailList: iterativeObj, 
			workOn: data.work,
			exerciseOn: data.exercise,
			entertainmentOn: data.entertainment,
			schoolOn: data.school,
			socialOn: data.social,
			errandsOn: data.errands,
			familyOn: data.family,
			otherOn: data.other } 
		});
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
