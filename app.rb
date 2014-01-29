require 'sinatra'
require 'json'
require 'sinatra/activerecord'#DB ORM
require 'slim' #templating engine
require './config/environments' #DB

get '/' do
    slim :index
end

get '/hi' do
    "Hello World!"
end

get '/api/example' do
    content_type :json
    { :key1 => 'value1', :key2 => 'value2' }.to_json
end

#Because fuck models
class Sources < ActiveRecord::Base
self.primary_key = :sourceID
  #We will need to define some logic for sources lateron though
end




__END__

#basic layout for testing
@@layout
doctype html
html
  head 
    meta charset="utf-8"
    title TimeWastr 
    link rel="stylesheet" href="css/bootstrap.min.css"
    link rel="stylesheet" href="css/bootstrap-theme.min.css"
    /[if lt IE 9] 
      script src="http://html5shiv.googlecode.com/svn/trunk/html5.js"
  body 
    h1 TimeWastr
    script src="js/bootstrap.min.js"
    == yield
 
@@index
h2 This list wastes time
ul.stuff
  li Time
  li Wastr