"use strict";
/*
 * File name: dataBase.js
 *Purpose: Connect and perform database operetion.  
 * Arthur : Satish Kumar Yadav
 * Company: Ideal IT Techno Pvt. Ltd.
 *  Date :15-Sept-2015
 */

var mongodb = require('mongodb'),
	mysql = require('mysql');

class Database {
	constructor() {
		let that = this;
		this.MsgDb = null;
		this.pool = mysql.createPool({
			host: 'localhost',
			user: 'root',
			password: '',
			database: 'test'
		});
		/*mongodb*/
		mongodb.MongoClient.connect("mongodb://localhost:27017/node-v4", function (err, database) {
			if (!err) {
				database.createCollection("messages", {autoIndexId: true} );
				that.MsgDb = database.collection('messages');
				console.log("mongodb Listening on port 27017");
			} else {
				console.log("Mongodb Error: ",err);
			}
		});//initializeMongoDb			
	}
	get dbTable() {
		return this.MsgDb;
	}//dbTable
	
	getConn(query, callBack) {
		this.pool.getConnection(function (err, connection) {
			// Use the connection 
			connection.query(query, function (err, rows) {
				// And done with the connection. 
				connection.release();
				return callBack(err, rows);
				// Don't use the connection here, it has been returned to the pool. 
			});
		});
	}//getConn
	 
	
}//Database class
var appDB = new Database();
module.exports = appDB; //Database;





/*


var appDataBase = function () {

	var that = this;
	
	this.pool = mysql.createPool({
		host: 'localhost',
		user: 'root',
		password: '',//'vmfrh98VHzbHRT3fNhAhXDUvbvnnAtxF',
		database: 'smex_new'

	});

	console.log("Connected to Mysql.");			
	
	mongodb.MongoClient.connect("mongodb://localhost:27017/eShopping", function (err, database) {
		if (!err) {
			that.MsgDb = database.collection('messages');
			that.MsgCounter = database.collection('msgcounters');
			console.log("mongodb Listening on port 27017");

			that.MsgCounter.find({}).toArray(function (err, docs) {
				if (!err && docs.length <= 0) {
					that.MsgCounter.insert({ _id: "msgId", sequence_value: 0 }, { w: 1 }, function (err, objects) {
						if (err) console.warn(err.message);
						//if (!err) console.warn(objects);
					});
				}
			});
		} else {
			console.log(err);
		}
	});//initializeMongoDb			
	return this;
}//appDataBase

appDataBase.prototype.getDbTable = function () {
	return this.MsgDb;
}

appDataBase.prototype.getConn = function (query, callBack) {
	this.pool.getConnection(function (err, connection) {
		// Use the connection 
		connection.query(query, function (err, rows) {
			// And done with the connection. 
			connection.release();
			return callBack(err, rows);
			// Don't use the connection here, it has been returned to the pool. 
		});
	});
}//getConn


appDataBase.prototype.getMsgCountersTbl = function (callBack) {
	try {
		//appDB.localVar.getMsgCounter.remove();
		this.MsgCounter.findAndModify({ _id: "msgId" }, [['_id', 'asc']], { $inc: { sequence_value: 1 } }, { new: true }, function (err, object) {
			if (err) console.warn(err.message);
			else {
				console.dir(object);
				var newobj = object.value;
				console.log("sssss" + newobj.sequence_value);
				callBack(newobj.sequence_value);
			} // undefined if no matching object exists.
		});
	} catch (e) {
		console.warn(e.message);
	}
}//getMsgCountersTbl		



//var appDB = new appDataBase(); 
//module.exports = appDB;
*/






/*
insert(msgObj, cb) {
		let self = this;
		var p1 = new Promise(
			function (resolve, reject) {
				//appDB.localVar.getMsgCounter.remove();
				self.MsgCounter.findAndModify({ _id: "msgId" }, [['_id', 'asc']], { $inc: { sequence_value: 1 } }, { new: true }, function (err, object) {
					if (err) {
						console.warn(err.message);
						console.log("Math: ", Math.round(Math.random() * 100000000));
						resolve(Math.round(Math.random() * 100000000));
					} else {
						var newobj = object.value;
						console.log("sequence_value: " + newobj.sequence_value);
						resolve(newobj.sequence_value);
						//callBack(newobj.sequence_value);
					} // undefined if no matching object exists.
				});
			});
		p1.then(
			function (val) {
				msgObj._id = val;
				self.MsgDb.insert(msgObj, { w: 1 }, function (err, objects) {
					cb(err, objects);
				});
			}).catch(function (err) {
				cb(err, null);
			});




	}//getMsgCountersTbl 
 */