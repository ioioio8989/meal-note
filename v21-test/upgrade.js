'use strict';
(()=>{
  const $=id=>document.getElementById(id),esc=MN.escape;
  let pendingBackup=null,installPrompt=null;
  const banner=document.createElement('div');banner.id='saveError';banner.setAttribute('role','alert');banner.hidden=true;document.body.prepend(banner);
  function error(message){banner.textContent=message;banner.hidden=false;}
  window.addEventListener('error',()=>{if(MN.error())error(MN.error());});
  function download(name,text){const a=document.createElement('a');const url=URL.createObjectURL(new Blob([text],{type:'application/json'}));a.href=url;a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);}
  function renderUpgrade(){
    if(MN.error())error(MN.error());
    $('undoRestore').hidden=!MN.hasUndo();
  }
  window.addEventListener('mealnote:state',renderUpgrade);
  $('exportBackup').onclick=()=>download('meal-note-backup-'+MN.sessionDate+'.json',MN.export());
  $('importBackup').onchange=async e=>{try{const file=e.target.files[0];if(!file)return;if(file.size>10000000)throw Error('백업 파일이 너무 커요.');pendingBackup=MN.review(await file.text());$('restoreSummary').textContent=`이 백업의 재료 ${pendingBackup.inventory.length}개와 날짜별 기록 ${Object.keys(pendingBackup.days).length}일로 현재 기록을 교체합니다. 현재 기록은 되돌리기 사본에 보관해요.`;$('restoreReview').hidden=false;}catch(e){error(e.message);}finally{$('importBackup').value='';}};
  $('cancelRestore').onclick=()=>{pendingBackup=null;$('restoreReview').hidden=true;};
  $('confirmRestore').onclick=()=>{if(!pendingBackup)return;try{MN.restore(pendingBackup);location.reload();}catch(e){error('복원하지 못했어요. '+e.message);}};
  $('undoRestore').onclick=()=>{try{MN.undo();location.reload();}catch(e){error(e.message);}};
  window.addEventListener('beforeinstallprompt',e=>{e.preventDefault();installPrompt=e;$('installApp').textContent='MEAL NOTE 설치';});
  $('installApp').onclick=async()=>{if(installPrompt){await installPrompt.prompt();installPrompt=null;}else{$('installHelp').textContent=!window.isSecureContext?'이 미리보기 주소에서는 앱 설치·오프라인 기능을 사용할 수 없어요. 정식 HTTPS 주소에 배포한 뒤 설치해 주세요.':'Android: 브라우저 메뉴에서 앱 설치 또는 홈 화면에 추가. iPhone: Safari 공유 메뉴에서 홈 화면에 추가를 선택해 주세요. 메뉴 표시는 브라우저마다 다릅니다.';}};
  $('persistData').onclick=async()=>{try{const ok=await navigator.storage?.persist?.();$('storageStatus').textContent=ok?'브라우저가 기록 보관 요청을 허용했어요. 직접 데이터 삭제에는 대비할 수 없으므로 백업도 보관해 주세요.':'이 브라우저는 보관 요청을 허용하지 않았어요. 기록 백업 파일을 보관해 주세요.';}catch{error('보관 요청을 처리하지 못했어요. 백업 파일을 보관해 주세요.');}};
  if('serviceWorker'in navigator&&['http:','https:'].includes(location.protocol))navigator.serviceWorker.register('./sw.js').catch(()=>{$('installHelp').textContent='오프라인 준비에 실패했어요. 인터넷 연결에서 계속 사용할 수 있어요.';});
  $('startFamilyTest').onclick=()=>{MN.store.setItem('mealnote.familytest.welcome.v1','1');$('testerWelcome').style.display='none';showView('guide');};
  // Returning users land on today. First-run onboarding is optional and non-blocking.
  showView('home');
  renderUpgrade();
  const params=new URLSearchParams(location.search),requested=params.get('date'),slot=params.get('meal');
  if(requested&&QC.validDate(requested)){
    if(params.get('action')==='plan'&&requested>=MN.sessionDate&&requested<=MN.dateKey(4)){
      showView('plan');document.querySelector('.upcoming').open=true;
      if(ME.slots.includes(slot))document.querySelector('[data-plan-date="'+requested+'"] [data-plan-meal="'+slot+'"]')?.scrollIntoView();
    }else{showView('records');$('recordDate').value=requested;$('recordDate').dispatchEvent(new Event('change'));if(params.get('action')==='record')document.querySelector('#recordContent [data-quick]')?.click();}
  }
  let dateBanner=false;
  function dayChanged(){if(MN.dateKey()!==MN.sessionDate&&!dateBanner){dateBanner=true;error('날짜가 바뀌었어요. 작성 중인 내용은 이전 날짜에 저장됩니다. 저장한 뒤 아래 버튼으로 오늘 식사를 여세요.');const b=document.createElement('button');b.textContent='오늘 식사 열기';b.className='btn';b.onclick=()=>location.reload();banner.append(b);}}
  window.addEventListener('focus',dayChanged);setInterval(dayChanged,30000);
  window.addEventListener('storage',e=>{if(e.key==='mealnote.state.v2')error('다른 창에서 기록이 바뀌었어요. 현재 입력을 복사한 뒤 새로고침해 주세요.');});
})();
