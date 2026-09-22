'use strict';
// Per-meal model. Old strings remain intact as migration evidence, never guessed into actual meals.
window.ME=(()=>{
 const slots=['breakfast','amSnack','lunch','pmSnack','dinner'];
 const labels={breakfast:'아침',amSnack:'오전간식',lunch:'점심',pmSnack:'오후간식',dinner:'저녁'};
 const split=text=>String(text||'').split(/\s*[·+\n,]\s*|\s+\/\s+/).map(x=>x.trim()).filter(Boolean);
 const items=text=>split(text).map(name=>({id:MN.uid(),name}));
 const title=list=>(list||[]).map(x=>x.name).join(' · ');
 const schoolParts=text=>{
   const out={amSnack:'',lunch:'',pmSnack:''},raw=String(text||'').trim();
   const chunks=raw.split(/(?=(?:오전간식|오후간식|오전\s*간식|오후\s*간식|오전|오후|점심))/).filter(Boolean);
   let found=false;
   for(const chunk of chunks){const match=chunk.match(/^(오전\s*간식|오후\s*간식|오전|오후|점심)\s*[:：]?\s*([\s\S]*)/);if(match){found=true;out[match[1].startsWith('오전')?'amSnack':match[1].startsWith('오후')?'pmSnack':'lunch']=match[2].replace(/[\/\s]+$/,'');}}
   if(!found)out.lunch=raw;
   return out;
 };
 const make=(text,source='home',confirmed=false)=>({source,plan:{items:items(text),confirmed},actual:null});
 function migrate(s){
   if(s.schemaVersion===2){s.prepDone??={};for(const t of Object.values(s.tasks||{}))if(t.done&&t.ingredient&&t.meal)s.prepDone[[t.date,t.meal,'thaw',t.ingredient].join('|')]=true;}
   for(const [date,d] of Object.entries(s.days)){
     if(d.meals)continue;
     const p=d.plan||{};
     d.institutionEnabled=p.lunch==null&&(s.profile?.institutionMeals||'있음')==='있음'&&!d.home;
     d.meals={};
     for(const slot of ['breakfast','lunch','dinner']){
       let t=p[slot]?.title||'';
       if(slot==='dinner')t=d.easy?.menu||d.custom||t;
       if(t)d.meals[slot]=make(t,'home',true);
       if(slot==='dinner'&&d.easy?.menu)d.meals[slot].plan.easy=d.easy.type;
     }
     const school=schoolParts(d.school||p.institution);
     if(d.institutionEnabled)for(const slot of ['amSnack','lunch','pmSnack'])d.meals[slot]=make(school[slot],'school',true);
     if(d.actual)d.legacyActual={...structuredClone(d.actual),note:'이전 버전의 하루 전체 기록 · 끼니 구분 없음'};
     d.extras={fruit:!!d.actual?.fruit,dairy:!!d.actual?.dairy};
   }
   s.schemaVersion=3;
 }
 if(!MN.error())MN.update(s=>{migrate(s);});
 function ensure(candidates){
   if(MN.error())return;
   MN.update(s=>{
     migrate(s);
     candidates.forEach((p,i)=>{
       const date=MN.dateKey(i),d=s.days[date]??={meals:{},extras:{}};
       const enabled=(s.profile?.institutionMeals||'있음')==='있음'&&!d.home;
       const oldMode=d.institutionEnabled;
       if(oldMode!==undefined&&oldMode!==enabled){
         d.modeMeals??={};d.modeMeals[oldMode?'school':'home']=structuredClone(d.meals);
         const previous=d.modeMeals[enabled?'school':'home'];
         if(previous)for(const slot of ['amSnack','lunch','pmSnack']){if(previous[slot])d.meals[slot]=structuredClone(previous[slot]);else delete d.meals[slot];}
       }
       d.institutionEnabled=enabled;
       const school=schoolParts(d.school||'');
       for(const slot of ['breakfast','lunch','dinner']){
         if(slot==='lunch'&&enabled)continue;
         if(!d.meals[slot]||d.meals[slot].source==='school'){
           // Preserve a previous school record when daily mode is changed.
           if(d.meals[slot]?.actual)(d.archivedMeals??=[]).push(structuredClone(d.meals[slot]));
           d.meals[slot]=make(p[slot]?.title||'');
         }
         const m=d.meals[slot];
         if(!m.plan.confirmed&&!m.plan.edited&&!m.actual&&p[slot])m.plan.items=stableItems(m.plan.items,p[slot].title);
       }
       if(enabled)for(const slot of ['amSnack','lunch','pmSnack']){
         if(!d.meals[slot]||d.meals[slot].source!=='school'){
           if(d.meals[slot]?.actual)(d.archivedMeals??=[]).push(structuredClone(d.meals[slot]));
           d.meals[slot]=make(school[slot],'school',true);
         }
         const m=d.meals[slot];m.plan.items=stableItems(m.plan.items,school[slot]);m.plan.confirmed=true;
       }
       d.plan=p; // legacy recipe/recommendation context, never the source for recorded meals
     });
   });
 }
 function stableItems(old,text){const names=split(text);return names.map((name,i)=>old?.[i]?.name===name?old[i]:{id:MN.uid(),name});}
 function timeline(date,s=MN.snapshot()){
   const d=s.days[date]||{};
   const enabled=d.institutionEnabled??((s.profile?.institutionMeals||'있음')==='있음'&&!d.home);
   return slots.filter(slot=>enabled||['breakfast','lunch','dinner'].includes(slot)||d.meals?.[slot]?.actual).map(slot=>{
     const m=d.meals?.[slot]||make('',enabled&&['amSnack','lunch','pmSnack'].includes(slot)?'school':'home');
     const status=m.actual&&date<=MN.sessionDate?'actual':m.source==='school'&&m.plan.items.length&&date<=MN.sessionDate?'school':m.plan.items.length&&date>=MN.sessionDate?'planned':'missing';
     return {slot,label:labels[slot],...m,status};
   });
 }
 // Ingredient requirements are curated per dish, never inherited from the replaced meal.
 const catalog={
  '쌀밥':['쌀'],'김치':['김치'],'미역국':['미역'],'소고기미역국':['국거리','미역'],'된장찌개':['두부','애호박','된장'],
  '감자된장국':['감자','된장'],'애호박된장국':['애호박','된장'],'두부된장국':['두부','된장'],
  '감자국':['감자'],'무국':['무'],'소고기무국':['국거리','무'],'콩나물국':['콩나물'],'달걀국':['달걀'],'어묵국':['어묵'],'만두국':['만두'],
  '오뎅볶음':['어묵'],'어묵볶음':['어묵'],'소불고기':['불고기용 소고기','양파'],'돼지불고기':['앞다리살','양파'],
  '달걀말이':['달걀'],'달걀찜':['달걀'],'두부부침':['두부'],'두부조림':['두부'],'브로콜리무침':['브로콜리'],
  '콩나물무침':['콩나물'],'시금치무침':['시금치'],'오이무침':['오이'],'애호박볶음':['애호박'],'버섯볶음':['버섯'],
  '감자채볶음':['감자'],'단호박찜':['단호박'],'고구마조림':['고구마'],'김':['김'],'깻잎':['깻잎'],
  '돼지고기숙주볶음':['삼겹살','숙주'],'돼지고기애호박볶음':['다진 돼지고기','애호박'],'닭고기간장조림':['닭고기'],
  '고등어구이':['고등어'],'갈치구이':['갈치'],'가자미구이':['가자미'],'연어구이':['연어'],'삼치구이':['삼치'],
  '닭다리살구이':['닭다리살'],'닭안심구이':['닭안심'],'오징어볶음':['오징어'],'새우채소볶음':['새우','당근'],
  '떡갈비':['떡갈비'],'햄 주먹밥':['햄','쌀'],'달걀 주먹밥':['달걀','쌀'],'시리얼':['시리얼'],
  '우유':['우유'],'우유/요구르트':['우유'],'과일':['과일'],'식빵':['식빵'],'치즈':['치즈'],'유부초밥':['유부','쌀'],'잔치국수':['소면']
 };
 const aliases={
  '불고기용 소고기':['불고기용 소고기','소고기'],'국거리':['국거리','소고기','양지'],
  '앞다리살':['앞다리살','목살','뒷다리살'],'삼겹살':['삼겹살','대패삼겹','항정살'],
  '닭고기':['닭고기','닭다리살','닭안심','닭가슴살'],'닭안심':['닭안심','닭가슴살'],
  '버섯':['버섯','느타리버섯','새송이버섯','팽이버섯','표고버섯','양송이버섯'],
  '치즈':['치즈','슬라이스치즈'],'달걀':['달걀','계란'],'과일':['과일','사과','배','바나나','귤','포도','키위'],
  '어묵':['어묵','오뎅']
 };
 function requirements(list){return {known:[...new Set(list.flatMap(x=>catalog[x.name]||[]))],unknown:list.filter(x=>!catalog[x.name]).map(x=>x.name)};}
 function stock(name,s){return s.inventory.filter(x=>(aliases[name]||[name]).includes(x.name));}
 function tasks(s=MN.snapshot()){
   const result=[],seen=new Set();
   for(const date of [MN.sessionDate,MN.dateFor('tomorrow')]){
     for(const m of timeline(date,s)){
       if(m.source!=='home'||!m.plan.confirmed||m.actual||m.plan.easy)continue;
       const req=requirements(m.plan.items),prefix=(date===MN.sessionDate?'오늘':'내일')+' '+m.label+' 준비';
       function add(type,ingredient,action){
         const id=[date,m.slot,type,ingredient].join('|');if(seen.has(id))return;seen.add(id);
         result.push({id,date,slot:m.slot,type,ingredient,prefix,action,menus:title(m.plan.items),done:!!s.prepDone?.[id]||(type==='shop'&&!!s.shopping[MN.sessionDate]?.[ingredient])});
       }
       for(const name of req.known){
         const available=stock(name,s);
         if(!available.length)add('shop',name,name+' 장보기');
         else if(available.every(x=>x.cat==='냉동')&&/소고기|국거리|양지|삼겹|목살|앞다리|뒷다리|항정|닭|고등어|갈치|가자미|연어|삼치|오징어|새우|전복/.test(available[0].name)){
           add('thaw',available[0].name,'냉동 '+available[0].name+'를 오늘 냉장실로 옮겨주세요.');
         }
       }
       for(const dish of m.plan.items)if(/주먹밥|유부초밥/.test(dish.name)&&date===MN.dateFor('tomorrow'))add('prep','밥','내일 '+dish.name+'에 쓸 밥이 준비되어 있는지 오늘 확인해 주세요.');
     }
   }
   return result;
 }
 function update(fn){MN.update(s=>{fn(s);const active=new Set(tasks(s).map(t=>t.id));for(const id of Object.keys(s.prepDone||{}))if(!active.has(id))delete s.prepDone[id];});}
 function edit(date,slot,kind,list){
   if(kind==='actual'&&date>MN.sessionDate)throw Error('미래 식사는 식사 플랜에서 정해 주세요.');
   update(s=>{
     const source=timeline(date,s).find(x=>x.slot===slot)?.source||'home';
     const d=s.days[date]??={meals:{},extras:{},institutionEnabled:(s.profile?.institutionMeals||'있음')==='있음'};
     d.meals??={};
     const m=d.meals[slot]??=make('',source);
     if(kind==='actual')m.actual={items:structuredClone(list),savedAt:new Date().toISOString()};
     else m.plan={...m.plan,items:structuredClone(list),edited:true,confirmed:true};
   });
 }
 function confirm(date,slot){const m=timeline(date).find(x=>x.slot===slot);edit(date,slot,'actual',m.plan.items);}
 function week(date){
   const base=new Date(date+'T12:00:00'),start=1-(base.getDay()||7),by={actual:[],school:[],planned:[],missing:[]};
   for(let i=0;i<7;i++){
     const key=MN.dateKey(start+i,base),rows=timeline(key);
     for(const kind of Object.keys(by)){
       const matches=rows.filter(m=>m.status===kind);
       let text=matches.map(m=>{const list=m.status==='actual'?m.actual.items:m.plan.items;return title(list)+' '+requirements(list).known.join(' ');}).join(' ');
       const d=MN.snapshot().days[key];
       if(kind==='actual'&&key<=MN.sessionDate)text+=' '+(d?.extras?.fruit?'과일 ':'')+(d?.extras?.dairy?'우유':'')+' '+(d?.legacyActual?.menu||'');
       by[kind].push({date:key,school:text,meal:{title:''},count:matches.length});
     }
   }
   return by;
 }
 return {slots,labels,items,title,schoolParts,ensure,timeline,requirements,stock,tasks,update,edit,confirm,week,catalog};
})();
