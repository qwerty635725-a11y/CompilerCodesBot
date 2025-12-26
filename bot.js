import TelegramBot from "node-telegram-bot-api";
import dotenv from "dotenv";
import fs from "fs";
import { runJS, runPython, runCpp } from "./compiler/index.js";

dotenv.config();

const bot = new TelegramBot(process.env.BOT_TOKEN, { polling: true });

const OWNER_IDS = process.env.OWNER_ID.split(",").map(id => id.trim());

const state = new Map();
const lastMsg = new Map();
const antiSpam = new Map();

// ───────── УТИЛИТЫ ─────────
function isOwner(id) {
  return OWNER_IDS.includes(String(id));
}

function isSpam(id) {
  const now = Date.now();
  if (antiSpam.has(id) && now - antiSpam.get(id) < 2500) return true;
  antiSpam.set(id, now);
  return false;
}

async function clean(chat) {
  const m = lastMsg.get(chat);
  if (!m) return;
  try {
    if (m.user) await bot.deleteMessage(chat, m.user);
    if (m.bot) await bot.deleteMessage(chat, m.bot);
  } catch {}
}

// ───────── МЕНЮ ─────────
const mainMenu = {
  reply_markup: {
    keyboard: [[{ text: "🛠 Компилировать" }], [{ text: "📄 О боте" }]],
    resize_keyboard: true
  }
};

const langMenu = {
  reply_markup: {
    keyboard: [[{ text: "JS" }, { text: "C++" }, { text: "Python" }], [{ text: "⬅ Назад" }]],
    resize_keyboard: true
  }
};

// ───────── START ─────────
bot.onText(/\/start/, async msg => {
  await clean(msg.chat.id);
  const sent = await bot.sendPhoto(msg.chat.id, fs.createReadStream("start.jpg"), {
    caption: "👋 Добро пожаловать!\nВыберите действие:",
    ...mainMenu
  });
  lastMsg.set(msg.chat.id, { user: msg.message_id, bot: sent.message_id });
});

// ───────── ОСНОВНАЯ ЛОГИКА ─────────
bot.on("message", async msg => {
  const id = msg.chat.id;
  const text = msg.text;

  if (isSpam(id)) return;

  if (text === "📄 О боте") {
    const sent = await bot.sendMessage(id, "🤖 Бот компилирует JS / Python / C++");
    lastMsg.set(id, { user: msg.message_id, bot: sent.message_id });
    return;
  }

  if (text === "🛠 Компилировать") {
    const sent = await bot.sendMessage(id, "Выберите язык:", langMenu);
    lastMsg.set(id, { user: msg.message_id, bot: sent.message_id });
    return;
  }

  if (text === "⬅ Назад") {
    const sent = await bot.sendMessage(id, "Главное меню", mainMenu);
    lastMsg.set(id, { user: msg.message_id, bot: sent.message_id });
    return;
  }

  if (["JS", "C++", "Python"].includes(text)) {
    state.set(id, { lang: text });
    const sent = await bot.sendMessage(id, `✍️ Введите код (${text})`);
    lastMsg.set(id, { user: msg.message_id, bot: sent.message_id });
    return;
  }

  const user = state.get(id);
  if (!user) return;

  const owner = isOwner(id);

  let result;
  try {
    if (user.lang === "JS") result = await runJS(text, owner);
    if (user.lang === "Python") result = await runPython(text, owner);
    if (user.lang === "C++") result = await runCpp(text, owner);
  } catch (e) {
    result = String(e);
  }

  const sent = await bot.sendMessage(id, `📤 Результат:\n\n${result}`, {
    reply_markup: { keyboard: [[{ text: "⬅ Назад" }]], resize_keyboard: true }
  });

  lastMsg.set(id, { user: msg.message_id, bot: sent.message_id });
  state.delete(id);
});
