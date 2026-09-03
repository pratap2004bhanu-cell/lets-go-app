import { Link } from "react-router-dom";
import { useEffect, useMemo, useState } from "react";

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

const categories = [
  { name: "All", emoji: "✨" },
  { name: "Cricket", emoji: "🏏" },
  { name: "Gym", emoji: "🏋️" },
  { name: "Gaming", emoji: "🎮" },
  { name: "Coffee", emoji: "☕" },
  { name: "Study", emoji: "📚" },
  { name: "Movies", emoji: "🎬" },
  { name: "Walking", emoji: "🚶" },
  { name: "Other", emoji: "✨" },
];

// ========================================
// CALCULATE DISTANCE BETWEEN TWO LOCATIONS
// ========================================

function calculateDistance(lat1, lon1, lat2, lon2) {
  const earthRadiusKm = 6371;

  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);

  const c =
    2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return earthRadiusKm * c;
}

// ========================================
// FORMAT DATE
// ========================================

function formatDate(date) {
  if (!date) {
    return "Date not set";
  }

  const parsedDate = new Date(date);

  if (Number.isNaN(parsedDate.getTime())) {
    return date;
  }

  return parsedDate.toLocaleDateString(
    "en-IN",
    {
      day: "2-digit",
      month: "short",
      year: "numeric",
    }
  );
}

// ========================================
// GET USER ID
// ========================================

function getUserId(user) {
  if (!user) {
    return null;
  }

  if (typeof user === "object") {
    return (
      user._id ||
      user.id ||
      user.userId ||
      null
    );
  }

  return user;
}

// ========================================
// GET INITIALS
// ========================================

function getInitials(name) {
  if (!name) {
    return "U";
  }

  return name
    .trim()
    .split(/\s+/)
    .map(
      (word) => word.charAt(0)
    )
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

// ========================================
// GET CURRENT USER
// ========================================

function getCurrentUser() {
  try {
    const storedUser =
      localStorage.getItem(
        "currentUser"
      );

    if (!storedUser) {
      return null;
    }

    return JSON.parse(
      storedUser
    );
  } catch (error) {
    console.error(
      "Unable to read currentUser:",
      error
    );

    return null;
  }
}

// ========================================
// CHECK CREATOR
// ========================================

function isActivityCreator(
  activity,
  currentUser
) {
  const currentUserId =
    getUserId(currentUser);

  const creatorId =
    getUserId(
      activity?.creatorId
    );

  if (
    !currentUserId ||
    !creatorId
  ) {
    return false;
  }

  return (
    String(currentUserId) ===
    String(creatorId)
  );
}

// ========================================
// DISCOVER
// ========================================

function Discover() {
  const [activities, setActivities] =
    useState([]);

  const [loading, setLoading] =
    useState(true);

  const [error, setError] =
    useState("");

  const [search, setSearch] =
    useState("");

  const [selectedCategory, setSelectedCategory] =
    useState("All");

  const [showAvailableOnly, setShowAvailableOnly] =
  useState(false);

const [dateFilter, setDateFilter] =
  useState("all");

const [distanceFilter, setDistanceFilter] =
  useState("25");

const [groupSizeFilter, setGroupSizeFilter] =
  useState("all");

const [sortBy, setSortBy] =
  useState("recommended");

  const [currentUser, setCurrentUser] =
    useState(null);
    const [userPreferences, setUserPreferences] =
  useState([]);

  const [userCoordinates, setUserCoordinates] =
    useState(null);

  const [locationStatus, setLocationStatus] =
    useState("Detecting your location...");

  const [currentTime] = useState(() => Date.now());

  // ========================================
  // GET CURRENT USER
  // ========================================

  useEffect(() => {
    const loadUserPreferences = async () => {
      try {
        const storedUser = getCurrentUser();
        setCurrentUser(storedUser);

        const token =
          localStorage.getItem("token");

        if (!token) {
          setUserPreferences([]);
          return;
        }

        const response = await fetch(
          "http://localhost:5001/api/users/preferences",
          {
            method: "GET",
            headers: {
              Authorization:
                `Bearer ${token}`,
              "Content-Type":
                "application/json",
            },
          }
        );

        const data =
          await response.json();

        if (!response.ok) {
          console.error(
            "Unable to load preferences:",
            data.message || "Unknown error"
          );

          setUserPreferences([]);
          return;
        }

        const interests =
          Array.isArray(
            data?.preferences?.interests
          )
            ? data.preferences.interests
            : [];

        setUserPreferences(interests);

        console.log(
          "User interests:",
          interests
        );
      } catch (error) {
        console.error(
          "User preference loading error:",
          error
        );

        setUserPreferences([]);
      }
    };

    loadUserPreferences();
  }, []);

  // ========================================
  // GET USER'S CURRENT GPS LOCATION
  // ========================================

  useEffect(() => {
    if (!navigator.geolocation) {
      console.error(
        "Location services are not supported by this browser."
      );

      setLocationStatus(
        "Location services are not supported by this browser."
      );

      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const coordinates = {
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
        };

        setUserCoordinates(coordinates);

        setLocationStatus(
          `Location detected: ${coordinates.latitude.toFixed(5)}, ${coordinates.longitude.toFixed(5)}`
        );
      },
      (error) => {
        console.error(
          "Unable to get user location:",
          error
        );

        setLocationStatus(
          "Unable to detect your location. Please allow location access."
        );
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 300000,
      }
    );
  }, []);

  // ========================================
  // FETCH ACTIVITIES
  // ========================================

  const fetchActivities =
    async () => {
      try {
        setLoading(true);
        setError("");

        const response =
          await fetch(
            "http://localhost:5001/api/activities"
          );

        const data =
          await response.json();

        if (!response.ok) {
          throw new Error(
            data.message ||
              "Unable to fetch activities."
          );
        }

        const activityList =
          Array.isArray(data)
            ? data
            : data.activities || [];

        setActivities(
          activityList
        );
      } catch (error) {
        console.error(
          "Fetch activities error:",
          error
        );

        setError(
          "Unable to load activities. Make sure the backend is running."
        );
      } finally {
        setLoading(false);
      }
    };

  useEffect(() => {
  const timer = setTimeout(() => {
    fetchActivities();
  }, 0);

  return () => {
    clearTimeout(timer);
  };
}, []);


 // ========================================
      // SMART MATCHING SCORE
      // ========================================

      const calculateMatchScore = (activity) => {
        if (
          !activity ||
          !Array.isArray(userPreferences) ||
          userPreferences.length === 0
        ) {
          return 0;
        }

        const activityCategory = String(
          activity.category || ""
        ).trim().toLowerCase();

        const activityTitle = String(
          activity.title || ""
        ).trim().toLowerCase();

        const activityDescription = String(
          activity.description || ""
        ).trim().toLowerCase();

        const normalizedInterests = userPreferences
          .map((interest) =>
            String(interest || "").trim().toLowerCase()
          )
          .filter(Boolean);

        // ========================================
        // 1. INTEREST COMPATIBILITY - 50 POINTS
        // ========================================

        let interestScore = 0;

        const exactCategoryMatch = normalizedInterests.find(
          (interest) => interest === activityCategory
        );

        if (exactCategoryMatch) {
          interestScore = 50;
        } else {
          const titleMatch = normalizedInterests.some(
            (interest) => activityTitle.includes(interest)
          );

          const descriptionMatch = normalizedInterests.some(
            (interest) => activityDescription.includes(interest)
          );

          if (titleMatch) {
            interestScore = 40;
          } else if (descriptionMatch) {
            interestScore = 25;
          }
        }

        // ========================================
        // 2. REAL DISTANCE - 25 POINTS
        // ========================================

        let distanceScore = 0;

        if (
          userCoordinates &&
          typeof activity.latitude === "number" &&
          typeof activity.longitude === "number"
        ) {
          const distance = calculateDistance(
            userCoordinates.latitude,
            userCoordinates.longitude,
            activity.latitude,
            activity.longitude
          );

          if (distance <= 1) {
            distanceScore = 25;
          } else if (distance <= 3) {
            distanceScore = 22;
          } else if (distance <= 5) {
            distanceScore = 19;
          } else if (distance <= 10) {
            distanceScore = 15;
          } else if (distance <= 15) {
            distanceScore = 10;
          } else if (distance <= 25) {
            distanceScore = 5;
          }
        } else {
          // Fallback for older activities without coordinates.
          const activityLocation = String(
            activity.location || ""
          ).trim().toLowerCase();

          const userLocation = String(
            currentUser?.location || ""
          ).trim().toLowerCase();

          if (userLocation && activityLocation) {
            if (activityLocation === userLocation) {
              distanceScore = 25;
            } else if (
              activityLocation.includes(userLocation) ||
              userLocation.includes(activityLocation)
            ) {
              distanceScore = 18;
            } else {
              const locationWords = userLocation
                .split(/[\s,]+/)
                .filter((word) => word.length >= 3);

              if (
                locationWords.some((word) =>
                  activityLocation.includes(word)
                )
              ) {
                distanceScore = 10;
              }
            }
          }
        }

        // ========================================
        // 3. ACTIVITY TIMING - 10 POINTS
        // ========================================

        let timingScore = 0;

        if (activity.date) {
          let activityDateTime = null;
          const dateValue = String(activity.date).trim();
          const timeValue = String(activity.time || "").trim();

          if (/^\d{4}-\d{2}-\d{2}$/.test(dateValue)) {
            activityDateTime = new Date(
              `${dateValue}T${timeValue || "23:59"}`
            );
          } else {
            activityDateTime = new Date(dateValue);
          }

          const activityTime = activityDateTime.getTime();

          if (!Number.isNaN(activityTime)) {
            const hoursUntil =
              (activityTime - currentTime) /
              (1000 * 60 * 60);

            if (hoursUntil >= 0 && hoursUntil <= 24) {
              timingScore = 10;
            } else if (hoursUntil > 24 && hoursUntil <= 72) {
              timingScore = 8;
            } else if (hoursUntil > 72 && hoursUntil <= 168) {
              timingScore = 6;
            } else if (hoursUntil > 168 && hoursUntil <= 336) {
              timingScore = 3;
            } else if (hoursUntil > 336) {
              timingScore = 1;
            }
          }
        }

        // ========================================
        // 4. AVAILABILITY - 10 POINTS
        // ========================================

        const playerCount = Array.isArray(activity.joinedUsers)
          ? activity.joinedUsers.length
          : 0;

        const maxPeople = Number(activity.maxPeople) || 0;
        let availabilityScore = 0;

        if (maxPeople > 0) {
          const remaining = Math.max(
            maxPeople - playerCount,
            0
          );

          const availabilityRatio = remaining / maxPeople;

          if (remaining === 0) {
            availabilityScore = 0;
          } else if (availabilityRatio >= 0.75) {
            availabilityScore = 10;
          } else if (availabilityRatio >= 0.5) {
            availabilityScore = 8;
          } else if (availabilityRatio >= 0.25) {
            availabilityScore = 5;
          } else {
            availabilityScore = 2;
          }
        }

        // ========================================
        // 5. FRESHNESS - 5 POINTS
        // ========================================

        let freshnessScore = 0;

        if (activity.createdAt) {
          const createdTime = new Date(
            activity.createdAt
          ).getTime();

          if (!Number.isNaN(createdTime)) {
            const ageInDays = Math.max(
              0,
              (currentTime - createdTime) /
                (1000 * 60 * 60 * 24)
            );

            if (ageInDays <= 1) {
              freshnessScore = 5;
            } else if (ageInDays <= 3) {
              freshnessScore = 4;
            } else if (ageInDays <= 7) {
              freshnessScore = 3;
            } else if (ageInDays <= 14) {
              freshnessScore = 1;
            }
          }
        }

        return Math.min(
          100,
          interestScore +
            distanceScore +
            timingScore +
            availabilityScore +
            freshnessScore
        );
      };

  // ========================================
  // FILTER + SEARCH + SORT
  // ========================================

  const filteredActivities =
    useMemo(() => {

     
     

      // ========================================
      // SEARCH
      // ========================================

      const normalizedSearch =
        search
          .trim()
          .toLowerCase();

      // ========================================
      // FILTER ACTIVITIES
      // ========================================

      const result =
        activities.filter((activity) => {
          const title =
            String(
              activity.title || ""
            ).toLowerCase();

          const description =
            String(
              activity.description || ""
            ).toLowerCase();

          const location =
            String(
              activity.location || ""
            ).toLowerCase();

          const category =
            String(
              activity.category || ""
            ).toLowerCase();

          const creatorName =
            String(
              activity.creatorName || ""
            ).toLowerCase();

          // ========================================
          // GEOGRAPHIC DISTANCE
          // ========================================

          let distance = null;

          if (
            userCoordinates &&
            typeof activity.latitude === "number" &&
            typeof activity.longitude === "number"
          ) {
            distance = calculateDistance(
              userCoordinates.latitude,
              userCoordinates.longitude,
              activity.latitude,
              activity.longitude
            );
          }

          // Once the user's location is available, only activities
          // with valid coordinates within 25 km are shown.
          // If GPS is unavailable, keep the existing Discover behavior.
          const matchesNearby =
            !userCoordinates ||
            (distance !== null && distance <= 25);

          const matchesSearch =
            !normalizedSearch ||
            title.includes(
              normalizedSearch
            ) ||
            description.includes(
              normalizedSearch
            ) ||
            location.includes(
              normalizedSearch
            ) ||
            category.includes(
              normalizedSearch
            ) ||
            creatorName.includes(
              normalizedSearch
            );

          const matchesCategory =
            selectedCategory === "All" ||
            String(
              activity.category || ""
            ).trim() ===
              selectedCategory;

          const playerCount =
            Array.isArray(
              activity.joinedUsers
            )
              ? activity.joinedUsers.length
              : 0;

          const maxPeople =
            Number(activity.maxPeople) || 0;

          const matchesAvailability =
  !showAvailableOnly ||
  playerCount < maxPeople;

// ========================================
// DATE FILTER
// ========================================

let matchesDate = true;

if (dateFilter !== "all" && activity.date) {
  const activityDate = new Date(
    `${activity.date}T00:00:00`
  );

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const tomorrow = new Date(today);
  tomorrow.setDate(today.getDate() + 1);

  const weekEnd = new Date(today);
  weekEnd.setDate(today.getDate() + 7);

  if (dateFilter === "today") {
    matchesDate =
      activityDate.getTime() ===
      today.getTime();
  }

  if (dateFilter === "tomorrow") {
    matchesDate =
      activityDate.getTime() ===
      tomorrow.getTime();
  }

  if (dateFilter === "week") {
    matchesDate =
      activityDate >= today &&
      activityDate < weekEnd;
  }
}

// ========================================
// DISTANCE FILTER
// ========================================

let matchesDistance = true;

if (
  distanceFilter !== "all" &&
  userCoordinates &&
  distance !== null
) {
  matchesDistance =
    distance <= Number(distanceFilter);
}

// ========================================
// GROUP SIZE FILTER
// ========================================

let matchesGroupSize = true;

if (groupSizeFilter !== "all") {
  if (groupSizeFilter === "small") {
    matchesGroupSize =
      maxPeople >= 2 &&
      maxPeople <= 5;
  }

  if (groupSizeFilter === "medium") {
    matchesGroupSize =
      maxPeople >= 6 &&
      maxPeople <= 10;
  }

  if (groupSizeFilter === "large") {
    matchesGroupSize =
      maxPeople > 10;
  }
}

return (
  matchesSearch &&
  matchesCategory &&
  matchesAvailability &&
  matchesNearby &&
  matchesDate &&
  matchesDistance &&
  matchesGroupSize
);
        });

      // ========================================
      // SORT
      // ========================================

      return [...result].sort((a, b) => {

        // ----------------------------------------
        // RECOMMENDED
        // ----------------------------------------

        if (sortBy === "recommended") {
          const scoreA =
            calculateMatchScore(a);

          const scoreB =
            calculateMatchScore(b);

          if (scoreB !== scoreA) {
            return scoreB - scoreA;
          }

          // ----------------------------------------
          // DISTANCE TIE-BREAKER
          // ----------------------------------------

          if (userCoordinates) {
            const distanceA =
              typeof a.latitude === "number" &&
              typeof a.longitude === "number"
                ? calculateDistance(
                    userCoordinates.latitude,
                    userCoordinates.longitude,
                    a.latitude,
                    a.longitude
                  )
                : Infinity;

            const distanceB =
              typeof b.latitude === "number" &&
              typeof b.longitude === "number"
                ? calculateDistance(
                    userCoordinates.latitude,
                    userCoordinates.longitude,
                    b.latitude,
                    b.longitude
                  )
                : Infinity;

            if (distanceA !== distanceB) {
              return distanceA - distanceB;
            }
          }

          return (
            new Date(
              b.createdAt || 0
            ) -
            new Date(
              a.createdAt || 0
            )
          );
        }

        // ----------------------------------------
        // NEWEST
        // ----------------------------------------

        if (sortBy === "newest") {
          return (
            new Date(
              b.createdAt || 0
            ) -
            new Date(
              a.createdAt || 0
            )
          );
        }

        // ----------------------------------------
        // OLDEST
        // ----------------------------------------

        if (sortBy === "oldest") {
          return (
            new Date(
              a.createdAt || 0
            ) -
            new Date(
              b.createdAt || 0
            )
          );
        }

        // ----------------------------------------
        // MOST SPOTS
        // ----------------------------------------

        if (sortBy === "spots") {
          const aSpots =
            Math.max(
              Number(a.maxPeople || 0) -
                (Array.isArray(
                  a.joinedUsers
                )
                  ? a.joinedUsers.length
                  : 0),
              0
            );

          const bSpots =
            Math.max(
              Number(b.maxPeople || 0) -
                (Array.isArray(
                  b.joinedUsers
                )
                  ? b.joinedUsers.length
                  : 0),
              0
            );

          return bSpots - aSpots;
        }

        return 0;
      });

    }, [
  activities,
  search,
  selectedCategory,
  showAvailableOnly,
  dateFilter,
  distanceFilter,
  groupSizeFilter,
  sortBy,
  userPreferences,
  currentUser,
  userCoordinates,
]);

  // ========================================
  // CLEAR FILTERS
  // ========================================

  const clearFilters = () => {
  setSearch("");
  setSelectedCategory("All");
  setShowAvailableOnly(false);
  setDateFilter("all");
  setDistanceFilter("25");
  setGroupSizeFilter("all");
  setSortBy("recommended");
};

  // ========================================
  // RESULTS TEXT
  // ========================================

  const resultCount =
    filteredActivities.length;

  const resultText =
    resultCount === 1
      ? "activity"
      : "activities";

  // ========================================
  // UI
  // ========================================

  return (
    <div className="discover-page">

      <main className="discover-main">

        {/* ========================================
            HERO
        ======================================== */}

        <section className="discover-hero">

          <div className="discover-hero-content">

            <div className="discover-eyebrow">
              <span className="eyebrow-dot"></span>
              DISCOVER
            </div>

            <h1>
              Find your people.
              <span>
                {" "}
                Find your plan.
              </span>
            </h1>

            <div className="discover-hero-bottom">

              <p className="discover-subtitle">
                Discover activities around
                you and meet people who
                enjoy the same things.
              </p>

            </div>

          </div>

        </section>

        {/* ========================================
            SEARCH + FILTER PANEL
        ======================================== */}

        <section className="discover-search-panel">

          {/* SEARCH */}

          <div className="discover-search-wrapper">

            <input
              type="text"
              value={search}
              onChange={(event) =>
                setSearch(
                  event.target.value
                )
              }
              placeholder="Search activities, people or locations..."
              aria-label="Search activities"
            />

            {search && (
              <button
                type="button"
                className="discover-clear-search"
                onClick={() =>
                  setSearch("")
                }
                aria-label="Clear search"
              >
                ×
              </button>
            )}

          </div>

          {/* CATEGORY */}

          <div className="discover-category-row">

            {categories.map(
              (category) => (
                <button
                  type="button"
                  key={
                    category.name
                  }
                  className={`discover-category ${
                    selectedCategory ===
                    category.name
                      ? "discover-category-active"
                      : ""
                  }`}
                  onClick={() =>
                    setSelectedCategory(
                      category.name
                    )
                  }
                >

                  <span>
                    {category.emoji}
                  </span>

                  {category.name}

                </button>
              )
            )}

          </div>

          {/* ========================================
    ADVANCED FILTERS
======================================== */}

<div className="discover-advanced-filters">

  {/* DATE */}

  <div className="discover-filter-control">

    <label htmlFor="discover-date-filter">
      📅 DATE
    </label>

    <select
      id="discover-date-filter"
      value={dateFilter}
      onChange={(event) =>
        setDateFilter(event.target.value)
      }
    >
      <option value="all">
        Any date
      </option>

      <option value="today">
        Today
      </option>

      <option value="tomorrow">
        Tomorrow
      </option>

      <option value="week">
        This week
      </option>
    </select>

  </div>


  {/* DISTANCE */}

  <div className="discover-filter-control">

    <label htmlFor="discover-distance-filter">
      📍 DISTANCE
    </label>

    <select
      id="discover-distance-filter"
      value={distanceFilter}
      onChange={(event) =>
        setDistanceFilter(event.target.value)
      }
    >
      <option value="all">
        Any distance
      </option>

      <option value="1">
        Within 1 km
      </option>

      <option value="5">
        Within 5 km
      </option>

      <option value="10">
        Within 10 km
      </option>

      <option value="25">
        Within 25 km
      </option>
    </select>

  </div>


  {/* GROUP SIZE */}

  <div className="discover-filter-control">

    <label htmlFor="discover-group-filter">
      👥 GROUP SIZE
    </label>

    <select
      id="discover-group-filter"
      value={groupSizeFilter}
      onChange={(event) =>
        setGroupSizeFilter(event.target.value)
      }
    >
      <option value="all">
        Any group size
      </option>

      <option value="small">
        2–5 people
      </option>

      <option value="medium">
        6–10 people
      </option>

      <option value="large">
        10+ people
      </option>
    </select>

  </div>

</div>

          {/* FILTER FOOTER */}

          <div className="discover-filter-footer">

            <button
              type="button"
              className={`available-filter ${
                showAvailableOnly
                  ? "available-filter-active"
                  : ""
              }`}
              onClick={() =>
                setShowAvailableOnly(
                  (previous) =>
                    !previous
                )
              }
            >

              <span className="filter-check">
                {showAvailableOnly
                  ? "✓"
                  : ""}
              </span>

              Available spots only

            </button>

            <div className="discover-filter-right">

              <span className="discover-result-count">
                {resultCount}{" "}
                {resultText}
              </span>

              <select
                value={sortBy}
                onChange={(event) =>
                  setSortBy(
                    event.target.value
                  )
                }
                className="discover-sort"
                aria-label="Sort activities"
              >
                <option value="recommended">
  ✨ Recommended
</option>

                <option value="newest">
                  Newest
                </option>

                <option value="oldest">
                  Oldest
                </option>

                <option value="spots">
                  Most spots
                </option>

              </select>

            </div>

          </div>

        </section>

        {/* ========================================
            LOCATION STATUS
        ======================================== */}

        <div
          style={{
            marginTop: "14px",
            marginBottom: "10px",
            padding: "10px 14px",
            borderRadius: "10px",
            fontSize: "13px",
            opacity: 0.8,
          }}
        >
          📍 {locationStatus}
        </div>

        {/* ========================================
            RESULTS
        ======================================== */}

        <section className="discover-results">

          {/* ========================================
              PERSONALIZED DISCOVERY HEADER
          ======================================== */}

          {!loading &&
            !error &&
            filteredActivities.length > 0 &&
            userPreferences.length > 0 && (
              <div className="discover-personalized-header">

                <div className="discover-personalized-main">

                  <div className="discover-personalized-icon">
                    ✨
                  </div>

                  <div className="discover-personalized-copy">

                    <div className="discover-personalized-label">
                      <span></span>
                      PERSONALIZED FOR YOU
                    </div>

                    <h2>
                      Recommended{" "}
                      <span>
                        for you
                      </span>
                    </h2>

                    <p>
                      Picks matched to the things
                      you enjoy.
                    </p>

                  </div>

                </div>

                <div className="discover-interest-list">
                  {userPreferences.slice(0, 5).map(
                    (interest) => (
                      <span
                        className="discover-interest-chip"
                        key={interest}
                      >
                        {emojiMap[interest] || "✨"}
                        {interest}
                      </span>
                    )
                  )}

                  {userPreferences.length > 5 && (
                    <span className="discover-interest-chip discover-interest-more">
                      +{userPreferences.length - 5}
                    </span>
                  )}
                </div>

              </div>
            )}

          {/* ========================================
              RESULTS TITLE
          ======================================== */}

          <div className="discover-results-heading">

            <div>

              <div className="discover-results-title-row">

                <div>
                  <p className="section-eyebrow">
                    EXPLORE ACTIVITIES
                  </p>

                  <h2>
                    Activities{" "}
                    <span>
                      near you
                    </span>
                  </h2>

                  <p>
                    Find something interesting
                    and join the plan.
                  </p>
                </div>

                {!loading &&
                  !error &&
                  filteredActivities.length > 0 && (
                    <div className="discover-results-meta">
                      <strong>
                        {resultCount}
                      </strong>
                      <span>
                        {resultText}
                      </span>
                    </div>
                  )}

              </div>

            </div>

          </div>

          {/* ========================================
              LOADING
          ======================================== */}

          {loading && (
            <div className="discover-loading-grid">

              {[1, 2, 3].map(
                (item) => (
                  <div
                    className="activity-skeleton"
                    key={item}
                  >

                    <div className="skeleton-icon"></div>

                    <div className="skeleton-line large"></div>

                    <div className="skeleton-line"></div>

                    <div className="skeleton-line short"></div>

                    <div className="skeleton-info">

                      <div></div>
                      <div></div>
                      <div></div>
                      <div></div>

                    </div>

                  </div>
                )
              )}

            </div>
          )}

          {/* ========================================
              ERROR
          ======================================== */}

          {!loading && error && (
            <div className="discover-empty">

              <div className="empty-icon error-icon">
                ⚠️
              </div>

              <div className="empty-badge">
                ERROR
              </div>

              <h3>
                Something went wrong
              </h3>

              <p>
                {error}
              </p>

              <button
                type="button"
                className="empty-primary-btn"
                onClick={
                  fetchActivities
                }
              >
                Try Again
              </button>

            </div>
          )}

          {/* ========================================
              NO RESULTS
          ======================================== */}

          {!loading &&
            !error &&
            filteredActivities.length ===
              0 && (
              <div className="discover-empty">

                <div className="empty-icon">
                  🔎
                </div>

                <div className="empty-badge">
                  NO MATCHES
                </div>

                <h3>
                  {search
                    ? `Nothing matched "${search}"`
                    : selectedCategory !==
                      "All"
                    ? `No ${selectedCategory} activities yet`
                    : "No activities found"}
                </h3>

                <p>
                  {search
                    ? "Try another keyword or explore all activities happening nearby."
                    : "There are no activities matching these filters right now."}
                </p>

                <div className="empty-actions">

                  {(search ||
                    selectedCategory !==
                      "All" ||
                    showAvailableOnly) && (
                    <button
                      type="button"
                      className="empty-primary-btn"
                      onClick={
                        clearFilters
                      }
                    >
                      Show All Activities
                    </button>
                  )}

                  <Link
                    to="/create-activity"
                    className="empty-secondary-btn"
                  >
                    ＋ Create Activity
                  </Link>

                </div>

              </div>
            )}

          {/* ========================================
              ACTIVITY GRID
          ======================================== */}

         {!loading &&
  !error &&
  filteredActivities.length > 0 && (
    <>
      {/* ========================================
          ACTIVITY GRID
      ======================================== */}

      <div className="activity-grid">
        {filteredActivities.map((activity) => {
          const playerCount =
            Array.isArray(activity.joinedUsers)
              ? activity.joinedUsers.length
              : 0;

              const maxPeople =
  Number(activity.maxPeople) || 0;

          // ========================================
          // ACTIVITY DISTANCE
          // ========================================

          const activityDistance =
            userCoordinates &&
            typeof activity.latitude === "number" &&
            typeof activity.longitude === "number"
              ? calculateDistance(
                  userCoordinates.latitude,
                  userCoordinates.longitude,
                  activity.latitude,
                  activity.longitude
                )
              : null;

          // ========================================
          // MATCHING
          // ========================================

const activityCategory = String(
                      activity.category || ""
                    )
                      .trim()
                      .toLowerCase();

                    const matchedInterest =
                      userPreferences.find((interest) => {
                        const normalizedInterest = String(
                          interest || ""
                        )
                          .trim()
                          .toLowerCase();

                        return (
                          normalizedInterest === activityCategory ||
                          String(activity.title || "")
                            .toLowerCase()
                            .includes(normalizedInterest) ||
                          String(activity.description || "")
                            .toLowerCase()
                            .includes(normalizedInterest)
                        );
                      });

                    // Use the exact same Smart Matching score that
                    // powers Recommended sorting.
                    const matchScore =
                      calculateMatchScore(activity);

          // ========================================
          // ACTIVITY STATUS
          // ========================================

          const isFull =
            maxPeople > 0 &&
            playerCount >= maxPeople;

          const remaining =
            Math.max(
              maxPeople - playerCount,
              0
            );

          const progress =
            maxPeople > 0
              ? Math.min(
                  (playerCount /
                    maxPeople) *
                    100,
                  100
                )
              : 0;

          // ========================================
          // CREATOR
          // ========================================

          const creatorId =
            getUserId(
              activity.creatorId
            );

          const creatorName =
            activity.creatorName ||
            "Let's Go member";

          const isCreator =
            isActivityCreator(
              activity,
              currentUser
            );

          // ========================================
          // ACTIVITY CARD
          // ========================================

          return (
            <article
              className="premium-activity-card"
              key={activity._id}
            >
              {/* ========================================
                  MATCH BADGE
              ======================================== */}

              {matchScore > 0 && (
                <div className="activity-match-badge">
                  <span>✨</span>

                  <div>
                    <strong>
                      {matchScore}% Match
                    </strong>

                    <small>
                      {matchedInterest
                        ? `Matches your ${matchedInterest} interest`
                        : "Recommended for you"}
                    </small>
                  </div>
                </div>
              )}

              {/* ========================================
                  CARD TOP
              ======================================== */}

              <div className="premium-card-top">
                <div className="premium-activity-icon">
                  {emojiMap[
                    activity.category
                  ] || "✨"}
                </div>

                <span
                  className={
                    isFull
                      ? "status-full"
                      : "status-open"
                  }
                >
                  <span></span>

                  {isFull
                    ? "FULL"
                    : "OPEN"}
                </span>
              </div>

              {/* ========================================
                  CATEGORY
              ======================================== */}

              <div className="premium-category">
                <span></span>

                {activity.category ||
                  "Other"}
              </div>

              {/* ========================================
                  TITLE
              ======================================== */}

              <h3>
                {activity.title ||
                  "Untitled Activity"}
              </h3>

              {/* ========================================
                  DESCRIPTION
              ======================================== */}

              <p className="premium-description">
                {activity.description ||
                  "Join this activity and meet people nearby who share the same interests."}
              </p>

              {/* ========================================
                  HOST
              ======================================== */}

              <div className="activity-creator">
                {creatorId ? (
                  <Link
                    to={`/user/${creatorId}`}
                    className="activity-creator-link"
                  >
                    <div className="activity-creator-avatar">
                      {getInitials(
                        creatorName
                      )}
                    </div>

                    <div>
                      <small>
                        HOSTED BY
                      </small>

                      <strong>
                        {creatorName}
                      </strong>
                    </div>
                  </Link>
                ) : (
                  <div className="activity-creator-link">
                    <div className="activity-creator-avatar">
                      {getInitials(
                        creatorName
                      )}
                    </div>

                    <div>
                      <small>
                        HOSTED BY
                      </small>

                      <strong>
                        {creatorName}
                      </strong>
                    </div>
                  </div>
                )}
              </div>

              {/* ========================================
                  INFORMATION
              ======================================== */}

              <div className="premium-info-grid">
                <div className="premium-info-box">
                  <span>
                    📍
                  </span>

                  <div>
                    <small>
                      LOCATION
                    </small>

                    <strong>
                      {activity.location ||
                        "Location not set"}

                      {activityDistance !== null && (
                        <small
                          style={{
                            display: "block",
                            marginTop: "4px",
                            opacity: 0.7,
                          }}
                        >
                          📍 {activityDistance < 1
                            ? `${Math.round(activityDistance * 1000)} m away`
                            : `${activityDistance.toFixed(1)} km away`}
                        </small>
                      )}
                    </strong>
                  </div>
                </div>

                <div className="premium-info-box">
                  <span>
                    📅
                  </span>

                  <div>
                    <small>
                      DATE
                    </small>

                    <strong>
                      {formatDate(
                        activity.date
                      )}
                    </strong>
                  </div>
                </div>

                <div className="premium-info-box">
                  <span>
                    🕐
                  </span>

                  <div>
                    <small>
                      TIME
                    </small>

                    <strong>
                      {activity.time ||
                        "Flexible"}
                    </strong>
                  </div>
                </div>

                <div className="premium-info-box">
                  <span>
                    👥
                  </span>

                  <div>
                    <small>
                      PLAYERS
                    </small>

                    <strong>
                      {playerCount} /{" "}
                      {maxPeople}
                    </strong>
                  </div>
                </div>
              </div>

              {/* ========================================
                  CAPACITY
              ======================================== */}

              <div className="activity-capacity">
                <div className="capacity-header">
                  <span>
                    {isFull
                      ? "Activity is full"
                      : `${remaining} ${
                          remaining === 1
                            ? "spot"
                            : "spots"
                        } remaining`}
                  </span>

                  <strong>
                    {Math.round(
                      progress
                    )}
                    %
                  </strong>
                </div>

                <div className="capacity-bar">
                  <div
                    className="capacity-progress"
                    style={{
                      width: `${progress}%`,
                    }}
                  ></div>
                </div>
              </div>

              {/* ========================================
                  CARD BOTTOM
              ======================================== */}

              <div className="premium-card-bottom">
                <div className="people-status">
                  <div className="people-avatars">
                    {activity.joinedUsers
                      ?.slice(0, 3)
                      .map(
                        (
                          person,
                          index
                        ) => {
                          const personId =
                            getUserId(
                              person?.userId ||
                                person
                            );

                          return (
                            <span
                              key={
                                personId ||
                                index
                              }
                            >
                              {getInitials(
                                person?.name ||
                                  "User"
                              )}
                            </span>
                          );
                        }
                      )}

                    {playerCount === 0 && (
                      <span>
                        👤
                      </span>
                    )}
                  </div>

                  <small>
                    {playerCount}{" "}
                    {playerCount === 1
                      ? "person"
                      : "people"}{" "}
                    joined
                  </small>
                </div>

                {/* ========================================
                    ACTIONS
                ======================================== */}

                <div className="activity-card-actions">
                  {isCreator && (
                    <Link
                      to={`/edit-activity/${activity._id}`}
                      className="premium-edit-btn"
                    >
                      Edit Activity

                      <span>
                        ✎
                      </span>
                    </Link>
                  )}

                  <Link
                    to={`/activity/${activity._id}`}
                    className="premium-view-btn"
                  >
                    View Activity

                    <span>
                      →
                    </span>
                  </Link>
                </div>
              </div>
            </article>
          );
        })}
      </div>
    </>
  )}

      </section>

    </main>

  </div>
  );
}

export default Discover;