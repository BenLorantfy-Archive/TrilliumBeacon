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
var server = http.createServer(function(req, res){
  // Send HTML headers and message
  res.writeHead(200, {'Content-Type': 'text/html'});
  res.end('<h1>Status: Online</h1>');
});
server.listen(4000);
io = io.listen(server);

var recieving = false;

// [ On beacon connection ]
io.of("/beacons").on('connection', function(socket){
    console.log('Beacon connected.');

    socket.on('movement', function(data) {
        verifyRecieving();
        
        getBeacon(data.id,data.key,function(id){
          db("Beacon").where("id",id).update({
             lat:data.lat
            ,lng:data.lng
            ,time_of_last_location:(new Date()).toISOString()
          }).then();
        });                
    });
    
    socket.on("signal",function(data){
        verifyRecieving();
        
        getBeacon(data.id,data.key,function(id){
            var query = db("Beacon").where("id",id);
            
            if(data.type == "water"){
                query.update({
                     water:1
                    ,water_since:(new Date()).toISOString()
                });
            }else if(data.type == "food"){
                query.update({
                     food:1
                    ,food_since:(new Date()).toISOString()
                });           
            }else if(data.type == "clothing"){
                query.update({
                     clothing:1
                    ,clothing_since:(new Date()).toISOString()
                });                  
            }
            
            query.then();           
        });        
    });
    
    function verifyRecieving(){
        if(!recieving){
            console.log("Verified recieving data...")
        }
        recieving = true;        
    }
    
    function getBeacon(id,key,callback){
        db.select("id","key_hash").from("Beacon").where("long_id",id).then(function(rows){
            if(!rows[0]){
                console.log("A beacon with id = " + id + " wasn't found");
                return;
            }
            var row = rows[0];

            if(bcrypt.compareSync(key, row.key_hash)){
                
                if(typeof callback === "function"){
                    callback(row.id);
                }
                
            }else{
                console.log("Key doesn't match hash");
            }
        })         
    }

    // Disconnect listener
    socket.on('disconnect', function() {
        console.log('Beacon disconnected.');
    });
});

// [ On mobile connection ]
io.of("/mobile").on('connection', function(socket){
    console.log('A mobile client connected.');
    
    socket.on('movement', function(data) {
        
        db.select(
            "long_id as id",
            "lat",
            "lng",
            "water",
            "food",
            "clothing",
            "water_since",
            "food_since",
            "clothing_since"
        )
        .where(function(){
            this.where("water",1).orWhere("food",1).orWhere("clothing",1);
        })
        .where("emergency",0)
        .from("Beacon")
        .then(function(rows){
            socket.emit('beacons',rows); 
        });
        
        
    });
    
    // Disconnect listener
    socket.on('disconnect', function() {
        console.log('A mobile client disconnected.');
    });    
});

// [ On admin connection ]
io.of("/admins").on('connection', function(socket){
    console.log('Admin connected.');
    
    // Disconnect listener
    socket.on('disconnect', function() {
        console.log('Admin disconnected.');
    });    
});

// [ Send the admins all the beacons ]
(function send(io){
  db.select(
      "long_id as id",
      "lat",
      "lng",
      "time_of_last_location",
      "water",
      "food",
      "clothing",
      "water_since",
      "food_since",
      "clothing_since",
      "registered_to_first_name",
      "registered_to_last_name",
      "external_number"
  ).from("Beacon").then(function(rows){
    io.of("/admins").emit("beacons",rows)
    setTimeout(function(){ send(io); },1000);
  });

})(io);