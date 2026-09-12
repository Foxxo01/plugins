import { React } from "@vendetta/metro/common";
import { findByStoreName } from "@vendetta/metro";
import { storage } from "@vendetta/plugin";
import { Forms } from "@vendetta/ui/components";

const { FormSection, FormRow, FormText, FormInput } = Forms;

const VoiceStateStore = findByStoreName("VoiceStateStore");
const UserStore = findByStoreName("UserStore");
const FluxDispatcher = findByStoreName("FluxDispatcher");
const SoundboardStore = findByStoreName("SoundboardStore");

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

function Settings() {
    const getSoundsList = () => {
        const options = [];
        try {
            const rawSounds = SoundboardStore?.getSounds();
            if (rawSounds && typeof rawSounds === "object") {
                Object.keys(rawSounds).forEach((gId) => {
                    const soundsArray = rawSounds[gId];
                    if (Array.isArray(soundsArray)) {
                        soundsArray.forEach((sound) => {
                            options.push({
                                label: `${sound.emojiName ? sound.emojiName + " " : ""}${sound.name}`,
                                value: String(sound.soundId),
                                guildId: String(gId)
                            });
                        });
                    }
                });
            }
        } catch (e) {
            console.error("[LoginSound] Settings error:", e);
        }
        return options;
    };

    const options = getSoundsList();

    return React.createElement(
        FormSection,
        { title: "Giriş Ses Paneli Seçimi" },
        React.createElement(FormInput, {
            label: "Özel Sound ID (Opsiyonel)",
            value: storage.soundId || "",
            onChange: (v) => (storage.soundId = v),
            placeholder: "Örn: 1069720000000000000"
        }),
        React.createElement(FormInput, {
            label: "Özel Guild ID (Opsiyonel)",
            value: storage.guildId || "",
            onChange: (v) => (storage.guildId = v),
            placeholder: "Varsayılan sesler için 0 yazın"
        }),
        options.length > 0
            ? options.map((opt) =>
                  React.createElement(FormRow, {
                      key: opt.value,
                      label: opt.label,
                      subLabel: storage.soundId === opt.value ? "✓ Seçili" : "",
                      onPress: () => {
                          storage.soundId = opt.value;
                          storage.guildId = opt.guildId;
                      }
                  })
              )
            : React.createElement(
                  FormText,
                  null,
                  "Ses listesi otomatik çekilemediyse yukarıdaki kutulara istediğin Sound ID'sini yazabilirsin."
              )
    );
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
    },
    settings: Settings
};
