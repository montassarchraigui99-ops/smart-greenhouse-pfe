#!/bin/bash
# ==============================================================================
# CYBER-CORTEX ERP : SCRIPTS DE SAUVEGARDE (EDGE NODE)
# ==============================================================================

SOURCE_DIR="./config"
BACKUP_DIR="./backups"
TIMESTAMP=$(date +"%Y-%m-%d_%H-%M-%S")
DB_FILE="greenhouse.db"
BACKUP_FILE="${BACKUP_DIR}/cybercortex_backup_${TIMESTAMP}.sqlite"

echo "========================================"
echo "[$(date)] Lancement du Backup SQLite"
echo "========================================"

# 1. Création du dossier de destination s'il n'existe pas
mkdir -p "$BACKUP_DIR"

# 2. Copie sécurisée du fichier base de données avec horodatage
if [ -f "${SOURCE_DIR}/${DB_FILE}" ]; then
    cp "${SOURCE_DIR}/${DB_FILE}" "$BACKUP_FILE"
    echo "[✅] Sauvegarde réussie : $BACKUP_FILE"
else
    echo "[❌] ERREUR : Fichier source introuvable (${SOURCE_DIR}/${DB_FILE})"
    exit 1
fi

# 3. Politique de rétention : Nettoyage des sauvegardes de plus de 7 jours
echo "[⏳] Nettoyage des sauvegardes datant de plus de 7 jours..."
find "$BACKUP_DIR" -name "cybercortex_backup_*.sqlite" -type f -mtime +7 -exec rm {} \;

echo "[🧹] Nettoyage terminé."
echo "========================================"
