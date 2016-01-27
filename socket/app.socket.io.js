var console = require('console');
var find = require('array.prototype.find');
var filter = require('array-filter');
var io = null;

var socketConfig = {
	users : {},
	rooms : {
		'default' : 'defaultchatroom'
	}
};

function filterPrivateChatRequest (data) {

	if( data.hasOwnProperty('callerSocketId') && typeof data.callerSocketId === 'string' && data.callerSocketId.length ) {

		return !!( data.hasOwnProperty('responseSocketId') && typeof data.responseSocketId === 'string' && data.responseSocketId.length );

	}

	return false;
}

function deleteUser (username) {

	if ( socketConfig.users.hasOwnProperty(username) ) {

		delete socketConfig.users[username];

	}
}

function setUser (socket, username) {

	socket.username = username;

	socketConfig.users[username] = {
		sessionId : socket.id,
		username : username
	};

}


function initSocketChatMessage (socket) {

	socket.on('chat message', function (data) {

		data.timestamp = new Date();

		io.emit('chat message', data);

	});
}

function initSocketDisconnect (socket) {

	socket.on('disconnect', function () {

		if ( typeof socket.username !== 'undefined') {

			deleteUser(socket.username);

			io.emit('user disconnect', {
				timestamp:new Date(),
				username:socket.username,
				users:socketConfig.users
			});

		}
	});
}

function initSocketAddUser (socket) {

	socket.on('add user', function (username) {

		username = username.replace(/\s/g,'');

		if (username.length) {

			if ( ! socketConfig.users.hasOwnProperty(username)) {

				setUser(socket, username);

				socket.emit('login success', {
					timestamp:new Date(),
					username:username,
					sessionId:socket.id,
					users:socketConfig.users
				});

				broadcast(socket, socketConfig.rooms.default, 'new user', {
					username:username,
					sessionId:socket.id
				});

			} else {

				socket.emit('login err#username');

			}
		} else {

			socket.emit('login error');

		}
	});
}

function broadcast (socket, sendTo, emitid, data) {

	data.timestamp = new Date();
	socket.broadcast.to(sendTo).emit(emitid, data);

}

module.exports = function (server) {

	io = require('socket.io')(server);

	io.on('connection', function (socket) {

		socket.join(socketConfig.rooms.default);

		initSocketAddUser(socket);
		initSocketChatMessage(socket);
		initSocketDisconnect(socket);

		socket.on('user private chat inviting', function (data) {

			if ( typeof socket.username !== 'undefined' && filterPrivateChatRequest(data)) {

				var user = {username:socket.username, callerSocketId:data.callerSocketId};

				broadcast(socket, data.responseSocketId, 'user private chat inviting', user);

			}
		});

		socket.on('user private chat refuse', function (data) {

			if ( typeof socket.username !== 'undefined' && filterPrivateChatRequest(data)) {

				broadcast(socket, data.responseSocketId, 'user private chat refuse', data);

			}
		});

		socket.on('user private chat accept', function (data) {

			if ( typeof socket.username !== 'undefined' && filterPrivateChatRequest(data)) {

				broadcast(socket, data.responseSocketId, 'user private chat accept', data);

			}
		});

		socket.on('user private chat open', function (data) {

			if ( typeof socket.username !== 'undefined' && filterPrivateChatRequest(data)) {

				broadcast(socket, data.responseSocketId, 'user private chat open', data);

			}
		});

		socket.on('user private chat message', function (data) {

			if ( typeof socket.username !== 'undefined' && filterPrivateChatRequest(data)) {

				broadcast(socket, data.responseSocketId, 'user private chat message', data);

			}
		});

		socket.on('user private chat disconnect', function (data) {

			if ( typeof socket.username !== 'undefined' && filterPrivateChatRequest(data)) {

				broadcast(socket, data.responseSocketId, 'user private chat disconnect', data);

			}
		});


	});
};
