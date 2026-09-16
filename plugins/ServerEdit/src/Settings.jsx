import { React, storage } from "@vendetta/metro/common";
import { Forms } from "@vendetta/ui/components";

const { FormInput } = Forms;

export default () => {
  return (
    <FormInput
      label="Target Guild ID"
      value={storage.targetGuildId ?? ""}
      onChange={(v) => (storage.targetGuildId = v)}
      placeholder="Sunucu ID'si girin"
    />
  );
};
