(function(){
"use strict";
var DATA=window.SAMRYU_NOVEL;
function safeGet(k,f){try{var v=localStorage.getItem(k);return v===null?f:v}catch(e){return f}}
function safeSet(k,v){try{localStorage.setItem(k,String(v))}catch(e){}}
function esc(s){return String(s).replace(/[&<>"']/g,function(c){return {"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"}[c]})}
var reader=document.getElementById("readerContent"),nav=document.getElementById("chapterNav"),bar=document.getElementById("progressBar"),active=0;
var illustrations={
  1:[
    {after:"진소백은 비녀를 두 손으로 들었다.",file:"1-1.png",alt:"진소백이 연화에게 은빛 연꽃 비녀를 내미는 장면"},
    {after:"그는 비녀를 쥔 채 한참 빗속에 서 있었다.",file:"1-2.png",alt:"비에 젖은 진소백이 비녀를 쥐고 월향루를 돌아보는 장면"}
  ],
  2:[
    {after:"그의 손바닥이 진소백의 가슴에 닿았다.",file:"2-1.png",alt:"창고에서 곽문정의 손바닥에 밀려나는 진소백"},
    {after:"낡은 회색 장포를 걸친 사내였다. 한쪽 무릎을 세운 채 나뭇가지에 기대어 술병을 기울이고 있었다.",file:"2-2.png",alt:"감나무 가지에 앉아 술병을 든 사내를 진소백이 올려다보는 장면"}
  ],
  3:[
    {after:"스물세 냥이 불꽃 속에서 사라졌다.",file:"3-1.png",alt:"진소백이 마당의 불길에 비급을 태우는 장면"},
    {after:"그녀는 나무비녀를 집어 들었다.",file:"3-2.png",alt:"달빛이 드는 창가에서 나무비녀를 쥔 서예린"}
  ]
};
Object.keys(window.SAMRYU_ILLUSTRATIONS||{}).forEach(function(number){illustrations[number]=window.SAMRYU_ILLUSTRATIONS[number]});
function paraHTML(line){
 if(line==="⸻"||/^[-—_]{3,}$/.test(line)) return '<div class="scene-break" aria-label="장면 전환"><span>◆</span></div>';
 var cls=/^[“"‘']/.test(line)?' class="dialogue"':"";
 return "<p"+cls+">"+esc(line)+"</p>";
}
function illustrationHTML(item){
 var src=encodeURI("대진국/삼류연정/삽화/"+item.file);
 return '<figure class="chapter-illustration"><img src="'+esc(src)+'" alt="'+esc(item.alt)+'" width="1024" height="1536" loading="lazy" decoding="async"></figure>';
}
function chapterBodyHTML(ch){
 var art=illustrations[ch.number]||[];
 return ch.paragraphs.map(function(line){
  var html=paraHTML(line);
  art.forEach(function(item){if(line===item.after)html+=illustrationHTML(item)});
  return html;
 }).join("");
}
function renderReader(){
 if(!DATA||!Array.isArray(DATA.chapters)||!DATA.chapters.length){reader.innerHTML='<div class="loading"><p>본문 데이터가 없습니다.</p></div>';return}
 nav.innerHTML="";reader.innerHTML="";
 DATA.chapters.forEach(function(ch,i){
  var btn=document.createElement("button");btn.type="button";btn.innerHTML='<span>'+String(ch.number).padStart(2,"0")+'</span><span class="chapter-nav-copy"><b>'+esc(ch.title)+'</b><small>약 '+ch.readMinutes+'분</small></span>';btn.addEventListener("click",function(){showChapter(i,true)});nav.appendChild(btn);
  var sec=document.createElement("section");sec.className="chapter";
  sec.innerHTML='<header><div class="chapter-meta"><span>三流戀情</span><i>·</i><span>第 '+String(ch.number).padStart(2,"0")+' 話</span><i>·</i><span>약 '+ch.readMinutes+'분</span></div><h3>'+esc(ch.title)+'</h3></header><div class="chapter-body">'+chapterBodyHTML(ch)+'</div><nav class="reader-footer-nav" aria-label="화 이동"><button type="button" data-prev '+(i===0?"disabled":"")+'>'+(i===0?"처음 화입니다":"← 이전 화")+'</button><span>'+String(i+1).padStart(2,"0")+' / '+String(DATA.chapters.length).padStart(2,"0")+'</span><button type="button" data-next '+(i===DATA.chapters.length-1?"disabled":"")+'>'+(i===DATA.chapters.length-1?"마지막 화입니다":"다음 화 →")+'</button></nav>';
  var prev=sec.querySelector("[data-prev]"),next=sec.querySelector("[data-next]");if(prev&&!prev.disabled)prev.addEventListener("click",function(){showChapter(i-1,true)});if(next&&!next.disabled)next.addEventListener("click",function(){showChapter(i+1,true)});
  reader.appendChild(sec);
 });
 var requested=Number(new URLSearchParams(location.search).get("chapter"));
 var saved=Number.isInteger(requested)&&requested>=1&&requested<=DATA.chapters.length?requested-1:parseInt(safeGet("samryu-chapter","0"),10)||0;showChapter(Math.min(Math.max(saved,0),DATA.chapters.length-1),false);
}
function showChapter(i,scroll){
 active=i;safeSet("samryu-chapter",i);
 Array.prototype.forEach.call(nav.children,function(el,n){el.classList.toggle("active",n===i);if(n===i)el.setAttribute("aria-current","true");else el.removeAttribute("aria-current")});
 reader.querySelectorAll(".chapter").forEach(function(el,n){el.classList.toggle("active",n===i)});
 if(nav.scrollWidth>nav.clientWidth)nav.scrollLeft=nav.children[i].offsetLeft-nav.children[0].offsetLeft;
 if(nav.scrollHeight>nav.clientHeight)nav.scrollTop=nav.children[i].offsetTop-nav.children[0].offsetTop;
 if(scroll){
  var url=new URL(location.href);url.searchParams.set("chapter",String(i+1));history.replaceState(null,"",url);
  var heading=reader.querySelector(".chapter.active h3");heading.tabIndex=-1;heading.focus({preventScroll:true});
  window.scrollTo({top:0,behavior:"instant"});
 }
 updateProgress();
}
if (!DATA || !Array.isArray(DATA.chapters) || !DATA.chapters.length) return;
renderReader();
var size=parseInt(safeGet("samryu-size","18"),10)||18;function applySize(){size=Math.max(15,Math.min(24,size));document.documentElement.style.setProperty("--reader",size+"px");safeSet("samryu-size",size)}applySize();
document.querySelectorAll("[data-size]").forEach(function(b){b.addEventListener("click",function(){size+=parseInt(b.getAttribute("data-size"),10);applySize()})});
var themeToggle=document.getElementById("themeToggle");
if(safeGet("samryu-dark","0")==="1")reader.classList.add("dark");
themeToggle.setAttribute("aria-pressed",String(reader.classList.contains("dark")));
document.getElementById("themeToggle").addEventListener("click",function(){reader.classList.toggle("dark");themeToggle.setAttribute("aria-pressed",String(reader.classList.contains("dark")));safeSet("samryu-dark",reader.classList.contains("dark")?"1":"0")});
function updateProgress(){var el=reader.querySelector(".chapter.active");if(!el||!DATA||!DATA.chapters.length)return;var r=el.getBoundingClientRect(),vh=innerHeight,total=Math.max(1,el.offsetHeight-vh*.4),passed=Math.max(0,-r.top+vh*.25),local=Math.max(0,Math.min(1,passed/total));bar.style.width=((active+local)/DATA.chapters.length*100)+"%"}
window.addEventListener("scroll",updateProgress,{passive:true});window.addEventListener("resize",updateProgress);
})();
