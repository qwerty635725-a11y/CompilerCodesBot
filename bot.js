import TelegramBot from "node-telegram-bot-api";
import fs from "fs";
import dotenv from "dotenv";
import { runJS, runPython, runCpp } from "./compiler/index.js";

dotenv.config();

if (!process.env.BOT_TOKEN) {
  console.error("❌ BOT_TOKEN не найден");
  process.exit(1);
}

const bot = new TelegramBot(process.env.BOT_TOKEN, { polling: true });
const state = new Map();

const mainMenu = {
  reply_markup: {
    keyboard: [
      [{ text: "🛠 Компилировать" }],
      [{ text: "📄 О боте" }]
    ],
    resize_keyboard: true
  }
};

const langMenu = {
  reply_markup: {
    keyboard: [
      [{ text: "JS" }, { text: "C++" }, { text: "Python" }],
      [{ text: "⬅ Назад" }]
    ],
    resize_keyboard: true
  }
};

bot.onText(/\/start/, async (msg) => {
  await bot.sendPhoto(
    msg.chat.id,
    fs.createReadStream("start.jpg"),
    { caption: "👋 Добро пожаловать!\nВыберите действие:", ...mainMenu }
  );
});

bot.on("message", async (msg) => {
  const id = msg.chat.id;
  const text = msg.text;

  if (text === "📄 О боте") {
    return bot.sendMessage(id, "🤖 Бот-компилятор\nJS • C++ • Python\nЗапуск в Docker");
  }

  if (text === "🛠 Компилировать") {
    return bot.sendMessage(id, "Выберите язык:", langMenu);
  }

  if (text === "⬅ Назад") {
    state.delete(id);
    return bot.sendMessage(id, "Главное меню:", mainMenu);
  }

  if (["JS", "C++", "Python"].includes(text)) {
    state.set(id, { lang: text, step: "code" });
    return bot.sendMessage(id, `✍️ Введите код на ${text}`);
  }

  const user = state.get(id);
  if (!user) return;

  if (user.step === "code") {
    user.code = text;
    user.step = "confirm";
    return bot.sendMessage(id, "❓ Нужны входные данные?", {
      reply_markup: {
        keyboard: [[{ text: "Да" }, { text: "Нет" }]],
        resize_keyboard: true
      }
    });
  }

  if (user.step === "confirm" && text === "Да") {
    user.step = "input";
    return bot.sendMessage(id, "Введите входные данные:");
  }

  if (user.step === "confirm" && text === "Нет") {
    return execute(user, id);
  }

  if (user.step === "input") {
    user.input = text;
    return execute(user, id);
  }
});

async function execute(user, id) {
  let result = "Ошибка";

  try {
    if (user.lang === "JS") result = await runJS(user.code);
    if (user.lang === "Python") result = await runPython(user.code);
    if (user.lang === "C++") result = await runCpp(user.code);
  } catch (e) {
    result = e.toString();
  }

  await bot.sendMessage(id, `📤 Результат:\n\n${result}`);
  state.delete(id);
}
