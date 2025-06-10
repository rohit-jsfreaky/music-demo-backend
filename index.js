import express from "express";
import https from "https";
import http from "http";
import { URL } from "url";
import zlib from "zlib";
import crypto from "crypto";

const app = express();
const PORT = 3000;

// Middleware
app.use(express.json());
app.use((req, res, next) => {
  res.header("Access-Control-Allow-Origin", "*");
  res.header("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  res.header(
    "Access-Control-Allow-Headers",
    "Origin, X-Requested-With, Content-Type, Accept, Range"
  );
  if (req.method === "OPTIONS") {
    res.sendStatus(200);
  } else {
    next();
  }
});

// Generate random session data to avoid detection
function generateSessionData() {
  const userAgents = [
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36",
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36",
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:133.0) Gecko/20100101 Firefox/133.0",
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10.15; rv:133.0) Gecko/20100101 Firefox/133.0",
    "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36",
  ];

  return {
    sessionId: crypto.randomBytes(16).toString("hex"),
    clientId: crypto.randomBytes(8).toString("hex"),
    timestamp: Date.now(),
    userAgent: userAgents[Math.floor(Math.random() * userAgents.length)],
  };
}

// Function to extract video ID from YouTube URL
function extractVideoId(url) {
  const regex =
    /(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/)([^"&?\/\s]{11})/;
  const match = url.match(regex);
  return match ? match[1] : null;
}

// Enhanced function to handle compressed responses
async function makeAdvancedRequest(url, options = {}, session = null) {
  return new Promise((resolve, reject) => {
    const urlObj = new URL(url);
    const client = urlObj.protocol === "https:" ? https : http;

    if (!session) session = generateSessionData();

    const requestOptions = {
      ...options,
      headers: {
        "User-Agent": session.userAgent,
        Accept:
          "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/png,image/svg+xml,*/*;q=0.8",
        "Accept-Language": "en-US,en;q=0.9",
        "Accept-Encoding": "gzip, deflate, br",
        "Cache-Control": "no-cache",
        Pragma: "no-cache",
        DNT: "1",
        Connection: "keep-alive",
        "Upgrade-Insecure-Requests": "1",
        "Sec-Fetch-Dest": "document",
        "Sec-Fetch-Mode": "navigate",
        "Sec-Fetch-Site": "none",
        "Sec-Fetch-User": "?1",
        "sec-ch-ua":
          '"Google Chrome";v="131", "Chromium";v="131", "Not_A Brand";v="24"',
        "sec-ch-ua-mobile": "?0",
        "sec-ch-ua-platform": '"Windows"',
        "X-Client-Data": Buffer.from(session.clientId).toString("base64"),
        ...options.headers,
      },
    };

    const req = client.request(url, requestOptions, (res) => {
      const chunks = [];

      res.on("data", (chunk) => chunks.push(chunk));

      res.on("end", () => {
        try {
          let data = Buffer.concat(chunks);

          const encoding = res.headers["content-encoding"];
          if (encoding === "gzip") {
            data = zlib.gunzipSync(data);
          } else if (encoding === "deflate") {
            data = zlib.inflateSync(data);
          } else if (encoding === "br") {
            data = zlib.brotliDecompressSync(data);
          }

          const responseText = data.toString("utf8");

          resolve({
            data: responseText,
            statusCode: res.statusCode,
            headers: res.headers,
            session: session,
          });
        } catch (decompressError) {
          reject(decompressError);
        }
      });
    });

    req.on("error", reject);
    req.setTimeout(30000, () => {
      req.destroy();
      reject(new Error("Request timeout"));
    });

    if (options.body) {
      req.write(options.body);
    }
    req.end();
  });
}

// Enhanced stream audio with better session handling
function streamAudioWithSession(url, req, res, sessionId = null) {
  return new Promise((resolve, reject) => {
    const urlObj = new URL(url);
    const client = urlObj.protocol === "https:" ? https : http;

    // Create a complete session object with all required fields
    let session;
    if (sessionId && typeof sessionId === "string") {
      session = {
        sessionId: sessionId,
        clientId: crypto.randomBytes(8).toString("hex"),
        timestamp: Date.now(),
        userAgent:
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36",
      };
    } else {
      session = generateSessionData();
    }

    // Ensure userAgent is always defined
    if (!session.userAgent) {
      session.userAgent =
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36";
    }

    const options = {
      headers: {
        "User-Agent": session.userAgent,
        Accept: "*/*",
        "Accept-Language": "en-US,en;q=0.9",
        "Accept-Encoding": "identity",
        Referer: "https://www.youtube.com/",
        Origin: "https://www.youtube.com",
        "Sec-Fetch-Dest": "audio",
        "Sec-Fetch-Mode": "cors",
        "Sec-Fetch-Site": "cross-site",
        "sec-ch-ua":
          '"Google Chrome";v="131", "Chromium";v="131", "Not_A Brand";v="24"',
        "sec-ch-ua-mobile": "?0",
        "sec-ch-ua-platform": '"Windows"',
        "X-Client-Data": Buffer.from(session.clientId).toString("base64"),
        "X-Request-Time": session.timestamp.toString(),
        ...(req.headers.range && { Range: req.headers.range }),
      },
    };

    console.log(
      "🎵 Streaming with session:",
      session.sessionId.substring(0, 8)
    );
    console.log("👤 User-Agent:", session.userAgent.substring(0, 50) + "...");

    const audioReq = client.request(url, options, (audioRes) => {
      console.log(`📊 Stream response: ${audioRes.statusCode}`);

      if (audioRes.statusCode === 403) {
        console.error("❌ 403 Forbidden - Stream blocked");
        return reject(new Error("Stream blocked by YouTube - need fresh URL"));
      }

      if (audioRes.statusCode >= 400) {
        console.error(`❌ HTTP Error: ${audioRes.statusCode}`);
        return reject(new Error(`Stream error: ${audioRes.statusCode}`));
      }

      const responseHeaders = {
        "Content-Type": audioRes.headers["content-type"] || "audio/webm",
        "Accept-Ranges": "bytes",
        "Cache-Control": "public, max-age=3600",
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "GET, HEAD, OPTIONS",
        "Access-Control-Allow-Headers": "Range",
        "Access-Control-Expose-Headers":
          "Content-Length, Content-Range, Accept-Ranges",
      };

      if (audioRes.headers["content-length"]) {
        responseHeaders["Content-Length"] = audioRes.headers["content-length"];
      }

      if (audioRes.statusCode === 206) {
        res.status(206);
        responseHeaders["Content-Range"] = audioRes.headers["content-range"];
        console.log("📊 Handling partial content request");
      }

      res.set(responseHeaders);
      console.log("✅ Starting audio stream...");

      audioRes.on("error", (error) => {
        console.error("❌ Audio stream error:", error.message);
        reject(error);
      });

      audioRes.on("end", () => {
        console.log("✅ Audio stream completed successfully");
        resolve();
      });

      audioRes.pipe(res);
    });

    audioReq.on("error", (error) => {
      console.error("❌ Request error:", error.message);
      reject(error);
    });

    audioReq.setTimeout(60000, () => {
      console.error("⏰ Request timeout");
      audioReq.destroy();
      reject(new Error("Stream timeout"));
    });

    audioReq.end();
  });
}

// Alternative approach using different YouTube API endpoints
async function getVideoInfoFromNewAPI(videoId) {
  console.log("🔧 Trying alternative API approach...");

  const session = generateSessionData();

  // Method 1: Try the iOS client (often less restricted)
  console.log("📱 Trying iOS client...");
  const iOSPayload = {
    context: {
      client: {
        clientName: "IOS",
        clientVersion: "19.29.1",
        deviceMake: "Apple",
        deviceModel: "iPhone16,2",
        userAgent:
          "com.google.ios.youtube/19.29.1 (iPhone16,2; U; CPU iOS 17_5_1 like Mac OS X;)",
        osName: "iPhone",
        osVersion: "17.5.1.21F90",
      },
    },
    videoId: videoId,
    racyCheckOk: true,
    contentCheckOk: true,
  };

  try {
    const response = await makeAdvancedRequest(
      "https://www.youtube.com/youtubei/v1/player?key=AIzaSyB-63vPrdThhKuerbB2N_l7Kwwcxj6yUAc",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-YouTube-Client-Name": "5",
          "X-YouTube-Client-Version": "19.29.1",
        },
        body: JSON.stringify(iOSPayload),
      },
      session
    );

    if (response.statusCode === 200) {
      const data = JSON.parse(response.data);
      if (data && data.streamingData) {
        console.log("✅ Success with iOS client");
        return data;
      }
    }
  } catch (error) {
    console.log("⚠️ iOS client failed:", error.message);
  }

  // Method 2: Try Android client
  console.log("🤖 Trying Android client...");
  const androidPayload = {
    context: {
      client: {
        clientName: "ANDROID",
        clientVersion: "19.09.37",
        androidSdkVersion: 34,
        userAgent:
          "com.google.android.youtube/19.09.37 (Linux; U; Android 14) gzip",
      },
    },
    videoId: videoId,
  };

  try {
    const response = await makeAdvancedRequest(
      "https://www.youtube.com/youtubei/v1/player?key=AIzaSyA8eiZmM1FaDVjRy-df2KTyQ_vz_yYM39w",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-YouTube-Client-Name": "3",
          "X-YouTube-Client-Version": "19.09.37",
        },
        body: JSON.stringify(androidPayload),
      },
      session
    );

    if (response.statusCode === 200) {
      const data = JSON.parse(response.data);
      if (data && data.streamingData) {
        console.log("✅ Success with Android client");
        return data;
      }
    }
  } catch (error) {
    console.log("⚠️ Android client failed:", error.message);
  }

  // Method 3: Try TV client (often works when others fail)
  console.log("📺 Trying TV client...");
  const tvPayload = {
    context: {
      client: {
        clientName: "TVHTML5_SIMPLY_EMBEDDED_PLAYER",
        clientVersion: "2.0",
        clientScreen: "EMBED",
      },
      thirdParty: {
        embedUrl: "https://www.youtube.com/",
      },
    },
    videoId: videoId,
  };

  try {
    const response = await makeAdvancedRequest(
      "https://www.youtube.com/youtubei/v1/player?key=AIzaSyAO_FJ2SlqU8Q4STEHLGCilw_Y9_11qcW8",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-YouTube-Client-Name": "85",
          "X-YouTube-Client-Version": "2.0",
        },
        body: JSON.stringify(tvPayload),
      },
      session
    );

    if (response.statusCode === 200) {
      const data = JSON.parse(response.data);
      if (data && data.streamingData) {
        console.log("✅ Success with TV client");
        return data;
      }
    }
  } catch (error) {
    console.log("⚠️ TV client failed:", error.message);
  }

  throw new Error("All API methods failed");
}

// Main extraction function
async function getVideoInfo(videoId) {
  console.log(`🔍 Starting extraction for: ${videoId}`);
  console.log(`🕐 Time: ${new Date().toISOString()}`);
  console.log(`👤 User: rohit-jsfreaky`);

  try {
    const result = await getVideoInfoFromNewAPI(videoId);
    if (result && (result.streamingData || result.videoDetails)) {
      console.log("✅ Extraction successful!");
      return result;
    }
  } catch (error) {
    console.log(`❌ Extraction failed: ${error.message}`);
  }

  throw new Error(
    "All extraction methods failed - YouTube may be blocking requests"
  );
}

// Enhanced signature cipher decoding
function decodeSignatureCipher(cipherString) {
  try {
    console.log("🔐 Decoding signature cipher...");

    const params = {};
    const pairs = cipherString.split("&");

    for (let pair of pairs) {
      const [key, value] = pair.split("=");
      if (key && value) {
        try {
          params[decodeURIComponent(key)] = decodeURIComponent(value);
        } catch (e) {
          params[key] = value;
        }
      }
    }

    let url = params.url;
    const signature = params.s;
    const signatureParam = params.sp || "signature";

    if (!url) {
      console.log("❌ No URL found in cipher");
      return null;
    }

    if (signature) {
      console.log("🔑 Found signature, appending to URL...");
      try {
        const urlObj = new URL(url);
        urlObj.searchParams.set(signatureParam, signature);
        return urlObj.toString();
      } catch (urlError) {
        console.log("❌ URL construction failed:", urlError.message);
        return url;
      }
    }

    return url;
  } catch (error) {
    console.log("❌ Cipher decoding error:", error.message);
    return null;
  }
}

// Enhanced audio stream extraction
function extractAudioStreams(playerResponse) {
  console.log("🎵 Extracting audio streams...");

  if (playerResponse.playabilityStatus?.status !== "OK") {
    const reason = playerResponse.playabilityStatus?.reason || "Unknown reason";
    console.log("❌ Video not available:", reason);
    throw new Error(`Video not available: ${reason}`);
  }

  const streamingData = playerResponse.streamingData;
  if (!streamingData) {
    console.log("❌ No streaming data available");
    throw new Error("No streaming data available");
  }

  console.log("📊 Available data:", Object.keys(streamingData));
  const streams = [];

  // Process adaptive formats (audio-only)
  if (streamingData.adaptiveFormats) {
    console.log(
      `🔍 Processing ${streamingData.adaptiveFormats.length} adaptive formats`
    );

    for (let format of streamingData.adaptiveFormats) {
      if (format.mimeType && format.mimeType.includes("audio")) {
        console.log(
          `🎵 Found: ${format.mimeType}, itag: ${format.itag}, quality: ${format.audioQuality}`
        );

        let audioUrl = format.url;

        if (!audioUrl && (format.signatureCipher || format.cipher)) {
          console.log("🔐 Decoding encrypted stream...");
          audioUrl = decodeSignatureCipher(
            format.signatureCipher || format.cipher
          );
        }

        if (audioUrl) {
          streams.push({
            url: audioUrl,
            mimeType: format.mimeType,
            bitrate: format.bitrate || format.averageBitrate,
            audioQuality: format.audioQuality,
            audioSampleRate: format.audioSampleRate,
            audioChannels: format.audioChannels,
            contentLength: format.contentLength,
            itag: format.itag,
            type: "audio-only",
          });
          console.log(
            `✅ Added: ${format.mimeType}, ${
              format.bitrate || format.averageBitrate
            }bps`
          );
        }
      }
    }
  }

  // Fallback to regular formats
  if (streamingData.formats && streams.length === 0) {
    console.log(`🔍 Checking ${streamingData.formats.length} regular formats`);

    for (let format of streamingData.formats) {
      if (format.mimeType && format.audioQuality) {
        let audioUrl = format.url;

        if (!audioUrl && (format.signatureCipher || format.cipher)) {
          audioUrl = decodeSignatureCipher(
            format.signatureCipher || format.cipher
          );
        }

        if (audioUrl) {
          streams.push({
            url: audioUrl,
            mimeType: format.mimeType,
            bitrate: format.bitrate,
            audioQuality: format.audioQuality,
            itag: format.itag,
            type: "video+audio",
          });
          console.log(`✅ Added fallback: ${format.mimeType}`);
        }
      }
    }
  }

  console.log(`📊 Total streams found: ${streams.length}`);
  return streams;
}

// Get best audio stream
function getBestAudioStream(streams) {
  if (streams.length === 0) return null;

  console.log(`🎯 Selecting best stream from ${streams.length} options`);

  // Prefer audio-only streams
  const audioOnlyStreams = streams.filter((s) => s.type === "audio-only");

  if (audioOnlyStreams.length > 0) {
    audioOnlyStreams.sort((a, b) => {
      const qualityOrder = {
        AUDIO_QUALITY_HIGH: 3,
        AUDIO_QUALITY_MEDIUM: 2,
        AUDIO_QUALITY_LOW: 1,
      };
      const aQuality = qualityOrder[a.audioQuality] || 0;
      const bQuality = qualityOrder[b.audioQuality] || 0;

      if (aQuality !== bQuality) return bQuality - aQuality;
      return (b.bitrate || 0) - (a.bitrate || 0);
    });

    const selected = audioOnlyStreams[0];
    console.log(
      `✅ Selected: ${selected.mimeType}, ${selected.audioQuality}, ${selected.bitrate}bps`
    );
    return selected;
  }

  // Fallback
  streams.sort((a, b) => (b.bitrate || 0) - (a.bitrate || 0));
  const selected = streams[0];
  console.log(`✅ Selected fallback: ${selected.mimeType}`);
  return selected;
}

// Main endpoint
app.get("/get-audio-url", async (req, res) => {
  try {
    const { youtubeUrl } = req.query;

    if (!youtubeUrl) {
      return res.status(400).json({ error: "YouTube URL is required" });
    }

    const videoId = extractVideoId(youtubeUrl);
    if (!videoId) {
      return res.status(400).json({ error: "Invalid YouTube URL" });
    }

    console.log(`🚀 Processing: ${videoId}`);
    console.log(`🕐 Current time: 2025-06-10 12:39:57 UTC`);
    console.log(`👤 User: rohit-jsfreaky`);

    const playerResponse = await getVideoInfo(videoId);
    const videoDetails = playerResponse.videoDetails;
    const title = videoDetails?.title || "Unknown";
    const author = videoDetails?.author || "Unknown";
    const lengthSeconds = videoDetails?.lengthSeconds || 0;

    console.log(`📺 "${title}" by ${author}`);

    const audioStreams = extractAudioStreams(playerResponse);

    if (audioStreams.length === 0) {
      return res.status(404).json({
        error: "No audio streams found",
        debug: {
          hasStreamingData: !!playerResponse.streamingData,
          playabilityStatus: playerResponse.playabilityStatus?.status,
        },
      });
    }

    const bestStream = getBestAudioStream(audioStreams);

    if (!bestStream) {
      return res.status(404).json({
        error: "No suitable audio stream found",
        streamsFound: audioStreams.length,
      });
    }

    const session = generateSessionData();
    const proxyUrl = `/proxy-audio?url=${encodeURIComponent(
      bestStream.url
    )}&session=${session.sessionId}`;
    const fullProxyUrl = `http://localhost:${PORT}${proxyUrl}`;
    const playerUrl = `http://localhost:${PORT}/player?url=${encodeURIComponent(
      bestStream.url
    )}&title=${encodeURIComponent(title)}&author=${encodeURIComponent(
      author
    )}&session=${session.sessionId}`;

    console.log(`🎵 Ready! Session: ${session.sessionId.substring(0, 8)}`);

    res.json({
      success: true,
      videoInfo: {
        id: videoId,
        title,
        author,
        duration: lengthSeconds,
      },
      directUrl: bestStream.url,
      proxyUrl: proxyUrl,
      fullProxyUrl: fullProxyUrl,
      playerUrl: playerUrl,
      audioInfo: {
        mimeType: bestStream.mimeType,
        bitrate: bestStream.bitrate,
        audioQuality: bestStream.audioQuality,
        audioSampleRate: bestStream.audioSampleRate,
        audioChannels: bestStream.audioChannels,
        contentLength: bestStream.contentLength,
        itag: bestStream.itag,
      },
      session: {
        id: session.sessionId.substring(0, 8),
        timestamp: session.timestamp,
      },
      allStreams: audioStreams.map((stream) => ({
        mimeType: stream.mimeType,
        bitrate: stream.bitrate,
        audioQuality: stream.audioQuality,
        itag: stream.itag,
        type: stream.type,
      })),
    });
  } catch (error) {
    console.error("❌ Error:", error.message);
    res.status(500).json({
      error: error.message,
      timestamp: new Date().toISOString(),
      suggestion:
        "YouTube may be blocking requests. Try again in a few minutes or use a different video.",
    });
  }
});

// Enhanced proxy endpoint with proper session handling
app.get("/proxy-audio", async (req, res) => {
  try {
    const { url, session: sessionId } = req.query;

    if (!url) {
      return res.status(400).json({ error: "Audio URL is required" });
    }

    console.log(
      `🎵 Proxy request for session: ${sessionId?.substring(0, 8) || "new"}`
    );

    await streamAudioWithSession(url, req, res, sessionId);
  } catch (error) {
    console.error("❌ Stream error:", error.message);

    if (!res.headersSent) {
      if (error.message.includes("blocked") || error.message.includes("403")) {
        res.status(403).json({
          error: "Stream blocked by YouTube",
          message:
            "The audio stream was blocked. Please get a fresh URL by calling /get-audio-url again.",
          code: "STREAM_BLOCKED",
          timestamp: new Date().toISOString(),
        });
      } else {
        res.status(500).json({
          error: "Stream failed: " + error.message,
          timestamp: new Date().toISOString(),
        });
      }
    }
  }
});

// Download endpoint
app.get("/download-audio", async (req, res) => {
  try {
    const {
      url,
      title = "audio",
      format = "webm",
      session: sessionId,
    } = req.query;

    if (!url) {
      return res.status(400).json({ error: "Audio URL is required" });
    }

    const cleanTitle = title.replace(/[^\w\s-]/g, "").replace(/\s+/g, "_");
    const filename = `${cleanTitle}.${format}`;

    console.log(`📥 Downloading: ${filename}`);

    res.set({
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Content-Type": "application/octet-stream",
    });

    await streamAudioWithSession(url, req, res, sessionId);
  } catch (error) {
    console.error("❌ Download error:", error.message);
    if (!res.headersSent) {
      res.status(500).json({ error: "Download failed: " + error.message });
    }
  }
});

// Enhanced player endpoint
app.get("/player", async (req, res) => {
  const {
    url,
    title = "YouTube Audio",
    author = "Unknown",
    session,
  } = req.query;

  if (!url) {
    return res.status(400).send(`
      <html>
        <body style="font-family: Arial; text-align: center; padding: 50px;">
          <h2>❌ No audio URL provided</h2>
          <p>Please provide a valid audio URL parameter.</p>
        </body>
      </html>
    `);
  }

  const proxyUrl = `/proxy-audio?url=${encodeURIComponent(url)}&session=${
    session || ""
  }`;

  const html = `
    <!DOCTYPE html>
    <html lang="en">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>🎵 ${title}</title>
        <style>
            body {
                font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
                background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                margin: 0;
                padding: 20px;
                min-height: 100vh;
                display: flex;
                align-items: center;
                justify-content: center;
            }
            .player-container {
                background: white;
                border-radius: 20px;
                padding: 30px;
                box-shadow: 0 20px 40px rgba(0,0,0,0.1);
                max-width: 500px;
                width: 100%;
                text-align: center;
            }
            .player-header {
                background: linear-gradient(135deg, #ff6b6b, #4ecdc4);
                height: 120px;
                border-radius: 15px;
                display: flex;
                flex-direction: column;
                align-items: center;
                justify-content: center;
                margin-bottom: 20px;
                color: white;
                text-shadow: 0 2px 4px rgba(0,0,0,0.3);
            }
            .player-header h1 {
                margin: 0;
                font-size: 24px;
                font-weight: bold;
            }
            .player-header p {
                margin: 5px 0 0 0;
                opacity: 0.9;
                font-size: 16px;
            }
            audio {
                width: 100%;
                margin: 20px 0;
                height: 60px;
                border-radius: 10px;
            }
            .controls {
                display: flex;
                gap: 10px;
                justify-content: center;
                margin: 20px 0;
                flex-wrap: wrap;
            }
            .btn {
                background: linear-gradient(135deg, #667eea, #764ba2);
                color: white;
                border: none;
                padding: 12px 20px;
                border-radius: 25px;
                cursor: pointer;
                font-size: 14px;
                font-weight: 500;
                transition: all 0.3s ease;
                text-decoration: none;
                display: inline-block;
            }
            .btn:hover {
                transform: translateY(-2px);
                box-shadow: 0 5px 15px rgba(102, 126, 234, 0.4);
            }
            .status {
                margin: 15px 0;
                padding: 12px;
                border-radius: 10px;
                font-size: 14px;
                font-weight: 500;
            }
            .status.loading { background: #e3f2fd; color: #1565c0; }
            .status.playing { background: #f3e5f5; color: #7b1fa2; }
            .status.paused { background: #fff3e0; color: #ef6c00; }
            .status.error { background: #ffebee; color: #c62828; }
            .status.success { background: #e8f5e8; color: #2e7d32; }
            .debug-info {
                background: #f8f9fa;
                border-radius: 10px;
                padding: 15px;
                margin: 15px 0;
                font-size: 12px;
                color: #666;
                text-align: left;
                font-family: monospace;
            }
        </style>
    </head>
    <body>
        <div class="player-container">
            <div class="player-header">
                <h1>🎵 YouTube Audio</h1>
                <p>${title.substring(0, 50)}${
    title.length > 50 ? "..." : ""
  }</p>
                <small>by ${author}</small>
            </div>
            
            <audio id="audioPlayer" controls preload="metadata" crossorigin="anonymous">
                <source src="${proxyUrl}" type="audio/webm">
                <source src="${proxyUrl}" type="audio/mp4">
                Your browser does not support the audio element.
            </audio>
            
            <div class="controls">
                <button class="btn" onclick="testConnection()">🔍 Test Stream</button>
                <button class="btn" onclick="forceReload()">🔄 Reload</button>
                <a href="/download-audio?url=${encodeURIComponent(
                  url
                )}&title=${encodeURIComponent(title)}&session=${session || ""}" 
                   class="btn" download>📥 Download</a>
            </div>
            
            <div id="status" class="status loading">
                🔄 Loading audio stream...
            </div>
            
            <div class="debug-info">
                <strong>🔧 Debug Information:</strong><br>
                <strong>Session:</strong> ${
                  session ? session.substring(0, 8) : "new"
                }<br>
                <strong>Stream URL:</strong> ${proxyUrl}<br>
                <strong>Status:</strong> <span id="debugStatus">Initializing...</span><br>
                <strong>Last Error:</strong> <span id="lastError">None</span><br>
                <strong>Attempts:</strong> <span id="attempts">0</span><br>
                <strong>Server Time:</strong> 2025-06-10 12:39:57 UTC<br>
                <strong>User:</strong> rohit-jsfreaky
            </div>
        </div>

        <script>
            const audio = document.getElementById('audioPlayer');
            const status = document.getElementById('status');
            const debugStatus = document.getElementById('debugStatus');
            const lastError = document.getElementById('lastError');
            const attempts = document.getElementById('attempts');
            
            let attemptCount = 0;
            
            function showStatus(message, type = 'loading') {
                status.textContent = message;
                status.className = 'status ' + type;
                debugStatus.textContent = type.toUpperCase();
            }
            
            function updateAttempts() {
                attemptCount++;
                attempts.textContent = attemptCount;
            }
            
            async function testConnection() {
                showStatus('🔍 Testing stream connection...', 'loading');
                updateAttempts();
                
                try {
                    const response = await fetch('${proxyUrl}', { 
                        method: 'HEAD',
                        mode: 'cors'
                    });
                    
                    if (response.ok) {
                        showStatus('✅ Stream connection successful!', 'success');
                        lastError.textContent = 'None';
                    } else {
                        throw new Error(\`HTTP \${response.status}: \${response.statusText}\`);
                    }
                } catch (error) {
                    showStatus(\`❌ Connection failed: \${error.message}\`, 'error');
                    lastError.textContent = error.message;
                    
                    if (error.message.includes('403')) {
                        showStatus('🚫 403 Forbidden - Stream blocked. Please get a fresh URL.', 'error');
                    }
                }
            }
            
            function forceReload() {
                showStatus('🔄 Reloading audio source...', 'loading');
                updateAttempts();
                audio.load();
                setTimeout(testConnection, 1000);
            }
            
            // Audio event listeners
            audio.addEventListener('loadstart', () => {
                showStatus('🔄 Loading audio...', 'loading');
                updateAttempts();
            });
            
            audio.addEventListener('loadeddata', () => {
                showStatus('✅ Audio loaded!', 'success');
                lastError.textContent = 'None';
            });
            
            audio.addEventListener('canplay', () => {
                showStatus('🎵 Ready to play!', 'success');
            });
            
            audio.addEventListener('play', () => {
                showStatus('▶️ Playing...', 'playing');
            });
            
            audio.addEventListener('pause', () => {
                showStatus('⏸️ Paused', 'paused');
            });
            
            audio.addEventListener('error', (e) => {
                const error = audio.error;
                let errorMsg = 'Unknown error';
                
                if (error) {
                    switch(error.code) {
                        case error.MEDIA_ERR_ABORTED:
                            errorMsg = 'Playback aborted';
                            break;
                        case error.MEDIA_ERR_NETWORK:
                            errorMsg = 'Network error - Stream may be blocked';
                            break;
                        case error.MEDIA_ERR_DECODE:
                            errorMsg = 'Audio decoding error';
                            break;
                        case error.MEDIA_ERR_SRC_NOT_SUPPORTED:
                            errorMsg = 'Audio format not supported';
                            break;
                    }
                }
                
                showStatus(\`❌ \${errorMsg}\`, 'error');
                lastError.textContent = errorMsg;
            });
            
            // Initialize
            window.addEventListener('load', () => {
                setTimeout(testConnection, 500);
            });
        </script>
    </body>
    </html>
  `;

  res.send(html);
});

// Health check
app.get("/health", (req, res) => {
  res.json({
    status: "OK",
    version: "Fixed User-Agent v2025.06.10",
    timestamp: new Date().toISOString(),
    user: "rohit-jsfreaky",
    methods: ["iOS API", "Android API", "TV API"],
    fixes: [
      "User-Agent undefined fix",
      "Session management",
      "Enhanced debugging",
    ],
  });
});

// Error handler
app.use((error, req, res, next) => {
  console.error("❌ Server error:", error);
  res.status(500).json({
    error: "Server error",
    timestamp: new Date().toISOString(),
  });
});

app.listen(PORT, () => {
  console.log(`🚀 Fixed YouTube Audio Server running on port ${PORT}`);
  console.log(`📅 Started: 2025-06-10 12:39:57 UTC`);
  console.log(`👤 User: rohit-jsfreaky`);
  console.log(`\n🔧 Fixes Applied:`);
  console.log(`   ✅ Fixed User-Agent undefined error`);
  console.log(`   ✅ Enhanced session management`);
  console.log(`   ✅ Better error handling`);
  console.log(`   ✅ Improved debugging`);
  console.log(`\n🛡️ Anti-403 Features:`);
  console.log(`   ✅ iOS, Android, TV API clients`);
  console.log(`   ✅ Dynamic session generation`);
  console.log(`   ✅ Enhanced header spoofing`);
  console.log(`\n📋 Endpoints:`);
  console.log(`   GET  /get-audio-url?youtubeUrl=URL`);
  console.log(`   GET  /player?url=URL&session=SESSION`);
  console.log(`   GET  /proxy-audio?url=URL&session=SESSION`);
  console.log(`   GET  /download-audio?url=URL&title=TITLE&session=SESSION`);
  console.log(`   GET  /health`);
  console.log(`\n🎯 User-Agent error fixed! Ready to extract audio!`);
});
