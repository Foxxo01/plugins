import { patcher, webpack } from "@vendetta";
import { storage } from "@vendetta/plugin";
import Settings from "./Settings";

let unpatches = [];

export default {
  onLoad: () => {
    try {
      const GuildStore = webpack.findByProps("getGuild", "getGuilds");
      const Dispatcher = webpack.findByProps("dispatch", "subscribe");

      const modifyGuild = (guild) => {
        const targetId = storage?.targetGuildId;
        if (guild && targetId && guild.id === targetId) {
          const boost = storage?.boostCount ?? 999;
          guild.premiumSubscriptionCount = boost;
          guild.premiumTier = boost >= 14 ? 3 : boost >= 7 ? 2 : boost >= 2 ? 1 : 0;
          guild.approximateMemberCount = storage?.memberCount ?? 50000;
          guild.approximatePresenceCount = storage?.onlineCount ?? 12500;
        }
      };

      if (GuildStore) {
        unpatches.push(
          patcher.after("getGuild", GuildStore, (args, guild) => {
            if (guild) modifyGuild(guild);
            return guild;
          })
        );
      }

      if (Dispatcher) {
        const handleDispatch = (cmd) => {
          if (cmd?.type === "GUILD_CREATE" || cmd?.type === "GUILD_UPDATE") {
            if (cmd?.guild) modifyGuild(cmd.guild);
          }
        };

        Dispatcher.subscribe("GUILD_CREATE", handleDispatch);
        Dispatcher.subscribe("GUILD_UPDATE", handleDispatch);

        unpatches.push(() => {
          Dispatcher.unsubscribe("GUILD_CREATE", handleDispatch);
          Dispatcher.unsubscribe("GUILD_UPDATE", handleDispatch);
        });
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
