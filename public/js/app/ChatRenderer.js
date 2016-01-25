
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
