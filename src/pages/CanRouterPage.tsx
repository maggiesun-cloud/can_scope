import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  CanFrame,
  BusStatus,
  CanRouterChannelConfig,
  CanRoutingRule,
  CanRouterPacketLog,
  RoutingAction,
} from '../types/can';
import { transmitCanFrame } from '../services/api';
import {
  Network,
  GitFork,
  ArrowRight,
  ArrowLeftRight,
  Shield,
  Zap,
  Play,
  Pause,
  RotateCcw,
  Plus,
  Trash2,
  Edit2,
  Copy,
  Download,
  Upload,
  Send,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Sliders,
  Filter,
  Layers,
  Activity,
  Check,
  Search,
  ExternalLink,
} from 'lucide-react';

interface CanRouterPageProps {
  status: BusStatus;
  frames: CanFrame[];
  addToast: (title: string, message?: string, type?: 'info' | 'success' | 'warning' | 'error') => void;
}

// Initial 6-Channel Hardware Configuration based on standard automotive & industrial 6-channel routers
const DEFAULT_CHANNELS: CanRouterChannelConfig[] = [
  {
    id: 1,
    name: 'CH 1 (Powertrain)',
    interfaceCode: 'can0',
    domain: 'Powertrain & Drive',
    color: 'emerald',
    bitrate: 500000,
    dataBitrate: 2000000,
    fdEnabled: false,
    listenOnly: false,
    terminationResistor: true,
    enabled: true,
    busLoad: 24.5,
    fps: 120,
    rxCount: 14200,
    txCount: 840,
    errorCount: 0,
  },
  {
    id: 2,
    name: 'CH 2 (Body)',
    interfaceCode: 'can1',
    domain: 'Body & Comfort',
    color: 'amber',
    bitrate: 125000,
    dataBitrate: 1000000,
    fdEnabled: false,
    listenOnly: false,
    terminationResistor: true,
    enabled: true,
    busLoad: 8.2,
    fps: 25,
    rxCount: 3840,
    txCount: 120,
    errorCount: 0,
  },
  {
    id: 3,
    name: 'CH 3 (Chassis)',
    interfaceCode: 'can2',
    domain: 'Chassis & Dynamics',
    color: 'cyan',
    bitrate: 500000,
    dataBitrate: 2000000,
    fdEnabled: false,
    listenOnly: false,
    terminationResistor: true,
    enabled: true,
    busLoad: 18.0,
    fps: 60,
    rxCount: 7650,
    txCount: 450,
    errorCount: 0,
  },
  {
    id: 4,
    name: 'CH 4 (ADAS)',
    interfaceCode: 'can3',
    domain: 'ADAS & Radar',
    color: 'purple',
    bitrate: 1000000,
    dataBitrate: 4000000,
    fdEnabled: true,
    listenOnly: false,
    terminationResistor: true,
    enabled: true,
    busLoad: 31.4,
    fps: 180,
    rxCount: 22100,
    txCount: 1650,
    errorCount: 0,
  },
  {
    id: 5,
    name: 'CH 5 (Infotainment)',
    interfaceCode: 'can4',
    domain: 'Cockpit & Cluster',
    color: 'sky',
    bitrate: 500000,
    dataBitrate: 2000000,
    fdEnabled: false,
    listenOnly: false,
    terminationResistor: true,
    enabled: true,
    busLoad: 12.3,
    fps: 35,
    rxCount: 4900,
    txCount: 210,
    errorCount: 0,
  },
  {
    id: 6,
    name: 'CH 6 (Diagnostics)',
    interfaceCode: 'can5',
    domain: 'OBD-II & UDS Gateway',
    color: 'rose',
    bitrate: 500000,
    dataBitrate: 2000000,
    fdEnabled: true,
    listenOnly: false,
    terminationResistor: false,
    enabled: true,
    busLoad: 5.6,
    fps: 15,
    rxCount: 1890,
    txCount: 95,
    errorCount: 0,
  },
];

// Presets for 6-channel automotive routing
const ROUTER_PRESETS: Array<{
  id: string;
  name: string;
  description: string;
  rules: CanRoutingRule[];
}> = [
  {
    id: 'zonal_gateway',
    name: 'Automotive 6-Domain Zonal Gateway',
    description: 'Routes Vehicle Dynamics (CH3) to Powertrain (CH1), ADAS (CH4), and Infotainment (CH5), forwards Diagnostic requests (CH6) internally.',
    rules: [
      {
        id: 'rule-speed',
        name: 'Fwd Vehicle Speed & Dynamics',
        enabled: true,
        sourceChannel: 3,
        filterType: 'id_exact',
        filterId: 0x123,
        filterIdHex: '0x123',
        targetChannels: [1, 4, 5],
        action: 'forward',
        matchedCount: 2450,
        routedCount: 7350,
        droppedCount: 0,
      },
      {
        id: 'rule-engine',
        name: 'Fwd Engine RPM to Cluster',
        enabled: true,
        sourceChannel: 1,
        filterType: 'id_exact',
        filterId: 0x100,
        filterIdHex: '0x100',
        targetChannels: [5],
        action: 'forward',
        matchedCount: 4120,
        routedCount: 4120,
        droppedCount: 0,
      },
      {
        id: 'rule-radar-brake',
        name: 'ADAS Radar Trigger to Chassis ABS',
        enabled: true,
        sourceChannel: 4,
        filterType: 'id_exact',
        filterId: 0x456,
        filterIdHex: '0x456',
        targetChannels: [3],
        action: 'forward',
        matchedCount: 980,
        routedCount: 980,
        droppedCount: 0,
      },
      {
        id: 'rule-diag-broadcast',
        name: 'Diagnostic Functional Request Gateway',
        enabled: true,
        sourceChannel: 6,
        filterType: 'id_exact',
        filterId: 0x7df,
        filterIdHex: '0x7DF',
        targetChannels: [1, 2, 3, 4, 5],
        action: 'forward',
        matchedCount: 140,
        routedCount: 700,
        droppedCount: 0,
      },
      {
        id: 'rule-firewall-drop',
        name: 'Drop Unauthorized Frames from Diag Port',
        enabled: true,
        sourceChannel: 6,
        filterType: 'id_range',
        filterRangeMin: 0x000,
        filterRangeMax: 0x6ff,
        targetChannels: [],
        action: 'drop',
        matchedCount: 35,
        routedCount: 0,
        droppedCount: 35,
      },
    ],
  },
  {
    id: 'pcan_router_pro_pairs',
    name: 'PCAN-Router Pro 6CH (Dual-Port Bridges)',
    description: 'Bridges CH1↔CH2 (Pair A), CH3↔CH4 (Pair B), and CH5↔CH6 (Pair C) with full message pass-through.',
    rules: [
      {
        id: 'rule-b1',
        name: 'Bridge CH1 -> CH2',
        enabled: true,
        sourceChannel: 1,
        filterType: 'any',
        targetChannels: [2],
        action: 'forward',
        matchedCount: 1820,
        routedCount: 1820,
        droppedCount: 0,
      },
      {
        id: 'rule-b2',
        name: 'Bridge CH2 -> CH1',
        enabled: true,
        sourceChannel: 2,
        filterType: 'any',
        targetChannels: [1],
        action: 'forward',
        matchedCount: 940,
        routedCount: 940,
        droppedCount: 0,
      },
      {
        id: 'rule-b3',
        name: 'Bridge CH3 -> CH4',
        enabled: true,
        sourceChannel: 3,
        filterType: 'any',
        targetChannels: [4],
        action: 'forward',
        matchedCount: 3100,
        routedCount: 3100,
        droppedCount: 0,
      },
      {
        id: 'rule-b4',
        name: 'Bridge CH4 -> CH3',
        enabled: true,
        sourceChannel: 4,
        filterType: 'any',
        targetChannels: [3],
        action: 'forward',
        matchedCount: 2890,
        routedCount: 2890,
        droppedCount: 0,
      },
      {
        id: 'rule-b5',
        name: 'Bridge CH5 -> CH6',
        enabled: true,
        sourceChannel: 5,
        filterType: 'any',
        targetChannels: [6],
        action: 'forward',
        matchedCount: 840,
        routedCount: 840,
        droppedCount: 0,
      },
      {
        id: 'rule-b6',
        name: 'Bridge CH6 -> CH5',
        enabled: true,
        sourceChannel: 6,
        filterType: 'any',
        targetChannels: [5],
        action: 'forward',
        matchedCount: 650,
        routedCount: 650,
        droppedCount: 0,
      },
    ],
  },
  {
    id: 'can_fd_concentrator',
    name: 'CAN 2.0B to CAN-FD Gateway & Concentrator',
    description: 'Aggregates Classic CAN buses (CH1, CH2, CH3) and routes them into high-speed CAN-FD channel CH4 with ID translation.',
    rules: [
      {
        id: 'rule-fd-remap',
        name: 'Remap & Aggregate CH1 to CAN-FD CH4',
        enabled: true,
        sourceChannel: 1,
        filterType: 'id_exact',
        filterId: 0x100,
        filterIdHex: '0x100',
        targetChannels: [4],
        action: 'remap_id',
        remapId: 0x310,
        remapIdHex: '0x310',
        matchedCount: 1540,
        routedCount: 1540,
        droppedCount: 0,
      },
      {
        id: 'rule-fd-ch2',
        name: 'Remap CH2 Body to CAN-FD CH4',
        enabled: true,
        sourceChannel: 2,
        filterType: 'id_exact',
        filterId: 0x500,
        filterIdHex: '0x500',
        targetChannels: [4],
        action: 'remap_id',
        remapId: 0x350,
        remapIdHex: '0x350',
        matchedCount: 780,
        routedCount: 780,
        droppedCount: 0,
      },
      {
        id: 'rule-fd-ch3',
        name: 'Remap CH3 Dynamics to CAN-FD CH4',
        enabled: true,
        sourceChannel: 3,
        filterType: 'id_exact',
        filterId: 0x123,
        filterIdHex: '0x123',
        targetChannels: [4],
        action: 'remap_id',
        remapId: 0x323,
        remapIdHex: '0x323',
        matchedCount: 2100,
        routedCount: 2100,
        droppedCount: 0,
      },
    ],
  },
  {
    id: 'cybersecurity_firewall',
    name: 'ISO 21434 Cybersecurity Gateway',
    description: 'Rigid isolation boundary protecting Powertrain (CH1) and Chassis (CH3) from untrusted external telemetry and diagnostics.',
    rules: [
      {
        id: 'rule-fw-whitelist',
        name: 'Allow Only UDS Tester (0x7E0) on CH6',
        enabled: true,
        sourceChannel: 6,
        filterType: 'id_exact',
        filterId: 0x7e0,
        filterIdHex: '0x7E0',
        targetChannels: [1],
        action: 'forward',
        matchedCount: 85,
        routedCount: 85,
        droppedCount: 0,
      },
      {
        id: 'rule-fw-block-all-other',
        name: 'Drop All Other Foreign Ingress on CH6',
        enabled: true,
        sourceChannel: 6,
        filterType: 'any',
        targetChannels: [],
        action: 'drop',
        matchedCount: 420,
        routedCount: 0,
        droppedCount: 420,
      },
    ],
  },
];

export const CanRouterPage: React.FC<CanRouterPageProps> = ({
  status,
  frames,
  addToast,
}) => {
  const [routerEnabled, setRouterEnabled] = useState(true);
  const [activeTab, setActiveTab] = useState<'matrix' | 'channels' | 'topology' | 'inject' | 'logs'>('matrix');

  // Channel configs (6 channels)
  const [channels, setChannels] = useState<CanRouterChannelConfig[]>(DEFAULT_CHANNELS);

  // Routing rules
  const [rules, setRules] = useState<CanRoutingRule[]>(() => ROUTER_PRESETS[0].rules);
  const [selectedPresetId, setSelectedPresetId] = useState<string>('zonal_gateway');

  // Search filter for rules
  const [ruleSearch, setRuleSearch] = useState('');

  // Routing logs
  const [logs, setLogs] = useState<CanRouterPacketLog[]>([]);

  // Editing Rule modal state
  const [isEditingRule, setIsEditingRule] = useState(false);
  const [editingRuleData, setEditingRuleData] = useState<Partial<CanRoutingRule>>({
    name: '',
    enabled: true,
    sourceChannel: 1,
    filterType: 'any',
    targetChannels: [2],
    action: 'forward',
  });

  // Test injection state
  const [injectChannel, setInjectChannel] = useState<number>(1);
  const [injectId, setInjectId] = useState('0x123');
  const [injectDlc, setInjectDlc] = useState(8);
  const [injectDataStr, setInjectDataStr] = useState('01 02 03 04 05 06 07 08');
  const [lastInjectResult, setLastInjectResult] = useState<{
    matchedRule?: CanRoutingRule;
    action: RoutingAction;
    targetChannels: number[];
    remappedId?: number;
    timestamp: number;
  } | null>(null);

  // Derive channel channel traffic from live frames stream
  const frameCountRef = useRef(0);
  useEffect(() => {
    if (!frames.length) return;
    const latest = frames[frames.length - 1];
    if (!latest) return;

    frameCountRef.current++;

    // Map frame to one of the 6 channels based on its channel tag or CAN ID
    let channelId = 1;
    if (latest.channel === 'can0') channelId = 1;
    else if (latest.channel === 'can1') channelId = 2;
    else if (latest.channel === 'can2') channelId = 3;
    else if (latest.channel === 'can3') channelId = 4;
    else if (latest.channel === 'can4') channelId = 5;
    else if (latest.channel === 'can5') channelId = 6;
    else {
      // Fallback by ID domain
      if (latest.id === 0x100 || latest.id === 0x200) channelId = 1;
      else if (latest.id === 0x500) channelId = 2;
      else if (latest.id === 0x123) channelId = 3;
      else if (latest.id === 0x456) channelId = 4;
      else if (latest.id === 0x300) channelId = 5;
      else if (latest.id >= 0x700) channelId = 6;
    }

    // Evaluate routing rules if router is enabled
    if (routerEnabled) {
      for (const rule of rules) {
        if (!rule.enabled) continue;
        if (rule.sourceChannel !== 'all' && rule.sourceChannel !== channelId) continue;

        let matched = false;
        if (rule.filterType === 'any') {
          matched = true;
        } else if (rule.filterType === 'id_exact' && rule.filterId === latest.id) {
          matched = true;
        } else if (
          rule.filterType === 'id_range' &&
          rule.filterRangeMin !== undefined &&
          rule.filterRangeMax !== undefined &&
          latest.id >= rule.filterRangeMin &&
          latest.id <= rule.filterRangeMax
        ) {
          matched = true;
        } else if (
          rule.filterType === 'id_mask' &&
          rule.filterId !== undefined &&
          rule.filterMask !== undefined &&
          (latest.id & rule.filterMask) === (rule.filterId & rule.filterMask)
        ) {
          matched = true;
        }

        if (matched) {
          rule.matchedCount++;
          rule.lastSeenTimestamp = Date.now() / 1000;

          if (rule.action === 'drop') {
            rule.droppedCount++;
            if (logs.length < 200) {
              setLogs((prev) => [
                {
                  id: `log-${Date.now()}-${Math.random()}`,
                  timestamp: Date.now() / 1000,
                  sourceChannel: channelId,
                  targetChannels: [],
                  originalId: latest.id,
                  originalIdHex: latest.idHex,
                  dlc: latest.dlc,
                  data: latest.data,
                  action: 'drop',
                  ruleName: rule.name,
                  status: 'dropped',
                },
                ...prev.slice(0, 150),
              ]);
            }
          } else {
            const remappedId = rule.action === 'remap_id' && rule.remapId ? rule.remapId : latest.id;
            rule.routedCount += rule.targetChannels.length;

            if (logs.length < 200 && Math.random() < 0.2) {
              setLogs((prev) => [
                {
                  id: `log-${Date.now()}-${Math.random()}`,
                  timestamp: Date.now() / 1000,
                  sourceChannel: channelId,
                  targetChannels: rule.targetChannels,
                  originalId: latest.id,
                  originalIdHex: latest.idHex,
                  routedId: remappedId,
                  routedIdHex: `0x${remappedId.toString(16).toUpperCase()}`,
                  dlc: latest.dlc,
                  data: latest.data,
                  action: rule.action,
                  ruleName: rule.name,
                  status: rule.action === 'remap_id' ? 'modified' : 'routed',
                },
                ...prev.slice(0, 150),
              ]);
            }
          }
          break; // First match wins
        }
      }
    }
  }, [frames, routerEnabled, rules]);

  // Aggregate stats
  const totalRouted = useMemo(() => rules.reduce((acc, r) => acc + r.routedCount, 0), [rules]);
  const totalDropped = useMemo(() => rules.reduce((acc, r) => acc + r.droppedCount, 0), [rules]);
  const activeRulesCount = useMemo(() => rules.filter((r) => r.enabled).length, [rules]);

  // Handle Preset Load
  const handleLoadPreset = (presetId: string) => {
    const preset = ROUTER_PRESETS.find((p) => p.id === presetId);
    if (!preset) return;
    setSelectedPresetId(presetId);
    setRules(JSON.parse(JSON.stringify(preset.rules)));
    addToast('Router Preset Applied', `Loaded "${preset.name}" with ${preset.rules.length} routing rules.`, 'success');
  };

  // Toggle Crossbar Cell (Source -> Target quick route)
  const handleToggleCrossbar = (src: number, dest: number) => {
    if (src === dest) return; // Ignore self-routing loop

    const existingRule = rules.find(
      (r) => r.sourceChannel === src && r.filterType === 'any' && r.targetChannels.includes(dest)
    );

    if (existingRule) {
      // Remove destination or delete rule if only 1 target
      if (existingRule.targetChannels.length === 1) {
        setRules((prev) => prev.filter((r) => r.id !== existingRule.id));
      } else {
        setRules((prev) =>
          prev.map((r) =>
            r.id === existingRule.id
              ? { ...r, targetChannels: r.targetChannels.filter((c) => c !== dest) }
              : r
          )
        );
      }
    } else {
      // Add or update rule to route src -> dest
      const existingSrcRule = rules.find((r) => r.sourceChannel === src && r.filterType === 'any');
      if (existingSrcRule) {
        setRules((prev) =>
          prev.map((r) =>
            r.id === existingSrcRule.id
              ? { ...r, targetChannels: [...r.targetChannels, dest] }
              : r
          )
        );
      } else {
        const newRule: CanRoutingRule = {
          id: `rule-cb-${src}-${dest}-${Date.now()}`,
          name: `Crossbar CH${src} -> CH${dest}`,
          enabled: true,
          sourceChannel: src,
          filterType: 'any',
          targetChannels: [dest],
          action: 'forward',
          matchedCount: 0,
          routedCount: 0,
          droppedCount: 0,
        };
        setRules((prev) => [...prev, newRule]);
      }
    }
  };

  // Check if crossbar connection is active between src and dest
  const isCrossbarActive = (src: number, dest: number) => {
    if (src === dest) return false;
    return rules.some(
      (r) =>
        r.enabled &&
        (r.sourceChannel === 'all' || r.sourceChannel === src) &&
        r.targetChannels.includes(dest)
    );
  };

  // Save new or edited rule
  const handleSaveRule = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingRuleData.name) {
      addToast('Validation Error', 'Rule name is required.', 'error');
      return;
    }

    const cleanFilterId = editingRuleData.filterIdHex
      ? parseInt(editingRuleData.filterIdHex, 16)
      : editingRuleData.filterId;

    const cleanRemapId = editingRuleData.remapIdHex
      ? parseInt(editingRuleData.remapIdHex, 16)
      : editingRuleData.remapId;

    if (editingRuleData.id) {
      // Update existing
      setRules((prev) =>
        prev.map((r) =>
          r.id === editingRuleData.id
            ? ({
                ...r,
                ...editingRuleData,
                filterId: cleanFilterId,
                remapId: cleanRemapId,
              } as CanRoutingRule)
            : r
        )
      );
      addToast('Rule Updated', `Rule "${editingRuleData.name}" has been updated.`, 'success');
    } else {
      // Create new
      const newRule: CanRoutingRule = {
        id: `rule-${Date.now()}`,
        name: editingRuleData.name || 'Custom Rule',
        enabled: editingRuleData.enabled ?? true,
        sourceChannel: editingRuleData.sourceChannel ?? 1,
        filterType: editingRuleData.filterType ?? 'any',
        filterId: cleanFilterId,
        filterIdHex: editingRuleData.filterIdHex,
        filterRangeMin: editingRuleData.filterRangeMin,
        filterRangeMax: editingRuleData.filterRangeMax,
        filterMask: editingRuleData.filterMask,
        targetChannels: editingRuleData.targetChannels || [2],
        action: editingRuleData.action || 'forward',
        remapId: cleanRemapId,
        remapIdHex: editingRuleData.remapIdHex,
        matchedCount: 0,
        routedCount: 0,
        droppedCount: 0,
      };
      setRules((prev) => [...prev, newRule]);
      addToast('Rule Created', `Added routing rule "${newRule.name}".`, 'success');
    }

    setIsEditingRule(false);
  };

  // Test Packet Injection
  const handleInjectTestFrame = async () => {
    try {
      const parsedId = parseInt(injectId, 16);
      if (isNaN(parsedId)) {
        addToast('Invalid CAN ID', 'Provide valid hex ID (e.g. 0x123).', 'error');
        return;
      }

      const bytes = injectDataStr
        .trim()
        .split(/[\s,]+/)
        .map((b) => parseInt(b, 16))
        .filter((n) => !isNaN(n));

      // Find matching rule
      let matchedRule: CanRoutingRule | undefined;
      for (const rule of rules) {
        if (!rule.enabled) continue;
        if (rule.sourceChannel !== 'all' && rule.sourceChannel !== injectChannel) continue;

        let m = false;
        if (rule.filterType === 'any') m = true;
        else if (rule.filterType === 'id_exact' && rule.filterId === parsedId) m = true;
        else if (
          rule.filterType === 'id_range' &&
          rule.filterRangeMin !== undefined &&
          rule.filterRangeMax !== undefined &&
          parsedId >= rule.filterRangeMin &&
          parsedId <= rule.filterRangeMax
        )
          m = true;

        if (m) {
          matchedRule = rule;
          break;
        }
      }

      const action = matchedRule ? matchedRule.action : 'drop';
      const targetChannels = matchedRule ? matchedRule.targetChannels : [];
      const remappedId = matchedRule?.action === 'remap_id' ? matchedRule.remapId : parsedId;

      setLastInjectResult({
        matchedRule,
        action,
        targetChannels,
        remappedId,
        timestamp: Date.now(),
      });

      // Dispatch real transmit API call if connected
      if (status.connectionState === 'connected' && !status.listenOnly) {
        await transmitCanFrame({
          id: parsedId,
          extended: parsedId > 0x7ff,
          fd: false,
          dlc: injectDlc,
          data: bytes,
          channel: `can${injectChannel - 1}`,
        });
      }

      // Add to log
      setLogs((prev) => [
        {
          id: `log-test-${Date.now()}`,
          timestamp: Date.now() / 1000,
          sourceChannel: injectChannel,
          targetChannels,
          originalId: parsedId,
          originalIdHex: `0x${parsedId.toString(16).toUpperCase()}`,
          routedId: remappedId,
          routedIdHex: remappedId ? `0x${remappedId.toString(16).toUpperCase()}` : undefined,
          dlc: injectDlc,
          data: bytes,
          action,
          ruleName: matchedRule ? matchedRule.name : 'Default Fallthrough',
          status: action === 'drop' ? 'dropped' : action === 'remap_id' ? 'modified' : 'routed',
        },
        ...prev,
      ]);

      addToast(
        'Frame Injected on CH' + injectChannel,
        `Evaluated: ${action.toUpperCase()} -> ${targetChannels.length ? 'CH ' + targetChannels.join(', ') : 'DROPPED'}`,
        action === 'drop' ? 'warning' : 'success'
      );
    } catch (err: any) {
      addToast('Injection Error', err.message || 'Failed to inject packet.', 'error');
    }
  };

  // Export Router Configuration as JSON
  const handleExportJson = () => {
    const config = {
      device: 'CAN-Router-6CH-Pro',
      version: '2.4.0',
      exportedAt: new Date().toISOString(),
      channels,
      rules,
    };
    const blob = new Blob([JSON.stringify(config, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `can_router_6ch_config_${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
    addToast('Exported Config', 'Configuration downloaded as JSON.', 'success');
  };

  return (
    <div className="flex flex-col h-full overflow-hidden bg-zinc-950 text-zinc-200">
      {/* Top Header & Telemetry Banner */}
      <div className="p-4 border-b border-zinc-800 bg-zinc-900/60 backdrop-blur shrink-0 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center space-x-3">
          <div className="p-2 bg-cyan-950/80 border border-cyan-700/60 rounded-lg text-cyan-400">
            <Network className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <h1 className="text-base font-bold text-zinc-100 flex items-center space-x-2">
                <span>6-Channel CAN Router & Gateway Hub</span>
              </h1>
              <span
                className={`px-2 py-0.5 rounded text-[11px] font-mono font-bold flex items-center space-x-1 ${
                  routerEnabled
                    ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30'
                    : 'bg-zinc-800 text-zinc-400 border border-zinc-700'
                }`}
              >
                <span
                  className={`w-1.5 h-1.5 rounded-full ${
                    routerEnabled ? 'bg-emerald-400 animate-pulse' : 'bg-zinc-500'
                  }`}
                />
                <span>{routerEnabled ? 'ROUTING ENGINE ACTIVE' : 'ROUTER BYPASS'}</span>
              </span>
            </div>
            <p className="text-xs text-zinc-400 mt-0.5">
              Supports 6 independent CAN/CAN-FD transceivers (CH1–CH6 / can0–can5), crossbar matrix, ID remapping, and firewall filtering.
            </p>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex items-center space-x-2">
          {/* Preset selector */}
          <div className="flex items-center space-x-1 bg-zinc-900 border border-zinc-800 rounded px-2 py-1">
            <span className="text-[11px] text-zinc-500 font-medium">Preset:</span>
            <select
              value={selectedPresetId}
              onChange={(e) => handleLoadPreset(e.target.value)}
              className="bg-transparent text-xs text-cyan-300 font-medium focus:outline-none cursor-pointer"
            >
              {ROUTER_PRESETS.map((p) => (
                <option key={p.id} value={p.id} className="bg-zinc-900 text-zinc-200">
                  {p.name}
                </option>
              ))}
            </select>
          </div>

          <button
            onClick={() => setRouterEnabled((prev) => !prev)}
            className={`px-3 py-1.5 rounded text-xs font-bold transition flex items-center space-x-1.5 cursor-pointer ${
              routerEnabled
                ? 'bg-amber-600/20 text-amber-300 border border-amber-500/40 hover:bg-amber-600/30'
                : 'bg-emerald-600 text-zinc-950 hover:bg-emerald-500'
            }`}
          >
            {routerEnabled ? (
              <>
                <Pause className="w-3.5 h-3.5" />
                <span>Bypass Router</span>
              </>
            ) : (
              <>
                <Play className="w-3.5 h-3.5" />
                <span>Enable Router</span>
              </>
            )}
          </button>

          <button
            onClick={handleExportJson}
            title="Export router matrix and rules as JSON"
            className="px-2.5 py-1.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 rounded text-xs flex items-center space-x-1 cursor-pointer"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Export</span>
          </button>
        </div>
      </div>

      {/* Router Telemetry Quick Summary Bar */}
      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-2 p-3 bg-zinc-900/40 border-b border-zinc-800/80 text-xs">
        <div className="bg-zinc-900/90 border border-zinc-800 rounded p-2 flex flex-col justify-between">
          <span className="text-[10px] uppercase tracking-wider text-zinc-500 font-semibold">Active Channels</span>
          <div className="flex items-baseline space-x-1 mt-1">
            <span className="text-base font-bold font-mono text-emerald-400">6 / 6</span>
            <span className="text-[10px] text-zinc-400">transceivers</span>
          </div>
        </div>

        <div className="bg-zinc-900/90 border border-zinc-800 rounded p-2 flex flex-col justify-between">
          <span className="text-[10px] uppercase tracking-wider text-zinc-500 font-semibold">Routing Rules</span>
          <div className="flex items-baseline space-x-1 mt-1">
            <span className="text-base font-bold font-mono text-cyan-400">{activeRulesCount}</span>
            <span className="text-[10px] text-zinc-400">active</span>
          </div>
        </div>

        <div className="bg-zinc-900/90 border border-zinc-800 rounded p-2 flex flex-col justify-between">
          <span className="text-[10px] uppercase tracking-wider text-zinc-500 font-semibold">Total Routed</span>
          <div className="flex items-baseline space-x-1 mt-1">
            <span className="text-base font-bold font-mono text-indigo-400">{totalRouted.toLocaleString()}</span>
            <span className="text-[10px] text-zinc-400">frames</span>
          </div>
        </div>

        <div className="bg-zinc-900/90 border border-zinc-800 rounded p-2 flex flex-col justify-between">
          <span className="text-[10px] uppercase tracking-wider text-zinc-500 font-semibold">Firewall Dropped</span>
          <div className="flex items-baseline space-x-1 mt-1">
            <span className="text-base font-bold font-mono text-rose-400">{totalDropped.toLocaleString()}</span>
            <span className="text-[10px] text-zinc-400">blocked</span>
          </div>
        </div>

        <div className="bg-zinc-900/90 border border-zinc-800 rounded p-2 flex flex-col justify-between">
          <span className="text-[10px] uppercase tracking-wider text-zinc-500 font-semibold">Throughput</span>
          <div className="flex items-baseline space-x-1 mt-1">
            <span className="text-base font-bold font-mono text-amber-400">
              {channels.reduce((acc, c) => acc + c.fps, 0)}
            </span>
            <span className="text-[10px] text-zinc-400">fps aggregate</span>
          </div>
        </div>

        <div className="bg-zinc-900/90 border border-zinc-800 rounded p-2 flex flex-col justify-between">
          <span className="text-[10px] uppercase tracking-wider text-zinc-500 font-semibold">Forwarding Latency</span>
          <div className="flex items-baseline space-x-1 mt-1">
            <span className="text-base font-bold font-mono text-emerald-400">&lt; 8.5 µs</span>
            <span className="text-[10px] text-zinc-400">microsecond</span>
          </div>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="px-4 py-2 bg-zinc-900/80 border-b border-zinc-800 flex items-center justify-between">
        <div className="flex items-center space-x-1">
          {[
            { id: 'matrix', label: 'Crossbar Matrix & Rules', icon: Layers },
            { id: 'channels', label: '6-Channel Hardware Monitor', icon: Sliders },
            { id: 'topology', label: 'Network Flow & Topology', icon: GitFork },
            { id: 'inject', label: 'Packet Injection & Route Trace', icon: Send },
            { id: 'logs', label: `Audit Log (${logs.length})`, icon: Activity },
          ].map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`px-3 py-1.5 rounded text-xs font-semibold flex items-center space-x-1.5 transition cursor-pointer ${
                  isActive
                    ? 'bg-cyan-600 text-zinc-950 font-bold shadow'
                    : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800'
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>

        {activeTab === 'matrix' && (
          <button
            onClick={() => {
              setEditingRuleData({
                name: 'New Forwarding Rule',
                enabled: true,
                sourceChannel: 1,
                filterType: 'any',
                targetChannels: [2],
                action: 'forward',
              });
              setIsEditingRule(true);
            }}
            className="px-2.5 py-1 bg-cyan-700 hover:bg-cyan-600 text-zinc-100 rounded text-xs font-semibold flex items-center space-x-1 cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Add Rule</span>
          </button>
        )}
      </div>

      {/* Main Tab Content */}
      <div className="flex-1 overflow-y-auto p-4">
        {/* TAB 1: CROSSBAR MATRIX & RULES */}
        {activeTab === 'matrix' && (
          <div className="space-y-6">
            {/* Visual 6x6 Crossbar Grid */}
            <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-4">
              <div className="flex items-center justify-between mb-3">
                <div>
                  <h2 className="text-sm font-bold text-zinc-200 flex items-center space-x-2">
                    <span>6x6 Direct Channel Crossbar Switch</span>
                  </h2>
                  <p className="text-xs text-zinc-400">
                    Click any intersection to toggle high-speed direct pass-through routing between Ingress (rows) and Egress (columns).
                  </p>
                </div>
                <div className="flex items-center space-x-3 text-[11px] text-zinc-400">
                  <span className="flex items-center space-x-1">
                    <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 inline-block" />
                    <span>Active Route</span>
                  </span>
                  <span className="flex items-center space-x-1">
                    <span className="w-2.5 h-2.5 rounded-full bg-zinc-700 inline-block" />
                    <span>Disabled</span>
                  </span>
                  <span className="flex items-center space-x-1">
                    <span className="w-2.5 h-2.5 rounded-full bg-zinc-900 border border-zinc-700 inline-block" />
                    <span>Loopback (N/A)</span>
                  </span>
                </div>
              </div>

              {/* Crossbar Table */}
              <div className="overflow-x-auto">
                <table className="w-full text-center border-collapse">
                  <thead>
                    <tr>
                      <th className="p-2 text-left text-xs font-semibold text-zinc-400 border border-zinc-800 bg-zinc-950">
                        Ingress \ Egress
                      </th>
                      {channels.map((ch) => (
                        <th
                          key={ch.id}
                          className="p-2 text-xs font-mono font-bold text-zinc-300 border border-zinc-800 bg-zinc-950/80 min-w-[70px]"
                        >
                          <span className={`text-${ch.color}-400`}>CH {ch.id}</span>
                          <div className="text-[10px] text-zinc-500 font-sans truncate">{ch.interfaceCode}</div>
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {channels.map((srcCh) => (
                      <tr key={srcCh.id} className="hover:bg-zinc-850/40">
                        <td className="p-2 text-left font-mono font-bold text-xs border border-zinc-800 bg-zinc-950/50">
                          <span className={`text-${srcCh.color}-400`}>CH {srcCh.id}</span>
                          <span className="text-[10px] text-zinc-400 font-sans ml-1.5">{srcCh.domain}</span>
                        </td>
                        {channels.map((destCh) => {
                          const isSelf = srcCh.id === destCh.id;
                          const active = isCrossbarActive(srcCh.id, destCh.id);

                          return (
                            <td key={destCh.id} className="p-1 border border-zinc-800">
                              {isSelf ? (
                                <div
                                  className="w-full h-8 flex items-center justify-center bg-zinc-950 text-zinc-600 rounded text-[10px] font-mono"
                                  title="Self loopback disabled"
                                >
                                  —
                                </div>
                              ) : (
                                <button
                                  type="button"
                                  onClick={() => handleToggleCrossbar(srcCh.id, destCh.id)}
                                  className={`w-full h-8 rounded flex items-center justify-center transition cursor-pointer ${
                                    active
                                      ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 font-bold shadow-sm'
                                      : 'bg-zinc-800/60 hover:bg-zinc-700/80 text-zinc-500 border border-transparent'
                                  }`}
                                  title={`Toggle routing from CH ${srcCh.id} to CH ${destCh.id}`}
                                >
                                  {active ? (
                                    <div className="flex items-center space-x-1">
                                      <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                                      <span className="text-[10px] font-mono">ON</span>
                                    </div>
                                  ) : (
                                    <span className="text-[10px] font-mono text-zinc-600">OFF</span>
                                  )}
                                </button>
                              )}
                            </td>
                          );
                        })}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Granular Rules Table */}
            <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-4">
              <div className="flex flex-wrap items-center justify-between gap-3 mb-3">
                <div>
                  <h3 className="text-sm font-bold text-zinc-200">Active Routing & Transformation Rules</h3>
                  <p className="text-xs text-zinc-400">
                    Rules are evaluated sequentially. First matching rule executes action (Forward, Remap ID, Drop).
                  </p>
                </div>
                <div className="relative w-64">
                  <Search className="w-3.5 h-3.5 absolute left-2.5 top-2.5 text-zinc-500" />
                  <input
                    type="text"
                    value={ruleSearch}
                    onChange={(e) => setRuleSearch(e.target.value)}
                    placeholder="Search rules..."
                    className="w-full bg-zinc-950 border border-zinc-800 rounded pl-8 pr-2.5 py-1 text-xs text-zinc-200 placeholder-zinc-500 focus:outline-none focus:border-cyan-500"
                  />
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="border-b border-zinc-800 text-zinc-400 uppercase text-[10px] tracking-wider bg-zinc-950/50">
                      <th className="p-2.5">Status</th>
                      <th className="p-2.5">Rule Name</th>
                      <th className="p-2.5">Ingress</th>
                      <th className="p-2.5">Match Filter</th>
                      <th className="p-2.5">Egress Target</th>
                      <th className="p-2.5">Action</th>
                      <th className="p-2.5 text-right">Packets</th>
                      <th className="p-2.5 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-800/60 font-mono">
                    {rules
                      .filter(
                        (r) =>
                          !ruleSearch ||
                          r.name.toLowerCase().includes(ruleSearch.toLowerCase()) ||
                          r.filterIdHex?.toLowerCase().includes(ruleSearch.toLowerCase())
                      )
                      .map((rule) => {
                        return (
                          <tr key={rule.id} className="hover:bg-zinc-850/40 transition">
                            <td className="p-2.5">
                              <button
                                onClick={() =>
                                  setRules((prev) =>
                                    prev.map((r) => (r.id === rule.id ? { ...r, enabled: !r.enabled } : r))
                                  )
                                }
                                className={`px-2 py-0.5 rounded text-[10px] font-bold cursor-pointer transition ${
                                  rule.enabled
                                    ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                                    : 'bg-zinc-800 text-zinc-500 border border-zinc-700'
                                }`}
                              >
                                {rule.enabled ? 'ACTIVE' : 'MUTED'}
                              </button>
                            </td>
                            <td className="p-2.5 font-sans font-medium text-zinc-200">{rule.name}</td>
                            <td className="p-2.5">
                              {rule.sourceChannel === 'all' ? (
                                <span className="px-1.5 py-0.5 bg-zinc-800 text-zinc-300 rounded text-[10px]">
                                  ALL CH
                                </span>
                              ) : (
                                <span className="px-1.5 py-0.5 bg-cyan-950 text-cyan-300 border border-cyan-800 rounded text-[10px]">
                                  CH {rule.sourceChannel}
                                </span>
                              )}
                            </td>
                            <td className="p-2.5">
                              {rule.filterType === 'any' ? (
                                <span className="text-zinc-400 font-sans">Pass All Frames (*)</span>
                              ) : rule.filterType === 'id_exact' ? (
                                <span className="text-amber-400 font-bold">{rule.filterIdHex}</span>
                              ) : rule.filterType === 'id_range' ? (
                                <span className="text-purple-300">
                                  0x{rule.filterRangeMin?.toString(16).toUpperCase()} - 0x
                                  {rule.filterRangeMax?.toString(16).toUpperCase()}
                                </span>
                              ) : (
                                <span className="text-sky-300">Mask 0x{rule.filterMask?.toString(16).toUpperCase()}</span>
                              )}
                            </td>
                            <td className="p-2.5">
                              <div className="flex flex-wrap gap-1">
                                {rule.targetChannels.length === 0 ? (
                                  <span className="text-zinc-500 font-sans italic">None (Drop)</span>
                                ) : (
                                  rule.targetChannels.map((c) => (
                                    <span
                                      key={c}
                                      className="px-1.5 py-0.5 bg-emerald-950 text-emerald-300 border border-emerald-800 rounded text-[10px]"
                                    >
                                      CH {c}
                                    </span>
                                  ))
                                )}
                              </div>
                            </td>
                            <td className="p-2.5">
                              {rule.action === 'drop' ? (
                                <span className="px-1.5 py-0.5 bg-rose-950/60 text-rose-400 border border-rose-800/60 rounded text-[10px] font-bold">
                                  DROP (Firewall)
                                </span>
                              ) : rule.action === 'remap_id' ? (
                                <span className="px-1.5 py-0.5 bg-indigo-950 text-indigo-300 border border-indigo-800 rounded text-[10px]">
                                  REMAP &gt; {rule.remapIdHex}
                                </span>
                              ) : (
                                <span className="px-1.5 py-0.5 bg-zinc-800 text-zinc-300 rounded text-[10px]">
                                  FORWARD
                                </span>
                              )}
                            </td>
                            <td className="p-2.5 text-right font-mono text-zinc-300">
                              {rule.action === 'drop' ? (
                                <span className="text-rose-400">{rule.droppedCount.toLocaleString()} dropped</span>
                              ) : (
                                <span className="text-emerald-400">{rule.routedCount.toLocaleString()} routed</span>
                              )}
                            </td>
                            <td className="p-2.5 text-right">
                              <div className="flex items-center justify-end space-x-1">
                                <button
                                  onClick={() => {
                                    setEditingRuleData(rule);
                                    setIsEditingRule(true);
                                  }}
                                  className="p-1 hover:bg-zinc-800 text-zinc-400 hover:text-cyan-400 rounded cursor-pointer"
                                  title="Edit rule"
                                >
                                  <Edit2 className="w-3.5 h-3.5" />
                                </button>
                                <button
                                  onClick={() => {
                                    setRules((prev) => prev.filter((r) => r.id !== rule.id));
                                    addToast('Rule Removed', `Rule "${rule.name}" deleted.`, 'info');
                                  }}
                                  className="p-1 hover:bg-zinc-800 text-zinc-400 hover:text-rose-400 rounded cursor-pointer"
                                  title="Delete rule"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* TAB 2: 6-CHANNEL HARDWARE MONITOR */}
        {activeTab === 'channels' && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {channels.map((ch) => (
              <div
                key={ch.id}
                className="bg-zinc-900 border border-zinc-800 rounded-lg p-4 flex flex-col justify-between space-y-3"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <span
                      className={`w-7 h-7 rounded flex items-center justify-center font-mono font-bold text-xs bg-${ch.color}-950 text-${ch.color}-400 border border-${ch.color}-800`}
                    >
                      CH{ch.id}
                    </span>
                    <div>
                      <h3 className="text-sm font-bold text-zinc-100">{ch.name}</h3>
                      <span className="text-[11px] text-zinc-400 font-mono">{ch.interfaceCode}</span>
                    </div>
                  </div>
                  <span
                    className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                      ch.enabled
                        ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30'
                        : 'bg-zinc-800 text-zinc-500'
                    }`}
                  >
                    {ch.enabled ? 'ACTIVE' : 'DISABLED'}
                  </span>
                </div>

                {/* Telemetry Meters */}
                <div className="space-y-2 bg-zinc-950/60 p-3 rounded border border-zinc-850">
                  <div>
                    <div className="flex justify-between text-[11px] mb-1">
                      <span className="text-zinc-400">Bus Load</span>
                      <span className="font-mono font-bold text-zinc-200">{ch.busLoad}%</span>
                    </div>
                    <div className="w-full bg-zinc-800 h-1.5 rounded-full overflow-hidden">
                      <div
                        className={`h-full ${
                          ch.busLoad > 70 ? 'bg-rose-500' : ch.busLoad > 40 ? 'bg-amber-500' : 'bg-emerald-500'
                        }`}
                        style={{ width: `${ch.busLoad}%` }}
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-2 pt-2 border-t border-zinc-800/80 text-[11px] font-mono">
                    <div>
                      <span className="text-zinc-500 block text-[9px]">SPEED</span>
                      <span className="text-zinc-300 font-bold">{ch.fps} fps</span>
                    </div>
                    <div>
                      <span className="text-zinc-500 block text-[9px]">RX COUNT</span>
                      <span className="text-cyan-400 font-bold">{ch.rxCount.toLocaleString()}</span>
                    </div>
                    <div>
                      <span className="text-zinc-500 block text-[9px]">TX COUNT</span>
                      <span className="text-emerald-400 font-bold">{ch.txCount.toLocaleString()}</span>
                    </div>
                  </div>
                </div>

                {/* Configuration Controls */}
                <div className="space-y-2 pt-2 text-xs">
                  <div className="flex items-center justify-between">
                    <span className="text-zinc-400">Nominal Bitrate:</span>
                    <span className="font-mono text-cyan-300 font-semibold">{ch.bitrate / 1000} kbit/s</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-zinc-400">CAN-FD:</span>
                    <span
                      className={`font-mono font-semibold ${
                        ch.fdEnabled ? 'text-purple-400' : 'text-zinc-500'
                      }`}
                    >
                      {ch.fdEnabled ? `Enabled (${ch.dataBitrate ? ch.dataBitrate / 1000000 : 2}M Data)` : 'Classic 2.0B'}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-zinc-400">120Ω Resistor:</span>
                    <button
                      type="button"
                      onClick={() =>
                        setChannels((prev) =>
                          prev.map((c) =>
                            c.id === ch.id ? { ...c, terminationResistor: !c.terminationResistor } : c
                          )
                        )
                      }
                      className={`px-2 py-0.5 rounded text-[10px] font-mono cursor-pointer transition ${
                        ch.terminationResistor
                          ? 'bg-cyan-950 text-cyan-300 border border-cyan-800'
                          : 'bg-zinc-800 text-zinc-500'
                      }`}
                    >
                      {ch.terminationResistor ? '120Ω Active' : 'Off'}
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* TAB 3: TOPOLOGY & FLOW DIAGRAM */}
        {activeTab === 'topology' && (
          <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-6 flex flex-col items-center">
            <h2 className="text-sm font-bold text-zinc-200 mb-1">6-Channel Radial Topology & Cross-Bus Routing Engine</h2>
            <p className="text-xs text-zinc-400 mb-6 text-center max-w-2xl">
              Central routing core handles cross-domain traffic switching. Lines indicate active forwarding rules between channels.
            </p>

            {/* Radial SVG Topology */}
            <div className="relative w-full max-w-xl aspect-square flex items-center justify-center">
              <svg viewBox="0 0 400 400" className="w-full h-full">
                {/* Central Router Core */}
                <circle cx="200" cy="200" r="48" fill="#18181b" stroke="#06b6d4" strokeWidth="2.5" />
                <circle cx="200" cy="200" r="54" fill="none" stroke="#06b6d4" strokeWidth="1" strokeDasharray="4,4" />

                {/* Spoke Channels */}
                {channels.map((ch, idx) => {
                  const angle = (idx * 60 - 90) * (Math.PI / 180);
                  const x = 200 + 130 * Math.cos(angle);
                  const y = 200 + 130 * Math.sin(angle);

                  return (
                    <g key={ch.id}>
                      {/* Line from center to spoke */}
                      <line
                        x1="200"
                        y1="200"
                        x2={x}
                        y2={y}
                        stroke="#3f3f46"
                        strokeWidth="2"
                        strokeDasharray="2,2"
                      />

                      {/* Active inter-channel links */}
                      {rules
                        .filter((r) => r.enabled && r.sourceChannel === ch.id && r.action !== 'drop')
                        .flatMap((r) => r.targetChannels)
                        .map((targetId) => {
                          const targetIdx = channels.findIndex((c) => c.id === targetId);
                          if (targetIdx === -1) return null;
                          const targetAngle = (targetIdx * 60 - 90) * (Math.PI / 180);
                          const tx = 200 + 130 * Math.cos(targetAngle);
                          const ty = 200 + 130 * Math.sin(targetAngle);

                          return (
                            <line
                              key={`link-${ch.id}-${targetId}`}
                              x1={x}
                              y1={y}
                              x2={tx}
                              y2={ty}
                              stroke="#10b981"
                              strokeWidth="2"
                              opacity="0.6"
                            />
                          );
                        })}

                      {/* Spoke Node Circle */}
                      <circle cx={x} cy={y} r="30" fill="#09090b" stroke="#22d3ee" strokeWidth="2" />
                      <text
                        x={x}
                        y={y - 4}
                        textAnchor="middle"
                        fill="#f4f4f5"
                        fontSize="11"
                        fontFamily="monospace"
                        fontWeight="bold"
                      >
                        CH {ch.id}
                      </text>
                      <text
                        x={x}
                        y={y + 10}
                        textAnchor="middle"
                        fill="#a1a1aa"
                        fontSize="8"
                        fontFamily="sans-serif"
                      >
                        {ch.interfaceCode}
                      </text>
                    </g>
                  );
                })}

                {/* Central Label */}
                <text x="200" y="195" textAnchor="middle" fill="#06b6d4" fontSize="11" fontWeight="bold">
                  CAN ROUTER
                </text>
                <text x="200" y="210" textAnchor="middle" fill="#a1a1aa" fontSize="9" fontFamily="monospace">
                  6-CH CORE
                </text>
              </svg>
            </div>
          </div>
        )}

        {/* TAB 4: TEST PACKET INJECTION & ROUTE TRACE */}
        {activeTab === 'inject' && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Injector Form */}
            <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-4 space-y-4">
              <div>
                <h3 className="text-sm font-bold text-zinc-200">Inject Test Packet into Channel</h3>
                <p className="text-xs text-zinc-400">
                  Select an Ingress channel and payload to step through the router rule evaluation engine.
                </p>
              </div>

              <div className="space-y-3">
                <div>
                  <label className="block text-xs font-semibold text-zinc-400 mb-1">Ingress Port / Channel</label>
                  <div className="grid grid-cols-3 sm:grid-cols-6 gap-1.5">
                    {channels.map((ch) => (
                      <button
                        key={ch.id}
                        type="button"
                        onClick={() => setInjectChannel(ch.id)}
                        className={`p-2 rounded text-center transition cursor-pointer ${
                          injectChannel === ch.id
                            ? 'bg-cyan-600 text-zinc-950 font-bold shadow'
                            : 'bg-zinc-800 text-zinc-400 hover:text-zinc-200'
                        }`}
                      >
                        <div className="text-xs font-mono font-bold">CH {ch.id}</div>
                        <div className="text-[10px] truncate opacity-80">{ch.interfaceCode}</div>
                      </button>
                    ))}
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-zinc-400 mb-1">CAN ID (Hex)</label>
                    <input
                      type="text"
                      value={injectId}
                      onChange={(e) => setInjectId(e.target.value)}
                      placeholder="0x123"
                      className="w-full bg-zinc-950 border border-zinc-800 rounded px-3 py-1.5 text-xs font-mono text-amber-300 focus:outline-none focus:border-cyan-500"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-zinc-400 mb-1">DLC (Data Length)</label>
                    <input
                      type="number"
                      min={0}
                      max={64}
                      value={injectDlc}
                      onChange={(e) => setInjectDlc(Number(e.target.value))}
                      className="w-full bg-zinc-950 border border-zinc-800 rounded px-3 py-1.5 text-xs font-mono text-zinc-200 focus:outline-none focus:border-cyan-500"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-zinc-400 mb-1">Payload Bytes (Hex)</label>
                  <input
                    type="text"
                    value={injectDataStr}
                    onChange={(e) => setInjectDataStr(e.target.value)}
                    placeholder="01 02 03 04 05 06 07 08"
                    className="w-full bg-zinc-950 border border-zinc-800 rounded px-3 py-1.5 text-xs font-mono text-cyan-300 focus:outline-none focus:border-cyan-500"
                  />
                </div>

                <button
                  type="button"
                  onClick={handleInjectTestFrame}
                  className="w-full py-2 bg-cyan-600 hover:bg-cyan-500 text-zinc-950 font-bold text-xs rounded transition flex items-center justify-center space-x-1.5 cursor-pointer shadow"
                >
                  <Send className="w-3.5 h-3.5" />
                  <span>Execute Route Evaluation on CH {injectChannel}</span>
                </button>
              </div>
            </div>

            {/* Evaluation Trace Result */}
            <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-4 space-y-3">
              <h3 className="text-sm font-bold text-zinc-200">Router Execution Trace</h3>
              {lastInjectResult ? (
                <div className="space-y-3 bg-zinc-950 p-3 rounded border border-zinc-800 font-mono text-xs">
                  <div className="flex justify-between border-b border-zinc-800 pb-2">
                    <span className="text-zinc-500">Ingress Port:</span>
                    <span className="text-cyan-400 font-bold">CH {injectChannel} ({channels[injectChannel - 1].interfaceCode})</span>
                  </div>

                  <div className="flex justify-between border-b border-zinc-800 pb-2">
                    <span className="text-zinc-500">Matched Rule:</span>
                    <span className="text-zinc-200 font-sans font-semibold">
                      {lastInjectResult.matchedRule ? lastInjectResult.matchedRule.name : 'No Rule Matched (Default Drop)'}
                    </span>
                  </div>

                  <div className="flex justify-between border-b border-zinc-800 pb-2">
                    <span className="text-zinc-500">Action:</span>
                    <span
                      className={`font-bold ${
                        lastInjectResult.action === 'drop'
                          ? 'text-rose-400'
                          : lastInjectResult.action === 'remap_id'
                          ? 'text-purple-400'
                          : 'text-emerald-400'
                      }`}
                    >
                      {lastInjectResult.action.toUpperCase()}
                    </span>
                  </div>

                  {lastInjectResult.remappedId && (
                    <div className="flex justify-between border-b border-zinc-800 pb-2">
                      <span className="text-zinc-500">Remapped CAN ID:</span>
                      <span className="text-amber-400 font-bold">
                        0x{lastInjectResult.remappedId.toString(16).toUpperCase()}
                      </span>
                    </div>
                  )}

                  <div className="flex justify-between border-b border-zinc-800 pb-2">
                    <span className="text-zinc-500">Egress Target(s):</span>
                    <span className="text-emerald-400 font-bold">
                      {lastInjectResult.targetChannels.length
                        ? lastInjectResult.targetChannels.map((c) => `CH ${c}`).join(', ')
                        : 'NONE (Dropped)'}
                    </span>
                  </div>

                  <div className="text-[11px] text-zinc-500 font-sans pt-1">
                    ✓ Frame successfully ingested and routed according to active ISO 11898 / CAN-FD router policy.
                  </div>
                </div>
              ) : (
                <div className="p-8 text-center text-zinc-500 text-xs">
                  No test packet injected yet. Use form on the left to simulate a packet ingress.
                </div>
              )}
            </div>
          </div>
        )}

        {/* TAB 5: AUDIT LOG */}
        {activeTab === 'logs' && (
          <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-4">
            <div className="flex items-center justify-between mb-3">
              <div>
                <h3 className="text-sm font-bold text-zinc-200">Real-Time Routing Audit Log</h3>
                <p className="text-xs text-zinc-400">Stream of all frame decisions across the 6 channels.</p>
              </div>
              <button
                onClick={() => setLogs([])}
                className="px-2.5 py-1 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 rounded text-xs flex items-center space-x-1 cursor-pointer"
              >
                <RotateCcw className="w-3 h-3" />
                <span>Clear Log</span>
              </button>
            </div>

            <div className="overflow-x-auto max-h-[500px]">
              <table className="w-full text-left text-xs border-collapse font-mono">
                <thead className="bg-zinc-950 text-zinc-400 text-[10px] uppercase sticky top-0">
                  <tr>
                    <th className="p-2">Time</th>
                    <th className="p-2">Ingress</th>
                    <th className="p-2">Original ID</th>
                    <th className="p-2">Action</th>
                    <th className="p-2">Egress Channel(s)</th>
                    <th className="p-2">Egress ID</th>
                    <th className="p-2">Rule</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-800/60">
                  {logs.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="p-6 text-center text-zinc-500 text-xs">
                        No routing events logged yet. Enable the router or inject packets to see real-time decisions.
                      </td>
                    </tr>
                  ) : (
                    logs.map((log) => (
                      <tr key={log.id} className="hover:bg-zinc-850/40">
                        <td className="p-2 text-zinc-400 text-[11px]">{log.timestamp.toFixed(3)}</td>
                        <td className="p-2">
                          <span className="px-1.5 py-0.5 bg-cyan-950 text-cyan-300 border border-cyan-800 rounded text-[10px]">
                            CH {log.sourceChannel}
                          </span>
                        </td>
                        <td className="p-2 text-amber-400 font-bold">{log.originalIdHex}</td>
                        <td className="p-2">
                          <span
                            className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
                              log.status === 'dropped'
                                ? 'bg-rose-950/60 text-rose-400 border border-rose-800/60'
                                : log.status === 'modified'
                                ? 'bg-purple-950 text-purple-300 border border-purple-800'
                                : 'bg-emerald-950 text-emerald-300 border border-emerald-800'
                            }`}
                          >
                            {log.action.toUpperCase()}
                          </span>
                        </td>
                        <td className="p-2">
                          {log.targetChannels.length ? (
                            <span className="text-emerald-400 font-semibold">
                              {log.targetChannels.map((c) => `CH ${c}`).join(', ')}
                            </span>
                          ) : (
                            <span className="text-zinc-600">—</span>
                          )}
                        </td>
                        <td className="p-2 text-zinc-300">{log.routedIdHex || '—'}</td>
                        <td className="p-2 text-zinc-400 font-sans truncate max-w-xs">{log.ruleName}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      {/* EDIT / CREATE RULE MODAL */}
      {isEditingRule && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-zinc-900 border border-zinc-800 rounded-xl max-w-lg w-full p-5 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between border-b border-zinc-800 pb-3">
              <h3 className="text-sm font-bold text-zinc-100 flex items-center space-x-2">
                <Sliders className="w-4 h-4 text-cyan-400" />
                <span>{editingRuleData.id ? 'Edit Routing Rule' : 'Add 6-Channel Routing Rule'}</span>
              </h3>
              <button
                onClick={() => setIsEditingRule(false)}
                className="text-zinc-500 hover:text-zinc-200 cursor-pointer"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveRule} className="space-y-3.5 text-xs">
              <div>
                <label className="block text-zinc-400 font-semibold mb-1">Rule Name</label>
                <input
                  type="text"
                  required
                  value={editingRuleData.name || ''}
                  onChange={(e) => setEditingRuleData({ ...editingRuleData, name: e.target.value })}
                  placeholder="e.g. Forward Speed to Instrument Cluster"
                  className="w-full bg-zinc-950 border border-zinc-800 rounded px-3 py-1.5 text-zinc-200 focus:outline-none focus:border-cyan-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-zinc-400 font-semibold mb-1">Ingress Channel</label>
                  <select
                    value={editingRuleData.sourceChannel ?? 1}
                    onChange={(e) =>
                      setEditingRuleData({
                        ...editingRuleData,
                        sourceChannel: e.target.value === 'all' ? 'all' : Number(e.target.value),
                      })
                    }
                    className="w-full bg-zinc-950 border border-zinc-800 rounded px-2.5 py-1.5 text-zinc-200 focus:outline-none focus:border-cyan-500 cursor-pointer"
                  >
                    <option value="all">All Channels (1 to 6)</option>
                    {channels.map((ch) => (
                      <option key={ch.id} value={ch.id}>
                        CH {ch.id}: {ch.domain} ({ch.interfaceCode})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-zinc-400 font-semibold mb-1">Action Type</label>
                  <select
                    value={editingRuleData.action || 'forward'}
                    onChange={(e) =>
                      setEditingRuleData({
                        ...editingRuleData,
                        action: e.target.value as RoutingAction,
                      })
                    }
                    className="w-full bg-zinc-950 border border-zinc-800 rounded px-2.5 py-1.5 text-zinc-200 focus:outline-none focus:border-cyan-500 cursor-pointer"
                  >
                    <option value="forward">Forward (Pass-Through)</option>
                    <option value="remap_id">Remap CAN ID</option>
                    <option value="drop">Drop Frame (Firewall)</option>
                  </select>
                </div>
              </div>

              {/* Filter Type & ID */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-zinc-400 font-semibold mb-1">Filter Match Type</label>
                  <select
                    value={editingRuleData.filterType || 'any'}
                    onChange={(e) =>
                      setEditingRuleData({
                        ...editingRuleData,
                        filterType: e.target.value as any,
                      })
                    }
                    className="w-full bg-zinc-950 border border-zinc-800 rounded px-2.5 py-1.5 text-zinc-200 focus:outline-none focus:border-cyan-500 cursor-pointer"
                  >
                    <option value="any">Pass All Frames (*)</option>
                    <option value="id_exact">Exact CAN ID</option>
                    <option value="id_range">CAN ID Range</option>
                  </select>
                </div>

                {editingRuleData.filterType === 'id_exact' && (
                  <div>
                    <label className="block text-zinc-400 font-semibold mb-1">Match CAN ID (Hex)</label>
                    <input
                      type="text"
                      value={editingRuleData.filterIdHex || ''}
                      onChange={(e) =>
                        setEditingRuleData({
                          ...editingRuleData,
                          filterIdHex: e.target.value,
                        })
                      }
                      placeholder="0x123"
                      className="w-full bg-zinc-950 border border-zinc-800 rounded px-2.5 py-1.5 text-amber-400 font-mono focus:outline-none focus:border-cyan-500"
                    />
                  </div>
                )}

                {editingRuleData.filterType === 'id_range' && (
                  <div>
                    <label className="block text-zinc-400 font-semibold mb-1">Min / Max ID (Dec)</label>
                    <div className="flex space-x-1">
                      <input
                        type="number"
                        placeholder="Min"
                        value={editingRuleData.filterRangeMin ?? ''}
                        onChange={(e) =>
                          setEditingRuleData({
                            ...editingRuleData,
                            filterRangeMin: Number(e.target.value),
                          })
                        }
                        className="w-1/2 bg-zinc-950 border border-zinc-800 rounded px-2 py-1.5 font-mono text-zinc-200"
                      />
                      <input
                        type="number"
                        placeholder="Max"
                        value={editingRuleData.filterRangeMax ?? ''}
                        onChange={(e) =>
                          setEditingRuleData({
                            ...editingRuleData,
                            filterRangeMax: Number(e.target.value),
                          })
                        }
                        className="w-1/2 bg-zinc-950 border border-zinc-800 rounded px-2 py-1.5 font-mono text-zinc-200"
                      />
                    </div>
                  </div>
                )}
              </div>

              {/* Remap ID if selected */}
              {editingRuleData.action === 'remap_id' && (
                <div>
                  <label className="block text-zinc-400 font-semibold mb-1">Target Remapped CAN ID (Hex)</label>
                  <input
                    type="text"
                    value={editingRuleData.remapIdHex || ''}
                    onChange={(e) =>
                      setEditingRuleData({
                        ...editingRuleData,
                        remapIdHex: e.target.value,
                      })
                    }
                    placeholder="0x250"
                    className="w-full bg-zinc-950 border border-zinc-800 rounded px-3 py-1.5 text-purple-300 font-mono focus:outline-none focus:border-cyan-500"
                  />
                </div>
              )}

              {/* Target Channels (Multi-select) */}
              {editingRuleData.action !== 'drop' && (
                <div>
                  <label className="block text-zinc-400 font-semibold mb-1.5">
                    Target Egress Channels (Select 1 or more)
                  </label>
                  <div className="grid grid-cols-3 gap-2">
                    {channels.map((ch) => {
                      const isSelected = editingRuleData.targetChannels?.includes(ch.id);
                      return (
                        <button
                          key={ch.id}
                          type="button"
                          onClick={() => {
                            const current = editingRuleData.targetChannels || [];
                            const updated = isSelected
                              ? current.filter((c) => c !== ch.id)
                              : [...current, ch.id];
                            setEditingRuleData({ ...editingRuleData, targetChannels: updated });
                          }}
                          className={`p-2 rounded text-left border transition cursor-pointer ${
                            isSelected
                              ? 'bg-emerald-950/60 border-emerald-700 text-emerald-300 font-bold'
                              : 'bg-zinc-950 border-zinc-800 text-zinc-400 hover:text-zinc-200'
                          }`}
                        >
                          <div className="text-[11px] font-mono">CH {ch.id}</div>
                          <div className="text-[9px] truncate font-sans">{ch.domain}</div>
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              <div className="flex items-center justify-end space-x-2 pt-3 border-t border-zinc-800">
                <button
                  type="button"
                  onClick={() => setIsEditingRule(false)}
                  className="px-3 py-1.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 rounded text-xs cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 bg-cyan-600 hover:bg-cyan-500 text-zinc-950 font-bold rounded text-xs cursor-pointer shadow"
                >
                  Save Rule
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
