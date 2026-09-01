import { getDb } from '../db/connection.js';
import { statSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = typeof globalThis.__dirname !== 'undefined'
  ? globalThis.__dirname
  : dirname(fileURLToPath(import.meta.url));
const AUDIO_DIR = join(__dirname, '..', '..', 'public', 'audio');

const INDONESIAN_WORDS = new Set(['Belas', 'Puluh', 'Ratus', 'Sebelas', 'Sepuluh', 'Seratus']);

function getAudioUrl(name) {
  let relativePath;
  if (/^[A-Z]$/.test(name)) relativePath = `nomor/${name}.mp3`;
  else if (/^\d$/.test(name)) relativePath = `angka/${name}.mp3`;
  else if (INDONESIAN_WORDS.has(name)) relativePath = `angka/${name}.mp3`;
  else relativePath = `${name}.mp3`;

  try {
    const mtime = statSync(join(AUDIO_DIR, relativePath)).mtimeMs;
    return `/audio/${relativePath}?t=${Math.floor(mtime)}`;
  } catch {
    return `/audio/${relativePath}`;
  }
}

function numberToTokens(n) {
  if (n === 0) return [];
  if (n === 10) return ['Sepuluh'];
  if (n === 11) return ['Sebelas'];
  if (n === 100) return ['Seratus'];

  if (n < 10) return [String(n)];

  if (n < 20) {
    return [String(n - 10), 'Belas'];
  }

  if (n < 100) {
    const tens = Math.floor(n / 10);
    const ones = n % 10;
    const result = [String(tens), 'Puluh'];
    if (ones > 0) result.push(String(ones));
    return result;
  }

  const hundreds = Math.floor(n / 100);
  const rest = n % 100;
  const result = hundreds === 1 ? ['Seratus'] : [String(hundreds), 'Ratus'];
  if (rest > 0) result.push(...numberToTokens(rest));
  return result;
}

export function buildAudioSequence(queue) {
  const db = getDb();
  const sequence = ['alert'];

  if (queue.priority === 3) {
    sequence.push('cito');
  } else if (queue.priority > 0) {
    sequence.push(queue.priority === 1 ? 'lansia' : 'hamil');
  }

  sequence.push('nomor');

  const prefix = queue.queue_number[0];
  sequence.push(prefix);

  const numericPart = parseInt(queue.queue_number.slice(1), 10);
  if (!isNaN(numericPart) && numericPart > 0) {
    sequence.push(...numberToTokens(numericPart));
  }

  sequence.push('diloket');

  if (queue.counter_id) {
    const counter = db.prepare('SELECT name FROM counters WHERE id = ?').get(queue.counter_id);
    if (counter) {
      const num = counter.name.match(/\d+/)?.[0] || '1';
      for (const ch of num) {
        sequence.push(ch);
      }
    }
  }

  return sequence;
}

export function getAudioFiles(sequence) {
  return sequence.map(getAudioUrl);
}
