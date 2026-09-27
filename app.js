(function(){
"use strict";
var ASSET="대진국/삼류연정/이미지/";
var DATA=window.SAMRYU_NOVEL;
var characters={
 story:[
  {name:"진소백",role:"주인공 · 동흥표국 표사",img:"진소백.jpg",desc:"스물여덟이 되도록 삼류에 머문 무인. 늦게 피는 사람에게도 때가 있다고 믿는다.",featured:true},
  {name:"서예린",role:"연화 · 숨겨진 이름",img:"서예린.jpg",desc:"진소백이 ‘연화’라 불렀던 여인. 청혼의 날, 감춰 두었던 삶이 드러난다."},
  {name:"곽문정",role:"창운표국 부국주",img:"곽문정.jpg",desc:"하진에서 이름난 일류 무인. 진소백 앞에 나타나 서예린의 과거를 현실로 만든다."},
  {name:"도월천",role:"금면수라 · 절대고수",img:"도월천.jpg",desc:"천살귀검 백령을 죽이고 제2차 정사대전을 끝냈다고 언급되는 강호의 절대고수."},
  {name:"방칠",role:"동흥표국 신입 표사",img:"방칠.jpg",desc:"진소백을 따르는 신입 표사. 청혼 날 그의 창고 당번을 대신 맡아준다."},
  {name:"오충",role:"동흥표국 노표사",img:"오충.jpg",desc:"젊은 시절 이름을 날린 이류 무인. 상심한 진소백에게 현실적인 말을 건넨다."},
  {name:"장형",role:"동흥표국 표두",img:"장형.jpg",desc:"거칠고 실무적인 표두. 주저앉은 진소백을 다시 일상으로 끌어낸다."}
 ],
 world:[
  {name:"불사투신 서문걸",role:"대진국 세계관 인물",img:"불사투신 서문걸.jpg",desc:"‘삼류연정’ 본편에는 등장하지 않는, 대진국 전체 세계관의 인물."},
  {name:"천고일제 독고룡",role:"대진국 세계관 인물",img:"천고일제 독고룡.jpg",desc:"‘삼류연정’ 본편에는 등장하지 않는, 대진국 전체 세계관의 인물."},
  {name:"무극혈신 우르누이",role:"대진국 세계관 인물",img:"무극혈신 우르누이.jpg",desc:"‘삼류연정’ 본편에는 등장하지 않는, 대진국 전체 세계관의 인물."}
 ]
};
function safeGet(k,f){try{var v=localStorage.getItem(k);return v===null?f:v}catch(e){return f}}
function safeSet(k,v){try{localStorage.setItem(k,String(v))}catch(e){}}
function esc(s){return String(s).replace(/[&<>"']/g,function(c){return {"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"}[c]})}
var dialog=document.getElementById("portraitDialog");
function renderCards(list,grid){
 list.forEach(function(c,i){
  var card=document.createElement("article"); card.className="character-card reveal"+(c.featured?" featured":""); card.style.transitionDelay=Math.min(i,6)*40+"ms"; card.tabIndex=0; card.setAttribute("role","button"); card.setAttribute("aria-label",c.name+" 삽화 크게 보기");
  var img=document.createElement("img"); img.loading="lazy"; img.src=encodeURI(ASSET+c.img); img.alt=c.name+" 인물 삽화";
  var copy=document.createElement("div"); copy.className="char-copy"; copy.innerHTML="<small>"+esc(c.role)+"</small><h3>"+esc(c.name)+"</h3><p>"+esc(c.desc)+"</p>";
  card.appendChild(img);card.appendChild(copy);
  function open(){dialog.querySelector("img").src=encodeURI(ASSET+c.img);dialog.querySelector("img").alt=c.name+" 인물 삽화";dialog.querySelector("small").textContent=c.role;dialog.querySelector("h3").textContent=c.name;dialog.querySelector("p").textContent=c.desc;if(dialog.showModal)dialog.showModal()}
  card.addEventListener("click",open); card.addEventListener("keydown",function(e){if(e.key==="Enter"||e.key===" "){e.preventDefault();open()}});
  grid.appendChild(card);
 });
}
renderCards(characters.story,document.getElementById("storyCharacterGrid"));
renderCards(characters.world,document.getElementById("worldCharacterGrid"));
document.querySelectorAll("[data-character-tab]").forEach(function(tab){
 tab.addEventListener("click",function(){
  var key=tab.getAttribute("data-character-tab");
  document.querySelectorAll("[data-character-tab]").forEach(function(t){var on=t===tab;t.classList.toggle("active",on);t.setAttribute("aria-selected",on?"true":"false")});
  ["story","world"].forEach(function(k){var p=document.getElementById("panel-"+k);var on=k===key;p.hidden=!on;p.classList.toggle("active",on)});
  observeReveals();
 });
});
dialog.querySelector(".dialog-close").addEventListener("click",function(){dialog.close()});
dialog.addEventListener("click",function(e){if(e.target===dialog)dialog.close()});

var io=("IntersectionObserver" in window)?new IntersectionObserver(function(entries){entries.forEach(function(e){if(e.isIntersecting){e.target.classList.add("show");io.unobserve(e.target)}})},{threshold:.08}):null;
function observeReveals(){document.querySelectorAll(".reveal:not(.show)").forEach(function(el){if(io)io.observe(el);else el.classList.add("show")})}
observeReveals();
var topbar=document.querySelector(".topbar");function headerState(){topbar.classList.toggle("scrolled",window.scrollY>28)}headerState();window.addEventListener("scroll",headerState,{passive:true});

var reader=document.getElementById("readerContent"),nav=document.getElementById("chapterNav"),bar=document.getElementById("progressBar"),active=0;
function paraHTML(line){
 if(line==="⸻"||/^[-—_]{3,}$/.test(line)) return '<div class="scene-break" aria-label="장면 전환"><span>◆</span></div>';
 var cls=/^[“"‘']/.test(line)?' class="dialogue"':"";
 return "<p"+cls+">"+esc(line)+"</p>";
}
function renderReader(){
 if(!DATA||!Array.isArray(DATA.chapters)||!DATA.chapters.length){reader.innerHTML='<div class="loading"><p>본문 데이터가 없습니다.</p></div>';return}
 nav.innerHTML="";reader.innerHTML="";
 DATA.chapters.forEach(function(ch,i){
  var btn=document.createElement("button");btn.type="button";btn.innerHTML='<span>'+String(ch.number).padStart(2,"0")+'</span><span class="chapter-nav-copy"><b>'+esc(ch.title)+'</b><small>약 '+ch.readMinutes+'분</small></span>';btn.addEventListener("click",function(){showChapter(i,true)});nav.appendChild(btn);
  var sec=document.createElement("section");sec.className="chapter";
  sec.innerHTML='<header><div class="chapter-meta"><span>三流戀情</span><i>·</i><span>第 '+String(ch.number).padStart(2,"0")+' 話</span><i>·</i><span>약 '+ch.readMinutes+'분</span></div><h3>'+esc(ch.title)+'</h3></header><div class="chapter-body">'+ch.paragraphs.map(paraHTML).join("")+'</div><nav class="reader-footer-nav" aria-label="화 이동"><button type="button" data-prev '+(i===0?"disabled":"")+'>'+(i===0?"처음 화입니다":"← 이전 화")+'</button><span>'+String(i+1).padStart(2,"0")+' / '+String(DATA.chapters.length).padStart(2,"0")+'</span><button type="button" data-next '+(i===DATA.chapters.length-1?"disabled":"")+'>'+(i===DATA.chapters.length-1?"마지막 화입니다":"다음 화 →")+'</button></nav>';
  var prev=sec.querySelector("[data-prev]"),next=sec.querySelector("[data-next]");if(prev&&!prev.disabled)prev.addEventListener("click",function(){showChapter(i-1,true)});if(next&&!next.disabled)next.addEventListener("click",function(){showChapter(i+1,true)});
  reader.appendChild(sec);
 });
 var saved=parseInt(safeGet("samryu-chapter","0"),10)||0;showChapter(Math.min(Math.max(saved,0),DATA.chapters.length-1),false);
}
function showChapter(i,scroll){
 active=i;safeSet("samryu-chapter",i);
 Array.prototype.forEach.call(nav.children,function(el,n){el.classList.toggle("active",n===i)});
 reader.querySelectorAll(".chapter").forEach(function(el,n){el.classList.toggle("active",n===i)});
 if(scroll)document.getElementById("reader").scrollIntoView({behavior:"smooth",block:"start"});
 updateProgress();
}
renderReader();
var size=parseInt(safeGet("samryu-size","18"),10)||18;function applySize(){size=Math.max(15,Math.min(24,size));document.documentElement.style.setProperty("--reader",size+"px");safeSet("samryu-size",size)}applySize();
document.querySelectorAll("[data-size]").forEach(function(b){b.addEventListener("click",function(){size+=parseInt(b.getAttribute("data-size"),10);applySize()})});
if(safeGet("samryu-dark","0")==="1")reader.classList.add("dark");
document.getElementById("themeToggle").addEventListener("click",function(){reader.classList.toggle("dark");safeSet("samryu-dark",reader.classList.contains("dark")?"1":"0")});
function updateProgress(){var el=reader.querySelector(".chapter.active");if(!el||!DATA||!DATA.chapters.length)return;var r=el.getBoundingClientRect(),vh=innerHeight,total=Math.max(1,el.offsetHeight-vh*.4),passed=Math.max(0,-r.top+vh*.25),local=Math.max(0,Math.min(1,passed/total));bar.style.width=((active+local)/DATA.chapters.length*100)+"%"}
window.addEventListener("scroll",updateProgress,{passive:true});window.addEventListener("resize",updateProgress);
})();