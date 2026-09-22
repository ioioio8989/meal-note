'use strict';
// Food-source presence, not nutrient quantities or adequacy. No recipe-dependent cheese/oil assumptions.
window.NI=(()=>{
 const groups={
  carb:['쌀','흑미','잡곡','밥','빵','식빵','우동','국수','면','시리얼','감자','고구마','떡','리조또','죽'],
  protein:['소고기','돼지고기','닭고기','전복','고등어','갈치','가자미','연어','삼치','오징어','새우','어묵','두부','달걀','유부','참치','콩','우유','요구르트','요거트','치즈'],
  fat:['소고기','돼지고기','닭고기','달걀','두부','유부','우유','요구르트','요거트','치즈','고등어','연어','버터','참기름','들기름','올리브유','견과류'],
  vitamin:['토마토','콩나물','숙주','애호박','브로콜리','버섯','당근','양파','깻잎','시금치','오이','무','단호박','파프리카','배추','김치','사과','배','포도','복숭아','바나나','귤','오렌지','키위','수박','멜론','과일','감자','고구마'],
  mineral:['소고기','돼지고기','닭고기','전복','우유','요구르트','요거트','치즈','미역','김','멸치','고등어','갈치','가자미','두부','달걀','시금치','브로콜리','콩']
 };
 const aliases=[[/돼지국밥|돼지불고기|제육|삼겹살|목살|앞다리살|다진\s*돼지고기/g,' 돼지고기 '],[/소불고기|국거리|양지|소고기/g,' 소고기 '],[/닭안심|닭다리살|닭가슴살|닭고기|치킨/g,' 닭고기 '],[/계란/g,' 달걀 '],[/오뎅/g,' 어묵 '],[/토마토\s*리[조소]또/g,' 토마토 쌀 '],[/돼지국밥/g,' 쌀 ']];
 function tokens(raw){
  let text=String(raw||'');const expanded=aliases.map(([re,value])=>text.match(re)?value:'').join(' ');text+=' '+expanded;
  const words=[...new Set(Object.values(groups).flat())];
  return words.filter(w=>{
   if(w==='배')return /(^|[\s·,+/])배(?:$|[\s·,+/]|조각|주스)/.test(text);
   if(w==='무')return /(^|[\s·,+/])무(?:$|[\s·,+/]|국|나물|생채|조림)/.test(text)||/소고기무국/.test(text);
   if(w==='김')return /(^|[\s·,+/])김(?:$|[\s·,+/]|구이|가루)|김밥/.test(text);
   if(w==='콩')return /(^|[\s·,+/])콩(?:$|[\s·,+/]|밥|조림)|검은콩|렌틸콩/.test(text);
   return text.includes(w);
  });
 }
 function weekly(days){
  const scores=Object.fromEntries(Object.keys(groups).map(k=>[k,0])),foods=Object.fromEntries(Object.keys(groups).map(k=>[k,[]]));
  for(const d of days){const t=tokens((d.school||'')+' '+(d.meal?.title||''));for(const [k,terms] of Object.entries(groups)){const hits=t.filter(x=>terms.includes(x));if(hits.length)scores[k]++;foods[k]=[...new Set([...foods[k],...hits])];}}
  return {scores,foods};
 }
 return {tokens,weekly};
})();
