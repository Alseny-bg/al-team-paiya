
var sb = null;
var currentUser = null;
var allEvents = [];
var currentFilter = 'Tous';
var currentQuery = '';
var advancedCity = '';
var advancedDate = '';
var advancedPlace = 'Tous';
var favoritesOnly = false;
var favoriteIds = new Set();
var places = ['Le Slalom','Le Network','Le Beeflor','Le Room','Footsal','Shicha Party chez Al','BBQ chez BOUBA','Shicha Party chez Alasko','Atieke Party chez Solokounboté'];
var categories = ['Tous','Restaurant','Cinéma','Sport','Soirée','Jeux','Voyage','Nature'];

try {
  if (window.supabase && window.TEAM_PAIYA_CONFIG) {
    sb = window.supabase.createClient(
      window.TEAM_PAIYA_CONFIG.supabaseUrl,
      window.TEAM_PAIYA_CONFIG.supabasePublishableKey
    );
  }
} catch (e) {
  console.error(e);
}

function esc(value) {
  return String(value == null ? '' : value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function toast(message) {
  var el = document.getElementById('toast');
  if (!el) return;
  el.textContent = message;
  el.classList.add('show');
  setTimeout(function(){ el.classList.remove('show'); }, 2800);
}

function closeModal() {
  document.getElementById('modal').classList.remove('show');
}

function openModal(html) {
  document.getElementById('modalBox').innerHTML = html;
  document.getElementById('modal').classList.add('show');
}

function emoji(category) {
  var map = {'Restaurant':'🍽️','Cinéma':'🎬','Sport':'⚽','Soirée':'🎉','Jeux':'🎲','Voyage':'✈️','Nature':'🌿'};
  return map[category] || '✨';
}

function dateLabel(date, time) {
  try {
    return new Date(date + 'T' + (time || '00:00')).toLocaleString('fr-FR', {
      weekday:'short', day:'2-digit', month:'short', hour:'2-digit', minute:'2-digit'
    });
  } catch(e) { return date + ' ' + (time || ''); }
}

function updateAuthNav() {
  var nav = document.getElementById('authNav');
  if (!nav) return;
  if (currentUser) {
    nav.innerHTML = '<button class="ghost" onclick="showMyOutings()">Mes sorties</button><button class="ghost" onclick="showFavorites()">❤️ Favoris</button><button class="ghost" onclick="showMessages()">💬 Messages <span id="msgBadge" style="display:none"></span></button><button class="ghost" onclick="openNotificationCenter()">🔔 Notifications <span id="notifBadge" style="display:none"></span></button><button class="ghost" onclick="showProfile()">Mon profil</button><button class="primary" onclick="logout()">Déconnexion</button>';
  } else {
    nav.innerHTML = '<button class="ghost" onclick="openAuth(\'login\')">Se connecter</button><button class="primary" onclick="openAuth(\'signup\')">S\'inscrire</button>';
  }
}

function eventPhoto(event) {
  if (event && event.image_url) return event.image_url;
  var map = {
    'Restaurant': 'photo-1.jpg',
    'Cinéma': 'photo-2.jpg',
    'Sport': 'photo-3.jpg',
    'Soirée': 'photo-4.jpg',
    'Jeux': 'photo-5.jpg',
    'Voyage': 'photo-6.jpg',
    'Nature': 'photo-7.jpg'
  };
  var index = 0;
  if (event && event.id) {
    var text = String(event.id);
    for (var i=0;i<text.length;i++) index += text.charCodeAt(i);
  }
  return map[event.category] || ('photo-' + ((index % 10) + 1) + '.jpg');
}
function card(event) {
  var photo = eventPhoto(event);
  return '<article class="card">' +
    '<div class="cover"><img src="' + photo + '" alt="' + esc(event.title) + '" loading="lazy"><span>' + emoji(event.category) + ' ' + esc(event.category) + '</span></div>' +
    '<div class="body">' +
    '<div class="row"><span class="pill">' + esc(event.place) + '</span><span class="muted">' + esc(event.city) + '</span></div>' +
    '<h3>' + esc(event.title) + '</h3>' +
    '<div class="meta"><div>📅 ' + dateLabel(event.event_date,event.event_time) + '</div>' +
    '<div>👤 ' + event.count + '/' + event.max_participants + ' participants</div><div>💜 Gratuit</div></div>' +
    '<div style="display:flex;gap:8px;margin-top:14px"><button class="primary" style="flex:1" onclick="showEvent(\'' + event.id + '\')">Voir la sortie</button><button class="ghost" title="Ajouter aux favoris" style="font-size:18px;padding:8px 12px" onclick="toggleFavorite(\'' + event.id + '\');event.stopPropagation()">' + (favoriteIds.has(event.id) ? '❤️' : '♡') + '</button></div>' +
    '</div></article>';
}

function showHome() {
  var featured = allEvents.slice(0,6);
  document.getElementById('app').innerHTML =
    '<div class="wrap">' +
    '<section class="hero"><div>' +
    '<span class="pill">✨ La plateforme des sorties entre amis</span>' +
    '<h1>On sort ?<br><span>Team Paiya.</span></h1>' +
    '<p>Découvre des sorties, rejoins un groupe et crée tes propres moments. Simple, gratuit et pensé pour se retrouver.</p>' +
    '<div class="kpis"><div class="kpi"><strong>100%</strong><span>sorties gratuites au lancement</span></div>' +
    '<div class="kpi"><strong>9+</strong><span>lieux Team Paiya disponibles</span></div>' +
    '<div class="kpi"><strong>1 clic</strong><span>pour rejoindre une sortie</span></div></div>' +
    '<div class="search"><input id="homeSearch" placeholder="Restaurant, sport, Lille..." value="' + esc(currentQuery) + '">' +
    '<button class="primary" onclick="doSearch()">Rechercher</button></div>' +
    '</div><div class="hero-card"><span class="pill">TEAM PAIYA</span><h2>Plus de sorties.<br>Plus de rencontres.</h2>' +
    '<p>Choisis une activité, regarde qui participe et rejoins automatiquement la sortie.</p>' +
    '<button class="primary" style="background:white;color:#5b21b6" onclick="showExplore()">Explorer les sorties →</button></div></section>' +
    '<section class="section"><div class="section-head"><div><h2>Comment ça marche ?</h2><div class="muted">Simple, rapide, social.</div></div></div>' +
    '<div class="grid"><article class="card"><div class="body"><span class="pill">01</span><h3>🔎 Trouve une sortie</h3><div class="muted">Choisis une activité et regarde les prochaines sorties.</div></div></article>' +
    '<article class="card"><div class="body"><span class="pill">02</span><h3>🤝 Rejoins le groupe</h3><div class="muted">Un clic suffit pour participer.</div></div></article>' +
    '<article class="card"><div class="body"><span class="pill">03</span><h3>🎉 Profite du moment</h3><div class="muted">Retrouve les participants.</div></div></article></div></section>' +
    '<section class="section"><div class="section-head"><div><h2>Les prochaines sorties</h2><div class="muted">Les bons plans du moment</div></div><button class="ghost" onclick="showExplore()">Tout voir →</button></div>' +
    '<div class="grid">' + (featured.length ? featured.map(card).join('') : '<div class="empty" style="grid-column:1/-1">Aucune sortie pour le moment. Sois le premier à en créer une !</div>') + '</div></section>' +
    "\\n<section class=\\"section\\" id=\\"teamPaiyaGallerySection\\">\\n  <div class=\\"section-head\\">\\n    <div><h2>📸 Les moments Team Paiya</h2><div class=\\"muted\\">Quelques souvenirs de nos sorties.</div></div>\\n  </div>\\n  <div class=\\"gallery-grid\\">\\n    <button class=\"gallery-item\" type=\"button\" onclick=\"openGallery(1)\"><img src=\"photo-1.jpg\" alt=\"Moment Team Paiya 1\" loading=\"lazy\" onerror=\"this.closest('.gallery-item').remove();checkGalleryVisibility()\"></button><button class=\"gallery-item\" type=\"button\" onclick=\"openGallery(2)\"><img src=\"photo-2.jpg\" alt=\"Moment Team Paiya 2\" loading=\"lazy\" onerror=\"this.closest('.gallery-item').remove();checkGalleryVisibility()\"></button><button class=\"gallery-item\" type=\"button\" onclick=\"openGallery(3)\"><img src=\"photo-3.jpg\" alt=\"Moment Team Paiya 3\" loading=\"lazy\" onerror=\"this.closest('.gallery-item').remove();checkGalleryVisibility()\"></button><button class=\"gallery-item\" type=\"button\" onclick=\"openGallery(4)\"><img src=\"photo-4.jpg\" alt=\"Moment Team Paiya 4\" loading=\"lazy\" onerror=\"this.closest('.gallery-item').remove();checkGalleryVisibility()\"></button><button class=\"gallery-item\" type=\"button\" onclick=\"openGallery(5)\"><img src=\"photo-5.jpg\" alt=\"Moment Team Paiya 5\" loading=\"lazy\" onerror=\"this.closest('.gallery-item').remove();checkGalleryVisibility()\"></button><button class=\"gallery-item\" type=\"button\" onclick=\"openGallery(6)\"><img src=\"photo-6.jpg\" alt=\"Moment Team Paiya 6\" loading=\"lazy\" onerror=\"this.closest('.gallery-item').remove();checkGalleryVisibility()\"></button><button class=\"gallery-item\" type=\"button\" onclick=\"openGallery(7)\"><img src=\"photo-7.jpg\" alt=\"Moment Team Paiya 7\" loading=\"lazy\" onerror=\"this.closest('.gallery-item').remove();checkGalleryVisibility()\"></button><button class=\"gallery-item\" type=\"button\" onclick=\"openGallery(8)\"><img src=\"photo-8.jpg\" alt=\"Moment Team Paiya 8\" loading=\"lazy\" onerror=\"this.closest('.gallery-item').remove();checkGalleryVisibility()\"></button><button class=\"gallery-item\" type=\"button\" onclick=\"openGallery(9)\"><img src=\"photo-9.jpg\" alt=\"Moment Team Paiya 9\" loading=\"lazy\" onerror=\"this.closest('.gallery-item').remove();checkGalleryVisibility()\"></button><button class=\"gallery-item\" type=\"button\" onclick=\"openGallery(10)\"><img src=\"photo-10.jpg\" alt=\"Moment Team Paiya 10\" loading=\"lazy\" onerror=\"this.closest('.gallery-item').remove();checkGalleryVisibility()\"></button>\\n  </div>\\n</section></section>" +
    '</div>';
}

function showExplore() {
  document.getElementById('app').innerHTML =
    '<div class="wrap"><section class="section"><div class="section-head"><div><h2>Explorer les sorties</h2><div class="muted" id="countLabel"></div></div>' +
    '<button class="primary" onclick="openCreate()">+ Créer</button></div>' +
    '<div class="search"><input id="exploreSearch" placeholder="Rechercher une sortie..." value="' + esc(currentQuery) + '" oninput="currentQuery=this.value;renderExplore()"></div>' +
    '<div class="filters">' + categories.map(function(cat){return '<button class="filter ' + (currentFilter===cat?'active':'') + '" onclick="currentFilter=\'' + cat + '\';renderExplore()">' + cat + '</button>';}).join('') + '</div>' +
    '<div class="card" style="margin-bottom:20px"><div class="body"><div class="section-head" style="margin-bottom:12px"><div><h3 style="margin:0">🔎 Recherche avancée</h3><div class="muted">Affine les sorties selon tes critères.</div></div><button class="ghost" onclick="resetAdvancedSearch()">Réinitialiser</button></div>' +
    '<div class="two"><label>Ville<input id="advancedCity" placeholder="Ex. Lille" value="' + esc(advancedCity) + '" oninput="advancedCity=this.value;renderExplore()"></label><label>Date<input id="advancedDate" type="date" value="' + esc(advancedDate) + '" onchange="advancedDate=this.value;renderExplore()"></label></div>' +
    '<div class="two" style="margin-top:12px"><label>Lieu<select id="advancedPlace" onchange="advancedPlace=this.value;renderExplore()"><option>Tous</option>' + places.map(function(p){return '<option '+(advancedPlace===p?'selected':'')+'>'+esc(p)+'</option>';}).join('') + '</select></label><label style="display:flex;align-items:center;gap:8px;margin-top:24px"><input id="favoritesOnly" type="checkbox" style="width:auto;margin:0" '+(favoritesOnly?'checked':'')+' onchange="favoritesOnly=this.checked;renderExplore()"> ❤️ Mes favoris uniquement</label></div></div></div>' +
    '<div id="exploreMap" style="height:420px;border-radius:20px;overflow:hidden;border:1px solid var(--line);margin-bottom:24px"></div><div id="exploreGrid" class="grid"></div></section></div>';
  renderExplore();
  setTimeout(renderExploreMap, 50);
}

function renderExplore() {
  var list = allEvents.filter(function(e){
    var text = [e.title,e.place,e.city,e.description].join(' ').toLowerCase();
    return (currentFilter === 'Tous' || e.category === currentFilter) &&
      (!currentQuery || text.indexOf(currentQuery.toLowerCase()) !== -1) &&
      (!advancedCity || String(e.city||'').toLowerCase().includes(advancedCity.toLowerCase())) &&
      (!advancedDate || e.event_date === advancedDate) &&
      (advancedPlace === 'Tous' || e.place === advancedPlace) &&
      (!favoritesOnly || favoriteIds.has(e.id));
  });
  var count = document.getElementById('countLabel');
  var grid = document.getElementById('exploreGrid');
  if (count) count.textContent = list.length + ' sortie(s) disponible(s)';
  if (grid) grid.innerHTML = list.length ? list.map(card).join('') : '<div class="empty" style="grid-column:1/-1">Aucune sortie ne correspond à ta recherche.</div>';
  setTimeout(renderExploreMap, 30);
}

var paiyaMap=null;
async function geocodePlace(place,city) {
  try {
    var q=encodeURIComponent((place||'')+', '+(city||'Lille')+', France');
    var r=await fetch('https://nominatim.openstreetmap.org/search?format=json&limit=1&q='+q);
    var d=await r.json();
    return d&&d[0]?{lat:Number(d[0].lat),lng:Number(d[0].lon)}:null;
  } catch(e){return null;}
}
async function renderExploreMap() {
  var el=document.getElementById('exploreMap');
  if(!el || typeof L==='undefined') return;
  if(paiyaMap) { paiyaMap.remove(); paiyaMap=null; }
  paiyaMap=L.map(el).setView([50.6292,3.0573],12);
  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',{maxZoom:19,attribution:'© OpenStreetMap'}).addTo(paiyaMap);

  // La carte utilise exactement les mêmes filtres que la liste.
  var list=allEvents.filter(function(e){
    var text=[e.title,e.place,e.city,e.description].join(' ').toLowerCase();
    return (currentFilter==='Tous'||e.category===currentFilter) &&
      (!currentQuery||text.indexOf(currentQuery.toLowerCase())!==-1) &&
      (!advancedCity||String(e.city||'').toLowerCase().includes(advancedCity.toLowerCase())) &&
      (!advancedDate||e.event_date===advancedDate) &&
      (advancedPlace==='Tous'||e.place===advancedPlace) &&
      (!favoritesOnly||favoriteIds.has(e.id));
  });

  var bounds=[];
  for(var i=0;i<Math.min(list.length,20);i++){
    var e=list[i];
    var pos=(e.latitude&&e.longitude)?{lat:Number(e.latitude),lng:Number(e.longitude)}:await geocodePlace(e.place,e.city);
    if(!pos) continue;
    L.marker([pos.lat,pos.lng]).addTo(paiyaMap)
      .bindPopup('<strong>'+esc(e.title)+'</strong><br>'+esc(e.place)+' · '+esc(e.city));
    bounds.push([pos.lat,pos.lng]);
  }
  if(bounds.length) paiyaMap.fitBounds(bounds,{padding:[30,30],maxZoom:14});
}
function checkGalleryVisibility() {
  var section=document.getElementById('teamPaiyaGallerySection');
  if(!section) return;
  var items=section.querySelectorAll('.gallery-item');
  section.style.display=items.length ? '' : 'none';
}

function openGallery(number) {
  var src='photo-'+number+'.jpg';
  var overlay=document.getElementById('galleryOverlay');
  if(!overlay){
    overlay=document.createElement('div');
    overlay.id='galleryOverlay';
    overlay.className='gallery-overlay';
    overlay.onclick=function(e){if(e.target===overlay) closeGallery();};
    overlay.innerHTML='<div class="gallery-view"><button class="gallery-close" onclick="closeGallery()">×</button><img id="galleryImage" alt="Moment Team Paiya"></div>';
    document.body.appendChild(overlay);
  }
  var image=document.getElementById('galleryImage');
  image.onerror=function(){closeGallery(); checkGalleryVisibility();};
  image.src=src;
  overlay.classList.add('show');
}
function closeGallery(){
  var overlay=document.getElementById('galleryOverlay');
  if(overlay) overlay.classList.remove('show');
}

function doSearch() {
  currentQuery = document.getElementById('homeSearch').value;
  showExplore();
}
function resetAdvancedSearch(){
  advancedCity=''; advancedDate=''; advancedPlace='Tous'; favoritesOnly=false;
  renderExplore();
}
async function loadFavorites(){
  favoriteIds = new Set();
  if(!currentUser || !sb) return;
  var r = await sb.from('event_favorites').select('event_id').eq('user_id',currentUser.id);
  if(r.error){ console.error('Favoris:',r.error); return; }
  (r.data||[]).forEach(function(x){ favoriteIds.add(x.event_id); });
}
async function toggleFavorite(eventId){
  if(!currentUser){ openAuth('login'); return; }
  if(!sb) return;
  if(favoriteIds.has(eventId)){
    var d=await sb.from('event_favorites').delete().eq('event_id',eventId).eq('user_id',currentUser.id);
    if(d.error){toast('Impossible de retirer le favori.');return;}
    favoriteIds.delete(eventId); toast('Retiré des favoris.');
  }else{
    var i=await sb.from('event_favorites').insert({event_id:eventId,user_id:currentUser.id});
    if(i.error){toast('Impossible d’ajouter le favori.');return;}
    favoriteIds.add(eventId); toast('Ajouté aux favoris ❤️');
  }
  if(document.getElementById('exploreGrid')) renderExplore();
}
async function showFavorites(){
  if(!currentUser){openAuth('login');return;}
  await loadFavorites();
  var list=allEvents.filter(function(e){return favoriteIds.has(e.id);});
  document.getElementById('app').innerHTML='<div class="wrap"><section class="section"><div class="section-head"><div><h2>❤️ Mes favoris</h2><div class="muted">Les sorties que tu veux garder de côté.</div></div><button class="primary" onclick="showExplore()">Explorer</button></div><div class="grid">'+(list.length?list.map(card).join(''):'<div class="empty" style="grid-column:1/-1">Aucun favori pour le moment.<br>Explore les sorties et ajoute-les avec ❤️.</div>')+'</div></section></div>';
}

function openAuth(mode) {
  openModal('<div class="modal-head"><div><h2 style="margin:0">' +
    (mode === 'login' ? 'Bon retour 👋' : 'Bienvenue dans Team Paiya 🎉') +
    '</h2><div class="muted">' + (mode === 'login' ? 'Connecte-toi pour rejoindre des sorties.' : 'Crée ton compte gratuitement.') +
    '</div></div><button class="close" onclick="closeModal()">×</button></div>' +
    '<form class="form" onsubmit="authSubmit(event,\'' + mode + '\')">' +
    (mode === 'signup' ? '<label>Nom complet<input id="fullName" required placeholder="Ex. Alseny Bangoura"></label><label>Pseudo<input id="username" required placeholder="Ex. Alseny"></label>' : '') +
    '<label>Email<input id="email" type="email" required placeholder="ton@email.com"></label>' +
    '<label>Mot de passe<input id="password" type="password" minlength="6" required placeholder="6 caractères minimum"></label>' +
    '<button class="primary" type="submit">' + (mode === 'login' ? 'Se connecter' : 'Créer mon compte') + '</button>' +
    '<button type="button" class="ghost" onclick="openAuth(\'' + (mode === 'login' ? 'signup' : 'login') + '\')">' +
    (mode === 'login' ? 'Créer un compte' : 'J’ai déjà un compte') + '</button></form>');
}

async function authSubmit(ev,mode) {
  if (ev) ev.preventDefault();
  var form = ev && ev.target ? ev.target : document.querySelector('#modalBox form');
  if (!sb) { toast('Connexion aux données indisponible.'); return false; }
  var emailEl = document.getElementById('email');
  var passwordEl = document.getElementById('password');
  if (!emailEl || !passwordEl) { toast('Le formulaire de connexion est incomplet.'); return false; }
  var email = emailEl.value.trim();
  var password = passwordEl.value;
  var submit = form ? form.querySelector('button[type="submit"]') : null;
  var originalText = submit ? submit.textContent : '';
  try {
    if (submit) {
      submit.disabled = true;
      submit.textContent = mode === 'login' ? 'Connexion…' : 'Création…';
    }
    var result;
    if (mode === 'signup') {
      var fullNameEl = document.getElementById('fullName');
      var usernameEl = document.getElementById('username');
      if (!fullNameEl || !usernameEl) throw new Error('Les informations du profil sont manquantes.');
      result = await sb.auth.signUp({
        email:email,
        password:password,
        options:{
          data:{full_name:fullNameEl.value.trim(),username:usernameEl.value.trim()},
          emailRedirectTo:window.location.origin
        }
      });
    } else {
      result = await sb.auth.signInWithPassword({email:email,password:password});
    }
    if (result.error) {
      toast(result.error.message || 'Impossible de se connecter.');
      return false;
    }
    if (mode === 'signup' && !result.data.session) {
      toast('Compte créé. Vérifie ton email pour continuer.');
      closeModal();
      return true;
    }
    currentUser = result.data.user;
    closeModal();
    updateAuthNav();
    await loadEvents();
    showHome();
    toast(mode === 'login' ? 'Connexion réussie !' : 'Compte créé avec succès !');
    return true;
  } catch (e) {
    console.error('Erreur authentification', e);
    toast(e && e.message ? e.message : 'Une erreur est survenue. Réessaie.');
    return false;
  } finally {
    if (submit) {
      submit.disabled = false;
      submit.textContent = originalText;
    }
  }
}

async function logout() {
  if (sb) await sb.auth.signOut();
  currentUser = null;
  updateAuthNav();
  showHome();
  toast('À bientôt 👋');
}

async function loadEvents() {
  if (!sb) { allEvents = []; return; }
  try {
    var result = await sb.from('events')
      .select('*')
      .order('event_date',{ascending:true})
      .order('event_time',{ascending:true});
    if (result.error) {
      console.error('Lecture events:', result.error);
      toast('Erreur Supabase : ' + (result.error.message || 'lecture des sorties impossible'));
      return;
    }
    var rows = result.data || [];
    var ids = rows.map(function(e){return e.id;});
    var counts = {};
    if (ids.length) {
      var p = await sb.from('event_participants').select('event_id').in('event_id',ids);
      if (p.error) console.error('Lecture participants:',p.error);
      (p.data || []).forEach(function(x){ counts[x.event_id] = (counts[x.event_id] || 0) + 1; });
    }
    allEvents = rows.map(function(e){ e.count = counts[e.id] || 0; return e; });
  } catch(e) {
    console.error('Supabase:',e);
    toast('Erreur de connexion aux sorties : ' + (e.message || e));
  }
}

async function showEvent(id) {
  var e = allEvents.find(function(x){ return String(x.id) === String(id); });
  if (!e) { toast('Cette sortie est introuvable.'); return; }

  // Affiche immédiatement un état de chargement : sur mobile, les requêtes
  // participants/avis ne doivent pas donner l'impression que le bouton ne répond pas.
  openModal('<div style="padding:28px;text-align:center"><div style="font-size:34px">⏳</div><h3 style="margin:12px 0 6px">Chargement de la sortie…</h3><div class="muted">Récupération des participants et des informations.</div></div>');

  try {
  var participants = [];
  var joined = false;
  if (sb) {
    var p = await sb.from('event_participants').select('user_id').eq('event_id',id);
    var rows = p.data || [];
    var ids = rows.map(function(x){ return x.user_id; });
    if (ids.length) {
      var pr = await sb.from('profiles').select('*').in('id',ids);
      var profileMap = {};
      (pr.data || []).forEach(function(x){ profileMap[x.id] = x; });
      participants = rows.map(function(x){ return {user_id:x.user_id, profiles:profileMap[x.user_id] || {}}; });
    }
    if (currentUser) joined = ids.indexOf(currentUser.id) !== -1;
  }

  var reviews = [];
  var averageRating = 0;
  var myReview = null;
  if (sb) {
    var rr = await sb.from('event_reviews').select('*, profiles(full_name,username,avatar_url)').eq('event_id',id).order('created_at',{ascending:false});
    if (!rr.error) {
      reviews = rr.data || [];
      averageRating = reviews.length ? (reviews.reduce(function(sum,r){ return sum + Number(r.rating||0); },0) / reviews.length) : 0;
      if (currentUser) myReview = reviews.find(function(r){ return r.reviewer_id === currentUser.id; }) || null;
    }
  }

  var eventDateTime = new Date(e.event_date + 'T' + (e.event_time || '00:00'));
  var isPast = eventDateTime.getTime() < Date.now();
  var canReview = currentUser && (joined || e.creator_id === currentUser.id) && isPast;
  var reviewButton = canReview ?
    '<button class="ghost" style="width:100%;margin-top:10px" onclick="openReview(\''+id+'\')">'+(myReview?'✏️ Modifier mon avis':'⭐ Noter cette sortie')+'</button>' : '';

  var reviewsHtml = reviews.length ?
    reviews.map(function(r){
      var rp=r.profiles||{};
      var stars='★★★★★'.slice(0,Number(r.rating||0))+'☆☆☆☆☆'.slice(0,5-Number(r.rating||0));
      return '<div style="padding:12px 0;border-bottom:1px solid var(--line)"><div style="display:flex;justify-content:space-between;gap:10px"><strong>'+esc(rp.full_name||rp.username||'Membre')+'</strong><span>'+stars+'</span></div><div class="muted" style="font-size:12px;margin-top:4px">'+dateLabel(r.created_at.slice(0,10),r.created_at.slice(11,16))+'</div><div style="margin-top:7px;color:#5f5968;white-space:pre-wrap">'+esc(r.comment||'')+'</div></div>';
    }).join('') : '<div class="muted">Pas encore d’avis.</div>';

  var ratingHtml = reviews.length ?
    '<div class="card" style="margin-top:18px"><div class="body"><div style="display:flex;justify-content:space-between;align-items:center;gap:12px"><div><h3 style="margin:0">⭐ Avis</h3><div class="muted">'+reviews.length+' avis</div></div><strong style="font-size:24px">'+averageRating.toFixed(1)+' / 5</strong></div><div style="margin-top:10px;font-size:18px">★★★★★</div><div style="margin-top:8px">'+reviewsHtml+'</div></div></div>' :
    '<div class="card" style="margin-top:18px"><div class="body"><h3>⭐ Avis</h3><div class="muted">Aucun avis pour le moment.</div></div></div>';

  var button = currentUser ?
    (joined ? '<button class="primary" style="width:100%;margin-top:18px" disabled>✓ Tu participes</button>' :
    (e.count >= e.max_participants ? '<button class="primary" style="width:100%;margin-top:18px" disabled>Sortie complète</button>' :
    '<button class="primary" style="width:100%;margin-top:18px" onclick="joinEvent(\''+id+'\')">Rejoindre la sortie</button>')) :
    '<button class="primary" style="width:100%;margin-top:18px" onclick="closeModal();openAuth(\'login\')">Connecte-toi pour rejoindre</button>';

  var participantHtml = participants.length ? participants.map(function(p){
    var prof = p.profiles || {};
    var name = prof.full_name || prof.username || 'Membre Team Paiya';
    var avatar = prof.avatar_url
      ? '<img src="'+esc(prof.avatar_url)+'" alt="" style="width:42px;height:42px;border-radius:50%;object-fit:cover">'
      : '<div style="width:42px;height:42px;border-radius:50%;display:grid;place-items:center;background:linear-gradient(135deg,var(--p),var(--p2));color:white;font-weight:800">'+esc(name.charAt(0).toUpperCase())+'</div>';
    var message = currentUser && currentUser.id !== p.user_id
      ? '<button class="ghost" style="font-size:12px;padding:7px 10px" onclick="startConversation(\''+p.user_id+'\');closeModal()">💬</button>'
      : '';
    return '<div style="display:flex;align-items:center;gap:10px;padding:10px 0;border-bottom:1px solid var(--line)"><button type="button" style="display:flex;align-items:center;gap:10px;flex:1;text-align:left;background:none;border:0;cursor:pointer;padding:0" onclick="viewProfile(\''+p.user_id+'\')">'+avatar+'<div><strong>'+esc(name)+'</strong><div class="muted" style="font-size:12px">Voir le profil</div></div></button>'+message+'</div>';
  }).join('') : '<span class="muted">Sois le premier à rejoindre !</span>';

  var photo = eventPhoto(e);
  var mapBlock = (e.latitude && e.longitude) || e.location_address
    ? '<div class="card event-location-card" style="margin-top:18px"><div class="body"><h3 style="margin-top:0">📍 Localisation</h3><div class="muted" style="margin-bottom:10px">'+esc(e.location_address || (e.place+' · '+e.city))+'</div><div id="eventMap" style="height:220px;border-radius:14px;overflow:hidden"></div></div></div>'
    : '';

  openModal(
    '<div class="event-detail">' +
      '<div class="event-detail-cover"><img src="'+esc(photo)+'" alt="'+esc(e.title)+'"><div class="event-detail-gradient"></div><span class="event-detail-pill">'+emoji(e.category)+' '+esc(e.category)+'</span><button class="close event-detail-close" onclick="closeModal()">×</button></div>' +
      '<div class="event-detail-content">' +
        '<div class="event-detail-title-row"><div><h2 style="margin:0 0 6px">'+esc(e.title)+'</h2><div class="muted">'+esc(e.place)+' · '+esc(e.city)+'</div></div><button class="ghost event-fav-btn" onclick="toggleFavorite(\''+id+'\');setTimeout(function(){showEvent(\''+id+'\')},250)">'+(favoriteIds.has(e.id)?'❤️':'♡')+'</button></div>' +
        '<p style="line-height:1.65;color:#5f5968;margin:16px 0">'+esc(e.description || 'Pas de description.')+'</p>' +
        '<div class="event-info-grid"><div><strong>📅 Date</strong><span>'+dateLabel(e.event_date,e.event_time)+'</span></div><div><strong>👥 Participants</strong><span>'+e.count+'/'+e.max_participants+'</span></div><div><strong>💜 Tarif</strong><span>Gratuit</span></div><div><strong>📍 Lieu</strong><span>'+esc(e.place)+'</span></div></div>' +
        mapBlock +
        '<div class="card" style="margin-top:18px"><div class="body"><div style="display:flex;align-items:center;justify-content:space-between;gap:10px"><h3 style="margin:0">👥 Participants</h3><span class="pill">'+e.count+'/'+e.max_participants+'</span></div><div style="margin-top:8px">'+participantHtml+'</div></div></div>' +
        '<button class="ghost" style="width:100%;margin-top:10px" onclick="toggleFavorite(\''+id+'\')">'+(favoriteIds.has(e.id)?'❤️ Retirer des favoris':'♡ Ajouter aux favoris')+'</button>' +
        '<button id="inviteBtn" class="ghost" style="width:100%;margin-top:10px">🎟️ Inviter des membres</button>' + reviewButton + button + ratingHtml +
      '</div>' +
    '</div>'
  );

  var inviteBtn = document.getElementById('inviteBtn');
  if (inviteBtn && (!currentUser || e.creator_id !== currentUser.id)) inviteBtn.style.display='none';
  if (inviteBtn) inviteBtn.onclick=function(){ openInviteMembers(id); };

  // Carte de la sortie : utilise les coordonnées enregistrées, sinon géocode l'adresse en arrière-plan.
  if (document.getElementById('eventMap') && typeof L !== 'undefined') {
    setTimeout(async function(){
      var pos = (e.latitude && e.longitude) ? {lat:Number(e.latitude),lng:Number(e.longitude)} : await geocodePlace(e.location_address || e.place,e.city);
      if (!pos || !document.getElementById('eventMap')) return;
      var map = L.map('eventMap',{scrollWheelZoom:false}).setView([pos.lat,pos.lng],15);
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',{maxZoom:19,attribution:'© OpenStreetMap'}).addTo(map);
      L.marker([pos.lat,pos.lng]).addTo(map).bindPopup('<strong>'+esc(e.title)+'</strong><br>'+esc(e.place)+' · '+esc(e.city)).openPopup();
      setTimeout(function(){map.invalidateSize();},150);
    },100);
  }
  } catch (error) {
    console.error('showEvent:', error);
    openModal('<div style="padding:28px;text-align:center"><div style="font-size:34px">⚠️</div><h3 style="margin:12px 0 6px">Impossible de charger cette sortie</h3><div class="muted">Vérifie ta connexion puis réessaie.</div><button class="primary" style="margin-top:16px" onclick="closeModal()">Fermer</button></div>');
    toast('Impossible de charger les détails de la sortie.');
  }
}
async function openInviteMembers(eventId) {
  if (!currentUser || !sb) { openAuth('login'); return; }
  var ev = allEvents.find(function(x){ return String(x.id) === String(eventId); });
  if (!ev || ev.creator_id !== currentUser.id) { toast('Seul le créateur peut inviter des membres.'); return; }
  var pr = await sb.from('profiles').select('*').neq('id',currentUser.id).order('full_name',{ascending:true});
  if (pr.error) { toast('Impossible de charger les membres.'); return; }
  var pp = await sb.from('event_participants').select('user_id').eq('event_id',eventId);
  var participantIds = (pp.data || []).map(function(x){ return x.user_id; });
  var members = (pr.data || []).filter(function(p){ return participantIds.indexOf(p.id) === -1; });
  var html = members.length ? members.map(function(p){
    var avatar = p.avatar_url ? '<img src="'+esc(p.avatar_url)+'" style="width:38px;height:38px;border-radius:50%;object-fit:cover">' : '<div style="width:38px;height:38px;border-radius:50%;display:grid;place-items:center;background:linear-gradient(135deg,var(--p),var(--p2));color:#fff;font-weight:800">'+esc(((p.full_name||p.username||'M').charAt(0)).toUpperCase())+'</div>';
    return '<div style="display:flex;align-items:center;gap:10px;padding:10px 0;border-bottom:1px solid var(--line)">'+avatar+'<div style="flex:1"><strong>'+esc(p.full_name||p.username||'Membre')+'</strong><div class="muted">@'+esc(p.username||'membre')+'</div></div><button class="ghost" data-event="'+eventId+'" data-user="'+p.id+'" onclick="sendEventInvitation(this.dataset.event,this.dataset.user)">Inviter</button></div>';
  }).join('') : '<div class="empty">Tous les membres disponibles participent déjà à cette sortie.</div>';
  openModal('<div class="modal-head"><div><span class="pill">🎟️ Invitation</span><h2 style="margin:10px 0 4px">Inviter des membres</h2><div class="muted">'+esc(ev.title)+'</div></div><button class="close" onclick="closeModal()">×</button></div><div style="margin-top:8px">'+html+'</div>');
}
async function sendEventInvitation(eventId, inviteeId) {
  if (!currentUser || !sb) return;
  var ev = allEvents.find(function(x){ return String(x.id) === String(eventId); });
  if (!ev || ev.creator_id !== currentUser.id) return;
  var r = await sb.from('event_invitations').insert({event_id:eventId,inviter_id:currentUser.id,invitee_id:inviteeId}).select('*').single();
  if (r.error) { toast(r.error.code === '23505' ? 'Invitation déjà envoyée.' : r.error.message); return; }
  await sb.from('notifications').insert({user_id:inviteeId,actor_id:currentUser.id,event_id:eventId,invitation_id:r.data.id,type:'invitation',message:'Tu as reçu une invitation pour « '+ev.title+' » 🎉'});
  toast('Invitation envoyée !');
  closeModal();
}
async function respondInvitation(invitationId,status) {
  if (!currentUser || !sb) return;
  var r = await sb.rpc('respond_event_invitation',{p_invitation_id:invitationId,p_status:status});
  if (r.error) { toast(r.error.message); return; }
  toast(status === 'accepted' ? 'Invitation acceptée 🎉' : 'Invitation refusée.');
  showNotifications();
  loadEvents();
}

async function openReview(eventId){
  if(!currentUser||!sb){openAuth('login');return;}
  var e=allEvents.find(function(x){return String(x.id)===String(eventId);});
  if(!e)return;
  var existing=await sb.from('event_reviews').select('*').eq('event_id',eventId).eq('reviewer_id',currentUser.id).maybeSingle();
  var r=existing.data||{};
  openModal('<div class="modal-head"><div><span class="pill">⭐ Ton avis</span><h2 style="margin:10px 0 4px">'+esc(e.title)+'</h2><div class="muted">Partage ton expérience avec la Team Paiya.</div></div><button class="close" onclick="closeModal()">×</button></div>'+
    '<form class="form" onsubmit="submitReview(event,\''+eventId+'\')">'+
    '<label>Note<select id="reviewRating"><option value="5" '+(r.rating===5?'selected':'')+'>5 — Excellent ⭐⭐⭐⭐⭐</option><option value="4" '+(r.rating===4?'selected':'')+'>4 — Très bien ⭐⭐⭐⭐</option><option value="3" '+(r.rating===3?'selected':'')+'>3 — Bien ⭐⭐⭐</option><option value="2" '+(r.rating===2?'selected':'')+'>2 — Moyen ⭐⭐</option><option value="1" '+(r.rating===1?'selected':'')+'>1 — À améliorer ⭐</option></select></label>'+
    '<label>Ton avis<textarea id="reviewComment" maxlength="1000" placeholder="Qu’as-tu pensé de cette sortie ?">'+esc(r.comment||'')+'</textarea></label>'+
    '<button class="primary" type="submit">Publier mon avis</button></form>');
}
async function submitReview(ev,eventId){
  ev.preventDefault();
  if(!currentUser||!sb)return;
  var payload={event_id:eventId,reviewer_id:currentUser.id,rating:Number(document.getElementById('reviewRating').value),comment:document.getElementById('reviewComment').value.trim()};
  var r=await sb.rpc('upsert_event_review',{p_event_id:eventId,p_rating:payload.rating,p_comment:payload.comment});
  if(r.error){toast('Impossible d’enregistrer ton avis : '+r.error.message);return;}
  closeModal(); toast('Merci pour ton avis ⭐'); await showEvent(eventId);
}
async function joinEvent(id) {
  if (!currentUser) { closeModal(); openAuth('login'); return; }
  if (!sb) { toast('Connexion indisponible.'); return; }

  var ev = allEvents.find(function(x){ return String(x.id) === String(id); });
  if (!ev) { toast('Cette sortie est introuvable.'); return; }
  if (ev.creator_id === currentUser.id) { toast('Tu es déjà le créateur de cette sortie.'); return; }
  if (ev.count >= ev.max_participants) { toast('Cette sortie est complète.'); return; }

  var joinBtn = document.getElementById('joinEventBtn');
  if (joinBtn) {
    joinBtn.disabled = true;
    joinBtn.textContent = 'Participation…';
    joinBtn.style.opacity = '.7';
  }

  var r = await sb.rpc('join_event',{p_event_id:id});
  if (r.error) {
    console.error('join_event:',r.error);
    if (joinBtn) { joinBtn.disabled=false; joinBtn.textContent='Rejoindre la sortie'; joinBtn.style.opacity=''; }
    toast(r.error.message || 'Impossible de rejoindre la sortie.');
    return;
  }

  // Mise à jour immédiate de l’interface : on réaffiche la sortie sans
  // attendre une nouvelle lecture complète de Supabase.
  ev.count = Number(ev.count || 0) + 1;
  toast('Tu participes maintenant à la sortie 🎉');
  await showEvent(id);

  // Synchronisation serveur en arrière-plan : l’interface est déjà à jour.
  loadEvents().catch(function(err){ console.warn('Synchronisation sortie:',err); });

  if (ev.creator_id) {
    addNotification(ev.creator_id,currentUser.id,id,'join','Quelqu’un a rejoint ta sortie « '+ev.title+' » 🎉')
      .then(refreshNotificationBadge)
      .catch(function(err){ console.warn('Notification:',err); });
  } else {
    refreshNotificationBadge();
  }
}



async function leaveEvent(id) {
  if (!currentUser || !sb) return;
  var ev = allEvents.find(function(x){ return String(x.id) === String(id); });
  if (!ev) return;

  if (!confirm('Tu veux vraiment quitter cette sortie ?')) return;

  var r = await sb.from('event_participants').delete().eq('event_id',id).eq('user_id',currentUser.id);
  if (r.error) {
    toast('Impossible de quitter la sortie : '+r.error.message);
    return;
  }

  ev.count = Math.max(0, Number(ev.count || 0) - 1);
  await loadEvents();

  if (ev.creator_id) {
    await addNotification(ev.creator_id,currentUser.id,id,'leave','Quelqu’un a quitté ta sortie « '+ev.title+' ».');
  }

  refreshNotificationBadge();
  toast('Tu as quitté la sortie.');
  showMyOutings();
}



async function addNotification(userId, actorId, eventId, type, message) {
  if (!sb || !userId || userId === actorId) return;
  var r = await sb.from('notifications').insert({user_id:userId, actor_id:actorId || null, event_id:eventId || null, type:type, message:message});
  if (r.error) console.error('Notification:', r.error);
}
async function refreshNotificationBadge() {
  if (!currentUser || !sb) return;
  var r = await sb.from('notifications').select('id').eq('user_id',currentUser.id).eq('read',false);
  var badge = document.getElementById('notifBadge');
  if (!badge) return;
  var n = r.error ? 0 : (r.data || []).length;
  badge.textContent = n ? '('+n+')' : '';
  badge.style.display = n ? 'inline' : 'none';
}
async function openNotificationCenter() {
  if (!currentUser || !sb) { openAuth('login'); return; }
  var r = await sb.from('notifications').select('*').eq('user_id',currentUser.id).order('created_at',{ascending:false}).limit(20);
  if (r.error) { toast('Impossible de charger les notifications.'); return; }
  var list = r.data || [];
  var html = list.length ? list.map(function(n) {
    var actions = '';
    if (n.type === 'invitation' && n.invitation_id) {
      actions = '<div style="display:flex;gap:8px;margin-top:10px"><button class="primary" data-inv="'+n.invitation_id+'" data-status="accepted" onclick="respondInvitation(this.dataset.inv,this.dataset.status)">✓ Accepter</button><button class="ghost" data-inv="'+n.invitation_id+'" data-status="declined" onclick="respondInvitation(this.dataset.inv,this.dataset.status)">Refuser</button></div>';
    }
    return '<div style="padding:14px 0;border-bottom:1px solid var(--line)"><div style="font-weight:700">'+esc(n.message)+'</div><div class="muted" style="font-size:12px;margin-top:4px">'+dateLabel(n.created_at.slice(0,10),n.created_at.slice(11,16))+'</div>'+actions+'</div>';
  }).join('') : '<div class="empty">Aucune notification.</div>';
  openModal('<div class="modal-head"><div><span class="pill">🔔 Notifications</span><h2 style="margin:10px 0 0">Tes notifications</h2></div><button class="close" onclick="closeModal()">×</button></div><div style="max-height:60vh;overflow:auto">'+html+'</div>');
  await sb.from('notifications').update({read:true}).eq('user_id',currentUser.id).eq('read',false);
  refreshNotificationBadge();
}

async function showNotifications() {
  if (!currentUser || !sb) { openAuth('login'); return; }
  var r = await sb.from('notifications').select('*').eq('user_id',currentUser.id).order('created_at',{ascending:false}).limit(50);
  var list = r.data || [];
  document.getElementById('app').innerHTML='<div class="wrap"><section class="section"><div class="section-head"><div><h2>🔔 Notifications</h2><div class="muted">Les dernières activités concernant tes sorties.</div></div><button class="ghost" onclick="markNotificationsRead()">Tout marquer comme lu</button></div><div class="grid" style="grid-template-columns:1fr">'+
    (list.length ? list.map(function(n){var actions = (n.type === 'invitation' && n.invitation_id) ? '<div style="display:flex;gap:8px;margin-top:12px"><button class="primary" data-inv="'+n.invitation_id+'" data-status="accepted" onclick="respondInvitation(this.dataset.inv,this.dataset.status)">✓ Accepter</button><button class="ghost" data-inv="'+n.invitation_id+'" data-status="declined" onclick="respondInvitation(this.dataset.inv,this.dataset.status)">Refuser</button></div>' : ''; return '<article class="card" style="opacity:'+(n.read?'.65':'1')+'"><div class="body"><div style="display:flex;justify-content:space-between;gap:12px"><strong>'+esc(n.message)+'</strong><span class="muted">'+dateLabel(n.created_at.slice(0,10),n.created_at.slice(11,16))+'</span></div><div class="muted" style="margin-top:7px">'+(n.read?'Lu':'Nouveau')+'</div>'+actions+'</div></article>';}).join('') : '<div class="empty">Tu n’as aucune notification pour le moment.</div>')+
    '</div></section></div>';
  await sb.from('notifications').update({read:true}).eq('user_id',currentUser.id).eq('read',false);
  refreshNotificationBadge();
}
async function markNotificationsRead() {
  if (!currentUser || !sb) return;
  await sb.from('notifications').update({read:true}).eq('user_id',currentUser.id).eq('read',false);
  showNotifications();
}
async function notifyEventParticipants(eventId, actorId, message) {
  if (!sb) return;
  var p=await sb.from('event_participants').select('user_id').eq('event_id',eventId);
  if (p.error) return;
  for (var i=0;i<(p.data||[]).length;i++) await addNotification(p.data[i].user_id,actorId,eventId,'event_update',message);
}

async function viewProfile(userId) {
  if (!sb || !userId) return;
  var r = await sb.from('profiles').select('*').eq('id',userId).single();
  if (r.error || !r.data) { toast('Profil introuvable.'); return; }
  var p = r.data;
  var created = allEvents.filter(function(e){ return e.creator_id === userId; }).length;
  var jr = await sb.from('event_participants').select('event_id').eq('user_id',userId);
  var joined = jr.error ? 0 : (jr.data || []).length;
  var avatar = p.avatar_url
    ? '<img src="'+esc(p.avatar_url)+'" style="width:92px;height:92px;border-radius:50%;object-fit:cover">'
    : '<div style="width:92px;height:92px;border-radius:50%;display:grid;place-items:center;background:linear-gradient(135deg,var(--p),var(--p2));color:#fff;font-size:34px;font-weight:800">'+esc(((p.full_name||p.username||'M').charAt(0)).toUpperCase())+'</div>';
  var messageButton = currentUser.id !== userId ? '<button id="profileMessageBtn" class="primary" style="width:100%;margin-top:16px">💬 Envoyer un message</button>' : '';
  openModal(
    '<div class="modal-head"><div><span class="pill">👤 Profil</span></div><button class="close" onclick="closeModal()">×</button></div>' +
    '<div style="display:flex;gap:18px;align-items:center">'+avatar+'<div><h2 style="margin:0 0 5px">'+esc(p.full_name||'Membre Team Paiya')+'</h2><div class="muted">@'+esc(p.username||'membre')+' · '+esc(p.city||'Lille')+'</div></div></div>' +
    '<div class="kpis" style="margin-top:20px"><div class="kpi"><strong>'+created+'</strong><span>sortie(s) créée(s)</span></div><div class="kpi"><strong>'+joined+'</strong><span>participation(s)</span></div></div>' +
    '<div class="card" style="margin-top:18px"><div class="body"><h3>À propos</h3><p class="muted" style="white-space:pre-wrap">'+esc(p.bio||'Pas encore de bio.')+'</p><div class="muted"><strong>Centres d’intérêt :</strong> '+esc(p.interests||'Non renseignés')+'</div></div></div>' +
    messageButton
  );
  var btn = document.getElementById('profileMessageBtn');
  if (btn) btn.onclick = function(){ closeModal(); startConversation(userId); };
}
var currentConversationId=null;var chatChannel=null;
function profileAvatarSmall(p){if(p&&p.avatar_url)return '<img class="avatar-sm" src="'+esc(p.avatar_url)+'" alt="">';return '<div class="avatar-sm">'+esc(((p&&(p.full_name||p.username))||'M').charAt(0).toUpperCase())+'</div>';}
function conversationOtherId(c){return c.user1_id===currentUser.id?c.user2_id:c.user1_id;}
async function refreshMessageBadge(){if(!currentUser||!sb)return;var r=await sb.from('messages').select('id',{count:'exact',head:true}).is('read_at',null).neq('sender_id',currentUser.id);var b=document.getElementById('msgBadge');if(!b)return;var n=r.error?0:(r.count||0);b.textContent=n?'('+n+')':'';b.style.display=n?'inline':'none';}
async function showMessages(){if(!currentUser||!sb){openAuth('login');return;}var cr=await sb.from('conversations').select('*').or('user1_id.eq.'+currentUser.id+',user2_id.eq.'+currentUser.id).order('created_at',{ascending:false});if(cr.error){toast('Impossible de charger les conversations.');return;}var convs=cr.data||[],ids=convs.map(conversationOtherId);var pr=ids.length?await sb.from('profiles').select('*').in('id',ids):{data:[]};var profiles={};(pr.data||[]).forEach(function(p){profiles[p.id]=p;});var mids=convs.map(function(c){return c.id;});var mr=mids.length?await sb.from('messages').select('*').in('conversation_id',mids).order('created_at',{ascending:false}):{data:[]};var last={};(mr.data||[]).forEach(function(m){if(!last[m.conversation_id])last[m.conversation_id]=m;});var list=convs.map(function(c){var p=profiles[conversationOtherId(c)]||{},m=last[c.id];return '<button class="chat-item" onclick="openChat(\''+c.id+'\',\''+conversationOtherId(c)+'\')">'+profileAvatarSmall(p)+'<div style="min-width:0;flex:1;text-align:left"><strong>'+esc(p.full_name||p.username||'Membre')+'</strong><div class="muted" style="font-size:12px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">'+esc(m?m.body:'Nouvelle conversation')+'</div></div><span class="muted" style="font-size:11px">'+(m?dateLabel(m.created_at.slice(0,10),m.created_at.slice(11,16)):'')+'</span></button>';}).join('');document.getElementById('app').innerHTML='<div class="wrap"><section class="section"><div class="section-head"><div><h2>💬 Messagerie</h2><div class="muted">Discute en privé avec les membres de Team Paiya.</div></div><button class="primary" onclick="showExplore()">Explorer</button></div><div class="chat-layout"><div class="chat-panel chat-list-panel"><div style="padding:16px;border-bottom:1px solid var(--line)"><strong>Conversations</strong></div><div class="chat-list" style="padding:10px">'+(list||'<div class="empty">Aucune conversation.<br>Va sur le profil d’un membre pour lui écrire.</div>')+'</div></div><div id="chatPanel" class="chat-panel"><div class="empty" style="margin:30px">Sélectionne une conversation pour commencer à discuter.</div></div></div></section></div>';refreshMessageBadge();}
async function openChat(conversationId,otherUserId){if(!currentUser||!sb)return;currentConversationId=conversationId;if(chatChannel){try{await sb.removeChannel(chatChannel);}catch(e){}chatChannel=null;}var pr=await sb.from('profiles').select('*').eq('id',otherUserId).single(),p=pr.data||{};var panel=document.getElementById('chatPanel');if(!panel){await showMessages();panel=document.getElementById('chatPanel');}panel.innerHTML='<div class="chat-head">'+profileAvatarSmall(p)+'<div style="flex:1"><strong>'+esc(p.full_name||p.username||'Membre')+'</strong><div class="muted" style="font-size:12px">@'+esc(p.username||'membre')+'</div></div><button class="ghost" onclick="viewProfile(\''+otherUserId+'\')">Profil</button></div><div id="chatMessages" class="chat-messages"></div><div class="chat-compose"><input id="chatInput" maxlength="2000" placeholder="Écris un message..." onkeydown="if(event.key===\'Enter\'){event.preventDefault();sendMessage();}"><button class="primary" onclick="sendMessage()">Envoyer</button></div>';await loadChatMessages(conversationId);await sb.rpc('mark_messages_read',{p_conversation_id:conversationId});refreshMessageBadge();chatChannel=sb.channel('chat:'+conversationId).on('postgres_changes',{event:'INSERT',schema:'public',table:'messages',filter:'conversation_id=eq.'+conversationId},function(payload){if(!payload.new||!payload.new.id||payload.new.sender_id===currentUser.id)return;appendChatMessage(payload.new);sb.rpc('mark_messages_read',{p_conversation_id:conversationId}).then(function(){refreshMessageBadge();});}).subscribe();setTimeout(function(){var x=document.getElementById('chatInput');if(x)x.focus();},50);}
async function loadChatMessages(conversationId){var r=await sb.from('messages').select('*').eq('conversation_id',conversationId).order('created_at',{ascending:true}),box=document.getElementById('chatMessages');if(!box)return;if(r.error){toast('Impossible de charger les messages.');return;}box.innerHTML=(r.data||[]).map(chatBubble).join('')||'<div class="muted" style="text-align:center;margin:auto">Aucun message. Lance la conversation 👋</div>';box.scrollTop=box.scrollHeight;}
function chatBubble(m){var mine=m.sender_id===currentUser.id;return '<div class="bubble '+(mine?'me':'them')+'">'+esc(m.body).replace(/\n/g,'<br>')+'<div class="chat-time">'+new Date(m.created_at).toLocaleTimeString('fr-FR',{hour:'2-digit',minute:'2-digit'})+'</div></div>';}
function appendChatMessage(m){var box=document.getElementById('chatMessages');if(!box)return;var empty=box.querySelector('.muted');if(empty&&box.children.length===1)box.innerHTML='';box.insertAdjacentHTML('beforeend',chatBubble(m));box.scrollTop=box.scrollHeight;}
async function sendMessage(){if(!currentUser||!sb||!currentConversationId)return;var input=document.getElementById('chatInput'),body=(input?input.value:'').trim();if(!body)return;var r=await sb.from('messages').insert({conversation_id:currentConversationId,sender_id:currentUser.id,body:body}).select().single();if(r.error){toast('Message non envoyé : '+r.error.message);return;}if(input)input.value='';appendChatMessage(r.data);var c=await sb.from('conversations').select('user1_id,user2_id').eq('id',currentConversationId).single();if(c.data){var other=c.data.user1_id===currentUser.id?c.data.user2_id:c.data.user1_id;await addNotification(other,currentUser.id,null,'message','Nouveau message de '+(currentUser.email||'un membre')+' 💬');}refreshMessageBadge();}
async function startConversation(userId){if(!currentUser){openAuth('login');return;}if(userId===currentUser.id){toast('Tu ne peux pas t’écrire à toi-même.');return;}var r=await sb.rpc('get_or_create_conversation',{p_other_user:userId});if(r.error){toast('Impossible de démarrer la conversation : '+r.error.message);return;}await showMessages();await openChat(r.data,userId);}
function openCreate() {
  if (!currentUser) { openAuth('login'); return; }
  openModal('<div class="modal-head"><div><h2 style="margin:0">Créer une sortie</h2><div class="muted">Propose un moment à la Team Paiya.</div></div><button class="close" onclick="closeModal()">×</button></div>' +
    '<form id="createEventForm" class="form" onsubmit="createEvent(event); return false;">' +
    '<label>Nom de la sortie<input id="title" required placeholder="Ex. Soirée Footsal"></label>' +
    '<label>Catégorie<select id="category">'+categories.slice(1).map(function(c){return '<option>'+c+'</option>';}).join('')+'</select></label>' +
    '<label>Lieu<select id="place">'+places.map(function(p){return '<option>'+esc(p)+'</option>';}).join('')+'<option value="__custom">Autre lieu...</option></select></label>' +
    '<label id="customWrap" style="display:none">Lieu personnalisé<input id="customPlace" placeholder="Nom du lieu"></label><label>Adresse du lieu <span class="muted">(optionnel, pour la carte)</span><input id="locationAddress" placeholder="Ex. 12 rue Nationale, Lille"></label>' +
    '<div class="two"><label>Ville<input id="city" value="Lille" required></label><label>Participants max<input id="max" type="number" min="2" value="10" required></label></div>' +
    '<div class="two"><label>Date<input id="date" type="date" min="'+new Date().toISOString().slice(0,10)+'" required></label><label>Heure<input id="time" type="time" required></label></div>' +
    '<label>Description<textarea id="description" placeholder="Décris rapidement la sortie..."></textarea></label>' +
    '<div class="card" style="padding:14px;background:#faf9fc">' +
    '<strong>📸 Illustration de la sortie</strong>' +
    '<div class="muted" style="font-size:12px;margin:5px 0 10px">Ajoute ta photo ou, si tu n’en mets pas, AL Team Paiya créera automatiquement une illustration IA adaptée à ta sortie.</div>' +
    '<div id="eventImagePreview" style="display:none;margin:10px 0;border-radius:14px;overflow:hidden;height:150px;background:#eee"><img id="eventImagePreviewImg" style="width:100%;height:100%;object-fit:cover"></div>' +
    '<label style="display:block">Ta photo (optionnelle)<input id="eventImageFile" type="file" accept="image/jpeg,image/png,image/webp" style="margin-top:6px"></label>' +
    '<button id="removeEventImageBtn" class="ghost" type="button" style="display:none;margin-top:10px">✕ Retirer la photo</button>' +
    '<div id="aiImageStatus" class="muted" style="font-size:12px;margin-top:8px">✨ Sans photo, une illustration IA sera générée automatiquement.</div>' +
    '</div>' +
    '<button id="createEventButton" class="primary" type="submit">Créer la sortie</button></form>');
  var fileInput = document.getElementById('eventImageFile');
  var preview = document.getElementById('eventImagePreview');
  var previewImg = document.getElementById('eventImagePreviewImg');
  var removeBtn = document.getElementById('removeEventImageBtn');
  var aiStatus = document.getElementById('aiImageStatus');

  if (fileInput) fileInput.onchange = function() {
    var file = fileInput.files && fileInput.files[0];
    if (!file) return;
    if (!/^image\/(jpeg|png|webp)$/.test(file.type) || file.size > 5 * 1024 * 1024) {
      toast('Image invalide : JPG, PNG ou WebP, 5 Mo maximum.');
      fileInput.value = '';
      return;
    }
    previewImg.src = URL.createObjectURL(file);
    preview.style.display = 'block';
    removeBtn.style.display = 'inline-flex';
    aiStatus.textContent = '📸 Photo sélectionnée : elle sera utilisée pour la sortie.';
  };
  if (removeBtn) removeBtn.onclick = function() {
    fileInput.value = '';
    preview.style.display = 'none';
    previewImg.removeAttribute('src');
    removeBtn.style.display = 'none';
    aiStatus.textContent = '✨ Sans photo, une illustration IA sera générée automatiquement.';
  };

  var createBtn = document.getElementById('createEventButton');
  document.getElementById('place').onchange = function(ev) {
    document.getElementById('customWrap').style.display = ev.target.value === '__custom' ? 'block' : 'none';
  };
}

async function uploadEventImage(eventId, file) {
  if (!currentUser || !sb || !file) return null;
  if (!/^image\/(jpeg|png|webp)$/.test(file.type)) {
    throw new Error('Format accepté : JPG, PNG ou WebP.');
  }
  if (file.size > 5 * 1024 * 1024) {
    throw new Error('L’image doit faire 5 Mo maximum.');
  }
  var ext = file.type === 'image/png' ? 'png' : (file.type === 'image/webp' ? 'webp' : 'jpg');
  var path = currentUser.id + '/' + eventId + '-custom.' + ext;
  var up = await sb.storage.from('event-images').upload(path, file, {
    upsert: true,
    contentType: file.type,
    cacheControl: '31536000'
  });
  if (up.error) throw new Error('Upload impossible : ' + up.error.message);
  var pub = sb.storage.from('event-images').getPublicUrl(path);
  var url = pub.data && pub.data.publicUrl ? pub.data.publicUrl : null;
  if (!url) throw new Error('Impossible de récupérer l’URL de l’image.');
  var upd = await sb.from('events').update({image_url:url}).eq('id',eventId).eq('creator_id',currentUser.id);
  if (upd.error) throw new Error('Impossible d’associer la photo à la sortie.');
  return url;
}

async function generatePuterEventImage(eventId, eventInfo) {
  if (!sb || !currentUser || !window.puter || !puter.ai || !puter.ai.txt2img) {
    throw new Error('Le générateur IA n’est pas disponible.');
  }
  var prompt = [
    'Create a premium realistic editorial photograph for a social outing platform called AL Team Paiya.',
    'Show a friendly group of young adults enjoying the activity, natural candid atmosphere, stylish but realistic photography, warm lighting, high-end social media quality.',
    'Activity category: ' + (eventInfo.category || 'social outing') + '.',
    'Outing title: ' + (eventInfo.title || '') + '.',
    'Place: ' + (eventInfo.place || '') + ', ' + (eventInfo.city || '') + '.',
    'Description: ' + (eventInfo.description || '') + '.',
    'No text, no logos, no watermarks, no readable signs. Landscape composition suitable for a website card.'
  ].join(' ');

  var img = await puter.ai.txt2img(prompt, {
    model: 'black-forest-labs/flux-schnell',
    ratio: {w:16,h:9}
  });

  if (!img || !img.src) throw new Error('L’image IA n’a pas pu être générée.');

  var url = img.src;
  var upd = await sb.from('events')
    .update({image_url:url})
    .eq('id',eventId)
    .eq('creator_id',currentUser.id);

  if (upd.error) throw new Error('Impossible d’associer l’image IA à la sortie : ' + upd.error.message);
  return url;
}
async function createEvent(ev) {
  if (ev) ev.preventDefault();
  if (window.creatingEvent) return;
  window.creatingEvent = true;

  var createBtn = document.getElementById('createEventButton');
  if (createBtn) {
    createBtn.disabled = true;
    createBtn.textContent = 'Création…';
    createBtn.style.opacity = '.7';
    createBtn.style.cursor = 'wait';
  }

  if (!sb) {
    window.creatingEvent = false;
    if (createBtn) { createBtn.disabled = false; createBtn.textContent = 'Créer la sortie'; createBtn.style.opacity = ''; createBtn.style.cursor = ''; }
    toast('Erreur : Supabase n’est pas connecté.');
    return;
  }
  if (!currentUser) {
    window.creatingEvent = false;
    if (createBtn) { createBtn.disabled = false; createBtn.textContent = 'Créer la sortie'; createBtn.style.opacity = ''; createBtn.style.cursor = ''; }
    toast('Erreur : tu dois être connecté.');
    return;
  }

  try {
    var place = document.getElementById('place').value;
    if (place === '__custom') place = document.getElementById('customPlace').value.trim();
    if (!place) {
      window.creatingEvent = false;
      if (createBtn) { createBtn.disabled = false; createBtn.textContent = 'Créer la sortie'; createBtn.style.opacity = ''; createBtn.style.cursor = ''; }
      toast('Choisis un lieu pour la sortie.');
      return;
    }

    var selectedDate = document.getElementById('date').value;
    var selectedTime = document.getElementById('time').value || '00:00';
    var selectedDateTime = new Date(selectedDate + 'T' + selectedTime);
    if (!selectedDate || selectedDateTime.getTime() < Date.now()) {
      window.creatingEvent = false;
      if (createBtn) { createBtn.disabled = false; createBtn.textContent = 'Créer la sortie'; createBtn.style.opacity = ''; createBtn.style.cursor = ''; }
      toast('Impossible de créer une sortie dans le passé. Choisis une date et une heure à venir.');
      return;
    }

    var payload = {
      creator_id:currentUser.id,
      title:document.getElementById('title').value.trim(),
      description:document.getElementById('description').value.trim(),
      category:document.getElementById('category').value,
      place:place,
      city:document.getElementById('city').value.trim(),
      event_date:selectedDate,
      event_time:selectedTime,
      price:0,
      max_participants:Number(document.getElementById('max').value)
    };

    var address = document.getElementById('locationAddress').value.trim();
    var imageFile = document.getElementById('eventImageFile')?.files?.[0] || null;

    // IMPORTANT : on crée d'abord la sortie, sans attendre le géocodage ni l'image IA.
    var r = await sb.from('events').insert({
      creator_id:payload.creator_id,
      title:payload.title,
      description:payload.description,
      category:payload.category,
      place:payload.place,
      city:payload.city,
      event_date:payload.event_date,
      event_time:payload.event_time,
      price:0,
      max_participants:payload.max_participants,
      location_address:address || null,
      latitude:null,
      longitude:null,
      image_url:null
    }).select().single();

    if (r.error || !r.data) {
      console.error('Création sortie:', r.error);
      window.creatingEvent = false;
      if (createBtn) { createBtn.disabled = false; createBtn.textContent = 'Créer la sortie'; createBtn.style.opacity = ''; createBtn.style.cursor = ''; }
      toast('Impossible de créer la sortie : ' + ((r.error && r.error.message) || 'erreur Supabase'));
      return;
    }

    var eventId = r.data.id;

    // Confirmation immédiate : l'utilisateur voit sa sortie sans attendre les traitements secondaires.
    closeModal();
    window.creatingEvent = false;
    if (createBtn) { createBtn.disabled = false; createBtn.textContent = 'Créer la sortie'; createBtn.style.opacity = ''; createBtn.style.cursor = ''; }
    await loadEvents();

    // Sécurité UI : si la lecture globale échoue momentanément juste après
    // l'insertion, on conserve quand même la sortie fraîchement créée dans
    // l'interface afin qu'elle apparaisse immédiatement dans Explorer.
    if (!allEvents.some(function(x){ return String(x.id) === String(eventId); })) {
      var freshEvent = Object.assign({}, r.data, {count:0});
      allEvents.push(freshEvent);
      allEvents.sort(function(a,b){
        return String(a.event_date+' '+(a.event_time||'')).localeCompare(String(b.event_date+' '+(b.event_time||'')));
      });
    }

    showExplore();
    toast('Sortie créée 🎉');

    // Traitements secondaires en arrière-plan : géolocalisation puis illustration.
    (async function() {
      try {
        if (address) {
          var coords = await geocodePlace(address, payload.city);
          if (coords) {
            await sb.from('events').update({latitude:coords.lat, longitude:coords.lng}).eq('id',eventId).eq('creator_id',currentUser.id);
          }
        }
      } catch (geoError) {
        console.warn('Géolocalisation sortie:', geoError);
      }

      try {
        if (imageFile) {
          await uploadEventImage(eventId, imageFile);
        } else {
          await generatePuterEventImage(eventId, {
            title:payload.title,
            category:payload.category,
            place:payload.place,
            city:payload.city,
            description:payload.description
          });
        }
        await loadEvents();
      } catch (imageError) {
        console.error('Image sortie:', imageError);
      }
    })();

  } catch (e) {
    console.error('createEvent exception:', e);
    window.creatingEvent = false;
    if (createBtn) { createBtn.disabled = false; createBtn.textContent = 'Créer la sortie'; createBtn.style.opacity = ''; createBtn.style.cursor = ''; }
    toast('Erreur inattendue : ' + (e.message || e));
  }
}

async function showProfile() {
  if (!currentUser || !sb) return;
  var p = await sb.from('profiles').select('*').eq('id',currentUser.id).single();
  var profile = p.data || {};
  var mine = allEvents.filter(function(e){return e.creator_id === currentUser.id;});
  var joinedCount = 0;
  if (sb) {
    var jr = await sb.from('event_participants').select('event_id').eq('user_id',currentUser.id);
    joinedCount = jr.error ? 0 : (jr.data || []).length;
  }
  var avatar = profile.avatar_url ? '<img src="'+esc(profile.avatar_url)+'" alt="Photo de profil" style="width:82px;height:82px;border-radius:50%;object-fit:cover;border:4px solid #fff;box-shadow:0 8px 24px rgba(60,35,100,.15)">' : '<div style="width:82px;height:82px;border-radius:50%;display:grid;place-items:center;background:linear-gradient(135deg,var(--p),var(--p2));color:white;font-size:30px;font-weight:800">'+esc(((profile.full_name||profile.username||'A').charAt(0)).toUpperCase())+'</div>';
  document.getElementById('app').innerHTML =
    '<div class="wrap"><section class="section"><div style="display:flex;align-items:center;justify-content:space-between;gap:20px;flex-wrap:wrap">' +
    '<div style="display:flex;align-items:center;gap:18px">'+avatar+'<div><span class="pill">MON ESPACE</span><h2 style="margin:10px 0 3px">'+esc(profile.full_name || 'Membre Team Paiya')+'</h2><div class="muted">@'+esc(profile.username || 'membre')+' · '+esc(profile.city || 'Lille')+'</div></div></div>' +
    '<button class="primary" onclick="editProfile()">✏️ Modifier mon profil</button></div>' +
    '<div class="kpis" style="margin-top:24px"><div class="kpi"><strong>'+mine.length+'</strong><span>sortie(s) créée(s)</span></div><div class="kpi"><strong>'+joinedCount+'</strong><span>participation(s)</span></div><div class="kpi"><strong>'+esc(profile.city || 'Lille')+'</strong><span>ville</span></div></div>' +
    '<div class="card" style="margin-top:24px"><div class="body"><h3>À propos</h3><p class="muted" style="white-space:pre-wrap">'+esc(profile.bio || 'Ajoute une petite bio pour te présenter à la Team Paiya.')+'</p><div class="muted"><strong>Centres d’intérêt :</strong> '+esc(profile.interests || 'À compléter')+'</div></div></div>' +
    '<section class="section"><div class="section-head"><div><h2>Mes sorties créées</h2></div><button class="primary" onclick="openCreate()">+ Créer</button></div><div class="grid">' +
    (mine.length ? mine.map(card).join('') : '<div class="empty" style="grid-column:1/-1">Tu n’as encore créé aucune sortie.</div>') +
    '</div></section></section></div>';
}

function editProfile() {
  if (!currentUser || !sb) return;
  sb.from('profiles').select('*').eq('id',currentUser.id).single().then(function(r) {
    var p = r.data || {};
    openModal('<div class="modal-head"><div><h2 style="margin:0">Modifier mon profil</h2><div class="muted">Personnalise ton espace Team Paiya.</div></div><button class="close" onclick="closeModal()">×</button></div>' +
      '<form class="form" onsubmit="event.preventDefault(); saveProfile()">' +
      '<label>Nom complet<input id="profileName" required value="'+esc(p.full_name || '')+'" placeholder="Ex. Alseny Bangoura"></label>' +
      '<label>Pseudo<input id="profileUsername" required value="'+esc(p.username || '')+'" placeholder="Ex. Alseny"></label>' +
      '<label>Ville<input id="profileCity" value="'+esc(p.city || 'Lille')+'" placeholder="Lille"></label>' +
      '<label>Photo de profil (URL)<input id="profileAvatar" value="'+esc(p.avatar_url || '')+'" placeholder="https://..."></label>' +
      '<label>Bio<textarea id="profileBio" placeholder="Présente-toi en quelques mots...">'+esc(p.bio || '')+'</textarea></label>' +
      '<label>Centres d’intérêt<textarea id="profileInterests" placeholder="Ex. Football, sorties, voyages...">'+esc(p.interests || '')+'</textarea></label>' +
      '<button class="primary" type="submit">Enregistrer mon profil</button></form>');
  });
}

async function saveProfile() {
  if (!currentUser || !sb) return;
  var payload = {
    full_name: document.getElementById('profileName').value.trim(),
    username: document.getElementById('profileUsername').value.trim(),
    city: document.getElementById('profileCity').value.trim() || 'Lille',
    avatar_url: document.getElementById('profileAvatar').value.trim() || null,
    bio: document.getElementById('profileBio').value.trim(),
    interests: document.getElementById('profileInterests').value.trim()
  };
  if (!payload.full_name || !payload.username) { toast('Le nom et le pseudo sont obligatoires.'); return; }
  var r = await sb.from('profiles').update(payload).eq('id',currentUser.id);
  if (r.error) { toast('Impossible de mettre à jour le profil : '+r.error.message); return; }
  closeModal();
  showProfile();
  toast('Profil mis à jour ✨');
}

if (sb) {
  sb.auth.getSession().then(function(result) {
    currentUser = result.data && result.data.session ? result.data.session.user : null;
    updateAuthNav();
    loadEvents().then(showHome).then(refreshNotificationBadge).then(refreshMessageBadge);
  }).catch(function(e) {
    console.error(e);
    updateAuthNav();
    showHome();
  });
  sb.auth.onAuthStateChange(function(event,session) {
    currentUser = session ? session.user : null;
    updateAuthNav();
    refreshNotificationBadge();
    refreshMessageBadge();
  });
} else {
  updateAuthNav();
  showHome();
}