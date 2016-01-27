
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