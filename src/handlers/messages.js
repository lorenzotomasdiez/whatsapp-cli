/**
 * Message handling and display for the WhatsApp Terminal Client
 */

class MessageHandler {
    constructor(messageBox, inputBox, screen, whatsappClient) {
        this.messageBox = messageBox;
        this.inputBox = inputBox;
        this.screen = screen;
        this.whatsappClient = whatsappClient;
    }

    /**
     * Initialize message handler
     */
    initialize() {
        this._setupEventHandlers();
    }

    /**
     * Set up event handlers for message-related actions
     */
    _setupEventHandlers() {
        this.inputBox.on('send-message', async (message) => this._handleSendMessage(message));
        this.screen.on('messages-updated', (messages) => this._displayMessages(messages));
        this.screen.on('select-chat', () => this._refreshMessages());
    }

    /**
     * Display messages in the message box
     * @param {Array} messages - List of messages to display
     */
    _displayMessages(messages) {
        if (!messages || messages.length === 0) {
            this.messageBox.setContent('No messages in this chat yet.');
            this.screen.render();
            return;
        }

        let content = '';
        messages.forEach(msg => {
            const time = new Date(msg.timestamp * 1000).toLocaleTimeString();
            const sender = msg.fromMe ? 'YOU' : 'THEM';
            const border = msg.fromMe ? '{green-fg}►{/}' : '{yellow-fg}◄{/}';
            
            content += `${border} {white-fg}[${time}]{/} {bold}${sender}{/}\n`;
            content += `${msg.fromMe ? '{green-fg}' : '{yellow-fg}'}${msg.body}{/}\n\n`;
        });
        
        // Add cyberpunk-style frame
        const header = '{green-fg}╔' + '═'.repeat(this.messageBox.width - 2) + '╗{/}\n';
        const footer = '{green-fg}╚' + '═'.repeat(this.messageBox.width - 2) + '╝{/}';
        
        this.messageBox.setContent(header + content + footer);
        this.screen.render();
    }

    /**
     * Handle sending a new message
     * @param {string} message - Message text to send
     */
    async _handleSendMessage(message) {
        try {
            await this.whatsappClient.sendMessage(message);
            // Refrescar mensajes después de enviar
            await this._refreshMessages();
        } catch (error) {
            this.messageBox.setContent(`Error sending message: ${error.message}`);
            this.screen.render();
        }
    }

    /**
     * Refresh current chat messages
     */
    async _refreshMessages() {
        try {
            const selectedChat = this.whatsappClient.getSelectedChat();
            if (selectedChat) {
                this.messageBox.setContent('Updating messages...');
                this.screen.render();
                const messages = await this.whatsappClient.getChatMessages(selectedChat);
                this._displayMessages(messages);
            }
        } catch (error) {
            this.messageBox.setContent(`Error refreshing messages: ${error.message}`);
            this.screen.render();
        }
    }

    /**
     * Clear the message display
     */
    clearMessages() {
        this.messageBox.setContent('');
        this.screen.render();
    }
}

module.exports = MessageHandler; 