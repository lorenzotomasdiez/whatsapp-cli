/**
 * AI Logger utility for the WhatsApp Terminal Client
 * Provides specialized logging for AI prompts, responses, and performance metrics
 */

const fs = require('fs');
const path = require('path');
const util = require('util');
const logger = require('./logger');

class AILogger {
    constructor() {
        this.logsDir = path.join(process.cwd(), 'logs');
        this.aiLogFile = path.join(this.logsDir, 'ai.log');
        this.aiPromptResponseDir = path.join(this.logsDir, 'ai_interactions');
        this.aiMetricsFile = path.join(this.logsDir, 'ai_metrics.json');
        this.metrics = {
            totalRequests: 0,
            totalTokens: 0,
            averageResponseTime: 0,
            totalResponseTime: 0,
            promptTypes: {},
            errorRate: {
                total: 0,
                errors: 0
            },
            userFeedback: {
                positive: 0,
                negative: 0
            },
            messageDelivery: {
                total: 0,
                sent: 0,
                failed: 0
            },
            recentInteractions: []
        };
        
        this._setupLogging();
    }
    
    /**
     * Set up logging directories and files
     * @private
     */
    _setupLogging() {
        try {
            // Create logs directory if it doesn't exist
            if (!fs.existsSync(this.logsDir)) {
                fs.mkdirSync(this.logsDir, { recursive: true });
            }
            
            // Create AI interactions directory if it doesn't exist
            if (!fs.existsSync(this.aiPromptResponseDir)) {
                fs.mkdirSync(this.aiPromptResponseDir, { recursive: true });
            }
            
            // Load existing metrics if available
            if (fs.existsSync(this.aiMetricsFile)) {
                try {
                    const metricsData = fs.readFileSync(this.aiMetricsFile, 'utf8');
                    this.metrics = JSON.parse(metricsData);
                } catch (error) {
                    logger.error('AILogger', 'Failed to load AI metrics', error);
                }
            }
            
            logger.info('AILogger', 'AI logging system initialized');
        } catch (error) {
            logger.error('AILogger', 'Error setting up AI logging', error);
        }
    }
    
    /**
     * Save metrics to file
     * @private
     */
    _saveMetrics() {
        try {
            // Validate metrics structure before saving
            if (!this.metrics || typeof this.metrics !== 'object') {
                logger.error('AILogger', 'Invalid metrics object, reinitializing');
                this.metrics = {
                    totalRequests: 0,
                    totalTokens: 0,
                    averageResponseTime: 0,
                    totalResponseTime: 0,
                    promptTypes: {},
                    errorRate: {
                        total: 0,
                        errors: 0
                    },
                    userFeedback: {
                        positive: 0,
                        negative: 0
                    },
                    messageDelivery: {
                        total: 0,
                        sent: 0,
                        failed: 0
                    },
                    recentInteractions: []
                };
            }
            
            // Ensure all required properties exist
            if (typeof this.metrics.totalRequests !== 'number') this.metrics.totalRequests = 0;
            if (typeof this.metrics.totalTokens !== 'number') this.metrics.totalTokens = 0;
            if (typeof this.metrics.averageResponseTime !== 'number') this.metrics.averageResponseTime = 0;
            if (typeof this.metrics.totalResponseTime !== 'number') this.metrics.totalResponseTime = 0;
            
            if (!this.metrics.promptTypes || typeof this.metrics.promptTypes !== 'object') {
                this.metrics.promptTypes = {};
            }
            
            if (!this.metrics.errorRate || typeof this.metrics.errorRate !== 'object') {
                this.metrics.errorRate = { total: 0, errors: 0 };
            }
            
            if (!this.metrics.userFeedback || typeof this.metrics.userFeedback !== 'object') {
                this.metrics.userFeedback = { positive: 0, negative: 0 };
            }
            
            if (!this.metrics.messageDelivery || typeof this.metrics.messageDelivery !== 'object') {
                this.metrics.messageDelivery = { total: 0, sent: 0, failed: 0 };
            }
            
            if (!Array.isArray(this.metrics.recentInteractions)) {
                this.metrics.recentInteractions = [];
            }
            
            // Create a backup of the current metrics file if it exists
            if (fs.existsSync(this.aiMetricsFile)) {
                try {
                    const backupFile = `${this.aiMetricsFile}.bak`;
                    fs.copyFileSync(this.aiMetricsFile, backupFile);
                } catch (backupError) {
                    logger.warn('AILogger', 'Failed to create metrics backup', backupError);
                    // Continue despite backup error
                }
            }
            
            // Write the metrics to file
            fs.writeFileSync(
                this.aiMetricsFile, 
                JSON.stringify(this.metrics, null, 2)
            );
        } catch (error) {
            logger.error('AILogger', 'Failed to save AI metrics', error);
            
            // Try to recover from a backup if available
            try {
                const backupFile = `${this.aiMetricsFile}.bak`;
                if (fs.existsSync(backupFile)) {
                    const backupData = fs.readFileSync(backupFile, 'utf8');
                    this.metrics = JSON.parse(backupData);
                    logger.info('AILogger', 'Recovered metrics from backup');
                }
            } catch (recoveryError) {
                logger.error('AILogger', 'Failed to recover metrics from backup', recoveryError);
            }
        }
    }
    
    /**
     * Estimate token count from text
     * Very rough estimation: ~4 characters per token for English/Spanish
     * @param {string} text - Text to estimate tokens for
     * @returns {number} Estimated token count
     * @private
     */
    _estimateTokens(text) {
        try {
            if (!text) return 0;
            if (typeof text !== 'string') {
                logger.warn('AILogger', 'Non-string value passed to _estimateTokens', { 
                    type: typeof text 
                });
                return 0;
            }
            
            // Limit text length for processing to avoid memory issues
            const maxLength = 100000; // 100K characters max
            const processedText = text.length > maxLength 
                ? text.substring(0, maxLength) 
                : text;
                
            return Math.ceil(processedText.length / 4);
        } catch (error) {
            logger.error('AILogger', 'Error estimating tokens', error);
            return 0;
        }
    }
    
    /**
     * Log an AI interaction (prompt and response)
     * @param {Object} data - Interaction data
     * @param {string} data.promptSlug - The prompt template used
     * @param {string} data.context - The context provided to the AI
     * @param {string} data.content - The content provided to the AI
     * @param {string} data.response - The AI's response
     * @param {string} data.model - The AI model used
     * @param {number} data.responseTime - Time taken to generate response (ms)
     * @param {string} data.chatId - ID of the chat where this was used
     * @param {string} data.contactName - Name of the contact
     */
    logInteraction(data) {
        try {
            // Validate required data
            if (!data) {
                logger.error('AILogger', 'Invalid data provided to logInteraction');
                return null;
            }
            
            // Ensure all fields are defined with defaults if missing
            const safeData = {
                promptSlug: data.promptSlug || 'default',
                context: typeof data.context === 'string' ? data.context : '',
                content: typeof data.content === 'string' ? data.content : '',
                response: typeof data.response === 'string' ? data.response : '',
                model: data.model || 'unknown',
                responseTime: data.responseTime || 0,
                chatId: data.chatId || 'unknown',
                contactName: data.contactName || 'unknown',
                fullPrompt: typeof data.fullPrompt === 'string' ? data.fullPrompt : ''
            };
            
            const timestamp = new Date();
            const timestampStr = timestamp.toISOString();
            const formattedDate = timestamp.toISOString().split('T')[0];
            
            // Create a unique ID for this interaction
            const interactionId = `${formattedDate}_${Date.now()}`;
            
            // Estimate token counts (safely)
            const promptTokens = this._estimateTokens(safeData.content) + 
                                this._estimateTokens(safeData.context);
            const responseTokens = this._estimateTokens(safeData.response);
            const totalTokens = promptTokens + responseTokens;
            
            // Update metrics
            this.metrics.totalRequests++;
            this.metrics.totalTokens += totalTokens;
            this.metrics.totalResponseTime += safeData.responseTime;
            this.metrics.averageResponseTime = 
                this.metrics.totalResponseTime / this.metrics.totalRequests;
                
            // Track prompt type usage
            if (safeData.promptSlug) {
                if (!this.metrics.promptTypes[safeData.promptSlug]) {
                    this.metrics.promptTypes[safeData.promptSlug] = 0;
                }
                this.metrics.promptTypes[safeData.promptSlug]++;
            }
            
            // Log to AI log file
            const logEntry = {
                timestamp: timestampStr,
                interactionId,
                promptSlug: safeData.promptSlug,
                model: safeData.model,
                chatId: safeData.chatId,
                contactName: safeData.contactName,
                promptTokens,
                responseTokens,
                totalTokens,
                responseTime: safeData.responseTime
            };
            
            try {
                fs.appendFileSync(
                    this.aiLogFile,
                    JSON.stringify(logEntry) + '\n'
                );
            } catch (writeError) {
                logger.error('AILogger', 'Failed to write to AI log file', writeError);
            }
            
            // Save detailed interaction to its own file
            const interactionFile = path.join(
                this.aiPromptResponseDir,
                `${interactionId}.json`
            );
            
            try {
                fs.writeFileSync(
                    interactionFile,
                    JSON.stringify({
                        ...logEntry,
                        context: safeData.context,
                        content: safeData.content,
                        response: safeData.response,
                        fullPrompt: safeData.fullPrompt
                    }, null, 2)
                );
            } catch (writeError) {
                logger.error('AILogger', 'Failed to write interaction file', writeError);
            }
            
            // Add to recent interactions (safely)
            if (Array.isArray(this.metrics.recentInteractions)) {
                try {
                    const recentInteraction = {
                        interactionId,
                        timestamp: timestampStr,
                        promptSlug: safeData.promptSlug,
                        model: safeData.model,
                        responseTime: safeData.responseTime,
                        messageSent: null // Will be updated later
                    };
                    
                    this.metrics.recentInteractions.unshift(recentInteraction);
                    if (this.metrics.recentInteractions.length > 20) {
                        this.metrics.recentInteractions = this.metrics.recentInteractions.slice(0, 20);
                    }
                } catch (arrayError) {
                    logger.error('AILogger', 'Failed to update recent interactions array', arrayError);
                    // Initialize the array if it's corrupted
                    this.metrics.recentInteractions = [];
                }
            } else {
                // Initialize the array if it doesn't exist
                this.metrics.recentInteractions = [];
            }
            
            // Save updated metrics
            try {
                this._saveMetrics();
            } catch (metricsError) {
                logger.error('AILogger', 'Failed to save metrics', metricsError);
            }
            
            logger.debug('AILogger', 'Logged AI interaction', { interactionId });
            
            return interactionId;
        } catch (error) {
            logger.error('AILogger', 'Failed to log AI interaction', error);
            return null;
        }
    }
    
    /**
     * Log an error with AI processing
     * @param {Object} data - Error data
     * @param {string} data.promptSlug - The prompt template used
     * @param {string} data.error - Error message or object
     * @param {string} data.chatId - ID of the chat where this occurred
     */
    logError(data) {
        try {
            this.metrics.errorRate.total++;
            this.metrics.errorRate.errors++;
            
            const timestamp = new Date().toISOString();
            const logEntry = {
                timestamp,
                type: 'error',
                promptSlug: data.promptSlug || 'unknown',
                error: data.error instanceof Error 
                    ? { message: data.error.message, stack: data.error.stack }
                    : data.error,
                chatId: data.chatId
            };
            
            fs.appendFileSync(
                this.aiLogFile,
                JSON.stringify(logEntry) + '\n'
            );
            
            this._saveMetrics();
            
            logger.error('AILogger', 'Logged AI error', logEntry);
        } catch (error) {
            logger.error('AILogger', 'Failed to log AI error', error);
        }
    }
    
    /**
     * Log user feedback about an AI response
     * @param {Object} data - Feedback data
     * @param {string} data.interactionId - ID of the interaction
     * @param {boolean} data.positive - Whether feedback was positive
     * @param {string} data.feedback - Optional feedback text
     */
    logFeedback(data) {
        try {
            if (data.positive) {
                this.metrics.userFeedback.positive++;
            } else {
                this.metrics.userFeedback.negative++;
            }
            
            const timestamp = new Date().toISOString();
            const logEntry = {
                timestamp,
                type: 'feedback',
                interactionId: data.interactionId,
                positive: data.positive,
                feedback: data.feedback
            };
            
            fs.appendFileSync(
                this.aiLogFile,
                JSON.stringify(logEntry) + '\n'
            );
            
            // If we have an interaction ID, update that file too
            if (data.interactionId) {
                const interactionFile = path.join(
                    this.aiPromptResponseDir,
                    `${data.interactionId}.json`
                );
                
                if (fs.existsSync(interactionFile)) {
                    try {
                        const interactionData = JSON.parse(
                            fs.readFileSync(interactionFile, 'utf8')
                        );
                        
                        interactionData.feedback = {
                            positive: data.positive,
                            feedback: data.feedback,
                            timestamp
                        };
                        
                        fs.writeFileSync(
                            interactionFile,
                            JSON.stringify(interactionData, null, 2)
                        );
                    } catch (error) {
                        logger.error('AILogger', 'Failed to update interaction with feedback', error);
                    }
                }
            }
            
            this._saveMetrics();
            
            logger.debug('AILogger', 'Logged user feedback', logEntry);
        } catch (error) {
            logger.error('AILogger', 'Failed to log user feedback', error);
        }
    }
    
    /**
     * Get AI usage metrics
     * @returns {Object} Current metrics
     */
    getMetrics() {
        return { ...this.metrics };
    }
    
    /**
     * Update the status of an AI interaction
     * @param {string} interactionId - ID of the interaction to update
     * @param {Object} statusUpdate - Status update data
     * @param {boolean} statusUpdate.messageSent - Whether the message was sent
     * @param {string} statusUpdate.messageId - ID of the sent message (if sent)
     * @param {string} statusUpdate.error - Error message (if failed)
     * @param {string} statusUpdate.timestamp - Timestamp of the update
     * @returns {boolean} Whether the update was successful
     */
    updateInteractionStatus(interactionId, statusUpdate) {
        try {
            if (!interactionId) {
                logger.error('AILogger', 'Cannot update interaction status without interaction ID');
                return false;
            }
            
            if (!statusUpdate || typeof statusUpdate !== 'object') {
                logger.error('AILogger', 'Invalid status update data', { interactionId });
                return false;
            }
            
            const interactionFile = path.join(
                this.aiPromptResponseDir,
                `${interactionId}.json`
            );
            
            if (!fs.existsSync(interactionFile)) {
                logger.error('AILogger', 'Interaction file not found', { interactionId });
                return false;
            }
            
            // Read the existing interaction data
            let interactionData;
            try {
                const fileContent = fs.readFileSync(interactionFile, 'utf8');
                interactionData = JSON.parse(fileContent);
            } catch (readError) {
                logger.error('AILogger', 'Failed to read interaction file', { 
                    interactionId, 
                    error: readError.message 
                });
                return false;
            }
            
            // Update the interaction data
            interactionData.messageStatus = {
                ...statusUpdate
            };
            
            // Write the updated data back to the file
            try {
                fs.writeFileSync(
                    interactionFile,
                    JSON.stringify(interactionData, null, 2)
                );
            } catch (writeError) {
                logger.error('AILogger', 'Failed to write updated interaction file', { 
                    interactionId, 
                    error: writeError.message 
                });
                return false;
            }
            
            // Update metrics safely
            try {
                if (typeof this.metrics.messageDelivery !== 'object') {
                    this.metrics.messageDelivery = {
                        total: 0,
                        sent: 0,
                        failed: 0
                    };
                }
                
                this.metrics.messageDelivery.total++;
                if (statusUpdate.messageSent) {
                    this.metrics.messageDelivery.sent++;
                } else {
                    this.metrics.messageDelivery.failed++;
                }
                
                // Update the recent interactions list if it exists
                if (Array.isArray(this.metrics.recentInteractions)) {
                    const interactionIndex = this.metrics.recentInteractions.findIndex(
                        item => item.interactionId === interactionId
                    );
                    
                    if (interactionIndex >= 0) {
                        this.metrics.recentInteractions[interactionIndex].messageSent = 
                            statusUpdate.messageSent;
                    }
                } else {
                    // Initialize the array if it doesn't exist
                    this.metrics.recentInteractions = [];
                }
                
                // Save updated metrics
                this._saveMetrics();
            } catch (metricsError) {
                logger.error('AILogger', 'Failed to update metrics with status', { 
                    interactionId, 
                    error: metricsError.message 
                });
                // Continue despite metrics error
            }
            
            // Log the status update
            try {
                const logEntry = {
                    timestamp: statusUpdate.timestamp || new Date().toISOString(),
                    type: 'status_update',
                    interactionId,
                    messageSent: statusUpdate.messageSent,
                    messageId: statusUpdate.messageId || null,
                    error: statusUpdate.error || null
                };
                
                fs.appendFileSync(
                    this.aiLogFile,
                    JSON.stringify(logEntry) + '\n'
                );
            } catch (logError) {
                logger.error('AILogger', 'Failed to log status update', { 
                    interactionId, 
                    error: logError.message 
                });
                // Continue despite log error
            }
            
            logger.debug('AILogger', 'Updated interaction status', { 
                interactionId,
                messageSent: statusUpdate.messageSent
            });
            
            return true;
        } catch (error) {
            logger.error('AILogger', 'Failed to update interaction status', error);
            return false;
        }
    }
}

// Create a singleton instance
const aiLogger = new AILogger();

module.exports = aiLogger; 