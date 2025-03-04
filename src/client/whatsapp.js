/**
 * WhatsApp Web client configuration and event handlers
 */

const { Client } = require('whatsapp-web.js');
const qrcode = require('qrcode-terminal');
const { SESSION_CONFIG } = require('../utils/constants');
const fs = require('fs');

class WhatsAppClient {
    constructor(messageBox, screen) {
        this.messageBox = messageBox;
        this.screen = screen;
        this.client = null;
        this.chats = [];
        this.selectedChat = null;
    }

    /**
     * Initialize the WhatsApp client
     */
    initialize() {
        // Create session directory if it doesn't exist
        if (!fs.existsSync(SESSION_CONFIG.DIR)) {
            fs.mkdirSync(SESSION_CONFIG.DIR);
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
        this.client.initialize();
    }

    /**
     * Set up WhatsApp client event handlers
     */
    _setupEventHandlers() {
        this.client.on('qr', (qr) => this._handleQR(qr));
        this.client.on('authenticated', () => this._handleAuthenticated());
        this.client.on('auth_failure', (msg) => this._handleAuthFailure(msg));
        this.client.on('ready', () => this._handleReady());
        this.client.on('disconnected', (reason) => this._handleDisconnected(reason));
    }

    /**
     * Handle QR code generation
     * @param {string} qr - QR code data
     */
    _handleQR(qr) {
        this.messageBox.setContent('');
        this.screen.render();
        
        qrcode.generate(qr, { small: true }, (qrcode) => {
            this.messageBox.setContent(
                'Scan QR code with WhatsApp to connect\n\n' +
                qrcode +
                '\n\nOpen WhatsApp on your phone:\n' +
                '1. Go to Settings > Linked Devices\n' +
                '2. Tap on Link a Device\n' +
                '3. Point your camera at the QR code'
            );
            this.screen.render();
        });
    }

    /**
     * Handle successful authentication
     */
    _handleAuthenticated() {
        this.messageBox.setContent('Successfully authenticated! Loading chats...');
        this.screen.render();
    }

    /**
     * Handle authentication failure
     * @param {string} msg - Error message
     */
    _handleAuthFailure(msg) {
        this.messageBox.setContent('Authentication error: ' + msg);
        this.screen.render();
    }

    /**
     * Handle client ready state
     */
    async _handleReady() {
        try {
            this.messageBox.setContent('WhatsApp connected! Getting chat list...');
            this.screen.render();
            
            this.chats = await this.client.getChats({ limit: SESSION_CONFIG.CHAT_LIMIT });
            
            if (this.chats && this.chats.length > 0) {
                this.screen.emit('chats-loaded', this.chats);
                this.messageBox.setContent('WhatsApp connected! Select a chat from the list.');
            } else {
                this.messageBox.setContent('No chats found. This is unusual, there might be a connection issue.');
            }
            
            this.screen.render();
        } catch (error) {
            this.messageBox.setContent(`Error loading chats:\n${error.message}\n\nTry restarting the application.`);
            this.screen.render();
        }
    }

    /**
     * Handle client disconnection
     * @param {string} reason - Disconnection reason
     */
    _handleDisconnected(reason) {
        this.messageBox.setContent('Client disconnected: ' + reason);
        this.screen.emit('client-disconnected');
        this.screen.render();
    }

    /**
     * Get chat messages
     * @param {Object} chat - Chat object
     * @returns {Promise<Array>} Messages
     */
    async getChatMessages(chat) {
        try {
            const messages = await chat.fetchMessages({ limit: SESSION_CONFIG.MESSAGE_LIMIT });
            // Ordenar por timestamp, mensajes más antiguos primero
            return messages.sort((a, b) => a.timestamp - b.timestamp);
        } catch (error) {
            console.error('Error fetching messages:', error);
            return [];
        }
    }

    /**
     * Send a message to the current chat
     * @param {string} message - Message text
     */
    async sendMessage(message) {
        if (this.selectedChat && message.trim()) {
            await this.selectedChat.sendMessage(message);
            return await this.getChatMessages(this.selectedChat);
        }
        return null;
    }

    /**
     * Set the current selected chat
     * @param {Object} chat - Selected chat
     */
    setSelectedChat(chat) {
        this.selectedChat = chat;
    }

    /**
     * Get the currently selected chat
     * @returns {Object} Selected chat
     */
    getSelectedChat() {
        return this.selectedChat;
    }

    /**
     * Get the list of chats
     * @returns {Array} List of chats
     */
    getChats() {
        return this.chats;
    }

    /**
     * Clean up and destroy the client
     */
    async destroy() {
        if (this.client) {
            await this.client.destroy();
        }
    }
}

module.exports = WhatsAppClient; 