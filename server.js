// API de Dj Wallet Exchange.
// Le mot de passe de la base n'est jamais dans ce fichier : il vient de la variable DATABASE_URL.
// La clé d'accès à l'API vient de la variable API_KEY (à donner à l'application, jamais publiée).
const http = require('http');
const { Pool } = require('pg');

const DATABASE_URL = process.env.DATABASE_URL;
const API_KEY = process.env.API_KEY;
const PORT = process.env.PORT || 10000;

if (!DATABASE_URL) {
  console.error('Variable DATABASE_URL manquante.');
  process.exit(1);
}
if (!API_KEY) {
  console.error('Variable API_KEY manquante.');
  process.exit(1);
}

// Supabase exige une connexion chiffrée.
const pool = new Pool({ connectionString: DATABASE_URL, ssl: { rejectUnauthorized: false }, max: 5 });

function envoyer(res, code, corps) {
  res.writeHead(code, { 'Content-Type': 'application/json; charset=utf-8' });
  res.end(JSON.stringify(corps));
}

// Routes publiques : aucune donnée sensible.
async function sante(res) {
  try {
    await pool.query('SELECT 1');
    envoyer(res, 200, { ok: true, base: 'connectee' });
  } catch (e) {
    envoyer(res, 503, { ok: false, base: 'erreur', detail: 'connexion à la base impossible' });
  }
}

// Routes protégées par la clé API.
async function wallets(res) {
  // Pas de logo, pas de clé API des wallets : seulement ce que l'application affiche.
  const r = await pool.query(
    `SELECT id, nom, code, operateur, description, couleur, statut, regle_frais,
            frais_pourcentage, ordre
     FROM wallets ORDER BY ordre, id`
  );
  envoyer(res, 200, r.rows);
}

async function tranches(res) {
  const r = await pool.query(
    `SELECT id, montant_max, type_frais, valeur FROM tranches_frais ORDER BY montant_max NULLS LAST`
  );
  envoyer(res, 200, r.rows);
}

const serveur = http.createServer(async (req, res) => {
  try {
    const url = new URL(req.url, 'http://x');
    if (req.method !== 'GET') return envoyer(res, 405, { erreur: 'méthode non autorisée' });

    if (url.pathname === '/' || url.pathname === '/health') return sante(res);

    // Toutes les autres routes exigent la clé API.
    if (req.headers['x-api-key'] !== API_KEY) return envoyer(res, 401, { erreur: 'clé API invalide' });

    if (url.pathname === '/wallets') return wallets(res);
    if (url.pathname === '/tranches') return tranches(res);

    return envoyer(res, 404, { erreur: 'route inconnue' });
  } catch (e) {
    console.error(e);
    return envoyer(res, 500, { erreur: 'erreur interne' });
  }
});

serveur.listen(PORT, () => console.log('API démarrée sur le port ' + PORT));
