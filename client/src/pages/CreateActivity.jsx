import { Link, useNavigate } from "react-router-dom";

import { useEffect, useState } from "react";

import {
  MapContainer,
  TileLayer,
  Marker,
  useMap,
  useMapEvents,
} from "react-leaflet";

import "leaflet/dist/leaflet.css";

function MapController({ position }) {
  const map = useMap();

  useEffect(() => {
    if (position) {
      map.setView([position.lat, position.lng], 15, {
        animate: true,
      });
    }
  }, [map, position]);

  return null;
}

function LocationMarker({ position, setPosition }) {
  useMapEvents({
    click(e) {
      setPosition({
        lat: e.latlng.lat,
        lng: e.latlng.lng,
      });
    },
  });

  return position ? (
    <Marker position={[position.lat, position.lng]} />
  ) : null;
}

function CreateActivity() {
  const navigate = useNavigate();

  const [formData, setFormData] = useState({
    title: "",
    category: "Cricket",
    location: "",
    latitude: null,
    longitude: null,
    date: "",
    time: "",
    maxPeople: "5",
    description: "",
  });

  const [mapPosition, setMapPosition] = useState(null);

  // Location enhancement states
  const [locationSearch, setLocationSearch] = useState("");
  const [locationResults, setLocationResults] = useState([]);
  const [locationSearching, setLocationSearching] = useState(false);
  const [locationSearchError, setLocationSearchError] = useState("");
  const [locating, setLocating] = useState(false);

  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });

    setError("");
  };

  // ========================================
  // APPLY SELECTED LOCATION
  // ========================================

  const applyLocation = (latitude, longitude, label = "") => {
    const position = {
      lat: Number(latitude),
      lng: Number(longitude),
    };

    if (
      !Number.isFinite(position.lat) ||
      !Number.isFinite(position.lng)
    ) {
      return;
    }

    setMapPosition(position);

    setFormData((prev) => ({
      ...prev,
      latitude: position.lat,
      longitude: position.lng,
      ...(label ? { location: label } : {}),
    }));
  };

  // ========================================
  // SEARCH LOCATION
  // ========================================

  const handleLocationSearch = async () => {
    const query = locationSearch.trim();

    if (!query) {
      setLocationResults([]);
      setLocationSearchError("Enter a place to search.");
      return;
    }

    try {
      setLocationSearching(true);
      setLocationSearchError("");
      setLocationResults([]);

      const response = await fetch(
        `https://nominatim.openstreetmap.org/search?format=jsonv2&limit=5&q=${encodeURIComponent(
          query
        )}`
      );

      if (!response.ok) {
        throw new Error("Unable to search for that place.");
      }

      const data = await response.json();

      setLocationResults(Array.isArray(data) ? data : []);

      if (!data.length) {
        setLocationSearchError(
          "No places found. Try another search."
        );
      }
    } catch (error) {
      console.error("LOCATION SEARCH ERROR:", error);

      setLocationSearchError(
        error.message || "Unable to search for that place."
      );

      setLocationResults([]);
    } finally {
      setLocationSearching(false);
    }
  };

  // ========================================
  // SELECT SEARCH RESULT
  // ========================================

  const handleLocationResultSelect = (result) => {
    const label =
      result.display_name
        ?.split(",")
        .slice(0, 3)
        .join(",")
        .trim() ||
      result.display_name ||
      locationSearch;

    applyLocation(result.lat, result.lon, label);

    setLocationSearch(label);
    setLocationResults([]);
    setLocationSearchError("");
  };

  // ========================================
  // USE CURRENT LOCATION
  // ========================================

  const handleUseCurrentLocation = () => {
    if (!navigator.geolocation) {
      setLocationSearchError(
        "Your browser does not support location services."
      );
      return;
    }

    setLocating(true);
    setLocationSearchError("");

    navigator.geolocation.getCurrentPosition(
      async ({ coords }) => {
        const latitude = coords.latitude;
        const longitude = coords.longitude;

        try {
          // Reverse geocode current location
          const response = await fetch(
            `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${latitude}&lon=${longitude}`
          );

          if (response.ok) {
            const data = await response.json();

            const readableLocation =
              data.display_name
                ?.split(",")
                .slice(0, 3)
                .join(",")
                .trim();

            applyLocation(
              latitude,
              longitude,
              readableLocation || "Current Location"
            );

            setLocationSearch(
              readableLocation || "Current Location"
            );
          } else {
            applyLocation(
              latitude,
              longitude,
              "Current Location"
            );

            setLocationSearch("Current Location");
          }
        } catch (error) {
          console.error(
            "CURRENT LOCATION REVERSE GEOCODE ERROR:",
            error
          );

          applyLocation(
            latitude,
            longitude,
            "Current Location"
          );

          setLocationSearch("Current Location");
        } finally {
          setLocating(false);
        }
      },
      (error) => {
        console.error("CURRENT LOCATION ERROR:", error);

        setLocating(false);

        setLocationSearchError(
          error.code === 1
            ? "Location permission was denied."
            : "Unable to get your current location."
        );
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 60000,
      }
    );
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    // Get JWT token
    const token = localStorage.getItem("token");

    if (!token) {
      setError("Please login before creating an activity.");
      return;
    }

    // Basic validation
    if (
      !formData.title.trim() ||
      !formData.location.trim() ||
      !formData.date ||
      !formData.time
    ) {
      setError("Please fill in all required fields.");
      return;
    }

    const maxPeople = Number(formData.maxPeople);

    if (maxPeople < 2 || maxPeople > 100) {
      setError("Maximum people must be between 2 and 100.");
      return;
    }

    try {
      setLoading(true);
      setError("");

      // Send activity to backend
      const response = await fetch(
        "http://localhost:5001/api/activities",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },

          body: JSON.stringify({
            title: formData.title.trim(),
            category: formData.category,
            location: formData.location.trim(),
            latitude: formData.latitude,
            longitude: formData.longitude,
            date: formData.date,
            time: formData.time,
            maxPeople: maxPeople,
            description: formData.description.trim(),
          }),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        setError(data.message || "Unable to create activity.");
        return;
      }

      // Activity successfully saved in MongoDB
      console.log("Activity created:", data.activity);

      // Go to Discover
      navigate("/discover");
    } catch (error) {
      console.error("Create activity error:", error);

      setError(
        "Unable to connect to the server. Make sure the backend is running."
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="create-v2-page">

      {/* Background glow */}
      <div className="create-v2-glow create-v2-glow-one"></div>

      <div className="create-v2-glow create-v2-glow-two"></div>

      {/* Back */}
      <Link
        to="/discover"
        className="create-v2-back"
      >
        ← Back to Discover
      </Link>

      {/* Header */}
      <section className="create-v2-heading">

        <div className="create-v2-badge">
          ✦ CREATE SOMETHING
        </div>

        <h1>
          Create an Activity
        </h1>

        <p>
          Plan something fun and bring people together.
        </p>

      </section>

      {/* Form */}
      <form
        className="create-v2-form"
        onSubmit={handleSubmit}
      >

        {/* Activity Name */}
        <div className="create-v2-field">

          <label>
            <span className="create-v2-label-icon">
              ✎
            </span>

            Activity Name *
          </label>

          <input
            type="text"
            name="title"
            value={formData.title}
            onChange={handleChange}
            placeholder="e.g. Sunday Cricket Match"
            required
          />

        </div>

        {/* Category */}
        <div className="create-v2-field">

          <label>
            <span className="create-v2-label-icon">
              ▦
            </span>

            Category *
          </label>

          <select
            name="category"
            value={formData.category}
            onChange={handleChange}
            required
          >

            <option value="Cricket">
              🏏 Cricket
            </option>

            <option value="Gym">
              🏋️ Gym
            </option>

            <option value="Gaming">
              🎮 Gaming
            </option>

            <option value="Coffee">
              ☕ Coffee
            </option>

            <option value="Study">
              📚 Study
            </option>

            <option value="Movies">
              🎬 Movies
            </option>

            <option value="Walking">
              🚶 Walking
            </option>

            <option value="Other">
              ✨ Other
            </option>

          </select>

        </div>

        {/* Location */}
        <div className="create-v2-field">

          <label>
            <span className="create-v2-label-icon">
              ⌖
            </span>

            Location *
          </label>

          {/* Location input + My Location */}
          <div
            style={{
              display: "flex",
              gap: "10px",
              alignItems: "stretch",
              marginBottom: "10px",
            }}
          >

            <input
              type="text"
              name="location"
              value={formData.location}
              onChange={handleChange}
              placeholder="e.g. Sayaji Garden, Vadodara"
              required
              style={{
                flex: 1,
                minWidth: 0,
              }}
            />

            <button
              type="button"
              onClick={handleUseCurrentLocation}
              disabled={locating}
              style={{
                flexShrink: 0,
                border: "1px solid rgba(34, 211, 238, 0.25)",
                borderRadius: "12px",
                padding: "0 14px",
                background: "rgba(34, 211, 238, 0.08)",
                color: "#67e8f9",
                fontSize: "13px",
                fontWeight: 700,
                cursor: locating ? "wait" : "pointer",
                opacity: locating ? 0.65 : 1,
              }}
            >
              {locating
                ? "Locating..."
                : "📍 My Location"}
            </button>

          </div>

          {/* Search place */}
          <div
            style={{
              display: "flex",
              gap: "10px",
              marginBottom: "10px",
            }}
          >

            <input
              type="text"
              value={locationSearch}
              onChange={(event) => {
                setLocationSearch(event.target.value);
                setLocationSearchError("");
              }}
              onKeyDown={(event) => {
                if (event.key === "Enter") {
                  event.preventDefault();
                  handleLocationSearch();
                }
              }}
              placeholder="🔎 Search for a place..."
              style={{
                flex: 1,
                minWidth: 0,
              }}
            />

            <button
              type="button"
              onClick={handleLocationSearch}
              disabled={locationSearching}
              style={{
                flexShrink: 0,
                border: "1px solid rgba(148, 163, 184, 0.2)",
                borderRadius: "12px",
                padding: "0 18px",
                background: "rgba(148, 163, 184, 0.08)",
                color: "#e2e8f0",
                fontSize: "13px",
                fontWeight: 700,
                cursor: locationSearching
                  ? "wait"
                  : "pointer",
                opacity: locationSearching ? 0.65 : 1,
              }}
            >
              {locationSearching
                ? "Searching..."
                : "Search"}
            </button>

          </div>

          {/* Search results */}
          {locationResults.length > 0 && (
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                gap: "6px",
                marginBottom: "12px",
                padding: "8px",
                border:
                  "1px solid rgba(148, 163, 184, 0.15)",
                borderRadius: "12px",
                background: "rgba(15, 23, 42, 0.75)",
              }}
            >

              {locationResults.map((result, index) => (
                <button
                  key={`${
                    result.place_id ||
                    result.osm_id ||
                    "place"
                  }-${index}`}
                  type="button"
                  onClick={() =>
                    handleLocationResultSelect(result)
                  }
                  style={{
                    width: "100%",
                    padding: "11px 12px",
                    border: "0",
                    borderRadius: "9px",
                    background:
                      "rgba(255, 255, 255, 0.04)",
                    color: "inherit",
                    textAlign: "left",
                    cursor: "pointer",
                    lineHeight: 1.4,
                  }}
                >
                  📍 {result.display_name}
                </button>
              ))}

            </div>
          )}

          {/* Location errors */}
          {locationSearchError && (
            <p
              style={{
                marginTop: "6px",
                marginBottom: "10px",
                color: "#f87171",
                fontSize: "13px",
              }}
            >
              {locationSearchError}
            </p>
          )}

          <p
            style={{
              marginTop: "10px",
              marginBottom: "10px",
              opacity: 0.7,
            }}
          >
            📍 Search for a place, use your location, or click
            directly on the map to select the exact meeting point.
          </p>

          {/* Map */}
          <div
            style={{
              width: "100%",
              height: "300px",
              borderRadius: "14px",
              overflow: "hidden",
              marginTop: "10px",
            }}
          >

            <MapContainer
              center={
                mapPosition
                  ? [
                      mapPosition.lat,
                      mapPosition.lng,
                    ]
                  : [22.3072, 73.1812]
              }
              zoom={mapPosition ? 15 : 12}
              style={{
                width: "100%",
                height: "100%",
              }}
            >

              <TileLayer
                attribution="&copy; OpenStreetMap contributors"
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
              />

              <MapController
                position={mapPosition}
              />

              <LocationMarker
                position={mapPosition}
                setPosition={(position) => {
                  setMapPosition(position);

                  setFormData((prev) => ({
                    ...prev,
                    latitude: position.lat,
                    longitude: position.lng,
                  }));

                  setLocationSearchError("");
                }}
              />

            </MapContainer>

          </div>

          {/* Selected coordinates */}
          {mapPosition && (
            <p
              style={{
                marginTop: "8px",
                opacity: 0.7,
              }}
            >
              ✓ Exact meeting point selected:{" "}
              {mapPosition.lat.toFixed(5)},{" "}
              {mapPosition.lng.toFixed(5)}
            </p>
          )}

        </div>

        {/* Date + Time */}
        <div className="create-v2-row">

          <div className="create-v2-field">

            <label>
              <span className="create-v2-label-icon">
                ▣
              </span>

              Date *
            </label>

            <input
              type="date"
              name="date"
              value={formData.date}
              onChange={handleChange}
              required
            />

          </div>

          <div className="create-v2-field">

            <label>
              <span className="create-v2-label-icon">
                ◷
              </span>

              Time *
            </label>

            <input
              type="time"
              name="time"
              value={formData.time}
              onChange={handleChange}
              required
            />

          </div>

        </div>

        {/* Maximum People + Description */}
        <div className="create-v2-row">

          <div className="create-v2-field">

            <label>
              <span className="create-v2-label-icon">
                ♟
              </span>

              Maximum People *
            </label>

            <input
              type="number"
              name="maxPeople"
              value={formData.maxPeople}
              onChange={handleChange}
              min="2"
              max="100"
              placeholder="e.g. 10"
              required
            />

          </div>

          <div className="create-v2-field">

            <label>
              <span className="create-v2-label-icon">
                ▣
              </span>

              Description

              <span className="optional-text">
                Optional
              </span>
            </label>

            <textarea
              name="description"
              value={formData.description}
              onChange={handleChange}
              placeholder="Tell people what you're planning..."
              rows="1"
            />

          </div>

        </div>

        {/* Error */}
        {error && (
          <div className="create-v2-error">
            {error}
          </div>
        )}

        {/* Submit */}
        <button
          type="submit"
          className="create-v2-submit"
          disabled={loading}
        >

          {loading ? (
            <>
              ⏳
              <span>
                Creating Activity...
              </span>
            </>
          ) : (
            <>
              🚀
              <span>
                Create Activity
              </span>
              <strong>
                →
              </strong>
            </>
          )}

        </button>

      </form>

      {/* Bottom message */}
      <p className="create-v2-footer">

        Make <span>plans.</span>{" "}

        Meet <span>people.</span>{" "}

        Create <b>memories.</b>

      </p>

    </div>
  );
}

export default CreateActivity;