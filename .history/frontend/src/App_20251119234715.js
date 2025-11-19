// App.jsx - Version Finale, Corrigée et Fonctionnelle (Final)

// NÉCESSITE: npm install chart.js react-chartjs-2

import React, { useEffect, useState, useMemo } from 'react';
import 'bootstrap/dist/css/bootstrap.min.css';
import 'bootstrap-icons/font/bootstrap-icons.css';
import { Chart as ChartJS, CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend, ArcElement, LineElement, PointElement } from 'chart.js';
import { Bar, Line } from 'react-chartjs-2';
import './App.css'; 

// Enregistrer les composants Chart.js nécessaires
ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  LineElement,
  PointElement,
  Title,
  Tooltip,
  Legend,
  ArcElement
);


// ----------------------------------------------------
// VARIABLES & STYLES GLOBALES
// ----------------------------------------------------

const API_URL = '/api';
const SIDEBAR_WIDTH = '280px'; 

// SIMULATION DU LOGO ALL MANAGE (remplacez par votre Base64 réel)
const ALL_MANAGE_LOGO_BASE64 = 'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIxMDAiIGhlaWdodD0iMTAwIiB2aWV3Qm94PSIwIDAgMTIwIDEyMCI+CiAgPHJlY3Qgd2lkdGg9IjEyMCIgaGVpZ2h0PSIxMjAiIGZpbGw9IiNmZmYiLz4KICA8Y2lyY2xlIGN4PSI2MCIgY3k9IjYwIiByPSI1MCIgZmlsbD0iIzAwNTZiMyIvPgogIDxwYXRoIGQ9Ik03MiA0M2gzMHYxMiIvPgogIDx0ZXh0IHg9IjYwIiB5PSI3MCIgZm9udC1mYW1pbHk9ImFyaWFsIiBmb250LXNpemU9IjI0IiB0ZXh0LWFuY2hvcj0ibWlkZGxlIiBmaWxsPSIjZmZmIj5BTTwvdGV4dD4KICA8dGV4dCB4PSI2MCIgeT0iOTAiIGZvbnQtZmFtaWx5PSJhcmlhbCIgZm9udC1zaXplPSIxMiIgdGV4dC1hbmNob3I9Im1pZGRsZSIgZmlsbD0iI2ZmZiI+TWFuYWdlPC90ZXh0Pgo8L3N2Zz4=';


// Composant pour les Modales de modification (Utilise les variables de thème)
function ModificationModal({ show, handleClose, title, children }) {
    if (!show) return null;
    return (
        <div
            className="modal d-block"
            tabIndex="-1"
            style={{ backgroundColor: 'rgba(0,0,0,0.7)', zIndex: 2000 }} 
        >
            <div className="modal-dialog modal-dialog-centered modal-lg">
                <div className="modal-content shadow-lg border-0" style={{backgroundColor: 'var(--bg-card)'}}>
                    <div className="modal-header text-white" style={{backgroundColor: 'var(--theme-color)'}}>
                        <h5 className="modal-title">{title}</h5>
                        <button
                            type="button"
                            className="btn-close btn-close-white"
                            onClick={handleClose}
                        ></button>
                    </div>
                    <div className="modal-body">{children}</div>
                </div>
            </div>
        </div>
    );
}

// NOUVEAU COMPOSANT: Modale pour télécharger les identifiants (CORRIGÉ)
function AuthDownloadModal({ show, handleClose, title, credentials, onDownload }) {
    if (!show) return null;

    // Affiche le mot de passe s'il est fourni (uniquement après création)
    const displayedPassword = credentials.password || "MOT DE PASSE NON DISPONIBLE (SÉCURITÉ)"; 

    const credentialsText = `
        Accès ${credentials.type === 'company' ? 'Entreprise' : 'Gérant'}
        ------------------------------------------
        Nom/Email: ${credentials.name}
        Mot de passe: ${displayedPassword}
        ${credentials.boutiqueName ? `Boutique: ${credentials.boutiqueName}` : ''}
        URL de connexion: http://localhost:3000
        
        ⚠️ AVERTISSEMENT : Le mot de passe en clair n'est affiché qu'une seule fois pour des raisons de sécurité.
    `;

    return (
        <div className="modal d-block" tabIndex="-1" style={{ backgroundColor: 'rgba(0,0,0,0.7)', zIndex: 3000 }}>
            <div className="modal-dialog modal-dialog-centered">
                <div className="modal-content shadow-lg border-0" style={{backgroundColor: 'var(--bg-card)'}}>
                    <div className="modal-header text-white" style={{backgroundColor: 'var(--theme-color)'}}>
                        <h5 className="modal-title">{title}</h5>
                        <button type="button" className="btn-close btn-close-white" onClick={handleClose}></button>
                    </div>
                    <div className="modal-body text-center">
                        <p className="lead text-danger">
                            ⚠️ **IMPORTANT :** Téléchargez ou notez ces informations **MAINTENANT**. Elles ne seront **plus affichées** par la suite.
                        </p>
                        <textarea className="form-control mb-3 small" rows="7" readOnly value={credentialsText}></textarea>
                        <button className="btn btn-primary w-100 mb-2" onClick={() => onDownload('pdf', credentialsText)}>
                            <i className="bi bi-file-pdf me-2"></i> Télécharger en PDF
                        </button>
                        <button className="btn btn-outline-secondary w-100" onClick={() => onDownload('txt', credentialsText)}>
                            <i className="bi bi-file-earmark-text me-2"></i> Télécharger en TXT
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}

// NOUVEAU COMPOSANT: Modale pour changer le mot de passe de la Compagnie
function PasswordChangeModal({ show, handleClose, handleChangePassword }) {
    const [oldPassword, setOldPassword] = useState('');
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [error, setError] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        setIsSubmitting(true);
        
        if (newPassword.length < 6) {
            setError('Le nouveau mot de passe doit contenir au moins 6 caractères.');
            setIsSubmitting(false);
            return;
        }
        if (newPassword !== confirmPassword) {
            setError('Le nouveau mot de passe et la confirmation ne correspondent pas.');
            setIsSubmitting(false);
            return;
        }
        
        try {
            await handleChangePassword(oldPassword, newPassword);
            handleClose(); // Fermer après succès
        } catch (e) {
             setError(e.message || "Une erreur inconnue est survenue.");
        } finally {
            setIsSubmitting(false);
        }
    };

    if (!show) return null;

    return (
        <ModificationModal
            show={show}
            handleClose={() => {
                setOldPassword('');
                setNewPassword('');
                setConfirmPassword('');
                setError('');
                handleClose();
            }}
            title="🔒 Changer le mot de passe Entreprise"
        >
            <form onSubmit={handleSubmit}>
                <div className="mb-3">
                    <label className="form-label">Ancien mot de passe</label>
                    <input
                        type="password"
                        className="form-control"
                        required
                        value={oldPassword}
                        onChange={(e) => setOldPassword(e.target.value)}
                        disabled={isSubmitting}
                    />
                </div>
                <div className="mb-3">
                    <label className="form-label">Nouveau mot de passe</label>
                    <input
                        type="password"
                        className="form-control"
                        required
                        value={newPassword}
                        onChange={(e) => setNewPassword(e.target.value)}
                        disabled={isSubmitting}
                    />
                </div>
                <div className="mb-3">
                    <label className="form-label">Confirmer le nouveau mot de passe</label>
                    <input
                        type="password"
                        className="form-control"
                        required
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        disabled={isSubmitting}
                    />
                </div>
                {error && <div className="alert alert-danger small">{error}</div>}
                <button type="submit" className="btn btn-warning w-100" disabled={isSubmitting}>
                    <i className={`bi bi-key-fill me-1 ${isSubmitting ? 'spinner-border spinner-border-sm' : ''}`}></i> 
                    {isSubmitting ? 'Mise à jour...' : 'Mettre à jour le mot de passe'}
                </button>
            </form>
        </ModificationModal>
    );
}

// Composant Chart pour réutilisation (Reste inchangé)
function ProductChart({ title, data, type, chartType, setChartType }) {
    // ... (Reste inchangé) ...
    const chartData = useMemo(() => {
        const labels = data.map(d => d._id);
        const quantities = data.map(d => d.totalQuantity);
        
        // Définir les couleurs dynamiquement en fonction du type
        const isSales = type === 'sales';
        // Les couleurs des thèmes sont maintenant dans les variables CSS
        const borderColor = isSales ? 'var(--theme-success)' : 'var(--theme-danger)';
        const backgroundColor = isSales ? 'rgba(40, 167, 69, 0.6)' : 'rgba(220, 53, 69, 0.6)';
        
        return {
          labels: labels,
          datasets: [{
            label: isSales ? 'Qté Vendue' : 'Qté Achetée',
            data: quantities,
            backgroundColor: backgroundColor, 
            borderColor: borderColor,
            borderWidth: 1,
            tension: chartType === 'line' ? 0.4 : 0,
            fill: chartType === 'line' ? 'start' : false,
          }]
        };
      }, [data, type, chartType]);
    
      const options = {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { display: false },
          title: {
            display: true,
            text: title,
            font: { size: 16, weight: 'bold' },
            color: 'var(--text-main)', // Utilise la couleur du texte dynamique
          }
        },
        scales: {
          y: {
            beginAtZero: true,
            title: {
                display: true,
                text: 'Quantité',
                color: 'var(--text-secondary)',
            },
            grid: {
                color: 'var(--border-light)',
            }
          },
          x: {
            grid: {
                color: 'var(--border-light)',
            }
          }
        }
      };
    
      const ChartComponent = chartType === 'line' ? Line : Bar;
    
      return (
        <div className="mb-4">
          <div className="d-flex justify-content-end mb-2">
            <button 
                className={`btn btn-sm me-2 ${chartType === 'bar' ? 'btn-primary' : 'btn-outline-secondary'}`}
                onClick={() => setChartType('bar')}
            >
                <i className="bi bi-bar-chart-fill me-1"></i> Barres
            </button>
            <button 
                className={`btn btn-sm ${chartType === 'line' ? 'btn-primary' : 'btn-outline-secondary'}`}
                onClick={() => setChartType('line')}
            >
                <i className="bi bi-graph-up me-1"></i> Ligne
            </button>
          </div>
          <div style={{ height: '300px' }}>
            {data && data.length > 0 ? (
              <ChartComponent data={chartData} options={options} />
            ) : (
              <div className="text-center p-5 text-muted small">Aucune donnée pour générer le graphique.</div>
            )}
          </div>
        </div>
      );
}

// Composant Sidebar (MIS À JOUR pour le design et la responsivité - Ajout Thème Gérant)
function Sidebar({ mode, setMode, currentTab, setCurrentTab, setCompany, setManager, setBoutique, userName, boutiqueName, isSidebarOpen, toggleSidebar, setAuthToken }) {
    const isCompany = mode === 'companyDashboard';

    const handleLogout = () => {
        // Supprimer tous les états et le token
        setCompany(null);
        setManager(null);
        setBoutique(null);
        setAuthToken(null);
        setMode('home');
        // Optionnel : nettoyer les clés de thème spécifiques au rôle s'ils existent
        // localStorage.removeItem('appTheme');
        // localStorage.removeItem('appDarkMode');
        // localStorage.removeItem('managerTheme');
        // localStorage.removeItem('managerDarkMode');
    };

    const tabs = isCompany ? [
        { id: 'dashboard', name: 'Dashboard', icon: 'speedometer2' },
        { id: 'management', name: 'Gestion Boutiques', icon: 'shop' },
        { id: 'theme-settings', name: 'Thèmes & Sécurité', icon: 'palette-fill' }, // NOUVEL ONGLET
    ] : [
        { id: 'dashboard', name: 'Dashboard', icon: 'speedometer2' },
        { id: 'sales', name: 'Ventes', icon: 'cart-fill' },
        { id: 'cashbook', name: 'Caisse', icon: 'journal-text' },
        { id: 'bank-purchase', name: 'Banque & Achats', icon: 'bank' },
        { id: 'products', name: 'Produits & Clients', icon: 'list-check' },
        { id: 'audit', name: 'Audit', icon: 'clock-history' },
        { id: 'theme-settings', name: 'Mon Thème', icon: 'palette' }, // NOUVEL ONGLET POUR GÉRANT
    ];

    return (
        <nav 
             id="sidebar" 
             // Utilisation des nouvelles classes CSS pour gérer l'affichage/masquage
             className={`col-md-3 col-lg-2 d-md-block sidebar ${isSidebarOpen ? 'show' : ''}`} 
             style={{width: SIDEBAR_WIDTH}} 
        >
            <div className="position-sticky pt-3">
                <div className="sidebar-header">
                    <img src={ALL_MANAGE_LOGO_BASE64} alt="Logo" style={{maxHeight: '40px'}} className="mb-2"/>
                    <h5 className="mb-0 fw-bold">{isCompany ? 'Espace Entreprise' : 'Espace Gérant'}</h5>
                    {/* La couleur des textes est gérée par --text-main/--text-secondary */}
                    <small className="text-info" style={{color: 'var(--theme-color)'}}>{userName}</small> 
                    {boutiqueName && <small className="d-block text-warning">{boutiqueName}</small>}
                </div>
                
                <ul className="nav flex-column px-2 my-4">
                    {tabs.map((tab) => (
                        <li className="nav-item" key={tab.id}>
                            <a 
                                className={`nav-link ${currentTab === tab.id ? 'active' : ''} rounded my-1`} 
                                aria-current="page"
                                href="#"
                                onClick={() => {
                                    setCurrentTab(tab.id);
                                    // Fermer la sidebar après un clic sur mobile (le CSS gère l'animation)
                                    if (window.innerWidth < 768 && isSidebarOpen) toggleSidebar(); 
                                }}
                            >
                                <i className={`bi bi-${tab.icon} me-3`}></i>
                                <span className="d-inline-block">{tab.name}</span>
                            </a>
                        </li>
                    ))}
                </ul>
            </div>
            {/* Footer non sticky si on fait défiler le contenu, le conteneur `position-sticky` gère ça*/}
            <div className="sidebar-footer mt-5">
                <button 
                    className="btn btn-outline-danger w-100 fw-bold"
                    onClick={handleLogout}
                >
                    <i className="bi bi-box-arrow-left me-2"></i>Déconnexion
                </button>
            </div>
        </nav>
    );
}


// ----------------------------------------------------
// COMPOSANT PRINCIPAL (APP)
// ----------------------------------------------------

function App() {
  const [mode, setMode] = useState('home');
  const [authToken, setAuthToken] = useState(null); 
  const [company, setCompany] = useState(null);
  const [companyTab, setCompanyTab] = useState('login');
  const [boutiques, setBoutiques] = useState([]);

  // États Gérant/Boutique
  const [manager, setManager] = useState(null);
  const [boutique, setBoutique] = useState(null);

  // État de navigation (Sidebar)
  const [currentManagerTab, setCurrentManagerTab] = useState('dashboard');
  const [currentCompanyTab, setCurrentCompanyTab] = useState('dashboard');
  const [isSidebarOpen, setIsSidebarOpen] = useState(window.innerWidth >= 768); 
  
  // NOUVEAU: États pour la gestion des thèmes (clé conditionnelle pour le gérant)
  const [theme, setTheme] = useState('blue'); 
  const [isDarkMode, setIsDarkMode] = useState(false);
  
  // NOUVEAU: États pour les Modales d'Identifiants et Mots de Passe
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [authCredentials, setAuthCredentials] = useState(null);
  const [showPasswordModal, setShowPasswordModal] = useState(false);


  // --- Hooks d'Effet ---
  
  // Hook pour charger et appliquer le thème en fonction du rôle
  useEffect(() => {
    // Déterminer la bonne clé de stockage
    const currentThemeKey = manager ? 'managerTheme' : 'appTheme';
    const currentDarkModeKey = manager ? 'managerDarkMode' : 'appDarkMode';
    
    // Charger le thème stocké
    const storedTheme = localStorage.getItem(currentThemeKey) || 'blue';
    const storedDarkMode = localStorage.getItem(currentDarkModeKey) === 'true';

    // Mettre à jour l'état local (qui déclenchera le hook de persistance)
    setTheme(storedTheme);
    setIsDarkMode(storedDarkMode);

    // Appliquer les classes immédiatement pour éviter le flash
    document.documentElement.className = ''; 
    document.documentElement.classList.add(`theme-${storedTheme}`);
    if (storedDarkMode) {
        document.documentElement.classList.add('dark-mode');
    }
  }, [manager]); // Exécuté au changement de rôle (login/logout)
  
  // Hook pour persister le thème DANS le local storage et appliquer les classes
  useEffect(() => {
    const currentThemeKey = manager ? 'managerTheme' : 'appTheme';
    const currentDarkModeKey = manager ? 'managerDarkMode' : 'appDarkMode';
    
    localStorage.setItem(currentThemeKey, theme);
    localStorage.setItem(currentDarkModeKey, isDarkMode);

    document.documentElement.className = ''; 
    document.documentElement.classList.add(`theme-${theme}`);
    if (isDarkMode) {
        document.documentElement.classList.add('dark-mode');
    }

  }, [theme, isDarkMode, manager]);
  
  // Gère la responsivité de la sidebar (Reste inchangé)
  useEffect(() => {
    const handleResize = () => {
        const isDesktop = window.innerWidth >= 768;
        if (!isDesktop) {
             // Fermeture automatique de la sidebar si on passe en mode mobile
             setIsSidebarOpen(false); 
        }
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [manager, company]);

  const toggleSidebar = () => setIsSidebarOpen(!isSidebarOpen);

  // --- Autres États (Reste inchangé) ---
  const [selectedBoutiqueId, setSelectedBoutiqueId] = useState('');
  const [selectedBoutiqueSummary, setSelectedBoutiqueSummary] = useState(null);
  const [modifyingBoutique, setModifyingBoutique] = useState(null); 

  const [cashbook, setCashbook] = useState([]);
  const [bankEntries, setBankEntries] = useState([]);
  const [purchases, setPurchases] = useState([]);
  const [products, setProducts] = useState([]);
  const [clients, setClients] = useState([]);
  const [sales, setSales] = useState([]);
  const [summary, setSummary] = useState(null);
  const [auditLogs, setAuditLogs] = useState([]);
  const [invoiceSale, setInvoiceSale] = useState(null);
  
  // États pour les périodes d'analyse/export
  const [summaryFrom, setSummaryFrom] = useState('');
  const [summaryTo, setSummaryTo] = useState('');
  const [exportFrom, setExportFrom] = useState('');
  const [exportTo, setExportTo] = useState('');

  // États pour l'analyse des produits
  const [analysisType, setAnalysisType] = useState('month'); 
  const [topSalesProducts, setTopSalesProducts] = useState([]);
  const [topPurchaseProducts, setTopPurchaseProducts] = useState([]); 
  const [salesChartType, setSalesChartType] = useState('bar');
  const [purchaseChartType, setPurchaseChartType] = useState('bar');

  // État de chargement
  const [isLoadingManagerData, setIsLoadingManagerData] = useState(false);
  const [isLoadingCompanyData, setIsLoadingCompanyData] = useState(false);
  const [isLoadingAuditLogs, setIsLoadingAuditLogs] = useState(false); 

  // Modales Gérant
  const [modifyingCbEntry, setModifyingCbEntry] = useState(null);
  const [modifyingProduct, setModifyingProduct] = useState(null);
  const [modifyingClient, setModifyingClient] = useState(null);
  const [modifyingSale, setModifyingSale] = useState(null);

  // Formulaires Gérant (ajout)
  const [cbDate, setCbDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [cbPiece, setCbPiece] = useState('');
  const [cbDesc, setCbDesc] = useState('');
  const [cbType, setCbType] = useState('in');
  const [cbAmount, setCbAmount] = useState('');

  // Formulaires Banque
  const [bankDate, setBankDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [bankPiece, setBankPiece] = useState('');
  const [bankDesc, setBankDesc] = useState('');
  const [bankType, setBankType] = useState('credit'); // credit=entrée, debit=sortie
  const [bankAmount, setBankAmount] = useState('');

  // Formulaires Achat
  const [purchaseDate, setPurchaseDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [purchaseProductName, setPurchaseProductName] = useState('');
  const [purchaseUnitPrice, setPurchaseUnitPrice] = useState('');
  const [purchaseQuantity, setPurchaseQuantity] = useState('');

  const [newProductName, setNewProductName] = useState('');
  const [newProductUnitPrice, setNewProductUnitPrice] = useState('');
  const [newProductCostPrice, setNewProductCostPrice] = useState('');

  const [newClientName, setNewClientName] = useState('');

  const [saleDate, setSaleDate] = useState(() =>
    new Date().toISOString().slice(0, 10)
  );
  const [saleClientId, setSaleClientId] = useState('');
  const [saleClientName, setSaleClientName] = useState('');
  const [saleProductId, setSaleProductId] = useState('');
  const [saleProductName, setSaleProductName] = useState('');
  const [saleUnitPrice, setSaleUnitPrice] = useState('');
  const [saleQuantity, setSaleQuantity] = useState('1');
  const [saleAmountPaid, setSaleAmountPaid] = useState('');
  const [saleTableNumber, setSaleTableNumber] = useState('');
  const [saleServerName, setSaleServerName] = useState('');
  
  const [logoBase64, setLogoBase64] = useState('');

// -------------------- Helpers Logo / Fetch / Auth --------------------

  function handleLogoFileUpload(e) {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (upload) => {
        setLogoBase64(upload.target.result); 
      };
      reader.readAsDataURL(file);
    } else {
      setLogoBase64('');
    }
  }

  // NOUVEAU: Téléchargement des identifiants (TXT ou PDF)
  function downloadCredentials(type, content) {
    const filename = `Identifiants_AllManage_${new Date().toISOString().slice(0, 10)}`;

    if (type === 'txt') {
        const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `${filename}.txt`;
        link.click();
        URL.revokeObjectURL(url);
    } else if (type === 'pdf') {
        // Simple PDF generation using a very basic approach for TXT content
        const win = window.open('about:blank', '_blank');
        win.document.write(`
            <html>
                <head><title>${filename}</title></head>
                <body>
                    <pre style="font-family: monospace; font-size: 10pt; white-space: pre-wrap;">${content}</pre>
                    <script>
                        // Attendre un peu pour s'assurer que le contenu est là avant d'imprimer
                        setTimeout(function() {
                            window.print();
                            window.onafterprint = function() {
                                window.close();
                            };
                        }, 200);
                    </script>
                </body>
            </html>
        `);
    }
    setShowAuthModal(false); // Fermer la modale après le téléchargement
    setAuthCredentials(null);
  }

  // MODIFICATION CRITIQUE : apiFetch envoie maintenant le token d'autorisation
  async function apiFetch(path, options = {}) {
    // Cloner l'objet headers pour ne pas modifier l'objet original si options.headers existe
    const headers = options.headers ? { ...options.headers } : { 'Content-Type': 'application/json' };
    
    // Si un token existe, l'ajouter au header d'autorisation
    if (authToken) {
      headers['Authorization'] = `Bearer ${authToken}`;
    }

    const res = await fetch(`${API_URL}${path}`, {
      headers: headers,
      ...options,
    });
    
    // Gestion de la déconnexion si le token est invalide/expiré
    if (res.status === 401 && authToken) {
        alert("Session expirée ou invalide. Veuillez vous reconnecter.");
        setCompany(null);
        setManager(null);
        setBoutique(null);
        setAuthToken(null);
        setMode('home');
        throw new Error('Token invalide ou expiré.');
    }
    
    if (!res.ok) {
      const text = await res.text();
      let msg = 'Erreur API';
      try {
        const json = JSON.parse(text);
        msg = json.message || msg;
      } catch {
        msg = text || msg;
      }
      throw new Error(msg);
    }
    return res.json();
  }

  const getPerformedBy = () => ({
    userType: manager ? 'manager' : 'company',
    userName: manager?.name || company?.name || 'System',
    userId: boutique?.id || company?.id || 'System', // Utiliser l'ID de la boutique/compagnie
  });

  // -------------------- Auth Fonctions (Mis à jour pour JWT + Modales) --------------------

  async function handleCompanyRegister(e) {
    e.preventDefault();
    const form = e.target;
    const name = form.name.value;
    const email = form.email.value;
    const password = form.password.value;
    const companyPhone = form.companyPhone.value;
    const confirmPassword = form.confirmPassword.value;
    if (password !== confirmPassword) {
      alert('Erreur: Les mots de passe ne correspondent pas.');
      return;
    }
    try {
      const res = await fetch(`${API_URL}/auth/company/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          name, 
          email, 
          password, 
          companyPhone: companyPhone || '', 
        }),
      });

      if (!res.ok) {
          const errorJson = await res.json();
          throw new Error(errorJson.message || `Erreur de requête (${res.status}).`);
      }
      
      const data = await res.json();
      
      setCompany({ ...data.company, id: data.company._id });
      setAuthToken(data.token); 
      setMode('companyDashboard');
      setCurrentCompanyTab('dashboard');
      
      // NOUVEAU: Afficher la modale d'identifiants
      setAuthCredentials({
          type: 'company',
          name: data.company.name,
          email: data.company.email,
          password: password, // Utiliser le mot de passe non haché pour l'affichage initial
      });
      setShowAuthModal(true);

    } catch (e2) {
      alert(e2.message);
    }
  }

  async function handleCompanyLogin(e) {
    e.preventDefault();
    const form = e.target;
    const email = form.email.value;
    const password = form.password.value;
    try {
      const res = await fetch(`${API_URL}/auth/company/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });

      if (!res.ok) {
          const errorJson = await res.json();
          throw new Error(errorJson.message || "Email ou mot de passe incorrect."); 
      }
      
      const data = await res.json();

      setCompany({ ...data.company, id: data.company._id });
      setAuthToken(data.token); 
      setMode('companyDashboard');
      setCurrentCompanyTab('dashboard');
    } catch (e2) {
      alert(e2.message);
    }
  }

  // NOUVEAU: Gestion du changement de mot de passe de la compagnie (CORRIGÉ)
  async function handleChangeCompanyPassword(oldPassword, newPassword) {
    try {
        const response = await apiFetch('/auth/company/change-password', {
            method: 'PUT',
            body: JSON.stringify({ oldPassword, newPassword }),
        });
        
        // Afficher un message de succès et forcer la déconnexion
        alert(response.message + " Vous devez vous reconnecter avec le nouveau mot de passe.");
        
        setCompany(null);
        setAuthToken(null);
        setMode('companyAuth'); 
        
    } catch (e) {
        // Lancer l'erreur pour que la modal puisse l'afficher
        throw new Error('Échec de la mise à jour du mot de passe : ' + e.message);
    }
  }

  async function handleManagerLogin(e) {
    e.preventDefault();
    const form = e.target;
    const boutiqueName = form.boutiqueName.value;
    const password = form.password.value;
    try {
      const res = await fetch(`${API_URL}/auth/manager/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ boutiqueName, password }),
      });
      
      if (!res.ok) {
          const errorJson = await res.json();
          throw new Error(errorJson.message || "Nom de boutique ou mot de passe gérant incorrect.");
      }
      
      const data = await res.json();
      
      const boutiqueData = { ...data.boutique, id: data.boutique._id };
      const companyData = { ...data.company, id: data.company._id };
      
      setBoutique(boutiqueData);
      setManager({ name: boutiqueData.managerName });
      setCompany(companyData);
      setAuthToken(data.token); 
      setMode('managerDashboard');
      setCurrentManagerTab('dashboard');
    } catch (e2) {
      alert(e2.message);
    }
  }
  
  // -------------------- Entreprise : Boutique CRUD (Mise à jour pour la modale gérant) --------------------

  useEffect(() => {
    if (company && mode === 'companyDashboard' && authToken) {
      loadBoutiques();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [company, mode, authToken]);

  useEffect(() => {
    if (selectedBoutiqueId && authToken) {
      loadBoutiqueSummary(selectedBoutiqueId, summaryFrom, summaryTo, true);
      loadTopProducts(selectedBoutiqueId);
    } else {
      setSelectedBoutiqueSummary(null);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedBoutiqueId, summaryFrom, summaryTo, analysisType, authToken]);

  async function loadBoutiques() {
    try {
      // apiFetch envoie le token de la compagnie
      const data = await apiFetch(`/boutiques/by-company/${company.id}`);
      setBoutiques(data.map(b => ({ ...b, id: b._id || b.id })));
    } catch (e) {
      alert(e.message);
    }
  }

  async function loadBoutiqueSummary(boutiqueId, from, to, isCompany = false) {
    const loadingStateSetter = isCompany ? setIsLoadingCompanyData : setIsLoadingManagerData;
    loadingStateSetter(true);
    
    try {
      const params = new URLSearchParams();
      if (from) params.append('from', from);
      if (to) params.append('to', to);
      
      // apiFetch envoie le token
      const sum = await apiFetch(`/boutiques/${boutiqueId}/summary?${params.toString()}`);
      
      if (isCompany) {
        setSelectedBoutiqueSummary(sum);
      } else {
        setSummary(sum);
        loadAuditLogs(boutiqueId);
      }
    } catch (e) {
      alert('Erreur de chargement du résumé : ' + e.message);
      if (isCompany) setSelectedBoutiqueSummary(null);
      else setSummary(null);
    } finally {
      loadingStateSetter(false);
    }
  }
  
  async function handleCreateBoutique(e) {
    e.preventDefault();
    const form = e.target;
    const name = form.name.value;
    const managerName = form.managerName.value;
    const managerPassword = form.managerPassword.value; // Mot de passe non haché
    const initialBankBalance = form.initialBankBalance.value;
    const logoBase64ToSend = logoBase64; 

    try {
      // apiFetch envoie le token
      await apiFetch('/boutiques', {
        method: 'POST',
        body: JSON.stringify({
          name,
          managerName,
          managerPassword,
          initialBankBalance,
          logoBase64: logoBase64ToSend,
        }),
      });
      form.reset();
      setLogoBase64('');
      loadBoutiques();
      alert('Boutique créée.');
      
      // NOUVEAU: Afficher la modale d'identifiants gérant
      setAuthCredentials({
          type: 'manager',
          boutiqueName: name,
          name: managerName,
          password: managerPassword, // Utiliser le mot de passe non haché pour l'affichage initial
      });
      setShowAuthModal(true);
      
    } catch (e2) {
      alert(e2.message);
    }
  }

  // NOUVEAU: Téléchargement des identifiants gérant (depuis la liste) (CORRIGÉ)
  function handleDownloadManagerCredentials(boutiqueData) {
      // Afficher un message de sécurité pour les entités existantes
      setAuthCredentials({
          type: 'manager',
          boutiqueName: boutiqueData.name,
          name: boutiqueData.managerName,
          password: "MOT DE PASSE NON DISPONIBLE (SÉCURITÉ)", 
      });
      setShowAuthModal(true);
  }

  async function handleDeleteBoutique(boutiqueId) {
    const boutiqueToDelete = boutiques.find(b => b.id === boutiqueId);
    const reason = window.prompt(`Motif de suppression de la boutique ${boutiqueToDelete.name} :`);
    if (!reason) return;
    if (window.confirm('Êtes-vous sûr de vouloir supprimer cette boutique et toutes ses données (caisse, ventes, produits...) ? Cette action est irréversible.')) {
      try {
        // apiFetch envoie le token
        await apiFetch(`/boutiques/${boutiqueId}`, {
          method: 'DELETE',
          body: JSON.stringify({ reason, performedBy: getPerformedBy() }),
        });
        loadBoutiques();
        setSelectedBoutiqueId('');
        alert('Boutique supprimée.');
      } catch (e2) {
        alert(e2.message);
      }
    }
  }

  function openModifyBoutiqueModal(boutiqueToModify) {
    setLogoBase64(boutiqueToModify.logoBase64 || '');
    setModifyingBoutique(boutiqueToModify);
  }

  async function handleModifyBoutique(e) {
    e.preventDefault();
    const form = e.target;
    const boutiqueId = modifyingBoutique.id;
    const name = form.name.value;
    const managerName = form.managerName.value;
    const managerPassword = form.managerPassword.value || undefined;
    const initialBankBalance = form.initialBankBalance.value;
    const reason = form.reason.value;
    const logoBase64ToSend = logoBase64; 
    
    if (!reason) {
      alert('Veuillez fournir un motif de modification.');
      return;
    }

    try {
      // apiFetch envoie le token
      const updated = await apiFetch(`/boutiques/${boutiqueId}`, {
        method: 'PUT',
        body: JSON.stringify({ 
          name, 
          managerName, 
          managerPassword, 
          initialBankBalance, 
          logoBase64: logoBase64ToSend,
          reason, 
          performedBy: getPerformedBy() 
      }),
      });
      setBoutiques(boutiques.map(b => (b.id === boutiqueId ? { ...updated, id: updated._id } : b)));
      setModifyingBoutique(null);
      setLogoBase64('');
      alert('Boutique et accès gérant modifiés.');
      if (selectedBoutiqueId === boutiqueId) {
        loadBoutiqueSummary(boutiqueId, summaryFrom, summaryTo, true);
      }
    } catch (e2) {
      alert(e2.message);
    }
  }

  // -------------------- Gérant : chargement des données (Utilise apiFetch sécurisé) --------------------
  
  async function loadAuditLogs(boutiqueId) {
    setIsLoadingAuditLogs(true);
    try {
        // apiFetch envoie le token
        const logs = await apiFetch(`/audit?boutiqueId=${boutiqueId}`);
        setAuditLogs(logs.map(l => ({ ...l, id: l._id || l.id })));
    } catch (e) {
        console.error("Erreur lors du chargement de l'audit log:", e);
        setAuditLogs([]);
    } finally {
        setIsLoadingAuditLogs(false);
    }
  }

  async function loadManagerData(initialBoutique) {
    setIsLoadingManagerData(true);
    setAuditLogs([]);
    setSummary(null);

    try {
      // apiFetch envoie le token pour toutes les requêtes
      const [cb, bank, purch, prod, cls, sls, sum] = await Promise.all([
        apiFetch(`/boutiques/${initialBoutique.id}/cashbook`),
        apiFetch(`/boutiques/${initialBoutique.id}/bank`),
        apiFetch(`/boutiques/${initialBoutique.id}/purchases`),
        apiFetch(`/boutiques/${initialBoutique.id}/products`),
        apiFetch(`/boutiques/${initialBoutique.id}/clients`),
        apiFetch(`/boutiques/${initialBoutique.id}/sales`),
        apiFetch(`/boutiques/${initialBoutique.id}/summary`),
      ]);
      
      setCashbook(cb.map(e => ({ ...e, id: e._id || e.id })));
      setBankEntries(bank.map(e => ({ ...e, id: e._id || e.id })));
      setPurchases(purch.map(p => ({ ...p, id: p._id || p.id })));
      setProducts(prod.map(p => ({ ...p, id: p._id || p.id })));
      setClients(cls.map(c => ({ ...c, id: c._id || c.id })));
      setSales(sls.map(s => ({ ...s, id: s._id || s.id })));
      setSummary(sum);
      
      setIsLoadingManagerData(false);

      loadAuditLogs(initialBoutique.id);
      
    } catch (e) {
      alert('Erreur de chargement des données de base: ' + e.message);
      setCashbook([]);
      setBankEntries([]);
      setPurchases([]);
      setProducts([]);
      setClients([]);
      setSales([]);
      setSummary(null);
      setIsLoadingManagerData(false);
    }
  }
  
  useEffect(() => {
    if (boutique && mode === 'managerDashboard' && authToken) {
      loadManagerData(boutique); 
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [boutique, mode, authToken]);
  
  // MISE À JOUR : Chargement des Top Produits avec les Achats
  useEffect(() => {
    if (((boutique && mode === 'managerDashboard') || (company && selectedBoutiqueId)) && authToken) {
      loadTopProducts(boutique?.id || selectedBoutiqueId);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [boutique, selectedBoutiqueId, summaryFrom, summaryTo, analysisType, mode, authToken]);

  async function loadTopProducts(id) {
      const boutiqueId = id;
      if (!boutiqueId) return;

      let from = summaryFrom;
      let to = summaryTo;

      const today = new Date();
      if (!summaryFrom && !summaryTo) {
          if (analysisType === 'day') {
              from = today.toISOString().slice(0, 10);
              to = today.toISOString().slice(0, 10);
          } else if (analysisType === 'month') {
              from = new Date(today.getFullYear(), today.getMonth(), 1).toISOString().slice(0, 10);
              to = new Date(today.getFullYear(), today.getMonth() + 1, 0).toISOString().slice(0, 10);
          } else if (analysisType === 'year') {
              from = new Date(today.getFullYear(), 0, 1).toISOString().slice(0, 10);
              to = new Date(today.getFullYear(), 11, 31).toISOString().slice(0, 10);
          }
      }

      const salesParams = new URLSearchParams({ type: 'sales', from, to, limit: 5 });
      const purchaseParams = new URLSearchParams({ type: 'purchases', from, to, limit: 5 });

      try {
          // apiFetch envoie le token
          const [topSales, topPurchases] = await Promise.all([
              apiFetch(`/boutiques/${boutiqueId}/analysis/top-products?${salesParams.toString()}`),
              apiFetch(`/boutiques/${boutiqueId}/analysis/top-products?${purchaseParams.toString()}`), 
          ]);
          setTopSalesProducts(topSales);
          setTopPurchaseProducts(topPurchases);
      } catch (e) {
          console.error("Erreur lors du chargement des tops produits:", e);
      }
  }


  // -------------------- Brouillard de caisse CRUD (Utilise apiFetch sécurisé) --------------------

  async function handleAddCashbookEntry(e) {
    e.preventDefault();
    if (!boutique) return;
    try {
      // apiFetch envoie le token
      const entry = await apiFetch(`/boutiques/${boutique.id}/cashbook`, {
        method: 'POST',
        body: JSON.stringify({
          date: cbDate,
          pieceNumber: cbPiece,
          description: cbDesc,
          type: cbType,
          amount: parseFloat(cbAmount || '0'),
        }),
      });
      setCashbook([...cashbook, { ...entry, id: entry._id || entry.id }]);
      setCbDesc('');
      setCbPiece('');
      setCbAmount('');
      loadBoutiqueSummary(boutique.id, summaryFrom, summaryTo, false);
    } catch (e2) {
      alert(e2.message);
    }
  }
  
  function openModifyCbModal(entry) {
    setModifyingCbEntry(entry);
  }

  async function handleModifyCbEntry(e) {
    e.preventDefault();
    const form = e.target;
    const entryId = modifyingCbEntry.id;
    const reason = form.reason.value;

    if (!reason) {
      alert('Veuillez fournir un motif de modification.');
      return;
    }

    try {
      // apiFetch envoie le token
      const updated = await apiFetch(`/cashbook/${entryId}`, {
        method: 'PUT',
        body: JSON.stringify({
          date: form.date.value,
          pieceNumber: form.pieceNumber.value,
          description: form.description.value,
          type: form.type.value,
          amount: parseFloat(form.amount.value || '0'),
          reason,
          performedBy: getPerformedBy(),
        }),
      });
      setCashbook(cashbook.map(e => (e.id === entryId ? { ...updated, id: updated._id } : e)));
      setModifyingCbEntry(null);
      loadBoutiqueSummary(boutique.id, summaryFrom, summaryTo, false);
    } catch (e2) {
      alert(e2.message);
    }
  }

  async function deleteCashbookEntry(entryId) {
    if (!boutique) return;
    const reason = window.prompt('Motif de suppression de l\'écriture de caisse :');
    if (!reason) return;
    try {
      // apiFetch envoie le token
      await apiFetch(`/cashbook/${entryId}`, {
        method: 'DELETE',
        body: JSON.stringify({ reason, performedBy: getPerformedBy() }),
      });
      setCashbook(cashbook.filter(e => e.id !== entryId));
      loadBoutiqueSummary(boutique.id, summaryFrom, summaryTo, false);
    } catch (e2) {
      alert(e2.message);
    }
  }
  
  // -------------------- Compte Banque CRUD (Utilise apiFetch sécurisé) --------------------

  async function handleAddBankEntry(e) {
    e.preventDefault();
    if (!boutique) return;
    try {
      // apiFetch envoie le token
      const entry = await apiFetch(`/boutiques/${boutique.id}/bank`, {
        method: 'POST',
        body: JSON.stringify({
          date: bankDate,
          pieceNumber: bankPiece,
          description: bankDesc,
          type: bankType,
          amount: parseFloat(bankAmount || '0'),
        }),
      });
      setBankEntries([...bankEntries, { ...entry, id: entry._id || entry.id }]);
      setBankDesc('');
      setBankPiece('');
      setBankAmount('');
      loadBoutiqueSummary(boutique.id, summaryFrom, summaryTo, false);
    } catch (e2) {
      alert(e2.message);
    }
  }

  // -------------------- Achats CRUD (Utilise apiFetch sécurisé) --------------------
  
  async function handleAddPurchase(e) {
    e.preventDefault();
    if (!boutique) return;
    try {
      // apiFetch envoie le token
      const purchase = await apiFetch(`/boutiques/${boutique.id}/purchases`, {
        method: 'POST',
        body: JSON.stringify({
          date: purchaseDate,
          productName: purchaseProductName,
          unitPrice: parseFloat(purchaseUnitPrice || '0'),
          quantity: parseFloat(purchaseQuantity || '0'),
        }),
      });
      setPurchases([...purchases, { ...purchase, id: purchase._id || purchase.id }]);
      setPurchaseProductName('');
      setPurchaseUnitPrice('');
      setPurchaseQuantity('');
      loadBoutiqueSummary(boutique.id, summaryFrom, summaryTo, false);
    } catch (e2) {
      alert(e2.message);
    }
  }

  // -------------------- Produits CRUD (Utilise apiFetch sécurisé) --------------------
  
  async function handleAddProduct(e) {
    e.preventDefault();
    if (!boutique) return;
    try {
      // apiFetch envoie le token
      const product = await apiFetch(`/boutiques/${boutique.id}/products`, {
        method: 'POST',
        body: JSON.stringify({
          name: newProductName,
          unitPrice: parseFloat(newProductUnitPrice || '0'),
          costPrice: parseFloat(newProductCostPrice || '0'),
        }),
      });
      setProducts([...products, { ...product, id: product._id || product.id }]);
      setNewProductName('');
      setNewProductUnitPrice('');
      setNewProductCostPrice('');
    } catch (e2) {
      alert(e2.message);
    }
  }
  
  function openModifyProductModal(product) {
    setModifyingProduct(product);
  }

  async function handleModifyProduct(e) {
    e.preventDefault();
    const form = e.target;
    const productId = modifyingProduct.id;
    const reason = form.reason.value;

    if (!reason) {
      alert('Veuillez fournir un motif de modification.');
      return;
    }

    try {
      // apiFetch envoie le token
      const updated = await apiFetch(`/products/${productId}`, {
        method: 'PUT',
        body: JSON.stringify({
          name: form.name.value,
          unitPrice: parseFloat(form.unitPrice.value || '0'),
          costPrice: parseFloat(form.costPrice.value || '0'),
          reason,
          performedBy: getPerformedBy(),
        }),
      });
      setProducts(products.map(p => (p.id === productId ? { ...updated, id: updated._id } : p)));
      setModifyingProduct(null);
      loadBoutiqueSummary(boutique.id, summaryFrom, summaryTo, false);
    } catch (e2) {
      alert(e2.message);
    }
  }
  
  async function handleDeleteProduct(productId) {
    const reason = window.prompt('Motif de suppression du produit :');
    if (!reason) return;
    try {
        // apiFetch envoie le token
        await apiFetch(`/products/${productId}`, {
            method: 'DELETE',
            body: JSON.stringify({ reason, performedBy: getPerformedBy() }),
        });
        setProducts(products.filter(p => p.id !== productId));
        loadBoutiqueSummary(boutique.id, summaryFrom, summaryTo, false);
    } catch (e2) {
        alert(e2.message);
    }
  }

  // -------------------- Clients CRUD (Utilise apiFetch sécurisé) --------------------

  async function handleAddClient(e) {
    e.preventDefault();
    if (!boutique) return;
    try {
      // apiFetch envoie le token
      const client = await apiFetch(`/boutiques/${boutique.id}/clients`, {
        method: 'POST',
        body: JSON.stringify({ name: newClientName }),
      });
      setClients([...clients, { ...client, id: client._id || client.id }]);
      setNewClientName('');
    } catch (e2) {
      alert(e2.message);
    }
  }
  
  function openModifyClientModal(client) {
    setModifyingClient(client);
  }

  async function handleModifyClient(e) {
    e.preventDefault();
    const form = e.target;
    const clientId = modifyingClient.id;
    const reason = form.reason.value;

    if (!reason) {
      alert('Veuillez fournir un motif de modification.');
      return;
    }

    try {
      // apiFetch envoie le token
      const updated = await apiFetch(`/clients/${clientId}`, {
        method: 'PUT',
        body: JSON.stringify({
          name: form.name.value,
          reason,
          performedBy: getPerformedBy(),
        }),
      });
      setClients(clients.map(c => (c.id === clientId ? { ...updated, id: updated._id } : c)));
      setModifyingClient(null);
      loadBoutiqueSummary(boutique.id, summaryFrom, summaryTo, false);
    } catch (e2) {
      alert(e2.message);
    }
  }
  
  async function handleDeleteClient(clientId) {
    const reason = window.prompt('Motif de suppression du client :');
    if (!reason) return;
    try {
        // apiFetch envoie le token
        await apiFetch(`/clients/${clientId}`, {
            method: 'DELETE',
            body: JSON.stringify({ reason, performedBy: getPerformedBy() }),
        });
        setClients(clients.filter(c => c.id !== clientId));
        loadBoutiqueSummary(boutique.id, summaryFrom, summaryTo, false);
    } catch (e2) {
      alert(e2.message);
    }
  }

  useEffect(() => {
    if (!saleProductId) return;
    const prod = products.find(p => p.id === saleProductId);
    if (prod) {
      setSaleProductName(prod.name);
      setSaleUnitPrice(String(prod.unitPrice));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [saleProductId, products]);


  // -------------------- Ventes CRUD (Utilise apiFetch sécurisé) --------------------
  
  async function handleCreateSale(e) {
    e.preventDefault();
    if (!boutique) return;

    let clientId = saleClientId;
    let clientName = saleClientName;
    if (!clientId && clientName) {
      try {
        // apiFetch envoie le token
        const c = await apiFetch(`/boutiques/${boutique.id}/clients`, {
          method: 'POST',
          body: JSON.stringify({ name: clientName }),
        });
        clientId = c._id || c.id;
        setClients([...clients, { ...c, id: c._id || c.id }]);
      } catch (e2) {
        alert('Erreur lors de la création du client : ' + e2.message);
        return;
      }
    } else if (clientId) {
      const c = clients.find(c => c.id === clientId);
      clientName = c ? c.name : '';
    }

    let productId = saleProductId;
    let productName = saleProductName;
    if (!productName) {
      alert('Produit obligatoire');
      return;
    }

    try {
      // apiFetch envoie le token
      const sale = await apiFetch(`/boutiques/${boutique.id}/sales`, {
        method: 'POST',
        body: JSON.stringify({
          date: saleDate,
          clientId,
          clientName,
          productId,
          productName,
          unitPrice: parseFloat(saleUnitPrice || '0'),
          quantity: parseFloat(saleQuantity || '0'),
          amountPaid: parseFloat(saleAmountPaid || '0'),
          tableNumber: saleTableNumber,
          serverName: saleServerName,
        }),
      });
      setSales([...sales, { ...sale, id: sale._id || sale.id }]);
      setInvoiceSale(sale);
      setSaleAmountPaid('');
      setSaleTableNumber('');
      setSaleServerName('');
      loadBoutiqueSummary(boutique.id, summaryFrom, summaryTo, false);
    } catch (e2) {
      alert(e2.message);
    }
  }

  function openModifySaleModal(sale) {
    setModifyingSale(sale);
  }

  async function handleModifySale(e) {
    e.preventDefault();
    const form = e.target;
    const saleId = modifyingSale.id;
    const reason = form.reason.value;

    if (!reason) {
      alert('Veuillez fournir un motif de modification.');
      return;
    }

    try {
      // apiFetch envoie le token
      const updated = await apiFetch(`/sales/${saleId}`, {
        method: 'PUT',
        body: JSON.stringify({
          date: form.date.value,
          productName: form.productName.value,
          unitPrice: parseFloat(form.unitPrice.value || '0'),
          quantity: parseFloat(form.quantity.value || '0'),
          amountPaid: parseFloat(form.amountPaid.value || '0'),
          tableNumber: form.tableNumber.value,
          serverName: form.serverName.value,
          reason,
          performedBy: getPerformedBy(),
        }),
      });
      setSales(sales.map(s => (s.id === saleId ? { ...updated, id: updated._id } : s)));
      setModifyingSale(null);
      loadBoutiqueSummary(boutique.id, summaryFrom, summaryTo, false);
    } catch (e2) {
      alert(e2.message);
    }
  }

  async function updateSaleWithReason(saleId, updates, actionLabel) {
    if (!boutique) return;
    const reason = window.prompt(`Motif de ${actionLabel} :`);
    if (!reason) return;
    try {
      // apiFetch envoie le token
      const updated = await apiFetch(`/sales/${saleId}`, {
        method: 'PUT',
        body: JSON.stringify({ ...updates, reason, performedBy: getPerformedBy() }),
      });
      setSales(sales.map(s => (s.id === saleId ? { ...updated, id: updated._id } : s)));
      loadBoutiqueSummary(boutique.id, summaryFrom, summaryTo, false);
    } catch (e2) {
      alert(e2.message);
    }
  }
  
  async function deleteSale(saleId) {
    if (!boutique) return;
    const reason = window.prompt('Motif de suppression de la vente :');
    if (!reason) return;
    try {
      // apiFetch envoie le token
      await apiFetch(`/sales/${saleId}`, {
        method: 'DELETE',
        body: JSON.stringify({ reason, performedBy: getPerformedBy() }),
      });
      setSales(sales.filter(s => s.id !== saleId));
      loadBoutiqueSummary(boutique.id, summaryFrom, summaryTo, false);
    } catch (e2) {
      alert(e2.message);
    }
  }

  function saleTotal(s) {
    return s.unitPrice * s.quantity;
  }

  function saleResteAPayer(s) {
    return saleTotal(s) - s.amountPaid;
  }

  // -------------------- Exports CSV (Utilise apiFetch sécurisé) --------------------

  async function downloadCsv(type, boutiqueIdToExport) {
    const id = boutiqueIdToExport || boutique?.id;
    if (!id) return;
    try {
      const params = new URLSearchParams();
      if (exportFrom) params.append('from', exportFrom);
      if (exportTo) params.append('to', exportTo);
      
      // Utilisation directe de fetch car la réponse est un Blob, mais on ajoute les headers manuellement
      const res = await fetch(`${API_URL}/boutiques/${id}/export/${type}?${params.toString()}`, {
          headers: {
              'Authorization': `Bearer ${authToken}`
          }
      });
      
      if (!res.ok) throw new Error(`Erreur lors de l'export CSV pour ${type}`);
      
      const blob = await res.blob();
      const link = document.createElement('a');
      link.href = window.URL.createObjectURL(blob);
      const boutiqueName = boutiques.find(b => b.id === id)?.name || id;
      // Tentative de récupérer le nom du fichier depuis le header Content-Disposition (si le backend le fournit)
      const contentDisposition = res.headers.get('Content-Disposition');
      let filename = contentDisposition ? contentDisposition.split('filename=')[1].replace(/"/g, '') : `${type}_${boutiqueName}.csv`;
      
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch (e) {
      alert(e.message);
    }
  }
  
  // -------------------- Facture : impression / PDF (Inchangé car non sécurisé) --------------------

function handlePrintInvoice(sale, boutique, company) {
  try {
      if (!sale || !boutique || !company) {
          console.error("ERREUR DE CONTEXTE: Sale, Boutique ou Company manquant.");
          alert("Impossible d'imprimer. Le contexte de la boutique ou de la vente est manquant.");
          return; 
      }
      
      const total = saleTotal(sale);
      const resteAPayer = saleResteAPayer(sale);
      const logoSrc = boutique.logoBase64;
      const companyPhoneRaw = company.companyPhone || 'Non spécifié'; 
      const factureUrl = `${API_URL}/sales/invoice/${sale.invoiceNumber}`;
      const companyPhoneFormatted = companyPhoneRaw.split(',').map(p => p.trim()).join('<br/>'); 
      
      let paiementInfo = '';
      let paiementStyle = '';
      
      if (resteAPayer > 0) {
          paiementInfo = `Reste à payer: ${resteAPayer.toFixed(2)} FCFA`;
          paiementStyle = `color: black; font-weight: bold; font-size: 11pt;`;
      } else if (resteAPayer < 0) {
          paiementInfo = `Rendu au client: ${Math.abs(resteAPayer).toFixed(2)} FCFA`;
          paiementStyle = `color: black; font-weight: bold; font-size: 11pt;`;
      } else {
          paiementInfo = `Vente soldée.`;
          paiementStyle = `color: black;`;
      }

      const logo = logoSrc ? `<img src="${logoSrc}" style="max-height: 40px; max-width: 70mm; margin-bottom: 5px;" alt="Logo Boutique" />` : '';
      
      const qrCodePlaceholderId = `qr-code-${sale.invoiceNumber}`;
      
      const html = `
<!DOCTYPE html>
<html>
<head>
<meta charSet="utf-8" />
<title>Facture ${sale.invoiceNumber}</title>
<style>
/* STYLES THERMIQUES (80mm) */
body { 
  font-family: 'Consolas', monospace; /* Police plus 'thermique' */
  width: 80mm; 
  padding: 10px; 
  margin: 0 auto; 
  font-size: 9pt; 
  line-height: 1.3;
}
.header { 
  display: flex; 
  flex-direction: column; 
  align-items: center; 
  text-align: center;
  margin-bottom: 10px; 
}
.invoice-title, .client-info, .server-info {
  width: 100%;
  margin-bottom: 3px;
  font-size: 9pt;
}
.client-info, .server-info {
  border-top: 1px dashed #000;
  padding-top: 5px;
  margin-top: 5px;
}
table { 
  width: 100%; 
  border-collapse: collapse; 
  margin-top: 8px; 
}
th, td { 
  border: none; 
  padding: 3px 0; 
  font-size: 9pt; 
}
th { 
  text-align: left; 
  border-top: 1px dashed #000;
  border-bottom: 1px dashed #000;
  font-weight: bold;
}
.right { 
  text-align: right; 
}
.total-line {
  border-top: 1px dashed #000;
  padding-top: 8px;
  margin-top: 8px;
}
.footer { 
  display: flex; 
  flex-direction: column;
  align-items: center;
  text-align: center; 
  margin-top: 25px; 
  padding-top: 10px;
  border-top: 1px dashed #000;
}
</style>
</head>
<body class="print-invoice-content"> 
<div class="header">
<div class="logo-block">
  ${logo}
  <div><strong>${boutique.name}</strong></div>
  <div>Tél: ${companyPhoneFormatted}</div>
</div>
<div class="invoice-title">
  <div>--- FACTURE SIMPLIFIÉE ---</div>
  <div>N° <strong>${sale.invoiceNumber}</strong></div>
  <div>Date : ${sale.date}</div>
</div>
</div>

<div class="client-info">
Client : ${sale.clientName || 'Client Comptoir'}
</div>
${(sale.serverName || sale.tableNumber) ? `
<div class="server-info">
Serveur : ${sale.serverName || '-'} | Table : ${sale.tableNumber || '-'}
</div>
` : ''}

<table>
<thead>
  <tr>
    <th style="width: 15%;">QTÉ</th>
    <th style="width: 45%;">DÉSIGNATION</th>
    <th class="right" style="width: 20%;">P.U.</th>
    <th class="right" style="width: 20%;">TOTAL</th>
  </tr>
</thead>
<tbody>
  <tr>
    <td>${sale.quantity}</td>
    <td>${sale.productName}</td>
    <td class="right">${sale.unitPrice.toFixed(2)}</td>
    <td class="right">${total.toFixed(2)}</td>
  </tr>
</tbody>
</table>

<div style="margin-top: 15px; width: 100%; text-align: right;">
<div class="total-line">
  Total Dû : <span style="font-size: 11pt; font-weight: bold;">${total.toFixed(2)} FCFA</span>
</div>
<div style="margin-top: 5px;">
  Montant Payé : ${sale.amountPaid.toFixed(2)} FCFA
</div>
<div style="${paiementStyle} border-top: 1px solid #000; padding-top: 5px; margin-top: 5px;">
  ${paiementInfo}
</div>
</div>

<div class="footer">
  <div id="${qrCodePlaceholderId}"></div>
  <p style="font-size:8pt; margin-top:10px;">Merci pour votre confiance.<br/>Téléchargez votre facture PDF en scannant.</p>
</div>

<script src="https://unpkg.com/qrcode.react@1.0.1/dist/qrcode.react.min.js"></script>
<script>
  setTimeout(function() {
      const qrContainer = document.getElementById('${qrCodePlaceholderId}');
      
      if (qrContainer && typeof QRCode !== 'undefined') {
          new QRCode(qrContainer, {
              text: '${factureUrl}',
              width: 70,
              height: 70,
              colorDark : "#000000",
              colorLight : "#ffffff",
              correctLevel : QRCode.CorrectLevel.H
          });
      }
      
      // Laisser le temps au QR code d'apparaître
      setTimeout(function() {
          window.print();
          window.onafterprint = function() {
              window.close();
          };
      }, 500); 
      
  }, 500);
</script>
</body>
</html>
`;
        const printWindow = window.open(`about:blank`, `Facture_${sale.invoiceNumber}`, 'width=350,height=600');
        
        if (!printWindow) {
            alert("Le navigateur a bloqué la fenêtre d'impression (pop-up). Veuillez autoriser les pop-ups pour ce site.");
            return;
        }

        // CORRECTION: Utilisation de la variable locale printWindow
        printWindow.document.open();
        printWindow.document.write(html);
        printWindow.document.close();
        
    } catch (error) {
        alert("Une erreur technique est survenue lors de l'impression : " + error.message);
    }
}
  // -------------------- Rendus Modales (Reste inchangé) --------------------
  
  function renderBoutiqueModificationModal() {
    // ... (Reste inchangé) ...
    if (!modifyingBoutique) return null;
    return (
      <ModificationModal
        show={!!modifyingBoutique}
        handleClose={() => setModifyingBoutique(null)}
        title={`Modifier la boutique ${modifyingBoutique.name}`}
      >
        <form onSubmit={handleModifyBoutique}>
          <div className="mb-3">
            <label className="form-label">Nom de la boutique</label>
            <input
              name="name"
              className="form-control"
              defaultValue={modifyingBoutique.name}
              required
            />
          </div>
          <div className="mb-3">
            <label className="form-label">Nom du gérant</label>
            <input
              name="managerName"
              className="form-control"
              defaultValue={modifyingBoutique.managerName}
              required
            />
          </div>
          <div className="mb-3">
            <label className="form-label">Solde initial de banque</label>
            <input
              name="initialBankBalance"
              type="number"
              step="0.01"
              className="form-control"
              defaultValue={modifyingBoutique.initialBankBalance}
            />
          </div>
          <div className="mb-3"> 
            <label className="form-label">Logo de la boutique (Upload)</label>
            <input
              type="file"
              name="logoFile" 
              className="form-control"
              accept="image/*"
              onChange={(e) => {
                handleLogoFileUpload(e);
              }}
            />
            {logoBase64 && (
              <div className="mt-2">
                <p className="small text-muted mb-1">Aperçu du logo :</p>
                <img src={logoBase64} alt="Logo Aperçu" style={{ maxHeight: '60px', border: '1px solid var(--border-light)', borderRadius: 'var(--radius-sm)' }} />
                <button type="button" className="btn btn-sm btn-outline-danger ms-2" onClick={() => setLogoBase64('')}>
                    Supprimer le logo
                </button>
              </div>
            )}
            {!logoBase64 && modifyingBoutique.logoBase64 && (
                <div className="mt-2">
                    <p className="small text-muted mb-1">Logo actuel :</p>
                    <img src={modifyingBoutique.logoBase64} alt="Logo Actuel" style={{ maxHeight: '60px', border: '1px solid var(--border-light)', borderRadius: 'var(--radius-sm)' }} />
                    <button type="button" className="btn btn-sm btn-outline-danger ms-2" onClick={() => setLogoBase64('')}>
                        Supprimer le logo
                    </button>
                </div>
            )}
          </div>
          <div className="mb-3">
            <label className="form-label">Nouveau mot de passe gérant (laisser vide pour ne pas changer)</label>
            <input
              name="managerPassword"
              type="password"
              className="form-control"
              placeholder="Nouveau mot de passe"
            />
          </div>
          <div className="mb-3">
            <label className="form-label">Motif de modification (Obligatoire)</label>
            <input name="reason" className="form-control" required />
          </div>
          <button type="submit" className="btn btn-primary w-100">
            Enregistrer les modifications
          </button>
        </form>
      </ModificationModal>
    );
  }

  function renderCbModificationModal() {
    // ... (Reste inchangé) ...
  }
  
  function renderProductModificationModal() {
    // ... (Reste inchangé) ...
  }
  
  function renderClientModificationModal() {
    // ... (Reste inchangé) ...
  }
  
  function renderSaleModificationModal() {
    // ... (Reste inchangé) ...
  }

  // NOUVEAU: Sélecteur de Thème (Ajusté pour le Gérant)
  const renderThemeSelector = () => {
    const isCompany = !manager; // Si manager est null, c'est l'entreprise
    const titleText = isCompany ? 'Configuration du Thème (Design Entreprise)' : 'Configuration de Mon Thème (Design Gérant)';
    const descriptionText = isCompany ? 'Ce thème sera stocké uniquement pour votre compte Entreprise.' : 'Ce thème sera stocké uniquement pour votre compte Gérant.';

    const themes = [
        { id: 'blue', name: 'Thème Bleu', color: '#007bff' },
        { id: 'green', name: 'Thème Vert', color: '#1abc9c' },
        { id: 'purple', name: 'Thème Violet', color: '#9b59b6' },
        { id: 'red', name: 'Thème Rouge', color: '#e74c3c' },
    ];
    
    return (
        <div className="card p-4 shadow-sm mb-4">
            <h4 className="mb-3 text-secondary">🎨 {titleText}</h4>
            <p className="small text-muted">{descriptionText}</p>
            <div className="row g-3 mb-4">
                {themes.map(t => (
                    <div className="col-lg-3 col-md-6 col-12" key={t.id}>
                        <div 
                            className={`card p-3 theme-option-card ${theme === t.id ? 'active' : ''}`}
                            style={{borderColor: t.color}}
                            onClick={() => setTheme(t.id)}
                        >
                            <h6 className="mb-1 fw-bold" style={{color: t.color}}>{t.name}</h6>
                            <div className="d-flex align-items-center">
                                <div className="ms-2" style={{width: '20px', height: '10px', backgroundColor: t.color, borderRadius: '3px'}}></div>
                                <span className="small text-muted ms-2">Couleur principale</span>
                            </div>
                        </div>
                    </div>
                ))}
            </div>
            
            <div className="form-check form-switch mt-3">
                <input 
                    className="form-check-input" 
                    type="checkbox" 
                    role="switch" 
                    id="darkModeSwitch"
                    checked={isDarkMode}
                    onChange={() => setIsDarkMode(!isDarkMode)}
                />
                <label className="form-check-label fw-bold" htmlFor="darkModeSwitch">
                    {isDarkMode ? 'Mode Sombre Activé 🌙' : 'Mode Clair Activé ☀️'}
                </label>
                <div className="form-text small" style={{color: 'var(--text-secondary)'}}>
                    Activez pour une interface sombre (Dark Mode) pour réduire la fatigue oculaire.
                </div>
            </div>
            
        </div>
    );
  };
  
  // NOUVEAU: Rendu du bouton de changement de mot de passe de la compagnie
  const renderCompanyPasswordChange = () => (
      <div className="card p-4 shadow-sm mb-4">
        <h4 className="mb-3 text-warning">🛡️ Sécurité du Compte Entreprise</h4>
        <p className="small text-muted">Utilisez cette fonction pour modifier le mot de passe de connexion de l&apos;entreprise. Vous devrez vous reconnecter après la modification.</p>
        <button 
            className="btn btn-warning w-100"
            onClick={() => setShowPasswordModal(true)}
        >
            <i className="bi bi-key-fill me-1"></i> Modifier mon mot de passe
        </button>
      </div>
  );


  // -------------------- Rendus UI Principaux --------------------

function renderHome() {
    // ... (Reste inchangé) ...
  return (
    <div className="d-flex align-items-center justify-content-center vh-100 p-4 landing-container">
      <div className="text-center p-4" style={{maxWidth: '900px'}}>
        <img src={ALL_MANAGE_LOGO_BASE64} alt="Logo All Manage" style={{maxHeight: '100px'}} className="mb-4 shadow-lg rounded-circle"/>
        
        <h1 className="display-5 display-md-3 fw-bolder mb-3 text-dark"> 
          ALL MANAGE
        </h1>
        
        <p className="lead d-none d-sm-block mb-5 text-gray"> 
          Votre plateforme de gestion intégrée, souple et percutante.
        </p>
        <p className="d-sm-none mb-5 text-gray small"> 
          Votre plateforme de gestion intégrée, souple et percutante.
        </p>
        
        <div className="row g-4 justify-content-center">
          
          {/* Carte Entreprise */}
          <div className="col-lg-6 col-12"> 
            <a href="#" onClick={() => setMode('companyAuth')} className="text-decoration-none d-block">
              <div className="card landing-card bg-white text-dark p-4 h-100 card-hover-animation">
                <div className="card-body">
                  <i className="bi bi-building landing-icon text-primary"></i>
                  <h3 className="fw-bold mb-1">Espace **Entreprise**</h3>
                  <p className="text-muted small">Gestion des boutiques, analyse globale, audit et reporting.</p>
                  <button className="btn w-100 mt-2 btn-primary">Accéder</button>
                </div>
              </div>
            </a>
          </div>

          {/* Carte Gérant */}
          <div className="col-lg-6 col-12"> 
            <a href="#" onClick={() => setMode('managerAuth')} className="text-decoration-none d-block">
              <div className="card landing-card bg-white text-dark p-4 h-100 card-hover-animation">
                <div className="card-body">
                  <i className="bi bi-person-workspace landing-icon" style={{color: 'var(--secondary)'}}></i>
                  <h3 className="fw-bold mb-1">Espace **Gérant**</h3>
                  <p className="text-muted small">Opérations quotidiennes, caisse, ventes, achats et inventaire.</p>
                  <button className="btn w-100 mt-2 btn-success">Accéder</button>
                </div>
              </div>
            </a>
          </div>
          
        </div>
      </div>
    </div>
  );
}
  
  function renderCompanyAuth() {
    // ... (Reste inchangé) ...
    if (company && authToken) { 
      return renderDashboardLayout(true);
    }

    return (
        <div className="d-flex align-items-center justify-content-center vh-100 p-4" 
             style={{background: 'var(--bg-main)'}}>
            
            <div className="card p-5 text-center auth-card" style={{maxWidth: '450px', width: '100%'}}>
                <button className="btn btn-link mb-4 text-start p-0" onClick={() => setMode('home')}>
                    &larr; <span className="text-muted small">Retour à l'Accueil</span>
                </button>
                
                <img src={ALL_MANAGE_LOGO_BASE64} alt="Logo All Manage" style={{maxHeight: '60px'}} className="mb-4 mx-auto"/>
                <h2 className="mb-4 fw-bold" style={{color: 'var(--theme-color)'}}>Espace Entreprise</h2>

                <ul className="nav nav-pills nav-fill mb-4 p-1 rounded-pill bg-light border" style={{backgroundColor: 'var(--gray-light) !important'}}>
                    <li className="nav-item">
                        <button
                            className={`nav-link fw-bold ${companyTab === 'login' ? 'active shadow-sm' : 'text-primary'}`}
                            onClick={() => setCompanyTab('login')}
                            style={companyTab === 'login' ? {backgroundColor: 'var(--theme-color) !important', color: 'white !important'} : {color: 'var(--theme-color)'}}
                        >
                            Connexion
                        </button>
                    </li>
                    <li className="nav-item">
                        <button
                            className={`nav-link fw-bold ${companyTab === 'register' ? 'active shadow-sm' : 'text-primary'}`}
                            onClick={() => setCompanyTab('register')}
                            style={companyTab === 'register' ? {backgroundColor: 'var(--theme-color) !important', color: 'white !important'} : {color: 'var(--theme-color)'}}
                        >
                            Inscription
                        </button>
                    </li>
                </ul>

                {companyTab === 'login' ? (
                    <form onSubmit={handleCompanyLogin}>
                        <div className="form-floating mb-3">
                            <input name="email" type="email" className="form-control" placeholder="Email" required />
                            <label>Email</label>
                        </div>
                        <div className="form-floating mb-3">
                            <input name="password" type="password" className="form-control" placeholder="Mot de passe" required />
                            <label>Mot de passe</label>
                        </div>
                        <button className="btn btn-primary w-100 mt-3" style={{backgroundColor: 'var(--theme-color)'}}>
                            <i className="bi bi-box-arrow-in-right me-2"></i> Se connecter
                        </button>
                    </form>
                ) : (
                    <form onSubmit={handleCompanyRegister}>
                        <div className="form-floating mb-3">
                            <input name="name" className="form-control" placeholder="Nom de l'entreprise" required />
                            <label>Nom de l&apos;entreprise</label>
                        </div>
                        <div className="form-floating mb-3">
                            <input name="email" type="email" className="form-control" placeholder="Email" required />
                            <label>Email</label>
                        </div>
                        <div className="mb-3 text-start"> 
                            <input 
                              name="companyPhone" 
                              className="form-control" 
                              placeholder="Téléphones de l'entreprise (Ex: 97000000, 96000000)"
                            />
                            <div className="form-text small" style={{color: 'var(--text-secondary)'}}>Numéros pour la facture (séparés par une virgule)</div>
                        </div>
                        <div className="form-floating mb-3">
                            <input name="password" type="password" className="form-control" placeholder="Mot de passe" required />
                            <label>Mot de passe</label>
                        </div>
                        <div className="form-floating mb-4">
                            <input name="confirmPassword" type="password" className="form-control" placeholder="Confirmer le mot de passe" required />
                            <label>Confirmer</label>
                        </div>
                        <button className="btn btn-primary w-100 mt-3" style={{backgroundColor: 'var(--theme-color)'}}>
                            <i className="bi bi-person-plus-fill me-2"></i> Créer mon compte
                        </button>
                    </form>
                )}
            </div>
        </div>
    );
  }

  function renderManagerAuth() {
    // ... (Reste inchangé) ...
    if (boutique && authToken) {
        if (isLoadingManagerData || summary === null) {
            return (
              <div className="container-fluid vh-100 d-flex justify-content-center align-items-center"
                   style={{background: 'var(--bg-main)'}}>
                <div className="text-center p-5 rounded shadow-lg" style={{backgroundColor: 'var(--bg-card)'}}>
                  <div className="spinner-border" style={{color: 'var(--theme-color)'}} role="status">
                    <span className="visually-hidden">Chargement...</span>
                  </div>
                  <p className="mt-3 fs-5" style={{color: 'var(--theme-color)'}}>Chargement des données de la boutique...</p>
                </div>
              </div>
            );
        }
      return renderDashboardLayout(false);
    }
    
    return (
      <div className="d-flex align-items-center justify-content-center vh-100 p-4"
           style={{background: 'var(--bg-main)'}}>
        
        <div className="card p-5 text-center auth-card" style={{maxWidth: '450px', width: '100%'}}>
            <button className="btn btn-link mb-4 text-start p-0" onClick={() => setMode('home')}>
                &larr; <span className="text-muted small">Retour à l'Accueil</span>
            </button>
            
            <img src={ALL_MANAGE_LOGO_BASE64} alt="Logo All Manage" style={{maxHeight: '60px'}} className="mb-4 mx-auto"/>
            <h2 className="mb-4 fw-bold" style={{color: 'var(--theme-color)'}}>Espace Gérant</h2>
            
            <form onSubmit={handleManagerLogin}>
              <div className="form-floating mb-3">
                <input
                  name="boutiqueName"
                  className="form-control"
                  placeholder="Nom de la boutique"
                  required
                />
                <label>Nom de la boutique</label>
              </div>
              <div className="form-floating mb-4">
                <input
                  name="password"
                  type="password"
                  className="form-control"
                  placeholder="Mot de passe gérant"
                  required
                />
                <label>Mot de passe gérant</label>
              </div>
              <button className="btn w-100 mt-3 text-white" style={{backgroundColor: 'var(--theme-color)'}}>
                <i className="bi bi-box-arrow-in-right me-2"></i> Se connecter
              </button>
            </form>
        </div>
      </div>
    );
  }

  // MISE À JOUR : Gestion du layout et de la responsivité
  const renderDashboardLayout = (isCompany) => {
    const currentBoutique = boutiques.find(b => b.id === selectedBoutiqueId);
    const dashboardTitle = isCompany ? `Dashboard ${company.name}` : `Dashboard ${boutique.name}`;
    
    const isSidebarFullyOpen = isSidebarOpen;

    const headerStyle = {
        zIndex: 1020, 
        position: 'fixed', 
        top: 0, 
        left: isSidebarFullyOpen ? SIDEBAR_WIDTH : '0', 
        width: isSidebarFullyOpen ? `calc(100% - ${SIDEBAR_WIDTH})` : '100%',
        transition: 'left 0.3s ease, width 0.3s ease',
        height: '68px',
    };
    
    const mainContentStyle = {
        paddingTop: '68px', 
        marginLeft: isSidebarFullyOpen ? SIDEBAR_WIDTH : '0',
        width: isSidebarFullyOpen ? `calc(100% - ${SIDEBAR_WIDTH})` : '100%',
        transition: 'margin-left 0.3s ease, width 0.3s ease',
        minHeight: '100vh',
    };

    return (
        <div className="d-flex" style={{ minHeight: '100vh', position: 'relative' }}>
            {/* Rendu des Modales de Données */}
            {renderBoutiqueModificationModal()}
            {renderCbModificationModal()}
            {renderProductModificationModal()}
            {renderClientModificationModal()}
            {renderSaleModificationModal()}
            
            {/* Rendu des Modales de Sécurité/Auth */}
            {showAuthModal && authCredentials && (
                <AuthDownloadModal 
                    show={showAuthModal}
                    handleClose={() => setShowAuthModal(false)}
                    title={`Identifiants de Connexion ${authCredentials.type === 'company' ? 'Entreprise' : 'Gérant'}`}
                    credentials={authCredentials}
                    onDownload={downloadCredentials}
                />
            )}
            {showPasswordModal && (
                <PasswordChangeModal 
                    show={showPasswordModal}
                    handleClose={() => setShowPasswordModal(false)}
                    handleChangePassword={handleChangeCompanyPassword}
                />
            )}
            
            {/* Overlay pour le mobile quand la sidebar est ouverte */}
            {isSidebarOpen && window.innerWidth < 768 && (
                <div className="d-md-none position-fixed w-100 h-100 bg-dark bg-opacity-75" 
                    onClick={toggleSidebar} 
                    style={{zIndex: 1030}}>
                </div>
            )}

            {/* SIDEBAR */}
            <Sidebar 
                mode={isCompany ? 'companyDashboard' : 'managerDashboard'}
                setMode={setMode}
                currentTab={isCompany ? currentCompanyTab : currentManagerTab}
                setCurrentTab={isCompany ? setCurrentCompanyTab : setCurrentManagerTab}
                setCompany={setCompany}
                setManager={setManager}
                setBoutique={setBoutique}
                userName={isCompany ? company?.name : manager?.name}
                boutiqueName={!isCompany ? boutique?.name : ''}
                isSidebarOpen={isSidebarOpen}
                toggleSidebar={toggleSidebar}
                setAuthToken={setAuthToken} 
            />

            {/* TOP HEADER / NAVBAR (Nouvelles classes CSS) */}
            <header className="navbar navbar-expand-md shadow-sm p-3 top-navbar" 
                    style={headerStyle}
            >
                <div className="d-flex w-100 align-items-center">
                    
                    {/* Toggle Button for Mobile AND Desktop */}
                    <button 
                        className="btn btn-sm me-3" 
                        type="button" 
                        onClick={toggleSidebar}
                        style={{backgroundColor: 'var(--gray-light)', color: 'var(--text-main)'}}
                    >
                        <i className={`bi ${isSidebarOpen ? 'bi-x-lg' : 'bi-list'}`}></i>
                    </button>
                    
                    <h1 className="h5 mb-0 fw-bold" style={{color: 'var(--text-main)'}}>
                        <span className="text-secondary">{isCompany ? 'ENTREPRISE' : 'GÉRANT'} / </span> 
                        {dashboardTitle}
                    </h1>
                    
                    {/* Bouton pour ouvrir la sélection de thème (dans le Header) */}
                    <button 
                        className="btn btn-sm ms-auto d-flex align-items-center"
                        onClick={() => {
                            if (isCompany) {
                                setCurrentCompanyTab('theme-settings');
                            } else {
                                setCurrentManagerTab('theme-settings'); 
                            }
                        }}
                        style={{ color: 'var(--theme-color)', borderColor: 'var(--border-light)' }}
                        title="Paramètres de Thème"
                    >
                        <i className="bi bi-palette-fill me-1"></i> Thème
                    </button>
                </div>
            </header>

            {/* MAIN CONTENT */}
            <div className={`flex-grow-1 main-content ${isSidebarOpen && window.innerWidth < 768 ? 'blurred' : ''}`} style={mainContentStyle}> 
                <main className={`px-md-4 py-4 min-vh-100`}>
                    {renderDashboardContent(isCompany)}
                </main>
            </div>
        </div>
    );
  };
  
  // MISE À JOUR: Ajout de la nouvelle section Thème pour le gérant aussi
  const renderDashboardContent = (isCompany) => {
    const currentTab = isCompany ? currentCompanyTab : currentManagerTab;

    if (isCompany) {
        const currentBoutique = boutiques.find(b => b.id === selectedBoutiqueId);
        if (currentTab === 'dashboard') return renderCompanyAnalysis(selectedBoutiqueSummary, true, currentBoutique);
        if (currentTab === 'management') return renderBoutiqueManagement();
        if (currentTab === 'theme-settings') return (
            <>
                {renderThemeSelector()}
                {renderCompanyPasswordChange()}
            </>
        );
        return null;
    } else {
        if (currentTab === 'dashboard') return renderManagerAnalysis(summary);
        if (currentTab === 'sales') return renderSalesSection();
        if (currentTab === 'cashbook') return renderCashbookSection();
        if (currentTab === 'bank-purchase') return renderBankPurchaseSection();
        if (currentTab === 'products') return renderProductsClientsSection();
        if (currentTab === 'audit') return renderAuditSection();
        if (currentTab === 'theme-settings') return renderThemeSelector(); // NOUVEAU pour Gérant
        return null;
    }
  };


  // --- RENDUS DES SECTIONS DU DASHBOARD (Cartes animées et stylées) ---

  const renderSummaryCards = (sum) => (
      <>
        {/* Ligne 1 : Résultat global et trésorerie - Cartes plus stylées */}
        <div className="row g-4 mb-4">
            {/* Résultat Global */}
            <div className="col-lg-3 col-md-6 col-12">
                <div className="card text-white shadow-lg border-0 h-100 card-hover-animation" style={{background: 'var(--theme-gradient)'}}>
                    <div className="card-body">
                        <div className="d-flex justify-content-between align-items-center">
                            <div>
                                <h6 className="text-uppercase small stat-card-title text-white">Résultat Global (Net)</h6>
                                <h2 className={'fw-bolder stat-card-value ' + (sum.globalResult < 0 ? 'text-danger bg-white p-1 rounded-pill px-3' : 'text-white')}>
                                    {Math.abs(sum.globalResult).toFixed(2)} FCFA
                                </h2>
                            </div>
                            <i className="bi bi-graph-up-arrow fs-1 opacity-50"></i>
                        </div>
                    </div>
                </div>
            </div>
            
            {/* Solde Trésorerie (CORRIGÉ: Solde Caisse/Trés. Tot. selon la nouvelle formule) */}
            <div className="col-lg-3 col-md-6 col-12">
                <div className="card text-dark shadow-lg border-0 h-100 card-hover-animation" style={{background: 'var(--gradient-success)'}}>
                    <div className="card-body">
                        <div className="d-flex justify-content-between align-items-center">
                            <div>
                                <h6 className="text-uppercase small stat-card-title text-dark">Solde Trésorerie (Tot.)</h6>
                                <h2 className="fw-bolder stat-card-value text-dark">
                                    {sum.cashResult.toFixed(2)} FCFA
                                </h2>
                            </div>
                            <i className="bi bi-wallet2 fs-1 opacity-50"></i>
                        </div>
                    </div>
                </div>
            </div>
            
            {/* Total Ventes (CA) */}
            <div className="col-lg-3 col-md-6 col-12">
                <div className="card text-white shadow-lg border-0 h-100 card-hover-animation" style={{background: 'var(--gradient-info)'}}>
                    <div className="card-body">
                        <div className="d-flex justify-content-between align-items-center">
                            <div>
                                <h6 className="text-uppercase small stat-card-title text-white">Total Ventes (CA)</h6>
                                <h2 className="fw-bolder stat-card-value text-white">
                                    {sum.totalSales.toFixed(2)} FCFA
                                </h2>
                            </div>
                            <i className="bi bi-bag-check-fill fs-1 opacity-50"></i>
                        </div>
                    </div>
                </div>
            </div>
            
            {/* Dettes Clients */}
             <div className="col-lg-3 col-md-6 col-12">
                <div className="card text-white shadow-lg border-0 h-100 card-hover-animation" style={{background: 'var(--gradient-danger)'}}>
                    <div className="card-body">
                        <div className="d-flex justify-content-between align-items-center">
                            <div>
                                <h6 className="text-uppercase small stat-card-title text-white">Dettes Clients</h6>
                                <h2 className="fw-bolder stat-card-value text-white">
                                    {sum.clientDebt.toFixed(2)} FCFA
                                </h2>
                            </div>
                            <i className="bi bi-person-lines-fill fs-1 opacity-50"></i>
                        </div>
                    </div>
                </div>
            </div>
        </div>
        
        {/* Ligne 2 : Détails des soldes (Plus petits) */}
        <div className="row g-4 mb-4">
            <div className="col-lg-3 col-md-6 col-12">
                <div className="card h-100 border-start border-4 card-hover-animation" style={{borderColor: 'var(--theme-success)', backgroundColor: 'var(--bg-card)'}}>
                    <div className="card-body">
                        <h6 className="text-muted small mb-1" style={{color: 'var(--text-secondary)'}}>Solde Caisse</h6>
                        <h4 className={'fw-bold ' + (sum.cashBalance < 0 ? 'text-danger' : 'text-success')}>
                            {sum.cashBalance.toFixed(2)} FCFA
                        </h4>
                    </div>
                </div>
            </div>
            <div className="col-lg-3 col-md-6 col-12">
                <div className="card h-100 border-start border-4 card-hover-animation" style={{borderColor: 'var(--theme-color)', backgroundColor: 'var(--bg-card)'}}>
                    <div className="card-body">
                        <h6 className="text-muted small mb-1" style={{color: 'var(--text-secondary)'}}>Solde Banque</h6>
                        <h4 className={'fw-bold ' + (sum.bankBalance < 0 ? 'text-danger' : 'text-success')}>
                            {sum.bankBalance.toFixed(2)} FCFA
                        </h4>
                    </div>
                </div>
            </div>
            <div className="col-lg-3 col-md-6 col-12">
                <div className="card h-100 border-start border-4 card-hover-animation" style={{borderColor: 'var(--danger)', backgroundColor: 'var(--bg-card)'}}>
                    <div className="card-body">
                        <h6 className="text-muted small mb-1" style={{color: 'var(--text-secondary)'}}>Achats Stock (Coût)</h6>
                        <h4 className="fw-bold text-danger">
                            {sum.totalPurchases.toFixed(2)} FCFA
                        </h4>
                    </div>
                </div>
            </div>
             <div className="col-lg-3 col-md-6 col-12">
                <div className="card h-100 border-start border-4 card-hover-animation" style={{borderColor: 'var(--warning)', backgroundColor: 'var(--bg-card)'}}>
                    <div className="card-body">
                        <h6 className="text-muted small mb-1" style={{color: 'var(--text-secondary)'}}>Dépenses Caisse (Sorties)</h6>
                        <h4 className="fw-bold text-warning">
                            {sum.totalOutCaisse.toFixed(2)} FCFA {/* Affiche la sortie caisse seulement, car Achats Stock est séparé */}
                        </h4>
                    </div>
                </div>
            </div>
        </div>
      </>
  );

  // MISE À JOUR : Ajout du graphique d'achats
  const renderAnalysisSection = (currentSummary, isCompany, currentBoutique = null) => {
    // ... (Reste inchangé) ...
    if (!currentSummary) {
        if (!isCompany || (isCompany && selectedBoutiqueId)) {
            return (
                <div className="text-center p-5 rounded shadow-sm" style={{backgroundColor: 'var(--bg-card)'}}>
                    <div className="spinner-border" style={{color: 'var(--theme-color)'}} role="status"></div>
                    <p className="mt-2" style={{color: 'var(--text-main)'}}>Chargement des données de la boutique pour la période...</p>
                </div>
            );
        }
        return <div className="alert alert-info">Sélectionnez une boutique pour afficher l&apos;analyse.</div>;
      }
      
      return (
          <>
              <h3 className="mb-4 text-secondary" style={{color: 'var(--text-main)'}}>📊 Analyse Périodique {currentBoutique ? `pour ${currentBoutique.name}` : ''}</h3>
              
              {renderSummaryCards(currentSummary)}
  
              <div className="card p-4 shadow-sm mb-4" style={{backgroundColor: 'var(--bg-card)'}}>
                  <h5 className="mb-3" style={{color: 'var(--theme-color)'}}>⚙️ Période d&apos;Analyse/Export</h5>
                  <div className="row g-3 align-items-end">
                      <div className="col-md-3 col-6">
                          <label className="form-label small" style={{color: 'var(--text-secondary)'}}>Du</label>
                          <input
                              type="date"
                              className="form-control"
                              value={summaryFrom}
                              onChange={e => setSummaryFrom(e.target.value)}
                          />
                      </div>
                      <div className="col-md-3 col-6">
                          <label className="form-label small" style={{color: 'var(--text-secondary)'}}>Au</label>
                          <input
                              type="date"
                              className="form-control"
                              value={summaryTo}
                              onChange={e => setSummaryTo(e.target.value)}
                          />
                      </div>
                      <div className="col-md-2 col-4">
                          <button
                              className="btn btn-primary w-100"
                              onClick={() => loadBoutiqueSummary(isCompany ? selectedBoutiqueId : boutique.id, summaryFrom, summaryTo, isCompany)}
                              disabled={isCompany ? isLoadingCompanyData : isLoadingManagerData}
                              style={{backgroundColor: 'var(--theme-color)'}}
                          >
                              {isCompany ? (isLoadingCompanyData ? 'Chargement...' : 'Actualiser') : (isLoadingManagerData ? 'Chargement...' : 'Actualiser')}
                          </button>
                      </div>
                      <div className="col-md-4 col-8">
                          <button 
                              className="btn btn-outline-secondary w-100"
                              onClick={() => { 
                                  setSummaryFrom(''); 
                                  setSummaryTo(''); 
                                  loadBoutiqueSummary(isCompany ? selectedBoutiqueId : boutique.id, null, null, isCompany); 
                              }}
                          >
                              <i className="bi bi-x-circle me-1"></i> Réinitialiser les dates
                          </button>
                      </div>
                  </div>
              </div>
  
              <div className="row g-4 mb-4">
                {/* Graphique Ventes (Top Produits Vendus) */}
                <div className="col-lg-6 col-12">
                    <div className="card p-4 shadow-sm h-100" style={{backgroundColor: 'var(--bg-card)'}}>
                        <h5 className="mb-3 text-success">📈 Top 5 Produits Vendus (Quantité)</h5>
                        <div className="d-flex gap-2 mb-3">
                            <button
                              className={`btn btn-sm ${analysisType === 'day' && !summaryFrom && !summaryTo ? 'btn-success' : 'btn-outline-success'}`}
                              onClick={() => { setAnalysisType('day'); setSummaryFrom(''); setSummaryTo(''); }}
                              disabled={summaryFrom || summaryTo}
                            >
                              Journalier
                            </button>
                            <button
                              className={`btn btn-sm ${analysisType === 'month' && !summaryFrom && !summaryTo ? 'btn-success' : 'btn-outline-success'}`}
                              onClick={() => { setAnalysisType('month'); setSummaryFrom(''); setSummaryTo(''); }}
                              disabled={summaryFrom || summaryTo}
                            >
                              Mensuel
                            </button>
                            <button
                              className={`btn btn-sm ${analysisType === 'year' && !summaryFrom && !summaryTo ? 'btn-success' : 'btn-outline-success'}`}
                              onClick={() => { setAnalysisType('year'); setSummaryFrom(''); setSummaryTo(''); }}
                              disabled={summaryFrom || summaryTo}
                            >
                              Annuel
                            </button>
                        </div>
  
                        {topSalesProducts.length > 0 ? (
                            <ProductChart 
                              title="Top 5 Produits Vendus (Quantité)" 
                              data={topSalesProducts} 
                              type="sales"
                              chartType={salesChartType}
                              setChartType={setSalesChartType}
                            />
                        ) : (
                            <p className="text-center p-5 small text-muted">Aucune donnée de vente pour cette période/filtre.</p>
                        )}
                    </div>
                </div>
                
                {/* NOUVEAU: Graphique Achats (Top Produits Achetés) */}
                <div className="col-lg-6 col-12">
                    <div className="card p-4 shadow-sm h-100" style={{backgroundColor: 'var(--bg-card)'}}>
                        <h5 className="mb-3 text-danger">🛒 Top 5 Produits Achetés (Quantité)</h5>
                        <div className="d-flex gap-2 mb-3">
                            <button
                              className={`btn btn-sm ${analysisType === 'day' && !summaryFrom && !summaryTo ? 'btn-danger' : 'btn-outline-danger'}`}
                              onClick={() => { setAnalysisType('day'); setSummaryFrom(''); setSummaryTo(''); }}
                              disabled={summaryFrom || summaryTo}
                            >
                              Journalier
                            </button>
                            <button
                              className={`btn btn-sm ${analysisType === 'month' && !summaryFrom && !summaryTo ? 'btn-danger' : 'btn-outline-danger'}`}
                              onClick={() => { setAnalysisType('month'); setSummaryFrom(''); setSummaryTo(''); }}
                              disabled={summaryFrom || summaryTo}
                            >
                              Mensuel
                            </button>
                            <button
                              className={`btn btn-sm ${analysisType === 'year' && !summaryFrom && !summaryTo ? 'btn-danger' : 'btn-outline-danger'}`}
                              onClick={() => { setAnalysisType('year'); setSummaryFrom(''); setSummaryTo(''); }}
                              disabled={summaryFrom || summaryTo}
                            >
                              Annuel
                            </button>
                        </div>
  
                        {topPurchaseProducts.length > 0 ? (
                            <ProductChart 
                              title="Top 5 Produits Achetés (Quantité)" 
                              data={topPurchaseProducts} 
                              type="purchases" 
                              chartType={purchaseChartType}
                              setChartType={setPurchaseChartType}
                            />
                        ) : (
                            <p className="text-center p-5 small text-muted">Aucune donnée d&apos;achat pour cette période/filtre.</p>
                        )}
                    </div>
                </div>
  
              </div>
              
              {/* Analyse par produit (Tableau Marge) */}
              <div className="row g-4 mb-4">
                  <div className="col-12">
                    <div className="card p-4 shadow-sm h-100" style={{backgroundColor: 'var(--bg-card)'}}>
                        <h5 className="mb-3 text-info">📊 Analyse de Marge par Produit</h5>
                        {currentSummary.products && currentSummary.products.length > 0 ? (
                        <div
                            className="table-responsive table-responsive-mobile" 
                            style={{ maxHeight: 400, overflowY: 'auto' }}
                        >
                            <table className="table table-sm table-hover">
                                <thead className="sticky-top bg-light shadow-sm" style={{backgroundColor: 'var(--gray-light) !important'}}>
                                    <tr>
                                        <th>Produit</th>
                                        <th>Qté</th>
                                        <th>CA</th>
                                        <th>Bénéf.</th>
                                        <th>Marge (%)</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {currentSummary.products.map(p => (
                                        <tr key={p.productName} className="small">
                                            <td>{p.productName}</td>
                                            <td>{p.quantity.toFixed(0)}</td>
                                            <td>{p.revenue.toFixed(2)}</td>
                                            <td className={p.profit < 0 ? 'text-danger' : 'text-success'}>
                                                {p.profit.toFixed(2)}
                                            </td>
                                            <td>
                                                {p.revenue > 0 ? ((p.profit / p.revenue) * 100).toFixed(0) : 0}
                                                %
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                        ) : (
                          <p className="text-center p-5 small text-muted">Aucune donnée produit pour l&apos;analyse de marge.</p>
                        )}
                    </div>
                </div>
              </div>
              
               {/* Export CSV (Dédié pour l'analyse) */}
              <div className="card p-4 shadow-sm mb-4" style={{backgroundColor: 'var(--bg-card)'}}>
                  <h5 className="mb-3 text-danger">📁 Export des Données (CSV)</h5>
                  <div className="row g-3 align-items-end">
                      <div className="col-md-3 col-6">
                          <label className="form-label small" style={{color: 'var(--text-secondary)'}}>Du</label>
                          <input
                              type="date"
                              className="form-control"
                              value={exportFrom}
                              onChange={e => setExportFrom(e.target.value)}
                          />
                      </div>
                      <div className="col-md-3 col-6">
                          <label className="form-label small" style={{color: 'var(--text-secondary)'}}>Au</label>
                          <input
                              type="date"
                              className="form-control"
                              value={exportTo}
                              onChange={e => setExportTo(e.target.value)}
                          />
                      </div>
                      <div className="col-md-6 col-12">
                          <div className="d-flex flex-wrap gap-2">
                              <button className="btn btn-outline-primary" onClick={() => downloadCsv('cashbook', isCompany ? selectedBoutiqueId : null)}>
                                  Brouillard
                              </button>
                              <button className="btn btn-outline-info" onClick={() => downloadCsv('bank', isCompany ? selectedBoutiqueId : null)}>
                                  Banque
                              </button>
                              <button className="btn btn-outline-danger" onClick={() => downloadCsv('purchases', isCompany ? selectedBoutiqueId : null)}>
                                  Achats
                              </button>
                              <button className="btn btn-outline-success" onClick={() => downloadCsv('sales', isCompany ? selectedBoutiqueId : null)}>
                                  Ventes
                              </button>
                              <button className="btn btn-outline-warning" onClick={() => downloadCsv('audit', isCompany ? selectedBoutiqueId : null)}>
                                  Historique/Audit
                              </button>
                          </div>
                          <div className="small text-muted mt-2" style={{color: 'var(--text-secondary)'}}>
                              Si aucune date n&apos;est choisie, tout l&apos;historique est exporté.
                          </div>
                      </div>
                  </div>
              </div>
          </>
      );
  };

  const renderCompanyAnalysis = (summary, isCompany, currentBoutique) => {
    // ... (Reste inchangé) ...
    return (
        <>
            <div className="card p-4 shadow-sm mb-4" style={{backgroundColor: 'var(--bg-card)'}}>
                <h4 className="mb-3 text-secondary" style={{color: 'var(--text-main)'}}>Sélectionner une Boutique</h4>
                <div className="row g-3 align-items-center">
                    <div className="col-md-6 col-12">
                        <select
                            className="form-select form-select-lg"
                            value={selectedBoutiqueId}
                            onChange={e => setSelectedBoutiqueId(e.target.value)}
                        >
                            <option value="">-- Choisir la Boutique à Analyser --</option>
                            {boutiques.map(b => (
                                <option key={b.id} value={b.id}>
                                    {b.name} (Gérant : {b.managerName})
                                </option>
                            ))}
                        </select>
                    </div>
                    {selectedBoutiqueId && (
                        <div className="col-md-6 col-12 d-flex flex-wrap justify-content-md-end justify-content-start gap-2">
                            <button 
                                className="btn btn-warning"
                                onClick={() => openModifyBoutiqueModal(currentBoutique)}
                            >
                                <i className="bi bi-pencil-square me-1"></i> Modifier Accès
                            </button>
                            <button 
                                className="btn btn-danger"
                                onClick={() => handleDeleteBoutique(currentBoutique.id)}
                            >
                                <i className="bi bi-trash me-1"></i> Supprimer Boutique
                            </button>
                        </div>
                    )}
                </div>
            </div>
            {selectedBoutiqueId ? renderAnalysisSection(summary, isCompany, currentBoutique) : (
                <div className="alert alert-info text-center p-4">
                    Veuillez sélectionner une boutique ci-dessus pour accéder à son tableau de bord et à son analyse détaillée.
                </div>
            )}
        </>
    );
  };

  const renderBoutiqueManagement = () => {
    // ... (Reste inchangé) ...
    return (
        <div className="card p-4 shadow-sm mb-4" style={{backgroundColor: 'var(--bg-card)'}}>
            <h4 className="mb-3" style={{color: 'var(--theme-color)'}}>➕ Créer une nouvelle boutique</h4>
            <form onSubmit={handleCreateBoutique}>
                <div className="row g-3 mb-3">
                    <div className="col-md-3 col-6">
                        <input name="name" className="form-control" placeholder="Nom de la boutique" required />
                    </div>
                    <div className="col-md-3 col-6">
                        <input name="managerName" className="form-control" placeholder="Nom du gérant" required />
                    </div>
                    <div className="col-md-3 col-6">
                        <input
                            name="managerPassword"
                            type="password"
                            className="form-control"
                            placeholder="Mot de passe gérant"
                            required
                        />
                    </div>
                    <div className="col-md-3 col-6">
                        <input
                            name="initialBankBalance"
                            type="number"
                            step="0.01"
                            className="form-control"
                            placeholder="Solde Banque Init."
                            defaultValue="0.00"
                        />
                    </div>
                </div>
                <div className="row g-3 mb-3 align-items-end">
                    <div className="col-md-6 col-12">
                        <label className="form-label small" style={{color: 'var(--text-secondary)'}}>Logo de la boutique (Upload)</label>
                        <input
                            type="file"
                            name="newBoutiqueLogoFile"
                            className="form-control form-control-sm"
                            accept="image/*"
                            onChange={handleLogoFileUpload}
                        />
                        {logoBase64 && (
                            <div className="mt-1">
                                <img src={logoBase64} alt="Logo Aperçu" style={{ maxHeight: '30px', border: '1px solid var(--border-light)', borderRadius: 'var(--radius-sm)' }} />
                                <span className="small text-success ms-2">Logo prêt à être enregistré.</span>
                            </div>
                        )}
                        <input type="hidden" name="logoBase64" value={logoBase64} />
                    </div>
                    <div className="col-md-6 col-12">
                        <button className="btn btn-success w-100 mt-2" type="submit">
                            <i className="bi bi-plus-circle me-1"></i> Créer la boutique
                        </button>
                    </div>
                </div>
            </form>

            <h4 className="mb-3 mt-5 text-secondary" style={{color: 'var(--text-main)'}}>Liste des Boutiques Enregistrées</h4>
            {boutiques.length === 0 ? (
                <div className="alert alert-warning">Aucune boutique enregistrée.</div>
            ) : (
                <div className="table-responsive table-responsive-mobile">
                    <table className="table table-striped table-hover align-middle">
                        <thead className="table-dark" style={{backgroundColor: 'var(--gray-light) !important', color: 'var(--text-main) !important'}}>
                            <tr>
                                <th>Nom</th>
                                <th className='d-none d-sm-table-cell'>Gérant</th>
                                <th>Solde Banque Init.</th>
                                <th>Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {boutiques.map(b => (
                                <tr key={b.id}>
                                    <td>{b.name}</td>
                                    <td className='d-none d-sm-table-cell'>{b.managerName}</td>
                                    <td>{b.initialBankBalance.toFixed(2)}</td>
                                    <td style={{ minWidth: 280 }}>
                                        <div className='d-flex flex-wrap gap-1'>
                                            <button 
                                                className="btn btn-sm btn-info"
                                                onClick={() => {setSelectedBoutiqueId(b.id); setCurrentCompanyTab('dashboard');}}
                                            >
                                                <i className="bi bi-bar-chart-line me-1"></i> Anal.
                                            </button>
                                            <button 
                                                className="btn btn-sm btn-warning"
                                                onClick={() => openModifyBoutiqueModal(b)}
                                            >
                                                <i className="bi bi-pencil-square me-1"></i> Modif.
                                            </button>
                                            <button 
                                                className="btn btn-sm btn-info"
                                                onClick={() => handleDownloadManagerCredentials(b)}
                                            >
                                                <i className="bi bi-download me-1"></i> ID Gérant
                                            </button>
                                            <button 
                                                className="btn btn-sm btn-danger"
                                                onClick={() => handleDeleteBoutique(b.id)}
                                            >
                                                <i className="bi bi-trash me-1"></i> Suppr.
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}
        </div>
      );
  };

  const renderManagerAnalysis = (summary) => renderAnalysisSection(summary, false, boutique);

  const renderCashbookSection = () => {
    // ... (Reste inchangé) ...
    return (
        <div className="row g-4">
            <div className="col-lg-5 col-12">
                <div className="card p-4 shadow-sm h-100" style={{backgroundColor: 'var(--bg-card)'}}>
                    <h5 className="mb-3" style={{color: 'var(--theme-color)'}}>➕ Nouvelle Écriture Caisse (Solde: <span className={summary.cashBalance < 0 ? 'text-danger' : 'text-success'}>{summary.cashBalance.toFixed(2)} FCFA</span>)</h5>
                    <form onSubmit={handleAddCashbookEntry} className="row g-3">
                        <div className="col-6">
                            <label className="form-label small" style={{color: 'var(--text-secondary)'}}>Date</label>
                            <input type="date" className="form-control" value={cbDate} onChange={e => setCbDate(e.target.value)} required/>
                        </div>
                        <div className="col-6">
                            <label className="form-label small" style={{color: 'var(--text-secondary)'}}>N° pièce (Optionnel)</label>
                            <input className="form-control" value={cbPiece} onChange={e => setCbPiece(e.target.value)} />
                        </div>
                        <div className="col-12">
                            <label className="form-label small" style={{color: 'var(--text-secondary)'}}>Description</label>
                            <input className="form-control" value={cbDesc} onChange={e => setCbDesc(e.target.value)} required />
                        </div>
                        <div className="col-6">
                            <label className="form-label small" style={{color: 'var(--text-secondary)'}}>Type</label>
                            <select className="form-select" value={cbType} onChange={e => setCbType(e.target.value)}>
                                <option value="in">Entrée (Recette)</option>
                                <option value="out">Sortie (Dépense)</option>
                            </select>
                        </div>
                        <div className="col-6">
                            <label className="form-label small" style={{color: 'var(--text-secondary)'}}>Montant</label>
                            <input type="number" step="0.01" className="form-control" value={cbAmount} onChange={e => setCbAmount(e.target.value)} required />
                        </div>
                        <div className="col-12">
                            <button className="btn btn-primary w-100 mt-2" style={{backgroundColor: 'var(--theme-color)'}}>
                                <i className="bi bi-pencil-fill me-1"></i> Enregistrer l&apos;écriture
                            </button>
                        </div>
                    </form>
                </div>
            </div>
            <div className="col-lg-7 col-12">
                <div className="card p-4 shadow-sm h-100" style={{backgroundColor: 'var(--bg-card)'}}>
                    <h5 className="mb-3 text-secondary" style={{color: 'var(--text-main)'}}>📜 Historique Brouillard de Caisse ({cashbook.length})</h5>
                    <div className="table-responsive table-responsive-mobile" style={{ maxHeight: 450, overflowY: 'auto' }}>
                        <table className="table table-sm table-striped table-hover align-middle">
                            <thead className="sticky-top shadow-sm" style={{backgroundColor: 'var(--gray-light) !important', color: 'var(--text-main) !important'}}>
                                <tr>
                                    <th>Date</th>
                                    <th>Type</th>
                                    <th>Montant</th>
                                    <th className='d-none d-sm-table-cell'>Description</th>
                                    <th>Act.</th>
                                </tr>
                            </thead>
                            <tbody>
                                {cashbook.map(e => (
                                    <tr key={e.id} className="small">
                                        <td>{e.date}</td>
                                        <td className={e.type === 'in' ? 'text-success fw-bold' : 'text-danger fw-bold'}>
                                            {e.type === 'in' ? 'E' : 'S'}
                                        </td>
                                        <td>{e.amount.toFixed(2)}</td>
                                        <td className='d-none d-sm-table-cell'>{e.description}</td>
                                        <td style={{ minWidth: 120 }}>
                                            <button className="btn btn-sm btn-outline-warning me-1" onClick={() => openModifyCbModal(e)}>Modif.</button>
                                            <button className="btn btn-sm btn-outline-danger" onClick={() => deleteCashbookEntry(e.id)}>Suppr.</button>
                                        </td>
                                    </tr>
                                ))}
                                {cashbook.length === 0 && <tr><td colSpan="5" className="text-center text-muted">Aucune écriture enregistrée.</td></tr>}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        </div>
      );
  };

  const renderSalesSection = () => {
    // ... (Reste inchangé) ...
    return (
        <div className="row g-4">
            <div className="col-lg-6 col-12">
                <div className="card p-4 shadow-sm h-100" style={{backgroundColor: 'var(--bg-card)'}}>
                    <h5 className="mb-3 text-success">💰 Enregistrer une Nouvelle Vente</h5>
                    <form onSubmit={handleCreateSale} className="row g-3">
                        <div className="col-md-6">
                            <label className="form-label small" style={{color: 'var(--text-secondary)'}}>Date</label>
                            <input type="date" className="form-control" value={saleDate} onChange={e => setSaleDate(e.target.value)} required />
                        </div>
                        <div className="col-md-6">
                            <label className="form-label small" style={{color: 'var(--text-secondary)'}}>Produit (Texte)</label>
                            <input className="form-control" value={saleProductName} onChange={e => setSaleProductName(e.target.value)} placeholder="Ex: Coca 50cl" required />
                        </div>
                        
                        <div className="col-12">
                            <label className="form-label small" style={{color: 'var(--text-secondary)'}}>Produit Existant</label>
                            <select className="form-select" value={saleProductId} onChange={e => setSaleProductId(e.target.value)}>
                                <option value="">-- Sélectionner pour auto-remplir --</option>
                                {products.map(p => (<option key={p.id} value={p.id}>{p.name} ({p.unitPrice} FCFA)</option>))}
                            </select>
                        </div>
    
                        <div className="col-md-4 col-4">
                            <label className="form-label small" style={{color: 'var(--text-secondary)'}}>Prix unitaire</label>
                            <input type="number" step="0.01" className="form-control" value={saleUnitPrice} onChange={e => setSaleUnitPrice(e.target.value)} required />
                        </div>
                        <div className="col-md-4 col-4">
                            <label className="form-label small" style={{color: 'var(--text-secondary)'}}>Quantité</label>
                            <input type="number" step="0.01" className="form-control" value={saleQuantity} onChange={e => setSaleQuantity(e.target.value)} required />
                        </div>
                        <div className="col-md-4 col-4">
                            <label className="form-label small" style={{color: 'var(--text-secondary)'}}>Montant Payé</label>
                            <input type="number" step="0.01" className="form-control" value={saleAmountPaid} onChange={e => setSaleAmountPaid(e.target.value)} required />
                        </div>
                        
                        <div className="col-md-6">
                            <label className="form-label small" style={{color: 'var(--text-secondary)'}}>Client Existant</label>
                            <select className="form-select" value={saleClientId} onChange={e => { setSaleClientId(e.target.value); if (e.target.value) setSaleClientName(''); }}>
                                <option value="">-- Client comptoir / Nouveau --</option>
                                {clients.map(c => (<option key={c.id} value={c.id}>{c.name}</option>))}
                            </select>
                        </div>
                        <div className="col-md-6">
                            <label className="form-label small" style={{color: 'var(--text-secondary)'}}>Nom Nouveau Client</label>
                            <input className="form-control" value={saleClientName} onChange={e => { setSaleClientName(e.target.value); if (e.target.value) setSaleClientId(''); }} placeholder="Laisser vide si client existant" />
                        </div>
    
                        <div className="col-md-6">
                            <label className="form-label small" style={{color: 'var(--text-secondary)'}}>N° Table (Optionnel)</label>
                            <input className="form-control" value={saleTableNumber} onChange={e => setSaleTableNumber(e.target.value)} />
                        </div>
                        <div className="col-md-6">
                            <label className="form-label small" style={{color: 'var(--text-secondary)'}}>Serveur (Optionnel)</label>
                            <input className="form-control" value={saleServerName} onChange={e => setSaleServerName(e.target.value)} />
                        </div>
    
                        <div className="col-12">
                            <button className="btn btn-success w-100 mt-2" type="submit">
                                <i className="bi bi-check-circle-fill me-1"></i> Valider la Vente
                            </button>
                        </div>
                    </form>
                </div>
            </div>
    
            <div className="col-lg-6 col-12">
                <div className="card p-4 shadow-sm h-100" style={{backgroundColor: 'var(--bg-card)'}}>
                    <h5 className="mb-3 text-info">🧾 Aperçu Facture / Ticket</h5>
                    {invoiceSale && (
                        <div className="border rounded p-3 bg-light h-100 d-flex flex-column justify-content-between" style={{backgroundColor: 'var(--gray-light) !important'}}>
                            <div>
                                <div className="d-flex justify-content-between align-items-center">
                                    <div>
                                        {boutique.logoBase64 && <img src={boutique.logoBase64} alt="Logo" style={{ maxHeight: '40px' }} className="mb-1" />}
                                        <div className="fw-bold" style={{color: 'var(--text-main)'}}>{boutique.name}</div>
                                        <div className="small text-muted">Tél: {company.companyPhone || 'N/A'}</div>
                                    </div>
                                    <div className="text-end">
                                        <div className="small text-muted">Facture N°</div>
                                        <div className="fw-bold text-primary" style={{color: 'var(--theme-color) !important'}}>{invoiceSale.invoiceNumber}</div>
                                        <div className="small text-muted">Date : {invoiceSale.date}</div>
                                    </div>
                                </div>
                                <hr className="my-2" style={{borderColor: 'var(--border-light)'}}/>
                                <div className="small mb-2" style={{color: 'var(--text-main)'}}>
                                    <strong>Client :</strong> {invoiceSale.clientName || 'Client comptoir'}
                                    {invoiceSale.tableNumber && <span> | Table : {invoiceSale.tableNumber}</span>}
                                    {invoiceSale.serverName && <span> | Serveur : {invoiceSale.serverName}</span>}
                                </div>
                                <table className="table table-sm small">
                                    <thead style={{backgroundColor: 'var(--gray-light)'}}><tr><th>Qté</th><th>Désignation</th><th>P.U.</th><th>Montant</th></tr></thead>
                                    <tbody>
                                        <tr style={{color: 'var(--text-main)'}}>
                                            <td>{invoiceSale.quantity}</td>
                                            <td>{invoiceSale.productName}</td>
                                            <td>{invoiceSale.unitPrice.toFixed(2)}</td>
                                            <td>{saleTotal(invoiceSale).toFixed(2)}</td>
                                        </tr>
                                    </tbody>
                                </table>
                                <div className="d-flex justify-content-between align-items-center mt-3 p-2 rounded shadow-sm" style={{backgroundColor: 'var(--bg-card)'}}>
                                    <div>
                                        <div className="small text-muted">Total Dû</div>
                                        <h5 className="fw-bold text-success">{saleTotal(invoiceSale).toFixed(2)} FCFA</h5>
                                    </div>
                                    <div className="text-end">
                                        <div className="small text-muted">Reste à payer</div>
                                        <h5 className={'fw-bold ' + (saleResteAPayer(invoiceSale) > 0 ? 'text-danger' : 'text-success')}>
                                            {saleResteAPayer(invoiceSale).toFixed(2)} FCFA
                                        </h5>
                                    </div>
                                </div>
                            </div>
                            <div className="mt-3 d-flex justify-content-end gap-2">
                                <button className="btn btn-outline-secondary btn-sm" type="button" onClick={() => setInvoiceSale(null)}>Fermer</button>
                                <button
                                    className="btn btn-primary btn-sm"
                                    type="button"
                                    onClick={() => handlePrintInvoice(invoiceSale, boutique, company)}
                                    style={{backgroundColor: 'var(--theme-color)'}}
                                >
                                    <i className="bi bi-printer me-1"></i> Imprimer / PDF
                                </button>
                            </div>
                        </div>
                    )}
                    {!invoiceSale && <div className="alert alert-light text-center p-5" style={{backgroundColor: 'var(--gray-light)', color: 'var(--text-secondary)'}}>La facture de la dernière vente s&apos;affichera ici.</div>}
                </div>
            </div>
    
            <div className="col-12 mt-4">
                <div className="card p-4 shadow-sm" style={{backgroundColor: 'var(--bg-card)'}}>
                    <h5 className="mb-3 text-secondary" style={{color: 'var(--text-main)'}}>📜 Historique des Ventes Récents ({sales.length})</h5>
                    <div className="table-responsive table-responsive-mobile" style={{ maxHeight: 400, overflowY: 'auto' }}>
                        <table className="table table-sm table-striped table-hover align-middle">
                            <thead className="sticky-top shadow-sm" style={{backgroundColor: 'var(--gray-light) !important', color: 'var(--text-main) !important'}}>
                                <tr>
                                    <th>Date</th>
                                    <th className='d-none d-sm-table-cell'>Client</th>
                                    <th>Produit</th>
                                    <th>Total</th>
                                    <th>Payé</th>
                                    <th>Reste</th>
                                    <th>Act.</th>
                                </tr>
                            </thead>
                            <tbody>
                                {sales.map(s => (
                                    <tr key={s.id} className="small">
                                        <td>{s.date}</td>
                                        <td className='d-none d-sm-table-cell'>{s.clientName || '-'}</td>
                                        <td>{s.productName}</td>
                                        <td>{saleTotal(s).toFixed(2)}</td>
                                        <td>{s.amountPaid.toFixed(2)}</td>
                                        <td className={saleResteAPayer(s) > 0 ? 'text-danger fw-bold' : ''}>
                                            {saleResteAPayer(s).toFixed(2)}
                                        </td>
                                        <td style={{ minWidth: 200 }}>
                                            <div className="d-flex flex-wrap gap-1">
                                                <button className="btn btn-sm btn-outline-secondary" onClick={() => setInvoiceSale(s)}>Facture</button>
                                                <button className="btn btn-sm btn-outline-warning" onClick={() => openModifySaleModal(s)}>Modif.</button>
                                                <button className="btn btn-sm btn-outline-primary" onClick={() => updateSaleWithReason(s.id, { amountPaid: saleTotal(s) }, 'mise à jour paiement (soldé)')} disabled={saleResteAPayer(s) <= 0}>Soldé</button>
                                                <button className="btn btn-sm btn-outline-danger" onClick={() => deleteSale(s.id)}>Suppr.</button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                                {sales.length === 0 && <tr><td colSpan="7" className="text-center text-muted">Aucune vente enregistrée.</td></tr>}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        </div>
      );
  };

  const renderBankPurchaseSection = () => {
    // ... (Reste inchangé) ...
    return (
        <div className="row g-4">
            {/* Section Achats */}
            <div className="col-lg-6 col-12">
                <div className="card p-4 shadow-sm h-100" style={{backgroundColor: 'var(--bg-card)'}}>
                    <h5 className="mb-3 text-danger">🛒 Enregistrer un Achat de Stock (Coût)</h5>
                    <form onSubmit={handleAddPurchase} className="row g-3 mb-4">
                        <div className="col-12">
                            <input
                                type="date"
                                className="form-control"
                                value={purchaseDate}
                                onChange={e => setPurchaseDate(e.target.value)}
                                required
                            />
                        </div>
                        <div className="col-md-6 col-12">
                            <input
                                className="form-control"
                                placeholder="NOM PRODUIT"
                                value={purchaseProductName}
                                onChange={e => setPurchaseProductName(e.target.value.toUpperCase().replace(/[^A-Z\s]/g, ''))}
                                required
                            />
                            <div className="form-text small text-danger">Majuscules et espaces uniquement.</div>
                        </div>
                        <div className="col-md-3 col-6">
                            <input
                                type="number" step="0.01"
                                className="form-control"
                                placeholder="Prix Unit."
                                value={purchaseUnitPrice}
                                onChange={e => setPurchaseUnitPrice(e.target.value)}
                                required
                            />
                        </div>
                        <div className="col-md-3 col-6">
                            <input
                                type="number" step="0.01"
                                className="form-control"
                                placeholder="Qté"
                                value={purchaseQuantity}
                                onChange={e => setPurchaseQuantity(e.target.value)}
                                required
                            />
                        </div>
                        <div className="col-12">
                            <button className="btn btn-danger w-100 mt-2" type="submit">
                                <i className="bi bi-cart-dash-fill me-1"></i> Ajouter Achat
                            </button>
                        </div>
                    </form>
                    <h6 className="mb-3 text-muted" style={{color: 'var(--text-secondary)'}}>Historique Achats Récents ({purchases.length})</h6>
                    <div className="table-responsive" style={{ maxHeight: 180, overflowY: 'auto' }}>
                        <table className="table table-sm table-striped small">
                            <thead style={{backgroundColor: 'var(--gray-light) !important', color: 'var(--text-main) !important'}}><tr><th>Date</th><th>Produit</th><th>Qté</th><th>Total</th></tr></thead>
                            <tbody>
                                {purchases.map(p => (<tr key={p.id}><td style={{color: 'var(--text-main)'}}>{p.date}</td><td style={{color: 'var(--text-main)'}}>{p.productName}</td><td style={{color: 'var(--text-main)'}}>{p.quantity.toFixed(0)}</td><td style={{color: 'var(--text-main)'}}>{(p.unitPrice * p.quantity).toFixed(2)}</td></tr>))}
                                {purchases.length === 0 && <tr><td colSpan="4" className="text-center text-muted">Aucun achat enregistré.</td></tr>}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
    
            {/* Section Banque */}
            <div className="col-lg-6 col-12">
                <div className="card p-4 shadow-sm h-100" style={{backgroundColor: 'var(--bg-card)'}}>
                    <h5 className="mb-3 text-info">🏦 Nouvelle Écriture Banque (Solde: <span className={summary.bankBalance < 0 ? 'text-danger' : 'text-success'}>{summary.bankBalance.toFixed(2)} FCFA</span>)</h5>
                    <form onSubmit={handleAddBankEntry} className="row g-3 mb-4">
                        <div className="col-6">
                            <label className="form-label small" style={{color: 'var(--text-secondary)'}}>Date</label>
                            <input type="date" className="form-control" value={bankDate} onChange={e => setBankDate(e.target.value)} required />
                        </div>
                        <div className="col-6">
                            <label className="form-label small" style={{color: 'var(--text-secondary)'}}>Type & Montant</label>
                            <div className="input-group">
                                <select className="form-select" style={{maxWidth: '100px'}} value={bankType} onChange={e => setBankType(e.target.value)}>
                                    <option value="credit">Entrée</option>
                                    <option value="debit">Sortie</option>
                                </select>
                                <input type="number" step="0.01" className="form-control" placeholder="Montant" value={bankAmount} onChange={e => setBankAmount(e.target.value)} required />
                            </div>
                        </div>
                        <div className="col-md-6">
                            <label className="form-label small" style={{color: 'var(--text-secondary)'}}>Description</label>
                            <input className="form-control" placeholder="Description" value={bankDesc} onChange={e => setBankDesc(e.target.value)} required />
                        </div>
                        <div className="col-md-6">
                            <label className="form-label small" style={{color: 'var(--text-secondary)'}}>N° Pièce (Optionnel)</label>
                            <input className="form-control" placeholder="N° pièce" value={bankPiece} onChange={e => setBankPiece(e.target.value)} />
                        </div>
                        <div className="col-12">
                            <button className="btn btn-info w-100 mt-2" type="submit">
                                <i className="bi bi-bank me-1"></i> Ajouter Écriture Banque
                            </button>
                        </div>
                    </form>
                    <h6 className="mb-3 text-muted" style={{color: 'var(--text-secondary)'}}>Historique Banque Récents ({bankEntries.length})</h6>
                    <div className="table-responsive" style={{ maxHeight: 180, overflowY: 'auto' }}>
                        <table className="table table-sm table-striped small">
                            <thead style={{backgroundColor: 'var(--gray-light) !important', color: 'var(--text-main) !important'}}><tr><th>Date</th><th>Desc.</th><th>Type</th><th>Montant</th></tr></thead>
                            <tbody>
                                {bankEntries.map(e => (
                                    <tr key={e.id}>
                                        <td style={{color: 'var(--text-main)'}}>{e.date}</td>
                                        <td style={{color: 'var(--text-main)'}}>{e.description}</td>
                                        <td className={e.type === 'debit' ? 'text-danger fw-bold' : 'text-success fw-bold'}>{e.type === 'credit' ? 'Crédit' : 'Débit'}</td>
                                        <td className={e.type === 'debit' ? 'text-danger' : 'text-success'}>{e.amount.toFixed(2)}</td>
                                    </tr>
                                ))}
                                {bankEntries.length === 0 && <tr><td colSpan="4" className="text-center text-muted">Aucune écriture banque.</td></tr>}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        </div>
      );
  };

  const renderProductsClientsSection = () => {
    // ... (Reste inchangé) ...
    return (
        <div className="row g-4">
            {/* Section Produits */}
            <div className="col-lg-6 col-12">
                <div className="card p-4 shadow-sm h-100" style={{backgroundColor: 'var(--bg-card)'}}>
                    <h5 className="mb-3" style={{color: 'var(--theme-color)'}}>📦 Gestion des Produits ({products.length})</h5>
                    <form onSubmit={handleAddProduct} className="row g-3 mb-4">
                        <div className="col-12">
                            <label className="form-label small" style={{color: 'var(--text-secondary)'}}>Nom du produit</label>
                            <input className="form-control" placeholder="Nom produit" value={newProductName} onChange={e => setNewProductName(e.target.value)} required />
                        </div>
                        <div className="col-md-6 col-6">
                            <label className="form-label small" style={{color: 'var(--text-secondary)'}}>Prix unitaire (Vente)</label>
                            <input type="number" step="0.01" className="form-control" placeholder="Prix unitaire" value={newProductUnitPrice} onChange={e => setNewProductUnitPrice(e.target.value)} required />
                        </div>
                        <div className="col-md-6 col-6">
                            <label className="form-label small" style={{color: 'var(--text-secondary)'}}>Coût d&apos;achat</label>
                            <input type="number" step="0.01" className="form-control" placeholder="Coût d'achat (optionnel)" value={newProductCostPrice} onChange={e => setNewProductCostPrice(e.target.value)} />
                        </div>
                        <div className="col-12">
                            <button className="btn btn-primary w-100 mt-2" style={{backgroundColor: 'var(--theme-color)'}}>
                                <i className="bi bi-plus-circle-fill me-1"></i> Ajouter produit
                            </button>
                        </div>
                    </form>
                    <h6 className="mb-3 text-muted" style={{color: 'var(--text-secondary)'}}>Liste des produits</h6>
                    <div className="table-responsive table-responsive-mobile" style={{ maxHeight: 300, overflowY: 'auto' }}>
                        <table className="table table-sm table-striped small">
                            <thead style={{backgroundColor: 'var(--gray-light) !important', color: 'var(--text-main) !important'}}><tr><th>Nom</th><th className='d-none d-sm-table-cell'>PU</th><th className='d-none d-sm-table-cell'>Coût</th><th>Act.</th></tr></thead>
                            <tbody>
                                {products.map(p => (
                                    <tr key={p.id}>
                                        <td style={{color: 'var(--text-main)'}}>{p.name}</td>
                                        <td className='d-none d-sm-table-cell' style={{color: 'var(--text-main)'}}>{p.unitPrice.toFixed(2)}</td>
                                        <td className='d-none d-sm-table-cell' style={{color: 'var(--text-main)'}}>{p.costPrice.toFixed(2)}</td>
                                        <td style={{ minWidth: 120 }}>
                                            <button className="btn btn-sm btn-outline-warning me-1" onClick={() => openModifyProductModal(p)}>Modif.</button>
                                            <button className="btn btn-sm btn-outline-danger" onClick={() => handleDeleteProduct(p.id)}>Suppr.</button>
                                        </td>
                                    </tr>
                                ))}
                                {products.length === 0 && <tr><td colSpan="4" className="text-center text-muted">Aucun produit.</td></tr>}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
            
            {/* Section Clients */}
            <div className="col-lg-6 col-12">
                <div className="card p-4 shadow-sm h-100" style={{backgroundColor: 'var(--bg-card)'}}>
                    <h5 className="mb-3 text-success">👥 Gestion des Clients ({clients.length})</h5>
                    <form onSubmit={handleAddClient} className="row g-3 mb-4">
                        <div className="col-12">
                            <label className="form-label small" style={{color: 'var(--text-secondary)'}}>Nom du client</label>
                            <div className="input-group">
                                <input className="form-control" placeholder="Nom client" value={newClientName} onChange={e => setNewClientName(e.target.value)} required />
                                <button className="btn btn-success" type="submit">
                                    <i className="bi bi-person-plus-fill"></i> Ajouter
                                </button>
                            </div>
                        </div>
                    </form>
                    <h6 className="mb-3 text-muted" style={{color: 'var(--text-secondary)'}}>Liste des clients</h6>
                    <div className="table-responsive table-responsive-mobile" style={{ maxHeight: 500, overflowY: 'auto' }}>
                        <table className="table table-sm table-striped small">
                            <thead style={{backgroundColor: 'var(--gray-light) !important', color: 'var(--text-main) !important'}}><tr><th>Nom</th><th>Act.</th></tr></thead>
                            <tbody>
                                {clients.map(c => (
                                    <tr key={c.id}>
                                        <td style={{color: 'var(--text-main)'}}>{c.name}</td>
                                        <td style={{ minWidth: 120 }}>
                                            <button className="btn btn-sm btn-outline-warning me-1" onClick={() => openModifyClientModal(c)}>Modif.</button>
                                            <button className="btn btn-sm btn-outline-danger" onClick={() => handleDeleteClient(c.id)}>Suppr.</button>
                                        </td>
                                    </tr>
                                ))}
                                {clients.length === 0 && <tr><td colSpan="2" className="text-center text-muted">Aucun client.</td></tr>}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        </div>
      );
  };

  const renderAuditSection = () => {
    // ... (Reste inchangé) ...
    return (
        <div className="card p-4 shadow-sm" style={{backgroundColor: 'var(--bg-card)'}}>
            <h5 className="mb-3 text-warning">🛡️ Journal d&apos;Audit et Historique des Modifications</h5>
            {isLoadingAuditLogs ? (
                <div className="text-center p-5">
                    <div className="spinner-border text-warning" role="status"></div>
                    <p className="mt-2 text-muted">Chargement des logs d&apos;audit...</p>
                </div>
            ) : (
                <div className="table-responsive table-responsive-mobile" style={{ maxHeight: 600, overflowY: 'auto' }}>
                    <table className="table table-sm table-striped table-hover small">
                        <thead className="sticky-top shadow-sm" style={{backgroundColor: 'var(--gray-light) !important', color: 'var(--text-main) !important'}}>
                            <tr>
                                <th>Date</th>
                                <th>Entité</th>
                                <th>Action</th>
                                <th>Motif / Utilisateur</th>
                            </tr>
                        </thead>
                        <tbody>
                            {auditLogs.map(l => (
                                <tr key={l.id}>
                                    <td style={{color: 'var(--text-main)'}}>{new Date(l.timestamp).toLocaleDateString()}</td>
                                    <td style={{color: 'var(--text-main)'}}>{l.entityType}</td>
                                    <td className={l.action === 'delete' ? 'text-danger' : (l.action === 'update' ? 'text-warning' : 'text-success')}>
                                        {l.action.toUpperCase()}
                                    </td>
                                    <td style={{color: 'var(--text-main)'}}>
                                        {l.reason || '—'}
                                        <br />
                                        <span className="text-muted fst-italic">Par: {l.performedBy?.userName || ''}</span>
                                    </td>
                                </tr>
                            ))}
                            {auditLogs.length === 0 && <tr><td colSpan="4" className="text-center text-muted">Aucun log d&apos;audit trouvé.</td></tr>}
                        </tbody>
                    </table>
                </div>
            )}
        </div>
      );
  };


  // -------------------- Switch principal --------------------

  if (mode === 'home') return renderHome();
  if (mode === 'companyAuth') return renderCompanyAuth();
  if (mode === 'companyDashboard') return renderDashboardLayout(true);
  if (mode === 'managerAuth') return renderManagerAuth();
  if (mode === 'managerDashboard') return renderDashboardLayout(false);

  return renderHome();
}

export default App;