(function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);var f=new Error("Cannot find module '"+o+"'");throw f.code="MODULE_NOT_FOUND",f}var l=n[o]={exports:{}};t[o][0].call(l.exports,function(e){var n=t[o][1][e];return s(n?n:e)},l,l.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(require,module,exports){
(function (global){

function ChatController () {

	var config = {
		socket : null
	};

	var Model = null;
	var ChatSocketListener = null;
	var ChatEventListener = null;

	this.init = function () {

		if (io) {

			config.socket = io();

			Model = new global.app.ChatModel(config);
			ChatSocketListener = new global.app.ChatSocketListener(Model, config);
			ChatEventListener = new global.app.ChatEventListener(Model, config);

		}
	};

	return this;

}

global.app = global.app || {};
global.app.ChatController = new ChatController();
}).call(this,typeof global !== "undefined" ? global : typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {})

},{}],2:[function(require,module,exports){
(function (global){

function ChatEventListener (Model, config) {

	config.dom.usernameForm.on('submit', function () {

		Model.addUser();

		return false;

	});

	config.dom.chatForm.on('submit', function () {

		Model.sendMessage();

		return false;

	});

	config.dom.privateChatForm.on('submit', function () {

		Model.sendPrivateMessage();

		return false;

	});

	config.dom.btnExitChatroom.on('click', function () {

		Model.socketDisconnect();

	});

	$(config.dom.btnConfirm , config.dom.chatDialog).on('mouseup', function () {

		Model.acceptPrivateChatRequest();

	});

	config.dom.chatUserlist.on('click', '.userlist', function () {
		console.log('chatUserlist');
		Model.setPrivateChatRequest($(this).text(), $(this).attr('data-sessid'));

	});

	config.dom.chatDialog.on('hidden.bs.modal', function () {

		if ( config.socketPrivateChatActive && config.socketPrivateChatStatus === 'waiting' ) {

			Model.deletePrivateChatRequest();

		} else if ( config.socketPrivateChatActive && config.socketPrivateChatStatus === 'reqdecision' ) {

			Model.refusePrivateChatRequest();

		}
	});

	config.dom.privateChatModal.on('hidden.bs.modal', function () {

		Model.disconnectPrivateChat();

	});
}

global.app = global.app || {};
global.app.ChatEventListener = ChatEventListener;
}).call(this,typeof global !== "undefined" ? global : typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {})

},{}],3:[function(require,module,exports){
(function (global){
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
		message : '',
		username : '',
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
				config.privateChat.username = username;
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
		config.privateChat.username = '';
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
		config.privateChat.username = data.username;
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
				callerUsername : config.socketData.username
			});

		}
	};

	this.socketResponseOpenPrivateChat = function (data) {

		config.privateChat.message = config.privateChat.username + ' hat den Raum betreten';
		config.privateChat.timestamp = data.timestamp;

		setPrivateChatStatus(2);

		ChatRenderer.renderDialog(null);
		ChatRenderer.renderPrivateChat();
		ChatRenderer.renderPrivateChatMessage('status');

		config.socket.emit('user private chat message', {
			callerSocketId : config.privateChat.callerSocketId,
			responseSocketId : config.privateChat.responseSocketId,
			callerUsername : config.socketData.username
		});

	};

	this.socketResponseMessagePrivateChat = function (data) {

		var type = 'msg';

		if (config.socketPrivateChatActive === true && config.privateChat.responseSocketId === data.callerSocketId) {

			config.privateChat.message = data.message;
			config.privateChat.timestamp = data.timestamp;

			if (config.socketPrivateChatStatus === 'accept' || config.socketPrivateChatStatus === 'reqdecision') {

				type = 'status';
				config.privateChat.message = config.privateChat.username + ' hat den Raum betreten';

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

				config.privateChat.message = config.privateChat.username + ' hat den Raum verlassen';
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
}).call(this,typeof global !== "undefined" ? global : typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {})

},{}],4:[function(require,module,exports){
(function (global){

function ChatRenderer (config) {

	config.dom = {
		chatWrapper : $('#chatWrapper'),
		usernameForm : $('#usernameForm'),
		chatForm : $('#chatForm'),
		privateChatForm : $('#privateChatForm'),
		chatUsername : $('input#chatUsername'),
		chatInput : $('input#chatInput'),
		privateChatInput : $('input#privateChatInput'),
		privateChatList : $('ul#privateChatList'),
		chatList : $('#chatList'),
		chatUserlist : $('#chatUserlist'),
		chatDialog : $('#chatDialog'),
		privateChatModal : $('#privateChatModal'),
		btnExitChatroom : $('#btnExitChatroom'),
		btnConfirm : $('.btn.btn-success'),
		itemUserlist : $('.userlist','#chatUserlist')
	};

	var _self = this;

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

	this.renderChatlist = function (type, txt, time) {

		var spantimestamp = $('<span>').text('[' + timestamp(time) + ']');
		var li = $('<li>',{"class":"chatlist_" + type}).append(spantimestamp, txt);

		config.dom.chatList.append(li);
	};

	this.renderUserlist = function (user) {

		var title = (user.sessionId !== config.socketSessionId) ? 'Open a private chat with this user.' : 'My username';
		var css = (user.sessionId !== config.socketSessionId) ? 'userlist' : 'userlist_self';

		var li = $('<li>',{"class":css, "data-sessid":user.sessionId, "title":title}).text(user.username);
		config.dom.chatUserlist.append(li);

	};

	this.renderPrivateChat = function () {

		$('.modal-title', config.dom.privateChatModal).text('Private Chat mit ' + config.privateChat.username);

		config.dom.privateChatModal.modal('show');

	};

	this.renderPrivateChatMessage = function (type) {

		var text = (type==='msg') ? ' ' + config.privateChat.username + ' ' + config.privateChat.message : ' ' + config.privateChat.message;
		var spantimestamp = $('<span>').text('[' + timestamp(config.privateChat.timestamp) + ']');
		var li = $('<li>',{"class":"chatlist_user"}).append(spantimestamp, text);

		config.dom.privateChatList.append(li);

	};

	this.renderDialog = function (arg) {

		if (arg === null) {

			config.dom.chatDialog.modal('hide');
			return true;

		}

		var btntitle = arg.btntitle || 'schliessen';

		_self.renderDialogBody('<p>' + arg.text.join('</p><p>') + '</p>');

		if (arg.hasOwnProperty('confirm')) {

			$(config.dom.btnConfirm , config.dom.chatDialog).css('display','block');

		} else {

			$(config.dom.btnConfirm , config.dom.chatDialog).css('display','none');

		}

		if(arg.hasOwnProperty('title')) {

			$('.modal-title', config.dom.chatDialog)
				.text(arg.title);
		}

		$('.modal-footer button.btn.btn-primary', config.dom.chatDialog)
			.text(btntitle);

		config.dom.chatDialog.modal('show');

	};

	this.renderDialogBody = function (text) {
		$('.modal-body', config.dom.chatDialog)
			.html(text);
	};

	this.toggleChatLevel = function () {

		var showlvl0 = 'block';
		var showlvl1 = 'none';

		if( $('.chatLvl0', config.dom.chatWrapper).css('display') !== 'none') {

			showlvl0 = 'none';
			showlvl1 = 'block';
		}

		$('.chatLvl0', config.dom.chatWrapper).css('display', showlvl0);
		$('.chatLvl1', config.dom.chatWrapper).css('display', showlvl1);
	};

	this.emptyChatList = function () {
		config.dom.chatList.empty();
	};

	this.emptyChatInput = function () {
		config.dom.chatInput.val('');
	};

	this.emptyUserList = function () {
		config.dom.chatUserlist.empty();
	};

	this.emptyChatUsername = function () {
		config.dom.chatUsername.val('');
	};

	this.emptyPrivateChatInput = function () {
		config.dom.privateChatInput.val('');
	};

	return this;
}

global.app = global.app || {};
global.app.ChatRenderer = ChatRenderer;

}).call(this,typeof global !== "undefined" ? global : typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {})

},{}],5:[function(require,module,exports){
(function (global){


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
}).call(this,typeof global !== "undefined" ? global : typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {})

},{}],6:[function(require,module,exports){
(function (global){

$(document).ready (function () {
	global.app.ChatController.init();
});

}).call(this,typeof global !== "undefined" ? global : typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {})

},{}]},{},[4,3,5,2,1,6])
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIm5vZGVfbW9kdWxlcy9icm93c2VyLXBhY2svX3ByZWx1ZGUuanMiLCJwdWJsaWMvanMvYXBwL0NoYXRDb250cm9sbGVyLmpzIiwicHVibGljL2pzL2FwcC9DaGF0RXZlbnRMaXN0ZW5lci5qcyIsInB1YmxpYy9qcy9hcHAvQ2hhdE1vZGVsLmpzIiwicHVibGljL2pzL2FwcC9DaGF0UmVuZGVyZXIuanMiLCJwdWJsaWMvanMvYXBwL0NoYXRTb2NrZXRMaXN0ZW5lci5qcyIsInB1YmxpYy9qcy9hcHAvaW5kZXguanMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7O0FDQUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOzs7OztBQzdCQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7Ozs7QUNsRUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7Ozs7O0FDbmJBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7Ozs7QUMzSkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7Ozs7O0FDOUVBO0FBQ0E7QUFDQTtBQUNBO0FBQ0EiLCJmaWxlIjoiZ2VuZXJhdGVkLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXNDb250ZW50IjpbIihmdW5jdGlvbiBlKHQsbixyKXtmdW5jdGlvbiBzKG8sdSl7aWYoIW5bb10pe2lmKCF0W29dKXt2YXIgYT10eXBlb2YgcmVxdWlyZT09XCJmdW5jdGlvblwiJiZyZXF1aXJlO2lmKCF1JiZhKXJldHVybiBhKG8sITApO2lmKGkpcmV0dXJuIGkobywhMCk7dmFyIGY9bmV3IEVycm9yKFwiQ2Fubm90IGZpbmQgbW9kdWxlICdcIitvK1wiJ1wiKTt0aHJvdyBmLmNvZGU9XCJNT0RVTEVfTk9UX0ZPVU5EXCIsZn12YXIgbD1uW29dPXtleHBvcnRzOnt9fTt0W29dWzBdLmNhbGwobC5leHBvcnRzLGZ1bmN0aW9uKGUpe3ZhciBuPXRbb11bMV1bZV07cmV0dXJuIHMobj9uOmUpfSxsLGwuZXhwb3J0cyxlLHQsbixyKX1yZXR1cm4gbltvXS5leHBvcnRzfXZhciBpPXR5cGVvZiByZXF1aXJlPT1cImZ1bmN0aW9uXCImJnJlcXVpcmU7Zm9yKHZhciBvPTA7bzxyLmxlbmd0aDtvKyspcyhyW29dKTtyZXR1cm4gc30pIiwiXHJcbmZ1bmN0aW9uIENoYXRDb250cm9sbGVyICgpIHtcclxuXHJcblx0dmFyIGNvbmZpZyA9IHtcclxuXHRcdHNvY2tldCA6IG51bGxcclxuXHR9O1xyXG5cclxuXHR2YXIgTW9kZWwgPSBudWxsO1xyXG5cdHZhciBDaGF0U29ja2V0TGlzdGVuZXIgPSBudWxsO1xyXG5cdHZhciBDaGF0RXZlbnRMaXN0ZW5lciA9IG51bGw7XHJcblxyXG5cdHRoaXMuaW5pdCA9IGZ1bmN0aW9uICgpIHtcclxuXHJcblx0XHRpZiAoaW8pIHtcclxuXHJcblx0XHRcdGNvbmZpZy5zb2NrZXQgPSBpbygpO1xyXG5cclxuXHRcdFx0TW9kZWwgPSBuZXcgZ2xvYmFsLmFwcC5DaGF0TW9kZWwoY29uZmlnKTtcclxuXHRcdFx0Q2hhdFNvY2tldExpc3RlbmVyID0gbmV3IGdsb2JhbC5hcHAuQ2hhdFNvY2tldExpc3RlbmVyKE1vZGVsLCBjb25maWcpO1xyXG5cdFx0XHRDaGF0RXZlbnRMaXN0ZW5lciA9IG5ldyBnbG9iYWwuYXBwLkNoYXRFdmVudExpc3RlbmVyKE1vZGVsLCBjb25maWcpO1xyXG5cclxuXHRcdH1cclxuXHR9O1xyXG5cclxuXHRyZXR1cm4gdGhpcztcclxuXHJcbn1cclxuXHJcbmdsb2JhbC5hcHAgPSBnbG9iYWwuYXBwIHx8IHt9O1xyXG5nbG9iYWwuYXBwLkNoYXRDb250cm9sbGVyID0gbmV3IENoYXRDb250cm9sbGVyKCk7IiwiXHJcbmZ1bmN0aW9uIENoYXRFdmVudExpc3RlbmVyIChNb2RlbCwgY29uZmlnKSB7XHJcblxyXG5cdGNvbmZpZy5kb20udXNlcm5hbWVGb3JtLm9uKCdzdWJtaXQnLCBmdW5jdGlvbiAoKSB7XHJcblxyXG5cdFx0TW9kZWwuYWRkVXNlcigpO1xyXG5cclxuXHRcdHJldHVybiBmYWxzZTtcclxuXHJcblx0fSk7XHJcblxyXG5cdGNvbmZpZy5kb20uY2hhdEZvcm0ub24oJ3N1Ym1pdCcsIGZ1bmN0aW9uICgpIHtcclxuXHJcblx0XHRNb2RlbC5zZW5kTWVzc2FnZSgpO1xyXG5cclxuXHRcdHJldHVybiBmYWxzZTtcclxuXHJcblx0fSk7XHJcblxyXG5cdGNvbmZpZy5kb20ucHJpdmF0ZUNoYXRGb3JtLm9uKCdzdWJtaXQnLCBmdW5jdGlvbiAoKSB7XHJcblxyXG5cdFx0TW9kZWwuc2VuZFByaXZhdGVNZXNzYWdlKCk7XHJcblxyXG5cdFx0cmV0dXJuIGZhbHNlO1xyXG5cclxuXHR9KTtcclxuXHJcblx0Y29uZmlnLmRvbS5idG5FeGl0Q2hhdHJvb20ub24oJ2NsaWNrJywgZnVuY3Rpb24gKCkge1xyXG5cclxuXHRcdE1vZGVsLnNvY2tldERpc2Nvbm5lY3QoKTtcclxuXHJcblx0fSk7XHJcblxyXG5cdCQoY29uZmlnLmRvbS5idG5Db25maXJtICwgY29uZmlnLmRvbS5jaGF0RGlhbG9nKS5vbignbW91c2V1cCcsIGZ1bmN0aW9uICgpIHtcclxuXHJcblx0XHRNb2RlbC5hY2NlcHRQcml2YXRlQ2hhdFJlcXVlc3QoKTtcclxuXHJcblx0fSk7XHJcblxyXG5cdGNvbmZpZy5kb20uY2hhdFVzZXJsaXN0Lm9uKCdjbGljaycsICcudXNlcmxpc3QnLCBmdW5jdGlvbiAoKSB7XHJcblx0XHRjb25zb2xlLmxvZygnY2hhdFVzZXJsaXN0Jyk7XHJcblx0XHRNb2RlbC5zZXRQcml2YXRlQ2hhdFJlcXVlc3QoJCh0aGlzKS50ZXh0KCksICQodGhpcykuYXR0cignZGF0YS1zZXNzaWQnKSk7XHJcblxyXG5cdH0pO1xyXG5cclxuXHRjb25maWcuZG9tLmNoYXREaWFsb2cub24oJ2hpZGRlbi5icy5tb2RhbCcsIGZ1bmN0aW9uICgpIHtcclxuXHJcblx0XHRpZiAoIGNvbmZpZy5zb2NrZXRQcml2YXRlQ2hhdEFjdGl2ZSAmJiBjb25maWcuc29ja2V0UHJpdmF0ZUNoYXRTdGF0dXMgPT09ICd3YWl0aW5nJyApIHtcclxuXHJcblx0XHRcdE1vZGVsLmRlbGV0ZVByaXZhdGVDaGF0UmVxdWVzdCgpO1xyXG5cclxuXHRcdH0gZWxzZSBpZiAoIGNvbmZpZy5zb2NrZXRQcml2YXRlQ2hhdEFjdGl2ZSAmJiBjb25maWcuc29ja2V0UHJpdmF0ZUNoYXRTdGF0dXMgPT09ICdyZXFkZWNpc2lvbicgKSB7XHJcblxyXG5cdFx0XHRNb2RlbC5yZWZ1c2VQcml2YXRlQ2hhdFJlcXVlc3QoKTtcclxuXHJcblx0XHR9XHJcblx0fSk7XHJcblxyXG5cdGNvbmZpZy5kb20ucHJpdmF0ZUNoYXRNb2RhbC5vbignaGlkZGVuLmJzLm1vZGFsJywgZnVuY3Rpb24gKCkge1xyXG5cclxuXHRcdE1vZGVsLmRpc2Nvbm5lY3RQcml2YXRlQ2hhdCgpO1xyXG5cclxuXHR9KTtcclxufVxyXG5cclxuZ2xvYmFsLmFwcCA9IGdsb2JhbC5hcHAgfHwge307XHJcbmdsb2JhbC5hcHAuQ2hhdEV2ZW50TGlzdGVuZXIgPSBDaGF0RXZlbnRMaXN0ZW5lcjsiLCJmdW5jdGlvbiBDaGF0TW9kZWwgKGNvbmZpZykge1xyXG5cclxuXHRjb25maWcuc29ja2V0U2Vzc2lvbklkID0gJyc7XHJcblx0Y29uZmlnLnNvY2tldElzRGlzY29ubmVjdGVkID0gdHJ1ZTtcclxuXHRjb25maWcuc29ja2V0UHJpdmF0ZUNoYXRBY3RpdmUgPSBmYWxzZSxcclxuXHRjb25maWcuc29ja2V0UHJpdmF0ZUNoYXRTdGF0dXMgPSAnY2xvc2VkJztcclxuXHJcblxyXG5cdGNvbmZpZy5zb2NrZXREYXRhID0ge1xyXG5cdFx0bWVzc2FnZSA6ICcnLFxyXG5cdFx0dXNlcm5hbWUgOiAnJ1xyXG5cdH07XHJcblxyXG5cdGNvbmZpZy5wcml2YXRlQ2hhdCA9IHtcclxuXHRcdGNhbGxlclNvY2tldElkIDogJycsXHJcblx0XHRjYWxsZXJVc2VybmFtZSA6ICcnLFxyXG5cdFx0cmVzcG9uc2VTb2NrZXRJZCA6ICcnLFxyXG5cdFx0bWVzc2FnZSA6ICcnLFxyXG5cdFx0dXNlcm5hbWUgOiAnJyxcclxuXHRcdHRpbWVzdGFtcCA6ICcnXHJcblx0fTtcclxuXHJcblx0dmFyIENoYXRSZW5kZXJlciA9IG5ldyBnbG9iYWwuYXBwLkNoYXRSZW5kZXJlcihjb25maWcpO1xyXG5cdHZhciBwcml2YXRlU3RhdHVzRmlsdGVyID0gWydjbG9zZWQnLCd3YWl0aW5nJywnb3BlbicsJ3JlcWRlY2lzaW9uJywnYWNjZXB0J107XHJcblx0dmFyIF9zZWxmID0gdGhpcztcclxuXHJcblx0ZnVuY3Rpb24gYWRkVG9DaGF0bGlzdCAoZGF0YSwgdHlwZSkge1xyXG5cclxuXHRcdHZhciB0eHQgPSAnJztcclxuXHJcblx0XHRzd2l0Y2ggKHR5cGUpIHtcclxuXHRcdFx0Y2FzZSgnbXNnJyk6XHJcblx0XHRcdFx0dHh0ID0gZGF0YS51c2VybmFtZSArICcgOiAnICsgZGF0YS5tZXNzYWdlO1xyXG5cdFx0XHRcdGJyZWFrO1xyXG5cdFx0XHRjYXNlKCd1c2VyJyk6XHJcblx0XHRcdFx0dHh0ID0gZGF0YS51c2VybmFtZSArICcgaGF0IGRlbiBSYXVtIGJldHJldGVuJztcclxuXHRcdFx0XHRicmVhaztcclxuXHRcdFx0Y2FzZSgnZGlzY29ubmVjdCcpOlxyXG5cdFx0XHRcdHR4dCA9IGRhdGEudXNlcm5hbWUgKyAnIGhhdCBkZW4gUmF1bSB2ZXJsYXNzZW4nO1xyXG5cdFx0XHRcdGJyZWFrO1xyXG5cdFx0fVxyXG5cclxuXHRcdENoYXRSZW5kZXJlci5yZW5kZXJDaGF0bGlzdCh0eXBlLCB0eHQsIGRhdGEudGltZXN0YW1wKTtcclxuXHJcblx0fVxyXG5cclxuXHRmdW5jdGlvbiBhZGRUb1VzZXJsaXN0IChkYXRhKSB7XHJcblxyXG5cdFx0aWYgKHR5cGVvZiBkYXRhID09PSAnb2JqZWN0Jykge1xyXG5cclxuXHRcdFx0JC5lYWNoKGRhdGEsIGZ1bmN0aW9uIChrZXksdXNlcikge1xyXG5cclxuXHRcdFx0XHRDaGF0UmVuZGVyZXIucmVuZGVyVXNlcmxpc3QodXNlcik7XHJcblxyXG5cdFx0XHR9KTtcclxuXHRcdH1cclxuXHR9XHJcblxyXG5cdGZ1bmN0aW9uIGNoZWNrVXNlcm5hbWUgKCkge1xyXG5cdFx0cmV0dXJuICh0eXBlb2YgY29uZmlnLnNvY2tldERhdGEudXNlcm5hbWUgPT09ICdzdHJpbmcnICYmIGNvbmZpZy5zb2NrZXREYXRhLnVzZXJuYW1lLmxlbmd0aCkgPyB0cnVlIDogZmFsc2U7XHJcblx0fVxyXG5cclxuXHRmdW5jdGlvbiBjaGVja01lc3NhZ2UgKCkge1xyXG5cdFx0cmV0dXJuICh0eXBlb2YgY29uZmlnLnNvY2tldERhdGEubWVzc2FnZSA9PT0gJ3N0cmluZycgJiYgY29uZmlnLnNvY2tldERhdGEubWVzc2FnZS5sZW5ndGgpID8gdHJ1ZSA6IGZhbHNlO1xyXG5cdH1cclxuXHJcblx0ZnVuY3Rpb24gY2hlY2tQcml2YXRlQ2hhdCAoKSB7XHJcblxyXG5cdFx0dmFyIHJlcyA9IHRydWU7XHJcblxyXG5cdFx0JC5lYWNoKGNvbmZpZy5wcml2YXRlQ2hhdCwgZnVuY3Rpb24gKGtleSwgdmFsdWUpIHtcclxuXHJcblx0XHRcdGlmICggdHlwZW9mIHZhbHVlICE9PSAnc3RyaW5nJyB8fCB0eXBlb2YgdmFsdWUgPT09ICdzdHJpbmcnICYmICEgdmFsdWUubGVuZ3RoKSB7XHJcblxyXG5cdFx0XHRcdHJlcyA9IGZhbHNlO1xyXG5cdFx0XHRcdHJldHVybiByZXM7XHJcblxyXG5cdFx0XHR9XHJcblx0XHR9KTtcclxuXHJcblx0XHRyZXR1cm4gcmVzO1xyXG5cdH1cclxuXHJcblx0ZnVuY3Rpb24gZ2V0U3RyRm9ybWF0ZWQgKHN0ciwgc3RybGVuKSB7XHJcblxyXG5cdFx0c3RyID0gJC50cmltKHN0cik7XHJcblxyXG5cdFx0cmV0dXJuIChzdHIubGVuZ3RoID4gc3RybGVuICkgPyBzdHIuc3Vic3RyKDAsc3RybGVuLTEpIDogc3RyO1xyXG5cdH1cclxuXHJcblx0ZnVuY3Rpb24gc2V0TWVzc2FnZSAoKSB7XHJcblxyXG5cdFx0Y29uZmlnLnNvY2tldERhdGEubWVzc2FnZSA9IGdldFN0ckZvcm1hdGVkKGNvbmZpZy5kb20uY2hhdElucHV0LnZhbCgpLCAyMDApO1xyXG5cdFx0Q2hhdFJlbmRlcmVyLmVtcHR5Q2hhdElucHV0KCk7XHJcblxyXG5cdH1cclxuXHJcblx0ZnVuY3Rpb24gc2V0UHJpdmF0ZU1lc3NhZ2UgKCkge1xyXG5cclxuXHRcdGNvbmZpZy5wcml2YXRlQ2hhdC5tZXNzYWdlID0gZ2V0U3RyRm9ybWF0ZWQoY29uZmlnLmRvbS5wcml2YXRlQ2hhdElucHV0LnZhbCgpLCAyMDApO1xyXG5cdFx0Q2hhdFJlbmRlcmVyLmVtcHR5UHJpdmF0ZUNoYXRJbnB1dCgpO1xyXG5cclxuXHR9XHJcblxyXG5cdGZ1bmN0aW9uIHNldFVzZXJuYW1lICgpIHtcclxuXHJcblx0XHRjb25maWcuc29ja2V0RGF0YS51c2VybmFtZSA9IGdldFN0ckZvcm1hdGVkKGNvbmZpZy5kb20uY2hhdFVzZXJuYW1lLnZhbCgpLCAzMCk7XHJcblx0XHRDaGF0UmVuZGVyZXIuZW1wdHlDaGF0VXNlcm5hbWUoKTtcclxuXHJcblx0fVxyXG5cclxuXHRmdW5jdGlvbiBzZXRQcml2YXRlQ2hhdFN0YXR1cyAoc3RhdHVzaW5kZXgpIHtcclxuXHJcblx0XHRpZiAoc3RhdHVzaW5kZXgrMSA8PSBwcml2YXRlU3RhdHVzRmlsdGVyLmxlbmd0aCkge1xyXG5cclxuXHRcdFx0Y29uZmlnLnNvY2tldFByaXZhdGVDaGF0U3RhdHVzID0gcHJpdmF0ZVN0YXR1c0ZpbHRlcltzdGF0dXNpbmRleF07XHJcblx0XHR9XHJcblx0fVxyXG5cclxuXHRmdW5jdGlvbiByZXNldENoYXQgKCkge1xyXG5cclxuXHRcdENoYXRSZW5kZXJlci5lbXB0eUNoYXRMaXN0KCk7XHJcblx0XHRDaGF0UmVuZGVyZXIuZW1wdHlVc2VyTGlzdCgpO1xyXG5cdFx0Y29uZmlnLnNvY2tldERhdGEudXNlcm5hbWUgPSAnJztcclxuXHR9XHJcblxyXG5cdGZ1bmN0aW9uIHJlc2V0VXNlcmxpc3QgKHVzZXJsaXN0KSB7XHJcblxyXG5cdFx0Q2hhdFJlbmRlcmVyLmVtcHR5VXNlckxpc3QoKTtcclxuXHRcdGFkZFRvVXNlcmxpc3QodXNlcmxpc3QpO1xyXG5cclxuXHR9XHJcblxyXG5cdHRoaXMuYWRkVXNlciA9IGZ1bmN0aW9uICgpIHtcclxuXHJcblx0XHRzZXRVc2VybmFtZSgpO1xyXG5cclxuXHRcdGlmICggISBjaGVja1VzZXJuYW1lKCkgKSB7XHJcblxyXG5cdFx0XHRDaGF0UmVuZGVyZXIucmVuZGVyRGlhbG9nKHt0ZXh0OidLZWluZW4ga29ycmVrdGVuIFVzZXJuYW1lbiBnZWZ1bmRlbid9KTtcclxuXHRcdFx0cmV0dXJuIGZhbHNlO1xyXG5cclxuXHRcdH1cclxuXHJcblx0XHRpZiAoY29uZmlnLnNvY2tldElzRGlzY29ubmVjdGVkID09PSB0cnVlKSB7XHJcblxyXG5cdFx0XHRjb25maWcuc29ja2V0LmNvbm5lY3QoKTtcclxuXHJcblx0XHR9XHJcblxyXG5cdFx0Y29uZmlnLnNvY2tldC5lbWl0KCdhZGQgdXNlcicsIGNvbmZpZy5zb2NrZXREYXRhLnVzZXJuYW1lKTtcclxuXHJcblx0fTtcclxuXHJcblx0dGhpcy5zZW5kTWVzc2FnZSA9IGZ1bmN0aW9uICgpIHtcclxuXHJcblx0XHRzZXRNZXNzYWdlKCk7XHJcblxyXG5cdFx0aWYgKCBjaGVja01lc3NhZ2UoKSAmJiBjaGVja1VzZXJuYW1lKCkgKSB7XHJcblxyXG5cdFx0XHRjb25maWcuc29ja2V0LmVtaXQoJ2NoYXQgbWVzc2FnZScsIGNvbmZpZy5zb2NrZXREYXRhKTtcclxuXHJcblx0XHR9IGVsc2Uge1xyXG5cclxuXHRcdFx0Q2hhdFJlbmRlcmVyLnJlbmRlckRpYWxvZyh7dGV4dDonS2VpbmUgTmFjaHJpY2h0IGdlZnVuZGVuJ30pO1xyXG5cclxuXHRcdH1cclxuXHR9O1xyXG5cclxuXHR0aGlzLnNlbmRQcml2YXRlTWVzc2FnZSA9IGZ1bmN0aW9uICgpIHtcclxuXHJcblx0XHRpZiAoIGNvbmZpZy5zb2NrZXRQcml2YXRlQ2hhdEFjdGl2ZSApIHtcclxuXHJcblx0XHRcdHNldFByaXZhdGVNZXNzYWdlKCk7XHJcblxyXG5cdFx0XHRpZiAoY2hlY2tQcml2YXRlQ2hhdCgpICYmIGNoZWNrVXNlcm5hbWUoKSkge1xyXG5cclxuXHRcdFx0XHRjb25maWcuc29ja2V0LmVtaXQoJ3VzZXIgcHJpdmF0ZSBjaGF0IG1lc3NhZ2UnLCBjb25maWcucHJpdmF0ZUNoYXQpO1xyXG5cclxuXHRcdFx0XHRjb25maWcucHJpdmF0ZUNoYXQudGltZXN0YW1wID0gbmV3IERhdGUoKTtcclxuXHRcdFx0XHRjb25maWcucHJpdmF0ZUNoYXQubWVzc2FnZSA9IGNvbmZpZy5wcml2YXRlQ2hhdC5jYWxsZXJVc2VybmFtZSArICcgJyArIGNvbmZpZy5wcml2YXRlQ2hhdC5tZXNzYWdlO1xyXG5cclxuXHRcdFx0XHRDaGF0UmVuZGVyZXIucmVuZGVyUHJpdmF0ZUNoYXRNZXNzYWdlKCdzdGF0dXMnKTtcclxuXHJcblx0XHRcdH1cclxuXHRcdH1cclxuXHR9O1xyXG5cclxuXHR0aGlzLnNldFByaXZhdGVDaGF0UmVxdWVzdCA9IGZ1bmN0aW9uICh1c2VybmFtZSwgc2Vzc29uaWQpIHtcclxuXHJcblx0XHRpZiAoICEgY29uZmlnLnNvY2tldFByaXZhdGVDaGF0QWN0aXZlICkge1xyXG5cclxuXHRcdFx0aWYgKGNvbmZpZy5zb2NrZXRTZXNzaW9uSWQgIT09ICcnICYmIGNvbmZpZy5zb2NrZXRTZXNzaW9uSWQgIT09IHNlc3NvbmlkKSB7XHJcblxyXG5cdFx0XHRcdHZhciB0eHQgPSBbXHJcblx0XHRcdFx0XHQnRGVyIFVzZXIgJyt1c2VybmFtZSsnIHdpcmQgenVtIHByaXZhdGVuIENoYXQgZWluZ2VsYWRlbiwgYml0dGUgd2FydGUgYXVmIGRpZSBCZXN0w6R0aWd1bmcuJyxcclxuXHRcdFx0XHRcdCdXZW5uIGR1IGRpZXNlbiBEaWFsb2cgc2NobGllw590LCBkYW5uIHdpcmQgZGllIEVpbmxhZHVuZyB6dXLDvGNrIGdlem9nZW4hJ1xyXG5cdFx0XHRcdF07XHJcblxyXG5cdFx0XHRcdGNvbmZpZy5wcml2YXRlQ2hhdC5jYWxsZXJTb2NrZXRJZCA9IGNvbmZpZy5zb2NrZXRTZXNzaW9uSWQ7XHJcblx0XHRcdFx0Y29uZmlnLnByaXZhdGVDaGF0LmNhbGxlclVzZXJuYW1lID0gY29uZmlnLnNvY2tldERhdGEudXNlcm5hbWU7XHJcblx0XHRcdFx0Y29uZmlnLnByaXZhdGVDaGF0LnJlc3BvbnNlU29ja2V0SWQgPSBzZXNzb25pZDtcclxuXHRcdFx0XHRjb25maWcucHJpdmF0ZUNoYXQudXNlcm5hbWUgPSB1c2VybmFtZTtcclxuXHRcdFx0XHRjb25maWcucHJpdmF0ZUNoYXQubWVzc2FnZSA9ICcnO1xyXG5cdFx0XHRcdGNvbmZpZy5wcml2YXRlQ2hhdC50aW1lc3RhbXAgPSAnJztcclxuXHRcdFx0XHRjb25maWcuc29ja2V0UHJpdmF0ZUNoYXRBY3RpdmUgPSB0cnVlO1xyXG5cclxuXHRcdFx0XHRzZXRQcml2YXRlQ2hhdFN0YXR1cygxKTtcclxuXHJcblx0XHRcdFx0Q2hhdFJlbmRlcmVyLnJlbmRlckRpYWxvZyh7XHJcblx0XHRcdFx0XHR0aXRsZTonUHJpdmF0ZSBDaGF0IEFuZnJhZ2UnLFxyXG5cdFx0XHRcdFx0dGV4dDp0eHQsXHJcblx0XHRcdFx0XHRidG50aXRsZTonQWJyZWNoZW4nXHJcblx0XHRcdFx0fSk7XHJcblxyXG5cdFx0XHRcdGNvbmZpZy5zb2NrZXQuZW1pdCgndXNlciBwcml2YXRlIGNoYXQgcmVxdWVzdCcsIGNvbmZpZy5wcml2YXRlQ2hhdCk7XHJcblxyXG5cdFx0XHR9XHJcblx0XHR9XHJcblx0fTtcclxuXHJcblx0dGhpcy5hY2NlcHRQcml2YXRlQ2hhdFJlcXVlc3QgPSBmdW5jdGlvbiAoKSB7XHJcblxyXG5cdFx0Y29uZmlnLnNvY2tldC5lbWl0KCd1c2VyIHByaXZhdGUgY2hhdCBhY2NlcHQnLCB7XHJcblx0XHRcdGNhbGxlclNvY2tldElkOmNvbmZpZy5wcml2YXRlQ2hhdC5jYWxsZXJTb2NrZXRJZCxcclxuXHRcdFx0cmVzcG9uc2VTb2NrZXRJZDpjb25maWcucHJpdmF0ZUNoYXQucmVzcG9uc2VTb2NrZXRJZFxyXG5cdFx0fSk7XHJcblxyXG5cdH07XHJcblxyXG5cdHRoaXMucmVmdXNlUHJpdmF0ZUNoYXRSZXF1ZXN0ID0gZnVuY3Rpb24oKSB7XHJcblxyXG5cdFx0Y29uZmlnLnNvY2tldC5lbWl0KCd1c2VyIHByaXZhdGUgY2hhdCByZWZ1c2UnLCB7XHJcblx0XHRcdGNhbGxlclNvY2tldElkOmNvbmZpZy5wcml2YXRlQ2hhdC5jYWxsZXJTb2NrZXRJZCxcclxuXHRcdFx0cmVzcG9uc2VTb2NrZXRJZDpjb25maWcucHJpdmF0ZUNoYXQucmVzcG9uc2VTb2NrZXRJZFxyXG5cdFx0fSk7XHJcblxyXG5cdFx0X3NlbGYuZGVsZXRlUHJpdmF0ZUNoYXRSZXF1ZXN0KCk7XHJcblx0fTtcclxuXHJcblx0dGhpcy5kZWxldGVQcml2YXRlQ2hhdFJlcXVlc3QgPSBmdW5jdGlvbiAoKSB7XHJcblxyXG5cdFx0Y29uZmlnLnByaXZhdGVDaGF0LmNhbGxlclNvY2tldElkID0gJyc7XHJcblx0XHRjb25maWcucHJpdmF0ZUNoYXQucmVzcG9uc2VTb2NrZXRJZCA9ICcnO1xyXG5cdFx0Y29uZmlnLnByaXZhdGVDaGF0LnVzZXJuYW1lID0gJyc7XHJcblx0XHRjb25maWcucHJpdmF0ZUNoYXQubWVzc2FnZSA9ICcnO1xyXG5cdFx0Y29uZmlnLnByaXZhdGVDaGF0LnRpbWVzdGFtcCA9ICcnO1xyXG5cdFx0Y29uZmlnLnNvY2tldFByaXZhdGVDaGF0QWN0aXZlID0gZmFsc2U7XHJcblxyXG5cdFx0c2V0UHJpdmF0ZUNoYXRTdGF0dXMoMCk7XHJcblx0fTtcclxuXHJcblx0dGhpcy5kaXNjb25uZWN0UHJpdmF0ZUNoYXQgPSBmdW5jdGlvbiAoKSB7XHJcblxyXG5cdFx0Y29uZmlnLnNvY2tldC5lbWl0KCd1c2VyIHByaXZhdGUgY2hhdCBkaXNjb25uZWN0Jywge1xyXG5cdFx0XHRjYWxsZXJTb2NrZXRJZDpjb25maWcucHJpdmF0ZUNoYXQuY2FsbGVyU29ja2V0SWQsXHJcblx0XHRcdHJlc3BvbnNlU29ja2V0SWQ6Y29uZmlnLnByaXZhdGVDaGF0LnJlc3BvbnNlU29ja2V0SWRcclxuXHRcdH0pO1xyXG5cclxuXHRcdF9zZWxmLmRlbGV0ZVByaXZhdGVDaGF0UmVxdWVzdCgpO1xyXG5cdH07XHJcblxyXG5cdHRoaXMuc29ja2V0RGlzY29ubmVjdCA9IGZ1bmN0aW9uICgpIHtcclxuXHJcblx0XHRjb25maWcuc29ja2V0LmRpc2Nvbm5lY3QoKTtcclxuXHRcdGNvbmZpZy5zb2NrZXRJc0Rpc2Nvbm5lY3RlZCA9IHRydWU7XHJcblx0XHRjb25maWcuc29ja2V0U2Vzc2lvbklkID0gJyc7XHJcblxyXG5cdFx0cmVzZXRDaGF0KCk7XHJcblx0XHRDaGF0UmVuZGVyZXIudG9nZ2xlQ2hhdExldmVsKCk7XHJcblxyXG5cdH07XHJcblxyXG5cdHRoaXMuc2V0TG9naW5TdWNjZXNzID0gZnVuY3Rpb24gKGRhdGEpIHtcclxuXHJcblx0XHRjb25maWcuc29ja2V0SXNEaXNjb25uZWN0ZWQgPSBmYWxzZTtcclxuXHRcdGNvbmZpZy5zb2NrZXRTZXNzaW9uSWQgPSBkYXRhLnNlc3Npb25JZDtcclxuXHJcblx0XHRhZGRUb1VzZXJsaXN0KGRhdGEudXNlcnMpO1xyXG5cdFx0YWRkVG9DaGF0bGlzdCh7dGltZXN0YW1wOmRhdGEudGltZXN0YW1wLHVzZXJuYW1lOmRhdGEudXNlcm5hbWV9LCAndXNlcicpO1xyXG5cdFx0Q2hhdFJlbmRlcmVyLnRvZ2dsZUNoYXRMZXZlbCgpO1xyXG5cclxuXHR9O1xyXG5cclxuXHR0aGlzLnNldExvZ2luRXJyb3IgPSBmdW5jdGlvbiAoZXJyb3IpIHtcclxuXHJcblx0XHRDaGF0UmVuZGVyZXIucmVuZGVyRGlhbG9nKHt0ZXh0OmVycm9yfSk7XHJcblxyXG5cdH07XHJcblxyXG5cdHRoaXMuc29ja2V0UmVzcG9uc2VTZXRNZXNzYWdlID0gZnVuY3Rpb24gKGRhdGEpIHtcclxuXHJcblx0XHRpZiAoICEgY29uZmlnLnNvY2tldElzRGlzY29ubmVjdGVkKSB7XHJcblxyXG5cdFx0XHRhZGRUb0NoYXRsaXN0KGRhdGEsICdtc2cnKTtcclxuXHJcblx0XHR9XHJcblx0fTtcclxuXHJcblx0dGhpcy5zb2NrZXRSZXNwb25zZVVzZXJOZXcgPSBmdW5jdGlvbiAoZGF0YSkge1xyXG5cclxuXHRcdGlmICggISBjb25maWcuc29ja2V0SXNEaXNjb25uZWN0ZWQpIHtcclxuXHJcblx0XHRcdGFkZFRvQ2hhdGxpc3Qoe3RpbWVzdGFtcDpkYXRhLnRpbWVzdGFtcCx1c2VybmFtZTpkYXRhLnVzZXJuYW1lfSwgJ3VzZXInKTtcclxuXHRcdFx0YWRkVG9Vc2VybGlzdCh7XCJ1c2VyXCI6e3VzZXJuYW1lOmRhdGEudXNlcm5hbWUsc2Vzc2lvbklkOmRhdGEuc2Vzc2lvbklkfX0pO1xyXG5cclxuXHRcdH1cclxuXHR9O1xyXG5cclxuXHR0aGlzLnNvY2tldFJlc3BvbnNlVXNlckRpc2Nvbm5lY3QgPSBmdW5jdGlvbiAoZGF0YSkge1xyXG5cclxuXHRcdGlmICggISBjb25maWcuc29ja2V0SXNEaXNjb25uZWN0ZWQpIHtcclxuXHJcblx0XHRcdHJlc2V0VXNlcmxpc3QoZGF0YS51c2Vycyk7XHJcblx0XHRcdGFkZFRvQ2hhdGxpc3Qoe3RpbWVzdGFtcDpkYXRhLnRpbWVzdGFtcCwgdXNlcm5hbWU6ZGF0YS51c2VybmFtZX0sICdkaXNjb25uZWN0Jyk7XHJcblxyXG5cdFx0fVxyXG5cdH07XHJcblxyXG5cdHRoaXMuc29ja2V0UmVzcG9uc2VVc2VySW52aXRlID0gZnVuY3Rpb24gKGRhdGEpIHtcclxuXHJcblx0XHR2YXIgdHh0ID0gW1xyXG5cdFx0XHQnRGVyIFVzZXIgJytkYXRhLnVzZXJuYW1lKycgbcO2Y2h0ZSBkaWNoIHp1bSBwcml2YXRlbiBDaGF0IGVpbmdlbGFkZW4uJyxcclxuXHRcdFx0J1dlbm4gZHUgZGllc2VuIERpYWxvZyBzY2hsaWXDn3QsIGRhbm4gd2lyZCBkaWUgRWlubGFkdW5nIGFiZ2VsZWhudCEnXHJcblx0XHRdO1xyXG5cclxuXHRcdGNvbmZpZy5wcml2YXRlQ2hhdC5jYWxsZXJTb2NrZXRJZCA9IGNvbmZpZy5zb2NrZXRTZXNzaW9uSWQ7XHJcblx0XHRjb25maWcucHJpdmF0ZUNoYXQuY2FsbGVyVXNlcm5hbWUgPSBjb25maWcuc29ja2V0RGF0YS51c2VybmFtZTtcclxuXHRcdGNvbmZpZy5wcml2YXRlQ2hhdC5yZXNwb25zZVNvY2tldElkID0gZGF0YS5jYWxsZXJTb2NrZXRJZDtcclxuXHRcdGNvbmZpZy5wcml2YXRlQ2hhdC51c2VybmFtZSA9IGRhdGEudXNlcm5hbWU7XHJcblx0XHRjb25maWcucHJpdmF0ZUNoYXQubWVzc2FnZSA9ICcnO1xyXG5cdFx0Y29uZmlnLnByaXZhdGVDaGF0LnRpbWVzdGFtcCA9ICcnO1xyXG5cdFx0Y29uZmlnLnNvY2tldFByaXZhdGVDaGF0QWN0aXZlID0gdHJ1ZTtcclxuXHJcblx0XHRzZXRQcml2YXRlQ2hhdFN0YXR1cygzKTtcclxuXHJcblx0XHRDaGF0UmVuZGVyZXIucmVuZGVyRGlhbG9nKHtcclxuXHRcdFx0dGl0bGU6J0VpbmxhZHVuZyB6dW0gcHJpdmF0ZW4gQ2hhdCcsXHJcblx0XHRcdHRleHQ6dHh0LCBidG50aXRsZTonQWJsZWhuZW4nLFxyXG5cdFx0XHRjb25maXJtOidhY2NlcHQnXHJcblx0XHR9KTtcclxuXHR9O1xyXG5cclxuXHR0aGlzLnNvY2tldFJlc3BvbnNlUmVmdXNlVXNlckludml0ZSA9IGZ1bmN0aW9uKGRhdGEpIHtcclxuXHJcblx0XHRpZiAoY29uZmlnLnNvY2tldFByaXZhdGVDaGF0QWN0aXZlID09PSB0cnVlICYmIGNvbmZpZy5wcml2YXRlQ2hhdC5yZXNwb25zZVNvY2tldElkID09PSBkYXRhLmNhbGxlclNvY2tldElkKSB7XHJcblxyXG5cdFx0XHRDaGF0UmVuZGVyZXIucmVuZGVyRGlhbG9nQm9keSgnRGVyIFVzZXIgaGF0IGRpZSBFaW5sYWR1bmcgYWJnZWxlaG50LCcpO1xyXG5cclxuXHRcdH1cclxuXHR9O1xyXG5cclxuXHR0aGlzLnNvY2tldFJlc3BvbnNlQWNjZXB0UHJpdmF0ZUNoYXQgPSBmdW5jdGlvbihkYXRhKSB7XHJcblxyXG5cdFx0aWYgKGNvbmZpZy5zb2NrZXRQcml2YXRlQ2hhdEFjdGl2ZSA9PT0gdHJ1ZSAmJiBjb25maWcucHJpdmF0ZUNoYXQucmVzcG9uc2VTb2NrZXRJZCA9PT0gZGF0YS5jYWxsZXJTb2NrZXRJZCkge1xyXG5cclxuXHRcdFx0Q2hhdFJlbmRlcmVyLnJlbmRlckRpYWxvZ0JvZHkoJ0RlciBVc2VyIGhhdCBkaWUgRWlubGFkdW5nIGFuZ2Vub21tZW4sIGJpdHRlIHdhcnRlbiwgTklDSFQgZGllc2VuIERpYWxvZyBzY2hsaWVzc2VuIScpO1xyXG5cclxuXHRcdFx0c2V0UHJpdmF0ZUNoYXRTdGF0dXMoNCk7XHJcblxyXG5cdFx0XHRjb25maWcuc29ja2V0LmVtaXQoJ3VzZXIgcHJpdmF0ZSBjaGF0IG9wZW4nLCB7XHJcblx0XHRcdFx0Y2FsbGVyU29ja2V0SWQgOiBjb25maWcucHJpdmF0ZUNoYXQuY2FsbGVyU29ja2V0SWQsXHJcblx0XHRcdFx0cmVzcG9uc2VTb2NrZXRJZCA6IGNvbmZpZy5wcml2YXRlQ2hhdC5yZXNwb25zZVNvY2tldElkLFxyXG5cdFx0XHRcdGNhbGxlclVzZXJuYW1lIDogY29uZmlnLnNvY2tldERhdGEudXNlcm5hbWVcclxuXHRcdFx0fSk7XHJcblxyXG5cdFx0fVxyXG5cdH07XHJcblxyXG5cdHRoaXMuc29ja2V0UmVzcG9uc2VPcGVuUHJpdmF0ZUNoYXQgPSBmdW5jdGlvbiAoZGF0YSkge1xyXG5cclxuXHRcdGNvbmZpZy5wcml2YXRlQ2hhdC5tZXNzYWdlID0gY29uZmlnLnByaXZhdGVDaGF0LnVzZXJuYW1lICsgJyBoYXQgZGVuIFJhdW0gYmV0cmV0ZW4nO1xyXG5cdFx0Y29uZmlnLnByaXZhdGVDaGF0LnRpbWVzdGFtcCA9IGRhdGEudGltZXN0YW1wO1xyXG5cclxuXHRcdHNldFByaXZhdGVDaGF0U3RhdHVzKDIpO1xyXG5cclxuXHRcdENoYXRSZW5kZXJlci5yZW5kZXJEaWFsb2cobnVsbCk7XHJcblx0XHRDaGF0UmVuZGVyZXIucmVuZGVyUHJpdmF0ZUNoYXQoKTtcclxuXHRcdENoYXRSZW5kZXJlci5yZW5kZXJQcml2YXRlQ2hhdE1lc3NhZ2UoJ3N0YXR1cycpO1xyXG5cclxuXHRcdGNvbmZpZy5zb2NrZXQuZW1pdCgndXNlciBwcml2YXRlIGNoYXQgbWVzc2FnZScsIHtcclxuXHRcdFx0Y2FsbGVyU29ja2V0SWQgOiBjb25maWcucHJpdmF0ZUNoYXQuY2FsbGVyU29ja2V0SWQsXHJcblx0XHRcdHJlc3BvbnNlU29ja2V0SWQgOiBjb25maWcucHJpdmF0ZUNoYXQucmVzcG9uc2VTb2NrZXRJZCxcclxuXHRcdFx0Y2FsbGVyVXNlcm5hbWUgOiBjb25maWcuc29ja2V0RGF0YS51c2VybmFtZVxyXG5cdFx0fSk7XHJcblxyXG5cdH07XHJcblxyXG5cdHRoaXMuc29ja2V0UmVzcG9uc2VNZXNzYWdlUHJpdmF0ZUNoYXQgPSBmdW5jdGlvbiAoZGF0YSkge1xyXG5cclxuXHRcdHZhciB0eXBlID0gJ21zZyc7XHJcblxyXG5cdFx0aWYgKGNvbmZpZy5zb2NrZXRQcml2YXRlQ2hhdEFjdGl2ZSA9PT0gdHJ1ZSAmJiBjb25maWcucHJpdmF0ZUNoYXQucmVzcG9uc2VTb2NrZXRJZCA9PT0gZGF0YS5jYWxsZXJTb2NrZXRJZCkge1xyXG5cclxuXHRcdFx0Y29uZmlnLnByaXZhdGVDaGF0Lm1lc3NhZ2UgPSBkYXRhLm1lc3NhZ2U7XHJcblx0XHRcdGNvbmZpZy5wcml2YXRlQ2hhdC50aW1lc3RhbXAgPSBkYXRhLnRpbWVzdGFtcDtcclxuXHJcblx0XHRcdGlmIChjb25maWcuc29ja2V0UHJpdmF0ZUNoYXRTdGF0dXMgPT09ICdhY2NlcHQnIHx8IGNvbmZpZy5zb2NrZXRQcml2YXRlQ2hhdFN0YXR1cyA9PT0gJ3JlcWRlY2lzaW9uJykge1xyXG5cclxuXHRcdFx0XHR0eXBlID0gJ3N0YXR1cyc7XHJcblx0XHRcdFx0Y29uZmlnLnByaXZhdGVDaGF0Lm1lc3NhZ2UgPSBjb25maWcucHJpdmF0ZUNoYXQudXNlcm5hbWUgKyAnIGhhdCBkZW4gUmF1bSBiZXRyZXRlbic7XHJcblxyXG5cdFx0XHRcdENoYXRSZW5kZXJlci5yZW5kZXJEaWFsb2cobnVsbCk7XHJcblx0XHRcdFx0Q2hhdFJlbmRlcmVyLnJlbmRlclByaXZhdGVDaGF0KCk7XHJcblxyXG5cdFx0XHR9XHJcblxyXG5cdFx0XHRzZXRQcml2YXRlQ2hhdFN0YXR1cygyKTtcclxuXHRcdFx0Q2hhdFJlbmRlcmVyLnJlbmRlclByaXZhdGVDaGF0TWVzc2FnZSh0eXBlKTtcclxuXHJcblx0XHR9XHJcblx0fTtcclxuXHJcblx0dGhpcy5zb2NrZXRSZXNwb25zZURpc2Nvbm5lY3RQcml2YXRlQ2hhdCA9IGZ1bmN0aW9uIChkYXRhKSB7XHJcblxyXG5cdFx0aWYgKGNvbmZpZy5zb2NrZXRQcml2YXRlQ2hhdEFjdGl2ZSA9PT0gdHJ1ZSAmJiBjb25maWcucHJpdmF0ZUNoYXQucmVzcG9uc2VTb2NrZXRJZCA9PT0gZGF0YS5jYWxsZXJTb2NrZXRJZCkge1xyXG5cclxuXHRcdFx0aWYgKGNvbmZpZy5zb2NrZXRQcml2YXRlQ2hhdFN0YXR1cyA9PT0gJ29wZW4nKSB7XHJcblxyXG5cdFx0XHRcdGNvbmZpZy5wcml2YXRlQ2hhdC5tZXNzYWdlID0gY29uZmlnLnByaXZhdGVDaGF0LnVzZXJuYW1lICsgJyBoYXQgZGVuIFJhdW0gdmVybGFzc2VuJztcclxuXHRcdFx0XHRjb25maWcucHJpdmF0ZUNoYXQudGltZXN0YW1wID0gZGF0YS50aW1lc3RhbXA7XHJcblxyXG5cdFx0XHRcdENoYXRSZW5kZXJlci5yZW5kZXJQcml2YXRlQ2hhdE1lc3NhZ2UoJ3N0YXR1cycpO1xyXG5cclxuXHRcdFx0fVxyXG5cclxuXHRcdFx0X3NlbGYuZGVsZXRlUHJpdmF0ZUNoYXRSZXF1ZXN0KCk7XHJcblxyXG5cdFx0fVxyXG5cdH07XHJcblxyXG5cdHJldHVybiB0aGlzO1xyXG59XHJcblxyXG5nbG9iYWwuYXBwID0gZ2xvYmFsLmFwcCB8fCB7fTtcclxuZ2xvYmFsLmFwcC5DaGF0TW9kZWwgPSBDaGF0TW9kZWw7IiwiXHJcbmZ1bmN0aW9uIENoYXRSZW5kZXJlciAoY29uZmlnKSB7XHJcblxyXG5cdGNvbmZpZy5kb20gPSB7XHJcblx0XHRjaGF0V3JhcHBlciA6ICQoJyNjaGF0V3JhcHBlcicpLFxyXG5cdFx0dXNlcm5hbWVGb3JtIDogJCgnI3VzZXJuYW1lRm9ybScpLFxyXG5cdFx0Y2hhdEZvcm0gOiAkKCcjY2hhdEZvcm0nKSxcclxuXHRcdHByaXZhdGVDaGF0Rm9ybSA6ICQoJyNwcml2YXRlQ2hhdEZvcm0nKSxcclxuXHRcdGNoYXRVc2VybmFtZSA6ICQoJ2lucHV0I2NoYXRVc2VybmFtZScpLFxyXG5cdFx0Y2hhdElucHV0IDogJCgnaW5wdXQjY2hhdElucHV0JyksXHJcblx0XHRwcml2YXRlQ2hhdElucHV0IDogJCgnaW5wdXQjcHJpdmF0ZUNoYXRJbnB1dCcpLFxyXG5cdFx0cHJpdmF0ZUNoYXRMaXN0IDogJCgndWwjcHJpdmF0ZUNoYXRMaXN0JyksXHJcblx0XHRjaGF0TGlzdCA6ICQoJyNjaGF0TGlzdCcpLFxyXG5cdFx0Y2hhdFVzZXJsaXN0IDogJCgnI2NoYXRVc2VybGlzdCcpLFxyXG5cdFx0Y2hhdERpYWxvZyA6ICQoJyNjaGF0RGlhbG9nJyksXHJcblx0XHRwcml2YXRlQ2hhdE1vZGFsIDogJCgnI3ByaXZhdGVDaGF0TW9kYWwnKSxcclxuXHRcdGJ0bkV4aXRDaGF0cm9vbSA6ICQoJyNidG5FeGl0Q2hhdHJvb20nKSxcclxuXHRcdGJ0bkNvbmZpcm0gOiAkKCcuYnRuLmJ0bi1zdWNjZXNzJyksXHJcblx0XHRpdGVtVXNlcmxpc3QgOiAkKCcudXNlcmxpc3QnLCcjY2hhdFVzZXJsaXN0JylcclxuXHR9O1xyXG5cclxuXHR2YXIgX3NlbGYgPSB0aGlzO1xyXG5cclxuXHRmdW5jdGlvbiB0aW1lc3RhbXAgKHNvY2tldHRpbWUpIHtcclxuXHJcblx0XHRzb2NrZXR0aW1lID0gJC50cmltKHNvY2tldHRpbWUpO1xyXG5cclxuXHRcdGlmKCAhIHNvY2tldHRpbWUubGVuZ3RoKSB7XHJcblx0XHRcdHJldHVybiAnJztcclxuXHRcdH1cclxuXHJcblx0XHR2YXIgdGltZSA9IG5ldyBEYXRlKHNvY2tldHRpbWUpO1xyXG5cdFx0dmFyIGggPSAodGltZS5nZXRIb3VycygpIDwgMTApID8gJzAnICsgdGltZS5nZXRIb3VycygpIDogdGltZS5nZXRIb3VycygpO1xyXG5cdFx0dmFyIG0gPSAodGltZS5nZXRNaW51dGVzKCkgPCAxMCkgPyAnMCcgKyB0aW1lLmdldE1pbnV0ZXMoKSA6IHRpbWUuZ2V0TWludXRlcygpO1xyXG5cclxuXHRcdHJldHVybiBoICsnOicrbTtcclxuXHR9XHJcblxyXG5cdHRoaXMucmVuZGVyQ2hhdGxpc3QgPSBmdW5jdGlvbiAodHlwZSwgdHh0LCB0aW1lKSB7XHJcblxyXG5cdFx0dmFyIHNwYW50aW1lc3RhbXAgPSAkKCc8c3Bhbj4nKS50ZXh0KCdbJyArIHRpbWVzdGFtcCh0aW1lKSArICddJyk7XHJcblx0XHR2YXIgbGkgPSAkKCc8bGk+Jyx7XCJjbGFzc1wiOlwiY2hhdGxpc3RfXCIgKyB0eXBlfSkuYXBwZW5kKHNwYW50aW1lc3RhbXAsIHR4dCk7XHJcblxyXG5cdFx0Y29uZmlnLmRvbS5jaGF0TGlzdC5hcHBlbmQobGkpO1xyXG5cdH07XHJcblxyXG5cdHRoaXMucmVuZGVyVXNlcmxpc3QgPSBmdW5jdGlvbiAodXNlcikge1xyXG5cclxuXHRcdHZhciB0aXRsZSA9ICh1c2VyLnNlc3Npb25JZCAhPT0gY29uZmlnLnNvY2tldFNlc3Npb25JZCkgPyAnT3BlbiBhIHByaXZhdGUgY2hhdCB3aXRoIHRoaXMgdXNlci4nIDogJ015IHVzZXJuYW1lJztcclxuXHRcdHZhciBjc3MgPSAodXNlci5zZXNzaW9uSWQgIT09IGNvbmZpZy5zb2NrZXRTZXNzaW9uSWQpID8gJ3VzZXJsaXN0JyA6ICd1c2VybGlzdF9zZWxmJztcclxuXHJcblx0XHR2YXIgbGkgPSAkKCc8bGk+Jyx7XCJjbGFzc1wiOmNzcywgXCJkYXRhLXNlc3NpZFwiOnVzZXIuc2Vzc2lvbklkLCBcInRpdGxlXCI6dGl0bGV9KS50ZXh0KHVzZXIudXNlcm5hbWUpO1xyXG5cdFx0Y29uZmlnLmRvbS5jaGF0VXNlcmxpc3QuYXBwZW5kKGxpKTtcclxuXHJcblx0fTtcclxuXHJcblx0dGhpcy5yZW5kZXJQcml2YXRlQ2hhdCA9IGZ1bmN0aW9uICgpIHtcclxuXHJcblx0XHQkKCcubW9kYWwtdGl0bGUnLCBjb25maWcuZG9tLnByaXZhdGVDaGF0TW9kYWwpLnRleHQoJ1ByaXZhdGUgQ2hhdCBtaXQgJyArIGNvbmZpZy5wcml2YXRlQ2hhdC51c2VybmFtZSk7XHJcblxyXG5cdFx0Y29uZmlnLmRvbS5wcml2YXRlQ2hhdE1vZGFsLm1vZGFsKCdzaG93Jyk7XHJcblxyXG5cdH07XHJcblxyXG5cdHRoaXMucmVuZGVyUHJpdmF0ZUNoYXRNZXNzYWdlID0gZnVuY3Rpb24gKHR5cGUpIHtcclxuXHJcblx0XHR2YXIgdGV4dCA9ICh0eXBlPT09J21zZycpID8gJyAnICsgY29uZmlnLnByaXZhdGVDaGF0LnVzZXJuYW1lICsgJyAnICsgY29uZmlnLnByaXZhdGVDaGF0Lm1lc3NhZ2UgOiAnICcgKyBjb25maWcucHJpdmF0ZUNoYXQubWVzc2FnZTtcclxuXHRcdHZhciBzcGFudGltZXN0YW1wID0gJCgnPHNwYW4+JykudGV4dCgnWycgKyB0aW1lc3RhbXAoY29uZmlnLnByaXZhdGVDaGF0LnRpbWVzdGFtcCkgKyAnXScpO1xyXG5cdFx0dmFyIGxpID0gJCgnPGxpPicse1wiY2xhc3NcIjpcImNoYXRsaXN0X3VzZXJcIn0pLmFwcGVuZChzcGFudGltZXN0YW1wLCB0ZXh0KTtcclxuXHJcblx0XHRjb25maWcuZG9tLnByaXZhdGVDaGF0TGlzdC5hcHBlbmQobGkpO1xyXG5cclxuXHR9O1xyXG5cclxuXHR0aGlzLnJlbmRlckRpYWxvZyA9IGZ1bmN0aW9uIChhcmcpIHtcclxuXHJcblx0XHRpZiAoYXJnID09PSBudWxsKSB7XHJcblxyXG5cdFx0XHRjb25maWcuZG9tLmNoYXREaWFsb2cubW9kYWwoJ2hpZGUnKTtcclxuXHRcdFx0cmV0dXJuIHRydWU7XHJcblxyXG5cdFx0fVxyXG5cclxuXHRcdHZhciBidG50aXRsZSA9IGFyZy5idG50aXRsZSB8fCAnc2NobGllc3Nlbic7XHJcblxyXG5cdFx0X3NlbGYucmVuZGVyRGlhbG9nQm9keSgnPHA+JyArIGFyZy50ZXh0LmpvaW4oJzwvcD48cD4nKSArICc8L3A+Jyk7XHJcblxyXG5cdFx0aWYgKGFyZy5oYXNPd25Qcm9wZXJ0eSgnY29uZmlybScpKSB7XHJcblxyXG5cdFx0XHQkKGNvbmZpZy5kb20uYnRuQ29uZmlybSAsIGNvbmZpZy5kb20uY2hhdERpYWxvZykuY3NzKCdkaXNwbGF5JywnYmxvY2snKTtcclxuXHJcblx0XHR9IGVsc2Uge1xyXG5cclxuXHRcdFx0JChjb25maWcuZG9tLmJ0bkNvbmZpcm0gLCBjb25maWcuZG9tLmNoYXREaWFsb2cpLmNzcygnZGlzcGxheScsJ25vbmUnKTtcclxuXHJcblx0XHR9XHJcblxyXG5cdFx0aWYoYXJnLmhhc093blByb3BlcnR5KCd0aXRsZScpKSB7XHJcblxyXG5cdFx0XHQkKCcubW9kYWwtdGl0bGUnLCBjb25maWcuZG9tLmNoYXREaWFsb2cpXHJcblx0XHRcdFx0LnRleHQoYXJnLnRpdGxlKTtcclxuXHRcdH1cclxuXHJcblx0XHQkKCcubW9kYWwtZm9vdGVyIGJ1dHRvbi5idG4uYnRuLXByaW1hcnknLCBjb25maWcuZG9tLmNoYXREaWFsb2cpXHJcblx0XHRcdC50ZXh0KGJ0bnRpdGxlKTtcclxuXHJcblx0XHRjb25maWcuZG9tLmNoYXREaWFsb2cubW9kYWwoJ3Nob3cnKTtcclxuXHJcblx0fTtcclxuXHJcblx0dGhpcy5yZW5kZXJEaWFsb2dCb2R5ID0gZnVuY3Rpb24gKHRleHQpIHtcclxuXHRcdCQoJy5tb2RhbC1ib2R5JywgY29uZmlnLmRvbS5jaGF0RGlhbG9nKVxyXG5cdFx0XHQuaHRtbCh0ZXh0KTtcclxuXHR9O1xyXG5cclxuXHR0aGlzLnRvZ2dsZUNoYXRMZXZlbCA9IGZ1bmN0aW9uICgpIHtcclxuXHJcblx0XHR2YXIgc2hvd2x2bDAgPSAnYmxvY2snO1xyXG5cdFx0dmFyIHNob3dsdmwxID0gJ25vbmUnO1xyXG5cclxuXHRcdGlmKCAkKCcuY2hhdEx2bDAnLCBjb25maWcuZG9tLmNoYXRXcmFwcGVyKS5jc3MoJ2Rpc3BsYXknKSAhPT0gJ25vbmUnKSB7XHJcblxyXG5cdFx0XHRzaG93bHZsMCA9ICdub25lJztcclxuXHRcdFx0c2hvd2x2bDEgPSAnYmxvY2snO1xyXG5cdFx0fVxyXG5cclxuXHRcdCQoJy5jaGF0THZsMCcsIGNvbmZpZy5kb20uY2hhdFdyYXBwZXIpLmNzcygnZGlzcGxheScsIHNob3dsdmwwKTtcclxuXHRcdCQoJy5jaGF0THZsMScsIGNvbmZpZy5kb20uY2hhdFdyYXBwZXIpLmNzcygnZGlzcGxheScsIHNob3dsdmwxKTtcclxuXHR9O1xyXG5cclxuXHR0aGlzLmVtcHR5Q2hhdExpc3QgPSBmdW5jdGlvbiAoKSB7XHJcblx0XHRjb25maWcuZG9tLmNoYXRMaXN0LmVtcHR5KCk7XHJcblx0fTtcclxuXHJcblx0dGhpcy5lbXB0eUNoYXRJbnB1dCA9IGZ1bmN0aW9uICgpIHtcclxuXHRcdGNvbmZpZy5kb20uY2hhdElucHV0LnZhbCgnJyk7XHJcblx0fTtcclxuXHJcblx0dGhpcy5lbXB0eVVzZXJMaXN0ID0gZnVuY3Rpb24gKCkge1xyXG5cdFx0Y29uZmlnLmRvbS5jaGF0VXNlcmxpc3QuZW1wdHkoKTtcclxuXHR9O1xyXG5cclxuXHR0aGlzLmVtcHR5Q2hhdFVzZXJuYW1lID0gZnVuY3Rpb24gKCkge1xyXG5cdFx0Y29uZmlnLmRvbS5jaGF0VXNlcm5hbWUudmFsKCcnKTtcclxuXHR9O1xyXG5cclxuXHR0aGlzLmVtcHR5UHJpdmF0ZUNoYXRJbnB1dCA9IGZ1bmN0aW9uICgpIHtcclxuXHRcdGNvbmZpZy5kb20ucHJpdmF0ZUNoYXRJbnB1dC52YWwoJycpO1xyXG5cdH07XHJcblxyXG5cdHJldHVybiB0aGlzO1xyXG59XHJcblxyXG5nbG9iYWwuYXBwID0gZ2xvYmFsLmFwcCB8fCB7fTtcclxuZ2xvYmFsLmFwcC5DaGF0UmVuZGVyZXIgPSBDaGF0UmVuZGVyZXI7XHJcbiIsIlxyXG5cclxuZnVuY3Rpb24gQ2hhdFNvY2tldExpc3RlbmVyIChNb2RlbCwgY29uZmlnKSB7XHJcblxyXG5cdGNvbmZpZy5zb2NrZXQub24oJ2xvZ2luIHN1Y2Nlc3MnLCBmdW5jdGlvbiAoZGF0YSkge1xyXG5cclxuXHRcdE1vZGVsLnNldExvZ2luU3VjY2VzcyhkYXRhKTtcclxuXHJcblx0fSk7XHJcblxyXG5cdGNvbmZpZy5zb2NrZXQub24oJ2xvZ2luIGVycm9yJywgZnVuY3Rpb24gKCkge1xyXG5cclxuXHRcdE1vZGVsLnNldExvZ2luRXJyb3IoJ0RlciBCZW51dHplcm5hbWUgaXN0IHVuZ8O8bHRpZycpO1xyXG5cclxuXHR9KTtcclxuXHJcblx0Y29uZmlnLnNvY2tldC5vbignbG9naW4gZXJyI3VzZXJuYW1lJywgZnVuY3Rpb24gKCkge1xyXG5cclxuXHRcdE1vZGVsLnNldExvZ2luRXJyb3IoJ0RlciBCZW51dHplcm5hbWUgd2lyZCBzY2hvbiBiZW7DvHR6dCwgYml0dGUgd8OkaGxlIGVpbmVuIGFuZGVyZW4gTmFtZW4uJyk7XHJcblxyXG5cdH0pO1xyXG5cclxuXHRjb25maWcuc29ja2V0Lm9uKCdjaGF0IG1lc3NhZ2UnLCBmdW5jdGlvbiAoZGF0YSkge1xyXG5cclxuXHRcdE1vZGVsLnNvY2tldFJlc3BvbnNlU2V0TWVzc2FnZShkYXRhKTtcclxuXHJcblx0fSk7XHJcblxyXG5cdGNvbmZpZy5zb2NrZXQub24oJ25ldyB1c2VyJywgZnVuY3Rpb24gKGRhdGEpIHtcclxuXHJcblx0XHRNb2RlbC5zb2NrZXRSZXNwb25zZVVzZXJOZXcoZGF0YSk7XHJcblx0fSk7XHJcblxyXG5cdGNvbmZpZy5zb2NrZXQub24oJ3VzZXIgZGlzY29ubmVjdCcsIGZ1bmN0aW9uIChkYXRhKSB7XHJcblxyXG5cdFx0TW9kZWwuc29ja2V0UmVzcG9uc2VVc2VyRGlzY29ubmVjdChkYXRhKTtcclxuXHJcblx0fSk7XHJcblxyXG5cdGNvbmZpZy5zb2NrZXQub24oJ3VzZXIgcHJpdmF0ZSBtZXNzYWdlIGludml0ZScsIGZ1bmN0aW9uIChkYXRhKSB7XHJcblxyXG5cdFx0TW9kZWwuc29ja2V0UmVzcG9uc2VVc2VySW52aXRlKGRhdGEpO1xyXG5cclxuXHR9KTtcclxuXHJcblx0Y29uZmlnLnNvY2tldC5vbigndXNlciBwcml2YXRlIGNoYXQgcmVmdXNlJywgZnVuY3Rpb24oZGF0YSkge1xyXG5cclxuXHRcdE1vZGVsLnNvY2tldFJlc3BvbnNlUmVmdXNlVXNlckludml0ZShkYXRhKTtcclxuXHJcblx0fSk7XHJcblxyXG5cdGNvbmZpZy5zb2NrZXQub24oJ3VzZXIgcHJpdmF0ZSBjaGF0IGFjY2VwdCcsIGZ1bmN0aW9uIChkYXRhKSB7XHJcblxyXG5cdFx0TW9kZWwuc29ja2V0UmVzcG9uc2VBY2NlcHRQcml2YXRlQ2hhdChkYXRhKTtcclxuXHJcblx0fSk7XHJcblxyXG5cdGNvbmZpZy5zb2NrZXQub24oJ3VzZXIgcHJpdmF0ZSBjaGF0IG9wZW4nLCBmdW5jdGlvbiAoZGF0YSkge1xyXG5cclxuXHRcdE1vZGVsLnNvY2tldFJlc3BvbnNlT3BlblByaXZhdGVDaGF0KGRhdGEpO1xyXG5cclxuXHR9KTtcclxuXHJcblx0Y29uZmlnLnNvY2tldC5vbigndXNlciBwcml2YXRlIGNoYXQgbWVzc2FnZScsIGZ1bmN0aW9uIChkYXRhKSB7XHJcblxyXG5cdFx0TW9kZWwuc29ja2V0UmVzcG9uc2VNZXNzYWdlUHJpdmF0ZUNoYXQoZGF0YSk7XHJcblxyXG5cdH0pO1xyXG5cclxuXHRjb25maWcuc29ja2V0Lm9uKCd1c2VyIHByaXZhdGUgY2hhdCBkaXNjb25uZWN0JywgZnVuY3Rpb24gKGRhdGEpIHtcclxuXHJcblx0XHRNb2RlbC5zb2NrZXRSZXNwb25zZURpc2Nvbm5lY3RQcml2YXRlQ2hhdChkYXRhKTtcclxuXHJcblx0fSk7XHJcblxyXG59XHJcblxyXG5nbG9iYWwuYXBwID0gZ2xvYmFsLmFwcCB8fCB7fTtcclxuZ2xvYmFsLmFwcC5DaGF0U29ja2V0TGlzdGVuZXIgPSBDaGF0U29ja2V0TGlzdGVuZXI7IiwiXHJcbiQoZG9jdW1lbnQpLnJlYWR5IChmdW5jdGlvbiAoKSB7XHJcblx0Z2xvYmFsLmFwcC5DaGF0Q29udHJvbGxlci5pbml0KCk7XHJcbn0pO1xyXG4iXX0=
