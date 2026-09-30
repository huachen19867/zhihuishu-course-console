const assert=require('node:assert/strict');
const {readScore}=require('../homework/result.cjs');
assert.equal(readScore('你本次获得的成绩是\n18\n分'),18);
assert.equal(readScore('本章测试你的得分为 80\n每日6点更新'),80);
assert.equal(readScore('本章测试你的得分为 87.5'),87.5);
assert.equal(readScore('总分数100\n完成率100%'),undefined);
console.log('Result checks passed: both result page formats, decimals, no score before submission.');
