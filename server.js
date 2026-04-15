const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const cors = require('cors');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

const app = express();
app.use(cors());
app.use(express.json());
app.use(express.static(__dirname));


if (!fs.existsSync('./uploads')) {
    fs.mkdirSync('./uploads');
}
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));


const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, 'uploads/');
    },
    filename: (req, file, cb) => {
        const ext = path.extname(file.originalname);
        cb(null, Date.now() + '-' + Math.round(Math.random() * 1E9) + ext);
    }
});
const upload = multer({ storage });

const SECRET_KEY = "serviohub_secret_key_123";


const db = new sqlite3.Database('./database_v2.sqlite', (err) => {
    if (err) console.error(err.message);
    else {
        console.log('Подключено к БД sqlite_v2.');
        db.serialize(() => {
            db.run(`CREATE TABLE IF NOT EXISTS users (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                username TEXT UNIQUE,
                password TEXT,
                points INTEGER DEFAULT 0,
                is_expert BOOLEAN DEFAULT 0,
                expert_tag TEXT,
                avatar_url TEXT
            )`);

            db.run(`CREATE TABLE IF NOT EXISTS faqs (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                question TEXT,
                answer TEXT,
                tags TEXT,
                asked_by TEXT,
                answered_by TEXT,
                status TEXT DEFAULT 'approved',
                images TEXT,
                date TEXT
            )`);

            db.run(`CREATE TABLE IF NOT EXISTS ideas (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                title TEXT,
                desc TEXT,
                tags TEXT,
                author TEXT,
                status TEXT DEFAULT 'vote',
                votes INTEGER DEFAULT 0,
                points_awarded INTEGER DEFAULT 0,
                images TEXT,
                date TEXT
            )`);
            
            
            db.run(`ALTER TABLE ideas ADD COLUMN points_awarded INTEGER DEFAULT 0`, (err) => {});

            db.run(`CREATE TABLE IF NOT EXISTS votes (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                user_id INTEGER,
                idea_id INTEGER,
                vote_type TEXT,
                UNIQUE(user_id, idea_id)
            )`);

            db.run(`CREATE TABLE IF NOT EXISTS points_history (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                user_id INTEGER,
                amount INTEGER,
                reason TEXT,
                date TEXT
            )`);

            
            const insertUser = db.prepare(`INSERT OR IGNORE INTO users (username, password, points, is_expert, expert_tag) VALUES (?, ?, ?, ?, ?)`);
            insertUser.run('wanted', bcrypt.hashSync('wanted', 10), 1250, 1, 'React');
            insertUser.run('admin', bcrypt.hashSync('admin', 10), 9999, 1, 'Администрирование');
            insertUser.finalize();

           
            db.get("SELECT COUNT(*) as count FROM faqs", (err, row) => {
                if (row.count === 0) {
                    const stmt = db.prepare("INSERT INTO faqs (question, answer, tags, asked_by, answered_by, status, date) VALUES (?, ?, ?, ?, ?, ?, ?)");
                    const faqsData = [
                        ["Как оформить отпуск в 1С?", "Заявление подается через систему 1С ЭДО. Зайдите в 'Кадры' -> 'Отпуск'.", "Оформление отпуска", "Иван П.", "HR Департамент", "approved", "2023-10-01"],
                        ["Какой стейт-менеджер используем в React?", "Согласно стандартам компании, используем Zustand. Redux - только legacy.", "React, Frontend", "Анна С.", "wanted", "approved", "2023-10-05"],
                        ["Где взять справку 2-НДФЛ?", "Запросите в 1С ЗУП (раздел Справки) или напишите тикет в бухгалтерию.", "Справки, HR", "Михаил Д.", "HR Департамент", "approved", "2023-10-10"],
                        ["Как подключиться к VPN из дома?", "Скачайте клиент AnyConnect, адрес сервера vpn.servionica.ru, логин/пароль доменные.", "Администрирование, Сеть", "Петр Л.", "admin", "approved", "2023-11-01"],
                        ["Что делать, если забыл пропуск?", "Обратитесь на ресепшн с паспортом, вам выдадут временную карточку на 1 день.", "Офис", "Ольга И.", "Служба Безопасности", "approved", "2023-11-12"],
                        ["Можно ли работать удаленно?", "Да, гибридный график (2 дня в офисе, 3 дома) согласовывается с руководителем.", "HR, График", "wanted", "HR Департамент", "approved", "2023-11-15"],
                        ["Как настроить корпоративную почту на телефоне?", "Используйте приложение Outlook. Сервер: autodiscover.servionica.ru.", "Администрирование, Mobile", "Евгений М.", "admin", "approved", "2023-12-01"],
                        ["Как заказать курьера?", "Через портал АХО. Выберите вкладку 'Логистика' и заполните заявку до 14:00.", "Офис, Логистика", "Светлана Р.", "АХО", "approved", "2024-01-10"],
                        ["Какие паттерны для Node.js в ходу?", "Используем NestJS для крупных сервисов, Express для микросервисов.", "Backend, Node.js", "Дмитрий В.", "Архитектор", "approved", "2024-01-20"],
                        ["Где посмотреть структуру компании?", "В телефонном справочнике на главной странице портала (Справочник).", "HR", "Илья Н.", "HR Департамент", "approved", "2024-02-05"]
                    ];
                    faqsData.forEach(f => stmt.run(f));
                    stmt.finalize();
                }
            });

            
            db.get("SELECT COUNT(*) as count FROM ideas", (err, row) => {
                if (row.count === 0) {
                    const stmt = db.prepare("INSERT INTO ideas (title, desc, tags, author, status, votes, date) VALUES (?, ?, ?, ?, ?, ?, ?)");
                    const ideasData = [
                        ["Telegram-бот для доступов", "Автоматическая выдача доступов к тестовым стендам.", "Администрирование, Автоматизация", "wanted", "done", 142, "Реализовано"],
                        ["UI-Kit на React", "Собрать UI кит на Storybook для всех внутренних сервисов.", "React, Дизайн", "Алексей И.", "progress", 87, "В работе"],
                        ["Пятничный Tech Talk", "Собираемся раз в месяц, едим пиццу, обсуждаем технологии.", "Обучение, HR", "admin", "review", 45, "На рассмотрении"],
                        ["Темная тема для портала", "Глаза устают, нужна темная тема на этот портал.", "Дизайн, UX", "Елена М.", "vote", 12, "Сбор голосов"],
                        ["Кулер на 4-й этаж", "Поставьте кулер с газированной водой на 4 этаже возле переговорки.", "Офис", "Олег Р.", "done", 55, "Реализовано"],
                        ["Авто-форматирование кода (Prettier)", "Добавить Prettier hook на pre-commit во все проекты.", "Frontend, CI/CD", "wanted", "progress", 34, "В работе"],
                        ["Курсы Английского", "Нанять корпоративного преподавателя для разговорного клуба онлайн.", "Обучение", "Анна С.", "vote", 19, "Сбор голосов"],
                        ["Обновление кофемашин", "То зерно, что сейчас, горчит. Давайте проведем голосование за новый сорт.", "Офис, Кофе", "Максим Т.", "review", 61, "На рассмотрении"],
                        ["Переход на TypeScript", "Ввести обязательное правило: новые проекты только на TS.", "Frontend, Backend", "Николай А.", "done", 110, "Реализовано"],
                        ["Внедрение CI/CD GitLab", "Перенести оставшиеся старые проекты с Jenkins на GitLab CI.", "DevOps, CI/CD", "admin", "progress", 88, "В работе"]
                    ];
                    ideasData.forEach(i => stmt.run(i));
                    stmt.finalize();
                }
                
                db.run(`UPDATE ideas SET points_awarded = CASE WHEN LENGTH(desc) > 60 THEN 1000 ELSE 500 END WHERE status = 'done' AND (points_awarded IS NULL OR points_awarded = 0)`);
            });
        });
    }
});


function authenticateToken(req, res, next) {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];
    if (!token) return res.status(401).json({ error: "Необходима авторизация" });

    jwt.verify(token, SECRET_KEY, (err, user) => {
        if (err) return res.status(403).json({ error: "Недействительный токен" });
        req.user = user;
        next();
    });
}


app.post('/api/upload', authenticateToken, upload.array('images', 5), (req, res) => {
    const urls = req.files.map(f => `/uploads/${f.filename}`);
    res.json({ urls });
});


app.post('/api/register', (req, res) => {
    const { username, password } = req.body;
    if (!username || !password) return res.status(400).json({ error: "Заполните все поля" });
    const hash = bcrypt.hashSync(password, 10);
    db.run(`INSERT INTO users (username, password) VALUES (?, ?)`, [username, hash], function(err) {
        if (err) return res.status(400).json({ error: "Пользователь существует" });
        res.json({ message: "Успех" });
    });
});

app.post('/api/login', (req, res) => {
    const { username, password } = req.body;
    db.get(`SELECT * FROM users WHERE username = ?`, [username], (err, user) => {
        if (err || !user || !bcrypt.compareSync(password, user.password)) {
            return res.status(401).json({ error: "Неверный логин или пароль" });
        }
        const token = jwt.sign({ id: user.id, username: user.username }, SECRET_KEY);
        res.json({ token, user });
    });
});


app.get('/api/profile/:username', authenticateToken, (req, res) => {
    const { username } = req.params;
    db.get(`SELECT id, username, points, is_expert, expert_tag, avatar_url FROM users WHERE username = ?`, [username], (err, user) => {
        if (!user) return res.status(404).json({ error: "Не найден" });
        
        db.all(`SELECT * FROM faqs WHERE asked_by = ? ORDER BY id DESC`, [username], (err, userFaqs) => {
            db.all(`SELECT * FROM ideas WHERE author = ? ORDER BY id DESC`, [username], (err, userIdeas) => {
                db.all(`SELECT * FROM points_history WHERE user_id = ? ORDER BY id DESC`, [user.id], (err, history) => {
                    res.json({ user, faqs: userFaqs, ideas: userIdeas, history });
                });
            });
        });
    });
});

app.post('/api/profile', authenticateToken, (req, res) => {
    const { avatar_url } = req.body;
    db.run(`UPDATE users SET avatar_url = ? WHERE id = ?`, [avatar_url, req.user.id], (err) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ message: "Профиль обновлен", avatar_url });
    });
});


app.get('/api/faqs', (req, res) => {
    db.all(`SELECT * FROM faqs WHERE status != 'draft' ORDER BY id DESC`, [], (err, rows) => {
        res.json(rows.map(r => ({...r, images: r.images ? JSON.parse(r.images) : []})));
    });
});

app.post('/api/faqs', authenticateToken, (req, res) => {
    const { question, answer, tags, images } = req.body;
    const date = new Date().toISOString().split('T')[0];
    db.run(`INSERT INTO faqs (question, answer, tags, asked_by, answered_by, status, images, date) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`, 
        [question, answer, tags || "Без тега", req.user.username, 'Ожидает ответа', 'approved', JSON.stringify(images || []), date], function(err) {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ id: this.lastID });
    });
});


app.delete('/api/faqs/:id', authenticateToken, (req, res) => {
    const { id } = req.params;
    db.get(`SELECT asked_by FROM faqs WHERE id = ?`, [id], (err, row) => {
        if (!row) return res.status(404).json({ error: "Не найдено" });
        if (row.asked_by !== req.user.username && req.user.username !== 'admin') return res.status(403).json({ error: "Нет прав" });
        
        db.run(`DELETE FROM faqs WHERE id = ?`, [id], (err) => {
            if (err) return res.status(500).json({ error: err.message });
            res.json({ message: "Удалено" });
        });
    });
});


app.put('/api/faqs/:id', authenticateToken, (req, res) => {
    const { id } = req.params;
    const { question, answer, tags, images } = req.body;
    db.get(`SELECT asked_by FROM faqs WHERE id = ?`, [id], (err, row) => {
        if (!row) return res.status(404).json({ error: "Не найдено" });
        if (row.asked_by !== req.user.username && req.user.username !== 'admin') return res.status(403).json({ error: "Нет прав" });
        
        db.run(`UPDATE faqs SET question = ?, answer = ?, tags = ?, images = ?, answered_by = ? WHERE id = ?`, [question, answer, tags, JSON.stringify(images || []), req.user.username, id], (err) => {
            if (err) return res.status(500).json({ error: err.message });
            res.json({ message: "Обновлено" });
        });
    });
});


app.get('/api/ideas', (req, res) => {
    db.all(`SELECT * FROM ideas ORDER BY votes DESC, id DESC`, [], (err, rows) => {
        res.json(rows.map(r => ({...r, images: r.images ? JSON.parse(r.images) : []})));
    });
});

app.post('/api/ideas', authenticateToken, (req, res) => {
    const { title, desc, tags, images } = req.body;
    const date = new Date().toISOString().split('T')[0];
    db.run(`INSERT INTO ideas (title, desc, tags, author, status, votes, images, date) VALUES (?, ?, ?, ?, 'vote', 0, ?, ?)`, 
        [title, desc, tags || "Без тега", req.user.username, JSON.stringify(images || []), date], function(err) {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ id: this.lastID });
    });
});


app.delete('/api/ideas/:id', authenticateToken, (req, res) => {
    const { id } = req.params;
    db.get(`SELECT author FROM ideas WHERE id = ?`, [id], (err, row) => {
        if (!row) return res.status(404).json({ error: "Не найдено" });
        if (row.author !== req.user.username && req.user.username !== 'admin') return res.status(403).json({ error: "Нет прав" });
        
        db.run(`DELETE FROM ideas WHERE id = ?`, [id], (err) => {
            if (err) return res.status(500).json({ error: err.message });
            res.json({ message: "Удалено" });
        });
    });
});


app.put('/api/ideas/:id', authenticateToken, (req, res) => {
    const { id } = req.params;
    const { title, desc, tags, images } = req.body;
    db.get(`SELECT author FROM ideas WHERE id = ?`, [id], (err, row) => {
        if (!row) return res.status(404).json({ error: "Не найдено" });
        if (row.author !== req.user.username && req.user.username !== 'admin') return res.status(403).json({ error: "Нет прав" });
        
        db.run(`UPDATE ideas SET title = ?, desc = ?, tags = ?, images = ? WHERE id = ?`, [title, desc, tags, JSON.stringify(images || []), id], (err) => {
            if (err) return res.status(500).json({ error: err.message });
            res.json({ message: "Обновлено" });
        });
    });
});


app.post('/api/ideas/:id/vote', authenticateToken, (req, res) => {
    const { id } = req.params;
    const { type } = req.body; 
    const change = type === 'up' ? 1 : -1;
    const userId = req.user.id;

    db.get(`SELECT vote_type FROM votes WHERE user_id = ? AND idea_id = ?`, [userId, id], (err, existingVote) => {
        if (existingVote) {
             if (existingVote.vote_type === type) {
                 const revertChange = type === 'up' ? -1 : 1;
                 db.run(`DELETE FROM votes WHERE user_id = ? AND idea_id = ?`, [userId, id]);
                 db.run(`UPDATE ideas SET votes = votes + ? WHERE id = ?`, [revertChange, id]);
                 setTimeout(() => {
                     db.get(`SELECT votes FROM ideas WHERE id = ?`, [id], (err, row) => res.json({ votes: row.votes }));
                 }, 50);
                 return;
             } else {
                   const totalChange = type === 'up' ? 2 : -2;
                 db.run(`UPDATE votes SET vote_type = ? WHERE user_id = ? AND idea_id = ?`, [type, userId, id]);
                 db.run(`UPDATE ideas SET votes = votes + ? WHERE id = ?`, [totalChange, id]);
             }
        } else {
             db.run(`INSERT INTO votes (user_id, idea_id, vote_type) VALUES (?, ?, ?)`, [userId, id, type]);
             db.run(`UPDATE ideas SET votes = votes + ? WHERE id = ?`, [change, id]);
        }
        setTimeout(() => {
            db.get(`SELECT votes FROM ideas WHERE id = ?`, [id], (err, row) => res.json({ votes: row.votes }));
        }, 50);
    });
});


app.post('/api/admin/ideas/:id', authenticateToken, (req, res) => {
    if (req.user.username !== 'admin') return res.status(403).json({ error: "Только для админа" });
    const { id } = req.params;
    const { status, points } = req.body;
    const newPoints = parseInt(points) || 0;
    
    db.get(`SELECT author, title, points_awarded FROM ideas WHERE id = ?`, [id], (err, idea) => {
        if (!idea) return res.status(404).json({ error: "Идея не найдена" });
        
        const currentPoints = idea.points_awarded || 0;
        const diff = newPoints - currentPoints;
        
        db.run(`UPDATE ideas SET status = ?, points_awarded = ? WHERE id = ?`, [status, newPoints, id]);
        
        if (diff !== 0) {
            db.get(`SELECT id FROM users WHERE username = ?`, [idea.author], (err, authorUser) => {
                if (authorUser) {
                    db.run(`UPDATE users SET points = points + ? WHERE id = ?`, [diff, authorUser.id]);
                    const reasonText = diff > 0 ? `Начисление баллов: ${idea.title.substring(0, 30)}...` : `Корректировка баллов: ${idea.title.substring(0, 30)}...`;
                    db.run(`INSERT INTO points_history (user_id, amount, reason, date) VALUES (?, ?, ?, ?)`, 
                           [authorUser.id, diff, reasonText, new Date().toISOString().split('T')[0]]);
                }
            });
        }
        res.json({ message: "Успех" });
    });
});

app.get('/api/votes/:userId', authenticateToken, (req, res) => {
    db.all(`SELECT idea_id, vote_type FROM votes WHERE user_id = ?`, [req.user.id], (err, rows) => {
        res.json(rows || []);
    });
});

const PORT = 3000;
app.listen(PORT, () => console.log(`Сервер запущен на http://localhost:${PORT}`));
