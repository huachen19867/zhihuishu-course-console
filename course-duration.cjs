// Timed playback follows the catalogue, including already completed videos.
// Ordinary playback retains the existing unfinished-video selection.
function selectNextVideo(rows,current,{timed=false}={}){
  if(!rows.length)return null;
  const index=typeof current==='number'?current:(current?.index??-1);
  if(timed)return rows.find(row=>row.index>index)||rows[0];
  return rows.find(row=>!row.done&&row.index>index)||rows.find(row=>!row.done)||null;
}
module.exports={selectNextVideo};
