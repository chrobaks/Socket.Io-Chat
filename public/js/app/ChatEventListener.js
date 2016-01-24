
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