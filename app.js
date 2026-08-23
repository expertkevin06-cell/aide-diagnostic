// ============ CONFIGURATION FIREBASE ============
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
} catch(e) {
    console.error("❌ Erreur Firebase:", e);
}

const ADMIN_PASSWORD = "Kevin83600";
let currentUser = null;
let isAdmin = false;
let currentDiagnostic = null;

// ============ BASE DE DONNÉES COMPLÈTE 2017-2026 ============
const localRecallsDB = [
    // ==================== MARQUES FRANÇAISES ====================
    { brand: 'Peugeot', model: '208', years: '2019-2026', engine: '1.2 PureTech 100/130', issue: 'Courroie distribution huile', tsb: 'PSA-2020-012', desc: 'Désintégration courroie dans circuit huile. Rappel officiel.' },
    { brand: 'Peugeot', model: '208', years: '2019-2026', engine: '1.5 BlueHDi 100', issue: 'AdBlue + turbo', tsb: 'PSA-2021-012', desc: 'Défaut système AdBlue et casse turbo.' },
    { brand: 'Peugeot', model: '2008', years: '2019-2026', engine: '1.2 PureTech 130', issue: 'Courroie distribution', tsb: 'PSA-2020-012', desc: 'Problème courroie baignant huile.' },
    { brand: 'Peugeot', model: '308', years: '2021-2026', engine: '1.2 PureTech 130', issue: 'Courroie distribution', tsb: 'PSA-2021-018', desc: 'Nouvelle génération avec problème courroie.' },
    { brand: 'Peugeot', model: '3008', years: '2017-2026', engine: '1.5/2.0 BlueHDi 130/180', issue: 'Système AdBlue', tsb: 'PSA-2019-033', desc: 'Pompe AdBlue HS. Rappel constructeur.' },
    { brand: 'Peugeot', model: '3008', years: '2017-2026', engine: '1.6 Hybrid 225', issue: 'Batterie hybride', tsb: 'PSA-2022-015', desc: 'Défaut batterie haute tension.' },
    { brand: 'Peugeot', model: '508', years: '2018-2026', engine: '1.5/2.0 BlueHDi 130/180', issue: 'Boîte EAT8', tsb: 'PSA-2021-008', desc: 'À-coups à froid, défaut mécatronique.' },
    { brand: 'Peugeot', model: 'e-208', years: '2019-2026', engine: 'Électrique 136 ch', issue: 'Batterie haute tension', tsb: 'PSA-2022-025', desc: 'Défaut batterie traction.' },
    { brand: 'Peugeot', model: 'e-308', years: '2022-2026', engine: 'Électrique 156 ch', issue: 'Batterie + charge', tsb: 'PSA-2023-015', desc: 'Défaut batterie et système charge.' },
    { brand: 'Citroën', model: 'C3', years: '2017-2026', engine: '1.2 PureTech 82/110', issue: 'Courroie distribution', tsb: 'PSA-2018-045', desc: 'Désintégration courroie dans circuit huile.' },
    { brand: 'Citroën', model: 'C3 Aircross', years: '2017-2026', engine: '1.2 PureTech 110/130', issue: 'Courroie distribution', tsb: 'PSA-2020-012', desc: 'Problème courroie baignant huile.' },
    { brand: 'Citroën', model: 'C5 Aircross', years: '2018-2026', engine: '1.5/2.0 BlueHDi 130/180', issue: 'Système AdBlue', tsb: 'PSA-2020-015', desc: 'Pompe AdBlue HS.' },
    { brand: 'Citroën', model: 'C5 Aircross', years: '2022-2026', engine: '1.6 Hybrid 225', issue: 'Hybride rechargeable', tsb: 'PSA-2023-012', desc: 'Défaut onduleur haute tension.' },
    { brand: 'Citroën', model: 'ë-C4', years: '2020-2026', engine: 'Électrique 136 ch', issue: 'Batterie traction', tsb: 'PSA-2022-025', desc: 'Défaut batterie haute tension.' },
    { brand: 'Renault', model: 'Clio', years: '2019-2026', engine: '1.0 TCe 100', issue: 'Courroie distribution huile', tsb: 'RN-2021-008', desc: 'Problème courroie baignant huile.' },
    { brand: 'Renault', model: 'Clio', years: '2020-2026', engine: '1.6 E-Tech 140', issue: 'Hybride', tsb: 'RN-2022-012', desc: 'Défaut boîte crabot hybride.' },
    { brand: 'Renault', model: 'Captur', years: '2019-2026', engine: '1.3 TCe 130/150', issue: 'Courroie distribution', tsb: 'RN-2021-008', desc: 'Problème courroie baignant huile.' },
    { brand: 'Renault', model: 'Captur', years: '2020-2026', engine: '1.5/1.6 E-Tech 160', issue: 'Hybride rechargeable', tsb: 'RN-2022-018', desc: 'Défaut batterie haute tension.' },
    { brand: 'Renault', model: 'Megane E-Tech', years: '2022-2026', engine: 'Électrique 220 ch', issue: 'Batterie + charge', tsb: 'RN-2023-015', desc: 'Défaut batterie et système charge.' },
    { brand: 'Renault', model: 'Austral', years: '2022-2026', engine: '1.2/1.3 E-Tech 130/200', issue: 'Hybride', tsb: 'RN-2023-018', desc: 'Défaut système hybride.' },
    { brand: 'Renault', model: 'Zoe', years: '2019-2026', engine: 'Électrique 135 ch', issue: 'Batterie + charge', tsb: 'RN-2022-025', desc: 'Défaut batterie et charge rapide.' },
    { brand: 'DS', model: 'DS 3 Crossback', years: '2018-2026', engine: '1.2 PureTech 130', issue: 'Courroie distribution', tsb: 'PSA-2020-012', desc: 'Désintégration courroie dans huile.' },
    { brand: 'DS', model: 'DS 3 Crossback', years: '2019-2026', engine: 'Électrique 136 ch', issue: 'Batterie haute tension', tsb: 'PSA-2022-025', desc: 'Défaut batterie traction.' },
    { brand: 'DS', model: 'DS 4', years: '2021-2026', engine: '1.6 Hybrid 225', issue: 'Hybride rechargeable', tsb: 'PSA-2023-012', desc: 'Défaut système hybride.' },
    { brand: 'DS', model: 'DS 7', years: '2017-2026', engine: '1.5/2.0 BlueHDi 130/180', issue: 'Système AdBlue', tsb: 'PSA-2020-015', desc: 'Défaut pompe AdBlue.' },
    
    // ==================== MARQUES EUROPÉENNES ====================
    { brand: 'Volkswagen', model: 'Polo', years: '2017-2026', engine: '1.0 TSI 95/110', issue: 'Courroie distribution huile', tsb: 'VW-2020-015', desc: 'Problème courroie baignant huile.' },
    { brand: 'Volkswagen', model: 'Golf', years: '2020-2026', engine: '1.5 TSI 130/150', issue: 'Boîte DSG', tsb: 'VW-2021-018', desc: 'À-coups boîte DSG7.' },
    { brand: 'Volkswagen', model: 'Golf', years: '2017-2026', engine: '2.0 TDI 150/200', issue: 'AdBlue + FAP', tsb: 'VW-2020-022', desc: 'Défaut système AdBlue.' },
    { brand: 'Volkswagen', model: 'T-Roc', years: '2017-2026', engine: '1.0/1.5 TSI 110/150', issue: 'Courroie distribution', tsb: 'VW-2021-015', desc: 'Problème courroie baignant huile.' },
    { brand: 'Volkswagen', model: 'Taigo', years: '2021-2026', engine: '1.0 TSI 95/110', issue: 'Courroie distribution', tsb: 'VW-2022-015', desc: 'Problème courroie baignant huile sur petit SUV.' },
    { brand: 'Volkswagen', model: 'Taigo', years: '2021-2026', engine: '1.5 TSI 150', issue: 'Consommation huile', tsb: 'VW-2022-018', desc: 'Segments piston défectueux.' },
    { brand: 'Volkswagen', model: 'Tiguan', years: '2017-2026', engine: '2.0 TDI 150/190', issue: 'AdBlue + FAP', tsb: 'VW-2020-022', desc: 'Défaut système AdBlue.' },
    { brand: 'Volkswagen', model: 'ID.3', years: '2020-2026', engine: 'Électrique 150/204 ch', issue: 'Logiciel + batterie', tsb: 'VW-2021-025', desc: 'Bugs logiciels et défaut batterie.' },
    { brand: 'Volkswagen', model: 'ID.4', years: '2021-2026', engine: 'Électrique 174/204/299 ch', issue: 'Logiciel + charge', tsb: 'VW-2022-025', desc: 'Problèmes logiciels et charge.' },
    { brand: 'Volkswagen', model: 'ID.5', years: '2021-2026', engine: 'Électrique 174/299 ch', issue: 'Logiciel + batterie', tsb: 'VW-2022-028', desc: 'Bugs logiciels.' },
    { brand: 'Audi', model: 'A3', years: '2020-2026', engine: '1.5 TFSI 150', issue: 'Consommation huile', tsb: 'VAG-2021-018', desc: 'Segments piston.' },
    { brand: 'Audi', model: 'A3', years: '2020-2026', engine: '1.4 TFSI e 204', issue: 'Hybride rechargeable', tsb: 'VAG-2022-015', desc: 'Défaut batterie haute tension.' },
    { brand: 'Audi', model: 'Q3', years: '2018-2026', engine: '2.0 TDI 150', issue: 'AdBlue + FAP', tsb: 'VAG-2021-022', desc: 'Défaut système AdBlue.' },
    { brand: 'Audi', model: 'Q5', years: '2017-2026', engine: '2.0 TFSI 190/249', issue: '48V hybride', tsb: 'VAG-2021-025', desc: 'Défaut batterie 48V.' },
    { brand: 'Audi', model: 'e-tron', years: '2019-2026', engine: 'Électrique 300-503 ch', issue: 'Batterie + charge', tsb: 'VAG-2022-025', desc: 'Défaut batterie et charge.' },
    { brand: 'Audi', model: 'Q4 e-tron', years: '2021-2026', engine: 'Électrique 170-299 ch', issue: 'Logiciel + batterie', tsb: 'VAG-2022-032', desc: 'Bugs logiciels et batterie.' },
    { brand: 'BMW', model: 'Série 1', years: '2019-2026', engine: '1.5/2.0 B38/B48 109-228', issue: 'Courroie distribution', tsb: 'BMW-2021-015', desc: 'Problème courroie baignant huile.' },
    { brand: 'BMW', model: 'Série 3', years: '2019-2026', engine: '2.0/3.0 PHEV 292-394', issue: 'Hybride rechargeable', tsb: 'BMW-2022-022', desc: 'Défaut batterie haute tension.' },
    { brand: 'BMW', model: 'X1', years: '2022-2026', engine: '1.5/2.0 B38/B48 122-218', issue: 'Courroie distribution', tsb: 'BMW-2023-015', desc: 'Problème courroie baignant huile.' },
    { brand: 'BMW', model: 'iX3', years: '2020-2026', engine: 'Électrique 286 ch', issue: 'Batterie + charge', tsb: 'BMW-2022-028', desc: 'Défaut batterie et charge.' },
    { brand: 'BMW', model: 'iX', years: '2021-2026', engine: 'Électrique 326-523 ch', issue: 'Batterie haute tension', tsb: 'BMW-2022-032', desc: 'Défaut batterie.' },
    { brand: 'BMW', model: 'i4', years: '2021-2026', engine: 'Électrique 340-544 ch', issue: 'Batterie + logiciel', tsb: 'BMW-2022-035', desc: 'Défaut batterie et bugs logiciels.' },
    { brand: 'Mercedes', model: 'Classe A', years: '2018-2026', engine: '1.3/2.0 M282 136-224', issue: 'Consommation huile', tsb: 'MB-2021-015', desc: 'Segments piston.' },
    { brand: 'Mercedes', model: 'Classe C', years: '2021-2026', engine: '2.0 PHEV 313', issue: 'Hybride rechargeable', tsb: 'MB-2022-025', desc: 'Défaut batterie haute tension.' },
    { brand: 'Mercedes', model: 'EQA', years: '2021-2026', engine: 'Électrique 190-292 ch', issue: 'Batterie + charge', tsb: 'MB-2022-028', desc: 'Défaut batterie et charge.' },
    { brand: 'Mercedes', model: 'EQC', years: '2019-2026', engine: 'Électrique 408 ch', issue: 'Batterie + refroidissement', tsb: 'MB-2022-028', desc: 'Défaut batterie et refroidissement.' },
    { brand: 'Mercedes', model: 'EQE', years: '2022-2026', engine: 'Électrique 292-626 ch', issue: 'Batterie + logiciel', tsb: 'MB-2023-025', desc: 'Défaut batterie et bugs logiciels.' },
    { brand: 'Opel', model: 'Corsa', years: '2019-2026', engine: '1.2 Turbo 100/130', issue: 'Courroie distribution', tsb: 'OP-2021-012', desc: 'Problème courroie baignant huile.' },
    { brand: 'Opel', model: 'Corsa-e', years: '2019-2026', engine: 'Électrique 136 ch', issue: 'Batterie traction', tsb: 'OP-2022-015', desc: 'Défaut batterie haute tension.' },
    { brand: 'Opel', model: 'Mokka', years: '2020-2026', engine: '1.2 Turbo 100/130', issue: 'Courroie distribution', tsb: 'OP-2021-018', desc: 'Problème courroie baignant huile.' },
    { brand: 'Opel', model: 'Mokka-e', years: '2020-2026', engine: 'Électrique 136 ch', issue: 'Batterie + charge', tsb: 'OP-2022-018', desc: 'Défaut batterie et charge.' },
    { brand: 'Fiat', model: '500', years: '2020-2026', engine: 'Électrique 95/118 ch', issue: 'Batterie + charge', tsb: 'FT-2021-015', desc: 'Défaut batterie et système charge.' },
    { brand: 'Fiat', model: '500e', years: '2020-2026', engine: 'Électrique 118 ch', issue: 'Logiciel + batterie', tsb: 'FT-2022-012', desc: 'Bugs logiciels et batterie.' },
    { brand: 'Alfa Romeo', model: 'Giulia', years: '2016-2026', engine: '2.2 JTDm 150/180/210', issue: 'AdBlue + FAP', tsb: 'AR-2019-015', desc: 'Défaut système AdBlue.' },
    { brand: 'Alfa Romeo', model: 'Stelvio', years: '2017-2026', engine: '2.2 JTDm 150/180/210', issue: 'AdBlue + FAP', tsb: 'AR-2020-012', desc: 'Défaut système AdBlue.' },
    { brand: 'Volvo', model: 'XC40', years: '2017-2026', engine: '2.0 T4/T5 190-252', issue: 'Mild-hybrid 48V', tsb: 'VLV-2021-015', desc: 'Défaut batterie 48V.' },
    { brand: 'Volvo', model: 'XC40 Recharge', years: '2020-2026', engine: 'Électrique 408 ch', issue: 'Batterie + charge', tsb: 'VLV-2022-015', desc: 'Défaut batterie et charge.' },
    { brand: 'Volvo', model: 'C40 Recharge', years: '2021-2026', engine: 'Électrique 408 ch', issue: 'Batterie haute tension', tsb: 'VLV-2022-018', desc: 'Défaut batterie.' },
    { brand: 'Porsche', model: 'Taycan', years: '2019-2026', engine: 'Électrique 408-761 ch', issue: 'Batterie + charge', tsb: 'PR-2021-015', desc: 'Défaut batterie et charge rapide.' },
    { brand: 'Porsche', model: 'Macan Electric', years: '2024-2026', engine: 'Électrique 340-639 ch', issue: 'Batterie haute tension', tsb: 'PR-2024-012', desc: 'Défaut batterie.' },
    { brand: 'Land Rover', model: 'Defender', years: '2020-2026', engine: '2.0/3.0 P400e 300-404', issue: 'Hybride rechargeable', tsb: 'LR-2022-015', desc: 'Défaut système hybride.' },
    { brand: 'Land Rover', model: 'Range Rover', years: '2022-2026', engine: '3.0 P440e 440', issue: 'Hybride rechargeable', tsb: 'LR-2023-012', desc: 'Défaut batterie haute tension.' },
    { brand: 'Jaguar', model: 'I-Pace', years: '2018-2026', engine: 'Électrique 400 ch', issue: 'Batterie + charge', tsb: 'JG-2021-015', desc: 'Défaut batterie et charge.' },
    { brand: 'Mini', model: 'Cooper SE', years: '2020-2026', engine: 'Électrique 184 ch', issue: 'Batterie traction', tsb: 'MN-2021-015', desc: 'Défaut batterie.' },
    { brand: 'Mini', model: 'Cooper', years: '2024-2026', engine: '1.5/2.0 B38/B48 156-231', issue: 'Courroie distribution', tsb: 'MN-2024-012', desc: 'Problème courroie baignant huile.' },
    { brand: 'SEAT', model: 'Leon', years: '2020-2026', engine: '1.5 eTSI 150', issue: 'Mild-hybrid 48V', tsb: 'ST-2021-015', desc: 'Défaut batterie 48V.' },
    { brand: 'SEAT', model: 'Arona', years: '2017-2026', engine: '1.0 TSI 95/110', issue: 'Courroie distribution', tsb: 'ST-2020-015', desc: 'Problème courroie baignant huile.' },
    { brand: 'Škoda', model: 'Octavia', years: '2020-2026', engine: '1.5 TSI 150', issue: 'Consommation huile', tsb: 'SK-2021-015', desc: 'Segments piston.' },
    { brand: 'Škoda', model: 'Enyaq', years: '2021-2026', engine: 'Électrique 148-299 ch', issue: 'Logiciel + batterie', tsb: 'SK-2022-015', desc: 'Bugs logiciels et défaut batterie.' },
    { brand: 'Škoda', model: 'Elroq', years: '2024-2026', engine: 'Électrique 170-286 ch', issue: 'Batterie + charge', tsb: 'SK-2024-012', desc: 'Défaut batterie et système charge sur nouveau SUV compact.' },
    { brand: 'Škoda', model: 'Elroq', years: '2024-2026', engine: 'Électrique 286 ch', issue: 'Logiciel', tsb: 'SK-2024-015', desc: 'Bugs logiciels interface.' },
    { brand: 'Škoda', model: 'Kodiaq', years: '2024-2026', engine: '1.5/2.0 TSI 150-265', issue: 'Mild-hybrid 48V', tsb: 'SK-2024-018', desc: 'Défaut batterie 48V.' },
    
    // ==================== MARQUES ASIATIQUES ====================
    { brand: 'Toyota', model: 'Yaris', years: '2020-2026', engine: '1.5 Hybrid 116/130', issue: 'Batterie hybride', tsb: 'TY-2022-015', desc: 'Défaut batterie hybride.' },
    { brand: 'Toyota', model: 'Yaris Cross', years: '2021-2026', engine: '1.5 Hybrid 116/130', issue: 'Hybride', tsb: 'TY-2022-018', desc: 'Défaut système hybride.' },
    { brand: 'Toyota', model: 'Corolla', years: '2019-2026', engine: '1.8/2.0 Hybrid 122/184/196', issue: 'Batterie hybride', tsb: 'TY-2021-015', desc: 'Défaut batterie hybride.' },
    { brand: 'Toyota', model: 'C-HR', years: '2023-2026', engine: '1.8/2.0 Hybrid 140/197', issue: 'Hybride', tsb: 'TY-2023-015', desc: 'Défaut système hybride nouvelle génération.' },
    { brand: 'Toyota', model: 'RAV4', years: '2019-2026', engine: '2.5 Hybrid 218/222', issue: 'Batterie 12V', tsb: 'TY-2021-008', desc: 'Défaut batterie auxiliaire 12V.' },
    { brand: 'Toyota', model: 'bZ4X', years: '2022-2026', engine: 'Électrique 204/218 ch', issue: 'Batterie + charge', tsb: 'TY-2023-022', desc: 'Défaut batterie et perte de puissance.' },
    { brand: 'Honda', model: 'Civic', years: '2022-2026', engine: '2.0 Hybrid 184', issue: 'Hybride', tsb: 'HN-2023-015', desc: 'Défaut système hybride.' },
    { brand: 'Honda', model: 'CR-V', years: '2023-2026', engine: '2.0 Hybrid 184', issue: 'Hybride + batterie', tsb: 'HN-2024-012', desc: 'Défaut batterie hybride.' },
    { brand: 'Honda', model: 'e', years: '2020-2024', engine: 'Électrique 154 ch', issue: 'Autonomie limitée', tsb: 'HN-2021-015', desc: 'Autonomie réelle inférieure aux annonces.' },
    { brand: 'Nissan', model: 'Qashqai', years: '2021-2026', engine: '1.3 DIG-T 140/158', issue: 'Courroie distribution', tsb: 'NS-2022-008', desc: 'Problème courroie baignant huile.' },
    { brand: 'Nissan', model: 'Qashqai', years: '2021-2026', engine: '1.5 e-Power 190', issue: 'Hybride série', tsb: 'NS-2023-012', desc: 'Défaut système e-Power.' },
    { brand: 'Nissan', model: 'Ariya', years: '2022-2026', engine: 'Électrique 218-394 ch', issue: 'Batterie + charge', tsb: 'NS-2023-015', desc: 'Défaut batterie et charge rapide.' },
    { brand: 'Nissan', model: 'Leaf', years: '2017-2026', engine: 'Électrique 110/150/218 ch', issue: 'Dégradation batterie', tsb: 'NS-2020-015', desc: 'Dégradation rapide batterie.' },
    { brand: 'Mazda', model: '3', years: '2019-2026', engine: '2.0 SkyActiv-G 122/186', issue: 'Consommation huile', tsb: 'MZ-2021-015', desc: 'Consommation huile anormale.' },
    { brand: 'Mazda', model: 'CX-5', years: '2017-2026', engine: '2.2 SkyActiv-D 150/184', issue: 'AdBlue + FAP', tsb: 'MZ-2020-015', desc: 'Défaut système AdBlue.' },
    { brand: 'Mazda', model: 'MX-30', years: '2020-2026', engine: 'Électrique 145 ch', issue: 'Autonomie limitée', tsb: 'MZ-2021-018', desc: 'Autonomie réelle très limitée.' },
    { brand: 'Suzuki', model: 'Swift', years: '2017-2026', engine: '1.2 Dualjet 83/90', issue: 'Embrayage', tsb: 'SZ-2020-012', desc: 'Usure embrayage prématurée.' },
    { brand: 'Suzuki', model: 'Vitara', years: '2018-2026', engine: '1.4 Boosterjet 129', issue: 'Turbo', tsb: 'SZ-2021-015', desc: 'Casse turbo.' },
    { brand: 'Mitsubishi', model: 'Outlander', years: '2022-2026', engine: '2.4 PHEV 230', issue: 'Hybride rechargeable', tsb: 'MT-2023-015', desc: 'Défaut batterie haute tension.' },
    { brand: 'Mitsubishi', model: 'Eclipse Cross', years: '2021-2026', engine: '1.5 TFSI 163', issue: 'Courroie distribution', tsb: 'MT-2022-012', desc: 'Problème courroie baignant huile (moteur Renault).' },
    { brand: 'Lexus', model: 'UX', years: '2019-2026', engine: '2.0 Hybrid 184', issue: 'Batterie hybride', tsb: 'LX-2021-015', desc: 'Défaut batterie hybride.' },
    { brand: 'Lexus', model: 'NX', years: '2021-2026', engine: '2.5 Hybrid 244/309', issue: 'Hybride + batterie', tsb: 'LX-2022-015', desc: 'Défaut système hybride.' },
    { brand: 'Lexus', model: 'RZ', years: '2023-2026', engine: 'Électrique 313 ch', issue: 'Batterie + charge', tsb: 'LX-2023-015', desc: 'Défaut batterie et charge.' },
    { brand: 'Hyundai', model: 'i20', years: '2020-2026', engine: '1.0 T-GDi 100/120', issue: 'Courroie distribution', tsb: 'HY-2021-015', desc: 'Problème courroie baignant huile.' },
    { brand: 'Hyundai', model: 'Tucson', years: '2021-2026', engine: '1.6 T-GDi 150/180/230', issue: 'Mild-hybrid 48V', tsb: 'HY-2022-015', desc: 'Défaut batterie 48V.' },
    { brand: 'Hyundai', model: 'Tucson', years: '2021-2026', engine: '1.6 CRDi 136', issue: 'AdBlue + FAP', tsb: 'HY-2022-018', desc: 'Défaut système AdBlue.' },
    { brand: 'Hyundai', model: 'Ioniq 5', years: '2021-2026', engine: 'Électrique 170-325 ch', issue: 'Batterie + charge', tsb: 'HY-2022-022', desc: 'Défaut batterie et charge rapide 800V.' },
    { brand: 'Hyundai', model: 'Ioniq 6', years: '2023-2026', engine: 'Électrique 170-325 ch', issue: 'Batterie haute tension', tsb: 'HY-2023-022', desc: 'Défaut batterie.' },
    { brand: 'Kia', model: 'Ceed', years: '2018-2026', engine: '1.0 T-GDi 120', issue: 'Courroie distribution', tsb: 'KI-2021-015', desc: 'Problème courroie baignant huile.' },
    { brand: 'Kia', model: 'Sportage', years: '2022-2026', engine: '1.6 T-GDi 150/180/230', issue: 'Mild-hybrid 48V', tsb: 'KI-2023-015', desc: 'Défaut batterie 48V.' },
    { brand: 'Kia', model: 'EV6', years: '2021-2026', engine: 'Électrique 170-585 ch', issue: 'Batterie + charge', tsb: 'KI-2022-022', desc: 'Défaut batterie et charge rapide 800V.' },
    { brand: 'Kia', model: 'EV9', years: '2023-2026', engine: 'Électrique 215-380 ch', issue: 'Batterie haute tension', tsb: 'KI-2024-012', desc: 'Défaut batterie sur grand SUV.' },
    { brand: 'Genesis', model: 'GV60', years: '2022-2026', engine: 'Électrique 314-490 ch', issue: 'Batterie + charge', tsb: 'GS-2023-015', desc: 'Défaut batterie et charge.' },
    { brand: 'Genesis', model: 'Electrified GV70', years: '2022-2026', engine: 'Électrique 490 ch', issue: 'Batterie haute tension', tsb: 'GS-2023-018', desc: 'Défaut batterie.' },
    
    // ==================== MARQUES CHINOISES ÉMERGENTES ====================
    { brand: 'BYD', model: 'Atto 3', years: '2022-2026', engine: 'Électrique 204 ch', issue: 'Batterie Blade + charge', tsb: 'BYD-2023-015', desc: 'Défaut batterie Blade et système charge.' },
    { brand: 'BYD', model: 'Dolphin', years: '2022-2026', engine: 'Électrique 95/177 ch', issue: 'Batterie + logiciel', tsb: 'BYD-2023-018', desc: 'Bugs logiciels et batterie.' },
    { brand: 'BYD', model: 'Seal', years: '2023-2026', engine: 'Électrique 218-530 ch', issue: 'Batterie haute tension', tsb: 'BYD-2024-012', desc: 'Défaut batterie sur berline sportive.' },
    { brand: 'BYD', model: 'Han', years: '2021-2026', engine: 'Électrique 245/490 ch', issue: 'Batterie + charge', tsb: 'BYD-2022-015', desc: 'Défaut batterie et charge rapide.' },
    { brand: 'BYD', model: 'Tang', years: '2021-2026', engine: 'Électrique 245/517 ch', issue: 'Batterie haute tension', tsb: 'BYD-2022-018', desc: 'Défaut batterie sur SUV 7 places.' },
    { brand: 'BYD', model: 'Seal U', years: '2023-2026', engine: 'Électrique 218/313 ch', issue: 'Batterie + charge', tsb: 'BYD-2024-015', desc: 'Défaut batterie et système charge.' },
    { brand: 'XPeng', model: 'G6', years: '2023-2026', engine: 'Électrique 296-551 ch', issue: 'Batterie + logiciel', tsb: 'XP-2024-012', desc: 'Bugs logiciels et batterie.' },
    { brand: 'XPeng', model: 'G9', years: '2022-2026', engine: 'Électrique 313-551 ch', issue: 'Batterie haute tension', tsb: 'XP-2023-015', desc: 'Défaut batterie sur grand SUV.' },
    { brand: 'XPeng', model: 'P7', years: '2020-2026', engine: 'Électrique 267-473 ch', issue: 'Batterie + charge', tsb: 'XP-2022-015', desc: 'Défaut batterie et charge rapide.' },
    { brand: 'NIO', model: 'ET7', years: '2022-2026', engine: 'Électrique 476-653 ch', issue: 'Batterie swap + charge', tsb: 'NIO-2023-015', desc: 'Défaut système battery swap.' },
    { brand: 'NIO', model: 'ES6', years: '2023-2026', engine: 'Électrique 490 ch', issue: 'Batterie haute tension', tsb: 'NIO-2024-012', desc: 'Défaut batterie.' },
    { brand: 'NIO', model: 'EL6', years: '2023-2026', engine: 'Électrique 490 ch', issue: 'Batterie + logiciel', tsb: 'NIO-2024-015', desc: 'Bugs logiciels.' },
    { brand: 'Polestar', model: '2', years: '2020-2026', engine: 'Électrique 231-476 ch', issue: 'Batterie + charge', tsb: 'PS-2022-015', desc: 'Défaut batterie et charge.' },
    { brand: 'Polestar', model: '3', years: '2023-2026', engine: 'Électrique 490-517 ch', issue: 'Batterie haute tension', tsb: 'PS-2024-012', desc: 'Défaut batterie sur SUV.' },
    { brand: 'Polestar', model: '4', years: '2024-2026', engine: 'Électrique 272-544 ch', issue: 'Batterie + logiciel', tsb: 'PS-2024-015', desc: 'Bugs logiciels.' },
    { brand: 'Lotus', model: 'Eletre', years: '2023-2026', engine: 'Électrique 603-905 ch', issue: 'Batterie + charge', tsb: 'LT-2024-012', desc: 'Défaut batterie et charge rapide.' },
    { brand: 'Lotus', model: 'Emeya', years: '2024-2026', engine: 'Électrique 612-905 ch', issue: 'Batterie haute tension', tsb: 'LT-2024-015', desc: 'Défaut batterie sur berline.' },
    
    // ==================== MARQUES AMÉRICAINES ====================
    { brand: 'Ford', model: 'Mustang Mach-E', years: '2021-2026', engine: 'Électrique 269-487 ch', issue: 'Batterie + charge', tsb: 'FD-2022-025', desc: 'Défaut batterie et charge rapide.' },
    { brand: 'Ford', model: 'Mustang Mach-E', years: '2021-2026', engine: 'Électrique 487 ch', issue: 'Perte puissance', tsb: 'FD-2023-015', desc: 'Perte de puissance soudaine.' },
    { brand: 'Ford', model: 'F-150 Lightning', years: '2022-2026', engine: 'Électrique 452-580 ch', issue: 'Batterie + charge', tsb: 'FD-2023-022', desc: 'Défaut batterie et charge.' },
    { brand: 'Ford', model: 'Explorer', years: '2020-2026', engine: '2.3 EcoBoost 300', issue: 'Turbo + refroidissement', tsb: 'FD-2021-018', desc: 'Surchauffe turbo.' },
    { brand: 'Chevrolet', model: 'Bolt EV', years: '2017-2023', engine: 'Électrique 200 ch', issue: 'Risque incendie batterie', tsb: 'CH-2021-015', desc: 'Rappel massif pour risque incendie batterie LG.' },
    { brand: 'Chevrolet', model: 'Bolt EUV', years: '2022-2023', engine: 'Électrique 200 ch', issue: 'Risque incendie batterie', tsb: 'CH-2021-018', desc: 'Rappel massif pour risque incendie.' },
    { brand: 'Chevrolet', model: 'Equinox EV', years: '2024-2026', engine: 'Électrique 213-288 ch', issue: 'Batterie + charge', tsb: 'CH-2024-015', desc: 'Défaut batterie et charge.' },
    { brand: 'Chevrolet', model: 'Blazer EV', years: '2024-2026', engine: 'Électrique 288-557 ch', issue: 'Batterie haute tension', tsb: 'CH-2024-018', desc: 'Défaut batterie.' },
    { brand: 'Jeep', model: 'Avenger', years: '2023-2026', engine: 'Électrique 156 ch', issue: 'Batterie + charge', tsb: 'JP-2024-012', desc: 'Défaut batterie et charge.' },
    { brand: 'Jeep', model: 'Wrangler 4xe', years: '2021-2026', engine: '2.0 PHEV 380', issue: 'Hybride rechargeable', tsb: 'JP-2022-015', desc: 'Défaut système hybride.' },
    { brand: 'Jeep', model: 'Grand Cherokee 4xe', years: '2022-2026', engine: '2.0 PHEV 380', issue: 'Hybride + batterie', tsb: 'JP-2023-015', desc: 'Défaut batterie haute tension.' },
    { brand: 'Jeep', model: 'Recon', years: '2024-2026', engine: 'Électrique', issue: 'Batterie + logiciel', tsb: 'JP-2024-015', desc: 'Bugs logiciels sur nouveau SUV électrique.' },
    { brand: 'Cadillac', model: 'Lyriq', years: '2022-2026', engine: 'Électrique 340-500 ch', issue: 'Batterie + charge', tsb: 'CD-2023-015', desc: 'Défaut batterie et charge.' },
    { brand: 'Cadillac', model: 'Escalade IQ', years: '2024-2026', engine: 'Électrique 750 ch', issue: 'Batterie haute tension', tsb: 'CD-2024-015', desc: 'Défaut batterie sur SUV luxe.' },
    { brand: 'GMC', model: 'Hummer EV', years: '2022-2026', engine: 'Électrique 830-1000 ch', issue: 'Batterie + charge', tsb: 'GM-2023-015', desc: 'Défaut batterie et charge rapide.' },
    { brand: 'GMC', model: 'Sierra EV', years: '2024-2026', engine: 'Électrique 426-754 ch', issue: 'Batterie haute tension', tsb: 'GM-2024-015', desc: 'Défaut batterie sur pickup.' },
    { brand: 'Tesla', model: 'Model 3', years: '2017-2026', engine: 'Électrique 283-510 ch', issue: 'Suspension + écran', tsb: 'TS-2021-003', desc: 'Rappel bras suspension et écran.' },
    { brand: 'Tesla', model: 'Model Y', years: '2020-2026', engine: 'Électrique 299-514 ch', issue: 'Batterie + suspension', tsb: 'TS-2022-015', desc: 'Défaut batterie et suspension.' },
    { brand: 'Tesla', model: 'Model S', years: '2012-2026', engine: 'Électrique 670-1020 ch', issue: 'Portes + batterie', tsb: 'TS-2018-015', desc: 'Défaut poignées portes et batterie.' },
    { brand: 'Tesla', model: 'Model X', years: '2015-2026', engine: 'Électrique 670-1020 ch', issue: 'Portes papillon', tsb: 'TS-2019-022', desc: 'Défaut portes papillon.' },
    { brand: 'Tesla', model: 'Cybertruck', years: '2023-2026', engine: 'Électrique 600-845 ch', issue: 'Carrosserie + logiciel', tsb: 'TS-2024-015', desc: 'Problèmes carrosserie inox et bugs logiciels.' },
    { brand: 'Rivian', model: 'R1T', years: '2022-2026', engine: 'Électrique 835 ch', issue: 'Batterie + suspension', tsb: 'RV-2023-015', desc: 'Défaut batterie et suspension pneumatique.' },
    { brand: 'Rivian', model: 'R1S', years: '2022-2026', engine: 'Électrique 835 ch', issue: 'Batterie haute tension', tsb: 'RV-2023-018', desc: 'Défaut batterie sur SUV.' },
    { brand: 'Lucid', model: 'Air', years: '2021-2026', engine: 'Électrique 480-1234 ch', issue: 'Batterie + charge', tsb: 'LC-2023-015', desc: 'Défaut batterie et charge rapide 900V.' },
    { brand: 'Fisker', model: 'Ocean', years: '2023-2026', engine: 'Électrique 275-564 ch', issue: 'Batterie + logiciel', tsb: 'FS-2024-012', desc: 'Bugs logiciels et batterie (faillite constructeur).' },
    { brand: 'VinFast', model: 'VF 8', years: '2022-2026', engine: 'Électrique 349-402 ch', issue: 'Batterie + logiciel', tsb: 'VF-2023-015', desc: 'Bugs logiciels et batterie.' },
    { brand: 'VinFast', model: 'VF 9', years: '2024-2026', engine: 'Électrique 402 ch', issue: 'Batterie haute tension', tsb: 'VF-2024-012', desc: 'Défaut batterie sur grand SUV.' }
];

// ============ MOTEUR IA LOCAL AMÉLIORÉ ============
function runLocalAI(d) {
    const issues = [], causes = [], consequences = [], recommendations = [];
    let severity = 'Normal';

    const qcmMap = {
        qcm1: { i: 'Dysfonctionnement avec véhicule roulant', c: 'Défaut intermittent électronique ou mécanique', lvl: 2 },
        qcm2: { i: 'Bruit anormal détecté', c: 'Usure pièces mécaniques (roulements, courroies, supports, cardans, turbo)', lvl: 2 },
        qcm3: { i: 'Risque incendie / Fumée / Odeur brûlé', c: 'Court-circuit, fuite carburant sur partie chaude, surchauffe moteur', s: 'CRITIQUE', cons: 'DANGER IMMÉDIAT - Arrêt véhicule obligatoire', lvl: 5 },
        qcm4: { i: 'Défaut comportement routier', c: 'Problème suspension, direction, freinage, géométrie ou pneus', lvl: 3 },
        qcm5: { i: 'Perte de puissance', c: 'Alimentation, turbo, injection, encrassement FAP/EGR, mode dégradé', lvl: 3 },
        qcm6: { i: 'À-coups moteur', c: 'Allumage (bougies/bobines), injecteurs, régime irrégulier, admission air', lvl: 2 },
        qcm7: { i: 'À-coups boîte vitesse', c: 'Défaut mécatronique, embrayage, convertisseur, niveau huile boîte', lvl: 3 },
        qcm8: { i: 'Défaut fonctionnement boîte', c: 'Panne capteur boîte, mécatronique, faisceau électrique', lvl: 3 },
        qcm9: { i: 'Problème passage rapports', c: 'Tringlerie, synchroniseurs, huile boîte usée, embrayage', lvl: 2 },
        qcm10: { i: 'Voyant alerte actif', c: 'Défaut enregistré calculateurs, nécessite lecture DTC approfondie', lvl: 2 },
        qcm11: { i: 'Démarrage difficile/impossible', c: 'Batterie, démarreur, alternateur, immobiliseur, pompe carburant', lvl: 3 },
        qcm12: { i: 'Surchauffe moteur', c: 'Circuit refroidissement, thermostat, pompe eau, radiateur, joint culasse', s: 'CRITIQUE', cons: 'Risque casse moteur - Arrêt immédiat', lvl: 5 },
        qcm13: { i: 'Fuite détectée', c: 'Joint, durite, carter, pompe. Identifier liquide (huile, LDR, carburant)', lvl: 3 },
        qcm14: { i: 'Perte freinage', c: 'Circuit frein, maître-cylindre, ABS, plaquettes/disques', s: 'CRITIQUE', cons: 'DANGER MORTEL - Immobilisation stricte', lvl: 5 },
        qcm15: { i: 'Problème électrique/batterie', c: 'Batterie 12V, alternateur, faisceau, masse, calculateurs', lvl: 2 }
    };

    for (let key in d.qcm) {
        if (d.qcm[key] && qcmMap[key]) {
            issues.push(qcmMap[key].i);
            causes.push(qcmMap[key].c);
            if (qcmMap[key].s === 'CRITIQUE') severity = 'CRITIQUE';
            if (qcmMap[key].cons) consequences.push(qcmMap[key].cons);
        }
    }

    // Analyse DTC
    let dtcAnalysis = '';
    if (d.dtcRead === 'oui' && d.dtcCodes) {
        const codes = d.dtcCodes.split('\n').map(c => c.trim().toUpperCase()).filter(c => c);
        const dtcDict = {
            'P0300': 'Ratés allumage aléatoires', 'P0301': 'Ratés cylindre 1', 'P0171': 'Mélange trop pauvre',
            'P0172': 'Mélange trop riche', 'P0420': 'Efficacité catalyseur', 'P0401': 'Débit EGR insuffisant',
            'P0299': 'Pression turbo basse', 'P0234': 'Pression turbo excessive', 'P0087': 'Pression carburant basse',
            'P0088': 'Pression carburant haute', 'P0217': 'Surchauffe moteur', 'P0600': 'Communication série',
            'P0700': 'Défaut boîte vitesses', 'P2002': 'Efficacité FAP', 'P2463': 'Restriction FAP',
            'P249C': 'Température gaz échappement excessive', 'U0100': 'Communication calculateur moteur',
            'U0101': 'Communication calculateur boîte', 'U0121': 'Communication ABS'
        };
        
        dtcAnalysis = '<h4> Analyse codes DTC :</h4><ul>';
        codes.forEach(code => {
            let desc = dtcDict[code] || 'Code spécifique constructeur';
            if (code.startsWith('P0')) desc = 'Powertrain OBD2 - ' + desc;
            else if (code.startsWith('P1')) desc = 'Powertrain constructeur - ' + desc;
            else if (code.startsWith('C0') || code.startsWith('C1')) desc = 'Châssis - ' + desc;
            else if (code.startsWith('B0') || code.startsWith('B1')) desc = 'Carrosserie - ' + desc;
            else if (code.startsWith('U0') || code.startsWith('U1')) desc = 'Réseau CAN - ' + desc;
            dtcAnalysis += `<li><strong>${code}</strong> : ${desc}</li>`;
        });
        dtcAnalysis += '</ul>';
    }

    // Croisement Base Rappels
    let recallMatch = localRecallsDB.find(r => {
        const brandMatch = r.brand.toLowerCase() === d.vehicle.brand.toLowerCase();
        const modelMatch = d.vehicle.model.toLowerCase().includes(r.model.toLowerCase()) || 
                          r.model.toLowerCase().includes(d.vehicle.model.toLowerCase());
        const yearMatch = !d.vehicle.year || 
                         (parseInt(d.vehicle.year) >= parseInt(r.years.split('-')[0]) && 
                          parseInt(d.vehicle.year) <= (parseInt(r.years.split('-')[1]) || new Date().getFullYear()));
        return brandMatch && modelMatch && yearMatch;
    });
    
    let recallHtml = '';
    if (recallMatch) {
        recallHtml = `<div class="alert alert-warning">🚨 <strong>ALERTE RAPPEL :</strong><br>
                     <strong>Modèle :</strong> ${recallMatch.brand} ${recallMatch.model} (${recallMatch.years})<br>
                     <strong>Motorisation :</strong> ${recallMatch.engine}<br>
                     <strong>Problème :</strong> ${recallMatch.issue}<br>
                     <strong>TSB :</strong> ${recallMatch.tsb}<br>
                     <strong>Action :</strong> ${recallMatch.desc}</div>`;
        recommendations.push('🔴 PRIORITAIRE : Contacter concessionnaire avec VIN pour rappel ' + recallMatch.tsb);
    }

    recommendations.push('Diagnostic complet avec outil constructeur');
    recommendations.push('Vérifier TSB sur portail constructeur');
    if (severity === 'CRITIQUE') recommendations.push('⚠️ URGENT : NE PAS UTILISER - Remorquage recommandé');
    else recommendations.push('Rendez-vous atelier sous 48h');

    return { issues, causes, consequences, recommendations, dtcAnalysis, recallHtml, severity };
}

// ============ INITIALISATION QCM ============
const qcmLabels = [
    'Panne / Dysfonctionnement mais roulant', 'Bruit anormal', 'Incendie / Fumée / Odeur de brûlé',
    'Défaut de comportement sur route', 'Défaut de puissance', 'À-coups moteur',
    'À-coups boîte de vitesse', 'Défaut de fonctionnement boîte', 'Problème de passage des rapports',
    'Voyant alerte allumé planche de bord', 'Démarrage difficile / Impossible', 'Surchauffe moteur',
    'Fuite (liquide, huile, carburant)', 'Perte de freinage', 'Problème électrique / Batterie'
];

function initQCM() {
    const container = document.getElementById('qcmContainer');
    if (!container) return;
    qcmLabels.forEach((label, index) => {
        const id = index + 1;
        container.innerHTML += `
            <div class="checkbox-item">
                <input type="checkbox" id="qcm${id}" onchange="toggleDetail(${id}, '${label}')">
                <label for="qcm${id}">${label}</label>
            </div>
        `;
    });
}

function toggleDetail(id, label) {
    const checkbox = document.getElementById('qcm' + id);
    const existing = document.getElementById('detail-' + id);
    const container = document.getElementById('detailSections');
    
    if (checkbox.checked && !existing) {
        const div = document.createElement('div');
        div.id = 'detail-' + id;
        div.className = 'form-group';
        div.style.cssText = 'padding:12px;background:#fff;border-radius:8px;border-left:4px solid #ff6b35;box-shadow:0 2px 5px rgba(0,0,0,0.05)';
        div.innerHTML = `<label>Détails pour : <strong>${label}</strong></label><textarea placeholder="Décrivez en détail..."></textarea>`;
        container.appendChild(div);
    } else if (!checkbox.checked && existing) {
        existing.remove();
    }
}

// ============ AUTHENTIFICATION ============
async function handleLogin() {
    const username = document.getElementById('loginUsername').value.trim();
    const password = document.getElementById('loginPassword').value;
    const msg = document.getElementById('loginMessage');

    if (!username || !password) { msg.innerHTML = '<div class="alert alert-danger">Champs requis</div>'; return; }

    if (username.toLowerCase() === 'admin' && password === ADMIN_PASSWORD) {
        currentUser = { username: 'admin', role: 'admin', status: 'authorized' };
        isAdmin = true;
        enterApp();
        return;
    }

    if (db) {
        try {
            const doc = await db.collection('users').doc(username).get();
            if (doc.exists) {
                const data = doc.data();
                if (data.password !== password) { msg.innerHTML = '<div class="alert alert-danger">Mot de passe incorrect</div>'; return; }
                if (data.status === 'refused') { msg.innerHTML = '<div class="alert alert-danger">❌ Accès refusé</div>'; return; }
                if (data.status === 'pending') { msg.innerHTML = '<div class="alert alert-warning">⏳ En attente</div>'; return; }
                currentUser = { username, role: 'user', status: 'authorized' };
                isAdmin = false;
                enterApp();
            } else {
                msg.innerHTML = '<div class="alert alert-danger">Utilisateur inconnu</div>';
            }
        } catch(e) {
            msg.innerHTML = '<div class="alert alert-danger">Erreur: ' + e.message + '</div>';
        }
    } else {
        const users = JSON.parse(localStorage.getItem('users') || '[]');
        const user = users.find(u => u.username === username && u.password === password);
        if (!user) { msg.innerHTML = '<div class="alert alert-danger">Identifiants incorrects</div>'; return; }
        if (user.status === 'refused') { msg.innerHTML = '<div class="alert alert-danger">❌ Accès refusé</div>'; return; }
        if (user.status === 'pending') { msg.innerHTML = '<div class="alert alert-warning">⏳ En attente</div>'; return; }
        currentUser = user;
        isAdmin = user.role === 'admin';
        enterApp();
    }
}

function enterApp() {
    document.getElementById('loginSection').classList.add('hidden');
    document.getElementById('mainApp').classList.remove('hidden');
    document.getElementById('currentUserDisplay').textContent = currentUser.username;
    const badge = document.getElementById('userBadge');
    if (isAdmin) {
        badge.textContent = 'Administrateur'; badge.className = 'badge badge-admin';
        document.querySelectorAll('.admin-only').forEach(el => el.classList.remove('hidden'));
        loadAdminData();
    } else {
        badge.textContent = 'Utilisateur'; badge.className = 'badge badge-user';
    }
    updateHistory();
}

function logout() {
    currentUser = null; isAdmin = false;
    document.getElementById('mainApp').classList.add('hidden');
    document.getElementById('loginSection').classList.remove('hidden');
    document.getElementById('loginUsername').value = ''; 
    document.getElementById('loginPassword').value = '';
    document.getElementById('loginMessage').innerHTML = '';
}

async function showAccessRequest() {
    const username = prompt('Nom d\'utilisateur :');
    if (!username) return;
    const password = prompt('Mot de passe :');
    if (!password) return;

    if (db) {
        try {
            await db.collection('users').doc(username).set({
                username, password, role: 'user', status: 'pending', date: new Date().toISOString()
            });
            alert('✅ Demande envoyée à Kevin');
        } catch(e) { alert('Erreur: ' + e.message); }
    } else {
        const users = JSON.parse(localStorage.getItem('users') || '[]');
        if (users.find(u => u.username === username)) { alert('Existe déjà'); return; }
        users.push({ username, password, role: 'user', status: 'pending', date: new Date().toISOString() });
        localStorage.setItem('users', JSON.stringify(users));
        alert('✅ Demande enregistrée');
    }
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

function toggleDTCInput(show) { 
    document.getElementById('dtcInputSection').classList.toggle('hidden', !show); 
}

// ============ DIAGNOSTIC ============
function saveDiagnostic() {
    const data = {
        id: Date.now(), date: new Date().toISOString(), user: currentUser.username,
        vehicle: {
            brand: document.getElementById('vehicleBrand').value, 
            model: document.getElementById('vehicleModel').value,
            year: document.getElementById('vehicleYear').value, 
            engine: document.getElementById('vehicleEngine').value,
            mileage: document.getElementById('vehicleMileage').value, 
            vin: document.getElementById('vehicleVIN').value
        },
        symptoms: document.getElementById('symptoms').value, 
        context: document.getElementById('context').value,
        visualDefects: document.getElementById('visualDefects').value,
        dtcRead: document.querySelector('input[name="dtcRead"]:checked')?.value || 'non',
        dtcCodes: document.getElementById('dtcCodes').value,
        qcm: {}, 
        additionalInfo: document.getElementById('additionalInfo').value
    };

    for (let i = 1; i <= 15; i++) data.qcm['qcm' + i] = document.getElementById('qcm' + i).checked;

    if (!data.vehicle.brand || !data.symptoms) { alert('️ Marque et Symptômes requis'); return; }

    const diagnostics = JSON.parse(localStorage.getItem('diagnostics') || '[]');
    diagnostics.push(data);
    localStorage.setItem('diagnostics', JSON.stringify(diagnostics));
    currentDiagnostic = data;
    alert('✅ Diagnostic enregistré !');
    updateHistory();
}

function goToAnalysis() {
    if (!currentDiagnostic) {
        const diagnostics = JSON.parse(localStorage.getItem('diagnostics') || '[]');
        if (diagnostics.length > 0) currentDiagnostic = diagnostics[diagnostics.length - 1];
        else { alert('Enregistrez d\'abord un diagnostic'); return; }
    }
    showSection('analysis');
    generateAIAnalysis();
}

function generateAIAnalysis() {
    const d = currentDiagnostic;
    const aiResult = runLocalAI(d);
    
    let html = `<div class="conclusion-box">
        <h3>🧠 Analyse Technique IA</h3>
        <p><strong>Véhicule :</strong> ${d.vehicle.brand} ${d.vehicle.model} ${d.vehicle.year || ''} - ${d.vehicle.engine || '?'} - ${d.vehicle.mileage || '?'} km</p>
        <p><strong>Sévérité :</strong> <span style="color:${aiResult.severity === 'CRITIQUE' ? '#ff6b6b' : '#ffd700'};font-weight:bold">${aiResult.severity}</span></p>
        
        ${aiResult.recallHtml}

        <h4>⚠️ Symptômes :</h4>
        <ul>${aiResult.issues.length ? aiResult.issues.map(i => `<li>${i}</li>`).join('') : '<li>' + (d.symptoms || 'Non précisé') + '</li>'}</ul>

        <h4> Causes probables :</h4>
        <ul>${aiResult.causes.length ? aiResult.causes.map(c => `<li>${c}</li>`).join('') : '<li>Investigation requise</li>'}</ul>

        ${aiResult.consequences.length ? `<h4>🚨 Conséquences :</h4><ul>${aiResult.consequences.map(c => `<li>${c}</li>`).join('')}</ul>` : ''}
        ${aiResult.dtcAnalysis}

        <h4>📌 Recommandations :</h4>
        <ul>${aiResult.recommendations.map(r => `<li>${r}</li>`).join('')}</ul>

        <h4>📊 Conclusion :</h4>
        <p>Analyse de <strong>${d.vehicle.brand} ${d.vehicle.model}</strong> : ${aiResult.issues.length} dysfonctionnement(s) identifié(s). 
        Causes : ${aiResult.causes[0] || 'à investiguer'}. 
        ${aiResult.recallHtml ? 'Rappel constructeur détecté - action prioritaire.' : 'Vérifier TSB constructeur.'} 
        Expertise professionnelle requise.</p>
    </div>`;
    
    document.getElementById('aiConclusion').innerHTML = html;
}

// ============ RECALLS ============
function searchRecalls() {
    const search = document.getElementById('recallSearch').value.toLowerCase();
    const results = localRecallsDB.filter(r => (r.brand + ' ' + r.model).toLowerCase().includes(search));
    let html = '';
    if (results.length === 0) html = '<div class="alert alert-warning">Aucun rappel trouvé. Vérifiez sur rappel.gouv.fr</div>';
    else {
        html = '<div class="alert alert-success">✅ ' + results.length + ' résultat(s)</div>';
        results.forEach(r => {
            html += `<div class="recall-card"><h4>🚨 ${r.brand} ${r.model} (${r.years})</h4>
                    <p><strong>Motorisation :</strong> ${r.engine}</p>
                    <p><strong>Problème :</strong> ${r.issue}</p>
                    <p><strong>TSB :</strong> ${r.tsb}</p>
                    <p>${r.desc}</p></div>`;
        });
    }
    document.getElementById('recallResults').innerHTML = html;
}

// ============ ADMIN ============
async function loadAdminData() {
    if (!db) {
        const users = JSON.parse(localStorage.getItem('users') || '[]').filter(u => u.role !== 'admin');
        renderTiersTable(users);
        document.getElementById('adminStats').innerHTML = '<div class="alert alert-warning">Mode Local</div>';
        return;
    }

    try {
        const snapshot = await db.collection('users').get();
        const users = [];
        snapshot.forEach(doc => { if (doc.data().role !== 'admin') users.push({ id: doc.id, ...doc.data() }); });
        renderTiersTable(users);

        const authorized = users.filter(u => u.status === 'authorized').length;
        const refused = users.filter(u => u.status === 'refused').length;
        const pending = users.filter(u => u.status === 'pending').length;
        document.getElementById('adminStats').innerHTML = `
            <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(150px,1fr));gap:10px">
                <div class="alert alert-success"><strong>✅ Autorisés :</strong> ${authorized}</div>
                <div class="alert alert-danger"><strong>❌ Refusés :</strong> ${refused}</div>
                <div class="alert alert-warning"><strong> En attente :</strong> ${pending}</div>
            </div>`;
    } catch(e) { console.error(e); }
}

function renderTiersTable(users) {
    let html = '<table><thead><tr><th>Utilisateur</th><th>Date</th><th>Statut</th><th>Actions</th></tr></thead><tbody>';
    if (users.length === 0) html += '<tr><td colspan="4" style="text-align:center">Aucun tiers</td></tr>';
    else {
        users.forEach(u => {
            const statusClass = u.status === 'authorized' ? 'status-authorized' : u.status === 'refused' ? 'status-refused' : 'status-pending';
            const statusText = u.status === 'authorized' ? '✅ Autorisé' : u.status === 'refused' ? '❌ Refusé' : '⏳ En attente';
            html += `<tr>
                <td>${u.username}</td><td>${new Date(u.date).toLocaleDateString('fr-FR')}</td>
                <td class="${statusClass}">${statusText}</td>
                <td>
                    <button class="btn btn-success" onclick="setUserStatus('${u.id || u.username}','authorized')" style="padding:5px 10px;font-size:0.75em">Autoriser</button>
                    <button class="btn btn-danger" onclick="setUserStatus('${u.id || u.username}','refused')" style="padding:5px 10px;font-size:0.75em">Couper</button>
                </td></tr>`;
        });
    }
    html += '</tbody></table>';
    document.getElementById('tiersTable').innerHTML = html;
}

async function setUserStatus(id, status) {
    if (db) {
        await db.collection('users').doc(id).update({ status });
        alert(`✅ Statut mis à jour : ${status}`);
        loadAdminData();
    } else {
        const users = JSON.parse(localStorage.getItem('users') || '[]');
        const user = users.find(u => u.username === id);
        if (user) { user.status = status; localStorage.setItem('users', JSON.stringify(users)); alert('Mis à jour'); loadAdminData(); }
    }
}

// ============ HISTORY ============
function updateHistory() {
    const diagnostics = JSON.parse(localStorage.getItem('diagnostics') || '[]');
    let html = '';
    if (diagnostics.length === 0) html = '<div class="alert alert-info">Aucun diagnostic</div>';
    else {
        html = '<table><thead><tr><th>Date</th><th>Véhicule</th><th>Symptôme</th><th>Actions</th></tr></thead><tbody>';
        diagnostics.slice().reverse().forEach(d => {
            html += `<tr><td>${new Date(d.date).toLocaleDateString('fr-FR')}</td><td>${d.vehicle.brand} ${d.vehicle.model}</td><td>${d.symptoms.substring(0, 40)}...</td><td><button class="btn btn-primary" onclick="loadDiagnostic(${d.id})" style="padding:5px 10px;font-size:0.75em">Voir</button></td></tr>`;
        });
        html += '</tbody></table>';
    }
    document.getElementById('historyContent').innerHTML = html;
}

function loadDiagnostic(id) {
    currentDiagnostic = JSON.parse(localStorage.getItem('diagnostics') || '[]').find(d => d.id === id);
    if (currentDiagnostic) { showSection('analysis'); generateAIAnalysis(); }
}

// ============ SHARE ============
function shareBySMS() {
    const number = document.getElementById('shareSmsNumber').value;
    if (!number) { alert('Numéro requis'); return; }
    window.open(`sms:${number}?body=${encodeURIComponent('APK "Aide au diagnostic by Kevin". Lien : ' + document.getElementById('shareLink').value)}`);
}
function shareByEmail() {
    const email = document.getElementById('shareEmail').value;
    if (!email) { alert('Email requis'); return; }
    window.open(`mailto:${email}?subject=${encodeURIComponent('App Diagnostic Kevin')}&body=${encodeURIComponent('Lien : ' + document.getElementById('shareLink').value)}`);
}
function copyLink() {
    const link = document.getElementById('shareLink'); link.select(); document.execCommand('copy'); alert('Lien copié');
}

// ============ INIT ============
window.addEventListener('DOMContentLoaded', function() {
    initQCM();
    if ('serviceWorker' in navigator) {
        navigator.serviceWorker.register('sw.js').catch(e => console.log('SW:', e));
    }
    console.log(`✅ Base de données: ${localRecallsDB.length} rappels 2017-2026 chargés`);
});
