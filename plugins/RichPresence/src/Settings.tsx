import { React } from "@revenge/metro/common";
import { components } from "@revenge/ui";
import { storage } from "@revenge/plugin";
import { updatePresence } from "./index";

const { ScrollView, View, Text, TextInput, Button } = components;

export default function Settings() {
  const [token, setToken] = React.useState(storage.userToken || "");
  const [appId, setAppId] = React.useState(storage.appId || "");
  const [activityName, setActivityName] = React.useState(storage.activityName || "");
  const [details, setDetails] = React.useState(storage.details || "");
  const [state, setState] = React.useState(storage.state || "");
  const [partySize, setPartySize] = React.useState(storage.partySize || "");
  const [partyMax, setPartyMax] = React.useState(storage.partyMax || "");

  const handleSaveAndApply = () => {
    storage.userToken = token;
    storage.appId = appId;
    storage.activityName = activityName;
    storage.details = details;
    storage.state = state;
    storage.partySize = partySize;
    storage.partyMax = partyMax;
    storage.autoStart = true;

    updatePresence();
  };

  return (
    <ScrollView style={{ padding: 16, backgroundColor: "#1e1f22" }}>
      <Text style={{ fontSize: 20, color: "#fff", fontWeight: "bold", marginBottom: 16 }}>Configuration</Text>
      
      <View style={{ marginBottom: 12 }}>
        <Text style={{ color: "#ff7373", marginBottom: 4 }}>Account Token</Text>
        <TextInput secureTextEntry={true} value={token} onChangeText={setToken} placeholder="Mfa.token..." style={{ backgroundColor: "#313338", color: "#fff", padding: 8, borderRadius: 4 }} />
      </View>

      <View style={{ marginBottom: 12 }}>
        <Text style={{ color: "#b5bac1", marginBottom: 4 }}>Application ID</Text>
        <TextInput value={appId} onChangeText={setAppId} placeholder="428052640740540416" style={{ backgroundColor: "#313338", color: "#fff", padding: 8, borderRadius: 4 }} />
      </View>

      <View style={{ marginBottom: 12 }}>
        <Text style={{ color: "#b5bac1", marginBottom: 4 }}>Activity Name (Custom App Name)</Text>
        <TextInput value={activityName} onChangeText={setActivityName} placeholder="Overcooked" style={{ backgroundColor: "#313338", color: "#fff", padding: 8, borderRadius: 4 }} />
      </View>

      <View style={{ marginBottom: 12 }}>
        <Text style={{ color: "#b5bac1", marginBottom: 4 }}>Details (Top Line)</Text>
        <TextInput value={details} onChangeText={setDetails} style={{ backgroundColor: "#313338", color: "#fff", padding: 8, borderRadius: 4 }} />
      </View>

      <View style={{ marginBottom: 12 }}>
        <Text style={{ color: "#b5bac1", marginBottom: 4 }}>State (Bottom Line)</Text>
        <TextInput value={state} onChangeText={setState} style={{ backgroundColor: "#313338", color: "#fff", padding: 8, borderRadius: 4 }} />
      </View>

      <View style={{ flexDirection: "row", justifyContent: "space-between", marginBottom: 20 }}>
        <View style={{ width: "48%" }}>
          <Text style={{ color: "#b5bac1", marginBottom: 4 }}>Party Size</Text>
          <TextInput value={partySize} onChangeText={setPartySize} style={{ backgroundColor: "#313338", color: "#fff", padding: 8, borderRadius: 4 }} keyboardType="numeric" />
        </View>
        <View style={{ width: "48%" }}>
          <Text style={{ color: "#b5bac1", marginBottom: 4 }}>Party Max</Text>
          <TextInput value={partyMax} onChangeText={setPartyMax} style={{ backgroundColor: "#313338", color: "#fff", padding: 8, borderRadius: 4 }} keyboardType="numeric" />
        </View>
      </View>

      <Button text="Save & Apply Details" color="green" onPress={handleSaveAndApply} style={{ padding: 12, borderRadius: 4 }} />
    </ScrollView>
  );
}
