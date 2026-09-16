import { patcher, webpack } from "@vendetta";
import { storage } from "@vendetta/plugin";
import Settings from "./Settings";

let unpatches = [];

export default {
  onLoad: () => {
    try {
      const GuildStore = webpack.findByProps("getGuild", "getGuilds");
      const GuildMemberCountStore = webpack.findByProps("getMemberCount", "getOnlineCount");

      if (GuildStore) {
        unpatches.push(
          patcher.after("getGuild", GuildStore, (args, guild) => {
            const targetId = storage?.targetGuildId;
            if (guild && targetId && guild.id === targetId) {
              guild.premiumSubscriptionCount = 999;
              guild.premiumTier = 3;
              guild.approximateMemberCount = 50000;
              guild.approximatePresenceCount = 12500;
            }
          })
        );
      }

      if (GuildMemberCountStore?.getMemberCount) {
        unpatches.push(
          patcher.after("getMemberCount", GuildMemberCountStore, (args, count) => {
            if (args[0] && args[0] === storage?.targetGuildId) return 50000;
          })
        );
      }

      if (GuildMemberCountStore?.getOnlineCount) {
        unpatches.push(
          patcher.after("getOnlineCount", GuildMemberCountStore, (args, count) => {
            if (args[0] && args[0] === storage?.targetGuildId) return 12500;
          })
        );
      }
    } catch (e) {
      console.error(e);
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
