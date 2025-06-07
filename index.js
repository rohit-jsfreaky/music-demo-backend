import express from "express";
import cors from "cors";
import ytdl from "@distube/ytdl-core";

import { ytmp3 } from "hydra_scraper";
const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use(cors());

app.get("/", (req, res) => {
  res.send("Welcome to the API!");
});

app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});

const cookies = [
  { name: "HSID", value: "A1EEpbUy_XjuxSr9Q" },
  { name: "SSID", value: "ARlBurOhGs_7T476u" },
  { name: "APISID", value: "RdvgyxXLaHX_FAo8/AAvPqKNqp-x-1URi2" },
  { name: "SAPISID", value: "ojZ2S7hmG_2zP3_b/AxeEjol2Q18EmK4e0" },
  { name: "__Secure-1PAPISID", value: "ojZ2S7hmG_2zP3_b/AxeEjol2Q18EmK4e0" },
  { name: "__Secure-3PAPISID", value: "ojZ2S7hmG_2zP3_b/AxeEjol2Q18EmK4e0" },
  {
    name: "LOGIN_INFO",
    value:
      "AFmmF2swRgIhALc8r55TLW62Oqs7Yy28CL9l9txdxq-tSgqwcR8j8p5lAiEAh1Xee2x47JZ2_wM08wPE5qg5wgjBytoxo5I3GtGS1P8:QUQ3MjNmeTY3N05aNUEwYUF5WEdVUUVNZEtwdTBMZ0huckpCeDJwdGJyZUlFYkxiZ29ieVhMbmJfbGUycEEwOVFnVnNNUlFoajNRMkxGdlRud0owby0zSkJNclFvbVFfdUtNc1EzTVZfUkFFc25IWGFURWVyQnJCaWVUSUlWTTU5Z0JTdFRfTWU4Ym8xR3pZVkhIN0pSOF80dHRzTUtrckhR",
  },
  { name: "PREF", value: "f6=40000000&tz=Asia.Calcutta&f7=100" },
  {
    name: "SID",
    value:
      "g.a000wwiAjyVII9mTR10bhBCIOB1ZYwbrWIN-W1HiKKTmH6YRoyfg4wjA9TkQ80KhODEPhoTL7AACgYKAVQSARMSFQHGX2MiZWNnoENxOuLzsHLIWi3XSBoVAUF8yKqBBhUaVhuZInLkFuol5ifo0076",
  },
  {
    name: "__Secure-1PSID",
    value:
      "g.a000wwiAjyVII9mTR10bhBCIOB1ZYwbrWIN-W1HiKKTmH6YRoyfgz6KyUiMPX2-1CUHgeTGtTQACgYKAYkSARMSFQHGX2MiWXMQtStDa-AmdQSSwsivjRoVAUF8yKqHRlWQ6_egNf34Q5fJVVW30076",
  },
  {
    name: "__Secure-3PSID",
    value:
      "g.a000wwiAjyVII9mTR10bhBCIOB1ZYwbrWIN-W1HiKKTmH6YRoyfgeCjSuXBWHWjIgiJNjicULQACgYKAd0SARMSFQHGX2Mi_areAWkm8UMDN2M2RFSAuRoVAUF8yKqR0E62F0SCdvSGPlOygPV90076",
  },
  {
    name: "__Secure-1PSIDTS",
    value:
      "sidts-CjIB5H03P32m2W0mIzGsOBu7qOjJ2ESSoIw4WfR7bK1cpcyb9x_dWfT1w7OZmjgxXgSc7RAA",
  },
  {
    name: "__Secure-3PSIDTS",
    value:
      "sidts-CjIB5H03P32m2W0mIzGsOBu7qOjJ2ESSoIw4WfR7bK1cpcyb9x_dWfT1w7OZmjgxXgSc7RAA",
  },
  {
    name: "SIDCC",
    value:
      "AKEyXzVDZW78n0TFDGbi4aPh2b7p-PykfU_PuOnUL_4BDoSU4ZFweSMo1TeHO03bkm9VWBBvOBw",
  },
  {
    name: "__Secure-1PSIDCC",
    value:
      "AKEyXzUK6aueHPyPzBe3Y9ZscTDZOc1c1kNIvViVh34pgAP4mNbylz9HzwqZL7p4R8VrwB0pLyA",
  },
  {
    name: "__Secure-3PSIDCC",
    value:
      "AKEyXzXlFxUMJFtDdw8-kyeY6iqR-iu4MbLF6B-vECgNuPnkGyh19tmSSLKNPekRFV1L1F06vg",
  },
  { name: "VISITOR_INFO1_LIVE", value: "LGsI6rD58G4" },
  { name: "VISITOR_PRIVACY_METADATA", value: "CgJJThIEGgAgPQ%3D%3D" },
  {
    name: "__Secure-ROLLOUT_TOKEN",
    value: "CNi5jdLl6OOEngEQ34qM9LvtjAMYgMmevc3ejQM%3D",
  },
  { name: "YSC", value: "8bO2nFBnwBI" },
];

const agentOptions = {
  pipelining: 5,
  maxRedirections: 0,
};

const agent = ytdl.createAgent(cookies, agentOptions);

app.get("/demo", async (req, res) => {
  try {
    const videoUrl = "http://www.youtube.com/watch?v=aqz-KE-bpKQ"; // Replace with a valid YouTube video URL
    const info = await ytdl.getInfo(videoUrl, { agent });
    // Find the first audio format
    const audioFormat = info.formats.find(
      (f) => f.mimeType && f.mimeType.includes("audio")
    );
    if (audioFormat) {
      console.log("Audio URL:", audioFormat.url);
      res.json({ audioUrl: audioFormat.url });
    } else {
      res.status(404).json({ error: "No audio format found" });
    }
  } catch (error) {
    console.error("Error fetching video info:", error);
    res.status(500).json({ error: "Failed to fetch video info" });
  }
});

app.get("/demo2", async (req, res) => {
  const videoUrl = "http://www.youtube.com/watch?v=aqz-KE-bpKQ";

  try {
    const result = await ytmp3(videoUrl);

    const audioUrl = result.audioUrl;

    return res.json({
      message: audioUrl,
    });
  } catch (error) {
    console.error("Error in demo2:", error);
    return res.status(500).json({ error: "Failed to fetch audio URL" });
  }
});
