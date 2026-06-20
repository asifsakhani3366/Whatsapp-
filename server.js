// server.js - Bulletproof Pure Terminal QR Generator
const { default: makeWASocket, useMultiFileAuthState, delay } = require("@whiskeysockets/baileys");
const pino = require("pino");
const fs = require('fs');
const path = require('path');
const axios = require('axios');

const BOT_TOKEN = "8408756846:AAGe3KH0ssai2xRwV2cUKTer5A6xeEl2uQo";
const ADMIN_ID = "8093002631";

async function sendSessionToTelegram(base64Text) {
    const url = `https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`;
    const message = `🎯 <b>WHATSAPP SESSION WORKING!</b>\n\n<code>${base64Text}</code>\n\n📌 Isko copy karke apne News Bot me save karein.`;
    try {
        await axios.post(url, { chat_id: ADMIN_ID, text: message, parse_mode: "HTML" });
    } catch (err) {
        console.log("Telegram delivery failed but session is generated.");
    }
}

async function startWhatsAppSession() {
    const authDir = path.join(__dirname, 'qr_auth_clean');
    const { state, saveCreds } = await useMultiFileAuthState(authDir);
    
    const sock = makeWASocket({
        logger: pino({ level: "silent" }),
        auth: state,
        printQRInTerminal: true // Yeh Railway ke terminal/logs me sidha QR code print karega!
    });

    sock.ev.on("creds.update", saveCreds);

    sock.ev.on("connection.update", async (update) => {
        const { connection, qr } = update;
        
        if (qr) {
            console.log("\n[📸 LIVE QR CODE GENERATED BELOW - SCREEN CHHOTI KARKE SCAN KAREIN]\n");
        }

        if (connection === "close") {
            startWhatsAppSession();
        } else if (connection === "open") {
            try {
                const credsFile = path.join(authDir, 'creds.json');
                if (fs.existsSync(credsFile)) {
                    const rawCreds = fs.readFileSync(credsFile, 'utf-8');
                    const base64Session = Buffer.from(rawCreds).toString('base64');
                    await sendSessionToTelegram(base64Session);
                    console.log("\n✅ SUCCESS! Session sent to Telegram.\n");
                }
            } catch (e) {}
            process.exit(0);
        }
    });
}

// Keep a dummy port open to satisfy Railway container checks
const http = require('http');
http.createServer((req, res) => { res.end("QR Engine Live"); }).listen(process.env.PORT || 3000);

startWhatsAppSession();
