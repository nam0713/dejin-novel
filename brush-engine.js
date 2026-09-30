/* Original brush geometry: directional strokes, pressure, fixed fibres, delayed bleeding.
   Research and timing decisions are recorded in DESIGN_REFERENCES.md. */
(function () {
  'use strict';
  if (document.body.matches('.reader-page,.afterword-page')) return;
  const NS = 'http://www.w3.org/2000/svg';
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  let serial = 0;
  const jobs = new Set();
  const running = new WeakMap();
  const compact = matchMedia('(max-width: 760px)').matches;
  document.body.classList.add('brush-ready');
  function node(tag, attrs, parent) {
    const element = document.createElementNS(NS, tag);
    Object.entries(attrs || {}).forEach(([key,value]) => element.setAttribute(key, value));
    if (parent) parent.appendChild(element);
    return element;
  }
  function random(seed) { return () => { seed = (seed * 1664525 + 1013904223) >>> 0; return seed / 4294967296; }; }
  function point(curve,t) {
    const u = 1-t;
    return [0,1].map(axis => u*u*u*curve[0][axis]+3*u*u*t*curve[1][axis]+3*u*t*t*curve[2][axis]+t*t*t*curve[3][axis]);
  }
  function curvePath(curve) { return 'M'+curve[0].join(' ')+' C'+curve.slice(1).map(p=>p.join(' ')).join(' '); }
  function outline(curve,width,seed) {
    const rng = random(seed), left = [], right = [];
    for (let i=0;i<=80;i++) {
      const t=i/80, p=point(curve,t), a=point(curve,Math.max(0,t-.005)), b=point(curve,Math.min(1,t+.005));
      const dx=b[0]-a[0], dy=b[1]-a[1], length=Math.hypot(dx,dy)||1;
      const pressure=.13+Math.pow(Math.sin(Math.PI*t),.5)*(.78+.1*Math.sin(t*13));
      const radius=width*.5*pressure*(.91+rng()*.18);
      left.push([p[0]-dy/length*radius,p[1]+dx/length*radius]);
      right.push([p[0]+dy/length*radius*(.9+rng()*.2),p[1]-dx/length*radius]);
    }
    return 'M'+left.concat(right.reverse()).map(p=>p.map(n=>n.toFixed(1)).join(' ')).join(' L')+' Z';
  }
  function filters(defs,id) {
    const rough=node('filter',{id:id+'-dry',x:'-15%',y:'-15%',width:'130%',height:'130%','color-interpolation-filters':'sRGB'},defs);
    node('feTurbulence',{type:'fractalNoise',baseFrequency:'.008 .12',numOctaves:compact?2:3,seed:17,result:'fibres'},rough);
    node('feColorMatrix',{in:'fibres',type:'matrix',values:'0 0 0 0 1  0 0 0 0 1  0 0 0 0 1  5 0 0 0 -1.15',result:'grain'},rough);
    node('feComposite',{in:'SourceGraphic',in2:'grain',operator:'in',result:'dryInk'},rough);
    node('feDisplacementMap',{in:'dryInk',in2:'fibres',scale:20,xChannelSelector:'R',yChannelSelector:'G'},rough);
    const wet=node('filter',{id:id+'-wet',x:'-20%',y:'-20%',width:'140%',height:'140%'},defs);
    node('feMorphology',{in:'SourceGraphic',operator:'dilate',radius:10,result:'expanded'},wet);
    node('feComposite',{in:'expanded',in2:'SourceGraphic',operator:'out',result:'edge'},wet);
    node('feTurbulence',{type:'fractalNoise',baseFrequency:'.017 .047',numOctaves:compact?2:3,seed:23,result:'paper'},wet);
    node('feDisplacementMap',{in:'edge',in2:'paper',scale:18,xChannelSelector:'R',yChannelSelector:'G',result:'bleed'},wet);
    node('feGaussianBlur',{in:'bleed',stdDeviation:compact?1:1.8},wet);
  }
  const sceneStrokes = [
    {curve:[[1480,-140],[1320,100],[1130,600],[1320,1050]],width:450,delay:0,duration:780},
    {curve:[[1740,220],[1080,570],[1040,60],[460,-100]],width:620,delay:180,duration:900},
    {curve:[[1750,860],[1060,380],[550,860],[-160,350]],width:630,delay:520,duration:900},
    {curve:[[-150,-90],[750,330],[300,620],[1700,1020]],width:640,delay:790,duration:1000}
  ];
  const portraitStrokes = [
    {curve:[[-60,-70],[210,100],[440,440],[730,1070]],width:400,delay:0,duration:520},
    {curve:[[740,60],[340,290],[470,660],[-90,1070]],width:530,delay:160,duration:570},
    {curve:[[-70,460],[280,460],[440,690],[740,1030]],width:590,delay:340,duration:520}
  ];
  function painting(width,height,strokes,inverse) {
    const id='brush-'+(++serial);
    const svg=node('svg',{viewBox:'0 0 '+width+' '+height,preserveAspectRatio:'xMidYMid slice','aria-hidden':'true',focusable:'false'});
    const defs=node('defs',{},svg); filters(defs,id);
    const mask=node('mask',{id:id+'-mask',maskUnits:'userSpaceOnUse',x:0,y:0,width,height,'mask-type':'luminance'},defs);
    node('rect',{width,height,fill:inverse?'white':'black'},mask);
    strokes.forEach((stroke,index) => {
      const drawMask=node('mask',{id:id+'-draw-'+index,maskUnits:'userSpaceOnUse',x:-200,y:-200,width:width+400,height:height+400,'mask-type':'luminance'},defs);
      const style='--brush-delay:'+stroke.delay+'ms;--brush-time:'+stroke.duration+'ms';
      node('path',{d:curvePath(stroke.curve),fill:'none',stroke:'white','stroke-width':stroke.width*1.3,'stroke-linecap':'round',pathLength:1,'stroke-dasharray':'1 1','stroke-dashoffset':1,class:'brush-draw',style},drawMask);
      const group=node('g',{mask:'url(#'+id+'-draw-'+index+')'},mask);
      const shape=outline(stroke.curve,stroke.width,index*113+37);
      node('path',{d:shape,fill:inverse?'black':'white',filter:'url(#'+id+'-wet)',class:'brush-wet',style:'--brush-delay:'+(stroke.delay+210)+'ms'},group);
      node('path',{d:shape,fill:inverse?'black':'white',filter:'url(#'+id+'-dry)'},group);
    });
    if(inverse) node('rect',{width,height,fill:'black',opacity:0,class:'brush-finish',style:'--brush-delay:740ms'},mask);
    else node('rect',{width,height,fill:'white',opacity:0,class:'brush-static-fill'},mask);
    return {svg,id,mask:id+'-mask',duration:inverse?1160:2250};
  }
  function play(svg,duration,onFinish) {
    if (reduced.matches) { if (onFinish) onFinish(); return; }
    const previous=running.get(svg);
    if(previous){clearTimeout(previous.timer);jobs.delete(previous);}
    svg.classList.remove('is-painting','is-settled');
    svg.getBoundingClientRect();
    svg.classList.add('is-painting');
    const task={finish:null,timer:0};
    task.finish=()=> { clearTimeout(task.timer);jobs.delete(task);running.delete(svg);svg.classList.remove('is-painting');svg.classList.add('is-settled');if(onFinish)onFinish(); };
    running.set(svg,task);
    jobs.add(task); task.timer=setTimeout(task.finish,duration+100);
  }
  function line(color) {
    const id='brush-line-'+(++serial),svg=node('svg',{viewBox:'0 0 560 60',preserveAspectRatio:'none','aria-hidden':'true',focusable:'false',class:'brush-line'});
    const defs=node('defs',{},svg);
    const tint=node('filter',{id:id+'-tint'},defs); node('feFlood',{'flood-color':color},tint);node('feComposite',{in2:'SourceGraphic',operator:'in'},tint);
    const mask=node('mask',{id,maskUnits:'userSpaceOnUse',x:-15,y:-15,width:590,height:90,'mask-type':'luminance'},defs);
    node('path',{d:'M-20 31 Q130 17 290 30 T590 22',fill:'none',stroke:'white','stroke-width':70,'stroke-linecap':'round',pathLength:1,'stroke-dasharray':'1 1','stroke-dashoffset':1,class:'brush-draw',style:'--brush-delay:0ms;--brush-time:670ms'},mask);
    node('image',{href:'assets/ui/ink-wash.png',x:0,y:0,width:560,height:60,preserveAspectRatio:'none',filter:'url(#'+id+'-tint)',mask:'url(#'+id+')'},svg);
    return svg;
  }
  const observed=[];
  document.querySelectorAll('.masthead,.section-heading,.lore-volume-heading').forEach(heading=> {
    heading.classList.add('brush-heading');
    const svg=line(heading.closest('.ink-hero,.lore-volume-heading')?'#dbc395':'#242b24');
    heading.appendChild(svg); observed.push({element:heading,run:()=>play(svg,800)});
  });
  function portrait(image,force) {
    if (reduced.matches || !image.complete || !image.naturalWidth) return;
    let wrap=image.parentElement;
    if (!wrap.classList.contains('brush-portrait')) {
      wrap=document.createElement('div');wrap.className='brush-portrait';image.before(wrap);wrap.appendChild(image);
    }
    if(wrap.dataset.brushDone && !force)return;
    wrap.dataset.brushDone='true';
    wrap.querySelectorAll('.brush-veil').forEach(old=> {
      const task=running.get(old);
      if(task){clearTimeout(task.timer);jobs.delete(task);running.delete(old);}
      old.remove();
    });
    const reveal=painting(670,1000,portraitStrokes,true);
    reveal.svg.classList.add('brush-veil');
    node('rect',{width:670,height:1000,fill:'#e9e1cf',mask:'url(#'+reveal.mask+')'},reveal.svg);
    wrap.appendChild(reveal.svg);
    play(reveal.svg,reveal.duration,()=>reveal.svg.remove());
  }
  document.querySelectorAll('.character-card img,.landscape img,.opening-art img').forEach(image=> {
    observed.push({element:image,run:()=> {
      if(image.complete)portrait(image,false);
      else image.addEventListener('load',()=>portrait(image,false),{once:true});
    }});
  });
  if ('IntersectionObserver' in window) {
    const observer=new IntersectionObserver(entries=>entries.forEach(entry=> {
      if(!entry.isIntersecting)return;
      const job=observed.find(item=>item.element===entry.target);
      if(job)job.run(); observer.unobserve(entry.target);
    }),{threshold:.08});
    observed.forEach(job=>observer.observe(job.element));
  } else observed.forEach(job=>job.run());

  document.querySelectorAll('.ink-hero,.lore-masthead').forEach(hero=> {
    const source=new Image();
    source.onload=()=> {
      const scene=painting(1600,900,sceneStrokes,false);
      scene.svg.classList.add('brush-scene');
      node('image',{href:source.src,width:1600,height:900,preserveAspectRatio:'xMidYMid slice',mask:'url(#'+scene.mask+')'},scene.svg);
      hero.prepend(scene.svg);hero.classList.add('brush-has-scene');
      const replay=document.createElement('button');replay.type='button';replay.className='brush-replay';
      replay.setAttribute('aria-label','먹그림 다시 그리기');replay.title='먹그림 다시 그리기';
      const icon=node('svg',{viewBox:'0 0 24 24',width:24,height:24,'aria-hidden':'true'},replay);
      node('path',{d:'M15.5 3.5 20.5 8.5 10 19 5 14Z M5 14C6 18 3 20 2 21c4 0 7-1 8-3',fill:'none',stroke:'currentColor','stroke-width':1.5,'stroke-linejoin':'round'},icon);
      (hero.querySelector('.opening-art')||hero).appendChild(replay);
      function draw() {
        hero.dataset.brushPhase='painting';scene.svg.classList.remove('is-settled');
        play(scene.svg,scene.duration,()=> { hero.dataset.brushPhase='settled';scene.svg.classList.remove('is-painting');scene.svg.classList.add('is-settled'); });
        const cover=hero.querySelector('.opening-art img');if(cover)portrait(cover,true);
        const heading=hero.querySelector('.masthead .brush-line');if(heading)play(heading,800);
      }
      replay.addEventListener('click',draw);draw();
    };
    source.src='assets/ui/ink-landscape.png';
  });
  document.querySelectorAll('.contents a,.episode-link,.topbar nav a').forEach(link=> {
    const svg=line(link.closest('.topbar')?'#dfc18b':'#282e26');
    svg.classList.add('brush-response');link.appendChild(svg);
    function respond(){svg.classList.remove('is-settled');play(svg,800);}
    link.addEventListener('pointerenter',respond);link.addEventListener('focus',respond);
  });
  document.querySelectorAll('[data-character-tab]').forEach(tab=>tab.addEventListener('click',()=> {
    requestAnimationFrame(()=> document.querySelectorAll('.character-panel:not([hidden]) img').forEach(image=> {
      const r=image.getBoundingClientRect();if(r.bottom>0&&r.top<innerHeight) {
        if(image.complete)portrait(image,true);else image.addEventListener('load',()=>portrait(image,true),{once:true});
      }
    }));
  }));
  reduced.addEventListener('change',()=> {
    if(!reduced.matches)return;
    Array.from(jobs).forEach(job=>job.finish());
    document.querySelectorAll('.brush-scene,.brush-line').forEach(svg=>svg.classList.add('is-settled'));
    document.querySelectorAll('.brush-veil').forEach(svg=>svg.remove());
  });
})();
