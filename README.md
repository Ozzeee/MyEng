# MyEng ✦

Персональное приложение для изучения английского с флеш-карточками.
Хранение в Notion, деплой на Netlify.

## Стек

- **Frontend**: React + Vite
- **Backend**: Netlify Functions (serverless)
- **Storage**: Notion Database (MyEngVoc)
- **AI**: Claude API (генерация карточек)
- **Audio**: Web Speech API

---

## Деплой на Netlify (пошагово)

### 1. Загрузи код на GitHub

```bash
cd myeng
git init
git add .
git commit -m "Initial MyEng app"
git branch -M main
git remote add origin https://github.com/YOUR_USERNAME/myeng.git
git push -u origin main
```

### 2. Подключи к Netlify

1. Открой [netlify.com](https://netlify.com) → **Add new site** → **Import from Git**
2. Выбери репозиторий `myeng`
3. Build settings заполнятся автоматически из `netlify.toml`:
   - Build command: `npm run build`
   - Publish directory: `dist`

### 3. Добавь переменные окружения

В Netlify: **Site settings** → **Environment variables** → **Add variable**

| Переменная | Где взять |
|---|---|
| `NOTION_TOKEN` | [notion.so/my-integrations](https://notion.so/my-integrations) → Create integration → Internal Integration Token |
| `ANTHROPIC_API_KEY` | [console.anthropic.com](https://console.anthropic.com) → API Keys |

### 4. Получи Notion Token

1. Открой [notion.so/my-integrations](https://notion.so/my-integrations)
2. **New integration** → назови "MyEng" → Submit
3. Скопируй **Internal Integration Token** (начинается с `secret_...`)
4. В Notion открой страницу **MyEngVoc** → `···` → **Connect to** → выбери интеграцию "MyEng"

### 5. Задеплой

Нажми **Deploy site** в Netlify. Через ~2 минуты приложение будет доступно по адресу `https://your-site-name.netlify.app`

---

## Локальный запуск

```bash
npm install
```

Создай файл `.env`:
```
NOTION_TOKEN=secret_...
ANTHROPIC_API_KEY=sk-ant-...
```

```bash
npx netlify dev
```

Открой [http://localhost:8888](http://localhost:8888)

---

## Notion Database

База данных **MyEngVoc** уже настроена в твоём Notion.  
ID: `31d70567-e99a-8064-98b3-000b67bbc2e6`

Поля: Name, Translation, Transcription, Examples, Synonyms, Antonyms, Tags, Mastered, Added

---

## Как пользоваться

1. **Добавить слова** → вставь список (RU или EN) → Claude генерирует карточки → сохраняются в Notion
2. **Учиться** → переворачивай карточки → отмечай знаешь/не знаешь
3. **Цель**: минимум 20 карточек в день
4. **Теги**: фильтруй по темам (work, meeting, design...)
