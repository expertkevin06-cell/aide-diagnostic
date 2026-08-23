// ============================================================
// AIDE AU DIAGNOSTIC BY KEVIN v5.0 - PWA OPTIMISÉE
// ============================================================

const firebaseConfig = {
    apiKey: "AIzaSyCwcLLNZDdqzGsSybo7V0holqKfRoB47ag",
    authDomain: "diag-kevin.firebaseapp.com",
    projectId: "diag-kevin",
    storageBucket: "diag-kevin.appspot.com",
    messagingSenderId: "7479720363",
    appId: "1:7479720363:web:05c047578987e9da43baee"
};

let db = null;
try {
    firebase.initializeApp(firebaseConfig);
    db = firebase.firestore();
    console.log("✅ Firebase initialisé");
} catch(e) { console.error("❌ Erreur Firebase:", e); }

const ADMIN_PASSWORD = "Kevin83600";
let currentUser = null, isAdmin = false, currentDiagnostic = null, currentVINRecalls = [];
let deferredPrompt = null;

// ============ GESTION INSTALLATION PWA ============
window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    deferredPrompt = e;
    document.getElementById('installBanner').classList.add('show');
    console.log('✅ PWA installable détectée');
});

async function installPWA() {
    const msg = document.getElementById('installMessage');
    if (deferredPrompt) {
        deferredPrompt.prompt();
        const choice = await deferredPrompt.userChoice;
        msg.textContent = choice.outcome === 'accepted' ? '✅ Application installée !' : '❌ Installation annulée';
        msg.style.color = choice.outcome === 'accepted' ? '#28a745' : '#dc3545';
        deferredPrompt = null;
        document.getElementById('installBanner').classList.remove('show');
    } else {
        const ua = navigator.userAgent;
        if (/iphone|ipad|ipod/i.test(ua)) msg.innerHTML = '📱 iPhone : Bouton Partager → "Sur l\'écran d\'accueil"';
        else if (/android/i.test(ua)) msg.innerHTML = '📱 Android : 3 points ⋮ → "Installer l\'application"';
        else msg.innerHTML = '💻 Ordinateur : Icône 📲 dans la barre d\'adresse';
        msg.style.color = '#ffd700';
    }
}

function dismissInstall() {
    document.getElementById('installBanner').classList.remove('show');
}

// ============ BASE DE DONNÉES MASSIVE ============
const localRecallsDB = [
    { brand: 'Peugeot', model: '208', years: '2012-2026', engine: '1.2 PureTech 82/110/130', issue: '⚠️ COURROIE DISTRIBUTION DANS HUILE', tsb: 'PSA-STELLANTIS-2020-012', category: 'courroie_huile', desc: 'DÉFAUT CRITIQUE : Courroie se désagrège dans l\'huile → colmatage crépine → chute pression huile → rayures cylindres → casse moteur. RAPPEL OFFICIEL. Remplacement tous les 60 000 km. Huile 0W30 C2 OBLIGATOIRE.' },
    { brand: 'Peugeot', model: '2008', years: '2013-2026', engine: '1.2 PureTech 82/110/130', issue: '⚠️ COURROIE DISTRIBUTION DANS HUILE', tsb: 'PSA-STELLANTIS-2020-012', category: 'courroie_huile', desc: 'Même défaut critique que 208.' },
    { brand: 'Peugeot', model: '308', years: '2013-2026', engine: '1.2 PureTech 110/130', issue: '️ COURROIE DISTRIBUTION DANS HUILE', tsb: 'PSA-STELLANTIS-2020-012', category: 'courroie_huile', desc: 'Défaut courroie. Remplacement kit + nettoyage circuit huile + pompe à huile obligatoire.' },
    { brand: 'Peugeot', model: '3008', years: '2016-2026', engine: '1.2 PureTech 130', issue: '⚠️ COURROIE DISTRIBUTION DANS HUILE', tsb: 'PSA-STELLANTIS-2020-012', category: 'courroie_huile', desc: 'Courroie immergée. Désintégration, colmatage crépine, casse moteur.' },
    { brand: 'Peugeot', model: '3008', years: '2017-2026', engine: '1.5/2.0 BlueHDi 130/180', issue: 'Système AdBlue', tsb: 'PSA-2019-033', category: 'adblue', desc: 'Pompe AdBlue HS. Rappel constructeur.' },
    { brand: 'Peugeot', model: '3008', years: '2017-2026', engine: '1.6 Hybrid 225', issue: 'Batterie hybride', tsb: 'PSA-2022-015', category: 'batterie_hv', desc: 'Défaut onduleur haute tension.' },
    { brand: 'Peugeot', model: '508', years: '2018-2026', engine: '1.5/2.0 BlueHDi 130/180', issue: 'Boîte EAT8 à-coups', tsb: 'PSA-2021-008', category: 'boite', desc: 'À-coups à froid, défaut mécatronique.' },
    { brand: 'Peugeot', model: 'e-208', years: '2019-2026', engine: 'Électrique 136 ch', issue: 'Batterie haute tension', tsb: 'PSA-2022-025', category: 'batterie_hv', desc: 'Défaut batterie traction.' },
    { brand: 'Peugeot', model: 'e-308', years: '2022-2026', engine: 'Électrique 156 ch', issue: 'Batterie + charge', tsb: 'PSA-2023-015', category: 'batterie_hv', desc: 'Défaut batterie et système charge.' },
    { brand: 'Peugeot', model: '208', years: '2019-2026', engine: '1.2 PureTech 100/130', issue: ' TSB 21.07.2026 - BOUGIES DÉFECTUEUSES', tsb: 'STELLANTIS-TSB-2026-07-21-001', category: 'bougies', desc: 'TSB STELLANTIS 21.07.2026 : Bougies défectueuses PureTech. Écartement électrode incorrect → ratés d\'allumage → risque casse catalyseur. Remplacement gratuit NGK/Bosch. Codes : P0300, P0301, P0302, P0303.' },
    { brand: 'Peugeot', model: '2008', years: '2019-2026', engine: '1.2 PureTech 100/130', issue: '🔥 TSB 21.07.2026 - BOUGIES', tsb: 'STELLANTIS-TSB-2026-07-21-001', category: 'bougies', desc: 'TSB STELLANTIS 21.07.2026. Bougies défectueuses.' },
    { brand: 'Peugeot', model: '308', years: '2021-2026', engine: '1.2 PureTech 130', issue: ' TSB 21.07.2026 - BOUGIES', tsb: 'STELLANTIS-TSB-2026-07-21-001', category: 'bougies', desc: 'TSB STELLANTIS 21.07.2026.' },
    { brand: 'Peugeot', model: '3008', years: '2021-2026', engine: '1.2 PureTech 130', issue: '🔥 TSB 21.07.2026 - BOUGIES', tsb: 'STELLANTIS-TSB-2026-07-21-001', category: 'bougies', desc: 'TSB STELLANTIS 21.07.2026.' },
    { brand: 'Citroën', model: 'C3', years: '2016-2026', engine: '1.2 PureTech 82/110', issue: '⚠️ COURROIE DISTRIBUTION DANS HUILE', tsb: 'PSA-STELLANTIS-2020-012', category: 'courroie_huile', desc: 'DÉFAUT CRITIQUE. Courroie se désagrège, colmate crépine, raye cylindres, casse moteur.' },
    { brand: 'Citroën', model: 'C3 Aircross', years: '2017-2026', engine: '1.2 PureTech 110/130', issue: '⚠️ COURROIE DISTRIBUTION DANS HUILE', tsb: 'PSA-STELLANTIS-2020-012', category: 'courroie_huile', desc: 'Défaut courroie immergée.' },
    { brand: 'Citroën', model: 'C4', years: '2018-2026', engine: '1.2 PureTech 110/130', issue: '⚠️ COURROIE DISTRIBUTION DANS HUILE', tsb: 'PSA-STELLANTIS-2020-012', category: 'courroie_huile', desc: 'Défaut courroie.' },
    { brand: 'Citroën', model: 'C5 Aircross', years: '2018-2026', engine: '1.5/2.0 BlueHDi 130/180', issue: 'Système AdBlue', tsb: 'PSA-2020-015', category: 'adblue', desc: 'Pompe AdBlue HS.' },
    { brand: 'Citroën', model: 'C5 Aircross', years: '2022-2026', engine: '1.6 Hybrid 225', issue: 'Hybride rechargeable', tsb: 'PSA-2023-012', category: 'hybride', desc: 'Défaut onduleur haute tension.' },
    { brand: 'Citroën', model: 'ë-C4', years: '2020-2026', engine: 'Électrique 136 ch', issue: 'Batterie traction', tsb: 'PSA-2022-025', category: 'batterie_hv', desc: 'Défaut batterie haute tension.' },
    { brand: 'Citroën', model: 'C3', years: '2016-2026', engine: '1.2 PureTech 82/110', issue: '🔥 TSB 21.07.2026 - BOUGIES', tsb: 'STELLANTIS-TSB-2026-07-21-001', category: 'bougies', desc: 'TSB STELLANTIS 21.07.2026.' },
    { brand: 'Citroën', model: 'C4', years: '2020-2026', engine: '1.2 PureTech 130', issue: '🔥 TSB 21.07.2026 - BOUGIES', tsb: 'STELLANTIS-TSB-2026-07-21-001', category: 'bougies', desc: 'TSB STELLANTIS 21.07.2026.' },
    { brand: 'Citroën', model: 'C5 Aircross', years: '2018-2026', engine: '1.2 PureTech 130', issue: '🔥 TSB 21.07.2026 - BOUGIES', tsb: 'STELLANTIS-TSB-2026-07-21-001', category: 'bougies', desc: 'TSB STELLANTIS 21.07.2026.' },
    { brand: 'DS', model: 'DS 3 Crossback', years: '2018-2026', engine: '1.2 PureTech 100/130', issue: '⚠️ COURROIE DISTRIBUTION DANS HUILE', tsb: 'PSA-STELLANTIS-2020-012', category: 'courroie_huile', desc: 'Défaut courroie sur premium.' },
    { brand: 'DS', model: 'DS 4', years: '2021-2026', engine: '1.2 PureTech 130', issue: '⚠️ COURROIE DISTRIBUTION DANS HUILE', tsb: 'PSA-STELLANTIS-2020-012', category: 'courroie_huile', desc: 'Défaut courroie.' },
    { brand: 'DS', model: 'DS 7', years: '2017-2026', engine: '1.5/2.0 BlueHDi 130/180', issue: 'Système AdBlue', tsb: 'PSA-2020-015', category: 'adblue', desc: 'Défaut pompe AdBlue.' },
    { brand: 'DS', model: 'DS 3 Crossback', years: '2019-2026', engine: 'Électrique 136 ch', issue: 'Batterie haute tension', tsb: 'PSA-2022-025', category: 'batterie_hv', desc: 'Défaut batterie traction.' },
    { brand: 'DS', model: 'DS 3 Crossback', years: '2018-2026', engine: '1.2 PureTech 100/130', issue: '🔥 TSB 21.07.2026 - BOUGIES', tsb: 'STELLANTIS-TSB-2026-07-21-001', category: 'bougies', desc: 'TSB STELLANTIS 21.07.2026.' },
    { brand: 'DS', model: 'DS 4', years: '2021-2026', engine: '1.2 PureTech 130', issue: '🔥 TSB 21.07.2026 - BOUGIES', tsb: 'STELLANTIS-TSB-2026-07-21-001', category: 'bougies', desc: 'TSB STELLANTIS 21.07.2026.' },
    { brand: 'Renault', model: 'Clio', years: '2019-2026', engine: '1.0 TCe 100', issue: 'Courroie distribution huile', tsb: 'RN-2021-008', category: 'courroie_huile', desc: 'Problème courroie baignant huile.' },
    { brand: 'Renault', model: 'Clio', years: '2020-2026', engine: '1.6 E-Tech 140', issue: 'Hybride - Boîte crabot', tsb: 'RN-2022-012', category: 'hybride', desc: 'Défaut boîte crabot hybride.' },
    { brand: 'Renault', model: 'Captur', years: '2019-2026', engine: '1.3 TCe 130/150', issue: 'Courroie distribution', tsb: 'RN-2021-008', category: 'courroie_huile', desc: 'Problème courroie baignant huile.' },
    { brand: 'Renault', model: 'Captur', years: '2020-2026', engine: '1.5/1.6 E-Tech 160', issue: 'Hybride rechargeable', tsb: 'RN-2022-018', category: 'hybride', desc: 'Défaut batterie haute tension.' },
    { brand: 'Renault', model: 'Megane E-Tech', years: '2022-2026', engine: 'Électrique 220 ch', issue: 'Batterie + charge', tsb: 'RN-2023-015', category: 'batterie_hv', desc: 'Défaut batterie et système charge.' },
    { brand: 'Renault', model: 'Austral', years: '2022-2026', engine: '1.2/1.3 E-Tech 130/200', issue: 'Hybride', tsb: 'RN-2023-018', category: 'hybride', desc: 'Défaut système hybride.' },
    { brand: 'Renault', model: 'Zoe', years: '2019-2026', engine: 'Électrique 135 ch', issue: 'Batterie + charge', tsb: 'RN-2022-025', category: 'batterie_hv', desc: 'Défaut batterie et charge rapide.' },
    { brand: 'Opel', model: 'Corsa', years: '2019-2026', engine: '1.2 Turbo 100/130', issue: '⚠️ COURROIE DISTRIBUTION DANS HUILE', tsb: 'STELLANTIS-2020-012', category: 'courroie_huile', desc: 'Même moteur PureTech. Défaut courroie identique.' },
    { brand: 'Opel', model: 'Mokka', years: '2020-2026', engine: '1.2 Turbo 100/130', issue: '⚠️ COURROIE DISTRIBUTION DANS HUILE', tsb: 'STELLANTIS-2020-012', category: 'courroie_huile', desc: 'Défaut courroie sur SUV compact.' },
    { brand: 'Opel', model: 'Corsa', years: '2019-2026', engine: '1.2 Turbo 100/130', issue: '🔥 TSB 21.07.2026 - BOUGIES', tsb: 'STELLANTIS-TSB-2026-07-21-001', category: 'bougies', desc: 'TSB STELLANTIS 21.07.2026.' },
    { brand: 'Opel', model: 'Mokka', years: '2020-2026', engine: '1.2 Turbo 100/130', issue: '🔥 TSB 21.07.2026 - BOUGIES', tsb: 'STELLANTIS-TSB-2026-07-21-001', category: 'bougies', desc: 'TSB STELLANTIS 21.07.2026.' },
    { brand: 'Jeep', model: 'Renegade', years: '2018-2026', engine: '1.3 Turbo 130/150', issue: '⚠️ COURROIE DISTRIBUTION DANS HUILE', tsb: 'STELLANTIS-2020-012', category: 'courroie_huile', desc: 'Moteur GSE-T4 avec courroie dans huile.' },
    { brand: 'Jeep', model: 'Compass', years: '2018-2026', engine: '1.3 Turbo 130/150', issue: '️ COURROIE DISTRIBUTION DANS HUILE', tsb: 'STELLANTIS-2020-012', category: 'courroie_huile', desc: 'Défaut courroie sur SUV.' },
    { brand: 'Jeep', model: 'Renegade', years: '2018-2026', engine: '1.3 Turbo 130/150', issue: '🔥 TSB 21.07.2026 - BOUGIES', tsb: 'STELLANTIS-TSB-2026-07-21-002', category: 'bougies', desc: 'TSB STELLANTIS 21.07.2026 moteur GSE-T4.' },
    { brand: 'Jeep', model: 'Compass', years: '2018-2026', engine: '1.3 Turbo 130/150', issue: '🔥 TSB 21.07.2026 - BOUGIES', tsb: 'STELLANTIS-TSB-2026-07-21-002', category: 'bougies', desc: 'TSB STELLANTIS 21.07.2026.' },
    { brand: 'Jeep', model: 'Avenger', years: '2023-2026', engine: 'Électrique 156 ch', issue: 'Batterie + charge', tsb: 'JP-2024-012', category: 'batterie_hv', desc: 'Défaut batterie et charge.' },
    { brand: 'Ford', model: 'Fiesta', years: '2012-2023', engine: '1.0 EcoBoost 95/100/125/140', issue: '⚠️ COURROIE DISTRIBUTION DANS HUILE', tsb: 'FORD-SSM-2020-001', category: 'courroie_huile', desc: 'DÉFAUT CRITIQUE FORD : Courroie "wet belt". Désintégration, colmatage crépine, casse moteur. RAPPEL MONDIAL. Remplacement tous les 10 ans ou 150 000 km. Huile Ford WSS-M2C948-B OBLIGATOIRE.' },
    { brand: 'Ford', model: 'Focus', years: '2011-2024', engine: '1.0 EcoBoost 100/125/150', issue: '⚠️ COURROIE DISTRIBUTION DANS HUILE', tsb: 'FORD-SSM-2020-001', category: 'courroie_huile', desc: 'Même défaut que Fiesta.' },
    { brand: 'Ford', model: 'Puma', years: '2019-2026', engine: '1.0 EcoBoost 95/125/155', issue: '⚠️ COURROIE DISTRIBUTION DANS HUILE', tsb: 'FORD-SSM-2020-001', category: 'courroie_huile', desc: 'Défaut courroie wet belt.' },
    { brand: 'Ford', model: 'Mustang Mach-E', years: '2021-2026', engine: 'Électrique 269-487 ch', issue: 'Batterie + charge', tsb: 'FD-2022-025', category: 'batterie_hv', desc: 'Défaut batterie et charge rapide.' },
    { brand: 'Volkswagen', model: 'Polo', years: '2017-2026', engine: '1.0 TSI 95/110', issue: '⚠️ COURROIE DISTRIBUTION DANS HUILE', tsb: 'VW-2020-015', category: 'courroie_huile', desc: 'Problème courroie baignant huile.' },
    { brand: 'Volkswagen', model: 'T-Roc', years: '2017-2026', engine: '1.0 TSI 110', issue: '⚠️ COURROIE DISTRIBUTION DANS HUILE', tsb: 'VW-2021-015', category: 'courroie_huile', desc: 'Défaut courroie.' },
    { brand: 'Volkswagen', model: 'Taigo', years: '2021-2026', engine: '1.0 TSI 95/110', issue: '⚠️ COURROIE DISTRIBUTION DANS HUILE', tsb: 'VW-2022-015', category: 'courroie_huile', desc: 'Défaut courroie sur petit SUV.' },
    { brand: 'Volkswagen', model: 'T-Cross', years: '2018-2026', engine: '1.0 TSI 95/110', issue: '⚠️ COURROIE DISTRIBUTION DANS HUILE', tsb: 'VW-2021-015', category: 'courroie_huile', desc: 'Défaut courroie.' },
    { brand: 'Volkswagen', model: 'Golf', years: '2020-2026', engine: '1.5 TSI 130/150', issue: 'Boîte DSG à-coups', tsb: 'VW-2021-018', category: 'boite', desc: 'À-coups boîte DSG7.' },
    { brand: 'Volkswagen', model: 'Golf', years: '2017-2026', engine: '2.0 TDI 150/200', issue: 'AdBlue + FAP', tsb: 'VW-2020-022', category: 'adblue', desc: 'Défaut système AdBlue.' },
    { brand: 'Volkswagen', model: 'ID.3', years: '2020-2026', engine: 'Électrique 150/204 ch', issue: 'Logiciel + batterie', tsb: 'VW-2021-025', category: 'logiciel', desc: 'Bugs logiciels et défaut batterie.' },
    { brand: 'Volkswagen', model: 'ID.4', years: '2021-2026', engine: 'Électrique 174/204/299 ch', issue: 'Logiciel + charge', tsb: 'VW-2022-025', category: 'logiciel', desc: 'Problèmes logiciels et charge.' },
    { brand: 'Audi', model: 'A3', years: '2020-2026', engine: '1.5 TFSI 150', issue: 'Consommation huile', tsb: 'VAG-2021-018', category: 'courroie_huile', desc: 'Segments piston.' },
    { brand: 'Audi', model: 'Q4 e-tron', years: '2021-2026', engine: 'Électrique 170-299 ch', issue: 'Logiciel + batterie', tsb: 'VAG-2022-032', category: 'logiciel', desc: 'Bugs logiciels et batterie.' },
    { brand: 'BMW', model: 'Série 1', years: '2019-2026', engine: '1.5/2.0 B38/B48 109-228', issue: 'Courroie distribution', tsb: 'BMW-2021-015', category: 'courroie_huile', desc: 'Problème courroie baignant huile.' },
    { brand: 'BMW', model: 'Série 3', years: '2019-2026', engine: '2.0/3.0 PHEV 292-394', issue: 'Hybride rechargeable', tsb: 'BMW-2022-022', category: 'hybride', desc: 'Défaut batterie haute tension.' },
    { brand: 'BMW', model: 'iX', years: '2021-2026', engine: 'Électrique 326-523 ch', issue: 'Batterie haute tension', tsb: 'BMW-2022-032', category: 'batterie_hv', desc: 'Défaut batterie.' },
    { brand: 'BMW', model: 'i4', years: '2021-2026', engine: 'Électrique 340-544 ch', issue: 'Batterie + logiciel', tsb: 'BMW-2022-035', category: 'logiciel', desc: 'Défaut batterie et bugs logiciels.' },
    { brand: 'Mercedes', model: 'Classe A', years: '2018-2026', engine: '1.3/2.0 M282 136-224', issue: 'Consommation huile', tsb: 'MB-2021-015', category: 'courroie_huile', desc: 'Segments piston.' },
    { brand: 'Mercedes', model: 'Classe C', years: '2021-2026', engine: '2.0 PHEV 313', issue: 'Hybride rechargeable', tsb: 'MB-2022-025', category: 'hybride', desc: 'Défaut batterie haute tension.' },
    { brand: 'Mercedes', model: 'EQE', years: '2022-2026', engine: 'Électrique 292-626 ch', issue: 'Batterie + logiciel', tsb: 'MB-2023-025', category: 'logiciel', desc: 'Défaut batterie et bugs logiciels.' },
    { brand: 'Škoda', model: 'Enyaq', years: '2021-2026', engine: 'Électrique 148-299 ch', issue: 'Logiciel + batterie', tsb: 'SK-2022-015', category: 'logiciel', desc: 'Bugs logiciels et défaut batterie.' },
    { brand: 'Škoda', model: 'Elroq', years: '2024-2026', engine: 'Électrique 170-286 ch', issue: 'Batterie + charge', tsb: 'SK-2024-012', category: 'batterie_hv', desc: 'Défaut batterie et système charge.' },
    { brand: 'Toyota', model: 'Yaris', years: '2020-2026', engine: '1.5 Hybrid 116/130', issue: 'Batterie hybride', tsb: 'TY-2022-015', category: 'hybride', desc: 'Défaut batterie hybride.' },
    { brand: 'Toyota', model: 'Corolla', years: '2019-2026', engine: '1.8/2.0 Hybrid 122/184/196', issue: 'Batterie hybride', tsb: 'TY-2021-015', category: 'hybride', desc: 'Défaut batterie hybride.' },
    { brand: 'Toyota', model: 'bZ4X', years: '2022-2026', engine: 'Électrique 204/218 ch', issue: 'Batterie + charge', tsb: 'TY-2023-022', category: 'batterie_hv', desc: 'Défaut batterie et perte de puissance.' },
    { brand: 'Honda', model: 'Civic', years: '2022-2026', engine: '2.0 Hybrid 184', issue: 'Hybride', tsb: 'HN-2023-015', category: 'hybride', desc: 'Défaut système hybride.' },
    { brand: 'Nissan', model: 'Qashqai', years: '2021-2026', engine: '1.3 DIG-T 140/158', issue: 'Courroie distribution', tsb: 'NS-2022-008', category: 'courroie_huile', desc: 'Problème courroie baignant huile.' },
    { brand: 'Nissan', model: 'Ariya', years: '2022-2026', engine: 'Électrique 218-394 ch', issue: 'Batterie + charge', tsb: 'NS-2023-015', category: 'batterie_hv', desc: 'Défaut batterie et charge rapide.' },
    { brand: 'Nissan', model: 'Leaf', years: '2017-2026', engine: 'Électrique 110/150/218 ch', issue: 'Dégradation batterie', tsb: 'NS-2020-015', category: 'batterie_hv', desc: 'Dégradation rapide batterie.' },
    { brand: 'Hyundai', model: 'Ioniq 5', years: '2021-2026', engine: 'Électrique 170-325 ch', issue: 'Batterie + charge', tsb: 'HY-2022-022', category: 'batterie_hv', desc: 'Défaut batterie et charge rapide 800V.' },
    { brand: 'Hyundai', model: 'Ioniq 6', years: '2023-2026', engine: 'Électrique 170-325 ch', issue: 'Batterie haute tension', tsb: 'HY-2023-022', category: 'batterie_hv', desc: 'Défaut batterie.' },
    { brand: 'Kia', model: 'EV6', years: '2021-2026', engine: 'Électrique 170-585 ch', issue: 'Batterie + charge', tsb: 'KI-2022-022', category: 'batterie_hv', desc: 'Défaut batterie et charge rapide 800V.' },
    { brand: 'Kia', model: 'EV9', years: '2023-2026', engine: 'Électrique 215-380 ch', issue: 'Batterie haute tension', tsb: 'KI-2024-012', category: 'batterie_hv', desc: 'Défaut batterie sur grand SUV.' },
    { brand: 'BYD', model: 'Atto 3', years: '2022-2026', engine: 'Électrique 204 ch', issue: 'Batterie Blade + charge', tsb: 'BYD-2023-015', category: 'batterie_hv', desc: 'Défaut batterie Blade et système charge.' },
    { brand: 'BYD', model: 'Seal', years: '2023-2026', engine: 'Électrique 218-530 ch', issue: 'Batterie haute tension', tsb: 'BYD-2024-012', category: 'batterie_hv', desc: 'Défaut batterie sur berline sportive.' },
    { brand: 'BYD', model: 'Dolphin', years: '2022-2026', engine: 'Électrique 95/177 ch', issue: 'Batterie + logiciel', tsb: 'BYD-2023-018', category: 'logiciel', desc: 'Bugs logiciels et batterie.' },
    { brand: 'XPeng', model: 'G6', years: '2023-2026', engine: 'Électrique 296-551 ch', issue: 'Batterie + logiciel', tsb: 'XP-2024-012', category: 'logiciel', desc: 'Bugs logiciels et batterie.' },
    { brand: 'NIO', model: 'ET7', years: '2022-2026', engine: 'Électrique 476-653 ch', issue: 'Batterie swap + charge', tsb: 'NIO-2023-015', category: 'batterie_hv', desc: 'Défaut système battery swap.' },
    { brand: 'Polestar', model: '2', years: '2020-2026', engine: 'Électrique 231-476 ch', issue: 'Batterie + charge', tsb: 'PS-2022-015', category: 'batterie_hv', desc: 'Défaut batterie et charge.' },
    { brand: 'Tesla', model: 'Model 3', years: '2017-2026', engine: 'Électrique 283-510 ch', issue: 'Suspension + écran', tsb: 'TS-2021-003', category: 'suspension', desc: 'Rappel bras suspension et écran.' },
    { brand: 'Tesla', model: 'Model Y', years: '2020-2026', engine: 'Électrique 299-514 ch', issue: 'Batterie + suspension', tsb: 'TS-2022-015', category: 'batterie_hv', desc: 'Défaut batterie et suspension.' },
    { brand: 'Tesla', model: 'Cybertruck', years: '2023-2026', engine: 'Électrique 600-845 ch', issue: 'Carrosserie + logiciel', tsb: 'TS-2024-015', category: 'logiciel', desc: 'Problèmes carrosserie inox et bugs logiciels.' },
    { brand: 'Chevrolet', model: 'Bolt EV', years: '2017-2023', engine: 'Électrique 200 ch', issue: 'Risque incendie batterie', tsb: 'CH-2021-015', category: 'batterie_hv', desc: 'Rappel massif pour risque incendie batterie LG.' },
    { brand: 'Rivian', model: 'R1T', years: '2022-2026', engine: 'Électrique 835 ch', issue: 'Batterie + suspension', tsb: 'RV-2023-015', category: 'batterie_hv', desc: 'Défaut batterie et suspension pneumatique.' },
    { brand: 'Lucid', model: 'Air', years: '2021-2026', engine: 'Électrique 480-1234 ch', issue: 'Batterie + charge', tsb: 'LC-2023-015', category: 'batterie_hv', desc: 'Défaut batterie et charge rapide 900V.' }
];

// ============ DÉCODEUR VIN ============
function decodeVIN(vin) {
    if (!vin || vin.length !== 17) return null;
    vin = vin.toUpperCase().trim();
    const wmi = vin.substring(0, 3);
    const wmiDB = {
        'VF1': { brand: 'Renault', country: 'France' }, 'VF3': { brand: 'Peugeot', country: 'France' },
        'VF7': { brand: 'Citroën', country: 'France' }, 'VF8': { brand: 'DS', country: 'France' },
        'WBA': { brand: 'BMW', country: 'Allemagne' }, 'WDB': { brand: 'Mercedes-Benz', country: 'Allemagne' },
        'WAU': { brand: 'Audi', country: 'Allemagne' }, 'WVW': { brand: 'Volkswagen', country: 'Allemagne' },
        'W0L': { brand: 'Opel', country: 'Allemagne' }, 'WF0': { brand: 'Ford Allemagne', country: 'Allemagne' },
        'WF1': { brand: 'Ford France', country: 'France' }, 'ZAR': { brand: 'Alfa Romeo', country: 'Italie' },
        'Z11': { brand: 'Fiat', country: 'Italie' }, 'JTD': { brand: 'Toyota', country: 'Japon' },
        'JHM': { brand: 'Honda', country: 'Japon' }, 'JN1': { brand: 'Nissan', country: 'Japon' },
        'KMH': { brand: 'Hyundai', country: 'Corée' }, 'KNA': { brand: 'Kia', country: 'Corée' },
        '1FA': { brand: 'Ford USA', country: 'USA' }, '1G': { brand: 'General Motors USA', country: 'USA' },
        '1C4': { brand: 'Chrysler/Jeep', country: 'USA' }, '5YJ': { brand: 'Tesla', country: 'USA' },
        '7SA': { brand: 'Tesla', country: 'USA' }, 'LJD': { brand: 'BYD', country: 'Chine' },
        'LNB': { brand: 'NIO', country: 'Chine' }, 'LVS': { brand: 'XPeng', country: 'Chine' },
        'SAJ': { brand: 'Jaguar', country: 'UK' }, 'SAL': { brand: 'Land Rover', country: 'UK' }
    };
    const yearChar = vin.charAt(9);
    const yearDB = { 'A': 2010, 'B': 2011, 'C': 2012, 'D': 2013, 'E': 2014, 'F': 2015, 'G': 2016, 'H': 2017, 'J': 2018, 'K': 2019, 'L': 2020, 'M': 2021, 'N': 2022, 'P': 2023, 'R': 2024, 'S': 2025, 'T': 2026 };
    let manufacturer = null;
    for (let prefix in wmiDB) { if (vin.startsWith(prefix)) { manufacturer = wmiDB[prefix]; break; } }
    return { vin, manufacturer, year: yearDB[yearChar] || null, yearChar, wmi, serial: vin.substring(11) };
}

// ============ RECHERCHE RAPPELS PAR VIN ============
async function searchRecallsByVIN(vin) {
    if (!vin || vin.length !== 17) return { error: 'VIN invalide' };
    vin = vin.toUpperCase().trim();
    const decoded = decodeVIN(vin);
    const results = { vin, decoded, nhtsa: [], local: [], total: 0 };
    try {
        const response = await fetch(`https://api.nhtsa.gov/recalls/recallsByVin/${vin}?format=json`);
        if (response.ok) {
            const data = await response.json();
            if (data.results && data.results.length > 0) {
                results.nhtsa = data.results.map(r => ({
                    campaignNumber: r.NHTSACampaignNumber, manufacturer: r.Manufacturer,
                    subject: r.Subject, summary: r.Summary, consequence: r.Consequence,
                    remedy: r.Remedy, date: r.ReportReceivedDate,
                    url: `https://www.nhtsa.gov/recalls?nhtsaId=${r.NHTSACampaignNumber}`
                }));
            }
        }
    } catch(e) { console.log('API NHTSA indisponible:', e); }
    if (decoded && decoded.manufacturer) {
        const brand = decoded.manufacturer.brand.toLowerCase();
        const year = decoded.year;
        results.local = localRecallsDB.filter(r => {
            const brandMatch = r.brand.toLowerCase() === brand || brand.includes(r.brand.toLowerCase());
            const yearMatch = !year || (year >= parseInt(r.years.split('-')[0]) && year <= (parseInt(r.years.split('-')[1]) || 2026));
            return brandMatch && yearMatch;
        });
    }
    results.total = results.nhtsa.length + results.local.length;
    return results;
}

// ============ RECHERCHE PAR IMMATRICULATION ============
async function searchByPlate(plate) {
    if (!plate) return null;
    plate = plate.toUpperCase().replace(/[\s-]/g, '');
    if (plate.length !== 7) return { error: 'Format invalide' };
    try {
        const response = await fetch(`https://www.api-car.info/car/${plate}`);
        if (!response.ok) throw new Error('API non disponible');
        const data = await response.json();
        return { success: true, brand: data.marque, model: data.modele, version: data.version, year: data.annee, fuel: data.energie, power: data.puissance, firstRegistration: data.date_mise_circulation, vin: data.vin };
    } catch(e) { return { error: 'API indisponible', plate }; }
}

// ============ MOTEUR IA LOCAL ============
function runLocalAI(d, vinRecalls = null) {
    const issues = [], causes = [], consequences = [], recommendations = [];
    let severity = 'Normal';
    let criticalAlerts = [];

    const qcmMap = {
        qcm1: { i: 'Dysfonctionnement avec véhicule roulant', c: 'Défaut intermittent électronique ou mécanique' },
        qcm2: { i: 'Bruit anormal détecté', c: 'Usure pièces mécaniques (roulements, courroies, supports, cardans, turbo)' },
        qcm3: { i: 'Risque incendie / Fumée / Odeur brûlé', c: 'Court-circuit, fuite carburant sur partie chaude, surchauffe moteur', s: 'CRITIQUE', cons: 'DANGER IMMÉDIAT - Arrêt véhicule obligatoire' },
        qcm4: { i: 'Défaut comportement routier', c: 'Problème suspension, direction, freinage, géométrie ou pneus' },
        qcm5: { i: 'Perte de puissance', c: 'Alimentation, turbo, injection, encrassement FAP/EGR, mode dégradé' },
        qcm6: { i: 'À-coups moteur', c: 'Allumage (bougies/bobines), injecteurs, régime irrégulier, admission air' },
        qcm7: { i: 'À-coups boîte vitesse', c: 'Défaut mécatronique, embrayage, convertisseur, niveau huile boîte' },
        qcm8: { i: 'Défaut fonctionnement boîte', c: 'Panne capteur boîte, mécatronique, faisceau électrique' },
        qcm9: { i: 'Problème passage rapports', c: 'Tringlerie, synchroniseurs, huile boîte usée, embrayage' },
        qcm10: { i: 'Voyant alerte actif', c: 'Défaut enregistré calculateurs, nécessite lecture DTC approfondie' },
        qcm11: { i: 'Démarrage difficile/impossible', c: 'Batterie, démarreur, alternateur, immobiliseur, pompe carburant' },
        qcm12: { i: 'Surchauffe moteur', c: 'Circuit refroidissement, thermostat, pompe eau, radiateur, joint culasse', s: 'CRITIQUE', cons: 'Risque casse moteur - Arrêt immédiat' },
        qcm13: { i: 'Fuite détectée', c: 'Joint, durite, carter, pompe. Identifier liquide (huile, LDR, carburant)' },
        qcm14: { i: 'Perte freinage', c: 'Circuit frein, maître-cylindre, ABS, plaquettes/disques', s: 'CRITIQUE', cons: 'DANGER MORTEL - Immobilisation stricte' },
        qcm15: { i: 'Problème électrique/batterie', c: 'Batterie 12V, alternateur, faisceau, masse, calculateurs' }
    };

    for (let key in d.qcm) {
        if (d.qcm[key] && qcmMap[key]) {
            issues.push(qcmMap[key].i); causes.push(qcmMap[key].c);
            if (qcmMap[key].s === 'CRITIQUE') severity = 'CRITIQUE';
            if (qcmMap[key].cons) consequences.push(qcmMap[key].cons);
        }
    }

    // DÉTECTION COURROIE DANS HUILE
    const brand = (d.vehicle.brand || '').toLowerCase();
    const engine = (d.vehicle.engine || '').toLowerCase();
    const year = parseInt(d.vehicle.year) || 0;
    const courroieHuileBrands = ['peugeot', 'citroën', 'citroen', 'ds', 'opel', 'vauxhall', 'jeep', 'alfa romeo', 'fiat', 'lancia', 'ford', 'volkswagen', 'vw', 'seat', 'skoda', 'audi', 'renault'];
    const moteursCourroieHuile = ['puretech', '1.2', 'ecoboost', '1.0', 'tsi 1.0', 'gse-t4', 'firefly', '1.3 turbo'];
    const isCourroieHuileRisk = courroieHuileBrands.some(b => brand.includes(b)) && moteursCourroieHuile.some(m => engine.includes(m)) && year >= 2012 && year <= 2026;
    if (isCourroieHuileRisk) {
        criticalAlerts.push({ type: 'COURROIE_HUILE', title: '⚠️ ALERTE CRITIQUE : RISQUE COURROIE DE DISTRIBUTION DANS L\'HUILE', message: `Le véhicule ${d.vehicle.brand} ${d.vehicle.model} avec moteur ${d.vehicle.engine} est concerné par le défaut majeur de courroie de distribution immergée dans l'huile.`, symptoms: ['Voyant pression d\'huile', 'Bruit claquement moteur', 'Perte de puissance', 'Fumée bleue', 'Consommation huile excessive', 'Codes P0016, P0087, P0520'], consequences: ['Désintégration courroie', 'Colmatage crépine', 'Chute pression huile', 'Rayures cylindres', 'Destruction turbo', 'Casse moteur'], action: 'CONTRÔLE URGENT par inspection visuelle. Si effritement → REMPLACEMENT IMMÉDIAT kit distribution + nettoyage circuit + pompe à huile. Huile 0W30 C2 (Stellantis) ou WSS-M2C948-B (Ford) OBLIGATOIRE.' });
        severity = 'CRITIQUE';
    }

    // DÉTECTION TSB 21.07.2026 BOUGIES
    const stellantisBrands = ['peugeot', 'citroën', 'citroen', 'ds', 'opel', 'vauxhall', 'jeep', 'alfa romeo', 'fiat', 'lancia'];
    const moteursBougies = ['puretech', '1.2', 'thp', '1.6', 'gse-t4', '1.3 turbo', '1.4', '1.5'];
    const isBougiesRisk = stellantisBrands.some(b => brand.includes(b)) && moteursBougies.some(m => engine.includes(m)) && year >= 2017 && year <= 2026;
    if (isBougiesRisk) {
        criticalAlerts.push({ type: 'BOUGIES_STELLANTIS', title: '🔥 TSB STELLANTIS DU 21.07.2026 - BOUGIES D\'ALLUMAGE DÉFECTUEUSES', message: 'Référence : STELLANTIS-TSB-2026-07-21-001. Bougies avec écartement électrode incorrect.', symptoms: ['Voyant moteur allumé', 'Ratés d\'allumage', 'À-coups accélération', 'Surconsommation', 'Perte puissance', 'Codes P0300-P0304'], consequences: ['Imbrûlés cylindre', 'Destruction catalyseur', 'Encrassement injecteurs', 'Dilution huile', 'Risque casse moteur'], action: 'REMPLACEMENT GRATUIT des 4 bougies par NGK ou Bosch. Présenter TSB STELLANTIS-TSB-2026-07-21-001 en concession.' });
    }

    // Analyse DTC
    let dtcAnalysis = '';
    if (d.dtcRead === 'oui' && d.dtcCodes) {
        const codes = d.dtcCodes.split('\n').map(c => c.trim().toUpperCase()).filter(c => c);
        const dtcDict = { 'P0016': 'Corrélation vilebrequin/arbre à cames - ⚠️ LIÉ COURROIE', 'P0087': 'Pression rail basse', 'P0171': 'Mélange pauvre', 'P0172': 'Mélange riche', 'P0300': 'Ratés aléatoires - ⚠️ LIÉ BOUGIES', 'P0301': 'Ratés cyl.1 - ⚠️ LIÉ BOUGIES', 'P0302': 'Ratés cyl.2 - ⚠️ LIÉ BOUGIES', 'P0303': 'Ratés cyl.3 - ⚠️ LIÉ BOUGIES', 'P0304': 'Ratés cyl.4 - ⚠️ LIÉ BOUGIES', 'P0420': 'Efficacité catalyseur', 'P0520': 'Capteur pression huile - ️ LIÉ COURROIE', 'P0522': 'Pression huile basse - ⚠️ LIÉ COURROIE', 'P0299': 'Pression turbo basse', 'P0217': 'Surchauffe moteur', 'P0700': 'Défaut boîte', 'P2002': 'Efficacité FAP', 'P2463': 'Restriction FAP', 'U0100': 'Communication calculateur moteur', 'U0101': 'Communication calculateur boîte' };
        dtcAnalysis = '<h4>🔍 Analyse codes DTC :</h4><ul>';
        codes.forEach(code => {
            let desc = dtcDict[code] || 'Code spécifique constructeur';
            if (code.startsWith('P0')) desc = 'Powertrain OBD2 - ' + desc;
            else if (code.startsWith('P1')) desc = 'Powertrain constructeur - ' + desc;
            else if (code.startsWith('P2')) desc = 'Powertrain - ' + desc;
            else if (code.startsWith('C0') || code.startsWith('C1')) desc = 'Châssis - ' + desc;
            else if (code.startsWith('B0') || code.startsWith('B1')) desc = 'Carrosserie - ' + desc;
            else if (code.startsWith('U0') || code.startsWith('U1')) desc = 'Réseau CAN - ' + desc;
            const criticalCodes = ['P0016', 'P0520', 'P0522', 'P0217', 'P0300', 'P0301', 'P0302', 'P0303', 'P0304'];
            if (criticalCodes.includes(code)) desc += ' ⚠️ CRITIQUE';
            dtcAnalysis += `<li><strong>${code}</strong> : ${desc}</li>`;
        });
        dtcAnalysis += '</ul>';
    }

    // Croisement Base Locale
    const recallMatches = localRecallsDB.filter(r => {
        const brandMatch = r.brand.toLowerCase() === brand || brand.includes(r.brand.toLowerCase());
        const model = (d.vehicle.model || '').toLowerCase();
        const modelMatch = model.includes(r.model.toLowerCase()) || r.model.toLowerCase().includes(model);
        const yearMatch = !year || (year >= parseInt(r.years.split('-')[0]) && year <= (parseInt(r.years.split('-')[1]) || 2026));
        return brandMatch && modelMatch && yearMatch;
    });
    let recallHtml = '';
    if (recallMatches.length > 0) {
        recallHtml = '<div class="alert alert-warning">🚨 <strong>RAPPELS CONSTRUCTEURS DÉTECTÉS (Base locale) :</strong><br><br>';
        recallMatches.forEach(r => { recallHtml += `<div style="margin:10px 0;padding:10px;background:rgba(255,255,255,0.1);border-radius:8px"><strong> ${r.brand} ${r.model} (${r.years})</strong><br><strong>Motorisation :</strong> ${r.engine}<br><strong>Catégorie :</strong> ${r.category}<br><strong>Problème :</strong> ${r.issue}<br><strong>TSB :</strong> ${r.tsb}<br><strong>Description :</strong> ${r.desc}</div>`; });
        recallHtml += '</div>';
        recallMatches.forEach(r => recommendations.push(`🔴 PRIORITAIRE : ${r.issue} - TSB ${r.tsb}`));
    }

    // INTÉGRATION RAPPELS PAR VIN
    let vinRecallsHtml = '';
    if (vinRecalls && vinRecalls.total > 0) {
        vinRecallsHtml = '<div class="alert alert-danger" style="border-left:5px solid #dc3545">🚨 <strong>CAMPAGNES DE RAPPEL CONSTRUCTEUR DÉTECTÉES PAR VIN :</strong><br>';
        vinRecallsHtml += `<p style="margin:10px 0"><strong>VIN analysé :</strong> <code>${vinRecalls.vin}</code></p>`;
        if (vinRecalls.nhtsa && vinRecalls.nhtsa.length > 0) {
            vinRecallsHtml += `<h4 style="color:#fff;margin-top:15px">🇺🇸 Rappels NHTSA (USA) - ${vinRecalls.nhtsa.length} campagne(s) :</h4>`;
            vinRecalls.nhtsa.forEach((r, idx) => { vinRecallsHtml += `<div style="background:rgba(255,255,255,0.15);padding:12px;margin:8px 0;border-radius:8px;border-left:4px solid #ffd700"><strong>Campagne N°${idx+1} : ${r.campaignNumber}</strong><br><strong>Constructeur :</strong> ${r.manufacturer}<br><strong>Objet :</strong> ${r.subject}<br><strong>Résumé :</strong> ${r.summary}<br><strong>Conséquence :</strong> ${r.consequence}<br><strong>Remède :</strong> ${r.remedy}<br><strong>Date :</strong> ${r.date}<br><a href="${r.url}" target="_blank" style="color:#ffd700;text-decoration:underline">🔗 Voir sur NHTSA.gov</a></div>`; });
        }
        if (vinRecalls.local && vinRecalls.local.length > 0) {
            vinRecallsHtml += `<h4 style="color:#fff;margin-top:15px">🇪🇺 Rappels européens (Base locale) - ${vinRecalls.local.length} campagne(s) :</h4>`;
            vinRecalls.local.forEach((r, idx) => { vinRecallsHtml += `<div style="background:rgba(255,255,255,0.15);padding:12px;margin:8px 0;border-radius:8px;border-left:4px solid #ff6b35"><strong> ${r.brand} ${r.model} (${r.years})</strong><br><strong>Motorisation :</strong> ${r.engine}<br><strong>Catégorie :</strong> ${r.category}<br><strong>Problème :</strong> ${r.issue}<br><strong>TSB :</strong> ${r.tsb}<br><strong>Description :</strong> ${r.desc}</div>`; });
        }
        vinRecallsHtml += '</div>';
        if (vinRecalls.nhtsa && vinRecalls.nhtsa.length > 0) recommendations.push(`🔴 URGENT : ${vinRecalls.nhtsa.length} campagne(s) de rappel NHTSA détectée(s) par VIN`);
        if (vinRecalls.local && vinRecalls.local.length > 0) recommendations.push(`🔴 URGENT : ${vinRecalls.local.length} campagne(s) de rappel européen détectée(s)`);
    } else if (vinRecalls && vinRecalls.vin) {
        vinRecallsHtml = '<div class="alert alert-success">✅ <strong>Aucune campagne de rappel active détectée par VIN</strong> dans les bases consultées.</div>';
    }

    // Liens officiels
    let officialLinksHtml = '';
    if (d.vehicle.brand && d.vehicle.year) {
        const brandLower = brand.toLowerCase();
        let officialUrl = '';
        if (['peugeot', 'citroën', 'citroen', 'ds', 'opel', 'jeep', 'alfa romeo', 'fiat', 'lancia'].some(b => brandLower.includes(b))) officialUrl = 'https://www.stellantis.com/fr/recalls';
        else if (brandLower.includes('renault')) officialUrl = 'https://www.renault.fr/services/rappels.html';
        else if (brandLower.includes('volkswagen') || brandLower.includes('vw') || brandLower.includes('audi') || brandLower.includes('seat') || brandLower.includes('skoda')) officialUrl = 'https://www.volkswagen.fr/fr/services/rappels.html';
        else if (brandLower.includes('bmw')) officialUrl = 'https://www.bmw.fr/fr/topics/rappels.html';
        else if (brandLower.includes('mercedes')) officialUrl = 'https://www.mercedes-benz.fr/rappels';
        else if (brandLower.includes('ford')) officialUrl = 'https://www.ford.fr/support/rappels/';
        else if (brandLower.includes('toyota')) officialUrl = 'https://www.toyota.fr/rappels';
        if (officialUrl) {
            officialLinksHtml = `<div class="alert alert-info" style="margin-top:15px"><strong> Vérification officielle constructeur :</strong><br><a href="${officialUrl}" target="_blank" style="color:#0c5460;text-decoration:underline;font-weight:bold">Consulter le site officiel ${d.vehicle.brand}</a><br><a href="https://www.rappel.conso.gouv.fr" target="_blank" style="color:#0c5460;text-decoration:underline;font-weight:bold">🇫 Rappel.gouv.fr (France)</a><br><a href="https://www.nhtsa.gov/recalls" target="_blank" style="color:#0c5460;text-decoration:underline;font-weight:bold">🇺🇸 NHTSA.gov (USA)</a></div>`;
        }
    }

    criticalAlerts.forEach(alert => recommendations.push(`⚠️ ${alert.title}`));
    recommendations.push('Diagnostic complet avec outil constructeur (Diagbox, Renault Clip, VAS, ISTA, Xentry, FORScan, etc.)');
    recommendations.push('Vérifier les TSB sur le portail constructeur');
    recommendations.push('Consulter l\'historique complet (Histovec, CarVertical, AutoDNA)');
    if (severity === 'CRITIQUE') recommendations.push('⚠️ URGENT : NE PAS UTILISER LE VÉHICULE - Remorquage vers atelier agréé recommandé');
    else recommendations.push('Planifier un rendez-vous atelier sous 48h');

    return { issues, causes, consequences, recommendations, dtcAnalysis, recallHtml, vinRecallsHtml, officialLinksHtml, severity, criticalAlerts };
}

// ============ INITIALISATION QCM ============
const qcmLabels = ['Panne / Dysfonctionnement mais roulant', 'Bruit anormal', 'Incendie / Fumée / Odeur de brûlé', 'Défaut de comportement sur route', 'Défaut de puissance', 'À-coups moteur', 'À-coups boîte de vitesse', 'Défaut de fonctionnement boîte', 'Problème de passage des rapports', 'Voyant alerte allumé planche de bord', 'Démarrage difficile / Impossible', 'Surchauffe moteur', 'Fuite (liquide, huile, carburant)', 'Perte de freinage', 'Problème électrique / Batterie'];

function initQCM() {
    const container = document.getElementById('qcmContainer');
    if (!container) return;
    qcmLabels.forEach((label, index) => {
        const id = index + 1;
        container.innerHTML += `<div class="checkbox-item"><input type="checkbox" id="qcm${id}" onchange="toggleDetail(${id}, '${label}')"><label for="qcm${id}">${label}</label></div>`;
    });
}

function toggleDetail(id, label) {
    const checkbox = document.getElementById('qcm' + id);
    const existing = document.getElementById('detail-' + id);
    const container = document.getElementById('detailSections');
    if (checkbox.checked && !existing) {
        const div = document.createElement('div');
        div.id = 'detail-' + id; div.className = 'form-group';
        div.style.cssText = 'padding:12px;background:#fff;border-radius:8px;border-left:4px solid #ff6b35;box-shadow:0 2px 5px rgba(0,0,0,0.05)';
        div.innerHTML = `<label>Détails pour : <strong>${label}</strong></label><textarea placeholder="Décrivez en détail..."></textarea>`;
        container.appendChild(div);
    } else if (!checkbox.checked && existing) { existing.remove(); }
}

// ============ AUTHENTIFICATION ============
async function handleLogin() {
    const username = document.getElementById('loginUsername').value.trim();
    const password = document.getElementById('loginPassword').value;
    const msg = document.getElementById('loginMessage');
    if (!username || !password) { msg.innerHTML = '<div class="alert alert-danger">Champs requis</div>'; return; }
    if (username.toLowerCase() === 'admin' && password === ADMIN_PASSWORD) { currentUser = { username: 'admin', role: 'admin', status: 'authorized' }; isAdmin = true; enterApp(); return; }
    if (db) {
        try {
            const doc = await db.collection('users').doc(username).get();
            if (doc.exists) {
                const data = doc.data();
                if (data.password !== password) { msg.innerHTML = '<div class="alert alert-danger">Mot de passe incorrect</div>'; return; }
                if (data.status === 'refused') { msg.innerHTML = '<div class="alert alert-danger">❌ Accès refusé</div>'; return; }
                if (data.status === 'pending') { msg.innerHTML = '<div class="alert alert-warning">⏳ En attente</div>'; return; }
                currentUser = { username, role: 'user', status: 'authorized' }; isAdmin = false; enterApp();
            } else { msg.innerHTML = '<div class="alert alert-danger">Utilisateur inconnu</div>'; }
        } catch(e) { msg.innerHTML = '<div class="alert alert-danger">Erreur: ' + e.message + '</div>'; }
    } else {
        const users = JSON.parse(localStorage.getItem('users') || '[]');
        const user = users.find(u => u.username === username && u.password === password);
        if (!user) { msg.innerHTML = '<div class="alert alert-danger">Identifiants incorrects</div>'; return; }
        if (user.status === 'refused') { msg.innerHTML = '<div class="alert alert-danger">❌ Accès refusé</div>'; return; }
        if (user.status === 'pending') { msg.innerHTML = '<div class="alert alert-warning">⏳ En attente</div>'; return; }
        currentUser = user; isAdmin = user.role === 'admin'; enterApp();
    }
}

function enterApp() {
    document.getElementById('loginSection').classList.add('hidden');
    document.getElementById('mainApp').classList.remove('hidden');
    document.getElementById('currentUserDisplay').textContent = currentUser.username;
    const badge = document.getElementById('userBadge');
    if (isAdmin) { badge.textContent = 'Administrateur'; badge.className = 'badge badge-admin'; document.querySelectorAll('.admin-only').forEach(el => el.classList.remove('hidden')); loadAdminData(); }
    else { badge.textContent = 'Utilisateur'; badge.className = 'badge badge-user'; }
    updateHistory();
}

function logout() { currentUser = null; isAdmin = false; document.getElementById('mainApp').classList.add('hidden'); document.getElementById('loginSection').classList.remove('hidden'); document.getElementById('loginUsername').value = ''; document.getElementById('loginPassword').value = ''; document.getElementById('loginMessage').innerHTML = ''; }

async function showAccessRequest() {
    const username = prompt('Nom d\'utilisateur :'); if (!username) return;
    const password = prompt('Mot de passe :'); if (!password) return;
    if (db) { try { await db.collection('users').doc(username).set({ username, password, role: 'user', status: 'pending', date: new Date().toISOString() }); alert('✅ Demande envoyée à Kevin'); } catch(e) { alert('Erreur: ' + e.message); } }
    else { const users = JSON.parse(localStorage.getItem('users') || '[]'); if (users.find(u => u.username === username)) { alert('Existe déjà'); return; } users.push({ username, password, role: 'user', status: 'pending', date: new Date().toISOString() }); localStorage.setItem('users', JSON.stringify(users)); alert('✅ Demande enregistrée'); }
}

// ============ NAVIGATION ============
function showSection(section) {
    document.querySelectorAll('.section').forEach(s => s.classList.remove('active'));
    document.querySelectorAll('.nav-tab').forEach(t => t.classList.remove('active'));
    document.getElementById(section + 'Section').classList.add('active');
    if (event && event.target) event.target.classList.add('active');
    if (section === 'admin') loadAdminData();
    if (section === 'history') updateHistory();
}

function toggleDTCInput(show) { document.getElementById('dtcInputSection').classList.toggle('hidden', !show); }

// ============ IDENTIFICATION VÉHICULE ============
async function identifyVehicle() {
    const type = document.getElementById('idType').value;
    const value = document.getElementById('idValue').value.trim();
    const resultDiv = document.getElementById('idResult');
    if (!value) { resultDiv.innerHTML = '<div class="alert alert-danger">Veuillez saisir une valeur</div>'; return; }
    resultDiv.innerHTML = '<div class="alert alert-info">🔍 Recherche en cours...</div>';
    if (type === 'vin') {
        const decoded = decodeVIN(value);
        const recallsResult = await searchRecallsByVIN(value);
        currentVINRecalls = recallsResult;
        if (decoded) {
            let html = '<div class="alert alert-success">✅ VIN décodé avec succès</div>';
            html += '<div style="background:#f8f9fa;padding:15px;border-radius:8px;margin-top:10px">';
            if (decoded.manufacturer) { html += `<p><strong>Constructeur :</strong> ${decoded.manufacturer.brand}</p><p><strong>Pays :</strong> ${decoded.manufacturer.country}</p>`; }
            if (decoded.year) html += `<p><strong>Année modèle :</strong> ${decoded.year}</p>`;
            html += `<p><strong>WMI :</strong> ${decoded.wmi}</p><p><strong>N° série :</strong> ${decoded.serial}</p></div>`;
            if (recallsResult.total > 0) { html += `<div class="alert alert-warning" style="margin-top:15px">🚨 <strong>${recallsResult.total} campagne(s) de rappel détectée(s) par VIN !</strong><br>`; if (recallsResult.nhtsa.length > 0) html += `<p>🇺🇸 NHTSA : ${recallsResult.nhtsa.length} campagne(s)</p>`; if (recallsResult.local.length > 0) html += `<p>🇺 Base locale : ${recallsResult.local.length} campagne(s)</p>`; html += `<p style="margin-top:10px"><em>Les détails complets seront affichés dans la conclusion de l'analyse.</em></p></div>`; }
            else { html += '<div class="alert alert-success" style="margin-top:15px">✅ Aucune campagne de rappel active détectée par VIN.</div>'; }
            if (decoded.manufacturer) document.getElementById('vehicleBrand').value = decoded.manufacturer.brand;
            if (decoded.year) document.getElementById('vehicleYear').value = decoded.year;
            document.getElementById('vehicleVIN').value = value;
            resultDiv.innerHTML = html;
        } else { resultDiv.innerHTML = '<div class="alert alert-danger">VIN invalide (17 caractères requis)</div>'; }
    } else {
        const result = await searchByPlate(value);
        if (result && result.success) {
            let html = '<div class="alert alert-success">✅ Véhicule identifié</div>';
            html += '<div style="background:#f8f9fa;padding:15px;border-radius:8px;margin-top:10px">';
            if (result.brand) html += `<p><strong>Marque :</strong> ${result.brand}</p>`;
            if (result.model) html += `<p><strong>Modèle :</strong> ${result.model}</p>`;
            if (result.version) html += `<p><strong>Version :</strong> ${result.version}</p>`;
            if (result.year) html += `<p><strong>Année :</strong> ${result.year}</p>`;
            if (result.fuel) html += `<p><strong>Énergie :</strong> ${result.fuel}</p>`;
            if (result.power) html += `<p><strong>Puissance :</strong> ${result.power}</p>`;
            if (result.firstRegistration) html += `<p><strong>Mise en circulation :</strong> ${result.firstRegistration}</p>`;
            if (result.vin) {
                html += `<p><strong>VIN :</strong> ${result.vin}</p>`;
                const recallsResult = await searchRecallsByVIN(result.vin);
                currentVINRecalls = recallsResult;
                if (recallsResult.total > 0) html += `<div class="alert alert-warning" style="margin-top:10px">🚨 <strong>${recallsResult.total} campagne(s) de rappel détectée(s) !</strong></div>`;
            }
            html += '</div>';
            if (result.brand) document.getElementById('vehicleBrand').value = result.brand;
            if (result.model) document.getElementById('vehicleModel').value = result.model;
            if (result.year) document.getElementById('vehicleYear').value = result.year;
            if (result.fuel) { const fuelMap = { 'Essence': 'Essence', 'Diesel': 'Diesel (Gazole)', 'Electrique': 'Électrique', 'Hybride': 'Hybride' }; document.getElementById('vehicleEngine').value = fuelMap[result.fuel] || ''; }
            if (result.vin) document.getElementById('vehicleVIN').value = result.vin;
            resultDiv.innerHTML = html;
        } else { resultDiv.innerHTML = `<div class="alert alert-warning">⚠️ ${result ? result.error : 'Erreur inconnue'}</div>`; }
    }
}

// ============ DIAGNOSTIC ============
function saveDiagnostic() {
    const data = { id: Date.now(), date: new Date().toISOString(), user: currentUser.username, vehicle: { brand: document.getElementById('vehicleBrand').value, model: document.getElementById('vehicleModel').value, year: document.getElementById('vehicleYear').value, engine: document.getElementById('vehicleEngine').value, mileage: document.getElementById('vehicleMileage').value, vin: document.getElementById('vehicleVIN').value }, symptoms: document.getElementById('symptoms').value, context: document.getElementById('context').value, visualDefects: document.getElementById('visualDefects').value, dtcRead: document.querySelector('input[name="dtcRead"]:checked')?.value || 'non', dtcCodes: document.getElementById('dtcCodes').value, qcm: {}, additionalInfo: document.getElementById('additionalInfo').value };
    for (let i = 1; i <= 15; i++) data.qcm['qcm' + i] = document.getElementById('qcm' + i).checked;
    if (!data.vehicle.brand || !data.symptoms) { alert('⚠️ Marque et Symptômes requis'); return; }
    const diagnostics = JSON.parse(localStorage.getItem('diagnostics') || '[]');
    diagnostics.push(data); localStorage.setItem('diagnostics', JSON.stringify(diagnostics));
    currentDiagnostic = data; alert('✅ Diagnostic enregistré !'); updateHistory();
}

function goToAnalysis() {
    if (!currentDiagnostic) { const diagnostics = JSON.parse(localStorage.getItem('diagnostics') || '[]'); if (diagnostics.length > 0) currentDiagnostic = diagnostics[diagnostics.length - 1]; else { alert('Enregistrez d\'abord un diagnostic'); return; } }
    showSection('analysis'); generateAIAnalysis();
}

async function generateAIAnalysis() {
    const d = currentDiagnostic;
    let vinRecalls = currentVINRecalls;
    if (d.vehicle.vin && d.vehicle.vin.length === 17 && (!vinRecalls || vinRecalls.vin !== d.vehicle.vin.toUpperCase())) {
        document.getElementById('aiConclusion').innerHTML = '<div class="alert alert-info">🔍 Recherche automatique des campagnes de rappel par VIN en cours...</div>';
        vinRecalls = await searchRecallsByVIN(d.vehicle.vin); currentVINRecalls = vinRecalls;
    }
    const aiResult = runLocalAI(d, vinRecalls);
    let html = `<div class="conclusion-box"><h3> Analyse Technique IA</h3><p><strong>Véhicule :</strong> ${d.vehicle.brand} ${d.vehicle.model} ${d.vehicle.year || ''} - ${d.vehicle.engine || '?'} - ${d.vehicle.mileage || '?'} km</p>${d.vehicle.vin ? `<p><strong>VIN :</strong> <code>${d.vehicle.vin}</code></p>` : ''}<p><strong>Sévérité :</strong> <span style="color:${aiResult.severity === 'CRITIQUE' ? '#ff6b6b' : '#ffd700'};font-weight:bold">${aiResult.severity}</span></p>${aiResult.recallHtml}${aiResult.vinRecallsHtml}${aiResult.officialLinksHtml}<h4>⚠️ Symptômes :</h4><ul>${aiResult.issues.length ? aiResult.issues.map(i => `<li>${i}</li>`).join('') : '<li>' + (d.symptoms || 'Non précisé') + '</li>'}</ul><h4>🔍 Causes probables :</h4><ul>${aiResult.causes.length ? aiResult.causes.map(c => `<li>${c}</li>`).join('') : '<li>Investigation requise</li>'}</ul>${aiResult.consequences.length ? `<h4>🚨 Conséquences :</h4><ul>${aiResult.consequences.map(c => `<li>${c}</li>`).join('')}</ul>` : ''}${aiResult.dtcAnalysis}`;
    if (aiResult.criticalAlerts && aiResult.criticalAlerts.length > 0) {
        html += '<h4 style="color:#ff6b6b;margin-top:20px"> ALERTES CRITIQUES DÉTECTÉES :</h4>';
        aiResult.criticalAlerts.forEach(alert => { html += `<div style="background:rgba(220,53,69,0.2);border-left:4px solid #dc3545;padding:15px;margin:10px 0;border-radius:8px"><h5 style="color:#fff;margin:0 0 10px 0">${alert.title}</h5><p style="color:#fff;margin:5px 0">${alert.message}</p><p style="color:#fff;margin:5px 0"><strong>Symptômes à surveiller :</strong></p><ul style="color:#fff">${alert.symptoms.map(s => `<li>${s}</li>`).join('')}</ul><p style="color:#fff;margin:5px 0"><strong>Conséquences possibles :</strong></p><ul style="color:#fff">${alert.consequences.map(c => `<li>${c}</li>`).join('')}</ul><p style="color:#ffd700;margin:10px 0 0 0"><strong>✅ Action requise :</strong> ${alert.action}</p></div>`; });
    }
    html += `<h4>📌 Recommandations :</h4><ul>${aiResult.recommendations.map(r => `<li>${r}</li>`).join('')}</ul><h4> Conclusion argumentée :</h4><p>Sur la base des éléments techniques fournis pour le <strong>${d.vehicle.brand} ${d.vehicle.model}</strong> ${d.vehicle.year ? `(${d.vehicle.year})` : ''}, l'analyse croisée des symptômes, des codes DTC et de la base de données de pannes connues identifie <strong>${aiResult.issues.length} dysfonctionnement(s)</strong>. Les causes racines pointent vers ${aiResult.causes[0] || 'un défaut technique à investiguer'}. ${aiResult.vinRecallsHtml ? '<strong style="color:#ffd700">🚨 CAMPAGNES DE RAPPEL CONSTRUCTEUR DÉTECTÉES PAR VIN - Actions prioritaires à mener en concession avec le numéro de série.</strong>' : (aiResult.recallHtml ? 'Rappels constructeur détectés via base locale - actions prioritaires.' : 'Aucun rappel constructeur direct détecté, mais vérification officielle recommandée via les liens ci-dessus.')} Une expertise professionnelle avec outillage spécifique est requise pour confirmer et réparer.</p></div>`;
    document.getElementById('aiConclusion').innerHTML = html;
}

// ============ RECALLS ============
function searchRecalls() {
    const search = document.getElementById('recallSearch').value.toLowerCase();
    const results = localRecallsDB.filter(r => (r.brand + ' ' + r.model).toLowerCase().includes(search));
    let html = '';
    if (results.length === 0) html = '<div class="alert alert-warning">Aucun rappel trouvé. Vérifiez sur rappel.gouv.fr</div>';
    else { html = '<div class="alert alert-success">✅ ' + results.length + ' résultat(s)</div>'; results.forEach(r => { html += `<div class="recall-card"><h4>🚨 ${r.brand} ${r.model} (${r.years})</h4><p><strong>Motorisation :</strong> ${r.engine}</p><p><strong>Catégorie :</strong> ${r.category}</p><p><strong>Problème :</strong> ${r.issue}</p><p><strong>TSB :</strong> ${r.tsb}</p><p>${r.desc}</p></div>`; }); }
    document.getElementById('recallResults').innerHTML = html;
}

// ============ ADMIN ============
async function loadAdminData() {
    if (!db) { const users = JSON.parse(localStorage.getItem('users') || '[]').filter(u => u.role !== 'admin'); renderTiersTable(users); document.getElementById('adminStats').innerHTML = '<div class="alert alert-warning">Mode Local</div>'; return; }
    try { const snapshot = await db.collection('users').get(); const users = []; snapshot.forEach(doc => { if (doc.data().role !== 'admin') users.push({ id: doc.id, ...doc.data() }); }); renderTiersTable(users); const authorized = users.filter(u => u.status === 'authorized').length; const refused = users.filter(u => u.status === 'refused').length; const pending = users.filter(u => u.status === 'pending').length; document.getElementById('adminStats').innerHTML = `<div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(150px,1fr));gap:10px"><div class="alert alert-success"><strong>✅ Autorisés :</strong> ${authorized}</div><div class="alert alert-danger"><strong>❌ Refusés :</strong> ${refused}</div><div class="alert alert-warning"><strong>⏳ En attente :</strong> ${pending}</div></div>`; } catch(e) { console.error(e); }
}

function renderTiersTable(users) {
    let html = '<table><thead><tr><th>Utilisateur</th><th>Date</th><th>Statut</th><th>Actions</th></tr></thead><tbody>';
    if (users.length === 0) html += '<tr><td colspan="4" style="text-align:center">Aucun tiers</td></tr>';
    else { users.forEach(u => { const statusClass = u.status === 'authorized' ? 'status-authorized' : u.status === 'refused' ? 'status-refused' : 'status-pending'; const statusText = u.status === 'authorized' ? '✅ Autorisé' : u.status === 'refused' ? '❌ Refusé' : ' En attente'; html += `<tr><td>${u.username}</td><td>${new Date(u.date).toLocaleDateString('fr-FR')}</td><td class="${statusClass}">${statusText}</td><td><button class="btn btn-success" onclick="setUserStatus('${u.id || u.username}','authorized')" style="padding:5px 10px;font-size:0.75em">Autoriser</button><button class="btn btn-danger" onclick="setUserStatus('${u.id || u.username}','refused')" style="padding:5px 10px;font-size:0.75em">Couper</button></td></tr>`; }); }
    html += '</tbody></table>'; document.getElementById('tiersTable').innerHTML = html;
}

async function setUserStatus(id, status) {
    if (db) { await db.collection('users').doc(id).update({ status }); alert(`✅ Statut mis à jour : ${status}`); loadAdminData(); }
    else { const users = JSON.parse(localStorage.getItem('users') || '[]'); const user = users.find(u => u.username === id); if (user) { user.status = status; localStorage.setItem('users', JSON.stringify(users)); alert('Mis à jour'); loadAdminData(); } }
}

// ============ HISTORY ============
function updateHistory() {
    const diagnostics = JSON.parse(localStorage.getItem('diagnostics') || '[]');
    let html = '';
    if (diagnostics.length === 0) html = '<div class="alert alert-info">Aucun diagnostic</div>';
    else { html = '<table><thead><tr><th>Date</th><th>Véhicule</th><th>Symptôme</th><th>Actions</th></tr></thead><tbody>'; diagnostics.slice().reverse().forEach(d => { html += `<tr><td>${new Date(d.date).toLocaleDateString('fr-FR')}</td><td>${d.vehicle.brand} ${d.vehicle.model}</td><td>${d.symptoms.substring(0, 40)}...</td><td><button class="btn btn-primary" onclick="loadDiagnostic(${d.id})" style="padding:5px 10px;font-size:0.75em">Voir</button></td></tr>`; }); html += '</tbody></table>'; }
    document.getElementById('historyContent').innerHTML = html;
}

function loadDiagnostic(id) { currentDiagnostic = JSON.parse(localStorage.getItem('diagnostics') || '[]').find(d => d.id === id); if (currentDiagnostic) { showSection('analysis'); generateAIAnalysis(); } }

// ============ PARTAGE AVEC GUIDE INSTALLATION ============
function shareBySMS() {
    const number = document.getElementById('shareSmsNumber').value;
    if (!number) { alert('Numéro requis'); return; }
    const message = `Bonjour,\n\nVoici l'application "Aide au diagnostic by Kevin" - Outil professionnel de diagnostic automobile avec IA.\n\n Lien : https://expertkevin06-cell.github.io/aide-diagnostic/\n\n📱 INSTALLATION (30 secondes) :\n1. Ouvrez le lien dans Chrome\n2. Appuyez sur les 3 points ⋮ en haut à droite\n3. Cliquez sur "Installer l'application"\n4. L'icône apparaît sur votre écran d'accueil\n\n🔐 Pour utiliser l'app, cliquez sur "Demander un accès" et créez vos identifiants. Je validerai votre demande.\n\nCordialement,\nKevin`;
    window.open(`sms:${number}?body=${encodeURIComponent(message)}`);
}

function shareByEmail() {
    const email = document.getElementById('shareEmail').value;
    if (!email) { alert('Email requis'); return; }
    const subject = 'Application Aide au diagnostic by Kevin';
    const body = `Bonjour,\n\nJe vous partage l'application "Aide au diagnostic by Kevin" - Outil professionnel de diagnostic automobile avec IA et rappels constructeur.\n\n🔗 Lien : https://expertkevin06-cell.github.io/aide-diagnostic/\n\n📱 INSTALLATION (30 secondes) :\n\nSur Android (Chrome) :\n1. Ouvrez le lien dans Chrome\n2. Appuyez sur les 3 points ⋮ en haut à droite\n3. Cliquez sur "Installer l'application"\n4. L'icône apparaît sur votre écran d'accueil\n\nSur iPhone (Safari) :\n1. Ouvrez le lien dans Safari\n2. Appuyez sur le bouton Partager (carré avec flèche)\n3. Cliquez sur "Sur l'écran d'accueil"\n4. Confirmez\n\n🔐 Pour utiliser l'app :\n- Cliquez sur "Demander un accès"\n- Créez vos identifiants\n- J'autoriserai votre demande\n\nCordialement,\nKevin`;
    window.open(`mailto:${email}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`);
}

function copyLink() { const link = document.getElementById('shareLink'); link.select(); document.execCommand('copy'); alert('✅ Lien copié !'); }
function copyInstallLink() { const link = document.getElementById('installLink'); link.select(); document.execCommand('copy'); alert('✅ Lien d\'installation copié ! Envoyez-le à vos tiers.'); }

// ============ INIT ============
window.addEventListener('DOMContentLoaded', function() {
    initQCM();
    if ('serviceWorker' in navigator) navigator.serviceWorker.register('sw.js').catch(e => console.log('SW:', e));
    console.log(`✅ Base de données: ${localRecallsDB.length} rappels 2017-2026 chargés`);
    console.log(`✅ Décodage VIN disponible`);
    console.log(`✅ Recherche rappels par VIN disponible (NHTSA + base locale)`);
    console.log(`✅ Installation PWA prête`);
    
    // Vérifier si lien d'installation direct
    if (window.location.search.includes('install=1')) {
        setTimeout(() => { alert('📱 Pour installer l\'application :\n\n1. Appuyez sur les 3 points ⋮ en haut de Chrome\n2. Cliquez sur "Installer l\'application"\n3. L\'icône apparaîtra sur votre écran d\'accueil'); }, 1000);
    }
});
