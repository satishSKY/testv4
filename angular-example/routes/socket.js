/*
 * Serve content over a socket
 */

module.exports = function (socket) {
  console.info("!!!!!!!!!!!!!!!");
  socket.emit('send:name', {
    name: 'Bob'
  });
 
 /* setInterval(function () {
    socket.emit('send:time', {
      time: (new Date()).toString()
    });
  }, 1000);*/
};


