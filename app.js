
const quiz = document.getElementById('quiz');
const unitFilter = document.getElementById('unitFilter');
const typeFilter = document.getElementById('typeFilter');
const countFilter = document.getElementById('countFilter');
const stats = document.getElementById('stats');
const result = document.getElementById('result');

let current = [];
let answered = new Map();
let lastWrongIds = [];

function normalize(s){
  return String(s).trim()
    .replace(/[・･\s＝=]/g,'')
    .replace(/[０-９]/g, c => String.fromCharCode(c.charCodeAt(0)-0xFEE0))
    .toLowerCase();
}

[...new Set(QUESTIONS.map(q=>q.unit))].forEach(unit=>{
  const o=document.createElement('option');
  o.value=unit; o.textContent=unit; unitFilter.appendChild(o);
});

function shuffle(a){
  const x=[...a];
  for(let i=x.length-1;i>0;i--){
    const j=Math.floor(Math.random()*(i+1));
    [x[i],x[j]]=[x[j],x[i]];
  }
  return x;
}

function selectQuestions(){
  let pool=QUESTIONS.filter(q=>(unitFilter.value==='all'||q.unit===unitFilter.value)
    &&(typeFilter.value==='all'||q.type===typeFilter.value));
  const n=countFilter.value==='80'?pool.length:Math.min(+countFilter.value,pool.length);
  return shuffle(pool).slice(0,n);
}

function start(list=null){
  current=list ? shuffle(list) : selectQuestions();
  answered=new Map();
  lastWrongIds=[];
  result.classList.add('hidden');
  stats.classList.remove('hidden');
  render();
  updateStats();
  window.scrollTo({top:0,behavior:'smooth'});
}

function render(){
  quiz.innerHTML='';
  current.forEach((q,idx)=>{
    const card=document.createElement('article');
    card.className='question card';
    card.dataset.id=q.id;
    card.innerHTML=`
      <div class="qtop">
        <span class="badge">${q.unit}</span>
        <span class="badge">${q.type==='choice'?'四択':'記述'}</span>
      </div>
      <h3>Q${idx+1}. ${q.q}</h3>
      <div class="answer-area"></div>
      <div class="feedback-wrap"></div>`;
    quiz.appendChild(card);

    const area=card.querySelector('.answer-area');
    if(q.type==='choice'){
      const box=document.createElement('div'); box.className='choices';
      q.choices.forEach((c,i)=>{
        const b=document.createElement('button');
        b.className='choice'; b.textContent=c;
        b.onclick=()=>answerChoice(q,i,card);
        box.appendChild(b);
      });
      area.appendChild(box);
    } else {
      const row=document.createElement('div'); row.className='textrow';
      const inp=document.createElement('input'); inp.placeholder='答えを入力';
      const b=document.createElement('button'); b.textContent='答え合わせ';
      b.onclick=()=>answerText(q,inp.value,card);
      inp.addEventListener('keydown',e=>{if(e.key==='Enter') b.click()});
      row.append(inp,b); area.appendChild(row);
    }
  });
}

function lock(card){
  card.querySelectorAll('button,input').forEach(el=>el.disabled=true);
}

function feedback(card,q,ok,userLabel=''){
  const wrap=card.querySelector('.feedback-wrap');
  const div=document.createElement('div');
  div.className='feedback '+(ok?'ok':'ng');
  const answerText=q.type==='choice'?q.choices[q.answer]:q.answers[0];
  div.innerHTML=`<strong>${ok?'正解！':'不正解'}</strong>
    ${!ok?`<div>正答：<b>${answerText}</b></div>`:''}
    <div>${q.ex}</div>
    <div class="source"><b>教科書：</b>${q.src.join(' ／ ')}</div>`;
  wrap.appendChild(div);
}

function answerChoice(q,i,card){
  if(answered.has(q.id)) return;
  const ok=i===q.answer;
  answered.set(q.id,ok);
  const buttons=[...card.querySelectorAll('.choice')];
  buttons[q.answer].classList.add('correct');
  if(!ok) buttons[i].classList.add('wrong');
  lock(card); feedback(card,q,ok); updateStats();
}

function answerText(q,text,card){
  if(answered.has(q.id)) return;
  const n=normalize(text);
  const ok=q.answers.some(a=>{
    const an=normalize(a);
    return n===an || (an.length>=4 && n.includes(an)) || (n.length>=4 && an.includes(n));
  });
  answered.set(q.id,ok);
  lock(card); feedback(card,q,ok); updateStats();
}

function updateStats(){
  const vals=[...answered.values()];
  const c=vals.filter(Boolean).length;
  const w=vals.length-c;
  document.getElementById('progress').textContent=`${vals.length} / ${current.length}`;
  document.getElementById('correct').textContent=c;
  document.getElementById('wrong').textContent=w;
  document.getElementById('rate').textContent=vals.length?`${Math.round(c/vals.length*100)}%`:'0%';
  if(vals.length===current.length && current.length){
    lastWrongIds=current.filter(q=>answered.get(q.id)===false).map(q=>q.id);
    showResult(c,w);
  }
}

function showResult(c,w){
  result.classList.remove('hidden');
  document.getElementById('resultText').textContent=
    `${current.length}問中 ${c}問正解（正答率 ${Math.round(c/current.length*100)}%）／ 不正解 ${w}問`;
  document.getElementById('wrongBtn').disabled=!w;
}

document.getElementById('startBtn').onclick=()=>start();
document.getElementById('againBtn').onclick=()=>start();
document.getElementById('wrongBtn').onclick=()=>{
  const list=QUESTIONS.filter(q=>lastWrongIds.includes(q.id));
  start(list);
};
document.getElementById('retryWrongBtn').onclick=()=>{
  const saved=JSON.parse(localStorage.getItem('socialQuizWrong')||'[]');
  const list=QUESTIONS.filter(q=>saved.includes(q.id));
  if(!list.length){alert('保存された間違い問題はまだありません。');return;}
  start(list);
};

window.addEventListener('beforeunload',()=>{
  if(current.length && answered.size){
    const wrong=current.filter(q=>answered.get(q.id)===false).map(q=>q.id);
    localStorage.setItem('socialQuizWrong',JSON.stringify(wrong));
  }
});

start();
