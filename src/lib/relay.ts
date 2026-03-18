// Relay API client — communicates with Commander agents via mur-server relay hub

import { getDataSource } from './api';

export interface RelayAgent {
  device_id: string;
  capabilities: string[];
  connected_at: string;
  last_ping: string;
}

export interface RelayStatus {
  agents: RelayAgent[];
}

export interface RelayCommandResult {
  id: string;
  success: boolean;
  data: unknown;
  error: string | null;
}

function getRelayBaseUrl(): string | null {
  const ds = getDataSource();
  if (ds === 'cloud') return 'https://mur-server.fly.dev';
  // relay only works via cloud server
  return null;
}

/** Check which Commander agents are online via the relay hub */
export async function getRelayStatus(): Promise<RelayStatus | null> {
  const base = getRelayBaseUrl();
  if (!base) return null;
  try {
    const res = await fetch(`${base}/api/v1/relay/status`, {
      signal: AbortSignal.timeout(5000),
    });
    if (!res.ok) return null;
    return await res.json();
  } catch {
    return null;
  }
}

/** Check if any Commander agent is online */
export async function isRelayAgentOnline(): Promise<boolean> {
  const status = await getRelayStatus();
  return (status?.agents?.length ?? 0) > 0;
}

/** Send a command to a Commander agent via the relay hub */
export async function relayCommand(action: string, params: Record<string, unknown>): Promise<RelayCommandResult> {
  const base = getRelayBaseUrl();
  if (!base) throw new Error('Relay only available in cloud mode');
  const res = await fetch(`${base}/api/v1/relay/command`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ action, params }),
  });
  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(`Relay command failed: ${res.status} ${text}`);
  }
  return res.json();
}
