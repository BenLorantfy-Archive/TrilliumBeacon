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
var app = {
    // Application Constructor
    initialize: function() {
        document.addEventListener('deviceready', this.onDeviceReady.bind(this), false);
    },

    onDeviceReady: function() {
      // [ Create the map ]
      var map = new google.maps.Map(document.getElementById('map'), {
        center: { lat: 43.440494, lng: -80.476204 },
        zoom: 9
      });


      var markers = [];
      var once = false;
      var socket = io("http://ec2-54-88-176-255.compute-1.amazonaws.com:3000/", { reconnect:true })
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
};

app.initialize();