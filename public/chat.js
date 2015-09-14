"use strict";
/*
 * File name: chat.js
 *Purpose: This file contain all chat functionality.  
 * Arthur : Satish Kumar Yadav
 * Company: Ideal IT Techno Pvt. Ltd.
 *  Date :10-July-2015
 */
var appDB = require('./dataBase.js'),
	ls = require('local-storage'),
	moment = require('moment'),
	appConst = require('./const.js'),
	_= require('underscore');

var io;
var App = function() {
	this.io = null;
	return this;
}//app


App.prototype = {
		init: function (args) {
			io = args[0];
		},//init
		setObj: function(data) {
			//var msgStore = new Object();//appConst.MsgSchema;
			console.log(data);
			var msgStore = Object.create(null);
			if(data.chatShopId === "" || data.hasOwnProperty("chatShopId") === false)
				return false;				
			else if(data.chatCustomerId === "" || data.hasOwnProperty("chatCustomerId") === false)
				return false;	
			else if(data.chatDeliveryBoyId === "" || data.hasOwnProperty("chatDeliveryBoyId") === false)
				return false;
			else if(data.chatFromId === "" || data.hasOwnProperty("chatFromId") === false)
				return false;	
			else if(data.chatToId === "" || data.hasOwnProperty("chatToId") === false)
				return false;	
			else if(data.chatMessage === "" || data.hasOwnProperty("chatMessage") === false)
				return false;	
			
			msgStore.chatToUserType = data.chatToUserType;
			msgStore.chatUserType = data.chatUserType;
			msgStore.chatShopId = ""+data.chatShopId;
			msgStore.chatCustomerId = ""+data.chatCustomerId
			msgStore.chatDeliveryBoyId = ""+data.chatDeliveryBoyId;
			msgStore.chatOrderId = ""+data.chatOrderId;
			msgStore.chatFromId = ""+data.chatFromId;
			msgStore.chatFromName = data.chatFromName;
			msgStore.chatFromImage = data.chatFromImage;
			msgStore.chatToId = ""+data.chatToId;
			msgStore.chatToName = data.chatToName;
			msgStore.chatToImage = data.chatToImage;
			msgStore.chatMessage = data.chatMessage;
			msgStore.chatDeviceType = ""+data.chatDeviceType;
			msgStore.chatCreatedAt = this.getCurrentTime();//new Date();
			return msgStore;
		},
		onPrivateMessages: function(socket,data,callBack) {  //only for text
			var that = this,
			rplData = {"success": 0 , "msg": "Messages send successfully."},
			db = appDB.getDbTable(),
			msgStore = that.setObj(data);

			if(msgStore === false){
				return callBack({"success":0 ,"msg": appConst.invalidParameters});
			}
			var key = data.chatToId+'_'+data.chatToUserType;
			console.log(key);
			if(ls.get(key)  === null ){//user is offline
				msgStore.chatMessageStatus = 0;
			}
			console.log(ls.get(key));
			try{
				appDB.getMsgCountersTbl(function(msgId){
					msgStore._id = msgId;
					db.insert(msgStore, {w:1}, function(err, objects) {
						if (!err) {
							console.log('Successfully inserted row with id='+objects+'.');
							try{
								if(msgStore.chatMessageStatus === 0){//user is offline
									rplData.success = 2;
									return callBack(rplData);    
								}else{
									rplData.success = 1;
									console.log(data.chatToId+'  : I received a private message by ',  data.chatFromId, ' saying ', data.chatMessage);
									//socket.broadcast.to(ls.get(data.chatToId).socket_ids).volatile.emit('privateMessage', data);
									data.msg = appConst.chatMsg;
									socket.broadcast.to(key).volatile.emit('privateMessage', data);
									return callBack(rplData);    
								}
							}catch(e){
								rplData.success = 0;
								rplData.msg = "Messages not send !";
								rplData.error = e;
								console.log('error'+e);
								return callBack(rplData);
							}
						}else{
							rplData.success = 0;
							rplData.msg = "Messages not send !";
							rplData.error = err;
							console.log('error'+err);
							return callBack(rplData);    
						}
					});
				});
			}catch(e){
				rplData.success = 0;
				rplData.msg = "Messages not send !";
				rplData.error = e;
				console.log('error'+e);
				return callBack(rplData);
			}
		},//onPrivateMessages

		pandingMessages: function(socket,receiverID){
			var db = appDB.getDbTable();
			db.find({"chatToId" :String(receiverID), "chatMessageStatus": "0"},{"chatMessageStatus": 0}).toArray(function(err, docs) {
				if(!err && docs .length > 0){
					docs.msg = appConst.chatMsg;
					io.sockets.in(socket.id).emit('privateMessage', docs);
					db.update( { "chatToId": String(receiverID) },{$set: {"chatMessageStatus" : "1"}},{multi: true});
					return true;
				}else{
					console.info("You don`t have any msg.");
					console.log(err);
					return false;
				}
			});     
			return false;
		},//pandingMessages
		
		chatHistory: function(data,callback) {
			//pageId,chatToId,chatFromId
			var page = data.pageId,
			limit = 20;
			if(parseInt(page) === 0){
				page = 1;
			}
			var startLimit = (page-1)*parseInt(limit);
			var db = appDB.getDbTable();
			//var where = {"chatToId" :data.chatToId,"chatFromId":data.chatFromId};
			
			var where =  { $or: [ {"chatToId" :""+data.chatToId,"chatFromId":""+data.chatFromId}, {"chatFromId" :""+data.chatToId,"chatToId":""+data.chatFromId} ] };
			db.find(where,{"_id": 0,"chatMessageStatus": 0 }).sort( { _id: -1 } ).skip(startLimit).limit(limit).toArray(function(err, docs) {
				if(!err && docs .length > 0){
					return callback({'success': 1,'msg': 'Records found.','result':docs.reverse() ,"error":err});
				}else{
					console.log(err);
					return callback({'success': 0,'msg': 'Records not found.', 'result':[],"error":err});
				}
			});
		},//chatHistory
		
		getSupermarketList : function(data,callBack) {
			//params: pageId,chatShopId,
			var page = 1,
			startLimit = 0,
			appResult = new Object(),
			limit = 10;
			if(parseInt(data.pageId) !== 0){
				page = parseInt(data.pageId);
			}
			startLimit = (page-1)*limit;
			appResult.customer = [];
			appResult.deliverBoy = [];

			var sqlQuery = 'SELECT MktUsrProfileImage,UsrId,UsrPhoneNo,UsrFName,UsrLName,UsrGender,UsrProfileImage,UsrDeviceType, DelUsrId,DelUsrname,DelUsrPhoneNo,DelUsrProfileImage,DelUsrDeviceType FROM `'+appConst.tablePrefix+'orders` ' 
			+'JOIN '+appConst.tablePrefix+'user_info ON '+appConst.tablePrefix+'orders.OrderCustomerId = '+appConst.tablePrefix+'user_info.UsrId AND '+appConst.tablePrefix+'user_info.UsrDeleteStatus = "0" AND '+appConst.tablePrefix+'user_info.UsrStatus = "Active" '
			+'LEFT JOIN '+appConst.tablePrefix+'delivery_user_info ON '+appConst.tablePrefix+'orders.OrderDeliveryBoyId = '+appConst.tablePrefix+'delivery_user_info.DelUsrId AND '+appConst.tablePrefix+'delivery_user_info.DelUsrDeleteStatus = "NotDelete" AND '+appConst.tablePrefix+'delivery_user_info.DelUsrAdminStatus = "Active" '
			+' JOIN tbl_market_user_info ON tbl_orders.OrderShopId = tbl_market_user_info.MktUsrId '
			+'WHERE '+appConst.tablePrefix+'orders.OrderShopId = '+data.chatShopId+' GROUP BY UsrId, DelUsrId ';
			
			appDB.getConn(sqlQuery,function(err,dbResult){
				if(!err && dbResult.length > 0){
					appResult.MktUsrProfileImage = dbResult[0].MktUsrProfileImage;
					for(var int = 0; int < dbResult.length ; int++  ){
						appResult.customer.push({ UsrId: dbResult[int].UsrId ,
							UsrPhoneNo: dbResult[int].UsrPhoneNo,
							UsrFName: dbResult[int].UsrFName,
							UsrLName: dbResult[int].UsrLName,
							UsrGender: dbResult[int].UsrGender,
							UsrProfileImage: dbResult[int].UsrProfileImage,
							UsrDeviceType: dbResult[int].UsrDeviceType,
							onlineStatus :  (ls.get(dbResult[int].UsrId+"_customer") === null) ? 0 : 1
						});
						if(dbResult[int].DelUsrId !== null){
							appResult.deliverBoy.push({
								DelUsrId: dbResult[int].DelUsrId,
								DelUsrname: dbResult[int].DelUsrname,
								DelUsrPhoneNo: dbResult[int].DelUsrPhoneNo,
								DelUsrProfileImage: dbResult[int].DelUsrProfileImage,
								DelUsrDeviceType: dbResult[int].DelUsrDeviceType,
								onlineStatus :  (ls.get(dbResult[int].DelUsrId+"_dBoy") === null) ? 0 : 1
							});
						}
					}
					appResult.customer = _.uniq(appResult.customer, true /* array already sorted */, function(item) {
						  return item.UsrId;
						});
					appResult.deliverBoy = _.uniq(appResult.deliverBoy, true /* array already sorted */, function(item) {
						  return item.DelUsrId;
						});
					//console.log("appResult",appResult);
					return callBack({"success": 1,"msg": "Records  found.","result": appResult,"error": err});
				}else{
					return callBack({"success": 0,"msg": "Records not found.","result": [],"error": err});
				}
			})
		},//getSupermarketList
		
		getCustomerList : function(data,callBack) { //use by customer for chat
			//params: pageId,chatCustomerId,
			var db = appDB.getDbTable(),
			page = 1,
			limit = 10;
			if(parseInt(data.pageId) !== 0){
				page = parseInt(data.pageId);
			}
			var startLimit = (page-1)*limit;
			var sqlQuery = 'SELECT MktUsrId,MktUsrSmName,MktUsrProfileImage,MktUsrShopkeeperImage,MktUsrShopKeeperName,MktUsrPhoneNo,DelUsrId,DelUsrname,DelUsrProfileImage,DelUsrPhoneNo' 
				+' FROM `'+appConst.tablePrefix+'orders`'
				+' JOIN `'+appConst.tablePrefix+'market_user_info` ON `'+appConst.tablePrefix+'orders`.`OrderShopId` = `'+appConst.tablePrefix+'market_user_info`.`MktUsrId` AND MktUsrDeleteStatus = "0" '
				+' LEFT JOIN `'+appConst.tablePrefix+'delivery_user_info` ON `'+appConst.tablePrefix+'orders`.`OrderDeliveryBoyId` = `'+appConst.tablePrefix+'delivery_user_info`.`DelUsrId` AND DelUsrDeleteStatus = "NotDelete" AND DelUsrAdminStatus = "Active" '   
				+' WHERE OrderCustomerId = '+data.chatCustomerId+' GROUP BY DelUsrId ' ;

			appDB.getConn(sqlQuery,function(err,dbResult){
				if(!err && dbResult.length > 0){
					var tempArr = new Object();
					for(var int = 0 ; int < dbResult.length ; int++){
						if(tempArr.hasOwnProperty(""+dbResult[int].MktUsrId) === false){
							var onlineMktStatus = (ls.get(dbResult[int].MktUsrId+"_superMrkt") === null) ? 0 : 1;
							tempArr[""+dbResult[int].MktUsrId] = {"MktUsrId": dbResult[int].MktUsrId,"MktUsrSmName":dbResult[int].MktUsrSmName,"MktUsrProfileImage": dbResult[int].MktUsrProfileImage,"MktUsrShopKeeperName":dbResult[int].MktUsrShopKeeperName,"MktUsrShopkeeperImage":dbResult[int].MktUsrShopkeeperImage,"MktUsrPhoneNo":dbResult[int].MktUsrPhoneNo,"dBoy": [],"onlineStatus":onlineMktStatus};
							if(dbResult[int].DelUsrId !==null){
								var onlineStatus = (ls.get(dbResult[int].DelUsrId+"_dBoy") === null) ? 0 : 1;
								tempArr[""+dbResult[int].MktUsrId].dBoy.push({"DelUsrId":dbResult[int].DelUsrId,"DelUsrname":dbResult[int].DelUsrname ,"DelUsrProfileImage":dbResult[int].DelUsrProfileImage,"DelUsrPhoneNo": dbResult[int].DelUsrPhoneNo,"onlineStatus":onlineStatus});
							}
						}else{
							if(dbResult[int].DelUsrId !==null){
								var onlineStatus = (ls.get(dbResult[int].DelUsrId+"_dBoy") === null) ? 0 : 1;
								tempArr[dbResult[int].MktUsrId].dBoy.push({"DelUsrId":dbResult[int].DelUsrId,"DelUsrname":dbResult[int].DelUsrname ,"DelUsrProfileImage":dbResult[int].DelUsrProfileImage,"DelUsrPhoneNo": dbResult[int].DelUsrPhoneNo,"onlineStatus":onlineStatus});
							}
						}
					};
					var strArr = Object.keys(tempArr);
					var appResult = [];
					for(var y=0 ; y < strArr.length ; y++ ){
						appResult.push(tempArr[strArr[y]]);
					}
					
					console.log("appResult",appResult);
					
					return callBack({"success": 1,"msg": "Records  found.","result": appResult,"error": err});
				}else{
					return callBack({"success": 0,"msg": "Records not found.","result": [],"error": err});
				}
			});
			/*var where = {"chatCustomerId": data.chatCustomerId};
			db.find(where).sort( { _id: -1 } ).skip(startLimit).limit(limit).toArray(function(err, docs) {
				if(!err){
					return callBack({"success": 1,"msg": "Records  found.","result": docs});
				}else{
					return callBack({"success": 0,"msg": "Records not found.","result": []});
				}
			});*/
		},//getCustomerList 
		
		getDeliverBoyList : function(data,callBack) {
			//params: pageId,chatDeliveryBoyId
			var db = appDB.getDbTable();
			var sqlQuery =  'SELECT UsrId,UsrPhoneNo,UsrFName,UsrLName,UsrProfileImage,MktUsrId,MktUsrSmName,MktUsrProfileImage,MktUsrShopkeeperImage,MktUsrShopKeeperName,MktUsrPhoneNo ' 
			+'FROM `tbl_orders` '  
			+'JOIN `tbl_market_user_info` ON `tbl_orders`.`OrderShopId` = `tbl_market_user_info`.`MktUsrId` ' 
			+'AND MktUsrDeleteStatus = "0" ' 
			+'JOIN tbl_user_info ON tbl_orders.OrderCustomerId = tbl_user_info.UsrId ' 
			+'AND tbl_user_info.UsrDeleteStatus = "0" ' 
			+'AND  tbl_user_info.UsrStatus = "Active" '
			+'WHERE tbl_orders.OrderDeliveryBoyId = "'+data.chatDeliveryBoyId+'" GROUP BY UsrId '; 
			
			appDB.getConn(sqlQuery,function(err,dbResult){
				if(!err && dbResult.length > 0){
					var tempArr = new Object();
					for(var int = 0 ; int < dbResult.length ; int++){
						if(tempArr.hasOwnProperty(""+dbResult[int].MktUsrId) === false){
							var onlineStatus = (ls.get(dbResult[int].UsrId+"_customer") === null) ? 0 : 1;
							var onlineMktStatus = (ls.get(dbResult[int].MktUsrId+"_superMrkt") === null) ? 0 : 1;
							
					tempArr[""+dbResult[int].MktUsrId] = {"MktUsrId": dbResult[int].MktUsrId,"MktUsrSmName":dbResult[int].MktUsrSmName,"MktUsrProfileImage": dbResult[int].MktUsrProfileImage,"MktUsrShopKeeperName":dbResult[int].MktUsrShopKeeperName,"MktUsrShopkeeperImage":dbResult[int].MktUsrShopkeeperImage,"MktUsrPhoneNo":dbResult[int].MktUsrPhoneNo,"customer": [],"onlineStatus":onlineMktStatus};
				
					tempArr[""+dbResult[int].MktUsrId].customer.push({"UsrId":dbResult[int].UsrId,"UsrFName":dbResult[int].UsrFName ,"UsrProfileImage":dbResult[int].UsrProfileImage,"UsrPhoneNo": dbResult[int].UsrPhoneNo,"UsrLName":dbResult[int].UsrLName,"onlineStatus":onlineStatus});
						}else{
								var onlineStatus = (ls.get(dbResult[int].UsrId+"_customer") === null) ? 0 : 1;
								tempArr[""+dbResult[int].MktUsrId].customer.push({"UsrId":dbResult[int].UsrId,"UsrFName":dbResult[int].UsrFName ,"UsrProfileImage":dbResult[int].UsrProfileImage,"UsrPhoneNo": dbResult[int].UsrPhoneNo,"UsrLName":dbResult[int].UsrLName,"onlineStatus":onlineStatus});
						}
					};
					var strArr = Object.keys(tempArr);
					var appResult = [];
					for(var y=0 ; y < strArr.length ; y++ ){
						appResult.push(tempArr[strArr[y]]);
					}
					return callBack({"success": 1,"msg": "Records  found.","result": appResult,"error": err});
				}else{
					return callBack({"success": 0,"msg": "Records not found.","result": [],"error": err});
				}
			});
		},//getDeliverBoyList
		
		getCurrentTime: function(format){
			var b = moment.utc();//YMD
			return b.format();
		},//getCurrentTime
}//App.prototype

var mainJs = new  App();
module.exports = mainJs;