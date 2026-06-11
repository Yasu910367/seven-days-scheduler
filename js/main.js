// ==================== インポート ====================
import {
    auth,
    provider,
    db,
    signInWithPopup,
    signOut,
    onAuthStateChanged
} from './firebase.js';

import {
    collection,
    addDoc,
    getDocs,
    deleteDoc,
    doc,
    updateDoc,
    query,
    orderBy
} from "https://www.gstatic.com/firebasejs/12.14.0/firebase-firestore.js";

import { formatDate, getWeekStart, formatTime } from './utils.js';
import { applyDailyTheme } from './theme.js';

// ==================== 状態管理・定数 ====================
const SCHEDULE_KEY = 'mySchedules';
const TASK_KEY = 'myTasks';
const TIMER_RECORDS_KEY = 'myTimerRecords';
const TIMER_CATEGORIES_KEY = 'myTimerCategories';

let currentView = 'month';
let displayDate = new Date(); 
let timerInterval = null;
let startTime = 0;
let running = false;

// ==================== 初期設定 ====================
document.addEventListener('DOMContentLoaded', () => {
    applyDailyTheme(); // 最初にテーマを適用
    document.getElementById('schedule-date').value = new Date().toISOString().substring(0, 10);
    
    loadAndDisplaySchedules();
    loadAndDisplayTasks();
    loadTimerCategories();
    loadAndDisplayTimerRecords();
    
    openTab('schedule');
    changeView('month');
    navigateToToday();
});

// ==================== ユーティリティ/タブ切り替え ====================
function openTab(tabId) {
    document.querySelectorAll('.content-section').forEach(section => {
        section.classList.remove('active');
    });
    document.querySelectorAll('.tab-button').forEach(button => {
        button.classList.remove('active');
    });

    document.getElementById(tabId).classList.add('active');
    document.querySelector(`.tab-button[onclick="openTab('${tabId}')"]`).classList.add('active');
    
    if (tabId === 'time-management') {
        loadTimerCategories();
        loadAndDisplayTimerRecords();
    }
}

// ==================== スケジュール管理（Firestore対応） ====================
async function getSchedules() {
    if (!auth.currentUser) {
        return [];
    }

    const schedulesRef = collection(db, "users", auth.currentUser.uid, "schedules");
    const q = query(schedulesRef, orderBy("date", "asc"));
    const snapshot = await getDocs(q);

    return snapshot.docs.map(docSnap => ({
        id: docSnap.id,
        ...docSnap.data()
    }));
}

async function addSchedule() { 
    if (!auth.currentUser) {
        alert("予定を保存するにはGoogleログインしてください。");
        return;
    }

    const date = document.getElementById('schedule-date').value;
    const time = document.getElementById('schedule-time').value;
    const event = document.getElementById('schedule-event').value.trim();

    if (!date || !event) {
        alert('日付と予定内容は必須です。');
        return;
    }

    await addDoc(collection(db, "users", auth.currentUser.uid, "schedules"), {
        date,
        time,
        event,
        createdAt: Date.now()
    });

    document.getElementById('schedule-time').value = '';
    document.getElementById('schedule-event').value = '';

    await loadAndDisplaySchedules(); 
}

async function deleteSchedule(id) { 
    if (!auth.currentUser) {
        alert("ログインしてください。");
        return;
    }

    await deleteDoc(doc(db, "users", auth.currentUser.uid, "schedules", id));
    await loadAndDisplaySchedules();
}

async function getSortedSchedules() {
    const schedules = await getSchedules();
    return schedules.sort((a, b) => {
        const dateTimeA = `${a.date} ${a.time || '23:59'}`;
        const dateTimeB = `${b.date} ${b.time || '23:59'}`;
        return dateTimeA.localeCompare(dateTimeB);
    });
}

async function loadAndDisplaySchedules() { 
    const sortedSchedules = await getSortedSchedules();
    const allScheduleList = document.getElementById('all-schedule-list');
    allScheduleList.innerHTML = '';

    if (!auth.currentUser) {
        allScheduleList.innerHTML = '<li>Googleログインするとクラウド上の予定を表示できます。</li>';
    } else if (sortedSchedules.length === 0) {
        allScheduleList.innerHTML = '<li>登録済みの予定はありません。</li>';
    } else {
        sortedSchedules.forEach(schedule => {
            allScheduleList.appendChild(createScheduleListItem(schedule));
        });
    }

    await renderCalendarView(currentView, displayDate); 
}

function createScheduleListItem(schedule) {
    const li = document.createElement('li');
    li.className = 'list-item';
    const timeDisplay = schedule.time ? ` (${schedule.time})` : '';
    li.innerHTML = `
        <div class="item-details">
            <strong>${schedule.date}</strong>${timeDisplay}: ${schedule.event}
        </div>
        <button class="delete-btn" onclick="deleteSchedule('${schedule.id}')">完了</button>
    `;
    return li;
}

function changeView(view) {
    currentView = view;

    document.querySelectorAll('.view-controls button').forEach(btn => {
        if (btn.id.includes(view)) {
            btn.classList.add('active');
        } else if (btn.id.endsWith('-btn')) {
            btn.classList.remove('active');
        }
    });

    document.querySelectorAll('#calendar-container > div').forEach(container => {
        container.style.display = 'none';
    });

    document.getElementById(`${view}-view`).style.display = 'block';
    renderCalendarView(currentView, displayDate);
}

function navigateToToday() {
    displayDate = new Date();
    renderCalendarView(currentView, displayDate);
}

function navigateCalendar(step) {
    if (currentView === 'month') {
        displayDate.setMonth(displayDate.getMonth() + step);
    } else if (currentView === 'week') {
        displayDate.setDate(displayDate.getDate() + (step * 7));
    } else if (currentView === 'day') {
        displayDate.setDate(displayDate.getDate() + step);
    }

    renderCalendarView(currentView, displayDate);
}

async function renderCalendarView(view, date) {
    const schedules = await getSchedules();

    const schedulesByDate = schedules.reduce((acc, sched) => {
        acc[sched.date] = acc[sched.date] || [];
        acc[sched.date].push(sched);
        return acc;
    }, {});

    if (view === 'month') {
        renderMonthView(date, schedulesByDate);
    } else if (view === 'week') {
        renderWeekView(date, schedulesByDate);
    } else if (view === 'day') {
        renderDayView(date, schedulesByDate);
    }
}


function renderMonthView(date, schedulesByDate) {
    const container = document.getElementById('month-view');
    container.innerHTML = ''; 
    const month = date.getMonth();
    const year = date.getFullYear();
    document.getElementById('current-date-display').textContent = `${year}年 ${month + 1}月 (月間ビュー)`;
    const firstDayOfMonth = new Date(year, month, 1);
    const startDay = getWeekStart(firstDayOfMonth);
    const daysOfWeek = ['月', '火', '水', '木', '金', '土', '日'];
    let html = '<div class="calendar-grid">';
    daysOfWeek.forEach(day => { html += `<div class="day-header">${day}</div>`; });
    let currentDate = new Date(startDay);
    for (let i = 0; i < 42; i++) {
        const dateStr = formatDate(currentDate);
        const isCurrentMonth = currentDate.getMonth() === month;
        const isToday = dateStr === formatDate(new Date());
        let cellClass = 'day-cell';
        if (isCurrentMonth) cellClass += ' current-month';
        html += `<div class="${cellClass}">`;
        html += `<strong style="color: ${isToday ? 'var(--contrast-color)' : isCurrentMonth ? 'var(--main-color)' : '#aaa'};">${currentDate.getDate()}</strong>`;
        if (schedulesByDate[dateStr]) {
            schedulesByDate[dateStr].forEach(sched => {
                html += `<div class="day-event" title="${sched.time ? sched.time + ' ' : ''}${sched.event}">${sched.time ? sched.time + ' ' : ''}${sched.event}</div>`;
            });
        }
        html += '</div>';
        currentDate.setDate(currentDate.getDate() + 1);
    }
    html += '</div>';
    container.innerHTML = html;
}

function renderWeekView(date, schedulesByDate) {
    const container = document.getElementById('week-view');
    container.innerHTML = '';
    const weekStart = getWeekStart(date);
    const weekEnd = new Date(weekStart);
    weekEnd.setDate(weekEnd.getDate() + 6);
    const startStr = weekStart.toLocaleDateString('ja-JP', { month: '2-digit', day: '2-digit' });
    const endStr = weekEnd.toLocaleDateString('ja-JP', { month: '2-digit', day: '2-digit' });
    document.getElementById('current-date-display').textContent = `${weekStart.getFullYear()}年 ${startStr} - ${endStr} (週間ビュー)`;
    let html = '<div class="calendar-grid">';
    const daysOfWeek = ['月', '火', '水', '木', '金', '土', '日'];
    let currentDate = new Date(weekStart);
    daysOfWeek.forEach(day => {
        html += `<div class="day-header">${day} (${currentDate.getMonth()+1}/${currentDate.getDate()})</div>`;
        currentDate.setDate(currentDate.getDate() + 1);
    });
    currentDate = new Date(weekStart);
    for (let i = 0; i < 7; i++) {
        const dateStr = formatDate(currentDate);
        let cellClass = 'day-cell';
        if (dateStr === formatDate(new Date())) cellClass += ' current-month';
        html += `<div class="${cellClass}" style="min-height: 250px;">`;
        if (schedulesByDate[dateStr]) {
            schedulesByDate[dateStr].sort((a, b) => (a.time || '23:59').localeCompare(b.time || '23:59')).forEach(sched => {
                html += `<div class="day-event" title="${sched.event}">
                            ${sched.time || '[終日]'} ${sched.event}
                        </div>`;
            });
        }
        html += '</div>';
        currentDate.setDate(currentDate.getDate() + 1);
    }
    html += '</div>';
    container.innerHTML = html;
}

function renderDayView(date, schedulesByDate) {
    const container = document.getElementById('day-view');
    container.innerHTML = '';
    const dateStr = formatDate(date);
    document.getElementById('current-date-display').textContent = `${dateStr} (日ビュー)`;
    let html = `<div style="border: 1px solid #ccc; padding: 15px; border-radius: 8px;"><h3>${dateStr}の予定</h3>`;
    if (schedulesByDate[dateStr]) {
        schedulesByDate[dateStr].sort((a, b) => (a.time || '23:59').localeCompare(b.time || '23:59')).forEach(sched => {
            html += `<div class="list-item" style="border-left: 6px solid var(--main-color);">
                        <div class="item-details">
                            <strong>${sched.time || '[終日]'}</strong>: ${sched.event}
                        </div>
                        <button class="delete-btn" onclick="deleteSchedule(${sched.id})">消去</button>
                    </div>`;
        });
    } else {
        html += '<p>この日の予定はありません。</p>';
    }
    html += '</div>';
    container.innerHTML = html;
}

// ==================== タスク管理（Firestore対応） ====================
async function getTasks() {
    if (!auth.currentUser) {
        return [];
    }

    const tasksRef = collection(db, "users", auth.currentUser.uid, "tasks");
    const q = query(tasksRef, orderBy("priority", "asc"));
    const snapshot = await getDocs(q);

    return snapshot.docs.map(docSnap => ({
        id: docSnap.id,
        ...docSnap.data()
    }));
}

async function addTask() { 
    if (!auth.currentUser) {
        alert("タスクを保存するにはGoogleログインしてください。");
        return;
    }

    const description = document.getElementById('task-description').value.trim();
    let priority = parseInt(document.getElementById('task-priority').value);

    if (!description) {
        alert('タスク内容は必須です。');
        return;
    }

    if (isNaN(priority) || priority < 1) {
        const tasks = await getTasks();
        const maxPriority = tasks.length > 0 ? Math.max(...tasks.map(t => t.priority)) : 0;
        priority = maxPriority + 1;
    }

    await addDoc(collection(db, "users", auth.currentUser.uid, "tasks"), {
        description,
        priority,
        createdAt: Date.now()
    });

    document.getElementById('task-description').value = '';
    document.getElementById('task-priority').value = '';

    await loadAndDisplayTasks();
}

async function deleteTask(id) { 
    if (!auth.currentUser) {
        alert("ログインしてください。");
        return;
    }

    await deleteDoc(doc(db, "users", auth.currentUser.uid, "tasks", id));
    await loadAndDisplayTasks();
}

async function updateTaskPriority(id, newPriority) { 
    if (!auth.currentUser) {
        alert("ログインしてください。");
        return;
    }

    if (!newPriority || newPriority < 1) {
        alert('有効な優先度（1以上の数値）を入力してください。');
        return;
    }

    await updateDoc(doc(db, "users", auth.currentUser.uid, "tasks", id), {
        priority: newPriority
    });

    await loadAndDisplayTasks();
}

async function loadAndDisplayTasks() { 
    const tasks = await getTasks();
    const taskList = document.getElementById('task-list');
    taskList.innerHTML = '';

    if (!auth.currentUser) {
        taskList.innerHTML = '<li>Googleログインするとクラウド上のタスクを表示できます。</li>';
        return;
    }

    if (tasks.length === 0) {
        taskList.innerHTML = '<li>タスクは登録されていません。</li>';
        return;
    }

    tasks.forEach(task => {
        const li = document.createElement('li');
        li.className = 'list-item task-list'; 
        li.innerHTML = `
            <div class="item-details">
                <span class="priority-label">優先度: ${task.priority}</span>
                ${task.description}
            </div>
            
            <div>
                <input type="number" id="priority-input-${task.id}" value="${task.priority}" min="1" style="width: 80px;">
                <button onclick="updateTaskPriority('${task.id}', parseInt(document.getElementById('priority-input-${task.id}').value))" 
                        style="background-color: var(--task-color);">変更</button>
                
                <button class="delete-btn" onclick="deleteTask('${task.id}')">削除</button>
            </div>
        `;
        taskList.appendChild(li);
    });
}
// ==================== 時間管理 ====================
async function getTimerRecords() {
    if (!auth.currentUser) {
        return [];
    }

    const recordsRef = collection(db, "users", auth.currentUser.uid, "timerRecords");
    const q = query(recordsRef, orderBy("createdAt", "desc"));
    const snapshot = await getDocs(q);

    return snapshot.docs.map(docSnap => ({
        id: docSnap.id,
        ...docSnap.data()
    }));
}

async function getTimerCategories() {
    if (!auth.currentUser) {
        return [];
    }

    const categoriesRef = collection(db, "users", auth.currentUser.uid, "timerCategories");
    const q = query(categoriesRef, orderBy("name", "asc"));
    const snapshot = await getDocs(q);

    return snapshot.docs.map(docSnap => ({
        id: docSnap.id,
        ...docSnap.data()
    }));
}

async function addTimerCategory() {
    console.log("addTimerCategory start");
    console.log(auth.currentUser);

    if (!auth.currentUser) {
        alert("計測種類を保存するにはGoogleログインしてください。");
        return;
    }

    const newCategory = document.getElementById('timer-category-input').value.trim();

    if (!newCategory) {
        alert('種類を入力してください。');
        return;
    }

    const categories = await getTimerCategories();

    if (categories.some(category => category.name === newCategory)) {
        alert('その種類はすでに登録されています。');
        return;
    }

    await addDoc(collection(db, "users", auth.currentUser.uid, "timerCategories"), {
        name: newCategory,
        createdAt: Date.now()
    });

    document.getElementById('timer-category-input').value = '';

    await loadTimerCategories(); 
}

async function loadTimerCategories() {
    const categories = await getTimerCategories();

    const select = document.getElementById('timer-category-select');
    select.innerHTML = '<option value="">種類を選択</option>'; 

    categories.forEach(category => {
        const option = document.createElement('option');
        option.value = category.name;
        option.textContent = category.name;
        select.appendChild(option);
    });

    const categoryList = document.getElementById('timer-category-list');
    categoryList.innerHTML = '';

    if (!auth.currentUser) {
        categoryList.innerHTML = '<li>Googleログインするとクラウド上の計測種類を表示できます。</li>';
        return;
    }

    if (categories.length === 0) {
        categoryList.innerHTML = '<li>登録済みの計測種類はありません。</li>';
        return;
    }

    categories.forEach(category => {
        const li = document.createElement('li');
        li.className = 'list-item';
        li.style.borderLeft = '6px solid var(--time-color)';
        li.innerHTML = `
            <div class="item-details">
                <strong>${category.name}</strong>
            </div>
            <button class="delete-btn" onclick="deleteTimerCategory('${category.id}')">削除</button>
        `;
        categoryList.appendChild(li);
    });
}

async function deleteTimerCategory(categoryId) {
    if (!auth.currentUser) {
        alert("ログインしてください。");
        return;
    }

    if (!confirm("この計測種類を削除しますか？\n（この種類に紐づく計測記録はそのまま残ります）")) {
        return;
    }

    await deleteDoc(doc(db, "users", auth.currentUser.uid, "timerCategories", categoryId));
    await loadTimerCategories(); 
}

function startTimer() { 
    const category = document.getElementById('timer-category-select').value;
    if (!category) { alert('計測する種類を選択してください。'); return; }
    if (running) return;
    startTime = Date.now();
    running = true;
    document.getElementById('timer-start-btn').disabled = true;
    document.getElementById('timer-stop-btn').disabled = false;
    document.getElementById('timer-category-select').disabled = true;
    timerInterval = setInterval(updateTimerDisplay, 1000);
}

function updateTimerDisplay() {
    const elapsedTime = Math.floor((Date.now() - startTime) / 1000);
    document.getElementById('timer-display').textContent = formatTime(elapsedTime);
}

async function stopTimer() { 
    if (!running) return;

    clearInterval(timerInterval);
    running = false;

    const elapsedTimeSeconds = Math.floor((Date.now() - startTime) / 1000);
    const category = document.getElementById('timer-category-select').value;

    if (elapsedTimeSeconds > 0) {
        await addDoc(collection(db, "users", auth.currentUser.uid, "timerRecords"), {
            date: formatDate(new Date()),
            category,
            durationSeconds: elapsedTimeSeconds,
            createdAt: Date.now()
        });
    }

    document.getElementById('timer-display').textContent = '00:00:00';
    document.getElementById('timer-start-btn').disabled = false;
    document.getElementById('timer-stop-btn').disabled = true;
    document.getElementById('timer-category-select').disabled = false;
    document.getElementById('timer-category-select').value = ''; 

    await loadAndDisplayTimerRecords();
}

async function loadAndDisplayTimerRecords() {
    const records = await getTimerRecords();
    const recordList = document.getElementById('timer-record-list');
    recordList.innerHTML = '';
    if (records.length === 0) { recordList.innerHTML = '<li>計測記録はありません。</li>'; return; }
    const recordsByCategory = records.reduce((acc, record) => {
        acc[record.category] = acc[record.category] || [];
        acc[record.category].push(record);
        return acc;
    }, {});
    const totalSeconds = records.reduce((sum, record) => sum + record.durationSeconds, 0);
    const totalTimeDisplay = formatTime(totalSeconds);
    const overallTotal = document.createElement('h4');
    overallTotal.innerHTML = `**全体の合計勉強時間:** <strong style="color: var(--main-color);">${totalTimeDisplay}</strong>`;
    recordList.appendChild(overallTotal);
    Object.keys(recordsByCategory).sort().forEach(category => {
        const categoryRecords = recordsByCategory[category];
        const categoryTotalSeconds = categoryRecords.reduce((sum, record) => sum + record.durationSeconds, 0);
        const categoryTotalTimeDisplay = formatTime(categoryTotalSeconds);
        const categoryHeader = document.createElement('div');
        categoryHeader.className = 'category-header';
        categoryHeader.innerHTML = `
            <strong style="font-size: 1.1em; color: var(--main-color);">🕰️ ${category}</strong>
            <span>合計: ${categoryTotalTimeDisplay}</span>
        `;
        recordList.appendChild(categoryHeader);
        categoryRecords.sort((a, b) => b.id - a.id).forEach(record => {
            const li = createTimerRecordListItem(record);
            li.classList.add('nested'); 
            recordList.appendChild(li);
        });
    });
}

function createTimerRecordListItem(record) {
    const li = document.createElement('li');
    li.className = 'list-item record-item';
    const timeDisplay = formatTime(record.durationSeconds);
    li.innerHTML = `
        <div class="item-details">
            <span style="font-size: 0.9em; color: #666;">${record.date}</span>: 
            <strong>${timeDisplay}</strong>
        </div>
        <button class="delete-btn" onclick="deleteSingleTimerRecord(${record.id})" style="padding: 5px 10px;">記録削除</button>
    `;
    return li;
}

async function deleteSingleTimerRecord(id) {
    if (!auth.currentUser) {
        alert("ログインしてください。");
        return;
    }

    if (!confirm("この計測記録を削除しますか？")) return;

    await deleteDoc(doc(db, "users", auth.currentUser.uid, "timerRecords", id));
    await loadAndDisplayTimerRecords();
}

// ==================== 🛠️ HTMLとの架け橋（超重要） ====================
// type="module" にすると関数のスコープが閉じてしまうため、
// HTMLの onclick="関数名()" から呼び出される関数を、手動でwindow（グローバル）に登録します。

window.openTab = openTab;
window.addSchedule = addSchedule;
window.deleteSchedule = deleteSchedule;
window.navigateCalendar = navigateCalendar;
window.navigateToToday = navigateToToday;
window.changeView = changeView;
window.addTask = addTask;
window.deleteTask = deleteTask;
window.updateTaskPriority = updateTaskPriority;
window.addTimerCategory = addTimerCategory;
window.deleteTimerCategory = deleteTimerCategory;
window.startTimer = startTimer;
window.stopTimer = stopTimer;
window.deleteSingleTimerRecord = deleteSingleTimerRecord;

const loginBtn = document.getElementById("login-btn");
const logoutBtn = document.getElementById("logout-btn");
const userInfo = document.getElementById("user-info");

if (loginBtn) {
  loginBtn.addEventListener("click", async () => {
    try {
      const result = await signInWithPopup(auth, provider);

      userInfo.textContent =
        `ログイン中: ${result.user.displayName}`;

      loginBtn.style.display = "none";
      logoutBtn.style.display = "inline-block";

      await loadAndDisplayTasks();

    } catch (error) {
      console.error(error);
    }
  });
}

if (logoutBtn) {
  logoutBtn.addEventListener("click", async () => {
    await signOut(auth);

    userInfo.textContent = "";
    loginBtn.style.display = "inline-block";
    logoutBtn.style.display = "none";

    await loadAndDisplayTasks();
  });
}

onAuthStateChanged(auth, async (user) => {
    if (user) {
      userInfo.textContent = `ログイン中: ${user.displayName}`;
      loginBtn.style.display = "none";
      logoutBtn.style.display = "inline-block";
  
      await loadAndDisplayTasks();
      await loadAndDisplaySchedules();
      await loadTimerCategories();

    } else {
      userInfo.textContent = "";
      loginBtn.style.display = "inline-block";
      logoutBtn.style.display = "none";
  
      await loadAndDisplayTasks();
      await loadAndDisplaySchedules();
      await loadTimerCategories();
    }
  });