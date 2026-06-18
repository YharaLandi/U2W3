// Il mio rettilario — Settimana VII Giorno III (17/06/2026)
// aggiungo la ricerca con fetch su iNaturalist API (solo Serpentes, taxon_id=85553)


// === Classi ===

class Rettile {
  static contatore = 0;

  constructor(nome, specie, anno, extinct = false) {
    this.id = ++Rettile.contatore;
    this.nome = nome;
    this.specie = specie;
    this.anno = anno;
    this.extinct = extinct; // booleano dall'API: true se la specie è estinta (17/06/2026)
    this.studiato = false;  // booleano separato: segna se hai studiato questo serpente (17/06/2026)
  }

  // segna il rettile come studiato — chiamato dal bottone "Segna come studiato" (17/06/2026)
  segnaStudioato() {
    this.studiato = true;
  }

  static daStringa(s) {
    const [nome, specie, anno] = s.split('|');
    return new Rettile(nome, specie, parseInt(anno));
  }
}


// === localStorage === (aggiunto il 16/06/2026)

const STORAGE_KEY = 'rettilario';

function salvaRettili() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(rettili));
}

// GOTCHA: JSON.parse restituisce oggetti puri, non istanze —
// ri-istanzio le classi giuste per ripristinare i metodi
function caricaRettili() {
  const dati = localStorage.getItem(STORAGE_KEY);
  if (!dati) return [];

  return JSON.parse(dati).map(d => {
    const r = new Rettile(d.nome, d.specie, d.anno, d.extinct);
    r.id = d.id;
    r.studiato = d.studiato;
    return r;
  });
}


// === Stato ===

// uso let perché "Svuota tutto" riassegna l'array
let rettili = caricaRettili();

// sincronizzo il contatore con l'id più alto già salvato
if (rettili.length > 0) {
  Rettile.contatore = Math.max(...rettili.map(r => r.id));
}


// === Filtro e ordinamento === (aggiunto il 16/06/2026)
// il filtro per estinzione è stato aggiunto il 17/06/2026

let filtroAttivo = 'tutti';
let ordineAttivo = 'nome-az';

// lavora su una copia dell'array — non modifica mai l'originale
function getListaFiltrata() {
  let risultato = [...rettili];

  // filtro per stato estinzione — i dati vengono dall'API iNaturalist (17/06/2026)
  if (filtroAttivo === 'estinti')    risultato = risultato.filter(r => r.extinct);
  if (filtroAttivo === 'nonestinti') risultato = risultato.filter(r => !r.extinct);

  risultato.sort((a, b) => {
    if (ordineAttivo === 'nome-az') return a.nome.localeCompare(b.nome);
    if (ordineAttivo === 'nome-za') return b.nome.localeCompare(a.nome);
    if (ordineAttivo === 'anno')    return (a.anno || 0) - (b.anno || 0);
  });

  return risultato;
}

// aggiorna la classe attivo sui bottoni filtro
function renderFiltri() {
  document.querySelectorAll('.btn-filtro').forEach(btn => {
    btn.classList.toggle('attivo', btn.dataset.filtro === filtroAttivo);
  });
}


// === Helpers fetch === (aggiunto il 17/06/2026)
// tre funzioni per gestire i 3 stati della ricerca: caricamento, errore, risultati

function mostraSpinner() {
  document.getElementById('spinner').removeAttribute('hidden');
  document.getElementById('errore').setAttribute('hidden', '');
}

function nascondiSpinner() {
  document.getElementById('spinner').setAttribute('hidden', '');
}

// scrive il messaggio nell'elemento #errore e lo rende visibile
function mostraErrore(msg) {
  const el = document.getElementById('errore');
  el.textContent = msg;
  el.removeAttribute('hidden');
  nascondiSpinner();
}


// === Render risultati ricerca === (aggiunto il 17/06/2026)

/**
 * Renderizza i risultati della ricerca iNaturalist nella lista #risultati
 * Costruisce ogni <li> con foto, nome comune, nome scientifico e bottone Aggiungi
 * @param {Array} taxa - array di taxa restituiti dall'API
 */
function renderRisultati(taxa) {
  const lista = document.getElementById('risultati');
  lista.replaceChildren();

  if (taxa.length === 0) {
    const li = document.createElement('li');
    li.textContent = 'Nessun risultato.';
    lista.appendChild(li);
    return;
  }

  taxa.forEach(d => {
    const nomeComune  = d.preferred_common_name || d.name;
    const nomeScient  = d.name;
    const foto        = d.default_photo ? d.default_photo.square_url : null;

    // controllo se è già nel rettilario per disabilitare il bottone
    const giàAggiunto = rettili.some(r => r.specie === nomeScient);

    const li = document.createElement('li');
    li.className = 'risultato-item';

    if (foto) {
      const img = document.createElement('img');
      img.src = foto;
      img.alt = nomeComune;
      img.className = 'risultato-foto';
      li.appendChild(img);
    }

    const info = document.createElement('div');
    info.className = 'risultato-info';

    const titolo = document.createElement('span');
    titolo.className = 'risultato-nome';
    titolo.textContent = nomeComune;

    const scient = document.createElement('span');
    scient.className = 'risultato-scient';
    scient.textContent = nomeScient;

    info.appendChild(titolo);
    info.appendChild(scient);


    // salvo extinct nel dataset del bottone per recuperarlo al click
    const btn = document.createElement('button');
    btn.className = 'btn-aggiungi';
    btn.dataset.nome    = nomeComune;
    btn.dataset.specie  = nomeScient;
    btn.dataset.extinct = d.extinct || false;

    if (giàAggiunto) {
      btn.textContent = '✓ Aggiunto';
      btn.setAttribute('disabled', '');
    } else {
      btn.textContent = 'Aggiungi';
      btn.dataset.azione = 'aggiungi';
    }

    li.appendChild(info);
    li.appendChild(btn);
    lista.appendChild(li);
  });
}


// === Fetch iNaturalist === (aggiunto il 17/06/2026)

/**
 * Cerca serpenti su iNaturalist filtrando per Serpentes (taxon_id=85553)
 * Gestisce i 3 stati: spinner → risultati o errore → nascondi spinner (finally)
 * @param {string} query - testo cercato dall'utente
 */
// convertita da .then a async/await il 18/06/2026 — stessa logica, sintassi più leggibile
async function cerca(query) {
  mostraSpinner();

  // taxon_id=85553 = Serpentes, rank=species esclude generi e famiglie
  const url = 'https://api.inaturalist.org/v1/taxa?q=' + encodeURIComponent(query) + '&taxon_id=85553&rank=species&limit=10&is_active=true';

  try {
    const response = await fetch(url);
    if (!response.ok) throw new Error('Errore HTTP ' + response.status);
    const dati = await response.json();
    renderRisultati(dati.results);
  } catch (err) {
    mostraErrore('Impossibile completare la ricerca: ' + err.message);
  } finally {
    nascondiSpinner(); // si esegue sempre, anche in caso di errore
  }
}


// === Render rettilario ===

function creaCardRettile(r) {
  const li = document.createElement('li');
  li.className = 'rettile-item';
  li.dataset.id = r.id;

  // --- colonna sinistra: info ---
  const info = document.createElement('div');
  info.className = 'rettile-info';

  const nome = document.createElement('span');
  nome.className = 'nome';
  nome.textContent = r.nome;

  const specieEl = document.createElement('span');
  specieEl.className = 'specie-anno';
  specieEl.textContent = r.specie;

  info.appendChild(nome);
  info.appendChild(specieEl);

  // badge estinto — visibile solo se il campo extinct è true (17/06/2026)
  if (r.extinct) {
    const extEl = document.createElement('span');
    extEl.className = 'badge-stato badge-extinct';
    extEl.textContent = '☠️ Estinto';
    info.appendChild(extEl);
  }

  // --- colonna destra: badge studiato + bottoni ---
  const azioni = document.createElement('div');
  azioni.className = 'rettile-azioni';

  // badge studiato: mostra lo stato del booleano this.studiato (17/06/2026)
  const badgeStudio = document.createElement('span');
  badgeStudio.className = `badge-stato ${r.studiato ? 'badge-studiato' : 'badge-nonstudioato'}`;
  badgeStudio.textContent = r.studiato ? '📚 Studiato' : '🔬 Da studiare';
  azioni.appendChild(badgeStudio);

  // bottone visibile solo finché non è studiato — sparisce dopo il click
  if (!r.studiato) {
    const btnStudio = document.createElement('button');
    btnStudio.dataset.azione = 'studia';
    btnStudio.textContent = 'Segna come studiato';
    azioni.appendChild(btnStudio);
  }

  const btnRimuovi = document.createElement('button');
  btnRimuovi.dataset.azione = 'rimuovi';
  btnRimuovi.className = 'elimina';
  btnRimuovi.textContent = 'Rimuovi';
  azioni.appendChild(btnRimuovi);

  li.appendChild(info);
  li.appendChild(azioni);

  return li;
}

function renderRettili() {
  const lista = document.getElementById('lista-rettili');
  const contatore = document.getElementById('contatore');

  lista.replaceChildren();

  getListaFiltrata().forEach(r => lista.appendChild(creaCardRettile(r)));

  contatore.textContent = rettili.length;
}

// render iniziale gestito da avvio() in fondo allo script (18/06/2026)


// === Eventi ===

// debounce: aspetto 400ms dopo l'ultima digitazione prima di fare il fetch (17/06/2026)
// evito una richiesta per ogni tasto premuto
let timeoutId;
document.getElementById('cerca').addEventListener('input', (e) => {
  const query = e.target.value.trim();

  // sotto i 3 caratteri svuoto i risultati e non faccio fetch
  if (query.length < 3) {
    document.getElementById('risultati').replaceChildren();
    return;
  }

  clearTimeout(timeoutId);
  timeoutId = setTimeout(() => cerca(query), 400); // 400ms di attesa
});

// click delegato sui risultati — aggiungi al rettilario (17/06/2026)
document.getElementById('risultati').addEventListener('click', (e) => {
  const btn = e.target.closest('[data-azione="aggiungi"]');
  if (!btn) return;

  // creo il Rettile con i dati salvati nel dataset del bottone
  const nuovo = new Rettile(
    btn.dataset.nome,
    btn.dataset.specie,
    new Date().getFullYear(),
    btn.dataset.extinct === 'true' // il dataset salva stringhe, converto in booleano
  );

  rettili.push(nuovo);
  salvaRettili();
  renderRettili();

  // feedback immediato: disabilito il bottone e cambio testo
  btn.textContent = '✓ Aggiunto';
  btn.setAttribute('disabled', '');
  btn.removeAttribute('data-azione');
});

// click delegato sul rettilario personale
document.getElementById('lista-rettili').addEventListener('click', (e) => {
  const bottone = e.target.closest('[data-azione]');
  if (!bottone) return;

  const card   = bottone.closest('li');
  const id     = parseInt(card.dataset.id);
  const azione = bottone.dataset.azione;

  if (azione === 'studia') {
    // chiamo il metodo della classe che imposta studiato = true (17/06/2026)
    const rettile = rettili.find(r => r.id === id);
    rettile.segnaStudioato();
    salvaRettili();
    renderRettili();
  }

  if (azione === 'rimuovi') {
    const idx = rettili.findIndex(r => r.id === id);
    rettili.splice(idx, 1);
    salvaRettili();
    renderRettili();
  }
});

// svuota tutto (aggiunto il 16/06/2026)
document.getElementById('svuota-tutto').addEventListener('click', () => {
  rettili = [];
  Rettile.contatore = 0;
  localStorage.removeItem(STORAGE_KEY);
  filtroAttivo = 'tutti';
  renderFiltri();
  renderRettili();
});

// select ordinamento
document.getElementById('selectOrdine').addEventListener('change', (e) => {
  ordineAttivo = e.target.value;
  renderRettili();
});

// listener bottoni filtro (17/06/2026)
document.querySelectorAll('.btn-filtro').forEach(btn => {
  btn.addEventListener('click', () => {
    filtroAttivo = btn.dataset.filtro;
    renderFiltri();
    renderRettili();
  });
});


// === Autenticazione === (aggiunto il 18/06/2026)
// uso dummyjson.com come API di test per login, token e profilo utente

// legge il token JWT salvato in localStorage — null se non loggato
function getToken() {
  return localStorage.getItem('auth.token');
}

// legge e parsa l'oggetto utente salvato in localStorage — null se non presente
function getUtente() {
  const u = localStorage.getItem('auth.user');
  return u ? JSON.parse(u) : null;
}

// rimuove token e utente dal localStorage — equivale al logout
function logout() {
  localStorage.removeItem('auth.token');
  localStorage.removeItem('auth.user');
}

/**
 * Fa il login su dummyjson.com con username e password
 * Salva il token JWT e i dati utente in localStorage
 * @param {string} username
 * @param {string} password
 * @returns {Object} i dati utente ricevuti dall'API
 */
async function login(username, password) {
  // uso async/await invece di .then — più leggibile per operazioni sequenziali (18/06/2026)
  const r = await fetch('https://dummyjson.com/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username, password })
  });

  if (!r.ok) throw new Error('Credenziali non valide');

  const dati = await r.json();

  // salvo token e utente separatamente per poterli leggere indipendentemente
  localStorage.setItem('auth.token', dati.accessToken);
  localStorage.setItem('auth.user', JSON.stringify(dati));

  return dati;
}

/**
 * Carica il profilo utente usando il token salvato
 * Fa una GET autenticata a dummyjson.com/auth/me
 * @returns {Object|null} il profilo utente o null se non loggato
 */
async function caricaProfilo() {
  const token = getToken();
  if (!token) return null; // non loggato, non faccio la richiesta

  const r = await fetch('https://dummyjson.com/auth/me', {
    headers: { 'Authorization': 'Bearer ' + token }
  });

  if (!r.ok) return null;
  return r.json();
}

// === Render auth === (aggiunto il 18/06/2026)

/**
 * Popola il div #auth-box in base allo stato di login:
 * - se loggato: saluto + bottone Esci
 * - se non loggato: form con username e password pre-compilati
 */
function renderAuthBox() {
  const box = document.getElementById('auth-box');
  box.replaceChildren();

  const utente = getUtente();

  if (utente) {
    // utente loggato — mostro saluto e bottone logout
    const saluto = document.createElement('span');
    saluto.className = 'saluto';
    saluto.textContent = `Ciao ${utente.firstName}`;

    const btnLogout = document.createElement('button');
    btnLogout.id = 'btn-logout';
    btnLogout.className = 'btn-logout';
    btnLogout.textContent = 'Esci';

    // al click faccio logout, ri-rendo l'auth box e nascondo il profilo
    btnLogout.addEventListener('click', () => {
      logout();
      renderAuthBox();
      document.getElementById('profilo-section').setAttribute('hidden', '');
    });

    box.appendChild(saluto);
    box.appendChild(btnLogout);

  } else {
    // utente non loggato — mostro form login con valori di test pre-compilati
    const form = document.createElement('form');
    form.id = 'form-login';

    const inputUser = document.createElement('input');
    inputUser.type = 'text';
    inputUser.id = 'login-username';
    inputUser.value = 'emilys'; // utente di test dummyjson
    inputUser.placeholder = 'Username';

    const inputPass = document.createElement('input');
    inputPass.type = 'password';
    inputPass.id = 'login-password';
    inputPass.value = 'emilyspass'; // password di test dummyjson
    inputPass.placeholder = 'Password';

    const btnLogin = document.createElement('button');
    btnLogin.type = 'submit';
    btnLogin.textContent = 'Accedi';
    btnLogin.className = 'btnPrimary';

    form.appendChild(inputUser);
    form.appendChild(inputPass);
    form.appendChild(btnLogin);

    // attacco il listener direttamente sul form appena creato
    form.addEventListener('submit', gestisciLogin);

    box.appendChild(form);
  }
}

/**
 * Gestisce il submit del form di login
 * In caso di successo mostra il profilo, in caso di errore mostra un alert
 */
async function gestisciLogin(e) {
  e.preventDefault();

  const username = document.getElementById('login-username').value;
  const password = document.getElementById('login-password').value;

  try {
    await login(username, password);
    renderAuthBox();          // aggiorno l'header con saluto + bottone esci
    await mostraProfilo();    // carico e mostro il profilo
  } catch (err) {
    alert(err.message);
  }
}

/**
 * Carica il profilo e lo mostra nella sezione #profilo-section
 * Se non loggato esce subito senza fare nulla
 */
async function mostraProfilo() {
  if (!getToken()) return; // non loggato, esco subito

  try {
    const profilo = await caricaProfilo();
    if (!profilo) return;

    // popolo il div #profilo con foto e dati
    document.getElementById('profilo').innerHTML =
      `<img src="${profilo.image}" alt="foto profilo">
       <div class="info">
         <p><strong>${profilo.firstName} ${profilo.lastName}</strong></p>
         <p>@${profilo.username} - ${profilo.email}</p>
       </div>`;

    // rendo visibile la sezione profilo
    document.getElementById('profilo-section').removeAttribute('hidden');

  } catch (err) {
    console.error('Errore caricamento profilo:', err);
  }
}

// === Avvio === (aggiunto il 18/06/2026)
// funzione principale che inizializza tutto al caricamento della pagina

async function avvio() {
  renderFiltri();
  renderRettili();
  renderAuthBox();          // mostro login o saluto in base al token salvato
  await mostraProfilo();    // se già loggato, mostro subito il profilo
}

avvio();

//18/06
/*Oggi abbiamo fatto due concetti: la conversione da .then ad async/await e l'autenticazione con una API esterna.
async/await: ho riscritto la funzione cerca() che prima usava la catena .then().catch().finally(). 
-------------------------------------------------------------------------------------------------------
Con async/await la funzione diventa async, ogni operazione asincrona si precede con await e gli errori si gestiscono con try/catch/finally. Il comportamento è identico, ma il codice si legge dall'alto in basso come se fosse sincrono.
-------------------------------------------------------------------------------------------------------
Autenticazione: ho aggiunto 4 helper — getToken() e getUtente() leggono i dati salvati in localStorage, logout() li cancella, login() è una funzione async che fa una POST a dummyjson.com/auth/login con username e password nel body come JSON, riceve un token JWT e i dati utente e li salva in localStorage separatamente.
-------------------------------------------------------------------------------------------------------
Funzioni:
caricaProfilo() è una funzione async che legge il token salvato e fa una GET autenticata a /auth/me passando il token nell'header Authorization: Bearer. Restituisce i dati del profilo.
mostraProfilo() chiama caricaProfilo(), popola il div #profilo con foto, nome e email e rimuove l'attributo hidden dalla sezione.
renderAuthBox() guarda se c'è un utente salvato: se sì mostra saluto + bottone Esci, se no mostra il form di login.
avvio() è la funzione principale che viene chiamata al caricamento della pagina — chiama renderFiltri(), renderRettili(), renderAuthBox() e await mostraProfilo() così se sei già loggato vedi subito il profilo senza rifare il login.*/