var console = require('console');
var find = require('array.prototype.find');
var filter = require('array-filter');

var usernamelist = [];
var userIsSet = false;
var defaultChatroom = 'defaultchatroom';

function resetUsernamelist (username) {

	usernamelist = usernamelist.filter( function (user){

		return user !== username;
	});
}

function setUsernameToList (socket, username) {

	socket.username = username;
	usernamelist.push(username);
	userIsSet = true;
}

module.exports = function (server) {

	var io = require('socket.io')(server);

	io.on('connection', function (socket) {

		socket.join(defaultChatroom);

		socket.on('add user', function (username) {

			username = username.replace(/\s/g,'');

			if (username.length) {

				if ( ! usernamelist.find(function(user){return user === username})) {

					setUsernameToList(socket, username);

					socket.emit('login success', {timestamp:new Date(), username:username, usernamelist:usernamelist});
					socket.broadcast.to(defaultChatroom).emit('new user', {timestamp:new Date(), username:username});

				} else {

					socket.emit('login err#username');

				}

			} else {

				socket.emit('login error');

			}
		});

		socket.on('chat message', function (data) {

			data.timestamp = new Date();
			io.emit('chat message', data);

		});

		socket.on('disconnect', function () {

			resetUsernamelist(socket.username);
			io.emit('user disconnect', {timestamp:new Date(), username:socket.username, usernamelist:usernamelist});

		});
	});

};
