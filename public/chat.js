"use strict";
/*
 * File name: chat.js
 *Purpose: This file contain all chat functionality.  
 * Arthur : Satish Kumar Yadav
 * Company: Ideal IT Techno Pvt. Ltd.
 *  Date :15-Sept-2015
 */
var Database = require('./dataBase.js'),
	moment = require('moment'),
	appConst = require('./const.js');


class Chat {
	constructor(io, ls, socket) {
		this._io = io;
		this._ls = ls;
		this.socket = socket;
	}
	set io(io) {
		this._io = io;
	}
	set ls(ls) {
		this._ls = ls;
	}
	objParams(data) {
		var msgStore = Object.create(null);
		if (data.chatFromId === "" || data.hasOwnProperty("chatFromId") === false)
			return false;
		else if (data.chatToId === "" || data.hasOwnProperty("chatToId") === false)
			return false;
		else if (data.chatMessage === "" || data.hasOwnProperty("chatMessage") === false)
			return false;

		msgStore.chatFromId = "" + data.chatFromId;
		msgStore.chatFromName = data.chatFromName;
		msgStore.chatFromImage = data.chatFromImage;
		msgStore.chatToId = "" + data.chatToId;
		msgStore.chatToName = data.chatToName;
		msgStore.chatToImage = data.chatToImage;
		msgStore.chatMessage = data.chatMessage;
		msgStore.chatDeviceType = "" + data.chatDeviceType;
		msgStore.chatCreatedAt = this.currentTime;//new Date();
		
		return msgStore;
	}//objParams
	privateMessages(data, callBack) {
		let that = this,
			ls = this._ls,
			rplData = { "success": 0, "msg": "Messages send successfully." },
			db = Database.dbTable,
			msgStore = that.objParams(data);

		if (msgStore === false) {
			return callBack({ "success": 0, "msg": appConst.invalidParameters });
		}
		var key = data.chatToId;
		if (ls.get(key) === null) {//user is offline
			msgStore.chatMessageStatus = 0;
		}
		db.insert(msgStore, { w: 1 }, function (err, objects) {
			if (!err) {
				console.log('Successfully inserted row with id=' + objects + '.');
				if (msgStore.chatMessageStatus === 0) {//user is offline
					rplData.success = 2;
					return callBack(rplData);
				} else {
					rplData.success = 1;
					console.log(data.chatToId + '  : I received a private message by ', data.chatFromId, ' saying ', data.chatMessage);
					//socket.broadcast.to(ls.get(data.chatToId).socket_ids).volatile.emit('privateMessage', data);
					data.msg = appConst.chatMsg;
					that.socket.broadcast.to(key).volatile.emit('privateMessage', data);
					return callBack(rplData);
				}
			} else {
				rplData.success = 0;
				rplData.msg = "Messages not send !";
				rplData.error = err;
				console.log('error' + err);
				return callBack(rplData);
			}
		});
	}//privateMessages
	pandingMessages(receiverID) {
		let self = this;
		var db = Database.getDbTable();
		db.find({ "chatToId": String(receiverID), "chatMessageStatus": "0" }, { "chatMessageStatus": 0 }).toArray(function (err, docs) {
			if (!err && docs.length > 0) {
				docs.msg = appConst.chatMsg;
				self._io.sockets.in(self.socket.id).emit('privateMessage', docs);
				db.update({ "chatToId": String(receiverID) }, { $set: { "chatMessageStatus": "1" } }, { multi: true });
			} else {
				console.info("You don`t have any msg.");
				console.log(err);
			}
		});		
	}//pandingMessages
	
	chatHistory(data, callback) {
		//pageId,chatToId,chatFromId
		var page = data.pageId,
			limit = 20;
		if (parseInt(page) === 0) {
			page = 1;
		}
		var startLimit = (page - 1) * limit;
		var db = Database.getDbTable();
		//var where = {"chatToId" :data.chatToId,"chatFromId":data.chatFromId};
			
		var where = { $or: [{ "chatToId": "" + data.chatToId, "chatFromId": "" + data.chatFromId }, { "chatFromId": "" + data.chatToId, "chatToId": "" + data.chatFromId }] };
		db.find(where, { "_id": 0, "chatMessageStatus": 0 }).sort({ _id: -1 }).skip(startLimit).limit(limit).toArray(function (err, docs) {
			if (!err && docs.length > 0) {
				return callback({ 'success': 1, 'msg': 'Records found.', 'result': docs.reverse(), "error": err });
			} else {
				console.log(err);
				return callback({ 'success': 0, 'msg': 'Records not found.', 'result': [], "error": err });
			}
		});
	}//chatHistory		
	getUserList(data, callBack) {
		var sqlQuery = 'SELECT UsrId, UsrFName,UsrLName FROM tbl_user_info'
		Database.getConn(sqlQuery, function (err, dbResult) {
			if (!err && dbResult.length > 0) {
				return callBack({ "success": 1, "msg": "Records  found.", "result": dbResult, "error": err });
			} else {
				return callBack({ "success": 0, "msg": "Records not found.", "result": [], "error": err });
			}
		});
	}//getSupermarketList
	get currentTime() {
		var b = moment.utc();//YMD
		return b.format();
	}//getCurrentTime
	
}//class

module.exports = Chat;

/*
var io;
var ls;
var App = function () {
	this.io = null;
	return this;
}//app


App.prototype = {
	init: function (args) {
		io = args[0];
		ls = args[1];
	},//init
	setObj: function (data) {
		//var msgStore = new Object();//appConst.MsgSchema;
		console.log(data);
		var msgStore = Object.create(null);
		if (data.chatFromId === "" || data.hasOwnProperty("chatFromId") === false)
			return false;
		else if (data.chatToId === "" || data.hasOwnProperty("chatToId") === false)
			return false;
		else if (data.chatMessage === "" || data.hasOwnProperty("chatMessage") === false)
			return false;

		msgStore.chatFromId = "" + data.chatFromId;
		msgStore.chatFromName = data.chatFromName;
		msgStore.chatFromImage = data.chatFromImage;
		msgStore.chatToId = "" + data.chatToId;
		msgStore.chatToName = data.chatToName;
		msgStore.chatToImage = data.chatToImage;
		msgStore.chatMessage = data.chatMessage;
		msgStore.chatDeviceType = "" + data.chatDeviceType;
		msgStore.chatCreatedAt = this.getCurrentTime();//new Date();
		return msgStore;
	},
	onPrivateMessages: function (socket, data, callBack) {  //only for text
		var that = this,
			rplData = { "success": 0, "msg": "Messages send successfully." },
			db = Database.dbTable,
			msgStore = that.setObj(data);

		if (msgStore === false) {
			return callBack({ "success": 0, "msg": appConst.invalidParameters });
		}
		var key = data.chatToId;
		if (ls.get(key) === null) {//user is offline
			msgStore.chatMessageStatus = 0;
		}
		db.insert(msgStore, { w: 1 }, function (err, objects) {
			if (!err) {
				console.log('Successfully inserted row with id=' + objects + '.');
				if (msgStore.chatMessageStatus === 0) {//user is offline
					rplData.success = 2;
					return callBack(rplData);
				} else {
					rplData.success = 1;
					console.log(data.chatToId + '  : I received a private message by ', data.chatFromId, ' saying ', data.chatMessage);
					//socket.broadcast.to(ls.get(data.chatToId).socket_ids).volatile.emit('privateMessage', data);
					data.msg = appConst.chatMsg;
					socket.broadcast.to(key).volatile.emit('privateMessage', data);
					return callBack(rplData);
				}
			} else {
				rplData.success = 0;
				rplData.msg = "Messages not send !";
				rplData.error = err;
				console.log('error' + err);
				return callBack(rplData);
			}
		});


	},//onPrivateMessages

	pandingMessages: function (socket, receiverID) {
		var db = Database.getDbTable();
		db.find({ "chatToId": String(receiverID), "chatMessageStatus": "0" }, { "chatMessageStatus": 0 }).toArray(function (err, docs) {
			if (!err && docs.length > 0) {
				docs.msg = appConst.chatMsg;
				io.sockets.in(socket.id).emit('privateMessage', docs);
				db.update({ "chatToId": String(receiverID) }, { $set: { "chatMessageStatus": "1" } }, { multi: true });
				return true;
			} else {
				console.info("You don`t have any msg.");
				console.log(err);
				return false;
			}
		});
		return false;
	},//pandingMessages
		
	chatHistory: function (data, callback) {
		//pageId,chatToId,chatFromId
		var page = data.pageId,
			limit = 20;
		if (parseInt(page) === 0) {
			page = 1;
		}
		var startLimit = (page - 1) * parseInt(limit);
		var db = Database.getDbTable();
		//var where = {"chatToId" :data.chatToId,"chatFromId":data.chatFromId};
			
		var where = { $or: [{ "chatToId": "" + data.chatToId, "chatFromId": "" + data.chatFromId }, { "chatFromId": "" + data.chatToId, "chatToId": "" + data.chatFromId }] };
		db.find(where, { "_id": 0, "chatMessageStatus": 0 }).sort({ _id: -1 }).skip(startLimit).limit(limit).toArray(function (err, docs) {
			if (!err && docs.length > 0) {
				return callback({ 'success': 1, 'msg': 'Records found.', 'result': docs.reverse(), "error": err });
			} else {
				console.log(err);
				return callback({ 'success': 0, 'msg': 'Records not found.', 'result': [], "error": err });
			}
		});
	},//chatHistory
		
	getUserList: function (data, callBack) {
		var sqlQuery = 'SELECT UsrId, UsrFName,UsrLName FROM tbl_user_info'
		Database.getConn(sqlQuery, function (err, dbResult) {
			if (!err && dbResult.length > 0) {
				return callBack({ "success": 1, "msg": "Records  found.", "result": dbResult, "error": err });
			} else {
				return callBack({ "success": 0, "msg": "Records not found.", "result": [], "error": err });
			}
		})
	},//getSupermarketList
		
		
	getCurrentTime: function (format) {
		var b = moment.utc();//YMD
		return b.format();
	},//getCurrentTime
}//App.prototype

module.exports = new App();
*/