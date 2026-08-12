import { getDb } from '../db/connection.js';
import { statSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const AUDIO_DIR = join(__dirname, '..', '..', 'public', 'audio');

function getAudioUrl(name) {
  let relativePath;
  if (/^[A-Z]$/.test(name)) relativePath = `nomor/${name}.mp3`;
  else if (/^\d$/.test(name)) relativePath = `angka/${name}.mp3`;
  else relativePath = `${name}.mp3`;

  try {
    const mtime = statSync(join(AUDIO_DIR, relativePath)).mtimeMs;
    return `/audio/${relativePath}?t=${Math.floor(mtime)}`;
  } catch {
    return `/audio/${relativePath}`;
  }
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

  for (let i = 1; i < queue.queue_number.length; i++) {
    sequence.push(queue.queue_number[i]);
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
