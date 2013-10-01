require 'sinatra'
require 'httparty'
require 'json'

get '/' do
    erb :index
end

get '/main' do
    erb :main
end

get '/me/:token' do
    response = HTTParty.get('https://api.venmo.com/me?access_token=' + params[:token]);
    response.body.to_json;
end

get '/me/friends/:id/:token' do
    response = HTTParty.get('https://api.venmo.com/users/'+params[:id]+'/friends?access_token=' + params[:token] +"&limit=1000")
    response.body.to_json;
end

get '/me/pay/:token/:id/:amount/:message' do
    link = "https://api.venmo.com/payments"
    link << "?access_token=" + params[:token]
    link << "&user_id=" + params[:id]
    link << "&note=" + params[:message]
    link << "&amount=" + params[:amount]
    puts link
    response = HTTParty.post(link);
    response.body.to_json;
end


