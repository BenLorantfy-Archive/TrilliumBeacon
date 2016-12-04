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

var recieving = false;

// Add a connect listener
io.sockets.on('connection', function(socket){
    console.log('Client connected.');

    socket.on('movement', function(data) {
        verifyRecieving();

        getBeacon(data.id,data.key,function(id){
          db("Beacon").where("id",id).update({
             lat:data.lat
            ,lng:data.lng
            ,time_of_last_location:data.date
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
                });
            }else if(data.type == "food"){
                query.update({
                    food:1
                });           
            }else if(data.type == "clothing"){
                query.update({
                    clothing:1
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
  	console.log('Client disconnected.');
  });
});