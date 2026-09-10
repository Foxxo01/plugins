import { storage } from "@revenge/plugin";
import { logger } from "@revenge/utils";
import Settings from "./Settings";

let socket: WebSocket | null = null;
let heartbeatInterval: NodeJS.Timeout | null = null;

function connectToDiscordRPC() {
  if (socket) disconnectRPC();

  const userToken = storage.userToken; 
  const appId = storage.appId;

  if (!userToken || !appId) {
    logger.log("CustomRPC: Token veya Application ID eksik!");
    return;
  }

  socket = new WebSocket("wss://gateway.discord.gg/?v=9&encoding=json");

  socket.onopen = () => {
    logger.log("CustomRPC: Discord ağ geçidine bağlanıldı.");
  };

  socket.onmessage = (event) => {
    const packet = JSON.parse(event.data);
    const { op, d } = packet;

    if (op === 10) {
      const interval = d.heartbeat_interval;
      heartbeatInterval = setInterval(() => {
        socket?.send(JSON.stringify({ op: 1, d: null }));
      }, interval);

      sendPresenceUpdate(userToken, appId);
    }
  };

  socket.onerror = (err) => {
    logger.log(`CustomRPC Hata Oluştu: ${err.message}`);
  };

  socket.onclose = () => {
    logger.log("CustomRPC: Bağlantı kesildi.");
    cleanup();
  };
}

function sendPresenceUpdate(token: string, appId: string) {
  if (!socket || socket.readyState !== WebSocket.OPEN) return;

  const payload = {
    op: 2,
    d: {
      token: token,
      capabilities: 125,
      properties: {
        os: "Android",
        browser: "Revenge İstemcisi",
        device: "Mobil Cihaz"
      },
      presence: {
        status: "online",
        since: 0,
        activities: [
          {
            name: storage.activityName || "CustomRPC",
            type: 0,
            application_id: appId,
            details: storage.details || undefined,
            state: storage.state || undefined,
            timestamps: storage.useTimestamp ? { start: Date.now() } : undefined,
            party: storage.partySize && storage.partyMax ? {
              size: [parseInt(storage.partySize), parseInt(storage.partyMax)]
            } : undefined
          }
        ],
        afk: false
      }
    }
  };

  socket.send(JSON.stringify(payload));
  logger.log("CustomRPC: Zengin durum paneli Discord'a başarıyla iletildi!");
}

function disconnectRPC() {
  if (socket) {
    socket.close();
  }
  cleanup();
}

function cleanup() {
  if (heartbeatInterval) {
    clearInterval(heartbeatInterval);
    heartbeatInterval = null;
  }
  socket = null;
}

export default {
  onLoad() {
    logger.log("CustomRPC Modülü Başlatıldı.");
    if (storage.autoStart) {
      connectToDiscordRPC();
    }
  },
  onUnload() {
    disconnectRPC();
    logger.log("CustomRPC Durduruldu.");
  },
  updatePresence: () => {
    connectToDiscordRPC();
  },
  stopPresence: () => {
    disconnectRPC();
  },
  settingsView: Settings
};
