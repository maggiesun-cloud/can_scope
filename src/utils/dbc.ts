import { DbcDatabase, DbcMessage, DbcSignal } from '../types/can';

/**
 * Standard DBC Parser
 * Parses Vector DBC or JSON format definitions automatically
 */
export function parseDbc(content: string, filename = 'custom.dbc'): DbcDatabase {
  const trimmed = content.trim();
  if (trimmed.startsWith('{') || trimmed.startsWith('[') || filename.toLowerCase().endsWith('.json')) {
    return parseJsonDbc(content, filename);
  }

  const lines = content.split(/\r?\n/);
  const messages: DbcMessage[] = [];
  let currentMessage: DbcMessage | null = null;

  for (const line of lines) {
    const lineTrimmed = line.trim();
    if (!lineTrimmed || lineTrimmed.startsWith('//')) continue;

    // Match Message: BO_ <id> <name>: <dlc> <transmitter>
    const boMatch = lineTrimmed.match(/^BO_\s+(\d+)\s+([a-zA-Z0-9_]+)\s*:\s*(\d+)\s+([a-zA-Z0-9_]+)/);
    if (boMatch) {
      const rawId = parseInt(boMatch[1], 10);
      // Extended IDs have bit 31 set in DBC (0x80000000)
      const cleanId = rawId & 0x1fffffff;
      currentMessage = {
        id: cleanId,
        idHex: `0x${cleanId.toString(16).toUpperCase()}`,
        name: boMatch[2],
        dlc: parseInt(boMatch[3], 10),
        transmitter: boMatch[4],
        signals: [],
      };
      messages.push(currentMessage);
      continue;
    }

    // Match Signal: SG_ <name> : <start>|<length>@<endian><sign> (<factor>,<offset>) [<min>|<max>] "<unit>" <receivers>
    const sgMatch = lineTrimmed.match(
      /^SG_\s+([a-zA-Z0-9_]+)\s*(?:M\s*|\s*):\s*(\d+)\|(\d+)@([01])([+-])\s*\(([^,]+),([^)]+)\)\s*\[([^|]+)\|([^\]]+)\]\s*"([^"]*)"\s*(.*)/
    );

    if (sgMatch && currentMessage) {
      const signal: DbcSignal = {
        name: sgMatch[1],
        startBit: parseInt(sgMatch[2], 10),
        length: parseInt(sgMatch[3], 10),
        byteOrder: sgMatch[4] === '1' ? 'little_endian' : 'big_endian', // 1=Intel/little-endian, 0=Motorola/big-endian
        isSigned: sgMatch[5] === '-',
        scale: parseFloat(sgMatch[6]),
        offset: parseFloat(sgMatch[7]),
        min: parseFloat(sgMatch[8]),
        max: parseFloat(sgMatch[9]),
        unit: sgMatch[10],
        receivers: sgMatch[11] ? sgMatch[11].trim().split(/\s*,\s*/) : [],
      };
      currentMessage.signals.push(signal);
    }
  }

  return {
    filename,
    messages,
  };
}

/**
 * Parses user-friendly JSON format DBC definitions
 */
export function parseJsonDbc(content: string, filename = 'custom.json'): DbcDatabase {
  let parsedJson: any;
  try {
    parsedJson = JSON.parse(content);
  } catch (err: any) {
    throw new Error(`Invalid JSON DBC format: ${err.message}`);
  }

  const messages: DbcMessage[] = [];

  // Determine list of raw message objects
  let rawList: any[] = [];
  if (Array.isArray(parsedJson)) {
    rawList = parsedJson;
  } else if (parsedJson && Array.isArray(parsedJson.messages)) {
    rawList = parsedJson.messages;
  } else if (typeof parsedJson === 'object' && parsedJson !== null) {
    // Might be keyed by ID: { "0x123": { ... }, "291": { ... } }
    for (const [key, val] of Object.entries(parsedJson)) {
      if (typeof val === 'object' && val !== null && !['name', 'version', 'filename'].includes(key)) {
        rawList.push({ id: key, ...(val as any) });
      }
    }
  }

  for (const item of rawList) {
    if (!item) continue;
    let cleanId = 0;
    if (typeof item.id === 'string') {
      const trimmed = item.id.trim();
      cleanId = trimmed.startsWith('0x') || trimmed.startsWith('0X') ? parseInt(trimmed, 16) : parseInt(trimmed, 10);
    } else if (typeof item.id === 'number') {
      cleanId = item.id;
    } else if (typeof item.canId === 'string' || typeof item.canId === 'number') {
      const idVal = item.canId;
      cleanId = typeof idVal === 'string' && idVal.startsWith('0x') ? parseInt(idVal, 16) : Number(idVal);
    }

    if (isNaN(cleanId)) continue;

    const signals: DbcSignal[] = [];
    if (Array.isArray(item.signals)) {
      for (const s of item.signals) {
        if (!s || !s.name) continue;
        const rawByteOrder = String(s.byteOrder || s.endian || 'little_endian').toLowerCase();
        const byteOrder = rawByteOrder.includes('big') || rawByteOrder.includes('motorola') || rawByteOrder === '0'
          ? 'big_endian'
          : 'little_endian';

        signals.push({
          name: String(s.name).trim(),
          startBit: Number(s.startBit ?? s.start_bit ?? 0),
          length: Number(s.length ?? s.bitLength ?? 8),
          byteOrder,
          isSigned: Boolean(s.isSigned ?? s.signed ?? false),
          scale: Number(s.scale ?? s.factor ?? 1.0),
          offset: Number(s.offset ?? 0.0),
          min: Number(s.min ?? 0),
          max: Number(s.max ?? 100),
          unit: String(s.unit ?? ''),
          receivers: Array.isArray(s.receivers) ? s.receivers.map(String) : [],
          comment: s.comment ? String(s.comment) : undefined,
        });
      }
    }

    messages.push({
      id: cleanId,
      idHex: `0x${cleanId.toString(16).toUpperCase()}`,
      name: String(item.name || `Message_${cleanId.toString(16).toUpperCase()}`).trim(),
      dlc: Number(item.dlc || 8),
      transmitter: String(item.transmitter || 'ECU'),
      comment: item.comment ? String(item.comment) : undefined,
      signals,
    });
  }

  return {
    filename,
    version: parsedJson?.version || '1.0',
    messages,
  };
}

/**
 * Converts any loaded DBC to formatted JSON string
 */
export function exportDbcAsJson(database: DbcDatabase): string {
  const exportObject = {
    name: database.filename.replace(/\.[^/.]+$/, ''),
    version: database.version || '1.0',
    messages: database.messages.map((m) => ({
      id: m.idHex,
      name: m.name,
      dlc: m.dlc,
      transmitter: m.transmitter,
      comment: m.comment,
      signals: m.signals.map((s) => ({
        name: s.name,
        startBit: s.startBit,
        length: s.length,
        byteOrder: s.byteOrder,
        isSigned: s.isSigned,
        scale: s.scale,
        offset: s.offset,
        min: s.min,
        max: s.max,
        unit: s.unit,
        comment: s.comment,
      })),
    })),
  };
  return JSON.stringify(exportObject, null, 2);
}

/**
 * Converts database to Vector .dbc format string
 */
export function exportDbcAsVectorDbc(database: DbcDatabase): string {
  const transmitters = Array.from(new Set(database.messages.map((m) => m.transmitter || 'ECU'))).join(' ') || 'ECU';
  let out = `VERSION ""\n\nNS_ :\n\nBS_:\n\nBU_: ${transmitters}\n\n`;

  for (const m of database.messages) {
    const idVal = m.id > 0x7ff ? (m.id | 0x80000000) >>> 0 : m.id;
    out += `BO_ ${idVal} ${m.name}: ${m.dlc} ${m.transmitter || 'ECU'}\n`;
    for (const s of m.signals) {
      const endian = s.byteOrder === 'little_endian' ? '1' : '0';
      const sign = s.isSigned ? '-' : '+';
      const receivers = s.receivers && s.receivers.length > 0 ? s.receivers.join(',') : 'Vector__XXX';
      out += ` SG_ ${s.name} : ${s.startBit}|${s.length}@${endian}${sign} (${s.scale},${s.offset}) [${s.min}|${s.max}] "${s.unit || ''}" ${receivers}\n`;
    }
    out += '\n';
  }
  return out;
}

/**
 * Extracts a signal value from raw CAN data bytes
 */
export function decodeSignal(data: number[], signal: DbcSignal): number {
  if (!data || data.length === 0) return 0;

  const totalBits = data.length * 8;
  if (signal.startBit >= totalBits) return 0;

  let rawValue = 0;

  if (signal.byteOrder === 'little_endian') {
    // Intel: startBit is LSB
    for (let i = 0; i < signal.length; i++) {
      const bitPos = signal.startBit + i;
      const byteIdx = Math.floor(bitPos / 8);
      const bitIdx = bitPos % 8;
      if (byteIdx < data.length) {
        const bit = (data[byteIdx] >> bitIdx) & 1;
        rawValue |= bit << i;
      }
    }
  } else {
    // Motorola: startBit is MSB
    let bitPos = signal.startBit;
    for (let i = 0; i < signal.length; i++) {
      const byteIdx = Math.floor(bitPos / 8);
      const bitIdx = bitPos % 8;
      if (byteIdx < data.length) {
        const bit = (data[byteIdx] >> bitIdx) & 1;
        rawValue = (rawValue << 1) | bit;
      }
      // Decrement bit position for Motorola sequential traversal
      if (bitIdx === 0) {
        bitPos += 15; // Move to MSB of next byte
      } else {
        bitPos -= 1;
      }
    }
  }

  // Handle signed integers (Two's complement)
  if (signal.isSigned && signal.length > 1) {
    const signBit = 1 << (signal.length - 1);
    if ((rawValue & signBit) !== 0) {
      rawValue = rawValue - (1 << signal.length);
    }
  }

  // Apply scaling and offset
  const scaled = rawValue * signal.scale + signal.offset;
  return Math.round(scaled * 100) / 100;
}

/**
 * Decodes all matching signals for a given CAN Frame
 */
export function decodeFrameWithDbc(
  canId: number,
  data: number[],
  database: DbcDatabase | null
): Record<string, string | number> | undefined {
  if (!database || !database.messages) return undefined;

  const msg = database.messages.find((m) => m.id === canId);
  if (!msg || !msg.signals || msg.signals.length === 0) return undefined;

  const result: Record<string, string | number> = {};
  for (const sig of msg.signals) {
    const val = decodeSignal(data, sig);
    result[sig.name] = sig.unit ? `${val} ${sig.unit}` : val;
  }
  return result;
}

/**
 * Preloaded Automotive Vehicle DBC for simulation & immediate out-of-the-box analysis
 */
export const SAMPLE_VEHICLE_DBC = `VERSION ""

NS_ :

BS_:

BU_: POWERTRAIN BRAKE_CONTROLLER INSTRUMENT_CLUSTER BODY_CONTROL BMS

BO_ 256 Engine_Status: 8 POWERTRAIN
 SG_ RollingCounter : 0|4@1+ (1,0) [0|15] "" INSTRUMENT_CLUSTER
 SG_ EngineRPM : 16|16@1+ (0.25,0) [0|8000] "rpm" INSTRUMENT_CLUSTER
 SG_ EngineTorque : 32|8@1- (1,0) [-50|200] "Nm" INSTRUMENT_CLUSTER
 SG_ EngineCoolantTemp : 40|8@1+ (1,-40) [-40|150] "°C" INSTRUMENT_CLUSTER
 SG_ CheckEngineLight : 48|1@1+ (1,0) [0|1] "" INSTRUMENT_CLUSTER

BO_ 291 Vehicle_Dynamics: 8 BRAKE_CONTROLLER
 SG_ VehicleSpeed : 0|16@1+ (0.01,0) [0|250] "km/h" INSTRUMENT_CLUSTER
 SG_ ThrottlePosition : 16|8@1+ (0.4,0) [0|100] "%" POWERTRAIN
 SG_ BrakePressure : 24|8@1+ (0.5,0) [0|100] "bar" POWERTRAIN
 SG_ SteeringAngle : 32|16@1- (0.1,0) [-540|540] "deg" INSTRUMENT_CLUSTER

BO_ 512 EV_Battery_System: 8 BMS
 SG_ PackVoltage : 0|16@1+ (0.1,0) [200|450] "V" INSTRUMENT_CLUSTER
 SG_ PackCurrent : 16|16@1- (0.1,0) [-300|300] "A" INSTRUMENT_CLUSTER
 SG_ StateOfCharge : 32|8@1+ (0.5,0) [0|100] "%" INSTRUMENT_CLUSTER
 SG_ CellMaxTemp : 40|8@1+ (1,-40) [-40|100] "°C" INSTRUMENT_CLUSTER
 SG_ CellMinTemp : 48|8@1+ (1,-40) [-40|100] "°C" INSTRUMENT_CLUSTER

BO_ 1110 ADAS_Radar_Track: 8 INSTRUMENT_CLUSTER
 SG_ TargetDistance : 0|16@1+ (0.05,0) [0|200] "m" INSTRUMENT_CLUSTER
 SG_ RelativeVelocity : 16|12@1- (0.1,0) [-50|50] "m/s" INSTRUMENT_CLUSTER
 SG_ LaneDepartureWarning : 28|1@1+ (1,0) [0|1] "" INSTRUMENT_CLUSTER
 SG_ EmergencyBraking : 29|1@1+ (1,0) [0|1] "" INSTRUMENT_CLUSTER

BO_ 1280 Body_Electronics: 8 BODY_CONTROL
 SG_ AmbientTemperature : 0|8@1+ (0.5,-40) [-40|80] "°C" INSTRUMENT_CLUSTER
 SG_ HeadlightsActive : 8|1@1+ (1,0) [0|1] "" INSTRUMENT_CLUSTER
 SG_ DriverDoorOpen : 9|1@1+ (1,0) [0|1] "" INSTRUMENT_CLUSTER
 SG_ HazardLights : 10|1@1+ (1,0) [0|1] "" INSTRUMENT_CLUSTER
`;

/**
 * Preloaded JSON Format DBC sample for quick editing, testing and export
 */
export const SAMPLE_JSON_DBC = JSON.stringify(
  {
    name: 'Custom CAN Vehicle & BMS Database',
    version: '1.0',
    messages: [
      {
        id: '0x100',
        name: 'Engine_Status',
        dlc: 8,
        transmitter: 'POWERTRAIN',
        comment: 'Powertrain core status and RPM telemetry',
        signals: [
          {
            name: 'RollingCounter',
            startBit: 0,
            length: 4,
            byteOrder: 'little_endian',
            isSigned: false,
            scale: 1,
            offset: 0,
            unit: '',
            min: 0,
            max: 15,
          },
          {
            name: 'EngineRPM',
            startBit: 16,
            length: 16,
            byteOrder: 'little_endian',
            isSigned: false,
            scale: 0.25,
            offset: 0,
            unit: 'rpm',
            min: 0,
            max: 8000,
          },
          {
            name: 'EngineTorque',
            startBit: 32,
            length: 8,
            byteOrder: 'little_endian',
            isSigned: true,
            scale: 1,
            offset: 0,
            unit: 'Nm',
            min: -50,
            max: 200,
          },
          {
            name: 'EngineCoolantTemp',
            startBit: 40,
            length: 8,
            byteOrder: 'little_endian',
            isSigned: false,
            scale: 1,
            offset: -40,
            unit: '°C',
            min: -40,
            max: 150,
          },
          {
            name: 'CheckEngineLight',
            startBit: 48,
            length: 1,
            byteOrder: 'little_endian',
            isSigned: false,
            scale: 1,
            offset: 0,
            unit: '',
            min: 0,
            max: 1,
          },
        ],
      },
      {
        id: '0x123',
        name: 'Vehicle_Dynamics',
        dlc: 8,
        transmitter: 'BRAKE_CONTROLLER',
        comment: 'Chassis dynamics and driver pedals',
        signals: [
          {
            name: 'VehicleSpeed',
            startBit: 0,
            length: 16,
            byteOrder: 'little_endian',
            isSigned: false,
            scale: 0.01,
            offset: 0,
            unit: 'km/h',
            min: 0,
            max: 250,
          },
          {
            name: 'ThrottlePosition',
            startBit: 16,
            length: 8,
            byteOrder: 'little_endian',
            isSigned: false,
            scale: 0.4,
            offset: 0,
            unit: '%',
            min: 0,
            max: 100,
          },
          {
            name: 'BrakePressure',
            startBit: 24,
            length: 8,
            byteOrder: 'little_endian',
            isSigned: false,
            scale: 0.5,
            offset: 0,
            unit: 'bar',
            min: 0,
            max: 100,
          },
          {
            name: 'SteeringAngle',
            startBit: 32,
            length: 16,
            byteOrder: 'little_endian',
            isSigned: true,
            scale: 0.1,
            offset: 0,
            unit: 'deg',
            min: -540,
            max: 540,
          },
        ],
      },
      {
        id: '0x200',
        name: 'EV_Battery_System',
        dlc: 8,
        transmitter: 'BMS',
        comment: 'High voltage traction battery pack measurements',
        signals: [
          {
            name: 'PackVoltage',
            startBit: 0,
            length: 16,
            byteOrder: 'little_endian',
            isSigned: false,
            scale: 0.1,
            offset: 0,
            unit: 'V',
            min: 200,
            max: 450,
          },
          {
            name: 'PackCurrent',
            startBit: 16,
            length: 16,
            byteOrder: 'little_endian',
            isSigned: true,
            scale: 0.1,
            offset: 0,
            unit: 'A',
            min: -300,
            max: 300,
          },
          {
            name: 'StateOfCharge',
            startBit: 32,
            length: 8,
            byteOrder: 'little_endian',
            isSigned: false,
            scale: 0.5,
            offset: 0,
            unit: '%',
            min: 0,
            max: 100,
          },
          {
            name: 'CellMaxTemp',
            startBit: 40,
            length: 8,
            byteOrder: 'little_endian',
            isSigned: false,
            scale: 1,
            offset: -40,
            unit: '°C',
            min: -40,
            max: 100,
          },
        ],
      },
    ],
  },
  null,
  2
);
