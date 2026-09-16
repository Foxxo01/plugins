import { React } from "@vendetta/metro/common";
import { patcher, webpack } from "@vendetta";
import Settings from "./Settings";

let unpatches = [];

export default {
  onLoad: () => {
    try {
      const TextModule = webpack.findByByHeader ? webpack.findByHeader("Text") : webpack.findByDisplayName("Text");
      const TextInputModule = webpack.findByProps("TextInput")?.TextInput || webpack.findByDisplayName("TextInput");

      if (TextModule) {
        unpatches.push(
          patcher.after("render", TextModule, (args, res) => {
            if (!res || !res.props) return res;

            const originalOnLongPress = res.props.onLongPress;

            res.props.onLongPress = (e) => {
              if (typeof originalOnLongPress === "function") {
                originalOnLongPress(e);
              }

              let currentVal = "";
              if (typeof res.props.children === "string") {
                currentVal = res.props.children;
              } else if (Array.isArray(res.props.children)) {
                currentVal = res.props.children.filter(c => typeof c === "string").join("");
              }

              const newText = prompt("Yeni metni girin:", currentVal);
              if (newText !== null && newText !== undefined) {
                res.props.children = newText;
              }
            };

            return res;
          })
        );
      }
    } catch (e) {
      console.error(e);
    }
  },

  onUnload: () => {
    for (const unpatch of unpatches) {
      if (typeof unpatch === "function") unpatch();
    }
    unpatches = [];
  },

  settings: Settings
};
