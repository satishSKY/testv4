var app = require('express')(),
	server = require('http').Server(app),
	assert = require("assert"),
	io = require('socket.io-client'),
	request = require('superagent'),
	util = require('util');
	
var socket = io("http://192.168.11.115:3000");
describe('Server Connection', function () {
	
	it('server should be start', function (done) {
		var port = process.env.PORT || 3000;
		server.listen(port, function () {
			util.log('socket.io server listening at %s : ' + port);
			done();
		});
	});	 	
	});

describe('app', function() {
  describe('GET /', function() {
    it('respond with an array of users', function(done) {
		request.get('/').end(function (err, res) {
			//console.log(res);
        assert(res.status == 200);
        done();
      });
    });
  });
});
