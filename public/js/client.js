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

	function setPrivateChatStatus (statusindex) {

		if (statusindex+1 <= privateStatusFilter.length) {

			config.socketPrivateChatStatus = privateStatusFilter[statusindex];
		}
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

	this.dialog = function (arg) {

		var text = '';
		var btntitle = 'schliessen';

		$(config.dom.btnConfirm , config.dom.chatDialog).hide();

		if (typeof arg === 'string' ) {

			text = $('<p>').text(arg);

		} else if (typeof arg === 'object') {

			if (typeof arg === 'string') {

				text = arg.text;

			} else {

				text = '<p>' + arg.text.join('</p><p>') + '</p>';

			}

			if (arg.hasOwnProperty('confirm')) {

				$(config.dom.btnConfirm , config.dom.chatDialog).css('display','block');

			}

			if(arg.hasOwnProperty('title')) {

				$('.modal-title', config.dom.chatDialog)
					.text(arg.title);
			}

			if(arg.hasOwnProperty('btntitle')) {

				btntitle = arg.btntitle;
			}
		}

		$('.modal-body', config.dom.chatDialog)
			.html(text);

		$('.modal-footer button.btn.btn-primary', config.dom.chatDialog)
			.text(btntitle);

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
				_self.dialog({title:'Private Chat Anfrage', text:txt, btntitle:'Abrechen'});

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

		_self.dialog({
			title:'Einladung zum privaten Chat',
			text:txt, btntitle:'Ablehnen',
			confirm:'accept'
		});
	};

	this.socketResponseRefuseUserInvite = function(data) {

		if (config.socketPrivateChatActive === true && config.privateChat.responseSocketId === data.callerSocketId) {

			$('.modal-body', config.dom.chatDialog)
				.html('Der User hat die Einladung abgelehnt,');
		}
	};

	this.socketResponseAcceptPrivateChat = function(data) {

		if (config.socketPrivateChatActive === true && config.privateChat.responseSocketId === data.callerSocketId) {

			$('.modal-body', config.dom.chatDialog)
				.html('Der User hat die Einladung angenommen, bitte warten, NICHT diesen Dialog schliessen!');

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

		config.dom.chatDialog.modal('hide');

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

				config.dom.chatDialog.modal('hide');

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

	return this;
}

global.app = global.app || {};
global.app.ChatRenderer = ChatRenderer;

}).call(this,typeof global !== "undefined" ? global : typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {})

},{}],5:[function(require,module,exports){
(function (global){


function ChatSocketListener (Model, config) {

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
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIm5vZGVfbW9kdWxlcy9icm93c2VyLXBhY2svX3ByZWx1ZGUuanMiLCJwdWJsaWMvanMvYXBwL0NoYXRDb250cm9sbGVyLmpzIiwicHVibGljL2pzL2FwcC9DaGF0RXZlbnRMaXN0ZW5lci5qcyIsInB1YmxpYy9qcy9hcHAvQ2hhdE1vZGVsLmpzIiwicHVibGljL2pzL2FwcC9DaGF0UmVuZGVyZXIuanMiLCJwdWJsaWMvanMvYXBwL0NoYXRTb2NrZXRMaXN0ZW5lci5qcyIsInB1YmxpYy9qcy9hcHAvaW5kZXguanMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7O0FDQUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOzs7OztBQzdCQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7Ozs7QUNsRUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOzs7OztBQzdmQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7Ozs7O0FDM0RBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOzs7OztBQzlFQTtBQUNBO0FBQ0E7QUFDQTtBQUNBIiwiZmlsZSI6ImdlbmVyYXRlZC5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzQ29udGVudCI6WyIoZnVuY3Rpb24gZSh0LG4scil7ZnVuY3Rpb24gcyhvLHUpe2lmKCFuW29dKXtpZighdFtvXSl7dmFyIGE9dHlwZW9mIHJlcXVpcmU9PVwiZnVuY3Rpb25cIiYmcmVxdWlyZTtpZighdSYmYSlyZXR1cm4gYShvLCEwKTtpZihpKXJldHVybiBpKG8sITApO3ZhciBmPW5ldyBFcnJvcihcIkNhbm5vdCBmaW5kIG1vZHVsZSAnXCIrbytcIidcIik7dGhyb3cgZi5jb2RlPVwiTU9EVUxFX05PVF9GT1VORFwiLGZ9dmFyIGw9bltvXT17ZXhwb3J0czp7fX07dFtvXVswXS5jYWxsKGwuZXhwb3J0cyxmdW5jdGlvbihlKXt2YXIgbj10W29dWzFdW2VdO3JldHVybiBzKG4/bjplKX0sbCxsLmV4cG9ydHMsZSx0LG4scil9cmV0dXJuIG5bb10uZXhwb3J0c312YXIgaT10eXBlb2YgcmVxdWlyZT09XCJmdW5jdGlvblwiJiZyZXF1aXJlO2Zvcih2YXIgbz0wO288ci5sZW5ndGg7bysrKXMocltvXSk7cmV0dXJuIHN9KSIsIlxyXG5mdW5jdGlvbiBDaGF0Q29udHJvbGxlciAoKSB7XHJcblxyXG5cdHZhciBjb25maWcgPSB7XHJcblx0XHRzb2NrZXQgOiBudWxsXHJcblx0fTtcclxuXHJcblx0dmFyIE1vZGVsID0gbnVsbDtcclxuXHR2YXIgQ2hhdFNvY2tldExpc3RlbmVyID0gbnVsbDtcclxuXHR2YXIgQ2hhdEV2ZW50TGlzdGVuZXIgPSBudWxsO1xyXG5cclxuXHR0aGlzLmluaXQgPSBmdW5jdGlvbiAoKSB7XHJcblxyXG5cdFx0aWYgKGlvKSB7XHJcblxyXG5cdFx0XHRjb25maWcuc29ja2V0ID0gaW8oKTtcclxuXHJcblx0XHRcdE1vZGVsID0gbmV3IGdsb2JhbC5hcHAuQ2hhdE1vZGVsKGNvbmZpZyk7XHJcblx0XHRcdENoYXRTb2NrZXRMaXN0ZW5lciA9IG5ldyBnbG9iYWwuYXBwLkNoYXRTb2NrZXRMaXN0ZW5lcihNb2RlbCwgY29uZmlnKTtcclxuXHRcdFx0Q2hhdEV2ZW50TGlzdGVuZXIgPSBuZXcgZ2xvYmFsLmFwcC5DaGF0RXZlbnRMaXN0ZW5lcihNb2RlbCwgY29uZmlnKTtcclxuXHJcblx0XHR9XHJcblx0fTtcclxuXHJcblx0cmV0dXJuIHRoaXM7XHJcblxyXG59XHJcblxyXG5nbG9iYWwuYXBwID0gZ2xvYmFsLmFwcCB8fCB7fTtcclxuZ2xvYmFsLmFwcC5DaGF0Q29udHJvbGxlciA9IG5ldyBDaGF0Q29udHJvbGxlcigpOyIsIlxyXG5mdW5jdGlvbiBDaGF0RXZlbnRMaXN0ZW5lciAoTW9kZWwsIGNvbmZpZykge1xyXG5cclxuXHRjb25maWcuZG9tLnVzZXJuYW1lRm9ybS5vbignc3VibWl0JywgZnVuY3Rpb24gKCkge1xyXG5cclxuXHRcdE1vZGVsLmFkZFVzZXIoKTtcclxuXHJcblx0XHRyZXR1cm4gZmFsc2U7XHJcblxyXG5cdH0pO1xyXG5cclxuXHRjb25maWcuZG9tLmNoYXRGb3JtLm9uKCdzdWJtaXQnLCBmdW5jdGlvbiAoKSB7XHJcblxyXG5cdFx0TW9kZWwuc2VuZE1lc3NhZ2UoKTtcclxuXHJcblx0XHRyZXR1cm4gZmFsc2U7XHJcblxyXG5cdH0pO1xyXG5cclxuXHRjb25maWcuZG9tLnByaXZhdGVDaGF0Rm9ybS5vbignc3VibWl0JywgZnVuY3Rpb24gKCkge1xyXG5cclxuXHRcdE1vZGVsLnNlbmRQcml2YXRlTWVzc2FnZSgpO1xyXG5cclxuXHRcdHJldHVybiBmYWxzZTtcclxuXHJcblx0fSk7XHJcblxyXG5cdGNvbmZpZy5kb20uYnRuRXhpdENoYXRyb29tLm9uKCdjbGljaycsIGZ1bmN0aW9uICgpIHtcclxuXHJcblx0XHRNb2RlbC5zb2NrZXREaXNjb25uZWN0KCk7XHJcblxyXG5cdH0pO1xyXG5cclxuXHQkKGNvbmZpZy5kb20uYnRuQ29uZmlybSAsIGNvbmZpZy5kb20uY2hhdERpYWxvZykub24oJ21vdXNldXAnLCBmdW5jdGlvbiAoKSB7XHJcblxyXG5cdFx0TW9kZWwuYWNjZXB0UHJpdmF0ZUNoYXRSZXF1ZXN0KCk7XHJcblxyXG5cdH0pO1xyXG5cclxuXHRjb25maWcuZG9tLmNoYXRVc2VybGlzdC5vbignY2xpY2snLCAnLnVzZXJsaXN0JywgZnVuY3Rpb24gKCkge1xyXG5cclxuXHRcdE1vZGVsLnNldFByaXZhdGVDaGF0UmVxdWVzdCgkKHRoaXMpLnRleHQoKSwgJCh0aGlzKS5hdHRyKCdkYXRhLXNlc3NpZCcpKTtcclxuXHJcblx0fSk7XHJcblxyXG5cdGNvbmZpZy5kb20uY2hhdERpYWxvZy5vbignaGlkZGVuLmJzLm1vZGFsJywgZnVuY3Rpb24gKCkge1xyXG5cclxuXHRcdGlmICggY29uZmlnLnNvY2tldFByaXZhdGVDaGF0QWN0aXZlICYmIGNvbmZpZy5zb2NrZXRQcml2YXRlQ2hhdFN0YXR1cyA9PT0gJ3dhaXRpbmcnICkge1xyXG5cclxuXHRcdFx0TW9kZWwuZGVsZXRlUHJpdmF0ZUNoYXRSZXF1ZXN0KCk7XHJcblxyXG5cdFx0fSBlbHNlIGlmICggY29uZmlnLnNvY2tldFByaXZhdGVDaGF0QWN0aXZlICYmIGNvbmZpZy5zb2NrZXRQcml2YXRlQ2hhdFN0YXR1cyA9PT0gJ3JlcWRlY2lzaW9uJyApIHtcclxuXHJcblx0XHRcdE1vZGVsLnJlZnVzZVByaXZhdGVDaGF0UmVxdWVzdCgpO1xyXG5cclxuXHRcdH1cclxuXHR9KTtcclxuXHJcblx0Y29uZmlnLmRvbS5wcml2YXRlQ2hhdE1vZGFsLm9uKCdoaWRkZW4uYnMubW9kYWwnLCBmdW5jdGlvbiAoKSB7XHJcblxyXG5cdFx0TW9kZWwuZGlzY29ubmVjdFByaXZhdGVDaGF0KCk7XHJcblxyXG5cdH0pO1xyXG59XHJcblxyXG5nbG9iYWwuYXBwID0gZ2xvYmFsLmFwcCB8fCB7fTtcclxuZ2xvYmFsLmFwcC5DaGF0RXZlbnRMaXN0ZW5lciA9IENoYXRFdmVudExpc3RlbmVyOyIsImZ1bmN0aW9uIENoYXRNb2RlbCAoY29uZmlnKSB7XHJcblxyXG5cdGNvbmZpZy5zb2NrZXRTZXNzaW9uSWQgPSAnJztcclxuXHRjb25maWcuc29ja2V0SXNEaXNjb25uZWN0ZWQgPSB0cnVlO1xyXG5cdGNvbmZpZy5zb2NrZXRQcml2YXRlQ2hhdEFjdGl2ZSA9IGZhbHNlLFxyXG5cdGNvbmZpZy5zb2NrZXRQcml2YXRlQ2hhdFN0YXR1cyA9ICdjbG9zZWQnO1xyXG5cclxuXHJcblx0Y29uZmlnLnNvY2tldERhdGEgPSB7XHJcblx0XHRtZXNzYWdlIDogJycsXHJcblx0XHR1c2VybmFtZSA6ICcnXHJcblx0fTtcclxuXHJcblx0Y29uZmlnLnByaXZhdGVDaGF0ID0ge1xyXG5cdFx0Y2FsbGVyU29ja2V0SWQgOiAnJyxcclxuXHRcdGNhbGxlclVzZXJuYW1lIDogJycsXHJcblx0XHRyZXNwb25zZVNvY2tldElkIDogJycsXHJcblx0XHRtZXNzYWdlIDogJycsXHJcblx0XHR1c2VybmFtZSA6ICcnLFxyXG5cdFx0dGltZXN0YW1wIDogJydcclxuXHR9O1xyXG5cclxuXHRjb25maWcuZG9tID0ge1xyXG5cdFx0Y2hhdFdyYXBwZXIgOiAkKCcjY2hhdFdyYXBwZXInKSxcclxuXHRcdHVzZXJuYW1lRm9ybSA6ICQoJyN1c2VybmFtZUZvcm0nKSxcclxuXHRcdGNoYXRGb3JtIDogJCgnI2NoYXRGb3JtJyksXHJcblx0XHRwcml2YXRlQ2hhdEZvcm0gOiAkKCcjcHJpdmF0ZUNoYXRGb3JtJyksXHJcblx0XHRjaGF0VXNlcm5hbWUgOiAkKCdpbnB1dCNjaGF0VXNlcm5hbWUnKSxcclxuXHRcdGNoYXRJbnB1dCA6ICQoJ2lucHV0I2NoYXRJbnB1dCcpLFxyXG5cdFx0cHJpdmF0ZUNoYXRJbnB1dCA6ICQoJ2lucHV0I3ByaXZhdGVDaGF0SW5wdXQnKSxcclxuXHRcdHByaXZhdGVDaGF0TGlzdCA6ICQoJ3VsI3ByaXZhdGVDaGF0TGlzdCcpLFxyXG5cdFx0Y2hhdExpc3QgOiAkKCcjY2hhdExpc3QnKSxcclxuXHRcdGNoYXRVc2VybGlzdCA6ICQoJyNjaGF0VXNlcmxpc3QnKSxcclxuXHRcdGNoYXREaWFsb2cgOiAkKCcjY2hhdERpYWxvZycpLFxyXG5cdFx0cHJpdmF0ZUNoYXRNb2RhbCA6ICQoJyNwcml2YXRlQ2hhdE1vZGFsJyksXHJcblx0XHRidG5FeGl0Q2hhdHJvb20gOiAkKCcjYnRuRXhpdENoYXRyb29tJyksXHJcblx0XHRidG5Db25maXJtIDogJCgnLmJ0bi5idG4tc3VjY2VzcycpLFxyXG5cdFx0aXRlbVVzZXJsaXN0IDogJCgnLnVzZXJsaXN0JywnI2NoYXRVc2VybGlzdCcpXHJcblx0fTtcclxuXHJcblx0dmFyIENoYXRSZW5kZXJlciA9IG5ldyBnbG9iYWwuYXBwLkNoYXRSZW5kZXJlcihjb25maWcpO1xyXG5cdHZhciBwcml2YXRlU3RhdHVzRmlsdGVyID0gWydjbG9zZWQnLCd3YWl0aW5nJywnb3BlbicsJ3JlcWRlY2lzaW9uJywnYWNjZXB0J107XHJcblx0dmFyIF9zZWxmID0gdGhpcztcclxuXHJcblx0ZnVuY3Rpb24gYWRkVG9DaGF0bGlzdCAoZGF0YSwgdHlwZSkge1xyXG5cclxuXHRcdHZhciB0eHQgPSAnJztcclxuXHJcblx0XHRzd2l0Y2ggKHR5cGUpIHtcclxuXHRcdFx0Y2FzZSgnbXNnJyk6XHJcblx0XHRcdFx0dHh0ID0gZGF0YS51c2VybmFtZSArICcgOiAnICsgZGF0YS5tZXNzYWdlO1xyXG5cdFx0XHRcdGJyZWFrO1xyXG5cdFx0XHRjYXNlKCd1c2VyJyk6XHJcblx0XHRcdFx0dHh0ID0gZGF0YS51c2VybmFtZSArICcgaGF0IGRlbiBSYXVtIGJldHJldGVuJztcclxuXHRcdFx0XHRicmVhaztcclxuXHRcdFx0Y2FzZSgnZGlzY29ubmVjdCcpOlxyXG5cdFx0XHRcdHR4dCA9IGRhdGEudXNlcm5hbWUgKyAnIGhhdCBkZW4gUmF1bSB2ZXJsYXNzZW4nO1xyXG5cdFx0XHRcdGJyZWFrO1xyXG5cdFx0fVxyXG5cclxuXHRcdENoYXRSZW5kZXJlci5yZW5kZXJDaGF0bGlzdCh0eXBlLCB0eHQsIGRhdGEudGltZXN0YW1wKTtcclxuXHJcblx0fVxyXG5cclxuXHRmdW5jdGlvbiBhZGRUb1VzZXJsaXN0IChkYXRhKSB7XHJcblxyXG5cdFx0aWYgKHR5cGVvZiBkYXRhID09PSAnb2JqZWN0Jykge1xyXG5cclxuXHRcdFx0JC5lYWNoKGRhdGEsIGZ1bmN0aW9uIChrZXksdXNlcikge1xyXG5cclxuXHRcdFx0XHRDaGF0UmVuZGVyZXIucmVuZGVyVXNlcmxpc3QodXNlcik7XHJcblxyXG5cdFx0XHR9KTtcclxuXHRcdH1cclxuXHR9XHJcblxyXG5cdGZ1bmN0aW9uIGNoZWNrVXNlcm5hbWUgKCkge1xyXG5cdFx0cmV0dXJuICh0eXBlb2YgY29uZmlnLnNvY2tldERhdGEudXNlcm5hbWUgPT09ICdzdHJpbmcnICYmIGNvbmZpZy5zb2NrZXREYXRhLnVzZXJuYW1lLmxlbmd0aCkgPyB0cnVlIDogZmFsc2U7XHJcblx0fVxyXG5cclxuXHRmdW5jdGlvbiBjaGVja01lc3NhZ2UgKCkge1xyXG5cdFx0cmV0dXJuICh0eXBlb2YgY29uZmlnLnNvY2tldERhdGEubWVzc2FnZSA9PT0gJ3N0cmluZycgJiYgY29uZmlnLnNvY2tldERhdGEubWVzc2FnZS5sZW5ndGgpID8gdHJ1ZSA6IGZhbHNlO1xyXG5cdH1cclxuXHJcblx0ZnVuY3Rpb24gY2hlY2tQcml2YXRlQ2hhdCAoKSB7XHJcblxyXG5cdFx0dmFyIHJlcyA9IHRydWU7XHJcblxyXG5cdFx0JC5lYWNoKGNvbmZpZy5wcml2YXRlQ2hhdCwgZnVuY3Rpb24gKGtleSwgdmFsdWUpIHtcclxuXHJcblx0XHRcdGlmICggdHlwZW9mIHZhbHVlICE9PSAnc3RyaW5nJyB8fCB0eXBlb2YgdmFsdWUgPT09ICdzdHJpbmcnICYmICEgdmFsdWUubGVuZ3RoKSB7XHJcblxyXG5cdFx0XHRcdHJlcyA9IGZhbHNlO1xyXG5cdFx0XHRcdHJldHVybiByZXM7XHJcblxyXG5cdFx0XHR9XHJcblx0XHR9KTtcclxuXHJcblx0XHRyZXR1cm4gcmVzO1xyXG5cdH1cclxuXHJcblx0ZnVuY3Rpb24gZ2V0U3RyRm9ybWF0ZWQgKHN0ciwgc3RybGVuKSB7XHJcblxyXG5cdFx0c3RyID0gJC50cmltKHN0cik7XHJcblxyXG5cdFx0cmV0dXJuIChzdHIubGVuZ3RoID4gc3RybGVuICkgPyBzdHIuc3Vic3RyKDAsc3RybGVuLTEpIDogc3RyO1xyXG5cdH1cclxuXHJcblx0ZnVuY3Rpb24gc2V0TWVzc2FnZSAoKSB7XHJcblxyXG5cdFx0Y29uZmlnLnNvY2tldERhdGEubWVzc2FnZSA9IGdldFN0ckZvcm1hdGVkKGNvbmZpZy5kb20uY2hhdElucHV0LnZhbCgpLCAyMDApO1xyXG5cdFx0Y29uZmlnLmRvbS5jaGF0SW5wdXQudmFsKCcnKTtcclxuXHJcblx0fVxyXG5cclxuXHRmdW5jdGlvbiBzZXRQcml2YXRlTWVzc2FnZSAoKSB7XHJcblxyXG5cdFx0Y29uZmlnLnByaXZhdGVDaGF0Lm1lc3NhZ2UgPSBnZXRTdHJGb3JtYXRlZChjb25maWcuZG9tLnByaXZhdGVDaGF0SW5wdXQudmFsKCksIDIwMCk7XHJcblx0XHRjb25maWcuZG9tLnByaXZhdGVDaGF0SW5wdXQudmFsKCcnKTtcclxuXHJcblx0fVxyXG5cclxuXHRmdW5jdGlvbiBzZXRVc2VybmFtZSAoKSB7XHJcblxyXG5cdFx0Y29uZmlnLnNvY2tldERhdGEudXNlcm5hbWUgPSBnZXRTdHJGb3JtYXRlZChjb25maWcuZG9tLmNoYXRVc2VybmFtZS52YWwoKSwgMzApO1xyXG5cdFx0Y29uZmlnLmRvbS5jaGF0VXNlcm5hbWUudmFsKCcnKTtcclxuXHJcblx0fVxyXG5cclxuXHRmdW5jdGlvbiBzZXRQcml2YXRlQ2hhdFN0YXR1cyAoc3RhdHVzaW5kZXgpIHtcclxuXHJcblx0XHRpZiAoc3RhdHVzaW5kZXgrMSA8PSBwcml2YXRlU3RhdHVzRmlsdGVyLmxlbmd0aCkge1xyXG5cclxuXHRcdFx0Y29uZmlnLnNvY2tldFByaXZhdGVDaGF0U3RhdHVzID0gcHJpdmF0ZVN0YXR1c0ZpbHRlcltzdGF0dXNpbmRleF07XHJcblx0XHR9XHJcblx0fVxyXG5cclxuXHRmdW5jdGlvbiB0b2dnbGVDaGF0TGV2ZWwgKCkge1xyXG5cclxuXHRcdHZhciBzaG93bHZsMCA9ICdibG9jayc7XHJcblx0XHR2YXIgc2hvd2x2bDEgPSAnbm9uZSc7XHJcblxyXG5cdFx0aWYoICQoJy5jaGF0THZsMCcsIGNvbmZpZy5kb20uY2hhdFdyYXBwZXIpLmNzcygnZGlzcGxheScpICE9PSAnbm9uZScpIHtcclxuXHJcblx0XHRcdHNob3dsdmwwID0gJ25vbmUnO1xyXG5cdFx0XHRzaG93bHZsMSA9ICdibG9jayc7XHJcblx0XHR9XHJcblxyXG5cdFx0JCgnLmNoYXRMdmwwJywgY29uZmlnLmRvbS5jaGF0V3JhcHBlcikuY3NzKCdkaXNwbGF5Jywgc2hvd2x2bDApO1xyXG5cdFx0JCgnLmNoYXRMdmwxJywgY29uZmlnLmRvbS5jaGF0V3JhcHBlcikuY3NzKCdkaXNwbGF5Jywgc2hvd2x2bDEpO1xyXG5cdH1cclxuXHJcblx0ZnVuY3Rpb24gcmVzZXRDaGF0ICgpIHtcclxuXHJcblx0XHRjb25maWcuZG9tLmNoYXRMaXN0LmVtcHR5KCk7XHJcblx0XHRjb25maWcuZG9tLmNoYXRVc2VybGlzdC5lbXB0eSgpO1xyXG5cdFx0Y29uZmlnLnNvY2tldERhdGEudXNlcm5hbWUgPSAnJztcclxuXHR9XHJcblxyXG5cdGZ1bmN0aW9uIHJlc2V0VXNlcmxpc3QgKHVzZXJsaXN0KSB7XHJcblxyXG5cdFx0Y29uZmlnLmRvbS5jaGF0VXNlcmxpc3QuZW1wdHkoKTtcclxuXHRcdGFkZFRvVXNlcmxpc3QodXNlcmxpc3QpO1xyXG5cclxuXHR9XHJcblxyXG5cdHRoaXMuYWRkVXNlciA9IGZ1bmN0aW9uICgpIHtcclxuXHJcblx0XHRzZXRVc2VybmFtZSgpO1xyXG5cclxuXHRcdGlmICggY2hlY2tVc2VybmFtZSgpICkge1xyXG5cclxuXHRcdFx0aWYgKGNvbmZpZy5zb2NrZXRJc0Rpc2Nvbm5lY3RlZCA9PT0gdHJ1ZSkge1xyXG5cclxuXHRcdFx0XHRjb25maWcuc29ja2V0LmNvbm5lY3QoKTtcclxuXHJcblx0XHRcdH1cclxuXHJcblx0XHRcdGNvbmZpZy5zb2NrZXQuZW1pdCgnYWRkIHVzZXInLCBjb25maWcuc29ja2V0RGF0YS51c2VybmFtZSk7XHJcblxyXG5cdFx0fSBlbHNlIHtcclxuXHJcblx0XHRcdF9zZWxmLmRpYWxvZygnS2VpbmVuIFVzZXJuYW1lbiBnZWZ1bmRlbicpO1xyXG5cdFx0fVxyXG5cdH07XHJcblxyXG5cdHRoaXMuZGlhbG9nID0gZnVuY3Rpb24gKGFyZykge1xyXG5cclxuXHRcdHZhciB0ZXh0ID0gJyc7XHJcblx0XHR2YXIgYnRudGl0bGUgPSAnc2NobGllc3Nlbic7XHJcblxyXG5cdFx0JChjb25maWcuZG9tLmJ0bkNvbmZpcm0gLCBjb25maWcuZG9tLmNoYXREaWFsb2cpLmhpZGUoKTtcclxuXHJcblx0XHRpZiAodHlwZW9mIGFyZyA9PT0gJ3N0cmluZycgKSB7XHJcblxyXG5cdFx0XHR0ZXh0ID0gJCgnPHA+JykudGV4dChhcmcpO1xyXG5cclxuXHRcdH0gZWxzZSBpZiAodHlwZW9mIGFyZyA9PT0gJ29iamVjdCcpIHtcclxuXHJcblx0XHRcdGlmICh0eXBlb2YgYXJnID09PSAnc3RyaW5nJykge1xyXG5cclxuXHRcdFx0XHR0ZXh0ID0gYXJnLnRleHQ7XHJcblxyXG5cdFx0XHR9IGVsc2Uge1xyXG5cclxuXHRcdFx0XHR0ZXh0ID0gJzxwPicgKyBhcmcudGV4dC5qb2luKCc8L3A+PHA+JykgKyAnPC9wPic7XHJcblxyXG5cdFx0XHR9XHJcblxyXG5cdFx0XHRpZiAoYXJnLmhhc093blByb3BlcnR5KCdjb25maXJtJykpIHtcclxuXHJcblx0XHRcdFx0JChjb25maWcuZG9tLmJ0bkNvbmZpcm0gLCBjb25maWcuZG9tLmNoYXREaWFsb2cpLmNzcygnZGlzcGxheScsJ2Jsb2NrJyk7XHJcblxyXG5cdFx0XHR9XHJcblxyXG5cdFx0XHRpZihhcmcuaGFzT3duUHJvcGVydHkoJ3RpdGxlJykpIHtcclxuXHJcblx0XHRcdFx0JCgnLm1vZGFsLXRpdGxlJywgY29uZmlnLmRvbS5jaGF0RGlhbG9nKVxyXG5cdFx0XHRcdFx0LnRleHQoYXJnLnRpdGxlKTtcclxuXHRcdFx0fVxyXG5cclxuXHRcdFx0aWYoYXJnLmhhc093blByb3BlcnR5KCdidG50aXRsZScpKSB7XHJcblxyXG5cdFx0XHRcdGJ0bnRpdGxlID0gYXJnLmJ0bnRpdGxlO1xyXG5cdFx0XHR9XHJcblx0XHR9XHJcblxyXG5cdFx0JCgnLm1vZGFsLWJvZHknLCBjb25maWcuZG9tLmNoYXREaWFsb2cpXHJcblx0XHRcdC5odG1sKHRleHQpO1xyXG5cclxuXHRcdCQoJy5tb2RhbC1mb290ZXIgYnV0dG9uLmJ0bi5idG4tcHJpbWFyeScsIGNvbmZpZy5kb20uY2hhdERpYWxvZylcclxuXHRcdFx0LnRleHQoYnRudGl0bGUpO1xyXG5cclxuXHRcdGNvbmZpZy5kb20uY2hhdERpYWxvZy5tb2RhbCgnc2hvdycpO1xyXG5cclxuXHR9O1xyXG5cclxuXHR0aGlzLnNlbmRNZXNzYWdlID0gZnVuY3Rpb24gKCkge1xyXG5cclxuXHRcdHNldE1lc3NhZ2UoKTtcclxuXHJcblx0XHRpZiAoIGNoZWNrTWVzc2FnZSgpICYmIGNoZWNrVXNlcm5hbWUoKSApIHtcclxuXHJcblx0XHRcdGNvbmZpZy5zb2NrZXQuZW1pdCgnY2hhdCBtZXNzYWdlJywgY29uZmlnLnNvY2tldERhdGEpO1xyXG5cclxuXHRcdH0gZWxzZSB7XHJcblxyXG5cdFx0XHRfc2VsZi5kaWFsb2coJ0tlaW5lIE5hY2hyaWNodCBnZWZ1bmRlbicpO1xyXG5cclxuXHRcdH1cclxuXHR9O1xyXG5cclxuXHR0aGlzLnNlbmRQcml2YXRlTWVzc2FnZSA9IGZ1bmN0aW9uICgpIHtcclxuXHJcblx0XHRpZiAoIGNvbmZpZy5zb2NrZXRQcml2YXRlQ2hhdEFjdGl2ZSApIHtcclxuXHJcblx0XHRcdHNldFByaXZhdGVNZXNzYWdlKCk7XHJcblxyXG5cdFx0XHRpZiAoY2hlY2tQcml2YXRlQ2hhdCgpICYmIGNoZWNrVXNlcm5hbWUoKSkge1xyXG5cclxuXHRcdFx0XHRjb25maWcuc29ja2V0LmVtaXQoJ3VzZXIgcHJpdmF0ZSBjaGF0IG1lc3NhZ2UnLCBjb25maWcucHJpdmF0ZUNoYXQpO1xyXG5cclxuXHRcdFx0XHRjb25maWcucHJpdmF0ZUNoYXQudGltZXN0YW1wID0gbmV3IERhdGUoKTtcclxuXHRcdFx0XHRjb25maWcucHJpdmF0ZUNoYXQubWVzc2FnZSA9IGNvbmZpZy5wcml2YXRlQ2hhdC5jYWxsZXJVc2VybmFtZSArICcgJyArIGNvbmZpZy5wcml2YXRlQ2hhdC5tZXNzYWdlO1xyXG5cclxuXHRcdFx0XHRDaGF0UmVuZGVyZXIucmVuZGVyUHJpdmF0ZUNoYXRNZXNzYWdlKCdzdGF0dXMnKTtcclxuXHJcblx0XHRcdH1cclxuXHRcdH1cclxuXHR9O1xyXG5cclxuXHR0aGlzLnNldFByaXZhdGVDaGF0UmVxdWVzdCA9IGZ1bmN0aW9uICh1c2VybmFtZSwgc2Vzc29uaWQpIHtcclxuXHJcblx0XHRpZiAoICEgY29uZmlnLnNvY2tldFByaXZhdGVDaGF0QWN0aXZlICkge1xyXG5cclxuXHRcdFx0aWYgKGNvbmZpZy5zb2NrZXRTZXNzaW9uSWQgIT09ICcnICYmIGNvbmZpZy5zb2NrZXRTZXNzaW9uSWQgIT09IHNlc3NvbmlkKSB7XHJcblxyXG5cdFx0XHRcdHZhciB0eHQgPSBbXHJcblx0XHRcdFx0XHQnRGVyIFVzZXIgJyt1c2VybmFtZSsnIHdpcmQgenVtIHByaXZhdGVuIENoYXQgZWluZ2VsYWRlbiwgYml0dGUgd2FydGUgYXVmIGRpZSBCZXN0w6R0aWd1bmcuJyxcclxuXHRcdFx0XHRcdCdXZW5uIGR1IGRpZXNlbiBEaWFsb2cgc2NobGllw590LCBkYW5uIHdpcmQgZGllIEVpbmxhZHVuZyB6dXLDvGNrIGdlem9nZW4hJ1xyXG5cdFx0XHRcdF07XHJcblxyXG5cdFx0XHRcdGNvbmZpZy5wcml2YXRlQ2hhdC5jYWxsZXJTb2NrZXRJZCA9IGNvbmZpZy5zb2NrZXRTZXNzaW9uSWQ7XHJcblx0XHRcdFx0Y29uZmlnLnByaXZhdGVDaGF0LmNhbGxlclVzZXJuYW1lID0gY29uZmlnLnNvY2tldERhdGEudXNlcm5hbWU7XHJcblx0XHRcdFx0Y29uZmlnLnByaXZhdGVDaGF0LnJlc3BvbnNlU29ja2V0SWQgPSBzZXNzb25pZDtcclxuXHRcdFx0XHRjb25maWcucHJpdmF0ZUNoYXQudXNlcm5hbWUgPSB1c2VybmFtZTtcclxuXHRcdFx0XHRjb25maWcucHJpdmF0ZUNoYXQubWVzc2FnZSA9ICcnO1xyXG5cdFx0XHRcdGNvbmZpZy5wcml2YXRlQ2hhdC50aW1lc3RhbXAgPSAnJztcclxuXHRcdFx0XHRjb25maWcuc29ja2V0UHJpdmF0ZUNoYXRBY3RpdmUgPSB0cnVlO1xyXG5cclxuXHRcdFx0XHRzZXRQcml2YXRlQ2hhdFN0YXR1cygxKTtcclxuXHRcdFx0XHRfc2VsZi5kaWFsb2coe3RpdGxlOidQcml2YXRlIENoYXQgQW5mcmFnZScsIHRleHQ6dHh0LCBidG50aXRsZTonQWJyZWNoZW4nfSk7XHJcblxyXG5cdFx0XHRcdGNvbmZpZy5zb2NrZXQuZW1pdCgndXNlciBwcml2YXRlIGNoYXQgcmVxdWVzdCcsIGNvbmZpZy5wcml2YXRlQ2hhdCk7XHJcblxyXG5cdFx0XHR9XHJcblx0XHR9XHJcblx0fTtcclxuXHJcblx0dGhpcy5hY2NlcHRQcml2YXRlQ2hhdFJlcXVlc3QgPSBmdW5jdGlvbiAoKSB7XHJcblxyXG5cdFx0Y29uZmlnLnNvY2tldC5lbWl0KCd1c2VyIHByaXZhdGUgY2hhdCBhY2NlcHQnLCB7XHJcblx0XHRcdGNhbGxlclNvY2tldElkOmNvbmZpZy5wcml2YXRlQ2hhdC5jYWxsZXJTb2NrZXRJZCxcclxuXHRcdFx0cmVzcG9uc2VTb2NrZXRJZDpjb25maWcucHJpdmF0ZUNoYXQucmVzcG9uc2VTb2NrZXRJZFxyXG5cdFx0fSk7XHJcblxyXG5cdH07XHJcblxyXG5cdHRoaXMucmVmdXNlUHJpdmF0ZUNoYXRSZXF1ZXN0ID0gZnVuY3Rpb24oKSB7XHJcblxyXG5cdFx0Y29uZmlnLnNvY2tldC5lbWl0KCd1c2VyIHByaXZhdGUgY2hhdCByZWZ1c2UnLCB7XHJcblx0XHRcdGNhbGxlclNvY2tldElkOmNvbmZpZy5wcml2YXRlQ2hhdC5jYWxsZXJTb2NrZXRJZCxcclxuXHRcdFx0cmVzcG9uc2VTb2NrZXRJZDpjb25maWcucHJpdmF0ZUNoYXQucmVzcG9uc2VTb2NrZXRJZFxyXG5cdFx0fSk7XHJcblxyXG5cdFx0X3NlbGYuZGVsZXRlUHJpdmF0ZUNoYXRSZXF1ZXN0KCk7XHJcblx0fTtcclxuXHJcblx0dGhpcy5kZWxldGVQcml2YXRlQ2hhdFJlcXVlc3QgPSBmdW5jdGlvbiAoKSB7XHJcblxyXG5cdFx0Y29uZmlnLnByaXZhdGVDaGF0LmNhbGxlclNvY2tldElkID0gJyc7XHJcblx0XHRjb25maWcucHJpdmF0ZUNoYXQucmVzcG9uc2VTb2NrZXRJZCA9ICcnO1xyXG5cdFx0Y29uZmlnLnByaXZhdGVDaGF0LnVzZXJuYW1lID0gJyc7XHJcblx0XHRjb25maWcucHJpdmF0ZUNoYXQubWVzc2FnZSA9ICcnO1xyXG5cdFx0Y29uZmlnLnByaXZhdGVDaGF0LnRpbWVzdGFtcCA9ICcnO1xyXG5cdFx0Y29uZmlnLnNvY2tldFByaXZhdGVDaGF0QWN0aXZlID0gZmFsc2U7XHJcblxyXG5cdFx0c2V0UHJpdmF0ZUNoYXRTdGF0dXMoMCk7XHJcblx0fTtcclxuXHJcblx0dGhpcy5kaXNjb25uZWN0UHJpdmF0ZUNoYXQgPSBmdW5jdGlvbiAoKSB7XHJcblxyXG5cdFx0Y29uZmlnLnNvY2tldC5lbWl0KCd1c2VyIHByaXZhdGUgY2hhdCBkaXNjb25uZWN0Jywge1xyXG5cdFx0XHRjYWxsZXJTb2NrZXRJZDpjb25maWcucHJpdmF0ZUNoYXQuY2FsbGVyU29ja2V0SWQsXHJcblx0XHRcdHJlc3BvbnNlU29ja2V0SWQ6Y29uZmlnLnByaXZhdGVDaGF0LnJlc3BvbnNlU29ja2V0SWRcclxuXHRcdH0pO1xyXG5cclxuXHRcdF9zZWxmLmRlbGV0ZVByaXZhdGVDaGF0UmVxdWVzdCgpO1xyXG5cdH07XHJcblxyXG5cdHRoaXMuc29ja2V0RGlzY29ubmVjdCA9IGZ1bmN0aW9uICgpIHtcclxuXHJcblx0XHRjb25maWcuc29ja2V0LmRpc2Nvbm5lY3QoKTtcclxuXHRcdGNvbmZpZy5zb2NrZXRJc0Rpc2Nvbm5lY3RlZCA9IHRydWU7XHJcblx0XHRjb25maWcuc29ja2V0U2Vzc2lvbklkID0gJyc7XHJcblxyXG5cdFx0cmVzZXRDaGF0KCk7XHJcblx0XHR0b2dnbGVDaGF0TGV2ZWwoKTtcclxuXHR9O1xyXG5cclxuXHR0aGlzLnNldExvZ2luQWNjZXNzRGF0YSA9IGZ1bmN0aW9uIChkYXRhKSB7XHJcblxyXG5cdFx0Y29uZmlnLnNvY2tldElzRGlzY29ubmVjdGVkID0gZmFsc2U7XHJcblx0XHRjb25maWcuc29ja2V0U2Vzc2lvbklkID0gZGF0YS5zZXNzaW9uSWQ7XHJcblxyXG5cdFx0YWRkVG9Vc2VybGlzdChkYXRhLnVzZXJzKTtcclxuXHRcdGFkZFRvQ2hhdGxpc3Qoe3RpbWVzdGFtcDpkYXRhLnRpbWVzdGFtcCx1c2VybmFtZTpkYXRhLnVzZXJuYW1lfSwgJ3VzZXInKTtcclxuXHRcdHRvZ2dsZUNoYXRMZXZlbCgpO1xyXG5cclxuXHR9O1xyXG5cclxuXHR0aGlzLnNvY2tldFJlc3BvbnNlU2V0TWVzc2FnZSA9IGZ1bmN0aW9uIChkYXRhKSB7XHJcblxyXG5cdFx0aWYgKCAhIGNvbmZpZy5zb2NrZXRJc0Rpc2Nvbm5lY3RlZCkge1xyXG5cclxuXHRcdFx0YWRkVG9DaGF0bGlzdChkYXRhLCAnbXNnJyk7XHJcblxyXG5cdFx0fVxyXG5cdH07XHJcblxyXG5cdHRoaXMuc29ja2V0UmVzcG9uc2VVc2VyTmV3ID0gZnVuY3Rpb24gKGRhdGEpIHtcclxuXHJcblx0XHRpZiAoICEgY29uZmlnLnNvY2tldElzRGlzY29ubmVjdGVkKSB7XHJcblxyXG5cdFx0XHRhZGRUb0NoYXRsaXN0KHt0aW1lc3RhbXA6ZGF0YS50aW1lc3RhbXAsdXNlcm5hbWU6ZGF0YS51c2VybmFtZX0sICd1c2VyJyk7XHJcblx0XHRcdGFkZFRvVXNlcmxpc3Qoe1widXNlclwiOnt1c2VybmFtZTpkYXRhLnVzZXJuYW1lLHNlc3Npb25JZDpkYXRhLnNlc3Npb25JZH19KTtcclxuXHJcblx0XHR9XHJcblx0fTtcclxuXHJcblx0dGhpcy5zb2NrZXRSZXNwb25zZVVzZXJEaXNjb25uZWN0ID0gZnVuY3Rpb24gKGRhdGEpIHtcclxuXHJcblx0XHRpZiAoICEgY29uZmlnLnNvY2tldElzRGlzY29ubmVjdGVkKSB7XHJcblxyXG5cdFx0XHRyZXNldFVzZXJsaXN0KGRhdGEudXNlcnMpO1xyXG5cdFx0XHRhZGRUb0NoYXRsaXN0KHt0aW1lc3RhbXA6ZGF0YS50aW1lc3RhbXAsIHVzZXJuYW1lOmRhdGEudXNlcm5hbWV9LCAnZGlzY29ubmVjdCcpO1xyXG5cclxuXHRcdH1cclxuXHR9O1xyXG5cclxuXHR0aGlzLnNvY2tldFJlc3BvbnNlVXNlckludml0ZSA9IGZ1bmN0aW9uIChkYXRhKSB7XHJcblxyXG5cdFx0dmFyIHR4dCA9IFtcclxuXHRcdFx0J0RlciBVc2VyICcrZGF0YS51c2VybmFtZSsnIG3DtmNodGUgZGljaCB6dW0gcHJpdmF0ZW4gQ2hhdCBlaW5nZWxhZGVuLicsXHJcblx0XHRcdCdXZW5uIGR1IGRpZXNlbiBEaWFsb2cgc2NobGllw590LCBkYW5uIHdpcmQgZGllIEVpbmxhZHVuZyBhYmdlbGVobnQhJ1xyXG5cdFx0XTtcclxuXHJcblx0XHRjb25maWcucHJpdmF0ZUNoYXQuY2FsbGVyU29ja2V0SWQgPSBjb25maWcuc29ja2V0U2Vzc2lvbklkO1xyXG5cdFx0Y29uZmlnLnByaXZhdGVDaGF0LmNhbGxlclVzZXJuYW1lID0gY29uZmlnLnNvY2tldERhdGEudXNlcm5hbWU7XHJcblx0XHRjb25maWcucHJpdmF0ZUNoYXQucmVzcG9uc2VTb2NrZXRJZCA9IGRhdGEuY2FsbGVyU29ja2V0SWQ7XHJcblx0XHRjb25maWcucHJpdmF0ZUNoYXQudXNlcm5hbWUgPSBkYXRhLnVzZXJuYW1lO1xyXG5cdFx0Y29uZmlnLnByaXZhdGVDaGF0Lm1lc3NhZ2UgPSAnJztcclxuXHRcdGNvbmZpZy5wcml2YXRlQ2hhdC50aW1lc3RhbXAgPSAnJztcclxuXHRcdGNvbmZpZy5zb2NrZXRQcml2YXRlQ2hhdEFjdGl2ZSA9IHRydWU7XHJcblxyXG5cdFx0c2V0UHJpdmF0ZUNoYXRTdGF0dXMoMyk7XHJcblxyXG5cdFx0X3NlbGYuZGlhbG9nKHtcclxuXHRcdFx0dGl0bGU6J0VpbmxhZHVuZyB6dW0gcHJpdmF0ZW4gQ2hhdCcsXHJcblx0XHRcdHRleHQ6dHh0LCBidG50aXRsZTonQWJsZWhuZW4nLFxyXG5cdFx0XHRjb25maXJtOidhY2NlcHQnXHJcblx0XHR9KTtcclxuXHR9O1xyXG5cclxuXHR0aGlzLnNvY2tldFJlc3BvbnNlUmVmdXNlVXNlckludml0ZSA9IGZ1bmN0aW9uKGRhdGEpIHtcclxuXHJcblx0XHRpZiAoY29uZmlnLnNvY2tldFByaXZhdGVDaGF0QWN0aXZlID09PSB0cnVlICYmIGNvbmZpZy5wcml2YXRlQ2hhdC5yZXNwb25zZVNvY2tldElkID09PSBkYXRhLmNhbGxlclNvY2tldElkKSB7XHJcblxyXG5cdFx0XHQkKCcubW9kYWwtYm9keScsIGNvbmZpZy5kb20uY2hhdERpYWxvZylcclxuXHRcdFx0XHQuaHRtbCgnRGVyIFVzZXIgaGF0IGRpZSBFaW5sYWR1bmcgYWJnZWxlaG50LCcpO1xyXG5cdFx0fVxyXG5cdH07XHJcblxyXG5cdHRoaXMuc29ja2V0UmVzcG9uc2VBY2NlcHRQcml2YXRlQ2hhdCA9IGZ1bmN0aW9uKGRhdGEpIHtcclxuXHJcblx0XHRpZiAoY29uZmlnLnNvY2tldFByaXZhdGVDaGF0QWN0aXZlID09PSB0cnVlICYmIGNvbmZpZy5wcml2YXRlQ2hhdC5yZXNwb25zZVNvY2tldElkID09PSBkYXRhLmNhbGxlclNvY2tldElkKSB7XHJcblxyXG5cdFx0XHQkKCcubW9kYWwtYm9keScsIGNvbmZpZy5kb20uY2hhdERpYWxvZylcclxuXHRcdFx0XHQuaHRtbCgnRGVyIFVzZXIgaGF0IGRpZSBFaW5sYWR1bmcgYW5nZW5vbW1lbiwgYml0dGUgd2FydGVuLCBOSUNIVCBkaWVzZW4gRGlhbG9nIHNjaGxpZXNzZW4hJyk7XHJcblxyXG5cdFx0XHRzZXRQcml2YXRlQ2hhdFN0YXR1cyg0KTtcclxuXHJcblx0XHRcdGNvbmZpZy5zb2NrZXQuZW1pdCgndXNlciBwcml2YXRlIGNoYXQgb3BlbicsIHtcclxuXHRcdFx0XHRjYWxsZXJTb2NrZXRJZCA6IGNvbmZpZy5wcml2YXRlQ2hhdC5jYWxsZXJTb2NrZXRJZCxcclxuXHRcdFx0XHRyZXNwb25zZVNvY2tldElkIDogY29uZmlnLnByaXZhdGVDaGF0LnJlc3BvbnNlU29ja2V0SWQsXHJcblx0XHRcdFx0Y2FsbGVyVXNlcm5hbWUgOiBjb25maWcuc29ja2V0RGF0YS51c2VybmFtZVxyXG5cdFx0XHR9KTtcclxuXHJcblx0XHR9XHJcblx0fTtcclxuXHJcblx0dGhpcy5zb2NrZXRSZXNwb25zZU9wZW5Qcml2YXRlQ2hhdCA9IGZ1bmN0aW9uIChkYXRhKSB7XHJcblxyXG5cdFx0Y29uZmlnLnByaXZhdGVDaGF0Lm1lc3NhZ2UgPSBjb25maWcucHJpdmF0ZUNoYXQudXNlcm5hbWUgKyAnIGhhdCBkZW4gUmF1bSBiZXRyZXRlbic7XHJcblx0XHRjb25maWcucHJpdmF0ZUNoYXQudGltZXN0YW1wID0gZGF0YS50aW1lc3RhbXA7XHJcblxyXG5cdFx0c2V0UHJpdmF0ZUNoYXRTdGF0dXMoMik7XHJcblxyXG5cdFx0Y29uZmlnLmRvbS5jaGF0RGlhbG9nLm1vZGFsKCdoaWRlJyk7XHJcblxyXG5cdFx0Q2hhdFJlbmRlcmVyLnJlbmRlclByaXZhdGVDaGF0KCk7XHJcblx0XHRDaGF0UmVuZGVyZXIucmVuZGVyUHJpdmF0ZUNoYXRNZXNzYWdlKCdzdGF0dXMnKTtcclxuXHJcblx0XHRjb25maWcuc29ja2V0LmVtaXQoJ3VzZXIgcHJpdmF0ZSBjaGF0IG1lc3NhZ2UnLCB7XHJcblx0XHRcdGNhbGxlclNvY2tldElkIDogY29uZmlnLnByaXZhdGVDaGF0LmNhbGxlclNvY2tldElkLFxyXG5cdFx0XHRyZXNwb25zZVNvY2tldElkIDogY29uZmlnLnByaXZhdGVDaGF0LnJlc3BvbnNlU29ja2V0SWQsXHJcblx0XHRcdGNhbGxlclVzZXJuYW1lIDogY29uZmlnLnNvY2tldERhdGEudXNlcm5hbWVcclxuXHRcdH0pO1xyXG5cclxuXHR9O1xyXG5cclxuXHR0aGlzLnNvY2tldFJlc3BvbnNlTWVzc2FnZVByaXZhdGVDaGF0ID0gZnVuY3Rpb24gKGRhdGEpIHtcclxuXHJcblx0XHR2YXIgdHlwZSA9ICdtc2cnO1xyXG5cclxuXHRcdGlmIChjb25maWcuc29ja2V0UHJpdmF0ZUNoYXRBY3RpdmUgPT09IHRydWUgJiYgY29uZmlnLnByaXZhdGVDaGF0LnJlc3BvbnNlU29ja2V0SWQgPT09IGRhdGEuY2FsbGVyU29ja2V0SWQpIHtcclxuXHJcblx0XHRcdGNvbmZpZy5wcml2YXRlQ2hhdC5tZXNzYWdlID0gZGF0YS5tZXNzYWdlO1xyXG5cdFx0XHRjb25maWcucHJpdmF0ZUNoYXQudGltZXN0YW1wID0gZGF0YS50aW1lc3RhbXA7XHJcblxyXG5cdFx0XHRpZiAoY29uZmlnLnNvY2tldFByaXZhdGVDaGF0U3RhdHVzID09PSAnYWNjZXB0JyB8fCBjb25maWcuc29ja2V0UHJpdmF0ZUNoYXRTdGF0dXMgPT09ICdyZXFkZWNpc2lvbicpIHtcclxuXHJcblx0XHRcdFx0dHlwZSA9ICdzdGF0dXMnO1xyXG5cdFx0XHRcdGNvbmZpZy5wcml2YXRlQ2hhdC5tZXNzYWdlID0gY29uZmlnLnByaXZhdGVDaGF0LnVzZXJuYW1lICsgJyBoYXQgZGVuIFJhdW0gYmV0cmV0ZW4nO1xyXG5cclxuXHRcdFx0XHRjb25maWcuZG9tLmNoYXREaWFsb2cubW9kYWwoJ2hpZGUnKTtcclxuXHJcblx0XHRcdFx0Q2hhdFJlbmRlcmVyLnJlbmRlclByaXZhdGVDaGF0KCk7XHJcblxyXG5cdFx0XHR9XHJcblxyXG5cdFx0XHRzZXRQcml2YXRlQ2hhdFN0YXR1cygyKTtcclxuXHRcdFx0Q2hhdFJlbmRlcmVyLnJlbmRlclByaXZhdGVDaGF0TWVzc2FnZSh0eXBlKTtcclxuXHJcblx0XHR9XHJcblx0fTtcclxuXHJcblx0dGhpcy5zb2NrZXRSZXNwb25zZURpc2Nvbm5lY3RQcml2YXRlQ2hhdCA9IGZ1bmN0aW9uIChkYXRhKSB7XHJcblxyXG5cdFx0aWYgKGNvbmZpZy5zb2NrZXRQcml2YXRlQ2hhdEFjdGl2ZSA9PT0gdHJ1ZSAmJiBjb25maWcucHJpdmF0ZUNoYXQucmVzcG9uc2VTb2NrZXRJZCA9PT0gZGF0YS5jYWxsZXJTb2NrZXRJZCkge1xyXG5cclxuXHRcdFx0aWYgKGNvbmZpZy5zb2NrZXRQcml2YXRlQ2hhdFN0YXR1cyA9PT0gJ29wZW4nKSB7XHJcblxyXG5cdFx0XHRcdGNvbmZpZy5wcml2YXRlQ2hhdC5tZXNzYWdlID0gY29uZmlnLnByaXZhdGVDaGF0LnVzZXJuYW1lICsgJyBoYXQgZGVuIFJhdW0gdmVybGFzc2VuJztcclxuXHRcdFx0XHRjb25maWcucHJpdmF0ZUNoYXQudGltZXN0YW1wID0gZGF0YS50aW1lc3RhbXA7XHJcblxyXG5cdFx0XHRcdENoYXRSZW5kZXJlci5yZW5kZXJQcml2YXRlQ2hhdE1lc3NhZ2UoJ3N0YXR1cycpO1xyXG5cclxuXHRcdFx0fVxyXG5cclxuXHRcdFx0X3NlbGYuZGVsZXRlUHJpdmF0ZUNoYXRSZXF1ZXN0KCk7XHJcblxyXG5cdFx0fVxyXG5cdH07XHJcblxyXG5cdHJldHVybiB0aGlzO1xyXG59XHJcblxyXG5nbG9iYWwuYXBwID0gZ2xvYmFsLmFwcCB8fCB7fTtcclxuZ2xvYmFsLmFwcC5DaGF0TW9kZWwgPSBDaGF0TW9kZWw7IiwiXHJcbmZ1bmN0aW9uIENoYXRSZW5kZXJlciAoY29uZmlnKSB7XHJcblxyXG5cdGZ1bmN0aW9uIHRpbWVzdGFtcCAoc29ja2V0dGltZSkge1xyXG5cclxuXHRcdHNvY2tldHRpbWUgPSAkLnRyaW0oc29ja2V0dGltZSk7XHJcblxyXG5cdFx0aWYoICEgc29ja2V0dGltZS5sZW5ndGgpIHtcclxuXHRcdFx0cmV0dXJuICcnO1xyXG5cdFx0fVxyXG5cclxuXHRcdHZhciB0aW1lID0gbmV3IERhdGUoc29ja2V0dGltZSk7XHJcblx0XHR2YXIgaCA9ICh0aW1lLmdldEhvdXJzKCkgPCAxMCkgPyAnMCcgKyB0aW1lLmdldEhvdXJzKCkgOiB0aW1lLmdldEhvdXJzKCk7XHJcblx0XHR2YXIgbSA9ICh0aW1lLmdldE1pbnV0ZXMoKSA8IDEwKSA/ICcwJyArIHRpbWUuZ2V0TWludXRlcygpIDogdGltZS5nZXRNaW51dGVzKCk7XHJcblxyXG5cdFx0cmV0dXJuIGggKyc6JyttO1xyXG5cdH1cclxuXHJcblx0dGhpcy5yZW5kZXJDaGF0bGlzdCA9IGZ1bmN0aW9uICh0eXBlLCB0eHQsIHRpbWUpIHtcclxuXHJcblx0XHR2YXIgc3BhbnRpbWVzdGFtcCA9ICQoJzxzcGFuPicpLnRleHQoJ1snICsgdGltZXN0YW1wKHRpbWUpICsgJ10nKTtcclxuXHRcdHZhciBsaSA9ICQoJzxsaT4nLHtcImNsYXNzXCI6XCJjaGF0bGlzdF9cIiArIHR5cGV9KS5hcHBlbmQoc3BhbnRpbWVzdGFtcCwgdHh0KTtcclxuXHJcblx0XHRjb25maWcuZG9tLmNoYXRMaXN0LmFwcGVuZChsaSk7XHJcblx0fTtcclxuXHJcblx0dGhpcy5yZW5kZXJVc2VybGlzdCA9IGZ1bmN0aW9uICh1c2VyKSB7XHJcblxyXG5cdFx0dmFyIHRpdGxlID0gKHVzZXIuc2Vzc2lvbklkICE9PSBjb25maWcuc29ja2V0U2Vzc2lvbklkKSA/ICdPcGVuIGEgcHJpdmF0ZSBjaGF0IHdpdGggdGhpcyB1c2VyLicgOiAnTXkgdXNlcm5hbWUnO1xyXG5cdFx0dmFyIGNzcyA9ICh1c2VyLnNlc3Npb25JZCAhPT0gY29uZmlnLnNvY2tldFNlc3Npb25JZCkgPyAndXNlcmxpc3QnIDogJ3VzZXJsaXN0X3NlbGYnO1xyXG5cclxuXHRcdHZhciBsaSA9ICQoJzxsaT4nLHtcImNsYXNzXCI6Y3NzLCBcImRhdGEtc2Vzc2lkXCI6dXNlci5zZXNzaW9uSWQsIFwidGl0bGVcIjp0aXRsZX0pLnRleHQodXNlci51c2VybmFtZSk7XHJcblx0XHRjb25maWcuZG9tLmNoYXRVc2VybGlzdC5hcHBlbmQobGkpO1xyXG5cclxuXHR9O1xyXG5cclxuXHR0aGlzLnJlbmRlclByaXZhdGVDaGF0ID0gZnVuY3Rpb24gKCkge1xyXG5cclxuXHRcdCQoJy5tb2RhbC10aXRsZScsIGNvbmZpZy5kb20ucHJpdmF0ZUNoYXRNb2RhbCkudGV4dCgnUHJpdmF0ZSBDaGF0IG1pdCAnICsgY29uZmlnLnByaXZhdGVDaGF0LnVzZXJuYW1lKTtcclxuXHJcblx0XHRjb25maWcuZG9tLnByaXZhdGVDaGF0TW9kYWwubW9kYWwoJ3Nob3cnKTtcclxuXHJcblx0fTtcclxuXHJcblx0dGhpcy5yZW5kZXJQcml2YXRlQ2hhdE1lc3NhZ2UgPSBmdW5jdGlvbiAodHlwZSkge1xyXG5cclxuXHRcdHZhciB0ZXh0ID0gKHR5cGU9PT0nbXNnJykgPyAnICcgKyBjb25maWcucHJpdmF0ZUNoYXQudXNlcm5hbWUgKyAnICcgKyBjb25maWcucHJpdmF0ZUNoYXQubWVzc2FnZSA6ICcgJyArIGNvbmZpZy5wcml2YXRlQ2hhdC5tZXNzYWdlO1xyXG5cdFx0dmFyIHNwYW50aW1lc3RhbXAgPSAkKCc8c3Bhbj4nKS50ZXh0KCdbJyArIHRpbWVzdGFtcChjb25maWcucHJpdmF0ZUNoYXQudGltZXN0YW1wKSArICddJyk7XHJcblx0XHR2YXIgbGkgPSAkKCc8bGk+Jyx7XCJjbGFzc1wiOlwiY2hhdGxpc3RfdXNlclwifSkuYXBwZW5kKHNwYW50aW1lc3RhbXAsIHRleHQpO1xyXG5cclxuXHRcdGNvbmZpZy5kb20ucHJpdmF0ZUNoYXRMaXN0LmFwcGVuZChsaSk7XHJcblxyXG5cdH07XHJcblxyXG5cdHJldHVybiB0aGlzO1xyXG59XHJcblxyXG5nbG9iYWwuYXBwID0gZ2xvYmFsLmFwcCB8fCB7fTtcclxuZ2xvYmFsLmFwcC5DaGF0UmVuZGVyZXIgPSBDaGF0UmVuZGVyZXI7XHJcbiIsIlxyXG5cclxuZnVuY3Rpb24gQ2hhdFNvY2tldExpc3RlbmVyIChNb2RlbCwgY29uZmlnKSB7XHJcblxyXG5cdGNvbmZpZy5zb2NrZXQub24oJ2xvZ2luIHN1Y2Nlc3MnLCBmdW5jdGlvbiAoZGF0YSkge1xyXG5cclxuXHRcdE1vZGVsLnNldExvZ2luQWNjZXNzRGF0YShkYXRhKTtcclxuXHJcblx0fSk7XHJcblxyXG5cdGNvbmZpZy5zb2NrZXQub24oJ2xvZ2luIGVycm9yJywgZnVuY3Rpb24gKCkge1xyXG5cclxuXHRcdE1vZGVsLmRpYWxvZygnRGVyIEJlbnV0emVybmFtZSBpc3QgdW5nw7xsdGlnJyk7XHJcblxyXG5cdH0pO1xyXG5cclxuXHRjb25maWcuc29ja2V0Lm9uKCdsb2dpbiBlcnIjdXNlcm5hbWUnLCBmdW5jdGlvbiAoKSB7XHJcblxyXG5cdFx0TW9kZWwuZGlhbG9nKCdEZXIgQmVudXR6ZXJuYW1lIHdpcmQgc2Nob24gYmVuw7x0enQsIGJpdHRlIHfDpGhsZSBlaW5lbiBhbmRlcmVuIE5hbWVuLicpO1xyXG5cclxuXHR9KTtcclxuXHJcblx0Y29uZmlnLnNvY2tldC5vbignY2hhdCBtZXNzYWdlJywgZnVuY3Rpb24gKGRhdGEpIHtcclxuXHJcblx0XHRNb2RlbC5zb2NrZXRSZXNwb25zZVNldE1lc3NhZ2UoZGF0YSk7XHJcblxyXG5cdH0pO1xyXG5cclxuXHRjb25maWcuc29ja2V0Lm9uKCduZXcgdXNlcicsIGZ1bmN0aW9uIChkYXRhKSB7XHJcblxyXG5cdFx0TW9kZWwuc29ja2V0UmVzcG9uc2VVc2VyTmV3KGRhdGEpO1xyXG5cdH0pO1xyXG5cclxuXHRjb25maWcuc29ja2V0Lm9uKCd1c2VyIGRpc2Nvbm5lY3QnLCBmdW5jdGlvbiAoZGF0YSkge1xyXG5cclxuXHRcdE1vZGVsLnNvY2tldFJlc3BvbnNlVXNlckRpc2Nvbm5lY3QoZGF0YSk7XHJcblxyXG5cdH0pO1xyXG5cclxuXHRjb25maWcuc29ja2V0Lm9uKCd1c2VyIHByaXZhdGUgbWVzc2FnZSBpbnZpdGUnLCBmdW5jdGlvbiAoZGF0YSkge1xyXG5cclxuXHRcdE1vZGVsLnNvY2tldFJlc3BvbnNlVXNlckludml0ZShkYXRhKTtcclxuXHJcblx0fSk7XHJcblxyXG5cdGNvbmZpZy5zb2NrZXQub24oJ3VzZXIgcHJpdmF0ZSBjaGF0IHJlZnVzZScsIGZ1bmN0aW9uKGRhdGEpIHtcclxuXHJcblx0XHRNb2RlbC5zb2NrZXRSZXNwb25zZVJlZnVzZVVzZXJJbnZpdGUoZGF0YSk7XHJcblxyXG5cdH0pO1xyXG5cclxuXHRjb25maWcuc29ja2V0Lm9uKCd1c2VyIHByaXZhdGUgY2hhdCBhY2NlcHQnLCBmdW5jdGlvbiAoZGF0YSkge1xyXG5cclxuXHRcdE1vZGVsLnNvY2tldFJlc3BvbnNlQWNjZXB0UHJpdmF0ZUNoYXQoZGF0YSk7XHJcblxyXG5cdH0pO1xyXG5cclxuXHRjb25maWcuc29ja2V0Lm9uKCd1c2VyIHByaXZhdGUgY2hhdCBvcGVuJywgZnVuY3Rpb24gKGRhdGEpIHtcclxuXHJcblx0XHRNb2RlbC5zb2NrZXRSZXNwb25zZU9wZW5Qcml2YXRlQ2hhdChkYXRhKTtcclxuXHJcblx0fSk7XHJcblxyXG5cdGNvbmZpZy5zb2NrZXQub24oJ3VzZXIgcHJpdmF0ZSBjaGF0IG1lc3NhZ2UnLCBmdW5jdGlvbiAoZGF0YSkge1xyXG5cclxuXHRcdE1vZGVsLnNvY2tldFJlc3BvbnNlTWVzc2FnZVByaXZhdGVDaGF0KGRhdGEpO1xyXG5cclxuXHR9KTtcclxuXHJcblx0Y29uZmlnLnNvY2tldC5vbigndXNlciBwcml2YXRlIGNoYXQgZGlzY29ubmVjdCcsIGZ1bmN0aW9uIChkYXRhKSB7XHJcblxyXG5cdFx0TW9kZWwuc29ja2V0UmVzcG9uc2VEaXNjb25uZWN0UHJpdmF0ZUNoYXQoZGF0YSk7XHJcblxyXG5cdH0pO1xyXG5cclxufVxyXG5cclxuZ2xvYmFsLmFwcCA9IGdsb2JhbC5hcHAgfHwge307XHJcbmdsb2JhbC5hcHAuQ2hhdFNvY2tldExpc3RlbmVyID0gQ2hhdFNvY2tldExpc3RlbmVyOyIsIlxyXG4kKGRvY3VtZW50KS5yZWFkeSAoZnVuY3Rpb24gKCkge1xyXG5cdGdsb2JhbC5hcHAuQ2hhdENvbnRyb2xsZXIuaW5pdCgpO1xyXG59KTtcclxuIl19
