import { React } from "@vendetta/metro/common";
import { findByStore } from "@vendetta/metro";
import { Forms } from "@vendetta/ui/components";
import { useProxy } from "@vendetta/storage";
import { settings } from "./index";

const { FormSection, FormRow, FormText } = Forms;
const SoundboardStore = findByStore("SoundboardStore");

export default () => {
    useProxy(settings);

    const getSoundsList = () => {
        const options: { label: string; value: string; guildId: string }[] = [];
        try {
            const soundsMap = SoundboardStore?.getSounds();
            if (soundsMap && typeof soundsMap.forEach === "function") {
                soundsMap.forEach((sounds: any[], guildId: string) => {
                    if (Array.isArray(sounds)) {
                        sounds.forEach((sound: any) => {
                            options.push({
                                label: `${sound.emojiName ? sound.emojiName + " " : ""}${sound.name}`,
                                value: String(sound.soundId),
                                guildId: String(guildId)
                            });
                        });
                    }
                });
            }
        } catch (e) {
            console.error("[AutoSoundboard] Settings error:", e);
        }
        return options;
    };

    const options = getSoundsList();

    return (
        <FormSection title="Giriş Ses Paneli Seçimi">
            {options.length > 0 ? (
                options.map((opt) => (
                    <FormRow
                        key={opt.value}
                        label={opt.label}
                        subLabel={settings.soundId === opt.value ? "Seçili" : ""}
                        onPress={() => {
                            settings.soundId = opt.value;
                            settings.guildId = opt.guildId;
                        }}
                    />
                ))
            ) : (
                <FormText>Ses paneli verisi bulunamadı. Lütfen sesli bir kanala girip tekrar deneyin.</FormText>
            )}
        </FormSection>
    );
};
