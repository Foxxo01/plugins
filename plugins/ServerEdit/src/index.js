import { patcher, webpack, storage } from "@vendetta";
import Settings from "./Settings";

const GuildStore = webpack.findByProps("getGuild", "getGuilds");
const GuildMemberCountStore = webpack.findByProps("getMemberCount", "getOnlineCount") || webpack.findByProps("getMetaData");

let unpatches = [];

export default {
  onLoad: () => {
    unpatches.push(
      patcher.after("getGuild", GuildStore, (args, guild) => {
        const targetId = storage.targetGuildId;
        if (guild && targetId && guild.id === targetId) {
          guild.premiumSubscriptionCount = 999;
          guild.premiumTier = 3;
          guild.approximateMemberCount = 50000;
          guild.approximatePresenceCount = 12500;
        }
      })
    );

    if (GuildMemberCountStore) {
      if (GuildMemberCountStore.getMemberCount) {
        unpatches.push(
          patcher.after("getMemberCount", GuildMemberCountStore, (args, count) => {
            if (args[0] && args[0] === storage.targetGuildId) return 50000;
          })
        );
      }

      if (GuildMemberCountStore.getOnlineCount) {
        unpatches.push(
          patcher.after("getOnlineCount", GuildMemberCountStore, (args, count) => {
            if (args[0] && args[0] === storage.targetGuildId) return 12500;
          })
        );
      }
    }
  },

  onUnload: () => {
    for (const unpatch of unpatches) {
      unpatch();
    }
  },

  settings: Settings
};
