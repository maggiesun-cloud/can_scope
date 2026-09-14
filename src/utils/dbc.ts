import { DbcDatabase, DbcMessage, DbcSignal } from '../types/can';

/**
 * Standard DBC Parser
 * Parses Vector DBC format definitions
 */
export function parseDbc(content: string, filename = 'custom.dbc'): DbcDatabase {
  const lines = content.split(/\r?\n/);
  const messages: DbcMessage[] = [];
  let currentMessage: DbcMessage | null = null;

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('//')) continue;

    // Match Message: BO_ <id> <name>: <dlc> <transmitter>
    const boMatch = trimmed.match(/^BO_\s+(\d+)\s+([a-zA-Z0-9_]+)\s*:\s*(\d+)\s+([a-zA-Z0-9_]+)/);
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
    const sgMatch = trimmed.match(
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
