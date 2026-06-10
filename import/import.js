const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const JSZip = require('jszip');
const Papa = require('papaparse');
const FormData = require('form-data');
const axios = require('axios');
const { Jimp } = require('jimp');

//const db = require('../db/database');
const glpiService = require('../services/glpiService');

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = path.join(__dirname, '../uploads');
    if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    cb(null, Date.now() + '-' + file.originalname);
  }
});

const upload = multer({ storage: storage });
const cpUpload = upload.fields([
  { name: 'csvData1', maxCount: 1 },
  { name: 'csvData2', maxCount: 1 },
  { name: 'csvData3', maxCount: 1 },
  { name: 'imageZip', maxCount: 1 }
]);

const parseCSVFile = async (filePath) => {
  const content = fs.readFileSync(filePath, 'utf8')
  const parsed = Papa.parse(content, { header: true, skipEmptyLines: true })
  return parsed.data || []
}

const getAllFiles = (dirPath, arrayOfFiles) => {
  const files = fs.readdirSync(dirPath);
  arrayOfFiles = arrayOfFiles || [];

  files.forEach((file) => {
    if (fs.statSync(dirPath + "/" + file).isDirectory()) {
      arrayOfFiles = getAllFiles(dirPath + "/" + file, arrayOfFiles);
    } else {
      arrayOfFiles.push(path.join(dirPath, file));
    }
  });

  return arrayOfFiles;
};

// POST /api/import
router.post('/', cpUpload, async (req, res) => {
  console.log("[Import] Lancement de l'importation avec conversion PNG -> JPEG active...");
  const files = req.files;

  if (!files || !files['csvData1'] || !files['csvData2'] || !files['csvData3'] || !files['imageZip']) {
    return res.status(400).json({ success: false, message: "Paquet incomplet." });
  }

  const csv1Path = files['csvData1'][0].path;
  const csv2Path = files['csvData2'][0].path;
  const csv3Path = files['csvData3'][0].path;
  const zipPath = files['imageZip'][0].path;

  try {
    const targetImagesDir = path.join(__dirname, '../public/images');
    if (!fs.existsSync(targetImagesDir)) fs.mkdirSync(targetImagesDir, { recursive: true });

    try {
      const zipContent = fs.readFileSync(zipPath)
      const zip = await JSZip.loadAsync(zipContent)
      const entries = Object.keys(zip.files)
      for (const name of entries) {
        const fileObj = zip.files[name]
        if (fileObj.dir) continue
        const data = await fileObj.async('nodebuffer')
        const outName = path.basename(name)
        const outPath = path.join(targetImagesDir, outName)
        fs.writeFileSync(outPath, data)
      }
    } catch (e) {
      console.error('[Import] Erreur extraction ZIP:', e.message)
    }

    const assetsData = await parseCSVFile(csv1Path);
    const ticketsData = await parseCSVFile(csv2Path);
    const ticketsCostsData = await parseCSVFile(csv3Path);

    const sessionToken = await glpiService.initSession();
    // SQLite integration disabled for now — data persistence handled server-side or removed.
    // const sqliteConnection = db.getDb();

    let allExtractedPaths = [];
    if (fs.existsSync(targetImagesDir)) {
      allExtractedPaths = getAllFiles(targetImagesDir);
    }

    // SQLite statements commented out (persisting to local DB disabled)
    // const stmtAsset = sqliteConnection.prepare(` ... `);

    let fallbackIdCounter = 9000;

    // ─── ÉTAPE A : INJECTION DES MATÉRIELS ────────────────────────────────────
    for (const asset of assetsData) {
      if (!asset.Name) continue;

      let glpiId = null;
      let itemtype = asset.Item_Type ? asset.Item_Type.trim() : "Computer";

      try {
        // Obtenir ou créer les entités GLPI liées (Manufacturer, Location, Model)
        const manufacturerId = asset.Manufacturer ? await glpiService.getOrCreateManufacturer(asset.Manufacturer.trim()) : null;
        const locationId = asset.Location ? await glpiService.getOrCreateLocation(asset.Location.trim()) : null;
        const modelId = asset.Model ? await glpiService.getOrCreateModel(itemtype, asset.Model.trim()) : null;

        // Déterminer le state ID selon le statut
        let stateId = 1; // Par défaut "En production"
        const statusLower = (asset.Status || '').trim().toLowerCase();
        if (statusLower === 'en production') stateId = 1;
        else if (statusLower === 'maintenance') stateId = 2;
        else if (statusLower === 'en stock') stateId = 3;
        else if (statusLower === 'en panne') stateId = 4;

        // Préparer le payload pour GLPI avec les bons IDs
        const glpiPayload = {
          name: asset.Name,
          otherserial: asset.Inventory_Number || "",
          comment: `Importé via NewApp`,
          states_id: stateId
        };

        // Ajouter les champs relationnels avec les bons noms GLPI (suffix _id)
        if (manufacturerId) glpiPayload.manufacturers_id = manufacturerId;
        if (locationId) glpiPayload.locations_id = locationId;
        if (modelId) {
          // Le nom du champ dépend du type d'équipement
          const modelFieldName = glpiService.getModelFieldNameForItemType(itemtype);
          if (modelFieldName) {
            glpiPayload[modelFieldName] = modelId;
          }
        }

        // Ajouter l'utilisateur assigné si fourni
        // ⚠️ IMPORTANT: GLPI attend l'ID numérique, pas le nom d'utilisateur
        if (asset.User && asset.User.trim()) {
          const userId = await glpiService.getOrCreateUser(asset.User.trim());
          if (userId) {
            glpiPayload.users_id = userId;
            console.log(`[GLPI] Utilisateur assigné: "${asset.User.trim()}" (ID: ${userId})`);
          } else {
            console.warn(`[GLPI] ⚠️ Utilisateur "${asset.User.trim()}" non trouvé - pas assigné`);
          }
        }

        const result = await glpiService.createItem(itemtype, glpiPayload);
        if (result && result.id) {
          glpiId = result.id;
          console.log(`[GLPI] ✅ ${itemtype} "${asset.Name}" créé (ID #${glpiId}) - Statut: ${statusLower}, Utilisateur: ${asset.User || 'N/A'}`);
        }
      } catch (glpiErr) {
        console.warn(`[GLPI] ❌ Erreur création ${itemtype} "${asset.Name}":`, glpiErr.message);
      }

      if (!glpiId) {
        fallbackIdCounter++;
        glpiId = fallbackIdCounter;
      }

      // Gestion du Statut
      let cleanStatus = asset.Status ? asset.Status.trim().toLowerCase() : "";
      let statusVal = "En production"; // Par défaut
      if (cleanStatus === 'en production') statusVal = "En production";
      else if (cleanStatus === 'maintenance') statusVal = "Maintenance";
      else if (cleanStatus === 'en stock') statusVal = "En stock";
      else if (cleanStatus === 'en panne') statusVal = "En panne";
      else statusVal = asset.Status || "En production";

      // Recherche d'image
      let matchedImagePath = allExtractedPaths.find(fullPath => {
        const fileNameOnly = path.basename(fullPath).toLowerCase();
        if (fileNameOnly.startsWith('.') || fileNameOnly.startsWith('._')) return false;
        return fileNameOnly.startsWith(asset.Name.toLowerCase()) ||
          (asset.Inventory_Number && fileNameOnly.includes(asset.Inventory_Number.toLowerCase()));
      }) || null;

      let finalImageName = matchedImagePath ? path.basename(matchedImagePath) : null;

      if (matchedImagePath && glpiId < 9000) {
        let originalName = path.basename(matchedImagePath);
        const fileExt = path.extname(originalName).toLowerCase();

        try {
          const glpiUrlBase = process.env.GLPI_URL || "http://localhost/api.php/v1";
          const appToken = process.env.GLPI_APP_TOKEN || "uqZqwaXWY3GYWltQ7DidFLLQtWvHhjS92t99yMC4";

          let fileBufferToSend;
          let sendName = originalName;

          // CONVERSION INTERNE : Si c'est un PNG, on force la conversion en JPEG
          if (fileExt === '.png') {
            console.log(`[Conversion] Outil Jimp : Transformation de ${originalName} en JPEG pour GLPI...`);

            let image;
            const jimpInstance = require('jimp');

            // 1. Lecture de l'image s'adaptant à la version installée
            if (typeof Jimp.read === 'function') {
              image = await Jimp.read(matchedImagePath);
            } else if (typeof jimpInstance.read === 'function') {
              image = await jimpInstance.read(matchedImagePath);
            } else {
              image = await jimpInstance.Jimp.read(matchedImagePath);
            }

            // 2. Extraction du Buffer au format JPEG (Compatible Jimp v1.x et versions antérieures)
            if (image.bitmap && typeof image.bitmap.toBuffer === 'function') {
              // Syntaxe native Jimp v1.x
              fileBufferToSend = await image.bitmap.toBuffer('image/jpeg');
            } else if (typeof image.getBufferAsync === 'function') {
              // Ancienne syntaxe classique
              fileBufferToSend = await image.getBufferAsync('image/jpeg');
            } else {
              // Solution de secours universelle
              fileBufferToSend = await image.getBuffer('image/jpeg');
            }

            sendName = originalName.replace(/\.png$/i, '.jpeg');
            finalImageName = sendName; // Mettre à jour pour SQLite
          } else {
            // Si c'est déjà un jpeg/jpg, on le lit normalement
            fileBufferToSend = fs.readFileSync(matchedImagePath);
          }

          const form = new FormData();
          form.append('uploadManifest', JSON.stringify({
            input: { name: `Image de ${asset.Name}`, filename: sendName }
          }));

          form.append('filename[]', fileBufferToSend, {
            filename: sendName,
            contentType: 'image/jpeg' // On n'envoie plus que du JPEG à GLPI !
          });

          const docResponse = await axios.post(`${glpiUrlBase}/Document`, form, {
            headers: {
              ...form.getHeaders(),
              "Session-Token": sessionToken,
              "App-Token": appToken
            }
          });

          const documentId = docResponse.data ? docResponse.data.id : null;

          if (documentId) {
            await axios.post(`${glpiUrlBase}/Document_Item`, {
              input: { documents_id: documentId, items_id: glpiId, itemtype: itemtype }
            }, {
              headers: {
                'Content-Type': 'application/json',
                "Session-Token": sessionToken,
                "App-Token": appToken
              }
            });
            console.log(`[GLPI] 🖼️ Image convertie et liée avec succès (Doc #${documentId})`);
          }
        } catch (imgErr) {
          console.error(`[GLPI] ❌ Échec envoi image convertie pour ${asset.Name}:`, imgErr.message);
        }
      }

      // Persistence to local SQLite is disabled. Log the import result instead.
      console.log(`[Import] ✅ Asset "${asset.Name}" imported into GLPI (Type: ${itemtype}, GLPI ID: ${glpiId}, Image: ${finalImageName})`);
    }

    // ─── ÉTAPE B : INJECTION DES TICKETS ─────────────────────────────────────
    // SQLite ticket persistence disabled (stmtTicket commented out)
    // const stmtTicket = sqliteConnection.prepare(`...`);

    // Créer un index pour les coûts par numéro de ticket (Feuille 3)
    const costsByTicketNum = {};
    for (const cost of ticketsCostsData) {
      const ticketNum = cost.Num_Ticket || cost.num_ticket;
      if (!costsByTicketNum[ticketNum]) {
        costsByTicketNum[ticketNum] = {
          duration_second: 0,
          time_cost: 0,
          fixed_cost: 0
        };
      }
      // Accumuler les données (au cas où plusieurs lignes pour le même ticket)
      costsByTicketNum[ticketNum].duration_second += parseInt(cost.Duration_second || cost.duration_second || 0) || 0;
      costsByTicketNum[ticketNum].time_cost += parseFloat((cost.Time_Cost || cost.time_cost || '0').toString().replace(',', '.')) || 0;
      costsByTicketNum[ticketNum].fixed_cost += parseFloat((cost.Fixed_Cost || cost.fixed_cost || '0').toString().replace(',', '.')) || 0;
    }

    for (const ticket of ticketsData) {
      if (!ticket.Ref_Ticket) continue;
      let glpiTicketId = null;

      try {
        const resultTicket = await glpiService.createItem("Ticket", {
          name: ticket.Titre || "Ticket sans titre",
          content: ticket.Description || "",
          type: ticket.Type || "Incident",
          status: 1,
          priority: (ticket.Priority === 'High' || ticket.Priority === 'Haute') ? 5 : 3,
          urgency: (ticket.Priority === 'High' || ticket.Priority === 'Haute') ? 4 : 3,
          impact: 2
        });
        if (resultTicket && resultTicket.id) glpiTicketId = resultTicket.id;
      } catch (e) {
        console.warn(`[GLPI] ❌ Erreur création ticket ${ticket.Ref_Ticket}:`, e.message);
      }

      if (!glpiTicketId) glpiTicketId = parseInt(ticket.Ref_Ticket);

      // Déterminer le statut
      let statusId = 1; // Par défaut "New"
      const statusLower = (ticket.Status || '').trim().toLowerCase();
      if (statusLower === 'in progress' || statusLower === 'en cours') statusId = 2;
      else if (statusLower === 'closed' || statusLower === 'clos') statusId = 5;
      else if (statusLower === 'on hold' || statusLower === 'en attente') statusId = 3;

      // Déterminer la priorité
      let priorityId = 3; // Par défaut "Medium"
      const priorityLower = (ticket.Priority || '').trim().toLowerCase();
      if (priorityLower === 'high' || priorityLower === 'haute') priorityId = 5;
      else if (priorityLower === 'low' || priorityLower === 'basse') priorityId = 2;

      // Date de création
      const dateCreation = (ticket.Date && ticket.Heure) ? `${ticket.Date} ${ticket.Heure}` : new Date().toISOString();

      // Récupérer les coûts associés à ce ticket (par Ref_Ticket)
      const costData = costsByTicketNum[ticket.Ref_Ticket] || { duration_second: 0, time_cost: 0, fixed_cost: 0 };

      // Parser les items
      let itemsList = [];
      if (ticket.Items) {
        try {
          itemsList = JSON.parse(ticket.Items);
        } catch (e) {
          itemsList = [ticket.Items];
        }
      }

      // Ticket persisted to GLPI; local persistence disabled.
      console.log(`[Import] ✅ Ticket #${ticket.Ref_Ticket} processed (GLPI ID: ${glpiTicketId})`);
    }

    try { fs.unlinkSync(csv1Path); fs.unlinkSync(csv2Path); fs.unlinkSync(csv3Path); fs.unlinkSync(zipPath); } catch (e) { }

    return res.json({ success: true, message: "Importation terminée avec adaptation d'image !" });

  } catch (error) {
    console.error("🔴 Erreur critique :", error);
    return res.status(500).json({ success: false, message: error.message });
  }
});

module.exports = router;