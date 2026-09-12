import { FluxDispatcher } from "@vendetta/metro/common";
import { findByStore } from "@vendetta/metro";
import { storage } from "@vendetta/plugin";
import Settings from "./Settings";

const VoiceStateStore = findByStore("VoiceStateStore");
const UserStore = findByStore("UserStore");

export const settings: {
    soundId?: string;
    guildId?: string;
} = storage;

let lastChannelId: string | null = null;

function triggerSoundboard(channelId: string) {
    if (!settings.soundId) return;

    try {
        FluxDispatcher.dispatch({
            type: "GUILD_SOUNDBOARD_SOUND_PLAY_START",
            soundId: settings.soundId,
            soundGuildId: settings.guildId || "0",
            channelId: channelId,
        });
    } catch (e) {
        console.error("[AutoSoundboard] Play error:", e);
    }
}

function handleVoiceStateChange() {
    try {
        const currentUserId = UserStore?.getCurrentUser()?.id;
        if (!currentUserId) return;

        const currentVoiceState = VoiceStateStore?.getVoiceStateForUser(currentUserId);
        const currentChannelId = currentVoiceState?.channelId;

        if (currentChannelId && currentChannelId !== lastChannelId) {
            triggerSoundboard(currentChannelId);
        }

        lastChannelId = currentChannelId || null;
    } catch (e) {
        console.error("[AutoSoundboard] Voice state error:", e);
    }
}

export default {
    onLoad: () => {
        if (VoiceStateStore?.addChangeListener) {
            VoiceStateStore.addChangeListener(handleVoiceStateChange);
        }
    },
    onUnload: () => {
        if (VoiceStateStore?.removeChangeListener) {
            VoiceStateStore.removeChangeListener(handleVoiceStateChange);
        }
    },
    settings: Settings
};
