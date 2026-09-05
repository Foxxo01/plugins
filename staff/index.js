var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);

// plugins/staff/src/index.ts
var src_exports = {};
__export(src_exports, {
  default: () => src_default
});
module.exports = __toCommonJS(src_exports);
var import_metro = require("@vendetta/metro");
var unpatches = [];
var src_default = {
  onLoad: () => {
    try {
      const PermissionStore = (0, import_metro.findByProps)("getGuildPermissionProps", "computePermissions");
      const UserStore = (0, import_metro.findByProps)("getCurrentUser", "getUser") || (0, import_metro.findByStoreName)("UserStore");
      const GuildStore = (0, import_metro.findByProps)("getGuilds", "getGuildsArray") || (0, import_metro.findByStoreName)("GuildStore");
      const UserProfileStore = (0, import_metro.findByStoreName)("UserProfileStore") || (0, import_metro.findByProps)("getUserProfile");
      if (PermissionStore) {
        try {
          if (typeof PermissionStore.computePermissions === "function") {
            const origCompute = PermissionStore.computePermissions;
            PermissionStore.computePermissions = function() {
              return BigInt(~0);
            };
            unpatches.push(() => {
              PermissionStore.computePermissions = origCompute;
            });
          }
          if (typeof PermissionStore.can === "function") {
            const origCan = PermissionStore.can;
            PermissionStore.can = function() {
              return true;
            };
            unpatches.push(() => {
              PermissionStore.can = origCan;
            });
          }
        } catch (e) {
        }
      }
      if (GuildStore && UserStore) {
        try {
          const patchGuilds = () => {
            const guilds = GuildStore.getGuilds?.() || {};
            const list = Array.isArray(guilds) ? guilds : Object.values(guilds);
            const user = UserStore.getCurrentUser?.();
            if (user?.id) {
              list.forEach((g) => {
                if (g && typeof g === "object")
                  g.ownerId = user.id;
              });
            }
          };
          if (typeof GuildStore.addChangeListener === "function") {
            GuildStore.addChangeListener(patchGuilds);
            unpatches.push(() => {
              try {
                GuildStore.removeChangeListener(patchGuilds);
              } catch (e) {
              }
            });
          }
          patchGuilds();
        } catch (e) {
        }
      }
      if (UserProfileStore && UserStore) {
        try {
          const origGetProfile = UserProfileStore.getUserProfile;
          if (typeof origGetProfile === "function") {
            UserProfileStore.getUserProfile = function(userId) {
              const profile = origGetProfile.apply(this, arguments);
              try {
                const currentUser = UserStore.getCurrentUser?.();
                if (profile && currentUser?.id && userId === currentUser.id) {
                  if (!Array.isArray(profile.badges))
                    profile.badges = [];
                  const customBadges = [
                    { id: "staff", description: "Discord Staff", icon: "5e74e9b61934fc1f67c65515d1f7e60d", link: "https://discord.com/company" },
                    { id: "bug_hunter", description: "Discord Bug Hunter", icon: "2717692c7dca7289b35297368a940dd0", link: "https://support.discord.com" }
                  ];
                  customBadges.forEach((b) => {
                    if (!profile.badges.some((x) => x && x.id === b.id)) {
                      profile.badges.unshift(b);
                    }
                  });
                }
              } catch (e) {
              }
              return profile;
            };
            unpatches.push(() => {
              UserProfileStore.getUserProfile = origGetProfile;
            });
          }
        } catch (e) {
        }
      }
    } catch (e) {
    }
  },
  onUnload: () => {
    unpatches.forEach((u) => {
      try {
        u();
      } catch (e) {
      }
    });
    unpatches = [];
  }
};
module.exports = exports.default || module.exports;
