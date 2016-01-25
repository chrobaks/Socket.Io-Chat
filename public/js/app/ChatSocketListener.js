

function ChatSocketListener (Model, socket) {

	socket.on('login success', function (data) {

		Model.setLoginSuccess(data);

	});

	socket.on('login error', function () {

		Model.setLoginError('Der Benutzername ist ungültig');

	});

	socket.on('login err#username', function () {

		Model.setLoginError('Der Benutzername wird schon benützt, bitte wähle einen anderen Namen.');

	});

	socket.on('chat message', function (data) {

		Model.socketResponseSetMessage(data);

	});

	socket.on('new user', function (data) {

		Model.socketResponseUserNew(data);
	});

	socket.on('user disconnect', function (data) {

		Model.socketResponseUserDisconnect(data);

	});

	socket.on('user private message invite', function (data) {

		Model.socketResponseUserInvite(data);

	});

	socket.on('user private chat refuse', function(data) {

		Model.socketResponseRefuseUserInvite(data);

	});

	socket.on('user private chat accept', function (data) {

		Model.socketResponseAcceptPrivateChat(data);

	});

	socket.on('user private chat open', function (data) {

		Model.socketResponseOpenPrivateChat(data);

	});

	socket.on('user private chat message', function (data) {

		Model.socketResponseMessagePrivateChat(data);

	});

	socket.on('user private chat disconnect', function (data) {

		Model.socketResponseDisconnectPrivateChat(data);

	});

}

global.app = global.app || {};
global.app.ChatSocketListener = ChatSocketListener;