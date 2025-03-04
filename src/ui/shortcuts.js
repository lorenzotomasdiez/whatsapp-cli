/**
 * Vim-style keyboard shortcuts handler for the WhatsApp Terminal Client
 */

const { KEY_BINDINGS } = require('../utils/constants');

class ShortcutHandler {
    constructor(screen, chatList, inputBox, messageBox, statusBar, client) {
        this.screen = screen;
        this.chatList = chatList;
        this.inputBox = inputBox;
        this.messageBox = messageBox;
        this.statusBar = statusBar;
        this.client = client;
        this.mode = 'NORMAL'; // NORMAL, INSERT, CHAT
        this._updateStatusBar();
    }

    /**
     * Update the status bar with current mode and help text
     * @param {string} helpText - Optional help text to display
     */
    _updateStatusBar(helpText = '') {
        const modeText = ` ${this.mode} `;
        const separator = helpText ? ' │ ' : '';
        this.statusBar.setContent(`{black-bg}{white-fg}${modeText}{/}{green-bg}{white-fg}${separator}${helpText}{/}`);
        this.screen.render();
    }

    /**
     * Initialize all keyboard shortcuts
     */
    setupShortcuts() {
        this._setupGlobalShortcuts();
        this._setupNormalModeShortcuts();
        this._setupInputModeShortcuts();
        this._setupChatModeShortcuts();
    }

    /**
     * Set up global shortcuts that work in all modes
     */
    _setupGlobalShortcuts() {
        // Quit application
        this.screen.key(KEY_BINDINGS.QUIT, async () => {
            this.messageBox.setContent('Closing application...');
            this.screen.render();
            await this.client.destroy();
            process.exit(0);
        });

        // Refresh messages
        this.screen.key(KEY_BINDINGS.REFRESH, async () => {
            if (this.mode === 'CHAT') {
                await this._refreshCurrentChat();
            }
        });
    }

    /**
     * Set up shortcuts for normal (navigation) mode
     */
    _setupNormalModeShortcuts() {
        // Focus chat list (h - left movement in Vim)
        this.screen.key(KEY_BINDINGS.FOCUS_CHAT_LIST, () => {
            if (this.mode === 'NORMAL') {
                this._focusChatList();
            }
        });

        // Enter insert mode (i)
        this.screen.key(KEY_BINDINGS.FOCUS_INPUT, () => {
            if (this.mode === 'NORMAL' || this.mode === 'CHAT') {
                this._enterInsertMode();
            }
        });

        // Navigation in chat list
        this.chatList.key(KEY_BINDINGS.NAV_DOWN, () => {
            if (this.mode === 'NORMAL' || this.mode === 'CHAT') {
                this.chatList.down();
                this.screen.render();
            }
        });

        this.chatList.key(KEY_BINDINGS.NAV_UP, () => {
            if (this.mode === 'NORMAL' || this.mode === 'CHAT') {
                this.chatList.up();
                this.screen.render();
            }
        });

        // Select chat (enter)
        this.chatList.key(KEY_BINDINGS.SELECT, () => {
            if (this.mode === 'NORMAL' || this.mode === 'CHAT') {
                const selectedIndex = this.chatList.selected;
                this._selectChat(selectedIndex);
                this.mode = 'CHAT';
                this._updateStatusBar('j/k: navigate │ i: write │ r: refresh │ Esc: back');
            }
        });

        // Clear chat selection (Esc in chat mode)
        this.screen.key(KEY_BINDINGS.CLEAR_CHAT, () => {
            if (this.mode === 'CHAT') {
                this.mode = 'NORMAL';
                this.screen.emit('start-matrix');
                this.chatList.emit('clear-selection');
                this._updateStatusBar('j/k: navigate │ Enter: select chat');
            }
        });
    }

    /**
     * Set up shortcuts for insert (input) mode
     */
    _setupInputModeShortcuts() {
        // Return to previous mode
        this.inputBox.key(KEY_BINDINGS.RETURN_TO_NORMAL, () => {
            if (this.mode === 'INSERT') {
                this._exitInsertMode();
            }
        });

        // Send message
        this.inputBox.key(KEY_BINDINGS.SEND, async () => {
            if (this.mode === 'INSERT') {
                await this._sendMessage();
                // Mantener el foco en el input box para seguir escribiendo
                this.inputBox.focus();
                this.inputBox.clearValue();
                this.screen.render();
            }
        });
    }

    /**
     * Set up shortcuts for chat mode
     */
    _setupChatModeShortcuts() {
        // Additional chat-specific shortcuts can be added here
    }

    /**
     * Focus the chat list and update mode
     */
    _focusChatList() {
        this.chatList.focus();
        this._updateStatusBar('j/k: navigate │ Enter: select chat');
    }

    /**
     * Enter insert mode for message input
     */
    _enterInsertMode() {
        this.mode = 'INSERT';
        this.inputBox.focus();
        this._updateStatusBar('Esc: back │ Enter: send message');
    }

    /**
     * Exit insert mode and return to previous mode
     */
    _exitInsertMode() {
        this.mode = this.chatList.selected !== null ? 'CHAT' : 'NORMAL';
        this._focusChatList();
        if (this.mode === 'CHAT') {
            this._updateStatusBar('j/k: navigate │ i: write │ r: refresh │ Esc: back');
        } else {
            this._updateStatusBar('j/k: navigate │ Enter: select chat');
        }
    }

    /**
     * Select a chat from the list
     * @param {number} index - Selected chat index
     */
    async _selectChat(index) {
        // Detener la animación antes de cambiar de chat
        this.screen.emit('stop-matrix');
        // Limpiar el contenido actual
        this.messageBox.setContent('Loading messages...');
        this.screen.render();
        // Emitir el evento de selección
        this.chatList.emit('select-chat', index);
    }

    /**
     * Send a message in the current chat
     */
    async _sendMessage() {
        const message = this.inputBox.getValue();
        if (message.trim()) {
            this.inputBox.emit('send-message', message);
        }
    }

    /**
     * Refresh the current chat messages
     */
    async _refreshCurrentChat() {
        this.screen.emit('refresh-chat');
    }
}

module.exports = ShortcutHandler; 