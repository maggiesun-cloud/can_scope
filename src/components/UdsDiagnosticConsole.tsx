import React, { useState, useEffect, useRef } from 'react';
import { CanFrame } from '../types/can';
import { transmitCanFrame } from '../services/api';
import {
  Shield,
  Key,
  Database,
  FileCode,
  AlertTriangle,
  CheckCircle2,
  Clock,
  Send,
  RefreshCw,
  Terminal,
  Layers,
  Unlock,
  Lock,
  Zap,
  ArrowRight,
  Info,
  Check,
  Radio,
} from 'lucide-react';

interface UdsDiagnosticConsoleProps {
  isConnected: boolean;
  isListenOnly: boolean;
  frames?: CanFrame[];
  addToast: (title: string, message?: string, type?: any) => void;
}

// NRC Definitions (ISO 14229-1 Annex A.1)
const NRC_MAP: Record<number, { name: string; desc: string }> = {
  0x10: { name: 'generalReject', desc: 'The requested action cannot be performed.' },
  0x11: { name: 'serviceNotSupported', desc: 'The diagnostic service requested is not supported by this ECU.' },
  0x12: { name: 'subFunctionNotSupported', desc: 'The sub-function parameter is not recognized or supported.' },
  0x13: { name: 'incorrectMessageLengthOrInvalidFormat', desc: 'Payload length does not match service format requirements.' },
  0x14: { name: 'responseTooLong', desc: 'Response length exceeds buffer capacity.' },
  0x22: { name: 'conditionsNotCorrect', desc: 'Prerequisites (e.g. engine RPM zero, parking brake) not met.' },
  0x24: { name: 'requestSequenceError', desc: 'Service executed out of order (e.g. key sent before seed).' },
  0x31: { name: 'requestOutOfRange', desc: 'The requested Data Identifier (DID) is not defined or address invalid.' },
  0x33: { name: 'securityAccessDenied', desc: 'Security access must be unlocked via 0x27 prior to this action.' },
  0x35: { name: 'invalidKey', desc: 'Calculated key does not match ECU cryptographic secret.' },
  0x36: { name: 'exceededNumberOfAttempts', desc: 'Too many failed security access attempts. ECU is locked.' },
  0x37: { name: 'requiredTimeDelayNotExpired', desc: 'Security unlock timeout penalty active (anti-bruteforce delay).' },
  0x78: { name: 'responsePending', desc: 'Request correctly received; ECU is processing, awaiting P2* response.' },
  0x7e: { name: 'subFunctionNotSupportedInActiveSession', desc: 'Sub-function not allowed in current diagnostic session.' },
  0x7f: { name: 'serviceNotSupportedInActiveSession', desc: 'Service not permitted in current diagnostic session (e.g. write DID in default session).' },
};

// Standard DID Dictionary
const POPULAR_DIDS: Array<{ did: number; hex: string; name: string; desc: string; sampleAscii?: string }> = [
  { did: 0xf190, hex: '0xF190', name: 'VIN (Vehicle Identification Number)', desc: '17-character ISO 3779 VIN string' },
  { did: 0xf187, hex: '0xF187', name: 'Spare Part Number', desc: 'OEM hardware replacement part number' },
  { did: 0xf189, hex: '0xF189', name: 'ECU Software Identifier', desc: 'Primary calibration or application software revision' },
  { did: 0xf197, hex: '0xF197', name: 'System Name / Engine Type', desc: 'ECU powertrain or body controller designation' },
  { did: 0xf180, hex: '0xF180', name: 'Boot Software Identification', desc: 'Flash bootloader firmware version' },
  { did: 0xf19e, hex: '0xF19E', name: 'ASAM ODX File Identifier', desc: 'Diagnostic description file mapping' },
  { did: 0x0100, hex: '0x0100', name: 'Battery Health & State of Charge', desc: 'OEM Proprietary Battery Monitor' },
  { did: 0x0105, hex: '0x0105', name: 'Odometer Calibration Counter', desc: 'Instrument cluster flash write counter' },
];

export const UdsDiagnosticConsole: React.FC<UdsDiagnosticConsoleProps> = ({
  isConnected,
  isListenOnly,
  frames = [],
  addToast,
}) => {
  // Addressing Config
  const [requestCanIdHex, setRequestCanIdHex] = useState('0x7E0');
  const [responseCanIdHex, setResponseCanIdHex] = useState('0x7E8');

  // Sub-tabs
  const [subService, setSubService] = useState<'0x10' | '0x27' | '0x22' | '0x2E' | '0x19'>('0x22');

  // Session state
  const [activeSession, setActiveSession] = useState<{ id: number; name: string }>({
    id: 0x01,
    name: '0x01 - Default Session',
  });
  const [testerPresentActive, setTesterPresentActive] = useState(false);

  // Security Access state
  const [securityLevel, setSecurityLevel] = useState<number>(1);
  const [securityStatus, setSecurityStatus] = useState<'locked' | 'seed_received' | 'unlocked'>('locked');
  const [receivedSeedHex, setReceivedSeedHex] = useState('');
  const [calculatedKeyHex, setCalculatedKeyHex] = useState('');
  const [keyAlgorithm, setKeyAlgorithm] = useState<'xor' | 'plus' | 'manual'>('xor');
  const [secretMaskHex, setSecretMaskHex] = useState('0x5A5A5A5A');

  // 0x22 Read DID
  const [selectedDidHex, setSelectedDidHex] = useState('0xF190');
  const [customDidInput, setCustomDidInput] = useState('');
  const [readDidResult, setReadDidResult] = useState<{
    did: string;
    rawHex: string;
    ascii: string;
    timestamp: number;
    status: 'ok' | 'nrc';
    nrcCode?: number;
  } | null>(null);

  // 0x2E Write DID
  const [writeDidHex, setWriteDidHex] = useState('0x0105');
  const [writeDataPayload, setWriteDataPayload] = useState('00 00 00 01');
  const [writeTextMode, setWriteTextMode] = useState(false);
  const [writeResult, setWriteResult] = useState<{
    status: 'ok' | 'nrc' | 'pending';
    message: string;
    nrcCode?: number;
  } | null>(null);

  // 0x19 DTC Information
  const [dtcSubFunction, setDtcSubFunction] = useState<number>(0x02); // reportDTCByStatusMask
  const [dtcStatusMaskHex, setDtcStatusMaskHex] = useState('0x09'); // Confirmed & Pending
  const [dtcList, setDtcList] = useState<
    Array<{
      code: string;
      statusByte: number;
      confirmed: boolean;
      pending: boolean;
      failed: boolean;
      testFailedSinceClear: boolean;
    }>
  >([]);

  // Transaction Log (UDS Requests & Responses)
  const [transactions, setTransactions] = useState<
    Array<{
      id: string;
      time: number;
      direction: 'TX' | 'RX';
      service: string;
      dataHex: string;
      decoded: string;
      status: 'ok' | 'nrc';
    }>
  >([]);

  const [isSending, setIsSending] = useState(false);

  // Helper to parse CAN IDs
  const reqId = parseInt(requestCanIdHex, 16) || 0x7e0;
  const respId = parseInt(responseCanIdHex, 16) || 0x7e8;

  // Watch incoming frames for responses
  useEffect(() => {
    if (frames.length === 0) return;
    const lastFrame = frames[frames.length - 1];

    if (lastFrame.direction === 'RX' && lastFrame.id === respId) {
      handleParseUdsResponse(lastFrame);
    }
  }, [frames, respId]);

  // Periodic TesterPresent (0x3E 0x00) keep-alive
  useEffect(() => {
    if (!testerPresentActive || !isConnected || isListenOnly) return;

    const interval = setInterval(async () => {
      try {
        await transmitCanFrame({
          id: reqId,
          data: [0x02, 0x3e, 0x00, 0x55, 0x55, 0x55, 0x55, 0x55],
          dlc: 8,
          extended: false,
          fd: false,
        });
      } catch (e) {
        // silent keep-alive
      }
    }, 2000);

    return () => clearInterval(interval);
  }, [testerPresentActive, isConnected, isListenOnly, reqId]);

  // Send UDS Request Helper
  const sendUdsRequest = async (payload: number[], serviceLabel: string, decodedInfo: string) => {
    if (!isConnected) {
      addToast('CAN Bus Disconnected', 'Connect to a virtual or hardware CAN channel first.', 'error');
      return;
    }
    if (isListenOnly) {
      addToast('Listen-Only Mode Active', 'Disable listen-only mode in connection settings to transmit.', 'warning');
      return;
    }

    setIsSending(true);

    // Standard ISO-TP Single Frame header: [length, byte1, byte2, ...] padded to 8 bytes with 0x55 or 0x00
    const len = payload.length;
    const canData = [len, ...payload];
    while (canData.length < 8) {
      canData.push(0x55); // ISO-TP standard padding
    }

    const txHex = canData.map((b) => b.toString(16).toUpperCase().padStart(2, '0')).join(' ');

    setTransactions((prev) => [
      {
        id: Math.random().toString(),
        time: Date.now(),
        direction: 'TX',
        service: serviceLabel,
        dataHex: txHex,
        decoded: decodedInfo,
        status: 'ok',
      },
      ...prev.slice(0, 49),
    ]);

    try {
      await transmitCanFrame({
        id: reqId,
        data: canData,
        dlc: 8,
        extended: false,
        fd: false,
      });
    } catch (err: any) {
      addToast('Transmission Error', err.message, 'error');
    } finally {
      setIsSending(false);
    }
  };

  // Parse Incoming UDS Frame
  const handleParseUdsResponse = (frame: CanFrame) => {
    const raw = frame.data;
    if (raw.length < 2) return;

    const pci = raw[0];
    const pciType = (pci & 0xf0) >> 4; // 0=SF, 1=FF, 2=CF, 3=FC

    let payload: number[] = [];
    if (pciType === 0) {
      // Single Frame
      const len = pci & 0x0f;
      payload = raw.slice(1, 1 + len);
    } else {
      payload = raw.slice(1);
    }

    if (payload.length === 0) return;
    const sid = payload[0];

    // Check Negative Response (0x7F)
    if (sid === 0x7f) {
      const rejectedSid = payload[1] || 0;
      const nrc = payload[2] || 0;
      const nrcInfo = NRC_MAP[nrc] || { name: 'unknownNrc', desc: 'Unrecognized ISO 14229 NRC' };

      const dataHex = raw.map((b) => b.toString(16).toUpperCase().padStart(2, '0')).join(' ');

      setTransactions((prev) => [
        {
          id: Math.random().toString(),
          time: Date.now(),
          direction: 'RX',
          service: `0x7F (NRC for 0x${rejectedSid.toString(16).toUpperCase()})`,
          dataHex,
          decoded: `NRC 0x${nrc.toString(16).toUpperCase()} [${nrcInfo.name}]: ${nrcInfo.desc}`,
          status: 'nrc',
        },
        ...prev.slice(0, 49),
      ]);

      if (rejectedSid === 0x22) {
        setReadDidResult({
          did: selectedDidHex,
          rawHex: dataHex,
          ascii: 'Negative Response',
          timestamp: Date.now(),
          status: 'nrc',
          nrcCode: nrc,
        });
      } else if (rejectedSid === 0x2e) {
        setWriteResult({
          status: 'nrc',
          message: `NRC 0x${nrc.toString(16).toUpperCase()} (${nrcInfo.name}): ${nrcInfo.desc}`,
          nrcCode: nrc,
        });
      } else if (rejectedSid === 0x27) {
        setSecurityStatus('locked');
        addToast('Security Access Denied', `NRC 0x${nrc.toString(16).toUpperCase()}: ${nrcInfo.name}`, 'error');
      }
      return;
    }

    const dataHex = raw.map((b) => b.toString(16).toUpperCase().padStart(2, '0')).join(' ');

    // 0x50: Positive Response to 0x10 DiagnosticSessionControl
    if (sid === 0x50) {
      const sessionType = payload[1] || 0x01;
      const sessionNames: Record<number, string> = {
        0x01: 'Default Session',
        0x02: 'Programming Session',
        0x03: 'Extended Diagnostic Session',
        0x04: 'Safety System Diagnostic Session',
      };
      const name = sessionNames[sessionType] || `Custom Session 0x${sessionType.toString(16).toUpperCase()}`;
      setActiveSession({ id: sessionType, name: `0x0${sessionType} - ${name}` });

      setTransactions((prev) => [
        {
          id: Math.random().toString(),
          time: Date.now(),
          direction: 'RX',
          service: '0x50 (SessionControl ACK)',
          dataHex,
          decoded: `ECU successfully transitioned to ${name}`,
          status: 'ok',
        },
        ...prev.slice(0, 49),
      ]);
      addToast('Session Changed', `Active session: ${name}`, 'success');
      return;
    }

    // 0x67: Positive Response to 0x27 SecurityAccess
    if (sid === 0x67) {
      const subFunc = payload[1];
      if (subFunc % 2 === 1) {
        // Odd sub-function = Seed received (e.g. 0x01, 0x03)
        const seedBytes = payload.slice(2);
        const seedHexStr = seedBytes.map((b) => b.toString(16).toUpperCase().padStart(2, '0')).join(' ');
        setReceivedSeedHex(seedHexStr);
        setSecurityStatus('seed_received');

        // Auto compute key
        calculateKeyFromSeed(seedBytes);

        setTransactions((prev) => [
          {
            id: Math.random().toString(),
            time: Date.now(),
            direction: 'RX',
            service: '0x67 (Security Seed Received)',
            dataHex,
            decoded: `Seed: ${seedHexStr}`,
            status: 'ok',
          },
          ...prev.slice(0, 49),
        ]);
      } else {
        // Even sub-function = Key validated! Security Access Granted!
        setSecurityStatus('unlocked');
        setTransactions((prev) => [
          {
            id: Math.random().toString(),
            time: Date.now(),
            direction: 'RX',
            service: '0x67 (Security Unlocked)',
            dataHex,
            decoded: `Security Access Granted (Level ${securityLevel})`,
            status: 'ok',
          },
          ...prev.slice(0, 49),
        ]);
        addToast('Security Access Granted', `Level ${securityLevel} successfully unlocked!`, 'success');
      }
      return;
    }

    // 0x62: Positive Response to 0x22 ReadDataByIdentifier
    if (sid === 0x62) {
      const respDid = ((payload[1] || 0) << 8) | (payload[2] || 0);
      const respDidHex = `0x${respDid.toString(16).toUpperCase().padStart(4, '0')}`;
      const dataBytes = payload.slice(3);
      const dataHexStr = dataBytes.map((b) => b.toString(16).toUpperCase().padStart(2, '0')).join(' ');
      const asciiStr = dataBytes.map((b) => (b >= 32 && b <= 126 ? String.fromCharCode(b) : '.')).join('');

      setReadDidResult({
        did: respDidHex,
        rawHex: dataHexStr,
        ascii: asciiStr,
        timestamp: Date.now(),
        status: 'ok',
      });

      setTransactions((prev) => [
        {
          id: Math.random().toString(),
          time: Date.now(),
          direction: 'RX',
          service: `0x62 (Read DID ${respDidHex})`,
          dataHex,
          decoded: `Data [${dataBytes.length}B]: "${asciiStr}" (${dataHexStr})`,
          status: 'ok',
        },
        ...prev.slice(0, 49),
      ]);
      return;
    }

    // 0x6E: Positive Response to 0x2E WriteDataByIdentifier
    if (sid === 0x6e) {
      const respDid = ((payload[1] || 0) << 8) | (payload[2] || 0);
      const respDidHex = `0x${respDid.toString(16).toUpperCase().padStart(4, '0')}`;
      setWriteResult({
        status: 'ok',
        message: `Write to DID ${respDidHex} successfully acknowledged by ECU!`,
      });
      setTransactions((prev) => [
        {
          id: Math.random().toString(),
          time: Date.now(),
          direction: 'RX',
          service: `0x6E (Write DID ${respDidHex} ACK)`,
          dataHex,
          decoded: `Data written successfully`,
          status: 'ok',
        },
        ...prev.slice(0, 49),
      ]);
      addToast('DID Write Successful', `DID ${respDidHex} written and verified.`, 'success');
      return;
    }

    // 0x59: Positive Response to 0x19 ReadDTCInformation
    if (sid === 0x59) {
      const sub = payload[1];
      const availabilityMask = payload[2];
      const dtcEntries: Array<any> = [];

      // DTC entries follow in 4-byte chunks: [DTC_High, DTC_Mid, DTC_Low, StatusByte]
      for (let i = 3; i + 3 < payload.length; i += 4) {
        const b1 = payload[i];
        const b2 = payload[i + 1];
        const b3 = payload[i + 2];
        const status = payload[i + 3];

        const typeChar = ['P', 'C', 'B', 'U'][(b1 & 0xc0) >> 6];
        const d1 = (b1 & 0x30) >> 4;
        const d2 = b1 & 0x0f;
        const d3 = (b2 & 0xf0) >> 4;
        const d4 = b2 & 0x0f;
        const d5 = (b3 & 0xf0) >> 4;
        const d6 = b3 & 0x0f;
        const code = `${typeChar}${d1}${d2.toString(16).toUpperCase()}${d3.toString(16).toUpperCase()}${d4.toString(16).toUpperCase()}-${d5.toString(16).toUpperCase()}${d6.toString(16).toUpperCase()}`;

        dtcEntries.push({
          code,
          statusByte: status,
          failed: (status & 0x01) !== 0,
          pending: (status & 0x04) !== 0,
          confirmed: (status & 0x08) !== 0,
          testFailedSinceClear: (status & 0x20) !== 0,
        });
      }

      setDtcList(dtcEntries);
      setTransactions((prev) => [
        {
          id: Math.random().toString(),
          time: Date.now(),
          direction: 'RX',
          service: '0x59 (DTC Info)',
          dataHex,
          decoded: `Reported ${dtcEntries.length} DTC(s) (Mask 0x${availabilityMask.toString(16).toUpperCase()})`,
          status: 'ok',
        },
        ...prev.slice(0, 49),
      ]);
    }
  };

  // Calculate Key from Seed
  const calculateKeyFromSeed = (seedBytes: number[]) => {
    const mask = parseInt(secretMaskHex, 16) || 0x5a5a5a5a;
    const maskBytes = [
      (mask >> 24) & 0xff,
      (mask >> 16) & 0xff,
      (mask >> 8) & 0xff,
      mask & 0xff,
    ];

    let keyBytes: number[] = [];
    if (keyAlgorithm === 'xor') {
      keyBytes = seedBytes.map((sb, i) => sb ^ (maskBytes[i % 4] || 0x5a));
    } else if (keyAlgorithm === 'plus') {
      keyBytes = seedBytes.map((sb, i) => (sb + (maskBytes[i % 4] || 0x01)) & 0xff);
    } else {
      keyBytes = [...seedBytes];
    }

    const keyStr = keyBytes.map((b) => b.toString(16).toUpperCase().padStart(2, '0')).join(' ');
    setCalculatedKeyHex(keyStr);
  };

  // Handlers for User Actions

  // 1. DiagnosticSessionControl (0x10)
  const handleSendSessionControl = async (sessionType: number) => {
    const names: Record<number, string> = {
      0x01: 'Default Session',
      0x02: 'Programming Session',
      0x03: 'Extended Session',
      0x04: 'Safety Session',
    };
    await sendUdsRequest(
      [0x10, sessionType],
      `0x10 DiagnosticSessionControl`,
      `Request transition to 0x0${sessionType} (${names[sessionType]})`
    );
  };

  // 2. SecurityAccess (0x27) - Request Seed
  const handleRequestSeed = async () => {
    const subFunc = securityLevel; // e.g. 0x01
    await sendUdsRequest(
      [0x27, subFunc],
      `0x27 SecurityAccess (Request Seed)`,
      `Request Seed for Security Level ${securityLevel} (SubFunction 0x0${subFunc})`
    );
  };

  // 2. SecurityAccess (0x27) - Send Key
  const handleSendKey = async () => {
    const keyBytes = calculatedKeyHex
      .trim()
      .split(/\s+/)
      .map((h) => parseInt(h, 16))
      .filter((n) => !isNaN(n));

    if (keyBytes.length === 0) {
      addToast('No Key Provided', 'Calculate or enter key bytes before sending.', 'warning');
      return;
    }

    const subFunc = securityLevel + 1; // e.g. 0x02
    await sendUdsRequest(
      [0x27, subFunc, ...keyBytes],
      `0x27 SecurityAccess (Send Key)`,
      `Send Key for Level ${securityLevel} (SubFunction 0x0${subFunc}): ${calculatedKeyHex}`
    );
  };

  // 3. ReadDataByIdentifier (0x22)
  const handleReadDid = async (didToRead?: string) => {
    const targetDid = didToRead || customDidInput || selectedDidHex;
    const didNum = parseInt(targetDid, 16);
    if (isNaN(didNum)) {
      addToast('Invalid DID', 'Please specify a valid 2-byte hexadecimal DID (e.g. 0xF190).', 'error');
      return;
    }

    const didHigh = (didNum >> 8) & 0xff;
    const didLow = didNum & 0xff;

    await sendUdsRequest(
      [0x22, didHigh, didLow],
      `0x22 ReadDataByIdentifier`,
      `Read DID 0x${didNum.toString(16).toUpperCase().padStart(4, '0')}`
    );
  };

  // 4. WriteDataByIdentifier (0x2E)
  const handleWriteDid = async () => {
    const didNum = parseInt(writeDidHex, 16);
    if (isNaN(didNum)) {
      addToast('Invalid DID', 'Please enter a valid hexadecimal DID.', 'error');
      return;
    }

    let payloadBytes: number[] = [];
    if (writeTextMode) {
      payloadBytes = writeDataPayload.split('').map((c) => c.charCodeAt(0));
    } else {
      payloadBytes = writeDataPayload
        .trim()
        .split(/\s+/)
        .map((h) => parseInt(h, 16))
        .filter((n) => !isNaN(n));
    }

    if (payloadBytes.length === 0) {
      addToast('Empty Payload', 'Please provide data bytes to write into the DID.', 'warning');
      return;
    }

    const didHigh = (didNum >> 8) & 0xff;
    const didLow = didNum & 0xff;

    await sendUdsRequest(
      [0x2e, didHigh, didLow, ...payloadBytes],
      `0x2E WriteDataByIdentifier`,
      `Write DID 0x${didNum.toString(16).toUpperCase().padStart(4, '0')} (${payloadBytes.length} bytes)`
    );
  };

  // 5. ReadDTCInformation (0x19)
  const handleReadDtcs = async () => {
    const mask = parseInt(dtcStatusMaskHex, 16) || 0x09;
    await sendUdsRequest(
      [0x19, dtcSubFunction, mask],
      `0x19 ReadDTCInformation`,
      `Query DTCs subFunction 0x0${dtcSubFunction} with Status Mask 0x${mask.toString(16).toUpperCase()}`
    );
  };

  // 6. ClearDiagnosticInformation (0x14)
  const handleClearAllDtcs = async () => {
    await sendUdsRequest(
      [0x14, 0xff, 0xff, 0xff],
      `0x14 ClearDiagnosticInformation`,
      `Clear all emissions & manufacturer DTCs (Group 0xFFFFFF)`
    );
    setDtcList([]);
    addToast('DTC Clear Dispatched', 'Service 0x14 broadcast sent to reset ECU fault log.', 'info');
  };

  return (
    <div className="space-y-4">
      {/* Addressing & Session Status Header */}
      <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4 shadow-sm flex flex-col md:flex-row items-start md:items-center justify-between gap-4 text-xs">
        {/* Addressing Config */}
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center space-x-1.5">
            <span className="text-zinc-400 font-medium">Request CAN ID:</span>
            <input
              type="text"
              value={requestCanIdHex}
              onChange={(e) => setRequestCanIdHex(e.target.value)}
              className="w-20 px-2 py-1 bg-zinc-950 border border-zinc-700 rounded text-cyan-400 font-mono font-bold focus:outline-none focus:border-cyan-500"
              placeholder="0x7E0"
            />
          </div>

          <div className="flex items-center space-x-1.5">
            <span className="text-zinc-400 font-medium">Response CAN ID:</span>
            <input
              type="text"
              value={responseCanIdHex}
              onChange={(e) => setResponseCanIdHex(e.target.value)}
              className="w-20 px-2 py-1 bg-zinc-950 border border-zinc-700 rounded text-emerald-400 font-mono font-bold focus:outline-none focus:border-emerald-500"
              placeholder="0x7E8"
            />
          </div>

          {/* TesterPresent Keep-Alive Toggle */}
          <button
            onClick={() => setTesterPresentActive(!testerPresentActive)}
            className={`px-2.5 py-1 rounded text-xs font-mono font-semibold transition cursor-pointer flex items-center space-x-1.5 ${
              testerPresentActive
                ? 'bg-cyan-950 text-cyan-300 border border-cyan-700 shadow-xs'
                : 'bg-zinc-800 text-zinc-400 hover:text-zinc-200'
            }`}
            title="Send cyclic 0x3E TesterPresent every 2s to maintain active non-default session"
          >
            <Radio className={`w-3.5 h-3.5 ${testerPresentActive ? 'animate-pulse text-cyan-400' : ''}`} />
            <span>TesterPresent (0x3E): {testerPresentActive ? 'ON' : 'OFF'}</span>
          </button>
        </div>

        {/* Current ECU Diagnostic Status Pills */}
        <div className="flex items-center space-x-3">
          <div className="px-2.5 py-1 rounded bg-zinc-950 border border-zinc-800 font-mono">
            <span className="text-zinc-500 text-[10px] block uppercase font-sans">Active Session</span>
            <span className="font-bold text-zinc-200">{activeSession.name}</span>
          </div>

          <div className="px-2.5 py-1 rounded bg-zinc-950 border border-zinc-800 font-mono">
            <span className="text-zinc-500 text-[10px] block uppercase font-sans">Security State</span>
            <span
              className={`font-bold flex items-center space-x-1 ${
                securityStatus === 'unlocked'
                  ? 'text-emerald-400'
                  : securityStatus === 'seed_received'
                  ? 'text-amber-400'
                  : 'text-zinc-400'
              }`}
            >
              {securityStatus === 'unlocked' ? (
                <>
                  <Unlock className="w-3 h-3" />
                  <span>Level {securityLevel} Unlocked</span>
                </>
              ) : (
                <>
                  <Lock className="w-3 h-3" />
                  <span>Locked</span>
                </>
              )}
            </span>
          </div>
        </div>
      </div>

      {/* Service Selector Tabs */}
      <div className="flex items-center space-x-2 bg-zinc-900 p-1.5 rounded-xl border border-zinc-800 overflow-x-auto text-xs">
        <button
          onClick={() => setSubService('0x22')}
          className={`px-3.5 py-1.5 rounded-lg font-semibold transition cursor-pointer flex items-center space-x-1.5 shrink-0 ${
            subService === '0x22'
              ? 'bg-cyan-600 text-zinc-950 font-bold shadow-xs'
              : 'text-zinc-400 hover:text-zinc-200'
          }`}
        >
          <Database className="w-3.5 h-3.5" />
          <span>0x22 Read DID</span>
        </button>

        <button
          onClick={() => setSubService('0x2E')}
          className={`px-3.5 py-1.5 rounded-lg font-semibold transition cursor-pointer flex items-center space-x-1.5 shrink-0 ${
            subService === '0x2E'
              ? 'bg-cyan-600 text-zinc-950 font-bold shadow-xs'
              : 'text-zinc-400 hover:text-zinc-200'
          }`}
        >
          <FileCode className="w-3.5 h-3.5" />
          <span>0x2E Write DID</span>
        </button>

        <button
          onClick={() => setSubService('0x10')}
          className={`px-3.5 py-1.5 rounded-lg font-semibold transition cursor-pointer flex items-center space-x-1.5 shrink-0 ${
            subService === '0x10'
              ? 'bg-cyan-600 text-zinc-950 font-bold shadow-xs'
              : 'text-zinc-400 hover:text-zinc-200'
          }`}
        >
          <Zap className="w-3.5 h-3.5" />
          <span>0x10 Session Control</span>
        </button>

        <button
          onClick={() => setSubService('0x27')}
          className={`px-3.5 py-1.5 rounded-lg font-semibold transition cursor-pointer flex items-center space-x-1.5 shrink-0 ${
            subService === '0x27'
              ? 'bg-cyan-600 text-zinc-950 font-bold shadow-xs'
              : 'text-zinc-400 hover:text-zinc-200'
          }`}
        >
          <Shield className="w-3.5 h-3.5" />
          <span>0x27 Security Access</span>
        </button>

        <button
          onClick={() => setSubService('0x19')}
          className={`px-3.5 py-1.5 rounded-lg font-semibold transition cursor-pointer flex items-center space-x-1.5 shrink-0 ${
            subService === '0x19'
              ? 'bg-cyan-600 text-zinc-950 font-bold shadow-xs'
              : 'text-zinc-400 hover:text-zinc-200'
          }`}
        >
          <AlertTriangle className="w-3.5 h-3.5" />
          <span>0x19 DTC Fault Explorer</span>
        </button>
      </div>

      {/* Main Service Working Area */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Left 2 Cols: Active Interactive Service Form */}
        <div className="lg:col-span-2 bg-zinc-900 border border-zinc-800 rounded-xl p-5 space-y-4">
          {/* SERVICE 0x22: ReadDataByIdentifier */}
          {subService === '0x22' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-bold text-sm text-zinc-100 flex items-center space-x-2">
                    <Database className="w-4 h-4 text-cyan-400" />
                    <span>Service 0x22: ReadDataByIdentifier</span>
                  </h3>
                  <p className="text-xs text-zinc-400 mt-0.5">
                    Query 2-byte standard and manufacturer data identifiers from ECU EEPROM or RAM
                  </p>
                </div>
              </div>

              {/* DID Preset Grid */}
              <div>
                <span className="text-[11px] font-mono text-zinc-400 block mb-1.5">Standard DID Presets:</span>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {POPULAR_DIDS.map((item) => (
                    <div
                      key={item.hex}
                      onClick={() => {
                        setSelectedDidHex(item.hex);
                        setCustomDidInput(item.hex);
                        handleReadDid(item.hex);
                      }}
                      className={`p-2.5 rounded-lg border transition cursor-pointer flex items-start justify-between gap-2 ${
                        selectedDidHex === item.hex
                          ? 'bg-cyan-950/60 border-cyan-700/80 text-cyan-300'
                          : 'bg-zinc-950 border-zinc-800 hover:border-zinc-700 text-zinc-300'
                      }`}
                    >
                      <div className="min-w-0">
                        <div className="flex items-center space-x-1.5">
                          <span className="font-mono font-bold text-xs">{item.hex}</span>
                          <span className="font-semibold text-xs text-zinc-200 truncate">{item.name}</span>
                        </div>
                        <p className="text-[10px] text-zinc-500 truncate mt-0.5">{item.desc}</p>
                      </div>
                      <button className="px-2 py-1 bg-zinc-800 hover:bg-cyan-600 hover:text-zinc-950 text-zinc-300 rounded text-[10px] font-semibold shrink-0 transition">
                        Read
                      </button>
                    </div>
                  ))}
                </div>
              </div>

              {/* Custom DID Input */}
              <div className="flex items-center space-x-2 pt-2 border-t border-zinc-800">
                <span className="text-xs text-zinc-400">Custom DID:</span>
                <input
                  type="text"
                  value={customDidInput}
                  onChange={(e) => setCustomDidInput(e.target.value)}
                  placeholder="e.g. 0xF190 or 0x0100"
                  className="w-36 px-2.5 py-1.5 bg-zinc-950 border border-zinc-700 rounded text-xs font-mono text-zinc-200 focus:outline-none focus:border-cyan-500"
                />
                <button
                  onClick={() => handleReadDid()}
                  disabled={isSending}
                  className="px-4 py-1.5 bg-cyan-600 hover:bg-cyan-500 disabled:opacity-50 text-zinc-950 font-bold rounded text-xs transition cursor-pointer flex items-center space-x-1.5"
                >
                  <Send className="w-3.5 h-3.5" />
                  <span>Send Request (0x22)</span>
                </button>
              </div>

              {/* Read Result Card */}
              {readDidResult && (
                <div
                  className={`p-3.5 rounded-lg border space-y-2 font-mono text-xs ${
                    readDidResult.status === 'ok'
                      ? 'bg-zinc-950 border-cyan-800/80'
                      : 'bg-rose-950/40 border-rose-800/80 text-rose-300'
                  }`}
                >
                  <div className="flex items-center justify-between text-[11px] text-zinc-400">
                    <span className="font-bold text-zinc-200">DID Response: {readDidResult.did}</span>
                    <span>{new Date(readDidResult.timestamp).toLocaleTimeString()}</span>
                  </div>

                  {readDidResult.status === 'ok' ? (
                    <div className="space-y-1.5">
                      <div className="text-emerald-400 font-bold text-sm truncate">
                        ASCII: &ldquo;{readDidResult.ascii}&rdquo;
                      </div>
                      <div className="text-zinc-400 text-xs break-all">
                        Hex Data: <strong className="text-cyan-300">{readDidResult.rawHex}</strong>
                      </div>
                    </div>
                  ) : (
                    <div>
                      Negative Response (NRC 0x{readDidResult.nrcCode?.toString(16).toUpperCase()}):{' '}
                      {NRC_MAP[readDidResult.nrcCode || 0]?.desc || 'Request Denied'}
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* SERVICE 0x2E: WriteDataByIdentifier */}
          {subService === '0x2E' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-bold text-sm text-zinc-100 flex items-center space-x-2">
                    <FileCode className="w-4 h-4 text-cyan-400" />
                    <span>Service 0x2E: WriteDataByIdentifier</span>
                  </h3>
                  <p className="text-xs text-zinc-400 mt-0.5">
                    Write configuration parameters, calibration maps, or identification data into ECU storage
                  </p>
                </div>

                {activeSession.id === 0x01 && (
                  <span className="px-2 py-1 rounded bg-amber-950 text-amber-300 border border-amber-800 text-[10px] flex items-center space-x-1">
                    <AlertTriangle className="w-3 h-3" />
                    <span>Extended Session Recommended</span>
                  </span>
                )}
              </div>

              <div className="space-y-3">
                <div className="flex items-center space-x-2">
                  <span className="text-xs text-zinc-400 w-24">Target DID:</span>
                  <input
                    type="text"
                    value={writeDidHex}
                    onChange={(e) => setWriteDidHex(e.target.value)}
                    placeholder="0x0105"
                    className="w-36 px-2.5 py-1.5 bg-zinc-950 border border-zinc-700 rounded text-xs font-mono text-cyan-300 focus:outline-none focus:border-cyan-500"
                  />
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs text-zinc-400">Payload Data:</span>
                    <button
                      onClick={() => setWriteTextMode(!writeTextMode)}
                      className="text-[11px] text-cyan-400 hover:underline cursor-pointer"
                    >
                      {writeTextMode ? 'Switch to Hex Bytes' : 'Switch to Plain Text ASCII'}
                    </button>
                  </div>
                  <textarea
                    rows={3}
                    value={writeDataPayload}
                    onChange={(e) => setWriteDataPayload(e.target.value)}
                    placeholder={writeTextMode ? 'Enter ASCII string...' : '00 00 00 01 5A'}
                    className="w-full p-2.5 bg-zinc-950 border border-zinc-700 rounded text-xs font-mono text-zinc-200 focus:outline-none focus:border-cyan-500"
                  />
                </div>

                <div className="flex items-center justify-between pt-2">
                  <p className="text-[11px] text-zinc-500">
                    Format: {writeTextMode ? 'ASCII String' : 'Space-delimited Hex bytes (e.g. 01 02 A4)'}
                  </p>

                  <button
                    onClick={handleWriteDid}
                    disabled={isSending}
                    className="px-4 py-1.5 bg-rose-600 hover:bg-rose-500 disabled:opacity-50 text-white font-bold rounded text-xs transition cursor-pointer flex items-center space-x-1.5 shadow-sm"
                  >
                    <Send className="w-3.5 h-3.5" />
                    <span>Execute Write (0x2E)</span>
                  </button>
                </div>

                {writeResult && (
                  <div
                    className={`p-3 rounded-lg border text-xs font-mono ${
                      writeResult.status === 'ok'
                        ? 'bg-emerald-950/60 border-emerald-800 text-emerald-300'
                        : 'bg-rose-950/60 border-rose-800 text-rose-300'
                    }`}
                  >
                    {writeResult.message}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* SERVICE 0x10: DiagnosticSessionControl */}
          {subService === '0x10' && (
            <div className="space-y-4">
              <div>
                <h3 className="font-bold text-sm text-zinc-100 flex items-center space-x-2">
                  <Zap className="w-4 h-4 text-cyan-400" />
                  <span>Service 0x10: DiagnosticSessionControl</span>
                </h3>
                <p className="text-xs text-zinc-400 mt-0.5">
                  Change ECU operating mode to unlock diagnostic services, calibration routines, or flash programming
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {/* 0x01 Default Session */}
                <div className="p-3 bg-zinc-950 border border-zinc-800 rounded-lg space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-xs text-zinc-200">0x01: Default Session</span>
                    {activeSession.id === 0x01 && (
                      <span className="px-1.5 py-0.5 rounded text-[10px] bg-emerald-950 text-emerald-400 border border-emerald-800">
                        ACTIVE
                      </span>
                    )}
                  </div>
                  <p className="text-[11px] text-zinc-400 leading-relaxed">
                    Standard operating mode. Limited diagnostic read capability; safety critical writes restricted.
                  </p>
                  <button
                    onClick={() => handleSendSessionControl(0x01)}
                    className="w-full py-1.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-200 rounded text-xs font-semibold transition cursor-pointer"
                  >
                    Enter Default Session
                  </button>
                </div>

                {/* 0x03 Extended Diagnostic Session */}
                <div className="p-3 bg-zinc-950 border border-zinc-800 rounded-lg space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-xs text-cyan-400">0x03: Extended Session</span>
                    {activeSession.id === 0x03 && (
                      <span className="px-1.5 py-0.5 rounded text-[10px] bg-cyan-950 text-cyan-400 border border-cyan-800">
                        ACTIVE
                      </span>
                    )}
                  </div>
                  <p className="text-[11px] text-zinc-400 leading-relaxed">
                    Unlocks actuator control, high-speed periodic DID polling, and security access unlocking.
                  </p>
                  <button
                    onClick={() => handleSendSessionControl(0x03)}
                    className="w-full py-1.5 bg-cyan-700 hover:bg-cyan-600 text-white rounded text-xs font-semibold transition cursor-pointer"
                  >
                    Enter Extended Session
                  </button>
                </div>

                {/* 0x02 Programming Session */}
                <div className="p-3 bg-zinc-950 border border-zinc-800 rounded-lg space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-xs text-amber-400">0x02: Programming Session</span>
                    {activeSession.id === 0x02 && (
                      <span className="px-1.5 py-0.5 rounded text-[10px] bg-amber-950 text-amber-400 border border-amber-800">
                        ACTIVE
                      </span>
                    )}
                  </div>
                  <p className="text-[11px] text-zinc-400 leading-relaxed">
                    Bootloader mode for flashing application code, calibration maps, and EEPROM firmware.
                  </p>
                  <button
                    onClick={() => handleSendSessionControl(0x02)}
                    className="w-full py-1.5 bg-amber-700 hover:bg-amber-600 text-white rounded text-xs font-semibold transition cursor-pointer"
                  >
                    Enter Programming Session
                  </button>
                </div>

                {/* 0x04 Safety System Session */}
                <div className="p-3 bg-zinc-950 border border-zinc-800 rounded-lg space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-xs text-purple-400">0x04: Safety System Session</span>
                    {activeSession.id === 0x04 && (
                      <span className="px-1.5 py-0.5 rounded text-[10px] bg-purple-950 text-purple-400 border border-purple-800">
                        ACTIVE
                      </span>
                    )}
                  </div>
                  <p className="text-[11px] text-zinc-400 leading-relaxed">
                    Airbag deployment inspection, ESC/ABS calibration, and steering torque sensor zeroing.
                  </p>
                  <button
                    onClick={() => handleSendSessionControl(0x04)}
                    className="w-full py-1.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-200 rounded text-xs font-semibold transition cursor-pointer"
                  >
                    Enter Safety Session
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* SERVICE 0x27: SecurityAccess */}
          {subService === '0x27' && (
            <div className="space-y-4">
              <div>
                <h3 className="font-bold text-sm text-zinc-100 flex items-center space-x-2">
                  <Shield className="w-4 h-4 text-cyan-400" />
                  <span>Service 0x27: SecurityAccess (Seed & Key Authentication)</span>
                </h3>
                <p className="text-xs text-zinc-400 mt-0.5">
                  Cryptographic handshake to gain privileged authorization for write and flash operations
                </p>
              </div>

              {/* Step-by-Step Flow */}
              <div className="space-y-3">
                {/* Step 1: Request Seed */}
                <div className="p-3 bg-zinc-950 border border-zinc-800 rounded-lg space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-xs text-zinc-200 flex items-center space-x-1.5">
                      <span className="w-4 h-4 rounded-full bg-cyan-600 text-zinc-950 font-bold flex items-center justify-center text-[10px]">
                        1
                      </span>
                      <span>Request Cryptographic Seed</span>
                    </span>
                    <div className="flex items-center space-x-2">
                      <span className="text-zinc-500 text-[11px]">Security Level:</span>
                      <select
                        value={securityLevel}
                        onChange={(e) => setSecurityLevel(Number(e.target.value))}
                        className="bg-zinc-900 border border-zinc-700 rounded px-1.5 py-0.5 text-zinc-200 font-mono text-xs"
                      >
                        <option value={1}>Level 1 (Sub 0x01/0x02)</option>
                        <option value={3}>Level 3 (Sub 0x03/0x04)</option>
                        <option value={5}>Level 5 (Sub 0x05/0x06)</option>
                      </select>
                    </div>
                  </div>

                  <div className="flex items-center space-x-3">
                    <button
                      onClick={handleRequestSeed}
                      disabled={isSending}
                      className="px-3 py-1.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-200 rounded text-xs font-semibold transition cursor-pointer"
                    >
                      Send Seed Request (0x27 0x0{securityLevel})
                    </button>
                    {receivedSeedHex && (
                      <span className="text-xs font-mono text-amber-400">
                        Received Seed: <strong>{receivedSeedHex}</strong>
                      </span>
                    )}
                  </div>
                </div>

                {/* Step 2: Key Computation Algorithm */}
                <div className="p-3 bg-zinc-950 border border-zinc-800 rounded-lg space-y-2">
                  <span className="font-bold text-xs text-zinc-200 flex items-center space-x-1.5">
                    <span className="w-4 h-4 rounded-full bg-cyan-600 text-zinc-950 font-bold flex items-center justify-center text-[10px]">
                      2
                    </span>
                    <span>Compute Key from Seed</span>
                  </span>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                    <div>
                      <span className="text-zinc-400 text-[11px] block mb-1">Algorithm Formula:</span>
                      <select
                        value={keyAlgorithm}
                        onChange={(e) => setKeyAlgorithm(e.target.value as any)}
                        className="w-full bg-zinc-900 border border-zinc-700 rounded px-2 py-1 text-zinc-200 font-mono"
                      >
                        <option value="xor">XOR with Secret Mask</option>
                        <option value="plus">Additive Shift (+ Mask)</option>
                        <option value="manual">Manual Key Injection</option>
                      </select>
                    </div>

                    <div>
                      <span className="text-zinc-400 text-[11px] block mb-1">Secret Mask (Hex):</span>
                      <input
                        type="text"
                        value={secretMaskHex}
                        onChange={(e) => setSecretMaskHex(e.target.value)}
                        className="w-full bg-zinc-900 border border-zinc-700 rounded px-2 py-1 text-cyan-300 font-mono"
                      />
                    </div>
                  </div>

                  <div>
                    <span className="text-zinc-400 text-[11px] block mb-1">Calculated Key (Hex Bytes):</span>
                    <input
                      type="text"
                      value={calculatedKeyHex}
                      onChange={(e) => setCalculatedKeyHex(e.target.value)}
                      placeholder="e.g. 5A A5 F0 0F"
                      className="w-full bg-zinc-900 border border-zinc-700 rounded px-2 py-1 text-emerald-400 font-mono font-bold"
                    />
                  </div>
                </div>

                {/* Step 3: Send Key */}
                <div className="p-3 bg-zinc-950 border border-zinc-800 rounded-lg flex items-center justify-between">
                  <span className="font-bold text-xs text-zinc-200 flex items-center space-x-1.5">
                    <span className="w-4 h-4 rounded-full bg-cyan-600 text-zinc-950 font-bold flex items-center justify-center text-[10px]">
                      3
                    </span>
                    <span>Submit Key to ECU</span>
                  </span>

                  <button
                    onClick={handleSendKey}
                    disabled={isSending || !calculatedKeyHex}
                    className="px-4 py-1.5 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-40 text-zinc-950 font-bold rounded text-xs transition cursor-pointer flex items-center space-x-1.5"
                  >
                    <Key className="w-3.5 h-3.5" />
                    <span>Send Key (0x27 0x0{securityLevel + 1})</span>
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* SERVICE 0x19: ReadDTCInformation */}
          {subService === '0x19' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-bold text-sm text-zinc-100 flex items-center space-x-2">
                    <AlertTriangle className="w-4 h-4 text-cyan-400" />
                    <span>Service 0x19: ReadDTCInformation</span>
                  </h3>
                  <p className="text-xs text-zinc-400 mt-0.5">
                    Read active, pending, and historical diagnostic trouble codes with status mask breakdown
                  </p>
                </div>

                <button
                  onClick={handleClearAllDtcs}
                  className="px-3 py-1.5 bg-rose-950 hover:bg-rose-900 text-rose-300 border border-rose-800/80 rounded text-xs font-semibold transition cursor-pointer"
                >
                  Clear All DTCs (0x14)
                </button>
              </div>

              {/* Status Mask Selection */}
              <div className="flex items-center space-x-3 p-3 bg-zinc-950 border border-zinc-800 rounded-lg text-xs">
                <span className="text-zinc-400">Status Mask:</span>
                <select
                  value={dtcStatusMaskHex}
                  onChange={(e) => setDtcStatusMaskHex(e.target.value)}
                  className="bg-zinc-900 border border-zinc-700 rounded px-2 py-1 text-zinc-200 font-mono"
                >
                  <option value="0x09">0x09 (Confirmed & Pending)</option>
                  <option value="0x08">0x08 (Confirmed DTCs Only)</option>
                  <option value="0x01">0x01 (Test Failed / Active)</option>
                  <option value="0xFF">0xFF (All Faults)</option>
                </select>

                <button
                  onClick={handleReadDtcs}
                  disabled={isSending}
                  className="px-3.5 py-1 bg-cyan-600 hover:bg-cyan-500 text-zinc-950 font-bold rounded text-xs transition cursor-pointer flex items-center space-x-1"
                >
                  <RefreshCw className="w-3 h-3" />
                  <span>Query DTCs</span>
                </button>
              </div>

              {/* DTC Results Table */}
              <div className="border border-zinc-800 rounded-lg overflow-hidden font-mono text-xs">
                <table className="w-full text-left border-collapse">
                  <thead className="bg-zinc-950 text-zinc-400 text-[11px] border-b border-zinc-800">
                    <tr>
                      <th className="py-2 px-3">DTC Code</th>
                      <th className="py-2 px-3">Status Byte</th>
                      <th className="py-2 px-3">Confirmed</th>
                      <th className="py-2 px-3">Pending</th>
                      <th className="py-2 px-3">Active Fail</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-800 text-zinc-300">
                    {dtcList.length === 0 ? (
                      <tr>
                        <td colSpan={5} className="py-6 text-center text-zinc-500 font-sans text-xs">
                          No active fault codes returned or query pending.
                        </td>
                      </tr>
                    ) : (
                      dtcList.map((d, i) => (
                        <tr key={i} className="hover:bg-zinc-800/40">
                          <td className="py-2 px-3 font-bold text-rose-400">{d.code}</td>
                          <td className="py-2 px-3 text-zinc-400">0x{d.statusByte.toString(16).toUpperCase()}</td>
                          <td className="py-2 px-3">
                            <span
                              className={`px-1.5 py-0.5 rounded text-[10px] ${
                                d.confirmed ? 'bg-rose-950 text-rose-300 border border-rose-800' : 'text-zinc-600'
                              }`}
                            >
                              {d.confirmed ? 'YES' : 'NO'}
                            </span>
                          </td>
                          <td className="py-2 px-3">
                            <span
                              className={`px-1.5 py-0.5 rounded text-[10px] ${
                                d.pending ? 'bg-amber-950 text-amber-300 border border-amber-800' : 'text-zinc-600'
                              }`}
                            >
                              {d.pending ? 'YES' : 'NO'}
                            </span>
                          </td>
                          <td className="py-2 px-3">
                            <span
                              className={`px-1.5 py-0.5 rounded text-[10px] ${
                                d.failed ? 'bg-rose-950 text-rose-300 border border-rose-800' : 'text-zinc-600'
                              }`}
                            >
                              {d.failed ? 'FAIL' : 'PASS'}
                            </span>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>

        {/* Right 1 Col: Live Transaction Log (TX/RX Console) */}
        <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4 flex flex-col justify-between space-y-3">
          <div className="flex items-center justify-between pb-2 border-b border-zinc-800">
            <div className="flex items-center space-x-2">
              <Terminal className="w-4 h-4 text-cyan-400" />
              <span className="font-bold text-xs text-zinc-200">UDS Transaction Log</span>
            </div>
            <button
              onClick={() => setTransactions([])}
              className="text-[11px] text-zinc-500 hover:text-zinc-300 cursor-pointer"
            >
              Clear Log
            </button>
          </div>

          <div className="flex-1 overflow-y-auto max-h-96 space-y-2 font-mono text-[11px] pr-1">
            {transactions.length === 0 ? (
              <div className="text-center py-12 text-zinc-500 font-sans text-xs">
                Awaiting ISO 14229-1 requests or ECU responses...
              </div>
            ) : (
              transactions.map((tx) => (
                <div
                  key={tx.id}
                  className={`p-2 rounded border transition ${
                    tx.direction === 'TX'
                      ? 'bg-zinc-950 border-cyan-900/60'
                      : tx.status === 'nrc'
                      ? 'bg-rose-950/40 border-rose-800/60'
                      : 'bg-zinc-950 border-emerald-900/60'
                  }`}
                >
                  <div className="flex items-center justify-between text-[10px]">
                    <span
                      className={`font-bold ${
                        tx.direction === 'TX' ? 'text-cyan-400' : tx.status === 'nrc' ? 'text-rose-400' : 'text-emerald-400'
                      }`}
                    >
                      {tx.direction} • {tx.service}
                    </span>
                    <span className="text-zinc-500">{new Date(tx.time).toLocaleTimeString()}</span>
                  </div>
                  <div className="text-zinc-300 font-bold mt-0.5 truncate">{tx.decoded}</div>
                  <div className="text-zinc-500 text-[10px] truncate mt-0.5">{tx.dataHex}</div>
                </div>
              ))
            )}
          </div>

          {/* Quick Addressing Info */}
          <div className="pt-2 border-t border-zinc-800 text-[11px] text-zinc-500 font-mono flex items-center justify-between">
            <span>TX: {requestCanIdHex}</span>
            <ArrowRight className="w-3 h-3 text-zinc-600" />
            <span>RX: {responseCanIdHex}</span>
          </div>
        </div>
      </div>
    </div>
  );
};
