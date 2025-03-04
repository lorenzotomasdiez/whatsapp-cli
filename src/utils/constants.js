/**
 * Constants and configurations for the WhatsApp Terminal Client
 */

const path = require('path');

// ASCII Art for WhatsApp logo
const WHATSAPP_LOGO = `
{bright-green-fg}
⠀⠀⠀⠀⠀⠀⠀⢀⣠⣤⣤⣶⣶⣶⣶⣤⣤⣄⡀⠀⠀⠀⠀⠀⠀⠀
⠀⠀⠀⠀⢀⣤⣾⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣷⣤⡀⠀⠀⠀⠀
⠀⠀⠀⣴⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣦⠀⠀⠀
⠀⢀⣾⣿⣿⣿⣿⡿⠟⠻⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣷⡀⠀
⠀⣾⣿⣿⣿⣿⡟⠀⠀⠀⢹⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣷⠀
⢠⣿⣿⣿⣿⣿⣧⠀⠀⠀⣠⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⡄
⢸⣿⣿⣿⣿⣿⣿⣦⠀⠀⠻⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⡇
⠘⣿⣿⣿⣿⣿⣿⣿⣷⣄⠀⠈⠻⢿⣿⠟⠉⠛⠿⣿⣿⣿⣿⣿⣿⠃
⠀⢿⣿⣿⣿⣿⣿⣿⣿⣿⣷⣄⡀⠀⠀⠀⠀⠀⠀⣼⣿⣿⣿⣿⡿⠀
⠀⠈⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣷⣶⣤⣤⣴⣾⣿⣿⣿⣿⡿⠁⠀
⠀⢠⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⠟⠀⠀⠀
⠀⣾⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⡿⠛⠁⠀⠀⠀⠀
⠠⠛⠛⠛⠉⠁⠀⠈⠙⠛⠛⠿⠿⠿⠿⠛⠛⠋⠁⠀⠀⠀⠀⠀⠀⠀
{/}`;

// Matrix animation configuration
const MATRIX_CONFIG = {
    CHARS: '01',
    DEPTHS: [
        { color: 'bright-green', char: '1', probability: 0.3 },
        { color: 'green', char: '0', probability: 0.5 },
        { color: 'white', char: '1', probability: 0.2 }
    ],
    ANIMATION_SPEED: 50, // 20fps
    DENSITY: 0.5
};

// Session configuration
const SESSION_CONFIG = {
    DIR: path.join(process.cwd(), '.wwebjs_auth'),
    CHAT_LIMIT: 10,
    MESSAGE_LIMIT: 10
};

// Vim-style keybindings
const KEY_BINDINGS = {
    QUIT: [':q', 'C-c'],
    REFRESH: ['r'],
    FOCUS_CHAT_LIST: ['h'],
    FOCUS_CHAT: ['l'],
    FOCUS_INPUT: ['i'],
    NAV_UP: ['k', 'up'],
    NAV_DOWN: ['j', 'down'],
    SELECT: ['enter'],
    CLEAR_CHAT: ['escape'],
    SAVE_PROMPT: [':w', 'C-s'],
    SHOW_PROMPTS: [':prompts', ':p'],
    CREATE_PROMPT: ['o'],
    EDIT_PROMPT: ['e'],
    DELETE_PROMPT: ['dd'],
    YANK_PROMPT: ['y'],
    PASTE_PROMPT: ['p'],
    SEARCH_PROMPTS: ['/'],
    NEXT_PROMPT: ['n'],
    PREV_PROMPT: ['N'],
    RETURN_TO_NORMAL: ['escape'],
    SEND: ['enter']
};

module.exports = {
    WHATSAPP_LOGO,
    MATRIX_CONFIG,
    SESSION_CONFIG,
    KEY_BINDINGS
}; 