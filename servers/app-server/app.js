var http 	= require('http');
var io 		= require('socket.io');
var knex 	= require('knex');
var bcrypt  = require("bcrypt-nodejs");
var express = require("express");
var request = require("request");
var config  = require("./config.json");

var db  = knex(config.database);
var app = express();

console.log("\nStarting App Server");
console.log("=====================");
console.log("Listening on port 2000");

// [ Error Handling Utils ]
var errors = {
     MALFORMED_JSON:1
    ,ONLY_JSON_OBJECTS:2
    ,MISSING_BODY:3
    ,MISSING_FIELD:4
    ,BAD_DATA_TYPE:5
    ,TOO_LONG:6
    ,NO_USER:7
    ,BAD_PASSWORD:8
    ,PASSWORDS_NOT_MATCHING:9
    ,MISSING_DIR:10
    ,MISSING_TOKEN:11
    ,REQUEST_FAILED:13
    ,USER_ALREADY_EXISTS:14
    ,DUPLICATE_KEY:1062
}

function success(obj){
    if(isPlainObj(obj)){
        obj["success"] = true;
    }
    
    if(typeof obj == "undefined"){
        return JSON.stringify({
            "success":true
        });
    }else{
        return JSON.stringify(obj);
    }
}

function error(message,code){
    if(!code){
        var code = 0;
    }

    return JSON.stringify({
        message:message,
        code:code,
        error:true
    });
}

function isPlainObj(o) {
  return typeof o == 'object' && o.constructor == Object;
}

function generateGUID(){
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
        var r = Math.random()*16|0, v = c == 'x' ? r : (r&0x3|0x8);
        return v.toString(16);
    });   
}

// [ Middleware to get the request body ]
app.use (function(req, res, next) {
    var json='';
    req.setEncoding('utf8');
    req.on('data', function(chunk) { 
       json += chunk;
    });

    req.on('end', function() {    
        if(json == ""){
            next();
        }else{
            try{
                // [ If valid json, set req.body ]
                var data = JSON.parse(json);
                if(isPlainObj(data)){
                    req.body = data;
                    next();
                }else{
                    // [ Tell user json was naughty ]
                    res.end(error("Not a valid JSON object", errors.ONLY_JSON_OBJECTS));
                }
                
            }catch(e){
                // [ Tell user json was naughty ]
                res.end(error("Malformed json", errors.MALFORMED_JSON));
            }            
        }        
    });
});

// [ Middleware to authenticate user ]
app.use (function(req, res, next) {
    if(req.path == "/token" || req.path == "/token/"){
        // User doesn't need to be authenticated to ask for token, anyone is allowed to do that
        
        next();
        return;
    }
    
    // [ Make sure token is valid ]
    var token = req.headers["x-token"];
    if(!token || token == ""){
        res.end(error("Missing token from request",errors.MISSING_TOKEN));
        return;
    }
    
    // [ Check db for token record that matches ]
    db("Token")
        .leftJoin("User","Token.user_id","User.id")
        .select("User.id")
        .where("token",token)
        .where("revoked",0)
        .then(function(row){
            if(row.length == 1){
                req.user = {
                     id:row[0].id
                }

                next();
                return;
            }
        
            res.end(error("No matching token in database"));
        });
    
});

app.get("/",function(req,res){
    res.end("Online");
})

// [ Endpoint to create token for a user ]
app.post("/token",function(req,res){
    // [ Make sure body is present ]
    if(!req.body) return res.end(error("Missing json body", errors.MISSING_BODY));
    
    var data = req.body;
    
    // [ Make sure username is present and valid ]
    if(!data.accessToken)                      return res.end(error("Missing access token", errors.MISSING_FIELD));
    if(typeof data.accessToken !== "string")   return res.end(error("Access token should be string", errors.BAD_DATA_TYPE));

    // [ Verifies facebook token ]
    var appAccessTokenUrl = "https://graph.facebook.com/oauth/access_token?client_id=" + config.facebook.id + "&client_secret=" + config.facebook.key + "&grant_type=client_credentials";
    request(appAccessTokenUrl, function (error, response, body) {
      if (!error && response.statusCode == 200) {
        var appAccessToken = body;
          
        var tokenInfoUrl = "https://graph.facebook.com/debug_token?input_token=" + data.accessToken + "&" + appAccessToken;
        request(tokenInfoUrl, function (error, response, body) {
            if (!error && response.statusCode == 200) {
                var info = null;
                try{
                    info = JSON.parse(body).data;
                }catch(e){
                    res.end(error("Facebook login failed"));
                    return;
                }
                
                // [ Make sure token belongs to app ]
                if(info.app_id != config.facebook.id){
                    res.end(error("Provided token wasn't for TrilliumBeacon"));
                    return;
                }
                
                // [ Make sure token isn't expired, revoked, etc. ]
                if(!info.is_valid){
                    res.end(error("Provided token wasn't valid"));
                    return;
                }
                
                // [ Access Token is valid for this app so now authenticate the user ]
                authenticate();
                
            }else{
                res.end(error("Facebook login failed"));
                return;
            }
        });
      }else{
          res.end(error("Facebook login failed"));
          return;
      }
    });
    
    function authenticate(){
        var url = "https://graph.facebook.com/me?fields=first_name,last_name&access_token=" + data.accessToken;
        request(url, function (error, response, body) {
          if (!error && response.statusCode == 200) {
              var fbUser = JSON.parse(body);
              
              // login / signup user
//              res.json(user);
              db("User")
                .select("id")
                .where("facebook_id",fbUser.id)
                .then(function(rows){
                    if(rows.length > 0){
                        createToken(rows[0].id);
                    }else{
                        // If user doesn't exist, create em
                        db("User")
                            .insert({
                                 first_name:fbUser.first_name
                                ,last_name:fbUser.last_name
                                ,facebook_id:fbUser.id
                            })
                            .returning("id")
                            .then(function(id){
                                createToken(id);
                            })
                            .catch(function(){
                                res.end(error("Facebook login failed"));
                            });
                    
                    }
                })
                .catch(function(e){
                  console.log(e);
                  res.end(error("Facebook login failed"));
                });
              }else{
                  res.end(error("Facebook login failed"));
              }
        });
    }
    
    function createToken(id){
        var token = generateGUID() + "-" + generateGUID() + "-" + generateGUID();
        db("Token")
            .insert({
                 "token": token
                ,"date_created": (new Date()).toISOString()
                ,"user_id": id
                ,"created_with_screen_width": req.headers["x-screen-width"]
                ,"created_with_screen_height": req.headers["x-screen-height"]
            }).then(function(){
                var data = {
                    token:token
                };
            
                res.end(success(data));
            })
            .catch(function(){
                res.end(error("Facebook login failed"));
            });
    }
    
//				$appAccessToken = file_get_contents("https://graph.facebook.com/oauth/access_token?client_id=" . $this->facebookAppId . "&client_secret=" . $this->facebookKey . "&grant_type=client_credentials");
//
//				// [ Check if provided facebook token is valid ]
//				$response = json_decode(file_get_contents("https://graph.facebook.com/debug_token?input_token=" . $model["fbToken"] . "&" . $appAccessToken),true);
//				
//				if($response == NULL || !isset($response["data"]["is_valid"]) || (isset($response["data"]["is_valid"]) && !$response["data"]["is_valid"])){
//					return $this->error("Facebook token is invalid");
//				}
//				
//				// [ Check if provided facebook token is for TravelHunt ]
//				if($response["data"]["app_id"] !== $this->facebookAppId){
//					return $this->error("Facebook token wasn't for this application.");
//				}
});

app.get("/me",function(req,res){
    db("User")
        .select("first_name as firstName")
        .select("last_name as lastName")
        .select("deliveries")
        .where("id", req.user.id)
        .then(function(rows){
            if(rows.length > 0){
                res.json(rows[0]);
            }else{
                res.end("Could not find user");
            }
        })
        .catch(function(){
            res.end(error("Could not get user details because of SQL error"));
        });
})

app.post("/deliveries",function(req,res){
    var data = req.body;
    if(!req.body) return res.end(error("Missing json body", errors.MISSING_BODY));
    
    // [ Make sure beaconId is present and valid ]
    if(!data.beaconId)                      return res.end(error("Missing beacon id", errors.MISSING_FIELD));
    if(typeof data.beaconId !== "string")   return res.end(error("Beacon id should be string", errors.BAD_DATA_TYPE));
     
    
    // [ Make sure Beacon exists ]
    db("Beacon")
        .select("id")
        .where("long_id", data.beaconId)
        .then(function(rows){
            if(rows.length > 0){
                // [ Insert Delivery ]
                db("Delivery")
                    .insert({
                         "user_id": req.user.id
                        ,"beacon_id": rows[0].id
                        ,"date":(new Date()).toISOString()
                    })
                    .then(function(){
                    
                        // [ Increase user's delivery count ]
                        db("User")
                            .increment("deliveries", 1)
                            .where("id", req.user.id)
                            .then(function(){
                                res.end(success());
                            })
                            .catch(function(){
                                res.end(error("Could not update delivery count beacause of SQL error"));
                            });
                        
                        
                    })
                    .catch(function(){
                        res.end(error("Could not insert delivery beacause of SQL error"));
                    });
            }else{
                res.end(error("Beacon doesn't exist"));
            }
     
        });
    
    

    
    
    res.end(success());
});

app.listen(2000);
