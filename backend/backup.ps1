# ==============================================================================
# CYBER-CORTEX ERP : SCRIPTS DE SAUVEGARDE (WINDOWS DEV NODE)
# ==============================================================================

$SourceDir = "."
$BackupDir = ".\backups"
$Timestamp = Get-Date -Format "yyyy-MM-dd_HH-mm-ss"
$DbFile = "greenhouse.db"
$BackupFile = "$BackupDir\cybercortex_backup_$Timestamp.sqlite"

Write-Host "========================================"
Write-Host "[$(Get-Date -Format 'yyyy-MM-dd HH:mm:ss')] Lancement du Backup SQLite"
Write-Host "========================================"

# 1. Création du dossier de destination s'il n'existe pas
if (-not (Test-Path -Path $BackupDir)) {
    New-Item -ItemType Directory -Path $BackupDir | Out-Null
}

# 2. Copie sécurisée du fichier base de données
$SourcePath = Join-Path -Path $SourceDir -ChildPath $DbFile
if (Test-Path -Path $SourcePath) {
    Copy-Item -Path $SourcePath -Destination $BackupFile
    Write-Host "[✅] Sauvegarde réussie : $BackupFile"
} else {
    Write-Host "[❌] ERREUR : Fichier source introuvable ($SourcePath)"
    exit 1
}

# 3. Rétention : Nettoyage des vieilles sauvegardes (> 7 j)
Write-Host "[⏳] Nettoyage des sauvegardes vieilles de plus de 7 jours..."
$LimitDate = (Get-Date).AddDays(-7)
Get-ChildItem -Path $BackupDir -Filter "cybercortex_backup_*.sqlite" | Where-Object { $_.CreationTime -lt $LimitDate } | Remove-Item -Force

Write-Host "[🧹] Nettoyage terminé."
Write-Host "========================================"
