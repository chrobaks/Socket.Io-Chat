
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

	function timestamp (time) {

		time = $.trim(time);

		if( ! time.length) {
			return '';
		}

		time = new Date(time);

		var h = (time.getHours() < 10) ? '0' + time.getHours() : time.getHours();
		var m = (time.getMinutes() < 10) ? '0' + time.getMinutes() : time.getMinutes();

		return h +':'+m;
	}

	this.toggleChatLevel = function () {

		var showlvl0 = (config.dom.chatLvl0.css('display') !== 'none') ? 'none' : 'block';
		var showlvl1 = (showlvl0 === 'block' ) ? 'none' : 'block';

		config.dom.chatLvl0.css('display', showlvl0);
		config.dom.chatLvl1.css('display', showlvl1);

	};

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
