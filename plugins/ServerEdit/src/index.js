import { patcher, webpack } from "@vendetta";
import { storage } from "@vendetta/plugin";
import Settings from "./Settings";

let unpatches = [];

export default {
  onLoad: () => {
    try {
      storage.lastError = null;

      const GuildStore = webpack.findByProps("getGuild", "getGuilds");

      if (!GuildStore) {
        storage.lastError = "GuildStore bulunamadı!";
        return;
      }

      unpatches.push(
        patcher.after("getGuild", GuildStore, (args, guild) => {
          try {
            const targetId = storage?.targetGuildId;
            if (guild && targetId && guild.id === targetId) {
              const boost = storage?.boostCount ?? 999;
              guild.premiumSubscriptionCount = boost;
              guild.premiumTier = boost >= 14 ? 3 : boost >= 7 ? 2 : boost >= 2 ? 1 : 0;
              guild.approximateMemberCount = storage?.memberCount ?? 50000;
              guild.approximatePresenceCount = storage?.onlineCount ?? 12500;
            }
          } catch (err) {
            storage.lastError = err.message;
          }
          return guild;
        })
      );
    } catch (e) {
      storage.lastError = e.message;
    }
  },

  onUnload: () => {
    for (const unpatch of unpatches) {
      if (typeof unpatch === "function") unpatch();
    }
    unpatches = [];
  },

  settings: Settings
};
