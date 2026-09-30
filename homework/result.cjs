function readScore(body){
 if(/恭喜你本章测试取得满分/u.test(body)){
   const total=body.match(/总分数\s*(\d+(?:\.\d+)?)/u);
   if(total)return Number(total[1]);
 }
 const match=body.match(/你本次获得的成绩是\s*(\d+(?:\.\d+)?)\s*分/u)||body.match(/本章测试你的得分为\s*(\d+(?:\.\d+)?)/u);
 return match?Number(match[1]):undefined;
}
function readSubmittedScore(body){
 const match=body.match(/(?:^|\s)(\d+(?:\.\d+)?)\s*作业成绩/u);
 return match?Number(match[1]):undefined;
}
module.exports={readScore,readSubmittedScore};
