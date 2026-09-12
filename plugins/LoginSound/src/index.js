import { findByStoreName } from "@vendetta/metro";
import { storage } from "@vendetta/plugin";

const VoiceStateStore = findByStoreName("VoiceStateStore");
const UserStore = findByStoreName("UserStore");
const FluxDispatcher = findByStoreName("FluxDispatcher");

let lastChannelId = null;

function triggerSoundboard(channelId) {
    if (!storage.soundId || !FluxDispatcher) return;
    try {
        FluxDispatcher.dispatch({
            type: "GUILD_SOUNDBOARD_SOUND_PLAY_START",
            soundId: String(storage.soundId),
            soundGuildId: String(storage.guildId || "0"),
            channelId: channelId,
        });
    } catch (err) {
        console.error("[LoginSound] Play error:", err);
    }
}

function handleVoiceStateChange() {
    try {
        if (!UserStore || !VoiceStateStore) return;
        const currentUserId = UserStore.getCurrentUser()?.id;
        if (!currentUserId) return;

        const currentVoiceState = VoiceStateStore.getVoiceStateForUser(currentUserId);
        const currentChannelId = currentVoiceState?.channelId;

        if (currentChannelId && currentChannelId !== lastChannelId) {
            triggerSoundboard(currentChannelId);
        }

        lastChannelId = currentChannelId || null;
    } catch (err) {
        console.error("[LoginSound] Voice error:", err);
    }
}

export default {
    onLoad: () => {
        try {
            if (VoiceStateStore && VoiceStateStore.addChangeListener) {
                VoiceStateStore.addChangeListener(handleVoiceStateChange);
            }
        } catch (e) {
            console.error("[LoginSound] onLoad error:", e);
        }
    },
    onUnload: () => {
        try {
            if (VoiceStateStore && VoiceStateStore.removeChangeListener) {
                VoiceStateStore.removeChangeListener(handleVoiceStateChange);
            }
        } catch (e) {
            console.error("[LoginSound] onUnload error:", e);
        }
    }
};
