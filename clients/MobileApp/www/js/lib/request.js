// Author: Ben Lorantfy
// Desc: A helper plugin that simplifies jquery syntax for creating REST ajax requests
// Version: 2.0

(function($,window,document){
	$.request = function(verb,path,data,binary){
        var isFileUpload = data instanceof FormData;
        var json = null;
        
        if(!isFileUpload){
            json = JSON.stringify(data);
        }
		
		// [ Format slashes ]
		var host = $.request.host;
		if(host[host.length - 1] == "/"){
			host = host.substr(0,host.length - 1);
		}

		// [ Creates CORS object ]
		var xhr = createCORSRequest(verb, host + path);
		if (!xhr) {
		  throw new Error('CORS not supported');
		}

		// [ Add Token to request if it exists ]
		if($.request.token){
			xhr.setRequestHeader("x-token", $.request.token);
		}
        
		// [ Add screen width & height to request for analytics ]
		xhr.setRequestHeader("x-screen-width", $(window).width());
		xhr.setRequestHeader("x-screen-height", $(window).height());

        if(!isFileUpload){
            xhr.setRequestHeader("Content-Type", "application/json");
        }
        
        if(binary){
            xhr.responseType = 'blob';
        }
		
		var handler = {
			 doneCallback:function(){}
			,failCallback:function(){}
			,done:function(callback){
				this.doneCallback = callback;
				return this;
			}
			,fail:function(callback){
				this.failCallback = callback;
				return this;
			}
		}

//        (function(binary){
            xhr.onload = function(event){
                if(binary){
                    var blob = this.response;
                    var blobUrl = null;
                    try{
                        blobUrl = window.URL.createObjectURL(blob);
                        handler.doneCallback(blobUrl);
                    }catch(e){
                        console.error("window.URL.createObjectURL failed:" + e);
                        blobUrl = null;
                        handler.failCallback();
                    }                 
                    
                    return;
                }
                
                try{
                    var json = event.currentTarget.responseText;
                    var data = JSON.parse(json);
                    if(data.error){
                        handler.failCallback(data);
                    }else{
                        handler.doneCallback(data);
                    }

                }catch(ex){
                    handler.failCallback(event);
                }
            };
            
//        })(false);


		xhr.onerror = function(event){
			handler.failCallback(event);
		}

        if(isFileUpload){
            xhr.send(data);
        }else{
            xhr.send(json);
        }
		

		return handler;
	}

	$.request.host = "";

	// https://www.html5rocks.com/en/tutorials/cors/
	function createCORSRequest(method, url) {
	  var xhr = new XMLHttpRequest();
	  if ("withCredentials" in xhr) {

	    // Check if the XMLHttpRequest object has a "withCredentials" property.
	    // "withCredentials" only exists on XMLHTTPRequest2 objects.
	    xhr.open(method, url, true);

	  } else if (typeof XDomainRequest != "undefined") {

	    // Otherwise, check if XDomainRequest.
	    // XDomainRequest only exists in IE, and is IE's way of making CORS requests.
	    xhr = new XDomainRequest();
	    xhr.open(method, url);

	  } else {

	    // Otherwise, CORS is not supported by the browser.
	    xhr = null;

	  }
	  return xhr;
	}

})($,window,document);