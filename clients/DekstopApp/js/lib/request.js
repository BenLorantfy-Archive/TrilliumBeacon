// Author: Ben Lorantfy
// Desc: A helper plugin that simplifies jquery syntax for creating REST ajax requests

(function($,window,document){
	$.request = function(verb,path,data){
		var json = JSON.stringify(data);

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
			xhr.setRequestHeader("X-Token", $.request.token);
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

		xhr.onload = function(event){
			// debugger;
			try{
				var json = event.currentTarget.responseText;
				handler.doneCallback(JSON.parse(json));
			}catch(ex){
				handler.failCallback(event);
			}
		}

		xhr.onerror = function(event){
			handler.failCallback(event);
		}

		xhr.send(json);

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