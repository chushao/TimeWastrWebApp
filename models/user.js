var hash = require('../hash');
var mongoose = require('mongoose');

//Database schema models
var Schema = mongoose.Schema
  , ObjectId = Schema.ObjectId;

var Activity = new Schema( {
	activity : { type: String }
  , category : { type: String }
  , timeSpent : Number
  , minutes :  Boolean
  , work : Boolean
  , date : { type: String }
});

var User = new Schema( {
	id: Number
  , email: { type: String, default: '' }
  , salt: { type: String, default: ''}
  , hash: { type: String, default: ''}
  , username: { type: String, default: '' }
  , goal: Number  //Goal is how much % work. 1 - goals = how much % play
  , activities: [Activity] //Array of multiple Activity object
  , work: Boolean //Hard coding categories to be easier of management for settings
  , exercise: Boolean
  , entertainment: Boolean
  , school: Boolean
  , errands: Boolean
  , family: Boolean
  , social: Boolean
  , other: Boolean //Even though boolean, currently will always be true
});

User.statics.signup = function(email, password, done){
	var User = this;
	hash(password, function(err, salt, hash){
		if(err) throw err;
		// if (err) return done(err);
		User.create({
			id: Math.floor((Math.random()*1000)+1),
			email : email,
			salt : salt,
			hash : hash,
			username: email,
			goal: 50,
			work: true,
			exercise: true,
			entertainment: true,
			social: true,
			school: true,
			errands: true,
			family: true,
			other: true

		}, function(err, user){
			if(err) throw err;
			// if (err) return done(err);
			done(null, user);
		});
	});
}

User.statics.isValidUserPassword = function(email, password, done) {
	this.findOne({email : email}, function(err, user){
		// if(err) throw err;
		if(err) return done(err);
		if(!user) return done(null, false, { message : 'Incorrect email.' });
		hash(password, user.salt, function(err, hash){
			if(err) return done(err);
			if(hash == user.hash) return done(null, user);
			done(null, false, {
				message : 'Incorrect password'
			});
		});
	});
};

var User = mongoose.model('User', User);
module.exports = User;