// ============ CONFIGURATION FIREBASE ============
const firebaseConfig = {
    apiKey: "AIzaSyCwcLLNZDdqzGsSybo7V0holqKfRoB47ag",
    authDomain: "diag-kevin.firebaseapp.com",
    projectId: "diag-kevin",
    storageBucket: "diag-kevin.appspot.com",
    messagingSenderId: "7479720363",
    appId: "1:7479720363:web:05c047578987e9da43baee"
};

// Initialisation Firebase
let db = null;
try {
    firebase.initializeApp(firebaseConfig);
    db = firebase.firestore();
    console.log("✅ Firebase initialisé avec succès");
} catch(e) {
    console.error("❌ Erreur Firebase:", e);
    console.log("Utilisation du mode local uniquement.");
}

const ADMIN_PASSWORD = "Kevin83600";
let currentUser = null;
let isAdmin = false;
let currentDiagnostic = null;

// ============ BASE DE DONNÉES LOCALE (Rappels & Pannes connues) ============
const localRecallsDB = [
    { brand: 'Peugeot', model: '308', years: '2012-2021', issue: 'Défaut airbag passager', tsb: 'PSA-2019-001', desc: 'Rappel pour défaut de déploiement airbag passager. Vérifier numéro de série.' },
    { brand: 'Peugeot', model: '3008', years: '2016-2020', issue: 'Perte de puissance / Mode dégradé', tsb: 'PSA-2020-015', desc: 'Défaut calculateur injection ou vanne EGR. Mise à jour logiciel ou remplacement.' },
    { brand: 'Peugeot', model: '508', years: '2018-2022', issue: 'Problème boîte EAT8', tsb: 'PSA-2021-008', desc: 'À-coups à froid, défaut mécatronique. Mise à jour TCM requise.' },
    { brand: 'Citroën', model: 'C4', years: '2010-2018', issue: 'Fuite circuit refroidissement', tsb: 'PSA-2018-022', desc: 'Rappel pompe à eau - risque surchauffe moteur.' },
    { brand: 'Citroën', model: 'C5 Aircross', years: '2018-2022', issue: 'Défaut système hybride', tsb: 'PSA-2022-011', desc: 'Panne onduleur haute tension. Remplacement sous garantie.' },
    { brand: 'Renault', model: 'Clio', years: '2012-2019', issue: 'Défaut freinage / ABS', tsb: 'RN-2019-008', desc: 'Rappel maître-cylindre de frein ou capteur ABS.' },
    { brand: 'Renault', model: 'Megane', years: '2015-2021', issue: 'Problème boîte EDC', tsb: 'RN-2020-012', desc: 'Défaut mécatronique boîte double embrayage. Perte de rapport.' },
    { brand: 'Renault', model: 'Captur', years: '2013-2019', issue: 'Consommation huile moteur', tsb: 'RN-2018-005', desc: 'Défaut segmentation moteurs 1.2 TCe. Risque casse moteur.' },
    { brand: 'Volkswagen', model: 'Golf', years: '2012-2020', issue: 'Consommation huile / FAP', tsb: 'VW-2018-045', desc: 'Rappel segments piston ou encrassement FAP 2.0 TDI.' },
    { brand: 'Volkswagen', model: 'Tiguan', years: '2016-2021', issue: 'Défaut airbag Takata', tsb: 'VW-2019-033', desc: 'Rappel airbag Takata - risque projection de métal.' },
    { brand: 'Volkswagen', model: 'Passat', years: '2014-2020', issue: 'Pompe à eau électrique', tsb: 'VW-2020-012', desc: 'Fuite pompe à eau électrique, risque court-circuit.' },
    { brand: 'BMW', model: 'Série 3', years: '2012-2019', issue: 'Défaut pompe à carburant', tsb: 'BMW-2020-019', desc: 'Rappel pompe haute pression - risque calage moteur.' },
    { brand: 'BMW', model: 'Série 1', years: '2011-2019', issue: 'Chaîne de distribution', tsb: 'BMW-2017-004', desc: 'Allongement chaîne distribution N47. Risque casse moteur.' },
    { brand: 'Mercedes', model: 'Classe A', years: '2012-2018', issue: 'Défaut direction assistée', tsb: 'MB-2019-007', desc: 'Rappel colonne de direction assistée électrique.' },
    { brand: 'Mercedes', model: 'Classe C', years: '2014-2021', issue: 'Problème AdBlue', tsb: 'MB-2020-015', desc: 'Cristallisation réservoir AdBlue. Remplacement réservoir.' },
    { brand: 'Toyota', model: 'Yaris', years: '2011-2020', issue: 'Défaut airbag / Pompe à essence', tsb: 'TY-2019-025', desc: 'Rappel airbag Takata ou pompe à carburant basse pression.' },
    { brand: 'Toyota', model: 'RAV4', years: '2015-2021', issue: 'Batterie 12V hybride', tsb: 'TY-2021-008', desc: 'Défaut batterie auxiliaire 12V sur modèles hybrides.' },
    { brand: 'Ford', model: 'Focus', years: '2011-2018', issue: 'Défaut boîte Powershift', tsb: 'FD-2018-041', desc: 'Rappel boîte double embrayage - à-coups, perte de mouvement.' },
    { brand: 'Ford', model: 'Fiesta', years: '2012-2017', issue: 'Fuite liquide refroidissement', tsb: 'FD-2017-012', desc: 'Durite de refroidissement poreuse, risque surchauffe.' },
    { brand: 'Tesla', model: 'Model 3', years: '2017-2022', issue: 'Défaut suspension / Écran', tsb: 'TS-2021-003', desc: 'Rappel bras de suspension avant ou défaillance écran central.' },
    { brand: 'Hyundai', model: 'Tucson', years: '2015-2020', issue: 'Risque incendie moteur', tsb: 'HY-2020-009', desc: 'Rappel défaut segment moteur 1.7 CRDi, risque incendie.' },
    { brand: 'Kia', model: 'Sportage', years: '2016-2021', issue: 'Perte de puissance', tsb: 'KI-2021-004', desc: 'Défaut calculateur moteur ou vanne EGR bloquée.' }
];

// ============ MOTEUR IA LOCAL (Système Expert Gratuit & Hors-ligne) ============
function runLocalAI(d) {
    const issues = [], causes = [], consequences = [], recommendations = [];
    let severity = 'Normal';

    const qcmMap = {
        qcm1: { i: 'Dysfonctionnement avec véhicule roulant', c: 'Défaut intermittent électronique ou mécanique' },
        qcm2: { i: 'Bruit anormal détecté', c: 'Usure pièces mécaniques (roulements, courroies, supports, cardans)' },
        qcm3: { i: 'Risque incendie / Fumée / Odeur brûlé', c: 'Court-circuit, fuite carburant sur partie chaude, surchauffe', s: 'CRITIQUE', cons: 'DANGER IMMÉDIAT - Arrêt du véhicule obligatoire' },
        qcm4: { i: 'Défaut comportement routier', c: 'Problème suspension, direction, freinage, géométrie ou pneus' },
        qcm5: { i: 'Perte de puissance', c: 'Alimentation, turbo, injection, encrassement FAP/EGR, mode dégradé' },
        qcm6: { i: 'À-coups moteur', c: 'Allumage (bougies/bobines), injecteurs, régime irrégulier, admission d\'air' },
        qcm7: { i: 'À-coups boîte de vitesse', c: 'Défaut mécatronique, embrayage, convertisseur, niveau huile boîte' },
        qcm8: { i: 'Défaut fonctionnement boîte', c: 'Panne capteur boîte, mécatronique, faisceau électrique' },
        qcm9: { i: 'Problème passage rapports', c: 'Tringlerie, synchroniseurs, huile boîte usée, embrayage' },
        qcm10: { i: 'Voyant alerte actif', c: 'Défaut enregistré calculateurs, nécessite lecture DTC approfondie' },
        qcm11: { i: 'Démarrage difficile/impossible', c: 'Batterie, démarreur, alternateur, immobiliseur, pompe à carburant' },
        qcm12: { i: 'Surchauffe moteur', c: 'Circuit refroidissement, thermostat, pompe à eau, radiateur, joint culasse', s: 'CRITIQUE', cons: 'Risque de casse moteur - Arrêt immédiat' },
        qcm13: { i: 'Fuite détectée', c: 'Joint, durite, carter, pompe. Identifier le liquide (huile, LDR, carburant)' },
        qcm14: { i: 'Perte de freinage', c: 'Circuit frein, maître-cylindre, ABS, plaquettes/disques', s: 'CRITIQUE', cons: 'DANGER MORTEL - Immobilisation stricte du véhicule' },
        qcm15: { i: 'Problème électrique/batterie', c: 'Batterie 12V, alternateur, faisceau, masse, calculateurs' }
    };

    for (let key in d.qcm) {
        if (d.qcm[key] && qcmMap[key]) {
            issues.push(qcmMap[key].i);
            causes.push(qcmMap[key].c);
            if (qcmMap[key].s === 'CRITIQUE') severity = 'CRITIQUE';
            if (qcmMap[key].cons) consequences.push(qcmMap[key].cons);
        }
    }

    let dtcAnalysis = '';
    if (d.dtcRead === 'oui' && d.dtcCodes) {
        const codes = d.dtcCodes.split('\n').map(c => c.trim().toUpperCase()).filter(c => c);
        const dtcDict = {
            'P0': 'Défaut Powertrain (Moteur/Boîte) - Norme OBD2 générique',
            'P1': 'Défaut Powertrain Spécifique Constructeur',
            'P2': 'Défaut Powertrain Boîte de vitesses',
            'C0': 'Défaut Châssis (Freins, ABS, Suspension)',
            'B0': 'Défaut Carrosserie (Airbags, Confort)',
            'U0': 'Défaut Réseau CAN (Communication entre calculateurs)'
        };
        dtcAnalysis = '<h4>🔍 Analyse des codes DTC :</h4><ul>';
        codes.forEach(code => {
            let desc = 'Code inconnu, vérifier base constructeur';
            for (let prefix in dtcDict) { if (code.startsWith(prefix)) desc = dtcDict[prefix]; }
            dtcAnalysis += `<li><strong>${code}</strong> : ${desc}</li>`;
        });
        dtcAnalysis += '</ul>';
    }

    let recallMatch = localRecallsDB.find(r => 
        r.brand.toLowerCase() === d.vehicle.brand.toLowerCase() && 
        d.vehicle.model.toLowerCase().includes(r.model.toLowerCase())
    );
    let recallHtml = '';
    if (recallMatch) {
        recallHtml = `<div class="alert alert-warning">🚨 <strong>ALERTE RAPPEL CONSTRUCTEUR :</strong> Ce modèle est concerné par la campagne <strong>${recallMatch.tsb}</strong> pour : ${recallMatch.issue}. ${recallMatch.desc}</div>`;
        recommendations.push('Contacter le concessionnaire avec le VIN pour vérifier l\'éligibilité au rappel ' + recallMatch.tsb);
    }

    recommendations.push('Effectuer un diagnostic complet avec outil constructeur (Diagbox, Renault Clip, VAS, etc.)');
    recommendations.push('Vérifier les bulletins techniques (TSB) sur le portail constructeur');
    if (severity === 'CRITIQUE') recommendations.push('⚠️ NE PAS UTILISER LE VÉHICULE - Remorquage vers atelier recommandé');
    else recommendations.push('Planifier un rendez-vous atelier sous 48h pour investigation');

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
        div.innerHTML = `<label>Détails pour : <strong>${label}</strong></label><textarea placeholder="Décrivez en détail (bruit, fréquence, conditions...)"></textarea>`;
        container.appendChild(div);
    } else if (!checkbox.checked && existing) {
        existing.remove();
    }
}

// ============ AUTHENTIFICATION & FIREBASE ============
async function handleLogin() {
    const username = document.getElementById('loginUsername').value.trim();
    const password = document.getElementById('loginPassword').value;
    const msg = document.getElementById('loginMessage');

    if (!username || !password) { msg.innerHTML = '<div class="alert alert-danger">Champs requis</div>'; return; }

    // Vérification Admin locale
    if (username.toLowerCase() === 'admin' && password === ADMIN_PASSWORD) {
        currentUser = { username: 'admin', role: 'admin', status: 'authorized' };
        isAdmin = true;
        enterApp();
        return;
    }

    // Vérification Tiers via Firebase
    if (db) {
        try {
            const doc = await db.collection('users').doc(username).get();
            if (doc.exists) {
                const data = doc.data();
                if (data.password !== password) { msg.innerHTML = '<div class="alert alert-danger">Mot de passe incorrect</div>'; return; }
                if (data.status === 'refused') { msg.innerHTML = '<div class="alert alert-danger">❌ Accès refusé par l\'administrateur</div>'; return; }
                if (data.status === 'pending') { msg.innerHTML = '<div class="alert alert-warning">⏳ Demande en attente de validation par Kevin</div>'; return; }
                
                currentUser = { username, role: 'user', status: 'authorized' };
                isAdmin = false;
                enterApp();
            } else {
                msg.innerHTML = '<div class="alert alert-danger">Utilisateur inconnu. Demandez un accès.</div>';
            }
        } catch(e) {
            console.error(e);
            msg.innerHTML = '<div class="alert alert-danger">Erreur de connexion: ' + e.message + '</div>';
        }
    } else {
        // Fallback LocalStorage
        const users = JSON.parse(localStorage.getItem('users') || '[]');
        const user = users.find(u => u.username === username && u.password === password);
        if (!user) { msg.innerHTML = '<div class="alert alert-danger">Identifiants incorrects</div>'; return; }
        if (user.status === 'refused') { msg.innerHTML = '<div class="alert alert-danger">❌ Accès refusé</div>'; return; }
        if (user.status === 'pending') { msg.innerHTML = '<div class="alert alert-warning"> En attente</div>'; return; }
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
    const username = prompt('Choisissez votre nom d\'utilisateur :');
    if (!username) return;
    const password = prompt('Choisissez votre mot de passe :');
    if (!password) return;

    if (db) {
        try {
            await db.collection('users').doc(username).set({
                username, password, role: 'user', status: 'pending', date: new Date().toISOString()
            });
            alert('✅ Demande envoyée à Kevin. Vous serez notifié de la décision.');
        } catch(e) { alert('Erreur: ' + e.message); }
    } else {
        const users = JSON.parse(localStorage.getItem('users') || '[]');
        if (users.find(u => u.username === username)) { alert('Existe déjà'); return; }
        users.push({ username, password, role: 'user', status: 'pending', date: new Date().toISOString() });
        localStorage.setItem('users', JSON.stringify(users));
        alert('✅ Demande enregistrée localement.');
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

    if (!data.vehicle.brand || !data.symptoms) { alert('⚠️ Marque et Symptômes requis'); return; }

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
        <h3>🧠 Analyse Technique par IA Locale</h3>
        <p><strong>Véhicule :</strong> ${d.vehicle.brand} ${d.vehicle.model} ${d.vehicle.year || ''} - ${d.vehicle.engine || '?'} - ${d.vehicle.mileage || '?'} km</p>
        <p><strong>Niveau de sévérité :</strong> <span style="color:${aiResult.severity === 'CRITIQUE' ? '#ff6b6b' : '#ffd700'};font-weight:bold">${aiResult.severity}</span></p>
        
        ${aiResult.recallHtml}

        <h4>⚠️ Symptômes identifiés :</h4>
        <ul>${aiResult.issues.length ? aiResult.issues.map(i => `<li>${i}</li>`).join('') : '<li>' + (d.symptoms || 'Non précisé') + '</li>'}</ul>

        <h4>🔍 Causes probables :</h4>
        <ul>${aiResult.causes.length ? aiResult.causes.map(c => `<li>${c}</li>`).join('') : '<li>Investigation approfondie requise</li>'}</ul>

        ${aiResult.consequences.length ? `<h4> Conséquences potentielles :</h4><ul>${aiResult.consequences.map(c => `<li>${c}</li>`).join('')}</ul>` : ''}
        ${aiResult.dtcAnalysis}

        <h4>📌 Recommandations & Plan d'action :</h4>
        <ul>${aiResult.recommendations.map(r => `<li>${r}</li>`).join('')}</ul>

        <h4>📊 Conclusion argumentée :</h4>
        <p>Sur la base des éléments techniques fournis pour le <strong>${d.vehicle.brand} ${d.vehicle.model}</strong>, 
        l'analyse croisée des symptômes, des codes DTC et de la base de données de pannes connues identifie 
        <strong>${aiResult.issues.length} dysfonctionnement(s)</strong>. 
        Les causes racines pointent vers ${aiResult.causes[0] || 'un défaut technique à investiguer'}. 
        ${aiResult.recallHtml ? 'Le véhicule correspond à une campagne de rappel connue, une action constructeur est prioritaire.' : 'Aucun rappel constructeur direct trouvé pour cette combinaison, mais les TSB doivent être vérifiés.'} 
        Une expertise professionnelle avec outillage spécifique est requise pour confirmer et réparer.</p>
    </div>`;
    
    document.getElementById('aiConclusion').innerHTML = html;
}

// ============ RECALLS ============
function searchRecalls() {
    const search = document.getElementById('recallSearch').value.toLowerCase();
    const results = localRecallsDB.filter(r => (r.brand + ' ' + r.model).toLowerCase().includes(search));
    let html = '';
    if (results.length === 0) html = '<div class="alert alert-warning">Aucun rappel trouvé localement. Vérifiez sur rappel.gouv.fr</div>';
    else {
        html = '<div class="alert alert-success">✅ ' + results.length + ' résultat(s)</div>';
        results.forEach(r => {
            html += `<div class="recall-card"><h4>🚨 ${r.brand} ${r.model} (${r.years})</h4><p><strong>Problème :</strong> ${r.issue}</p><p><strong>TSB :</strong> ${r.tsb}</p><p>${r.desc}</p></div>`;
        });
    }
    document.getElementById('recallResults').innerHTML = html;
}

// ============ ADMIN ============
async function loadAdminData() {
    if (!db) {
        const users = JSON.parse(localStorage.getItem('users') || '[]').filter(u => u.role !== 'admin');
        renderTiersTable(users);
        document.getElementById('adminStats').innerHTML = '<div class="alert alert-warning">Mode Local : Firebase non configuré.</div>';
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
                <div class="alert alert-warning"><strong>⏳ En attente :</strong> ${pending}</div>
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
        if (user) { user.status = status; localStorage.setItem('users', JSON.stringify(users)); alert('Mis à jour localement'); loadAdminData(); }
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
    window.open(`sms:${number}?body=${encodeURIComponent('Bonjour, voici l\'APK "Aide au diagnostic by Kevin". Lien : ' + document.getElementById('shareLink').value + ' - Demande d\'accès obligatoire.')}`);
}
function shareByEmail() {
    const email = document.getElementById('shareEmail').value;
    if (!email) { alert('Email requis'); return; }
    window.open(`mailto:${email}?subject=${encodeURIComponent('App Diagnostic Kevin')}&body=${encodeURIComponent('Lien : ' + document.getElementById('shareLink').value)}`);
}
function copyLink() {
    const link = document.getElementById('shareLink'); link.select(); document.execCommand('copy'); alert('Lien copié');
}

// ============ INITIALISATION ============
window.addEventListener('DOMContentLoaded', function() {
    initQCM();
    if ('serviceWorker' in navigator) {
        navigator.serviceWorker.register('sw.js').catch(e => console.log('SW:', e));
    }
});
