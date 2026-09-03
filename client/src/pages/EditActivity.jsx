import { Link, useNavigate, useParams } from "react-router-dom";
import { useEffect, useState } from "react";
import {
  MapContainer,
  TileLayer,
  Marker,
  useMap,
  useMapEvents,
} from "react-leaflet";
import "leaflet/dist/leaflet.css";

function EditMapController({ position }) {
  const map = useMap();

  useEffect(() => {
    if (
      Array.isArray(position) &&
      typeof position[0] === "number" &&
      typeof position[1] === "number"
    ) {
      map.invalidateSize(false);
      map.setView(position, 15, { animate: false });
    }
  }, [map, position]);

  return null;
}

function EditLocationMarker({
  position,
  onLocationChange,
}) {
  useMapEvents({
    click(event) {
      onLocationChange(
        event.latlng.lat,
        event.latlng.lng
      );
    },
  });

  return null;
}

function EditActivity() {
  const { id } = useParams();
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

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  // ========================================
  // MAP LOCATION
  // ========================================

  const defaultMapPosition = [22.3072, 73.1812];

  // ========================================
  // GET ID FROM ANY USER FORMAT
  // ========================================

  const getUserId = (user) => {
    if (!user) return null;

    return (
      user._id ||
      user.id ||
      user.userId ||
      user.user?._id ||
      user.user?.id ||
      user.user?.userId ||
      null
    );
  };

  // ========================================
  // LOAD ACTIVITY
  // ========================================

  useEffect(() => {
    const fetchActivity = async () => {
      try {
        setLoading(true);
        setError("");

        const token = localStorage.getItem("token");

        if (!token) {
          navigate("/login");
          return;
        }

        // ----------------------------------------
        // GET CURRENT USER
        // ----------------------------------------

        let currentUser = null;

        try {
          const storedUser = localStorage.getItem("currentUser");

          if (storedUser) {
            currentUser = JSON.parse(storedUser);
          }
        } catch (parseError) {
          console.error(
            "Unable to parse currentUser:",
            parseError
          );
        }

        if (!currentUser) {
          navigate("/login");
          return;
        }

        // ----------------------------------------
        // FETCH ACTIVITY
        // ----------------------------------------

        const response = await fetch(
          `http://localhost:5001/api/activities/${id}`,
          {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          }
        );

        const data = await response.json();

        console.log("================================");
        console.log("EDIT ACTIVITY RESPONSE:", data);
        console.log("================================");

        if (!response.ok) {
          throw new Error(
            data.message || "Unable to fetch activity."
          );
        }

        // ----------------------------------------
        // SUPPORT BOTH:
        // data
        // AND
        // data.activity
        // ----------------------------------------

        const activity = data.activity || data;

        if (!activity) {
          throw new Error("Activity not found.");
        }

        // ----------------------------------------
        // GET CURRENT USER ID
        // ----------------------------------------

        const currentUserId = getUserId(currentUser);

        // ----------------------------------------
        // GET ACTIVITY CREATOR ID
        // ----------------------------------------

        let creatorId = activity.creatorId;

        if (
          creatorId &&
          typeof creatorId === "object"
        ) {
          creatorId =
            creatorId._id ||
            creatorId.id ||
            creatorId.userId;
        }

        // Some APIs may return creator instead
        if (!creatorId && activity.creator) {
          creatorId =
            typeof activity.creator === "object"
              ? activity.creator._id ||
                activity.creator.id ||
                activity.creator.userId
              : activity.creator;
        }

        console.log("================================");
        console.log("EDIT PERMISSION CHECK");
        console.log("Activity Creator ID:", creatorId);
        console.log("Current User ID:", currentUserId);
        console.log(
          "Same User:",
          String(creatorId) === String(currentUserId)
        );
        console.log("================================");

        // ----------------------------------------
        // CREATOR PERMISSION
        // ----------------------------------------

        if (!currentUserId) {
          setError(
            "Unable to identify the logged-in user."
          );
          return;
        }

        if (!creatorId) {
          setError(
            "Unable to identify the activity creator."
          );
          return;
        }

        if (
          String(creatorId) !==
          String(currentUserId)
        ) {
          setError(
            "You are not allowed to edit this activity."
          );
          return;
        }

        // ----------------------------------------
        // LOAD FORM DATA
        // ----------------------------------------

        setFormData({
          title: activity.title || "",
          category: activity.category || "Cricket",
          location: activity.location || "",
          latitude:
            typeof activity.latitude === "number"
              ? activity.latitude
              : null,
          longitude:
            typeof activity.longitude === "number"
              ? activity.longitude
              : null,
          date: activity.date || "",
          time: activity.time || "",
          maxPeople: String(
            activity.maxPeople || 5
          ),
          description: activity.description || "",
        });
      } catch (error) {
        console.error(
          "Fetch activity for edit error:",
          error
        );

        setError(
          error.message ||
            "Unable to load activity."
        );
      } finally {
        setLoading(false);
      }
    };

    if (id) {
      fetchActivity();
    }
  }, [id, navigate]);

  // ========================================
  // HANDLE INPUT
  // ========================================

  const handleChange = (e) => {
    const { name, value } = e.target;

    setFormData((previous) => ({
      ...previous,
      [name]: value,
    }));

    setError("");
  };

  // ========================================
  // CANCEL
  // ========================================

  const handleCancel = () => {
    navigate(`/activity/${id}`);
  };

  // ========================================
  // SAVE CHANGES
  // ========================================

  const handleSubmit = async (e) => {
    e.preventDefault();

    const token = localStorage.getItem("token");

    if (!token) {
      navigate("/login");
      return;
    }

    // ----------------------------------------
    // VALIDATION
    // ----------------------------------------

    if (
      !formData.title.trim() ||
      !formData.location.trim() ||
      !formData.date ||
      !formData.time
    ) {
      setError(
        "Please fill in all required fields."
      );
      return;
    }

    const maxPeople = Number(
      formData.maxPeople
    );

    if (
      Number.isNaN(maxPeople) ||
      maxPeople < 2 ||
      maxPeople > 100
    ) {
      setError(
        "Maximum people must be between 2 and 100."
      );
      return;
    }

    try {
      setSaving(true);
      setError("");

      const response = await fetch(
        `http://localhost:5001/api/activities/${id}`,
        {
          method: "PUT",

          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },

          body: JSON.stringify({
            title: formData.title.trim(),
            category: formData.category,
            location: formData.location.trim(),
            latitude:
              typeof formData.latitude === "number"
                ? formData.latitude
                : null,
            longitude:
              typeof formData.longitude === "number"
                ? formData.longitude
                : null,
            date: formData.date,
            time: formData.time,
            maxPeople,
            description:
              formData.description.trim(),
          }),
        }
      );

      const data = await response.json();

      console.log(
        "UPDATE ACTIVITY RESPONSE:",
        data
      );

      if (!response.ok) {
        throw new Error(
          data.message ||
            "Unable to update activity."
        );
      }

      // ----------------------------------------
      // SUCCESS
      // ----------------------------------------

      navigate(`/activity/${id}`);
    } catch (error) {
      console.error(
        "Update activity error:",
        error
      );

      setError(
        error.message ||
          "Unable to update activity."
      );
    } finally {
      setSaving(false);
    }
  };

  // ========================================
  // LOADING
  // ========================================

  if (loading) {
    return (
      <div className="create-v2-page">

        <div className="create-v2-glow create-v2-glow-one"></div>
        <div className="create-v2-glow create-v2-glow-two"></div>

        <div className="create-v2-heading">

          <div className="create-v2-badge">
            ✦ LOADING
          </div>

          <h1>Loading Activity...</h1>

          <p>
            Please wait while we load your activity.
          </p>

        </div>

      </div>
    );
  }

  // ========================================
  // ERROR
  // ========================================

  if (error && !formData.title) {
    return (
      <div className="create-v2-page">

        <div className="create-v2-glow create-v2-glow-one"></div>
        <div className="create-v2-glow create-v2-glow-two"></div>

        <Link
          to={`/activity/${id}`}
          className="create-v2-back"
        >
          ← Back to Activity
        </Link>

        <section className="create-v2-heading">

          <div className="create-v2-badge">
            ✦ ERROR
          </div>

          <h1>Unable to Edit</h1>

          <p>{error}</p>

          <Link
            to={`/activity/${id}`}
            className="create-v2-submit"
          >
            Back to Activity →
          </Link>

        </section>

      </div>
    );
  }

  // ========================================
  // MAIN FORM
  // ========================================

  return (
    <div className="create-v2-page">

      {/* Background */}

      <div className="create-v2-glow create-v2-glow-one"></div>

      <div className="create-v2-glow create-v2-glow-two"></div>

      {/* Back */}

      <Link
        to={`/activity/${id}`}
        className="create-v2-back"
      >
        ← Back to Activity
      </Link>

      {/* Heading */}

      <section className="create-v2-heading">

        <div className="create-v2-badge">
          ✦ EDIT MODE
        </div>

        <h1>
          Edit Activity
        </h1>

        <p>
          Make changes to your plan and keep
          everyone in the loop.
        </p>

        <div
          style={{
            marginTop: "18px",
            display: "inline-flex",
            alignItems: "center",
            gap: "8px",
            padding: "9px 14px",
            borderRadius: "999px",
            border:
              "1px solid rgba(139, 92, 246, 0.28)",
            background:
              "rgba(139, 92, 246, 0.08)",
            color: "#b9a3ff",
            fontSize: "13px",
            fontWeight: 600,
          }}
        >
          ✦ Changes are saved to this activity
        </div>

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

          <input
            type="text"
            name="location"
            value={formData.location}
            onChange={handleChange}
            placeholder="e.g. Vadodara"
            required
          />

          <div
            style={{
              marginTop: "14px",
              borderRadius: "16px",
              overflow: "hidden",
              border:
                "1px solid rgba(255,255,255,0.08)",
            }}
          >
            <div
              style={{
                padding: "12px 14px",
                background:
                  "rgba(255,255,255,0.025)",
                color: "#8994ad",
                fontSize: "12px",
                lineHeight: 1.5,
              }}
            >
              📍 Click on the map to update the exact activity location.
            </div>

            <div
              style={{
                width: "100%",
                height: "320px",
              }}
            >
              <MapContainer
                key={
                  typeof formData.latitude === "number" &&
                  typeof formData.longitude === "number"
                    ? `${formData.latitude}-${formData.longitude}`
                    : "default-location"
                }
                center={
                  typeof formData.latitude === "number" &&
                  typeof formData.longitude === "number"
                    ? [
                        formData.latitude,
                        formData.longitude,
                      ]
                    : defaultMapPosition
                }
                zoom={
                  typeof formData.latitude === "number" &&
                  typeof formData.longitude === "number"
                    ? 15
                    : 12
                }
                scrollWheelZoom={true}
                className="edit-activity-map"
              >
                <EditMapController
                  position={
                    typeof formData.latitude === "number" &&
                    typeof formData.longitude === "number"
                      ? [formData.latitude, formData.longitude]
                      : defaultMapPosition
                  }
                />

                <TileLayer
                  attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
                  url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                />

                {typeof formData.latitude === "number" &&
                  typeof formData.longitude === "number" && (
                    <Marker
                      key={`edit-marker-${formData.latitude}-${formData.longitude}`}
                      position={[
                        formData.latitude,
                        formData.longitude,
                      ]}
                    />
                  )}

                <EditLocationMarker
                  position={
                    typeof formData.latitude === "number" &&
                    typeof formData.longitude === "number"
                      ? [
                          formData.latitude,
                          formData.longitude,
                        ]
                      : null
                  }
                  onLocationChange={(latitude, longitude) => {
                    setFormData((previous) => ({
                      ...previous,
                      latitude,
                      longitude,
                    }));
                    setError("");
                  }}
                />
              </MapContainer>
            </div>
          </div>

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
          <div
            className="create-v2-error"
            role="alert"
            style={{
              display: "flex",
              alignItems: "center",
              gap: "10px",
            }}
          >
            <span aria-hidden="true">
              ⚠️
            </span>

            <span>
              {error}
            </span>

          </div>
        )}

        {/* Actions */}

        <div
          style={{
            display: "grid",
            gridTemplateColumns:
              "1fr 180px",
            gap: "14px",
            marginTop: "8px",
          }}
        >

          <button
            type="submit"
            className="create-v2-submit"
            disabled={saving}
          >

            {saving ? (
              <>
                ⏳
                <span>
                  Saving Changes...
                </span>
              </>
            ) : (
              <>
                💾
                <span>
                  Save Changes
                </span>

                <strong>
                  →
                </strong>
              </>
            )}

          </button>

          <button
            type="button"
            onClick={handleCancel}
            disabled={saving}
            style={{
              border:
                "1px solid rgba(255,255,255,0.12)",
              borderRadius: "14px",
              background:
                "rgba(255,255,255,0.04)",
              color: "#c7c9d9",
              fontSize: "15px",
              fontWeight: 700,
              cursor: saving
                ? "not-allowed"
                : "pointer",
              transition:
                "all 0.2s ease",
              opacity: saving ? 0.55 : 1,
            }}
          >
            ↩ Cancel
          </button>

        </div>

        <p
          style={{
            marginTop: "14px",
            textAlign: "center",
            color:
              "rgba(190,195,215,0.65)",
            fontSize: "12px",
          }}
        >
          You can cancel anytime before saving.
        </p>

      </form>

      {/* Footer */}

      <p className="create-v2-footer">
        Update <span>plans.</span>{" "}
        Keep people <span>informed.</span>{" "}
        Let's <b>Go.</b>
      </p>

    </div>
  );
}

export default EditActivity;