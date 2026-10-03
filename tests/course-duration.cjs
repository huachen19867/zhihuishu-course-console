const assert = require('node:assert/strict');
const { selectNextVideo } = require('../course-duration.cjs');

const row = (id, done = false, index = 0) => ({ id, done, index });

const a = row('a', false, 0);
const b = row('b', true, 1);
const c = row('c', false, 2);
const d = row('d', false, 3);

assert.equal(selectNextVideo([], 0), null);
assert.equal(selectNextVideo([], 0, { timed: true }), null);
assert.equal(selectNextVideo([a], 0), a);
assert.equal(selectNextVideo([b], 0), null);
assert.equal(selectNextVideo([b], 0, { timed: true }), b);

// Timed mode follows row order even when the next video is already marked done.
assert.equal(selectNextVideo([a, b, c], 0, { timed: true }), b);
assert.equal(selectNextVideo([a, b, c], 2, { timed: true }), a);

// Ordinary mode skips completed rows after the current row, then wraps to the
// first unfinished row if there is nothing unfinished later in the list.
assert.equal(selectNextVideo([a, b, c, d], 0), c);
assert.equal(selectNextVideo([a, b, c, d], 3), a);
assert.equal(selectNextVideo([row('done-1', true, 0), row('done-2', true, 1)], 0), null);

console.log('Course duration checks passed: timed order, unfinished selection, wraparound, and empty/all-done lists.');
