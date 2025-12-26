import TelegramBot from "node-telegram-bot-api";
import dotenv from "dotenv";
import { runJS, runPython, runCpp } from "./compiler/index.js";

dotenv.config();

const bot = new TelegramBot(process.env.BOT_TOKEN, { polling: true });
const OWNER = process.env.OWNER_ID;

const state = new Map();
const lastMessage = new Map();
const cooldown = new Map();

function isOwner(id) {
  return String(id) === String(OWNER);
}

function canUse(id) {
  const now = Date.now();
  if (cooldown.has(id) && now - cooldown.get(id) < 1500) return false;
  cooldown.set(id, now);
  return true;
}

async function safeEdit(chat, msgId, text, markup) {
  try {
    await bot.editMessageText(text, {
      chat_id: chat,
      message_id: msgId,
      reply_markup: markup
    });
  } catch {}
}

// ───── START ─────
bot.onText(/\/start/, async (msg) => {
  const m = await bot.sendMessage(msg.chat.id,
    "👋 Добро пожаловать!\n\nВыберите действие:",
    {
      reply_markup: {
        inline_keyboard: [
          [{ text: "🛠 Компилировать", callback_data: "compile" }],
          [{ text: "📄 О боте", callback_data: "about" }]
        ]
      }
    }
  );
  lastMessage.set(msg.chat.id, m.message_id);
});

// ───── CALLBACKS ─────
bot.on("callback_query", async (q) => {
  const id = q.message.chat.id;
  const msgId = q.message.message_id;
  const data = q.data;

  if (!canUse(id)) return;

  if (data === "about") {
    return safeEdit(id, msgId,
      "🤖 Компилятор JS / Python / C++\nБезопасный sandbox",
      { inline_keyboard: [[{ text: "⬅ Назад", callback_data: "back" }]] }
    );
  }

  if (data === "compile") {
    return safeEdit(id, msgId,
      "Выберите язык:",
      {
        inline_keyboard: [
          [{ text: "JS", callback_data: "lang_js" }],
          [{ text: "Python", callback_data: "lang_py" }],
          [{ text: "C++", callback_data: "lang_cpp" }],
          [{ text: "⬅ Назад", callback_data: "back" }]
        ]
      }
    );
  }

  if (data === "back") {
    return safeEdit(id, msgId,
      "Главное меню",
      {
        inline_keyboard: [
          [{ text: "🛠 Компилировать", callback_data: "compile" }],
          [{ text: "📄 О боте", callback_data: "about" }]
        ]
      }
    );
  }

  if (data.startsWith("lang_")) {
    const lang = data.split("_")[1];
    state.set(id, { lang });
    return safeEdit(id, msgId,
      `✍️ Введите код (${lang})`,
      { inline_keyboard: [[{ text: "⬅ Назад", callback_data: "back" }]] }
    );
  }
});

// ───── CODE INPUT ─────
bot.on("message", async (msg) => {
  const id = msg.chat.id;
  if (!state.has(id)) return;

  const { lang } = state.get(id);
  const code = msg.text;

  let result;
  try {
    if (lang === "js") result = await runJS(code, !isOwner(id));
    if (lang === "python") result = await runPython(code, !isOwner(id));
    if (lang === "cpp") result = await runCpp(code, !isOwner(id));
  } catch (e) {
    result = String(e);
  }

  await safeEdit(id, lastMessage.get(id), `📤 Результат:\n\n${result}`, {
    inline_keyboard: [[{ text: "⬅ Назад", callback_data: "back" }]]
  });

  state.delete(id);
});
