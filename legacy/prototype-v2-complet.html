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
body{margin:0;background:var(--bg);color:var(--ink);font-family:system-ui,-apple-system,"Segoe UI",sans-serif;padding-bottom:84px}
.wrap{max-width:560px;margin:0 auto;padding:0 16px}
header{text-align:center;padding:16px 0 4px}
.logo{font-size:1.9rem;font-weight:800;color:var(--g);margin:0}
.tag{font-size:.8rem;color:var(--mut);margin:0}
h2{font-size:1.15rem;margin:16px 0 2px}
.hint,.small{color:var(--mut);font-size:.88rem}
.hint{margin:0 0 12px}
.grid{display:grid;grid-template-columns:1fr 1fr;gap:12px}
.tile{border:0;border-radius:14px;color:#fff;text-align:left;padding:14px;min-height:108px;font:inherit;cursor:pointer;display:flex;flex-direction:column;justify-content:space-between}
.tile b{font-size:1rem}.tile span{font-size:.78rem;opacity:.92}.tile i{font-style:normal;font-size:1.5rem}
.t1{background:var(--g)}.t2{background:var(--b)}.t3{background:var(--p)}.t4{background:var(--o)}
.card{background:#fff;border:1px solid var(--line);border-radius:14px;padding:14px;margin-top:14px}
.row{display:flex;align-items:center;justify-content:space-between;gap:10px}
.btn{background:var(--g);color:#fff;border:0;border-radius:10px;padding:10px 16px;font:inherit;font-weight:600;cursor:pointer}
.btn.line{background:#fff;color:var(--ink);border:1px solid var(--line)}
.btn.red{background:#fff;color:#B3261E;border:1px solid var(--line)}
.btns{display:flex;gap:8px;flex-wrap:wrap;margin-top:10px}
label{display:block;font-size:.88rem;margin:12px 0 4px}
input,textarea{width:100%;font:inherit;font-size:1rem;border:1px solid var(--line);border-radius:10px;padding:11px;background:#fff}
textarea{min-height:130px}
.course{border-top:1px solid var(--line);padding:12px 0}
.course:first-child{border-top:0}
.course h3{margin:0 0 3px;font-size:1rem}
.msgs{display:flex;flex-direction:column;gap:10px;min-height:220px}
.m{max-width:85%;padding:10px 12px;border-radius:12px;white-space:pre-wrap;font-size:.95rem}
.m.u{align-self:flex-end;background:#DDF3E4}
.m.a{align-self:flex-start;background:#fff;border:1px solid var(--line)}
.opt{display:block;width:100%;text-align:left;background:#fff;border:1px solid var(--line);border-radius:10px;padding:12px;margin-top:8px;font:inherit;cursor:pointer}
.opt.ok{background:#DDF3E4;border-color:var(--g)}.opt.ko{background:#FBE3E1;border-color:#B3261E}
.bar{height:8px;background:var(--line);border-radius:6px;overflow:hidden;margin:4px 0 12px}
.bar div{height:100%;background:var(--g)}
.avg{background:var(--g);color:#fff;border-radius:14px;padding:16px;margin-top:14px}
.avg b{font-size:2rem}
img.prev{max-width:100%;border-radius:10px;margin-top:10px}
nav{position:fixed;left:0;right:0;bottom:0;background:#fff;border-top:1px solid var(--line);display:flex;justify-content:space-around;padding:8px 0 calc(8px + env(safe-area-inset-bottom,0))}
nav button{background:none;border:0;font:inherit;font-size:.72rem;color:var(--mut);display:flex;flex-direction:column;align-items:center;gap:2px;cursor:pointer}
nav button i{font-style:normal;font-size:1.25rem}
nav button.on{color:var(--g);font-weight:700}
#toast{position:fixed;left:50%;bottom:92px;transform:translateX(-50%);background:var(--ink);color:#fff;padding:10px 16px;border-radius:20px;font-size:.88rem;opacity:0;pointer-events:none;transition:opacity .2s;max-width:90%;text-align:center}
#toast.show{opacity:1}
.hide{display:none}
:focus-visible{outline:3px solid var(--b);outline-offset:2px}
</style>
</head>
<body>
<div class="wrap">
<header><h1 class="logo">Savi</h1><p class="tag">Ton professeur intelligent</p></header>

<section id="home">
  <h2>Bonjour <span id="hname">Awa</span> 👋</h2>
  <p class="hint">Que veux-tu apprendre aujourd'hui ?</p>
  <div class="grid">
    <button class="tile t1" data-go="chat"><i>❓</i><div><b>Pose une question</b><br><span>Obtiens une explication claire</span></div></button>
    <button class="tile t2" data-go="devoir"><i>📝</i><div><b>Corriger un devoir</b><br><span>Envoie une photo et fais-toi corriger</span></div></button>
    <button class="tile t3" data-go="quiz"><i>🎓</i><div><b>Quiz &amp; Exercices</b><br><span>Entraîne-toi avec des QCM</span></div></button>
    <button class="tile t4" data-go="cours"><i>📁</i><div><b>Mes cours</b><br><span>Accède à tes cours</span></div></button>
  </div>
  <div class="card"><div class="small">Révision du jour</div>
    <div class="row" style="margin-top:6px"><div><b id="revT">Aucun cours</b><div class="small" id="revS">Ajoute un cours pour commencer</div></div><button class="btn" id="revB">Commencer</button></div></div>
  <div class="card"><div class="small">Ma progression</div><div style="margin-top:6px"><b class="cnt">0</b> cours enregistré(s)</div></div>
</section>

<section id="chat" class="hide">
  <h2>Pose une question</h2>
  <p class="hint">Réponses d'exemple pour l'instant : l'IA sera branchée à l'étape suivante.</p>
  <div class="msgs card" id="msgs"><div class="m a">Bonjour ! Pose-moi ta question sur un cours. 😊</div></div>
  <div class="row" style="margin-top:12px"><input id="q" placeholder="Pose ta question..."><button class="btn" id="send">Envoyer</button></div>
  <div class="btns"><button class="btn line" id="real">Vraie réponse avec Claude</button></div>
</section>

<section id="quiz" class="hide">
  <h2>Quiz</h2>
  <div class="card" id="qbox"></div>
</section>

<section id="devoir" class="hide">
  <h2>Corriger un devoir</h2>
  <p class="hint">Choisis la photo de ton devoir. La correction ci-dessous est un exemple.</p>
  <div class="card">
    <input type="file" id="photo" accept="image/*">
    <div id="pv"></div>
    <div class="btns"><button class="btn" id="corr">Corriger</button></div>
    <div id="res" class="hide">
      <h3 style="margin:16px 0 4px">Ma correction (exemple)</h3>
      <div class="small">1. On calcule le discriminant : Δ = b² − 4ac.<br>2. Δ &gt; 0, donc l'équation a deux solutions.<br>3. On applique les formules pour x₁ et x₂.</div>
      <div class="avg"><b>16/20</b> Très bien 👍</div>
      <div class="small" style="margin-top:8px"><b>À améliorer :</b> la présentation et la vérification du signe.</div>
    </div>
  </div>
</section>

<section id="cours" class="hide">
  <h2>Mes cours et documents</h2>
  <div class="card">
    <label for="titre">Titre du cours</label><input id="titre" placeholder="Ex. Les fractions">
    <label for="texte">Texte du cours</label><textarea id="texte" placeholder="Colle ou écris ton cours ici"></textarea>
    <div class="btns"><button class="btn" id="save">Enregistrer le cours</button></div>
  </div>
  <div class="card" id="list"></div>
</section>

<section id="progres" class="hide">
  <h2>Ma progression</h2>
  <div class="avg"><div class="small" style="color:#fff">Moyenne générale (exemple)</div><b>14,2</b> /20</div>
  <div class="card">
    <div class="small">Par matière (exemple)</div><br>
    <div class="row"><span>Mathématiques</span><b>72 %</b></div><div class="bar"><div style="width:72%"></div></div>
    <div class="row"><span>Français</span><b>84 %</b></div><div class="bar"><div style="width:84%"></div></div>
    <div class="row"><span>Physique</span><b>48 %</b></div><div class="bar"><div style="width:48%"></div></div>
    <div class="row"><span>Anglais</span><b>61 %</b></div><div class="bar"><div style="width:61%"></div></div>
  </div>
  <div class="card"><b class="cnt">0</b> cours enregistré(s) · <b id="qs">0</b> quiz terminé(s)</div>
</section>

<section id="profil" class="hide">
  <h2>Mon profil</h2>
  <div class="card">
    <label for="pn">Prénom</label><input id="pn" placeholder="Ton prénom">
    <label for="pc">Classe</label><input id="pc" placeholder="Ex. 3e">
    <div class="btns"><button class="btn" id="ps">Enregistrer</button></div>
  </div>
</section>
</div>

<nav>
  <button data-go="home" class="on"><i>🏠</i>Accueil</button>
  <button data-go="cours"><i>📁</i>Cours</button>
  <button data-go="quiz"><i>🎓</i>Quiz</button>
  <button data-go="progres"><i>📊</i>Progrès</button>
  <button data-go="profil"><i>👤</i>Profil</button>
</nav>
<div id="toast" role="status"></div>

<script>
var $=function(i){return document.getElementById(i)};
function ld(k,d){try{var v=JSON.parse(localStorage.getItem(k));return v==null?d:v}catch(e){return d}}
function sv(k,v){try{localStorage.setItem(k,JSON.stringify(v))}catch(e){}}
var cours=ld("savi-cours",[]),prof=ld("savi-prof",{n:"Awa",c:"3e"}),qdone=ld("savi-quiz",0);
function toast(t){var e=$("toast");e.textContent=t;e.className="show";setTimeout(function(){e.className=""},2600)}
function go(v){document.querySelectorAll("section").forEach(function(s){s.className=s.id===v?"":"hide"});
  document.querySelectorAll("nav button").forEach(function(b){b.className=b.dataset.go===v?"on":""});
  if(v==="quiz")startQuiz();window.scrollTo(0,0)}
document.querySelectorAll("[data-go]").forEach(function(b){b.onclick=function(){go(b.dataset.go)}});

function copyOpen(p){function f(){toast("Texte copié. Colle-le dans Claude.");window.open("https://claude.ai/new","_blank")}
  if(navigator.clipboard&&navigator.clipboard.writeText){navigator.clipboard.writeText(p).then(f,function(){window.prompt("Copie ce texte :",p)})}else{window.prompt("Copie ce texte :",p)}}
function pr(c,t){var b="Voici mon cours « "+c.titre+" » :\n\n"+c.texte+"\n\n";return t?b+"Propose-moi 5 exercices progressifs sur ce cours. Attends mes réponses avant de corriger.":b+"Fais-moi un mini-examen de 10 questions, puis corrige-le quand je t'envoie mes réponses."}

function render(){
  document.querySelectorAll(".cnt").forEach(function(e){e.textContent=cours.length});
  $("qs").textContent=qdone;$("hname").textContent=prof.n||"";
  $("pn").value=prof.n||"";$("pc").value=prof.c||"";
  $("revT").textContent=cours.length?cours[0].titre:"Aucun cours";
  $("revS").textContent=cours.length?"Exercices sur ton dernier cours":"Ajoute un cours pour commencer";
  var l=$("list");l.innerHTML="";
  if(!cours.length){l.innerHTML='<span class="small">Aucun cours pour l\'instant.</span>';return}
  cours.forEach(function(c,i){
    var d=document.createElement("div");d.className="course";
    var h=document.createElement("h3");h.textContent=c.titre;
    var p=document.createElement("div");p.className="small";p.textContent=c.texte.length>110?c.texte.slice(0,110)+"…":c.texte;
    var r=document.createElement("div");r.className="btns";
    [["Exercices","btn",function(){copyOpen(pr(c,1))}],["Mini-examen","btn line",function(){copyOpen(pr(c,0))}],["Supprimer","btn red",function(){if(confirm("Supprimer ce cours ?")){cours.splice(i,1);sv("savi-cours",cours);render()}}]].forEach(function(x){var b=document.createElement("button");b.className=x[1];b.textContent=x[0];b.onclick=x[2];r.appendChild(b)});
    d.appendChild(h);d.appendChild(p);d.appendChild(r);l.appendChild(d)});
}
$("save").onclick=function(){var t=$("titre").value.trim(),x=$("texte").value.trim();if(!t||!x){toast("Écris un titre et un texte.");return}
  cours.unshift({titre:t,texte:x});sv("savi-cours",cours);$("titre").value="";$("texte").value="";render();toast("Cours enregistré.")};
$("revB").onclick=function(){if(cours.length){copyOpen(pr(cours[0],1))}else{go("cours");toast("Ajoute d'abord un cours.")}};
$("ps").onclick=function(){prof={n:$("pn").value.trim(),c:$("pc").value.trim()};sv("savi-prof",prof);render();toast("Profil enregistré.")};

function add(t,c){var m=document.createElement("div");m.className="m "+c;m.textContent=t;$("msgs").appendChild(m);m.scrollIntoView({block:"nearest"})}
$("send").onclick=function(){var q=$("q").value.trim();if(!q)return;add(q,"u");$("q").value="";
  setTimeout(function(){add("Exemple de réponse : la dérivée de f(x) = x² est f'(x) = 2x.\n1. On écrit la fonction.\n2. On applique la règle (xⁿ)' = n·xⁿ⁻¹.\n3. On obtient 2x.\n\n(Réponse d'exemple. Pour une vraie réponse, touche « Vraie réponse avec Claude ».)","a")},500)};
$("real").onclick=function(){var q=$("q").value.trim();if(!q){toast("Écris d'abord ta question.");return}copyOpen("Tu es un professeur patient. Explique étape par étape, simplement, à un élève de "+(prof.c||"collège")+" : "+q)};

var QS=[{q:"Résous l'équation : 2x + 5 = 13",o:["x = 3","x = 4","x = 5","x = 6"],a:1},
{q:"Vrai ou faux : la dérivée de x² est 2x.",o:["Vrai","Faux"],a:0},
{q:"Quelle est la capitale du Burkina Faso ?",o:["Bobo-Dioulasso","Ouagadougou","Koudougou"],a:1}];
var qi=0,sc=0;
function startQuiz(){qi=0;sc=0;showQ()}
function showQ(){var b=$("qbox");b.innerHTML="";
  if(qi>=QS.length){qdone++;sv("savi-quiz",qdone);$("qs").textContent=qdone;
    b.innerHTML='<h3>Terminé !</h3><div class="avg"><b>'+sc+'/'+QS.length+'</b> bonnes réponses</div><div class="btns"><button class="btn" id="again">Recommencer</button></div>';
    $("again").onclick=startQuiz;return}
  var q=QS[qi];b.innerHTML='<div class="small">Question '+(qi+1)+' / '+QS.length+' · quiz d\'exemple</div><h3 style="margin:8px 0">'+q.q+'</h3>';
  q.o.forEach(function(t,i){var o=document.createElement("button");o.className="opt";o.textContent=t;
    o.onclick=function(){var all=b.querySelectorAll(".opt");all.forEach(function(x,j){x.disabled=true;if(j===q.a)x.className="opt ok"});
      if(i===q.a){sc++;toast("Bonne réponse !")}else{o.className="opt ko";toast("Raté. La bonne réponse est en vert.")}
      var n=document.createElement("div");n.className="btns";n.innerHTML='<button class="btn">'+(qi+1<QS.length?"Question suivante":"Voir le score")+'</button>';
      n.firstChild.onclick=function(){qi++;showQ()};b.appendChild(n)};b.appendChild(o)})}

$("photo").onchange=function(e){var f=e.target.files[0];if(!f)return;var r=new FileReader();
  r.onload=function(){$("pv").innerHTML='<img class="prev" alt="Ton devoir" src="'+r.result+'">'};r.readAsDataURL(f)};
$("corr").onclick=function(){if(!$("photo").files.length){toast("Choisis d'abord une photo.");return}$("res").className=""};
render();
</script>
</body>
</html>
