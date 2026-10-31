// Dj Wallet Exchange — serveur API 1.3.0 (fichier construit par serveur/build.mjs à partir de serveur/src :
// ne pas modifier à la main). Déposer ce fichier et package.json sur GitHub ; Render installe « pg » et lance « node server.js ».
"use strict";
var __create = Object.create;
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __getProtoOf = Object.getPrototypeOf;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toESM = (mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(
  // If the importer is in node compatibility mode or this is not an ESM
  // file that has been converted to a CommonJS file using a Babel-
  // compatible transform (i.e. "__esModule" has not been set), then set
  // "default" to the CommonJS "module.exports" for node compatibility.
  isNodeMode || !mod || !mod.__esModule ? __defProp(target, "default", { value: mod, enumerable: true }) : target,
  mod
));
var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);

// src/main.ts
var main_exports = {};
__export(main_exports, {
  creerServeur: () => creerServeur,
  preparerBase: () => preparerBase
});
module.exports = __toCommonJS(main_exports);
var http = __toESM(require("http"));

// ../web/src/domain.ts
var MOTIFS_SIGNALEMENT = [
  "Argent non reçu par le destinataire",
  "Montant reçu incorrect",
  "Paiement débité mais échange non traité",
  "Erreur sur le numéro du destinataire",
  "Échange en attente depuis trop longtemps",
  "Autre problème"
];
var STATUTS_SIGNALABLES = ["EN_ATTENTE", "EN_COURS", "TRAITEE"];
var LIBELLE_SANS_FRAIS = "Aucun frais";
function pourcentageDe(montant, pourcentage) {
  const centiemes = Math.round(pourcentage * 100);
  return Math.round(montant * centiemes / 1e4);
}
function formatPourcentage(p) {
  return String(Math.round(p * 100) / 100).replace(".", ",");
}
function debutTranche(grille, index) {
  if (index <= 0) return 1;
  const precedente = grille.tranches[index - 1];
  return precedente && precedente.max != null ? precedente.max + 1 : 1;
}
function libelleIntervalle(debut, max) {
  if (max == null) return debut <= 1 ? "tous les montants" : "plus de " + nombre(debut - 1) + " FDJ";
  if (debut <= 1) return "jusqu’à " + nombre(max) + " FDJ";
  if (debut === max) return nombre(max) + " FDJ exactement";
  return "de " + nombre(debut) + " à " + nombre(max) + " FDJ";
}
function indexTranche(montant, grille) {
  const t = grille.tranches;
  for (let i = 0; i < t.length; i++) {
    if (t[i].max == null || montant <= t[i].max) return i;
  }
  return t.length - 1;
}
function descriptionGrille(grille) {
  const t = grille.tranches;
  if (!t.length) return "aucun frais";
  const parties = [];
  for (let i = 0; i < t.length; i++) {
    const valeur = t[i].type === "FIXE" ? fdj(t[i].valeur) : formatPourcentage(t[i].valeur) + " % du montant";
    if (t.length === 1) {
      parties.push(valeur);
    } else if (i === t.length - 1) {
      parties.push("puis " + valeur);
    } else {
      parties.push(valeur + " " + libelleIntervalle(debutTranche(grille, i), t[i].max));
    }
  }
  return parties.join(", ");
}
var MAX_TRANCHES = 12;
function erreurGrille(grille, montantMin) {
  const t = grille.tranches;
  if (!t.length) return "Ajoutez au moins une tranche de frais.";
  if (t.length > MAX_TRANCHES) return "La grille ne peut pas dépasser " + MAX_TRANCHES + " tranches.";
  for (let i = 0; i < t.length; i++) {
    const n = i + 1;
    const derniere = i === t.length - 1;
    const max = t[i].max;
    if (derniere) {
      if (max != null) return "La dernière tranche doit couvrir tous les montants au-delà (sans maximum).";
    } else {
      if (max == null || !isFinite(max) || Math.floor(max) !== max || max < 1) return "Tranche " + n + " : le montant maximum est invalide.";
      if (max > 1e9) return "Tranche " + n + " : le montant maximum est trop grand.";
      const debut = debutTranche(grille, i);
      if (max < debut) return "Tranche " + n + " : le montant maximum doit être supérieur à celui de la tranche précédente.";
    }
    const v = t[i].valeur;
    if (t[i].type !== "FIXE" && t[i].type !== "POURCENTAGE") return "Tranche " + n + " : choisissez des frais fixes ou un pourcentage.";
    if (typeof v !== "number" || !isFinite(v) || v < 0) return "Tranche " + n + " : la valeur des frais est invalide.";
    if (t[i].type === "POURCENTAGE") {
      if (v > 50) return "Tranche " + n + " : le pourcentage ne peut pas dépasser 50 %.";
    } else {
      if (Math.floor(v) !== v) return "Tranche " + n + " : les frais fixes doivent être un nombre entier de FDJ.";
      const plusPetit = Math.max(debutTranche(grille, i), montantMin);
      if ((max == null || plusPetit <= max) && v >= plusPetit) {
        return "Tranche " + n + " : les frais fixes (" + fdj(v) + ") doivent rester inférieurs au plus petit montant de la tranche (" + fdj(plusPetit) + ").";
      }
    }
  }
  return null;
}
function calculerFrais(montant, dest, grille) {
  if (dest.regle_frais === "POURCENTAGE") {
    return {
      frais: 0,
      fraisSysteme: 0,
      commission: pourcentageDe(montant, dest.frais_pourcentage),
      tauxCommission: dest.frais_pourcentage,
      net: montant,
      libelle: LIBELLE_SANS_FRAIS,
      sansFrais: true
    };
  }
  if (!grille.tranches.length) {
    return { frais: 0, fraisSysteme: 0, commission: 0, tauxCommission: null, net: montant, libelle: LIBELLE_SANS_FRAIS, sansFrais: false };
  }
  const i = indexTranche(montant, grille);
  const t = grille.tranches[i];
  const frais = t.type === "FIXE" ? Math.round(t.valeur) : pourcentageDe(montant, t.valeur);
  const libelle = t.type === "FIXE" ? "Frais fixes (" + libelleIntervalle(debutTranche(grille, i), t.max) + ")" : "Frais (" + formatPourcentage(t.valeur) + " %)";
  return { frais, fraisSysteme: frais, commission: 0, tauxCommission: null, net: montant - frais, libelle, sansFrais: false };
}
var LIBELLE_SANS_FRAIS_TEST = "Sans frais (test de la passerelle)";
function calculerFraisEchange(montant, source, dest, grille, sansFraisPasserelle) {
  if (sansFraisPasserelle && source.passerelle && dest.passerelle) {
    return { frais: 0, fraisSysteme: 0, commission: 0, tauxCommission: null, net: montant, libelle: LIBELLE_SANS_FRAIS_TEST, sansFrais: true };
  }
  return calculerFrais(montant, dest, grille);
}
function nomOperateur(o) {
  return o === "DMONEY" ? "D-Money" : "Waafi";
}
var NBSP = " ";
function nombre(n) {
  const neg = n < 0;
  const s2 = String(Math.abs(Math.round(n)));
  let out = "";
  for (let i = 0; i < s2.length; i++) {
    if (i > 0 && (s2.length - i) % 3 === 0) out += NBSP;
    out += s2.charAt(i);
  }
  return (neg ? "-" : "") + out;
}
function fdj(n) {
  return nombre(n) + NBSP + "FDJ";
}
var JOUR_MS = 24 * 60 * 60 * 1e3;
function normaliserNumero(saisie) {
  let chiffres = (saisie || "").replace(/\D/g, "");
  if (chiffres.length === 11 && chiffres.indexOf("253") === 0) chiffres = chiffres.substring(3);
  if (chiffres.length === 13 && chiffres.indexOf("00253") === 0) chiffres = chiffres.substring(5);
  return chiffres.length === 8 ? chiffres : null;
}
function grouperNumero(chiffres) {
  const c = (chiffres || "").replace(/\D/g, "").substring(0, 8);
  const parts = [];
  for (let i = 0; i < c.length; i += 2) parts.push(c.substring(i, i + 2));
  return parts.join(" ");
}
function formatNumero(chiffres) {
  if (!chiffres) return "—";
  const c = chiffres.replace(/\D/g, "");
  if (c.length !== 8) return chiffres;
  return ("+253 " + grouperNumero(c)).replace(/ /g, NBSP);
}
function emailValide(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email.trim());
}
function walletDisponible(w) {
  return w.statut === "ACTIF" && w.mode_echange !== null;
}
var Erreur = class extends Error {
  constructor(message) {
    super(message);
    this.name = "Erreur";
  }
};

// src/db.ts
var import_pg = require("pg");

// src/config.ts
var VERSION = "1.3.0";
var VERSION_SCHEMA = 4;
function drapeau(nom, defaut) {
  const v = (process.env[nom] || "").trim().toLowerCase();
  if (!v) return defaut;
  return !(v === "0" || v === "false" || v === "non" || v === "no" || v === "off");
}
var config = {
  port: Number(process.env.PORT || 1e4),
  databaseUrl: (process.env.DATABASE_URL || "").trim(),
  databaseCa: (process.env.DATABASE_CA_CERT || "").trim(),
  modeTest: drapeau("MODE_TEST", true),
  relaisUrl: (process.env.MAIL_RELAY_URL || "").trim(),
  relaisSecret: (process.env.MAIL_RELAY_SECRET || "").trim(),
  /** Multiplie les limites anti-abus (tests automatisés uniquement). */
  facteurLimites: Math.max(1, Number(process.env.LIMITES_FACTEUR || 1) || 1),
  /** Tests automatisés : ne supprime pas les comptes de test lors de la mise à jour de la base. */
  garderComptesTest: process.env.DJ_TEST_GARDER_COMPTES === "1",
  /** Décalage horaire de Djibouti (UTC+3, sans heure d'été), pour les références et dates affichées. */
  decalageMinutes: 180
};
function emailConfigure() {
  return !!(config.relaisUrl && config.relaisSecret);
}

// src/outils.ts
var crypto = __toESM(require("crypto"));
var ErreurHttp = class extends Error {
  constructor(statut, code, message) {
    super(message);
    this.statut = statut;
    this.code = code;
    this.name = "ErreurHttp";
  }
  statut;
  code;
};
var MSG_DROITS = "Vous n’avez pas les droits nécessaires pour cette action.";
function objet(v, nom = "requête") {
  if (!v || typeof v !== "object" || Array.isArray(v)) throw new Erreur("Données invalides (" + nom + ").");
  return v;
}
function entier(v, nom, min = -Number.MAX_SAFE_INTEGER, max = Number.MAX_SAFE_INTEGER) {
  const n = typeof v === "string" && /^-?\d+$/.test(v.trim()) ? Number(v) : v;
  if (typeof n !== "number" || !isFinite(n) || Math.floor(n) !== n || n < min || n > max) {
    throw new Erreur("Valeur invalide : " + nom + ".");
  }
  return n;
}
function entierOuNull(v, nom, min, max) {
  if (v === null || v === void 0 || v === "") return null;
  return entier(v, nom, min, max);
}
function nombre2(v, nom, min = -1e15, max = 1e15) {
  const n = typeof v === "string" && v.trim() !== "" ? Number(v) : v;
  if (typeof n !== "number" || !isFinite(n) || n < min || n > max) throw new Erreur("Valeur invalide : " + nom + ".");
  return n;
}
function texte(v, nom, max) {
  if (v === null || v === void 0) return "";
  if (typeof v !== "string") throw new Erreur("Valeur invalide : " + nom + ".");
  if (v.length > max) throw new Erreur("Texte trop long : " + nom + ".");
  if (/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/.test(v)) throw new Erreur("Caractères non autorisés : " + nom + ".");
  return v;
}
function booleen(v) {
  return v === true || v === 1 || v === "1" || v === "true";
}
function parmi(v, valeurs, nom) {
  if (typeof v !== "string" || valeurs.indexOf(v) < 0) throw new Erreur("Valeur invalide : " + nom + ".");
  return v;
}
function tableau(v, nom, max) {
  if (v === null || v === void 0) return [];
  if (!Array.isArray(v) || v.length > max) throw new Erreur("Liste invalide : " + nom + ".");
  return v;
}
var BASE64 = /^[A-Za-z0-9+/]*={0,2}$/;
function image(v, nom, maxCaracteres, mimes = ["image/jpeg", "image/png", "image/webp"]) {
  if (v === null || v === void 0) return null;
  const o = objet(v, nom);
  const base64 = typeof o.base64 === "string" ? o.base64.replace(/\s+/g, "") : "";
  const mime = typeof o.mime === "string" ? o.mime : "";
  if (base64.length < 100 || base64.length > maxCaracteres || base64.length % 4 !== 0 || !BASE64.test(base64)) {
    throw new Erreur("L’image jointe est invalide ou trop lourde.");
  }
  if (mimes.indexOf(mime) < 0) throw new Erreur("Format d’image non pris en charge.");
  const octets = Buffer.from(base64.substring(0, 24), "base64");
  const ok = mime === "image/png" ? octets[0] === 137 && octets[1] === 80 && octets[2] === 78 && octets[3] === 71 : mime === "image/jpeg" ? octets[0] === 255 && octets[1] === 216 : octets.toString("ascii", 0, 4) === "RIFF" && octets.toString("ascii", 8, 12) === "WEBP";
  if (!ok) throw new Erreur("Le fichier joint n’est pas une image valide.");
  return { base64, mime };
}
function aleaHex(octets) {
  return crypto.randomBytes(octets).toString("hex");
}
function aleaEntier(max) {
  return crypto.randomInt(0, max);
}
function sha256Hex(s2) {
  return crypto.createHash("sha256").update(s2, "utf8").digest("hex");
}
function egalConstant(a2, b) {
  const x = Buffer.from(String(a2), "utf8");
  const y = Buffer.from(String(b), "utf8");
  if (x.length !== y.length) {
    crypto.timingSafeEqual(x, x);
    return false;
  }
  return crypto.timingSafeEqual(x, y);
}
function pbkdf2Hex(motDePasse, selHex, iterations) {
  return new Promise((resolve, reject) => {
    if (!/^[0-9a-fA-F]*$/.test(selHex) || selHex.length % 2 !== 0) {
      reject(new Error("Sel invalide"));
      return;
    }
    crypto.pbkdf2(Buffer.from(motDePasse, "utf8"), Buffer.from(selHex, "hex"), iterations, 32, "sha256", (err, cle) => {
      if (err) reject(err);
      else resolve(cle.toString("hex"));
    });
  });
}
function jetonValide(j) {
  return typeof j === "string" && /^[0-9a-f]{64}$/.test(j);
}
function dateDjibouti(ms, decalageMinutes) {
  return new Date(ms + decalageMinutes * 6e4);
}

// src/db.ts
import_pg.types.setTypeParser(20, (v) => v === null ? null : Number(v));
import_pg.types.setTypeParser(1700, (v) => v === null ? null : Number(v));
var pool = null;
function local(url) {
  try {
    const h = new URL(url).hostname;
    return h === "localhost" || h === "127.0.0.1" || h === "::1";
  } catch (e) {
    return false;
  }
}
function ouvrirPool() {
  if (pool) return pool;
  const ssl = local(config.databaseUrl) ? false : config.databaseCa ? { rejectUnauthorized: true, ca: config.databaseCa.replace(/\\n/g, "\n") } : { rejectUnauthorized: false };
  pool = new import_pg.Pool({
    connectionString: config.databaseUrl,
    ssl,
    max: 5,
    idleTimeoutMillis: 3e4,
    connectionTimeoutMillis: 2e4
  });
  pool.on("error", (e) => {
    console.error("[base] connexion perdue :", e && e.message);
  });
  return pool;
}
async function fermerPool() {
  if (pool) {
    const p = pool;
    pool = null;
    await p.end();
  }
}
function convertir(sql) {
  let n = 0;
  return sql.replace(/\?/g, () => "$" + ++n);
}
function preparer(args) {
  return args.map((a2) => typeof a2 === "boolean" ? a2 ? 1 : 0 : a2);
}
async function executer(ex, sql, args) {
  const r = await ex.query(convertir(sql), args.length ? preparer(args) : void 0);
  return { rows: r.rows, rowCount: r.rowCount || 0 };
}
var Base = class {
  constructor(ex) {
    this.ex = ex;
  }
  ex;
  async lignes(sql, args = []) {
    return (await executer(this.ex, sql, args)).rows;
  }
  async ligne(sql, args = []) {
    const r = await executer(this.ex, sql, args);
    return r.rows.length ? r.rows[0] : null;
  }
  async valeur(sql, args = []) {
    const l = await this.ligne(sql, args);
    if (!l) return null;
    const cles = Object.keys(l);
    return cles.length ? l[cles[0]] : null;
  }
  /** Instruction de modification : rend le nombre de lignes touchées. */
  async exec(sql, args = []) {
    return (await executer(this.ex, sql, args)).rowCount;
  }
  /** Comme exec, mais exige qu'au moins une ligne soit touchée ; sinon l'erreur métier est levée (et la transaction annulée). */
  async exiger(sql, args, messageConflit) {
    const n = await this.exec(sql, args);
    if (n < 1) throw new Erreur(messageConflit);
    return n;
  }
  /** Insertion avec « RETURNING id » : rend l'identifiant créé. */
  async inserer(sql, args) {
    const r = await executer(this.ex, sql + " RETURNING id", args);
    return r.rows.length ? Number(r.rows[0].id) : 0;
  }
};
function base() {
  return new Base(ouvrirPool());
}
async function transaction(travail) {
  const client = await ouvrirPool().connect();
  let casse = false;
  try {
    await client.query("BEGIN");
    const resultat = await travail(new Base(client));
    await client.query("COMMIT");
    return resultat;
  } catch (e) {
    try {
      await client.query("ROLLBACK");
    } catch (e2) {
      casse = true;
    }
    throw e;
  } finally {
    client.release(casse ? new Error("connexion inutilisable") : void 0);
  }
}
function marques(n) {
  const m = [];
  for (let i = 0; i < n; i++) m.push("?");
  return m.join(", ");
}
function estDoublon(e) {
  return !!e && e.code === "23505";
}

// src/base.ts
var COLONNES_UTILISATEUR = "id, nom_complet, email, telephone, role, statut, email_verifie, date_creation, derniere_connexion";
function versUtilisateur(l) {
  return {
    id: l.id,
    nom_complet: l.nom_complet,
    email: l.email,
    telephone: l.telephone,
    role: l.role,
    statut: l.statut,
    email_verifie: l.email_verifie,
    date_creation: l.date_creation,
    derniere_connexion: l.derniere_connexion
  };
}
function exigerRole(acteur, roles) {
  if (!acteur || roles.indexOf(acteur.role) < 0 || acteur.statut !== "ACTIF") throw new ErreurHttp(403, "DROITS", MSG_DROITS);
  return acteur;
}
function estAdmin(u) {
  return !!u && (u.role === "ADMIN" || u.role === "SUPER_ADMIN");
}
var GRILLE_DEFAUT = {
  tranches: [{ max: 1e3, type: "FIXE", valeur: 10 }, { max: null, type: "POURCENTAGE", valeur: 1 }]
};
var DEFAUTS = {
  montantMin: 100,
  montantMax: 5e5,
  codeValiditeMinutes: 10,
  codeRenvoiSecondes: 90,
  connexionMaxTentatives: 5,
  connexionVerrouillageMinutes: 5,
  contactSupport: "",
  passerelleMontantAuto: 500,
  passerelleDelaiSecondes: 120,
  passerelleSansFrais: 1
};
var CLES = {
  montantMin: "montant_min",
  montantMax: "montant_max",
  codeValiditeMinutes: "code_validite_minutes",
  codeRenvoiSecondes: "code_renvoi_secondes",
  connexionMaxTentatives: "connexion_max_tentatives",
  connexionVerrouillageMinutes: "connexion_verrouillage_minutes",
  contactSupport: "contact_support",
  passerelleMontantAuto: "passerelle_montant_auto",
  passerelleDelaiSecondes: "passerelle_delai_secondes",
  passerelleSansFrais: "passerelle_sans_frais"
};
var BORNES = {
  montantMin: [1, 1e9],
  montantMax: [2, 1e9],
  codeValiditeMinutes: [2, 60],
  codeRenvoiSecondes: [30, 3600],
  connexionMaxTentatives: [3, 20],
  connexionVerrouillageMinutes: [1, 1440],
  passerelleMontantAuto: [0, 1e9],
  passerelleDelaiSecondes: [0, 86400],
  passerelleSansFrais: [0, 1]
};
var cache = null;
var DUREE_CACHE = 30 * 1e3;
function invaliderParametres() {
  cache = null;
}
async function chargerParametres(b = base(), forcer = false) {
  const t = Date.now();
  if (cache && !forcer && t - cache.quand < DUREE_CACHE) return cache.valeur;
  const lignes = await b.lignes("SELECT cle, valeur FROM parametres");
  const brut = {};
  lignes.forEach((l) => {
    brut[l.cle] = l.valeur;
  });
  const p = { grille: await chargerGrille(b) };
  Object.keys(CLES).forEach((nom) => {
    const valeur = brut[CLES[nom]];
    if (nom === "contactSupport") {
      p[nom] = valeur == null ? DEFAUTS[nom] : valeur;
    } else {
      const n = valeur == null ? NaN : Number(valeur);
      p[nom] = isFinite(n) ? n : DEFAUTS[nom];
    }
  });
  cache = { valeur: p, quand: t };
  return cache.valeur;
}
async function chargerGrille(b) {
  const lignes = await b.lignes(
    "SELECT montant_max, type_frais, valeur FROM tranches_frais ORDER BY montant_max IS NULL, montant_max"
  );
  if (!lignes.length) return GRILLE_DEFAUT;
  return { tranches: lignes.map((l) => ({ max: l.montant_max == null ? null : Number(l.montant_max), type: l.type_frais, valeur: Number(l.valeur) })) };
}
function lireGrille(v) {
  const o = objet(v, "grille");
  const tranches = tableau(o.tranches, "tranches", 50).map((x, i) => {
    const t = objet(x, "tranche " + (i + 1));
    const tranche = {
      max: t.max === null || t.max === void 0 ? null : entier(t.max, "montant maximum", -1e12, 1e12),
      type: parmi(t.type, ["FIXE", "POURCENTAGE"], "type de frais"),
      valeur: nombre2(t.valeur, "valeur des frais", -1e12, 1e12)
    };
    return tranche;
  });
  return { tranches };
}
async function enregistrerParametres(acteur, modifsBrutes) {
  exigerRole(acteur, ["SUPER_ADMIN"]);
  const brutes = objet(modifsBrutes, "paramètres");
  const modifs = {};
  Object.keys(brutes).forEach((cle) => {
    if (cle === "grille") {
      modifs.grille = lireGrille(brutes.grille);
    } else if (cle === "contactSupport") {
      modifs.contactSupport = texte(brutes.contactSupport, "contact du support", 200).trim();
    } else if (cle in BORNES) {
      const k = cle;
      modifs[k] = entier(brutes[k], cle, BORNES[k][0], BORNES[k][1]);
    } else {
      throw new Erreur("Paramètre inconnu : " + cle + ".");
    }
  });
  const actuels = await chargerParametres(base(), true);
  const p = Object.assign({}, actuels, modifs);
  if (!(p.montantMin >= 1) || !(p.montantMax > p.montantMin) || Math.floor(p.montantMin) !== p.montantMin || Math.floor(p.montantMax) !== p.montantMax) {
    throw new Erreur("Les montants minimum et maximum sont invalides.");
  }
  const erreur = erreurGrille(p.grille, p.montantMin);
  if (erreur) throw new Erreur(erreur);
  const t = Date.now();
  await transaction(async (tx) => {
    if (modifs.grille) {
      await tx.exec("DELETE FROM tranches_frais");
      for (const tr of p.grille.tranches) {
        await tx.exec("INSERT INTO tranches_frais (montant_max, type_frais, valeur, date_maj) VALUES (?, ?, ?, ?)", [tr.max, tr.type, tr.valeur, t]);
      }
    }
    for (const nom of Object.keys(modifs)) {
      if (nom === "grille") continue;
      await tx.exec(
        "INSERT INTO parametres (cle, valeur) VALUES (?, ?) ON CONFLICT (cle) DO UPDATE SET valeur = EXCLUDED.valeur",
        [CLES[nom], String(p[nom])]
      );
    }
    await journaliser(tx, acteur.id, "PARAMETRES", "Frais : " + descriptionGrille(p.grille) + " ; montants de " + nombre(p.montantMin) + " à " + fdj(p.montantMax) + " ; passerelle : " + fdj(p.passerelleMontantAuto) + " sans accord, " + p.passerelleDelaiSecondes + " s entre deux demandes, " + (p.passerelleSansFrais ? "sans frais" : "frais habituels"));
  });
  invaliderParametres();
}
async function journaliser(b, utilisateurId, action, details) {
  await b.exec(
    "INSERT INTO journal_activite (utilisateur_id, action, details, date_creation) VALUES (?, ?, ?, ?)",
    [utilisateurId, action, details.substring(0, 2e3), Date.now()]
  );
}
async function listerJournal(acteur, limiteBrute) {
  exigerRole(acteur, ["SUPER_ADMIN"]);
  const limite = limiteBrute == null ? 200 : entier(limiteBrute, "limite", 1, 1e3);
  return base().lignes(
    "SELECT j.id, j.action, j.details, j.date_creation, u.nom_complet AS auteur, u.role AS role FROM journal_activite j LEFT JOIN utilisateurs u ON u.id = j.utilisateur_id ORDER BY j.id DESC LIMIT ?",
    [limite]
  );
}
async function notifier(b, utilisateurId, type, titre, message, demandeId = null, walletId = null) {
  await b.exec(
    "INSERT INTO notifications (utilisateur_id, type, titre, message, demande_id, wallet_id, lu, date_creation) VALUES (?, ?, ?, ?, ?, ?, 0, ?)",
    [utilisateurId, type, titre, message, demandeId, walletId, Date.now()]
  );
}
async function notifierAdmins(b, type, titre, message, demandeId = null, walletId = null) {
  await b.exec(
    "INSERT INTO notifications (utilisateur_id, type, titre, message, demande_id, wallet_id, lu, date_creation) SELECT id, ?::text, ?::text, ?::text, ?::bigint, ?::bigint, 0, ?::bigint FROM utilisateurs WHERE role IN ('ADMIN', 'SUPER_ADMIN') AND statut = 'ACTIF'",
    [type, titre, message, demandeId, walletId, Date.now()]
  );
}
var COLONNES_NOTIFICATION = "id, utilisateur_id, type, titre, message, demande_id, wallet_id, lu, date_creation";
async function mesNotifications(acteur, limiteBrute) {
  const limite = limiteBrute == null ? 100 : entier(limiteBrute, "limite", 1, 500);
  return base().lignes(
    "SELECT " + COLONNES_NOTIFICATION + " FROM notifications WHERE utilisateur_id = ? ORDER BY id DESC LIMIT ?",
    [acteur.id, limite]
  );
}
async function nombreNonLues(acteur) {
  return Number(await base().valeur("SELECT COUNT(*) AS n FROM notifications WHERE utilisateur_id = ? AND lu = 0", [acteur.id])) || 0;
}
async function marquerNotificationsLues(acteur, idBrut) {
  if (idBrut != null) {
    const id = entier(idBrut, "notification", 1);
    await base().exec("UPDATE notifications SET lu = 1 WHERE utilisateur_id = ? AND id = ?", [acteur.id, id]);
  } else {
    await base().exec("UPDATE notifications SET lu = 1 WHERE utilisateur_id = ? AND lu = 0", [acteur.id]);
  }
}
async function supprimerNotifications(acteur) {
  await base().exec("DELETE FROM notifications WHERE utilisateur_id = ?", [acteur.id]);
}
async function notificationsAPresenter(acteur) {
  const lignes = await base().lignes(
    "UPDATE notifications SET pousse = 1 WHERE id IN (SELECT id FROM notifications WHERE utilisateur_id = ? AND pousse = 0 ORDER BY id LIMIT 50 FOR UPDATE SKIP LOCKED) RETURNING id, titre, message, lu",
    [acteur.id]
  );
  return lignes.sort((a2, b) => a2.id - b.id);
}

// src/email.ts
async function envoyerCodeEmail(type, email, nom, code, minutes) {
  if (!emailConfigure()) return { ok: false, erreur: "Envoi des e-mails non configuré sur le serveur." };
  if (!/^\d{6}$/.test(code)) return { ok: false, erreur: "Code invalide." };
  try {
    const controleur = new AbortController();
    const minuteur = setTimeout(() => controleur.abort(), 25e3);
    let reponse;
    try {
      reponse = await fetch(config.relaisUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ secret: config.relaisSecret, type, to: email, nom, code, minutes }),
        redirect: "follow",
        signal: controleur.signal
      });
    } finally {
      clearTimeout(minuteur);
    }
    const corps = await reponse.text();
    let res = null;
    try {
      res = JSON.parse(corps);
    } catch (e) {
      console.error("[e-mail] réponse illisible du relais (HTTP " + reponse.status + ")");
      return { ok: false, erreur: "Le relais d’e-mails ne répond pas correctement." };
    }
    if (!res || res.ok !== true) {
      console.error("[e-mail] refus du relais :", res && res.error);
      return { ok: false, erreur: "Le relais d’e-mails a refusé l’envoi." };
    }
    return { ok: true };
  } catch (e) {
    console.error("[e-mail] relais injoignable :", e instanceof Error ? e.message : String(e));
    return { ok: false, erreur: "Le relais d’e-mails est injoignable." };
  }
}

// src/limites.ts
var Fenetre = class {
  constructor(max, dureeMs) {
    this.max = max;
    this.dureeMs = dureeMs;
  }
  max;
  dureeMs;
  compteurs = /* @__PURE__ */ new Map();
  /** Compte une requête ; rend faux si la limite est dépassée. */
  essayer(cle, maintenant = Date.now()) {
    const max = this.max * config.facteurLimites;
    let c = this.compteurs.get(cle);
    if (!c || maintenant - c.debut >= this.dureeMs) {
      c = { debut: maintenant, n: 0 };
      this.compteurs.set(cle, c);
    }
    c.n++;
    return c.n <= max;
  }
  nettoyer(maintenant = Date.now()) {
    this.compteurs.forEach((c, cle) => {
      if (maintenant - c.debut >= this.dureeMs) this.compteurs.delete(cle);
    });
  }
};
var MINUTE = 60 * 1e3;
var GROUPES = {
  // Toutes les requêtes : 600 par tranche de 5 minutes et par adresse.
  tout: { parIp: new Fenetre(600, 5 * MINUTE), global: new Fenetre(2e4, 5 * MINUTE) },
  // Connexion (mot de passe ou empreinte).
  connexion: { parIp: new Fenetre(30, 15 * MINUTE), global: new Fenetre(300, 5 * MINUTE) },
  // Création de compte.
  inscription: { parIp: new Fenetre(10, 60 * MINUTE), global: new Fenetre(200, 60 * MINUTE) },
  // Envoi d'un e-mail (code d'inscription, mot de passe oublié).
  envoi: { parIp: new Fenetre(10, 60 * MINUTE), global: new Fenetre(90, 60 * MINUTE) },
  // Saisie d'un code reçu par e-mail.
  code: { parIp: new Fenetre(30, 15 * MINUTE), global: new Fenetre(300, 15 * MINUTE) }
};
function autoriser(groupe, ip) {
  const g = GROUPES[groupe];
  if (!g) return true;
  const okIp = g.parIp.essayer(ip);
  const okGlobal = g.global.essayer("*");
  return okIp && okGlobal;
}
setInterval(() => {
  Object.keys(GROUPES).forEach((k) => {
    GROUPES[k].parIp.nettoyer();
    GROUPES[k].global.nettoyer();
  });
}, 10 * MINUTE).unref();
var envoisFictifs = /* @__PURE__ */ new Map();
function noterEnvoiFictif(cle, quand = Date.now()) {
  envoisFictifs.set(cle, quand);
  if (envoisFictifs.size > 5e3) {
    const limite = quand - 60 * MINUTE;
    envoisFictifs.forEach((t, k) => {
      if (t < limite) envoisFictifs.delete(k);
    });
  }
}
function dernierEnvoiFictif(cle) {
  const t = envoisFictifs.get(cle);
  return t == null ? null : t;
}

// src/auth.ts
var ITERATIONS = 31e4;
var LONGUEUR_MIN_MOT_DE_PASSE = 8;
var LONGUEUR_MAX_MOT_DE_PASSE = 128;
var DUREE_SESSION_COURTE = 12 * 60 * 60 * 1e3;
var DUREE_SESSION_LONGUE = 30 * 24 * 60 * 60 * 1e3;
var DELAI_CHANGEMENT_OBLIGATOIRE = 30 * 60 * 1e3;
var MAX_ESSAIS_CODE = 5;
var MAX_ACCES_EMPREINTE = 5;
var SEL_FACTICE = "6a8f1c0e4b2d7a9531c6e0f2b4d8a7c3";
var MESSAGE_IDENTIFIANTS = "E-mail ou mot de passe incorrect.";
var COLONNES_SECRETES = COLONNES_UTILISATEUR + ", mot_de_passe_hash, sel, iterations, tentatives_echouees, verrouille_jusqua, doit_changer_mdp";
function nettoyerEmail(v) {
  return texte(v, "e-mail", 254).trim().toLowerCase();
}
async function ligneParEmail(b, email) {
  return b.ligne("SELECT " + COLONNES_SECRETES + " FROM utilisateurs WHERE lower(email) = lower(?)", [email.trim()]);
}
async function ligneParId(b, id, verrouiller = false) {
  return b.ligne("SELECT " + COLONNES_SECRETES + " FROM utilisateurs WHERE id = ?" + (verrouiller ? " FOR UPDATE" : ""), [id]);
}
async function utilisateurParId(id) {
  const l = await base().ligne("SELECT " + COLONNES_UTILISATEUR + " FROM utilisateurs WHERE id = ?", [id]);
  return l ? versUtilisateur(l) : null;
}
function lireMotDePasse(v, nom = "mot de passe") {
  if (v === null || v === void 0) return "";
  if (typeof v !== "string" || v.length > 1024) throw new Erreur("Valeur invalide : " + nom + ".");
  return v;
}
function validerNouveauMotDePasse(mdp) {
  if (!mdp || mdp.length < LONGUEUR_MIN_MOT_DE_PASSE) {
    throw new Erreur("Le mot de passe doit contenir au moins " + LONGUEUR_MIN_MOT_DE_PASSE + " caractères.");
  }
  if (mdp.length > LONGUEUR_MAX_MOT_DE_PASSE) throw new Erreur("Le mot de passe est trop long.");
  if (/^(.)\1+$/.test(mdp) || /^(?:12345678|123456789|1234567890|00000000|azertyui|password|motdepasse)$/i.test(mdp)) {
    throw new Erreur("Ce mot de passe est trop simple. Choisissez-en un autre.");
  }
}
async function nouveauHachage(mdp) {
  const sel = aleaHex(16);
  return { hash: await pbkdf2Hex(mdp, sel, ITERATIONS), sel, iterations: ITERATIONS };
}
async function motDePasseCorrect(l, mdp) {
  const it = Math.max(1e3, Math.min(5e6, Number(l.iterations) || 12e4));
  return egalConstant(await pbkdf2Hex(mdp, l.sel, it), l.mot_de_passe_hash);
}
function messageVerrou(jusqua, t) {
  const minutes = Math.max(1, Math.ceil((jusqua - t) / 6e4));
  return "Trop de tentatives. Réessayez dans " + minutes + " minute" + (minutes > 1 ? "s" : "") + ".";
}
async function verifierAvecTentatives(l, mdp, messageEchec, avecRestant) {
  const p = await chargerParametres();
  const t = Date.now();
  const r = await base().ligne(
    "UPDATE utilisateurs SET tentatives_echouees = CASE WHEN verrouille_jusqua IS NOT NULL AND verrouille_jusqua <= ? THEN 1 ELSE tentatives_echouees + 1 END, verrouille_jusqua = CASE WHEN verrouille_jusqua IS NOT NULL AND verrouille_jusqua <= ? THEN NULL ELSE verrouille_jusqua END WHERE id = ? AND (verrouille_jusqua IS NULL OR verrouille_jusqua <= ?) RETURNING tentatives_echouees AS n, verrouille_jusqua AS verrou",
    [t, t, l.id, t]
  );
  if (!r) {
    const v = Number(await base().valeur("SELECT verrouille_jusqua FROM utilisateurs WHERE id = ?", [l.id])) || t + 6e4;
    throw new Erreur(messageVerrou(v, t));
  }
  const max = p.connexionMaxTentatives;
  const verrouJusqua = t + p.connexionVerrouillageMinutes * 6e4;
  if (r.n > max) {
    await base().exec("UPDATE utilisateurs SET tentatives_echouees = 0, verrouille_jusqua = ? WHERE id = ?", [verrouJusqua, l.id]);
    throw new Erreur(messageVerrou(verrouJusqua, t));
  }
  if (await motDePasseCorrect(l, mdp)) {
    await base().exec("UPDATE utilisateurs SET tentatives_echouees = 0, verrouille_jusqua = NULL WHERE id = ?", [l.id]);
    return;
  }
  if (r.n >= max) {
    await transaction(async (tx) => {
      await tx.exec("UPDATE utilisateurs SET tentatives_echouees = 0, verrouille_jusqua = ? WHERE id = ?", [verrouJusqua, l.id]);
      await journaliser(tx, l.id, "VERROUILLAGE", "Compte verrouillé " + p.connexionVerrouillageMinutes + " min après " + r.n + " échecs de connexion");
    });
    throw new Erreur("Trop de tentatives. Votre compte est verrouillé pendant " + p.connexionVerrouillageMinutes + " minutes.");
  }
  const restant = max - r.n;
  throw new Erreur(messageEchec + (avecRestant && restant <= 2 ? " Il vous reste " + restant + " tentative" + (restant > 1 ? "s" : "") + "." : ""));
}
async function ouvrirSession(b, utilisateurId, seSouvenir) {
  const jeton = aleaHex(32);
  const t = Date.now();
  await b.exec(
    "INSERT INTO sessions (utilisateur_id, jeton_hash, se_souvenir, date_creation, date_expiration) VALUES (?, ?, ?, ?, ?)",
    [utilisateurId, sha256Hex(jeton), seSouvenir ? 1 : 0, t, t + (seSouvenir ? DUREE_SESSION_LONGUE : DUREE_SESSION_COURTE)]
  );
  return jeton;
}
async function lireSession(jeton) {
  if (!jetonValide(jeton)) return { refus: "Votre session a expiré. Reconnectez-vous." };
  const l = await base().ligne(
    "SELECT s.id AS session_id, s.se_souvenir AS se_souvenir, s.date_creation AS session_creation, s.date_expiration AS date_expiration, u.id AS id, u.nom_complet AS nom_complet, u.email AS email, u.telephone AS telephone, u.role AS role, u.statut AS statut, u.email_verifie AS email_verifie, u.date_creation AS date_creation, u.derniere_connexion AS derniere_connexion, u.doit_changer_mdp AS doit_changer_mdp FROM sessions s JOIN utilisateurs u ON u.id = s.utilisateur_id WHERE s.jeton_hash = ?",
    [sha256Hex(jeton)]
  );
  if (!l) return { refus: "Votre session a expiré. Reconnectez-vous." };
  if (l.date_expiration < Date.now() || l.statut !== "ACTIF" || !l.email_verifie) {
    await base().exec("DELETE FROM sessions WHERE id = ?", [l.session_id]);
    return { refus: l.statut !== "ACTIF" ? "Votre compte est bloqué. Contactez l’administrateur." : "Votre session a expiré. Reconnectez-vous." };
  }
  return {
    acteur: versUtilisateur(l),
    session: { id: l.session_id, seSouvenir: !!l.se_souvenir, dateCreation: l.session_creation, doitChanger: !!l.doit_changer_mdp }
  };
}
async function seDeconnecter(session) {
  await base().exec("DELETE FROM sessions WHERE id = ?", [session.id]);
}
async function nettoyerExpirees() {
  const t = Date.now();
  const jour = 24 * 3600 * 1e3;
  await base().exec("DELETE FROM sessions WHERE date_expiration < ?", [t]);
  await base().exec("DELETE FROM codes_verification WHERE date_creation < ?", [t - 7 * jour]);
  await base().exec("DELETE FROM acces_biometriques WHERE COALESCE(derniere_utilisation, date_creation) < ?", [t - 180 * jour]);
}
async function seConnecter(args) {
  const email = nettoyerEmail(args.email);
  const motDePasse = lireMotDePasse(args.motDePasse);
  const seSouvenir = booleen(args.seSouvenir);
  if (!emailValide(email)) throw new Erreur("Saisissez une adresse e-mail valide.");
  if (!motDePasse) throw new Erreur("Saisissez votre mot de passe.");
  const l = await ligneParEmail(base(), email);
  if (!l) {
    await pbkdf2Hex(motDePasse, SEL_FACTICE, ITERATIONS);
    throw new Erreur(MESSAGE_IDENTIFIANTS);
  }
  await verifierAvecTentatives(l, motDePasse, MESSAGE_IDENTIFIANTS, true);
  if (l.statut !== "ACTIF") throw new Erreur("Votre compte est bloqué. Contactez l’administrateur.");
  if (!l.email_verifie) {
    let envoi;
    try {
      envoi = await envoyerCode(l.id, l.email, l.nom_complet, "INSCRIPTION");
    } catch (e) {
      envoi = { envoye: true };
    }
    return { type: "VERIFICATION", email: l.email, envoi };
  }
  const t = Date.now();
  const renforce = Number(l.iterations) < ITERATIONS ? await nouveauHachage(motDePasse) : null;
  const jeton = await transaction(async (tx) => {
    if (renforce) {
      await tx.exec("UPDATE utilisateurs SET mot_de_passe_hash = ?, sel = ?, iterations = ? WHERE id = ?", [renforce.hash, renforce.sel, renforce.iterations, l.id]);
    }
    await tx.exec("UPDATE utilisateurs SET tentatives_echouees = 0, verrouille_jusqua = NULL, derniere_connexion = ? WHERE id = ?", [t, l.id]);
    await journaliser(tx, l.id, "CONNEXION", "Connexion réussie");
    return ouvrirSession(tx, l.id, seSouvenir);
  });
  const u = versUtilisateur(l);
  return { type: "OK", utilisateur: u, jeton, seSouvenir, doitChangerMdp: !!l.doit_changer_mdp };
}
function empreinteCode(utilisateurId, type, code) {
  return sha256Hex("dj-wallet-exchange|" + utilisateurId + "|" + type + "|" + code);
}
function messagePatientez(secondes) {
  return "Un code vient d’être envoyé. Patientez " + secondes + " s avant d’en demander un nouveau.";
}
async function envoyerCode(utilisateurId, email, nom, type) {
  const p = await chargerParametres();
  const code = String(aleaEntier(1e6)).padStart(6, "0");
  await transaction(async (tx) => {
    await tx.exec("SELECT id FROM utilisateurs WHERE id = ? FOR UPDATE", [utilisateurId]);
    const t = Date.now();
    const dernier = await tx.valeur(
      "SELECT date_creation FROM codes_verification WHERE utilisateur_id = ? AND type = ? ORDER BY id DESC LIMIT 1",
      [utilisateurId, type]
    );
    if (dernier != null && t - dernier < p.codeRenvoiSecondes * 1e3) {
      throw new Erreur(messagePatientez(Math.ceil((p.codeRenvoiSecondes * 1e3 - (t - dernier)) / 1e3)));
    }
    await tx.exec("UPDATE codes_verification SET utilise = 1 WHERE utilisateur_id = ? AND type = ? AND utilise = 0", [utilisateurId, type]);
    await tx.exec(
      "INSERT INTO codes_verification (utilisateur_id, type, code_hash, expire_le, tentatives, utilise, date_creation) VALUES (?, ?, ?, ?, 0, 0, ?)",
      [utilisateurId, type, empreinteCode(utilisateurId, type, code), t + p.codeValiditeMinutes * 6e4, t]
    );
  });
  const envoi = await envoyerCodeEmail(type, email, nom, code, p.codeValiditeMinutes);
  if (envoi.ok) return { envoye: true };
  const res = { envoye: false, erreur: envoi.erreur || "Envoi impossible." };
  if (config.modeTest && type === "INSCRIPTION") res.codeTest = code;
  return res;
}
async function envoiFictif(email, type) {
  const p = await chargerParametres();
  const cle = type + "|" + email.toLowerCase();
  const t = Date.now();
  const dernier = dernierEnvoiFictif(cle);
  if (dernier != null && t - dernier < p.codeRenvoiSecondes * 1e3) {
    throw new Erreur(messagePatientez(Math.ceil((p.codeRenvoiSecondes * 1e3 - (t - dernier)) / 1e3)));
  }
  noterEnvoiFictif(cle, t);
  if (!emailConfigure()) return { envoye: false, erreur: "Envoi des e-mails non configuré sur le serveur." };
  return { envoye: true };
}
function lireType(v) {
  return parmi(v, ["INSCRIPTION", "REINITIALISATION"], "type de code");
}
async function delaiRenvoi(args) {
  const email = nettoyerEmail(args.email);
  const type = lireType(args.type);
  const p = await chargerParametres();
  const l = await base().ligne(
    "SELECT c.date_creation AS date_creation FROM codes_verification c JOIN utilisateurs u ON u.id = c.utilisateur_id WHERE lower(u.email) = lower(?) AND c.type = ? ORDER BY c.id DESC LIMIT 1",
    [email, type]
  );
  const dernier = l ? l.date_creation : dernierEnvoiFictif(type + "|" + email);
  if (dernier == null) return 0;
  const reste = p.codeRenvoiSecondes * 1e3 - (Date.now() - dernier);
  return reste > 0 ? Math.ceil(reste / 1e3) : 0;
}
async function renvoyerCode(args) {
  const email = nettoyerEmail(args.email);
  const type = lireType(args.type);
  if (!emailValide(email)) throw new Erreur("Saisissez une adresse e-mail valide.");
  const l = await ligneParEmail(base(), email);
  if (!l || l.statut !== "ACTIF" || type === "INSCRIPTION" && l.email_verifie) return envoiFictif(email, type);
  return envoyerCode(l.id, l.email, l.nom_complet, type);
}
async function consommerCode(utilisateurId, type, codeBrut) {
  const code = texte(codeBrut, "code", 20).replace(/\D/g, "");
  if (code.length !== 6) throw new Erreur("Saisissez le code à 6 chiffres reçu par e-mail.");
  const erreur = await transaction(async (tx) => {
    const l = await tx.ligne(
      "SELECT id, code_hash, expire_le, tentatives FROM codes_verification WHERE utilisateur_id = ? AND type = ? AND utilise = 0 ORDER BY id DESC LIMIT 1 FOR UPDATE",
      [utilisateurId, type]
    );
    if (!l) return "Aucun code en attente. Demandez un nouveau code.";
    if (l.expire_le < Date.now()) return "Ce code a expiré. Demandez un nouveau code.";
    if (l.tentatives >= MAX_ESSAIS_CODE) return "Trop d’essais. Demandez un nouveau code.";
    if (!egalConstant(empreinteCode(utilisateurId, type, code), l.code_hash)) {
      await tx.exec("UPDATE codes_verification SET tentatives = tentatives + 1 WHERE id = ?", [l.id]);
      const restant = MAX_ESSAIS_CODE - (l.tentatives + 1);
      return restant > 0 ? "Code incorrect. Il vous reste " + restant + " essai" + (restant > 1 ? "s" : "") + "." : "Code incorrect. Demandez un nouveau code.";
    }
    await tx.exec("UPDATE codes_verification SET utilise = 1 WHERE id = ?", [l.id]);
    return null;
  });
  if (erreur) throw new Erreur(erreur);
}
function nettoyerNom(v, message) {
  const nom = texte(v, "nom", 200).trim().replace(/\s+/g, " ");
  if (nom.length < 2) throw new Erreur(message);
  if (nom.length > 60) throw new Erreur("Le nom est trop long.");
  if (/[<>{}\[\]\\/@#$%^*=|~`"]/.test(nom)) throw new Erreur("Le nom contient des caractères non autorisés.");
  return nom;
}
async function inscrire(args) {
  const nom = nettoyerNom(args.nom, "Saisissez votre nom complet.");
  const email = nettoyerEmail(args.email);
  const motDePasse = lireMotDePasse(args.motDePasse);
  if (!emailValide(email)) throw new Erreur("Saisissez une adresse e-mail valide.");
  validerNouveauMotDePasse(motDePasse);
  const existant = await ligneParEmail(base(), email);
  if (existant && existant.email_verifie) throw new Erreur("Un compte existe déjà avec cette adresse e-mail.");
  let id;
  if (existant) {
    if (!await motDePasseCorrect(existant, motDePasse)) {
      throw new Erreur("Une inscription est déjà en attente pour cette adresse e-mail. Saisissez le code reçu, ou utilisez « Mot de passe oublié » depuis l’écran de connexion.");
    }
    await base().exec("UPDATE utilisateurs SET nom_complet = ? WHERE id = ?", [nom, existant.id]);
    id = existant.id;
  } else {
    const h = await nouveauHachage(motDePasse);
    try {
      id = await transaction(async (tx) => {
        const nouvelId = await tx.inserer(
          "INSERT INTO utilisateurs (nom_complet, email, mot_de_passe_hash, sel, iterations, role, statut, email_verifie, date_creation) VALUES (?, ?, ?, ?, ?, 'UTILISATEUR', 'ACTIF', 0, ?)",
          [nom, email, h.hash, h.sel, h.iterations, Date.now()]
        );
        await journaliser(tx, nouvelId, "INSCRIPTION", "Création du compte " + email);
        return nouvelId;
      });
    } catch (e) {
      if (estDoublon(e)) throw new Erreur("Un compte existe déjà avec cette adresse e-mail.");
      throw e;
    }
  }
  let envoi;
  try {
    envoi = await envoyerCode(id, email, nom, "INSCRIPTION");
  } catch (e) {
    envoi = { envoye: true };
  }
  return { email, envoi };
}
async function confirmerEmail(args) {
  const email = nettoyerEmail(args.email);
  const l = await ligneParEmail(base(), email);
  if (!l || l.statut !== "ACTIF") throw new Erreur("Code incorrect ou expiré.");
  if (l.email_verifie) return;
  await consommerCode(l.id, "INSCRIPTION", args.code);
  await transaction(async (tx) => {
    await tx.exec("UPDATE utilisateurs SET email_verifie = 1 WHERE id = ?", [l.id]);
    await journaliser(tx, l.id, "EMAIL_VERIFIE", "Adresse e-mail confirmée");
  });
}
async function demanderReinitialisation(args) {
  const email = nettoyerEmail(args.email);
  if (!emailValide(email)) throw new Erreur("Saisissez une adresse e-mail valide.");
  const l = await ligneParEmail(base(), email);
  if (!l || l.statut !== "ACTIF") return envoiFictif(email, "REINITIALISATION");
  return envoyerCode(l.id, l.email, l.nom_complet, "REINITIALISATION");
}
async function reinitialiserMotDePasse(args) {
  const email = nettoyerEmail(args.email);
  const nouveau = lireMotDePasse(args.nouveau, "nouveau mot de passe");
  validerNouveauMotDePasse(nouveau);
  const l = await ligneParEmail(base(), email);
  if (!l || l.statut !== "ACTIF") throw new Erreur("Code incorrect ou expiré.");
  await consommerCode(l.id, "REINITIALISATION", args.code);
  const h = await nouveauHachage(nouveau);
  await transaction(async (tx) => {
    await tx.exec("UPDATE utilisateurs SET mot_de_passe_hash = ?, sel = ?, iterations = ?, tentatives_echouees = 0, verrouille_jusqua = NULL, email_verifie = 1, doit_changer_mdp = 0 WHERE id = ?", [h.hash, h.sel, h.iterations, l.id]);
    await tx.exec("DELETE FROM sessions WHERE utilisateur_id = ?", [l.id]);
    await tx.exec("DELETE FROM acces_biometriques WHERE utilisateur_id = ?", [l.id]);
    await journaliser(tx, l.id, "MOT_DE_PASSE", "Mot de passe réinitialisé par e-mail");
  });
}
async function remplacerMotDePasse(acteur, session, nouveau, details) {
  const h = await nouveauHachage(nouveau);
  await transaction(async (tx) => {
    await tx.exec(
      "UPDATE utilisateurs SET mot_de_passe_hash = ?, sel = ?, iterations = ?, doit_changer_mdp = 0 WHERE id = ?",
      [h.hash, h.sel, h.iterations, acteur.id]
    );
    await tx.exec("DELETE FROM acces_biometriques WHERE utilisateur_id = ?", [acteur.id]);
    await tx.exec("DELETE FROM sessions WHERE utilisateur_id = ? AND id <> ?", [acteur.id, session.id]);
    await journaliser(tx, acteur.id, "MOT_DE_PASSE", details);
  });
}
async function changerMotDePasse(acteur, session, args) {
  const ancien = lireMotDePasse(args.ancien, "mot de passe actuel");
  const nouveau = lireMotDePasse(args.nouveau, "nouveau mot de passe");
  const l = await ligneParId(base(), acteur.id);
  if (!l) throw new Erreur("Compte introuvable.");
  await verifierAvecTentatives(l, ancien, "Le mot de passe actuel est incorrect.", false);
  validerNouveauMotDePasse(nouveau);
  if (nouveau === ancien) throw new Erreur("Le nouveau mot de passe doit être différent de l’ancien.");
  await remplacerMotDePasse(acteur, session, nouveau, "Mot de passe modifié");
}
async function motDePasseObligatoire(acteur, session, args) {
  if (!session.doitChanger) throw new Erreur("Votre mot de passe a déjà été choisi.");
  if (Date.now() - session.dateCreation > DELAI_CHANGEMENT_OBLIGATOIRE) {
    throw new ErreurHttp(401, "SESSION", "Pour votre sécurité, reconnectez-vous avec votre mot de passe temporaire.");
  }
  const nouveau = lireMotDePasse(args.nouveau, "nouveau mot de passe");
  validerNouveauMotDePasse(nouveau);
  const l = await ligneParId(base(), acteur.id);
  if (!l) throw new Erreur("Compte introuvable.");
  if (await motDePasseCorrect(l, nouveau)) throw new Erreur("Choisissez un mot de passe différent du mot de passe temporaire.");
  await remplacerMotDePasse(acteur, session, nouveau, "Mot de passe temporaire remplacé");
}
async function majProfil(acteur, args) {
  const nom = nettoyerNom(args.nom, "Saisissez votre nom complet.");
  const brut = texte(args.telephone, "téléphone", 30).trim();
  let telephone = null;
  if (brut) {
    telephone = normaliserNumero(brut);
    if (!telephone) throw new Erreur("Le numéro de téléphone doit contenir 8 chiffres.");
  }
  await base().exec("UPDATE utilisateurs SET nom_complet = ?, telephone = ? WHERE id = ?", [nom, telephone, acteur.id]);
  const u = await utilisateurParId(acteur.id);
  if (!u) throw new Erreur("Compte introuvable.");
  return u;
}
async function listerComptes(acteur, args) {
  exigerRole(acteur, ["SUPER_ADMIN"]);
  const roles = tableau(args.roles, "rôles", 3).map((r) => parmi(r, ["UTILISATEUR", "ADMIN", "SUPER_ADMIN"], "rôle"));
  if (!roles.length) return [];
  return base().lignes(
    "SELECT u.id AS id, u.nom_complet AS nom_complet, u.email AS email, u.telephone AS telephone, u.role AS role, u.statut AS statut, u.email_verifie AS email_verifie, u.date_creation AS date_creation, u.derniere_connexion AS derniere_connexion, (SELECT COUNT(*) FROM demandes_echange d WHERE d.utilisateur_id = u.id) AS nb_demandes, c.nom_complet AS createur FROM utilisateurs u LEFT JOIN utilisateurs c ON c.id = u.cree_par WHERE u.role IN (" + marques(roles.length) + ") ORDER BY u.role DESC, lower(u.nom_complet), u.id",
    roles
  );
}
async function creerAdmin(acteur, args) {
  exigerRole(acteur, ["SUPER_ADMIN"]);
  const nom = nettoyerNom(args.nom, "Saisissez le nom de l’administrateur.");
  const email = nettoyerEmail(args.email);
  const motDePasse = lireMotDePasse(args.motDePasse);
  if (!emailValide(email)) throw new Erreur("Saisissez une adresse e-mail valide.");
  validerNouveauMotDePasse(motDePasse);
  if (await ligneParEmail(base(), email)) throw new Erreur("Un compte existe déjà avec cette adresse e-mail.");
  const h = await nouveauHachage(motDePasse);
  try {
    return await transaction(async (tx) => {
      const id = await tx.inserer(
        "INSERT INTO utilisateurs (nom_complet, email, mot_de_passe_hash, sel, iterations, role, statut, email_verifie, cree_par, date_creation, doit_changer_mdp) VALUES (?, ?, ?, ?, ?, 'ADMIN', 'ACTIF', 1, ?, ?, 1)",
        [nom, email, h.hash, h.sel, h.iterations, acteur.id, Date.now()]
      );
      await journaliser(tx, acteur.id, "CREATION_ADMIN", "Création de l’administrateur " + nom + " (" + email + ")");
      return id;
    });
  } catch (e) {
    if (estDoublon(e)) throw new Erreur("Un compte existe déjà avec cette adresse e-mail.");
    throw e;
  }
}
async function definirStatutCompte(acteur, args) {
  exigerRole(acteur, ["SUPER_ADMIN"]);
  const compteId = entier(args.compteId, "compte", 1);
  const statut = parmi(args.statut, ["ACTIF", "BLOQUE"], "statut");
  const cible = await utilisateurParId(compteId);
  if (!cible) throw new Erreur("Compte introuvable.");
  if (cible.id === acteur.id || cible.role === "SUPER_ADMIN") throw new Erreur("Ce compte ne peut pas être bloqué.");
  await transaction(async (tx) => {
    await tx.exec("UPDATE utilisateurs SET statut = ? WHERE id = ?", [statut, compteId]);
    await tx.exec("DELETE FROM sessions WHERE utilisateur_id = ?", [compteId]);
    await tx.exec("DELETE FROM acces_biometriques WHERE utilisateur_id = ?", [compteId]);
    await journaliser(
      tx,
      acteur.id,
      statut === "BLOQUE" ? "BLOCAGE_COMPTE" : "DEBLOCAGE_COMPTE",
      (statut === "BLOQUE" ? "Blocage" : "Déblocage") + " du compte " + cible.email
    );
  });
}
async function definirMotDePasseAdmin(acteur, args) {
  exigerRole(acteur, ["SUPER_ADMIN"]);
  const compteId = entier(args.compteId, "compte", 1);
  const nouveau = lireMotDePasse(args.nouveau, "nouveau mot de passe");
  const cible = await utilisateurParId(compteId);
  if (!cible || cible.role !== "ADMIN") throw new Erreur("Seul le mot de passe d’un administrateur peut être redéfini ici.");
  validerNouveauMotDePasse(nouveau);
  const h = await nouveauHachage(nouveau);
  await transaction(async (tx) => {
    await tx.exec("UPDATE utilisateurs SET mot_de_passe_hash = ?, sel = ?, iterations = ?, tentatives_echouees = 0, verrouille_jusqua = NULL, doit_changer_mdp = 1 WHERE id = ?", [h.hash, h.sel, h.iterations, compteId]);
    await tx.exec("DELETE FROM sessions WHERE utilisateur_id = ?", [compteId]);
    await tx.exec("DELETE FROM acces_biometriques WHERE utilisateur_id = ?", [compteId]);
    await journaliser(tx, acteur.id, "MOT_DE_PASSE", "Mot de passe redéfini pour " + cible.email);
  });
}
async function activerEmpreinte(acteur, args) {
  const motDePasse = lireMotDePasse(args.motDePasse);
  if (!motDePasse) throw new Erreur("Saisissez votre mot de passe.");
  const l = await ligneParId(base(), acteur.id);
  if (!l || l.statut !== "ACTIF") throw new Erreur("Compte introuvable.");
  await verifierAvecTentatives(l, motDePasse, "Mot de passe incorrect.", false);
  const jeton = aleaHex(32);
  const id = await transaction(async (tx) => {
    const nouvelId = await tx.inserer(
      "INSERT INTO acces_biometriques (utilisateur_id, jeton_hash, date_creation) VALUES (?, ?, ?)",
      [acteur.id, sha256Hex(jeton), Date.now()]
    );
    await tx.exec("DELETE FROM acces_biometriques WHERE utilisateur_id = ? AND id NOT IN (SELECT id FROM acces_biometriques WHERE utilisateur_id = ? ORDER BY id DESC LIMIT " + MAX_ACCES_EMPREINTE + ")", [acteur.id, acteur.id]);
    await journaliser(tx, acteur.id, "EMPREINTE_ACTIVEE", "Connexion par empreinte digitale activée sur un téléphone");
    return nouvelId;
  });
  return { id, jeton };
}
async function etatEmpreinteServeur(acteur, args) {
  const id = entierOuNull(args.id, "accès", 1);
  if (id == null) return { active: false };
  const n = Number(await base().valeur("SELECT COUNT(*) AS n FROM acces_biometriques WHERE id = ? AND utilisateur_id = ?", [id, acteur.id]));
  return { active: n > 0 };
}
async function desactiverEmpreinte(acteur, args) {
  const id = entierOuNull(args.id, "accès", 1);
  await transaction(async (tx) => {
    if (id != null) await tx.exec("DELETE FROM acces_biometriques WHERE id = ? AND utilisateur_id = ?", [id, acteur.id]);
    else await tx.exec("DELETE FROM acces_biometriques WHERE utilisateur_id = ?", [acteur.id]);
    await journaliser(tx, acteur.id, "EMPREINTE_DESACTIVEE", "Connexion par empreinte digitale désactivée");
  });
}
async function seConnecterParEmpreinte(args) {
  const jeton = args.jeton;
  if (!jetonValide(jeton)) throw new ErreurHttp(400, "EMPREINTE_INVALIDE", "La connexion par empreinte n’est plus valable. Connectez-vous avec votre mot de passe.");
  const l = await base().ligne(
    "SELECT a.id AS acces_id, u.id AS id, u.nom_complet AS nom_complet, u.email AS email, u.telephone AS telephone, u.role AS role, u.statut AS statut, u.email_verifie AS email_verifie, u.date_creation AS date_creation, u.derniere_connexion AS derniere_connexion, u.doit_changer_mdp AS doit_changer_mdp FROM acces_biometriques a JOIN utilisateurs u ON u.id = a.utilisateur_id WHERE a.jeton_hash = ?",
    [sha256Hex(jeton)]
  );
  if (!l) throw new ErreurHttp(400, "EMPREINTE_INVALIDE", "La connexion par empreinte n’est plus valable. Connectez-vous avec votre mot de passe.");
  if (l.statut !== "ACTIF") throw new Erreur("Votre compte est bloqué. Contactez l’administrateur.");
  const t = Date.now();
  const session = await transaction(async (tx) => {
    await tx.exec("UPDATE utilisateurs SET derniere_connexion = ? WHERE id = ?", [t, l.id]);
    await tx.exec("UPDATE acces_biometriques SET derniere_utilisation = ? WHERE id = ?", [t, l.acces_id]);
    await journaliser(tx, l.id, "CONNEXION", "Connexion par empreinte digitale");
    return ouvrirSession(tx, l.id, false);
  });
  return { utilisateur: versUtilisateur(l), jeton: session, doitChangerMdp: !!l.doit_changer_mdp };
}
function limiter(groupe, ip) {
  if (!autoriser(groupe, ip)) {
    throw new ErreurHttp(429, "TROP_DE_REQUETES", "Trop de tentatives depuis votre connexion. Patientez quelques minutes puis réessayez.");
  }
}

// src/migration.ts
var MDP_TEMPORAIRE = { sel: "2ccb5ff28a82e546fdea6bb69bd2ca70", iterations: 31e4, hash: "3b6753138663c3afdbde7fda914701e5ae49696b39991b7662348dbaf7a93d9a" };
var COMPTES_TEST = ["abdi@gmail.com", "ali@gmail.com", "omar@gmail.com", "amin@gmail.com"];
var MOT_DE_PASSE_TEST = "1234";
async function creerIndexUnique(t, nom, table, expression, actions) {
  const doublons = Number(await t.valeur("SELECT COUNT(*) FROM (SELECT " + expression + " FROM " + table + " GROUP BY " + expression + " HAVING COUNT(*) > 1) x"));
  if (doublons > 0) {
    actions.push("Index " + nom + " non créé : " + doublons + " doublon(s) à corriger");
    return;
  }
  await t.exec("CREATE UNIQUE INDEX IF NOT EXISTS " + nom + " ON " + table + " (" + expression + ")");
}
async function bloquer(t, id) {
  const sel = aleaHex(16);
  const hash = await pbkdf2Hex(aleaHex(32), sel, 1e3);
  await t.exec(
    "UPDATE utilisateurs SET statut = 'BLOQUE', mot_de_passe_hash = ?, sel = ?, iterations = 1000, doit_changer_mdp = 1 WHERE id = ?",
    [hash, sel, id]
  );
  await t.exec("DELETE FROM sessions WHERE utilisateur_id = ?", [id]);
  await t.exec("DELETE FROM acces_biometriques WHERE utilisateur_id = ?", [id]);
}
async function securiserComptes(t, actions) {
  const comptes = await t.lignes(
    "SELECT id, email, role, mot_de_passe_hash, sel, iterations FROM utilisateurs ORDER BY id"
  );
  for (const c of comptes) {
    let test = false;
    try {
      test = egalConstant(await pbkdf2Hex(MOT_DE_PASSE_TEST, c.sel, Number(c.iterations) || 12e4), c.mot_de_passe_hash);
    } catch (e) {
      test = false;
    }
    if (!test) continue;
    if (c.role === "SUPER_ADMIN") {
      await t.exec("UPDATE utilisateurs SET mot_de_passe_hash = ?, sel = ?, iterations = ?, doit_changer_mdp = 1, tentatives_echouees = 0, verrouille_jusqua = NULL, statut = 'ACTIF' WHERE id = ?", [MDP_TEMPORAIRE.hash, MDP_TEMPORAIRE.sel, MDP_TEMPORAIRE.iterations, c.id]);
      await t.exec("DELETE FROM sessions WHERE utilisateur_id = ?", [c.id]);
      await t.exec("DELETE FROM acces_biometriques WHERE utilisateur_id = ?", [c.id]);
      actions.push("Super admin " + c.email + " : mot de passe temporaire, à changer à la première connexion");
      continue;
    }
    if (c.role === "UTILISATEUR" && COMPTES_TEST.indexOf(c.email.toLowerCase()) >= 0) {
      await t.exec("SAVEPOINT suppression");
      try {
        const utilise = Number(await t.valeur("SELECT (SELECT COUNT(*) FROM demandes_echange WHERE utilisateur_id = ?) + (SELECT COUNT(*) FROM signalements WHERE utilisateur_id = ?) AS n", [c.id, c.id]));
        if (utilise > 0) throw new Error("compte utilisé");
        await t.exec("DELETE FROM utilisateurs WHERE id = ?", [c.id]);
        await t.exec("RELEASE SAVEPOINT suppression");
        actions.push("Compte de test supprimé : " + c.email);
        continue;
      } catch (e) {
        await t.exec("ROLLBACK TO SAVEPOINT suppression");
      }
    }
    await bloquer(t, c.id);
    actions.push("Compte bloqué (mot de passe de test) : " + c.email);
  }
}
async function versionPasserelle(t) {
  await t.exec("ALTER TABLE wallets ADD COLUMN IF NOT EXISTS passerelle TEXT");
  await t.exec("ALTER TABLE wallets ADD COLUMN IF NOT EXISTS solde_maj BIGINT");
  await t.exec("ALTER TABLE wallets DROP CONSTRAINT IF EXISTS wallets_passerelle_check");
  await t.exec("ALTER TABLE wallets ADD CONSTRAINT wallets_passerelle_check CHECK (passerelle IS NULL OR passerelle IN ('DMONEY', 'WAAFI'))");
  await t.exec("CREATE UNIQUE INDEX IF NOT EXISTS ux_wallets_passerelle ON wallets (passerelle) WHERE passerelle IS NOT NULL");
  await t.exec("ALTER TABLE demandes_echange ADD COLUMN IF NOT EXISTS etape_passerelle TEXT");
  await t.exec("ALTER TABLE demandes_echange ADD COLUMN IF NOT EXISTS motif_blocage TEXT");
  await t.exec("ALTER TABLE demandes_echange ADD COLUMN IF NOT EXISTS date_blocage BIGINT");
  await t.exec("ALTER TABLE demandes_echange DROP CONSTRAINT IF EXISTS demandes_echange_etape_check");
  await t.exec("ALTER TABLE demandes_echange ADD CONSTRAINT demandes_echange_etape_check CHECK (etape_passerelle IS NULL OR etape_passerelle IN ('VERIF_PAIEMENT', 'ATTENTE_ACCORD', 'ENVOI', 'BLOQUEE'))");
  await t.exec("CREATE INDEX IF NOT EXISTS idx_demandes_etape ON demandes_echange (etape_passerelle) WHERE etape_passerelle IS NOT NULL");
  await t.exec("CREATE TABLE IF NOT EXISTS passerelles (id bigint GENERATED BY DEFAULT AS IDENTITY PRIMARY KEY, nom TEXT NOT NULL, jeton_hash TEXT UNIQUE, code_hash TEXT, code_expire BIGINT, actif BIGINT NOT NULL DEFAULT 0, etat TEXT, date_creation BIGINT NOT NULL, date_association BIGINT, dernier_contact BIGINT)");
  await t.exec("CREATE TABLE IF NOT EXISTS messages_passerelle (id bigint GENERATED BY DEFAULT AS IDENTITY PRIMARY KEY, passerelle_id BIGINT NOT NULL REFERENCES passerelles (id) ON DELETE CASCADE, id_local TEXT NOT NULL, type TEXT NOT NULL CHECK (type IN ('SMS', 'NOTIFICATION')), expediteur TEXT NOT NULL, texte TEXT NOT NULL, recu_a BIGINT NOT NULL, date_reception BIGINT NOT NULL, operateur TEXT, nature TEXT, lecture TEXT, UNIQUE (passerelle_id, id_local))");
  await t.exec("CREATE TABLE IF NOT EXISTS operations_operateur (id bigint GENERATED BY DEFAULT AS IDENTITY PRIMARY KEY, operateur TEXT NOT NULL CHECK (operateur IN ('DMONEY', 'WAAFI')), operation_id TEXT NOT NULL, sens TEXT CHECK (sens IS NULL OR sens IN ('RECU', 'ENVOYE')), montant BIGINT, numero TEXT, nom TEXT, date_operation BIGINT, solde_apres BIGINT, source TEXT NOT NULL, confirme_operateur BIGINT, demande_id BIGINT REFERENCES demandes_echange (id) ON DELETE SET NULL, role TEXT CHECK (role IS NULL OR role IN ('PAIEMENT', 'VERSEMENT')), utilisee BIGINT NOT NULL DEFAULT 0, date_creation BIGINT NOT NULL, UNIQUE (operateur, operation_id))");
  await t.exec("CREATE TABLE IF NOT EXISTS ordres_passerelle (id bigint GENERATED BY DEFAULT AS IDENTITY PRIMARY KEY, type TEXT NOT NULL CHECK (type IN ('SOLDE', 'HISTORIQUE', 'ENVOI')), operateur TEXT NOT NULL CHECK (operateur IN ('DMONEY', 'WAAFI')), demande_id BIGINT REFERENCES demandes_echange (id) ON DELETE SET NULL, motif TEXT, montant BIGINT, numero TEXT, statut TEXT NOT NULL DEFAULT 'A_FAIRE' CHECK (statut IN ('A_FAIRE', 'EN_COURS', 'FAIT', 'ECHEC', 'INCERTAIN', 'ANNULE')), tentatives BIGINT NOT NULL DEFAULT 0, resultat TEXT, erreur TEXT, cle TEXT UNIQUE, date_creation BIGINT NOT NULL, date_prise BIGINT, date_fin BIGINT)");
  await t.exec("CREATE INDEX IF NOT EXISTS idx_messages_passerelle_date ON messages_passerelle (date_reception)");
  await t.exec("CREATE INDEX IF NOT EXISTS idx_operations_demande ON operations_operateur (demande_id)");
  await t.exec("CREATE INDEX IF NOT EXISTS idx_operations_attente ON operations_operateur (operateur, sens, utilisee)");
  await t.exec("CREATE INDEX IF NOT EXISTS idx_ordres_statut ON ordres_passerelle (statut, id)");
  await t.exec("CREATE INDEX IF NOT EXISTS idx_ordres_demande ON ordres_passerelle (demande_id)");
  for (const table of ["passerelles", "messages_passerelle", "operations_operateur", "ordres_passerelle"]) {
    await t.exec("ALTER TABLE " + table + " ENABLE ROW LEVEL SECURITY");
  }
  const defauts = [
    ["passerelle_montant_auto", "500", "Passerelle : montant maximum envoyé sans accord d’un administrateur (FDJ)"],
    ["passerelle_delai_secondes", "120", "Passerelle : accord requis si la demande précédente date de moins de ce délai (secondes)"],
    ["passerelle_sans_frais", "1", "Passerelle : échanges sans frais entre wallets gérés par la passerelle (test)"]
  ];
  for (const [cle, valeur, description] of defauts) {
    await t.exec("INSERT INTO parametres (cle, valeur, description) VALUES (?, ?, ?) ON CONFLICT (cle) DO NOTHING", [cle, valeur, description]);
  }
}
async function migrer() {
  return transaction(async (t) => {
    await t.exec("SELECT pg_advisory_xact_lock(7230142)");
    const tables = Number(await t.valeur("SELECT COUNT(*) FROM information_schema.tables WHERE table_schema = current_schema() AND table_name IN ('utilisateurs', 'wallets', 'demandes_echange', 'sessions', 'signalements', 'acces_biometriques')"));
    if (tables < 6) {
      throw new Error("Base non initialisée : les tables de Dj Wallet Exchange sont absentes. Exécutez d’abord le script SQL de création dans Supabase.");
    }
    await t.exec("CREATE TABLE IF NOT EXISTS meta_schema (cle TEXT PRIMARY KEY, valeur TEXT NOT NULL)");
    await t.exec("ALTER TABLE meta_schema ENABLE ROW LEVEL SECURITY");
    const version = Number(await t.valeur("SELECT valeur FROM meta_schema WHERE cle = 'version'")) || 2;
    if (version >= VERSION_SCHEMA) return { version, actions: [] };
    const actions = [];
    if (version < 3) {
      await t.exec("ALTER TABLE utilisateurs ADD COLUMN IF NOT EXISTS doit_changer_mdp BIGINT NOT NULL DEFAULT 0");
      await creerIndexUnique(t, "ux_utilisateurs_email_min", "utilisateurs", "lower(email)", actions);
      await creerIndexUnique(t, "ux_wallets_nom_min", "wallets", "lower(nom)", actions);
      await creerIndexUnique(t, "ux_wallets_code_min", "wallets", "lower(code)", actions);
      await t.exec("CREATE INDEX IF NOT EXISTS idx_demandes_statut_traitement ON demandes_echange (statut, date_traitement)");
      await t.exec("CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON notifications (utilisateur_id, id)");
      await t.exec("CREATE INDEX IF NOT EXISTS idx_sessions_expiration ON sessions (date_expiration)");
      if (!config.garderComptesTest) await securiserComptes(t, actions);
    }
    if (version < 4) {
      await versionPasserelle(t);
      actions.push("Passerelle téléphone : tables et réglages du test créés");
    }
    await t.exec(
      "INSERT INTO meta_schema (cle, valeur) VALUES ('version', ?) ON CONFLICT (cle) DO UPDATE SET valeur = EXCLUDED.valeur",
      [String(VERSION_SCHEMA)]
    );
    await journaliser(t, null, "MISE_A_JOUR", "Base en ligne mise à jour pour la version " + VERSION + (actions.length ? " : " + actions.join(" ; ") : ""));
    return { version: VERSION_SCHEMA, actions };
  });
}

// src/lecteurs.ts
var DECALAGE_DJIBOUTI_MS = 3 * 3600 * 1e3;
function normaliserTexte(t) {
  return (t || "").normalize("NFC").replace(/[‘’ʼ`´]/g, "'").replace(/[\u00a0\u202f\u2007]/g, " ").replace(/\r\n?/g, "\n").replace(/[ \t]+/g, " ").trim();
}
function montantDe(brut) {
  if (brut == null) return null;
  let s2 = String(brut).replace(/[\s\u00a0]/g, "");
  if (!s2) return null;
  if (/^\d{1,3}([,.]\d{3})+$/.test(s2)) {
    s2 = s2.replace(/[,.]/g, "");
  } else if (/^\d+[.,]\d{1,2}$/.test(s2)) {
    return Math.round(Number(s2.replace(",", ".")));
  } else if (!/^\d+$/.test(s2)) {
    return null;
  }
  const n = Number(s2);
  return isFinite(n) ? n : null;
}
function dateDj(jour, mois, annee, h, mi, s2) {
  if (annee < 100) annee += 2e3;
  if (!(mois >= 1 && mois <= 12 && jour >= 1 && jour <= 31 && h <= 23 && mi <= 59 && s2 <= 59)) return null;
  return Date.UTC(annee, mois - 1, jour, h, mi, s2) - DECALAGE_DJIBOUTI_MS;
}
function numeroDe(brut) {
  return brut ? normaliserNumero(brut) : null;
}
function nomDe(brut) {
  const n = (brut || "").replace(/\s+/g, " ").trim();
  return n ? n.substring(0, 80) : null;
}
var N = "(\\d[\\d,. ]*?)";
var DATE_LONGUE = "(\\d{2})\\/(\\d{2})\\/(\\d{4})\\s+(\\d{2}):(\\d{2}):(\\d{2})";
var DATE_COURTE = "(\\d{2})\\/(\\d{2})\\/(\\d{2})\\s+(\\d{2}):(\\d{2}):(\\d{2})";
var DM_RECU = new RegExp("Vous avez re[çc]u avec succ[èe]s\\s+" + N + "\\s*DJF\\s+de l'abonn[ée]\\s+(\\d{8,13})\\s+sur votre Compte principale?\\s+le\\s+" + DATE_LONGUE + "\\.?\\s*Le nouveau solde de votre Compte principale?\\s+est de\\s+" + N + "\\s*DJF\\.?\\s*L'identifiant de l'op[ée]ration est\\s+(\\d{6,20})", "i");
var DM_ENVOYE = new RegExp("Vous avez effectu[ée] un transfert de\\s+" + N + "\\s*DJF\\s+vers l'abonn[ée]\\s+(\\d{8,13})\\s+[àa] partir de votre Compte principale?\\s+le\\s+" + DATE_LONGUE + "\\.?\\s*Le nouveau solde de votre Compte principale?\\s+est de\\s+" + N + "\\s*DJF\\.?\\s*L'identifiant de l'op[ée]ration est\\s+(\\d{6,20})", "i");
var DM_RELEVE = new RegExp("Op[ée]ration ID\\s*:\\s*(\\d{6,20})\\s*,\\s*Date\\s*:\\s*" + DATE_LONGUE + "\\s*,\\s*D[ée]tails\\s*:\\s*([^,]*?)\\s*,\\s*Montant\\s*:\\s*" + N + "\\s*DJF\\s*,\\s*Frais\\s*:\\s*" + N + "\\s*DJF\\s*,\\s*Statut\\s*:\\s*([A-Za-z]+)", "gi");
var DM_ECRAN_LIGNE = /(\d{9,20})\s*,\s*(\d[\d,.]*)\s*DJF\s*,\s*(\d{4})(\d{2})(\d{2})\s+(\d{2}):(\d{2})/gi;
var DM_ECRAN_SOLDE = new RegExp("solde de votre compte principale?\\s+est de\\s*:?\\s*" + N + "\\s*DJF", "i");
var DM_ECRAN_ENVOI = new RegExp("Transfert r[ée]ussi.*?ID de transaction\\s*:\\s*(\\d{6,20}).*?Montant\\s*:\\s*" + N + "\\s*DJF.*?Frais\\s*:\\s*" + N + "\\s*DJF.*?Nouveau solde\\s*:\\s*" + N + "\\s*DJF", "is");
function dmRecu(t) {
  const m = DM_RECU.exec(t);
  if (!m) return null;
  return {
    operateur: "DMONEY",
    operationId: m[10],
    sens: "RECU",
    montant: montantDe(m[1]),
    numero: numeroDe(m[2]),
    nom: null,
    date: dateDj(+m[3], +m[4], +m[5], +m[6], +m[7], +m[8]),
    soldeApres: montantDe(m[9])
  };
}
function dmEnvoye(t) {
  const m = DM_ENVOYE.exec(t);
  if (!m) return null;
  return {
    operateur: "DMONEY",
    operationId: m[10],
    sens: "ENVOYE",
    montant: montantDe(m[1]),
    numero: numeroDe(m[2]),
    nom: null,
    date: dateDj(+m[3], +m[4], +m[5], +m[6], +m[7], +m[8]),
    soldeApres: montantDe(m[9])
  };
}
function lireReleveDmoney(texte2) {
  const t = normaliserTexte(texte2);
  if (!/historique des transactions/i.test(t)) return [];
  const res = [];
  DM_RELEVE.lastIndex = 0;
  let m;
  while ((m = DM_RELEVE.exec(t)) !== null) {
    if (!/^completed$/i.test(m[11])) continue;
    res.push({
      operateur: "DMONEY",
      operationId: m[1],
      sens: null,
      montant: montantDe(m[9]),
      numero: null,
      nom: null,
      date: dateDj(+m[2], +m[3], +m[4], +m[5], +m[6], +m[7]),
      soldeApres: null
    });
  }
  return res;
}
function lireEcranHistoriqueDmoney(texte2) {
  const t = normaliserTexte(texte2);
  if (!/Op[ée]ration\s*ID/i.test(t)) return [];
  const res = [];
  DM_ECRAN_LIGNE.lastIndex = 0;
  let m;
  while ((m = DM_ECRAN_LIGNE.exec(t)) !== null) {
    res.push({ operationId: m[1], montant: montantDe(m[2]), date: dateDj(+m[5], +m[4], +m[3], +m[6], +m[7], 0) });
  }
  return res;
}
var WF_RECU = new RegExp("Transfer-Id\\s*:\\s*(\\d{5,20})\\s*,\\s*You have Received DJF\\s*" + N + "\\s+from\\s+(.+?)\\s*\\((\\d{8,13})\\)\\s*,?\\s*(?:at\\s+" + DATE_COURTE + "\\s*,?\\s*)?Your Balance is\\s*:?\\s*DJF\\s*" + N + "(?:\\.|\\s|$)", "i");
var WF_ENVOYE = new RegExp("Transfer-Id\\s*:\\s*(\\d{5,20})\\s*,\\s*You have successfully transferred DJF\\s*" + N + "\\s+to\\s+(.+?)\\s*\\((\\d{8,13})\\)\\s*(?:at\\s+" + DATE_COURTE + "\\s*)?,?\\s*Your Balance is\\s*:?\\s*DJF\\s*" + N + "(?:\\.|\\s|$)", "i");
var WF_RELEVE = new RegExp("(\\d{1,2})\\.\\s*TranId\\s*:\\s*(\\d{5,20})\\s*Details\\s*:\\s*(Sent|Received)\\s+DJF\\s*" + N + "\\s+(?:to|from)\\s+(.+?)\\s*\\((\\d{8,13})\\)\\s*at\\s+" + DATE_COURTE, "gi");
var WF_ECRAN_SOLDE = new RegExp("Your current balance is\\s*:?\\s*DJF\\s*" + N + "(?:\\.|\\s|$)", "i");
function wfRecu(t) {
  const m = WF_RECU.exec(t);
  if (!m) return null;
  return {
    operateur: "WAAFI",
    operationId: m[1],
    sens: "RECU",
    montant: montantDe(m[2]),
    numero: numeroDe(m[4]),
    nom: nomDe(m[3]),
    date: m[5] ? dateDj(+m[5], +m[6], +m[7], +m[8], +m[9], +m[10]) : null,
    soldeApres: montantDe(m[11])
  };
}
function wfEnvoye(t) {
  const m = WF_ENVOYE.exec(t);
  if (!m) return null;
  return {
    operateur: "WAAFI",
    operationId: m[1],
    sens: "ENVOYE",
    montant: montantDe(m[2]),
    numero: numeroDe(m[4]),
    nom: nomDe(m[3]),
    date: m[5] ? dateDj(+m[5], +m[6], +m[7], +m[8], +m[9], +m[10]) : null,
    soldeApres: montantDe(m[11])
  };
}
function lireReleveWaafi(texte2) {
  const t = normaliserTexte(texte2);
  if (!/Mini Statement/i.test(t)) return [];
  const res = [];
  WF_RELEVE.lastIndex = 0;
  let m;
  while ((m = WF_RELEVE.exec(t)) !== null) {
    res.push({
      operateur: "WAAFI",
      operationId: m[2],
      sens: /^received$/i.test(m[3]) ? "RECU" : "ENVOYE",
      montant: montantDe(m[4]),
      numero: numeroDe(m[6]),
      nom: nomDe(m[5]),
      date: dateDj(+m[7], +m[8], +m[9], +m[10], +m[11], +m[12]),
      soldeApres: null
    });
  }
  return res;
}
function lireEcranSolde(operateur, texte2) {
  const t = normaliserTexte(texte2);
  const m = (operateur === "DMONEY" ? DM_ECRAN_SOLDE : WF_ECRAN_SOLDE).exec(t);
  return m ? montantDe(m[1]) : null;
}
function lireEcranEnvoi(operateur, texte2) {
  const t = normaliserTexte(texte2);
  if (operateur === "WAAFI") return wfEnvoye(t);
  const m = DM_ECRAN_ENVOI.exec(t);
  if (!m) return null;
  return { operateur: "DMONEY", operationId: m[1], sens: "ENVOYE", montant: montantDe(m[2]), numero: null, nom: null, date: null, soldeApres: montantDe(m[4]) };
}
function releveWaafiEnvoye(texte2) {
  return /mini statement has been sent/i.test(normaliserTexte(texte2));
}
function resumeOperation(o) {
  const sens = o.sens === "RECU" ? "reçu" : o.sens === "ENVOYE" ? "envoyé" : "opération";
  return (o.operateur === "DMONEY" ? "D-Money" : "Waafi") + " " + sens + " " + (o.montant != null ? o.montant + " FDJ" : "?") + (o.numero ? (o.sens === "RECU" ? " de " : " vers ") + o.numero : "") + ", ID " + o.operationId;
}
function analyserMessage(texte2) {
  const t = normaliserTexte(texte2);
  const vide = { operateur: null, nature: null, operations: [], solde: null, resume: "Message sans rapport avec D-Money ou Waafi" };
  if (!t) return vide;
  const dm = dmRecu(t) || dmEnvoye(t);
  if (dm) return { operateur: "DMONEY", nature: dm.sens === "RECU" ? "RECEPTION" : "ENVOI", operations: [dm], solde: dm.soldeApres, resume: resumeOperation(dm) };
  const releveDm = lireReleveDmoney(t);
  if (releveDm.length) {
    return { operateur: "DMONEY", nature: "RELEVE", operations: releveDm, solde: null, resume: "Historique D-Money : " + releveDm.map((o) => o.operationId).join(", ") };
  }
  const wf = wfRecu(t) || wfEnvoye(t);
  if (wf) return { operateur: "WAAFI", nature: wf.sens === "RECU" ? "RECEPTION" : "ENVOI", operations: [wf], solde: wf.soldeApres, resume: resumeOperation(wf) };
  const releveWf = lireReleveWaafi(t);
  if (releveWf.length) {
    return { operateur: "WAAFI", nature: "RELEVE", operations: releveWf, solde: null, resume: "Mini-relevé Waafi : " + releveWf.map((o) => o.operationId).join(", ") };
  }
  const soldeWf = lireEcranSolde("WAAFI", t);
  if (soldeWf != null) return { operateur: "WAAFI", nature: "SOLDE", operations: [], solde: soldeWf, resume: "Solde Waafi : " + soldeWf + " FDJ" };
  if (/WAAFI/i.test(t)) return { operateur: "WAAFI", nature: "AUTRE", operations: [], solde: null, resume: "Message Waafi non reconnu" };
  if (/D-?MONEY|identifiant de l'op[ée]ration|Compte principal/i.test(t)) {
    return { operateur: "DMONEY", nature: "AUTRE", operations: [], solde: null, resume: "Message D-Money non reconnu" };
  }
  return vide;
}
function normaliserExpediteur(e) {
  return (e || "").toUpperCase().replace(/[^A-Z0-9.]/g, "");
}

// src/walletApi.ts
function referenceSimulee(w) {
  return w.code.substring(0, 4) + "-" + aleaHex(4).toUpperCase();
}
var NON_BRANCHEE = "L’API de ce wallet n’est pas encore branchée sur le serveur.";
async function verifierReception(w, numero, montant, reference) {
  if (!config.modeTest) return { ok: false, ref: "", message: NON_BRANCHEE };
  return { ok: true, ref: referenceSimulee(w) };
}
async function envoyer(w, numero, montant, reference) {
  if (!config.modeTest) return { ok: false, ref: "", message: NON_BRANCHEE };
  return { ok: true, ref: referenceSimulee(w) };
}
async function lireSolde(w) {
  if (!config.modeTest) return { ok: false, solde: 0, message: NON_BRANCHEE };
  return { ok: true, solde: w.solde_api };
}

// src/wallets.ts
var COLONNES = "id, nom, code, operateur, description, logo, logo_mime, couleur, type_compte, compte_reception, nom_compte, statut, mode_echange, regle_frais, frais_pourcentage, frais_compte_revenu, solde_api, seuil_alerte, api_url, (CASE WHEN api_cle IS NOT NULL AND api_cle <> '' THEN 1 ELSE 0 END) AS a_cle_api, ordre, date_creation, date_maj, passerelle, solde_maj";
function versWallet(l) {
  l.logo = l.logo ? Buffer.from(l.logo).toString("base64") : null;
  return l;
}
async function walletParId(b, id, verrouiller = false) {
  const l = await b.ligne("SELECT " + COLONNES + " FROM wallets WHERE id = ?" + (verrouiller ? " FOR UPDATE" : ""), [id]);
  return l ? versWallet(l) : null;
}
async function walletPourApi(b, id) {
  return b.ligne("SELECT id, code, nom, api_url, api_cle, solde_api FROM wallets WHERE id = ?", [id]);
}
async function tousLesWallets(b = base()) {
  return (await b.lignes("SELECT " + COLONNES + " FROM wallets ORDER BY ordre, lower(nom), id")).map(versWallet);
}
async function listerWallets(acteur) {
  const wallets = await tousLesWallets();
  if (estAdmin(acteur)) return wallets;
  return wallets.map((w) => {
    const v = Object.assign({}, w, { solde_api: 0, seuil_alerte: 0, api_url: null, a_cle_api: 0, solde_maj: null });
    if (!acteur) {
      v.compte_reception = null;
      v.nom_compte = null;
    }
    return v;
  });
}
async function alerterSolde(b, w, soldeAvant, soldeApres) {
  if (w.mode_echange !== "AUTOMATIQUE") return;
  if (soldeApres <= 0 && soldeAvant > 0) {
    await notifierAdmins(
      b,
      "SOLDE_EPUISE",
      "Solde épuisé : " + w.nom,
      "Le solde du wallet " + w.nom + " est épuisé. Rechargez-le pour continuer les échanges automatiques.",
      null,
      w.id
    );
  } else if (soldeApres > 0 && soldeApres <= w.seuil_alerte && soldeAvant > w.seuil_alerte) {
    await notifierAdmins(
      b,
      "SOLDE_FAIBLE",
      "Solde faible : " + w.nom,
      "Il reste " + fdj(soldeApres) + " sur le wallet " + w.nom + " (seuil d’alerte : " + fdj(w.seuil_alerte) + ").",
      null,
      w.id
    );
  }
}
function codeDepuisNom(nom) {
  return (nom || "").toUpperCase().replace(/[^A-Z0-9]/g, "").substring(0, 12);
}
var LOGO_MAX_BASE64 = 7e5;
function valider(brut, creation) {
  const s2 = objet(brut, "wallet");
  const nom = texte(s2.nom, "nom", 100).trim().replace(/\s+/g, " ");
  if (nom.length < 2) throw new Erreur("Saisissez le nom du wallet.");
  if (nom.length > 40) throw new Erreur("Le nom du wallet est trop long.");
  if (/[<>{}\\]/.test(nom)) throw new Erreur("Le nom du wallet contient des caractères non autorisés.");
  const code = codeDepuisNom(texte(s2.code, "code", 40) || nom);
  if (code.length < 2) throw new Erreur("Le code du wallet doit contenir au moins 2 lettres ou chiffres.");
  if (s2.statut === null || s2.statut === void 0 || s2.statut === "") throw new Erreur("Choisissez l’état du wallet : activer maintenant ou « Coming soon ».");
  const statut = parmi(s2.statut, ["ACTIF", "COMING_SOON", "INACTIF"], "état du wallet");
  let mode = s2.mode === null || s2.mode === void 0 || s2.mode === "" ? null : parmi(s2.mode, ["AUTOMATIQUE", "MANUEL"], "mode");
  if (statut === "COMING_SOON") mode = null;
  if (statut === "ACTIF" && creation && !mode) throw new Erreur("Choisissez le mode d’échange : automatique ou manuel.");
  const typeCompte = parmi(s2.typeCompte, ["NUMERO", "CODE_MARCHAND"], "type de compte");
  let compte = texte(s2.compteReception, "compte de réception", 40).trim();
  if (typeCompte === "NUMERO") {
    if (compte) {
      const n = normaliserNumero(compte);
      if (!n) throw new Erreur("Le numéro de réception doit contenir 8 chiffres.");
      compte = n;
    }
  } else if (compte) {
    compte = compte.replace(/\s+/g, "");
    if (!/^[A-Za-z0-9*#-]{3,20}$/.test(compte)) throw new Erreur("Le code marchand est invalide.");
  }
  if (statut === "ACTIF" && !compte) {
    throw new Erreur(typeCompte === "NUMERO" ? "Indiquez le numéro sur lequel les clients envoient leur paiement." : "Indiquez le code marchand sur lequel les clients envoient leur paiement.");
  }
  if (!compte) compte = null;
  const couleurBrute = texte(s2.couleur, "couleur", 7);
  const couleur = /^#[0-9A-Fa-f]{6}$/.test(couleurBrute) ? couleurBrute : "#1565D8";
  const regle = parmi(s2.regleFrais, ["STANDARD", "POURCENTAGE"], "règle de frais");
  let pct = s2.fraisPourcentage === null || s2.fraisPourcentage === void 0 || s2.fraisPourcentage === "" ? 0 : nombre2(s2.fraisPourcentage, "taux", -1e6, 1e6);
  if (regle === "POURCENTAGE") {
    if (!isFinite(pct) || pct < 0 || pct > 50) throw new Erreur("Le taux de commission doit être compris entre 0 et 50 %.");
  } else {
    pct = 0;
  }
  const solde = Math.max(0, Math.round(nombre2(s2.soldeApi || 0, "solde", -1e12, 1e12)));
  const seuil = Math.max(0, Math.round(nombre2(s2.seuilAlerte || 0, "seuil d’alerte", -1e12, 1e12)));
  const logo = s2.logo ? image({ base64: s2.logo, mime: s2.logoMime || "image/png" }, "logo", LOGO_MAX_BASE64) : null;
  const apiUrl = texte(s2.apiUrl, "adresse de l’API", 300).trim();
  if (apiUrl && !/^https:\/\/[^\s<>"]+$/i.test(apiUrl)) throw new Erreur("L’adresse de l’API doit commencer par https://");
  const operateur = texte(s2.operateur, "opérateur", 60).trim();
  const description = texte(s2.description, "description", 300).trim();
  const nomCompte = texte(s2.nomCompte, "nom du compte", 60).trim();
  const args = [
    nom,
    code,
    operateur || null,
    description || null,
    logo ? Buffer.from(logo.base64, "base64") : null,
    logo ? logo.mime : "image/png",
    couleur,
    typeCompte,
    compte,
    // frais_compte_revenu (réglage de la version 1) : la commission compte toujours dans le revenu.
    nomCompte || null,
    statut,
    mode,
    regle,
    pct,
    1,
    solde,
    seuil,
    apiUrl || null
  ];
  const cle = texte(s2.apiCle, "clé d’API", 500).trim() || null;
  return { nom, code, statut, mode, args, cle, cleModifiee: s2.cleModifiee === true };
}
function erreurUnicite(e) {
  if (estDoublon(e)) throw new Erreur("Un wallet porte déjà ce nom ou ce code.");
  throw e;
}
function resumeEtat(statut, mode) {
  if (statut === "COMING_SOON") return "coming soon";
  if (statut === "INACTIF") return "désactivé";
  return "actif, " + (mode === "AUTOMATIQUE" ? "automatique" : mode === "MANUEL" ? "manuel" : "mode non défini");
}
async function creerWallet(acteur, args) {
  exigerRole(acteur, ["SUPER_ADMIN"]);
  const v = valider(args.saisie, true);
  try {
    return await transaction(async (tx) => {
      const id = await tx.inserer(
        "INSERT INTO wallets (nom, code, operateur, description, logo, logo_mime, couleur, type_compte, compte_reception, nom_compte, statut, mode_echange, regle_frais, frais_pourcentage, frais_compte_revenu, solde_api, seuil_alerte, api_url, api_cle, ordre, date_creation) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, (SELECT COALESCE(MAX(ordre), 0) + 1 FROM wallets), ?)",
        v.args.concat([v.cle, Date.now()])
      );
      await journaliser(tx, acteur.id, "CREATION_WALLET", "Création du wallet " + v.nom + " (" + resumeEtat(v.statut, v.mode) + ")");
      return id;
    });
  } catch (e) {
    return erreurUnicite(e);
  }
}
async function majWallet(acteur, args) {
  exigerRole(acteur, ["SUPER_ADMIN"]);
  const id = entier(args.id, "wallet", 1);
  const v = valider(args.saisie, false);
  try {
    await transaction(async (tx) => {
      await tx.exiger(
        "UPDATE wallets SET nom = ?, code = ?, operateur = ?, description = ?, logo = ?, logo_mime = ?, couleur = ?, type_compte = ?, compte_reception = ?, nom_compte = ?, statut = ?, mode_echange = ?, regle_frais = ?, frais_pourcentage = ?, frais_compte_revenu = ?, solde_api = ?, seuil_alerte = ?, api_url = ?, " + (v.cleModifiee ? "api_cle = ?, " : "") + "date_maj = ? WHERE id = ?",
        v.args.concat(v.cleModifiee ? [v.cle] : []).concat([Date.now(), id]),
        "Wallet introuvable."
      );
      await journaliser(tx, acteur.id, "MODIFICATION_WALLET", "Modification du wallet " + v.nom + " (" + resumeEtat(v.statut, v.mode) + ")");
    });
  } catch (e) {
    erreurUnicite(e);
  }
}
async function supprimerWallet(acteur, args) {
  exigerRole(acteur, ["SUPER_ADMIN"]);
  const id = entier(args.id, "wallet", 1);
  await transaction(async (tx) => {
    const w = await walletParId(tx, id, true);
    if (!w) throw new Erreur("Wallet introuvable.");
    const n = Number(await tx.valeur("SELECT COUNT(*) AS n FROM demandes_echange WHERE wallet_source_id = ? OR wallet_dest_id = ?", [id, id]));
    if (n > 0) {
      throw new Erreur("Ce wallet est utilisé par " + n + " demande" + (n > 1 ? "s" : "") + " : il ne peut pas être supprimé. Vous pouvez le désactiver.");
    }
    await tx.exec("DELETE FROM wallets WHERE id = ?", [id]);
    await journaliser(tx, acteur.id, "SUPPRESSION_WALLET", "Suppression du wallet " + w.nom);
  });
}
async function definirModes(acteur, args) {
  exigerRole(acteur, ["SUPER_ADMIN"]);
  const choix = tableau(args.choix, "choix", 200).map((c) => {
    const o = objet(c, "choix");
    return { id: entier(o.id, "wallet", 1), mode: parmi(o.mode, ["AUTOMATIQUE", "MANUEL"], "mode") };
  });
  if (!choix.length) return;
  await transaction(async (tx) => {
    const wallets = {};
    (await tx.lignes("SELECT " + COLONNES + " FROM wallets FOR UPDATE")).forEach((l) => {
      wallets[l.id] = versWallet(l);
    });
    const resume = [];
    const t = Date.now();
    for (const c of choix) {
      const w = wallets[c.id];
      if (!w) continue;
      if (w.statut !== "ACTIF") throw new Erreur("Le wallet " + w.nom + " n’est pas actif : activez-le d’abord dans la gestion des wallets.");
      if (!w.compte_reception) throw new Erreur("Le wallet " + w.nom + " n’a pas de compte de réception : complétez-le dans la gestion des wallets.");
      if (w.mode_echange === c.mode) continue;
      await tx.exec("UPDATE wallets SET mode_echange = ?, date_maj = ? WHERE id = ?", [c.mode, t, c.id]);
      resume.push(w.nom + " → " + (c.mode === "AUTOMATIQUE" ? "automatique" : "manuel"));
    }
    if (resume.length) await journaliser(tx, acteur.id, "MODE_ECHANGE", "Mode d’échange : " + resume.join(", "));
  });
}
async function actualiserSoldes2(acteur) {
  exigerRole(acteur, ["ADMIN", "SUPER_ADMIN"]);
  const wallets = await tousLesWallets();
  let interroges = 0;
  const parPasserelle = wallets.filter((w) => w.statut === "ACTIF" && w.passerelle).map((w) => w.passerelle);
  if (parPasserelle.length) {
    await transaction((tx) => soldesPasserelle(tx, parPasserelle));
    interroges += parPasserelle.length;
  }
  for (const w of wallets) {
    if (w.statut !== "ACTIF" || w.mode_echange !== "AUTOMATIQUE" || w.passerelle) continue;
    interroges++;
    const pourApi = await walletPourApi(base(), w.id);
    if (!pourApi) continue;
    const r = await lireSolde(pourApi);
    if (!r.ok) continue;
    const solde = Math.max(0, Math.round(r.solde));
    await transaction(async (tx) => {
      const avant = Number(await tx.valeur("SELECT solde_api FROM wallets WHERE id = ? FOR UPDATE", [w.id]));
      if (solde === avant) return;
      await tx.exec("UPDATE wallets SET solde_api = ?, date_maj = ? WHERE id = ?", [solde, Date.now(), w.id]);
      await alerterSolde(tx, w, avant, solde);
    });
  }
  return interroges;
}
async function soldesPasserelle(tx, operateurs) {
  await actualiserSoldes(tx, operateurs);
}
async function definirSoldeSimule(acteur, args) {
  exigerRole(acteur, ["SUPER_ADMIN"]);
  if (!config.modeTest) throw new Erreur("Le solde simulé n’est disponible qu’en mode test.");
  const id = entier(args.id, "wallet", 1);
  const nouveau = Math.max(0, Math.round(nombre2(args.solde, "solde", -1e12, 1e12)));
  await transaction(async (tx) => {
    const w = await walletParId(tx, id, true);
    if (!w) throw new Erreur("Wallet introuvable.");
    await tx.exec("UPDATE wallets SET solde_api = ?, date_maj = ? WHERE id = ?", [nouveau, Date.now(), id]);
    await journaliser(tx, acteur.id, "SOLDE_SIMULE", "Solde simulé de " + w.nom + " : " + fdj(w.solde_api) + " → " + fdj(nouveau));
    await alerterSolde(tx, w, w.solde_api, nouveau);
  });
}

// src/passerelle.ts
var MINUTE2 = 60 * 1e3;
var DELAI_VERIFICATION = 15 * MINUTE2;
var DELAI_ORDRE = 4 * MINUTE2;
var DELAI_ORDRE_NON_PRIS = 10 * MINUTE2;
var TOLERANCE_AVANT_DEMANDE = 2 * MINUTE2;
var DELAI_RECHERCHE_WAAFI = 2 * MINUTE2;
var MAX_HISTORIQUES = 3;
var ECART_HISTORIQUES = 30 * 1e3;
var MAX_ESSAIS_LECTURE = 3;
var DELAI_RESOLUTION_ENVOI = 20 * MINUTE2;
var DELAI_RELEVE_WAAFI = 3 * MINUTE2;
var ALPHABET_CODE = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
var SELECTION_P = "SELECT d.id, d.reference, d.utilisateur_id, d.wallet_source_id, d.wallet_dest_id, d.numero_source, d.numero_dest, d.montant, d.montant_net, d.statut, d.etape_passerelle, d.paiement_verifie, d.ref_api_source, d.date_creation, d.date_confirmation, d.taux_commission, d.mode_dest, ws.nom AS source_nom, wd.nom AS dest_nom, ws.passerelle AS source_passerelle, wd.passerelle AS dest_passerelle, wd.mode_echange AS dest_mode, u.nom_complet AS client_nom FROM demandes_echange d JOIN wallets ws ON ws.id = d.wallet_source_id JOIN wallets wd ON wd.id = d.wallet_dest_id JOIN utilisateurs u ON u.id = d.utilisateur_id ";
async function demandeP(b, id, verrouiller = false) {
  if (verrouiller && !await b.ligne("SELECT id FROM demandes_echange WHERE id = ? FOR UPDATE", [id])) return null;
  return b.ligne(SELECTION_P + "WHERE d.id = ?", [id]);
}
function propre(v, max) {
  return (typeof v === "string" ? v : "").replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, " ").substring(0, max);
}
function lireJson(t) {
  if (!t) return {};
  try {
    const o = JSON.parse(t);
    return o && typeof o === "object" ? o : {};
  } catch (e) {
    return {};
  }
}
function expediteursParDefaut(operateur) {
  return operateur === "DMONEY" ? "DMONEY" : "SALAAMBANK,WAAFI";
}
async function expediteursReconnus(b, operateur) {
  const v = await b.valeur("SELECT valeur FROM parametres WHERE cle = ?", ["passerelle_expediteurs_" + operateur.toLowerCase()]);
  return (v || expediteursParDefaut(operateur)).split(",").map(normaliserExpediteur).filter((x) => x.length > 0);
}
async function expediteurFiable(b, operateur, type, expediteur) {
  if (type === "NOTIFICATION") {
    const paquet = expediteur.toLowerCase();
    if (!/^[a-z][a-z0-9_]*(\.[a-z0-9_]+)+$/.test(paquet)) return false;
    return operateur === "WAAFI" ? paquet.indexOf("waafi") >= 0 : paquet.indexOf("dmoney") >= 0;
  }
  return (await expediteursReconnus(b, operateur)).indexOf(normaliserExpediteur(expediteur)) >= 0;
}
async function walletDe(b, operateur, verrouiller = false) {
  return b.ligne(
    "SELECT id, nom, mode_echange, seuil_alerte, solde_api, statut, compte_reception FROM wallets WHERE passerelle = ?" + (verrouiller ? " FOR UPDATE" : ""),
    [operateur]
  );
}
async function majSolde(b, operateur, solde) {
  const w = await walletDe(b, operateur, true);
  if (!w) return;
  await b.exec("UPDATE wallets SET solde_api = ?, solde_maj = ? WHERE id = ?", [solde, Date.now(), w.id]);
  if (solde !== w.solde_api) await alerterSolde(b, w, w.solde_api, solde);
}
async function creerOrdre(b, type, operateur, demandeId, motif, envoi) {
  return b.inserer(
    "INSERT INTO ordres_passerelle (type, operateur, demande_id, motif, montant, numero, statut, cle, date_creation) VALUES (?, ?, ?, ?, ?, ?, 'A_FAIRE', ?, ?)",
    [type, operateur, demandeId, motif, envoi ? envoi.montant : null, envoi ? envoi.numero : null, envoi ? envoi.cle : null, Date.now()]
  );
}
async function ordresDe(b, demandeId) {
  return b.lignes("SELECT * FROM ordres_passerelle WHERE demande_id = ? ORDER BY id", [demandeId]);
}
async function annulerOrdresEnAttente(b, demandeId) {
  await b.exec("UPDATE ordres_passerelle SET statut = 'ANNULE', date_fin = ? WHERE demande_id = ? AND statut = 'A_FAIRE'", [Date.now(), demandeId]);
}
async function envoiEnCours(b, demandeId) {
  return !!await b.ligne("SELECT id FROM ordres_passerelle WHERE demande_id = ? AND type = 'ENVOI' AND statut = 'EN_COURS'", [demandeId]);
}
async function bloquer2(b, d, motif) {
  const n = await b.exec(
    "UPDATE demandes_echange SET etape_passerelle = 'BLOQUEE', motif_blocage = ?, date_blocage = ? WHERE id = ? AND statut = 'EN_COURS'",
    [motif.substring(0, 500), Date.now(), d.id]
  );
  if (!n) return;
  await annulerOrdresEnAttente(b, d.id);
  await notifier(
    b,
    d.utilisateur_id,
    "ECHANGE_BLOQUE",
    "Échange en vérification",
    "Votre échange " + d.reference + " est vérifié par un administrateur. Vous n’avez rien à faire : vous serez prévenu dès qu’il sera terminé.",
    d.id
  );
  await notifierAdmins(b, "ECHANGE_BLOQUE", "Échange bloqué : " + d.reference, motif.substring(0, 300), d.id);
  await journaliser(b, null, "PASSERELLE_BLOCAGE", d.reference + " : " + motif);
}
async function terminer(b, d, refDest) {
  const commission = d.taux_commission != null ? pourcentageDe(d.montant, d.taux_commission) : 0;
  const n = await b.exec("UPDATE demandes_echange SET statut = 'TRAITEE', etape_passerelle = NULL, motif_blocage = NULL, ref_api_dest = ?, date_traitement = ?, commission = ? WHERE id = ? AND statut = 'EN_COURS'", [refDest, Date.now(), commission, d.id]);
  if (!n) return;
  await notifier(
    b,
    d.utilisateur_id,
    "ECHANGE_REUSSI",
    "Échange réussi",
    fdj(d.montant_net) + " envoyés au " + formatNumero(d.numero_dest) + " (" + d.dest_nom + "). Référence " + d.reference + ".",
    d.id
  );
  await journaliser(b, null, "PASSERELLE_ENVOI", "Demande " + d.reference + " : " + fdj(d.montant_net) + " envoyés par la passerelle au " + formatNumero(d.numero_dest) + " (" + d.dest_nom + ", ID " + refDest + ")");
}
async function lancerEnvoi(b, d) {
  if (!d.dest_passerelle) throw new Erreur("Le wallet " + d.dest_nom + " n’est pas géré par la passerelle.");
  await b.exec("UPDATE demandes_echange SET etape_passerelle = 'ENVOI', motif_blocage = NULL, date_blocage = NULL WHERE id = ? AND statut = 'EN_COURS'", [d.id]);
  await creerOrdre(b, "SOLDE", d.dest_passerelle, d.id, "AVANT_ENVOI");
}
async function raisonAccord(b, d) {
  const p = await chargerParametres(b);
  if (d.montant > p.passerelleMontantAuto) return "montant supérieur à " + fdj(p.passerelleMontantAuto);
  if (p.passerelleDelaiSecondes > 0) {
    const proche = await b.valeur(
      "SELECT COUNT(*) AS n FROM demandes_echange WHERE id <> ? AND date_creation > ? AND date_creation <= ?",
      [d.id, d.date_creation - p.passerelleDelaiSecondes * 1e3, d.date_creation]
    );
    if (Number(proche) > 0) return "une autre demande a été créée moins de " + p.passerelleDelaiSecondes + " secondes avant";
  }
  return null;
}
async function paiementProuve(b, d, op) {
  await b.exec("UPDATE demandes_echange SET paiement_verifie = 1, ref_api_source = ? WHERE id = ?", [op.operation_id, d.id]);
  const dd = await demandeP(b, d.id);
  if (dd.dest_passerelle && dd.dest_mode === "AUTOMATIQUE") {
    await envoyerOuDemanderAccord(b, dd, d.source_nom + ", ID " + op.operation_id);
    return;
  }
  await b.exec("UPDATE demandes_echange SET etape_passerelle = NULL, motif_blocage = NULL WHERE id = ?", [d.id]);
  await notifierAdmins(
    b,
    "DEMANDE_A_TRAITER",
    "Nouvelle demande à traiter",
    d.client_nom + " : " + d.source_nom + " → " + d.dest_nom + ", " + fdj(d.montant) + ". Paiement vérifié par la passerelle (ID " + op.operation_id + "), envoi à effectuer.",
    d.id
  );
}
async function envoyerOuDemanderAccord(b, d, preuve) {
  const raison = await raisonAccord(b, d);
  if (raison) {
    await b.exec("UPDATE demandes_echange SET etape_passerelle = 'ATTENTE_ACCORD', motif_blocage = ? WHERE id = ?", ["Accord requis : " + raison, d.id]);
    await notifierAdmins(
      b,
      "ACCORD_REQUIS",
      "Accord requis : " + d.reference,
      "Paiement de " + fdj(d.montant) + " vérifié (" + preuve + "). Envoi de " + fdj(d.montant_net) + " au " + formatNumero(d.numero_dest) + " (" + d.dest_nom + ") à autoriser : " + raison + ".",
      d.id
    );
    return;
  }
  await lancerEnvoi(b, d);
}
async function envoyerApresApi(b, demandeId, refSource) {
  const d = await demandeP(b, demandeId);
  if (!d) throw new Erreur("Demande introuvable.");
  await envoyerOuDemanderAccord(b, d, d.source_nom + ", réf. " + refSource);
}
async function enregistrerOperation(b, o, source, confirme) {
  const t = Date.now();
  const existante = await b.ligne("SELECT * FROM operations_operateur WHERE operateur = ? AND operation_id = ? FOR UPDATE", [o.operateur, o.operationId]);
  if (!existante) {
    await b.exec(
      "INSERT INTO operations_operateur (operateur, operation_id, sens, montant, numero, nom, date_operation, solde_apres, source, confirme_operateur, utilisee, date_creation) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0, ?) ON CONFLICT (operateur, operation_id) DO NOTHING",
      [o.operateur, o.operationId, o.sens, o.montant, o.numero, o.nom, o.date, o.soldeApres, source, confirme ? t : null, t]
    );
    return b.ligne("SELECT * FROM operations_operateur WHERE operateur = ? AND operation_id = ?", [o.operateur, o.operationId]);
  }
  const contradiction = o.sens && existante.sens && o.sens !== existante.sens || o.montant != null && existante.montant != null && o.montant !== existante.montant || o.numero && existante.numero && o.numero !== existante.numero;
  if (contradiction) {
    await notifierAdmins(
      b,
      "PASSERELLE_ALERTE",
      "Message contradictoire (" + nomOperateur(o.operateur) + ")",
      "L’identifiant " + o.operationId + " est déjà connu (" + (existante.sens || "?") + ", " + (existante.montant != null ? fdj(existante.montant) : "?") + ") mais un message (" + source + ") le décrit autrement. Le message est ignoré : vérifiez qu’il ne s’agit pas d’une fraude."
    );
    return null;
  }
  await b.exec(
    "UPDATE operations_operateur SET sens = COALESCE(sens, ?), montant = COALESCE(montant, ?), numero = COALESCE(numero, ?), nom = COALESCE(nom, ?), date_operation = COALESCE(date_operation, ?), solde_apres = COALESCE(solde_apres, ?)" + (confirme ? ", confirme_operateur = COALESCE(confirme_operateur, ?)" : "") + " WHERE id = ?",
    [o.sens, o.montant, o.numero, o.nom, o.date, o.soldeApres].concat(confirme ? [t] : []).concat([existante.id])
  );
  return b.ligne("SELECT * FROM operations_operateur WHERE id = ?", [existante.id]);
}
async function rattacherPaiement(b, d) {
  const deja = await b.ligne("SELECT * FROM operations_operateur WHERE demande_id = ? AND role = 'PAIEMENT'", [d.id]);
  if (deja) return deja;
  if (!d.source_passerelle) return null;
  const candidat = await b.ligne(
    "SELECT * FROM operations_operateur WHERE operateur = ? AND sens = 'RECU' AND utilisee = 0 AND demande_id IS NULL AND montant = ? AND numero = ? AND COALESCE(date_operation, date_creation) >= ? ORDER BY id LIMIT 1 FOR UPDATE SKIP LOCKED",
    [d.source_passerelle, d.montant, d.numero_source, d.date_creation - TOLERANCE_AVANT_DEMANDE]
  );
  if (!candidat) return null;
  const n = await b.exec("UPDATE operations_operateur SET demande_id = ?, role = 'PAIEMENT', utilisee = 1 WHERE id = ? AND utilisee = 0", [d.id, candidat.id]);
  if (!n) return null;
  await journaliser(b, null, "PASSERELLE_PAIEMENT", "Demande " + d.reference + " : paiement " + nomOperateur(d.source_passerelle) + " ID " + candidat.operation_id + " (" + fdj(d.montant) + " du " + formatNumero(d.numero_source) + ") rattaché");
  return b.ligne("SELECT * FROM operations_operateur WHERE id = ?", [candidat.id]);
}
async function avancerVerification(b, d) {
  const operateur = d.source_passerelle;
  if (!operateur) {
    await bloquer2(b, d, "Le wallet " + d.source_nom + " n’est plus lu par la passerelle : vérifiez le paiement à la main.");
    return;
  }
  const t = Date.now();
  const debut = d.date_confirmation || d.date_creation;
  const ordres = await ordresDe(b, d.id);
  const enAttente = ordres.some((o) => o.statut === "A_FAIRE" || o.statut === "EN_COURS");
  const p = await rattacherPaiement(b, d);
  if (!p) {
    if (t - debut > DELAI_VERIFICATION) {
      await bloquer2(b, d, "Paiement introuvable : aucun message " + nomOperateur(operateur) + " ne correspond (" + fdj(d.montant) + " du " + formatNumero(d.numero_source) + ") depuis la confirmation du client.");
      return;
    }
    const recherches = ordres.filter((o) => o.motif === "RECHERCHE");
    if (operateur === "WAAFI" && !enAttente && t - debut > DELAI_RECHERCHE_WAAFI && recherches.length < 2 && (!recherches.length || t - (recherches[recherches.length - 1].date_fin || 0) > 2 * MINUTE2) && !await b.ligne("SELECT id FROM ordres_passerelle WHERE operateur = 'WAAFI' AND type = 'HISTORIQUE' AND statut IN ('A_FAIRE', 'EN_COURS') LIMIT 1")) {
      await creerOrdre(b, "HISTORIQUE", "WAAFI", d.id, "RECHERCHE");
    }
    return;
  }
  if (!p.confirme_operateur) {
    if (enAttente) return;
    const verifs = ordres.filter((o) => o.type === "HISTORIQUE");
    if (verifs.length >= MAX_HISTORIQUES) {
      await bloquer2(b, d, "Paiement " + nomOperateur(operateur) + " ID " + p.operation_id + " non retrouvé dans l’historique de l’opérateur après " + verifs.length + " consultations : message de réception douteux, ou historique trop chargé.");
      return;
    }
    const derniere = verifs[verifs.length - 1];
    if (!derniere || t - (derniere.date_fin || derniere.date_creation) >= ECART_HISTORIQUES) {
      const prevue = await b.ligne(
        "SELECT id FROM ordres_passerelle WHERE operateur = ? AND type = 'HISTORIQUE' AND statut IN ('A_FAIRE', 'EN_COURS') LIMIT 1",
        [operateur]
      );
      if (!prevue) await creerOrdre(b, "HISTORIQUE", operateur, d.id, "VERIFICATION");
    }
    return;
  }
  if (operateur === "WAAFI" && p.source !== "NOTIFICATION") {
    const controles = ordres.filter((o) => o.motif === "CONTROLE_SOLDE");
    const fait = controles.find((o) => o.statut === "FAIT" && lireJson(o.resultat).coherent === true);
    if (!fait) {
      if (enAttente) return;
      const rate = controles.find((o) => o.statut === "FAIT" && lireJson(o.resultat).coherent === false);
      if (rate) return;
      if (controles.filter((o) => o.statut === "ECHEC").length >= MAX_ESSAIS_LECTURE) {
        await bloquer2(b, d, "Solde Waafi illisible : le contrôle du paiement ID " + p.operation_id + " n’a pas pu être fait.");
        return;
      }
      await creerOrdre(b, "SOLDE", "WAAFI", d.id, "CONTROLE_SOLDE");
      return;
    }
  }
  await paiementProuve(b, d, p);
}
async function traiterMessage(passerelleId, m) {
  await transaction(async (b) => {
    const id = await b.valeur(
      "INSERT INTO messages_passerelle (passerelle_id, id_local, type, expediteur, texte, recu_a, date_reception) VALUES (?, ?, ?, ?, ?, ?, ?) ON CONFLICT (passerelle_id, id_local) DO NOTHING RETURNING id",
      [passerelleId, m.idLocal, m.type, m.expediteur, m.texte, m.recuA, Date.now()]
    );
    if (!id) return;
    const a2 = analyserMessage(m.texte);
    if (!a2.operateur || !a2.nature) {
      await b.exec("UPDATE messages_passerelle SET nature = 'IGNORE', lecture = ? WHERE id = ?", [a2.resume, id]);
      return;
    }
    if (!await expediteurFiable(b, a2.operateur, m.type, m.expediteur)) {
      await b.exec(
        "UPDATE messages_passerelle SET operateur = ?, nature = 'NON_FIABLE', lecture = ? WHERE id = ?",
        [a2.operateur, "Expéditeur non reconnu : " + a2.resume, id]
      );
      if (a2.operations.length) {
        await notifierAdmins(
          b,
          "PASSERELLE_ALERTE",
          "Message suspect ignoré",
          "Un message qui ressemble à " + nomOperateur(a2.operateur) + " est arrivé de « " + m.expediteur.substring(0, 40) + " » (" + a2.resume + "). Il est ignoré. Si c’est bien l’opérateur, ajoutez cet expéditeur dans l’écran Passerelle."
        );
      }
      return;
    }
    await b.exec("UPDATE messages_passerelle SET operateur = ?, nature = ?, lecture = ? WHERE id = ?", [a2.operateur, a2.nature, a2.resume, id]);
    const source = m.type === "NOTIFICATION" ? "NOTIFICATION" : a2.nature === "RELEVE" ? "RELEVE" : "SMS";
    for (const o of a2.operations) await enregistrerOperation(b, o, source, false);
    if (a2.solde != null && (a2.nature === "RECEPTION" || a2.nature === "ENVOI" || a2.nature === "SOLDE")) await majSolde(b, a2.operateur, a2.solde);
    if (a2.nature === "RELEVE" && a2.operateur === "WAAFI") await rattacherReleveWaafi(b, a2.operations);
    if (a2.nature === "ENVOI") for (const o of a2.operations) await resoudreEnvoiIncertain(b, o);
  });
}
async function rattacherReleveWaafi(b, ops) {
  const ordre = await b.ligne("SELECT * FROM ordres_passerelle WHERE operateur = 'WAAFI' AND type = 'HISTORIQUE' AND statut = 'FAIT' AND date_fin >= ? ORDER BY id DESC LIMIT 1 FOR UPDATE", [Date.now() - DELAI_RELEVE_WAAFI]);
  if (!ordre) return;
  const r = lireJson(ordre.resultat);
  if (r.releve) return;
  for (const o of ops) await enregistrerOperation(b, o, "RELEVE", true);
  r.releve = true;
  await b.exec("UPDATE ordres_passerelle SET resultat = ? WHERE id = ?", [JSON.stringify(r), ordre.id]);
}
async function resoudreEnvoiIncertain(b, o) {
  if (o.sens !== "ENVOYE" || o.montant == null) return;
  const op = await b.ligne("SELECT * FROM operations_operateur WHERE operateur = ? AND operation_id = ?", [o.operateur, o.operationId]);
  if (!op || op.demande_id) return;
  const quand = o.date || Date.now();
  const ordre = await b.ligne(
    "SELECT * FROM ordres_passerelle WHERE type = 'ENVOI' AND operateur = ? AND statut IN ('INCERTAIN', 'EN_COURS') AND montant = ? AND date_prise IS NOT NULL AND date_prise <= ? AND date_prise >= ? " + (o.numero ? "AND numero = ? " : "") + "ORDER BY id DESC LIMIT 1 FOR UPDATE",
    [o.operateur, o.montant, quand + MINUTE2, Date.now() - DELAI_RESOLUTION_ENVOI].concat(o.numero ? [o.numero] : [])
  );
  if (!ordre || !ordre.demande_id) return;
  await b.exec("UPDATE operations_operateur SET demande_id = ?, role = 'VERSEMENT', utilisee = 1 WHERE id = ? AND demande_id IS NULL", [ordre.demande_id, op.id]);
  await b.exec(
    "UPDATE ordres_passerelle SET statut = 'FAIT', date_fin = ?, erreur = ? WHERE id = ?",
    [Date.now(), "Confirmé par le SMS de l’opérateur (ID " + o.operationId + ")", ordre.id]
  );
  const d = await demandeP(b, ordre.demande_id, true);
  if (!d) return;
  if (d.statut === "EN_COURS") {
    await terminer(b, d, o.operationId);
    await notifierAdmins(
      b,
      "PASSERELLE_INFO",
      "Envoi confirmé : " + d.reference,
      "L’envoi de " + fdj(d.montant_net) + " au " + formatNumero(d.numero_dest) + " a bien eu lieu (SMS de l’opérateur, ID " + o.operationId + ") : la demande est traitée.",
      d.id
    );
  } else if (d.statut === "TRAITEE") {
    await notifierAdmins(
      b,
      "PASSERELLE_ALERTE",
      "Double envoi possible : " + d.reference,
      "L’envoi automatique de " + fdj(d.montant_net) + " au " + formatNumero(d.numero_dest) + " a finalement réussi (ID " + o.operationId + ") alors que la demande a été traitée à la main. Vérifiez si le client a été payé deux fois.",
      d.id
    );
  }
}
function lireResultat(v) {
  const o = objet(v, "résultat");
  return {
    ordreId: entier(o.ordreId, "ordre", 1),
    statut: parmi(o.statut, ["FAIT", "ECHEC", "INCERTAIN"], "statut de l’ordre"),
    ecrans: tableau(o.ecrans, "écrans", 30).map((e) => propre(e, 1500)),
    sms: tableau(o.sms, "SMS", 5).map((x) => {
      const s2 = objet(x, "SMS");
      return { expediteur: propre(s2.expediteur, 100), texte: propre(s2.texte, 2e3), recuA: Number(s2.recuA) || Date.now() };
    }),
    pinSaisi: booleen(o.pinSaisi),
    erreur: propre(o.erreur, 300)
  };
}
async function terminerOrdre(b, ordre, statut, resultat, erreur) {
  await b.exec(
    "UPDATE ordres_passerelle SET statut = ?, resultat = ?, erreur = ?, date_fin = ? WHERE id = ?",
    [statut, JSON.stringify(resultat).substring(0, 2e4), erreur ? erreur.substring(0, 500) : null, Date.now(), ordre.id]
  );
}
async function traiterResultat(r) {
  await transaction(async (b) => {
    const ordre = await b.ligne("SELECT * FROM ordres_passerelle WHERE id = ? FOR UPDATE", [r.ordreId]);
    if (!ordre || ordre.statut !== "EN_COURS") return;
    const resultat = { ecrans: r.ecrans, pinSaisi: r.pinSaisi };
    const d = ordre.demande_id ? await demandeP(b, ordre.demande_id, true) : null;
    const actif = !!d && d.statut === "EN_COURS";
    if (ordre.type === "SOLDE") {
      const soldes = r.ecrans.map((e) => lireEcranSolde(ordre.operateur, e)).filter((x) => x != null);
      const solde = soldes.length ? soldes[soldes.length - 1] : null;
      if (solde == null) {
        await echecLecture(b, ordre, resultat, r.erreur || "Solde illisible à l’écran", d);
        return;
      }
      resultat.solde = solde;
      await majSolde(b, ordre.operateur, solde);
      if (ordre.motif === "CONTROLE_SOLDE" && d && actif) {
        const paiement = await b.ligne("SELECT * FROM operations_operateur WHERE demande_id = ? AND role = 'PAIEMENT'", [d.id]);
        const attendu = paiement ? await soldeAttendu(b, ordre.operateur, ordre.id, paiement) : null;
        resultat.attendu = attendu;
        resultat.coherent = attendu != null && solde >= attendu;
        await terminerOrdre(b, ordre, "FAIT", resultat, null);
        if (!resultat.coherent) {
          await bloquer2(b, d, attendu == null ? "Solde " + nomOperateur(ordre.operateur) + " impossible à contrôler : aucun solde lu à l’écran avant ce paiement. Vérifiez le paiement sur le téléphone (puis « Valider le paiement »)." : "Solde " + nomOperateur(ordre.operateur) + " incohérent : " + fdj(solde) + " affiché par l’opérateur, au moins " + fdj(attendu) + " attendu avec ce paiement. Le message de réception est peut-être faux : vérifiez sur le téléphone.");
        }
        return;
      }
      await terminerOrdre(b, ordre, "FAIT", resultat, null);
      if (ordre.motif === "AVANT_ENVOI" && d && actif && d.etape_passerelle === "ENVOI") {
        if (solde < d.montant_net) {
          await bloquer2(b, d, "Solde " + nomOperateur(ordre.operateur) + " insuffisant : " + fdj(solde) + " pour un envoi de " + fdj(d.montant_net) + ". Rechargez le compte, puis relancez l’envoi.");
          return;
        }
        const n = (await ordresDe(b, d.id)).filter((o) => o.type === "ENVOI").length + 1;
        await creerOrdre(b, "ENVOI", ordre.operateur, d.id, "ENVOI", { montant: d.montant_net, numero: d.numero_dest, cle: "ENVOI-" + d.id + "-" + n });
      }
      return;
    }
    if (ordre.type === "HISTORIQUE") {
      if (ordre.operateur === "DMONEY") {
        const lignes = r.ecrans.map(lireEcranHistoriqueDmoney).filter((l) => l.length).pop() || [];
        if (!lignes.length) {
          await echecLecture(b, ordre, resultat, r.erreur || "Historique illisible à l’écran", d);
          return;
        }
        resultat.lignes = lignes;
        for (const l of lignes) await confirmerParHistorique(b, l);
      } else {
        if (!r.ecrans.some(releveWaafiEnvoye)) {
          await echecLecture(b, ordre, resultat, r.erreur || "Mini-relevé non envoyé par Waafi", d);
          return;
        }
        resultat.releve = false;
        for (const s2 of r.sms) {
          if (!await expediteurFiable(b, "WAAFI", "SMS", s2.expediteur)) continue;
          const ops = lireReleveWaafi(s2.texte);
          if (!ops.length) continue;
          for (const o of ops) await enregistrerOperation(b, o, "RELEVE", true);
          resultat.releve = true;
          resultat.operations = ops.map((o) => o.operationId);
        }
      }
      await terminerOrdre(b, ordre, "FAIT", resultat, null);
      return;
    }
    const lu = r.ecrans.map((e) => lireEcranEnvoi(ordre.operateur, e)).filter((x) => !!x).pop() || null;
    if (lu) {
      resultat.operation = lu.operationId;
      resultat.montantEcran = lu.montant;
      resultat.soldeEcran = lu.soldeApres;
      const op = await enregistrerOperation(b, lu, "ECRAN", true);
      if (op && !op.demande_id && d) {
        await b.exec("UPDATE operations_operateur SET demande_id = ?, role = 'VERSEMENT', utilisee = 1 WHERE id = ?", [d.id, op.id]);
      }
      if (lu.soldeApres != null) await majSolde(b, ordre.operateur, lu.soldeApres);
      await terminerOrdre(b, ordre, "FAIT", resultat, null);
      if (!d) return;
      if (lu.montant !== ordre.montant || lu.numero && lu.numero !== ordre.numero) {
        await bloquer2(b, d, "Envoi effectué mais différent de la demande (ID " + lu.operationId + " : " + (lu.montant != null ? fdj(lu.montant) : "?") + (lu.numero ? " au " + formatNumero(lu.numero) : "") + " au lieu de " + fdj(ordre.montant || 0) + " au " + formatNumero(ordre.numero) + ").");
        return;
      }
      if (actif) await terminer(b, d, lu.operationId);
      return;
    }
    if (r.statut === "ECHEC") {
      await terminerOrdre(b, ordre, "ECHEC", resultat, r.erreur || "Échec");
      if (d && actif) {
        await bloquer2(b, d, "Envoi automatique impossible, aucun argent n’est parti" + (r.pinSaisi ? " (refus de l’opérateur)" : "") + " : " + (r.erreur || "échec") + ". Vous pouvez relancer l’envoi, l’effectuer à la main ou refuser la demande.");
      }
      return;
    }
    await terminerOrdre(b, ordre, "INCERTAIN", resultat, r.erreur || "Issue inconnue");
    if (d && actif) await bloquerIncertain(b, d, ordre, r.erreur || "pas d’écran de confirmation");
  });
}
async function bloquerIncertain(b, d, ordre, raison) {
  await bloquer2(b, d, "Envoi incertain (" + raison + ") : la passerelle ne sait pas si " + fdj(ordre.montant || 0) + " sont partis vers le " + formatNumero(ordre.numero) + ". Vérifiez l’historique " + nomOperateur(ordre.operateur) + " avant toute action : si l’argent est parti, confirmez la demande ; sinon, relancez l’envoi. La demande sera confirmée seule si le SMS de l’opérateur arrive.");
}
async function soldeAttendu(b, operateur, ordreId, p) {
  const points = await b.lignes(
    "SELECT type, resultat, date_fin FROM ordres_passerelle WHERE operateur = ? AND statut = 'FAIT' AND type IN ('SOLDE', 'ENVOI') AND id <> ? AND date_fin < ? ORDER BY date_fin DESC, id DESC LIMIT 10",
    [operateur, ordreId, p.date_creation]
  );
  let base2 = null;
  let quand = 0;
  for (const pt of points) {
    const r = lireJson(pt.resultat);
    const v = pt.type === "SOLDE" ? r.solde : r.soldeEcran;
    if (typeof v === "number" && isFinite(v)) {
      base2 = v;
      quand = Number(pt.date_fin);
      break;
    }
  }
  if (base2 == null || p.montant == null) return null;
  const recus = Number(await b.valeur(
    "SELECT COALESCE(SUM(montant), 0) AS s FROM operations_operateur WHERE operateur = ? AND sens = 'RECU' AND montant IS NOT NULL AND id <> ? AND date_creation > ? AND NOT (source = 'RELEVE' AND date_operation IS NOT NULL AND date_operation < ?)",
    [operateur, p.id, quand, quand - 5 * MINUTE2]
  ));
  const envois = await b.lignes("SELECT resultat FROM ordres_passerelle WHERE operateur = ? AND type = 'ENVOI' AND statut = 'FAIT' AND date_fin > ?", [operateur, quand]);
  const envoye = envois.map((o) => lireJson(o.resultat).montantEcran).filter((m) => typeof m === "number" && isFinite(m)).reduce((s2, m) => s2 + m, 0);
  return base2 + Number(p.montant) + recus - envoye;
}
async function echecLecture(b, ordre, resultat, erreur, d) {
  await terminerOrdre(b, ordre, "ECHEC", resultat, erreur);
  if (!d || d.statut !== "EN_COURS") return;
  const memes = (await ordresDe(b, d.id)).filter((o) => o.type === ordre.type && o.motif === ordre.motif && o.statut === "ECHEC").length;
  if (memes < MAX_ESSAIS_LECTURE) {
    if (ordre.motif === "AVANT_ENVOI" || ordre.motif === "CONTROLE_SOLDE") await creerOrdre(b, ordre.type, ordre.operateur, d.id, ordre.motif);
    return;
  }
  await bloquer2(b, d, (ordre.type === "SOLDE" ? "Lecture du solde " : "Lecture de l’historique ") + nomOperateur(ordre.operateur) + " impossible après " + memes + " essais (" + erreur + ").");
}
async function confirmerParHistorique(b, l) {
  const op = await b.ligne("SELECT * FROM operations_operateur WHERE operateur = 'DMONEY' AND operation_id = ? FOR UPDATE", [l.operationId]);
  const t = Date.now();
  if (!op) {
    await b.exec("INSERT INTO operations_operateur (operateur, operation_id, montant, date_operation, source, confirme_operateur, utilisee, date_creation) VALUES ('DMONEY', ?, ?, ?, 'ECRAN', ?, 0, ?) ON CONFLICT (operateur, operation_id) DO NOTHING", [l.operationId, l.montant, l.date, t, t]);
    return;
  }
  if (op.confirme_operateur) return;
  const montantOk = op.montant == null || l.montant == null || op.montant === l.montant;
  const dateOk = op.date_operation == null || l.date == null || Math.abs(op.date_operation - l.date) <= 2 * MINUTE2;
  if (!montantOk || !dateOk) {
    await notifierAdmins(
      b,
      "PASSERELLE_ALERTE",
      "Historique D-Money différent du SMS",
      "L’opération " + l.operationId + " apparaît dans l’historique avec " + (l.montant != null ? fdj(l.montant) : "?") + ", mais le SMS reçu annonçait " + (op.montant != null ? fdj(op.montant) : "?") + ". Le SMS est peut-être faux."
    );
    return;
  }
  await b.exec("UPDATE operations_operateur SET confirme_operateur = ?, montant = COALESCE(montant, ?) WHERE id = ?", [t, l.montant, op.id]);
}
var avancementEnCours = null;
var avancementDemande = false;
function avancer() {
  if (avancementEnCours) {
    avancementDemande = true;
    return avancementEnCours;
  }
  avancementEnCours = (async () => {
    try {
      do {
        avancementDemande = false;
        await unPassage();
      } while (avancementDemande);
    } finally {
      avancementEnCours = null;
    }
  })();
  return avancementEnCours;
}
async function unPassage() {
  try {
    await expirerOrdres();
  } catch (e) {
    console.error("[passerelle] délais des ordres :", e && e.message);
  }
  const ids = await base().lignes("SELECT id FROM demandes_echange WHERE statut = 'EN_COURS' AND etape_passerelle = 'VERIF_PAIEMENT' ORDER BY id");
  for (const { id } of ids) {
    try {
      await transaction(async (b) => {
        const d = await demandeP(b, id, true);
        if (d && d.statut === "EN_COURS" && d.etape_passerelle === "VERIF_PAIEMENT") await avancerVerification(b, d);
      });
    } catch (e) {
      console.error("[passerelle] demande " + id + " :", e && e.message);
    }
  }
}
function declencher() {
  avancer().catch((e) => console.error("[passerelle] avancement :", e && e.message));
}
async function expirerOrdres() {
  const t = Date.now();
  const expires = await base().lignes(
    "SELECT id FROM ordres_passerelle WHERE (statut = 'EN_COURS' AND date_prise < ?) OR (statut = 'A_FAIRE' AND date_creation < ?) ORDER BY id",
    [t - DELAI_ORDRE, t - DELAI_ORDRE_NON_PRIS]
  );
  for (const { id } of expires) {
    await transaction(async (b) => {
      const ordre = await b.ligne("SELECT * FROM ordres_passerelle WHERE id = ? FOR UPDATE", [id]);
      if (!ordre) return;
      const d = ordre.demande_id ? await demandeP(b, ordre.demande_id, true) : null;
      const actif = !!d && d.statut === "EN_COURS";
      if (ordre.statut === "A_FAIRE" && ordre.date_creation < t - DELAI_ORDRE_NON_PRIS) {
        await terminerOrdre(b, ordre, "ANNULE", {}, "Jamais pris par le téléphone passerelle");
        if (d && actif) {
          await bloquer2(b, d, "Téléphone passerelle injoignable : l’ordre " + ordre.type.toLowerCase() + " " + nomOperateur(ordre.operateur) + " n’a pas été exécuté en " + Math.round(DELAI_ORDRE_NON_PRIS / MINUTE2) + " minutes. Aucun envoi n’a été fait.");
        }
        return;
      }
      if (ordre.statut !== "EN_COURS" || !ordre.date_prise || ordre.date_prise >= t - DELAI_ORDRE) return;
      if (ordre.type === "ENVOI") {
        await terminerOrdre(b, ordre, "INCERTAIN", {}, "Aucun résultat du téléphone");
        if (d && actif) await bloquerIncertain(b, d, ordre, "aucun résultat du téléphone");
        return;
      }
      if (ordre.tentatives < MAX_ESSAIS_LECTURE) {
        await b.exec("UPDATE ordres_passerelle SET statut = 'A_FAIRE', date_prise = NULL, date_creation = ? WHERE id = ?", [t, ordre.id]);
        return;
      }
      await echecLecture(b, ordre, {}, "Aucun résultat du téléphone", d);
    });
  }
}
async function passerelleParJeton(jeton) {
  if (!/^[0-9a-f]{64}$/.test(jeton)) return null;
  return base().ligne("SELECT id FROM passerelles WHERE jeton_hash = ? AND actif = 1", [sha256Hex(jeton)]);
}
async function creerCode(acteur) {
  exigerRole(acteur, ["SUPER_ADMIN"]);
  let code = "";
  for (let i = 0; i < 8; i++) code += ALPHABET_CODE.charAt(aleaEntier(ALPHABET_CODE.length));
  const expire = Date.now() + 10 * MINUTE2;
  await transaction(async (b) => {
    const p = await b.ligne("SELECT id FROM passerelles ORDER BY id LIMIT 1 FOR UPDATE");
    if (p) await b.exec("UPDATE passerelles SET code_hash = ?, code_expire = ? WHERE id = ?", [sha256Hex(code), expire, p.id]);
    else await b.exec("INSERT INTO passerelles (nom, code_hash, code_expire, actif, date_creation) VALUES (?, ?, ?, 0, ?)", ["Téléphone passerelle", sha256Hex(code), expire, Date.now()]);
    await journaliser(b, acteur.id, "PASSERELLE_CODE", "Code d’association de la passerelle créé (valable 10 minutes)");
  });
  return { code, expire };
}
async function associer(args) {
  const code = texte(args.code, "code", 40).toUpperCase().replace(/[^A-Z0-9]/g, "");
  if (code.length !== 8) throw new Erreur("Code d’association invalide ou expiré.");
  const appareil = args.appareil && typeof args.appareil === "object" ? args.appareil : {};
  const nom = propre(appareil.modele, 60).trim() || "Téléphone passerelle";
  const jeton = aleaHex(32);
  await transaction(async (b) => {
    const p = await b.ligne("SELECT id FROM passerelles WHERE code_hash = ? AND code_expire > ? FOR UPDATE", [sha256Hex(code), Date.now()]);
    if (!p) throw new Erreur("Code d’association invalide ou expiré.");
    await b.exec(
      "UPDATE passerelles SET jeton_hash = ?, code_hash = NULL, code_expire = NULL, actif = 1, nom = ?, date_association = ?, dernier_contact = ? WHERE id = ?",
      [sha256Hex(jeton), nom, Date.now(), Date.now(), p.id]
    );
    await journaliser(b, null, "PASSERELLE_ASSOCIATION", "Téléphone passerelle associé : " + nom);
    await notifierAdmins(b, "PASSERELLE_INFO", "Téléphone passerelle associé", nom + " est maintenant le téléphone passerelle.");
  });
  return { jeton };
}
async function dissocier(acteur) {
  exigerRole(acteur, ["SUPER_ADMIN"]);
  await transaction(async (b) => {
    await b.exec("UPDATE passerelles SET actif = 0, jeton_hash = NULL, code_hash = NULL, code_expire = NULL");
    await journaliser(b, acteur.id, "PASSERELLE_DISSOCIATION", "Téléphone passerelle dissocié");
  });
}
async function synchroniser(passerelleId, args) {
  const etat2 = args.etat && typeof args.etat === "object" && !Array.isArray(args.etat) ? args.etat : {};
  const etatTexte = JSON.stringify(etat2).substring(0, 2e3);
  await base().exec("UPDATE passerelles SET dernier_contact = ?, etat = ? WHERE id = ?", [Date.now(), etatTexte, passerelleId]);
  const resultats = tableau(args.resultats, "résultats", 10).map(lireResultat);
  const messages = tableau(args.messages, "messages", 50).map((brut) => {
    const o = objet(brut, "message");
    const m = {
      idLocal: propre(o.id, 80).trim(),
      type: parmi(o.type, ["SMS", "NOTIFICATION"], "type de message"),
      expediteur: propre(o.expediteur, 100).trim() || "?",
      texte: propre(o.texte, 2e3),
      recuA: Math.max(0, Number(o.recuA) || Date.now())
    };
    if (!m.idLocal) throw new Erreur("Message sans identifiant.");
    return m;
  });
  const resultatsAcquittes = [];
  for (const r of resultats) {
    await traiterResultat(r);
    resultatsAcquittes.push(r.ordreId);
  }
  const acquittes = [];
  for (const m of messages) {
    await traiterMessage(passerelleId, m);
    acquittes.push(m.idLocal);
  }
  await avancer();
  const ordre = await transaction(async (b) => {
    if (await b.ligne("SELECT id FROM ordres_passerelle WHERE statut = 'EN_COURS' LIMIT 1")) return null;
    const o = await b.ligne("SELECT * FROM ordres_passerelle WHERE statut = 'A_FAIRE' ORDER BY id LIMIT 1 FOR UPDATE SKIP LOCKED");
    if (!o) return null;
    await b.exec("UPDATE ordres_passerelle SET statut = 'EN_COURS', date_prise = ?, tentatives = tentatives + 1 WHERE id = ?", [Date.now(), o.id]);
    return o;
  });
  const actif = !!ordre || !!await base().ligne("SELECT id FROM ordres_passerelle WHERE statut IN ('A_FAIRE', 'EN_COURS') LIMIT 1") || !!await base().ligne("SELECT id FROM demandes_echange WHERE statut IN ('EN_ATTENTE', 'EN_COURS') AND (etape_passerelle IN ('VERIF_PAIEMENT', 'ENVOI') OR (statut = 'EN_ATTENTE' AND date_creation > ?)) LIMIT 1", [Date.now() - 30 * MINUTE2]);
  return {
    acquittes,
    resultatsAcquittes,
    ordres: ordre ? [{ id: ordre.id, type: ordre.type, operateur: ordre.operateur, montant: ordre.montant, numero: ordre.numero }] : [],
    prochainAppel: actif ? 10 : 60
  };
}
async function commencerVerification(b, demandeId) {
  await b.exec("UPDATE demandes_echange SET etape_passerelle = 'VERIF_PAIEMENT', motif_blocage = NULL WHERE id = ?", [demandeId]);
}
async function envoyerApresAttestation(b, demandeId) {
  const d = await demandeP(b, demandeId);
  if (!d) throw new Erreur("Demande introuvable.");
  await b.exec("UPDATE demandes_echange SET paiement_verifie = CASE WHEN paiement_verifie = 0 THEN 2 ELSE paiement_verifie END WHERE id = ?", [d.id]);
  await lancerEnvoi(b, d);
}
async function demandeAdmin(b, args) {
  const id = entier(args.id, "demande", 1);
  const d = await demandeP(b, id, true);
  if (!d) throw new Erreur("Demande introuvable.");
  if (d.statut !== "EN_COURS" || !d.etape_passerelle) throw new Erreur("Cette demande n’est pas traitée par la passerelle.");
  return d;
}
async function autoriserEnvoi(acteur, args) {
  exigerRole(acteur, ["ADMIN", "SUPER_ADMIN"]);
  await transaction(async (b) => {
    const d = await demandeAdmin(b, args);
    if (d.etape_passerelle !== "ATTENTE_ACCORD" && d.etape_passerelle !== "BLOQUEE") throw new Erreur("L’envoi de cette demande est déjà en cours.");
    if (!d.paiement_verifie) throw new Erreur("Le paiement du client n’est pas encore vérifié : validez-le d’abord.");
    if (!d.dest_passerelle || d.dest_mode !== "AUTOMATIQUE") throw new Erreur("Le wallet " + d.dest_nom + " n’est pas en envoi automatique par la passerelle.");
    const envois = (await ordresDe(b, d.id)).filter((o) => o.type === "ENVOI");
    if (envois.some((o) => o.statut === "EN_COURS" || o.statut === "A_FAIRE")) throw new Erreur("Un envoi automatique est déjà en cours.");
    if (envois.some((o) => o.statut === "INCERTAIN" || o.statut === "FAIT") && !booleen(args.verifie)) {
      throw new Erreur("Un envoi a peut-être déjà eu lieu : vérifiez l’historique " + d.dest_nom + " et confirmez que l’argent n’est pas parti.");
    }
    await lancerEnvoi(b, d);
    await journaliser(b, acteur.id, "PASSERELLE_ACCORD", "Envoi automatique autorisé pour la demande " + d.reference + " (" + fdj(d.montant_net) + ")");
  });
  declencher();
}
async function validerPaiement(acteur, args) {
  exigerRole(acteur, ["ADMIN", "SUPER_ADMIN"]);
  await transaction(async (b) => {
    const d = await demandeAdmin(b, args);
    if (d.paiement_verifie) throw new Erreur("Le paiement est déjà vérifié.");
    if (d.etape_passerelle !== "VERIF_PAIEMENT" && d.etape_passerelle !== "BLOQUEE") throw new Erreur("Action impossible à cette étape.");
    await annulerOrdresEnAttente(b, d.id);
    await b.exec("UPDATE demandes_echange SET paiement_verifie = 2 WHERE id = ?", [d.id]);
    await journaliser(b, acteur.id, "PASSERELLE_PAIEMENT_MANUEL", "Paiement de la demande " + d.reference + " vérifié à la main (" + fdj(d.montant) + ")");
    if (d.dest_passerelle && d.dest_mode === "AUTOMATIQUE") {
      await lancerEnvoi(b, d);
    } else {
      await b.exec("UPDATE demandes_echange SET etape_passerelle = NULL, motif_blocage = NULL WHERE id = ?", [d.id]);
    }
  });
  declencher();
}
async function preparerDecisionManuelle(b, demandeId) {
  if (await envoiEnCours(b, demandeId)) {
    throw new Erreur("Un envoi automatique est en cours sur le téléphone passerelle : attendez son résultat (quelques minutes au plus).");
  }
  await annulerOrdresEnAttente(b, demandeId);
  await b.exec("UPDATE demandes_echange SET etape_passerelle = NULL WHERE id = ?", [demandeId]);
}
async function etat(acteur) {
  exigerRole(acteur, ["SUPER_ADMIN"]);
  const b = base();
  const p = await b.ligne("SELECT id, nom, actif, etat, code_expire, date_association, dernier_contact FROM passerelles ORDER BY id LIMIT 1");
  const wallets = await b.lignes("SELECT id, nom, passerelle, statut, mode_echange, type_compte, compte_reception, solde_api, solde_maj FROM wallets ORDER BY ordre, id");
  const ordres = await b.lignes("SELECT o.id, o.type, o.operateur, o.motif, o.montant, o.numero, o.statut, o.tentatives, o.erreur, o.date_creation, o.date_prise, o.date_fin, d.reference FROM ordres_passerelle o LEFT JOIN demandes_echange d ON d.id = o.demande_id ORDER BY o.id DESC LIMIT 20");
  const operations = await b.lignes("SELECT o.id, o.operateur, o.operation_id, o.sens, o.montant, o.numero, o.nom, o.date_operation, o.solde_apres, o.source, o.confirme_operateur, o.role, o.utilisee, o.date_creation, d.reference FROM operations_operateur o LEFT JOIN demandes_echange d ON d.id = o.demande_id ORDER BY o.id DESC LIMIT 30");
  const messages = await b.lignes("SELECT id, type, expediteur, operateur, nature, lecture, recu_a, date_reception FROM messages_passerelle ORDER BY id DESC LIMIT 20");
  const expediteurs = {
    DMONEY: (await expediteursReconnus(b, "DMONEY")).join(", "),
    WAAFI: (await expediteursReconnus(b, "WAAFI")).join(", ")
  };
  return {
    passerelle: p ? {
      nom: p.nom,
      associe: p.actif === 1,
      etat: lireJson(p.etat),
      codeExpire: p.code_expire && p.code_expire > Date.now() ? p.code_expire : null,
      dateAssociation: p.date_association,
      dernierContact: p.dernier_contact
    } : null,
    wallets,
    ordres,
    operations,
    messages,
    expediteurs
  };
}
async function affecterWallet(acteur, args) {
  exigerRole(acteur, ["SUPER_ADMIN"]);
  const operateur = parmi(args.operateur, ["DMONEY", "WAAFI"], "opérateur");
  const walletId = entierOuNull(args.walletId, "wallet", 1);
  await transaction(async (b) => {
    await b.exec("UPDATE wallets SET passerelle = NULL WHERE passerelle = ?", [operateur]);
    if (walletId != null) {
      const w = await b.ligne(
        "SELECT id, nom, type_compte, compte_reception FROM wallets WHERE id = ? FOR UPDATE",
        [walletId]
      );
      if (!w) throw new Erreur("Wallet introuvable.");
      if (w.type_compte !== "NUMERO" || !w.compte_reception) {
        throw new Erreur("Le wallet " + w.nom + " doit avoir un numéro de réception (celui du téléphone passerelle).");
      }
      await b.exec("UPDATE wallets SET passerelle = ?, date_maj = ? WHERE id = ?", [operateur, Date.now(), walletId]);
      await actualiserSoldes(b, [operateur]);
      await journaliser(b, acteur.id, "PASSERELLE_WALLET", nomOperateur(operateur) + " lu par la passerelle : wallet " + w.nom);
    } else {
      await journaliser(b, acteur.id, "PASSERELLE_WALLET", nomOperateur(operateur) + " n’est plus lu par la passerelle");
    }
  });
}
async function ordreEssai(acteur, args) {
  exigerRole(acteur, ["SUPER_ADMIN"]);
  const operateur = parmi(args.operateur, ["DMONEY", "WAAFI"], "opérateur");
  const type = parmi(args.type, ["SOLDE", "HISTORIQUE"], "type");
  await transaction(async (b) => {
    if (await b.ligne(
      "SELECT id FROM ordres_passerelle WHERE statut IN ('A_FAIRE', 'EN_COURS') AND demande_id IS NULL AND type = ? AND operateur = ? LIMIT 1",
      [type, operateur]
    )) {
      throw new Erreur("Une lecture identique attend déjà le téléphone.");
    }
    await creerOrdre(b, type, operateur, null, "MANUEL");
  });
}
async function reglerExpediteurs(acteur, args) {
  exigerRole(acteur, ["SUPER_ADMIN"]);
  const operateur = parmi(args.operateur, ["DMONEY", "WAAFI"], "opérateur");
  const liste = texte(args.expediteurs, "expéditeurs", 200).split(",").map(normaliserExpediteur).filter((x) => x.length >= 2);
  if (!liste.length) throw new Erreur("Indiquez au moins un expéditeur (par exemple " + expediteursParDefaut(operateur) + ").");
  await transaction(async (b) => {
    await b.exec(
      "INSERT INTO parametres (cle, valeur, description) VALUES (?, ?, ?) ON CONFLICT (cle) DO UPDATE SET valeur = EXCLUDED.valeur",
      ["passerelle_expediteurs_" + operateur.toLowerCase(), liste.join(","), "Passerelle : expéditeurs SMS reconnus pour " + nomOperateur(operateur)]
    );
    await journaliser(b, acteur.id, "PASSERELLE_EXPEDITEURS", nomOperateur(operateur) + " : expéditeurs reconnus " + liste.join(", "));
  });
}
async function actualiserSoldes(b, operateurs) {
  for (const o of operateurs) {
    if (await b.ligne("SELECT id FROM ordres_passerelle WHERE statut IN ('A_FAIRE', 'EN_COURS') AND type = 'SOLDE' AND operateur = ? LIMIT 1", [o])) continue;
    await creerOrdre(b, "SOLDE", o, null, "ACTUALISATION");
  }
}

// src/demandes.ts
var SELECTION = "SELECT d.id AS id, d.reference AS reference, d.utilisateur_id AS utilisateur_id, d.wallet_source_id AS wallet_source_id, d.wallet_dest_id AS wallet_dest_id, d.numero_source AS numero_source, d.numero_dest AS numero_dest, d.montant AS montant, d.frais AS frais, d.frais_systeme AS frais_systeme, d.montant_net AS montant_net, d.libelle_frais AS libelle_frais, d.mode_source AS mode_source, d.mode_dest AS mode_dest, d.statut AS statut, d.paiement_verifie AS paiement_verifie, d.ref_api_source AS ref_api_source, d.ref_api_dest AS ref_api_dest, d.motif_refus AS motif_refus, d.traite_par AS traite_par, d.date_creation AS date_creation, d.date_confirmation AS date_confirmation, d.date_traitement AS date_traitement, d.nom_beneficiaire AS nom_beneficiaire, d.commission AS commission, d.taux_commission AS taux_commission, d.etape_passerelle AS etape_passerelle, d.motif_blocage AS motif_blocage, d.date_blocage AS date_blocage, ws.nom AS source_nom, wd.nom AS dest_nom, u.nom_complet AS client_nom, u.email AS client_email, a.nom_complet AS admin_nom, (SELECT COUNT(*) FROM preuves_transaction p WHERE p.demande_id = d.id) AS a_preuve, (SELECT COUNT(*) FROM signalements sg WHERE sg.demande_id = d.id AND sg.statut <> 'TRAITE') AS signalement_ouvert FROM demandes_echange d JOIN wallets ws ON ws.id = d.wallet_source_id JOIN wallets wd ON wd.id = d.wallet_dest_id JOIN utilisateurs u ON u.id = d.utilisateur_id LEFT JOIN utilisateurs a ON a.id = d.traite_par ";
var STATUTS = ["EN_ATTENTE", "EN_COURS", "TRAITEE", "ANNULEE", "REFUSEE"];
var ETAPES = ["VERIF_PAIEMENT", "ATTENTE_ACCORD", "ENVOI", "BLOQUEE"];
function pourActeur(acteur, d) {
  if (d && !estAdmin(acteur)) d.motif_blocage = null;
  return d;
}
async function listerDemandes(acteur, brut, b = base()) {
  const f = brut == null ? {} : objet(brut, "filtre");
  const conditions = [];
  const args = [];
  let utilisateurId = entierOuNull(f.utilisateurId, "utilisateur", 1);
  if (!estAdmin(acteur)) utilisateurId = acteur.id;
  if (utilisateurId != null) {
    conditions.push("d.utilisateur_id = ?");
    args.push(utilisateurId);
  }
  const statuts = tableau(f.statuts, "statuts", 5).map((s2) => parmi(s2, STATUTS, "statut"));
  if (statuts.length) {
    conditions.push("d.statut IN (" + marques(statuts.length) + ")");
    statuts.forEach((s2) => args.push(s2));
  }
  const etapes = tableau(f.etapes, "étapes", 4).map((s2) => parmi(s2, ETAPES, "étape"));
  if (etapes.length) {
    conditions.push("d.etape_passerelle IN (" + marques(etapes.length) + ")");
    etapes.forEach((s2) => args.push(s2));
  }
  if (f.horsEtapes === true) conditions.push("(d.etape_passerelle IS NULL OR d.etape_passerelle NOT IN ('ATTENTE_ACCORD', 'BLOQUEE'))");
  const col = f.colonneDate === "date_traitement" ? "d.date_traitement" : "d.date_creation";
  const debut = entierOuNull(f.debut, "début de période", 0);
  const fin = entierOuNull(f.fin, "fin de période", 0);
  if (debut != null) {
    conditions.push(col + " >= ?");
    args.push(debut);
  }
  if (fin != null) {
    conditions.push(col + " < ?");
    args.push(fin);
  }
  const walletId = entierOuNull(f.walletId, "wallet", 1);
  if (walletId != null) {
    conditions.push("(d.wallet_source_id = ? OR d.wallet_dest_id = ?)");
    args.push(walletId, walletId);
  }
  const recherche = texte(f.recherche, "recherche", 100).trim();
  if (recherche) {
    const motif = "%" + recherche.replace(/[%_\\]/g, "") + "%";
    const chiffres = recherche.replace(/\D/g, "");
    const motifNumero = chiffres.length >= 2 ? "%" + chiffres + "%" : motif;
    conditions.push("(d.reference ILIKE ? OR u.nom_complet ILIKE ? OR u.email ILIKE ? OR d.numero_source LIKE ? OR d.numero_dest LIKE ? OR d.nom_beneficiaire ILIKE ?)");
    args.push(motif, motif, motif, motifNumero, motifNumero, motif);
  }
  const ordre = f.colonneDate === "date_traitement" ? "d.date_traitement DESC, d.id DESC" : "d.id DESC";
  const limite = Math.max(1, Math.min(2e3, Math.floor(entierOuNull(f.limite, "limite", 1, 1e5) || 300)));
  args.push(limite);
  const lignes = await b.lignes(SELECTION + (conditions.length ? "WHERE " + conditions.join(" AND ") + " " : "") + "ORDER BY " + ordre + " LIMIT ?", args);
  return lignes.map((d) => pourActeur(acteur, d));
}
async function demandeParId(b, id) {
  return b.ligne(SELECTION + "WHERE d.id = ?", [id]);
}
async function demandeVisible(acteur, id, b = base()) {
  const d = await demandeParId(b, id);
  if (!d || !estAdmin(acteur) && d.utilisateur_id !== acteur.id) throw new Erreur("Demande introuvable.");
  return d;
}
async function lireDemande(acteur, args) {
  const id = entier(args.id, "demande", 1);
  const d = await demandeParId(base(), id);
  if (!d || !estAdmin(acteur) && d.utilisateur_id !== acteur.id) return null;
  return pourActeur(acteur, d);
}
async function preuveDe(acteur, args) {
  const id = entier(args.id, "demande", 1);
  await demandeVisible(acteur, id);
  const l = await base().ligne("SELECT image, image_mime FROM preuves_transaction WHERE demande_id = ?", [id]);
  return l ? "data:" + l.image_mime + ";base64," + Buffer.from(l.image).toString("base64") : null;
}
async function compteursClient(acteur, args) {
  exigerRole(acteur, ["UTILISATEUR"]);
  const debutMois = entier(args.debutMois, "début du mois", 0);
  const l = await base().ligne(
    "SELECT COALESCE(SUM(CASE WHEN statut = 'EN_ATTENTE' THEN 1 ELSE 0 END), 0) AS en_attente, COALESCE(SUM(CASE WHEN statut = 'EN_COURS' THEN 1 ELSE 0 END), 0) AS en_cours, COALESCE(SUM(CASE WHEN statut = 'TRAITEE' THEN 1 ELSE 0 END), 0) AS traitees, COALESCE(SUM(CASE WHEN statut = 'TRAITEE' AND date_traitement >= ? THEN 1 ELSE 0 END), 0) AS nb_mois, COALESCE(SUM(CASE WHEN statut = 'TRAITEE' AND date_traitement >= ? THEN montant ELSE 0 END), 0) AS volume_mois, COALESCE(SUM(CASE WHEN statut = 'EN_COURS' AND etape_passerelle = 'BLOQUEE' THEN 1 ELSE 0 END), 0) AS bloquees FROM demandes_echange WHERE utilisateur_id = ?",
    [debutMois, debutMois, acteur.id]
  );
  return {
    enAttente: l ? l.en_attente : 0,
    enCours: l ? l.en_cours : 0,
    traitees: l ? l.traitees : 0,
    nbMois: l ? l.nb_mois : 0,
    volumeMois: l ? l.volume_mois : 0,
    bloquees: l ? l.bloquees : 0
  };
}
async function numerosRecents(acteur, args) {
  exigerRole(acteur, ["UTILISATEUR"]);
  const walletId = entier(args.walletId, "wallet", 1);
  const cote = parmi(args.cote, ["source", "dest"], "côté");
  const colNumero = cote === "source" ? "numero_source" : "numero_dest";
  const colWallet = cote === "source" ? "wallet_source_id" : "wallet_dest_id";
  const lignes = await base().lignes(
    "SELECT " + colNumero + " AS numero, MAX(id) AS dernier FROM demandes_echange WHERE utilisateur_id = ? AND " + colWallet + " = ? GROUP BY " + colNumero + " ORDER BY dernier DESC LIMIT 3",
    [acteur.id, walletId]
  );
  return lignes.map((l) => l.numero);
}
async function compteursAdmin(acteur) {
  exigerRole(acteur, ["ADMIN", "SUPER_ADMIN"]);
  const l = await base().ligne(
    "SELECT COALESCE(SUM(CASE WHEN statut = 'EN_ATTENTE' THEN 1 ELSE 0 END), 0) AS en_attente, COALESCE(SUM(CASE WHEN statut = 'EN_COURS' THEN 1 ELSE 0 END), 0) AS en_cours, COALESCE(SUM(CASE WHEN statut = 'EN_COURS' AND etape_passerelle = 'BLOQUEE' THEN 1 ELSE 0 END), 0) AS bloquees, COALESCE(SUM(CASE WHEN statut = 'EN_COURS' AND etape_passerelle = 'ATTENTE_ACCORD' THEN 1 ELSE 0 END), 0) AS accords FROM demandes_echange"
  );
  return { enAttente: l ? l.en_attente : 0, enCours: l ? l.en_cours : 0, bloquees: l ? l.bloquees : 0, accords: l ? l.accords : 0 };
}
function controlerNomBeneficiaire(saisie) {
  const nom = (saisie || "").replace(/\s+/g, " ").trim();
  if (nom.length < 2) return { erreur: "Indiquez le nom du bénéficiaire (titulaire du numéro destinataire)." };
  if (nom.length > 60) return { erreur: "Le nom du bénéficiaire est trop long (60 caractères au maximum)." };
  if (/[0-9<>{}\[\]()=+;:!?,"@#$%^&*_|~`\\/]/.test(nom) || !/[^\s'\u2019.\-]/.test(nom)) {
    return { erreur: "Le nom du bénéficiaire ne doit contenir que des lettres." };
  }
  return { nom };
}
function commissionDe(d) {
  return d.taux_commission != null ? pourcentageDe(d.montant, d.taux_commission) : 0;
}
var ALPHABET_REFERENCE = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
function deux(n) {
  return n < 10 ? "0" + n : String(n);
}
async function nouvelleReference(b) {
  const d = dateDjibouti(Date.now(), config.decalageMinutes);
  const prefixe = "DJX-" + String(d.getUTCFullYear()).substring(2) + deux(d.getUTCMonth() + 1) + deux(d.getUTCDate()) + "-";
  for (let essai = 0; essai < 8; essai++) {
    let suffixe = "";
    for (let i = 0; i < 5; i++) suffixe += ALPHABET_REFERENCE.charAt(aleaEntier(ALPHABET_REFERENCE.length));
    const reference = prefixe + suffixe;
    if (!await b.ligne("SELECT id FROM demandes_echange WHERE reference = ?", [reference])) return reference;
  }
  throw new Erreur("Impossible de générer une référence. Réessayez.");
}
var MAX_DEMANDES_EN_ATTENTE = 10;
async function creerDemande(acteur, args) {
  exigerRole(acteur, ["UTILISATEUR"]);
  const s2 = objet(args.saisie, "demande");
  const sourceId = entierOuNull(s2.sourceId, "wallet source", 1);
  const destId = entierOuNull(s2.destId, "wallet destinataire", 1);
  if (!sourceId) throw new Erreur("Choisissez le wallet source.");
  if (!destId) throw new Erreur("Choisissez le wallet destinataire.");
  if (sourceId === destId) throw new Erreur("Le wallet source et le wallet destinataire doivent être différents.");
  const b = base();
  const source = await walletParId(b, sourceId);
  const dest = await walletParId(b, destId);
  if (!source || !walletDisponible(source)) throw new Erreur("Le wallet source n’est pas disponible pour le moment.");
  if (!dest || !walletDisponible(dest)) throw new Erreur("Le wallet destinataire n’est pas disponible pour le moment.");
  if (!source.compte_reception) throw new Erreur("Le wallet " + source.nom + " n’est pas encore configuré pour recevoir des paiements.");
  const numeroSource = normaliserNumero(texte(s2.numeroSource, "numéro source", 30));
  if (!numeroSource) throw new Erreur("Votre numéro " + source.nom + " doit contenir 8 chiffres.");
  const numeroDest = normaliserNumero(texte(s2.numeroDest, "numéro destinataire", 30));
  if (!numeroDest) throw new Erreur("Le numéro destinataire doit contenir 8 chiffres.");
  const p = await chargerParametres(b, true);
  const brut = typeof s2.montant === "string" ? Number(s2.montant) : s2.montant;
  const montant = typeof brut === "number" && isFinite(brut) ? Math.round(brut) : NaN;
  if (!isFinite(montant) || montant <= 0) throw new Erreur("Saisissez le montant à envoyer.");
  if (montant < p.montantMin) throw new Erreur("Le montant minimum est de " + fdj(p.montantMin) + ".");
  if (montant > p.montantMax) throw new Erreur("Le montant maximum est de " + fdj(p.montantMax) + ".");
  const c = calculerFraisEchange(montant, source, dest, p.grille, p.passerelleSansFrais === 1);
  if (c.net <= 0) throw new Erreur("Le montant est trop faible par rapport aux frais.");
  if (dest.passerelle && dest.mode_echange === "AUTOMATIQUE") {
    const promis = Number(await b.valeur("SELECT COALESCE(SUM(montant_net), 0) AS s FROM demandes_echange WHERE wallet_dest_id = ? AND statut = 'EN_COURS' AND etape_passerelle IN ('VERIF_PAIEMENT', 'ATTENTE_ACCORD', 'ENVOI')", [dest.id]));
    if (dest.solde_api - promis < c.net) {
      throw new Erreur("Le wallet " + dest.nom + " n’a pas assez de fonds pour cet échange pour le moment. Réessayez plus tard ou choisissez un montant plus petit.");
    }
  }
  let nomBeneficiaire = null;
  if (dest.mode_echange === "MANUEL") {
    const controle = controlerNomBeneficiaire(texte(s2.nomBeneficiaire, "nom du bénéficiaire", 200));
    if ("erreur" in controle) throw new Erreur(controle.erreur);
    nomBeneficiaire = controle.nom;
  } else if (!booleen(s2.numeroVerifie)) {
    throw new Erreur("Confirmez que vous avez bien vérifié le numéro du destinataire : vous êtes responsable en cas d’erreur.");
  }
  const enAttente = Number(await b.valeur("SELECT COUNT(*) AS n FROM demandes_echange WHERE utilisateur_id = ? AND statut = 'EN_ATTENTE'", [acteur.id]));
  if (enAttente >= MAX_DEMANDES_EN_ATTENTE) {
    throw new Erreur("Vous avez déjà " + enAttente + " demandes en attente : confirmez-les ou annulez-les avant d’en créer une nouvelle.");
  }
  const reference = await nouvelleReference(b);
  return b.inserer(
    "INSERT INTO demandes_echange (reference, utilisateur_id, wallet_source_id, wallet_dest_id, numero_source, numero_dest, montant, frais, frais_systeme, montant_net, libelle_frais, mode_source, mode_dest, statut, paiement_verifie, date_creation, nom_beneficiaire, commission, taux_commission) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'EN_ATTENTE', 0, ?, ?, 0, ?)",
    [
      reference,
      acteur.id,
      source.id,
      dest.id,
      numeroSource,
      numeroDest,
      montant,
      c.frais,
      c.fraisSysteme,
      c.net,
      c.libelle,
      source.mode_echange,
      dest.mode_echange,
      Date.now(),
      nomBeneficiaire,
      c.tauxCommission
    ]
  );
}
async function demandeDuClientVerrouillee(tx, acteur, id) {
  const proprietaire = await tx.ligne("SELECT utilisateur_id FROM demandes_echange WHERE id = ? FOR UPDATE", [id]);
  if (!proprietaire || proprietaire.utilisateur_id !== acteur.id) throw new Erreur("Demande introuvable.");
  return await demandeParId(tx, id);
}
async function annulerDemande(acteur, args) {
  exigerRole(acteur, ["UTILISATEUR"]);
  const id = entier(args.id, "demande", 1);
  await transaction(async (tx) => {
    const d = await demandeDuClientVerrouillee(tx, acteur, id);
    if (d.statut !== "EN_ATTENTE") throw new Erreur("Cette demande ne peut plus être annulée.");
    await tx.exiger(
      "UPDATE demandes_echange SET statut = 'ANNULEE', date_traitement = ? WHERE id = ? AND statut = 'EN_ATTENTE'",
      [Date.now(), id],
      "Cette demande ne peut plus être annulée."
    );
  });
}
async function confirmerDemande(acteur, args) {
  exigerRole(acteur, ["UTILISATEUR"]);
  const id = entier(args.id, "demande", 1);
  let parPasserelle = false;
  const resultat = await transaction(async (tx) => {
    const d = await demandeDuClientVerrouillee(tx, acteur, id);
    if (d.statut !== "EN_ATTENTE") throw new Erreur("Cette demande a déjà été confirmée ou annulée.");
    const source = await walletParId(tx, d.wallet_source_id);
    const dest = await walletParId(tx, d.wallet_dest_id);
    if (!source || !walletDisponible(source) || !dest || !walletDisponible(dest)) {
      throw new Erreur("L’un des wallets n’est plus disponible. Annulez cette demande et créez-en une nouvelle.");
    }
    const modeSource = source.mode_echange;
    const modeDest = dest.mode_echange;
    const t = Date.now();
    const majDemande = (sql, valeurs) => tx.exiger(sql, valeurs, "Cette demande a déjà été confirmée ou annulée.");
    if (modeSource === "AUTOMATIQUE" && source.passerelle) {
      await majDemande(
        "UPDATE demandes_echange SET statut = 'EN_COURS', mode_source = ?, mode_dest = ?, date_confirmation = ? WHERE id = ? AND statut = 'EN_ATTENTE'",
        [modeSource, modeDest, t, id]
      );
      await commencerVerification(tx, id);
      parPasserelle = true;
      return { statut: "EN_COURS" };
    }
    if (modeSource !== "AUTOMATIQUE") {
      await majDemande(
        "UPDATE demandes_echange SET statut = 'EN_COURS', mode_source = ?, mode_dest = ?, date_confirmation = ? WHERE id = ? AND statut = 'EN_ATTENTE'",
        [modeSource, modeDest, t, id]
      );
      await notifierAdmins(
        tx,
        "DEMANDE_A_TRAITER",
        "Nouvelle demande à vérifier",
        d.client_nom + " : " + d.source_nom + " → " + d.dest_nom + ", " + fdj(d.montant) + ". Paiement à vérifier manuellement.",
        id
      );
      return { statut: "EN_COURS" };
    }
    const apiSource = await walletPourApi(tx, source.id);
    const verif = await verifierReception(apiSource, d.numero_source, d.montant, d.reference);
    if (!verif.ok) throw new Erreur(verif.message || "Le paiement n’a pas encore été reçu. Réessayez dans un instant.");
    if (modeDest === "AUTOMATIQUE" && dest.passerelle) {
      await majDemande("UPDATE demandes_echange SET statut = 'EN_COURS', mode_source = ?, mode_dest = ?, paiement_verifie = 1, ref_api_source = ?, date_confirmation = ? WHERE id = ? AND statut = 'EN_ATTENTE'", [modeSource, modeDest, verif.ref, t, id]);
      await tx.exec("UPDATE wallets SET solde_api = solde_api + ? WHERE id = ?", [d.montant, source.id]);
      await envoyerApresApi(tx, id, verif.ref);
      parPasserelle = true;
      return { statut: "EN_COURS" };
    }
    if (modeDest !== "AUTOMATIQUE") {
      await majDemande("UPDATE demandes_echange SET statut = 'EN_COURS', mode_source = ?, mode_dest = ?, paiement_verifie = 1, ref_api_source = ?, date_confirmation = ? WHERE id = ? AND statut = 'EN_ATTENTE'", [modeSource, modeDest, verif.ref, t, id]);
      await tx.exec("UPDATE wallets SET solde_api = solde_api + ? WHERE id = ?", [d.montant, source.id]);
      await notifierAdmins(
        tx,
        "DEMANDE_A_TRAITER",
        "Nouvelle demande à traiter",
        d.client_nom + " : " + d.source_nom + " → " + d.dest_nom + ", " + fdj(d.montant) + ". Paiement vérifié automatiquement, envoi manuel à effectuer.",
        id
      );
      return { statut: "EN_COURS" };
    }
    const apiDest = await walletPourApi(tx, dest.id);
    const envoi = await envoyer(apiDest, d.numero_dest, d.montant_net, d.reference);
    if (!envoi.ok) {
      await majDemande("UPDATE demandes_echange SET statut = 'EN_COURS', mode_source = ?, mode_dest = 'MANUEL', paiement_verifie = 1, ref_api_source = ?, date_confirmation = ? WHERE id = ? AND statut = 'EN_ATTENTE'", [modeSource, verif.ref, t, id]);
      await tx.exec("UPDATE wallets SET solde_api = solde_api + ? WHERE id = ?", [d.montant, source.id]);
      await notifierAdmins(
        tx,
        "DEMANDE_A_TRAITER",
        "Envoi automatique impossible",
        "La demande " + d.reference + " (" + fdj(d.montant_net) + " vers " + dest.nom + ") doit être envoyée manuellement : " + (envoi.message || "solde insuffisant") + ".",
        id
      );
      return { statut: "EN_COURS" };
    }
    await majDemande(
      "UPDATE demandes_echange SET statut = 'TRAITEE', mode_source = ?, mode_dest = ?, paiement_verifie = 1, ref_api_source = ?, ref_api_dest = ?, date_confirmation = ?, date_traitement = ?, commission = ? WHERE id = ? AND statut = 'EN_ATTENTE'",
      [modeSource, modeDest, verif.ref, envoi.ref, t, Date.now(), commissionDe(d), id]
    );
    await tx.exec("UPDATE wallets SET solde_api = solde_api + ? WHERE id = ?", [d.montant, source.id]);
    const avant = Number(await tx.valeur("SELECT solde_api FROM wallets WHERE id = ? FOR UPDATE", [dest.id]));
    const apres = Math.max(0, avant - d.montant_net);
    await tx.exec("UPDATE wallets SET solde_api = ? WHERE id = ?", [apres, dest.id]);
    await notifier(
      tx,
      acteur.id,
      "ECHANGE_REUSSI",
      "Échange réussi",
      fdj(d.montant_net) + " envoyés au " + formatNumero(d.numero_dest) + " (" + dest.nom + "). Référence " + d.reference + ".",
      id
    );
    await alerterSolde(tx, dest, avant, apres);
    return { statut: "TRAITEE" };
  });
  if (parPasserelle) declencher();
  return resultat;
}
var CAPTURE_MAX_BASE64 = 14e5;
async function confirmerParAdmin(acteur, args) {
  exigerRole(acteur, ["ADMIN", "SUPER_ADMIN"]);
  const id = entier(args.id, "demande", 1);
  const capture = image(args.capture, "capture", CAPTURE_MAX_BASE64);
  const refSaisie = texte(args.refOperateur, "identifiant de la transaction", 40).replace(/\s+/g, "");
  if (refSaisie && !/^[A-Za-z0-9-]{4,30}$/.test(refSaisie)) throw new Erreur("L’identifiant de la transaction est invalide.");
  let envoiAutomatique = false;
  await transaction(async (tx) => {
    if (!await tx.ligne("SELECT id FROM demandes_echange WHERE id = ? FOR UPDATE", [id])) throw new Erreur("Demande introuvable.");
    const d = await demandeParId(tx, id);
    if (d.statut !== "EN_COURS") throw new Erreur("Cette demande n’est pas en cours de traitement.");
    const dest = await walletParId(tx, d.wallet_dest_id);
    if (!dest) throw new Erreur("Wallet destinataire introuvable.");
    const t = Date.now();
    let refDest = refSaisie || null;
    const manuelPasserelle = !!d.etape_passerelle;
    if (manuelPasserelle) {
      await preparerDecisionManuelle(tx, id);
    } else if (d.mode_dest !== "MANUEL" && dest.passerelle) {
      await envoyerApresAttestation(tx, id);
      await journaliser(tx, acteur.id, "CONFIRMATION_DEMANDE", "Paiement de la demande " + d.reference + " attesté : envoi de " + fdj(d.montant_net) + " confié à la passerelle (" + d.dest_nom + ")");
      envoiAutomatique = true;
      return;
    }
    if (manuelPasserelle) {
    } else if (d.mode_dest === "MANUEL") {
      if (!capture) throw new Erreur("Ajoutez la capture de votre transaction : elle est obligatoire pour confirmer.");
    } else {
      const apiDest = await walletPourApi(tx, dest.id);
      const envoi = await envoyer(apiDest, d.numero_dest, d.montant_net, d.reference);
      if (!envoi.ok) {
        throw new Erreur("L’envoi automatique a échoué : " + (envoi.message || "erreur de l’API") + ". Vérifiez le solde du wallet " + dest.nom + ".");
      }
      refDest = envoi.ref;
      const avant = Number(await tx.valeur("SELECT solde_api FROM wallets WHERE id = ? FOR UPDATE", [dest.id]));
      const apres = Math.max(0, avant - d.montant_net);
      await tx.exec("UPDATE wallets SET solde_api = ? WHERE id = ?", [apres, dest.id]);
      await alerterSolde(tx, dest, avant, apres);
    }
    await tx.exiger(
      "UPDATE demandes_echange SET statut = 'TRAITEE', paiement_verifie = CASE WHEN paiement_verifie = 0 THEN 2 ELSE paiement_verifie END, ref_api_dest = COALESCE(?, ref_api_dest), traite_par = ?, date_traitement = ?, commission = ? WHERE id = ? AND statut = 'EN_COURS'",
      [refDest, acteur.id, t, commissionDe(d), id],
      "Cette demande a déjà été traitée."
    );
    if (capture) {
      await tx.exec("INSERT INTO preuves_transaction (demande_id, image, image_mime, ajoute_par, date_creation) VALUES (?, ?, ?, ?, ?) ON CONFLICT (demande_id) DO UPDATE SET image = EXCLUDED.image, image_mime = EXCLUDED.image_mime, ajoute_par = EXCLUDED.ajoute_par, date_creation = EXCLUDED.date_creation", [id, Buffer.from(capture.base64, "base64"), capture.mime, acteur.id, t]);
    }
    await notifier(
      tx,
      d.utilisateur_id,
      "ECHANGE_REUSSI",
      "Échange traité avec succès",
      fdj(d.montant_net) + " envoyés au " + formatNumero(d.numero_dest) + " (" + d.dest_nom + "). Référence " + d.reference + ".",
      id
    );
    await journaliser(
      tx,
      acteur.id,
      "CONFIRMATION_DEMANDE",
      "Demande " + d.reference + " confirmée : " + d.source_nom + " → " + d.dest_nom + ", " + fdj(d.montant) + (manuelPasserelle ? " (terminée à la main" + (refDest ? ", ID " + refDest : "") + ")" : "")
    );
  });
  if (envoiAutomatique) declencher();
  return { envoiAutomatique };
}
async function refuserParAdmin(acteur, args) {
  exigerRole(acteur, ["ADMIN", "SUPER_ADMIN"]);
  const id = entier(args.id, "demande", 1);
  const motif = texte(args.motif, "motif", 500).trim();
  if (motif.length < 3) throw new Erreur("Indiquez le motif du refus.");
  await transaction(async (tx) => {
    if (!await tx.ligne("SELECT id FROM demandes_echange WHERE id = ? FOR UPDATE", [id])) throw new Erreur("Demande introuvable.");
    const d = await demandeParId(tx, id);
    if (d.statut !== "EN_COURS" && d.statut !== "EN_ATTENTE") throw new Erreur("Cette demande ne peut plus être refusée.");
    if (d.etape_passerelle) await preparerDecisionManuelle(tx, id);
    await tx.exiger("UPDATE demandes_echange SET statut = 'REFUSEE', motif_refus = ?, traite_par = ?, date_traitement = ? WHERE id = ? AND statut IN ('EN_COURS', 'EN_ATTENTE')", [motif, acteur.id, Date.now(), id], "Cette demande ne peut plus être refusée.");
    await notifier(tx, d.utilisateur_id, "ECHANGE_REFUSE", "Demande refusée", "Votre demande " + d.reference + " a été refusée. Motif : " + motif, id);
    await journaliser(tx, acteur.id, "REFUS_DEMANDE", "Demande " + d.reference + " refusée : " + motif);
  });
}
var NOMS_DEMO = ["Hassan Ali", "Fatouma Omar", "Moussa Ahmed", "Hodan Abdi", "Ibrahim Youssouf", "Kadra Mohamed"];
function exigerModeTest() {
  if (!config.modeTest) throw new ErreurHttp(403, "MODE_TEST", "Les outils de test ne sont disponibles qu’en mode test.");
}
async function genererDonneesDemo(acteur) {
  exigerRole(acteur, ["SUPER_ADMIN"]);
  exigerModeTest();
  const b = base();
  const wallets = await b.lignes("SELECT id, nom, code, statut, mode_echange, regle_frais, frais_pourcentage FROM wallets ORDER BY ordre, id");
  const dispo = wallets.filter(walletDisponible);
  if (dispo.length < 2) throw new Erreur("Activez au moins deux wallets (avec un mode d’échange) avant de générer des données.");
  const clients = await b.lignes("SELECT id FROM utilisateurs WHERE role = 'UTILISATEUR' AND statut = 'ACTIF' ORDER BY id LIMIT 8");
  if (!clients.length) throw new Erreur("Aucun utilisateur pour générer des données.");
  const p = await chargerParametres(b);
  const montants = [500, 800, 1e3, 1500, 2e3, 2500, 3e3, 5e3, 7500, 1e4, 12e3, 2e4];
  const t = Date.now();
  let total = 0;
  await transaction(async (tx) => {
    for (let jour = 13; jour >= 0; jour--) {
      const nb = 1 + aleaEntier(4);
      for (let k = 0; k < nb; k++) {
        const source = dispo[aleaEntier(dispo.length)];
        let dest = dispo[aleaEntier(dispo.length)];
        if (dest.id === source.id) dest = dispo[(dispo.indexOf(source) + 1) % dispo.length];
        const montant = montants[aleaEntier(montants.length)];
        const c = calculerFrais(montant, dest, p.grille);
        const jourLocal = dateDjibouti(t - jour * 24 * 3600 * 1e3, config.decalageMinutes);
        let quand = Date.UTC(jourLocal.getUTCFullYear(), jourLocal.getUTCMonth(), jourLocal.getUTCDate(), 8 + aleaEntier(11), aleaEntier(60)) - config.decalageMinutes * 6e4;
        if (quand > t) quand = t - (k + 1) * 6e4;
        let suffixe = "";
        for (let i = 0; i < 5; i++) suffixe += ALPHABET_REFERENCE.charAt(aleaEntier(ALPHABET_REFERENCE.length));
        const numS = "77" + String(1e5 + aleaEntier(9e5)).substring(0, 6);
        const numD = "77" + String(1e5 + aleaEntier(9e5)).substring(0, 6);
        const manuel = source.mode_echange === "MANUEL" || dest.mode_echange === "MANUEL";
        await tx.exec(
          "INSERT INTO demandes_echange (reference, utilisateur_id, wallet_source_id, wallet_dest_id, numero_source, numero_dest, montant, frais, frais_systeme, montant_net, libelle_frais, mode_source, mode_dest, statut, paiement_verifie, ref_api_source, ref_api_dest, traite_par, date_creation, date_confirmation, date_traitement, nom_beneficiaire, commission, taux_commission) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'TRAITEE', ?, ?, ?, ?, ?, ?, ?, ?, ?, ?) ON CONFLICT (reference) DO NOTHING",
          [
            "DEMO-" + suffixe + total,
            clients[aleaEntier(clients.length)].id,
            source.id,
            dest.id,
            numS,
            numD,
            montant,
            c.frais,
            c.fraisSysteme,
            c.net,
            c.libelle,
            source.mode_echange,
            dest.mode_echange,
            source.mode_echange === "AUTOMATIQUE" ? 1 : 2,
            source.mode_echange === "AUTOMATIQUE" ? "SIM-" + suffixe : null,
            dest.mode_echange === "AUTOMATIQUE" ? "SIM-" + suffixe + "D" : null,
            manuel ? acteur.id : null,
            quand - 4 * 6e4,
            quand - 2 * 6e4,
            quand,
            dest.mode_echange === "MANUEL" ? NOMS_DEMO[aleaEntier(NOMS_DEMO.length)] : null,
            c.commission,
            c.tauxCommission
          ]
        );
        total++;
      }
    }
    await journaliser(tx, acteur.id, "DONNEES_DEMO", total + " échanges de démonstration générés");
  });
  return total;
}
async function effacerDonneesEchanges(acteur) {
  exigerRole(acteur, ["SUPER_ADMIN"]);
  exigerModeTest();
  await transaction(async (tx) => {
    await tx.exec("DELETE FROM ordres_passerelle");
    await tx.exec("DELETE FROM signalements");
    await tx.exec("DELETE FROM preuves_transaction");
    await tx.exec("DELETE FROM notifications");
    await tx.exec("DELETE FROM demandes_echange");
    await journaliser(tx, acteur.id, "REINITIALISATION", "Suppression de toutes les demandes d’échange (outil de test)");
  });
}

// src/rapports.ts
var JOUR = 24 * 3600 * 1e3;
function periode(args, nomDebut, nomFin) {
  const debut = entier(args[nomDebut], "début de période", 0);
  const fin = entier(args[nomFin], "fin de période", 0);
  if (fin <= debut || fin - debut > 400 * JOUR) throw new Erreur("Période invalide.");
  return { debut, fin };
}
async function lignesTraitees(debut, fin) {
  return base().lignes(
    "SELECT date_traitement, montant, frais_systeme + commission AS revenu FROM demandes_echange WHERE statut = 'TRAITEE' AND date_traitement >= ? AND date_traitement < ?",
    [debut, fin]
  );
}
async function tableauDeBord(acteur, args) {
  exigerRole(acteur, ["ADMIN", "SUPER_ADMIN"]);
  const j0 = entier(args.j0, "début du jour", 0);
  const m0 = entier(args.m0, "début du mois", 0);
  const serie = periode(args, "serieDebut", "serieFin");
  const l = await base().ligne(
    "SELECT COALESCE(SUM(CASE WHEN statut = 'EN_ATTENTE' THEN 1 ELSE 0 END), 0) AS en_attente, COALESCE(SUM(CASE WHEN statut = 'EN_COURS' THEN 1 ELSE 0 END), 0) AS en_cours, COALESCE(SUM(CASE WHEN statut = 'TRAITEE' AND date_traitement >= ? THEN 1 ELSE 0 END), 0) AS nb_jour, COALESCE(SUM(CASE WHEN statut = 'TRAITEE' AND date_traitement >= ? THEN frais_systeme + commission ELSE 0 END), 0) AS revenu_jour, COALESCE(SUM(CASE WHEN statut = 'TRAITEE' AND date_traitement >= ? THEN commission ELSE 0 END), 0) AS commissions_jour, COALESCE(SUM(CASE WHEN statut = 'TRAITEE' AND date_traitement >= ? THEN montant ELSE 0 END), 0) AS volume_jour, COALESCE(SUM(CASE WHEN statut = 'TRAITEE' AND date_traitement >= ? THEN 1 ELSE 0 END), 0) AS nb_mois, COALESCE(SUM(CASE WHEN statut = 'TRAITEE' AND date_traitement >= ? THEN frais_systeme + commission ELSE 0 END), 0) AS revenu_mois, COALESCE(SUM(CASE WHEN statut = 'TRAITEE' AND date_traitement >= ? THEN commission ELSE 0 END), 0) AS commissions_mois, COALESCE(SUM(CASE WHEN statut = 'TRAITEE' AND date_traitement >= ? THEN montant ELSE 0 END), 0) AS volume_mois FROM demandes_echange",
    [j0, j0, j0, j0, m0, m0, m0, m0]
  );
  return {
    compteurs: {
      enAttente: l ? l.en_attente : 0,
      enCours: l ? l.en_cours : 0,
      transactionsJour: l ? l.nb_jour : 0,
      revenuJour: l ? l.revenu_jour : 0,
      commissionsJour: l ? l.commissions_jour : 0,
      volumeJour: l ? l.volume_jour : 0,
      transactionsMois: l ? l.nb_mois : 0,
      revenuMois: l ? l.revenu_mois : 0,
      commissionsMois: l ? l.commissions_mois : 0,
      volumeMois: l ? l.volume_mois : 0
    },
    lignes: await lignesTraitees(serie.debut, serie.fin)
  };
}
async function donneesRapport(acteur, args) {
  exigerRole(acteur, ["ADMIN", "SUPER_ADMIN"]);
  const p = periode(args, "debut", "fin");
  const transactions = await listerDemandes(acteur, {
    statuts: ["TRAITEE"],
    colonneDate: "date_traitement",
    debut: p.debut,
    fin: p.fin,
    limite: 2e3
  });
  const autres = await base().ligne(
    "SELECT COALESCE(SUM(CASE WHEN statut = 'REFUSEE' THEN 1 ELSE 0 END), 0) AS refusees, COALESCE(SUM(CASE WHEN statut = 'ANNULEE' THEN 1 ELSE 0 END), 0) AS annulees FROM demandes_echange WHERE date_traitement >= ? AND date_traitement < ?",
    [p.debut, p.fin]
  );
  let lignesSerie = [];
  if (entierOuNull(args.serieDebut, "série", 0) != null) {
    const s2 = periode(args, "serieDebut", "serieFin");
    lignesSerie = await lignesTraitees(s2.debut, s2.fin);
  }
  return {
    transactions,
    refusees: autres ? autres.refusees : 0,
    annulees: autres ? autres.annulees : 0,
    lignesSerie
  };
}

// src/signalements.ts
var SELECTION2 = "SELECT s.id AS id, s.demande_id AS demande_id, s.utilisateur_id AS utilisateur_id, s.statut_demande AS statut_demande, s.motif AS motif, s.description AS description, (CASE WHEN s.image IS NOT NULL THEN 1 ELSE 0 END) AS a_image, s.statut AS statut, s.reponse AS reponse, (CASE WHEN s.reponse_image IS NOT NULL THEN 1 ELSE 0 END) AS a_reponse_image, s.traite_par AS traite_par, s.date_creation AS date_creation, s.date_prise_en_charge AS date_prise_en_charge, s.date_reponse AS date_reponse, d.reference AS reference, d.montant AS montant, ws.nom AS source_nom, wd.nom AS dest_nom, d.numero_dest AS numero_dest, u.nom_complet AS client_nom, u.email AS client_email, a.nom_complet AS admin_nom FROM signalements s JOIN demandes_echange d ON d.id = s.demande_id JOIN wallets ws ON ws.id = d.wallet_source_id JOIN wallets wd ON wd.id = d.wallet_dest_id JOIN utilisateurs u ON u.id = s.utilisateur_id LEFT JOIN utilisateurs a ON a.id = s.traite_par ";
var IMAGE_MAX_BASE64 = 14e5;
var STATUTS2 = ["EN_ATTENTE", "EN_COURS", "TRAITE"];
async function listerSignalements(acteur, brut) {
  const f = brut == null ? {} : objet(brut, "filtre");
  const conditions = [];
  const args = [];
  let utilisateurId = entierOuNull(f.utilisateurId, "utilisateur", 1);
  if (!estAdmin(acteur)) utilisateurId = acteur.id;
  if (utilisateurId != null) {
    conditions.push("s.utilisateur_id = ?");
    args.push(utilisateurId);
  }
  const demandeId = entierOuNull(f.demandeId, "demande", 1);
  if (demandeId != null) {
    conditions.push("s.demande_id = ?");
    args.push(demandeId);
  }
  const statuts = tableau(f.statuts, "statuts", 3).map((s2) => parmi(s2, STATUTS2, "statut"));
  if (statuts.length) {
    conditions.push("s.statut IN (" + marques(statuts.length) + ")");
    statuts.forEach((x) => args.push(x));
  }
  const limite = Math.max(1, Math.min(1e3, Math.floor(entierOuNull(f.limite, "limite", 1, 1e5) || 300)));
  args.push(limite);
  return base().lignes(SELECTION2 + (conditions.length ? "WHERE " + conditions.join(" AND ") + " " : "") + "ORDER BY CASE s.statut WHEN 'EN_ATTENTE' THEN 0 WHEN 'EN_COURS' THEN 1 ELSE 2 END, s.id DESC LIMIT ?", args);
}
async function signalementParId(b, id) {
  return b.ligne(SELECTION2 + "WHERE s.id = ?", [id]);
}
async function lireSignalement(acteur, args) {
  const id = entier(args.id, "signalement", 1);
  const s2 = await signalementParId(base(), id);
  if (!s2 || !estAdmin(acteur) && s2.utilisateur_id !== acteur.id) return null;
  return s2;
}
async function imageSignalement(acteur, args) {
  const id = entier(args.id, "signalement", 1);
  const laquelle = parmi(args.laquelle, ["erreur", "reponse"], "image");
  const l = await base().ligne(laquelle === "erreur" ? "SELECT image, image_mime AS mime, utilisateur_id FROM signalements WHERE id = ?" : "SELECT reponse_image AS image, reponse_mime AS mime, utilisateur_id FROM signalements WHERE id = ?", [id]);
  if (!l || !estAdmin(acteur) && l.utilisateur_id !== acteur.id) return null;
  return l.image ? "data:" + (l.mime || "image/jpeg") + ";base64," + Buffer.from(l.image).toString("base64") : null;
}
async function nombreSignalementsATraiter(acteur) {
  exigerRole(acteur, ["ADMIN", "SUPER_ADMIN"]);
  return Number(await base().valeur("SELECT COUNT(*) AS n FROM signalements WHERE statut <> 'TRAITE'")) || 0;
}
async function creerSignalement(acteur, args) {
  exigerRole(acteur, ["UTILISATEUR"]);
  const demandeId = entier(args.demandeId, "échange", 1);
  const s2 = objet(args.saisie, "signalement");
  const d = await demandeVisible(acteur, demandeId).catch(() => null);
  if (!d || d.utilisateur_id !== acteur.id) throw new Erreur("Échange introuvable.");
  if (STATUTS_SIGNALABLES.indexOf(d.statut) < 0) throw new Erreur("Seuls les échanges en attente, en cours ou traités peuvent être signalés.");
  if (d.signalement_ouvert) throw new Erreur("Un signalement est déjà en cours pour cet échange : un administrateur va vous répondre.");
  const motif = texte(s2.motif, "motif", 200).trim();
  if (MOTIFS_SIGNALEMENT.indexOf(motif) < 0) throw new Erreur("Choisissez le motif du signalement.");
  const description = texte(s2.description, "description", 2e3).replace(/\s+$/g, "").trim();
  if (motif === "Autre problème" && description.length < 5) throw new Erreur("Décrivez le problème en quelques mots.");
  if (description.length > 500) throw new Erreur("La description est trop longue (500 caractères au maximum).");
  const img = image(s2.image, "capture", IMAGE_MAX_BASE64);
  return transaction(async (tx) => {
    await tx.exec("SELECT id FROM demandes_echange WHERE id = ? FOR UPDATE", [d.id]);
    const r = await tx.ligne(
      "INSERT INTO signalements (demande_id, utilisateur_id, statut_demande, motif, description, image, image_mime, statut, date_creation) SELECT ?::bigint, ?::bigint, ?::text, ?::text, ?::text, ?::bytea, ?::text, 'EN_ATTENTE', ?::bigint WHERE NOT EXISTS (SELECT 1 FROM signalements WHERE demande_id = ? AND statut <> 'TRAITE') RETURNING id",
      [d.id, acteur.id, d.statut, motif, description || null, img ? Buffer.from(img.base64, "base64") : null, img ? img.mime : null, Date.now(), d.id]
    );
    if (!r) throw new Erreur("Un signalement est déjà en cours pour cet échange.");
    await notifierAdmins(
      tx,
      "SIGNALEMENT",
      "Nouveau signalement",
      d.client_nom + " signale un problème sur l’échange " + d.reference + " (" + d.source_nom + " → " + d.dest_nom + ", " + fdj(d.montant) + ") : " + motif + ".",
      d.id
    );
    await journaliser(tx, acteur.id, "SIGNALEMENT", "Échange " + d.reference + " signalé : " + motif);
    return r.id;
  });
}
async function prendreEnCharge(acteur, args) {
  exigerRole(acteur, ["ADMIN", "SUPER_ADMIN"]);
  const id = entier(args.id, "signalement", 1);
  await transaction(async (tx) => {
    const sg = await signalementParId(tx, id);
    if (!sg) throw new Erreur("Signalement introuvable.");
    if (sg.statut !== "EN_ATTENTE") throw new Erreur("Ce signalement est déjà pris en charge.");
    await tx.exiger(
      "UPDATE signalements SET statut = 'EN_COURS', traite_par = ?, date_prise_en_charge = ? WHERE id = ? AND statut = 'EN_ATTENTE'",
      [acteur.id, Date.now(), id],
      "Ce signalement est déjà pris en charge."
    );
    await notifier(
      tx,
      sg.utilisateur_id,
      "SIGNALEMENT_EN_COURS",
      "Signalement en cours de traitement",
      "Votre signalement sur l’échange " + sg.reference + " est en cours de traitement par un administrateur.",
      sg.demande_id
    );
    await journaliser(tx, acteur.id, "SIGNALEMENT_PRIS", "Signalement de l’échange " + sg.reference + " pris en charge");
  });
}
async function repondreSignalement(acteur, args) {
  exigerRole(acteur, ["ADMIN", "SUPER_ADMIN"]);
  const id = entier(args.id, "signalement", 1);
  const r = objet(args.reponse, "réponse");
  const reponse = texte(r.reponse, "réponse", 4e3).trim();
  if (reponse.length < 3) throw new Erreur("Écrivez votre réponse au client.");
  if (reponse.length > 1e3) throw new Erreur("La réponse est trop longue (1 000 caractères au maximum).");
  const img = image(r.image, "image preuve", IMAGE_MAX_BASE64);
  await transaction(async (tx) => {
    const sg = await signalementParId(tx, id);
    if (!sg) throw new Erreur("Signalement introuvable.");
    if (sg.statut === "TRAITE") throw new Erreur("Une réponse a déjà été envoyée pour ce signalement.");
    const t = Date.now();
    await tx.exiger(
      "UPDATE signalements SET statut = 'TRAITE', reponse = ?, reponse_image = ?, reponse_mime = ?, traite_par = ?, date_prise_en_charge = COALESCE(date_prise_en_charge, ?), date_reponse = ? WHERE id = ? AND statut <> 'TRAITE'",
      [reponse, img ? Buffer.from(img.base64, "base64") : null, img ? img.mime : null, acteur.id, t, t, id],
      "Une réponse a déjà été envoyée pour ce signalement."
    );
    await notifier(
      tx,
      sg.utilisateur_id,
      "SIGNALEMENT_TRAITE",
      "Réponse à votre signalement",
      "Échange " + sg.reference + " : " + (reponse.length > 140 ? reponse.substring(0, 137) + "…" : reponse),
      sg.demande_id
    );
    await journaliser(tx, acteur.id, "SIGNALEMENT_TRAITE", "Réponse au signalement de l’échange " + sg.reference + (img ? " (avec image preuve)" : ""));
  });
}

// src/operations.ts
function a(ctx) {
  return ctx.acteur;
}
function s(ctx) {
  return ctx.session;
}
function acteurFacultatif(ctx) {
  return ctx.acteur && ctx.session && !ctx.session.doitChanger ? ctx.acteur : null;
}
var OPERATIONS = {
  // --- serveur
  "serveur.info": { acces: "public", executer: async () => ({ version: VERSION, modeTest: config.modeTest, email: emailConfigure() }) },
  // --- authentification
  "auth.connexion": { acces: "public", limite: "connexion", executer: (args) => seConnecter(args) },
  "auth.connexionEmpreinte": { acces: "public", limite: "connexion", executer: (args) => seConnecterParEmpreinte(args) },
  "auth.inscrire": { acces: "public", limite: "inscription", executer: (args) => inscrire(args) },
  "auth.confirmerEmail": { acces: "public", limite: "code", executer: (args) => confirmerEmail(args) },
  "auth.renvoyerCode": { acces: "public", limite: "envoi", executer: (args) => renvoyerCode(args) },
  "auth.delaiRenvoi": { acces: "public", executer: (args) => delaiRenvoi(args) },
  "auth.demanderReinitialisation": { acces: "public", limite: "envoi", executer: (args) => demanderReinitialisation(args) },
  "auth.reinitialiser": { acces: "public", limite: "code", executer: (args) => reinitialiserMotDePasse(args) },
  "auth.session": {
    acces: "connecte",
    restreint: true,
    executer: async (args, ctx) => ({ utilisateur: a(ctx), seSouvenir: s(ctx).seSouvenir, doitChangerMdp: s(ctx).doitChanger })
  },
  "auth.deconnexion": { acces: "connecte", restreint: true, executer: (args, ctx) => seDeconnecter(s(ctx)) },
  "auth.motDePasseObligatoire": {
    acces: "connecte",
    restreint: true,
    limite: "connexion",
    executer: (args, ctx) => motDePasseObligatoire(a(ctx), s(ctx), args)
  },
  "auth.changerMotDePasse": { acces: "connecte", limite: "connexion", executer: (args, ctx) => changerMotDePasse(a(ctx), s(ctx), args) },
  "auth.majProfil": { acces: "connecte", executer: (args, ctx) => majProfil(a(ctx), args) },
  // --- empreinte digitale
  "empreinte.activer": { acces: "connecte", limite: "connexion", executer: (args, ctx) => activerEmpreinte(a(ctx), args) },
  "empreinte.etat": { acces: "connecte", executer: (args, ctx) => etatEmpreinteServeur(a(ctx), args) },
  "empreinte.desactiver": { acces: "connecte", executer: (args, ctx) => desactiverEmpreinte(a(ctx), args) },
  // --- comptes (super admin)
  "comptes.lister": { acces: "super", executer: (args, ctx) => listerComptes(a(ctx), args) },
  "comptes.creerAdmin": { acces: "super", executer: async (args, ctx) => ({ id: await creerAdmin(a(ctx), args) }) },
  "comptes.definirStatut": { acces: "super", executer: (args, ctx) => definirStatutCompte(a(ctx), args) },
  "comptes.definirMotDePasseAdmin": { acces: "super", executer: (args, ctx) => definirMotDePasseAdmin(a(ctx), args) },
  // --- paramètres, journal, notifications
  "parametres.lire": { acces: "public", executer: () => chargerParametres() },
  "parametres.enregistrer": { acces: "super", executer: (args, ctx) => enregistrerParametres(a(ctx), args.modifs) },
  "journal.lister": { acces: "super", executer: (args, ctx) => listerJournal(a(ctx), args.limite) },
  "notifications.lister": { acces: "connecte", executer: (args, ctx) => mesNotifications(a(ctx), args.limite) },
  "notifications.nonLues": { acces: "connecte", executer: (args, ctx) => nombreNonLues(a(ctx)) },
  "notifications.marquerLues": { acces: "connecte", executer: (args, ctx) => marquerNotificationsLues(a(ctx), args.id) },
  "notifications.supprimer": { acces: "connecte", executer: (args, ctx) => supprimerNotifications(a(ctx)) },
  "notifications.aPresenter": { acces: "connecte", executer: (args, ctx) => notificationsAPresenter(a(ctx)) },
  // --- wallets
  "wallets.lister": { acces: "public", executer: (args, ctx) => listerWallets(acteurFacultatif(ctx)) },
  "wallets.creer": { acces: "super", executer: async (args, ctx) => ({ id: await creerWallet(a(ctx), args) }) },
  "wallets.modifier": { acces: "super", executer: (args, ctx) => majWallet(a(ctx), args) },
  "wallets.supprimer": { acces: "super", executer: (args, ctx) => supprimerWallet(a(ctx), args) },
  "wallets.definirModes": { acces: "super", executer: (args, ctx) => definirModes(a(ctx), args) },
  "wallets.actualiserSoldes": { acces: "admin", executer: (args, ctx) => actualiserSoldes2(a(ctx)) },
  "wallets.soldeSimule": { acces: "super", executer: (args, ctx) => definirSoldeSimule(a(ctx), args) },
  // --- demandes d'échange
  "demandes.lister": { acces: "connecte", executer: (args, ctx) => listerDemandes(a(ctx), args.filtre) },
  "demandes.lire": { acces: "connecte", executer: (args, ctx) => lireDemande(a(ctx), args) },
  "demandes.preuve": { acces: "connecte", executer: (args, ctx) => preuveDe(a(ctx), args) },
  "demandes.compteursClient": { acces: "utilisateur", executer: (args, ctx) => compteursClient(a(ctx), args) },
  "demandes.numerosRecents": { acces: "utilisateur", executer: (args, ctx) => numerosRecents(a(ctx), args) },
  "demandes.creer": { acces: "utilisateur", executer: async (args, ctx) => ({ id: await creerDemande(a(ctx), args) }) },
  "demandes.annuler": { acces: "utilisateur", executer: (args, ctx) => annulerDemande(a(ctx), args) },
  "demandes.confirmer": { acces: "utilisateur", executer: (args, ctx) => confirmerDemande(a(ctx), args) },
  "demandes.compteursAdmin": { acces: "admin", executer: (args, ctx) => compteursAdmin(a(ctx)) },
  "demandes.confirmerParAdmin": { acces: "admin", executer: (args, ctx) => confirmerParAdmin(a(ctx), args) },
  "demandes.refuser": { acces: "admin", executer: (args, ctx) => refuserParAdmin(a(ctx), args) },
  "demandes.autoriserEnvoi": { acces: "admin", executer: (args, ctx) => autoriserEnvoi(a(ctx), args) },
  "demandes.validerPaiement": { acces: "admin", executer: (args, ctx) => validerPaiement(a(ctx), args) },
  // --- téléphone passerelle (test D-Money / Waafi)
  "passerelle.associer": { acces: "public", limite: "code", executer: (args) => associer(args) },
  "passerelle.synchroniser": {
    acces: "passerelle",
    executer: (args, ctx) => synchroniser(ctx.passerelle.id, args)
  },
  "passerelle.etat": { acces: "super", executer: (args, ctx) => etat(a(ctx)) },
  "passerelle.creerCode": { acces: "super", executer: (args, ctx) => creerCode(a(ctx)) },
  "passerelle.dissocier": { acces: "super", executer: (args, ctx) => dissocier(a(ctx)) },
  "passerelle.affecterWallet": { acces: "super", executer: (args, ctx) => affecterWallet(a(ctx), args) },
  "passerelle.ordreEssai": { acces: "super", executer: (args, ctx) => ordreEssai(a(ctx), args) },
  "passerelle.reglerExpediteurs": { acces: "super", executer: (args, ctx) => reglerExpediteurs(a(ctx), args) },
  // --- signalements
  "signalements.lister": { acces: "connecte", executer: (args, ctx) => listerSignalements(a(ctx), args.filtre) },
  "signalements.lire": { acces: "connecte", executer: (args, ctx) => lireSignalement(a(ctx), args) },
  "signalements.image": { acces: "connecte", executer: (args, ctx) => imageSignalement(a(ctx), args) },
  "signalements.aTraiter": { acces: "admin", executer: (args, ctx) => nombreSignalementsATraiter(a(ctx)) },
  "signalements.creer": { acces: "utilisateur", executer: async (args, ctx) => ({ id: await creerSignalement(a(ctx), args) }) },
  "signalements.prendreEnCharge": { acces: "admin", executer: (args, ctx) => prendreEnCharge(a(ctx), args) },
  "signalements.repondre": { acces: "admin", executer: (args, ctx) => repondreSignalement(a(ctx), args) },
  // --- rapports
  "rapports.tableauDeBord": { acces: "admin", executer: (args, ctx) => tableauDeBord(a(ctx), args) },
  "rapports.construire": { acces: "admin", executer: (args, ctx) => donneesRapport(a(ctx), args) },
  // --- outils de test (super admin, mode test)
  "outils.genererDemo": { acces: "super", executer: async (args, ctx) => ({ total: await genererDonneesDemo(a(ctx)) }) },
  "outils.effacer": { acces: "super", executer: (args, ctx) => effacerDonneesEchanges(a(ctx)) }
};
function autorise(acces, u) {
  if (u.statut !== "ACTIF") return false;
  if (acces === "connecte") return true;
  if (acces === "utilisateur") return u.role === "UTILISATEUR";
  if (acces === "admin") return u.role === "ADMIN" || u.role === "SUPER_ADMIN";
  if (acces === "super") return u.role === "SUPER_ADMIN";
  return false;
}
async function executerOperation(nom, args, ctx) {
  const op = Object.prototype.hasOwnProperty.call(OPERATIONS, nom) ? OPERATIONS[nom] : null;
  if (!op) throw new ErreurHttp(404, "INCONNUE", "Opération inconnue.");
  if (op.limite) limiter(op.limite, ctx.ip);
  if (op.acces === "passerelle") {
    if (!ctx.passerelle) throw new ErreurHttp(401, "PASSERELLE", "Téléphone passerelle non associé. Associez-le de nouveau depuis l’écran Passerelle.");
  } else if (op.acces !== "public") {
    if (!ctx.acteur || !ctx.session) throw new ErreurHttp(401, "SESSION", ctx.refusSession || "Connectez-vous pour continuer.");
    if (ctx.session.doitChanger && !op.restreint) {
      throw new ErreurHttp(403, "MDP_A_CHANGER", "Choisissez d’abord votre nouveau mot de passe.");
    }
    if (!autorise(op.acces, ctx.acteur)) throw new ErreurHttp(403, "DROITS", MSG_DROITS);
  }
  const resultat = await op.executer(args, ctx);
  return resultat === void 0 ? null : resultat;
}

// src/main.ts
var TAILLE_MAX_REQUETE = 3 * 1024 * 1024;
var PREFIXE_API = "/api/v1/";
var pret = false;
var erreurDemarrage = null;
var ENTETES_SECURITE = {
  "Content-Type": "application/json; charset=utf-8",
  "Cache-Control": "no-store",
  "X-Content-Type-Options": "nosniff",
  "X-Frame-Options": "DENY",
  "Referrer-Policy": "no-referrer",
  "Content-Security-Policy": "default-src 'none'; frame-ancestors 'none'",
  "Strict-Transport-Security": "max-age=31536000; includeSubDomains",
  "Cross-Origin-Resource-Policy": "same-origin"
};
function repondre(res, statut, corps) {
  if (res.headersSent) return;
  const texte2 = JSON.stringify(corps);
  res.writeHead(statut, Object.assign({ "Content-Length": Buffer.byteLength(texte2) }, ENTETES_SECURITE));
  res.end(texte2);
}
function adresseClient(req) {
  const h = req.headers;
  const directe = (v) => (Array.isArray(v) ? v[0] : v || "").trim();
  const candidat = directe(h["true-client-ip"]) || directe(h["cf-connecting-ip"]) || directe(h["x-forwarded-for"]).split(",")[0].trim() || req.socket.remoteAddress || "inconnue";
  return candidat.substring(0, 64);
}
function lireCorps(req) {
  return new Promise((resolve, reject) => {
    let taille = 0;
    const morceaux = [];
    req.on("data", (m) => {
      taille += m.length;
      if (taille > TAILLE_MAX_REQUETE) {
        reject(new ErreurHttp(413, "TROP_GROS", "La requête est trop volumineuse."));
        req.destroy();
        return;
      }
      morceaux.push(m);
    });
    req.on("end", () => resolve(Buffer.concat(morceaux).toString("utf8")));
    req.on("error", reject);
  });
}
function jetonDe(req) {
  const h = req.headers.authorization || "";
  const m = /^Bearer\s+([0-9a-f]{64})$/i.exec(h.trim());
  return m ? m[1].toLowerCase() : null;
}
function jetonPasserelleDe(req) {
  const h = req.headers.authorization || "";
  const m = /^Passerelle\s+([0-9a-f]{64})$/i.exec(h.trim());
  return m ? m[1].toLowerCase() : null;
}
async function sante(res) {
  let baseOk = false;
  try {
    baseOk = await base().valeur("SELECT 1 AS ok") === 1;
  } catch (e) {
    baseOk = false;
  }
  repondre(res, baseOk && pret ? 200 : 503, {
    ok: baseOk && pret,
    base: baseOk ? "connectee" : "indisponible",
    version: VERSION,
    pret,
    email: emailConfigure() ? "configure" : "non configure",
    modeTest: config.modeTest
  });
}
async function api(req, res, nom) {
  const debut = Date.now();
  const ip = adresseClient(req);
  let statut = 200;
  let uid = null;
  try {
    if (!autoriser("tout", ip)) throw new ErreurHttp(429, "TROP_DE_REQUETES", "Trop de requêtes. Patientez quelques minutes puis réessayez.");
    if (!pret) throw new ErreurHttp(503, "DEMARRAGE", erreurDemarrage ? "Le serveur n’est pas disponible pour le moment." : "Le serveur démarre. Réessayez dans un instant.");
    if (!/^[a-z]+\.[A-Za-z]+$/.test(nom)) throw new ErreurHttp(404, "INCONNUE", "Opération inconnue.");
    const type = String(req.headers["content-type"] || "");
    if (type.split(";")[0].trim().toLowerCase() !== "application/json") throw new ErreurHttp(415, "FORMAT", "Format de requête non pris en charge.");
    const brut = await lireCorps(req);
    let args;
    try {
      args = brut ? JSON.parse(brut) : {};
    } catch (e) {
      throw new ErreurHttp(400, "JSON", "Requête illisible.");
    }
    if (!args || typeof args !== "object" || Array.isArray(args)) throw new ErreurHttp(400, "JSON", "Requête illisible.");
    const ctx = { acteur: null, session: null, refusSession: null, ip, passerelle: null };
    const jeton = jetonDe(req);
    const jetonPasserelle = jetonPasserelleDe(req);
    if (jetonPasserelle) {
      ctx.passerelle = await passerelleParJeton(jetonPasserelle);
    } else if (jeton) {
      const s2 = await lireSession(jeton);
      if ("refus" in s2) {
        ctx.refusSession = s2.refus;
      } else {
        ctx.acteur = s2.acteur;
        ctx.session = s2.session;
        uid = s2.acteur.id;
      }
    } else if (req.headers.authorization) {
      ctx.refusSession = "Votre session a expiré. Reconnectez-vous.";
    }
    const data = await executerOperation(nom, args, ctx);
    repondre(res, 200, { ok: true, data });
  } catch (e) {
    if (e instanceof ErreurHttp) {
      statut = e.statut;
      repondre(res, e.statut, { ok: false, code: e.code, erreur: e.message });
    } else if (e instanceof Erreur) {
      statut = 400;
      repondre(res, 400, { ok: false, code: "METIER", erreur: e.message });
    } else {
      statut = 500;
      console.error("[api] " + nom + " : erreur interne :", e instanceof Error ? e.stack || e.message : String(e));
      repondre(res, 500, { ok: false, code: "INTERNE", erreur: "Erreur du serveur. Réessayez dans un instant." });
    }
  } finally {
    console.log("[api] " + nom.substring(0, 60) + " " + statut + " " + (Date.now() - debut) + " ms" + (uid ? " u" + uid : ""));
  }
}
function creerServeur() {
  const serveur = http.createServer((req, res) => {
    const url = (req.url || "/").split("?")[0];
    if (req.method === "GET" && (url === "/health" || url === "/healthz")) {
      if (!autoriser("tout", adresseClient(req))) {
        repondre(res, 429, { ok: false, code: "TROP_DE_REQUETES", erreur: "Trop de requêtes." });
        return;
      }
      sante(res).catch(() => repondre(res, 503, { ok: false }));
      return;
    }
    if (req.method === "GET" && url === "/") {
      repondre(res, 200, { service: "Dj Wallet Exchange API", version: VERSION });
      return;
    }
    if (url.indexOf(PREFIXE_API) === 0) {
      if (req.method !== "POST") {
        repondre(res, 405, { ok: false, code: "METHODE", erreur: "Méthode non autorisée." });
        return;
      }
      api(req, res, url.substring(PREFIXE_API.length)).catch(() => repondre(res, 500, { ok: false, code: "INTERNE", erreur: "Erreur du serveur." }));
      return;
    }
    repondre(res, 404, { ok: false, code: "INTROUVABLE", erreur: "Adresse inconnue." });
  });
  serveur.requestTimeout = 9e4;
  serveur.headersTimeout = 3e4;
  serveur.keepAliveTimeout = 65e3;
  return serveur;
}
async function preparerBase(essais = Infinity) {
  for (let n = 1; n <= essais; n++) {
    try {
      const r = await migrer();
      r.actions.forEach((x) => console.log("[base] " + x));
      console.log("[base] schéma version " + r.version + " — serveur prêt.");
      pret = true;
      erreurDemarrage = null;
      return;
    } catch (e) {
      erreurDemarrage = e instanceof Error ? e.message : String(e);
      console.error("[base] mise à jour impossible (essai " + n + ") : " + erreurDemarrage);
      if (n >= essais) throw e;
      await new Promise((r) => setTimeout(r, Math.min(6e4, 5e3 * n)));
    }
  }
}
function demarrer() {
  if (!config.databaseUrl) {
    console.error("Variable DATABASE_URL manquante (Render ▸ Environment).");
    process.exit(1);
  }
  const serveur = creerServeur();
  serveur.listen(config.port, () => {
    console.log("Dj Wallet Exchange API " + VERSION + " — port " + config.port + (config.modeTest ? " — MODE TEST" : "") + " — e-mails " + (emailConfigure() ? "configurés" : "NON configurés"));
  });
  preparerBase().catch(() => {
  });
  setInterval(() => {
    if (pret) nettoyerExpirees().catch((e) => console.error("[base] nettoyage :", e && e.message));
  }, 60 * 60 * 1e3).unref();
  setInterval(() => {
    if (pret) avancer().catch((e) => console.error("[passerelle] avancement :", e && e.message));
  }, 30 * 1e3).unref();
  const arreter = () => {
    serveur.close(() => {
      fermerPool().finally(() => process.exit(0));
    });
    setTimeout(() => process.exit(0), 8e3).unref();
  };
  process.on("SIGTERM", arreter);
  process.on("SIGINT", arreter);
}
if (require.main === module) demarrer();
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  creerServeur,
  preparerBase
});
