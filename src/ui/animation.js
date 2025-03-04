/**
 * Matrix-style background animation for the WhatsApp Terminal Client
 */

const { MATRIX_CONFIG, WHATSAPP_LOGO } = require('../utils/constants');

class MatrixAnimation {
    constructor(messageBox, screen) {
        this.messageBox = messageBox;
        this.screen = screen;
        this.animationState = {
            columns: [],
            frame: 0,
            lastUpdate: Date.now(),
            logoPosition: {
                x: 0,
                y: 0,
                velocityX: 0.35,
                velocityY: 0.35
            },
            logoColor: {
                intensity: 0,
                increasing: true
            }
        };
        this.interval = null;
        this.isActive = false;

        // Set up event handlers
        this._setupEventHandlers();
    }

    /**
     * Set up event handlers for animation control
     */
    _setupEventHandlers() {
        this.screen.on('stop-matrix', () => this.stop());
        this.screen.on('start-matrix', () => {
            this.messageBox.setContent('');
            this.screen.render();
            this.start();
        });
    }

    /**
     * Initialize columns for the matrix animation
     * @param {number} width - Width of the message box
     */
    initializeColumns(width) {
        const numColumns = Math.floor(width * MATRIX_CONFIG.DENSITY);
        
        this.animationState.columns = Array(numColumns).fill(0).map(() => ({
            chars: Array(8).fill('').map(() => this._createCharacter()),
            y: Math.random() * this.messageBox.height,
            x: Math.floor(Math.random() * width)
        }));
    }

    /**
     * Create a single matrix character with properties
     * @returns {Object} Character configuration
     */
    _createCharacter() {
        let depth = 0;
        const rand = Math.random();
        let accumProb = 0;
        
        for (let i = 0; i < MATRIX_CONFIG.DEPTHS.length; i++) {
            accumProb += MATRIX_CONFIG.DEPTHS[i].probability;
            if (rand < accumProb) {
                depth = i;
                break;
            }
        }
        
        return {
            char: Math.random() > 0.5 ? '1' : '0',
            depth: depth,
            speed: Math.random() * 0.5 + 0.2,
            intensity: Math.random(),
            blink: Math.random() > 0.9
        };
    }

    /**
     * Update the matrix animation frame
     */
    updateBackground() {
        if (!this.messageBox.width || !this.isActive) return;

        const now = Date.now();
        const delta = (now - this.animationState.lastUpdate) / 1000;
        this.animationState.lastUpdate = now;

        if (this.animationState.columns.length === 0) {
            this.initializeColumns(this.messageBox.width);
        }

        const lines = Array(this.messageBox.height).fill('').map(() => Array(this.messageBox.width).fill(' '));
        this._updateColumns(lines, delta);
        this._renderFrame(lines);
    }

    /**
     * Update all matrix columns
     * @param {Array} lines - Screen buffer
     * @param {number} delta - Time delta
     */
    _updateColumns(lines, delta) {
        this.animationState.columns.forEach((column) => {
            column.y += column.chars[0].speed * delta * 10;
            if (column.y > this.messageBox.height * 1.2) {
                column.y = -8;
                column.chars.forEach(char => {
                    Object.assign(char, this._createCharacter());
                });
            }

            this._renderColumn(column, lines);
        });
    }

    /**
     * Render a single matrix column
     * @param {Object} column - Column configuration
     * @param {Array} lines - Screen buffer
     */
    _renderColumn(column, lines) {
        column.chars.forEach((char, i) => {
            const y = Math.floor(column.y + i) % this.messageBox.height;
            const x = Math.floor(column.x) % this.messageBox.width;
            
            if (y >= 0 && y < this.messageBox.height && x >= 0 && x < this.messageBox.width) {
                const depth = MATRIX_CONFIG.DEPTHS[char.depth];
                let charToRender = char.blink && Math.random() > 0.8 ? '1' : char.char;
                
                const fadeTop = y < 3 ? 0.3 + (y * 0.2) : 1;
                const fadeBottom = y > this.messageBox.height - 4 ? 0.3 + ((this.messageBox.height - y) * 0.2) : 1;
                const fade = Math.min(fadeTop, fadeBottom);
                
                if (fade > 0.3) {
                    const intensity = char.intensity > 0.7 ? 'bright-' : '';
                    const color = char.intensity > 0.9 ? 'white' : 'green';
                    lines[y][x] = `{${intensity}${color}-fg}${charToRender}{/}`;
                }
            }
        });
    }

    /**
     * Update logo position for bouncing effect
     * @param {number} maxX - Maximum X position
     * @param {number} maxY - Maximum Y position
     * @param {number} logoWidth - Logo width
     * @param {number} logoHeight - Logo height
     */
    _updateLogoPosition(maxX, maxY, logoWidth, logoHeight) {
        const pos = this.animationState.logoPosition;
        
        // Update position
        pos.x += pos.velocityX;
        pos.y += pos.velocityY;

        // Bounce on walls
        if (pos.x <= 0 || pos.x + logoWidth >= maxX) {
            pos.velocityX *= -1;
        }
        if (pos.y <= 0 || pos.y + logoHeight >= maxY) {
            pos.velocityY *= -1;
        }

        // Ensure we stay within bounds
        pos.x = Math.max(0, Math.min(pos.x, maxX - logoWidth));
        pos.y = Math.max(0, Math.min(pos.y, maxY - logoHeight));
    }

    /**
     * Update logo color for Matrix effect
     */
    _updateLogoColor() {
        const color = this.animationState.logoColor;
        const step = 0.05;

        if (color.increasing) {
            color.intensity += step;
            if (color.intensity >= 1) {
                color.intensity = 1;
                color.increasing = false;
            }
        } else {
            color.intensity -= step;
            if (color.intensity <= 0) {
                color.intensity = 0;
                color.increasing = true;
            }
        }
    }

    /**
     * Get current logo color based on intensity
     * @returns {string} Color formatting string
     */
    _getLogoColor() {
        const intensity = this.animationState.logoColor.intensity;
        if (intensity > 0.8) {
            return '{white-fg}';
        } else if (intensity > 0.5) {
            return '{bright-green-fg}';
        } else {
            return '{green-fg}';
        }
    }

    /**
     * Render the final frame with WhatsApp logo
     * @param {Array} lines - Screen buffer
     */
    _renderFrame(lines) {
        const logoLines = WHATSAPP_LOGO.split('\n')
            .filter(line => line && line.trim() !== '' && !line.includes('{/}'))
            .map(line => line.replace('{bright-green-fg}', '').trim());
            
        if (logoLines.length === 0) return;

        const maxLogoWidth = Math.max(...logoLines.map(line => line.length));
        const logoHeight = logoLines.length;

        // Update logo position and color
        this._updateLogoPosition(
            this.messageBox.width,
            this.messageBox.height,
            maxLogoWidth,
            logoHeight
        );
        this._updateLogoColor();

        const pos = this.animationState.logoPosition;
        const colorFormat = this._getLogoColor();
        let content = '';
        
        for (let y = 0; y < lines.length; y++) {
            const currentY = Math.floor(pos.y);
            if (y >= currentY && y < currentY + logoHeight) {
                const logoLineIndex = y - currentY;
                if (logoLineIndex >= 0 && logoLineIndex < logoLines.length) {
                    const logoLine = logoLines[logoLineIndex];
                    const padding = ' '.repeat(Math.floor((maxLogoWidth - logoLine.length) / 2));
                    const centeredLogoLine = colorFormat + padding + logoLine + '{/}';
                    const currentX = Math.floor(pos.x);
                    const beforeLogo = lines[y].slice(0, currentX).join('');
                    const afterLogo = lines[y].slice(currentX + maxLogoWidth).join('');
                    content += beforeLogo + centeredLogoLine + afterLogo + '\n';
                } else {
                    content += lines[y].join('') + '\n';
                }
            } else {
                content += lines[y].join('') + '\n';
            }
        }

        this.messageBox.setContent(content);
        this.screen.render();
        this.animationState.frame++;
    }

    /**
     * Start the animation
     */
    start() {
        if (this.interval) return;
        this.isActive = true;
        this.interval = setInterval(() => this.updateBackground(), MATRIX_CONFIG.ANIMATION_SPEED);
    }

    /**
     * Stop the animation
     */
    stop() {
        this.isActive = false;
        if (this.interval) {
            clearInterval(this.interval);
            this.interval = null;
        }
        this.messageBox.setContent('');
        this.screen.render();
    }
}

module.exports = MatrixAnimation; 