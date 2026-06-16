// Il mio rettilario — Settimana VII Giorno II
// aggiungo la persistenza: i rettili sopravvivono al refresh grazie a localStorage


// === Classi ===

// classe base: ogni rettile ha un id univoco auto-incrementale grazie al campo statico
class Rettile {
  static contatore = 0; // condiviso tra tutte le istanze

  constructor(nome, specie, anno, stato) {
    this.id = ++Rettile.contatore; // id cresce ad ogni new Rettile
    this.nome = nome;
    this.specie = specie;
    this.anno = anno;
    this.stato = stato; // "acquistato" | "desiderato" | "in cova"
    this.inTeca = false; // validazione separata dallo stato, parte sempre a false
  }

  // restituisce lo stato leggibile — le sottoclassi possono sovrascriverlo
  descrizioneStato() {
    return this.stato;
  }

  // segna il rettile come fisicamente in teca, senza toccare lo stato
  segnaInTeca() {
    this.inTeca = true;
  }

  // metodo statico: crea un Rettile da una stringa "nome|specie|anno|stato"
  static daStringa(s) {
    const [nome, specie, anno, stato] = s.split('|');
    return new Rettile(nome, specie, parseInt(anno), stato || 'acquistato');
  }
}

// sottoclasse per i rettili in cova: estende Rettile aggiungendo la data di inizio
class RettileInCova extends Rettile {
  constructor(nome, specie, anno, dataInizio) {
    super(nome, specie, anno, 'in cova'); // chiamo il costruttore del genitore
    this.dataInizio = dataInizio; // proprietà aggiuntiva specifica di questa sottoclasse
  }

  // override: fornisce una descrizione più ricca rispetto alla classe base
  descrizioneStato() {
    return `in cova dal ${this.dataInizio}`;
  }
}


// LOCALSTORAGE(aggiunto il 16/06/2026)

// chiave unica con cui salvo i dati nel browser
const STORAGE_KEY = 'rettilario';

// salva l'array rettili nel localStorage come stringa JSON
function salvaRettili() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(rettili));
}

// carica i dati dal localStorage e ri-istanzia le classi giuste
// GOTCHA: JSON.parse restituisce oggetti puri, non istanze —
// quindi i metodi come descrizioneStato() non esisterebbero senza questa ricostruzione
function caricaRettili() {
  const dati = localStorage.getItem(STORAGE_KEY);
  if (!dati) return []; // prima visita: niente salvato, parto da zero

  return JSON.parse(dati).map(d => {
    // ricostruisco l'istanza giusta in base allo stato salvato
    let r;
    if (d.stato === 'in cova') {
      r = new RettileInCova(d.nome, d.specie, d.anno, d.dataInizio);
    } else {
      r = new Rettile(d.nome, d.specie, d.anno, d.stato);
    }
    // ripristino id e inTeca esattamente come erano
    r.id = d.id;
    r.inTeca = d.inTeca;
    return r;
  });
}


// === Stato ===

// carico subito i rettili salvati invece di partire da array vuoto
// uso let perché "Svuota tutto" dovrà riassegnare l'array
let rettili = caricaRettili();

// sincronizzo il contatore statico con l'id più alto già salvato
// così i nuovi rettili non avranno id in conflitto con quelli esistenti
if (rettili.length > 0) {
  Rettile.contatore = Math.max(...rettili.map(r => r.id));
}


// === Setup input anno ===

// imposto dinamicamente l'anno corrente come massimo accettato
// così non devo aggiornare il codice ogni anno
const annoCorrente = new Date().getFullYear();
document.getElementById('anno').setAttribute('max', annoCorrente);


// === Render ===

// restituisce la classe CSS giusta per il badge in base allo stato
function badgeClass(stato) {
  if (stato === 'acquistato') return 'badge-acquistato';
  if (stato === 'desiderato') return 'badge-desiderato';
  return 'badge-incova';
}

// costruisce il <li> di un rettile con createElement invece di innerHTML
// così ho controllo preciso su ogni elemento e non rischio injection
function creaCardRettile(r) {
  const li = document.createElement('li');
  li.className = 'rettile-item';
  li.dataset.id = r.id; // salvo l'id nel DOM per recuperarlo nell'event delegation

  // --- colonna sinistra: info ---
  const info = document.createElement('div');
  info.className = 'rettile-info';

  const nome = document.createElement('span');
  nome.className = 'nome';
  nome.textContent = r.nome;

  const specieAnno = document.createElement('span');
  specieAnno.className = 'specie-anno';
  specieAnno.textContent = r.anno ? `${r.specie} — ${r.anno}` : r.specie;

  const badge = document.createElement('span');
  badge.className = `badge-stato ${badgeClass(r.stato)}`;
  badge.textContent = r.descrizioneStato(); // chiama il metodo della classe (o della sottoclasse)

  info.appendChild(nome);
  info.appendChild(specieAnno);
  info.appendChild(badge);

  // --- colonna destra: badge teca + bottoni ---
  const azioni = document.createElement('div');
  azioni.className = 'rettile-azioni';

  // badge teca: mostra lo stato di questa proprietà booleana indipendente
  const badgeTeca = document.createElement('span');
  badgeTeca.className = `badge-stato ${r.inTeca ? 'badge-inteca' : 'badge-noninteca'}`;
  badgeTeca.textContent = r.inTeca ? '🏠 in teca' : '⏳ non in teca';
  azioni.appendChild(badgeTeca);

  // bottone "segna in teca" visibile solo se non ancora segnato
  if (!r.inTeca) {
    const btnTeca = document.createElement('button');
    btnTeca.dataset.azione = 'teca'; // usato dall'event delegation per capire cosa fare
    btnTeca.textContent = '🐍 Segna in teca';
    azioni.appendChild(btnTeca);
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

// svuota la lista e la ridisegna da zero partendo dall'array rettili
function renderRettili() {
  const lista = document.getElementById('lista-rettili');
  const contatore = document.getElementById('contatore');

  lista.replaceChildren(); // più pulito di innerHTML = ''

  // uso getListaFiltrata() così il render rispetta sempre filtro e ordine attivi
  getListaFiltrata().forEach(r => lista.appendChild(creaCardRettile(r)));

  contatore.textContent = rettili.length;
}

// FILTRO E ORDINAMENTO (aggiunto il 16/06/2026)

// stato corrente di filtro e ordine — parto con "tutti" e "nome-az"
let filtroAttivo = 'tutti';
let ordineAttivo = 'nome-az';

// applica filtro e ordinamento all'array e restituisce la versione filtrata
// non modifica l'array originale, lavora su una copia
function getListaFiltrata() {
  let risultato = [...rettili]; // copia per non alterare l'originale

  // filtro per stato
  if (filtroAttivo !== 'tutti') {
    risultato = risultato.filter(r => r.stato === filtroAttivo);
  }

  // ordinamento
  risultato.sort((a, b) => {
    if (ordineAttivo === 'nome-az') return a.nome.localeCompare(b.nome);
    if (ordineAttivo === 'nome-za') return b.nome.localeCompare(a.nome);
    if (ordineAttivo === 'anno')    return (a.anno || 0) - (b.anno || 0);
  });

  return risultato;
}

// render iniziale: mostro subito i rettili caricati dal localStorage
renderRettili();


// === Eventi ===

const selectStato = document.getElementById('stato');
const campoDataCova = document.getElementById('campo-datacova');

// mostro o nascondo il campo data cova in base al valore della select
selectStato.addEventListener('change', () => {
  if (selectStato.value === 'in cova') {
    campoDataCova.removeAttribute('hidden');
  } else {
    campoDataCova.setAttribute('hidden', '');
  }
});

// al submit leggo i valori, creo l'istanza giusta e aggiorno la lista
document.getElementById('aggiungi-rettile').addEventListener('submit', (e) => {
  e.preventDefault(); // blocco il comportamento default del form (ricarica pagina)

  const nome       = document.getElementById('nome').value.trim();
  const specie     = document.getElementById('specie').value.trim();
  const anno       = parseInt(document.getElementById('anno').value) || null;
  const stato      = selectStato.value;
  const dataInizio = document.getElementById('dataInizio').value;

  // creo RettileInCova se lo stato è "in cova", altrimenti un Rettile base
  let nuovo;
  if (stato === 'in cova') {
    nuovo = new RettileInCova(nome, specie, anno, dataInizio);
  } else {
    nuovo = new Rettile(nome, specie, anno, stato);
  }

  rettili.push(nuovo); // aggiungo all'array di stato
  salvaRettili();      // persisto subito nel localStorage
  renderRettili();     // ridisegno tutta la lista

  e.target.reset(); // pulisco il form
  campoDataCova.setAttribute('hidden', ''); // nascondo di nuovo il campo data cova
});

// gestisco tutti i click sulla lista con un solo listener sul contenitore (event delegation)
// evito di attaccare listener su ogni singolo bottone
document.getElementById('lista-rettili').addEventListener('click', (e) => {
  const bottone = e.target.closest('[data-azione]'); // risalgo al bottone con data-azione
  if (!bottone) return; // click su area non interattiva, esco

  const card   = bottone.closest('li');
  const id     = parseInt(card.dataset.id); // recupero l'id salvato nel DOM
  const azione = bottone.dataset.azione;

  if (azione === 'teca') {
    // chiamo il metodo della classe che imposta inTeca = true
    const rettile = rettili.find(r => r.id === id);
    rettile.segnaInTeca();
    salvaRettili(); // salvo dopo ogni modifica
    renderRettili();
  }

  if (azione === 'rimuovi') {
    // rimuovo dall'array con splice e ridisegno
    const idx = rettili.findIndex(r => r.id === id);
    rettili.splice(idx, 1);
    salvaRettili(); // salvo dopo ogni modifica
    renderRettili();
  }
});

// SVUOTA TUTTO: cancella localStorage e azzera l'array (aggiunto il 16/06/2026)
// uso let sull'array per poterlo riassegnare qui
document.getElementById('svuota-tutto').addEventListener('click', () => {
  rettili = []; // riassegno l'array vuoto
  Rettile.contatore = 0; // resetto anche il contatore degli id
  localStorage.removeItem(STORAGE_KEY); // cancello dal browser
  renderRettili();
});

// listener bottoni filtro
document.querySelectorAll('.btn-filtro').forEach(btn => {
  btn.addEventListener('click', () => {
    // rimuovo attivo da tutti e lo metto su quello cliccato
    document.querySelectorAll('.btn-filtro').forEach(b => b.classList.remove('attivo'));
    btn.classList.add('attivo');
    filtroAttivo = btn.dataset.filtro;
    renderRettili();
  });
});

// listener select ordinamento
document.getElementById('selectOrdine').addEventListener('change', (e) => {
  ordineAttivo = e.target.value;
  renderRettili();
});