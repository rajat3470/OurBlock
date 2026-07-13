const test = require('node:test');
const assert = require('node:assert/strict');

const { evaluateRejectionWindow } = require('../../lib/shared/rejectionThreshold.js');

test('blocks after five rejections within one hour', () => {
  const now = new Date('2025-01-01T12:00:00.000Z');
  const timestamps = [
    new Date('2025-01-01T11:30:00.000Z'),
    new Date('2025-01-01T11:40:00.000Z'),
    new Date('2025-01-01T11:50:00.000Z'),
    new Date('2025-01-01T11:55:00.000Z'),
  ];

  const result = evaluateRejectionWindow(timestamps, now);
  assert.equal(result.recentCount, 4);
  assert.equal(result.shouldBlock, false);

  const blocked = evaluateRejectionWindow([...timestamps, new Date('2025-01-01T12:00:00.000Z')], now);
  assert.equal(blocked.recentCount, 5);
  assert.equal(blocked.shouldBlock, true);
});

test('drops older timestamps outside the one-hour window', () => {
  const now = new Date('2025-01-01T12:00:00.000Z');
  const timestamps = [
    new Date('2024-12-31T10:00:00.000Z'),
    new Date('2025-01-01T11:10:00.000Z'),
  ];

  const result = evaluateRejectionWindow(timestamps, now);
  assert.equal(result.recentCount, 1);
  assert.equal(result.shouldBlock, false);
});

test('only counts rejections for the same user', () => {
  const now = new Date('2025-01-01T12:00:00.000Z');
  const events = [
    { timestamp: new Date('2025-01-01T11:20:00.000Z'), userId: 'user-a' },
    { timestamp: new Date('2025-01-01T11:25:00.000Z'), userId: 'user-a' },
    { timestamp: new Date('2025-01-01T11:30:00.000Z'), userId: 'user-a' },
    { timestamp: new Date('2025-01-01T11:35:00.000Z'), userId: 'user-a' },
    { timestamp: new Date('2025-01-01T11:40:00.000Z'), userId: 'user-b' },
  ];

  const result = evaluateRejectionWindow(events, now, 'user-a');
  assert.equal(result.recentCount, 4);
  assert.equal(result.shouldBlock, false);
});
