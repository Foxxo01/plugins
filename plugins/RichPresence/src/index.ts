import { storage } from "@revenge/plugin";
import { logger } from "@revenge/utils";
import Settings from "./Settings";

let socket: WebSocket | null = null;
let heartbeatInterval: NodeJS.Timeout | null = null;

const CustomRPCControl = {
  connect() {
    if (socket) this.disconnect();

    const userToken = storage.userToken; 
    const appId = storage.appId;

    if (!userToken || !appId) {
      logger.log("CustomRPC: Token veya ID eksik!");
      return;
    }

    socket = new WebSocket("wss://gateway.discord.gg/?v=9&encoding=json");

    socket.onopen = () => {
      logger.log("CustomRPC: Bağlantı açıldı.");
    };

    socket.onmessage = (event) => {
      const packet = JSON.parse(event.data);
      const { op, d } = packet;

      if (op === 10) {
        const interval = d.heartbeat_interval;
        heartbeatInterval = setInterval(() => {
          socket?.send(JSON.stringify({ op: 1, d: null }));
        }, interval);

        this.sendUpdate(userToken, appId);
      }
    };

    socket.onerror = (err) => {
      logger.log(`CustomRPC Hata: ${err.message}`);
    };

    socket.onclose = () => {
      logger.log("CustomRPC: Bağlantı kesildi.");
      this.cleanup();
    };
  },

  sendUpdate(token: string, appId: string) {
    if (!socket || socket.readyState !== WebSocket.OPEN) return;

    const payload = {
      op: 2,
      d: {
        token: token,
        capabilities: 125,
        properties: {
          os: "Android",
          browser: "Revenge",
          device: "Mobile"
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
  },

  disconnect() {
    if (socket) {
      socket.close();
    }
    this.cleanup();
  },

  cleanup() {
    if (heartbeatInterval) {
      clearInterval(heartbeatInterval);
      heartbeatInterval = null;
    }
    socket = null;
  }
};

export const updatePresence = () => CustomRPCControl.connect();
export const stopPresence = () => CustomRPCControl.disconnect();

export default {
  onLoad() {
    if (storage.autoStart) {
      CustomRPCControl.connect();
    }
  },
  onUnload() {
    CustomRPCControl.disconnect();
  },
  settingsView: Settings
};
