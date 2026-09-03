import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";

import "./Preferences.css";

const DEFAULT_INTERESTS = [
  { name: "Cricket", icon: "🏏" },
  { name: "Gym", icon: "🏋️" },
  { name: "Gaming", icon: "🎮" },
  { name: "Coffee", icon: "☕" },
  { name: "Study", icon: "📚" },
  { name: "Coding", icon: "💻" },
  { name: "Movies", icon: "🎬" },
  { name: "Walking", icon: "🚶" },
  { name: "Music", icon: "🎵" },
  { name: "Travel", icon: "✈️" },
  { name: "Photography", icon: "📸" },
  { name: "Food", icon: "🍕" },
];

const CUSTOM_ICON = "✨";

function Preferences() {
  const navigate = useNavigate();

  const [interests, setInterests] = useState([]);
  const [location, setLocation] = useState("");
  const [bio, setBio] = useState("");

  const [customInterest, setCustomInterest] =
    useState("");

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  // ========================================
  // LOAD PREFERENCES
  // ========================================

  useEffect(() => {
    let cancelled = false;

    const fetchPreferences = async () => {
      const token = localStorage.getItem("token");

      if (!token) {
        navigate("/login");
        return;
      }

      try {
        setLoading(true);
        setError("");

        const response = await fetch(
          "https://lets-go-backend-p4ox.onrender.com/api/users/preferences",
          {
            method: "GET",
            headers: {
              Authorization: `Bearer ${token}`,
              "Content-Type": "application/json",
            },
          }
        );

        const data = await response.json();

        if (!response.ok) {
          if (
            response.status === 401 ||
            response.status === 403
          ) {
            localStorage.removeItem("token");
            localStorage.removeItem("currentUser");
            navigate("/login");
            return;
          }

          throw new Error(
            data.message ||
              "Unable to load preferences."
          );
        }

        if (cancelled) return;

        const preferences = data.preferences || {};

        setInterests(
          Array.isArray(preferences.interests)
            ? preferences.interests
            : []
        );

        setLocation(
          preferences.location || ""
        );

        setBio(
          preferences.bio || ""
        );
      } catch (err) {
        if (!cancelled) {
          console.error(
            "Load preferences error:",
            err
          );

          setError(
            err.message ||
              "Unable to load preferences."
          );
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };

    fetchPreferences();

    return () => {
      cancelled = true;
    };
  }, [navigate]);

  // ========================================
  // TOGGLE INTEREST
  // ========================================

  const toggleInterest = (interest) => {
    setError("");
    setMessage("");

    setInterests((current) => {
      if (current.includes(interest)) {
        return current.filter(
          (item) => item !== interest
        );
      }

      return [...current, interest];
    });
  };

  // ========================================
  // ADD CUSTOM INTEREST
  // ========================================

  const addCustomInterest = () => {
    const value = customInterest.trim();

    if (!value) {
      setError(
        "Please enter an interest first."
      );
      return;
    }

    if (value.length > 50) {
      setError(
        "Interest must be 50 characters or less."
      );
      return;
    }

    const exists = interests.some(
      (interest) =>
        interest.toLowerCase() ===
        value.toLowerCase()
    );

    if (exists) {
      setError(
        "You've already added this interest."
      );
      return;
    }

    setInterests((current) => [
      ...current,
      value,
    ]);

    setCustomInterest("");
    setError("");
    setMessage("");
  };

  // ========================================
  // ENTER KEY
  // ========================================

  const handleCustomInterestKeyDown = (
    event
  ) => {
    if (event.key === "Enter") {
      event.preventDefault();
      addCustomInterest();
    }
  };

  // ========================================
  // REMOVE INTEREST
  // ========================================

  const removeInterest = (interest) => {
    setInterests((current) =>
      current.filter(
        (item) => item !== interest
      )
    );

    setError("");
    setMessage("");
  };

  // ========================================
  // SAVE
  // ========================================

  const handleSave = async (event) => {
    event.preventDefault();

    setError("");
    setMessage("");

    if (interests.length === 0) {
      setError(
        "Please select or add at least one interest."
      );
      return;
    }

    const token =
      localStorage.getItem("token");

    if (!token) {
      navigate("/login");
      return;
    }

    try {
      setSaving(true);

      const response = await fetch(
        "https://lets-go-backend-p4ox.onrender.com/api/users/preferences",
        {
          method: "PUT",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            interests,
            location: location.trim(),
            bio: bio.trim(),
          }),
        }
      );

      const data =
        await response.json();

      if (!response.ok) {
        if (
          response.status === 401 ||
          response.status === 403
        ) {
          localStorage.removeItem("token");
          localStorage.removeItem(
            "currentUser"
          );

          navigate("/login");
          return;
        }

        throw new Error(
          data.message ||
            "Unable to save preferences."
        );
      }

      // Update localStorage user
      try {
        const storedUser =
          localStorage.getItem(
            "currentUser"
          );

        if (storedUser) {
          const currentUser =
            JSON.parse(storedUser);

          localStorage.setItem(
            "currentUser",
            JSON.stringify({
              ...currentUser,
              interests,
              location: location.trim(),
              bio: bio.trim(),
            })
          );
        }
      } catch (storageError) {
        console.warn(
          "Could not update local user:",
          storageError
        );
      }

      setMessage(
        "Your preferences have been saved successfully! 🎉"
      );
    } catch (err) {
      console.error(
        "Save preferences error:",
        err
      );

      setError(
        err.message ||
          "Unable to save preferences."
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
      <div className="preferences-page">
        <div className="preferences-loading">
          <div className="preferences-loading-icon">
            ✨
          </div>

          <h2>
            Loading your preferences...
          </h2>

          <p>
            Getting everything ready for you.
          </p>
        </div>
      </div>
    );
  }

  // ========================================
  // PAGE
  // ========================================

  return (
    <div className="preferences-page">
      <main className="preferences-container">

        {/* BACK */}

        <button
          type="button"
          className="preferences-back"
          onClick={() =>
            navigate("/profile")
          }
        >
          ← Back to Profile
        </button>

        {/* HEADER */}

        <div className="preferences-header">

          <div className="preferences-header-icon">
            ✨
          </div>

          <div>
            <span>
              PERSONALIZE YOUR EXPERIENCE
            </span>

            <h1>
              Tell us what you love
            </h1>

            <p>
              Choose your interests so
              Let's Go can recommend
              activities you'll actually
              enjoy.
            </p>
          </div>

        </div>

        <form
          className="preferences-card"
          onSubmit={handleSave}
        >

          {/* ========================================
              INTERESTS
          ======================================== */}

          <section className="preferences-section">

            <div className="preferences-section-heading">

              <div>
                <span>
                  STEP 01
                </span>

                <h2>
                  Your interests
                </h2>
              </div>

              <strong>
                {interests.length} selected
              </strong>

            </div>

            <p className="preferences-description">
              Pick the activities and
              hobbies you're interested in.
              You can choose multiple or
              add your own.
            </p>

            {/* DEFAULT INTERESTS */}

            <div className="interest-grid">

              {DEFAULT_INTERESTS.map(
                (interest) => {
                  const selected =
                    interests.includes(
                      interest.name
                    );

                  return (
                    <button
                      type="button"
                      key={interest.name}
                      className={`interest-option ${
                        selected
                          ? "interest-option-selected"
                          : ""
                      }`}
                      onClick={() =>
                        toggleInterest(
                          interest.name
                        )
                      }
                    >
                      <span className="interest-icon">
                        {interest.icon}
                      </span>

                      <span className="interest-name">
                        {interest.name}
                      </span>

                      <span className="interest-check">
                        {selected
                          ? "✓"
                          : "+"}
                      </span>
                    </button>
                  );
                }
              )}

            </div>

            {/* CUSTOM INTEREST */}

            <div className="custom-interest-box">

              <div className="custom-interest-heading">

                <div>
                  <span className="custom-interest-icon">
                    ✨
                  </span>

                  <div>
                    <h3>
                      Can't find your interest?
                    </h3>

                    <p>
                      Add anything you're into.
                    </p>
                  </div>
                </div>

              </div>

              <div className="custom-interest-input">

                <input
                  type="text"
                  value={customInterest}
                  onChange={(event) =>
                    setCustomInterest(
                      event.target.value
                    )
                  }
                  onKeyDown={
                    handleCustomInterestKeyDown
                  }
                  placeholder="e.g. F1 Racing, Trekking, Anime..."
                  maxLength={50}
                />

                <button
                  type="button"
                  onClick={
                    addCustomInterest
                  }
                >
                  + Add
                </button>

              </div>

              <small>
                Press Enter to quickly add
              </small>

            </div>

            {/* SELECTED INTERESTS */}

            {interests.length > 0 && (
              <div className="selected-interests">

                <div className="selected-interests-title">
                  Your selected interests
                </div>

                <div className="selected-interest-list">

                  {interests.map(
                    (interest) => {

                      const defaultInterest =
                        DEFAULT_INTERESTS.find(
                          (item) =>
                            item.name ===
                            interest
                        );

                      return (
                        <div
                          className="selected-interest-chip"
                          key={interest}
                        >

                          <span>
                            {defaultInterest?.icon ||
                              CUSTOM_ICON}
                          </span>

                          <span>
                            {interest}
                          </span>

                          <button
                            type="button"
                            onClick={() =>
                              removeInterest(
                                interest
                              )
                            }
                            aria-label={`Remove ${interest}`}
                          >
                            ×
                          </button>

                        </div>
                      );
                    }
                  )}

                </div>
              </div>
            )}

          </section>

          {/* ========================================
              LOCATION
          ======================================== */}

          <section className="preferences-section">

            <div className="preferences-section-heading">

              <div>
                <span>
                  STEP 02
                </span>

                <h2>
                  Where are you?
                </h2>
              </div>

            </div>

            <p className="preferences-description">
              This helps us recommend
              activities and people near you.
            </p>

            <div className="preferences-input-wrapper">

              <span>
                📍
              </span>

              <input
                type="text"
                value={location}
                onChange={(event) =>
                  setLocation(
                    event.target.value
                  )
                }
                placeholder="e.g. Vadodara, Gujarat"
                maxLength={100}
              />

            </div>

          </section>

          {/* ========================================
              BIO
          ======================================== */}

          <section className="preferences-section">

            <div className="preferences-section-heading">

              <div>
                <span>
                  STEP 03
                </span>

                <h2>
                  About you
                </h2>
              </div>

            </div>

            <p className="preferences-description">
              Give people a quick idea
              about who you are.
            </p>

            <textarea
              className="preferences-textarea"
              value={bio}
              onChange={(event) =>
                setBio(event.target.value)
              }
              placeholder="Tell people a little about yourself..."
              maxLength={300}
              rows={5}
            />

            <div className="preferences-character-count">
              {bio.length}/300
            </div>

          </section>

          {/* SUCCESS */}

          {message && (
            <div className="preferences-success">
              <span>✓</span>
              {message}
            </div>
          )}

          {/* ERROR */}

          {error && (
            <div className="preferences-error">
              <span>!</span>
              {error}
            </div>
          )}

          {/* ACTIONS */}

          <div className="preferences-actions">

            <button
              type="button"
              className="preferences-cancel"
              onClick={() =>
                navigate("/profile")
              }
            >
              Cancel
            </button>

            <button
              type="submit"
              className="preferences-save"
              disabled={saving}
            >
              {saving
                ? "Saving..."
                : "Save Preferences →"}
            </button>

          </div>

        </form>

      </main>
    </div>
  );
}

export default Preferences;