/**
 * Vim-style keyboard shortcuts handler for the WhatsApp Terminal Client
 */

const { KEY_BINDINGS } = require('../utils/constants');
const logger = require('../utils/logger');
const blessed = require('blessed');

class ShortcutHandler {
    constructor(screen, chatList, inputBox, messageBox, statusBar, client, ui) {
        this.screen = screen;
        this.chatList = chatList;
        this.inputBox = inputBox;
        this.messageBox = messageBox;
        this.statusBar = statusBar;
        this.client = client;
        this.ui = ui;
        this.mode = 'NORMAL'; // NORMAL, INSERT, CHAT, PROMPT
        this.commandBuffer = '';
        this.inCommandMode = false;
        this.previousMode = 'NORMAL';
        this.currentView = 'MATRIX'; // MATRIX, CHAT_LIST, CHAT, HELP, PROMPT
        
        // Referencias a los handlers para evitar duplicaciones
        this.mainKeypressHandler = null;
        this.currentNumberHandler = null;
        this.currentHelpHandler = null;
        this.currentSearchHandler = null;
        
        // Contador para rastrear eventos keypress
        this.keypressCount = 0;
        
        this._updateStatusBar();
    }

    /**
     * Update the status bar with current mode and help text
     * @param {string} helpText - Optional help text to display
     */
    _updateStatusBar(helpText = '') {
        const modeText = this.mode === 'NORMAL' ? ' NORMAL ' :
                        this.mode === 'INSERT' ? ' INSERT ' :
                        this.mode === 'CHAT' ? ' CHAT ' :
                        this.mode === 'PROMPT' ? ' PROMPT ' :
                        this.mode === 'PROMPT_EDIT' ? ' PROMPT EDIT ' :
                        this.mode === 'HELP' ? ' HELP ' : ' -- ';
        
        const defaultHelp = this.mode === 'NORMAL' ? ':help for commands │ :p for prompts' :
                          this.mode === 'INSERT' ? 'Esc: normal mode │ Enter: send' :
                          this.mode === 'CHAT' ? 'i: write │ h: chats │ r: refresh │ Esc: back' :
                          this.mode === 'PROMPT' ? 'o: new │ e: edit │ dd: delete │ :help for more' :
                          this.mode === 'PROMPT_EDIT' ? ':w to save │ Esc: cancel' :
                          this.mode === 'HELP' ? 'Press any key to close help' : '';
        
        const separator = helpText ? ' │ ' : '';
        const finalHelp = helpText || defaultHelp;
        
        this.statusBar.setContent(
            `{black-bg}{white-fg}${modeText}{/}` +
            `{green-bg}{white-fg}${separator}${finalHelp}{/}`
        );
        this.screen.render();
    }

    /**
     * Initialize all keyboard shortcuts
     */
    setupShortcuts() {
        // Eliminar todos los listeners de keypress existentes para evitar duplicados
        this.screen.removeAllListeners('keypress');
        this.inputBox.removeAllListeners('keypress');
        
        // Agregar un listener de debug para rastrear todos los eventos keypress en la pantalla
        this.screen.on('keypress', (ch, key) => {
            this.keypressCount++;
            logger.keypress('Screen', 'Keypress event', {
                count: this.keypressCount,
                char: ch,
                key: key ? key.name : 'none',
                mode: this.mode,
                view: this.currentView,
                source: 'screen',
                timestamp: new Date().toISOString()
            });
        });
        
        // Agregar un listener de debug para rastrear todos los eventos keypress en el inputBox
        this.inputBox.on('keypress', (ch, key) => {
            this.keypressCount++;
            logger.keypress('InputBox', 'Keypress event', {
                count: this.keypressCount,
                char: ch,
                key: key ? key.name : 'none',
                mode: this.mode,
                view: this.currentView,
                source: 'inputBox',
                timestamp: new Date().toISOString()
            });
        });
        
        this._setupGlobalShortcuts();
        this._setupNormalModeShortcuts();
        this._setupInputModeShortcuts();
        this._setupChatModeShortcuts();
        this._setupPromptModeShortcuts();
        
        // AI feedback shortcuts
        this.screen.key(['C-p'], () => {
            logger.debug('ShortcutHandler', 'Positive AI feedback shortcut triggered');
            this._handlePositiveFeedback();
        });
        
        this.screen.key(['C-n'], () => {
            logger.debug('ShortcutHandler', 'Negative AI feedback shortcut triggered');
            this._handleNegativeFeedback();
        });
        
        // Show AI metrics
        this.screen.key(['C-m'], () => {
            logger.debug('ShortcutHandler', 'Show AI metrics shortcut triggered');
            this.screen.emit('show-ai-metrics');
        });
        
        logger.info('ShortcutHandler', 'Shortcuts setup completed');
    }

    /**
     * Set up global shortcuts that work in all modes
     */
    _setupGlobalShortcuts() {
        // Quit application
        this.screen.key(KEY_BINDINGS.QUIT, async () => {
            this.messageBox.setContent('Closing application...');
            this.screen.render();
            await this.client.destroy();
            process.exit(0);
        });

        // Refresh messages
        this.screen.key(KEY_BINDINGS.REFRESH, async () => {
            if (this.mode === 'CHAT') {
                await this._refreshCurrentChat();
            }
        });
    }

    /**
     * Set up shortcuts for normal (navigation) mode
     */
    _setupNormalModeShortcuts() {
        // Desactivar los manejadores de teclas predeterminados del chatList
        this.chatList.removeAllListeners('keypress');
        
        // Desactivar los manejadores de teclas predeterminados del messageBox
        this.messageBox.removeAllListeners('keypress');

        // Focus chat list (h - left movement in Vim)
        this.screen.key(KEY_BINDINGS.FOCUS_CHAT_LIST, () => {
            if (this.mode === 'NORMAL' || this.mode === 'CHAT') {
                this.ui.showChatList();
                this._focusChatList();
            }
        });

        // Focus chat area (l - right movement in Vim)
        this.screen.key(KEY_BINDINGS.FOCUS_CHAT, () => {
            if ((this.mode === 'NORMAL' || this.mode === 'CHAT') && this.client.getSelectedChat()) {
                this.ui.hideChatList();
                this.messageBox.focus();
                this._updateStatusBar('j/k: scroll │ h: chats │ i: write │ r: refresh │ Esc: back');
            }
        });

        // Enter insert mode (i)
        this.screen.key(KEY_BINDINGS.FOCUS_INPUT, () => {
            if (this.mode === 'NORMAL' || this.mode === 'CHAT') {
                this._enterInsertMode();
            }
        });

        // Navigation in chat list - custom implementation
        this.screen.key(KEY_BINDINGS.NAV_DOWN, () => {
            if ((this.mode === 'NORMAL' || this.mode === 'CHAT') && this.chatList.focused) {
                const currentPosition = this.chatList.selected;
                if (currentPosition !== null && currentPosition < this.chatList.items.length - 1) {
                    this.chatList.select(currentPosition + 1);
                } else if (currentPosition === null && this.chatList.items.length > 0) {
                    this.chatList.select(0);
                }
                this.screen.render();
            }
        });

        this.screen.key(KEY_BINDINGS.NAV_UP, () => {
            if ((this.mode === 'NORMAL' || this.mode === 'CHAT') && this.chatList.focused) {
                const currentPosition = this.chatList.selected;
                if (currentPosition !== null && currentPosition > 0) {
                    this.chatList.select(currentPosition - 1);
                }
                this.screen.render();
            }
        });

        // Select chat (enter)
        this.chatList.key('enter', () => {
            if ((this.mode === 'NORMAL' || this.mode === 'CHAT') && !this.inCommandMode && this.mode !== 'HELP') {
                const selectedIndex = this.chatList.selected;
                this._selectChat(selectedIndex);
                this.mode = 'CHAT';
                this.ui.hideChatList();
                this._updateStatusBar('j/k: scroll │ h: chats │ l: messages │ i: write │ r: refresh │ Esc: back');
            }
        });

        // Clear chat selection (Esc in chat mode)
        this.screen.key(KEY_BINDINGS.CLEAR_CHAT, () => {
            if (this.mode === 'CHAT') {
                this.mode = 'NORMAL';
                this.screen.emit('start-matrix');
                this.chatList.emit('clear-selection');
                this.ui.showChatList();
                this._updateStatusBar('j/k: navigate │ Enter: select chat');
            }
        });

        // Scroll chat messages - custom implementation
        this.screen.key(['j', 'down'], () => {
            if (this.mode === 'CHAT' && this.messageBox.focused) {
                this.messageBox.scroll(1);
                this.screen.render();
            }
        });

        this.screen.key(['k', 'up'], () => {
            if (this.mode === 'CHAT' && this.messageBox.focused) {
                this.messageBox.scroll(-1);
                this.screen.render();
            }
        });
    }

    /**
     * Set up shortcuts for insert (input) mode
     */
    _setupInputModeShortcuts() {
        // Eliminar todos los listeners existentes para evitar duplicados
        this.inputBox.removeAllListeners('keypress');
        this.inputBox.removeAllListeners('submit');
        this.inputBox.removeAllListeners('cancel');
        
        logger.debug('ShortcutHandler', 'Setting up input mode shortcuts');
        
        // Manejar el envío de mensajes con submit
        this.inputBox.on('submit', async (text) => {
            if (this.mode === 'INSERT') {
                logger.debug('ShortcutHandler', 'Submit event triggered', { messageLength: text ? text.length : 0 });
                
                // Enviar el mensaje
                const message = text ? text.trim() : '';
                if (message) {
                    this.inputBox.emit('send-message', message);
                }
                
                // Limpiar el inputBox y mantener el foco
                this.inputBox.clearValue();
                this.inputBox.focus();
                
                // Reactivar la entrada de texto si el método está disponible
                if (typeof this.inputBox.readInput === 'function') {
                    this.inputBox.readInput();
                }
                
                this.screen.render();
            }
        });
        
        // Manejar la cancelación (Esc)
        this.inputBox.on('cancel', () => {
            if (this.mode === 'INSERT') {
                logger.debug('ShortcutHandler', 'Cancel event triggered');
                this._exitInsertMode();
            }
        });
        
        // Configurar teclas específicas para el modo inserción
        this.inputBox.key('escape', () => {
            if (this.mode === 'INSERT') {
                logger.debug('ShortcutHandler', 'Escape key pressed');
                this._exitInsertMode();
            }
        });
        
        logger.debug('ShortcutHandler', 'Input mode shortcuts setup completed');
    }

    /**
     * Set up shortcuts for chat mode
     */
    _setupChatModeShortcuts() {
        // Additional chat-specific shortcuts can be added here
    }

    /**
     * Set up shortcuts for prompt management
     */
    _setupPromptModeShortcuts() {
        // Command mode - Usar un nombre de función para poder eliminar este listener específico si es necesario
        const keypressHandler = (ch, key) => {
            if (this.mode === 'HELP') {
                // Si estamos en modo help, cualquier tecla nos saca
                this.mode = this.previousMode;
                if (this.previousMode === 'CHAT') {
                    this.screen.emit('refresh-chat');
                } else {
                    this.screen.emit('start-matrix');
                }
                this._updateStatusBar();
                return false;
            }

            // Si estamos en modo comando, capturar todos los eventos de teclado
            if (this.inCommandMode) {
                if (key && key.name === 'escape') {
                    this.commandBuffer = '';
                    this.inCommandMode = false;
                    this._updateStatusBar();
                    return false;
                }
                if (key && key.name === 'enter') {
                    const command = this.commandBuffer.slice(1);
                    this.commandBuffer = '';
                    this.inCommandMode = false;
                    this._handleCommand(command);
                    key.defaultPrevented = true;
                    return false;
                }
                if (key && key.name === 'backspace') {
                    this.commandBuffer = this.commandBuffer.slice(0, -1);
                    if (this.commandBuffer === '') {
                        this.inCommandMode = false;
                        this._updateStatusBar();
                        return false;
                    }
                } else if (ch) {
                    this.commandBuffer += ch;
                }
                this._updateStatusBar(this.commandBuffer);
                return false;
            }

            // Entrar en modo comando
            if (ch === ':' && !this.inCommandMode) {
                this.inCommandMode = true;
                this.commandBuffer = ':';
                this._updateStatusBar(this.commandBuffer);
                return false;
            }
        };
        
        // Guardar la referencia al handler para poder eliminarlo si es necesario
        this.mainKeypressHandler = keypressHandler;
        this.screen.on('keypress', keypressHandler);

        // Create new prompt (o - open new line in Vim)
        this.screen.key(KEY_BINDINGS.CREATE_PROMPT, () => {
            if (this.mode === 'PROMPT') {
                this.screen.emit('create-prompt');
                this._updateStatusBar('-- INSERT -- │ :w or Ctrl+S: save │ Esc: cancel');
            }
        });

        // Edit prompt (e - edit in Vim)
        this.screen.key(KEY_BINDINGS.EDIT_PROMPT, () => {
            if (this.mode === 'PROMPT') {
                const handler = (num) => {
                    this.screen.emit('edit-prompt', num - 1);
                    this._updateStatusBar('-- INSERT -- │ :w or Ctrl+S: save │ Esc: cancel');
                };
                this._handleNumberInput(handler);
            }
        });

        // Delete prompt (dd - delete line in Vim)
        let lastKeyTime = 0;
        let deleteCount = 0;
        this.screen.key('d', () => {
            if (this.mode === 'PROMPT') {
                const now = Date.now();
                if (now - lastKeyTime < 300) {
                    deleteCount++;
                    if (deleteCount === 2) {
                        const handler = (num) => {
                            this.screen.emit('delete-prompt', num - 1);
                        };
                        this._handleNumberInput(handler);
                        deleteCount = 0;
                    }
                } else {
                    deleteCount = 1;
                }
                lastKeyTime = now;
            }
        });

        // Yank prompt (y - yank in Vim)
        this.screen.key(KEY_BINDINGS.YANK_PROMPT, () => {
            if (this.mode === 'PROMPT') {
                const handler = (num) => {
                    this.screen.emit('yank-prompt', num - 1);
                };
                this._handleNumberInput(handler);
            }
        });

        // Paste prompt (p - paste in Vim)
        this.screen.key(KEY_BINDINGS.PASTE_PROMPT, () => {
            if (this.mode === 'PROMPT') {
                this.screen.emit('paste-prompt');
            }
        });

        // Search prompts (/)
        this.screen.key(KEY_BINDINGS.SEARCH_PROMPTS, () => {
            if (this.mode === 'PROMPT') {
                this._updateStatusBar('Search: ');
                let searchTerm = '';
                
                // Eliminar cualquier handler de búsqueda anterior que pudiera existir
                if (this.currentSearchHandler) {
                    this.screen.removeListener('keypress', this.currentSearchHandler);
                }
                
                const searchHandler = (ch, key) => {
                    if (key && key.name === 'escape') {
                        this.screen.removeListener('keypress', searchHandler);
                        this.currentSearchHandler = null;
                        this._updateStatusBar();
                        return;
                    }
                    if (key && key.name === 'enter') {
                        this.screen.removeListener('keypress', searchHandler);
                        this.currentSearchHandler = null;
                        this.screen.emit('search-prompts', searchTerm);
                        return;
                    }
                    if (key && key.name === 'backspace') {
                        searchTerm = searchTerm.slice(0, -1);
                    } else if (ch) {
                        searchTerm += ch;
                    }
                    this._updateStatusBar(`Search: ${searchTerm}`);
                };
                
                // Guardar referencia al handler actual
                this.currentSearchHandler = searchHandler;
                this.screen.on('keypress', searchHandler);
            }
        });

        // Next/Previous search result (n/N)
        this.screen.key(KEY_BINDINGS.NEXT_PROMPT, () => {
            if (this.mode === 'PROMPT') {
                this.screen.emit('next-search-result');
            }
        });

        this.screen.key(KEY_BINDINGS.PREV_PROMPT, () => {
            if (this.mode === 'PROMPT') {
                this.screen.emit('prev-search-result');
            }
        });

        // Exit prompt mode (Esc)
        this.screen.key(KEY_BINDINGS.CLEAR_CHAT, () => {
            if (this.mode === 'PROMPT') {
                this.mode = 'NORMAL';
                this.screen.emit('start-matrix');
                this._updateStatusBar();
            }
        });
    }

    /**
     * Handle number input after a command key
     */
    _handleNumberInput(callback) {
        let number = '';
        
        // Eliminar cualquier handler de número anterior que pudiera existir
        if (this.currentNumberHandler) {
            this.screen.removeListener('keypress', this.currentNumberHandler);
        }
        
        const numberHandler = (ch, key) => {
            if (key && key.name === 'escape') {
                this.screen.removeListener('keypress', numberHandler);
                this.currentNumberHandler = null;
                return;
            }
            if (ch && /[0-9]/.test(ch)) {
                number += ch;
            } else if (key && key.name === 'enter' && number) {
                callback(parseInt(number));
                this.screen.removeListener('keypress', numberHandler);
                this.currentNumberHandler = null;
            }
        };
        
        // Guardar referencia al handler actual
        this.currentNumberHandler = numberHandler;
        this.screen.on('keypress', numberHandler);
    }

    /**
     * Focus the chat list and update mode
     */
    _focusChatList() {
        this._switchView('CHAT_LIST');
        this._updateStatusBar('j/k: navigate │ Enter: select chat');
    }

    /**
     * Enter insert mode for message input
     */
    _enterInsertMode() {
        logger.debug('ShortcutHandler', 'Entering insert mode');
        
        // Eliminar cualquier listener duplicado antes de entrar en modo inserción
        this.inputBox.removeAllListeners('keypress');
        this.inputBox.removeAllListeners('submit');
        this.inputBox.removeAllListeners('cancel');
        
        // Configurar nuevamente los atajos para el modo inserción
        this._setupInputModeShortcuts();
        
        this.mode = 'INSERT';
        
        // Asegurar que el inputBox esté visible y listo para recibir entrada
        this.inputBox.show();
        this.inputBox.clearValue();
        this.inputBox.focus();
        
        // Activar manualmente la entrada de texto ya que inputOnFocus está desactivado
        // Usar readInput solo si está disponible
        if (typeof this.inputBox.readInput === 'function') {
            this.inputBox.readInput();
        }
        
        this._updateStatusBar('Esc: back │ Enter: send message');
        
        logger.debug('ShortcutHandler', 'Insert mode entered successfully');
    }

    /**
     * Exit insert mode and return to previous mode
     */
    _exitInsertMode() {
        logger.debug('ShortcutHandler', 'Exiting insert mode');
        
        // Eliminar los listeners del inputBox al salir del modo inserción
        this.inputBox.removeAllListeners('keypress');
        this.inputBox.removeAllListeners('submit');
        this.inputBox.removeAllListeners('cancel');
        
        // Detener la entrada de texto usando métodos disponibles
        this.inputBox.setValue('');
        this.inputBox.clearValue();
        this.inputBox.hide();
        
        this.mode = this.chatList.selected !== null ? 'CHAT' : 'NORMAL';
        if (this.mode === 'CHAT') {
            this._updateStatusBar('j/k: navigate │ i: write │ r: refresh │ Esc: back');
        } else {
            this._updateStatusBar('j/k: navigate │ Enter: select chat');
        }
        
        logger.debug('ShortcutHandler', 'Insert mode exited successfully', { newMode: this.mode });
    }

    /**
     * Select a chat from the list
     * @param {number} index - Selected chat index
     */
    async _selectChat(index) {
        this._switchView('CHAT');
        this.messageBox.setContent('Loading messages...');
        this.screen.render();
        this.chatList.emit('select-chat', index);
    }

    /**
     * Send a message in the current chat
     */
    async _sendMessage() {
        const message = this.inputBox.getValue();
        logger.debug('ShortcutHandler', 'Sending message', { 
            messageLength: message ? message.length : 0,
            isEmpty: !message || !message.trim(),
            mode: this.mode
        });
        
        if (message && message.trim()) {
            try {
                // Enviar el mensaje
                this.inputBox.emit('send-message', message);
                logger.debug('ShortcutHandler', 'Message sent successfully');
                
                // Limpiar el inputBox después de enviar
                this.inputBox.clearValue();
                this.screen.render();
                
                // Asegurarnos de que el inputBox mantenga el foco y la entrada de texto
                this.inputBox.focus();
                
                // Reactivar la entrada de texto si el método está disponible
                if (typeof this.inputBox.readInput === 'function') {
                    this.inputBox.readInput();
                }
            } catch (error) {
                logger.error('ShortcutHandler', 'Error sending message', error);
            }
        } else {
            logger.debug('ShortcutHandler', 'Empty message not sent');
            // Mantener el foco y la entrada de texto incluso si el mensaje está vacío
            this.inputBox.focus();
            
            // Reactivar la entrada de texto si el método está disponible
            if (typeof this.inputBox.readInput === 'function') {
                this.inputBox.readInput();
            }
        }
    }

    /**
     * Refresh the current chat messages
     */
    async _refreshCurrentChat() {
        this.screen.emit('refresh-chat');
    }

    /**
     * Show help screen
     * @private
     */
    _showHelp() {
        // Save current state
        this.previousMode = this.mode;
        this.mode = 'HELP';
        
        // Create help content
        let content = '{center}{green-fg}=== WhatsApp Terminal Client Help ==={/}{/center}\n\n';
        
        content += '{yellow-fg}Global Commands{/}\n';
        content += '  :help           - Show this help\n';
        content += '  :q              - Quit application\n';
        content += '  :p, :prompts    - Show prompts view\n\n';
        
        content += '{yellow-fg}Normal Mode{/}\n';
        content += '  j, k            - Navigate up/down in lists\n';
        content += '  h               - Show chat list\n';
        content += '  l               - Focus chat messages\n';
        content += '  i               - Enter insert mode\n';
        content += '  Enter           - Select chat\n';
        content += '  Esc             - Return to normal mode\n\n';
        
        content += '{yellow-fg}Chat Mode{/}\n';
        content += '  j, k            - Scroll messages\n';
        content += '  i               - Write message\n';
        content += '  r               - Refresh messages\n';
        content += '  h               - Show chat list\n';
        content += '  Esc             - Exit chat\n\n';
        
        content += '{yellow-fg}Insert Mode{/}\n';
        content += '  Enter           - Send message\n';
        content += '  Esc             - Exit insert mode\n\n';
        
        content += '{yellow-fg}Prompt Mode{/}\n';
        content += '  o               - Create new prompt\n';
        content += '  e + number      - Edit prompt (e.g., e1)\n';
        content += '  dd + number     - Delete prompt (e.g., dd1)\n';
        content += '  y + number      - Yank (copy) prompt\n';
        content += '  p               - Paste yanked prompt\n';
        content += '  /               - Search prompts\n';
        content += '  n               - Next search result\n';
        content += '  N               - Previous search result\n';
        content += '  :w              - Save prompt\n';
        content += '  Esc             - Exit prompt mode\n\n';
        
        content += '{yellow-fg}AI Interaction{/}\n';
        content += '  Ctrl+p          - Give positive feedback for last AI response\n';
        content += '  Ctrl+n          - Give negative feedback for last AI response\n';
        content += '  Ctrl+m          - Show AI usage metrics\n';
        content += '  /p <slug>       - Use AI with prompt template (e.g., /p mimic)\n\n';
        
        content += '{center}{gray-fg}Press any key to close help{/}{/center}';
        
        // Store current message box content to restore later
        const previousContent = this.messageBox.getContent();
        
        // Show help
        this.messageBox.setContent(content);
        this.messageBox.scrollTo(0);
        this.screen.render();
        
        // Eliminar cualquier handler de ayuda anterior que pudiera existir
        if (this.currentHelpHandler) {
            this.screen.removeListener('keypress', this.currentHelpHandler);
        }
        
        // Set up one-time keypress handler
        const helpHandler = (ch, key) => {
            // Restore previous state
            this.mode = this.previousMode;
            this.messageBox.setContent(previousContent);
            this._updateStatusBar();
            this.screen.render();
            
            // Remove this handler
            this.screen.removeListener('keypress', helpHandler);
            this.currentHelpHandler = null;
        };
        
        // Guardar referencia al handler actual
        this.currentHelpHandler = helpHandler;
        
        // Add the help handler
        this.screen.once('keypress', helpHandler);
    }

    /**
     * Handle command mode input
     */
    _handleCommand(command) {
        // Eliminar cualquier handler de ayuda anterior que pudiera existir
        if (this.currentHelpHandler) {
            this.screen.removeListener('keypress', this.currentHelpHandler);
            this.currentHelpHandler = null;
        }
        
        switch (command.toLowerCase()) {
            case 'help':
                this._showHelp();
                break;
            case 'p':
            case 'prompts':
                if (this.mode !== 'PROMPT') {
                    this.mode = 'PROMPT';
                    this._createPrompt();
                }
                break;
            case 'w':
                if (this.mode === 'PROMPT_EDIT') {
                    const content = this.inputBox.getValue();
                    if (content.trim()) {
                        this.screen.emit('save-prompt', content);
                        this.mode = 'PROMPT';
                        this._updateStatusBar('Prompt saved successfully');
                    } else {
                        this._updateStatusBar('Error: Prompt cannot be empty');
                    }
                }
                break;
            case 'q':
                this.messageBox.setContent('Closing application...');
                this.screen.render();
                this.client.destroy();
                process.exit(0);
                break;
            default:
                this._updateStatusBar(`Unknown command: ${command}`);
                break;
        }
    }

    /**
     * Switch to a specific view and update UI accordingly
     * @param {string} view - The view to switch to
     */
    _switchView(view) {
        this.currentView = view;
        
        // Stop matrix animation if needed
        if (this.currentView !== 'MATRIX') {
            this.screen.emit('stop-matrix');
        }
        
        // Show/hide components based on view and mode
        switch (view) {
            case 'MATRIX':
                this.messageBox.show();
                this.ui.hideChatList();
                if (this.mode !== 'INSERT') {
                    this.inputBox.hide();
                }
                this.screen.emit('start-matrix');
                break;
            case 'CHAT_LIST':
                this.messageBox.show();
                this.ui.showChatList();
                this.chatList.focus();
                if (this.mode === 'INSERT') {
                    this.inputBox.show();
                } else {
                    this.inputBox.hide();
                }
                break;
            case 'CHAT':
                this.messageBox.show();
                // Don't hide chat list in CHAT view
                this.inputBox.show();
                break;
            case 'HELP':
                this.messageBox.show();
                this.messageBox.scrollTo(0);
                this.messageBox.focus();
                if (this.mode === 'INSERT') {
                    this.inputBox.show();
                } else {
                    this.inputBox.hide();
                }
                break;
            case 'PROMPT':
                this.messageBox.show();
                this.inputBox.show();
                break;
        }
        
        this.screen.render();
    }

    /**
     * Handle positive feedback for AI response
     * @private
     */
    _handlePositiveFeedback() {
        logger.debug('ShortcutHandler', 'Handling positive AI feedback');
        
        // Create a popup for optional feedback text
        const popup = blessed.box({
            top: 'center',
            left: 'center',
            width: '50%',
            height: '30%',
            content: '{center}{bold}Positive Feedback{/bold}{/center}\n\nEnter optional feedback text:',
            tags: true,
            border: {
                type: 'line'
            },
            style: {
                fg: 'white',
                bg: 'black',
                border: {
                    fg: 'green'
                }
            }
        });
        
        const feedbackInput = blessed.textarea({
            parent: popup,
            top: 4,
            left: 2,
            right: 2,
            height: '40%',
            inputOnFocus: true,
            border: {
                type: 'line'
            },
            style: {
                fg: 'white',
                bg: 'black',
                border: {
                    fg: 'white'
                }
            }
        });
        
        const submitButton = blessed.button({
            parent: popup,
            bottom: 2,
            left: 'center',
            width: '50%',
            height: 3,
            content: '{center}Submit{/center}',
            tags: true,
            border: {
                type: 'line'
            },
            style: {
                fg: 'black',
                bg: 'green',
                border: {
                    fg: 'white'
                },
                focus: {
                    bg: 'brightgreen'
                }
            }
        });
        
        // Add the popup to the screen
        this.screen.append(popup);
        
        // Focus the input
        feedbackInput.focus();
        
        // Handle submit button click
        submitButton.on('press', () => {
            const feedback = feedbackInput.getValue();
            this.screen.remove(popup);
            this.screen.render();
            this.screen.emit('ai-feedback-positive', feedback);
        });
        
        // Handle escape key to cancel
        popup.key(['escape'], () => {
            this.screen.remove(popup);
            this.screen.render();
        });
        
        // Handle enter key to submit
        feedbackInput.key(['enter'], () => {
            submitButton.press();
        });
        
        this.screen.render();
    }

    /**
     * Handle negative feedback for AI response
     * @private
     */
    _handleNegativeFeedback() {
        logger.debug('ShortcutHandler', 'Handling negative AI feedback');
        
        // Create a popup for optional feedback text
        const popup = blessed.box({
            top: 'center',
            left: 'center',
            width: '50%',
            height: '30%',
            content: '{center}{bold}Negative Feedback{/bold}{/center}\n\nEnter optional feedback text:',
            tags: true,
            border: {
                type: 'line'
            },
            style: {
                fg: 'white',
                bg: 'black',
                border: {
                    fg: 'red'
                }
            }
        });
        
        const feedbackInput = blessed.textarea({
            parent: popup,
            top: 4,
            left: 2,
            right: 2,
            height: '40%',
            inputOnFocus: true,
            border: {
                type: 'line'
            },
            style: {
                fg: 'white',
                bg: 'black',
                border: {
                    fg: 'white'
                }
            }
        });
        
        const submitButton = blessed.button({
            parent: popup,
            bottom: 2,
            left: 'center',
            width: '50%',
            height: 3,
            content: '{center}Submit{/center}',
            tags: true,
            border: {
                type: 'line'
            },
            style: {
                fg: 'black',
                bg: 'red',
                border: {
                    fg: 'white'
                },
                focus: {
                    bg: 'brightred'
                }
            }
        });
        
        // Add the popup to the screen
        this.screen.append(popup);
        
        // Focus the input
        feedbackInput.focus();
        
        // Handle submit button click
        submitButton.on('press', () => {
            const feedback = feedbackInput.getValue();
            this.screen.remove(popup);
            this.screen.render();
            this.screen.emit('ai-feedback-negative', feedback);
        });
        
        // Handle escape key to cancel
        popup.key(['escape'], () => {
            this.screen.remove(popup);
            this.screen.render();
        });
        
        // Handle enter key to submit
        feedbackInput.key(['enter'], () => {
            submitButton.press();
        });
        
        this.screen.render();
    }
}

module.exports = ShortcutHandler; 