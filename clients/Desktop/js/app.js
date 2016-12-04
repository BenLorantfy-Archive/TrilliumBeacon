// Author:
// Desc: This file contains the main UI manipulation logic

var app = angular.module('app', []);

app.controller('MainController', function($scope, $compile) {
    var animationDuration = 300;
    var selectedBeacon = null;
    
    function renderMapScreen(){
        $('#beacon').animate({ width: 'toggle' },0);
        
        // [ Create the map ]
        var map = new google.maps.Map(document.getElementById('map'), {
            center: { lat: 43.440494, lng: -80.476204 },
            zoom: 12
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
        var socket = io("http://localhost:3000/", { reconnect:true });

        var placedBeacons = [];
        socket.on("beacons",function(beacons){

            // [ Add all the new markers]
            $.each(beacons,function(i,beacon){
                
                // Update beacon details if selected
                if(selectedBeacon){
                    if(beacon.id == selectedBeacon.id){
                        selectedBeacon = beacon;
                        updateBeaconDetails();
                    }                    
                }

                
                // Check if beacon is already placed
                var marker = null
                for(var i = 0; i < placedBeacons.length; i++){
                    if(placedBeacons[i].beacon.id == beacon.id){
                        marker = placedBeacons[i].marker;
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
    
        function updateBeaconDetails(){
            var beacon = selectedBeacon;

            // [ Update Beacon Details ]
            $("#beacon").find(".signal").show();
            if(!beacon.water) $("#beacon .water").hide();
            if(!beacon.food) $("#beacon .food").hide();
            if(!beacon.clothing) $("#beacon .clothing").hide();
            if(!beacon.emergency) $("#beacon .emergency").hide();

            $("#beacon .lat").text(beacon.lat);
            $("#beacon .lng").text(beacon.lng);     
        }
    }

    (function loginEvents(){
        
        // [ Toggle Signup UI ]
        $("#openSignUp,#openLogIn").click(function(){
            $("#signupUI").toggle();
            $("#login").toggle();
            $("#signUpMessage").toggle();
            $(".extraFieldContainer").slideToggle("fast");
        });
        
        $("#signup").click(function(){

            $("#loginScreen").fadeToggle("fast",function(){
                $("#mapScreen").fadeToggle("fast");
            });

            setTimeout(function(){
                renderMapScreen();
            },200);
            
            expandWindow();
        })
        
        // [ Login user ]
        $("#login").click(function(){
            $("#loginScreen").fadeToggle("fast",function(){
                $("#mapScreen").fadeToggle("fast");
                renderMapScreen();
            });

//            setTimeout(function(){
//                renderMapScreen();
//            },200);

            expandWindow();
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
