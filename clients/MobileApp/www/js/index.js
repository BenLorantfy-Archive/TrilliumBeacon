// Author: Ben Lorantfy
// Date: Nov 7th 2016
// Desc: This file is the entry point for the mobile app

/*
 * Licensed to the Apache Software Foundation (ASF) under one
 * or more contributor license agreements.  See the NOTICE file
 * distributed with this work for additional information
 * regarding copyright ownership.  The ASF licenses this file
 * to you under the Apache License, Version 2.0 (the
 * "License"); you may not use this file except in compliance
 * with the License.  You may obtain a copy of the License at
 *
 * http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied.  See the License for the
 * specific language governing permissions and limitations
 * under the License.
 */
var myLat = 43.43882627349054;
var myLng = -80.46858397521021;

function simulatePosition(lat, lng){
    myLat = lat;
    myLng = lng;
}

$.request.host = "http://ben.local:2000/";
//$.request.host = "http://localhost:2000/";
var app = {
    // Application Constructor
    initialize: function() {
        document.addEventListener('deviceready', this.onDeviceReady.bind(this), false);
    },

    onDeviceReady: function() {
        $("#beacon").slideToggle(0);
        $("#loginButton").click(function(){
            facebookConnectPlugin.login(["public_profile"], function(data){
                
                //
                // Data Structure:
                //
                //{
                //    status: "connected",
                //    authResponse: {
                //        session_key: true,
                //        accessToken: "<long string>",
                //        expiresIn: 5183979,
                //        sig: "...",
                //        secret: "...",
                //        userID: "634565435"
                //    }
                //}
                $.request("POST","/token",{
                    accessToken: data.authResponse.accessToken
                }).done(function(token){
                    $.request.token = token.token;
                    
                    $("#loginScreen").fadeToggle("fast",function(){
                        $("#mapScreen").fadeToggle("fast",function(){
                            renderMapScreen();
                        });

                    }); 
                }).fail(function(){
                    alert("Facebook login failed");
                })
            }, function(){
               alert("Facebook Connect Failed");
            });
        })
    }
};

function renderMapScreen(){
        
        // [ Create the map ]
        var map = new google.maps.Map(document.getElementById('map'), {
            center: { lat: 43.440494, lng: -80.476204 },
            zoom: 12,
            disableDefaultUI: true
        });       
        
        map.addListener('click', function() {
            if($("#beacon").is(":visible")){
                $("#beacon").slideToggle();
                $("#markDone").stop().animate({ right:"-100px" },"fast");
            }
  
        });

        var selectedBeacon = null;
        var markers = [];
        var once = false;
        // var socket = io("http://ec2-54-88-176-255.compute-1.amazonaws.com:3000/", { reconnect:true });
//        var socket = io("http://localhost:4000/", { reconnect:true });
        var socket = io("http://ben.local:4000/mobile", { reconnect:true });
    
        var placedBeacons = [];
        socket.on("beacons",function(beacons){

            // [ Add all the new markers]
            $.each(beacons,function(i,beacon){

                var marker = null
                for(var i = 0; i < placedBeacons.length; i++){
                    if(placedBeacons[i].beacon.id == beacon.id){
                        marker = placedBeacons[i].marker;
                        placedBeacons[i].beacon = beacon; // Update beacon
//                        break;
                    }
                }                
                
                // Update beacon details if selected
                if(selectedBeacon){
                    if(beacon.id == selectedBeacon.id){
                        selectedBeacon = beacon;
                        updateBeaconDetails();
                    }                    
                }

                // [ Get icon url ]
                var icon = "";
                if(beacon.water){
                    icon += "-water";
                }
                if(beacon.food){
                    icon += "-food";
                }
                if(beacon.clothing){
                    icon += "-clothing";
                }
                if(!beacon.water && !beacon.food && !beacon.clothing){
                    icon = "blank";
                }else{
                    icon = icon.substr(1);
                }

                icon = "img/pins/" + icon + ".png";                
                
                // Edit or create new marker
                if(marker){
                    // Beacon already has been placed
                    marker.setPosition( new google.maps.LatLng( beacon.lat, beacon.lng ) );
                    
                    // [ Update coords in list ]
                    var el = $("#" + beacon.id);
                    el.attr("lat",beacon.lat).find(".lat").text(beacon.lat);
                    el.attr("lng",beacon.lng).find(".lng").text(beacon.lng);
                    
                    var oldIcon = marker.getIcon();
                    if(oldIcon.url.replace("-highlighted","") != icon){
                        
                        // [ Add highlight if previously highlighted ]
                        if(oldIcon.url.indexOf("-highlighted") >= 0){
                            icon = icon.replace(".png","-highlighted.png");
                        }
                        
                        // [ Update icon ]
                        oldIcon.url = icon;
                        marker.setIcon(oldIcon);
                    }
                }else{
                    // Beacon hasn't been placed yet
                    marker = new google.maps.Marker({
                        position: {
                             lat:beacon.lat
                            ,lng:beacon.lng
                        },
                        icon:{
                             url:icon
                            ,scaledSize:new google.maps.Size(25,30)
                        },

                        map: map
                    });
                    
                    marker.addListener('click', function() {
                        $("#markDone").html("Mark Delivery <br/> as Finished");
                        
                        if(!$("#beacon").is(":visible")){
                            $("#beacon").slideToggle();
                            $("#markDone").stop().css("right","-100px").animate({ right:"25px" },"fast");
                        }
                        selectedBeacon = null;
                        
                        // [ Get beacon ]
                        for(var i = 0; i < placedBeacons.length; i++){
                            if(placedBeacons[i].marker == marker){
                                selectedBeacon = placedBeacons[i].beacon;
                                break;
                            }
                        }
                        
                        updateBeaconDetails();
                      
                        // [ Zoom to Pin ]
                        map.setZoom(17);
                        map.panTo(marker.position);
                    });
                    
                    // [ Add to list of placed beacons ]
                    placedBeacons.push({
                         beacon:beacon
                        ,marker:marker
                    })

                    // [ Add beacon to side list ]
//                    var el  = $("<beacon-item></beacon-item>");
//                    el.attr("id",beacon.id);   
//                    $("#beacons").children().append(el);
//                    el.attr("lat",beacon.lat);
//                    el.attr("lng",beacon.lng);
//                    $compile(el)($scope);
                }
                
                
                
            })
        
            // [ Remove any old markers and beacons ]
            for(var i = placedBeacons.length - 1; i >= 0; i--){
                var placedBeacon = placedBeacons[i];
                var found = false;
                
                // Search for beacon in new beacons
                for(var j = 0; j < beacons.length; j++){
                    if(placedBeacon.beacon.id == beacons[j].id){
                        found = true;
                        break;
                    }
                }
                
                if(!found){
                    placedBeacon.marker.setMap(null);
                    if(selectedBeacon){
                        if(selectedBeacon.id == placedBeacon.beacon.id){
                            selectedBeacon = null;
                            if($("#beacon").is(":visible")){
                                $("#beacon").slideToggle();
                                $("#markDone").stop().animate({ right:"-100px" },"fast");
                            }
                        }
                    }
                    
                    placedBeacons.splice(i,1);
                }
            }        
        })
        
        setInterval(function(){
            updateDates();
        },1000);
        
        function updateDates(){
            $(".date").each(function(){
                var isoDate = $(this).attr("data-date");
                if(isoDate == ""){
                    $(this).text("");
                }else{
                    var fromNow = moment(isoDate).fromNow();
                    $(this).text(fromNow);                    
                }
            })
        }
    
        function updateBeaconDetails(){
            var beacon = selectedBeacon;

            // [ Update Beacon Details ]
            $("#beacon").find(".signal").show();
            if(!beacon.water) $("#beacon .water").hide();
            if(!beacon.food) $("#beacon .food").hide();
            if(!beacon.clothing) $("#beacon .clothing").hide();
            if(!beacon.emergency) $("#beacon .emergency").hide();
            
            
            $("#beacon .waterSince").attr("data-date",beacon.water_since);
            $("#beacon .foodSince").attr("data-date",beacon.food_since);
            $("#beacon .clothingSince").attr("data-date",beacon.clothing_since);
            updateDates();
            

//            $("#beacon .lat").text(beacon.lat);
//            $("#beacon .lng").text(beacon.lng);   
//            
//            // If place hasn't been found in 500ms, tell user it's looking
//            // Waiting 500ms avoids "Looking..." flashing over and over
//            var timeout = setTimeout(function(){
//                $("#beacon .address").text("Looking...");
//            },500);
//            
//            geocodeLatLng(beacon.lat,beacon.lng,function(address,unknown){
//                // Clear looking... timeout so looking... isn't displayed since it's not looking anymore
//                clearTimeout(timeout);
//                
//                // [ Update address unless user clicked a different beacon since geocoding started ]
//                if(selectedBeacon){
//                    if(beacon.id == selectedBeacon.id){
//                         $("#beacon .address").text(address);
//                    }                    
//                }
//            });          
        }
        
        
        var geoCodeCache = [];
        function geocodeLatLng(lat, lng, callback) {
            if(typeof callback !== "function") return;
            
            // [ First check geoCodeCache ]
            for(var i = 0; i < geoCodeCache.length; i++){
                if(geoCodeCache[i].lat == lat && geoCodeCache[i].lng == lng){
                    callback(geoCodeCache[i].address, false);
                    return;
                }
            }
                
            var geocoder = new google.maps.Geocoder;
            var latlng = { lat: lat, lng: lng };
            geocoder.geocode({'location': latlng}, function(results, status) {
                if (status === 'OK') {
                    if (results[1]) {
                        var longAddress = results[1].formatted_address;
                        var address = "";
                        
                        // Try to compile nicer looking address
                        if(results[1].address_components){
                            if(results[1].address_components.length > 0){
                                
                                var done = false;
                                for(var i = 0; i < results[1].address_components.length; i++){
                                    if(results[1].address_components[i].types){
                                        
                                        for(var j = 0; j < results[1].address_components[i].types.length; j++){
                                            if(
                                                 results[1].address_components[i].types[j] == "locality"
                                              || results[1].address_components[i].types[j].indexOf("administrative_area") >= 0
                                              || results[1].address_components[i].types[j] == "country"
                                            ){
                                                done = true;
                                                break;
                                            }
                                        }
                                    }
                                    
                                    if(done){
                                        break;
                                    }else{
                                        if(address != ""){
                                            address += ", ";
                                        }
                                        address += results[1].address_components[i].long_name;
                                    }
                                    
                                }
                                
                                if(address == ""){
                                    address = longAddress;
                                }
                            }else{
                                address = longAddress;
                            }
                        }else{
                            address = longAddress;
                        }
                        
                        // [ Cache the geocodes so we don't go over query limit ]
                        geoCodeCache.push({
                             lat:lat
                            ,lng:lng
                            ,address:address
                        });
                        if(geoCodeCache.length > 200){
                            
                            // Remove old entry so RAM isn't used up completely
                            array.shift();
                        }
                        callback(address,false);
                    } else {

                        // No address found at these coordinates
                        callback("Unknown",true);
                    }
                } else {
//                    console.warn("Hit query limit");
//                    setTimeout(function(){
//                        
//                        // Try again after waiting for query limit
//                        geocodeLatLng(lat, lng, callback);
//                    },300);
                }
            });
        }
    
        (function deliveryEvents(){
            $("#markDone").click(function(){
                 
                $.request("POST","/deliveries",{
                    beaconId: selectedBeacon.id
                }).done(function(){
                    $("#markDone").html("Delivered <i class='fa fa-check'></i>");
                })
                .fail(function(){
                    alert("Failed to mark as delivered")
                })
            });
        })();
    
        (function gpsEvents(){
            // Beacon hasn't been placed yet
            var marker = new google.maps.Marker({
                position: {
                     lat:myLat
                    ,lng:myLng
                },
                icon:{
                     url:"img/pins/me.png"
                    ,scaledSize:new google.maps.Size(25,25)
//                    ,origin:new google.maps.Point(12.5,12.5)
                },
                zIndex:9999,
                clickable:false,

                map: map
            });

            // [ Send my GPS coordinates every so often ]
            setInterval(function(){
                marker.setPosition( new google.maps.LatLng( myLat, myLng ) );
                
                socket.emit("movement",{
                     "lat":myLat
                    ,"lng":myLng
                    ,"type":"mobile"
                    ,"token":$.request.token
                });
            },1000);        
        })();
    
        (function userInfoEvents(){
            $("#profileButton").click(function(){
                $.request("GET","/me").done(function(user){
                    $("#darkOverlay").fadeToggle("fast");
                    $("#profileInfo").animate({ "top":"30%" },"fast");
                    $("#profileInfo").find(".name").text(user.firstName + " " + user.lastName);
                    $("#profileInfo").find(".deliveries").text(user.deliveries);
                }).fail(function(){
                    alert("Failed to get user info");
                });
                
            });
            
            $("#darkOverlay").click(function(){
                $("#darkOverlay").fadeToggle("fast");
                $("#profileInfo").animate({ "top":"-30%" },"fast");
            });
        })();
    }


app.initialize();