(function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);var f=new Error("Cannot find module '"+o+"'");throw f.code="MODULE_NOT_FOUND",f}var l=n[o]={exports:{}};t[o][0].call(l.exports,function(e){var n=t[o][1][e];return s(n?n:e)},l,l.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(require,module,exports){
(function (global){

function ChatController () {

	var config = {
		socket : null,
		socketSessionId : '',
		socketIsDisconnected : true,
		socketPrivateChatActive : false
	};

	var Model = null;

	function eventListener () {

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

		config.dom.chatUserlist.on('click', '.userlist', function () {

			Model.initPrivateChat($(this).text(), $(this).attr('data-sessid'), 'event');

		});

	}

	function socketListener () {

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
	}

	this.init = function () {

		if (io) {

			config.socket = io();
			//config.socketIsDisconnected = false;

			Model = new global.app.ChatModel(config);

			eventListener();
			socketListener();
		}
	};

	return this;

}

global.app = global.app || {};
global.app.ChatController = new ChatController();
}).call(this,typeof global !== "undefined" ? global : typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {})

},{}],2:[function(require,module,exports){
(function (global){
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
}).call(this,typeof global !== "undefined" ? global : typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {})

},{}],3:[function(require,module,exports){
(function (global){

$(document).ready (function () {
	global.app.ChatController.init();
});

}).call(this,typeof global !== "undefined" ? global : typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {})

},{}]},{},[2,1,3])
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIm5vZGVfbW9kdWxlcy9icm93c2VyLXBhY2svX3ByZWx1ZGUuanMiLCJwdWJsaWMvanMvYXBwL0NoYXRDb250cm9sbGVyLmpzIiwicHVibGljL2pzL2FwcC9DaGF0TW9kZWwuanMiLCJwdWJsaWMvanMvYXBwL2luZGV4LmpzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOztBQ0FBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7Ozs7O0FDN0dBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7Ozs7O0FDelRBO0FBQ0E7QUFDQTtBQUNBO0FBQ0EiLCJmaWxlIjoiZ2VuZXJhdGVkLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXNDb250ZW50IjpbIihmdW5jdGlvbiBlKHQsbixyKXtmdW5jdGlvbiBzKG8sdSl7aWYoIW5bb10pe2lmKCF0W29dKXt2YXIgYT10eXBlb2YgcmVxdWlyZT09XCJmdW5jdGlvblwiJiZyZXF1aXJlO2lmKCF1JiZhKXJldHVybiBhKG8sITApO2lmKGkpcmV0dXJuIGkobywhMCk7dmFyIGY9bmV3IEVycm9yKFwiQ2Fubm90IGZpbmQgbW9kdWxlICdcIitvK1wiJ1wiKTt0aHJvdyBmLmNvZGU9XCJNT0RVTEVfTk9UX0ZPVU5EXCIsZn12YXIgbD1uW29dPXtleHBvcnRzOnt9fTt0W29dWzBdLmNhbGwobC5leHBvcnRzLGZ1bmN0aW9uKGUpe3ZhciBuPXRbb11bMV1bZV07cmV0dXJuIHMobj9uOmUpfSxsLGwuZXhwb3J0cyxlLHQsbixyKX1yZXR1cm4gbltvXS5leHBvcnRzfXZhciBpPXR5cGVvZiByZXF1aXJlPT1cImZ1bmN0aW9uXCImJnJlcXVpcmU7Zm9yKHZhciBvPTA7bzxyLmxlbmd0aDtvKyspcyhyW29dKTtyZXR1cm4gc30pIiwiXHJcbmZ1bmN0aW9uIENoYXRDb250cm9sbGVyICgpIHtcclxuXHJcblx0dmFyIGNvbmZpZyA9IHtcclxuXHRcdHNvY2tldCA6IG51bGwsXHJcblx0XHRzb2NrZXRTZXNzaW9uSWQgOiAnJyxcclxuXHRcdHNvY2tldElzRGlzY29ubmVjdGVkIDogdHJ1ZSxcclxuXHRcdHNvY2tldFByaXZhdGVDaGF0QWN0aXZlIDogZmFsc2VcclxuXHR9O1xyXG5cclxuXHR2YXIgTW9kZWwgPSBudWxsO1xyXG5cclxuXHRmdW5jdGlvbiBldmVudExpc3RlbmVyICgpIHtcclxuXHJcblx0XHRjb25maWcuZG9tLnVzZXJuYW1lRm9ybS5vbignc3VibWl0JywgZnVuY3Rpb24gKCkge1xyXG5cclxuXHRcdFx0TW9kZWwuYWRkVXNlcigpO1xyXG5cclxuXHRcdFx0cmV0dXJuIGZhbHNlO1xyXG5cclxuXHRcdH0pO1xyXG5cclxuXHRcdGNvbmZpZy5kb20uY2hhdEZvcm0ub24oJ3N1Ym1pdCcsIGZ1bmN0aW9uICgpIHtcclxuXHJcblx0XHRcdE1vZGVsLnNlbmRNZXNzYWdlKCk7XHJcblxyXG5cdFx0XHRyZXR1cm4gZmFsc2U7XHJcblxyXG5cdFx0fSk7XHJcblxyXG5cdFx0Y29uZmlnLmRvbS5wcml2YXRlQ2hhdEZvcm0ub24oJ3N1Ym1pdCcsIGZ1bmN0aW9uICgpIHtcclxuXHJcblx0XHRcdE1vZGVsLnNlbmRQcml2YXRlTWVzc2FnZSgpO1xyXG5cclxuXHRcdFx0cmV0dXJuIGZhbHNlO1xyXG5cclxuXHRcdH0pO1xyXG5cclxuXHRcdGNvbmZpZy5kb20uYnRuRXhpdENoYXRyb29tLm9uKCdjbGljaycsIGZ1bmN0aW9uICgpIHtcclxuXHJcblx0XHRcdE1vZGVsLnNvY2tldERpc2Nvbm5lY3QoKTtcclxuXHJcblx0XHR9KTtcclxuXHJcblx0XHRjb25maWcuZG9tLmNoYXRVc2VybGlzdC5vbignY2xpY2snLCAnLnVzZXJsaXN0JywgZnVuY3Rpb24gKCkge1xyXG5cclxuXHRcdFx0TW9kZWwuaW5pdFByaXZhdGVDaGF0KCQodGhpcykudGV4dCgpLCAkKHRoaXMpLmF0dHIoJ2RhdGEtc2Vzc2lkJyksICdldmVudCcpO1xyXG5cclxuXHRcdH0pO1xyXG5cclxuXHR9XHJcblxyXG5cdGZ1bmN0aW9uIHNvY2tldExpc3RlbmVyICgpIHtcclxuXHJcblx0XHRjb25maWcuc29ja2V0Lm9uKCdsb2dpbiBzdWNjZXNzJywgZnVuY3Rpb24gKGRhdGEpIHtcclxuXHJcblx0XHRcdE1vZGVsLnNldExvZ2luQWNjZXNzRGF0YShkYXRhKTtcclxuXHJcblx0XHR9KTtcclxuXHJcblx0XHRjb25maWcuc29ja2V0Lm9uKCdsb2dpbiBlcnJvcicsIGZ1bmN0aW9uICgpIHtcclxuXHJcblx0XHRcdE1vZGVsLmRpYWxvZygnRGVyIEJlbnV0emVybmFtZSBpc3QgdW5nw7xsdGlnJyk7XHJcblxyXG5cdFx0fSk7XHJcblxyXG5cdFx0Y29uZmlnLnNvY2tldC5vbignbG9naW4gZXJyI3VzZXJuYW1lJywgZnVuY3Rpb24gKCkge1xyXG5cclxuXHRcdFx0TW9kZWwuZGlhbG9nKCdEZXIgQmVudXR6ZXJuYW1lIHdpcmQgc2Nob24gYmVuw7x0enQsIGJpdHRlIHfDpGhsZSBlaW5lbiBhbmRlcmVuIE5hbWVuLicpO1xyXG5cclxuXHRcdH0pO1xyXG5cclxuXHRcdGNvbmZpZy5zb2NrZXQub24oJ2NoYXQgbWVzc2FnZScsIGZ1bmN0aW9uIChkYXRhKSB7XHJcblxyXG5cdFx0XHRNb2RlbC5zb2NrZXRSZXNwb25zZVNldE1lc3NhZ2UoZGF0YSk7XHJcblxyXG5cdFx0fSk7XHJcblxyXG5cdFx0Y29uZmlnLnNvY2tldC5vbignbmV3IHVzZXInLCBmdW5jdGlvbiAoZGF0YSkge1xyXG5cclxuXHRcdFx0TW9kZWwuc29ja2V0UmVzcG9uc2VVc2VyTmV3KGRhdGEpO1xyXG5cdFx0fSk7XHJcblxyXG5cdFx0Y29uZmlnLnNvY2tldC5vbigndXNlciBkaXNjb25uZWN0JywgZnVuY3Rpb24gKGRhdGEpIHtcclxuXHJcblx0XHRcdE1vZGVsLnNvY2tldFJlc3BvbnNlVXNlckRpc2Nvbm5lY3QoZGF0YSk7XHJcblxyXG5cdFx0fSk7XHJcblx0fVxyXG5cclxuXHR0aGlzLmluaXQgPSBmdW5jdGlvbiAoKSB7XHJcblxyXG5cdFx0aWYgKGlvKSB7XHJcblxyXG5cdFx0XHRjb25maWcuc29ja2V0ID0gaW8oKTtcclxuXHRcdFx0Ly9jb25maWcuc29ja2V0SXNEaXNjb25uZWN0ZWQgPSBmYWxzZTtcclxuXHJcblx0XHRcdE1vZGVsID0gbmV3IGdsb2JhbC5hcHAuQ2hhdE1vZGVsKGNvbmZpZyk7XHJcblxyXG5cdFx0XHRldmVudExpc3RlbmVyKCk7XHJcblx0XHRcdHNvY2tldExpc3RlbmVyKCk7XHJcblx0XHR9XHJcblx0fTtcclxuXHJcblx0cmV0dXJuIHRoaXM7XHJcblxyXG59XHJcblxyXG5nbG9iYWwuYXBwID0gZ2xvYmFsLmFwcCB8fCB7fTtcclxuZ2xvYmFsLmFwcC5DaGF0Q29udHJvbGxlciA9IG5ldyBDaGF0Q29udHJvbGxlcigpOyIsImZ1bmN0aW9uIENoYXRNb2RlbCAoY29uZmlnKSB7XHJcblxyXG5cdGNvbmZpZy5zb2NrZXREYXRhID0ge1xyXG5cdFx0bWVzc2FnZSA6ICcnLFxyXG5cdFx0dXNlcm5hbWUgOiAnJ1xyXG5cdH07XHJcblxyXG5cdGNvbmZpZy5wcml2YXRlQ2hhdCA9IHtcclxuXHRcdHNlc3Npb25pZCA6ICcnLFxyXG5cdFx0bWVzc2FnZSA6ICcnLFxyXG5cdFx0dXNlcm5hbWUgOiAnJ1xyXG5cdH1cclxuXHJcblx0Y29uZmlnLmRvbSA9IHtcclxuXHRcdGNoYXRXcmFwcGVyIDogJCgnI2NoYXRXcmFwcGVyJyksXHJcblx0XHR1c2VybmFtZUZvcm0gOiAkKCcjdXNlcm5hbWVGb3JtJyksXHJcblx0XHRjaGF0Rm9ybSA6ICQoJyNjaGF0Rm9ybScpLFxyXG5cdFx0cHJpdmF0ZUNoYXRGb3JtIDogJCgnI3ByaXZhdGVDaGF0Rm9ybScpLFxyXG5cdFx0Y2hhdFVzZXJuYW1lIDogJCgnaW5wdXQjY2hhdFVzZXJuYW1lJyksXHJcblx0XHRjaGF0SW5wdXQgOiAkKCdpbnB1dCNjaGF0SW5wdXQnKSxcclxuXHRcdHByaXZhdGVDaGF0SW5wdXQgOiAkKCdpbnB1dCNwcml2YXRlQ2hhdElucHV0JyksXHJcblx0XHRjaGF0TGlzdCA6ICQoJyNjaGF0TGlzdCcpLFxyXG5cdFx0Y2hhdFVzZXJsaXN0IDogJCgnI2NoYXRVc2VybGlzdCcpLFxyXG5cdFx0Y2hhdERpYWxvZyA6ICQoJyNjaGF0RGlhbG9nJyksXHJcblx0XHRwcml2YXRlQ2hhdE1vZGFsIDogJCgnI3ByaXZhdGVDaGF0TW9kYWwnKSxcclxuXHRcdGJ0bkV4aXRDaGF0cm9vbSA6ICQoJyNidG5FeGl0Q2hhdHJvb20nKSxcclxuXHRcdGl0ZW1Vc2VybGlzdCA6ICQoJy51c2VybGlzdCcsJyNjaGF0VXNlcmxpc3QnKVxyXG5cdH07XHJcblxyXG5cdHZhciBfc2VsZiA9IHRoaXM7XHJcblxyXG5cdGZ1bmN0aW9uIGFkZFRvQ2hhdGxpc3QgKGRhdGEsIHR5cGUpIHtcclxuXHJcblx0XHR2YXIgdHh0ID0gJyc7XHJcblxyXG5cdFx0c3dpdGNoICh0eXBlKSB7XHJcblx0XHRcdGNhc2UoJ21zZycpOlxyXG5cdFx0XHRcdHR4dCA9IGRhdGEudXNlcm5hbWUgKyAnIDogJyArIGRhdGEubWVzc2FnZTtcclxuXHRcdFx0XHRicmVhaztcclxuXHRcdFx0Y2FzZSgndXNlcicpOlxyXG5cdFx0XHRcdHR4dCA9IGRhdGEudXNlcm5hbWUgKyAnIGhhdCBkZW4gUmF1bSBiZXRyZXRlbic7XHJcblx0XHRcdFx0YnJlYWs7XHJcblx0XHRcdGNhc2UoJ2Rpc2Nvbm5lY3QnKTpcclxuXHRcdFx0XHR0eHQgPSBkYXRhLnVzZXJuYW1lICsgJyBoYXQgZGVuIFJhdW0gdmVybGFzc2VuJztcclxuXHRcdFx0XHRicmVhaztcclxuXHRcdH1cclxuXHJcblx0XHRyZW5kZXJDaGF0bGlzdCh0eXBlLCB0eHQsIGRhdGEudGltZXN0YW1wKTtcclxuXHJcblx0fVxyXG5cclxuXHRmdW5jdGlvbiBhZGRUb1VzZXJsaXN0IChkYXRhKSB7XHJcblxyXG5cdFx0aWYgKHR5cGVvZiBkYXRhID09PSAnb2JqZWN0Jykge1xyXG5cclxuXHRcdFx0JC5lYWNoKGRhdGEsIGZ1bmN0aW9uIChrZXksdXNlcikge1xyXG5cclxuXHRcdFx0XHRyZW5kZXJVc2VybGlzdCh1c2VyKTtcclxuXHJcblx0XHRcdH0pO1xyXG5cdFx0fVxyXG5cdH1cclxuXHJcblx0ZnVuY3Rpb24gY2hlY2tVc2VybmFtZSAoKSB7XHJcblx0XHRyZXR1cm4gKHR5cGVvZiBjb25maWcuc29ja2V0RGF0YS51c2VybmFtZSA9PT0gJ3N0cmluZycgJiYgY29uZmlnLnNvY2tldERhdGEudXNlcm5hbWUubGVuZ3RoKSA/IHRydWUgOiBmYWxzZTtcclxuXHR9XHJcblxyXG5cdGZ1bmN0aW9uIGNoZWNrTWVzc2FnZSAoKSB7XHJcblx0XHRyZXR1cm4gKHR5cGVvZiBjb25maWcuc29ja2V0RGF0YS5tZXNzYWdlID09PSAnc3RyaW5nJyAmJiBjb25maWcuc29ja2V0RGF0YS5tZXNzYWdlLmxlbmd0aCkgPyB0cnVlIDogZmFsc2U7XHJcblx0fVxyXG5cclxuXHRmdW5jdGlvbiBjaGVja1ByaXZhdGVDaGF0ICgpIHtcclxuXHJcblx0XHR2YXIgcmVzID0gdHJ1ZTtcclxuXHJcblx0XHQkLmVhY2goY29uZmlnLnByaXZhdGVDaGF0LCBmdW5jdGlvbiAoa2V5LCB2YWx1ZSkge1xyXG5cdFx0XHRpZiAoIHR5cGVvZiB2YWx1ZSAhPT0gJ3N0cmluZycgfHwgdHlwZW9mIHZhbHVlID09PSAnc3RyaW5nJyAmJiAhIHZhbHVlLmxlbmd0aCkge1xyXG5cdFx0XHRcdHJlcyA9IGZhbHNlO1xyXG5cdFx0XHRcdHJldHVybiByZXM7XHJcblx0XHRcdH1cclxuXHRcdH0pO1xyXG5cclxuXHRcdHJldHVybiByZXM7XHJcblx0fVxyXG5cclxuXHRmdW5jdGlvbiBnZXRTdHJGb3JtYXRlZCAoc3RyLCBzdHJsZW4pIHtcclxuXHJcblx0XHRzdHIgPSAkLnRyaW0oc3RyKTtcclxuXHJcblx0XHRyZXR1cm4gKHN0ci5sZW5ndGggPiBzdHJsZW4gKSA/IHN0ci5zdWJzdHIoMCxzdHJsZW4tMSkgOiBzdHI7XHJcblx0fVxyXG5cclxuXHRmdW5jdGlvbiBzZXRNZXNzYWdlICgpIHtcclxuXHJcblx0XHRjb25maWcuc29ja2V0RGF0YS5tZXNzYWdlID0gZ2V0U3RyRm9ybWF0ZWQoY29uZmlnLmRvbS5jaGF0SW5wdXQudmFsKCksIDIwMCk7XHJcblx0XHRjb25maWcuZG9tLmNoYXRJbnB1dC52YWwoJycpO1xyXG5cclxuXHR9XHJcblxyXG5cdGZ1bmN0aW9uIHNldFByaXZhdGVNZXNzYWdlICgpIHtcclxuXHJcblx0XHRjb25maWcucHJpdmF0ZUNoYXQubWVzc2FnZSA9IGdldFN0ckZvcm1hdGVkKGNvbmZpZy5kb20ucHJpdmF0ZUNoYXRJbnB1dC52YWwoKSwgMjAwKTtcclxuXHRcdGNvbmZpZy5kb20ucHJpdmF0ZUNoYXRJbnB1dC52YWwoJycpO1xyXG5cclxuXHR9XHJcblxyXG5cdGZ1bmN0aW9uIHNldFVzZXJuYW1lICgpIHtcclxuXHJcblx0XHRjb25maWcuc29ja2V0RGF0YS51c2VybmFtZSA9IGdldFN0ckZvcm1hdGVkKGNvbmZpZy5kb20uY2hhdFVzZXJuYW1lLnZhbCgpLCAzMCk7XHJcblx0XHRjb25maWcuZG9tLmNoYXRVc2VybmFtZS52YWwoJycpO1xyXG5cclxuXHR9XHJcblxyXG5cdGZ1bmN0aW9uIHRpbWVzdGFtcCAoc29ja2V0dGltZSkge1xyXG5cclxuXHRcdHNvY2tldHRpbWUgPSAkLnRyaW0oc29ja2V0dGltZSk7XHJcblxyXG5cdFx0aWYoICEgc29ja2V0dGltZS5sZW5ndGgpIHtcclxuXHRcdFx0cmV0dXJuICcnO1xyXG5cdFx0fVxyXG5cclxuXHRcdHZhciB0aW1lID0gbmV3IERhdGUoc29ja2V0dGltZSk7XHJcblx0XHR2YXIgaCA9ICh0aW1lLmdldEhvdXJzKCkgPCAxMCkgPyAnMCcgKyB0aW1lLmdldEhvdXJzKCkgOiB0aW1lLmdldEhvdXJzKCk7XHJcblx0XHR2YXIgbSA9ICh0aW1lLmdldE1pbnV0ZXMoKSA8IDEwKSA/ICcwJyArIHRpbWUuZ2V0TWludXRlcygpIDogdGltZS5nZXRNaW51dGVzKCk7XHJcblxyXG5cdFx0cmV0dXJuIGggKyc6JyttO1xyXG5cdH1cclxuXHJcblx0ZnVuY3Rpb24gdG9nZ2xlQ2hhdExldmVsICgpIHtcclxuXHJcblx0XHR2YXIgc2hvd2x2bDAgPSAnYmxvY2snO1xyXG5cdFx0dmFyIHNob3dsdmwxID0gJ25vbmUnO1xyXG5cclxuXHRcdGlmKCAkKCcuY2hhdEx2bDAnLCBjb25maWcuZG9tLmNoYXRXcmFwcGVyKS5jc3MoJ2Rpc3BsYXknKSAhPT0gJ25vbmUnKSB7XHJcblxyXG5cdFx0XHRzaG93bHZsMCA9ICdub25lJztcclxuXHRcdFx0c2hvd2x2bDEgPSAnYmxvY2snO1xyXG5cdFx0fVxyXG5cclxuXHRcdCQoJy5jaGF0THZsMCcsIGNvbmZpZy5kb20uY2hhdFdyYXBwZXIpLmNzcygnZGlzcGxheScsIHNob3dsdmwwKTtcclxuXHRcdCQoJy5jaGF0THZsMScsIGNvbmZpZy5kb20uY2hhdFdyYXBwZXIpLmNzcygnZGlzcGxheScsIHNob3dsdmwxKTtcclxuXHR9XHJcblxyXG5cdGZ1bmN0aW9uIHJlbmRlckNoYXRsaXN0ICh0eXBlLCB0eHQsIHRpbWUpIHtcclxuXHJcblx0XHR2YXIgc3BhbnRpbWVzdGFtcCA9ICQoJzxzcGFuPicpLnRleHQoJ1snICsgdGltZXN0YW1wKHRpbWUpICsgJ10nKTtcclxuXHRcdHZhciBsaSA9ICQoJzxsaT4nLHtcImNsYXNzXCI6XCJjaGF0bGlzdF9cIiArIHR5cGV9KS5hcHBlbmQoc3BhbnRpbWVzdGFtcCwgdHh0KTtcclxuXHJcblx0XHRjb25maWcuZG9tLmNoYXRMaXN0LmFwcGVuZChsaSk7XHJcblx0fVxyXG5cclxuXHRmdW5jdGlvbiByZW5kZXJVc2VybGlzdCAodXNlcikge1xyXG5cclxuXHRcdHZhciB0aXRsZSA9ICh1c2VyLnNlc3Npb25JZCAhPT0gY29uZmlnLnNvY2tldFNlc3Npb25JZCkgPyAnT3BlbiBhIHByaXZhdGUgY2hhdCB3aXRoIHRoaXMgdXNlci4nIDogJ015IHVzZXJuYW1lJztcclxuXHRcdHZhciBjc3MgPSAodXNlci5zZXNzaW9uSWQgIT09IGNvbmZpZy5zb2NrZXRTZXNzaW9uSWQpID8gJ3VzZXJsaXN0JyA6ICd1c2VybGlzdF9zZWxmJztcclxuXHJcblx0XHR2YXIgbGkgPSAkKCc8bGk+Jyx7XCJjbGFzc1wiOmNzcywgXCJkYXRhLXNlc3NpZFwiOnVzZXIuc2Vzc2lvbklkLCBcInRpdGxlXCI6dGl0bGV9KS50ZXh0KHVzZXIudXNlcm5hbWUpO1xyXG5cdFx0Y29uZmlnLmRvbS5jaGF0VXNlcmxpc3QuYXBwZW5kKGxpKTtcclxuXHJcblx0fVxyXG5cclxuXHRmdW5jdGlvbiByZW5kZXJQcml2YXRlQ2hhdCAodXNlcm5hbWUpIHtcclxuXHJcblx0XHQkKCcubW9kYWwtdGl0bGUnLCBjb25maWcuZG9tLnByaXZhdGVDaGF0TW9kYWwpLnRleHQoJ1ByaXZhdGUgQ2hhdCBtaXQgJyArIHVzZXJuYW1lKTtcclxuXHRcdGNvbmZpZy5kb20ucHJpdmF0ZUNoYXRNb2RhbC5tb2RhbCgnc2hvdycpO1xyXG5cclxuXHR9XHJcblxyXG5cdGZ1bmN0aW9uIHJlc2V0Q2hhdCAoKSB7XHJcblxyXG5cdFx0Y29uZmlnLmRvbS5jaGF0TGlzdC5lbXB0eSgpO1xyXG5cdFx0Y29uZmlnLmRvbS5jaGF0VXNlcmxpc3QuZW1wdHkoKTtcclxuXHRcdGNvbmZpZy5zb2NrZXREYXRhLnVzZXJuYW1lID0gJyc7XHJcblx0fVxyXG5cclxuXHRmdW5jdGlvbiByZXNldFVzZXJsaXN0ICh1c2VybGlzdCkge1xyXG5cclxuXHRcdGNvbmZpZy5kb20uY2hhdFVzZXJsaXN0LmVtcHR5KCk7XHJcblx0XHRhZGRUb1VzZXJsaXN0KHVzZXJsaXN0KTtcclxuXHJcblx0fVxyXG5cclxuXHR0aGlzLmFkZFVzZXIgPSBmdW5jdGlvbiAoKSB7XHJcblxyXG5cdFx0c2V0VXNlcm5hbWUoKTtcclxuXHJcblx0XHRpZiAoIGNoZWNrVXNlcm5hbWUoKSApIHtcclxuXHJcblx0XHRcdGlmIChjb25maWcuc29ja2V0SXNEaXNjb25uZWN0ZWQgPT09IHRydWUpIHtcclxuXHJcblx0XHRcdFx0Y29uZmlnLnNvY2tldC5jb25uZWN0KCk7XHJcblxyXG5cdFx0XHR9XHJcblxyXG5cdFx0XHRjb25maWcuc29ja2V0LmVtaXQoJ2FkZCB1c2VyJywgY29uZmlnLnNvY2tldERhdGEudXNlcm5hbWUpO1xyXG5cclxuXHRcdH0gZWxzZSB7XHJcblxyXG5cdFx0XHRfc2VsZi5kaWFsb2coJ0tlaW5lbiBVc2VybmFtZW4gZ2VmdW5kZW4nKTtcclxuXHRcdH1cclxuXHR9O1xyXG5cclxuXHR0aGlzLmRpYWxvZyA9IGZ1bmN0aW9uICh0ZXh0KSB7XHJcblxyXG5cdFx0JCgnLm1vZGFsLWJvZHknLCBjb25maWcuZG9tLmNoYXREaWFsb2cpXHJcblx0XHRcdC5lbXB0eSgpXHJcblx0XHRcdC5hcHBlbmQoJCgnPHA+JykudGV4dCh0ZXh0KSk7XHJcblxyXG5cdFx0Y29uZmlnLmRvbS5jaGF0RGlhbG9nLm1vZGFsKCdzaG93Jyk7XHJcblxyXG5cdH07XHJcblxyXG5cdHRoaXMuc2VuZE1lc3NhZ2UgPSBmdW5jdGlvbiAoKSB7XHJcblxyXG5cdFx0c2V0TWVzc2FnZSgpO1xyXG5cclxuXHRcdGlmICggY2hlY2tNZXNzYWdlKCkgJiYgY2hlY2tVc2VybmFtZSgpICkge1xyXG5cclxuXHRcdFx0Y29uZmlnLnNvY2tldC5lbWl0KCdjaGF0IG1lc3NhZ2UnLCBjb25maWcuc29ja2V0RGF0YSk7XHJcblxyXG5cdFx0fSBlbHNlIHtcclxuXHJcblx0XHRcdF9zZWxmLmRpYWxvZygnS2VpbmUgTmFjaHJpY2h0IGdlZnVuZGVuJyk7XHJcblxyXG5cdFx0fVxyXG5cdH07XHJcblxyXG5cdHRoaXMuc2VuZFByaXZhdGVNZXNzYWdlID0gZnVuY3Rpb24gKCkge1xyXG5cclxuXHRcdHNldFByaXZhdGVNZXNzYWdlKCk7XHJcblxyXG5cdFx0aWYgKCBjaGVja1ByaXZhdGVDaGF0KCkgJiYgY2hlY2tVc2VybmFtZSgpICkge1xyXG5cclxuXHRcdFx0Y29uZmlnLnNvY2tldC5lbWl0KCdjaGF0IHByaXZhdGUgbWVzc2FnZScsIGNvbmZpZy5wcml2YXRlQ2hhdCk7XHJcblx0XHRcdGNvbmZpZy5zb2NrZXRQcml2YXRlQ2hhdEFjdGl2ZSA9IHRydWU7XHJcblxyXG5cdFx0fSBlbHNlIHtcclxuXHJcblx0XHRcdGFsZXJ0KCdLZWluZSBOYWNocmljaHQgZ2VmdW5kZW4nKTtcclxuXHJcblx0XHR9XHJcblx0fTtcclxuXHJcblx0dGhpcy5pbml0UHJpdmF0ZUNoYXQgPSBmdW5jdGlvbiAodXNlcm5hbWUsIHNlc3NvbmlkLCBsaXN0ZW5lcikge1xyXG5cclxuXHRcdGlmICggbGlzdGVuZXIgPT09ICdldmVudCcpIHtcclxuXHJcblx0XHRcdGlmIChjb25maWcuc29ja2V0U2Vzc2lvbklkICE9PSAnJyAmJiBjb25maWcuc29ja2V0U2Vzc2lvbklkICE9PSBzZXNzb25pZCkge1xyXG5cclxuXHRcdFx0XHRjb25maWcucHJpdmF0ZUNoYXQuc2Vzc2lvbmlkID0gc2Vzc29uaWQ7XHJcblx0XHRcdFx0Y29uZmlnLnByaXZhdGVDaGF0LnVzZXJuYW1lID0gdXNlcm5hbWU7XHJcblx0XHRcdFx0Y29uZmlnLnByaXZhdGVDaGF0Lm1lc3NhZ2UgPSAnJztcclxuXHJcblx0XHRcdFx0cmVuZGVyUHJpdmF0ZUNoYXQodXNlcm5hbWUpO1xyXG5cclxuXHRcdFx0fVxyXG5cdFx0fVxyXG5cdH07XHJcblxyXG5cdHRoaXMuc29ja2V0RGlzY29ubmVjdCA9IGZ1bmN0aW9uICgpIHtcclxuXHJcblx0XHRjb25maWcuc29ja2V0LmRpc2Nvbm5lY3QoKTtcclxuXHRcdGNvbmZpZy5zb2NrZXRJc0Rpc2Nvbm5lY3RlZCA9IHRydWU7XHJcblx0XHRjb25maWcuc29ja2V0U2Vzc2lvbklkID0gJyc7XHJcblxyXG5cdFx0cmVzZXRDaGF0KCk7XHJcblx0XHR0b2dnbGVDaGF0TGV2ZWwoKTtcclxuXHR9O1xyXG5cclxuXHR0aGlzLnNldExvZ2luQWNjZXNzRGF0YSA9IGZ1bmN0aW9uIChkYXRhKSB7XHJcblxyXG5cdFx0Y29uZmlnLnNvY2tldElzRGlzY29ubmVjdGVkID0gZmFsc2U7XHJcblx0XHRjb25maWcuc29ja2V0U2Vzc2lvbklkID0gZGF0YS5zZXNzaW9uSWQ7XHJcblxyXG5cdFx0YWRkVG9Vc2VybGlzdChkYXRhLnVzZXJzKTtcclxuXHRcdGFkZFRvQ2hhdGxpc3Qoe3RpbWVzdGFtcDpkYXRhLnRpbWVzdGFtcCx1c2VybmFtZTpkYXRhLnVzZXJuYW1lfSwgJ3VzZXInKTtcclxuXHRcdHRvZ2dsZUNoYXRMZXZlbCgpO1xyXG5cclxuXHR9O1xyXG5cclxuXHR0aGlzLnNvY2tldFJlc3BvbnNlU2V0TWVzc2FnZSA9IGZ1bmN0aW9uIChkYXRhKSB7XHJcblxyXG5cdFx0aWYgKCAhIGNvbmZpZy5zb2NrZXRJc0Rpc2Nvbm5lY3RlZCkge1xyXG5cclxuXHRcdFx0YWRkVG9DaGF0bGlzdChkYXRhLCAnbXNnJyk7XHJcblxyXG5cdFx0fVxyXG5cdH07XHJcblxyXG5cdHRoaXMuc29ja2V0UmVzcG9uc2VVc2VyTmV3ID0gZnVuY3Rpb24gKGRhdGEpIHtcclxuXHJcblx0XHRpZiAoICEgY29uZmlnLnNvY2tldElzRGlzY29ubmVjdGVkKSB7XHJcblxyXG5cdFx0XHRhZGRUb0NoYXRsaXN0KHt0aW1lc3RhbXA6ZGF0YS50aW1lc3RhbXAsdXNlcm5hbWU6ZGF0YS51c2VybmFtZX0sICd1c2VyJyk7XHJcblx0XHRcdGFkZFRvVXNlcmxpc3Qoe1widXNlclwiOnt1c2VybmFtZTpkYXRhLnVzZXJuYW1lLHNlc3Npb25JZDpkYXRhLnNlc3Npb25JZH19KTtcclxuXHJcblx0XHR9XHJcblx0fTtcclxuXHJcblx0dGhpcy5zb2NrZXRSZXNwb25zZVVzZXJEaXNjb25uZWN0ID0gZnVuY3Rpb24gKGRhdGEpIHtcclxuXHJcblx0XHRpZiAoICEgY29uZmlnLnNvY2tldElzRGlzY29ubmVjdGVkKSB7XHJcblxyXG5cdFx0XHRyZXNldFVzZXJsaXN0KGRhdGEudXNlcnMpO1xyXG5cdFx0XHRhZGRUb0NoYXRsaXN0KHt0aW1lc3RhbXA6ZGF0YS50aW1lc3RhbXAsIHVzZXJuYW1lOmRhdGEudXNlcm5hbWV9LCAnZGlzY29ubmVjdCcpO1xyXG5cclxuXHRcdH1cclxuXHR9O1xyXG5cclxuXHRyZXR1cm4gdGhpcztcclxufVxyXG5cclxuZ2xvYmFsLmFwcCA9IGdsb2JhbC5hcHAgfHwge307XHJcbmdsb2JhbC5hcHAuQ2hhdE1vZGVsID0gQ2hhdE1vZGVsOyIsIlxyXG4kKGRvY3VtZW50KS5yZWFkeSAoZnVuY3Rpb24gKCkge1xyXG5cdGdsb2JhbC5hcHAuQ2hhdENvbnRyb2xsZXIuaW5pdCgpO1xyXG59KTtcclxuIl19
