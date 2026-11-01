import { Router } from "express";
import { GoogleGenAI } from "@google/genai";

const router = Router();

const MODEL_NAME = "gemini-3.8-flash";

router.post("/understand-route", async (req, res) => {
  try {
    const apiKey = process.env.GEMINI_API_KEY;

    if (!apiKey) {
      return res.status(500).json({
        success: false,
        error: "Configure GEMINI_API_KEY in backend/.env.",
      });
    }

    const { prompt } = req.body ?? {};

    // Validate prompt
    if (typeof prompt !== "string" || !prompt.trim()) {
      return res.status(400).json({
        success: false,
        error: "Please describe your journey.",
      });
    }

    if (prompt.length > 1500) {
      return res.status(400).json({
        success: false,
        error: "Your prompt must be 1,500 characters or fewer.",
      });
    }

    // Initialize Gemini
    const ai = new GoogleGenAI({
      apiKey,
      vertexai: false,
    });

    const systemPrompt = `
You are an intelligent multilingual navigation assistant.

Your task is to understand the user's journey description
and extract navigation information.

The user may write in English, Tamil, Hindi, Telugu,
Kannada, Malayalam, or another language.

Automatically detect the language used by the user.

Return ONLY one valid JSON object with these properties:

{
  "origin": "Starting location or null",
  "destination": "Destination or null",
  "travelMode": "DRIVE, WALK, BICYCLE, TWO_WHEELER, TRANSIT, or null",
  "language": "Detected language code, such as en, ta, hi, te, kn, ml",
  "routePreference": "User's route preference or null",
  "needsClarification": true,
  "clarificationQuestion": "Question in the user's language or null"
}

IMPORTANT RULES:

1. Extract the starting location only when the user provides it.
2. If the user says "from my current location", "from here",
   or equivalent, set origin to "CURRENT_LOCATION".
3. Never invent an origin or destination.
4. If the destination is missing, set it to null.
5. If the travel mode is not specified, set it to null.
6. Map car or driving to DRIVE.
7. Map walking to WALK.
8. Map bicycle to BICYCLE.
9. Map motorcycle or bike to TWO_WHEELER when context indicates
   a motorbike.
10. Map public transport or bus/train journeys to TRANSIT.
11. Detect preferences such as fastest route, shortest route,
    or avoiding tolls.
12. If the destination is missing, set needsClarification to true
    and ask a short question in the user's language.
13. If the destination is available, set needsClarification to false
    and clarificationQuestion to null.
14. Do not calculate distance, travel time, or actual routes.
    Google Maps will handle route calculation.
15. Do not include Markdown or explanations outside the JSON.
`;

    console.log("Understanding navigation prompt...");
    console.log("Prompt:", prompt);

    const startedAt = Date.now();

    const response = await ai.models.generateContent({
      model: MODEL_NAME,
      contents: prompt.trim(),
      config: {
        systemInstruction: systemPrompt,
        temperature: 0.1,
        responseMimeType: "application/json",
      },
    });

    console.log(
      `Gemini responded in ${((Date.now() - startedAt) / 1000).toFixed(
        1,
      )} seconds`,
    );

    const content = response.text;

    if (typeof content !== "string" || !content.trim()) {
      return res.status(502).json({
        success: false,
        error: "Gemini returned an empty response. Please try again.",
      });
    }

    // Parse Gemini JSON response
    let result;

    try {
      const cleanedContent = content
        .replace(/^```(?:json)?\s*/i, "")
        .replace(/\s*```$/i, "")
        .trim();

      result = JSON.parse(cleanedContent);
    } catch (error) {
      console.error("Gemini JSON parsing error:", error);
      console.error("Gemini response:", content);

      return res.status(502).json({
        success: false,
        error: "Could not understand the navigation response.",
      });
    }

    // Validate response
    const supportedTravelModes = [
      "DRIVE",
      "WALK",
      "BICYCLE",
      "TWO_WHEELER",
      "TRANSIT",
    ];

    if (
      typeof result !== "object" ||
      result === null ||
      Array.isArray(result) ||
      !("origin" in result) ||
      !("destination" in result) ||
      !("travelMode" in result) ||
      typeof result.language !== "string" ||
      typeof result.needsClarification !== "boolean"
    ) {
      return res.status(502).json({
        success: false,
        error: "Gemini returned an invalid navigation response.",
      });
    }

    if (result.origin !== null && typeof result.origin !== "string") {
      return res.status(502).json({
        success: false,
        error: "Invalid starting location received.",
      });
    }

    if (result.destination !== null && typeof result.destination !== "string") {
      return res.status(502).json({
        success: false,
        error: "Invalid destination received.",
      });
    }

    if (
      result.travelMode !== null &&
      !supportedTravelModes.includes(result.travelMode)
    ) {
      result.travelMode = null;
    }

    const usage = response.usageMetadata;

    // Send structured response to frontend
    return res.json({
      success: true,
      data: {
        origin: result.origin,
        destination: result.destination,
        travelMode: result.travelMode,
        language: result.language,
        routePreference: result.routePreference ?? null,
        needsClarification: result.needsClarification,
        clarificationQuestion: result.clarificationQuestion ?? null,
      },
      model: MODEL_NAME,
      usage: {
        inputTokens: usage?.promptTokenCount ?? null,
        outputTokens: usage?.candidatesTokenCount ?? null,
        totalTokens: usage?.totalTokenCount ?? null,
      },
    });
  } catch (error) {
    console.error("Gemini navigation API error:", error);

    return res.status(500).json({
      success: false,
      error: error.message || "Navigation understanding failed.",
    });
  }
});

// Convert a place name into latitude and longitude
async function geocodePlace(place) {
  const params = new URLSearchParams({
    q: place,
    format: "jsonv2",
    limit: "1",
  });

  const response = await fetch(
    `https://nominatim.openstreetmap.org/search?${params}`,
    {
      headers: {
        "User-Agent": "WAYFINDER-AI/1.0",
        ...(process.env.NOMINATIM_CONTACT
          ? { From: process.env.NOMINATIM_CONTACT }
          : {}),
      },
      signal: AbortSignal.timeout(15000),
    },
  );

  if (!response.ok) {
    throw new Error(`Geocoding service error: ${response.status}`);
  }

  const results = await response.json();

  if (!results.length) {
    throw new Error(`Location not found: ${place}`);
  }

  return {
    name: results[0].display_name,
    lat: Number(results[0].lat),
    lon: Number(results[0].lon),
  };
}

// Calculate driving route using OSRM
router.post("/route", async (req, res) => {
  try {
    const {
      origin,
      destination,
      travelMode = "DRIVE",
      originCoordinates,
    } = req.body;

    if (!origin || !destination) {
      return res.status(400).json({
        success: false,
        message: "Origin and destination are required.",
      });
    }

    // Initial version supports driving routes
    if (travelMode !== "DRIVE") {
      return res.status(400).json({
        success: false,
        message: "Currently, only driving routes are supported.",
      });
    }

    // 1. Find origin coordinates
    let start;

    if (origin === "CURRENT_LOCATION") {
      if (
        !originCoordinates ||
        !Number.isFinite(Number(originCoordinates.lat)) ||
        !Number.isFinite(Number(originCoordinates.lon))
      ) {
        return res.status(400).json({
          success: false,
          message: "Valid current location coordinates are required.",
        });
      }

      start = {
        name: "Your current location",
        lat: Number(originCoordinates.lat),
        lon: Number(originCoordinates.lon),
      };
    } else {
      start = await geocodePlace(origin);
    }

    // 2. Find destination coordinates
    const end = await geocodePlace(destination);

    // 3. Request route from OSRM
    const routeUrl =
      `https://router.project-osrm.org/route/v1/driving/` +
      `${start.lon},${start.lat};${end.lon},${end.lat}` +
      `?overview=full&geometries=geojson&alternatives=true&steps=true`;

    const routeResponse = await fetch(routeUrl, {
      signal: AbortSignal.timeout(30000),
    });

    if (!routeResponse.ok) {
      throw new Error(`Routing service error: ${routeResponse.status}`);
    }

    const routeData = await routeResponse.json();

    if (
      routeData.code !== "Ok" ||
      !routeData.routes ||
      !routeData.routes.length
    ) {
      throw new Error("No route found between these locations.");
    }

    const route = routeData.routes[0];

    // 4. Return everything to React
    return res.json({
      success: true,
      data: {
        origin: start,
        destination: end,
        distanceKm: Number((route.distance / 1000).toFixed(2)),
        durationMinutes: Math.round(route.duration / 60),
        geometry: route.geometry,
      },
    });
  } catch (error) {
    console.error("Route calculation error:", error.message);

    return res.status(500).json({
      success: false,
      message: error.message || "Unable to calculate route.",
    });
  }
});

export default router;
