/**
 * AI integration handler for the WhatsApp Terminal Client
 */

const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');
const logger = require('../utils/logger');
const aiLogger = require('../utils/aiLogger');

class AIHandler {
    constructor() {
        this.model = 'llama3.2'; // default model
        this.prompts = new Map();
        this.promptsDir = path.join(process.cwd(), 'prompts');
        this._loadPrompts();
        logger.info('AIHandler', 'AI Handler initialized', { model: this.model });
    }

    /**
     * Load prompts from markdown files
     */
    _loadPrompts() {
        try {
            // Create prompts directory if it doesn't exist
            if (!fs.existsSync(this.promptsDir)) {
                fs.mkdirSync(this.promptsDir, { recursive: true });
                logger.debug('AIHandler', 'Created prompts directory', { path: this.promptsDir });
            }

            // Read all .md files from the prompts directory
            const files = fs.readdirSync(this.promptsDir);
            for (const file of files) {
                if (file.endsWith('.md')) {
                    const slug = path.basename(file, '.md');
                    const content = fs.readFileSync(
                        path.join(this.promptsDir, file),
                        'utf8'
                    );
                    this.prompts.set(slug, { content });
                }
            }
            logger.info('AIHandler', 'Loaded prompts', { count: this.prompts.size });
        } catch (error) {
            logger.error('AIHandler', 'Error loading prompts', error);
        }
    }

    /**
     * Get a prompt by its slug
     * @param {string} slug - The prompt slug to find
     * @returns {Object|null} The prompt object or null if not found
     */
    getPromptBySlug(slug) {
        const prompt = this.prompts.get(slug) || null;
        if (prompt) {
            logger.debug('AIHandler', 'Retrieved prompt', { slug });
        } else {
            logger.debug('AIHandler', 'Prompt not found', { slug });
        }
        return prompt;
    }

    /**
     * List all available prompts
     * @returns {Array<string>} List of prompt slugs
     */
    listPrompts() {
        const prompts = Array.from(this.prompts.keys());
        logger.debug('AIHandler', 'Listed prompts', { count: prompts.length });
        return prompts;
    }

    /**
     * Process a message using Ollama
     * @param {Object} options - Processing options
     * @param {string} options.content - The content to process
     * @param {string} options.context - Optional context for the AI
     * @param {string} options.promptSlug - Optional prompt slug to use
     * @param {string} options.model - Optional model override
     * @param {string} options.chatId - Optional chat ID where this is being used
     * @param {string} options.contactName - Optional contact name
     * @returns {Promise<string>} The processed response
     */
    async processMessage({ content, context = '', promptSlug = null, model = this.model, chatId = null, contactName = null }) {
        logger.info('AIHandler', 'Processing message', { 
            contentLength: content.length,
            hasContext: !!context,
            promptSlug,
            model
        });
        
        const startTime = Date.now();
        let finalPrompt = '';
        let response = '';
        let interactionId = null;
        
        try {
            // If a prompt slug is provided, use that template
            if (promptSlug) {
                const promptTemplate = this.getPromptBySlug(promptSlug);
                if (!promptTemplate) {
                    const error = new Error(`Prompt template "${promptSlug}" not found. Available prompts: ${this.listPrompts().join(', ')}`);
                    logger.error('AIHandler', 'Prompt template not found', error);
                    
                    // Log the error with AI logger
                    aiLogger.logError({
                        promptSlug,
                        error,
                        chatId
                    });
                    
                    throw error;
                }
                
                // Replace placeholders in the template
                finalPrompt = promptTemplate.content
                    .replace('{{CONTEXT}}', context)
                    .replace('{{CONTENT}}', content);
            } else {
                // Use simple prompt format
                finalPrompt = context ? `Context:\n${context}\n\nContent:\n${content}` : content;
            }

            logger.debug('AIHandler', 'Sending request to Ollama', { model });
            
            response = await new Promise((resolve, reject) => {
                const curl = spawn('curl', [
                    'http://localhost:11434/api/generate',
                    '-d', JSON.stringify({
                        model: model,
                        prompt: finalPrompt,
                        stream: false
                    })
                ]);

                let responseData = '';
                let errorData = '';

                curl.stdout.on('data', (data) => {
                    responseData += data;
                });

                curl.stderr.on('data', (data) => {
                    errorData += data;
                });

                curl.on('close', (code) => {
                    if (code !== 0) {
                        const error = new Error(`Ollama request failed: ${errorData}`);
                        logger.error('AIHandler', 'Ollama request failed', error);
                        reject(error);
                        return;
                    }

                    try {
                        const response = JSON.parse(responseData);
                        logger.info('AIHandler', 'Received response from Ollama', {
                            responseLength: response.response.length
                        });
                        resolve(response.response);
                    } catch (error) {
                        logger.error('AIHandler', 'Failed to parse Ollama response', error);
                        reject(new Error(`Failed to parse Ollama response: ${error.message}`));
                    }
                });
            });
            
            const responseTime = Date.now() - startTime;
            
            // Log the successful interaction
            interactionId = aiLogger.logInteraction({
                promptSlug,
                context,
                content,
                response,
                model,
                responseTime,
                chatId,
                contactName,
                fullPrompt: finalPrompt
            });
            
            logger.info('AIHandler', 'AI processing completed', { 
                responseTime,
                interactionId
            });
            
            return response;
        } catch (error) {
            const responseTime = Date.now() - startTime;
            
            // Log the error
            aiLogger.logError({
                promptSlug,
                error,
                chatId,
                context,
                content,
                fullPrompt: finalPrompt,
                responseTime
            });
            
            throw error;
        }
    }

    /**
     * Parse command string into options
     * @param {string} command - Command string (e.g., "/p -ct 'content' -p 'prompt-slug'")
     * @returns {Object} Parsed options
     */
    parseCommand(command) {
        logger.debug('AIHandler', 'Parsing command', { command });
        
        try {
            const options = {
                content: '',
                context: '',
                model: this.model,
                promptSlug: null
            };

            const args = command.split(' ');
            let currentFlag = null;

            for (let i = 1; i < args.length; i++) {
                const arg = args[i];
                
                if (arg.startsWith('-')) {
                    currentFlag = arg;
                    continue;
                }

                if (currentFlag) {
                    let value = arg;
                    // If the value starts with a quote, collect until closing quote
                    if (value.startsWith('"') || value.startsWith("'")) {
                        const quote = value[0];
                        value = value.slice(1);
                        while (i + 1 < args.length && !value.endsWith(quote)) {
                            i++;
                            value += ' ' + args[i];
                        }
                        value = value.slice(0, -1); // Remove closing quote
                    }

                    switch (currentFlag) {
                        case '-ct':
                            options.content = value;
                            break;
                        case '-p':
                            options.promptSlug = value;
                            break;
                        case '-m':
                            options.model = value;
                            break;
                    }
                    currentFlag = null;
                }
            }

            logger.debug('AIHandler', 'Command parsed successfully', {
                contentLength: options.content.length,
                promptSlug: options.promptSlug,
                model: options.model
            });
            
            return options;
        } catch (error) {
            logger.error('AIHandler', 'Error parsing command', error);
            // Return default options if parsing fails
            return {
                content: '',
                context: '',
                model: this.model,
                promptSlug: null
            };
        }
    }

    /**
     * Record feedback about an AI response
     * @param {Object} options - Feedback options
     * @param {string} options.interactionId - ID of the interaction
     * @param {boolean} options.positive - Whether feedback was positive
     * @param {string} options.feedback - Optional feedback text
     */
    recordFeedback({ interactionId, positive, feedback }) {
        if (!interactionId) {
            logger.warn('AIHandler', 'Cannot record feedback without interaction ID');
            return;
        }
        
        aiLogger.logFeedback({
            interactionId,
            positive,
            feedback
        });
        
        logger.info('AIHandler', 'Recorded user feedback', {
            interactionId,
            positive
        });
    }
    
    /**
     * Get AI usage metrics
     * @returns {Object} Current metrics
     */
    getMetrics() {
        return aiLogger.getMetrics();
    }

    /**
     * Update the status of an AI interaction
     * @param {Object} options - Update options
     * @param {string} options.interactionId - ID of the interaction
     * @param {boolean} options.messageSent - Whether the message was sent
     * @param {string} options.messageId - ID of the sent message (if sent)
     * @param {string} options.error - Error message (if failed)
     */
    updateInteractionStatus({ interactionId, messageSent, messageId = null, error = null }) {
        if (!interactionId) {
            logger.warn('AIHandler', 'Cannot update interaction status without interaction ID');
            return;
        }
        
        try {
            const statusUpdate = {
                messageSent,
                timestamp: new Date().toISOString()
            };
            
            if (messageSent && messageId) {
                statusUpdate.messageId = messageId;
            } else if (!messageSent && error) {
                statusUpdate.error = error;
            }
            
            aiLogger.updateInteractionStatus(interactionId, statusUpdate);
            
            logger.info('AIHandler', 'Updated interaction status', {
                interactionId,
                messageSent
            });
        } catch (error) {
            logger.error('AIHandler', 'Failed to update interaction status', error);
        }
    }

    /**
     * Clean and sanitize AI response for sending
     * @param {string} response - The raw AI response
     * @returns {string} Cleaned response ready for sending
     */
    cleanResponse(response) {
        if (!response) return '';
        
        try {
            // Remove any XML/HTML tags
            let cleaned = response.replace(/<[^>]*>/g, '');
            
            // Remove any command-like strings that might be in the response
            cleaned = cleaned.replace(/^\/[a-z]+\s/i, ''); // Remove /command at start
            cleaned = cleaned.replace(/\s:q$/i, ''); // Remove :q at end
            cleaned = cleaned.replace(/\s:w$/i, ''); // Remove :w at end
            
            // Remove any markdown formatting
            cleaned = cleaned.replace(/```[a-z]*\n|```/g, ''); // Remove code blocks
            cleaned = cleaned.replace(/\*\*(.*?)\*\*/g, '$1'); // Remove bold
            cleaned = cleaned.replace(/\*(.*?)\*/g, '$1'); // Remove italic
            cleaned = cleaned.replace(/__(.*?)__/g, '$1'); // Remove underline
            
            // Trim whitespace
            cleaned = cleaned.trim();
            
            logger.debug('AIHandler', 'Cleaned AI response', {
                originalLength: response.length,
                cleanedLength: cleaned.length
            });
            
            return cleaned;
        } catch (error) {
            logger.error('AIHandler', 'Error cleaning AI response', error);
            return response.trim(); // Return original trimmed as fallback
        }
    }
}

module.exports = AIHandler; 