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

function renderReview(review, appId) {
  const cls = review.needsResponse ? 'review unanswered' : 'review';
  const icon = review.needsResponse ? '⚠' : '✓';
  const sentimentCls = review.thumbsUp ? 'sentiment pos' : 'sentiment neg';
  const sentimentLabel = review.thumbsUp ? 'Recommended' : 'Not recommended';
  const sentimentIcon = review.thumbsUp
    ? '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M2 20h4V9H2v11zm20-10c0-1.1-.9-2-2-2h-6.31l.95-4.57.03-.32c0-.41-.17-.79-.44-1.06L13.17 1 6.59 7.59C6.22 7.95 6 8.45 6 9v9c0 1.1.9 2 2 2h9c.83 0 1.54-.5 1.84-1.22l3.02-7.05c.09-.23.14-.47.14-.73v-1z"/></svg>'
    : '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M22 4h-4v11h4V4zM2 14c0 1.1.9 2 2 2h6.31l-.95 4.57-.03.32c0 .41.17.79.44 1.06L10.83 23l6.58-6.59c.37-.36.59-.86.59-1.41V6c0-1.1-.9-2-2-2H7c-.83 0-1.54.5-1.84 1.22l-3.02 7.05c-.09.23-.14.47-.14.73v1z"/></svg>';
  const reviewUrl = `https://steamcommunity.com/profiles/${encodeURIComponent(review.author)}/recommended/${encodeURIComponent(appId)}`;
  const responseHtml = review.needsResponse
    ? '<p class="no-response">No developer response</p>'
    : `<p class="dev-response">Dev: &ldquo;${escapeHtml(review.developerResponse)}&rdquo;</p>`;

  return `
    <div class="${cls}">
      <div class="review-header">
        <span class="review-icon">${icon}</span>
        <span class="review-text"><a href="${escapeHtml(reviewUrl)}" target="_blank" rel="noreferrer">${escapeHtml(review.text)}</a></span>
        <span class="review-meta"><span class="${sentimentCls}" role="img" aria-label="${sentimentLabel}" title="${sentimentLabel}">${sentimentIcon}</span>${timeAgo(review.createdAt)}</span>
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
      <div class="card-header-right">
        <span class="review-count hidden" data-review-count></span>
        <span class="badge hidden" data-badge></span>
      </div>
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
  const reviewCount = card.querySelector('[data-review-count]');
  const showMoreBtn = card.querySelector('[data-show-more]');

  // Reset state
  reviewsList.innerHTML = '<div class="spinner"></div>';
  badge.classList.add('hidden');
  reviewCount.classList.add('hidden');
  showMoreBtn.classList.add('hidden');
  delete card._reviews;
  delete card._shown;

  try {
    const params = new URLSearchParams({
      appId,
      _: Date.now().toString(),
    });
    const res = await fetch(`api.php?action=reviews&${params}`, { cache: 'no-store' });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || `HTTP ${res.status}`);
    }
    const data = await res.json();

    card._reviews = [...data.reviews].sort((a, b) => b.needsResponse - a.needsResponse);
    card._shown = Math.min(PAGE_SIZE, card._reviews.length);

    const totalReviews = Number.isFinite(Number(data.totalReviews))
      ? Number(data.totalReviews)
      : data.totalFetched;
    reviewCount.textContent = `${new Intl.NumberFormat().format(totalReviews)} reviews`;
    reviewCount.classList.remove('hidden');

    if (data.unansweredCount > 0) {
      badge.textContent = `${data.unansweredCount} need response`;
      badge.classList.remove('hidden');
    }

    reviewsList.innerHTML = card._reviews
      .slice(0, card._shown)
      .map(r => renderReview(r, appId))
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
    .map(r => renderReview(r, card.dataset.appId))
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
    const requestedIds = new URLSearchParams(window.location.search).get('id');
    const gamesUrl = requestedIds
      ? `api.php?action=games&ids=${encodeURIComponent(requestedIds)}`
      : 'api.php?action=games';
    const res = await fetch(gamesUrl, { cache: 'no-store' });
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
