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
		btnLogin : $('#btnLogin')
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
		}

		var spantimestamp = $('<span>').text('[' + timestamp(data.timestamp) + ']');
		var li = $('<li>',{"class":"chatlist_" + type}).append(spantimestamp, txt);

		dom.chatList.append(li);
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

	function eventListener () {

		dom.btnLogin.on('click', function () {

			setUser();

			if ( checkUser() ) {

				socket.emit('add user', socketData.username);

			} else {
				alert('keinen Usernamen gefunden')
			}
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

		socket.on('login success', function () {
			toggleChatLevel();
		});

		socket.on('login error', function () {
			alert('Der Benutzername ist ungültig');
		});

		socket.on('chat message', function (data) {
			addToChatlist(data, 'msg');
		});

		socket.on('new user', function (data) {
			addToChatlist(data, 'user');
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
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIm5vZGVfbW9kdWxlcy9icm93c2VyLXBhY2svX3ByZWx1ZGUuanMiLCJwdWJsaWMvanMvYXBwL1NvY2tldElvQ2hhdC5qcyIsInB1YmxpYy9qcy9hcHAvaW5kZXguanMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7O0FDQUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7Ozs7QUN2SkE7QUFDQTtBQUNBO0FBQ0E7QUFDQSIsImZpbGUiOiJnZW5lcmF0ZWQuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlc0NvbnRlbnQiOlsiKGZ1bmN0aW9uIGUodCxuLHIpe2Z1bmN0aW9uIHMobyx1KXtpZighbltvXSl7aWYoIXRbb10pe3ZhciBhPXR5cGVvZiByZXF1aXJlPT1cImZ1bmN0aW9uXCImJnJlcXVpcmU7aWYoIXUmJmEpcmV0dXJuIGEobywhMCk7aWYoaSlyZXR1cm4gaShvLCEwKTt2YXIgZj1uZXcgRXJyb3IoXCJDYW5ub3QgZmluZCBtb2R1bGUgJ1wiK28rXCInXCIpO3Rocm93IGYuY29kZT1cIk1PRFVMRV9OT1RfRk9VTkRcIixmfXZhciBsPW5bb109e2V4cG9ydHM6e319O3Rbb11bMF0uY2FsbChsLmV4cG9ydHMsZnVuY3Rpb24oZSl7dmFyIG49dFtvXVsxXVtlXTtyZXR1cm4gcyhuP246ZSl9LGwsbC5leHBvcnRzLGUsdCxuLHIpfXJldHVybiBuW29dLmV4cG9ydHN9dmFyIGk9dHlwZW9mIHJlcXVpcmU9PVwiZnVuY3Rpb25cIiYmcmVxdWlyZTtmb3IodmFyIG89MDtvPHIubGVuZ3RoO28rKylzKHJbb10pO3JldHVybiBzfSkiLCJmdW5jdGlvbiBTb2NrZXRJb0NoYXQgKCkge1xyXG5cclxuXHR2YXIgc29ja2V0ID0gbnVsbDtcclxuXHJcblx0dmFyIHNvY2tldERhdGEgPSB7XHJcblx0XHRtZXNzYWdlIDogJycsXHJcblx0XHR1c2VybmFtZSA6ICcnXHJcblx0fTtcclxuXHJcblx0dmFyIGRvbSA9IHtcclxuXHRcdGNoYXRXcmFwcGVyIDogJCgnI2NoYXRXcmFwcGVyJyksXHJcblx0XHRjaGF0Rm9ybSA6ICQoJyNjaGF0Rm9ybScpLFxyXG5cdFx0Y2hhdFVzZXIgOiAkKCdpbnB1dCNjaGF0VXNlcicpLFxyXG5cdFx0Y2hhdElucHV0IDogJCgnaW5wdXQjY2hhdElucHV0JyksXHJcblx0XHRjaGF0TGlzdCA6ICQoJyNjaGF0TGlzdCcpLFxyXG5cdFx0YnRuTG9naW4gOiAkKCcjYnRuTG9naW4nKVxyXG5cdH07XHJcblxyXG5cdGZ1bmN0aW9uIGFkZFRvQ2hhdGxpc3QgKGRhdGEsIHR5cGUpIHtcclxuXHJcblx0XHR2YXIgdHh0ID0gJyc7XHJcblxyXG5cdFx0c3dpdGNoICh0eXBlKSB7XHJcblx0XHRcdGNhc2UoJ21zZycpOlxyXG5cdFx0XHRcdHR4dCA9IGRhdGEudXNlcm5hbWUgKyAnIDogJyArIGRhdGEubWVzc2FnZTtcclxuXHRcdFx0XHRicmVhaztcclxuXHRcdFx0Y2FzZSgndXNlcicpOlxyXG5cdFx0XHRcdHR4dCA9IGRhdGEudXNlcm5hbWUgKyAnIGhhdCBkZW4gUmF1bSBiZXRyZXRlbic7XHJcblx0XHRcdFx0YnJlYWs7XHJcblx0XHR9XHJcblxyXG5cdFx0dmFyIHNwYW50aW1lc3RhbXAgPSAkKCc8c3Bhbj4nKS50ZXh0KCdbJyArIHRpbWVzdGFtcChkYXRhLnRpbWVzdGFtcCkgKyAnXScpO1xyXG5cdFx0dmFyIGxpID0gJCgnPGxpPicse1wiY2xhc3NcIjpcImNoYXRsaXN0X1wiICsgdHlwZX0pLmFwcGVuZChzcGFudGltZXN0YW1wLCB0eHQpO1xyXG5cclxuXHRcdGRvbS5jaGF0TGlzdC5hcHBlbmQobGkpO1xyXG5cdH1cclxuXHJcblx0ZnVuY3Rpb24gY2hlY2tVc2VyICgpIHtcclxuXHRcdHJldHVybiAodHlwZW9mIHNvY2tldERhdGEudXNlcm5hbWUgPT09ICdzdHJpbmcnICYmIHNvY2tldERhdGEudXNlcm5hbWUubGVuZ3RoKSA/IHRydWUgOiBmYWxzZTtcclxuXHR9XHJcblxyXG5cdGZ1bmN0aW9uIGNoZWNrTWVzc2FnZSAoKSB7XHJcblx0XHRzb2NrZXREYXRhLm1lc3NhZ2UgPSAkLnRyaW0oZG9tLmNoYXRJbnB1dC52YWwoKSk7XHJcblx0XHRyZXR1cm4gKHR5cGVvZiBzb2NrZXREYXRhLm1lc3NhZ2UgPT09ICdzdHJpbmcnICYmIHNvY2tldERhdGEubWVzc2FnZS5sZW5ndGgpID8gdHJ1ZSA6IGZhbHNlO1xyXG5cdH1cclxuXHJcblx0ZnVuY3Rpb24gc2VuZCAoKSB7XHJcblx0XHRzb2NrZXQuZW1pdCgnY2hhdCBtZXNzYWdlJywgc29ja2V0RGF0YSk7XHJcblx0fVxyXG5cclxuXHRmdW5jdGlvbiBzZXRVc2VyICgpIHtcclxuXHRcdHNvY2tldERhdGEudXNlcm5hbWUgPSAkLnRyaW0oZG9tLmNoYXRVc2VyLnZhbCgpKTtcclxuXHR9XHJcblxyXG5cdGZ1bmN0aW9uIHRpbWVzdGFtcCAoc29ja2V0dGltZSkge1xyXG5cclxuXHRcdHNvY2tldHRpbWUgPSAkLnRyaW0oc29ja2V0dGltZSk7XHJcblxyXG5cdFx0aWYoICEgc29ja2V0dGltZS5sZW5ndGgpIHtcclxuXHRcdFx0cmV0dXJuICcnO1xyXG5cdFx0fVxyXG5cclxuXHRcdHZhciB0aW1lID0gbmV3IERhdGUoc29ja2V0dGltZSk7XHJcblx0XHR2YXIgaCA9ICh0aW1lLmdldEhvdXJzKCkgPCAxMCkgPyAnMCcgKyB0aW1lLmdldEhvdXJzKCkgOiB0aW1lLmdldEhvdXJzKCk7XHJcblx0XHR2YXIgbSA9ICh0aW1lLmdldE1pbnV0ZXMoKSA8IDEwKSA/ICcwJyArIHRpbWUuZ2V0TWludXRlcygpIDogdGltZS5nZXRNaW51dGVzKCk7XHJcblxyXG5cdFx0cmV0dXJuIGggKyc6JyttO1xyXG5cdH1cclxuXHJcblx0ZnVuY3Rpb24gdG9nZ2xlQ2hhdExldmVsICgpIHtcclxuXHJcblx0XHR2YXIgc2hvd2x2bDAgPSAnYmxvY2snO1xyXG5cdFx0dmFyIHNob3dsdmwxID0gJ25vbmUnO1xyXG5cclxuXHRcdGlmKCAkKCcuY2hhdEx2bDAnLCBkb20uY2hhdFdyYXBwZXIpLmNzcygnZGlzcGxheScpICE9PSAnbm9uZScpIHtcclxuXHJcblx0XHRcdHNob3dsdmwwID0gJ25vbmUnO1xyXG5cdFx0XHRzaG93bHZsMSA9ICdibG9jayc7XHJcblx0XHR9XHJcblxyXG5cdFx0JCgnLmNoYXRMdmwwJywgZG9tLmNoYXRXcmFwcGVyKS5jc3MoJ2Rpc3BsYXknLCBzaG93bHZsMCk7XHJcblx0XHQkKCcuY2hhdEx2bDEnLCBkb20uY2hhdFdyYXBwZXIpLmNzcygnZGlzcGxheScsIHNob3dsdmwxKTtcclxuXHR9XHJcblxyXG5cdGZ1bmN0aW9uIHJlc2V0SW5wdXQgKCkge1xyXG5cdFx0ZG9tLmNoYXRJbnB1dC52YWwoJycpO1xyXG5cdH1cclxuXHJcblx0ZnVuY3Rpb24gZXZlbnRMaXN0ZW5lciAoKSB7XHJcblxyXG5cdFx0ZG9tLmJ0bkxvZ2luLm9uKCdjbGljaycsIGZ1bmN0aW9uICgpIHtcclxuXHJcblx0XHRcdHNldFVzZXIoKTtcclxuXHJcblx0XHRcdGlmICggY2hlY2tVc2VyKCkgKSB7XHJcblxyXG5cdFx0XHRcdHNvY2tldC5lbWl0KCdhZGQgdXNlcicsIHNvY2tldERhdGEudXNlcm5hbWUpO1xyXG5cclxuXHRcdFx0fSBlbHNlIHtcclxuXHRcdFx0XHRhbGVydCgna2VpbmVuIFVzZXJuYW1lbiBnZWZ1bmRlbicpXHJcblx0XHRcdH1cclxuXHRcdH0pO1xyXG5cclxuXHRcdGRvbS5jaGF0Rm9ybS5vbignc3VibWl0JywgZnVuY3Rpb24gKCkge1xyXG5cclxuXHRcdFx0aWYgKCBjaGVja01lc3NhZ2UoKSAmJiBjaGVja1VzZXIoKSApIHtcclxuXHRcdFx0XHRyZXNldElucHV0KCk7XHJcblx0XHRcdFx0c2VuZCgpO1xyXG5cdFx0XHR9IGVsc2Uge1xyXG5cdFx0XHRcdGFsZXJ0KCdrZWluZSBOYWNocmljaHQgZ2VmdW5kZW4nKVxyXG5cdFx0XHR9XHJcblxyXG5cdFx0XHRyZXR1cm4gZmFsc2U7XHJcblxyXG5cdFx0fSk7XHJcblx0fVxyXG5cclxuXHRmdW5jdGlvbiBzb2NrZXRMaXN0ZW5lciAoKSB7XHJcblxyXG5cdFx0c29ja2V0Lm9uKCdsb2dpbiBzdWNjZXNzJywgZnVuY3Rpb24gKCkge1xyXG5cdFx0XHR0b2dnbGVDaGF0TGV2ZWwoKTtcclxuXHRcdH0pO1xyXG5cclxuXHRcdHNvY2tldC5vbignbG9naW4gZXJyb3InLCBmdW5jdGlvbiAoKSB7XHJcblx0XHRcdGFsZXJ0KCdEZXIgQmVudXR6ZXJuYW1lIGlzdCB1bmfDvGx0aWcnKTtcclxuXHRcdH0pO1xyXG5cclxuXHRcdHNvY2tldC5vbignY2hhdCBtZXNzYWdlJywgZnVuY3Rpb24gKGRhdGEpIHtcclxuXHRcdFx0YWRkVG9DaGF0bGlzdChkYXRhLCAnbXNnJyk7XHJcblx0XHR9KTtcclxuXHJcblx0XHRzb2NrZXQub24oJ25ldyB1c2VyJywgZnVuY3Rpb24gKGRhdGEpIHtcclxuXHRcdFx0YWRkVG9DaGF0bGlzdChkYXRhLCAndXNlcicpO1xyXG5cdFx0fSk7XHJcblx0fVxyXG5cclxuXHR0aGlzLmluaXQgPSBmdW5jdGlvbiAoKSB7XHJcblxyXG5cdFx0aWYgKGlvKSB7XHJcblxyXG5cdFx0XHRzb2NrZXQgPSBpbygpO1xyXG5cclxuXHRcdFx0ZXZlbnRMaXN0ZW5lcigpO1xyXG5cdFx0XHRzb2NrZXRMaXN0ZW5lcigpO1xyXG5cdFx0fVxyXG5cdH07XHJcblxyXG5cdHJldHVybiB0aGlzO1xyXG59XHJcblxyXG5nbG9iYWwuYXBwID0gZ2xvYmFsLmFwcCB8fCB7fTtcclxuZ2xvYmFsLmFwcC5Tb2NrZXRJb0NoYXQgPSBuZXcgU29ja2V0SW9DaGF0KCk7IiwiXHJcbiQoZG9jdW1lbnQpLnJlYWR5IChmdW5jdGlvbiAoKSB7XHJcblx0Z2xvYmFsLmFwcC5Tb2NrZXRJb0NoYXQuaW5pdCgpO1xyXG59KTtcclxuIl19
