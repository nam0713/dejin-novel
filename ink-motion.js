/* Presentation navigation only. Reader palettes and reading progress remain independent. */
(function () {
  'use strict';
  if(document.body.matches('.reader-page,.afterword-page'))return;
  const sections=Array.from(document.querySelectorAll('.topbar nav a[href^="#"]')).map(link=>({link,section:document.getElementById(link.hash.slice(1))})).filter(item=>item.section);
  const progress=document.createElement('div');progress.className='ink-reading-progress';progress.setAttribute('aria-hidden','true');document.body.appendChild(progress);
  let frame=0;
  function update(){
    frame=0;
    const distance=document.documentElement.scrollHeight-innerHeight;
    progress.style.setProperty('--ink-progress',distance>0?Math.min(1,Math.max(0,scrollY/distance)):0);
    let current=null;
    sections.forEach(item=>{if(!item.section.hidden&&item.section.getBoundingClientRect().top<=innerHeight*.35)current=item;});
    sections.forEach(item=>{const active=item===current;item.link.classList.toggle('ink-current',active);if(active)item.link.setAttribute('aria-current','location');else item.link.removeAttribute('aria-current');});
  }
  function schedule(){if(!frame)frame=requestAnimationFrame(update);}
  addEventListener('scroll',schedule,{passive:true});addEventListener('resize',schedule);addEventListener('load',schedule);
  if('ResizeObserver' in window)new ResizeObserver(schedule).observe(document.body);
  update();
})();
