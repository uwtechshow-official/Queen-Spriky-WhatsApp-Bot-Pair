const qrcode = require("qrcode-terminal");
const fs = require('fs');
const pino = require('pino');
const { default: makeWASocket, Browsers, delay, useMultiFileAuthState, fetchLatestBaileysVersion, PHONENUMBER_MCC, makeCacheableSignalKeyStore, jidNormalizedUser } = require("@whiskeysockets/baileys");
const Pino = require("pino");
const NodeCache = require("node-cache");
const readline = require("readline");

let chalk;
(async () => {
  const chalkModule = await import("chalk");
  chalk = chalkModule.default || chalkModule;
})();

let phoneNumber = "94758900210";

const pairingCode = !!phoneNumber || process.argv.includes("--pairing-code");
const useMobile = process.argv.includes("--mobile");

const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
const question = (text) => new Promise((resolve) => rl.question(text, resolve));

async function qr() {
  let { version, isLatest } = await fetchLatestBaileysVersion();
  const { state, saveCreds } = await useMultiFileAuthState('./sessions');
  const msgRetryCounterCache = new NodeCache(); 
  const XeonBotInc = makeWASocket({
    logger: pino({ level: 'silent' }),
    printQRInTerminal: !pairingCode, 
    browser: Browsers.windows('Firefox'), 
    auth: {
      creds: state.creds,
      keys: makeCacheableSignalKeyStore(state.keys, Pino({ level: "fatal" }).child({ level: "fatal" })),
    },
    markOnlineOnConnect: true, 
    generateHighQualityLinkPreview: true, 
    getMessage: async (key) => {
      let jid = jidNormalizedUser(key.remoteJid);
      let msg = await store.loadMessage(jid, key.id);
      return msg?.message || "";
    },
    msgRetryCounterCache, 
    defaultQueryTimeoutMs: undefined, 
  });

  if (pairingCode && !XeonBotInc.authState.creds.registered) {
    if (useMobile) throw new Error('Cannot use pairing code with mobile api');

    let phoneNumber;
    if (!!phoneNumber) {
      phoneNumber = phoneNumber.replace(/[^0-9]/g, '');

      if (!Object.keys(PHONENUMBER_MCC).some(v => phoneNumber.startsWith(v))) {
        console.log(chalk.bgBlack(chalk.redBright("Start with country code of your WhatsApp Number, Example : +94758900210")));
        process.exit(0);
      }
    } else {
      phoneNumber = await question(chalk.bgBlack(chalk.greenBright("Please type your WhatsApp number 😍\nFor example: +94758900210 : ")));
      phoneNumber = phoneNumber.replace(/[^0-9]/g, '');

      if (!Object.keys(PHONENUMBER_MCC).some(v => phoneNumber.startsWith(v))) {
        console.log(chalk.bgBlack(chalk.redBright("Start with country code of your WhatsApp Number, Example : +94758900210")));
        process.exit(0);
      }
    }

    setTimeout(async () => {
      let code = await XeonBotInc.requestPairingCode(phoneNumber);
      code = code?.match(/.{1,4}/g)?.join("-") || code;
      console.log(chalk.bgGreen("Your Pairing Code : "), code);
    }, 3000);
  }

  XeonBotInc.ev.on("connection.update", async (s) => {
    const { connection, lastDisconnect } = s;
    if (connection == "open") {
      await delay(1000 * 10);
      await XeonBotInc.sendMessage(XeonBotInc.user.id, { text: "Join Our WhatsApp Group Or Contact Us For Support\n\n⎆WhatsApp Bot Group: https://chat.whatsapp.com/Jx2dvOAzNaO3vm5bwVglyC\n\n⎆WhatsApp Support Group: https://chat.whatsapp.com/DhvKjHT9ZUAHZmWM9jLT9K\n\n⎆WhatsApp Pm: Wa.me/94758900210\n\n⎆Instagram: https://instagram.com/udavin_wijesundara?igshid=OGQ5ZDc2ODk2ZA==" });
      
      let sessionXeon = fs.readFileSync('./sessions/creds.json');
      await delay(1000 * 2);
      const xeonses = await XeonBotInc.sendMessage(XeonBotInc.user.id, { document: sessionXeon, mimetype: "application/json", fileName: "creds.json" });
      await XeonBotInc.sendMessage(XeonBotInc.user.id, { text: "⚠️Do not share this file with anybody⚠️\n\n┌─❖\n│ Welcome To Queen Spriky Bot Family 😽\n│©Queen Spriky WhatsApp Bot" }, { quoted: xeonses });
      await delay(1000 * 2);
      process.exit(0);
    }

    if (connection === "close" && lastDisconnect && lastDisconnect.error && lastDisconnect.error.output.statusCode != 401) {
      qr();
    }
  });

  XeonBotInc.ev.on('creds.update', saveCreds);
  XeonBotInc.ev.on("messages.upsert", () => { });
}

qr();

process.on('uncaughtException', function (err) {
  let e = String(err);
  if (e.includes("conflict")) return;
  if (e.includes("not-authorized")) return;
  if (e.includes("Socket connection timeout")) return;
  if (e.includes("rate-overlimit")) return;
  if (e.includes("Connection Closed")) return;
  if (e.includes("Timed Out")) return;
  if (e.includes("Value not found")) return;
  console.log('Caught exception: ', err);
});
