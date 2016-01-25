
function ChatController () {

	var config = {
		socket : null,
		dom : null
	};

	var Model = null;
	var ChatSocketListener = null;
	var ChatEventListener = null;

	this.init = function () {

		if (io) {

			config.socket = io();

			Model = new global.app.ChatModel(config);
			ChatSocketListener = new global.app.ChatSocketListener(Model, config.socket);
			ChatEventListener = new global.app.ChatEventListener(Model, config.dom);

		}
	};

	return this;

}

global.app = global.app || {};
global.app.ChatController = new ChatController();