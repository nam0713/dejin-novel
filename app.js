(function(){
"use strict";
var ASSET="대진국/삼류연정/이미지/";
var NOVEL="대진국/삼류연정/그녀에게는 남편이 있었다.txt";
var characters=[
{name:"진소백",role:"주인공 · 동흥표국 표사",img:"진소백.jpg",desc:"스물여덟이 되도록 삼류에 머문 무인. 늦게 피는 사람에게도 때가 있다고 믿는다.",featured:true},
{name:"서예린",role:"연화 · 숨겨진 이름",img:"서예린.jpg",desc:"진소백이 연화라 불렀던 여인. 청혼의 날, 감춰 두었던 삶이 드러난다."},
{name:"곽문정",role:"창운표국 부국주",img:"곽문정.jpg",desc:"하진에서 이름난 일류 무인. 진소백 앞에 나타나 서예린의 과거를 현실로 만든다."},
{name:"도월천",role:"금면수라 · 절대고수",img:"도월천.jpg",desc:"천살귀검 백령을 쓰러뜨리고 제2차 정사대전을 끝냈다고 전해지는 강호의 거물."},
{name:"방칠",role:"동흥표국 신입 표사",img:"방칠.jpg",desc:"진소백의 창고 당번을 대신 서 줄 만큼 살가운 후배."},
{name:"오충",role:"동흥표국 노표사",img:"오충.jpg",desc:"젊은 시절 이름을 날렸던 이류 무인. 상심한 진소백에게 현실적인 조언을 건넨다."},
{name:"장형",role:"동흥표국 표두",img:"장형.jpg",desc:"거칠고 실무적인 표두. 주저앉은 진소백을 다시 일터로 끌어낸다."},
{name:"불사투신 서문걸",role:"세계관 인물",img:"불사투신 서문걸.jpg",desc:"현재 공개 본문 바깥에서 존재가 예고된 대진국의 무인."},
{name:"무극혈신 우르누이",role:"세계관 인물",img:"무극혈신 우르누이.jpg",desc:"현재 공개 본문 바깥에서 존재가 예고된 대진국의 무인."},
{name:"천고일제 독고룡",role:"세계관 인물",img:"천고일제 독고룡.jpg",desc:"현재 공개 본문 바깥에서 존재가 예고된 대진국의 무인."}
];
function safeGet(k,f){try{var v=localStorage.getItem(k);return v===null?f:v}catch(e){return f}}
function safeSet(k,v){try{localStorage.setItem(k,String(v))}catch(e){}}
function esc(s){return String(s).replace(/[&<>"']/g,function(c){return {"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"}[c]})}
var grid=document.getElementById("characterGrid");
var dialog=document.getElementById("portraitDialog");
characters.forEach(function(c,i){
  var card=document.createElement("article");
  card.className="character-card reveal"+(c.featured?" featured":"");
  card.style.transitionDelay=Math.min(i,6)*40+"ms";
  card.tabIndex=0;card.setAttribute("role","button");card.setAttribute("aria-label",c.name+" 삽화 크게 보기");
  var img=document.createElement("img");img.loading="lazy";img.src=encodeURI(ASSET+c.img);img.alt=c.name+" 인물 삽화";
  var copy=document.createElement("div");copy.className="char-copy";
  copy.innerHTML="<small>"+esc(c.role)+"</small><h3>"+esc(c.name)+"</h3><p>"+esc(c.desc)+"</p>";
  card.appendChild(img);card.appendChild(copy);
  function open(){dialog.querySelector("img").src=encodeURI(ASSET+c.img);dialog.querySelector("img").alt=c.name+" 인물 삽화";dialog.querySelector("small").textContent=c.role;dialog.querySelector("h3").textContent=c.name;dialog.querySelector("p").textContent=c.desc;if(dialog.showModal)dialog.showModal()}
  card.addEventListener("click",open);card.addEventListener("keydown",function(e){if(e.key==="Enter"||e.key===" "){e.preventDefault();open()}});
  grid.appendChild(card);
});
dialog.querySelector(".dialog-close").addEventListener("click",function(){dialog.close()});
dialog.addEventListener("click",function(e){if(e.target===dialog)dialog.close()});
var io=("IntersectionObserver" in window)?new IntersectionObserver(function(entries){entries.forEach(function(e){if(e.isIntersecting){e.target.classList.add("show");io.unobserve(e.target)}})},{threshold:.08}):null;
document.querySelectorAll(".reveal").forEach(function(el){if(io)io.observe(el);else el.classList.add("show")});
var topbar=document.querySelector(".topbar");
function headerState(){topbar.classList.toggle("scrolled",window.scrollY>28)}
headerState();window.addEventListener("scroll",headerState,{passive:true});

var reader=document.getElementById("readerContent"),nav=document.getElementById("chapterNav"),bar=document.getElementById("progressBar");
var chapters=[],active=0;
function splitNovel(raw){
  var clean=raw.replace(/^\uFEFF/,"").replace(/\r/g,"");
  var re=/^(제\d+화\s*[—-]\s*.+)$/gm,matches=[],m;
  while((m=re.exec(clean))!==null)matches.push({title:m[1],index:m.index,len:m[0].length});
  return matches.map(function(x,i){return {title:x.title,body:clean.slice(x.index+x.len,i+1<matches.length?matches[i+1].index:clean.length).trim()}})
}
function bodyHTML(body){
  return body.split(/\n+/).map(function(x){return x.trim()}).filter(Boolean).map(function(line){
    if(line==="⸻"||line==="---")return "<hr>";
    return "<p"+(/^[“"]/.test(line)?' class="dialogue"':"")+">"+esc(line)+"</p>"
  }).join("")
}
function showChapter(i,scroll){
  active=i;safeSet("samryu-chapter",i);
  Array.prototype.forEach.call(nav.children,function(el,n){el.classList.toggle("active",n===i)});
  reader.querySelectorAll(".chapter").forEach(function(el,n){el.classList.toggle("active",n===i)});
  if(scroll)reader.scrollIntoView({behavior:"smooth",block:"start"});updateProgress()
}
function render(){
  nav.innerHTML="";reader.innerHTML="";
  chapters.forEach(function(ch,i){
    var parts=ch.title.split(/[—-]/),num=parts.shift().trim(),title=parts.join("—").trim()||ch.title;
    var b=document.createElement("button");b.type="button";b.innerHTML="<span>"+String(i+1).padStart(2,"0")+"</span><b>"+esc(title)+"</b>";b.addEventListener("click",function(){showChapter(i,true)});nav.appendChild(b);
    var sec=document.createElement("section");sec.className="chapter";sec.innerHTML='<header><small>三流戀情 · '+esc(num)+'</small><h3>'+esc(title)+"</h3></header>"+bodyHTML(ch.body);reader.appendChild(sec)
  });
  var saved=parseInt(safeGet("samryu-chapter","0"),10)||0;showChapter(Math.min(saved,chapters.length-1),false)
}
fetch(encodeURI(NOVEL)).then(function(r){if(!r.ok)throw new Error("본문 파일을 불러오지 못했습니다.");return r.text()}).then(function(t){chapters=splitNovel(t);if(!chapters.length)throw new Error("화 구분을 찾지 못했습니다.");render()}).catch(function(err){nav.innerHTML="";reader.innerHTML='<div class="loading"><div><p><b>본문을 불러오지 못했습니다.</b></p><p>'+esc(err.message)+'</p><p><a href="'+encodeURI(NOVEL)+'" target="_blank" rel="noopener">원문 직접 열기 ↗</a></p></div></div>'});
var size=parseInt(safeGet("samryu-size","18"),10)||18;
function applySize(){size=Math.max(15,Math.min(24,size));document.documentElement.style.setProperty("--reader",size+"px");safeSet("samryu-size",size)}
applySize();
document.querySelectorAll("[data-size]").forEach(function(b){b.addEventListener("click",function(){size+=parseInt(b.getAttribute("data-size"),10);applySize()})});
if(safeGet("samryu-dark","0")==="1")reader.classList.add("dark");
document.getElementById("themeToggle").addEventListener("click",function(){reader.classList.toggle("dark");safeSet("samryu-dark",reader.classList.contains("dark")?"1":"0")});
function updateProgress(){var el=reader.querySelector(".chapter.active");if(!el||!chapters.length)return;var r=el.getBoundingClientRect(),vh=innerHeight,total=Math.max(1,el.offsetHeight-vh*.4),passed=Math.max(0,-r.top+vh*.25),local=Math.max(0,Math.min(1,passed/total));bar.style.width=((active+local)/chapters.length*100)+"%"}
window.addEventListener("scroll",updateProgress,{passive:true});window.addEventListener("resize",updateProgress);
})();