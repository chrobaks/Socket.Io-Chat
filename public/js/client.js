(function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);var f=new Error("Cannot find module '"+o+"'");throw f.code="MODULE_NOT_FOUND",f}var l=n[o]={exports:{}};t[o][0].call(l.exports,function(e){var n=t[o][1][e];return s(n?n:e)},l,l.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(require,module,exports){
(function (global){
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
}).call(this,typeof global !== "undefined" ? global : typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {})

},{}],2:[function(require,module,exports){
(function (global){

$(document).ready (function () {
	global.app.SocketIoChat.init();
});

}).call(this,typeof global !== "undefined" ? global : typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {})

},{}]},{},[1,2])
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIm5vZGVfbW9kdWxlcy9icm93c2VyLXBhY2svX3ByZWx1ZGUuanMiLCJwdWJsaWMvanMvYXBwL1NvY2tldElvQ2hhdC5qcyIsInB1YmxpYy9qcy9hcHAvaW5kZXguanMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7O0FDQUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7Ozs7O0FDeE5BO0FBQ0E7QUFDQTtBQUNBO0FBQ0EiLCJmaWxlIjoiZ2VuZXJhdGVkLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXNDb250ZW50IjpbIihmdW5jdGlvbiBlKHQsbixyKXtmdW5jdGlvbiBzKG8sdSl7aWYoIW5bb10pe2lmKCF0W29dKXt2YXIgYT10eXBlb2YgcmVxdWlyZT09XCJmdW5jdGlvblwiJiZyZXF1aXJlO2lmKCF1JiZhKXJldHVybiBhKG8sITApO2lmKGkpcmV0dXJuIGkobywhMCk7dmFyIGY9bmV3IEVycm9yKFwiQ2Fubm90IGZpbmQgbW9kdWxlICdcIitvK1wiJ1wiKTt0aHJvdyBmLmNvZGU9XCJNT0RVTEVfTk9UX0ZPVU5EXCIsZn12YXIgbD1uW29dPXtleHBvcnRzOnt9fTt0W29dWzBdLmNhbGwobC5leHBvcnRzLGZ1bmN0aW9uKGUpe3ZhciBuPXRbb11bMV1bZV07cmV0dXJuIHMobj9uOmUpfSxsLGwuZXhwb3J0cyxlLHQsbixyKX1yZXR1cm4gbltvXS5leHBvcnRzfXZhciBpPXR5cGVvZiByZXF1aXJlPT1cImZ1bmN0aW9uXCImJnJlcXVpcmU7Zm9yKHZhciBvPTA7bzxyLmxlbmd0aDtvKyspcyhyW29dKTtyZXR1cm4gc30pIiwiZnVuY3Rpb24gU29ja2V0SW9DaGF0ICgpIHtcclxuXHJcblx0dmFyIHNvY2tldCA9IG51bGw7XHJcblxyXG5cdHZhciBzb2NrZXREYXRhID0ge1xyXG5cdFx0bWVzc2FnZSA6ICcnLFxyXG5cdFx0dXNlcm5hbWUgOiAnJ1xyXG5cdH07XHJcblxyXG5cdHZhciBkb20gPSB7XHJcblx0XHRjaGF0V3JhcHBlciA6ICQoJyNjaGF0V3JhcHBlcicpLFxyXG5cdFx0Y2hhdEZvcm0gOiAkKCcjY2hhdEZvcm0nKSxcclxuXHRcdGNoYXRVc2VyIDogJCgnaW5wdXQjY2hhdFVzZXInKSxcclxuXHRcdGNoYXRJbnB1dCA6ICQoJ2lucHV0I2NoYXRJbnB1dCcpLFxyXG5cdFx0Y2hhdExpc3QgOiAkKCcjY2hhdExpc3QnKSxcclxuXHRcdGNoYXRVc2VybGlzdCA6ICQoJyNjaGF0VXNlcmxpc3QnKSxcclxuXHRcdGJ0bkxvZ2luIDogJCgnI2J0bkxvZ2luJyksXHJcblx0XHRidG5FeGl0Q2hhdHJvb20gOiAkKCcjYnRuRXhpdENoYXRyb29tJylcclxuXHR9O1xyXG5cclxuXHRmdW5jdGlvbiBhZGRUb0NoYXRsaXN0IChkYXRhLCB0eXBlKSB7XHJcblxyXG5cdFx0dmFyIHR4dCA9ICcnO1xyXG5cclxuXHRcdHN3aXRjaCAodHlwZSkge1xyXG5cdFx0XHRjYXNlKCdtc2cnKTpcclxuXHRcdFx0XHR0eHQgPSBkYXRhLnVzZXJuYW1lICsgJyA6ICcgKyBkYXRhLm1lc3NhZ2U7XHJcblx0XHRcdFx0YnJlYWs7XHJcblx0XHRcdGNhc2UoJ3VzZXInKTpcclxuXHRcdFx0XHR0eHQgPSBkYXRhLnVzZXJuYW1lICsgJyBoYXQgZGVuIFJhdW0gYmV0cmV0ZW4nO1xyXG5cdFx0XHRcdGJyZWFrO1xyXG5cdFx0XHRjYXNlKCdkaXNjb25uZWN0Jyk6XHJcblx0XHRcdFx0dHh0ID0gZGF0YS51c2VybmFtZSArICcgaGF0IGRlbiBSYXVtIHZlcmxhc3Nlbic7XHJcblx0XHRcdFx0YnJlYWs7XHJcblx0XHR9XHJcblxyXG5cdFx0dmFyIHNwYW50aW1lc3RhbXAgPSAkKCc8c3Bhbj4nKS50ZXh0KCdbJyArIHRpbWVzdGFtcChkYXRhLnRpbWVzdGFtcCkgKyAnXScpO1xyXG5cdFx0dmFyIGxpID0gJCgnPGxpPicse1wiY2xhc3NcIjpcImNoYXRsaXN0X1wiICsgdHlwZX0pLmFwcGVuZChzcGFudGltZXN0YW1wLCB0eHQpO1xyXG5cclxuXHRcdGRvbS5jaGF0TGlzdC5hcHBlbmQobGkpO1xyXG5cdH1cclxuXHJcblx0ZnVuY3Rpb24gYWRkVG9Vc2VybGlzdCAoZGF0YSkge1xyXG5cclxuXHRcdGlmICh0eXBlb2YgZGF0YSA9PT0gJ3N0cmluZycgJiYgZGF0YS5sZW5ndGgpIHtcclxuXHJcblx0XHRcdHZhciBsaSA9ICQoJzxsaT4nLHtcImNsYXNzXCI6XCJ1c2VybGlzdFwifSkudGV4dChkYXRhKTtcclxuXHRcdFx0ZG9tLmNoYXRVc2VybGlzdC5hcHBlbmQobGkpO1xyXG5cclxuXHRcdH0gZWxzZSBpZiAodHlwZW9mIGRhdGEgPT09ICdvYmplY3QnICYmIGRhdGEuaGFzT3duUHJvcGVydHkoJ2xlbmd0aCcpKSB7XHJcblxyXG5cdFx0XHRkYXRhLmZvckVhY2goZnVuY3Rpb24gKHJvdykge1xyXG5cdFx0XHRcdGFkZFRvVXNlcmxpc3Qocm93KTtcclxuXHRcdFx0fSk7XHJcblxyXG5cdFx0fVxyXG5cdH1cclxuXHJcblx0ZnVuY3Rpb24gY2hlY2tVc2VyICgpIHtcclxuXHRcdHJldHVybiAodHlwZW9mIHNvY2tldERhdGEudXNlcm5hbWUgPT09ICdzdHJpbmcnICYmIHNvY2tldERhdGEudXNlcm5hbWUubGVuZ3RoKSA/IHRydWUgOiBmYWxzZTtcclxuXHR9XHJcblxyXG5cdGZ1bmN0aW9uIGNoZWNrTWVzc2FnZSAoKSB7XHJcblx0XHRzb2NrZXREYXRhLm1lc3NhZ2UgPSAkLnRyaW0oZG9tLmNoYXRJbnB1dC52YWwoKSk7XHJcblx0XHRyZXR1cm4gKHR5cGVvZiBzb2NrZXREYXRhLm1lc3NhZ2UgPT09ICdzdHJpbmcnICYmIHNvY2tldERhdGEubWVzc2FnZS5sZW5ndGgpID8gdHJ1ZSA6IGZhbHNlO1xyXG5cdH1cclxuXHJcblx0ZnVuY3Rpb24gc2VuZCAoKSB7XHJcblx0XHRzb2NrZXQuZW1pdCgnY2hhdCBtZXNzYWdlJywgc29ja2V0RGF0YSk7XHJcblx0fVxyXG5cclxuXHRmdW5jdGlvbiBzZXRVc2VyICgpIHtcclxuXHRcdHNvY2tldERhdGEudXNlcm5hbWUgPSAkLnRyaW0oZG9tLmNoYXRVc2VyLnZhbCgpKTtcclxuXHRcdGRvbS5jaGF0VXNlci52YWwoJycpO1xyXG5cdH1cclxuXHJcblx0ZnVuY3Rpb24gdGltZXN0YW1wIChzb2NrZXR0aW1lKSB7XHJcblxyXG5cdFx0c29ja2V0dGltZSA9ICQudHJpbShzb2NrZXR0aW1lKTtcclxuXHJcblx0XHRpZiggISBzb2NrZXR0aW1lLmxlbmd0aCkge1xyXG5cdFx0XHRyZXR1cm4gJyc7XHJcblx0XHR9XHJcblxyXG5cdFx0dmFyIHRpbWUgPSBuZXcgRGF0ZShzb2NrZXR0aW1lKTtcclxuXHRcdHZhciBoID0gKHRpbWUuZ2V0SG91cnMoKSA8IDEwKSA/ICcwJyArIHRpbWUuZ2V0SG91cnMoKSA6IHRpbWUuZ2V0SG91cnMoKTtcclxuXHRcdHZhciBtID0gKHRpbWUuZ2V0TWludXRlcygpIDwgMTApID8gJzAnICsgdGltZS5nZXRNaW51dGVzKCkgOiB0aW1lLmdldE1pbnV0ZXMoKTtcclxuXHJcblx0XHRyZXR1cm4gaCArJzonK207XHJcblx0fVxyXG5cclxuXHRmdW5jdGlvbiB0b2dnbGVDaGF0TGV2ZWwgKCkge1xyXG5cclxuXHRcdHZhciBzaG93bHZsMCA9ICdibG9jayc7XHJcblx0XHR2YXIgc2hvd2x2bDEgPSAnbm9uZSc7XHJcblxyXG5cdFx0aWYoICQoJy5jaGF0THZsMCcsIGRvbS5jaGF0V3JhcHBlcikuY3NzKCdkaXNwbGF5JykgIT09ICdub25lJykge1xyXG5cclxuXHRcdFx0c2hvd2x2bDAgPSAnbm9uZSc7XHJcblx0XHRcdHNob3dsdmwxID0gJ2Jsb2NrJztcclxuXHRcdH1cclxuXHJcblx0XHQkKCcuY2hhdEx2bDAnLCBkb20uY2hhdFdyYXBwZXIpLmNzcygnZGlzcGxheScsIHNob3dsdmwwKTtcclxuXHRcdCQoJy5jaGF0THZsMScsIGRvbS5jaGF0V3JhcHBlcikuY3NzKCdkaXNwbGF5Jywgc2hvd2x2bDEpO1xyXG5cdH1cclxuXHJcblx0ZnVuY3Rpb24gcmVzZXRJbnB1dCAoKSB7XHJcblx0XHRkb20uY2hhdElucHV0LnZhbCgnJyk7XHJcblx0fVxyXG5cclxuXHRmdW5jdGlvbiByZXNldENoYXQgKCkge1xyXG5cdFx0ZG9tLmNoYXRMaXN0LmVtcHR5KCk7XHJcblx0XHRkb20uY2hhdFVzZXJsaXN0LmVtcHR5KCk7XHJcblx0XHRzb2NrZXREYXRhLnVzZXJuYW1lID0gJyc7XHJcblx0fVxyXG5cclxuXHRmdW5jdGlvbiByZXNldFVzZXJsaXN0KHVzZXJsaXN0KSB7XHJcblx0XHRkb20uY2hhdFVzZXJsaXN0LmVtcHR5KCk7XHJcblx0XHRhZGRUb1VzZXJsaXN0KHVzZXJsaXN0KTtcclxuXHR9XHJcblxyXG5cdGZ1bmN0aW9uIGV2ZW50TGlzdGVuZXIgKCkge1xyXG5cclxuXHRcdGRvbS5idG5Mb2dpbi5vbignY2xpY2snLCBmdW5jdGlvbiAoKSB7XHJcblxyXG5cdFx0XHRzZXRVc2VyKCk7XHJcblxyXG5cdFx0XHRpZiAoIGNoZWNrVXNlcigpICkge1xyXG5cclxuXHRcdFx0XHRzb2NrZXQuZW1pdCgnYWRkIHVzZXInLCBzb2NrZXREYXRhLnVzZXJuYW1lKTtcclxuXHJcblx0XHRcdH0gZWxzZSB7XHJcblx0XHRcdFx0YWxlcnQoJ2tlaW5lbiBVc2VybmFtZW4gZ2VmdW5kZW4nKVxyXG5cdFx0XHR9XHJcblx0XHR9KTtcclxuXHJcblx0XHRkb20uYnRuRXhpdENoYXRyb29tLm9uKCdjbGljaycsIGZ1bmN0aW9uICgpIHtcclxuXHJcblx0XHRcdHNvY2tldC5kaXNjb25uZWN0KCk7XHJcblx0XHRcdHJlc2V0Q2hhdCgpO1xyXG5cdFx0XHR0b2dnbGVDaGF0TGV2ZWwoKTtcclxuXHJcblx0XHR9KTtcclxuXHJcblx0XHRkb20uY2hhdEZvcm0ub24oJ3N1Ym1pdCcsIGZ1bmN0aW9uICgpIHtcclxuXHJcblx0XHRcdGlmICggY2hlY2tNZXNzYWdlKCkgJiYgY2hlY2tVc2VyKCkgKSB7XHJcblx0XHRcdFx0cmVzZXRJbnB1dCgpO1xyXG5cdFx0XHRcdHNlbmQoKTtcclxuXHRcdFx0fSBlbHNlIHtcclxuXHRcdFx0XHRhbGVydCgna2VpbmUgTmFjaHJpY2h0IGdlZnVuZGVuJylcclxuXHRcdFx0fVxyXG5cclxuXHRcdFx0cmV0dXJuIGZhbHNlO1xyXG5cclxuXHRcdH0pO1xyXG5cdH1cclxuXHJcblx0ZnVuY3Rpb24gc29ja2V0TGlzdGVuZXIgKCkge1xyXG5cclxuXHRcdHNvY2tldC5vbignbG9naW4gc3VjY2VzcycsIGZ1bmN0aW9uIChkYXRhKSB7XHJcblxyXG5cdFx0XHRhZGRUb1VzZXJsaXN0KGRhdGEudXNlcm5hbWVsaXN0KTtcclxuXHRcdFx0YWRkVG9DaGF0bGlzdChkYXRhLCAndXNlcicpO1xyXG5cdFx0XHR0b2dnbGVDaGF0TGV2ZWwoKTtcclxuXHJcblx0XHR9KTtcclxuXHJcblx0XHRzb2NrZXQub24oJ2xvZ2luIGVycm9yJywgZnVuY3Rpb24gKCkge1xyXG5cclxuXHRcdFx0YWxlcnQoJ0RlciBCZW51dHplcm5hbWUgaXN0IHVuZ8O8bHRpZycpO1xyXG5cclxuXHRcdH0pO1xyXG5cclxuXHRcdHNvY2tldC5vbignbG9naW4gZXJyI3VzZXJuYW1lJywgZnVuY3Rpb24gKCkge1xyXG5cclxuXHRcdFx0YWxlcnQoJ0RlciBCZW51dHplcm5hbWUgd2lyZCBzY2hvbiBiZW7DvHR6dCwgYml0dGUgd8OkaGxlIGVpbmVuIGFuZGVyZW4gTmFtZW4uJyk7XHJcblxyXG5cdFx0fSk7XHJcblxyXG5cdFx0c29ja2V0Lm9uKCdjaGF0IG1lc3NhZ2UnLCBmdW5jdGlvbiAoZGF0YSkge1xyXG5cclxuXHRcdFx0YWRkVG9DaGF0bGlzdChkYXRhLCAnbXNnJyk7XHJcblxyXG5cdFx0fSk7XHJcblxyXG5cdFx0c29ja2V0Lm9uKCduZXcgdXNlcicsIGZ1bmN0aW9uIChkYXRhKSB7XHJcblxyXG5cdFx0XHRhZGRUb0NoYXRsaXN0KGRhdGEsICd1c2VyJyk7XHJcblx0XHRcdGFkZFRvVXNlcmxpc3QoZGF0YS51c2VybmFtZSk7XHJcblxyXG5cdFx0fSk7XHJcblxyXG5cdFx0c29ja2V0Lm9uKCd1c2VyIGRpc2Nvbm5lY3QnLCBmdW5jdGlvbiAoZGF0YSkge1xyXG5cclxuXHRcdFx0cmVzZXRVc2VybGlzdChkYXRhLnVzZXJuYW1lbGlzdCk7XHJcblx0XHRcdGFkZFRvQ2hhdGxpc3Qoe3RpbWVzdGFtcDpkYXRhLnRpbWVzdGFtcCwgdXNlcm5hbWU6ZGF0YS51c2VybmFtZX0sICdkaXNjb25uZWN0Jyk7XHJcblxyXG5cdFx0fSk7XHJcblx0fVxyXG5cclxuXHR0aGlzLmluaXQgPSBmdW5jdGlvbiAoKSB7XHJcblxyXG5cdFx0aWYgKGlvKSB7XHJcblxyXG5cdFx0XHRzb2NrZXQgPSBpbygpO1xyXG5cclxuXHRcdFx0ZXZlbnRMaXN0ZW5lcigpO1xyXG5cdFx0XHRzb2NrZXRMaXN0ZW5lcigpO1xyXG5cdFx0fVxyXG5cdH07XHJcblxyXG5cdHJldHVybiB0aGlzO1xyXG59XHJcblxyXG5nbG9iYWwuYXBwID0gZ2xvYmFsLmFwcCB8fCB7fTtcclxuZ2xvYmFsLmFwcC5Tb2NrZXRJb0NoYXQgPSBuZXcgU29ja2V0SW9DaGF0KCk7IiwiXHJcbiQoZG9jdW1lbnQpLnJlYWR5IChmdW5jdGlvbiAoKSB7XHJcblx0Z2xvYmFsLmFwcC5Tb2NrZXRJb0NoYXQuaW5pdCgpO1xyXG59KTtcclxuIl19
