const PAGE_SIZE = 5;

function escapeHtml(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function timeAgo(timestamp) {
  const seconds = Math.floor(Date.now() / 1000) - timestamp;
  if (seconds < 60) return 'just now';
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
  return `${Math.floor(seconds / 86400)}d ago`;
}

function renderReview(review) {
  const cls = review.needsResponse ? 'review unanswered' : 'review';
  const icon = review.needsResponse ? '⚠' : '✓';
  const thumb = review.thumbsUp ? '👍' : '👎';
  const responseHtml = review.needsResponse
    ? '<p class="no-response">No developer response</p>'
    : `<p class="dev-response">Dev: &ldquo;${escapeHtml(review.developerResponse)}&rdquo;</p>`;

  return `
    <div class="${cls}">
      <div class="review-header">
        <span class="review-icon">${icon}</span>
        <span class="review-text">${escapeHtml(review.text)}</span>
        <span class="review-meta">${thumb}&nbsp;${timeAgo(review.createdAt)}</span>
      </div>
      ${responseHtml}
    </div>
  `;
}

function createCard(game) {
  const card = document.createElement('div');
  card.className = 'card';
  card.dataset.appId = game.appId;
  card.innerHTML = `
    <div class="card-header">
      <h2>${escapeHtml(game.name)}</h2>
      <span class="badge hidden" data-badge></span>
    </div>
    <div class="reviews-list" data-reviews></div>
    <div class="card-footer">
      <button class="btn-show-more hidden" data-show-more>Show more</button>
      <button class="btn-refresh" data-refresh>&#8635; Refresh</button>
    </div>
  `;
  return card;
}

async function fillCard(card) {
  const appId = card.dataset.appId;
  const reviewsList = card.querySelector('[data-reviews]');
  const badge = card.querySelector('[data-badge]');
  const showMoreBtn = card.querySelector('[data-show-more]');

  // Reset state
  reviewsList.innerHTML = '<div class="spinner"></div>';
  badge.classList.add('hidden');
  showMoreBtn.classList.add('hidden');
  delete card._reviews;
  delete card._shown;

  try {
    const res = await fetch(`/api/reviews?appId=${encodeURIComponent(appId)}`);
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || `HTTP ${res.status}`);
    }
    const data = await res.json();

    card._reviews = [...data.reviews].sort((a, b) => b.needsResponse - a.needsResponse);
    card._shown = Math.min(PAGE_SIZE, card._reviews.length);

    if (data.unansweredCount > 0) {
      badge.textContent = `${data.unansweredCount} need response`;
      badge.classList.remove('hidden');
    }

    reviewsList.innerHTML = data.reviews
      .slice(0, card._shown)
      .map(renderReview)
      .join('');

    if (data.reviews.length > PAGE_SIZE) {
      showMoreBtn.classList.remove('hidden');
    }
  } catch (err) {
    reviewsList.innerHTML = `<p class="error">Could not load reviews: ${escapeHtml(err.message)}</p>`;
  }
}

function showMore(card) {
  const reviewsList = card.querySelector('[data-reviews]');
  const showMoreBtn = card.querySelector('[data-show-more]');
  card._shown = Math.min(card._shown + PAGE_SIZE, card._reviews.length);
  reviewsList.innerHTML = card._reviews
    .slice(0, card._shown)
    .map(renderReview)
    .join('');
  if (card._shown >= card._reviews.length) {
    showMoreBtn.classList.add('hidden');
  }
}

async function init() {
  const container = document.getElementById('games-container');
  const refreshAllBtn = document.getElementById('refresh-all');

  let games;
  try {
    const res = await fetch('/api/games');
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    games = await res.json();
  } catch (err) {
    container.innerHTML = `<p class="error">Could not load game list: ${escapeHtml(err.message)}</p>`;
    return;
  }

  const cards = games.map(game => {
    const card = createCard(game);
    container.appendChild(card);

    card.querySelector('[data-refresh]').addEventListener('click', () => fillCard(card));
    card.querySelector('[data-show-more]').addEventListener('click', () => showMore(card));

    return card;
  });

  refreshAllBtn.addEventListener('click', () => cards.forEach(fillCard));

  // Initial load
  cards.forEach(fillCard);
}

init();
