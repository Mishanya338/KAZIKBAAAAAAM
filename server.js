const ex=PV.players.find(p=>p.u===u);
   u.bal-=b;if(ex)ex.b=r2(ex.b+b);else PV.players.push({u,n:u.name,b});if(!ex&&PV.players.length==1){PV.end=Date.now()+20000;clearTimeout(tick);tick=setTimeout(startRound,20000)}
   save();bc(pvPub());return rep({bal:r2(u.bal)})}
  case 'best':return rep({b:DB.best.d===new Date().toISOString().slice(0,10)?DB.best.g[m.g]||null:null});
  case 'rhist':return rep({h:DB.rhist});
  case 'case_state':return rep({cases:u.cases0,left:Math.max(0,(u.next0)-Date.now())});
  case 'case_open':{if((u.cases0)>0)u.cases--;else if(Date.now()>=(u.next0))u.next=Date.now()+864e5;else return rep({err:'Кейс ещё не доступен',left:u.next-Date.now()});
   let q=rnd()*100,i=0;for(;i<5;i++){if((q-=CS[i][1])<0)break}u.bal+=CS[i][0];save();
   return rep({i,prize:CS[i][0],bal:r2(u.bal),won:r2(u.won),cases:u.cases0,left:Math.max(0,(u.next0)-Date.now())})}
  case 'rocket_start':{const b=r2(+m.bet),E=()=>({bal:r2(u.bal),won:r2(u.won)});
   if(!(b>=1)||b>u.bal)return rep({err:'Неверная ставка',...E()});if(u.rk)return rep({err:'Предыдущий полёт ещё идёт',...E()});
   u.bal-=b;const c=Math.min(500,Math.floor(Math.max(1,DB.rtp/(1-rnd()))*100)/100),auto=+m.auto>=1.01?+m.auto:0,r={id:Date.now()+'',crash:c,t0:Date.now()+3000,b,auto,hist:0};u.rk=r;let out={rk:r.id,startIn:3000};
   if(auto){const win=auto<c;let pay=0;if(win){pay=r2(b*auto);u.bal+=pay;if(pay>b)u.won+=pay-b;best('rocket',u,pay-b)}out={...out,crash:c,win,pay,...E()}}
   setTimeout(()=>{if(!r.hist){r.hist=1;addHist(c)}pushTo(u,{t:'rk',id:r.id,crash:c});if(u.rk===r)u.rk=null},3000+Math.log(c)/RK_K*1000+300);save();return rep(out)}
  case 'rocket_cash':{const r=u.rk;if(!rr.id!=m.rkr.auto)return rep({err:'Нет активного полёта'});const now=Date.now();if(now<r.t0)return rep({err:'Ещё не взлетели'});
   const mm=Math.floor(Math.exp(RK_K*(now-r.t0)/1000)*100)/100;if(mm>=r.crash)return rep({crashed:true,crash:r.crash});
   const pay=r2(r.b*mm);u.bal+=pay;if(pay>r.b)u.won+=pay-r.b;best('rocket',u,pay-r.b);if(!r.hist){r.hist=1;addHist(r.crash)}u.rk=null;save();
   return rep({m:mm,pay,crash:r.crash,bal:r2(u.bal),won:r2(u.won)})}
  case 'alogin':{if((w.tries||0)>=5)return rep({err:'Слишком много попыток, перезапусти приложение'});
   if(String(m.pw'').trim().toLowerCase()!==PW.toLowerCase()){w.tries=(w.tries0)+1;await sleep(800);return rep({err:'Неверный пароль'})}
   if(ADM.length&&!ADM.includes(u.id))return rep({err:'Твой ID '+u.id+' не в ADMIN_IDS'});w.adm=1;return rep({ok:1})}
  case 'admin':{if(!w.adm)return rep({err:'Нет доступа'});
   if(m.op=='rtp'){DB.rtp=clamp(m.v/100,.5,.99);save();return rep({ok:1})}
   if(m.op=='promo'){DB.promos[String(m.code).trim().toUpperCase()]={a:+m.a,left:+m.uses,used:[],kind:m.kind=='case'?'case':'coins'};save();return rep({ok:1})}
   if(m.op=='grant'){const v=Object.values(DB.users).find(x=>x.un==String(m.to).replace('@','').toLowerCase());if(!v)return rep({err:'Не найден'});v.bal+=+m.a;pushMe(v);save();return rep({ok:1})}
   return rep({users:Object.keys(DB.users).length,online:ONLINE.size,rtp:r2(DB.rtp*100),promos:Object.entries(DB.promos).map(([k,p])=>${k}: ${p.a}${p.kind=='case'?' кейс.':''} (осталось ${p.left}))})}
 }});
 w.on('close',()=>ONLINE.delete(w))});
srv.listen(PORT,()=>console.log('Casino on :'+PORT));
