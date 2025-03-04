/**
 * UI components and layout for the WhatsApp Terminal Client
 */

const blessed = require('blessed');

class Interface {
    constructor() {
        this.screen = null;
        this.chatList = null;
        this.messageBox = null;
        this.inputBox = null;
        this.statusBar = null;
        this._createInterface();
    }

    /**
     * Create the terminal interface
     */
    _createInterface() {
        // Create screen
        this.screen = blessed.screen({
            smartCSR: true,
            title: 'WhatsApp Terminal Client',
            cursor: {
                artificial: true,
                shape: 'line',
                blink: true,
                color: 'green'
            },
            debug: true,
            fullUnicode: true,
            dockBorders: true,
            ignoreLocked: ['C-c']
        });

        // Create chat list
        this.chatList = blessed.list({
            parent: this.screen,
            label: ' Chats ',
            left: 0,
            top: 0,
            width: '30%',
            height: '100%-1',
            border: {
                type: 'line',
                fg: 'green'
            },
            style: {
                selected: {
                    bg: 'green',
                    fg: 'black'
                },
                focus: {
                    border: {
                        fg: 'white'
                    }
                }
            },
            keys: true,
            vi: false,
            mouse: true,
            scrollbar: {
                ch: '║',
                style: {
                    fg: 'green'
                }
            },
            tags: true
        });

        // Create message box
        this.messageBox = blessed.box({
            parent: this.screen,
            label: ' Messages ',
            left: '30%',
            top: 0,
            width: '70%',
            height: '85%',
            border: {
                type: 'line',
                fg: 'green'
            },
            style: {
                focus: {
                    border: {
                        fg: 'white'
                    }
                }
            },
            scrollable: true,
            alwaysScroll: true,
            scrollbar: {
                ch: '║',
                style: {
                    fg: 'green'
                }
            },
            mouse: true,
            keys: true,
            vi: false,
            tags: true,
            wrap: false
        });

        // Create input box
        this.inputBox = blessed.textbox({
            parent: this.screen,
            label: ' Message ',
            left: '30%',
            top: '85%',
            width: '70%',
            height: '15%-1',
            border: {
                type: 'line',
                fg: 'green'
            },
            style: {
                focus: {
                    border: {
                        fg: 'white'
                    }
                }
            },
            inputOnFocus: false,
            mouse: true,
            keys: true,
            vi: false,
            tags: true
        });

        // Create status bar
        this.statusBar = blessed.box({
            parent: this.screen,
            bottom: 0,
            left: 0,
            width: '100%',
            height: 1,
            style: {
                fg: 'white',
                bg: 'green'
            },
            tags: true,
            content: ' NORMAL '
        });

        // Set key bindings for navigation between boxes
        this.screen.key(['tab'], () => {
            // Disable global tab to avoid conflicts with vim-style navigation
        });

        // Handle resize
        this.screen.on('resize', () => {
            this.chatList.emit('attach');
            this.messageBox.emit('attach');
            this.inputBox.emit('attach');
            this.statusBar.emit('attach');
            this.screen.render();
        });

        // Handle exit
        this.screen.key(['C-c'], () => {
            return process.exit(0);
        });

        // Focus handling
        this.chatList.on('focus', () => this.chatList.style.border.fg = 'white');
        this.chatList.on('blur', () => this.chatList.style.border.fg = 'green');
        this.messageBox.on('focus', () => this.messageBox.style.border.fg = 'white');
        this.messageBox.on('blur', () => this.messageBox.style.border.fg = 'green');
        this.inputBox.on('focus', () => this.inputBox.style.border.fg = 'white');
        this.inputBox.on('blur', () => this.inputBox.style.border.fg = 'green');

        // Initial focus
        this.chatList.focus();
    }

    /**
     * Get the screen instance
     * @returns {Object} Blessed screen instance
     */
    getScreen() {
        return this.screen;
    }

    /**
     * Get the chat list instance
     * @returns {Object} Blessed list instance
     */
    getChatList() {
        return this.chatList;
    }

    /**
     * Get the message box instance
     * @returns {Object} Blessed box instance
     */
    getMessageBox() {
        return this.messageBox;
    }

    /**
     * Get the input box instance
     * @returns {Object} Blessed textbox instance
     */
    getInputBox() {
        return this.inputBox;
    }

    /**
     * Get the status bar instance
     * @returns {Object} Blessed box instance
     */
    getStatusBar() {
        return this.statusBar;
    }

    /**
     * Render the interface
     */
    render() {
        this.screen.render();
    }

    /**
     * Show chat list and adjust message box width
     */
    showChatList() {
        this.chatList.show();
        this.messageBox.left = '30%';
        this.messageBox.width = '70%';
        this.inputBox.left = '30%';
        this.inputBox.width = '70%';
        this.screen.render();
    }

    /**
     * Hide chat list and expand message box
     */
    hideChatList() {
        this.chatList.hide();
        this.messageBox.left = 0;
        this.messageBox.width = '100%';
        this.inputBox.left = 0;
        this.inputBox.width = '100%';
        this.screen.render();
    }
}

module.exports = Interface; 