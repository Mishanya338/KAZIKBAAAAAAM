const http=require('http'),fs=require('fs'),path=require('path'),crypto=require('crypto'),{WebSocketServer}=require('ws');
const TOKEN=process.env.BOT_TOKEN||'',PW=(process.env.ADMIN_PASSWORD||'mishanya5482').trim(),ADM=(process.env.ADMIN_IDS||'').split(',').map(s=>s.trim()).filter(Boolean),
 DEV=process.env.ALLOW_DEV=='1',PORT=process.env.PORT||3000,FILE=path.join(process.env.DATA_DIR||__dirname,'data.json');
let DB={rtp:.96,promos:{},users:{},best:{d:'',g:{}},rhist:[]};try{DB={...DB,...JSON.parse(fs.readFileSync(FILE,'utf8'))}}catch(e){}
let dirty=0;const save=()=>{dirty=1};setInterval(()=>{if(dirty){dirty=0;fs.writeFile(FILE,JSON.stringify(DB),()=>{})}},4000);
const rnd=Math.random,clamp=(v,a,b)=>Math.min(b,Math.max(a,+v||a)),r2=n=>Math.round(n*100)/100,sleep=ms=>new Promise(r=>setTimeout(r,ms));
const srv=http.createServer((q,s)=>{s.setHeader('Content-Type','text/html;charset=utf-8');fs.createReadStream(path.join(__dirname,'index.html')).pipe(s)});
const wss=new WebSocketServer({server:srv}),ONLINE=new Set();
const send=(w,o)=>{if(w.readyState==1)w.send(JSON.stringify(o))},bc=o=>ONLINE.forEach(w=>send(w,o));
const me=u=>({t:'me',uid:u.id,bal:r2(u.bal),won:r2(u.won),rtp:DB.rtp,adm:ADM.includes(u.id)});
const pushMe=u=>ONLINE.forEach(w=>{if(w.u===u)send(w,me(u))});

const pushTo=(u,o)=>ONLINE.forEach(w=>{if(w.u===u)send(w,o)});
const RK_K=.11,CS=[[1000,75],[5000,15],[10000,5],[15000,2.5],[35000,1.5],[100000,1]];
function best(g,u,profit){const d=new Date().toISOString().slice(0,10);if(DB.best.d!==d)DB.best={d,g:{}};
 if(profit>0&&(!DB.best.g[g]||profit>DB.best.g[g].amt))DB.best.g[g]={n:u.un?'@'+u.un:u.name,amt:r2(profit)};save()}
function addHist(c){DB.rhist.unshift(c);DB.rhist.length=Math.min(DB.rhist.length,20);save()}
function check(init){try{const p=new URLSearchParams(init),h=p.get('hash');p.delete('hash');
 const s=[...p.entries()].map(([k,v])=>k+'='+v).sort().join('\n'),k=crypto.createHmac('sha256','WebAppData').update(TOKEN).digest(),
 x=crypto.createHmac('sha256',k).update(s).digest('hex');
 if(x!==h||Date.now()/1000-(+p.get('auth_date')||0)>604800)return null;return JSON.parse(p.get('user'))}catch(e){return null}}

/* ---------- игры (весь рандом только здесь) ---------- */
const PL=[50,15,5,2,.75,.75,0,.75,.75,2,5,15,50],RV=[1.35,1.8,2.5,4,8],X=[2,3,5,50],
 SW=[24,19,16,13,10,7,4,3],PT=[[8,19,57],[11,30,95],[15,38,152],[23,57,228],[38,95,380],[57,152,760],[95,304,1520],[190,570,3040]],
 LN=[[0,0,0,0,0],[1,1,1,1,1],[2,2,2,2,2],[0,1,2,1,0],[2,1,0,1,2],[0,0,1,0,0],[2,2,1,2,2],[1,0,0,0,1],[1,2,2,2,1],[0,1,1,1,0],[2,1,1,1,2],[1,0,1,0,1],[1,2,1,2,1],[0,1,0,1,0],[2,1,2,1,2]];
const pickS=()=>{let r=rnd()*100;for(let i=0;i<8;i++){if((r-=SW[i])<0)return i}return 8};
function slot(b,free){const g=[0,1,2,3,4].map(()=>[pickS(),pickS(),pickS()]);let w=0;
 LN.forEach(l=>{const s=g[0][l[0]];if(s==8)return;let n=1;while(n<5&&g[n][l[n]]==s)n++;if(n>=3)w+=PT[s][n-3]*(free?3:1)*b/15});
 return{g,w:r2(w),sc:g.flat().filter(v=>v==8).length}}
function play(u,m){const b=r2(+m.bet);if(!(b>=1)||b>u.bal)return{err:'Неверная ставка или мало баланса',bal:r2(u.bal),won:r2(u.won)};
 u.bal-=b;let r={},pay=0;const R=DB.rtp;
 switch(m.g){
  case 'plinko':{let k=0;for(let i=0;i<12;i++)k+=rnd()<.5?1:0;pay=b*PL[k];r={k};break}
  case 'rev':{const n=clamp(m.n,0,4),win=rnd()<Math.min(.95,R/RV[n]),idx=[0,1,2,3,4,5].sort(()=>rnd()-.5),bl=idx.slice(0,n+1),pool=win?idx.slice(n+1):bl;
   r={win,bl,t:pool[(rnd()*pool.length)|0]};if(win)pay=b*RV[n];break}
  case 'dice':{const t=clamp(m.t,2,98),ov=!!m.ov,ch=ov?100-t:t,roll=rnd()*100,win=ov?roll>t:roll<t;r={roll};if(win)pay=b*R*100/ch;break}
  case 'x50':{const s=clamp(m.s,0,3),w=X.map(v=>R/v),tt=w.reduce((a,c)=>a+c);let q=rnd()*tt,t=0;for(;t<3;t++){if((q-=w[t])<0)break}r={t};if(t==s)pay=b*X[s];break}
  case 'slots':{const f=slot(b,0),spins=[f];pay=f.w;if(f.sc>=3){pay+=b*({3:3,4:10}[f.sc]||30);for(let i=0;i<10;i++){const q=slot(b,1);spins.push(q);pay+=q.w}}r={spins};break}
  case 'up':{const mx=clamp(m.mx,1.1,100),c=Math.min(.95,R/mx),win=rnd()<c;r={win,ang:win?rnd()*c*360:c*360+rnd()*(360-c*360)};if(win)pay=b*mx;break}
  default:u.bal+=b;return{err:'?'}}
 pay=r2(pay);u.bal+=pay;if(pay>b)u.won+=pay-b;best(m.g,u,pay-b);save();return{r,pay,bal:r2(u.bal),won:r2(u.won)}}

/* ---------- общая PvP-арена ---------- */
const Z=300,PV={phase:'lobby',players:[],end:0,traj:null,startAt:0,win:-1};let tick;
const pvPub=()=>({t:'pvp',phase:PV.phase,players:PV.players.map(p=>({n:p.n,b:p.b,u:p.u.id})),pot:PV.players.reduce((s,p)=>s+p.b,0),left:Math.max(0,PV.end-Date.now()),
 ...(PV.traj?{traj:PV.traj,startIn:PV.startAt-Date.now()}:{}),...(PV.win>=0?{win:PV.win}:{})});
function simulate(z){const BU=[[90,80],[210,150],[100,225]],dt=1/60,r0=9,mg=Math.min(6,(z[1]-z[0])/4);let last=null;
 for(let it=0;it<5000;it++){let bx=150,by=150,a=rnd()*6.283,sp=420+rnd()*100,vx=Math.cos(a)*sp,vy=Math.sin(a)*sp;const T=[150,150];
  for(let s=0;s<720;s++){const f=1-.45*dt;vx*=f;vy*=f;bx+=vx*dt;by+=vy*dt;let hit=0;
   if(bx<r0){bx=r0;vx=Math.abs(vx);hit=1}if(bx>Z-r0){bx=Z-r0;vx=-Math.abs(vx);hit=1}
   if(by<r0){by=r0;vy=Math.abs(vy);hit=1}if(by>Z-r0){by=Z-r0;vy=-Math.abs(vy);hit=1}
   for(const u of BU){const dx=bx-u[0],dy=by-u[1],d=Math.hypot(dx,dy);if(d<16+r0){const nx=dx/d,ny=dy/d,dot=vx*nx+vy*ny;if(dot<0){vx-=2*dot*nx;vy-=2*dot*ny}bx=u[0]+nx*(16+r0);by=u[1]+ny*(16+r0);hit=1}}
   if(hit){const v=Math.hypot(vx,vy)*.97,an=Math.atan2(vy,vx)+(rnd()-.5)*.2;vx=Math.cos(an)*v;vy=Math.sin(an)*v}
   T.push(Math.round(bx*10)/10,Math.round(by*10)/10);if(Math.hypot(vx,vy)<6)break}
  last=T;if(bx>=z[0]+mg&&bx<=z[1]-mg)return T}
 return last}
function lobby(){PV.phase='lobby';PV.players=[];PV.traj=null;PV.win=-1;PV.end=0;bc(pvPub())}
function startRound(){const P=PV.players,tot=P.reduce((s,p)=>s+p.b,0);
 if(P.length<2){PV.end=Date.now()+20000;tick=setTimeout(startRound,20000);return bc(pvPub())}
 let r=rnd()*tot,w=0;for(;w<P.length-1;w++){if((r-=P[w].b)<0)break}
 let a=0;const zs=P.map(p=>{const z=[a,a+p.b/tot*Z];a=z[1];return z});
 PV.traj=simulate(zs[w]);PV.phase='run';PV.startAt=Date.now()+1000;const dur=PV.traj.length/2/60*1000;PV.end=PV.startAt+dur;bc(pvPub());
 tick=setTimeout(()=>{const W=P[w];W.u.bal+=tot;W.u.won+=tot-W.b;best('pvp',W.u,tot-W.b);P.forEach(p=>pushMe(p.u));PV.phase='result';PV.win=w;PV.end=Date.now()+6000;save();bc(pvPub());tick=setTimeout(lobby,6000)},1000+dur+500)}

wss.on('connection',w=>{w.on('message',async raw=>{let m;try{m=JSON.parse(raw)}catch(e){return}
 const rep=o=>send(w,{...o,id:m.id});
 if(m.t=='auth'){const tu=m.initData?check(m.initData):(DEV?{id:'dev'+String(m.dev).slice(0,8),first_name:'Dev '+String(m.dev).slice(0,4),username:'dev'+String(m.dev).slice(0,4)}:null);
  if(!tu)return rep({err:'auth'});const id=String(tu.id);let u=DB.users[id];if(!u)u=DB.users[id]={id,bal:1000,won:0};
  u.name=String(tu.first_name||'Игрок').slice(0,24);u.un=(tu.username||'').toLowerCase();w.u=u;ONLINE.add(w);save();rep(me(u));return send(w,pvPub())}
 const u=w.u;if(!u)return;
 switch(m.t){
  case 'play':return rep(play(u,m));
  case 'top':return rep({list:Object.values(DB.users).filter(x=>x.won>0||x===u).sort((a,b)=>b.won-a.won).slice(0,20).map(x=>({n:x.un?'@'+x.un:x.name,w:Math.round(x.won),me:x===u}))});
  case 'promo':{const c=String(m.code||'').trim().toUpperCase(),p=DB.promos[c];if(!p||p.left<=0)return rep({err:'Код не найден или закончился'});
   p.used=p.used||[];if(p.used.includes(u.id))return rep({err:'Ты уже активировал этот код'});p.left--;p.used.push(u.id);if(p.kind=='case')u.cases=(u.cases||0)+p.a;else u.bal+=p.a;pushMe(u);save();return rep({a:p.a,kind:p.kind||'coins'})}
  case 'gift':{const to=String(m.to||'').replace('@','').trim().toLowerCase(),a=r2(+m.a),v=Object.values(DB.users).find(x=>x.un&&x.un==to);
   if(!v)return rep({err:'Игрок не найден (он должен хоть раз открыть приложение)'});if(v===u)return rep({err:'Нельзя отправить себе'});
   if(!(a>=1)||a>u.bal)return rep({err:'Неверная сумма'});u.bal-=a;v.bal+=a;pushMe(u);pushMe(v);save();return rep({ok:1})}
  case 'pvp_join':{if(PV.phase!='lobby')return rep({err:'Раунд уже идёт, дождись следующего'});const b=r2(+m.bet);
   if(!(b>=1)||b>u.bal)return rep({err:'Неверная ставка'});const ex=PV.players.find(p=>p.u===u);
   u.bal-=b;if(ex)ex.b=r2(ex.b+b);else PV.players.push({u,n:u.name,b});if(!ex&&PV.players.length==1){PV.end=Date.now()+20000;clearTimeout(tick);tick=setTimeout(startRound,20000)}
   save();bc(pvPub());return rep({bal:r2(u.bal)})}
  case 'best':return rep({b:DB.best.d===new Date().toISOString().slice(0,10)?DB.best.g[m.g]||null:null});
  case 'rhist':return rep({h:DB.rhist});
  case 'case_state':return rep({cases:u.cases||0,left:Math.max(0,(u.next||0)-Date.now())});
  case 'case_open':{if((u.cases||0)>0)u.cases--;else if(Date.now()>=(u.next||0))u.next=Date.now()+864e5;else return rep({err:'Кейс ещё не доступен',left:u.next-Date.now()});
   let q=rnd()*100,i=0;for(;i<5;i++){if((q-=CS[i][1])<0)break}u.bal+=CS[i][0];save();
   return rep({i,prize:CS[i][0],bal:r2(u.bal),won:r2(u.won),cases:u.cases||0,left:Math.max(0,(u.next||0)-Date.now())})}
  case 'rocket_start':{const b=r2(+m.bet),E=()=>({bal:r2(u.bal),won:r2(u.won)});
   if(!(b>=1)||b>u.bal)return rep({err:'Неверная ставка',...E()});if(u.rk)return rep({err:'Предыдущий полёт ещё идёт',...E()});
   u.bal-=b;const c=Math.min(500,Math.floor(Math.max(1,DB.rtp/(1-rnd()))*100)/100),auto=+m.auto>=1.01?+m.auto:0,r={id:Date.now()+'',crash:c,t0:Date.now()+3000,b,auto,hist:0};u.rk=r;let out={rk:r.id,startIn:3000};
   if(auto){const win=auto<c;let pay=0;if(win){pay=r2(b*auto);u.bal+=pay;if(pay>b)u.won+=pay-b;best('rocket',u,pay-b)}out={...out,crash:c,win,pay,...E()}}
   setTimeout(()=>{if(!r.hist){r.hist=1;addHist(c)}pushTo(u,{t:'rk',id:r.id,crash:c});if(u.rk===r)u.rk=null},3000+Math.log(c)/RK_K*1000+300);save();return rep(out)}
  case 'rocket_cash':{const r=u.rk;if(!r||r.id!=m.rk||r.auto)return rep({err:'Нет активного полёта'});const now=Date.now();if(now<r.t0)return rep({err:'Ещё не взлетели'});
   const mm=Math.floor(Math.exp(RK_K*(now-r.t0)/1000)*100)/100;if(mm>=r.crash)return rep({crashed:true,crash:r.crash});
   const pay=r2(r.b*mm);u.bal+=pay;if(pay>r.b)u.won+=pay-r.b;best('rocket',u,pay-r.b);if(!r.hist){r.hist=1;addHist(r.crash)}u.rk=null;save();
   return rep({m:mm,pay,crash:r.crash,bal:r2(u.bal),won:r2(u.won)})}
  case 'alogin':{if((w.tries||0)>=5)return rep({err:'Слишком много попыток, перезапусти приложение'});
   if(String(m.pw||'').trim().toLowerCase()!==PW.toLowerCase()){w.tries=(w.tries||0)+1;await sleep(800);return rep({err:'Неверный пароль'})}
   if(ADM.length&&!ADM.includes(u.id))return rep({err:'Твой ID '+u.id+' не в ADMIN_IDS'});w.adm=1;return rep({ok:1})}
  case 'admin':{if(!w.adm)return rep({err:'Нет доступа'});
   if(m.op=='rtp'){DB.rtp=clamp(m.v/100,.5,.99);save();return rep({ok:1})}
   if(m.op=='promo'){DB.promos[String(m.code).trim().toUpperCase()]={a:+m.a,left:+m.uses,used:[],kind:m.kind=='case'?'case':'coins'};save();return rep({ok:1})}
   if(m.op=='grant'){const v=Object.values(DB.users).find(x=>x.un==String(m.to).replace('@','').toLowerCase());if(!v)return rep({err:'Не найден'});v.bal+=+m.a;pushMe(v);save();return rep({ok:1})}
   return rep({users:Object.keys(DB.users).length,online:ONLINE.size,rtp:r2(DB.rtp*100),promos:Object.entries(DB.promos).map(([k,p])=>`${k}: ${p.a}${p.kind=='case'?' кейс.':''} (осталось ${p.left})`)})}
 }});
 w.on('close',()=>ONLINE.delete(w))});
srv.listen(PORT,()=>console.log('Casino on :'+PORT));
