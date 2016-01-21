function ChatModel (config) {

	config.socketData = {
		message : '',
		username : ''
	};

	config.dom = {
		chatWrapper : $('#chatWrapper'),
		usernameForm : $('#usernameForm'),
		chatForm : $('#chatForm'),
		chatUsername : $('input#chatUsername'),
		chatInput : $('input#chatInput'),
		chatList : $('#chatList'),
		chatUserlist : $('#chatUserlist'),
		chatDialog : $('#chatDialog'),
		btnExitChatroom : $('#btnExitChatroom')
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

		var spantimestamp = $('<span>').text('[' + timestamp(data.timestamp) + ']');
		var li = $('<li>',{"class":"chatlist_" + type}).append(spantimestamp, txt);

		config.dom.chatList.append(li);

	}

	function addToUserlist (data) {

		if (typeof data === 'object') {

			var li = null;

			$.each(data, function (key,user) {

				var li = $('<li>',{"class":"userlist", "data-sessid":user.sessionId}).text(user.username);
				config.dom.chatUserlist.append(li);

			});
		}
	}

	function checkUsername () {
		return (typeof config.socketData.username === 'string' && config.socketData.username.length) ? true : false;
	}

	function checkMessage () {
		return (typeof config.socketData.message === 'string' && config.socketData.message.length) ? true : false;
	}

	function getStrFormated (str, strlen) {

		str = $.trim(str);

		if (str.length > 0 ) {

			if (str.length > strlen ) {
				str = str.substr(0,strlen-1);
			}
		}

		return str;
	}

	function setMessage () {

		config.socketData.message = getStrFormated(config.dom.chatInput.val(), 200);
		config.dom.chatInput.val('');

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

		config.dom.chatDialog.modal.show();

	};

	this.sendMessage = function () {

		setMessage();

		if ( checkMessage() && checkUsername() ) {

			config.socket.emit('chat message', config.socketData);

		} else {

			_self.dialog('Keine Nachricht gefunden');

		}
	};

	this.socketDisconnect = function () {

		config.socket.disconnect();
		config.socketIsDisconnected = true;

		resetChat();
		toggleChatLevel();
	};

	this.setLoginAccessData = function (data) {

		config.socketIsDisconnected = false;

		addToUserlist(data.users);
		addToChatlist({timestamp:data.timestamp,username:data.username}, 'user');
		toggleChatLevel();

	};

	this.socketResponseSetMessage = function () {

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