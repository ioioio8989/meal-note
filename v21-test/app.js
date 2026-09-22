'use strict';
const esc=MN.escape;
const headerTitle=document.getElementById('headerTitle');

  function previewFile(input, boxId, imgId, statusId, text){
    const file=input.files?.[0];
    if(!file) return;
    const url=URL.createObjectURL(file);
    document.getElementById(imgId).src=url;
    document.getElementById(boxId).style.display='block';
    if(statusId) document.getElementById(statusId).textContent=text;
  }


  let childActivity='보통';

  // 2025 KDRI prototype values used here:
  // 3–5 y: energy 1400 kcal, protein 25 g, calcium 550 mg
  // 6–8 y: energy male 1700 / female 1500 kcal, protein 35 g
  // Calcium is displayed as 700 mg for 6–8 y in this prototype.
  const kdri = {
    "3-5": {
      male:{energy:1400, protein:25, calcium:550},
      female:{energy:1400, protein:25, calcium:550}
    },
    "6-8": {
      male:{energy:1700, protein:35, calcium:700},
      female:{energy:1500, protein:35, calcium:700}
    }
  };

  document.querySelectorAll('.activity').forEach(btn=>{
    btn.addEventListener('click',()=>{
      document.querySelectorAll('.activity').forEach(x=>x.classList.remove('active'));
      btn.classList.add('active');
      childActivity=btn.dataset.act;
    });
  });

  const savedProfile=JSON.parse(MN.store.getItem('mealnote.childProfile') || 'null');
  if(savedProfile){
    document.getElementById('childSex').value=savedProfile.sex || '남자';
    document.getElementById('childBirth').value=savedProfile.birth || '';
    document.getElementById('childHeight').value=savedProfile.height || '';
    document.getElementById('childWeight').value=savedProfile.weight || '';
    document.getElementById('mealStage').value=savedProfile.mealStage || '유아식';
    document.getElementById('saltPreference').value=savedProfile.saltPreference || '일반';
    document.getElementById('institutionMeals').value=savedProfile.institutionMeals || '있음';
    childActivity=savedProfile.activity || '보통';
    document.querySelectorAll('.activity').forEach(x=>x.classList.toggle('active',x.dataset.act===childActivity));
  }

  function getAge(){
    const birth=document.getElementById('childBirth').value;
    if(!birth) return null;
    const b=new Date(birth+'T00:00:00');
    const now=new Date();
    let months=(now.getFullYear()-b.getFullYear())*12+(now.getMonth()-b.getMonth());
    if(now.getDate()<b.getDate()) months--;
    if(months<0) return null;
    return {months, years:Math.floor(months/12), rem:months%12};
  }

  function nutritionGroup(ageYears){
    if(ageYears>=3 && ageYears<=5) return "3-5";
    if(ageYears>=6 && ageYears<=8) return "6-8";
    return null;
  }

  function displayAge(){
    const birth=document.getElementById('childBirth')?.value;
    if(!birth) return null;
    const y=parseInt(birth.slice(0,4),10);
    return new Date().getFullYear()-y+1;
  }

  function currentGuideHeader(){
    const age=getAge();
    const shown=displayAge();
    const sex=document.getElementById('childSex')?.value;
    if(!age || !shown) return '우리 아이 하루 식사 기준';
    const sexLabel=sex==='여자'?'여아':'남아';
    return `${shown}세 ${sexLabel} 하루 식사 기준`;
  }

  function updateNutritionGuide(){
    const age=getAge();
    const shown=displayAge();
    const sex=document.getElementById('childSex').value;
    if(!age || !shown){
      document.getElementById('guideTitle').textContent='생년월일을 입력해 주세요';
      ['energyValue','proteinValue','calciumValue','carbRange','fatRange','compareKimbap','compareCake','compareLatte'].forEach(id=>document.getElementById(id).textContent='—');
      return;
    }
    const group=nutritionGroup(age.years);
    const sexKey=sex==='여자'?'female':'male';
    const sexLabel=sex==='여자'?'여아':'남아';

    document.getElementById('guideTitle').textContent=`${shown}세 ${sexLabel} 하루 기준`;
    document.getElementById('guideEyebrow').textContent =
      group ? `DAILY GUIDE · KDRI 만 ${group}세 적용` : `DAILY GUIDE · 만 ${age.years}세 기준`;
    const note=document.getElementById('kdriAgeNote');
    if(note) note.textContent=`${shown}세로 보여드리되, 영양 수치는 실제 만 ${age.years}세 ${age.rem}개월에 해당하는 KDRI ${group ? '만 '+group+'세' : '연령'} 기준을 적용해요.`;
    headerTitle.textContent=currentGuideHeader();

    if(!group || !kdri[group]){
      document.getElementById('energyValue').textContent='연령 기준 확장 예정';
      ['proteinValue','calciumValue','carbRange','fatRange','compareKimbap','compareCake','compareLatte'].forEach(id=>document.getElementById(id).textContent='—');
      return;
    }

    const d=kdri[group][sexKey];
    document.getElementById('energyValue').textContent=`약 ${d.energy.toLocaleString()} kcal`;
    document.getElementById('proteinValue').textContent=`${d.protein} g/일`;
    document.getElementById('calciumValue').textContent=`${d.calcium} mg/일`;

    const carbLow=Math.round(d.energy*.50/4), carbHigh=Math.round(d.energy*.65/4);
    const fatLow=Math.round(d.energy*.15/9), fatHigh=Math.round(d.energy*.30/9);
    document.getElementById('carbRange').textContent=`약 ${carbLow}–${carbHigh} g`;
    document.getElementById('fatRange').textContent=`약 ${fatLow}–${fatHigh} g`;

    document.getElementById('compareKimbap').textContent=`김밥 약 ${(d.energy/430).toFixed(1)}줄`;
    document.getElementById('compareCake').textContent=`조각 케이크 약 ${(d.energy/330).toFixed(1)}개`;
    document.getElementById('compareLatte').textContent=`카페라테 약 ${(d.energy/200).toFixed(1)}잔`;
  }

  function syncInstitutionMealUI(){
    const card=document.getElementById('institutionMealCard');
    if(!card) return;

    const select=document.getElementById('institutionMeals');
    let setting=select?.value || '있음';
    if(!select){
      try{
        const saved=JSON.parse(MN.store.getItem('mealnote.childProfile')||'{}');
        setting=saved.institutionMeals || '있음';
      }catch(e){}
    }

    const noInstitution=setting==='없음';
    card.classList.toggle('off',noInstitution);

    const file=document.getElementById('mealFile');
    const today=document.getElementById('schoolToday');
    const tomorrow=document.getElementById('schoolTomorrow');
    const save=document.getElementById('saveSchoolMeals');
    [file,today,tomorrow,save].forEach(el=>{ if(el) el.disabled=noInstitution; });
  }

  function updateProfileSummary(){
    syncInstitutionMealUI();
    const age=getAge();
    const h=parseFloat(document.getElementById('childHeight').value);
    const w=parseFloat(document.getElementById('childWeight').value);
    const sex=document.getElementById('childSex').value;
    document.getElementById('heightStat').textContent=isFinite(h)?`${h.toFixed(1)} cm`:'—';
    document.getElementById('weightStat').textContent=isFinite(w)?`${w.toFixed(1)} kg`:'—';

    let bmi=null;
    if(isFinite(h)&&isFinite(w)&&h>0){
      bmi=w/((h/100)**2);
      document.getElementById('bmiStat').textContent=bmi.toFixed(1);
    }else document.getElementById('bmiStat').textContent='—';

    if(age){
      document.getElementById('childAgeLabel').textContent=`${displayAge()}세 · 만 ${age.years}세 ${age.rem}개월`;
      const sexEmoji=sex==='여자'?'':'';
      const shown=displayAge();
      const parts=[`${sexEmoji} ${shown}세 (만 ${age.years}세 ${age.rem}개월)`];
      if(isFinite(h)) parts.push(`${h.toFixed(1)}cm`);
      if(isFinite(w)) parts.push(`${w.toFixed(1)}kg`);
      if(bmi) parts.push(`BMI ${bmi.toFixed(1)}`);
      parts.push(`활동량 ${childActivity}`);
      const stage=document.getElementById('mealStage')?.value || '유아식';
      const salt=document.getElementById('saltPreference')?.value || '일반';
      parts.push(stage);
      parts.push(salt==='일반'?'일반 간':salt);
      const inst=document.getElementById('institutionMeals')?.value || '있음';
      parts.push(inst==='있음'?'기관 식사 있음':'집에서 세 끼');
      document.getElementById('profileSummary').textContent=parts.join(' · ');
    }
    updateNutritionGuide();
    if(document.getElementById('guide').classList.contains('active')){
      headerTitle.textContent=currentGuideHeader();
    }
  }

  function collapseProfile(){
    document.getElementById('profileForm').style.display='none';
    document.getElementById('profileSummary').style.display='block';
    document.getElementById('editProfile').style.display='block';
    document.getElementById('profileHeadline').textContent='우리 아이';
    document.getElementById('profileIntro').textContent='저장된 정보를 기준으로 아래 내용을 보여드려요.';
  }

  function expandProfile(){
    document.getElementById('profileForm').style.display='block';
    document.getElementById('profileSummary').style.display='none';
    document.getElementById('editProfile').style.display='none';
    document.getElementById('profileHeadline').textContent='우리 아이 기준으로 볼게요';
    document.getElementById('profileIntro').textContent='생년월일·키·체중·활동량과 평소 식사 방식을 넣으면 아이 기준에 맞춰 보여줘요.';
  }

  document.getElementById('editProfile').addEventListener('click',expandProfile);

  document.getElementById('saveProfile').addEventListener('click',()=>{
    const profile={
      sex:document.getElementById('childSex').value,
      birth:document.getElementById('childBirth').value,
      height:document.getElementById('childHeight').value,
      weight:document.getElementById('childWeight').value,
      activity:childActivity,
      mealStage:document.getElementById('mealStage').value,
      saltPreference:document.getElementById('saltPreference').value,
      institutionMeals:document.getElementById('institutionMeals').value
    };
    MN.store.setItem('mealnote.childProfile',JSON.stringify(profile));
    updateProfileSummary();
    syncInstitutionMealUI();
    document.getElementById('profileStatus').textContent='우리 아이 정보를 저장하고 적용했어요.';
    collapseProfile();
    if(typeof generatePlans==='function') generatePlans();
  });

  ['childBirth','childHeight','childWeight'].forEach(id=>
    document.getElementById(id).addEventListener('input',updateProfileSummary)
  );
  ['childSex','mealStage','saltPreference','institutionMeals'].forEach(id=>
    document.getElementById(id).addEventListener('change',()=>{
      updateProfileSummary();
      if(id==='institutionMeals') syncInstitutionMealUI();
    })
  );

  updateProfileSummary();
  if(savedProfile && savedProfile.birth) collapseProfile();


  let schoolMeals={today:'',tomorrow:'',photo:false};
  try{
    const savedSchool=JSON.parse(MN.store.getItem('mealnote.schoolMeals') || 'null');
    if(savedSchool) schoolMeals={...schoolMeals,...savedSchool};
  }catch(e){}

  const schoolTodayEl=document.getElementById('schoolToday');
  const schoolTomorrowEl=document.getElementById('schoolTomorrow');
  if(schoolTodayEl) schoolTodayEl.value=schoolMeals.today || '';
  if(schoolTomorrowEl) schoolTomorrowEl.value=schoolMeals.tomorrow || '';
  syncInstitutionMealUI();

  const saveSchoolBtn=document.getElementById('saveSchoolMeals');
  if(saveSchoolBtn){
    saveSchoolBtn.addEventListener('click',()=>{
      schoolMeals.today=schoolTodayEl.value.trim();
      schoolMeals.tomorrow=schoolTomorrowEl.value.trim();
      MN.store.setItem('mealnote.schoolMeals',JSON.stringify(schoolMeals));
      document.getElementById('mealStatus').textContent='유치원 식단을 저장했어요. 식사 플랜 추천에 바로 반영돼요.';
      generatePlans();
    });
  }

  document.getElementById('mealFile').addEventListener('change', e=>{
    previewFile(e.target,'mealPreview','mealPreviewImg','mealStatus','식단표 사진이 등록됐어요. 이 프로토타입에서는 자동 인식 대신 아래 칸에 내용을 확인·입력해 주세요.');
    schoolMeals.photo=!!e.target.files?.[0];
    MN.store.setItem('mealnote.schoolMeals',JSON.stringify(schoolMeals));
    generatePlans();
  });

  document.getElementById('ingredientFile').addEventListener('change', e=>{
    previewFile(e.target,'ingredientPreview','ingredientPreviewImg','ingredientStatus','재료 사진이 등록됐어요. 실제 버전에서는 AI가 사진 속 재료 후보를 뽑아주게 만들 수 있어요.');
  });

  const ingredientCatalog = {
    "냉장": {
      "🥩 소고기": ["국거리","불고기용 소고기","다짐육","장조림용","샤브샤브용","등심","안심","채끝","부채살","갈비","양지","우둔살"],
      "🐖 돼지고기": ["삼겹살","목살","앞다리살","뒷다리살","등심","안심","돼지갈비","다진 돼지고기","대패삼겹","항정살","가브리살"],
      "🐓 닭·오리": ["닭가슴살","닭다리살","닭봉","닭윙","닭안심","닭고기","닭다리","닭볶음탕용","훈제오리","오리로스"],
      "🥚 달걀·두부": ["달걀","두부","순두부","유부","메추리알"],
      "🥬 잎·줄기채소": ["대파","쪽파","부추","시금치","깻잎","상추","양배추","배추","청경채","미나리"],
      "🥕 자주 쓰는 채소": ["애호박","감자","고구마","단호박","양파","당근","무","오이","파프리카","피망","브로콜리","콩나물","숙주","연근","우엉","옥수수","콜리플라워"],
      "🍄 버섯": ["느타리버섯","새송이버섯","팽이버섯","표고버섯","양송이버섯"],
      "🥛 유제품": ["우유","요구르트","플레인요거트","슬라이스치즈","모짜렐라치즈"],
      "🍱 반찬·기타": ["김치","햄","소시지","베이컨","어묵","맛살","단무지"]
    },
    "냉동": {
      "🥩 소고기": ["국거리","불고기용 소고기","갈비","샤브샤브용","다짐육","등심","안심","채끝","부채살","양지"],
      "🐖 돼지고기": ["삼겹살","목살","앞다리살","뒷다리살","등심","안심","돼지갈비","대패삼겹","항정살","가브리살","다진 돼지고기"],
      "🐓 닭·오리": ["닭가슴살","닭다리살","닭봉","닭윙","닭안심","닭고기","닭다리","닭볶음탕용","훈제오리","오리로스"],
      "🐟 생선": ["가자미","갈치","고등어","연어","삼치","대구","조기","임연수"],
      "🦐 해산물": ["오징어","새우","낙지","주꾸미","홍합","바지락","꽃게","관자"],
      "🥦 냉동채소": ["브로콜리","시금치","옥수수","완두콩","혼합채소","다진대파","다진마늘","단호박","고구마","감자","연근"],
      "🍗 간편식": ["만두","돈까스","떡갈비","치킨","핫도그","피자"],
      "🍚 밥·면·떡": ["냉동밥","볶음밥","떡국떡","떡볶이떡","우동면","칼국수면"]
    },
    "상온": {
      "🍚 쌀·잡곡": ["쌀","현미","흑미","보리","귀리","찹쌀","잡곡"],
      "🍜 면": ["소면","중면","칼국수면","파스타면","쌀국수면","라면"],
      "🥫 통조림": ["참치캔","야채참치","스팸","옥수수캔","완두콩캔","고등어캔"],
      "🐟 건어물·해조류": ["잔멸치","국물멸치","김","김가루","미역","다시마","건새우","황태채"],
      "🥔 실온채소": ["감자","고구마","양파","마늘","단호박","연근","우엉","옥수수"],
      "🥣 아침·간식": ["시리얼","오트밀","식빵","또띠아","크래커","견과류"],
      "🫘 콩·기타": ["콩","렌틸콩","참깨","들깨가루"]
    }
  };

  let ingredients=[];
  try{
    const migratedIngredients=JSON.parse(MN.store.getItem('mealnote.ingredients.v3') || 'null');
    if(Array.isArray(migratedIngredients)) ingredients=migratedIngredients;
  }catch(e){
    ingredients=[];
  }
  let currentStore='냉장';
  let ingredientSearchTerm='';
  let preferredIngredients=[];
  try{
    const savedPreferred=JSON.parse(MN.store.getItem('mealnote.preferred.today.v1') || '[]');
    if(Array.isArray(savedPreferred)) preferredIngredients=savedPreferred;
  }catch(e){ preferredIngredients=[]; }
  let customMeals={today:'',tomorrow:''};
  let easyMeals={today:{type:'',menu:''},tomorrow:{type:'',menu:''}};
  try{
    const s=JSON.parse(MN.store.getItem('mealnote.easyMeals.v1')||'{}');
    ['today','tomorrow'].forEach(day=>{
      if(s?.[day]) easyMeals[day]={type:s[day].type||'',menu:s[day].menu||''};
    });
  }catch(e){}
  function saveEasyMeals(){MN.store.setItem('mealnote.easyMeals.v1',JSON.stringify(easyMeals));}
  let mealLogs={today:null,tomorrow:null};
  try{
    const s=JSON.parse(MN.store.getItem('mealnote.actualMeals.v1')||'{}');
    if(s) mealLogs={today:s.today||null,tomorrow:s.tomorrow||null};
  }catch(e){}
  function saveMealLogs(){MN.store.setItem('mealnote.actualMeals.v1',JSON.stringify(mealLogs));}

  let homeAllDay={today:false,tomorrow:false};
  try{
    const s=JSON.parse(MN.store.getItem('mealnote.homeAllDay.v1')||'{}');
    if(s) homeAllDay={today:!!s.today,tomorrow:!!s.tomorrow};
  }catch(e){}
  function saveHomeAllDay(){MN.store.setItem('mealnote.homeAllDay.v1',JSON.stringify(homeAllDay));}


  try{
    const savedCustom=JSON.parse(MN.store.getItem('mealnote.customMeals.v1') || '{}');
    if(savedCustom && typeof savedCustom==='object'){
      customMeals.today=(savedCustom.today||'').trim();
      customMeals.tomorrow=(savedCustom.tomorrow||'').trim();
    }
  }catch(e){ customMeals={today:'',tomorrow:''}; }

  function saveCustomMeals(){
    MN.store.setItem('mealnote.customMeals.v1',JSON.stringify(customMeals));
  }

  function customMealObject(title){
    const detected=detectGroups(title);
    const groups=[];
    if(detected.has('grain')) groups.push('grain');
    if(detected.has('protein')) groups.push('protein');
    if(detected.has('vegetable')) groups.push('vegetable');
    if(detected.has('dairy')) groups.push('dairy');
    if(detected.has('fruit')) groups.push('fruit');
    return {
      title:title,
      used:[],
      extras:[],
      protein:'custom',
      groups:groups,
      reason:'사용자가 직접 고른 메뉴예요. 오늘의 유치원 식단과 함께 균형을 확인해볼게요.',
      custom:true
    };
  }


  const chips=document.getElementById('ingredientChips');
  const input=document.getElementById('ingredientInput');
  const picker=document.getElementById('guidedPicker');

  function save(){
    MN.store.setItem('mealnote.ingredients.v3',JSON.stringify(ingredients));
    const availableNames=new Set(ingredients.map(x=>x.name));
    preferredIngredients=preferredIngredients.filter(x=>availableNames.has(x));
    MN.store.setItem('mealnote.preferred.today.v1',JSON.stringify(preferredIngredients));
    if(typeof renderPreferredIngredients==='function') renderPreferredIngredients();
    if(typeof generatePlans==='function') generatePlans();
  }

  function renderPicker(){
    picker.innerHTML='';
    const term=ingredientSearchTerm.trim().toLowerCase();
    let matched=0;

    Object.entries(ingredientCatalog[currentStore]).forEach(([category,items])=>{
      const filtered = term ? items.filter(name=>name.toLowerCase().includes(term)) : items;
      if(!filtered.length) return;

      const block=document.createElement('div');
      block.className='categoryBlock' + (term ? ' searchMatch' : '');
      const title=document.createElement('div');
      title.className='categoryName';
      title.textContent=category.replace(/^[^가-힣]+/,'');
      const grid=document.createElement('div');
      grid.className='quickGrid';

      filtered.forEach(name=>{
        matched++;
        const btn=document.createElement('button');
        btn.className='quick';
        btn.textContent=name;
        const exists=ingredients.some(i=>i.name===name && i.cat===currentStore);
        if(exists) btn.classList.add('selected');
        btn.onclick=()=>{
          const existing=ingredients.find(i=>i.name===name && i.cat===currentStore);
          if(existing){
            ingredients=ingredients.filter(i=>i.id!==existing.id);
            const elsewhere=[...new Set(ingredients.filter(i=>i.name===name).map(i=>i.cat))];
            document.getElementById('ingredientStatus').textContent=
              elsewhere.length
              ? `${currentStore}의 ${name}은 뺐어요. 하지만 ${elsewhere.join('·')}에도 ${name}이 등록되어 있어 추천에는 계속 사용할 수 있어요.`
              : `${name}을(를) 우리집 재료에서 완전히 뺐어요.`;
          }else{
            ingredients.push({id:Date.now()+Math.random(),name,cat:currentStore});
            document.getElementById('ingredientStatus').textContent=`${name} 있어요 ✓`;
          }
          save(); render(); renderPicker();
        };
        grid.appendChild(btn);
      });
      block.append(title,grid);
      picker.appendChild(block);
    });

    if(term && !matched){
      picker.classList.add('emptySearch');
      picker.innerHTML='';
      const add=document.createElement('button');add.className='btn primary full';add.textContent='“'+ingredientSearchTerm.trim()+'”을 '+currentStore+' 재료에 추가';
      if(ingredients.some(x=>x.name===ingredientSearchTerm.trim()&&x.cat===currentStore)){add.textContent='“'+ingredientSearchTerm.trim()+'”은 '+currentStore+'에 있어요';add.disabled=true;}
      add.onclick=()=>{input.value=ingredientSearchTerm.trim();addIngredient();};picker.append(add);
    }else{
      picker.classList.remove('emptySearch');
    }
  }


  function renderPreferredIngredients(){
    const wrap=document.getElementById('preferredIngredientChoices');
    const status=document.getElementById('preferredStatus');
    if(!wrap) return;

    const unique=[];
    const seen=new Set();
    ingredients.forEach(item=>{
      if(!seen.has(item.name)){ seen.add(item.name); unique.push(item.name); }
    });

    wrap.innerHTML='';
    if(!unique.length){
      wrap.innerHTML='<span class="muted">먼저 우리집 재료를 선택해주세요.</span>';
      if(status) status.textContent='';
      return;
    }

    unique.forEach(name=>{
      const btn=document.createElement('button');
      btn.type='button';
      btn.className='preferredChoice'+(preferredIngredients.includes(name)?' selected':'');
      btn.textContent=name;
      btn.onclick=()=>{
        if(preferredIngredients.includes(name)){
          preferredIngredients=preferredIngredients.filter(x=>x!==name);
        }else{
          preferredIngredients.push(name);
        }
        MN.store.setItem('mealnote.preferred.today.v1',JSON.stringify(preferredIngredients));
        renderPreferredIngredients();
        generatePlans();
      };
      wrap.appendChild(btn);
    });

    if(status){
      status.textContent=preferredIngredients.length
        ? `선택한 재료 ${preferredIngredients.length}개를 사용하는 조합이에요.`
        : '꼭 쓰고 싶은 재료가 없다면 선택하지 않아도 돼요.';
    }
  }

  function render(){
    chips.innerHTML='';
    ingredients.forEach(item=>{
      const span=document.createElement('span');
      span.className='chip';
      span.innerHTML=`${esc(item.name)} <small style="color:#aaa">${esc(item.cat)}</small> <button aria-label="삭제">×</button>`;
      span.querySelector('button').onclick=()=>{
        ingredients=ingredients.filter(x=>x.id!==item.id);
        save(); render(); renderPicker();
      };
      chips.appendChild(span);
    });
    if(!chips.children.length) chips.innerHTML='<span class="muted">등록된 재료가 없어요.</span>';
    document.getElementById('ingredientCount').textContent=`${ingredients.length}개`;
  }


  const ingredientSearch=document.getElementById('ingredientSearch');
  const ingredientSearchClear=document.getElementById('ingredientSearchClear');
  ingredientSearch.addEventListener('input',e=>{
    ingredientSearchTerm=e.target.value;
    renderPicker();
  });
  ingredientSearchClear.onclick=()=>{
    ingredientSearchTerm='';
    ingredientSearch.value='';
    renderPicker();
    ingredientSearch.focus();
  };

  document.querySelectorAll('.storeTab').forEach(tab=>{
    tab.onclick=()=>{
      document.querySelectorAll('.storeTab').forEach(x=>x.classList.remove('active'));
      tab.classList.add('active');
      currentStore=tab.dataset.store;
      ingredientSearchTerm='';
      ingredientSearch.value='';
      renderPicker();
    };
  });

  function addIngredient(){
    const name=input.value.trim();
    if(!name) return;
    if(!ingredients.some(i=>i.name===name && i.cat===currentStore)){
      ingredients.push({id:Date.now(),name,cat:currentStore});
    }
    input.value='';
    save(); render(); renderPicker();
    document.getElementById('ingredientStatus').textContent=`${name}을(를) ${currentStore}에 추가했어요.`;
  }
  document.getElementById('addIngredient').onclick=addIngredient;
  input.addEventListener('keydown',e=>{if(e.key==='Enter') addIngredient();});
  document.getElementById('clearIngredients').onclick=()=>{
    if(confirm('등록된 재료를 모두 지울까요?')){
      ingredients=[]; save(); render(); renderPicker();
      document.getElementById('ingredientStatus').textContent='재료 목록을 비웠어요.';
    }
  };
  document.getElementById('clearPreferred').onclick=()=>{
    preferredIngredients=[];
    MN.store.setItem('mealnote.preferred.today.v1','[]');
    renderPreferredIngredients();
    generatePlans();
  };


  function names(){ return ingredients.map(x=>x.name); }
  function has(name){ return names().includes(name); }
  function locationsOf(name){ return ingredients.filter(x=>x.name===name).map(x=>x.cat); }
  function ingredientLabel(name){
    const locs=[...new Set(locationsOf(name))];
    return locs.length ? `${locs.join('/')} ${name}` : name;
  }

  // Common Korean home meals. A recipe is recommended only when its main
  // ingredients are actually registered at home. Optional ingredients raise its score.
  const recipeLibrary = [
    {
      title:'쌀밥 · 소고기미역국 · 달걀말이 · 브로콜리무침',
      req:['국거리','미역','달걀','브로콜리'],
      opt:['대파','당근'],
      protein:'beef', priority:'fridge',
      groups:['grain','protein','vegetable']
    },
    {
      title:'쌀밥 · 감자된장국 · 돼지고기숙주볶음 · 깻잎',
      req:['감자','숙주'],
      any:['삼겹살','대패삼겹','항정살'],
      opt:['깻잎','양파','대파'],
      protein:'pork', priority:'fridge',
      groups:['grain','protein','vegetable']
    },
    {
      title:'쌀밥 · 애호박된장국 · 소불고기 · 두부부침',
      req:['불고기용 소고기','두부','애호박'],
      opt:['양파','대파'],
      protein:'beef', priority:'fridge',
      groups:['grain','protein','vegetable']
    },
    {
      title:'쌀밥 · 콩나물국 · 돼지고기애호박볶음 · 김',
      req:['다진 돼지고기','애호박','콩나물'],
      opt:['김','양파','대파'],
      protein:'pork', priority:'fridge',
      groups:['grain','protein','vegetable']
    },
    {
      title:'쌀밥 · 감자국 · 닭고기간장조림 · 브로콜리무침',
      req:['닭고기','감자'],
      opt:['브로콜리','당근','양파','대파'],
      protein:'chicken', priority:'fridge',
      groups:['grain','protein','vegetable']
    },
    {
      title:'쌀밥 · 미역국 · 고등어구이 · 콩나물무침',
      req:['고등어','미역','콩나물'],
      opt:['대파'],
      protein:'fish', priority:'freezer',
      groups:['grain','protein','vegetable']
    },
    {
      title:'쌀밥 · 감자국 · 갈치구이 · 애호박볶음',
      req:['갈치','감자','애호박'],
      opt:['대파','양파'],
      protein:'fish', priority:'freezer',
      groups:['grain','protein','vegetable']
    },
    {
      title:'쌀밥 · 두부된장국 · 가자미구이 · 브로콜리무침',
      req:['가자미','두부','브로콜리'],
      opt:['애호박','대파'],
      protein:'fish', priority:'freezer',
      groups:['grain','protein','vegetable']
    },
    {
      title:'쌀밥 · 미역국 · 오징어볶음 · 콩나물무침',
      req:['오징어','미역','콩나물'],
      opt:['양파','애호박'],
      protein:'seafood', priority:'freezer',
      groups:['grain','protein','vegetable']
    },
    {
      title:'쌀밥 · 달걀국 · 새우채소볶음 · 김',
      req:['새우','달걀'],
      opt:['당근','양파','대파','김'],
      protein:'seafood', priority:'freezer',
      groups:['grain','protein','vegetable']
    },
    {
      title:'쌀밥 · 어묵국 · 두부부침 · 콩나물무침',
      req:['어묵','두부','콩나물'],
      opt:['대파','양파'],
      protein:'tofu', priority:'fridge',
      groups:['grain','protein','vegetable']
    },
    {
      title:'쌀밥 · 어묵국 · 달걀말이 · 애호박볶음',
      req:['어묵','달걀','애호박'],
      opt:['대파','양파'],
      protein:'egg', priority:'fridge',
      groups:['grain','protein','vegetable']
    },
    {
      title:'쌀밥 · 감자국 · 떡갈비 · 버섯볶음',
      req:['떡갈비','감자','버섯'],
      opt:['양파','대파'],
      protein:'easy', priority:'freezer',
      groups:['grain','protein','vegetable']
    },
    {
      title:'쌀밥 · 만두국 · 달걀찜 · 김',
      req:['만두','달걀'],
      opt:['김','대파'],
      protein:'easy', priority:'freezer',
      groups:['grain','protein']
    }
,
    {
      title:'쌀밥 · 소고기무국 · 두부부침 · 오이무침',
      req:['국거리','무','두부'], opt:['오이','대파'], protein:'beef', priority:'fridge',
      groups:['grain','protein','vegetable']
    },
    {
      title:'쌀밥 · 콩나물국 · 돼지불고기 · 브로콜리무침',
      any:['앞다리살','목살','뒷다리살'], req:['콩나물'], opt:['브로콜리','양파'], protein:'pork', priority:'fridge',
      groups:['grain','protein','vegetable']
    },
    {
      title:'쌀밥 · 감자된장국 · 닭다리살구이 · 오이무침',
      any:['닭다리살','닭안심','닭가슴살'], req:['감자'], opt:['오이','양파'], protein:'chicken', priority:'fridge',
      groups:['grain','protein','vegetable']
    },
    {
      title:'쌀밥 · 미역국 · 연어구이 · 감자채볶음',
      req:['연어','미역','감자'], opt:['양파'], protein:'fish', priority:'freezer',
      groups:['grain','protein','vegetable']
    },
    {
      title:'쌀밥 · 무국 · 삼치구이 · 애호박볶음',
      req:['삼치','무','애호박'], opt:['대파'], protein:'fish', priority:'freezer',
      groups:['grain','protein','vegetable']
    },
    {
      title:'쌀밥 · 미역국 · 두부조림 · 시금치무침',
      req:['미역','두부'], opt:['시금치','대파'], protein:'tofu', priority:'fridge',
      groups:['grain','protein','vegetable']
    },
    {
      title:'쌀밥 · 감자국 · 오징어볶음 · 단호박찜',
      req:['오징어','감자'], opt:['단호박','양파'], protein:'seafood', priority:'freezer',
      groups:['grain','protein','vegetable']
    },
    {
      title:'쌀밥 · 미역국 · 닭안심구이 · 고구마조림',
      any:['닭안심','닭가슴살'], req:['미역'], opt:['고구마'], protein:'chicken', priority:'fridge',
      groups:['grain','protein','vegetable']
    }  ];

  recipeLibrary.forEach(r=>{
    const sides={'브로콜리무침':'브로콜리','오이무침':'오이','시금치무침':'시금치','단호박찜':'단호박','고구마조림':'고구마','깻잎':'깻잎','김':'김'};
    r.req=[...new Set(['쌀',...r.req,...mealComponents(r.title).map(x=>sides[x]).filter(Boolean)])];
  });
  const breakfastLibrary = [
    {title:'햄 주먹밥 + 우유/요구르트 + 과일', req:['햄','쌀'], opt:['김가루','우유','요구르트']},
    {title:'달걀 주먹밥 + 우유 + 과일', req:['달걀','쌀'], opt:['김가루','우유']},
    {title:'시리얼 + 우유 + 과일', req:['시리얼','우유'], opt:[]},
    {title:'식빵 + 치즈 + 우유 + 과일', req:['식빵','치즈'], opt:['우유']},
    {title:'유부초밥 + 과일', req:['유부','쌀'], opt:['당근']}
  ];

  function recipeAvailable(r){
    const n=names();
    if(r.req && !r.req.every(x=>n.includes(x))) return false;
    if(r.any && !r.any.some(x=>n.includes(x))) return false;
    return true;
  }

  function mainIngredients(r){
    const n=names();
    const arr=[...(r.req||[])];
    if(r.any){
      const picked=r.any.find(x=>n.includes(x));
      if(picked) arr.push(picked);
    }
    return arr;
  }

  function schoolProteinTypes(text){
    const s=text||'';
    const set=new Set();
    if(/소고기|불고기|갈비/.test(s)) set.add('beef');
    if(/돼지|제육|삼겹/.test(s)) set.add('pork');
    if(/닭|치킨/.test(s)) set.add('chicken');
    if(/고등어|갈치|가자미|생선/.test(s)) set.add('fish');
    if(/오징어|새우/.test(s)) set.add('seafood');
    if(/두부|콩/.test(s)) set.add('tofu');
    if(/달걀|계란/.test(s)) set.add('egg');
    if(/어묵/.test(s)) set.add('fishcake');
    return set;
  }

  function mealComponents(title){
    return (title||'').split('·').map(x=>x.trim()).filter(Boolean);
  }

  function chooseMeal(dayIndex, schoolText, history){
    const schoolProteins=schoolProteinTypes(schoolText);
    const usedTitles=new Set(history.map(x=>x.title));
    const recentProteins=history.slice(-2).map(x=>x.protein);
    const usedComponents=new Set(history.flatMap(x=>mealComponents(x.title)));
    const plannedMissing=new Set(history.flatMap(x=>x.missing||[]));
    const allNames=new Set(names());
    const fridgeNames=new Set(ingredients.filter(x=>x.cat==='냉장').map(x=>x.name));

    const candidateInfo=recipeLibrary.map((r,index)=>{
      const required=[...(r.req||[])];
      let pickedAny=null;
      if(r.any) pickedAny=r.any.find(x=>allNames.has(x)) || r.any[0];
      const needed=[...required, ...(pickedAny?[pickedAny]:[])];
      const missing=needed.filter(x=>!allNames.has(x));
      return {r,index,needed,missing};
    });

    // First prefer recipes fully possible at home.
    let pool=candidateInfo.filter(x=>x.missing.length===0);

    // If those would force a repeat, allow a near-match with only 1–2 missing items.
    const unusedAvailable=pool.filter(x=>!usedTitles.has(x.r.title));
    if(unusedAvailable.length) pool=unusedAvailable;
    else{
      const near=candidateInfo
        .filter(x=>!usedTitles.has(x.r.title) && x.missing.length<=2)
        .sort((a,b)=>a.missing.length-b.missing.length);
      if(near.length) pool=near;
    }

    // Last resort: still choose a different familiar menu rather than repeat the exact same meal.
    if(!pool.length){
      pool=candidateInfo.filter(x=>!usedTitles.has(x.r.title));
    }
    if(!pool.length) pool=candidateInfo;

    const scored=pool.map(info=>{
      const r=info.r;
      let score=0;
      const mains=info.needed.filter(x=>allNames.has(x));
      if(usedTitles.has(r.title)) score-=1000;
      const repeatedParts=mealComponents(r.title).filter(x=>usedComponents.has(x) && x!=='쌀밥');
      score -= repeatedParts.length*48;
      if(repeatedParts.some(x=>/국|탕/.test(x))) score-=35;
      if(recentProteins.includes(r.protein)) score-=55;
      if(history.length && history[history.length-1]?.protein===r.protein) score-=70;
      if(schoolProteins.has(r.protein)) score-=35;
      score += mains.filter(x=>fridgeNames.has(x)).length*10;
      score += (r.opt||[]).filter(x=>has(x)).length*3;
      score -= info.missing.length*18;
      const newMissing=info.missing.filter(x=>!plannedMissing.has(x));
      const reusedMissing=info.missing.filter(x=>plannedMissing.has(x));
      score -= newMissing.length*(ingredients.length===0 ? 55 : 24);
      score += reusedMissing.length*(ingredients.length===0 ? 28 : 10);

      if(dayIndex===0 && preferredIngredients.length){
        const mainMatches=mains.filter(x=>preferredIngredients.includes(x)).length;
        const optionalMatches=(r.opt||[]).filter(x=>preferredIngredients.includes(x)).length;
        score += mainMatches*75 + optionalMatches*20;
      }
      if(dayIndex>=2 && r.priority==='freezer') score+=6;
      if(dayIndex<=1 && r.priority==='fridge') score+=6;

      // deterministic variety across days, not random
      score += ((info.index + dayIndex*5) % 11);
      return {...info,score};
    }).sort((a,b)=>b.score-a.score);

    const chosen=scored[0];
    const r=chosen.r;
    const used=chosen.needed.filter(x=>allNames.has(x));
    const extras=(r.opt||[]).filter(x=>has(x)).slice(0,2);
    const missing=chosen.missing || [];
    return {
      title:r.title,
      used,
      extras,
      missing,
      protein:r.protein,
      groups:r.groups||['grain','protein'],
      reason:(dayIndex===0 && preferredIngredients.some(x=>used.includes(x)||extras.includes(x)))
        ? `오늘 고른 재료 중 ${preferredIngredients.filter(x=>used.includes(x)||extras.includes(x)).join(' · ')}을(를) 우선 반영했어요.`
        : missing.length
          ? `같은 메뉴 반복을 피하려고 집 재료를 우선 쓰되, ${missing.join(' · ')}만 있으면 만들 수 있는 메뉴로 바꿨어요.`
          : (schoolText ? '기관 식사와 겹치지 않게 단백질과 반찬을 바꿔 이어갔어요.' : '집 재료를 우선 쓰면서 앞선 날과 메뉴·단백질이 겹치지 않게 골랐어요.')
    };
  }

  function detectGroups(text){
    const s=(text||'');
    const set=new Set();
    if(/밥|쌀|흑미|잡곡|초밥|우동|면|빵|시리얼|감자|고구마/.test(s)) set.add('grain');
    if(/소고기|돼지|닭|고등어|갈치|가자미|오징어|새우|어묵|두부|달걀|계란|유부|떡갈비/.test(s)) set.add('protein');
    if(/콩나물|숙주|애호박|브로콜리|버섯|당근|양파|깻잎|김치|무침|볶음/.test(s)) set.add('vegetable');
    if(/우유|요구르트|요거트|치즈/.test(s)) set.add('dairy');
    if(/사과|배|포도|샤인|복숭아|바나나|귤|오렌지|키위|수박|멜론|과일/.test(s)) set.add('fruit');
    return set;
  }

  function reassuranceText(schoolText, meal){
    const groups=detectGroups(schoolText);
    (meal.groups||[]).forEach(g=>groups.add(g));
    const good=[];
    if(groups.has('grain')) good.push('곡류');
    if(groups.has('protein')) good.push('단백질');
    if(groups.has('vegetable')) good.push('채소');
    if(groups.has('dairy')) good.push('유제품');
    if(groups.has('fruit')) good.push('과일');

    const missing=[];
    if(!groups.has('fruit')) missing.push('과일');
    if(!groups.has('dairy')) missing.push('유제품');
    if(!groups.has('vegetable')) missing.push('채소');

    let main = good.length>=4
      ? `오늘 식단 흐름으로 보면 ${good.slice(0,4).join('·')}이 여러 끼에 들어와 있어요.`
      : `오늘은 ${good.join('·') || '기본 식사'}를 중심으로 채워가고 있어요.`;

    let next = missing.length
      ? `${missing[0]}만 한 번 더 챙기면 오늘의 균형이 더 좋아져요.`
      : `오늘 식단은 주요 식품군이 고르게 이어지고 있어요.`;

    return {main,next,missing};
  }

  function chooseBreakfast(dayIndex=0){
    if(ingredients.length===0) return '달걀 주먹밥 + 우유 + 과일';
    const available=breakfastLibrary
      .filter(r=>(r.req||[]).every(x=>has(x)));
    const pool=available.length?available:breakfastLibrary;
    const ranked=pool.map((r,i)=>({r,score:(r.opt||[]).filter(x=>has(x)).length*3 + ((i+dayIndex*2)%5)}))
      .sort((a,b)=>b.score-a.score);
    return ranked[0]?.r.title || '밥/빵 + 우유·유제품 + 과일';
  }

  function freshProduceFor(meal){
    const perish=['숙주','콩나물','깻잎','두부','애호박','브로콜리','버섯'];
    return perish.filter(x=>has(x) && !(meal.used||[]).includes(x)).slice(0,2);
  }


  const dishGuides = {
    '소고기미역국':{
      time:'약 20분', tools:'냄비 1개',
      ingredients:['불린 미역 1줌(약 15g)','소고기 국거리 80g','물 700ml','국간장 1작은술','참기름 1/2작은술'],
      steps:[
        '마른 미역은 물에 10분 불린 뒤 2~3번 헹구고 물기를 꼭 짜요.',
        '냄비를 중약불에 올리고 참기름 1/2작은술, 소고기 80g을 넣어 2분 볶아요.',
        '미역을 넣고 1분 더 볶아요.',
        '물 700ml를 붓고 센불로 끓여요. 끓기 시작하면 중약불로 줄여 12분 끓여요.',
        '국간장 1작은술을 넣고 맛을 봐요. 아이용은 싱겁다 싶을 정도면 충분해요.'
      ]
    },
    '감자된장국':{
      time:'약 15분', tools:'냄비 1개',
      ingredients:['감자 1개','양파 1/4개','애호박 1/4개(있으면)','물 600ml','된장 1큰술'],
      steps:[
        '감자는 1cm 두께로 작게 썰고, 양파·애호박도 비슷한 크기로 썰어요.',
        '냄비에 물 600ml와 감자를 넣고 센불로 끓여요.',
        '끓으면 중불로 줄이고 된장 1큰술을 체나 숟가락으로 잘 풀어요.',
        '양파와 애호박을 넣고 7~8분 더 끓여요.',
        '감자를 젓가락으로 찔렀을 때 쑥 들어가면 완성이에요.'
      ]
    },
    '두부애호박된장국':{
      time:'약 15분', tools:'냄비 1개',
      ingredients:['두부 1/4모','애호박 1/4개','양파 1/4개','물 600ml','된장 1큰술'],
      steps:[
        '두부는 1.5cm 네모, 애호박·양파는 한입 크기로 썰어요.',
        '냄비에 물 600ml를 끓인 뒤 된장 1큰술을 잘 풀어요.',
        '양파와 애호박을 넣고 중불에서 6분 끓여요.',
        '두부를 넣고 3분 더 끓여요.',
        '아이용은 추가 소금 없이 먼저 덜어주세요.'
      ]
    },
    '콩나물국':{
      time:'약 12분', tools:'냄비 1개',
      ingredients:['콩나물 2줌(약 150g)','물 700ml','대파 5cm','국간장 1작은술'],
      steps:[
        '콩나물은 흐르는 물에 한 번 씻어요.',
        '냄비에 콩나물과 물 700ml를 같이 넣고 뚜껑을 닫아요.',
        '센불에서 끓기 시작하면 중불로 줄여 7분 끓여요. 중간에 뚜껑을 열었다 닫았다 하지 마세요.',
        '대파를 송송 썰어 넣고 1분 더 끓여요.',
        '국간장 1작은술을 넣고 아이 몫을 먼저 덜어요.'
      ]
    },
    '감자국':{
      time:'약 15분', tools:'냄비 1개',
      ingredients:['감자 1개','양파 1/4개','대파 5cm','물 650ml','국간장 1작은술'],
      steps:[
        '감자는 0.7~1cm 두께로 썰고 양파도 비슷하게 썰어요.',
        '냄비에 감자와 물 650ml를 넣고 센불로 끓여요.',
        '끓으면 중불로 줄여 8분 끓여요.',
        '양파와 대파를 넣고 3분 더 끓여요.',
        '국간장 1작은술을 넣고 끝내요.'
      ]
    },
    '두부국':{
      time:'약 10분', tools:'냄비 1개',
      ingredients:['두부 1/3모','대파 5cm','물 600ml','국간장 1작은술'],
      steps:[
        '두부를 1.5cm 네모로 썰고 대파를 송송 썰어요.',
        '냄비에 물 600ml를 끓여요.',
        '끓으면 두부를 넣고 중불에서 5분 끓여요.',
        '대파와 국간장 1작은술을 넣고 1분 더 끓여요.'
      ]
    },
    '두부된장국':{
      time:'약 12분', tools:'냄비 1개',
      ingredients:['두부 1/4모','애호박 1/4개','물 600ml','된장 1큰술','대파 조금'],
      steps:[
        '두부와 애호박을 한입 크기로 썰어요.',
        '냄비에 물 600ml를 끓이고 된장 1큰술을 잘 풀어요.',
        '애호박을 넣고 중불에서 5분 끓여요.',
        '두부와 대파를 넣고 3분 더 끓여요.'
      ]
    },
    '미역국':{
      time:'약 18분', tools:'냄비 1개',
      ingredients:['불린 미역 1줌','물 700ml','국간장 1작은술','참기름 1/2작은술'],
      steps:[
        '마른 미역은 물에 10분 불리고 헹궈 물기를 짜요.',
        '냄비에 참기름 1/2작은술과 미역을 넣고 중약불에서 1분 볶아요.',
        '물 700ml를 붓고 센불로 끓여요.',
        '끓으면 중약불로 줄여 12분 끓이고 국간장 1작은술을 넣어요.'
      ]
    },
    '유부된장국':{
      time:'약 10분', tools:'냄비 1개',
      ingredients:['유부 2장','대파 5cm','물 600ml','된장 1큰술'],
      steps:[
        '유부는 뜨거운 물을 한 번 끼얹어 기름기를 빼고 1cm 폭으로 썰어요.',
        '냄비에 물 600ml를 끓이고 된장 1큰술을 풀어요.',
        '유부와 대파를 넣고 중불에서 4분 끓여요.'
      ]
    },
    '달걀국':{
      time:'약 8분', tools:'냄비 1개',
      ingredients:['달걀 1개','대파 5cm','물 500ml','국간장 1/2작은술'],
      steps:[
        '달걀 1개를 그릇에 풀고 대파를 송송 썰어요.',
        '냄비에 물 500ml를 끓여요.',
        '물이 팔팔 끓으면 달걀물을 한 바퀴 천천히 둘러 붓고 10초 기다려요.',
        '젓가락으로 한두 번만 저은 뒤 대파와 국간장 1/2작은술을 넣고 불을 꺼요.'
      ]
    },
    '어묵국':{
      time:'약 12분', tools:'냄비 1개',
      ingredients:['어묵 2장','대파 5cm','양파 1/4개','물 650ml','국간장 1작은술'],
      steps:[
        '어묵은 뜨거운 물을 한 번 끼얹고 아이가 먹기 좋은 크기로 썰어요.',
        '양파를 얇게 썰고 대파는 송송 썰어요.',
        '냄비에 물 650ml와 양파를 넣고 5분 끓여요.',
        '어묵을 넣고 4분 더 끓인 뒤 대파와 국간장 1작은술을 넣어요.'
      ]
    },
    '만두국':{
      time:'약 12분', tools:'냄비 1개',
      ingredients:['만두 5~6개','달걀 1개','대파 5cm','물 700ml','국간장 1작은술'],
      steps:[
        '냄비에 물 700ml를 끓여요.',
        '물이 끓으면 만두 5~6개를 넣고 중불에서 7분 끓여요.',
        '달걀을 풀어 천천히 넣고 20초 기다렸다가 한 번 저어요.',
        '대파와 국간장 1작은술을 넣고 1분 더 끓여요.'
      ]
    },
    '달걀말이':{
      time:'약 8분', tools:'프라이팬 1개',
      ingredients:['달걀 2개','당근 1큰술','대파 1큰술','식용유 1작은술','소금 한 꼬집'],
      steps:[
        '달걀 2개를 풀고 잘게 썬 당근·대파를 1큰술씩 넣어요.',
        '소금은 손가락으로 아주 작은 한 꼬집만 넣어요.',
        '프라이팬을 약불로 1분 예열한 뒤 식용유 1작은술을 키친타월로 얇게 펴요.',
        '달걀물 절반을 붓고 바닥이 70% 익으면 한쪽부터 말아요.',
        '남은 달걀물을 이어 붓고 다시 말아요. 불은 끝까지 약불이에요.',
        '불을 끄고 1분 식힌 뒤 1.5cm 폭으로 썰어요.'
      ]
    },
    '브로콜리무침':{
      time:'약 7분', tools:'냄비 1개',
      ingredients:['브로콜리 1/3송이','참기름 1/2작은술','깨 1작은술','소금 아주 조금'],
      steps:[
        '브로콜리를 아이 한입 크기로 작게 잘라요.',
        '냄비에 물을 끓이고 브로콜리를 넣어 1분 30초 데쳐요.',
        '찬물에 한 번 헹군 뒤 물기를 충분히 털어요.',
        '참기름 1/2작은술, 깨 1작은술, 소금 아주 조금을 넣고 버무려요.'
      ]
    },
    '돼지고기숙주볶음':{
      time:'약 12분', tools:'프라이팬 1개',
      ingredients:['돼지고기 150g','숙주 2줌','양파 1/4개','간장 1큰술','물 1큰술'],
      steps:[
        '양파는 얇게 썰고 숙주는 씻어 물기를 빼요.',
        '프라이팬을 중불로 1분 예열한 뒤 돼지고기 150g을 넣어 4~5분 볶아요.',
        '고기 겉면이 모두 익으면 양파를 넣고 2분 볶아요.',
        '간장 1큰술과 물 1큰술을 넣고 섞어요.',
        '숙주를 넣고 센불로 1분만 빠르게 볶고 불을 꺼요.'
      ]
    },
    '소불고기':{
      time:'약 15분', tools:'프라이팬 1개',
      ingredients:['불고기용 소고기 180g','양파 1/4개','버섯 한 줌','간장 1.5큰술','물 2큰술','올리고당 1작은술'],
      steps:[
        '간장 1.5큰술, 물 2큰술, 올리고당 1작은술을 섞어요.',
        '소고기와 소스를 섞어 5분 두고, 그동안 양파와 버섯을 썰어요.',
        '프라이팬을 중불로 1분 예열하고 소고기를 넣어 3분 볶아요.',
        '양파와 버섯을 넣고 4~5분 더 볶아요.',
        '고기 속까지 갈색으로 익고 국물이 거의 없어지면 끝이에요.'
      ]
    },
    '버섯볶음':{
      time:'약 7분', tools:'프라이팬 1개',
      ingredients:['버섯 1팩의 1/2','양파 1/4개','식용유 1작은술','간장 1/2작은술'],
      steps:[
        '버섯과 양파를 얇게 썰어요.',
        '프라이팬을 중불로 예열하고 식용유 1작은술을 둘러요.',
        '양파를 1분 볶고 버섯을 넣어 3~4분 볶아요.',
        '간장 1/2작은술을 넣고 30초 더 볶아요.'
      ]
    },
    '돼지고기애호박볶음':{
      time:'약 12분', tools:'프라이팬 1개',
      ingredients:['다진 돼지고기 150g','애호박 1/3개','양파 1/4개','간장 1큰술','물 2큰술'],
      steps:[
        '애호박은 0.5cm 두께 반달 모양, 양파는 얇게 썰어요.',
        '프라이팬을 중불로 1분 예열하고 다진 돼지고기를 넣어 4분 볶아요.',
        '고기 색이 완전히 변하면 양파와 애호박을 넣어 3분 볶아요.',
        '간장 1큰술과 물 2큰술을 넣고 중약불에서 2분 더 볶아요.',
        '애호박이 투명해지기 시작하면 불을 꺼요.'
      ]
    },
    '김':{
      time:'약 1분', tools:'가위',
      ingredients:['구운 김 1~2장'],
      steps:['구운 김을 가위로 아이 한입 크기(약 3cm)로 잘라 그릇에 담아요.']
    },
    '닭고기간장조림':{
      time:'약 20분', tools:'프라이팬 또는 냄비 1개',
      ingredients:['닭고기 200g','감자 1개','당근 1/3개','양파 1/4개','간장 1.5큰술','물 150ml','올리고당 1작은술'],
      steps:[
        '닭고기와 감자·당근을 아이 한입 크기로 썰어요.',
        '팬에 닭고기를 넣고 중불에서 4분 볶아요.',
        '감자·당근·양파를 넣고 2분 더 볶아요.',
        '간장 1.5큰술, 물 150ml, 올리고당 1작은술을 넣고 뚜껑을 덮어요.',
        '중약불에서 10분 끓여요. 감자가 젓가락으로 쉽게 찔리면 완성이에요.'
      ]
    },
    '고등어구이':{
      time:'약 12분', tools:'프라이팬 또는 에어프라이어',
      ingredients:['고등어 1토막','식용유 1/2작은술'],
      steps:[
        '고등어 표면의 물기를 키친타월로 닦아요.',
        '프라이팬 사용 시 중약불로 예열하고 식용유를 아주 얇게 둘러요.',
        '껍질 쪽부터 5분, 뒤집어서 4~5분 익혀요.',
        '속살이 불투명하게 완전히 익었는지 확인해요.',
        '아이에게 줄 때는 살을 작게 떼면서 가시를 손으로 한 번 더 확인해요.'
      ]
    },
    '콩나물무침':{
      time:'약 7분', tools:'냄비 1개',
      ingredients:['콩나물 2줌','참기름 1/2작은술','깨 1작은술','소금 아주 조금'],
      steps:[
        '콩나물을 씻고 끓는 물에 3분 데쳐요.',
        '체에 받쳐 물기를 충분히 빼요.',
        '참기름 1/2작은술, 깨 1작은술, 소금 아주 조금을 넣고 가볍게 무쳐요.'
      ]
    },
    '갈치구이':{
      time:'약 12분', tools:'프라이팬 1개',
      ingredients:['갈치 1토막','식용유 1작은술'],
      steps:[
        '갈치 물기를 키친타월로 닦아요.',
        '프라이팬을 중약불로 예열하고 식용유 1작은술을 둘러요.',
        '갈치를 올려 한 면 4~5분씩 익혀요.',
        '속살이 하얗게 익었는지 확인한 뒤 아이 몫은 뼈와 잔가시를 제거해요.'
      ]
    },
    '애호박볶음':{
      time:'약 8분', tools:'프라이팬 1개',
      ingredients:['애호박 1/3개','양파 1/4개','식용유 1작은술','국간장 1/2작은술'],
      steps:[
        '애호박은 0.5cm 반달 모양, 양파는 얇게 썰어요.',
        '프라이팬을 중불로 예열하고 식용유 1작은술을 둘러요.',
        '양파를 1분 볶고 애호박을 넣어 4분 볶아요.',
        '국간장 1/2작은술을 넣고 30초 더 볶고 불을 꺼요.'
      ]
    },
    '가자미구이':{
      time:'약 12분', tools:'프라이팬 또는 에어프라이어',
      ingredients:['가자미 1토막','식용유 1/2작은술'],
      steps:[
        '가자미 물기를 키친타월로 닦아요.',
        '프라이팬을 중약불로 예열하고 기름을 아주 얇게 둘러요.',
        '한 면 5분, 뒤집어서 4분 익혀요.',
        '아이에게 줄 때는 살을 발라 가시가 없는지 확인해요.'
      ]
    },
    '오징어애호박전':{
      time:'약 15분', tools:'볼 1개 + 프라이팬 1개',
      ingredients:['오징어 100g','애호박 1/4개','달걀 1개','부침가루 3큰술','물 2큰술'],
      steps:[
        '오징어와 애호박을 0.5cm 정도로 아주 잘게 썰어요.',
        '볼에 달걀 1개, 부침가루 3큰술, 물 2큰술을 넣고 섞어요.',
        '오징어와 애호박을 넣고 다시 섞어요.',
        '프라이팬을 중약불로 예열하고 기름을 얇게 둘러요.',
        '밥숟가락 1큰술씩 떠서 지름 5cm 정도로 작게 부쳐요.',
        '한 면 2~3분씩 익혀 속까지 완전히 익혀요.'
      ]
    },
    '새우채소볶음':{
      time:'약 10분', tools:'프라이팬 1개',
      ingredients:['새우 120g','당근 1/4개','양파 1/4개','간장 1작은술','식용유 1작은술'],
      steps:[
        '당근과 양파를 얇고 작게 썰어요.',
        '팬을 중불로 예열하고 식용유 1작은술을 둘러 새우를 2분 볶아요.',
        '당근과 양파를 넣고 4분 더 볶아요.',
        '간장 1작은술을 넣고 30초 볶은 뒤 불을 꺼요.'
      ]
    },
    '두부부침':{
      time:'약 8분', tools:'프라이팬 1개',
      ingredients:['두부 1/3모','식용유 1작은술'],
      steps:[
        '두부를 1.5cm 두께로 썰고 키친타월로 물기를 눌러 닦아요.',
        '프라이팬을 중약불로 예열하고 식용유 1작은술을 둘러요.',
        '두부를 올려 한 면 3분씩 노릇하게 부쳐요.',
        '아이 몫은 간장 없이 먼저 덜어주세요.'
      ]
    },
    '떡갈비':{
      time:'약 10분', tools:'프라이팬 또는 에어프라이어',
      ingredients:['냉동 떡갈비 2~3장'],
      steps:[
        '제품 포장지의 조리법이 있으면 그 시간을 가장 먼저 따라요.',
        '프라이팬이면 중약불에서 앞뒤로 충분히 익혀요.',
        '가운데를 잘랐을 때 속까지 뜨겁고 완전히 익었는지 확인해요.',
        '아이용은 1.5~2cm 크기로 잘라주세요.'
      ]
    }
  };

  const videoLibrary = {
    '달걀말이':{
      title:'정말 쉬운 달걀말이',
      channel:'백종원 PAIK JONG WON',
      url:'https://www.youtube.com/watch?v=T7YJviWhquo',
      why:'기본 달걀말이 · 과정이 잘 보임 · 초보가 따라가기 쉬움'
    },
    '애호박볶음':{
      title:'애호박볶음',
      channel:'딸을 위한 레시피 Recipes for daughters',
      url:'https://www.youtube.com/watch?v=JHxXmjJHTUQ',
      why:'재료가 단순하고 조리 과정이 단계별로 잘 보임'
    },
    '소불고기':{
      title:'소불고기',
      channel:'딸을 위한 레시피 Recipes for daughters',
      url:'https://www.youtube.com/watch?v=0tFQaJ3XeVw',
      why:'계량이 구체적이고 볶는 순서가 화면으로 잘 보임'
    }
  };

  function videoForDish(dish){
    const key=Object.keys(videoLibrary).find(k=>dish.includes(k));
    if(key) return {...videoLibrary[key], curated:true};
    const q=encodeURIComponent(`${dish} 초보 레시피 계량 쉬운 요리`);
    return {
      title:`${dish} 쉬운 영상 찾기`,
      channel:'YouTube 검색',
      url:`https://www.youtube.com/results?search_query=${q}`,
      why:'아직 검증 영상이 없는 메뉴예요. 초보용 검색 결과를 열어드려요.',
      curated:false
    };
  }

  function splitDishes(title){
    return (title||'').split(/[·,／/＋+\n]/).map(x=>x.trim()).filter(Boolean);
  }


  function smartBeginnerGuide(dish){
    const d=(dish||'').trim();

    const ingredientHints=[];
    const known=[
      ['감자','감자 1개'],['오징어','손질 오징어 100g'],['애호박','애호박 1/3개'],
      ['두부','두부 1/3모'],['달걀','달걀 2개'],['계란','달걀 2개'],
      ['돼지고기','돼지고기 150g'],['소고기','소고기 150g'],['닭고기','닭고기 180g'],
      ['고등어','고등어 1토막'],['갈치','갈치 1토막'],['가자미','가자미 1토막'],
      ['새우','새우 100g'],['버섯','버섯 1줌'],['콩나물','콩나물 150g'],
      ['숙주','숙주 150g'],['브로콜리','브로콜리 1/3송이'],['양파','양파 1/4개'],
      ['당근','당근 1/4개'],['미역','불린 미역 1줌'],['어묵','어묵 2장']
    ];
    known.forEach(([k,v])=>{ if(d.includes(k)) ingredientHints.push(v); });

    if(/전$|전\b/.test(d)){
      const base = ingredientHints.length ? ingredientHints : ['주재료 150g'];
      return {
        time:'약 15분', tools:'볼 1개 + 프라이팬 1개',
        ingredients:[...base,'달걀 1개','부침가루 3큰술','물 2큰술','식용유 1큰술'],
        steps:[
          '주재료는 0.5cm 정도로 아주 잘게 썰어요. 감자처럼 단단한 재료는 채 썬 뒤 한 번 더 짧게 썰어주세요.',
          '볼에 달걀 1개, 부침가루 3큰술, 물 2큰술을 넣고 덩어리가 거의 없어질 때까지 섞어요.',
          '손질한 주재료를 반죽에 넣고 숟가락으로 골고루 섞어요. 너무 묽으면 부침가루 1큰술을 추가해요.',
          '프라이팬을 중약불로 1분 예열하고 식용유 1큰술을 둘러요.',
          '밥숟가락으로 1큰술씩 떠서 지름 5~6cm 크기로 얇게 펴요.',
          '한 면을 2~3분 익혀 가장자리가 단단해지면 뒤집고, 반대쪽도 2분 익혀요.',
          '가운데를 젓가락으로 눌렀을 때 물컹한 생반죽 느낌이 없으면 완성이에요.'
        ]
      };
    }

    if(/된장국|국$|탕$/.test(d)){
      const isDoenjang=/된장국/.test(d);
      const base = ingredientHints.length ? ingredientHints : ['주재료 150g'];
      return {
        time:'약 15분', tools:'냄비 1개',
        ingredients:[...base,'물 600ml', isDoenjang?'된장 1큰술':'국간장 1작은술','대파 5cm'],
        steps:[
          '주재료는 아이가 한입에 먹을 수 있게 1~1.5cm 크기로 썰어요.',
          '냄비에 물 600ml를 넣고 센불로 끓여요.',
          isDoenjang
            ? '물이 끓으면 된장 1큰술을 국자에 덜어 국물에 완전히 풀어요.'
            : '물이 끓으면 단단한 재료부터 넣고 중불로 줄여요.',
          '주재료를 넣고 중불에서 7~8분 끓여요.',
          '대파를 송송 썰어 넣고 1분 더 끓여요.',
          isDoenjang
            ? '아이용은 추가 소금 없이 먼저 한 그릇 덜어 맛을 보고, 너무 싱거울 때만 된장 1/4작은술을 더 풀어요.'
            : '국간장 1작은술을 넣고 맛을 본 뒤 아이용은 더 간하지 않고 먼저 덜어요.',
          '감자·무처럼 단단한 재료가 들어갔다면 젓가락이 힘 없이 쑥 들어가면 완성이에요.'
        ]
      };
    }

    if(/볶음$|볶음\b/.test(d)){
      const base = ingredientHints.length ? ingredientHints : ['주재료 150g'];
      return {
        time:'약 12분', tools:'프라이팬 1개',
        ingredients:[...base,'양파 1/4개','식용유 1작은술','간장 1큰술','물 1큰술'],
        steps:[
          '주재료는 아이 한입 크기로 썰고, 양파 1/4개는 얇게 썰어요.',
          '프라이팬을 중불로 1분 예열한 뒤 식용유 1작은술을 둘러요.',
          '고기나 해산물이 있다면 먼저 넣어 3~4분 볶아 겉면 색이 완전히 변할 때까지 익혀요.',
          '채소와 양파를 넣고 중불에서 3분 더 볶아요.',
          '간장 1큰술과 물 1큰술을 넣고 중약불로 줄여 1~2분 더 볶아요.',
          '재료 가운데를 잘라 생고기·투명한 해산물 부분이 남아 있지 않으면 완성이에요.'
        ]
      };
    }

    if(/구이$|구이\b/.test(d)){
      const base = ingredientHints.length ? ingredientHints : ['주재료 1~2토막'];
      return {
        time:'약 12분', tools:'프라이팬 1개',
        ingredients:[...base,'식용유 1작은술'],
        steps:[
          '주재료 표면의 물기를 키친타월로 꼼꼼히 닦아요.',
          '프라이팬을 중약불로 1분 예열하고 식용유 1작은술을 얇게 펴요.',
          '재료를 올리고 한 면을 4~5분 익혀요. 중간에 자꾸 뒤집지 마세요.',
          '뒤집어서 3~4분 더 익혀요.',
          '가운데를 갈라 속까지 불투명하게 익었는지 확인해요.',
          '생선이라면 아이 몫은 살을 잘게 떼면서 가시를 손으로 한 번 더 확인해요.'
        ]
      };
    }

    if(/무침$|무침\b/.test(d)){
      const base = ingredientHints.length ? ingredientHints : ['주재료 150g'];
      return {
        time:'약 8분', tools:'냄비 1개 + 볼 1개',
        ingredients:[...base,'참기름 1/2작은술','깨 1작은술','소금 아주 조금'],
        steps:[
          '주재료는 아이가 먹기 좋은 크기로 손질해요.',
          '끓는 물에 넣어 1분 30초~3분 데쳐요. 잎채소는 1분 30초, 콩나물은 3분 정도예요.',
          '찬물에 한 번 헹군 뒤 손으로 물기를 꼭 짜거나 체에서 충분히 빼요.',
          '참기름 1/2작은술, 깨 1작은술, 소금 아주 조금을 넣고 20초 정도 가볍게 버무려요.',
          '아이용은 짠맛이 거의 느껴지지 않을 정도면 충분해요.'
        ]
      };
    }

    if(/조림$|조림\b/.test(d)){
      const base = ingredientHints.length ? ingredientHints : ['주재료 180g'];
      return {
        time:'약 20분', tools:'냄비 또는 깊은 프라이팬 1개',
        ingredients:[...base,'간장 1.5큰술','물 150ml','올리고당 1작은술'],
        steps:[
          '주재료는 아이 한입 크기로 썰어요.',
          '팬에 주재료를 넣고 중불에서 3~4분 먼저 익혀요.',
          '간장 1.5큰술, 물 150ml, 올리고당 1작은술을 섞어 부어요.',
          '끓기 시작하면 중약불로 줄이고 뚜껑을 덮어 8~10분 익혀요.',
          '뚜껑을 열고 2분 더 졸여 국물이 바닥에 자작하게 남으면 불을 꺼요.',
          '고기라면 가운데를 잘라 분홍빛이 남지 않았는지 확인해요.'
        ]
      };
    }

    if(/찜$|찜\b/.test(d)){
      const base = ingredientHints.length ? ingredientHints : ['주재료 150g'];
      return {
        time:'약 15분', tools:'냄비 또는 찜기 1개',
        ingredients:[...base,'물 200ml'],
        steps:[
          '주재료는 아이 한입 크기로 썰어요.',
          '냄비에 물 200ml를 넣고 찜기 또는 내열 접시를 올려 센불로 끓여요.',
          '김이 오르면 재료를 올리고 뚜껑을 덮어요.',
          '중불로 줄여 8~10분 익혀요.',
          '젓가락으로 찔렀을 때 쉽게 들어가고, 고기·해산물은 속까지 완전히 익으면 완성이에요.'
        ]
      };
    }

    return {
      time:'약 15분', tools:'냄비 또는 프라이팬 1개',
      ingredients:[...(ingredientHints.length?ingredientHints:['주재료 150g']),'식용유 또는 물 약간'],
      steps:[
        '주재료는 아이 한입 크기인 1~1.5cm 정도로 썰어요.',
        '조리도구를 중불로 1분 예열한 뒤 필요한 경우 식용유 1작은술을 사용해요.',
        '주재료를 넣고 3~5분 익혀 겉면 색이 충분히 변하게 해요.',
        '물을 쓰는 요리라면 100~150ml를 넣고 중약불에서 5분 더 익혀요.',
        '가운데를 잘라 생재료 느낌이 남지 않았는지 확인해요.',
        '아이 몫을 먼저 덜고, 어른 간은 그 뒤에 추가해요.'
      ]
    };
  }


  function currentSaltPreference(){
    return document.getElementById('saltPreference')?.value
      || savedProfile?.saltPreference
      || '일반';
  }

  function adaptGuideForSalt(guide){
    const mode=currentSaltPreference();
    if(mode==='일반') return guide;

    const g={
      ...guide,
      ingredients:[...(guide.ingredients||[])],
      steps:[...(guide.steps||[])]
    };

    const adjustText=(text)=>{
      let t=text;
      if(mode==='싱겁게'){
        t=t.replace(/간장 1\.5큰술/g,'간장 3/4큰술부터')
           .replace(/간장 1큰술/g,'간장 1/2큰술부터')
           .replace(/국간장 1작은술/g,'국간장 1/2작은술부터')
           .replace(/된장 1큰술/g,'된장 1/2큰술부터')
           .replace(/소금 한 꼬집/g,'소금 아주 작은 한 꼬집')
           .replace(/소금 아주 조금/g,'소금은 생략하거나 아주 조금');
      }else if(mode==='저염식'){
        t=t.replace(/간장 1\.5큰술/g,'간장 1/2큰술부터')
           .replace(/간장 1큰술/g,'간장 1/3큰술부터')
           .replace(/국간장 1작은술/g,'국간장 1/3작은술부터')
           .replace(/된장 1큰술/g,'된장 1/3~1/2큰술부터')
           .replace(/소금 한 꼬집/g,'소금은 우선 생략')
           .replace(/소금 아주 조금/g,'소금은 우선 생략');
      }
      return t;
    };

    g.ingredients=g.ingredients.map(adjustText);
    g.steps=g.steps.map(adjustText);

    const prefix = mode==='저염식'
      ? '저염식 설정이에요. 양념은 표시된 양보다 적게 시작하고, 아이 몫을 먼저 덜어주세요.'
      : '싱겁게 설정이에요. 양념은 적게 시작하고 마지막에 필요할 때만 조금 더해요.';
    g.steps=[prefix,...g.steps];
    return g;
  }

  function recipeHTML(meal){
    const dishes=splitDishes(meal.title).filter(x=>x!=='쌀밥');
    const cards=dishes.map(d=>{
      const key=Object.keys(dishGuides).find(k=>d===k);
      const guide=adaptGuideForSalt(key ? dishGuides[key] : smartBeginnerGuide(d));
      const video=videoForDish(d);
      return `<div class="recipeDish">
        <div class="recipeDishHead"><b>${esc(d)}</b><span>${guide.time}</span></div>
        <div class="recipeMeta">임시 초보 조리 가이드 · 출처 검증 전</div><div class="recipeMeta">준비물 · ${guide.tools}</div>
        <div class="recipeIngredients"><strong>재료</strong> ${esc(guide.ingredients.join(' · '))}</div>
        <ol>${guide.steps.map(s=>`<li>${esc(s)}</li>`).join('')}</ol>
        <a class="videoBtn ${video.curated?'curated':'searchOnly'}" href="${video.url}" target="_blank" rel="noopener">
          <span class="videoIcon">▶</span>
          <span><b>${video.curated?'기존 추천 영상 열기':'유튜브에서 쉬운 영상 찾기'}</b>
          <small>${video.channel} · ${video.why}</small></span>
        </a>
      </div>`;
    }).join('');
    return `<details class="recipeBox">
      <summary>🍳 요리 초보용 레시피 · 영상 보기</summary>
      <div class="recipeInner">
        <div class="recipeNote"><b>요리 초보 엄마 기준</b>으로 양 · 불 세기 · 시간 · 익었는지 확인하는 방법까지 적었어요.<br><b>현재 간 설정 · ${currentSaltPreference()}</b>. 기준은 아이 1명 + 어른 1명 정도예요.<br><span class="videoRule">직접 입력한 메뉴의 안내는 요리 이름으로 추정한 임시 안내입니다. 검증된 레시피가 아니며 기존 영상의 내용·접근 여부도 다시 확인이 필요해요.</span></div>
        ${cards}
      </div>
    </details>`;
  }

  function extractFoodTokens(text){
    const s=(text||'');
    const dictionary=[
      '쌀','흑미','잡곡','밥','빵','식빵','우동','면','시리얼','감자','고구마','떡',
      '소고기','불고기','돼지고기','제육','삼겹살','닭고기','닭안심','닭다리살',
      '고등어','갈치','가자미','연어','삼치','오징어','새우','어묵','두부','달걀','계란','유부','떡갈비','만두',
      '우유','요구르트','요거트','치즈',
      '콩나물','숙주','애호박','브로콜리','버섯','당근','양파','깻잎','시금치','오이','무','단호박',
      '파프리카','배추','김치','미역','김','멸치',
      '사과','배','포도','복숭아','바나나','귤','오렌지','키위','수박','멜론','과일'
    ];
    return [...new Set(dictionary.filter(x=>s.includes(x)))];
  }

  function weeklyNutrition(days){return NI.weekly(days);}

  function weeklyNutritionHTML(days){
    const {scores:s,foods}=weeklyNutrition(days);
    const items=[
      ['🍚','탄수화물','carb','에너지원'],
      ['🥩','단백질','protein','성장·회복'],
      ['🥑','지방','fat','에너지·흡수'],
      ['🥬','비타민','vitamin','채소·과일'],
      ['🦴','무기질','mineral','칼슘·철·아연 등']
    ];

    const rows=items.map(([icon,label,key,desc])=>{
      const count=Math.min(7,s[key]);
      const pct=count/7*100;
      const status=`7일 중 ${count}일 등장`;
      const foodText=foods[key].length ? foods[key].slice(0,8).join(' · ') : '아직 기록된 식품이 적어요';
      return `<div class="nutriRow">
        <div class="nutriTop">
          <div class="nutriName"><span class="nutriIcon">${icon}</span><b>${label}</b></div>
          <span>${status}</span>
        </div>
        <div class="nutriTrack"><div class="nutriFill ${key}" style="width:${pct}%"></div></div>
        <div class="nutriFoods"><b>이번 주 만난 식품</b> · ${foodText}</div>
      </div>`;
    }).join('');

    const allCounts=Object.values(s);
    const strong=allCounts.filter(x=>x>=4).length;
    const headline='이번 주 식사에 등장한 식품';

    return `<div class="weeklyCard">
      <div class="weeklyLegend">
        <div>
          <div class="weeklyEyebrow">THIS WEEK · 5대 영양소</div>
          <div class="weeklyTitle">${headline}</div>
        </div>
        <span class="weeklyBadge">5대 영양소 ✓</span>
      </div>
      <div class="weeklySub">기록한 날은 <b>실제로 먹은 식사</b>, 아직 기록하지 않은 날은 저장된 계획을 사용해요. 기록도 계획도 없는 날은 비워 두며 미래 계획도 포함돼요. 아래 색 막대는 정확한 섭취율이 아니라 <b>이번 주 월요일부터 일요일까지 해당 식품군이 등장한 날 수</b>를 표현해요.</div>
      ${rows}
      <div class="weeklyReassure"><b>하루 한 끼보다 한 주의 흐름을 봐요.</b><br>비어 있는 영양소가 있으면 다음 식사에서 한 가지만 가볍게 이어주면 돼요.</div>
    </div>`;
  }

  function institutionActive(dayKey){
    const profile=JSON.parse(MN.store.getItem('mealnote.childProfile')||'{}');
    return (profile.institutionMeals||'있음')==='있음' && !homeAllDay[dayKey];
  }

  function breakfastInfo(dayIndex=0){
    const title=chooseBreakfast(dayIndex);
    const r=breakfastLibrary.find(x=>x.title===title);
    if(!r && title==='달걀 주먹밥 + 우유 + 과일'){
      return {title,missing:['쌀','달걀','우유','과일'].filter(x=>!has(x))};
    }
    if(!r) return {title,missing:[]};
    return {
      title,
      missing:[...new Set([...(r.req||[]),...(title.includes('우유')?['우유']:[]),...(title.includes('과일')?['과일']:[])])].filter(x=>!has(x))
    };
  }

  function shoppingHTML(missingItems){
    const unique=[...new Set(missingItems.filter(Boolean))];
    const rows=items=>items.map(item=>`<label class="shoppingItem"><input type="checkbox" data-shopping="${esc(item)}" ${MN.shoppingChecked(item)?'checked':''}><span>${esc(item)}</span></label>`).join('');
    return '<div class="shoppingHead">필요한 재료 '+unique.length+'가지</div><div class="shoppingList">'+rows(unique.slice(0,8))+'</div>'+(unique.length>8?'<details><summary>추가로 필요한 '+(unique.length-8)+'가지 보기</summary><div class="shoppingList">'+rows(unique.slice(8))+'</div></details>':'')+'<p class="muted">소금·간장·된장·기름 등 기본 양념은 별도로 확인해 주세요. 직접 정한 메뉴의 재료는 자동 계산하지 않아요.</p>';
  }

function generatePlans(){
    if(!window.ME)return;
    const history=MN.recentMeals().map(x=>({...customMealObject(x),protein:[...schoolProteinTypes(x)][0]||'custom'}));
    const state=MN.snapshot(),plans=[];
    for(let i=0;i<5;i++){
      const date=MN.dateKey(i),d=state.days[date]||{};
      const enabled=(state.profile?.institutionMeals||'있음')==='있음'&&!d.home;
      const lunch=enabled?null:chooseMeal(i,'',history);if(lunch)history.push(lunch);
      const candidates=PN.options(date,state,history.map(x=>x.title));
      const dinner={title:candidates[0].dishes.join(' · '),missing:candidates[0].missing};history.push(dinner);
      plans.push({breakfast:breakfastInfo(i),lunch,dinner,institution:enabled?d.school||'':''});
    }
    ME.ensure(plans);
    window.dispatchEvent(new Event('mealnote:render'));
  }
  render();renderPicker();renderPreferredIngredients();generatePlans();
