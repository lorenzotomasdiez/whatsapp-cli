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
    QUIT: ['C-c'],                    // Control-c para salir de la aplicación
    FOCUS_CHAT_LIST: ['h'],           // h para ir a la lista de chats
    FOCUS_CHAT: ['l'],               // l para ir al área de mensajes
    FOCUS_INPUT: ['i'],               // i para modo inserción
    REFRESH: ['r'],                   // r para refrescar
    RETURN_TO_NORMAL: ['escape'],     // Escape para volver al modo normal
    CLEAR_CHAT: ['escape'],           // Escape en modo normal limpia el chat
    NAV_UP: ['k'],                    // k para navegar hacia arriba
    NAV_DOWN: ['j'],                  // j para navegar hacia abajo
    SELECT: ['enter'],                // Enter para seleccionar
    SEND: ['enter']                   // Enter para enviar mensaje
};

module.exports = {
    WHATSAPP_LOGO,
    MATRIX_CONFIG,
    SESSION_CONFIG,
    KEY_BINDINGS
}; 