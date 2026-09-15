import { CanFrame } from '../types/can';
import { formatIdHex } from './formatters';

export interface ParseTraceResult {
  frames: CanFrame[];
  format: 'vector_asc' | 'candump' | 'csv' | 'json' | 'unknown';
  errorsCount: number;
  totalLines: number;
}

/**
 * Parses raw text from a trace file into structured CanFrame array.
 * Supports Vector .asc, SocketCAN candump, CSV, and JSON.
 */
export function parseTraceFile(content: string, filename = ''): ParseTraceResult {
  const trimmed = content.trim();

  // Try JSON first
  if (trimmed.startsWith('{') || trimmed.startsWith('[')) {
    try {
      const parsed = JSON.parse(trimmed);
      const rawFrames = Array.isArray(parsed) ? parsed : parsed.frames || [];
      if (Array.isArray(rawFrames) && rawFrames.length > 0) {
        const frames: CanFrame[] = rawFrames.map((f: any, idx: number) => {
          const id = Number(f.id ?? parseInt(f.idHex || '0', 16));
          const extended = Boolean(f.extended || id > 0x7ff);
          const fd = Boolean(f.fd);
          const data = Array.isArray(f.data)
            ? f.data.map((b: any) => Number(b) & 0xff)
            : typeof f.data === 'string'
            ? f.data.split(/[\s,]+/).map((h: string) => parseInt(h, 16) & 0xff).filter((n: number) => !isNaN(n))
            : [];

          return {
            id,
            idHex: f.idHex || formatIdHex(id, extended),
            extended,
            fd,
            brs: Boolean(f.brs),
            dlc: Number(f.dlc ?? data.length),
            data,
            timestamp: Number(f.timestamp ?? Date.now() / 1000 + idx * 0.01),
            direction: (f.direction === 'TX' ? 'TX' : 'RX') as 'RX' | 'TX',
          };
        });

        return {
          frames,
          format: 'json',
          errorsCount: 0,
          totalLines: rawFrames.length,
        };
      }
    } catch {
      // not JSON, fallback to line-based parsing
    }
  }

  const lines = trimmed.split(/\r?\n/);
  const frames: CanFrame[] = [];
  let detectedFormat: 'vector_asc' | 'candump' | 'csv' | 'unknown' = 'unknown';
  let errorsCount = 0;

  // Check headers for CSV or Vector ASC
  const isAscHeader = lines.some((l) => l.includes('date ') || l.includes('base hex') || l.includes('timestamps '));
  const isCsvHeader = lines[0] && (lines[0].toLowerCase().includes('timestamp') || lines[0].toLowerCase().includes('time') || lines[0].includes(','));

  if (isAscHeader || filename.endsWith('.asc')) {
    detectedFormat = 'vector_asc';
  } else if (isCsvHeader || filename.endsWith('.csv') || filename.endsWith('.tsv')) {
    detectedFormat = 'csv';
  } else if (lines.some((l) => l.includes('#') || l.match(/\(\d+\.\d+\)\s+\w+/))) {
    detectedFormat = 'candump';
  }

  for (let lineIdx = 0; lineIdx < lines.length; lineIdx++) {
    const rawLine = lines[lineIdx].trim();
    if (!rawLine || rawLine.startsWith('//') || rawLine.startsWith(';') || rawLine.startsWith('#')) {
      continue;
    }

    // Skip ASC headers
    if (
      rawLine.startsWith('date') ||
      rawLine.startsWith('base') ||
      rawLine.startsWith('internal') ||
      rawLine.startsWith('version')
    ) {
      continue;
    }

    // Skip CSV header line
    if (lineIdx === 0 && (rawLine.toLowerCase().includes('time') || rawLine.toLowerCase().includes('id'))) {
      continue;
    }

    let parsedFrame: CanFrame | null = null;

    // 1. Try Vector ASC Parser
    // Common standard format: "0.001200 1 123 Rx d 8 11 22 33 44 55 66 77 88"
    // Or CAN-FD format: "0.003400 CANFD 1 Rx 320 1 0 8 00 11 22 33 44 55 66 77"
    if (detectedFormat === 'vector_asc' || rawLine.includes(' Rx ') || rawLine.includes(' Tx ')) {
      parsedFrame = parseVectorAscLine(rawLine);
      if (parsedFrame) detectedFormat = 'vector_asc';
    }

    // 2. Try candump Parser
    // SocketCAN format: "(1684142430.123456) can0 123#11223344" or "(1684142430.123456) can0 123##1112233"
    // Or candump stdout: "can0 123 [8] 11 22 33 44 55 66 77 88"
    if (!parsedFrame && (detectedFormat === 'candump' || rawLine.includes('#') || rawLine.includes('['))) {
      parsedFrame = parseCandumpLine(rawLine);
      if (parsedFrame) detectedFormat = 'candump';
    }

    // 3. Try CSV Parser
    if (!parsedFrame && (detectedFormat === 'csv' || rawLine.includes(',') || rawLine.includes(';'))) {
      parsedFrame = parseCsvLine(rawLine);
      if (parsedFrame) detectedFormat = 'csv';
    }

    if (parsedFrame) {
      frames.push(parsedFrame);
    } else {
      errorsCount++;
    }
  }

  // Sort chronologically by timestamp
  frames.sort((a, b) => a.timestamp - b.timestamp);

  return {
    frames,
    format: detectedFormat,
    errorsCount,
    totalLines: lines.length,
  };
}

/**
 * Parses a single line from Vector .asc file
 */
function parseVectorAscLine(line: string): CanFrame | null {
  try {
    const tokens = line.trim().split(/\s+/);
    if (tokens.length < 5) return null;

    let tokenIdx = 0;
    const timestamp = parseFloat(tokens[tokenIdx++]);
    if (isNaN(timestamp)) return null;

    let isFd = false;
    let brs = false;
    if (tokens[tokenIdx].toUpperCase() === 'CANFD') {
      isFd = true;
      tokenIdx++;
    }

    // channel number (e.g. 1)
    const channel = tokens[tokenIdx++];

    // direction or CAN ID
    let direction: 'RX' | 'TX' = 'RX';
    let idStr = '';
    
    // Check if next is direction or ID
    if (tokens[tokenIdx].toUpperCase() === 'RX' || tokens[tokenIdx].toUpperCase() === 'TX') {
      direction = tokens[tokenIdx++].toUpperCase() as 'RX' | 'TX';
      idStr = tokens[tokenIdx++];
    } else {
      idStr = tokens[tokenIdx++];
      if (tokens[tokenIdx] && (tokens[tokenIdx].toUpperCase() === 'RX' || tokens[tokenIdx].toUpperCase() === 'TX')) {
        direction = tokens[tokenIdx++].toUpperCase() as 'RX' | 'TX';
      }
    }

    // Extended flag in ASC often indicated by 'x' suffix on ID (e.g. 18DAF110x)
    const extended = idStr.toLowerCase().endsWith('x');
    const cleanIdStr = idStr.replace(/x$/i, '');
    const id = parseInt(cleanIdStr, 16);
    if (isNaN(id)) return null;

    // Skip 'd' flag or frame format flags if present
    if (tokens[tokenIdx] && tokens[tokenIdx].toLowerCase() === 'd') {
      tokenIdx++;
    }

    // For CANFD: flags like BRS
    if (isFd && tokens[tokenIdx] && tokens[tokenIdx] === '1') {
      brs = true;
      tokenIdx++;
    }

    // DLC
    const dlc = parseInt(tokens[tokenIdx++], 10) || 0;

    // Remaining tokens are data bytes
    const dataBytes: number[] = [];
    while (tokenIdx < tokens.length) {
      const tok = tokens[tokenIdx++];
      // Check if we hit metadata trailer like "Length = 8"
      if (tok.includes('=') || tok.toLowerCase() === 'length' || tok.toLowerCase() === 'bitcount') {
        break;
      }
      const b = parseInt(tok, 16);
      if (!isNaN(b) && tok.length <= 2) {
        dataBytes.push(b & 0xff);
      }
    }

    return {
      id,
      idHex: formatIdHex(id, extended || id > 0x7ff),
      extended: extended || id > 0x7ff,
      fd: isFd,
      brs,
      dlc: dlc || dataBytes.length,
      data: dataBytes,
      timestamp,
      direction,
    };
  } catch {
    return null;
  }
}

/**
 * Parses a single line from SocketCAN candump
 */
function parseCandumpLine(line: string): CanFrame | null {
  try {
    // Format 1: (1684142430.123456) can0 123#11223344 or 123##1112233
    const matchCompact = line.match(/\(?([\d.]+)\)?\s+(\w+)\s+([0-9A-Fa-f]+)(#{1,2})([0-9A-Fa-f]*)/);
    if (matchCompact) {
      const timestamp = parseFloat(matchCompact[1]);
      const idStr = matchCompact[3];
      const separator = matchCompact[4];
      const dataStr = matchCompact[5] || '';

      const id = parseInt(idStr, 16);
      const isFd = separator === '##';
      const extended = idStr.length > 3 || id > 0x7ff;

      const data: number[] = [];
      for (let i = 0; i < dataStr.length; i += 2) {
        const byte = parseInt(dataStr.substring(i, i + 2), 16);
        if (!isNaN(byte)) {
          data.push(byte & 0xff);
        }
      }

      return {
        id,
        idHex: formatIdHex(id, extended),
        extended,
        fd: isFd,
        brs: isFd,
        dlc: data.length,
        data,
        timestamp,
        direction: 'RX',
      };
    }

    // Format 2: can0 123 [8] 11 22 33 44 55 66 77 88
    const matchVerbose = line.match(/(\w+)\s+([0-9A-Fa-f]+)\s+\[(\d+)\]\s+([0-9A-Fa-f\s]+)/);
    if (matchVerbose) {
      const idStr = matchVerbose[2];
      const dlc = parseInt(matchVerbose[3], 10);
      const dataTokens = matchVerbose[4].trim().split(/\s+/);

      const id = parseInt(idStr, 16);
      const extended = idStr.length > 3 || id > 0x7ff;
      const data = dataTokens.map((t) => parseInt(t, 16) & 0xff).filter((n) => !isNaN(n));

      return {
        id,
        idHex: formatIdHex(id, extended),
        extended,
        fd: data.length > 8,
        brs: false,
        dlc,
        data,
        timestamp: Date.now() / 1000,
        direction: 'RX',
      };
    }

    return null;
  } catch {
    return null;
  }
}

/**
 * Parses a CSV line: timestamp,direction,id,type,dlc,data
 */
function parseCsvLine(line: string): CanFrame | null {
  try {
    const parts = line.includes(';') ? line.split(';') : line.split(',');
    if (parts.length < 3) return null;

    // Attempt to map columns
    const cleanParts = parts.map((p) => p.trim().replace(/^["']|["']$/g, ''));
    const timestamp = parseFloat(cleanParts[0]) || Date.now() / 1000;

    let direction: 'RX' | 'TX' = 'RX';
    let idIdx = 1;
    let dlcIdx = 2;
    let dataIdx = 3;

    if (cleanParts[1] === 'RX' || cleanParts[1] === 'TX') {
      direction = cleanParts[1];
      idIdx = 2;
      dlcIdx = 4;
      dataIdx = 5;
    }

    const idStr = cleanParts[idIdx];
    const id = idStr.startsWith('0x') || idStr.startsWith('0X') ? parseInt(idStr, 16) : parseInt(idStr, 16) || parseInt(idStr, 10);
    if (isNaN(id)) return null;

    const dataPart = cleanParts[dataIdx] || cleanParts[cleanParts.length - 1];
    let data: number[] = [];

    if (dataPart) {
      // Could be space-separated or no-spaces hex
      if (dataPart.includes(' ')) {
        data = dataPart.split(/\s+/).map((h) => parseInt(h, 16) & 0xff).filter((n) => !isNaN(n));
      } else if (dataPart.length % 2 === 0) {
        for (let i = 0; i < dataPart.length; i += 2) {
          const b = parseInt(dataPart.substr(i, 2), 16);
          if (!isNaN(b)) data.push(b & 0xff);
        }
      }
    }

    const extended = id > 0x7ff || (cleanParts[3] && cleanParts[3].toUpperCase().includes('EXT'));
    const fd = data.length > 8 || (cleanParts[3] && cleanParts[3].toUpperCase().includes('FD'));

    return {
      id,
      idHex: formatIdHex(id, extended),
      extended,
      fd,
      brs: fd,
      dlc: data.length,
      data,
      timestamp,
      direction,
    };
  } catch {
    return null;
  }
}
