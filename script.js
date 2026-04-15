const API_URL = 'http://localhost:3000/api';
let currentUser = JSON.parse(localStorage.getItem('user'));
let token = localStorage.getItem('token');
let myVotesData = [];


let faqs = [];
let ideas = [];
let currentFaqFilter = 'all';
let currentFaqTag = null;
let currentIdeaTag = null;
let currentIdeaStatus = 'all';
let currentIdeaSort = 'votes';
let currentIdeaAuthor = 'all';
let existingImages = [];

document.addEventListener('DOMContentLoaded', async () => {
    updateHeader();
    setupNavigation();
    setupAuth();
    setupModals();
    setupProfile();
    
   
    await fetchVotes();
    await fetchFAQs();
    await fetchIdeas();

  
    document.addEventListener('input', (e) => {
        if (e.target.classList.contains('validation-error')) {
            e.target.classList.remove('validation-error');
            const errText = e.target.parentElement.querySelector('.field-error');
            if (errText) errText.classList.add('hidden');
        }
    });
});


function showToast(message, type = 'success') {
    const container = document.getElementById('toast-container');
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.innerHTML = `<span>${message}</span> <i class="fa-solid ${type === 'success' ? 'fa-check-circle' : 'fa-circle-exclamation'}"></i>`;
    container.appendChild(toast);
    setTimeout(() => {
        toast.classList.add('fade-out');
        setTimeout(() => toast.remove(), 300);
    }, 3000);
}


function setupNavigation() {
    const navLinks = document.querySelectorAll('.nav-link:not(.disabled)');
    const sections = document.querySelectorAll('.section-container');

    navLinks.forEach(link => {
        link.addEventListener('click', (e) => {
            e.preventDefault();
            navLinks.forEach(l => l.classList.remove('active'));
            link.classList.add('active');

            const targetId = link.getAttribute('href').substring(1);
            sections.forEach(sec => sec.style.display = sec.id === targetId ? 'block' : 'none');
            
           
            if (targetId === 'profile' && token) {
                loadProfileStats();
            }
        });
    });

    
    document.getElementById('logo-btn').addEventListener('click', () => {
        document.getElementById('about-modal').classList.remove('hidden');
    });
}


function showProfileSection() {
    document.querySelectorAll('.section-container').forEach(s => s.style.display = 'none');
    document.querySelectorAll('.nav-link').forEach(l => l.classList.remove('active'));
    document.getElementById('profile').style.display = 'block';
    if (token) loadProfileStats();
}


async function fetchVotes() {
    if (!token || !currentUser) return;
    try {
        const res = await fetch(`${API_URL}/votes/${currentUser.id}`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        myVotesData = await res.json();
    } catch(e) {}
}

function updateHeader() {
    const profileContainer = document.getElementById('user-profile');
    
    if (currentUser) {
        document.getElementById('btn-login-header')?.remove();
        
        const avatarUrl = currentUser.avatar_url || `https://ui-avatars.com/api/?name=${currentUser.username}&background=1756A9&color=fff`;
        profileContainer.innerHTML = `
            <div class="user-info">
                <span class="user-name">${currentUser.username}</span>
                <span class="user-points"><i class="fa-solid fa-coins"></i> <span id="header-points">${currentUser.points}</span> баллов</span>
            </div>
            <div class="avatar" id="avatar-btn">
                <img src="${avatarUrl}" alt="Аватар" title="Меню профиля">
                ${currentUser.expert_tag ? `<div class="badge-expert" title="Эксперт по ${currentUser.expert_tag}"><i class="fa-solid fa-star"></i></div>` : ''}
            </div>
            <div class="profile-dropdown" id="profile-dropdown">
                <div class="dropdown-item" id="go-to-profile"><i class="fa-solid fa-user"></i> Мой профиль</div>
                <div class="dropdown-item text-danger" onclick="logout()"><i class="fa-solid fa-right-from-bracket"></i> Выйти</div>
            </div>
        `;

        
        const dropdown = document.getElementById('profile-dropdown');
        document.getElementById('avatar-btn').addEventListener('click', (e) => {
            e.stopPropagation();
            dropdown.classList.toggle('active');
        });
        document.getElementById('go-to-profile').addEventListener('click', () => {
            dropdown.classList.remove('active');
            showProfileSection();
        });
        document.addEventListener('click', (e) => {
            if (!e.target.closest('#user-profile') && dropdown.classList.contains('active')) {
                dropdown.classList.remove('active');
            }
        });

    } else {
        profileContainer.innerHTML = `<button class="btn btn-outline" id="btn-login-header" type="button">Войти / Регистрация</button>`;
        document.getElementById('btn-login-header').addEventListener('click', () => showAuthModal('login'));
    }
}

function logout() {
    if(confirm('Вы уверены, что хотите выйти?')) {
        localStorage.removeItem('user');
        localStorage.removeItem('token');
        currentUser = null;
        token = null;
        myVotesData = [];
        updateHeader();
        document.querySelector('a[href="#faq"]').click();
        fetchFAQs();
        fetchIdeas();
    }
}


async function fetchFAQs() {
    try {
        const res = await fetch(`${API_URL}/faqs`);
        faqs = await res.json();
        renderFAQs();
        renderFAQTags();
        setupFAQSearch();
    } catch(e) { console.error('Ошибка загрузки FAQ', e); }
}

function generateImagesHTML(imagesArr) {
    if (!imagesArr || imagesArr.length === 0) return '';
    return `<div class="attached-images">
        ${imagesArr.map(url => `<img src="http://localhost:3000${url}" onclick="window.open(this.src, '_blank')">`).join('')}
    </div>`;
}

function renderFAQs() {
    const list = document.getElementById('faq-container');
    list.innerHTML = '';
    
    let filtered = faqs;
    if (currentFaqFilter === 'my') {
        if (!currentUser) filtered = [];
        else filtered = filtered.filter(f => f.asked_by === currentUser.username);
    }
    if (currentFaqTag) filtered = filtered.filter(f => f.tags.includes(currentFaqTag));

    if (filtered.length === 0) { list.innerHTML = '<p class="no-results">Ничего не найдено.</p>'; return; }

    filtered.forEach(faq => {
        
        const tagsArr = faq.tags.split(',').map(t => t.trim()).filter(Boolean);
        const tagsHtml = tagsArr.map(t => `<span class="tag faq-tag-clickable" data-tag="${t}">${t}</span>`).join('');

        const answeredIcon = faq.answered_by === 'Ожидает ответа' ? '<i class="fa-regular fa-clock"></i>' : '<i class="fa-solid fa-check-circle expert-check"></i>';
       
        let actionsHtml = '';
        if (currentUser && (currentUser.username === faq.asked_by || currentUser.username === 'admin')) {
            actionsHtml = `
                <div class="item-actions" style="margin-left: auto; display: flex; gap: 5px;">
                    <button type="button" class="btn-icon" onclick="editItem('faq', ${faq.id})" title="Редактировать"><i class="fa-solid fa-pen"></i></button>
                    <button type="button" class="btn-icon text-danger" onclick="deleteItem('faq', ${faq.id})" title="Удалить"><i class="fa-solid fa-trash"></i></button>
                </div>`;
        }

        let adminAnswerBtn = '';
        if (currentUser && currentUser.username === 'admin') {
            const btnText = (faq.answered_by === 'Ожидает ответа') ? '<i class="fa-solid fa-reply"></i> Ответить' : '<i class="fa-solid fa-pen-to-square"></i> Изменить ответ';
            const btnClass = (faq.answered_by === 'Ожидает ответа') ? 'btn btn-primary' : 'btn btn-outline';
            adminAnswerBtn = `<button type="button" class="${btnClass}" style="padding: 4px 10px; font-size: 12px; margin-left: 15px;" onclick="editItem('faq', ${faq.id})">${btnText}</button>`;
        }

        list.innerHTML += `
            <div class="faq-item" id="faq-${faq.id}">
                <div class="faq-question">${faq.question}</div>
                <div class="faq-answer">${faq.answer}</div>
                ${generateImagesHTML(faq.images)}
                <div class="faq-meta" style="display: flex; align-items: center; flex-wrap: wrap;">
                    ${tagsHtml}
                    <span class="author">${answeredIcon} Ответил: ${faq.answered_by}</span>
                    <span class="author" style="margin-left: 10px; font-size: 12px; opacity: 0.7;">(Спросил: ${faq.asked_by})</span>
                    <span class="author" style="margin-left: 10px; font-size: 12px;">${faq.date}</span>
                    ${adminAnswerBtn}
                    ${actionsHtml}
                </div>
            </div>
        `;
    });

    document.querySelectorAll('.faq-tag-clickable').forEach(el => {
        el.addEventListener('click', (e) => {
            const tag = e.target.getAttribute('data-tag');
            currentFaqTag = (currentFaqTag === tag) ? null : tag;
            renderFAQs();
            renderFAQTags();
            document.getElementById('faq-list-title').textContent = currentFaqTag ? `Тема: ${currentFaqTag}` : 'Все вопросы';
        });
    });
}

function renderFAQTags() {
    const allTags = [];
    faqs.forEach(f => f.tags.split(',').forEach(t => {
        const tr = t.trim();
        if (tr) allTags.push(tr);
    }));
    const uniqueTags = [...new Set(allTags)].slice(0, 15);
    
    const container = document.getElementById('faq-tags-container');
    container.innerHTML = '<span class="tag-title">Популярные темы:</span>';
    
    uniqueTags.forEach(tag => {
        const span = document.createElement('span');
        span.className = `tag ${tag === currentFaqTag ? 'active' : ''}`;
        span.textContent = tag;
        span.addEventListener('click', () => {
            currentFaqTag = (currentFaqTag === tag) ? null : tag;
            renderFAQs();
            renderFAQTags();
            document.getElementById('faq-list-title').textContent = currentFaqTag ? `Тема: ${currentFaqTag}` : 'Все вопросы';
        });
        container.appendChild(span);
    });
}

function setupFAQSearch() {
    const input = document.getElementById('smart-search');
    const resultsDiv = document.getElementById('search-results');
    const list = document.getElementById('results-list');
    const noResults = document.getElementById('no-results');

    input.addEventListener('input', (e) => {
        const q = e.target.value.trim().toLowerCase();
        if (!q) { resultsDiv.classList.add('hidden'); return; }

        resultsDiv.classList.remove('hidden');
        const matches = faqs.filter(f => f.question.toLowerCase().includes(q) || f.answer.toLowerCase().includes(q));

        if (matches.length > 0) {
            noResults.classList.add('hidden');
            list.innerHTML = '';
            matches.forEach(m => {
                const li = document.createElement('li');
                li.className = 'result-item';
                li.innerHTML = `<h4>${m.question}</h4><p>${m.answer.substring(0, 60)}...</p>`;
                li.addEventListener('click', () => {
                    resultsDiv.classList.add('hidden');
                    input.value = '';
                    currentFaqTag = null;
                    renderFAQs();
                    renderFAQTags();
                    document.getElementById('faq-list-title').textContent = 'Все вопросы';
                    setTimeout(() => {
                        const t = document.getElementById(`faq-${m.id}`);
                        if(t) { t.scrollIntoView({ behavior: 'smooth', block: 'center' }); t.classList.add('highlighted'); setTimeout(() => t.classList.remove('highlighted'), 3000); }
                    }, 100);
                });
                list.appendChild(li);
            });
        } else {
            list.innerHTML = '';
            noResults.classList.remove('hidden');
        }
    });

    document.getElementById('btn-publish-question').addEventListener('click', (e) => {
        e.preventDefault();
        if (!token) return showAuthModal('login', 'Чтобы задать вопрос, необходимо войти');
        resultsDiv.classList.add('hidden');
        showItemModal('faq', input.value);
    });

    document.querySelectorAll('#faq-filters .filter-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.preventDefault();
            const filter = e.target.getAttribute('data-filter');
            if (filter === 'my' && !token) return showAuthModal('login', 'Войдите, чтобы посмотреть свои вопросы');
            document.querySelectorAll('#faq-filters .filter-btn').forEach(b => b.classList.remove('active'));
            e.target.classList.add('active');
            currentFaqFilter = filter;
            renderFAQs();
        });
    });
}


async function fetchIdeas() {
    try {
        const res = await fetch(`${API_URL}/ideas`);
        ideas = await res.json();
        renderTopAuthors();
        setupIdeaSorting();
        renderIdeas();
        setupIdeaSearch();
    } catch(e) {}
}

function renderIdeas(containerId = 'ideas-container', hideAdmin = false) {
    const list = document.getElementById(containerId);
    if (!list) return;
    list.innerHTML = '';

    if (typeof list.animate === 'function') {
        list.animate([
            { opacity: 0, transform: 'translateY(15px)' },
            { opacity: 1, transform: 'translateY(0)' }
        ], { duration: 400, easing: 'ease-out' });
    }

    const searchInput = document.getElementById('idea-search');
    const searchQuery = searchInput ? searchInput.value.toLowerCase() : '';
    
    let filtered = ideas;
    
    if (containerId === 'ideas-container') {
        filtered = ideas.filter(idea => {
            let match = true;
            if (currentIdeaStatus === 'my') {
                if (!currentUser || idea.author !== currentUser.username) match = false;
            } else if (currentIdeaStatus !== 'all' && idea.status !== currentIdeaStatus) match = false;
            if (currentIdeaTag && !idea.tags.includes(currentIdeaTag)) match = false;
            if (currentIdeaAuthor !== 'all' && idea.author !== currentIdeaAuthor) match = false;
            if (searchQuery && !(idea.title.toLowerCase().includes(searchQuery) || idea.desc.toLowerCase().includes(searchQuery))) match = false;
            return match;
        });
        
        const tagBlock = document.getElementById('idea-tags-container');
        if (currentIdeaTag) {
            tagBlock.classList.remove('hidden');
            document.getElementById('active-idea-tag').textContent = currentIdeaTag;
        } else tagBlock.classList.add('hidden');
    } else {
        
        filtered = ideas.filter(i => i.author === currentUser.username);
    }

    if (containerId === 'ideas-container') {
        const authorCounts = {};
        ideas.forEach(i => {
            authorCounts[i.author] = (authorCounts[i.author] || 0) + 1;
        });

        filtered.sort((a, b) => {
            if (currentIdeaSort === 'votes') {
                if (b.votes === a.votes) return b.id - a.id;
                return b.votes - a.votes;
            } else if (currentIdeaSort === 'date_new') {
                return b.id - a.id;
            } else if (currentIdeaSort === 'date_old') {
                return a.id - b.id;
            } else if (currentIdeaSort === 'author_top') {
                const countDiff = authorCounts[b.author] - authorCounts[a.author];
                if (countDiff !== 0) return countDiff;
                if (b.votes === a.votes) return b.id - a.id;
                return b.votes - a.votes;
            }
            return 0;
        });
    }

    if (filtered.length === 0) { list.innerHTML = '<p class="no-results">Идей не найдено.</p>'; return; }

    const statusMap = {
        'vote': { text: 'Сбор голосов', class: 'status-vote' },
        'review': { text: 'На рассмотрении', class: 'status-review' },
        'progress': { text: 'В работе', class: 'status-progress' },
        'done': { text: 'Реализовано', class: 'status-done' }
    };

    filtered.forEach(idea => {
        const s = statusMap[idea.status] || statusMap['vote'];
        const tagsArr = idea.tags.split(',').map(t => t.trim()).filter(Boolean);
        const tagsHtml = tagsArr.map(t => `<span class="tag idea-tag-clickable" data-tag="${t}">${t}</span>`).join('');
        
        
        let myVote = false;
        if (currentUser) {
            const vData = myVotesData.find(v => v.idea_id === idea.id);
            if (vData) myVote = vData.vote_type; 
        }

        let pointsBadgeHtml = '';
        if (idea.status === 'done') {
            pointsBadgeHtml = `<span class="status-badge" style="background-color: #F59E0B; margin-left: 10px;"><i class="fa-solid fa-coins"></i> ${idea.points_awarded || 0} баллов</span>`;
        } else if (idea.points_awarded > 0) {
            pointsBadgeHtml = `<span class="status-badge" style="background-color: #F59E0B; margin-left: 10px;"><i class="fa-solid fa-coins"></i> +${idea.points_awarded} баллов</span>`;
        }

        const isAdmin = currentUser && currentUser.username === 'admin';
        const adminBtnHtml = (isAdmin && !hideAdmin) ? `<button class="btn btn-outline admin-action" onclick="showAdminModal(${idea.id}, '${idea.status}', ${idea.points_awarded || 0})" type="button"><i class="fa-solid fa-gear"></i> Управление</button>` : '';

        let dateHtml = `<span class="date" title="Дата публикации"><i class="fa-regular fa-calendar"></i> ${idea.date}</span>`;
        if (idea.status === 'done' && idea.done_date) {
            dateHtml += `<span class="date done-date" title="Дата реализации" style="margin-left: 10px; color: var(--status-done); font-weight: 500;"><i class="fa-solid fa-calendar-check"></i> Реализовано: ${idea.done_date}</span>`;
        }

       
        let actionsHtml = '';
        const isAuthor = currentUser && currentUser.username === idea.author;
        if (isAdmin || (isAuthor && idea.status !== 'done')) {
            actionsHtml = `
                <div class="item-actions">
                    <button type="button" class="btn-icon" onclick="editItem('idea', ${idea.id})" title="Редактировать"><i class="fa-solid fa-pen"></i></button>
                    <button type="button" class="btn-icon text-danger" onclick="deleteItem('idea', ${idea.id})" title="Удалить"><i class="fa-solid fa-trash"></i></button>
                </div>`;
        }

        list.innerHTML += `
            <div class="idea-card">
                <div class="idea-votes">
                    <i class="fa-solid fa-chevron-up vote-up ${myVote==='up'?'active':''}" data-id="${idea.id}" data-type="up"></i>
                    <span class="vote-count" id="vote-count-${idea.id}">${idea.votes}</span>
                    <i class="fa-solid fa-chevron-down vote-down ${myVote==='down'?'active':''}" data-id="${idea.id}" data-type="down"></i>
                </div>
                <div class="idea-content">
                    <div class="idea-header">
                        <div>
                            <span class="status-badge ${s.class}">${s.text}</span>
                            ${pointsBadgeHtml}
                        </div>
                        <div style="display:flex; gap: 10px;">${adminBtnHtml}</div>
                    </div>
                    <h2 class="idea-title">${idea.title}</h2>
                    <p class="idea-desc">${idea.desc}</p>
                    ${generateImagesHTML(idea.images)}
                    <div class="idea-meta">
                        ${tagsHtml}
                        <span class="author idea-author-clickable" data-author="${idea.author}" style="cursor:pointer; text-decoration:underline;" title="Показать идеи автора">Автор: ${idea.author}</span>
                        ${dateHtml}
                        ${actionsHtml}
                    </div>
                </div>
            </div>
        `;
    });

    if (containerId === 'ideas-container') {
        document.querySelectorAll('#' + containerId + ' .idea-tag-clickable').forEach(el => {
            el.addEventListener('click', (e) => {
                currentIdeaTag = e.target.getAttribute('data-tag');
                renderIdeas();
            });
        });

        document.querySelectorAll('#' + containerId + ' .idea-author-clickable').forEach(el => {
            el.addEventListener('click', (e) => {
                currentIdeaAuthor = e.target.getAttribute('data-author');
                const select = document.getElementById('idea-author-select');
                if (select) select.value = currentIdeaAuthor;
                renderTopAuthors();
                renderIdeas();
            });
        });
    }

    document.querySelectorAll('#' + containerId + ' .vote-up, #' + containerId + ' .vote-down').forEach(btn => {
        btn.addEventListener('click', async (e) => {
            e.preventDefault();
            if (!token) return showAuthModal('login', 'Чтобы проголосовать, необходимо войти');
            const id = e.target.getAttribute('data-id');
            const type = e.target.getAttribute('data-type');
            
            try {
                const res = await fetch(`${API_URL}/ideas/${id}/vote`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                    body: JSON.stringify({ type })
                });
                if (res.ok) {
                    await fetchVotes(); 
                    await fetchIdeas(); 
                } else {
                    const data = await res.json();
                showToast(data.error, 'error');
                }
            } catch(e) {}
        });
    });
}

function renderTopAuthors() {
    const authorCounts = {};
    ideas.forEach(i => {
        authorCounts[i.author] = (authorCounts[i.author] || 0) + 1;
    });

    const sortedAuthors = Object.entries(authorCounts).sort((a, b) => b[1] - a[1]).slice(0, 5);
    if (sortedAuthors.length === 0) return;

    let topBlock = document.getElementById('top-authors-block');
    if (!topBlock) {
        topBlock = document.createElement('div');
        topBlock.id = 'top-authors-block';
        topBlock.style.margin = '20px 0';
        topBlock.style.padding = '15px';
        topBlock.style.background = 'var(--bg-secondary, #f8fafc)';
        topBlock.style.borderRadius = '8px';
        topBlock.style.border = '1px solid var(--border-color, #e2e8f0)';

        const ideasContainer = document.getElementById('ideas-container');
        if (ideasContainer && ideasContainer.parentNode) {
            ideasContainer.parentNode.insertBefore(topBlock, ideasContainer);
        }
    }

    if (topBlock) {
        topBlock.innerHTML = `
            <h3 style="margin-top:0; margin-bottom:15px; font-size:16px; display:flex; align-items:center; gap:8px;">
                <i class="fa-solid fa-trophy" style="color:#fbbf24;"></i> Топ авторов идей
            </h3>
            <div style="display:flex; flex-wrap:wrap; gap:10px;">
                ${sortedAuthors.map((a, i) => {
                    const isActive = a[0] === currentIdeaAuthor;
                    const bg = isActive ? '#e0f2fe' : 'var(--bg-primary, #fff)';
                    const border = isActive ? '#3b82f6' : 'var(--border-color, #cbd5e1)';
                    return `
                    <div class="top-author-clickable" data-author="${a[0]}" style="background:${bg}; padding:6px 12px; border-radius:20px; border:1px solid ${border}; font-size:13px; display:flex; align-items:center; gap:6px; box-shadow:0 1px 2px rgba(0,0,0,0.05); cursor:pointer; transition:0.2s;" title="Показать идеи автора">
                        <span style="font-weight:bold; color:var(--text-main, #333); pointer-events:none;">${i + 1}. ${a[0]}</span> 
                        <span style="opacity:0.6; font-size:12px; pointer-events:none;">${a[1]} идей</span>
                    </div>
                    `;
                }).join('')}
            </div>
        `;

        topBlock.querySelectorAll('.top-author-clickable').forEach(el => {
            el.addEventListener('click', (e) => {
                const author = e.currentTarget.getAttribute('data-author');
                currentIdeaAuthor = (currentIdeaAuthor === author) ? 'all' : author;
                const select = document.getElementById('idea-author-select');
                if (select) select.value = currentIdeaAuthor;
                renderTopAuthors();
                renderIdeas();
            });
        });
    }
}

function setupIdeaSorting() {
    let sortBlock = document.getElementById('idea-sort-block');
    if (!sortBlock) {
        sortBlock = document.createElement('div');
        sortBlock.id = 'idea-sort-block';
        sortBlock.style.marginBottom = '15px';
        sortBlock.style.display = 'flex';
        sortBlock.style.alignItems = 'center';
        sortBlock.style.gap = '10px';
        sortBlock.style.flexWrap = 'wrap';
        
        sortBlock.innerHTML = `
            <label for="idea-sort-select" style="font-weight:bold;">Сортировка:</label>
            <select id="idea-sort-select" style="padding:8px; border-radius:5px; border:1px solid var(--border-color, #cbd5e1); background: var(--bg-primary, #fff); color: var(--text-main, #000); outline: none;">
                <option value="votes">По лучшим оценкам</option>
                <option value="date_new">По дате (сначала новые)</option>
                <option value="date_old">По дате (сначала старые)</option>
                <option value="author_top">По авторам (у кого больше идей)</option>
            </select>

            <label for="idea-author-select" style="font-weight:bold; margin-left:10px;">Автор:</label>
            <select id="idea-author-select" style="padding:8px; border-radius:5px; border:1px solid var(--border-color, #cbd5e1); background: var(--bg-primary, #fff); color: var(--text-main, #000); outline: none;">
                <option value="all">Все авторы</option>
            </select>
        `;
        
        const topBlock = document.getElementById('top-authors-block');
        const ideasContainer = document.getElementById('ideas-container');
        
        if (topBlock && topBlock.parentNode) {
            topBlock.parentNode.insertBefore(sortBlock, topBlock.nextSibling);
        } else if (ideasContainer && ideasContainer.parentNode) {
            ideasContainer.parentNode.insertBefore(sortBlock, ideasContainer);
        }

        document.getElementById('idea-sort-select').addEventListener('change', (e) => {
            currentIdeaSort = e.target.value;
            renderIdeas();
        });
        document.getElementById('idea-author-select').addEventListener('change', (e) => {
            currentIdeaAuthor = e.target.value;
            renderTopAuthors();
            renderIdeas();
        });
    }

    const authorSelect = document.getElementById('idea-author-select');
    if (authorSelect && ideas.length > 0) {
        const uniqueAuthors = [...new Set(ideas.map(i => i.author))].sort();
        const currentValue = currentIdeaAuthor;
        authorSelect.innerHTML = '<option value="all">Все авторы</option>' + 
            uniqueAuthors.map(a => `<option value="${a}">${a}</option>`).join('');
        authorSelect.value = uniqueAuthors.includes(currentValue) ? currentValue : 'all';
    }
}

function setupIdeaSearch() {
    setupIdeaSorting();
    document.getElementById('idea-search').addEventListener('input', () => renderIdeas());
    document.querySelectorAll('#ideas-status-filters .filter-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.preventDefault();
            const status = e.target.getAttribute('data-status');
            if (status === 'my' && !token) return showAuthModal('login', 'Войдите, чтобы посмотреть свои идеи');
            document.querySelectorAll('#ideas-status-filters .filter-btn').forEach(b => b.classList.remove('active'));
            e.target.classList.add('active');
            currentIdeaStatus = status;
            renderIdeas();
        });
    });

    document.getElementById('clear-idea-tag').addEventListener('click', (e) => {
        e.preventDefault();
        currentIdeaTag = null;
        renderIdeas();
    });

    document.getElementById('btn-add-idea').addEventListener('click', (e) => {
        e.preventDefault();
        if (!token) return showAuthModal('login', 'Для публикации идеи нужно войти');
        showItemModal('idea');
    });
}


let currentMode = 'login';
function setupAuth() {
    const modal = document.getElementById('auth-modal');
    const form = document.getElementById('auth-form');
    document.getElementById('switch-to-register').addEventListener('click', (e) => {
        e.preventDefault();
        showAuthModal(currentMode === 'login' ? 'register' : 'login');
    });

    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        const username = document.getElementById('auth-username').value;
        const password = document.getElementById('auth-password').value;
        const errP = document.getElementById('auth-error');

        if (currentMode === 'register') {
            const confirm = document.getElementById('auth-password-confirm').value;
            if (password !== confirm) { errP.textContent = "Пароли не совпадают"; errP.classList.remove('hidden'); return; }
        }

        try {
            const endpoint = currentMode === 'login' ? '/login' : '/register';
            const res = await fetch(`${API_URL}${endpoint}`, {
                method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ username, password })
            });
            const data = await res.json();

            if (!res.ok) { errP.textContent = data.error; errP.classList.remove('hidden'); }
            else {
                if (currentMode === 'register') {
                    showAuthModal('login');
                    document.getElementById('auth-username').value = username;
                    errP.textContent = "Регистрация успешна. Войдите в аккаунт.";
                    errP.style.color = '#10B981';
                    errP.classList.remove('hidden');
                } else {
                    localStorage.setItem('token', data.token);
                    localStorage.setItem('user', JSON.stringify(data.user));
                    token = data.token; currentUser = data.user;
                    modal.classList.add('hidden');
                    updateHeader();
                    fetchVotes(); 
                    fetchIdeas();
                    fetchFAQs();
                }
            }
        } catch(e) { console.error(e); }
    });
}

function showAuthModal(mode = 'login', message = '') {
    currentMode = mode;
    document.getElementById('auth-modal').classList.remove('hidden');
    document.getElementById('auth-error').classList.add('hidden');
    document.getElementById('auth-error').style.color = '#EF4444';
    const isLogin = mode === 'login';
    
    document.getElementById('auth-title').textContent = isLogin ? (message || 'Вход на портал') : 'Регистрация';
    document.getElementById('auth-submit').textContent = isLogin ? 'Войти' : 'Зарегистрироваться';
    document.getElementById('auth-password-confirm-group').classList.toggle('hidden', isLogin);
    document.getElementById('switch-to-register').textContent = isLogin ? 'Зарегистрироваться' : 'Войти в аккаунт';
    document.querySelector('.auth-switch').childNodes[0].nodeValue = isLogin ? 'Нет аккаунта? ' : 'Уже есть профиль? ';
}

let itemMode = 'faq';
function showItemModal(mode, title = '') {
    itemMode = mode;
    document.getElementById('add-modal').classList.remove('hidden');
    document.getElementById('add-modal-title').textContent = mode === 'faq' ? 'Задать вопрос' : 'Предложить идею';
    document.getElementById('add-label-1').textContent = mode === 'faq' ? 'Ваш вопрос' : 'Заголовок идеи';
    
    const isAdmin = currentUser && currentUser.username === 'admin';
    const descGroup = document.getElementById('add-desc').parentElement;
    
    if (mode === 'faq') {
        if (isAdmin) {
            descGroup.style.display = 'block';
            document.getElementById('add-label-2').textContent = 'Ответ на вопрос (Только для админа)';
            document.getElementById('add-desc').removeAttribute('required');
        } else {
            descGroup.style.display = 'none';
            document.getElementById('add-desc').value = '';
            document.getElementById('add-desc').removeAttribute('required');
        }
    } else {
        descGroup.style.display = 'block';
        document.getElementById('add-label-2').textContent = 'Описание идеи';
        document.getElementById('add-desc').setAttribute('required', 'true');
    }

    document.getElementById('add-submit-btn').textContent = 'Опубликовать';
    
    document.getElementById('edit-item-id').value = '';
    document.getElementById('add-title').value = title;
    document.getElementById('add-desc').value = '';
    document.getElementById('add-tag').value = '';
    document.getElementById('add-images').value = '';
    existingImages = [];
    document.getElementById('existing-images-preview').innerHTML = '';

    document.querySelectorAll('.field-error').forEach(el => el.classList.add('hidden'));
    document.querySelectorAll('.validation-error').forEach(el => el.classList.remove('validation-error'));
    updateCharCounters();
}

function renderExistingImages() {
    const container = document.getElementById('existing-images-preview');
    container.innerHTML = '';
    existingImages.forEach((img, index) => {
        const wrapper = document.createElement('div');
        wrapper.className = 'image-preview-wrapper';
        wrapper.innerHTML = `
            <img src="http://localhost:3000${img}" style="max-width: 100px; height: 70px; object-fit: cover; border-radius: 8px;">
            <button type="button" class="image-delete-btn" data-index="${index}"><i class="fa-solid fa-xmark"></i></button>
        `;
        container.appendChild(wrapper);
    });
    document.querySelectorAll('.image-delete-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            existingImages.splice(parseInt(e.currentTarget.getAttribute('data-index')), 1);
            renderExistingImages();
        });
    });
}

function setupModals() {
    document.querySelectorAll('.close-modal').forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.preventDefault();
            document.querySelectorAll('.modal-overlay').forEach(m => m.classList.add('hidden'));
        });
    });
    
    document.querySelectorAll('.close-modal-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            document.querySelectorAll('.modal-overlay').forEach(m => m.classList.add('hidden'));
        });
    });

    const titleInput = document.getElementById('add-title');
    const descInput = document.getElementById('add-desc');
    if (titleInput) titleInput.addEventListener('input', updateCharCounters);
    if (descInput) descInput.addEventListener('input', updateCharCounters);

    const form = document.getElementById('add-form');
    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        
        let isValid = true;
        form.querySelectorAll('[required]').forEach(input => {
            const err = input.parentElement.querySelector('.field-error');
            if (!input.value.trim()) {
                input.classList.add('validation-error');
                if (err) err.classList.remove('hidden');
                isValid = false;
            } else {
                input.classList.remove('validation-error');
                if (err) err.classList.add('hidden');
            }
        });
        
        if (!isValid) return; 

        let imagesJSON = [];
        const files = document.getElementById('add-images').files;
        if(files.length > 0) {
            const formData = new FormData();
            for(let i=0; i<files.length; i++) formData.append('images', files[i]);
            try {
                const upRes = await fetch(`${API_URL}/upload`, { method: 'POST', body: formData, headers: {'Authorization': `Bearer ${token}`} });
                if (upRes.ok) { const ud = await upRes.json(); imagesJSON = ud.urls; }
            } catch(e) {}
        }

        const tagsInput = document.getElementById('add-tag').value.split(',').map(t=>t.trim()).filter(Boolean).join(', ');

        const bodyData = {
            question: document.getElementById('add-title').value,
            title: document.getElementById('add-title').value,
            answer: document.getElementById('add-desc').value,
            desc: document.getElementById('add-desc').value,
            tags: tagsInput || "Разное",
            images: [...existingImages, ...imagesJSON]
        };

        const editId = document.getElementById('edit-item-id').value;
        const method = editId ? 'PUT' : 'POST';
        const endpoint = itemMode === 'faq' ? '/faqs' : '/ideas';
        const url = editId ? `${API_URL}${endpoint}/${editId}` : `${API_URL}${endpoint}`;
        
        try {
            const res = await fetch(url, {
                method: method,
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                body: JSON.stringify(bodyData)
            });
            if (res.ok) {
                document.getElementById('add-modal').classList.add('hidden');
                if (itemMode === 'faq') await fetchFAQs();
                else await fetchIdeas();
                showToast(editId ? 'Успешно обновлено!' : 'Успешно опубликовано!', 'success');
            } else {
                const errData = await res.json();
                showToast(errData.error || 'Неизвестная ошибка', 'error');
            }
        } catch(e) { console.error(e); showToast('Ошибка сети при сохранении', 'error'); }
    });

   
    document.getElementById('admin-form').addEventListener('submit', async (e) => {
        e.preventDefault();
        const id = document.getElementById('admin-idea-id').value;
        const status = document.getElementById('admin-status-select').value;
        const points = parseInt(document.getElementById('admin-points').value) || 0;

        try {
            const res = await fetch(`${API_URL}/admin/ideas/${id}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                body: JSON.stringify({ status, points })
            });
            if (res.ok) {
                document.getElementById('admin-modal').classList.add('hidden');
                fetchIdeas();
                showToast(`Успех. Баллы и статус обновлены.`, 'success');
            }
        } catch(e){}
    });
}

function showAdminModal(ideaId, currentStatus, currentPoints) {
    document.getElementById('admin-modal').classList.remove('hidden');
    document.getElementById('admin-idea-id').value = ideaId;
    document.getElementById('admin-status-select').value = currentStatus;
    document.getElementById('admin-points').value = currentPoints || '0';
}

function updateCharCounters() {
    const title = document.getElementById('add-title');
    const desc = document.getElementById('add-desc');
    const tCounter = document.getElementById('add-title-counter');
    const dCounter = document.getElementById('add-desc-counter');
    
    if (title) title.setAttribute('maxlength', '250');
    if (desc) desc.setAttribute('maxlength', '3000');

    if (title && tCounter) {
        tCounter.textContent = `${title.value.length} / 250`;
        tCounter.style.color = title.value.length >= 250 ? '#DC2626' : 'var(--text-muted)';
    }
    if (desc && dCounter) {
        dCounter.textContent = `${desc.value.length} / 3000`;
        dCounter.style.color = desc.value.length >= 3000 ? '#DC2626' : 'var(--text-muted)';
    }
}


async function deleteItem(type, id) {
    if (!confirm('Вы уверены, что хотите удалить эту запись? Действие необратимо.')) return;
    try {
        const res = await fetch(`${API_URL}/${type}s/${id}`, {
            method: 'DELETE',
            headers: { 'Authorization': `Bearer ${token}` }
        });
        if (res.ok) {
            if (type === 'faq') await fetchFAQs();
            else await fetchIdeas();
        } else showToast('Ошибка при удалении', 'error');
    } catch(e) { console.error(e); showToast('Ошибка сети при удалении', 'error'); }
}

function editItem(type, id) {
    const list = type === 'faq' ? faqs : ideas;
    const item = list.find(i => i.id === id);
    if (!item) return;
    
    showItemModal(type);
    document.getElementById('add-modal-title').textContent = type === 'faq' ? 'Редактировать вопрос' : 'Редактировать идею';
    
    document.getElementById('edit-item-id').value = item.id;
    document.getElementById('add-title').value = type === 'faq' ? item.question : item.title;
    document.getElementById('add-desc').value = type === 'faq' ? item.answer : item.desc;
    
    if (type === 'faq' && currentUser && currentUser.username === 'admin') {
        if (item.answer === 'Ожидает ответа' || item.answer === 'Ожидает ответа...') {
            document.getElementById('add-desc').value = '';
        }
    }

    document.getElementById('add-tag').value = item.tags;
    document.getElementById('add-submit-btn').textContent = 'Сохранить изменения';
    existingImages = [...(item.images || [])];
    renderExistingImages();
    updateCharCounters();
}


function setupProfile() {
    const tabs = document.querySelectorAll('.profile-tab');
    const contents = document.querySelectorAll('.profile-tab-content');

    tabs.forEach(tab => {
        tab.addEventListener('click', (e) => {
            e.preventDefault();
            tabs.forEach(t => t.classList.remove('active'));
            tab.classList.add('active');
            contents.forEach(c => c.style.display = 'none');
            document.getElementById(`tab-${tab.getAttribute('data-tab')}`).style.display = 'block';
        });
    });

    const fileInput = document.getElementById('avatar-input');
    document.getElementById('upload-avatar-btn').addEventListener('click', () => {
        fileInput.click();
    });

    fileInput.addEventListener('change', async (e) => {
        if(e.target.files.length > 0) {
            const formData = new FormData();
            formData.append('images', e.target.files[0]);
            try {
                const upRes = await fetch(`${API_URL}/upload`, { method: 'POST', body: formData, headers: {'Authorization': `Bearer ${token}`} });
                if (upRes.ok) { 
                    const ud = await upRes.json(); 
                    const newAvatar = ud.urls[0];
                    await fetch(`${API_URL}/profile`, {
                        method: 'POST', headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                        body: JSON.stringify({ avatar_url: `http://localhost:3000${newAvatar}` })
                    });
                    currentUser.avatar_url = `http://localhost:3000${newAvatar}`;
                    localStorage.setItem('user', JSON.stringify(currentUser));
                    updateHeader();
                    loadProfileStats();
                }
            } catch(e){}
        }
    });
}

async function loadProfileStats() {
    if (!currentUser || !token) return;
    try {
        const res = await fetch(`${API_URL}/profile/${currentUser.username}`, {
            headers: {'Authorization': `Bearer ${token}`}
        });
        const data = await res.json();
        
        const avatarUrl = data.user.avatar_url || `https://ui-avatars.com/api/?name=${data.user.username}&background=1756A9&color=fff`;
        document.getElementById('profile-img').src = avatarUrl;
        document.getElementById('profile-name').textContent = data.user.username;
        document.getElementById('profile-points').textContent = data.user.points;
        
        
        const faqC = document.getElementById('my-faqs-container');
        faqC.innerHTML = '';
        if(data.faqs.length === 0) {
            faqC.innerHTML = '<p class="no-results">Вы еще не задавали вопросов.</p>';
        } else {
             data.faqs.forEach(faq => {
                const tagsHtml = faq.tags.split(',').map(t => `<span class="tag">${t.trim()}</span>`).join('');
                faqC.innerHTML += `
                    <div class="faq-item">
                        <div class="faq-question">${faq.question}</div>
                        <div class="faq-answer">${faq.answer}</div>
                        <div class="faq-meta">
                            ${tagsHtml}
                            <span class="author">Статус: ${faq.status === 'approved' ? 'Доступен всем' : 'В обработке'}</span>
                        </div>
                    </div>`;
             });
        }

       
        renderIdeas('my-ideas-container', true);

       
        const ptsC = document.getElementById('my-points-container');
        ptsC.innerHTML = '';
        if(data.history.length === 0) {
            ptsC.innerHTML = '<p class="no-results">Пока нет начислений.</p>';
        } else {
            data.history.forEach(h => {
                ptsC.innerHTML += `
                    <div class="history-item">
                        <div>
                            <div class="history-reason">${h.reason}</div>
                            <div style="font-size:12px; color:gray;">${h.date}</div>
                        </div>
                    <div class="history-amount" style="color: ${h.amount >= 0 ? 'var(--status-done)' : '#DC2626'}">${h.amount > 0 ? '+' : ''}${h.amount}</div>
                    </div>`;
            });
        }

    } catch(e){}
}
