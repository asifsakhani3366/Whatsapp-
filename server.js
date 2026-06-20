// server.js - Universal Multi-Country WhatsApp Pairing Server
const express = require('express');
const { default: makeWASocket, useMultiFileAuthState, delay } = require("@whiskeysockets/baileys");
const pino = require("pino");
const fs = require('fs');
const path = require('path');

const app = report_server = express();
const PORT = process.env.PORT || 3000;

app.use(express.urlencoded({ extended: true }));
app.use(express.json());

// Multi-Country Responsive Web UI
app.get('/', (req, res) => {
    res.send(`
    <!DOCTYPE html>
    <html lang="en">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Global WhatsApp Pairing Dashboard</title>
        <style>
            body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #0f141c; color: #e1e7ed; padding: 40px; text-align: center; }
            .container { max-width: 550px; margin: 0 auto; background: #1a2332; padding: 35px; border-radius: 12px; border: 1px solid #2d3d57; box-shadow: 0 6px 20px rgba(0,0,0,0.6); }
            h2 { color: #4da6ff; margin-bottom: 10px; }
            p { font-size: 14px; color: #9aa5b5; line-height: 1.5; }
            input[type="text"] { width: 100%; padding: 14px; margin: 15px 0; border-radius: 8px; border: 1px solid #2d3d57; background: #0f141c; color: #fff; font-size: 16px; box-sizing: border-box; text-align: center; letter-spacing: 1px; }
            button { width: 100%; padding: 14px; background-color: #2ea043; border: none; border-radius: 8px; color: white; font-size: 16px; font-weight: bold; cursor: pointer; transition: background 0.2s; }
            button:hover { background-color: #238636; }
            .warning { color: #ff9800; font-size: 12px; margin-top: 10px; }
        </style>
    </head>
    <body>
        <div class="container">
            <h2>🌍 Universal WhatsApp Pairing Server</h2>
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
      
