let currentDate = new Date();
let selectedDateKey = '';

let isCopyMode = false;
let isSelectingEvent = false;
let copiedEventsList = [];
let targetDateKeys = new Set();

let events = {};

function initData() {
  const urlParams = new URLSearchParams(window.location.search);
  const sharedData = urlParams.get('data');

  if (sharedData) {
    try {
      const jsonString = decodeURIComponent(atob(sharedData));
      events = JSON.parse(jsonString);
      localStorage.setItem('calendar_events', JSON.stringify(events));
    } catch (e) {
      console.error('共有データの復元に失敗しました', e);
      events = JSON.parse(localStorage.getItem('calendar_events')) || {};
    }
  } else {
    events = JSON.parse(localStorage.getItem('calendar_events')) || {};
  }
}
initData();

const monthTitle = document.getElementById('current-month-title');
const daysContainer = document.getElementById('calendar-days');
const prevBtn = document.getElementById('prev-btn');
const nextBtn = document.getElementById('next-btn');

const btnPrevMonth = document.getElementById('btn-prev-month');
const btnThisMonth = document.getElementById('btn-this-month');
const btnNextMonth = document.getElementById('btn-next-month');

const shareCalendarBtn = document.getElementById('share-calendar-btn');
const startCopyModeBtn = document.getElementById('start-copy-mode-btn');
const normalActionBtns = document.getElementById('normal-action-btns');
const copyActionBtns = document.getElementById('copy-action-btns');
const addMoreEventBtn = document.getElementById('add-more-event-btn');
const applyCopyBtn = document.getElementById('apply-copy-btn');
const cancelCopyBtn = document.getElementById('cancel-copy-btn');

const copyBanner = document.getElementById('copy-banner');
const eventSummaryList = document.getElementById('event-summary-list');

const eventModal = document.getElementById('event-modal');
const closeModalBtn = document.getElementById('close-modal-btn');
const modalDateTitle = document.getElementById('modal-date-title');
const eventList = document.getElementById('event-list');
const eventForm = document.getElementById('event-form');
const eventStartTimeInput = document.getElementById('event-start-time');
const eventEndTimeInput = document.getElementById('event-end-time');
const eventTextInput = document.getElementById('event-text');

function renderCalendar() {
  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();

  monthTitle.textContent = `${year}年 ${month + 1}月`;
  daysContainer.innerHTML = '';

  const firstDayOfWeek = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  // 月初の空白マス
  for (let i = 0; i < firstDayOfWeek; i++) {
    const emptyCell = document.createElement('div');
    emptyCell.className = 'day-cell empty';
    daysContainer.appendChild(emptyCell);
  }

  const today = new Date();

  // 日付マスのレンダリング
  for (let day = 1; day <= daysInMonth; day++) {
    const dayCell = document.createElement('div');
    dayCell.className = 'day-cell';

    const dayNumber = document.createElement('span');
    dayNumber.className = 'day-number';
    dayNumber.textContent = day;
    dayCell.appendChild(dayNumber);

    if (
      day === today.getDate() &&
      month === today.getMonth() &&
      year === today.getFullYear()
    ) {
      dayCell.classList.add('today');
    }

    const formattedMonth = String(month + 1).padStart(2, '0');
    const formattedDay = String(day).padStart(2, '0');
    const dateKey = `${year}-${formattedMonth}-${formattedDay}`;

    if (targetDateKeys.has(dateKey)) {
      dayCell.classList.add('selected-target');
    }

    if (events[dateKey] && events[dateKey].length > 0) {
      events[dateKey].forEach((evt) => {
        const badge = document.createElement('div');
        badge.className = 'event-badge';
        const timeRange = formatTimeRange(evt.startTime, evt.endTime);
        badge.textContent = `${timeRange}${evt.text}`;
        dayCell.appendChild(badge);
      });
    }

    dayCell.addEventListener('click', () => handleDayClick(dateKey, year, month + 1, day));
    daysContainer.appendChild(dayCell);
  }
}

function formatTimeRange(start, end) {
  if (start && end) return `${start}〜${end} `;
  if (start) return `${start}〜 `;
  if (end) return `〜${end} `;
  return '';
}

function handleDayClick(dateKey, year, month, day) {
  if (isCopyMode) {
    if (isSelectingEvent) {
      openModal(dateKey, year, month, day);
    } else {
      if (targetDateKeys.has(dateKey)) {
        targetDateKeys.delete(dateKey);
      } else {
        targetDateKeys.add(dateKey);
      }
      updateCopyUI();
      renderCalendar();
    }
  } else {
    openModal(dateKey, year, month, day);
  }
}

function openModal(dateKey, year, month, day) {
  selectedDateKey = dateKey;
  modalDateTitle.textContent = `${year}年${month}月${day}日の予定`;
  renderEventList();
  eventModal.classList.remove('hidden');
}

function closeModal() {
  eventModal.classList.add('hidden');
  eventForm.reset();
}

function renderEventList() {
  eventList.innerHTML = '';
  const dayEvents = events[selectedDateKey] || [];

  if (dayEvents.length === 0) {
    eventList.innerHTML = '<p style="font-size:13px; color:#94a3b8; text-align:center;">予定はありません</p>';
    return;
  }

  dayEvents.forEach((evt, index) => {
    const item = document.createElement('div');
    item.className = 'event-item';
    const timeLabel = formatTimeRange(evt.startTime, evt.endTime);
    const timeDisplay = timeLabel ? `<strong>${timeLabel}</strong>` : '<span style="color:#64748b; font-size:12px;">[終日]</span>';
    
    const actionBtnHTML = isCopyMode && isSelectingEvent
      ? `<button class="select-copy-btn" data-index="${index}">この予定をコピー</button>`
      : `<button class="delete-event-btn" data-index="${index}">×</button>`;

    item.innerHTML = `
      <span>${timeDisplay} ${evt.text}</span>
      <div>${actionBtnHTML}</div>
    `;
    eventList.appendChild(item);
  });

  if (isCopyMode && isSelectingEvent) {
    document.querySelectorAll('.select-copy-btn').forEach((btn) => {
      btn.addEventListener('click', (e) => {
        const idx = e.target.getAttribute('data-index');
        addEventToCopyList(idx);
      });
    });
  } else {
    document.querySelectorAll('.delete-event-btn').forEach((btn) => {
      btn.addEventListener('click', (e) => {
        const idx = e.target.getAttribute('data-index');
        deleteEvent(idx);
      });
    });
  }
}

function addEventToCopyList(index) {
  const dayEvents = events[selectedDateKey] || [];
  if (dayEvents[index]) {
    copiedEventsList.push({ ...dayEvents[index] });
    isSelectingEvent = false;
    closeModal();
    updateCopyUI();
    renderCalendar();
  }
}

startCopyModeBtn.addEventListener('click', () => {
  isCopyMode = true;
  isSelectingEvent = true;
  copiedEventsList = [];
  targetDateKeys.clear();
  
  normalActionBtns.classList.add('hidden');
  copyActionBtns.classList.remove('hidden');
  copyBanner.classList.remove('hidden');

  updateCopyUI();
  renderCalendar();
});

addMoreEventBtn.addEventListener('click', () => {
  isSelectingEvent = true;
  updateCopyUI();
});

function updateCopyUI() {
  if (isSelectingEvent) {
    addMoreEventBtn.textContent = '＋ 予定を選択中...';
    addMoreEventBtn.style.backgroundColor = '#e0e7ff';
    addMoreEventBtn.style.color = '#4f46e5';
  } else {
    addMoreEventBtn.textContent = '＋ 別の予定も追加';
    addMoreEventBtn.style.backgroundColor = '#f1f5f9';
    addMoreEventBtn.style.color = 'var(--text-main)';
  }

  if (copiedEventsList.length === 0) {
    eventSummaryList.textContent = '（カレンダーの日付を押して予定を選択してください）';
  } else {
    const summaryTexts = copiedEventsList.map(
      evt => `[${formatTimeRange(evt.startTime, evt.endTime)}${evt.text}]`
    );
    eventSummaryList.textContent = summaryTexts.join(' , ');
  }

  applyCopyBtn.textContent = `完了 (${targetDateKeys.size}日を選択中)`;
}

cancelCopyBtn.addEventListener('click', exitCopyMode);

function exitCopyMode() {
  isCopyMode = false;
  isSelectingEvent = false;
  copiedEventsList = [];
  targetDateKeys.clear();

  normalActionBtns.classList.remove('hidden');
  copyActionBtns.classList.add('hidden');
  copyBanner.classList.add('hidden');

  renderCalendar();
}

applyCopyBtn.addEventListener('click', () => {
  if (copiedEventsList.length === 0 || targetDateKeys.size === 0) return;

  targetDateKeys.forEach((dateKey) => {
    if (!events[dateKey]) events[dateKey] = [];
    
    copiedEventsList.forEach((evt) => {
      events[dateKey].push({ ...evt });
    });

    events[dateKey].sort((a, b) => {
      if (!a.startTime) return -1;
      if (!b.startTime) return 1;
      return a.startTime.localeCompare(b.startTime);
    });
  });

  localStorage.setItem('calendar_events', JSON.stringify(events));
  exitCopyMode();
});

shareCalendarBtn.addEventListener('click', () => {
  if (Object.keys(events).length === 0) return;

  try {
    const jsonString = JSON.stringify(events);
    const encodedData = btoa(encodeURIComponent(jsonString));
    const shareUrl = `${window.location.origin}${window.location.pathname}?data=${encodedData}`;

    navigator.clipboard.writeText(shareUrl);
  } catch (e) {
    console.error('共有URL作成エラー', e);
  }
});

eventForm.addEventListener('submit', (e) => {
  e.preventDefault();
  const startTime = eventStartTimeInput.value;
  const endTime = eventEndTimeInput.value;
  const text = eventTextInput.value.trim();

  if (!text) return;

  if (!events[selectedDateKey]) {
    events[selectedDateKey] = [];
  }

  events[selectedDateKey].push({ startTime, endTime, text });

  events[selectedDateKey].sort((a, b) => {
    if (!a.startTime) return -1;
    if (!b.startTime) return 1;
    return a.startTime.localeCompare(b.startTime);
  });

  localStorage.setItem('calendar_events', JSON.stringify(events));

  eventForm.reset();
  renderEventList();
  renderCalendar();
});

function deleteEvent(index) {
  events[selectedDateKey].splice(index, 1);
  if (events[selectedDateKey].length === 0) {
    delete events[selectedDateKey];
  }
  localStorage.setItem('calendar_events', JSON.stringify(events));
  renderEventList();
  renderCalendar();
}

function changeMonth(offset) {
  currentDate.setMonth(currentDate.getMonth() + offset);
  renderCalendar();
}

function resetToThisMonth() {
  currentDate = new Date();
  renderCalendar();
}

prevBtn.addEventListener('click', () => changeMonth(-1));
nextBtn.addEventListener('click', () => changeMonth(1));
btnPrevMonth.addEventListener('click', () => changeMonth(-1));
btnThisMonth.addEventListener('click', resetToThisMonth);
btnNextMonth.addEventListener('click', () => changeMonth(1));
closeModalBtn.addEventListener('click', closeModal);

renderCalendar();