(function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);var f=new Error("Cannot find module '"+o+"'");throw f.code="MODULE_NOT_FOUND",f}var l=n[o]={exports:{}};t[o][0].call(l.exports,function(e){var n=t[o][1][e];return s(n?n:e)},l,l.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(require,module,exports){
(function (global){

function ChatController () {

	var config = {
		socket : null,
		socketIsDisconnected : true
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

		config.dom.btnExitChatroom.on('click', function () {

			Model.socketDisconnect();

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
}).call(this,typeof global !== "undefined" ? global : typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {})

},{}],3:[function(require,module,exports){
(function (global){

$(document).ready (function () {
	global.app.ChatController.init();
});

}).call(this,typeof global !== "undefined" ? global : typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {})

},{}]},{},[2,1,3])
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIm5vZGVfbW9kdWxlcy9icm93c2VyLXBhY2svX3ByZWx1ZGUuanMiLCJwdWJsaWMvanMvYXBwL0NoYXRDb250cm9sbGVyLmpzIiwicHVibGljL2pzL2FwcC9DaGF0TW9kZWwuanMiLCJwdWJsaWMvanMvYXBwL2luZGV4LmpzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOztBQ0FBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7Ozs7O0FDM0ZBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOzs7OztBQzFPQTtBQUNBO0FBQ0E7QUFDQTtBQUNBIiwiZmlsZSI6ImdlbmVyYXRlZC5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzQ29udGVudCI6WyIoZnVuY3Rpb24gZSh0LG4scil7ZnVuY3Rpb24gcyhvLHUpe2lmKCFuW29dKXtpZighdFtvXSl7dmFyIGE9dHlwZW9mIHJlcXVpcmU9PVwiZnVuY3Rpb25cIiYmcmVxdWlyZTtpZighdSYmYSlyZXR1cm4gYShvLCEwKTtpZihpKXJldHVybiBpKG8sITApO3ZhciBmPW5ldyBFcnJvcihcIkNhbm5vdCBmaW5kIG1vZHVsZSAnXCIrbytcIidcIik7dGhyb3cgZi5jb2RlPVwiTU9EVUxFX05PVF9GT1VORFwiLGZ9dmFyIGw9bltvXT17ZXhwb3J0czp7fX07dFtvXVswXS5jYWxsKGwuZXhwb3J0cyxmdW5jdGlvbihlKXt2YXIgbj10W29dWzFdW2VdO3JldHVybiBzKG4/bjplKX0sbCxsLmV4cG9ydHMsZSx0LG4scil9cmV0dXJuIG5bb10uZXhwb3J0c312YXIgaT10eXBlb2YgcmVxdWlyZT09XCJmdW5jdGlvblwiJiZyZXF1aXJlO2Zvcih2YXIgbz0wO288ci5sZW5ndGg7bysrKXMocltvXSk7cmV0dXJuIHN9KSIsIlxyXG5mdW5jdGlvbiBDaGF0Q29udHJvbGxlciAoKSB7XHJcblxyXG5cdHZhciBjb25maWcgPSB7XHJcblx0XHRzb2NrZXQgOiBudWxsLFxyXG5cdFx0c29ja2V0SXNEaXNjb25uZWN0ZWQgOiB0cnVlXHJcblx0fTtcclxuXHJcblx0dmFyIE1vZGVsID0gbnVsbDtcclxuXHJcblx0ZnVuY3Rpb24gZXZlbnRMaXN0ZW5lciAoKSB7XHJcblxyXG5cdFx0Y29uZmlnLmRvbS51c2VybmFtZUZvcm0ub24oJ3N1Ym1pdCcsIGZ1bmN0aW9uICgpIHtcclxuXHJcblx0XHRcdE1vZGVsLmFkZFVzZXIoKTtcclxuXHJcblx0XHRcdHJldHVybiBmYWxzZTtcclxuXHJcblx0XHR9KTtcclxuXHJcblx0XHRjb25maWcuZG9tLmNoYXRGb3JtLm9uKCdzdWJtaXQnLCBmdW5jdGlvbiAoKSB7XHJcblxyXG5cdFx0XHRNb2RlbC5zZW5kTWVzc2FnZSgpO1xyXG5cclxuXHRcdFx0cmV0dXJuIGZhbHNlO1xyXG5cclxuXHRcdH0pO1xyXG5cclxuXHRcdGNvbmZpZy5kb20uYnRuRXhpdENoYXRyb29tLm9uKCdjbGljaycsIGZ1bmN0aW9uICgpIHtcclxuXHJcblx0XHRcdE1vZGVsLnNvY2tldERpc2Nvbm5lY3QoKTtcclxuXHJcblx0XHR9KTtcclxuXHR9XHJcblxyXG5cdGZ1bmN0aW9uIHNvY2tldExpc3RlbmVyICgpIHtcclxuXHJcblx0XHRjb25maWcuc29ja2V0Lm9uKCdsb2dpbiBzdWNjZXNzJywgZnVuY3Rpb24gKGRhdGEpIHtcclxuXHJcblx0XHRcdE1vZGVsLnNldExvZ2luQWNjZXNzRGF0YShkYXRhKTtcclxuXHJcblx0XHR9KTtcclxuXHJcblx0XHRjb25maWcuc29ja2V0Lm9uKCdsb2dpbiBlcnJvcicsIGZ1bmN0aW9uICgpIHtcclxuXHJcblx0XHRcdE1vZGVsLmRpYWxvZygnRGVyIEJlbnV0emVybmFtZSBpc3QgdW5nw7xsdGlnJyk7XHJcblxyXG5cdFx0fSk7XHJcblxyXG5cdFx0Y29uZmlnLnNvY2tldC5vbignbG9naW4gZXJyI3VzZXJuYW1lJywgZnVuY3Rpb24gKCkge1xyXG5cclxuXHRcdFx0TW9kZWwuZGlhbG9nKCdEZXIgQmVudXR6ZXJuYW1lIHdpcmQgc2Nob24gYmVuw7x0enQsIGJpdHRlIHfDpGhsZSBlaW5lbiBhbmRlcmVuIE5hbWVuLicpO1xyXG5cclxuXHRcdH0pO1xyXG5cclxuXHRcdGNvbmZpZy5zb2NrZXQub24oJ2NoYXQgbWVzc2FnZScsIGZ1bmN0aW9uIChkYXRhKSB7XHJcblxyXG5cdFx0XHRNb2RlbC5zb2NrZXRSZXNwb25zZVNldE1lc3NhZ2UoZGF0YSk7XHJcblxyXG5cdFx0fSk7XHJcblxyXG5cdFx0Y29uZmlnLnNvY2tldC5vbignbmV3IHVzZXInLCBmdW5jdGlvbiAoZGF0YSkge1xyXG5cclxuXHRcdFx0TW9kZWwuc29ja2V0UmVzcG9uc2VVc2VyTmV3KGRhdGEpO1xyXG5cdFx0fSk7XHJcblxyXG5cdFx0Y29uZmlnLnNvY2tldC5vbigndXNlciBkaXNjb25uZWN0JywgZnVuY3Rpb24gKGRhdGEpIHtcclxuXHJcblx0XHRcdE1vZGVsLnNvY2tldFJlc3BvbnNlVXNlckRpc2Nvbm5lY3QoZGF0YSk7XHJcblxyXG5cdFx0fSk7XHJcblx0fVxyXG5cclxuXHR0aGlzLmluaXQgPSBmdW5jdGlvbiAoKSB7XHJcblxyXG5cdFx0aWYgKGlvKSB7XHJcblxyXG5cdFx0XHRjb25maWcuc29ja2V0ID0gaW8oKTtcclxuXHJcblx0XHRcdE1vZGVsID0gbmV3IGdsb2JhbC5hcHAuQ2hhdE1vZGVsKGNvbmZpZyk7XHJcblxyXG5cdFx0XHRldmVudExpc3RlbmVyKCk7XHJcblx0XHRcdHNvY2tldExpc3RlbmVyKCk7XHJcblx0XHR9XHJcblx0fTtcclxuXHJcblx0cmV0dXJuIHRoaXM7XHJcblxyXG59XHJcblxyXG5nbG9iYWwuYXBwID0gZ2xvYmFsLmFwcCB8fCB7fTtcclxuZ2xvYmFsLmFwcC5DaGF0Q29udHJvbGxlciA9IG5ldyBDaGF0Q29udHJvbGxlcigpOyIsImZ1bmN0aW9uIENoYXRNb2RlbCAoY29uZmlnKSB7XHJcblxyXG5cdGNvbmZpZy5zb2NrZXREYXRhID0ge1xyXG5cdFx0bWVzc2FnZSA6ICcnLFxyXG5cdFx0dXNlcm5hbWUgOiAnJ1xyXG5cdH07XHJcblxyXG5cdGNvbmZpZy5kb20gPSB7XHJcblx0XHRjaGF0V3JhcHBlciA6ICQoJyNjaGF0V3JhcHBlcicpLFxyXG5cdFx0dXNlcm5hbWVGb3JtIDogJCgnI3VzZXJuYW1lRm9ybScpLFxyXG5cdFx0Y2hhdEZvcm0gOiAkKCcjY2hhdEZvcm0nKSxcclxuXHRcdGNoYXRVc2VybmFtZSA6ICQoJ2lucHV0I2NoYXRVc2VybmFtZScpLFxyXG5cdFx0Y2hhdElucHV0IDogJCgnaW5wdXQjY2hhdElucHV0JyksXHJcblx0XHRjaGF0TGlzdCA6ICQoJyNjaGF0TGlzdCcpLFxyXG5cdFx0Y2hhdFVzZXJsaXN0IDogJCgnI2NoYXRVc2VybGlzdCcpLFxyXG5cdFx0Y2hhdERpYWxvZyA6ICQoJyNjaGF0RGlhbG9nJyksXHJcblx0XHRidG5FeGl0Q2hhdHJvb20gOiAkKCcjYnRuRXhpdENoYXRyb29tJylcclxuXHR9O1xyXG5cclxuXHR2YXIgX3NlbGYgPSB0aGlzO1xyXG5cclxuXHRmdW5jdGlvbiBhZGRUb0NoYXRsaXN0IChkYXRhLCB0eXBlKSB7XHJcblxyXG5cdFx0dmFyIHR4dCA9ICcnO1xyXG5cclxuXHRcdHN3aXRjaCAodHlwZSkge1xyXG5cdFx0XHRjYXNlKCdtc2cnKTpcclxuXHRcdFx0XHR0eHQgPSBkYXRhLnVzZXJuYW1lICsgJyA6ICcgKyBkYXRhLm1lc3NhZ2U7XHJcblx0XHRcdFx0YnJlYWs7XHJcblx0XHRcdGNhc2UoJ3VzZXInKTpcclxuXHRcdFx0XHR0eHQgPSBkYXRhLnVzZXJuYW1lICsgJyBoYXQgZGVuIFJhdW0gYmV0cmV0ZW4nO1xyXG5cdFx0XHRcdGJyZWFrO1xyXG5cdFx0XHRjYXNlKCdkaXNjb25uZWN0Jyk6XHJcblx0XHRcdFx0dHh0ID0gZGF0YS51c2VybmFtZSArICcgaGF0IGRlbiBSYXVtIHZlcmxhc3Nlbic7XHJcblx0XHRcdFx0YnJlYWs7XHJcblx0XHR9XHJcblxyXG5cdFx0dmFyIHNwYW50aW1lc3RhbXAgPSAkKCc8c3Bhbj4nKS50ZXh0KCdbJyArIHRpbWVzdGFtcChkYXRhLnRpbWVzdGFtcCkgKyAnXScpO1xyXG5cdFx0dmFyIGxpID0gJCgnPGxpPicse1wiY2xhc3NcIjpcImNoYXRsaXN0X1wiICsgdHlwZX0pLmFwcGVuZChzcGFudGltZXN0YW1wLCB0eHQpO1xyXG5cclxuXHRcdGNvbmZpZy5kb20uY2hhdExpc3QuYXBwZW5kKGxpKTtcclxuXHJcblx0fVxyXG5cclxuXHRmdW5jdGlvbiBhZGRUb1VzZXJsaXN0IChkYXRhKSB7XHJcblxyXG5cdFx0aWYgKHR5cGVvZiBkYXRhID09PSAnb2JqZWN0Jykge1xyXG5cclxuXHRcdFx0dmFyIGxpID0gbnVsbDtcclxuXHJcblx0XHRcdCQuZWFjaChkYXRhLCBmdW5jdGlvbiAoa2V5LHVzZXIpIHtcclxuXHJcblx0XHRcdFx0dmFyIGxpID0gJCgnPGxpPicse1wiY2xhc3NcIjpcInVzZXJsaXN0XCIsIFwiZGF0YS1zZXNzaWRcIjp1c2VyLnNlc3Npb25JZH0pLnRleHQodXNlci51c2VybmFtZSk7XHJcblx0XHRcdFx0Y29uZmlnLmRvbS5jaGF0VXNlcmxpc3QuYXBwZW5kKGxpKTtcclxuXHJcblx0XHRcdH0pO1xyXG5cdFx0fVxyXG5cdH1cclxuXHJcblx0ZnVuY3Rpb24gY2hlY2tVc2VybmFtZSAoKSB7XHJcblx0XHRyZXR1cm4gKHR5cGVvZiBjb25maWcuc29ja2V0RGF0YS51c2VybmFtZSA9PT0gJ3N0cmluZycgJiYgY29uZmlnLnNvY2tldERhdGEudXNlcm5hbWUubGVuZ3RoKSA/IHRydWUgOiBmYWxzZTtcclxuXHR9XHJcblxyXG5cdGZ1bmN0aW9uIGNoZWNrTWVzc2FnZSAoKSB7XHJcblx0XHRyZXR1cm4gKHR5cGVvZiBjb25maWcuc29ja2V0RGF0YS5tZXNzYWdlID09PSAnc3RyaW5nJyAmJiBjb25maWcuc29ja2V0RGF0YS5tZXNzYWdlLmxlbmd0aCkgPyB0cnVlIDogZmFsc2U7XHJcblx0fVxyXG5cclxuXHRmdW5jdGlvbiBnZXRTdHJGb3JtYXRlZCAoc3RyLCBzdHJsZW4pIHtcclxuXHJcblx0XHRzdHIgPSAkLnRyaW0oc3RyKTtcclxuXHJcblx0XHRpZiAoc3RyLmxlbmd0aCA+IDAgKSB7XHJcblxyXG5cdFx0XHRpZiAoc3RyLmxlbmd0aCA+IHN0cmxlbiApIHtcclxuXHRcdFx0XHRzdHIgPSBzdHIuc3Vic3RyKDAsc3RybGVuLTEpO1xyXG5cdFx0XHR9XHJcblx0XHR9XHJcblxyXG5cdFx0cmV0dXJuIHN0cjtcclxuXHR9XHJcblxyXG5cdGZ1bmN0aW9uIHNldE1lc3NhZ2UgKCkge1xyXG5cclxuXHRcdGNvbmZpZy5zb2NrZXREYXRhLm1lc3NhZ2UgPSBnZXRTdHJGb3JtYXRlZChjb25maWcuZG9tLmNoYXRJbnB1dC52YWwoKSwgMjAwKTtcclxuXHRcdGNvbmZpZy5kb20uY2hhdElucHV0LnZhbCgnJyk7XHJcblxyXG5cdH1cclxuXHJcblx0ZnVuY3Rpb24gc2V0VXNlcm5hbWUgKCkge1xyXG5cclxuXHRcdGNvbmZpZy5zb2NrZXREYXRhLnVzZXJuYW1lID0gZ2V0U3RyRm9ybWF0ZWQoY29uZmlnLmRvbS5jaGF0VXNlcm5hbWUudmFsKCksIDMwKTtcclxuXHRcdGNvbmZpZy5kb20uY2hhdFVzZXJuYW1lLnZhbCgnJyk7XHJcblxyXG5cdH1cclxuXHJcblx0ZnVuY3Rpb24gdGltZXN0YW1wIChzb2NrZXR0aW1lKSB7XHJcblxyXG5cdFx0c29ja2V0dGltZSA9ICQudHJpbShzb2NrZXR0aW1lKTtcclxuXHJcblx0XHRpZiggISBzb2NrZXR0aW1lLmxlbmd0aCkge1xyXG5cdFx0XHRyZXR1cm4gJyc7XHJcblx0XHR9XHJcblxyXG5cdFx0dmFyIHRpbWUgPSBuZXcgRGF0ZShzb2NrZXR0aW1lKTtcclxuXHRcdHZhciBoID0gKHRpbWUuZ2V0SG91cnMoKSA8IDEwKSA/ICcwJyArIHRpbWUuZ2V0SG91cnMoKSA6IHRpbWUuZ2V0SG91cnMoKTtcclxuXHRcdHZhciBtID0gKHRpbWUuZ2V0TWludXRlcygpIDwgMTApID8gJzAnICsgdGltZS5nZXRNaW51dGVzKCkgOiB0aW1lLmdldE1pbnV0ZXMoKTtcclxuXHJcblx0XHRyZXR1cm4gaCArJzonK207XHJcblx0fVxyXG5cclxuXHRmdW5jdGlvbiB0b2dnbGVDaGF0TGV2ZWwgKCkge1xyXG5cclxuXHRcdHZhciBzaG93bHZsMCA9ICdibG9jayc7XHJcblx0XHR2YXIgc2hvd2x2bDEgPSAnbm9uZSc7XHJcblxyXG5cdFx0aWYoICQoJy5jaGF0THZsMCcsIGNvbmZpZy5kb20uY2hhdFdyYXBwZXIpLmNzcygnZGlzcGxheScpICE9PSAnbm9uZScpIHtcclxuXHJcblx0XHRcdHNob3dsdmwwID0gJ25vbmUnO1xyXG5cdFx0XHRzaG93bHZsMSA9ICdibG9jayc7XHJcblx0XHR9XHJcblxyXG5cdFx0JCgnLmNoYXRMdmwwJywgY29uZmlnLmRvbS5jaGF0V3JhcHBlcikuY3NzKCdkaXNwbGF5Jywgc2hvd2x2bDApO1xyXG5cdFx0JCgnLmNoYXRMdmwxJywgY29uZmlnLmRvbS5jaGF0V3JhcHBlcikuY3NzKCdkaXNwbGF5Jywgc2hvd2x2bDEpO1xyXG5cdH1cclxuXHJcblx0ZnVuY3Rpb24gcmVzZXRDaGF0ICgpIHtcclxuXHJcblx0XHRjb25maWcuZG9tLmNoYXRMaXN0LmVtcHR5KCk7XHJcblx0XHRjb25maWcuZG9tLmNoYXRVc2VybGlzdC5lbXB0eSgpO1xyXG5cdFx0Y29uZmlnLnNvY2tldERhdGEudXNlcm5hbWUgPSAnJztcclxuXHR9XHJcblxyXG5cdGZ1bmN0aW9uIHJlc2V0VXNlcmxpc3QgKHVzZXJsaXN0KSB7XHJcblxyXG5cdFx0Y29uZmlnLmRvbS5jaGF0VXNlcmxpc3QuZW1wdHkoKTtcclxuXHRcdGFkZFRvVXNlcmxpc3QodXNlcmxpc3QpO1xyXG5cclxuXHR9XHJcblxyXG5cdHRoaXMuYWRkVXNlciA9IGZ1bmN0aW9uICgpIHtcclxuXHJcblx0XHRzZXRVc2VybmFtZSgpO1xyXG5cclxuXHRcdGlmICggY2hlY2tVc2VybmFtZSgpICkge1xyXG5cclxuXHRcdFx0aWYgKGNvbmZpZy5zb2NrZXRJc0Rpc2Nvbm5lY3RlZCA9PT0gdHJ1ZSkge1xyXG5cdFx0XHRcdGNvbmZpZy5zb2NrZXQuY29ubmVjdCgpO1xyXG5cdFx0XHR9XHJcblxyXG5cdFx0XHRjb25maWcuc29ja2V0LmVtaXQoJ2FkZCB1c2VyJywgY29uZmlnLnNvY2tldERhdGEudXNlcm5hbWUpO1xyXG5cclxuXHRcdH0gZWxzZSB7XHJcblxyXG5cdFx0XHRfc2VsZi5kaWFsb2coJ0tlaW5lbiBVc2VybmFtZW4gZ2VmdW5kZW4nKTtcclxuXHRcdH1cclxuXHR9O1xyXG5cclxuXHR0aGlzLmRpYWxvZyA9IGZ1bmN0aW9uICh0ZXh0KSB7XHJcblxyXG5cdFx0JCgnLm1vZGFsLWJvZHknLCBjb25maWcuZG9tLmNoYXREaWFsb2cpXHJcblx0XHRcdC5lbXB0eSgpXHJcblx0XHRcdC5hcHBlbmQoJCgnPHA+JykudGV4dCh0ZXh0KSk7XHJcblxyXG5cdFx0Y29uZmlnLmRvbS5jaGF0RGlhbG9nLm1vZGFsLnNob3coKTtcclxuXHJcblx0fTtcclxuXHJcblx0dGhpcy5zZW5kTWVzc2FnZSA9IGZ1bmN0aW9uICgpIHtcclxuXHJcblx0XHRzZXRNZXNzYWdlKCk7XHJcblxyXG5cdFx0aWYgKCBjaGVja01lc3NhZ2UoKSAmJiBjaGVja1VzZXJuYW1lKCkgKSB7XHJcblxyXG5cdFx0XHRjb25maWcuc29ja2V0LmVtaXQoJ2NoYXQgbWVzc2FnZScsIGNvbmZpZy5zb2NrZXREYXRhKTtcclxuXHJcblx0XHR9IGVsc2Uge1xyXG5cclxuXHRcdFx0X3NlbGYuZGlhbG9nKCdLZWluZSBOYWNocmljaHQgZ2VmdW5kZW4nKTtcclxuXHJcblx0XHR9XHJcblx0fTtcclxuXHJcblx0dGhpcy5zb2NrZXREaXNjb25uZWN0ID0gZnVuY3Rpb24gKCkge1xyXG5cclxuXHRcdGNvbmZpZy5zb2NrZXQuZGlzY29ubmVjdCgpO1xyXG5cdFx0Y29uZmlnLnNvY2tldElzRGlzY29ubmVjdGVkID0gdHJ1ZTtcclxuXHJcblx0XHRyZXNldENoYXQoKTtcclxuXHRcdHRvZ2dsZUNoYXRMZXZlbCgpO1xyXG5cdH07XHJcblxyXG5cdHRoaXMuc2V0TG9naW5BY2Nlc3NEYXRhID0gZnVuY3Rpb24gKGRhdGEpIHtcclxuXHJcblx0XHRjb25maWcuc29ja2V0SXNEaXNjb25uZWN0ZWQgPSBmYWxzZTtcclxuXHJcblx0XHRhZGRUb1VzZXJsaXN0KGRhdGEudXNlcnMpO1xyXG5cdFx0YWRkVG9DaGF0bGlzdCh7dGltZXN0YW1wOmRhdGEudGltZXN0YW1wLHVzZXJuYW1lOmRhdGEudXNlcm5hbWV9LCAndXNlcicpO1xyXG5cdFx0dG9nZ2xlQ2hhdExldmVsKCk7XHJcblxyXG5cdH07XHJcblxyXG5cdHRoaXMuc29ja2V0UmVzcG9uc2VTZXRNZXNzYWdlID0gZnVuY3Rpb24gKCkge1xyXG5cclxuXHRcdGlmICggISBjb25maWcuc29ja2V0SXNEaXNjb25uZWN0ZWQpIHtcclxuXHJcblx0XHRcdGFkZFRvQ2hhdGxpc3QoZGF0YSwgJ21zZycpO1xyXG5cclxuXHRcdH1cclxuXHR9O1xyXG5cclxuXHR0aGlzLnNvY2tldFJlc3BvbnNlVXNlck5ldyA9IGZ1bmN0aW9uIChkYXRhKSB7XHJcblxyXG5cdFx0aWYgKCAhIGNvbmZpZy5zb2NrZXRJc0Rpc2Nvbm5lY3RlZCkge1xyXG5cclxuXHRcdFx0YWRkVG9DaGF0bGlzdCh7dGltZXN0YW1wOmRhdGEudGltZXN0YW1wLHVzZXJuYW1lOmRhdGEudXNlcm5hbWV9LCAndXNlcicpO1xyXG5cdFx0XHRhZGRUb1VzZXJsaXN0KHtcInVzZXJcIjp7dXNlcm5hbWU6ZGF0YS51c2VybmFtZSxzZXNzaW9uSWQ6ZGF0YS5zZXNzaW9uSWR9fSk7XHJcblxyXG5cdFx0fVxyXG5cdH07XHJcblxyXG5cdHRoaXMuc29ja2V0UmVzcG9uc2VVc2VyRGlzY29ubmVjdCA9IGZ1bmN0aW9uIChkYXRhKSB7XHJcblxyXG5cdFx0aWYgKCAhIGNvbmZpZy5zb2NrZXRJc0Rpc2Nvbm5lY3RlZCkge1xyXG5cclxuXHRcdFx0cmVzZXRVc2VybGlzdChkYXRhLnVzZXJzKTtcclxuXHRcdFx0YWRkVG9DaGF0bGlzdCh7dGltZXN0YW1wOmRhdGEudGltZXN0YW1wLCB1c2VybmFtZTpkYXRhLnVzZXJuYW1lfSwgJ2Rpc2Nvbm5lY3QnKTtcclxuXHJcblx0XHR9XHJcblx0fTtcclxuXHJcblx0cmV0dXJuIHRoaXM7XHJcbn1cclxuXHJcbmdsb2JhbC5hcHAgPSBnbG9iYWwuYXBwIHx8IHt9O1xyXG5nbG9iYWwuYXBwLkNoYXRNb2RlbCA9IENoYXRNb2RlbDsiLCJcclxuJChkb2N1bWVudCkucmVhZHkgKGZ1bmN0aW9uICgpIHtcclxuXHRnbG9iYWwuYXBwLkNoYXRDb250cm9sbGVyLmluaXQoKTtcclxufSk7XHJcbiJdfQ==
