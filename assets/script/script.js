// Il mio rettilario — Settimana VII Giorno I
// uso le classi per rappresentare i rettili
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
 // utile per importare dati velocemente, es. Rettile.daStringa("Purptiell|Corn Snake|2021")
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
    return `In cova dal ${this.dataInizio}`;
  }
}

// test del metodo statico in console
console.log(Rettile.daStringa("Purptiell|Corn Snake|2021|acquistato"));


// === Stato ===

// array che contiene tutte le istanze create tramite il form
const rettili = [];


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
  badgeTeca.textContent = r.inTeca ? '🏠 In teca' : '⏳ Non in teca';
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

  rettili.forEach(r => lista.appendChild(creaCardRettile(r)));

  contatore.textContent = rettili.length;
}


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

  // creo RettileInCova se il formato è "in cova", altrimenti un Rettile base
  let nuovo;
  if (stato === 'in cova') {
    nuovo = new RettileInCova(nome, specie, anno, dataInizio);
  } else {
    nuovo = new Rettile(nome, specie, anno, stato);
  }

  rettili.push(nuovo); // aggiungo all'array di stato
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
    renderRettili();
  }

  if (azione === 'rimuovi') {
    // rimuovo dall'array con splice e ridisegno
    const idx = rettili.findIndex(r => r.id === id);
    rettili.splice(idx, 1);
    renderRettili();
  }
});