/**
 * Chat list and selection handler for the WhatsApp Terminal Client
 */

const logger = require('../utils/logger');

class ChatHandler {
    constructor(chatList, messageBox, screen, whatsappClient) {
        this.chatList = chatList;
        this.messageBox = messageBox;
        this.screen = screen;
        this.whatsappClient = whatsappClient;
        this.selectedChat = null;
        this.isManualSelection = false; // Bandera para controlar si la selección es manual
        logger.info('ChatHandler', 'Chat handler initialized');
    }

    /**
     * Initialize chat handler
     */
    initialize() {
        // Remover listeners existentes para evitar duplicados
        this.screen.removeAllListeners('chats-loaded');
        this.chatList.removeAllListeners('select-chat');
        this.screen.removeAllListeners('refresh-chat');
        this.screen.removeAllListeners('client-disconnected');
        this.chatList.removeAllListeners('clear-selection');
        
        // Configurar nuevos listeners
        this._setupEventHandlers();
        
        logger.debug('ChatHandler', 'Event handlers initialized');
    }

    /**
     * Set up event handlers for chat-related actions
     */
    _setupEventHandlers() {
        this.screen.on('chats-loaded', (chats) => this._handleChatsLoaded(chats));
        this.chatList.on('select-chat', (index) => {
            this.isManualSelection = true; // Marcar como selección manual
            this._handleChatSelection(index);
        });
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
        
        // Desactivar temporalmente la selección para evitar autoselección
        this.chatList.removeAllListeners('select');
        
        // Establecer los elementos de la lista
        this.chatList.setItems(chatNames);
        
        // Restaurar el listener de selección después de establecer los elementos
        this.chatList.on('select', () => {
            // No hacer nada aquí, la selección se maneja en el evento 'select-chat'
        });
        
        logger.info('ChatHandler', 'Chats loaded in list', { count: chatNames.length });
        this.screen.render();
    }

    /**
     * Handle chat selection
     * @param {number} index - Selected chat index
     */
    async _handleChatSelection(index) {
        const chats = this.whatsappClient.getChats();
        if (chats && chats[index]) {
            logger.info('ChatHandler', 'Chat selected', { 
                index, 
                isManualSelection: this.isManualSelection 
            });
            
            // Si no es una selección manual, ignorar para evitar autoselección
            if (!this.isManualSelection) {
                logger.debug('ChatHandler', 'Ignoring automatic chat selection', { index });
                return;
            }
            
            // Resetear la bandera de selección manual para la próxima vez
            this.isManualSelection = false;
            
            // Limpiar el contenido actual antes de cargar el nuevo chat
            this.messageBox.setContent('');
            this.screen.render();

            const selectedChat = chats[index];
            // Si es el mismo chat, solo refrescamos los mensajes
            const isSameChat = this.selectedChat && this.selectedChat.id._serialized === selectedChat.id._serialized;
            
            logger.debug('ChatHandler', 'Selected chat details', {
                chatId: selectedChat.id.user,
                chatName: selectedChat.name,
                isSameChat
            });
            
            this.selectedChat = selectedChat;
            this.whatsappClient.setSelectedChat(this.selectedChat);
            
            // Actualizar el título del panel de mensajes con el nombre del chat
            const chatName = this.selectedChat.name || this.selectedChat.id._serialized;
            const chatInfo = this.selectedChat.isGroup ? `${chatName} (Group)` : chatName;
            this.messageBox.setLabel(` Messages: ${chatInfo} `);
            
            // Mostrar mensaje de carga
            this.messageBox.setContent('{center}Loading messages...{/center}');
            this.screen.render();

            // Emitir evento para cargar mensajes
            logger.debug('ChatHandler', 'Emitting select-chat event');
            this.screen.emit('select-chat');

            // Si es un chat diferente, aseguramos que la animación esté detenida
            if (!isSameChat) {
                this.screen.emit('stop-matrix');
            }
            
            // Dar foco a la lista de chats para mejor UX
            this.chatList.focus();
        } else {
            logger.warn('ChatHandler', 'Invalid chat selection', { 
                index, 
                availableChats: chats ? chats.length : 0 
            });
        }
    }

    /**
     * Refresh current chat messages
     */
    async _refreshCurrentChat() {
        if (this.selectedChat) {
            this.messageBox.setContent('Updating messages...');
            this.screen.render();
            
            // Usar una bandera temporal para indicar que es una actualización, no una selección manual
            const wasManualSelection = this.isManualSelection;
            this.isManualSelection = false;
            
            // Emitir evento para actualizar mensajes
            this.screen.emit('messages-updated', await this.whatsappClient.getChatMessages(this.selectedChat));
            
            // Restaurar el estado de selección manual
            this.isManualSelection = wasManualSelection;
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