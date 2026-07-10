const STEAM_REVIEW_URL = 'https://store.steampowered.com/appreviews';
const STEAM_APP_DETAILS_URL = 'https://store.steampowered.com/api/appdetails';

async function fetchGames(appIds, fetcher = globalThis.fetch) {
  return Promise.all(appIds.map(async appId => {
    try {
      const response = await fetcher(`${STEAM_APP_DETAILS_URL}?appids=${encodeURIComponent(appId)}`);
      if (!response.ok) throw new Error(`Steam API returned ${response.status}`);
      const data = await response.json();
      const app = data[appId];
      if (!app?.success || !app.data?.name) throw new Error('Game not found');
      return { appId, name: app.data.name };
    } catch {
      return { appId, name: `Steam App ${appId}` };
    }
  }));
}

async function fetchReviews(appId, fetcher = globalThis.fetch) {
  const url =
    `${STEAM_REVIEW_URL}/${appId}` +
    '?json=1&num_per_page=20&filter=recent&language=all&purchase_type=all';

  const response = await fetcher(url);
  if (!response.ok) {
    throw new Error(`Steam API returned ${response.status}`);
  }

  const data = await response.json();
  if (data.success !== 1) {
    throw new Error('Steam API returned success=0');
  }

  const reviews = (data.reviews || []).map(r => ({
    id: r.recommendationid,
    author: r.author?.steamid ?? '',
    text: r.review,
    thumbsUp: r.voted_up,
    createdAt: r.timestamp_created,
    developerResponse: r.developer_response || '',
    needsResponse: !r.developer_response && (Date.now() / 1000 - r.timestamp_created) < 30 * 24 * 60 * 60,
  }));
  const totalReviews = Number(data.query_summary?.total_reviews);

  return {
    appId,
    totalFetched: reviews.length,
    totalReviews: Number.isFinite(totalReviews) ? totalReviews : reviews.length,
    unansweredCount: reviews.filter(r => r.needsResponse).length,
    reviews,
  };
}

module.exports = { fetchGames, fetchReviews };
