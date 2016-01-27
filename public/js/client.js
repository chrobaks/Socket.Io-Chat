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

		if ( Model.filterPrivateChatStatus('waiting') ) {

			Model.disconnectPrivateChat();

		} else if ( Model.filterPrivateChatStatus('reqdecision') ) {

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
}).call(this,typeof global !== "undefined" ? global : typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {})

},{}],4:[function(require,module,exports){
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

	socket.on('user private chat inviting', function (data) {

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

},{}],5:[function(require,module,exports){
(function (global){

function ChatView (config) {

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
		chatLvl0 : $('.chatLvl0', '#chatWrapper'),
		chatLvl1 : $('.chatLvl1', '#chatWrapper'),
		privateChatModal : $('#privateChatModal'),
		btnExitChatroom : $('#btnExitChatroom'),
		btnConfirm : $('.btn.btn-success', '#chatDialog'),
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

		$('<li>',{"class":"chatlist_" + type})
			.append(spantimestamp, txt)
			.appendTo(config.dom.chatList);

	};

	this.renderUserlist = function (user) {

		var title = (user.sessionId !== config.socketSessionId) ? 'Open a private chat with this user.' : 'My username';
		var css = (user.sessionId !== config.socketSessionId) ? 'userlist' : 'userlist_self';

		$('<li>',{"class":css, "data-sessid":user.sessionId, "title":title})
			.text(user.username)
			.appendTo(config.dom.chatUserlist);

	};

	this.renderPrivateChat = function () {

		$('.modal-title', config.dom.privateChatModal)
			.text('Private Chat mit ' + config.privateChat.responseUsername);

		config.dom.privateChatModal.modal('show');

	};

	this.renderPrivateChatMessage = function (type) {

		var text = (type==='msg') ? ' ' + config.privateChat.responseUsername + ' ' + config.privateChat.message : ' ' + config.privateChat.message;
		var spantimestamp = $('<span>').text('[' + timestamp(config.privateChat.timestamp) + ']');

		$('<li>',{"class":"chatlist_user"})
			.append(spantimestamp, text)
			.appendTo(config.dom.privateChatList);

	};

	this.renderDialog = function (arg) {

		if (arg === null) {

			config.dom.chatDialog.modal('hide');
			return true;

		}

		var btntitle = arg.btntitle || 'schliessen';

		_self.renderDialogBody('<p>' + arg.text.join('</p><p>') + '</p>');
		_self.dialogDisplayConfirm('none');

		if (arg.hasOwnProperty('confirm')) {

			_self.dialogDisplayConfirm('block');

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

		var showlvl0 = (config.dom.chatLvl0.css('display') !== 'none') ? 'none' : 'block';
		var showlvl1 = (showlvl0 === 'block' ) ? 'none' : 'block';

		console.log('toggleChatLevel',showlvl0,showlvl1);
		config.dom.chatLvl0.css('display', showlvl0);
		config.dom.chatLvl1.css('display', showlvl1);
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

	this.dialogIsOpen = function() {
		return (config.dom.chatDialog.css('display')!=='none');
	};

	this.dialogDisplayConfirm = function(val) {
		config.dom.btnConfirm.css('display',val);
	};

	return this;
}

global.app = global.app || {};
global.app.ChatView = ChatView;

}).call(this,typeof global !== "undefined" ? global : typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {})

},{}],6:[function(require,module,exports){
(function (global){

$(document).ready (function () {
	global.app.ChatController.init();
});

}).call(this,typeof global !== "undefined" ? global : typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {})

},{}]},{},[5,3,4,2,1,6])
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIm5vZGVfbW9kdWxlcy9icm93c2VyLXBhY2svX3ByZWx1ZGUuanMiLCJwdWJsaWMvanMvYXBwL0NoYXRDb250cm9sbGVyLmpzIiwicHVibGljL2pzL2FwcC9DaGF0RXZlbnRMaXN0ZW5lci5qcyIsInB1YmxpYy9qcy9hcHAvQ2hhdE1vZGVsLmpzIiwicHVibGljL2pzL2FwcC9DaGF0U29ja2V0TGlzdGVuZXIuanMiLCJwdWJsaWMvanMvYXBwL0NoYXRWaWV3LmpzIiwicHVibGljL2pzL2FwcC9pbmRleC5qcyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7QUNBQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7Ozs7QUM5QkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7Ozs7O0FDbEVBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7Ozs7O0FDbGRBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOzs7OztBQzlFQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7Ozs7QUNsS0E7QUFDQTtBQUNBO0FBQ0E7QUFDQSIsImZpbGUiOiJnZW5lcmF0ZWQuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlc0NvbnRlbnQiOlsiKGZ1bmN0aW9uIGUodCxuLHIpe2Z1bmN0aW9uIHMobyx1KXtpZighbltvXSl7aWYoIXRbb10pe3ZhciBhPXR5cGVvZiByZXF1aXJlPT1cImZ1bmN0aW9uXCImJnJlcXVpcmU7aWYoIXUmJmEpcmV0dXJuIGEobywhMCk7aWYoaSlyZXR1cm4gaShvLCEwKTt2YXIgZj1uZXcgRXJyb3IoXCJDYW5ub3QgZmluZCBtb2R1bGUgJ1wiK28rXCInXCIpO3Rocm93IGYuY29kZT1cIk1PRFVMRV9OT1RfRk9VTkRcIixmfXZhciBsPW5bb109e2V4cG9ydHM6e319O3Rbb11bMF0uY2FsbChsLmV4cG9ydHMsZnVuY3Rpb24oZSl7dmFyIG49dFtvXVsxXVtlXTtyZXR1cm4gcyhuP246ZSl9LGwsbC5leHBvcnRzLGUsdCxuLHIpfXJldHVybiBuW29dLmV4cG9ydHN9dmFyIGk9dHlwZW9mIHJlcXVpcmU9PVwiZnVuY3Rpb25cIiYmcmVxdWlyZTtmb3IodmFyIG89MDtvPHIubGVuZ3RoO28rKylzKHJbb10pO3JldHVybiBzfSkiLCJcclxuZnVuY3Rpb24gQ2hhdENvbnRyb2xsZXIgKCkge1xyXG5cclxuXHR2YXIgY29uZmlnID0ge1xyXG5cdFx0c29ja2V0IDogbnVsbCxcclxuXHRcdGRvbSA6IG51bGxcclxuXHR9O1xyXG5cclxuXHR2YXIgTW9kZWwgPSBudWxsO1xyXG5cdHZhciBDaGF0U29ja2V0TGlzdGVuZXIgPSBudWxsO1xyXG5cdHZhciBDaGF0RXZlbnRMaXN0ZW5lciA9IG51bGw7XHJcblxyXG5cdHRoaXMuaW5pdCA9IGZ1bmN0aW9uICgpIHtcclxuXHJcblx0XHRpZiAoaW8pIHtcclxuXHJcblx0XHRcdGNvbmZpZy5zb2NrZXQgPSBpbygpO1xyXG5cclxuXHRcdFx0TW9kZWwgPSBuZXcgZ2xvYmFsLmFwcC5DaGF0TW9kZWwoY29uZmlnKTtcclxuXHRcdFx0Q2hhdFNvY2tldExpc3RlbmVyID0gbmV3IGdsb2JhbC5hcHAuQ2hhdFNvY2tldExpc3RlbmVyKE1vZGVsLCBjb25maWcuc29ja2V0KTtcclxuXHRcdFx0Q2hhdEV2ZW50TGlzdGVuZXIgPSBuZXcgZ2xvYmFsLmFwcC5DaGF0RXZlbnRMaXN0ZW5lcihNb2RlbCwgY29uZmlnLmRvbSk7XHJcblxyXG5cdFx0fVxyXG5cdH07XHJcblxyXG5cdHJldHVybiB0aGlzO1xyXG5cclxufVxyXG5cclxuZ2xvYmFsLmFwcCA9IGdsb2JhbC5hcHAgfHwge307XHJcbmdsb2JhbC5hcHAuQ2hhdENvbnRyb2xsZXIgPSBuZXcgQ2hhdENvbnRyb2xsZXIoKTsiLCJcclxuZnVuY3Rpb24gQ2hhdEV2ZW50TGlzdGVuZXIgKE1vZGVsLCBkb20pIHtcclxuXHJcblx0ZG9tLnVzZXJuYW1lRm9ybS5vbignc3VibWl0JywgZnVuY3Rpb24gKCkge1xyXG5cclxuXHRcdE1vZGVsLmFkZFVzZXIoKTtcclxuXHJcblx0XHRyZXR1cm4gZmFsc2U7XHJcblxyXG5cdH0pO1xyXG5cclxuXHRkb20uY2hhdEZvcm0ub24oJ3N1Ym1pdCcsIGZ1bmN0aW9uICgpIHtcclxuXHJcblx0XHRNb2RlbC5zZW5kTWVzc2FnZSgpO1xyXG5cclxuXHRcdHJldHVybiBmYWxzZTtcclxuXHJcblx0fSk7XHJcblxyXG5cdGRvbS5wcml2YXRlQ2hhdEZvcm0ub24oJ3N1Ym1pdCcsIGZ1bmN0aW9uICgpIHtcclxuXHJcblx0XHRNb2RlbC5zZW5kUHJpdmF0ZU1lc3NhZ2UoKTtcclxuXHJcblx0XHRyZXR1cm4gZmFsc2U7XHJcblxyXG5cdH0pO1xyXG5cclxuXHRkb20uYnRuRXhpdENoYXRyb29tLm9uKCdjbGljaycsIGZ1bmN0aW9uICgpIHtcclxuXHJcblx0XHRNb2RlbC5zb2NrZXREaXNjb25uZWN0KCk7XHJcblxyXG5cdH0pO1xyXG5cclxuXHQkKGRvbS5idG5Db25maXJtICwgZG9tLmNoYXREaWFsb2cpLm9uKCdtb3VzZXVwJywgZnVuY3Rpb24gKCkge1xyXG5cclxuXHRcdE1vZGVsLmFjY2VwdFByaXZhdGVDaGF0UmVxdWVzdCgpO1xyXG5cclxuXHR9KTtcclxuXHJcblx0ZG9tLmNoYXRVc2VybGlzdC5vbignY2xpY2snLCAnLnVzZXJsaXN0JywgZnVuY3Rpb24gKCkge1xyXG5cclxuXHRcdE1vZGVsLnNldFByaXZhdGVDaGF0UmVxdWVzdCgkKHRoaXMpLnRleHQoKSwgJCh0aGlzKS5hdHRyKCdkYXRhLXNlc3NpZCcpKTtcclxuXHJcblx0fSk7XHJcblxyXG5cdGRvbS5jaGF0RGlhbG9nLm9uKCdoaWRkZW4uYnMubW9kYWwnLCBmdW5jdGlvbiAoKSB7XHJcblxyXG5cdFx0aWYgKCBNb2RlbC5maWx0ZXJQcml2YXRlQ2hhdFN0YXR1cygnd2FpdGluZycpICkge1xyXG5cclxuXHRcdFx0TW9kZWwuZGlzY29ubmVjdFByaXZhdGVDaGF0KCk7XHJcblxyXG5cdFx0fSBlbHNlIGlmICggTW9kZWwuZmlsdGVyUHJpdmF0ZUNoYXRTdGF0dXMoJ3JlcWRlY2lzaW9uJykgKSB7XHJcblxyXG5cdFx0XHRNb2RlbC5yZWZ1c2VQcml2YXRlQ2hhdFJlcXVlc3QoKTtcclxuXHJcblx0XHR9XHJcblx0fSk7XHJcblxyXG5cdGRvbS5wcml2YXRlQ2hhdE1vZGFsLm9uKCdoaWRkZW4uYnMubW9kYWwnLCBmdW5jdGlvbiAoKSB7XHJcblxyXG5cdFx0TW9kZWwuZGlzY29ubmVjdFByaXZhdGVDaGF0KCk7XHJcblxyXG5cdH0pO1xyXG59XHJcblxyXG5nbG9iYWwuYXBwID0gZ2xvYmFsLmFwcCB8fCB7fTtcclxuZ2xvYmFsLmFwcC5DaGF0RXZlbnRMaXN0ZW5lciA9IENoYXRFdmVudExpc3RlbmVyOyIsImZ1bmN0aW9uIENoYXRNb2RlbCAoY29uZmlnKSB7XHJcblxyXG5cdGNvbmZpZy5zb2NrZXRTZXNzaW9uSWQgPSAnJztcclxuXHRjb25maWcuc29ja2V0SXNEaXNjb25uZWN0ZWQgPSB0cnVlO1xyXG5cdGNvbmZpZy5zb2NrZXRQcml2YXRlQ2hhdEFjdGl2ZSA9IGZhbHNlLFxyXG5cdGNvbmZpZy5zb2NrZXRQcml2YXRlQ2hhdFN0YXR1cyA9ICdjbG9zZWQnO1xyXG5cclxuXHRjb25maWcuc29ja2V0RGF0YSA9IHtcclxuXHRcdG1lc3NhZ2UgOiAnJyxcclxuXHRcdHVzZXJuYW1lIDogJydcclxuXHR9O1xyXG5cclxuXHRjb25maWcucHJpdmF0ZUNoYXQgPSB7XHJcblx0XHRjYWxsZXJTb2NrZXRJZCA6ICcnLFxyXG5cdFx0Y2FsbGVyVXNlcm5hbWUgOiAnJyxcclxuXHRcdHJlc3BvbnNlU29ja2V0SWQgOiAnJyxcclxuXHRcdHJlc3BvbnNlVXNlcm5hbWUgOiAnJyxcclxuXHRcdG1lc3NhZ2UgOiAnJyxcclxuXHRcdHRpbWVzdGFtcCA6ICcnXHJcblx0fTtcclxuXHJcblx0dmFyIFZpZXcgPSBuZXcgZ2xvYmFsLmFwcC5DaGF0Vmlldyhjb25maWcpO1xyXG5cclxuXHR2YXIgcHJpdmF0ZVN0YXR1c0ZpbHRlciA9IFsnY2xvc2VkJywnd2FpdGluZycsJ29wZW4nLCdyZXFkZWNpc2lvbicsJ2FjY2VwdCddO1xyXG5cdHZhciBfc2VsZiA9IHRoaXM7XHJcblxyXG5cdGZ1bmN0aW9uIGFkZFRvQ2hhdGxpc3QgKGRhdGEsIHR5cGUpIHtcclxuXHJcblx0XHR2YXIgdHh0ID0gJyc7XHJcblxyXG5cdFx0c3dpdGNoICh0eXBlKSB7XHJcblx0XHRcdGNhc2UoJ21zZycpOlxyXG5cdFx0XHRcdHR4dCA9IGRhdGEudXNlcm5hbWUgKyAnIDogJyArIGRhdGEubWVzc2FnZTtcclxuXHRcdFx0XHRicmVhaztcclxuXHRcdFx0Y2FzZSgndXNlcicpOlxyXG5cdFx0XHRcdHR4dCA9IGRhdGEudXNlcm5hbWUgKyAnIGhhdCBkZW4gUmF1bSBiZXRyZXRlbic7XHJcblx0XHRcdFx0YnJlYWs7XHJcblx0XHRcdGNhc2UoJ2Rpc2Nvbm5lY3QnKTpcclxuXHRcdFx0XHR0eHQgPSBkYXRhLnVzZXJuYW1lICsgJyBoYXQgZGVuIFJhdW0gdmVybGFzc2VuJztcclxuXHRcdFx0XHRicmVhaztcclxuXHRcdH1cclxuXHJcblx0XHRWaWV3LnJlbmRlckNoYXRsaXN0KHR5cGUsIHR4dCwgZGF0YS50aW1lc3RhbXApO1xyXG5cclxuXHR9XHJcblxyXG5cdGZ1bmN0aW9uIGFkZFRvVXNlcmxpc3QgKGRhdGEpIHtcclxuXHJcblx0XHRpZiAodHlwZW9mIGRhdGEgPT09ICdvYmplY3QnKSB7XHJcblxyXG5cdFx0XHQkLmVhY2goZGF0YSwgZnVuY3Rpb24gKGtleSx1c2VyKSB7XHJcblxyXG5cdFx0XHRcdFZpZXcucmVuZGVyVXNlcmxpc3QodXNlcik7XHJcblxyXG5cdFx0XHR9KTtcclxuXHRcdH1cclxuXHR9XHJcblxyXG5cdGZ1bmN0aW9uIGZpbHRlclVzZXJuYW1lICgpIHtcclxuXHRcdHJldHVybiAhISh0eXBlb2YgY29uZmlnLnNvY2tldERhdGEudXNlcm5hbWUgPT09ICdzdHJpbmcnICYmIGNvbmZpZy5zb2NrZXREYXRhLnVzZXJuYW1lLmxlbmd0aCk7XHJcblx0fVxyXG5cclxuXHRmdW5jdGlvbiBmaWx0ZXJNZXNzYWdlICgpIHtcclxuXHRcdHJldHVybiAhISh0eXBlb2YgY29uZmlnLnNvY2tldERhdGEubWVzc2FnZSA9PT0gJ3N0cmluZycgJiYgY29uZmlnLnNvY2tldERhdGEubWVzc2FnZS5sZW5ndGgpO1xyXG5cdH1cclxuXHJcblx0ZnVuY3Rpb24gZmlsdGVyUHJpdmF0ZVJlc3BvbnNlU3RhdHVzIChkYXRhKSB7XHJcblx0XHRyZXR1cm4gISEoY29uZmlnLnNvY2tldFByaXZhdGVDaGF0QWN0aXZlID09PSB0cnVlICYmIGNvbmZpZy5wcml2YXRlQ2hhdC5yZXNwb25zZVNvY2tldElkID09PSBkYXRhLmNhbGxlclNvY2tldElkKTtcclxuXHR9XHJcblxyXG5cdGZ1bmN0aW9uIGZpbHRlclByaXZhdGVDaGF0ICgpIHtcclxuXHJcblx0XHR2YXIgcmVzID0gdHJ1ZTtcclxuXHJcblx0XHQkLmVhY2goY29uZmlnLnByaXZhdGVDaGF0LCBmdW5jdGlvbiAoa2V5LCB2YWx1ZSkge1xyXG5cclxuXHRcdFx0aWYgKCB0eXBlb2YgdmFsdWUgIT09ICdzdHJpbmcnIHx8IHR5cGVvZiB2YWx1ZSA9PT0gJ3N0cmluZycgJiYgISB2YWx1ZS5sZW5ndGgpIHtcclxuXHJcblx0XHRcdFx0cmVzID0gZmFsc2U7XHJcblx0XHRcdFx0cmV0dXJuIHJlcztcclxuXHJcblx0XHRcdH1cclxuXHRcdH0pO1xyXG5cclxuXHRcdHJldHVybiByZXM7XHJcblx0fVxyXG5cclxuXHRmdW5jdGlvbiBnZXRTdHJGb3JtYXRlZCAoc3RyLCBzdHJsZW4pIHtcclxuXHJcblx0XHRzdHIgPSAkLnRyaW0oc3RyKTtcclxuXHJcblx0XHRyZXR1cm4gKHN0ci5sZW5ndGggPiBzdHJsZW4gKSA/IHN0ci5zdWJzdHIoMCxzdHJsZW4tMSkgOiBzdHI7XHJcblx0fVxyXG5cclxuXHRmdW5jdGlvbiBzZXRNZXNzYWdlICgpIHtcclxuXHJcblx0XHRjb25maWcuc29ja2V0RGF0YS5tZXNzYWdlID0gZ2V0U3RyRm9ybWF0ZWQoY29uZmlnLmRvbS5jaGF0SW5wdXQudmFsKCksIDIwMCk7XHJcblx0XHRWaWV3LmVtcHR5Q2hhdElucHV0KCk7XHJcblxyXG5cdH1cclxuXHJcblx0ZnVuY3Rpb24gc2V0UHJpdmF0ZU1lc3NhZ2UgKCkge1xyXG5cclxuXHRcdGNvbmZpZy5wcml2YXRlQ2hhdC5tZXNzYWdlID0gZ2V0U3RyRm9ybWF0ZWQoY29uZmlnLmRvbS5wcml2YXRlQ2hhdElucHV0LnZhbCgpLCAyMDApO1xyXG5cdFx0Vmlldy5lbXB0eVByaXZhdGVDaGF0SW5wdXQoKTtcclxuXHJcblx0fVxyXG5cclxuXHRmdW5jdGlvbiBzZXRVc2VybmFtZSAoKSB7XHJcblxyXG5cdFx0Y29uZmlnLnNvY2tldERhdGEudXNlcm5hbWUgPSBnZXRTdHJGb3JtYXRlZChjb25maWcuZG9tLmNoYXRVc2VybmFtZS52YWwoKSwgMzApO1xyXG5cdFx0Vmlldy5lbXB0eUNoYXRVc2VybmFtZSgpO1xyXG5cclxuXHR9XHJcblxyXG5cdGZ1bmN0aW9uIHNldFByaXZhdGVDaGF0T2JqZWN0IChyZXNwU2Vzc2lkLCByZXNwVXNlcm5hbWUpIHtcclxuXHJcblx0XHRpZiAocmVzcFNlc3NpZCAhPT0gbnVsbCAmJiByZXNwVXNlcm5hbWUgIT09IG51bGwgKXtcclxuXHJcblx0XHRcdGNvbmZpZy5wcml2YXRlQ2hhdCA9IHtcclxuXHRcdFx0XHRjYWxsZXJTb2NrZXRJZCA6IGNvbmZpZy5zb2NrZXRTZXNzaW9uSWQsXHJcblx0XHRcdFx0Y2FsbGVyVXNlcm5hbWUgOiBjb25maWcuc29ja2V0RGF0YS51c2VybmFtZSxcclxuXHRcdFx0XHRyZXNwb25zZVNvY2tldElkIDogcmVzcFNlc3NpZCxcclxuXHRcdFx0XHRyZXNwb25zZVVzZXJuYW1lIDogcmVzcFVzZXJuYW1lLFxyXG5cdFx0XHRcdG1lc3NhZ2UgOiAnJyxcclxuXHRcdFx0XHR0aW1lc3RhbXAgOiAnJ1xyXG5cdFx0XHR9O1xyXG5cclxuXHRcdH0gZWxzZSB7XHJcblxyXG5cdFx0XHRjb25maWcucHJpdmF0ZUNoYXQgPSB7XHJcblx0XHRcdFx0Y2FsbGVyU29ja2V0SWQgOiAnJyxcclxuXHRcdFx0XHRjYWxsZXJVc2VybmFtZSA6ICcnLFxyXG5cdFx0XHRcdHJlc3BvbnNlU29ja2V0SWQgOiAnJyxcclxuXHRcdFx0XHRyZXNwb25zZVVzZXJuYW1lIDogJycsXHJcblx0XHRcdFx0bWVzc2FnZSA6ICcnLFxyXG5cdFx0XHRcdHRpbWVzdGFtcCA6ICcnXHJcblx0XHRcdH07XHJcblx0XHR9XHJcblx0fVxyXG5cclxuXHRmdW5jdGlvbiBkZWxldGVQcml2YXRlQ2hhdCAoKSB7XHJcblxyXG5cdFx0Y29uZmlnLnNvY2tldFByaXZhdGVDaGF0QWN0aXZlID0gZmFsc2U7XHJcblxyXG5cdFx0c2V0UHJpdmF0ZUNoYXRPYmplY3QobnVsbCwgbnVsbCk7XHJcblx0XHRzZXRQcml2YXRlQ2hhdFN0YXR1cygwKTtcclxuXHJcblx0fVxyXG5cclxuXHRmdW5jdGlvbiBzZXRQcml2YXRlQ2hhdFN0YXR1cyAoc3RhdHVzaW5kZXgpIHtcclxuXHJcblx0XHRpZiAoc3RhdHVzaW5kZXgrMSA8PSBwcml2YXRlU3RhdHVzRmlsdGVyLmxlbmd0aCkge1xyXG5cclxuXHRcdFx0Y29uZmlnLnNvY2tldFByaXZhdGVDaGF0U3RhdHVzID0gcHJpdmF0ZVN0YXR1c0ZpbHRlcltzdGF0dXNpbmRleF07XHJcblx0XHR9XHJcblx0fVxyXG5cclxuXHRmdW5jdGlvbiBzZXRQcml2YXRlQ2hhdENsaWVudE1lc3NhZ2UgKCkge1xyXG5cclxuXHRcdGNvbmZpZy5wcml2YXRlQ2hhdC50aW1lc3RhbXAgPSBuZXcgRGF0ZSgpO1xyXG5cdFx0Y29uZmlnLnByaXZhdGVDaGF0Lm1lc3NhZ2UgPSBjb25maWcucHJpdmF0ZUNoYXQuY2FsbGVyVXNlcm5hbWUgKyAnICcgKyBjb25maWcucHJpdmF0ZUNoYXQubWVzc2FnZTtcclxuXHJcblx0XHRWaWV3LnJlbmRlclByaXZhdGVDaGF0TWVzc2FnZSgnc3RhdHVzJyk7XHJcblxyXG5cdH1cclxuXHJcblx0ZnVuY3Rpb24gcmVzZXRDaGF0ICgpIHtcclxuXHJcblx0XHRWaWV3LmVtcHR5Q2hhdExpc3QoKTtcclxuXHRcdFZpZXcuZW1wdHlVc2VyTGlzdCgpO1xyXG5cdFx0Y29uZmlnLnNvY2tldERhdGEudXNlcm5hbWUgPSAnJztcclxuXHJcblx0fVxyXG5cclxuXHRmdW5jdGlvbiByZXNldFVzZXJsaXN0ICh1c2VybGlzdCkge1xyXG5cclxuXHRcdFZpZXcuZW1wdHlVc2VyTGlzdCgpO1xyXG5cdFx0YWRkVG9Vc2VybGlzdCh1c2VybGlzdCk7XHJcblxyXG5cdH1cclxuXHJcblx0dGhpcy5hZGRVc2VyID0gZnVuY3Rpb24gKCkge1xyXG5cclxuXHRcdHNldFVzZXJuYW1lKCk7XHJcblxyXG5cdFx0aWYgKCAhIGZpbHRlclVzZXJuYW1lKCkgKSB7XHJcblxyXG5cdFx0XHRWaWV3LnJlbmRlckRpYWxvZyh7dGV4dDonS2VpbmVuIGtvcnJla3RlbiBVc2VybmFtZW4gZ2VmdW5kZW4nfSk7XHJcblx0XHRcdHJldHVybiBmYWxzZTtcclxuXHJcblx0XHR9XHJcblxyXG5cdFx0aWYgKGNvbmZpZy5zb2NrZXRJc0Rpc2Nvbm5lY3RlZCA9PT0gdHJ1ZSkge1xyXG5cclxuXHRcdFx0Y29uZmlnLnNvY2tldC5jb25uZWN0KCk7XHJcblxyXG5cdFx0fVxyXG5cclxuXHRcdGNvbmZpZy5zb2NrZXQuZW1pdCgnYWRkIHVzZXInLCBjb25maWcuc29ja2V0RGF0YS51c2VybmFtZSk7XHJcblxyXG5cdH07XHJcblx0dGhpcy5zZW5kTWVzc2FnZSA9IGZ1bmN0aW9uICgpIHtcclxuXHJcblx0XHRzZXRNZXNzYWdlKCk7XHJcblxyXG5cdFx0aWYgKCBmaWx0ZXJNZXNzYWdlKCkgJiYgZmlsdGVyVXNlcm5hbWUoKSApIHtcclxuXHJcblx0XHRcdGNvbmZpZy5zb2NrZXQuZW1pdCgnY2hhdCBtZXNzYWdlJywgY29uZmlnLnNvY2tldERhdGEpO1xyXG5cclxuXHRcdH0gZWxzZSB7XHJcblxyXG5cdFx0XHRWaWV3LnJlbmRlckRpYWxvZyh7dGV4dDonS2VpbmUgTmFjaHJpY2h0IGdlZnVuZGVuJ30pO1xyXG5cclxuXHRcdH1cclxuXHR9O1xyXG5cclxuXHR0aGlzLnNvY2tldERpc2Nvbm5lY3QgPSBmdW5jdGlvbiAoKSB7XHJcblxyXG5cdFx0Y29uZmlnLnNvY2tldC5kaXNjb25uZWN0KCk7XHJcblx0XHRjb25maWcuc29ja2V0SXNEaXNjb25uZWN0ZWQgPSB0cnVlO1xyXG5cdFx0Y29uZmlnLnNvY2tldFNlc3Npb25JZCA9ICcnO1xyXG5cclxuXHRcdHJlc2V0Q2hhdCgpO1xyXG5cdFx0Vmlldy50b2dnbGVDaGF0TGV2ZWwoKTtcclxuXHJcblx0fTtcclxuXHJcblx0dGhpcy5zb2NrZXRSZXNwb25zZUxvZ2luU3VjY2VzcyA9IGZ1bmN0aW9uIChkYXRhKSB7XHJcblxyXG5cdFx0Y29uZmlnLnNvY2tldElzRGlzY29ubmVjdGVkID0gZmFsc2U7XHJcblx0XHRjb25maWcuc29ja2V0U2Vzc2lvbklkID0gZGF0YS5zZXNzaW9uSWQ7XHJcblxyXG5cdFx0YWRkVG9Vc2VybGlzdChkYXRhLnVzZXJzKTtcclxuXHRcdGFkZFRvQ2hhdGxpc3Qoe3RpbWVzdGFtcDpkYXRhLnRpbWVzdGFtcCx1c2VybmFtZTpkYXRhLnVzZXJuYW1lfSwgJ3VzZXInKTtcclxuXHRcdFZpZXcudG9nZ2xlQ2hhdExldmVsKCk7XHJcblxyXG5cdH07XHJcblxyXG5cdHRoaXMuc29ja2V0UmVzcG9uc2VMb2dpbkVycm9yID0gZnVuY3Rpb24gKGVycm9yKSB7XHJcblxyXG5cdFx0Vmlldy5yZW5kZXJEaWFsb2coe3RleHQ6ZXJyb3J9KTtcclxuXHJcblx0fTtcclxuXHJcblx0dGhpcy5zb2NrZXRSZXNwb25zZVNldE1lc3NhZ2UgPSBmdW5jdGlvbiAoZGF0YSkge1xyXG5cclxuXHRcdGlmICggISBjb25maWcuc29ja2V0SXNEaXNjb25uZWN0ZWQpIHtcclxuXHJcblx0XHRcdGFkZFRvQ2hhdGxpc3QoZGF0YSwgJ21zZycpO1xyXG5cclxuXHRcdH1cclxuXHR9O1xyXG5cclxuXHR0aGlzLnNvY2tldFJlc3BvbnNlVXNlck5ldyA9IGZ1bmN0aW9uIChkYXRhKSB7XHJcblxyXG5cdFx0aWYgKCAhIGNvbmZpZy5zb2NrZXRJc0Rpc2Nvbm5lY3RlZCkge1xyXG5cclxuXHRcdFx0YWRkVG9DaGF0bGlzdCh7dGltZXN0YW1wOmRhdGEudGltZXN0YW1wLHVzZXJuYW1lOmRhdGEudXNlcm5hbWV9LCAndXNlcicpO1xyXG5cdFx0XHRhZGRUb1VzZXJsaXN0KHtcInVzZXJcIjp7dXNlcm5hbWU6ZGF0YS51c2VybmFtZSxzZXNzaW9uSWQ6ZGF0YS5zZXNzaW9uSWR9fSk7XHJcblxyXG5cdFx0fVxyXG5cdH07XHJcblxyXG5cdHRoaXMuZmlsdGVyUHJpdmF0ZUNoYXRTdGF0dXMgPSBmdW5jdGlvbiAoc3RhdHVzKSB7XHJcblx0XHRyZXR1cm4gISEoIGNvbmZpZy5zb2NrZXRQcml2YXRlQ2hhdEFjdGl2ZSAmJiBjb25maWcuc29ja2V0UHJpdmF0ZUNoYXRTdGF0dXMgPT09IHN0YXR1cyApO1xyXG5cdH07XHJcblxyXG5cdHRoaXMuc2VuZFByaXZhdGVNZXNzYWdlID0gZnVuY3Rpb24gKCkge1xyXG5cclxuXHRcdGlmICggY29uZmlnLnNvY2tldFByaXZhdGVDaGF0QWN0aXZlICkge1xyXG5cclxuXHRcdFx0c2V0UHJpdmF0ZU1lc3NhZ2UoKTtcclxuXHJcblx0XHRcdGlmIChmaWx0ZXJQcml2YXRlQ2hhdCgpICYmIGZpbHRlclVzZXJuYW1lKCkpIHtcclxuXHJcblx0XHRcdFx0Y29uZmlnLnNvY2tldC5lbWl0KCd1c2VyIHByaXZhdGUgY2hhdCBtZXNzYWdlJywgY29uZmlnLnByaXZhdGVDaGF0KTtcclxuXHRcdFx0XHRzZXRQcml2YXRlQ2hhdENsaWVudE1lc3NhZ2UoKTtcclxuXHJcblx0XHRcdH1cclxuXHRcdH1cclxuXHR9O1xyXG5cclxuXHR0aGlzLnNldFByaXZhdGVDaGF0UmVxdWVzdCA9IGZ1bmN0aW9uICh1c2VybmFtZSwgc2Vzc29uaWQpIHtcclxuXHJcblx0XHRpZiAoICEgY29uZmlnLnNvY2tldFByaXZhdGVDaGF0QWN0aXZlICkge1xyXG5cclxuXHRcdFx0aWYgKGNvbmZpZy5zb2NrZXRTZXNzaW9uSWQgIT09ICcnICYmIGNvbmZpZy5zb2NrZXRTZXNzaW9uSWQgIT09IHNlc3NvbmlkKSB7XHJcblxyXG5cdFx0XHRcdHZhciB0eHQgPSBbXHJcblx0XHRcdFx0XHQnRGVyIFVzZXIgJyt1c2VybmFtZSsnIHdpcmQgenVtIHByaXZhdGVuIENoYXQgZWluZ2VsYWRlbiwgYml0dGUgd2FydGUgYXVmIGRpZSBCZXN0w6R0aWd1bmcuJyxcclxuXHRcdFx0XHRcdCdXZW5uIGR1IGRpZXNlbiBEaWFsb2cgc2NobGllw590LCBkYW5uIHdpcmQgZGllIEVpbmxhZHVuZyB6dXLDvGNrIGdlem9nZW4hJ1xyXG5cdFx0XHRcdF07XHJcblxyXG5cdFx0XHRcdGNvbmZpZy5zb2NrZXRQcml2YXRlQ2hhdEFjdGl2ZSA9IHRydWU7XHJcblxyXG5cdFx0XHRcdHNldFByaXZhdGVDaGF0T2JqZWN0KHNlc3NvbmlkLCB1c2VybmFtZSk7XHJcblx0XHRcdFx0c2V0UHJpdmF0ZUNoYXRTdGF0dXMoMSk7XHJcblxyXG5cdFx0XHRcdFZpZXcucmVuZGVyRGlhbG9nKHtcclxuXHRcdFx0XHRcdHRpdGxlOidQcml2YXRlIENoYXQgQW5mcmFnZScsXHJcblx0XHRcdFx0XHR0ZXh0OnR4dCxcclxuXHRcdFx0XHRcdGJ0bnRpdGxlOidBYnJlY2hlbidcclxuXHRcdFx0XHR9KTtcclxuXHJcblx0XHRcdFx0Y29uZmlnLnNvY2tldC5lbWl0KCd1c2VyIHByaXZhdGUgY2hhdCBpbnZpdGluZycsIGNvbmZpZy5wcml2YXRlQ2hhdCk7XHJcblxyXG5cdFx0XHR9XHJcblx0XHR9XHJcblx0fTtcclxuXHJcblx0dGhpcy5hY2NlcHRQcml2YXRlQ2hhdFJlcXVlc3QgPSBmdW5jdGlvbiAoKSB7XHJcblxyXG5cdFx0Y29uZmlnLnNvY2tldC5lbWl0KCd1c2VyIHByaXZhdGUgY2hhdCBhY2NlcHQnLCB7XHJcblx0XHRcdGNhbGxlclNvY2tldElkOmNvbmZpZy5wcml2YXRlQ2hhdC5jYWxsZXJTb2NrZXRJZCxcclxuXHRcdFx0cmVzcG9uc2VTb2NrZXRJZDpjb25maWcucHJpdmF0ZUNoYXQucmVzcG9uc2VTb2NrZXRJZFxyXG5cdFx0fSk7XHJcblxyXG5cdH07XHJcblxyXG5cdHRoaXMucmVmdXNlUHJpdmF0ZUNoYXRSZXF1ZXN0ID0gZnVuY3Rpb24oKSB7XHJcblxyXG5cdFx0Y29uZmlnLnNvY2tldC5lbWl0KCd1c2VyIHByaXZhdGUgY2hhdCByZWZ1c2UnLCB7XHJcblx0XHRcdGNhbGxlclNvY2tldElkOmNvbmZpZy5wcml2YXRlQ2hhdC5jYWxsZXJTb2NrZXRJZCxcclxuXHRcdFx0cmVzcG9uc2VTb2NrZXRJZDpjb25maWcucHJpdmF0ZUNoYXQucmVzcG9uc2VTb2NrZXRJZFxyXG5cdFx0fSk7XHJcblxyXG5cdFx0ZGVsZXRlUHJpdmF0ZUNoYXQoKTtcclxuXHR9O1xyXG5cclxuXHR0aGlzLmRpc2Nvbm5lY3RQcml2YXRlQ2hhdCA9IGZ1bmN0aW9uICgpIHtcclxuXHJcblx0XHRjb25maWcuc29ja2V0LmVtaXQoJ3VzZXIgcHJpdmF0ZSBjaGF0IGRpc2Nvbm5lY3QnLCB7XHJcblx0XHRcdGNhbGxlclNvY2tldElkOmNvbmZpZy5wcml2YXRlQ2hhdC5jYWxsZXJTb2NrZXRJZCxcclxuXHRcdFx0cmVzcG9uc2VTb2NrZXRJZDpjb25maWcucHJpdmF0ZUNoYXQucmVzcG9uc2VTb2NrZXRJZFxyXG5cdFx0fSk7XHJcblxyXG5cdFx0ZGVsZXRlUHJpdmF0ZUNoYXQoKTtcclxuXHR9O1xyXG5cclxuXHR0aGlzLnNvY2tldFJlc3BvbnNlVXNlckRpc2Nvbm5lY3QgPSBmdW5jdGlvbiAoZGF0YSkge1xyXG5cclxuXHRcdGlmICggISBjb25maWcuc29ja2V0SXNEaXNjb25uZWN0ZWQpIHtcclxuXHJcblx0XHRcdHJlc2V0VXNlcmxpc3QoZGF0YS51c2Vycyk7XHJcblx0XHRcdGFkZFRvQ2hhdGxpc3Qoe3RpbWVzdGFtcDpkYXRhLnRpbWVzdGFtcCwgdXNlcm5hbWU6ZGF0YS51c2VybmFtZX0sICdkaXNjb25uZWN0Jyk7XHJcblxyXG5cdFx0fVxyXG5cdH07XHJcblxyXG5cdHRoaXMuc29ja2V0UmVzcG9uc2VVc2VySW52aXRlID0gZnVuY3Rpb24gKGRhdGEpIHtcclxuXHJcblx0XHR2YXIgdHh0ID0gW1xyXG5cdFx0XHQnRGVyIFVzZXIgJytkYXRhLnVzZXJuYW1lKycgbcO2Y2h0ZSBkaWNoIHp1bSBwcml2YXRlbiBDaGF0IGVpbmdlbGFkZW4uJyxcclxuXHRcdFx0J1dlbm4gZHUgZGllc2VuIERpYWxvZyBzY2hsaWXDn3QsIGRhbm4gd2lyZCBkaWUgRWlubGFkdW5nIGFiZ2VsZWhudCEnXHJcblx0XHRdO1xyXG5cclxuXHRcdGNvbmZpZy5zb2NrZXRQcml2YXRlQ2hhdEFjdGl2ZSA9IHRydWU7XHJcblxyXG5cdFx0c2V0UHJpdmF0ZUNoYXRPYmplY3QoZGF0YS5jYWxsZXJTb2NrZXRJZCwgZGF0YS51c2VybmFtZSk7XHJcblx0XHRzZXRQcml2YXRlQ2hhdFN0YXR1cygzKTtcclxuXHJcblx0XHRWaWV3LnJlbmRlckRpYWxvZyh7XHJcblx0XHRcdHRpdGxlOidFaW5sYWR1bmcgenVtIHByaXZhdGVuIENoYXQnLFxyXG5cdFx0XHR0ZXh0OnR4dCwgYnRudGl0bGU6J0FibGVobmVuJyxcclxuXHRcdFx0Y29uZmlybTonYWNjZXB0J1xyXG5cdFx0fSk7XHJcblx0fTtcclxuXHJcblx0dGhpcy5zb2NrZXRSZXNwb25zZVJlZnVzZVVzZXJJbnZpdGUgPSBmdW5jdGlvbihkYXRhKSB7XHJcblxyXG5cdFx0aWYgKCBmaWx0ZXJQcml2YXRlUmVzcG9uc2VTdGF0dXMoZGF0YSkgKSB7XHJcblxyXG5cdFx0XHRWaWV3LnJlbmRlckRpYWxvZ0JvZHkoJ0RlciBVc2VyIGhhdCBkaWUgRWlubGFkdW5nIGFiZ2VsZWhudCwnKTtcclxuXHJcblx0XHR9XHJcblx0fTtcclxuXHJcblx0dGhpcy5zb2NrZXRSZXNwb25zZUFjY2VwdFByaXZhdGVDaGF0ID0gZnVuY3Rpb24oZGF0YSkge1xyXG5cclxuXHRcdGlmICggZmlsdGVyUHJpdmF0ZVJlc3BvbnNlU3RhdHVzKGRhdGEpICkge1xyXG5cclxuXHRcdFx0Vmlldy5yZW5kZXJEaWFsb2dCb2R5KCdEZXIgVXNlciBoYXQgZGllIEVpbmxhZHVuZyBhbmdlbm9tbWVuLCBiaXR0ZSB3YXJ0ZW4sIE5JQ0hUIGRpZXNlbiBEaWFsb2cgc2NobGllc3NlbiEnKTtcclxuXHJcblx0XHRcdHNldFByaXZhdGVDaGF0U3RhdHVzKDQpO1xyXG5cclxuXHRcdFx0Y29uZmlnLnNvY2tldC5lbWl0KCd1c2VyIHByaXZhdGUgY2hhdCBvcGVuJywge1xyXG5cdFx0XHRcdGNhbGxlclNvY2tldElkIDogY29uZmlnLnByaXZhdGVDaGF0LmNhbGxlclNvY2tldElkLFxyXG5cdFx0XHRcdHJlc3BvbnNlU29ja2V0SWQgOiBjb25maWcucHJpdmF0ZUNoYXQucmVzcG9uc2VTb2NrZXRJZCxcclxuXHRcdFx0XHRjYWxsZXJVc2VybmFtZSA6IGNvbmZpZy5wcml2YXRlQ2hhdC5jYWxsZXJVc2VybmFtZVxyXG5cdFx0XHR9KTtcclxuXHJcblx0XHR9XHJcblx0fTtcclxuXHJcblx0dGhpcy5zb2NrZXRSZXNwb25zZU9wZW5Qcml2YXRlQ2hhdCA9IGZ1bmN0aW9uIChkYXRhKSB7XHJcblxyXG5cdFx0Y29uZmlnLnByaXZhdGVDaGF0Lm1lc3NhZ2UgPSBjb25maWcucHJpdmF0ZUNoYXQucmVzcG9uc2VVc2VybmFtZSArICcgaGF0IGRlbiBSYXVtIGJldHJldGVuJztcclxuXHRcdGNvbmZpZy5wcml2YXRlQ2hhdC50aW1lc3RhbXAgPSBkYXRhLnRpbWVzdGFtcDtcclxuXHJcblx0XHRzZXRQcml2YXRlQ2hhdFN0YXR1cygyKTtcclxuXHJcblx0XHRWaWV3LnJlbmRlckRpYWxvZyhudWxsKTtcclxuXHRcdFZpZXcucmVuZGVyUHJpdmF0ZUNoYXQoKTtcclxuXHRcdFZpZXcucmVuZGVyUHJpdmF0ZUNoYXRNZXNzYWdlKCdzdGF0dXMnKTtcclxuXHJcblx0XHRjb25maWcuc29ja2V0LmVtaXQoJ3VzZXIgcHJpdmF0ZSBjaGF0IG1lc3NhZ2UnLCB7XHJcblx0XHRcdGNhbGxlclNvY2tldElkIDogY29uZmlnLnByaXZhdGVDaGF0LmNhbGxlclNvY2tldElkLFxyXG5cdFx0XHRyZXNwb25zZVNvY2tldElkIDogY29uZmlnLnByaXZhdGVDaGF0LnJlc3BvbnNlU29ja2V0SWQsXHJcblx0XHRcdGNhbGxlclVzZXJuYW1lIDogY29uZmlnLnByaXZhdGVDaGF0LmNhbGxlclVzZXJuYW1lXHJcblx0XHR9KTtcclxuXHJcblx0fTtcclxuXHJcblx0dGhpcy5zb2NrZXRSZXNwb25zZU1lc3NhZ2VQcml2YXRlQ2hhdCA9IGZ1bmN0aW9uIChkYXRhKSB7XHJcblxyXG5cdFx0dmFyIHR5cGUgPSAnbXNnJztcclxuXHJcblx0XHRpZiAoIGZpbHRlclByaXZhdGVSZXNwb25zZVN0YXR1cyhkYXRhKSApIHtcclxuXHJcblx0XHRcdGNvbmZpZy5wcml2YXRlQ2hhdC5tZXNzYWdlID0gZGF0YS5tZXNzYWdlO1xyXG5cdFx0XHRjb25maWcucHJpdmF0ZUNoYXQudGltZXN0YW1wID0gZGF0YS50aW1lc3RhbXA7XHJcblxyXG5cdFx0XHRpZiAoY29uZmlnLnNvY2tldFByaXZhdGVDaGF0U3RhdHVzID09PSAnYWNjZXB0JyB8fCBjb25maWcuc29ja2V0UHJpdmF0ZUNoYXRTdGF0dXMgPT09ICdyZXFkZWNpc2lvbicpIHtcclxuXHJcblx0XHRcdFx0dHlwZSA9ICdzdGF0dXMnO1xyXG5cdFx0XHRcdGNvbmZpZy5wcml2YXRlQ2hhdC5tZXNzYWdlID0gY29uZmlnLnByaXZhdGVDaGF0LnJlc3BvbnNlVXNlcm5hbWUgKyAnIGhhdCBkZW4gUmF1bSBiZXRyZXRlbic7XHJcblxyXG5cdFx0XHRcdFZpZXcucmVuZGVyRGlhbG9nKG51bGwpO1xyXG5cdFx0XHRcdFZpZXcucmVuZGVyUHJpdmF0ZUNoYXQoKTtcclxuXHJcblx0XHRcdH1cclxuXHJcblx0XHRcdHNldFByaXZhdGVDaGF0U3RhdHVzKDIpO1xyXG5cdFx0XHRWaWV3LnJlbmRlclByaXZhdGVDaGF0TWVzc2FnZSh0eXBlKTtcclxuXHJcblx0XHR9XHJcblx0fTtcclxuXHJcblx0dGhpcy5zb2NrZXRSZXNwb25zZURpc2Nvbm5lY3RQcml2YXRlQ2hhdCA9IGZ1bmN0aW9uIChkYXRhKSB7XHJcblxyXG5cdFx0aWYgKCBmaWx0ZXJQcml2YXRlUmVzcG9uc2VTdGF0dXMoZGF0YSkgKSB7XHJcblxyXG5cdFx0XHRpZiAoY29uZmlnLnNvY2tldFByaXZhdGVDaGF0U3RhdHVzID09PSAnb3BlbicpIHtcclxuXHJcblx0XHRcdFx0Y29uZmlnLnByaXZhdGVDaGF0Lm1lc3NhZ2UgPSBjb25maWcucHJpdmF0ZUNoYXQucmVzcG9uc2VVc2VybmFtZSArICcgaGF0IGRlbiBSYXVtIHZlcmxhc3Nlbic7XHJcblx0XHRcdFx0Y29uZmlnLnByaXZhdGVDaGF0LnRpbWVzdGFtcCA9IGRhdGEudGltZXN0YW1wO1xyXG5cclxuXHRcdFx0XHRWaWV3LnJlbmRlclByaXZhdGVDaGF0TWVzc2FnZSgnc3RhdHVzJyk7XHJcblxyXG5cdFx0XHR9IGVsc2UgaWYgKFZpZXcuZGlhbG9nSXNPcGVuKCkpIHtcclxuXHJcblx0XHRcdFx0Vmlldy5kaWFsb2dEaXNwbGF5Q29uZmlybSgnbm9uZScpO1xyXG5cdFx0XHRcdFZpZXcucmVuZGVyRGlhbG9nQm9keShjb25maWcucHJpdmF0ZUNoYXQucmVzcG9uc2VVc2VybmFtZSArICcgaGF0IGRlbiBSYXVtIHZlcmxhc3NlbicpO1xyXG5cclxuXHRcdFx0fVxyXG5cdFx0fVxyXG5cclxuXHRcdGRlbGV0ZVByaXZhdGVDaGF0KCk7XHJcblxyXG5cdH07XHJcblxyXG5cdHJldHVybiB0aGlzO1xyXG59XHJcblxyXG5nbG9iYWwuYXBwID0gZ2xvYmFsLmFwcCB8fCB7fTtcclxuZ2xvYmFsLmFwcC5DaGF0TW9kZWwgPSBDaGF0TW9kZWw7IiwiXHJcblxyXG5mdW5jdGlvbiBDaGF0U29ja2V0TGlzdGVuZXIgKE1vZGVsLCBzb2NrZXQpIHtcclxuXHJcblx0c29ja2V0Lm9uKCdsb2dpbiBzdWNjZXNzJywgZnVuY3Rpb24gKGRhdGEpIHtcclxuXHJcblx0XHRNb2RlbC5zb2NrZXRSZXNwb25zZUxvZ2luU3VjY2VzcyhkYXRhKTtcclxuXHJcblx0fSk7XHJcblxyXG5cdHNvY2tldC5vbignbG9naW4gZXJyb3InLCBmdW5jdGlvbiAoKSB7XHJcblxyXG5cdFx0TW9kZWwuc29ja2V0UmVzcG9uc2VMb2dpbkVycm9yKCdEZXIgQmVudXR6ZXJuYW1lIGlzdCB1bmfDvGx0aWcnKTtcclxuXHJcblx0fSk7XHJcblxyXG5cdHNvY2tldC5vbignbG9naW4gZXJyI3VzZXJuYW1lJywgZnVuY3Rpb24gKCkge1xyXG5cclxuXHRcdE1vZGVsLnNvY2tldFJlc3BvbnNlTG9naW5FcnJvcignRGVyIEJlbnV0emVybmFtZSB3aXJkIHNjaG9uIGJlbsO8dHp0LCBiaXR0ZSB3w6RobGUgZWluZW4gYW5kZXJlbiBOYW1lbi4nKTtcclxuXHJcblx0fSk7XHJcblxyXG5cdHNvY2tldC5vbignY2hhdCBtZXNzYWdlJywgZnVuY3Rpb24gKGRhdGEpIHtcclxuXHJcblx0XHRNb2RlbC5zb2NrZXRSZXNwb25zZVNldE1lc3NhZ2UoZGF0YSk7XHJcblxyXG5cdH0pO1xyXG5cclxuXHRzb2NrZXQub24oJ25ldyB1c2VyJywgZnVuY3Rpb24gKGRhdGEpIHtcclxuXHJcblx0XHRNb2RlbC5zb2NrZXRSZXNwb25zZVVzZXJOZXcoZGF0YSk7XHJcblx0fSk7XHJcblxyXG5cdHNvY2tldC5vbigndXNlciBkaXNjb25uZWN0JywgZnVuY3Rpb24gKGRhdGEpIHtcclxuXHJcblx0XHRNb2RlbC5zb2NrZXRSZXNwb25zZVVzZXJEaXNjb25uZWN0KGRhdGEpO1xyXG5cclxuXHR9KTtcclxuXHJcblx0c29ja2V0Lm9uKCd1c2VyIHByaXZhdGUgY2hhdCBpbnZpdGluZycsIGZ1bmN0aW9uIChkYXRhKSB7XHJcblxyXG5cdFx0TW9kZWwuc29ja2V0UmVzcG9uc2VVc2VySW52aXRlKGRhdGEpO1xyXG5cclxuXHR9KTtcclxuXHJcblx0c29ja2V0Lm9uKCd1c2VyIHByaXZhdGUgY2hhdCByZWZ1c2UnLCBmdW5jdGlvbihkYXRhKSB7XHJcblxyXG5cdFx0TW9kZWwuc29ja2V0UmVzcG9uc2VSZWZ1c2VVc2VySW52aXRlKGRhdGEpO1xyXG5cclxuXHR9KTtcclxuXHJcblx0c29ja2V0Lm9uKCd1c2VyIHByaXZhdGUgY2hhdCBhY2NlcHQnLCBmdW5jdGlvbiAoZGF0YSkge1xyXG5cclxuXHRcdE1vZGVsLnNvY2tldFJlc3BvbnNlQWNjZXB0UHJpdmF0ZUNoYXQoZGF0YSk7XHJcblxyXG5cdH0pO1xyXG5cclxuXHRzb2NrZXQub24oJ3VzZXIgcHJpdmF0ZSBjaGF0IG9wZW4nLCBmdW5jdGlvbiAoZGF0YSkge1xyXG5cclxuXHRcdE1vZGVsLnNvY2tldFJlc3BvbnNlT3BlblByaXZhdGVDaGF0KGRhdGEpO1xyXG5cclxuXHR9KTtcclxuXHJcblx0c29ja2V0Lm9uKCd1c2VyIHByaXZhdGUgY2hhdCBtZXNzYWdlJywgZnVuY3Rpb24gKGRhdGEpIHtcclxuXHJcblx0XHRNb2RlbC5zb2NrZXRSZXNwb25zZU1lc3NhZ2VQcml2YXRlQ2hhdChkYXRhKTtcclxuXHJcblx0fSk7XHJcblxyXG5cdHNvY2tldC5vbigndXNlciBwcml2YXRlIGNoYXQgZGlzY29ubmVjdCcsIGZ1bmN0aW9uIChkYXRhKSB7XHJcblxyXG5cdFx0TW9kZWwuc29ja2V0UmVzcG9uc2VEaXNjb25uZWN0UHJpdmF0ZUNoYXQoZGF0YSk7XHJcblxyXG5cdH0pO1xyXG5cclxufVxyXG5cclxuZ2xvYmFsLmFwcCA9IGdsb2JhbC5hcHAgfHwge307XHJcbmdsb2JhbC5hcHAuQ2hhdFNvY2tldExpc3RlbmVyID0gQ2hhdFNvY2tldExpc3RlbmVyOyIsIlxyXG5mdW5jdGlvbiBDaGF0VmlldyAoY29uZmlnKSB7XHJcblxyXG5cdGNvbmZpZy5kb20gPSB7XHJcblx0XHRjaGF0V3JhcHBlciA6ICQoJyNjaGF0V3JhcHBlcicpLFxyXG5cdFx0dXNlcm5hbWVGb3JtIDogJCgnI3VzZXJuYW1lRm9ybScpLFxyXG5cdFx0Y2hhdEZvcm0gOiAkKCcjY2hhdEZvcm0nKSxcclxuXHRcdHByaXZhdGVDaGF0Rm9ybSA6ICQoJyNwcml2YXRlQ2hhdEZvcm0nKSxcclxuXHRcdGNoYXRVc2VybmFtZSA6ICQoJ2lucHV0I2NoYXRVc2VybmFtZScpLFxyXG5cdFx0Y2hhdElucHV0IDogJCgnaW5wdXQjY2hhdElucHV0JyksXHJcblx0XHRwcml2YXRlQ2hhdElucHV0IDogJCgnaW5wdXQjcHJpdmF0ZUNoYXRJbnB1dCcpLFxyXG5cdFx0cHJpdmF0ZUNoYXRMaXN0IDogJCgndWwjcHJpdmF0ZUNoYXRMaXN0JyksXHJcblx0XHRjaGF0TGlzdCA6ICQoJyNjaGF0TGlzdCcpLFxyXG5cdFx0Y2hhdFVzZXJsaXN0IDogJCgnI2NoYXRVc2VybGlzdCcpLFxyXG5cdFx0Y2hhdERpYWxvZyA6ICQoJyNjaGF0RGlhbG9nJyksXHJcblx0XHRjaGF0THZsMCA6ICQoJy5jaGF0THZsMCcsICcjY2hhdFdyYXBwZXInKSxcclxuXHRcdGNoYXRMdmwxIDogJCgnLmNoYXRMdmwxJywgJyNjaGF0V3JhcHBlcicpLFxyXG5cdFx0cHJpdmF0ZUNoYXRNb2RhbCA6ICQoJyNwcml2YXRlQ2hhdE1vZGFsJyksXHJcblx0XHRidG5FeGl0Q2hhdHJvb20gOiAkKCcjYnRuRXhpdENoYXRyb29tJyksXHJcblx0XHRidG5Db25maXJtIDogJCgnLmJ0bi5idG4tc3VjY2VzcycsICcjY2hhdERpYWxvZycpLFxyXG5cdFx0aXRlbVVzZXJsaXN0IDogJCgnLnVzZXJsaXN0JywnI2NoYXRVc2VybGlzdCcpXHJcblx0fTtcclxuXHJcblx0dmFyIF9zZWxmID0gdGhpcztcclxuXHJcblx0ZnVuY3Rpb24gdGltZXN0YW1wIChzb2NrZXR0aW1lKSB7XHJcblxyXG5cdFx0c29ja2V0dGltZSA9ICQudHJpbShzb2NrZXR0aW1lKTtcclxuXHJcblx0XHRpZiggISBzb2NrZXR0aW1lLmxlbmd0aCkge1xyXG5cdFx0XHRyZXR1cm4gJyc7XHJcblx0XHR9XHJcblxyXG5cdFx0dmFyIHRpbWUgPSBuZXcgRGF0ZShzb2NrZXR0aW1lKTtcclxuXHRcdHZhciBoID0gKHRpbWUuZ2V0SG91cnMoKSA8IDEwKSA/ICcwJyArIHRpbWUuZ2V0SG91cnMoKSA6IHRpbWUuZ2V0SG91cnMoKTtcclxuXHRcdHZhciBtID0gKHRpbWUuZ2V0TWludXRlcygpIDwgMTApID8gJzAnICsgdGltZS5nZXRNaW51dGVzKCkgOiB0aW1lLmdldE1pbnV0ZXMoKTtcclxuXHJcblx0XHRyZXR1cm4gaCArJzonK207XHJcblx0fVxyXG5cclxuXHR0aGlzLnJlbmRlckNoYXRsaXN0ID0gZnVuY3Rpb24gKHR5cGUsIHR4dCwgdGltZSkge1xyXG5cclxuXHRcdHZhciBzcGFudGltZXN0YW1wID0gJCgnPHNwYW4+JykudGV4dCgnWycgKyB0aW1lc3RhbXAodGltZSkgKyAnXScpO1xyXG5cclxuXHRcdCQoJzxsaT4nLHtcImNsYXNzXCI6XCJjaGF0bGlzdF9cIiArIHR5cGV9KVxyXG5cdFx0XHQuYXBwZW5kKHNwYW50aW1lc3RhbXAsIHR4dClcclxuXHRcdFx0LmFwcGVuZFRvKGNvbmZpZy5kb20uY2hhdExpc3QpO1xyXG5cclxuXHR9O1xyXG5cclxuXHR0aGlzLnJlbmRlclVzZXJsaXN0ID0gZnVuY3Rpb24gKHVzZXIpIHtcclxuXHJcblx0XHR2YXIgdGl0bGUgPSAodXNlci5zZXNzaW9uSWQgIT09IGNvbmZpZy5zb2NrZXRTZXNzaW9uSWQpID8gJ09wZW4gYSBwcml2YXRlIGNoYXQgd2l0aCB0aGlzIHVzZXIuJyA6ICdNeSB1c2VybmFtZSc7XHJcblx0XHR2YXIgY3NzID0gKHVzZXIuc2Vzc2lvbklkICE9PSBjb25maWcuc29ja2V0U2Vzc2lvbklkKSA/ICd1c2VybGlzdCcgOiAndXNlcmxpc3Rfc2VsZic7XHJcblxyXG5cdFx0JCgnPGxpPicse1wiY2xhc3NcIjpjc3MsIFwiZGF0YS1zZXNzaWRcIjp1c2VyLnNlc3Npb25JZCwgXCJ0aXRsZVwiOnRpdGxlfSlcclxuXHRcdFx0LnRleHQodXNlci51c2VybmFtZSlcclxuXHRcdFx0LmFwcGVuZFRvKGNvbmZpZy5kb20uY2hhdFVzZXJsaXN0KTtcclxuXHJcblx0fTtcclxuXHJcblx0dGhpcy5yZW5kZXJQcml2YXRlQ2hhdCA9IGZ1bmN0aW9uICgpIHtcclxuXHJcblx0XHQkKCcubW9kYWwtdGl0bGUnLCBjb25maWcuZG9tLnByaXZhdGVDaGF0TW9kYWwpXHJcblx0XHRcdC50ZXh0KCdQcml2YXRlIENoYXQgbWl0ICcgKyBjb25maWcucHJpdmF0ZUNoYXQucmVzcG9uc2VVc2VybmFtZSk7XHJcblxyXG5cdFx0Y29uZmlnLmRvbS5wcml2YXRlQ2hhdE1vZGFsLm1vZGFsKCdzaG93Jyk7XHJcblxyXG5cdH07XHJcblxyXG5cdHRoaXMucmVuZGVyUHJpdmF0ZUNoYXRNZXNzYWdlID0gZnVuY3Rpb24gKHR5cGUpIHtcclxuXHJcblx0XHR2YXIgdGV4dCA9ICh0eXBlPT09J21zZycpID8gJyAnICsgY29uZmlnLnByaXZhdGVDaGF0LnJlc3BvbnNlVXNlcm5hbWUgKyAnICcgKyBjb25maWcucHJpdmF0ZUNoYXQubWVzc2FnZSA6ICcgJyArIGNvbmZpZy5wcml2YXRlQ2hhdC5tZXNzYWdlO1xyXG5cdFx0dmFyIHNwYW50aW1lc3RhbXAgPSAkKCc8c3Bhbj4nKS50ZXh0KCdbJyArIHRpbWVzdGFtcChjb25maWcucHJpdmF0ZUNoYXQudGltZXN0YW1wKSArICddJyk7XHJcblxyXG5cdFx0JCgnPGxpPicse1wiY2xhc3NcIjpcImNoYXRsaXN0X3VzZXJcIn0pXHJcblx0XHRcdC5hcHBlbmQoc3BhbnRpbWVzdGFtcCwgdGV4dClcclxuXHRcdFx0LmFwcGVuZFRvKGNvbmZpZy5kb20ucHJpdmF0ZUNoYXRMaXN0KTtcclxuXHJcblx0fTtcclxuXHJcblx0dGhpcy5yZW5kZXJEaWFsb2cgPSBmdW5jdGlvbiAoYXJnKSB7XHJcblxyXG5cdFx0aWYgKGFyZyA9PT0gbnVsbCkge1xyXG5cclxuXHRcdFx0Y29uZmlnLmRvbS5jaGF0RGlhbG9nLm1vZGFsKCdoaWRlJyk7XHJcblx0XHRcdHJldHVybiB0cnVlO1xyXG5cclxuXHRcdH1cclxuXHJcblx0XHR2YXIgYnRudGl0bGUgPSBhcmcuYnRudGl0bGUgfHwgJ3NjaGxpZXNzZW4nO1xyXG5cclxuXHRcdF9zZWxmLnJlbmRlckRpYWxvZ0JvZHkoJzxwPicgKyBhcmcudGV4dC5qb2luKCc8L3A+PHA+JykgKyAnPC9wPicpO1xyXG5cdFx0X3NlbGYuZGlhbG9nRGlzcGxheUNvbmZpcm0oJ25vbmUnKTtcclxuXHJcblx0XHRpZiAoYXJnLmhhc093blByb3BlcnR5KCdjb25maXJtJykpIHtcclxuXHJcblx0XHRcdF9zZWxmLmRpYWxvZ0Rpc3BsYXlDb25maXJtKCdibG9jaycpO1xyXG5cclxuXHRcdH1cclxuXHJcblx0XHRpZihhcmcuaGFzT3duUHJvcGVydHkoJ3RpdGxlJykpIHtcclxuXHJcblx0XHRcdCQoJy5tb2RhbC10aXRsZScsIGNvbmZpZy5kb20uY2hhdERpYWxvZylcclxuXHRcdFx0XHQudGV4dChhcmcudGl0bGUpO1xyXG5cdFx0fVxyXG5cclxuXHRcdCQoJy5tb2RhbC1mb290ZXIgYnV0dG9uLmJ0bi5idG4tcHJpbWFyeScsIGNvbmZpZy5kb20uY2hhdERpYWxvZylcclxuXHRcdFx0LnRleHQoYnRudGl0bGUpO1xyXG5cclxuXHRcdGNvbmZpZy5kb20uY2hhdERpYWxvZy5tb2RhbCgnc2hvdycpO1xyXG5cclxuXHR9O1xyXG5cclxuXHR0aGlzLnJlbmRlckRpYWxvZ0JvZHkgPSBmdW5jdGlvbiAodGV4dCkge1xyXG5cdFx0JCgnLm1vZGFsLWJvZHknLCBjb25maWcuZG9tLmNoYXREaWFsb2cpXHJcblx0XHRcdC5odG1sKHRleHQpO1xyXG5cdH07XHJcblxyXG5cdHRoaXMudG9nZ2xlQ2hhdExldmVsID0gZnVuY3Rpb24gKCkge1xyXG5cclxuXHRcdHZhciBzaG93bHZsMCA9IChjb25maWcuZG9tLmNoYXRMdmwwLmNzcygnZGlzcGxheScpICE9PSAnbm9uZScpID8gJ25vbmUnIDogJ2Jsb2NrJztcclxuXHRcdHZhciBzaG93bHZsMSA9IChzaG93bHZsMCA9PT0gJ2Jsb2NrJyApID8gJ25vbmUnIDogJ2Jsb2NrJztcclxuXHJcblx0XHRjb25zb2xlLmxvZygndG9nZ2xlQ2hhdExldmVsJyxzaG93bHZsMCxzaG93bHZsMSk7XHJcblx0XHRjb25maWcuZG9tLmNoYXRMdmwwLmNzcygnZGlzcGxheScsIHNob3dsdmwwKTtcclxuXHRcdGNvbmZpZy5kb20uY2hhdEx2bDEuY3NzKCdkaXNwbGF5Jywgc2hvd2x2bDEpO1xyXG5cdH07XHJcblxyXG5cdHRoaXMuZW1wdHlDaGF0TGlzdCA9IGZ1bmN0aW9uICgpIHtcclxuXHRcdGNvbmZpZy5kb20uY2hhdExpc3QuZW1wdHkoKTtcclxuXHR9O1xyXG5cclxuXHR0aGlzLmVtcHR5Q2hhdElucHV0ID0gZnVuY3Rpb24gKCkge1xyXG5cdFx0Y29uZmlnLmRvbS5jaGF0SW5wdXQudmFsKCcnKTtcclxuXHR9O1xyXG5cclxuXHR0aGlzLmVtcHR5VXNlckxpc3QgPSBmdW5jdGlvbiAoKSB7XHJcblx0XHRjb25maWcuZG9tLmNoYXRVc2VybGlzdC5lbXB0eSgpO1xyXG5cdH07XHJcblxyXG5cdHRoaXMuZW1wdHlDaGF0VXNlcm5hbWUgPSBmdW5jdGlvbiAoKSB7XHJcblx0XHRjb25maWcuZG9tLmNoYXRVc2VybmFtZS52YWwoJycpO1xyXG5cdH07XHJcblxyXG5cdHRoaXMuZW1wdHlQcml2YXRlQ2hhdElucHV0ID0gZnVuY3Rpb24gKCkge1xyXG5cdFx0Y29uZmlnLmRvbS5wcml2YXRlQ2hhdElucHV0LnZhbCgnJyk7XHJcblx0fTtcclxuXHJcblx0dGhpcy5kaWFsb2dJc09wZW4gPSBmdW5jdGlvbigpIHtcclxuXHRcdHJldHVybiAoY29uZmlnLmRvbS5jaGF0RGlhbG9nLmNzcygnZGlzcGxheScpIT09J25vbmUnKTtcclxuXHR9O1xyXG5cclxuXHR0aGlzLmRpYWxvZ0Rpc3BsYXlDb25maXJtID0gZnVuY3Rpb24odmFsKSB7XHJcblx0XHRjb25maWcuZG9tLmJ0bkNvbmZpcm0uY3NzKCdkaXNwbGF5Jyx2YWwpO1xyXG5cdH07XHJcblxyXG5cdHJldHVybiB0aGlzO1xyXG59XHJcblxyXG5nbG9iYWwuYXBwID0gZ2xvYmFsLmFwcCB8fCB7fTtcclxuZ2xvYmFsLmFwcC5DaGF0VmlldyA9IENoYXRWaWV3O1xyXG4iLCJcclxuJChkb2N1bWVudCkucmVhZHkgKGZ1bmN0aW9uICgpIHtcclxuXHRnbG9iYWwuYXBwLkNoYXRDb250cm9sbGVyLmluaXQoKTtcclxufSk7XHJcbiJdfQ==
