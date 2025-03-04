/**
 * Logger utility for the WhatsApp Terminal Client
 * Provides centralized logging functionality for the entire application
 */

const fs = require('fs');
const path = require('path');
const util = require('util');

class Logger {
    constructor() {
        this.logsDir = path.join(process.cwd(), 'logs');
        this.generalLogFile = path.join(this.logsDir, 'app.log');
        this.errorLogFile = path.join(this.logsDir, 'error.log');
        this.keypressLogFile = path.join(this.logsDir, 'keypress.log'); // Archivo específico para eventos keypress
        this.debugMode = process.env.DEBUG === 'true';
        
        // Restaurar el nivel de log a su valor original
        this.logLevel = process.env.LOG_LEVEL || 'info'; // debug, info, warn, error
        
        // Log levels with their priority
        this.levels = {
            debug: 0,
            info: 1,
            warn: 2,
            error: 3
        };
        
        this._setupLogging();
    }
    
    /**
     * Set up logging directory
     * @private
     */
    _setupLogging() {
        try {
            // Create logs directory if it doesn't exist
            if (!fs.existsSync(this.logsDir)) {
                fs.mkdirSync(this.logsDir, { recursive: true });
            }
            
            // Initial log entry
            this.info('Logger', 'Logging system initialized');
        } catch (error) {
            console.error('Error setting up logging directory:', error);
        }
    }
    
    /**
     * Check if the given log level should be logged based on the configured level
     * @param {string} level - The log level to check
     * @returns {boolean} Whether the log should be recorded
     * @private
     */
    _shouldLog(level) {
        return this.levels[level] >= this.levels[this.logLevel];
    }
    
    /**
     * Format data for logging
     * @param {any} data - The data to format
     * @returns {string} Formatted data string
     * @private
     */
    _formatData(data) {
        if (data === undefined || data === null) {
            return '';
        }
        
        if (typeof data === 'object') {
            try {
                return '\n  ' + util.inspect(data, { depth: 4, colors: false })
                    .replace(/\n/g, '\n  ');
            } catch (e) {
                return `[Unserializable Object: ${e.message}]`;
            }
        }
        
        return String(data);
    }
    
    /**
     * Write a log entry to file
     * @param {string} level - Log level
     * @param {string} module - Source module
     * @param {string} message - Log message
     * @param {any} data - Additional data to log
     * @private
     */
    _writeLog(level, module, message, data) {
        try {
            const timestamp = new Date().toISOString();
            let logEntry = `[${timestamp}] [${level.toUpperCase()}] [${module}] ${message}`;
            
            if (data !== undefined) {
                logEntry += this._formatData(data);
            }
            
            logEntry += '\n';
            
            // Write to general log
            fs.appendFileSync(this.generalLogFile, logEntry);
            
            // Also write errors to error log
            if (level === 'error') {
                fs.appendFileSync(this.errorLogFile, logEntry);
            }
            
            // Console output for debugging
            if (this.debugMode || level === 'error') {
                const consoleMethod = level === 'error' ? 'error' : 
                                     level === 'warn' ? 'warn' : 'log';
                console[consoleMethod](`[${level.toUpperCase()}] [${module}]`, message, 
                    data !== undefined ? data : '');
            }
        } catch (logError) {
            console.error('Failed to write log:', logError);
        }
    }
    
    /**
     * Log a debug message
     * @param {string} module - Source module
     * @param {string} message - Log message
     * @param {any} data - Additional data to log
     */
    debug(module, message, data) {
        if (this._shouldLog('debug')) {
            this._writeLog('debug', module, message, data);
        }
    }
    
    /**
     * Log an info message
     * @param {string} module - Source module
     * @param {string} message - Log message
     * @param {any} data - Additional data to log
     */
    info(module, message, data) {
        if (this._shouldLog('info')) {
            this._writeLog('info', module, message, data);
        }
    }
    
    /**
     * Log a warning message
     * @param {string} module - Source module
     * @param {string} message - Log message
     * @param {any} data - Additional data to log
     */
    warn(module, message, data) {
        if (this._shouldLog('warn')) {
            this._writeLog('warn', module, message, data);
        }
    }
    
    /**
     * Log an error message
     * @param {string} module - Source module
     * @param {string} message - Log message
     * @param {Error|any} error - Error object or additional data
     */
    error(module, message, error) {
        if (this._shouldLog('error')) {
            let errorData;
            
            if (error instanceof Error) {
                errorData = {
                    message: error.message,
                    stack: error.stack,
                    name: error.name
                };
            } else {
                errorData = error;
            }
            
            this._writeLog('error', module, message, errorData);
        }
    }
    
    /**
     * Log a keypress event to a separate file
     * @param {string} module - Source module
     * @param {string} message - Log message
     * @param {any} data - Keypress data
     */
    keypress(module, message, data) {
        try {
            const timestamp = new Date().toISOString();
            let logEntry = `[${timestamp}] [KEYPRESS] [${module}] ${message}`;
            
            if (data !== undefined) {
                logEntry += this._formatData(data);
            }
            
            logEntry += '\n';
            
            // Write to keypress log
            fs.appendFileSync(this.keypressLogFile, logEntry);
            
            // Also write to general log if in debug mode
            if (this._shouldLog('debug')) {
                this._writeLog('debug', module, `KEYPRESS: ${message}`, data);
            }
        } catch (logError) {
            console.error('Failed to write keypress log:', logError);
        }
    }
}

// Create a singleton instance
const logger = new Logger();

module.exports = logger; 