const { test } = require('node:test');
const assert = require('node:assert/strict');
const { fetchReviews } = require('../services/steam');

function makeFetcher(reviews = [], success = 1) {
  return async () => ({
    ok: true,
    json: async () => ({ success, reviews }),
  });
}

function makeReview(overrides = {}) {
  return {
    recommendationid: '111',
    author: { steamid: '76561198000000000' },
    review: 'Great game',
    timestamp_created: 1720000000,
    voted_up: true,
    developer_response: '',
    ...overrides,
  };
}

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
