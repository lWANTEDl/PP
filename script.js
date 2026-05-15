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
let existingImagesShop = [];
let shopItems = [];
let currentShopCategory = 'all';
let cart = JSON.parse(localStorage.getItem('cart')) || [];
let currentShopImageIndex = 0;
let currentShopItemImages = [];

document.addEventListener('DOMContentLoaded', async () => {
    updateHeader();
    setupNavigation();
    setupAuth();
    setupModals();
    setupProfile();
    
   
    await fetchVotes();
    await fetchFAQs();
    await fetchIdeas();
    await fetchShopItems();
    updateCartBadge();

  
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
    const navLinks = document.querySelectorAll('.nav-link');

    navLinks.forEach(link => {
        link.addEventListener('click', (e) => {
            e.preventDefault();
            if (link.classList.contains('disabled')) return;
            
            navLinks.forEach(l => l.classList.remove('active'));
            link.classList.add('active');

            const targetId = link.getAttribute('href').substring(1);
            const sections = document.querySelectorAll('.section-container');
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
    return `<div class="attached-files" style="display: flex; gap: 10px; flex-wrap: wrap; margin-top: 10px;">
        ${imagesArr.map(url => {
            const ext = url.split('.').pop().toLowerCase();
            const isImage = ['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg'].includes(ext);
            const fullUrl = url.startsWith('http') ? url : `http://localhost:3000${url}`;
            if (isImage) {
                return `<img src="${fullUrl}" onclick="window.open(this.src, '_blank')" style="max-width: 200px; max-height: 150px; object-fit: cover; border-radius: 8px; cursor: pointer; border: 1px solid var(--border-color, #e2e8f0);">`;
            } else {
                return `<a href="${fullUrl}" target="_blank" class="btn btn-outline" style="display: inline-flex; align-items: center; gap: 5px; padding: 6px 12px; border-radius: 6px; font-size: 13px; text-decoration: none;"><i class="fa-solid fa-file-arrow-down"></i> Файл ${ext.toUpperCase()}</a>`;
            }
        }).join('')}
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
    
    const imagesInput = document.getElementById('add-images');
    if (imagesInput) {
        if (mode === 'faq') imagesInput.setAttribute('accept', 'image/*,.pdf,.doc,.docx,.xls,.xlsx,.txt');
        else imagesInput.setAttribute('accept', 'image/*');
    }

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
        wrapper.style = "position:relative; display:inline-block; margin-right:10px; margin-bottom:10px;";
        const ext = img.split('.').pop().toLowerCase();
        const isImage = ['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg'].includes(ext);
        const fullUrl = img.startsWith('http') ? img : `http://localhost:3000${img}`;
        
        let previewContent = isImage ? `<img src="${fullUrl}" style="max-width: 100px; height: 70px; object-fit: cover; border-radius: 8px;">` : `<div style="width: 100px; height: 70px; display: flex; align-items: center; justify-content: center; background: var(--bg-secondary, #f1f5f9); border-radius: 8px; border: 1px solid var(--border-color, #cbd5e1); font-size: 12px; font-weight: bold; color: var(--text-muted, #64748b);"><i class="fa-solid fa-file" style="margin-right: 5px;"></i> ${ext.toUpperCase()}</div>`;
        
        wrapper.innerHTML = `
            ${previewContent}
            <button type="button" class="image-delete-btn" data-index="${index}" style="position:absolute; top:-5px; right:-5px; background:rgba(255,255,255,0.9); border:none; border-radius:50%; width:20px; height:20px; cursor:pointer; box-shadow:0 1px 3px rgba(0,0,0,0.2); display:flex; align-items:center; justify-content:center; padding:0; z-index: 10;"><i class="fa-solid fa-xmark" style="font-size: 12px;"></i></button>
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
        document.querySelectorAll('.profile-tab, h2, h3').forEach(el => {
            if (el.textContent.includes('История начислений')) {
                el.textContent = el.textContent.replace('История начислений', 'История баллов');
            }
        });
        
        window.userHistoryData = data.history;
        renderHistory('all');

    } catch(e){}
}

function renderHistory(filter) {
    const ptsC = document.getElementById('my-points-container');
    if (!ptsC) return;
    
    let filtered = window.userHistoryData || [];
    if (filter === 'in') filtered = filtered.filter(h => h.amount > 0);
    if (filter === 'out') filtered = filtered.filter(h => h.amount < 0);
    
    ptsC.innerHTML = `
        <div style="margin-bottom:15px; display:flex; gap:10px;">
            <button class="btn ${filter==='all'?'btn-primary':'btn-outline'}" onclick="renderHistory('all')" style="padding:6px 12px; font-size:13px; border-radius:6px;">Все</button>
            <button class="btn ${filter==='in'?'btn-primary':'btn-outline'}" onclick="renderHistory('in')" style="padding:6px 12px; font-size:13px; border-radius:6px;">Начисления</button>
            <button class="btn ${filter==='out'?'btn-primary':'btn-outline'}" onclick="renderHistory('out')" style="padding:6px 12px; font-size:13px; border-radius:6px;">Списания</button>
        </div>
        <div id="history-list"></div>
    `;
    
    const listC = document.getElementById('history-list');
    if(filtered.length === 0) {
        listC.innerHTML = '<p class="no-results">Пока нет записей в этой категории.</p>';
    } else {
        filtered.forEach(h => {
            let displayDate = h.date;
            if (h.date.includes('T')) {
                const d = new Date(h.date);
                displayDate = d.toLocaleDateString('ru-RU') + ' ' + d.toLocaleTimeString('ru-RU', {hour: '2-digit', minute: '2-digit'});
            }
            
            let cancelBtnHtml = '';
            if (h.reason.startsWith('Покупка мерча:')) {
                const diffMins = (new Date() - new Date(h.date)) / (1000 * 60);
                if (diffMins < 5) {
                    cancelBtnHtml = `<div style="margin-top: 8px;"><button class="btn btn-outline text-danger" style="padding: 4px 10px; font-size: 12px; border-radius: 6px;" onclick="cancelOrder(${h.id})"><i class="fa-solid fa-rotate-left"></i> Отменить заказ (возврат)</button></div>`;
                }
            }

            listC.innerHTML += `
                <div class="history-item" style="display:flex; justify-content:space-between; align-items:center; padding:10px; margin-bottom:10px; background:var(--bg-secondary, #f8fafc); border-radius:8px; border:1px solid var(--border-color, #e2e8f0);">
                    <div>
                        <div class="history-reason" style="font-weight:500; font-size:14px; margin-bottom:4px;">${h.reason}</div>
                        <div style="font-size:12px; color:var(--text-muted, #64748b);"><i class="fa-regular fa-clock"></i> ${displayDate}</div>
                        ${cancelBtnHtml}
                    </div>
                    <div class="history-amount" style="font-weight:bold; font-size:16px; color: ${h.amount >= 0 ? 'var(--status-done, #10B981)' : '#DC2626'}">${h.amount > 0 ? '+' : ''}${h.amount}</div>
                </div>`;
        });
    }
}

async function cancelOrder(historyId) {
    if (!confirm('Вы уверены, что хотите отменить этот заказ и вернуть баллы?')) return;
    try {
        const res = await fetch(`${API_URL}/shop/cancel-order/${historyId}`, {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${token}` }
        });
        const data = await res.json();
        
        if (res.ok) {
            currentUser.points = data.remaining_points;
            localStorage.setItem('user', JSON.stringify(currentUser));
            updateHeader();
            showToast('Заказ отменен, баллы возвращены', 'success');
            loadProfileStats();
        } else {
            showToast(data.error || 'Ошибка при отмене', 'error');
        }
    } catch(e) {
        console.error(e);
        showToast('Ошибка сети при отмене', 'error');
    }
}

async function fetchShopItems() {
    try {
        const res = await fetch(`${API_URL}/shop`);
        shopItems = await res.json();
        renderShopLayout();
        renderShop();
    } catch(e) { console.error('Ошибка загрузки магазина', e); }
}

function renderShopLayout() {
    let shopSection = document.getElementById('shop');
    if (!shopSection) {
        const anySection = document.querySelector('.section-container');
        if (anySection && anySection.parentNode) {
            shopSection = document.createElement('div');
            shopSection.id = 'shop';
            shopSection.className = 'section-container';
            shopSection.style.display = 'none';
            anySection.parentNode.appendChild(shopSection);
        } else return;
    }

    if (!document.getElementById('shop-container-inner')) {
        const isAdmin = currentUser && currentUser.username === 'admin';
        const addBtnHtml = isAdmin ? `<button id="admin-add-shop-btn" class="btn btn-primary" style="height:40px; white-space:nowrap; padding: 0 15px; display:inline-flex; align-items:center; gap:8px; box-sizing:border-box;"><i class="fa-solid fa-plus"></i> Добавить товар</button>` : '';
        
        shopSection.innerHTML = `
            <div id="shop-container-inner">
                <div class="section-header" style="display:flex; flex-direction:column; gap:20px; margin-bottom:25px; width:100%; box-sizing:border-box;">
                    <h1 style="margin:0;">Мерч Шоп</h1>
                    <div style="display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:15px; width:100%;">
                        <div id="shop-category-filters" class="filters" style="display:flex; gap:8px; flex-wrap:wrap; margin:0;">
                            <button class="filter-btn active" data-category="all">Все</button>
                            <button class="filter-btn" data-category="Одежда">Одежда</button>
                            <button class="filter-btn" data-category="Аксессуары">Аксессуары</button>
                            <button class="filter-btn" data-category="Сувениры">Сувениры</button>
                            <button class="filter-btn" data-category="Канцелярия">Канцелярия</button>
                        </div>
                        <div style="display:flex; align-items:center; gap:10px; flex-wrap:wrap; flex:1; justify-content:flex-end;">
                            <div class="search-box" style="flex:1; max-width:280px; min-width:180px; display:flex; position:relative;">
                                <input type="text" id="shop-search" placeholder="Поиск товаров..." class="form-control" style="width:100%; box-sizing:border-box; padding-left:35px; padding-right:15px; height:40px; border-radius:8px; border:1px solid var(--border-color, #cbd5e1);">
                                <i class="fa-solid fa-search" style="position:absolute; left:12px; top:50%; transform:translateY(-50%); color:var(--text-muted, #64748b);"></i>
                            </div>
                            <button id="shop-orders-btn" class="btn btn-outline" style="position:relative; height:40px; white-space:nowrap; padding: 0 15px; display:inline-flex; align-items:center; gap:8px; box-sizing:border-box;">
                                <i class="fa-solid fa-clock-rotate-left"></i> Заказы
                            </button>
                            <button id="cart-btn" class="btn btn-outline" style="position:relative; height:40px; white-space:nowrap; padding: 0 15px; display:inline-flex; align-items:center; gap:8px; box-sizing:border-box;">
                                <i class="fa-solid fa-cart-shopping"></i> Корзина
                                <span id="cart-badge" style="position:absolute; top:-5px; right:-5px; background:#ef4444; color:white; border-radius:50%; min-width:18px; height:18px; line-height:18px; text-align:center; font-size:10px; display:none; font-weight:bold;">0</span>
                            </button>
                            ${addBtnHtml}
                        </div>
                    </div>
                </div>
                <div id="shop-items-container" style="display:grid; grid-template-columns:repeat(auto-fill, minmax(260px, 1fr)); gap:20px; width:100%; box-sizing:border-box;">
                </div>
            </div>
            
            <div id="shop-orders-modal" class="modal-overlay hidden" style="position:fixed; top:0; left:0; width:100%; height:100%; background:rgba(0,0,0,0.5); z-index:1100; display:flex; align-items:center; justify-content:center;">
                <div class="modal-content" style="max-width:600px; width:90%; background:var(--bg-primary, #fff); border-radius:12px; display:flex; flex-direction:column; max-height:90vh; padding:20px; position:relative;">
                    <button type="button" class="close-modal-btn" id="close-shop-orders-modal" style="position:absolute; top:15px; right:15px; background:none; border:none; font-size:20px; cursor:pointer;"><i class="fa-solid fa-xmark"></i></button>
                    <h2 style="margin-top:0; margin-bottom: 20px;">Мои заказы</h2>
                    <div id="shop-orders-container" style="flex:1; overflow-y:auto; padding-right: 5px;">
                    </div>
                </div>
            </div>

            <div id="shop-modal" class="modal-overlay hidden" style="position:fixed; top:0; left:0; width:100%; height:100%; background:rgba(0,0,0,0.5); z-index:1000; display:flex; align-items:center; justify-content:center;">
                <div class="modal-content" style="max-width:800px; width:90%; background:var(--bg-primary, #fff); border-radius:12px; display:flex; flex-wrap:wrap; overflow:hidden; position:relative; max-height:90vh; padding:0;">
                    <button type="button" class="close-modal-btn" id="close-shop-modal" style="position:absolute; top:15px; right:15px; background:rgba(255,255,255,0.8); border:none; border-radius:50%; width:36px; height:36px; font-size:20px; cursor:pointer; color:#333; z-index:10; display:flex; align-items:center; justify-content:center; box-shadow:0 2px 4px rgba(0,0,0,0.1);"><i class="fa-solid fa-xmark"></i></button>
                    <div id="shop-modal-images" style="flex:1; min-width:300px; background:var(--bg-secondary, #f8fafc); display:flex; align-items:center; justify-content:center; padding:20px; position:relative;">
                        <button id="shop-carousel-prev" class="btn-icon" style="position:absolute; left:15px; z-index:10; background:var(--bg-primary, #fff); border:1px solid var(--border-color, #cbd5e1); border-radius:50%; width:36px; height:36px; display:none; align-items:center; justify-content:center; cursor:pointer; box-shadow:0 2px 4px rgba(0,0,0,0.1);"><i class="fa-solid fa-chevron-left"></i></button>
                        <img id="shop-modal-main-img" src="" style="max-width:100%; max-height:400px; object-fit:contain; border-radius:8px; transition: opacity 0.2s;">
                        <button id="shop-carousel-next" class="btn-icon" style="position:absolute; right:15px; z-index:10; background:var(--bg-primary, #fff); border:1px solid var(--border-color, #cbd5e1); border-radius:50%; width:36px; height:36px; display:none; align-items:center; justify-content:center; cursor:pointer; box-shadow:0 2px 4px rgba(0,0,0,0.1);"><i class="fa-solid fa-chevron-right"></i></button>
                        <div id="shop-carousel-dots" style="position:absolute; bottom:15px; display:flex; gap:8px;"></div>
                    </div>
                    <div style="flex:1; min-width:300px; padding:30px; display:flex; flex-direction:column; overflow-y:auto;">
                        <div id="shop-modal-category" style="font-size:12px; color:var(--text-muted, #64748b); text-transform:uppercase; font-weight:bold; margin-bottom:5px;"></div>
                        <h2 id="shop-modal-title" style="margin-top:0; margin-bottom:15px; font-size:24px; color:var(--text-main, #000);"></h2>
                        <div id="shop-modal-price" style="font-size:24px; font-weight:bold; color:#F59E0B; margin-bottom:20px;"></div>
                        <p id="shop-modal-desc" style="color:var(--text-muted, #475569); flex:1; line-height:1.6;"></p>
                        <button id="shop-modal-buy-btn" class="btn btn-primary" style="width:100%; font-size:16px; padding:12px; margin-top:20px;">Купить</button>
                    </div>
                </div>
            </div>

            <div id="cart-modal" class="modal-overlay hidden" style="position:fixed; top:0; left:0; width:100%; height:100%; background:rgba(0,0,0,0.5); z-index:1100; display:flex; align-items:center; justify-content:center;">
                <div class="modal-content" style="max-width:500px; width:90%; background:var(--bg-primary, #fff); border-radius:12px; display:flex; flex-direction:column; max-height:90vh; padding:20px; position:relative;">
                    <button type="button" class="close-modal-btn" id="close-cart-modal" style="position:absolute; top:15px; right:15px; background:none; border:none; font-size:20px; cursor:pointer;"><i class="fa-solid fa-xmark"></i></button>
                    <h2 style="margin-top:0; margin-bottom: 20px;">Корзина</h2>
                    <div id="cart-items-container" style="flex:1; overflow-y:auto; margin-bottom:20px;">
                    </div>
                    <div style="border-top:1px solid var(--border-color, #e2e8f0); padding-top:15px; display:flex; justify-content:space-between; align-items:center;">
                        <strong style="font-size: 18px;">Итого: <span id="cart-total-price" style="color:#F59E0B;">0</span> баллов</strong>
                        <button id="checkout-btn" class="btn btn-primary">Оформить заказ</button>
                    </div>
                </div>
            </div>

            <div id="shop-admin-modal" class="modal-overlay hidden" style="position:fixed; top:0; left:0; width:100%; height:100%; background:rgba(0,0,0,0.5); z-index:1200; display:flex; align-items:center; justify-content:center;">
                <div class="modal-content" style="max-width:500px; width:90%; background:var(--bg-primary, #fff); border-radius:12px; padding:20px; position:relative;">
                    <button type="button" class="close-modal-btn" id="close-shop-admin-modal" style="position:absolute; top:15px; right:15px; background:none; border:none; font-size:20px; cursor:pointer;"><i class="fa-solid fa-xmark"></i></button>
                    <h2 id="shop-admin-title" style="margin-top:0; margin-bottom:20px;">Добавить товар</h2>
                    <form id="shop-admin-form">
                        <input type="hidden" id="shop-admin-id">
                        <div class="form-group" style="margin-bottom:15px;">
                            <label style="display:block; font-weight:bold; margin-bottom:5px;">Название</label>
                            <input type="text" id="shop-admin-name" class="form-control" required style="width:100%; padding:8px; border-radius:6px; border:1px solid var(--border-color, #cbd5e1);">
                        </div>
                        <div class="form-group" style="margin-bottom:15px;">
                            <label style="display:block; font-weight:bold; margin-bottom:5px;">Описание</label>
                            <textarea id="shop-admin-desc" class="form-control" required rows="3" style="width:100%; padding:8px; border-radius:6px; border:1px solid var(--border-color, #cbd5e1); resize:vertical;"></textarea>
                        </div>
                        <div class="form-group" style="margin-bottom:15px;">
                            <label style="display:block; font-weight:bold; margin-bottom:5px;">Категория</label>
                            <input type="text" id="shop-admin-category" class="form-control" required style="width:100%; padding:8px; border-radius:6px; border:1px solid var(--border-color, #cbd5e1);">
                        </div>
                        <div class="form-group" style="margin-bottom:15px; display:flex; gap:10px;">
                            <div style="flex:1;">
                                <label style="display:block; font-weight:bold; margin-bottom:5px;">Цена (баллы)</label>
                                <input type="number" id="shop-admin-price" class="form-control" required style="width:100%; padding:8px; border-radius:6px; border:1px solid var(--border-color, #cbd5e1);">
                            </div>
                            <div style="flex:2;">
                                <label style="display:block; font-weight:bold; margin-bottom:5px;">Фотографии</label>
                                <input type="file" id="shop-admin-images" class="form-control" multiple accept="image/*" style="width:100%; padding:5px; border-radius:6px; border:1px solid var(--border-color, #cbd5e1);">
                                <div id="existing-images-preview-shop" class="image-preview-container" style="display:flex; gap:10px; flex-wrap:wrap; margin-top:10px;"></div>
                            </div>
                        </div>
                        <button type="submit" class="btn btn-primary" style="width:100%; padding:10px; font-size:16px;">Сохранить</button>
                    </form>
                </div>
            </div>
        `;

        if (!document.getElementById('shop-styles')) {
            const style = document.createElement('style');
            style.id = 'shop-styles';
            style.innerHTML = `
                .shop-card { border: 1px solid var(--border-color, #e2e8f0); border-radius: 12px; overflow: hidden; background: var(--bg-primary, #fff); cursor: pointer; transition: transform 0.2s, box-shadow 0.2s; display:flex; flex-direction:column; height: 100%; box-sizing:border-box; }
                .shop-card:hover { transform: translateY(-5px); box-shadow: 0 10px 15px -3px rgba(0,0,0,0.1); }
                .shop-card-img { width: 100%; height: 200px; object-fit: cover; border-bottom: 1px solid var(--border-color, #e2e8f0); display: block; }
                .shop-card-content { padding: 15px; display:flex; flex-direction:column; flex:1; box-sizing:border-box; }
                .shop-card-category { font-size: 12px; color: var(--text-muted, #64748b); text-transform: uppercase; font-weight: bold; margin-bottom: 5px; }
                .shop-card-title { margin: 0 0 10px 0; font-size: 16px; font-weight: bold; color: var(--text-main, #0f172a); line-height: 1.3; }
                .shop-card-price { margin-top: auto; font-size: 16px; font-weight: bold; color: #F59E0B; display:flex; align-items:center; gap:5px; }
                .btn.disabled { opacity: 0.5; cursor: not-allowed; pointer-events: none; }
            `;
            document.head.appendChild(style);
        }
        
        setupShopSearch();

        const shopNavLink = document.querySelector('a[href="#shop"]');
        if (shopNavLink) {
            shopNavLink.classList.remove('disabled');
            shopNavLink.removeAttribute('onclick');
            shopNavLink.onclick = null;
            shopNavLink.style.cursor = 'pointer';
            shopNavLink.style.pointerEvents = 'auto';
            shopNavLink.style.opacity = '1';
            shopNavLink.removeAttribute('title');
            
            if (shopNavLink.parentElement) {
                shopNavLink.parentElement.classList.remove('disabled');
                shopNavLink.parentElement.style.pointerEvents = 'auto';
            }
        }
        
        document.getElementById('close-shop-modal').addEventListener('click', () => {
            document.getElementById('shop-modal').classList.add('hidden');
        });
        document.getElementById('shop-modal').addEventListener('click', (e) => {
            if (e.target === document.getElementById('shop-modal')) {
                document.getElementById('shop-modal').classList.add('hidden');
            }
        });

        document.getElementById('shop-orders-btn').addEventListener('click', openShopOrders);
        document.getElementById('close-shop-orders-modal').addEventListener('click', () => document.getElementById('shop-orders-modal').classList.add('hidden'));
        document.getElementById('shop-orders-modal').addEventListener('click', (e) => {
            if (e.target === document.getElementById('shop-orders-modal')) document.getElementById('shop-orders-modal').classList.add('hidden');
        });

        document.getElementById('cart-btn').addEventListener('click', openCart);
        document.getElementById('close-cart-modal').addEventListener('click', () => document.getElementById('cart-modal').classList.add('hidden'));
        document.getElementById('cart-modal').addEventListener('click', (e) => {
            if (e.target === document.getElementById('cart-modal')) document.getElementById('cart-modal').classList.add('hidden');
        });
        document.getElementById('checkout-btn').addEventListener('click', checkoutCart);
        
        document.getElementById('shop-carousel-prev').addEventListener('click', () => {
            if (currentShopImageIndex > 0) {
                currentShopImageIndex--;
                updateShopCarousel();
            }
        });
        document.getElementById('shop-carousel-next').addEventListener('click', () => {
            if (currentShopImageIndex < currentShopItemImages.length - 1) {
                currentShopImageIndex++;
                updateShopCarousel();
            }
        });
        
        if (isAdmin) {
            document.getElementById('admin-add-shop-btn').addEventListener('click', () => openShopAdminModal());
            document.getElementById('close-shop-admin-modal').addEventListener('click', () => document.getElementById('shop-admin-modal').classList.add('hidden'));
            document.getElementById('shop-admin-modal').addEventListener('click', (e) => {
                if (e.target === document.getElementById('shop-admin-modal')) document.getElementById('shop-admin-modal').classList.add('hidden');
            });
            
            document.getElementById('shop-admin-form').addEventListener('submit', async (e) => {
                e.preventDefault();
                const id = document.getElementById('shop-admin-id').value;
                
                let imagesJSON = [];
                const files = document.getElementById('shop-admin-images').files;
                if(files.length > 0) {
                    const formData = new FormData();
                    for(let i=0; i<files.length; i++) formData.append('images', files[i]);
                    try {
                        const upRes = await fetch(`${API_URL}/upload`, { method: 'POST', body: formData, headers: {'Authorization': `Bearer ${token}`} });
                        if (upRes.ok) { const ud = await upRes.json(); imagesJSON = ud.urls; }
                    } catch(err) {}
                }
                
                const body = {
                    name: document.getElementById('shop-admin-name').value,
                    description: document.getElementById('shop-admin-desc').value,
                    category: document.getElementById('shop-admin-category').value,
                    price: parseInt(document.getElementById('shop-admin-price').value) || 0,
                    images: [...existingImagesShop, ...imagesJSON]
                };
                
                const method = id ? 'PUT' : 'POST';
                const url = id ? `${API_URL}/shop/${id}` : `${API_URL}/shop`;
                
                try {
                    const res = await fetch(url, {
                        method, headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` }, body: JSON.stringify(body)
                    });
                    if (res.ok) {
                        document.getElementById('shop-admin-modal').classList.add('hidden');
                        showToast(id ? 'Товар обновлен' : 'Товар добавлен', 'success');
                        fetchShopItems();
                    } else {
                        const data = await res.json(); showToast(data.error || 'Ошибка', 'error');
                    }
                } catch(err) { showToast('Ошибка сети', 'error'); }
            });
        }
    }
}

function setupShopSearch() {
        const input = document.getElementById('shop-search');
        if (input) input.addEventListener('input', () => renderShop());
        
        document.querySelectorAll('#shop-category-filters .filter-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.preventDefault();
                document.querySelectorAll('#shop-category-filters .filter-btn').forEach(b => b.classList.remove('active'));
                e.target.classList.add('active');
                currentShopCategory = e.target.getAttribute('data-category');
                renderShop();
            });
        });
    }

    function renderShop() {
        const container = document.getElementById('shop-items-container');
        if (!container) return;
        container.innerHTML = '';
        
        const searchInput = document.getElementById('shop-search');
        const searchQuery = searchInput ? searchInput.value.toLowerCase() : '';
        
        let filtered = shopItems;
        if (currentShopCategory !== 'all') {
            filtered = filtered.filter(i => i.category === currentShopCategory);
        }
        if (searchQuery) {
            filtered = filtered.filter(i => i.name.toLowerCase().includes(searchQuery) || i.description.toLowerCase().includes(searchQuery));
        }
        
        if (filtered.length === 0) {
            container.innerHTML = '<p class="no-results" style="grid-column: 1 / -1; text-align: center; color: var(--text-muted);">Товары не найдены.</p>';
            return;
        }
        
        filtered.forEach(item => {
            const isAdmin = currentUser && currentUser.username === 'admin';
            const adminActions = isAdmin ? `
                <div style="display:flex; justify-content:flex-end; gap:5px; margin-top:10px; position:relative; z-index:2;">
                    <button type="button" class="btn-icon" onclick="event.stopPropagation(); openShopAdminModal(${item.id})" style="background:var(--bg-secondary, #f1f5f9); border:none; padding:5px; border-radius:4px; cursor:pointer;" title="Редактировать"><i class="fa-solid fa-pen"></i></button>
                    <button type="button" class="btn-icon text-danger" onclick="event.stopPropagation(); deleteShopItem(${item.id})" style="background:#fee2e2; border:none; padding:5px; border-radius:4px; cursor:pointer;" title="Удалить"><i class="fa-solid fa-trash"></i></button>
                </div>
            ` : '';
            
            const firstImg = item.images && item.images.length > 0 ? (item.images[0].startsWith('http') ? item.images[0] : 'http://localhost:3000' + item.images[0]) : 'https://via.placeholder.com/300x200?text=No+Image';
            
            container.innerHTML += `
                <div class="shop-card" onclick="openShopModal(${item.id})">
                    <img src="${firstImg}" alt="${item.name}" class="shop-card-img">
                <div class="shop-card-content">
                    <div class="shop-card-category">${item.category}</div>
                    <h3 class="shop-card-title">${item.name}</h3>
                    <div class="shop-card-price"><i class="fa-solid fa-coins"></i> ${item.price}</div>
                    ${adminActions}
                </div>
            </div>
        `;
    });
}

function openShopModal(itemId) {
    const item = shopItems.find(i => i.id === itemId);
    if (!item) return;
    
    const modal = document.getElementById('shop-modal');
    if (!modal) return;
    
    currentShopItemImages = (item.images && item.images.length > 0) ? item.images : ['https://via.placeholder.com/300x200?text=No+Image'];
    currentShopImageIndex = 0;
    updateShopCarousel();
    
    document.getElementById('shop-modal-category').textContent = item.category;
    document.getElementById('shop-modal-title').textContent = item.name;
    document.getElementById('shop-modal-desc').textContent = item.description;
    document.getElementById('shop-modal-price').innerHTML = `<i class="fa-solid fa-coins"></i> ${item.price} баллов`;
    
    const buyBtn = document.getElementById('shop-modal-buy-btn');
    
    buyBtn.disabled = false;
    buyBtn.textContent = 'В корзину';
    buyBtn.classList.remove('disabled');
    buyBtn.onclick = () => addToCart(item.id);
    
    modal.classList.remove('hidden');
}

function updateShopCarousel() {
    const imgEl = document.getElementById('shop-modal-main-img');
    const prevBtn = document.getElementById('shop-carousel-prev');
    const nextBtn = document.getElementById('shop-carousel-next');
    const dotsContainer = document.getElementById('shop-carousel-dots');

    const rawSrc = currentShopItemImages[currentShopImageIndex];
    imgEl.src = rawSrc.startsWith('http') ? rawSrc : `http://localhost:3000${rawSrc}`;

    if (currentShopItemImages.length > 1) {
        prevBtn.style.display = currentShopImageIndex > 0 ? 'flex' : 'none';
        nextBtn.style.display = currentShopImageIndex < currentShopItemImages.length - 1 ? 'flex' : 'none';
        
        dotsContainer.innerHTML = '';
        currentShopItemImages.forEach((_, i) => {
            const dot = document.createElement('div');
            dot.style.width = '8px';
            dot.style.height = '8px';
            dot.style.borderRadius = '50%';
            dot.style.background = i === currentShopImageIndex ? 'var(--text-main, #333)' : 'var(--border-color, #cbd5e1)';
            dot.style.cursor = 'pointer';
            dot.onclick = () => { currentShopImageIndex = i; updateShopCarousel(); };
            dotsContainer.appendChild(dot);
        });
    } else {
        prevBtn.style.display = 'none';
        nextBtn.style.display = 'none';
        dotsContainer.innerHTML = '';
    }
}

function addToCart(itemId) {
    const item = shopItems.find(i => i.id === itemId);
    if (!item) return;
    const existing = cart.find(c => c.id === itemId);
    if (existing) existing.quantity++;
    else cart.push({ id: itemId, quantity: 1, item });
    
    updateCartBadge();
    localStorage.setItem('cart', JSON.stringify(cart));
    showToast('Товар добавлен в корзину');
    document.getElementById('shop-modal').classList.add('hidden');
}

function updateCartBadge() {
    const badge = document.getElementById('cart-badge');
    if (!badge) return;
    const total = cart.reduce((sum, i) => sum + i.quantity, 0);
    if (total > 0) {
        badge.style.display = 'block';
        badge.textContent = total;
    } else {
        badge.style.display = 'none';
    }
}

function renderExistingImagesShop() {
    const container = document.getElementById('existing-images-preview-shop');
    if(!container) return;
    container.innerHTML = '';
    existingImagesShop.forEach((img, index) => {
        const wrapper = document.createElement('div');
        wrapper.className = 'image-preview-wrapper';
        const imgSrc = img.startsWith('http') ? img : `http://localhost:3000${img}`;
        wrapper.innerHTML = `
            <img src="${imgSrc}" style="max-width: 100px; height: 70px; object-fit: cover; border-radius: 8px;">
            <button type="button" class="image-delete-btn" data-index="${index}"><i class="fa-solid fa-xmark"></i></button>
        `;
        container.appendChild(wrapper);
    });
    container.querySelectorAll('.image-delete-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            existingImagesShop.splice(parseInt(e.currentTarget.getAttribute('data-index')), 1);
            renderExistingImagesShop();
        });
    });
}

function openShopAdminModal(itemId = null) {
    const modal = document.getElementById('shop-admin-modal');
    const title = document.getElementById('shop-admin-title');
    const form = document.getElementById('shop-admin-form');
    
    if (itemId) {
        const item = shopItems.find(i => i.id === itemId);
        if(!item) return;
        title.textContent = 'Редактировать товар';
        document.getElementById('shop-admin-id').value = item.id;
        document.getElementById('shop-admin-name').value = item.name;
        document.getElementById('shop-admin-desc').value = item.description;
        document.getElementById('shop-admin-category').value = item.category;
        document.getElementById('shop-admin-price').value = item.price;
        existingImagesShop = [...(item.images || [])];
    } else {
        title.textContent = 'Добавить товар';
        form.reset();
        document.getElementById('shop-admin-id').value = '';
        existingImagesShop = [];
    }
    document.getElementById('shop-admin-images').value = '';
    renderExistingImagesShop();
    modal.classList.remove('hidden');
}

async function deleteShopItem(id) {
    if (!confirm('Вы уверены, что хотите удалить этот товар?')) return;
    try {
        const res = await fetch(`${API_URL}/shop/${id}`, { method: 'DELETE', headers: { 'Authorization': `Bearer ${token}` } });
        if (res.ok) {
            showToast('Товар удален', 'success');
            fetchShopItems();
        } else {
            const data = await res.json(); showToast(data.error || 'Ошибка при удалении', 'error');
        }
    } catch(err) { showToast('Ошибка сети', 'error'); }
}

function openCart() {
    const container = document.getElementById('cart-items-container');
    const totalEl = document.getElementById('cart-total-price');
    const checkoutBtn = document.getElementById('checkout-btn');
    
    container.innerHTML = '';
    if (cart.length === 0) {
        container.innerHTML = '<p style="text-align:center; color:var(--text-muted);">Ваша корзина пуста</p>';
        totalEl.textContent = '0';
        checkoutBtn.disabled = true;
        checkoutBtn.classList.add('disabled');
    } else {
        let total = 0;
        cart.forEach((c, index) => {
            total += c.item.price * c.quantity;
            const firstImg = c.item.images && c.item.images.length > 0 ? (c.item.images[0].startsWith('http') ? c.item.images[0] : 'http://localhost:3000' + c.item.images[0]) : 'https://via.placeholder.com/300x200?text=No+Image';
            container.innerHTML += `
                <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:15px; padding-bottom:15px; border-bottom:1px solid var(--border-color, #e2e8f0);">
                    <div style="display:flex; align-items:center; gap:10px;">
                        <img src="${firstImg}" style="width:50px; height:50px; object-fit:cover; border-radius:6px;">
                        <div>
                            <div style="font-weight:bold; font-size:14px;">${c.item.name}</div>
                            <div style="font-size:12px; color:var(--text-muted, #64748b);">${c.item.price} баллов x ${c.quantity}</div>
                        </div>
                    </div>
                    <div style="display:flex; align-items:center; gap:12px;">
                        <button onclick="changeCartItemQty(${index}, -1)" style="border:none; background:var(--bg-secondary, #f1f5f9); width:28px; height:28px; border-radius:6px; cursor:pointer; display:flex; align-items:center; justify-content:center;"><i class="fa-solid fa-minus"></i></button>
                        <span style="font-weight:bold; width:20px; text-align:center;">${c.quantity}</span>
                        <button onclick="changeCartItemQty(${index}, 1)" style="border:none; background:var(--bg-secondary, #f1f5f9); width:28px; height:28px; border-radius:6px; cursor:pointer; display:flex; align-items:center; justify-content:center;"><i class="fa-solid fa-plus"></i></button>
                    </div>
                </div>
            `;
        });
        totalEl.textContent = total;
        checkoutBtn.disabled = false;
        checkoutBtn.classList.remove('disabled');
    }
    document.getElementById('cart-modal').classList.remove('hidden');
}

function changeCartItemQty(index, delta) {
    cart[index].quantity += delta;
    if (cart[index].quantity <= 0) cart.splice(index, 1);
    updateCartBadge();
    localStorage.setItem('cart', JSON.stringify(cart));
    openCart();
}

async function checkoutCart() {
    if (!token) {
        document.getElementById('cart-modal').classList.add('hidden');
        return showAuthModal('login', 'Чтобы оформить заказ, необходимо войти');
    }
    if (cart.length === 0) return;
    if (!confirm('Вы уверены, что хотите оформить заказ?')) return;
    
    try {
        const res = await fetch(`${API_URL}/shop/checkout`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
            body: JSON.stringify({ cart: cart.map(c => ({ id: c.id, quantity: c.quantity })) })
        });
        
        const data = await res.json();
        
        if (res.ok) {
            currentUser.points = data.remaining_points;
            localStorage.setItem('user', JSON.stringify(currentUser));
            updateHeader();
            cart = [];
            localStorage.removeItem('cart');
            updateCartBadge();
            document.getElementById('cart-modal').classList.add('hidden');
            showToast('Покупка успешна!', 'success');
            loadProfileStats();
        } else {
            showToast(data.error || 'Ошибка при покупке', 'error');
        }
    } catch(e) {
        console.error(e);
        showToast('Ошибка сети при покупке', 'error');
    }
}

async function openShopOrders() {
    if (!token) return showAuthModal('login', 'Чтобы посмотреть заказы, необходимо войти');
    
    try {
        const res = await fetch(`${API_URL}/shop/orders`, { headers: { 'Authorization': `Bearer ${token}` } });
        const orders = await res.json();
        
        const container = document.getElementById('shop-orders-container');
        container.innerHTML = '';
        
        const modalTitle = document.querySelector('#shop-orders-modal h2');
        if (modalTitle) modalTitle.textContent = currentUser && currentUser.username === 'admin' ? 'Все заказы' : 'Мои заказы';
        
        if (orders.length === 0) {
            container.innerHTML = '<p style="text-align:center; color:var(--text-muted);">Вы еще ничего не заказывали.</p>';
        } else {
            orders.forEach(o => {
                let displayDate = o.date;
                if (o.date.includes('T')) {
                    const d = new Date(o.date);
                    displayDate = d.toLocaleDateString('ru-RU') + ' ' + d.toLocaleTimeString('ru-RU', {hour: '2-digit', minute: '2-digit'});
                }
                
                let cancelBtnHtml = '';
                if (o.reason.startsWith('Покупка мерча:')) {
                    const diffMins = (new Date() - new Date(o.date)) / (1000 * 60);
                    if (diffMins < 5) {
                        cancelBtnHtml = `<div style="margin-top: 10px;"><button class="btn btn-outline text-danger" style="padding: 4px 10px; font-size: 12px; border-radius: 6px;" onclick="cancelOrder(${o.id})"><i class="fa-solid fa-rotate-left"></i> Отменить заказ (возврат)</button></div>`;
                    }
                }
                
                const isCanceled = o.reason.startsWith('Отменен заказ:');
                const reasonText = o.reason.replace('Покупка мерча:', 'Заказ:').replace('Отменен заказ:', 'Отменен:');
                const buyerInfo = o.buyer_name ? `<div style="font-size:12px; color:var(--text-muted, #64748b); margin-bottom: 4px;"><i class="fa-solid fa-user"></i> Покупатель: <strong>${o.buyer_name}</strong></div>` : '';
                
                container.innerHTML += `
                    <div style="padding:15px; margin-bottom:15px; border-radius:8px; border:1px solid var(--border-color, #e2e8f0); background: ${isCanceled ? '#fef2f2' : 'var(--bg-secondary, #f8fafc)'};">
                        <div style="display:flex; justify-content:space-between; align-items:flex-start;">
                            <div>
                                ${buyerInfo}
                                <div style="font-weight:500; font-size:14px; margin-bottom:5px; color: ${isCanceled ? '#DC2626' : 'inherit'};">${reasonText}</div>
                            </div>
                            <div style="font-weight:bold; color: ${isCanceled ? '#DC2626' : '#F59E0B'};">${Math.abs(o.amount)} баллов</div>
                        </div>
                        <div style="font-size:12px; color:var(--text-muted, #64748b);"><i class="fa-regular fa-clock"></i> ${displayDate}</div>
                        ${cancelBtnHtml}
                    </div>
                `;
            });
        }
        
        document.getElementById('shop-orders-modal').classList.remove('hidden');
    } catch(e) {
        showToast('Ошибка загрузки заказов', 'error');
    }
}
