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
function cerca(query) {
  mostraSpinner();

  // taxon_id=85553 = Serpentes, rank=species esclude generi e famiglie
  const url = 'https://api.inaturalist.org/v1/taxa?q=' + encodeURIComponent(query) + '&taxon_id=85553&rank=species&limit=10&is_active=true';

  fetch(url)
    .then(response => {
      // se la risposta non è ok lancio un errore che finisce nel catch
      if (!response.ok) throw new Error('Errore HTTP ' + response.status);
      return response.json();
    })
    .then(dati => renderRisultati(dati.results))
    .catch(err => mostraErrore('Impossibile completare la ricerca: ' + err.message))
    .finally(() => nascondiSpinner()); // si esegue sempre, anche in caso di errore
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

// render iniziale dai dati in localStorage
renderFiltri();
renderRettili();


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