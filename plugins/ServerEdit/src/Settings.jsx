import { React } from "@vendetta/metro/common";
import { storage } from "@vendetta/plugin";
import { Forms } from "@vendetta/ui/components";

const { FormInput } = Forms;

export default function Settings() {
  return (
    <FormInput
      label="Target Guild ID"
      value={storage.targetGuildId ?? ""}
      onChange={(v) => {
        storage.targetGuildId = v;
      }}
      placeholder="Sunucu ID'si girin"
    />
  );
}
