<!DOCTYPE html>
<html lang="fr">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<meta name="theme-color" content="#0E7C3A">
<title>Savi</title>
<style>
:root{--g:#0E7C3A;--b:#1E6FD9;--p:#6B3FD1;--o:#E8700A;--ink:#17202A;--mut:#667085;--bg:#F4F6F5;--line:#E3E8E6}
*{box-sizing:border-box}
body{margin:0;background:var(--bg);color:var(--ink);font-family:system-ui,-apple-system,"Segoe UI",sans-serif;padding-bottom:80px}
.wrap{max-width:560px;margin:0 auto;padding:0 16px}
header{text-align:center;padding:18px 0 6px}
.logo{font-size:2rem;font-weight:800;color:var(--g);letter-spacing:.02em;margin:0}
.tag{font-size:.8rem;color:var(--mut);margin:0}
h2{font-size:1.15rem;margin:18px 0 2px}
.hint{color:var(--mut);font-size:.9rem;margin:0 0 14px}
.grid{display:grid;grid-template-columns:1fr 1fr;gap:12px}
.tile{border:0;border-radius:14px;color:#fff;text-align:left;padding:16px 14px;min-height:112px;font:inherit;cursor:pointer;display:flex;flex-direction:column;justify-content:space-between}
.tile b{font-size:1rem}.tile span{font-size:.78rem;opacity:.92}.tile i{font-style:normal;font-size:1.6rem}
.t1{background:var(--g)}.t2{background:var(--b)}.t3{background:var(--p)}.t4{background:var(--o)}
.card{background:#fff;border:1px solid var(--line);border-radius:14px;padding:14px;margin-top:16px}
.row{display:flex;align-items:center;justify-content:space-between;gap:10px}
.small{color:var(--mut);font-size:.85rem}
.btn{background:var(--g);color:#fff;border:0;border-radius:10px;padding:10px 16px;font:inherit;font-weight:600;cursor:pointer}
.btn.line{background:#fff;color:var(--ink);border:1px solid var(--line)}
.btn.red{background:#fff;color:#B3261E;border:1px solid var(--line)}
label{display:block;font-size:.88rem;margin:12px 0 4px}
input,textarea{width:100%;font:inherit;font-size:1rem;border:1px solid var(--line);border-radius:10px;padding:11px;background:#fff}
textarea{min-height:150px}
.course{border-top:1px solid var(--line);padding:12px 0}
.course:first-child{border-top:0}
.course h3{margin:0 0 3px;font-size:1rem}
.btns{display:flex;gap:8px;flex-wrap:wrap;margin-top:10px}
nav{position:fixed;left:0;right:0;bottom:0;background:#fff;border-top:1px solid var(--line);display:flex;justify-content:space-around;padding:8px 0 calc(8px + env(safe-area-inset-bottom,0))}
nav button{background:none;border:0;font:inherit;font-size:.75rem;color:var(--mut);display:flex;flex-direction:column;align-items:center;gap:2px;cursor:pointer}
nav button i{font-style:normal;font-size:1.3rem}
nav button.on{color:var(--g);font-weight:700}
#toast{position:fixed;left:50%;bottom:90px;transform:translateX(-50%);background:var(--ink);color:#fff;padding:10px 16px;border-radius:20px;font-size:.88rem;opacity:0;pointer-events:none;transition:opacity .2s;max-width:90%;text-align:center}
#toast.show{opacity:1}
.hide{display:none}
:focus-visible{outline:3px solid var(--b);outline-offset:2px}
</style>
</head>
<body>
<div class="wrap">
<header><h1 class="logo">Savi</h1><p class="tag">Ton professeur intelligent</p></header>

<section id="home">
  <h2>Bonjour 👋</h2>
  <p class="hint">Que veux-tu apprendre aujourd'hui ?</p>
  <div class="grid">
    <button class="tile t1" data-soon="Poser une question"><i>❓</i><div><b>Pose une question</b><br><span>Obtiens une explication claire</span></div></button>
    <button class="tile t2" data-soon="Corriger un devoir"><i>📝</i><div><b>Corriger un devoir</b><br><span>Envoie une photo et fais-toi corriger</span></div></button>
    <button class="tile t3" id="goQuiz"><i>🎓</i><div><b>Quiz &amp; Exercices</b><br><span>Entraîne-toi avec tes cours</span></div></button>
    <button class="tile t4" id="goCours"><i>📁</i><div><b>Mes cours</b><br><span>Accède à tes cours</span></div></button>
  </div>
  <div class="card">
    <div class="small">Révision du jour</div>
    <div class="row" style="margin-top:6px"><div><b id="revTitle">Aucun cours</b><div class="small" id="revSub">Ajoute un cours pour commencer</div></div><button class="btn" id="revBtn">Commencer</button></div>
  </div>
  <div class="card"><div class="small">Ma progression</div><div style="margin-top:6px"><b id="count">0</b> cours enregistré(s)</div></div>
</section>

<section id="cours" class="hide">
  <h2>Mes cours</h2>
  <div class="card">
    <label for="titre">Titre du cours</label>
    <input id="titre" placeholder="Ex. Les fractions">
    <label for="texte">Texte du cours</label>
    <textarea id="texte" placeholder="Colle ou écris ton cours ici"></textarea>
    <div class="btns"><button class="btn" id="save">Enregistrer le cours</button></div>
  </div>
  <div class="card" id="list"></div>
</section>
</div>

<nav>
  <button id="nHome" class="on"><i>🏠</i>Accueil</button>
  <button id="nCours"><i>📁</i>Mes cours</button>
</nav>
<div id="toast" role="status"></div>

<script>
var KEY="savi-cours", cours=[];
try{cours=JSON.parse(localStorage.getItem(KEY))||[]}catch(e){cours=[]}
function $(i){return document.getElementById(i)}
function save(){try{localStorage.setItem(KEY,JSON.stringify(cours))}catch(e){}}
function toast(t){var e=$("toast");e.textContent=t;e.className="show";setTimeout(function(){e.className=""},2600)}
function show(v){$("home").className=v==="home"?"":"hide";$("cours").className=v==="cours"?"":"hide";$("nHome").className=v==="home"?"on":"";$("nCours").className=v==="cours"?"on":"";window.scrollTo(0,0)}
function prompt2(c,t){var b="Voici mon cours « "+c.titre+" » :\n\n"+c.texte+"\n\n";return t==="exos"?b+"Propose-moi 5 exercices progressifs sur ce cours. Attends mes réponses avant de donner les corrections.":b+"Fais-moi un mini-examen de 10 questions sur ce cours, puis corrige-le quand je t'envoie mes réponses."}
function send(i,t){var p=prompt2(cours[i],t);function go(){toast("Texte copié. Colle-le dans Claude.");window.open("https://claude.ai/new","_blank")}
if(navigator.clipboard&&navigator.clipboard.writeText){navigator.clipboard.writeText(p).then(go,function(){window.prompt("Copie ce texte :",p)})}else{window.prompt("Copie ce texte :",p)}}
function render(){
  $("count").textContent=cours.length;
  if(cours.length){$("revTitle").textContent=cours[0].titre;$("revSub").textContent="Exercices sur ton dernier cours"}else{$("revTitle").textContent="Aucun cours";$("revSub").textContent="Ajoute un cours pour commencer"}
  var l=$("list");l.innerHTML="";
  if(!cours.length){l.innerHTML='<span class="small">Aucun cours pour l\'instant. Ajoute ton premier cours ci-dessus.</span>';return}
  cours.forEach(function(c,i){
    var d=document.createElement("div");d.className="course";
    var h=document.createElement("h3");h.textContent=c.titre;
    var p=document.createElement("div");p.className="small";p.textContent=c.texte.length>120?c.texte.slice(0,120)+"…":c.texte;
    var r=document.createElement("div");r.className="btns";
    [["Exercices","btn",function(){send(i,"exos")}],["Mini-examen","btn line",function(){send(i,"exam")}],["Supprimer","btn red",function(){if(confirm("Supprimer ce cours ?")){cours.splice(i,1);save();render()}}]].forEach(function(x){var b=document.createElement("button");b.className=x[1];b.textContent=x[0];b.onclick=x[2];r.appendChild(b)});
    d.appendChild(h);d.appendChild(p);d.appendChild(r);l.appendChild(d)});
}
$("save").onclick=function(){var t=$("titre").value.trim(),x=$("texte").value.trim();if(!t||!x){toast("Écris un titre et un texte avant d'enregistrer.");return}
  cours.unshift({titre:t,texte:x});save();$("titre").value="";$("texte").value="";render();toast("Cours enregistré.")};
$("goCours").onclick=$("nCours").onclick=function(){show("cours")};
$("nHome").onclick=function(){show("home")};
$("goQuiz").onclick=function(){if(cours.length){show("cours");toast("Touche Exercices ou Mini-examen sur un cours.")}else{show("cours");toast("Ajoute d'abord un cours.")}};
$("revBtn").onclick=function(){if(cours.length){send(0,"exos")}else{show("cours");toast("Ajoute d'abord un cours.")}};
document.querySelectorAll("[data-soon]").forEach(function(b){b.onclick=function(){toast(b.getAttribute("data-soon")+" : bientôt disponible.")}});
render();
</script>
</body>
</html>
