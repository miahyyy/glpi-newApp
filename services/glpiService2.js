const axios = require("axios");
const dotenv = require("dotenv");
dotenv.config();

const GLPI_URL = process.env.GLPI_URL || "http://localhost/api.php/v1";
const APP_TOKEN = process.env.GLPI_APP_TOKEN || "uqZqwaXWY3GYWltQ7DidFLLQtWvHhjS92t99yMC4";
const USER_TOKEN = process.env.GLPI_USER_TOKEN || "4iczjvT5d0IZ99MC2rj9knxXxHe0Ms8ljy6u40FX";

let sessionToken = null;

// ─── Init Session ────────────────────────────────────────────────────────────
async function initSession() {
  const response = await axios.get(`${GLPI_URL}/initSession`, {
    headers: {
      "Content-Type": "application/json",
      "App-Token": APP_TOKEN,
      Authorization: `user_token ${USER_TOKEN}`,
    },
  });
  sessionToken = response.data.session_token;
  console.log("[GLPI] Session initialisée :", sessionToken);
  return sessionToken;
}

// ─── Kill Session ────────────────────────────────────────────────────────────
async function killSession() {
  if (!sessionToken) return;
  await axios.get(`${GLPI_URL}/killSession`, {
    headers: buildHeaders(),
  });
  sessionToken = null;
  console.log("[GLPI] Session terminée");
}

// ─── Headers communs ─────────────────────────────────────────────────────────
function buildHeaders() {
  return {
    "Content-Type": "application/json",
    "App-Token": APP_TOKEN,
    "Session-Token": sessionToken,
  };
}

// ─── GET générique ────────────────────────────────────────────────────────────
async function getItems(itemtype, params = {}) {
  if (!sessionToken) await initSession();
  const response = await axios.get(`${GLPI_URL}/${itemtype}`, {
    headers: buildHeaders(),
    params: { range: "0-999", ...params },
  });
  return response.data;
}

// ─── GET par ID ───────────────────────────────────────────────────────────────
async function getItemById(itemtype, id) {
  if (!sessionToken) await initSession();
  const response = await axios.get(`${GLPI_URL}/${itemtype}/${id}`, {
    headers: buildHeaders(),
  });
  return response.data;
}

// ─── POST (création) ──────────────────────────────────────────────────────────
async function createItem(itemtype, data) {
  if (!sessionToken) await initSession();
  const response = await axios.post(
    `${GLPI_URL}/${itemtype}`,
    { input: data },
    { headers: buildHeaders() }
  );
  return response.data;
}

// ─── PUT (mise à jour) ────────────────────────────────────────────────────────
async function updateItem(itemtype, id, data) {
  if (!sessionToken) await initSession();
  const response = await axios.put(
    `${GLPI_URL}/${itemtype}/${id}`,
    { input: { id, ...data } },
    { headers: buildHeaders() }
  );
  console.log(`[GLPI] ${itemtype} #${id} mis à jour avec :`, data);
  return response.data;
}

// ─── DELETE ───────────────────────────────────────────────────────────────────
async function deleteItem(itemtype, id) {
  if (!sessionToken) await initSession();
  const response = await axios.delete(`${GLPI_URL}/${itemtype}/${id}`, {
    headers: buildHeaders(),
    data: { input: { id } },
  });
  return response.data;
}

// ─── Recherche (searchOptions) ────────────────────────────────────────────────
async function searchItems(itemtype, criteria = []) {
  if (!sessionToken) await initSession();
  const response = await axios.get(`${GLPI_URL}/search/${itemtype}`, {
    headers: buildHeaders(),
    params: { criteria },
  });
  return response.data;
}

// Fonction générique pour envoyer n'importe quel actif de NewApp vers GLPI
async function pushAssetToGLPI(assetData, sessionToken) {
  // Déterminer l'itemtype GLPI (par défaut Computer si non spécifié)
  const itemtype = assetData.itemtype || "Computer";
  
  try {
    console.log(`[GLPI] Tentative d'envoi d'un actif vers ${GLPI_URL}/${itemtype}...`);

    const response = await axios.post(`${GLPI_URL}/${itemtype}`, {
      input: {
        name: assetData.name,
        serial: assetData.serial || "",
        otherserial: assetData.otherserial || "",
        comment: "Importé depuis NewApp" // Optionnel : pour marquer la provenance
      }
    }, {
      params: {
        app_token: APP_TOKEN // Utilise la variable locale de ton fichier
      },
      headers: {
        'Session-Token': sessionToken,
        'Content-Type': 'application/json'
      }
    });

    // GLPI retourne un objet contenant l'ID généré sur le serveur (ex: { id: 42, message: "..." })
    if (response.data && response.data.id) {
      console.log(`[GLPI] Succès : ${itemtype} "${assetData.name}" créé avec l'ID GLPI #${response.data.id}`);
      return response.data.id; // On retourne l'ID GLPI généré
    }
    
    return null;
  } catch (error) {
    const errorDetails = error.response ? JSON.stringify(error.response.data) : error.message;
    console.error(`[GLPI] Échec de l'envoi de l'actif ${assetData.name} (${itemtype}) :`, errorDetails);
    throw error;
  }
}

// Fonction pour supprimer un ticket spécifique par son ID GLPI
async function deleteTicketFromGLPI(ticketGlpiId, sessionToken) {
  try {
    await axios.delete(`${GLPI_URL}/Ticket/${ticketGlpiId}`, {
      params: { 
        force_purge: true,
        app_token: APP_TOKEN // ◄── Corrigé : Utilise la variable locale en minuscules
      },
      headers: {
        'Session-Token': sessionToken
      }
    });
  } catch (error) {
    console.error(`[GLPI] Échec de la suppression du ticket ${ticketGlpiId}:`, error.message);
  }
}

// Fonction globale pour vider tous les tickets de GLPI
async function purgeAllGLPITickets(sessionToken) {
  try {
    console.log("[GLPI] Récupération des tickets avant purge...");
    
    // 1. Récupération des tickets — Passage de app_token en Query string (minuscules)
    const response = await axios.get(`${GLPI_URL}/Ticket`, {
      params: {
        app_token: APP_TOKEN // ◄── Corrigé : Variable locale en minuscules
      },
      headers: {
        'Session-Token': sessionToken
      }
    });

    let tickets = [];
    if (Array.isArray(response.data)) {
      tickets = response.data;
    } else if (response.data && typeof response.data === 'object') {
      tickets = response.data.data || Object.values(response.data);
    }

    const validTickets = tickets.filter(t => t && t.id);

    if (validTickets.length === 0) {
      console.log("[GLPI] Aucun ticket trouvé sur le serveur à supprimer.");
      return;
    }

    console.log(`[GLPI] Suppression de ${validTickets.length} tickets sur le serveur...`);

    // 2. Boucle de suppression définitive
    for (const ticket of validTickets) {
      try {
        await axios.delete(`${GLPI_URL}/Ticket/${ticket.id}`, {
          params: {
            app_token: APP_TOKEN // ◄── Corrigé : Variable locale en minuscules
          },
          headers: {
            'Session-Token': sessionToken,
          },
          data: {
            input: {
              id: ticket.id
            },
            force_purge: true
          }
        });
        console.log(`[GLPI] Ticket #${ticket.id} supprimé.`);
      } catch (deleteError) {  
        const delDetails = deleteError.response ? JSON.stringify(deleteError.response.data) : deleteError.message;
        console.error(`[GLPI] Impossible de supprimer le ticket #${ticket.id} :`, delDetails);
      }
    }
    console.log("[GLPI] Fin de la purge des tickets.");
  } catch (error) {
    const errorDetails = error.response ? JSON.stringify(error.response.data) : error.message;
    console.error("[GLPI] Erreur lors de la purge globale :", errorDetails);
  }
}

// Fonction pour synchroniser l'ensemble du parc informatique depuis GLPI
async function fetchAllGLPIAssets(sessionToken) {
  // Liste des types d'actifs que l'on souhaite récupérer de GLPI
  const itemtypes = ["Computer", "Printer", "NetworkEquipment", "Peripheral", "Monitor"];
  let allAssets = [];

  console.log("[GLPI] Début de la récupération de tous les actifs du parc...");

  for (const itemtype of itemtypes) {
    try {
      console.log(`[GLPI] Récupération des éléments de type : ${itemtype}...`);
      
      const response = await axios.get(`${GLPI_URL}/${itemtype}`, {
        params: {
          app_token: APP_TOKEN,
          range: "0-300" // Ajuste la limite selon la taille de ton parc de test
        },
        headers: {
          'Session-Token': sessionToken
        }
      });

      let items = [];
      if (Array.isArray(response.data)) {
        items = response.data;
      } else if (response.data && typeof response.data === 'object') {
        items = response.data.data || Object.values(response.data);
      }

      // On formate chaque élément pour qu'il corresponde à la structure attendue par ta table SQLite
      const formattedItems = items
        .filter(item => item && item.id)
        .map(item => ({
          glpi_id: item.id,
          itemtype: itemtype, // Garde la trace du type (Computer, Printer...)
          name: item.name || "Sans nom",
          serial: item.serial || null,
          otherserial: item.otherserial || null,
          status: item.states_id || 1, // Récupère l'état GLPI ou met 1 par défaut
          data_json: JSON.stringify(item) // Sauvegarde l'intégralité de l'objet GLPI au format JSON
        }));

      allAssets = allAssets.concat(formattedItems);
      console.log(`[GLPI] ${formattedItems.length} actifs trouvés pour ${itemtype}.`);

    } catch (error) {
      // Si un type d'actif n'est pas activé ou est vide dans GLPI, on passe au suivant sans bloquer
      console.warn(`[GLPI] Pas d'éléments récupérés pour ${itemtype} (ou endpoint indisponible).`);
    }
  }

  return allAssets;
}

// ─── Fonctions pour gérer les champs relationnels (Manufacturer, Location, Models) ──────────────
// Recherche ou crée un Manufacturer par son nom
async function getOrCreateManufacturer(name) {
  if (!name || name.length === 0) return null;
  
  try {
    if (!sessionToken) await initSession();
    
    // Recherche du fabricant existant
    const response = await axios.get(`${GLPI_URL}/Manufacturer`, {
      headers: buildHeaders(),
      params: { 
        searchText: { name: name },
        range: "0-100"
      }
    });
    
    let items = Array.isArray(response.data) ? response.data : [];
    let existing = items.find(m => m.name === name);
    
    if (existing && existing.id) {
      console.log(`[GLPI] Fabricant existant trouvé: "${name}" (ID: ${existing.id})`);
      return existing.id;
    }
    
    // Créer si n'existe pas
    const createResp = await createItem("Manufacturer", { name: name });
    if (createResp && createResp.id) {
      console.log(`[GLPI] Nouveau fabricant créé: "${name}" (ID: ${createResp.id})`);
      return createResp.id;
    }
  } catch (err) {
    console.warn(`[GLPI] Erreur gestion fabricant "${name}":`, err.message);
  }
  return null;
}

// Recherche ou crée une Location par son nom
async function getOrCreateLocation(name) {
  if (!name || name.length === 0) return null;
  
  try {
    if (!sessionToken) await initSession();
    
    // Recherche de la localisation existante
    const response = await axios.get(`${GLPI_URL}/Location`, {
      headers: buildHeaders(),
      params: { 
        searchText: { name: name },
        range: "0-100"
      }
    });
    
    let items = Array.isArray(response.data) ? response.data : [];
    let existing = items.find(l => l.name === name);
    
    if (existing && existing.id) {
      console.log(`[GLPI] Localisation existante trouvée: "${name}" (ID: ${existing.id})`);
      return existing.id;
    }
    
    // Créer si n'existe pas
    const createResp = await createItem("Location", { name: name });
    if (createResp && createResp.id) {
      console.log(`[GLPI] Nouvelle localisation créée: "${name}" (ID: ${createResp.id})`);
      return createResp.id;
    }
  } catch (err) {
    console.warn(`[GLPI] Erreur gestion localisation "${name}":`, err.message);
  }
  return null;
}

// Recherche ou crée un Model par son nom et type
async function getOrCreateModel(itemtype, modelName) {
  if (!modelName || modelName.length === 0) return null;
  
  try {
    if (!sessionToken) await initSession();
    
    // Déterminer le bon type de modèle selon le type d'équipement
    const modelType = getModelTypeForItemType(itemtype);
    if (!modelType) return null;
    
    // Recherche du modèle existant avec une simple requête GET
    const response = await axios.get(`${GLPI_URL}/${modelType}`, {
      headers: buildHeaders(),
      params: { range: "0-300" }
    });
    
    let items = Array.isArray(response.data) ? response.data : [];
    let existing = items.find(m => m.name && m.name === modelName);
    
    if (existing && existing.id) {
      console.log(`[GLPI] Modèle existant trouvé: "${modelName}" (ID: ${existing.id})`);
      return existing.id;
    }
    
    // Créer si n'existe pas
    const createResp = await createItem(modelType, { name: modelName });
    if (createResp && createResp.id) {
      console.log(`[GLPI] Nouveau modèle créé: "${modelName}" (ID: ${createResp.id})`);
      return createResp.id;
    }
  } catch (err) {
    console.warn(`[GLPI] Erreur gestion modèle "${modelName}":`, err.message);
  }
  return null;
}

// Retourne le bon type de modèle selon le type d'équipement
function getModelTypeForItemType(itemtype) {
  const mapping = {
    'Computer': 'ComputerModel',
    'Monitor': 'MonitorModel',
    'Printer': 'PrinterModel',
    'NetworkEquipment': 'NetworkEquipmentModel',
    'Peripheral': 'PeripheralModel',
    'Phone': 'PhoneModel'
  };
  return mapping[itemtype] || null;
}

// Retourne le bon nom de champ pour le modèle en fonction du type d'équipement
function getModelFieldNameForItemType(itemtype) {
  const mapping = {
    'Computer': 'computermodels_id',
    'Monitor': 'monitormodels_id',
    'Printer': 'printermodels_id',
    'NetworkEquipment': 'networkequipmentmodels_id',
    'Peripheral': 'peripheralmodels_id',
    'Phone': 'phonemodels_id'
  };
  return mapping[itemtype] || null;
}

// Recherche un utilisateur par son nom/login
// async function getOrCreateUser(username) {
//   if (!username || username.length === 0) return null;
  
//   try {
//     if (!sessionToken) await initSession();
    
//     // Recherche de l'utilisateur existant
//     const response = await axios.get(`${GLPI_URL}/User`, {
//       headers: buildHeaders(),
//       params: { 
//         range: "0-300"
//       }
//     });
    
//     let items = Array.isArray(response.data) ? response.data : [];
//     // Chercher par login ou realname
//     let existing = items.find(u => 
//       u.name === username || u.login === username || u.realname === username
//     );
    
//     if (existing && existing.id) {
//       console.log(`[GLPI] Utilisateur trouvé: "${username}" (ID: ${existing.id})`);
//       return existing.id;
//     }
    
//     console.warn(`[GLPI] ⚠️ Utilisateur "${username}" non trouvé dans GLPI. Il doit être créé manuellement.`);
//     return null;
//   } catch (err) {
//     console.warn(`[GLPI] Erreur lors de la recherche d'utilisateur "${username}":`, err.message);
//   }
//   return null;
// }

async function getOrCreateUser(username) {
  if (!username || username.length === 0) return null;
  
  try {
    if (!sessionToken) await initSession();
    
    // 1. Recherche de l'utilisateur existant
    const response = await axios.get(`${GLPI_URL}/User`, {
      headers: buildHeaders(),
      params: { range: "0-300" }
    });
    
    let items = Array.isArray(response.data) ? response.data : [];
    let existing = items.find(u => 
      u.name === username || u.login === username || u.realname === username
    );
    
    if (existing && existing.id) {
      console.log(`[GLPI] Utilisateur trouvé: "${username}" (ID: ${existing.id})`);
      return existing.id;
    }
    
    // 2. Si non trouvé, on le crée
    console.log(`[GLPI] Utilisateur "${username}" non trouvé. Tentative de création...`);
    
    // On utilise ta fonction générique createItem
    const newUser = await createItem("User", {
      name: username, // 'name' est le login dans GLPI
      realname: username, // On met le même nom par défaut
      is_active: 1
    });

    if (newUser && newUser.id) {
      console.log(`[GLPI] Utilisateur "${username}" créé avec succès (ID: ${newUser.id})`);
      return newUser.id;
    }

    return null;
  } catch (err) {
    const errorDetails = err.response ? JSON.stringify(err.response.data) : err.message;
    console.error(`[GLPI] Erreur lors de la gestion de l'utilisateur "${username}":`, errorDetails);
  }
  return null;
}

module.exports = {
  initSession,
  killSession,
  getItems,
  getItemById,
  createItem,
  updateItem,
  deleteItem,
  searchItems,
  pushAssetToGLPI,
  purgeAllGLPITickets,
  fetchAllGLPIAssets,
  getOrCreateManufacturer,
  getOrCreateLocation,
  getOrCreateModel,
  getModelTypeForItemType,
  getModelFieldNameForItemType,
  getOrCreateUser
};
