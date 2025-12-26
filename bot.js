import TelegramBot from "node-telegram-bot-api";
import dotenv from "dotenv";
import fs from "fs";
import { runJS, runPython, runCpp } from "./compiler/index.js";

dotenv.config();
const bot = new TelegramBot(process.env.BOT_TOKEN, { polling: true });

const OWNER = process.env.OWNER_ID;
const state = new Map();
const lastMsg = new Map();

// ---------- HELPERS ----------
function isOwner(id) {
  return String(id) === String(OWNER);
}

function keyboard(buttons) {
  return { reply_markup: { inline_keyboard: buttons } };
}

async function edit(chat, msgId, text, kb) {
  await bot.editMessageText(text, {
    chat_id: chat,
    message_id: msgId,
    reply_markup: kb?.reply_markup
  });
}

// ---------- START ----------
bot.onText(/\/start/, async (msg) => {
  const sent = await bot.sendPhoto(msg.chat.id, fs.createReadStream("start.jpg"), {
    caption: "👋 Добро пожаловать!\nВыберите действие:",
    reply_markup: {
      inline_keyboard: [
        [{ text: "🛠 Компилировать", callback_data: "compile" }],
        [{ text: "📄 О боте", callback_data: "about" }]
      ]
    }
  });
  lastMsg.set(msg.chat.id, sent.message_id);
});

// ---------- CALLBACKS ----------
bot.on("callback_query", async (q) => {
  const id = q.message.chat.id;
  const msgId = q.message.message_id;
  const data = q.data;

  if (data === "about") {
    return edit(id, msgId, "🤖 Бот компилирует JS / Python / C++", {
      inline_keyboard: [[{ text: "⬅ Назад", callback_data: "back" }]]
    });
  }

  if (data === "compile") {
    return edit(id, msgId, "Выберите язык:", {
      inline_keyboard: [
        [{ text: "JS", callback_data: "lang_js" }],
        [{ text: "Python", callback_data: "lang_py" }],
        [{ text: "C++", callback_data: "lang_cpp" }],
        [{ text: "⬅ Назад", callback_data: "back" }]
      ]
    });
  }

  if (data === "back") {
    return edit(id, msgId, "Главное меню", {
      inline_keyboard: [
        [{ text: "🛠 Компилировать", callback_data: "compile" }],
        [{ text: "📄 О боте", callback_data: "about" }]
      ]
    });
  }

  if (data.startsWith("lang_")) {
    const lang = data.split("_")[1];
    state.set(id, { lang, step: "code" });

    return edit(id, msgId, `✍️ Введите код (${lang})`, {
      inline_keyboard: [[{ text: "⬅ Назад", callback_data: "back" }]]
    });
  }

  if (data === "need_input_yes") {
    const st = state.get(id);
    st.step = "input";
    return edit(id, msgId, "✍️ Введите входные данные:", {
      inline_keyboard: [[{ text: "⬅ Назад", callback_data: "back" }]]
    });
  }

  if (data === "need_input_no") {
    const st = state.get(id);
    st.input = "";
    return execute(id, msgId);
  }
});

// ---------- ОБРАБОТКА ТЕКСТА ----------
bot.on("message", async (msg) => {
  const id = msg.chat.id;
  const st = state.get(id);
  if (!st) return;

  if (st.step === "code") {
    st.code = msg.text;
    st.step = "ask_input";

    return edit(id, lastMsg.get(id), "Нужны входные данные?", {
      inline_keyboard: [
        [{ text: "Да", callback_data: "need_input_yes" }],
        [{ text: "Нет", callback_data: "need_input_no" }]
      ]
    });
  }

  if (st.step === "input") {
    st.input = msg.text;
    return execute(id, lastMsg.get(id));
  }
});

// ---------- EXECUTION ----------
async function execute(chatId, msgId) {
  const st = state.get(chatId);
  const isOwner = String(chatId) === String(OWNER);

  let result;
  try {
    if (st.lang === "js") result = await runJS(st.code, !isOwner);
    if (st.lang === "python") result = await runPython(st.code, !isOwner);
    if (st.lang === "cpp") result = await runCpp(st.code, !isOwner);
  } catch (e) {
    result = String(e);
  }

  await edit(chatId, msgId, `📤 Результат:\n\n${result}`, {
    inline_keyboard: [[{ text: "⬅ Назад", callback_data: "back" }]]
  });

  state.delete(chatId);
}
