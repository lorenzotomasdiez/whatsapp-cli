/**
 * Chat list and selection handler for the WhatsApp Terminal Client
 */

class ChatHandler {
    constructor(chatList, messageBox, screen, whatsappClient) {
        this.chatList = chatList;
        this.messageBox = messageBox;
        this.screen = screen;
        this.whatsappClient = whatsappClient;
        this.selectedChat = null;
    }

    /**
     * Initialize chat handler
     */
    initialize() {
        this._setupEventHandlers();
    }

    /**
     * Set up event handlers for chat-related actions
     */
    _setupEventHandlers() {
        this.screen.on('chats-loaded', (chats) => this._handleChatsLoaded(chats));
        this.chatList.on('select-chat', (index) => this._handleChatSelection(index));
        this.screen.on('refresh-chat', () => this._refreshCurrentChat());
        this.screen.on('client-disconnected', () => this._handleDisconnection());
        this.chatList.on('clear-selection', () => this.clearSelection());
    }

    /**
     * Handle loaded chats
     * @param {Array} chats - List of chats
     */
    _handleChatsLoaded(chats) {
        const chatNames = chats.map(chat => {
            try {
                const name = chat.name || chat.id._serialized;
                return `${name} ${chat.isGroup ? '(Group)' : ''}`;
            } catch (e) {
                return 'Unnamed chat';
            }
        });
        
        this.chatList.setItems(chatNames);
        this.screen.render();
    }

    /**
     * Handle chat selection
     * @param {number} index - Selected chat index
     */
    async _handleChatSelection(index) {
        const chats = this.whatsappClient.getChats();
        if (chats && chats[index]) {
            // Limpiar el contenido actual antes de cargar el nuevo chat
            this.messageBox.setContent('');
            this.screen.render();

            const selectedChat = chats[index];
            // Si es el mismo chat, solo refrescamos los mensajes
            const isSameChat = this.selectedChat && this.selectedChat.id._serialized === selectedChat.id._serialized;
            
            this.selectedChat = selectedChat;
            this.whatsappClient.setSelectedChat(this.selectedChat);
            this.messageBox.setLabel(` Messages: ${this.selectedChat.name || this.selectedChat.id._serialized} `);
            
            // Mostrar mensaje de carga
            this.messageBox.setContent('Loading messages...');
            this.screen.render();

            // Emitir evento para cargar mensajes
            this.screen.emit('select-chat');

            // Si es un chat diferente, aseguramos que la animación esté detenida
            if (!isSameChat) {
                this.screen.emit('stop-matrix');
            }
        }
    }

    /**
     * Refresh current chat messages
     */
    async _refreshCurrentChat() {
        if (this.selectedChat) {
            this.messageBox.setContent('Updating messages...');
            this.screen.render();
            
            const messages = await this.whatsappClient.getChatMessages(this.selectedChat);
            this.screen.emit('messages-updated', messages);
        }
    }

    /**
     * Handle client disconnection
     */
    _handleDisconnection() {
        this.selectedChat = null;
        this.chatList.setItems([]);
        this.screen.emit('start-matrix');
        this.screen.render();
    }

    /**
     * Get the currently selected chat
     * @returns {Object} Selected chat
     */
    getSelectedChat() {
        return this.selectedChat;
    }

    /**
     * Clear current chat selection
     */
    clearSelection() {
        if (this.selectedChat) {
            this.selectedChat = null;
            this.whatsappClient.setSelectedChat(null);
            this.messageBox.setLabel(' Messages ');
            this.messageBox.setContent('');
            this.screen.render();
        }
    }
}

module.exports = ChatHandler; 