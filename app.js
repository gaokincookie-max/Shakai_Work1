
const quiz = document.getElementById('quiz');
const unitFilter = document.getElementById('unitFilter');
const typeFilter = document.getElementById('typeFilter');
const countFilter = document.getElementById('countFilter');
const stats = document.getElementById('stats');
const result = document.getElementById('result');

let current = [];
let answered = new Map();
let currentIndex = 0;
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
  currentIndex=0;
  lastWrongIds=[];
  result.classList.add('hidden');
  stats.classList.remove('hidden');
  renderCurrent();
  updateStats();
  window.scrollTo({top:0,behavior:'smooth'});
}

function renderCurrent(){
  quiz.innerHTML='';
  if(!current.length){
    quiz.innerHTML='<section class="card">条件に合う問題がありません。</section>';
    return;
  }

  const q=current[currentIndex];
  const wrap=document.createElement('div');
  wrap.className='single-wrap';

  const card=document.createElement('article');
  card.className='question card';
  card.dataset.id=q.id;
  card.innerHTML=`
    <div class="question-number">第 ${currentIndex+1} 問 / 全 ${current.length} 問</div>
    <div class="qtop">
      <span class="badge">${q.unit}</span>
      <span class="badge">${q.type==='choice'?'四択':'記述'}</span>
    </div>
    <h3>${q.q}</h3>
    <div class="answer-area"></div>
    <div class="feedback-wrap"></div>
    <div class="next-row"></div>`;

  wrap.appendChild(card);
  quiz.appendChild(wrap);

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
    setTimeout(()=>inp.focus(),50);
  }
}

function lockAnswerArea(card){
  card.querySelectorAll('.answer-area button,.answer-area input').forEach(el=>el.disabled=true);
}

function feedback(card,q,ok){
  const wrap=card.querySelector('.feedback-wrap');
  const div=document.createElement('div');
  div.className='feedback '+(ok?'ok':'ng');
  const answerText=q.type==='choice'?q.choices[q.answer]:q.answers[0];
  div.innerHTML=`<strong>${ok?'正解！':'不正解'}</strong>
    ${!ok?`<div>正答：<b>${answerText}</b></div>`:''}
    <div>${q.ex}</div>
    <div class="source"><b>教科書：</b>${q.src.join(' ／ ')}</div>`;
  wrap.appendChild(div);

  const nextRow=card.querySelector('.next-row');
  const next=document.createElement('button');
  next.textContent=currentIndex===current.length-1?'結果を見る':'次の問題';
  next.onclick=nextQuestion;
  nextRow.appendChild(next);
}

function answerChoice(q,i,card){
  if(answered.has(q.id)) return;
  const ok=i===q.answer;
  answered.set(q.id,ok);
  const buttons=[...card.querySelectorAll('.choice')];
  buttons[q.answer].classList.add('correct');
  if(!ok) buttons[i].classList.add('wrong');
  lockAnswerArea(card);
  feedback(card,q,ok);
  updateStats();
}

function answerText(q,text,card){
  if(answered.has(q.id)) return;
  const n=normalize(text);
  const ok=q.answers.some(a=>{
    const an=normalize(a);
    return n===an || (an.length>=4 && n.includes(an)) || (n.length>=4 && an.includes(n));
  });
  answered.set(q.id,ok);
  lockAnswerArea(card);
  feedback(card,q,ok);
  updateStats();
}

function nextQuestion(){
  if(currentIndex<current.length-1){
    currentIndex++;
    renderCurrent();
    updateStats();
    window.scrollTo({top:Math.max(0,quiz.offsetTop-20),behavior:'smooth'});
  }else{
    const vals=[...answered.values()];
    const c=vals.filter(Boolean).length;
    const w=vals.length-c;
    finish(c,w);
  }
}

function updateStats(){
  const vals=[...answered.values()];
  const c=vals.filter(Boolean).length;
  const w=vals.length-c;
  document.getElementById('progress').textContent=`${Math.min(currentIndex+1,current.length)} / ${current.length}`;
  document.getElementById('correct').textContent=c;
  document.getElementById('wrong').textContent=w;
  document.getElementById('rate').textContent=vals.length?`${Math.round(c/vals.length*100)}%`:'0%';
}

function finish(c,w){
  lastWrongIds=current.filter(q=>answered.get(q.id)===false).map(q=>q.id);
  localStorage.setItem('socialQuizWrong',JSON.stringify(lastWrongIds));
  quiz.innerHTML='';
  result.classList.remove('hidden');
  document.getElementById('resultText').textContent=
    `${current.length}問中 ${c}問正解（正答率 ${Math.round(c/current.length*100)}%）／ 不正解 ${w}問`;
  document.getElementById('wrongBtn').disabled=!w;
  window.scrollTo({top:result.offsetTop-20,behavior:'smooth'});
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

start();
