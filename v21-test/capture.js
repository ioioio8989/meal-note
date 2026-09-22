'use strict';
// Local parsing and confirmation. No family data is sent to a recognition service.
window.QC=(()=>{
 const $=id=>document.getElementById(id),esc=MN.escape;
 const slots={아침:'breakfast',점심:'lunch',저녁:'dinner',오전간식:'amSnack',오후간식:'pmSnack',간식:'pmSnack'};
 function parse(text,date){
  let raw=String(text).trim(),errors=[];
  const dates=[...new Set(raw.match(/오늘|어제|내일/g)||[])];
  if(dates.length>1)errors.push('한 번에 하루씩 기록해 주세요. 날짜가 섞여 있어요.');
  if(dates.includes('어제'))date=MN.dateKey(-1);
  if(dates.includes('오늘'))date=MN.sessionDate;
  if(dates.includes('내일')||date>MN.sessionDate)errors.push('실제로 먹은 식사는 오늘 또는 지난 날짜로 기록해 주세요.');
  raw=raw.replace(/오늘|어제/g,'').trim();
  const re=/(오전\s*간식|오후\s*간식|아침|점심|저녁|간식)(?:으로|에는|은|는|에)?\s*[:：—-]?\s*/g;
  const matches=[...raw.matchAll(re)],rows=[];
  if(!matches.length)errors.push('아침·점심·저녁·간식 중 언제 먹었는지 함께 적어 주세요.');
  if(matches.length&&raw.slice(0,matches[0].index).replace(/[\s.,]/g,''))errors.push('끼니 앞의 내용을 분류하지 못했어요. 아침·점심·저녁부터 시작해 주세요.');
  matches.forEach((m,i)=>{
   const label=m[1].replace(/\s/g,''),slot=slots[label];
   let food=raw.slice(m.index+m[0].length,matches[i+1]?.index??raw.length).trim()
    .replace(/(?:을|를)?\s*(?:먹었고|먹었어요|먹었어|먹었습니다|먹음|먹고|먹었다|먹은)(?:요)?[\s.,!]*$/,'')
    .replace(/^[\s.,]+|[\s.,]+$/g,'').trim();
   if(!food)errors.push(label+'에 먹은 음식이 비어 있어요.');
   if(/^(?:안|못)$|안\s*먹|못\s*먹|먹지|안먹|빼고|말고|않|아니/.test(food))errors.push(label+' 내용에 부정·제외 표현이 있어요. 실제 먹은 음식 이름만 남겨 주세요.');
   const existing=rows.find(r=>r.slot===slot);
   if(existing)existing.text+=' · '+food;else rows.push({slot,text:food,ambiguous:label==='간식'});
  });
  return {date,rows,errors};
 }
 function validDate(date){return /^\d{4}-\d{2}-\d{2}$/.test(date)&&!isNaN(new Date(date+'T12:00:00'))&&MN.dateKey(0,new Date(date+'T12:00:00'))===date;}
 function schoolParse(text,year){
  const rows=[],errors=[];
  String(text).trim().split(/\n/).filter(x=>x.trim()).forEach((line,i)=>{
   const m=line.trim().match(/^(?:(\d{4})[-/.])?(\d{1,2})[-/.](\d{1,2})(?:\s*\([월화수목금토일]\))?\s*(.*)$/);
   if(!m){errors.push((i+1)+'번째 줄: 날짜를 9/22 또는 2026-09-22 형식으로 적어 주세요.');return;}
   const date=(m[1]||year)+'-'+m[2].padStart(2,'0')+'-'+m[3].padStart(2,'0');
   if(!validDate(date)){errors.push((i+1)+'번째 줄: 실제 달력에 없는 날짜예요.');return;}
   if(rows.some(r=>r.date===date)){errors.push(date+'가 중복되었어요. 한 줄로 합쳐 주세요.');return;}
   const body=m[4].replace(/^\s*\|\s*/,'');let parts;
   if(body.includes('|')||body.includes('\t')){const columns=body.split(/\||\t/).map(x=>x.trim());if(columns.length!==3){errors.push(date+': 오전간식 | 점심 | 오후간식의 세 칸을 확인해 주세요.');return;}parts={amSnack:columns[0],lunch:columns[1],pmSnack:columns[2]};}
   else parts=ME.schoolParts(body);
   if(!Object.values(parts).some(Boolean)){errors.push(date+': 식단이 비어 있어요.');return;}
   rows.push({date,...parts});
  });
  if(!rows.length&&!errors.length)errors.push('받은 식단 내용을 붙여넣어 주세요.');
  return {rows,errors};
 }
 const dialog=document.createElement('dialog');dialog.id='quickDialog';dialog.innerHTML='<div class="editorHead"><h2>먹은 것, 한 번에</h2><button class="textbtn" id="closeQuick">닫기</button></div><label class="fieldLabel" for="quickDate">기록 날짜</label><input type="date" id="quickDate"><label class="fieldLabel" for="quickText">언제 무엇을 먹었나요?</label><textarea id="quickText" maxlength="4000" placeholder="오늘 아침 돼지국밥 먹었고 간식으로 바나나 먹었어. 저녁은 토마토리조또."></textarea><div class="captureTools"><button class="textbtn" id="localVoice">말해서 입력</button><span id="voiceStatus" class="muted" role="status">입력 내용은 기기 안에서 정리해요.</span></div><button class="btn primary full" id="parseQuick">기록할 내용 확인</button><p id="quickError" role="alert"></p><div id="quickReview" hidden></div>';
 document.body.append(dialog);let draft=null,recognition=null;
 function stopVoice(){recognition?.abort();recognition=null;}
 $('closeQuick').onclick=()=>{stopVoice();dialog.close();};dialog.addEventListener('close',stopVoice);
 document.addEventListener('click',e=>{const b=e.target.closest('[data-quick]');if(!b)return;$('quickDate').value=b.dataset.date||MN.sessionDate;$('quickDate').max=MN.sessionDate;$('quickError').textContent='';dialog.showModal();});
 function invalidate(){draft=null;$('quickReview').hidden=true;$('parseQuick').hidden=false;}
 $('quickText').oninput=invalidate;$('quickDate').onchange=invalidate;
 $('parseQuick').onclick=()=>{
  draft=parse($('quickText').value,$('quickDate').value);
  if(!validDate(draft.date))draft.errors.push('기록 날짜를 선택해 주세요.');
  $('quickError').textContent=draft.errors.join(' ');if(draft.errors.length)return;
  $('quickDate').value=draft.date;
  const old=MN.snapshot().days[draft.date]?.meals||{},over=draft.rows.filter(r=>old[r.slot]?.actual);
  $('quickReview').innerHTML='<h3>'+esc(draft.date)+' · 이렇게 기록해요</h3>'+draft.rows.map((r,i)=>'<div class="quickReviewRow"><select aria-label="끼니 '+(i+1)+'" data-quick-slot="'+i+'">'+Object.entries(ME.labels).map(([key,label])=>'<option value="'+key+'" '+(key===r.slot?'selected':'')+'>'+label+'</option>').join('')+'</select><input aria-label="먹은 음식 '+(i+1)+'" maxlength="500" data-quick-food="'+i+'" value="'+esc(r.text)+'">'+(r.ambiguous?'<small>시간 없는 간식은 오후로 넣었어요. 위에서 바꿀 수 있어요.</small>':'')+'</div>').join('')+'<p class="muted">'+(over.length?'기존 '+over.map(r=>ME.labels[r.slot]).join(' · ')+' 기록을 바꿉니다. ':'')+'확인한 끼니만 저장하고 다른 끼니는 유지해요.</p><label class="replaceCheck"><input id="quickReplace" type="checkbox"> 이미 기록한 끼니가 있으면 이 내용으로 바꾸기</label><button class="btn primary full" id="saveQuick">이대로 기록</button>';
  $('quickReview').hidden=false;$('parseQuick').hidden=true;
  $('saveQuick').onclick=()=>{
   try{
    const rows=draft.rows.map((r,i)=>({slot:dialog.querySelector('[data-quick-slot="'+i+'"]').value,text:dialog.querySelector('[data-quick-food="'+i+'"]').value.trim()}));
    if(rows.some(r=>!r.text))throw Error('먹은 음식이 비어 있어요.');
    if(new Set(rows.map(r=>r.slot)).size!==rows.length)throw Error('같은 끼니를 두 번 골랐어요. 음식들을 한 칸에 합쳐 주세요.');
    const current=MN.snapshot().days[draft.date]?.meals||{};
    if(rows.some(r=>current[r.slot]?.actual)&&!$('quickReplace').checked)throw Error('이미 기록한 끼니가 있어요. 바꾸기 확인을 선택해 주세요.');
    ME.update(s=>{const d=s.days[draft.date]??={meals:{},extras:{}};d.meals??={};for(const r of rows){const m=d.meals[r.slot]??={source:'home',plan:{items:[],confirmed:false},actual:null};m.actual={items:ME.items(r.text),savedAt:new Date().toISOString()};}});
    const date=draft.date;dialog.close();$('quickText').value='';invalidate();showView('records');$('recordDate').value=date;$('recordDate').dispatchEvent(new Event('change'));
   }catch(e){$('quickError').textContent=e.message;}
  };
 };
 $('localVoice').onclick=async()=>{
  const R=window.SpeechRecognition||window.webkitSpeechRecognition;
  try{
   if(recognition){recognition.stop();return;}
   if(!R||!('processLocally'in R.prototype)||typeof R.available!=='function')throw Error('이 브라우저는 외부 전송 없는 음성을 지원하지 않아요. 위 칸에 입력해 주세요.');
   const availability=await R.available({langs:['ko-KR'],processLocally:true});
   if(availability!=='available')throw Error('기기에 한국어 음성 인식이 준비되지 않았어요. 텍스트 입력을 이용해 주세요.');
   const r=recognition=new R();r.lang='ko-KR';r.processLocally=true;r.interimResults=false;r.continuous=false;
   r.onresult=e=>{$('quickText').value+=($('quickText').value?' ':'')+e.results[0][0].transcript;invalidate();$('voiceStatus').textContent='들은 내용을 확인해 주세요.';};
   r.onerror=e=>{$('voiceStatus').textContent=e.error==='not-allowed'?'마이크 권한이 없어 시작하지 못했어요.':'음성을 듣지 못했어요. 다시 시도하거나 입력해 주세요.';};
   r.onend=()=>{recognition=null;$('localVoice').textContent='말해서 입력';};
   r.start();$('localVoice').textContent='듣기 마치기';$('voiceStatus').textContent='기기 안에서 듣고 있어요.';
  }catch(e){recognition=null;$('voiceStatus').textContent=e.message;}
 };
 // Institution import is an occasional batch task, not a primary navigation tab.
 $('schoolMount').innerHTML='<p class="muted">받은 식단의 텍스트를 한 번 붙여넣고, 날짜별로 확인해 주세요.</p><div class="schoolTools"><label>기준 연도 <input id="schoolYear" type="number" min="2000" max="2100" value="'+new Date().getFullYear()+'"></label><button class="textbtn" id="photoReference">사진 참고</button><input type="file" accept="image/*" id="schoolPhoto" hidden></div><p class="muted" id="photoNotice">사진 자동 읽기는 아직 지원하지 않아요. 사진만 받았다면 휴대폰의 텍스트 복사 기능을 이용할 수 있어요.</p><img id="schoolPhotoPreview" alt="참고용 기관 식단표" hidden><label class="fieldLabel" for="schoolBatch">여러 날짜의 식단</label><textarea id="schoolBatch" maxlength="50000" placeholder="9/22 오전 바나나 / 점심 쌀밥, 소불고기 / 오후 우유&#10;9/23 오전 사과 / 점심 카레라이스 / 오후 고구마"></textarea><details class="formatHelp"><summary>붙여넣기 형식 보기</summary><p>한 줄에 하루씩: 날짜 오전 … / 점심 … / 오후 …</p><p>표는 날짜 | 오전간식 | 점심 | 오후간식 형식도 가능해요. 빈 칸은 간식 없음으로 저장해요. 점심만 적으면 점심으로 분류해요.</p></details><button class="btn primary full" id="reviewSchool">날짜별로 확인</button><p id="schoolError" role="alert"></p><div id="schoolReview" hidden></div><details class="savedSchool"><summary>저장한 식단 확인 · 하루 수정</summary><input type="date" id="schoolEditDate" aria-label="수정할 기관 식단 날짜"><button class="btn" id="loadSchoolDay">불러오기</button><div id="savedSchoolList"></div></details>';
 let schoolDraft=null,photoURL=null;
 $('photoReference').onclick=()=>$('schoolPhoto').click();
 $('schoolPhoto').onchange=e=>{const file=e.target.files[0];if(!file)return;if(photoURL)URL.revokeObjectURL(photoURL);photoURL=URL.createObjectURL(file);$('schoolPhotoPreview').src=photoURL;$('schoolPhotoPreview').hidden=false;$('photoNotice').textContent='사진은 이 화면에서 참고용으로만 보여요. 자동 인식·저장·외부 전송하지 않아요.';};
 function schoolPreview(rows){
  schoolDraft=rows;
  const count=rows.filter(r=>MN.snapshot().days[r.date]?.school).length;
  $('schoolReview').innerHTML='<h3>'+rows.length+'일 식단 확인</h3>'+rows.map((r,i)=>'<fieldset class="schoolReviewDay"><legend>'+esc(r.date)+'</legend>'+['amSnack','lunch','pmSnack'].map(slot=>'<label>'+ME.labels[slot]+'<input data-school-row="'+i+'" data-school-slot="'+slot+'" value="'+esc(r[slot])+'" maxlength="2000"></label>').join('')+'</fieldset>').join('')+(count?'<p class="warning">기존 '+count+'일의 기관 예정 메뉴를 바꿉니다. 실제 먹은 기록은 유지해요.</p>':'')+'<button class="btn primary full" id="saveSchoolBatch">'+rows.length+'일 '+(count?'확인하고 반영':'식단 저장')+'</button>';
  $('schoolReview').hidden=false;
  $('saveSchoolBatch').onclick=()=>{try{
   const values=schoolDraft.map((r,i)=>({...r,...Object.fromEntries(['amSnack','lunch','pmSnack'].map(slot=>[slot,$('schoolReview').querySelector('[data-school-row="'+i+'"][data-school-slot="'+slot+'"]').value.trim()]))}));
   ME.update(s=>{for(const r of values){const d=s.days[r.date]??={meals:{},extras:{}};d.school='오전 '+r.amSnack+' / 점심 '+r.lunch+' / 오후 '+r.pmSnack;d.meals??={};const enabled=(s.profile?.institutionMeals||'있음')==='있음'&&!d.home;
    if(enabled){d.institutionEnabled=true;for(const slot of ['amSnack','lunch','pmSnack']){const old=d.meals[slot];d.meals[slot]={source:old?.actual?old.source:'school',plan:{items:ME.items(r[slot]),confirmed:true},actual:old?.actual||null};}}
   }});
   generatePlans();$('schoolReview').hidden=true;$('schoolError').textContent=values.length+'일 식단을 저장했어요.';renderSavedSchool();
  }catch(e){$('schoolError').textContent=e.message;}};
 }
 $('reviewSchool').onclick=()=>{const year=$('schoolYear').value,result=schoolParse($('schoolBatch').value,year);if(!/^20\d{2}$|^2100$/.test(year))result.errors.push('기준 연도를 확인해 주세요.');$('schoolError').textContent=result.errors.join(' ');$('schoolReview').hidden=true;if(!result.errors.length)schoolPreview(result.rows);};
 $('schoolBatch').oninput=()=>$('schoolReview').hidden=true;$('schoolYear').oninput=()=>$('schoolReview').hidden=true;
 $('schoolEditDate').value=MN.sessionDate;
 $('loadSchoolDay').onclick=()=>{const date=$('schoolEditDate').value;if(!validDate(date))return;schoolPreview([{date,...ME.schoolParts(MN.snapshot().days[date]?.school||'')}]);};
 function renderSavedSchool(){$('savedSchoolList').innerHTML=Object.entries(MN.snapshot().days).filter(([,d])=>d.school).sort(([a],[b])=>b.localeCompare(a)).map(([date,d])=>'<p><b>'+date+'</b> '+esc(d.school)+'</p>').join('')||'<p class="muted">저장한 기관 식단이 없어요.</p>';}
 renderSavedSchool();
 // Reduce inventory to search, existing items, and one onward action.
 const card=ingredientSearch.closest('.section');card?.classList.add('inventoryCard');
 if(card){
  const intro=document.querySelector('#input>.section');if(intro!==card)intro.hidden=true;
  card.querySelector('h3').textContent='우리집에 있는 재료';card.querySelector(':scope > p').textContent='있는 재료를 고르면 오늘 메뉴까지 이어져요.';
  const stock=$('ingredientChips').parentElement;card.querySelector('.storeTabs').before(stock);
  const picker=$('guidedPicker'),details=document.createElement('details');details.className='inventoryBrowse';details.innerHTML='<summary>기본 재료 목록에서 고르기</summary>';picker.before(details);details.append(picker);
  $('ingredientSearch').addEventListener('input',()=>{details.open=!!$('ingredientSearch').value;});
  $('ingredientSearchHint').textContent='검색한 이름을 그대로 추가할 수 있어요.';
  $('ingredientInput').parentElement.parentElement.hidden=true;
  $('ingredientFile').previousElementSibling.hidden=true;
  const go=document.createElement('button');go.className='btn primary full inventoryNext';go.dataset.open='plan';go.textContent='이 재료로 메뉴 고르기';stock.after(go);
  const schoolLink=document.createElement('button');schoolLink.className='textbtn full';schoolLink.dataset.open='school';schoolLink.textContent='받은 기관 식단 등록 · 수정';card.append(schoolLink);
  document.querySelectorAll('.storeTab').forEach(b=>b.textContent=b.dataset.store);
 }
 return {parse,schoolParse,validDate};
})();

