"use strict";
/*
 * File name: notification.js
 *Purpose: Perform device (ios,android) notification functionality.  
 * Arthur : Satish Kumar Yadav
 * Company: Ideal IT Techno Pvt. Ltd.
 *  Date :15-Sept-2015
 */
var apn = require('apn'),
	gcm = require('node-gcm');
	
class Notification {
	constructor() {
		console.info("Notification constructor	");
		this.gcmSender = new gcm.Sender("GCMAPIKEY");/*Android*/
		//this.apnConnection = new apn.Connection({cert:'****.pem',key:'apns-prod-key.pem',passphrase: '123456',production: false})/*IOS*/
		//this.apnService = new apn.connection({ production: false });
		/*Notice that you can at most send notifications to 1000 registration ids at a time. This is due to a restriction on the side of the GCM API.*/

		/*this.feedback = new apn.Feedback( {"batchFeedback": true,"interval": 300,"passphrase": "123456"});
		this.feedback.on("feedback", function(devices) {
			devices.forEach(function(item) {
				console.log(item);
			});
		});
		this.apnService.on("connected", function() {
			console.log("Connected");
		});
		
		this.apnService.on("transmitted", function(notification, device) {
			console.log("Notification transmitted to:" + device.token.toString("hex"));
		});
		
		this.apnService.on("transmissionError", function(errCode, notification, device) {
			console.error("Notification caused error: " + errCode + " for device ", device, notification);
			if (errCode === 8) {
				console.log("A error code of 8 indicates that the device token is invalid. This could be for a number of reasons - are you using the correct environment? i.e. Production vs. Sandbox");
			}
		});
		
		this.apnService.on("timeout", function () {
			console.log("Connection Timeout");
		});
		
		this.apnService.on("disconnected", function() {
			console.log("Disconnected from APNS");
		});*/
	}//constructor
	sendApnNotification(apnOption) { 
		//params: deviceType, title,msg,type
		console.log("----------sendApnNotification-------------");
		//{"userType": 0,"from":"Supermarket","userTitle": "Supermarket", "userMsg":"Supermarket Test ","device": ,userMsgType
		try {
			var myDevice = apnOption.device;
			var note = new apn.notification();
			note.expiry = Math.floor(Date.now() / 1000) + 3600;
			note.alert = { "title": apnOption.userTitle, "body": apnOption.userMsg, 'type': apnOption.userMsgType };
			note.badge = 0;
			note.device = myDevice;
			note.sound = "ping.aiff";
			//console.log(note);
			this.apnConnection.pushNotification(note, myDevice);
		} catch (e) {
			console.log(e);
		}
	}
	sendGcmNotification(gcmOption) { 
		//params: deviceType,
		console.log("----------sendGcmNotification-------------");
		var registrationIds = gcmOption.device; //Array
		var message = new gcm.Message({
			collapseKey: "demo",
			delayWhileIdle: true,
			timeToLive: 3,
			dryRun: false,
			data: {
				id: "message2",
				title: gcmOption.userTitle,
				msg: gcmOption.userMsg,
				type: gcmOption.userMsgType,
			}
		});
		this.gcmSender.send(message, registrationIds, 2, function (err, result) {
   					if(err){console.log("Error: "); console.log(err);}
   					else    console.log(result);
 				});
	}
}
module.exports = Notification;
/*IOS*/
//var apnOption = {"userMsgType": 1,"userType": 0,"from":"Supermarket","userTitle": "Supermarket", "userMsg":"Supermarket Test ","device": "c02f3e52fab0832cd56644a3f7b83de633c797b19384060043faa260eb0ab2fa"};
//notification.sendApnNotification(apnOption);
/*Android*/
//notification.sendGcmNotification({"userMsgType":1,"userType":1,"from":"Ram","userTitle": "sky", "userMsg":"test","device": " APA91bF5BmN3KvgMmSrkO3-4UXRUJmf6nSVDYqkDo6pZk1_0p0fm6TByqOBFKXppgrJYe0zkoP49HzN0LW5RN7CKvHgHgi25HDIeRRxy0Fm_hBUQfBF285BK-jy_qjh_k0jqjfxhIRkL"});




	/*
var Notification1 = function(){
	this.superMarketSender = new gcm.Sender("AIzaSyD3nf8sOSb1M7LuGs5LLj9K76-eAxQjCsw");
	this.apnSupermarketConnection = new apn.Connection({cert:__dirname+"/supermarket_Development.pem",key:__dirname+"/apns-prod-key-super.pem",passphrase: "123456"});

	this.apnService = new apn.connection({ production: false });
	
	//Notice that you can at most send notifications to 1000 registration ids at a time. This is due to a restriction on the side of the GCM API.

	this.feedback = new apn.Feedback( {cert:__dirname+"/supermarket_Development.pem",key:__dirname+"/apns-prod-key-super.pem","batchFeedback": true,"interval": 300,"passphrase": "123456"});
	this.feedback.on("feedback", function(devices) {
	    devices.forEach(function(item) {
	        console.log(item);
	    });
	});
	this.feedback1 = new apn.Feedback( {cert:__dirname+"/cusomer_development.pem",key:__dirname+"/apns-prod-key-customer.pem","batchFeedback": true,"interval": 300,"passphrase": "123456"});
	this.feedback1.on("feedback", function(devices) {
	    devices.forEach(function(item) {
	        console.log(item);
	    });
	});
	this.feedback2 = new apn.Feedback( {cert:__dirname+"/deliveryBoy_Development.pem",key:__dirname+"/apns-prod-key-deliver.pem","batchFeedback": true,"interval": 300,"passphrase": "123456"});
	this.feedback2.on("feedback", function(devices) {
	    devices.forEach(function(item) {
	        console.log(item);
	    });
	});
	this.apnService.on("connected", function() {
	    console.log("Connected");
	});
	
	this.apnService.on("transmitted", function(notification, device) {
	    console.log("Notification transmitted to:" + device.token.toString("hex"));
	});
	
	this.apnService.on("transmissionError", function(errCode, notification, device) {
	    console.error("Notification caused error: " + errCode + " for device ", device, notification);
	    if (errCode === 8) {
	        console.log("A error code of 8 indicates that the device token is invalid. This could be for a number of reasons - are you using the correct environment? i.e. Production vs. Sandbox");
	    }
	});
	
	this.apnService.on("timeout", function () {
	    console.log("Connection Timeout");
	});
	
	this.apnService.on("disconnected", function() {
	    console.log("Disconnected from APNS");
	});

}//Notification

Notification.prototype.sendApnNotification = function(apnOption){
	//params: deviceType, userType,title,msg,type
	console.log("----------sendApnNotification-------------");
	//{"userType": 0,"from":"Supermarket","userTitle": "Supermarket", "userMsg":"Supermarket Test ","device": ,userMsgType
	try{
		var myDevice = apnOption.device;
		var note = new apn.notification();
		note.expiry = Math.floor(Date.now() / 1000) + 3600;
		note.alert = {"title": apnOption.userTitle, "body": apnOption.userMsg,'type':apnOption.userMsgType};
		note.badge = 0;
		note.device = myDevice;
		note.sound = "ping.aiff";
		//console.log(note);
		
		if(parseInt(apnOption.userType) === 0){// 0 for supermarket, 
			this.apnSupermarketConnection.pushNotification(note, myDevice);
		}else if(parseInt(apnOption.userType) === 1){//1 for customer,
			this.apnCustomerConnection.pushNotification(note, myDevice);
		}else if(parseInt(apnOption.userType) === 2){// 2 for delivery boy. 
			this.apnDeliverBoyConnection.pushNotification(note, myDevice);
		}		
		//apnConnection.pushNotification(note, myDevice);
	}catch(e){
		console.log(e);
	}
}//sendApnNotification

Notification.prototype.sendGcmNotification = function(gcmOption){
	//params: deviceType, userType
	console.log("----------sendGcmNotification-------------");
	var registrationIds = gcmOption.device ; //Array
	var message = new gcm.Message({
		collapseKey: "demo",
		delayWhileIdle: true,
		timeToLive: 3,
		dryRun : false,
		data: {
			id: "message2",
			title:gcmOption.userTitle,
			msg: gcmOption.userMsg,
			type: gcmOption.userMsgType,        
		}
	});
	
	//console.log(message);
	//console.log(registrationIds);
	
	if(parseInt(gcmOption.userType) === 0){// 0 for supermarket, 
		this.superMarketSender.send(message, registrationIds, 2, function (err, result) {
			if(err){console.log("superMarketSender Error: "); console.log(err);}
			else    console.log(result);
		});
	}else if(parseInt(gcmOption.userType) === 1){//1 for customer,
		this.customerSender.send(message, registrationIds, 2, function (err, result) {
			if(err){console.log("customerSender Error: "); console.log(err);}
			else    console.log(result);
		});
	}else if(parseInt(gcmOption.userType) === 2){// 2 for delivery boy. 
		this.deliverBoySender.send(message, registrationIds, 2, function (err, result) {
			if(err){console.log("deliverBoySender Error: "); console.log(err);}
			else    console.log(result);
		});
	}			
}//sendGcmNotification

//var notification = new Notification();
/*IOS*/
//var apnOption = {"userMsgType": 1,"userType": 0,"from":"Supermarket","userTitle": "Supermarket", "userMsg":"Supermarket Test ","device": "c02f3e52fab0832cd56644a3f7b83de633c797b19384060043faa260eb0ab2fa"};
//notification.sendApnNotification(apnOption);
/*Android*/
//notification.sendGcmNotification({"userMsgType":1,"userType":1,"from":"Ram","userTitle": "sky", "userMsg":"test","device": " APA91bF5BmN3KvgMmSrkO3-4UXRUJmf6nSVDYqkDo6pZk1_0p0fm6TByqOBFKXppgrJYe0zkoP49HzN0LW5RN7CKvHgHgi25HDIeRRxy0Fm_hBUQfBF285BK-jy_qjh_k0jqjfxhIRkL"});
