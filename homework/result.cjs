function readScore(body){
 const match=body.match(/你本次获得的成绩是\s*(\d+(?:\.\d+)?)\s*分/u)||body.match(/本章测试你的得分为\s*(\d+(?:\.\d+)?)/u);
 return match?Number(match[1]):undefined;
}
module.exports={readScore};
