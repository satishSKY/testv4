"use strict";
/*
 * File name: const.js
 *Purpose: This file contain constant Strings that use in app.  
 * Arthur : Satish Kumar Yadav
 * Company: Ideal IT Techno Pvt. Ltd.
 *  Date :01-July-2015
 */

var appConstant = function () {
	/*mysql constants*/
	this.tablePrefix = "tbl_";
	this.recordFound = "Records found.";
	this.recordNotFound = "Records not found.";
	this.recordUpdatedSuccessfully = "Record updated successfully.";
	this.invalidParameters = "Invalid parameters.";
	this.ItemDeletedSuccessfully = "Record deleted successfully.";
	this.orderApproveSuccessfully = "Order approve successfully.";
	this.orderNotApproveSuccessfully = "Order approve successfully.";
	this.unableToRemoveItem = "Unable to remove item.";
	this.unableToProccessRefund = "Unable to process refund request.";
	this.pleaseSendRefundRequestFirst = "Please send refund request first.";
	this.refundRequestCanceled = "Refund request canceled.";
	this.refundRequest = "Refund request sent.";
	this.customerNotSufficientBalance = "Customer dont have sufficient balance.";
	this.onlineMsg = "is online." ;
	this.offlineMsg = "is offline."; 
	this.chatMsg = "You have a new messages form ";
	
	/*mysql constants*/
	this.MsgSchema = { 
			"chatShopId": "",
			"chatCustomerId": "",
			"chatDeliveryBoyId": "",
			"chatOrderId": "",
			"chatFromId" : "", 
			"chatFromName" : "",
			"chatFromImage" : "",
			"chatToId" : "",
			"chatToName" : "",
			"chatToImage": "",	
			"chatMessage" : "", 
			"chatCreatedAt" : "", 
			"chatDeviceType": "2", //o for ios, 1 for android , 2 for web	
			"chatMessageStatus" : "1"
	}
	return this;
}//appConstant

/*appConstant.prototype = {
	getMy: function () {
	  return "Hello";
	},
}*/

var appConst = new appConstant();
module.exports = appConst;