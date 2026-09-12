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

function triggerSoundboard(channelId: string) {
    if (!settings.soundId) return;

    FluxDispatcher.dispatch({
        type: "GUILD_SOUNDBOARD_SOUND_PLAY_START",
        soundId: settings.soundId,
        soundGuildId: settings.guildId || "0",
        channelId: channelId,
    });
}

let lastChannelId: string | null = null;

function handleVoiceStateChange() {
    const currentUserId = UserStore.getCurrentUser()?.id;
    if (!currentUserId) return;

    const currentVoiceState = VoiceStateStore.getVoiceStateForUser(currentUserId);
    const currentChannelId = currentVoiceState?.channelId;

    if (currentChannelId && currentChannelId !== lastChannelId) {
        triggerSoundboard(currentChannelId);
    }

    lastChannelId = currentChannelId;
}

export default {
    onLoad: () => {
        VoiceStateStore.addChangeListener(handleVoiceStateChange);
    },
    onUnload: () => {
        VoiceStateStore.removeChangeListener(handleVoiceStateChange);
    },
    settings: Settings
};
