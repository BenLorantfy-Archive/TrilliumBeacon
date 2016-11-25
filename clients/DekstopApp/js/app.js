// Author:
// Desc: This file contains the main UI manipulation logic

var app = angular.module('app', []);

app.controller('MainController', function($scope, $compile) {

    function renderMapScreen(){
        // [ Create the map ]
        var map = new google.maps.Map(document.getElementById('map'), {
            center: { lat: 43.440494, lng: -80.476204 },
            zoom: 12
        });       

        var markers = [];
        var once = false;
        // var socket = io("http://ec2-54-88-176-255.compute-1.amazonaws.com:3000/", { reconnect:true });
        var socket = io("http://localhost:3000/", { reconnect:true });

        socket.on("beacons",function(beacons){
            // [ Remove all the existing markers ]
            $.each(markers,function(i,marker){
                marker.setMap(null);
            });

            // [ Add all the new markers]
            $.each(beacons,function(i,beacon){
                var marker = new google.maps.Marker({
                    position: {
                        lat:beacon.lat
                        ,lng:beacon.lng
                    },
                    map: map
                });

                markers.push(marker);
            })
        })
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

            setTimeout(function(){
                renderMapScreen();
            },200);

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
		 "tree-item"
	];

	$.each(comps,function(i,name){
		$("body").append("<link rel='stylesheet' type='text/css' href='comps/" + name + "/styles.css'></link>");
	});

	$.each(comps,function(i,name){
		$("body").append("<script src='comps/" + name + "/script.js'></script>");
	});
})();
