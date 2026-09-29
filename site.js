(function(){
"use strict";
var ASSET="대진국/삼류연정/이미지/";
var characters={
 story:[
  {name:"진소백",role:"주인공 · 동흥표국 표사",img:"진소백.jpg",desc:"스물여덟이 되도록 삼류에 머문 무인. 늦게 피는 사람에게도 때가 있다고 믿는다.",featured:true},
  {name:"서예린",role:"연화 · 숨겨진 이름",img:"서예린.jpg",desc:"진소백이 ‘연화’라 불렀던 여인. 청혼의 날, 감춰 두었던 삶이 드러난다."},
  {name:"곽문정",role:"창운표국 부국주",img:"곽문정.jpg",desc:"하진에서 이름난 일류 무인. 진소백 앞에 나타나 서예린의 과거를 현실로 만든다."},
  {name:"감나무 위의 사내",role:"이름을 알 수 없는 무인",img:"도월천.jpg",desc:"진소백의 집 감나무 위에 나타난 낯선 사내. 이름과 내력은 아직 알 수 없다."},
  {name:"방칠",role:"동흥표국 신입 표사",img:"방칠.jpg",desc:"진소백을 따르는 신입 표사. 청혼 날 그의 창고 당번을 대신 맡아준다."},
  {name:"오충",role:"동흥표국 노표사",img:"오충.jpg",desc:"젊은 시절 이름을 날린 이류 무인. 상심한 진소백에게 현실적인 말을 건넨다."},
  {name:"장형",role:"동흥표국 표두",img:"장형.jpg",desc:"거칠고 실무적인 표두. 주저앉은 진소백을 다시 일상으로 끌어낸다."}
 ],
 world:[
  {name:"천고일제 독고룡",role:"天高一帝 · 대진의 창건자",img:"천고일제 독고룡.jpg",desc:"대진의 창건자이자 통일제. 천명사상의 하늘이 인간으로 현현한 현인신."},
  {name:"무극혈신 우르누이",role:"無極血神 · 대초원의 대칸",img:"무극혈신 우르누이.jpg",desc:"대초원을 통일하고 대진과 전쟁을 벌인 전설적인 정복자."},
  {name:"불사투신 서문걸",role:"不死鬪神 · 오대 무신장",img:"불사투신 서문걸.jpg",desc:"천고일제를 섬긴 오대 무신장 가운데 한 사람."}
 ]
};
function safeGet(k,f){try{var v=localStorage.getItem(k);return v===null?f:v}catch(e){return f}}
function safeSet(k,v){try{localStorage.setItem(k,String(v))}catch(e){}}
function esc(s){return String(s).replace(/[&<>"']/g,function(c){return {"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"}[c]})}
var dialog=document.getElementById("portraitDialog");
function renderCards(list,grid){
 if(!grid)return;
 list.forEach(function(c,i){
  var card=document.createElement("article"); card.className="character-card"; card.tabIndex=0; card.setAttribute("role","button"); card.setAttribute("aria-label",c.name+" 삽화 크게 보기");
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
  document.querySelectorAll("[data-character-tab]").forEach(function(t){var on=t===tab;t.classList.toggle("active",on);t.setAttribute("aria-selected",on?"true":"false");t.tabIndex=on?0:-1});
  ["story","world"].forEach(function(k){var p=document.getElementById("panel-"+k);if(!p)return;var on=k===key;p.hidden=!on;p.classList.toggle("active",on)});
 });
 tab.addEventListener("keydown",function(e){
  var tabs=Array.from(document.querySelectorAll("[data-character-tab]")),index=tabs.indexOf(tab),next;
  if(e.key==="ArrowRight")next=(index+1)%tabs.length;
  else if(e.key==="ArrowLeft")next=(index+tabs.length-1)%tabs.length;
  else if(e.key==="Home")next=0;
  else if(e.key==="End")next=tabs.length-1;
  else return;
  e.preventDefault();tabs[next].click();tabs[next].focus();
 });
});
if(dialog){var dc=dialog.querySelector(".dialog-close");if(dc)dc.addEventListener("click",function(){dialog.close()});dialog.addEventListener("click",function(e){if(e.target===dialog)dialog.close()})}

document.querySelectorAll("[data-continue]").forEach(function(link){
 var key=link.getAttribute("data-continue"),saved=safeGet(key+"-chapter",null),chapter=Number(saved),total=key==="geummyeon"?5:20;
 if(saved!==null&&Number.isInteger(chapter)&&chapter>=0&&chapter<total){link.textContent="이어 읽기 · "+(chapter+1)+"화 ↗";link.href+=(link.href.indexOf("?")===-1?"?":"&")+"chapter="+(chapter+1)}
});

})();
