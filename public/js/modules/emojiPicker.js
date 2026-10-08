// ==========================================================================
// FAKEDC - SELETOR DE EMOJIS & REAÇÕES (POPOVER DISCORD)
// ==========================================================================

import { EMOJI_CATEGORIES } from './emojiData.js';
import { escapeHtml } from './utils.js';

let activeSocket = null;
let getCurrentTextChannelFn = () => 'geral';
let targetReactionMessageId = null;

export function insertEmojiAtCursor(emoji, inputEl = document.getElementById('chat-input')) {
  if (!inputEl) return;
  const start = inputEl.selectionStart || inputEl.value.length;
  const end = inputEl.selectionEnd || inputEl.value.length;
  const val = inputEl.value;
  inputEl.value = val.substring(0, start) + emoji + val.substring(end);
  const newPos = start + emoji.length;
  inputEl.setSelectionRange(newPos, newPos);
  inputEl.focus();
}

export function renderEmojiPicker(filterQuery = '') {
  const emojiPickerBody = document.getElementById('emoji-picker-body');
  if (!emojiPickerBody) return;
  emojiPickerBody.innerHTML = '';
  const cleanFilter = (filterQuery || '').trim().toLowerCase();

  let totalRendered = 0;

  EMOJI_CATEGORIES.forEach(cat => {
    const matchingEmojis = cat.emojis.filter(item => {
      if (!cleanFilter) return true;
      return item.keywords.includes(cleanFilter) || item.char.includes(cleanFilter);
    });

    if (matchingEmojis.length === 0) return;

    totalRendered += matchingEmojis.length;
    const section = document.createElement('div');
    section.className = 'emoji-category-section';
    section.id = `emoji-section-${cat.id}`;

    const title = document.createElement('div');
    title.className = 'emoji-category-title';
    title.textContent = cat.name;
    section.appendChild(title);

    const grid = document.createElement('div');
    grid.className = 'emoji-grid';

    matchingEmojis.forEach(item => {
      const btn = document.createElement('span');
      btn.className = 'emoji-item';
      btn.textContent = item.char;
      btn.title = item.keywords.split(' ')[0] || item.char;
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        if (targetReactionMessageId && activeSocket) {
          activeSocket.emit('chat:react', {
            messageId: targetReactionMessageId,
            channelId: getCurrentTextChannelFn(),
            emoji: item.char
          });
          targetReactionMessageId = null;
          closeEmojiPicker();
        } else {
          insertEmojiAtCursor(item.char);
        }
      });
      grid.appendChild(btn);
    });

    section.appendChild(grid);
    emojiPickerBody.appendChild(section);
  });

  if (totalRendered === 0) {
    emojiPickerBody.innerHTML = `
      <div class="emoji-no-results">
        Nenhum emoji encontrado para "<strong>${escapeHtml(cleanFilter)}</strong>" 🙁
      </div>
    `;
  }
}

export function openEmojiPicker(reactionMessageId = null) {
  const emojiPickerPopover = document.getElementById('emoji-picker-popover');
  const emojiSearchInput = document.getElementById('emoji-search-input');
  if (!emojiPickerPopover) return;

  targetReactionMessageId = reactionMessageId;
  renderEmojiPicker(emojiSearchInput ? emojiSearchInput.value : '');
  emojiPickerPopover.style.display = 'flex';
  if (emojiSearchInput) {
    emojiSearchInput.focus();
  }
}

export function closeEmojiPicker() {
  const emojiPickerPopover = document.getElementById('emoji-picker-popover');
  const emojiSearchInput = document.getElementById('emoji-search-input');
  if (!emojiPickerPopover) return;

  emojiPickerPopover.style.display = 'none';
  targetReactionMessageId = null;
  if (emojiSearchInput) emojiSearchInput.value = '';
}

export function toggleEmojiPicker() {
  const emojiPickerPopover = document.getElementById('emoji-picker-popover');
  if (!emojiPickerPopover) return;
  if (emojiPickerPopover.style.display === 'flex') {
    closeEmojiPicker();
  } else {
    openEmojiPicker();
  }
}

export function initEmojiPicker({ socket, getCurrentTextChannel }) {
  activeSocket = socket;
  if (typeof getCurrentTextChannel === 'function') {
    getCurrentTextChannelFn = getCurrentTextChannel;
  }

  const btnEmojiTrigger = document.getElementById('btn-emoji-trigger');
  const emojiSearchInput = document.getElementById('emoji-search-input');
  const emojiPickerPopover = document.getElementById('emoji-picker-popover');
  const emojiPickerBody = document.getElementById('emoji-picker-body');
  const emojiNavBtns = document.querySelectorAll('.emoji-nav-btn');

  if (btnEmojiTrigger) {
    btnEmojiTrigger.addEventListener('click', (e) => {
      e.stopPropagation();
      toggleEmojiPicker();
    });
  }

  if (emojiSearchInput) {
    emojiSearchInput.addEventListener('input', (e) => {
      renderEmojiPicker(e.target.value);
    });
  }

  emojiNavBtns.forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      emojiNavBtns.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      const catId = btn.getAttribute('data-category');
      if (emojiSearchInput && emojiSearchInput.value) {
        emojiSearchInput.value = '';
        renderEmojiPicker('');
      }
      const targetSection = document.getElementById(`emoji-section-${catId}`);
      if (targetSection && emojiPickerBody) {
        targetSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    });
  });

  // Fechar emoji picker ao clicar fora
  document.addEventListener('click', (e) => {
    if (emojiPickerPopover && emojiPickerPopover.style.display === 'flex') {
      if (!emojiPickerPopover.contains(e.target) && e.target !== btnEmojiTrigger) {
        closeEmojiPicker();
      }
    }
  });

  // Fechar com ESC
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && emojiPickerPopover && emojiPickerPopover.style.display === 'flex') {
      closeEmojiPicker();
    }
  });
}
