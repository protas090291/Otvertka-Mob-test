const fs = require('fs');
const fsp = require('fs/promises');
const path = require('path');
const os = require('os');
const { spawnSync } = require('child_process');
const { createClient } = require('@supabase/supabase-js');

const BUCKET = process.env.SUPABASE_PLANS_BUCKET || 'architectural-plans';
const POPPLER_ROOT = process.env.POPPLER_ROOT || 'C:\\tools\\poppler\\poppler';

function requireEnv(name) {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing env var: ${name}`);
  }
  return value;
}

function loadEnvFileIfPresent() {
  const envPath = process.env.SUPABASE_ENV_FILE || path.join(__dirname, '.env.local');
  if (!fs.existsSync(envPath)) return;
  const raw = fs.readFileSync(envPath, 'utf8');
  for (const line of raw.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const idx = trimmed.indexOf('=');
    if (idx === -1) continue;
    const key = trimmed.slice(0, idx).trim();
    let val = trimmed.slice(idx + 1).trim();
    if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
      val = val.slice(1, -1);
    }
    if (!process.env[key]) {
      process.env[key] = val;
    }
  }
}

function findPdftoppmExe() {
  const candidate1 = path.join(POPPLER_ROOT, 'Library', 'bin', 'pdftoppm.exe');
  const candidate2 = path.join(POPPLER_ROOT, 'bin', 'pdftoppm.exe');
  if (fs.existsSync(candidate1)) return candidate1;
  if (fs.existsSync(candidate2)) return candidate2;

  const fallbackRoot = 'C:\\tools\\poppler';
  try {
    if (fs.existsSync(fallbackRoot)) {
      const queue = [fallbackRoot];
      while (queue.length) {
        const dir = queue.shift();
        const entries = fs.readdirSync(dir, { withFileTypes: true });
        for (const ent of entries) {
          const full = path.join(dir, ent.name);
          if (ent.isDirectory()) {
            queue.push(full);
          } else if (ent.isFile() && ent.name.toLowerCase() === 'pdftoppm.exe') {
            return full;
          }
        }
      }
    }
  } catch {
    // ignore
  }

  throw new Error(
    `pdftoppm.exe not found. Looked in:\n- ${candidate1}\n- ${candidate2}\nAlso searched recursively under: ${fallbackRoot}\nSet POPPLER_ROOT to the extracted Poppler folder.`
  );
}

async function listAllFiles(storage) {
  const all = [];
  let offset = 0;
  const limit = 1000;

  while (true) {
    const { data, error } = await storage.list('', { limit, offset });
    if (error) throw error;
    if (!data || data.length === 0) break;
    all.push(...data);
    if (data.length < limit) break;
    offset += limit;
  }

  return all;
}

async function main() {
  loadEnvFileIfPresent();
  const supabaseUrl = requireEnv('SUPABASE_URL');
  const serviceRoleKey = requireEnv('SUPABASE_SERVICE_ROLE_KEY');
  const supabase = createClient(supabaseUrl, serviceRoleKey);

  const storage = supabase.storage.from(BUCKET);
  const pdftoppmExe = findPdftoppmExe();

  console.log(`Bucket: ${BUCKET}`);
  console.log(`pdftoppm: ${pdftoppmExe}`);

  const files = await listAllFiles(storage);
  const fileNames = new Set(files.map((f) => f.name));

  const pdfs = files.filter((f) => f.name.toLowerCase().endsWith('.pdf'));
  console.log(`Found PDFs: ${pdfs.length}`);

  let generated = 0;
  let skipped = 0;
  let failed = 0;

  for (const pdf of pdfs) {
    const pdfName = pdf.name;
    const pngName = pdfName.replace(/\.pdf$/i, '.png');

    if (fileNames.has(pngName)) {
      skipped++;
      continue;
    }

    try {
      console.log(`\n[PDF] ${pdfName}`);

      const { data: downloadData, error: downloadError } = await storage.download(pdfName);
      if (downloadError) throw downloadError;

      const arr = await downloadData.arrayBuffer();
      const pdfBuffer = Buffer.from(arr);

      const tmpDir = await fsp.mkdtemp(path.join(os.tmpdir(), 'plan-preview-'));
      const tmpPdf = path.join(tmpDir, 'input.pdf');
      const outPrefix = path.join(tmpDir, 'output');
      const outPng = `${outPrefix}.png`;

      await fsp.writeFile(tmpPdf, pdfBuffer);

      const args = [
        '-png',
        '-f',
        '1',
        '-singlefile',
        '-scale-to-x',
        '2400',
        '-scale-to-y',
        '-1',
        tmpPdf,
        outPrefix,
      ];

      const result = spawnSync(pdftoppmExe, args, { encoding: 'utf8' });
      if (result.error) throw result.error;
      if (result.status !== 0) {
        throw new Error(`pdftoppm failed: ${result.stderr || result.stdout || 'unknown error'}`);
      }

      const pngBuffer = await fsp.readFile(outPng);

      const { error: uploadError } = await storage.upload(pngName, pngBuffer, {
        contentType: 'image/png',
        upsert: true,
      });
      if (uploadError) throw uploadError;

      console.log(`[OK] Uploaded preview: ${pngName}`);
      generated++;

      try {
        await fsp.rm(tmpDir, { recursive: true, force: true });
      } catch {
        // ignore
      }
    } catch (e) {
      failed++;
      console.error(`[FAIL] ${pdfName}:`, e && e.message ? e.message : e);
    }
  }

  console.log(`\nDone.`);
  console.log(`Generated: ${generated}`);
  console.log(`Skipped (already had PNG): ${skipped}`);
  console.log(`Failed: ${failed}`);

  if (failed > 0) {
    process.exitCode = 1;
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
