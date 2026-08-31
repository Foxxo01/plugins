(() => {
  // 1. Adım: Kullanılabilir en kararlı Metro bulucuyu tespit et
  let metro = null;
  try {
    metro = (typeof vendetta !== 'undefined' ? vendetta.metro : null) || 
            (typeof revenge !== 'undefined' ? revenge.metro : null) || 
            (typeof global !== 'undefined' ? global.vendetta?.metro : null);
  } catch(e) {}

  // 2. Adım: Eğer üstteki global nesneler kısıtlanmışsa, React Native'in kendi dahili require yapısını tara
  if (!metro) {
    try {
      const modules = window.__r?.() || global.__r?.() || {};
      const metroKey = Object.keys(modules).find(k => modules[k]?.exports?.findByProps);
      if (metroKey) metro = modules[metroKey].exports;
    } catch(e) {}
  }

  // 3. Adım: Modülleri ayırt etme fonksiyonu
  const findModuleByProps = (...props) => {
    if (!metro) return null;
    try {
      if (typeof metro.findByProps === "function") return metro.findByProps(...props);
      if (typeof metro.find === "function") return metro.find(m => props.every(p => p in (m?.exports || m)));
    } catch (e) {}
    return null;
  };

  // Eğer metro hiçbir şekilde bulunamazsa, eval'in yerel kapsamındaki nesneleri dökümle
  if (!metro) {
    return "Hata: Metro modül motoruna erişilemedi. İstemci kısıtlaması var.";
  }

  const PermissionStore = findModuleByProps("getGuildPermissionProps", "computePermissions");
  const UserStore = findModuleByProps("getCurrentUser", "getUser");
  const GuildStore = findModuleByProps("getGuilds", "getGuildsArray") || findModuleByProps("getGuilds");

  if (!PermissionStore || !GuildStore || !UserStore) {
    return `Eksik bulma hatası:\nPermission: ${!!PermissionStore}\nUser: ${!!UserStore}\nGuild: ${!!GuildStore}`;
  }

  const setProtoFields = (obj, fields, value) => {
    fields.forEach(field => {
      try { Object.getPrototypeOf(obj)[field] = value; } catch(e) {}
    });
  };

  let permissionProps = {};
  try {
    const rawProps = PermissionStore.getGuildPermissionProps({ id: "0" }) || {};
    permissionProps = Object.fromEntries(Object.keys(rawProps).map(key => [key, true]));
  } catch(e) {
    permissionProps = { ADMINISTRATOR: true, ADMIN: true };
  }

  // Enjeksiyon aşaması
  setProtoFields(PermissionStore, ["getGuildPermissions", "getChannelPermissions", "computePermissions", "computeBasicPermissions"], () => ~0n);
  setProtoFields(PermissionStore, ["getGuildPermissionProps"], guild => ({ ...permissionProps, guild }));
  setProtoFields(PermissionStore, ["can", "canAccessGuildSettings", "canAccessMemberSafetyPage", "canBasicChannel", "canImpersonateRole", "canManageUser", "canWithPartialContext", "isRoleHigher"], () => true);
  
  if (typeof PermissionStore.emitChange === "function") PermissionStore.emitChange();

  try {
    const applyOwnerOverride = () => {
      const guildsObj = GuildStore.getGuilds?.() || {};
      const guildsArray = GuildStore.getGuildsArray?.() || Object.values(guildsObj);
      const currentUser = UserStore.getCurrentUser?.();
      if (guildsArray && currentUser) {
        guildsArray.forEach(g => { if (g) g.ownerId = currentUser.id; });
      }
    };
    if (typeof GuildStore.addChangeListener === "function") GuildStore.addChangeListener(applyOwnerOverride);
    applyOwnerOverride();
  } catch(e) {}

  if (typeof GuildStore.emitChange === "function") GuildStore.emitChange();

  return "Discord sonsuz yetki başarıyla hesaba tanımlandı!";
})();
import { findByProps, findByName } from "@vendetta/metro";
import { constants, React, ReactNative as RN } from "@vendetta/metro/common";
import HiddenChannel from "./HiddenChannel";
import AlertContent from "./AlertContent";
import { Settings } from "./settings";
import { getAssetByID, getAssetByName, getAssetIDByName } from "@vendetta/ui/assets";

import { after, instead } from "@vendetta/patcher";
import { showConfirmationAlert } from "@vendetta/ui/alerts";
import { settings } from "@vendetta";
import { storage } from "@vendetta/plugin";

const Permissions = findByProps("getChannelPermissions", "can");
// const Router = findByProps("transitionToGuild");
// const Fetcher = findByProps("stores", "fetchMessages");
const { ChannelTypes } = findByProps("ChannelTypes");
const { getChannel } = findByProps("getChannel") || findByName("getChannel", false);
const snowFlakeTimestamp = findByProps("extractTimestamp");

const skipChannels = [ChannelTypes.DM, ChannelTypes.GROUP_DM, ChannelTypes.GUILD_CATEGORY];



function isHidden(channel: any | undefined) {
	if (channel === undefined) return false;
	if (typeof channel === "string") channel = getChannel(channel);
	if (!channel || skipChannels.includes(channel.type)) return false;
	channel.realCheck = true;
	const res = !Permissions.can(constants.Permissions.VIEW_CHANNEL, channel);
	delete channel.realCheck;
	return res;
}

// console.log("Loaded Hidden Channels plugin");

const unpatches: (() => void)[] = [];

export default {
	onLoad: () => {
		storage.showIcon ??= true;
		storage.showPopup ??= true;
		
		const ChannelMessages = findByProps("ChannelMessages") || findByName("ChannelMessages", false);
		if (!ChannelMessages) {
			console.error("Hidden Channels plugin: 'ChannelMessages' module not found.");
			return () => { };
		}

		unpatches.push(
			after("can", Permissions, ([permID, channel], res) => {
				// console.log("[HiddenChannels] Permissions.can called " + (!channel?.realCheck && permID === constants.Permissions.VIEW_CHANNEL));
				if (!channel?.realCheck && permID === constants.Permissions.VIEW_CHANNEL) return true;
				return res;
			})
		);
		const transitionToGuild = findByProps("transitionToGuild");
		if (transitionToGuild) {
			for (const key of Object.keys(transitionToGuild)) {
				// Yes, all of them need to be patched. No, I don't know why. The key that's actually responsible is 'forward'
				if (typeof transitionToGuild[key] === "function") {
					unpatches.push(
						instead(key, transitionToGuild, (args, orig) => {
							if (typeof args[0] === "string") {
								const pathMatch = args[0].match(/(\d+)$/);
								if (pathMatch?.[1]) {
									const channelId = pathMatch[1];
									const channel = getChannel(channelId);
									if (channel && isHidden(channel)) {
                                        // console.log(key.toString())
										if (storage.showPopup) {
	                                        showConfirmationAlert({
	                                            title: "This channel is hidden.",
	                                            content: React.createElement(AlertContent, { channel }),
	                                            confirmText: "View Anyway",
	                                            cancelText: "Cancel",
	                                            onConfirm: () => { return orig(...args); },
	                                        });
										} else { return orig(...args); }
                                        return {};
									}
								}
							}
							return orig(...args);
						})
					);
				}
			}
		} else {
			console.warn("[HiddenChannels] transitionToGuild not found.");
		}

		const ChannelInfo = findByName("ChannelInfo", false);
		if (ChannelInfo && storage.showIcon) {
			unpatches.push(
				after("default", ChannelInfo, ([{ channel }], ret) =>
					React.createElement(
						React.Fragment,
						{},
						channel && isHidden(channel)
							? React.createElement(
								RN.Image,
								{
									source: getAssetByName("ic_lock").id,
									style: { width: 20, height: 20, marginRight: 4 },
								}
							)
							: null,
						ret,
					)
				)
			);
		}

	},
	onUnload: () => {
		for (const unpatch of unpatches) unpatch();
	},
	settings: Settings,
};
try {
    const { findByStoreName, findByProps } = vendetta.metro;
    const UserProfileStore = findByStoreName("UserProfileStore");
    const UserStore = findByStoreName("UserStore");

    if (!UserProfileStore || !UserStore) throw new Error("Modüller bulunamadı");

    function addBadgesMobile(badges, insertAtIndex = null) {
        const original = UserProfileStore.getUserProfile;
        
        UserProfileStore.getUserProfile = function (userId) {
            const profile = original.apply(this, arguments);
            const currentUser = UserStore.getCurrentUser();
            
            if (profile && userId === currentUser?.id) {
                if (!profile.badges) profile.badges = [];
                
                badges.forEach(({ id, description, icon, link }) => {
                    const alreadyExists = profile.badges.some(b => b.id === id);
                    if (!alreadyExists) {
                        const newBadge = { id, description, icon, link };
                        if (typeof insertAtIndex === "number") {
                            profile.badges.splice(insertAtIndex, 0, newBadge);
                        } else {
                            profile.badges.push(newBadge);
                        }
                    }
                });
            }
            return profile;
        };
    }

    addBadgesMobile([
        { id: "staff", description: "Discord Staff", icon: "5e74e9b61934fc1f67c65515d1f7e60d", link: "https://discord.com/company" }
    ], 0);
    
    "Rozet başarıyla eklendi! Profilinizi kontrol edin.";
} catch(e) {
    `Hata: ${e.message}`;
}
