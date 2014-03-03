
var User = require('../models/user');
var mongoose = require('mongoose');
var User = mongoose.model('User');
/*
 * GET home page.
 */

exports.index = function(req, res){
  res.render('index', { title: 'index' });
};

exports.signup = function(req, res){
  res.render('signup', { title: 'sign up' });
};

exports.resetpassword = function(req, res){
  res.render('resetpassword', { title: 'reset password' });
};

exports.workplay = function(req, res){
  console.log(User);
  res.render('workplay', { title: 'work/play' });
};

exports.doughnut = function(req, res){
  res.render('doughnut', { title: 'doughnut' });
};

exports.statistics = function(req, res){
  res.render('statistics', { title: 'statistics' });
};

exports.settings = function(req, res){
  res.render('settings', { title: 'settings' });
};

exports.add = function(req, res){
  res.render('add', { title: 'add' });
};

exports.calendar = function(req, res){
  res.render('calendar', { title: 'calendar', origin: '/' + req.query.origin });
};

exports.details = function(req, res){
  res.render('details', { title: 'details', category: req.query.category });
};