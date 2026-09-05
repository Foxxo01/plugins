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
        const setProtoFields = (obj, fields, value) => {
          fields.forEach((field) => {
            try {
              Object.getPrototypeOf(obj)[field] = value;
            } catch (e) {
            }
          });
        };
        let permissionProps = {};
        try {
          const rawProps = PermissionStore.getGuildPermissionProps({ id: "0" }) || {};
          permissionProps = Object.fromEntries(Object.keys(rawProps).map((key) => [key, true]));
        } catch (e) {
          permissionProps = { ADMINISTRATOR: true, ADMIN: true };
        }
        setProtoFields(PermissionStore, ["getGuildPermissions", "getChannelPermissions", "computePermissions", "computeBasicPermissions"], () => BigInt(~0));
        setProtoFields(PermissionStore, ["getGuildPermissionProps"], (guild) => ({ ...permissionProps, guild }));
        setProtoFields(PermissionStore, ["can", "canAccessGuildSettings", "canAccessMemberSafetyPage", "canBasicChannel", "canImpersonateRole", "canManageUser", "canWithPartialContext", "isRoleHigher"], () => true);
        if (typeof PermissionStore.emitChange === "function")
          PermissionStore.emitChange();
      }
      if (GuildStore && UserStore) {
        const applyOwnerOverride = () => {
          const guildsObj = GuildStore.getGuilds?.() || {};
          const guildsArray = GuildStore.getGuildsArray?.() || Object.values(guildsObj);
          const currentUser = UserStore.getCurrentUser?.();
          if (guildsArray && currentUser) {
            guildsArray.forEach((g) => {
              if (g)
                g.ownerId = currentUser.id;
            });
          }
        };
        if (typeof GuildStore.addChangeListener === "function") {
          GuildStore.addChangeListener(applyOwnerOverride);
          unpatches.push(() => {
            try {
              GuildStore.removeChangeListener(applyOwnerOverride);
            } catch (e) {
            }
          });
        }
        applyOwnerOverride();
        if (typeof GuildStore.emitChange === "function")
          GuildStore.emitChange();
      }
      if (UserProfileStore && UserStore) {
        const originalGetUserProfile = UserProfileStore.getUserProfile;
        UserProfileStore.getUserProfile = function(userId) {
          const profile = originalGetUserProfile.apply(this, arguments);
          const currentUser = UserStore.getCurrentUser();
          if (profile && userId === currentUser?.id) {
            if (!profile.badges)
              profile.badges = [];
            const customBadges = [
              { id: "staff", description: "Discord Personeli", icon: "5e74e9b61934fc1f67c65515d1f7e60d", link: "https://discord.com/company" },
              { id: "bug_hunter", description: "Discord Bug Hunter", icon: "2717692c7dca7289b35297368a940dd0", link: "https://support.discord.com" }
            ];
            customBadges.forEach((badge) => {
              if (!profile.badges.some((b) => b.id === badge.id)) {
                profile.badges.unshift(badge);
              }
            });
          }
          return profile;
        };
        unpatches.push(() => {
          UserProfileStore.getUserProfile = originalGetUserProfile;
        });
      }
    } catch (e) {
    }
  },
  onUnload: () => {
    for (const unpatch of unpatches) {
      try {
        unpatch();
      } catch (e) {
      }
    }
  }
};
module.exports = exports.default || module.exports;
