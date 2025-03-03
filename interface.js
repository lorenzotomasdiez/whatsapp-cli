const blessed = require('blessed');

// Crear pantalla
const screen = blessed.screen({
    smartCSR: true,
    title: 'WhatsApp Terminal Hack'
});

// Panel de chats (izquierda)
const chatList = blessed.list({
    parent: screen,
    width: '30%',
    height: '100%',
    left: 0,
    top: 0,
    border: {
        type: 'line',
        fg: 'green'
    },
    style: {
        selected: {
            bg: 'green',
            fg: 'black'
        },
        fg: 'green'
    },
    label: ' Chats ',
    keys: true,
    vi: true
});

// Panel de mensajes (derecha)
const messageBox = blessed.box({
    parent: screen,
    width: '70%',
    height: '90%',
    right: 0,
    top: 0,
    border: {
        type: 'line',
        fg: 'green'
    },
    style: {
        fg: 'white'
    },
    label: ' Mensajes ',
    content: 'Selecciona un chat para ver los mensajes',
    scrollable: true,
    alwaysScroll: true,
    scrollbar: {
        ch: '|',
        bg: 'green'
    }
});

// Input para escribir mensajes
const inputBox = blessed.textbox({
    parent: screen,
    width: '70%',
    height: '10%',
    right: 0,
    bottom: 0,
    border: {
        type: 'line',
        fg: 'green'
    },
    style: {
        fg: 'white'
    },
    label: ' Escribe un mensaje ',
    inputOnFocus: true
});

// Tecla para salir (ESC o Ctrl+C)
screen.key(['escape', 'C-c'], () => process.exit(0));

// Exportar componentes
module.exports = {
    screen,
    chatList,
    messageBox,
    inputBox
};