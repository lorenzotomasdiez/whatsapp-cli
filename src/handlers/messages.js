/**
 * Message handling and display for the WhatsApp Terminal Client
 */

const AIHandler = require('./ai');
const logger = require('../utils/logger');

class MessageHandler {
    constructor(messageBox, inputBox, screen, whatsappClient) {
        this.messageBox = messageBox;
        this.inputBox = inputBox;
        this.screen = screen;
        this.whatsappClient = whatsappClient;
        this.aiHandler = new AIHandler();
        this.currentMessages = []; // Store current messages
        this.lastInteractionId = null; // Store the last interaction ID
        logger.info('MessageHandler', 'Message handler initialized');
    }

    /**
     * Initialize message handler
     */
    initialize() {
        logger.debug('MessageHandler', 'Initializing message handler');
        
        // Remover listeners existentes para evitar duplicados
        this.inputBox.removeAllListeners('send-message');
        this.screen.removeAllListeners('messages-updated');
        this.screen.removeAllListeners('select-chat');
        
        // Configurar nuevos listeners
        this._setupEventHandlers();
        
        logger.debug('MessageHandler', 'Event handlers initialized');
    }

    /**
     * Set up event handlers for message-related actions
     */
    _setupEventHandlers() {
        logger.debug('MessageHandler', 'Setting up event handlers');
        
        // Manejar el envío de mensajes
        this.inputBox.on('send-message', async (message) => {
            logger.debug('MessageHandler', 'send-message event received', { messageLength: message.length });
            await this._handleSendMessage(message);
        });
        
        // Manejar la actualización de mensajes
        this.screen.on('messages-updated', (messages) => {
            logger.debug('MessageHandler', 'messages-updated event received', { messageCount: messages ? messages.length : 0 });
            this._displayMessages(messages);
        });
        
        // Manejar la selección de chat
        this.screen.on('select-chat', () => {
            logger.debug('MessageHandler', 'select-chat event received');
            this._refreshMessages();
        });
        
        // Manejar feedback de IA
        this.screen.on('ai-feedback-positive', (feedback) => {
            logger.debug('MessageHandler', 'ai-feedback-positive event received');
            this._handleAIFeedback(true, feedback);
        });
        
        this.screen.on('ai-feedback-negative', (feedback) => {
            logger.debug('MessageHandler', 'ai-feedback-negative event received');
            this._handleAIFeedback(false, feedback);
        });
        
        // Manejar visualización de métricas de IA
        this.screen.on('show-ai-metrics', () => {
            logger.debug('MessageHandler', 'show-ai-metrics event received');
            this._showAIMetrics();
        });
        
        logger.debug('MessageHandler', 'Event handlers setup completed');
    }

    /**
     * Display messages in the message box
     * @param {Array} messages - List of messages to display
     */
    _displayMessages(messages) {
        logger.debug('MessageHandler', 'Displaying messages', { 
            messageCount: messages ? messages.length : 0 
        });
        
        if (!messages || messages.length === 0) {
            logger.warn('MessageHandler', 'No messages to display');
            this.messageBox.setContent('No messages in this chat yet.');
            this.screen.render();
            this.currentMessages = [];
            return;
        }

        this.currentMessages = messages; // Store current messages
        
        // Get the selected chat to access contact name
        const selectedChat = this.whatsappClient.getSelectedChat();
        const contactName = selectedChat ? (selectedChat.name || selectedChat.pushname || 'CONTACT') : 'CONTACT';
        
        // Create a header with information about the messages
        const oldestDate = new Date(messages[0].timestamp * 1000).toLocaleDateString();
        const newestDate = new Date(messages[messages.length - 1].timestamp * 1000).toLocaleDateString();
        const dateInfo = oldestDate === newestDate 
            ? `Messages from ${oldestDate}` 
            : `Messages from ${oldestDate} to ${newestDate}`;
        
        // Calculate available width for messages
        const availableWidth = this.messageBox.width - 4; // Account for borders
        
        // Create header with cyberpunk style
        let content = `{center}{bold}{green-fg}${dateInfo}{/green-fg}{/bold}{/center}\n`;
        content += `{center}{italic}{white-fg}Showing ${messages.length} recent messages with ${contactName}{/white-fg}{/italic}{/center}\n\n`;
        
        let currentDate = '';
        
        messages.forEach((msg, index) => {
            try {
                const time = new Date(msg.timestamp * 1000).toLocaleTimeString();
                const date = new Date(msg.timestamp * 1000).toLocaleDateString();
                const sender = msg.fromMe ? 'YOU' : contactName;
                
                // Add date separator if this is a new day
                if (date !== currentDate) {
                    currentDate = date;
                    content += `{center}{white-bg}{black-fg} ${date} {/black-fg}{/white-bg}{/center}\n\n`;
                }
                
                // Calculate message width (limit to 70% of available width)
                const maxMsgWidth = Math.floor(availableWidth * 0.7);
                let msgBody = msg.body;
                
                // Format message body with word wrapping
                const formattedBody = [];
                let currentLine = '';
                const words = msgBody.split(' ');
                
                for (const word of words) {
                    if ((currentLine + word).length > maxMsgWidth) {
                        formattedBody.push(currentLine);
                        currentLine = word + ' ';
                    } else {
                        currentLine += word + ' ';
                    }
                }
                
                if (currentLine) {
                    formattedBody.push(currentLine);
                }
                
                // Create message bubble with appropriate alignment and styling
                if (msg.fromMe) {
                    // Right-aligned message (from you)
                    content += `{right}{bold}{green-fg}${sender}{/green-fg} {white-fg}[${time}]{/white-fg}{/bold}{/right}\n`;
                    
                    // Message bubble
                    formattedBody.forEach(line => {
                        content += `{right}{green-bg}{black-fg} ${line.trim()} {/black-fg}{/green-bg}{/right}\n`;
                    });
                } else {
                    // Left-aligned message (from them)
                    content += `{bold}{yellow-fg}${sender}{/yellow-fg} {white-fg}[${time}]{/white-fg}{/bold}\n`;
                    
                    // Message bubble
                    formattedBody.forEach(line => {
                        content += `{yellow-bg}{black-fg} ${line.trim()} {/black-fg}{/yellow-bg}\n`;
                    });
                }
                
                // Add spacing between messages
                content += '\n';
                
                // Log first and last message for debugging
                if (index === 0 || index === messages.length - 1) {
                    logger.debug('MessageHandler', `Message ${index === 0 ? 'first' : 'last'}`, {
                        id: msg.id.id,
                        timestamp: msg.timestamp,
                        date: date,
                        time: time,
                        fromMe: msg.fromMe,
                        bodyLength: msg.body.length
                    });
                }
            } catch (error) {
                logger.error('MessageHandler', `Error formatting message at index ${index}`, error);
                content += `{red-fg}[Error displaying message: ${error.message}]{/}\n\n`;
            }
        });
        
        // Add cyberpunk-style frame
        const header = '{green-fg}╔' + '═'.repeat(this.messageBox.width - 2) + '╗{/}\n';
        const footer = '{green-fg}╚' + '═'.repeat(this.messageBox.width - 2) + '╝{/}';
        
        try {
            this.messageBox.setContent(header + content + footer);
            
            // Scroll to the bottom to see the most recent messages
            this.messageBox.setScrollPerc(100);
            
            this.screen.render();
            logger.info('MessageHandler', 'Messages displayed successfully', { 
                messageCount: messages.length 
            });
        } catch (error) {
            logger.error('MessageHandler', 'Error setting message box content', error);
            this.messageBox.setContent('Error displaying messages: ' + error.message);
            this.screen.render();
        }
    }

    /**
     * Handle sending a new message
     * @param {string} message - Message text to send
     */
    async _handleSendMessage(message) {
        try {
            logger.debug('MessageHandler', 'Handling send message', { 
                messageLength: message.length,
                isPromptCommand: message.startsWith('/p')
            });
            
            if (message.startsWith('/p')) {
                logger.info('MessageHandler', 'Processing AI prompt command', { command: message });
                
                // Procesar el comando de prompt directamente
                await this._handlePromptCommand(message);
                
                // Mantener el foco en el inputBox
                this.inputBox.focus();
                
                logger.debug('MessageHandler', 'AI prompt command processed successfully');
            } else {
                logger.debug('MessageHandler', 'Sending regular message');
                await this.whatsappClient.sendMessage(message);
                logger.info('MessageHandler', 'Message sent successfully');
                
                // Refresh messages after sending
                logger.debug('MessageHandler', 'Scheduling message refresh after send');
                setTimeout(() => {
                    this._refreshMessages();
                }, 1000);
            }
        } catch (error) {
            logger.error('MessageHandler', 'Error sending message', error);
            this.messageBox.setContent(`Error sending message: ${error.message}`);
            this.screen.render();
            // Mantener el foco en el inputBox incluso en caso de error
            this.inputBox.focus();
        }
    }

    /**
     * Handle AI prompt command
     * @param {string} command - The command string
     * @returns {Promise<string>} The AI response
     * @private
     */
    async _handlePromptCommand(command) {
        logger.debug('MessageHandler', 'Handling prompt command', { command });
        
        try {
            // Parse the command
            const options = this.aiHandler.parseCommand(command);
            
            // Get the selected chat for context
            const selectedChat = this.whatsappClient.getSelectedChat();
            if (!selectedChat) {
                logger.warn('MessageHandler', 'No chat selected for AI command');
                return 'Error: No chat selected. Please select a chat first.';
            }
            
            // Get recent messages for context if needed
            let context = '';
            if (options.promptSlug) {
                // Get the last 10 messages for context
                const messages = this.currentMessages.slice(-10);
                if (messages && messages.length > 0) {
                    // Filter out system messages and clean the context
                    const filteredMessages = messages.filter(msg => {
                        // Skip messages that look like system messages or commands
                        const isSystemMessage = msg.body.startsWith('/') || 
                                               msg.body.startsWith(':') ||
                                               msg.body.includes('I cannot continue the chat history');
                        return !isSystemMessage;
                    });
                    
                    // Format the filtered messages
                    context = filteredMessages.map(msg => {
                        const sender = msg.fromMe ? 'YOU' : (selectedChat.name || 'CONTACT');
                        const time = new Date(msg.timestamp * 1000).toLocaleTimeString();
                        return `${sender} [${time}]\n ${msg.body}`;
                    }).join('\n\n');
                    
                    logger.debug('MessageHandler', 'Prepared context for AI', { 
                        originalCount: messages.length,
                        filteredCount: filteredMessages.length,
                        contextLength: context.length
                    });
                }
            }
            
            // Add chat information to options
            options.chatId = selectedChat.id._serialized;
            options.contactName = selectedChat.name || selectedChat.pushname || 'Unknown';
            options.context = context;
            
            // Show processing indicator
            this.messageBox.setContent('{center}{bold}{yellow-fg}Processing AI request...{/yellow-fg}{/bold}{/center}');
            this.screen.render();
            
            // Process the message with AI
            const response = await this.aiHandler.processMessage(options);
            
            // Clean up any potential XML tags or command characters from the response
            const cleanResponse = this.aiHandler.cleanResponse(response);
            
            // Attempt to send the message
            let messageSent = false;
            let messageId = null;
            
            try {
                // Send the message
                const sentMessage = await this.whatsappClient.sendMessage(cleanResponse);
                messageSent = true;
                messageId = sentMessage ? sentMessage.id._serialized : null;
                
                logger.info('MessageHandler', 'AI message sent successfully', { 
                    responseLength: cleanResponse.length,
                    messageId
                });
                
                // Update the last interaction with sent status
                if (this.lastInteractionId) {
                    this.aiHandler.updateInteractionStatus({
                        interactionId: this.lastInteractionId,
                        messageSent: true,
                        messageId: messageId
                    });
                }
                
                // Refresh messages after sending
                setTimeout(() => {
                    this._refreshMessages();
                }, 1000);
            } catch (sendError) {
                logger.error('MessageHandler', 'Failed to send AI message', sendError);
                
                // Update the last interaction with failed status
                if (this.lastInteractionId) {
                    this.aiHandler.updateInteractionStatus({
                        interactionId: this.lastInteractionId,
                        messageSent: false,
                        error: sendError.message
                    });
                }
                
                this.messageBox.setContent(`{center}{bold}{red-fg}Failed to send message: ${sendError.message}{/red-fg}{/bold}{/center}`);
                this.screen.render();
            }
            
            // Store the last interaction ID for feedback
            this.lastInteractionId = response.interactionId;
            
            return response;
        } catch (error) {
            logger.error('MessageHandler', 'Error processing AI command', error);
            return `Error: ${error.message}`;
        }
    }

    /**
     * Handle feedback for the last AI response
     * @param {boolean} positive - Whether the feedback is positive
     * @param {string} feedback - Optional feedback text
     */
    async _handleAIFeedback(positive, feedback = '') {
        if (!this.lastInteractionId) {
            logger.warn('MessageHandler', 'No recent AI interaction to provide feedback for');
            this.messageBox.setContent('{center}{bold}{red-fg}No recent AI interaction to provide feedback for{/red-fg}{/bold}{/center}');
            this.screen.render();
            return;
        }
        
        try {
            this.aiHandler.recordFeedback({
                interactionId: this.lastInteractionId,
                positive,
                feedback
            });
            
            const feedbackType = positive ? '{green-fg}positive{/green-fg}' : '{red-fg}negative{/red-fg}';
            this.messageBox.setContent(`{center}{bold}Recorded ${feedbackType} feedback for AI response{/bold}{/center}`);
            this.screen.render();
            
            // Clear the feedback message after a short delay
            setTimeout(() => {
                this._refreshMessages();
            }, 1500);
        } catch (error) {
            logger.error('MessageHandler', 'Error recording AI feedback', error);
            this.messageBox.setContent(`{center}{bold}{red-fg}Error recording feedback: ${error.message}{/red-fg}{/bold}{/center}`);
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
                logger.info('MessageHandler', 'Refreshing messages for chat', {
                    chatId: selectedChat.id.user,
                    chatName: selectedChat.name
                });
                
                this.messageBox.setContent('Updating messages...');
                this.screen.render();
                
                // Mantener el foco en el inputBox durante la actualización
                this.inputBox.focus();
                
                // Get messages from the selected chat
                const messages = await this.whatsappClient.getChatMessages(selectedChat);
                
                logger.debug('MessageHandler', 'Messages refreshed', {
                    chatId: selectedChat.id.user,
                    messageCount: messages.length,
                    oldestMessageTime: messages.length > 0 ? new Date(messages[0].timestamp * 1000).toISOString() : 'none',
                    newestMessageTime: messages.length > 0 ? new Date(messages[messages.length - 1].timestamp * 1000).toISOString() : 'none'
                });
                
                if (messages && messages.length > 0) {
                    // Display the messages
                    this._displayMessages(messages);
                    
                    // Ensure the chat is still selected
                    this.whatsappClient.setSelectedChat(selectedChat);
                    
                    // Set focus back to input box for better UX
                    this.inputBox.focus();
                } else {
                    logger.warn('MessageHandler', 'No messages returned from chat', {
                        chatId: selectedChat.id.user,
                        chatName: selectedChat.name
                    });
                    this.messageBox.setContent('No messages in this chat yet.');
                    this.screen.render();
                    
                    // Ensure the chat is still selected
                    this.whatsappClient.setSelectedChat(selectedChat);
                    
                    // Set focus back to input box
                    this.inputBox.focus();
                }
            } else {
                logger.warn('MessageHandler', 'Attempted to refresh messages with no chat selected');
                this.messageBox.setContent('No chat selected.');
                this.screen.render();
                
                // Mantener el foco en el inputBox incluso sin chat seleccionado
                this.inputBox.focus();
            }
        } catch (error) {
            logger.error('MessageHandler', 'Error refreshing messages', error);
            this.messageBox.setContent(`Error refreshing messages: ${error.message}`);
            this.screen.render();
            
            // Mantener el foco en el inputBox incluso en caso de error
            this.inputBox.focus();
        }
    }

    /**
     * Show AI usage metrics
     * @private
     */
    _showAIMetrics() {
        try {
            const metrics = this.aiHandler.getMetrics();
            
            // Format the metrics for display
            let content = '{center}{bold}{green-fg}AI Usage Metrics{/green-fg}{/bold}{/center}\n\n';
            
            content += `{bold}Total Requests:{/bold} ${metrics.totalRequests}\n`;
            content += `{bold}Total Tokens:{/bold} ${metrics.totalTokens}\n`;
            content += `{bold}Average Response Time:{/bold} ${Math.round(metrics.averageResponseTime)}ms\n`;
            
            // Add message delivery stats if available
            if (metrics.messageDelivery) {
                const deliveryRate = metrics.messageDelivery.total > 0 
                    ? ((metrics.messageDelivery.sent / metrics.messageDelivery.total) * 100).toFixed(2)
                    : '0.00';
                    
                content += `{bold}Message Delivery Rate:{/bold} ${deliveryRate}% (${metrics.messageDelivery.sent}/${metrics.messageDelivery.total})\n`;
            }
            
            content += '\n{bold}Prompt Types Usage:{/bold}\n';
            for (const [promptType, count] of Object.entries(metrics.promptTypes)) {
                content += `  - ${promptType}: ${count}\n`;
            }
            
            content += '\n{bold}Error Rate:{/bold} ';
            if (metrics.errorRate.total > 0) {
                const errorPercentage = (metrics.errorRate.errors / metrics.errorRate.total) * 100;
                content += `${errorPercentage.toFixed(2)}% (${metrics.errorRate.errors}/${metrics.errorRate.total})\n`;
            } else {
                content += 'No errors recorded\n';
            }
            
            content += '\n{bold}User Feedback:{/bold}\n';
            content += `  - Positive: ${metrics.userFeedback.positive}\n`;
            content += `  - Negative: ${metrics.userFeedback.negative}\n`;
            
            if (metrics.userFeedback.positive + metrics.userFeedback.negative > 0) {
                const positivePercentage = (metrics.userFeedback.positive / 
                    (metrics.userFeedback.positive + metrics.userFeedback.negative)) * 100;
                content += `  - Satisfaction Rate: ${positivePercentage.toFixed(2)}%\n`;
            }
            
            // Add recent interactions section
            if (metrics.recentInteractions && metrics.recentInteractions.length > 0) {
                content += '\n{bold}Recent Interactions:{/bold}\n';
                
                metrics.recentInteractions.slice(0, 5).forEach((interaction, index) => {
                    const date = new Date(interaction.timestamp).toLocaleTimeString();
                    const status = interaction.messageSent 
                        ? '{green-fg}✓ Sent{/green-fg}' 
                        : '{red-fg}✗ Failed{/red-fg}';
                        
                    content += `  ${index + 1}. [${date}] ${interaction.promptSlug} - ${status}\n`;
                });
            }
            
            content += '\n{center}{italic}Press any key to return to messages{/italic}{/center}';
            
            // Display the metrics
            this.messageBox.setContent(content);
            this.screen.render();
            
            // Add a one-time key handler to return to messages
            const handler = (ch, key) => {
                this._refreshMessages();
                this.screen.removeListener('keypress', handler);
            };
            
            this.screen.on('keypress', handler);
        } catch (error) {
            logger.error('MessageHandler', 'Error showing AI metrics', error);
            this.messageBox.setContent(`{center}{bold}{red-fg}Error showing AI metrics: ${error.message}{/red-fg}{/bold}{/center}`);
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