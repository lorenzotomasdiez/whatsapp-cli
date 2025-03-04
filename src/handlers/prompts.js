/**
 * Prompt management handler for the WhatsApp Terminal Client
 */

const fs = require('fs');

class PromptHandler {
    constructor(messageBox, inputBox, screen) {
        this.messageBox = messageBox;
        this.inputBox = inputBox;
        this.screen = screen;
        this.prompts = [];
        this.mode = 'VIEW'; // VIEW, EDIT, CREATE
        this.selectedPromptIndex = -1;
        this.searchResults = [];
        this.currentSearchIndex = -1;
        this.lastSearchTerm = '';
        this.yankBuffer = null;
        this.commandMode = false;
    }

    /**
     * Initialize prompt handler
     */
    initialize() {
        this._setupEventHandlers();
    }

    /**
     * Save prompts to file
     */
    _savePrompts() {
        try {
            fs.writeFileSync(this.promptsFile, JSON.stringify(this.prompts, null, 2));
        } catch (error) {
            this.messageBox.setContent(`Error saving prompts: ${error.message}`);
            this.screen.render();
        }
    }

    /**
     * Set up event handlers for prompt-related actions
     */
    _setupEventHandlers() {
        this.screen.on('create-prompt', () => this._enterCreateMode());
        this.screen.on('edit-prompt', (index) => this._enterEditMode(index));
        this.screen.on('delete-prompt', (index) => this._deletePrompt(index));
        this.screen.on('save-prompt', (content) => this._savePrompt(content));
        this.screen.on('show-prompts', () => this._showPrompts());
        this.screen.on('search-prompts', (term) => this._searchPrompts(term));
        this.screen.on('next-search-result', () => this._nextSearchResult());
        this.screen.on('prev-search-result', () => this._prevSearchResult());
        this.screen.on('yank-prompt', (index) => this._yankPrompt(index));
        this.screen.on('paste-prompt', () => this._pastePrompt());
    }

    /**
     * Enter prompt creation mode
     */
    _enterCreateMode() {
        this.mode = 'CREATE';
        this.inputBox.setValue('');
        this.messageBox.setContent('{green-fg}=== Create New Prompt ==={/}\n\n' +
            'Enter your prompt below and press :w or Ctrl+S to save:\n\n' +
            '{yellow-fg}-- INSERT --{/}');
        this.inputBox.focus();
        this.screen.render();
    }

    /**
     * Enter prompt edit mode
     */
    _enterEditMode(index) {
        if (index >= 0 && index < this.prompts.length) {
            this.mode = 'EDIT';
            this.selectedPromptIndex = index;
            this.inputBox.setValue(this.prompts[index].content);
            this.messageBox.setContent(
                `{green-fg}=== Edit Prompt ${index + 1} ==={/}\n\n` +
                'Edit your prompt below and press :w or Ctrl+S to save:\n\n' +
                '{yellow-fg}-- INSERT --{/}'
            );
            this.inputBox.focus();
            this.screen.render();
        }
    }

    /**
     * Save current prompt
     */
    _savePrompt(content) {
        if (!content.trim()) {
            this.messageBox.setContent('Error: Prompt cannot be empty');
            this.screen.render();
            return;
        }

        if (this.mode === 'CREATE') {
            this.prompts.push({
                id: Date.now(),
                content: content.trim(),
                created: new Date().toISOString()
            });
        } else if (this.mode === 'EDIT' && this.selectedPromptIndex >= 0) {
            this.prompts[this.selectedPromptIndex].content = content.trim();
            this.prompts[this.selectedPromptIndex].updated = new Date().toISOString();
        }

        this._savePrompts();
        this._showPrompts();
        this.mode = 'VIEW';
        this.selectedPromptIndex = -1;
    }

    /**
     * Delete a prompt
     */
    _deletePrompt(index) {
        if (index >= 0 && index < this.prompts.length) {
            this.prompts.splice(index, 1);
            this._savePrompts();
            this._showPrompts();
        }
    }

    /**
     * Search prompts
     */
    _searchPrompts(term) {
        if (!term) return;
        
        this.lastSearchTerm = term;
        this.searchResults = this.prompts
            .map((prompt, index) => ({ index, content: prompt.content }))
            .filter(item => item.content.toLowerCase().includes(term.toLowerCase()));
        
        this.currentSearchIndex = 0;
        this._highlightSearchResult();
    }

    /**
     * Move to next search result
     */
    _nextSearchResult() {
        if (this.searchResults.length === 0) return;
        
        this.currentSearchIndex = (this.currentSearchIndex + 1) % this.searchResults.length;
        this._highlightSearchResult();
    }

    /**
     * Move to previous search result
     */
    _prevSearchResult() {
        if (this.searchResults.length === 0) return;
        
        this.currentSearchIndex = (this.currentSearchIndex - 1 + this.searchResults.length) % this.searchResults.length;
        this._highlightSearchResult();
    }

    /**
     * Highlight current search result
     */
    _highlightSearchResult() {
        if (this.searchResults.length === 0) {
            this.messageBox.setContent(`{red-fg}No matches for: ${this.lastSearchTerm}{/}`);
            this.screen.render();
            return;
        }

        const result = this.searchResults[this.currentSearchIndex];
        let content = '{green-fg}=== Saved Prompts ==={/}\n\n';
        
        this.prompts.forEach((prompt, index) => {
            if (index === result.index) {
                content += `{yellow-fg}[${index + 1}] ${prompt.content}{/}\n`;
            } else {
                content += `{white-fg}[${index + 1}]{/} ${prompt.content}\n`;
            }
            content += `{gray-fg}Created: ${new Date(prompt.created).toLocaleString()}{/}\n`;
            if (prompt.updated) {
                content += `{gray-fg}Updated: ${new Date(prompt.updated).toLocaleString()}{/}\n`;
            }
            content += '\n';
        });

        content += `\n{yellow-fg}Search: ${this.lastSearchTerm} (${this.currentSearchIndex + 1}/${this.searchResults.length}){/}\n`;
        content += '\n{yellow-fg}Commands:{/}\n';
        content += 'o: Create new prompt\n';
        content += 'e: Edit prompt\n';
        content += 'dd: Delete prompt\n';
        content += 'y: Yank (copy) prompt\n';
        content += 'p: Paste prompt\n';
        content += '/: Search\n';
        content += 'n: Next result\n';
        content += 'N: Previous result\n';
        content += ':w: Save\n';
        content += 'Esc: Exit prompt view';

        this.messageBox.setContent(content);
        this.screen.render();
    }

    /**
     * Yank (copy) a prompt
     */
    _yankPrompt(index) {
        if (index >= 0 && index < this.prompts.length) {
            this.yankBuffer = this.prompts[index].content;
            this.messageBox.setContent(`{green-fg}Yanked prompt ${index + 1}{/}`);
            this.screen.render();
            setTimeout(() => this._showPrompts(), 1000);
        }
    }

    /**
     * Paste yanked prompt
     */
    _pastePrompt() {
        if (this.yankBuffer) {
            this.prompts.push({
                id: Date.now(),
                content: this.yankBuffer,
                created: new Date().toISOString()
            });
            this._savePrompts();
            this._showPrompts();
        }
    }

    /**
     * Show help information
     */
    _showHelp() {
        let content = '{green-fg}=== WhatsApp Terminal Client Help ==={/}\n\n';
        content += '{yellow-fg}Command Mode (:){/}\n';
        content += '  :p, :prompts    - Show prompts list\n';
        content += '  :w              - Save current prompt\n';
        content += '  :q              - Quit application\n';
        content += '  :help           - Show this help\n\n';
        
        content += '{yellow-fg}Normal Mode{/}\n';
        content += '  h               - Focus chat list\n';
        content += '  l               - Focus chat area\n';
        content += '  j, k            - Navigate up/down\n';
        content += '  i               - Enter insert mode\n';
        content += '  r               - Refresh current view\n';
        content += '  Esc             - Return to normal mode\n\n';
        
        content += '{yellow-fg}Prompt Management{/}\n';
        content += '  o               - Create new prompt\n';
        content += '  e + number      - Edit prompt (e.g., e1)\n';
        content += '  dd + number     - Delete prompt (e.g., dd1)\n';
        content += '  y + number      - Yank (copy) prompt (e.g., y1)\n';
        content += '  p               - Paste yanked prompt\n';
        content += '  /               - Search prompts\n';
        content += '  n               - Next search result\n';
        content += '  N               - Previous search result\n\n';
        
        content += '{yellow-fg}Insert Mode{/}\n';
        content += '  Enter           - Send message/Save prompt\n';
        content += '  Esc             - Exit insert mode\n\n';
        
        content += 'Press any key to return to previous view';

        this.messageBox.setContent(content);
        this.screen.render();

        // Wait for any key press to return
        const handler = (ch, key) => {
            this.screen.removeListener('keypress', handler);
            this._showPrompts();
        };
        this.screen.on('keypress', handler);
    }

    /**
     * Display all prompts
     */
    _showPrompts() {
        if (this.prompts.length === 0) {
            this.messageBox.setContent('{yellow-fg}No prompts saved yet. Press "o" to create a new prompt.\n\n{/}' +
                '{gray-fg}Type :help for command list{/}');
            this.screen.render();
            return;
        }

        let content = '{green-fg}=== Saved Prompts ==={/}\n\n';
        this.prompts.forEach((prompt, index) => {
            content += `{white-fg}[${index + 1}]{/} ${prompt.content}\n`;
            content += `{gray-fg}Created: ${new Date(prompt.created).toLocaleString()}{/}\n`;
            if (prompt.updated) {
                content += `{gray-fg}Updated: ${new Date(prompt.updated).toLocaleString()}{/}\n`;
            }
            content += '\n';
        });

        content += '\n{gray-fg}Type :help for command list{/}';

        this.messageBox.setContent(content);
        this.screen.render();
    }

    /**
     * Enter command mode
     */
    _enterCommandMode() {
        if (!this.commandMode) {
            this.commandMode = true;
            return true;
        }
        return false;
    }

    /**
     * Exit command mode
     */
    _exitCommandMode() {
        this.commandMode = false;
    }
}

module.exports = PromptHandler; 