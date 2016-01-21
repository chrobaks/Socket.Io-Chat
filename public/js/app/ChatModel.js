function ChatModel (config) {

	config.socketData = {
		message : '',
		username : ''
	};

	config.privateChat = {
		sessionid : '',
		message : '',
		username : ''
	}

	config.dom = {
		chatWrapper : $('#chatWrapper'),
		usernameForm : $('#usernameForm'),
		chatForm : $('#chatForm'),
		privateChatForm : $('#privateChatForm'),
		chatUsername : $('input#chatUsername'),
		chatInput : $('input#chatInput'),
		privateChatInput : $('input#privateChatInput'),
		chatList : $('#chatList'),
		chatUserlist : $('#chatUserlist'),
		chatDialog : $('#chatDialog'),
		privateChatModal : $('#privateChatModal'),
		btnExitChatroom : $('#btnExitChatroom'),
		itemUserlist : $('.userlist','#chatUserlist')
	};

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

		renderChatlist(type, txt, data.timestamp);

	}

	function addToUserlist (data) {

		if (typeof data === 'object') {

			$.each(data, function (key,user) {

				renderUserlist(user);

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
		config.dom.chatInput.val('');

	}

	function setPrivateMessage () {

		config.privateChat.message = getStrFormated(config.dom.privateChatInput.val(), 200);
		config.dom.privateChatInput.val('');

	}

	function setUsername () {

		config.socketData.username = getStrFormated(config.dom.chatUsername.val(), 30);
		config.dom.chatUsername.val('');

	}

	function timestamp (sockettime) {

		sockettime = $.trim(sockettime);

		if( ! sockettime.length) {
			return '';
		}

		var time = new Date(sockettime);
		var h = (time.getHours() < 10) ? '0' + time.getHours() : time.getHours();
		var m = (time.getMinutes() < 10) ? '0' + time.getMinutes() : time.getMinutes();

		return h +':'+m;
	}

	function toggleChatLevel () {

		var showlvl0 = 'block';
		var showlvl1 = 'none';

		if( $('.chatLvl0', config.dom.chatWrapper).css('display') !== 'none') {

			showlvl0 = 'none';
			showlvl1 = 'block';
		}

		$('.chatLvl0', config.dom.chatWrapper).css('display', showlvl0);
		$('.chatLvl1', config.dom.chatWrapper).css('display', showlvl1);
	}

	function renderChatlist (type, txt, time) {

		var spantimestamp = $('<span>').text('[' + timestamp(time) + ']');
		var li = $('<li>',{"class":"chatlist_" + type}).append(spantimestamp, txt);

		config.dom.chatList.append(li);
	}

	function renderUserlist (user) {

		var title = (user.sessionId !== config.socketSessionId) ? 'Open a private chat with this user.' : 'My username';
		var css = (user.sessionId !== config.socketSessionId) ? 'userlist' : 'userlist_self';

		var li = $('<li>',{"class":css, "data-sessid":user.sessionId, "title":title}).text(user.username);
		config.dom.chatUserlist.append(li);

	}

	function renderPrivateChat (username) {

		$('.modal-title', config.dom.privateChatModal).text('Private Chat mit ' + username);
		config.dom.privateChatModal.modal('show');

	}

	function resetChat () {

		config.dom.chatList.empty();
		config.dom.chatUserlist.empty();
		config.socketData.username = '';
	}

	function resetUserlist (userlist) {

		config.dom.chatUserlist.empty();
		addToUserlist(userlist);

	}

	this.addUser = function () {

		setUsername();

		if ( checkUsername() ) {

			if (config.socketIsDisconnected === true) {

				config.socket.connect();

			}

			config.socket.emit('add user', config.socketData.username);

		} else {

			_self.dialog('Keinen Usernamen gefunden');
		}
	};

	this.dialog = function (text) {

		$('.modal-body', config.dom.chatDialog)
			.empty()
			.append($('<p>').text(text));

		config.dom.chatDialog.modal('show');

	};

	this.sendMessage = function () {

		setMessage();

		if ( checkMessage() && checkUsername() ) {

			config.socket.emit('chat message', config.socketData);

		} else {

			_self.dialog('Keine Nachricht gefunden');

		}
	};

	this.sendPrivateMessage = function () {

		setPrivateMessage();

		if ( checkPrivateChat() && checkUsername() ) {

			config.socket.emit('chat private message', config.privateChat);
			config.socketPrivateChatActive = true;

		} else {

			alert('Keine Nachricht gefunden');

		}
	};

	this.initPrivateChat = function (username, sessonid, listener) {

		if ( listener === 'event') {

			if (config.socketSessionId !== '' && config.socketSessionId !== sessonid) {

				config.privateChat.sessionid = sessonid;
				config.privateChat.username = username;
				config.privateChat.message = '';

				renderPrivateChat(username);

			}
		}
	};

	this.socketDisconnect = function () {

		config.socket.disconnect();
		config.socketIsDisconnected = true;
		config.socketSessionId = '';

		resetChat();
		toggleChatLevel();
	};

	this.setLoginAccessData = function (data) {

		config.socketIsDisconnected = false;
		config.socketSessionId = data.sessionId;

		addToUserlist(data.users);
		addToChatlist({timestamp:data.timestamp,username:data.username}, 'user');
		toggleChatLevel();

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

	return this;
}

global.app = global.app || {};
global.app.ChatModel = ChatModel;