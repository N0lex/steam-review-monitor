const STEAM_REVIEW_URL = 'https://store.steampowered.com/appreviews';

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

  return {
    appId,
    totalFetched: reviews.length,
    unansweredCount: reviews.filter(r => r.needsResponse).length,
    reviews,
  };
}

module.exports = { fetchReviews };
