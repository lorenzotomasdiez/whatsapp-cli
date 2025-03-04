/**
 * Main entry point for the WhatsApp Terminal Client
 */

const Interface = require('./ui/interface');
const WhatsAppClient = require('./client/whatsapp');
const MatrixAnimation = require('./ui/animation');
const ShortcutHandler = require('./ui/shortcuts');
const ChatHandler = require('./handlers/chats');
const MessageHandler = require('./handlers/messages');

class WhatsAppTerminal {
    constructor() {
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

        // Handle process exit
        process.on('exit', () => {
            this.cleanup();
        });

        // Handle uncaught exceptions
        process.on('uncaughtException', (err) => {
            this.messageBox.setContent(`Error: ${err.message}\n${err.stack}`);
            this.screen.render();
        });
    }

    /**
     * Initialize the application
     */
    initialize() {
        try {
            // Initial render to ensure screen is ready
            this.ui.render();

            // Start matrix animation first
            this.matrixAnimation.start();

            // Set up handlers
            this.shortcutHandler.setupShortcuts();
            this.chatHandler.initialize();
            this.messageHandler.initialize();

            // Start WhatsApp client
            this.whatsappClient.initialize();

            // Force initial render
            this.screen.render();
        } catch (error) {
            console.error('Initialization error:', error);
            process.exit(1);
        }
    }

    /**
     * Clean up resources before exit
     */
    cleanup() {
        try {
            this.matrixAnimation.stop();
            this.whatsappClient.destroy();
        } catch (error) {
            console.error('Cleanup error:', error);
        }
    }
}

// Create and start the application
const app = new WhatsAppTerminal();
app.initialize(); 