var express = require('express');
var knex 	= require('knex');
var bcrypt 	= require("bcrypt-nodejs");
var config = require("./config.json");

var db = knex(config);

var app = express();

app.use(express.static('public'))

console.log("\nStarting Admin Server");
console.log("=====================");

app.post('/beacon', function (req, res) {
	var longId 	= guid();
	var key 	= guid();
	var hash 	= bcrypt.hashSync(key);

	db.insert({ 
		 long_id: longId 
		,key_hash: hash
		,lat:0
		,lng:0
	}).into('Beacon').then();

	res.end(key);
});

function guid(){
	return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
	    var r = Math.random()*16|0, v = c == 'x' ? r : (r&0x3|0x8);
	    return v.toString(16);
	});
}

console.log("Listening on port 2000");
app.listen(2000);