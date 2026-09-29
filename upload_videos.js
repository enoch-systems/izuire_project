/**
 * Uploads every video in the configured VIDEO_DIR folder to Cloudinary.
 *
 * Usage:
 *   npm run upload:videos
 *
 * Credentials are read from the environment, or from a git-ignored `.env`
 * file next to this script (see `.env.example`):
 *   CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, CLOUDINARY_API_SECRET  (required)
 *   CLOUDINARY_FOLDER, VIDEO_DIR                                       (optional)
 */
const fs = require('fs');
const path = require('path');
const cloudinary = require('cloudinary').v2;

/** Minimal `.env` reader so credentials stay out of source control without
 *  adding a dotenv dependency. Variables already present in the real
 *  environment take precedence over the file. */
function loadEnvFile(envPath) {
  if (!fs.existsSync(envPath)) {
    return;
  }
  for (const line of fs.readFileSync(envPath, 'utf8').split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) {
      continue;
    }
    const separator = trimmed.indexOf('=');
    if (separator === -1) {
      continue;
    }
    const key = trimmed.slice(0, separator).trim();
    let value = trimmed.slice(separator + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    if (key && !(key in process.env)) {
      process.env[key] = value;
    }
  }
}

loadEnvFile(path.join(__dirname, '.env'));

const cloudName = process.env.CLOUDINARY_CLOUD_NAME;
const apiKey = process.env.CLOUDINARY_API_KEY;
const apiSecret = process.env.CLOUDINARY_API_SECRET;
const folder = process.env.CLOUDINARY_FOLDER || 'ders-videos';
const dir = process.env.VIDEO_DIR || 'C:/Users/HP/Downloads/ders';

const VIDEO_EXTENSIONS = /\.(mp4|m4v|mov|webm|mkv|avi|3gp)$/i;
const MAX_SIMPLE_UPLOAD_BYTES = 100 * 1024 * 1024;

const missing = [
  ['CLOUDINARY_CLOUD_NAME', cloudName],
  ['CLOUDINARY_API_KEY', apiKey],
  ['CLOUDINARY_API_SECRET', apiSecret],
]
  .filter(([, value]) => !value)
  .map(([key]) => key);

if (missing.length) {
  console.error(
    `Missing required Cloudinary environment variable(s): ${missing.join(', ')}\n` +
      'Copy .env.example to .env and fill in your credentials, or export them ' +
      'in your shell before running `npm run upload:videos`.',
  );
  process.exit(1);
}

cloudinary.config({
  cloud_name: cloudName,
  api_key: apiKey,
  api_secret: apiSecret,
  secure: true,
});

/** Cloudinary sniffs the container from the file's `ftyp` box. A missing or
 *  bogus box is the usual cause of an "Invalid file format" upload error. */
function hasMp4Signature(filePath) {
  const header = Buffer.alloc(12);
  const fd = fs.openSync(filePath, 'r');
  try {
    fs.readSync(fd, header, 0, header.length, 0);
  } finally {
    fs.closeSync(fd);
  }
  return header.subarray(4, 8).toString('ascii') === 'ftyp';
}

/** Cloudinary refuses to auto-sniff the container for video uploads in this
 *  environment ("Image file format mp4 not allowed"), so the format is declared
 *  explicitly on every upload. m4v assets are stored as mp4. */
const FORMAT_ALIASES = { m4v: 'mp4' };

function detectFormat(fileName) {
  const extension = path.extname(fileName).slice(1).toLowerCase();
  return FORMAT_ALIASES[extension] || extension;
}

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

function uploadOnce(fullPath, options) {
  const bytes = fs.statSync(fullPath).size;
  return bytes > MAX_SIMPLE_UPLOAD_BYTES
    ? cloudinary.uploader.upload_large(fullPath, { ...options, chunk_size: 6 * 1024 * 1024 })
    : cloudinary.uploader.upload(fullPath, options);
}

async function uploadWithRetry(fullPath, options, attempts = 3) {
  let lastError;
  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    try {
      return await uploadOnce(fullPath, options);
    } catch (err) {
      lastError = err;
      console.warn(`  attempt ${attempt}/${attempts} failed: ${err.message || err}`);
      if (attempt < attempts) {
        await sleep(1500 * attempt);
      }
    }
  }
  throw lastError;
}

(async () => {
  try {
    if (!fs.existsSync(dir)) {
      throw new Error(`Video folder not found: ${dir}`);
    }

    const files = fs
      .readdirSync(dir)
      .filter((name) => VIDEO_EXTENSIONS.test(name))
      .sort();

    if (!files.length) {
      throw new Error(`No video files found in ${dir}`);
    }

    console.log(`Cloudinary cloud : ${cloudName}`);
    console.log(`Target folder    : ${folder}`);
    console.log(`Found ${files.length} video file(s):\n`);

    const uploaded = [];

    for (const file of files) {
      const fullPath = path.join(dir, file);
      const bytes = fs.statSync(fullPath).size;
      const sizeMb = (bytes / (1024 * 1024)).toFixed(2);

      console.log(`Uploading ${file} (${sizeMb} MB) as ${detectFormat(file)}...`);
      if (/\.(mp4|m4v)$/i.test(file) && !hasMp4Signature(fullPath)) {
        console.warn('  warning: no MP4 `ftyp` box found - the container may be mislabelled.');
      }

      const result = await uploadWithRetry(fullPath, {
        resource_type: 'video',
        format: detectFormat(file),
        folder,
        // Store each file under its own name and overwrite on re-upload, so a
        // re-run refreshes the clip the site already points at instead of
        // publishing a second copy with a random public ID.
        use_filename: true,
        unique_filename: false,
        overwrite: true,
        invalidate: true,
      });

      uploaded.push({
        file,
        url: result.secure_url,
        format: result.format,
        bytes: result.bytes,
      });
      console.log(`  ok -> ${result.secure_url} (${result.format})`);
    }

    console.log('\nUploaded videos:');
    for (const item of uploaded) {
      const uploadedMb = (item.bytes / (1024 * 1024)).toFixed(2);
      console.log(`${item.file} | ${item.format} | ${uploadedMb} MB`);
      console.log(`  ${item.url}`);
    }

    console.log(`\nAll ${uploaded.length} video(s) uploaded successfully.`);
  } catch (err) {
    console.error('Upload failed:');
    console.error(err.message || err);
    process.exit(1);
  }
})();
