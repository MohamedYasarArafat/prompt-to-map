import { useState, useRef, useEffect } from "react";
import "./App.css";
import MapView from "./MapView.jsx";

function Icon({ name, size = 20, ...props }) {
  const common = {
    width: size,
    height: size,
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: 1.7,
    strokeLinecap: "round",
    strokeLinejoin: "round",
    "aria-hidden": true,
    ...props,
  };

  const paths = {
    navigation: (
      <>
        <path d="m3 11 18-8-8 18-2-8-8-2Z" />
        <path d="m11 13 5-5" />
      </>
    ),
    arrow: (
      <>
        <path d="M7 17 17 7" />
        <path d="M7 7h10v10" />
      </>
    ),
    send: (
      <>
        <path d="m22 2-7 20-4-9-9-4Z" />
        <path d="M22 2 11 13" />
      </>
    ),
    mic: (
      <>
        <rect x="9" y="2" width="6" height="12" rx="3" />
        <path d="M5 10v2a7 7 0 0 0 14 0v-2M12 19v3m-4 0h8" />
      </>
    ),
    pin: (
      <>
        <path d="M20 10c0 5-8 12-8 12S4 15 4 10a8 8 0 1 1 16 0Z" />
        <circle cx="12" cy="10" r="2.5" />
      </>
    ),
    locate: (
      <>
        <circle cx="12" cy="12" r="7" />
        <circle cx="12" cy="12" r="2" />
        <path d="M12 2v3m0 14v3M2 12h3m14 0h3" />
      </>
    ),
    clock: (
      <>
        <circle cx="12" cy="12" r="9" />
        <path d="M12 7v5l3 2" />
      </>
    ),
    route: (
      <>
        <circle cx="6" cy="18" r="2" />
        <circle cx="18" cy="6" r="2" />
        <path d="M8 18h4a3 3 0 0 0 3-3V9a3 3 0 0 1 3-3" />
      </>
    ),
    plus: <path d="M12 5v14m-7-7h14" />,
    compass: (
      <>
        <circle cx="12" cy="12" r="9" />
        <path d="m15.5 8.5-2 5-5 2 2-5 5-2Z" />
      </>
    ),
    spark: (
      <path d="M12 2v20M2 12h20M4.93 4.93l14.14 14.14M19.07 4.93 4.93 19.07" />
    ),
  };

  return <svg {...common}>{paths[name] || null}</svg>;
}

const suggestions = [
  "Find the fastest route to Chennai",
  "திருச்சியிலிருந்து மதுரைக்கு செல்ல வழி காட்டு",
  "Show nearby petrol stations",
];

export default function App() {
  const [prompt, setPrompt] = useState("");
  const recognitionRef = useRef(null);
  const [isListening, setIsListening] = useState(false);
  const [voiceError, setVoiceError] = useState("");
  const [routeData, setRouteData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [clarification, setClarification] = useState("");
  const [loadingMessage, setLoadingMessage] = useState("");
  const [currentLocation, setCurrentLocation] = useState(null);
  const [locationLoading, setLocationLoading] = useState(true);
  const [locationError, setLocationError] = useState("");
  const [voiceLanguage, setVoiceLanguage] = useState("en-IN");

  useEffect(() => {
    if (!navigator.geolocation) {
      setLocationError("Geolocation is not supported by this browser.");
      setLocationLoading(false);
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        setCurrentLocation({
          lat: position.coords.latitude,
          lon: position.coords.longitude,
        });

        setLocationLoading(false);
      },
      (error) => {
        console.error("Location error:", error);

        setLocationError(
          error.code === 1
            ? "Please allow location access to detect your current location."
            : "Unable to detect your location. Please try again.",
        );

        setLocationLoading(false);
      },
      {
        enableHighAccuracy: true,
        timeout: 15000,
        maximumAge: 60000,
      },
    );
  }, []);

  async function handleSubmit(event) {
    event.preventDefault();
    setLoading(true);
    setLoadingMessage("Understanding your journey...");
    setError("");
    setClarification("");
    setRouteData(null);

    const userPrompt = String(prompt || "").trim();

    if (!userPrompt || loading) return;

    setLoading(true);
    setError("");
    setClarification("");
    setRouteData(null);

    try {
      // STEP 1: Understand the user's journey using Gemini
      const understandResponse = await fetch(
        `https://prompt-to-map-dbmq.vercel.app/api/understand-route`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            prompt: userPrompt,
          }),
        },
      );

      const understandResult = await understandResponse.json();

      if (!understandResponse.ok || !understandResult.success) {
        throw new Error(
          understandResult.message || "Unable to understand your journey.",
        );
      }

      const journey = understandResult.data;

      // Use current location as the default starting point
      if (
        currentLocation &&
        journey.destination &&
        (!journey.origin || journey.origin === "CURRENT_LOCATION")
      ) {
        journey.origin = "CURRENT_LOCATION";
        journey.needsClarification = false;
        journey.clarificationQuestion = null;
      }

      // Ask the user if important journey details are missing
      if (journey.needsClarification) {
        setClarification(
          journey.clarificationQuestion ||
            "Please provide your starting point and destination.",
        );
        return;
      }
      setLoadingMessage("Finding the best route...");

      if (journey.origin === "CURRENT_LOCATION" && !currentLocation) {
        throw new Error(
          "Your current location is unavailable. Please allow location access.",
        );
      }
      // STEP 2: Calculate the actual route using OSRM
      const routeResponse = await fetch(
        `https://prompt-to-map-dbmq.vercel.app/api/route`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            origin: journey.origin,
            destination: journey.destination,
            travelMode: journey.travelMode,
            originCoordinates:
              journey.origin === "CURRENT_LOCATION" ? currentLocation : null,
          }),
        },
      );

      const routeResult = await routeResponse.json();

      if (!routeResponse.ok || !routeResult.success) {
        throw new Error(
          routeResult.message || "Unable to calculate your route.",
        );
      }

      // STEP 3: Save route data for the map and summary
      setRouteData(routeResult.data);

      console.log("Gemini response:", journey);
      console.log("Calculated route:", routeResult.data);
    } catch (err) {
      console.error("Navigation error:", err);
      setError(err.message || "Something went wrong.");
    } finally {
      setLoading(false);
      setLoadingMessage("");
    }
  }

  function useSuggestion(value) {
    setPrompt(value);
  }

  function handleVoiceInput() {
    setVoiceError("");

    const SpeechRecognition =
      window.SpeechRecognition || window.webkitSpeechRecognition;

    if (!SpeechRecognition) {
      setVoiceError(
        "Voice input is not supported in this browser. Please try Google Chrome.",
      );
      return;
    }

    // If the microphone is already active, stop listening.
    if (recognitionRef.current && isListening) {
      recognitionRef.current.stop();
      return;
    }

    const recognition = new SpeechRecognition();

    // recognition.lang = "en-IN"; // Initial voice input language
    recognition.lang = voiceLanguage;
    recognition.continuous = false;
    recognition.interimResults = true;
    recognition.maxAlternatives = 1;

    recognition.onstart = () => {
      setIsListening(true);
    };

    recognition.onresult = (event) => {
      let transcript = "";

      for (let i = event.resultIndex; i < event.results.length; i++) {
        transcript += event.results[i][0].transcript;
      }

      setPrompt(transcript.trim());
    };

    recognition.onerror = (event) => {
      console.error("Voice recognition error:", event.error);

      if (event.error === "not-allowed") {
        setVoiceError("Please allow microphone access in your browser.");
      } else if (event.error === "no-speech") {
        setVoiceError("No speech detected. Please try again.");
      } else {
        setVoiceError("Unable to recognize your voice. Please try again.");
      }
    };

    recognition.onend = () => {
      setIsListening(false);
    };

    recognitionRef.current = recognition;

    try {
      recognition.start();
    } catch (error) {
      console.error("Unable to start voice recognition:", error);
      setIsListening(false);
      setVoiceError("Unable to start the microphone. Please try again.");
    }
  }

  return (
    <main className="app-shell">
      <div className="grain-overlay" aria-hidden="true" />

      {/* Top bar: branding and workspace navigation */}
      <header className="topbar">
        <a className="brand" href="#" aria-label="Wayfinder AI home">
          <span className="brand-mark">
            <i />
            <i />
            <i />
          </span>
          <span>
            WAYFINDER<span className="brand-slash">/</span>AI
          </span>
        </a>

        <div className="topbar-center">
          <span className="status-dot" />
          SMART NAVIGATION
        </div>

        <a
          className="topbar-link"
          href="https://github.com/"
          target="_blank"
          rel="noreferrer"
        >
          GITHUB <Icon name="arrow" size={14} />
        </a>
      </header>

      {/* Main banner: retained from the original design, with navigation copy */}
      <section className="hero-heading">
        <div className="hero-kicker">
          <span className="kicker-line" />
          YOUR JOURNEY. UNDERSTOOD.
        </div>

        <h1>
          FIND YOUR
          <br />
          <span>WAY.</span>
          <sup>®</sup>
        </h1>

        <div className="hero-bottom">
          <p>
            Tell us where you want to go.
            <br className="desktop-break" />
            We'll help you find the way.
          </p>
          <div className="hero-index">
            <span>LESS SEARCHING.</span>
            <span>
              MORE EXPLORING. <b>↘</b>
            </span>
          </div>
        </div>
      </section>

      {/* Main workspace: prompt panel on the left, map canvas on the right */}
      <section className="workspace navigation-workspace">
        <aside className="control-panel prompt-panel">
          <div className="panel-heading">
            <div>
              <span className="section-index">01 / YOUR JOURNEY</span>
              <h2>Where to?</h2>
            </div>
            <Icon name="compass" size={21} />
          </div>

          <div className="field-label">
            <span>DESCRIBE YOUR JOURNEY</span>
            <span className="field-optional">ANY LANGUAGE</span>
          </div>

          <form onSubmit={handleSubmit}>
            <div className="prompt-wrap navigation-prompt-wrap">
              <textarea
                value={prompt}
                onChange={(event) => setPrompt(event.target.value)}
                placeholder="Describe your journey..."
                rows={7}
                maxLength={1500}
                aria-label="Describe your journey"
              />

              <div className="prompt-footer">
                <span>
                  <Icon name="spark" size={14} /> AUTOMATIC LANGUAGE DETECTION
                </span>
                <span>{prompt.length} / 1500</span>
              </div>
            </div>

            <div className="prompt-actions">
              <select
                value={voiceLanguage}
                onChange={(e) => setVoiceLanguage(e.target.value)}
                disabled={isListening}
              >
                <option value="en-IN">English</option>
                <option value="ta-IN">தமிழ் (Tamil)</option>
                <option value="hi-IN">हिन्दी (Hindi)</option>
                <option value="te-IN">తెలుగు (Telugu)</option>
                <option value="kn-IN">ಕನ್ನಡ (Kannada)</option>
                <option value="ml-IN">മലയാളം (Malayalam)</option>
              </select>
              <button
                type="button"
                onClick={handleVoiceInput}
                className={`mic-button ${isListening ? "listening" : ""}`}
                title={isListening ? "Stop listening" : "Speak your journey"}
              >
                {isListening ? "Listening..." : "🎙"}
              </button>
              {voiceError && <p className="error-message">{voiceError}</p>}
              {/* {loading && (
                <p className="status-message">
                  Understanding your journey and calculating the route...
                </p>
              )} */}
              {loading && (
                <div className="loading-indicator">
                  <div className="loading-spinner"></div>
                  <span>{loadingMessage}</span>
                </div>
              )}
              {error && <p className="error-message">{error}</p>}

              {clarification && (
                <p className="status-message">{clarification}</p>
              )}
              <button
                className="generate-button navigation-submit"
                type="submit"
                disabled={!prompt.trim()}
              >
                FIND MY ROUTE <Icon name="send" size={17} />
              </button>
            </div>
          </form>

          <div className="suggestions-block">
            <div className="field-label">
              <span>TRY ASKING</span>
              <span className="field-optional">QUICK PROMPTS</span>
            </div>

            <div className="suggestion-list">
              {suggestions.map((suggestion) => (
                <button
                  type="button"
                  className="suggestion-chip"
                  key={suggestion}
                  onClick={() => useSuggestion(suggestion)}
                >
                  <span>{suggestion}</span>
                  <Icon name="arrow" size={14} />
                </button>
              ))}
            </div>
          </div>

          <div className="language-note">
            <span className="note-symbol">✳</span>
            <span>
              SPEAK NATURALLY.
              <br />
              WE UNDERSTAND YOUR LANGUAGE.
            </span>
          </div>
        </aside>

        <section className="preview-panel map-panel">
          <div className="preview-toolbar">
            <div className="preview-title">
              <span className="section-index">02 / MAP VIEW</span>
              <h2>Your route appears here.</h2>
            </div>

            <div className="preview-controls map-controls">
              <div className="viewport-indicator">
                <span className="status-dot" />
                <span>MAP READY</span>
              </div>
            </div>
          </div>

          <div className="map-canvas">
            <MapView
              routeData={routeData}
              currentLocation={currentLocation}
              locationLoading={locationLoading}
              locationError={locationError}
            />
          </div>

          {routeData && (
            <div className="preview-footer route-summary">
              <div className="footer-stat">
                <span className="footer-stat-icon">
                  <Icon name="pin" size={17} />
                </span>
                <div>
                  <span className="stat-label">STARTING POINT</span>
                  <strong>{routeData.origin.name}</strong>
                </div>
              </div>

              <div className="footer-stat">
                <span className="footer-stat-icon">
                  <Icon name="route" size={17} />
                </span>
                <div>
                  <span className="stat-label">DISTANCE</span>
                  <strong>{routeData.distanceKm} km</strong>
                </div>
              </div>

              <div className="footer-stat footer-stat-last">
                <span className="footer-stat-icon">
                  <Icon name="clock" size={17} />
                </span>
                <div>
                  <span className="stat-label">ESTIMATED TIME</span>
                  <strong>
                    {Math.floor(routeData.durationMinutes / 60)}h{" "}
                    {routeData.durationMinutes % 60}m
                  </strong>
                </div>
              </div>
            </div>
          )}
        </section>
      </section>

      {/* Bottom footer: retained from the original design */}
      <footer className="site-footer">
        <span>WAYFINDER / AI® — YOUR JOURNEY, REIMAGINED.</span>
        <span>BUILT TO HELP YOU FIND THE WAY.</span>
        <a href="#top" onClick={(event) => event.preventDefault()}>
          BACK TO TOP ↑
        </a>
      </footer>
    </main>
  );
}
