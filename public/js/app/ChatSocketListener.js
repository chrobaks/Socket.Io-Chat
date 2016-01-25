

function ChatSocketListener (Model, config) {

	config.socket.on('login success', function (data) {

		Model.setLoginSuccess(data);

	});

	config.socket.on('login error', function () {

		Model.setLoginError('Der Benutzername ist ungültig');

	});

	config.socket.on('login err#username', function () {

		Model.setLoginError('Der Benutzername wird schon benützt, bitte wähle einen anderen Namen.');

	});

	config.socket.on('chat message', function (data) {

		Model.socketResponseSetMessage(data);

	});

	config.socket.on('new user', function (data) {

		Model.socketResponseUserNew(data);
	});

	config.socket.on('user disconnect', function (data) {

		Model.socketResponseUserDisconnect(data);

	});

	config.socket.on('user private message invite', function (data) {

		Model.socketResponseUserInvite(data);

	});

	config.socket.on('user private chat refuse', function(data) {

		Model.socketResponseRefuseUserInvite(data);

	});

	config.socket.on('user private chat accept', function (data) {

		Model.socketResponseAcceptPrivateChat(data);

	});

	config.socket.on('user private chat open', function (data) {

		Model.socketResponseOpenPrivateChat(data);

	});

	config.socket.on('user private chat message', function (data) {

		Model.socketResponseMessagePrivateChat(data);

	});

	config.socket.on('user private chat disconnect', function (data) {

		Model.socketResponseDisconnectPrivateChat(data);

	});

}

global.app = global.app || {};
global.app.ChatSocketListener = ChatSocketListener;