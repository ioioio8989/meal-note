'use strict';
// One dated document; legacy keys are read-only migration inputs.
window.MN=(()=>{
  const KEY='mealnote.state.v2',UNDO='mealnote.restore.previous.v2';
  const fields={
    'mealnote.schoolMeals':'school', 'mealnote.customMeals.v1':'custom',
    'mealnote.easyMeals.v1':'easy','mealnote.actualMeals.v1':'actual',
    'mealnote.homeAllDay.v1':'home'
  };
  const globals={'mealnote.childProfile':'profile','mealnote.ingredients.v3':'inventory','mealnote.familytest.welcome.v1':'welcome'};
  const escape=x=>String(x??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const uid=()=>typeof crypto.randomUUID==='function'?crypto.randomUUID():Array.from(crypto.getRandomValues(new Uint8Array(16)),b=>b.toString(16).padStart(2,'0')).join('');
  function dateKey(offset=0,base=new Date()){
    const d=new Date(base);d.setDate(d.getDate()+offset);
    return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
  }
  const sessionDate=dateKey();
  const dateFor=day=>dateKey(day==='tomorrow'?1:0,new Date(sessionDate+'T12:00:00'));
  let storageError='',blocked=false;
  function raw(key){try{return localStorage.getItem(key);}catch(e){storageError='이 브라우저에서 저장 공간을 사용할 수 없어요. 입력 내용은 새로고침 전에 백업해 주세요.';return null;}}
  const empty=()=>({schemaVersion:2,revision:0,updatedAt:null,profile:null,inventory:[],days:{},tasks:{},shopping:{},welcome:null,migration:{date:sessionDate,legacy:{},warnings:[]}});
  const object=x=>x!==null&&typeof x==='object'&&!Array.isArray(x);
  function valid(s){
    if(!object(s)||![2,3].includes(s.schemaVersion)||!Number.isInteger(s.revision)||!Array.isArray(s.inventory)||!object(s.days)||!object(s.tasks)||!object(s.shopping))throw Error('지원하지 않거나 손상된 백업 형식입니다.');
    if(s.profile!==null&&!object(s.profile))throw Error('아이 정보 형식을 확인해 주세요.');
    const text=x=>typeof x==='string'&&x.length<=50000;
    if(s.profile&&Object.values(s.profile).some(x=>!text(x)&&typeof x!=='number'))throw Error('아이 정보가 올바르지 않아요.');
    if(s.inventory.some(x=>!object(x)||!text(x.name)||!['냉장','냉동','상온'].includes(x.cat)||!['number','string'].includes(typeof x.id)))throw Error('재료 목록 형식이 올바르지 않아요.');
    for(const [date,d] of Object.entries(s.days)){
      if(!/^\d{4}-\d{2}-\d{2}$/.test(date)||!object(d))throw Error('날짜 기록 형식이 올바르지 않아요.');
      if(d.school!==undefined&&!text(d.school)||d.custom!==undefined&&!text(d.custom))throw Error('식단 형식이 올바르지 않아요.');
      if(d.home!==undefined&&typeof d.home!=='boolean')throw Error('기관 설정 형식이 올바르지 않아요.');
      if(d.preferred!==undefined&&(!Array.isArray(d.preferred)||!d.preferred.every(text)))throw Error('우선 재료 형식이 올바르지 않아요.');
      if(d.easy!==undefined&&(!object(d.easy)||!text(d.easy.type)||!text(d.easy.menu)))throw Error('간편 식사 형식이 올바르지 않아요.');
      if(d.actual!==undefined&&d.actual!==null&&(!object(d.actual)||!text(d.actual.menu)||typeof d.actual.fruit!=='boolean'||typeof d.actual.dairy!=='boolean'))throw Error('실제 식사 형식이 올바르지 않아요.');
      if(d.plan!==undefined&&(!object(d.plan)||!['breakfast','lunch','dinner'].every(k=>d.plan[k]==null||object(d.plan[k])&&text(d.plan[k].title))))throw Error('계획 형식이 올바르지 않아요.');
      if(d.meals!==undefined){
        if(!object(d.meals))throw Error('끼니 기록 형식이 올바르지 않아요.');
        for(const [slot,m] of Object.entries(d.meals)){
          if(!['breakfast','amSnack','lunch','pmSnack','dinner'].includes(slot)||!object(m)||!['home','school'].includes(m.source))throw Error('끼니 출처를 확인해 주세요.');
          for(const kind of ['plan','actual'])if(m[kind]!=null){const v=m[kind];if(!object(v)||!Array.isArray(v.items)||v.items.length>100||!v.items.every(x=>object(x)&&text(x.id)&&text(x.name)))throw Error('음식 항목 형식이 올바르지 않아요.');}
          if(m.plan&&typeof m.plan.confirmed!=='boolean')throw Error('식사 확정 상태를 확인해 주세요.');
        }
      }
    }
    for(const [id,t] of Object.entries(s.tasks)){
      if(!object(t)||t.id!==id||!['date','action','reason','window','deepLink'].every(k=>text(t[k]))||!/^\?date=\d{4}-\d{2}-\d{2}&meal=(lunch|dinner)$/.test(t.deepLink)||typeof t.done!=='boolean')throw Error('준비 기록 형식이 올바르지 않아요.');
    }
    if(JSON.stringify(s).includes('"__proto__"')||JSON.stringify(s).includes('"constructor"'))throw Error('허용하지 않는 데이터 항목입니다.');
    return s;
  }
  function parseLegacy(key,fallback){
    const value=raw(key);if(value===null)return fallback;
    state.migration.legacy[key]=value;
    try{return JSON.parse(value);}catch{state.migration.warnings.push(key+' 형식 오류: 원문 보존');return fallback;}
  }
  let state=empty();
  const saved=raw(KEY);
  if(saved){
    try{state=valid(JSON.parse(saved));}catch{blocked=true;storageError='저장된 기록을 읽지 못했어요. 원본을 덮어쓰지 않았습니다. 백업 파일을 저장하거나 정상 백업을 불러와 주세요.';}
  }else{
    const profile=parseLegacy('mealnote.childProfile',null);state.profile=object(profile)?Object.fromEntries(Object.entries(profile).filter(([,v])=>typeof v==='string'||typeof v==='number')):null;
    const inventory=parseLegacy('mealnote.ingredients.v3',[]);state.inventory=Array.isArray(inventory)?inventory.filter(x=>object(x)&&typeof x.name==='string'&&['냉장','냉동','상온'].includes(x.cat)).map((x,i)=>({...x,id:x.id??'legacy-'+i})):[];
    for(const [key,field] of Object.entries(fields)){
      const pair=parseLegacy(key,{});
      for(const day of ['today','tomorrow']){
        const d=state.days[dateFor(day)]??={};const value=pair?.[day];
        if(value!==undefined){
          if(['school','custom'].includes(field))d[field]=typeof value==='string'?value:'';
          if(field==='home')d.home=!!value;
          if(field==='easy')d.easy={type:typeof value?.type==='string'?value.type:'',menu:typeof value?.menu==='string'?value.menu:''};
          if(field==='actual'&&object(value)&&typeof value.menu==='string')d.actual={...value,fruit:!!value.fruit,dairy:!!value.dairy};
        }
      }
    }
    const preferred=parseLegacy('mealnote.preferred.today.v1',[]);
    (state.days[sessionDate]??={}).preferred=Array.isArray(preferred)?preferred.filter(x=>typeof x==='string'):[];
    state.welcome=raw('mealnote.familytest.welcome.v1');
    state.migration.warnings.push('이전 버전 today/tomorrow에는 날짜가 없어 처음 옮긴 날짜를 기준으로 연결했습니다.');
    try{localStorage.setItem(KEY,JSON.stringify(state));}catch{storageError='기기에 저장하지 못했어요. 새로고침 전에 백업해 주세요.';}
  }
  function announce(){window.dispatchEvent(new Event('mealnote:state'));}
  function commit(next){
    if(blocked)throw Error(storageError);
    valid(next);
    const disk=raw(KEY);
    if(disk&&JSON.parse(disk).revision!==state.revision){storageError='다른 창에서 기록이 바뀌었어요. 현재 입력을 복사한 뒤 새로고침해 주세요.';announce();throw Error(storageError);}
    next.revision=state.revision+1;next.updatedAt=new Date().toISOString();
    try{localStorage.setItem(KEY,JSON.stringify(next));}catch{storageError='저장 공간이 부족하거나 차단되어 저장하지 못했어요. 기존 저장 기록은 그대로이며 입력을 복사해 주세요.';announce();throw Error(storageError);}
    state=next;storageError='';announce();
  }
  function mutate(fn){const next=structuredClone(state);fn(next);if(JSON.stringify(next)!==JSON.stringify(state))commit(next);}
  const store={
    getItem(key){
      if(globals[key]){const v=state[globals[key]];return v==null?null:key.includes('welcome')?v:JSON.stringify(v);}
      if(fields[key])return JSON.stringify(Object.fromEntries(['today','tomorrow'].map(day=>[day,state.days[dateFor(day)]?.[fields[key]]])));
      if(key==='mealnote.preferred.today.v1')return JSON.stringify(state.days[sessionDate]?.preferred||[]);
      return null;
    },
    setItem(key,value){
      const v=key.includes('welcome')?value:JSON.parse(value);
      mutate(s=>{
        if(globals[key])s[globals[key]]=v;
        else if(fields[key])for(const day of ['today','tomorrow'])(s.days[dateFor(day)]??={})[fields[key]]=v[day];
        else if(key==='mealnote.preferred.today.v1')(s.days[sessionDate]??={}).preferred=v;
        else throw Error('Unknown state key');
      });
    }
  };
  return {
    update:mutate,
    store,dateKey,dateFor,sessionDate,escape,uid,
    snapshot:()=>structuredClone(state),error:()=>storageError,
    tasks:()=>Object.values(state.tasks).filter(t=>t.date>=sessionDate&&t.date<=dateFor('tomorrow')).sort((a,b)=>a.date.localeCompare(b.date)),
    complete(id){mutate(s=>{if(s.tasks[id])s.tasks[id].done=!s.tasks[id].done;});},
    shoppingChecked:item=>!!state.shopping[sessionDate]?.[item],
    setShopping(item,checked){mutate(s=>{(s.shopping[sessionDate]??={})[item]=checked;});},
    recentMeals:()=>Object.entries(state.days).filter(([date])=>date<sessionDate&&date>=dateKey(-7)).sort(([a],[b])=>a.localeCompare(b)).map(([,d])=>Object.values(d.meals||{}).filter(m=>m.actual).map(m=>m.actual.items.map(x=>x.name).join(' · ')).join(' / ')||d.legacyActual?.menu||d.actual?.menu||d.plan?.dinner?.title).filter(Boolean).slice(-7),
    export:()=>JSON.stringify({format:'mealnote-backup',exportedAt:new Date().toISOString(),state,unreadableOriginal:blocked?saved:undefined},null,2),
    review(text){if(text.length>10000000)throw Error('백업 파일이 너무 커요.');const data=JSON.parse(text);if(data.format!=='mealnote-backup')throw Error('MEAL NOTE 백업 파일을 선택해 주세요.');return structuredClone(valid(data.state));},
    restore(next){valid(next);localStorage.setItem(UNDO,raw(KEY)||JSON.stringify(state));const replacement=structuredClone(next);replacement.revision=state.revision+1;replacement.updatedAt=new Date().toISOString();localStorage.setItem(KEY,JSON.stringify(replacement));state=replacement;blocked=false;},
    undo(){const previous=raw(UNDO);if(!previous)throw Error('되돌릴 기록이 없어요.');this.restore(valid(JSON.parse(previous)));},
    hasUndo:()=>!!raw(UNDO)
  };
})();
