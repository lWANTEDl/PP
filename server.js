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
                date TEXT,
                done_date TEXT
            )`);
            
            
            db.run(`ALTER TABLE ideas ADD COLUMN points_awarded INTEGER DEFAULT 0`, (err) => {});
            db.run(`ALTER TABLE ideas ADD COLUMN done_date TEXT`, (err) => {});

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
                        ["Подскажите, как правильно и в какие сроки оформить ежегодный оплачиваемый отпуск в системе 1С?", "Процесс оформления отпуска полностью автоматизирован через систему 1С ЭДО. Вам необходимо зайти во вкладку 'Кадры' -> 'Отпуск' и сформировать заявку. Обратите внимание, что заявление должно быть подано и согласовано с вашим непосредственным руководителем не позднее, чем за 14 календарных дней до даты начала отпуска. После согласования руководителем, заявка автоматически уходит в отдел кадров.", "Оформление отпуска", "Иван П.", "HR Департамент", "approved", "2023-10-01"],
                        ["Какой стейт-менеджер сейчас является стандартом для новых frontend-проектов на React в нашей компании?", "Согласно актуальным техническим стандартам и гайдлайнам нашего frontend-отдела, основным стейт-менеджером для всех новых проектов выбран Zustand. Он обеспечивает минимальный бойлерплейт и отличную производительность. Redux и Redux Toolkit поддерживаются только в legacy-проектах. Если вы начинаете новый микрофронтенд, пожалуйста, используйте Zustand.", "React, Frontend", "Анна С.", "wanted", "approved", "2023-10-05"],
                        ["Где и как можно оперативно получить справку 2-НДФЛ для предоставления в банк или налоговую?", "Все финансовые справки, включая 2-НДФЛ, можно заказать самостоятельно через портал самообслуживания 1С ЗУП (раздел 'Справки и документы'). Документ с электронной подписью формируется в течение 15 минут. Если вам нужен бумажный оригинал с синей печатью, при оформлении заявки укажите 'бумажный вид' — забрать его можно будет на следующий рабочий день на ресепшене или в кабинете бухгалтерии.", "Справки, HR", "Михаил Д.", "HR Департамент", "approved", "2023-10-10"],
                        ["Как настроить безопасное подключение к корпоративной сети (VPN) при работе из дома?", "Для удаленного доступа к внутренним ресурсам компании необходимо использовать официальный клиент Cisco AnyConnect. Скачать дистрибутив можно из базы знаний Confluence (раздел IT Support). В поле адреса сервера укажите vpn.servionica.ru. Для авторизации используйте ваши стандартные доменные учетные данные. При первом подключении потребуется подтверждение через приложение двухфакторной аутентификации.", "Администрирование, Сеть", "Петр Л.", "admin", "approved", "2023-11-01"],
                        ["Что делать и к кому обращаться, если я забыл или потерял свой постоянный магнитный пропуск в офис?", "Если вы забыли пропуск дома, обратитесь на ресепшн первого этажа с паспортом. Администратор выдаст вам временную гостевую карту на один день (ее нужно вернуть вечером). Если пропуск был утерян, необходимо незамедлительно написать служебную записку в Службу Безопасности (через Service Desk) для блокировки старой карты и выпуска новой. Изготовление нового пропуска занимает до 3-х рабочих дней.", "Офис", "Ольга И.", "Служба Безопасности", "approved", "2023-11-12"],
                        ["Каковы текущие правила гибридного графика и можно ли перейти на полную удаленную работу?", "В нашей компании действует стандартный гибридный формат работы: 2 дня в неделю обязательное присутствие в офисе, 3 дня — удаленно. Конкретные 'офисные' дни согласовываются индивидуально с руководителем вашего подразделения для обеспечения пересечения с командой. Полный переход на удаленный формат (100% времени) возможен только по производственной необходимости и требует согласования.", "HR, График", "wanted", "HR Департамент", "approved", "2023-11-15"],
                        ["Подскажите актуальные настройки для подключения корпоративной электронной почты на личном мобильном телефоне?", "В целях безопасности мы рекомендуем использовать официальное мобильное приложение Microsoft Outlook. При настройке выберите тип аккаунта 'Exchange'. Ваш логин — это полный email-адрес. Если автонастройка не сработает, укажите сервер вручную: autodiscover.servionica.ru. Обратите внимание, что политика безопасности требует обязательного наличия PIN-кода для разблокировки экрана.", "Администрирование, Mobile", "Евгений М.", "admin", "approved", "2023-12-01"],
                        ["Как правильно оформить заявку на вызов курьера для отправки оригиналов документов клиентам?", "Заказ курьерских услуг осуществляется через внутренний портал АХО. Перейдите во вкладку 'Логистика' -> 'Заказ курьера'. Обязательно укажите точный адрес получателя, контактное лицо и телефон, а также габариты отправления. Заявки 'день в день' принимаются строго до 14:00. Все документы должны быть упакованы в фирменные конверты, которые есть у секретаря.", "Офис, Логистика", "Светлана Р.", "АХО", "approved", "2024-01-10"],
                        ["Какие архитектурные паттерны и фреймворки сейчас утверждены для backend-разработки на Node.js?", "Архитектурный комитет утвердил следующие стандарты: для крупных монолитных сервисов и сложных API с выраженной бизнес-логикой мы используем NestJS (с обязательной типизацией TypeScript и DI). Для небольших изолированных микросервисов допускается использование Express или Fastify. Для работы с базами данных стандартом является ORM Prisma.", "Backend, Node.js", "Дмитрий В.", "Архитектор", "approved", "2024-01-20"],
                        ["Где можно найти актуальную организационную структуру компании и контакты руководителей смежных отделов?", "Вся актуальная оргструктура, включая иерархию отделов, доступна в интерактивном 'Телефонном справочнике' на главной странице корпоративного портала. Вы можете искать сотрудников по ФИО, должности или названию подразделения. В карточке каждого сотрудника указаны его внутренний телефон, email, Telegram, руководитель и текущий статус.", "HR", "Илья Н.", "HR Департамент", "approved", "2024-02-05"]
                    ];
                    faqsData.forEach(f => stmt.run(f));
                    stmt.finalize();
                }
            });

            
            db.get("SELECT COUNT(*) as count FROM ideas", (err, row) => {
                if (row.count === 0) {
                    const stmt = db.prepare("INSERT INTO ideas (title, desc, tags, author, status, votes, date, done_date) VALUES (?, ?, ?, ?, ?, ?, ?, ?)");
                    const ideasData = [
                        ["Telegram-бот для доступов", "Автоматическая выдача доступов к тестовым стендам.", "Администрирование, Автоматизация", "wanted", "done", 142, "2023-09-01", "2023-10-15"],
                        ["UI-Kit на React", "Собрать UI кит на Storybook для всех внутренних сервисов.", "React, Дизайн", "Алексей И.", "progress", 87, "2023-10-10", null],
                        ["Пятничный Tech Talk", "Собираемся раз в месяц, едим пиццу, обсуждаем технологии.", "Обучение, HR", "admin", "review", 45, "2023-11-05", null],
                        ["Темная тема для портала", "Глаза устают, нужна темная тема на этот портал.", "Дизайн, UX", "Елена М.", "vote", 12, "2023-12-01", null],
                        ["Кулер на 4-й этаж", "Поставьте кулер с газированной водой на 4 этаже возле переговорки.", "Офис", "Олег Р.", "done", 55, "2024-01-15", "2024-01-20"],
                        ["Авто-форматирование кода (Prettier)", "Добавить Prettier hook на pre-commit во все проекты.", "Frontend, CI/CD", "wanted", "progress", 34, "2024-02-10", null],
                        ["Курсы Английского", "Нанять корпоративного преподавателя для разговорного клуба онлайн.", "Обучение", "Анна С.", "vote", 19, "2024-02-20", null],
                        ["Обновление кофемашин", "То зерно, что сейчас, горчит. Давайте проведем голосование за новый сорт.", "Офис, Кофе", "Максим Т.", "review", 61, "2024-03-01", null],
                        ["Переход на TypeScript", "Ввести обязательное правило: новые проекты только на TS.", "Frontend, Backend", "Николай А.", "done", 110, "2024-03-05", "2024-03-25"],
                        ["Внедрение CI/CD GitLab", "Перенести оставшиеся старые проекты с Jenkins на GitLab CI.", "DevOps, CI/CD", "admin", "progress", 88, "2024-03-10", null]
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
    
    const finalAnswer = (req.user.username === 'admin' && answer) ? answer : 'Ожидает ответа...';
    const finalAnsweredBy = (req.user.username === 'admin' && answer) ? req.user.username : 'Ожидает ответа';

    db.run(`INSERT INTO faqs (question, answer, tags, asked_by, answered_by, status, images, date) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`, 
        [question, finalAnswer, tags || "Без тега", req.user.username, finalAnsweredBy, 'approved', JSON.stringify(images || []), date], function(err) {
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
    db.get(`SELECT asked_by, answer as current_answer, answered_by FROM faqs WHERE id = ?`, [id], (err, row) => {
        if (!row) return res.status(404).json({ error: "Не найдено" });
        if (row.asked_by !== req.user.username && req.user.username !== 'admin') return res.status(403).json({ error: "Нет прав" });
        
        let finalAnswer = answer;
        let finalAnsweredBy = req.user.username === 'admin' ? req.user.username : row.answered_by;

        if (req.user.username !== 'admin') {
            finalAnswer = row.current_answer;
            finalAnsweredBy = row.answered_by;
        } else if (!finalAnswer || finalAnswer.trim() === '') {
            finalAnswer = 'Ожидает ответа...';
            finalAnsweredBy = 'Ожидает ответа';
        }

        db.run(`UPDATE faqs SET question = ?, answer = ?, tags = ?, images = ?, answered_by = ? WHERE id = ?`, [question, finalAnswer, tags, JSON.stringify(images || []), finalAnsweredBy, id], (err) => {
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
    
    db.get(`SELECT author, title, points_awarded, status FROM ideas WHERE id = ?`, [id], (err, idea) => {
        if (!idea) return res.status(404).json({ error: "Идея не найдена" });
        
        const currentPoints = idea.points_awarded || 0;
        const diff = newPoints - currentPoints;
        
        let dateQueryPart = '';
        let queryParams = [status, newPoints, id];
        
        if (status === 'done' && idea.status !== 'done') {
            dateQueryPart = `, done_date = ?`;
            queryParams = [status, newPoints, new Date().toISOString().split('T')[0], id];
        } else if (status !== 'done') {
            dateQueryPart = `, done_date = NULL`;
        }
        
        db.run(`UPDATE ideas SET status = ?, points_awarded = ?${dateQueryPart} WHERE id = ?`, queryParams);
        
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
