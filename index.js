import express from "express";
import cors from "cors";
import ytdl from "@distube/ytdl-core";

import { ytmp3 } from "@vreden/youtube_scraper";
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


app.get("/demo2", async (req, res) => {
  const videoUrl = "https://www.youtube.com/watch?v=_fmA1RoHbzA";

  try {
    const result = await ytmp3(videoUrl);

    console.log("Audio URL:", result.download.url);

    const audioUrl = result.download.url;

    return res.json({
      message: audioUrl,
    });
  } catch (error) {
    console.error("Error in demo2:", error);
    return res.status(500).json({ error: "Failed to fetch audio URL" });
  }
});
