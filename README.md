# Terminal-Warap

Terminal-Warap is an interactive terminal application that allows you to manage WhatsApp Web directly from the command line. This application combines the power of WhatsApp Web with an elegant and functional terminal user interface.

## 🚀 Features

- Interactive terminal interface using blessed
- WhatsApp Web integration
- Message and chat management from the terminal
- Intuitive and responsive user interface
- QR code authentication support

## 📋 Prerequisites

- Node.js (recommended version: 14.0.0 or higher)
- npm (comes with Node.js)
- An active WhatsApp account on your phone

## 🛠️ Installation

1. Clone the repository:
```bash
git clone https://github.com/lorenzotomasdiez/whatsapp-cli
cd terminal-warap
```

2. Install dependencies:
```bash
npm install
```

## 🚀 Usage

To start the application, run:
```bash
npm start
```

When starting for the first time, a QR code will be displayed in the terminal. Scan this code with WhatsApp on your phone to authenticate the session.

## 📦 Project Structure

```
terminal-warap/
├── src/
│   ├── index.js          # Application entry point
│   ├── ui/               # User interface components
│   ├── handlers/         # Event handlers and logic
│   ├── client/          # WhatsApp client configuration
│   └── utils/           # Utilities and helpers
├── package.json
└── README.md
```

## 🔧 Technologies Used

- [whatsapp-web.js](https://github.com/pedroslopez/whatsapp-web.js) - WhatsApp Web client
- [blessed](https://github.com/chjj/blessed) - Terminal interface
- [qrcode-terminal](https://github.com/gtanner/qrcode-terminal) - Terminal QR code generation
- [readline](https://nodejs.org/api/readline.html) - Terminal input/output handling

## 📄 License

This project is licensed under the ISC License - see the [LICENSE](LICENSE) file for details.

## 🤝 Contributing

Contributions are welcome. Please open an issue first to discuss what you would like to change.

1. Fork the project
2. Create your feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## ✨ Acknowledgments

- To the WhatsApp Web.js community for providing an excellent library
- To the blessed developers for making it possible to create amazing terminal interfaces 