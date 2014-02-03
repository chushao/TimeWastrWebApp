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

#DB Model
class Source < ActiveRecord::Base
  has_many :likes, as: :likable
  validates :name, presence: true
  
  has_many :history
  has_many :topics, through: :history
  has_many :users, through: :history

end

class Topic < ActiveRecord::Base
  has_many :likes, as: :likable
  validates :name, presence: true

  has_many :history
  has_many :sources, through: :history
  has_many :users, through: :history
end

class User < ActiveRecord::Base
  validates :email, uniqueness: true
  validates :password, length: { minimum: 5 }
  has_many :likes

  has_many :histories
  has_many :sources, through: :history
  has_many :topics, through: :history
end

class Like < ActiveRecord::Base
  belongs_to :likeable, polymorphic: true
  belongs_to :users
end

class History < ActiveRecord::Base
  belongs_to :sources
  belongs_to :topics
  belongs_to :users
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