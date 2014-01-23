require 'sinatra'
require 'json'

get '/' do
    "THIS SHOULD WORK"
end

get '/hi' do
    "Hello World!"
end

get '/api/example' do
    content_type :json
    { :key1 => 'value1', :key2 => 'value2' }.to_json
end