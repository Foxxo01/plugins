import { React } from "@vendetta/metro/common";
import { patcher, webpack } from "@vendetta";
import Settings from "./Settings";

const { TextInput } = webpack.findByProps("TextInput");

let unpatches = [];

export default {
  onLoad: () => {
    try {
      const TextModule = webpack.findByByHeader ? webpack.findByHeader("Text") : webpack.findByDisplayName("Text");

      if (TextModule) {
        unpatches.push(
          patcher.after("render", TextModule, (args, res) => {
            if (!res || !res.props) return res;

            const [isEditing, setIsEditing] = React.useState(false);
            const [currentText, setCurrentText] = React.useState(() => {
              if (typeof res.props.children === "string") return res.props.children;
              if (Array.isArray(res.props.children)) return res.props.children.join("");
              return "";
            });

            if (isEditing) {
              return React.createElement(TextInput, {
                value: currentText,
                onChangeText: (val) => setCurrentText(val),
                onBlur: () => setIsEditing(false),
                onSubmitEditing: () => setIsEditing(false),
                autoFocus: true,
                style: [res.props.style, { backgroundColor: "rgba(0, 0, 0, 0.3)", borderRadius: 4, padding: 2 }]
              });
            }

            const originalOnLongPress = res.props.onLongPress;

            res.props.onLongPress = (e) => {
              setIsEditing(true);
              if (typeof originalOnLongPress === "function") {
                originalOnLongPress(e);
              }
            };

            if (currentText) {
              res.props.children = currentText;
            }

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
