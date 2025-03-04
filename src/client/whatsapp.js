/**
 * WhatsApp Web client configuration and event handlers
 */

const { Client } = require('whatsapp-web.js');
const qrcode = require('qrcode-terminal');
const { SESSION_CONFIG } = require('../utils/constants');
const fs = require('fs');
const logger = require('../utils/logger');

class WhatsAppClient {
    constructor(messageBox, screen) {
        this.messageBox = messageBox;
        this.screen = screen;
        this.client = null;
        this.chats = [];
        this.selectedChat = null;
        logger.info('WhatsAppClient', 'WhatsApp client instance created');
    }

    /**
     * Initialize the WhatsApp client
     */
    initialize() {
        // Create session directory if it doesn't exist
        if (!fs.existsSync(SESSION_CONFIG.DIR)) {
            fs.mkdirSync(SESSION_CONFIG.DIR);
            logger.debug('WhatsAppClient', 'Created session directory', { path: SESSION_CONFIG.DIR });
        }

        // Initialize client with authentication
        this.client = new Client({
            puppeteer: {
                headless: true,
                args: ['--no-sandbox']
            },
            authStrategy: new (require('whatsapp-web.js')).LocalAuth({
                dataPath: SESSION_CONFIG.DIR
            })
        });

        this._setupEventHandlers();
        
        // Start the client
        logger.info('WhatsAppClient', 'Starting WhatsApp client');
        this.client.initialize();
    }

    /**
     * Set up event handlers for the WhatsApp client
     * @private
     */
    _setupEventHandlers() {
        this.client.on('qr', (qr) => this._handleQR(qr));
        this.client.on('authenticated', () => this._handleAuthenticated());
        this.client.on('auth_failure', (msg) => this._handleAuthFailure(msg));
        this.client.on('ready', () => this._handleReady());
        this.client.on('disconnected', (reason) => this._handleDisconnected(reason));
        
        logger.debug('WhatsAppClient', 'Event handlers set up');
    }

    /**
     * Handle QR code generation
     * @param {string} qr - QR code data
     * @private
     */
    _handleQR(qr) {
        // Display QR code in terminal
        qrcode.generate(qr, { small: true });
        
        // Update UI
        this.messageBox.setContent('{center}Scan the QR code to log in to WhatsApp{/center}\n\n');
        this.messageBox.setContent('{center}If the QR code is not visible, check your terminal{/center}');
        this.screen.render();
        
        logger.info('WhatsAppClient', 'QR code generated for authentication');
    }

    /**
     * Handle successful authentication
     * @private
     */
    _handleAuthenticated() {
        this.messageBox.setContent('{center}Authenticated successfully!{/center}');
        this.screen.render();
        
        logger.info('WhatsAppClient', 'Authentication successful');
    }

    /**
     * Handle authentication failure
     * @param {string} msg - Error message
     * @private
     */
    _handleAuthFailure(msg) {
        this.messageBox.setContent(`{center}Authentication failed: ${msg}{/center}`);
        this.screen.render();
        
        logger.error('WhatsAppClient', 'Authentication failed', { message: msg });
    }

    /**
     * Handle client ready state
     * @private
     */
    async _handleReady() {
        this.messageBox.setContent('{center}WhatsApp client is ready!{/center}');
        this.screen.render();
        
        try {
            // Load chats
            this.chats = await this.client.getChats();
            
            // Update UI with chat list
            if (this.chats.length > 0) {
                this.messageBox.setContent('{center}Select a chat to start messaging{/center}');
                this.screen.render();
                
                // Emit event to notify chat handler that chats are loaded
                this.screen.emit('chats-loaded', this.chats);
                logger.info('WhatsAppClient', 'Emitted chats-loaded event', { chatCount: this.chats.length });
            } else {
                this.messageBox.setContent('{center}No chats available{/center}');
                this.screen.render();
            }
            
            logger.info('WhatsAppClient', 'Client ready, chats loaded', { chatCount: this.chats.length });
        } catch (error) {
            this.messageBox.setContent(`{center}Error loading chats: ${error.message}{/center}`);
            this.screen.render();
            
            logger.error('WhatsAppClient', 'Error loading chats', error);
        }
    }

    /**
     * Handle client disconnection
     * @param {string} reason - Disconnection reason
     * @private
     */
    _handleDisconnected(reason) {
        this.messageBox.setContent(`{center}Disconnected: ${reason}{/center}`);
        this.screen.render();
        
        logger.warn('WhatsAppClient', 'Client disconnected', { reason });
        
        // Clean up
        this.chats = [];
        this.selectedChat = null;
    }

    /**
     * Get messages for a specific chat
     * @param {Object} chat - Chat object
     * @returns {Promise<Array>} Array of messages
     */
    async getChatMessages(chat) {
        try {
            logger.debug('WhatsAppClient', 'Fetching messages for chat', { 
                chatId: chat.id.user,
                chatName: chat.name
            });
            
            // Fetch the most recent messages
            const messages = await chat.fetchMessages({ limit: 20 });
            
            // Log detailed information about the messages
            logger.debug('WhatsAppClient', 'Messages fetched successfully', { 
                messageCount: messages.length,
                firstMessageId: messages.length > 0 ? messages[0].id.id : 'none',
                lastMessageId: messages.length > 0 ? messages[messages.length - 1].id.id : 'none'
            });
            
            if (messages.length === 0) {
                logger.warn('WhatsAppClient', 'No messages found for chat', {
                    chatId: chat.id.user,
                    chatName: chat.name
                });
            }
            
            // Sort messages by timestamp (newest first)
            const sortedMessages = messages.sort((a, b) => b.timestamp - a.timestamp);
            
            // Then reverse to display in chronological order (oldest first)
            const chronologicalMessages = sortedMessages.slice(0, 20).reverse();
            
            logger.debug('WhatsAppClient', 'Messages sorted and ready to display', {
                messageCount: chronologicalMessages.length,
                oldestTimestamp: chronologicalMessages.length > 0 ? new Date(chronologicalMessages[0].timestamp * 1000).toISOString() : 'none',
                newestTimestamp: chronologicalMessages.length > 0 ? new Date(chronologicalMessages[chronologicalMessages.length - 1].timestamp * 1000).toISOString() : 'none'
            });
            
            return chronologicalMessages;
        } catch (error) {
            logger.error('WhatsAppClient', 'Error fetching messages', error);
            throw error;
        }
    }

    /**
     * Send a message to the selected chat
     * @param {string} message - Message content
     * @returns {Promise<Object>} Sent message
     */
    async sendMessage(message) {
        if (!this.selectedChat) {
            logger.warn('WhatsAppClient', 'Attempted to send message with no chat selected');
            throw new Error('No chat selected');
        }
        
        try {
            logger.info('WhatsAppClient', 'Sending message', { 
                chatId: this.selectedChat.id.user,
                messageLength: message.length
            });
            
            return await this.client.sendMessage(this.selectedChat.id._serialized, message);
        } catch (error) {
            logger.error('WhatsAppClient', 'Error sending message', error);
            throw error;
        }
    }

    /**
     * Set the selected chat
     * @param {Object} chat - Chat object
     */
    setSelectedChat(chat) {
        this.selectedChat = chat;
        logger.info('WhatsAppClient', 'Selected chat changed', { 
            chatId: chat.id.user,
            chatName: chat.name
        });
    }

    /**
     * Get the currently selected chat
     * @returns {Object|null} Selected chat or null
     */
    getSelectedChat() {
        return this.selectedChat;
    }

    /**
     * Get all available chats
     * @returns {Array} Array of chats
     */
    getChats() {
        return this.chats;
    }

    /**
     * Destroy the client and clean up
     */
    async destroy() {
        try {
            if (this.client) {
                logger.info('WhatsAppClient', 'Destroying WhatsApp client');
                await this.client.destroy();
                this.client = null;
            }
        } catch (error) {
            logger.error('WhatsAppClient', 'Error destroying client', error);
        }
    }
}

module.exports = WhatsAppClient; 