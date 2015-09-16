"use strict";
/*
 * File name: order.js
 *Purpose: This file contain all functionality for order. 
 * Arthur : Satish Kumar Yadav
 * Company: Ideal IT Techno Pvt. Ltd.
 *  Date :01-July-2015
 */

const Chat = require("./chat"),
	Mail = require("./mail"),
	io = require("../index").io,
	ls = require("../index").ls;
	
class Socket extends Chat{
	constructor(socket) {
		super(socket);
		this._socket = socket;
		socket
			.on('login', function (data, callBack) {
				//params: userId, userName, type >> customer,superMrkt,dBoy
				var authData = JSON.parse(data);
				console.log("login", authData);
				if (authData.hasOwnProperty("userId") === true) {
					var uniqId = authData.userId,
						count = 1;
					console.log(ls.get(uniqId));
					if (ls.get(uniqId)) {
						count = parseInt(ls.get(uniqId).count) + 1;
						ls.delete(ls.get(uniqId).socket_ids);
					} else {
						io.emit("changeUserOnlineStatus", { "userId": authData.userId, "chatUserType": authData.type, "onlineStatus": 1, "msg": authData.userName });
					}
					socket.join(uniqId);
					ls.set(uniqId, { 'socket_ids': socket.id, 'user_id': uniqId, 'name': authData.userName, 'count': count });
					ls.set(socket.id, { 'socket_ids': socket.id, 'user_id': uniqId, 'name': authData.userName, 'count': count });
					return callBack({ "success": 1, "msg": "Socket connected successfully" });
				} else {
					console.log("Invalid parameter.");
					console.log(data);
					return callBack({ "success": 0, "msg": "Invalid parameter.", "error": data });
				}
			})//login
			.on('userList', function (data, callBack) {//customer get supermarket list and their delivery boy list for chat.
				let chat = new Chat(socket);
				chat.getUserList(JSON.parse(data), callBack);
			}) //userList	
			.on('privateMessage', function (data, callBack) {
				var jdata = JSON.parse(data);
				let chat = new Chat(socket);
				chat.privateMessages(jdata, callBack);
			}) //privateMessage		
			.on('chatHistory', function (jdata, callback) {
				//params: pageId,chatToId,chatFromId
				var data = JSON.parse(jdata);
				let chat = new Chat(socket);
				chat.chatHistory(data, callback);
			}) //chatHistory
			.on('writingStatus', function (Jdata) { // msg writing status
				//params: chatToId,chatFromId,chatFromName,status>>0,1; 0 for writing off and 1 for writing... 
				var data = JSON.parse(Jdata);
				if (ls.get(data.chatToId))
					io.to(data.chatToId).emit('typingStatus', data);
			}) //writingStatus
			.on("error", function (err) {
				console.log("Caught flash policy server socket error: ");
				console.log(err.stack);
				Mail.sendError(err.stack);
			})//error
			.on('connect', function () {
				console.log('connected');
			})//connect
			.on('connecting', function () {
				console.log('connecting');
			})//connecting
			.on('connect_failed', function () {
				console.log('connect_failed');
			})//connect_failed
			.on('reconnect_failed', function () {
				console.log('reconnect_failed');
			})//reconnect_failed
			.on('disconnect', function () {
				console.log("disconnect");
			});//disconnect	
	}//constructor
	get socket() {
		return this._socket;
	}
	set socket(s) { 
		this._socket = s;
	}
}//class

module.exports = Socket;


/*
module.exports = function (socket) {

	socket.on("error", function (err) {
		//var errorNotification = new Errornotification(err);
		console.log("Caught flash policy server socket error: ");
		console.log(err.stack);
	});//error
	
	socket.on('connect', function () {
		console.log('connected');
	});
	socket.on('connecting', function () {
		console.log('connecting');
	});
	socket.on('connect_failed', function () {
		console.log('connect_failed');
	});
	socket.on('reconnect_failed', function () {
		console.log('reconnect_failed');
	});

	socket.on('login', function (data, callBack) {
		//params: userId, userName, type >> customer,superMrkt,dBoy
		var authData = JSON.parse(data);
		console.log("login", authData);
		if (authData.hasOwnProperty("userId") === true) {
			var uniqId = authData.userId,
				count = 1;
			console.log(ls.get(uniqId));
			if (ls.get(uniqId)) {
				count = parseInt(ls.get(uniqId).count) + 1;
				ls.delete(ls.get(uniqId).socket_ids);
			} else {
				io.emit("changeUserOnlineStatus", { "userId": authData.userId, "chatUserType": authData.type, "onlineStatus": 1, "msg": authData.userName });
			}
			socket.join(uniqId);
			ls.set(uniqId, { 'socket_ids': socket.id, 'user_id': uniqId, 'name': authData.userName, 'count': count });
			ls.set(socket.id, { 'socket_ids': socket.id, 'user_id': uniqId, 'name': authData.userName, 'count': count });
			return callBack({ "success": 1, "msg": "Socket connected successfully" });
		} else {
			console.log("Invalid parameter.");
			console.log(data);
			return callBack({ "success": 0, "msg": "Invalid parameter.", "error": data });
		}
	});//login

	socket.on('userList', function (data, callBack) {//customer get supermarket list and their delivery boy list for chat.
		let chat = new Chat(io, ls, socket);
		chat.getUserList(JSON.parse(data), callBack);
	}); //superMarketList
	
	socket.on('privateMessage', function (data, callBack) {
		var jdata = JSON.parse(data);
		let chat = new Chat(io, ls, socket);
		chat.privateMessages(jdata, callBack);
	}); //privateMessage
		
	socket.on('chatHistory', function (jdata, callback) {
		//params: pageId,chatToId,chatFromId
		var data = JSON.parse(jdata);
		let chat = new Chat(io, ls, socket);
		chat.chatHistory(data, callback);
	}); //chatHistory

	socket.on('writingStatus', function (Jdata) { // msg writing status
		//params: chatToId,chatFromId,chatFromName,status>>0,1; 0 for writing off and 1 for writing... 
		var data = JSON.parse(Jdata);
		if (ls.get(data.chatToId))
			io.to(data.chatToId).emit('typingStatus', data);
	}); //writingOn

	socket.on('disconnect', function () {
		console.log("disconnect");
	});//disconnect
	

};
*/