var http 	= require('http');
var io 		= require('socket.io');
var knex 	= require('knex');
// var bcrypt 	= require("bcrypt-nodejs");
var config = require("./config.json");

var db = knex(config);

console.log("\nStarting App Server");
console.log("=====================");
console.log("Listening on port 3000");

// Create server & socket
var server = http.createServer(function(req, res)
{
  // Send HTML headers and message
  res.writeHead(200, {'Content-Type': 'text/html'});
  res.end('<h1>Status: Online</h1>');
});
server.listen(3000);
io = io.listen(server);

// Add a connect listener
io.sockets.on('connection', function(socket){
  console.log('Client connected.');

  // Disconnect listener
  socket.on('disconnect', function() {
  	console.log('Client disconnected.');
  });
});

(function send(io){
  db.select("long_id","lat","lng","time_of_last_location","water","food","clothing").from("Beacon").then(function(rows){
    io.sockets.emit("beacons",rows)
    setTimeout(function(){ send(io); },1000);
  });

})(io);