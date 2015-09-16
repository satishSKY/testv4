"use strict";
/*
 * File name: mail.js
 *Purpose: Send mails.  
 * Arthur : Satish Kumar Yadav
 * Company: Ideal IT Techno Pvt. Ltd.
 *  Date :15-Sept-2015
 */
const nodemailer = require('nodemailer');

class Mail {
	constructor() {
		console.log("Mail constructor");
	}//constructor
	static sendError(err) {
		let transporter = nodemailer.createTransport();
		transporter.sendMail({
				from: 'satish@idealtechnologys.com',
				to: 'satish@idealtechnologys.com',
				subject: 'Regarding to find error in node app.',
				text: err
			}, function (error, response) {
				if (error) {
					console.log(error);
				} else {
					console.log("Message sent: " , response);
				}
			});
	}//sendError
	static sendCustomMail(args) {
		let transporter = nodemailer.createTransport();
		transporter.sendMail({
			from: args[0],
			to: args[1],
			subject: args[2],
			text: args[3]
		}, function (error, response) {
			if (error) {
				console.log(error);
			} else {
				console.log("Message sent: " , response);
			}
		});
	}//sendCustomMail
}//class

module.exports = Mail;
