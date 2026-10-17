'use strict';
const STORAGE_KEY = 'slowday.personal.v1';
const GAME_PROJECTS = Object.freeze([
  {id:'taprush',name:'taprush',platform:'TK'},
  {id:'tkcarsurvival',name:'TKCarSurvival',platform:'TK'},
  {id:'pinrush',name:'pinrush',platform:'TK'}
]);
const PERSONAL_GOALS = Object.freeze([
  {id:'room',title:'收拾房间',hint:'收拾完成后，给自己勾一下。'},
  {id:'trainerCertificate',title:'11 月考取健身教练证书',hint:'目标时间：2026 年 11 月'}
]);
const PUBLISHED_GAME_TARGET = 10;
const paths = {
  sun:'<circle cx="12" cy="12" r="4"/><path d="M12 2v2m0 16v2M2 12h2m16 0h2M5 5l1.5 1.5m11 11L19 19M5 19l1.5-1.5m11-11L19 5"/>',
  home:'<path d="m3 10 9-7 9 7v10a1 1 0 0 1-1 1h-5v-8H9v8H4a1 1 0 0 1-1-1Z"/>',
  chart:'<path d="M4 4v16h17M8 15v-4m5 4V7m5 8v-6"/>',
  game:'<path d="M7 8h10c3 0 4 3 4 8 0 4-3 4-5 0H8c-2 4-5 4-5 0 0-5 1-8 4-8ZM7 10v5m-2.5-2.5h5M15 12h.01M18 14h.01M12 8V4"/>',
  settings:'<path d="m10 3-.5 2-2 .9-1.8-.6L3.5 9l1.5 1.4v2.4L3.5 14l2.2 3.8 1.8-.6 2 .9.5 2h4l.5-2 2-.9 1.8.6 2.2-3.8-1.5-1.2v-2.4L20.5 9l-2.2-3.7-1.8.6-2-.9-.5-2Z"/><circle cx="12" cy="11.5" r="3"/>',
  water:'<path d="M12 3s-6 7-6 11a6 6 0 0 0 12 0c0-4-6-11-6-11Z"/><path d="M9 15a3 3 0 0 0 3 3"/>',
  meal:'<path d="M5 3v7m3-7v7m-6-7v7a3 3 0 0 0 6 0M5 13v8m13 0V3c-4 0-5 6-5 10h5"/>',
  exercise:'<path d="M7 7H4v10h3V7Zm13 0h-3v10h3V7ZM7 12h10M2 10v4m20-4v4"/>',
  moon:'<path d="M20.5 14A8.7 8.7 0 0 1 10 3.5 8.8 8.8 0 1 0 20.5 14Z"/>',
  pill:'<path d="m5 11 6-6a5 5 0 0 1 7 7l-6 6a5 5 0 0 1-7-7ZM8 8l7 7"/>',
  skin:'<path d="M8 8h8v13H8zM10 8V4h5m-5 0h7V2M8 13h8"/>',
  leaf:'<path d="M5 20C4 7 11 3 21 3c0 10-4 17-16 17ZM5 20 16 9"/>',
  check:'<path d="m5 12 4 4L19 6"/>', plus:'<path d="M12 5v14M5 12h14"/>',
  left:'<path d="m14 6-6 6 6 6"/>', right:'<path d="m10 6 6 6-6 6"/>',
  arrow:'<path d="M4 12h15m-5-5 5 5-5 5"/>', close:'<path d="m6 6 12 12M6 18 18 6"/>',
  edit:'<path d="m14 4 6 6M4 20l5-1L20 8a2 2 0 0 0-6-4L3 15l-1 6Z"/>',
  undo:'<path d="M4 5v6h6M4 11a8 8 0 1 1 1 8"/>',
  play:'<path d="m8 4 12 8-12 8Z"/>', pause:'<path d="M8 5v14M16 5v14"/>',
  clock:'<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
  journal:'<path d="M5 3h14v18H5zM8 7h8M8 11h8M8 15h4"/>',
  trash:'<path d="M3 6h18M9 6V3h6v3M6 6l1 15h10l1-15M10 10v6m4-6v6"/>',
  download:'<path d="M12 3v12m-4-4 4 4 4-4M4 16v5h16v-5"/>',
  upload:'<path d="M12 16V4m-4 4 4-4 4 4M4 16v5h16v-5"/>',
  star:'<path d="m12 3 2.8 5.6 6.2.9-4.5 4.4 1.1 6.1-5.6-2.9-5.6 2.9 1.1-6.1L3 9.5l6.2-.9Z"/>'
};
const icon = n => `<svg class="icon" viewBox="0 0 24 24" aria-hidden="true">${paths[n] || paths.leaf}</svg>`;
const esc = s => String(s ?? '').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const uid = () => globalThis.crypto?.randomUUID?.() || `${Date.now()}-${Math.random().toString(36).slice(2)}`;
const localDate = (d = new Date()) => `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
const shiftDate = (key, amount) => { const d = new Date(key+'T12:00:00'); d.setDate(d.getDate()+amount); return localDate(d); };
const validDate = key => /^\d{4}-\d{2}-\d{2}$/.test(key) && !Number.isNaN(new Date(key+'T12:00:00').getTime()) && localDate(new Date(key+'T12:00:00')) === key;
const ACTION_PERIOD = Object.freeze({start:'2026-10-17',review:'2026-12-17'});
function actionPeriodStatus(today=localDate()){
  const ordinal=key=>Date.parse(key+'T00:00:00Z')/86400000;
  const totalDays=ordinal(ACTION_PERIOD.review)-ordinal(ACTION_PERIOD.start);
  const offset=ordinal(today)-ordinal(ACTION_PERIOD.start);
  const elapsed=Math.max(0,Math.min(totalDays,offset));
  return {totalDays,elapsed,remaining:totalDays-elapsed,currentDay:Math.min(totalDays,Math.max(1,offset+1)),phase:offset<0?'upcoming':offset>=totalDays?'review':'active',untilStart:Math.max(0,-offset),reviewToday:today===ACTION_PERIOD.review};
}
const CHECKLIST = [
  {key:'exercise',icon:'exercise',name:'健身',hint:'运动、散步或拉伸，动过就记一笔'},
  {key:'meals',icon:'meal',name:'吃饭',hint:'好好吃过一餐，也是在照顾自己'},
  {key:'sleep',icon:'moon',name:'睡觉',hint:'给身体留过休息的时间'},
  {key:'supplements',icon:'pill',name:'补剂',hint:'按已有安排使用了再勾选，无需每天必选'},
  {key:'skin',icon:'skin',name:'护肤',hint:'完成了自己的护肤步骤'},
  {key:'water',icon:'water',name:'喝水',hint:'记得喝过水，就轻轻勾一下'},
  {key:'game',icon:'game',name:'开发小游戏',hint:'推进了一小步，就算做过'}
];
const blankDay = () => ({checks:{},energy:null,focus:{text:'',done:false},water:[],meals:{breakfast:false,lunch:false,dinner:false},exercise:[],sleep:null,supplements:[],skin:{am:false,pm:false},note:'',sessions:[]});
const blankState = () => ({version:1,settings:{name:'',waterGoal:0,projectName:'我的第一个小游戏'},gameChecks:{},goals:{room:false,trainerCertificate:false,publishedGames:0},supplementPlan:[],tasks:[],days:{},timer:null});
function validateState(raw){
  if(!raw || raw.version!==1 || typeof raw.days!=='object' || !raw.days || Array.isArray(raw.days)) throw new Error('不是慢慢来的有效备份文件');
  const s=blankState(); const text=(v,n=300)=>typeof v==='string'?v.slice(0,n):'';
  const number=(v,min,max)=>typeof v==='number' && Number.isFinite(v) && v>=min && v<=max;
  for(const {id} of GAME_PROJECTS){if(typeof raw.gameChecks?.[id]==='boolean')s.gameChecks[id]=raw.gameChecks[id];}
  for(const {id} of PERSONAL_GOALS)s.goals[id]=raw.goals?.[id]===true;
  if(Number.isInteger(raw.goals?.publishedGames)&&number(raw.goals.publishedGames,0,PUBLISHED_GAME_TARGET))s.goals.publishedGames=raw.goals.publishedGames;
  s.settings={name:text(raw.settings?.name,30),waterGoal:number(raw.settings?.waterGoal,0,10000)?raw.settings.waterGoal:0,projectName:text(raw.settings?.projectName,80)||'我的第一个小游戏'};
  s.supplementPlan=(Array.isArray(raw.supplementPlan)?raw.supplementPlan:[]).slice(0,100).filter(x=>x&&typeof x.id==='string'&&x.name).map(x=>({id:text(x.id,100),name:text(x.name,50),note:text(x.note,120)}));
  s.tasks=(Array.isArray(raw.tasks)?raw.tasks:[]).slice(0,2000).filter(x=>x&&typeof x.id==='string'&&x.title).map(x=>({id:text(x.id,100),title:text(x.title,150),status:['todo','doing','done'].includes(x.status)?x.status:'todo',createdAt:text(x.createdAt,40)}));
  const entries=Object.entries(raw.days); if(entries.length>10000)throw new Error('备份记录过多');
  for(const [key,v] of entries){
    if(!validDate(key)||!v||typeof v!=='object')throw new Error('备份中有无效日期记录');
    const d=blankDay();d.energy=['low','steady','good'].includes(v.energy)?v.energy:null;
    for(const {key:checkKey} of CHECKLIST){if(typeof v.checks?.[checkKey]==='boolean')d.checks[checkKey]=v.checks[checkKey];}
    d.focus={text:text(v.focus?.text,150),done:v.focus?.done===true};d.note=text(v.note,3000);
    d.water=(Array.isArray(v.water)?v.water:[]).slice(0,1000).filter(x=>x&&number(x.ml,1,3000)).map(x=>({id:text(x.id,100)||uid(),ml:x.ml,time:text(x.time,40)}));
    for(const k of ['breakfast','lunch','dinner'])d.meals[k]=v.meals?.[k]===true;
    for(const k of ['am','pm'])d.skin[k]=v.skin?.[k]===true;
    d.exercise=(Array.isArray(v.exercise)?v.exercise:[]).slice(0,100).filter(x=>x&&number(x.minutes,1,720)).map(x=>({id:text(x.id,100)||uid(),type:text(x.type,50),minutes:x.minutes}));
    if(v.sleep&&/^([01]\d|2[0-3]):[0-5]\d$/.test(v.sleep.bed)&&/^([01]\d|2[0-3]):[0-5]\d$/.test(v.sleep.wake))d.sleep={bed:v.sleep.bed,wake:v.sleep.wake};
    d.supplements=(Array.isArray(v.supplements)?v.supplements:[]).filter(x=>typeof x==='string').slice(0,100);
    d.sessions=(Array.isArray(v.sessions)?v.sessions:[]).slice(0,200).filter(x=>x&&number(x.seconds,1,36000)).map(x=>({id:text(x.id,100)||uid(),seconds:x.seconds,title:text(x.title,150),time:text(x.time,40)}));
    s.days[key]=d;
  }
  if(raw.timer && validDate(raw.timer.day) && number(raw.timer.totalSec,60,3600) && number(raw.timer.remainingSec,0,3600) && (raw.timer.endAt===null||number(raw.timer.endAt,0,1e15)))s.timer={day:raw.timer.day,totalSec:raw.timer.totalSec,remainingSec:raw.timer.remainingSec,endAt:raw.timer.endAt,title:text(raw.timer.title,150)};
  return s;
}
let state, storageBlocked=false, initialError='',rawBackup='';
try{rawBackup=localStorage.getItem(STORAGE_KEY)||'';state=rawBackup?validateState(JSON.parse(rawBackup)):blankState();}catch(error){state=blankState();storageBlocked=true;initialError='无法读取本地记录。请先在设置中导出原始备份，再恢复数据。';}
let selectedDate=localDate();
let currentCalendarDate=localDate();
let view=['today','history','projects','goals','settings'].includes(location.hash.slice(1))?location.hash.slice(1):'today';
let timerPreset=15,toastTimeout,detailRecordsOpen=false,projectDetailsOpen=!!state.timer;
const main=document.querySelector('#main'),dialog=document.querySelector('#dialog');
function day(key=selectedDate){if(!state.days[key])state.days[key]=blankDay();return state.days[key];}
function save(){
  if(storageBlocked){setSaved('保存暂停，请先导出备份',true);return false;}
  try{localStorage.setItem(STORAGE_KEY,JSON.stringify(state));setSaved('已在此设备保存');return true;}
  catch(error){setSaved('保存失败，请导出备份',true);toast('浏览器无法保存记录，请到设置导出备份');return false;}
}
function setSaved(message,error=false){document.querySelector('#saved-state').innerHTML=`<i style="${error?'background:#c99b78':''}"></i>${esc(message)}`;}
function toast(message){const el=document.querySelector('#toast');el.textContent=message;el.classList.add('show');clearTimeout(toastTimeout);toastTimeout=setTimeout(()=>el.classList.remove('show'),3000);}
const navItems=[['today','home','今日'],['goals','star','目标'],['history','chart','回顾'],['projects','game','小游戏'],['settings','settings','设置']];
function renderNav(){
  const navHtml=mobile=>navItems.map(([key,i,label])=>`<button class="${mobile?'':'nav-button '}${view===key?'active':''}" data-action="nav" data-view="${key}" ${view===key?'aria-current="page"':''}>${icon(i)}<span>${label}</span></button>`).join('');
  document.querySelector('#nav').innerHTML=navHtml(false);document.querySelector('#mobile-nav').innerHTML=navHtml(true);
  document.querySelector('#page-label').textContent=navItems.find(x=>x[0]===view)[2];
  document.querySelector('#settings-icon').innerHTML=icon('settings');
  document.querySelector('#profile-name').textContent=state.settings.name||'我的小天地';document.querySelector('#avatar').textContent=state.settings.name?.slice(0,1)||'我';
}
function render(){renderNav();main.innerHTML=({today:renderToday,history:renderHistory,projects:renderProjects,goals:renderGoals,settings:renderSettings})[view]();if(storageBlocked)setSaved('保存暂停，请先导出备份',true);}
function refreshDailyDate(){
  const now=localDate();if(now===currentCalendarDate||dialog.open)return;
  const previous=currentCalendarDate;currentCalendarDate=now;
  if(selectedDate===previous){selectedDate=now;if(view==='today')render();}
}
function navigate(next){if(!navItems.some(x=>x[0]===next))return;view=next;location.hash=next;render();window.scrollTo({top:0,behavior:'instant'});}
const dateControls=()=>`<div class="date-nav"><button data-action="date-prev" aria-label="前一天">${icon('left')}</button><input type="date" aria-label="记录日期" id="record-date" value="${selectedDate}" max="${localDate()}" min="2000-01-01"><button data-action="date-next" aria-label="后一天" ${selectedDate>=localDate()?'disabled':''}>${icon('right')}</button><button class="date-today" data-action="date-today">今天</button></div>`;
function titleBlock(title,sub,controls=''){return `<div class="page-title-row"><div><div class="eyebrow">MY LITTLE EVERYDAY</div><h1>${esc(title)}</h1><p class="page-subtitle">${esc(sub)}</p></div>${controls}</div>`;}
function renderActionPeriod(compact=false){
  const p=actionPeriodStatus(),active=p.phase==='active',review=p.phase==='review';
  const label=active?`两个月行动期 · 第 ${p.currentDay} 天`:review?'两个月行动期 · 到复盘时间了':'两个月行动期 · 即将开始';
  const count=active?p.remaining:review?'✓':p.untilStart;
  const caption=active?'天后复盘':review?(p.reviewToday?'今天复盘':'可以复盘了'):'天后开始';
  const heading=review?'先看看，已经做过的事。':'这两个月，先做事。';
  return `<section class="action-period ${compact?'compact':''}" data-action-period aria-label="两个月行动期"><div class="period-top"><div class="period-copy"><div class="period-eyebrow">${icon('leaf')}${label}</div><h2>${heading}</h2><p>${review?'给这段时间一个温和的回顾，再决定下一步。':'今天只做下一步，暂不评判自己。'}</p></div><div class="period-count"><strong>${count}</strong><span>${caption}</span></div></div><div class="period-dates"><span><time datetime="2026-10-17">2026.10.17</time> 开始</span><span><time datetime="2026-12-17">2026.12.17</time> 复盘</span></div><progress value="${p.elapsed}" max="${p.totalDays}" aria-label="行动期时间进度，已过 ${p.elapsed} 天，共 ${p.totalDays} 天"></progress><div class="period-bottom"><span>${review?'到这里也值得记下来。':'一次只做一件事 · 做到停点就收工 · 允许休息'}</span>${review?`<button class="text-button" data-action="nav" data-view="history">看看记录 ${icon('arrow')}</button>`:'<span class="period-progress-label">时间进度</span>'}</div></section>`;
}
let periodRenderedDate=localDate();
function refreshActionPeriod(){
  if(periodRenderedDate===localDate())return;
  periodRenderedDate=localDate();
  document.querySelectorAll('[data-action-period]').forEach(el=>{el.outerHTML=renderActionPeriod(el.classList.contains('compact'));});
}
const heroArt=`<svg class="hero-art" viewBox="0 0 270 220" aria-hidden="true"><defs><linearGradient id="arch" x1="0" y1="0" x2="0" y2="1"><stop stop-color="#f8faf0"/><stop offset="1" stop-color="#eff3e6"/></linearGradient></defs><path d="M105 196V99a58 58 0 0 1 116 0v97" fill="url(#arch)"/><circle cx="194" cy="76" r="24" fill="#e6c88d" opacity=".7"/><path d="M105 150c35-20 71-10 116-3v49H105Z" fill="#e0e7d0"/><path d="M105 167c32-16 66-11 116-4v33H105Z" fill="#d0dcc1"/><path d="M163 42v152M106 115h115" stroke="#d5deca" stroke-width="2"/><ellipse cx="153" cy="202" rx="98" ry="10" fill="#9daa8430"/><path d="M92 200v-77M91 151c-29-7-40-32-37-51 25 0 40 20 37 51Z" fill="#a0b28b"/><path d="M91 165c29-5 43-23 44-42-27-4-43 16-44 42Z" fill="#8ba27c"/><path d="M92 136c-17-17-17-42-7-55 21 9 25 32 7 55Z" fill="#80976c"/><path d="M71 164h43l-6 38H77Z" fill="#c9ac8f"/><path d="M71 165h43v6H71Z" fill="#d5bda5"/><rect x="145" y="189" width="74" height="11" rx="3" fill="#b6c5a1"/><rect x="153" y="179" width="68" height="10" rx="3" fill="#f8f9ef"/><path d="M171 147h31v23a10 10 0 0 1-10 10h-11a10 10 0 0 1-10-10Z" fill="#f9f5e9"/><path d="M202 152h5a8 8 0 0 1 0 16h-5" stroke="#f9f5e9" stroke-width="5" fill="none"/><ellipse cx="186" cy="147" rx="15" ry="3" fill="#d4bc94"/><path d="M184 137c-8-7 7-11 0-18" fill="none" stroke="#aebb993d" stroke-width="2" stroke-linecap="round"/><path d="m44 49 2 5 5 2-5 2-2 5-2-5-5-2 5-2Z" fill="#afbc98"/><circle cx="234" cy="129" r="2" fill="#c4ccaf"/></svg>`;
const totalWater=d=>d.water.reduce((s,x)=>s+x.ml,0);
const minutes=d=>Math.round(d.sessions.reduce((s,x)=>s+x.seconds,0)/60);
const sleepHours=s=>{if(!s)return 0;const t=v=>v.split(':').reduce((h,m)=>+h*60+(+m));return ((t(s.wake)-t(s.bed)+1440)%1440)/60;};
function inferredChecks(d){return {exercise:!!d?.exercise?.length,meals:Object.values(d?.meals||{}).some(Boolean),sleep:!!d?.sleep,supplements:!!d?.supplements?.length,skin:Object.values(d?.skin||{}).some(Boolean),water:!!d?.water?.length,game:!!d?.sessions?.length};}
function isChecked(d,key){return typeof d?.checks?.[key]==='boolean'?d.checks[key]:inferredChecks(d)[key];}
const entryCount=d=>d?CHECKLIST.filter(x=>isChecked(d,x.key)).length:0;
const hasRecord=d=>d&&(entryCount(d)>0||Object.values(inferredChecks(d)).some(Boolean)||d.energy||d.focus.text||d.focus.done||d.note);
function renderChecklist(d){
  const count=entryCount(d);
  return `<section class="daily-checklist" aria-label="每日勾选清单"><div class="section-title"><div><h2>今天做过的事</h2><p class="checklist-hint">做了就勾选，不必每项都完成。</p></div><span id="checklist-summary" role="status" aria-live="polite">${count?`已记下 ${count} 件小事`:'做多少，记多少'}</span></div><div class="checklist-grid">${CHECKLIST.map(item=>{const checked=isChecked(d,item.key);return `<label class="checklist-row ${item.key} ${checked?'checked':''}"><input type="checkbox" data-daily-check="${item.key}" aria-label="${item.name}" ${checked?'checked':''}><span class="card-icon">${icon(item.icon)}</span><span class="checklist-copy"><strong>${item.name}</strong><small>${item.hint}</small></span><span class="checklist-state" aria-hidden="true">${checked?'已做过':'勾选'}</span></label>`;}).join('')}</div></section>`;
}
function cardHeader(i,title,label,action=''){return `<div class="card-header"><div class="card-icon">${icon(i)}</div><div><div class="card-title">${title}</div><div class="card-label">${label}</div></div>${action}</div>`;}
function checkChip(action,key,label,checked){return `<button class="check-chip ${checked?'checked':''}" data-action="${action}" data-key="${key}" aria-pressed="${checked}"><span class="check-circle">${checked?'✓':''}</span>${label}</button>`;}
function renderToday(){
  const d=day(),w=totalWater(d),goal=state.settings.waterGoal,mealCount=Object.values(d.meals).filter(Boolean).length,ex=d.exercise.reduce((a,x)=>a+x.minutes,0),isToday=selectedDate===localDate();
  const week=new Date(selectedDate+'T12:00:00').toLocaleDateString('zh-CN',{month:'long',day:'numeric',weekday:'long'});
  const energyText={low:'今天轻一点，留些时间给自己。',steady:'找到舒服的节奏，慢慢往前。',good:'有余力真好，也记得适时休息。'};
  const nextTask=state.tasks.find(t=>t.status==='doing')||state.tasks.find(t=>t.status==='todo');
  return titleBlock(isToday?(state.settings.name?`${state.settings.name}，今天好`:'今天，也照顾好自己'):week,isToday?week:'这一天的小事，都可以在这里补记。',dateControls())+
    (!isToday?`<div class="pause-banner">正在查看 ${esc(selectedDate)} 的记录。<button class="text-button" data-action="date-today">回到今天 ${icon('arrow')}</button></div>`:'')+
    renderChecklist(d)+
    `<section class="welcome-grid" aria-label="每日问候">${renderActionPeriod()}<div class="energy-card"><h2 class="small-heading">${icon('sun')} 今天的能量</h2><p class="hint">按现在的感觉选就好</p><div class="energy-options">${[['low','◔','轻一点'],['steady','◑','刚刚好'],['good','☀','有余力']].map(([key,sign,name])=>`<button class="energy-option ${d.energy===key?'selected':''}" data-action="energy" data-key="${key}" aria-pressed="${d.energy===key}"><span aria-hidden="true">${sign}</span>${name}</button>`).join('')}</div><p class="energy-note">${d.energy?energyText[d.energy]:'每一种状态，都值得被照顾。'}</p></div></section>
    <section class="focus-card" aria-label="今日重点"><div class="focus-badge">${icon(d.focus.done?'check':'star')}</div><div class="focus-details"><div class="focus-eyebrow">${d.focus.done?'今天有了一个小进展':'今日重点 · 一件就好'}</div><h3 class="${d.focus.done?'done':''}">${esc(d.focus.text||'今天，你想把精力留给什么？')}</h3></div><button class="text-button" data-action="focus-edit" aria-label="${d.focus.text?'修改今日重点':'设置今日重点'}">${icon('edit')}${d.focus.text?'修改':''}</button><button class="primary-button" data-action="${d.focus.text?'focus-toggle':'focus-edit'}">${icon(d.focus.done?'undo':d.focus.text?'check':'plus')}${d.focus.done?'撤销完成':d.focus.text?'做好了':'选一件事'}</button></section>
    ${renderGoalsPreview()}
    <details class="optional-records" id="optional-records" ${detailRecordsOpen?'open':''}><summary><span>详细记录（可选）<small>时长、饮水量和日常明细</small></span>${icon('right')}</summary><p class="optional-help">想记得更细时再填写。新增明细会勾选对应事项；取消勾选会保留已有明细。</p><section aria-label="日常明细"><div class="habit-grid">
      <article class="habit-card water">${cardHeader('water','喝点水','STAY HYDRATED',`<button class="text-button" data-action="water-edit">记录</button>`)}<div class="card-stat">${w.toLocaleString()}<small>ml${goal?` / ${goal.toLocaleString()}`:''}</small></div>${goal?`<div class="water-progress" role="progressbar" aria-label="自定饮水目标" aria-valuenow="${w}" aria-valuemin="0" aria-valuemax="${Math.max(w,goal)}"><span style="width:${Math.min(100,w/goal*100)}%"></span></div>`:`<div class="water-dots" aria-hidden="true">${Array.from({length:8},(_,i)=>`<i class="${w>i*250?'filled':''}"></i>`).join('')}</div>`}<div class="card-note">${goal?'按自己设置的目标记录':'今天的饮水记录'}</div><div class="card-actions"><button class="secondary-button" data-action="water-add" data-amount="250">${icon('plus')}250 ml</button><button class="icon-button" data-action="water-undo" aria-label="撤销上一笔饮水记录" ${d.water.length?'':'disabled'}>${icon('undo')}</button></div></article>
      <article class="habit-card meals">${cardHeader('meal','好好吃饭','NOURISH YOURSELF')}<div class="subtle-stat">${mealCount?`记下了 ${mealCount} 餐`:'记得给自己一餐'}</div><div class="check-options">${[['breakfast','早餐'],['lunch','午餐'],['dinner','晚餐']].map(([k,n])=>checkChip('meal',k,n,d.meals[k])).join('')}</div><div class="card-note" style="margin-top:auto;padding-top:14px">吃过了，就轻轻记一下。</div></article>
      <article class="habit-card exercise">${cardHeader('exercise','动一动','MOVE AT YOUR PACE')}<div class="card-stat">${ex||'—'}<small>分钟</small></div><div class="card-note">${d.exercise.length?esc(d.exercise.map(x=>x.type).join(' · ')):'散步、拉伸，或你喜欢的运动'}</div><div class="card-actions"><button class="secondary-button" data-action="exercise-edit">${icon('plus')}记录运动</button></div></article>
      <article class="habit-card sleep">${cardHeader('moon','安稳睡觉','REST & RECHARGE')}<div class="card-stat">${d.sleep?sleepHours(d.sleep).toFixed(1):'—'}<small>小时</small></div><div class="card-note">${d.sleep?`${esc(d.sleep.bed)} 入睡 → ${esc(d.sleep.wake)} 起床`:'留一点时间，好好休息'}</div><div class="card-actions"><button class="secondary-button" data-action="sleep-edit">${icon(d.sleep?'edit':'plus')}${d.sleep?'修改睡眠':'记录睡眠'}</button></div></article>
      <article class="habit-card supplements">${cardHeader('pill','补剂记录','YOUR OWN ROUTINE',`<button class="text-button" data-action="supplements-manage">管理</button>`)}${state.supplementPlan.length?`<div class="supp-list">${state.supplementPlan.map(p=>`<button class="supp-item ${d.supplements.includes(p.id)?'checked':''}" data-action="supplement-toggle" data-id="${esc(p.id)}" aria-pressed="${d.supplements.includes(p.id)}" title="${esc(p.note)}"><span class="check-circle">${d.supplements.includes(p.id)?'✓':''}</span>${esc(p.name)}</button>`).join('')}</div><p class="card-note">点击记录，再点可撤销。</p>`:`<p class="supp-empty">按自己的安排添加</p><p class="card-note">这里只记录你已有的补剂计划</p><div class="card-actions"><button class="secondary-button" data-action="supplement-add">${icon('plus')}添加补剂</button></div>`}</article>
      <article class="habit-card skin">${cardHeader('skin','照顾皮肤','A MOMENT FOR YOU')}<div class="subtle-stat">${d.skin.am&&d.skin.pm?'今天也照顾好了':'给自己一点呵护'}</div><div class="check-options">${checkChip('skin','am','早间',d.skin.am)}${checkChip('skin','pm','晚间',d.skin.pm)}</div><p class="card-note" style="margin-top:auto;padding-top:14px">简单一点，舒服就好。</p></article>
    </div></section></details>
    <section class="bottom-grid"><article class="project-preview"><div class="project-top"><h2 class="project-title">${icon('game')} 做一点小游戏</h2><button class="text-button" data-action="nav" data-view="projects">进入项目 ${icon('arrow')}</button></div><h3>TK · 小游戏</h3><p class="project-next">${GAME_PROJECTS.map(p=>p.name).join(' · ')}</p><div class="project-meta"><span>已完成 ${completedGames()} / ${GAME_PROJECTS.length} 个小游戏</span><span>${isToday?'今日':'当日'}专注 ${minutes(d)} 分钟</span></div></article><article class="journal-card"><div class="project-top"><h2 class="project-title">${icon('journal')} 留一句给自己</h2><span class="hint">随手记</span></div><label class="visually-hidden" for="daily-note">当天随手记</label><textarea id="daily-note" maxlength="3000" placeholder="今天有什么小小的开心？\n或者，只写一句“今天辛苦了”。">${esc(d.note)}</textarea><div class="journal-bottom"><span id="note-status">输入后自动保存</span><span id="note-count">${d.note.length} / 3000</span></div></article></section>`;
}
function recentDays(){return Array.from({length:7},(_,i)=>shiftDate(localDate(),i-6));}
const completedGoals=()=>PERSONAL_GOALS.filter(g=>state.goals[g.id]).length+(state.goals.publishedGames===PUBLISHED_GAME_TARGET?1:0);
function renderGoalsPreview(){
  return `<section class="goals-preview" aria-label="我的目标概览"><div class="section-title"><h2>${icon('star')} 我的目标</h2><button class="text-button" data-action="nav" data-view="goals">查看目标 ${icon('arrow')}</button></div><div class="goals-preview-items">${PERSONAL_GOALS.map(g=>`<div class="goal-preview-item"><span>${g.title}</span><small>${state.goals[g.id]?'已完成':'进行中'}</small></div>`).join('')}<div class="goal-preview-item"><span>小游戏上架 10 个</span><small>${state.goals.publishedGames} / ${PUBLISHED_GAME_TARGET}</small></div></div></section>`;
}
function renderGoals(){
  const n=state.goals.publishedGames,done=n===PUBLISHED_GAME_TARGET;
  return titleBlock('给想做的事，留一个位置','一次推进一点，完成后记下来。')+`<section class="goals-panel" aria-label="个人目标"><div class="section-title"><div><h2>我的目标</h2><p class="checklist-hint">进度长期保存，可以随时调整。</p></div><span id="goals-summary" role="status" aria-live="polite">已完成 ${completedGoals()} / 3</span></div><div class="goals-list">${PERSONAL_GOALS.map(g=>`<label class="checklist-row ${state.goals[g.id]?'checked':''}"><input type="checkbox" data-goal-check="${g.id}" aria-label="${g.title}" ${state.goals[g.id]?'checked':''}><span class="checklist-copy"><strong>${g.title}</strong><small>${g.hint}</small></span><span class="checklist-state">${state.goals[g.id]?'已完成':'勾选完成'}</span></label>`).join('')}<article class="goal-count-card ${done?'checked':''}" id="published-games-card"><div class="goal-count-heading"><div><h3>小游戏上架 10 个</h3><p class="checklist-hint">每上架一个记一笔，数量可调整。</p></div><span class="goal-completion" id="published-games-status">${done?'已完成':'进行中'}</span></div><div class="goal-count-controls"><button type="button" class="secondary-button" data-action="goal-count-down" aria-label="减少一个已上架小游戏" ${n===0?'disabled':''}>−</button><div class="goal-count-value"><label class="visually-hidden" for="published-games-count">已上架小游戏数量</label><input id="published-games-count" type="number" min="0" max="10" step="1" inputmode="numeric" value="${n}"><span>/ 10 个</span></div><button type="button" class="secondary-button" data-action="goal-count-up" aria-label="增加一个已上架小游戏" ${done?'disabled':''}>${icon('plus')}上架一个</button></div><progress id="published-games-progress" value="${n}" max="10" aria-label="小游戏上架进度，已上架 ${n} 个，共 10 个"></progress><p class="goal-count-note" id="published-games-note" role="status" aria-live="polite">${done?'10 个已上架，目标完成。':'已上架 '+n+' 个，还差 '+(10-n)+' 个。'}</p></article></div></section>`+renderActionPeriod(true);
}
function updateGoalSummary(){const summary=document.querySelector('#goals-summary');if(summary)summary.textContent=`已完成 ${completedGoals()} / 3`;}
function setPublishedGames(value){
  if(!Number.isInteger(value)||value<0||value>PUBLISHED_GAME_TARGET){document.querySelector('#published-games-count').value=state.goals.publishedGames;toast('请输入 0 到 10 之间的整数');return;}
  state.goals.publishedGames=value;save();
  const done=value===PUBLISHED_GAME_TARGET;
  document.querySelector('#published-games-count').value=value;
  document.querySelector('#published-games-card').classList.toggle('checked',done);
  document.querySelector('#published-games-status').textContent=done?'已完成':'进行中';
  document.querySelector('[data-action="goal-count-down"]').disabled=value===0;
  document.querySelector('[data-action="goal-count-up"]').disabled=done;
  const progress=document.querySelector('#published-games-progress');progress.value=value;progress.setAttribute('aria-label',`小游戏上架进度，已上架 ${value} 个，共 10 个`);
  document.querySelector('#published-games-note').textContent=done?'10 个已上架，目标完成。':`已上架 ${value} 个，还差 ${10-value} 个。`;updateGoalSummary();
}
function renderHistory(){
  const dates=recentDays(),records=dates.map(k=>state.days[k]),count=records.filter(hasRecord).length,focus=records.filter(d=>d?.focus.done).length,total=records.reduce((a,d)=>a+(d?minutes(d):0),0),all=Object.keys(state.days).filter(k=>hasRecord(state.days[k])).sort().reverse();
  return titleBlock('回头看看，已经走了一点','每一笔记录，都是照顾自己的痕迹。')+
  `<div class="history-summary"><div class="summary-card"><span>近 7 天留下记录</span><div class="summary-value">${count}<small>天</small></div><p class="hint">有记录的日子，都值得留住</p></div><div class="summary-card"><span>完成今日重点</span><div class="summary-value">${focus}<small>件</small></div><p class="hint">一件一件，按自己的步调</p></div><div class="summary-card"><span>小游戏专注时间</span><div class="summary-value">${total}<small>分钟</small></div><p class="hint">近 7 天累计专注时间</p></div></div>
  <section class="panel"><h2 class="panel-title">这一周的生活足迹</h2><p class="hint">每天勾选的事项数量 · 点击日期查看，空白也没关系</p><div class="chart" aria-label="近七天勾选数量">${dates.map(k=>{const n=entryCount(state.days[k]);return `<button class="chart-column" data-action="open-day" data-date="${k}" aria-label="${k}，已勾选 ${n} 项"><span class="chart-value">${n||'·'}</span><span class="chart-bar" style="height:${n?12+n*12:3}px"></span><span>${new Date(k+'T12:00:00').toLocaleDateString('zh-CN',{weekday:'short'})}</span><span>${k.slice(5).replace('-','/')}</span></button>`;}).join('')}</div></section>
  <section class="panel"><div class="section-title"><h2>过去的日子</h2><span>${all.length} 天有记录</span></div>${all.length?all.map(k=>{const d=state.days[k];return `<button class="history-row" data-action="open-day" data-date="${k}"><span class="history-date">${k.slice(5).replace('-','月')}日<small style="display:block;color:#a9b09f;font-size:9px">${k.slice(0,4)}</small></span><span class="history-row-content"><span class="history-row-title">${esc(d.focus.text||d.note?.slice(0,50)||CHECKLIST.filter(x=>isChecked(d,x.key)).map(x=>x.name).join(' · ')||'给自己留了一点时间')}</span><span class="history-row-sub" style="display:block">已勾选 ${entryCount(d)} 项${d.water.length?' · 饮水 '+totalWater(d)+' ml':''}${d.sleep?' · 睡眠 '+sleepHours(d.sleep).toFixed(1)+' 小时':''}</span></span>${d.focus.done?'<span class="pill">重点已完成</span>':''}${icon('right')}</button>`;}).join(''):`<div class="empty-state">${icon('journal')}<h3>故事从今天开始</h3><p>勾选今天做过的事，或留下一句心情。这里会慢慢留下你的生活。</p><button class="secondary-button" data-action="nav" data-view="today">去记一笔 ${icon('arrow')}</button></div>`}</section>`;
}
function timerRemaining(){return state.timer?(state.timer.endAt?Math.max(0,Math.ceil((state.timer.endAt-Date.now())/1000)):state.timer.remainingSec):timerPreset*60;}
const timerString=n=>`${String(Math.floor(n/60)).padStart(2,'0')}:${String(n%60).padStart(2,'0')}`;
const completedGames=()=>GAME_PROJECTS.filter(p=>state.gameChecks[p.id]===true).length;
function renderGameChecklist(){
  return `<section class="daily-checklist game-checklist" aria-label="TK 小游戏完成清单"><div class="section-title"><div><h2>我的小游戏 <span class="pill">TK</span></h2><p class="checklist-hint">完成后勾选，状态会一直保留；再次点击可取消。</p></div><span id="game-checklist-summary" role="status" aria-live="polite">已完成 ${completedGames()} / ${GAME_PROJECTS.length}</span></div><div class="checklist-grid">${GAME_PROJECTS.map(p=>{const checked=state.gameChecks[p.id]===true;return `<label class="checklist-row ${checked?'checked':''}"><input type="checkbox" data-game-check="${p.id}" aria-label="${p.name}" ${checked?'checked':''}><span class="checklist-copy"><strong>${p.name}</strong><small>平台 · ${p.platform}</small></span><span class="checklist-state">${checked?'已完成':'勾选完成'}</span></label>`;}).join('')}</div></section>`;
}
function renderProjects(){
  const t=state.timer;const active=!!t?.endAt;const today=day(localDate());
  return titleBlock('小游戏，完成一件记一件','平台 TK · 按自己的节奏，逐个完成。')+
  renderGameChecklist()+renderActionPeriod(true)+
  `<details class="optional-records project-details" id="project-details" ${projectDetailsOpen?'open':''}><summary><span>步骤与专注（可选）<small>原有项目步骤和专注记录都在这里</small></span>${icon('right')}</summary><div class="project-details-body"><div class="project-details-actions"><button class="secondary-button" data-action="task-add">${icon('plus')}添加一步</button></div><div class="project-grid"><section><div class="panel"><div class="project-top"><div><div class="eyebrow">MY LITTLE PROJECT</div><h2 class="panel-title" style="margin:0">${esc(state.settings.projectName)}</h2></div><button class="text-button" data-action="project-edit">${icon('edit')}改名</button></div><p class="hint">把想做的功能，拆成一次能完成的小步骤。</p></div><div class="board">${[['doing','正在做'],['todo','下一小步'],['done','已经做好']].map(([status,label])=>{const tasks=state.tasks.filter(t=>t.status===status);return `<section class="board-group"><h3 class="board-label"><span>${label}</span><span>${tasks.length}</span></h3>${tasks.length?tasks.map(task=>`<div class="task-row ${status==='done'?'done':''}"><button class="text-button" data-action="task-edit" data-id="${esc(task.id)}" aria-label="编辑步骤：${esc(task.title)}">${icon(status==='done'?'check':'edit')}</button><span class="task-text">${esc(task.title)}</span><select data-task-status="${esc(task.id)}" aria-label="${esc(task.title)}的状态"><option value="todo" ${status==='todo'?'selected':''}>下一步</option><option value="doing" ${status==='doing'?'selected':''}>正在做</option><option value="done" ${status==='done'?'selected':''}>已完成</option></select><button class="icon-button" data-action="task-delete" data-id="${esc(task.id)}" aria-label="删除步骤：${esc(task.title)}">${icon('trash')}</button></div>`).join(''):`<p class="board-empty">${status==='doing'?'选一个小步骤就好。':status==='done'?'完成的步骤会留在这里。':'小到“画一个按钮”也可以。'}</p>`}</section>`;}).join('')}</div></section>
  <aside class="timer-panel"><div class="timer-label">${icon('leaf')} 给想法一点专注时间</div><div class="timer-value" id="timer-value" role="timer" aria-label="剩余时间">${timerString(timerRemaining())}</div><div class="timer-options">${[10,15,25].map(n=>`<button data-action="timer-preset" data-minutes="${n}" class="${(t?t.totalSec/60:timerPreset)===n?'active':''}" ${t?'disabled':''}>${n} 分钟</button>`).join('')}</div><div class="timer-controls"><button class="primary-button" data-action="timer-toggle">${icon(active?'pause':'play')}${active?'暂停':t?'继续':'开始专注'}</button>${t?'<button class="secondary-button" data-action="timer-finish">结束</button>':''}</div><p class="timer-foot">${t?'可以随时停下来，已专注的时间会记下。':'从一小段时间开始，跟着自己的节奏。'}<br>今天已专注 ${minutes(today)} 分钟</p></aside></div>
  ${today.sessions.length?`<section class="panel" style="margin-top:22px"><h2 class="panel-title">今天的专注记录</h2>${today.sessions.slice().reverse().map(s=>`<div class="plan-row">${icon('clock')}<div>${esc(s.title||state.settings.projectName)}<small>${new Date(s.time).toLocaleTimeString('zh-CN',{hour:'2-digit',minute:'2-digit'})}</small></div><span>${Math.floor(s.seconds/60)} 分 ${s.seconds%60} 秒</span></div>`).join('')}</section>`:''}</div></details>`;
}
function renderSettings(){return titleBlock('把这里，调成你的节奏','简单设置，照顾真实的自己。')+
  `<div class="settings-grid"><section class="panel"><h2 class="panel-title">我的偏好</h2><p class="panel-description">所有目标都可以按自己的需要调整。</p><form id="preferences-form"><label class="field"><span>怎么称呼你</span><input name="name" maxlength="30" value="${esc(state.settings.name)}" placeholder="你的名字或昵称"></label><label class="field"><span>个人饮水参考目标（ml）</span><input name="waterGoal" type="number" min="0" max="10000" step="50" value="${state.settings.waterGoal}" inputmode="numeric"><small>填 0 只记录总量；这里的目标由你自己决定。</small></label><label class="field"><span>步骤与专注的项目名称</span><input name="projectName" required maxlength="80" value="${esc(state.settings.projectName)}"></label><button class="primary-button" type="submit">${icon('check')}保存偏好</button></form></section>
  <section class="panel"><div class="section-title"><h2>我的补剂安排</h2><button class="text-button" data-action="supplement-add">${icon('plus')}添加</button></div><p class="panel-description">记录已有的安排，不生成补剂或用量建议。</p><div class="plan-list">${supplementRows()}</div><div class="info-box">补剂名称和备注都由你填写。每天在「今日」页面点选已使用的项目，记录会按日期保存。</div></section>
  <section class="panel"><h2 class="panel-title">记录与备份</h2><p class="panel-description">生活记录保存在当前浏览器中。</p><div class="info-box">换设备、换浏览器或清除浏览器数据后，记录不会自动同步。可以先导出备份，再在新设备导入。</div><div class="settings-actions"><button class="secondary-button" data-action="export">${icon('download')}${storageBlocked?'导出原始备份':'导出备份'}</button><button class="secondary-button" data-action="import">${icon('upload')}导入备份</button><input type="file" id="import-file" accept=".json,application/json" hidden></div><p class="data-foot">已保存 ${Object.values(state.days).filter(hasRecord).length} 天的记录 · ${state.tasks.length} 个项目步骤<br>备份格式：JSON。导入前会确认，并提供现有数据备份。</p></section>
  <section class="panel"><h2 class="panel-title">一个轻一点的生活空间</h2><p class="panel-description">一天做好一件事，也可以很好。</p><p class="info-box">这里没有连续打卡排名，也没有必须填满的清单。按需记录，允许空白。让工具替你记住小事，把注意力留给生活。</p><p class="hint">手机使用：可以通过浏览器的「添加到主屏幕」把本站放在桌面。是否支持安装取决于浏览器。</p><p class="version-label">慢慢来 · 网页版 1.0</p></section></div>`;}
function supplementRows(){return state.supplementPlan.length?state.supplementPlan.map(p=>`<div class="plan-row"><div>${esc(p.name)}${p.note?`<small>${esc(p.note)}</small>`:''}</div><button class="icon-button" data-action="supplement-edit" data-id="${esc(p.id)}" aria-label="编辑补剂 ${esc(p.name)}">${icon('edit')}</button><button class="icon-button" data-action="supplement-delete" data-id="${esc(p.id)}" aria-label="删除补剂 ${esc(p.name)}">${icon('trash')}</button></div>`).join(''):'<p class="hint">还没有添加补剂。有需要时再添加就好。</p>';}
function openDialog(title,body){document.querySelector('#dialog-content').innerHTML=`<div class="dialog-inner"><div class="dialog-header"><h2 id="dialog-title">${esc(title)}</h2><button class="icon-button" data-action="dialog-close" aria-label="关闭">${icon('close')}</button></div>${body}</div>`;if(!dialog.open)dialog.showModal();}
const formActions=(text='保存记录')=>`<div class="dialog-actions"><button class="secondary-button" type="button" data-action="dialog-close">取消</button><button class="primary-button" type="submit">${icon('check')}${text}</button></div>`;
function focusDialog(){openDialog('今天，把一件事做好',`<form id="focus-form"><p class="dialog-help">定一个具体、做得到的停点。</p><label class="field"><span>今天最重要的一件事</span><input name="text" maxlength="150" required value="${esc(day().focus.text)}" placeholder="比如：给小游戏做一个开始按钮" autofocus></label>${formActions('记下这件事')}</form>`);}
function waterDialog(){const d=day();openDialog('喝点水，记一笔',`<form id="water-form"><label class="field"><span>本次饮水量（ml）</span><input name="ml" type="number" required min="1" max="3000" step="1" value="250" inputmode="numeric" autofocus></label>${formActions('添加记录')}</form>${d.water.length?`<div class="plan-list" style="margin-top:20px"><p class="hint">当日记录 · ${esc(selectedDate)}</p>${d.water.slice().reverse().map(w=>`<div class="plan-row"><div>${w.ml} ml<small>${w.time?new Date(w.time).toLocaleTimeString('zh-CN',{hour:'2-digit',minute:'2-digit'}):''}</small></div><button class="icon-button" data-action="water-delete" data-id="${esc(w.id)}" aria-label="删除 ${w.ml} ml 饮水记录">${icon('trash')}</button></div>`).join('')}</div>`:''}`);}
function exerciseDialog(){openDialog('记录今天的运动',`<form id="exercise-form"><label class="field"><span>做了什么</span><input name="type" maxlength="50" required placeholder="比如：散步、拉伸、力量训练" autofocus></label><label class="field"><span>时长（分钟）</span><input type="number" name="minutes" min="1" max="720" step="1" required placeholder="10" inputmode="numeric"></label>${formActions()}</form>${day().exercise.length?`<div style="margin-top:20px"><p class="hint">当日运动</p>${day().exercise.map(x=>`<div class="plan-row"><div>${esc(x.type)}<small>${x.minutes} 分钟</small></div><button class="icon-button" data-action="exercise-delete" data-id="${esc(x.id)}" aria-label="删除运动 ${esc(x.type)}">${icon('trash')}</button></div>`).join('')}</div>`:''}`);}
function sleepDialog(){const s=day().sleep;openDialog('记下一段休息',`<form id="sleep-form"><p class="dialog-help">按起床日期归档：${esc(selectedDate)}。起床时间早于入睡时间时，按跨夜计算。</p><div class="field-row"><label class="field"><span>入睡时间</span><input name="bed" type="time" required value="${s?.bed||''}"></label><label class="field"><span>起床时间</span><input name="wake" type="time" required value="${s?.wake||''}"></label></div><p class="hint">时长按填写时间估算，不包含中途清醒等情况。</p>${formActions()}</form>${s?'<button class="text-button danger-button" data-action="sleep-clear">删除这天的睡眠记录</button>':''}`);}
function supplementDialog(id){const p=state.supplementPlan.find(x=>x.id===id);openDialog(p?'编辑补剂安排':'添加自己的补剂',`<form id="supplement-form" data-id="${esc(p?.id||'')}"><p class="dialog-help">只记下你已有的安排；不确定是否需要服用时，可先咨询专业人员。</p><label class="field"><span>补剂名称</span><input name="name" required maxlength="50" value="${esc(p?.name||'')}" placeholder="填写你正在使用的补剂" autofocus></label><label class="field"><span>自己的安排或备注（可选）</span><input name="note" maxlength="120" value="${esc(p?.note||'')}" placeholder="按你已有的使用安排填写"></label>${formActions('保存安排')}</form>`);}
function taskDialog(id){const t=state.tasks.find(x=>x.id===id);openDialog(t?'编辑这一小步':'添加下一小步',`<form id="task-form" data-id="${esc(t?.id||'')}"><label class="field"><span>具体要做什么</span><input name="title" maxlength="150" required value="${esc(t?.title||'')}" placeholder="比如：画好游戏里的第一个角色" autofocus></label><label class="field"><span>当前状态</span><select name="status">${[['todo','下一小步'],['doing','正在做'],['done','已经做好']].map(([k,l])=>`<option value="${k}" ${t?.status===k?'selected':''}>${l}</option>`).join('')}</select></label>${formActions('保存步骤')}</form>`);}
let pendingConfirm=null,pendingImport=null;
function confirmAction(title,message,action,label='确认删除'){pendingConfirm=action;openDialog(title,`<p class="dialog-help">${esc(message)}</p><div class="dialog-actions"><button class="secondary-button" data-action="dialog-close">取消</button><button class="primary-button" data-action="confirm">${label}</button></div>`);}
function finishTimer(){const t=state.timer;if(!t)return;const spent=Math.max(0,Math.min(t.totalSec,t.totalSec-timerRemaining()));if(spent>0){day(t.day).sessions.push({id:uid(),seconds:spent,title:t.title,time:new Date().toISOString()});day(t.day).checks.game=true;}state.timer=null;save();if(view==='projects'||view==='today'||view==='history')render();toast(spent>0?`记下了 ${Math.floor(spent/60)} 分 ${spent%60} 秒专注。休息一下吧。`:'已结束，这次没有记录时长');}
function downloadBackup(){const contents=storageBlocked&&rawBackup?rawBackup:JSON.stringify({...state,exportedAt:new Date().toISOString()},null,2);const blob=new Blob([contents],{type:'application/json'}),url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download=`慢慢来-备份-${localDate()}.json`;a.click();setTimeout(()=>URL.revokeObjectURL(url),10000);}
document.addEventListener('click',event=>{
  const b=event.target.closest('[data-action]');if(!b||b.disabled)return;const action=b.dataset.action,id=b.dataset.id,key=b.dataset.key;const d=day();
  switch(action){
    case 'goal-count-down':setPublishedGames(state.goals.publishedGames-1);return;
    case 'goal-count-up':setPublishedGames(state.goals.publishedGames+1);return;
    case 'nav':navigate(b.dataset.view);return;
    case 'dialog-close':dialog.close();pendingConfirm=null;pendingImport=null;return;
    case 'confirm':{const fn=pendingConfirm;pendingConfirm=null;dialog.close();fn?.();return;}
    case 'date-prev':if(selectedDate>'2000-01-01')selectedDate=shiftDate(selectedDate,-1);render();return;
    case 'date-next':if(selectedDate<localDate())selectedDate=shiftDate(selectedDate,1);render();return;
    case 'date-today':selectedDate=localDate();render();return;
    case 'open-day':selectedDate=b.dataset.date;navigate('today');return;
    case 'energy':d.energy=d.energy===key?null:key;break;
    case 'focus-edit':focusDialog();return;
    case 'focus-toggle':d.focus.done=!d.focus.done;toast(d.focus.done?'这一件事，做好了。':'已撤销完成');break;
    case 'water-add':d.water.push({id:uid(),ml:+b.dataset.amount,time:new Date().toISOString()});d.checks.water=true;toast('记下一杯水');break;
    case 'water-undo':d.water.pop();toast('已撤销上一笔');break;
    case 'water-edit':waterDialog();return;
    case 'water-delete':d.water=d.water.filter(x=>x.id!==id);save();render();waterDialog();return;
    case 'meal':d.meals[key]=!d.meals[key];if(d.meals[key])d.checks.meals=true;break;
    case 'skin':d.skin[key]=!d.skin[key];if(d.skin[key])d.checks.skin=true;break;
    case 'exercise-edit':exerciseDialog();return;
    case 'exercise-delete':d.exercise=d.exercise.filter(x=>x.id!==id);save();render();exerciseDialog();return;
    case 'sleep-edit':sleepDialog();return;
    case 'sleep-clear':d.sleep=null;dialog.close();break;
    case 'supplement-toggle':d.supplements=d.supplements.includes(id)?d.supplements.filter(x=>x!==id):[...d.supplements,id];if(d.supplements.includes(id))d.checks.supplements=true;break;
    case 'supplements-manage':openDialog('我的补剂安排',`<div class="plan-list">${supplementRows()}</div><button class="primary-button" data-action="supplement-add">${icon('plus')}添加补剂</button>`);return;
    case 'supplement-add':supplementDialog();return;
    case 'supplement-edit':supplementDialog(id);return;
    case 'supplement-delete':confirmAction('移除这项补剂安排？','移除后不再出现在每日列表，已保存的历史打卡仍会保留。',()=>{state.supplementPlan=state.supplementPlan.filter(x=>x.id!==id);save();render();});return;
    case 'task-add':taskDialog();return;
    case 'task-edit':taskDialog(id);return;
    case 'task-delete':confirmAction('删除这个项目步骤？','这会移除这个步骤，已记录的专注时间会保留。',()=>{state.tasks=state.tasks.filter(x=>x.id!==id);save();render();});return;
    case 'project-edit':openDialog('给小游戏起个名字',`<form id="project-form"><label class="field"><span>项目名称</span><input name="name" value="${esc(state.settings.projectName)}" maxlength="80" required autofocus></label>${formActions('保存名称')}</form>`);return;
    case 'timer-preset':timerPreset=+b.dataset.minutes;render();return;
    case 'timer-toggle':{
      if(!state.timer){state.timer={day:localDate(),totalSec:timerPreset*60,remainingSec:timerPreset*60,endAt:Date.now()+timerPreset*60000,title:state.tasks.find(x=>x.status==='doing')?.title||state.settings.projectName};}
      else if(state.timer.endAt){const remaining=timerRemaining();if(remaining===0){finishTimer();return;}state.timer.remainingSec=remaining;state.timer.endAt=null;}
      else state.timer.endAt=Date.now()+state.timer.remainingSec*1000;
      break;
    }
    case 'timer-finish':finishTimer();return;
    case 'export':downloadBackup();toast('备份已准备下载');return;
    case 'import':document.querySelector('#import-file').click();return;
    case 'import-apply':if(!pendingImport)return;downloadBackup();state=pendingImport;state.timer=null;pendingImport=null;storageBlocked=false;save();dialog.close();render();toast('备份已恢复，原有记录已导出');return;
    default:return;
  }
  save();render();
});
document.addEventListener('input',event=>{
  if(event.target.id==='daily-note'){day().note=event.target.value;const ok=save();document.querySelector('#note-status').textContent=ok?'已保存':'保存失败，请导出备份';document.querySelector('#note-count').textContent=`${event.target.value.length} / 3000`;}
});
document.addEventListener('change',async event=>{
  const el=event.target;
  if(el.dataset.goalCheck){
    const key=el.dataset.goalCheck;if(!PERSONAL_GOALS.some(g=>g.id===key))return;
    state.goals[key]=el.checked;save();
    const row=el.closest('.checklist-row');row.classList.toggle('checked',el.checked);row.querySelector('.checklist-state').textContent=el.checked?'已完成':'勾选完成';updateGoalSummary();return;
  }
  if(el.id==='published-games-count'){setPublishedGames(el.value===''?NaN:Number(el.value));return;}
  if(el.dataset.gameCheck){
    const key=el.dataset.gameCheck;if(!GAME_PROJECTS.some(p=>p.id===key))return;
    state.gameChecks[key]=el.checked;save();
    const row=el.closest('.checklist-row');row.classList.toggle('checked',el.checked);row.querySelector('.checklist-state').textContent=el.checked?'已完成':'勾选完成';
    document.querySelector('#game-checklist-summary').textContent=`已完成 ${completedGames()} / ${GAME_PROJECTS.length}`;return;
  }
  if(el.dataset.dailyCheck){
    const key=el.dataset.dailyCheck;if(!CHECKLIST.some(x=>x.key===key))return;
    const d=day();d.checks[key]=el.checked;save();
    const row=el.closest('.checklist-row');row.classList.toggle('checked',el.checked);row.querySelector('.checklist-state').textContent=el.checked?'已做过':'勾选';
    const count=entryCount(d);document.querySelector('#checklist-summary').textContent=count?`已记下 ${count} 件小事`:'做多少，记多少';return;
  }
  if(el.id==='record-date'){if(validDate(el.value)&&el.value<=localDate()&&el.value>='2000-01-01'){selectedDate=el.value;render();}else{el.value=selectedDate;toast('请选择今天或之前的日期');}}
  if(el.dataset.taskStatus){const task=state.tasks.find(x=>x.id===el.dataset.taskStatus);if(task){if(task.status!=='done'&&el.value==='done')day(localDate()).checks.game=true;task.status=el.value;save();render();}}
  if(el.id==='import-file'){
    const file=el.files[0];el.value='';if(!file)return;
    try{if(file.size>5*1024*1024)throw new Error('文件超过 5 MB，请选择较小的备份');pendingImport=validateState(JSON.parse(await file.text()));openDialog('恢复这份备份？',`<p class="dialog-help">文件：${esc(file.name)}<br>包含 ${Object.values(pendingImport.days).filter(hasRecord).length} 天记录、${pendingImport.tasks.length} 个项目步骤，目标进度也会一并恢复。</p><div class="info-box">导入会替换当前设备的记录，专注计时会停止。点击恢复时会先下载一份现有数据备份。</div><div class="dialog-actions"><button class="secondary-button" data-action="dialog-close">取消</button><button class="primary-button" data-action="import-apply">备份现有数据并恢复</button></div>`);}catch(error){pendingImport=null;toast('未导入：'+(error instanceof SyntaxError?'文件不是有效的 JSON 备份':error.message));}
  }
});
document.addEventListener('submit',event=>{
  const f=event.target;if(!f.id.endsWith('-form'))return;event.preventDefault();const data=new FormData(f),get=k=>String(data.get(k)||'').trim();const d=day();
  switch(f.id){
    case 'focus-form':{const value=get('text');if(!value)return;d.focus={text:value,done:value===d.focus.text?d.focus.done:false};break;}
    case 'water-form':{const ml=+get('ml');if(!Number.isInteger(ml)||ml<1||ml>3000)return;d.water.push({id:uid(),ml,time:new Date().toISOString()});d.checks.water=true;break;}
    case 'exercise-form':{const n=+get('minutes');if(!get('type')||!Number.isInteger(n)||n<1||n>720)return;d.exercise.push({id:uid(),type:get('type'),minutes:n});d.checks.exercise=true;break;}
    case 'sleep-form':{const s={bed:get('bed'),wake:get('wake')};if(!s.bed||!s.wake)return;if(s.bed===s.wake){toast('入睡和起床时间不能相同');return;}d.sleep=s;d.checks.sleep=true;break;}
    case 'supplement-form':{if(!get('name'))return;const p=state.supplementPlan.find(x=>x.id===f.dataset.id);if(p){p.name=get('name');p.note=get('note');}else state.supplementPlan.push({id:uid(),name:get('name'),note:get('note')});break;}
    case 'task-form':{if(!get('title'))return;const t=state.tasks.find(x=>x.id===f.dataset.id);if(get('status')==='done'&&t?.status!=='done')day(localDate()).checks.game=true;if(t){t.title=get('title');t.status=get('status');}else state.tasks.push({id:uid(),title:get('title'),status:get('status'),createdAt:new Date().toISOString()});break;}
    case 'project-form':if(!get('name'))return;state.settings.projectName=get('name');break;
    case 'preferences-form':if(!get('projectName'))return;state.settings={name:get('name'),waterGoal:+get('waterGoal'),projectName:get('projectName')};break;
    default:return;
  }
  const saved=save();dialog.close();render();if(saved)toast(f.id==='preferences-form'?'偏好已保存':'记下了，按自己的节奏就好');
});
dialog.addEventListener('click',event=>{if(event.target===dialog){const rect=dialog.getBoundingClientRect();if(event.clientX<rect.left||event.clientX>rect.right||event.clientY<rect.top||event.clientY>rect.bottom){dialog.close();pendingConfirm=null;pendingImport=null;}}});
dialog.addEventListener('cancel',()=>{pendingConfirm=null;pendingImport=null;});
document.addEventListener('toggle',event=>{if(event.target.id==='optional-records')detailRecordsOpen=event.target.open;if(event.target.id==='project-details')projectDetailsOpen=event.target.open;},true);
window.addEventListener('hashchange',()=>{const next=location.hash.slice(1);if(navItems.some(x=>x[0]===next)&&next!==view){view=next;render();}});
document.addEventListener('visibilitychange',()=>{if(!document.hidden){refreshDailyDate();refreshActionPeriod();if(state.timer?.endAt&&timerRemaining()===0)finishTimer();}});
setInterval(()=>{refreshDailyDate();refreshActionPeriod();if(state.timer?.endAt){const left=timerRemaining();const el=document.querySelector('#timer-value');if(el)el.textContent=timerString(left);if(left===0)finishTimer();}},1000);
render();if(initialError)toast(initialError);if(state.timer?.endAt&&timerRemaining()===0)finishTimer();
