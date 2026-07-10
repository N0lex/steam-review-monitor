const { test } = require('node:test');
const assert = require('node:assert/strict');
const { fetchGames, fetchReviews } = require('../services/steam');

function makeFetcher(reviews = [], success = 1, totalReviews) {
  return async () => ({
    ok: true,
    json: async () => ({
      success,
      reviews,
      ...(totalReviews === undefined ? {} : { query_summary: { total_reviews: totalReviews } }),
    }),
  });
}

const RECENT_TS = Math.floor(Date.now() / 1000) - 60; // 1 minute ago
const OLD_TS = Math.floor(Date.now() / 1000) - 31 * 24 * 60 * 60; // 31 days ago

function makeReview(overrides = {}) {
  return {
    recommendationid: '111',
    author: { steamid: '76561198000000000' },
    review: 'Great game',
    timestamp_created: RECENT_TS,
    voted_up: true,
    developer_response: '',
    ...overrides,
  };
}

test('fetches game names for custom app IDs', async () => {
  const fetcher = async url => {
    const appId = new URL(url).searchParams.get('appids');
    return {
      ok: true,
      json: async () => ({ [appId]: { success: true, data: { name: `Game ${appId}` } } }),
    };
  };
  const games = await fetchGames(['10', '20'], fetcher);
  assert.deepEqual(games, [
    { appId: '10', name: 'Game 10' },
    { appId: '20', name: 'Game 20' },
  ]);
});

test('falls back to the app ID when Steam game details are unavailable', async () => {
  const fetcher = async () => ({ ok: false, status: 503 });
  const games = await fetchGames(['999'], fetcher);
  assert.deepEqual(games, [{ appId: '999', name: 'Steam App 999' }]);
});

test('marks review with empty developer_response as needsResponse', async () => {
  const fetcher = makeFetcher([makeReview({ developer_response: '' })]);
  const result = await fetchReviews('2435310', fetcher);
  assert.equal(result.reviews[0].needsResponse, true);
});

test('marks review with non-empty developer_response as not needsResponse', async () => {
  const fetcher = makeFetcher([makeReview({ developer_response: 'Thanks!' })]);
  const result = await fetchReviews('2435310', fetcher);
  assert.equal(result.reviews[0].needsResponse, false);
  assert.equal(result.reviews[0].developerResponse, 'Thanks!');
});

test('counts unansweredCount correctly', async () => {
  const fetcher = makeFetcher([
    makeReview({ recommendationid: '1', developer_response: '' }),
    makeReview({ recommendationid: '2', developer_response: 'Thanks!' }),
    makeReview({ recommendationid: '3', developer_response: '' }),
  ]);
  const result = await fetchReviews('2435310', fetcher);
  assert.equal(result.unansweredCount, 2);
  assert.equal(result.totalFetched, 3);
});

test('returns the total review count from Steam query_summary', async () => {
  const fetcher = makeFetcher([makeReview()], 1, 12345);
  const result = await fetchReviews('2435310', fetcher);
  assert.equal(result.totalFetched, 1);
  assert.equal(result.totalReviews, 12345);
});

test('does not mark review older than 30 days as needsResponse even without dev response', async () => {
  const fetcher = makeFetcher([makeReview({ developer_response: '', timestamp_created: OLD_TS })]);
  const result = await fetchReviews('2435310', fetcher);
  assert.equal(result.reviews[0].needsResponse, false);
  assert.equal(result.unansweredCount, 0);
});

test('maps thumbsUp from voted_up', async () => {
  const fetcher = makeFetcher([
    makeReview({ voted_up: true }),
    makeReview({ recommendationid: '222', voted_up: false }),
  ]);
  const result = await fetchReviews('2435310', fetcher);
  assert.equal(result.reviews[0].thumbsUp, true);
  assert.equal(result.reviews[1].thumbsUp, false);
});

test('throws when Steam API returns ok=false', async () => {
  const fetcher = async () => ({ ok: false, status: 429 });
  await assert.rejects(
    () => fetchReviews('2435310', fetcher),
    /Steam API returned 429/,
  );
});

test('throws when success !== 1', async () => {
  const fetcher = makeFetcher([], 0);
  await assert.rejects(
    () => fetchReviews('2435310', fetcher),
    /success=0/,
  );
});
