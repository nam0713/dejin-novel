/* Additive paint: original artwork remains visible throughout each gesture. */
(function () {
  'use strict';
  if(document.body.matches('.reader-page,.afterword-page'))return;
  const NS='http://www.w3.org/2000/svg',reduced=matchMedia('(prefers-reduced-motion: reduce)');
  const compact=matchMedia('(max-width: 760px)').matches,jobs=new Set(),inks=new Map();
  let serial=0;
  function node(tag,attrs,parent) {
    const e=document.createElementNS(NS,tag);
    Object.entries(attrs||{}).forEach(([key,value])=>e.setAttribute(key,value));
    if(parent)parent.appendChild(e);return e;
  }
  function canvas(w,h) { const c=document.createElement('canvas');c.width=w;c.height=h;return c; }
  function loadImage(src) { return new Promise((resolve,reject)=>{const i=new Image();i.onload=()=>{if(i.decode)i.decode().then(()=>resolve(i),reject);else resolve(i);};i.onerror=reject;i.src=src;}); }
  function random(seed) { return ()=>{seed=(seed*1664525+1013904223)>>>0;return seed/4294967296;}; }
  function point(c,t) { const u=1-t;return [0,1].map(a=>u*u*u*c[0][a]+3*u*u*t*c[1][a]+3*u*t*t*c[2][a]+t*t*t*c[3][a]); }
  function curvePath(c) { return 'M'+c[0].join(' ')+' C'+c.slice(1).map(p=>p.join(' ')).join(' '); }
  function outline(c,width,seed) {
    const rng=random(seed),left=[],right=[];
    for(let i=0;i<=100;i++) {
      const t=i/100,p=point(c,t),a=point(c,Math.max(0,t-.005)),b=point(c,Math.min(1,t+.005));
      const dx=b[0]-a[0],dy=b[1]-a[1],length=Math.hypot(dx,dy)||1;
      const radius=width*.5*(.18+Math.pow(Math.sin(Math.PI*t),.65)*.8)*(.94+rng()*.12);
      left.push([p[0]-dy/length*radius,p[1]+dx/length*radius]);
      right.push([p[0]+dy/length*radius,p[1]-dx/length*radius]);
    }
    return 'M'+left.concat(right.reverse()).map(p=>p.map(n=>n.toFixed(1)).join(' ')).join(' L')+' Z';
  }
  const sceneStrokes=[
    {curve:[[1510,-40],[1470,180],[1530,650],[1580,950]],width:210,delay:0,duration:1450},
    {curve:[[970,-50],[800,160],[1030,420],[870,910]],width:240,delay:1600,duration:1350},
    {curve:[[1640,950],[1330,790],[1050,820],[620,900]],width:210,delay:3100,duration:1300}
  ];
  const frameStrokes=[
    {curve:[[14,16],[225,10],[443,10],[654,16]],width:8,delay:0,duration:750},
    {curve:[[654,16],[660,350],[660,650],[654,982]],width:8,delay:800,duration:850},
    {curve:[[654,982],[440,994],[222,994],[14,982]],width:8,delay:1700,duration:750},
    {curve:[[14,982],[10,650],[10,350],[14,16]],width:8,delay:2500,duration:850}
  ];
  function geometry(stroke) {
    if(stroke.geometry)return stroke.geometry;
    const points=[];let length=0,previous=null;
    for(let i=0;i<=160;i++){const p=point(stroke.curve,i/160);if(previous)length+=Math.hypot(p[0]-previous[0],p[1]-previous[1]);points.push({x:p[0],y:p[1],distance:length});previous=p;}
    return stroke.geometry={points,length};
  }
  function play(svg,duration,onFinish,tracks,owner) {
    if(svg.classList.contains('is-painting')||svg.classList.contains('is-settled'))return;
    if(reduced.matches) {svg.classList.add('is-settled');if(onFinish)onFinish();return;}
    svg.classList.add('is-painting');
    const task={timer:0,frame:0,finish:null};
    task.finish=()=>{
      clearTimeout(task.timer);cancelAnimationFrame(task.frame);jobs.delete(task);
      svg.classList.remove('is-painting');svg.classList.add('is-settled');
      svg.querySelector('.brush-front')?.remove();if(onFinish)onFinish();
    };
    jobs.add(task);task.timer=setTimeout(task.finish,duration+80);
    if(tracks) {
      const front=svg.querySelector('.brush-front'),start=performance.now();
      let previous=0,frames=0,slow=0,total=0;
      function tick(now) {
        const elapsed=now-start;
        if(previous){const delta=now-previous;total+=delta;frames++;if(delta>50)slow++;}
        previous=now;
        const track=tracks.find(item=>elapsed>=item.stroke.delay&&elapsed<=item.stroke.delay+item.stroke.duration);
        if(track&&front) {
          const t=(elapsed-track.stroke.delay)/track.stroke.duration,distance=t*track.geometry.length,points=track.geometry.points;
          let i=1;while(i<points.length-1&&points[i].distance<distance)i++;
          const a=points[i-1],b=points[i],fraction=(distance-a.distance)/(b.distance-a.distance||1);
          const x=a.x+(b.x-a.x)*fraction,y=a.y+(b.y-a.y)*fraction,angle=Math.atan2(b.y-a.y,b.x-a.x)*180/Math.PI;
          front.setAttribute('transform','translate('+x+' '+y+') rotate('+angle+')');
          front.setAttribute('opacity',String(.6*Math.pow(Math.sin(Math.PI*t),.35)));
        } else if(front)front.setAttribute('opacity','0');
        if(elapsed<duration)task.frame=requestAnimationFrame(tick);
        else if(owner&&frames) {
          owner.dataset.brushFrames=String(frames);owner.dataset.brushFrameMs=(total/frames).toFixed(1);owner.dataset.brushSlowFrames=String(slow);
        }
      }
      task.frame=requestAnimationFrame(tick);
    }
  }
  function croppedWash(wash) {
    const original=canvas(wash.naturalWidth,wash.naturalHeight),ctx=original.getContext('2d');
    ctx.drawImage(wash,0,0);
    const pixels=ctx.getImageData(0,0,original.width,original.height).data;
    let left=original.width,top=original.height,right=0,bottom=0;
    for(let y=0;y<original.height;y++)for(let x=0;x<original.width;x++) {
      if(pixels[(y*original.width+x)*4+3]<35)continue;
      left=Math.min(left,x);right=Math.max(right,x);top=Math.min(top,y);bottom=Math.max(bottom,y);
    }
    const result=canvas(800,120);
    result.getContext('2d').drawImage(original,left,top,right-left+1,bottom-top+1,0,0,800,120);return result;
  }
  function tint(wash,color) {
    if(inks.has(color))return inks.get(color);
    const c=canvas(800,120),ctx=c.getContext('2d');ctx.drawImage(wash,0,0);
    ctx.globalCompositeOperation='source-in';ctx.fillStyle=color;ctx.fillRect(0,0,800,120);
    const url=c.toDataURL();inks.set(color,url);return url;
  }
  function bake(wash,stroke,width,height,index,color,source) {
    const scale=compact ? .6 : 1,mask=canvas(Math.ceil(width*scale),Math.ceil(height*scale)),ctx=mask.getContext('2d');
    ctx.scale(scale,scale);ctx.clip(new Path2D(outline(stroke.curve,stroke.width,index*127+37)));
    ctx.fillStyle='#fff';ctx.globalAlpha=.24;ctx.fillRect(0,0,width,height);ctx.globalAlpha=.9;
    const angle=Math.atan2(stroke.curve[3][1]-stroke.curve[0][1],stroke.curve[3][0]-stroke.curve[0][0]),span=Math.hypot(width,height)*1.7;
    ctx.translate(width/2,height/2);ctx.rotate(angle);ctx.drawImage(wash,-span/2,-span/2,span,span);
    const result=canvas(mask.width,mask.height),ink=result.getContext('2d');
    if(source){ink.filter='contrast(1.65) saturate(.6)';ink.drawImage(source,0,0,result.width,result.height);ink.filter='none';}
    else{ink.fillStyle=color;ink.fillRect(0,0,result.width,result.height);}
    ink.globalCompositeOperation='destination-in';ink.drawImage(mask,0,0);return result.toDataURL();
  }
  function painting(bitmaps,strokes,width,height,frontInk) {
    const svg=node('svg',{viewBox:'0 0 '+width+' '+height,preserveAspectRatio:frontInk?'xMidYMid slice':'none','aria-hidden':'true',focusable:'false'});
    const defs=node('defs',{},svg),tracks=[];
    strokes.forEach((stroke,index)=>{
      const id='brush-pass-'+(++serial);
      const mask=node('mask',{id,maskUnits:'userSpaceOnUse',x:-100,y:-100,width:width+200,height:height+200,'mask-type':'alpha'},defs);
      const path=node('path',{d:curvePath(stroke.curve),fill:'none',stroke:'white','stroke-width':stroke.width*1.25,'stroke-linecap':'butt',pathLength:1,'stroke-dasharray':'1 1','stroke-dashoffset':1,class:'brush-draw',style:'--brush-delay:'+stroke.delay+'ms;--brush-time:'+stroke.duration+'ms'},mask);
      node('image',{href:bitmaps[index],width,height,mask:'url(#'+id+')'},svg);
      if(frontInk)tracks.push({stroke,geometry:geometry(stroke)});
    });
    if(frontInk){const front=node('g',{class:'brush-front',opacity:0},svg);node('image',{href:frontInk,x:-38,y:-10,width:76,height:20,preserveAspectRatio:'none'},front);}
    return {svg,tracks,duration:Math.max(...strokes.map(s=>s.delay+s.duration))};
  }
  async function initialize(wash) {
    const dry=croppedWash(wash);document.body.classList.add('brush-ready');
    function line(color) {
      const id='brush-line-'+(++serial),svg=node('svg',{viewBox:'0 0 560 60',preserveAspectRatio:'none','aria-hidden':'true',focusable:'false',class:'brush-line'});
      const href=tint(dry,color),defs=node('defs',{},svg);
      node('image',{href,y:22,width:560,height:16,preserveAspectRatio:'none',opacity:.4},svg);
      const mask=node('mask',{id,maskUnits:'userSpaceOnUse',x:-15,y:-15,width:590,height:90,'mask-type':'alpha'},defs);
      node('path',{d:'M-20 31 Q130 17 290 30 T590 22',fill:'none',stroke:'white','stroke-width':70,'stroke-linecap':'butt',pathLength:1,'stroke-dasharray':'1 1','stroke-dashoffset':1,class:'brush-draw',style:'--brush-delay:0ms;--brush-time:1050ms'},mask);
      node('image',{href,y:22,width:560,height:16,preserveAspectRatio:'none',mask:'url(#'+id+')'},svg);return svg;
    }
    const observed=[];
    document.querySelectorAll('.masthead,.section-heading,.lore-volume-heading').forEach(heading=>{
      const svg=line(heading.closest('.ink-hero,.lore-volume-heading')?'#dbc395':'#242b24');
      heading.classList.add('brush-heading');heading.appendChild(svg);observed.push({element:heading,run:()=>play(svg,1050)});
    });
    const frameBitmaps=frameStrokes.map((s,i)=>bake(dry,s,670,1000,i,'#a78d60'));
    const sceneAssets=reduced.matches||!document.querySelector('.ink-hero:not(.cinematic-hero),.lore-masthead:not(.cinematic-hero)') ? Promise.resolve(null) : loadImage('assets/ui/ink-landscape.png').then(async source=>{
      const bitmaps=sceneStrokes.map((s,i)=>bake(dry,s,1600,900,i,null,source));
      await Promise.all(bitmaps.map(loadImage));return bitmaps;
    }).catch(()=>null);
    const [,sceneBitmaps]=await Promise.all([Promise.all(frameBitmaps.map(loadImage)),sceneAssets]);
    function frame(image) {
      if(image.closest('.world-atlas,.home-page #lore .landscape'))return;
      if(reduced.matches||image.dataset.brushDone||!image.naturalWidth)return;
      image.dataset.brushDone='true';
      const wrap=document.createElement('div');wrap.className='brush-portrait';image.before(wrap);wrap.appendChild(image);
      const border=painting(frameBitmaps,frameStrokes,670,1000);border.svg.classList.add('brush-frame');wrap.appendChild(border.svg);play(border.svg,border.duration);
    }
    document.querySelectorAll('.character-card img,.landscape img,.opening-art img').forEach(image=>{
      observed.push({element:image,run:()=>{if(image.complete)frame(image);else image.addEventListener('load',()=>frame(image),{once:true});}});
    });
    if('IntersectionObserver' in window) {
      const observer=new IntersectionObserver(entries=>entries.forEach(entry=>{
        if(!entry.isIntersecting)return;observed.find(job=>job.element===entry.target)?.run();observer.unobserve(entry.target);
      }),{threshold:.08});observed.forEach(job=>observer.observe(job.element));
    } else observed.forEach(job=>job.run());
    document.querySelectorAll('.ink-hero:not(.cinematic-hero),.lore-masthead:not(.cinematic-hero)').forEach(hero=>{
      if(reduced.matches||!sceneBitmaps)return;
      hero.dataset.brushPhase='painting';
      const scene=painting(sceneBitmaps,sceneStrokes,1600,900,tint(dry,'#111e17'));
      scene.svg.classList.add('brush-scene');hero.prepend(scene.svg);
      play(scene.svg,scene.duration,()=>{
        hero.dataset.brushPhase='settled';scene.svg.classList.add('brush-resting');
      },scene.tracks,hero);
    });
    document.querySelectorAll('.contents a,.episode-link,.topbar nav a').forEach(link=>{
      const svg=line(link.closest('.topbar')?'#dfc18b':'#282e26');svg.classList.add('brush-response');link.appendChild(svg);
      link.addEventListener('pointerenter',()=>play(svg,1050));link.addEventListener('focus',()=>play(svg,1050));
    });
  }
  reduced.addEventListener('change',()=>{
    if(!reduced.matches)return;Array.from(jobs).forEach(job=>job.finish());
    document.querySelectorAll('.brush-front,.brush-scene').forEach(e=>e.remove());
  });
  loadImage('assets/ui/ink-wash.png').then(initialize).catch(()=>{ /* Static artwork and normal navigation are the fallback. */ });
})();
