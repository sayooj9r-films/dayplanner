(() => {
  const START = new Date(2026, 9, 1);
  let selected = new Date(START);
  let view = 'day';
  const storageKey = 'daymark-planner-v1';
  let store = {};
  try { store = JSON.parse(localStorage.getItem(storageKey) || '{}') || {}; } catch { store = {}; }
  const $ = (s) => document.querySelector(s);
  const keyOf = (date) => `${date.getFullYear()}-${String(date.getMonth()+1).padStart(2,'0')}-${String(date.getDate()).padStart(2,'0')}`;
  const dayData = (date) => store[keyOf(date)] || { goals: [], note: '' };
  const save = () => localStorage.setItem(storageKey, JSON.stringify(store));
  const clone = (d) => new Date(d.getFullYear(), d.getMonth(), d.getDate());
  const fmt = (d, opts) => new Intl.DateTimeFormat('en', opts).format(d);
  const weekStart = (d) => { const x=clone(d); x.setDate(x.getDate()-((x.getDay()+6)%7)); return x; };
  const datesInWeek = (d) => Array.from({length:7},(_,i)=>{const x=weekStart(d);x.setDate(x.getDate()+i);return x;});
  const escaped = (s) => String(s).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));

  function render(){
    document.querySelectorAll('.nav-item').forEach(b=>b.classList.toggle('active',b.dataset.view===view));
    document.querySelectorAll('.view-panel').forEach(p=>p.classList.add('hidden'));
    $(`#${view}-view`).classList.remove('hidden');
    $('#crumb-view').textContent = view==='day'?'TODAY':view.toUpperCase();
    const title = view==='day'?'Make today count':view==='week'?'Your week, at a glance':'Your month, at a glance';
    $('#heading-title').innerHTML = `${title}<span class="period">.</span>`;
    $('#heading-subtitle').textContent = view==='day'?'A little progress is still progress. What matters to you today?':view==='week'?'A gentle overview of the goals and moments you’re making time for.':'Look back on your plans and the little things you did.';
    $('#heading-eyebrow').textContent = view==='day'?fmt(selected,{weekday:'long',month:'long',day:'numeric',year:'numeric'}).toUpperCase():view==='week'?'YOUR WEEK':fmt(selected,{month:'long',year:'numeric'}).toUpperCase();
    $('#date-label').textContent = view==='day'?fmt(selected,{month:'short',day:'numeric',year:'numeric'}):view==='week'?`${fmt(weekStart(selected),{month:'short',day:'numeric'})} – ${fmt(datesInWeek(selected)[6],{month:'short',day:'numeric'})}`:fmt(selected,{month:'short',year:'numeric'});
    renderDay();renderWeek();renderMonth();
  }
  function renderDay(){
    const data=dayData(selected), list=$('#goal-list');
    list.innerHTML = data.goals.length ? data.goals.map((g,i)=>`<li class="goal-row ${g.done?'done':''}"><input class="check" type="checkbox" data-check="${i}" ${g.done?'checked':''} aria-label="Mark ${escaped(g.text)} ${g.done?'incomplete':'complete'}"><span class="goal-text">${escaped(g.text)}</span><button class="delete-goal" data-delete="${i}" aria-label="Delete goal">×</button></li>`).join('') : '<li class="empty-goals">Your list is open. Add one small thing to begin.</li>';
    list.querySelectorAll('[data-check]').forEach(el=>el.addEventListener('change',()=>{data.goals[+el.dataset.check].done=el.checked;store[keyOf(selected)]=data;save();render();}));
    list.querySelectorAll('[data-delete]').forEach(el=>el.addEventListener('click',()=>{data.goals.splice(+el.dataset.delete,1);store[keyOf(selected)]=data;save();render();}));
    const complete=data.goals.filter(g=>g.done).length;$('#goal-count').textContent=`${complete} / ${data.goals.length} done`;$('#progress-fill').style.width=data.goals.length?`${complete/data.goals.length*100}%`:'0%';
    $('#activity-input').value=data.note||'';
    const week=datesInWeek(selected), active=week.filter(d=>{const x=dayData(d);return x.goals.length||x.note.trim();}).length;
    $('#week-done').textContent=week.reduce((n,d)=>n+dayData(d).goals.filter(g=>g.done).length,0);$('#week-days').textContent=active;
    $('#week-mini').innerHTML=week.map(d=>`<div class="mini-day ${keyOf(d)===keyOf(selected)?'selected':''} ${dayData(d).goals.length||dayData(d).note?'has-data':''}"><span>${fmt(d,{weekday:'narrow'})}</span><span class="mini-dot">${d.getDate()}</span></div>`).join('');
  }
  function renderWeek(){
    const days=datesInWeek(selected);$('#week-range').textContent=`${fmt(days[0],{month:'long',day:'numeric'})} – ${fmt(days[6],{month:'long',day:'numeric'})}`;
    $('#week-grid').innerHTML=days.map(d=>{const x=dayData(d);const goals=x.goals.slice(0,4).map(g=>`<div class="week-goal"><span>${g.done?'✓':'○'}</span>${escaped(g.text)}</div>`).join('');return `<article class="week-day ${keyOf(d)===keyOf(selected)?'today':''}" data-pick="${keyOf(d)}"><div class="week-day-head"><span class="week-day-name">${fmt(d,{weekday:'short'})}</span><span class="week-day-date">${d.getDate()}</span></div>${goals||'<div class="week-empty">A fresh day to shape.</div>'}${x.goals.length>4?`<div class="week-empty">+${x.goals.length-4} more goals</div>`:''}${x.note?`<div class="week-note">${escaped(x.note.slice(0,72))}${x.note.length>72?'…':''}</div>`:''}</article>`}).join('');
    $('#week-grid').querySelectorAll('[data-pick]').forEach(el=>el.addEventListener('click',()=>{selected=new Date(`${el.dataset.pick}T12:00:00`);view='day';render();}));
  }
  function renderMonth(){
    const y=selected.getFullYear(),m=selected.getMonth();$('#month-label').textContent=fmt(selected,{month:'long',year:'numeric'});
    const first=new Date(y,m,1), offset=(first.getDay()+6)%7, count=new Date(y,m+1,0).getDate(), total=Math.ceil((offset+count)/7)*7;
    $('#calendar-grid').innerHTML=Array.from({length:total},(_,i)=>{const d=new Date(y,m,1-offset+i),inside=d.getMonth()===m,x=dayData(d),has=x.goals.length||x.note.trim();return `<div class="calendar-day ${inside?'':'outside'} ${keyOf(d)===keyOf(selected)?'selected':''}" data-calendar="${keyOf(d)}"><span class="day-number">${d.getDate()}</span>${has?`<div class="calendar-mark"><i></i>${x.goals.length?`${x.goals.filter(g=>g.done).length}/${x.goals.length} goals`: 'note saved'}</div>`:''}</div>`}).join('');
    $('#calendar-grid').querySelectorAll('[data-calendar]').forEach(el=>el.addEventListener('click',()=>{selected=new Date(`${el.dataset.calendar}T12:00:00`);view='day';render();}));
  }
  $('#goal-form').addEventListener('submit',e=>{e.preventDefault();const input=$('#goal-input'),text=input.value.trim();if(!text)return;const d=dayData(selected);d.goals.push({text,done:false});store[keyOf(selected)]=d;save();input.value='';render();input.focus();});
  $('#activity-input').addEventListener('input',e=>{const d=dayData(selected);d.note=e.target.value;store[keyOf(selected)]=d;save();});
  document.querySelectorAll('.nav-item').forEach(b=>b.addEventListener('click',()=>{view=b.dataset.view;render();}));
  document.querySelectorAll('[data-open-view]').forEach(b=>b.addEventListener('click',()=>{view=b.dataset.openView;render();}));
  $('#prev-date').addEventListener('click',()=>move(-1));$('#next-date').addEventListener('click',()=>move(1));
  $('#today-button').addEventListener('click',()=>{selected=clone(START);view='day';render();});
  $('#date-label').addEventListener('click',()=>{if(view==='month')selected=new Date(selected.getFullYear(),selected.getMonth()+1,1);else selected.setDate(selected.getDate()+1);render();});
  function move(direction){if(view==='month')selected=new Date(selected.getFullYear(),selected.getMonth()+direction,1);else selected.setDate(selected.getDate()+direction*(view==='week'?7:1));render();}
  render();
})();
