/* ============================================================
   hero.js — the shot arc behind the headline.

   Pure canvas, no assets. Pauses when the hero scrolls out of view
   or the tab is hidden, and draws a single still arc for anyone who
   has asked their system to reduce motion.
   ============================================================ */

(function(){
  var cv=document.getElementById('arcfx');
  if(!cv)return;
  var ctx=cv.getContext('2d');
  var W=0,H=0,dpr=1,running=false,raf=null,last=0;
  var PINK='248,10,144', BLUE='144,187,232';

  var shots=[],ripples=[],ticks=[],spawnAt=0,flash=0;

  function size(){
    dpr=Math.min(window.devicePixelRatio||1,2);
    W=cv.clientWidth; H=cv.clientHeight;
    cv.width=W*dpr; cv.height=H*dpr;
    ctx.setTransform(dpr,0,0,dpr,0,0);
  }

  function hoop(){return {x:W*0.76,y:H*0.40}; }
  function launch(){return {x:W*0.04,y:H*0.88}; }

  function bez(t,p0,p1,p2){
    var u=1-t;
    return {
      x:u*u*p0.x+2*u*t*p1.x+t*t*p2.x,
      y:u*u*p0.y+2*u*t*p1.y+t*t*p2.y
    };
  }

  function addShot(){
    var L=launch(),Hp=hoop();
    var lift=0.55+Math.random()*0.5;
    shots.push({
      t:0,
      speed:0.34+Math.random()*0.16,
      p0:{x:L.x+(Math.random()*40-20),y:L.y+(Math.random()*30-15)},
      p1:{x:(L.x+Hp.x)/2,y:Hp.y-H*lift},
      p2:Hp,
      done:false
    });
    if(shots.length>3)shots.shift();
  }

  function addRipples(){
    var Hp=hoop();
    for(var i=0;i<9;i++){
      ripples.push({
        x:Hp.x-16+Math.random()*32,
        y:Hp.y+4,
        vy:26+Math.random()*46,
        life:1
      });
    }
    flash=1;
  }

  function addTick(){
    ticks.push({y:H+10,life:1,w:20+Math.random()*70});
  }

  function drawRim(){
    var Hp=hoop();
    ctx.lineWidth=1.5;
    ctx.strokeStyle='rgba('+BLUE+','+(0.5+flash*0.5)+')';
    ctx.beginPath();
    ctx.moveTo(Hp.x-19,Hp.y); ctx.lineTo(Hp.x+19,Hp.y);
    ctx.stroke();
    /* backboard hint */
    ctx.lineWidth=1;
    ctx.strokeStyle='rgba('+BLUE+',0.2)';
    ctx.beginPath();
    ctx.moveTo(Hp.x+26,Hp.y-40); ctx.lineTo(Hp.x+26,Hp.y+22);
    ctx.stroke();
    if(flash>0.01){
      ctx.strokeStyle='rgba('+PINK+','+(flash*0.75)+')';
      ctx.lineWidth=2;
      ctx.beginPath();
      ctx.arc(Hp.x,Hp.y,20+(1-flash)*26,0,Math.PI*2);
      ctx.stroke();
    }
  }

  function frame(ts){
    if(!running)return;
    var dt=Math.min((ts-last)/1000,0.05); last=ts;
    ctx.clearRect(0,0,W,H);

    /* rising altitude ticks */
    if(ts>spawnAt-800 && Math.random()<0.035)addTick();
    for(var i=ticks.length-1;i>=0;i--){
      var k=ticks[i];
      k.y-=dt*26; k.life-=dt*0.22;
      if(k.life<=0||k.y<-10){ticks.splice(i,1);continue;}
      ctx.strokeStyle='rgba('+BLUE+','+(k.life*0.16)+')';
      ctx.lineWidth=1;
      ctx.beginPath(); ctx.moveTo(W*0.06,k.y); ctx.lineTo(W*0.06+k.w,k.y); ctx.stroke();
    }

    drawRim();
    if(flash>0)flash=Math.max(0,flash-dt*1.6);

    /* net ripple on make */
    for(var r=ripples.length-1;r>=0;r--){
      var d=ripples[r];
      d.y+=d.vy*dt; d.vy+=140*dt; d.life-=dt*1.5;
      if(d.life<=0){ripples.splice(r,1);continue;}
      ctx.strokeStyle='rgba('+PINK+','+(d.life*0.7)+')';
      ctx.lineWidth=1;
      ctx.beginPath(); ctx.moveTo(d.x,d.y); ctx.lineTo(d.x,d.y+7); ctx.stroke();
    }

    /* shots */
    if(ts>spawnAt){ addShot(); spawnAt=ts+1500+Math.random()*900; }

    for(var s2=shots.length-1;s2>=0;s2--){
      var sh=shots[s2];
      sh.t+=dt*sh.speed;

      if(sh.t>=1 && !sh.done){ sh.done=true; addRipples(); }
      if(sh.t>1.5){ shots.splice(s2,1); continue; }

      var head=Math.min(sh.t,1);
      var tail=Math.max(0,head-0.42);
      var steps=26;

      /* fading trail */
      for(var n=0;n<steps;n++){
        var ta=tail+(head-tail)*(n/steps);
        var tb=tail+(head-tail)*((n+1)/steps);
        var a=bez(ta,sh.p0,sh.p1,sh.p2), b=bez(tb,sh.p0,sh.p1,sh.p2);
        var alpha=(n/steps)*0.85*(sh.t>1?Math.max(0,1-(sh.t-1)*2):1);
        ctx.strokeStyle='rgba('+PINK+','+alpha+')';
        ctx.lineWidth=1+ (n/steps)*1.4;
        ctx.beginPath(); ctx.moveTo(a.x,a.y); ctx.lineTo(b.x,b.y); ctx.stroke();
      }

      /* ball */
      if(sh.t<=1){
        var pt=bez(head,sh.p0,sh.p1,sh.p2);
        ctx.fillStyle='rgba('+PINK+',0.16)';
        ctx.beginPath(); ctx.arc(pt.x,pt.y,11,0,Math.PI*2); ctx.fill();
        ctx.fillStyle='rgba('+PINK+',1)';
        ctx.beginPath(); ctx.arc(pt.x,pt.y,4.2,0,Math.PI*2); ctx.fill();
      }
    }

    raf=requestAnimationFrame(frame);
  }

  function still(){
    /* reduced-motion: one static arc, no movement */
    size(); ctx.clearRect(0,0,W,H);
    drawRim();
    var L=launch(),Hp=hoop();
    var p1={x:(L.x+Hp.x)/2,y:Hp.y-H*0.7};
    ctx.strokeStyle='rgba('+PINK+',0.55)';
    ctx.lineWidth=1.6;
    ctx.beginPath(); ctx.moveTo(L.x,L.y);
    ctx.quadraticCurveTo(p1.x,p1.y,Hp.x,Hp.y);
    ctx.stroke();
    ctx.fillStyle='rgba('+PINK+',1)';
    ctx.beginPath(); ctx.arc(L.x,L.y,4.2,0,Math.PI*2); ctx.fill();
  }

  function start(){
    if(running||Site.reduced)return;
    running=true; last=performance.now(); spawnAt=last+250;
    raf=requestAnimationFrame(frame);
  }
  function stop(){
    running=false;
    if(raf)cancelAnimationFrame(raf);
  }

  size();
  if(Site.reduced){ still(); window.addEventListener('resize',still,{passive:true}); return; }

  window.addEventListener('resize',function(){size()},{passive:true});
  document.addEventListener('visibilitychange',function(){
    document.hidden?stop():start();
  });
  /* only burn frames while the hero is on screen */
  new IntersectionObserver(function(es){
    es[0].isIntersecting?start():stop();
  },{threshold:0.01}).observe(cv);
})();
