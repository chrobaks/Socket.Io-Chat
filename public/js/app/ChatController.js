
function ChatController () {

	var config = {
		socket : null,
		socketIsDisconnected : true
	};

	var Model = null;

	function eventListener () {

		config.dom.usernameForm.on('submit', function () {

			Model.addUser();

			return false;

		});

		config.dom.chatForm.on('submit', function () {

			Model.sendMessage();

			return false;

		});

		config.dom.btnExitChatroom.on('click', function () {

			Model.socketDisconnect();

		});
	}

	function socketListener () {

		config.socket.on('login success', function (data) {

			Model.setLoginAccessData(data);

		});

		config.socket.on('login error', function () {

			Model.dialog('Der Benutzername ist ungültig');

		});

		config.socket.on('login err#username', function () {

			Model.dialog('Der Benutzername wird schon benützt, bitte wähle einen anderen Namen.');

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
	}

	this.init = function () {

		if (io) {

			config.socket = io();

			Model = new global.app.ChatModel(config);

			eventListener();
			socketListener();
		}
	};

	return this;

}

global.app = global.app || {};
global.app.ChatController = new ChatController();