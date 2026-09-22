'use strict';
(()=>{
 const $=id=>document.getElementById(id),esc=MN.escape;
 let selected=MN.sessionDate,editing=null,toastTimer,optionOffset=0,optionKey='';
 const statusNames={actual:'실제 기록',school:'기관 식단 기준',planned:'예정',missing:'미기록'};
 const titles={home:'오늘의 식사와 준비',plan:'재료에서 한 끼로',records:'식사 기록',input:'우리집 재료',guide:'아이 정보 · 하루 기준',school:'기관 식단 등록',settings:'설정'};
 // Move low-frequency management out of all four primary surfaces.
 const schoolCard=$('schoolToday').closest('.section');$('schoolMount').append(schoolCard);
 $('settings').append($('dataSettings'));
 document.querySelector('#ingredientSearch')?.closest('.section')?.classList.add('inventoryCard');
 window.showView=(name)=>{
   document.querySelectorAll('.view').forEach(v=>v.classList.toggle('active',v.id===name));
   document.querySelectorAll('.navbtn').forEach(b=>{b.classList.toggle('active',b.dataset.open===name);if(b.dataset.open===name)b.setAttribute('aria-current','page');else b.removeAttribute('aria-current');});
   $('headerTitle').textContent=titles[name]||'MEAL NOTE';
   if(name==='records'){$('recordDate').value=selected;renderRecords();}
   window.scrollTo({top:0,behavior:'instant'});
 };
 function notify(text){$('toast').textContent=text;$('toast').hidden=false;clearTimeout(toastTimer);toastTimer=setTimeout(()=>$('toast').hidden=true,2200);}
 const attr=(date,slot)=>'data-date="'+esc(date)+'" data-slot="'+slot+'"';
 function chips(list){return '<div class="dishChips">'+list.map(x=>'<span>'+esc(x.name)+'</span>').join('')+'</div>';}
 function row(m,date,mode){
   const actual=m.status==='actual',list=actual?m.actual.items:m.plan.items;
   const source=m.source==='school'?'기관 식단':'집';
   let controls='';
   if(mode==='record'&&date<=MN.sessionDate){
     controls=(!actual&&list.length?'<button class="btn primary" data-action="ate" '+attr(date,m.slot)+'>✓ 이대로 먹었어요</button>':'')+
       '<button class="btn" data-action="editActual" '+attr(date,m.slot)+'>'+(list.length?'먹은 메뉴 수정':'먹은 메뉴 추가')+'</button>'+
       (actual?'<button class="textbtn" data-action="undoActual" '+attr(date,m.slot)+'>기록 취소</button>':'');
   }
   if(mode==='home')controls='<button class="textbtn" data-action="toRecord">기록 보기 →</button>';
   return '<article class="timelineMeal '+m.status+'" data-meal="'+m.slot+'"><div class="mealHeading"><h3>'+m.label+' <small>'+source+'</small></h3><span class="stateTag '+m.status+'">'+statusNames[m.status]+'</span></div>'+
    (list.length?chips(list):'<p class="muted">'+(m.source==='school'?'기관 메뉴가 아직 없어요.':'아직 남긴 식사가 없어요.')+'</p>')+
    (actual&&!list.length?'<p class="muted">먹은 메뉴 없이 기록했어요.</p>':'')+
    (m.status==='missing'&&list.length?'<p class="muted">당시 계획이에요. 실제로 먹었는지는 아직 기록하지 않았어요.</p>':'')+
    '<div class="mealActions">'+controls+'</div></article>';
 }
 function renderHome(){
   const rows=ME.timeline(MN.sessionDate),tasks=ME.tasks(),pending=tasks.filter(t=>!t.done),shopping=pending.filter(t=>t.type==='shop');
   const homeRows=rows.filter(m=>!['amSnack','pmSnack'].includes(m.slot));
   $('homeContent').innerHTML='<div class="todayHeading"><div class="eyebrow">'+new Date(MN.sessionDate+'T12:00:00').toLocaleDateString('ko-KR',{month:'long',day:'numeric',weekday:'long'})+'</div><h2>오늘의 식사</h2></div><div class="dailyTimeline">'+homeRows.map(m=>{
    const list=m.actual?.items||m.plan.items,chosen=m.actual||m.source==='school'||m.plan.confirmed;
    return '<article class="dailyMeal"><span class="mealLabel">'+(m.source==='school'?'기관':m.label)+'</span><div><p class="mealName">'+esc(chosen?(ME.title(list)||'받은 식단이 아직 없어요'):'아직 고르지 않았어요')+'</p><small>'+ (m.actual?'먹은 기록':m.source==='school'?'기관 식단 기준':m.plan.confirmed?'먹을 예정':'추천이 준비되어 있어요')+'</small>'+(m.source==='school'&&rows.some(r=>['amSnack','pmSnack'].includes(r.slot)&&r.plan.items.length)?'<details class="snackSummary"><summary>기관 간식 보기</summary>'+rows.filter(r=>['amSnack','pmSnack'].includes(r.slot)).map(r=>'<p>'+r.label+' · '+esc(ME.title(r.actual?.items||r.plan.items)||'미등록')+'</p>').join('')+'</details>':'')+'</div></article>';
   }).join('')+'</div><button class="btn primary full" data-open="plan">'+(rows.find(m=>m.slot==='dinner')?.plan.confirmed?'오늘 메뉴 살펴보기':'오늘 메뉴 고르기')+'</button><section class="todayTasks"><div class="flexTitle"><h2>오늘 할 일</h2><span class="muted">'+pending.length+'개</span></div>'+pending.filter(t=>t.type!=='shop').map(t=>'<article class="todo"><div><small>'+esc(t.prefix)+'</small><strong>'+esc(t.action)+'</strong><button class="textbtn" data-action="openMeal" data-date="'+t.date+'" data-slot="'+t.slot+'">메뉴 보기</button></div><button class="btn" data-action="done" data-id="'+esc(t.id)+'">완료</button></article>').join('')+(shopping.length?'<article class="todo"><div><small>확정한 식사에 필요해요</small><strong>'+esc([...new Set(shopping.map(t=>t.ingredient))].join(' · '))+'</strong></div><button class="btn" data-action="doneShopping">장봤어요</button></article>':'')+(!pending.length?'<p class="emptyLine">'+(rows.some(m=>m.source==='home'&&m.plan.confirmed)?'지금 따로 준비할 일은 없어요.':'메뉴를 고르면 필요한 준비를 모아드려요.')+'</p>':'')+(tasks.some(t=>t.done)?'<details><summary>완료한 준비</summary>'+tasks.filter(t=>t.done).map(t=>'<div class="doneRow">'+esc(t.action)+' <button class="textbtn" data-action="done" data-id="'+esc(t.id)+'">되돌리기</button></div>').join('')+'</details>':'')+'</section><button class="quickHome" data-quick>오늘 먹은 것 한 번에 기록 <span>＋</span></button>';
 }
 function renderSuggestions(){
   const state=MN.snapshot(),date=MN.sessionDate,pref=state.days[date]?.preferred||[],key=JSON.stringify([pref,state.inventory]);
   if(key!==optionKey){optionOffset=0;optionKey=key;}
   const all=PN.options(date),ordered=[],seen=new Set();
   // Show different main dishes before repeating the same main with another side.
   for(const c of all){const main=c.dishes.find(d=>d!=='쌀밥');if(!seen.has(main)){ordered.push(c);seen.add(main);}}
   for(const c of all)if(!ordered.includes(c))ordered.push(c);
   optionOffset=Math.min(optionOffset,Math.max(0,ordered.length-1));
   const shown=ordered.slice(optionOffset,optionOffset+2),dinner=ME.timeline(date).find(m=>m.slot==='dinner');
   $('suggestions').innerHTML=(dinner?.plan.confirmed?'<div class="chosenMeal"><span class="eyebrow">선택한 저녁</span><h3>'+esc(ME.title(dinner.plan.items))+'</h3><button class="textbtn" data-action="editPlan" '+attr(date,'dinner')+'>음식 하나만 바꾸기</button></div>':'')+'<div class="flexTitle suggestionTitle"><h3>이런 한 끼 어때요?</h3><button class="textbtn" data-action="moreOptions">다른 메뉴 보기 ↻</button></div>'+shown.map(c=>'<article class="mealOption"><h3>'+esc(c.dishes.join(' + '))+'</h3>'+(c.covered.length?'<p class="coverage">'+esc(c.covered.join(' · '))+' 사용</p>':'')+(c.uncovered.length?'<p class="coverage warning">이번 조합에 미반영: '+esc(c.uncovered.join(' · '))+' · 등록된 요리로 모두 묶기 어려워요.</p>':'')+'<p class="muted">'+(c.missing.length?'추가 필요: '+esc(c.missing.join(' · ')):'주요 재료가 모두 집에 있어요')+'</p><button class="btn full" data-choice="'+esc(c.id)+'">이 메뉴 선택</button></article>').join('')+'<p class="fineprint">주요 재료 기준이에요. 양과 소금·기름 등 기본 양념은 조리 전에 확인해 주세요.</p>';
 }
 function planMeal(m,date){
   if(m.source==='school')return '<div class="schoolPlan"><b>'+m.label+' · 기관 식단</b>'+chips(m.plan.items)+(m.plan.items.length?'':'<span class="muted">미등록</span>')+'</div>';
   const req=ME.requirements(m.plan.items);
   return '<article class="planMeal" data-plan-meal="'+m.slot+'"><div class="mealHeading"><h3>'+m.label+'</h3><span class="stateTag">'+(m.plan.confirmed?'확정':'추천')+(m.plan.easy?' · '+esc(m.plan.easy):'')+'</span></div>'+chips(m.plan.items)+
     '<div class="mealActions"><button class="btn" data-action="editPlan" '+attr(date,m.slot)+'>메뉴 변경 · 추가 · 삭제</button>'+
     (!m.plan.confirmed?'<button class="btn primary" data-action="confirmPlan" '+attr(date,m.slot)+'>이 식사로 확정</button>':'')+'</div>'+
     '<details class="options"><summary>다른 추천 · 간편한 식사</summary><button class="btn" data-action="resetPlan" '+attr(date,m.slot)+'>추천으로 돌아가기</button><div class="easyChoices">'+['배달','외식','남은 음식','간단히 먹기','간편식'].map(x=>'<button class="btn" data-action="easy" data-type="'+x+'" '+attr(date,m.slot)+'>'+x+'</button>').join('')+'</div></details>'+
     (!m.plan.easy&&m.plan.items.length?'<details class="options"><summary>필요한 재료 · 레시피</summary><p>'+esc(req.known.join(' · '))+'</p>'+(req.unknown.length?'<p class="muted">재료를 직접 확인할 메뉴: '+esc(req.unknown.join(' · '))+'</p>':'')+recipeHTML({title:ME.title(m.plan.items)})+'</details>':'')+'</article>';
 }
 function renderPlans(){
   $('planContent').innerHTML=Array.from({length:5},(_,i)=>{
     const date=MN.dateKey(i),rows=ME.timeline(date),d=MN.snapshot().days[date],unconfirmed=rows.some(m=>m.source==='home'&&!m.plan.confirmed);
     if(i>1)return '<details class="futurePreview"><summary>'+date+' · '+['','','모레','3일 뒤','4일 뒤'][i]+'</summary>'+rows.map(m=>planMeal(m,date)).join('')+'</details>';
     return '<section class="planDay" data-plan-date="'+date+'"><div class="dayTitle"><h2>'+(i?'내일':'오늘')+' <small>'+date+'</small></h2>'+(unconfirmed?'<button class="btn primary" data-action="confirmDay" data-date="'+date+'">집 식사 확정</button>':'<span class="muted">집 식사 확정됨</span>')+'</div><button class="textbtn" data-action="homeDay" data-date="'+date+'">'+(d?.home?'기관 식사 이용하기':(i?'내일은':'오늘은')+' 집에서 세 끼')+'</button>'+rows.map(m=>planMeal(m,date)).join('')+'</section>';
   }).join('');
   const s=MN.snapshot(),map=new Map(),unknown=[];
   for(let i=0;i<5;i++)for(const m of ME.timeline(MN.dateKey(i),s)){
     if(m.source!=='home'||!m.plan.confirmed||m.actual||m.plan.easy)continue;
     const r=ME.requirements(m.plan.items);unknown.push(...r.unknown);
     for(const name of r.known)if(!ME.stock(name,s).length)map.set(name,true);
   }
   $('shoppingContent').innerHTML='<section class="section card"><h2>확정한 식사의 장보기</h2><p class="muted">등록한 보유 재료와 비교해 필요한 종류를 모았어요. 필요한 양은 조리 전에 확인해 주세요.</p>'+(map.size?'<div class="shoppingList">'+[...map.keys()].map(name=>'<label class="shoppingItem"><input type="checkbox" data-buy="'+esc(name)+'" '+(s.shopping[MN.sessionDate]?.[name]?'checked':'')+'><span>'+esc(name)+'</span></label>').join(''):'<p>지금 목록에 추가할 재료가 없어요.</p>')+(unknown.length?'<p class="muted">재료를 직접 확인할 메뉴: '+esc([...new Set(unknown)].join(' · '))+'</p>':'')+'</section>';
 }
 function renderRecords(){
   $('recordDate').value=selected;
   const s=MN.snapshot(),d=s.days[selected],future=selected>MN.sessionDate;
   $('recordContent').innerHTML=(!future?'<button class="btn primary full quickRecord" data-quick data-date="'+selected+'">여러 끼니 한 번에 기록</button>':'')+(future?'<p class="note">아직 먹지 않은 날이에요. 예정 메뉴만 보여드려요.</p>':'')+
    '<div class="timeline">'+ME.timeline(selected).map(m=>row(m,selected,'record')).join('')+'</div>'+
    (!future?'<div class="extras"><label><input type="checkbox" data-extra="fruit" '+(d?.extras?.fruit?'checked':'')+'> 과일 먹었어요</label><label><input type="checkbox" data-extra="dairy" '+(d?.extras?.dairy?'checked':'')+'> 우유·유제품 먹었어요</label></div>':'')+
    (d?.legacyActual?'<details class="legacyRecord"><summary>이전 버전의 하루 전체 기록</summary><p>'+esc(d.legacyActual.menu)+'</p><p class="muted">끼니를 구분할 수 없어 원문 그대로 보관했어요. 아래에서 수정할 수 있고, 주간 흐름에는 하루 기록으로 반영해요.</p><textarea id="legacyText" aria-label="이전 하루 기록">'+esc(d.legacyActual.menu)+'</textarea><button class="btn" data-action="saveLegacy">이전 기록 수정 저장</button></details>':'');
   renderWeek();
 }
 function renderWeek(){
   const by=ME.week(selected),stateTotals=Object.fromEntries(Object.entries(by).map(([k,v])=>[k,v.reduce((a,d)=>a+d.count,0)]));
   const legacyDays=by.actual.filter(x=>MN.snapshot().days[x.date]?.legacyActual?.menu).length;
   const unknown=[...new Set(by.actual.flatMap(d=>ME.timeline(d.date).filter(m=>m.actual).flatMap(m=>m.actual.items.map(x=>x.name))).filter(name=>!NI.tokens(name).length))];
   const names={carb:'탄수화물',protein:'단백질',fat:'지방',vitamin:'비타민',mineral:'무기질'},actual=weeklyNutrition(by.actual);
   const other=kind=>{const n=weeklyNutrition(by[kind]);return '<details class="weekSeparate"><summary>'+statusNames[kind]+' · '+stateTotals[kind]+'끼</summary><p class="muted">실제 기록 막대에 합산하지 않아요.</p>'+Object.keys(names).map(k=>'<p>'+names[k]+' · '+esc(n.foods[k].join(' · ')||'표시할 식품 없음')+'</p>').join('')+'</details>';};
   $('weekContent').innerHTML='<section class="weeklyCard"><div class="eyebrow">'+by.actual[0].date+' — '+by.actual[6].date+'</div><h2>이번 주 실제 기록의 흐름</h2><p class="muted">음식 이름과 일반적인 주재료에서 추정한 식품의 등장일이에요. 양·조리법을 몰라 섭취량이나 충분함은 판단하지 않아요. 토마토리조또의 치즈·고기 등 선택 재료는 임의로 더하지 않아요.</p><div class="stateLegend">'+Object.keys(stateTotals).map(k=>'<span class="stateTag '+k+'">'+statusNames[k]+' '+stateTotals[k]+'끼</span>').join('')+'</div>'+(legacyDays?'<p class="muted">이전 버전의 하루 전체 기록 '+legacyDays+'일도 함께 반영했어요. 끼니 수에는 합산하지 않았어요.</p>':'')+Object.keys(names).map(k=>'<div class="nutriRow" data-nutrient="'+k+'"><div class="nutriTop"><b>'+names[k]+'</b><span>7일 중 '+actual.scores[k]+'일</span></div><div class="nutriTrack"><div class="nutriFill '+k+'" style="width:'+actual.scores[k]/7*100+'%"></div></div><p class="nutriFoods">'+esc(actual.foods[k].join(' · ')||'아직 확인된 식품이 없어요')+'</p></div>').join('')+(unknown.length?'<p class="muted">음식명만으로 구성을 분류하지 못했어요: '+esc(unknown.join(' · '))+'</p>':'')+other('school')+other('planned')+'</section>';
 }
 function renderAll(){renderHome();renderSuggestions();renderPlans();renderRecords();}
 function editorRows(){
   $('editorItems').innerHTML=editing.items.map((item,i)=>'<div class="editorRow"><label for="dish-'+esc(item.id)+'">메뉴 '+(i+1)+'</label><input id="dish-'+esc(item.id)+'" data-dish-id="'+esc(item.id)+'" value="'+esc(item.name)+'" list="dishOptions" maxlength="200" required><button type="button" class="btn" data-remove="'+esc(item.id)+'" aria-label="'+esc(item.name||'메뉴')+' 삭제">삭제</button></div>').join('');
 }
 function collect(){for(const input of $('editorItems').querySelectorAll('input'))editing.items.find(x=>x.id===input.dataset.dishId).name=input.value.trim();}
 function openEditor(date,slot,kind){
   const m=ME.timeline(date).find(x=>x.slot===slot);
   editing={date,slot,kind,items:structuredClone(kind==='actual'&&m.actual?m.actual.items:m.plan.items)};
   $('editorTitle').textContent=(date===MN.sessionDate?'오늘':date)+' '+m.label+' '+(kind==='actual'?'먹은 메뉴':'식사 플랜');
   $('editorError').textContent='';editorRows();$('mealEditor').showModal();
 }
 $('closeEditor').onclick=()=>$('mealEditor').close();
 $('addDish').onclick=()=>{collect();editing.items.push({id:MN.uid(),name:''});editorRows();$('editorItems').lastElementChild.querySelector('input').focus();};
 $('editorItems').onclick=e=>{const b=e.target.closest('[data-remove]');if(b){collect();editing.items=editing.items.filter(x=>x.id!==b.dataset.remove);editorRows();}};
 $('editorForm').onsubmit=e=>{
   e.preventDefault();collect();
   try{if(editing.items.some(x=>!x.name))throw Error('음식 이름을 입력하거나 빈 항목을 삭제해 주세요.');ME.edit(editing.date,editing.slot,editing.kind,editing.items);$('mealEditor').close();notify('저장했어요.');}catch(error){$('editorError').textContent=error.message;}
 };
 $('dishOptions').innerHTML=Object.keys(ME.catalog).map(x=>'<option value="'+esc(x)+'"></option>').join('');
 $('recordDate').onchange=e=>{if(/^\d{4}-\d{2}-\d{2}$/.test(e.target.value)){selected=e.target.value;renderRecords();}};
 $('prevDate').onclick=()=>{selected=MN.dateKey(-1,new Date(selected+'T12:00:00'));renderRecords();};
 $('nextDate').onclick=()=>{selected=MN.dateKey(1,new Date(selected+'T12:00:00'));renderRecords();};
 $('recordToday').onclick=()=>{selected=MN.sessionDate;renderRecords();};
 document.addEventListener('click',e=>{
   const choice=e.target.closest('[data-choice]');if(choice){try{PN.choose(MN.sessionDate,choice.dataset.choice);notify('오늘 저녁으로 골랐어요. 준비할 일도 반영했어요.');showView('home');}catch(error){notify(error.message);}return;}
   const nav=e.target.closest('[data-open]');if(nav){showView(nav.dataset.open);return;}
   const b=e.target.closest('[data-action]');if(!b)return;
   const {action,date,slot}=b.dataset;
   try{
     if(action==='moreOptions'){const count=PN.options().length;optionOffset=optionOffset+3>=count?0:optionOffset+3;renderSuggestions();$('suggestions').scrollIntoView({block:'start'});}
     if(action==='openMeal'){showView('plan');document.querySelector('.upcoming').open=true;document.querySelector('[data-plan-date="'+date+'"] [data-plan-meal="'+slot+'"]')?.scrollIntoView();}
     if(action==='toRecord'){selected=MN.sessionDate;showView('records');}
     if(action==='editPlan'||action==='editActual')openEditor(date,slot,action==='editPlan'?'plan':'actual');
     if(action==='ate'){ME.confirm(date,slot);notify('이 끼니를 기록했어요.');}
     if(action==='undoActual')ME.update(s=>{s.days[date].meals[slot].actual=null;});
     if(action==='confirmPlan'||action==='confirmDay')ME.update(s=>{for(const [key,m] of Object.entries(s.days[date].meals))if(m.source==='home'&&(action==='confirmDay'||key===slot))m.plan.confirmed=true;});
     if(action==='doneShopping')ME.update(s=>{s.prepDone??={};for(const t of ME.tasks(s))if(t.type==='shop'){s.prepDone[t.id]=true;(s.shopping[MN.sessionDate]??={})[t.ingredient]=true;}});
     if(action==='done')ME.update(s=>{const task=ME.tasks(s).find(t=>t.id===b.dataset.id);s.prepDone??={};s.prepDone[b.dataset.id]=!task?.done;if(task?.type==='shop')(s.shopping[MN.sessionDate]??={})[task.ingredient]=!task.done;});
     if(action==='homeDay'){ME.update(s=>{s.days[date].home=!s.days[date].home;});generatePlans();}
     if(action==='resetPlan'){ME.update(s=>{const m=s.days[date].meals[slot];m.plan.confirmed=false;m.plan.edited=false;delete m.plan.easy;});generatePlans();}
     if(action==='easy')ME.update(s=>{const m=s.days[date].meals[slot];m.plan={items:ME.items(b.dataset.type),confirmed:true,edited:true,easy:b.dataset.type};});
     if(action==='saveLegacy'){const text=$('legacyText').value;ME.update(s=>{s.days[selected].legacyActual.menu=text;});notify('이전 기록을 수정했어요.');}
   }catch(error){notify(error.message);}
 });
 document.addEventListener('change',e=>{
   try{
     if(e.target.dataset.extra){const key=e.target.dataset.extra,checked=e.target.checked;ME.update(s=>{const d=s.days[selected]??={meals:{}};d.extras??={};d.extras[key]=checked;});}
     if(e.target.dataset.buy){
       const name=e.target.dataset.buy,checked=e.target.checked;
       MN.setShopping(name,checked);
       // A shopping check only marks purchase progress; stock location remains the parent's inventory choice.
       ME.update(s=>{s.prepDone??={};for(const t of ME.tasks(s))if(t.type==='shop'&&t.ingredient===name)s.prepDone[t.id]=checked;});
     }
   }catch(error){notify(error.message);}
 });
 window.addEventListener('mealnote:state',renderAll);
 window.addEventListener('mealnote:render',renderAll);
 renderAll();showView('home');
})();
