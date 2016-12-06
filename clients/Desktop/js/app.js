// Author:
// Desc: This file contains the main UI manipulation logic

var app = angular.module('app', []);

app.controller('MainController', function($scope, $compile) {
    var animationDuration = 300;
    var selectedBeacon = null;
    $.request.host = "http://localhost:3000/";
    
    function renderMapScreen(){
        $('#beacon').animate({ width: 'toggle' },0);
        
        // [ Create the map ]
        var map = new google.maps.Map(document.getElementById('map'), {
            center: { lat: 43.440494, lng: -80.476204 },
            zoom: 12,
            disableDefaultUI: true
        });       
        
        map.addListener('click', function() {
            if($("#beacon").is(":visible")){
                $('#beacon').animate({ width: 'toggle' },animationDuration,function(){
                    $('#beacons').animate({ width: 'toggle' },animationDuration);
                });                  
            }
  
        });

        var markers = [];
        var once = false;
        // var socket = io("http://ec2-54-88-176-255.compute-1.amazonaws.com:3000/", { reconnect:true });
        var socket = io("http://localhost:4000/admins", { reconnect:true });

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

                    marker.addListener('mouseover', function() {
                        var icon = marker.getIcon();
                        icon.url = icon.url.replace(".png","") + "-highlighted.png";
                        marker.setIcon(icon);
                    });

                    marker.addListener('mouseout', function() {
                        var icon = marker.getIcon();
                        icon.url = icon.url.replace("-highlighted","");
                        marker.setIcon(icon);
                    });
                    
                    marker.addListener('click', function() {
                        selectedBeacon = null;
                        
                        // [ Get beacon ]
                        for(var i = 0; i < placedBeacons.length; i++){
                            if(placedBeacons[i].marker == marker){
                                selectedBeacon = placedBeacons[i].beacon;
                                break;
                            }
                        }
                        
                        updateBeaconDetails();

                        if($("#beacons").is(":visible")){
                            $('#beacons').animate({ width: 'toggle' },animationDuration,function(){
                                $('#beacon').animate({ width: 'toggle' },animationDuration);
                            });                            
                        }else{

                        }  
                        
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
                    var el  = $("<beacon-item></beacon-item>");
                    el.attr("id",beacon.id);   
                    $("#beacons").children().append(el);
                    el.attr("lat",beacon.lat);
                    el.attr("lng",beacon.lng);
                    $compile(el)($scope);
                }
                
                
                
            })
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
            

            $("#beacon .lat").text(beacon.lat);
            $("#beacon .lng").text(beacon.lng);   
            
            $("#beaconId").text(beacon.external_number);
  
            
            $("#beacon .first").text(beacon.registered_to_first_name);
            $("#beacon .last").text(beacon.registered_to_last_name);   
            
            // If place hasn't been found in 500ms, tell user it's looking
            // Waiting 500ms avoids "Looking..." flashing over and over
            var timeout = setTimeout(function(){
                $("#beacon .address").text("Looking...");
            },500);
            
            geocodeLatLng(beacon.lat,beacon.lng,function(address,unknown){
                // Clear looking... timeout so looking... isn't displayed since it's not looking anymore
                clearTimeout(timeout);
                
                // [ Update address unless user clicked a different beacon since geocoding started ]
                if(selectedBeacon){
                    if(beacon.id == selectedBeacon.id){
                         $("#beacon .address").text(address);
                    }                    
                }
            });          
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
    }
    
    (function beaconEvents(){
        $('#newBeaconPopup').popup();
        
        $("#newBeacon").click(function(){
            $("#newBeaconPopup .createUI input").val("");
            $("#newBeaconPopup .createUI").show();
            $("#newBeaconPopup .resultsUI").hide();
            $('#newBeaconPopup').popup('show');
        });
        
        $("#createNewBeacon").click(function(){
            var beaconNumber = $("#newBeaconPopup .beaconNumber").val();
            var firstName = $("#newBeaconPopup .firstName").val();
            var lastName = $("#newBeaconPopup .lastName").val();
            
            $.request("POST","/beacons",{
                 beaconNumber:beaconNumber
                ,firstName:firstName
                ,lastName:lastName
            }).done(function(data){
                $("#newBeaconPopup .createUI").hide();
                $("#newBeaconPopup .resultsUI").show();
                $("#newBeaconPopup .resultsUI .beaconID").text(data.id);
                $("#newBeaconPopup .resultsUI .beaconKey").text(data.key);
            }).fail(function(){
                alert("Failed to create beacon");
            })
        });
        
        $("#beaconOkButton").click(function(){
            $('#newBeaconPopup').popup('hide');
        })
    })();

    (function loginEvents(){
        
        // [ Toggle Signup UI ]
        $("#openSignUp,#openLogIn").click(function(){
            $("#signupUI").toggle();
            $("#login").toggle();
            $("#signUpMessage").toggle();
            $(".extraFieldContainer").slideToggle("fast");
        });
        
        $("#signup").click(function(){
            var email = $("#email").val();
            var password = $("#password").val();
            var confirmPassword = $("#confirmPassword").val();
            var displayName = $("#displayName").val();
            var invitationCode = $("#invitationCode").val();
            
            $.request("POST","/token",{
                 email:email
                ,password:password
                ,confirmPassword:confirmPassword
                ,displayName:displayName
                ,invitationCode:invitationCode
                ,signup:true
            }).done(function(token){
                $.request.token = token.token;
                
                $("#loginScreen").fadeToggle("fast",function(){
                    $("#mapScreen").fadeToggle("fast");
                    renderMapScreen();
                });

                expandWindow();                
            }).fail(function(data){
                alert(data.message);
            });
        })
        
        // [ Login user ]
        $("#login").click(function(){
            var email = $("#email").val();
            var password = $("#password").val();
            
            $.request("POST","/token",{
                 email:email
                ,password:password
            }).done(function(token){
                $.request.token = token.token;
                
                $("#loginScreen").fadeToggle("fast",function(){
                    $("#mapScreen").fadeToggle("fast");
                    renderMapScreen();
                })

                expandWindow();    
                
            }).fail(function(data){
                alert(data.message);
            });
            

        });      
        
        function expandWindow(){
            var w = $(window).width();
            var h = $(window).height();
            
            var currentCenterX = window.screenX + $(window).width() / 2;
            var currentCenterY = window.screenY + $(window).height() / 2;
            var lastWidth = w;
            var lastHeight = h;
            $({ t:0 }).animate({ t: 1},{
                 duration:200
                ,step:function(t){
                    var newWidth = w + t*(950 - w);
                    var newHeight = h + t*(650 - h);
                    var deltaWidth = newWidth - lastWidth;
                    var deltaHeight = newHeight - lastHeight;
                    
                    // This is pretty laggy:
//                    window.moveTo(window.screenX - deltaWidth/2, window.screenY - deltaHeight/2);
                    window.resizeTo(newWidth, newHeight);
                    
                    lastWidth = newWidth;
                    lastHeight = newHeight;
                }
            })            
        }
    })();
 
});

// [ Async load all the components ]
// - Declutters the head tag in index.html
// - App loads faster
(function(){
	var comps = [
		 "beacon-item"
	];

	$.each(comps,function(i,name){
		$("body").append("<link rel='stylesheet' type='text/css' href='comps/" + name + "/styles.css'></link>");
	});

	$.each(comps,function(i,name){
		$("body").append("<script src='comps/" + name + "/script.js'></script>");
	});
})();
