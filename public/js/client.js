(function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);var f=new Error("Cannot find module '"+o+"'");throw f.code="MODULE_NOT_FOUND",f}var l=n[o]={exports:{}};t[o][0].call(l.exports,function(e){var n=t[o][1][e];return s(n?n:e)},l,l.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(require,module,exports){
(function (global){

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
}).call(this,typeof global !== "undefined" ? global : typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {})

},{}],2:[function(require,module,exports){
(function (global){

function ChatEventListener (Model, dom) {

	dom.usernameForm.on('submit', function () {

		Model.addUser();

		return false;

	});

	dom.chatForm.on('submit', function () {

		Model.sendMessage();

		return false;

	});

	dom.privateChatForm.on('submit', function () {

		Model.sendPrivateMessage();

		return false;

	});

	dom.btnExitChatroom.on('click', function () {

		Model.socketDisconnect();

	});

	$(dom.btnConfirm , dom.chatDialog).on('mouseup', function () {

		Model.acceptPrivateChatRequest();

	});

	dom.chatUserlist.on('click', '.userlist', function () {

		Model.setPrivateChatRequest($(this).text(), $(this).attr('data-sessid'));

	});

	dom.chatDialog.on('hidden.bs.modal', function () {

		if ( Model.checkPrivateChatStatus('waiting') ) {

			Model.deletePrivateChatRequest();

		} else if ( Model.checkPrivateChatStatus('reqdecision') ) {

			Model.refusePrivateChatRequest();

		}
	});

	dom.privateChatModal.on('hidden.bs.modal', function () {

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

		$('.modal-title', config.dom.privateChatModal).text('Private Chat mit ' + config.privateChat.responseUsername);

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
}).call(this,typeof global !== "undefined" ? global : typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {})

},{}],6:[function(require,module,exports){
(function (global){

$(document).ready (function () {
	global.app.ChatController.init();
});

}).call(this,typeof global !== "undefined" ? global : typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {})

},{}]},{},[4,3,5,2,1,6])
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIm5vZGVfbW9kdWxlcy9icm93c2VyLXBhY2svX3ByZWx1ZGUuanMiLCJwdWJsaWMvanMvYXBwL0NoYXRDb250cm9sbGVyLmpzIiwicHVibGljL2pzL2FwcC9DaGF0RXZlbnRMaXN0ZW5lci5qcyIsInB1YmxpYy9qcy9hcHAvQ2hhdE1vZGVsLmpzIiwicHVibGljL2pzL2FwcC9DaGF0UmVuZGVyZXIuanMiLCJwdWJsaWMvanMvYXBwL0NoYXRTb2NrZXRMaXN0ZW5lci5qcyIsInB1YmxpYy9qcy9hcHAvaW5kZXguanMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7O0FDQUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7Ozs7O0FDOUJBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOzs7OztBQ2xFQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOzs7OztBQ3ZiQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7Ozs7O0FDM0pBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOzs7OztBQzlFQTtBQUNBO0FBQ0E7QUFDQTtBQUNBIiwiZmlsZSI6ImdlbmVyYXRlZC5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzQ29udGVudCI6WyIoZnVuY3Rpb24gZSh0LG4scil7ZnVuY3Rpb24gcyhvLHUpe2lmKCFuW29dKXtpZighdFtvXSl7dmFyIGE9dHlwZW9mIHJlcXVpcmU9PVwiZnVuY3Rpb25cIiYmcmVxdWlyZTtpZighdSYmYSlyZXR1cm4gYShvLCEwKTtpZihpKXJldHVybiBpKG8sITApO3ZhciBmPW5ldyBFcnJvcihcIkNhbm5vdCBmaW5kIG1vZHVsZSAnXCIrbytcIidcIik7dGhyb3cgZi5jb2RlPVwiTU9EVUxFX05PVF9GT1VORFwiLGZ9dmFyIGw9bltvXT17ZXhwb3J0czp7fX07dFtvXVswXS5jYWxsKGwuZXhwb3J0cyxmdW5jdGlvbihlKXt2YXIgbj10W29dWzFdW2VdO3JldHVybiBzKG4/bjplKX0sbCxsLmV4cG9ydHMsZSx0LG4scil9cmV0dXJuIG5bb10uZXhwb3J0c312YXIgaT10eXBlb2YgcmVxdWlyZT09XCJmdW5jdGlvblwiJiZyZXF1aXJlO2Zvcih2YXIgbz0wO288ci5sZW5ndGg7bysrKXMocltvXSk7cmV0dXJuIHN9KSIsIlxyXG5mdW5jdGlvbiBDaGF0Q29udHJvbGxlciAoKSB7XHJcblxyXG5cdHZhciBjb25maWcgPSB7XHJcblx0XHRzb2NrZXQgOiBudWxsLFxyXG5cdFx0ZG9tIDogbnVsbFxyXG5cdH07XHJcblxyXG5cdHZhciBNb2RlbCA9IG51bGw7XHJcblx0dmFyIENoYXRTb2NrZXRMaXN0ZW5lciA9IG51bGw7XHJcblx0dmFyIENoYXRFdmVudExpc3RlbmVyID0gbnVsbDtcclxuXHJcblx0dGhpcy5pbml0ID0gZnVuY3Rpb24gKCkge1xyXG5cclxuXHRcdGlmIChpbykge1xyXG5cclxuXHRcdFx0Y29uZmlnLnNvY2tldCA9IGlvKCk7XHJcblxyXG5cdFx0XHRNb2RlbCA9IG5ldyBnbG9iYWwuYXBwLkNoYXRNb2RlbChjb25maWcpO1xyXG5cdFx0XHRDaGF0U29ja2V0TGlzdGVuZXIgPSBuZXcgZ2xvYmFsLmFwcC5DaGF0U29ja2V0TGlzdGVuZXIoTW9kZWwsIGNvbmZpZy5zb2NrZXQpO1xyXG5cdFx0XHRDaGF0RXZlbnRMaXN0ZW5lciA9IG5ldyBnbG9iYWwuYXBwLkNoYXRFdmVudExpc3RlbmVyKE1vZGVsLCBjb25maWcuZG9tKTtcclxuXHJcblx0XHR9XHJcblx0fTtcclxuXHJcblx0cmV0dXJuIHRoaXM7XHJcblxyXG59XHJcblxyXG5nbG9iYWwuYXBwID0gZ2xvYmFsLmFwcCB8fCB7fTtcclxuZ2xvYmFsLmFwcC5DaGF0Q29udHJvbGxlciA9IG5ldyBDaGF0Q29udHJvbGxlcigpOyIsIlxyXG5mdW5jdGlvbiBDaGF0RXZlbnRMaXN0ZW5lciAoTW9kZWwsIGRvbSkge1xyXG5cclxuXHRkb20udXNlcm5hbWVGb3JtLm9uKCdzdWJtaXQnLCBmdW5jdGlvbiAoKSB7XHJcblxyXG5cdFx0TW9kZWwuYWRkVXNlcigpO1xyXG5cclxuXHRcdHJldHVybiBmYWxzZTtcclxuXHJcblx0fSk7XHJcblxyXG5cdGRvbS5jaGF0Rm9ybS5vbignc3VibWl0JywgZnVuY3Rpb24gKCkge1xyXG5cclxuXHRcdE1vZGVsLnNlbmRNZXNzYWdlKCk7XHJcblxyXG5cdFx0cmV0dXJuIGZhbHNlO1xyXG5cclxuXHR9KTtcclxuXHJcblx0ZG9tLnByaXZhdGVDaGF0Rm9ybS5vbignc3VibWl0JywgZnVuY3Rpb24gKCkge1xyXG5cclxuXHRcdE1vZGVsLnNlbmRQcml2YXRlTWVzc2FnZSgpO1xyXG5cclxuXHRcdHJldHVybiBmYWxzZTtcclxuXHJcblx0fSk7XHJcblxyXG5cdGRvbS5idG5FeGl0Q2hhdHJvb20ub24oJ2NsaWNrJywgZnVuY3Rpb24gKCkge1xyXG5cclxuXHRcdE1vZGVsLnNvY2tldERpc2Nvbm5lY3QoKTtcclxuXHJcblx0fSk7XHJcblxyXG5cdCQoZG9tLmJ0bkNvbmZpcm0gLCBkb20uY2hhdERpYWxvZykub24oJ21vdXNldXAnLCBmdW5jdGlvbiAoKSB7XHJcblxyXG5cdFx0TW9kZWwuYWNjZXB0UHJpdmF0ZUNoYXRSZXF1ZXN0KCk7XHJcblxyXG5cdH0pO1xyXG5cclxuXHRkb20uY2hhdFVzZXJsaXN0Lm9uKCdjbGljaycsICcudXNlcmxpc3QnLCBmdW5jdGlvbiAoKSB7XHJcblxyXG5cdFx0TW9kZWwuc2V0UHJpdmF0ZUNoYXRSZXF1ZXN0KCQodGhpcykudGV4dCgpLCAkKHRoaXMpLmF0dHIoJ2RhdGEtc2Vzc2lkJykpO1xyXG5cclxuXHR9KTtcclxuXHJcblx0ZG9tLmNoYXREaWFsb2cub24oJ2hpZGRlbi5icy5tb2RhbCcsIGZ1bmN0aW9uICgpIHtcclxuXHJcblx0XHRpZiAoIE1vZGVsLmNoZWNrUHJpdmF0ZUNoYXRTdGF0dXMoJ3dhaXRpbmcnKSApIHtcclxuXHJcblx0XHRcdE1vZGVsLmRlbGV0ZVByaXZhdGVDaGF0UmVxdWVzdCgpO1xyXG5cclxuXHRcdH0gZWxzZSBpZiAoIE1vZGVsLmNoZWNrUHJpdmF0ZUNoYXRTdGF0dXMoJ3JlcWRlY2lzaW9uJykgKSB7XHJcblxyXG5cdFx0XHRNb2RlbC5yZWZ1c2VQcml2YXRlQ2hhdFJlcXVlc3QoKTtcclxuXHJcblx0XHR9XHJcblx0fSk7XHJcblxyXG5cdGRvbS5wcml2YXRlQ2hhdE1vZGFsLm9uKCdoaWRkZW4uYnMubW9kYWwnLCBmdW5jdGlvbiAoKSB7XHJcblxyXG5cdFx0TW9kZWwuZGlzY29ubmVjdFByaXZhdGVDaGF0KCk7XHJcblxyXG5cdH0pO1xyXG59XHJcblxyXG5nbG9iYWwuYXBwID0gZ2xvYmFsLmFwcCB8fCB7fTtcclxuZ2xvYmFsLmFwcC5DaGF0RXZlbnRMaXN0ZW5lciA9IENoYXRFdmVudExpc3RlbmVyOyIsImZ1bmN0aW9uIENoYXRNb2RlbCAoY29uZmlnKSB7XHJcblxyXG5cdGNvbmZpZy5zb2NrZXRTZXNzaW9uSWQgPSAnJztcclxuXHRjb25maWcuc29ja2V0SXNEaXNjb25uZWN0ZWQgPSB0cnVlO1xyXG5cdGNvbmZpZy5zb2NrZXRQcml2YXRlQ2hhdEFjdGl2ZSA9IGZhbHNlLFxyXG5cdGNvbmZpZy5zb2NrZXRQcml2YXRlQ2hhdFN0YXR1cyA9ICdjbG9zZWQnO1xyXG5cclxuXHJcblx0Y29uZmlnLnNvY2tldERhdGEgPSB7XHJcblx0XHRtZXNzYWdlIDogJycsXHJcblx0XHR1c2VybmFtZSA6ICcnXHJcblx0fTtcclxuXHJcblx0Y29uZmlnLnByaXZhdGVDaGF0ID0ge1xyXG5cdFx0Y2FsbGVyU29ja2V0SWQgOiAnJyxcclxuXHRcdGNhbGxlclVzZXJuYW1lIDogJycsXHJcblx0XHRyZXNwb25zZVNvY2tldElkIDogJycsXHJcblx0XHRyZXNwb25zZVVzZXJuYW1lIDogJycsXHJcblx0XHRtZXNzYWdlIDogJycsXHJcblx0XHR0aW1lc3RhbXAgOiAnJ1xyXG5cdH07XHJcblxyXG5cdHZhciBDaGF0UmVuZGVyZXIgPSBuZXcgZ2xvYmFsLmFwcC5DaGF0UmVuZGVyZXIoY29uZmlnKTtcclxuXHR2YXIgcHJpdmF0ZVN0YXR1c0ZpbHRlciA9IFsnY2xvc2VkJywnd2FpdGluZycsJ29wZW4nLCdyZXFkZWNpc2lvbicsJ2FjY2VwdCddO1xyXG5cdHZhciBfc2VsZiA9IHRoaXM7XHJcblxyXG5cdGZ1bmN0aW9uIGFkZFRvQ2hhdGxpc3QgKGRhdGEsIHR5cGUpIHtcclxuXHJcblx0XHR2YXIgdHh0ID0gJyc7XHJcblxyXG5cdFx0c3dpdGNoICh0eXBlKSB7XHJcblx0XHRcdGNhc2UoJ21zZycpOlxyXG5cdFx0XHRcdHR4dCA9IGRhdGEudXNlcm5hbWUgKyAnIDogJyArIGRhdGEubWVzc2FnZTtcclxuXHRcdFx0XHRicmVhaztcclxuXHRcdFx0Y2FzZSgndXNlcicpOlxyXG5cdFx0XHRcdHR4dCA9IGRhdGEudXNlcm5hbWUgKyAnIGhhdCBkZW4gUmF1bSBiZXRyZXRlbic7XHJcblx0XHRcdFx0YnJlYWs7XHJcblx0XHRcdGNhc2UoJ2Rpc2Nvbm5lY3QnKTpcclxuXHRcdFx0XHR0eHQgPSBkYXRhLnVzZXJuYW1lICsgJyBoYXQgZGVuIFJhdW0gdmVybGFzc2VuJztcclxuXHRcdFx0XHRicmVhaztcclxuXHRcdH1cclxuXHJcblx0XHRDaGF0UmVuZGVyZXIucmVuZGVyQ2hhdGxpc3QodHlwZSwgdHh0LCBkYXRhLnRpbWVzdGFtcCk7XHJcblxyXG5cdH1cclxuXHJcblx0ZnVuY3Rpb24gYWRkVG9Vc2VybGlzdCAoZGF0YSkge1xyXG5cclxuXHRcdGlmICh0eXBlb2YgZGF0YSA9PT0gJ29iamVjdCcpIHtcclxuXHJcblx0XHRcdCQuZWFjaChkYXRhLCBmdW5jdGlvbiAoa2V5LHVzZXIpIHtcclxuXHJcblx0XHRcdFx0Q2hhdFJlbmRlcmVyLnJlbmRlclVzZXJsaXN0KHVzZXIpO1xyXG5cclxuXHRcdFx0fSk7XHJcblx0XHR9XHJcblx0fVxyXG5cclxuXHRmdW5jdGlvbiBjaGVja1VzZXJuYW1lICgpIHtcclxuXHRcdHJldHVybiAodHlwZW9mIGNvbmZpZy5zb2NrZXREYXRhLnVzZXJuYW1lID09PSAnc3RyaW5nJyAmJiBjb25maWcuc29ja2V0RGF0YS51c2VybmFtZS5sZW5ndGgpID8gdHJ1ZSA6IGZhbHNlO1xyXG5cdH1cclxuXHJcblx0ZnVuY3Rpb24gY2hlY2tNZXNzYWdlICgpIHtcclxuXHRcdHJldHVybiAodHlwZW9mIGNvbmZpZy5zb2NrZXREYXRhLm1lc3NhZ2UgPT09ICdzdHJpbmcnICYmIGNvbmZpZy5zb2NrZXREYXRhLm1lc3NhZ2UubGVuZ3RoKSA/IHRydWUgOiBmYWxzZTtcclxuXHR9XHJcblxyXG5cdGZ1bmN0aW9uIGNoZWNrUHJpdmF0ZUNoYXQgKCkge1xyXG5cclxuXHRcdHZhciByZXMgPSB0cnVlO1xyXG5cclxuXHRcdCQuZWFjaChjb25maWcucHJpdmF0ZUNoYXQsIGZ1bmN0aW9uIChrZXksIHZhbHVlKSB7XHJcblxyXG5cdFx0XHRpZiAoIHR5cGVvZiB2YWx1ZSAhPT0gJ3N0cmluZycgfHwgdHlwZW9mIHZhbHVlID09PSAnc3RyaW5nJyAmJiAhIHZhbHVlLmxlbmd0aCkge1xyXG5cclxuXHRcdFx0XHRyZXMgPSBmYWxzZTtcclxuXHRcdFx0XHRyZXR1cm4gcmVzO1xyXG5cclxuXHRcdFx0fVxyXG5cdFx0fSk7XHJcblxyXG5cdFx0cmV0dXJuIHJlcztcclxuXHR9XHJcblxyXG5cdGZ1bmN0aW9uIGdldFN0ckZvcm1hdGVkIChzdHIsIHN0cmxlbikge1xyXG5cclxuXHRcdHN0ciA9ICQudHJpbShzdHIpO1xyXG5cclxuXHRcdHJldHVybiAoc3RyLmxlbmd0aCA+IHN0cmxlbiApID8gc3RyLnN1YnN0cigwLHN0cmxlbi0xKSA6IHN0cjtcclxuXHR9XHJcblxyXG5cdGZ1bmN0aW9uIHNldE1lc3NhZ2UgKCkge1xyXG5cclxuXHRcdGNvbmZpZy5zb2NrZXREYXRhLm1lc3NhZ2UgPSBnZXRTdHJGb3JtYXRlZChjb25maWcuZG9tLmNoYXRJbnB1dC52YWwoKSwgMjAwKTtcclxuXHRcdENoYXRSZW5kZXJlci5lbXB0eUNoYXRJbnB1dCgpO1xyXG5cclxuXHR9XHJcblxyXG5cdGZ1bmN0aW9uIHNldFByaXZhdGVNZXNzYWdlICgpIHtcclxuXHJcblx0XHRjb25maWcucHJpdmF0ZUNoYXQubWVzc2FnZSA9IGdldFN0ckZvcm1hdGVkKGNvbmZpZy5kb20ucHJpdmF0ZUNoYXRJbnB1dC52YWwoKSwgMjAwKTtcclxuXHRcdENoYXRSZW5kZXJlci5lbXB0eVByaXZhdGVDaGF0SW5wdXQoKTtcclxuXHJcblx0fVxyXG5cclxuXHRmdW5jdGlvbiBzZXRVc2VybmFtZSAoKSB7XHJcblxyXG5cdFx0Y29uZmlnLnNvY2tldERhdGEudXNlcm5hbWUgPSBnZXRTdHJGb3JtYXRlZChjb25maWcuZG9tLmNoYXRVc2VybmFtZS52YWwoKSwgMzApO1xyXG5cdFx0Q2hhdFJlbmRlcmVyLmVtcHR5Q2hhdFVzZXJuYW1lKCk7XHJcblxyXG5cdH1cclxuXHJcblx0ZnVuY3Rpb24gc2V0UHJpdmF0ZUNoYXRTdGF0dXMgKHN0YXR1c2luZGV4KSB7XHJcblxyXG5cdFx0aWYgKHN0YXR1c2luZGV4KzEgPD0gcHJpdmF0ZVN0YXR1c0ZpbHRlci5sZW5ndGgpIHtcclxuXHJcblx0XHRcdGNvbmZpZy5zb2NrZXRQcml2YXRlQ2hhdFN0YXR1cyA9IHByaXZhdGVTdGF0dXNGaWx0ZXJbc3RhdHVzaW5kZXhdO1xyXG5cdFx0fVxyXG5cdH1cclxuXHJcblx0ZnVuY3Rpb24gcmVzZXRDaGF0ICgpIHtcclxuXHJcblx0XHRDaGF0UmVuZGVyZXIuZW1wdHlDaGF0TGlzdCgpO1xyXG5cdFx0Q2hhdFJlbmRlcmVyLmVtcHR5VXNlckxpc3QoKTtcclxuXHRcdGNvbmZpZy5zb2NrZXREYXRhLnVzZXJuYW1lID0gJyc7XHJcblx0fVxyXG5cclxuXHRmdW5jdGlvbiByZXNldFVzZXJsaXN0ICh1c2VybGlzdCkge1xyXG5cclxuXHRcdENoYXRSZW5kZXJlci5lbXB0eVVzZXJMaXN0KCk7XHJcblx0XHRhZGRUb1VzZXJsaXN0KHVzZXJsaXN0KTtcclxuXHJcblx0fVxyXG5cclxuXHR0aGlzLmFkZFVzZXIgPSBmdW5jdGlvbiAoKSB7XHJcblxyXG5cdFx0c2V0VXNlcm5hbWUoKTtcclxuXHJcblx0XHRpZiAoICEgY2hlY2tVc2VybmFtZSgpICkge1xyXG5cclxuXHRcdFx0Q2hhdFJlbmRlcmVyLnJlbmRlckRpYWxvZyh7dGV4dDonS2VpbmVuIGtvcnJla3RlbiBVc2VybmFtZW4gZ2VmdW5kZW4nfSk7XHJcblx0XHRcdHJldHVybiBmYWxzZTtcclxuXHJcblx0XHR9XHJcblxyXG5cdFx0aWYgKGNvbmZpZy5zb2NrZXRJc0Rpc2Nvbm5lY3RlZCA9PT0gdHJ1ZSkge1xyXG5cclxuXHRcdFx0Y29uZmlnLnNvY2tldC5jb25uZWN0KCk7XHJcblxyXG5cdFx0fVxyXG5cclxuXHRcdGNvbmZpZy5zb2NrZXQuZW1pdCgnYWRkIHVzZXInLCBjb25maWcuc29ja2V0RGF0YS51c2VybmFtZSk7XHJcblxyXG5cdH07XHJcblxyXG5cdHRoaXMuY2hlY2tQcml2YXRlQ2hhdFN0YXR1cyA9IGZ1bmN0aW9uIChzdGF0dXMpIHtcclxuXHRcdHJldHVybiAoIGNvbmZpZy5zb2NrZXRQcml2YXRlQ2hhdEFjdGl2ZSAmJiBjb25maWcuc29ja2V0UHJpdmF0ZUNoYXRTdGF0dXMgPT09IHN0YXR1cyApID8gdHJ1ZSA6IGZhbHNlO1xyXG5cdH07XHJcblxyXG5cdHRoaXMuc2VuZE1lc3NhZ2UgPSBmdW5jdGlvbiAoKSB7XHJcblxyXG5cdFx0c2V0TWVzc2FnZSgpO1xyXG5cclxuXHRcdGlmICggY2hlY2tNZXNzYWdlKCkgJiYgY2hlY2tVc2VybmFtZSgpICkge1xyXG5cclxuXHRcdFx0Y29uZmlnLnNvY2tldC5lbWl0KCdjaGF0IG1lc3NhZ2UnLCBjb25maWcuc29ja2V0RGF0YSk7XHJcblxyXG5cdFx0fSBlbHNlIHtcclxuXHJcblx0XHRcdENoYXRSZW5kZXJlci5yZW5kZXJEaWFsb2coe3RleHQ6J0tlaW5lIE5hY2hyaWNodCBnZWZ1bmRlbid9KTtcclxuXHJcblx0XHR9XHJcblx0fTtcclxuXHJcblx0dGhpcy5zZW5kUHJpdmF0ZU1lc3NhZ2UgPSBmdW5jdGlvbiAoKSB7XHJcblxyXG5cdFx0aWYgKCBjb25maWcuc29ja2V0UHJpdmF0ZUNoYXRBY3RpdmUgKSB7XHJcblxyXG5cdFx0XHRzZXRQcml2YXRlTWVzc2FnZSgpO1xyXG5cclxuXHRcdFx0aWYgKGNoZWNrUHJpdmF0ZUNoYXQoKSAmJiBjaGVja1VzZXJuYW1lKCkpIHtcclxuXHJcblx0XHRcdFx0Y29uZmlnLnNvY2tldC5lbWl0KCd1c2VyIHByaXZhdGUgY2hhdCBtZXNzYWdlJywgY29uZmlnLnByaXZhdGVDaGF0KTtcclxuXHJcblx0XHRcdFx0Y29uZmlnLnByaXZhdGVDaGF0LnRpbWVzdGFtcCA9IG5ldyBEYXRlKCk7XHJcblx0XHRcdFx0Y29uZmlnLnByaXZhdGVDaGF0Lm1lc3NhZ2UgPSBjb25maWcucHJpdmF0ZUNoYXQuY2FsbGVyVXNlcm5hbWUgKyAnICcgKyBjb25maWcucHJpdmF0ZUNoYXQubWVzc2FnZTtcclxuXHJcblx0XHRcdFx0Q2hhdFJlbmRlcmVyLnJlbmRlclByaXZhdGVDaGF0TWVzc2FnZSgnc3RhdHVzJyk7XHJcblxyXG5cdFx0XHR9XHJcblx0XHR9XHJcblx0fTtcclxuXHJcblx0dGhpcy5zZXRQcml2YXRlQ2hhdFJlcXVlc3QgPSBmdW5jdGlvbiAodXNlcm5hbWUsIHNlc3NvbmlkKSB7XHJcblxyXG5cdFx0aWYgKCAhIGNvbmZpZy5zb2NrZXRQcml2YXRlQ2hhdEFjdGl2ZSApIHtcclxuXHJcblx0XHRcdGlmIChjb25maWcuc29ja2V0U2Vzc2lvbklkICE9PSAnJyAmJiBjb25maWcuc29ja2V0U2Vzc2lvbklkICE9PSBzZXNzb25pZCkge1xyXG5cclxuXHRcdFx0XHR2YXIgdHh0ID0gW1xyXG5cdFx0XHRcdFx0J0RlciBVc2VyICcrdXNlcm5hbWUrJyB3aXJkIHp1bSBwcml2YXRlbiBDaGF0IGVpbmdlbGFkZW4sIGJpdHRlIHdhcnRlIGF1ZiBkaWUgQmVzdMOkdGlndW5nLicsXHJcblx0XHRcdFx0XHQnV2VubiBkdSBkaWVzZW4gRGlhbG9nIHNjaGxpZcOfdCwgZGFubiB3aXJkIGRpZSBFaW5sYWR1bmcgenVyw7xjayBnZXpvZ2VuISdcclxuXHRcdFx0XHRdO1xyXG5cclxuXHRcdFx0XHRjb25maWcucHJpdmF0ZUNoYXQuY2FsbGVyU29ja2V0SWQgPSBjb25maWcuc29ja2V0U2Vzc2lvbklkO1xyXG5cdFx0XHRcdGNvbmZpZy5wcml2YXRlQ2hhdC5jYWxsZXJVc2VybmFtZSA9IGNvbmZpZy5zb2NrZXREYXRhLnVzZXJuYW1lO1xyXG5cdFx0XHRcdGNvbmZpZy5wcml2YXRlQ2hhdC5yZXNwb25zZVNvY2tldElkID0gc2Vzc29uaWQ7XHJcblx0XHRcdFx0Y29uZmlnLnByaXZhdGVDaGF0LnJlc3BvbnNlVXNlcm5hbWUgPSB1c2VybmFtZTtcclxuXHRcdFx0XHRjb25maWcucHJpdmF0ZUNoYXQubWVzc2FnZSA9ICcnO1xyXG5cdFx0XHRcdGNvbmZpZy5wcml2YXRlQ2hhdC50aW1lc3RhbXAgPSAnJztcclxuXHRcdFx0XHRjb25maWcuc29ja2V0UHJpdmF0ZUNoYXRBY3RpdmUgPSB0cnVlO1xyXG5cclxuXHRcdFx0XHRzZXRQcml2YXRlQ2hhdFN0YXR1cygxKTtcclxuXHJcblx0XHRcdFx0Q2hhdFJlbmRlcmVyLnJlbmRlckRpYWxvZyh7XHJcblx0XHRcdFx0XHR0aXRsZTonUHJpdmF0ZSBDaGF0IEFuZnJhZ2UnLFxyXG5cdFx0XHRcdFx0dGV4dDp0eHQsXHJcblx0XHRcdFx0XHRidG50aXRsZTonQWJyZWNoZW4nXHJcblx0XHRcdFx0fSk7XHJcblxyXG5cdFx0XHRcdGNvbmZpZy5zb2NrZXQuZW1pdCgndXNlciBwcml2YXRlIGNoYXQgcmVxdWVzdCcsIGNvbmZpZy5wcml2YXRlQ2hhdCk7XHJcblxyXG5cdFx0XHR9XHJcblx0XHR9XHJcblx0fTtcclxuXHJcblx0dGhpcy5hY2NlcHRQcml2YXRlQ2hhdFJlcXVlc3QgPSBmdW5jdGlvbiAoKSB7XHJcblxyXG5cdFx0Y29uZmlnLnNvY2tldC5lbWl0KCd1c2VyIHByaXZhdGUgY2hhdCBhY2NlcHQnLCB7XHJcblx0XHRcdGNhbGxlclNvY2tldElkOmNvbmZpZy5wcml2YXRlQ2hhdC5jYWxsZXJTb2NrZXRJZCxcclxuXHRcdFx0cmVzcG9uc2VTb2NrZXRJZDpjb25maWcucHJpdmF0ZUNoYXQucmVzcG9uc2VTb2NrZXRJZFxyXG5cdFx0fSk7XHJcblxyXG5cdH07XHJcblxyXG5cdHRoaXMucmVmdXNlUHJpdmF0ZUNoYXRSZXF1ZXN0ID0gZnVuY3Rpb24oKSB7XHJcblxyXG5cdFx0Y29uZmlnLnNvY2tldC5lbWl0KCd1c2VyIHByaXZhdGUgY2hhdCByZWZ1c2UnLCB7XHJcblx0XHRcdGNhbGxlclNvY2tldElkOmNvbmZpZy5wcml2YXRlQ2hhdC5jYWxsZXJTb2NrZXRJZCxcclxuXHRcdFx0cmVzcG9uc2VTb2NrZXRJZDpjb25maWcucHJpdmF0ZUNoYXQucmVzcG9uc2VTb2NrZXRJZFxyXG5cdFx0fSk7XHJcblxyXG5cdFx0X3NlbGYuZGVsZXRlUHJpdmF0ZUNoYXRSZXF1ZXN0KCk7XHJcblx0fTtcclxuXHJcblx0dGhpcy5kZWxldGVQcml2YXRlQ2hhdFJlcXVlc3QgPSBmdW5jdGlvbiAoKSB7XHJcblxyXG5cdFx0Y29uZmlnLnByaXZhdGVDaGF0LmNhbGxlclNvY2tldElkID0gJyc7XHJcblx0XHRjb25maWcucHJpdmF0ZUNoYXQucmVzcG9uc2VTb2NrZXRJZCA9ICcnO1xyXG5cdFx0Y29uZmlnLnByaXZhdGVDaGF0LnJlc3BvbnNlVXNlcm5hbWUgPSAnJztcclxuXHRcdGNvbmZpZy5wcml2YXRlQ2hhdC5tZXNzYWdlID0gJyc7XHJcblx0XHRjb25maWcucHJpdmF0ZUNoYXQudGltZXN0YW1wID0gJyc7XHJcblx0XHRjb25maWcuc29ja2V0UHJpdmF0ZUNoYXRBY3RpdmUgPSBmYWxzZTtcclxuXHJcblx0XHRzZXRQcml2YXRlQ2hhdFN0YXR1cygwKTtcclxuXHR9O1xyXG5cclxuXHR0aGlzLmRpc2Nvbm5lY3RQcml2YXRlQ2hhdCA9IGZ1bmN0aW9uICgpIHtcclxuXHJcblx0XHRjb25maWcuc29ja2V0LmVtaXQoJ3VzZXIgcHJpdmF0ZSBjaGF0IGRpc2Nvbm5lY3QnLCB7XHJcblx0XHRcdGNhbGxlclNvY2tldElkOmNvbmZpZy5wcml2YXRlQ2hhdC5jYWxsZXJTb2NrZXRJZCxcclxuXHRcdFx0cmVzcG9uc2VTb2NrZXRJZDpjb25maWcucHJpdmF0ZUNoYXQucmVzcG9uc2VTb2NrZXRJZFxyXG5cdFx0fSk7XHJcblxyXG5cdFx0X3NlbGYuZGVsZXRlUHJpdmF0ZUNoYXRSZXF1ZXN0KCk7XHJcblx0fTtcclxuXHJcblx0dGhpcy5zb2NrZXREaXNjb25uZWN0ID0gZnVuY3Rpb24gKCkge1xyXG5cclxuXHRcdGNvbmZpZy5zb2NrZXQuZGlzY29ubmVjdCgpO1xyXG5cdFx0Y29uZmlnLnNvY2tldElzRGlzY29ubmVjdGVkID0gdHJ1ZTtcclxuXHRcdGNvbmZpZy5zb2NrZXRTZXNzaW9uSWQgPSAnJztcclxuXHJcblx0XHRyZXNldENoYXQoKTtcclxuXHRcdENoYXRSZW5kZXJlci50b2dnbGVDaGF0TGV2ZWwoKTtcclxuXHJcblx0fTtcclxuXHJcblx0dGhpcy5zZXRMb2dpblN1Y2Nlc3MgPSBmdW5jdGlvbiAoZGF0YSkge1xyXG5cclxuXHRcdGNvbmZpZy5zb2NrZXRJc0Rpc2Nvbm5lY3RlZCA9IGZhbHNlO1xyXG5cdFx0Y29uZmlnLnNvY2tldFNlc3Npb25JZCA9IGRhdGEuc2Vzc2lvbklkO1xyXG5cclxuXHRcdGFkZFRvVXNlcmxpc3QoZGF0YS51c2Vycyk7XHJcblx0XHRhZGRUb0NoYXRsaXN0KHt0aW1lc3RhbXA6ZGF0YS50aW1lc3RhbXAsdXNlcm5hbWU6ZGF0YS51c2VybmFtZX0sICd1c2VyJyk7XHJcblx0XHRDaGF0UmVuZGVyZXIudG9nZ2xlQ2hhdExldmVsKCk7XHJcblxyXG5cdH07XHJcblxyXG5cdHRoaXMuc2V0TG9naW5FcnJvciA9IGZ1bmN0aW9uIChlcnJvcikge1xyXG5cclxuXHRcdENoYXRSZW5kZXJlci5yZW5kZXJEaWFsb2coe3RleHQ6ZXJyb3J9KTtcclxuXHJcblx0fTtcclxuXHJcblx0dGhpcy5zb2NrZXRSZXNwb25zZVNldE1lc3NhZ2UgPSBmdW5jdGlvbiAoZGF0YSkge1xyXG5cclxuXHRcdGlmICggISBjb25maWcuc29ja2V0SXNEaXNjb25uZWN0ZWQpIHtcclxuXHJcblx0XHRcdGFkZFRvQ2hhdGxpc3QoZGF0YSwgJ21zZycpO1xyXG5cclxuXHRcdH1cclxuXHR9O1xyXG5cclxuXHR0aGlzLnNvY2tldFJlc3BvbnNlVXNlck5ldyA9IGZ1bmN0aW9uIChkYXRhKSB7XHJcblxyXG5cdFx0aWYgKCAhIGNvbmZpZy5zb2NrZXRJc0Rpc2Nvbm5lY3RlZCkge1xyXG5cclxuXHRcdFx0YWRkVG9DaGF0bGlzdCh7dGltZXN0YW1wOmRhdGEudGltZXN0YW1wLHVzZXJuYW1lOmRhdGEudXNlcm5hbWV9LCAndXNlcicpO1xyXG5cdFx0XHRhZGRUb1VzZXJsaXN0KHtcInVzZXJcIjp7dXNlcm5hbWU6ZGF0YS51c2VybmFtZSxzZXNzaW9uSWQ6ZGF0YS5zZXNzaW9uSWR9fSk7XHJcblxyXG5cdFx0fVxyXG5cdH07XHJcblxyXG5cdHRoaXMuc29ja2V0UmVzcG9uc2VVc2VyRGlzY29ubmVjdCA9IGZ1bmN0aW9uIChkYXRhKSB7XHJcblxyXG5cdFx0aWYgKCAhIGNvbmZpZy5zb2NrZXRJc0Rpc2Nvbm5lY3RlZCkge1xyXG5cclxuXHRcdFx0cmVzZXRVc2VybGlzdChkYXRhLnVzZXJzKTtcclxuXHRcdFx0YWRkVG9DaGF0bGlzdCh7dGltZXN0YW1wOmRhdGEudGltZXN0YW1wLCB1c2VybmFtZTpkYXRhLnVzZXJuYW1lfSwgJ2Rpc2Nvbm5lY3QnKTtcclxuXHJcblx0XHR9XHJcblx0fTtcclxuXHJcblx0dGhpcy5zb2NrZXRSZXNwb25zZVVzZXJJbnZpdGUgPSBmdW5jdGlvbiAoZGF0YSkge1xyXG5cclxuXHRcdHZhciB0eHQgPSBbXHJcblx0XHRcdCdEZXIgVXNlciAnK2RhdGEudXNlcm5hbWUrJyBtw7ZjaHRlIGRpY2ggenVtIHByaXZhdGVuIENoYXQgZWluZ2VsYWRlbi4nLFxyXG5cdFx0XHQnV2VubiBkdSBkaWVzZW4gRGlhbG9nIHNjaGxpZcOfdCwgZGFubiB3aXJkIGRpZSBFaW5sYWR1bmcgYWJnZWxlaG50ISdcclxuXHRcdF07XHJcblxyXG5cdFx0Y29uZmlnLnByaXZhdGVDaGF0LmNhbGxlclNvY2tldElkID0gY29uZmlnLnNvY2tldFNlc3Npb25JZDtcclxuXHRcdGNvbmZpZy5wcml2YXRlQ2hhdC5jYWxsZXJVc2VybmFtZSA9IGNvbmZpZy5zb2NrZXREYXRhLnVzZXJuYW1lO1xyXG5cdFx0Y29uZmlnLnByaXZhdGVDaGF0LnJlc3BvbnNlU29ja2V0SWQgPSBkYXRhLmNhbGxlclNvY2tldElkO1xyXG5cdFx0Y29uZmlnLnByaXZhdGVDaGF0LnJlc3BvbnNlVXNlcm5hbWUgPSBkYXRhLnVzZXJuYW1lO1xyXG5cdFx0Y29uZmlnLnByaXZhdGVDaGF0Lm1lc3NhZ2UgPSAnJztcclxuXHRcdGNvbmZpZy5wcml2YXRlQ2hhdC50aW1lc3RhbXAgPSAnJztcclxuXHRcdGNvbmZpZy5zb2NrZXRQcml2YXRlQ2hhdEFjdGl2ZSA9IHRydWU7XHJcblxyXG5cdFx0c2V0UHJpdmF0ZUNoYXRTdGF0dXMoMyk7XHJcblxyXG5cdFx0Q2hhdFJlbmRlcmVyLnJlbmRlckRpYWxvZyh7XHJcblx0XHRcdHRpdGxlOidFaW5sYWR1bmcgenVtIHByaXZhdGVuIENoYXQnLFxyXG5cdFx0XHR0ZXh0OnR4dCwgYnRudGl0bGU6J0FibGVobmVuJyxcclxuXHRcdFx0Y29uZmlybTonYWNjZXB0J1xyXG5cdFx0fSk7XHJcblx0fTtcclxuXHJcblx0dGhpcy5zb2NrZXRSZXNwb25zZVJlZnVzZVVzZXJJbnZpdGUgPSBmdW5jdGlvbihkYXRhKSB7XHJcblxyXG5cdFx0aWYgKGNvbmZpZy5zb2NrZXRQcml2YXRlQ2hhdEFjdGl2ZSA9PT0gdHJ1ZSAmJiBjb25maWcucHJpdmF0ZUNoYXQucmVzcG9uc2VTb2NrZXRJZCA9PT0gZGF0YS5jYWxsZXJTb2NrZXRJZCkge1xyXG5cclxuXHRcdFx0Q2hhdFJlbmRlcmVyLnJlbmRlckRpYWxvZ0JvZHkoJ0RlciBVc2VyIGhhdCBkaWUgRWlubGFkdW5nIGFiZ2VsZWhudCwnKTtcclxuXHJcblx0XHR9XHJcblx0fTtcclxuXHJcblx0dGhpcy5zb2NrZXRSZXNwb25zZUFjY2VwdFByaXZhdGVDaGF0ID0gZnVuY3Rpb24oZGF0YSkge1xyXG5cclxuXHRcdGlmIChjb25maWcuc29ja2V0UHJpdmF0ZUNoYXRBY3RpdmUgPT09IHRydWUgJiYgY29uZmlnLnByaXZhdGVDaGF0LnJlc3BvbnNlU29ja2V0SWQgPT09IGRhdGEuY2FsbGVyU29ja2V0SWQpIHtcclxuXHJcblx0XHRcdENoYXRSZW5kZXJlci5yZW5kZXJEaWFsb2dCb2R5KCdEZXIgVXNlciBoYXQgZGllIEVpbmxhZHVuZyBhbmdlbm9tbWVuLCBiaXR0ZSB3YXJ0ZW4sIE5JQ0hUIGRpZXNlbiBEaWFsb2cgc2NobGllc3NlbiEnKTtcclxuXHJcblx0XHRcdHNldFByaXZhdGVDaGF0U3RhdHVzKDQpO1xyXG5cclxuXHRcdFx0Y29uZmlnLnNvY2tldC5lbWl0KCd1c2VyIHByaXZhdGUgY2hhdCBvcGVuJywge1xyXG5cdFx0XHRcdGNhbGxlclNvY2tldElkIDogY29uZmlnLnByaXZhdGVDaGF0LmNhbGxlclNvY2tldElkLFxyXG5cdFx0XHRcdHJlc3BvbnNlU29ja2V0SWQgOiBjb25maWcucHJpdmF0ZUNoYXQucmVzcG9uc2VTb2NrZXRJZCxcclxuXHRcdFx0XHRjYWxsZXJVc2VybmFtZSA6IGNvbmZpZy5wcml2YXRlQ2hhdC5jYWxsZXJVc2VybmFtZVxyXG5cdFx0XHR9KTtcclxuXHJcblx0XHR9XHJcblx0fTtcclxuXHJcblx0dGhpcy5zb2NrZXRSZXNwb25zZU9wZW5Qcml2YXRlQ2hhdCA9IGZ1bmN0aW9uIChkYXRhKSB7XHJcblxyXG5cdFx0Y29uZmlnLnByaXZhdGVDaGF0Lm1lc3NhZ2UgPSBjb25maWcucHJpdmF0ZUNoYXQucmVzcG9uc2VVc2VybmFtZSArICcgaGF0IGRlbiBSYXVtIGJldHJldGVuJztcclxuXHRcdGNvbmZpZy5wcml2YXRlQ2hhdC50aW1lc3RhbXAgPSBkYXRhLnRpbWVzdGFtcDtcclxuXHJcblx0XHRzZXRQcml2YXRlQ2hhdFN0YXR1cygyKTtcclxuXHJcblx0XHRDaGF0UmVuZGVyZXIucmVuZGVyRGlhbG9nKG51bGwpO1xyXG5cdFx0Q2hhdFJlbmRlcmVyLnJlbmRlclByaXZhdGVDaGF0KCk7XHJcblx0XHRDaGF0UmVuZGVyZXIucmVuZGVyUHJpdmF0ZUNoYXRNZXNzYWdlKCdzdGF0dXMnKTtcclxuXHJcblx0XHRjb25maWcuc29ja2V0LmVtaXQoJ3VzZXIgcHJpdmF0ZSBjaGF0IG1lc3NhZ2UnLCB7XHJcblx0XHRcdGNhbGxlclNvY2tldElkIDogY29uZmlnLnByaXZhdGVDaGF0LmNhbGxlclNvY2tldElkLFxyXG5cdFx0XHRyZXNwb25zZVNvY2tldElkIDogY29uZmlnLnByaXZhdGVDaGF0LnJlc3BvbnNlU29ja2V0SWQsXHJcblx0XHRcdGNhbGxlclVzZXJuYW1lIDogY29uZmlnLnByaXZhdGVDaGF0LmNhbGxlclVzZXJuYW1lXHJcblx0XHR9KTtcclxuXHJcblx0fTtcclxuXHJcblx0dGhpcy5zb2NrZXRSZXNwb25zZU1lc3NhZ2VQcml2YXRlQ2hhdCA9IGZ1bmN0aW9uIChkYXRhKSB7XHJcblxyXG5cdFx0dmFyIHR5cGUgPSAnbXNnJztcclxuXHJcblx0XHRpZiAoY29uZmlnLnNvY2tldFByaXZhdGVDaGF0QWN0aXZlID09PSB0cnVlICYmIGNvbmZpZy5wcml2YXRlQ2hhdC5yZXNwb25zZVNvY2tldElkID09PSBkYXRhLmNhbGxlclNvY2tldElkKSB7XHJcblxyXG5cdFx0XHRjb25maWcucHJpdmF0ZUNoYXQubWVzc2FnZSA9IGRhdGEubWVzc2FnZTtcclxuXHRcdFx0Y29uZmlnLnByaXZhdGVDaGF0LnRpbWVzdGFtcCA9IGRhdGEudGltZXN0YW1wO1xyXG5cclxuXHRcdFx0aWYgKGNvbmZpZy5zb2NrZXRQcml2YXRlQ2hhdFN0YXR1cyA9PT0gJ2FjY2VwdCcgfHwgY29uZmlnLnNvY2tldFByaXZhdGVDaGF0U3RhdHVzID09PSAncmVxZGVjaXNpb24nKSB7XHJcblxyXG5cdFx0XHRcdHR5cGUgPSAnc3RhdHVzJztcclxuXHRcdFx0XHRjb25maWcucHJpdmF0ZUNoYXQubWVzc2FnZSA9IGNvbmZpZy5wcml2YXRlQ2hhdC5yZXNwb25zZVVzZXJuYW1lICsgJyBoYXQgZGVuIFJhdW0gYmV0cmV0ZW4nO1xyXG5cclxuXHRcdFx0XHRDaGF0UmVuZGVyZXIucmVuZGVyRGlhbG9nKG51bGwpO1xyXG5cdFx0XHRcdENoYXRSZW5kZXJlci5yZW5kZXJQcml2YXRlQ2hhdCgpO1xyXG5cclxuXHRcdFx0fVxyXG5cclxuXHRcdFx0c2V0UHJpdmF0ZUNoYXRTdGF0dXMoMik7XHJcblx0XHRcdENoYXRSZW5kZXJlci5yZW5kZXJQcml2YXRlQ2hhdE1lc3NhZ2UodHlwZSk7XHJcblxyXG5cdFx0fVxyXG5cdH07XHJcblxyXG5cdHRoaXMuc29ja2V0UmVzcG9uc2VEaXNjb25uZWN0UHJpdmF0ZUNoYXQgPSBmdW5jdGlvbiAoZGF0YSkge1xyXG5cclxuXHRcdGlmIChjb25maWcuc29ja2V0UHJpdmF0ZUNoYXRBY3RpdmUgPT09IHRydWUgJiYgY29uZmlnLnByaXZhdGVDaGF0LnJlc3BvbnNlU29ja2V0SWQgPT09IGRhdGEuY2FsbGVyU29ja2V0SWQpIHtcclxuXHJcblx0XHRcdGlmIChjb25maWcuc29ja2V0UHJpdmF0ZUNoYXRTdGF0dXMgPT09ICdvcGVuJykge1xyXG5cclxuXHRcdFx0XHRjb25maWcucHJpdmF0ZUNoYXQubWVzc2FnZSA9IGNvbmZpZy5wcml2YXRlQ2hhdC5yZXNwb25zZVVzZXJuYW1lICsgJyBoYXQgZGVuIFJhdW0gdmVybGFzc2VuJztcclxuXHRcdFx0XHRjb25maWcucHJpdmF0ZUNoYXQudGltZXN0YW1wID0gZGF0YS50aW1lc3RhbXA7XHJcblxyXG5cdFx0XHRcdENoYXRSZW5kZXJlci5yZW5kZXJQcml2YXRlQ2hhdE1lc3NhZ2UoJ3N0YXR1cycpO1xyXG5cclxuXHRcdFx0fVxyXG5cclxuXHRcdFx0X3NlbGYuZGVsZXRlUHJpdmF0ZUNoYXRSZXF1ZXN0KCk7XHJcblxyXG5cdFx0fVxyXG5cdH07XHJcblxyXG5cdHJldHVybiB0aGlzO1xyXG59XHJcblxyXG5nbG9iYWwuYXBwID0gZ2xvYmFsLmFwcCB8fCB7fTtcclxuZ2xvYmFsLmFwcC5DaGF0TW9kZWwgPSBDaGF0TW9kZWw7IiwiXHJcbmZ1bmN0aW9uIENoYXRSZW5kZXJlciAoY29uZmlnKSB7XHJcblxyXG5cdGNvbmZpZy5kb20gPSB7XHJcblx0XHRjaGF0V3JhcHBlciA6ICQoJyNjaGF0V3JhcHBlcicpLFxyXG5cdFx0dXNlcm5hbWVGb3JtIDogJCgnI3VzZXJuYW1lRm9ybScpLFxyXG5cdFx0Y2hhdEZvcm0gOiAkKCcjY2hhdEZvcm0nKSxcclxuXHRcdHByaXZhdGVDaGF0Rm9ybSA6ICQoJyNwcml2YXRlQ2hhdEZvcm0nKSxcclxuXHRcdGNoYXRVc2VybmFtZSA6ICQoJ2lucHV0I2NoYXRVc2VybmFtZScpLFxyXG5cdFx0Y2hhdElucHV0IDogJCgnaW5wdXQjY2hhdElucHV0JyksXHJcblx0XHRwcml2YXRlQ2hhdElucHV0IDogJCgnaW5wdXQjcHJpdmF0ZUNoYXRJbnB1dCcpLFxyXG5cdFx0cHJpdmF0ZUNoYXRMaXN0IDogJCgndWwjcHJpdmF0ZUNoYXRMaXN0JyksXHJcblx0XHRjaGF0TGlzdCA6ICQoJyNjaGF0TGlzdCcpLFxyXG5cdFx0Y2hhdFVzZXJsaXN0IDogJCgnI2NoYXRVc2VybGlzdCcpLFxyXG5cdFx0Y2hhdERpYWxvZyA6ICQoJyNjaGF0RGlhbG9nJyksXHJcblx0XHRwcml2YXRlQ2hhdE1vZGFsIDogJCgnI3ByaXZhdGVDaGF0TW9kYWwnKSxcclxuXHRcdGJ0bkV4aXRDaGF0cm9vbSA6ICQoJyNidG5FeGl0Q2hhdHJvb20nKSxcclxuXHRcdGJ0bkNvbmZpcm0gOiAkKCcuYnRuLmJ0bi1zdWNjZXNzJyksXHJcblx0XHRpdGVtVXNlcmxpc3QgOiAkKCcudXNlcmxpc3QnLCcjY2hhdFVzZXJsaXN0JylcclxuXHR9O1xyXG5cclxuXHR2YXIgX3NlbGYgPSB0aGlzO1xyXG5cclxuXHRmdW5jdGlvbiB0aW1lc3RhbXAgKHNvY2tldHRpbWUpIHtcclxuXHJcblx0XHRzb2NrZXR0aW1lID0gJC50cmltKHNvY2tldHRpbWUpO1xyXG5cclxuXHRcdGlmKCAhIHNvY2tldHRpbWUubGVuZ3RoKSB7XHJcblx0XHRcdHJldHVybiAnJztcclxuXHRcdH1cclxuXHJcblx0XHR2YXIgdGltZSA9IG5ldyBEYXRlKHNvY2tldHRpbWUpO1xyXG5cdFx0dmFyIGggPSAodGltZS5nZXRIb3VycygpIDwgMTApID8gJzAnICsgdGltZS5nZXRIb3VycygpIDogdGltZS5nZXRIb3VycygpO1xyXG5cdFx0dmFyIG0gPSAodGltZS5nZXRNaW51dGVzKCkgPCAxMCkgPyAnMCcgKyB0aW1lLmdldE1pbnV0ZXMoKSA6IHRpbWUuZ2V0TWludXRlcygpO1xyXG5cclxuXHRcdHJldHVybiBoICsnOicrbTtcclxuXHR9XHJcblxyXG5cdHRoaXMucmVuZGVyQ2hhdGxpc3QgPSBmdW5jdGlvbiAodHlwZSwgdHh0LCB0aW1lKSB7XHJcblxyXG5cdFx0dmFyIHNwYW50aW1lc3RhbXAgPSAkKCc8c3Bhbj4nKS50ZXh0KCdbJyArIHRpbWVzdGFtcCh0aW1lKSArICddJyk7XHJcblx0XHR2YXIgbGkgPSAkKCc8bGk+Jyx7XCJjbGFzc1wiOlwiY2hhdGxpc3RfXCIgKyB0eXBlfSkuYXBwZW5kKHNwYW50aW1lc3RhbXAsIHR4dCk7XHJcblxyXG5cdFx0Y29uZmlnLmRvbS5jaGF0TGlzdC5hcHBlbmQobGkpO1xyXG5cdH07XHJcblxyXG5cdHRoaXMucmVuZGVyVXNlcmxpc3QgPSBmdW5jdGlvbiAodXNlcikge1xyXG5cclxuXHRcdHZhciB0aXRsZSA9ICh1c2VyLnNlc3Npb25JZCAhPT0gY29uZmlnLnNvY2tldFNlc3Npb25JZCkgPyAnT3BlbiBhIHByaXZhdGUgY2hhdCB3aXRoIHRoaXMgdXNlci4nIDogJ015IHVzZXJuYW1lJztcclxuXHRcdHZhciBjc3MgPSAodXNlci5zZXNzaW9uSWQgIT09IGNvbmZpZy5zb2NrZXRTZXNzaW9uSWQpID8gJ3VzZXJsaXN0JyA6ICd1c2VybGlzdF9zZWxmJztcclxuXHJcblx0XHR2YXIgbGkgPSAkKCc8bGk+Jyx7XCJjbGFzc1wiOmNzcywgXCJkYXRhLXNlc3NpZFwiOnVzZXIuc2Vzc2lvbklkLCBcInRpdGxlXCI6dGl0bGV9KS50ZXh0KHVzZXIudXNlcm5hbWUpO1xyXG5cdFx0Y29uZmlnLmRvbS5jaGF0VXNlcmxpc3QuYXBwZW5kKGxpKTtcclxuXHJcblx0fTtcclxuXHJcblx0dGhpcy5yZW5kZXJQcml2YXRlQ2hhdCA9IGZ1bmN0aW9uICgpIHtcclxuXHJcblx0XHQkKCcubW9kYWwtdGl0bGUnLCBjb25maWcuZG9tLnByaXZhdGVDaGF0TW9kYWwpLnRleHQoJ1ByaXZhdGUgQ2hhdCBtaXQgJyArIGNvbmZpZy5wcml2YXRlQ2hhdC5yZXNwb25zZVVzZXJuYW1lKTtcclxuXHJcblx0XHRjb25maWcuZG9tLnByaXZhdGVDaGF0TW9kYWwubW9kYWwoJ3Nob3cnKTtcclxuXHJcblx0fTtcclxuXHJcblx0dGhpcy5yZW5kZXJQcml2YXRlQ2hhdE1lc3NhZ2UgPSBmdW5jdGlvbiAodHlwZSkge1xyXG5cclxuXHRcdHZhciB0ZXh0ID0gKHR5cGU9PT0nbXNnJykgPyAnICcgKyBjb25maWcucHJpdmF0ZUNoYXQudXNlcm5hbWUgKyAnICcgKyBjb25maWcucHJpdmF0ZUNoYXQubWVzc2FnZSA6ICcgJyArIGNvbmZpZy5wcml2YXRlQ2hhdC5tZXNzYWdlO1xyXG5cdFx0dmFyIHNwYW50aW1lc3RhbXAgPSAkKCc8c3Bhbj4nKS50ZXh0KCdbJyArIHRpbWVzdGFtcChjb25maWcucHJpdmF0ZUNoYXQudGltZXN0YW1wKSArICddJyk7XHJcblx0XHR2YXIgbGkgPSAkKCc8bGk+Jyx7XCJjbGFzc1wiOlwiY2hhdGxpc3RfdXNlclwifSkuYXBwZW5kKHNwYW50aW1lc3RhbXAsIHRleHQpO1xyXG5cclxuXHRcdGNvbmZpZy5kb20ucHJpdmF0ZUNoYXRMaXN0LmFwcGVuZChsaSk7XHJcblxyXG5cdH07XHJcblxyXG5cdHRoaXMucmVuZGVyRGlhbG9nID0gZnVuY3Rpb24gKGFyZykge1xyXG5cclxuXHRcdGlmIChhcmcgPT09IG51bGwpIHtcclxuXHJcblx0XHRcdGNvbmZpZy5kb20uY2hhdERpYWxvZy5tb2RhbCgnaGlkZScpO1xyXG5cdFx0XHRyZXR1cm4gdHJ1ZTtcclxuXHJcblx0XHR9XHJcblxyXG5cdFx0dmFyIGJ0bnRpdGxlID0gYXJnLmJ0bnRpdGxlIHx8ICdzY2hsaWVzc2VuJztcclxuXHJcblx0XHRfc2VsZi5yZW5kZXJEaWFsb2dCb2R5KCc8cD4nICsgYXJnLnRleHQuam9pbignPC9wPjxwPicpICsgJzwvcD4nKTtcclxuXHJcblx0XHRpZiAoYXJnLmhhc093blByb3BlcnR5KCdjb25maXJtJykpIHtcclxuXHJcblx0XHRcdCQoY29uZmlnLmRvbS5idG5Db25maXJtICwgY29uZmlnLmRvbS5jaGF0RGlhbG9nKS5jc3MoJ2Rpc3BsYXknLCdibG9jaycpO1xyXG5cclxuXHRcdH0gZWxzZSB7XHJcblxyXG5cdFx0XHQkKGNvbmZpZy5kb20uYnRuQ29uZmlybSAsIGNvbmZpZy5kb20uY2hhdERpYWxvZykuY3NzKCdkaXNwbGF5Jywnbm9uZScpO1xyXG5cclxuXHRcdH1cclxuXHJcblx0XHRpZihhcmcuaGFzT3duUHJvcGVydHkoJ3RpdGxlJykpIHtcclxuXHJcblx0XHRcdCQoJy5tb2RhbC10aXRsZScsIGNvbmZpZy5kb20uY2hhdERpYWxvZylcclxuXHRcdFx0XHQudGV4dChhcmcudGl0bGUpO1xyXG5cdFx0fVxyXG5cclxuXHRcdCQoJy5tb2RhbC1mb290ZXIgYnV0dG9uLmJ0bi5idG4tcHJpbWFyeScsIGNvbmZpZy5kb20uY2hhdERpYWxvZylcclxuXHRcdFx0LnRleHQoYnRudGl0bGUpO1xyXG5cclxuXHRcdGNvbmZpZy5kb20uY2hhdERpYWxvZy5tb2RhbCgnc2hvdycpO1xyXG5cclxuXHR9O1xyXG5cclxuXHR0aGlzLnJlbmRlckRpYWxvZ0JvZHkgPSBmdW5jdGlvbiAodGV4dCkge1xyXG5cdFx0JCgnLm1vZGFsLWJvZHknLCBjb25maWcuZG9tLmNoYXREaWFsb2cpXHJcblx0XHRcdC5odG1sKHRleHQpO1xyXG5cdH07XHJcblxyXG5cdHRoaXMudG9nZ2xlQ2hhdExldmVsID0gZnVuY3Rpb24gKCkge1xyXG5cclxuXHRcdHZhciBzaG93bHZsMCA9ICdibG9jayc7XHJcblx0XHR2YXIgc2hvd2x2bDEgPSAnbm9uZSc7XHJcblxyXG5cdFx0aWYoICQoJy5jaGF0THZsMCcsIGNvbmZpZy5kb20uY2hhdFdyYXBwZXIpLmNzcygnZGlzcGxheScpICE9PSAnbm9uZScpIHtcclxuXHJcblx0XHRcdHNob3dsdmwwID0gJ25vbmUnO1xyXG5cdFx0XHRzaG93bHZsMSA9ICdibG9jayc7XHJcblx0XHR9XHJcblxyXG5cdFx0JCgnLmNoYXRMdmwwJywgY29uZmlnLmRvbS5jaGF0V3JhcHBlcikuY3NzKCdkaXNwbGF5Jywgc2hvd2x2bDApO1xyXG5cdFx0JCgnLmNoYXRMdmwxJywgY29uZmlnLmRvbS5jaGF0V3JhcHBlcikuY3NzKCdkaXNwbGF5Jywgc2hvd2x2bDEpO1xyXG5cdH07XHJcblxyXG5cdHRoaXMuZW1wdHlDaGF0TGlzdCA9IGZ1bmN0aW9uICgpIHtcclxuXHRcdGNvbmZpZy5kb20uY2hhdExpc3QuZW1wdHkoKTtcclxuXHR9O1xyXG5cclxuXHR0aGlzLmVtcHR5Q2hhdElucHV0ID0gZnVuY3Rpb24gKCkge1xyXG5cdFx0Y29uZmlnLmRvbS5jaGF0SW5wdXQudmFsKCcnKTtcclxuXHR9O1xyXG5cclxuXHR0aGlzLmVtcHR5VXNlckxpc3QgPSBmdW5jdGlvbiAoKSB7XHJcblx0XHRjb25maWcuZG9tLmNoYXRVc2VybGlzdC5lbXB0eSgpO1xyXG5cdH07XHJcblxyXG5cdHRoaXMuZW1wdHlDaGF0VXNlcm5hbWUgPSBmdW5jdGlvbiAoKSB7XHJcblx0XHRjb25maWcuZG9tLmNoYXRVc2VybmFtZS52YWwoJycpO1xyXG5cdH07XHJcblxyXG5cdHRoaXMuZW1wdHlQcml2YXRlQ2hhdElucHV0ID0gZnVuY3Rpb24gKCkge1xyXG5cdFx0Y29uZmlnLmRvbS5wcml2YXRlQ2hhdElucHV0LnZhbCgnJyk7XHJcblx0fTtcclxuXHJcblx0cmV0dXJuIHRoaXM7XHJcbn1cclxuXHJcbmdsb2JhbC5hcHAgPSBnbG9iYWwuYXBwIHx8IHt9O1xyXG5nbG9iYWwuYXBwLkNoYXRSZW5kZXJlciA9IENoYXRSZW5kZXJlcjtcclxuIiwiXHJcblxyXG5mdW5jdGlvbiBDaGF0U29ja2V0TGlzdGVuZXIgKE1vZGVsLCBzb2NrZXQpIHtcclxuXHJcblx0c29ja2V0Lm9uKCdsb2dpbiBzdWNjZXNzJywgZnVuY3Rpb24gKGRhdGEpIHtcclxuXHJcblx0XHRNb2RlbC5zZXRMb2dpblN1Y2Nlc3MoZGF0YSk7XHJcblxyXG5cdH0pO1xyXG5cclxuXHRzb2NrZXQub24oJ2xvZ2luIGVycm9yJywgZnVuY3Rpb24gKCkge1xyXG5cclxuXHRcdE1vZGVsLnNldExvZ2luRXJyb3IoJ0RlciBCZW51dHplcm5hbWUgaXN0IHVuZ8O8bHRpZycpO1xyXG5cclxuXHR9KTtcclxuXHJcblx0c29ja2V0Lm9uKCdsb2dpbiBlcnIjdXNlcm5hbWUnLCBmdW5jdGlvbiAoKSB7XHJcblxyXG5cdFx0TW9kZWwuc2V0TG9naW5FcnJvcignRGVyIEJlbnV0emVybmFtZSB3aXJkIHNjaG9uIGJlbsO8dHp0LCBiaXR0ZSB3w6RobGUgZWluZW4gYW5kZXJlbiBOYW1lbi4nKTtcclxuXHJcblx0fSk7XHJcblxyXG5cdHNvY2tldC5vbignY2hhdCBtZXNzYWdlJywgZnVuY3Rpb24gKGRhdGEpIHtcclxuXHJcblx0XHRNb2RlbC5zb2NrZXRSZXNwb25zZVNldE1lc3NhZ2UoZGF0YSk7XHJcblxyXG5cdH0pO1xyXG5cclxuXHRzb2NrZXQub24oJ25ldyB1c2VyJywgZnVuY3Rpb24gKGRhdGEpIHtcclxuXHJcblx0XHRNb2RlbC5zb2NrZXRSZXNwb25zZVVzZXJOZXcoZGF0YSk7XHJcblx0fSk7XHJcblxyXG5cdHNvY2tldC5vbigndXNlciBkaXNjb25uZWN0JywgZnVuY3Rpb24gKGRhdGEpIHtcclxuXHJcblx0XHRNb2RlbC5zb2NrZXRSZXNwb25zZVVzZXJEaXNjb25uZWN0KGRhdGEpO1xyXG5cclxuXHR9KTtcclxuXHJcblx0c29ja2V0Lm9uKCd1c2VyIHByaXZhdGUgbWVzc2FnZSBpbnZpdGUnLCBmdW5jdGlvbiAoZGF0YSkge1xyXG5cclxuXHRcdE1vZGVsLnNvY2tldFJlc3BvbnNlVXNlckludml0ZShkYXRhKTtcclxuXHJcblx0fSk7XHJcblxyXG5cdHNvY2tldC5vbigndXNlciBwcml2YXRlIGNoYXQgcmVmdXNlJywgZnVuY3Rpb24oZGF0YSkge1xyXG5cclxuXHRcdE1vZGVsLnNvY2tldFJlc3BvbnNlUmVmdXNlVXNlckludml0ZShkYXRhKTtcclxuXHJcblx0fSk7XHJcblxyXG5cdHNvY2tldC5vbigndXNlciBwcml2YXRlIGNoYXQgYWNjZXB0JywgZnVuY3Rpb24gKGRhdGEpIHtcclxuXHJcblx0XHRNb2RlbC5zb2NrZXRSZXNwb25zZUFjY2VwdFByaXZhdGVDaGF0KGRhdGEpO1xyXG5cclxuXHR9KTtcclxuXHJcblx0c29ja2V0Lm9uKCd1c2VyIHByaXZhdGUgY2hhdCBvcGVuJywgZnVuY3Rpb24gKGRhdGEpIHtcclxuXHJcblx0XHRNb2RlbC5zb2NrZXRSZXNwb25zZU9wZW5Qcml2YXRlQ2hhdChkYXRhKTtcclxuXHJcblx0fSk7XHJcblxyXG5cdHNvY2tldC5vbigndXNlciBwcml2YXRlIGNoYXQgbWVzc2FnZScsIGZ1bmN0aW9uIChkYXRhKSB7XHJcblxyXG5cdFx0TW9kZWwuc29ja2V0UmVzcG9uc2VNZXNzYWdlUHJpdmF0ZUNoYXQoZGF0YSk7XHJcblxyXG5cdH0pO1xyXG5cclxuXHRzb2NrZXQub24oJ3VzZXIgcHJpdmF0ZSBjaGF0IGRpc2Nvbm5lY3QnLCBmdW5jdGlvbiAoZGF0YSkge1xyXG5cclxuXHRcdE1vZGVsLnNvY2tldFJlc3BvbnNlRGlzY29ubmVjdFByaXZhdGVDaGF0KGRhdGEpO1xyXG5cclxuXHR9KTtcclxuXHJcbn1cclxuXHJcbmdsb2JhbC5hcHAgPSBnbG9iYWwuYXBwIHx8IHt9O1xyXG5nbG9iYWwuYXBwLkNoYXRTb2NrZXRMaXN0ZW5lciA9IENoYXRTb2NrZXRMaXN0ZW5lcjsiLCJcclxuJChkb2N1bWVudCkucmVhZHkgKGZ1bmN0aW9uICgpIHtcclxuXHRnbG9iYWwuYXBwLkNoYXRDb250cm9sbGVyLmluaXQoKTtcclxufSk7XHJcbiJdfQ==
