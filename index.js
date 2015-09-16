"use strict";
/*
 * File name: index.js.
 *Purpose: Running node.js and initialize socket.io methods. 
 * Arthur : Satish Kumar Yadav.
 * Company: Ideal IT Techno Pvt. Ltd.
 *  Date :15-Sept-2015
 */

/**
 * Module dependencies
 */
const app = require('express')(),
	server = require('http').Server(app),
	io = require('socket.io')(server),
	Filedownloads = require("./public/filedownloads"),
	Mail = require("./public/mail"),
	util = require('util');

/**
 * Configuration all environments
 */

app.set('port', process.env.PORT || 3000);
var ls = new Map(),
process.addListener("uncaughtException", function (err) {
	util.log("Uncaught exception: " + err);
	Mail.sendError(err.stack);
	console.log(err.stack);
	console.log(typeof (this));
});

server.on('error', function (e) {
	if (e.code === 'EADDRINUSE') {
		console.log('Failed to bind to port - address already in use ');
		process.exit(1);
	} 
	Mail.sendError(e.stack);
});

/**
 * Routes
 */	
app.get('/', new Filedownloads().init);
app.get('/dataFiles/:fileType/:file', new Filedownloads().getFile);
app.post('/upload', new Filedownloads().upload);


/**
 *  Socket.io Communication
 */	
io.on('connection', function (socket) { const Socket = require('./public/socket'); new Socket(socket); });

server.listen(app.get('port'), function () {
  console.log(`Express server listening on port ${app.get('port')}`);
});

module.exports = { app, io, ls };
