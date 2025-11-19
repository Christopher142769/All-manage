// server.js

// -------------------- Imports & Configuration (MODIFIÉ) --------------------
require('dotenv').config(); // CHARGE LES VARIABLES D'ENVIRONNEMENT
const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs'); // NOUVEAU: Pour le hachage des mots de passe
const jwt = require('jsonwebtoken'); // NOUVEAU: Pour l'authentification
const { parse: json2csv } = require('json2csv'); 

const app = express();
app.use(cors());
// IMPORTANT: Augmenter la limite de taille du corps de la requête pour les images Base64
app.use(express.json({ limit: '50mb' })); 

// -------------------- Configuration MongoDB (MODIFIÉ) --------------------

const MONGODB_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/gestion_boutiques';

mongoose.connect(MONGODB_URI)
  .then(() => console.log('Connexion à MongoDB réussie !'))
  .catch(err => console.error('Erreur de connexion à MongoDB:', err));

// -------------------- Schémas Mongoose (MODIFIÉ) --------------------

const CompanySchema = new mongoose.Schema({
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  companyPhone: { type: String, default: '' },
});
const Company = mongoose.model('Company', CompanySchema);

const BoutiqueSchema = new mongoose.Schema({
  companyId: { type: mongoose.Schema.Types.ObjectId, ref: 'Company', required: true },
  name: { type: String, required: true, unique: true },
  managerName: { type: String, required: true },
  managerPassword: { type: String, required: true },
  initialBankBalance: { type: Number, default: 0 },
  logoBase64: { type: String, default: '' }
});
const Boutique = mongoose.model('Boutique', BoutiqueSchema);

const CashbookEntrySchema = new mongoose.Schema({
  boutiqueId: { type: mongoose.Schema.Types.ObjectId, ref: 'Boutique', required: true },
  date: { type: String, required: true },
  pieceNumber: String,
  description: { type: String, required: true },
  type: { type: String, enum: ['in', 'out'], required: true },
  amount: { type: Number, default: 0 },
});
const CashbookEntry = mongoose.model('CashbookEntry', CashbookEntrySchema);

const BankEntrySchema = new mongoose.Schema({
    boutiqueId: { type: mongoose.Schema.Types.ObjectId, ref: 'Boutique', required: true },
    date: { type: String, required: true },
    pieceNumber: String,
    description: { type: String, required: true },
    type: { type: String, enum: ['credit', 'debit'], required: true },
    amount: { type: Number, default: 0 },
});
const BankEntry = mongoose.model('BankEntry', BankEntrySchema);

const ProductSchema = new mongoose.Schema({
  boutiqueId: { type: mongoose.Schema.Types.ObjectId, ref: 'Boutique', required: true },
  name: { type: String, required: true },
  unitPrice: { type: Number, default: 0 },
  costPrice: { type: Number, default: 0 },
});
const Product = mongoose.model('Product', ProductSchema);

const ClientSchema = new mongoose.Schema({
  boutiqueId: { type: mongoose.Schema.Types.ObjectId, ref: 'Boutique', required: true },
  name: { type: String, required: true },
});
const Client = mongoose.model('Client', ClientSchema);

const SaleSchema = new mongoose.Schema({
  boutiqueId: { type: mongoose.Schema.Types.ObjectId, ref: 'Boutique', required: true },
  date: { type: String, required: true },
  clientId: { type: mongoose.Schema.Types.ObjectId, ref: 'Client' },
  clientName: String,
  productId: { type: mongoose.Schema.Types.ObjectId, ref: 'Product' },
  productName: { type: String, required: true },
  unitPrice: { type: Number, default: 0 },
  quantity: { type: Number, default: 0 },
  quantityDelivered: { type: Number, default: 0 },
  amountPaid: { type: Number, default: 0 },
  tableNumber: String,
  serverName: String,
  invoiceNumber: { type: String, unique: false}, // Note: unique: false laissé pour ne pas casser votre BD existante, mais la logique FAC-XXXX est corrigée
});
const Sale = mongoose.model('Sale', SaleSchema);

const PurchaseSchema = new mongoose.Schema({
    boutiqueId: { type: mongoose.Schema.Types.ObjectId, ref: 'Boutique', required: true },
    date: { type: String, required: true },
    productName: { type: String, required: true, uppercase: true, match: /^[A-Z\s]+$/ },
    unitPrice: { type: Number, default: 0 },
    quantity: { type: Number, default: 0 },
});
const Purchase = mongoose.model('Purchase', PurchaseSchema);

const AuditLogSchema = new mongoose.Schema({
  action: { type: String, required: true },
  entityType: { type: String, required: true },
  entityId: mongoose.Schema.Types.ObjectId,
  performedBy: mongoose.Schema.Types.Mixed,
  reason: String,
  before: mongoose.Schema.Types.Mixed,
  after: mongoose.Schema.Types.Mixed,
  timestamp: { type: Date, default: Date.now },
});
const AuditLog = mongoose.model('AuditLog', AuditLogSchema);

// -------------------- Middleware d'Authentification JWT (NOUVEAU) --------------------

const JWT_SECRET = process.env.JWT_SECRET;

const authMiddleware = (req, res, next) => {
    // Tenter de récupérer le token depuis le header Authorization
    const token = req.header('Authorization')?.replace('Bearer ', '');

    if (!token) {
        // Si aucun token n'est trouvé
        return res.status(401).json({ message: 'Accès refusé. Aucun token fourni.' });
    }

    try {
        // Vérifier et décoder le token
        const decoded = jwt.verify(token, JWT_SECRET);
        
        // Ajouter les données décodées à la requête (id utilisateur, type, etc.)
        req.user = decoded; 
        next();
    } catch (err) {
        // Si la vérification échoue (token invalide, expiré)
        return res.status(401).json({ message: 'Token invalide.' });
    }
};

// -------------------- Fonctions Helpers --------------------

// Helper : ajout log
async function addAudit(action, entityType, entityId, performedBy, reason, before, after) {
  try {
    await AuditLog.create({
      action,
      entityType,
      entityId,
      performedBy: performedBy || null,
      reason: reason || '',
      before,
      after,
    });
  } catch (err) {
    console.error('Erreur lors de l\'ajout de l\'audit log:', err);
  }
}

// Helper : filtrage par période (dates au format YYYY-MM-DD)
function filterByPeriod(query, from, to) {
  const dateQuery = {};
  if (from) dateQuery.$gte = from;
  if (to) dateQuery.$lte = to;
  if (Object.keys(dateQuery).length > 0) {
    query.date = dateQuery;
  }
  return query;
}

// Helper : résumé d’une boutique (Version Mongoose)
async function computeBoutiqueSummary(boutiqueId, from = null, to = null) {
  const boutique = await Boutique.findById(boutiqueId);
  if (!boutique) throw new Error('Boutique introuvable');
  
  const cashbookQuery = filterByPeriod({ boutiqueId }, from, to);
  const salesQuery = filterByPeriod({ boutiqueId }, from, to);
  const bankQuery = filterByPeriod({ boutiqueId }, from, to);
  const purchaseQuery = filterByPeriod({ boutiqueId }, from, to);
  
  const [cashEntries, bsales, bankEntries, purchases, productsList] = await Promise.all([
    CashbookEntry.find(cashbookQuery).sort('date'),
    Sale.find(salesQuery),
    BankEntry.find(bankQuery).sort('date'),
    Purchase.find(purchaseQuery),
    Product.find({ boutiqueId }),
  ]);

  // --- 1. Flux de Caisse ---
  let totalInCaisse = 0;
  let totalOutCaisse = 0;
  let currentCashBalance = 0; // Calculer le solde de caisse actuel (solde initial caisse non géré)
  cashEntries.forEach(e => {
    if (e.type === 'in') {
        totalInCaisse += e.amount;
        currentCashBalance += e.amount;
    }
    else {
        totalOutCaisse += e.amount;
        currentCashBalance -= e.amount;
    }
  });
  const cashBalance = currentCashBalance; // Solde de caisse uniquement basé sur les mouvements Cashbook

  // --- 2. Flux Bancaire ---
  let totalCreditBanque = 0;
  let totalDebitBanque = 0;
  
  let runningBankBalance = boutique.initialBankBalance || 0;
  bankEntries.forEach(e => {
    if (e.type === 'credit') {
        totalCreditBanque += e.amount;
        runningBankBalance += e.amount;
    } else {
        totalDebitBanque += e.amount;
        runningBankBalance -= e.amount;
    }
  });
  const bankBalance = runningBankBalance;

  // --- 3. Flux de Ventes & Achats ---
  let totalSales = 0; // Cumul du CA total des ventes
  let totalPaid = 0; // Cumul de l'argent encaissé
  let totalCost = 0;
  let totalProfit = 0;
  
  let totalPurchases = 0; // Cumul des coûts d'achats (la "sortie" demandée)
  purchases.forEach(p => {
      totalPurchases += p.unitPrice * p.quantity;
  });

  const byProductMap = {};
  bsales.forEach(s => {
    const total = s.unitPrice * s.quantity;
    totalSales += total;
    totalPaid += s.amountPaid;

    const prod = productsList.find(p => p._id.toString() === s.productId?.toString());
    const unitCost = prod ? prod.costPrice : 0;
    const cost = unitCost * s.quantity;
    
    totalCost += cost;
    totalProfit += total - cost;

    const key = s.productName || 'Inconnu';
    if (!byProductMap[key]) {
      byProductMap[key] = {
        productName: key,
        quantity: 0,
        revenue: 0,
        cost: 0,
        profit: 0,
      };
    }
    byProductMap[key].quantity += s.quantity;
    byProductMap[key].revenue += total;
    byProductMap[key].cost += cost;
    byProductMap[key].profit += total - cost;
  });
  
  const clientDebt = totalSales - totalPaid;

  // --- 4. Calculs Globaux (CORRECTION DE LA TRÉSORERIE selon la nouvelle formule) ---
  
  // Trésorerie Totale (Tot.) selon la formule demandée :
  // (Cumul Entrée Caisse + Ventes Totales) - (Cumul Sorties Caisse + Achats Totaux)
  const totalInTrésorerie = totalInCaisse + totalSales; 
  const totalOutTrésorerie = totalOutCaisse + totalPurchases; 
  
  // cashResult devient la Trésorerie Totale (flux, sans prendre en compte la banque/solde initial)
  const cashResult = totalInTrésorerie - totalOutTrésorerie; 
  
  // Résultat Global (pour le suivi du résultat) :
  const totalExpenses = totalOutCaisse + totalPurchases + totalDebitBanque; // Dépenses : Caisse Out + Achats Stock + Banque Débit
  const totalGlobalIn = totalInCaisse + totalSales + totalCreditBanque;
  const globalResult = totalGlobalIn - totalExpenses; 


  return {
    // Caisse & Banque
    totalInCaisse,
    totalOutCaisse,
    cashBalance, // Solde Caisse au final de la période (basé uniquement sur Cashbook)
    bankBalance, // Solde Banque au final de la période (Initial + Flux)
    totalCreditBanque,
    totalDebitBanque,

    // Ventes & Achats
    totalSales,
    totalPaid,
    totalPurchases, 
    clientDebt,
    
    // Résultat Global
    totalExpenses, 
    totalGlobalIn,
    globalResult, 
    cashResult, // TRÉSORERIE CORRIGÉE: (Entrées Caisse + Ventes) - (Sorties Caisse + Achats Stock)
    
    // Bénéfice/Coût
    totalCost,
    totalProfit,
    products: Object.values(byProductMap),
  };
}

// Middleware spécifique pour vérifier l'autorisation sur une ressource de boutique
const checkBoutiqueAuthorization = async (req, res, next) => {
// ... (Reste inchangé) ...
    let boutiqueId = req.params.id || req.body.boutiqueId;

    if (!boutiqueId && req.params.entryId) {
        // Pour les routes PUT/DELETE qui utilisent l'ID de l'entrée, trouver la boutiqueId associée
        try {
            const entry = await CashbookEntry.findById(req.params.entryId) ||
                          await BankEntry.findById(req.params.entryId) ||
                          await Product.findById(req.params.entryId) ||
                          await Client.findById(req.params.entryId) ||
                          await Sale.findById(req.params.entryId) ||
                          await Purchase.findById(req.params.entryId);
            if (entry) boutiqueId = entry.boutiqueId;
        } catch (e) {
            return res.status(404).json({ message: 'Ressource associée introuvable.' });
        }
    }
    
    if (!boutiqueId) {
        return res.status(400).json({ message: 'ID de boutique ou d\'entrée manquant.' });
    }

    const boutique = await Boutique.findById(boutiqueId);
    if (!boutique) return res.status(404).json({ message: 'Boutique introuvable.' });

    // Autorisation : Est-ce la compagnie OU est-ce le gérant de cette boutique?
    const isAuthorized = req.user.id === boutique.companyId.toString() || req.user.id === boutiqueId;

    if (!isAuthorized) {
        return res.status(403).json({ message: 'Accès non autorisé à cette ressource de boutique.' });
    }
    
    req.boutique = boutique; // Attacher la boutique à la requête pour une utilisation ultérieure
    next();
};


// -------------------- Auth Entreprise (MODIFIÉ: Bcrypt + JWT) --------------------

app.post('/api/auth/company/register', async (req, res) => {
// ... (Reste inchangé) ...
  const { name, email, password, companyPhone } = req.body;
  if (!name || !email || !password) {
    return res.status(400).json({ message: 'Nom, email et mot de passe requis.' });
  }
  try {
    // 1. HACHAGE du mot de passe
    const hashedPassword = await bcrypt.hash(password, Number(process.env.BCRYPT_SALT_ROUNDS || 10));
    
    // 2. Création de la compagnie avec le mot de passe HACHÉ
    const company = await Company.create({ 
        name, 
        email, 
        password: hashedPassword, 
        companyPhone: companyPhone || '' 
    });
    
    // 3. Génération du Token JWT
    const token = jwt.sign(
        { id: company._id, type: 'company' }, 
        JWT_SECRET, 
        { expiresIn: process.env.JWT_EXPIRES_IN || '24h' }
    );
    
    // 4. Réponse
    res.json({ company: { ...company.toObject(), id: company._id }, token });
  } catch (err) {
    if (err.code === 11000) return res.status(400).json({ message: 'Email déjà utilisé.' });
    res.status(500).json({ message: 'Erreur serveur.' });
  }
});

app.post('/api/auth/company/login', async (req, res) => {
// ... (Reste inchangé) ...
  const { email, password } = req.body;
  
  try {
    const company = await Company.findOne({ email });
    if (!company) {
      return res.status(401).json({ message: 'Identifiants invalides.' });
    }
    
    // 1. COMPARAISON du mot de passe HACHÉ
    const isMatch = await bcrypt.compare(password, company.password);
    if (!isMatch) {
      return res.status(401).json({ message: 'Identifiants invalides.' });
    }
    
    // 2. Génération du Token JWT
    const token = jwt.sign(
        { id: company._id, type: 'company' }, 
        JWT_SECRET, 
        { expiresIn: process.env.JWT_EXPIRES_IN || '24h' }
    );
    
    // 3. Réponse
    res.json({ company: { ...company.toObject(), id: company._id }, token });
  } catch(err) {
    res.status(500).json({ message: 'Erreur serveur lors de la connexion.' });
  }
});

// NOUVEAU: Endpoint de changement de mot de passe pour l'entreprise (SÉCURISÉ)
app.put('/api/auth/company/change-password', authMiddleware, async (req, res) => {
// ... (Reste inchangé) ...
    if (req.user.type !== 'company') {
        return res.status(403).json({ message: 'Seule une compagnie peut changer son mot de passe ici.' });
    }
    
    const companyId = req.user.id;
    const { oldPassword, newPassword } = req.body;
    
    if (!oldPassword || !newPassword) {
        return res.status(400).json({ message: 'Ancien et nouveau mots de passe requis.' });
    }

    try {
        const company = await Company.findById(companyId);
        if (!company) {
            return res.status(404).json({ message: 'Compagnie introuvable.' });
        }

        // 1. Vérification de l'ancien mot de passe
        const isMatch = await bcrypt.compare(oldPassword, company.password);
        if (!isMatch) {
            return res.status(401).json({ message: 'Ancien mot de passe incorrect.' });
        }
        
        // 2. Hachage du nouveau mot de passe
        const newHashedPassword = await bcrypt.hash(newPassword, Number(process.env.BCRYPT_SALT_ROUNDS || 10));
        
        // 3. Mise à jour dans la base de données
        const before = company.toObject();
        company.password = newHashedPassword;
        await company.save();
        
        // 4. Log d'audit (Simulation d'un performedBy pour le log car pas de body)
        const performedBy = { userType: 'company', userName: company.name, userId: companyId };
        await addAudit('update', 'company', companyId, performedBy, 'Changement de mot de passe par l\'utilisateur', { email: before.email }, { email: company.email });

        res.json({ success: true, message: 'Mot de passe mis à jour avec succès.' });

    } catch(err) {
        console.error("Erreur lors du changement de mot de passe:", err);
        res.status(500).json({ message: 'Erreur serveur lors du changement de mot de passe.' });
    }
});


// Login Gérant (MODIFIÉ: Bcrypt + JWT)
app.post('/api/auth/manager/login', async (req, res) => {
// ... (Reste inchangé) ...
  const { boutiqueName, password } = req.body;
  if (!boutiqueName || !password) {
    return res.status(400).json({ message: 'Nom de boutique et mot de passe requis.' });
  }
  
  try {
    const boutique = await Boutique.findOne({ name: boutiqueName });
    if (!boutique) {
      return res.status(401).json({ message: 'Identifiants gérant invalides.' });
    }
    
    // 1. COMPARAISON du mot de passe GÉRANT HACHÉ
    const isMatch = await bcrypt.compare(password, boutique.managerPassword);
    if (!isMatch) {
      return res.status(401).json({ message: 'Identifiants gérant invalides.' });
    }

    const company = await Company.findById(boutique.companyId);
    
    // 2. Génération du Token JWT
    const token = jwt.sign(
        { id: boutique._id, type: 'manager' }, // ID de la boutique pour l'ID utilisateur
        JWT_SECRET, 
        { expiresIn: process.env.JWT_EXPIRES_IN || '24h' }
    );
    
    // 3. Réponse
    res.json({ 
        boutique: { ...boutique.toObject(), id: boutique._id }, 
        company: { ...company.toObject(), id: company._id },
        token 
    });
  } catch (err) {
    res.status(500).json({ message: 'Erreur serveur lors de la connexion gérant.' });
  }
});


// -------------------- Boutiques & Gérants (SÉCURISÉ) --------------------

// Créer une boutique (SÉCURISÉ)
app.post('/api/boutiques', authMiddleware, async (req, res) => {
// ... (Reste inchangé) ...
  // L'ID de la compagnie est récupéré depuis le token, pas le corps de la requête
  const companyId = req.user.id; 
  const { name, managerName, managerPassword, initialBankBalance, logoBase64 } = req.body; 
  
  if (!name || !managerName || !managerPassword) {
    return res.status(400).json({ message: 'Champs requis manquants.' });
  }
  
  try {
    // HACHAGE du mot de passe gérant
    const hashedManagerPassword = await bcrypt.hash(managerPassword, Number(process.env.BCRYPT_SALT_ROUNDS || 10));

    const boutique = await Boutique.create({ 
        companyId, 
        name, 
        managerName, 
        managerPassword: hashedManagerPassword, // Mot de passe GÉRANT HACHÉ
        initialBankBalance: Number(initialBankBalance) || 0,
        logoBase64: logoBase64 || '' 
    });
    res.json(boutique);
  } catch (err) {
    res.status(500).json({ message: 'Erreur lors de la création de la boutique.' });
  }
});

// Lister les boutiques (SÉCURISÉ)
app.get('/api/boutiques/by-company/:companyId', authMiddleware, async (req, res) => {
// ... (Reste inchangé) ...
  // Vérifier si l'utilisateur est bien la compagnie propriétaire
  if (req.user.id !== req.params.companyId || req.user.type !== 'company') {
      return res.status(403).json({ message: 'Accès non autorisé.' });
  }
  const { companyId } = req.params;
  const list = await Boutique.find({ companyId });
  res.json(list);
});

// Obtenir une boutique (SÉCURISÉ)
app.get('/api/boutiques/:id', authMiddleware, async (req, res) => {
// ... (Reste inchangé) ...
  const boutique = await Boutique.findById(req.params.id);
  if (!boutique) return res.status(404).json({ message: 'Boutique introuvable.' });
  
  // Vérifier l'autorisation (company ou gérant de cette boutique)
  if (req.user.id !== boutique.companyId.toString() && req.user.id !== boutique._id.toString()) {
      return res.status(403).json({ message: 'Accès non autorisé.' });
  }
  
  res.json(boutique);
});

// Modifier une boutique / Gérant (SÉCURISÉ)
app.put('/api/boutiques/:id', authMiddleware, async (req, res) => {
// ... (Reste inchangé) ...
  const boutiqueId = req.params.id;
  const { name, managerName, managerPassword, initialBankBalance, logoBase64, reason, performedBy } = req.body; 
  
  try {
    const before = await Boutique.findById(boutiqueId);
    if (!before) return res.status(404).json({ message: 'Boutique introuvable.' });
    
    // Vérification de l'autorisation (seulement la compagnie)
    if (req.user.id !== before.companyId.toString() || req.user.type !== 'company') {
        return res.status(403).json({ message: 'Seule la compagnie peut modifier cette boutique.' });
    }

    let updatedData = { 
        name, 
        managerName, 
        initialBankBalance: initialBankBalance !== undefined ? Number(initialBankBalance) : before.initialBankBalance,
        logoBase64: logoBase64 !== undefined ? logoBase64 : before.logoBase64, 
    };
    
    // Mise à jour du mot de passe Gérant s'il est fourni (et hachage)
    if (managerPassword) {
        updatedData.managerPassword = await bcrypt.hash(managerPassword, Number(process.env.BCRYPT_SALT_ROUNDS || 10));
    }
    
    const after = await Boutique.findByIdAndUpdate(boutiqueId, updatedData, { new: true });

    await addAudit('update', 'boutique', boutiqueId, performedBy, reason, before.toObject(), after.toObject());
    res.json(after);
  } catch (err) {
    res.status(500).json({ message: 'Erreur lors de la modification de la boutique.' });
  }
});

// Supprimer une boutique / Gérant (SÉCURISÉ)
app.delete('/api/boutiques/:id', authMiddleware, async (req, res) => {
// ... (Reste inchangé) ...
  const boutiqueId = req.params.id;
  const { reason, performedBy } = req.body;
  
  try {
    const before = await Boutique.findById(boutiqueId);
    if (!before) return res.status(404).json({ message: 'Boutique introuvable.' });
    
    // Vérification de l'autorisation (seulement la compagnie)
    if (req.user.id !== before.companyId.toString() || req.user.type !== 'company') {
        return res.status(403).json({ message: 'Seule la compagnie peut supprimer cette boutique.' });
    }

    // 1. Supprimer la boutique
    await Boutique.findByIdAndDelete(boutiqueId);

    // 2. Supprimer les données liées (en parallèle)
    await Promise.all([
      CashbookEntry.deleteMany({ boutiqueId }),
      BankEntry.deleteMany({ boutiqueId }),
      Purchase.deleteMany({ boutiqueId }),
      Product.deleteMany({ boutiqueId }),
      Client.deleteMany({ boutiqueId }),
      Sale.deleteMany({ boutiqueId }),
    ]);

    // 3. Ajouter l'audit log
    await addAudit('delete', 'boutique', boutiqueId, performedBy, reason, before.toObject(), null);
    
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ message: 'Erreur lors de la suppression de la boutique.' });
  }
});

// Résumé boutique AVEC FILTRAGE PAR PÉRIODE (SÉCURISÉ)
app.get('/api/boutiques/:id/summary', authMiddleware, async (req, res) => {
// ... (Reste inchangé) ...
  const { from, to } = req.query;
  const boutiqueId = req.params.id;
  
  const boutique = await Boutique.findById(boutiqueId);
  if (!boutique) return res.status(404).json({ message: 'Boutique introuvable.' });
  
  // Vérifier l'autorisation (company ou gérant de cette boutique)
  if (req.user.id !== boutique.companyId.toString() && req.user.id !== boutiqueId) {
      return res.status(403).json({ message: 'Accès non autorisé.' });
  }
  
  try {
    const summary = await computeBoutiqueSummary(boutiqueId, from, to);
    res.json(summary);
  } catch(err) {
    res.status(500).json({ message: err.message || 'Erreur lors du calcul du résumé.' });
  }
});


// -------------------- Brouillard de caisse (SÉCURISÉ) --------------------

// Cashbook
app.get('/api/boutiques/:id/cashbook', authMiddleware, checkBoutiqueAuthorization, async (req, res) => {
// ... (Reste inchangé) ...
  const list = await CashbookEntry.find({ boutiqueId: req.params.id });
  res.json(list);
});

app.post('/api/boutiques/:id/cashbook', authMiddleware, checkBoutiqueAuthorization, async (req, res) => {
// ... (Reste inchangé) ...
  const boutiqueId = req.params.id;
  const { date, pieceNumber, description, type, amount } = req.body;
  if (!date || !description || !type || amount === undefined) {
    return res.status(400).json({ message: 'Date, description, type et montant requis.' });
  }
  try {
    const entry = await CashbookEntry.create({
      boutiqueId,
      date,
      pieceNumber: pieceNumber || '',
      description,
      type: type === 'out' ? 'out' : 'in',
      amount: Number(amount) || 0,
    });
    res.json(entry);
  } catch (err) {
    res.status(500).json({ message: 'Erreur lors de l\'ajout au brouillard.' });
  }
});

// Modification de l'entrée de caisse AVEC motif
app.put('/api/cashbook/:entryId', authMiddleware, checkBoutiqueAuthorization, async (req, res) => {
// ... (Reste inchangé) ...
  const entryId = req.params.entryId;
  const { date, pieceNumber, description, type, amount, reason, performedBy } = req.body;
  
  try {
    const before = await CashbookEntry.findById(entryId);
    if (!before) return res.status(404).json({ message: 'Entrée introuvable.' });

    const updatedData = { date, pieceNumber, description, type, amount: Number(amount) };
    const after = await CashbookEntry.findByIdAndUpdate(entryId, updatedData, { new: true });

    await addAudit('update', 'cashbook', entryId, performedBy, reason, before.toObject(), after.toObject());
    res.json(after);
  } catch (err) {
    res.status(500).json({ message: 'Erreur lors de la modification de l\'entrée de caisse.' });
  }
});

// Suppression de l'entrée de caisse AVEC motif
app.delete('/api/cashbook/:entryId', authMiddleware, checkBoutiqueAuthorization, async (req, res) => {
// ... (Reste inchangé) ...
  const entryId = req.params.entryId;
  const { reason, performedBy } = req.body;

  try {
    const before = await CashbookEntry.findById(entryId);
    if (!before) return res.status(404).json({ message: 'Entrée introuvable.' });
    
    await CashbookEntry.findByIdAndDelete(entryId);

    await addAudit('delete', 'cashbook', entryId, performedBy, reason, before.toObject(), null);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ message: 'Erreur lors de la suppression de l\'entrée de caisse.' });
  }
});

// -------------------- Compte Banque (SÉCURISÉ) --------------------

app.get('/api/boutiques/:id/bank', authMiddleware, checkBoutiqueAuthorization, async (req, res) => {
// ... (Reste inchangé) ...
    const list = await BankEntry.find({ boutiqueId: req.params.id });
    res.json(list);
});

app.post('/api/boutiques/:id/bank', authMiddleware, checkBoutiqueAuthorization, async (req, res) => {
// ... (Reste inchangé) ...
    const boutiqueId = req.params.id;
    const { date, pieceNumber, description, type, amount } = req.body;
    if (!date || !description || !type || amount === undefined) {
        return res.status(400).json({ message: 'Date, description, type et montant requis.' });
    }
    try {
        const entry = await BankEntry.create({
            boutiqueId,
            date,
            pieceNumber: pieceNumber || '',
            description,
            type,
            amount: Number(amount) || 0,
        });
        res.json(entry);
    } catch (err) {
        res.status(500).json({ message: 'Erreur lors de l\'ajout au compte banque.' });
    }
});

// -------------------- Achats (SÉCURISÉ) --------------------

app.get('/api/boutiques/:id/purchases', authMiddleware, checkBoutiqueAuthorization, async (req, res) => {
// ... (Reste inchangé) ...
    const list = await Purchase.find({ boutiqueId: req.params.id });
    res.json(list);
});

app.post('/api/boutiques/:id/purchases', authMiddleware, checkBoutiqueAuthorization, async (req, res) => {
// ... (Reste inchangé) ...
    const boutiqueId = req.params.id;
    const { date, productName, unitPrice, quantity } = req.body;
    
    const numUnitPrice = Number(unitPrice);
    const numQuantity = Number(quantity);

    if (!date || !productName || isNaN(numUnitPrice) || numUnitPrice < 0 || isNaN(numQuantity) || numQuantity <= 0) {
        return res.status(400).json({ message: 'Date, produit, prix unitaire (>=0) et quantité (>0) requis.' });
    }
    
    try {
        const purchase = await Purchase.create({
            boutiqueId,
            date,
            productName: productName.toUpperCase(),
            unitPrice: numUnitPrice,
            quantity: numQuantity,
        });
        res.json(purchase);
    } catch (err) {
        if (err.name === 'ValidationError' && err.errors.productName && err.errors.productName.kind === 'regexp') {
             return res.status(400).json({ message: "Le nom du produit doit contenir uniquement des lettres majuscules et des espaces." });
        }
        res.status(500).json({ message: 'Erreur lors de l\'enregistrement de l\'achat.' });
    }
});


// -------------------- Produits (SÉCURISÉ) --------------------

app.get('/api/boutiques/:id/products', authMiddleware, checkBoutiqueAuthorization, async (req, res) => {
// ... (Reste inchangé) ...
  const list = await Product.find({ boutiqueId: req.params.id });
  res.json(list);
});

app.post('/api/boutiques/:id/products', authMiddleware, checkBoutiqueAuthorization, async (req, res) => {
// ... (Reste inchangé) ...
  const { name, unitPrice, costPrice } = req.body;
  if (!name || unitPrice === undefined) {
    return res.status(400).json({ message: 'Nom et prix unitaire requis.' });
  }
  try {
    const product = await Product.create({
      boutiqueId: req.params.id,
      name,
      unitPrice: Number(unitPrice) || 0,
      costPrice: Number(costPrice) || 0,
    });
    res.json(product);
  } catch (err) {
    res.status(500).json({ message: 'Erreur lors de l\'ajout du produit.' });
  }
});

// Modification de produit AVEC motif
app.put('/api/products/:id', authMiddleware, checkBoutiqueAuthorization, async (req, res) => {
// ... (Reste inchangé) ...
  const productId = req.params.id;
  const { name, unitPrice, costPrice, reason, performedBy } = req.body;
  
  try {
    const before = await Product.findById(productId);
    if (!before) return res.status(404).json({ message: 'Produit introuvable.' });

    const updatedData = { name, unitPrice: Number(unitPrice), costPrice: Number(costPrice) };
    const after = await Product.findByIdAndUpdate(productId, updatedData, { new: true });

    await addAudit('update', 'product', productId, performedBy, reason, before.toObject(), after.toObject());
    res.json(after);
  } catch (err) {
    res.status(500).json({ message: 'Erreur lors de la modification du produit.' });
  }
});

// Suppression de produit AVEC motif
app.delete('/api/products/:id', authMiddleware, checkBoutiqueAuthorization, async (req, res) => {
// ... (Reste inchangé) ...
  const productId = req.params.id;
  const { reason, performedBy } = req.body;
  
  try {
    const before = await Product.findById(productId);
    if (!before) return res.status(404).json({ message: 'Produit introuvable.' });

    await Product.findByIdAndDelete(productId);

    await addAudit('delete', 'product', productId, performedBy, reason, before.toObject(), null);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ message: 'Erreur lors de la suppression du produit.' });
  }
});

// -------------------- Clients (SÉCURISÉ) --------------------

app.get('/api/boutiques/:id/clients', authMiddleware, checkBoutiqueAuthorization, async (req, res) => {
// ... (Reste inchangé) ...
  const list = await Client.find({ boutiqueId: req.params.id });
  res.json(list);
});

app.post('/api/boutiques/:id/clients', authMiddleware, checkBoutiqueAuthorization, async (req, res) => {
// ... (Reste inchangé) ...
  const { name } = req.body;
  if (!name) {
    return res.status(400).json({ message: 'Nom du client requis.' });
  }
  try {
    const client = await Client.create({
      boutiqueId: req.params.id,
      name,
    });
    res.json(client);
  } catch (err) {
    res.status(500).json({ message: 'Erreur lors de l\'ajout du client.' });
  }
});

// Modification de client AVEC motif
app.put('/api/clients/:id', authMiddleware, checkBoutiqueAuthorization, async (req, res) => {
// ... (Reste inchangé) ...
  const clientId = req.params.id;
  const { name, reason, performedBy } = req.body;
  
  try {
    const before = await Client.findById(clientId);
    if (!before) return res.status(404).json({ message: 'Client introuvable.' });

    const updatedData = { name };
    const after = await Client.findByIdAndUpdate(clientId, updatedData, { new: true });

    await addAudit('update', 'client', clientId, performedBy, reason, before.toObject(), after.toObject());
    res.json(after);
  } catch (err) {
    res.status(500).json({ message: 'Erreur lors de la modification du client.' });
  }
});

// Suppression de client AVEC motif
app.delete('/api/clients/:id', authMiddleware, checkBoutiqueAuthorization, async (req, res) => {
// ... (Reste inchangé) ...
  const clientId = req.params.id;
  const { reason, performedBy } = req.body;
  
  try {
    const before = await Client.findById(clientId);
    if (!before) return res.status(404).json({ message: 'Client introuvable.' });

    await Client.findByIdAndDelete(clientId);

    await addAudit('delete', 'client', clientId, performedBy, reason, before.toObject(), null);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ message: 'Erreur lors de la suppression du client.' });
  }
});

// -------------------- Ventes (SÉCURISÉ) --------------------

app.get('/api/boutiques/:id/sales', authMiddleware, checkBoutiqueAuthorization, async (req, res) => {
// ... (Reste inchangé) ...
  const list = await Sale.find({ boutiqueId: req.params.id });
  res.json(list);
});

// MODIFICATION CRITIQUE ICI : CORRECTION VENTE - NOUVELLE LOGIQUE D'INCREMENTATION
app.post('/api/boutiques/:id/sales', authMiddleware, checkBoutiqueAuthorization, async (req, res) => {
// ... (Reste inchangé) ...
  const boutiqueId = req.params.id;
  const {
    date,
    clientId,
    clientName,
    productId,
    productName,
    unitPrice,
    quantity,
    amountPaid,
    tableNumber,
    serverName,
  } = req.body;

  const numUnitPrice = Number(unitPrice);
  const numQuantity = Number(quantity);
  const numAmountPaid = Number(amountPaid);

  // Correction de la validation : s'assurer que les champs sont des nombres et que les valeurs critiques sont > 0
  if (!date || !productName || isNaN(numUnitPrice) || isNaN(numQuantity) || isNaN(numAmountPaid)) {
    return res.status(400).json({ message: 'Date, produit, prix unitaire, quantité et montant payé sont requis et doivent être numériques.' });
  }
  
  if (numUnitPrice <= 0 || numQuantity <= 0) {
    return res.status(400).json({ message: 'Le prix unitaire et la quantité doivent être supérieurs à 0.' });
  }
  
  if (numAmountPaid < 0) {
      return res.status(400).json({ message: 'Le montant payé ne peut pas être négatif.' });
  }

  try {
    // CORRECTION DU COMPTEUR DE FACTURE
   const lastSale = await Sale.findOne({ boutiqueId }).sort({ invoiceNumber: -1 });

   let nextNumber = 1;
   if (lastSale && lastSale.invoiceNumber) {
       // Extraire le numéro de FAC-XXXX, le convertir en entier, et l'incrémenter
       const lastNum = parseInt(lastSale.invoiceNumber.replace('FAC-', ''), 10);
       if (!isNaN(lastNum)) {
           nextNumber = lastNum + 1;
       }
   }
   
   // Générer le nouveau numéro de facture
   const invoiceNumber = 'FAC-' + nextNumber.toString().padStart(4, '0');

    const sale = await Sale.create({
      boutiqueId,
      date,
      clientId: clientId || null,
      clientName: clientName || '',
      productId: productId || null,
      productName,
      unitPrice: numUnitPrice,
      quantity: numQuantity,
      quantityDelivered: 0,
      amountPaid: numAmountPaid,
      tableNumber: tableNumber || '',
      serverName: serverName || '',
      invoiceNumber,
    });
    res.json(sale);
  } catch (err) {
    console.error("Erreur lors de la création de la vente:", err);
    // Renvoie une erreur 500 détaillée pour debug
    res.status(500).json({ message: 'Erreur lors de la création de la vente.' });
  }
});

// Modification de vente AVEC motif
app.put('/api/sales/:id', authMiddleware, checkBoutiqueAuthorization, async (req, res) => {
// ... (Reste inchangé) ...
  const saleId = req.params.id;
  const {
    date,
    clientId,
    clientName,
    productId,
    productName,
    unitPrice,
    quantity,
    quantityDelivered,
    amountPaid,
    tableNumber,
    serverName,
    reason,
    performedBy,
  } = req.body;

  try {
    const before = await Sale.findById(saleId);
    if (!before) return res.status(404).json({ message: 'Vente introuvable.' });

    const updatedData = {
      date,
      clientId,
      clientName,
      productId,
      productName,
      unitPrice: Number(unitPrice),
      quantity: Number(quantity),
      quantityDelivered: Number(quantityDelivered),
      amountPaid: Number(amountPaid),
      tableNumber,
      serverName,
    };
    
    // Utiliser $set pour ne mettre à jour que les champs existants dans updatedData et non null
    const after = await Sale.findByIdAndUpdate(saleId, { $set: updatedData }, { new: true });

    await addAudit('update', 'sale', saleId, performedBy, reason, before.toObject(), after.toObject());
    res.json(after);
  } catch (err) {
    res.status(500).json({ message: 'Erreur lors de la modification de la vente.' });
  }
});

// Suppression de vente AVEC motif
app.delete('/api/sales/:id', authMiddleware, checkBoutiqueAuthorization, async (req, res) => {
// ... (Reste inchangé) ...
  const saleId = req.params.id;
  const { reason, performedBy } = req.body;
  
  try {
    const before = await Sale.findById(saleId);
    if (!before) return res.status(404).json({ message: 'Vente introuvable.' });

    await Sale.findByIdAndDelete(saleId);

    await addAudit('delete', 'sale', saleId, performedBy, reason, before.toObject(), null);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ message: 'Erreur lors de la suppression de la vente.' });
  }
});

// Route pour obtenir une facture par son numéro (pour le QR code) - NON SÉCURISÉ (accès public par QR Code)
app.get('/api/sales/invoice/:invoiceNumber', async (req, res) => {
// ... (Reste inchangé) ...
    const { invoiceNumber } = req.params;
    try {
        const sale = await Sale.findOne({ invoiceNumber });
        if (!sale) {
            return res.status(404).json({ message: 'Facture non trouvée.' });
        }
        // Récupérer les données de la boutique pour le logo
        const boutique = await Boutique.findById(sale.boutiqueId);
        if (!boutique) {
             return res.status(404).json({ message: 'Boutique associée non trouvée.' });
        }
        // Récupérer les données de la compagnie pour le téléphone
        const company = await Company.findById(boutique.companyId);

        res.json({
            sale: sale,
            boutique: boutique,
            companyPhone: company?.companyPhone || '', // Récupère le/les numéros
        });
    } catch (err) {
        res.status(500).json({ message: 'Erreur lors de la récupération de la facture.' });
    }
});


// -------------------- Analyse (SÉCURISÉ) --------------------

// Top N Ventes / Achats
app.get('/api/boutiques/:id/analysis/top-products', authMiddleware, checkBoutiqueAuthorization, async (req, res) => {
// ... (Reste inchangé) ...
  const boutiqueId = req.params.id;
  const { from, to, type, limit = 10 } = req.query; // type: 'sales' ou 'purchases'

  let model = type === 'sales' ? Sale : Purchase;
  
  // S'assurer que l'ObjectId est correctement casté pour la recherche d'agrégation
  let query = { boutiqueId: new mongoose.Types.ObjectId(boutiqueId) }; 
  
  query = filterByPeriod(query, from, to);
  
  try {
      const aggregation = await model.aggregate([
          { $match: query },
          {
              $group: {
                  _id: type === 'sales' ? "$productName" : "$productName", // Nom du produit pour les deux
                  totalQuantity: { $sum: "$quantity" },
                  // Si c'est une vente, c'est le CA, si c'est un achat, c'est le coût total
                  totalRevenue: { $sum: { $multiply: ["$unitPrice", "$quantity"] } }
              }
          },
          { $sort: { totalQuantity: -1 } },
          { $limit: Number(limit) }
      ]);
      
      res.json(aggregation);

  } catch (err) {
      res.status(500).json({ message: err.message || 'Erreur lors de l\'analyse des produits.' });
  }
});

// -------------------- Audit & Exports CSV (SÉCURISÉ) --------------------

// MODIFICATION CRITIQUE ICI : CORRECTION AUDIT LOG
app.get('/api/audit', authMiddleware, async (req, res) => {
// ... (Reste inchangé) ...
  const { boutiqueId } = req.query;
  let query = {};
  
  try {
      if (boutiqueId && mongoose.Types.ObjectId.isValid(boutiqueId)) {
          // Vérification de l'autorisation d'accéder aux logs de cette boutique
          const boutique = await Boutique.findById(boutiqueId);
          if (!boutique || (req.user.id !== boutique.companyId.toString() && req.user.id !== boutiqueId)) {
              return res.status(403).json({ message: 'Accès non autorisé aux logs d\'audit de cette boutique.' });
          }

          // Filtrage intelligent: on trouve tous les IDs d'entités liés à cette boutique
          const relatedProductIds = (await Product.find({ boutiqueId }).select('_id')).map(p => p._id);
          const relatedClientIds = (await Client.find({ boutiqueId }).select('_id')).map(c => c._id);
          const relatedSaleIds = (await Sale.find({ boutiqueId }).select('_id')).map(s => s._id);
          const relatedCashbookIds = (await CashbookEntry.find({ boutiqueId }).select('_id')).map(c => c._id);
          const relatedBankIds = (await BankEntry.find({ boutiqueId }).select('_id')).map(b => b._id);
          const relatedPurchaseIds = (await Purchase.find({ boutiqueId }).select('_id')).map(p => p._id);

          const allRelatedIds = [
              new mongoose.Types.ObjectId(boutiqueId), // Log sur la boutique elle-même
              ...relatedProductIds,
              ...relatedClientIds,
              ...relatedSaleIds,
              ...relatedCashbookIds,
              ...relatedBankIds,
              ...relatedPurchaseIds,
          ];
          
          // On filtre par ID d'entité, c'est le plus précis
          query.entityId = { $in: allRelatedIds };

      } else if (boutiqueId && !mongoose.Types.ObjectId.isValid(boutiqueId)) {
          // Si un ID est fourni mais invalide, on ne renvoie rien.
          query = { _id: null };
      }

      const logs = await AuditLog.find(query).sort({ timestamp: -1 });
      res.json(logs);
      
  } catch(err) {
      console.error('Erreur lors de la récupération des logs d\'audit:', err);
      // Renvoyer du JSON en cas d'erreur interne pour que le frontend ne crash pas
      res.status(500).json({ message: 'Erreur lors de la récupération des logs d\'audit.' });
  }
});


// Route générique pour l'export CSV
app.get('/api/boutiques/:id/export/:type', authMiddleware, checkBoutiqueAuthorization, async (req, res) => {
// ... (Reste inchangé) ...
    const { id, type } = req.params;
    const { from, to } = req.query;

    let Model;
    let filename;

    switch (type) {
        case 'cashbook':
            Model = CashbookEntry;
            filename = 'brouillard_caisse';
            break;
        case 'bank':
            Model = BankEntry;
            filename = 'compte_banque';
            break;
        case 'purchases':
            Model = Purchase;
            filename = 'achats';
            break;
        case 'sales':
            Model = Sale;
            filename = 'ventes';
            break;
        case 'audit':
            Model = AuditLog;
            filename = 'audit_log';
            // Le filtre par période sur l'audit doit être fait sur le timestamp
            // Le filtre par boutique sur l'audit n'est pas trivial car l'entityId n'est pas toujours la boutiqueId
            break;
        default:
            return res.status(400).json({ message: 'Type d\'exportation non valide.' });
    }

    try {
        let query = {};
        
        // La plupart des collections sont filtrées par boutiqueId
        if (type !== 'audit') {
            query.boutiqueId = new mongoose.Types.ObjectId(id);
        }
        
        // Filtrage par période sur le champ 'date' (sauf pour audit qui utilise 'timestamp')
        if (from || to) {
            if (type === 'audit') {
                const dateQuery = {};
                if (from) dateQuery.$gte = new Date(from);
                if (to) dateQuery.$lte = new Date(to);
                if (Object.keys(dateQuery).length > 0) {
                    query.timestamp = dateQuery;
                }
            } else {
                query = filterByPeriod(query, from, to);
            }
        }

        // Cas spécial Audit pour le filtre par boutique
        if (type === 'audit' && mongoose.Types.ObjectId.isValid(id)) {
            // Pour l'export audit, on doit filtrer sur toutes les entités de cette boutique.
            const relatedProductIds = (await Product.find({ boutiqueId: id }).select('_id')).map(p => p._id);
            const relatedClientIds = (await Client.find({ boutiqueId: id }).select('_id')).map(c => c._id);
            const relatedSaleIds = (await Sale.find({ boutiqueId: id }).select('_id')).map(s => s._id);
            const relatedCashbookIds = (await CashbookEntry.find({ boutiqueId: id }).select('_id')).map(c => c._id);
            const relatedBankIds = (await BankEntry.find({ boutiqueId: id }).select('_id')).map(b => b._id);
            const relatedPurchaseIds = (await Purchase.find({ boutiqueId: id }).select('_id')).map(p => p._id);
            
            const allRelatedIds = [
                new mongoose.Types.ObjectId(id), 
                ...relatedProductIds,
                ...relatedClientIds,
                ...relatedSaleIds,
                ...relatedCashbookIds,
                ...relatedBankIds,
                ...relatedPurchaseIds,
            ];
            
            // Si la query a déjà des filtres (date), on ajoute $and, sinon on remplace
            if (query.timestamp) {
                query = { 
                    $and: [
                        { timestamp: query.timestamp },
                        { entityId: { $in: allRelatedIds } }
                    ]
                };
            } else {
                query.entityId = { $in: allRelatedIds };
            }
        }
        
        const data = await Model.find(query).lean().sort(type === 'audit' ? { timestamp: -1 } : { date: 1 });

        // Les logs d'audit ont besoin d'être "aplatis" (flattened)
        let processedData = data;
        if (type === 'audit') {
            processedData = data.map(log => ({
                id: log._id,
                timestamp: log.timestamp.toISOString(),
                action: log.action,
                entityType: log.entityType,
                entityId: log.entityId,
                performedBy_userType: log.performedBy?.userType || '',
                performedBy_userName: log.performedBy?.userName || '',
                reason: log.reason || '',
                // Simplification: le before/after est trop complexe pour un CSV simple
            }));
        }
        
        // CORRECTION DE L'EXPORT CSV : Fournir les champs si processedData est vide
        let fields = [];
        if (processedData.length > 0) {
            // Utiliser les clés du premier objet si des données existent
            fields = Object.keys(processedData[0]);
        } else {
            // Fournir une liste de champs par défaut pour que json2csv ne crash pas si processedData est []
            if (type === 'cashbook') fields = ['date', 'pieceNumber', 'description', 'type', 'amount', 'boutiqueId'];
            else if (type === 'bank') fields = ['date', 'pieceNumber', 'description', 'type', 'amount', 'boutiqueId'];
            else if (type === 'purchases') fields = ['date', 'productName', 'unitPrice', 'quantity', 'boutiqueId'];
            else if (type === 'sales') fields = ['date', 'clientName', 'productName', 'unitPrice', 'quantity', 'amountPaid', 'invoiceNumber', 'boutiqueId'];
            else if (type === 'audit') fields = ['timestamp', 'action', 'entityType', 'reason', 'performedBy_userName'];
            else if (type === 'products') fields = ['name', 'unitPrice', 'costPrice', 'boutiqueId'];
            else if (type === 'clients') fields = ['name', 'boutiqueId'];
        }

        // Convertir les données en CSV
        const csv = json2csv(processedData, { fields }); // Passer les champs explicitement

        res.header('Content-Type', 'text/csv');
        res.attachment(`${filename}_${new Date().toISOString().slice(0, 10)}.csv`);
        res.send(csv);

    } catch (err) {
        console.error("Erreur d'exportation:", err);
        res.status(500).json({ message: "Erreur lors de la génération du CSV: " + err.message });
    }
});


// -------------------- Lancement serveur --------------------

const PORT = process.env.PORT || 4000;
app.listen(PORT, () => {
  console.log('API démarrée sur http://localhost:' + PORT);
});