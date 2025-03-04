/**
 * Main entry point for the WhatsApp Terminal Client
 */

const Interface = require('./ui/interface');
const WhatsAppClient = require('./client/whatsapp');
const MatrixAnimation = require('./ui/animation');
const ShortcutHandler = require('./ui/shortcuts');
const ChatHandler = require('./handlers/chats');
const MessageHandler = require('./handlers/messages');
const PromptHandler = require('./handlers/prompts');
const logger = require('./utils/logger');

// Set environment variables for logging if needed
process.env.LOG_LEVEL = process.env.LOG_LEVEL || 'info'; // debug, info, warn, error
process.env.DEBUG = process.env.DEBUG || 'false';

class WhatsAppTerminal {
    constructor() {
        logger.info('WhatsAppTerminal', 'Initializing WhatsApp Terminal Client');
        
        // Initialize interface
        this.ui = new Interface();
        
        // Get UI components
        this.screen = this.ui.getScreen();
        this.chatList = this.ui.getChatList();
        this.messageBox = this.ui.getMessageBox();
        this.inputBox = this.ui.getInputBox();
        this.statusBar = this.ui.getStatusBar();

        // Initialize components
        this.whatsappClient = new WhatsAppClient(this.messageBox, this.screen);
        this.matrixAnimation = new MatrixAnimation(this.messageBox, this.screen);
        this.shortcutHandler = new ShortcutHandler(
            this.screen,
            this.chatList,
            this.inputBox,
            this.messageBox,
            this.statusBar,
            this.whatsappClient,
            this.ui
        );
        this.chatHandler = new ChatHandler(
            this.chatList,
            this.messageBox,
            this.screen,
            this.whatsappClient
        );
        this.messageHandler = new MessageHandler(
            this.messageBox,
            this.inputBox,
            this.screen,
            this.whatsappClient
        );
        this.promptHandler = new PromptHandler(
            this.messageBox,
            this.inputBox,
            this.screen
        );

        // Handle process exit
        process.on('exit', () => {
            this.cleanup();
        });

        // Handle uncaught exceptions
        process.on('uncaughtException', (err) => {
            this.messageBox.setContent(`Error: ${err.message}\n${err.stack}`);
            this.screen.render();
        });

        logger.debug('WhatsAppTerminal', 'Components initialized');
    }

    /**
     * Initialize the application
     */
    initialize() {
        try {
            logger.info('WhatsAppTerminal', 'Starting application');
            
            // Initial render to ensure screen is ready
            this.ui.render();

            // Start matrix animation first
            this.matrixAnimation.start();

            // Set up handlers en orden específico para evitar conflictos
            logger.debug('WhatsAppTerminal', 'Setting up handlers in specific order');
            
            // 1. Primero configurar los atajos de teclado (shortcuts)
            this.shortcutHandler.setupShortcuts();
            logger.debug('WhatsAppTerminal', 'Shortcuts initialized');
            
            // 2. Luego inicializar los handlers específicos
            this.chatHandler.initialize();
            logger.debug('WhatsAppTerminal', 'Chat handler initialized');
            
            this.messageHandler.initialize();
            logger.debug('WhatsAppTerminal', 'Message handler initialized');
            
            this.promptHandler.initialize();
            logger.debug('WhatsAppTerminal', 'Prompt handler initialized');

            // Start WhatsApp client
            this.whatsappClient.initialize();

            // Set status bar text
            this.statusBar.setContent('WhatsApp Terminal Client | Press Ctrl+Q to quit | Press Ctrl+H for help');

            // Force initial render
            this.screen.render();
            
            // Set up process exit handler
            process.on('exit', () => this.cleanup());
            
            // Handle SIGINT (Ctrl+C)
            process.on('SIGINT', () => {
                logger.info('WhatsAppTerminal', 'Received SIGINT signal, shutting down');
                this.cleanup();
                process.exit(0);
            });
            
            logger.info('WhatsAppTerminal', 'Application started successfully');
        } catch (error) {
            logger.error('WhatsAppTerminal', 'Error initializing application', error);
            console.error('Failed to initialize application:', error);
            this.cleanup();
            process.exit(1);
        }
    }

    /**
     * Clean up resources before exit
     */
    cleanup() {
        try {
            logger.info('WhatsAppTerminal', 'Cleaning up resources');
            
            this.matrixAnimation.stop();
            this.whatsappClient.destroy();
            this.screen.destroy();
            
            logger.info('WhatsAppTerminal', 'Cleanup completed, exiting application');
        } catch (error) {
            logger.error('WhatsAppTerminal', 'Error during cleanup', error);
            console.error('Error during cleanup:', error);
        }
    }
}

// Create and initialize the application
try {
    const app = new WhatsAppTerminal();
    app.initialize();
} catch (error) {
    logger.error('Main', 'Fatal error starting application', error);
    console.error('Fatal error:', error);
    process.exit(1);
} 