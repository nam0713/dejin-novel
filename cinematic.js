/* Atmospheric art, with one visible-only render loop and a still reading layer. */
(function () {
  'use strict';
  if (!document.body.matches('.home-page,.geummyeon-page,.lore-page')) return;
  const reduced = matchMedia('(prefers-reduced-motion: reduce)'), fine = matchMedia('(pointer:fine)');
  const heroes = [...document.querySelectorAll('.ink-hero,.lore-masthead')];
  const records = [];
  let raf = 0, last = 0;
  const random = (a,b) => a + Math.random() * (b-a);
  heroes.forEach(hero => {
    const stage = document.createElement('div');stage.className='cinematic-stage';stage.setAttribute('aria-hidden','true');
    stage.innerHTML='<div class="scene-far"></div><div class="scene-mist mist-high"></div><div class="scene-mist"></div><div class="scene-foreground"></div><div class="scene-mist mist-near"></div><canvas class="scene-weather"></canvas>';
    hero.prepend(stage);hero.classList.add('cinematic-hero');
    const canvas=stage.querySelector('canvas'),ctx=canvas.getContext('2d');
    if(!ctx)return;
    const mode=document.body.matches('.home-page')?'rain':document.body.matches('.geummyeon-page')?'leaves':'birds';
    const record={hero,canvas,ctx,mode,visible:false,w:0,h:0,x:0,y:0,tx:0,ty:0,particles:[],frames:0,total:0,slow:0};
    records.push(record);
    function resize() {
      const box=hero.getBoundingClientRect(),dpr=Math.min(devicePixelRatio||1,1.5);
      record.w=box.width;record.h=box.height;canvas.width=Math.round(box.width*dpr);canvas.height=Math.round(box.height*dpr);ctx.setTransform(dpr,0,0,dpr,0,0);
      const count=mode==='rain'?(box.width<760?30:64):mode==='leaves'?10:5;
      record.particles=Array.from({length:count},()=>({x:random(0,box.width),y:random(0,box.height),speed:random(.5,1.5),length:random(10,25),phase:random(0,6.28),size:random(2,4)}));
    }
    new ResizeObserver(resize).observe(hero);resize();
    hero.addEventListener('pointermove',event=>{
      if(!fine.matches||reduced.matches)return;
      const box=hero.getBoundingClientRect();record.tx=((event.clientX-box.left)/box.width-.5)*24;record.ty=((event.clientY-box.top)/box.height-.5)*14;
    },{passive:true});
    hero.addEventListener('pointerleave',()=>{record.tx=record.ty=0;},{passive:true});
    hero.addEventListener('focusout',()=>{record.tx=record.ty=0;});
  });
  function updateVisibility() {
    records.forEach(record=>{
      const box=record.hero.getBoundingClientRect();record.visible=box.bottom>0&&box.top<innerHeight;
      record.hero.classList.toggle('scene-paused',!record.visible||document.hidden||reduced.matches);
    });
    schedule();
  }
  function schedule() { if(!raf&&!document.hidden&&!reduced.matches&&records.some(r=>r.visible)) {last=performance.now();raf=requestAnimationFrame(tick);} }
  function tick(now) {
    raf=0;
    if(document.hidden||reduced.matches)return;
    const elapsed=now-last,dt=Math.min(elapsed/16.67,2);last=now;
    records.filter(r=>r.visible).forEach(r=>{
      r.frames++;r.total+=elapsed;if(elapsed>50)r.slow++;
      if(r.frames%120===0){r.hero.dataset.ambientFrameMs=(r.total/r.frames).toFixed(1);r.hero.dataset.ambientSlowFrames=String(r.slow);r.hero.dataset.ambientFrames=String(r.frames);}
      r.x+=(r.tx-r.x)*.06*dt;r.y+=(r.ty-r.y)*.06*dt;
      r.hero.style.setProperty('--scene-x',r.x.toFixed(2)+'px');r.hero.style.setProperty('--scene-y',r.y.toFixed(2)+'px');
      const scroll=Math.min(220,Math.max(0,-r.hero.getBoundingClientRect().top));
      r.hero.style.setProperty('--scene-scroll',scroll.toFixed(1)+'px');
      r.hero.style.setProperty('--cover-x',(r.x*.13).toFixed(2)+'deg');r.hero.style.setProperty('--cover-y',(-r.y*.12).toFixed(2)+'deg');
      const c=r.ctx;c.clearRect(0,0,r.w,r.h);
      r.particles.forEach(p=>{
        p.phase+=.012*dt;
        if(r.mode==='rain') {
          p.x-=.55*p.speed*dt;p.y+=6.5*p.speed*dt;
          if(p.y>r.h+30){p.y=-30;p.x=random(0,r.w+100);}if(p.x<-30)p.x=r.w+20;
          c.strokeStyle='rgba(226,223,200,.16)';c.lineWidth=.6;c.beginPath();c.moveTo(p.x,p.y);c.lineTo(p.x-3,p.y+p.length);c.stroke();
        } else if(r.mode==='leaves') {
          p.x-=.55*p.speed*dt;p.y+=.22*p.speed*dt+Math.sin(p.phase)*.2;
          if(p.x<-20){p.x=r.w+20;p.y=random(0,r.h);}if(p.y>r.h)p.y=-10;
          c.save();c.translate(p.x,p.y);c.rotate(p.phase);c.fillStyle='rgba(181,146,92,.5)';c.beginPath();c.ellipse(0,0,p.size*1.6,p.size*.4,0,0,Math.PI*2);c.fill();c.restore();
        } else {
          p.x-=.15*p.speed*dt;if(p.x<-15){p.x=r.w+15;p.y=random(r.h*.1,r.h*.45);}
          const y=r.h*.25+Math.sin(p.phase)*13+(p.y/r.h)*90;
          c.strokeStyle='rgba(15,26,21,.66)';c.lineWidth=1.2;c.beginPath();c.moveTo(p.x-5,y-Math.sin(p.phase*3)*2);c.quadraticCurveTo(p.x-2,y-4,p.x,y);c.quadraticCurveTo(p.x+2,y-4,p.x+5,y-Math.sin(p.phase*3)*2);c.stroke();
        }
      });
    });
    if(records.some(r=>r.visible))raf=requestAnimationFrame(tick);
  }
  addEventListener('scroll',updateVisibility,{passive:true});addEventListener('resize',updateVisibility,{passive:true});
  document.addEventListener('visibilitychange',updateVisibility);
  reduced.addEventListener('change',()=>{cancelAnimationFrame(raf);raf=0;records.forEach(r=>{r.ctx.clearRect(0,0,r.w,r.h);r.tx=r.ty=r.x=r.y=0;r.hero.style.setProperty('--scene-x','0px');r.hero.style.setProperty('--scene-y','0px');r.hero.style.setProperty('--scene-scroll','0px');});updateVisibility();});
  updateVisibility();
})();
