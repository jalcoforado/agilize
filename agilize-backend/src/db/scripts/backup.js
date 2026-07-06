// Salva os seeds atuais (001 e 004) em src/db/backups/ com timestamp.
// Executado automaticamente pelo db:reset antes de qualquer limpeza.
const fs   = require('fs');
const path = require('path');

const SEEDS_DIR   = path.join(__dirname, '../seeds');
const BACKUPS_DIR = path.join(__dirname, '../backups');

const ts   = new Date().toISOString().slice(0, 19).replace('T', '_').replace(/:/g, '-');
const files = ['001_initial_data.js', '004_estado_atual.js'];

if (!fs.existsSync(BACKUPS_DIR)) fs.mkdirSync(BACKUPS_DIR, { recursive: true });

let saved = 0;
for (const f of files) {
  const src = path.join(SEEDS_DIR, f);
  if (!fs.existsSync(src)) continue;
  const content = fs.readFileSync(src, 'utf8');
  // Não salva se o seed já é vazio (guard contra loop de backup de nada)
  if (content.includes('Nenhum dado transacional')) {
    console.log(`[backup] ${f} — vazio, ignorado.`);
    continue;
  }
  const dest = path.join(BACKUPS_DIR, `${ts}_${f}`);
  fs.copyFileSync(src, dest);
  console.log(`[backup] ${f} → backups/${ts}_${f}`);
  saved++;
}

if (saved === 0) console.log('[backup] Nenhum arquivo salvo (seeds vazios).');
else console.log(`[backup] ${saved} arquivo(s) salvos em src/db/backups/`);
