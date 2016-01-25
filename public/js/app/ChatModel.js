function ChatModel (config) {

	config.socketSessionId = '';
	config.socketIsDisconnected = true;
	config.socketPrivateChatActive = false,
	config.socketPrivateChatStatus = 'closed';


	config.socketData = {
		message : '',
		username : ''
	};

	config.privateChat = {
		callerSocketId : '',
		callerUsername : '',
		responseSocketId : '',
		responseUsername : '',
		message : '',
		timestamp : ''
	};

	var ChatRenderer = new global.app.ChatRenderer(config);
	var privateStatusFilter = ['closed','waiting','open','reqdecision','accept'];
	var _self = this;

	function addToChatlist (data, type) {

		var txt = '';

		switch (type) {
			case('msg'):
				txt = data.username + ' : ' + data.message;
				break;
			case('user'):
				txt = data.username + ' hat den Raum betreten';
				break;
			case('disconnect'):
				txt = data.username + ' hat den Raum verlassen';
				break;
		}

		ChatRenderer.renderChatlist(type, txt, data.timestamp);

	}

	function addToUserlist (data) {

		if (typeof data === 'object') {

			$.each(data, function (key,user) {

				ChatRenderer.renderUserlist(user);

			});
		}
	}

	function checkUsername () {
		return (typeof config.socketData.username === 'string' && config.socketData.username.length) ? true : false;
	}

	function checkMessage () {
		return (typeof config.socketData.message === 'string' && config.socketData.message.length) ? true : false;
	}

	function checkPrivateChat () {

		var res = true;

		$.each(config.privateChat, function (key, value) {

			if ( typeof value !== 'string' || typeof value === 'string' && ! value.length) {

				res = false;
				return res;

			}
		});

		return res;
	}

	function getStrFormated (str, strlen) {

		str = $.trim(str);

		return (str.length > strlen ) ? str.substr(0,strlen-1) : str;
	}

	function setMessage () {

		config.socketData.message = getStrFormated(config.dom.chatInput.val(), 200);
		ChatRenderer.emptyChatInput();

	}

	function setPrivateMessage () {

		config.privateChat.message = getStrFormated(config.dom.privateChatInput.val(), 200);
		ChatRenderer.emptyPrivateChatInput();

	}

	function setUsername () {

		config.socketData.username = getStrFormated(config.dom.chatUsername.val(), 30);
		ChatRenderer.emptyChatUsername();

	}

	function setPrivateChatStatus (statusindex) {

		if (statusindex+1 <= privateStatusFilter.length) {

			config.socketPrivateChatStatus = privateStatusFilter[statusindex];
		}
	}

	function resetChat () {

		ChatRenderer.emptyChatList();
		ChatRenderer.emptyUserList();
		config.socketData.username = '';
	}

	function resetUserlist (userlist) {

		ChatRenderer.emptyUserList();
		addToUserlist(userlist);

	}

	this.addUser = function () {

		setUsername();

		if ( ! checkUsername() ) {

			ChatRenderer.renderDialog({text:'Keinen korrekten Usernamen gefunden'});
			return false;

		}

		if (config.socketIsDisconnected === true) {

			config.socket.connect();

		}

		config.socket.emit('add user', config.socketData.username);

	};

	this.checkPrivateChatStatus = function (status) {
		return ( config.socketPrivateChatActive && config.socketPrivateChatStatus === status ) ? true : false;
	};

	this.sendMessage = function () {

		setMessage();

		if ( checkMessage() && checkUsername() ) {

			config.socket.emit('chat message', config.socketData);

		} else {

			ChatRenderer.renderDialog({text:'Keine Nachricht gefunden'});

		}
	};

	this.sendPrivateMessage = function () {

		if ( config.socketPrivateChatActive ) {

			setPrivateMessage();

			if (checkPrivateChat() && checkUsername()) {

				config.socket.emit('user private chat message', config.privateChat);

				config.privateChat.timestamp = new Date();
				config.privateChat.message = config.privateChat.callerUsername + ' ' + config.privateChat.message;

				ChatRenderer.renderPrivateChatMessage('status');

			}
		}
	};

	this.setPrivateChatRequest = function (username, sessonid) {

		if ( ! config.socketPrivateChatActive ) {

			if (config.socketSessionId !== '' && config.socketSessionId !== sessonid) {

				var txt = [
					'Der User '+username+' wird zum privaten Chat eingeladen, bitte warte auf die Bestätigung.',
					'Wenn du diesen Dialog schließt, dann wird die Einladung zurück gezogen!'
				];

				config.privateChat.callerSocketId = config.socketSessionId;
				config.privateChat.callerUsername = config.socketData.username;
				config.privateChat.responseSocketId = sessonid;
				config.privateChat.responseUsername = username;
				config.privateChat.message = '';
				config.privateChat.timestamp = '';
				config.socketPrivateChatActive = true;

				setPrivateChatStatus(1);

				ChatRenderer.renderDialog({
					title:'Private Chat Anfrage',
					text:txt,
					btntitle:'Abrechen'
				});

				config.socket.emit('user private chat request', config.privateChat);

			}
		}
	};

	this.acceptPrivateChatRequest = function () {

		config.socket.emit('user private chat accept', {
			callerSocketId:config.privateChat.callerSocketId,
			responseSocketId:config.privateChat.responseSocketId
		});

	};

	this.refusePrivateChatRequest = function() {

		config.socket.emit('user private chat refuse', {
			callerSocketId:config.privateChat.callerSocketId,
			responseSocketId:config.privateChat.responseSocketId
		});

		_self.deletePrivateChatRequest();
	};

	this.deletePrivateChatRequest = function () {

		config.privateChat.callerSocketId = '';
		config.privateChat.responseSocketId = '';
		config.privateChat.responseUsername = '';
		config.privateChat.message = '';
		config.privateChat.timestamp = '';
		config.socketPrivateChatActive = false;

		setPrivateChatStatus(0);
	};

	this.disconnectPrivateChat = function () {

		config.socket.emit('user private chat disconnect', {
			callerSocketId:config.privateChat.callerSocketId,
			responseSocketId:config.privateChat.responseSocketId
		});

		_self.deletePrivateChatRequest();
	};

	this.socketDisconnect = function () {

		config.socket.disconnect();
		config.socketIsDisconnected = true;
		config.socketSessionId = '';

		resetChat();
		ChatRenderer.toggleChatLevel();

	};

	this.setLoginSuccess = function (data) {

		config.socketIsDisconnected = false;
		config.socketSessionId = data.sessionId;

		addToUserlist(data.users);
		addToChatlist({timestamp:data.timestamp,username:data.username}, 'user');
		ChatRenderer.toggleChatLevel();

	};

	this.setLoginError = function (error) {

		ChatRenderer.renderDialog({text:error});

	};

	this.socketResponseSetMessage = function (data) {

		if ( ! config.socketIsDisconnected) {

			addToChatlist(data, 'msg');

		}
	};

	this.socketResponseUserNew = function (data) {

		if ( ! config.socketIsDisconnected) {

			addToChatlist({timestamp:data.timestamp,username:data.username}, 'user');
			addToUserlist({"user":{username:data.username,sessionId:data.sessionId}});

		}
	};

	this.socketResponseUserDisconnect = function (data) {

		if ( ! config.socketIsDisconnected) {

			resetUserlist(data.users);
			addToChatlist({timestamp:data.timestamp, username:data.username}, 'disconnect');

		}
	};

	this.socketResponseUserInvite = function (data) {

		var txt = [
			'Der User '+data.username+' möchte dich zum privaten Chat eingeladen.',
			'Wenn du diesen Dialog schließt, dann wird die Einladung abgelehnt!'
		];

		config.privateChat.callerSocketId = config.socketSessionId;
		config.privateChat.callerUsername = config.socketData.username;
		config.privateChat.responseSocketId = data.callerSocketId;
		config.privateChat.responseUsername = data.username;
		config.privateChat.message = '';
		config.privateChat.timestamp = '';
		config.socketPrivateChatActive = true;

		setPrivateChatStatus(3);

		ChatRenderer.renderDialog({
			title:'Einladung zum privaten Chat',
			text:txt, btntitle:'Ablehnen',
			confirm:'accept'
		});
	};

	this.socketResponseRefuseUserInvite = function(data) {

		if (config.socketPrivateChatActive === true && config.privateChat.responseSocketId === data.callerSocketId) {

			ChatRenderer.renderDialogBody('Der User hat die Einladung abgelehnt,');

		}
	};

	this.socketResponseAcceptPrivateChat = function(data) {

		if (config.socketPrivateChatActive === true && config.privateChat.responseSocketId === data.callerSocketId) {

			ChatRenderer.renderDialogBody('Der User hat die Einladung angenommen, bitte warten, NICHT diesen Dialog schliessen!');

			setPrivateChatStatus(4);

			config.socket.emit('user private chat open', {
				callerSocketId : config.privateChat.callerSocketId,
				responseSocketId : config.privateChat.responseSocketId,
				callerUsername : config.privateChat.callerUsername
			});

		}
	};

	this.socketResponseOpenPrivateChat = function (data) {

		config.privateChat.message = config.privateChat.responseUsername + ' hat den Raum betreten';
		config.privateChat.timestamp = data.timestamp;

		setPrivateChatStatus(2);

		ChatRenderer.renderDialog(null);
		ChatRenderer.renderPrivateChat();
		ChatRenderer.renderPrivateChatMessage('status');

		config.socket.emit('user private chat message', {
			callerSocketId : config.privateChat.callerSocketId,
			responseSocketId : config.privateChat.responseSocketId,
			callerUsername : config.privateChat.callerUsername
		});

	};

	this.socketResponseMessagePrivateChat = function (data) {

		var type = 'msg';

		if (config.socketPrivateChatActive === true && config.privateChat.responseSocketId === data.callerSocketId) {

			config.privateChat.message = data.message;
			config.privateChat.timestamp = data.timestamp;

			if (config.socketPrivateChatStatus === 'accept' || config.socketPrivateChatStatus === 'reqdecision') {

				type = 'status';
				config.privateChat.message = config.privateChat.responseUsername + ' hat den Raum betreten';

				ChatRenderer.renderDialog(null);
				ChatRenderer.renderPrivateChat();

			}

			setPrivateChatStatus(2);
			ChatRenderer.renderPrivateChatMessage(type);

		}
	};

	this.socketResponseDisconnectPrivateChat = function (data) {

		if (config.socketPrivateChatActive === true && config.privateChat.responseSocketId === data.callerSocketId) {

			if (config.socketPrivateChatStatus === 'open') {

				config.privateChat.message = config.privateChat.responseUsername + ' hat den Raum verlassen';
				config.privateChat.timestamp = data.timestamp;

				ChatRenderer.renderPrivateChatMessage('status');

			}

			_self.deletePrivateChatRequest();

		}
	};

	return this;
}

global.app = global.app || {};
global.app.ChatModel = ChatModel;