/**
 * Formatting utilities for CAN data, IDs, and engineering metrics
 */

export function formatTimestamp(timestampSec: number): string {
  const date = new Date(timestampSec * 1000);
  const hours = date.getHours().toString().padStart(2, '0');
  const minutes = date.getMinutes().toString().padStart(2, '0');
  const seconds = date.getSeconds().toString().padStart(2, '0');
  const ms = date.getMilliseconds().toString().padStart(3, '0');
  return `${hours}:${minutes}:${seconds}.${ms}`;
}

export function formatIdHex(id: number, extended: boolean): string {
  const hex = id.toString(16).toUpperCase();
  const padLength = extended ? 8 : 3;
  return `0x${hex.padStart(padLength, '0')}`;
}

export function formatBytesHex(data: number[]): string {
  if (!data || data.length === 0) return '-';
  return data.map((b) => b.toString(16).padStart(2, '0').toUpperCase()).join(' ');
}

export function formatBitrate(bitrateBps: number): string {
  if (bitrateBps >= 1_000_000) {
    return `${(bitrateBps / 1_000_000).toFixed(bitrateBps % 1_000_000 === 0 ? 0 : 1)} Mbit/s`;
  }
  return `${(bitrateBps / 1_000).toFixed(0)} kbit/s`;
}

export function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

export function byteToBinary(byteVal: number): string {
  return (byteVal & 0xff).toString(2).padStart(8, '0');
}

export function byteToAscii(byteVal: number): string {
  if (byteVal >= 32 && byteVal <= 126) {
    return String.fromCharCode(byteVal);
  }
  return '.';
}

export function formatAscii(data: number[]): string {
  if (!data || data.length === 0) return '';
  return data.map((b) => (b >= 32 && b <= 126 ? String.fromCharCode(b) : '.')).join('');
}

export function formatUptime(seconds: number): string {
  const hrs = Math.floor(seconds / 3600);
  const mins = Math.floor((seconds % 3600) / 60);
  const secs = seconds % 60;
  if (hrs > 0) {
    return `${hrs}h ${mins}m ${secs}s`;
  }
  if (mins > 0) {
    return `${mins}m ${secs}s`;
  }
  return `${secs}s`;
}
