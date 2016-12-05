var http 	= require('http');
var io 		= require('socket.io');
var knex 	= require('knex');
 var bcrypt = require("bcrypt-nodejs");
var express = require("express");
var config  = require("./config.json");

var db  = knex(config);
var app = express();

console.log("\nStarting Admin Server");
console.log("=====================");
console.log("Listening on port 3000");

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
    db("AdminToken")
        .leftJoin("AdminUser","AdminToken.user_id","AdminUser.id")
        .select("AdminUser.id","AdminUser.email")
        .where("token",token)
        .where("revoked",0)
        .then(function(row){
            if(row.length == 1){
                req.user = {
                     email:row[0].email
                    ,displayName:row[0].display_name
                    ,id:row[0].id
                }

                next();
                return;
            }
        
            res.end(error("No matching token in database"));
        });
    
});

// [ Endpoint to create token for a user ]
app.post("/token",function(req,res){
    // [ Make sure body is present ]
    if(!req.body) return res.end(error("Missing json body", errors.MISSING_BODY));
    
    var data = req.body;
    
    // [ Make sure username is present and valid ]
    if(!data.email)                      return res.end(error("Missing username", errors.MISSING_FIELD));
    if(typeof data.email !== "string")   return res.end(error("Username should be string", errors.BAD_DATA_TYPE));
    if(data.email > 100)                 return res.end(error("Username is too long", errors.TOO_LONG));
    
    // [ Make sure password is present and valid ]
    if(!data.password)                      return res.end(error("Missing password", errors.MISSING_FIELD));
    if(typeof data.password !== "string")   return res.end(error("Password should be string", errors.BAD_DATA_TYPE));
  
    // [ Authentcates user ]
    function authenticate(){
        // [ Tries to find requested user by username ]
        db("AdminUser")
            .select("id","email","password_hash")
            .where("email",data.email)
            .then(function(rows){
                // [ Checks if user was found ]
                if(rows.length == 0) return res.end(error("User doesn't exist", errors.NO_USER));
                var row = rows[0];

                // [ Checks if password matches hash ]
                var authenticated = bcrypt.compareSync(data.password, row.password_hash);

                // [ Returns error if not authenticated ]
                if(!authenticated) return res.end(error("Password doesn't match", errors.BAD_PASSWORD));

                // [ User is authenticated, create token ]
                var token = {
                     "token": generateGUID() + "-" + generateGUID() + "-" + generateGUID()
                    ,"date_created": (new Date()).toISOString()
                    ,"user_id": row.id
                    ,"created_with_screen_width": req.headers["x-screen-width"]
                    ,"created_with_screen_height": req.headers["x-screen-height"]
                };

                db("AdminToken").insert(token).then(function(){
                    res.json({
                        token:token.token
                    });                
                });
            });        
    }    
    
    // [ Check if user wants to sign up ]
    if(data.signup){
        // [ If user wants to sign up, check additional fields ]
        if(!data.confirmPassword) return res.end(error("Missing confirmation password", errors.MISSING_FIELD));
       
        // [ To avoid typos in passwords, make sure password matches confirmation password ]
        if(data.confirmPassword !== data.password) return res.end(error("Passwords don't match", errors.PASSWORDS_NOT_MATCHING));
        
        // [ Hash the password ]
        var hash = bcrypt.hashSync(data.password);
        
        // [ Insert new user ]
        db("AdminUser")
            .insert({
                 username:data.username
                ,hash:hash
                ,dateCreated:(new Date()).toISOString()
            })
            .then(function(){
                // [ Now authenticate after user has been created ]
                authenticate();
            })
            .catch(function(err){
                if(err.errno == errors.DUPLICATE_KEY){
                    res.end(error("User already exists", errors.USER_ALREADY_EXISTS));
                }else{
                    console.log(err);
                    res.end(error("Database error"));
                }
            });
        
    }else{
        // [ If user doesn't want to sign up, skip to authentication step ]
        authenticate();
    }
});

app.listen(3000);
