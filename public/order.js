"use strict";
/*
 * File name: order.js
 *Purpose: This file contain all functionality for order. 
 * Arthur : Satish Kumar Yadav
 * Company: Ideal IT Techno Pvt. Ltd.
 *  Date :01-July-2015
 */

var appDB = require('./dataBase.js'),
	ls = require('local-storage'),
	moment = require('moment'),
	async = require('async'),
	Notification = require('./notification.js'),
	appConst = require('./const.js');


var io=null;
var order = function() {
	this.io=null;
	return this;
}//order


order.prototype = {
		init: function(args){
			io = args[0];
		},//init

		updateCustomerOrderList: function(custmerId,orderId,sUserId) {
			console.log("-----------------updateCustomerOrderList-------------------------");
			var sql = 'SELECT OrderCustomerId FROM `'+appConst.tablePrefix+'orders` WHERE OrderId= "'+orderId+'" AND OrderShopId ="'+sUserId+'" ';
			appDB.getConn(sql,function(err,dbResult){
				if(!err && dbResult.length > 0){  
					var uniqId = dbResult[0].OrderCustomerId+'_customer';
					if(ls.get(uniqId) !== null){
						io.to(uniqId).emit("updateCustomerOrderList",{"OrderCustomerId": custmerId,"OrderId":orderId,"MktUsrId":sUserId});
						return true;
					}
				}
			});
			return false;
		},//updateCustomerOrderList

		viewOrderDetails: function (data,callBack) {
			//OrderId,
			var sqlQuery = 'SELECT  '+appConst.tablePrefix+'order_items.id,ItemCashBackPercent,OrderCustomerId,ItemCustomerQuantity ,OrderId,OrderDeliveryAddress,OrderTax,ItemMarketChecked,ItemPrice,ItemOriginalPrice,OrderDiscount, ItemProductId, ItemProductName, ItemPrice, ItemOrderType,ItemQuantity,OrderTotalAmount,OrderDeliveryCharges,ImgName,ItemStatus,ItemProductRefundable,OrderRefundAmount,SubcatRefundPolicy AS refundPolicy '
			+' FROM '+appConst.tablePrefix+'orders'
			+' JOIN '+appConst.tablePrefix+'order_items ON '+appConst.tablePrefix+'order_items.ItemOrderId ='+appConst.tablePrefix+'orders.OrderId'
			+' JOIN '+appConst.tablePrefix+'product ON '+appConst.tablePrefix+'product.ProductId ='+appConst.tablePrefix+'order_items.ItemProductId'
			+' JOIN '+appConst.tablePrefix+'master_products ON '+appConst.tablePrefix+'master_products.MProductId ='+appConst.tablePrefix+'product.ProductMId'
			+' JOIN '+appConst.tablePrefix+'subcategory ON '+appConst.tablePrefix+'subcategory.SubcatId = '+appConst.tablePrefix+'order_items.ItemSubCatId'
			+' LEFT JOIN '+appConst.tablePrefix+'product_images ON '+appConst.tablePrefix+'product_images.ImgProductId ='+appConst.tablePrefix+'master_products.MProductId AND ImageStatus="1" '
			+' WHERE OrderId=" '+data.OrderId+' " '
			+' AND ItemDeleteStatus = "0" '
			+'ORDER BY ItemOrderType="New" DESC,ItemOrderType="Replace" DESC,ItemOrderType="Added" DESC ';
			//+' ORDER BY  '+appConst.tablePrefix+'order_items.id DESC';

			appDB.getConn(sqlQuery,function(err,dbResult){
				//console.log(dbResult);
				if(err){  
					return callBack({"success":0,"error":err,"msg": appConst.recordNotFound,"result":[]});
				}else if(dbResult.length <= 0 ){
					return callBack({"success":0,"error":err,"msg": appConst.recordNotFound,"result":[]});
				}else{
					var OrderDetails  = new Object(),
					myResult  = new Object(),
					newProduct   = [],
					addedProduct   = [],
					replacProduct   = [];

					for(var int in dbResult){

						OrderDetails.OrderDeliveryAddress = dbResult[int].OrderDeliveryAddress;
						OrderDetails.OrderDeliveryCharges  = dbResult[int].OrderDeliveryCharges ;
						OrderDetails.OrderDiscount  = dbResult[int].OrderDiscount ;
						OrderDetails.OrderId  = dbResult[int].OrderId ;
						OrderDetails.OrderTax  = dbResult[int].OrderTax ;
						OrderDetails.OrderAmount = parseFloat( parseFloat(dbResult[int].OrderTotalAmount ) ).toFixed(2); 
						OrderDetails.OrderTotalAmount = parseFloat( parseFloat(dbResult[int].OrderTotalAmount ) + parseFloat(dbResult[int].OrderDeliveryCharges) ).toFixed(2);
						OrderDetails.OrderCustomerId  = dbResult[int].OrderCustomerId ;

						var newObj  = new Object();

						newObj.ItemChecked = dbResult[int].ItemMarketChecked;
						newObj.ItemStatus = dbResult[int].ItemStatus;
						newObj.Price = dbResult[int].ItemOriginalPrice ;
						newObj.ProductImage  = dbResult[int].ImgName;
						newObj.ProductName  = dbResult[int].ItemProductName;
						newObj.PurchasePrice = dbResult[int].ItemPrice;
						newObj.Quantity  = dbResult[int].ItemQuantity;
						newObj.id = dbResult[int].ItemProductId ;
						newObj.orderKey = dbResult[int].id ;//primary key
						newObj.itemCustomerQuantity = dbResult[int].ItemCustomerQuantity;
						newObj.refundPolicy = dbResult[int].refundPolicy;
						newObj.OrderRefundAmount = dbResult[int].OrderRefundAmount;
						newObj.ItemProductRefundable = dbResult[int].ItemProductRefundable;
						newObj.ItemCashBackPercent = dbResult[int].ItemCashBackPercent;


						if(dbResult[int].ItemOrderType === "New" ){
							newProduct.push(newObj);
						}else if(dbResult[int].ItemOrderType === "Added" ){
							addedProduct.push(newObj);
						}else if(dbResult[int].ItemOrderType === "Replace" ){
							replacProduct.push(newObj);
						}
					}
					myResult.Product = newProduct;
					myResult.addedProduct = addedProduct;
					myResult.replacedProduct = replacProduct;

					myResult.OrderDetails = OrderDetails;
					return callBack({"success": 1,"error":0,"msg": appConst.recordFound,"result":myResult});
				}
			});//getConn


		},//viewOrderDetails
		checkWalletBallence: function(orderCustomerId,priceStatus,myItemPrice,cb) {
			if(priceStatus === 0) {
				return cb(true);
			}else{
				var chekQuery = 'SELECT (`UsrWalletBalance` - `UsrFreezAmount`) AS actualbal,`UsrFreezAmount`,`UsrWalletBalance` FROM `'+appConst.tablePrefix+'user_info` WHERE UsrId = '+orderCustomerId+' having actualbal >=  '+myItemPrice+' ';
				appDB.getConn(chekQuery,function(er,result){
					if(!er){ 
						if(result.length > 0){
							cb(true)
						}else{
							cb(false)
						}
					}else{
						cb(false)
					}
				});
			}
		},//checkWalletBallence
		newOrderEditItem: function(data, cBack) {
			//Qty,ProductId,OrderID,SUserId;
			var self = this;
			var myItemPrice = 0.0;
			var sqlQuery = 'SELECT id,ItemPrice,OrderCustomerId,ItemQuantity FROM '+appConst.tablePrefix+'order_items JOIN '+appConst.tablePrefix+'orders ON  '+appConst.tablePrefix+'order_items.ItemOrderId= '+appConst.tablePrefix+'orders.OrderId  WHERE ItemOrderId = "'+data.OrderID+'"AND ItemDeleteStatus="0"  AND ItemProductId="'+data.ProductId+'" AND ItemChecked= "1" ';
			appDB.getConn(sqlQuery,function(err,dbResult){
				if(err){  
					console.log(err);
					return cBack({"success":0,"error":err,"msg":  appConst.recordNotFound});
				}else if(dbResult.length <= 0){
					console.log(dbResult);
					return cBack({"success":0,"error":0,"msg": appConst.recordNotFound});
				}else{
					var processStatus = false;
					data.priceStatus = 2; //do nothing;
					console.log(dbResult);
					console.log( parseInt(data.Qty) +" > "+ parseInt(dbResult[0].ItemQuantity) );
					if(parseInt(data.Qty) > parseInt(dbResult[0].ItemQuantity) ){
						myItemPrice = parseFloat(dbResult[0].ItemPrice)*(parseInt(data.Qty) - parseInt(dbResult[0].ItemQuantity));
						data.priceStatus = 1; //substract amt from wallet
					}else{
						data.priceStatus = 0; //refund or add amt to user wallet
						myItemPrice = parseFloat(dbResult[0].ItemPrice)*( parseInt(dbResult[0].ItemQuantity) - parseInt(data.Qty)  );
					}
					self.checkWalletBallence(dbResult[0].OrderCustomerId,data.priceStatus,myItemPrice,function(pStatus){
						processStatus = pStatus;
						console.log(processStatus);
						if(processStatus === true){
							var sqlUpdate = 'UPDATE '+appConst.tablePrefix+'order_items SET ItemQuantity = "'+data.Qty+'" WHERE '+appConst.tablePrefix+'order_items.id = "'+dbResult[0].id+'" ';
							console.log(sqlUpdate);
							appDB.getConn(sqlUpdate,function(er,result){
								if(er){  
									console.log(er);
									return cBack({"success":0,"error":er,"msg": appConst.recordNotFound});
								}else{
									console.log(result);
									var dObj = [];
									var deliveryCharges = 0.0;
									var totalAmount = 0.0; //not including deliverCost
									var grandTotalAmount = 0.0; //including deliverCost
									var itemOriginalPrice =0.0; 
									var oldDeliveryCharges = 0.0;
									async.series({
										one: function(callback){
											var calAmt = 'SELECT  ItemQuantity ,OrderShopId,OrderLat,OrderLong,OrderDeliveryCharges, ItemPrice FROM '+appConst.tablePrefix+'order_items JOIN '+appConst.tablePrefix+'orders ON '+appConst.tablePrefix+'order_items.ItemOrderId = '+appConst.tablePrefix+'orders.OrderId WHERE  ItemOrderId = "'+data.OrderID+'" AND ItemDeleteStatus	="0" AND ItemChecked = "1"  ';	
											appDB.getConn(calAmt,function(Err,discResult){
												console.log(discResult);
												if(!Err && discResult.length > 0){
													dObj = discResult[0];
													var temp1 = 0.0;
													var temp2 = 0.0;
													oldDeliveryCharges =parseFloat(discResult[0].OrderDeliveryCharges);
													for(var int = 0 in discResult){
														temp1 = parseFloat(discResult[int].ItemPrice) * parseFloat(discResult[int].ItemQuantity);
														temp2 = parseFloat(discResult[int].ItemOriginalPrice) * parseFloat(discResult[int].ItemQuantity);
														itemOriginalPrice = itemOriginalPrice+temp2;
														totalAmount = totalAmount+temp1;
														dObj.totalAmount = totalAmount;
													}
													callback(null, 1);
												}else{
													console.log(Err);
													callback(null, 1);
												}
											});
										},//one
										two: function(callback){
											dObj.orderId = data.OrderID;
											self.getDeliveryChargesNew(dObj,function(dCharge){
												// totalAmount,OrderShopId,OrderLat,OrderLong
												deliveryCharges = dCharge.deliveryCharges;
												//console.log("delivery_charges",dCharge);
												callback(null, deliveryCharges);
											});
										},//two
										three: function(callback){
											grandTotalAmount = totalAmount;//+deliveryCharges;
											var updateAmt = 'UPDATE '+appConst.tablePrefix+'orders SET  OrderTotalAmount = "'+grandTotalAmount+'" ,OrderDeliveryCharges = "'+deliveryCharges+'" , OrderActualTotal="'+itemOriginalPrice+'"  WHERE OrderId = "'+data.OrderID+'" '; 
											appDB.getConn(updateAmt,function(Err,discResult){
												if(Err) console.log(Err); 
												callback(null, 3);
											});
										},//three
										sendNotify:function(callback){
											var sql = 'SELECT OrderPaymentMethod,OrderMktVerifiedStatus, OrderCustomerId FROM '+appConst.tablePrefix+'orders WHERE OrderId= "'+data.OrderID+'" AND OrderShopId="'+data.SUserId+'"  AND OrderDeleteStatus="0" ';
											appDB.getConn(sql,function(Err,discResult){
												if(!Err && discResult.length > 0){
													var userUpdate  = '';
													console.log(discResult[0].OrderPaymentMethod +"<>"+discResult[0].OrderMktVerifiedStatus);
													if((discResult[0].OrderPaymentMethod=== "Cash" && parseInt(discResult[0].OrderMktVerifiedStatus) === 1) ||  discResult[0].OrderPaymentMethod=== "Wallet"  ){
														var freezAmt = 0;
														if(parseInt(data.priceStatus) === 0){
															if(parseFloat(deliveryCharges) > parseFloat(oldDeliveryCharges) )
																freezAmt =  (parseFloat(myItemPrice) - parseFloat(deliveryCharges) +  parseFloat(oldDeliveryCharges) );
															else
																freezAmt =  (parseFloat(myItemPrice) + parseFloat(deliveryCharges) - parseFloat(oldDeliveryCharges) );
															
															userUpdate = ' UPDATE `'+appConst.tablePrefix+'user_info` SET `UsrFreezAmount` = UsrFreezAmount - '+freezAmt+' WHERE `UsrDeleteStatus` = "0" AND `UsrStatus` = "Active" AND `UsrId` = "'+discResult[0].OrderCustomerId+'" ';
														}else{
															freezAmt =  parseFloat(myItemPrice) + parseFloat(deliveryCharges) - parseFloat(oldDeliveryCharges) ;
															userUpdate = ' UPDATE `'+appConst.tablePrefix+'user_info` SET `UsrFreezAmount` = UsrFreezAmount + '+freezAmt+' WHERE `UsrDeleteStatus` = "0" AND `UsrStatus` = "Active" AND `UsrId` = "'+discResult[0].OrderCustomerId+'" ';
														} 
														appDB.getConn(userUpdate,function(Erdsr,discResudslt){
															if(Erdsr) console.log(Erdsr);
															console.log("update UsrFreezAmount");
														})

													}else if( discResult[0].OrderPaymentMethod === "Wallet"){/*
														console.log(data.priceStatus);
														//myItemPrice = oldDeliveryCharges + myItemPrice;
														if(data.priceStatus === 0){
															 myItemPrice = myItemPrice + parseFloat(oldDeliveryCharges) - parseFloat(deliveryCharges) ;
															userUpdate = ' UPDATE `'+appConst.tablePrefix+'user_info` SET `UsrWalletBalance` =UsrWalletBalance+ '+myItemPrice+' WHERE `UsrDeleteStatus` = "0" AND `UsrStatus` = "Active" AND `UsrId` = "'+discResult[0].OrderCustomerId+'" ';
														}else if(data.priceStatus === 1){
															if( parseFloat(deliveryCharges) > parseFloat(oldDeliveryCharges))
																myItemPrice = myItemPrice + parseFloat(oldDeliveryCharges) - parseFloat(deliveryCharges) ;
															else
																myItemPrice = myItemPrice +  parseFloat(deliveryCharges) - parseFloat(oldDeliveryCharges)  ;
															
															userUpdate = ' UPDATE `'+appConst.tablePrefix+'user_info` SET `UsrWalletBalance` =UsrWalletBalance- '+myItemPrice+' WHERE `UsrDeleteStatus` = "0" AND `UsrStatus` = "Active" AND `UsrId` = "'+discResult[0].OrderCustomerId+'" ';
														}
														appDB.getConn(userUpdate,function(Erdsr,discResudslt){
															console.log("update wallet");
															var totalD = parseFloat(totalAmount) + parseFloat(deliveryCharges);
															var userUpdateCustomer = ' UPDATE '+appConst.tablePrefix+'customer_wallet SET `WalletAmount` = '+totalD+' WHERE `WalletAmntType` = "5" AND `WalletUsrId` = "'+discResult[0].OrderCustomerId+'" AND WalletOrderId = '+data.OrderID+' ';	
															appDB.getConn(userUpdateCustomer,function(Err,discResult){});
														});
													*/}
													var mOrder = new order();
													mOrder.updateCustomerOrderList(discResult[0].OrderCustomerId,data.OrderID,data.SUserId);
													callback(null, 12);
												}else{
													callback(null, 12);
												}
											});
										},//sendNotify
									},
									function(err, results) {
										return cBack({"success": 1,"error":0,"msg": appConst.recordUpdatedSuccessfully});
									});
								}
							});//sqlUpdate getConn
						}else{
							return cBack({"success":0,"error":0,"msg": appConst.customerNotSufficientBalance});
						}
					});
				}
			});//getConn
		},//newOrderEditItem

		newOrderDeleteItem: function(data, cBack) {
			//OrderID,ProductId,SUserId,
			var self = this;
			var sql = 'SELECT OrderId,OrderCustomerId,'+appConst.tablePrefix+'order_items.id FROM '+appConst.tablePrefix+'orders JOIN '+appConst.tablePrefix+'order_items ON '+appConst.tablePrefix+'orders.OrderId= '+appConst.tablePrefix+'order_items.ItemOrderId AND '+appConst.tablePrefix+'order_items.ItemProductId = "'+data.ProductId+'" AND ItemDeleteStatus="0" WHERE OrderId= "'+data.OrderID+'" AND OrderDeleteStatus="0" AND OrderShopId="'+data.SUserId+'" ';
			appDB.getConn(sql,function(Err,discResult){
				if(!Err && discResult.length > 0){
					var mOrder = new Object();
					mOrder.orderId = data.OrderID;
					mOrder.customerId = discResult[0].OrderCustomerId;
					mOrder.itemId = discResult[0].id;
					mOrder.callBySupermarket = true;
					var myOrder = new order();
					self.customerOrderItemRemove(mOrder,function(responce){//params: orderId, customerId,itemId,
						myOrder.updateCustomerOrderList(discResult[0].OrderCustomerId,data.OrderID,data.SUserId);
						return cBack(responce);
					});
				}else{
					console.log(Err);
					return cBack({"success": 0,"error":0,"msg": appConst.recordNotFound});
				}
			});		
		},//newOrderDeleteItem
		doneOrderCheckItem: function(data, cb){
			var self = this;
			//params: OrderID,SUserId,ProductId[1,1,1,3,]
			  async.auto({
				    get_data: function(callback){
				    	var sqlQuery = 'SELECT id,ItemPrice,OrderCustomerId,ItemOriginalPrice,ItemQuantity,OrderTotalAmount AS oldOrderTotalAmount, OrderMktVerifiedStatus,OrderPaymentMethod,OrderDeliveryCharges AS oldDeliveryCharges,SUM(ItemPrice * ItemQuantity) AS totalAmount,SUM(ItemOriginalPrice * ItemQuantity) AS orderActualTotal ,OrderShopId,OrderLat,OrderLong FROM '+appConst.tablePrefix+'order_items'
				    	+' JOIN '+appConst.tablePrefix+'orders ON  '+appConst.tablePrefix+'order_items.ItemOrderId= '+appConst.tablePrefix+'orders.OrderId AND OrderShopStatus ="Pending" AND OrderDeleteStatus="0" '
				    	+' WHERE ItemSuperMarketId='+data.SUserId+' AND ItemOrderId = "'+data.OrderID+'" AND ItemProductId IN ('+data.ProductId+') AND ItemDeleteStatus="0" ';
				    
				    	appDB.getConn(sqlQuery,function(err,dbResult){
				    		if(!err && dbResult.length > 0){
				    			var temp = 0;
				    			var temp1 = 0;
				    			for(var int = 0; int < dbResult.length;int++){
				    				temp = temp+ dbResult[int].totalAmount;
				    				temp1 = temp1+ dbResult[int].orderActualTotal;
				    			}
				    			dbResult[0].totalAmount = temp;
				    			dbResult[0].orderActualTotal = temp1;
				    			callback(null, dbResult);
				    		}else{
									console.log(err);
									 callback(1, err, dbResult);
								}
							});
				    },
				    checkUeseWalletBalance: ['get_data',  function(callback,results){
				    	var dbResult = results.get_data,
				    		myItemPrice =  parseFloat(dbResult[0].totalAmount),
				    		myPriceDifference = parseFloat(dbResult[0].oldOrderTotalAmount) - parseFloat(dbResult[0].totalAmount);
				    	//	console.log(myItemPrice +"<old->"+ dbResult[0].oldOrderTotalAmount);
				    	if(myPriceDifference >= 0 ){
				    		callback(null,1);
				    	}else{
				    	myPriceDifference =  parseFloat(dbResult[0].totalAmount) - parseFloat(dbResult[0].oldOrderTotalAmount);
				    	self.checkWalletBallence(dbResult[0].OrderCustomerId ,1,myPriceDifference,function(pStatus){
							if(pStatus === true){
								callback(null,1);
							}else{
								callback(2,null);
							}
						});
						}
				  }], 
				    update_itemStatus:['get_data',  function(callback,results){
				    	var updateStatus = 'UPDATE '+appConst.tablePrefix+'order_items SET  ItemChecked = 1 , ItemMarketChecked = 1 '
				    	+' WHERE ItemSuperMarketId="'+data.SUserId+'" AND ItemOrderId = "'+data.OrderID+'"  AND ItemProductId IN('+data.ProductId+') ';
				    
				    	var sql = 'UPDATE '+appConst.tablePrefix+'order_items SET  ItemChecked = 0 , ItemMarketChecked = 0 '
				    	+' WHERE ItemSuperMarketId="'+data.SUserId+'" AND ItemOrderId = "'+data.OrderID+'" ';
				    	appDB.getConn(sql,function(ER,dcResult){
				    		if(!ER){
				    			appDB.getConn(updateStatus,function(Err,discResult){
				    				if(Err){ 
				    					console.log(Err);
				    					callback(1, Err);
				    				}else{
				    					callback(null,1);
				    				}
				    			});
				    		}else{
				    			callback(1,null);
				    		}

				    	});
				    }],
				    delivery_charges: ['get_data',  function(callback, results){
				    	data.orderId = data.OrderID;
				    	var dbResult = results.get_data,
				    	deliveryCharges = 0,
				    	totalAmount =  parseFloat(dbResult[0].totalAmount);
				    	self.getDeliveryChargesNew(dbResult[0],function(dCharge){
				    		// totalAmount,OrderShopId,OrderLat,OrderLong
				    		deliveryCharges = dCharge.deliveryCharges;
				    		//console.log("delivery_charges",dCharge);
				    		callback(null, deliveryCharges);
				    	});
				    }],
				    update_order: ['get_data','delivery_charges', function(callback, results){
				    	var dbResult = results.get_data;
				    	var dCharges = results.delivery_charges;
				    	dbResult[0].orderActualTotal = parseFloat(dbResult[0].orderActualTotal).toFixed(2);
				    //	console.log(dCharges);
				    	var updateAmt = 'UPDATE '+appConst.tablePrefix+'orders SET  OrderDoneStatus="1", OrderTotalAmount = "'+dbResult[0].totalAmount+'" ,OrderDeliveryCharges = "'+dCharges+'" , OrderActualTotal="'+dbResult[0].orderActualTotal+'" WHERE OrderId = "'+data.OrderID+'" '; 
						appDB.getConn(updateAmt,function(Err,discResult){
							if(Err) console.log("update_order",Err); 
						});
						if((dbResult[0].OrderPaymentMethod === "Cash" && parseInt(dbResult[0].OrderMktVerifiedStatus) === 1) || dbResult[0].OrderPaymentMethod === "Wallet" ){
							var freezAmt = 0,
								userUpdate = '';
							freezAmt =  parseFloat(dbResult[0].totalAmount) +  parseFloat(dCharges) - parseFloat(dbResult[0].oldOrderTotalAmount) - parseFloat(dbResult[0].oldDeliveryCharges);
							userUpdate = ' UPDATE `'+appConst.tablePrefix+'user_info` SET `UsrFreezAmount` = UsrFreezAmount + '+freezAmt+' WHERE `UsrDeleteStatus` = "0" AND `UsrStatus` = "Active" AND `UsrId` = "'+dbResult[0].OrderCustomerId+'" ';
							appDB.getConn(userUpdate,function(Err,discResult){
								if(Err) console.log("Cash",Err); 
							});
						}else if( dbResult[0].OrderPaymentMethod === "Wallet"){
							var newTemp = 0;
							newTemp = parseFloat(dbResult[0].oldOrderTotalAmount) - parseFloat(dbResult[0].totalAmount)  - parseFloat(dCharges) + parseFloat(dbResult[0].oldDeliveryCharges)  ;
							var userUpdate = ' UPDATE `'+appConst.tablePrefix+'user_info` SET `UsrWalletBalance` = UsrWalletBalance+ '+newTemp+' WHERE `UsrDeleteStatus` = "0" AND `UsrStatus` = "Active" AND `UsrId` = "'+dbResult[0].OrderCustomerId+'" ';
							appDB.getConn(userUpdate,function(Err,discResult){
								if(Err)  console.log("Wallet",Err); 
							});
						}
						var mOrder = new order();
						mOrder.updateCustomerOrderList(dbResult[0].OrderCustomerId,data.OrderID,data.SUserId);
						callback(null, "success");	
				   }]
				}, function(err, results) {
					if(err){
						//console.log('err = ', err);
						if(err === 1)
							return cb({"success":0 ,"error": err,"msg": appConst.recordNotFound});
						else if(err === 2)
							return cb({"success":0 ,"error": err,"msg": appConst.customerNotSufficientBalance});
					}else{
						//console.log('results = ', results);	
						return cb({"success":1 ,"error": err,"msg": appConst.recordUpdatedSuccessfully});
					}
				});
		},//doneOrderCheckItem
		customerOrderItemList: function(data, cb) {//get customer order list item by order id
			//orderId
			if(data.orderId !== "" || data.orderId !== null){
				var sql = 'SELECT  OrderPaymentMethod,ItemCustomerQuantity,OrderCustomerId,ItemProductImage,id,ProductSMId,OrderId,OrderDeliveryAddress,OrderTax,ItemChecked,OrderDiscount, ItemProductId, ItemCashBackPercent, ItemProductName,ItemPrice,ItemOriginalPrice,ItemDiscount,ItemDiscountAmount, ItemPrice, ItemQuantity,OrderTotalAmount,OrderDeliveryCharges,ItemStatus,ItemOrderType,ProductSuperMarketCatId'
					+' FROM '+appConst.tablePrefix+'orders'
					+' JOIN '+appConst.tablePrefix+'order_items ON  '+appConst.tablePrefix+'orders.OrderId = '+appConst.tablePrefix+'order_items.ItemOrderId AND ItemDeleteStatus="0" '
					+' JOIN '+appConst.tablePrefix+'product ON '+appConst.tablePrefix+'product.ProductId ='+appConst.tablePrefix+'order_items.ItemProductId'
					+' JOIN '+appConst.tablePrefix+'master_products ON '+appConst.tablePrefix+'master_products.MProductId ='+appConst.tablePrefix+'product.ProductMId'
					+' WHERE OrderId="'+data.orderId+'" AND OrderDeleteStatus="0" ORDER BY ItemOrderType="New" DESC,ItemOrderType="Replace" DESC,ItemOrderType="Added" DESC ';

				appDB.getConn(sql,function(Err,discResult){

					if(!Err && discResult.length > 0){
						//console.log(discResult);
						var sqlResult = {'newcount':0,'replacecount':0,'addedcount':0,'OrderDetails': {}};
						sqlResult.ProductNew = [];
						sqlResult.ProductReplace = [];
						sqlResult.ProductAdded = [];

						var orderDetails = sqlResult.OrderDetails;
						for(var int = 0 in discResult){
							var productNew = new Object();	
							var productReplace = new Object(); 
							var productAdded = new Object();

							orderDetails.DeliveryAddress = discResult[int].OrderDeliveryAddress;
							orderDetails.MktUsrId = discResult[int].ProductSMId;
							orderDetails.Amount = parseFloat(discResult[int].OrderTotalAmount).toFixed(2);
							orderDetails.DeliveryCharges = discResult[int].OrderDeliveryCharges;
							orderDetails.TotalAmount = parseFloat( parseFloat(discResult[int].OrderTotalAmount) + parseFloat(discResult[int].OrderDeliveryCharges) ).toFixed(2);
							orderDetails.PaymentMethodType =  discResult[int].OrderPaymentMethod;

							if(String(discResult[int].ItemOrderType) === "New"){
								productNew.ItemId = discResult[int].id; 
								productNew.ProductName = discResult[int].ItemProductName;
								productNew.Quantity = discResult[int].ItemQuantity;
								productNew.Price = parseFloat(discResult[int].ItemPrice).toFixed(2) ;
								productNew.ItemChecked = discResult[int].ItemChecked;
								productNew.ProductImage = discResult[int].ItemProductImage;//ImgName;
								productNew.ItemOrderType = discResult[int].ItemOrderType;
								productNew.Cashback =  (discResult[int].ItemCashBackPercent === null) ? 0 : discResult[int].ItemCashBackPercent;
								productNew.CategoryId = discResult[int].ProductSuperMarketCatId;
								productNew.ProductId = discResult[int].ItemProductId;
								productNew.OriginalPrice = discResult[int].ItemOriginalPrice;
								productNew.discountAmount = discResult[int].ItemDiscountAmount;
								productNew.discountPercentage = discResult[int].ItemDiscount;
								productNew.ItemCustomerQuantity = discResult[int].ItemCustomerQuantity;

								sqlResult.ProductNew.push(productNew);
								sqlResult.newcount = sqlResult.newcount+1;
							}else if(String(discResult[int].ItemOrderType) === "Replace"){
								productReplace.ItemId = discResult[int].id; 
								productReplace.ProductName = discResult[int].ItemProductName;
								productReplace.Quantity = discResult[int].ItemQuantity;
								productReplace.Price = parseFloat(discResult[int].ItemPrice).toFixed(2);
								productReplace.ItemChecked = discResult[int].ItemChecked;
								productReplace.ProductImage = discResult[int].ItemProductImage;//ImgName;
								productReplace.ItemOrderType = discResult[int].ItemOrderType;
								productReplace.Cashback =  (discResult[int].ItemCashBackPercent === null) ? 0 : discResult[int].ItemCashBackPercent;
								productReplace.CategoryId = discResult[int].ProductSuperMarketCatId;
								productReplace.ProductId = discResult[int].ItemProductId;
								productReplace.OriginalPrice = discResult[int].ItemOriginalPrice;
								productReplace.discountAmount = discResult[int].ItemDiscountAmount;
								productReplace.discountPercentage = discResult[int].ItemDiscount;
								productReplace.ItemCustomerQuantity = discResult[int].ItemCustomerQuantity;

								sqlResult.ProductReplace.push(productReplace);
								sqlResult.replacecount = sqlResult.replacecount+1; 
							}else if(String(discResult[int].ItemOrderType) === "Added"){
								productAdded.ItemId = discResult[int].id; 
								productAdded.ProductName = discResult[int].ItemProductName;
								productAdded.Quantity = discResult[int].ItemQuantity;
								productAdded.Price = parseFloat(discResult[int].ItemPrice).toFixed(2);
								productAdded.ItemChecked = discResult[int].ItemChecked;
								productAdded.ProductImage = discResult[int].ItemProductImage;//ImgName;
								productAdded.ItemOrderType = discResult[int].ItemOrderType;
								productAdded.Cashback =  (discResult[int].ItemCashBackPercent === null) ? 0 : discResult[int].ItemCashBackPercent;
								productAdded.CategoryId = discResult[int].ProductSuperMarketCatId;
								productAdded.ProductId = discResult[int].ItemProductId;
								productAdded.OriginalPrice = discResult[int].ItemOriginalPrice;
								productAdded.discountAmount = discResult[int].ItemDiscountAmount;
								productAdded.discountPercentage = discResult[int].ItemDiscount;
								productAdded.ItemCustomerQuantity = discResult[int].ItemCustomerQuantity;

								sqlResult.ProductAdded.push(productAdded);
								sqlResult.addedcount = sqlResult.addedcount+1;
							}
						}//for
						return cb({"success":1,"msg": appConst.recordFound , "result":sqlResult ,"error":0});
					}else{ 
						console.log(Err);
						return cb({"success":0,"msg": appConst.recordNotFound, "result":"[]" ,"error":Err});
					}
				});
			}else{
				return cb({"success":0,"msg": appConst.invalidParameters , "result":[] ,"error":0});
			}
		},//customerOrderItemList
		/***********************************customer refund***************************************************/
		customerRefunedItemOrderList: function(data, cb) {
			//orderId
			var refundSql='SELECT id,ItemProductRefundable,ItemProductRefundDays,OrderId, ItemCashBackPercent,ItemChecked,ItemPrice,ItemOriginalPrice,ItemDiscount,ItemDiscountAmount, ItemProductId, ItemProductName, ItemQuantity,OrderTotalAmount,ImgName,ItemRefundId,ItemOrderId,OrderCustomerId,OrderRequestDate,OrderCreateDate,OrdeliveryDate'
				+' FROM '+appConst.tablePrefix+'orders'
				+' JOIN '+appConst.tablePrefix+'order_items ON '+appConst.tablePrefix+'order_items.ItemOrderId = '+appConst.tablePrefix+'orders.OrderId AND ItemStatus ="2" '
				+' JOIN '+appConst.tablePrefix+'product ON '+appConst.tablePrefix+'product.ProductId ='+appConst.tablePrefix+'order_items.ItemProductId'
				+' JOIN '+appConst.tablePrefix+'master_products ON '+appConst.tablePrefix+'master_products.MProductId ='+appConst.tablePrefix+'product.ProductMId'
				+' JOIN '+appConst.tablePrefix+'refund_order  ON '+appConst.tablePrefix+'orders.OrderId = '+appConst.tablePrefix+'refund_order.RefundOrderId AND RefundRequestStatus="0" '
				+' LEFT JOIN '+appConst.tablePrefix+'product_images ON '+appConst.tablePrefix+'product_images.ImgProductId ='+appConst.tablePrefix+'master_products.MProductId AND ImageStatus="1" '
				//+' LEFT JOIN '+appConst.tablePrefix+'cashback ON '+appConst.tablePrefix+'cashback.CashBackProductId ='+appConst.tablePrefix+'product.ProductId'
				+' WHERE OrderId=" '+data.orderId+' " ';

			appDB.getConn(refundSql,function(Err,result){
				if(!Err && result.length > 0){
					var refundList = [],
					returnRemainingDays = 0,
					remainingDays = 0,
					TotalAmount = result[0].OrderTotalAmount,
					orderCreateDate = result[0].OrderCreateDate; 

					for(var int in result){
						var newResult = new Object();
						var newResult = new Object();
						newResult.ItemRefundId = result[int].ItemRefundId;
						newResult.ItemChecked = result[int].ItemChecked;
						newResult.ItemProductName = result[int].ItemProductName;
						newResult.ItemProductId = result[int].ItemProductId;
						newResult.ItemQuantity = result[int].ItemQuantity;
						newResult.ItemPrice = parseFloat((parseFloat(result[int].ItemQuantity)) * parseFloat(result[int].ItemPrice) ).toFixed(2); 
						newResult.ItemProductImage = result[int].ImgName;
						newResult.RefundDays = result[int].ItemProductRefundDays;//+ ' days ' ;
						//newResult.RemainingDays = returnRemainingDays;
						newResult.Cashback =  (result[int].ItemCashBackPercent === null) ? 0 : result[int].ItemCashBackPercent; //  parseInt(result[int].CashBackPercent);
						newResult.RefundStatus = parseInt(result[int].ItemProductRefundable);
						newResult.ItemId = result[int].id;

						newResult.orderCreateDate = moment(result[int].OrderCreateDate).format('YYYY-MM-DD');
						newResult.toDayDate = moment(new Date()).format('YYYY-MM-DD');
						refundList.push(newResult);
					}
					cb({"success":1,"msg":  appConst.recordFound  ,"result":refundList,"error":Err,"totalamount":TotalAmount,"date":moment(orderCreateDate).format('YYYY-MM-DD')});
				}else{
					cb({"success":0,"msg":  appConst.recordNotFound  ,"result":[],"error":Err})
				}
			});
		},//customerRefunedItemOrderList

		customerRemainingItemOrderList: function(data, cb) {
			var refundSql = 'SELECT id,ItemStatus,ItemProductRefundable,OrdeliveryDate,ItemCashBackPercent,ItemProductRefundDays,OrderId,ItemChecked,ItemPrice,ItemOriginalPrice,ItemDiscount,ItemDiscountAmount, ItemProductId, ItemProductName, ItemQuantity,OrderTotalAmount,ImgName,ItemRefundId,ItemOrderId,OrderCustomerId,OrderRequestDate,OrderCreateDate,OrdeliveryDate'
				+' FROM '+appConst.tablePrefix+'orders'
				+' JOIN '+appConst.tablePrefix+'order_items ON '+appConst.tablePrefix+'order_items.ItemOrderId = '+appConst.tablePrefix+'orders.OrderId ' 
				+' JOIN '+appConst.tablePrefix+'product ON '+appConst.tablePrefix+'product.ProductId ='+appConst.tablePrefix+'order_items.ItemProductId' 
				+' JOIN '+appConst.tablePrefix+'master_products ON '+appConst.tablePrefix+'master_products.MProductId ='+appConst.tablePrefix+'product.ProductMId' 
				+' LEFT JOIN '+appConst.tablePrefix+'product_images ON '+appConst.tablePrefix+'product_images.ImgProductId ='+appConst.tablePrefix+'master_products.MProductId AND ImageStatus="1" ' 
				//+' LEFT JOIN '+appConst.tablePrefix+'cashback ON '+appConst.tablePrefix+'cashback.CashBackProductId ='+appConst.tablePrefix+'product.ProductId' 
				+' WHERE OrderId=" '+data.orderId+' "  ';

			appDB.getConn(refundSql,function(Err,result){
				if(!Err && result.length > 0){
					var refundList = [],
					returnRemainingDays = 0,
					remainingDays = 0,
					TotalAmount = result[0].OrderTotalAmount,
					orderCreateDate = result[0].OrderCreateDate; 
					for(var int in result){
						var newResult = new Object();
						newResult.ItemRefundId = result[int].ItemRefundId;
						newResult.ItemChecked = result[int].ItemChecked;
						newResult.ItemProductName = result[int].ItemProductName;
						newResult.ItemProductId = result[int].ItemProductId;
						newResult.ItemQuantity = result[int].ItemQuantity;
						newResult.ItemPrice = parseFloat((parseFloat(result[int].ItemQuantity))* parseFloat(result[int].ItemPrice) ).toFixed(2); // (int)$val['ItemQuantity']*$val['ItemPrice'],
						newResult.ItemProductImage = result[int].ImgName;
						newResult.RefundDays = result[int].ItemProductRefundDays;//+ ' days ' ;
						//	newResult.RemainingDays = returnRemainingDays;
						newResult.Cashback = (result[int].ItemCashBackPercent === null) ? 0 : result[int].ItemCashBackPercent;//parseInt(result[int].CashBackPercent);
						newResult.RefundStatus = parseInt(result[int].ItemProductRefundable);
						newResult.ItemId = result[int].id;
						newResult.ItemStatus = result[int].ItemStatus;
						newResult.ordeliveryDate = moment(result[int].ordeliveryDate).format('YYYY-MM-DD'); 

						newResult.orderCreateDate = moment(result[int].OrderCreateDate).format('YYYY-MM-DD');
						newResult.toDayDate = moment(new Date()).format('YYYY-MM-DD');
						refundList.push(newResult);
					}
					cb({"success":1,"msg": appConst.recordFound,"result":refundList,"error":Err,"totalamount":TotalAmount,"date":moment(orderCreateDate).format('YYYY-MM-DD')});
				}else{
					cb({"success":0,"msg":appConst.recordNotFound,"result":[],"error":Err})
				}
			});
		},//customerRemainingItemOrderList

		approveRefundRequest: function(data, cb) {//Perform by customer when it approve the refund order items.
			//params: orderId, shopId, dBoyId,customerId; 
			/*var sql = 'SELECT `RefundId` FROM (`'+appConst.tablePrefix+'refund_order`) WHERE `RefundOrderId` = '+data.orderId+' ';*/
			var sqlUpdateOrderItem = '';
			var sqlUpdate = '';
			if(data.itemId === ""){
				sqlUpdateOrderItem = 'UPDATE `'+appConst.tablePrefix+'order_items` SET `ItemStatus`="0" WHERE `ItemOrderId`="'+data.orderId+'" ';
				
				sqlUpdate='UPDATE `'+appConst.tablePrefix+'refund_order` SET  `RefundStatus` = "1", `RefundRequestStatus` = "2" WHERE `RefundOrderId` = "'+data.orderId+'" ';
			}else{
				sqlUpdateOrderItem = 'UPDATE `'+appConst.tablePrefix+'order_items` SET `ItemStatus`= CASE WHEN id IN ('+data.itemId+') THEN "3" WHEN ItemStatus != "3" AND `id` NOT IN ('+data.itemId+') THEN "0" WHEN ItemStatus = "3" THEN "3" END WHERE `ItemOrderId`="'+data.orderId+'" AND ItemProductRefundable ="1" ';
				
				sqlUpdate='UPDATE `'+appConst.tablePrefix+'refund_order` SET  `RefundStatus` = "1", `RefundRequestStatus` = "1" WHERE `RefundOrderId` = "'+data.orderId+'" ';
			}
			
			var sqlQuery = 'SELECT id,ItemPrice,OrderCustomerId,ItemOriginalPrice,ItemQuantity,OrderTotalAmount ,SUM(ItemPrice * ItemQuantity) AS totalAmount FROM '+appConst.tablePrefix+'order_items'
	    	+' JOIN '+appConst.tablePrefix+'orders ON  '+appConst.tablePrefix+'order_items.ItemOrderId= '+appConst.tablePrefix+'orders.OrderId AND OrderDeleteStatus="0" '
	    	+' WHERE ItemStatus="3" AND ItemSuperMarketId='+data.shopId+' AND ItemOrderId = "'+data.orderId+'"  AND ItemDeleteStatus="0" ';
			
			appDB.getConn(sqlUpdate, function(Er,updt){
				if(!Er){
					appDB.getConn(sqlUpdateOrderItem, function(Err,row){
						if(!Err){
							appDB.getConn(sqlQuery, function(Edsr,dd){
								if(!Edsr && dd.length > 0){
									var sqlOrderupdate = 'UPDATE `'+appConst.tablePrefix+'orders` SET `OrderRefundAmount`='+dd[0].totalAmount+' WHERE `ItemOrderId`="'+data.orderId+'" ';
									appDB.getConn(sqlOrderupdate, function(Edsr,dd){});
								}
							});
							var key = data.dBoyId+'_dBoy';			//customer,superMrkt,dBoy
							if(ls.get(key) !== null){
								io.to(key).emit("updateDeliveryOrderList",{"success": 1, "msg": "ui update.","orderId":data.orderId,"btnStatus":true });
							}
							cb({"success": 1,"msg": appConst.orderApproveSuccessfully ,"error":Err});
						}else{
							cb({"success": 0,"msg": appConst.orderNotApproveSuccessfully ,"error":Err});
						}
					});	
				}else{
					cb({"success": 0,"msg": appConst.orderNotApproveSuccessfully,"error":Er});
				}
			});	
		},//approveRefundRequest

		customerOrderItemRemove: function(data,cb) {//used by customer for removing order items
			//params: orderId, customerId,itemId,
			//console.log(data);
			var self = this,
			 userInfo =  new Object(),
			 itemInfo =  new Object(),
			 walletAmount = 0,
			oldDeliveryCharges = 0.0;
			
			async.series({
				getUserInfo: function(callback){
					var getSql = 'SELECT `UsrId`, `UsrFreezAmount`, `UsrWalletBalance` FROM (`'+appConst.tablePrefix+'user_info`) WHERE `UsrDeleteStatus` = "0" AND `UsrStatus` = "Active" AND `UsrId` = '+data.customerId+' ';
					appDB.getConn(getSql, function(Err,result){
						if(!Err && result.length > 0){
							userInfo = result[0];
							callback(null,1);
						}else{
							callback(Err,null);
						}
					});
				},//getUserInfo
				getInfo: function(callback){
					var getSql = 'SELECT `MktTrackStock`,ItemQuantity,OrderShopId, `MktUsrPayByVeriOrder`, `MktUsrSmName`, `OrderPaymentMethod`, `OrderId`, `ItemPrice`, `ItemOriginalPrice`, `ItemDiscount`, `OrderShopId`, `OrderTotalAmount`, `OrderActualTotal`, `OrderDeliveryCharges`, `OrderDiscount` FROM (`'+appConst.tablePrefix+'orders`) JOIN `'+appConst.tablePrefix+'market_user_info` ON `'+appConst.tablePrefix+'orders`.`OrderShopId`=`'+appConst.tablePrefix+'market_user_info`.`MktUsrId` AND MktUsrDeleteStatus="0" AND MktUsrAdminStatus="Active" JOIN `'+appConst.tablePrefix+'order_items` ON `'+appConst.tablePrefix+'order_items`.`ItemOrderId`=`'+appConst.tablePrefix+'orders`.`OrderId` AND ItemChecked="1" AND ItemDeleteStatus="0" WHERE `OrderId` = '+data.orderId+' AND  `OrderDeleteStatus` = "0" AND `id` = '+data.itemId+' ';

					appDB.getConn(getSql, function(Err,result){
						if(!Err){
							if(result.length > 0){
								itemInfo = result[0];
								itemInfo.ItemPrice = parseFloat(itemInfo.ItemPrice) *  parseFloat(itemInfo.ItemQuantity);
								oldDeliveryCharges =result[0].OrderDeliveryCharges;
								callback(null,1);
							}else{//delete uncheck item only
								itemInfo = null;
								var updateOrderItem = ' UPDATE `'+appConst.tablePrefix+'order_items` SET `ItemDeleteStatus` = "1" WHERE `id` = "'+data.itemId+'" ';	
								appDB.getConn(updateOrderItem, function(Esr,sds){});
								callback(2,null); // update delete status and exit.
							}
						}else{
							itemInfo = null;
							callback(Err,null);
						}
					});
				},//getInfo
				getDeliveryCharges: function(callback) {
					if(itemInfo !== null){
						var updateOrderItem = ' UPDATE `'+appConst.tablePrefix+'order_items` SET `ItemDeleteStatus` = "1" WHERE `id` = "'+data.itemId+'" ';
						appDB.getConn(updateOrderItem, function(Err,result){
							if(!Err){
								self.getDeliveryChargesNew(data,function(dCharge){
								//self.getDeliveryCharges(data,function(dCharge){
								//	console.log("dCharge",dCharge);
									itemInfo.deliveryCharges = dCharge;
									callback(null,1);
								});
							}else{
								callback(1,null);
							}
						});
					}else{
						callback(1,null);
					}
				},//getDeliveryCharges
				updateUserInfo : function(callback) {
					var userUpdate = '';
					var updateOrder = '';
					var tm = parseFloat(itemInfo.OrderTotalAmount) - (parseFloat(itemInfo.ItemPrice) * parseFloat(itemInfo.ItemQuantity) );
					var at = parseFloat(itemInfo.OrderActualTotal) -  parseFloat(itemInfo.ItemOriginalPrice);
					var od = parseFloat(itemInfo.OrderDiscount) -  parseFloat(itemInfo.ItemDiscount);
					walletAmount = parseFloat(tm) + parseFloat(parseFloat(itemInfo.deliveryCharges.deliveryCharges));
					if((itemInfo.OrderPaymentMethod === "Cash" && parseInt(itemInfo.MktUsrPayByVeriOrder) === 1) || itemInfo.OrderPaymentMethod === "Wallet"){
						var temp = parseFloat(userInfo.UsrFreezAmount) -  parseFloat(itemInfo.ItemPrice);
							var freezAmt = 0;//parseFloat(tm) + parseFloat(itemInfo.deliveryCharges.deliveryCharges);
						
							if(parseFloat(itemInfo.deliveryCharges.deliveryCharges) > parseFloat(oldDeliveryCharges) )
								freezAmt =  (parseFloat(itemInfo.ItemPrice) - parseFloat(itemInfo.deliveryCharges.deliveryCharges) +  parseFloat(oldDeliveryCharges) );
							else
								freezAmt =  (parseFloat(itemInfo.ItemPrice) + parseFloat(itemInfo.deliveryCharges.deliveryCharges) - parseFloat(oldDeliveryCharges) );
							
							
							//if user delete last item only
							//if(parseFloat(itemInfo.deliveryCharges.totalAmount) === 0) freezAmt = parseFloat(itemInfo.ItemPrice) + parseFloat(itemInfo.deliveryCharges.deliveryCharges); 
							
							userUpdate = ' UPDATE `'+appConst.tablePrefix+'user_info` SET `UsrFreezAmount` = UsrFreezAmount - '+freezAmt+' WHERE `UsrDeleteStatus` = "0" AND `UsrStatus` = "Active" AND `UsrId` = "'+data.customerId+'" ';
						//userUpdate = ' UPDATE `'+appConst.tablePrefix+'user_info` SET `UsrFreezAmount` = "'+temp+'" WHERE `UsrDeleteStatus` = "0" AND `UsrStatus` = "Active" AND `UsrId` = "'+data.customerId+'" ';
					}else if( itemInfo.OrderPaymentMethod === "Wallet"){ 
						/*var temp = 0;
						if( parseFloat(itemInfo.deliveryCharges.deliveryCharges) > parseFloat(oldDeliveryCharges))
							temp =parseFloat(userInfo.UsrWalletBalance) + ( parseFloat(itemInfo.ItemPrice)*(parseFloat(itemInfo.ItemQuantity)) )  + parseFloat(oldDeliveryCharges) - parseFloat(itemInfo.deliveryCharges.deliveryCharges) ;
						else
							temp = parseFloat(userInfo.UsrWalletBalance) + ( parseFloat(itemInfo.ItemPrice)*(parseFloat(itemInfo.ItemQuantity)) ) +  parseFloat(itemInfo.deliveryCharges.deliveryCharges) - parseFloat(oldDeliveryCharges)  ;
						
						//if user delete last item only
						if(parseFloat(itemInfo.deliveryCharges.totalAmount) === 0) temp = parseFloat(userInfo.UsrWalletBalance) + ( parseFloat(itemInfo.ItemPrice)*(parseFloat(itemInfo.ItemQuantity)) ) +  parseFloat(itemInfo.deliveryCharges.deliveryCharges); 
					
						userUpdate = ' UPDATE `'+appConst.tablePrefix+'user_info` SET `UsrWalletBalance` = "'+temp+'" WHERE `UsrDeleteStatus` = "0" AND `UsrStatus` = "Active" AND `UsrId` = "'+data.customerId+'" ';
*/					}
					updateOrder = ' UPDATE `'+appConst.tablePrefix+'orders` SET `OrderTotalAmount` = " '+tm+' " , `OrderActualTotal` = " '+at+' ", `OrderDiscount` = " '+od+' ", `OrderDeliveryCharges` = " '+itemInfo.deliveryCharges.deliveryCharges+' " WHERE `OrderId` = "'+data.orderId+'" ';
					appDB.getConn(updateOrder, function(Er,res){
						if(!Er){
							if(userUpdate !== ''){
								appDB.getConn(userUpdate, function(er,rest){
									if(!er){
										callback(null,1);
									}else{
										callback(er,null);
									}
								});
							}else{
								callback(null,1);
							}
						}else{
							callback(Er,null);
						}
					});						
					
				},//updateUserInfo
				sendEvent: function(callback) {
					var temp = new Object();
					temp.OrderId = data.orderId;
					var uniqId = itemInfo.OrderShopId+'_superMrkt';
					if(ls.get(uniqId) !== null && data.hasOwnProperty("callBySupermarket") === false){
						io.to(uniqId).emit("updateOrderProductList",temp);
					}
					var calAmt = 'SELECT  ItemQuantity FROM '+appConst.tablePrefix+'order_items WHERE  ItemOrderId = "'+data.orderId+'"  AND ItemDeleteStatus="0" ';	
					appDB.getConn(calAmt,function(Err,discResult){
						if(!Err && discResult.length <= 0){
							var updateStatus = 'UPDATE '+appConst.tablePrefix+'orders SET  OrderShopStatus = "Canceled"  WHERE OrderId = "'+data.orderId+'" ';
							appDB.getConn(updateStatus,function(er,result){
								if(er)console.log(er);	
								console.log("UPDATE orders OrderDeleteStatus=1");
								var freezAmt = parseFloat(itemInfo.deliveryCharges.deliveryCharges) ;
								var userUpdate = ' UPDATE `'+appConst.tablePrefix+'user_info` SET `UsrFreezAmount` = UsrFreezAmount - '+freezAmt+' WHERE `UsrDeleteStatus` = "0" AND `UsrStatus` = "Active" AND `UsrId` = "'+data.customerId+'" ';
								appDB.getConn(userUpdate,function(er,result){	if(err)console.log(err);	});
								
							});
							callback(null, 1);
						}else{
							console.log(Err);
							callback(null, 1);
						}
					});
				},//sendEvent
			/*	updateCustomerWallet: function(callback) {
					if(walletAmount !== 0){
						//if user delete last item only
						if(parseFloat(itemInfo.deliveryCharges.totalAmount) === 0) walletAmount = parseFloat(walletAmount) -  parseFloat(itemInfo.deliveryCharges.deliveryCharges); 
					
						var updateSql = 'UPDATE `'+appConst.tablePrefix+'customer_wallet` SET `WalletAmount`='+walletAmount+' WHERE `WalletOrderId`='+data.orderId+' AND `WalletUsrId`='+data.customerId+'  AND `WalletAmntType`= "5" AND WalletUserType="customeruser" ' ;
						appDB.getConn(updateSql, function(er,rest){
							callback(null,1);
						});
					}else{
						callback(null,1);
					}
				},*///updateCustomerWallet
			},
			function(err, results) {
				if(err === null){
					cb({"success": 1 ,"msg": appConst.ItemDeletedSuccessfully ,"error": err});
				}else if(err === 2){
					cb({"success": 1 ,"msg": appConst.ItemDeletedSuccessfully ,"error": err});
				}else{
					console.log(err);
					cb({"success": 0 ,"msg": appConst.unableToRemoveItem ,"error": err});
				}
			});
		},//customerOrderItemRemove


}//prototype

/**************************************************************************************	
 * 																		DeliveryBoy Socket function
 * 
**************************************************************************************/	
order.prototype.refundRequest = function(data,cb) { // perform by dboy for item refund
	//params: orderId,orderDeliveryBoyId  ,itemId, 
	var self = this,
	orderCustomerId = null,
	orderShopId = null,
	refundId = null;
//console.log(data);
	async.series({
		getInfo: function(callback){
			var sql = 'SELECT `OrderCustomerId`,`OrderShopId` FROM (`'+appConst.tablePrefix+'orders`) WHERE `OrderId` = '+data.orderId+' AND `OrderDeliveryBoyId` = '+data.orderDeliveryBoyId+' ';
			appDB.getConn(sql, function(Err,result){
				if(!Err && result.length > 0){
					orderCustomerId = result[0].OrderCustomerId;
					orderShopId = result[0].OrderShopId;
					callback(null, 1);
				}else{
					callback(Err, null);
				}
			});
		},//getInfo
		insert: function(callback){//check if refundid in refund order table
			var sql = 'SELECT `RefundId` FROM (`'+appConst.tablePrefix+'refund_order`) WHERE `RefundOrderId` = '+data.orderId+' AND `RefundSuperMktId` = '+orderShopId+' AND `RefundRequest` = "0" ';
			appDB.getConn(sql, function(Err, result){
				if(!Err){
					if(result.length === 0){//if not exist then
						var sqlInsert = 'INSERT INTO `'+appConst.tablePrefix+'refund_order` (`RefundOrderId`, `RefundCustomerId`, `RefundSuperMktId`, `RefundDeliveryBoyId`, `RefundBy`, `RefundStatus`, `RefundRequest`, `RefundDate`, `RefundRequestStatus`)'
						+' VALUES ('+data.orderId+', '+orderCustomerId+', '+orderShopId+', '+data.orderDeliveryBoyId+', "2", "0", "0", "'+moment(new Date()).format('YYYY-MM-DD','h:mm:ss')+'", "0")';

						appDB.getConn(sqlInsert, function(Er,res){
							if(!Er){
								refundId = res.insertId;
								var sqlUpdate = 'UPDATE `'+appConst.tablePrefix+'order_items` SET `ItemStatus`="2",`ItemRefundId`='+refundId+' WHERE `ItemOrderId`='+data.orderId+' AND `id` IN ('+data.itemId+')';
								appDB.getConn(sqlUpdate, function(uEr,updt){
									if(!uEr){
										callback(null, 1);
									}else{
										callback(updt, null);
									}
								});
							}else{
								callback(Er, null);
							}
						});
					}else{//if exist
						refundId = result[0].RefundId;
						var sqlUpdate='UPDATE `'+appConst.tablePrefix+'refund_order` SET `RefundOrderId` = '+data.orderId+', `RefundCustomerId` = '+orderCustomerId+', `RefundSuperMktId` = '+orderShopId+', `RefundDeliveryBoyId` = '+data.orderDeliveryBoyId+', `RefundBy` = "2", `RefundStatus` = "0", `RefundRequest` = "0", `RefundDate` = '+moment(new Date()).format('YYYY-MM-DD','h:mm:ss')+', `RefundRequestStatus` = "0" WHERE `RefundOrderId` = '+data.orderId+' ';
						var sqlUpdateOrderItem = 'UPDATE `'+appConst.tablePrefix+'order_items` SET `ItemStatus`="2",`ItemRefundId`='+refundId+' WHERE `ItemOrderId`='+data.orderId+' AND `id` IN ('+data.itemId+')';
						//console.log(sqlUpdate);
						appDB.getConn(sqlUpdate, function(uEr,updt){
							if(!uEr){
								appDB.getConn(sqlUpdateOrderItem, function(Err,row){
									if(!Err){
										callback(null, 1);
									}else{
										callback(Err, null);
									}
								});	
							}else{
								callback(uEr, null);
							}
						});	
					}
				}else{
					callback(Err, null);
				}
			});
		}//insert
	},
	function(err, results) {
		if(err === null){
			var key = orderCustomerId+"_customer";
			//send event to customer for update refund item list in above oreder id.
			io.to(key).emit("updateRefundList",{"orderId": data.orderId,"orderCustomerId":orderCustomerId,"orderShopId":orderShopId,"DelUsrId":data.orderDeliveryBoyId});
			cb({"success": 1, "msg": appConst.refundRequest,"error":err});
			//self.sendNotification({"userId":orderCustomerId,"userType": 1,"userMsgType":"Refund","userTitle": "Refund request.","msg": "You have refund request."});//params: userMsgType,userTitle,msg,userId,userType=0 , 1 , 2
		}else{
			console.log(err)
			cb({"success": 0, "msg": appConst.pleaseSendRefundRequestFirst,"error":err});
		}
	});

};//order.prototype.refundRequest

order.prototype.cancelRefunedOrder = function(data, cb) { //Perform by dboy for cancel refund order item
	//params: orderId,orderDeliveryBoyId  ,itemId, 	
	var self = this,
	orderCustomerId = null,
	orderShopId = null,
	btnStatus = false,
	refundId = null;
	if(data.itemId !== ""  && data.orderDeliveryBoyId !== "" && data.orderId !== ""){
		async.series({
			getInfo: function(callback){
				var sql = 'SELECT `OrderCustomerId`,`OrderShopId` FROM (`'+appConst.tablePrefix+'orders`) WHERE `OrderId` = '+data.orderId+' AND `OrderDeliveryBoyId` = '+data.orderDeliveryBoyId+' ';
				appDB.getConn(sql, function(Err,result){
					if(!Err && result.length > 0){
						orderCustomerId = result[0].OrderCustomerId;
						orderShopId = result[0].OrderShopId;
						callback(null, 1);
					}else{
						callback(Err, null);
					}
				});
			},//getInfo
			update: function(callback){//check if refundid in refund order table
				var sql = 'SELECT `RefundId` FROM (`'+appConst.tablePrefix+'refund_order`) WHERE `RefundOrderId` = '+data.orderId+' AND `RefundSuperMktId` = '+orderShopId+' AND `RefundRequestStatus` = "0" ';
				appDB.getConn(sql, function(Err, result){
					if(!Err && result.length > 0){
						//if exist
						refundId = result[0].RefundId;
						var sqlUpdate='UPDATE `'+appConst.tablePrefix+'refund_order` SET `RefundOrderId` = '+data.orderId+', `RefundCustomerId` = '+orderCustomerId+', `RefundSuperMktId` = '+orderShopId+', `RefundDeliveryBoyId` = '+data.orderDeliveryBoyId+', `RefundBy` = "2", `RefundStatus` = "0", `RefundRequest` = "0", `RefundDate` = '+moment(new Date()).format('YYYY-MM-DD','h:mm:ss')+', `RefundRequestStatus` = "0" WHERE `RefundOrderId` = '+data.orderId+' ';
						var sqlUpdateOrderItem='UPDATE `'+appConst.tablePrefix+'order_items` SET `ItemStatus`="0",`ItemRefundId`='+refundId+' WHERE `ItemOrderId`='+data.orderId+' AND `id` IN ('+data.itemId+')';
						appDB.getConn(sqlUpdate, function(uEr,updt){
							if(!uEr){
								appDB.getConn(sqlUpdateOrderItem, function(Er,row){
									if(!Er){
										callback(null, 1);
									}else{
										callback(Err, null);
									}
								});	
							}else{
								callback(uEr, null);
							}
						});	
					}else{
						callback(1, null);
					}
				});
			},//update
			paymentBtnStatus: function(callback) {
				if(refundId !== null){
					var getSql =  'SELECT id FROM '+appConst.tablePrefix+'order_items WHERE ItemOrderId='+data.orderId+' AND ItemStatus = "2" ';
					appDB.getConn(getSql, function(Err, result){
						if(!Err){
							if(result.length > 0){
								var sql = 'SELECT `RefundId` FROM (`'+appConst.tablePrefix+'refund_order`) WHERE `RefundOrderId` = '+data.orderId+' AND `RefundSuperMktId` = '+orderShopId+' AND `	RefundRequestStatus` = "0" ';
								appDB.getConn(getSql, function(Er, rows){
									if(!Er){
										if(rows.length > 0)
											btnStatus = false;
											callback(null,1);
									}else{
										callback(Er,null);
									}
								})
							}else{
								btnStatus = true;
								var sqlsUpdate='UPDATE `'+appConst.tablePrefix+'refund_order` SET  `RefundBy` = "2", `RefundStatus` = "1",  `RefundRequestStatus` = "2" WHERE `RefundOrderId` = '+data.orderId+' ';
								appDB.getConn(sqlsUpdate, function(Er, rows){
									if(!Er){
										callback(null,1);
									}else{
										callback(Er,null);
									}
								});
							}
						}else{
							callback(Err,null);
						}
					});
				}else{
					callback(1,null);
				}
			}//paymentBtnStatus
		},
		function(err, results) {
			if(err === null){
				var key = orderCustomerId+"_customer";
				//send event to customer for update refund item list in above oreder id.
				//console.log(key);
				io.to(key).emit("updateRefundList",{"orderId": data.orderId,"orderCustomerId":orderCustomerId,"orderShopId":orderShopId,"DelUsrId":data.orderDeliveryBoyId});
				cb({"success": 1, "msg": appConst.refundRequestCanceled,"error":err,"btnStatus": btnStatus});
				//self.sendNotification({"userId":orderCustomerId,"userType": 1,"userMsgType":"Refund","userTitle": "Cancel refund request.","msg": "Refund request canceled by delivery boy."});//params: userMsgType,userTitle,msg,userId,userType=0 , 1 , 2
			}else{
				console.log(err);
				cb({"success": 0, "msg":appConst.pleaseSendRefundRequestFirst ,"error":err,"btnStatus": btnStatus});
			}
		});	
	}else{
		return cb({"success": 0, "msg": appConst.invalidParameters,"error":null,"btnStatus": btnStatus});
	}
};//cancelRefunedOrder

//dboyRefunedItemOrderList
order.prototype.refunedItemOrderList = function(data, cb) { //delivery boy oreder item list
	//orderId
	if(data.hasOwnProperty("orderId") === true && data.orderId !== null && data.orderId !== ""){
		var self = this;		
		var sql = 'SELECT `ProductMId`,orderTipAmount,SubcatRefundPolicy, OrderTipAmount,ItemSuperMarketId, ItemProductImage AS `ImgName`, ItemCashBackPercent, `ItemStatus`, '+appConst.tablePrefix+'order_items.`id`, `ItemOrderId`, `ItemProductId`, `ItemQuantity`, `ItemPrice`, `ItemSubCatId`, `ItemProductName`, `ItemProductRefundDays`, `ItemProductRefundable`, OrderDeliveryBoyId, `OrderDiscount`, `OrderTotalAmount`, `OrderDeliveryCharges`, `ItemChecked`, `OrderDeliveryAddress`, `OrderPaymentMethod`,OrderFeedbackStatus, '
+' (SELECT SUM(ItemProductRefundDays) FROM '+appConst.tablePrefix+'order_items WHERE ItemProductRefundable = 1 AND ItemStatus != "3" AND ItemOrderId = '+data.orderId+')  AS Total '
+' FROM ('+appConst.tablePrefix+'order_items) JOIN '+appConst.tablePrefix+'product ON '+appConst.tablePrefix+'order_items.ItemProductId= '+appConst.tablePrefix+'product.ProductId  JOIN  '+appConst.tablePrefix+'orders ON  '+appConst.tablePrefix+'order_items.ItemOrderId= '+appConst.tablePrefix+'orders.`OrderId` JOIN '+appConst.tablePrefix+'master_products ON '+appConst.tablePrefix+'product.ProductMId= '+appConst.tablePrefix+'master_products.MProductId  JOIN `'+appConst.tablePrefix+'subcategory` ON `'+appConst.tablePrefix+'subcategory`.SubcatId = '+appConst.tablePrefix+'order_items.ItemSubCatId '
+'JOIN '+appConst.tablePrefix+'order_deliveryboy_assign ON '+appConst.tablePrefix+'orders.OrderId = '+appConst.tablePrefix+'order_deliveryboy_assign.OrderId AND  DeliveryboyId = OrderDeliveryBoyId AND AssignType = "0" AND AssignToOther = "0" AND OrderStatus = "active" '
+' WHERE ItemDeleteStatus="0" AND ItemMarketChecked="1"  AND `ItemOrderId` = "'+data.orderId+'"  ORDER BY  '+appConst.tablePrefix+'order_items.id DESC';
		var jsonData = new Object();
		var btnStatus = false;
		var responce = new Object();
		var deliveryCharg = null;
		var orderTipAmount = 0.0;
		async.series({
			getInfo: function(callback){
				appDB.getConn(sql,function(Err,result){
					if(!Err && result.length > 0){
						responce = result;
						orderTipAmount = result[0].orderTipAmount;
						callback(null,1);
					}else{
						console.log(Err);
						callback(1,null);
					}
				});
			},//getInfo
			getDiliveryCharge: function(callback) {
				self.getDeliveryChargesNew(data,function(dCharg){
					deliveryCharg = dCharg;
					callback(null,1);
				})//getDeliveryCharges
			},
			checkApproveStatus: function(callback) {
				var mySql = 'SELECT `RefundId` FROM (`'+appConst.tablePrefix+'refund_order`) WHERE `RefundOrderId` = "'+data.orderId+'" AND `RefundSuperMktId` = "'+responce[0].ItemSuperMarketId+'" AND `RefundRequestStatus` = "0" ';
				appDB.getConn(mySql,function(Er,rows){
					if(!Er && rows.length > 0){
						btnStatus = true;
						callback(null,1);
					}else{
						btnStatus = false;
						callback(null,1);
					}
				});			
			}//checkApproveStatus	
		},function(err, results) {
			if(err === null){
				var Total = (responce[0].Total === null) ? 0 : 1; 
				var totalAmount = (deliveryCharg.totalAmount === null) ? 0 : parseFloat(deliveryCharg.totalAmount).toFixed(2);
				var  grandTotalAmount = parseFloat(deliveryCharg.grandTotalAmount).toFixed(2);				
				var jsonData = {"success":1,"msg":appConst.recordFound,"result":responce,"btnStatus": btnStatus,"error":err,"totalAmount":totalAmount,"deliveryCharges":deliveryCharg.deliveryCharges,"grandTotalAmount": grandTotalAmount,"orderTipAmount": orderTipAmount,"refundButtonStatus":Total };
				return cb(jsonData);
			}else{
				return cb({"success":0,"msg":appConst.recordNotFound,"result":[],"error":err,"btnStatus": btnStatus,"refundButtonStatus": 0});
			}
		});
	}else{
		return cb({"success":0,"msg":appConst.invalidParameters,"result":[]});
	}
},//refunedItemOrderList


order.prototype.tarckDeliverboyLocation = function(data, cb) {
	var sql = 'SELECT DelUsrLatitude, DelUsrLongitude FROM '+appConst.tablePrefix+'delivery_user_info WHERE DelUsrId="'+data.deliverBoyId+'" ';
	appDB.getConn(sql,function(Err,discResult){
		if(!Err){
			cb({"success":1,"msg":appConst.recordFound,"result":discResult[0]});
		}else{
			cb({"success":0,"msg":appConst.recordNotFound,"result":[],"error":Err});
		}
	})
};//tarckDeliverboyLocation

order.prototype.deliveryboyLocationUpdate = function(data, cb) {
	//params: deliverBoyId,latitude and longitude
	var update = 'UPDATE `'+appConst.tablePrefix+'delivery_user_info` SET `DelUsrLatitude` = "'+data.latitude+'" ,  DelUsrLongitude="'+data.longitude+'" WHERE DelUsrId = "'+data.deliverBoyId+'" ';
	appDB.getConn(update,function(Err,discResult){
		if(!Err){
			cb({"success":1,"msg":appConst.recordUpdatedSuccessfully,"error":Err});
		}else{
			cb({"success":0,"msg":appConst.recordNotFound,"error":Err});
		}
	})
};//deliverboyLocationUpdate



/*******************************************************************************
 * 										Global function for calculat delivery charges.
 * 
 ********************************************************************************/
order.prototype.getDeliveryCharges = function(data, cb) {
//params: orderId	
	var deliveryCharges = 0.0;
	var totalAmount = 0.0; //not including deliverCost
	var grandTotalAmount = 0.0; //including deliverCost
	async.series({
		one: function(callback){
			var calAmt = 'SELECT  OrderShopId,OrderDeliveryBoyId, SUM(ItemQuantity * ItemPrice ) AS totalAmount FROM '+appConst.tablePrefix+'order_items JOIN '+appConst.tablePrefix+'orders ON '+appConst.tablePrefix+'order_items.ItemOrderId='+appConst.tablePrefix+'orders.OrderId AND ItemDeleteStatus="0"  WHERE '+appConst.tablePrefix+'orders.OrderId= "'+data.orderId+'"  AND ItemMarketChecked=1 AND ItemOrderId = "'+data.orderId+'"  AND ItemStatus !="2" ';	
			appDB.getConn(calAmt,function(Err,discResult){
				if(!Err){
					console.log("getDeliveryCharges",discResult.length);
					if(discResult.length > 0){
						data.shopUserId = discResult[0].OrderShopId;
						totalAmount = (discResult[0].totalAmount === null) ? 0 : discResult[0].totalAmount;
						callback(null, 1);
					}else{
						var sql = 'SELECT  OrderShopId FROM '+appConst.tablePrefix+'orders  WHERE OrderId= "'+data.orderId+'" ';
						appDB.getConn(sql,function(Er,dResult){
							if(!Er){
								data.shopUserId = dResult[0].OrderShopId;
								callback(null, 1);
								}else{
									callback(1, null);
								}
							});
					}
				}else{
					console.log(Err);
					callback(null, 1);
				}
			});
		},//one
		two: function(callback){
			var discPriceSql = 'SELECT * FROM '+appConst.tablePrefix+'supermarket_setting WHERE SupermrketId="'+data.shopUserId+'" ';
			appDB.getConn(discPriceSql,function(Err,discResult){
				if(!Err && discResult.length > 0){  
					if(discResult[0].MiniOrderStatus === "0"){
						if(discResult[0].NoLimitMinimumOrderStatus === "0"){
							deliveryCharges = 0.0;
						}else{
							deliveryCharges = parseFloat( discResult[0].NoLimitMinimumOrderCharge ).toFixed(2);
						}
						callback(null, 2);
					}else{
						if( parseFloat( discResult[0].MiniOrderCost ) >= parseFloat(totalAmount) ){
							if( discResult[0].LessThenMiniOrderStatus === "0"){
								deliveryCharges = 0.0;
							}else{
								deliveryCharges =parseFloat( discResult[0].LessThenMiniOrderDeliveryCharge).toFixed(2);
							} 
						}else if( parseFloat( discResult[0].MiniOrderCost) <  parseFloat(totalAmount) ){
							if( discResult[0].MoreThenMiniOrderStatus === "0"){
								deliveryCharges = 0.0;
							}else{
								deliveryCharges =parseFloat( discResult[0].MoreThenMiniOrderDeliveryCharge).toFixed(2);
							}
						}
						
						//console.log(" deliveryCharges>>>>>>>>>>>>> : "+deliveryCharges);
						callback(null, 2);
					}
				}else{
					console.log(Err);
					callback(null, 2);
				}
			});//discPriceSql
			
		},//two
		},
	function(err, results) {
		grandTotalAmount = parseFloat(totalAmount) +parseFloat(deliveryCharges);
		//console.log("deliveryCharges> : "+deliveryCharges +" <totalAmount> : "+totalAmount +" grandTotalAmount : "+grandTotalAmount);
		return cb({"success": 1,"error":err,"msg": appConst.recordFound,"totalAmount":totalAmount,"deliveryCharges":deliveryCharges,"grandTotalAmount":grandTotalAmount});
	});
};//getDeliveryCharges

order.prototype.getDeliveryChargesNew = function(data, cb) {
	//params: orderId;
	 var $distanceCharges = 0,
	 $ableToDelivery = false, 
	 $chargesInfo = [],
	 $orderAmount =0 ,
	 itemInfo = [],
	 $deliveryCost = 0;
	  async.auto({
		  itemInfo: function(callback){
			  if(data.hasOwnProperty("totalAmount") === false){
				  var calAmt = 'SELECT  OrderShopId,OrderLat,OrderLong,OrderDeliveryBoyId, SUM(ItemQuantity * ItemPrice ) AS totalAmount FROM '+appConst.tablePrefix+'order_items JOIN '+appConst.tablePrefix+'orders ON '+appConst.tablePrefix+'order_items.ItemOrderId='+appConst.tablePrefix+'orders.OrderId  WHERE '+appConst.tablePrefix+'orders.OrderId= "'+data.orderId+'"  AND ItemMarketChecked="1" AND ItemChecked="1" AND ItemOrderId = "'+data.orderId+'"  AND ItemStatus !="2" AND ItemDeleteStatus="0" ';	
				  appDB.getConn(calAmt,function(Err,discResult){
					  if(!Err && discResult.length > 0){
						  //console.log("discResult[0]",discResult);
						  itemInfo = discResult[0];
						  $orderAmount =itemInfo.totalAmount;
						  callback(null,itemInfo);
					  }else{
						  console.log("getDeliveryChargesNew Err1",Err);
						  callback(1,itemInfo);
					  }
				  });
			  }else{
				  //console.log(data);
				  itemInfo = data;
				  $orderAmount =itemInfo.totalAmount;
				  callback(null,itemInfo);
			  }
		  },
		  storeInfoSql:["itemInfo", function(callback){
			  var storeInfoSql = 'SELECT CoverageAreaRange, OutOfCoverageAreaRange,OutOfCoverageAreaStatus,  MiniOrderStatus, LessThenMiniOrderStatus, LessThenMiniOrderDeliveryCharge, NoLimitMinimumOrderStatus, NoLimitMinimumOrderCharge,OutOfCoveragePerKmCharge, MiniOrderCost, MoreThenMiniOrderStatus, MoreThenMiniOrderDeliveryCharge, round((((acos(sin(('+itemInfo.OrderLat+'*pi()/180)) * sin(('+appConst.tablePrefix+'market_user_info.MktUsrLat*pi()/180))+cos(('+itemInfo.OrderLat+'*pi()/180)) * cos(('+appConst.tablePrefix+'market_user_info.MktUsrLat*pi()/180)) * cos((('+itemInfo.OrderLong+' - '+appConst.tablePrefix+'market_user_info.MktUsrLong)*pi()/180))))*180/pi())*60*1.1515*1.60934),3) AS `Distance`' 
				  +' FROM '+appConst.tablePrefix+'supermarket_setting'
				  +' JOIN '+appConst.tablePrefix+'market_user_info ON MktUsrId = SupermrketId'
				  +' WHERE SupermrketId = '+itemInfo.OrderShopId+' ';
			  appDB.getConn(storeInfoSql,function(Err,info){
				  if(!Err && info.length > 0){  
					  $chargesInfo = info;
					  if(parseFloat($chargesInfo[0]['Distance']) <= parseFloat($chargesInfo[0]['CoverageAreaRange'])){
						  $ableToDelivery = true;
						  callback(null,$ableToDelivery);
					  }else if($chargesInfo[0]['OutOfCoverageAreaStatus'] == "1"){
					    if(parseFloat($chargesInfo[0]['Distance']) <= parseFloat($chargesInfo[0]['CoverageAreaRange']) + parseFloat($chargesInfo[0]['OutOfCoverageAreaRange'])){
						   
						   var $extraDistance = 0;
						   $extraDistance = parseFloat($chargesInfo[0]['Distance']) - parseFloat($chargesInfo[0]['CoverageAreaRange']);
						  
					    $distanceCharges = parseFloat($extraDistance) * parseFloat($chargesInfo[0]['OutOfCoveragePerKmCharge']);
					 //   console.log("$distanceCharges",$distanceCharges);
					    $ableToDelivery = true; 
					    callback(null,$ableToDelivery);
					   }else{
					    $ableToDelivery = false;
					    callback(null,$ableToDelivery);
					   }
					  }else{
					   $ableToDelivery = false;
					   callback(null,$ableToDelivery);
					  }
				  }else{
					  console.log("getDeliveryChargesNew Err",Err);
					  callback(1, null);
				  }
			  });
		  }],
		  make_result:['storeInfoSql',  function(callback,results){
			  if($ableToDelivery == true){
				  if($chargesInfo[0]['MiniOrderStatus'] == '1'){
					  if($orderAmount >= $chargesInfo[0]['MiniOrderCost']){
						  if($chargesInfo[0]['MoreThenMiniOrderStatus'] == 1){
							  $deliveryCost = parseFloat($chargesInfo[0]['MoreThenMiniOrderDeliveryCharge']).toFixed(2);
						  }else{
							  $deliveryCost = 0;
						  }
					  }
					  else{
						  if($chargesInfo[0]['LessThenMiniOrderStatus'] == 1){
							  $deliveryCost = parseFloat($chargesInfo[0]['LessThenMiniOrderDeliveryCharge']).toFixed(2);
						  }else{
							  $deliveryCost = 0;
						  }
					  }
				  }else{
					  if($chargesInfo[0]['NoLimitMinimumOrderStatus'] == '1'){
						  $deliveryCost = parseFloat($chargesInfo[0]['NoLimitMinimumOrderCharge']).toFixed(2);
					  }else{
						  $deliveryCost = 0;
					  }
				  }
				  $deliveryCost = parseFloat($deliveryCost) + parseFloat($distanceCharges);
				  callback(null, $ableToDelivery);
			  }else{
				  //console.log($deliveryCost +" else+ "+ $distanceCharges);
				  callback(null, $ableToDelivery);
			  } 
			  }],
		}, function(err, results) {
			console.log('results = ', results);
			var grandTotalAmount = parseFloat($orderAmount) + parseFloat($deliveryCost);
			if(err === null){
			return cb({"success": 1,"error":err,"msg": appConst.recordFound,"totalAmount":$orderAmount,"deliveryCharges":$deliveryCost,"ableToDelivery":$ableToDelivery,"grandTotalAmount":grandTotalAmount});
			}else{
				return cb({"success": 0,"error":err,"msg":"not","totalAmount":$orderAmount,"deliveryCharges":$deliveryCost,"ableToDelivery":$ableToDelivery,"grandTotalAmount":grandTotalAmount});
			}
		});
	}//getDeliveryChargesNew


order.prototype.sendNotification = function(data) {
	//self.sendNotification({"userId":orderCustomerId,"userType": 1,"userMsgType":"Refund","userTitle": "Refund request.","msg": "You have refund request."});////params: userMsgType,userTitle,msg,userId,userType=0 , 1 , 2
	//params: userMsgType,userTitle,msg,userId,userType=0 , 1 , 2 supermarket,customer,delivery boy
	var sql = '';
	if(parseInt(data.userType) === 0){
		sql = 'SELECT `MktUsrId`,`MktUsrSmName`,`MktUsrProfileImage`,`MktUsrNotificationId`,`MktUsrDeviceType` FROM `tbl_market_user_info` WHERE `MktUsrId`= '+data.userId+' ';
	}else if(parseInt(data.userType) === 1){
		sql = 'SELECT `UsrId`,`UsrFName`,`UsrLName`,`UsrProfileImage`,`UsrDeviceType`,`UsrNotificationId` FROM `tbl_user_info` WHERE `UsrId`= '+data.userId+'';
	}else{
		sql = 'SELECT `DelUsrId`,`DelUsrFName`,`DelUsrLName`,`DelUsrProfileImage`,`DelUsrDeviceType`,`DelUsrNotificationId` FROM `tbl_delivery_user_info` WHERE `DelUsrId` = '+data.userId+'';
	}
	appDB.getConn(sql,function(Err,result){
		//({"type":1,"userType":1,"from":"Ram","title": "sky", "msg":"test","registrationIds": ""});
		if(!Err && result.length > 0){
			var noty = new Object();
			
			noty.userTitle = data.userTitle;
			noty.userMsg = data.msg;
			noty.userMsgType = data.userMsgType;			
			if(parseInt(data.userType) === 0){
			noty.userId = result[0].MktUsrId;
			noty.userName = result[0].MktUsrSmName;
			noty.userImg = result[0].MktUsrProfileImage;
			noty.userType = data.userType;
			noty.device = result[0].MktUsrNotificationId;
			noty.userDeviceType =  (result[0].MktUsrDeviceType === "iPhone") ? 0 : 1;
			}else if(parseInt(data.userType) === 1){
				noty.userId = result[0].UsrId;
				noty.userName = result[0].UsrFName +" "+result[0].UsrLName;
				noty.userImg = result[0].UsrProfileImage;
				noty.userType = data.userType;
				noty.device = result[0].UsrNotificationId;
				noty.userDeviceType =  (result[0].UsrDeviceType === "iPhone") ? 0 : 1;
			}else{
				noty.userId = result[0].DelUsrId;
				noty.userName = result[0].DelUsrFName +" "+ result[0].DelUsrLName;
				noty.userImg = result[0].DelUsrProfileImage;
				noty.userType = data.userType;
				noty.device = result[0].DelUsrNotificationId;
				noty.userDeviceType =  (result[0].DelUsrDeviceType === "iPhone") ? 0 : 1;
			}
			var notification = new NOTIFY();
			if(noty.userDeviceType === 0){
				notification.sendApnNotification(noty);	
			}else{
				notification.sendGcmNotification(noty);
			}			
		}else{
			console.log(Err);
		}
	});
}


var orderApp = new order();
module.exports = orderApp; 

/*demo
 * async.auto({
    get_data: function(callback){
        console.log('in get_data');
        // async code to get some data 
//        callback(null, 'data', 'converted to array');
        callback({"error":"invalid"}, 'data', 'converted to array');
    },
    make_folder:['get_data',  function(callback,results){
        console.log('in make_folder');
        // async code to create a directory to store a file in 
        // this is run at the same time as getting the data 
        callback(null, 'folder');
    }],
    write_file: ['get_data', 'make_folder', function(callback, results){
        console.log('in write_file', JSON.stringify(results));
        // once there is some data and the directory exists, 
        // write the data to a file in the directory 
        callback(null, 'filename');
    }],
    email_link: ['write_file', function(callback, results){
        console.log('in email_link', JSON.stringify(results));
        // once the file is written let's email a link to it... 
        // results.write_file contains the filename returned by write_file. 
        callback(null, {'file':results.write_file, 'email':'user@example.com'});
    }]
}, function(err, results) {
	console.log('results = ', results);
});

 */