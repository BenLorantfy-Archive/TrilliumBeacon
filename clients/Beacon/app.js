// Author: Ben Lorantfy
// Date: Nov 7th 2016
// Desc: This file simulates a beacon by sending GPS coordinates every few seconds

var io = require('socket.io-client');

var id = "";
var key = "";
var lat = 0;
var lng = 0;
var exit = false;
var usage = "usage: node app <id> <key> <lat> <lng>";

// [ Get all the arguments ]
if(typeof process.argv[2] === "undefined"){
	console.log("id is required");
	exit = true;
}

if(typeof process.argv[3] === "undefined"){
	console.log("key is required");
	exit = true;
}

if(typeof process.argv[4] === "undefined"){
	console.log("lat is required");
	exit = true;
}

if(typeof process.argv[5] === "undefined"){
	console.log("lng is required");
	exit = true;
}

if(exit){
	console.log(usage);
	process.exit();
}

// Kitchener: 43.439216, -80.468272
id = process.argv[2];
key = process.argv[3];
lat = process.argv[4] * 1;
lng = process.argv[5] * 1;

// [ Create the socket ]
var socket = io.connect('http://localhost:4000/beacons', {reconnect: true});
// var socket = io.connect('http://ec2-54-88-176-255.compute-1.amazonaws.com:4000/', {reconnect: true});


console.log("\nStarting Beacon");
console.log("=================")
console.log("Looking for server on port 4000");

// [ Add a connect listener ]
socket.on('connect', function(data) { 
	// [ Every few seconds send the GPS coordiantes ]
	(function send(socket){
		socket.emit("movement",{
			 lat:lat + Math.random() * 0.0005 - 0.0005
			,lng:lng + Math.random() * 0.0005 - 0.0005
			,key:key
			,id:id
			,date:(new Date()).toISOString()
		})
		setTimeout(function(){ send(socket); },Math.random() * 5000);
	})(socket);
    
    // [ Send the signal type ]
    var signal = getRandomSignal();
    socket.emit("signal",{
        "type":signal
        ,key:key
        ,id:id
        ,date:(new Date()).toISOString()        
    })

	console.log('Connected to server at port 4000');
});

function getRandomSignal(){
    var signals = ["water","food","clothing"];
    var signal = signals[
        (function() {
          min = Math.ceil(0);
          max = Math.floor(signals.length - 1);
          return Math.floor(Math.random() * (max - min + 1)) + min;
        })()
    ]
    return signal;
}