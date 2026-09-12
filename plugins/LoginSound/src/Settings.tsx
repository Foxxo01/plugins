import { React } from "@vendetta/metro/common";
import { findByStore } from "@vendetta/metro";
import { Forms } from "@vendetta/ui/components";
import { useProxy } from "@vendetta/storage";
import { settings } from "./index";

const { FormSection, FormSelect, FormText } = Forms;
const SoundboardStore = findByStore("SoundboardStore");

export default () => {
    useProxy(settings);

    const soundboardStoreData = SoundboardStore.getSounds(); 
    const options: { label: string; value: string; guildId: string }[] = [];

    if (soundboardStoreData) {
        for (const [guildId, sounds] of soundboardStoreData.entries()) {
            sounds.forEach((sound: any) => {
                options.push({
                    label: `${sound.emojiName ? sound.emojiName + " " : ""}${sound.name}`,
                    value: sound.soundId,
                    guildId: guildId
                });
            });
        }
    }

    return (
        <FormSection title="Giriş Ses Paneli Seçimi">
            {options.length > 0 ? (
                <FormSelect
                    title="Çalınacak Sesi Seç"
                    value={settings.soundId}
                    options={options.map(opt => ({ label: opt.label, value: opt.value }))}
                    onValueChange={(selectedId: string) => {
                        const selectedSound = options.find(o => o.value === selectedId);
                        settings.soundId = selectedId;
                        if (selectedSound) {
                            settings.guildId = selectedSound.guildId;
                        }
                    }}
                />
            ) : (
                <FormText>Kullanılabilir ses bulunamadı. Lütfen seslerin yüklenmesi için bir sunucu kanalına göz atın.</FormText>
            )}
        </FormSection>
    );
};
