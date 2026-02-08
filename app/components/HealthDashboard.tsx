"use client";

import { useMemo } from "react";

export interface SystemHealth {
  connection: {
    status: "healthy" | "degraded" | "offline";
    wsStatus: "connected" | "disconnected" | "connecting";
    uptimeMs: number;
    lastConnected: string | null;
  };
  memory: {
    status: "healthy" | "degraded" | "offline";
    activeLayer: "redis" | "local-fs" | "in-memory";
    totalTurns: number;
    lastWriteSuccess: boolean;
  };
  audio: {
    status: "healthy" | "degraded" | "offline";
    micPermission: "granted" | "denied" | "prompt";
    micMuted: boolean;
    inputActive: boolean;
    outputActive: boolean;
  };
  logs: {
    status: "healthy" | "warning" | "critical";
    errorCount: number;
    warningCount: number;
  };
  overall: "healthy" | "degraded" | "critical" | "offline";
}

interface HealthDashboardProps {
  health: SystemHealth;
  onConnect?: () => void;
  onDisconnect?: () => void;
  compact?: boolean; // true for mobile tab, false for desktop modal
}

function formatUptime(ms: number): string {
  if (ms < 1000) return `${Math.round(ms)}ms`;
  if (ms < 60000) return `${Math.round(ms / 1000)}s`;
  return `${Math.round(ms / 60000)}m`;
}

function getStatusColor(status: string): { text: string; border: string; dot: string } {
  switch (status) {
    case "healthy":
      return {
        text: "text-green-400",
        border: "border-green-500/40",
        dot: "bg-green-400",
      };
    case "degraded":
    case "warning":
      return {
        text: "text-amber-400",
        border: "border-amber-500/40",
        dot: "bg-amber-400",
      };
    case "critical":
      return {
        text: "text-red-400",
        border: "border-red-500/40",
        dot: "bg-red-400",
      };
    case "offline":
    default:
      return {
        text: "text-white/40",
        border: "border-white/10",
        dot: "bg-white/20",
      };
  }
}

function HealthCard({
  title,
  status,
  details,
  isActive,
}: {
  title: string;
  status: string;
  details: string;
  isActive: boolean;
}) {
  const colors = getStatusColor(status);

  return (
    <div
      className={`flex-1 p-4 rounded-lg border transition-all ${colors.border} ${
        isActive ? "bg-white/5" : "bg-transparent"
      } hover:bg-white/5`}
    >
      <div className="flex items-center gap-2 mb-2">
        <div className={`w-2 h-2 rounded-full ${colors.dot} ${isActive ? "animate-pulse" : ""}`} />
        <h3 className={`text-sm font-ubuntu font-bold ${colors.text}`}>{title}</h3>
      </div>
      <p className={`text-xs font-ubuntu ${colors.text}/70`}>{details}</p>
    </div>
  );
}

export default function HealthDashboard({ health, onConnect, onDisconnect, compact = false }: HealthDashboardProps) {
  const connectionDetails = useMemo(() => {
    const isConnected = health.connection.wsStatus === "connected";
    const uptime = formatUptime(health.connection.uptimeMs);
    if (isConnected) {
      return `Connected · Uptime: ${uptime}`;
    } else if (health.connection.wsStatus === "connecting") {
      return "Connecting...";
    } else {
      return "Disconnected";
    }
  }, [health.connection]);

  const memoryDetails = useMemo(() => {
    const layers: Record<string, string> = {
      redis: "Redis",
      "local-fs": "Local FS",
      "in-memory": "In-Memory",
    };
    return `${layers[health.memory.activeLayer]} · ${health.memory.totalTurns} turns`;
  }, [health.memory]);

  const audioDetails = useMemo(() => {
    if (health.audio.micPermission === "denied") {
      return "Mic permission denied";
    }
    const active = health.audio.inputActive || health.audio.outputActive;
    const status = health.audio.micMuted ? "Muted" : active ? "Active" : "Idle";
    return status;
  }, [health.audio]);

  const logDetails = useMemo(() => {
    const total = health.logs.errorCount + health.logs.warningCount;
    if (total === 0) return "No issues";
    return `${health.logs.errorCount} errors · ${health.logs.warningCount} warnings`;
  }, [health.logs]);

  return (
    <div className={`space-y-4 ${compact ? "" : ""}`}>
      <div className={compact ? "grid grid-cols-2 gap-2" : "grid grid-cols-4 gap-3"}>
        {/* Connection card as button if callbacks provided */}
        {(onConnect || onDisconnect) ? (
          <button
            onClick={() => {
              if (health.connection.wsStatus === "connected") {
                onDisconnect?.();
              } else {
                onConnect?.();
              }
            }}
            className={`flex-1 rounded-lg border transition-all cursor-pointer ${
              compact ? "p-2" : "p-4"
            } ${
              health.connection.status === "healthy"
                ? "border-green-500/40 bg-white/5 hover:bg-white/10"
                : health.connection.status === "degraded"
                  ? "border-amber-500/40 bg-white/5 hover:bg-white/10"
                  : "border-white/10 bg-white/5 hover:bg-white/10"
            }`}
            title={`Click to ${health.connection.wsStatus === "connected" ? "disconnect" : "connect"}`}
            aria-label={`Connection status: ${connectionDetails}`}
          >
            <div className={`flex items-center gap-2 ${compact ? "mb-1" : "mb-2"}`}>
              <div
                className={`w-2 h-2 rounded-full ${
                  health.connection.status === "healthy"
                    ? "bg-green-400 animate-pulse"
                    : health.connection.status === "degraded"
                      ? "bg-amber-400"
                      : "bg-white/20"
                }`}
              />
              <h3
                className={`font-ubuntu font-bold ${
                  compact ? "text-xs" : "text-sm"
                } ${
                  health.connection.status === "healthy"
                    ? "text-green-400"
                    : health.connection.status === "degraded"
                      ? "text-amber-400"
                      : "text-white/40"
                }`}
              >
                {compact ? "Conn" : "Connection"}
              </h3>
            </div>
            <p
              className={`font-ubuntu ${
                compact ? "text-[10px]" : "text-xs"
              } ${
                health.connection.status === "healthy"
                  ? "text-green-400/70"
                  : health.connection.status === "degraded"
                    ? "text-amber-400/70"
                    : "text-white/40"
              }`}
            >
              {connectionDetails}
            </p>
          </button>
        ) : (
          <HealthCard
            title="Connection"
            status={health.connection.status}
            details={connectionDetails}
            isActive={health.connection.wsStatus === "connected"}
          />
        )}
        <HealthCard
          title="Memory"
          status={health.memory.status}
          details={memoryDetails}
          isActive={health.memory.lastWriteSuccess}
        />
        <HealthCard
          title="Audio"
          status={health.audio.status}
          details={audioDetails}
          isActive={health.audio.inputActive || health.audio.outputActive}
        />
        <HealthCard
          title="Logs"
          status={health.logs.status}
          details={logDetails}
          isActive={health.logs.errorCount > 0}
        />
      </div>
      <div className={`px-3 py-2 rounded border ${health.overall === "healthy" ? "border-green-500/20 bg-green-500/5" : health.overall === "degraded" ? "border-amber-500/20 bg-amber-500/5" : health.overall === "critical" ? "border-red-500/20 bg-red-500/5" : "border-white/10 bg-white/5"}`}>
        <p className={`text-xs font-ubuntu ${health.overall === "healthy" ? "text-green-400" : health.overall === "degraded" ? "text-amber-400" : health.overall === "critical" ? "text-red-400" : "text-white/40"}`}>
          Overall Status: <span className="font-bold">{health.overall.toUpperCase()}</span>
        </p>
      </div>
    </div>
  );
}
