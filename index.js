import fetch from "node-fetch";
import {Telegraf} from "telegraf";

//раздельное логирование


const apiCall = function (url, additionalParams, callback) {
  //delete callback
  const options = {
    method: additionalParams.method,
    mode: 'cors',
    body:JSON.stringify(additionalParams.body),
    headers: {
      'Accept': 'application/json',
      'Content-Type': 'application/json',
    },
  };

  console.log(options)

  fetch(url, options)
    .then(res => res.json())
    .then(json => {

      callback(json);
    });
}

let countLoginAction = 0;
let userLogin = '';
let userPass = '';
let userId = '';

const bot = new Telegraf('5336807937:AAHmKseiwIlMZIpPI8glRqwJxvQysYpP7ZY');

bot.start( ctx => ctx.reply(`
Привет ${ctx.from.first_name}!
Войди для того, чтобы посмотреть данные по твоему ментальному здоровью.
Для большей информации напиши /help
`));

bot.help( ctx => ctx.reply(`
Справка о командах:
- /login - вход в учетную запись
- /logout - выход из учетной записи
- /stats - показать количество оценок
`)) // список всех стран на английском языке можно взять в документации covid19-api

bot.on('text', async (ctx) => {
  const msg = ctx.message;
  const userName = msg.from.first_name + ' ' + msg.from.last_name;
  const chatId = msg.chat.id;
  let mess = '';

  if (msg.text === '/stats') {
    const submitData = {
      userId,
      dateSend: 1648126206283,
    };

    apiCall(
      'http://localhost:8000/trackers/get',
      { method: 'post', body: { submitData: submitData }},
      function (response) {
        if (response.result) {
          console.log(response)
          for (let i = 0; i < response.trackers.length; i++) {
            const item = response.trackers[i];
            mess += '+———————————————————+\n';
            let p = ' Дата: ' + new Date( Number(item.dateSend) ).toLocaleString("ru", {
              year: 'numeric',
              month: 'long',
              day: 'numeric',
              weekday: 'long',
              timezone: 'UTC',
              hour: 'numeric',
              minute: 'numeric',
              second: 'numeric'
            }) + ' ';
            mess += '|'+p+'|\n';
            mess += '+———————————————————+\n';
            for (let j = 0; j < item.dataTrackers.length; j++) {
              const jtem = item.dataTrackers[j];
              let q = '';
              switch (jtem.id) {
                case 0:
                  q = 'эмомции';
                  break;
                case 1:
                  q = 'продуктивность';
                  break;
                case 2:
                  q = 'самочувствие';
                  break;
                case 3:
                  q = 'состояние';
                  break;
              }
              q = ' ' + q + ': ' + jtem.value + ' ';
              if (q.length < p.length) {
                console.log(p.length, q.length)
                for (let o = 0; o < (p.length - q.length) / 2; o++) {
                  q = ' ' + q;
                  q += ' ';
                }

              }
              mess += '|'+q+'|\n';
              mess += '+———————————————————+\n';
            }
            mess += '\n\n'
          }
          bot.telegram.sendMessage(chatId, mess);
        } else {
          bot.telegram.sendMessage(chatId, response.message);
        }
      }
    );
  } else if (msg.text === '/login') {
    bot.telegram.sendMessage(chatId, 'Введите логин');
    countLoginAction = 1;
  } else if (msg.text === '/logout') {
    userId = '';
    userLogin = '';
    userPass = '';
    bot.telegram.sendMessage(chatId, 'До встречи!');
  } else {
    if (countLoginAction === 1) {
      userLogin = msg.text;
      mess = 'Введите пароль'
      countLoginAction++;
    } else if (countLoginAction === 2) {
      userPass = msg.text;

      apiCall(
        'http://localhost:8000/user/login',
        { method: 'post', body: { name: userLogin, password: userPass }},
        function (response) {
          if (response.result) {
            userId = response.userId;
            mess = 'Здравствуйте ' + userLogin;
          } else {
            mess = response.message;
          }
          bot.telegram.sendMessage(chatId, mess);
          return false;
        }
      );
      countLoginAction++;
    }
  }
});

bot.launch();