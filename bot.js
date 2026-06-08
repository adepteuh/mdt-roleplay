const { Client, GatewayIntentBits, REST, Routes, SlashCommandBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const mysql = require('mysql2/promise');
const https = require('https');
const http = require('http');

const DEV_MDT_IDS = ['ID1', 'ID2', 'ID3', 'ID4'];

function isDevMDT(discordId) {
    return DEV_MDT_IDS.includes(discordId);
}

const BOT_TOKEN = 'token bot';

const dbConfig = {
    host: 'localhost',
    user: 'root',
    password: '',
    database: 'mdt_flashland',
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0,
    acquireTimeout: 60000,
    timeout: 60000
};

const pool = mysql.createPool(dbConfig);

const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent
    ]
});

async function getUserFromDiscordId(discordId) {
    let connection;
    try {
        connection = await pool.getConnection();
        const [rows] = await connection.query(
            'SELECT id, fullName, email, matricule, discordId, role, department, status FROM users WHERE discordId = ? LIMIT 1',
            [discordId]
        );
        return rows.length > 0 ? rows[0] : null;
    } catch (error) {
        console.error('Erreur lors de la récupération de l\'utilisateur:', error);
        return null;
    } finally {
        if (connection) connection.release();
    }
}

async function hasPermission(discordId, requiredPermission) {
    if (isDevMDT(discordId)) {
        return true;
    }

    const user = await getUserFromDiscordId(discordId);
    if (!user || user.status !== 'approved') {
        return false;
    }

    const role = user.role || '';
    const department = user.department || '';

    switch (requiredPermission) {
        case 'webhook':
            return role.includes('_EM') || role.includes('_LEAD');

        case 'setrank':
            return role.includes('_EM') || role.includes('_LEAD');

        case 'add_user':
            return role.includes('_SUP') || role.includes('_EM') || role.includes('_LEAD');

        case 'delete_user':
            return role.includes('_EM') || role.includes('_LEAD');

        case 'clear_data':
            return false;

        default:
            return false;
    }
}

async function canSetRank(requesterDiscordId, targetDiscordId, newRank) {
    if (isDevMDT(requesterDiscordId)) {
        return { allowed: true };
    }

    const requester = await getUserFromDiscordId(requesterDiscordId);
    if (!requester || requester.status !== 'approved') {
        return { allowed: false, reason: 'Vous n\'êtes pas autorisé.' };
    }

    const requesterRole = requester.role || '';
    const requesterDept = requester.department || '';

    if (!requesterRole.includes('_EM') && !requesterRole.includes('_LEAD')) {
        return { allowed: false, reason: 'Seuls les EM et LEAD peuvent modifier les rangs.' };
    }

    const target = await getUserFromDiscordId(targetDiscordId);
    if (!target) {
        return { allowed: false, reason: 'Utilisateur introuvable.' };
    }

    const targetDept = target.department || '';

    if (requesterDept !== targetDept) {
        const deptName = targetDept === 'LSPD' ? 'LSPD' : targetDept === 'GOUV' ? 'GOUV' : 'BCSO';
        return { allowed: false, reason: `Vous ne pouvez pas modifier les rangs des utilisateurs ${deptName} (vous êtes ${requesterDept}).` };
    }

    if (requesterDept === 'LSPD' && (newRank.startsWith('BCSO') || newRank === 'BCSO' || newRank.startsWith('GOUV') || newRank === 'GOUV')) {
        return { allowed: false, reason: 'Les utilisateurs LSPD ne peuvent pas attribuer de rangs BCSO ou GOUV.' };
    }
    if (requesterDept === 'BCSO' && (newRank.startsWith('LSPD') || newRank === 'LSPD' || newRank.startsWith('GOUV') || newRank === 'GOUV')) {
        return { allowed: false, reason: 'Les utilisateurs BCSO ne peuvent pas attribuer de rangs LSPD ou GOUV.' };
    }
    if (requesterDept === 'GOUV' && (newRank.startsWith('BCSO') || newRank === 'BCSO' || newRank.startsWith('LSPD') || newRank === 'LSPD')) {
        return { allowed: false, reason: 'Les utilisateurs GOUV ne peuvent pas attribuer de rangs BCSO ou LSPD.' };
    }

    if (newRank.includes('_LEAD') && !isDevMDT(requesterDiscordId)) {
        return { allowed: false, reason: 'Seul DEV_MDT peut attribuer le rang LEAD.' };
    }

    let baseRank = 'BCSO';
    if (requesterDept === 'LSPD') baseRank = 'LSPD';
    else if (requesterDept === 'GOUV') baseRank = 'GOUV';

    if (newRank.includes('_EM') && !requesterRole.includes('_LEAD')) {
        return { allowed: false, reason: 'Seuls les LEAD peuvent attribuer le rang EM.' };
    }

    if (requesterRole.includes('_EM') && !requesterRole.includes('_LEAD')) {
        if (newRank === baseRank) {
            return { allowed: false, reason: `Les EM ne peuvent attribuer que les rangs SUP, pas le rang de base ${baseRank}.` };
        }
        if (newRank.includes('_EM')) {
            return { allowed: false, reason: 'Les EM ne peuvent pas attribuer le rang EM. Seuls les LEAD peuvent le faire.' };
        }
        let validRanksForEM = ['BCSO_SUP'];
        if (requesterDept === 'LSPD') validRanksForEM = ['LSPD_SUP'];
        else if (requesterDept === 'GOUV') validRanksForEM = ['GOUV_SUP'];
        if (!validRanksForEM.includes(newRank)) {
            return { allowed: false, reason: `Rang invalide. Les EM ne peuvent attribuer que: ${validRanksForEM.join(', ')}` };
        }
    }

    if (requesterRole.includes('_LEAD')) {
        if (newRank === baseRank) {
            return { allowed: false, reason: `Les LEAD ne peuvent attribuer que les rangs SUP ou EM, pas le rang de base ${baseRank}.` };
        }
        let validRanksForLead = ['BCSO_SUP', 'BCSO_EM'];
        if (requesterDept === 'LSPD') validRanksForLead = ['LSPD_SUP', 'LSPD_EM'];
        else if (requesterDept === 'GOUV') validRanksForLead = ['GOUV_SUP', 'GOUV_EM'];
        if (!validRanksForLead.includes(newRank)) {
            return { allowed: false, reason: `Rang invalide. Rangs valides pour ${requesterDept}: ${validRanksForLead.join(', ')}` };
        }
    }

    return { allowed: true };
}

async function canSetDiscord(requesterDiscordId, targetDiscordId) {
    if (isDevMDT(requesterDiscordId)) {
        return { allowed: true };
    }

    const requester = await getUserFromDiscordId(requesterDiscordId);
    if (!requester || requester.status !== 'approved') {
        return { allowed: false, reason: 'Vous n\'êtes pas autorisé.' };
    }

    const requesterRole = requester.role || '';
    const requesterDept = requester.department || '';

    if (!requesterRole.includes('_EM') && !requesterRole.includes('_LEAD')) {
        return { allowed: false, reason: 'Seuls les EM et LEAD peuvent modifier les ID Discord.' };
    }

    const target = await getUserFromDiscordId(targetDiscordId);
    if (!target) {
        return { allowed: false, reason: 'Utilisateur introuvable.' };
    }

    const targetDept = target.department || '';

    if (requesterDept !== targetDept) {
        const deptName = targetDept === 'LSPD' ? 'LSPD' : targetDept === 'GOUV' ? 'GOUV' : 'BCSO';
        return { allowed: false, reason: `Vous ne pouvez pas modifier les ID Discord des utilisateurs ${deptName} (vous êtes ${requesterDept}).` };
    }

    return { allowed: true };
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

function formatDateFr(dateString) {
    try {
        if (!dateString) return new Date().toLocaleDateString('fr-FR');
        const date = new Date(dateString);
        return date.toLocaleDateString('fr-FR');
    } catch (e) {
        return new Date().toLocaleDateString('fr-FR');
    }
}

function formatTimeFr(dateString) {
    try {
        if (!dateString) {
            const now = new Date();
            return `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
        }
        const date = new Date(dateString);
        return `${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`;
    } catch (e) {
        const now = new Date();
        return `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
    }
}

async function sendLogWebhook(webhookUrl, embed) {
    try {
        if (!webhookUrl) return;

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

        const payload = {
            embeds: [embed],
            username: 'MDT APP',
            avatar_url: ''
        };

        const data = JSON.stringify(payload);

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

    if (type === 'add') {
        title = 'Membre ajouté au MDT';
        const targetDiscordMention = targetUser.discordId ? `<@${targetUser.discordId}>` : `@${targetUser.matricule || 'N/A'} | ${targetUser.fullName || 'N/A'}`;
        description = `L'utilisateur ${targetDiscordMention} a été ajouté au MDT avec le rang ${rank || targetUser.role || 'N/A'}`;
        rankField = {
            name: 'Rang',
            value: rank || targetUser.role || 'N/A',
            inline: false
        };
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
    } else if (type === 'clear') {
        title = 'Données supprimées';
        const authorMention = authorUser.discordId ? `<@${authorUser.discordId}>` : `@${authorUser.matricule || 'N/A'} | ${authorUser.fullName || 'N/A'}`;
        description = `${authorMention} a supprimé toutes les données du MDT (recensements, arrests, contraventions, plaintes, incidents, rookie reports, settings, webhooks)`;
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
        fields: [
            {
                name: 'Auteur',
                value: `@${authorUser.matricule || 'N/A'} | ${authorUser.fullName || 'N/A'}`,
                inline: false
            }
        ]
    };

    if (rankField) {
        embed.fields.push(rankField);
    }

    embed.timestamp = now.toISOString();

    return embed;
}

const commands = [
    new SlashCommandBuilder()
        .setName('webhook')
        .setDescription('Configurer un webhook Discord')
        .addStringOption(option =>
            option.setName('type')
                .setDescription('Type de webhook')
                .setRequired(true)
                .addChoices(
                    { name: 'Recensement BCSO', value: 'recensement_BCSO' },
                    { name: 'Recensement LSPD', value: 'recensement_LSPD' },
                    { name: 'Recensement GOUV', value: 'recensement_GOUV' },
                    { name: 'Arrestation BCSO', value: 'arrestation_BCSO' },
                    { name: 'Arrestation LSPD', value: 'arrestation_LSPD' },
                    { name: 'Arrestation GOUV', value: 'arrestation_GOUV' },
                    { name: 'Rookie BCSO', value: 'rookie_BCSO' },
                    { name: 'Rookie LSPD', value: 'rookie_LSPD' },
                    { name: 'Rookie GOUV', value: 'rookie_GOUV' },
                    { name: 'First Lincoln BCSO', value: 'firstLincoln_BCSO' },
                    { name: 'First Lincoln LSPD', value: 'firstLincoln_LSPD' },
                    { name: 'First Lincoln GOUV', value: 'firstLincoln_GOUV' },
                    { name: 'Incident BCSO', value: 'incident_BCSO' },
                    { name: 'Incident LSPD', value: 'incident_LSPD' },
                    { name: 'Incident GOUV', value: 'incident_GOUV' },
                    { name: 'Logs BCSO', value: 'log_BCSO' },
                    { name: 'Logs LSPD', value: 'log_LSPD' },
                    { name: 'Logs GOUV', value: 'log_GOUV' },
                    { name: 'DEV Recensement', value: 'DEV_RECENSEMENT' },
                    { name: 'DEV Arrestation', value: 'DEV_ARRESTATION' },
                    { name: 'DEV Rookie', value: 'DEV_ROOKIE' },
                    { name: 'DEV First Lincoln', value: 'DEV_FIRSTLINCOLN' },
                    { name: 'DEV Incident', value: 'DEV_INCIDENT' },
                    { name: 'DEV Logs', value: 'DEV_LOG' }
                ))
        .addStringOption(option =>
            option.setName('lien')
                .setDescription('URL du webhook Discord')
                .setRequired(true)),

    new SlashCommandBuilder()
        .setName('setrank')
        .setDescription('Modifier le rang d\'un utilisateur')
        .addStringOption(option =>
            option.setName('discordid')
                .setDescription('ID Discord de l\'utilisateur')
                .setRequired(true))
        .addStringOption(option =>
            option.setName('rank')
                .setDescription('Nouveau rang')
                .setRequired(true)
                .addChoices(
                    { name: 'BCSO', value: 'BCSO' },
                    { name: 'BCSO_SUP', value: 'BCSO_SUP' },
                    { name: 'BCSO_EM', value: 'BCSO_EM' },
                    { name: 'BCSO_LEAD', value: 'BCSO_LEAD' },
                    { name: 'LSPD', value: 'LSPD' },
                    { name: 'LSPD_SUP', value: 'LSPD_SUP' },
                    { name: 'LSPD_EM', value: 'LSPD_EM' },
                    { name: 'LSPD_LEAD', value: 'LSPD_LEAD' },
                    { name: 'GOUV', value: 'GOUV' },
                    { name: 'GOUV_SUP', value: 'GOUV_SUP' },
                    { name: 'GOUV_EM', value: 'GOUV_EM' },
                    { name: 'GOUV_LEAD', value: 'GOUV_LEAD' }
                )),

    new SlashCommandBuilder()
        .setName('add-user')
        .setDescription('Accepter un compte utilisateur')
        .addStringOption(option =>
            option.setName('discordid')
                .setDescription('ID Discord de l\'utilisateur')
                .setRequired(true)),

    new SlashCommandBuilder()
        .setName('delete-user')
        .setDescription('Supprimer un compte utilisateur')
        .addStringOption(option =>
            option.setName('discordid')
                .setDescription('ID Discord de l\'utilisateur')
                .setRequired(true)),

    new SlashCommandBuilder()
        .setName('clear-data')
        .setDescription('Effacer toutes les données du MDT (DEV_MDT uniquement)'),

    new SlashCommandBuilder()
        .setName('setdiscord')
        .setDescription('Modifier l\'ID Discord d\'un utilisateur')
        .addStringOption(option =>
            option.setName('oldid')
                .setDescription('Ancien ID Discord de l\'utilisateur')
                .setRequired(true))
        .addStringOption(option =>
            option.setName('newid')
                .setDescription('Nouvel ID Discord de l\'utilisateur')
                .setRequired(true))
];

async function registerCommands() {
    const rest = new REST({ version: '10' }).setToken(BOT_TOKEN);

    try {
        console.log('Enregistrement des commandes slash...');
        console.log(`Nombre de commandes à enregistrer: ${commands.length}`);
        const commandNames = commands.map(cmd => {
            const json = cmd.toJSON();
            return json.name;
        });
        commandNames.forEach((name, index) => {
            console.log(`  ${index + 1}. /${name}`);
        });

        const commandData = await rest.put(
            Routes.applicationCommands(client.user.id),
            { body: commands.map(cmd => cmd.toJSON()) }
        );

        console.log(`✅ Commandes slash enregistrées avec succès (${commandData.length} commandes).`);
        commandData.forEach(cmd => {
            console.log(`   - /${cmd.name}`);
        });
    } catch (error) {
        console.error('❌ Erreur lors de l\'enregistrement des commandes:', error);
        if (error.code) {
            console.error(`   Code d'erreur: ${error.code}`);
        }
        if (error.message) {
            console.error(`   Message: ${error.message}`);
        }
        if (error.rawError) {
            console.error(`   Erreur Discord API:`, error.rawError);
        }
    }
}

client.on('interactionCreate', async interaction => {
    if (!interaction.isChatInputCommand()) return;

    const { commandName, user } = interaction;
    const discordId = user.id;

    try {
        switch (commandName) {
            case 'webhook': {
                const typeWithDept = interaction.options.getString('type');
                const lien = interaction.options.getString('lien');
                
                await interaction.deferReply({ ephemeral: true });

                try {
                    new URL(lien);
                } catch (e) {
                    return interaction.editReply({ 
                        content: '❌ URL invalide.' 
                    });
                }

                let type, dept;
                const isDev = isDevMDT(discordId);
                
                if (typeWithDept.startsWith('DEV_')) {
                    if (!isDev) {
                        return interaction.editReply({ 
                            content: '❌ Seuls les DEV_MDT peuvent configurer les webhooks DEV_*.' 
                        });
                    }
                    type = typeWithDept;
                    dept = null;
                } else {
                    const parts = typeWithDept.split('_');
                    if (parts.length !== 2) {
                        return interaction.editReply({ 
                            content: '❌ Format de type invalide.' 
                        });
                    }
                    type = parts[0];
                    dept = parts[1].toUpperCase();

                    if (!isDev) {
                        const user = await getUserFromDiscordId(discordId);
                        
                        if (!user || user.status !== 'approved') {
                            return interaction.editReply({ 
                                content: '❌ Vous n\'êtes pas autorisé à utiliser cette commande.' 
                            });
                        }

                        const role = user.role || '';
                        if (!role.includes('_EM') && !role.includes('_LEAD')) {
                            return interaction.editReply({ 
                                content: '❌ Vous n\'avez pas la permission d\'utiliser cette commande. Seuls les EM et LEAD peuvent configurer les webhooks.' 
                            });
                        }

                        if (!user.department) {
                            return interaction.editReply({ 
                                content: '❌ Impossible de déterminer votre département.' 
                            });
                        }

                        const userDept = (user.department || '').toUpperCase();
                        if (userDept !== dept) {
                            const deptNames = {
                                'BCSO': 'BCSO',
                                'LSPD': 'LSPD',
                                'GOUV': 'GOUV'
                            };
                            const deptName = deptNames[dept] || dept;
                            const userDeptName = deptNames[userDept] || userDept;
                            return interaction.editReply({ 
                                content: `❌ Vous ne pouvez pas configurer les webhooks ${deptName} (vous êtes ${userDeptName}).` 
                            });
                        }
                    }
                }

                let connection;
                try {
                    connection = await pool.getConnection();
                    await connection.query(
                        'INSERT INTO webhooks (type, department, url, enabled) VALUES (?, ?, ?, 1) ON DUPLICATE KEY UPDATE url = ?, enabled = 1',
                        [type, dept, lien, lien]
                    );
                } catch (dbError) {
                    console.error('Erreur DB lors de la sauvegarde du webhook:', dbError);
                    if (connection) connection.release();
                    return interaction.editReply({ 
                        content: '❌ Erreur lors de la sauvegarde du webhook. Veuillez réessayer.' 
                    });
                } finally {
                    if (connection) connection.release();
                }

                const successMessage = dept 
                    ? `✅ Webhook ${type} configuré pour ${dept} avec succès.`
                    : `✅ Webhook ${type} configuré avec succès (tous départements).`;
                await interaction.editReply({ 
                    content: successMessage
                });
                break;
            }

            case 'setrank': {
                await interaction.deferReply({ ephemeral: true });

                const targetDiscordId = interaction.options.getString('discordid');
                const newRank = interaction.options.getString('rank');

                if (newRank.includes('_LEAD') && !isDevMDT(discordId)) {
                    return interaction.editReply({ 
                        content: '❌ Seul DEV_MDT peut attribuer le rang LEAD.' 
                    });
                }

                const canSet = await canSetRank(discordId, targetDiscordId, newRank);
                if (!canSet.allowed) {
                    return interaction.editReply({ 
                        content: `❌ ${canSet.reason}` 
                    });
                }

                const connection = await pool.getConnection();
                await connection.query(
                    'UPDATE users SET role = ? WHERE discordId = ?',
                    [newRank, targetDiscordId]
                );
                connection.release();

                const target = await getUserFromDiscordId(targetDiscordId);
                const author = await getUserFromDiscordId(discordId);
                
                if (target && author && target.department) {
                    const logWebhookUrl = await getLogWebhookUrl(target.department);
                    if (logWebhookUrl) {
                        const logEmbed = createLogEmbed('rank', target, author, target.department, newRank);
                        sendLogWebhook(logWebhookUrl, logEmbed).catch(err => 
                            console.error('Erreur envoi log modification de rang:', err)
                        );
                    }
                    
                    const devLogWebhookUrl = await getDevLogWebhookUrl();
                    if (devLogWebhookUrl) {
                        const devLogEmbed = createLogEmbed('rank', target, author, target.department, newRank);
                        sendLogWebhook(devLogWebhookUrl, devLogEmbed).catch(err => 
                            console.error('Erreur envoi log DEV_LOG modification de rang:', err)
                        );
                    }
                }

                await interaction.editReply({ 
                    content: `✅ Rang de l'utilisateur <@${targetDiscordId}> modifié en **${newRank}**.` 
                });
                break;
            }

            case 'add-user': {
                await interaction.deferReply({ ephemeral: true });

                if (!(await hasPermission(discordId, 'add_user'))) {
                    return interaction.editReply({ 
                        content: '❌ Vous n\'avez pas la permission d\'utiliser cette commande.' 
                    });
                }

                const targetDiscordId = interaction.options.getString('discordid');

                const target = await getUserFromDiscordId(targetDiscordId);
                if (!target) {
                    return interaction.editReply({ 
                        content: `❌ Aucun utilisateur trouvé avec l'ID Discord ${targetDiscordId}.` 
                    });
                }

                if (!isDevMDT(discordId)) {
                    const requester = await getUserFromDiscordId(discordId);
                    if (requester && requester.department && target.department) {
                        if (requester.department !== target.department) {
                            const deptName = target.department === 'LSPD' ? 'LSPD' : target.department === 'GOUV' ? 'GOUV' : 'BCSO';
                            return interaction.editReply({ 
                                content: `❌ Vous ne pouvez pas accepter les comptes ${deptName} (vous êtes ${requester.department}).` 
                            });
                        }
                    }
                }

                const connection = await pool.getConnection();
                await connection.query(
                    'UPDATE users SET status = ? WHERE discordId = ?',
                    ['approved', targetDiscordId]
                );
                connection.release();

                const updatedTarget = await getUserFromDiscordId(targetDiscordId);
                const author = await getUserFromDiscordId(discordId);
                
                if (updatedTarget && author && updatedTarget.department) {
                    const logWebhookUrl = await getLogWebhookUrl(updatedTarget.department);
                    if (logWebhookUrl) {
                        const logEmbed = createLogEmbed('add', updatedTarget, author, updatedTarget.department, updatedTarget.role);
                        sendLogWebhook(logWebhookUrl, logEmbed).catch(err => 
                            console.error('Erreur envoi log ajout de compte:', err)
                        );
                    }
                    
                    const devLogWebhookUrl = await getDevLogWebhookUrl();
                    if (devLogWebhookUrl) {
                        const devLogEmbed = createLogEmbed('add', updatedTarget, author, updatedTarget.department, updatedTarget.role);
                        sendLogWebhook(devLogWebhookUrl, devLogEmbed).catch(err => 
                            console.error('Erreur envoi log DEV_LOG ajout de compte:', err)
                        );
                    }
                }

                await interaction.editReply({ 
                    content: `✅ Compte de l'utilisateur <@${targetDiscordId}> accepté avec succès.` 
                });
                break;
            }

            case 'delete-user': {
                await interaction.deferReply({ ephemeral: true });

                if (!(await hasPermission(discordId, 'delete_user'))) {
                    return interaction.editReply({ 
                        content: '❌ Vous n\'avez pas la permission d\'utiliser cette commande.' 
                    });
                }

                const targetDiscordId = interaction.options.getString('discordid');

                const target = await getUserFromDiscordId(targetDiscordId);
                if (!target) {
                    return interaction.editReply({ 
                        content: `❌ Aucun utilisateur trouvé avec l'ID Discord ${targetDiscordId}.` 
                    });
                }

                if (!isDevMDT(discordId)) {
                    const requester = await getUserFromDiscordId(discordId);
                    if (requester && requester.department && target.department) {
                        if (requester.department !== target.department) {
                            const deptName = target.department === 'LSPD' ? 'LSPD' : target.department === 'GOUV' ? 'GOUV' : 'BCSO';
                            return interaction.editReply({ 
                                content: `❌ Vous ne pouvez pas supprimer les comptes ${deptName} (vous êtes ${requester.department}).` 
                            });
                        }
                    }
                }

                const author = await getUserFromDiscordId(discordId);
                const targetDepartment = target.department;

                const connection = await pool.getConnection();
                const [result] = await connection.query(
                    'DELETE FROM users WHERE discordId = ?',
                    [targetDiscordId]
                );
                connection.release();

                if (target && author && targetDepartment) {
                    const logWebhookUrl = await getLogWebhookUrl(targetDepartment);
                    if (logWebhookUrl) {
                        const logEmbed = createLogEmbed('delete', target, author, targetDepartment);
                        sendLogWebhook(logWebhookUrl, logEmbed).catch(err => 
                            console.error('Erreur envoi log suppression de compte:', err)
                        );
                    }
                    
                    const devLogWebhookUrl = await getDevLogWebhookUrl();
                    if (devLogWebhookUrl) {
                        const devLogEmbed = createLogEmbed('delete', target, author, targetDepartment);
                        sendLogWebhook(devLogWebhookUrl, devLogEmbed).catch(err => 
                            console.error('Erreur envoi log DEV_LOG suppression de compte:', err)
                        );
                    }
                }

                await interaction.editReply({ 
                    content: `✅ Compte de l'utilisateur <@${targetDiscordId}> supprimé avec succès.` 
                });
                break;
            }

            case 'setdiscord': {
                await interaction.deferReply({ ephemeral: true });

                const oldDiscordId = interaction.options.getString('oldid');
                const newDiscordId = interaction.options.getString('newid');

                if (oldDiscordId === newDiscordId) {
                    return interaction.editReply({ 
                        content: '❌ L\'ancien et le nouvel ID Discord sont identiques.' 
                    });
                }

                const connection = await pool.getConnection();
                
                const [existingUser] = await connection.query(
                    'SELECT id, fullName, discordId, department FROM users WHERE discordId = ?',
                    [oldDiscordId]
                );

                if (existingUser.length === 0) {
                    connection.release();
                    return interaction.editReply({ 
                        content: `❌ Aucun utilisateur trouvé avec l'ID Discord ${oldDiscordId}.` 
                    });
                }

                const canSet = await canSetDiscord(discordId, oldDiscordId);
                if (!canSet.allowed) {
                    connection.release();
                    return interaction.editReply({ 
                        content: `❌ ${canSet.reason}` 
                    });
                }

                const [existingNewId] = await connection.query(
                    'SELECT id, fullName FROM users WHERE discordId = ?',
                    [newDiscordId]
                );

                if (existingNewId.length > 0) {
                    connection.release();
                    return interaction.editReply({ 
                        content: `❌ L'ID Discord ${newDiscordId} est déjà utilisé par un autre utilisateur (${existingNewId[0].fullName || 'N/A'}).` 
                    });
                }

                await connection.query(
                    'UPDATE users SET discordId = ? WHERE discordId = ?',
                    [newDiscordId, oldDiscordId]
                );
                connection.release();

                const target = existingUser[0];
                const author = await getUserFromDiscordId(discordId);
                
                if (target && author && target.department) {
                    const logWebhookUrl = await getLogWebhookUrl(target.department);
                    if (logWebhookUrl) {
                        const logEmbed = createLogEmbed('discord', target, author, target.department);
                        logEmbed.description = `**ID Discord modifié**\nAncien: \`${oldDiscordId}\`\nNouveau: \`${newDiscordId}\``;
                        sendLogWebhook(logWebhookUrl, logEmbed).catch(err => 
                            console.error('Erreur envoi log modification ID Discord:', err)
                        );
                    }
                    
                    const devLogWebhookUrl = await getDevLogWebhookUrl();
                    if (devLogWebhookUrl) {
                        const devLogEmbed = createLogEmbed('discord', target, author, target.department);
                        devLogEmbed.description = `**ID Discord modifié**\nAncien: \`${oldDiscordId}\`\nNouveau: \`${newDiscordId}\``;
                        sendLogWebhook(devLogWebhookUrl, devLogEmbed).catch(err => 
                            console.error('Erreur envoi log DEV_LOG modification ID Discord:', err)
                        );
                    }
                }

                await interaction.editReply({ 
                    content: `✅ ID Discord de l'utilisateur **${target.fullName || 'N/A'}** modifié de \`${oldDiscordId}\` vers \`${newDiscordId}\`.` 
                });
                break;
            }

            case 'clear-data': {
                if (!isDevMDT(discordId)) {
                    return interaction.reply({ 
                        content: '❌ Cette commande est réservée au développeur.', 
                        ephemeral: true 
                    });
                }

                const row = new ActionRowBuilder()
                    .addComponents(
                        new ButtonBuilder()
                            .setCustomId('confirm_clear')
                            .setLabel('Confirmer la suppression')
                            .setStyle(ButtonStyle.Danger)
                    );

                await interaction.reply({ 
                    content: '⚠️ **ATTENTION** : Cette action va supprimer les données du MDT (recensements, arrests, contraventions, plaintes, incidents, rookie reports). Les utilisateurs, webhooks et settings seront préservés.\n\nCliquez sur le bouton ci-dessous pour confirmer. La confirmation expire dans 30 secondes.', 
                    components: [row],
                    ephemeral: true
                });
                break;
            }
        }
    } catch (error) {
        console.error('Erreur lors de l\'exécution de la commande:', error);
        await interaction.reply({ 
            content: '❌ Une erreur est survenue lors de l\'exécution de la commande.', 
            ephemeral: true 
        });
    }
});

client.on('interactionCreate', async interaction => {
    if (!interaction.isButton()) return;
    if (interaction.customId !== 'confirm_clear') return;

    const discordId = interaction.user.id;
    if (!isDevMDT(discordId)) {
        return interaction.reply({ 
            content: '❌ Cette action est réservée au développeur.', 
            ephemeral: true 
        });
    }

    try {
        await interaction.deferUpdate();

        const connection = await pool.getConnection();

        await connection.query('DELETE FROM recensements');
        await connection.query('DELETE FROM arrests');
        await connection.query('DELETE FROM contraventions');
        await connection.query('DELETE FROM plaintes');
        await connection.query('DELETE FROM incidents');
        await connection.query('DELETE FROM rookieReports');
        await connection.query('DELETE FROM arrest_charges');

        connection.release();

        const author = await getUserFromDiscordId(discordId);
        const authorInfo = author || {
            matricule: 'DEV_MDT',
            fullName: interaction.user.username || 'Développeur',
            discordId: discordId
        };
        
            const logEmbedBCSO = createLogEmbed('clear', { id: 'system' }, authorInfo, 'BCSO');
            const logEmbedLSPD = createLogEmbed('clear', { id: 'system' }, authorInfo, 'LSPD');
            const logEmbedGOUV = createLogEmbed('clear', { id: 'system' }, authorInfo, 'GOUV');
        
        const logWebhookUrlBCSO = await getLogWebhookUrl('BCSO');
        const logWebhookUrlLSPD = await getLogWebhookUrl('LSPD');
        const logWebhookUrlGOUV = await getLogWebhookUrl('GOUV');
        
        if (logWebhookUrlBCSO) {
            sendLogWebhook(logWebhookUrlBCSO, logEmbedBCSO).catch(err => 
                console.error('Erreur envoi log clear-data BCSO:', err)
            );
        }
        if (logWebhookUrlLSPD) {
            sendLogWebhook(logWebhookUrlLSPD, logEmbedLSPD).catch(err => 
                console.error('Erreur envoi log clear-data LSPD:', err)
            );
        }
        if (logWebhookUrlGOUV) {
            sendLogWebhook(logWebhookUrlGOUV, logEmbedGOUV).catch(err => 
                console.error('Erreur envoi log clear-data GOUV:', err)
            );
        }
        
        const devLogWebhookUrl = await getDevLogWebhookUrl();
        if (devLogWebhookUrl) {
            const devLogEmbed = createLogEmbed('clear', { id: 'system' }, authorInfo, 'BCSO');
            sendLogWebhook(devLogWebhookUrl, devLogEmbed).catch(err => 
                console.error('Erreur envoi log DEV_LOG clear-data:', err)
            );
        }

        await interaction.editReply({ 
            content: '✅ Toutes les données du MDT ont été supprimées avec succès.', 
            components: [] 
        });
    } catch (error) {
        console.error('Erreur lors de la suppression des données:', error);
        await interaction.editReply({ 
            content: `❌ Une erreur est survenue lors de la suppression des données: ${error.message}`, 
            components: [] 
        });
    }
});

client.once('ready', async () => {
    console.log(`Bot connecté en tant que ${client.user.tag}!`);
    await registerCommands();
});

if (!BOT_TOKEN || BOT_TOKEN === '') {
    console.error('❌ BOT_TOKEN n\'est pas défini dans bot.js. Veuillez ajouter votre token Discord.');
    process.exit(1);
}

if (DEV_MDT_IDS.length === 0 || DEV_MDT_IDS.includes('DEV_MDT')) {
    console.warn('⚠️  ATTENTION : Vérifiez que DEV_MDT_IDS contient vos IDs Discord réels.');
}

client.login(BOT_TOKEN);
