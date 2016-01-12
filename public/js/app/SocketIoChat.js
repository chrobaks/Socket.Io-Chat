function SocketIoChat () {

	var socket = null;

	var socketData = {
		message : '',
		username : ''
	};

	var dom = {
		chatWrapper : $('#chatWrapper'),
		chatForm : $('#chatForm'),
		chatUser : $('input#chatUser'),
		chatInput : $('input#chatInput'),
		chatList : $('#chatList'),
		chatUserlist : $('#chatUserlist'),
		btnLogin : $('#btnLogin'),
		btnExitChatroom : $('#btnExitChatroom')
	};

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

		dom.chatList.append(li);
	}

	function addToUserlist (data) {

		if (typeof data === 'string' && data.length) {

			var li = $('<li>',{"class":"userlist"}).text(data);
			dom.chatUserlist.append(li);

		} else if (typeof data === 'object' && data.hasOwnProperty('length')) {

			data.forEach(function (row) {
				addToUserlist(row);
			});

		}
	}

	function checkUser () {
		return (typeof socketData.username === 'string' && socketData.username.length) ? true : false;
	}

	function checkMessage () {
		socketData.message = $.trim(dom.chatInput.val());
		return (typeof socketData.message === 'string' && socketData.message.length) ? true : false;
	}

	function send () {
		socket.emit('chat message', socketData);
	}

	function setUser () {
		socketData.username = $.trim(dom.chatUser.val());
		dom.chatUser.val('');
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

		if( $('.chatLvl0', dom.chatWrapper).css('display') !== 'none') {

			showlvl0 = 'none';
			showlvl1 = 'block';
		}

		$('.chatLvl0', dom.chatWrapper).css('display', showlvl0);
		$('.chatLvl1', dom.chatWrapper).css('display', showlvl1);
	}

	function resetInput () {
		dom.chatInput.val('');
	}

	function resetChat () {
		dom.chatList.empty();
		dom.chatUserlist.empty();
		socketData.username = '';
	}

	function resetUserlist(userlist) {
		dom.chatUserlist.empty();
		addToUserlist(userlist);
	}

	function eventListener () {

		dom.btnLogin.on('click', function () {

			setUser();

			if ( checkUser() ) {

				socket.emit('add user', socketData.username);

			} else {
				alert('keinen Usernamen gefunden')
			}
		});

		dom.btnExitChatroom.on('click', function () {

			socket.disconnect();
			resetChat();
			toggleChatLevel();

		});

		dom.chatForm.on('submit', function () {

			if ( checkMessage() && checkUser() ) {
				resetInput();
				send();
			} else {
				alert('keine Nachricht gefunden')
			}

			return false;

		});
	}

	function socketListener () {

		socket.on('login success', function (data) {

			addToUserlist(data.usernamelist);
			addToChatlist(data, 'user');
			toggleChatLevel();

		});

		socket.on('login error', function () {

			alert('Der Benutzername ist ungültig');

		});

		socket.on('login err#username', function () {

			alert('Der Benutzername wird schon benützt, bitte wähle einen anderen Namen.');

		});

		socket.on('chat message', function (data) {

			addToChatlist(data, 'msg');

		});

		socket.on('new user', function (data) {

			addToChatlist(data, 'user');
			addToUserlist(data.username);

		});

		socket.on('user disconnect', function (data) {

			resetUserlist(data.usernamelist);
			addToChatlist({timestamp:data.timestamp, username:data.username}, 'disconnect');

		});
	}

	this.init = function () {

		if (io) {

			socket = io();

			eventListener();
			socketListener();
		}
	};

	return this;
}

global.app = global.app || {};
global.app.SocketIoChat = new SocketIoChat();