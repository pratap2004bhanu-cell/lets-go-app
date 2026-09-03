import { Link, useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";
import Cropper from "react-easy-crop";
import { heicTo } from "heic-to";

const emojiMap = {
  Cricket: "🏏",
  Gym: "🏋️",
  Gaming: "🎮",
  Coffee: "☕",
  Study: "📚",
  Movies: "🎬",
  Walking: "🚶",
  Other: "✨",
};

function formatDate(date) {
  if (!date) return "Date not set";

  const parsedDate = new Date(date);

  if (Number.isNaN(parsedDate.getTime())) {
    return date;
  }

  return parsedDate.toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function getUserId(user) {
  if (!user) return null;

  return (
    user._id ||
    user.id ||
    user.userId ||
    null
  );
}

function getJoinedUserId(joinedUser) {
  if (!joinedUser) return null;

  if (
    joinedUser.userId &&
    typeof joinedUser.userId === "object"
  ) {
    return (
      joinedUser.userId._id ||
      joinedUser.userId.id ||
      joinedUser.userId.userId ||
      null
    );
  }

  return (
    joinedUser.userId ||
    joinedUser._id ||
    joinedUser.id ||
    null
  );
}

function Profile() {
  const navigate = useNavigate();

  const [user, setUser] = useState(null);
  const [activities, setActivities] = useState([]);
  const [joinedActivities, setJoinedActivities] =
    useState([]);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [hostRating, setHostRating] = useState(0);
  const [hostRatingCount, setHostRatingCount] = useState(0);
  const [hostRatingLoading, setHostRatingLoading] = useState(true);

  const [editing, setEditing] = useState(false);
  const [name, setName] = useState("");
  const [location, setLocation] = useState("");
  const [bio, setBio] = useState("");
  const [interests, setInterests] = useState([]);
  const [interestsText, setInterestsText] = useState("");
  const [avatar, setAvatar] = useState("");
  const [avatarFile, setAvatarFile] = useState(null);
  const [avatarPreview, setAvatarPreview] = useState("");

  // Profile photo crop editor
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState(null);
  const [showCropEditor, setShowCropEditor] = useState(false);

  const [saving, setSaving] = useState(false);

  const [deletingId, setDeletingId] =
    useState(null);

  // ========================================
  // LOGOUT
  // ========================================

  const handleLogout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("currentUser");
    localStorage.removeItem("rememberMe");

    navigate("/login");
  };

  // ========================================
  // LOAD PROFILE
  // ========================================

  useEffect(() => {
    const fetchProfile = async () => {
      const token =
        localStorage.getItem("token");

      if (!token) {
        setLoading(false);
        setUser(null);
        return;
      }

      try {
        setLoading(true);
        setError("");

        // ========================================
        // 1. GET USER PROFILE
        // ========================================

        const profileResponse =
          await fetch(
            "http://localhost:5001/api/users/profile",
            {
              method: "GET",
              headers: {
                Authorization:
                  `Bearer ${token}`,
              },
            }
          );

        const profileData =
          await profileResponse.json();

        if (!profileResponse.ok) {
          if (
            profileResponse.status === 401 ||
            profileResponse.status === 403
          ) {
            handleLogout();
            return;
          }

          throw new Error(
            profileData.message ||
              "Unable to fetch profile."
          );
        }

        const loggedInUser =
          profileData.user;

        setUser(loggedInUser);
        setName(
          loggedInUser.name || ""
        );
        setLocation(
          loggedInUser.location || ""
        );
        setBio(
          loggedInUser.bio || ""
        );
        setInterests(
          Array.isArray(loggedInUser.interests)
            ? loggedInUser.interests
            : []
        );
        setInterestsText(
          Array.isArray(loggedInUser.interests)
            ? loggedInUser.interests.join(", ")
            : ""
        );
        setAvatar(
          loggedInUser.avatar || ""
        );

        localStorage.setItem(
          "currentUser",
          JSON.stringify(loggedInUser)
        );

        // ========================================
        // GET RELIABLE USER ID
        // ========================================

        const currentUserId =
          getUserId(loggedInUser);

          // ========================================
// GET HOST REPUTATION
// ========================================

if (currentUserId) {
  try {
    const ratingResponse = await fetch(
      `http://localhost:5001/api/ratings/host/${currentUserId}`
    );

    const ratingData =
      await ratingResponse.json();

    if (ratingResponse.ok) {
      setHostRating(
        Number(ratingData.averageRating) || 0
      );

      setHostRatingCount(
        Number(ratingData.totalRatings) || 0
      );
    }
  } catch (ratingError) {
    console.error(
      "Host reputation error:",
      ratingError
    );
  } finally {
    setHostRatingLoading(false);
  }
} else {
  setHostRatingLoading(false);
}

        // ========================================
        // 2. GET CREATED ACTIVITIES
        // ========================================

        const createdResponse =
          await fetch(
            "http://localhost:5001/api/users/created-activities",
            {
              method: "GET",
              headers: {
                Authorization:
                  `Bearer ${token}`,
              },
            }
          );

        const createdData =
          await createdResponse.json();

        if (!createdResponse.ok) {
          if (
            createdResponse.status === 401 ||
            createdResponse.status === 403
          ) {
            handleLogout();
            return;
          }

          throw new Error(
            createdData.message ||
              "Unable to fetch created activities."
          );
        }

        setActivities(
          Array.isArray(
            createdData.activities
          )
            ? createdData.activities
            : []
        );

        // ========================================
        // 3. GET ALL ACTIVITIES
        // ========================================

        const activitiesResponse =
          await fetch(
            "http://localhost:5001/api/activities"
          );

        const activitiesData =
          await activitiesResponse.json();

        if (!activitiesResponse.ok) {
          throw new Error(
            activitiesData.message ||
              "Unable to fetch activities."
          );
        }

        const allActivities =
          Array.isArray(activitiesData)
            ? activitiesData
            : activitiesData.activities ||
              [];

        // ========================================
        // 4. FIND ACTIVITIES USER JOINED
        // ========================================

        const joined =
          allActivities.filter(
            (activity) => {
              if (
                !Array.isArray(
                  activity.joinedUsers
                )
              ) {
                return false;
              }

              return activity.joinedUsers.some(
                (joinedUser) => {
                  const joinedUserId =
                    getJoinedUserId(
                      joinedUser
                    );

                  return (
                    joinedUserId &&
                    currentUserId &&
                    String(joinedUserId) ===
                      String(currentUserId)
                  );
                }
              );
            }
          );

        setJoinedActivities(joined);
      } catch (error) {
        console.error(
          "Profile error:",
          error
        );

        setError(
          error.message ||
            "Unable to load your profile."
        );
      } finally {
        setLoading(false);
      }
    };

    fetchProfile();
  }, []);

  // ========================================
  // PROFILE PHOTO SELECTION
  // ========================================

  const handleAvatarChange = async (event) => {
    const file = event.target.files?.[0];

    if (!file) {
      return;
    }

    const allowedTypes = [
      "image/jpeg",
      "image/jpg",
      "image/heic",
      "image/heif",
    ];

    const allowedExtensions = [
      ".jpg",
      ".jpeg",
      ".heic",
      ".heif",
    ];

    const fileExtension = file.name
      .substring(file.name.lastIndexOf("."))
      .toLowerCase();

    if (
      !allowedTypes.includes(file.type) ||
      !allowedExtensions.includes(fileExtension)
    ) {
      setError(
        "Only JPG, JPEG, and HEIC photos are allowed."
      );
      event.target.value = "";
      return;
    }

    if (file.size > 50 * 1024 * 1024) {
      setError(
        "Profile photo must be smaller than 50 MB."
      );
      event.target.value = "";
      return;
    }

    try {
      setError("");
      setAvatarFile(file);
      setCrop({ x: 0, y: 0 });
      setZoom(1);
      setCroppedAreaPixels(null);

      let previewUrl;

      if (
        fileExtension === ".heic" ||
        fileExtension === ".heif"
      ) {
        const converted = await heicTo({
          blob: file,
          type: "image/jpeg",
          quality: 0.92,
        });

        previewUrl = URL.createObjectURL(converted);
      } else {
        previewUrl = URL.createObjectURL(file);
      }

      if (avatarPreview) {
        URL.revokeObjectURL(avatarPreview);
      }

      setAvatarPreview(previewUrl);
      setShowCropEditor(true);
    } catch (error) {
      console.error("Profile photo preview error:", error);
      setError(
        "Unable to preview this photo. Please try another image."
      );
      setAvatarFile(null);
      event.target.value = "";
    }
  };

  const handleCropComplete = (_, croppedPixels) => {
    setCroppedAreaPixels(croppedPixels);
  };

  const handleSetCrop = async () => {
    if (!croppedAreaPixels) {
      return;
    }

    try {
      const croppedFile = await createCroppedImage();

      if (!croppedFile) {
        return;
      }

      const croppedPreviewUrl = URL.createObjectURL(croppedFile);

      if (avatarPreview) {
        URL.revokeObjectURL(avatarPreview);
      }

      setAvatarFile(croppedFile);
      setAvatarPreview(croppedPreviewUrl);
      setCroppedAreaPixels(null);
      setShowCropEditor(false);
    } catch (error) {
      console.error("Set crop error:", error);
      setError("Unable to apply the crop. Please try again.");
    }
  };

  const handleCancelCrop = () => {
    if (avatarPreview) {
      URL.revokeObjectURL(avatarPreview);
    }

    setAvatarPreview("");
    setAvatarFile(null);
    setCroppedAreaPixels(null);
    setCrop({ x: 0, y: 0 });
    setZoom(1);
    setShowCropEditor(false);

    const input = document.getElementById("profile-avatar");
    if (input) {
      input.value = "";
    }
  };
  // ========================================
  // CREATE CROPPED PROFILE PHOTO
  // ========================================

  const createCroppedImage = async () => {
    if (!avatarPreview || !croppedAreaPixels) {
      return avatarFile;
    }

    const image = new Image();

    image.src = avatarPreview;

    await new Promise((resolve, reject) => {
      image.onload = resolve;
      image.onerror = reject;
    });

    const canvas = document.createElement("canvas");
    const ctx = canvas.getContext("2d");

    canvas.width = croppedAreaPixels.width;
    canvas.height = croppedAreaPixels.height;

    ctx.drawImage(
      image,
      croppedAreaPixels.x,
      croppedAreaPixels.y,
      croppedAreaPixels.width,
      croppedAreaPixels.height,
      0,
      0,
      croppedAreaPixels.width,
      croppedAreaPixels.height
    );

    const blob = await new Promise((resolve, reject) => {
      canvas.toBlob(
        (result) => {
          if (result) {
            resolve(result);
          } else {
            reject(
              new Error("Unable to create cropped photo.")
            );
          }
        },
        "image/jpeg",
        0.92
      );
    });

    return new File(
      [blob],
      "profile-photo.jpg",
      {
        type: "image/jpeg",
        lastModified: Date.now(),
      }
    );
  };

  // ========================================
  // SAVE PROFILE
  // ========================================

  const handleSave = async () => {
    const trimmedName =
      name.trim();

    if (!trimmedName) {
      setError(
        "Name cannot be empty."
      );
      return;
    }

    const token =
      localStorage.getItem("token");

    if (!token) {
      navigate("/login");
      return;
    }

    const cleanedInterests = [
      ...new Set(
        interestsText
          .split(",")
          .map((interest) =>
            interest.trim()
          )
          .filter(Boolean)
      ),
    ];

    try {
      setSaving(true);
      setError("");

      // Upload a newly selected profile photo first.
      let finalAvatar = avatar.trim();

      if (avatarFile) {
        const croppedFile = await createCroppedImage();

        const formData = new FormData();
        formData.append("avatar", croppedFile);

        const avatarResponse = await fetch(
          "http://localhost:5001/api/users/profile/avatar",
          {
            method: "POST",
            headers: {
              Authorization: `Bearer ${token}`,
            },
            body: formData,
          }
        );

        const avatarData = await avatarResponse.json();

        if (!avatarResponse.ok) {
          if (
            avatarResponse.status === 401 ||
            avatarResponse.status === 403
          ) {
            handleLogout();
            return;
          }

          setError(
            avatarData.message ||
              "Unable to upload profile photo."
          );

          return;
        }

        finalAvatar = avatarData.avatar || finalAvatar;
      }

      const response = await fetch(
        "http://localhost:5001/api/users/preferences",
        {
          method: "PUT",
          headers: {
            "Content-Type":
              "application/json",
            Authorization:
              `Bearer ${token}`,
          },
          body: JSON.stringify({
            interests: cleanedInterests,
            location:
              location.trim(),
            bio:
              bio.trim(),
            avatar: finalAvatar,
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
          handleLogout();
          return;
        }

        setError(
          data.message ||
            "Unable to update profile."
        );

        return;
      }

      const updatedUser = {
        ...(data.user || user),
        name: trimmedName,
        interests: cleanedInterests,
        location: location.trim(),
        bio: bio.trim(),
        avatar: finalAvatar,
      };

      // Keep the existing profile name endpoint as the
      // source of truth for the required name field.
      const nameResponse = await fetch(
        "http://localhost:5001/api/users/profile",
        {
          method: "PUT",
          headers: {
            "Content-Type":
              "application/json",
            Authorization:
              `Bearer ${token}`,
          },
          body: JSON.stringify({
            name: trimmedName,
          }),
        }
      );

      const nameData =
        await nameResponse.json();

      if (!nameResponse.ok) {
        if (
          nameResponse.status === 401 ||
          nameResponse.status === 403
        ) {
          handleLogout();
          return;
        }

        setError(
          nameData.message ||
            "Unable to update profile name."
        );

        return;
      }

      const finalUser = {
        ...(nameData.user || updatedUser),
        interests: cleanedInterests,
        location: location.trim(),
        bio: bio.trim(),
        avatar: finalAvatar,
      };

      setUser(finalUser);
      setName(finalUser.name || "");
      setLocation(finalUser.location || "");
      setBio(finalUser.bio || "");
      setInterests(
        Array.isArray(finalUser.interests)
          ? finalUser.interests
          : []
      );
      setInterestsText(
        Array.isArray(finalUser.interests)
          ? finalUser.interests.join(", ")
          : ""
      );
      setAvatar(finalUser.avatar || "");

      if (avatarPreview) {
        URL.revokeObjectURL(avatarPreview);
      }

      setAvatarFile(null);
      setAvatarPreview("");

      localStorage.setItem(
        "currentUser",
        JSON.stringify(finalUser)
      );

      setEditing(false);
    } catch (error) {
      console.error(
        "Update profile error:",
        error
      );

      setError(
        "Unable to connect to the server."
      );
    } finally {
      setSaving(false);
    }
  };

  // ========================================
  // DELETE CREATED ACTIVITY
  // ========================================

  const handleDeleteActivity =
    async (activityId) => {
      const confirmed =
        window.confirm(
          "Are you sure you want to delete this activity?"
        );

      if (!confirmed) {
        return;
      }

      const token =
        localStorage.getItem("token");

      if (!token) {
        navigate("/login");
        return;
      }

      try {
        setDeletingId(activityId);
        setError("");

        const response =
          await fetch(
            `http://localhost:5001/api/activities/${activityId}`,
            {
              method: "DELETE",
              headers: {
                Authorization:
                  `Bearer ${token}`,
              },
            }
          );

        const data =
          await response.json();

        if (!response.ok) {
          if (
            response.status === 401 ||
            response.status === 403
          ) {
            handleLogout();
            return;
          }

          setError(
            data.message ||
              "Unable to delete activity."
          );

          return;
        }

        // Remove from created activities
        setActivities(
          (current) =>
            current.filter(
              (activity) =>
                String(activity._id) !==
                String(activityId)
            )
        );

        // Remove from joined activities
        setJoinedActivities(
          (current) =>
            current.filter(
              (activity) =>
                String(activity._id) !==
                String(activityId)
            )
        );
      } catch (error) {
        console.error(
          "Delete activity error:",
          error
        );

        setError(
          "Unable to connect to the server."
        );
      } finally {
        setDeletingId(null);
      }
    };

  // ========================================
  // NOT LOGGED IN
  // ========================================

  if (!loading && !user) {
    return (
      <div className="profile-page">

        <div className="profile-empty">

          <div className="profile-empty-icon">
            🔐
          </div>

          <h1>
            You're not logged in
          </h1>

          <p>
            Login to view your profile
            and activities.
          </p>

          <Link
            to="/login"
            className="profile-primary-btn"
          >
            Login →
          </Link>

        </div>

      </div>
    );
  }

  // ========================================
  // LOADING
  // ========================================

  if (loading) {
    return (
      <div className="profile-page">

        <div className="profile-empty">

          <div className="profile-empty-icon">
            ⏳
          </div>

          <h1>
            Loading profile...
          </h1>

          <p>
            Getting your Let's Go
            profile ready.
          </p>

        </div>

      </div>
    );
  }

  // ========================================
  // MAIN PROFILE
  // ========================================

  return (
    <div className="profile-page">

      <div className="profile-glow profile-glow-one"></div>
      <div className="profile-glow profile-glow-two"></div>

      <main className="profile-container">

        {/* BACK */}

        <Link
          to="/discover"
          className="profile-back"
        >
          ← Back to Discover
        </Link>

        {/* ERROR */}

        {error && (
          <div className="login-error">
            {error}
          </div>
        )}

        {/* PROFILE HERO */}

        <section className="profile-hero">

          <div className="profile-avatar">
            {editing && avatarPreview ? (
              <img
                src={avatarPreview}
                alt="Profile preview"
              />
            ) : user?.avatar ? (
              <img
                src={user.avatar}
                alt={`${user.name || "User"} profile`}
              />
            ) : (
              user?.name
                ?.charAt(0)
                .toUpperCase()
            )}
          </div>

          <div className="profile-heading">

            <div className="profile-badge">
              ✦ MY PROFILE
            </div>

            {editing ? (
              <div className="profile-edit-form">

                <div className="profile-edit-field">
                  <label htmlFor="profile-name">
                    Name
                  </label>
                  <input
                    id="profile-name"
                    type="text"
                    value={name}
                    onChange={(e) =>
                      setName(e.target.value)
                    }
                    autoFocus
                    maxLength={50}
                  />
                </div>

                <div className="profile-edit-field">
                  <label htmlFor="profile-location">
                    Location
                  </label>
                  <input
                    id="profile-location"
                    type="text"
                    value={location}
                    onChange={(e) =>
                      setLocation(e.target.value)
                    }
                    placeholder="e.g. Vadodara"
                    maxLength={100}
                  />
                </div>

                <div className="profile-edit-field">
                  <label htmlFor="profile-bio">
                    About You
                  </label>
                  <textarea
                    id="profile-bio"
                    value={bio}
                    onChange={(e) =>
                      setBio(e.target.value)
                    }
                    placeholder="Tell people a little about yourself..."
                    maxLength={300}
                    rows={4}
                  />
                  <small>
                    {bio.length}/300
                  </small>
                </div>

                <div className="profile-edit-field">
                  <label htmlFor="profile-interests">
                    Interests
                  </label>
                  <input
                    id="profile-interests"
                    type="text"
                    value={interestsText}
                    onChange={(e) =>
                      setInterestsText(
                        e.target.value
                      )
                    }
                    placeholder="Cricket, Gaming, Coffee"
                  />
                  <small>
                    Separate interests with commas.
                  </small>
                </div>

                <div className="profile-edit-field">
                  <label htmlFor="profile-avatar">
                    Profile Photo
                  </label>

                  {showCropEditor && avatarPreview && (
                    <div className="profile-crop-editor">
                      <p className="profile-crop-hint">
                        Drag the photo to position it and use the slider to zoom.
                      </p>

                      <div className="profile-crop-area">
                        <Cropper
                          image={avatarPreview}
                          crop={crop}
                          zoom={zoom}
                          aspect={1}
                          cropShape="round"
                          showGrid={false}
                          onCropChange={setCrop}
                          onZoomChange={setZoom}
                          onCropComplete={handleCropComplete}
                        />
                      </div>

                      <div className="profile-crop-controls">
                        <label htmlFor="profile-photo-zoom">
                          Zoom
                        </label>

                        <input
                          id="profile-photo-zoom"
                          type="range"
                          min="1"
                          max="3"
                          step="0.01"
                          value={zoom}
                          onChange={(e) =>
                            setZoom(Number(e.target.value))
                          }
                        />

                        <div className="profile-crop-actions">
                          <button
                            type="button"
                            className="profile-save-btn"
                            onClick={handleSetCrop}
                          >
                            Set Photo
                          </button>

                          <button
                            type="button"
                            className="profile-cancel-btn"
                            onClick={handleCancelCrop}
                          >
                            Cancel
                          </button>
                        </div>
                      </div>
                    </div>
                  )}

                  <div className="profile-photo-upload">
                    <div className="profile-photo-upload-preview">
                      {avatarPreview ? (
                        <img
                          src={avatarPreview}
                          alt="Selected profile preview"
                        />
                      ) : avatar ? (
                        <img
                          src={avatar}
                          alt="Current profile"
                        />
                      ) : (
                        user?.name
                          ?.charAt(0)
                          .toUpperCase()
                      )}
                    </div>

                    <label
                      htmlFor="profile-avatar"
                      className="profile-photo-upload-btn"
                    >
                      {avatarFile
                        ? "Choose Different Photo"
                        : "Choose Photo"}
                    </label>

                    <input
                      id="profile-avatar"
                      type="file"
                     accept=".jpg,.jpeg,.heic,.heif,image/jpeg,image/jpg,image/heic,image/heif"
                      onChange={handleAvatarChange}
                      hidden
                    />

                    <small>
                      JPG, PNG, WEBP • Maximum 5 MB
                    </small>

                    {avatarFile && (
                      <small className="profile-photo-selected">
                        Selected: {avatarFile.name}
                      </small>
                    )}
                  </div>
                </div>

                <div className="profile-edit-actions">

                  <button
                    type="button"
                    className="profile-save-btn"
                    onClick={handleSave}
                    disabled={saving}
                  >
                    {saving
                      ? "Saving..."
                      : "Save"}
                  </button>

                  <button
                    type="button"
                    className="profile-cancel-btn"
                    onClick={() => {
                      setName(
                        user.name || ""
                      );
                      setLocation(
                        user.location || ""
                      );
                      setBio(
                        user.bio || ""
                      );
                      setInterests(
                        Array.isArray(
                          user.interests
                        )
                          ? user.interests
                          : []
                      );
                      setInterestsText(
                        Array.isArray(
                          user.interests
                        )
                          ? user.interests.join(", ")
                          : ""
                      );
                      if (avatarPreview) {
                        URL.revokeObjectURL(avatarPreview);
                      }

                      setAvatar(
                        user.avatar || ""
                      );
                      setAvatarFile(null);
                      setAvatarPreview("");
                      setEditing(false);
                      setError("");
                    }}
                    disabled={saving}
                  >
                    Cancel
                  </button>

                </div>

              </div>
            ) : (
              <>
                <h1>
                  {user.name}
                </h1>

                <p>
                  {user.email}
                  {user.location
                    ? ` • ${user.location}`
                    : ""}
                </p>

                {/* ========================================
                    PROFILE ACTIONS
                ======================================== */}

                <div className="profile-action-buttons">

                  <button
                    type="button"
                    className="profile-edit-btn"
                    onClick={() => {
                      setName(
                        user.name || ""
                      );
                      setLocation(
                        user.location || ""
                      );
                      setBio(
                        user.bio || ""
                      );
                      setInterests(
                        Array.isArray(user.interests)
                          ? user.interests
                          : []
                      );
                      setInterestsText(
                        Array.isArray(user.interests)
                          ? user.interests.join(", ")
                          : ""
                      );
                      setAvatar(
                        user.avatar || ""
                      );
                      setAvatarFile(null);

                      if (avatarPreview) {
                        URL.revokeObjectURL(avatarPreview);
                      }

                      setAvatarPreview("");
                      setEditing(true);
                      setError("");
                    }}
                  >
                    ✎ Edit Profile
                  </button>

                  <Link
                    to="/preferences"
                    className="profile-preferences-btn"
                  >
                    ⚙ Preferences
                    <span>→</span>
                  </Link>

                </div>

              </>
            )}

          </div>

        </section>

        {/* STATS */}

        <section className="profile-stats">

          <div className="profile-stat-card">

            <div className="stat-icon">
              🚀
            </div>

            <div>
              <strong>
                {activities.length}
              </strong>

              <span>
                Activities Created
              </span>
            </div>

          </div>

          <div className="profile-stat-card">

            <div className="stat-icon">
              👥
            </div>

            <div>
              <strong>
                {joinedActivities.length}
              </strong>

              <span>
                Activities Joined
              </span>
            </div>

          </div>

          <div className="profile-stat-card profile-reputation-stat">

  <div className="stat-icon">
    ⭐
  </div>

  <div>
    <strong>
      {hostRatingLoading
        ? "—"
        : hostRating > 0
        ? hostRating.toFixed(1)
        : "New"}
    </strong>

    <span>
      {hostRating > 0
        ? `${hostRatingCount} ${
            hostRatingCount === 1
              ? "Review"
              : "Reviews"
          }`
        : "Host Reputation"}
    </span>
  </div>

</div>

        </section>

        {/* CREATED ACTIVITIES */}

        <section className="profile-section">

          <div className="profile-section-heading">

            <div>

              <span>
                YOUR PLANS
              </span>

              <h2>
                Created Activities
              </h2>

            </div>

            <Link
              to="/create-activity"
              className="profile-create-btn"
            >
              + Create
            </Link>

          </div>

          {activities.length === 0 ? (

            <div className="profile-no-activities">

              <div>
                ✨
              </div>

              <h3>
                No activities yet
              </h3>

              <p>
                Create your first activity
                and bring people together.
              </p>

              <Link
                to="/create-activity"
                className="profile-primary-btn"
              >
                Create Activity →
              </Link>

            </div>

          ) : (

            <div className="profile-activity-list">

              {activities.map(
                (activity) => (

                  <div
                    className="profile-activity-card profile-joined-activity-card"
                    key={activity._id}
                  >

                    {/* ACTIVITY PHOTO */}
                    <div className="profile-activity-image">
                      {(
                        activity.image ||
                        activity.imageUrl ||
                        activity.photo ||
                        activity.photoUrl ||
                        activity.coverImage ||
                        activity.activityImage
                      ) ? (
                        <img
                          src={
                            activity.image ||
                            activity.imageUrl ||
                            activity.photo ||
                            activity.photoUrl ||
                            activity.coverImage ||
                            activity.activityImage
                          }
                          alt={activity.title || "Activity"}
                          loading="lazy"
                        />
                      ) : (
                        <div className="profile-activity-image-fallback">
                          {emojiMap[
                            activity.category
                          ] || "✨"}
                        </div>
                      )}
                    </div>

                    {/* ACTIVITY INFORMATION */}
                    <div className="profile-activity-content">

                      <div className="profile-activity-category">
                        <span>
                          {emojiMap[
                            activity.category
                          ] || "✨"}
                        </span>

                        {activity.category}
                      </div>

                      <h3>
                        {activity.title}
                      </h3>

                      {activity.description && (
                        <p className="profile-activity-description">
                          {activity.description}
                        </p>
                      )}

                      <div className="profile-activity-meta">

                        <span>
                          📍 {activity.location}
                        </span>

                        <span>
                          📅 {formatDate(
                            activity.date
                          )}
                        </span>

                        <span>
                          🕐 {activity.time || "Flexible"}
                        </span>

                      </div>

                    </div>

                    {/* STATUS + ACTIONS */}
                    <div className="profile-activity-right">

                      <div className="profile-activity-status">
                        <span className="profile-status-dot"></span>
                        Upcoming
                      </div>

                      <div className="profile-activity-actions">

                        <Link
                          to={`/activity/${activity._id}`}
                          className="profile-view-btn"
                        >
                          <span>◉</span>
                          View
                        </Link>

                        <Link
                          to={`/edit-activity/${activity._id}`}
                          className="profile-edit-activity-btn"
                        >
                          <span>✎</span>
                          Edit
                        </Link>

                        <button
                          type="button"
                          className="profile-delete-btn"
                          onClick={() =>
                            handleDeleteActivity(
                              activity._id
                            )
                          }
                          disabled={
                            deletingId ===
                            activity._id
                          }
                        >
                          <span>♜</span>
                          {deletingId ===
                          activity._id
                            ? "Deleting..."
                            : "Delete"}
                        </button>

                      </div>

                    </div>

                  </div>
                )
              )}

            </div>

          )}

        </section>

        {/* JOINED ACTIVITIES */}

        <section className="profile-section profile-joined-activities-section" data-section="joined-activities">

          <div className="profile-section-heading">

            <div>

              <span>
                YOUR CONNECTIONS
              </span>

              <h2>
                Joined Activities
              </h2>

            </div>

          </div>

          {joinedActivities.length === 0 ? (

            <div className="profile-no-activities">

              <div>
                🤝
              </div>

              <h3>
                No joined activities yet
              </h3>

              <p>
                Find something you enjoy
                and join people nearby.
              </p>

              <Link
                to="/discover"
                className="profile-primary-btn"
              >
                Discover Activities →
              </Link>

            </div>

          ) : (

            <div className="profile-activity-list">

              {joinedActivities.map(
                (activity) => (

                  <div
                    className="profile-activity-card"
                    key={activity._id}
                  >

                    {/* ACTIVITY PHOTO */}
                    <div className="profile-activity-image">
                      {(
                        activity.image ||
                        activity.imageUrl ||
                        activity.photo ||
                        activity.photoUrl ||
                        activity.coverImage ||
                        activity.activityImage
                      ) ? (
                        <img
                          src={
                            activity.image ||
                            activity.imageUrl ||
                            activity.photo ||
                            activity.photoUrl ||
                            activity.coverImage ||
                            activity.activityImage
                          }
                          alt={activity.title || "Activity"}
                          loading="lazy"
                        />
                      ) : (
                        <div className="profile-activity-image-fallback">
                          {emojiMap[
                            activity.category
                          ] || "✨"}
                        </div>
                      )}
                    </div>

                    {/* ACTIVITY INFORMATION */}
                    <div className="profile-activity-content">

                      <div className="profile-activity-category">
                        <span>
                          {emojiMap[
                            activity.category
                          ] || "✨"}
                        </span>

                        {activity.category}
                      </div>

                      <h3>
                        {activity.title}
                      </h3>

                      {activity.description && (
                        <p className="profile-activity-description">
                          {activity.description}
                        </p>
                      )}

                      <div className="profile-activity-meta">

                        <span>
                          📍 {activity.location}
                        </span>

                        <span>
                          📅 {formatDate(
                            activity.date
                          )}
                        </span>

                        <span>
                          🕐 {activity.time || "Flexible"}
                        </span>

                      </div>

                    </div>

                    {/* JOINED STATUS + ACTION */}
                    <div className="profile-activity-right">

                      <div className="profile-activity-status profile-joined-status">
                        <span className="profile-status-dot"></span>
                        Joined
                      </div>

                      <Link
                        to={`/activity/${activity._id}`}
                        className="profile-view-btn"
                      >
                        <span>◉</span>
                        View →
                      </Link>

                    </div>

                  </div>
                )
              )}

            </div>

          )}

        </section>

        {/* LOGOUT */}

        <section className="profile-logout-section">

  <div className="profile-logout-icon">
    ⇥
  </div>

  <div className="profile-logout-divider"></div>

  <div className="profile-logout-content">

    <span className="profile-logout-label">
      ACCOUNT SECURITY
    </span>

    <h2>
      SIGN OUT OF YOUR ACCOUNT
    </h2>

    <p>
      You'll be logged out from your account and all active sessions.
    </p>

  </div>

  <div className="profile-logout-action">

    <span className="profile-secure-status">
      🛡 SECURE SESSION <i></i>
    </span>

    <button
      type="button"
      className="profile-logout-btn"
      onClick={handleLogout}
    >
      <span>⇥</span>
      Logout
    </button>

  </div>

</section>

      </main>

    </div>
  );
}

export default Profile;