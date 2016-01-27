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

	var View = new global.app.ChatView(config);

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

		View.renderChatlist(type, txt, data.timestamp);

	}

	function addToUserlist (data) {

		if (typeof data === 'object') {

			$.each(data, function (key,user) {

				View.renderUserlist(user);

			});
		}
	}

	function filterUsername () {
		return !!(typeof config.socketData.username === 'string' && config.socketData.username.length);
	}

	function filterMessage () {
		return !!(typeof config.socketData.message === 'string' && config.socketData.message.length);
	}

	function filterPrivateResponseStatus (data) {
		return !!(config.socketPrivateChatActive === true && config.privateChat.responseSocketId === data.callerSocketId);
	}

	function filterPrivateChat () {

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
		View.emptyChatInput();

	}

	function setPrivateMessage () {

		config.privateChat.message = getStrFormated(config.dom.privateChatInput.val(), 200);
		View.emptyPrivateChatInput();

	}

	function setUsername () {

		config.socketData.username = getStrFormated(config.dom.chatUsername.val(), 30);
		View.emptyChatUsername();

	}

	function setPrivateChatObject (respSessid, respUsername) {

		if (respSessid !== null && respUsername !== null ){

			config.privateChat = {
				callerSocketId : config.socketSessionId,
				callerUsername : config.socketData.username,
				responseSocketId : respSessid,
				responseUsername : respUsername,
				message : '',
				timestamp : ''
			};

		} else {

			config.privateChat = {
				callerSocketId : '',
				callerUsername : '',
				responseSocketId : '',
				responseUsername : '',
				message : '',
				timestamp : ''
			};
		}
	}

	function deletePrivateChat () {

		config.socketPrivateChatActive = false;

		setPrivateChatObject(null, null);
		setPrivateChatStatus(0);

	}

	function setPrivateChatStatus (statusindex) {

		if (statusindex+1 <= privateStatusFilter.length) {

			config.socketPrivateChatStatus = privateStatusFilter[statusindex];
		}
	}

	function setPrivateChatClientMessage () {

		config.privateChat.timestamp = new Date();
		config.privateChat.message = config.privateChat.callerUsername + ' ' + config.privateChat.message;

		View.renderPrivateChatMessage('status');

	}

	function resetChat () {

		View.emptyChatList();
		View.emptyUserList();
		config.socketData.username = '';

	}

	function resetUserlist (userlist) {

		View.emptyUserList();
		addToUserlist(userlist);

	}

	this.addUser = function () {

		setUsername();

		if ( ! filterUsername() ) {

			View.renderDialog({text:'Keinen korrekten Usernamen gefunden'});
			return false;

		}

		if (config.socketIsDisconnected === true) {

			config.socket.connect();

		}

		config.socket.emit('add user', config.socketData.username);

	};
	this.sendMessage = function () {

		setMessage();

		if ( filterMessage() && filterUsername() ) {

			config.socket.emit('chat message', config.socketData);

		} else {

			View.renderDialog({text:'Keine Nachricht gefunden'});

		}
	};

	this.socketDisconnect = function () {

		config.socket.disconnect();
		config.socketIsDisconnected = true;
		config.socketSessionId = '';

		resetChat();
		View.toggleChatLevel();

	};

	this.socketResponseLoginSuccess = function (data) {

		config.socketIsDisconnected = false;
		config.socketSessionId = data.sessionId;

		addToUserlist(data.users);
		addToChatlist({timestamp:data.timestamp,username:data.username}, 'user');
		View.toggleChatLevel();

	};

	this.socketResponseLoginError = function (error) {

		View.renderDialog({text:error});

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

	this.filterPrivateChatStatus = function (status) {
		return !!( config.socketPrivateChatActive && config.socketPrivateChatStatus === status );
	};

	this.sendPrivateMessage = function () {

		if ( config.socketPrivateChatActive ) {

			setPrivateMessage();

			if (filterPrivateChat() && filterUsername()) {

				config.socket.emit('user private chat message', config.privateChat);
				setPrivateChatClientMessage();

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

				config.socketPrivateChatActive = true;

				setPrivateChatObject(sessonid, username);
				setPrivateChatStatus(1);

				View.renderDialog({
					title:'Private Chat Anfrage',
					text:txt,
					btntitle:'Abrechen'
				});

				config.socket.emit('user private chat inviting', config.privateChat);

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

		deletePrivateChat();
	};

	this.disconnectPrivateChat = function () {

		config.socket.emit('user private chat disconnect', {
			callerSocketId:config.privateChat.callerSocketId,
			responseSocketId:config.privateChat.responseSocketId
		});

		deletePrivateChat();
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

		config.socketPrivateChatActive = true;

		setPrivateChatObject(data.callerSocketId, data.username);
		setPrivateChatStatus(3);

		View.renderDialog({
			title:'Einladung zum privaten Chat',
			text:txt, btntitle:'Ablehnen',
			confirm:'accept'
		});
	};

	this.socketResponseRefuseUserInvite = function(data) {

		if ( filterPrivateResponseStatus(data) ) {

			View.renderDialogBody('Der User hat die Einladung abgelehnt,');

		}
	};

	this.socketResponseAcceptPrivateChat = function(data) {

		if ( filterPrivateResponseStatus(data) ) {

			View.renderDialogBody('Der User hat die Einladung angenommen, bitte warten, NICHT diesen Dialog schliessen!');

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

		View.renderDialog(null);
		View.renderPrivateChat();
		View.renderPrivateChatMessage('status');

		config.socket.emit('user private chat message', {
			callerSocketId : config.privateChat.callerSocketId,
			responseSocketId : config.privateChat.responseSocketId,
			callerUsername : config.privateChat.callerUsername
		});

	};

	this.socketResponseMessagePrivateChat = function (data) {

		var type = 'msg';

		if ( filterPrivateResponseStatus(data) ) {

			config.privateChat.message = data.message;
			config.privateChat.timestamp = data.timestamp;

			if (config.socketPrivateChatStatus === 'accept' || config.socketPrivateChatStatus === 'reqdecision') {

				type = 'status';
				config.privateChat.message = config.privateChat.responseUsername + ' hat den Raum betreten';

				View.renderDialog(null);
				View.renderPrivateChat();

			}

			setPrivateChatStatus(2);
			View.renderPrivateChatMessage(type);

		}
	};

	this.socketResponseDisconnectPrivateChat = function (data) {

		if ( filterPrivateResponseStatus(data) ) {

			if (config.socketPrivateChatStatus === 'open') {

				config.privateChat.message = config.privateChat.responseUsername + ' hat den Raum verlassen';
				config.privateChat.timestamp = data.timestamp;

				View.renderPrivateChatMessage('status');

			} else if (View.dialogIsOpen()) {

				View.dialogDisplayConfirm('none');
				View.renderDialogBody(config.privateChat.responseUsername + ' hat den Raum verlassen');

			}
		}

		deletePrivateChat();

	};

	return this;
}

global.app = global.app || {};
global.app.ChatModel = ChatModel;