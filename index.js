const { Client } = require('whatsapp-web.js');
const qrcode = require('qrcode-terminal');
const { screen, chatList, messageBox, inputBox } = require('./interface');

const client = new Client();
let chats = [];
let selectedChat = null;

// Focus handling
screen.key(['tab'], () => {
    if (screen.focused === chatList) {
        inputBox.focus();
    } else {
        chatList.focus();
    }
});

// Focus chat list by default
chatList.focus();

// Función para mostrar mensajes en el panel
function displayMessages(messages) {
    let content = '';
    messages.forEach(msg => {
        const time = new Date(msg.timestamp * 1000).toLocaleTimeString();
        const sender = msg.fromMe ? 'Yo' : 'Ellos';
        content += `{green-fg}[${time}]{/green-fg} {yellow-fg}[${sender}]{/yellow-fg}: ${msg.body}\n\n`;
    });
    messageBox.setContent(content);
    screen.render();
}

// Evento QR
client.on('qr', (qr) => {
    messageBox.setContent('Escanea el QR con tu WhatsApp para conectarte\n\nAbre WhatsApp en tu teléfono:\n1. Ve a Configuración > Dispositivos vinculados\n2. Toca en Vincular un dispositivo\n3. Apunta la cámara al QR');
    screen.render();
});

// Evento Ready
client.on('ready', async () => {
    messageBox.setContent('¡WhatsApp conectado! Selecciona un chat de la lista.');
    
    // Cargar chats
    chats = await client.getChats();
    const chatNames = chats.map(chat => chat.name || chat.id._serialized);
    chatList.setItems(chatNames);
    
    screen.render();
});

// Seleccionar chat
chatList.on('select', async (item, index) => {
    selectedChat = chats[index];
    messageBox.setLabel(` Mensajes: ${selectedChat.name || selectedChat.id._serialized} `);
    
    // Cargar mensajes
    const messages = await selectedChat.fetchMessages({ limit: 10 });
    displayMessages(messages);
});

// Handle input for sending messages
inputBox.key('enter', async () => {
    if (selectedChat && inputBox.getValue().trim()) {
        const message = inputBox.getValue();
        await selectedChat.sendMessage(message);
        inputBox.clearValue();
        screen.render();
    }
});

// Inicializar
client.initialize();
screen.render();