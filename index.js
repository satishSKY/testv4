"use strict";
/*
 * File name: index.js.
 *Purpose: Running node.js and initialize socket.io methods. 
 * Arthur : Satish Kumar Yadav.
 * Company: Ideal IT Techno Pvt. Ltd.
 *  Date :01-July-2015
 */

var express = require('express')(),
	server = require('http').Server(express),
	io = require('socket.io')(server),
	fs = require('fs'), 
	moment  = require('moment'),
	util = require('util');

/******************************************Config************************************************/    
var cluster = require('cluster');
var port = process.env.PORT || 3000;
var numCPUs = require('os').cpus().length;
require('http').globalAgent.maxSockets = Infinity

/*express.get('/', function (req, res) {
	  res.writeHead(200, {'content-type': 'text/html; charset=utf-8'});
	  res.end();	  
});*/
//express.use(express.static(__dirname + '/public'));

express.get('/', function(req, res) {
	// res.writeHead(200, {'content-type': 'text/html; charset=utf-8'});
	res.sendFile(__dirname + '/index.html');
});
express.get('/test', function(req, res) {
	// res.writeHead(200, {'content-type': 'text/html; charset=utf-8'});
	res.sendFile(__dirname + '/index1.html');
});
server.listen(port , function () {
	util.log('socket.io server listening at %s : ' + port );
});

process.addListener("uncaughtException", function (err) {
	util.log("Uncaught exception: " + err);
//	var errorNotification = new Errornotification(err);
	console.log(err.stack);
	console.log(typeof(this));
});	

server.on('error', function (e) {
	if (e.code === 'EADDRINUSE') {
		console.log('Failed to bind to port - address already in use ');
		process.exit(1);
	}  
	//var errorNotification = new Errornotification(e);
});    

var now = new Date();
var utc = new Date(Date.UTC(
    now.getFullYear(),
    now.getMonth(),
    now.getDate(),
    now.getHours(),
    now.getMinutes()
    ));

//console.log("utc: ",utc);
var s = moment.utc().format("YYYY-MM-DD HH:mm:ssss");
console.log("s",s);

/********************************************socket.io************************************************/		
io.on('connection', function (socket) {	

	socket.on("error", function(err) {
		//var errorNotification = new Errornotification(err);
		console.log("Caught flash policy server socket error: ");
		console.log(err.stack);
	});	//error
	
	socket.on("stream", function(img) {
		socket.broadcast.emit("stream",img);
	});

	socket.on("s", function(i) {
		console.log(i);
	});
	
	return socket;
});//sockets