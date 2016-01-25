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

	function setPrivateChatStatus (statusindex) {

		if (statusindex+1 <= privateStatusFilter.length) {

			config.socketPrivateChatStatus = privateStatusFilter[statusindex];
		}
	}

	function setPrivateChatClientMessage () {

		config.privateChat.timestamp = new Date();
		config.privateChat.message = config.privateChat.callerUsername + ' ' + config.privateChat.message;

		ChatRenderer.renderPrivateChatMessage('status');

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

		if ( ! filterUsername() ) {

			ChatRenderer.renderDialog({text:'Keinen korrekten Usernamen gefunden'});
			return false;

		}

		if (config.socketIsDisconnected === true) {

			config.socket.connect();

		}

		config.socket.emit('add user', config.socketData.username);

	};

	this.checkPrivateChatStatus = function (status) {
		return !!( config.socketPrivateChatActive && config.socketPrivateChatStatus === status );
	};

	this.sendMessage = function () {

		setMessage();

		if ( filterMessage() && filterUsername() ) {

			config.socket.emit('chat message', config.socketData);

		} else {

			ChatRenderer.renderDialog({text:'Keine Nachricht gefunden'});

		}
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

		config.socketPrivateChatActive = false;

		setPrivateChatObject(null, null);
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

	this.socketResponseLoginSuccess = function (data) {

		config.socketIsDisconnected = false;
		config.socketSessionId = data.sessionId;

		addToUserlist(data.users);
		addToChatlist({timestamp:data.timestamp,username:data.username}, 'user');
		ChatRenderer.toggleChatLevel();

	};

	this.socketResponseLoginError = function (error) {

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

		config.socketPrivateChatActive = true;

		setPrivateChatObject(data.callerSocketId, data.username);
		setPrivateChatStatus(3);

		ChatRenderer.renderDialog({
			title:'Einladung zum privaten Chat',
			text:txt, btntitle:'Ablehnen',
			confirm:'accept'
		});
	};

	this.socketResponseRefuseUserInvite = function(data) {

		if ( filterPrivateResponseStatus(data) ) {

			ChatRenderer.renderDialogBody('Der User hat die Einladung abgelehnt,');

		}
	};

	this.socketResponseAcceptPrivateChat = function(data) {

		if ( filterPrivateResponseStatus(data) ) {

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

		if ( filterPrivateResponseStatus(data) ) {

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

		if ( filterPrivateResponseStatus(data) ) {

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

		var text = (type==='msg') ? ' ' + config.privateChat.responseUsername + ' ' + config.privateChat.message : ' ' + config.privateChat.message;
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

		Model.socketResponseLoginSuccess(data);

	});

	socket.on('login error', function () {

		Model.socketResponseLoginError('Der Benutzername ist ungültig');

	});

	socket.on('login err#username', function () {

		Model.socketResponseLoginError('Der Benutzername wird schon benützt, bitte wähle einen anderen Namen.');

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
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIm5vZGVfbW9kdWxlcy9icm93c2VyLXBhY2svX3ByZWx1ZGUuanMiLCJwdWJsaWMvanMvYXBwL0NoYXRDb250cm9sbGVyLmpzIiwicHVibGljL2pzL2FwcC9DaGF0RXZlbnRMaXN0ZW5lci5qcyIsInB1YmxpYy9qcy9hcHAvQ2hhdE1vZGVsLmpzIiwicHVibGljL2pzL2FwcC9DaGF0UmVuZGVyZXIuanMiLCJwdWJsaWMvanMvYXBwL0NoYXRTb2NrZXRMaXN0ZW5lci5qcyIsInB1YmxpYy9qcy9hcHAvaW5kZXguanMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7O0FDQUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7Ozs7O0FDOUJBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOzs7OztBQ2xFQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7Ozs7QUM5Y0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOzs7OztBQzNKQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7Ozs7QUM5RUE7QUFDQTtBQUNBO0FBQ0E7QUFDQSIsImZpbGUiOiJnZW5lcmF0ZWQuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlc0NvbnRlbnQiOlsiKGZ1bmN0aW9uIGUodCxuLHIpe2Z1bmN0aW9uIHMobyx1KXtpZighbltvXSl7aWYoIXRbb10pe3ZhciBhPXR5cGVvZiByZXF1aXJlPT1cImZ1bmN0aW9uXCImJnJlcXVpcmU7aWYoIXUmJmEpcmV0dXJuIGEobywhMCk7aWYoaSlyZXR1cm4gaShvLCEwKTt2YXIgZj1uZXcgRXJyb3IoXCJDYW5ub3QgZmluZCBtb2R1bGUgJ1wiK28rXCInXCIpO3Rocm93IGYuY29kZT1cIk1PRFVMRV9OT1RfRk9VTkRcIixmfXZhciBsPW5bb109e2V4cG9ydHM6e319O3Rbb11bMF0uY2FsbChsLmV4cG9ydHMsZnVuY3Rpb24oZSl7dmFyIG49dFtvXVsxXVtlXTtyZXR1cm4gcyhuP246ZSl9LGwsbC5leHBvcnRzLGUsdCxuLHIpfXJldHVybiBuW29dLmV4cG9ydHN9dmFyIGk9dHlwZW9mIHJlcXVpcmU9PVwiZnVuY3Rpb25cIiYmcmVxdWlyZTtmb3IodmFyIG89MDtvPHIubGVuZ3RoO28rKylzKHJbb10pO3JldHVybiBzfSkiLCJcclxuZnVuY3Rpb24gQ2hhdENvbnRyb2xsZXIgKCkge1xyXG5cclxuXHR2YXIgY29uZmlnID0ge1xyXG5cdFx0c29ja2V0IDogbnVsbCxcclxuXHRcdGRvbSA6IG51bGxcclxuXHR9O1xyXG5cclxuXHR2YXIgTW9kZWwgPSBudWxsO1xyXG5cdHZhciBDaGF0U29ja2V0TGlzdGVuZXIgPSBudWxsO1xyXG5cdHZhciBDaGF0RXZlbnRMaXN0ZW5lciA9IG51bGw7XHJcblxyXG5cdHRoaXMuaW5pdCA9IGZ1bmN0aW9uICgpIHtcclxuXHJcblx0XHRpZiAoaW8pIHtcclxuXHJcblx0XHRcdGNvbmZpZy5zb2NrZXQgPSBpbygpO1xyXG5cclxuXHRcdFx0TW9kZWwgPSBuZXcgZ2xvYmFsLmFwcC5DaGF0TW9kZWwoY29uZmlnKTtcclxuXHRcdFx0Q2hhdFNvY2tldExpc3RlbmVyID0gbmV3IGdsb2JhbC5hcHAuQ2hhdFNvY2tldExpc3RlbmVyKE1vZGVsLCBjb25maWcuc29ja2V0KTtcclxuXHRcdFx0Q2hhdEV2ZW50TGlzdGVuZXIgPSBuZXcgZ2xvYmFsLmFwcC5DaGF0RXZlbnRMaXN0ZW5lcihNb2RlbCwgY29uZmlnLmRvbSk7XHJcblxyXG5cdFx0fVxyXG5cdH07XHJcblxyXG5cdHJldHVybiB0aGlzO1xyXG5cclxufVxyXG5cclxuZ2xvYmFsLmFwcCA9IGdsb2JhbC5hcHAgfHwge307XHJcbmdsb2JhbC5hcHAuQ2hhdENvbnRyb2xsZXIgPSBuZXcgQ2hhdENvbnRyb2xsZXIoKTsiLCJcclxuZnVuY3Rpb24gQ2hhdEV2ZW50TGlzdGVuZXIgKE1vZGVsLCBkb20pIHtcclxuXHJcblx0ZG9tLnVzZXJuYW1lRm9ybS5vbignc3VibWl0JywgZnVuY3Rpb24gKCkge1xyXG5cclxuXHRcdE1vZGVsLmFkZFVzZXIoKTtcclxuXHJcblx0XHRyZXR1cm4gZmFsc2U7XHJcblxyXG5cdH0pO1xyXG5cclxuXHRkb20uY2hhdEZvcm0ub24oJ3N1Ym1pdCcsIGZ1bmN0aW9uICgpIHtcclxuXHJcblx0XHRNb2RlbC5zZW5kTWVzc2FnZSgpO1xyXG5cclxuXHRcdHJldHVybiBmYWxzZTtcclxuXHJcblx0fSk7XHJcblxyXG5cdGRvbS5wcml2YXRlQ2hhdEZvcm0ub24oJ3N1Ym1pdCcsIGZ1bmN0aW9uICgpIHtcclxuXHJcblx0XHRNb2RlbC5zZW5kUHJpdmF0ZU1lc3NhZ2UoKTtcclxuXHJcblx0XHRyZXR1cm4gZmFsc2U7XHJcblxyXG5cdH0pO1xyXG5cclxuXHRkb20uYnRuRXhpdENoYXRyb29tLm9uKCdjbGljaycsIGZ1bmN0aW9uICgpIHtcclxuXHJcblx0XHRNb2RlbC5zb2NrZXREaXNjb25uZWN0KCk7XHJcblxyXG5cdH0pO1xyXG5cclxuXHQkKGRvbS5idG5Db25maXJtICwgZG9tLmNoYXREaWFsb2cpLm9uKCdtb3VzZXVwJywgZnVuY3Rpb24gKCkge1xyXG5cclxuXHRcdE1vZGVsLmFjY2VwdFByaXZhdGVDaGF0UmVxdWVzdCgpO1xyXG5cclxuXHR9KTtcclxuXHJcblx0ZG9tLmNoYXRVc2VybGlzdC5vbignY2xpY2snLCAnLnVzZXJsaXN0JywgZnVuY3Rpb24gKCkge1xyXG5cclxuXHRcdE1vZGVsLnNldFByaXZhdGVDaGF0UmVxdWVzdCgkKHRoaXMpLnRleHQoKSwgJCh0aGlzKS5hdHRyKCdkYXRhLXNlc3NpZCcpKTtcclxuXHJcblx0fSk7XHJcblxyXG5cdGRvbS5jaGF0RGlhbG9nLm9uKCdoaWRkZW4uYnMubW9kYWwnLCBmdW5jdGlvbiAoKSB7XHJcblxyXG5cdFx0aWYgKCBNb2RlbC5jaGVja1ByaXZhdGVDaGF0U3RhdHVzKCd3YWl0aW5nJykgKSB7XHJcblxyXG5cdFx0XHRNb2RlbC5kZWxldGVQcml2YXRlQ2hhdFJlcXVlc3QoKTtcclxuXHJcblx0XHR9IGVsc2UgaWYgKCBNb2RlbC5jaGVja1ByaXZhdGVDaGF0U3RhdHVzKCdyZXFkZWNpc2lvbicpICkge1xyXG5cclxuXHRcdFx0TW9kZWwucmVmdXNlUHJpdmF0ZUNoYXRSZXF1ZXN0KCk7XHJcblxyXG5cdFx0fVxyXG5cdH0pO1xyXG5cclxuXHRkb20ucHJpdmF0ZUNoYXRNb2RhbC5vbignaGlkZGVuLmJzLm1vZGFsJywgZnVuY3Rpb24gKCkge1xyXG5cclxuXHRcdE1vZGVsLmRpc2Nvbm5lY3RQcml2YXRlQ2hhdCgpO1xyXG5cclxuXHR9KTtcclxufVxyXG5cclxuZ2xvYmFsLmFwcCA9IGdsb2JhbC5hcHAgfHwge307XHJcbmdsb2JhbC5hcHAuQ2hhdEV2ZW50TGlzdGVuZXIgPSBDaGF0RXZlbnRMaXN0ZW5lcjsiLCJmdW5jdGlvbiBDaGF0TW9kZWwgKGNvbmZpZykge1xyXG5cclxuXHRjb25maWcuc29ja2V0U2Vzc2lvbklkID0gJyc7XHJcblx0Y29uZmlnLnNvY2tldElzRGlzY29ubmVjdGVkID0gdHJ1ZTtcclxuXHRjb25maWcuc29ja2V0UHJpdmF0ZUNoYXRBY3RpdmUgPSBmYWxzZSxcclxuXHRjb25maWcuc29ja2V0UHJpdmF0ZUNoYXRTdGF0dXMgPSAnY2xvc2VkJztcclxuXHJcblx0Y29uZmlnLnNvY2tldERhdGEgPSB7XHJcblx0XHRtZXNzYWdlIDogJycsXHJcblx0XHR1c2VybmFtZSA6ICcnXHJcblx0fTtcclxuXHJcblx0Y29uZmlnLnByaXZhdGVDaGF0ID0ge1xyXG5cdFx0Y2FsbGVyU29ja2V0SWQgOiAnJyxcclxuXHRcdGNhbGxlclVzZXJuYW1lIDogJycsXHJcblx0XHRyZXNwb25zZVNvY2tldElkIDogJycsXHJcblx0XHRyZXNwb25zZVVzZXJuYW1lIDogJycsXHJcblx0XHRtZXNzYWdlIDogJycsXHJcblx0XHR0aW1lc3RhbXAgOiAnJ1xyXG5cdH07XHJcblxyXG5cdHZhciBDaGF0UmVuZGVyZXIgPSBuZXcgZ2xvYmFsLmFwcC5DaGF0UmVuZGVyZXIoY29uZmlnKTtcclxuXHJcblx0dmFyIHByaXZhdGVTdGF0dXNGaWx0ZXIgPSBbJ2Nsb3NlZCcsJ3dhaXRpbmcnLCdvcGVuJywncmVxZGVjaXNpb24nLCdhY2NlcHQnXTtcclxuXHR2YXIgX3NlbGYgPSB0aGlzO1xyXG5cclxuXHRmdW5jdGlvbiBhZGRUb0NoYXRsaXN0IChkYXRhLCB0eXBlKSB7XHJcblxyXG5cdFx0dmFyIHR4dCA9ICcnO1xyXG5cclxuXHRcdHN3aXRjaCAodHlwZSkge1xyXG5cdFx0XHRjYXNlKCdtc2cnKTpcclxuXHRcdFx0XHR0eHQgPSBkYXRhLnVzZXJuYW1lICsgJyA6ICcgKyBkYXRhLm1lc3NhZ2U7XHJcblx0XHRcdFx0YnJlYWs7XHJcblx0XHRcdGNhc2UoJ3VzZXInKTpcclxuXHRcdFx0XHR0eHQgPSBkYXRhLnVzZXJuYW1lICsgJyBoYXQgZGVuIFJhdW0gYmV0cmV0ZW4nO1xyXG5cdFx0XHRcdGJyZWFrO1xyXG5cdFx0XHRjYXNlKCdkaXNjb25uZWN0Jyk6XHJcblx0XHRcdFx0dHh0ID0gZGF0YS51c2VybmFtZSArICcgaGF0IGRlbiBSYXVtIHZlcmxhc3Nlbic7XHJcblx0XHRcdFx0YnJlYWs7XHJcblx0XHR9XHJcblxyXG5cdFx0Q2hhdFJlbmRlcmVyLnJlbmRlckNoYXRsaXN0KHR5cGUsIHR4dCwgZGF0YS50aW1lc3RhbXApO1xyXG5cclxuXHR9XHJcblxyXG5cdGZ1bmN0aW9uIGFkZFRvVXNlcmxpc3QgKGRhdGEpIHtcclxuXHJcblx0XHRpZiAodHlwZW9mIGRhdGEgPT09ICdvYmplY3QnKSB7XHJcblxyXG5cdFx0XHQkLmVhY2goZGF0YSwgZnVuY3Rpb24gKGtleSx1c2VyKSB7XHJcblxyXG5cdFx0XHRcdENoYXRSZW5kZXJlci5yZW5kZXJVc2VybGlzdCh1c2VyKTtcclxuXHJcblx0XHRcdH0pO1xyXG5cdFx0fVxyXG5cdH1cclxuXHJcblx0ZnVuY3Rpb24gZmlsdGVyVXNlcm5hbWUgKCkge1xyXG5cdFx0cmV0dXJuICEhKHR5cGVvZiBjb25maWcuc29ja2V0RGF0YS51c2VybmFtZSA9PT0gJ3N0cmluZycgJiYgY29uZmlnLnNvY2tldERhdGEudXNlcm5hbWUubGVuZ3RoKTtcclxuXHR9XHJcblxyXG5cdGZ1bmN0aW9uIGZpbHRlck1lc3NhZ2UgKCkge1xyXG5cdFx0cmV0dXJuICEhKHR5cGVvZiBjb25maWcuc29ja2V0RGF0YS5tZXNzYWdlID09PSAnc3RyaW5nJyAmJiBjb25maWcuc29ja2V0RGF0YS5tZXNzYWdlLmxlbmd0aCk7XHJcblx0fVxyXG5cclxuXHRmdW5jdGlvbiBmaWx0ZXJQcml2YXRlUmVzcG9uc2VTdGF0dXMgKGRhdGEpIHtcclxuXHRcdHJldHVybiAhIShjb25maWcuc29ja2V0UHJpdmF0ZUNoYXRBY3RpdmUgPT09IHRydWUgJiYgY29uZmlnLnByaXZhdGVDaGF0LnJlc3BvbnNlU29ja2V0SWQgPT09IGRhdGEuY2FsbGVyU29ja2V0SWQpO1xyXG5cdH1cclxuXHJcblx0ZnVuY3Rpb24gZmlsdGVyUHJpdmF0ZUNoYXQgKCkge1xyXG5cclxuXHRcdHZhciByZXMgPSB0cnVlO1xyXG5cclxuXHRcdCQuZWFjaChjb25maWcucHJpdmF0ZUNoYXQsIGZ1bmN0aW9uIChrZXksIHZhbHVlKSB7XHJcblxyXG5cdFx0XHRpZiAoIHR5cGVvZiB2YWx1ZSAhPT0gJ3N0cmluZycgfHwgdHlwZW9mIHZhbHVlID09PSAnc3RyaW5nJyAmJiAhIHZhbHVlLmxlbmd0aCkge1xyXG5cclxuXHRcdFx0XHRyZXMgPSBmYWxzZTtcclxuXHRcdFx0XHRyZXR1cm4gcmVzO1xyXG5cclxuXHRcdFx0fVxyXG5cdFx0fSk7XHJcblxyXG5cdFx0cmV0dXJuIHJlcztcclxuXHR9XHJcblxyXG5cdGZ1bmN0aW9uIGdldFN0ckZvcm1hdGVkIChzdHIsIHN0cmxlbikge1xyXG5cclxuXHRcdHN0ciA9ICQudHJpbShzdHIpO1xyXG5cclxuXHRcdHJldHVybiAoc3RyLmxlbmd0aCA+IHN0cmxlbiApID8gc3RyLnN1YnN0cigwLHN0cmxlbi0xKSA6IHN0cjtcclxuXHR9XHJcblxyXG5cdGZ1bmN0aW9uIHNldE1lc3NhZ2UgKCkge1xyXG5cclxuXHRcdGNvbmZpZy5zb2NrZXREYXRhLm1lc3NhZ2UgPSBnZXRTdHJGb3JtYXRlZChjb25maWcuZG9tLmNoYXRJbnB1dC52YWwoKSwgMjAwKTtcclxuXHRcdENoYXRSZW5kZXJlci5lbXB0eUNoYXRJbnB1dCgpO1xyXG5cclxuXHR9XHJcblxyXG5cdGZ1bmN0aW9uIHNldFByaXZhdGVNZXNzYWdlICgpIHtcclxuXHJcblx0XHRjb25maWcucHJpdmF0ZUNoYXQubWVzc2FnZSA9IGdldFN0ckZvcm1hdGVkKGNvbmZpZy5kb20ucHJpdmF0ZUNoYXRJbnB1dC52YWwoKSwgMjAwKTtcclxuXHRcdENoYXRSZW5kZXJlci5lbXB0eVByaXZhdGVDaGF0SW5wdXQoKTtcclxuXHJcblx0fVxyXG5cclxuXHRmdW5jdGlvbiBzZXRVc2VybmFtZSAoKSB7XHJcblxyXG5cdFx0Y29uZmlnLnNvY2tldERhdGEudXNlcm5hbWUgPSBnZXRTdHJGb3JtYXRlZChjb25maWcuZG9tLmNoYXRVc2VybmFtZS52YWwoKSwgMzApO1xyXG5cdFx0Q2hhdFJlbmRlcmVyLmVtcHR5Q2hhdFVzZXJuYW1lKCk7XHJcblxyXG5cdH1cclxuXHJcblx0ZnVuY3Rpb24gc2V0UHJpdmF0ZUNoYXRPYmplY3QgKHJlc3BTZXNzaWQsIHJlc3BVc2VybmFtZSkge1xyXG5cclxuXHRcdGlmIChyZXNwU2Vzc2lkICE9PSBudWxsICYmIHJlc3BVc2VybmFtZSAhPT0gbnVsbCApe1xyXG5cclxuXHRcdFx0Y29uZmlnLnByaXZhdGVDaGF0ID0ge1xyXG5cdFx0XHRcdGNhbGxlclNvY2tldElkIDogY29uZmlnLnNvY2tldFNlc3Npb25JZCxcclxuXHRcdFx0XHRjYWxsZXJVc2VybmFtZSA6IGNvbmZpZy5zb2NrZXREYXRhLnVzZXJuYW1lLFxyXG5cdFx0XHRcdHJlc3BvbnNlU29ja2V0SWQgOiByZXNwU2Vzc2lkLFxyXG5cdFx0XHRcdHJlc3BvbnNlVXNlcm5hbWUgOiByZXNwVXNlcm5hbWUsXHJcblx0XHRcdFx0bWVzc2FnZSA6ICcnLFxyXG5cdFx0XHRcdHRpbWVzdGFtcCA6ICcnXHJcblx0XHRcdH07XHJcblxyXG5cdFx0fSBlbHNlIHtcclxuXHJcblx0XHRcdGNvbmZpZy5wcml2YXRlQ2hhdCA9IHtcclxuXHRcdFx0XHRjYWxsZXJTb2NrZXRJZCA6ICcnLFxyXG5cdFx0XHRcdGNhbGxlclVzZXJuYW1lIDogJycsXHJcblx0XHRcdFx0cmVzcG9uc2VTb2NrZXRJZCA6ICcnLFxyXG5cdFx0XHRcdHJlc3BvbnNlVXNlcm5hbWUgOiAnJyxcclxuXHRcdFx0XHRtZXNzYWdlIDogJycsXHJcblx0XHRcdFx0dGltZXN0YW1wIDogJydcclxuXHRcdFx0fTtcclxuXHRcdH1cclxuXHR9XHJcblxyXG5cdGZ1bmN0aW9uIHNldFByaXZhdGVDaGF0U3RhdHVzIChzdGF0dXNpbmRleCkge1xyXG5cclxuXHRcdGlmIChzdGF0dXNpbmRleCsxIDw9IHByaXZhdGVTdGF0dXNGaWx0ZXIubGVuZ3RoKSB7XHJcblxyXG5cdFx0XHRjb25maWcuc29ja2V0UHJpdmF0ZUNoYXRTdGF0dXMgPSBwcml2YXRlU3RhdHVzRmlsdGVyW3N0YXR1c2luZGV4XTtcclxuXHRcdH1cclxuXHR9XHJcblxyXG5cdGZ1bmN0aW9uIHNldFByaXZhdGVDaGF0Q2xpZW50TWVzc2FnZSAoKSB7XHJcblxyXG5cdFx0Y29uZmlnLnByaXZhdGVDaGF0LnRpbWVzdGFtcCA9IG5ldyBEYXRlKCk7XHJcblx0XHRjb25maWcucHJpdmF0ZUNoYXQubWVzc2FnZSA9IGNvbmZpZy5wcml2YXRlQ2hhdC5jYWxsZXJVc2VybmFtZSArICcgJyArIGNvbmZpZy5wcml2YXRlQ2hhdC5tZXNzYWdlO1xyXG5cclxuXHRcdENoYXRSZW5kZXJlci5yZW5kZXJQcml2YXRlQ2hhdE1lc3NhZ2UoJ3N0YXR1cycpO1xyXG5cclxuXHR9XHJcblxyXG5cdGZ1bmN0aW9uIHJlc2V0Q2hhdCAoKSB7XHJcblxyXG5cdFx0Q2hhdFJlbmRlcmVyLmVtcHR5Q2hhdExpc3QoKTtcclxuXHRcdENoYXRSZW5kZXJlci5lbXB0eVVzZXJMaXN0KCk7XHJcblx0XHRjb25maWcuc29ja2V0RGF0YS51c2VybmFtZSA9ICcnO1xyXG5cclxuXHR9XHJcblxyXG5cdGZ1bmN0aW9uIHJlc2V0VXNlcmxpc3QgKHVzZXJsaXN0KSB7XHJcblxyXG5cdFx0Q2hhdFJlbmRlcmVyLmVtcHR5VXNlckxpc3QoKTtcclxuXHRcdGFkZFRvVXNlcmxpc3QodXNlcmxpc3QpO1xyXG5cclxuXHR9XHJcblxyXG5cdHRoaXMuYWRkVXNlciA9IGZ1bmN0aW9uICgpIHtcclxuXHJcblx0XHRzZXRVc2VybmFtZSgpO1xyXG5cclxuXHRcdGlmICggISBmaWx0ZXJVc2VybmFtZSgpICkge1xyXG5cclxuXHRcdFx0Q2hhdFJlbmRlcmVyLnJlbmRlckRpYWxvZyh7dGV4dDonS2VpbmVuIGtvcnJla3RlbiBVc2VybmFtZW4gZ2VmdW5kZW4nfSk7XHJcblx0XHRcdHJldHVybiBmYWxzZTtcclxuXHJcblx0XHR9XHJcblxyXG5cdFx0aWYgKGNvbmZpZy5zb2NrZXRJc0Rpc2Nvbm5lY3RlZCA9PT0gdHJ1ZSkge1xyXG5cclxuXHRcdFx0Y29uZmlnLnNvY2tldC5jb25uZWN0KCk7XHJcblxyXG5cdFx0fVxyXG5cclxuXHRcdGNvbmZpZy5zb2NrZXQuZW1pdCgnYWRkIHVzZXInLCBjb25maWcuc29ja2V0RGF0YS51c2VybmFtZSk7XHJcblxyXG5cdH07XHJcblxyXG5cdHRoaXMuY2hlY2tQcml2YXRlQ2hhdFN0YXR1cyA9IGZ1bmN0aW9uIChzdGF0dXMpIHtcclxuXHRcdHJldHVybiAhISggY29uZmlnLnNvY2tldFByaXZhdGVDaGF0QWN0aXZlICYmIGNvbmZpZy5zb2NrZXRQcml2YXRlQ2hhdFN0YXR1cyA9PT0gc3RhdHVzICk7XHJcblx0fTtcclxuXHJcblx0dGhpcy5zZW5kTWVzc2FnZSA9IGZ1bmN0aW9uICgpIHtcclxuXHJcblx0XHRzZXRNZXNzYWdlKCk7XHJcblxyXG5cdFx0aWYgKCBmaWx0ZXJNZXNzYWdlKCkgJiYgZmlsdGVyVXNlcm5hbWUoKSApIHtcclxuXHJcblx0XHRcdGNvbmZpZy5zb2NrZXQuZW1pdCgnY2hhdCBtZXNzYWdlJywgY29uZmlnLnNvY2tldERhdGEpO1xyXG5cclxuXHRcdH0gZWxzZSB7XHJcblxyXG5cdFx0XHRDaGF0UmVuZGVyZXIucmVuZGVyRGlhbG9nKHt0ZXh0OidLZWluZSBOYWNocmljaHQgZ2VmdW5kZW4nfSk7XHJcblxyXG5cdFx0fVxyXG5cdH07XHJcblxyXG5cdHRoaXMuc2VuZFByaXZhdGVNZXNzYWdlID0gZnVuY3Rpb24gKCkge1xyXG5cclxuXHRcdGlmICggY29uZmlnLnNvY2tldFByaXZhdGVDaGF0QWN0aXZlICkge1xyXG5cclxuXHRcdFx0c2V0UHJpdmF0ZU1lc3NhZ2UoKTtcclxuXHJcblx0XHRcdGlmIChmaWx0ZXJQcml2YXRlQ2hhdCgpICYmIGZpbHRlclVzZXJuYW1lKCkpIHtcclxuXHJcblx0XHRcdFx0Y29uZmlnLnNvY2tldC5lbWl0KCd1c2VyIHByaXZhdGUgY2hhdCBtZXNzYWdlJywgY29uZmlnLnByaXZhdGVDaGF0KTtcclxuXHRcdFx0XHRzZXRQcml2YXRlQ2hhdENsaWVudE1lc3NhZ2UoKTtcclxuXHJcblx0XHRcdH1cclxuXHRcdH1cclxuXHR9O1xyXG5cclxuXHR0aGlzLnNldFByaXZhdGVDaGF0UmVxdWVzdCA9IGZ1bmN0aW9uICh1c2VybmFtZSwgc2Vzc29uaWQpIHtcclxuXHJcblx0XHRpZiAoICEgY29uZmlnLnNvY2tldFByaXZhdGVDaGF0QWN0aXZlICkge1xyXG5cclxuXHRcdFx0aWYgKGNvbmZpZy5zb2NrZXRTZXNzaW9uSWQgIT09ICcnICYmIGNvbmZpZy5zb2NrZXRTZXNzaW9uSWQgIT09IHNlc3NvbmlkKSB7XHJcblxyXG5cdFx0XHRcdHZhciB0eHQgPSBbXHJcblx0XHRcdFx0XHQnRGVyIFVzZXIgJyt1c2VybmFtZSsnIHdpcmQgenVtIHByaXZhdGVuIENoYXQgZWluZ2VsYWRlbiwgYml0dGUgd2FydGUgYXVmIGRpZSBCZXN0w6R0aWd1bmcuJyxcclxuXHRcdFx0XHRcdCdXZW5uIGR1IGRpZXNlbiBEaWFsb2cgc2NobGllw590LCBkYW5uIHdpcmQgZGllIEVpbmxhZHVuZyB6dXLDvGNrIGdlem9nZW4hJ1xyXG5cdFx0XHRcdF07XHJcblxyXG5cdFx0XHRcdGNvbmZpZy5zb2NrZXRQcml2YXRlQ2hhdEFjdGl2ZSA9IHRydWU7XHJcblxyXG5cdFx0XHRcdHNldFByaXZhdGVDaGF0T2JqZWN0KHNlc3NvbmlkLCB1c2VybmFtZSk7XHJcblx0XHRcdFx0c2V0UHJpdmF0ZUNoYXRTdGF0dXMoMSk7XHJcblxyXG5cdFx0XHRcdENoYXRSZW5kZXJlci5yZW5kZXJEaWFsb2coe1xyXG5cdFx0XHRcdFx0dGl0bGU6J1ByaXZhdGUgQ2hhdCBBbmZyYWdlJyxcclxuXHRcdFx0XHRcdHRleHQ6dHh0LFxyXG5cdFx0XHRcdFx0YnRudGl0bGU6J0FicmVjaGVuJ1xyXG5cdFx0XHRcdH0pO1xyXG5cclxuXHRcdFx0XHRjb25maWcuc29ja2V0LmVtaXQoJ3VzZXIgcHJpdmF0ZSBjaGF0IHJlcXVlc3QnLCBjb25maWcucHJpdmF0ZUNoYXQpO1xyXG5cclxuXHRcdFx0fVxyXG5cdFx0fVxyXG5cdH07XHJcblxyXG5cdHRoaXMuYWNjZXB0UHJpdmF0ZUNoYXRSZXF1ZXN0ID0gZnVuY3Rpb24gKCkge1xyXG5cclxuXHRcdGNvbmZpZy5zb2NrZXQuZW1pdCgndXNlciBwcml2YXRlIGNoYXQgYWNjZXB0Jywge1xyXG5cdFx0XHRjYWxsZXJTb2NrZXRJZDpjb25maWcucHJpdmF0ZUNoYXQuY2FsbGVyU29ja2V0SWQsXHJcblx0XHRcdHJlc3BvbnNlU29ja2V0SWQ6Y29uZmlnLnByaXZhdGVDaGF0LnJlc3BvbnNlU29ja2V0SWRcclxuXHRcdH0pO1xyXG5cclxuXHR9O1xyXG5cclxuXHR0aGlzLnJlZnVzZVByaXZhdGVDaGF0UmVxdWVzdCA9IGZ1bmN0aW9uKCkge1xyXG5cclxuXHRcdGNvbmZpZy5zb2NrZXQuZW1pdCgndXNlciBwcml2YXRlIGNoYXQgcmVmdXNlJywge1xyXG5cdFx0XHRjYWxsZXJTb2NrZXRJZDpjb25maWcucHJpdmF0ZUNoYXQuY2FsbGVyU29ja2V0SWQsXHJcblx0XHRcdHJlc3BvbnNlU29ja2V0SWQ6Y29uZmlnLnByaXZhdGVDaGF0LnJlc3BvbnNlU29ja2V0SWRcclxuXHRcdH0pO1xyXG5cclxuXHRcdF9zZWxmLmRlbGV0ZVByaXZhdGVDaGF0UmVxdWVzdCgpO1xyXG5cdH07XHJcblxyXG5cdHRoaXMuZGVsZXRlUHJpdmF0ZUNoYXRSZXF1ZXN0ID0gZnVuY3Rpb24gKCkge1xyXG5cclxuXHRcdGNvbmZpZy5zb2NrZXRQcml2YXRlQ2hhdEFjdGl2ZSA9IGZhbHNlO1xyXG5cclxuXHRcdHNldFByaXZhdGVDaGF0T2JqZWN0KG51bGwsIG51bGwpO1xyXG5cdFx0c2V0UHJpdmF0ZUNoYXRTdGF0dXMoMCk7XHJcblxyXG5cdH07XHJcblxyXG5cdHRoaXMuZGlzY29ubmVjdFByaXZhdGVDaGF0ID0gZnVuY3Rpb24gKCkge1xyXG5cclxuXHRcdGNvbmZpZy5zb2NrZXQuZW1pdCgndXNlciBwcml2YXRlIGNoYXQgZGlzY29ubmVjdCcsIHtcclxuXHRcdFx0Y2FsbGVyU29ja2V0SWQ6Y29uZmlnLnByaXZhdGVDaGF0LmNhbGxlclNvY2tldElkLFxyXG5cdFx0XHRyZXNwb25zZVNvY2tldElkOmNvbmZpZy5wcml2YXRlQ2hhdC5yZXNwb25zZVNvY2tldElkXHJcblx0XHR9KTtcclxuXHJcblx0XHRfc2VsZi5kZWxldGVQcml2YXRlQ2hhdFJlcXVlc3QoKTtcclxuXHR9O1xyXG5cclxuXHR0aGlzLnNvY2tldERpc2Nvbm5lY3QgPSBmdW5jdGlvbiAoKSB7XHJcblxyXG5cdFx0Y29uZmlnLnNvY2tldC5kaXNjb25uZWN0KCk7XHJcblx0XHRjb25maWcuc29ja2V0SXNEaXNjb25uZWN0ZWQgPSB0cnVlO1xyXG5cdFx0Y29uZmlnLnNvY2tldFNlc3Npb25JZCA9ICcnO1xyXG5cclxuXHRcdHJlc2V0Q2hhdCgpO1xyXG5cdFx0Q2hhdFJlbmRlcmVyLnRvZ2dsZUNoYXRMZXZlbCgpO1xyXG5cclxuXHR9O1xyXG5cclxuXHR0aGlzLnNvY2tldFJlc3BvbnNlTG9naW5TdWNjZXNzID0gZnVuY3Rpb24gKGRhdGEpIHtcclxuXHJcblx0XHRjb25maWcuc29ja2V0SXNEaXNjb25uZWN0ZWQgPSBmYWxzZTtcclxuXHRcdGNvbmZpZy5zb2NrZXRTZXNzaW9uSWQgPSBkYXRhLnNlc3Npb25JZDtcclxuXHJcblx0XHRhZGRUb1VzZXJsaXN0KGRhdGEudXNlcnMpO1xyXG5cdFx0YWRkVG9DaGF0bGlzdCh7dGltZXN0YW1wOmRhdGEudGltZXN0YW1wLHVzZXJuYW1lOmRhdGEudXNlcm5hbWV9LCAndXNlcicpO1xyXG5cdFx0Q2hhdFJlbmRlcmVyLnRvZ2dsZUNoYXRMZXZlbCgpO1xyXG5cclxuXHR9O1xyXG5cclxuXHR0aGlzLnNvY2tldFJlc3BvbnNlTG9naW5FcnJvciA9IGZ1bmN0aW9uIChlcnJvcikge1xyXG5cclxuXHRcdENoYXRSZW5kZXJlci5yZW5kZXJEaWFsb2coe3RleHQ6ZXJyb3J9KTtcclxuXHJcblx0fTtcclxuXHJcblx0dGhpcy5zb2NrZXRSZXNwb25zZVNldE1lc3NhZ2UgPSBmdW5jdGlvbiAoZGF0YSkge1xyXG5cclxuXHRcdGlmICggISBjb25maWcuc29ja2V0SXNEaXNjb25uZWN0ZWQpIHtcclxuXHJcblx0XHRcdGFkZFRvQ2hhdGxpc3QoZGF0YSwgJ21zZycpO1xyXG5cclxuXHRcdH1cclxuXHR9O1xyXG5cclxuXHR0aGlzLnNvY2tldFJlc3BvbnNlVXNlck5ldyA9IGZ1bmN0aW9uIChkYXRhKSB7XHJcblxyXG5cdFx0aWYgKCAhIGNvbmZpZy5zb2NrZXRJc0Rpc2Nvbm5lY3RlZCkge1xyXG5cclxuXHRcdFx0YWRkVG9DaGF0bGlzdCh7dGltZXN0YW1wOmRhdGEudGltZXN0YW1wLHVzZXJuYW1lOmRhdGEudXNlcm5hbWV9LCAndXNlcicpO1xyXG5cdFx0XHRhZGRUb1VzZXJsaXN0KHtcInVzZXJcIjp7dXNlcm5hbWU6ZGF0YS51c2VybmFtZSxzZXNzaW9uSWQ6ZGF0YS5zZXNzaW9uSWR9fSk7XHJcblxyXG5cdFx0fVxyXG5cdH07XHJcblxyXG5cdHRoaXMuc29ja2V0UmVzcG9uc2VVc2VyRGlzY29ubmVjdCA9IGZ1bmN0aW9uIChkYXRhKSB7XHJcblxyXG5cdFx0aWYgKCAhIGNvbmZpZy5zb2NrZXRJc0Rpc2Nvbm5lY3RlZCkge1xyXG5cclxuXHRcdFx0cmVzZXRVc2VybGlzdChkYXRhLnVzZXJzKTtcclxuXHRcdFx0YWRkVG9DaGF0bGlzdCh7dGltZXN0YW1wOmRhdGEudGltZXN0YW1wLCB1c2VybmFtZTpkYXRhLnVzZXJuYW1lfSwgJ2Rpc2Nvbm5lY3QnKTtcclxuXHJcblx0XHR9XHJcblx0fTtcclxuXHJcblx0dGhpcy5zb2NrZXRSZXNwb25zZVVzZXJJbnZpdGUgPSBmdW5jdGlvbiAoZGF0YSkge1xyXG5cclxuXHRcdHZhciB0eHQgPSBbXHJcblx0XHRcdCdEZXIgVXNlciAnK2RhdGEudXNlcm5hbWUrJyBtw7ZjaHRlIGRpY2ggenVtIHByaXZhdGVuIENoYXQgZWluZ2VsYWRlbi4nLFxyXG5cdFx0XHQnV2VubiBkdSBkaWVzZW4gRGlhbG9nIHNjaGxpZcOfdCwgZGFubiB3aXJkIGRpZSBFaW5sYWR1bmcgYWJnZWxlaG50ISdcclxuXHRcdF07XHJcblxyXG5cdFx0Y29uZmlnLnNvY2tldFByaXZhdGVDaGF0QWN0aXZlID0gdHJ1ZTtcclxuXHJcblx0XHRzZXRQcml2YXRlQ2hhdE9iamVjdChkYXRhLmNhbGxlclNvY2tldElkLCBkYXRhLnVzZXJuYW1lKTtcclxuXHRcdHNldFByaXZhdGVDaGF0U3RhdHVzKDMpO1xyXG5cclxuXHRcdENoYXRSZW5kZXJlci5yZW5kZXJEaWFsb2coe1xyXG5cdFx0XHR0aXRsZTonRWlubGFkdW5nIHp1bSBwcml2YXRlbiBDaGF0JyxcclxuXHRcdFx0dGV4dDp0eHQsIGJ0bnRpdGxlOidBYmxlaG5lbicsXHJcblx0XHRcdGNvbmZpcm06J2FjY2VwdCdcclxuXHRcdH0pO1xyXG5cdH07XHJcblxyXG5cdHRoaXMuc29ja2V0UmVzcG9uc2VSZWZ1c2VVc2VySW52aXRlID0gZnVuY3Rpb24oZGF0YSkge1xyXG5cclxuXHRcdGlmICggZmlsdGVyUHJpdmF0ZVJlc3BvbnNlU3RhdHVzKGRhdGEpICkge1xyXG5cclxuXHRcdFx0Q2hhdFJlbmRlcmVyLnJlbmRlckRpYWxvZ0JvZHkoJ0RlciBVc2VyIGhhdCBkaWUgRWlubGFkdW5nIGFiZ2VsZWhudCwnKTtcclxuXHJcblx0XHR9XHJcblx0fTtcclxuXHJcblx0dGhpcy5zb2NrZXRSZXNwb25zZUFjY2VwdFByaXZhdGVDaGF0ID0gZnVuY3Rpb24oZGF0YSkge1xyXG5cclxuXHRcdGlmICggZmlsdGVyUHJpdmF0ZVJlc3BvbnNlU3RhdHVzKGRhdGEpICkge1xyXG5cclxuXHRcdFx0Q2hhdFJlbmRlcmVyLnJlbmRlckRpYWxvZ0JvZHkoJ0RlciBVc2VyIGhhdCBkaWUgRWlubGFkdW5nIGFuZ2Vub21tZW4sIGJpdHRlIHdhcnRlbiwgTklDSFQgZGllc2VuIERpYWxvZyBzY2hsaWVzc2VuIScpO1xyXG5cclxuXHRcdFx0c2V0UHJpdmF0ZUNoYXRTdGF0dXMoNCk7XHJcblxyXG5cdFx0XHRjb25maWcuc29ja2V0LmVtaXQoJ3VzZXIgcHJpdmF0ZSBjaGF0IG9wZW4nLCB7XHJcblx0XHRcdFx0Y2FsbGVyU29ja2V0SWQgOiBjb25maWcucHJpdmF0ZUNoYXQuY2FsbGVyU29ja2V0SWQsXHJcblx0XHRcdFx0cmVzcG9uc2VTb2NrZXRJZCA6IGNvbmZpZy5wcml2YXRlQ2hhdC5yZXNwb25zZVNvY2tldElkLFxyXG5cdFx0XHRcdGNhbGxlclVzZXJuYW1lIDogY29uZmlnLnByaXZhdGVDaGF0LmNhbGxlclVzZXJuYW1lXHJcblx0XHRcdH0pO1xyXG5cclxuXHRcdH1cclxuXHR9O1xyXG5cclxuXHR0aGlzLnNvY2tldFJlc3BvbnNlT3BlblByaXZhdGVDaGF0ID0gZnVuY3Rpb24gKGRhdGEpIHtcclxuXHJcblx0XHRjb25maWcucHJpdmF0ZUNoYXQubWVzc2FnZSA9IGNvbmZpZy5wcml2YXRlQ2hhdC5yZXNwb25zZVVzZXJuYW1lICsgJyBoYXQgZGVuIFJhdW0gYmV0cmV0ZW4nO1xyXG5cdFx0Y29uZmlnLnByaXZhdGVDaGF0LnRpbWVzdGFtcCA9IGRhdGEudGltZXN0YW1wO1xyXG5cclxuXHRcdHNldFByaXZhdGVDaGF0U3RhdHVzKDIpO1xyXG5cclxuXHRcdENoYXRSZW5kZXJlci5yZW5kZXJEaWFsb2cobnVsbCk7XHJcblx0XHRDaGF0UmVuZGVyZXIucmVuZGVyUHJpdmF0ZUNoYXQoKTtcclxuXHRcdENoYXRSZW5kZXJlci5yZW5kZXJQcml2YXRlQ2hhdE1lc3NhZ2UoJ3N0YXR1cycpO1xyXG5cclxuXHRcdGNvbmZpZy5zb2NrZXQuZW1pdCgndXNlciBwcml2YXRlIGNoYXQgbWVzc2FnZScsIHtcclxuXHRcdFx0Y2FsbGVyU29ja2V0SWQgOiBjb25maWcucHJpdmF0ZUNoYXQuY2FsbGVyU29ja2V0SWQsXHJcblx0XHRcdHJlc3BvbnNlU29ja2V0SWQgOiBjb25maWcucHJpdmF0ZUNoYXQucmVzcG9uc2VTb2NrZXRJZCxcclxuXHRcdFx0Y2FsbGVyVXNlcm5hbWUgOiBjb25maWcucHJpdmF0ZUNoYXQuY2FsbGVyVXNlcm5hbWVcclxuXHRcdH0pO1xyXG5cclxuXHR9O1xyXG5cclxuXHR0aGlzLnNvY2tldFJlc3BvbnNlTWVzc2FnZVByaXZhdGVDaGF0ID0gZnVuY3Rpb24gKGRhdGEpIHtcclxuXHJcblx0XHR2YXIgdHlwZSA9ICdtc2cnO1xyXG5cclxuXHRcdGlmICggZmlsdGVyUHJpdmF0ZVJlc3BvbnNlU3RhdHVzKGRhdGEpICkge1xyXG5cclxuXHRcdFx0Y29uZmlnLnByaXZhdGVDaGF0Lm1lc3NhZ2UgPSBkYXRhLm1lc3NhZ2U7XHJcblx0XHRcdGNvbmZpZy5wcml2YXRlQ2hhdC50aW1lc3RhbXAgPSBkYXRhLnRpbWVzdGFtcDtcclxuXHJcblx0XHRcdGlmIChjb25maWcuc29ja2V0UHJpdmF0ZUNoYXRTdGF0dXMgPT09ICdhY2NlcHQnIHx8IGNvbmZpZy5zb2NrZXRQcml2YXRlQ2hhdFN0YXR1cyA9PT0gJ3JlcWRlY2lzaW9uJykge1xyXG5cclxuXHRcdFx0XHR0eXBlID0gJ3N0YXR1cyc7XHJcblx0XHRcdFx0Y29uZmlnLnByaXZhdGVDaGF0Lm1lc3NhZ2UgPSBjb25maWcucHJpdmF0ZUNoYXQucmVzcG9uc2VVc2VybmFtZSArICcgaGF0IGRlbiBSYXVtIGJldHJldGVuJztcclxuXHJcblx0XHRcdFx0Q2hhdFJlbmRlcmVyLnJlbmRlckRpYWxvZyhudWxsKTtcclxuXHRcdFx0XHRDaGF0UmVuZGVyZXIucmVuZGVyUHJpdmF0ZUNoYXQoKTtcclxuXHJcblx0XHRcdH1cclxuXHJcblx0XHRcdHNldFByaXZhdGVDaGF0U3RhdHVzKDIpO1xyXG5cdFx0XHRDaGF0UmVuZGVyZXIucmVuZGVyUHJpdmF0ZUNoYXRNZXNzYWdlKHR5cGUpO1xyXG5cclxuXHRcdH1cclxuXHR9O1xyXG5cclxuXHR0aGlzLnNvY2tldFJlc3BvbnNlRGlzY29ubmVjdFByaXZhdGVDaGF0ID0gZnVuY3Rpb24gKGRhdGEpIHtcclxuXHJcblx0XHRpZiAoIGZpbHRlclByaXZhdGVSZXNwb25zZVN0YXR1cyhkYXRhKSApIHtcclxuXHJcblx0XHRcdGlmIChjb25maWcuc29ja2V0UHJpdmF0ZUNoYXRTdGF0dXMgPT09ICdvcGVuJykge1xyXG5cclxuXHRcdFx0XHRjb25maWcucHJpdmF0ZUNoYXQubWVzc2FnZSA9IGNvbmZpZy5wcml2YXRlQ2hhdC5yZXNwb25zZVVzZXJuYW1lICsgJyBoYXQgZGVuIFJhdW0gdmVybGFzc2VuJztcclxuXHRcdFx0XHRjb25maWcucHJpdmF0ZUNoYXQudGltZXN0YW1wID0gZGF0YS50aW1lc3RhbXA7XHJcblxyXG5cdFx0XHRcdENoYXRSZW5kZXJlci5yZW5kZXJQcml2YXRlQ2hhdE1lc3NhZ2UoJ3N0YXR1cycpO1xyXG5cclxuXHRcdFx0fVxyXG5cclxuXHRcdFx0X3NlbGYuZGVsZXRlUHJpdmF0ZUNoYXRSZXF1ZXN0KCk7XHJcblxyXG5cdFx0fVxyXG5cdH07XHJcblxyXG5cdHJldHVybiB0aGlzO1xyXG59XHJcblxyXG5nbG9iYWwuYXBwID0gZ2xvYmFsLmFwcCB8fCB7fTtcclxuZ2xvYmFsLmFwcC5DaGF0TW9kZWwgPSBDaGF0TW9kZWw7IiwiXHJcbmZ1bmN0aW9uIENoYXRSZW5kZXJlciAoY29uZmlnKSB7XHJcblxyXG5cdGNvbmZpZy5kb20gPSB7XHJcblx0XHRjaGF0V3JhcHBlciA6ICQoJyNjaGF0V3JhcHBlcicpLFxyXG5cdFx0dXNlcm5hbWVGb3JtIDogJCgnI3VzZXJuYW1lRm9ybScpLFxyXG5cdFx0Y2hhdEZvcm0gOiAkKCcjY2hhdEZvcm0nKSxcclxuXHRcdHByaXZhdGVDaGF0Rm9ybSA6ICQoJyNwcml2YXRlQ2hhdEZvcm0nKSxcclxuXHRcdGNoYXRVc2VybmFtZSA6ICQoJ2lucHV0I2NoYXRVc2VybmFtZScpLFxyXG5cdFx0Y2hhdElucHV0IDogJCgnaW5wdXQjY2hhdElucHV0JyksXHJcblx0XHRwcml2YXRlQ2hhdElucHV0IDogJCgnaW5wdXQjcHJpdmF0ZUNoYXRJbnB1dCcpLFxyXG5cdFx0cHJpdmF0ZUNoYXRMaXN0IDogJCgndWwjcHJpdmF0ZUNoYXRMaXN0JyksXHJcblx0XHRjaGF0TGlzdCA6ICQoJyNjaGF0TGlzdCcpLFxyXG5cdFx0Y2hhdFVzZXJsaXN0IDogJCgnI2NoYXRVc2VybGlzdCcpLFxyXG5cdFx0Y2hhdERpYWxvZyA6ICQoJyNjaGF0RGlhbG9nJyksXHJcblx0XHRwcml2YXRlQ2hhdE1vZGFsIDogJCgnI3ByaXZhdGVDaGF0TW9kYWwnKSxcclxuXHRcdGJ0bkV4aXRDaGF0cm9vbSA6ICQoJyNidG5FeGl0Q2hhdHJvb20nKSxcclxuXHRcdGJ0bkNvbmZpcm0gOiAkKCcuYnRuLmJ0bi1zdWNjZXNzJyksXHJcblx0XHRpdGVtVXNlcmxpc3QgOiAkKCcudXNlcmxpc3QnLCcjY2hhdFVzZXJsaXN0JylcclxuXHR9O1xyXG5cclxuXHR2YXIgX3NlbGYgPSB0aGlzO1xyXG5cclxuXHRmdW5jdGlvbiB0aW1lc3RhbXAgKHNvY2tldHRpbWUpIHtcclxuXHJcblx0XHRzb2NrZXR0aW1lID0gJC50cmltKHNvY2tldHRpbWUpO1xyXG5cclxuXHRcdGlmKCAhIHNvY2tldHRpbWUubGVuZ3RoKSB7XHJcblx0XHRcdHJldHVybiAnJztcclxuXHRcdH1cclxuXHJcblx0XHR2YXIgdGltZSA9IG5ldyBEYXRlKHNvY2tldHRpbWUpO1xyXG5cdFx0dmFyIGggPSAodGltZS5nZXRIb3VycygpIDwgMTApID8gJzAnICsgdGltZS5nZXRIb3VycygpIDogdGltZS5nZXRIb3VycygpO1xyXG5cdFx0dmFyIG0gPSAodGltZS5nZXRNaW51dGVzKCkgPCAxMCkgPyAnMCcgKyB0aW1lLmdldE1pbnV0ZXMoKSA6IHRpbWUuZ2V0TWludXRlcygpO1xyXG5cclxuXHRcdHJldHVybiBoICsnOicrbTtcclxuXHR9XHJcblxyXG5cdHRoaXMucmVuZGVyQ2hhdGxpc3QgPSBmdW5jdGlvbiAodHlwZSwgdHh0LCB0aW1lKSB7XHJcblxyXG5cdFx0dmFyIHNwYW50aW1lc3RhbXAgPSAkKCc8c3Bhbj4nKS50ZXh0KCdbJyArIHRpbWVzdGFtcCh0aW1lKSArICddJyk7XHJcblx0XHR2YXIgbGkgPSAkKCc8bGk+Jyx7XCJjbGFzc1wiOlwiY2hhdGxpc3RfXCIgKyB0eXBlfSkuYXBwZW5kKHNwYW50aW1lc3RhbXAsIHR4dCk7XHJcblxyXG5cdFx0Y29uZmlnLmRvbS5jaGF0TGlzdC5hcHBlbmQobGkpO1xyXG5cdH07XHJcblxyXG5cdHRoaXMucmVuZGVyVXNlcmxpc3QgPSBmdW5jdGlvbiAodXNlcikge1xyXG5cclxuXHRcdHZhciB0aXRsZSA9ICh1c2VyLnNlc3Npb25JZCAhPT0gY29uZmlnLnNvY2tldFNlc3Npb25JZCkgPyAnT3BlbiBhIHByaXZhdGUgY2hhdCB3aXRoIHRoaXMgdXNlci4nIDogJ015IHVzZXJuYW1lJztcclxuXHRcdHZhciBjc3MgPSAodXNlci5zZXNzaW9uSWQgIT09IGNvbmZpZy5zb2NrZXRTZXNzaW9uSWQpID8gJ3VzZXJsaXN0JyA6ICd1c2VybGlzdF9zZWxmJztcclxuXHJcblx0XHR2YXIgbGkgPSAkKCc8bGk+Jyx7XCJjbGFzc1wiOmNzcywgXCJkYXRhLXNlc3NpZFwiOnVzZXIuc2Vzc2lvbklkLCBcInRpdGxlXCI6dGl0bGV9KS50ZXh0KHVzZXIudXNlcm5hbWUpO1xyXG5cdFx0Y29uZmlnLmRvbS5jaGF0VXNlcmxpc3QuYXBwZW5kKGxpKTtcclxuXHJcblx0fTtcclxuXHJcblx0dGhpcy5yZW5kZXJQcml2YXRlQ2hhdCA9IGZ1bmN0aW9uICgpIHtcclxuXHJcblx0XHQkKCcubW9kYWwtdGl0bGUnLCBjb25maWcuZG9tLnByaXZhdGVDaGF0TW9kYWwpLnRleHQoJ1ByaXZhdGUgQ2hhdCBtaXQgJyArIGNvbmZpZy5wcml2YXRlQ2hhdC5yZXNwb25zZVVzZXJuYW1lKTtcclxuXHJcblx0XHRjb25maWcuZG9tLnByaXZhdGVDaGF0TW9kYWwubW9kYWwoJ3Nob3cnKTtcclxuXHJcblx0fTtcclxuXHJcblx0dGhpcy5yZW5kZXJQcml2YXRlQ2hhdE1lc3NhZ2UgPSBmdW5jdGlvbiAodHlwZSkge1xyXG5cclxuXHRcdHZhciB0ZXh0ID0gKHR5cGU9PT0nbXNnJykgPyAnICcgKyBjb25maWcucHJpdmF0ZUNoYXQucmVzcG9uc2VVc2VybmFtZSArICcgJyArIGNvbmZpZy5wcml2YXRlQ2hhdC5tZXNzYWdlIDogJyAnICsgY29uZmlnLnByaXZhdGVDaGF0Lm1lc3NhZ2U7XHJcblx0XHR2YXIgc3BhbnRpbWVzdGFtcCA9ICQoJzxzcGFuPicpLnRleHQoJ1snICsgdGltZXN0YW1wKGNvbmZpZy5wcml2YXRlQ2hhdC50aW1lc3RhbXApICsgJ10nKTtcclxuXHRcdHZhciBsaSA9ICQoJzxsaT4nLHtcImNsYXNzXCI6XCJjaGF0bGlzdF91c2VyXCJ9KS5hcHBlbmQoc3BhbnRpbWVzdGFtcCwgdGV4dCk7XHJcblxyXG5cdFx0Y29uZmlnLmRvbS5wcml2YXRlQ2hhdExpc3QuYXBwZW5kKGxpKTtcclxuXHJcblx0fTtcclxuXHJcblx0dGhpcy5yZW5kZXJEaWFsb2cgPSBmdW5jdGlvbiAoYXJnKSB7XHJcblxyXG5cdFx0aWYgKGFyZyA9PT0gbnVsbCkge1xyXG5cclxuXHRcdFx0Y29uZmlnLmRvbS5jaGF0RGlhbG9nLm1vZGFsKCdoaWRlJyk7XHJcblx0XHRcdHJldHVybiB0cnVlO1xyXG5cclxuXHRcdH1cclxuXHJcblx0XHR2YXIgYnRudGl0bGUgPSBhcmcuYnRudGl0bGUgfHwgJ3NjaGxpZXNzZW4nO1xyXG5cclxuXHRcdF9zZWxmLnJlbmRlckRpYWxvZ0JvZHkoJzxwPicgKyBhcmcudGV4dC5qb2luKCc8L3A+PHA+JykgKyAnPC9wPicpO1xyXG5cclxuXHRcdGlmIChhcmcuaGFzT3duUHJvcGVydHkoJ2NvbmZpcm0nKSkge1xyXG5cclxuXHRcdFx0JChjb25maWcuZG9tLmJ0bkNvbmZpcm0gLCBjb25maWcuZG9tLmNoYXREaWFsb2cpLmNzcygnZGlzcGxheScsJ2Jsb2NrJyk7XHJcblxyXG5cdFx0fSBlbHNlIHtcclxuXHJcblx0XHRcdCQoY29uZmlnLmRvbS5idG5Db25maXJtICwgY29uZmlnLmRvbS5jaGF0RGlhbG9nKS5jc3MoJ2Rpc3BsYXknLCdub25lJyk7XHJcblxyXG5cdFx0fVxyXG5cclxuXHRcdGlmKGFyZy5oYXNPd25Qcm9wZXJ0eSgndGl0bGUnKSkge1xyXG5cclxuXHRcdFx0JCgnLm1vZGFsLXRpdGxlJywgY29uZmlnLmRvbS5jaGF0RGlhbG9nKVxyXG5cdFx0XHRcdC50ZXh0KGFyZy50aXRsZSk7XHJcblx0XHR9XHJcblxyXG5cdFx0JCgnLm1vZGFsLWZvb3RlciBidXR0b24uYnRuLmJ0bi1wcmltYXJ5JywgY29uZmlnLmRvbS5jaGF0RGlhbG9nKVxyXG5cdFx0XHQudGV4dChidG50aXRsZSk7XHJcblxyXG5cdFx0Y29uZmlnLmRvbS5jaGF0RGlhbG9nLm1vZGFsKCdzaG93Jyk7XHJcblxyXG5cdH07XHJcblxyXG5cdHRoaXMucmVuZGVyRGlhbG9nQm9keSA9IGZ1bmN0aW9uICh0ZXh0KSB7XHJcblx0XHQkKCcubW9kYWwtYm9keScsIGNvbmZpZy5kb20uY2hhdERpYWxvZylcclxuXHRcdFx0Lmh0bWwodGV4dCk7XHJcblx0fTtcclxuXHJcblx0dGhpcy50b2dnbGVDaGF0TGV2ZWwgPSBmdW5jdGlvbiAoKSB7XHJcblxyXG5cdFx0dmFyIHNob3dsdmwwID0gJ2Jsb2NrJztcclxuXHRcdHZhciBzaG93bHZsMSA9ICdub25lJztcclxuXHJcblx0XHRpZiggJCgnLmNoYXRMdmwwJywgY29uZmlnLmRvbS5jaGF0V3JhcHBlcikuY3NzKCdkaXNwbGF5JykgIT09ICdub25lJykge1xyXG5cclxuXHRcdFx0c2hvd2x2bDAgPSAnbm9uZSc7XHJcblx0XHRcdHNob3dsdmwxID0gJ2Jsb2NrJztcclxuXHRcdH1cclxuXHJcblx0XHQkKCcuY2hhdEx2bDAnLCBjb25maWcuZG9tLmNoYXRXcmFwcGVyKS5jc3MoJ2Rpc3BsYXknLCBzaG93bHZsMCk7XHJcblx0XHQkKCcuY2hhdEx2bDEnLCBjb25maWcuZG9tLmNoYXRXcmFwcGVyKS5jc3MoJ2Rpc3BsYXknLCBzaG93bHZsMSk7XHJcblx0fTtcclxuXHJcblx0dGhpcy5lbXB0eUNoYXRMaXN0ID0gZnVuY3Rpb24gKCkge1xyXG5cdFx0Y29uZmlnLmRvbS5jaGF0TGlzdC5lbXB0eSgpO1xyXG5cdH07XHJcblxyXG5cdHRoaXMuZW1wdHlDaGF0SW5wdXQgPSBmdW5jdGlvbiAoKSB7XHJcblx0XHRjb25maWcuZG9tLmNoYXRJbnB1dC52YWwoJycpO1xyXG5cdH07XHJcblxyXG5cdHRoaXMuZW1wdHlVc2VyTGlzdCA9IGZ1bmN0aW9uICgpIHtcclxuXHRcdGNvbmZpZy5kb20uY2hhdFVzZXJsaXN0LmVtcHR5KCk7XHJcblx0fTtcclxuXHJcblx0dGhpcy5lbXB0eUNoYXRVc2VybmFtZSA9IGZ1bmN0aW9uICgpIHtcclxuXHRcdGNvbmZpZy5kb20uY2hhdFVzZXJuYW1lLnZhbCgnJyk7XHJcblx0fTtcclxuXHJcblx0dGhpcy5lbXB0eVByaXZhdGVDaGF0SW5wdXQgPSBmdW5jdGlvbiAoKSB7XHJcblx0XHRjb25maWcuZG9tLnByaXZhdGVDaGF0SW5wdXQudmFsKCcnKTtcclxuXHR9O1xyXG5cclxuXHRyZXR1cm4gdGhpcztcclxufVxyXG5cclxuZ2xvYmFsLmFwcCA9IGdsb2JhbC5hcHAgfHwge307XHJcbmdsb2JhbC5hcHAuQ2hhdFJlbmRlcmVyID0gQ2hhdFJlbmRlcmVyO1xyXG4iLCJcclxuXHJcbmZ1bmN0aW9uIENoYXRTb2NrZXRMaXN0ZW5lciAoTW9kZWwsIHNvY2tldCkge1xyXG5cclxuXHRzb2NrZXQub24oJ2xvZ2luIHN1Y2Nlc3MnLCBmdW5jdGlvbiAoZGF0YSkge1xyXG5cclxuXHRcdE1vZGVsLnNvY2tldFJlc3BvbnNlTG9naW5TdWNjZXNzKGRhdGEpO1xyXG5cclxuXHR9KTtcclxuXHJcblx0c29ja2V0Lm9uKCdsb2dpbiBlcnJvcicsIGZ1bmN0aW9uICgpIHtcclxuXHJcblx0XHRNb2RlbC5zb2NrZXRSZXNwb25zZUxvZ2luRXJyb3IoJ0RlciBCZW51dHplcm5hbWUgaXN0IHVuZ8O8bHRpZycpO1xyXG5cclxuXHR9KTtcclxuXHJcblx0c29ja2V0Lm9uKCdsb2dpbiBlcnIjdXNlcm5hbWUnLCBmdW5jdGlvbiAoKSB7XHJcblxyXG5cdFx0TW9kZWwuc29ja2V0UmVzcG9uc2VMb2dpbkVycm9yKCdEZXIgQmVudXR6ZXJuYW1lIHdpcmQgc2Nob24gYmVuw7x0enQsIGJpdHRlIHfDpGhsZSBlaW5lbiBhbmRlcmVuIE5hbWVuLicpO1xyXG5cclxuXHR9KTtcclxuXHJcblx0c29ja2V0Lm9uKCdjaGF0IG1lc3NhZ2UnLCBmdW5jdGlvbiAoZGF0YSkge1xyXG5cclxuXHRcdE1vZGVsLnNvY2tldFJlc3BvbnNlU2V0TWVzc2FnZShkYXRhKTtcclxuXHJcblx0fSk7XHJcblxyXG5cdHNvY2tldC5vbignbmV3IHVzZXInLCBmdW5jdGlvbiAoZGF0YSkge1xyXG5cclxuXHRcdE1vZGVsLnNvY2tldFJlc3BvbnNlVXNlck5ldyhkYXRhKTtcclxuXHR9KTtcclxuXHJcblx0c29ja2V0Lm9uKCd1c2VyIGRpc2Nvbm5lY3QnLCBmdW5jdGlvbiAoZGF0YSkge1xyXG5cclxuXHRcdE1vZGVsLnNvY2tldFJlc3BvbnNlVXNlckRpc2Nvbm5lY3QoZGF0YSk7XHJcblxyXG5cdH0pO1xyXG5cclxuXHRzb2NrZXQub24oJ3VzZXIgcHJpdmF0ZSBtZXNzYWdlIGludml0ZScsIGZ1bmN0aW9uIChkYXRhKSB7XHJcblxyXG5cdFx0TW9kZWwuc29ja2V0UmVzcG9uc2VVc2VySW52aXRlKGRhdGEpO1xyXG5cclxuXHR9KTtcclxuXHJcblx0c29ja2V0Lm9uKCd1c2VyIHByaXZhdGUgY2hhdCByZWZ1c2UnLCBmdW5jdGlvbihkYXRhKSB7XHJcblxyXG5cdFx0TW9kZWwuc29ja2V0UmVzcG9uc2VSZWZ1c2VVc2VySW52aXRlKGRhdGEpO1xyXG5cclxuXHR9KTtcclxuXHJcblx0c29ja2V0Lm9uKCd1c2VyIHByaXZhdGUgY2hhdCBhY2NlcHQnLCBmdW5jdGlvbiAoZGF0YSkge1xyXG5cclxuXHRcdE1vZGVsLnNvY2tldFJlc3BvbnNlQWNjZXB0UHJpdmF0ZUNoYXQoZGF0YSk7XHJcblxyXG5cdH0pO1xyXG5cclxuXHRzb2NrZXQub24oJ3VzZXIgcHJpdmF0ZSBjaGF0IG9wZW4nLCBmdW5jdGlvbiAoZGF0YSkge1xyXG5cclxuXHRcdE1vZGVsLnNvY2tldFJlc3BvbnNlT3BlblByaXZhdGVDaGF0KGRhdGEpO1xyXG5cclxuXHR9KTtcclxuXHJcblx0c29ja2V0Lm9uKCd1c2VyIHByaXZhdGUgY2hhdCBtZXNzYWdlJywgZnVuY3Rpb24gKGRhdGEpIHtcclxuXHJcblx0XHRNb2RlbC5zb2NrZXRSZXNwb25zZU1lc3NhZ2VQcml2YXRlQ2hhdChkYXRhKTtcclxuXHJcblx0fSk7XHJcblxyXG5cdHNvY2tldC5vbigndXNlciBwcml2YXRlIGNoYXQgZGlzY29ubmVjdCcsIGZ1bmN0aW9uIChkYXRhKSB7XHJcblxyXG5cdFx0TW9kZWwuc29ja2V0UmVzcG9uc2VEaXNjb25uZWN0UHJpdmF0ZUNoYXQoZGF0YSk7XHJcblxyXG5cdH0pO1xyXG5cclxufVxyXG5cclxuZ2xvYmFsLmFwcCA9IGdsb2JhbC5hcHAgfHwge307XHJcbmdsb2JhbC5hcHAuQ2hhdFNvY2tldExpc3RlbmVyID0gQ2hhdFNvY2tldExpc3RlbmVyOyIsIlxyXG4kKGRvY3VtZW50KS5yZWFkeSAoZnVuY3Rpb24gKCkge1xyXG5cdGdsb2JhbC5hcHAuQ2hhdENvbnRyb2xsZXIuaW5pdCgpO1xyXG59KTtcclxuIl19
