(function(){
"use strict";
var ASSET="대진국/삼류연정/이미지/";
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
  {name:"천고일제 독고룡",role:"天高一帝 · 대진의 창건자",img:"천고일제 독고룡.jpg",desc:"천하를 통일하고 대진을 세운 초대 황제. 후대에는 대진의 질서와 신앙을 세운 신성한 군주로 숭배된다."},
  {name:"무극혈신 우르누이",role:"無極血神 · 대초원의 대칸",img:"무극혈신 우르누이.jpg",desc:"대초원을 통일하고 대진과 전쟁을 벌인 전설적인 정복자. 대진에서는 무극혈신 또는 혈존이라 불리며 두려움의 상징으로 전해진다."},
  {name:"불사투신 서문걸",role:"不死鬪神 · 오대 무신장",img:"불사투신 서문걸.jpg",desc:"천고일제를 섬긴 오대 무신장 가운데 한 사람. 수많은 전쟁과 전설을 거치며 불사투신이라는 이름으로 후대에 전해진다."}
 ]
};
function safeGet(k,f){try{var v=localStorage.getItem(k);return v===null?f:v}catch(e){return f}}
function safeSet(k,v){try{localStorage.setItem(k,String(v))}catch(e){}}
function esc(s){return String(s).replace(/[&<>"']/g,function(c){return {"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"}[c]})}
var dialog=document.getElementById("portraitDialog");
function renderCards(list,grid){
 if(!grid)return;
 list.forEach(function(c,i){
  var card=document.createElement("article"); card.className="character-card reveal"+(c.featured?" featured":""); card.style.transitionDelay=Math.min(i,6)*40+"ms"; card.tabIndex=0; card.setAttribute("role","button"); card.setAttribute("aria-label",c.name+" 삽화 크게 보기");
  var img=document.createElement("img"); img.loading="lazy"; img.src=encodeURI(ASSET+c.img); img.alt=c.name+" 인물 삽화";
  var copy=document.createElement("div"); copy.className="char-copy"; copy.innerHTML="<small>"+esc(c.role)+"</small><h3>"+esc(c.name)+"</h3><p>"+esc(c.desc)+"</p>";
  card.appendChild(img);card.appendChild(copy);
  function open(){if(!dialog)return;var di=dialog.querySelector("img"),ds=dialog.querySelector("small"),dh=dialog.querySelector("h3"),dp=dialog.querySelector("p");if(di){di.src=encodeURI(ASSET+c.img);di.alt=c.name+" 인물 삽화"}if(ds)ds.textContent=c.role;if(dh)dh.textContent=c.name;if(dp)dp.textContent=c.desc;if(dialog.showModal)dialog.showModal()}
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
  ["story","world"].forEach(function(k){var p=document.getElementById("panel-"+k);if(!p)return;var on=k===key;p.hidden=!on;p.classList.toggle("active",on)});
  observeReveals();
 });
});
if(dialog){var dc=dialog.querySelector(".dialog-close");if(dc)dc.addEventListener("click",function(){dialog.close()});dialog.addEventListener("click",function(e){if(e.target===dialog)dialog.close()})}

var io=("IntersectionObserver" in window)?new IntersectionObserver(function(entries){entries.forEach(function(e){if(e.isIntersecting){e.target.classList.add("show");io.unobserve(e.target)}})},{threshold:0}):null;
function observeReveals(){document.querySelectorAll(".reveal:not(.show)").forEach(function(el){if(io)io.observe(el);else el.classList.add("show")})}
observeReveals();
document.documentElement.classList.add("enhanced");
var topbar=document.querySelector(".topbar");function headerState(){if(topbar)topbar.classList.toggle("scrolled",window.scrollY>28)}headerState();window.addEventListener("scroll",headerState,{passive:true});

})();
