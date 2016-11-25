var http 	= require('http');
var io 		= require('socket.io');
var knex 	= require('knex');
var bcrypt 	= require("bcrypt-nodejs");
var config = require("./config.json");

var db = knex(config);

console.log("\nStarting Beacon Server");
console.log("========================");
console.log("Listening on port 4000");

// Create server & socket
var server = http.createServer(function(req, res)
{
  // Send HTML headers and message
  res.writeHead(200, {'Content-Type': 'text/html'});
  res.end('<h1>Status: Online</h1>');
});
server.listen(4000);
io = io.listen(server);

var recievedFirstMessage = false;

// Add a connect listener
io.sockets.on('connection', function(socket)
{
  console.log('Client connected.');

  socket.on('movement', function(data) {
  	if(!recievedFirstMessage){
  		console.log("Verified recieving data...")
  	}
  	recievedFirstMessage = true;


  	db.select("id","key_hash").from("Beacon").where("long_id",data.id).then(function(rows){
  		if(!rows[0]){
  			console.log("A beacon with id = " + data.id + " wasn't found");
  			return;
  		}
  		var row = rows[0];

  		if(bcrypt.compareSync(data.key, row.key_hash)){
  			db("Beacon").where("id",row.id).update({
  				 lat:data.lat
  				,lng:data.lng
  				,time_of_last_location:data.date
  			}).then();
  		}else{
  			console.log("Key doesn't match hash");
  		}
  	})
  	// console.log(row);
  	//db.insert({ lat:data.lat, lng:data.lng})
  	// console.log(data);
  });

  // Disconnect listener
  socket.on('disconnect', function() {
  	console.log('Client disconnected.');
  });
});