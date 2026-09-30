async function closeQuestion({read,click,guard,stopped=()=>false,pause=ms=>new Promise(r=>setTimeout(r,ms))}){
 const initial=await read();
 if(!initial)return;
 for(let attempt=0;attempt<3;attempt++){
  await guard();
  if(stopped())return;
  const current=await read();
  if(!current||current.fingerprint!==initial.fingerprint)return;
  try{await click()}catch(error){
   if(error.name!=='TimeoutError'&&!/detached from the DOM/.test(error.message))throw error;
  }
  await pause(350);
  const after=await read();
  if(!after||after.fingerprint!==initial.fingerprint)return;
 }
 throw Error('答题弹窗三次关闭核验仍未消失，停止并保留页面');
}
module.exports={closeQuestion};
