let currentUser = null;

function getDepartmentColor() {
    if (!currentUser) return '#FFA500';
    let department = currentUser.department;
    
    if (!department && currentUser.email) {
        if (currentUser.email.includes('@gouv.us')) {
            department = 'GOUV';
        } else if (currentUser.email.includes('@lspd.us')) {
            department = 'LSPD';
        } else if (currentUser.email.includes('@bcso.us')) {
            department = 'BCSO';
        }
    }
    
    if (!department) department = 'BCSO';
    
    if (department === 'LSPD') return '#0066CC';
    if (department === 'GOUV') return '#2F3136';
    return '#FFA500';
}

function updateDepartmentUI() {
    if (!currentUser) {
        return;
    }

    let department = currentUser.department;
    
    if (!department && currentUser.email) {
        if (currentUser.email.includes('@gouv.us')) {
            department = 'GOUV';
        } else if (currentUser.email.includes('@lspd.us')) {
            department = 'LSPD';
        } else if (currentUser.email.includes('@bcso.us')) {
            department = 'BCSO';
        }
    }
    
    if (!department) {
        department = 'BCSO';
    }

    const logoImg = document.querySelector('.site-logo');
    if (logoImg) {
        if (department === 'LSPD') {
            logoImg.src = 'lspd.png';
        } else if (department === 'GOUV') {
            logoImg.src = 'gouv.webp';
        } else {
            logoImg.src = 'logo.webp';
        }
    }

        const headerTitle = document.querySelector('.header-title');
    if (headerTitle) {
        if (department === 'LSPD') {
            headerTitle.textContent = 'Los Santos Police Department';
        } else if (department === 'GOUV') {
            headerTitle.textContent = 'Gouvernement Of Los Santos';
        } else {
            headerTitle.textContent = 'Blaine County Sheriff Office';
        }
    }

    if (document.title) {
        if (department === 'LSPD') {
            document.title = 'Los Santos Police Department';
        } else if (department === 'GOUV') {
            document.title = 'Gouvernement Of Los Santos';
        } else {
            document.title = 'Blaine County Sheriff Office';
        }
    }

    document.body.className = document.body.className.replace(/department-\w+/g, '');
    document.body.classList.add(`department-${department.toLowerCase()}`);
}

function hasPermission(permission) {
    if (!currentUser || !currentUser.role) return false;

    const role = currentUser.role;

    switch(permission) {
        case 'edit_images':
        case 'upload_images':
            return role === 'BCSO_SUP' || role === 'BCSO_EM' || role === 'BCSO_LEAD' || 
                   role === 'LSPD_SUP' || role === 'LSPD_EM' || role === 'LSPD_LEAD' ||
                   role === 'GOUV_SUP' || role === 'GOUV_EM' || role === 'GOUV_LEAD';
        case 'edit_communication_radio':
        case 'edit_radio':
            return role === 'BCSO_SUP' || role === 'BCSO_EM' || role === 'BCSO_LEAD' || 
                   role === 'LSPD_SUP' || role === 'LSPD_EM' || role === 'LSPD_LEAD' ||
                   role === 'GOUV_SUP' || role === 'GOUV_EM' || role === 'GOUV_LEAD';
        case 'edit_recensement':
            return role === 'BCSO_SUP' || role === 'BCSO_EM' || role === 'BCSO_LEAD' || 
                   role === 'LSPD_SUP' || role === 'LSPD_EM' || role === 'LSPD_LEAD' ||
                   role === 'GOUV_SUP' || role === 'GOUV_EM' || role === 'GOUV_LEAD';
        case 'delete_reports':
            return role === 'BCSO_EM' || role === 'BCSO_LEAD' || role === 'LSPD_EM' || role === 'LSPD_LEAD' ||
                   role === 'GOUV_EM' || role === 'GOUV_LEAD';
        default:
            return false;
    }
}

function isBCSO() {
    return currentUser && (currentUser.role === 'BCSO' || currentUser.role === 'LSPD' || currentUser.role === 'GOUV');
}

function isBCSO_SUP() {
    return currentUser && (currentUser.role === 'BCSO_SUP' || currentUser.role === 'LSPD_SUP' || currentUser.role === 'GOUV_SUP');
}

function isBCSO_EM() {
    return currentUser && (currentUser.role === 'BCSO_EM' || currentUser.role === 'LSPD_EM' || currentUser.role === 'GOUV_EM' ||
                          currentUser.role === 'BCSO_LEAD' || currentUser.role === 'LSPD_LEAD' || currentUser.role === 'GOUV_LEAD');
}

function isLSPD() {
    return currentUser && currentUser.department === 'LSPD';
}

function isGOUV() {
    return currentUser && currentUser.department === 'GOUV';
}

function isBCSODepartment() {
    return currentUser && currentUser.department === 'BCSO';
}

const DEV_MDT_IDS = ['1204506056252858459', '468745336945508373', '520322954899226670', '405817986495283220'];

function isDevMDT() {
    if (!currentUser || !currentUser.discordId) return false;
    return DEV_MDT_IDS.includes(currentUser.discordId);
}

window.addEventListener('error', function(e) {
    console.error('Erreur JavaScript:', e.error);
    return true;
});

let isCheckingAuth = false;

async function checkAuth() {
    if (isCheckingAuth) {
        return false;
    }
    isCheckingAuth = true;
    try {
        const response = await fetch('/api/auth/check', {
            method: 'GET',
            cache: 'no-store',
            credentials: 'include'
        });
        const data = await response.json();

        if (!data.authenticated) {
            currentUser = null;

            if (window.location.pathname === '/' || window.location.pathname.includes('index.html')) {
                window.location.replace('/login.html');
            }
            return false;
        }

        currentUser = data.user;

        if (!currentUser || !currentUser.id) {
            currentUser = null;
            window.location.replace('/login.html');
            return false;
        }

        if (!currentUser.role) {
            currentUser.role = 'BCSO';
        }

        console.log('Utilisateur connecté:', currentUser.fullName, '- Rôle:', currentUser.role);

        updateUserInfo();
        updateDepartmentUI();
        applyRolePermissions();
        
        ensureDataStoreInitialized();
        await loadFromSharedFile();
        
        setTimeout(() => {
            loadImagesFromSettings();
        }, 500);

        isCheckingAuth = false;
        return true;
    } catch (error) {
        console.error('Erreur de vérification d\'authentification:', error);
        currentUser = null;

        if (window.location.pathname === '/' || window.location.pathname.includes('index.html')) {
            isCheckingAuth = false;
            window.location.replace('/login.html');
            return false;
        }
        isCheckingAuth = false;
        return false;
    }
}

async function reloadUserInfo() {
    try {
        const response = await fetch('/api/auth/check', {
            method: 'GET',
            cache: 'no-store',
            credentials: 'include'
        });
        const data = await response.json();

        if (data.authenticated && data.user) {
            const oldRole = currentUser ? currentUser.role : null;
            currentUser = data.user;

            if (!currentUser.role) {
                currentUser.role = 'BCSO';
            }

            if (oldRole !== currentUser.role) {
                console.log('Rôle changé:', oldRole, '->', currentUser.role);
                applyRolePermissions();
            }

            updateUserInfo();
            return true;
        }
        return false;
    } catch (error) {
        console.error('Erreur lors du rechargement des informations utilisateur:', error);
        return false;
    }
}

function updateUserInfo() {
    if (!currentUser) {
        return;
    }

    const userNameElement = document.querySelector('.user-name') || document.getElementById('userNameDisplay');
    if (userNameElement) {
        if (currentUser && currentUser.matricule && currentUser.fullName) {
            userNameElement.textContent = `${currentUser.matricule} | ${currentUser.fullName}`;
        } else {
            userNameElement.textContent = 'Non connecté';
            setTimeout(() => {
                if (!currentUser) {
                    window.location.replace('/login.html');
                }
            }, 100);
        }
    }

    const userIconPhoto = document.getElementById('userIconPhoto');
    const userIconSvg = document.getElementById('userIconSvg');
    const userProfilePhoto = currentUser && currentUser.profilePhoto ? currentUser.profilePhoto : null;
    if (userProfilePhoto && userIconPhoto && userIconSvg) {
        userIconPhoto.src = userProfilePhoto;
        userIconPhoto.style.display = 'block';
        userIconSvg.style.display = 'none';
    } else if (userIconPhoto && userIconSvg) {
        userIconPhoto.style.display = 'none';
        userIconSvg.style.display = 'block';
    }

    if (!currentUser || !currentUser.id) {
        return;
    }

    const rookieRedacteur = document.getElementById('rookieRedacteur');
    if (rookieRedacteur && currentUser.matricule && currentUser.fullName) {
        rookieRedacteur.textContent = `${currentUser.matricule} | ${currentUser.fullName}`;
    }

    const rookieSignature = document.getElementById('rookieSignature');
    if (rookieSignature && currentUser.matricule && currentUser.fullName) {
        rookieSignature.textContent = `${currentUser.matricule} | ${currentUser.fullName}`;
    }

    const firstLincolnRedacteur = document.getElementById('firstLincolnRedacteur');
    if (firstLincolnRedacteur && currentUser.matricule && currentUser.fullName) {
        firstLincolnRedacteur.textContent = `${currentUser.matricule} | ${currentUser.fullName}`;
    }

    const firstLincolnSignature = document.getElementById('firstLincolnSignature');
    if (firstLincolnSignature && currentUser.matricule && currentUser.fullName) {
        firstLincolnSignature.textContent = `${currentUser.matricule} | ${currentUser.fullName}`;
    }

    const incidentRedacteurNom = document.getElementById('incidentRedacteurNom');
    const incidentRedacteurMatricule = document.getElementById('incidentRedacteurMatricule');
    if (incidentRedacteurNom && currentUser.fullName) {
        incidentRedacteurNom.textContent = currentUser.fullName;
    }
    if (incidentRedacteurMatricule && currentUser.matricule) {
        incidentRedacteurMatricule.textContent = currentUser.matricule;
    }

    const arrestRedacteurNom = document.getElementById('arrestRedacteurNom');
    const arrestRedacteurMatricule = document.getElementById('arrestRedacteurMatricule');
    const arrestRedacteurTel = document.getElementById('arrestRedacteurTel');
    const arrestRedacteurMail = document.getElementById('arrestRedacteurMail');
    if (arrestRedacteurNom && currentUser.fullName) {
        arrestRedacteurNom.textContent = currentUser.fullName;
    }
    if (arrestRedacteurMatricule && currentUser.matricule) {
        arrestRedacteurMatricule.textContent = currentUser.matricule;
    }
    if (arrestRedacteurTel) {
        arrestRedacteurTel.textContent = currentUser.telephone || '';
    }
    if (arrestRedacteurMail) {
        const mail = currentUser.email || (currentUser.fullName || '')
            .toLowerCase()
            .normalize('NFD')
            .replace(/[\u0300-\u036f]/g, '')
            .replace(/\s+/g, '.')
            .replace(/[^a-z0-9.]/g, '') + (currentUser.department === 'LSPD' ? '@lspd.us' : currentUser.department === 'GOUV' ? '@gouv.us' : '@bcso.us');
        arrestRedacteurMail.textContent = mail;
    }

    const contravRedacteurNom = document.getElementById('contravRedacteurNom');
    const contravRedacteurMatricule = document.getElementById('contravRedacteurMatricule');
    const contravRedacteurTel = document.getElementById('contravRedacteurTel');
    const contravRedacteurMail = document.getElementById('contravRedacteurMail');
    if (contravRedacteurNom && currentUser.fullName) {
        contravRedacteurNom.textContent = currentUser.fullName;
    }
    if (contravRedacteurMatricule && currentUser.matricule) {
        contravRedacteurMatricule.textContent = currentUser.matricule;
    }
    if (contravRedacteurTel) {
        contravRedacteurTel.textContent = currentUser.telephone || '';
    }
    if (contravRedacteurMail) {
        const mail = currentUser.email || (currentUser.fullName || '')
            .toLowerCase()
            .normalize('NFD')
            .replace(/[\u0300-\u036f]/g, '')
            .replace(/\s+/g, '.')
            .replace(/[^a-z0-9.]/g, '') + (currentUser.department === 'LSPD' ? '@lspd.us' : currentUser.department === 'GOUV' ? '@gouv.us' : '@bcso.us');
        contravRedacteurMail.textContent = mail;
    }

    const plainteRedacteurNom = document.getElementById('plainteRedacteurNom');
    const plainteRedacteurMatricule = document.getElementById('plainteRedacteurMatricule');
    const plainteRedacteurTel = document.getElementById('plainteRedacteurTel');
    const plainteRedacteurMail = document.getElementById('plainteRedacteurMail');
    if (plainteRedacteurNom && currentUser.fullName) {
        plainteRedacteurNom.textContent = currentUser.fullName;
    }
    if (plainteRedacteurMatricule && currentUser.matricule) {
        plainteRedacteurMatricule.textContent = currentUser.matricule;
    }
    if (plainteRedacteurTel) {
        plainteRedacteurTel.textContent = currentUser.telephone || '';
    }
    if (plainteRedacteurMail) {
        const mail = currentUser.email || (currentUser.fullName || '')
            .toLowerCase()
            .normalize('NFD')
            .replace(/[\u0300-\u036f]/g, '')
            .replace(/\s+/g, '.')
            .replace(/[^a-z0-9.]/g, '') + (currentUser.department === 'LSPD' ? '@lspd.us' : currentUser.department === 'GOUV' ? '@gouv.us' : '@bcso.us');
        plainteRedacteurMail.textContent = mail;
    }

    const prenomNomInput = document.getElementById('prenomNomInput');
    if (prenomNomInput && currentUser.fullName) {
        prenomNomInput.value = currentUser.fullName;
    }

    const matriculeInput = document.getElementById('matriculeInput');
    if (matriculeInput && currentUser.matricule) {
        matriculeInput.value = currentUser.matricule;
    }

    const telephoneInput = document.getElementById('telephoneInput');
    if (telephoneInput) {
        telephoneInput.value = currentUser.telephone || '';
    }

    const ribInput = document.getElementById('ribInput');
    if (ribInput) {
        ribInput.value = currentUser.rib || '';
    }

    const discordInput = document.getElementById('discordInput');
    if (discordInput && currentUser.discordId) {
        discordInput.value = currentUser.discordId;
    }

    const divisionInput = document.getElementById('divisionInput');
    if (divisionInput) {
        divisionInput.value = currentUser.division || '';
    }

    const rangInput = document.getElementById('rangInput');
    if (rangInput) {
        const userRole = currentUser.role || 'BCSO';
        rangInput.value = userRole;
        console.log('Rang mis à jour dans les paramètres:', userRole, 'pour utilisateur:', currentUser.fullName);
    } else {
        console.warn('Champ rangInput non trouvé dans le DOM');
    }

    const profilePhotoImg = document.getElementById('profilePhotoImg');
    const profilePhotoPlaceholder = document.getElementById('profilePhotoPlaceholder');
    if (profilePhotoImg && profilePhotoPlaceholder) {
        if (currentUser.profilePhoto) {
            profilePhotoImg.src = currentUser.profilePhoto;
            profilePhotoImg.style.display = 'block';
            profilePhotoPlaceholder.style.display = 'none';
        } else {
            profilePhotoImg.style.display = 'none';
            profilePhotoPlaceholder.style.display = 'flex';
        }
    }
}

function applyRolePermissions() {
    if (!currentUser) return;

    const gestionCompteBtn = document.getElementById('gestionCompteBtn');
    if (gestionCompteBtn) {
        if (isBCSO_EM()) {
            gestionCompteBtn.style.display = 'block';
        } else {
            gestionCompteBtn.style.display = 'none';
        }
    }

    const gestionMDTBtn = document.getElementById('gestionMDTBtn');
    if (gestionMDTBtn) {
        if (isDevMDT()) {
            gestionMDTBtn.style.display = 'block';
        } else {
            gestionMDTBtn.style.display = 'none';
        }
    }

    const gestionInfractionsBtn = document.getElementById('gestionInfractionsBtn');
    if (gestionInfractionsBtn) {
        if (isDevMDT()) {
            gestionInfractionsBtn.style.display = 'block';
            gestionInfractionsBtn.addEventListener('click', function() {
                openGestionInfractionsModal();
            });
        } else {
            gestionInfractionsBtn.style.display = 'none';
        }
    }

    if (!hasPermission('upload_images') && !hasPermission('edit_images')) {
        const agentImageInput = document.getElementById('agentImageInput');
        const agentUploadBtn = document.querySelector('#agentImageContainer + .image-upload-controls .upload-btn');
        const agentRemoveBtn = document.getElementById('agentRemoveBtn');
        if (agentImageInput) agentImageInput.style.display = 'none';
        if (agentUploadBtn) agentUploadBtn.style.display = 'none';
        if (agentRemoveBtn) agentRemoveBtn.style.display = 'none';

        const eowImageInput = document.getElementById('eowImageInput');
        const eowUploadBtn = document.querySelector('#eowImageContainer + .image-upload-controls .upload-btn');
        const eowRemoveBtn = document.getElementById('eowRemoveBtn');
        if (eowImageInput) eowImageInput.style.display = 'none';
        if (eowUploadBtn) eowUploadBtn.style.display = 'none';
        if (eowRemoveBtn) eowRemoveBtn.style.display = 'none';

        const defconImageInput = document.getElementById('defconImageInput');
        const defconUploadBtn = document.querySelector('#defconImageContainer + .image-upload-controls .upload-btn');
        const defconRemoveBtn = document.getElementById('defconRemoveBtn');
        if (defconImageInput) defconImageInput.style.display = 'none';
        if (defconUploadBtn) defconUploadBtn.style.display = 'none';
        if (defconRemoveBtn) defconRemoveBtn.style.display = 'none';

        const mostWantedImageInput = document.getElementById('mostWantedImageInput');
        const mostWantedUploadBtn = document.querySelector('#mostWantedImageContainer + .image-upload-controls .upload-btn');
        const mostWantedRemoveBtn = document.getElementById('mostWantedRemoveBtn');
        if (mostWantedImageInput) mostWantedImageInput.style.display = 'none';
        if (mostWantedUploadBtn) mostWantedUploadBtn.style.display = 'none';
        if (mostWantedRemoveBtn) mostWantedRemoveBtn.style.display = 'none';

        const radioImageInput = document.getElementById('radioImageInput');
        const radioImagePlaceholder = document.getElementById('radioImagePlaceholder');
        const radioUploadBtn = document.querySelector('.radio-image-container .image-upload-controls .upload-btn');
        const radioRemoveBtn = document.getElementById('radioRemoveBtn');
        if (radioImageInput) radioImageInput.style.display = 'none';
        if (radioUploadBtn) radioUploadBtn.style.display = 'none';
        if (radioRemoveBtn) radioRemoveBtn.style.display = 'none';
        if (radioImagePlaceholder) {
            radioImagePlaceholder.style.pointerEvents = 'none';
            radioImagePlaceholder.style.cursor = 'default';
            radioImagePlaceholder.style.opacity = '0.6';
        }
    } else {
        const agentImageInput = document.getElementById('agentImageInput');
        const agentUploadBtn = document.querySelector('#agentImageContainer + .image-upload-controls .upload-btn');
        const agentRemoveBtn = document.getElementById('agentRemoveBtn');
        if (agentImageInput) agentImageInput.style.display = '';
        if (agentUploadBtn) agentUploadBtn.style.display = '';
        if (agentRemoveBtn && document.getElementById('agentImage')?.src && (hasPermission('edit_images') || hasPermission('upload_images'))) {
            agentRemoveBtn.style.display = '';
        }

        const eowImageInput = document.getElementById('eowImageInput');
        const eowUploadBtn = document.querySelector('#eowImageContainer + .image-upload-controls .upload-btn');
        const eowRemoveBtn = document.getElementById('eowRemoveBtn');
        if (eowImageInput) eowImageInput.style.display = '';
        if (eowUploadBtn) eowUploadBtn.style.display = '';
        if (eowRemoveBtn && document.getElementById('eowImage')?.src && (hasPermission('edit_images') || hasPermission('upload_images'))) {
            eowRemoveBtn.style.display = '';
        }

        const defconImageInput = document.getElementById('defconImageInput');
        const defconUploadBtn = document.querySelector('#defconImageContainer + .image-upload-controls .upload-btn');
        const defconRemoveBtn = document.getElementById('defconRemoveBtn');
        if (defconImageInput) defconImageInput.style.display = '';
        if (defconUploadBtn) defconUploadBtn.style.display = '';
        if (defconRemoveBtn && document.getElementById('defconImage')?.src && (hasPermission('edit_images') || hasPermission('upload_images'))) {
            defconRemoveBtn.style.display = '';
        }

        const mostWantedImageInput = document.getElementById('mostWantedImageInput');
        const mostWantedUploadBtn = document.querySelector('#mostWantedImageContainer + .image-upload-controls .upload-btn');
        const mostWantedRemoveBtn = document.getElementById('mostWantedRemoveBtn');
        if (mostWantedImageInput) mostWantedImageInput.style.display = '';
        if (mostWantedUploadBtn) mostWantedUploadBtn.style.display = '';
        if (mostWantedRemoveBtn && document.getElementById('mostWantedImage')?.src && (hasPermission('edit_images') || hasPermission('upload_images'))) {
            mostWantedRemoveBtn.style.display = '';
        }

        const radioImageInput = document.getElementById('radioImageInput');
        const radioImagePlaceholder = document.getElementById('radioImagePlaceholder');
        const radioUploadBtn = document.querySelector('.radio-image-container .image-upload-controls .upload-btn');
        const radioRemoveBtn = document.getElementById('radioRemoveBtn');
        if (radioImageInput) radioImageInput.style.display = '';
        if (radioUploadBtn) radioUploadBtn.style.display = '';
        if (radioImagePlaceholder) {
            radioImagePlaceholder.style.pointerEvents = 'auto';
            radioImagePlaceholder.style.cursor = 'pointer';
            radioImagePlaceholder.style.opacity = '1';
        }
        if (radioRemoveBtn && document.getElementById('radioImage')?.src && (hasPermission('edit_communication_radio') || hasPermission('edit_radio'))) {
            radioRemoveBtn.style.display = 'inline-block';
        }
    }

    if (!hasPermission('edit_radio') && !hasPermission('edit_communication_radio')) {
        const radioModal = document.getElementById('communicationRadioModal');
        if (radioModal) {
            const radioUploadBtns = radioModal.querySelectorAll('input[type="file"], .upload-btn, button[onclick*="upload"]');
            radioUploadBtns.forEach(btn => {
                if (btn) btn.style.display = 'none';
            });
        }
    }

    if (!hasPermission('delete_reports')) {
        document.querySelectorAll('.details-arrest-action.delete').forEach(btn => {
            btn.style.display = 'none';
        });
    }

    if (!hasPermission('edit_recensement')) {
        const detailsEditBtn = document.getElementById('detailsEditBtn');
        if (detailsEditBtn) {
            detailsEditBtn.style.display = 'none';
        }
        const detailsDeleteBtn = document.getElementById('detailsDeleteBtn');
        if (detailsDeleteBtn) {
            detailsDeleteBtn.style.display = 'none';
        }
    }

    setTimeout(() => {
        if (!hasPermission('delete_reports')) {
            document.querySelectorAll('.details-arrest-action.delete').forEach(btn => {
                btn.style.display = 'none';
            });
        }
        if (!hasPermission('edit_recensement')) {
            const detailsEditBtn = document.getElementById('detailsEditBtn');
            if (detailsEditBtn) {
                detailsEditBtn.style.display = 'none';
            }
            const detailsDeleteBtn = document.getElementById('detailsDeleteBtn');
            if (detailsDeleteBtn) {
                detailsDeleteBtn.style.display = 'none';
            }
        }
    }, 500);
}

document.addEventListener('DOMContentLoaded', () => {
    const logoutBtn = document.getElementById('logoutBtn');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', async () => {
            try {
                currentUser = null;

                if ('caches' in window) {
                    caches.keys().then(names => {
                        names.forEach(name => caches.delete(name));
                    });
                }

                const response = await fetch('/api/auth/logout', {
                    method: 'POST',
                    cache: 'no-store'
                });
                const data = await response.json();

                window.location.replace('/login.html');
            } catch (error) {
                console.error('Erreur lors de la déconnexion:', error);
                currentUser = null;
                window.location.replace('/login.html');
            }
        });
    }

    window.addEventListener('pageshow', function(event) {
        if (event.persisted) {
            checkAuth();
        }
    });

    window.addEventListener('load', function() {
        const currentPath = window.location.pathname;
        if (currentPath === '/' || currentPath.includes('index.html')) {
            checkAuth();
        }
    });

    const currentPath = window.location.pathname;
    if (currentPath === '/' || currentPath.includes('index.html')) {
        checkAuth().catch(err => {
            console.error('Erreur lors de la vérification d\'authentification:', err);
            currentUser = null;
            window.location.replace('/login.html');
        });
    }
});

function getUserDepartment() {
    if (!currentUser || !currentUser.department) {
        return 'BCSO';
    }
    return currentUser.department;
}

document.addEventListener('DOMContentLoaded', () => {
    const agentImageInput = document.getElementById('agentImageInput');
    const agentImage = document.getElementById('agentImage');
    const agentPlaceholder = document.getElementById('agentPlaceholder');
    const agentRemoveBtn = document.getElementById('agentRemoveBtn');

    if (agentImageInput && agentImage && agentPlaceholder && agentRemoveBtn) {
        agentImageInput.addEventListener('change', async function(e) {
            const file = e.target.files[0];
            if (file) {
                const reader = new FileReader();
                reader.onload = async function(event) {
                    const base64Data = event.target.result;
                                        const imageUrl = await uploadImageBase64(base64Data);
            if (!dataStore.settings) {
                dataStore.settings = { bcso: {}, lspd: {}, gouv: {} };
            }
                                        if (!dataStore.settings.bcso) dataStore.settings.bcso = {};
                    if (!dataStore.settings.lspd) dataStore.settings.lspd = {};
                    if (!dataStore.settings.gouv) dataStore.settings.gouv = {};
                    const department = getUserDepartment().toLowerCase();
                    if (!dataStore.settings[department]) dataStore.settings[department] = {};
                    dataStore.settings[department].agentImage = imageUrl;
                    await saveData();
                    agentImage.src = imageUrl;
                    agentImage.style.display = 'block';
                    agentPlaceholder.style.display = 'none';
                    if (hasPermission('edit_images') || hasPermission('upload_images')) {
                        agentRemoveBtn.style.display = 'inline-block';
                    }
                };
                reader.readAsDataURL(file);
            }
        });

        window.removeAgentImage = async function() {
            if (!hasPermission('edit_images') && !hasPermission('upload_images')) {
                return;
            }
            
            if (!dataStore.settings) {
                dataStore.settings = { bcso: {}, lspd: {}, gouv: {} };
            }
            if (!dataStore.settings.bcso) dataStore.settings.bcso = {};
            if (!dataStore.settings.lspd) dataStore.settings.lspd = {};
            if (!dataStore.settings.gouv) dataStore.settings.gouv = {};
            
            const department = getUserDepartment().toLowerCase();
            if (!dataStore.settings[department]) {
                dataStore.settings[department] = {};
            }
            
            delete dataStore.settings[department].agentImage;
            
            
            agentImage.src = '';
            agentImage.style.display = 'none';
            agentPlaceholder.style.display = 'flex';
            agentRemoveBtn.style.display = 'none';
            agentImageInput.value = '';
            
            await saveData();
        };
    }
});

const eowImageInput = document.getElementById('eowImageInput');
const eowImage = document.getElementById('eowImage');
const eowPlaceholder = document.getElementById('eowPlaceholder');
const eowRemoveBtn = document.getElementById('eowRemoveBtn');

eowImageInput.addEventListener('change', async function(e) {
    const file = e.target.files[0];
    if (file) {
        const reader = new FileReader();
        reader.onload = async function(event) {
            const base64Data = event.target.result;
            const imageUrl = await uploadImageBase64(base64Data);
            if (!dataStore.settings) {
                dataStore.settings = { bcso: {}, lspd: {}, gouv: {} };
            }
            if (!dataStore.settings.bcso) dataStore.settings.bcso = {};
            if (!dataStore.settings.lspd) dataStore.settings.lspd = {};
            if (!dataStore.settings.gouv) dataStore.settings.gouv = {};
            const department = getUserDepartment().toLowerCase();
            if (!dataStore.settings[department]) dataStore.settings[department] = {};
            dataStore.settings[department].eowImage = imageUrl;
            await saveData();
            eowImage.src = imageUrl;
            eowImage.style.display = 'block';
            eowPlaceholder.style.display = 'none';
            if (hasPermission('edit_images') || hasPermission('upload_images')) {
                eowRemoveBtn.style.display = 'inline-block';
            }
        };
        reader.readAsDataURL(file);
    }
});

async function removeEowImage() {
    if (!hasPermission('edit_images') && !hasPermission('upload_images')) {
        return;
    }
    
    if (!dataStore.settings) {
        dataStore.settings = { bcso: {}, lspd: {}, gouv: {} };
    }
    if (!dataStore.settings.bcso) dataStore.settings.bcso = {};
    if (!dataStore.settings.lspd) dataStore.settings.lspd = {};
    if (!dataStore.settings.gouv) dataStore.settings.gouv = {};
    
    const department = getUserDepartment().toLowerCase();
    if (!dataStore.settings[department]) {
        dataStore.settings[department] = {};
    }
    
            delete dataStore.settings[department].eowImage;
            
            
            eowImage.src = '';
            eowImage.style.display = 'none';
            eowPlaceholder.style.display = 'flex';
            eowRemoveBtn.style.display = 'none';
            eowImageInput.value = '';
            
            await saveData();
}

const defconImageInput = document.getElementById('defconImageInput');
const defconImage = document.getElementById('defconImage');
const defconPlaceholder = document.getElementById('defconPlaceholder');
const defconImageContainer = document.getElementById('defconImageContainer');
const defconRemoveBtn = document.getElementById('defconRemoveBtn');

defconImageInput.addEventListener('change', async function(e) {
    const file = e.target.files[0];
    if (file) {
        const reader = new FileReader();
        reader.onload = async function(event) {
            const base64Data = event.target.result;
            const imageUrl = await uploadImageBase64(base64Data);
            if (!dataStore.settings) {
                dataStore.settings = { bcso: {}, lspd: {}, gouv: {} };
            }
            if (!dataStore.settings.bcso) dataStore.settings.bcso = {};
            if (!dataStore.settings.lspd) dataStore.settings.lspd = {};
            if (!dataStore.settings.gouv) dataStore.settings.gouv = {};
            const department = getUserDepartment().toLowerCase();
            if (!dataStore.settings[department]) dataStore.settings[department] = {};
            dataStore.settings[department].defconImage = imageUrl;
            await saveData();
            defconImage.src = imageUrl;
            defconImage.style.display = 'block';
            defconPlaceholder.style.display = 'none';
            if (hasPermission('edit_images') || hasPermission('upload_images')) {
                defconRemoveBtn.style.display = 'inline-block';
            }
        };
        reader.readAsDataURL(file);
    }
});

async function removeDefconImage() {
    if (!hasPermission('edit_images') && !hasPermission('upload_images')) {
        return;
    }
    
    if (!dataStore.settings) {
        dataStore.settings = { bcso: {}, lspd: {}, gouv: {} };
    }
    if (!dataStore.settings.bcso) dataStore.settings.bcso = {};
    if (!dataStore.settings.lspd) dataStore.settings.lspd = {};
    if (!dataStore.settings.gouv) dataStore.settings.gouv = {};
    
    const department = getUserDepartment().toLowerCase();
    if (!dataStore.settings[department]) {
        dataStore.settings[department] = {};
    }
    
            delete dataStore.settings[department].defconImage;
            
            
            defconImage.src = '';
            defconImage.style.display = 'none';
            defconPlaceholder.style.display = 'flex';
            defconRemoveBtn.style.display = 'none';
            defconImageInput.value = '';
            
            await saveData();
}

const mostWantedImageInput = document.getElementById('mostWantedImageInput');
const mostWantedImage = document.getElementById('mostWantedImage');
const mostWantedPlaceholder = document.getElementById('mostWantedPlaceholder');
const mostWantedRemoveBtn = document.getElementById('mostWantedRemoveBtn');

mostWantedImageInput.addEventListener('change', async function(e) {
    const file = e.target.files[0];
    if (file) {
        const reader = new FileReader();
        reader.onload = async function(event) {
            const base64Data = event.target.result;
            const imageUrl = await uploadImageBase64(base64Data);
            if (!dataStore.settings) {
                dataStore.settings = { bcso: {}, lspd: {}, gouv: {} };
            }
            if (!dataStore.settings.bcso) dataStore.settings.bcso = {};
            if (!dataStore.settings.lspd) dataStore.settings.lspd = {};
            if (!dataStore.settings.gouv) dataStore.settings.gouv = {};
            const department = getUserDepartment().toLowerCase();
            if (!dataStore.settings[department]) dataStore.settings[department] = {};
            dataStore.settings[department].mostWantedImage = imageUrl;
            await saveData();
            mostWantedImage.src = imageUrl;
            mostWantedImage.style.display = 'block';
            mostWantedPlaceholder.style.display = 'none';
            if (hasPermission('edit_images') || hasPermission('upload_images')) {
                mostWantedRemoveBtn.style.display = 'inline-block';
            }
        };
        reader.readAsDataURL(file);
    }
});

async function removeMostWantedImage() {
    if (!hasPermission('edit_images') && !hasPermission('upload_images')) {
        return;
    }
    
    if (!dataStore.settings) {
        dataStore.settings = { bcso: {}, lspd: {}, gouv: {} };
    }
    if (!dataStore.settings.bcso) dataStore.settings.bcso = {};
    if (!dataStore.settings.lspd) dataStore.settings.lspd = {};
    if (!dataStore.settings.gouv) dataStore.settings.gouv = {};
    
    const department = getUserDepartment().toLowerCase();
    if (!dataStore.settings[department]) {
        dataStore.settings[department] = {};
    }
    
            delete dataStore.settings[department].mostWantedImage;
            
            
            mostWantedImage.src = '';
            mostWantedImage.style.display = 'none';
            mostWantedPlaceholder.style.display = 'flex';
            mostWantedRemoveBtn.style.display = 'none';
            mostWantedImageInput.value = '';
            
            await saveData();
}

document.addEventListener('DOMContentLoaded', () => {
    const recensementBtn = document.getElementById('recensementBtn');
    const recensementModal = document.getElementById('recensementModal');

    if (recensementBtn && recensementModal) {
        recensementBtn.addEventListener('click', function() {
                        delete window.__currentEditingRecensementId;
            const modalTitle = document.querySelector('.modal-title');
            if (modalTitle) modalTitle.textContent = 'NOUVEAU RECENSEMENT';
            
            const modalNumber = document.querySelector('#recensementModal .modal-number');
            if (modalNumber) {
                const nextNum = getNextRecensementNumber();
                modalNumber.textContent = `N°${nextNum}`;
            }
            
            recensementModal.style.display = 'flex';
        });

                recensementModal.addEventListener('click', function(e) {
            if (e.target === recensementModal) {
                closeRecensementModal();
            }
        });
    }
});

function closeRecensementModal() {
    const recensementModal = document.getElementById('recensementModal');
    if (recensementModal) {
        recensementModal.style.display = 'none';
        delete window.__currentEditingRecensementId;
                const modalTitle = document.querySelector('.modal-title');
        if (modalTitle) modalTitle.textContent = 'NOUVEAU RECENSEMENT';
    }
}

const photoInput = document.getElementById('photoInput');
const photoPreview = document.getElementById('photoPreview');
const photoPlaceholder = document.getElementById('photoPlaceholder');

if (photoInput) {
    photoInput.addEventListener('change', function(e) {
        const file = e.target.files[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = function(event) {
                const preview = document.getElementById('photoPreview');
                const placeholder = document.getElementById('photoPlaceholder');
                if (preview && placeholder) {
                    preview.src = event.target.result;
                    preview.style.display = 'block';
                    preview.style.visibility = 'visible';
                    preview.style.opacity = '1';
                    placeholder.style.display = 'none';
                }
            };
            reader.readAsDataURL(file);
        }
    });
}

const proceduresBtn = document.getElementById('proceduresBtn');
const proceduresModal = document.getElementById('proceduresModal');

if (proceduresBtn) {
    proceduresBtn.addEventListener('click', function() {
        proceduresModal.style.display = 'flex';
    });
}

function closeProceduresModal() {
    proceduresModal.style.display = 'none';
}

if (proceduresModal) {
    proceduresModal.addEventListener('click', function(e) {
        if (e.target === proceduresModal) {
            closeProceduresModal();
        }
    });
}

const rechercheRapportsBtn = document.getElementById('rechercheRapportsBtn');
const listingPoliceModal = document.getElementById('listingPoliceModal');

if (rechercheRapportsBtn) {
    rechercheRapportsBtn.addEventListener('click', function() {
        listingPoliceModal.style.display = 'flex';
    });
}

function closeListingPoliceModal() {
    listingPoliceModal.style.display = 'none';
}

if (listingPoliceModal) {
    listingPoliceModal.addEventListener('click', function(e) {
        if (e.target === listingPoliceModal) {
            closeListingPoliceModal();
        }
    });
}

const listingArrestationBtn = document.getElementById('listingArrestationBtn');
const listingContraventionBtn = document.getElementById('listingContraventionBtn');
const listingPlainteBtn = document.getElementById('listingPlainteBtn');
const listingIncidentBtn = document.getElementById('listingIncidentBtn');

if (listingArrestationBtn) {
    listingArrestationBtn.addEventListener('click', function() {
        closeListingPoliceModal();
        currentSearchType = 'arrestation';
        openRechercheAgentModal();
    });
}

if (listingContraventionBtn) {
    listingContraventionBtn.addEventListener('click', function() {
        closeListingPoliceModal();
        currentSearchType = 'contravention';
        openRechercheAgentModal();
    });
}

if (listingPlainteBtn) {
    listingPlainteBtn.addEventListener('click', function() {
        closeListingPoliceModal();
        currentSearchType = 'plainte';
        openRechercheAgentModal();
    });
}

if (listingIncidentBtn) {
    listingIncidentBtn.addEventListener('click', function() {
        closeListingPoliceModal();
        currentSearchType = 'incident';
        openRechercheAgentModal();
    });
}

const listingFirstLincolnBtn = document.getElementById('listingFirstLincolnBtn');
if (listingFirstLincolnBtn) {
    listingFirstLincolnBtn.addEventListener('click', function() {
        closeListingPoliceModal();
        currentSearchType = 'firstLincoln';
        openRechercheAgentModal();
    });
}

const rechercheAgentModal = document.getElementById('rechercheAgentModal');
const rechercheAgentNom = document.getElementById('rechercheAgentNom');
const rechercheAgentDateDebut = document.getElementById('rechercheAgentDateDebut');
const rechercheAgentDateFin = document.getElementById('rechercheAgentDateFin');
const rechercheAgentBtn = document.getElementById('rechercheAgentBtn');
const rechercheAgentResults = document.getElementById('rechercheAgentResults');
const rechercheAgentTitle = document.querySelector('.recherche-agent-title');

async function getAllAgents() {
    try {
        const response = await fetch('/api/auth/users/approved');
        const data = await response.json();

        if (data.success && data.users) {
                        return data.users.map(user => `${user.matricule} | ${user.fullName}`);
        }

        return [];
    } catch (error) {
        console.error('Erreur lors de la récupération des agents:', error);
        return [];
    }
}

function openRechercheAgentModal() {
    if (!rechercheAgentModal) return;

        if (rechercheAgentTitle) {
        const titles = {
            'arrestation': 'ARRESTATION',
            'contravention': 'CONTRAVENTION',
            'plainte': 'PLAINTE',
            'incident': 'INCIDENT',
            'firstLincoln': 'FIRST LINCOLN'
        };
        rechercheAgentTitle.textContent = titles[currentSearchType] || 'ARRESTATION';
    }

    if (rechercheAgentNom) {
        rechercheAgentNom.innerHTML = '<option value="">-- Chargement... --</option>';
        getAllAgents().then(agents => {
            rechercheAgentNom.innerHTML = '<option value="">-- Sélectionner un agent --</option>';
            agents.forEach(agent => {
                const option = document.createElement('option');
                option.value = agent;
                option.textContent = agent;
                rechercheAgentNom.appendChild(option);
            });
            rechercheAgentNom.value = '';
        }).catch(err => {
            console.error('Erreur lors du chargement des agents:', err);
            rechercheAgentNom.innerHTML = '<option value="">-- Erreur de chargement --</option>';
        });
    }

        if (rechercheAgentDateDebut) rechercheAgentDateDebut.value = '';
    if (rechercheAgentDateFin) rechercheAgentDateFin.value = '';
    if (rechercheAgentResults) rechercheAgentResults.innerHTML = '';

    rechercheAgentModal.style.display = 'flex';
}

function closeRechercheAgentModal() {
    if (rechercheAgentModal) rechercheAgentModal.style.display = 'none';
}

if (rechercheAgentModal) {
    rechercheAgentModal.addEventListener('click', function(e) {
        if (e.target === rechercheAgentModal) closeRechercheAgentModal();
    });
}

async function searchAgentReports() {
    ensureDataStoreInitialized();
    
    if (currentUser && currentUser.department) {
        try {
            await loadFromSharedFile();
        } catch (e) {
            console.error('Erreur lors du rechargement des données:', e);
        }
    }
    
    const agentNom = rechercheAgentNom?.value.trim();
    if (!agentNom) {
        alert('Veuillez sélectionner un agent');
        return;
    }
    const agentNomLower = agentNom.toLowerCase();

    const dateDebut = rechercheAgentDateDebut?.value || '';
    const dateFin = rechercheAgentDateFin?.value || '';

    let results = [];

        if (currentSearchType === 'arrestation') {
        Object.keys(dataStore.arrests || {}).forEach(recId => {
            (dataStore.arrests[recId] || []).forEach(arrest => {
                                const createur = (arrest.createur || '').toLowerCase();
                const officiers = (arrest.officiers || '').toLowerCase();
                const corps = (arrest.corps || '').toLowerCase();

                if (createur.includes(agentNomLower) || officiers.includes(agentNomLower) || corps.includes(agentNomLower)) {
                    const reportDate = arrest.date || '';
                    if (isDateInRange(reportDate, dateDebut, dateFin)) {
                        results.push({
                            type: 'arrestation',
                            data: arrest,
                            recensementId: recId
                        });
                    }
                }
            });
        });
    } else if (currentSearchType === 'contravention') {
        Object.keys(dataStore.contraventions || {}).forEach(recId => {
            (dataStore.contraventions[recId] || []).forEach(contrav => {
                const createur = (contrav.createur || '').toLowerCase();
                const patrouille = (contrav.corps?.patrouille || '').toLowerCase();
                const corps = (contrav.corps?.texte || '').toLowerCase();

                if (createur.includes(agentNomLower) || patrouille.includes(agentNomLower) || corps.includes(agentNomLower)) {
                    const reportDate = contrav.date || '';
                    if (isDateInRange(reportDate, dateDebut, dateFin)) {
                        results.push({
                            type: 'contravention',
                            data: contrav,
                            recensementId: recId
                        });
                    }
                }
            });
        });
    } else if (currentSearchType === 'plainte') {
        Object.keys(dataStore.plaintes || {}).forEach(recId => {
            (dataStore.plaintes[recId] || []).forEach(plainte => {
                const createur = (plainte.createur || '').toLowerCase();
                const corps = (plainte.corps || '').toLowerCase();

                if (createur.includes(agentNomLower) || corps.includes(agentNomLower)) {
                    const reportDate = plainte.dateRedaction || plainte.dateIncident || '';
                    if (isDateInRange(reportDate, dateDebut, dateFin)) {
                        results.push({
                            type: 'plainte',
                            data: plainte,
                            recensementId: recId
                        });
                    }
                }
            });
        });
    } else if (currentSearchType === 'incident') {
        const incidents = dataStore.incidents || [];
        
        incidents.forEach(incident => {
            let redacteurObj = null;
            if (incident.redacteur) {
                if (typeof incident.redacteur === 'string') {
                    try {
                        redacteurObj = JSON.parse(incident.redacteur);
                    } catch (e) {
                        redacteurObj = { fullName: incident.redacteur, matricule: '' };
                    }
                } else {
                    redacteurObj = incident.redacteur;
                }
            }
            
            const redacteurMatricule = redacteurObj?.matricule || '';
            const redacteurNom = redacteurObj?.fullName || redacteurObj?.nom || '';
            const redacteurFull = redacteurObj ? `${redacteurMatricule} | ${redacteurNom}`.trim() : '';
            const createur = redacteurFull.toLowerCase();
            const officiers = String(incident.officiersImpliques || '').toLowerCase();
            const corps = String(incident.corps || '').toLowerCase();
            const titre = String(incident.titre || '').toLowerCase();
            const type = String(incident.type || '').toLowerCase();

            const searchInFields = createur + ' ' + officiers + ' ' + corps + ' ' + titre + ' ' + type;
            const matches = searchInFields.includes(agentNomLower);

            if (matches) {
                const reportDate = incident.dateIncident || incident.dateRedaction || '';
                if (isDateInRange(reportDate, dateDebut, dateFin)) {
                    results.push({
                        type: 'incident',
                        data: incident,
                        recensementId: null
                    });
                }
            }
        });
    } else if (currentSearchType === 'firstLincoln') {
        const firstLincolnReports = dataStore.firstLincolnReports || [];
        
        firstLincolnReports.forEach(firstLincoln => {
            let redacteurFull = '';
            if (firstLincoln.redacteur) {
                if (typeof firstLincoln.redacteur === 'string') {
                    redacteurFull = firstLincoln.redacteur.replace(/\n/g, ' ').replace(/\r/g, '');
                } else {
                    redacteurFull = String(firstLincoln.redacteur);
                }
            }
            
            const createur = redacteurFull.toLowerCase();
            const officiers = String(firstLincoln.officiersImpliques || '').toLowerCase();
            const nom = String(firstLincoln.nom || '').toLowerCase();
            const matricule = String(firstLincoln.matricule || '').toLowerCase();
            const commentaire = String(firstLincoln.commentaire || '').toLowerCase();
            const numero = String(firstLincoln.numero || '').toLowerCase();

            const searchFields = createur + ' ' + officiers + ' ' + nom + ' ' + matricule + ' ' + commentaire + ' ' + numero;
            const matches = searchFields.includes(agentNomLower);

            if (matches) {
                const reportDate = firstLincoln.dateRedaction || '';
                if (isDateInRange(reportDate, dateDebut, dateFin)) {
                    results.push({
                        type: 'firstLincoln',
                        data: firstLincoln,
                        recensementId: null
                    });
                }
            }
        });
    } else if (currentSearchType === 'procedure' || currentSearchType === 'rookie') {
        (dataStore.rookieReports || []).forEach(rookie => {
            const redacteurFull = rookie.redacteur ? `${rookie.redacteur.matricule} | ${rookie.redacteur.nom}` : '';
            const createur = redacteurFull.toLowerCase();
            const officiers = (rookie.officiersImpliques || '').toLowerCase();
            const corps = (rookie.corps || '').toLowerCase();
            const commentaire = (rookie.commentaire || '').toLowerCase();

            if (createur.includes(agentNomLower) || officiers.includes(agentNomLower) || corps.includes(agentNomLower) || commentaire.includes(agentNomLower)) {
                const reportDate = rookie.dateRedaction || '';
                if (isDateInRange(reportDate, dateDebut, dateFin)) {
                    results.push({
                        type: 'rookie',
                        data: rookie,
                        recensementId: null
                    });
                }
            }
        });
    }

        displaySearchResults(results);
}

function isDateInRange(dateStr, dateDebut, dateFin) {
    if (!dateStr) return true;     
        let reportDate = dateStr;
    if (reportDate.includes('/')) {
                const parts = reportDate.split('/');
        if (parts.length === 3) {
            const year = parts[2].length === 2 ? '20' + parts[2] : parts[2];
            reportDate = `${year}-${parts[1].padStart(2, '0')}-${parts[0].padStart(2, '0')}`;
        }
    }

        if (!dateDebut && !dateFin) return true;

        if (dateDebut && reportDate < dateDebut) return false;
    if (dateFin && reportDate > dateFin) return false;

    return true;
}

function displaySearchResults(results) {
    if (!rechercheAgentResults) return;

    if (results.length === 0) {
        rechercheAgentResults.innerHTML = '<div class="recherche-agent-result-item"><div class="recherche-agent-result-info">Aucun résultat trouvé</div></div>';
        return;
    }

    rechercheAgentResults.innerHTML = results.map(result => {
        const r = result.data;
        const numero = r.numero || '-';
        const date = r.date || r.dateRedaction || r.dateIncident || '-';
        const heure = r.heure || r.heureRedaction || r.heureIncident || '';
        
        let createur = r.createur || '-';
        if (result.type === 'incident' && r.redacteur) {
            let redacteurObj = null;
            if (typeof r.redacteur === 'string') {
                try {
                    redacteurObj = JSON.parse(r.redacteur);
                } catch (e) {
                    redacteurObj = { fullName: r.redacteur, matricule: '' };
                }
            } else {
                redacteurObj = r.redacteur;
            }
            if (redacteurObj) {
                const matricule = redacteurObj.matricule || '';
                const nom = redacteurObj.fullName || redacteurObj.nom || '';
                createur = nom ? `${matricule} | ${nom}` : (matricule || nom || '-');
            }
        } else if (r.redacteur && typeof r.redacteur === 'object') {
            createur = r.redacteur.nom || r.redacteur.fullName ? `${r.redacteur.matricule || ''} | ${r.redacteur.nom || r.redacteur.fullName || ''}` : '-';
        }
        
        const status = r.status || 'Enregistré';

        let officiersInfo = '';
        if (result.type === 'arrestation' && r.officiers) {
            officiersInfo = `<div class="recherche-agent-result-info">Agent(s) Présent(s): ${r.officiers}</div>`;
        } else if (result.type === 'contravention' && r.corps?.patrouille) {
            officiersInfo = `<div class="recherche-agent-result-info">Patrouille: ${r.corps.patrouille}</div>`;
        } else if (result.type === 'incident' && r.officiersImpliques) {
            officiersInfo = `<div class="recherche-agent-result-info">Officier(s) impliqué(s): ${r.officiersImpliques}</div>`;
        } else if (result.type === 'firstLincoln' && r.officiersImpliques) {
            officiersInfo = `<div class="recherche-agent-result-info">Officier(s) impliqué(s): ${r.officiersImpliques}</div>`;
        } else if (result.type === 'rookie' && r.officiersImpliques) {
            officiersInfo = `<div class="recherche-agent-result-info">Officier(s) impliqué(s): ${r.officiersImpliques}</div>`;
        }

        const labelNum = result.type === 'arrestation' ? 'Numéro de dossier' : 
                        result.type === 'contravention' ? 'Dossier' : 
                        result.type === 'plainte' ? 'Plainte' : 
                        result.type === 'firstLincoln' ? 'First Lincoln' : 
                        result.type === 'rookie' ? 'Procédure' : 
                        result.type === 'incident' ? 'Rapport d\'Incident' : 'Rapport';

        return `
            <div class="recherche-agent-result-item">
                <div class="recherche-agent-result-header">
                    <span class="recherche-agent-result-number">${labelNum} : ${numero}</span>
                    <div class="recherche-agent-result-actions">
                        <button class="recherche-agent-result-action view" onclick="viewSearchResult('${result.type}', '${r.id}', '${result.recensementId || ''}')" title="Voir">👁</button>
                    </div>
                </div>
                <div class="recherche-agent-result-info">Date${result.type === 'arrestation' ? ' de l\'arrestation' : result.type === 'plainte' ? ' de rédaction' : ''} : ${date}</div>
                ${heure ? `<div class="recherche-agent-result-info">Heure${result.type === 'arrestation' ? ' de l\'arrestation' : ''} : ${heure}</div>` : ''}
                <div class="recherche-agent-result-info">Créer par : ${createur}</div>
                ${officiersInfo}
                <div class="recherche-agent-result-status">${status}</div>
            </div>
        `;
    }).join('');
}

function viewSearchResult(type, id, recensementId) {
    if (type === 'arrestation' && recensementId) {
        viewArrest(id, recensementId);
    } else if (type === 'contravention' && recensementId) {
        viewContravention(id, recensementId);
    } else if (type === 'plainte' && recensementId) {
        viewPlainte(id, recensementId);
    } else if (type === 'incident') {
        viewIncident(id);
    } else if (type === 'firstLincoln') {
        viewFirstLincoln(id);
    } else if (type === 'rookie') {
        viewRookie(id);
    }
    closeRechercheAgentModal();
}

function viewIncident(incidentId) {
    window.location.href = `view-report.html?type=incident&id=${incidentId}`;
}

function viewFirstLincoln(firstLincolnId) {
    window.location.href = `view-report.html?type=firstLincoln&id=${firstLincolnId}`;
}

function viewRookie(rookieId) {
    window.location.href = `view-report.html?type=rookie&id=${rookieId}`;
}

if (rechercheAgentBtn) {
    rechercheAgentBtn.addEventListener('click', searchAgentReports);
}

const loadDataBtn = document.getElementById('loadDataBtn');
const saveDataBtn = document.getElementById('saveDataBtn');

if (loadDataBtn) {
    loadDataBtn.addEventListener('click', async function() {
        const handle = await loadDataFromFile();
        if (handle) currentFileHandle = handle;
                location.reload();     });
}

if (saveDataBtn) {
    saveDataBtn.addEventListener('click', async function() {
        const handle = await saveDataToFile(currentFileHandle);
        if (handle) currentFileHandle = handle;
    });
}

const droitMirandaBtn = document.getElementById('droitMirandaBtn');
const mirandaModal = document.getElementById('mirandaModal');

if (droitMirandaBtn) {
    droitMirandaBtn.addEventListener('click', function() {
        closeProceduresModal();
        mirandaModal.style.display = 'flex';
    });
}

function closeMirandaModal() {
    mirandaModal.style.display = 'none';
}

if (mirandaModal) {
    mirandaModal.addEventListener('click', function(e) {
        if (e.target === mirandaModal) {
            closeMirandaModal();
        }
    });
}

const palpationFouilleBtn = document.getElementById('palpationFouilleBtn');
const palpationFouilleModal = document.getElementById('palpationFouilleModal');

if (palpationFouilleBtn) {
    palpationFouilleBtn.addEventListener('click', function() {
        closeProceduresModal();
        palpationFouilleModal.style.display = 'flex';
    });
}

function closePalpationFouilleModal() {
    palpationFouilleModal.style.display = 'none';
}

if (palpationFouilleModal) {
    palpationFouilleModal.addEventListener('click', function(e) {
        if (e.target === palpationFouilleModal) {
            closePalpationFouilleModal();
        }
    });
}

const controleRoutierBtn = document.getElementById('controleRoutierBtn');
const controleRoutierModal = document.getElementById('controleRoutierModal');

if (controleRoutierBtn) {
    controleRoutierBtn.addEventListener('click', function() {
        closeProceduresModal();
        controleRoutierModal.style.display = 'flex';
    });
}

function closeControleRoutierModal() {
    controleRoutierModal.style.display = 'none';
}

if (controleRoutierModal) {
    controleRoutierModal.addEventListener('click', function(e) {
        if (e.target === controleRoutierModal) {
            closeControleRoutierModal();
        }
    });
}

const coursePoursuiteBtn = document.getElementById('coursePoursuiteBtn');
const coursePoursuiteModal = document.getElementById('coursePoursuiteModal');

if (coursePoursuiteBtn) {
    coursePoursuiteBtn.addEventListener('click', function() {
        closeProceduresModal();
        coursePoursuiteModal.style.display = 'flex';
    });
}

function closeCoursePoursuiteModal() {
    coursePoursuiteModal.style.display = 'none';
}

if (coursePoursuiteModal) {
    coursePoursuiteModal.addEventListener('click', function(e) {
        if (e.target === coursePoursuiteModal) {
            closeCoursePoursuiteModal();
        }
    });
}

const triangulationBtn = document.getElementById('triangulationBtn');
const triangulationModal = document.getElementById('triangulationModal');

if (triangulationBtn) {
    triangulationBtn.addEventListener('click', function() {
        closeProceduresModal();
        triangulationModal.style.display = 'flex';
    });
}

function closeTriangulationModal() {
    triangulationModal.style.display = 'none';
}

if (triangulationModal) {
    triangulationModal.addEventListener('click', function(e) {
        if (e.target === triangulationModal) {
            closeTriangulationModal();
        }
    });
}

const gestionCompteBtn = document.getElementById('gestionCompteBtn');
const gestionCompteModal = document.getElementById('gestionCompteModal');
let allUsersData = [];

if (gestionCompteBtn) {
    gestionCompteBtn.addEventListener('click', function() {
        openGestionCompteModal();
    });
}

const gestionMDTBtn = document.getElementById('gestionMDTBtn');
const gestionMDTModal = document.getElementById('gestionMDTModal');
let allMDTUsersData = [];

if (gestionMDTBtn) {
    gestionMDTBtn.addEventListener('click', function() {
        openGestionMDTModal();
    });
}

function closeGestionCompteModal() {
    if (gestionCompteModal) {
        gestionCompteModal.style.display = 'none';
    }
}

if (gestionCompteModal) {
    gestionCompteModal.addEventListener('click', function(e) {
        if (e.target === gestionCompteModal) {
            closeGestionCompteModal();
        }
    });
}

async function openGestionCompteModal() {
    if (!gestionCompteModal) return;
    
    gestionCompteModal.style.display = 'flex';
    const usersList = document.getElementById('gestionCompteUsersList');
    if (usersList) {
        usersList.innerHTML = '<div class="gestion-compte-loading">Chargement...</div>';
    }
    
    const statusFilter = document.getElementById('gestionCompteStatusFilter');
    if (statusFilter) {
        statusFilter.value = 'all';
    }
    const searchInput = document.getElementById('gestionCompteSearchInput');
    if (searchInput) {
        searchInput.value = '';
    }
    
    try {
        const response = await fetch('/api/auth/em/users');
        if (!response.ok) {
            throw new Error('Erreur HTTP: ' + response.status);
        }
        const data = await response.json();
        
        if (data.success && data.users) {
            allUsersData = data.users;
            console.log('Utilisateurs chargés:', allUsersData.length, 'statuts:', [...new Set(allUsersData.map(u => u.status))]);
            filterGestionCompteUsers();
        } else {
            if (usersList) {
                usersList.innerHTML = '<div class="gestion-compte-loading">Erreur lors du chargement des utilisateurs</div>';
            }
        }
    } catch (error) {
        console.error('Erreur lors du chargement des utilisateurs:', error);
        if (usersList) {
            usersList.innerHTML = '<div class="gestion-compte-loading">Erreur lors du chargement des utilisateurs</div>';
        }
    }
}

function renderGestionCompteUsers(users) {
    const usersList = document.getElementById('gestionCompteUsersList');
    if (!usersList) return;
    
    if (users.length === 0) {
        usersList.innerHTML = '<div class="gestion-compte-loading">Aucun utilisateur trouvé</div>';
        return;
    }
    
    usersList.innerHTML = users.map(user => {
        const createdAt = user.createdAt ? new Date(user.createdAt).toLocaleDateString('fr-FR', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric'
        }) : '-';
        const createdAtTime = user.createdAt ? new Date(user.createdAt).toLocaleTimeString('fr-FR', {
            hour: '2-digit',
            minute: '2-digit'
        }) : '';
        const photoUrl = user.profilePhoto || '';
        const photoHtml = photoUrl ? `<img src="${photoUrl}" class="gestion-compte-user-photo" alt="Photo">` : 
            `<div class="gestion-compte-user-photo" style="background: rgba(184, 134, 11, 0.3); display: flex; align-items: center; justify-content: center; color: rgba(255, 255, 255, 0.5);">
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="width: 30px; height: 30px;">
                    <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
                    <circle cx="12" cy="7" r="4"></circle>
                </svg>
            </div>`;
        
        return `
            <div class="gestion-compte-user-card">
                <div class="gestion-compte-user-header">
                    ${photoHtml}
                    <div class="gestion-compte-user-info">
                        <div class="gestion-compte-user-id-name">${user.matricule || 'N/A'} | ${user.fullName || 'N/A'}</div>
                        <div class="gestion-compte-user-email">${user.email || 'N/A'}</div>
                    </div>
                </div>
                <div class="gestion-compte-user-details">
                    <div class="gestion-compte-user-detail-row">
                        <span>Statut:</span>
                        <span style="color: ${user.status === 'pending' ? '#ffa500' : '#00ff00'}">${user.status === 'pending' ? '⏳ En attente' : '✅ Approuvé'}</span>
                    </div>
                    <div class="gestion-compte-user-detail-row">
                        <span>Téléphone:</span>
                        <span>${user.telephone || 'N/A'}</span>
                    </div>
                    <div class="gestion-compte-user-detail-row">
                        <span>ID Discord:</span>
                        <span>${user.discordId || 'N/A'}</span>
                    </div>
                    <div class="gestion-compte-user-detail-row">
                        <span>Rang:</span>
                        <span>${user.role || 'N/A'}</span>
                    </div>
                    <div class="gestion-compte-user-detail-row">
                        <span>Date de création:</span>
                        <span>${createdAt} ${createdAtTime ? 'à ' + createdAtTime : ''}</span>
                    </div>
                </div>
                <div class="gestion-compte-user-actions">
                    ${user.status === 'pending' ? `
                        <button class="gestion-compte-user-action-btn" style="background: #28a745;" onclick="acceptUser(${user.id}, '${(user.fullName || '').replace(/'/g, "\\'")}')">Accepter</button>
                        <button class="gestion-compte-user-action-btn delete" onclick="refuseUser(${user.id}, '${(user.fullName || '').replace(/'/g, "\\'")}')">Refuser</button>
                    ` : `
                        <button class="gestion-compte-user-action-btn" onclick="editUserRole(${user.id}, '${user.role || ''}')">Modifier rôle</button>
                        <button class="gestion-compte-user-action-btn" onclick="editUserDiscordId(${user.id}, '${(user.discordId || '').replace(/'/g, "\\'")}', '${(user.fullName || '').replace(/'/g, "\\'")}')">Modifier ID Discord</button>
                        <button class="gestion-compte-user-action-btn delete" onclick="deleteUser(${user.id}, '${(user.fullName || '').replace(/'/g, "\\'")}', false)">Supprimer</button>
                    `}
                </div>
            </div>
        `;
    }).join('');
}

function filterGestionCompteUsers() {
    const searchInput = document.getElementById('gestionCompteSearchInput');
    const statusFilter = document.getElementById('gestionCompteStatusFilter');
    
    if (!allUsersData || allUsersData.length === 0) {
        return;
    }
    
    const searchTerm = searchInput ? searchInput.value.toLowerCase() : '';
    const selectedStatus = statusFilter ? statusFilter.value : 'all';
    
    const filtered = allUsersData.filter(user => {
        const fullName = (user.fullName || '').toLowerCase();
        const matchesSearch = fullName.includes(searchTerm);
        
        if (selectedStatus === 'all') {
            return matchesSearch;
        }
        
        return matchesSearch && user.status === selectedStatus;
    });
    
    console.log('Filtrage Compte - Total:', allUsersData.length, 'Statut sélectionné:', selectedStatus, 'Résultats:', filtered.length);
    renderGestionCompteUsers(filtered);
}

function closeGestionMDTModal() {
    if (gestionMDTModal) {
        gestionMDTModal.style.display = 'none';
    }
}

if (gestionMDTModal) {
    gestionMDTModal.addEventListener('click', function(e) {
        if (e.target === gestionMDTModal) {
            closeGestionMDTModal();
        }
    });
}

async function openGestionMDTModal() {
    if (!gestionMDTModal) return;
    
    gestionMDTModal.style.display = 'flex';
    const usersList = document.getElementById('gestionMDTUsersList');
    if (usersList) {
        usersList.innerHTML = '<div class="gestion-compte-loading">Chargement...</div>';
    }
    
    const statusFilter = document.getElementById('gestionMDTStatusFilter');
    if (statusFilter) {
        statusFilter.value = 'all';
    }
    const searchInput = document.getElementById('gestionMDTSearchInput');
    if (searchInput) {
        searchInput.value = '';
    }
    
    try {
        const response = await fetch('/api/auth/dev/users');
        if (!response.ok) {
            throw new Error('Erreur HTTP: ' + response.status);
        }
        const data = await response.json();
        
        if (data.success && data.users) {
            allMDTUsersData = data.users;
            console.log('Utilisateurs chargés:', allMDTUsersData.length, 'statuts:', [...new Set(allMDTUsersData.map(u => u.status))]);
            filterGestionMDTUsers();
        } else {
            if (usersList) {
                usersList.innerHTML = '<div class="gestion-compte-loading">Erreur lors du chargement des utilisateurs</div>';
            }
        }
    } catch (error) {
        console.error('Erreur lors du chargement des utilisateurs:', error);
        if (usersList) {
            usersList.innerHTML = '<div class="gestion-compte-loading">Erreur lors du chargement des utilisateurs</div>';
        }
    }
}

function renderGestionMDTUsers(users) {
    const usersList = document.getElementById('gestionMDTUsersList');
    if (!usersList) return;
    
    if (users.length === 0) {
        usersList.innerHTML = '<div class="gestion-compte-loading">Aucun utilisateur trouvé</div>';
        return;
    }
    
    usersList.innerHTML = users.map(user => {
        const createdAt = user.createdAt ? new Date(user.createdAt).toLocaleDateString('fr-FR', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric'
        }) : '-';
        const createdAtTime = user.createdAt ? new Date(user.createdAt).toLocaleTimeString('fr-FR', {
            hour: '2-digit',
            minute: '2-digit'
        }) : '';
        const photoUrl = user.profilePhoto || '';
        const photoHtml = photoUrl ? `<img src="${photoUrl}" class="gestion-compte-user-photo" alt="Photo">` : 
            `<div class="gestion-compte-user-photo" style="background: rgba(184, 134, 11, 0.3); display: flex; align-items: center; justify-content: center; color: rgba(255, 255, 255, 0.5);">
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="width: 30px; height: 30px;">
                    <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
                    <circle cx="12" cy="7" r="4"></circle>
                </svg>
            </div>`;
        
        const departmentName = user.department === 'LSPD' ? 'LSPD' : user.department === 'GOUV' ? 'GOUV' : 'BCSO';
        
        return `
            <div class="gestion-compte-user-card">
                <div class="gestion-compte-user-header">
                    ${photoHtml}
                    <div class="gestion-compte-user-info">
                        <div class="gestion-compte-user-id-name">${user.matricule || 'N/A'} | ${user.fullName || 'N/A'}</div>
                        <div class="gestion-compte-user-email">${user.email || 'N/A'}</div>
                    </div>
                </div>
                <div class="gestion-compte-user-details">
                    <div class="gestion-compte-user-detail-row">
                        <span>Statut:</span>
                        <span style="color: ${user.status === 'pending' ? '#ffa500' : '#00ff00'}">${user.status === 'pending' ? '⏳ En attente' : '✅ Approuvé'}</span>
                    </div>
                    <div class="gestion-compte-user-detail-row">
                        <span>Téléphone:</span>
                        <span>${user.telephone || 'N/A'}</span>
                    </div>
                    <div class="gestion-compte-user-detail-row">
                        <span>ID Discord:</span>
                        <span>${user.discordId || 'N/A'}</span>
                    </div>
                    <div class="gestion-compte-user-detail-row">
                        <span>Département:</span>
                        <span>${departmentName}</span>
                    </div>
                    <div class="gestion-compte-user-detail-row">
                        <span>Rang:</span>
                        <span>${user.role || 'N/A'}</span>
                    </div>
                    <div class="gestion-compte-user-detail-row">
                        <span>Date de création:</span>
                        <span>${createdAt} ${createdAtTime ? 'à ' + createdAtTime : ''}</span>
                    </div>
                </div>
                <div class="gestion-compte-user-actions">
                    ${user.status === 'pending' ? `
                        <button class="gestion-compte-user-action-btn" style="background: #28a745;" onclick="acceptUser(${user.id}, '${(user.fullName || '').replace(/'/g, "\\'")}', true)">Accepter</button>
                        <button class="gestion-compte-user-action-btn delete" onclick="refuseUser(${user.id}, '${(user.fullName || '').replace(/'/g, "\\'")}', true)">Refuser</button>
                    ` : `
                        <button class="gestion-compte-user-action-btn" onclick="editUserRole(${user.id}, '${user.role || ''}')">Modifier rôle</button>
                        <button class="gestion-compte-user-action-btn" onclick="editUserDiscordId(${user.id}, '${(user.discordId || '').replace(/'/g, "\\'")}', '${(user.fullName || '').replace(/'/g, "\\'")}')">Modifier ID Discord</button>
                        <button class="gestion-compte-user-action-btn delete" onclick="deleteUser(${user.id}, '${(user.fullName || '').replace(/'/g, "\\'")}', true)">Supprimer</button>
                    `}
                </div>
            </div>
        `;
    }).join('');
}

function filterGestionMDTUsers() {
    const searchInput = document.getElementById('gestionMDTSearchInput');
    const statusFilter = document.getElementById('gestionMDTStatusFilter');
    
    if (!allMDTUsersData || allMDTUsersData.length === 0) {
        return;
    }
    
    const searchTerm = searchInput ? searchInput.value.toLowerCase() : '';
    const selectedStatus = statusFilter ? statusFilter.value : 'all';
    
    const filtered = allMDTUsersData.filter(user => {
        const fullName = (user.fullName || '').toLowerCase();
        const matchesSearch = fullName.includes(searchTerm);
        
        if (selectedStatus === 'all') {
            return matchesSearch;
        }
        
        return matchesSearch && user.status === selectedStatus;
    });
    
    console.log('Filtrage MDT - Total:', allMDTUsersData.length, 'Statut sélectionné:', selectedStatus, 'Résultats:', filtered.length);
    renderGestionMDTUsers(filtered);
}

async function editUserRole(userId, currentRole) {
    const newRole = prompt(`Modifier le rôle (actuel: ${currentRole}):\n\nBCSO, BCSO_SUP, BCSO_EM, BCSO_LEAD\nLSPD, LSPD_SUP, LSPD_EM, LSPD_LEAD\nGOUV, GOUV_SUP, GOUV_EM, GOUV_LEAD`, currentRole);
    
    if (!newRole || newRole === currentRole) {
        return;
    }
    
    try {
        const response = await fetch(`/api/auth/em/change-role/${userId}`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ role: newRole })
        });
        
        const data = await response.json();
        
        if (data.success) {
            alert('Rôle modifié avec succès');
            openGestionCompteModal();
        } else {
            alert('Erreur: ' + (data.error || 'Erreur inconnue'));
        }
    } catch (error) {
        console.error('Erreur lors de la modification du rôle:', error);
        alert('Erreur lors de la modification du rôle');
    }
}

async function deleteUser(userId, userName, isDevMDT = false) {
    if (!confirm(`Êtes-vous sûr de vouloir supprimer le compte de ${userName} ?\n\nCette action est irréversible.`)) {
        return;
    }
    
    try {
        const endpoint = isDevMDT ? `/api/auth/dev/delete-user/${userId}` : `/api/auth/em/delete-user/${userId}`;
        const response = await fetch(endpoint, {
            method: 'DELETE'
        });
        
        const data = await response.json();
        
        if (data.success) {
            alert('Utilisateur supprimé avec succès');
            if (isDevMDT) {
                openGestionMDTModal();
            } else {
                openGestionCompteModal();
            }
        } else {
            alert('Erreur: ' + (data.error || 'Erreur inconnue'));
        }
    } catch (error) {
        console.error('Erreur lors de la suppression:', error);
        alert('Erreur lors de la suppression de l\'utilisateur');
    }
}

async function acceptUser(userId, userName, isDevMDT = false) {
    if (!confirm(`Êtes-vous sûr de vouloir accepter ${userName} ?`)) {
        return;
    }
    
    try {
        const endpoint = isDevMDT ? `/api/auth/dev/accept-user/${userId}` : `/api/auth/em/accept-user/${userId}`;
        const response = await fetch(endpoint, {
            method: 'POST'
        });
        
        if (!response.ok) {
            const contentType = response.headers.get('content-type');
            if (contentType && contentType.includes('application/json')) {
                const errorData = await response.json();
                throw new Error(errorData.error || `Erreur HTTP ${response.status}`);
            } else {
                throw new Error(`Erreur HTTP ${response.status}`);
            }
        }
        
        const data = await response.json();
        
        if (data.success) {
            alert('✅ Utilisateur accepté avec succès');
            const gestionCompteModal = document.getElementById('gestionCompteModal');
            const gestionMDTModal = document.getElementById('gestionMDTModal');
            if (gestionCompteModal && gestionCompteModal.style.display !== 'none') {
                openGestionCompteModal();
            } else if (gestionMDTModal && gestionMDTModal.style.display !== 'none') {
                openGestionMDTModal();
            }
        } else {
            alert('❌ Erreur: ' + (data.error || 'Erreur inconnue'));
        }
    } catch (error) {
        console.error('Erreur lors de l\'acceptation de l\'utilisateur:', error);
        alert('❌ Erreur lors de l\'acceptation de l\'utilisateur: ' + error.message);
    }
}

async function refuseUser(userId, userName, isDevMDT = false) {
    if (!confirm(`Êtes-vous sûr de vouloir refuser et supprimer ${userName} ?\n\nCette action est irréversible.`)) {
        return;
    }
    
    try {
        const endpoint = isDevMDT ? `/api/auth/dev/refuse-user/${userId}` : `/api/auth/em/refuse-user/${userId}`;
        const response = await fetch(endpoint, {
            method: 'POST'
        });
        
        if (!response.ok) {
            const contentType = response.headers.get('content-type');
            if (contentType && contentType.includes('application/json')) {
                const errorData = await response.json();
                throw new Error(errorData.error || `Erreur HTTP ${response.status}`);
            } else {
                throw new Error(`Erreur HTTP ${response.status}`);
            }
        }
        
        const data = await response.json();
        
        if (data.success) {
            alert('✅ Utilisateur refusé et supprimé avec succès');
            const gestionCompteModal = document.getElementById('gestionCompteModal');
            const gestionMDTModal = document.getElementById('gestionMDTModal');
            if (gestionCompteModal && gestionCompteModal.style.display !== 'none') {
                openGestionCompteModal();
            } else if (gestionMDTModal && gestionMDTModal.style.display !== 'none') {
                openGestionMDTModal();
            }
        } else {
            alert('❌ Erreur: ' + (data.error || 'Erreur inconnue'));
        }
    } catch (error) {
        console.error('Erreur lors du refus de l\'utilisateur:', error);
        alert('❌ Erreur lors du refus de l\'utilisateur: ' + error.message);
    }
}

async function editUserDiscordId(userId, currentDiscordId, userName) {
    const newDiscordId = prompt(`Modifier l'ID Discord pour ${userName}\n\nID Discord actuel: ${currentDiscordId || 'Aucun'}\n\nNouvel ID Discord:`, currentDiscordId || '');
    
    if (!newDiscordId || newDiscordId === currentDiscordId) {
        return;
    }

    if (!/^\d+$/.test(newDiscordId.trim())) {
        alert('❌ L\'ID Discord doit contenir uniquement des chiffres.');
        return;
    }
    
    try {
        const gestionMDTModal = document.getElementById('gestionMDTModal');
        const isGestionMDT = gestionMDTModal && gestionMDTModal.style.display !== 'none';
        const endpoint = isGestionMDT ? `/api/auth/dev/change-discord/${userId}` : `/api/auth/em/change-discord/${userId}`;
        
        const response = await fetch(endpoint, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ 
                oldDiscordId: currentDiscordId || null,
                newDiscordId: newDiscordId.trim()
            })
        });
        
        if (!response.ok) {
            const contentType = response.headers.get('content-type');
            if (contentType && contentType.includes('application/json')) {
                const errorData = await response.json();
                throw new Error(errorData.error || `Erreur HTTP ${response.status}`);
            } else {
                const text = await response.text();
                throw new Error(`Erreur HTTP ${response.status}: La réponse n'est pas du JSON`);
            }
        }
        
        const data = await response.json();
        
        if (data.success) {
            alert('✅ ID Discord modifié avec succès');
            const gestionCompteModal = document.getElementById('gestionCompteModal');
            if (gestionCompteModal && gestionCompteModal.style.display !== 'none') {
                openGestionCompteModal();
            } else if (isGestionMDT) {
                openGestionMDTModal();
            }
        } else {
            alert('❌ Erreur: ' + (data.error || 'Erreur inconnue'));
        }
    } catch (error) {
        console.error('Erreur lors de la modification de l\'ID Discord:', error);
        alert('❌ Erreur lors de la modification de l\'ID Discord: ' + error.message);
    }
}

const schemaAvecVehiculeInput = document.getElementById('schemaAvecVehiculeInput');
const schemaAvecVehiculeImg = document.getElementById('schemaAvecVehiculeImg');
const schemaAvecVehicule = document.getElementById('schemaAvecVehicule');

if (schemaAvecVehicule) {
    schemaAvecVehicule.addEventListener('click', function() {
        schemaAvecVehiculeInput.click();
    });
}

schemaAvecVehiculeInput.addEventListener('change', function(e) {
    const file = e.target.files[0];
    if (file) {
        const reader = new FileReader();
        reader.onload = function(event) {
            schemaAvecVehiculeImg.src = event.target.result;
            schemaAvecVehiculeImg.style.display = 'block';
            schemaAvecVehicule.querySelector('.schema-text').style.display = 'none';
        };
        reader.readAsDataURL(file);
    }
});

const schemaSansVehiculeInput = document.getElementById('schemaSansVehiculeInput');
const schemaSansVehiculeImg = document.getElementById('schemaSansVehiculeImg');
const schemaSansVehicule = document.getElementById('schemaSansVehicule');

if (schemaSansVehicule) {
    schemaSansVehicule.addEventListener('click', function() {
        schemaSansVehiculeInput.click();
    });
}

schemaSansVehiculeInput.addEventListener('change', function(e) {
    const file = e.target.files[0];
    if (file) {
        const reader = new FileReader();
        reader.onload = function(event) {
            schemaSansVehiculeImg.src = event.target.result;
            schemaSansVehiculeImg.style.display = 'block';
            schemaSansVehicule.querySelector('.schema-text').style.display = 'none';
        };
        reader.readAsDataURL(file);
    }
});

const communicationRadioBtn = document.getElementById('communicationRadioBtn');
const communicationRadioModal = document.getElementById('communicationRadioModal');

if (communicationRadioBtn) {
    communicationRadioBtn.addEventListener('click', function() {
        communicationRadioModal.style.display = 'flex';
    });
}

function closeCommunicationRadioModal() {
    communicationRadioModal.style.display = 'none';
}

if (communicationRadioModal) {
    communicationRadioModal.addEventListener('click', function(e) {
        if (e.target === communicationRadioModal) {
            closeCommunicationRadioModal();
        }
    });
}

const rapportsPoliceBtn = document.getElementById('rapportsPoliceBtn');
const rapportsPoliceModal = document.getElementById('rapportsPoliceModal');

if (rapportsPoliceBtn) {
    rapportsPoliceBtn.addEventListener('click', function() {
        rapportsPoliceModal.style.display = 'flex';
    });
}

function closeRapportsPoliceModal() {
    rapportsPoliceModal.style.display = 'none';
}

if (rapportsPoliceModal) {
    rapportsPoliceModal.addEventListener('click', function(e) {
        if (e.target === rapportsPoliceModal) {
            closeRapportsPoliceModal();
        }
    });
}

const rapportRookieBtn = document.getElementById('rapportRookieBtn');
const rapportRookieModal = document.getElementById('rapportRookieModal');

function pad2(n) {
    return String(n).padStart(2, '0');
}

function formatDateFr(d) {
    return `${pad2(d.getDate())}/${pad2(d.getMonth() + 1)}/${d.getFullYear()}`;
}

function formatTimeFr(d) {
    return `${pad2(d.getHours())}:${pad2(d.getMinutes())}`;
}

function openRapportRookieModal() {
        if (rapportsPoliceModal) rapportsPoliceModal.style.display = 'none';

        const now = new Date();
    const dateStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
    const timeStr = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
    const dateEl = document.getElementById('rookieDateRedaction');
    const timeEl = document.getElementById('rookieHeureRedaction');
    const dateDebutEl = document.getElementById('rookieDateDebut');
    const timeDebutEl = document.getElementById('rookieHeureDebut');
    const dateFinEl = document.getElementById('rookieDateFin');
    const timeFinEl = document.getElementById('rookieHeureFin');

    if (dateEl) dateEl.value = dateStr;
    if (timeEl) timeEl.value = timeStr;
    if (dateDebutEl) dateDebutEl.value = dateStr;
    if (timeDebutEl) timeDebutEl.value = timeStr;
    if (dateFinEl) dateFinEl.value = dateStr;
    if (timeFinEl) timeFinEl.value = timeStr;

        const savedPrenomNom = currentUser ? (currentUser.fullName || 'Non défini') : 'Non défini';
    const savedMatricule = currentUser ? (currentUser.matricule || 'Non défini') : 'Non défini';
    const savedTelephone = currentUser ? (currentUser.telephone || '') : '';
    const redacteur = `${savedMatricule} | ${savedPrenomNom}`;

    const redacteurEl = document.getElementById('rookieRedacteur');
    const phoneEl = document.getElementById('rookiePhoneRedacteur');
    const signatureEl = document.getElementById('rookieSignature');
    if (redacteurEl) redacteurEl.textContent = redacteur;
    if (phoneEl) phoneEl.textContent = savedTelephone;
    if (signatureEl) signatureEl.textContent = redacteur;

        const rookieReportNumberEl = document.getElementById('rookieReportNumber');
    if (rookieReportNumberEl) {
        const next = getNextRookieNumber();
        rookieReportNumberEl.textContent = String(next);
    }

    if (rapportRookieModal) rapportRookieModal.style.display = 'flex';
}

if (rapportRookieBtn) {
    rapportRookieBtn.addEventListener('click', function() {
        openRapportRookieModal();
    });
}

function closeRapportRookieModal() {
    if (rapportRookieModal) rapportRookieModal.style.display = 'none';
}

if (rapportRookieModal) {
    rapportRookieModal.addEventListener('click', function(e) {
        if (e.target === rapportRookieModal) {
            closeRapportRookieModal();
        }
    });
}

const rookieSubmitBtn = document.querySelector('.rookie-submit');
if (rookieSubmitBtn) {
    rookieSubmitBtn.addEventListener('click', function() {
        const rookieReport = {
            id: Date.now().toString(),
            numero: document.getElementById('rookieReportNumber')?.textContent || String(getNextRookieNumber()),
            matricule: document.getElementById('rookieMatricule')?.value || '',
            nom: document.getElementById('rookieNom')?.value || '',
            dateRedaction: document.getElementById('rookieDateRedaction')?.value ? formatDateFr(new Date(document.getElementById('rookieDateRedaction').value)) : '',
            heureRedaction: document.getElementById('rookieHeureRedaction')?.value || '',
            dateDebut: document.getElementById('rookieDateDebut')?.value ? formatDateFr(new Date(document.getElementById('rookieDateDebut').value)) : '',
            heureDebut: document.getElementById('rookieHeureDebut')?.value || '',
            dateFin: document.getElementById('rookieDateFin')?.value ? formatDateFr(new Date(document.getElementById('rookieDateFin').value)) : '',
            heureFin: document.getElementById('rookieHeureFin')?.value || '',
            redacteur: document.getElementById('rookieRedacteur')?.textContent || '',
            telephoneRedacteur: document.getElementById('rookiePhoneRedacteur')?.textContent || '',
            signature: document.getElementById('rookieSignature')?.textContent || '',
            commentaire: document.getElementById('rookieCommentaire')?.value || '',
            evaluations: {},
            createdAt: new Date().toISOString(),
        };

                document.querySelectorAll('.rookie-eval-select').forEach(select => {
            const evalType = select.getAttribute('data-eval');
            if (evalType) {
                rookieReport.evaluations[evalType] = select.value || '';
            }
        });

                if (!dataStore.rookieReports) dataStore.rookieReports = [];
                if (!rookieReport.numero || rookieReport.numero === '') {
            rookieReport.numero = String(getNextRookieNumber());
        }
        dataStore.rookieReports.push(rookieReport);

                saveData().catch(err => console.error('Erreur sauvegarde:', err));

                if (currentUser && currentUser.department) {
            fetch('/api/webhooks/rookie', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    rookieReport,
                    redacteur: {
                        matricule: currentUser.matricule,
                        fullName: currentUser.fullName
                    },
                    department: currentUser.department
                }),
                credentials: 'include'
            }).catch(err => console.error('Erreur webhook rookie:', err));
        }

        alert('Rapport Rookie enregistré !');
        closeRapportRookieModal();
    });
}

const rapportFirstLincolnBtn = document.getElementById('rapportFirstLincolnBtn');
const rapportFirstLincolnModal = document.getElementById('rapportFirstLincolnModal');

function openRapportFirstLincolnModal() {
    if (rapportsPoliceModal) rapportsPoliceModal.style.display = 'none';

    const now = new Date();
    const date = formatDateFr(now);
    const time = formatTimeFr(now);
    const dateStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
    const timeStr = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
    
    const dateEl = document.getElementById('firstLincolnDateRedaction');
    const timeEl = document.getElementById('firstLincolnHeureRedaction');
    const dateDebutEl = document.getElementById('firstLincolnDateDebut');
    const timeDebutEl = document.getElementById('firstLincolnHeureDebut');
    const dateFinEl = document.getElementById('firstLincolnDateFin');
    const timeFinEl = document.getElementById('firstLincolnHeureFin');

    if (dateEl) dateEl.value = dateStr;
    if (timeEl) timeEl.value = timeStr;
    if (dateDebutEl) dateDebutEl.value = dateStr;
    if (timeDebutEl) timeDebutEl.value = timeStr;
    if (dateFinEl) dateFinEl.value = dateStr;
    if (timeFinEl) timeFinEl.value = timeStr;

    const savedPrenomNom = currentUser ? (currentUser.fullName || 'Non défini') : 'Non défini';
    const savedMatricule = currentUser ? (currentUser.matricule || 'Non défini') : 'Non défini';
    const savedTelephone = currentUser ? (currentUser.telephone || '') : '';
    const redacteur = `${savedMatricule} | ${savedPrenomNom}`;

    const redacteurEl = document.getElementById('firstLincolnRedacteur');
    const phoneEl = document.getElementById('firstLincolnPhoneRedacteur');
    const signatureEl = document.getElementById('firstLincolnSignature');
    if (redacteurEl) redacteurEl.textContent = redacteur;
    if (phoneEl) phoneEl.textContent = savedTelephone;
    if (signatureEl) signatureEl.textContent = redacteur;

    const firstLincolnReportNumberEl = document.getElementById('firstLincolnReportNumber');
    if (firstLincolnReportNumberEl) {
        const next = getNextFirstLincolnNumber();
        firstLincolnReportNumberEl.textContent = String(next);
    }

    if (rapportFirstLincolnModal) rapportFirstLincolnModal.style.display = 'flex';
}

if (rapportFirstLincolnBtn) {
    rapportFirstLincolnBtn.addEventListener('click', function() {
        openRapportFirstLincolnModal();
    });
}

function closeRapportFirstLincolnModal() {
    if (rapportFirstLincolnModal) rapportFirstLincolnModal.style.display = 'none';
}

if (rapportFirstLincolnModal) {
    rapportFirstLincolnModal.addEventListener('click', function(e) {
        if (e.target === rapportFirstLincolnModal) {
            closeRapportFirstLincolnModal();
        }
    });
}

const firstLincolnSubmitBtn = document.querySelector('#rapportFirstLincolnModal .rookie-submit');
if (firstLincolnSubmitBtn) {
    firstLincolnSubmitBtn.addEventListener('click', function() {
        const firstLincolnReport = {
            id: Date.now().toString(),
            numero: document.getElementById('firstLincolnReportNumber')?.textContent || String(getNextFirstLincolnNumber()),
            matricule: document.getElementById('firstLincolnMatricule')?.value || '',
            nom: document.getElementById('firstLincolnNom')?.value || '',
            dateRedaction: document.getElementById('firstLincolnDateRedaction')?.value ? formatDateFr(new Date(document.getElementById('firstLincolnDateRedaction').value)) : '',
            heureRedaction: document.getElementById('firstLincolnHeureRedaction')?.value || '',
            dateDebut: document.getElementById('firstLincolnDateDebut')?.value ? formatDateFr(new Date(document.getElementById('firstLincolnDateDebut').value)) : '',
            heureDebut: document.getElementById('firstLincolnHeureDebut')?.value || '',
            dateFin: document.getElementById('firstLincolnDateFin')?.value ? formatDateFr(new Date(document.getElementById('firstLincolnDateFin').value)) : '',
            heureFin: document.getElementById('firstLincolnHeureFin')?.value || '',
            redacteur: document.getElementById('firstLincolnRedacteur')?.textContent || '',
            telephoneRedacteur: document.getElementById('firstLincolnPhoneRedacteur')?.textContent || '',
            signature: document.getElementById('firstLincolnSignature')?.textContent || '',
            commentaire: document.getElementById('firstLincolnCommentaire')?.value || '',
            officiersImpliques: document.getElementById('firstLincolnOfficiersImpliques')?.value || '',
            evaluations: {},
            createdAt: new Date().toISOString(),
        };

        document.querySelectorAll('#rapportFirstLincolnModal .rookie-eval-select').forEach(select => {
            const evalType = select.getAttribute('data-eval');
            if (evalType) {
                firstLincolnReport.evaluations[evalType] = select.value || '';
            }
        });

        if (!dataStore.firstLincolnReports) dataStore.firstLincolnReports = [];
        if (!firstLincolnReport.numero || firstLincolnReport.numero === '') {
            firstLincolnReport.numero = String(getNextFirstLincolnNumber());
        }
        dataStore.firstLincolnReports.push(firstLincolnReport);

        saveData().catch(err => console.error('Erreur sauvegarde:', err));

        if (currentUser && currentUser.department) {
            fetch('/api/webhooks/firstLincoln', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    firstLincolnReport,
                    redacteur: {
                        matricule: currentUser.matricule,
                        fullName: currentUser.fullName
                    },
                    department: currentUser.department
                }),
                credentials: 'include'
            }).catch(err => console.error('Erreur webhook firstLincoln:', err));
        }

        alert('Rapport First Lincoln enregistré !');
        closeRapportFirstLincolnModal();
    });
}

const rapportIncidentBtn = document.getElementById('rapportIncidentBtn');
const rapportIncidentModal = document.getElementById('rapportIncidentModal');

function setInputValue(id, value) {
    const el = document.getElementById(id);
    if (el) el.value = value;
}

function setText(id, value) {
    const el = document.getElementById(id);
    if (el) el.textContent = value;
}

function toDateInputValue(d) {
    return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
}

function toTimeInputValue(d) {
    return `${pad2(d.getHours())}:${pad2(d.getMinutes())}`;
}

function openRapportIncidentModal() {
        if (rapportsPoliceModal) rapportsPoliceModal.style.display = 'none';

    const now = new Date();
    setInputValue('incidentDateIncident', toDateInputValue(now));
    setInputValue('incidentHeureIncident', toTimeInputValue(now));
    setInputValue('incidentDateRedaction', toDateInputValue(now));
    setInputValue('incidentHeureRedaction', toTimeInputValue(now));

        const savedPrenomNom = currentUser ? (currentUser.fullName || 'Non défini') : 'Non défini';
    const savedMatricule = currentUser ? (currentUser.matricule || 'Non défini') : 'Non défini';
    const savedTelephone = currentUser ? (currentUser.telephone || '') : '';
    const mail = `${savedPrenomNom}`
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/\s+/g, '.')
        .replace(/[^a-z0-9.]/g, '');

    setText('incidentRedacteurNom', savedPrenomNom);
    setText('incidentRedacteurMatricule', savedMatricule);
    setText('incidentRedacteurTel', savedTelephone);
    const emailDomain = currentUser && currentUser.department === 'LSPD' ? '@lspd.us' : currentUser && currentUser.department === 'GOUV' ? '@gouv.us' : '@bcso.us';
    setText('incidentRedacteurMail', `${mail}${emailDomain}`);

        const incidentLocationEl = document.getElementById('incidentLocation');
    if (incidentLocationEl && currentUser) {
        const department = currentUser.department || 'BCSO';
        if (department === 'LSPD' || department === 'GOUV') {
            incidentLocationEl.textContent = 'Rédigée à Los Santos, San Andreas';
        } else {
            incidentLocationEl.textContent = 'Rédigée à Sandy Shore, San Andreas';
        }
    }

        const next = getNextIncidentNumber();
    setText('incidentNumero', String(next));

    if (rapportIncidentModal) rapportIncidentModal.style.display = 'flex';
}

if (rapportIncidentBtn) {
    rapportIncidentBtn.addEventListener('click', function() {
        openRapportIncidentModal();
    });
}

function closeRapportIncidentModal() {
    if (rapportIncidentModal) rapportIncidentModal.style.display = 'none';
}

if (rapportIncidentModal) {
    rapportIncidentModal.addEventListener('click', function(e) {
        if (e.target === rapportIncidentModal) {
            closeRapportIncidentModal();
        }
    });
}

const incidentSaveBtn = document.getElementById('incidentSaveBtn');
if (incidentSaveBtn) {
    incidentSaveBtn.addEventListener('click', function() {
        const incident = {
            id: Date.now().toString(),
            numero: document.getElementById('incidentNumero')?.textContent || '',
            titre: document.getElementById('incidentTitre')?.value || '',
            type: document.getElementById('incidentType')?.value || '',
            dateIncident: document.getElementById('incidentDateIncident')?.value || '',
            heureIncident: document.getElementById('incidentHeureIncident')?.value || '',
            dateRedaction: document.getElementById('incidentDateRedaction')?.value || '',
            heureRedaction: document.getElementById('incidentHeureRedaction')?.value || '',
            leadTerrain: document.getElementById('incidentLeadTerrain')?.value || '',
            leadNegotiation: document.getElementById('incidentLeadNegotiation')?.value || '',
            revendication: document.getElementById('incidentRevendication')?.value || '',
            nbRavisseurs: document.getElementById('incidentNbRavisseurs')?.value || '',
            nbInterpel: document.getElementById('incidentNbInterpel')?.value || '',
            nbOtages: document.getElementById('incidentNbOtages')?.value || '',
            officiersImpliques: document.getElementById('incidentOfficiersImpliques')?.value || '',
            corps: document.getElementById('incidentCorps')?.value || '',
            redacteur: {
                nom: document.getElementById('incidentRedacteurNom')?.textContent || '',
                fullName: currentUser?.fullName || document.getElementById('incidentRedacteurNom')?.textContent || '',
                matricule: document.getElementById('incidentRedacteurMatricule')?.textContent || '',
                telephone: document.getElementById('incidentRedacteurTel')?.textContent || '',
                mail: document.getElementById('incidentRedacteurMail')?.textContent || '',
                email: currentUser?.email || document.getElementById('incidentRedacteurMail')?.textContent || '',
                department: currentUser?.department || (currentUser?.email?.includes('@gouv.us') ? 'GOUV' : currentUser?.email?.includes('@lspd.us') ? 'LSPD' : 'BCSO')
            },
            createdAt: new Date().toISOString(),
        };

                if (!dataStore.incidents) dataStore.incidents = [];
                if (!incident.numero || incident.numero === '') {
            incident.numero = String(getNextIncidentNumber());
        }
        dataStore.incidents.push(incident);

                saveData().catch(err => console.error('Erreur sauvegarde incident:', err));

                if (currentUser && currentUser.department) {
            fetch('/api/webhooks/incident', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    incident,
                    redacteur: {
                        matricule: currentUser.matricule,
                        fullName: currentUser.fullName
                    },
                    department: currentUser.department
                }),
                credentials: 'include'
            }).catch(err => console.error('Erreur webhook incident:', err));
        }

        alert('Incident enregistré !');
        closeRapportIncidentModal();
    });
}

const radioImageInput = document.getElementById('radioImageInput');
const radioImage = document.getElementById('radioImage');
const radioImagePlaceholder = document.getElementById('radioImagePlaceholder');


const radioRemoveBtn = document.getElementById('radioRemoveBtn');

radioImageInput.addEventListener('change', async function(e) {
    const file = e.target.files[0];
    if (file) {
        const reader = new FileReader();
        reader.onload = async function(event) {
            const base64Data = event.target.result;
            const imageUrl = await uploadImageBase64(base64Data);
            if (!dataStore.settings) {
                dataStore.settings = { bcso: {}, lspd: {}, gouv: {} };
            }
            if (!dataStore.settings.bcso) dataStore.settings.bcso = {};
            if (!dataStore.settings.lspd) dataStore.settings.lspd = {};
            if (!dataStore.settings.gouv) dataStore.settings.gouv = {};
            const department = getUserDepartment().toLowerCase();
            if (!dataStore.settings[department]) dataStore.settings[department] = {};
            dataStore.settings[department].radioImage = imageUrl;
            await saveData();
            
            console.log('Setting radio image src to:', imageUrl);
            radioImage.setAttribute('src', imageUrl);
            radioImage.setAttribute('style', 'display: block !important; width: 100% !important; height: auto !important; max-height: 85vh !important; object-fit: contain !important; margin: auto !important; position: relative !important; z-index: 2 !important;');
            
            const placeholderText = radioImagePlaceholder.querySelector('.radio-placeholder-text');
            if (placeholderText) {
                placeholderText.style.display = 'none';
            }
            if (radioImagePlaceholder) {
                radioImagePlaceholder.style.background = 'transparent';
                radioImagePlaceholder.style.alignItems = 'flex-start';
                radioImagePlaceholder.style.justifyContent = 'flex-start';
            }
            if (radioRemoveBtn && (hasPermission('edit_communication_radio') || hasPermission('edit_radio'))) {
                radioRemoveBtn.style.display = 'inline-block';
            }
            
            console.log('Radio image should be visible now');
            console.log('Radio image computed style display:', window.getComputedStyle(radioImage).display);
            console.log('Radio image src:', radioImage.src);
            console.log('Radio image complete:', radioImage.complete);
        };
        reader.readAsDataURL(file);
    }
});

async function removeRadioImage() {
    if (!hasPermission('edit_communication_radio') && !hasPermission('edit_radio')) {
        return;
    }
    
    if (!dataStore.settings) {
        dataStore.settings = { bcso: {}, lspd: {}, gouv: {} };
    }
    if (!dataStore.settings.bcso) dataStore.settings.bcso = {};
    if (!dataStore.settings.lspd) dataStore.settings.lspd = {};
    if (!dataStore.settings.gouv) dataStore.settings.gouv = {};
    
    const department = getUserDepartment().toLowerCase();
    if (!dataStore.settings[department]) {
        dataStore.settings[department] = {};
    }
    
    delete dataStore.settings[department].radioImage;
    
    
    radioImage.removeAttribute('src');
    radioImage.setAttribute('style', 'display: none !important;');
    const placeholderText = radioImagePlaceholder.querySelector('.radio-placeholder-text');
    if (placeholderText) {
        placeholderText.style.display = 'block';
    }
    if (radioImagePlaceholder) {
        radioImagePlaceholder.style.background = 'rgba(10, 22, 40, 0.4)';
        radioImagePlaceholder.style.alignItems = 'center';
        radioImagePlaceholder.style.justifyContent = 'center';
    }
    if (radioRemoveBtn) radioRemoveBtn.style.display = 'none';
    radioImageInput.value = '';
    
    await saveData();
}

document.querySelectorAll('.license-btn').forEach(btn => {
    btn.addEventListener('click', function() {
        const licenseType = this.closest('.license-type');
                if (licenseType.querySelector('#recensementPermisConduire')) {
            this.classList.toggle('active');
        } else {
                        const buttons = licenseType.querySelectorAll('.license-btn');
            buttons.forEach(b => b.classList.remove('active'));
            this.classList.add('active');
        }
    });
});
let dataStore = {
    recensements: [],
    vehicules: [],
    arrests: {},
    contraventions: {},
    plaintes: {},
    incidents: [],
    rookieReports: [],
    firstLincolnReports: [],
    settings: {
        bcso: {},
        lspd: {}
    }
};

function ensureDataStoreInitialized() {
    if (!dataStore || typeof dataStore !== 'object') {
        dataStore = {
            recensements: [],
            vehicules: [],
            arrests: {},
            contraventions: {},
            plaintes: {},
            incidents: [],
            rookieReports: [],
            firstLincolnReports: [],
            settings: {
                bcso: {},
                lspd: {}
            }
        };
    }
    if (!dataStore.recensements) dataStore.recensements = [];
    if (!dataStore.vehicules) dataStore.vehicules = [];
    if (!dataStore.arrests) dataStore.arrests = {};
    if (!dataStore.contraventions) dataStore.contraventions = {};
    if (!dataStore.plaintes) dataStore.plaintes = {};
    if (!dataStore.incidents) dataStore.incidents = [];
    if (!dataStore.rookieReports) dataStore.rookieReports = [];
    if (!dataStore.firstLincolnReports) dataStore.firstLincolnReports = [];
            if (!dataStore.settings) {
                dataStore.settings = { bcso: {}, lspd: {}, gouv: {} };
            }
                                        if (!dataStore.settings.bcso) dataStore.settings.bcso = {};
                    if (!dataStore.settings.lspd) dataStore.settings.lspd = {};
                    if (!dataStore.settings.gouv) dataStore.settings.gouv = {};

        if (!currentUser && dataStore.recensements.length === 0 && 
        Object.keys(dataStore.arrests).length === 0 &&
        Object.keys(dataStore.contraventions).length === 0 &&
        Object.keys(dataStore.plaintes).length === 0) {
        syncFromLocalStorage();
    }
}

async function loadFromSharedFile() {
    try {
        const response = await fetch('/api/data', {
            cache: 'no-store',
            credentials: 'include'
        });
        if (response.ok) {
            const data = await response.json();
            if (!data.settings || typeof data.settings !== 'object') {
                data.settings = { bcso: {}, lspd: {}, gouv: {} };
            }
            if (!data.settings.bcso) data.settings.bcso = {};
            if (!data.settings.lspd) data.settings.lspd = {};
            if (!data.settings.gouv) data.settings.gouv = {};
            
            dataStore.settings = JSON.parse(JSON.stringify({
                bcso: data.settings.bcso || {},
                lspd: data.settings.lspd || {},
                gouv: data.settings.gouv || {}
            }));
            
            
            dataStore.recensements = Array.isArray(data.recensements) ? data.recensements : [];
            dataStore.vehicules = Array.isArray(data.vehicules) ? data.vehicules : [];
            dataStore.arrests = (data.arrests && typeof data.arrests === 'object') ? data.arrests : {};
            dataStore.contraventions = (data.contraventions && typeof data.contraventions === 'object') ? data.contraventions : {};
            dataStore.plaintes = (data.plaintes && typeof data.plaintes === 'object') ? data.plaintes : {};
            dataStore.incidents = Array.isArray(data.incidents) ? data.incidents : [];
            dataStore.rookieReports = Array.isArray(data.rookieReports) ? data.rookieReports : [];
            dataStore.firstLincolnReports = Array.isArray(data.firstLincolnReports) ? data.firstLincolnReports : [];
            
            console.log('[loadFromSharedFile] Données chargées depuis le serveur:');
            console.log(`  - Recensements: ${dataStore.recensements.length}`);
            console.log(`  - Véhicules: ${dataStore.vehicules.length}`);
            console.log(`  - Arrests: ${Object.keys(dataStore.arrests).length} recensements avec arrests`);
            console.log(`  - Contraventions: ${Object.keys(dataStore.contraventions).length} recensements avec contraventions`);
            console.log(`  - Plaintes: ${Object.keys(dataStore.plaintes).length} recensements avec plaintes`);
            console.log(`  - Incidents: ${dataStore.incidents.length}`);
            console.log(`  - Rookie Reports: ${dataStore.rookieReports.length}`);
            console.log(`  - First Lincoln Reports: ${dataStore.firstLincolnReports.length}`);
            
            syncToLocalStorage();
            if (currentUser) {
                setTimeout(() => {
                    loadImagesFromSettings();
                }, 300);
            }
            return true;
        }
    } catch (error) {
        console.log('Serveur non disponible, chargement depuis localStorage:', error);
        syncFromLocalStorage();

        if (!dataStore.recensements) dataStore.recensements = [];
        if (!dataStore.arrests) dataStore.arrests = {};
        if (!dataStore.contraventions) dataStore.contraventions = {};
        if (!dataStore.plaintes) dataStore.plaintes = {};
        if (!dataStore.incidents) dataStore.incidents = [];
        if (!dataStore.rookieReports) dataStore.rookieReports = [];
        if (!dataStore.firstLincolnReports) dataStore.firstLincolnReports = [];
        if (!dataStore.settings) {
            dataStore.settings = { bcso: {}, lspd: {}, gouv: {} };
        }
        if (!dataStore.settings.bcso) dataStore.settings.bcso = {};
        if (!dataStore.settings.lspd) dataStore.settings.lspd = {};
        if (!dataStore.settings.gouv) dataStore.settings.gouv = {};

        if (currentUser) {
            setTimeout(() => {
                loadImagesFromSettings();
            }, 300);
        }

        return false;
    }
}

function loadImagesFromSettings() {
    if (!dataStore.settings) return;
    if (!currentUser) return;

    const department = getUserDepartment().toLowerCase();     
        if (!dataStore.settings[department]) {
        dataStore.settings[department] = {};
    }

    const deptSettings = dataStore.settings[department];

        const agentImage = document.getElementById('agentImage');
    const agentPlaceholder = document.getElementById('agentPlaceholder');
    const agentRemoveBtn = document.getElementById('agentRemoveBtn');
    if (deptSettings.agentImage && agentImage) {
        agentImage.src = deptSettings.agentImage;
        agentImage.style.display = 'block';
        if (agentPlaceholder) agentPlaceholder.style.display = 'none';
        if (agentRemoveBtn && (hasPermission('edit_images') || hasPermission('upload_images'))) {
            agentRemoveBtn.style.display = 'inline-block';
        }
    }

        const eowImage = document.getElementById('eowImage');
    const eowPlaceholder = document.getElementById('eowPlaceholder');
    const eowRemoveBtn = document.getElementById('eowRemoveBtn');
    if (deptSettings.eowImage && eowImage) {
        eowImage.src = deptSettings.eowImage;
        eowImage.style.display = 'block';
        if (eowPlaceholder) eowPlaceholder.style.display = 'none';
        if (eowRemoveBtn && (hasPermission('edit_images') || hasPermission('upload_images'))) {
            eowRemoveBtn.style.display = 'inline-block';
        }
    }

    const mostWantedImage = document.getElementById('mostWantedImage');
    const mostWantedPlaceholder = document.getElementById('mostWantedPlaceholder');
    const mostWantedRemoveBtn = document.getElementById('mostWantedRemoveBtn');
    if (deptSettings.mostWantedImage && mostWantedImage) {
        mostWantedImage.src = deptSettings.mostWantedImage;
        mostWantedImage.style.display = 'block';
        if (mostWantedPlaceholder) mostWantedPlaceholder.style.display = 'none';
        if (mostWantedRemoveBtn && (hasPermission('edit_images') || hasPermission('upload_images'))) {
            mostWantedRemoveBtn.style.display = 'inline-block';
        }
    }

        const defconImage = document.getElementById('defconImage');
    const defconPlaceholder = document.getElementById('defconPlaceholder');
    const defconRemoveBtn = document.getElementById('defconRemoveBtn');
    if (deptSettings.defconImage && defconImage) {
        defconImage.src = deptSettings.defconImage;
        defconImage.style.display = 'block';
        if (defconPlaceholder) defconPlaceholder.style.display = 'none';
        if (defconRemoveBtn && (hasPermission('edit_images') || hasPermission('upload_images'))) {
            defconRemoveBtn.style.display = 'inline-block';
        }
    }

        const radioImage = document.getElementById('radioImage');
    const radioImagePlaceholder = document.getElementById('radioImagePlaceholder');
    const radioRemoveBtn = document.getElementById('radioRemoveBtn');
    if (deptSettings.radioImage && radioImage) {
        radioImage.setAttribute('src', deptSettings.radioImage);
        radioImage.setAttribute('style', 'display: block !important; width: 100% !important; height: auto !important; max-height: 85vh !important; object-fit: contain !important; margin: auto !important; position: relative !important; z-index: 2 !important;');
        if (radioImagePlaceholder) {
            const placeholderText = radioImagePlaceholder.querySelector('.radio-placeholder-text');
            if (placeholderText) placeholderText.style.display = 'none';
            radioImagePlaceholder.style.pointerEvents = 'none';
            radioImagePlaceholder.style.background = 'transparent';
            radioImagePlaceholder.style.alignItems = 'flex-start';
            radioImagePlaceholder.style.justifyContent = 'flex-start';
        }
        if (radioRemoveBtn && (hasPermission('edit_communication_radio') || hasPermission('edit_radio'))) {
            radioRemoveBtn.style.display = 'inline-block';
        }
    }
}

async function loadDataFromFile() {
    try {
        if ('showOpenFilePicker' in window) {
            const [fileHandle] = await window.showOpenFilePicker({
                types: [{
                    description: 'Fichiers de données',
                    accept: { 'application/json': ['.json'] }
                }],
                multiple: false
            });
            const file = await fileHandle.getFile();
            const text = await file.text();
            dataStore = JSON.parse(text);
            syncToLocalStorage();
            alert('Données chargées avec succès !');
            return fileHandle;
        } else {
                        return new Promise((resolve) => {
                const input = document.createElement('input');
                input.type = 'file';
                input.accept = 'application/json';
                input.onchange = async (e) => {
                    const file = e.target.files[0];
                    if (file) {
                        const text = await file.text();
                        dataStore = JSON.parse(text);
                        syncToLocalStorage();
                        alert('Données chargées avec succès !');
                        resolve();
                    }
                };
                input.click();
            });
        }
    } catch (error) {
        console.error('Erreur lors du chargement:', error);
        alert('Erreur lors du chargement du fichier');
    }
}

async function saveDataToFile(fileHandle = null) {
    try {
        const dataStr = JSON.stringify(dataStore, null, 2);
        const blob = new Blob([dataStr], { type: 'application/json' });
        if (fileHandle || ('showSaveFilePicker' in window)) {
                        if (!fileHandle) {
                fileHandle = await window.showSaveFilePicker({
                    types: [{
                        description: 'Fichiers de données',
                        accept: { 'application/json': ['.json'] }
                    }],
                    suggestedName: 'bcso-data.json'
                });
            }
            const writable = await fileHandle.createWritable();
            await writable.write(blob);
            await writable.close();
            alert('Fichier sauvegardé ! Placez-le dans le répertoire du serveur (bcso-data.json) pour le partager.');
            return fileHandle;
        } else {
                        const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = 'bcso-data.json';
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
            alert('Fichier téléchargé ! Placez-le dans le répertoire du serveur (bcso-data.json) pour le partager avec les autres utilisateurs.');
        }
    } catch (error) {
        if (error.name !== 'AbortError') {
            console.error('Erreur lors de la sauvegarde:', error);
            alert('Erreur lors de la sauvegarde du fichier');
        }
    }
}

function syncFromLocalStorage() {
    try {
                if (!dataStore || typeof dataStore !== 'object') {
            dataStore = {
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

        dataStore.recensements = JSON.parse(localStorage.getItem('recensements') || '[]');
        dataStore.vehicules = JSON.parse(localStorage.getItem('vehicules') || '[]');

        dataStore.arrests = {};
        for (let i = 0; i < localStorage.length; i++) {
            const key = localStorage.key(i);
            if (key && key.startsWith('arrests_')) {
                const recensementId = key.replace('arrests_', '');
                dataStore.arrests[recensementId] = JSON.parse(localStorage.getItem(key) || '[]');
            }
        }

                dataStore.contraventions = {};
        for (let i = 0; i < localStorage.length; i++) {
            const key = localStorage.key(i);
            if (key && key.startsWith('contraventions_')) {
                const recensementId = key.replace('contraventions_', '');
                dataStore.contraventions[recensementId] = JSON.parse(localStorage.getItem(key) || '[]');
            }
        }

                dataStore.plaintes = {};
        for (let i = 0; i < localStorage.length; i++) {
            const key = localStorage.key(i);
            if (key && key.startsWith('plaintes_')) {
                const recensementId = key.replace('plaintes_', '');
                dataStore.plaintes[recensementId] = JSON.parse(localStorage.getItem(key) || '[]');
            }
        }

        dataStore.incidents = JSON.parse(localStorage.getItem('incidents') || '[]');
        dataStore.rookieReports = JSON.parse(localStorage.getItem('rookieReports') || '[]');
        dataStore.firstLincolnReports = JSON.parse(localStorage.getItem('firstLincolnReports') || '[]');

        const settingsStr = localStorage.getItem('settings');
        if (settingsStr) {
            try {
                dataStore.settings = JSON.parse(settingsStr);
            } catch (e) {
                console.error('Erreur lors du parsing des settings:', e);
                dataStore.settings = { bcso: {}, lspd: {}, gouv: {} };
            }
        } else {
            dataStore.settings = { bcso: {}, lspd: {}, gouv: {} };
        }
    } catch (error) {
        console.error('Erreur lors de la synchronisation depuis localStorage:', error);
    }
}

function syncToLocalStorage() {
    try {
        localStorage.setItem('recensements', JSON.stringify(dataStore.recensements));
        localStorage.setItem('vehicules', JSON.stringify(dataStore.vehicules));

        Object.keys(dataStore.arrests).forEach(recensementId => {
            localStorage.setItem(`arrests_${recensementId}`, JSON.stringify(dataStore.arrests[recensementId]));
        });

        Object.keys(dataStore.contraventions).forEach(recensementId => {
            localStorage.setItem(`contraventions_${recensementId}`, JSON.stringify(dataStore.contraventions[recensementId]));
        });

        Object.keys(dataStore.plaintes).forEach(recensementId => {
            localStorage.setItem(`plaintes_${recensementId}`, JSON.stringify(dataStore.plaintes[recensementId]));
        });

        localStorage.setItem('incidents', JSON.stringify(dataStore.incidents));
        localStorage.setItem('rookieReports', JSON.stringify(dataStore.rookieReports));
        localStorage.setItem('firstLincolnReports', JSON.stringify(dataStore.firstLincolnReports));

        if (dataStore.settings) {
            localStorage.setItem('settings', JSON.stringify(dataStore.settings));
        }
    } catch (error) {
        console.error('Erreur lors de la synchronisation vers localStorage:', error);
    }
}

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', function() {
        ensureDataStoreInitialized();
        loadFromSharedFile().catch(err => {
            console.error('Erreur lors du chargement:', err);
            ensureDataStoreInitialized();
        });
    });
} else {
        ensureDataStoreInitialized();
    loadFromSharedFile().catch(err => {
        console.error('Erreur lors du chargement:', err);
        ensureDataStoreInitialized();
    });
}

setInterval(() => {
    syncToLocalStorage();
        }, 30000);

let currentFileHandle = null;
function getNextArrestNumber() {
    let total = 0;
    if (dataStore.arrests) {
        Object.keys(dataStore.arrests).forEach(recId => {
            total += (dataStore.arrests[recId] || []).length;
        });
    }
    return total + 1;
}

function getNextContraventionNumber() {
    let total = 0;
    if (dataStore.contraventions) {
        Object.keys(dataStore.contraventions).forEach(recId => {
            total += (dataStore.contraventions[recId] || []).length;
        });
    }
    return total + 1;
}

function getNextPlainteNumber() {
    let total = 0;
    if (dataStore.plaintes) {
        Object.keys(dataStore.plaintes).forEach(recId => {
            total += (dataStore.plaintes[recId] || []).length;
        });
    }
    return total + 1;
}

function getNextRookieNumber() {
    return (dataStore.rookieReports || []).length + 1;
}

function getNextFirstLincolnNumber() {
    return (dataStore.firstLincolnReports || []).length + 1;
}

function getNextRecensementNumber() {
    const recensements = dataStore.recensements || [];
    if (recensements.length === 0) return 1;
    const maxNum = Math.max(...recensements.map(r => r.numero || 0).filter(n => n > 0));
    return maxNum + 1;
}

function getNextVehiculeNumber() {
    const vehicules = dataStore.vehicules || [];
    if (vehicules.length === 0) return 1;
    const numbers = vehicules.map(v => v.numero || 0).filter(n => n > 0);
    if (numbers.length === 0) return 1;
    const maxNum = Math.max(...numbers);
    return isFinite(maxNum) ? maxNum + 1 : 1;
}

function getNextIncidentNumber() {
    return (dataStore.incidents || []).length + 1;
}

function getArrests(recensementId) {
    if (!dataStore.arrests) dataStore.arrests = {};
    if (!dataStore.arrests[recensementId]) dataStore.arrests[recensementId] = [];
    return dataStore.arrests[recensementId];
}

function getContraventions(recensementId) {
    if (!dataStore.contraventions) dataStore.contraventions = {};
    if (!dataStore.contraventions[recensementId]) dataStore.contraventions[recensementId] = [];
    return dataStore.contraventions[recensementId];
}

function getPlaintes(recensementId) {
    if (!dataStore.plaintes) dataStore.plaintes = {};
    if (!dataStore.plaintes[recensementId]) dataStore.plaintes[recensementId] = [];
    return dataStore.plaintes[recensementId];
}

async function saveData() {
    try {
        if (!dataStore.settings) {
            dataStore.settings = { bcso: {}, lspd: {}, gouv: {} };
        }
        if (!dataStore.settings.bcso) dataStore.settings.bcso = {};
        if (!dataStore.settings.lspd) dataStore.settings.lspd = {};
        if (!dataStore.settings.gouv) dataStore.settings.gouv = {};
        
        
        const response = await fetch('/api/data', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(dataStore)
        });

        if (response.ok) {
            const result = await response.json();
            console.log('Données sauvegardées sur le serveur');
            syncToLocalStorage();
            return true;
        } else {
            throw new Error('Erreur lors de la sauvegarde sur le serveur');
        }
    } catch (error) {
        console.error('Erreur lors de la sauvegarde sur le serveur:', error);
        console.warn('Le serveur n\'est pas accessible. Les données sont sauvegardées dans le cache local uniquement.');
        syncToLocalStorage();
        return false;
    }
}

async function uploadImageBase64(base64Data) {
    try {
        if (base64Data && !base64Data.startsWith('data:image') && (base64Data.startsWith('http') || base64Data.startsWith('/'))) {
            if (base64Data.includes('discord.com') || base64Data.includes('discordapp.com')) {
                console.warn('⚠️ URL Discord détectée, sera remplacée lors du prochain upload');
            }
            return base64Data;
        }

        if (!base64Data || !base64Data.startsWith('data:image')) {
            return base64Data;
        }

        const mimeMatch = base64Data.match(/data:image\/([^;]+)/);
        const extension = mimeMatch ? mimeMatch[1] : 'jpg';

        const response = await fetch('/api/upload-image-base64', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ base64: base64Data, extension: extension })
        });

        if (response.ok) {
            const result = await response.json();
            console.log('✅ Image uploadée avec succès, URL retournée:', result.url);
            return result.url;
        } else {
            const errorText = await response.text();
            console.error('❌ Erreur lors de l\'upload de l\'image:', errorText);
            console.warn('⚠️ Utilisation du base64 en fallback');
            return base64Data;
        }
    } catch (error) {
        console.error('❌ Exception lors de l\'upload de l\'image:', error);
        console.warn('⚠️ Utilisation du base64 en fallback');
        return base64Data;
    }
}

async function encoderRecensement() {
    const prenomNom = document.getElementById('recensementPrenomNom').value;
    const dateNaissance = document.getElementById('recensementDateNaissance').value;
    const sexe = document.getElementById('recensementSexe').value;
    const type = document.getElementById('recensementType').value;
    const taille = document.getElementById('recensementTaille').value;
    const couleurCheveux = document.getElementById('recensementCouleurCheveux').value;
    const couleurYeux = document.getElementById('recensementCouleurYeux').value;
    const telephone = document.getElementById('recensementTelephone').value;
    const profession = document.getElementById('recensementProfession').value;
    const adresse = document.getElementById('recensementAdresse').value;

        const permisConduire = [];
    document.querySelectorAll('#recensementPermisConduire .license-btn.active').forEach(btn => {
        permisConduire.push(btn.dataset.license);
    });
    const ppa = document.getElementById('recensementPPA').classList.contains('active') ? 'Valide' : 'Invalide';

        const photoPreview = document.getElementById('photoPreview');
    let photo = photoPreview.style.display !== 'none' ? photoPreview.src : '';

        if (photo && photo.startsWith('data:image')) {
        photo = await uploadImageBase64(photo);
    }

    if (!prenomNom || !dateNaissance) {
        alert('Veuillez remplir au moins le prénom & nom et la date de naissance');
        return;
    }

        let recensements = dataStore.recensements || [];

        const editingId = window.__currentEditingRecensementId;
    let recensement;

    if (editingId) {
                const index = recensements.findIndex(r => r.id === editingId);
        if (index !== -1) {
            recensement = {
                ...recensements[index],
                prenomNom: prenomNom,
                dateNaissance: dateNaissance,
                sexe: sexe,
                type: type,
                taille: taille,
                couleurCheveux: couleurCheveux,
                couleurYeux: couleurYeux,
                telephone: telephone,
                profession: profession,
                adresse: adresse,
                permisConduire: permisConduire,
                ppa: ppa,
                photo: photo,
                dateModification: new Date().toISOString()
            };
            recensements[index] = recensement;
            
            if (currentUser && currentUser.department) {
                fetch('/api/webhooks/log', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        type: 'recensement_modify',
                        recensement: {
                            id: recensement.id,
                            numero: recensement.numero,
                            prenomNom: recensement.prenomNom
                        },
                        redacteur: {
                            matricule: currentUser.matricule || '',
                            fullName: currentUser.fullName || '',
                            discordId: currentUser.discordId || null
                        },
                        department: currentUser.department
                    }),
                    credentials: 'include'
                }).catch(err => console.error('Erreur log modification recensement:', err));
            }
        }
        delete window.__currentEditingRecensementId;
    } else {
                const nextNum = getNextRecensementNumber();
                recensement = {
        id: Date.now().toString(),
        numero: nextNum,
        prenomNom: prenomNom,
        dateNaissance: dateNaissance,
        sexe: sexe,
        type: type,
        taille: taille,
        couleurCheveux: couleurCheveux,
        couleurYeux: couleurYeux,
        telephone: telephone,
        profession: profession,
        adresse: adresse,
        permisConduire: permisConduire,
        ppa: ppa,
        photo: photo,
        dateCreation: new Date().toISOString()
    };
    recensements.push(recensement);
    }

        dataStore.recensements = recensements;
        saveData().catch(err => console.error('Erreur sauvegarde:', err));

        if (!editingId && currentUser && currentUser.department) {
                const numero = recensements.length;

                const webhookData = {
            recensement: { 
                ...recensement, 
                numero: numero,
                dateCreation: recensement.dateCreation || new Date().toISOString()
            },
            redacteur: {
                matricule: currentUser.matricule || '',
                fullName: currentUser.fullName || ''
            },
            department: currentUser.department
        };

        console.log('Envoi du webhook de recensement:', webhookData);

        fetch('/api/webhooks/recensement', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(webhookData),
            credentials: 'include'
        })
        .then(async response => {
            const responseData = await response.json();
            if (!response.ok) {
                console.error('Erreur webhook recensement:', responseData);
                                console.warn('Le webhook n\'a pas pu être envoyé, mais le recensement a été sauvegardé');
                return;
            }
            console.log('Webhook recensement envoyé avec succès:', responseData);
        })
        .catch(err => {
            console.error('Erreur webhook recensement:', err);
                        console.warn('Le webhook n\'a pas pu être envoyé, mais le recensement a été sauvegardé');
        });
    }

        document.getElementById('recensementPrenomNom').value = '';
    document.getElementById('recensementDateNaissance').value = '';
    document.getElementById('recensementSexe').value = '';
    document.getElementById('recensementType').value = '';
    document.getElementById('recensementTaille').value = '';
    document.getElementById('recensementCouleurCheveux').value = '';
    document.getElementById('recensementCouleurYeux').value = '';
    document.getElementById('recensementTelephone').value = '';
    document.getElementById('recensementProfession').value = '';
    document.getElementById('recensementAdresse').value = '';
    document.querySelectorAll('#recensementPermisConduire .license-btn').forEach(btn => btn.classList.remove('active'));
    document.getElementById('recensementPPA').classList.remove('active');
    photoPreview.src = '';
    photoPreview.style.display = 'none';
    document.getElementById('photoPlaceholder').style.display = 'block';
    document.querySelector('.modal-title').textContent = 'NOUVEAU RECENSEMENT';

    alert(editingId ? 'Recensement modifié avec succès !' : 'Recensement enregistré avec succès !');
    closeRecensementModal();

        if (editingId && window.__currentDetailsRecensement && recensement) {
        afficherDetailsIndividu(recensement);
    }
}

const rechercheBtn = document.getElementById('rechercheBtn');
const rechercheSelectionModal = document.getElementById('rechercheSelectionModal');
const rechercheIndividusModal = document.getElementById('rechercheIndividusModal');
const rechercheVehiculesModal = document.getElementById('rechercheVehiculesModal');
const rechercheInput = document.getElementById('rechercheInput');
const rechercheResults = document.getElementById('rechercheResults');
const rechercheVehiculeInput = document.getElementById('rechercheVehiculeInput');
const rechercheVehiculeResults = document.getElementById('rechercheVehiculeResults');

if (rechercheBtn) {
    rechercheBtn.addEventListener('click', function() {
        if (rechercheSelectionModal) {
            rechercheSelectionModal.style.display = 'flex';
        }
    });
}

function openRechercheIndividus() {
    if (rechercheSelectionModal) rechercheSelectionModal.style.display = 'none';
    if (rechercheIndividusModal) {
        rechercheIndividusModal.style.display = 'flex';
        if (rechercheInput) rechercheInput.focus();
    }
}

function openRechercheVehicules() {
    if (rechercheSelectionModal) rechercheSelectionModal.style.display = 'none';
    if (rechercheVehiculesModal) {
        rechercheVehiculesModal.style.display = 'flex';
        if (rechercheVehiculeInput) rechercheVehiculeInput.focus();
    }
}

function closeRechercheSelectionModal() {
    if (rechercheSelectionModal) rechercheSelectionModal.style.display = 'none';
}

if (rechercheSelectionModal) {
    rechercheSelectionModal.addEventListener('click', function(e) {
        if (e.target === rechercheSelectionModal) {
            closeRechercheSelectionModal();
        }
    });
}

function closeRechercheIndividusModal() {
    rechercheIndividusModal.style.display = 'none';
    rechercheInput.value = '';
    rechercheResults.innerHTML = '';
}

if (rechercheIndividusModal) {
    rechercheIndividusModal.addEventListener('click', function(e) {
        if (e.target === rechercheIndividusModal) {
            closeRechercheIndividusModal();
        }
    });
}

function highlightText(text, searchTerm) {
    if (!searchTerm) return text;
    const regex = new RegExp(`(${searchTerm})`, 'gi');
    return text.replace(regex, '<span class="highlight">$1</span>');
}

function formatDate(dateString) {
    if (!dateString) return '';
    if (typeof dateString === 'string' && dateString.match(/^\d{4}-\d{2}-\d{2}$/)) {
        const parts = dateString.split('-');
        const year = parseInt(parts[0], 10);
        const month = parseInt(parts[1], 10);
        const day = parseInt(parts[2], 10);
        return `${String(day).padStart(2, '0')}/${String(month).padStart(2, '0')}/${year}`;
    }
    const date = new Date(dateString);
    if (isNaN(date.getTime())) {
        return dateString;
    }
    const day = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const year = date.getFullYear();
    return `${day}/${month}/${year}`;
}

if (rechercheInput) {
    rechercheInput.addEventListener('input', function() {
        ensureDataStoreInitialized();

        const searchTerm = this.value.trim().toLowerCase();
        const recensements = dataStore.recensements || [];

        console.log(`[rechercheInput] Recherche: "${searchTerm}", Recensements disponibles: ${recensements.length}`);
        
        rechercheResults.innerHTML = '';

        if (searchTerm.length < 1) {
            return;
        }

        if (recensements.length === 0) {
            console.log('[rechercheInput] Aucun recensement dans dataStore, chargement depuis le serveur...');
            rechercheResults.innerHTML = '<div class="recherche-result-item">Chargement des données...</div>';
            if (currentUser && currentUser.department) {
                loadFromSharedFile().then(() => {
                    const updatedRecensements = dataStore.recensements || [];
                    console.log(`[rechercheInput] Après chargement: ${updatedRecensements.length} recensements`);
                    performSearch(updatedRecensements, searchTerm);
                }).catch(e => {
                    console.error('Erreur lors du chargement des données:', e);
                    rechercheResults.innerHTML = '<div class="recherche-result-item">Erreur lors du chargement des données</div>';
                });
            }
            return;
        }

        performSearch(recensements, searchTerm);
    });
}

function performSearch(recensements, searchTerm) {
    const rechercheResults = document.getElementById('rechercheResults');
    if (!rechercheResults) return;

    console.log(`[performSearch] Recherche de "${searchTerm}" dans ${recensements.length} recensements`);
    
    const filtered = recensements.filter(rec => {
        const fullName = (rec.prenomNom || '').toLowerCase();
        return fullName.includes(searchTerm);
    });

    console.log(`[performSearch] ${filtered.length} résultat(s) trouvé(s)`);
    if (filtered.length > 0) {
        console.log(`[performSearch] Premiers résultats:`, filtered.slice(0, 5).map(r => r.prenomNom));
    }

    if (filtered.length === 0) {
        rechercheResults.innerHTML = '<div class="recherche-result-item">Aucun résultat trouvé</div>';
        return;
    }

    filtered.forEach(rec => {
        const item = document.createElement('div');
        item.className = 'recherche-result-item';
        const dateFormatted = formatDate(rec.dateNaissance);
        item.innerHTML = `${highlightText(rec.prenomNom, searchTerm)} | ${dateFormatted}`;
        item.addEventListener('click', function() {
            afficherDetailsIndividu(rec);
        });
        rechercheResults.appendChild(item);
    });
}

const detailsIndividuModal = document.getElementById('detailsIndividuModal');

function closeDetailsIndividuModal() {
    detailsIndividuModal.style.display = 'none';
}

if (detailsIndividuModal) {
    detailsIndividuModal.addEventListener('click', function(e) {
        if (e.target === detailsIndividuModal) {
            closeDetailsIndividuModal();
        }
    });
}

async function supprimerRecensement() {
    if (!hasPermission('edit_recensement')) {
        alert('Vous n\'avez pas la permission de supprimer les recensements.');
        return;
    }
    
    const rec = window.__currentDetailsRecensement;
    if (!rec) {
        alert('Aucun individu sélectionné');
        return;
    }
    
    if (!confirm(`Êtes-vous sûr de vouloir supprimer le recensement de ${rec.prenomNom} ? Cette action est irréversible.`)) {
        return;
    }
    
    try {
        const response = await fetch(`/api/recensements/${rec.id}`, {
            method: 'DELETE',
            headers: {
                'Content-Type': 'application/json'
            }
        });
        
        const data = await response.json();
        
        if (response.ok && data.success) {
            if (currentUser && currentUser.department) {
                fetch('/api/webhooks/log', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        type: 'recensement_delete',
                        recensement: {
                            id: rec.id,
                            numero: rec.numero,
                            prenomNom: rec.prenomNom
                        },
                        redacteur: {
                            matricule: currentUser.matricule || '',
                            fullName: currentUser.fullName || '',
                            discordId: currentUser.discordId || null
                        },
                        department: currentUser.department
                    }),
                    credentials: 'include'
                }).catch(err => console.error('Erreur log suppression recensement:', err));
            }
            
            let recensements = dataStore.recensements || [];
            recensements = recensements.filter(r => r.id !== rec.id);
            dataStore.recensements = recensements;
            await saveData();
            
            if (currentUser && currentUser.department) {
                await loadFromSharedFile();
            }
            
            alert('Recensement supprimé avec succès !');
            closeDetailsIndividuModal();
        } else {
            alert('Erreur lors de la suppression : ' + (data.error || 'Erreur inconnue'));
        }
    } catch (error) {
        console.error('Erreur lors de la suppression du recensement:', error);
        alert('Erreur de connexion au serveur');
    }
}

function ouvrirModificationRecensement() {
        if (!hasPermission('edit_recensement')) {
        alert('Vous n\'avez pas la permission de modifier les recensements.');
        return;
    }

    const rec = window.__currentDetailsRecensement;
    if (!rec) {
        alert('Aucun individu sélectionné');
        return;
    }

        window.__currentEditingRecensementId = rec.id;

        document.getElementById('recensementPrenomNom').value = rec.prenomNom || '';
    document.getElementById('recensementDateNaissance').value = rec.dateNaissance || '';
    document.getElementById('recensementSexe').value = rec.sexe || '';
    document.getElementById('recensementType').value = rec.type || '';
    document.getElementById('recensementTaille').value = rec.taille || '';
    document.getElementById('recensementCouleurCheveux').value = rec.couleurCheveux || '';
    document.getElementById('recensementCouleurYeux').value = rec.couleurYeux || '';
    document.getElementById('recensementTelephone').value = rec.telephone || '';
    document.getElementById('recensementProfession').value = rec.profession || '';
    document.getElementById('recensementAdresse').value = rec.adresse || '';

        let permisConduire = rec.permisConduire || [];
        if (typeof permisConduire === 'string') {
            try {
                permisConduire = JSON.parse(permisConduire);
            } catch (e) {
                permisConduire = [];
            }
        }
        if (!Array.isArray(permisConduire)) {
            permisConduire = [];
        }
        
        document.querySelectorAll('#recensementPermisConduire .license-btn').forEach(btn => {
            btn.classList.remove('active');
            if (permisConduire.includes(btn.dataset.license)) {
                btn.classList.add('active');
            }
        });

        const ppaBtn = document.getElementById('recensementPPA');
    if (ppaBtn) {
        if (rec.ppa === 'Valide') {
            ppaBtn.classList.add('active');
        } else {
            ppaBtn.classList.remove('active');
        }
    }

        const photoPreview = document.getElementById('photoPreview');
    const photoPlaceholder = document.getElementById('photoPlaceholder');
    if (rec.photo) {
        photoPreview.onload = function() {
            photoPreview.style.display = 'block';
            photoPlaceholder.style.display = 'none';
        };
        photoPreview.onerror = function() {
            photoPreview.style.display = 'none';
            photoPlaceholder.style.display = 'block';
        };
        photoPreview.src = rec.photo;
    } else {
        photoPreview.src = '';
        photoPreview.style.display = 'none';
        photoPlaceholder.style.display = 'block';
    }

        const modalTitle = document.querySelector('#recensementModal .modal-title');
        if (modalTitle) modalTitle.textContent = 'MODIFIER RECENSEMENT';
        
        const modalNumber = document.querySelector('#recensementModal .modal-number');
        if (modalNumber && rec.numero) {
            modalNumber.textContent = `N°${rec.numero}`;
        }

        recensementModal.style.display = 'flex';
}

async function afficherDetailsIndividu(recensement) {
    ensureDataStoreInitialized();
    
    if (currentUser && currentUser.department) {
        try {
            await loadFromSharedFile();
        } catch (e) {
            console.error('Erreur lors du rechargement des données:', e);
        }
    }
    
    closeRechercheIndividusModal();
    window.__currentDetailsRecensement = recensement;

        const dateFormatted = formatDate(recensement.dateNaissance);
    document.getElementById('detailsSearchInput').value = `${recensement.prenomNom} | ${dateFormatted}`;

        document.getElementById('idCardName').textContent = recensement.prenomNom || '-';
    document.getElementById('idCardDOB').textContent = dateFormatted || '-';
    document.getElementById('idCardAddress').textContent = recensement.adresse || '-';
    document.getElementById('idCardWork').textContent = recensement.profession || 'N/A';
    document.getElementById('idCardPhone').textContent = recensement.telephone || '-';
    document.getElementById('idCardSex').textContent = recensement.sexe || '-';
    document.getElementById('idCardHair').textContent = recensement.couleurCheveux || '-';
    document.getElementById('idCardEyes').textContent = recensement.couleurYeux || '-';
    const hgtElement = document.getElementById('idCardHgt');
    hgtElement.textContent = recensement.taille || '-';
    document.getElementById('idCardType').textContent = recensement.type || '-';

        const idCardPhoto = document.getElementById('idCardPhoto');
    if (recensement.photo) {
        idCardPhoto.src = recensement.photo;
        idCardPhoto.style.display = 'block';
    } else {
        idCardPhoto.style.display = 'none';
    }

    const idCardUserPhoto = document.getElementById('idCardUserPhoto');
    if (idCardUserPhoto) {
        idCardUserPhoto.style.display = 'none';
    }

        let permisConduire = recensement.permisConduire || [];
        if (typeof permisConduire === 'string') {
            try {
                permisConduire = JSON.parse(permisConduire);
            } catch (e) {
                permisConduire = [];
            }
        }
        if (!Array.isArray(permisConduire)) {
            permisConduire = [];
        }
        
    const statusA = document.getElementById('statusA');
    const statusB = document.getElementById('statusB');
    const statusC = document.getElementById('statusC');

    if (statusA) {
        statusA.textContent = permisConduire.includes('A') ? 'OK' : 'N/A';
        statusA.className = permisConduire.includes('A') ? 'details-status-value ok' : 'details-status-value';
    }

    if (statusB) {
        statusB.textContent = permisConduire.includes('B') ? 'OK' : 'N/A';
        statusB.className = permisConduire.includes('B') ? 'details-status-value ok' : 'details-status-value';
    }

    if (statusC) {
        statusC.textContent = permisConduire.includes('C') ? 'OK' : 'N/A';
        statusC.className = permisConduire.includes('C') ? 'details-status-value ok' : 'details-status-value';
    }

        const ppaStatusEl = document.getElementById('detailsPPAStatus');
    if (ppaStatusEl) {
        const ppaStatus = ppaStatusEl.querySelector('.details-ppa-value');
        if (ppaStatus) {
            if (recensement.ppa === 'Valide') {
                ppaStatus.textContent = 'Licence Valide';
                ppaStatus.className = 'details-ppa-value valide';
            } else {
                ppaStatus.textContent = 'Licence Invalide';
                ppaStatus.className = 'details-ppa-value';
            }
        }
    }

    await renderArrests(recensement.id);

    await renderContraventions(recensement.id);

    renderWeapons(recensement.id).catch(err => {
        console.error('Erreur lors du rendu des armes:', err);
    });

    const detailsEditBtn = document.getElementById('detailsEditBtn');
    if (detailsEditBtn) {
        if (!hasPermission('edit_recensement')) {
            detailsEditBtn.style.display = 'none';
        } else {
            detailsEditBtn.style.display = 'block';
        }
    }
    
    const detailsDeleteBtn = document.getElementById('detailsDeleteBtn');
    if (detailsDeleteBtn) {
        if (!hasPermission('edit_recensement')) {
            detailsDeleteBtn.style.display = 'none';
        } else {
            detailsDeleteBtn.style.display = 'block';
        }
    }
    renderPlaintes(recensement.id);

    detailsIndividuModal.style.display = 'flex';
}

function closeRechercheVehiculesModal() {
    if (rechercheVehiculesModal) rechercheVehiculesModal.style.display = 'none';
    if (rechercheVehiculeInput) rechercheVehiculeInput.value = '';
    if (rechercheVehiculeResults) rechercheVehiculeResults.innerHTML = '';
}

if (rechercheVehiculesModal) {
    rechercheVehiculesModal.addEventListener('click', function(e) {
        if (e.target === rechercheVehiculesModal) {
            closeRechercheVehiculesModal();
        }
    });
}

if (rechercheVehiculeInput) {
    rechercheVehiculeInput.addEventListener('input', async function() {
        ensureDataStoreInitialized();
        
        if (currentUser && currentUser.department) {
            try {
                await loadFromSharedFile();
            } catch (e) {
                console.error('Erreur lors du rechargement des données:', e);
            }
        }

        const searchTerm = this.value.trim().toLowerCase();
        const vehicules = dataStore.vehicules || [];

        if (rechercheVehiculeResults) rechercheVehiculeResults.innerHTML = '';

        if (searchTerm.length < 1) {
            return;
        }

        const filtered = vehicules.filter(veh => {
            const plaque = (veh.plaque || '').toLowerCase();
            const proprietaire = (veh.proprietaire || '').toLowerCase();
            return plaque.includes(searchTerm) || proprietaire.includes(searchTerm);
        });

        if (filtered.length === 0) {
            if (rechercheVehiculeResults) {
                rechercheVehiculeResults.innerHTML = '<div class="recherche-result-item">Aucun résultat trouvé</div>';
            }
            return;
        }

        filtered.forEach(veh => {
            const item = document.createElement('div');
            item.className = 'recherche-result-item';
            item.innerHTML = `${highlightText(veh.plaque || '-', searchTerm)} | ${highlightText(veh.proprietaire || '-', searchTerm)} | ${veh.marqueModel || '-'}`;
            item.addEventListener('click', function() {
                afficherDetailsVehicule(veh);
            });
            if (rechercheVehiculeResults) rechercheVehiculeResults.appendChild(item);
        });
    });
}

const recensementVehiculeModal = document.getElementById('recensementVehiculeModal');

function openRecensementVehicule() {
    if (recensementVehiculeModal) {
        window.__currentEditingVehiculeId = null;
        
        document.getElementById('vehiculePlaque').value = '';
        document.getElementById('vehiculeProprietaire').value = '';
        document.getElementById('vehiculeMarqueModel').value = '';
        document.getElementById('vehiculeCouleur').value = '';
        document.getElementById('vehiculeSecondeCouleur').value = '';
        document.getElementById('vehiculeChargeSearch').value = '';
        if (document.getElementById('vehiculeChargeSearchResults')) {
            document.getElementById('vehiculeChargeSearchResults').style.display = 'none';
        }
        window.__vehiculeCharges = [];
        renderVehiculeCharges();
        document.getElementById('vehiculeVoleOui').classList.remove('active');
        document.getElementById('vehiculeVoleNon').classList.add('active');
        
        const modalTitle = document.querySelector('#recensementVehiculeModal .modal-title');
        if (modalTitle) modalTitle.textContent = 'NOUVEAU RECENSEMENT DE VÉHICULE';
        
        const modalNumber = document.querySelector('#recensementVehiculeModal .modal-number');
        if (modalNumber) {
            const nextNum = getNextVehiculeNumber();
            modalNumber.textContent = `N°${nextNum}`;
        }
        
        updateVehiculeChargeColors();
        
        recensementVehiculeModal.style.display = 'flex';
    }
}

function closeRecensementVehiculeModal() {
    if (recensementVehiculeModal) recensementVehiculeModal.style.display = 'none';
}

if (recensementVehiculeModal) {
    recensementVehiculeModal.addEventListener('click', function(e) {
        if (e.target === recensementVehiculeModal) {
            closeRecensementVehiculeModal();
        }
    });
}

const vehiculeVoleOui = document.getElementById('vehiculeVoleOui');
const vehiculeVoleNon = document.getElementById('vehiculeVoleNon');

if (vehiculeVoleOui && vehiculeVoleNon) {
    vehiculeVoleOui.addEventListener('click', function() {
        this.classList.add('active');
        vehiculeVoleNon.classList.remove('active');
    });
    
    vehiculeVoleNon.addEventListener('click', function() {
        this.classList.add('active');
        vehiculeVoleOui.classList.remove('active');
    });
    
    vehiculeVoleNon.classList.add('active');
}

async function encoderRecensementVehicule() {
    ensureDataStoreInitialized();
    
    const plaque = document.getElementById('vehiculePlaque').value.trim();
    const proprietaire = document.getElementById('vehiculeProprietaire').value.trim();
    const marqueModel = document.getElementById('vehiculeMarqueModel').value.trim();
    const couleur = document.getElementById('vehiculeCouleur').value.trim();
    const secondeCouleur = document.getElementById('vehiculeSecondeCouleur').value.trim();
    
    const charges = window.__vehiculeCharges || [];
    const chefInculpation = charges.map(charge => {
        let text = charge.nom || '';
        if (charge.categorie) {
            text += ` (${charge.categorie})`;
        }
        return text;
    }).join(', ') || '';
    
    const voleOui = document.getElementById('vehiculeVoleOui').classList.contains('active');
    const vole = voleOui ? 'Oui' : 'Non';
    
    if (!plaque) {
        alert('Veuillez saisir une plaque.');
        return;
    }
    
    if (!proprietaire) {
        alert('Veuillez saisir un propriétaire.');
        return;
    }
    
    let vehicules = dataStore.vehicules || [];
    
    if (window.__currentEditingVehiculeId) {
        const index = vehicules.findIndex(v => v.id === window.__currentEditingVehiculeId);
        if (index !== -1) {
            vehicules[index] = {
                ...vehicules[index],
                plaque: plaque,
                proprietaire: proprietaire,
                marqueModel: marqueModel,
                vole: vole,
                couleur: couleur,
                secondeCouleur: secondeCouleur,
                chefInculpation: chefInculpation,
                charges: charges,
                dateModification: new Date().toISOString()
            };
        }
        window.__currentEditingVehiculeId = null;
    } else {
        const nextNum = getNextVehiculeNumber();
        const vehicule = {
            id: Date.now().toString(),
            numero: nextNum,
            plaque: plaque,
            proprietaire: proprietaire,
            marqueModel: marqueModel,
            vole: vole,
            couleur: couleur,
            secondeCouleur: secondeCouleur,
            chefInculpation: chefInculpation,
            charges: charges,
            dateCreation: new Date().toISOString()
        };
        vehicules.push(vehicule);
    }
    
    dataStore.vehicules = vehicules;
    
    await saveData();
    
    document.getElementById('vehiculePlaque').value = '';
    document.getElementById('vehiculeProprietaire').value = '';
    document.getElementById('vehiculeMarqueModel').value = '';
    document.getElementById('vehiculeCouleur').value = '';
    document.getElementById('vehiculeSecondeCouleur').value = '';
    document.getElementById('vehiculeChargeSearch').value = '';
    if (document.getElementById('vehiculeChargeSearchResults')) {
        document.getElementById('vehiculeChargeSearchResults').style.display = 'none';
    }
    window.__vehiculeCharges = [];
    renderVehiculeCharges();
    document.getElementById('vehiculeVoleOui').classList.remove('active');
    document.getElementById('vehiculeVoleNon').classList.add('active');
    
    const modalTitle = document.querySelector('#recensementVehiculeModal .modal-title');
    if (modalTitle) modalTitle.textContent = 'NOUVEAU RECENSEMENT DE VÉHICULE';
    
    const modalNumber = document.querySelector('#recensementVehiculeModal .modal-number');
    if (modalNumber) {
        const nextNum = getNextVehiculeNumber();
        modalNumber.textContent = `N°${nextNum}`;
    }
    
    alert('Recensement de véhicule enregistré avec succès !');
    closeRecensementVehiculeModal();
}

const detailsVehiculeModal = document.getElementById('detailsVehiculeModal');

function closeDetailsVehiculeModal() {
    if (detailsVehiculeModal) detailsVehiculeModal.style.display = 'none';
}

if (detailsVehiculeModal) {
    detailsVehiculeModal.addEventListener('click', function(e) {
        if (e.target === detailsVehiculeModal) {
            closeDetailsVehiculeModal();
        }
    });
}

async function afficherDetailsVehicule(vehicule) {
    ensureDataStoreInitialized();
    
    if (currentUser && currentUser.department) {
        try {
            await loadFromSharedFile();
        } catch (e) {
            console.error('Erreur lors du rechargement des données:', e);
        }
    }
    closeRechercheVehiculesModal();
    window.__currentDetailsVehicule = vehicule;

    document.getElementById('detailsVehiculeSearchInput').value = `${vehicule.plaque || '-'} | ${vehicule.proprietaire || '-'}`;
    document.getElementById('detailsVehiculePlaque').textContent = vehicule.plaque || '-';
    document.getElementById('detailsVehiculeProprietaire').textContent = vehicule.proprietaire || '-';
    document.getElementById('detailsVehiculeMarqueModel').textContent = vehicule.marqueModel || '-';
    
    const voleElement = document.getElementById('detailsVehiculeVole');
    if (vehicule.vole === 'Oui') {
        voleElement.textContent = 'Volé';
        voleElement.style.color = '#dc3545';
        voleElement.style.fontWeight = '600';
    } else {
        voleElement.textContent = 'Non volé';
        voleElement.style.color = '#28a745';
        voleElement.style.fontWeight = '600';
    }
    
    document.getElementById('detailsVehiculeCouleur').textContent = vehicule.couleur || '-';
    document.getElementById('detailsVehiculeSecondeCouleur').textContent = vehicule.secondeCouleur || '-';
    
    const chefInculpationElement = document.getElementById('detailsVehiculeChefInculpation');
    if (vehicule.charges && Array.isArray(vehicule.charges) && vehicule.charges.length > 0) {
        const chargesText = vehicule.charges.map(charge => {
            let text = charge.nom || '';
            if (charge.categorie) {
                text += ` (${charge.categorie})`;
            }
            return text;
        }).join('\n');
        chefInculpationElement.textContent = chargesText;
    } else {
        chefInculpationElement.textContent = vehicule.chefInculpation || '-';
    }

    if (detailsVehiculeModal) detailsVehiculeModal.style.display = 'flex';
    
    const detailsVehiculeEditBtn = document.getElementById('detailsVehiculeEditBtn');
    const detailsVehiculeDeleteBtn = document.getElementById('detailsVehiculeDeleteBtn');
    
    if (detailsVehiculeEditBtn) {
        if (!hasPermission('edit_recensement')) {
            detailsVehiculeEditBtn.style.display = 'none';
        } else {
            detailsVehiculeEditBtn.style.display = 'block';
        }
    }
    
    if (detailsVehiculeDeleteBtn) {
        if (!hasPermission('edit_recensement')) {
            detailsVehiculeDeleteBtn.style.display = 'none';
        } else {
            detailsVehiculeDeleteBtn.style.display = 'block';
        }
    }
}

async function supprimerVehicule() {
    if (!hasPermission('edit_recensement')) {
        alert('Vous n\'avez pas la permission de supprimer les véhicules.');
        return;
    }
    
    const veh = window.__currentDetailsVehicule;
    if (!veh) {
        alert('Aucun véhicule sélectionné');
        return;
    }
    
    if (!confirm(`Êtes-vous sûr de vouloir supprimer le véhicule ${veh.plaque || ''} ? Cette action est irréversible.`)) {
        return;
    }
    
    try {
        console.log('Suppression du véhicule avec ID:', veh.id, 'Type:', typeof veh.id);
        const vehiculeId = String(veh.id);
        const response = await fetch(`/api/vehicules/${vehiculeId}`, {
            method: 'DELETE',
            headers: {
                'Content-Type': 'application/json'
            },
            credentials: 'include'
        });
        
        console.log('Réponse du serveur:', response.status, response.statusText);
        
        if (!response.ok) {
            const text = await response.text();
            console.error('Erreur serveur:', text);
            try {
                const errorData = JSON.parse(text);
                alert('Erreur lors de la suppression : ' + (errorData.error || 'Erreur inconnue'));
            } catch (e) {
                alert('Erreur lors de la suppression : ' + response.status + ' ' + response.statusText);
            }
            return;
        }
        
        const data = await response.json();
        console.log('Données reçues:', data);
        
        if (data.success) {
            let vehicules = dataStore.vehicules || [];
            vehicules = vehicules.filter(v => v.id !== veh.id);
            dataStore.vehicules = vehicules;
            await saveData();
            
            if (currentUser && currentUser.department) {
                await loadFromSharedFile();
            }
            
            alert('Véhicule supprimé avec succès !');
            closeDetailsVehiculeModal();
            closeRechercheVehiculesModal();
        } else {
            alert('Erreur lors de la suppression : ' + (data.error || 'Erreur inconnue'));
        }
    } catch (error) {
        console.error('Erreur lors de la suppression du véhicule:', error);
        alert('Erreur de connexion au serveur: ' + error.message);
    }
}

function ouvrirModificationVehicule() {
    if (!hasPermission('edit_recensement')) {
        alert('Vous n\'avez pas la permission de modifier les véhicules.');
        return;
    }
    
    const veh = window.__currentDetailsVehicule;
    if (!veh) {
        alert('Aucun véhicule sélectionné');
        return;
    }
    
    window.__currentEditingVehiculeId = veh.id;
    
    document.getElementById('vehiculePlaque').value = veh.plaque || '';
    document.getElementById('vehiculeProprietaire').value = veh.proprietaire || '';
    document.getElementById('vehiculeMarqueModel').value = veh.marqueModel || '';
    document.getElementById('vehiculeCouleur').value = veh.couleur || '';
    document.getElementById('vehiculeSecondeCouleur').value = veh.secondeCouleur || '';
    
    const voleOui = document.getElementById('vehiculeVoleOui');
    const voleNon = document.getElementById('vehiculeVoleNon');
    if (veh.vole === 'Oui') {
        voleOui.classList.add('active');
        voleNon.classList.remove('active');
    } else {
        voleOui.classList.remove('active');
        voleNon.classList.add('active');
    }
    
    if (veh.charges && Array.isArray(veh.charges)) {
        window.__vehiculeCharges = veh.charges;
    } else {
        window.__vehiculeCharges = [];
    }
    renderVehiculeCharges();
    
    document.getElementById('vehiculeChargeSearch').value = '';
    if (document.getElementById('vehiculeChargeSearchResults')) {
        document.getElementById('vehiculeChargeSearchResults').style.display = 'none';
    }
    
    const modalTitle = document.querySelector('#recensementVehiculeModal .modal-title');
    if (modalTitle) modalTitle.textContent = 'MODIFIER VÉHICULE';
    
    const modalNumber = document.querySelector('#recensementVehiculeModal .modal-number');
    if (modalNumber && veh.numero) {
        modalNumber.textContent = `N°${veh.numero}`;
    }
    
    updateVehiculeChargeColors();
    
    closeDetailsVehiculeModal();
    if (recensementVehiculeModal) recensementVehiculeModal.style.display = 'flex';
}

let vehiculeChargeSearchTimeout = null;

function updateVehiculeChargeColors() {
    const deptColor = getDepartmentColor();
    
    const chargeSearch = document.getElementById('vehiculeChargeSearch');
    const chargeSearchResults = document.getElementById('vehiculeChargeSearchResults');
    const chargesContainer = document.getElementById('vehiculeChargesContainer');
    
    if (chargeSearch) {
        chargeSearch.style.borderColor = deptColor;
    }
    if (chargeSearchResults) {
        chargeSearchResults.style.borderColor = deptColor;
    }
    if (chargesContainer) {
        chargesContainer.style.borderColor = deptColor;
    }
}

function displayVehiculeChargeSearchResults(results) {
    const resultsContainer = document.getElementById('vehiculeChargeSearchResults');
    if (!resultsContainer) return;
    
    const deptColor = getDepartmentColor();
    const deptColorRgba = deptColor === '#0066CC' ? 'rgba(0, 102, 204' : 
                          deptColor === '#2F3136' ? 'rgba(47, 49, 54' : 
                          'rgba(255, 165, 0';
    
    if (results.length === 0) {
        resultsContainer.innerHTML = '<div style="padding: 0.75rem; color: rgba(255, 255, 255, 0.6);">Aucun résultat</div>';
        resultsContainer.style.display = 'block';
        return;
    }
    
    resultsContainer.innerHTML = results.map(infraction => {
        const categorieLabel = infraction.categorie === 'Contravention' ? 'Contravention' :
                              infraction.categorie === 'Délit mineur' ? 'Délit Mineur' :
                              infraction.categorie === 'Délit majeur' ? 'Délit Majeur' : 'Crime';
        
        const borderColor = deptColor === '#0066CC' ? 'rgba(0, 102, 204, 0.3)' : 
                            deptColor === '#2F3136' ? 'rgba(47, 49, 54, 0.3)' : 
                            'rgba(255, 165, 0, 0.3)';
        return `
            <div class="vehicule-charge-search-result" data-categorie="${infraction.categorie}" data-nom="${infraction.nom}" data-amende="${infraction.baseAmende}" data-temps="${infraction.baseTemps}" data-special="${infraction.special || ''}" style="padding: 0.75rem; border-bottom: 1px solid ${borderColor}; cursor: pointer; transition: background 0.2s;">
                <div style="font-weight: 600; color: #ffffff;">${infraction.nom}</div>
                <div style="font-size: 0.85rem; color: rgba(255, 255, 255, 0.7); margin-top: 0.25rem;">
                    ${categorieLabel} • Amende: $${infraction.baseAmende.toLocaleString('fr-FR')} • Peine: ${infraction.baseTemps}
                </div>
            </div>
        `;
    }).join('');
    
    resultsContainer.style.display = 'block';
    
    const hoverColor = deptColor === '#0066CC' ? 'rgba(0, 102, 204, 0.2)' : 
                       deptColor === '#2F3136' ? 'rgba(47, 49, 54, 0.2)' : 
                       'rgba(255, 165, 0, 0.2)';
    
    resultsContainer.querySelectorAll('.vehicule-charge-search-result').forEach(result => {
        result.addEventListener('mouseenter', function() {
            this.style.background = hoverColor;
        });
        result.addEventListener('mouseleave', function() {
            this.style.background = 'transparent';
        });
        result.addEventListener('click', function() {
            const categorie = this.dataset.categorie;
            const nom = this.dataset.nom;
            const baseAmende = parseInt(this.dataset.amende);
            const baseTemps = this.dataset.temps;
            const special = this.dataset.special || '';
            
            addVehiculeCharge({
                categorie: categorie,
                nom: nom,
                quantite: 1,
                baseAmende: baseAmende,
                baseTemps: baseTemps,
                tentative: 'NON',
                complicite: 'NON',
                special: special
            });
            
            document.getElementById('vehiculeChargeSearch').value = '';
            resultsContainer.style.display = 'none';
        });
    });
}

function addVehiculeCharge(charge) {
    if (!window.__vehiculeCharges) {
        window.__vehiculeCharges = [];
    }
    
    window.__vehiculeCharges.push(charge);
    renderVehiculeCharges();
}

function renderVehiculeCharges() {
    const container = document.getElementById('vehiculeChargesContainer');
    if (!container) return;
    
    const charges = window.__vehiculeCharges || [];
    const deptColor = getDepartmentColor();
    const deptColorRgba = deptColor === '#0066CC' ? 'rgba(0, 102, 204' : 
                          deptColor === '#2F3136' ? 'rgba(47, 49, 54' : 
                          'rgba(255, 165, 0';
    
    if (charges.length === 0) {
        container.innerHTML = '<div style="text-align: center; color: rgba(255, 255, 255, 0.6); padding: 1.5rem;">Aucune charge. Recherchez un chef d\'inculpation ci-dessus pour l\'ajouter.</div>';
        const countEl = document.getElementById('vehiculeChargesCount');
        if (countEl) countEl.textContent = '0 charge(s)';
        return;
    }
    
    container.innerHTML = charges.map((charge, index) => {
        const categorieLabel = charge.categorie === 'Contravention' ? 'Contravention' :
                              charge.categorie === 'Délit mineur' ? 'Délit Mineur' :
                              charge.categorie === 'Délit majeur' ? 'Délit Majeur' :
                              charge.categorie === 'Crime' ? 'Crime' : '';
        
        return `
            <div class="vehicule-charge-item" data-charge-index="${index}" style="border: 2px solid ${deptColor}; padding: 0.75rem; margin-bottom: 0.5rem; background: rgba(10, 22, 40, 0.6); border-radius: 4px; display: flex; justify-content: space-between; align-items: center;">
                <div style="flex: 1;">
                    <div style="font-weight: 600; margin-bottom: 0.25rem; color: #ffffff;">${charge.nom || ''}</div>
                    ${charge.special ? `<div style="font-size: 0.8rem; color: rgba(255, 255, 255, 0.7); margin-bottom: 0.25rem;">${charge.special}</div>` : ''}
                    <div style="display: flex; gap: 0.75rem; margin-top: 0.5rem; flex-wrap: wrap;">
                        ${categorieLabel ? `<div style="font-size: 0.8rem; padding: 0.2rem 0.5rem; background: ${deptColorRgba}, 0.2); border: 1px solid ${deptColor}; color: ${deptColor}; border-radius: 3px;">${categorieLabel}</div>` : ''}
                    </div>
                </div>
                <button onclick="removeVehiculeCharge(${index})" style="background: rgba(220, 53, 69, 0.2); border: 1px solid #dc3545; color: #dc3545; padding: 0.4rem 0.8rem; border-radius: 4px; cursor: pointer; font-size: 0.85rem; margin-left: 1rem; transition: all 0.3s ease;">Supprimer</button>
            </div>
        `;
    }).join('');
    
    const countEl = document.getElementById('vehiculeChargesCount');
    if (countEl) countEl.textContent = `${charges.length} charge(s)`;
}

function removeVehiculeCharge(index) {
    if (window.__vehiculeCharges && window.__vehiculeCharges[index] !== undefined) {
        window.__vehiculeCharges.splice(index, 1);
        renderVehiculeCharges();
    }
}

window.removeVehiculeCharge = removeVehiculeCharge;

const vehiculeChargeSearch = document.getElementById('vehiculeChargeSearch');
const vehiculeChargeSearchResults = document.getElementById('vehiculeChargeSearchResults');

if (vehiculeChargeSearch) {
    vehiculeChargeSearch.addEventListener('input', function() {
        if (vehiculeChargeSearchTimeout) clearTimeout(vehiculeChargeSearchTimeout);
        const query = this.value.trim();
        
        if (query.length < 2) {
            if (vehiculeChargeSearchResults) vehiculeChargeSearchResults.style.display = 'none';
            return;
        }
        
        vehiculeChargeSearchTimeout = setTimeout(() => {
            const results = searchArrestCharges(query);
            displayVehiculeChargeSearchResults(results);
        }, 200);
    });
    
    vehiculeChargeSearch.addEventListener('focus', function() {
        const query = this.value.trim();
        if (query.length >= 2) {
            const results = searchArrestCharges(query);
            displayVehiculeChargeSearchResults(results);
        }
    });
    
    document.addEventListener('click', function(e) {
        if (vehiculeChargeSearchResults && 
            !vehiculeChargeSearch.contains(e.target) && 
            !vehiculeChargeSearchResults.contains(e.target)) {
            vehiculeChargeSearchResults.style.display = 'none';
        }
    });
}

if (!window.__vehiculeCharges) {
    window.__vehiculeCharges = [];
}

async function renderArrests(recensementId) {
    const arrestList = document.getElementById('arrestList');
    if (!arrestList) return;
    ensureDataStoreInitialized();
    
    if (currentUser && currentUser.department) {
        try {
            await loadFromSharedFile();
        } catch (e) {
            console.error('Erreur lors du rechargement des données:', e);
        }
    }
    
    const arrests = getArrests(recensementId);
    const arrestCount = document.getElementById('arrestCount');
    if (arrestCount) arrestCount.textContent = `Nombre total de RA: ${arrests.length}`;

    if (arrests.length === 0) {
        arrestList.innerHTML = '<div class="details-empty-large">N/A</div>';
        return;
    }

        arrestList.innerHTML = '';
        arrests.forEach(arrest => {
            const item = document.createElement('div');
            item.className = 'details-arrest-item';
            const deleteBtnHtml = hasPermission('delete_reports') 
                ? `<button class="details-arrest-action delete" data-arrest-id="${arrest.id}" data-recensement-id="${recensementId}">🗑</button>`
                : '';
            item.innerHTML = `
                <div class="details-arrest-item-header">
                <span class="details-arrest-number">Numéro de dossier : ${arrest.numero || '-'}</span>
                    <div class="details-arrest-actions">
                    <button class="details-arrest-action view" data-arrest-id="${arrest.id}" data-recensement-id="${recensementId}" title="Voir le rapport">👁</button>
                    <button class="details-arrest-action edit" data-arrest-id="${arrest.id}" data-recensement-id="${recensementId}">✎</button>
                    ${deleteBtnHtml}
                    </div>
                </div>
            <div class="details-arrest-info">Date de l'arrestation : ${arrest.date || '-'}</div>
            <div class="details-arrest-info">Heure de l'arrestation : ${arrest.heure || '-'}</div>
            <div class="details-arrest-info">Créer par : ${arrest.createur || '-'}</div>
            <div class="details-arrest-status">${arrest.status || 'Enregistré'}</div>
            `;
            arrestList.appendChild(item);
        });

                arrestList.querySelectorAll('.details-arrest-action.view').forEach(btn => {
            btn.addEventListener('click', function() {
                const arrestId = this.dataset.arrestId;
                const recensementId = this.dataset.recensementId;
                viewArrest(arrestId, recensementId);
            });
        });

        arrestList.querySelectorAll('.details-arrest-action.edit').forEach(btn => {
            btn.addEventListener('click', function() {
                const arrestId = this.dataset.arrestId;
                const recensementId = this.dataset.recensementId;
                editArrest(arrestId, recensementId);
            });
        });

        arrestList.querySelectorAll('.details-arrest-action.delete').forEach(btn => {
            btn.addEventListener('click', function() {
                const arrestId = this.dataset.arrestId;
                const recensementId = this.dataset.recensementId;
                if (confirm('Êtes-vous sûr de vouloir supprimer ce rapport d\'arrestation ?')) {
                    deleteArrest(arrestId, recensementId);
                }
            });
        });

                if (!hasPermission('delete_reports')) {
            arrestList.querySelectorAll('.details-arrest-action.delete').forEach(btn => {
                btn.style.display = 'none';
            });
        }
                if (!isBCSO_EM()) {
            arrestList.querySelectorAll('.details-arrest-action.edit').forEach(btn => {
                btn.style.display = 'none';
            });
        }
    }

async function renderContraventions(recensementId) {
    const container = document.getElementById('contraventionContent');
    const countEl = document.getElementById('contraventionCount');
    if (!container || !countEl) return;

    if (currentUser && currentUser.department) {
        try {
            await loadFromSharedFile();
        } catch (e) {
            console.error('Erreur lors du rechargement des données:', e);
        }
    }

    const list = getContraventions(recensementId);
    countEl.textContent = `Nombre total de Contravention: ${list.length}`;

    if (list.length === 0) {
        container.innerHTML = '<div class="details-empty-large">N/A</div>';
        return;
    }

        container.innerHTML = list
        .slice()
        .reverse()
        .map(c => {
            const titre = c.titre || c.suspect?.nom || '-';
            const numero = c.numero || '-';
            const date = c.date || '-';
            const createur = c.createur || '-';
            const deleteBtnHtml = hasPermission('delete_reports') 
                ? `<button class="details-arrest-action delete" data-contrav-id="${c.id}" data-recensement-id="${recensementId}">🗑</button>`
                : '';
            return `
                <div class="details-arrest-item">
                    <div class="details-arrest-item-header">
                        <span class="details-arrest-number">Dossier : ${numero}</span>
                        <div class="details-arrest-actions">
                            <button class="details-arrest-action view" data-contrav-id="${c.id}" data-recensement-id="${recensementId}" title="Voir le rapport">👁</button>
                            <button class="details-arrest-action edit" data-contrav-id="${c.id}" data-recensement-id="${recensementId}">✎</button>
                            ${deleteBtnHtml}
                        </div>
                    </div>
                    <div class="details-arrest-info">Nom : ${titre}</div>
                    <div class="details-arrest-info">Date : ${date}</div>
                    <div class="details-arrest-info">Créer par : ${createur}</div>
                    <div class="details-arrest-status">Enregistré</div>
                </div>
            `;
        })
        .join('');

        container.querySelectorAll('.details-arrest-action.view').forEach(btn => {
        btn.addEventListener('click', function() {
            const contravId = this.dataset.contravId;
            const recensementId = this.dataset.recensementId;
            viewContravention(contravId, recensementId);
        });
    });

    container.querySelectorAll('.details-arrest-action.edit').forEach(btn => {
        btn.addEventListener('click', function() {
            const contravId = this.dataset.contravId;
            const recensementId = this.dataset.recensementId;
            editContravention(contravId, recensementId);
        });
    });

    container.querySelectorAll('.details-arrest-action.delete').forEach(btn => {
        btn.addEventListener('click', function() {
            const contravId = this.dataset.contravId;
            const recensementId = this.dataset.recensementId;
            if (confirm('Êtes-vous sûr de vouloir supprimer cette contravention ?')) {
                deleteContravention(contravId, recensementId).catch(err => console.error('Erreur lors de la suppression:', err));
            }
        });
    });

        if (!hasPermission('delete_reports')) {
        container.querySelectorAll('.details-arrest-action.delete').forEach(btn => {
            btn.style.display = 'none';
        });
    }
}

async function renderWeapons(recensementId) {
    const weaponList = document.getElementById('weaponList');
    const weaponCount = document.getElementById('weaponCount');
    const weaponAddBtn = document.getElementById('weaponAddBtn');
    if (!weaponList) return;

    try {
        const response = await fetch(`/api/government-weapons/${recensementId}`);
        
        if (!response.ok) {
            weaponList.innerHTML = '<div class="details-empty-large">N/A</div>';
            return;
        }
        
        const data = await response.json();
        
        if (!data.success) {
            weaponList.innerHTML = '<div class="details-empty-large">N/A</div>';
            return;
        }
        
        const weapons = data.weapons || [];
        if (weaponCount) weaponCount.textContent = `Nombre total d'armes: ${weapons.length}`;
        
        const canManage = currentUser && (currentUser.role === 'GOUV_LEAD' || isDevMDT());
        if (weaponAddBtn) {
            weaponAddBtn.style.display = canManage ? 'block' : 'none';
        }
        
        if (weapons.length === 0) {
            weaponList.innerHTML = '<div class="details-empty-large">N/A</div>';
            return;
        }
        
        weaponList.innerHTML = '';
        weapons.forEach(weapon => {
            const item = document.createElement('div');
            item.className = 'details-arrest-item';
            const dateDelivrance = weapon.dateDelivrance ? new Date(weapon.dateDelivrance).toLocaleDateString('fr-FR') : '-';
            const dateNaissance = weapon.dateNaissance ? new Date(weapon.dateNaissance).toLocaleDateString('fr-FR') : '-';
            const statutColor = weapon.statut === 'Actif' ? '#00ff00' : '#ffa500';
            
            const editBtnHtml = canManage 
                ? `<button class="details-arrest-action edit" data-weapon-id="${weapon.id}" data-recensement-id="${recensementId}">✎</button>`
                : '';
            const deleteBtnHtml = canManage 
                ? `<button class="details-arrest-action delete" data-weapon-id="${weapon.id}" data-recensement-id="${recensementId}">🗑</button>`
                : '';
            
            item.innerHTML = `
                <div class="details-arrest-item-header">
                    <span class="details-arrest-number">ID Arme: ${weapon.armeId || '-'}</span>
                    <div class="details-arrest-actions">
                        <button class="details-arrest-action view" data-weapon-id="${weapon.id}" data-recensement-id="${recensementId}" title="Voir les détails">👁</button>
                        ${editBtnHtml}
                        ${deleteBtnHtml}
                    </div>
                </div>
                <div class="details-arrest-info">Prénom & Nom: ${weapon.prenomNom || '-'}</div>
                <div class="details-arrest-info">Date de naissance: ${dateNaissance}</div>
                <div class="details-arrest-info">Date de délivrance: ${dateDelivrance}</div>
                <div class="details-arrest-info">Créé par: ${weapon.createur || '-'}</div>
                <div class="details-arrest-status" style="color: ${statutColor}">${weapon.statut || 'Actif'}</div>
            `;
            weaponList.appendChild(item);
        });
        
        weaponList.querySelectorAll('.details-arrest-action.view').forEach(btn => {
            btn.addEventListener('click', function() {
                const weaponId = this.dataset.weaponId;
                const recensementId = this.dataset.recensementId;
                viewWeapon(weaponId, recensementId);
            });
        });
        
        weaponList.querySelectorAll('.details-arrest-action.edit').forEach(btn => {
            btn.addEventListener('click', function() {
                const weaponId = this.dataset.weaponId;
                const recensementId = this.dataset.recensementId;
                editWeapon(weaponId, recensementId);
            });
        });
        
        weaponList.querySelectorAll('.details-arrest-action.delete').forEach(btn => {
            btn.addEventListener('click', function() {
                const weaponId = this.dataset.weaponId;
                const recensementId = this.dataset.recensementId;
                if (confirm('Êtes-vous sûr de vouloir supprimer cette arme ?')) {
                    deleteWeapon(weaponId, recensementId);
                }
            });
        });
    } catch (error) {
        console.error('Erreur lors du chargement des armes:', error);
        weaponList.innerHTML = '<div class="details-empty-large">N/A</div>';
    }
}

async function viewWeapon(weaponId, recensementId) {
    try {
        const response = await fetch(`/api/government-weapons/${recensementId}`);
        const data = await response.json();
        if (!data.success) {
            alert('Erreur lors du chargement de l\'arme');
            return;
        }
        
        const weapon = data.weapons.find(w => w.id === weaponId);
        if (!weapon) {
            alert('Arme non trouvée');
            return;
        }
        
        delete window.__currentEditingWeaponId;
        delete window.__currentEditingWeaponRecensementId;
        
        document.getElementById('weaponPrenomNom').value = weapon.prenomNom || '';
        document.getElementById('weaponDateNaissance').value = weapon.dateNaissance || '';
        document.getElementById('weaponArmeId').value = weapon.armeId || '';
        document.getElementById('weaponDateDelivrance').value = weapon.dateDelivrance || '';
        document.getElementById('weaponRaison').value = weapon.raison || '';
        document.getElementById('weaponStatut').value = weapon.statut || 'Actif';
        document.getElementById('weaponRaisonInactif').value = weapon.raisonInactif || '';
        document.getElementById('weaponCommentaire').value = weapon.commentaire || '';
        
        toggleWeaponRaisonInactif();
        
        setModalReadOnly('governmentWeaponModal', true);
        
        const modal = document.getElementById('governmentWeaponModal');
        if (modal) modal.style.display = 'flex';
    } catch (error) {
        console.error('Erreur lors de la récupération de l\'arme:', error);
        alert('Erreur lors du chargement de l\'arme');
    }
}

async function editWeapon(weaponId, recensementId) {
    try {
        const response = await fetch(`/api/government-weapons/${recensementId}`);
        const data = await response.json();
        if (!data.success) {
            alert('Erreur lors du chargement de l\'arme');
            return;
        }
        
        const weapon = data.weapons.find(w => w.id === weaponId);
        if (!weapon) {
            alert('Arme non trouvée');
            return;
        }
        
        window.__currentEditingWeaponId = weaponId;
        window.__currentEditingWeaponRecensementId = recensementId;
        
        document.getElementById('weaponPrenomNom').value = weapon.prenomNom || '';
        document.getElementById('weaponDateNaissance').value = weapon.dateNaissance || '';
        document.getElementById('weaponArmeId').value = weapon.armeId || '';
        document.getElementById('weaponDateDelivrance').value = weapon.dateDelivrance || '';
        document.getElementById('weaponRaison').value = weapon.raison || '';
        document.getElementById('weaponStatut').value = weapon.statut || 'Actif';
        document.getElementById('weaponRaisonInactif').value = weapon.raisonInactif || '';
        document.getElementById('weaponCommentaire').value = weapon.commentaire || '';
        
        toggleWeaponRaisonInactif();
        
        setModalReadOnly('governmentWeaponModal', false);
        
        const modal = document.getElementById('governmentWeaponModal');
        if (modal) modal.style.display = 'flex';
    } catch (error) {
        console.error('Erreur lors de la récupération de l\'arme:', error);
        alert('Erreur lors du chargement de l\'arme');
    }
}

async function openGovernmentWeaponModal(recensementId) {
    if (!recensementId) {
        console.error('openGovernmentWeaponModal: recensementId manquant');
        return;
    }
    
    const rec = window.__currentDetailsRecensement;
    if (!rec) {
        console.error('Aucun recensement dans currentDetailsRecensement');
        return;
    }
    
    delete window.__currentEditingWeaponId;
    delete window.__currentEditingWeaponRecensementId;
    
    const prenomNomInput = document.getElementById('weaponPrenomNom');
    const dateNaissanceInput = document.getElementById('weaponDateNaissance');
    const armeIdInput = document.getElementById('weaponArmeId');
    const dateDelivranceInput = document.getElementById('weaponDateDelivrance');
    const raisonInput = document.getElementById('weaponRaison');
    const statutInput = document.getElementById('weaponStatut');
    const raisonInactifInput = document.getElementById('weaponRaisonInactif');
    const commentaireInput = document.getElementById('weaponCommentaire');
    
    if (prenomNomInput) prenomNomInput.value = rec.prenomNom || '';
    if (dateNaissanceInput) dateNaissanceInput.value = rec.dateNaissance || '';
    if (armeIdInput) armeIdInput.value = '';
    if (dateDelivranceInput) dateDelivranceInput.value = '';
    if (raisonInput) raisonInput.value = '';
    if (statutInput) statutInput.value = 'Actif';
    if (raisonInactifInput) raisonInactifInput.value = '';
    if (commentaireInput) commentaireInput.value = '';
    
    toggleWeaponRaisonInactif();
    
    window.__currentEditingWeaponRecensementId = recensementId;
    setModalReadOnly('governmentWeaponModal', false);
    
    const modal = document.getElementById('governmentWeaponModal');
    if (modal) {
        modal.style.display = 'flex';
    } else {
        console.error('Modal governmentWeaponModal non trouvé');
    }
}

function closeGovernmentWeaponModal() {
    const modal = document.getElementById('governmentWeaponModal');
    if (modal) modal.style.display = 'none';
}

function toggleWeaponRaisonInactif() {
    const statut = document.getElementById('weaponStatut').value;
    const container = document.getElementById('weaponRaisonInactifContainer');
    if (container) {
        container.style.display = statut === 'Non actif' ? 'block' : 'none';
    }
}

async function saveGovernmentWeapon() {
    const recensementId = window.__currentEditingWeaponRecensementId;
    if (!recensementId) {
        alert('Erreur: ID de recensement manquant');
        return;
    }
    
    const prenomNom = document.getElementById('weaponPrenomNom').value.trim();
    const dateNaissance = document.getElementById('weaponDateNaissance').value;
    const armeId = document.getElementById('weaponArmeId').value.trim();
    const dateDelivrance = document.getElementById('weaponDateDelivrance').value;
    const raison = document.getElementById('weaponRaison').value.trim();
    const statut = document.getElementById('weaponStatut').value;
    const raisonInactif = document.getElementById('weaponRaisonInactif').value.trim();
    const commentaire = document.getElementById('weaponCommentaire').value.trim();
    
    if (!prenomNom || !armeId || !dateDelivrance || !raison || !statut) {
        alert('Veuillez remplir tous les champs obligatoires');
        return;
    }
    
    if (statut === 'Non actif' && !raisonInactif) {
        alert('Veuillez indiquer la raison du statut');
        return;
    }
    
    const editingId = window.__currentEditingWeaponId;
    
    try {
        const url = editingId ? `/api/government-weapons/${editingId}` : '/api/government-weapons';
        const method = editingId ? 'PUT' : 'POST';
        
        const body = {
            recensementId: editingId ? undefined : recensementId,
            prenomNom,
            dateNaissance: dateNaissance || null,
            armeId,
            dateDelivrance,
            raison,
            statut,
            raisonInactif: statut === 'Non actif' ? raisonInactif : null,
            commentaire: commentaire || null
        };
        
        if (editingId) {
            delete body.recensementId;
        }
        
        const response = await fetch(url, {
            method: method,
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(body)
        });
        
        const data = await response.json();
        
        if (data.success) {
            alert('Arme enregistrée avec succès');
            closeGovernmentWeaponModal();
            renderWeapons(recensementId);
        } else {
            alert('Erreur: ' + (data.error || 'Erreur inconnue'));
        }
    } catch (error) {
        console.error('Erreur lors de la sauvegarde de l\'arme:', error);
        alert('Erreur lors de la sauvegarde de l\'arme');
    }
}

async function deleteWeapon(weaponId, recensementId) {
    try {
        const response = await fetch(`/api/government-weapons/${weaponId}`, {
            method: 'DELETE'
        });
        
        const data = await response.json();
        
        if (data.success) {
            renderWeapons(recensementId);
        } else {
            alert('Erreur: ' + (data.error || 'Erreur inconnue'));
        }
    } catch (error) {
        console.error('Erreur lors de la suppression de l\'arme:', error);
        alert('Erreur lors de la suppression de l\'arme');
    }
}

async function deleteArrest(arrestId, recensementId) {
    if (!hasPermission('delete_reports')) {
        alert('Vous n\'avez pas la permission de supprimer des rapports d\'arrestation.');
        return;
    }
    
    try {
        const response = await fetch(`/api/arrests/${arrestId}`, {
            method: 'DELETE',
            headers: {
                'Content-Type': 'application/json'
            }
        });
        
        const data = await response.json();
        
        if (response.ok && data.success) {
            const list = getArrests(recensementId);
            const filtered = list.filter(a => a.id !== arrestId);
            dataStore.arrests[recensementId] = filtered;
            await saveData();
            await renderArrests(recensementId);
        } else {
            alert('Erreur lors de la suppression : ' + (data.error || 'Erreur inconnue'));
        }
    } catch (error) {
        console.error('Erreur lors de la suppression de l\'arrestation:', error);
        alert('Erreur de connexion au serveur');
    }
}

async function deleteContravention(contravId, recensementId) {
    if (!hasPermission('delete_reports')) {
        alert('Vous n\'avez pas la permission de supprimer des contraventions.');
        return;
    }
    const list = getContraventions(recensementId);
    const filtered = list.filter(c => c.id !== contravId);
    dataStore.contraventions[recensementId] = filtered;
    saveData().catch(err => console.error('Erreur sauvegarde:', err));
    await renderContraventions(recensementId);
}

async function deletePlainte(plainteId, recensementId) {
    if (!hasPermission('delete_reports')) {
        alert('Vous n\'avez pas la permission de supprimer des plaintes.');
        return;
    }
    const list = getPlaintes(recensementId);
    const filtered = list.filter(p => p.id !== plainteId);
    dataStore.plaintes[recensementId] = filtered;
    saveData().catch(err => console.error('Erreur sauvegarde:', err));
    await renderPlaintes(recensementId);
}

function setModalReadOnly(modalId, readOnly) {
    const modal = document.getElementById(modalId);
    if (!modal) return;

    const inputs = modal.querySelectorAll('input, textarea, select');
    inputs.forEach(el => {
        el.readOnly = readOnly;
        el.disabled = readOnly;
    });

        const saveBtn = modal.querySelector('[id$="SaveBtn"]');
    if (saveBtn) {
        saveBtn.style.display = readOnly ? 'none' : '';
        saveBtn.disabled = readOnly;
    }
}

function viewArrest(arrestId, recensementId) {
    window.location.href = `view-report.html?type=arrestation&id=${arrestId}&recensementId=${recensementId || ''}`;
}

function viewContravention(contravId, recensementId) {
    const list = getContraventions(recensementId);
    const contrav = list.find(c => c.id === contravId);
    if (!contrav) return;

        delete window.__currentEditingContravId;
    delete window.__currentEditingContravRecensementId;

        const rec = window.__currentDetailsRecensement;
    if (!rec) return;

        const sNom = document.getElementById('contravSuspectNom');
    const sJob = document.getElementById('contravSuspectJob');
    const sDob = document.getElementById('contravSuspectDob');
    const sPhone = document.getElementById('contravSuspectPhone');
    const sAddr = document.getElementById('contravSuspectAddress');
    if (sNom) sNom.textContent = contrav.suspect?.nom || rec.prenomNom || '-';
    if (sJob) sJob.textContent = contrav.suspect?.profession || rec.profession || 'N/A';
    if (sDob) sDob.textContent = contrav.suspect?.dob ? formatDate(contrav.suspect.dob) : (rec.dateNaissance ? formatDate(rec.dateNaissance) : '-');
    if (sPhone) sPhone.textContent = contrav.suspect?.telephone || rec.telephone || '-';
    if (sAddr) sAddr.textContent = contrav.suspect?.adresse || rec.adresse || '-';

    const img = document.getElementById('contravSuspectPhoto');
    if (img) {
        if (rec.photo) {
            img.src = rec.photo;
            img.style.display = 'block';
        } else {
            img.style.display = 'none';
        }
    }

        if (document.getElementById('contravTitre')) document.getElementById('contravTitre').value = contrav.titre || '';
    if (document.getElementById('contravNumero')) document.getElementById('contravNumero').textContent = contrav.numero || '';
    if (document.getElementById('contravStatutUP')) document.getElementById('contravStatutUP').value = contrav.statutUP || '';
    if (document.getElementById('contravStatutAmende')) document.getElementById('contravStatutAmende').value = contrav.statutAmende || '';
    if (document.getElementById('contravAmendeType')) document.getElementById('contravAmendeType').value = contrav.amendeType || 'NOMINAL';
    if (document.getElementById('contravTotalAmende')) document.getElementById('contravTotalAmende').value = contrav.totalAmende || '0';
    if (document.getElementById('contravTempsType')) document.getElementById('contravTempsType').value = contrav.tempsType || 'NOMINAL';
    if (document.getElementById('contravTotalTemps')) document.getElementById('contravTotalTemps').value = contrav.totalTemps || '0';

        if (contrav.charges && Array.isArray(contrav.charges)) {
        contrav.charges.forEach((charge, idx) => {
            const i = idx + 1;
            if (document.getElementById(`contravChef${i}`)) document.getElementById(`contravChef${i}`).value = charge.chef || '';
            if (document.getElementById(`contravAmende${i}`)) document.getElementById(`contravAmende${i}`).value = charge.amende || '0';
            if (document.getElementById(`contravTemps${i}`)) document.getElementById(`contravTemps${i}`).value = charge.temps || '0';
        });
    }

        if (contrav.corps) {
        if (document.getElementById('contravDate') && contrav.corps.date) document.getElementById('contravDate').value = contrav.corps.date;
        if (document.getElementById('contravHeure') && contrav.corps.heure) document.getElementById('contravHeure').value = contrav.corps.heure;
        if (document.getElementById('contravPatrouille') && contrav.corps.patrouille) document.getElementById('contravPatrouille').value = contrav.corps.patrouille;
        if (document.getElementById('contravQuartier') && contrav.corps.quartier) document.getElementById('contravQuartier').value = contrav.corps.quartier;
        if (document.getElementById('contravCooperatif') && contrav.corps.cooperatif) document.getElementById('contravCooperatif').value = contrav.corps.cooperatif;
        if (document.getElementById('contravCorpsLibre') && contrav.corps.texte) document.getElementById('contravCorpsLibre').value = contrav.corps.texte;
    }

        const redNom = document.getElementById('contravRedacteurNom');
    const redMat = document.getElementById('contravRedacteurMatricule');
    const redTel = document.getElementById('contravRedacteurTel');
    const redMail = document.getElementById('contravRedacteurMail');
    if (redNom && currentUser) redNom.textContent = currentUser.fullName || '';
    if (redMat && currentUser) redMat.textContent = currentUser.matricule || '';
    if (redTel && currentUser) redTel.textContent = currentUser.telephone || '';
    if (redMail && currentUser) {
        const mail = currentUser.email || (currentUser.fullName || '')
            .toLowerCase()
            .normalize('NFD')
            .replace(/[\u0300-\u036f]/g, '')
            .replace(/\s+/g, '.')
            .replace(/[^a-z0-9.]/g, '') + (currentUser && currentUser.department === 'LSPD' ? '@lspd.us' : '@bcso.us');
        redMail.textContent = mail;
    }

        const locationEl = document.querySelector('.contrav-location');
        if (locationEl && currentUser) {
            const department = currentUser.department || 'BCSO';
            if (department === 'LSPD' || department === 'GOUV') {
                locationEl.textContent = 'Rédigée à Los Santos, San Andreas';
            } else {
                locationEl.textContent = 'Rédigée à Sandy Shore, San Andreas';
            }
        }

        setModalReadOnly('contraventionModal', true);

        const modal = document.getElementById('contraventionModal');
    if (modal) modal.style.display = 'flex';
}

function viewPlainte(plainteId, recensementId) {
    const list = getPlaintes(recensementId);
    const plainte = list.find(p => p.id === plainteId);
    if (!plainte) return;

        delete window.__currentEditingPlainteId;
    delete window.__currentEditingPlainteRecensementId;

        const rec = window.__currentDetailsRecensement;
    if (!rec) return;

        const depNom = document.getElementById('plainteDepNom');
    const depJob = document.getElementById('plainteDepJob');
    const depDob = document.getElementById('plainteDepDob');
    const depPhone = document.getElementById('plainteDepPhone');
    const depAddr = document.getElementById('plainteDepAddress');
    if (depNom) depNom.textContent = plainte.depositaire?.nom || rec.prenomNom || '-';
    if (depJob) depJob.textContent = plainte.depositaire?.profession || rec.profession || 'N/A';
    if (depDob) depDob.textContent = plainte.depositaire?.dob ? formatDate(plainte.depositaire.dob) : (rec.dateNaissance ? formatDate(rec.dateNaissance) : '-');
    if (depPhone) depPhone.textContent = plainte.depositaire?.telephone || rec.telephone || '-';
    if (depAddr) depAddr.textContent = plainte.depositaire?.adresse || rec.adresse || '-';

    const img = document.getElementById('plainteDepPhoto');
    if (img) {
        if (rec.photo) {
            img.src = rec.photo;
            img.style.display = 'block';
        } else {
            img.style.display = 'none';
        }
    }

        if (document.getElementById('plainteTitre')) document.getElementById('plainteTitre').value = plainte.titre || '';
    if (document.getElementById('plainteNumero')) document.getElementById('plainteNumero').textContent = plainte.numero || '';
    if (document.getElementById('plainteMotif')) document.getElementById('plainteMotif').value = plainte.motif || '';
    if (document.getElementById('plainteDateIncident')) document.getElementById('plainteDateIncident').value = plainte.dateIncident || '';
    if (document.getElementById('plainteHeureIncident')) document.getElementById('plainteHeureIncident').value = plainte.heureIncident || '';
    if (document.getElementById('plainteDateRedaction')) document.getElementById('plainteDateRedaction').value = plainte.dateRedaction || '';
    if (document.getElementById('plainteHeureRedaction')) document.getElementById('plainteHeureRedaction').value = plainte.heureRedaction || '';
    if (document.getElementById('plainteCorps')) document.getElementById('plainteCorps').value = plainte.corps || '';

        if (plainte.preuves && Array.isArray(plainte.preuves)) {
        plainte.preuves.forEach((preuve, idx) => {
            if (preuve && idx < 4) {
                const imgEl = document.getElementById(`plainteProofImg${idx + 1}`);
                if (imgEl) {
                    imgEl.src = preuve;
                    imgEl.style.display = 'block';
                }
            }
        });
    }

            const redNom = document.getElementById('plainteRedacteurNom');
    const redMat = document.getElementById('plainteRedacteurMatricule');
    const redTel = document.getElementById('plainteRedacteurTel');
    const redMail = document.getElementById('plainteRedacteurMail');
    if (redNom && currentUser) redNom.textContent = currentUser.fullName || '';
    if (redMat && currentUser) redMat.textContent = currentUser.matricule || '';
    if (redTel && currentUser) redTel.textContent = currentUser.telephone || '';
    if (redMail && currentUser) {
        const mail = currentUser.email || (currentUser.fullName || '')
            .toLowerCase()
            .normalize('NFD')
            .replace(/[\u0300-\u036f]/g, '')
            .replace(/\s+/g, '.')
            .replace(/[^a-z0-9.]/g, '') + (currentUser && currentUser.department === 'LSPD' ? '@lspd.us' : '@bcso.us');
        redMail.textContent = mail;
    }

        const locationEl = document.querySelector('.plainte-location');
        if (locationEl && currentUser) {
            const department = currentUser.department || 'BCSO';
            if (department === 'LSPD' || department === 'GOUV') {
                locationEl.textContent = 'Rédigée à Los Santos, San Andreas';
            } else {
                locationEl.textContent = 'Rédigée à Sandy Shore, San Andreas';
            }
        }

        setModalReadOnly('plainteModal', true);

        document.querySelectorAll('.plainte-proof-btn').forEach(btn => {
        btn.disabled = true;
        btn.style.opacity = '0.5';
        btn.style.cursor = 'not-allowed';
    });

        const modal = document.getElementById('plainteModal');
    if (modal) modal.style.display = 'flex';
}
function editArrest(arrestId, recensementId) {
    const list = getArrests(recensementId);
    const arrest = list.find(a => a.id === arrestId);
    if (!arrest) return;

        window.__currentEditingArrestId = arrestId;
    window.__currentEditingArrestRecensementId = recensementId;

        openRapportArrestationModal();
}

function editContravention(contravId, recensementId) {
    const list = getContraventions(recensementId);
    const contrav = list.find(c => c.id === contravId);
    if (!contrav) return;

        window.__currentEditingContravId = contravId;
    window.__currentEditingContravRecensementId = recensementId;

        openContraventionModal();

        if (document.getElementById('contravTitre')) document.getElementById('contravTitre').value = contrav.titre || '';
    if (document.getElementById('contravNumero')) document.getElementById('contravNumero').textContent = contrav.numero || '';

    }

function editPlainte(plainteId, recensementId) {
    const key = `plaintes_${recensementId}`;
    const list = JSON.parse(localStorage.getItem(key) || '[]');
    const plainte = list.find(p => p.id === plainteId);
    if (!plainte) return;

        window.__currentEditingPlainteId = plainteId;
    window.__currentEditingPlainteRecensementId = recensementId;

        openPlainteModal();

        if (document.getElementById('plainteTitre')) document.getElementById('plainteTitre').value = plainte.titre || '';
    if (document.getElementById('plainteNumero')) document.getElementById('plainteNumero').textContent = plainte.numero || '';
    if (document.getElementById('plainteMotif')) document.getElementById('plainteMotif').value = plainte.motif || '';

    }

const rapportArrestationModal = document.getElementById('rapportArrestationModal');
const arrestAddBtn = document.getElementById('arrestAddBtn');
const arrestSaveBtn = document.getElementById('arrestSaveBtn');
const weaponAddBtn = document.getElementById('weaponAddBtn');
const weaponSaveBtn = document.getElementById('weaponSaveBtn');
const governmentWeaponModal = document.getElementById('governmentWeaponModal');

function closeRapportArrestationModal() {
    if (rapportArrestationModal) {
                setModalReadOnly('rapportArrestationModal', false);
        rapportArrestationModal.style.display = 'none';
    }
}

if (rapportArrestationModal) {
    rapportArrestationModal.addEventListener('click', function(e) {
        if (e.target === rapportArrestationModal) closeRapportArrestationModal();
    });
}

function openRapportArrestationModal() {
    const rec = window.__currentDetailsRecensement;
    if (!rec) return;

        if (!window.__currentEditingArrestId) {
        delete window.__currentEditingArrestId;
        delete window.__currentEditingArrestRecensementId;

                setModalReadOnly('rapportArrestationModal', false);

                const next = getNextArrestNumber();
        const numeroEl = document.getElementById('arrestNumero');
        if (numeroEl) numeroEl.textContent = String(next);
    }

            if (!currentUser) {
        console.error('currentUser n\'est pas défini');
        return;
    }

    const mail = currentUser.email || (currentUser.fullName || '')
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/\s+/g, '.')
        .replace(/[^a-z0-9.]/g, '');

    const redacteurNom = document.getElementById('arrestRedacteurNom');
    const redacteurMat = document.getElementById('arrestRedacteurMatricule');
    const redacteurTel = document.getElementById('arrestRedacteurTel');
    const redacteurMail = document.getElementById('arrestRedacteurMail');
    if (redacteurNom) redacteurNom.textContent = currentUser.fullName || '';
    if (redacteurMat) redacteurMat.textContent = currentUser.matricule || '';
    if (redacteurTel) redacteurTel.textContent = currentUser.telephone || '';
    const emailDomain = currentUser && currentUser.department === 'LSPD' ? '@lspd.us' : currentUser && currentUser.department === 'GOUV' ? '@gouv.us' : '@bcso.us';
    if (redacteurMail) redacteurMail.textContent = currentUser.email || `${mail}${emailDomain}`;

        const arrestLocationEl = document.getElementById('arrestLocation');
    if (arrestLocationEl && currentUser) {
        const department = currentUser.department || 'BCSO';
        if (department === 'LSPD' || department === 'GOUV') {
            arrestLocationEl.textContent = 'Rédigée à Los Santos, San Andreas';
        } else {
            arrestLocationEl.textContent = 'Rédigée à Sandy Shore, San Andreas';
        }
    }

        const title = document.getElementById('arrestTitre');
    if (title) title.value = rec.prenomNom || '';
    const sNom = document.getElementById('arrestSuspectNom');
    const sJob = document.getElementById('arrestSuspectJob');
    const sDob = document.getElementById('arrestSuspectDob');
    const sPhone = document.getElementById('arrestSuspectPhone');
    const sAddr = document.getElementById('arrestSuspectAddress');
    if (sNom) sNom.textContent = rec.prenomNom || '-';
    if (sJob) sJob.textContent = rec.profession || 'N/A';
    if (sDob) sDob.textContent = formatDate(rec.dateNaissance) || '-';
    if (sPhone) sPhone.textContent = rec.telephone || '-';
    if (sAddr) sAddr.textContent = rec.adresse || '-';

    const img = document.getElementById('arrestSuspectPhoto');
    if (img) {
        if (rec.photo) {
            img.src = rec.photo;
            img.style.display = 'block';
        } else {
            img.style.display = 'none';
        }
    }

        window.__arrestCharges = [];
        renderArrestCharges();
        
        const idsToClear = [
        'arrestCorps',
        'arrestAmende',
        'arrestTemps',
        'arrestSaisie',
        'arrestStatutUP',
        'arrestStatutAmende',
    ];
    idsToClear.forEach(id => {
        const el = document.getElementById(id);
        if (el) el.value = '';
    });
    const avocat = document.getElementById('arrestAvocat');
    if (avocat) avocat.value = 'NON';
    const totalType = document.getElementById('arrestTotalType');
    if (totalType) totalType.value = 'NOMINAL';

        const arrest = window.__currentEditingArrestId ? getArrests(rec.id).find(a => a.id === window.__currentEditingArrestId) : null;
    if (arrest) {
        if (document.getElementById('arrestTitre')) document.getElementById('arrestTitre').value = arrest.titre || '';
        if (document.getElementById('arrestNumero')) document.getElementById('arrestNumero').textContent = arrest.numero || '';
        
        let charges = [];
        if (arrest.chargesDetail) {
            try {
                const parsed = typeof arrest.chargesDetail === 'string' ? JSON.parse(arrest.chargesDetail) : arrest.chargesDetail;
                if (Array.isArray(parsed)) {
                    charges = parsed;
                }
            } catch (e) {
                console.log('chargesDetail n\'est pas un JSON valide');
            }
        }
        window.__arrestCharges = charges;
        renderArrestCharges();
        updateArrestTotals();
        
        if (document.getElementById('arrestCorps')) document.getElementById('arrestCorps').value = arrest.corps || '';
        if (document.getElementById('arrestSaisie')) document.getElementById('arrestSaisie').value = arrest.saisie || '';
        if (document.getElementById('arrestStatutUP')) document.getElementById('arrestStatutUP').value = arrest.statutUP || '';
        if (document.getElementById('arrestStatutAmende')) document.getElementById('arrestStatutAmende').value = arrest.statutAmende || '';
        if (document.getElementById('arrestAvocat')) document.getElementById('arrestAvocat').value = arrest.avocat || 'NON';
        const totalType = document.getElementById('arrestTotalType');
        if (totalType) {
            totalType.value = arrest.amendeType || arrest.tempsType || 'NOMINAL';
        }
        
        updateArrestTotals();
    }

    if (rapportArrestationModal) rapportArrestationModal.style.display = 'flex';
}

if (arrestAddBtn) {
    arrestAddBtn.addEventListener('click', function() {
        openRapportArrestationModal();
    });
}

if (weaponAddBtn) {
    weaponAddBtn.addEventListener('click', function(e) {
        e.preventDefault();
        e.stopPropagation();
        const rec = window.__currentDetailsRecensement;
        if (!rec) {
            console.error('Aucun recensement sélectionné');
            return;
        }
        console.log('Ouverture modal arme pour recensement:', rec.id);
        openGovernmentWeaponModal(rec.id);
    });
}

if (weaponSaveBtn) {
    weaponSaveBtn.addEventListener('click', function() {
        saveGovernmentWeapon();
    });
}

if (governmentWeaponModal) {
    governmentWeaponModal.addEventListener('click', function(e) {
        if (e.target === governmentWeaponModal) closeGovernmentWeaponModal();
    });
}

if (arrestSaveBtn) {
    arrestSaveBtn.addEventListener('click', function() {
        const rec = window.__currentDetailsRecensement;
        if (!rec) return;

        const now = new Date();
        const arrest = {
            id: window.__currentEditingArrestId || Date.now().toString(),
            numero: document.getElementById('arrestNumero')?.textContent || '',
            date: formatDate(now.toISOString()),
            heure: `${pad2(now.getHours())}:${pad2(now.getMinutes())}`,
            createur: currentUser && currentUser.matricule && currentUser.fullName 
                ? `${currentUser.matricule} | ${currentUser.fullName}`
                : 'Non défini',
            status: 'Enregistré',
            titre: document.getElementById('arrestTitre')?.value || '',
            avocat: document.getElementById('arrestAvocat')?.value || 'NON',
            amendeType: document.getElementById('arrestTotalType')?.value || 'NOMINAL',
            amende: document.getElementById('arrestAmende')?.value.replace(/\s/g, '') || '0',
            tempsType: document.getElementById('arrestTotalType')?.value || 'NOMINAL',
            temps: document.getElementById('arrestTemps')?.value || '0',
            chefAccusation: '',
            chargesDetail: window.__arrestCharges ? JSON.stringify(window.__arrestCharges) : '',
            charges: window.__arrestCharges || [],
            statutUP: document.getElementById('arrestStatutUP')?.value || '',
            statutAmende: document.getElementById('arrestStatutAmende')?.value || '',
            saisie: document.getElementById('arrestSaisie')?.value || '',
            corps: document.getElementById('arrestCorps')?.value || '',
            suspect: {
                id: rec.id,
                nom: rec.prenomNom,
                prenomNom: rec.prenomNom,
                dob: rec.dateNaissance,
                telephone: rec.telephone,
                adresse: rec.adresse,
                profession: rec.profession,
                photo: rec.photo
            },
            createdAt: window.__currentEditingArrestId ? 
                getArrests(rec.id).find(a => a.id === window.__currentEditingArrestId)?.createdAt || new Date().toISOString() :
                new Date().toISOString(),
        };

        const list = getArrests(rec.id);

                if (!window.__currentEditingArrestId) {
            arrest.numero = String(getNextArrestNumber());
        }

        if (window.__currentEditingArrestId) {
                        const index = list.findIndex(a => a.id === window.__currentEditingArrestId);
            if (index !== -1) {
                list[index] = arrest;
            }
            delete window.__currentEditingArrestId;
            delete window.__currentEditingArrestRecensementId;
        } else {
                        list.push(arrest);
        }

        dataStore.arrests[rec.id] = list;
        saveData().catch(err => console.error('Erreur sauvegarde:', err));

        const wasEditing = !!window.__currentEditingArrestId;
        if (wasEditing) {
            delete window.__currentEditingArrestId;
            delete window.__currentEditingArrestRecensementId;
        }

        renderArrests(rec.id).then(() => {
            closeRapportArrestationModal();
            alert(wasEditing ? "Rapport d'arrestation modifié !" : "Rapport d'arrestation enregistré !");
        });

                if (!wasEditing && currentUser && currentUser.department) {
            console.log('Envoi webhook arrestation - suspect:', arrest.suspect);
            console.log('Envoi webhook arrestation - rec.prenomNom:', rec.prenomNom);
            fetch('/api/webhooks/arrestation', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    arrest,
                    suspect: arrest.suspect,
                    redacteur: {
                        matricule: currentUser.matricule,
                        fullName: currentUser.fullName
                    },
                    department: currentUser.department
                }),
                credentials: 'include'
            }).catch(err => console.error('Erreur webhook arrestation:', err));
        }
    });
}

async function renderPlaintes(recensementId) {
    const container = document.getElementById('plainteContent');
    const countEl = document.getElementById('plainteCount');
    if (!container || !countEl) return;

    if (currentUser && currentUser.department) {
        try {
            await loadFromSharedFile();
        } catch (e) {
            console.error('Erreur lors du rechargement des données:', e);
        }
    }

    const list = getPlaintes(recensementId);
    countEl.textContent = `Nombre total de Plainte : ${list.length}`;

    if (list.length === 0) {
        container.innerHTML = '<div class="details-empty-large">N/A</div>';
        return;
    }

    container.innerHTML = list
        .slice()
        .reverse()
        .map(p => {
            const numero = p.numero || '-';
            const motif = p.motif || '-';
            const date = p.dateRedaction || p.date || '-';
            const createur = p.createur || '-';
            const deleteBtnHtml = hasPermission('delete_reports') 
                ? `<button class="details-arrest-action delete" data-plainte-id="${p.id}" data-recensement-id="${recensementId}">🗑</button>`
                : '';
            return `
                <div class="details-arrest-item">
                    <div class="details-arrest-item-header">
                        <span class="details-arrest-number">Plainte : ${numero}</span>
                        <div class="details-arrest-actions">
                            <button class="details-arrest-action view" data-plainte-id="${p.id}" data-recensement-id="${recensementId}" title="Voir le rapport">👁</button>
                            <button class="details-arrest-action edit" data-plainte-id="${p.id}" data-recensement-id="${recensementId}">✎</button>
                            ${deleteBtnHtml}
                        </div>
                    </div>
                    <div class="details-arrest-info">Motif : ${motif}</div>
                    <div class="details-arrest-info">Date : ${date}</div>
                    <div class="details-arrest-info">Créer par : ${createur}</div>
                    <div class="details-arrest-status">Enregistrée</div>
                </div>
            `;
        })
        .join('');

        container.querySelectorAll('.details-arrest-action.view').forEach(btn => {
        btn.addEventListener('click', function() {
            const plainteId = this.dataset.plainteId;
            const recensementId = this.dataset.recensementId;
            viewPlainte(plainteId, recensementId);
        });
    });

    container.querySelectorAll('.details-arrest-action.edit').forEach(btn => {
        btn.addEventListener('click', function() {
            const plainteId = this.dataset.plainteId;
            const recensementId = this.dataset.recensementId;
            editPlainte(plainteId, recensementId);
        });
    });

    container.querySelectorAll('.details-arrest-action.delete').forEach(btn => {
        btn.addEventListener('click', function() {
            const plainteId = this.dataset.plainteId;
            const recensementId = this.dataset.recensementId;
            if (confirm('Êtes-vous sûr de vouloir supprimer cette plainte ?')) {
                deletePlainte(plainteId, recensementId).catch(err => console.error('Erreur lors de la suppression:', err));
            }
        });
    });

        if (!hasPermission('delete_reports')) {
        container.querySelectorAll('.details-arrest-action.delete').forEach(btn => {
            btn.style.display = 'none';
        });
    }
    
    if (!isBCSO_EM()) {
        container.querySelectorAll('.details-arrest-action.edit').forEach(btn => {
            btn.style.display = 'none';
        });
    }
}

const contraventionModal = document.getElementById('contraventionModal');
const contraventionAddBtn = document.getElementById('contraventionAddBtn');
const contravSaveBtn = document.getElementById('contravSaveBtn');

function closeContraventionModal() {
    if (contraventionModal) {
                setModalReadOnly('contraventionModal', false);
        contraventionModal.style.display = 'none';
    }
}

if (contraventionModal) {
    contraventionModal.addEventListener('click', function(e) {
        if (e.target === contraventionModal) closeContraventionModal();
    });
}

function openContraventionModal() {
    const rec = window.__currentDetailsRecensement;
    if (!rec) return;

        if (!window.__currentEditingContravId) {
        delete window.__currentEditingContravId;
        delete window.__currentEditingContravRecensementId;

                setModalReadOnly('contraventionModal', false);

        const next = getNextContraventionNumber();
        const numeroEl = document.getElementById('contravNumero');
        if (numeroEl) numeroEl.textContent = String(next);
    }

            if (!currentUser) {
        console.error('currentUser n\'est pas défini');
        return;
    }

    const mail = currentUser.email || (currentUser.fullName || '')
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/\s+/g, '.')
        .replace(/[^a-z0-9.]/g, '');

    const redacteurNom = document.getElementById('contravRedacteurNom');
    const redacteurMat = document.getElementById('contravRedacteurMatricule');
    const redacteurTel = document.getElementById('contravRedacteurTel');
    const redacteurMail = document.getElementById('contravRedacteurMail');
    if (redacteurNom) redacteurNom.textContent = currentUser.fullName || '';
    if (redacteurMat) redacteurMat.textContent = currentUser.matricule || '';
    if (redacteurTel) redacteurTel.textContent = currentUser.telephone || '';
    const emailDomain = currentUser && currentUser.department === 'LSPD' ? '@lspd.us' : currentUser && currentUser.department === 'GOUV' ? '@gouv.us' : '@bcso.us';
    if (redacteurMail) redacteurMail.textContent = currentUser.email || `${mail}${emailDomain}`;

        const title = document.getElementById('contravTitre');
    if (title) title.value = rec.prenomNom || '';
    const sNom = document.getElementById('contravSuspectNom');
    const sJob = document.getElementById('contravSuspectJob');
    const sDob = document.getElementById('contravSuspectDob');
    const sPhone = document.getElementById('contravSuspectPhone');
    const sAddr = document.getElementById('contravSuspectAddress');
    if (sNom) sNom.textContent = rec.prenomNom || '-';
    if (sJob) sJob.textContent = rec.profession || 'N/A';
    if (sDob) sDob.textContent = formatDate(rec.dateNaissance) || '-';
    if (sPhone) sPhone.textContent = rec.telephone || '-';
    if (sAddr) sAddr.textContent = rec.adresse || '-';

    const img = document.getElementById('contravSuspectPhoto');
    if (img) {
        if (rec.photo) {
            img.src = rec.photo;
            img.style.display = 'block';
        } else {
            img.style.display = 'none';
        }
    }

        const now = new Date();
    const dateInput = document.getElementById('contravDate');
    const timeInput = document.getElementById('contravHeure');
    if (dateInput) dateInput.value = toDateInputValue(now);
    if (timeInput) timeInput.value = toTimeInputValue(now);

        const clearIds = [
        'contravChef1','contravChef2','contravChef3','contravChef4','contravChef5','contravChef6',
        'contravAmende1','contravAmende2','contravAmende3','contravAmende4','contravAmende5','contravAmende6',
        'contravTemps1','contravTemps2','contravTemps3','contravTemps4','contravTemps5','contravTemps6',
        'contravTotalAmende','contravTotalTemps',
        'contravPatrouille','contravQuartier','contravCorpsLibre'
    ];
    clearIds.forEach(id => {
        const el = document.getElementById(id);
        if (el) el.value = '';
    });
    const coop = document.getElementById('contravCooperatif');
    if (coop) coop.value = '';
    const stUp = document.getElementById('contravStatutUP');
    if (stUp) stUp.value = '';
    const stAm = document.getElementById('contravStatutAmende');
    if (stAm) stAm.value = '';
    const amType = document.getElementById('contravAmendeType');
    if (amType) amType.value = 'NOMINAL';
    const tType = document.getElementById('contravTempsType');
    if (tType) tType.value = 'NOMINAL';

    if (contraventionModal) contraventionModal.style.display = 'flex';
}

if (contraventionAddBtn) {
    contraventionAddBtn.addEventListener('click', function() {
        openContraventionModal();
    });
}

if (contravSaveBtn) {
    contravSaveBtn.addEventListener('click', function() {
        const rec = window.__currentDetailsRecensement;
        if (!rec) return;

        const now = new Date();
        let numero = document.getElementById('contravNumero')?.textContent || '';
                if (!numero || numero === '') {
            numero = String(getNextContraventionNumber());
        }
        const createur = currentUser && currentUser.matricule && currentUser.fullName 
            ? `${currentUser.matricule} | ${currentUser.fullName}`
            : 'Non défini';
        const date = formatDate(now.toISOString());

        const contrav = {
            id: window.__currentEditingContravId || Date.now().toString(),
            numero,
            titre: document.getElementById('contravTitre')?.value || '',
            date,
            createur,
            statutUP: document.getElementById('contravStatutUP')?.value || '',
            statutAmende: document.getElementById('contravStatutAmende')?.value || '',
            amendeType: document.getElementById('contravAmendeType')?.value || 'NOMINAL',
            totalAmende: document.getElementById('contravTotalAmende')?.value || '0',
            tempsType: document.getElementById('contravTempsType')?.value || 'NOMINAL',
            totalTemps: document.getElementById('contravTotalTemps')?.value || '0',
            charges: [1,2,3,4,5,6].map(i => ({
                chef: document.getElementById(`contravChef${i}`)?.value || '',
                amende: document.getElementById(`contravAmende${i}`)?.value || '0',
                temps: document.getElementById(`contravTemps${i}`)?.value || '0',
            })),
            corps: {
                date: document.getElementById('contravDate')?.value || '',
                heure: document.getElementById('contravHeure')?.value || '',
                patrouille: document.getElementById('contravPatrouille')?.value || '',
                quartier: document.getElementById('contravQuartier')?.value || '',
                cooperatif: document.getElementById('contravCooperatif')?.value || '',
                texte: document.getElementById('contravCorpsLibre')?.value || '',
            },
            suspect: {
                id: rec.id,
                nom: rec.prenomNom,
                dob: rec.dateNaissance,
                telephone: rec.telephone,
                adresse: rec.adresse,
                profession: rec.profession,
            },
            createdAt: window.__currentEditingContravId ? 
                JSON.parse(localStorage.getItem(`contraventions_${rec.id}`) || '[]').find(c => c.id === window.__currentEditingContravId)?.createdAt || new Date().toISOString() :
                new Date().toISOString(),
        };

        const list = getContraventions(rec.id);

                if (!window.__currentEditingContravId) {
            contrav.numero = String(getNextContraventionNumber());
        }

        const wasEditing = !!window.__currentEditingContravId;
        if (wasEditing) {
                        const index = list.findIndex(c => c.id === window.__currentEditingContravId);
            if (index !== -1) {
                list[index] = contrav;
            }
            delete window.__currentEditingContravId;
            delete window.__currentEditingContravRecensementId;
        } else {
                        list.push(contrav);
        }

        dataStore.contraventions[rec.id] = list;
        saveData().catch(err => console.error('Erreur sauvegarde:', err));

        renderContraventions(rec.id).then(() => {
            closeContraventionModal();
            alert(wasEditing ? "Contravention modifiée !" : "Contravention enregistrée !");
        });
    });
}

const plainteModal = document.getElementById('plainteModal');
const plainteAddBtn = document.getElementById('plainteAddBtn');
const plainteSaveBtn = document.getElementById('plainteSaveBtn');
let __plainteProofs = [null, null, null, null];

function closePlainteModal() {
    if (plainteModal) {
                setModalReadOnly('plainteModal', false);
                document.querySelectorAll('.plainte-proof-btn').forEach(btn => {
            btn.disabled = false;
            btn.style.opacity = '1';
            btn.style.cursor = 'pointer';
        });
        plainteModal.style.display = 'none';
    }
}

if (plainteModal) {
    plainteModal.addEventListener('click', function(e) {
        if (e.target === plainteModal) closePlainteModal();
    });
}

function openPlainteModal() {
    const rec = window.__currentDetailsRecensement;
    if (!rec) return;

        if (!window.__currentEditingPlainteId) {
        delete window.__currentEditingPlainteId;
        delete window.__currentEditingPlainteRecensementId;

                setModalReadOnly('plainteModal', false);

                document.querySelectorAll('.plainte-proof-btn').forEach(btn => {
            btn.disabled = false;
            btn.style.opacity = '1';
            btn.style.cursor = 'pointer';
        });

        const next = getNextPlainteNumber();
        const numeroEl = document.getElementById('plainteNumero');
        if (numeroEl) numeroEl.textContent = String(next);
    }

            if (!currentUser) {
        console.error('currentUser n\'est pas défini');
        return;
    }

    const mail = currentUser.email || (currentUser.fullName || '')
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/\s+/g, '.')
        .replace(/[^a-z0-9.]/g, '');

    const redacteurNom = document.getElementById('plainteRedacteurNom');
    const redacteurMat = document.getElementById('plainteRedacteurMatricule');
    const redacteurTel = document.getElementById('plainteRedacteurTel');
    const redacteurMail = document.getElementById('plainteRedacteurMail');
    if (redacteurNom) redacteurNom.textContent = currentUser.fullName || '';
    if (redacteurMat) redacteurMat.textContent = currentUser.matricule || '';
    if (redacteurTel) redacteurTel.textContent = currentUser.telephone || '';
    const emailDomain = currentUser && currentUser.department === 'LSPD' ? '@lspd.us' : currentUser && currentUser.department === 'GOUV' ? '@gouv.us' : '@bcso.us';
    if (redacteurMail) redacteurMail.textContent = currentUser.email || `${mail}${emailDomain}`;

        const title = document.getElementById('plainteTitre');
    if (title) title.value = rec.prenomNom || '';
    const dNom = document.getElementById('plainteDepNom');
    const dJob = document.getElementById('plainteDepJob');
    const dDob = document.getElementById('plainteDepDob');
    const dPhone = document.getElementById('plainteDepPhone');
    const dAddr = document.getElementById('plainteDepAddress');
    if (dNom) dNom.textContent = rec.prenomNom || '-';
    if (dJob) dJob.textContent = rec.profession || 'N/A';
    if (dDob) dDob.textContent = formatDate(rec.dateNaissance) || '-';
    if (dPhone) dPhone.textContent = rec.telephone || '-';
    if (dAddr) dAddr.textContent = rec.adresse || '-';

    const img = document.getElementById('plainteDepPhoto');
    if (img) {
        if (rec.photo) {
            img.src = rec.photo;
            img.style.display = 'block';
        } else {
            img.style.display = 'none';
        }
    }

        const now = new Date();
    const di = document.getElementById('plainteDateIncident');
    const hi = document.getElementById('plainteHeureIncident');
    const dr = document.getElementById('plainteDateRedaction');
    const hr = document.getElementById('plainteHeureRedaction');
    if (di) di.value = toDateInputValue(now);
    if (hi) hi.value = toTimeInputValue(now);
    if (dr) dr.value = toDateInputValue(now);
    if (hr) hr.value = toTimeInputValue(now);

    const motif = document.getElementById('plainteMotif');
    if (motif) motif.value = '';
    const corps = document.getElementById('plainteCorps');
    if (corps) corps.value = '';

        __plainteProofs = [null, null, null, null];
    for (let i = 1; i <= 4; i++) {
        const imgEl = document.getElementById(`plainteProofImg${i}`);
        if (imgEl) imgEl.style.display = 'none';
    }

    if (plainteModal) plainteModal.style.display = 'flex';
}

if (plainteAddBtn) {
    plainteAddBtn.addEventListener('click', function() {
        openPlainteModal();
    });
}

document.querySelectorAll('.plainte-proof-btn').forEach(btn => {
    btn.addEventListener('click', function() {
        const idx = Number(this.dataset.proof || '0');
        if (!idx) return;
        const input = document.getElementById(`plainteProof${idx}`);
        if (input) input.click();
    });
});

for (let i = 1; i <= 4; i++) {
    const input = document.getElementById(`plainteProof${i}`);
    if (!input) continue;
    input.addEventListener('change', function(e) {
        const file = e.target.files && e.target.files[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = function(ev) {
            __plainteProofs[i - 1] = ev.target.result;
            const imgEl = document.getElementById(`plainteProofImg${i}`);
            if (imgEl) {
                imgEl.src = ev.target.result;
                imgEl.style.display = 'block';
            }
        };
        reader.readAsDataURL(file);
    });
}

if (plainteSaveBtn) {
    plainteSaveBtn.addEventListener('click', async function() {
        const rec = window.__currentDetailsRecensement;
        if (!rec) return;

        let numero = document.getElementById('plainteNumero')?.textContent || '';
                if (!numero || numero === '') {
            numero = String(getNextPlainteNumber());
        }
        const createur = currentUser && currentUser.matricule && currentUser.fullName 
            ? `${currentUser.matricule} | ${currentUser.fullName}`
            : 'Non défini';

                const preuvesUploaded = [];
        for (const preuve of __plainteProofs) {
            if (preuve) {
                const uploaded = await uploadImageBase64(preuve);
                preuvesUploaded.push(uploaded);
            }
        }

        const plainte = {
            id: window.__currentEditingPlainteId || Date.now().toString(),
            numero,
            titre: document.getElementById('plainteTitre')?.value || '',
            motif: document.getElementById('plainteMotif')?.value || '',
            dateIncident: document.getElementById('plainteDateIncident')?.value || '',
            heureIncident: document.getElementById('plainteHeureIncident')?.value || '',
            dateRedaction: document.getElementById('plainteDateRedaction')?.value || '',
            heureRedaction: document.getElementById('plainteHeureRedaction')?.value || '',
            corps: document.getElementById('plainteCorps')?.value || '',
            preuves: preuvesUploaded,
            createur,
            depositaire: {
                id: rec.id,
                nom: rec.prenomNom,
                dob: rec.dateNaissance,
                telephone: rec.telephone,
                adresse: rec.adresse,
                profession: rec.profession,
            },
            createdAt: window.__currentEditingPlainteId ? 
                getPlaintes(rec.id).find(p => p.id === window.__currentEditingPlainteId)?.createdAt || new Date().toISOString() :
                new Date().toISOString(),
        };

        const list = getPlaintes(rec.id);

                if (!window.__currentEditingPlainteId) {
            plainte.numero = String(getNextPlainteNumber());
        }

        const wasEditing = !!window.__currentEditingPlainteId;
        if (wasEditing) {
                        const index = list.findIndex(p => p.id === window.__currentEditingPlainteId);
            if (index !== -1) {
                list[index] = plainte;
            }
            delete window.__currentEditingPlainteId;
            delete window.__currentEditingPlainteRecensementId;
        } else {
                        list.push(plainte);
        }

        dataStore.plaintes[rec.id] = list;
        saveData().catch(err => console.error('Erreur sauvegarde:', err));

        await renderPlaintes(rec.id);
        closePlainteModal();
        alert(wasEditing ? "Plainte modifiée !" : "Plainte enregistrée !");
    });
}

const parametresBtn = document.getElementById('parametresBtn');
const parametresModal = document.getElementById('parametresModal');

if (parametresBtn) {
    parametresBtn.addEventListener('click', async function() {
                await reloadUserInfo();
        updateUserInfo();
        parametresModal.style.display = 'flex';
    });
}

function closeParametresModal() {
    parametresModal.style.display = 'none';
}

if (parametresModal) {
    parametresModal.addEventListener('click', function(e) {
        if (e.target === parametresModal) {
            closeParametresModal();
        }
    });
}

const profilePhotoInput = document.getElementById('profilePhotoInput');
const profilePhotoImg = document.getElementById('profilePhotoImg');
const profilePhotoPlaceholder = document.getElementById('profilePhotoPlaceholder');
const profilePhotoContainer = document.getElementById('profilePhotoContainer');

if (profilePhotoContainer) {
    profilePhotoContainer.addEventListener('click', function() {
        profilePhotoInput.click();
    });
}

if (profilePhotoInput) {
    profilePhotoInput.addEventListener('change', function(e) {
        const file = e.target.files[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = function(event) {
                const img = document.getElementById('profilePhotoImg');
                const placeholder = document.getElementById('profilePhotoPlaceholder');
                if (img && placeholder) {
                    img.src = event.target.result;
                    img.style.display = 'block';
                    img.style.visibility = 'visible';
                    img.style.opacity = '1';
                    placeholder.style.display = 'none';
                }
            };
            reader.readAsDataURL(file);
        }
    });
}

async function saveParametres() {
    const prenomNom = document.getElementById('prenomNomInput').value;
    const matricule = document.getElementById('matriculeInput').value;
    const telephone = document.getElementById('telephoneInput').value;
    const rib = document.getElementById('ribInput').value;
    const division = document.getElementById('divisionInput').value;

    const profilePhotoImg = document.getElementById('profilePhotoImg');
    let profilePhoto = null;
    
    if (profilePhotoImg && profilePhotoImg.src) {
        const src = profilePhotoImg.src.trim();
        if (src && src.startsWith('data:image')) {
            profilePhoto = await uploadImageBase64(src);
            console.log('Photo de profil uploadée:', profilePhoto);
        } else if (src && (src.startsWith('http') || src.startsWith('/')) && src !== window.location.href) {
            profilePhoto = src;
            console.log('Photo de profil existante capturée:', src.substring(0, 50));
        }
    }

    try {
                const response = await fetch('/api/auth/settings', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                fullName: prenomNom,
                matricule: matricule,
                telephone: telephone,
                rib: rib,
                division: division,
                profilePhoto: profilePhoto
            })
        });

        const data = await response.json();

        if (response.ok) {
                        const checkResponse = await fetch('/api/auth/check', {
                cache: 'no-store',
                credentials: 'include'
            });
            const checkData = await checkResponse.json();

            if (checkData.authenticated && checkData.user) {
                currentUser = checkData.user;
            } else {
                                if (currentUser) {
                    currentUser.fullName = prenomNom;
                    currentUser.matricule = matricule;
                    currentUser.telephone = telephone;
                    currentUser.rib = rib;
                    currentUser.division = division;
                    if (profilePhoto) {
                        currentUser.profilePhoto = profilePhoto;
                    }
                }
            }

                        const userName = document.querySelector('.user-name');
            if (userName && currentUser) {
                userName.textContent = `${currentUser.matricule} | ${currentUser.fullName}`;
            }

                        updateUserInfo();
            applyRolePermissions();

                        alert('Paramètres enregistrés avec succès !');

                        closeParametresModal();
        } else {
            alert('Erreur lors de la sauvegarde : ' + (data.error || 'Erreur inconnue'));
        }
    } catch (error) {
        console.error('Erreur lors de la sauvegarde des paramètres:', error);
        alert('Erreur de connexion au serveur');
    }

        closeParametresModal();
}

window.addEventListener('DOMContentLoaded', function() {
    if (currentUser && currentUser.profilePhoto && profilePhotoImg) {
        profilePhotoImg.src = currentUser.profilePhoto;
        profilePhotoImg.style.display = 'block';
        profilePhotoPlaceholder.style.display = 'none';
    }
    
    updateUserInfo();

    const savedPrenomNom = localStorage.getItem('userPrenomNom');
    const savedMatricule = localStorage.getItem('userMatricule');
    const savedTelephone = localStorage.getItem('userTelephone');
    const savedRIB = localStorage.getItem('userRIB');
    const savedDiscord = localStorage.getItem('userDiscord');
    const savedDivision = localStorage.getItem('userDivision');

    if (savedPrenomNom) document.getElementById('prenomNomInput').value = savedPrenomNom;
    if (savedMatricule) document.getElementById('matriculeInput').value = savedMatricule;
    if (savedTelephone) document.getElementById('telephoneInput').value = savedTelephone;
    if (savedRIB) document.getElementById('ribInput').value = savedRIB;
    if (savedDiscord) document.getElementById('discordInput').value = savedDiscord;
    if (savedDivision) document.getElementById('divisionInput').value = savedDivision;
});

const calculateurPeineBtn = document.getElementById('calculateurPeineBtn');
const calculateurPeineModal = document.getElementById('calculateurPeineModal');

let infractionsDB = {
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
        { description: 'Braquage LTD', amende: 2500, temps: '00:10' },
        { description: 'Cambriolage', amende: 5500, temps: '00:10' },
        { description: 'Diffamation', amende: 2000, temps: '00:05' },
        { description: 'Délit de fuite', amende: 4000, temps: '00:10' },
        { description: 'Dégradation de bien public', amende: 2000, temps: '00:10' },
        { description: 'Dégradation de bien privé', amende: 2500, temps: '00:15' },
        { description: 'Entrave à la circulation', amende: 4000, temps: '00:10' },
        { description: 'Entrave à une opération de police mineure', amende: 2000, temps: '00:05' },
        { description: 'Exhibition d\'armes', amende: 6000, temps: '00:10' },
        { description: 'Exhibition sexuelle à la vue d\'autrui', amende: 3000, temps: '00:10' },
        { description: 'Harcèlement', amende: 5000, temps: '00:15' },
        { description: 'Go-fast', amende: 3000, temps: '00:20', special: 'Saisie des biens et du véhicule (fourrière) | Rapport d\'arrestation' },
        { description: 'Mauvaise usage d\'une arme blanche', amende: 1200, temps: '00:05', special: 'Rapport d\'arrestation & saisie de l\'arme blanche (retrait du PPA en cas de possession)' },
        { description: 'Menace de mort ou grave', amende: 10000, temps: '00:10' },
        { description: 'Menace mineure ou intimidation', amende: 2000, temps: '00:10' },
        { description: 'Menace / intimidation en ligne', amende: 3000, temps: '00:15' },
        { description: 'Mise en danger de la vie d\'autrui', amende: 4000, temps: '00:10' },
        { description: 'Non-assistance à personne en danger', amende: 5000, temps: '00:15' },
        { description: 'Non présentation de documents officiels', amende: 2500, temps: '00:10' },
        { description: 'Non présentation à une convocation de police', amende: 1500, temps: '00:20' },
        { description: 'Outrage à agent', amende: 2500, temps: '00:10' },
        { description: 'Discrimination', amende: 3000, temps: '00:20' },
        { description: 'Intrusion dans une zone à accès restreint', amende: 2000, temps: '00:10' },
        { description: 'Piratage ATM', amende: 2000, temps: '00:10' },
        { description: 'Plan mule', amende: 5000, temps: '00:15', special: 'Retrait du permis de conduire toutes catégories | Rapport d\'arrestation' },
        { description: 'Possession d\'un gilet pare-balles sans PPA professionnel', amende: 2000, temps: '00:10' },
        { description: 'Possession de Cannabis', amende: 100, temps: '00:10' },
        { description: 'Possession de Cocaine', amende: 150, temps: '00:15' },
        { description: 'Possession de Crack', amende: 200, temps: '00:20' },
        { description: 'Possession de Méthamphétamine', amende: 200, temps: '00:20' },
        { description: 'Possession d\'Ectasy', amende: 250, temps: '00:20' },
        { description: 'Possession d\'Opium', amende: 200, temps: '00:20' },
        { description: 'Possession de Purple', amende: 110, temps: '00:10' },
        { description: 'Possession de Salvia', amende: 120, temps: '00:10' },
        { description: 'Possession de produit illégal', amende: 75, temps: '00:10' },
        { description: 'Possession de contrebande', amende: 100, temps: '00:10' },
        { description: 'Possession d\'arme de jet / de grenade', amende: 350, temps: '00:05' },
        { description: 'Possession d\'argent > 10.000$', amende: 0, temps: '00:00' },
        { description: 'Possession de munition illégale', amende: 20, temps: '00:05' },
        { description: 'Refus d\'obtempérer', amende: 3000, temps: '00:10' },
        { description: 'Regroupement non autorisé', amende: 3500, temps: '00:05' },
        { description: 'Résistance à une arrestation', amende: 1500, temps: '00:10' },
        { description: 'Transport de Drogue', amende: 3500, temps: '00:10' },
        { description: 'Trouble à l\'ordre public', amende: 5000, temps: '00:15' },
        { description: 'Vente de drogue', amende: 1000, temps: '00:05' },
        { description: 'Violation de domicile', amende: 2000, temps: '00:10' },
        { description: 'Vol de véhicule', amende: 2000, temps: '00:05' },
        { description: 'Vol de véhicule de l\'Etat', amende: 4000, temps: '00:10' },
        { description: 'Vol de biens', amende: 1500, temps: '00:05', special: 'Saisie des biens | Rapport d\'arrestation' }
    ],
    'Délit majeur': [
        { description: 'Achat/vente d\'arme', amende: 50000, temps: '00:40' },
        { description: 'Agression à l\'arme blanche', amende: 7500, temps: '00:15' },
        { description: 'Agression sur agent de l\'État', amende: 8000, temps: '00:20' },
        { description: 'Agression sur civil', amende: 6500, temps: '00:15' },
        { description: 'Association de malfaiteurs', amende: 9000, temps: '00:25' },
        { description: 'Blanchiment', amende: 10000, temps: '00:15' },
        { description: 'Braquage d\'armurerie', amende: 6000, temps: '00:20' },
        { description: 'Braquage à main armé sur citoyen', amende: 8000, temps: '00:20' },
        { description: 'Braquage à main armé sur agent dépositaire de l\'autorité publique', amende: 10000, temps: '00:25' },
        { description: 'Braquage de la Banque Fleeca', amende: 15000, temps: '00:20' },
        { description: 'Braquage de la Banque Paleto', amende: 15000, temps: '00:20' },
        { description: 'Braquage de Bijouterie', amende: 30000, temps: '00:35' },
        { description: 'Braquage de convoi d\'arme', amende: 20000, temps: '00:25' },
        { description: 'Braquage de convoi fédéral', amende: 20000, temps: '00:30' },
        { description: 'Braquage de véhicule transporteur de fonds', amende: 20000, temps: '00:25' },
        { description: 'Destruction / dissimulation de preuve', amende: 8000, temps: '00:25' },
        { description: 'Diffusion de contenu illégal en ligne', amende: 8000, temps: '00:20' },
        { description: 'Collaboration avec un Etat / Organisation hostile', amende: 30000, temps: '00:45' },
        { description: 'Entrave à une opération / enquête de police', amende: 8000, temps: '00:15' },
        { description: 'Fabrication de stupéfiant', amende: 10000, temps: '00:20' },
        { description: 'Intrusion illégale sur le territoire étatique', amende: 20000, temps: '00:30' },
        { description: 'Mauvaise utilisation d\'une arme à feu avec PPA', amende: 20000, temps: '00:25' },
        { description: 'Multirécidivisme', amende: 100000, temps: '01:00' },
        { description: 'Non présentation injustifiée à une convocation judiciaire', amende: 50000, temps: '00:30' },
        { description: 'Obstruction à la justice', amende: 20000, temps: '00:20' },
        { description: 'Outrage à magistrat', amende: 15000, temps: '00:20' },
        { description: 'Parjure', amende: 40000, temps: '00:30' },
        { description: 'Possession d\'arme blanche illégale sans PPA', amende: 5000, temps: '00:10' },
        { description: 'Possession / Usage de faux', amende: 25000, temps: '00:15' },
        { description: 'Possession d\'arme de catégorie D (Pistolet céramique, Beretta, SNS, Glock 17) sans PPA', amende: 30000, temps: '00:25' },
        { description: 'Possession d\'arme de catégorie B (SMG, Tec-9, MP5K MK2, Assaut SMG, HKUMP)', amende: 50000, temps: '00:35' },
        { description: 'Prise d\'otage sur agent de l\'état', amende: 15000, temps: '00:20' },
        { description: 'Prise d\'otage sur civil', amende: 7500, temps: '00:10' },
        { description: 'Tentative de Corruption', amende: 10000, temps: '00:25' },
        { description: 'Tir sur civil', amende: 20000, temps: '00:25' },
        { description: 'Tir sur agent de l\'état', amende: 30000, temps: '00:35' },
        { description: 'Usurpation de fonction', amende: 10000, temps: '00:30' },
        { description: 'Usurpation d\'identité', amende: 10000, temps: '00:25' }
    ],
    'Crime': [
        { description: 'Abus de confiance', amende: 45000, temps: '00:40' },
        { description: 'Atteinte à l\'intégrité physique', amende: 20000, temps: '00:20' },
        { description: 'Atteinte à la sécurité intérieure', amende: 300000, temps: '01:00' },
        { description: 'Braquage de la Pacific Standard', amende: 100000, temps: '00:40' },
        { description: 'Braquage de la plateforme pétrolière', amende: 95000, temps: '00:35' },
        { description: 'Cavale', amende: 300000, temps: '01:00' },
        { description: 'Corruption', amende: 100000, temps: '01:00' },
        { description: 'Détournement de fonds', amende: 60000, temps: '00:40' },
        { description: 'Organisation d\'évasion', amende: 150000, temps: '01:00' },
        { description: 'Extorsion de fonds', amende: 100000, temps: '01:00' },
        { description: 'Fabrication de faux', amende: 300000, temps: '01:00' },
        { description: 'Fraude fiscale', amende: 50000, temps: '01:00' },
        { description: 'Kidnapping / Séquestration / Viol', amende: 60000, temps: '01:00' },
        { description: 'Meurtre sur civil', amende: 500000, temps: '150:00' },
        { description: 'Meurtre sur agent de l\'état', amende: 1000000, temps: '168:00' },
        { description: 'Possession d\'arme de catégorie A (AK-47, AK-U, Thompson)', amende: 150000, temps: '01:00' },
        { description: 'Possession d\'arme de catégorie C (Canon Scié, Fusil à...)', amende: 100000, temps: '00:50' },
        { description: 'Terrorisme', amende: 1000000, temps: '168:00' },
        { description: 'Trafic d\'armes', amende: 300000, temps: '01:00' },
        { description: 'Violation de secret professionnel / Droit de réserve', amende: 100000, temps: '01:00' }
    ]
};

if (calculateurPeineBtn) {
    calculateurPeineBtn.addEventListener('click', async function() {
        calculateurPeineModal.style.display = 'flex';
        await loadInfractionsFromAPI();
        initializeCalculateurPeine();
    });
}

function closeCalculateurPeineModal() {
    if (calculateurPeineModal) {
        calculateurPeineModal.style.display = 'none';
    }
}

if (calculateurPeineModal) {
    calculateurPeineModal.addEventListener('click', function(e) {
        if (e.target === calculateurPeineModal) {
            closeCalculateurPeineModal();
        }
    });
}

async function initializeCalculateurPeine() {
    await loadInfractionsFromAPI();
    const dateInput = document.getElementById('calculateurDate');
    if (dateInput && !dateInput.value) {
        const today = new Date();
        const day = String(today.getDate()).padStart(2, '0');
        const month = String(today.getMonth() + 1).padStart(2, '0');
        const year = today.getFullYear();
        dateInput.value = `${day}/${month}/${year}`;
    }
    
    const tableBody = document.getElementById('calculateurPeineTableBody');
    if (!tableBody) return;
    
    tableBody.innerHTML = '';
    
    for (let i = 0; i < 12; i++) {
        const row = document.createElement('tr');
        row.innerHTML = `
            <td>
                <select class="infraction-type-select" data-row="${i}" onchange="updateInfractions(${i})">
                    <option value=""></option>
                    <option value="Contravention">Contravention</option>
                    <option value="Délit mineur">Délit mineur</option>
                    <option value="Délit majeur">Délit majeur</option>
                    <option value="Crime">Crime</option>
                </select>
            </td>
            <td>
                <select class="infraction-description-select" data-row="${i}" onchange="updateRowCalculations(${i})">
                    <option value=""></option>
                </select>
            </td>
            <td>
                <input type="number" class="quantite-input" data-row="${i}" min="1" value="1" onchange="updateRowCalculations(${i})">
            </td>
            <td>
                <select class="tentative-select" data-row="${i}" onchange="updateRowCalculations(${i})">
                    <option value="Non">Non</option>
                    <option value="Oui">Oui</option>
                </select>
            </td>
            <td>
                <select class="complicite-select" data-row="${i}" onchange="updateRowCalculations(${i})">
                    <option value="Non">Non</option>
                    <option value="Oui">Oui</option>
                </select>
            </td>
            <td>
                <select class="avocat-select" data-row="${i}" onchange="updateRowCalculations(${i})">
                    <option value="Non">Non</option>
                    <option value="Oui">Oui</option>
                </select>
            </td>
            <td>
                <input type="text" class="amende-display" data-row="${i}" value="$0" readonly>
            </td>
            <td>
                <input type="text" class="peine-display" data-row="${i}" value="00:00" readonly>
            </td>
            <td>
                <input type="text" class="special-input" data-row="${i}" onchange="updateRowCalculations(${i})">
            </td>
        `;
        tableBody.appendChild(row);
    }
    
    updateTotalCalculations();
    
    const retenuSelect = document.getElementById('calculateurRetenu');
    if (retenuSelect) {
        retenuSelect.onchange = handleRetenuChange;
    }
}

function handleRetenuChange() {
    updateCalculateurAmendeFromRetenu();
}

function updateInfractions(rowIndex) {
    const typeSelect = document.querySelector(`.infraction-type-select[data-row="${rowIndex}"]`);
    const descriptionSelect = document.querySelector(`.infraction-description-select[data-row="${rowIndex}"]`);
    
    if (!typeSelect || !descriptionSelect) return;
    
    const selectedType = typeSelect.value;
    descriptionSelect.innerHTML = '<option value=""></option>';
    
    if (selectedType && infractionsDB[selectedType]) {
        infractionsDB[selectedType].forEach(infraction => {
            const option = document.createElement('option');
            option.value = infraction.description;
            option.textContent = infraction.description;
            option.dataset.amende = infraction.amende;
            option.dataset.temps = infraction.temps;
            if (infraction.special) {
                option.dataset.special = infraction.special;
            }
            descriptionSelect.appendChild(option);
        });
    }
    
    updateRowCalculations(rowIndex);
}

function updateRowCalculations(rowIndex) {
    const typeSelect = document.querySelector(`.infraction-type-select[data-row="${rowIndex}"]`);
    const descriptionSelect = document.querySelector(`.infraction-description-select[data-row="${rowIndex}"]`);
    const quantiteInput = document.querySelector(`.quantite-input[data-row="${rowIndex}"]`);
    const tentativeSelect = document.querySelector(`.tentative-select[data-row="${rowIndex}"]`);
    const compliciteSelect = document.querySelector(`.complicite-select[data-row="${rowIndex}"]`);
    const avocatSelect = document.querySelector(`.avocat-select[data-row="${rowIndex}"]`);
    const amendeDisplay = document.querySelector(`.amende-display[data-row="${rowIndex}"]`);
    const peineDisplay = document.querySelector(`.peine-display[data-row="${rowIndex}"]`);
    const specialInput = document.querySelector(`.special-input[data-row="${rowIndex}"]`);
    
    if (!typeSelect || !descriptionSelect || !quantiteInput || !amendeDisplay || !peineDisplay) return;
    
    const selectedOption = descriptionSelect.options[descriptionSelect.selectedIndex];
    if (!selectedOption || !selectedOption.dataset.amende) {
        amendeDisplay.value = '$0';
        peineDisplay.value = '00:00';
        if (specialInput) specialInput.value = '';
        updateTotalCalculations();
        return;
    }
    
    const baseAmende = parseInt(selectedOption.dataset.amende) || 0;
    const baseTemps = selectedOption.dataset.temps || '00:00';
    const quantite = parseInt(quantiteInput.value) || 1;
    const tentative = tentativeSelect ? tentativeSelect.value === 'Oui' : false;
    const complicite = compliciteSelect ? compliciteSelect.value === 'Oui' : false;
    const avocat = avocatSelect ? avocatSelect.value === 'Oui' : false;
    
    let amendeMultiplier = 1.0;
    let tempsMultiplier = 1.0;
    
    if (tentative && complicite && avocat) {
        amendeMultiplier = 0.128;
        tempsMultiplier = 0.1;
    } else if (tentative && complicite && !avocat) {
        amendeMultiplier = 0.16;
        tempsMultiplier = 0.15;
    } else if ((tentative && !complicite && avocat) || (!tentative && complicite && avocat)) {
        amendeMultiplier = 0.32;
        tempsMultiplier = 0.3;
    } else if (tentative || complicite || avocat) {
        amendeMultiplier = 0.5;
        tempsMultiplier = 0.5;
    } else {
        amendeMultiplier = 1.0;
        tempsMultiplier = 1.0;
    }
    
    let baseAmendeCalculated = Math.floor(baseAmende * amendeMultiplier);
    
    let amende = baseAmendeCalculated * quantite;
    amendeDisplay.value = `$${amende.toLocaleString('fr-FR').replace(/\s/g, ' ')}`;
    
    const tempsParts = baseTemps.split(':');
    let baseMinutes = parseInt(tempsParts[0]) * 60 + parseInt(tempsParts[1]);
    baseMinutes = Math.floor(baseMinutes * tempsMultiplier);
    
    const totalMinutes = baseMinutes * quantite;
    const heures = Math.floor(totalMinutes / 60);
    const minutes = totalMinutes % 60;
    peineDisplay.value = `${String(heures).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`;
    
    if (specialInput) {
        const selectedType = typeSelect.value;
        const selectedOption = descriptionSelect.options[descriptionSelect.selectedIndex];
        let specialText = selectedOption && selectedOption.dataset.special ? selectedOption.dataset.special : '';
        
        if (!specialText) {
            if (selectedType === 'Délit mineur') {
                specialText = 'Rapport d\'arrestation';
            } else if (selectedType === 'Délit majeur' || selectedType === 'Crime') {
                specialText = 'Comparution immédiate';
                if (quantite === 1) {
                    specialText += ' - Quantité x1 maximum';
                }
            }
        } else {
            if ((selectedType === 'Délit majeur' || selectedType === 'Crime') && quantite === 1) {
                specialText = 'Comparution immédiate - Quantité x1 maximum';
            }
        }
        
        specialInput.value = specialText || '';
    }
    
    updateTotalCalculations();
}

function timeToMinutes(timeStr) {
    if (!timeStr || timeStr === '00:00') return 0;
    const parts = timeStr.split(':');
    if (parts.length === 2) {
        return parseInt(parts[0]) * 60 + parseInt(parts[1]);
    } else if (parts.length === 3) {
        return parseInt(parts[0]) * 60 + parseInt(parts[1]);
    }
    return 0;
}

function minutesToTime(minutes) {
    const heures = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return `${String(heures).padStart(2, '0')}:${String(mins).padStart(2, '0')}`;
}

function updateTotalCalculations() {
    let totalAmende = 0;
    let totalPeineMinutes = 0;
    
    for (let i = 0; i < 12; i++) {
        const amendeDisplay = document.querySelector(`.amende-display[data-row="${i}"]`);
        const peineDisplay = document.querySelector(`.peine-display[data-row="${i}"]`);
        
        if (amendeDisplay && amendeDisplay.value !== '$0') {
            const amendeValue = parseInt(amendeDisplay.value.replace('$', '').replace(/,/g, '').replace(/\s/g, '')) || 0;
            totalAmende += amendeValue;
        }
        
        if (peineDisplay && peineDisplay.value !== '00:00') {
            totalPeineMinutes += timeToMinutes(peineDisplay.value);
        }
    }
    
    const min1Amende = Math.floor(totalAmende / 4);
    const min2Amende = Math.floor(totalAmende / 2);
    const min3Amende = Math.floor(totalAmende * 3 / 4);
    const nominalAmende = totalAmende;
    const max1Amende = Math.floor(totalAmende * 1.5);
    const max2Amende = Math.floor(totalAmende * 2);
    const max3Amende = Math.floor(totalAmende * 3);
    
    const min1Peine = Math.floor(totalPeineMinutes / 4);
    const min2Peine = Math.floor(totalPeineMinutes / 2);
    const min3Peine = Math.floor(totalPeineMinutes * 3 / 4);
    const nominalPeine = totalPeineMinutes;
    const max1Peine = Math.floor(totalPeineMinutes * 1.5);
    const max2Peine = Math.floor(totalPeineMinutes * 2);
    const max3Peine = Math.floor(totalPeineMinutes * 3);
    
    document.getElementById('resultMin1Amende').textContent = `$${min1Amende.toLocaleString('fr-FR').replace(/\s/g, ' ')}`;
    document.getElementById('resultMin1Peine').textContent = minutesToTime(min1Peine);
    
    document.getElementById('resultMin2Amende').textContent = `$${min2Amende.toLocaleString('fr-FR').replace(/\s/g, ' ')}`;
    document.getElementById('resultMin2Peine').textContent = minutesToTime(min2Peine);
    
    document.getElementById('resultMin3Amende').textContent = `$${min3Amende.toLocaleString('fr-FR').replace(/\s/g, ' ')}`;
    document.getElementById('resultMin3Peine').textContent = minutesToTime(min3Peine);
    
    document.getElementById('resultNominalAmende').textContent = `$${nominalAmende.toLocaleString('fr-FR').replace(/\s/g, ' ')}`;
    document.getElementById('resultNominalPeine').textContent = minutesToTime(nominalPeine);
    
    document.getElementById('resultMax1Amende').textContent = `$${max1Amende.toLocaleString('fr-FR').replace(/\s/g, ' ')}`;
    document.getElementById('resultMax1Peine').textContent = minutesToTime(max1Peine);
    
    document.getElementById('resultMax2Amende').textContent = `$${max2Amende.toLocaleString('fr-FR').replace(/\s/g, ' ')}`;
    document.getElementById('resultMax2Peine').textContent = minutesToTime(max2Peine);
    
    document.getElementById('resultMax3Amende').textContent = `$${max3Amende.toLocaleString('fr-FR').replace(/\s/g, ' ')}`;
    document.getElementById('resultMax3Peine').textContent = minutesToTime(max3Peine);
    
    updateCalculateurAmendeFromRetenu();
}

function getChargesFromCalculateur() {
    const charges = [];
    
    for (let i = 0; i < 12; i++) {
        const typeSelect = document.querySelector(`.infraction-type-select[data-row="${i}"]`);
        const descriptionSelect = document.querySelector(`.infraction-description-select[data-row="${i}"]`);
        const quantiteInput = document.querySelector(`.quantite-input[data-row="${i}"]`);
        const tentativeSelect = document.querySelector(`.tentative-select[data-row="${i}"]`);
        const compliciteSelect = document.querySelector(`.complicite-select[data-row="${i}"]`);
        const amendeDisplay = document.querySelector(`.amende-display[data-row="${i}"]`);
        const peineDisplay = document.querySelector(`.peine-display[data-row="${i}"]`);
        const specialInput = document.querySelector(`.special-input[data-row="${i}"]`);
        
        if (!typeSelect || !descriptionSelect || !descriptionSelect.value) continue;
        
        const amendeValue = amendeDisplay ? parseInt(amendeDisplay.value.replace('$', '').replace(/,/g, '').replace(/\s/g, '')) || 0 : 0;
        const peineValue = peineDisplay ? peineDisplay.value : '00:00';
        const peineMinutes = timeToMinutes(peineValue);
        
        const selectedOption = descriptionSelect.options[descriptionSelect.selectedIndex];
        const baseAmende = selectedOption ? parseInt(selectedOption.dataset.amende) || 0 : 0;
        const baseTemps = selectedOption ? selectedOption.dataset.temps || '00:00' : '00:00';
        const quantite = quantiteInput ? parseInt(quantiteInput.value) || 1 : 1;
        const tentative = tentativeSelect ? tentativeSelect.value === 'Oui' : false;
        const complicite = compliciteSelect ? compliciteSelect.value === 'Oui' : false;
        const avocat = document.querySelector(`.avocat-select[data-row="${i}"]`) ? document.querySelector(`.avocat-select[data-row="${i}"]`).value === 'Oui' : false;
        
        let amendeMultiplier = 1.0;
        let tempsMultiplier = 1.0;
        
        if (tentative && complicite && avocat) {
            amendeMultiplier = 0.128;
            tempsMultiplier = 0.1;
        } else if (tentative && complicite && !avocat) {
            amendeMultiplier = 0.16;
            tempsMultiplier = 0.15;
        } else if ((tentative && !complicite && avocat) || (!tentative && complicite && avocat)) {
            amendeMultiplier = 0.32;
            tempsMultiplier = 0.3;
        } else if (tentative || complicite || avocat) {
            amendeMultiplier = 0.5;
            tempsMultiplier = 0.5;
        }
        
        let baseAmendeCalculated = Math.floor(baseAmende * amendeMultiplier);
        let amende = baseAmendeCalculated * quantite;
        
        const tempsParts = baseTemps.split(':');
        let baseMinutes = parseInt(tempsParts[0]) * 60 + parseInt(tempsParts[1]);
        baseMinutes = Math.floor(baseMinutes * tempsMultiplier);
        const totalMinutes = baseMinutes * quantite;
        
        const charge = {
            categorie: typeSelect.value,
            nom: descriptionSelect.value,
            quantite: quantite,
            baseAmende: baseAmende,
            baseTemps: baseTemps,
            amende: amende,
            up: totalMinutes.toString(),
            tentative: tentative ? 'OUI' : 'NON',
            complicite: complicite ? 'OUI' : 'NON',
            special: specialInput ? specialInput.value : ''
        };
        
        charges.push(charge);
    }
    
    return charges;
}

async function loadInfractionsFromAPI() {
    try {
        const response = await fetch('/api/infractions');
        if (!response.ok) return;
        const data = await response.json();
        if (!data.success || !data.infractions) return;
        
        infractionsDB = {
            'Contravention': [],
            'Délit mineur': [],
            'Délit majeur': [],
            'Crime': []
        };
        
        data.infractions.forEach(infraction => {
            if (infractionsDB[infraction.categorie]) {
                infractionsDB[infraction.categorie].push({
                    description: infraction.description,
                    amende: infraction.amende,
                    temps: infraction.temps,
                    special: infraction.special || ''
                });
            }
        });
    } catch (error) {
        console.error('Erreur lors du chargement des infractions:', error);
    }
}

function getAllInfractions() {
    const allInfractions = [];
    Object.keys(infractionsDB).forEach(categorie => {
        infractionsDB[categorie].forEach(infraction => {
            allInfractions.push({
                categorie: categorie,
                nom: infraction.description,
                baseAmende: infraction.amende,
                baseTemps: infraction.temps,
                special: infraction.special || ''
            });
        });
    });
    return allInfractions;
}

function searchArrestCharges(query) {
    if (!query || query.length < 2) return [];
    
    const allInfractions = getAllInfractions();
    const lowerQuery = query.toLowerCase();
    
    return allInfractions.filter(infraction => 
        infraction.nom.toLowerCase().includes(lowerQuery) ||
        infraction.categorie.toLowerCase().includes(lowerQuery)
    );
}

function displayArrestChargeSearchResults(results) {
    const resultsContainer = document.getElementById('arrestChargeSearchResults');
    if (!resultsContainer) return;
    
    if (results.length === 0) {
        resultsContainer.innerHTML = '<div style="padding: 0.75rem; color: rgba(0, 0, 0, 0.6);">Aucun résultat</div>';
        resultsContainer.style.display = 'block';
        return;
    }
    
    resultsContainer.innerHTML = results.map(infraction => {
        const categorieLabel = infraction.categorie === 'Contravention' ? 'Contravention' :
                              infraction.categorie === 'Délit mineur' ? 'Délit Mineur' :
                              infraction.categorie === 'Délit majeur' ? 'Délit Majeur' : 'Crime';
        
        return `
            <div class="arrest-charge-search-result" data-categorie="${infraction.categorie}" data-nom="${infraction.nom}" data-amende="${infraction.baseAmende}" data-temps="${infraction.baseTemps}" data-special="${infraction.special || ''}" style="padding: 0.75rem; border-bottom: 1px solid rgba(0, 0, 0, 0.2); cursor: pointer; transition: background 0.2s;">
                <div style="font-weight: 600; color: rgba(0, 0, 0, 0.95);">${infraction.nom}</div>
                <div style="font-size: 0.85rem; color: rgba(0, 0, 0, 0.7); margin-top: 0.25rem;">
                    ${categorieLabel} • Amende: $${infraction.baseAmende.toLocaleString('fr-FR')} • Peine: ${infraction.baseTemps}
                </div>
            </div>
        `;
    }).join('');
    
    resultsContainer.style.display = 'block';
    
    resultsContainer.querySelectorAll('.arrest-charge-search-result').forEach(result => {
        result.addEventListener('mouseenter', function() {
            this.style.background = 'rgba(0, 0, 0, 0.1)';
        });
        result.addEventListener('mouseleave', function() {
            this.style.background = 'transparent';
        });
        result.addEventListener('click', function() {
            const categorie = this.dataset.categorie;
            const nom = this.dataset.nom;
            const baseAmende = parseInt(this.dataset.amende);
            const baseTemps = this.dataset.temps;
            const special = this.dataset.special || '';
            
            addArrestCharge({
                categorie: categorie,
                nom: nom,
                quantite: 1,
                baseAmende: baseAmende,
                baseTemps: baseTemps,
                tentative: 'NON',
                complicite: 'NON',
                special: special
            });
            
            document.getElementById('arrestChargeSearch').value = '';
            resultsContainer.style.display = 'none';
        });
    });
}

function addArrestCharge(charge) {
    if (!window.__arrestCharges) {
        window.__arrestCharges = [];
    }
    
    const avocat = document.getElementById('arrestAvocat')?.value === 'OUI';
    const tentative = charge.tentative === 'OUI';
    const complicite = charge.complicite === 'OUI';
    
    let amendeMultiplier = 1.0;
    let tempsMultiplier = 1.0;
    
    if (tentative && complicite && avocat) {
        amendeMultiplier = 0.128;
        tempsMultiplier = 0.1;
    } else if (tentative && complicite && !avocat) {
        amendeMultiplier = 0.16;
        tempsMultiplier = 0.15;
    } else if ((tentative && !complicite && avocat) || (!tentative && complicite && avocat)) {
        amendeMultiplier = 0.32;
        tempsMultiplier = 0.3;
    } else if (tentative || complicite || avocat) {
        amendeMultiplier = 0.5;
        tempsMultiplier = 0.5;
    }
    
    const baseAmende = parseInt(charge.baseAmende) || 0;
    const baseTemps = charge.baseTemps || '00:00';
    const quantite = parseInt(charge.quantite) || 1;
    
    let baseAmendeCalculated = Math.floor(baseAmende * amendeMultiplier);
    let amende = baseAmendeCalculated * quantite;
    
    const tempsParts = baseTemps.split(':');
    let baseMinutes = parseInt(tempsParts[0]) * 60 + parseInt(tempsParts[1]);
    baseMinutes = Math.floor(baseMinutes * tempsMultiplier);
    const totalMinutes = baseMinutes * quantite;
    
    charge.quantite = quantite;
    charge.amende = amende;
    charge.up = totalMinutes.toString();
    
    window.__arrestCharges.push(charge);
    renderArrestCharges();
    updateArrestTotals();
}

function renderArrestCharges() {
    const container = document.getElementById('arrestChargesContainer');
    if (!container) return;
    
    const charges = window.__arrestCharges || [];
    
    if (charges.length === 0) {
        container.innerHTML = '<div style="text-align: center; color: rgba(0, 0, 0, 0.6); padding: 2rem;">Aucune charge. Recherchez un chef d\'inculpation ci-dessus pour l\'ajouter.</div>';
        document.getElementById('arrestChargesCount').textContent = '0 charge(s)';
        return;
    }
    
    const recalculatedCharges = charges.map(charge => recalculateCharge({...charge}));
    
    container.innerHTML = recalculatedCharges.map((charge, index) => {
        const amendeFormatted = charge.amende ? `$${charge.amende.toLocaleString('fr-FR').replace(/\s/g, ' ')}` : '$0';
        const peineFormatted = minutesToTime(parseInt(charge.up) || 0);
        const categorieClass = charge.categorie ? charge.categorie.toLowerCase().replace(/\s/g, '-') : '';
        
        let categorieLabel = '';
        if (charge.categorie === 'Contravention') {
            categorieLabel = 'Contravention';
        } else if (charge.categorie === 'Délit mineur') {
            categorieLabel = 'Délit Mineur';
        } else if (charge.categorie === 'Délit majeur') {
            categorieLabel = 'Délit Majeur';
        } else if (charge.categorie === 'Crime') {
            categorieLabel = 'Crime';
        }
        
        return `
            <div class="arrest-charge-item" data-charge-index="${index}" style="border: 2px solid rgba(0, 0, 0, 0.85); padding: 1rem 1.25rem; margin-bottom: 0.75rem; background: rgba(255, 255, 255, 0.1); word-wrap: break-word; overflow-wrap: break-word;">
                <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 0.5rem;">
                    <div style="flex: 1;">
                        <div style="font-weight: 700; margin-bottom: 0.25rem; color: rgba(0, 0, 0, 0.95);">${charge.nom || ''}</div>
                        ${charge.special ? `<div style="font-size: 0.85rem; color: rgba(0, 0, 0, 0.7); margin-bottom: 0.25rem;">${charge.special}</div>` : ''}
                        <div style="display: flex; gap: 1rem; margin-top: 0.5rem; flex-wrap: wrap;">
                            <div style="font-size: 0.9rem; color: rgba(0, 0, 0, 0.95); font-weight: 700;">
                                <strong style="color: rgba(0, 0, 0, 0.95);">${peineFormatted}</strong>
                            </div>
                            <div style="font-size: 0.9rem; color: rgba(0, 0, 0, 0.95); font-weight: 700;">
                                <strong style="color: rgba(0, 0, 0, 0.95);">${amendeFormatted}</strong>
                            </div>
                            <div style="font-size: 0.9rem; padding: 0.2rem 0.5rem; background: rgba(0, 0, 0, 0.1); border: 1px solid rgba(0, 0, 0, 0.3); color: rgba(0, 0, 0, 0.95);">
                                ${categorieLabel}
                            </div>
                        </div>
                    </div>
                    <button type="button" onclick="removeArrestCharge(${index})" style="background: transparent; border: none; color: rgba(255, 0, 0, 0.7); cursor: pointer; font-size: 1.2rem; padding: 0.25rem 0.5rem; margin-left: 0.5rem;">×</button>
                </div>
                <div style="display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 0.75rem; margin-top: 0.75rem; padding-top: 0.75rem; border-top: 1px solid rgba(0, 0, 0, 0.3);">
                    <div>
                        <label style="display: block; font-size: 0.85rem; font-weight: 600; margin-bottom: 0.25rem; color: rgba(0, 0, 0, 0.95);">Quantité</label>
                        <input type="number" class="arrest-charge-quantite" data-charge-index="${index}" min="1" value="${charge.quantite || 1}" style="width: 100%; background: transparent; border: 1px solid rgba(0, 0, 0, 0.45); padding: 0.4rem; color: rgba(0, 0, 0, 0.95);">
                    </div>
                    <div>
                        <label style="display: block; font-size: 0.85rem; font-weight: 600; margin-bottom: 0.25rem; color: rgba(0, 0, 0, 0.95);">Tentative</label>
                        <select class="arrest-charge-tentative" data-charge-index="${index}" style="width: 100%; background: transparent; border: 1px solid rgba(0, 0, 0, 0.45); padding: 0.4rem; color: rgba(0, 0, 0, 0.95);">
                            <option value="NON" ${charge.tentative === 'NON' ? 'selected' : ''}>NON</option>
                            <option value="OUI" ${charge.tentative === 'OUI' ? 'selected' : ''}>OUI</option>
                        </select>
                    </div>
                    <div>
                        <label style="display: block; font-size: 0.85rem; font-weight: 600; margin-bottom: 0.25rem; color: rgba(0, 0, 0, 0.95);">Complicité</label>
                        <select class="arrest-charge-complicite" data-charge-index="${index}" style="width: 100%; background: transparent; border: 1px solid rgba(0, 0, 0, 0.45); padding: 0.4rem; color: rgba(0, 0, 0, 0.95);">
                            <option value="NON" ${charge.complicite === 'NON' ? 'selected' : ''}>NON</option>
                            <option value="OUI" ${charge.complicite === 'OUI' ? 'selected' : ''}>OUI</option>
                        </select>
                    </div>
                </div>
            </div>
        `;
    }).join('');
    
    document.getElementById('arrestChargesCount').textContent = `${charges.length} charge(s)`;
    
    document.querySelectorAll('.arrest-charge-tentative, .arrest-charge-complicite').forEach(select => {
        select.addEventListener('change', function() {
            const index = parseInt(this.dataset.chargeIndex);
            if (window.__arrestCharges && window.__arrestCharges[index]) {
                if (this.classList.contains('arrest-charge-tentative')) {
                    window.__arrestCharges[index].tentative = this.value;
                } else if (this.classList.contains('arrest-charge-complicite')) {
                    window.__arrestCharges[index].complicite = this.value;
                }
                renderArrestCharges();
                updateArrestTotals();
            }
        });
    });
    
    document.querySelectorAll('.arrest-charge-quantite').forEach(input => {
        input.addEventListener('change', function() {
            const index = parseInt(this.dataset.chargeIndex);
            if (window.__arrestCharges && window.__arrestCharges[index]) {
                const quantite = parseInt(this.value) || 1;
                if (quantite < 1) {
                    this.value = 1;
                    window.__arrestCharges[index].quantite = 1;
                } else {
                    window.__arrestCharges[index].quantite = quantite;
                }
                renderArrestCharges();
                updateArrestTotals();
            }
        });
    });
}

function removeArrestCharge(index) {
    if (window.__arrestCharges && window.__arrestCharges[index]) {
        window.__arrestCharges.splice(index, 1);
        renderArrestCharges();
        updateArrestTotals();
    }
}

function recalculateCharge(charge) {
    const tentative = charge.tentative === 'OUI';
    const complicite = charge.complicite === 'OUI';
    const avocat = document.getElementById('arrestAvocat')?.value === 'OUI';
    
    let amendeMultiplier = 1.0;
    let tempsMultiplier = 1.0;
    
    if (tentative && complicite && avocat) {
        amendeMultiplier = 0.128;
        tempsMultiplier = 0.1;
    } else if (tentative && complicite && !avocat) {
        amendeMultiplier = 0.16;
        tempsMultiplier = 0.15;
    } else if ((tentative && !complicite && avocat) || (!tentative && complicite && avocat)) {
        amendeMultiplier = 0.32;
        tempsMultiplier = 0.3;
    } else if (tentative || complicite || avocat) {
        amendeMultiplier = 0.5;
        tempsMultiplier = 0.5;
    }
    
    const baseAmende = parseInt(charge.baseAmende) || parseInt(charge.amende) || 0;
    const baseTemps = charge.baseTemps || '00:00';
    const quantite = parseInt(charge.quantite) || 1;
    
    let baseAmendeCalculated = Math.floor(baseAmende * amendeMultiplier);
    let amende = baseAmendeCalculated * quantite;
    
    const tempsParts = baseTemps.split(':');
    let baseMinutes = parseInt(tempsParts[0]) * 60 + parseInt(tempsParts[1]);
    baseMinutes = Math.floor(baseMinutes * tempsMultiplier);
    const totalMinutes = baseMinutes * quantite;
    
    return {
        ...charge,
        amende: amende,
        up: totalMinutes.toString()
    };
}

function calculateArrestTotals() {
    const charges = window.__arrestCharges || [];
    
    let totalAmende = 0;
    let totalPeineMinutes = 0;
    
    charges.forEach(charge => {
        const recalculated = recalculateCharge({...charge});
        totalAmende += parseInt(recalculated.amende) || 0;
        totalPeineMinutes += parseInt(recalculated.up) || 0;
    });
    
    return {
        totalAmende: totalAmende,
        totalPeineMinutes: totalPeineMinutes
    };
}

function updateArrestTotals() {
    const totals = calculateArrestTotals();
    const totalAmende = totals.totalAmende;
    const totalPeineMinutes = totals.totalPeineMinutes;
    
    const totalType = document.getElementById('arrestTotalType')?.value || 'NOMINAL';
    
    let amendeValue = 0;
    let tempsValue = 0;
    
    switch(totalType) {
        case 'MIN 1':
            amendeValue = Math.floor(totalAmende / 4);
            tempsValue = Math.floor(totalPeineMinutes / 4);
            break;
        case 'MIN 2':
            amendeValue = Math.floor(totalAmende / 2);
            tempsValue = Math.floor(totalPeineMinutes / 2);
            break;
        case 'MIN 3':
            amendeValue = Math.floor(totalAmende * 3 / 4);
            tempsValue = Math.floor(totalPeineMinutes * 3 / 4);
            break;
        case 'NOMINAL':
            amendeValue = totalAmende;
            tempsValue = totalPeineMinutes;
            break;
        case 'MAX 1':
            amendeValue = Math.floor(totalAmende * 1.5);
            tempsValue = Math.floor(totalPeineMinutes * 1.5);
            break;
        case 'MAX 2':
            amendeValue = Math.floor(totalAmende * 2);
            tempsValue = Math.floor(totalPeineMinutes * 2);
            break;
        case 'MAX 3':
            amendeValue = Math.floor(totalAmende * 3);
            tempsValue = Math.floor(totalPeineMinutes * 3);
            break;
    }
    
    const amendeInput = document.getElementById('arrestAmende');
    const tempsInput = document.getElementById('arrestTemps');
    
    if (amendeInput) {
        amendeInput.value = amendeValue.toLocaleString('fr-FR').replace(/\s/g, ' ');
    }
    if (tempsInput) {
        tempsInput.value = tempsValue;
    }
}

document.addEventListener('DOMContentLoaded', function() {
    const arrestChargeSearch = document.getElementById('arrestChargeSearch');
    const arrestChargeSearchResults = document.getElementById('arrestChargeSearchResults');
    const arrestAvocatSelect = document.getElementById('arrestAvocat');
    const arrestTotalType = document.getElementById('arrestTotalType');
    
    if (arrestChargeSearch) {
        let searchTimeout;
        arrestChargeSearch.addEventListener('input', function() {
            clearTimeout(searchTimeout);
            const query = this.value.trim();
            
            if (query.length < 2) {
                if (arrestChargeSearchResults) arrestChargeSearchResults.style.display = 'none';
                return;
            }
            
            searchTimeout = setTimeout(() => {
                const results = searchArrestCharges(query);
                displayArrestChargeSearchResults(results);
            }, 200);
        });
        
        arrestChargeSearch.addEventListener('focus', function() {
            const query = this.value.trim();
            if (query.length >= 2) {
                const results = searchArrestCharges(query);
                displayArrestChargeSearchResults(results);
            }
        });
        
        document.addEventListener('click', function(e) {
            if (arrestChargeSearchResults && 
                !arrestChargeSearch.contains(e.target) && 
                !arrestChargeSearchResults.contains(e.target)) {
                arrestChargeSearchResults.style.display = 'none';
            }
        });
    }
    
    if (arrestAvocatSelect) {
        arrestAvocatSelect.addEventListener('change', function() {
            updateArrestTotals();
        });
    }
    
    if (arrestTotalType) {
        arrestTotalType.addEventListener('change', function() {
            updateArrestTotals();
        });
    }
});

function updateCalculateurAmendeFromRetenu() {
    const retenuSelect = document.getElementById('calculateurRetenu');
    const amendeTotalInput = document.getElementById('calculateurAmende');
    
    if (!retenuSelect || !amendeTotalInput) return;
    
    const retenu = retenuSelect.value;
    let amendeValue = 0;
    
    switch(retenu) {
        case 'MIN 1':
            amendeValue = parseInt(document.getElementById('resultMin1Amende').textContent.replace('$', '').replace(/,/g, '').replace(/\s/g, '')) || 0;
            break;
        case 'MIN 2':
            amendeValue = parseInt(document.getElementById('resultMin2Amende').textContent.replace('$', '').replace(/,/g, '').replace(/\s/g, '')) || 0;
            break;
        case 'MIN 3':
            amendeValue = parseInt(document.getElementById('resultMin3Amende').textContent.replace('$', '').replace(/,/g, '').replace(/\s/g, '')) || 0;
            break;
        case 'NOMINAL':
            amendeValue = parseInt(document.getElementById('resultNominalAmende').textContent.replace('$', '').replace(/,/g, '').replace(/\s/g, '')) || 0;
            break;
        case 'MAX 1':
            amendeValue = parseInt(document.getElementById('resultMax1Amende').textContent.replace('$', '').replace(/,/g, '').replace(/\s/g, '')) || 0;
            break;
        case 'MAX 2':
            amendeValue = parseInt(document.getElementById('resultMax2Amende').textContent.replace('$', '').replace(/,/g, '').replace(/\s/g, '')) || 0;
            break;
        case 'MAX 3':
            amendeValue = parseInt(document.getElementById('resultMax3Amende').textContent.replace('$', '').replace(/,/g, '').replace(/\s/g, '')) || 0;
            break;
        default:
            amendeValue = parseInt(document.getElementById('resultNominalAmende').textContent.replace('$', '').replace(/,/g, '').replace(/\s/g, '')) || 0;
    }
    
    amendeTotalInput.value = `$${amendeValue.toLocaleString('fr-FR').replace(/\s/g, ' ')}`;
}

function downloadCalculateurPeinePDF() {
    if (typeof window.jspdf === 'undefined') {
        alert('Bibliothèque PDF non chargée. Veuillez recharger la page.');
        return;
    }
    
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF('p', 'mm', 'a4');
    
    const darkBlue = [26, 35, 50];
    const white = [255, 255, 255];
    const darkGray = [42, 53, 72];
    
    doc.setFillColor(...darkBlue);
    doc.rect(0, 0, 210, 30, 'F');
    
    doc.setTextColor(...white);
    doc.setFontSize(20);
    doc.setFont('helvetica', 'bold');
    doc.text('Calculateur de peine', 105, 20, { align: 'center' });
    
    let yPos = 40;
    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...darkBlue);
    
    const date = document.getElementById('calculateurDate').value;
    const agent = document.getElementById('calculateurAgent').value;
    const prevenu = document.getElementById('calculateurPrevenu').value;
    const retenu = document.getElementById('calculateurRetenu').value;
    const amendeTotal = document.getElementById('calculateurAmende').value;
    
    doc.text(`Date: ${date || '-'}`, 20, yPos);
    doc.text(`Agent(s): ${agent || '-'}`, 20, yPos + 7);
    doc.text(`Prévenu: ${prevenu || '-'}`, 20, yPos + 14);
    doc.text(`Retenu: ${retenu || '-'}`, 20, yPos + 21);
    doc.text(`Amende totale: ${amendeTotal || '$0'}`, 110, yPos);
    
    yPos += 30;
    
    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    doc.setFillColor(...darkGray);
    doc.setTextColor(...white);
    
    const tableStartY = yPos;
    const colWidths = [30, 50, 15, 20, 20, 20, 25, 20];
    const headers = ['Infraction', 'Chef d\'accusation', 'Qté', 'Tent.', 'Compl.', 'Avocat', 'Amende', 'Peine'];
    let xPos = 20;
    
    headers.forEach((header, i) => {
        doc.rect(xPos, tableStartY, colWidths[i], 8, 'F');
        doc.text(header, xPos + colWidths[i] / 2, tableStartY + 5, { align: 'center' });
        xPos += colWidths[i];
    });
    
    yPos = tableStartY + 8;
    doc.setTextColor(...darkBlue);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    
    let infractionCount = 0;
    for (let i = 0; i < 12; i++) {
        const typeSelect = document.querySelector(`.infraction-type-select[data-row="${i}"]`);
        const descriptionSelect = document.querySelector(`.infraction-description-select[data-row="${i}"]`);
        const quantiteInput = document.querySelector(`.quantite-input[data-row="${i}"]`);
        const tentativeSelect = document.querySelector(`.tentative-select[data-row="${i}"]`);
        const compliciteSelect = document.querySelector(`.complicite-select[data-row="${i}"]`);
        const avocatSelect = document.querySelector(`.avocat-select[data-row="${i}"]`);
        const amendeDisplay = document.querySelector(`.amende-display[data-row="${i}"]`);
        const peineDisplay = document.querySelector(`.peine-display[data-row="${i}"]`);
        
        if (!typeSelect || !descriptionSelect || descriptionSelect.value === '') continue;
        
        if (yPos > 250) {
            doc.addPage();
            yPos = 20;
        }
        
        xPos = 20;
        const rowData = [
            typeSelect.value || '',
            descriptionSelect.value || '',
            quantiteInput ? quantiteInput.value : '1',
            tentativeSelect ? tentativeSelect.value : 'Non',
            compliciteSelect ? compliciteSelect.value : 'Non',
            avocatSelect ? avocatSelect.value : 'Non',
            amendeDisplay ? amendeDisplay.value : '$0',
            peineDisplay ? peineDisplay.value : '00:00'
        ];
        
        headers.forEach((_, i) => {
            doc.setDrawColor(200, 200, 200);
            doc.rect(xPos, yPos, colWidths[i], 6, 'S');
            
            let text = rowData[i] || '';
            if (text.length > 20 && i === 1) {
                text = text.substring(0, 17) + '...';
            }
            
            doc.text(text, xPos + 2, yPos + 4, { maxWidth: colWidths[i] - 4, align: 'left' });
            xPos += colWidths[i];
        });
        
        yPos += 6;
        infractionCount++;
    }
    
    if (infractionCount === 0) {
        doc.text('Aucune infraction enregistrée', 20, yPos);
        yPos += 10;
    }
    
    yPos += 15;
    
    if (yPos > 240) {
        doc.addPage();
        yPos = 20;
    }
    
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...darkBlue);
    doc.text('Résultats', 105, yPos, { align: 'center' });
    yPos += 10;
    
    doc.setFontSize(9);
    doc.setFillColor(...darkGray);
    doc.setTextColor(...white);
    doc.rect(20, yPos, 35, 6, 'F');
    doc.rect(55, yPos, 35, 6, 'F');
    doc.rect(90, yPos, 25, 6, 'F');
    doc.rect(115, yPos, 75, 6, 'F');
    doc.text('Amendes', 37.5, yPos + 4, { align: 'center' });
    doc.text('Peines', 72.5, yPos + 4, { align: 'center' });
    doc.text('Type', 102.5, yPos + 4, { align: 'center' });
    doc.text('Description', 152.5, yPos + 4, { align: 'center' });
    yPos += 6;
    
    doc.setTextColor(...darkBlue);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    
    const results = [
        { label: 'MIN 1', amende: document.getElementById('resultMin1Amende').textContent, peine: document.getElementById('resultMin1Peine').textContent, desc: 'Vice de procédure (CA) | EM / PROC / JUGE' },
        { label: 'MIN 2', amende: document.getElementById('resultMin2Amende').textContent, peine: document.getElementById('resultMin2Peine').textContent, desc: 'Circonstances atténuantes | EM / PROC / JUGE' },
        { label: 'MIN 3', amende: document.getElementById('resultMin3Amende').textContent, peine: document.getElementById('resultMin3Peine').textContent, desc: 'Circonstances atténuantes' },
        { label: 'NOMINAL', amende: document.getElementById('resultNominalAmende').textContent, peine: document.getElementById('resultNominalPeine').textContent, desc: '-' },
        { label: 'MAX 1', amende: document.getElementById('resultMax1Amende').textContent, peine: document.getElementById('resultMax1Peine').textContent, desc: 'CODE ORANGE - EM / PROC / JUGE' },
        { label: 'MAX 2', amende: document.getElementById('resultMax2Amende').textContent, peine: document.getElementById('resultMax2Peine').textContent, desc: 'CODE ROUGE - EM / PROC / JUGE' },
        { label: 'MAX 3', amende: document.getElementById('resultMax3Amende').textContent, peine: document.getElementById('resultMax3Peine').textContent, desc: 'CODE NOIR' }
    ];
    
    results.forEach(result => {
        if (yPos > 270) {
            doc.addPage();
            yPos = 20;
        }
        doc.setDrawColor(200, 200, 200);
        doc.rect(20, yPos, 35, 6, 'S');
        doc.rect(55, yPos, 35, 6, 'S');
        doc.rect(90, yPos, 25, 6, 'S');
        doc.rect(115, yPos, 75, 6, 'S');
        doc.text(result.amende, 37.5, yPos + 4, { align: 'center' });
        doc.text(result.peine, 72.5, yPos + 4, { align: 'center' });
        doc.text(result.label, 102.5, yPos + 4, { align: 'center' });
        
        let descText = result.desc;
        if (descText.length > 30) {
            descText = descText.substring(0, 27) + '...';
        }
        doc.text(descText, 117, yPos + 4, { maxWidth: 71, align: 'left' });
        yPos += 6;
    });
    
    const pageCount = doc.internal.getNumberOfPages();
    for (let i = 1; i <= pageCount; i++) {
        doc.setPage(i);
        doc.setFontSize(8);
        doc.setTextColor(150, 150, 150);
        doc.text(`Page ${i}/${pageCount}`, 105, 287, { align: 'center' });
    }
    
    const fileName = `Calculateur_peine_${date.replace(/\//g, '-') || 'document'}_${prevenu || 'N/A'}.pdf`;
    doc.save(fileName);
}

function clearCalculateurPeine() {
    const today = new Date();
    const day = String(today.getDate()).padStart(2, '0');
    const month = String(today.getMonth() + 1).padStart(2, '0');
    const year = today.getFullYear();
    document.getElementById('calculateurDate').value = `${day}/${month}/${year}`;
    document.getElementById('calculateurAgent').value = '';
    document.getElementById('calculateurPrevenu').value = '';
    document.getElementById('calculateurRetenu').value = 'NOMINAL';
    document.getElementById('calculateurAmende').value = '';
    
    setTimeout(() => {
        updateTotalCalculations();
    }, 100);
    
    for (let i = 0; i < 12; i++) {
        const typeSelect = document.querySelector(`.infraction-type-select[data-row="${i}"]`);
        const descriptionSelect = document.querySelector(`.infraction-description-select[data-row="${i}"]`);
        const quantiteInput = document.querySelector(`.quantite-input[data-row="${i}"]`);
        const tentativeSelect = document.querySelector(`.tentative-select[data-row="${i}"]`);
        const compliciteSelect = document.querySelector(`.complicite-select[data-row="${i}"]`);
        const avocatSelect = document.querySelector(`.avocat-select[data-row="${i}"]`);
        const specialInput = document.querySelector(`.special-input[data-row="${i}"]`);
        
        if (typeSelect) typeSelect.value = '';
        if (descriptionSelect) {
            descriptionSelect.innerHTML = '<option value=""></option>';
            descriptionSelect.value = '';
        }
        if (quantiteInput) quantiteInput.value = '1';
        if (tentativeSelect) tentativeSelect.value = 'Non';
        if (compliciteSelect) compliciteSelect.value = 'Non';
        if (avocatSelect) avocatSelect.value = 'Non';
        if (specialInput) specialInput.value = '';
        
        updateRowCalculations(i);
    }
    
    updateTotalCalculations();
}

let allInfractionsData = [];
let editingInfractionId = null;

function closeGestionInfractionsModal() {
    const modal = document.getElementById('gestionInfractionsModal');
    if (modal) {
        modal.style.display = 'none';
    }
}

const gestionInfractionsModal = document.getElementById('gestionInfractionsModal');
if (gestionInfractionsModal) {
    gestionInfractionsModal.addEventListener('click', function(e) {
        if (e.target === gestionInfractionsModal) {
            closeGestionInfractionsModal();
        }
    });
}

async function openGestionInfractionsModal() {
    const modal = document.getElementById('gestionInfractionsModal');
    if (!modal) return;
    
    modal.style.display = 'flex';
    await loadInfractions();
}

async function loadInfractions() {
    const list = document.getElementById('gestionInfractionsList');
    if (!list) return;
    
    list.innerHTML = '<div class="gestion-compte-loading">Chargement...</div>';
    
    try {
        const response = await fetch('/api/infractions');
        if (!response.ok) throw new Error('Erreur HTTP: ' + response.status);
        const data = await response.json();
        
        if (data.success && data.infractions) {
            allInfractionsData = data.infractions;
            filterInfractions();
        } else {
            list.innerHTML = '<div class="gestion-compte-loading">Erreur lors du chargement</div>';
        }
    } catch (error) {
        console.error('Erreur lors du chargement des infractions:', error);
        if (list) {
            list.innerHTML = '<div class="gestion-compte-loading">Erreur lors du chargement</div>';
        }
    }
}

function filterInfractions() {
    const searchInput = document.getElementById('gestionInfractionsSearchInput');
    const categorieFilter = document.getElementById('gestionInfractionsCategorieFilter');
    const list = document.getElementById('gestionInfractionsList');
    
    if (!list || !allInfractionsData) return;
    
    const searchTerm = searchInput ? searchInput.value.toLowerCase() : '';
    const selectedCategorie = categorieFilter ? categorieFilter.value : 'all';
    
    const filtered = allInfractionsData.filter(infraction => {
        const matchesSearch = infraction.description.toLowerCase().includes(searchTerm);
        const matchesCategorie = selectedCategorie === 'all' || infraction.categorie === selectedCategorie;
        return matchesSearch && matchesCategorie;
    });
    
    renderInfractions(filtered);
}

function renderInfractions(infractions) {
    const list = document.getElementById('gestionInfractionsList');
    if (!list) return;
    
    if (infractions.length === 0) {
        list.innerHTML = '<div class="gestion-compte-loading">Aucune infraction trouvée</div>';
        return;
    }
    
    list.innerHTML = infractions.map(infraction => {
        return `
            <div class="gestion-compte-user-card">
                <div class="gestion-compte-user-header">
                    <div class="gestion-compte-user-info">
                        <div class="gestion-compte-user-id-name">${infraction.description || 'N/A'}</div>
                        <div class="gestion-compte-user-email">${infraction.categorie || 'N/A'}</div>
                    </div>
                </div>
                <div class="gestion-compte-user-details">
                    <div class="gestion-compte-user-detail-row">
                        <span>Amende:</span>
                        <span>$${infraction.amende ? infraction.amende.toLocaleString('fr-FR') : '0'}</span>
                    </div>
                    <div class="gestion-compte-user-detail-row">
                        <span>Temps:</span>
                        <span>${infraction.temps || '00:00'}</span>
                    </div>
                    ${infraction.special ? `
                    <div class="gestion-compte-user-detail-row">
                        <span>Spécial:</span>
                        <span>${infraction.special}</span>
                    </div>
                    ` : ''}
                </div>
                <div class="gestion-compte-user-actions">
                    <button class="gestion-compte-user-action-btn" onclick="editInfraction(${infraction.id})">Modifier</button>
                    <button class="gestion-compte-user-action-btn delete" onclick="deleteInfraction(${infraction.id})">Supprimer</button>
                </div>
            </div>
        `;
    }).join('');
}

function closeAddInfractionModal() {
    const modal = document.getElementById('addInfractionModal');
    if (modal) {
        modal.style.display = 'none';
        editingInfractionId = null;
        document.getElementById('infractionCategorieInput').value = 'Contravention';
        document.getElementById('infractionDescriptionInput').value = '';
        document.getElementById('infractionAmendeInput').value = '';
        document.getElementById('infractionTempsInput').value = '';
        document.getElementById('infractionSpecialInput').value = '';
        document.getElementById('addInfractionModalTitle').textContent = 'AJOUTER UNE INFRACTION';
    }
}

const addInfractionModal = document.getElementById('addInfractionModal');
if (addInfractionModal) {
    addInfractionModal.addEventListener('click', function(e) {
        if (e.target === addInfractionModal) {
            closeAddInfractionModal();
        }
    });
}

function openAddInfractionModal(id = null) {
    const modal = document.getElementById('addInfractionModal');
    if (!modal) return;
    
    editingInfractionId = id;
    
    if (id) {
        const infraction = allInfractionsData.find(i => i.id === id);
        if (infraction) {
            document.getElementById('infractionCategorieInput').value = infraction.categorie || 'Contravention';
            document.getElementById('infractionDescriptionInput').value = infraction.description || '';
            document.getElementById('infractionAmendeInput').value = infraction.amende || '';
            document.getElementById('infractionTempsInput').value = infraction.temps || '';
            document.getElementById('infractionSpecialInput').value = infraction.special || '';
            document.getElementById('addInfractionModalTitle').textContent = 'MODIFIER UNE INFRACTION';
        }
    } else {
        document.getElementById('infractionCategorieInput').value = 'Contravention';
        document.getElementById('infractionDescriptionInput').value = '';
        document.getElementById('infractionAmendeInput').value = '';
        document.getElementById('infractionTempsInput').value = '';
        document.getElementById('infractionSpecialInput').value = '';
        document.getElementById('addInfractionModalTitle').textContent = 'AJOUTER UNE INFRACTION';
    }
    
    modal.style.display = 'flex';
}

function editInfraction(id) {
    openAddInfractionModal(id);
}

async function saveInfraction() {
    const categorie = document.getElementById('infractionCategorieInput').value;
    const description = document.getElementById('infractionDescriptionInput').value;
    const amende = parseInt(document.getElementById('infractionAmendeInput').value);
    const temps = document.getElementById('infractionTempsInput').value;
    const special = document.getElementById('infractionSpecialInput').value;
    
    if (!categorie || !description || isNaN(amende) || !temps) {
        alert('Veuillez remplir tous les champs requis');
        return;
    }
    
    try {
        const url = editingInfractionId ? `/api/infractions/${editingInfractionId}` : '/api/infractions';
        const method = editingInfractionId ? 'PUT' : 'POST';
        
        const response = await fetch(url, {
            method: method,
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                categorie,
                description,
                amende,
                temps,
                special
            })
        });
        
        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.error || 'Erreur lors de la sauvegarde');
        }
        
        closeAddInfractionModal();
        await loadInfractions();
        await loadInfractionsFromAPI();
        alert('Infraction sauvegardée avec succès');
    } catch (error) {
        console.error('Erreur lors de la sauvegarde:', error);
        alert('Erreur lors de la sauvegarde: ' + error.message);
    }
}

async function deleteInfraction(id) {
    if (!confirm('Êtes-vous sûr de vouloir supprimer cette infraction ?')) {
        return;
    }
    
    try {
        const response = await fetch(`/api/infractions/${id}`, {
            method: 'DELETE'
        });
        
        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.error || 'Erreur lors de la suppression');
        }
        
        await loadInfractions();
        await loadInfractionsFromAPI();
        alert('Infraction supprimée avec succès');
    } catch (error) {
        console.error('Erreur lors de la suppression:', error);
        alert('Erreur lors de la suppression: ' + error.message);
    }
}