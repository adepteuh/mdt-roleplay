const express = require('express');
const fs = require('fs').promises;
const path = require('path');
const cors = require('cors');
const multer = require('multer');
const mysql = require('mysql2/promise');
const bcrypt = require('bcrypt');
const session = require('express-session');
const https = require('https');
const http = require('http');
const { Client, GatewayIntentBits } = require('discord.js');

const app = express();
const PORT = 3000;

const DISCORD_BOT_TOKEN = 'token bot';
const DISCORD_IMAGE_CHANNEL_ID = 'channel ID';
const discordClient = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages
    ]
});

let discordReady = false;

discordClient.once('ready', () => {
    console.log('Bot Discord connecté pour l\'envoi d\'images');
    discordReady = true;
});

discordClient.login(DISCORD_BOT_TOKEN).catch(err => {
    console.error('Erreur lors de la connexion du bot Discord:', err);
});

async function sendImageToDiscord(filepath, filename) {
    try {
        if (!discordReady) {
            console.warn('Bot Discord pas encore prêt, attente...');
            for (let i = 0; i < 20; i++) {
                await new Promise(resolve => setTimeout(resolve, 500));
                if (discordReady) break;
            }
            if (!discordReady) {
                throw new Error('Bot Discord pas prêt après 10 secondes');
            }
        }

        const channel = await discordClient.channels.fetch(DISCORD_IMAGE_CHANNEL_ID);
        if (!channel) {
            throw new Error('Channel Discord introuvable');
        }

        const attachment = {
            attachment: filepath,
            name: filename
        };

        const message = await channel.send({ files: [attachment] });

        const imageUrl = message.attachments.first()?.url;
        if (!imageUrl) {
            throw new Error('Impossible de récupérer l\'URL de l\'image');
        }

        console.log('✅ Image envoyée à Discord avec succès. URL:', imageUrl);
        return imageUrl;
    } catch (error) {
        console.error('Erreur lors de l\'envoi de l\'image à Discord:', error);
        throw error;
    }
}
function getDataFile(department) {
    let dept = 'bcso';
    if (department === 'LSPD') dept = 'lspd';
    else if (department === 'GOUV') dept = 'gouv';
    return path.join(__dirname, 'data', `${dept}-data.json`);
}
const DATA_FILE = path.join(__dirname, 'data', 'bcso-data.json');
const DATA_DIR = path.join(__dirname, 'data');
const IMAGES_DIR = path.join(__dirname, 'data', 'images');

const dbConfig = {
    host: 'localhost',
    user: 'root',
    password: '',
    database: 'mdt_flashland',
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0
};

const pool = mysql.createPool(dbConfig);

const ADMIN_PASSWORD = 'admin123';

async function initDatabase() {
    try {
        const connection = await mysql.createConnection({
            host: dbConfig.host,
            user: dbConfig.user,
            password: dbConfig.password
        });

        await connection.query(`CREATE DATABASE IF NOT EXISTS ${dbConfig.database}`);
        await connection.end();

        const dbConnection = await pool.getConnection();

        await dbConnection.query(`
            CREATE TABLE IF NOT EXISTS users (
                id INT AUTO_INCREMENT PRIMARY KEY,
                fullName VARCHAR(255) NOT NULL,
                email VARCHAR(255) UNIQUE NOT NULL,
                password VARCHAR(255) NOT NULL,
                matricule VARCHAR(100) NOT NULL,
                discordId VARCHAR(100) NOT NULL,
                telephone VARCHAR(50) DEFAULT NULL,
                rib VARCHAR(100) DEFAULT NULL,
                division VARCHAR(100) DEFAULT NULL,
                role ENUM('BCSO', 'BCSO_SUP', 'BCSO_EM', 'BCSO_LEAD', 'LSPD', 'LSPD_SUP', 'LSPD_EM', 'LSPD_LEAD', 'GOUV', 'GOUV_SUP', 'GOUV_EM', 'GOUV_LEAD') DEFAULT 'BCSO',
                department ENUM('BCSO', 'LSPD', 'GOUV') DEFAULT 'BCSO',
                status ENUM('pending', 'approved', 'rejected') DEFAULT 'pending',
                createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
            )
        `);

        try {
            const [columns] = await dbConnection.query(`
                SELECT COLUMN_NAME 
                FROM INFORMATION_SCHEMA.COLUMNS 
                WHERE TABLE_SCHEMA = ? AND TABLE_NAME = 'users' AND COLUMN_NAME = 'telephone'
            `, [dbConfig.database]);
            if (columns.length === 0) {
                await dbConnection.query(`ALTER TABLE users ADD COLUMN telephone VARCHAR(50) DEFAULT NULL`);
            }
        } catch (e) {
            console.log('Colonne telephone existe déjà ou erreur:', e.message);
        }

        try {
            const [columns] = await dbConnection.query(`
                SELECT COLUMN_NAME 
                FROM INFORMATION_SCHEMA.COLUMNS 
                WHERE TABLE_SCHEMA = ? AND TABLE_NAME = 'users' AND COLUMN_NAME = 'rib'
            `, [dbConfig.database]);
            if (columns.length === 0) {
                await dbConnection.query(`ALTER TABLE users ADD COLUMN rib VARCHAR(100) DEFAULT NULL`);
            }
        } catch (e) {
            console.log('Colonne rib existe déjà ou erreur:', e.message);
        }

        try {
            const [columns] = await dbConnection.query(`
                SELECT COLUMN_NAME 
                FROM INFORMATION_SCHEMA.COLUMNS 
                WHERE TABLE_SCHEMA = ? AND TABLE_NAME = 'users' AND COLUMN_NAME = 'division'
            `, [dbConfig.database]);
            if (columns.length === 0) {
                await dbConnection.query(`ALTER TABLE users ADD COLUMN division VARCHAR(100) DEFAULT NULL`);
            }
        } catch (e) {
            console.log('Colonne division existe déjà ou erreur:', e.message);
        }

        try {
            const [columns] = await dbConnection.query(`
                SELECT COLUMN_NAME, DATA_TYPE
                FROM INFORMATION_SCHEMA.COLUMNS 
                WHERE TABLE_SCHEMA = ? AND TABLE_NAME = 'users' AND COLUMN_NAME = 'profilePhoto'
            `, [dbConfig.database]);
            if (columns.length === 0) {
                await dbConnection.query(`ALTER TABLE users ADD COLUMN profilePhoto MEDIUMTEXT DEFAULT NULL`);
                console.log('Colonne profilePhoto ajoutée');
            } else if (columns[0].DATA_TYPE === 'text') {
                await dbConnection.query(`ALTER TABLE users MODIFY COLUMN profilePhoto MEDIUMTEXT DEFAULT NULL`);
                console.log('Colonne profilePhoto migrée vers MEDIUMTEXT');
            }
        } catch (e) {
            console.log('Colonne profilePhoto existe déjà ou erreur:', e.message);
        }

        try {
            const [columns] = await dbConnection.query(`
                SELECT COLUMN_NAME 
                FROM INFORMATION_SCHEMA.COLUMNS 
                WHERE TABLE_SCHEMA = ? AND TABLE_NAME = 'users' AND COLUMN_NAME = 'role'
            `, [dbConfig.database]);
            if (columns.length === 0) {
                await dbConnection.query(`ALTER TABLE users ADD COLUMN role ENUM('BCSO', 'BCSO_SUP', 'BCSO_EM', 'BCSO_LEAD', 'LSPD', 'LSPD_SUP', 'LSPD_EM', 'LSPD_LEAD', 'GOUV', 'GOUV_SUP', 'GOUV_EM', 'GOUV_LEAD') DEFAULT 'BCSO'`);
            } else {
                try {
                    await dbConnection.query(`ALTER TABLE users MODIFY COLUMN role ENUM('BCSO', 'BCSO_SUP', 'BCSO_EM', 'BCSO_LEAD', 'LSPD', 'LSPD_SUP', 'LSPD_EM', 'LSPD_LEAD', 'GOUV', 'GOUV_SUP', 'GOUV_EM', 'GOUV_LEAD') DEFAULT 'BCSO'`);
                } catch (e) {
                    console.log('Erreur lors de la mise à jour de l\'ENUM role:', e.message);
                }
            }
        } catch (e) {
            console.log('Colonne role existe déjà ou erreur:', e.message);
        }

        await dbConnection.query(`
            CREATE TABLE IF NOT EXISTS webhooks (
                id INT AUTO_INCREMENT PRIMARY KEY,
                type ENUM('recensement', 'rookie', 'firstLincoln', 'incident', 'arrestation', 'log', 'DEV_RECENSEMENT', 'DEV_ARRESTATION', 'DEV_ROOKIE', 'DEV_FIRSTLINCOLN', 'DEV_INCIDENT', 'DEV_LOG') NOT NULL,
                department ENUM('BCSO', 'LSPD', 'GOUV') NULL,
                url VARCHAR(500) NOT NULL,
                enabled BOOLEAN DEFAULT TRUE,
                createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                UNIQUE KEY unique_webhook (type, department)
            )
        `);
        
        try {
            await dbConnection.query(`ALTER TABLE webhooks MODIFY COLUMN type ENUM('recensement', 'rookie', 'firstLincoln', 'incident', 'arrestation', 'log', 'DEV_RECENSEMENT', 'DEV_ARRESTATION', 'DEV_ROOKIE', 'DEV_FIRSTLINCOLN', 'DEV_INCIDENT', 'DEV_LOG') NOT NULL`);
        } catch (e) {
            console.log('Types DEV_* déjà présents dans webhooks ou erreur:', e.message);
        }
        try {
            await dbConnection.query(`ALTER TABLE webhooks MODIFY COLUMN department ENUM('BCSO', 'LSPD', 'GOUV') NULL`);
        } catch (e) {
            console.log('Department NULL déjà configuré ou erreur:', e.message);
        }
        
        try {
            await dbConnection.query(`ALTER TABLE users MODIFY COLUMN department ENUM('BCSO', 'LSPD', 'GOUV') DEFAULT 'BCSO'`);
            console.log('Colonne department users mise à jour avec GOUV');
        } catch (e) {
            console.log('Colonne department users déjà à jour ou erreur:', e.message);
        }
        
        try {
            await dbConnection.query(`ALTER TABLE recensements MODIFY COLUMN department ENUM('BCSO', 'LSPD', 'GOUV') NOT NULL`);
            console.log('Colonne department recensements mise à jour avec GOUV');
        } catch (e) {
            console.log('Colonne department recensements déjà à jour ou erreur:', e.message);
        }
        
        try {
            await dbConnection.query(`ALTER TABLE arrests MODIFY COLUMN department ENUM('BCSO', 'LSPD', 'GOUV') NOT NULL`);
            console.log('Colonne department arrests mise à jour avec GOUV');
        } catch (e) {
            console.log('Colonne department arrests déjà à jour ou erreur:', e.message);
        }
        
        try {
            await dbConnection.query(`ALTER TABLE contraventions MODIFY COLUMN department ENUM('BCSO', 'LSPD', 'GOUV') NOT NULL`);
            console.log('Colonne department contraventions mise à jour avec GOUV');
        } catch (e) {
            console.log('Colonne department contraventions déjà à jour ou erreur:', e.message);
        }
        
        try {
            await dbConnection.query(`ALTER TABLE plaintes MODIFY COLUMN department ENUM('BCSO', 'LSPD', 'GOUV') NOT NULL`);
            console.log('Colonne department plaintes mise à jour avec GOUV');
        } catch (e) {
            console.log('Colonne department plaintes déjà à jour ou erreur:', e.message);
        }
        
        try {
            await dbConnection.query(`ALTER TABLE incidents MODIFY COLUMN department ENUM('BCSO', 'LSPD', 'GOUV') NOT NULL`);
            console.log('Colonne department incidents mise à jour avec GOUV');
        } catch (e) {
            console.log('Colonne department incidents déjà à jour ou erreur:', e.message);
        }
        
        try {
            await dbConnection.query(`ALTER TABLE rookieReports MODIFY COLUMN department ENUM('BCSO', 'LSPD', 'GOUV') NOT NULL`);
            console.log('Colonne department rookieReports mise à jour avec GOUV');
        } catch (e) {
            console.log('Colonne department rookieReports déjà à jour ou erreur:', e.message);
        }
        
        try {
            await dbConnection.query(`ALTER TABLE settings MODIFY COLUMN department ENUM('BCSO', 'LSPD', 'GOUV') NOT NULL`);
            console.log('Colonne department settings mise à jour avec GOUV');
        } catch (e) {
            console.log('Colonne department settings déjà à jour ou erreur:', e.message);
        }
        
        try {
            await dbConnection.query(`ALTER TABLE arrests ADD COLUMN statutUP VARCHAR(50) DEFAULT NULL`);
            console.log('Colonne statutUP ajoutée à arrests');
        } catch (e) {
            console.log('Colonne statutUP déjà présente ou erreur:', e.message);
        }
        
        try {
            await dbConnection.query(`ALTER TABLE arrests ADD COLUMN statutAmende VARCHAR(50) DEFAULT NULL`);
            console.log('Colonne statutAmende ajoutée à arrests');
        } catch (e) {
            console.log('Colonne statutAmende déjà présente ou erreur:', e.message);
        }
        
        try {
            await dbConnection.query(`ALTER TABLE arrests ADD COLUMN saisie TEXT DEFAULT NULL`);
            console.log('Colonne saisie ajoutée à arrests');
        } catch (e) {
            console.log('Colonne saisie déjà présente ou erreur:', e.message);
        }

        await dbConnection.query(`
            CREATE TABLE IF NOT EXISTS recensements (
                id VARCHAR(50) PRIMARY KEY,
                department ENUM('BCSO', 'LSPD', 'GOUV') NOT NULL,
                prenomNom VARCHAR(255) NOT NULL,
                dateNaissance DATE,
                sexe ENUM('Masculin', 'Féminin', 'Autre') DEFAULT 'Masculin',
                type VARCHAR(100),
                taille VARCHAR(10),
                couleurCheveux VARCHAR(100),
                couleurYeux VARCHAR(100),
                telephone VARCHAR(50),
                profession VARCHAR(255),
                adresse TEXT,
                permisConduire JSON,
                ppa ENUM('Valide', 'Invalide') DEFAULT 'Invalide',
                photo VARCHAR(500),
                numero INT,
                dateCreation TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                dateModification TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                INDEX idx_department (department),
                INDEX idx_prenomNom (prenomNom),
                INDEX idx_telephone (telephone)
            )
        `);

        await dbConnection.query(`
            CREATE TABLE IF NOT EXISTS arrests (
                id VARCHAR(50) PRIMARY KEY,
                department ENUM('BCSO', 'LSPD', 'GOUV') NOT NULL,
                recensementId VARCHAR(50) NOT NULL,
                numero INT NOT NULL,
                date VARCHAR(50),
                heure VARCHAR(50),
                createur VARCHAR(255),
                status VARCHAR(50) DEFAULT 'Enregistré',
                titre VARCHAR(255),
                avocat VARCHAR(50) DEFAULT 'NON',
                amendeType VARCHAR(50),
                amende VARCHAR(50) DEFAULT '0',
                tempsType VARCHAR(50),
                temps VARCHAR(50) DEFAULT '0',
                chefAccusation TEXT,
                chargesDetail TEXT,
                corps TEXT,
                suspect JSON,
                createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                INDEX idx_department (department),
                INDEX idx_recensementId (recensementId),
                INDEX idx_numero (numero)
            )
        `);

        await dbConnection.query(`
            CREATE TABLE IF NOT EXISTS arrest_charges (
                id INT AUTO_INCREMENT PRIMARY KEY,
                arrestId VARCHAR(50) NOT NULL,
                categorie VARCHAR(255),
                nom VARCHAR(255),
                quantite VARCHAR(50) DEFAULT '1',
                amende VARCHAR(50) DEFAULT '0',
                up VARCHAR(50) DEFAULT '0',
                tentative VARCHAR(50) DEFAULT 'NON',
                complicite VARCHAR(50) DEFAULT 'NON',
                createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (arrestId) REFERENCES arrests(id) ON DELETE CASCADE,
                INDEX idx_arrestId (arrestId)
            )
        `);

        await dbConnection.query(`
            CREATE TABLE IF NOT EXISTS infractions (
                id INT AUTO_INCREMENT PRIMARY KEY,
                categorie ENUM('Contravention', 'Délit mineur', 'Délit majeur', 'Crime') NOT NULL,
                description VARCHAR(255) NOT NULL,
                amende INT NOT NULL DEFAULT 0,
                temps VARCHAR(10) NOT NULL DEFAULT '00:00',
                special TEXT,
                createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                INDEX idx_categorie (categorie)
            )
        `);

        await dbConnection.query(`
            CREATE TABLE IF NOT EXISTS contraventions (
                id VARCHAR(50) PRIMARY KEY,
                department ENUM('BCSO', 'LSPD', 'GOUV') NOT NULL,
                recensementId VARCHAR(50) NOT NULL,
                numero INT NOT NULL,
                date VARCHAR(50),
                heure VARCHAR(50),
                createur VARCHAR(255),
                status VARCHAR(50) DEFAULT 'Enregistré',
                montant VARCHAR(50),
                motif TEXT,
                lieu VARCHAR(255),
                data JSON,
                createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                INDEX idx_department (department),
                INDEX idx_recensementId (recensementId),
                INDEX idx_numero (numero)
            )
        `);
        
        try {
            await dbConnection.query(`ALTER TABLE contraventions ADD COLUMN data JSON`);
        } catch (e) {
        }

        await dbConnection.query(`
            CREATE TABLE IF NOT EXISTS government_weapons (
                id VARCHAR(50) PRIMARY KEY,
                recensementId VARCHAR(50) NOT NULL,
                prenomNom VARCHAR(255) NOT NULL,
                dateNaissance DATE,
                armeId VARCHAR(255) NOT NULL,
                dateDelivrance DATE,
                raison TEXT,
                statut ENUM('Actif', 'Non actif') DEFAULT 'Actif',
                raisonInactif TEXT,
                commentaire TEXT,
                createur VARCHAR(255),
                createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                INDEX idx_recensementId (recensementId),
                INDEX idx_armeId (armeId)
            )
        `);

        await dbConnection.query(`
            CREATE TABLE IF NOT EXISTS plaintes (
                id VARCHAR(50) PRIMARY KEY,
                department ENUM('BCSO', 'LSPD', 'GOUV') NOT NULL,
                recensementId VARCHAR(50) NOT NULL,
                numero INT NOT NULL,
                date VARCHAR(50),
                heure VARCHAR(50),
                createur VARCHAR(255),
                status VARCHAR(50) DEFAULT 'Enregistré',
                objet TEXT,
                description TEXT,
                data JSON,
                createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                INDEX idx_department (department),
                INDEX idx_recensementId (recensementId),
                INDEX idx_numero (numero)
            )
        `);
        
        try {
            await dbConnection.query(`ALTER TABLE plaintes ADD COLUMN data JSON`);
        } catch (e) {
        }

        await dbConnection.query(`
            CREATE TABLE IF NOT EXISTS incidents (
                id VARCHAR(50) PRIMARY KEY,
                department ENUM('BCSO', 'LSPD', 'GOUV') NOT NULL,
                numero INT NOT NULL,
                titre VARCHAR(255),
                type VARCHAR(255),
                dateIncident VARCHAR(50),
                heureIncident VARCHAR(50),
                dateRedaction VARCHAR(50),
                heureRedaction VARCHAR(50),
                leadTerrain VARCHAR(255),
                leadNegotiation VARCHAR(255),
                revendication TEXT,
                nbRavisseurs VARCHAR(50),
                nbInterpel VARCHAR(50),
                nbOtages VARCHAR(50),
                officiersImpliques TEXT,
                corps TEXT,
                redacteur JSON,
                createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                INDEX idx_department (department),
                INDEX idx_numero (numero)
            )
        `);

        await dbConnection.query(`
            CREATE TABLE IF NOT EXISTS rookieReports (
                id VARCHAR(50) PRIMARY KEY,
                department ENUM('BCSO', 'LSPD', 'GOUV') NOT NULL,
                numero INT NOT NULL,
                matricule VARCHAR(50),
                nom VARCHAR(255),
                dateRedaction VARCHAR(50),
                heureRedaction VARCHAR(50),
                dateDebut VARCHAR(50),
                heureDebut VARCHAR(50),
                dateFin VARCHAR(50),
                heureFin VARCHAR(50),
                redacteur VARCHAR(255),
                telephoneRedacteur VARCHAR(50),
                signature VARCHAR(255),
                commentaire TEXT,
                evaluations JSON,
                createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                INDEX idx_department (department),
                INDEX idx_numero (numero)
            )
        `);

        await dbConnection.query(`
            CREATE TABLE IF NOT EXISTS firstLincolnReports (
                id VARCHAR(50) PRIMARY KEY,
                department ENUM('BCSO', 'LSPD', 'GOUV') NOT NULL,
                numero INT NOT NULL,
                matricule VARCHAR(50),
                nom VARCHAR(255),
                dateRedaction VARCHAR(50),
                heureRedaction VARCHAR(50),
                dateDebut VARCHAR(50),
                heureDebut VARCHAR(50),
                dateFin VARCHAR(50),
                heureFin VARCHAR(50),
                redacteur VARCHAR(255),
                telephoneRedacteur VARCHAR(50),
                signature VARCHAR(255),
                commentaire TEXT,
                evaluations JSON,
                createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                INDEX idx_department (department),
                INDEX idx_numero (numero)
            )
        `);

        await dbConnection.query(`
            CREATE TABLE IF NOT EXISTS settings (
                id INT AUTO_INCREMENT PRIMARY KEY,
                department ENUM('BCSO', 'LSPD', 'GOUV') NOT NULL,
                settingKey VARCHAR(100) NOT NULL,
                settingValue TEXT,
                createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                UNIQUE KEY unique_setting (department, settingKey)
            )
        `);

        await dbConnection.query(`
            CREATE TABLE IF NOT EXISTS vehicules (
                id VARCHAR(50) PRIMARY KEY,
                department ENUM('BCSO', 'LSPD', 'GOUV') NOT NULL,
                plaque VARCHAR(50) NOT NULL,
                proprietaire VARCHAR(255) NOT NULL,
                marqueModel VARCHAR(255),
                vole ENUM('Oui', 'Non') DEFAULT 'Non',
                couleur VARCHAR(100),
                secondeCouleur VARCHAR(100),
                chefInculpation TEXT,
                dateCreation TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                dateModification TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                INDEX idx_department (department),
                INDEX idx_plaque (plaque),
                INDEX idx_proprietaire (proprietaire)
            )
        `);

        try {
            const [columns] = await dbConnection.query(`
                SELECT COLUMN_NAME 
                FROM INFORMATION_SCHEMA.COLUMNS 
                WHERE TABLE_SCHEMA = ? AND TABLE_NAME = 'users' AND COLUMN_NAME = 'department'
            `, [dbConfig.database]);
            if (columns.length === 0) {
                console.log('Ajout de la colonne department...');
                await dbConnection.query(`ALTER TABLE users ADD COLUMN department ENUM('BCSO', 'LSPD', 'GOUV') DEFAULT 'BCSO'`);
                console.log('Colonne department ajoutée avec succès');

                await dbConnection.query(`
                    UPDATE users 
                    SET department = CASE 
                        WHEN email LIKE '%@lspd.us' THEN 'LSPD'
                        WHEN email LIKE '%@gouv.us' THEN 'GOUV'
                        ELSE 'BCSO'
                    END
                    WHERE department IS NULL OR department = ''
                `);
                console.log('Départements mis à jour pour les utilisateurs existants');
            } else {
                console.log('Colonne department existe déjà');
            }
        } catch (e) {
            console.error('Erreur lors de l\'ajout de la colonne department:', e.message);
            try {
                await dbConnection.query(`ALTER TABLE users ADD COLUMN department ENUM('BCSO', 'LSPD', 'GOUV') DEFAULT 'BCSO'`);
                console.log('Colonne department ajoutée après erreur');
            } catch (e2) {
                if (e2.code !== 'ER_DUP_FIELDNAME') {
                    console.error('Impossible d\'ajouter la colonne department:', e2.message);
                }
            }
        }

        dbConnection.release();
        console.log('Base de données initialisée avec succès');
        
        await migrateInfractionsToSQL();
    } catch (error) {
        console.error('Erreur lors de l\'initialisation de la base de données:', error);
    }
}

const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, IMAGES_DIR);
    },
    filename: function (req, file, cb) {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, uniqueSuffix + path.extname(file.originalname));
    }
});
const upload = multer({ storage: storage });

app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(session({
    secret: 'mdt-flashland-secret-key-change-in-production',
    resave: false,
    saveUninitialized: false,
    cookie: { secure: false, maxAge: 24 * 60 * 60 * 1000 }
}));

app.use((req, res, next) => {
    const fileName = req.path.split('/').pop();
    const protectedFiles = ['bot.js', 'server.js', 'package.json', 'package-lock.json', '.env', 'remove-comments.js'];
    if (protectedFiles.includes(fileName)) {
        return res.status(404).send('Not Found');
    }
    next();
});

app.use(express.static(__dirname));
app.use('/images', express.static(IMAGES_DIR));

async function ensureDataDir() {
    try {
        await fs.mkdir(DATA_DIR, { recursive: true });
        await fs.mkdir(IMAGES_DIR, { recursive: true });
    } catch (error) {
        console.error('Erreur lors de la création des dossiers:', error);
    }
}

async function loadRecensementsFromSQL(department = 'BCSO') {
    try {
        const connection = await pool.getConnection();
        console.log(`[loadRecensementsFromSQL] Exécution de la requête pour département: ${department}`);
        
        const [allRows] = await connection.query('SELECT id, prenomNom, department FROM recensements');
        console.log(`[loadRecensementsFromSQL] Tous les recensements dans la DB (avant filtre):`, allRows);
        
        const [rows] = await connection.query(
            'SELECT * FROM recensements ORDER BY dateCreation DESC'
        );
        connection.release();

        console.log(`[loadRecensementsFromSQL] Nombre total de recensements trouvés: ${rows.length}`);
        if (rows.length > 0) {
            const byDept = {};
            rows.forEach(r => {
                const dept = r.department || 'NULL';
                byDept[dept] = (byDept[dept] || 0) + 1;
            });
            console.log(`[loadRecensementsFromSQL] Répartition par département:`, byDept);
            console.log(`[loadRecensementsFromSQL] Détails des recensements trouvés:`, rows.map(r => ({
                id: r.id,
                prenomNom: r.prenomNom,
                department: r.department
            })));
        } else {
            console.log(`[loadRecensementsFromSQL] Aucun recensement trouvé dans la DB`);
        }

        const result = rows.map(row => {
            let dateNaissance = null;
            if (row.dateNaissance) {
                if (row.dateNaissance instanceof Date) {
                    const year = row.dateNaissance.getFullYear();
                    const month = String(row.dateNaissance.getMonth() + 1).padStart(2, '0');
                    const day = String(row.dateNaissance.getDate()).padStart(2, '0');
                    dateNaissance = `${year}-${month}-${day}`;
                } else if (typeof row.dateNaissance === 'string') {
                    dateNaissance = row.dateNaissance.split('T')[0];
                }
            }
            
            let permisConduire = [];
            if (row.permisConduire) {
                try {
                    if (typeof row.permisConduire === 'string') {
                        permisConduire = JSON.parse(row.permisConduire);
                    } else {
                        permisConduire = row.permisConduire;
                    }
                } catch (e) {
                    console.error('Erreur lors du parsing de permisConduire pour recensement', row.id, ':', e);
                    permisConduire = [];
                }
            }
            
            return {
                id: row.id,
                prenomNom: row.prenomNom,
                dateNaissance: dateNaissance,
                sexe: row.sexe,
                type: row.type,
                taille: row.taille,
                couleurCheveux: row.couleurCheveux,
                couleurYeux: row.couleurYeux,
                telephone: row.telephone,
                profession: row.profession,
                adresse: row.adresse,
                permisConduire: permisConduire,
                ppa: row.ppa,
                photo: row.photo,
                numero: row.numero,
                dateCreation: row.dateCreation ? row.dateCreation.toISOString() : null,
                dateModification: row.dateModification ? row.dateModification.toISOString() : null
            };
        });
        
        console.log(`[loadRecensementsFromSQL] Nombre de recensements retournés après mapping: ${result.length}`);
        return result;
    } catch (error) {
        console.error('Erreur lors du chargement des recensements depuis SQL:', error);
        return [];
    }
}

async function saveRecensementToSQL(recensement, department = 'BCSO') {
    try {
        const connection = await pool.getConnection();

        if (!recensement.numero) {
            const [countRows] = await connection.query(
                'SELECT COUNT(*) as count FROM recensements WHERE department = ?',
                [department]
            );
            recensement.numero = (countRows[0].count || 0) + 1;
        }

                const permisConduireJSON = Array.isArray(recensement.permisConduire) 
            ? JSON.stringify(recensement.permisConduire) 
            : JSON.stringify([]);

        await connection.query(
            `INSERT INTO recensements (
                id, department, prenomNom, dateNaissance, sexe, type, taille,
                couleurCheveux, couleurYeux, telephone, profession, adresse,
                permisConduire, ppa, photo, numero
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            ON DUPLICATE KEY UPDATE
                prenomNom = VALUES(prenomNom),
                dateNaissance = VALUES(dateNaissance),
                sexe = VALUES(sexe),
                type = VALUES(type),
                taille = VALUES(taille),
                couleurCheveux = VALUES(couleurCheveux),
                couleurYeux = VALUES(couleurYeux),
                telephone = VALUES(telephone),
                profession = VALUES(profession),
                adresse = VALUES(adresse),
                permisConduire = VALUES(permisConduire),
                ppa = VALUES(ppa),
                photo = VALUES(photo),
                numero = VALUES(numero)`,
            [
                recensement.id,
                department,
                recensement.prenomNom,
                recensement.dateNaissance || null,
                recensement.sexe || 'Masculin',
                recensement.type || null,
                recensement.taille || null,
                recensement.couleurCheveux || null,
                recensement.couleurYeux || null,
                recensement.telephone || null,
                recensement.profession || null,
                recensement.adresse || null,
                permisConduireJSON,
                recensement.ppa || 'Invalide',
                recensement.photo || null,
                recensement.numero
            ]
        );
        connection.release();
        return true;
    } catch (error) {
        console.error('Erreur lors de la sauvegarde du recensement dans SQL:', error);
        throw error;
    }
}

async function loadVehiculesFromSQL(department = 'BCSO') {
    try {
        const connection = await pool.getConnection();
        const [rows] = await connection.query(
            'SELECT * FROM vehicules WHERE department = ? ORDER BY dateCreation DESC',
            [department]
        );
        connection.release();

        return rows.map(row => {
            return {
                id: row.id,
                plaque: row.plaque,
                proprietaire: row.proprietaire,
                marqueModel: row.marqueModel,
                vole: row.vole,
                couleur: row.couleur,
                secondeCouleur: row.secondeCouleur,
                chefInculpation: row.chefInculpation,
                dateCreation: row.dateCreation ? row.dateCreation.toISOString() : null,
                dateModification: row.dateModification ? row.dateModification.toISOString() : null
            };
        });
    } catch (error) {
        console.error('Erreur lors du chargement des véhicules depuis SQL:', error);
        return [];
    }
}

async function saveVehiculeToSQL(vehicule, department = 'BCSO') {
    try {
        const connection = await pool.getConnection();

        await connection.query(
            `INSERT INTO vehicules (
                id, department, plaque, proprietaire, marqueModel, vole,
                couleur, secondeCouleur, chefInculpation
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
            ON DUPLICATE KEY UPDATE
                plaque = VALUES(plaque),
                proprietaire = VALUES(proprietaire),
                marqueModel = VALUES(marqueModel),
                vole = VALUES(vole),
                couleur = VALUES(couleur),
                secondeCouleur = VALUES(secondeCouleur),
                chefInculpation = VALUES(chefInculpation)`,
            [
                vehicule.id,
                department,
                vehicule.plaque || '',
                vehicule.proprietaire || '',
                vehicule.marqueModel || null,
                vehicule.vole || 'Non',
                vehicule.couleur || null,
                vehicule.secondeCouleur || null,
                vehicule.chefInculpation || null
            ]
        );
        connection.release();
        return true;
    } catch (error) {
        console.error('Erreur lors de la sauvegarde du véhicule dans SQL:', error);
        throw error;
    }
}

async function loadArrestsFromSQL(department = 'BCSO') {
    try {
        const connection = await pool.getConnection();
        const [rows] = await connection.query(
            'SELECT * FROM arrests WHERE department = ? ORDER BY createdAt DESC',
            [department]
        );

        const arrests = {};
        for (const row of rows) {
            const [chargesRows] = await connection.query(
                'SELECT * FROM arrest_charges WHERE arrestId = ? ORDER BY id',
                [row.id]
            );

            const charges = chargesRows.map(charge => ({
                categorie: charge.categorie,
                category: charge.categorie,
                nom: charge.nom,
                name: charge.nom,
                quantite: charge.quantite,
                quantity: charge.quantite,
                amende: charge.amende,
                fine: charge.amende,
                up: charge.up,
                prison: charge.up,
                tentative: charge.tentative,
                attempt: charge.tentative,
                complicite: charge.complicite,
                complicity: charge.complicite
            }));

            if (!arrests[row.recensementId]) {
                arrests[row.recensementId] = [];
            }
            arrests[row.recensementId].push({
                id: row.id,
                numero: row.numero,
                date: row.date,
                heure: row.heure,
                createur: row.createur,
                status: row.status,
                titre: row.titre,
                avocat: row.avocat,
                amendeType: row.amendeType,
                amende: row.amende,
                tempsType: row.tempsType,
                temps: row.temps,
                chefAccusation: row.chefAccusation,
                chargesDetail: charges.length > 0 ? JSON.stringify(charges) : null,
                charges: charges,
                corps: row.corps,
                suspect: row.suspect ? JSON.parse(row.suspect) : null,
                statutUP: row.statutUP || null,
                statutAmende: row.statutAmende || null,
                saisie: row.saisie || null,
                createdAt: row.createdAt ? row.createdAt.toISOString() : null
            });
        }
        connection.release();
        return arrests;
    } catch (error) {
        console.error('Erreur lors du chargement des arrests depuis SQL:', error);
        return {};
    }
}

async function loadContraventionsFromSQL(department = 'BCSO') {
    try {
        const connection = await pool.getConnection();
        const [rows] = await connection.query(
            'SELECT * FROM contraventions WHERE department = ? ORDER BY createdAt DESC',
            [department]
        );
        connection.release();

        const contraventions = {};
        rows.forEach(row => {
            if (!contraventions[row.recensementId]) {
                contraventions[row.recensementId] = [];
            }
            
            let contravention = {
                id: row.id,
                numero: row.numero,
                date: row.date,
                heure: row.heure,
                createur: row.createur,
                status: row.status,
                montant: row.montant,
                motif: row.motif,
                lieu: row.lieu,
                createdAt: row.createdAt ? row.createdAt.toISOString() : null
            };
            
            if (row.data) {
                try {
                    const data = typeof row.data === 'string' ? JSON.parse(row.data) : row.data;
                    contravention = { ...contravention, ...data };
                } catch (e) {
                    console.error('Erreur lors du parsing des données JSON pour contravention', row.id, ':', e);
                }
            }
            
            contraventions[row.recensementId].push(contravention);
        });
        return contraventions;
    } catch (error) {
        console.error('Erreur lors du chargement des contraventions depuis SQL:', error);
        return {};
    }
}

async function loadPlaintesFromSQL(department = 'BCSO') {
    try {
        const connection = await pool.getConnection();
        const [rows] = await connection.query(
            'SELECT * FROM plaintes WHERE department = ? ORDER BY createdAt DESC',
            [department]
        );
        connection.release();

        const plaintes = {};
        rows.forEach(row => {
            if (!plaintes[row.recensementId]) {
                plaintes[row.recensementId] = [];
            }
            
            let plainte = {
                id: row.id,
                numero: row.numero,
                date: row.date,
                heure: row.heure,
                createur: row.createur,
                status: row.status,
                objet: row.objet,
                description: row.description,
                createdAt: row.createdAt ? row.createdAt.toISOString() : null
            };
            
            if (row.data) {
                try {
                    const data = typeof row.data === 'string' ? JSON.parse(row.data) : row.data;
                    plainte = { ...plainte, ...data };
                } catch (e) {
                    console.error('Erreur lors du parsing des données JSON pour plainte', row.id, ':', e);
                }
            }
            
            plaintes[row.recensementId].push(plainte);
        });
        return plaintes;
    } catch (error) {
        console.error('Erreur lors du chargement des plaintes depuis SQL:', error);
        return {};
    }
}

async function loadIncidentsFromSQL(department = 'BCSO') {
    try {
        const connection = await pool.getConnection();
        const [rows] = await connection.query(
            'SELECT * FROM incidents WHERE department = ? ORDER BY createdAt DESC',
            [department]
        );
        connection.release();

        return rows.map(row => {
            let redacteur = null;
            if (row.redacteur) {
                try {
                    if (typeof row.redacteur === 'string') {
                        redacteur = JSON.parse(row.redacteur);
                    } else {
                        redacteur = row.redacteur;
                    }
                } catch (e) {
                    console.error('Erreur lors du parsing du redacteur pour incident', row.id, ':', e);
                    redacteur = { fullName: 'N/A', matricule: 'N/A' };
                }
            }
            
            return {
                id: row.id,
                numero: row.numero,
                titre: row.titre,
                type: row.type,
                dateIncident: row.dateIncident,
                heureIncident: row.heureIncident,
                dateRedaction: row.dateRedaction,
                heureRedaction: row.heureRedaction,
                leadTerrain: row.leadTerrain,
                leadNegotiation: row.leadNegotiation,
                revendication: row.revendication,
                nbRavisseurs: row.nbRavisseurs,
                nbInterpel: row.nbInterpel,
                nbOtages: row.nbOtages,
                officiersImpliques: row.officiersImpliques,
                corps: row.corps,
                redacteur: redacteur,
                createdAt: row.createdAt ? row.createdAt.toISOString() : null
            };
        });
    } catch (error) {
        console.error('Erreur lors du chargement des incidents depuis SQL:', error);
        return [];
    }
}

async function loadRookieReportsFromSQL(department = 'BCSO') {
    try {
        const connection = await pool.getConnection();
        const [rows] = await connection.query(
            'SELECT * FROM rookieReports WHERE department = ? ORDER BY createdAt DESC',
            [department]
        );
        connection.release();

        return rows.map(row => ({
            id: row.id,
            numero: row.numero,
            matricule: row.matricule,
            nom: row.nom,
            dateRedaction: row.dateRedaction,
            heureRedaction: row.heureRedaction,
            dateDebut: row.dateDebut,
            heureDebut: row.heureDebut,
            dateFin: row.dateFin,
            heureFin: row.heureFin,
            redacteur: row.redacteur,
            telephoneRedacteur: row.telephoneRedacteur,
            signature: row.signature,
            commentaire: row.commentaire,
            evaluations: row.evaluations ? JSON.parse(row.evaluations) : null,
            createdAt: row.createdAt ? row.createdAt.toISOString() : null
        }));
    } catch (error) {
        console.error('Erreur lors du chargement des rookieReports depuis SQL:', error);
        return [];
    }
}

async function loadFirstLincolnReportsFromSQL(department = 'BCSO') {
    try {
        const connection = await pool.getConnection();
        const [rows] = await connection.query(
            'SELECT * FROM firstLincolnReports WHERE department = ? ORDER BY createdAt DESC',
            [department]
        );
        connection.release();

        return rows.map(row => ({
            id: row.id,
            numero: row.numero,
            matricule: row.matricule,
            nom: row.nom,
            dateRedaction: row.dateRedaction,
            heureRedaction: row.heureRedaction,
            dateDebut: row.dateDebut,
            heureDebut: row.heureDebut,
            dateFin: row.dateFin,
            heureFin: row.heureFin,
            redacteur: row.redacteur,
            telephoneRedacteur: row.telephoneRedacteur,
            signature: row.signature,
            commentaire: row.commentaire,
            evaluations: row.evaluations ? JSON.parse(row.evaluations) : null,
            createdAt: row.createdAt ? row.createdAt.toISOString() : null
        }));
    } catch (error) {
        console.error('Erreur lors du chargement des firstLincolnReports depuis SQL:', error);
        return [];
    }
}

async function loadSettingsFromSQL(department = 'BCSO') {
    try {
        const connection = await pool.getConnection();
        const [rows] = await connection.query(
            'SELECT * FROM settings'
        );
        connection.release();

        const settings = { bcso: {}, lspd: {}, gouv: {} };
        rows.forEach(row => {
            const dept = row.department.toLowerCase();
            if (settings[dept]) {
                settings[dept][row.settingKey] = row.settingValue;
            }
        });
        return settings;
    } catch (error) {
        console.error('Erreur lors du chargement des settings depuis SQL:', error);
        return { bcso: {}, lspd: {}, gouv: {} };
    }
}

async function readData(department = 'BCSO') {
    try {
        console.log('[readData] Chargement des données pour le département:', department);
        const recensements = await loadRecensementsFromSQL(department);
        const vehicules = await loadVehiculesFromSQL(department);
        const arrests = await loadArrestsFromSQL(department);
        const contraventions = await loadContraventionsFromSQL(department);
        const plaintes = await loadPlaintesFromSQL(department);
        const incidents = await loadIncidentsFromSQL(department);
        const rookieReports = await loadRookieReportsFromSQL(department);
        const firstLincolnReports = await loadFirstLincolnReportsFromSQL(department);
        const settings = await loadSettingsFromSQL(department);

        console.log('[readData] Résultats - Recensements:', recensements.length, 'Véhicules:', vehicules.length);

        return {
            recensements,
            vehicules,
            arrests,
            contraventions,
            plaintes,
            incidents,
            rookieReports,
            firstLincolnReports,
            settings
        };
    } catch (error) {
        console.error('Erreur lors de la lecture des données depuis SQL:', error);
        return {
            recensements: [],
            vehicules: [],
            arrests: {},
            contraventions: {},
            plaintes: {},
            incidents: [],
            rookieReports: [],
            firstLincolnReports: [],
            settings: {}
        };
    }
}

async function saveArrestsToSQL(arrests, department = 'BCSO') {
    try {
        const connection = await pool.getConnection();

        for (const [recensementId, arrestList] of Object.entries(arrests)) {
            if (!Array.isArray(arrestList)) continue;

            for (const arrest of arrestList) {
                const suspectJSON = arrest.suspect ? JSON.stringify(arrest.suspect) : null;
                
                let arrestDepartment = department;
                if (arrest.redacteur) {
                    if (arrest.redacteur.department) {
                        arrestDepartment = arrest.redacteur.department;
                    } else {
                        const email = arrest.redacteur.email || arrest.redacteur.mail || '';
                        if (email.includes('@gouv.us')) {
                            arrestDepartment = 'GOUV';
                        } else if (email.includes('@lspd.us')) {
                            arrestDepartment = 'LSPD';
                        } else if (email.includes('@bcso.us')) {
                            arrestDepartment = 'BCSO';
                        } else if (arrest.redacteur.matricule) {
                            try {
                                const [users] = await connection.query(
                                    'SELECT department FROM users WHERE matricule = ? LIMIT 1',
                                    [arrest.redacteur.matricule]
                                );
                                if (users && users.length > 0 && users[0].department) {
                                    arrestDepartment = users[0].department;
                                }
                            } catch (e) {
                                console.log('Erreur lors de la récupération du département pour l\'arrestation:', e);
                            }
                        }
                    }
                } else if (arrest.createur) {
                    try {
                        const [users] = await connection.query(
                            'SELECT department FROM users WHERE email = ? OR matricule = ? LIMIT 1',
                            [arrest.createur, arrest.createur]
                        );
                        if (users && users.length > 0 && users[0].department) {
                            arrestDepartment = users[0].department;
                        }
                    } catch (e) {
                        console.log('Erreur lors de la récupération du département pour l\'arrestation:', e);
                    }
                }

                await connection.query(
                    `INSERT INTO arrests (
                        id, department, recensementId, numero, date, heure, createur, status,
                        titre, avocat, amendeType, amende, tempsType, temps,
                        chefAccusation, chargesDetail, corps, suspect, statutUP, statutAmende, saisie
                    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                    ON DUPLICATE KEY UPDATE
                        date = VALUES(date),
                        heure = VALUES(heure),
                        createur = VALUES(createur),
                        status = VALUES(status),
                        titre = VALUES(titre),
                        avocat = VALUES(avocat),
                        amendeType = VALUES(amendeType),
                        amende = VALUES(amende),
                        tempsType = VALUES(tempsType),
                        temps = VALUES(temps),
                        chefAccusation = VALUES(chefAccusation),
                        chargesDetail = VALUES(chargesDetail),
                        corps = VALUES(corps),
                        suspect = VALUES(suspect),
                        statutUP = VALUES(statutUP),
                        statutAmende = VALUES(statutAmende),
                        saisie = VALUES(saisie),
                        department = VALUES(department)`,
                    [
                        arrest.id,
                        arrestDepartment,
                        recensementId,
                        arrest.numero || 0,
                        arrest.date || null,
                        arrest.heure || null,
                        arrest.createur || null,
                        arrest.status || 'Enregistré',
                        arrest.titre || null,
                        arrest.avocat || 'NON',
                        arrest.amendeType || null,
                        arrest.amende || '0',
                        arrest.tempsType || null,
                        arrest.temps || '0',
                        arrest.chefAccusation || null,
                        arrest.chargesDetail || null,
                        arrest.corps || null,
                        suspectJSON,
                        arrest.statutUP || null,
                        arrest.statutAmende || null,
                        arrest.saisie || null
                    ]
                );

                await connection.query('DELETE FROM arrest_charges WHERE arrestId = ?', [arrest.id]);

                let charges = [];
                if (arrest.chargesDetail) {
                    try {
                        const parsed = typeof arrest.chargesDetail === 'string' ? JSON.parse(arrest.chargesDetail) : arrest.chargesDetail;
                        if (Array.isArray(parsed)) {
                            charges = parsed;
                        }
                    } catch (e) {
                        console.log('chargesDetail n\'est pas un JSON valide, tentative de traitement direct');
                        if (Array.isArray(arrest.chargesDetail)) {
                            charges = arrest.chargesDetail;
                        }
                    }
                }

                if (charges.length > 0) {
                    for (const charge of charges) {
                        await connection.query(
                            `INSERT INTO arrest_charges (arrestId, categorie, nom, quantite, amende, up, tentative, complicite)
                            VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
                            [
                                arrest.id,
                                charge.categorie || charge.category || null,
                                charge.nom || charge.name || null,
                                charge.quantite || charge.quantity || '1',
                                charge.amende || charge.fine || '0',
                                charge.up || charge.prison || '0',
                                charge.tentative || charge.attempt || 'NON',
                                charge.complicite || charge.complicity || 'NON'
                            ]
                        );
                    }
                }
            }
        }

        connection.release();
        return true;
    } catch (error) {
        console.error('Erreur lors de la sauvegarde des arrests dans SQL:', error);
        throw error;
    }
}

async function saveContraventionsToSQL(contraventions, department = 'BCSO') {
    try {
        const connection = await pool.getConnection();

        for (const [recensementId, contraventionList] of Object.entries(contraventions)) {
            if (!Array.isArray(contraventionList)) continue;

            for (const contravention of contraventionList) {
                const dataJSON = JSON.stringify(contravention);
                await connection.query(
                    `INSERT INTO contraventions (
                        id, department, recensementId, numero, date, heure, createur, status,
                        montant, motif, lieu, data
                    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                    ON DUPLICATE KEY UPDATE
                        date = VALUES(date),
                        heure = VALUES(heure),
                        createur = VALUES(createur),
                        status = VALUES(status),
                        montant = VALUES(montant),
                        motif = VALUES(motif),
                        lieu = VALUES(lieu),
                        data = VALUES(data)`,
                    [
                        contravention.id,
                        department,
                        recensementId,
                        contravention.numero || 0,
                        contravention.date || null,
                        contravention.heure || null,
                        contravention.createur || null,
                        contravention.status || 'Enregistré',
                        contravention.montant || null,
                        contravention.motif || null,
                        contravention.lieu || null,
                        dataJSON
                    ]
                );
            }
        }

        connection.release();
        return true;
    } catch (error) {
        console.error('Erreur lors de la sauvegarde des contraventions dans SQL:', error);
        throw error;
    }
}

async function savePlaintesToSQL(plaintes, department = 'BCSO') {
    try {
        const connection = await pool.getConnection();

        for (const [recensementId, plainteList] of Object.entries(plaintes)) {
            if (!Array.isArray(plainteList)) continue;

            for (const plainte of plainteList) {
                const dataJSON = JSON.stringify(plainte);
                await connection.query(
                    `INSERT INTO plaintes (
                        id, department, recensementId, numero, date, heure, createur, status,
                        objet, description, data
                    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                    ON DUPLICATE KEY UPDATE
                        date = VALUES(date),
                        heure = VALUES(heure),
                        createur = VALUES(createur),
                        status = VALUES(status),
                        objet = VALUES(objet),
                        description = VALUES(description),
                        data = VALUES(data)`,
                    [
                        plainte.id,
                        department,
                        recensementId,
                        plainte.numero || 0,
                        plainte.date || null,
                        plainte.heure || null,
                        plainte.createur || null,
                        plainte.status || 'Enregistré',
                        plainte.objet || null,
                        plainte.description || null,
                        dataJSON
                    ]
                );
            }
        }

        connection.release();
        return true;
    } catch (error) {
        console.error('Erreur lors de la sauvegarde des plaintes dans SQL:', error);
        throw error;
    }
}

async function saveIncidentsToSQL(incidents, department = 'BCSO') {
    try {
        const connection = await pool.getConnection();

        for (const incident of incidents) {
            const redacteurJSON = incident.redacteur ? JSON.stringify(incident.redacteur) : null;
            
            let incidentDepartment = department;
            if (incident.redacteur) {
                if (incident.redacteur.department) {
                    incidentDepartment = incident.redacteur.department;
                } else {
                    const email = incident.redacteur.email || incident.redacteur.mail || '';
                    if (email.includes('@gouv.us')) {
                        incidentDepartment = 'GOUV';
                    } else if (email.includes('@lspd.us')) {
                        incidentDepartment = 'LSPD';
                    } else if (email.includes('@bcso.us')) {
                        incidentDepartment = 'BCSO';
                    } else if (incident.redacteur.matricule) {
                        try {
                            const [users] = await connection.query(
                                'SELECT department FROM users WHERE matricule = ? LIMIT 1',
                                [incident.redacteur.matricule]
                            );
                            if (users && users.length > 0 && users[0].department) {
                                incidentDepartment = users[0].department;
                            }
                        } catch (e) {
                            console.log('Erreur lors de la récupération du département pour l\'incident:', e);
                        }
                    }
                }
            } else if (incident.department) {
                incidentDepartment = incident.department;
            }

            await connection.query(
                `INSERT INTO incidents (
                    id, department, numero, titre, type, dateIncident, heureIncident,
                    dateRedaction, heureRedaction, leadTerrain, leadNegotiation,
                    revendication, nbRavisseurs, nbInterpel, nbOtages,
                    officiersImpliques, corps, redacteur
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                ON DUPLICATE KEY UPDATE
                    titre = VALUES(titre),
                    type = VALUES(type),
                    dateIncident = VALUES(dateIncident),
                    heureIncident = VALUES(heureIncident),
                    dateRedaction = VALUES(dateRedaction),
                    heureRedaction = VALUES(heureRedaction),
                    leadTerrain = VALUES(leadTerrain),
                    leadNegotiation = VALUES(leadNegotiation),
                    revendication = VALUES(revendication),
                    nbRavisseurs = VALUES(nbRavisseurs),
                    nbInterpel = VALUES(nbInterpel),
                    nbOtages = VALUES(nbOtages),
                    officiersImpliques = VALUES(officiersImpliques),
                    corps = VALUES(corps),
                    redacteur = VALUES(redacteur),
                    department = VALUES(department)`,
                [
                    incident.id,
                    incidentDepartment,
                    incident.numero || 0,
                    incident.titre || null,
                    incident.type || null,
                    incident.dateIncident || null,
                    incident.heureIncident || null,
                    incident.dateRedaction || null,
                    incident.heureRedaction || null,
                    incident.leadTerrain || null,
                    incident.leadNegotiation || null,
                    incident.revendication || null,
                    incident.nbRavisseurs || null,
                    incident.nbInterpel || null,
                    incident.nbOtages || null,
                    incident.officiersImpliques || null,
                    incident.corps || null,
                    redacteurJSON
                ]
            );
        }

        connection.release();
        return true;
    } catch (error) {
        console.error('Erreur lors de la sauvegarde des incidents dans SQL:', error);
        throw error;
    }
}

async function saveRookieReportsToSQL(rookieReports, department = 'BCSO') {
    try {
        const connection = await pool.getConnection();

        for (const report of rookieReports) {
            const evaluationsJSON = report.evaluations ? JSON.stringify(report.evaluations) : null;

            await connection.query(
                `INSERT INTO rookieReports (
                    id, department, numero, matricule, nom, dateRedaction, heureRedaction,
                    dateDebut, heureDebut, dateFin, heureFin, redacteur,
                    telephoneRedacteur, signature, commentaire, evaluations
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                ON DUPLICATE KEY UPDATE
                    matricule = VALUES(matricule),
                    nom = VALUES(nom),
                    dateRedaction = VALUES(dateRedaction),
                    heureRedaction = VALUES(heureRedaction),
                    dateDebut = VALUES(dateDebut),
                    heureDebut = VALUES(heureDebut),
                    dateFin = VALUES(dateFin),
                    heureFin = VALUES(heureFin),
                    redacteur = VALUES(redacteur),
                    telephoneRedacteur = VALUES(telephoneRedacteur),
                    signature = VALUES(signature),
                    commentaire = VALUES(commentaire),
                    evaluations = VALUES(evaluations)`,
                [
                    report.id,
                    department,
                    report.numero || 0,
                    report.matricule || null,
                    report.nom || null,
                    report.dateRedaction || null,
                    report.heureRedaction || null,
                    report.dateDebut || null,
                    report.heureDebut || null,
                    report.dateFin || null,
                    report.heureFin || null,
                    report.redacteur || null,
                    report.telephoneRedacteur || null,
                    report.signature || null,
                    report.commentaire || null,
                    evaluationsJSON
                ]
            );
        }

        connection.release();
        return true;
    } catch (error) {
        console.error('Erreur lors de la sauvegarde des rookieReports dans SQL:', error);
        throw error;
    }
}

async function saveFirstLincolnReportsToSQL(firstLincolnReports, department = 'BCSO') {
    try {
        const connection = await pool.getConnection();

        for (const report of firstLincolnReports) {
            const evaluationsJSON = report.evaluations ? JSON.stringify(report.evaluations) : null;

            await connection.query(
                `INSERT INTO firstLincolnReports (
                    id, department, numero, matricule, nom, dateRedaction, heureRedaction,
                    dateDebut, heureDebut, dateFin, heureFin, redacteur,
                    telephoneRedacteur, signature, commentaire, evaluations
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                ON DUPLICATE KEY UPDATE
                    matricule = VALUES(matricule),
                    nom = VALUES(nom),
                    dateRedaction = VALUES(dateRedaction),
                    heureRedaction = VALUES(heureRedaction),
                    dateDebut = VALUES(dateDebut),
                    heureDebut = VALUES(heureDebut),
                    dateFin = VALUES(dateFin),
                    heureFin = VALUES(heureFin),
                    redacteur = VALUES(redacteur),
                    telephoneRedacteur = VALUES(telephoneRedacteur),
                    signature = VALUES(signature),
                    commentaire = VALUES(commentaire),
                    evaluations = VALUES(evaluations)`,
                [
                    report.id,
                    department,
                    report.numero || 0,
                    report.matricule || null,
                    report.nom || null,
                    report.dateRedaction || null,
                    report.heureRedaction || null,
                    report.dateDebut || null,
                    report.heureDebut || null,
                    report.dateFin || null,
                    report.heureFin || null,
                    report.redacteur || null,
                    report.telephoneRedacteur || null,
                    report.signature || null,
                    report.commentaire || null,
                    evaluationsJSON
                ]
            );
        }

        connection.release();
        return true;
    } catch (error) {
        console.error('Erreur lors de la sauvegarde des firstLincolnReports dans SQL:', error);
        throw error;
    }
}

async function saveSettingsToSQL(settings, department = 'BCSO') {
    try {
        const connection = await pool.getConnection();

        const [allExistingRows] = await connection.query('SELECT department, settingKey FROM settings');
        const existingByDept = {};
        allExistingRows.forEach(row => {
            const dept = row.department.toLowerCase();
            if (!existingByDept[dept]) existingByDept[dept] = new Set();
            existingByDept[dept].add(row.settingKey);
        });

        const departments = ['bcso', 'lspd', 'gouv'];
        for (const dept of departments) {
            const deptSettings = settings[dept] || {};
            const deptUpper = dept.toUpperCase();
            const existingKeys = existingByDept[dept] || new Set();
            const newKeys = new Set(Object.keys(deptSettings));
            
            for (const key of existingKeys) {
                if (!newKeys.has(key)) {
                    console.log(`Suppression: ${deptUpper}.${key}`);
                    await connection.query(
                        'DELETE FROM settings WHERE department = ? AND settingKey = ?',
                        [deptUpper, key]
                    );
                }
            }
            
            for (const [key, value] of Object.entries(deptSettings)) {
                if (value !== null && value !== undefined && value !== '') {
                    await connection.query(
                        `INSERT INTO settings (department, settingKey, settingValue)
                        VALUES (?, ?, ?)
                        ON DUPLICATE KEY UPDATE settingValue = VALUES(settingValue)`,
                        [deptUpper, key, String(value)]
                    );
                }
            }
        }

        connection.release();
        return true;
    } catch (error) {
        console.error('Erreur lors de la sauvegarde des settings dans SQL:', error);
        throw error;
    }
}

async function writeData(data, department = 'BCSO') {
    try {
        if (data.recensements && Array.isArray(data.recensements)) {
            for (const recensement of data.recensements) {
                await saveRecensementToSQL(recensement, department);
            }
        }

        if (data.vehicules && Array.isArray(data.vehicules)) {
            for (const vehicule of data.vehicules) {
                await saveVehiculeToSQL(vehicule, department);
            }
        }

        if (data.arrests && typeof data.arrests === 'object') {
            await saveArrestsToSQL(data.arrests, department);
        }

        if (data.contraventions && typeof data.contraventions === 'object') {
            await saveContraventionsToSQL(data.contraventions, department);
        }

        if (data.plaintes && typeof data.plaintes === 'object') {
            await savePlaintesToSQL(data.plaintes, department);
        }

        if (data.incidents && Array.isArray(data.incidents)) {
            await saveIncidentsToSQL(data.incidents, department);
        }

        if (data.rookieReports && Array.isArray(data.rookieReports)) {
            await saveRookieReportsToSQL(data.rookieReports, department);
        }
        if (data.firstLincolnReports && Array.isArray(data.firstLincolnReports)) {
            await saveFirstLincolnReportsToSQL(data.firstLincolnReports, department);
        }

        if (data.settings && typeof data.settings === 'object') {
            await saveSettingsToSQL(data.settings, department);
        }

        return true;
    } catch (error) {
        console.error('Erreur lors de l\'écriture:', error);
        throw error;
    }
}

app.get('/api/data', async (req, res) => {
    try {
        if (!req.session || !req.session.userId) {
            return res.status(401).json({ error: 'Non authentifié' });
        }
        
        let department = req.session?.user?.department;
        
        if (!department && req.session?.userId) {
            try {
                const connection = await pool.getConnection();
                const [users] = await connection.query(
                    'SELECT department FROM users WHERE id = ?',
                    [req.session.userId]
                );
                connection.release();
                if (users.length > 0 && users[0].department) {
                    department = users[0].department;
                }
            } catch (e) {
                console.error('Erreur lors de la récupération du département:', e);
            }
        }
        
        if (!department && req.session?.userEmail) {
            const email = req.session.userEmail;
            if (email.includes('@lspd.us')) {
                department = 'LSPD';
            } else if (email.includes('@gouv.us')) {
                department = 'GOUV';
            } else {
                department = 'BCSO';
            }
        }
        
        department = department || 'BCSO';
        
        const data = await readData(department);
        res.json(data);
    } catch (error) {
        console.error('Erreur lors de la lecture:', error);
        res.status(500).json({ error: 'Erreur lors de la lecture des données' });
    }
});

app.delete('/api/vehicules/:id', async (req, res) => {
    try {
        const vehiculeId = req.params.id;
        console.log('Tentative de suppression du véhicule ID:', vehiculeId);
        
        if (!vehiculeId) {
            return res.status(400).json({ error: 'ID du véhicule requis' });
        }

        const connection = await pool.getConnection();
        
        const [rows] = await connection.query(
            'SELECT department FROM vehicules WHERE id = ?',
            [vehiculeId]
        );
        
        if (rows.length === 0) {
            connection.release();
            console.log('Véhicule non trouvé avec ID:', vehiculeId);
            return res.status(404).json({ error: 'Véhicule non trouvé' });
        }
        
        const department = rows[0].department;
        
        await connection.query('DELETE FROM vehicules WHERE id = ?', [vehiculeId]);
        
        connection.release();
        
        console.log('Véhicule supprimé avec succès, ID:', vehiculeId);
        res.json({ success: true, message: 'Véhicule supprimé avec succès' });
    } catch (error) {
        console.error('Erreur lors de la suppression du véhicule:', error);
        res.status(500).json({ error: 'Erreur lors de la suppression du véhicule: ' + error.message });
    }
});

app.post('/api/data', async (req, res) => {
    try {
        await ensureDataDir();
                const department = req.session?.user?.department || 'BCSO';
        await writeData(req.body, department);
        res.json({ success: true, message: 'Données sauvegardées avec succès' });
    } catch (error) {
        console.error('Erreur lors de la sauvegarde:', error);
        res.status(500).json({ error: 'Erreur lors de la sauvegarde des données' });
    }
});

app.post('/api/upload-image', upload.single('image'), async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ error: 'Aucun fichier uploadé' });
        }

        const filepath = req.file.path;
        const filename = req.file.filename;

        const localUrl = `/images/${filename}`;
        console.log('✅ Image sauvegardée localement:', localUrl);

        res.json({ success: true, url: localUrl, filename: filename });
    } catch (error) {
        console.error('Erreur lors de l\'upload:', error);
        res.status(500).json({ error: 'Erreur lors de l\'upload de l\'image' });
    }
});

app.post('/api/upload-image-base64', async (req, res) => {
    try {
        const { base64, extension = 'jpg' } = req.body;
        if (!base64) {
            return res.status(400).json({ error: 'Aucune donnée base64 fournie' });
        }

        await ensureDataDir();
        const base64Data = base64.replace(/^data:image\/\w+;base64,/, '');
        const buffer = Buffer.from(base64Data, 'base64');
        const filename = Date.now() + '-' + Math.round(Math.random() * 1E9) + '.' + extension;
        const filepath = path.join(IMAGES_DIR, filename);

        try {
            await fs.writeFile(filepath, buffer);
            console.log('✅ Fichier image écrit avec succès:', filepath);
        } catch (writeError) {
            console.error('❌ Erreur lors de l\'écriture du fichier:', writeError);
            throw writeError;
        }

        const stats = await fs.stat(filepath);
        console.log('✅ Vérification fichier - Taille:', stats.size, 'octets');

        const localUrl = `/images/${filename}`;
        console.log('✅ Image sauvegardée localement:', localUrl, '- Chemin complet:', filepath);

        res.json({ success: true, url: localUrl, filename: filename });
    } catch (error) {
        console.error('Erreur lors de l\'upload base64:', error);
        res.status(500).json({ error: 'Erreur lors de l\'upload de l\'image' });
    }
});
app.post('/api/auth/register', async (req, res) => {
    try {
        const { fullName, email, password, matricule, discordId } = req.body;

                if (!fullName || !email || !password || !matricule || !discordId) {
            return res.status(400).json({ error: 'Tous les champs sont requis' });
        }

        if (password.length < 5) {
            return res.status(400).json({ error: 'Le mot de passe doit contenir au moins 5 caractères' });
        }

        const emailDomain = email.split('@')[1];
        if (!emailDomain || (emailDomain !== 'lspd.us' && emailDomain !== 'bcso.us' && emailDomain !== 'gouv.us')) {
            return res.status(400).json({ error: 'L\'email doit être du domaine @lspd.us, @bcso.us ou @gouv.us' });
        }
        let department = 'BCSO';
        let defaultRole = 'BCSO';
        if (emailDomain === 'lspd.us') {
            department = 'LSPD';
            defaultRole = 'LSPD';
        } else if (emailDomain === 'gouv.us') {
            department = 'GOUV';
            defaultRole = 'GOUV';
        }

        const connection = await pool.getConnection();
        const [existingUsers] = await connection.query(
            'SELECT id FROM users WHERE email = ?',
            [email]
        );

        if (existingUsers.length > 0) {
            connection.release();
            return res.status(400).json({ error: 'Cet email est déjà utilisé' });
        }

                const hashedPassword = await bcrypt.hash(password, 10);

        const [result] = await connection.query(
            'INSERT INTO users (fullName, email, password, matricule, discordId, role, department, status) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
            [fullName, email, hashedPassword, matricule, discordId, defaultRole, department, 'pending']
        );

        connection.release();

        const newUser = {
            fullName: fullName,
            email: email,
            matricule: matricule,
            discordId: discordId,
            role: defaultRole,
            department: department,
            status: 'pending'
        };

        const dummyAuthor = {
            fullName: 'Système',
            matricule: 'SYS',
            discordId: null
        };

        try {
            const logWebhookUrl = await getLogWebhookUrl(department);
            if (logWebhookUrl) {
                const logEmbed = createLogEmbed('register', newUser, dummyAuthor, department);
                sendLogWebhook(logWebhookUrl, logEmbed).catch(err => 
                    console.error('Erreur envoi log création de compte:', err)
                );
            }
            
            const devLogWebhookUrl = await getDevLogWebhookUrl();
            if (devLogWebhookUrl) {
                const devLogEmbed = createLogEmbed('register', newUser, dummyAuthor, department);
                sendLogWebhook(devLogWebhookUrl, devLogEmbed).catch(err => 
                    console.error('Erreur envoi log DEV_LOG création de compte:', err)
                );
            }
        } catch (logError) {
            console.error('Erreur lors de l\'envoi du log de création de compte:', logError);
        }

        res.json({ 
            success: true, 
            message: 'Inscription réussie. Votre compte est en attente de validation.',
            userId: result.insertId
        });
    } catch (error) {
        console.error('Erreur lors de l\'inscription:', error);
        res.status(500).json({ error: 'Erreur lors de l\'inscription' });
    }
});

app.post('/api/auth/login', async (req, res) => {
    try {
        const { email, password } = req.body;

        if (!email || !password) {
            return res.status(400).json({ error: 'Email et mot de passe requis' });
        }

        const connection = await pool.getConnection();
        const [users] = await connection.query(
            'SELECT * FROM users WHERE email = ?',
            [email]
        );

        connection.release();

        if (users.length === 0) {
            return res.status(401).json({ error: 'Email ou mot de passe incorrect' });
        }

        const user = users[0];

        if (user.status !== 'approved') {
            return res.status(403).json({ error: 'Votre compte n\'a pas encore été approuvé par un administrateur' });
        }

        const passwordMatch = await bcrypt.compare(password, user.password);

        if (!passwordMatch) {
            return res.status(401).json({ error: 'Email ou mot de passe incorrect' });
        }

        req.session.userId = user.id;
        req.session.userEmail = user.email;
        req.session.userName = user.fullName;
        req.session.user = {
            id: user.id,
            email: user.email,
            fullName: user.fullName,
            department: user.department || (email.includes('@lspd.us') ? 'LSPD' : email.includes('@gouv.us') ? 'GOUV' : 'BCSO')
        };

        res.json({
            success: true,
            message: 'Connexion réussie',
            user: {
                id: user.id,
                fullName: user.fullName,
                email: user.email,
                matricule: user.matricule
            },
            token: 'session-' + user.id         });
    } catch (error) {
        console.error('Erreur lors de la connexion:', error);
        res.status(500).json({ error: 'Erreur lors de la connexion' });
    }
});

app.post('/api/auth/admin/login', async (req, res) => {
    try {
        const { password } = req.body;

        if (password === ADMIN_PASSWORD) {
            req.session.isAdmin = true;
            res.json({ success: true, message: 'Connexion administrateur réussie' });
        } else {
            res.status(401).json({ error: 'Mot de passe administrateur incorrect' });
        }
    } catch (error) {
        console.error('Erreur lors de la connexion admin:', error);
        res.status(500).json({ error: 'Erreur lors de la connexion' });
    }
});

function requireAdmin(req, res, next) {
    if (req.session.isAdmin) {
        next();
    } else {
        res.status(403).json({ error: 'Accès non autorisé' });
    }
}

app.get('/api/auth/admin/users', requireAdmin, async (req, res) => {
    try {
        const connection = await pool.getConnection();
        const [users] = await connection.query(
            'SELECT id, fullName, email, matricule, discordId, role, department, status, createdAt FROM users ORDER BY createdAt DESC'
        );
        connection.release();

        res.json({ success: true, users });
    } catch (error) {
        console.error('Erreur lors de la récupération des utilisateurs:', error);
        res.status(500).json({ error: 'Erreur lors de la récupération des utilisateurs' });
    }
});

const DEV_MDT_IDS = ['1204506056252858459', '468745336945508373', '520322954899226670', '405817986495283220'];

function isDevMDT(discordId) {
    return DEV_MDT_IDS.includes(discordId);
}

async function requireEM(req, res, next) {
    if (!req.session.userId) {
        return res.status(401).json({ error: 'Non authentifié' });
    }
    try {
        const connection = await pool.getConnection();
        const [users] = await connection.query(
            'SELECT role, department FROM users WHERE id = ?',
            [req.session.userId]
        );
        connection.release();
        
        if (users.length === 0) {
            return res.status(401).json({ error: 'Utilisateur non trouvé' });
        }
        
        const userRole = users[0].role || '';
        const userDepartment = users[0].department || 'BCSO';
        
        if (userRole.includes('_EM') || userRole.includes('_LEAD')) {
            req.userDepartment = userDepartment;
            req.userRole = userRole;
            next();
        } else {
            res.status(403).json({ error: 'Accès non autorisé - Rang EM requis' });
        }
    } catch (error) {
        console.error('Erreur lors de la vérification du rôle:', error);
        res.status(500).json({ error: 'Erreur serveur' });
    }
}

async function requireDEV_MDT(req, res, next) {
    if (!req.session.userId) {
        return res.status(401).json({ error: 'Non authentifié' });
    }
    try {
        const connection = await pool.getConnection();
        const [users] = await connection.query(
            'SELECT discordId FROM users WHERE id = ?',
            [req.session.userId]
        );
        connection.release();
        
        if (users.length === 0) {
            return res.status(401).json({ error: 'Utilisateur non trouvé' });
        }
        
        const userDiscordId = users[0].discordId || '';
        
        if (isDevMDT(userDiscordId)) {
            next();
        } else {
            res.status(403).json({ error: 'Accès non autorisé - DEV_MDT requis' });
        }
    } catch (error) {
        console.error('Erreur lors de la vérification DEV_MDT:', error);
        res.status(500).json({ error: 'Erreur serveur' });
    }
}

app.get('/api/auth/em/users', requireEM, async (req, res) => {
    try {
        const userDepartment = req.userDepartment || 'BCSO';
        const connection = await pool.getConnection();
        const [users] = await connection.query(
            'SELECT id, fullName, email, matricule, telephone, role, department, discordId, status, createdAt, profilePhoto FROM users WHERE department = ? ORDER BY status ASC, createdAt DESC',
            [userDepartment]
        );
        connection.release();

        res.json({ success: true, users });
    } catch (error) {
        console.error('Erreur lors de la récupération des utilisateurs:', error);
        res.status(500).json({ error: 'Erreur lors de la récupération des utilisateurs' });
    }
});

app.get('/api/auth/dev/users', requireDEV_MDT, async (req, res) => {
    try {
        const connection = await pool.getConnection();
        const [users] = await connection.query(
            'SELECT id, fullName, email, matricule, telephone, role, department, discordId, status, createdAt, profilePhoto FROM users ORDER BY status ASC, createdAt DESC',
            []
        );
        connection.release();

        res.json({ success: true, users });
    } catch (error) {
        console.error('Erreur lors de la récupération des utilisateurs DEV_MDT:', error);
        res.status(500).json({ error: 'Erreur lors de la récupération des utilisateurs' });
    }
});

app.post('/api/auth/em/change-role/:userId', requireEM, async (req, res) => {
    try {
        const userId = parseInt(req.params.userId);
        const { role } = req.body;
        const requesterDepartment = req.userDepartment || 'BCSO';

        if (!userId || isNaN(userId)) {
            return res.status(400).json({ error: 'ID utilisateur invalide' });
        }

        const validRoles = ['BCSO', 'BCSO_SUP', 'BCSO_EM', 'BCSO_LEAD', 
                           'LSPD', 'LSPD_SUP', 'LSPD_EM', 'LSPD_LEAD',
                           'GOUV', 'GOUV_SUP', 'GOUV_EM', 'GOUV_LEAD'];
        if (!role || !validRoles.includes(role)) {
            return res.status(400).json({ error: 'Rôle invalide' });
        }

        const connection = await pool.getConnection();

        const [users] = await connection.query(
            'SELECT id, department FROM users WHERE id = ?',
            [userId]
        );

        if (users.length === 0) {
            connection.release();
            return res.status(404).json({ error: 'Utilisateur non trouvé' });
        }

        const userDepartment = users[0].department || 'BCSO';

        if (userDepartment !== requesterDepartment) {
            connection.release();
            return res.status(403).json({ error: `Vous ne pouvez modifier que les utilisateurs de votre département (${requesterDepartment})` });
        }

        const isBCSORole = role.startsWith('BCSO');
        const isLSPDRole = role.startsWith('LSPD');
        const isGOUVRole = role.startsWith('GOUV');

        if ((userDepartment === 'BCSO' && !isBCSORole) || 
            (userDepartment === 'LSPD' && !isLSPDRole) || 
            (userDepartment === 'GOUV' && !isGOUVRole)) {
            connection.release();
            return res.status(400).json({ error: `Le rôle ${role} ne correspond pas au département ${userDepartment}` });
        }

        await connection.query(
            'UPDATE users SET role = ? WHERE id = ?',
            [role, userId]
        );

        connection.release();

        res.json({ success: true, message: 'Rôle modifié avec succès', newRole: role });
    } catch (error) {
        console.error('Erreur lors du changement de rôle:', error);
        res.status(500).json({ error: 'Erreur lors du changement de rôle: ' + error.message });
    }
});

app.delete('/api/auth/em/delete-user/:userId', requireEM, async (req, res) => {
    try {
        const userId = parseInt(req.params.userId);
        const requesterUserId = req.session.userId;
        const requesterDepartment = req.userDepartment || 'BCSO';

        if (!userId || isNaN(userId)) {
            return res.status(400).json({ error: 'ID utilisateur invalide' });
        }

        const connection = await pool.getConnection();

        const [targetUser] = await connection.query(
            'SELECT id, fullName, email, matricule, discordId, role, department FROM users WHERE id = ?',
            [userId]
        );

        if (targetUser.length === 0) {
            connection.release();
            return res.status(404).json({ error: 'Utilisateur non trouvé' });
        }

        const user = targetUser[0];
        const userDepartment = user.department || 'BCSO';

        if (userDepartment !== requesterDepartment) {
            connection.release();
            return res.status(403).json({ error: `Vous ne pouvez supprimer que les utilisateurs de votre département (${requesterDepartment})` });
        }

        const [authorRows] = await connection.query(
            'SELECT id, fullName, matricule, discordId FROM users WHERE id = ?',
            [requesterUserId]
        );

        await connection.query(
            'DELETE FROM users WHERE id = ?',
            [userId]
        );

        connection.release();

        if (authorRows.length > 0) {
            const author = authorRows[0];
            const target = {
                id: user.id,
                fullName: user.fullName,
                matricule: user.matricule,
                discordId: user.discordId,
                department: user.department,
                role: user.role
            };
            
            const logWebhookUrl = await getLogWebhookUrl(userDepartment);
            if (logWebhookUrl) {
                const logEmbed = createLogEmbed('delete', target, author, userDepartment);
                sendLogWebhook(logWebhookUrl, logEmbed).catch(err => 
                    console.error('Erreur envoi log suppression de compte:', err)
                );
            }
            
            const devLogWebhookUrl = await getDevLogWebhookUrl();
            if (devLogWebhookUrl) {
                const devLogEmbed = createLogEmbed('delete', target, author, userDepartment);
                sendLogWebhook(devLogWebhookUrl, devLogEmbed).catch(err => 
                    console.error('Erreur envoi log DEV_LOG suppression de compte:', err)
                );
            }
        }

        res.json({ success: true, message: 'Utilisateur supprimé avec succès' });
    } catch (error) {
        console.error('Erreur lors de la suppression de l\'utilisateur:', error);
        res.status(500).json({ error: 'Erreur lors de la suppression: ' + error.message });
    }
});

app.delete('/api/auth/dev/delete-user/:userId', requireDEV_MDT, async (req, res) => {
    try {
        const userId = parseInt(req.params.userId);
        const requesterUserId = req.session.userId;

        if (!userId || isNaN(userId)) {
            return res.status(400).json({ error: 'ID utilisateur invalide' });
        }

        const connection = await pool.getConnection();

        const [targetUser] = await connection.query(
            'SELECT id, fullName, email, matricule, discordId, role, department FROM users WHERE id = ?',
            [userId]
        );

        if (targetUser.length === 0) {
            connection.release();
            return res.status(404).json({ error: 'Utilisateur non trouvé' });
        }

        const user = targetUser[0];
        const userDepartment = user.department || 'BCSO';

        const [authorRows] = await connection.query(
            'SELECT id, fullName, matricule, discordId FROM users WHERE id = ?',
            [requesterUserId]
        );

        await connection.query(
            'DELETE FROM users WHERE id = ?',
            [userId]
        );

        connection.release();

        if (authorRows.length > 0) {
            const author = authorRows[0];
            const target = {
                id: user.id,
                fullName: user.fullName,
                matricule: user.matricule,
                discordId: user.discordId,
                department: user.department,
                role: user.role
            };
            
            const logWebhookUrl = await getLogWebhookUrl(userDepartment);
            if (logWebhookUrl) {
                const logEmbed = createLogEmbed('delete', target, author, userDepartment);
                sendLogWebhook(logWebhookUrl, logEmbed).catch(err => 
                    console.error('Erreur envoi log suppression de compte:', err)
                );
            }
            
            const devLogWebhookUrl = await getDevLogWebhookUrl();
            if (devLogWebhookUrl) {
                const devLogEmbed = createLogEmbed('delete', target, author, userDepartment);
                sendLogWebhook(devLogWebhookUrl, devLogEmbed).catch(err => 
                    console.error('Erreur envoi log DEV_LOG suppression de compte:', err)
                );
            }
        }

        res.json({ success: true, message: 'Utilisateur supprimé avec succès' });
    } catch (error) {
        console.error('Erreur lors de la suppression de l\'utilisateur:', error);
        res.status(500).json({ error: 'Erreur lors de la suppression: ' + error.message });
    }
});

async function canManageGovernmentWeapons(userId) {
    if (!userId) {
        return { allowed: false, reason: 'Non authentifié' };
    }
    try {
        const connection = await pool.getConnection();
        const [users] = await connection.query(
            'SELECT role, discordId FROM users WHERE id = ?',
            [userId]
        );
        connection.release();
        
        if (users.length === 0) {
            return { allowed: false, reason: 'Utilisateur non trouvé' };
        }
        
        const userRole = users[0].role || '';
        const userDiscordId = users[0].discordId || '';
        
        if (userRole === 'GOUV_LEAD' || isDevMDT(userDiscordId)) {
            return { allowed: true };
        }
        
        return { allowed: false, reason: 'Seuls GOUV_LEAD et DEV_MDT peuvent gérer les armes émises par le gouvernement' };
    } catch (error) {
        console.error('Erreur lors de la vérification des permissions:', error);
        return { allowed: false, reason: 'Erreur serveur' };
    }
}

async function canSetDiscordAPI(requesterUserId, targetUserId) {
    if (!requesterUserId) {
        return { allowed: false, reason: 'Non authentifié' };
    }

    try {
        const connection = await pool.getConnection();
        
        const [requesterRows] = await connection.query(
            'SELECT discordId, role, department FROM users WHERE id = ?',
            [requesterUserId]
        );
        
        if (requesterRows.length === 0) {
            connection.release();
            return { allowed: false, reason: 'Utilisateur demandeur non trouvé' };
        }

        const requester = requesterRows[0];
        const requesterDiscordId = requester.discordId || '';
        const requesterRole = requester.role || '';
        const requesterDept = requester.department || '';

        if (isDevMDT(requesterDiscordId)) {
            connection.release();
            return { allowed: true };
        }

        if (!requesterRole.includes('_EM') && !requesterRole.includes('_LEAD')) {
            connection.release();
            return { allowed: false, reason: 'Seuls les EM et LEAD peuvent modifier les ID Discord.' };
        }

        const [targetRows] = await connection.query(
            'SELECT department FROM users WHERE id = ?',
            [targetUserId]
        );

        if (targetRows.length === 0) {
            connection.release();
            return { allowed: false, reason: 'Utilisateur cible introuvable.' };
        }

        const targetDept = targetRows[0].department || '';

        if (requesterDept !== targetDept) {
            const deptName = targetDept === 'LSPD' ? 'LSPD' : targetDept === 'GOUV' ? 'GOUV' : 'BCSO';
            connection.release();
            return { allowed: false, reason: `Vous ne pouvez pas modifier les ID Discord des utilisateurs ${deptName} (vous êtes ${requesterDept}).` };
        }

        connection.release();
        return { allowed: true };
    } catch (error) {
        console.error('Erreur lors de la vérification canSetDiscord:', error);
        return { allowed: false, reason: 'Erreur serveur lors de la vérification des permissions' };
    }
}

app.post('/api/auth/dev/change-discord/:userId', requireDEV_MDT, async (req, res) => {
    try {
        const userId = parseInt(req.params.userId);
        const { oldDiscordId, newDiscordId } = req.body;

        if (!userId || isNaN(userId)) {
            return res.status(400).json({ error: 'ID utilisateur invalide' });
        }

        if (!newDiscordId || typeof newDiscordId !== 'string' || !/^\d+$/.test(newDiscordId.trim())) {
            return res.status(400).json({ error: 'Nouvel ID Discord invalide (doit contenir uniquement des chiffres)' });
        }

        const connection = await pool.getConnection();

        const [targetUser] = await connection.query(
            'SELECT id, fullName, discordId, department FROM users WHERE id = ?',
            [userId]
        );

        if (targetUser.length === 0) {
            connection.release();
            return res.status(404).json({ error: 'Utilisateur non trouvé' });
        }

        const currentDiscordId = targetUser[0].discordId || null;
        if (oldDiscordId && currentDiscordId !== oldDiscordId) {
            connection.release();
            return res.status(400).json({ error: 'L\'ancien ID Discord ne correspond pas à l\'ID Discord actuel de l\'utilisateur' });
        }

        const [existingNewId] = await connection.query(
            'SELECT id, fullName FROM users WHERE discordId = ? AND id != ?',
            [newDiscordId.trim(), userId]
        );

        if (existingNewId.length > 0) {
            connection.release();
            return res.status(400).json({ error: `L'ID Discord ${newDiscordId} est déjà utilisé par un autre utilisateur (${existingNewId[0].fullName || 'N/A'}).` });
        }

        await connection.query(
            'UPDATE users SET discordId = ? WHERE id = ?',
            [newDiscordId.trim(), userId]
        );

        const [updatedUser] = await connection.query(
            'SELECT id, fullName, matricule, discordId, department, role FROM users WHERE id = ?',
            [userId]
        );

        const [authorRows] = await connection.query(
            'SELECT id, fullName, matricule, discordId, department FROM users WHERE id = ?',
            [req.session.userId]
        );

        connection.release();

        if (updatedUser.length > 0 && authorRows.length > 0) {
            const target = updatedUser[0];
            const author = authorRows[0];
            const targetDept = target.department || 'BCSO';
            
            const logWebhookUrl = await getLogWebhookUrl(targetDept);
            if (logWebhookUrl) {
                const logEmbed = createLogEmbed('discord', target, author, targetDept);
                logEmbed.description = `**ID Discord modifié**\nAncien: \`${targetUser[0].discordId || 'Aucun'}\`\nNouveau: \`${newDiscordId.trim()}\``;
                sendLogWebhook(logWebhookUrl, logEmbed).catch(err => 
                    console.error('Erreur envoi log modification ID Discord:', err)
                );
            }
            
            const devLogWebhookUrl = await getDevLogWebhookUrl();
            if (devLogWebhookUrl) {
                const devLogEmbed = createLogEmbed('discord', target, author, targetDept);
                devLogEmbed.description = `**ID Discord modifié**\nAncien: \`${targetUser[0].discordId || 'Aucun'}\`\nNouveau: \`${newDiscordId.trim()}\``;
                sendLogWebhook(devLogWebhookUrl, devLogEmbed).catch(err => 
                    console.error('Erreur envoi log DEV_LOG modification ID Discord:', err)
                );
            }
        }

        res.json({ 
            success: true, 
            message: 'ID Discord modifié avec succès',
            newDiscordId: newDiscordId.trim()
        });
    } catch (error) {
        console.error('Erreur lors du changement d\'ID Discord:', error);
        res.status(500).json({ error: 'Erreur lors du changement d\'ID Discord: ' + error.message });
    }
});

app.post('/api/auth/em/change-discord/:userId', requireEM, async (req, res) => {
    try {
        const userId = parseInt(req.params.userId);
        const { oldDiscordId, newDiscordId } = req.body;
        const requesterUserId = req.session.userId;

        if (!userId || isNaN(userId)) {
            return res.status(400).json({ error: 'ID utilisateur invalide' });
        }

        if (!newDiscordId || typeof newDiscordId !== 'string' || !/^\d+$/.test(newDiscordId.trim())) {
            return res.status(400).json({ error: 'Nouvel ID Discord invalide (doit contenir uniquement des chiffres)' });
        }

        const canSet = await canSetDiscordAPI(requesterUserId, userId);
        if (!canSet.allowed) {
            return res.status(403).json({ error: canSet.reason });
        }

        const connection = await pool.getConnection();

        const [targetUser] = await connection.query(
            'SELECT id, fullName, discordId, department FROM users WHERE id = ?',
            [userId]
        );

        if (targetUser.length === 0) {
            connection.release();
            return res.status(404).json({ error: 'Utilisateur non trouvé' });
        }

        const currentDiscordId = targetUser[0].discordId || null;
        if (oldDiscordId && currentDiscordId !== oldDiscordId) {
            connection.release();
            return res.status(400).json({ error: 'L\'ancien ID Discord ne correspond pas à l\'ID Discord actuel de l\'utilisateur' });
        }

        const [existingNewId] = await connection.query(
            'SELECT id, fullName FROM users WHERE discordId = ? AND id != ?',
            [newDiscordId.trim(), userId]
        );

        if (existingNewId.length > 0) {
            connection.release();
            return res.status(400).json({ error: `L'ID Discord ${newDiscordId} est déjà utilisé par un autre utilisateur (${existingNewId[0].fullName || 'N/A'}).` });
        }

        await connection.query(
            'UPDATE users SET discordId = ? WHERE id = ?',
            [newDiscordId.trim(), userId]
        );

        const [updatedUser] = await connection.query(
            'SELECT id, fullName, matricule, discordId, department, role FROM users WHERE id = ?',
            [userId]
        );

        const [authorRows] = await connection.query(
            'SELECT id, fullName, matricule, discordId, department FROM users WHERE id = ?',
            [requesterUserId]
        );

        connection.release();

        if (updatedUser.length > 0 && authorRows.length > 0) {
            const target = updatedUser[0];
            const author = authorRows[0];
            const targetDept = target.department || 'BCSO';
            
            const logWebhookUrl = await getLogWebhookUrl(targetDept);
            if (logWebhookUrl) {
                const logEmbed = createLogEmbed('discord', target, author, targetDept);
                logEmbed.description = `**ID Discord modifié**\nAncien: \`${currentDiscordId || 'Aucun'}\`\nNouveau: \`${newDiscordId.trim()}\``;
                sendLogWebhook(logWebhookUrl, logEmbed).catch(err => 
                    console.error('Erreur envoi log modification ID Discord:', err)
                );
            }
            
            const devLogWebhookUrl = await getDevLogWebhookUrl();
            if (devLogWebhookUrl) {
                const devLogEmbed = createLogEmbed('discord', target, author, targetDept);
                devLogEmbed.description = `**ID Discord modifié**\nAncien: \`${currentDiscordId || 'Aucun'}\`\nNouveau: \`${newDiscordId.trim()}\``;
                sendLogWebhook(devLogWebhookUrl, devLogEmbed).catch(err => 
                    console.error('Erreur envoi log DEV_LOG modification ID Discord:', err)
                );
            }
        }

        res.json({ 
            success: true, 
            message: 'ID Discord modifié avec succès',
            newDiscordId: newDiscordId.trim()
        });
    } catch (error) {
        console.error('Erreur lors du changement d\'ID Discord:', error);
        res.status(500).json({ error: 'Erreur lors du changement d\'ID Discord: ' + error.message });
    }
});

app.post('/api/auth/em/accept-user/:userId', requireEM, async (req, res) => {
    try {
        const userId = parseInt(req.params.userId);
        const requesterUserId = req.session.userId;
        const requesterDepartment = req.userDepartment || 'BCSO';

        if (!userId || isNaN(userId)) {
            return res.status(400).json({ error: 'ID utilisateur invalide' });
        }

        const connection = await pool.getConnection();

        const [targetUser] = await connection.query(
            'SELECT id, fullName, email, matricule, discordId, role, department, status FROM users WHERE id = ?',
            [userId]
        );

        if (targetUser.length === 0) {
            connection.release();
            return res.status(404).json({ error: 'Utilisateur non trouvé' });
        }

        const user = targetUser[0];
        
        if (user.status !== 'pending') {
            connection.release();
            return res.status(400).json({ error: 'Cet utilisateur n\'est pas en attente de validation' });
        }

        if (user.department !== requesterDepartment) {
            connection.release();
            return res.status(403).json({ error: `Vous ne pouvez accepter que les utilisateurs de votre département (${requesterDepartment})` });
        }

        await connection.query(
            'UPDATE users SET status = ? WHERE id = ?',
            ['approved', userId]
        );

        const [updatedUser] = await connection.query(
            'SELECT id, fullName, matricule, discordId, department, role FROM users WHERE id = ?',
            [userId]
        );

        const [authorRows] = await connection.query(
            'SELECT id, fullName, matricule, discordId, department FROM users WHERE id = ?',
            [requesterUserId]
        );

        connection.release();

        if (updatedUser.length > 0 && authorRows.length > 0) {
            const target = updatedUser[0];
            const author = authorRows[0];
            const targetDept = target.department || 'BCSO';
            
            const logWebhookUrl = await getLogWebhookUrl(targetDept);
            if (logWebhookUrl) {
                const logEmbed = createLogEmbed('accept', target, author, targetDept, target.role);
                sendLogWebhook(logWebhookUrl, logEmbed).catch(err => 
                    console.error('Erreur envoi log acceptation de compte:', err)
                );
            }
            
            const devLogWebhookUrl = await getDevLogWebhookUrl();
            if (devLogWebhookUrl) {
                const devLogEmbed = createLogEmbed('accept', target, author, targetDept, target.role);
                sendLogWebhook(devLogWebhookUrl, devLogEmbed).catch(err => 
                    console.error('Erreur envoi log DEV_LOG acceptation de compte:', err)
                );
            }
        }

        res.json({ 
            success: true, 
            message: 'Utilisateur accepté avec succès'
        });
    } catch (error) {
        console.error('Erreur lors de l\'acceptation de l\'utilisateur:', error);
        res.status(500).json({ error: 'Erreur lors de l\'acceptation de l\'utilisateur: ' + error.message });
    }
});

app.post('/api/auth/em/refuse-user/:userId', requireEM, async (req, res) => {
    try {
        const userId = parseInt(req.params.userId);
        const requesterUserId = req.session.userId;
        const requesterDepartment = req.userDepartment || 'BCSO';

        if (!userId || isNaN(userId)) {
            return res.status(400).json({ error: 'ID utilisateur invalide' });
        }

        const connection = await pool.getConnection();

        const [targetUser] = await connection.query(
            'SELECT id, fullName, email, matricule, discordId, role, department, status FROM users WHERE id = ?',
            [userId]
        );

        if (targetUser.length === 0) {
            connection.release();
            return res.status(404).json({ error: 'Utilisateur non trouvé' });
        }

        const user = targetUser[0];
        
        if (user.status !== 'pending') {
            connection.release();
            return res.status(400).json({ error: 'Cet utilisateur n\'est pas en attente de validation' });
        }

        if (user.department !== requesterDepartment) {
            connection.release();
            return res.status(403).json({ error: `Vous ne pouvez refuser que les utilisateurs de votre département (${requesterDepartment})` });
        }

        const [authorRows] = await connection.query(
            'SELECT id, fullName, matricule, discordId, department FROM users WHERE id = ?',
            [requesterUserId]
        );

        const targetDept = user.department || 'BCSO';

        await connection.query(
            'DELETE FROM users WHERE id = ?',
            [userId]
        );

        connection.release();

        if (authorRows.length > 0) {
            const author = authorRows[0];
            const target = {
                id: user.id,
                fullName: user.fullName,
                matricule: user.matricule,
                discordId: user.discordId,
                department: user.department,
                role: user.role
            };
            
            const logWebhookUrl = await getLogWebhookUrl(targetDept);
            if (logWebhookUrl) {
                const logEmbed = createLogEmbed('reject', target, author, targetDept);
                sendLogWebhook(logWebhookUrl, logEmbed).catch(err => 
                    console.error('Erreur envoi log refus de compte:', err)
                );
            }
            
            const devLogWebhookUrl = await getDevLogWebhookUrl();
            if (devLogWebhookUrl) {
                const devLogEmbed = createLogEmbed('reject', target, author, targetDept);
                sendLogWebhook(devLogWebhookUrl, devLogEmbed).catch(err => 
                    console.error('Erreur envoi log DEV_LOG refus de compte:', err)
                );
            }
        }

        res.json({ 
            success: true, 
            message: 'Utilisateur refusé et supprimé avec succès'
        });
    } catch (error) {
        console.error('Erreur lors du refus de l\'utilisateur:', error);
        res.status(500).json({ error: 'Erreur lors du refus de l\'utilisateur: ' + error.message });
    }
});

app.post('/api/auth/dev/accept-user/:userId', requireDEV_MDT, async (req, res) => {
    try {
        const userId = parseInt(req.params.userId);

        if (!userId || isNaN(userId)) {
            return res.status(400).json({ error: 'ID utilisateur invalide' });
        }

        const connection = await pool.getConnection();

        const [targetUser] = await connection.query(
            'SELECT id, fullName, email, matricule, discordId, role, department, status FROM users WHERE id = ?',
            [userId]
        );

        if (targetUser.length === 0) {
            connection.release();
            return res.status(404).json({ error: 'Utilisateur non trouvé' });
        }

        const user = targetUser[0];
        
        if (user.status !== 'pending') {
            connection.release();
            return res.status(400).json({ error: 'Cet utilisateur n\'est pas en attente de validation' });
        }

        await connection.query(
            'UPDATE users SET status = ? WHERE id = ?',
            ['approved', userId]
        );

        const [updatedUser] = await connection.query(
            'SELECT id, fullName, matricule, discordId, department, role FROM users WHERE id = ?',
            [userId]
        );

        const [authorRows] = await connection.query(
            'SELECT id, fullName, matricule, discordId, department FROM users WHERE id = ?',
            [req.session.userId]
        );

        connection.release();

        if (updatedUser.length > 0 && authorRows.length > 0) {
            const target = updatedUser[0];
            const author = authorRows[0];
            const targetDept = target.department || 'BCSO';
            
            const logWebhookUrl = await getLogWebhookUrl(targetDept);
            if (logWebhookUrl) {
                const logEmbed = createLogEmbed('accept', target, author, targetDept, target.role);
                sendLogWebhook(logWebhookUrl, logEmbed).catch(err => 
                    console.error('Erreur envoi log acceptation de compte:', err)
                );
            }
            
            const devLogWebhookUrl = await getDevLogWebhookUrl();
            if (devLogWebhookUrl) {
                const devLogEmbed = createLogEmbed('accept', target, author, targetDept, target.role);
                sendLogWebhook(devLogWebhookUrl, devLogEmbed).catch(err => 
                    console.error('Erreur envoi log DEV_LOG acceptation de compte:', err)
                );
            }
        }

        res.json({ 
            success: true, 
            message: 'Utilisateur accepté avec succès'
        });
    } catch (error) {
        console.error('Erreur lors de l\'acceptation de l\'utilisateur:', error);
        res.status(500).json({ error: 'Erreur lors de l\'acceptation de l\'utilisateur: ' + error.message });
    }
});

app.post('/api/auth/dev/refuse-user/:userId', requireDEV_MDT, async (req, res) => {
    try {
        const userId = parseInt(req.params.userId);

        if (!userId || isNaN(userId)) {
            return res.status(400).json({ error: 'ID utilisateur invalide' });
        }

        const connection = await pool.getConnection();

        const [targetUser] = await connection.query(
            'SELECT id, fullName, email, matricule, discordId, role, department, status FROM users WHERE id = ?',
            [userId]
        );

        if (targetUser.length === 0) {
            connection.release();
            return res.status(404).json({ error: 'Utilisateur non trouvé' });
        }

        const user = targetUser[0];
        
        if (user.status !== 'pending') {
            connection.release();
            return res.status(400).json({ error: 'Cet utilisateur n\'est pas en attente de validation' });
        }

        const [authorRows] = await connection.query(
            'SELECT id, fullName, matricule, discordId, department FROM users WHERE id = ?',
            [req.session.userId]
        );

        const targetDept = user.department || 'BCSO';

        await connection.query(
            'DELETE FROM users WHERE id = ?',
            [userId]
        );

        connection.release();

        if (authorRows.length > 0) {
            const author = authorRows[0];
            const target = {
                id: user.id,
                fullName: user.fullName,
                matricule: user.matricule,
                discordId: user.discordId,
                department: user.department,
                role: user.role
            };
            
            const logWebhookUrl = await getLogWebhookUrl(targetDept);
            if (logWebhookUrl) {
                const logEmbed = createLogEmbed('reject', target, author, targetDept);
                sendLogWebhook(logWebhookUrl, logEmbed).catch(err => 
                    console.error('Erreur envoi log refus de compte:', err)
                );
            }
            
            const devLogWebhookUrl = await getDevLogWebhookUrl();
            if (devLogWebhookUrl) {
                const devLogEmbed = createLogEmbed('reject', target, author, targetDept);
                sendLogWebhook(devLogWebhookUrl, devLogEmbed).catch(err => 
                    console.error('Erreur envoi log DEV_LOG refus de compte:', err)
                );
            }
        }

        res.json({ 
            success: true, 
            message: 'Utilisateur refusé et supprimé avec succès'
        });
    } catch (error) {
        console.error('Erreur lors du refus de l\'utilisateur:', error);
        res.status(500).json({ error: 'Erreur lors du refus de l\'utilisateur: ' + error.message });
    }
});

async function loadInfractionsFromSQL() {
    try {
        const connection = await pool.getConnection();
        const [infractions] = await connection.query(
            'SELECT * FROM infractions ORDER BY categorie, description'
        );
        connection.release();
        
        const infractionsDB = {
            'Contravention': [],
            'Délit mineur': [],
            'Délit majeur': [],
            'Crime': []
        };
        
        infractions.forEach(infraction => {
            if (infractionsDB[infraction.categorie]) {
                infractionsDB[infraction.categorie].push({
                    description: infraction.description,
                    amende: infraction.amende,
                    temps: infraction.temps,
                    special: infraction.special || ''
                });
            }
        });
        
        return infractionsDB;
    } catch (error) {
        console.error('Erreur lors du chargement des infractions:', error);
        return null;
    }
}

async function migrateInfractionsToSQL() {
    try {
        const conn1 = await pool.getConnection();
        const [existing] = await conn1.query('SELECT COUNT(*) as count FROM infractions');
        conn1.release();
        
        if (existing[0].count > 0) {
            return;
        }
        
        const infractionsDB = {
            'Contravention': [
                { description: 'Conduite dangereuse', amende: 800, temps: '00:00', special: 'Retrait du permis de la catégorie du véhicule' },
                { description: 'Conduite sans permis', amende: 1500, temps: '00:00', special: 'Saisie temporaire du véhicule (fourrière)' },
                { description: 'Excès de vitesse', amende: 800, temps: '00:00', special: '' },
                { description: 'Stationnement gênant/interdit', amende: 500, temps: '00:00', special: 'Saisie temporaire du véhicule (fourrière)' },
                { description: 'Véhicule non en état', amende: 500, temps: '00:00', special: 'Saisie temporaire du véhicule (fourrière)' },
                { description: 'Dissimulation du visage', amende: 1500, temps: '00:00', special: 'Retrait de l\'élément dissimulant par l\'individu' },
                { description: 'Holster visible', amende: 600, temps: '00:00', special: 'Retrait du holster par l\'individu' },
                { description: 'Ivresse sur la voie publique', amende: 500, temps: '00:05', special: 'Dégrisement' },
                { description: 'Utilisation abusive de l\'avertisseur sonore', amende: 500, temps: '00:00', special: 'Saisie temporaire du véhicule (fourrière)' }
            ],
            'Délit mineur': [
                { description: 'Braconnage / Chasse / Pêche illégale', amende: 2500, temps: '00:15', special: 'Rapport d\'arrestation' },
                { description: 'Braquage LTD', amende: 2500, temps: '00:10', special: 'Rapport d\'arrestation' },
                { description: 'Corruption de mineur', amende: 3000, temps: '00:15', special: 'Rapport d\'arrestation' },
                { description: 'Dégradation de bien public', amende: 1500, temps: '00:10', special: 'Rapport d\'arrestation' },
                { description: 'Détention de stupéfiant', amende: 3000, temps: '00:15', special: 'Rapport d\'arrestation' },
                { description: 'Détournement de mineur', amende: 5000, temps: '00:20', special: 'Rapport d\'arrestation' },
                { description: 'Défaut de présentation d\'identité', amende: 1000, temps: '00:05', special: 'Rapport d\'arrestation' },
                { description: 'Entrave à circulation', amende: 2000, temps: '00:10', special: 'Rapport d\'arrestation' },
                { description: 'Menace de mort', amende: 3000, temps: '00:15', special: 'Rapport d\'arrestation' },
                { description: 'Non présentation à une convocation', amende: 2000, temps: '00:10', special: 'Rapport d\'arrestation' },
                { description: 'Outrage à agent', amende: 3000, temps: '00:15', special: 'Rapport d\'arrestation' },
                { description: 'Port d\'arme illégale', amende: 2500, temps: '00:15', special: 'Rapport d\'arrestation' },
                { description: 'Refus d\'obtempérer', amende: 2000, temps: '00:10', special: 'Rapport d\'arrestation' },
                { description: 'Resquillage', amende: 500, temps: '00:05', special: 'Rapport d\'arrestation' },
                { description: 'Vente de stupéfiant', amende: 5000, temps: '00:20', special: 'Rapport d\'arrestation' },
                { description: 'Vol simple', amende: 2000, temps: '00:10', special: 'Rapport d\'arrestation' },
                { description: 'Violence volontaire', amende: 3000, temps: '00:15', special: 'Rapport d\'arrestation' }
            ],
            'Délit majeur': [
                { description: 'Association de malfaiteurs', amende: 15000, temps: '00:30', special: 'Comparution immédiate' },
                { description: 'Atteinte à l\'autorité de la justice', amende: 20000, temps: '00:25', special: 'Comparution immédiate' },
                { description: 'Braquage de commerce', amende: 15000, temps: '00:30', special: 'Comparution immédiate' },
                { description: 'Braquage de banque', amende: 30000, temps: '00:40', special: 'Comparution immédiate' },
                { description: 'Complicité de crime', amende: 20000, temps: '00:25', special: 'Comparution immédiate' },
                { description: 'Destruction / dissimulation de preuve', amende: 8000, temps: '00:25', special: 'Comparution immédiate' },
                { description: 'Diffusion de contenu illégal en ligne', amende: 8000, temps: '00:20', special: 'Comparution immédiate' },
                { description: 'Collaboration avec un Etat / Organisation hostile', amende: 30000, temps: '00:45', special: 'Comparution immédiate' },
                { description: 'Entrave à une opération / enquête de police', amende: 8000, temps: '00:15', special: 'Comparution immédiate' },
                { description: 'Fabrication de stupéfiant', amende: 10000, temps: '00:20', special: 'Comparution immédiate' },
                { description: 'Intrusion illégale sur le territoire étatique', amende: 20000, temps: '00:30', special: 'Comparution immédiate' },
                { description: 'Mauvaise utilisation d\'une arme à feu avec PPA', amende: 20000, temps: '00:25', special: 'Comparution immédiate' },
                { description: 'Multirécidivisme', amende: 100000, temps: '01:00', special: 'Comparution immédiate' },
                { description: 'Non présentation injustifiée à une convocation judiciaire', amende: 50000, temps: '00:30', special: 'Comparution immédiate' },
                { description: 'Obstruction à la justice', amende: 20000, temps: '00:20', special: 'Comparution immédiate' },
                { description: 'Outrage à magistrat', amende: 15000, temps: '00:20', special: 'Comparution immédiate' },
                { description: 'Parjure', amende: 40000, temps: '00:30', special: 'Comparution immédiate' },
                { description: 'Possession d\'arme blanche illégale sans PPA', amende: 5000, temps: '00:10', special: 'Comparution immédiate' },
                { description: 'Possession / Usage de faux', amende: 25000, temps: '00:15', special: 'Comparution immédiate' },
                { description: 'Possession d\'arme de catégorie D (Pistolet céramique, Beretta, SNS, Glock 17) sans PPA', amende: 30000, temps: '00:25', special: 'Comparution immédiate' },
                { description: 'Possession d\'arme de catégorie B (SMG, Tec-9, MP5K MK2, Assaut SMG, HKUMP)', amende: 50000, temps: '00:35', special: 'Comparution immédiate' },
                { description: 'Prise d\'otage sur agent de l\'état', amende: 15000, temps: '00:20', special: 'Comparution immédiate' },
                { description: 'Prise d\'otage sur civil', amende: 7500, temps: '00:10', special: 'Comparution immédiate' },
                { description: 'Tentative de Corruption', amende: 10000, temps: '00:25', special: 'Comparution immédiate' },
                { description: 'Tir sur civil', amende: 20000, temps: '00:25', special: 'Comparution immédiate' },
                { description: 'Tir sur agent de l\'état', amende: 30000, temps: '00:35', special: 'Comparution immédiate' },
                { description: 'Usurpation de fonction', amende: 10000, temps: '00:20', special: 'Comparution immédiate' },
                { description: 'Usurpation d\'identité', amende: 10000, temps: '00:25', special: 'Comparution immédiate' }
            ],
            'Crime': [
                { description: 'Abus de confiance', amende: 45000, temps: '00:40', special: '' },
                { description: 'Atteinte à l\'intégrité physique', amende: 20000, temps: '00:20', special: '' },
                { description: 'Atteinte à la sécurité intérieure', amende: 300000, temps: '01:00', special: '' },
                { description: 'Braquage de la Pacific Standard', amende: 100000, temps: '00:40', special: '' },
                { description: 'Braquage de la plateforme pétrolière', amende: 95000, temps: '00:35', special: '' },
                { description: 'Cavale', amende: 300000, temps: '01:00', special: '' },
                { description: 'Corruption', amende: 100000, temps: '01:00', special: '' },
                { description: 'Détournement de fonds', amende: 60000, temps: '00:40', special: '' },
                { description: 'Organisation d\'évasion', amende: 150000, temps: '01:00', special: '' },
                { description: 'Extorsion de fonds', amende: 100000, temps: '01:00', special: '' },
                { description: 'Fabrication de faux', amende: 300000, temps: '01:00', special: '' },
                { description: 'Fraude fiscale', amende: 50000, temps: '01:00', special: '' },
                { description: 'Kidnapping / Séquestration / Viol', amende: 60000, temps: '01:00', special: '' },
                { description: 'Meurtre sur civil', amende: 500000, temps: '150:00', special: '' },
                { description: 'Meurtre sur agent de l\'état', amende: 1000000, temps: '168:00', special: '' },
                { description: 'Possession d\'arme de catégorie A (AK-47, AK-U, Thompson)', amende: 150000, temps: '01:00', special: '' },
                { description: 'Possession d\'arme de catégorie C (Canon Scié, Fusil à...)', amende: 100000, temps: '00:50', special: '' },
                { description: 'Terrorisme', amende: 1000000, temps: '168:00', special: '' },
                { description: 'Trafic d\'armes', amende: 300000, temps: '01:00', special: '' },
                { description: 'Violation de secret professionnel / Droit de réserve', amende: 100000, temps: '01:00', special: '' }
            ]
        };
        
        const conn2 = await pool.getConnection();
        for (const [categorie, infractions] of Object.entries(infractionsDB)) {
            for (const infraction of infractions) {
                await conn2.query(
                    'INSERT INTO infractions (categorie, description, amende, temps, special) VALUES (?, ?, ?, ?, ?)',
                    [categorie, infraction.description, infraction.amende, infraction.temps, infraction.special || '']
                );
            }
        }
        conn2.release();
        
        await saveInfractionsToFile();
    } catch (error) {
        console.error('Erreur lors de la migration des infractions:', error);
    }
}

async function saveInfractionsToFile() {
    try {
        const infractionsDB = await loadInfractionsFromSQL();
        if (!infractionsDB) return;
        
        const scriptPath = path.join(__dirname, 'script.js');
        let scriptContent = await fs.readFile(scriptPath, 'utf8');
        
        const infractionsDBStart = scriptContent.indexOf('const infractionsDB = {');
        if (infractionsDBStart === -1) return;
        
        const infractionsDBEnd = scriptContent.indexOf('};', infractionsDBStart) + 2;
        if (infractionsDBEnd === 1) return;
        
        let newInfractionsDB = 'const infractionsDB = ' + JSON.stringify(infractionsDB, null, 4) + ';';
        scriptContent = scriptContent.substring(0, infractionsDBStart) + newInfractionsDB + scriptContent.substring(infractionsDBEnd);
        await fs.writeFile(scriptPath, scriptContent, 'utf8');
    } catch (error) {
        console.error('Erreur lors de la sauvegarde des infractions dans le fichier:', error);
    }
}

app.get('/api/infractions', async (req, res) => {
    try {
        const connection = await pool.getConnection();
        const [infractions] = await connection.query(
            'SELECT * FROM infractions ORDER BY categorie, description'
        );
        connection.release();
        res.json({ success: true, infractions });
    } catch (error) {
        console.error('Erreur lors de la récupération des infractions:', error);
        res.status(500).json({ error: 'Erreur lors de la récupération des infractions' });
    }
});

app.post('/api/infractions', requireDEV_MDT, async (req, res) => {
    try {
        const { categorie, description, amende, temps, special } = req.body;
        
        if (!categorie || !description || amende === undefined || !temps) {
            return res.status(400).json({ error: 'Tous les champs requis doivent être fournis' });
        }
        
        const connection = await pool.getConnection();
        const [result] = await connection.query(
            'INSERT INTO infractions (categorie, description, amende, temps, special) VALUES (?, ?, ?, ?, ?)',
            [categorie, description, parseInt(amende), temps, special || '']
        );
        connection.release();
        
        await saveInfractionsToFile();
        
        res.json({ success: true, id: result.insertId, message: 'Infraction ajoutée avec succès' });
    } catch (error) {
        console.error('Erreur lors de l\'ajout de l\'infraction:', error);
        res.status(500).json({ error: 'Erreur lors de l\'ajout de l\'infraction: ' + error.message });
    }
});

app.put('/api/infractions/:id', requireDEV_MDT, async (req, res) => {
    try {
        const id = parseInt(req.params.id);
        const { categorie, description, amende, temps, special } = req.body;
        
        if (!id || isNaN(id)) {
            return res.status(400).json({ error: 'ID invalide' });
        }
        
        if (!categorie || !description || amende === undefined || !temps) {
            return res.status(400).json({ error: 'Tous les champs requis doivent être fournis' });
        }
        
        const connection = await pool.getConnection();
        await connection.query(
            'UPDATE infractions SET categorie = ?, description = ?, amende = ?, temps = ?, special = ? WHERE id = ?',
            [categorie, description, parseInt(amende), temps, special || '', id]
        );
        connection.release();
        
        await saveInfractionsToFile();
        
        res.json({ success: true, message: 'Infraction modifiée avec succès' });
    } catch (error) {
        console.error('Erreur lors de la modification de l\'infraction:', error);
        res.status(500).json({ error: 'Erreur lors de la modification de l\'infraction: ' + error.message });
    }
});

app.delete('/api/infractions/:id', requireDEV_MDT, async (req, res) => {
    try {
        const id = parseInt(req.params.id);
        
        if (!id || isNaN(id)) {
            return res.status(400).json({ error: 'ID invalide' });
        }
        
        const connection = await pool.getConnection();
        await connection.query('DELETE FROM infractions WHERE id = ?', [id]);
        connection.release();
        
        await saveInfractionsToFile();
        
        res.json({ success: true, message: 'Infraction supprimée avec succès' });
    } catch (error) {
        console.error('Erreur lors de la suppression de l\'infraction:', error);
        res.status(500).json({ error: 'Erreur lors de la suppression de l\'infraction: ' + error.message });
    }
});

app.get('/api/government-weapons/:recensementId', async (req, res) => {
    try {
        const recensementId = req.params.recensementId;
        if (!recensementId) {
            return res.status(400).json({ error: 'ID de recensement requis' });
        }
        
        const connection = await pool.getConnection();
        const [weapons] = await connection.query(
            'SELECT * FROM government_weapons WHERE recensementId = ? ORDER BY createdAt DESC',
            [recensementId]
        );
        connection.release();
        
        res.json({ success: true, weapons });
    } catch (error) {
        console.error('Erreur lors de la récupération des armes:', error);
        res.status(500).json({ error: 'Erreur lors de la récupération des armes: ' + error.message });
    }
});

app.post('/api/government-weapons', async (req, res) => {
    try {
        if (!req.session.userId) {
            return res.status(401).json({ error: 'Non authentifié' });
        }
        
        const canManage = await canManageGovernmentWeapons(req.session.userId);
        if (!canManage.allowed) {
            return res.status(403).json({ error: canManage.reason });
        }
        
        const { recensementId, prenomNom, dateNaissance, armeId, dateDelivrance, raison, statut, raisonInactif, commentaire } = req.body;
        
        if (!recensementId || !prenomNom || !armeId || !dateDelivrance || !raison || !statut) {
            return res.status(400).json({ error: 'Champs requis manquants' });
        }
        
        const connection = await pool.getConnection();
        const [users] = await connection.query(
            'SELECT fullName, matricule FROM users WHERE id = ?',
            [req.session.userId]
        );
        
        const createur = users.length > 0 ? `${users[0].matricule || ''} | ${users[0].fullName || ''}` : 'Inconnu';
        const weaponId = `weapon_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        
        await connection.query(
            `INSERT INTO government_weapons (
                id, recensementId, prenomNom, dateNaissance, armeId, dateDelivrance,
                raison, statut, raisonInactif, commentaire, createur
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [
                weaponId, recensementId, prenomNom, dateNaissance || null, armeId,
                dateDelivrance, raison, statut, raisonInactif || null, commentaire || null, createur
            ]
        );
        
        connection.release();
        
        res.json({ success: true, id: weaponId, message: 'Arme enregistrée avec succès' });
    } catch (error) {
        console.error('Erreur lors de la création de l\'arme:', error);
        res.status(500).json({ error: 'Erreur lors de la création de l\'arme: ' + error.message });
    }
});

app.put('/api/government-weapons/:id', async (req, res) => {
    try {
        if (!req.session.userId) {
            return res.status(401).json({ error: 'Non authentifié' });
        }
        
        const canManage = await canManageGovernmentWeapons(req.session.userId);
        if (!canManage.allowed) {
            return res.status(403).json({ error: canManage.reason });
        }
        
        const weaponId = req.params.id;
        const { prenomNom, dateNaissance, armeId, dateDelivrance, raison, statut, raisonInactif, commentaire } = req.body;
        
        if (!prenomNom || !armeId || !dateDelivrance || !raison || !statut) {
            return res.status(400).json({ error: 'Champs requis manquants' });
        }
        
        const connection = await pool.getConnection();
        
        await connection.query(
            `UPDATE government_weapons SET
                prenomNom = ?, dateNaissance = ?, armeId = ?, dateDelivrance = ?,
                raison = ?, statut = ?, raisonInactif = ?, commentaire = ?
            WHERE id = ?`,
            [
                prenomNom, dateNaissance || null, armeId, dateDelivrance,
                raison, statut, raisonInactif || null, commentaire || null, weaponId
            ]
        );
        
        connection.release();
        
        res.json({ success: true, message: 'Arme modifiée avec succès' });
    } catch (error) {
        console.error('Erreur lors de la modification de l\'arme:', error);
        res.status(500).json({ error: 'Erreur lors de la modification de l\'arme: ' + error.message });
    }
});

app.delete('/api/government-weapons/:id', async (req, res) => {
    try {
        if (!req.session.userId) {
            return res.status(401).json({ error: 'Non authentifié' });
        }
        
        const canManage = await canManageGovernmentWeapons(req.session.userId);
        if (!canManage.allowed) {
            return res.status(403).json({ error: canManage.reason });
        }
        
        const weaponId = req.params.id;
        
        const connection = await pool.getConnection();
        await connection.query('DELETE FROM government_weapons WHERE id = ?', [weaponId]);
        connection.release();
        
        res.json({ success: true, message: 'Arme supprimée avec succès' });
    } catch (error) {
        console.error('Erreur lors de la suppression de l\'arme:', error);
        res.status(500).json({ error: 'Erreur lors de la suppression de l\'arme: ' + error.message });
    }
});

app.post('/api/auth/admin/approve/:userId', requireAdmin, async (req, res) => {
    try {
        const userId = req.params.userId;

        const connection = await pool.getConnection();
        await connection.query(
            'UPDATE users SET status = ? WHERE id = ?',
            ['approved', userId]
        );
        connection.release();

        res.json({ success: true, message: 'Utilisateur approuvé avec succès' });
    } catch (error) {
        console.error('Erreur lors de l\'approbation:', error);
        res.status(500).json({ error: 'Erreur lors de l\'approbation' });
    }
});

app.post('/api/auth/admin/reject/:userId', requireAdmin, async (req, res) => {
    try {
        const userId = req.params.userId;

        const connection = await pool.getConnection();
        await connection.query(
            'UPDATE users SET status = ? WHERE id = ?',
            ['rejected', userId]
        );
        connection.release();

        res.json({ success: true, message: 'Utilisateur rejeté' });
    } catch (error) {
        console.error('Erreur lors du rejet:', error);
        res.status(500).json({ error: 'Erreur lors du rejet' });
    }
});

app.post('/api/auth/admin/change-role/:userId', requireAdmin, async (req, res) => {
    try {
        const userId = parseInt(req.params.userId);
        const { role } = req.body;

        if (!userId || isNaN(userId)) {
            return res.status(400).json({ error: 'ID utilisateur invalide' });
        }

        if (!role || !['BCSO', 'BCSO_SUP', 'BCSO_EM', 'LSPD', 'LSPD_SUP', 'LSPD_EM'].includes(role)) {
            return res.status(400).json({ error: 'Rôle invalide' });
        }

        const connection = await pool.getConnection();

        const [users] = await connection.query(
            'SELECT id, department FROM users WHERE id = ?',
            [userId]
        );

        if (users.length === 0) {
            connection.release();
            return res.status(404).json({ error: 'Utilisateur non trouvé' });
        }

        const userDepartment = users[0].department || 'BCSO';

        const isBCSORole = role.startsWith('BCSO');
        const isLSPDRole = role.startsWith('LSPD');
        const isGOUVRole = role.startsWith('GOUV');

        if ((userDepartment === 'BCSO' && !isBCSORole) || 
            (userDepartment === 'LSPD' && !isLSPDRole) || 
            (userDepartment === 'GOUV' && !isGOUVRole)) {
            connection.release();
            return res.status(400).json({ error: `Le rôle ${role} ne correspond pas au département ${userDepartment}` });
        }

        await connection.query(
            'UPDATE users SET role = ? WHERE id = ?',
            [role, userId]
        );

        const [updatedUsers] = await connection.query(
            'SELECT role FROM users WHERE id = ?',
            [userId]
        );

        connection.release();

        if (updatedUsers.length > 0 && updatedUsers[0].role === role) {
            console.log(`Rôle modifié avec succès pour l'utilisateur ${userId}: ${role}`);
            res.json({ success: true, message: 'Rôle modifié avec succès', newRole: role });
        } else {
            res.status(500).json({ error: 'La mise à jour du rôle a échoué' });
        }
    } catch (error) {
        console.error('Erreur lors du changement de rôle:', error);
        res.status(500).json({ error: 'Erreur lors du changement de rôle: ' + error.message });
    }
});

app.get('/api/auth/check', async (req, res) => {
    if (req.session.userId) {
        try {
            const connection = await pool.getConnection();
            const [users] = await connection.query(
                'SELECT id, fullName, email, matricule, discordId, telephone, rib, division, role, department, status, profilePhoto FROM users WHERE id = ?',
                [req.session.userId]
            );
            connection.release();

            if (users.length > 0) {
                const user = users[0];
                res.json({ 
                    authenticated: true, 
                    user: {
                        id: user.id,
                        email: user.email,
                        fullName: user.fullName,
                        matricule: user.matricule,
                        discordId: user.discordId,
                        telephone: user.telephone || '',
                        rib: user.rib || '',
                        division: user.division || '',
                        role: user.role || (user.department === 'LSPD' ? 'LSPD' : user.department === 'GOUV' ? 'GOUV' : 'BCSO'),
                        department: user.department || 'BCSO',
                        status: user.status,
                        profilePhoto: user.profilePhoto || null
                    }
                });
            } else {
                res.json({ authenticated: false });
            }
        } catch (error) {
            console.error('Erreur lors de la récupération des informations utilisateur:', error);
            res.json({ authenticated: false });
        }
    } else {
        res.json({ authenticated: false });
    }
});

app.post('/api/auth/logout', (req, res) => {
    req.session.destroy((err) => {
        if (err) {
            console.error('Erreur lors de la destruction de la session:', err);
        }
        res.clearCookie('connect.sid');
        res.json({ success: true, message: 'Déconnexion réussie' });
    });
});

app.get('/api/auth/users/approved', async (req, res) => {
    try {
        const connection = await pool.getConnection();
        const [users] = await connection.query(
            'SELECT id, fullName, matricule, email, telephone FROM users WHERE status = ? ORDER BY fullName ASC',
            ['approved']
        );
        connection.release();

        res.json({ success: true, users });
    } catch (error) {
        console.error('Erreur lors de la récupération des utilisateurs:', error);
        res.status(500).json({ error: 'Erreur lors de la récupération des utilisateurs' });
    }
});

app.post('/api/auth/settings', async (req, res) => {
    if (!req.session.userId) {
        return res.status(401).json({ error: 'Non authentifié' });
    }

    try {
        const { fullName, matricule, telephone, rib, division, profilePhoto } = req.body;

        console.log('Sauvegarde paramètres - profilePhoto reçu:', profilePhoto ? `Oui (${profilePhoto.length} caractères)` : 'Non');
        
        const connection = await pool.getConnection();
        await connection.query(
            `UPDATE users 
             SET fullName = ?, matricule = ?, telephone = ?, rib = ?, division = ?, profilePhoto = ?
             WHERE id = ?`,
            [fullName, matricule, telephone || null, rib || null, division || null, profilePhoto || null, req.session.userId]
        );
        
        console.log('Photo de profil sauvegardée pour l\'utilisateur:', req.session.userId);

        connection.release();

        req.session.userName = fullName;

        res.json({ 
            success: true, 
            message: 'Paramètres sauvegardés avec succès' 
        });
    } catch (error) {
        console.error('Erreur lors de la sauvegarde des paramètres:', error);
        res.status(500).json({ error: 'Erreur lors de la sauvegarde des paramètres' });
    }
});
async function sendDiscordWebhook(webhookUrl, embed, content = null) {
    try {
        if (!webhookUrl || typeof webhookUrl !== 'string') {
            throw new Error('URL du webhook invalide ou manquante');
        }

        let url;
        try {
            url = new URL(webhookUrl);
            console.log('URL parsée:', {
                hostname: url.hostname,
                port: url.port,
                pathname: url.pathname,
                protocol: url.protocol
            });
        } catch (e) {
            console.error('Erreur lors du parsing de l\'URL:', e.message);
            throw new Error(`URL du webhook invalide: ${webhookUrl} - ${e.message}`);
        }

        if (!url.hostname.includes('discord.com') && !url.hostname.includes('discordapp.com')) {
            console.warn('Attention: L\'URL ne semble pas être une URL Discord valide');
        }

        const port = url.port ? parseInt(url.port) : (url.protocol === 'https:' ? 443 : 80);
        const options = {
            hostname: url.hostname,
            port: port,
            path: url.pathname + url.search,
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'User-Agent': 'MDT-Flashland/1.0'
            }
        };

        console.log('Options de requête:', {
            hostname: options.hostname,
            port: options.port,
            path: options.path.substring(0, 50) + '...',
            method: options.method
        });

        if (!embed || typeof embed !== 'object') {
            throw new Error('Embed invalide');
        }

        let data;
        try {
            if (embed.image) {
                console.warn('⚠️ ATTENTION: embed.image est défini, suppression pour utiliser uniquement thumbnail');
                delete embed.image;
            }

            if (embed.thumbnail) {
                console.log('✅ Thumbnail présente dans l\'embed:', embed.thumbnail.url);
            } else {
                console.warn('⚠️ Aucune thumbnail dans l\'embed');
            }

            const payload = {
                embeds: [embed],
                username: 'MDT Flashland',                 avatar_url: ''             };

            if (content) {
                payload.content = content;
            }

            data = JSON.stringify(payload);
            console.log('Embed sérialisé avec succès, taille:', data.length, 'caractères');
            console.log('Structure de l\'embed:', JSON.stringify({
                title: embed.title,
                hasThumbnail: !!embed.thumbnail,
                hasImage: !!embed.image,
                thumbnailUrl: embed.thumbnail?.url
            }));

            JSON.parse(data);
            console.log('JSON validé avec succès');
        } catch (jsonError) {
            console.error('Erreur lors de la sérialisation de l\'embed:', jsonError);
            console.error('Embed problématique:', JSON.stringify(embed, null, 2).substring(0, 500));
            throw new Error('Erreur lors de la sérialisation de l\'embed: ' + jsonError.message);
        }

        console.log('Envoi du webhook Discord vers:', url.hostname + url.pathname);
        console.log('Taille des données à envoyer:', data.length, 'octets');

        return new Promise((resolve, reject) => {
            const protocol = url.protocol === 'https:' ? https : http;
            const req = protocol.request(options, (res) => {
                let responseData = '';
                res.on('data', (chunk) => {
                    responseData += chunk;
                });
                res.on('end', () => {
                    if (res.statusCode >= 200 && res.statusCode < 300) {
                        console.log('Webhook envoyé avec succès, status:', res.statusCode);
                        resolve(responseData);
                    } else {
                        const errorMsg = responseData || 'Pas de réponse';
                        const error = new Error(`Webhook failed with status ${res.statusCode}: ${errorMsg}`);
                        console.error('Erreur webhook Discord:', error.message);
                        console.error('Réponse complète:', responseData);
                        reject(error);
                    }
                });
            });

            req.on('error', (error) => {
                console.error('Erreur de connexion webhook:', error);
                console.error('Code d\'erreur:', error.code);
                console.error('Message:', error.message);
                reject(error);
            });

            req.setTimeout(10000, () => {
                console.error('Timeout lors de l\'envoi du webhook');
                req.destroy();
                reject(new Error('Timeout lors de l\'envoi du webhook (10 secondes)'));
            });

            try {
                req.write(data);
                req.end();
            } catch (writeError) {
                console.error('Erreur lors de l\'écriture des données:', writeError);
                reject(writeError);
            }
        });
    } catch (error) {
        console.error('Erreur lors de l\'envoi du webhook Discord:', error);
        throw error;
    }
}

async function getDevWebhookUrl(type) {
    try {
        const devType = `DEV_${type.toUpperCase()}`;
        const connection = await pool.getConnection();
        const [rows] = await connection.query(
            'SELECT url FROM webhooks WHERE type = ? AND department IS NULL AND (enabled = 1 OR enabled = TRUE)',
            [devType]
        );
        connection.release();
        if (rows.length > 0) {
            return rows[0].url;
        }
        return null;
    } catch (error) {
        console.error('Erreur lors de la récupération du webhook DEV:', error);
        return null;
    }
}

async function getWebhookUrl(type, department) {
    try {
        console.log(`Recherche du webhook pour type="${type}", department="${department}"`);
        const connection = await pool.getConnection();

        const [allRows] = await connection.query(
            'SELECT * FROM webhooks WHERE type = ? AND department = ?',
            [type, department]
        );
        console.log(`Webhooks trouvés pour ${type}/${department}:`, allRows.length);
        if (allRows.length > 0) {
            console.log('Détails du webhook:', {
                id: allRows[0].id,
                type: allRows[0].type,
                department: allRows[0].department,
                enabled: allRows[0].enabled,
                enabledType: typeof allRows[0].enabled,
                url: allRows[0].url ? allRows[0].url.substring(0, 50) + '...' : 'null'
            });
        }

        const [rows] = await connection.query(
            'SELECT url FROM webhooks WHERE type = ? AND department = ? AND (enabled = 1 OR enabled = TRUE)',
            [type, department]
        );
        connection.release();

        const result = rows.length > 0 ? rows[0].url : null;
        console.log(`Webhook URL récupéré: ${result ? 'Oui' : 'Non'}`);
        return result;
    } catch (error) {
        console.error('Erreur lors de la récupération du webhook:', error);
        console.error('Stack:', error.stack);
        return null;
    }
}

function formatDateFr(dateString) {
    try {
        if (!dateString) return 'N/A';
        const date = new Date(dateString);
        if (isNaN(date.getTime())) {
            console.warn('Date invalide dans formatDateFr:', dateString);
            return 'Date invalide';
        }
        const jours = ['Dimanche', 'Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi'];
        const mois = ['Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin', 'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre'];
        return `${jours[date.getDay()]} ${date.getDate()} ${mois[date.getMonth()]} ${date.getFullYear()}`;
    } catch (error) {
        console.error('Erreur dans formatDateFr:', error);
        return 'Date invalide';
    }
}

function formatTimeFr(dateString) {
    try {
        if (!dateString) return 'N/A';
        const date = new Date(dateString);
        if (isNaN(date.getTime())) {
            console.warn('Date invalide dans formatTimeFr:', dateString);
            return 'Heure invalide';
        }
        return `${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`;
    } catch (error) {
        console.error('Erreur dans formatTimeFr:', error);
        return 'Heure invalide';
    }
}

function truncateField(value, maxLength = 1024) {
    if (!value) return 'N/A';
    const str = String(value);
    return str.length > maxLength ? str.substring(0, maxLength - 3) + '...' : str;
}

function createRecensementEmbed(recensement, redacteur, department) {
    try {
        let deptName = 'Blaine County Sheriff Office';
        let deptShort = 'BCSO';
        let color = 0xFFA500;
        if (department === 'LSPD') {
            deptName = 'Los Santos Police Department';
            deptShort = 'LSPD';
            color = 0x0066CC;
        } else if (department === 'GOUV') {
            deptName = 'Gouvernement de San Andreas';
            deptShort = 'GOUV';
            color = 0x2F3136;
        }
        let dateCreation = recensement.dateCreation ? new Date(recensement.dateCreation) : new Date();
        if (isNaN(dateCreation.getTime())) {
            console.warn('Date de création invalide, utilisation de la date actuelle');
            dateCreation = new Date();
        }

        const dateStr = formatDateFr(recensement.dateCreation || new Date().toISOString());
        const heureStr = formatTimeFr(recensement.dateCreation || new Date().toISOString());

        const embed = {
            title: `${deptShort} - Recensement APP`,
            color: color,
            footer: {
                text: ' '
            },
            fields: [
                {
                    name: 'Identité',
                    value: truncateField(`${recensement.prenomNom || 'N/A'} | ${recensement.telephone || 'N/A'}`),
                    inline: false
                },
                {
                    name: 'Numéro du recensement',
                    value: `N°${recensement.numero || 'N/A'}`,
                    inline: true
                },
                {
                    name: 'Date & heure du recensement',
                    value: `${dateStr} à ${heureStr}`,
                    inline: true
                },
                {
                    name: 'Date de naissance',
                    value: recensement.dateNaissance ? new Date(recensement.dateNaissance).toLocaleDateString('fr-FR') : 'N/A',
                    inline: true
                },
                {
                    name: 'Adresse',
                    value: recensement.adresse || 'N/A',
                    inline: true
                },
                {
                    name: 'Profession',
                    value: recensement.profession || 'N/A',
                    inline: true
                },
                {
                    name: 'Taille (en cm)',
                    value: recensement.taille ? `${recensement.taille} cm` : 'N/A',
                    inline: true
                },
                {
                    name: 'Type',
                    value: recensement.type || 'N/A',
                    inline: true
                },
                {
                    name: 'Sexe',
                    value: recensement.sexe || 'N/A',
                    inline: true
                },
                {
                    name: 'Couleur des yeux',
                    value: recensement.couleurYeux || 'N/A',
                    inline: true
                },
                {
                    name: 'Couleur des cheveux',
                    value: recensement.couleurCheveux || 'N/A',
                    inline: true
                }
            ],
        };

        const permisA = recensement.permisConduire && recensement.permisConduire.includes('A') ? 'OK' : 'N/A';
        const permisB = recensement.permisConduire && recensement.permisConduire.includes('B') ? 'OK' : 'N/A';
        const permisC = recensement.permisConduire && recensement.permisConduire.includes('C') ? 'OK' : 'N/A';
        const ppa = recensement.ppa === 'Valide' ? 'Valide' : 'Invalide';

        embed.fields.push(
            { name: 'Possession du permis A', value: permisA, inline: true },
            { name: 'Possession du permis B', value: permisB, inline: true },
            { name: 'Possession du permis C', value: permisC, inline: true },
            { name: 'Possession du PPA', value: ppa, inline: true }
        );

                        if (recensement.photo && recensement.photo.trim() !== '') {
            let photoUrl = recensement.photo.trim();

            if (photoUrl.includes('cdn.discordapp.com') || photoUrl.includes('discord.com') || photoUrl.startsWith('http')) {
                embed.thumbnail = {
                    url: photoUrl
                };
                if (embed.image) {
                    delete embed.image;
                }
                console.log('✅ Thumbnail ajoutée à l\'embed recensement:', photoUrl);
            } else {
                console.warn('Photo avec format local détectée, conversion en URL Discord nécessaire:', photoUrl);
            }
        }

        return embed;
    } catch (error) {
        console.error('Erreur lors de la création de l\'embed de recensement:', error);
        throw error;
    }
}

function createArrestEmbed(arrest, suspect, redacteur, department) {
    let deptName = 'Blaine County Sheriff Office';
    let deptShort = 'BCSO';
    let color = 0xFFA500;
    if (department === 'LSPD') {
        deptName = 'Los Santos Police Department';
        deptShort = 'LSPD';
        color = 0x0066CC;
    } else if (department === 'GOUV') {
        deptName = 'Gouvernement de San Andreas';
        deptShort = 'GOUV';
        color = 0x2F3136;
    }

    const dateStr = arrest.date || formatDateFr(new Date().toISOString());
    const heureStr = arrest.heure || formatTimeFr(new Date().toISOString());

    const embed = {
        title: `${deptShort} - RA APP`,
        color: color,
        footer: {
            text: ' '
        },
        fields: [
            {
                name: 'Identité',
                value: `${suspect.nom || suspect.prenomNom || 'N/A'} | N°${arrest.numero || 'N/A'}`,
                inline: false
            },
            {
                name: 'Date de l\'Arrestation',
                value: `${dateStr} à ${heureStr}`,
                inline: true
            },
            {
                name: 'Officier(s) Impliqué(s)',
                value: truncateField(arrest.corps || 'N/A', 1024),
                inline: true
            },
            {
                name: 'Amende',
                value: `${arrest.amende || '0'} $`,
                inline: true
            },
            {
                name: 'Statut Amende',
                value: arrest.amendeType || 'N/A',
                inline: true
            },
            {
                name: 'UP',
                value: `${arrest.temps || '0'} minutes`,
                inline: true
            },
            {
                name: 'Statut UP',
                value: arrest.tempsType || 'N/A',
                inline: true
            },
            {
                name: 'Avocat',
                value: arrest.avocat || 'NON',
                inline: true
            },
            {
                name: 'Chef(s) d\'inculpation',
                value: arrest.chefAccusation || 'N/A',
                inline: false
            },
            {
                name: 'Statut de l\'UP',
                value: arrest.statutUP || 'N/A',
                inline: true
            },
            {
                name: 'Statut de l\'amende',
                value: arrest.statutAmende || 'N/A',
                inline: true
            },
            {
                name: 'Saisie',
                value: arrest.saisie ? truncateField(arrest.saisie, 1024) : 'N/A',
                inline: false
            }
        ]
    };

    if (suspect.photo && suspect.photo.trim() !== '') {
        let photoUrl = suspect.photo.trim();

        if (photoUrl.includes('cdn.discordapp.com') || photoUrl.includes('discord.com') || photoUrl.startsWith('http')) {
            embed.thumbnail = {
                url: photoUrl
            };
            if (embed.image) {
                delete embed.image;
            }
            console.log('✅ Thumbnail ajoutée à l\'embed arrest:', photoUrl);
        } else {
            console.warn('Photo avec format local détectée, conversion en URL Discord nécessaire:', photoUrl);
        }
    } else {
        console.log('⚠️ Aucune photo dans suspect.photo pour l\'arrestation');
        console.log('Suspect object:', JSON.stringify(suspect, null, 2));
    }

    return embed;
}

app.get('/api/webhooks/recensement', (req, res) => {
    res.status(405).json({ error: 'Cette route nécessite une requête POST, pas GET' });
});

app.post('/api/webhooks/recensement', async (req, res) => {
    try {
        console.log('Requête webhook recensement reçue, body:', JSON.stringify(req.body).substring(0, 200));
        const { recensement, redacteur, department } = req.body;

        console.log('Webhook recensement reçu:', { 
            recensement: !!recensement, 
            redacteur: !!redacteur, 
            department,
            recensementKeys: recensement ? Object.keys(recensement) : [],
            redacteurKeys: redacteur ? Object.keys(redacteur) : []
        });

        if (!recensement || !redacteur || !department) {
            console.error('Données manquantes pour webhook recensement:', {
                recensement: !!recensement,
                redacteur: !!redacteur,
                department: department
            });
            return res.status(400).json({ error: 'Données manquantes' });
        }

        let userDepartment = null;
        let discordId = null;
        if (redacteur.matricule) {
            try {
                const connection = await pool.getConnection();
                const [users] = await connection.query(
                    'SELECT department, discordId FROM users WHERE matricule = ? LIMIT 1',
                    [redacteur.matricule]
                );
                connection.release();
                if (users.length > 0) {
                    if (users[0].department) {
                        userDepartment = users[0].department;
                    }
                    if (users[0].discordId) {
                        discordId = users[0].discordId;
                    }
                }
            } catch (dbError) {
                console.error('Erreur lors de la vérification du département:', dbError);
            }
        }

        const departmentMatches = userDepartment && userDepartment === department;

        console.log('Création de l\'embed de recensement...');
        console.log('Données recensement:', JSON.stringify(recensement).substring(0, 200));
        console.log('Photo du recensement:', recensement.photo);
        console.log('Données redacteur:', JSON.stringify(redacteur).substring(0, 200));
        console.log('Département:', department);
        console.log('Département utilisateur:', userDepartment);
        console.log('Départements correspondent:', departmentMatches);

        let embed;
        try {
            embed = createRecensementEmbed(recensement, redacteur, department);
        console.log('Embed créé avec succès, nombre de champs:', embed.fields ? embed.fields.length : 0);
        console.log('Titre de l\'embed:', embed.title);
        console.log('Couleur de l\'embed:', embed.color);
        console.log('Photo du recensement (brute):', recensement.photo);
        console.log('Thumbnail de l\'embed:', embed.thumbnail ? embed.thumbnail.url : 'Aucune thumbnail');
        if (embed.thumbnail) {
            console.log('✅ Thumbnail ajoutée à l\'embed avec URL:', embed.thumbnail.url);
        } else {
            console.warn('⚠️ Aucune thumbnail dans l\'embed. Photo disponible:', recensement.photo);
        }
        } catch (embedError) {
            console.error('Erreur lors de la création de l\'embed:', embedError);
            console.error('Stack embed:', embedError.stack);
            throw new Error('Erreur lors de la création de l\'embed: ' + embedError.message);
        }

        const content = discordId ? `Rédacteur : <@${discordId}>` : `Rédacteur : @${redacteur.matricule || 'N/A'} | ${redacteur.fullName || 'N/A'}`;

        let webhookSent = false;
        try {
            if (departmentMatches) {
                const webhookUrl = await getWebhookUrl('recensement', department);
                if (webhookUrl) {
                    console.log('Envoi du webhook de recensement vers:', webhookUrl.substring(0, 50) + '...');
                    await sendDiscordWebhook(webhookUrl, embed, content);
                    console.log('Webhook départemental envoyé avec succès');
                    webhookSent = true;
                } else {
                    console.log('Aucun webhook départemental configuré pour recensement -', department);
                }
            } else {
                console.log('Département ne correspond pas, webhook départemental ignoré');
            }
            
            const devWebhookUrl = await getDevWebhookUrl('recensement');
            if (devWebhookUrl) {
                console.log('Envoi du webhook DEV_RECENSEMENT (tous départements)...');
                await sendDiscordWebhook(devWebhookUrl, embed, content);
                console.log('Webhook DEV_RECENSEMENT envoyé avec succès');
                webhookSent = true;
            }
            
            if (!webhookSent) {
                return res.status(200).json({ success: false, message: 'Aucun webhook configuré pour ce type' });
            }
        } catch (webhookError) {
            console.error('=== ERREUR LORS DE L\'ENVOI DU WEBHOOK ===');
            console.error('Type d\'erreur:', webhookError.constructor.name);
            console.error('Message:', webhookError.message);
            console.error('Stack:', webhookError.stack);
            if (webhookError.code) console.error('Code:', webhookError.code);
            if (webhookError.errno) console.error('Errno:', webhookError.errno);
            console.error('==========================================');
            throw webhookError;
        }

        res.json({ success: true, message: 'Webhook envoyé avec succès' });
    } catch (error) {
        console.error('=== ERREUR WEBHOOK RECENSEMENT ===');
        console.error('Message:', error.message);
        console.error('Stack:', error.stack);
        console.error('Type:', error.constructor.name);
        if (error.code) console.error('Code:', error.code);
        if (error.errno) console.error('Errno:', error.errno);
        if (error.syscall) console.error('Syscall:', error.syscall);
        console.error('===================================');

        const errorMessage = error.message || 'Erreur inconnue';
        res.status(500).json({ 
            error: 'Erreur lors de l\'envoi du webhook: ' + errorMessage,
            details: error.code ? `Code: ${error.code}` : undefined
        });
    }
});

app.delete('/api/recensements/:id', async (req, res) => {
    try {
        const recensementId = req.params.id;
        if (!recensementId) {
            return res.status(400).json({ error: 'ID du recensement requis' });
        }

        const connection = await pool.getConnection();
        
        const [rows] = await connection.query(
            'SELECT department FROM recensements WHERE id = ?',
            [recensementId]
        );
        
        if (rows.length === 0) {
            connection.release();
            return res.status(404).json({ error: 'Recensement non trouvé' });
        }
        
        const department = rows[0].department;
        
        await connection.query('DELETE FROM recensements WHERE id = ?', [recensementId]);
        
        connection.release();
        
        res.json({ success: true, message: 'Recensement supprimé avec succès' });
    } catch (error) {
        console.error('Erreur lors de la suppression du recensement:', error);
        res.status(500).json({ error: 'Erreur lors de la suppression du recensement' });
    }
});

app.delete('/api/arrests/:id', async (req, res) => {
    try {
        const arrestId = req.params.id;
        if (!arrestId) {
            return res.status(400).json({ error: 'ID de l\'arrestation requis' });
        }

        const connection = await pool.getConnection();
        
        const [rows] = await connection.query(
            'SELECT id FROM arrests WHERE id = ?',
            [arrestId]
        );
        
        if (rows.length === 0) {
            connection.release();
            return res.status(404).json({ error: 'Arrestation non trouvée' });
        }
        
        await connection.query('DELETE FROM arrest_charges WHERE arrestId = ?', [arrestId]);
        
        await connection.query('DELETE FROM arrests WHERE id = ?', [arrestId]);
        
        connection.release();
        
        res.json({ success: true, message: 'Rapport d\'arrestation supprimé avec succès' });
    } catch (error) {
        console.error('Erreur lors de la suppression de l\'arrestation:', error);
        res.status(500).json({ error: 'Erreur lors de la suppression de l\'arrestation' });
    }
});

app.post('/api/webhooks/test', async (req, res) => {
    try {
        const { type, department, url } = req.body;

        if (!type || !department || !url) {
            return res.status(400).json({ error: 'Type, département et URL requis' });
        }

        const testEmbed = {
            title: 'Test Webhook',
            description: 'Ceci est un test de webhook',
            color: 0x00FF00
        };

        console.log('Test webhook avec URL:', url.substring(0, 50) + '...');
        await sendDiscordWebhook(url, testEmbed);

        res.json({ success: true, message: 'Webhook de test envoyé avec succès' });
    } catch (error) {
        console.error('Erreur test webhook:', error);
        res.status(500).json({ 
            error: 'Erreur lors du test: ' + error.message,
            code: error.code
        });
    }
});

function createFirstLincolnEmbed(firstLincolnReport, redacteur, department) {
    let deptShort = 'BCSO';
    let color = 0xFFA500;
    if (department === 'LSPD') {
        deptShort = 'LSPD';
        color = 0x0066CC;
    } else if (department === 'GOUV') {
        deptShort = 'GOUV';
        color = 0x2F3136;
    }

    const embed = {
        title: `${deptShort} - First Lincoln APP`,
        color: color,
        footer: {
            text: ' '
        },
        fields: [
            {
                name: 'Numéro du rapport',
                value: `N°${firstLincolnReport.numero || 'N/A'}`,
                inline: true
            },
            {
                name: 'Matricule du Rookie',
                value: firstLincolnReport.matricule || 'N/A',
                inline: true
            },
            {
                name: 'Prénom & Nom du Rookie',
                value: firstLincolnReport.nom || 'N/A',
                inline: true
            },
            {
                name: 'Date de rédaction',
                value: firstLincolnReport.dateRedaction || 'N/A',
                inline: true
            },
            {
                name: 'Heure de rédaction',
                value: firstLincolnReport.heureRedaction || 'N/A',
                inline: true
            },
            {
                name: 'Date de début',
                value: firstLincolnReport.dateDebut || 'N/A',
                inline: true
            },
            {
                name: 'Heure de début',
                value: firstLincolnReport.heureDebut || 'N/A',
                inline: true
            },
            {
                name: 'Date de fin',
                value: firstLincolnReport.dateFin || 'N/A',
                inline: true
            },
            {
                name: 'Heure de fin',
                value: firstLincolnReport.heureFin || 'N/A',
                inline: true
            }
        ]
    };

    if (firstLincolnReport.evaluations && typeof firstLincolnReport.evaluations === 'object') {
        const evaluations = firstLincolnReport.evaluations;
        const evalFields = [];
        if (evaluations.relations) evalFields.push({ name: 'Relations Civiles', value: evaluations.relations, inline: true });
        if (evaluations.controle) evalFields.push({ name: 'Contrôle Routier', value: evaluations.controle, inline: true });
        if (evaluations.terrain) evalFields.push({ name: 'Terrain', value: evaluations.terrain, inline: true });
        if (evaluations.procedures) evalFields.push({ name: 'Procédures', value: evaluations.procedures, inline: true });
        if (evaluations.conduite) evalFields.push({ name: 'Conduite', value: evaluations.conduite, inline: true });
        if (evaluations.radio) evalFields.push({ name: 'Call Radio', value: evaluations.radio, inline: true });
        if (evaluations.dispatch) evalFields.push({ name: 'Dispatch', value: evaluations.dispatch, inline: true });
        if (evaluations.mdt) evalFields.push({ name: 'MDT', value: evaluations.mdt, inline: true });
        embed.fields = embed.fields.concat(evalFields);
    }

    if (firstLincolnReport.commentaire) {
        embed.fields.push({
            name: 'Commentaire',
            value: firstLincolnReport.commentaire.length > 1024 ? firstLincolnReport.commentaire.substring(0, 1021) + '...' : firstLincolnReport.commentaire,
            inline: false
        });
    }

    return embed;
}

function createRookieEmbed(rookieReport, redacteur, department) {
    let deptShort = 'BCSO';
    let color = 0xFFA500;
    if (department === 'LSPD') {
        deptShort = 'LSPD';
        color = 0x0066CC;
    } else if (department === 'GOUV') {
        deptShort = 'GOUV';
        color = 0x2F3136;
    }

    const embed = {
        title: `${deptShort} - Rapport Rookie APP`,
        color: color,
        footer: {
            text: ' '
        },
        fields: [
            {
                name: 'Numéro du rapport',
                value: `N°${rookieReport.numero || 'N/A'}`,
                inline: true
            },
            {
                name: 'Matricule du Rookie',
                value: rookieReport.matricule || 'N/A',
                inline: true
            },
            {
                name: 'Prénom & Nom du Rookie',
                value: rookieReport.nom || 'N/A',
                inline: true
            },
            {
                name: 'Date de rédaction',
                value: rookieReport.dateRedaction || 'N/A',
                inline: true
            },
            {
                name: 'Heure de rédaction',
                value: rookieReport.heureRedaction || 'N/A',
                inline: true
            },
            {
                name: 'Date de début',
                value: rookieReport.dateDebut || 'N/A',
                inline: true
            },
            {
                name: 'Heure de début',
                value: rookieReport.heureDebut || 'N/A',
                inline: true
            },
            {
                name: 'Date de fin',
                value: rookieReport.dateFin || 'N/A',
                inline: true
            },
            {
                name: 'Heure de fin',
                value: rookieReport.heureFin || 'N/A',
                inline: true
            }
        ]
    };

    if (rookieReport.evaluations) {
        const evaluations = Object.entries(rookieReport.evaluations)
            .filter(([_, value]) => value && value !== '')
            .map(([key, value]) => `**${key.charAt(0).toUpperCase() + key.slice(1)}**: ${value}`)
            .join('\n');

        if (evaluations) {
            embed.fields.push({
                name: 'Évaluations',
                value: truncateField(evaluations),
                inline: false
            });
        }
    }

    if (rookieReport.commentaire) {
        embed.fields.push({
            name: 'Commentaire',
            value: truncateField(rookieReport.commentaire),
            inline: false
        });
    }

    return embed;
}

function createIncidentEmbed(incident, redacteur, department) {
    let deptShort = 'BCSO';
    let color = 0xFFA500;
    if (department === 'LSPD') {
        deptShort = 'LSPD';
        color = 0x0066CC;
    } else if (department === 'GOUV') {
        deptShort = 'GOUV';
        color = 0x2F3136;
    }

    const embed = {
        title: `${deptShort} - Rapport Incident APP`,
        color: color,
        footer: {
            text: ' '
        },
        fields: [
            {
                name: 'Numéro du rapport',
                value: `N°${incident.numero || 'N/A'}`,
                inline: true
            },
            {
                name: 'Titre',
                value: incident.titre || 'N/A',
                inline: true
            },
            {
                name: 'Type',
                value: incident.type || 'N/A',
                inline: true
            },
            {
                name: 'Date de l\'incident',
                value: incident.dateIncident || 'N/A',
                inline: true
            },
            {
                name: 'Heure de l\'incident',
                value: incident.heureIncident || 'N/A',
                inline: true
            },
            {
                name: 'Date de rédaction',
                value: incident.dateRedaction || 'N/A',
                inline: true
            },
            {
                name: 'Heure de rédaction',
                value: incident.heureRedaction || 'N/A',
                inline: true
            }
        ]
    };

    if (incident.leadTerrain) {
        embed.fields.push({ name: 'Lead Terrain', value: incident.leadTerrain, inline: true });
    }
    if (incident.leadNegotiation) {
        embed.fields.push({ name: 'Lead Négociation', value: incident.leadNegotiation, inline: true });
    }
    if (incident.revendication) {
        embed.fields.push({ name: 'Revendication', value: truncateField(incident.revendication), inline: false });
    }
    if (incident.nbRavisseurs) {
        embed.fields.push({ name: 'Nombre de ravisseurs', value: incident.nbRavisseurs, inline: true });
    }
    if (incident.nbInterpel) {
        embed.fields.push({ name: 'Nombre d\'interpellés', value: incident.nbInterpel, inline: true });
    }
    if (incident.nbOtages) {
        embed.fields.push({ name: 'Nombre d\'otages', value: incident.nbOtages, inline: true });
    }
    if (incident.officiersImpliques) {
        embed.fields.push({ name: 'Officiers impliqués', value: incident.officiersImpliques, inline: false });
    }
    if (incident.corps) {
        embed.fields.push({ 
            name: 'Corps du rapport', 
            value: truncateField(incident.corps), 
            inline: false 
        });
    }

    return embed;
}

app.post('/api/webhooks/arrestation', async (req, res) => {
    try {
        const { arrest, suspect, redacteur, department } = req.body;

        console.log('Webhook arrestation reçu:', { arrest: !!arrest, suspect: !!suspect, redacteur: !!redacteur, department });

        if (!arrest || !suspect || !redacteur || !department) {
            console.error('Données manquantes pour webhook arrestation');
            return res.status(400).json({ error: 'Données manquantes' });
        }

        let userDepartment = null;
        let discordId = null;
        if (redacteur.matricule) {
            try {
                const connection = await pool.getConnection();
                const [users] = await connection.query(
                    'SELECT department, discordId FROM users WHERE matricule = ? LIMIT 1',
                    [redacteur.matricule]
                );
                connection.release();
                if (users.length > 0) {
                    if (users[0].department) {
                        userDepartment = users[0].department;
                    }
                    if (users[0].discordId) {
                        discordId = users[0].discordId;
                    }
                }
            } catch (dbError) {
                console.error('Erreur lors de la vérification du département:', dbError);
            }
        }

        const departmentMatches = userDepartment && userDepartment === department;

        console.log('Création de l\'embed d\'arrestation...');
        console.log('Suspect reçu:', JSON.stringify(suspect, null, 2));
        console.log('Département:', department);
        console.log('Département utilisateur:', userDepartment);
        console.log('Départements correspondent:', departmentMatches);
        const embed = createArrestEmbed(arrest, suspect, redacteur, department);

        const content = discordId ? `Rédacteur : <@${discordId}>` : `Rédacteur : @${redacteur.matricule || 'N/A'} | ${redacteur.fullName || 'N/A'}`;

        let webhookSent = false;
        if (departmentMatches) {
            const webhookUrl = await getWebhookUrl('arrestation', department);
            if (webhookUrl) {
                console.log('Envoi du webhook d\'arrestation...');
                await sendDiscordWebhook(webhookUrl, embed, content);
                webhookSent = true;
            } else {
                console.log('Aucun webhook départemental configuré pour arrestation -', department);
            }
        } else {
            console.log('Département ne correspond pas, webhook départemental ignoré');
        }
        
        const devWebhookUrl = await getDevWebhookUrl('arrestation');
        if (devWebhookUrl) {
            console.log('Envoi du webhook DEV_ARRESTATION (tous départements)...');
            await sendDiscordWebhook(devWebhookUrl, embed, content);
            webhookSent = true;
        }

        if (!webhookSent) {
            return res.status(200).json({ success: false, message: 'Aucun webhook configuré pour ce type' });
        }

        res.json({ success: true, message: 'Webhook envoyé avec succès' });
    } catch (error) {
        console.error('Erreur lors de l\'envoi du webhook d\'arrestation:', error);
        console.error('Stack:', error.stack);
        res.status(500).json({ error: 'Erreur lors de l\'envoi du webhook: ' + error.message });
    }
});

app.post('/api/webhooks/firstLincoln', async (req, res) => {
    try {
        const { firstLincolnReport, redacteur, department } = req.body;

        console.log('Webhook firstLincoln reçu:', { firstLincolnReport: !!firstLincolnReport, redacteur: !!redacteur, department });

        if (!firstLincolnReport || !redacteur || !department) {
            console.error('Données manquantes pour webhook firstLincoln');
            return res.status(400).json({ error: 'Données manquantes' });
        }

        let userDepartment = null;
        let discordId = null;
        if (redacteur.matricule) {
            try {
                const connection = await pool.getConnection();
                const [users] = await connection.query(
                    'SELECT department, discordId FROM users WHERE matricule = ? LIMIT 1',
                    [redacteur.matricule]
                );
                connection.release();
                if (users.length > 0) {
                    if (users[0].department) {
                        userDepartment = users[0].department;
                    }
                    if (users[0].discordId) {
                        discordId = users[0].discordId;
                    }
                }
            } catch (dbError) {
                console.error('Erreur lors de la vérification du département:', dbError);
            }
        }

        const departmentMatches = userDepartment && userDepartment === department;

        console.log('Création de l\'embed firstLincoln...');
        console.log('Département:', department);
        console.log('Département utilisateur:', userDepartment);
        console.log('Départements correspondent:', departmentMatches);
        const embed = createFirstLincolnEmbed(firstLincolnReport, redacteur, department);

        const content = discordId ? `Rédacteur : <@${discordId}>` : `Rédacteur : @${redacteur.matricule || 'N/A'} | ${redacteur.fullName || 'N/A'}`;

        let webhookSent = false;
        if (departmentMatches) {
            const webhookUrl = await getWebhookUrl('firstLincoln', department);
            if (webhookUrl) {
                console.log('Envoi du webhook firstLincoln...');
                await sendDiscordWebhook(webhookUrl, embed, content);
                webhookSent = true;
            } else {
                console.log('Aucun webhook départemental configuré pour firstLincoln -', department);
            }
        } else {
            console.log('Département ne correspond pas, webhook départemental ignoré');
        }
        
        const devWebhookUrl = await getDevWebhookUrl('firstLincoln');
        if (devWebhookUrl) {
            console.log('Envoi du webhook DEV_FIRST_LINCOLN (tous départements)...');
            await sendDiscordWebhook(devWebhookUrl, embed, content);
            webhookSent = true;
        }

        if (!webhookSent) {
            return res.status(200).json({ success: false, message: 'Aucun webhook configuré pour ce type' });
        }

        res.json({ success: true, message: 'Webhook envoyé avec succès' });
    } catch (error) {
        console.error('Erreur lors de l\'envoi du webhook firstLincoln:', error);
        console.error('Stack:', error.stack);
        res.status(500).json({ error: 'Erreur lors de l\'envoi du webhook: ' + error.message });
    }
});

app.post('/api/webhooks/rookie', async (req, res) => {
    try {
        const { rookieReport, redacteur, department } = req.body;

        console.log('Webhook rookie reçu:', { rookieReport: !!rookieReport, redacteur: !!redacteur, department });

        if (!rookieReport || !redacteur || !department) {
            console.error('Données manquantes pour webhook rookie');
            return res.status(400).json({ error: 'Données manquantes' });
        }

        let userDepartment = null;
        let discordId = null;
        if (redacteur.matricule) {
            try {
                const connection = await pool.getConnection();
                const [users] = await connection.query(
                    'SELECT department, discordId FROM users WHERE matricule = ? LIMIT 1',
                    [redacteur.matricule]
                );
                connection.release();
                if (users.length > 0) {
                    if (users[0].department) {
                        userDepartment = users[0].department;
                    }
                    if (users[0].discordId) {
                        discordId = users[0].discordId;
                    }
                }
            } catch (dbError) {
                console.error('Erreur lors de la vérification du département:', dbError);
            }
        }

        const departmentMatches = userDepartment && userDepartment === department;

        console.log('Création de l\'embed rookie...');
        console.log('Département:', department);
        console.log('Département utilisateur:', userDepartment);
        console.log('Départements correspondent:', departmentMatches);
        const embed = createRookieEmbed(rookieReport, redacteur, department);

        const content = discordId ? `Rédacteur : <@${discordId}>` : `Rédacteur : @${redacteur.matricule || 'N/A'} | ${redacteur.fullName || 'N/A'}`;

        let webhookSent = false;
        if (departmentMatches) {
            const webhookUrl = await getWebhookUrl('rookie', department);
            if (webhookUrl) {
                console.log('Envoi du webhook rookie...');
                await sendDiscordWebhook(webhookUrl, embed, content);
                webhookSent = true;
            } else {
                console.log('Aucun webhook départemental configuré pour rookie -', department);
            }
        } else {
            console.log('Département ne correspond pas, webhook départemental ignoré');
        }
        
        const devWebhookUrl = await getDevWebhookUrl('rookie');
        if (devWebhookUrl) {
            console.log('Envoi du webhook DEV_ROOKIE (tous départements)...');
            await sendDiscordWebhook(devWebhookUrl, embed, content);
            webhookSent = true;
        }

        if (!webhookSent) {
            return res.status(200).json({ success: false, message: 'Aucun webhook configuré pour ce type' });
        }

        res.json({ success: true, message: 'Webhook envoyé avec succès' });
    } catch (error) {
        console.error('Erreur lors de l\'envoi du webhook rookie:', error);
        console.error('Stack:', error.stack);
        res.status(500).json({ error: 'Erreur lors de l\'envoi du webhook: ' + error.message });
    }
});

app.post('/api/webhooks/incident', async (req, res) => {
    try {
        const { incident, redacteur, department } = req.body;

        console.log('Webhook incident reçu:', { incident: !!incident, redacteur: !!redacteur, department });

        if (!incident || !redacteur || !department) {
            console.error('Données manquantes pour webhook incident');
            return res.status(400).json({ error: 'Données manquantes' });
        }

        let userDepartment = null;
        let discordId = null;
        if (redacteur.matricule) {
            try {
                const connection = await pool.getConnection();
                const [users] = await connection.query(
                    'SELECT department, discordId FROM users WHERE matricule = ? LIMIT 1',
                    [redacteur.matricule]
                );
                connection.release();
                if (users.length > 0) {
                    if (users[0].department) {
                        userDepartment = users[0].department;
                    }
                    if (users[0].discordId) {
                        discordId = users[0].discordId;
                    }
                }
            } catch (dbError) {
                console.error('Erreur lors de la vérification du département:', dbError);
            }
        }

        const departmentMatches = userDepartment && userDepartment === department;

        console.log('Création de l\'embed incident...');
        console.log('Département:', department);
        console.log('Département utilisateur:', userDepartment);
        console.log('Départements correspondent:', departmentMatches);
        const embed = createIncidentEmbed(incident, redacteur, department);

        const content = discordId ? `Rédacteur : <@${discordId}>` : `Rédacteur : @${redacteur.matricule || 'N/A'} | ${redacteur.fullName || 'N/A'}`;

        let webhookSent = false;
        if (departmentMatches) {
            const webhookUrl = await getWebhookUrl('incident', department);
            if (webhookUrl) {
                console.log('Envoi du webhook incident...');
                await sendDiscordWebhook(webhookUrl, embed, content);
                webhookSent = true;
            } else {
                console.log('Aucun webhook départemental configuré pour incident -', department);
            }
        } else {
            console.log('Département ne correspond pas, webhook départemental ignoré');
        }
        
        const devWebhookUrl = await getDevWebhookUrl('incident');
        if (devWebhookUrl) {
            console.log('Envoi du webhook DEV_INCIDENT (tous départements)...');
            await sendDiscordWebhook(devWebhookUrl, embed, content);
            webhookSent = true;
        }

        if (!webhookSent) {
            return res.status(200).json({ success: false, message: 'Aucun webhook configuré pour ce type' });
        }

        res.json({ success: true, message: 'Webhook envoyé avec succès' });
    } catch (error) {
        console.error('Erreur lors de l\'envoi du webhook incident:', error);
        console.error('Stack:', error.stack);
        res.status(500).json({ error: 'Erreur lors de l\'envoi du webhook: ' + error.message });
    }
});

console.log(`made with ❤️ by Adept - 1204506056252858459`)

app.get('/api/reports/:type', async (req, res) => {
    let connection = null;
    try {
        const { type } = req.params;
        const { id, recensementId } = req.query;

        if (!id) {
            return res.status(400).json({ error: 'ID manquant' });
        }

        connection = await pool.getConnection();

        if (type === 'arrestation') {
            const [arrests] = await connection.query(
                'SELECT * FROM arrests WHERE id = ? LIMIT 1',
                [id]
            );
            
            if (arrests.length === 0) {
                connection.release();
                return res.status(404).json({ error: 'Rapport d\'arrestation non trouvé' });
            }

            const arrest = arrests[0];
            let suspect = null;
            let recensement = null;

            if (arrest.recensementId) {
                const recConnection = await pool.getConnection();
                const [recensements] = await recConnection.query(
                    'SELECT * FROM recensements WHERE id = ? LIMIT 1',
                    [arrest.recensementId]
                );
                recConnection.release();
                if (recensements.length > 0) {
                    recensement = recensements[0];
                    suspect = {
                        id: recensement.id,
                        nom: recensement.prenomNom,
                        prenomNom: recensement.prenomNom,
                        dob: recensement.dateNaissance,
                        dateNaissance: recensement.dateNaissance,
                        telephone: recensement.telephone,
                        adresse: recensement.adresse,
                        profession: recensement.profession,
                        photo: recensement.photo
                    };
                }
            }

            if (arrest.suspect && typeof arrest.suspect === 'string') {
                try {
                    suspect = { ...suspect, ...JSON.parse(arrest.suspect) };
                } catch (e) {
                    console.error('Erreur parsing suspect JSON:', e);
                }
            } else if (arrest.suspect && typeof arrest.suspect === 'object') {
                suspect = { ...suspect, ...arrest.suspect };
            }

            let redacteur = null;
            if (arrest.createur) {
                const createurParts = (arrest.createur || '').split('|').map(s => s.trim());
                const createurMatricule = createurParts[0] || arrest.createur;
                const [users] = await connection.query(
                    'SELECT fullName, matricule, telephone, email, department FROM users WHERE matricule = ? OR fullName LIKE ? LIMIT 1',
                    [createurMatricule, `%${createurParts[1] || ''}%`]
                );
                if (users.length > 0) {
                    redacteur = {
                        fullName: users[0].fullName,
                        matricule: users[0].matricule,
                        telephone: users[0].telephone || '',
                        email: users[0].email || '',
                        department: users[0].department || arrest.department
                    };
                } else {
                    redacteur = {
                        fullName: createurParts[1] || arrest.createur,
                        matricule: createurMatricule,
                        telephone: '',
                        email: '',
                        department: arrest.department
                    };
                }
            }

            let charges = [];
            const [chargesRows] = await connection.query(
                'SELECT * FROM arrest_charges WHERE arrestId = ? ORDER BY id',
                [arrest.id]
            );
            
            if (chargesRows.length > 0) {
                charges = chargesRows.map(charge => ({
                    categorie: charge.categorie,
                    category: charge.categorie,
                    nom: charge.nom,
                    name: charge.nom,
                    quantite: charge.quantite,
                    quantity: charge.quantite,
                    amende: charge.amende,
                    fine: charge.amende,
                    up: charge.up,
                    prison: charge.up,
                    tentative: charge.tentative,
                    attempt: charge.tentative,
                    complicite: charge.complicite,
                    complicity: charge.complicite
                }));
            } else if (arrest.chargesDetail) {
                try {
                    const parsed = typeof arrest.chargesDetail === 'string' ? JSON.parse(arrest.chargesDetail) : arrest.chargesDetail;
                    if (Array.isArray(parsed)) {
                        charges = parsed;
                    }
                } catch (e) {
                    console.log('chargesDetail n\'est pas un JSON valide ou n\'est pas un tableau');
                }
            }

            const reportDepartment = redacteur?.department || arrest.department || 'BCSO';
            
            connection.release();
            res.json({
                id: arrest.id,
                numero: arrest.numero,
                date: arrest.date,
                heure: arrest.heure,
                department: reportDepartment,
                suspect: suspect,
                redacteur: redacteur,
                charges: charges,
                amende: arrest.amende,
                amendeType: arrest.amendeType,
                temps: arrest.temps,
                tempsType: arrest.tempsType,
                avocat: arrest.avocat,
                chefAccusation: arrest.chefAccusation,
                chargesDetail: arrest.chargesDetail,
                corps: arrest.corps,
                statutUP: arrest.statutUP,
                statutAmende: arrest.statutAmende,
                saisie: arrest.saisie,
                status: arrest.status
            });
        } else if (type === 'firstLincoln') {
            const [firstLincolns] = await connection.query(
                'SELECT * FROM firstLincolnReports WHERE id = ? LIMIT 1',
                [id]
            );

            if (firstLincolns.length === 0) {
                connection.release();
                return res.status(404).json({ error: 'Rapport First Lincoln non trouvé' });
            }

            const firstLincoln = firstLincolns[0];
            let redacteur = null;
            if (firstLincoln.redacteur) {
                const redacteurParts = (firstLincoln.redacteur || '').split('|').map(s => s.trim());
                const redacteurMatricule = redacteurParts[0] || firstLincoln.redacteur;
                const [users] = await connection.query(
                    'SELECT fullName, matricule, telephone, email, department FROM users WHERE matricule = ? OR fullName LIKE ? LIMIT 1',
                    [redacteurMatricule, `%${redacteurParts[1] || ''}%`]
                );
                if (users.length > 0) {
                    redacteur = {
                        fullName: users[0].fullName,
                        matricule: users[0].matricule,
                        telephone: users[0].telephone || firstLincoln.telephoneRedacteur || '',
                        email: users[0].email || '',
                        department: users[0].department || firstLincoln.department
                    };
                } else {
                    redacteur = {
                        fullName: redacteurParts[1] || firstLincoln.redacteur,
                        matricule: redacteurMatricule,
                        telephone: firstLincoln.telephoneRedacteur || '',
                        email: '',
                        department: firstLincoln.department
                    };
                }
            }

            if (!redacteur) {
                redacteur = {
                    fullName: 'N/A',
                    matricule: 'N/A',
                    telephone: '',
                    email: '',
                    department: firstLincoln.department || 'BCSO'
                };
            }

            const reportDepartment = redacteur.department || firstLincoln.department || 'BCSO';
            
            connection.release();
            res.json({
                id: firstLincoln.id,
                numero: firstLincoln.numero,
                date: firstLincoln.dateRedaction,
                heure: firstLincoln.heureRedaction,
                dateRedaction: firstLincoln.dateRedaction,
                heureRedaction: firstLincoln.heureRedaction,
                dateDebut: firstLincoln.dateDebut,
                heureDebut: firstLincoln.heureDebut,
                dateFin: firstLincoln.dateFin,
                heureFin: firstLincoln.heureFin,
                department: reportDepartment,
                matricule: firstLincoln.matricule,
                nom: firstLincoln.nom,
                redacteur: redacteur,
                signature: firstLincoln.signature,
                commentaire: firstLincoln.commentaire,
                evaluations: firstLincoln.evaluations ? (typeof firstLincoln.evaluations === 'string' ? JSON.parse(firstLincoln.evaluations) : firstLincoln.evaluations) : {}
            });
        } else if (type === 'incident') {
            const [incidents] = await connection.query(
                'SELECT * FROM incidents WHERE id = ? LIMIT 1',
                [id]
            );

            if (incidents.length === 0) {
                connection.release();
                return res.status(404).json({ error: 'Rapport d\'incident non trouvé' });
            }

            const incident = incidents[0];
            let redacteur = null;

            if (incident.redacteur && typeof incident.redacteur === 'string') {
                try {
                    redacteur = JSON.parse(incident.redacteur);
                } catch (e) {
                    const redacteurStr = incident.redacteur;
                    if (redacteurStr) {
                        const redacteurParts = redacteurStr.split('|').map(s => s.trim());
                        const redacteurMatricule = redacteurParts[0] || redacteurStr;
                        const [users] = await connection.query(
                            'SELECT fullName, matricule, telephone, email, department FROM users WHERE matricule = ? OR fullName LIKE ? LIMIT 1',
                            [redacteurMatricule, `%${redacteurParts[1] || ''}%`]
                        );
                        if (users.length > 0) {
                            redacteur = {
                                fullName: users[0].fullName,
                                matricule: users[0].matricule,
                                telephone: users[0].telephone || '',
                                email: users[0].email || '',
                                department: users[0].department || incident.department
                            };
                        } else {
                            redacteur = {
                                fullName: redacteurParts[1] || redacteurStr,
                                matricule: redacteurMatricule,
                                telephone: '',
                                email: '',
                                department: incident.department
                            };
                        }
                    }
                }
            } else if (incident.redacteur && typeof incident.redacteur === 'object') {
                redacteur = { ...incident.redacteur };
                if (!redacteur.department) {
                    if (redacteur.email) {
                        if (redacteur.email.includes('@gouv.us')) {
                            redacteur.department = 'GOUV';
                        } else if (redacteur.email.includes('@lspd.us')) {
                            redacteur.department = 'LSPD';
                        } else if (redacteur.email.includes('@bcso.us')) {
                            redacteur.department = 'BCSO';
                        } else {
                            redacteur.department = incident.department;
                        }
                    } else {
                        redacteur.department = incident.department;
                    }
                }
                if (!redacteur.email && redacteur.mail) {
                    redacteur.email = redacteur.mail;
                }
                if (!redacteur.fullName && redacteur.nom) {
                    redacteur.fullName = redacteur.nom;
                }
            }

            if (!redacteur) {
                redacteur = {
                    fullName: 'N/A',
                    matricule: 'N/A',
                    telephone: '',
                    email: '',
                    department: incident.department || 'BCSO'
                };
            } else {
                if (!redacteur.department) {
                    const emailToCheck = redacteur.email || redacteur.mail || '';
                    if (emailToCheck.includes('@gouv.us')) {
                        redacteur.department = 'GOUV';
                    } else if (emailToCheck.includes('@lspd.us')) {
                        redacteur.department = 'LSPD';
                    } else if (emailToCheck.includes('@bcso.us')) {
                        redacteur.department = 'BCSO';
                    } else {
                        redacteur.department = incident.department || 'BCSO';
                    }
                }
                if (!redacteur.email && redacteur.mail) {
                    redacteur.email = redacteur.mail;
                }
                if (!redacteur.fullName && redacteur.nom) {
                    redacteur.fullName = redacteur.nom;
                }
            }
            
            const reportDepartment = redacteur.department || incident.department || 'BCSO';
            
            connection.release();
            res.json({
                id: incident.id,
                numero: incident.numero,
                date: incident.dateRedaction || incident.dateIncident,
                heure: incident.heureRedaction || incident.heureIncident,
                dateRedaction: incident.dateRedaction,
                heureRedaction: incident.heureRedaction,
                dateIncident: incident.dateIncident,
                heureIncident: incident.heureIncident,
                department: reportDepartment,
                titre: incident.titre,
                type: incident.type,
                leadTerrain: incident.leadTerrain,
                leadNegotiation: incident.leadNegotiation,
                revendication: incident.revendication,
                nbRavisseurs: incident.nbRavisseurs,
                nbInterpel: incident.nbInterpel,
                nbOtages: incident.nbOtages,
                officiersImpliques: incident.officiersImpliques,
                redacteur: redacteur,
                corps: incident.corps,
                description: incident.corps
            });
        } else if (type === 'rookie') {
            const [rookies] = await connection.query(
                'SELECT * FROM rookieReports WHERE id = ? LIMIT 1',
                [id]
            );

            if (rookies.length === 0) {
                connection.release();
                return res.status(404).json({ error: 'Rapport de procédure non trouvé' });
            }

            const rookie = rookies[0];
            let redacteur = null;
            if (rookie.redacteur && typeof rookie.redacteur === 'string') {
                try {
                    redacteur = JSON.parse(rookie.redacteur);
                } catch (e) {
                    const redacteurStr = rookie.redacteur;
                    if (redacteurStr) {
                        const redacteurParts = redacteurStr.split('|').map(s => s.trim());
                        const redacteurMatricule = redacteurParts[0] || redacteurStr;
                        const [users] = await connection.query(
                            'SELECT fullName, matricule, telephone, email, department FROM users WHERE matricule = ? OR fullName LIKE ? LIMIT 1',
                            [redacteurMatricule, `%${redacteurParts[1] || ''}%`]
                        );
                        if (users.length > 0) {
                            redacteur = {
                                fullName: users[0].fullName,
                                matricule: users[0].matricule,
                                telephone: users[0].telephone || '',
                                email: users[0].email || '',
                                department: users[0].department || rookie.department
                            };
                        } else {
                            redacteur = {
                                fullName: redacteurParts[1] || redacteurStr,
                                matricule: redacteurMatricule,
                                telephone: '',
                                email: '',
                                department: rookie.department
                            };
                        }
                    }
                }
            } else if (rookie.redacteur && typeof rookie.redacteur === 'object') {
                redacteur = { ...rookie.redacteur };
            }

            if (!redacteur) {
                redacteur = {
                    fullName: 'N/A',
                    matricule: 'N/A',
                    telephone: '',
                    email: '',
                    department: rookie.department || 'BCSO'
                };
            }

            const reportDepartment = redacteur.department || rookie.department || 'BCSO';
            
            connection.release();
            res.json({
                id: rookie.id,
                numero: rookie.numero,
                date: rookie.dateRedaction,
                heure: rookie.heureRedaction,
                dateRedaction: rookie.dateRedaction,
                heureRedaction: rookie.heureRedaction,
                department: reportDepartment,
                redacteur: redacteur,
                signature: rookie.signature,
                corps: rookie.corps,
                commentaire: rookie.commentaire,
                officiersImpliques: rookie.officiersImpliques
            });
        } else {
            connection.release();
            return res.status(400).json({ error: 'Type de rapport invalide' });
        }
    } catch (error) {
        console.error('Erreur lors de la récupération du rapport:', error);
        if (connection && typeof connection.release === 'function') {
            try {
                connection.release();
            } catch (e) {
                console.error('Erreur lors de la libération de la connexion:', e);
            }
        }
        res.status(500).json({ error: 'Erreur serveur' });
    }
});

app.get('/api/webhooks', async (req, res) => {
    try {
        const connection = await pool.getConnection();
        const [rows] = await connection.query('SELECT * FROM webhooks ORDER BY department, type');
        connection.release();
        res.json(rows);
    } catch (error) {
        console.error('Erreur lors de la récupération des webhooks:', error);
        res.status(500).json({ error: 'Erreur lors de la récupération des webhooks' });
    }
});

app.post('/api/webhooks', async (req, res) => {
    try {
        const { type, department, url, enabled } = req.body;

        console.log('Sauvegarde webhook reçue:', { type, department, url: url ? url.substring(0, 50) + '...' : 'null', enabled });

        if (!type || !department || !url) {
            console.error('Données manquantes pour sauvegarde webhook:', { type, department, url: !!url });
            return res.status(400).json({ error: 'Données manquantes' });
        }
        const enabledValue = enabled === true || enabled === 'true' || enabled === 1 ? 1 : 0;
        console.log('Valeur enabled convertie:', enabledValue, '(type:', typeof enabledValue, ')');

        const connection = await pool.getConnection();
        const result = await connection.query(
            'INSERT INTO webhooks (type, department, url, enabled) VALUES (?, ?, ?, ?) ON DUPLICATE KEY UPDATE url = ?, enabled = ?',
            [type, department, url, enabledValue, url, enabledValue]
        );
        connection.release();

        console.log('Webhook sauvegardé avec succès pour', type, department);
        res.json({ success: true, message: 'Webhook sauvegardé avec succès' });
    } catch (error) {
        console.error('Erreur lors de la sauvegarde du webhook:', error);
        console.error('Stack:', error.stack);
        res.status(500).json({ error: 'Erreur lors de la sauvegarde du webhook: ' + error.message });
    }
});

function createRecensementLogEmbed(recensement, redacteur, department, action = 'modify') {
    const now = new Date();
    let color = 0xFFA500;
    if (department === 'LSPD') color = 0x0066CC;
    else if (department === 'GOUV') color = 0x2F3136;

    const authorMention = redacteur.discordId ? `<@${redacteur.discordId}>` : `@${redacteur.matricule || 'N/A'} | ${redacteur.fullName || 'N/A'}`;

    const isDelete = action === 'delete';
    const title = isDelete ? 'Recensement supprimé' : 'Recensement modifié';
    const description = isDelete 
        ? `${authorMention} a supprimé le recensement N°${recensement.numero || 'N/A'} - ${recensement.prenomNom || 'N/A'}`
        : `${authorMention} a modifié le recensement N°${recensement.numero || 'N/A'} - ${recensement.prenomNom || 'N/A'}`;

    return {
        title: title,
        description: description,
        color: color,
        footer: {
            text: ' '
        },
        fields: [
            {
                name: 'Auteur',
                value: `@${redacteur.matricule || 'N/A'} | ${redacteur.fullName || 'N/A'}`,
                inline: false
            },
            {
                name: 'Recensement',
                value: `N°${recensement.numero || 'N/A'} - ${recensement.prenomNom || 'N/A'}`,
                inline: false
            }
        ],
        timestamp: now.toISOString()
    };
}

async function getLogWebhookUrl(department) {
    try {
        const connection = await pool.getConnection();
        const [rows] = await connection.query(
            'SELECT url FROM webhooks WHERE type = ? AND department = ? AND (enabled = 1 OR enabled = TRUE)',
            ['log', department]
        );
        connection.release();
        return rows.length > 0 ? rows[0].url : null;
    } catch (error) {
        console.error('Erreur lors de la récupération du webhook de log:', error);
        return null;
    }
}

async function getDevLogWebhookUrl() {
    try {
        const connection = await pool.getConnection();
        const [rows] = await connection.query(
            'SELECT url FROM webhooks WHERE type = ? AND department IS NULL AND (enabled = 1 OR enabled = TRUE)',
            ['DEV_LOG']
        );
        connection.release();
        return rows.length > 0 ? rows[0].url : null;
    } catch (error) {
        console.error('Erreur lors de la récupération du webhook DEV_LOG:', error);
        return null;
    }
}

async function sendLogWebhook(webhookUrl, embed) {
    if (!webhookUrl) return;
    
    try {
        const url = new URL(webhookUrl);
        const port = url.port ? parseInt(url.port) : (url.protocol === 'https:' ? 443 : 80);
        const options = {
            hostname: url.hostname,
            port: port,
            path: url.pathname + url.search,
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'User-Agent': 'MDT-Flashland/1.0'
            }
        };

        const data = JSON.stringify({ embeds: [embed] });
        options.headers['Content-Length'] = Buffer.byteLength(data);

        return new Promise((resolve, reject) => {
            const protocol = url.protocol === 'https:' ? https : http;
            const req = protocol.request(options, (res) => {
                let responseData = '';
                res.on('data', (chunk) => {
                    responseData += chunk;
                });
                res.on('end', () => {
                    if (res.statusCode >= 200 && res.statusCode < 300) {
                        resolve(responseData);
                    } else {
                        reject(new Error(`Webhook failed with status ${res.statusCode}`));
                    }
                });
            });

            req.on('error', (error) => {
                console.error('Erreur de connexion webhook log:', error);
                reject(error);
            });

            req.setTimeout(10000, () => {
                req.destroy();
                reject(new Error('Timeout'));
            });

            req.write(data);
            req.end();
        });
    } catch (error) {
        console.error('Erreur lors de l\'envoi du webhook de log:', error);
    }
}

function createLogEmbed(type, targetUser, authorUser, department, rank = null) {
    const now = new Date();
    let color = 0xFFA500;
    if (department === 'LSPD') color = 0x0066CC;
    else if (department === 'GOUV') color = 0x2F3136;

    let title = '';
    let description = '';
    let rankField = null;

    if (type === 'register' || type === 'new_user') {
        title = 'Nouvel utilisateur créé';
        const targetDiscordMention = targetUser.discordId ? `<@${targetUser.discordId}>` : targetUser.discordId || 'N/A';
        description = `Un nouvel utilisateur a créé un compte et est **en attente** de validation.`;
        rankField = null;
    } else if (type === 'add' || type === 'accept') {
        title = 'Membre ajouté au MDT';
        const targetDiscordMention = targetUser.discordId ? `<@${targetUser.discordId}>` : `@${targetUser.matricule || 'N/A'} | ${targetUser.fullName || 'N/A'}`;
        description = `L'utilisateur ${targetDiscordMention} a été ajouté au MDT avec le rang ${rank || targetUser.role || 'N/A'}`;
        rankField = {
            name: 'Rang',
            value: rank || targetUser.role || 'N/A',
            inline: false
        };
    } else if (type === 'reject') {
        title = 'Demande de compte refusée';
        const targetDisplay = targetUser.discordId ? `<@${targetUser.discordId}>` : `@${targetUser.matricule || 'N/A'} | ${targetUser.fullName || 'N/A'}`;
        const authorMention = authorUser.discordId ? `<@${authorUser.discordId}>` : `@${authorUser.matricule || 'N/A'} | ${authorUser.fullName || 'N/A'}`;
        description = `${authorMention} a refusé la demande de compte de ${targetDisplay}`;
    } else if (type === 'rank') {
        title = 'Rang modifié';
        const targetDisplay = targetUser.discordId ? `<@${targetUser.discordId}>` : `@${targetUser.matricule || 'N/A'} | ${targetUser.fullName || 'N/A'}`;
        const authorMention = authorUser.discordId ? `<@${authorUser.discordId}>` : `@${authorUser.matricule || 'N/A'} | ${authorUser.fullName || 'N/A'}`;
        description = `${authorMention} a modifié le rang de ${targetDisplay} en ${rank || 'N/A'}`;
        rankField = null;
    } else if (type === 'delete') {
        title = 'Compte supprimé';
        const targetDisplay = targetUser.discordId ? `<@${targetUser.discordId}>` : `@${targetUser.matricule || 'N/A'} | ${targetUser.fullName || 'N/A'}`;
        description = `L'utilisateur ${targetDisplay} a été supprimé du MDT`;
    } else if (type === 'discord') {
        title = 'ID Discord modifié';
        const targetDisplay = targetUser.discordId ? `<@${targetUser.discordId}>` : `@${targetUser.matricule || 'N/A'} | ${targetUser.fullName || 'N/A'}`;
        const authorMention = authorUser.discordId ? `<@${authorUser.discordId}>` : `@${authorUser.matricule || 'N/A'} | ${authorUser.fullName || 'N/A'}`;
        description = `${authorMention} a modifié l'ID Discord de ${targetDisplay}`;
    }

    const embed = {
        title: title,
        description: description,
        color: color,
        footer: {
            text: ' '
        },
        fields: []
    };

    if (type === 'register' || type === 'new_user') {
        embed.fields.push(
            {
                name: 'Nom & Prénom',
                value: targetUser.fullName || 'N/A',
                inline: true
            },
            {
                name: 'Email',
                value: targetUser.email || 'N/A',
                inline: true
            },
            {
                name: 'Matricule',
                value: targetUser.matricule || 'N/A',
                inline: true
            },
            {
                name: 'ID Discord',
                value: targetUser.discordId ? `<@${targetUser.discordId}>` : targetUser.discordId || 'N/A',
                inline: true
            },
            {
                name: 'Département',
                value: department || 'N/A',
                inline: true
            },
            {
                name: 'Statut',
                value: '⏳ En attente',
                inline: true
            }
        );
    } else {
        embed.fields.push({
            name: 'Auteur',
            value: `@${authorUser.matricule || 'N/A'} | ${authorUser.fullName || 'N/A'}`,
            inline: false
        });
    }

    if (rankField) {
        embed.fields.push(rankField);
    }

    embed.timestamp = now.toISOString();

    return embed;
}

app.post('/api/webhooks/log', async (req, res) => {
    try {
        const { type, recensement, redacteur, department } = req.body;

        if (!type || !recensement || !redacteur || !department) {
            return res.status(400).json({ error: 'Données manquantes' });
        }

        if (type === 'recensement_modify' || type === 'recensement_delete') {
            let userDepartment = null;
            let discordId = null;
            if (redacteur.matricule) {
                try {
                    const connection = await pool.getConnection();
                    const [users] = await connection.query(
                        'SELECT department, discordId FROM users WHERE matricule = ? LIMIT 1',
                        [redacteur.matricule]
                    );
                    connection.release();
                    if (users.length > 0) {
                        if (users[0].department) {
                            userDepartment = users[0].department;
                        }
                        if (users[0].discordId) {
                            discordId = users[0].discordId;
                        }
                    }
                } catch (dbError) {
                    console.error('Erreur lors de la vérification du département:', dbError);
                }
            }

            if (redacteur.discordId) {
                discordId = redacteur.discordId;
            }

            const action = type === 'recensement_delete' ? 'delete' : 'modify';
            const embed = createRecensementLogEmbed(recensement, { ...redacteur, discordId }, department, action);

            const recensementWebhookUrl = await getWebhookUrl('recensement', department);
            if (recensementWebhookUrl) {
                try {
                    await sendDiscordWebhook(recensementWebhookUrl, embed);
                    console.log(`Log de ${action === 'delete' ? 'suppression' : 'modification'} de recensement envoyé vers webhook recensement pour`, department);
                } catch (error) {
                    console.error('Erreur lors de l\'envoi du log vers webhook recensement:', error);
                }
            }

            const logWebhookUrl = await getLogWebhookUrl(department);
            if (logWebhookUrl) {
                try {
                    await sendDiscordWebhook(logWebhookUrl, embed);
                    console.log(`Log de ${action === 'delete' ? 'suppression' : 'modification'} de recensement envoyé vers webhook log pour`, department);
                } catch (error) {
                    console.error('Erreur lors de l\'envoi du log vers webhook log:', error);
                }
            }

            const devLogWebhookUrl = await getDevLogWebhookUrl();
            if (devLogWebhookUrl) {
                try {
                    await sendDiscordWebhook(devLogWebhookUrl, embed);
                    console.log(`Log DEV de ${action === 'delete' ? 'suppression' : 'modification'} de recensement envoyé`);
                } catch (error) {
                    console.error('Erreur lors de l\'envoi du log DEV:', error);
                }
            }

            res.json({ success: true });
        } else {
            res.status(400).json({ error: 'Type de log invalide' });
        }
    } catch (error) {
        console.error('Erreur lors du traitement du log:', error);
        res.status(500).json({ error: 'Erreur serveur' });
    }
});

async function startServer() {
    await ensureDataDir();
    await initDatabase();
    app.listen(PORT, () => {
        console.log(`Serveur démarré sur http://localhost:${PORT}`);
    });
}

startServer().catch(console.error);
