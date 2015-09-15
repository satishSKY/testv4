"use strict";
/*
 * File name: index.js.
 *Purpose: Running node.js and initialize socket.io methods. 
 * Arthur : Satish Kumar Yadav.
 * Company: Ideal IT Techno Pvt. Ltd.
 *  Date :15-Sept-2015
 */

var express = require('express')(),
	server = require('http').Server(express),
	io = require('socket.io')(server),
	fs = require('fs'), 
	moment = require('moment'),
	Filedownloads = require("./public/filedownloads"),
	Chat = require("./public/chat"),
	Notification = require("./public/notification"),
	util = require('util');

/******************************************Config************************************************/    
var cluster = require('cluster');
var port = process.env.PORT || 3000;
var numCPUs = require('os').cpus().length;
require('http').globalAgent.maxSockets = Infinity;
var ls = new Map();
server.listen(port, function () {
	util.log('socket.io server listening at %s : ' + port );
});

process.addListener("uncaughtException", function (err) {
	util.log("Uncaught exception: " + err);
//	var errorNotification = new Errornotification(err);
	console.log(err.stack);
	console.log(typeof(this));
});
express.get('/', new Filedownloads().init);
express.get('/dataFiles/:fileType/:file', new Filedownloads().getFile);
express.post('/upload', new Filedownloads().upload);	

server.on('error', function (e) {
	if (e.code === 'EADDRINUSE') {
		console.log('Failed to bind to port - address already in use ');
		process.exit(1);
	}  	
});    

/********************************************socket.io************************************************/		
io.on('connection', function (socket) {	
 	socket.on("error", function(err) {
		//var errorNotification = new Errornotification(err);
		console.log("Caught flash policy server socket error: ");
		console.log(err.stack);
	});	//error
	
	socket.on('login', function (data,callBack) {
		//params: userId, userName, type >> customer,superMrkt,dBoy
		var authData = JSON.parse(data);
		console.log("login");
		if(authData.hasOwnProperty("userId") === true){
			var uniqId = authData.userId, 
			count = 1;

			if (ls.get(uniqId) != null) {
				count = parseInt( ls.get(uniqId).count ) + 1;
				ls.remove(ls.get(uniqId).socket_ids);
			}else{
				io.emit("changeUserOnlineStatus",{"userId": authData.userId,"chatUserType": authData.type, "onlineStatus": 1,"msg": authData.userName });
			}
			socket.join(uniqId);        
			ls.set(uniqId, {'socket_ids': socket.id,'user_id': uniqId,'name': authData.userName ,'count': count});
			ls.set(socket.id, {'socket_ids': socket.id,'user_id': uniqId,'name': authData.userName,'count': count});
			return callBack({"success": 1,"msg": "Socket connected successfully"});
		}else{
			console.log("Invalid parameter.");
			console.log(data);
			return callBack({"success": 0,"msg": "Invalid parameter.","error":data});
		}
	});//login

	socket.on('userList', function(data, callBack) {//customer get supermarket list and their delivery boy list for chat.
		let chat = new Chat(io,ls,socket);
		chat.getUserList(JSON.parse(data), function (cb) {
			callBack(cb);  
		});		
	}); //superMarketList
	
	socket.on('privateMessage', function(data, callBack) {
		var jdata = JSON.parse(data);
		let chat = new Chat(io, ls, socket);
		chat.privateMessages(jdata, function(cb) {
			callBack(cb); //0 for error , 1 for send and received, 2 for pending 
		});			
	}); //privateMessage
		
	socket.on('chatHistory', function(jdata, callback) {
		//params: pageId,chatToId,chatFromId
		var data = JSON.parse(jdata);
		let chat = new Chat(io, ls, socket);
		chat.chatHistory(data,function(cHisrty){
			callback(cHisrty);
		});		
	}); //chatHistory

	socket.on('writingStatus', function(Jdata) { // msg writing status
		//params: chatToId,chatFromId,chatFromName,status>>0,1; 0 for writing off and 1 for writing... 
		var data = JSON.parse(Jdata);
		if (ls.get(data.chatToId)) 
			io.to(data.chatToId).emit('typingStatus', data);
	}); //writingOn

	socket.on('disconnect', function () {
		console.log("disconnect");
	});//disconnect
	
	return socket;
});//sockets