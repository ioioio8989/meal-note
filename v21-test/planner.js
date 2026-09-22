'use strict';
// Curated dishes only. Coverage is a constraint; stock and variety rank valid meals.
window.PN=(()=>{
 Object.assign(ME.catalog,{
  '전복솥밥':['전복','쌀'], '전복죽':['전복','쌀'], '전복버터구이':['전복','버터'],
  '전복미역국':['전복','미역'], '전복간장조림':['전복','간장'],
  '콩나물밥':['콩나물','쌀'], '어묵볶음':['어묵','양파'],
  '토마토달걀볶음':['토마토','달걀'], '참치주먹밥':['참치캔','쌀'],
  '두부달걀부침':['두부','달걀'], '감자조림':['감자','간장'],
  '돼지국밥':['돼지고기','쌀'], '토마토리조또':['토마토','쌀'],
  '전복볶음밥':['전복','쌀','달걀']
 });
 const mains=['전복솥밥','전복버터구이','전복죽','전복간장조림','전복볶음밥','콩나물밥','소불고기','돼지불고기','닭다리살구이','닭안심구이','고등어구이','갈치구이','연어구이','삼치구이','두부조림','두부달걀부침','달걀말이','토마토달걀볶음','새우채소볶음','오징어볶음','참치주먹밥','유부초밥'];
 const sides=['애호박볶음','콩나물국','콩나물무침','어묵볶음','어묵국','전복미역국','감자채볶음','감자조림','두부부침','달걀찜','시금치무침','브로콜리무침','오이무침','버섯볶음','감자국','미역국','김'];
 const req=names=>ME.requirements(names.map(name=>({name}))).known;
 const normalize=s=>s.replace(/\s/g,'');
 const uses=(name,needs,s)=>needs.some(n=>normalize(n)===normalize(name)||ME.stock(n,s).some(x=>x.name===name));
 const proteins=t=>(t.match(/전복|소고기|불고기|돼지|닭|고등어|연어|갈치|삼치|두부|달걀|어묵|오징어|새우|참치/g)||[]);
 function options(date=MN.sessionDate,s=MN.snapshot(),history=[]){
  const preferred=s.days[date]?.preferred||[];
  const day=s.days[date]||{},schoolEnabled=(s.profile?.institutionMeals||'있음')==='있음'&&!day.home;
  const context=[schoolEnabled?day.school||'':'',...MN.recentMeals(),...Object.entries(day.meals||{}).filter(([slot,m])=>m.actual||(slot!=='dinner'&&m.plan.confirmed)).map(([,m])=>ME.title(m.actual?.items||m.plan.items)),...history].join(' ');
  const contextProteins=proteins(context);
  const missing=ds=>req(ds).filter(n=>!ME.stock(n,s).length);
  const dishScore=d=>req([d]).filter(n=>ME.stock(n,s).length).length*3-missing([d]).length*5-(context.includes(d)?12:0)-(proteins(d).some(p=>contextProteins.includes(p))?4:0);
  const candidates=[];
  for(const main of mains)for(let variant=0;variant<3;variant++){
   const dishes=[main];
   const remaining=[...preferred].filter(p=>!uses(p,req(dishes),s));
   while(remaining.length&&dishes.length<4){
    const choices=sides.filter(d=>!dishes.includes(d)&&!(/국$|찌개$/.test(d)&&dishes.some(x=>/국$|찌개$|죽$/.test(x)))).map(d=>({d,cover:remaining.filter(p=>uses(p,req([d]),s)),score:dishScore(d)})).filter(x=>x.cover.length).sort((a,b)=>b.cover.length-a.cover.length||b.score-a.score||a.d.localeCompare(b.d));
    if(!choices.length)break;
    const best=choices.filter(x=>x.cover.length===choices[0].cover.length);
    const pick=best[Math.min(variant,best.length-1)];dishes.push(pick.d);
    for(const p of pick.cover)remaining.splice(remaining.indexOf(p),1);
   }
   if(dishes.length<2){
    const extras=sides.filter(d=>!dishes.includes(d)&&!(/국$|찌개$|죽$/.test(main)&&/국$|찌개$/.test(d))&&!req([d]).some(n=>req([main]).includes(n))).sort((a,b)=>dishScore(b)-dishScore(a)||a.localeCompare(b));
    dishes.push(extras[Math.min(variant,extras.length-1)]);
   }
   if(!dishes.some(d=>/밥|죽|국수|리조또/.test(d)))dishes.unshift('쌀밥');
   const needed=req(dishes),covered=preferred.filter(p=>uses(p,needed,s)),uncovered=preferred.filter(p=>!covered.includes(p));
   candidates.push({id:dishes.join('|'),dishes,needed,covered,uncovered,missing:missing(dishes),score:dishes.reduce((n,d)=>n+dishScore(d),0)-dishes.length});
  }
  const unique=[...new Map(candidates.map(c=>[c.id,c])).values()];
  const bestCoverage=Math.max(0,...unique.map(c=>c.covered.length));
  return unique.filter(c=>c.covered.length===bestCoverage).sort((a,b)=>b.score-a.score||a.id.localeCompare(b.id));
 }
 function choose(date,id){
  const candidate=options(date).find(x=>x.id===id);if(!candidate)throw Error('재료가 바뀌었어요. 새 선택지에서 다시 골라 주세요.');
  ME.edit(date,'dinner','plan',ME.items(candidate.dishes.join(' · ')));
 }
 return {options,choose,uses};
})();
