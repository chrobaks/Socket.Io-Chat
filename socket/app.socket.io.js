var console = require('console');

module.exports = function (server) {

	var io = require('socket.io')(server);

	io.on('connection', function (socket) {

		console.log('a user connected');

		var userIsSet = false;

		socket.on('add user', function (username) {

			username = username.replace(/\s/g,'');

			if (username.length) {

				socket.username = username;
				userIsSet = true;

				socket.emit('login success');
				io.emit('new user', {timestamp:new Date(), username:username});

			} else {
				socket.emit('login error');
			}

		});

		socket.on('chat message', function (data) {
			data.timestamp = new Date();
			io.emit('chat message', data);
		});

		socket.on('disconnect', function () {
			console.log('user disconnected');
		});
	});

};
