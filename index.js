import fetch from "node-fetch";
import {Telegraf, Markup} from "telegraf";
import ChartJsImage from'chartjs-to-image';
//сделать раздельное логирование

const bot = new Telegraf('5336807937:AAHmKseiwIlMZIpPI8glRqwJxvQysYpP7ZY');

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

  fetch(url, options)
    .then(res => res.json())
    .then(json => {
      callback(json);
    });
}

const login = () => {
  bot.telegram.sendMessage(user.chatId, 'Введите логин');
  user.countLoginAction = 1;
}

const logout = () => {
  userId = '';
  userLogin = '';
  userPass = '';
  user.countLoginAction = 0;
  bot.telegram.sendMessage(user.chatId, 'До встречи!');
}

const TRACKERS_INFO = [
  {
    id: 0,
    title: 'Оцените свои эмоции',
    chartTitle: 'Эмоции',
    name: 'emotion',
    countPoint: 10
  },
  {
    id: 1,
    title: 'Оцените свою продуктивность',
    chartTitle: 'Продуктивность',
    name: 'production',
    countPoint: 10
  },
  {
    id: 2,
    title: 'Оцените своё самочувствие',
    chartTitle: 'Самочувствие',
    name: 'myself',
    countPoint: 10
  },
  {
    id: 3,
    title: 'Оцените своё состояние',
    chartTitle: 'Состояние',
    name: 'quality',
    countPoint: 10
  }
];

class User {
  constructor(userName, chatId, countLoginAction) {
    this.userName = userName;
    this.chatId = chatId;
    this.countLoginAction = countLoginAction;
  }
}

let userList = [],
    user = {},
    userLogin = '',
    userPass = '',
    userId = '';

bot.start( (ctx) => {
  const msg = ctx.message;
  user = userList.find(item => item.chatId === msg.chat.id);

  if (!user) {
    user = new User(msg.from.first_name + ' ' + msg.from.last_name, msg.chat.id, 0)
    userList.push(user);
  }

  ctx.reply('Привет, ' + ctx.from.first_name +'!\n'
               + 'Чтобы продолжить работы необходимо войти в систему',
    {
      reply_markup: {
        inline_keyboard: [[
          { text: "Войти", callback_data: "login" },
          { text: "Помощь", callback_data: "help" }
        ]]
      }
    }
  )
});

bot.help( ctx => ctx.reply(`
  Справка о командах:
  - /login - вход в учетную запись
  - /logout - выход из учетной записи
  - /stats_old - показать оценки в тексте
  - /stats - показать оценки изображением
`));

bot.action('login', login);
bot.action('logout', logout);

bot.on('text', async (ctx) => {
  const msg = ctx.message;
  const chatId = msg.chat.id;

  user = userList.find(item => item.chatId === chatId);

  let mess = '';
  let chartData = {
    labels: [],
    datasets: []
  }

  if (msg.text === '/login') login();
  else if (msg.text === '/logout') logout();
  else if (msg.text === '/stats_old') {
    const submitData = {
      userId,
      dateSend: 1648126206283,
      startDateSend: dateChek - 86400000 * 3,
      endDateSend: dateChek + 86400000 * 3,
    };

    apiCall(
        'http://localhost:8000/trackers/get',
        {method: 'post', body: {submitData: submitData}},
        function (response) {
          if (response.result) {
            for (let i = 0; i < response.trackers.length; i++) {
              const item = response.trackers[i];
              mess += '+———————————————————+\n';
              let p = ' Дата: ' + new Date(Number(item.dateSend)).toLocaleString("ru", {
                year: 'numeric',
                month: 'long',
                day: 'numeric',
                weekday: 'long',
                timezone: 'UTC',
                hour: 'numeric',
                minute: 'numeric',
                second: 'numeric'
              }) + ' ';
              mess += '|' + p + '|\n';
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
                  for (let o = 0; o < (p.length - q.length) / 2; o++) {
                    q = ' ' + q;
                    q += ' ';
                  }

                }
                mess += '|' + q + '|\n';
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
  }
  else if (msg.text === '/stats') {
    let dateChek = 1648126206283;
    const submitData = {
      userId,
      dateSend: dateChek,
      startDateSend: dateChek - 86400000 * 3,
      endDateSend: dateChek + 86400000 * 3,
    };
    apiCall(
        'http://localhost:8000/trackers/get',
        {method: 'post', body: {submitData: submitData}},
        function (response) {
          if (response.result) {

            for (let j = 0; j < response.trackers.length; j++) { //оценки
              chartData.labels.push(new Date(Number(response.trackers[j].dateSend)).toLocaleString("ru", {
                hour: 'numeric',
                minute: 'numeric',
                second: 'numeric'
              }));
            }

            for (let i = 0; i < TRACKERS_INFO.length; i++) { //трекеры
              let data = [];
              for (let j = 0; j < response.trackers.length; j++) { //оценки
                data.push(response.trackers[j].dataTrackers[i].value)
              }

              let item = {
                label: TRACKERS_INFO[i].chartTitle,
                data: data
              };
              switch (i) {
                case 0:
                  item.backgroundColor = '#ff9191';
                  item.borderColor = '#ff9191';
                  item.hoverColor = '#ff3c3c';
                  item.hoverBorderColor = '#ff3c3c';
                  break;
                case 1:
                  item.backgroundColor = '#ffc89c';
                  item.borderColor = '#ffc89c';
                  item.hoverColor = '#ff973c';
                  item.hoverBorderColor = '#ff973c';
                  break;
                case 2:
                  item.backgroundColor = '#c9ff9c';
                  item.borderColor = '#c9ff9c';
                  item.hoverColor = '#97ff3c';
                  item.hoverBorderColor = '#97ff3c';
                  break;
                case 3:
                  item.backgroundColor = '#9fd3ff';
                  item.borderColor = '#9fd3ff';
                  item.hoverColor = '#3caaff';
                  item.hoverBorderColor = '#3caaff';
                  break;

              }
              item.lineTension = 0;

              chartData.datasets.push(item);
            }
            const myChart = new ChartJsImage();
            myChart.setConfig({
              type: 'bar',
              data: chartData,
            });
            myChart.toFile('test.png')
            bot.telegram.sendPhoto(chatId, {source: 'test.png'});
          }
        });
  }
  else {
    if (user.countLoginAction === 1) {
      userLogin = msg.text;
      mess = 'Введите пароль'
      user.countLoginAction++;
      bot.telegram.sendMessage(chatId, mess);
    } else if (user.countLoginAction === 2) {
      userPass = msg.text;

      apiCall(
          'http://localhost:8000/user/login',
          {method: 'post', body: {name: userLogin, password: userPass}},
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
      user.countLoginAction++;
    }
  }
});

bot.launch();
