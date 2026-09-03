import { Link, useNavigate, useParams } from "react-router-dom";
import { useEffect, useState } from "react";
import { io } from "socket.io-client";
import { MapContainer, TileLayer, Marker } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import "./ActivityDetails.css";

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

function getCurrentUserId() {
  try {
    const storedUser = localStorage.getItem("currentUser");
    return getUserId(storedUser ? JSON.parse(storedUser) : null);
  } catch (error) {
    console.error("Unable to read current user:", error);
    return null;
  }
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

function getCreatorId(creator) {
  if (!creator) return null;

  if (typeof creator === "object") {
    return (
      creator._id ||
      creator.id ||
      creator.userId ||
      null
    );
  }

  return creator;
}

// ========================================
// GET JOINED USER ID
// ========================================

function getJoinedUserId(person) {
  if (!person) return null;

  if (
    person.userId &&
    typeof person.userId === "object"
  ) {
    return (
      person.userId._id ||
      person.userId.id ||
      person.userId.userId ||
      null
    );
  }

  return (
    person.userId ||
    person._id ||
    person.id ||
    null
  );
}

// ========================================
// GET OTHER USER FROM CONNECTION
// ========================================

function getOtherConnectionUser(
  connection,
  currentUserId
) {
  if (!connection || !currentUserId) {
    return null;
  }

  const sender = connection.sender;
  const receiver = connection.receiver;

  const senderId = getUserId(sender);
  const receiverId = getUserId(receiver);

  if (
    String(senderId) ===
    String(currentUserId)
  ) {
    return receiver;
  }

  if (
    String(receiverId) ===
    String(currentUserId)
  ) {
    return sender;
  }

  return null;
}

function ActivityDetails() {
  const { id } = useParams();
  const navigate = useNavigate();


const [activity, setActivity] = useState(null);

const [loading, setLoading] = useState(true);
const [joining, setJoining] = useState(false);
const [deleting, setDeleting] = useState(false);
const [reporting, setReporting] = useState(false);

const [showReportModal, setShowReportModal] =
  useState(false);

const [reportReason, setReportReason] =
  useState("");

const [reportDetails, setReportDetails] =
  useState("");

const [isCreator, setIsCreator] = useState(false);
const [isJoined, setIsJoined] = useState(false);

// ========================================
// JOIN REQUEST STATE
// ========================================

const [requestStatus, setRequestStatus] = useState(null);
const [joinRequests, setJoinRequests] = useState([]);
const [requestsLoading, setRequestsLoading] = useState(false);
const [requestActionLoading, setRequestActionLoading] = useState("");

const [error, setError] = useState("");
const [success, setSuccess] = useState("");
const [showInvitePanel, setShowInvitePanel] =
  useState(false);

const [connections, setConnections] =
  useState([]);

const [connectionsLoading, setConnectionsLoading] =
  useState(false);

const [inviteLoading, setInviteLoading] =
  useState(null);

  const [memberToRemove, setMemberToRemove] =
  useState(null);

  // ========================================
// RATING STATE
// ========================================

const [ratings, setRatings] = useState([]);
const [averageRating, setAverageRating] = useState(0);
const [totalRatings, setTotalRatings] = useState(0);
const [myRating, setMyRating] = useState(null);
const [selectedRating, setSelectedRating] = useState(0);
const [reviewText, setReviewText] = useState("");
const [ratingSubmitting, setRatingSubmitting] = useState(false);
const [ratingLoading, setRatingLoading] = useState(false);
const [ratingMessage, setRatingMessage] = useState("");

const [invitedUsers, setInvitedUsers] =
  useState([]);

// ========================================
// ATTENDANCE STATE
// ========================================

const [attendance, setAttendance] = useState([]);
const [attendanceLoading, setAttendanceLoading] =
  useState(false);
const [attendanceSubmitting, setAttendanceSubmitting] =
  useState(false);

  // ========================================
  // ACTIVITY MEMORY STATE
  // ========================================

  const [memories, setMemories] = useState([]);
  const [memoriesLoading, setMemoriesLoading] = useState(false);
  const [memorySubmitting, setMemorySubmitting] = useState(false);
  const [memoryCaption, setMemoryCaption] = useState("");
  const [memoryImage, setMemoryImage] = useState(null);
  const [memoryPreview, setMemoryPreview] = useState("");
  const [memoryUploadFile, setMemoryUploadFile] = useState(null);

  // ========================================
  // FETCH ACTIVITY
  // ========================================

  useEffect(() => {
    const fetchActivity = async () => {
if (!id) {
  setError("Activity ID is missing.");
  setLoading(false);
  return;
}

      try {
        setLoading(true);
        setError("");

        const token = localStorage.getItem("token");

        if (!token) {
          navigate("/login");
          return;
        }

        // ------------------------------------
        // GET ACTIVITY
        // ------------------------------------

        const response = await fetch(
          `http://localhost:5001/api/activities/${id}?_=${Date.now()}`,
          {
            cache: "no-store",
            headers: {
              Authorization: `Bearer ${token}`,
            },
          }
        );

        const data = await response.json();

        console.log(
          "ACTIVITY DETAILS:",
          data
        );

        if (!response.ok) {
          throw new Error(
            data.message ||
              "Unable to fetch activity."
          );
        }

        // ------------------------------------
        // HANDLE DIFFERENT API RESPONSE SHAPES
        // ------------------------------------

        const foundActivity =
          data.activity || data;

        setActivity(foundActivity);

        // ------------------------------------
        // GET CURRENT USER
        // ------------------------------------

        const profileResponse = await fetch(
          "http://localhost:5001/api/users/profile",
          {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          }
        );

        const profileData =
          await profileResponse.json();

        if (!profileResponse.ok) {
          throw new Error(
            profileData.message ||
              "Unable to fetch your profile."
          );
        }

        const user =
          profileData.user;


        // ------------------------------------
        // CREATOR CHECK
        // ------------------------------------

        const creatorId =
          getCreatorId(
            foundActivity.creatorId
          );

        const currentUserId =
          getUserId(user);


        const creator =
          creatorId &&
          currentUserId &&
          String(creatorId) ===
            String(currentUserId);

        console.log(
          "ACTIVITY CREATOR CHECK:",
          {
            creatorId,
            currentUserId,
            isCreator: creator,
          }
        );

        setIsCreator(Boolean(creator));

        // ------------------------------------
        // JOINED CHECK
        // ------------------------------------

        const joinedUsers =
          foundActivity.joinedUsers || [];

        const alreadyJoined =
          joinedUsers.some((person) => {
            const joinedUserId =
              person?.userId?._id ||
              person?.userId ||
              person?._id ||
              person?.id;

            return (
              joinedUserId &&
              currentUserId &&
              String(joinedUserId) ===
                String(currentUserId)
            );
          });

        setIsJoined(alreadyJoined);

        // ------------------------------------
        // CHECK JOIN REQUEST STATUS
        // ------------------------------------

        const currentRequest =
          Array.isArray(foundActivity.joinRequests)
            ? foundActivity.joinRequests.find((request) => {
                const requestUserId =
                  request?.userId?._id ||
                  request?.userId ||
                  request?._id ||
                  request?.id;

                return (
                  requestUserId &&
                  currentUserId &&
                  String(requestUserId) ===
                    String(currentUserId)
                );
              })
            : null;

        setRequestStatus(
          currentRequest?.status || null
        );

        if (creator) {
          const pendingRequests =
            Array.isArray(foundActivity.joinRequests)
              ? foundActivity.joinRequests.filter(
                  (request) =>
                    !request?.status ||
                    request.status === "pending"
                )
              : [];

          setJoinRequests(pendingRequests);
        } else {
          setJoinRequests([]);
        }
      } catch (err) {
        console.error(
          "ACTIVITY DETAILS ERROR:",
          err
        );

        setError(
          err.message ||
            "Unable to load activity."
        );
      } finally {
        setLoading(false);
      }
    };

    fetchActivity();
  }, [id, navigate]);

  // ========================================
// FETCH MY CONNECTIONS
// ========================================

const fetchConnections = async () => {
  try {
    const token =
      localStorage.getItem("token");

    if (!token) {
      navigate("/login");
      return;
    }

    setConnectionsLoading(true);

    const response = await fetch(
      "http://localhost:5001/api/connections",
      {
        method: "GET",

        headers: {
          Authorization:
            `Bearer ${token}`,
        },
      }
    );

    const data =
      await response.json();

    if (!response.ok) {
      throw new Error(
        data.message ||
          "Unable to load connections."
      );
    }

    const connectionList =
      Array.isArray(data)
        ? data
        : data.connections || [];

    setConnections(connectionList);

  } catch (error) {
    console.error(
      "Fetch connections error:",
      error
    );

    setError(
      error.message ||
        "Unable to load connections."
    );

  } finally {
    setConnectionsLoading(false);
  }
};


// ========================================
// OPEN INVITE PANEL
// ========================================

const handleOpenInvite = async () => {
  if (!localStorage.getItem("token")) {
    navigate("/login");
    return;
  }

  if (!isCreator) {
    setError(
      "Only the activity creator can invite people."
    );
    return;
  }

  setError("");

  setShowInvitePanel(true);

  await fetchConnections();
};


// ========================================
// INVITE CONNECTION
// ========================================

const handleInviteUser = async (
  recipientId
) => {
  try {
    const token =
      localStorage.getItem("token");

    if (!token) {
      navigate("/login");
      return;
    }

    if (!recipientId) {
      return;
    }

    setInviteLoading(recipientId);
    setError("");

    const response = await fetch(
      `http://localhost:5001/api/activities/${id}/invite`,
      {
        method: "POST",

        headers: {
          "Content-Type":
            "application/json",

          Authorization:
            `Bearer ${token}`,
        },

        body: JSON.stringify({
          recipientId,
        }),
      }
    );

    const data =
      await response.json();

    if (!response.ok) {
      throw new Error(
        data.message ||
          "Unable to send invitation."
      );
    }

    setInvitedUsers(
      (previous) => [
        ...previous,
        String(recipientId),
      ]
    );

    setSuccess(
      "Invitation sent successfully! 📅"
    );

    setTimeout(() => {
      setSuccess("");
    }, 3000);

  } catch (error) {
    console.error(
      "Invite user error:",
      error
    );

    setError(
      error.message ||
        "Unable to send invitation."
    );

  } finally {
    setInviteLoading(null);
  }
};

  // ========================================
  // REQUEST TO JOIN ACTIVITY
  // ========================================

  const handleJoin = async () => {
    try {
      const token =
        localStorage.getItem("token");

      if (!token) {
        navigate("/login");
        return;
      }

      if (!activity) {
        return;
      }

      if (isCreator) {
        setError(
          "You created this activity. You are already the host!"
        );
        return;
      }

      if (isJoined || requestStatus === "pending") {
        return;
      }

      const playerCount =
        activity.joinedUsers?.length || 0;

      const maxPeople =
        Number(activity.maxPeople) || 0;

      if (playerCount >= maxPeople) {
        setError("This activity is already full.");
        return;
      }

      setJoining(true);
      setError("");
      setSuccess("");

      const response = await fetch(
        `http://localhost:5001/api/activities/${id}/request-join`,
        {
          method: "POST",
          headers: {
            Authorization:
              `Bearer ${token}`,
            "Content-Type":
              "application/json",
          },
        }
      );

      const data = await response.json();

      console.log(
        "REQUEST TO JOIN RESPONSE:",
        data
      );

      if (!response.ok) {
        throw new Error(
          data.message ||
            "Unable to send join request."
        );
      }

      // Reload the page after the request is successfully saved.
      // This makes the UI read the latest request status from the backend.
      window.location.reload();
    } catch (err) {
      console.error(
        "REQUEST TO JOIN ERROR:",
        err
      );

      setError(
        err.message ||
          "Unable to send join request."
      );
    } finally {
      setJoining(false);
    }
  };

  // ========================================
  // FETCH JOIN REQUESTS FOR HOST
  // ========================================

  const fetchJoinRequests = async () => {
    if (!isCreator || !id) {
      return;
    }

    try {
      const token =
        localStorage.getItem("token");

      if (!token) {
        navigate("/login");
        return;
      }

      setRequestsLoading(true);

      const response = await fetch(
        `http://localhost:5001/api/activities/${id}/join-requests?_=${Date.now()}`,
        {
          cache: "no-store",
          headers: {
            Authorization:
              `Bearer ${token}`,
          },
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.message ||
            "Unable to load join requests."
        );
      }

      setJoinRequests(
        Array.isArray(data.requests)
          ? data.requests.filter(
              (request) =>
                !request?.status ||
                request.status === "pending"
            )
          : []
      );
    } catch (err) {
      console.error(
        "FETCH JOIN REQUESTS ERROR:",
        err
      );

      setError(
        err.message ||
          "Unable to load join requests."
      );
    } finally {
      setRequestsLoading(false);
    }
  };

  useEffect(() => {
    if (isCreator && id) {
      fetchJoinRequests();
    }
  }, [isCreator, id]);

  // ========================================
  // ACCEPT JOIN REQUEST
  // ========================================

  const handleAcceptRequest = async (userId) => {
    try {
      const token =
        localStorage.getItem("token");

      if (!token) {
        navigate("/login");
        return;
      }

      setRequestActionLoading(
        `accept-${userId}`
      );
      setError("");
      setSuccess("");

      const response = await fetch(
        `http://localhost:5001/api/activities/${id}/join-requests/${userId}/accept`,
        {
          method: "POST",
          headers: {
            Authorization:
              `Bearer ${token}`,
            "Content-Type":
              "application/json",
          },
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.message ||
            "Unable to accept join request."
        );
      }

      // Reload the page after the request is successfully accepted.
      // This makes the joinedUsers list and request list read the latest backend data.
      window.location.reload();
    } catch (err) {
      console.error(
        "ACCEPT JOIN REQUEST ERROR:",
        err
      );

      setError(
        err.message ||
          "Unable to accept join request."
      );
    } finally {
      setRequestActionLoading("");
    }
  };

  // ========================================
  // REJECT JOIN REQUEST
  // ========================================

  const handleRejectRequest = async (userId) => {
    try {
      const token =
        localStorage.getItem("token");

      if (!token) {
        navigate("/login");
        return;
      }

      setRequestActionLoading(
        `reject-${userId}`
      );
      setError("");
      setSuccess("");

      const response = await fetch(
        `http://localhost:5001/api/activities/${id}/join-requests/${userId}/reject`,
        {
          method: "POST",
          headers: {
            Authorization:
              `Bearer ${token}`,
            "Content-Type":
              "application/json",
          },
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.message ||
            "Unable to reject join request."
        );
      }

      // Reload the page after the request is successfully rejected.
      // This makes the request list read the latest backend data.
      window.location.reload();
    } catch (err) {
      console.error(
        "REJECT JOIN REQUEST ERROR:",
        err
      );

      setError(
        err.message ||
          "Unable to reject join request."
      );
    } finally {
      setRequestActionLoading("");
    }
  };

// ========================================
// REMOVE MEMBER
// ========================================

const handleRemoveMember = async (userId) => {
  try {
    const token = localStorage.getItem("token");

    if (!token) {
      navigate("/login");
      return;
    }

    setError("");
    setSuccess("");

    const response = await fetch(
      `http://localhost:5001/api/activities/${id}/members/${userId}`,
      {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      }
    );

    const data = await response.json();

    if (!response.ok) {
      throw new Error(
        data.message || "Unable to remove member."
      );
    }

    setActivity(data.activity);

    setSuccess(
      data.message || "Member removed successfully."
    );
  } catch (err) {
    console.error(
      "REMOVE MEMBER ERROR:",
      err
    );

    setError(
      err.message ||
        "Unable to remove member."
    );
  }
};

  // ========================================
  // LEAVE ACTIVITY
  // ========================================

  const handleLeave = async () => {
    const confirmed =
      window.confirm(
        "Are you sure you want to leave this activity?"
      );

    if (!confirmed) return;

    try {
      const token =
        localStorage.getItem("token");

      if (!token) {
        navigate("/login");
        return;
      }

      setJoining(true);
      setError("");
      setSuccess("");

      const response = await fetch(
        `http://localhost:5001/api/activities/${id}/leave`,
        {
          method: "DELETE",
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      const data =
        await response.json();

      console.log(
        "LEAVE ACTIVITY RESPONSE:",
        data
      );

      if (!response.ok) {
        throw new Error(
          data.message ||
            "Unable to leave activity."
        );
      }

      setIsJoined(false);

      setSuccess(
        "You left this activity successfully."
      );

      // Refresh activity
      const refreshed =
        await fetch(
          `http://localhost:5001/api/activities/${id}`,
          {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          }
        );

      const refreshedData =
        await refreshed.json();

      setActivity(
        refreshedData.activity ||
          refreshedData
      );
    } catch (err) {
      console.error(
        "LEAVE ACTIVITY ERROR:",
        err
      );

      setError(
        err.message ||
          "Unable to leave activity."
      );
    } finally {
      setJoining(false);
    }
  };

  // ========================================
  // DELETE ACTIVITY
  // ========================================

  const handleDelete = async () => {
    const confirmed =
      window.confirm(
        "Are you sure you want to delete this activity?"
      );

    if (!confirmed) return;

    try {
      const token =
        localStorage.getItem("token");

      if (!token) {
        navigate("/login");
        return;
      }

      setDeleting(true);
      setError("");

      const response = await fetch(
        `http://localhost:5001/api/activities/${id}`,
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
        throw new Error(
          data.message ||
            "Unable to delete activity."
        );
      }

      navigate("/discover");
    } catch (err) {
      console.error(
        "DELETE ACTIVITY ERROR:",
        err
      );

      setError(
        err.message ||
          "Unable to delete activity."
      );
    } finally {
      setDeleting(false);
    }
  };

  // ========================================
// REPORT ACTIVITY
// ========================================

const handleReport = async () => {
  if (isCreator) {
    setError("You cannot report your own activity.");
    return;
  }

  if (!reportReason) {
    setError("Please select a reason for reporting this activity.");
    return;
  }

  try {
    const token = localStorage.getItem("token");

    if (!token) {
      navigate("/login");
      return;
    }

    setReporting(true);
    setError("");
    setSuccess("");

    // The backend accepts "Other" for reports that do not have
    // a dedicated backend reason, including unsafe activity.
    const backendReason =
      reportReason === "Unsafe activity"
        ? "Other"
        : reportReason;

    const response = await fetch(
      `http://localhost:5001/api/activities/${id}/report`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          reason: backendReason,
          description: reportDetails.trim(),
        }),
      }
    );

    let data = {};

    try {
      data = await response.json();
    } catch {
      data = {};
    }

    console.log("REPORT ACTIVITY RESPONSE:", {
      status: response.status,
      ok: response.ok,
      data,
    });

    if (!response.ok) {
      throw new Error(
        data.message ||
          `Unable to report activity. Server returned ${response.status}.`
      );
    }

    setShowReportModal(false);
    setReportReason("");
    setReportDetails("");

    setSuccess(
      "Activity reported successfully. Thank you for helping keep Let's Go safe."
    );
  } catch (err) {
    console.error("REPORT ACTIVITY ERROR:", err);

    setError(
      err.message || "Unable to report activity."
    );
  } finally {
    setReporting(false);
  }
};


// ========================================
// FETCH ACTIVITY ATTENDANCE
// ========================================

const fetchAttendance = async () => {
  if (!id) return;

  try {
    const token = localStorage.getItem("token");

    if (!token) return;

    setAttendanceLoading(true);

    const response = await fetch(
      `http://localhost:5001/api/activities/${id}/attendance`,
      {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      }
    );

    const data = await response.json();

    if (!response.ok) {
      // Non-members are not allowed to view attendance.
      // This is expected and should not break the page.
      if (response.status === 403) {
        setAttendance([]);
        return;
      }

      throw new Error(
        data.message ||
          "Unable to load attendance."
      );
    }

    setAttendance(
      Array.isArray(data.attendance)
        ? data.attendance
        : []
    );
  } catch (error) {
    console.error(
      "FETCH ATTENDANCE ERROR:",
      error
    );
  } finally {
    setAttendanceLoading(false);
  }
};


// ========================================
// CONFIRM ATTENDANCE
// ========================================

const handleConfirmAttendance = async () => {
  try {
    const token = localStorage.getItem("token");

    if (!token) {
      navigate("/login");
      return;
    }

    if (!isJoined) {
      setError(
        "Only activity members can confirm attendance."
      );
      return;
    }

    setAttendanceSubmitting(true);
    setError("");
    setSuccess("");

    const response = await fetch(
      `http://localhost:5001/api/activities/${id}/attendance`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      }
    );

    const data = await response.json();

    if (!response.ok) {
      throw new Error(
        data.message ||
          "Unable to confirm attendance."
      );
    }

    setAttendance(
      Array.isArray(data.attendance)
        ? data.attendance
        : []
    );

    setSuccess(
      "Your attendance has been confirmed! ✓"
    );
  } catch (error) {
    console.error(
      "CONFIRM ATTENDANCE ERROR:",
      error
    );

    setError(
      error.message ||
        "Unable to confirm attendance."
    );
  } finally {
    setAttendanceSubmitting(false);
  }
};


  // ========================================
  // FETCH ACTIVITY MEMORIES
  // ========================================

  const fetchMemories = async () => {
    if (!id) return;

    try {
      const token = localStorage.getItem("token");
      if (!token) return;

      setMemoriesLoading(true);

      const response = await fetch(
        `http://localhost:5001/api/activities/${id}/memories?_=${Date.now()}`,
        {
          cache: "no-store",
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      const data = await response.json();

      if (!response.ok) {
        if (response.status === 403) {
          setMemories([]);
          return;
        }

        throw new Error(
          data.message || "Unable to load activity memories."
        );
      }

      setMemories(
        Array.isArray(data.memories) ? data.memories : []
      );
    } catch (error) {
      console.error("FETCH ACTIVITY MEMORIES ERROR:", error);
    } finally {
      setMemoriesLoading(false);
    }
  };

  const createMemoryUploadFile = (image, maxDimension = 900) => {
    return new Promise((resolve, reject) => {
      const scale = Math.min(
        1,
        maxDimension / Math.max(image.width, image.height)
      );

      const canvas = document.createElement("canvas");
      canvas.width = Math.max(
        1,
        Math.round(image.width * scale)
      );
      canvas.height = Math.max(
        1,
        Math.round(image.height * scale)
      );

      const context = canvas.getContext("2d");

      if (!context) {
        reject(new Error("Unable to prepare the selected photo."));
        return;
      }

      context.drawImage(
        image,
        0,
        0,
        canvas.width,
        canvas.height
      );

      canvas.toBlob(
        (blob) => {
          if (!blob) {
            reject(new Error("Unable to compress the selected photo."));
            return;
          }

          resolve(
            new File([blob], "activity-memory.jpg", {
              type: "image/jpeg",
              lastModified: Date.now(),
            })
          );
        },
        "image/jpeg",
        0.68
      );
    });
  };

  // ========================================
  // SELECT MEMORY IMAGE
  // ========================================

  const handleMemoryImageChange = (event) => {
    const file = event.target.files?.[0];

    if (!file) {
      setMemoryImage(null);
      setMemoryPreview("");
      setMemoryUploadFile(null);
      return;
    }

    if (!file.type.startsWith("image/")) {
      setMemoryImage(null);
      setMemoryPreview("");
      setMemoryUploadFile(null);
      setError("Please select an image file.");
      event.target.value = "";
      return;
    }

    if (file.size > 15 * 1024 * 1024) {
      setMemoryImage(null);
      setMemoryPreview("");
      setMemoryUploadFile(null);
      setError("Please choose an image smaller than 15 MB.");
      event.target.value = "";
      return;
    }

    setError("");
    setSuccess("");
    setMemoryImage(file);
    setMemoryUploadFile(null);
    setMemoryPreview("");

    const reader = new FileReader();

    reader.onload = () => {
      const source =
        typeof reader.result === "string"
          ? reader.result
          : "";

      if (!source) {
        setMemoryImage(null);
        setMemoryPreview("");
        setMemoryUploadFile(null);
        setError("Unable to read the selected photo.");
        return;
      }

      const image = new Image();

      image.onload = async () => {
        try {
          const uploadFile = await createMemoryUploadFile(image);
          const previewUrl = URL.createObjectURL(uploadFile);

          setMemoryUploadFile(uploadFile);
          setMemoryPreview(previewUrl);
          setError("");
        } catch (error) {
          console.error("PREPARE MEMORY IMAGE ERROR:", error);
          setMemoryImage(null);
          setMemoryPreview("");
          setMemoryUploadFile(null);
          setError(
            error.message ||
              "Unable to prepare the selected photo."
          );
        }
      };

      image.onerror = () => {
        setMemoryImage(null);
        setMemoryPreview("");
        setMemoryUploadFile(null);
        setError("Unable to load the selected photo.");
      };

      image.src = source;
    };

    reader.onerror = () => {
      setMemoryImage(null);
      setMemoryPreview("");
      setMemoryUploadFile(null);
      setError("Unable to read the selected photo.");
    };

    reader.readAsDataURL(file);
  };

  // ========================================
  // ADD ACTIVITY MEMORY
  // ========================================

  const handleAddMemory = async () => {
    try {
      const token = localStorage.getItem("token");

      if (!token) {
        navigate("/login");
        return;
      }

      if (!isJoined) {
        setError("Only activity members can add memories.");
        return;
      }

      if (activityLifecycle !== "COMPLETED") {
        setError(
          "Memories can only be added after the activity is completed."
        );
        return;
      }

      if (!memoryImage || !memoryPreview) {
        setError("Please select a photo first.");
        return;
      }

      setMemorySubmitting(true);
      setError("");
      setSuccess("");

      if (!memoryUploadFile) {
        throw new Error("Unable to prepare the photo for upload. Please select it again.");
      }

      const formData = new FormData();
      formData.append("image", memoryUploadFile);
      formData.append("caption", memoryCaption.trim());

      const response = await fetch(
        `http://localhost:5001/api/activities/${id}/memories`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
          },
          body: formData,
        }
      );

      const responseText = await response.text();
      let data = {};

      try {
        data = responseText ? JSON.parse(responseText) : {};
      } catch {
        data = {};
      }

      console.log("ADD ACTIVITY MEMORY RESPONSE:", {
        status: response.status,
        ok: response.ok,
        data,
      });

      if (!response.ok) {
        throw new Error(
          data.message ||
            (response.status === 413
              ? "The photo is too large for the server. Please choose a smaller photo."
              : `Unable to add activity memory. Server returned ${response.status}.`)
        );
      }

      if (data.memory) {
        setMemories((previous) => [data.memory, ...previous]);
      } else {
        await fetchMemories();
      }

      setMemoryImage(null);
      if (memoryPreview?.startsWith("blob:")) {
        URL.revokeObjectURL(memoryPreview);
      }
      setMemoryPreview("");
      setMemoryUploadFile(null);
      setMemoryCaption("");

      const fileInput = document.getElementById(
        "activity-memory-image"
      );

      if (fileInput) {
        fileInput.value = "";
      }

      setSuccess("Activity memory added successfully. 📸");
    } catch (error) {
      console.error("ADD ACTIVITY MEMORY ERROR:", error);
      setError(
        error.message || "Unable to add activity memory."
      );
    } finally {
      setMemorySubmitting(false);
    }
  };

  // ========================================
  // ACTIVITY LIFECYCLE
  // ========================================

  const activityLifecycle = (() => {
    if (!activity?.date) {
      return "UPCOMING";
    }

    try {
      const dateValue =
        String(activity.date).trim();

      const timeValue =
        String(activity.time || "00:00").trim();

      let activityDateTime;

      if (
        /^\d{4}-\d{2}-\d{2}$/.test(
          dateValue
        )
      ) {
        let normalizedTime = timeValue;

        const twelveHourMatch =
          normalizedTime.match(
            /^(\d{1,2}):(\d{2})(?:\s*([AP]M))$/i
          );

        if (twelveHourMatch) {
          let hours = Number(
            twelveHourMatch[1]
          );

          const minutes =
            twelveHourMatch[2];

          const meridiem =
            twelveHourMatch[3].toUpperCase();

          if (
            meridiem === "PM" &&
            hours !== 12
          ) {
            hours += 12;
          }

          if (
            meridiem === "AM" &&
            hours === 12
          ) {
            hours = 0;
          }

          normalizedTime =
            `${String(hours).padStart(
              2,
              "0"
            )}:${minutes}`;
        }

        if (
          !/^\d{2}:\d{2}/.test(
            normalizedTime
          )
        ) {
          normalizedTime = "00:00";
        }

        activityDateTime =
          new Date(
            `${dateValue}T${normalizedTime.slice(
              0,
              5
            )}:00`
          );
      } else {
        activityDateTime =
          new Date(dateValue);

        const timeMatch =
          timeValue.match(
            /^(\d{1,2}):(\d{2})(?:\s*([AP]M))?$/i
          );

        if (
          timeMatch &&
          !Number.isNaN(
            activityDateTime.getTime()
          )
        ) {
          let hours = Number(
            timeMatch[1]
          );

          const minutes = Number(
            timeMatch[2]
          );

          if (timeMatch[3]) {
            const meridiem =
              timeMatch[3].toUpperCase();

            if (
              meridiem === "PM" &&
              hours !== 12
            ) {
              hours += 12;
            }

            if (
              meridiem === "AM" &&
              hours === 12
            ) {
              hours = 0;
            }
          }

          activityDateTime.setHours(
            hours,
            minutes,
            0,
            0
          );
        }
      }

      if (
        !activityDateTime ||
        Number.isNaN(
          activityDateTime.getTime()
        )
      ) {
        return "UPCOMING";
      }

      const now = new Date();

      // Activities are treated as LIVE for two hours
      // from their scheduled start time because the
      // existing Activity model has no end-time field.
      const activityEndTime =
        new Date(
          activityDateTime.getTime() +
            2 * 60 * 60 * 1000
        );

      if (now < activityDateTime) {
        return "UPCOMING";
      }

      if (now < activityEndTime) {
        return "LIVE";
      }

      return "COMPLETED";
    } catch {
      return "UPCOMING";
    }
  })();

  // ========================================
  // LOAD MEMORIES
  // ========================================

  useEffect(() => {
    if (
      !id ||
      !isJoined ||
      activityLifecycle !== "COMPLETED"
    ) {
      return;
    }

    fetchMemories();
  }, [id, isJoined, activityLifecycle]);

// ========================================
// FETCH ACTIVITY RATINGS
// ========================================

const fetchRatings = async () => {
  if (!id) return;

  try {
    setRatingLoading(true);

    const response = await fetch(
      `http://localhost:5001/api/ratings/${id}`
    );

    const data = await response.json();

    if (!response.ok) {
      throw new Error(
        data.message ||
          "Unable to load ratings."
      );
    }

    setRatings(
      Array.isArray(data.ratings)
        ? data.ratings
        : []
    );

    setAverageRating(
      Number(data.averageRating) || 0
    );

    setTotalRatings(
      Number(data.totalRatings) || 0
    );
  } catch (error) {
    console.error(
      "FETCH RATINGS ERROR:",
      error
    );
  } finally {
    setRatingLoading(false);
  }
};

// ========================================
// FETCH MY RATING
// ========================================

const fetchMyRating = async () => {
  if (!id) return;

  try {
    const token =
      localStorage.getItem("token");

    if (!token) return;

    const response = await fetch(
      `http://localhost:5001/api/ratings/${id}/my-rating`,
      {
        headers: {
          Authorization:
            `Bearer ${token}`,
        },
      }
    );

    const data = await response.json();

    if (!response.ok) {
      throw new Error(
        data.message ||
          "Unable to check your rating."
      );
    }

    if (data.rated && data.rating) {
      setMyRating(data.rating);
      setSelectedRating(
        Number(data.rating.rating) || 0
      );
      setReviewText(
        data.rating.review || ""
      );
    } else {
      setMyRating(null);
    }
  } catch (error) {
    console.error(
      "FETCH MY RATING ERROR:",
      error
    );
  }
};

// ========================================
// LOAD RATINGS
// ========================================

useEffect(() => {
  if (!id) return;

  fetchRatings();
  fetchMyRating();
  fetchAttendance();
}, [id]);

// ========================================
// SUBMIT RATING
// ========================================

const handleSubmitRating = async () => {
  try {
    const token =
      localStorage.getItem("token");

    if (!token) {
      navigate("/login");
      return;
    }

    if (!selectedRating) {
      setRatingMessage(
        "Please select a rating first."
      );
      return;
    }

    setRatingSubmitting(true);
    setRatingMessage("");

    const response = await fetch(
      `http://localhost:5001/api/ratings/${id}`,
      {
        method: "POST",
        headers: {
          Authorization:
            `Bearer ${token}`,
          "Content-Type":
            "application/json",
        },
        body: JSON.stringify({
          rating: selectedRating,
          review: reviewText.trim(),
        }),
      }
    );

    const data = await response.json();

    if (!response.ok) {
      throw new Error(
        data.message ||
          "Unable to submit rating."
      );
    }

    setMyRating(data.rating);

    setRatingMessage(
      "Your rating has been submitted successfully! ⭐"
    );

    await fetchRatings();
    await fetchMyRating();
  } catch (error) {
    console.error(
      "SUBMIT RATING ERROR:",
      error
    );

    setRatingMessage(
      error.message ||
        "Unable to submit rating."
    );
  } finally {
    setRatingSubmitting(false);
  }
};

// ========================================
// ACTIVITY MEMBER REMOVED
// ========================================

useEffect(() => {
  if (!id || isCreator) return;

  const token = localStorage.getItem("token");

  if (!token) return;

  const socket = io("http://localhost:5001", {
    auth: {
      token,
    },
  });

  const currentUserId = getCurrentUserId();

if (currentUserId) {
  socket.emit("join-user-room", currentUserId);
}

  socket.on("activity-member-removed", (data) => {
    if (String(data.activityId) !== String(id)) {
      return;
    }

    setIsJoined(false);
    setRequestStatus(null);

    setSuccess(
      data.message ||
        "You have been removed from this activity."
    );
  });

  return () => {
    socket.disconnect();
  };
}, [id, isCreator]);

  // ========================================
  // LOADING
  // ========================================

  if (loading) {
    return (
      <div className="create-v2-page">

        <div className="create-v2-heading">

          <div className="create-v2-badge">
            ✦ LOADING
          </div>

          <h1>
            Loading Activity...
          </h1>

          <p>
            Please wait while we load
            the activity.
          </p>

        </div>

      </div>
    );
  }

  // ========================================
  // ERROR
  // ========================================

  if (error && !activity) {
    return (
      <div className="create-v2-page">

        <Link
          to="/discover"
          className="create-v2-back"
        >
          ← Back to Discover
        </Link>

        <section className="create-v2-heading">

          <div className="create-v2-badge">
            ✦ ERROR
          </div>

          <h1>
            Unable to Load
          </h1>

          <p>
            {error}
          </p>

        </section>

      </div>
    );
  }

  if (!activity) {
    return null;
  }

  // ========================================
  // ACTIVITY DATA
  // ========================================

  const playerCount =
    activity.joinedUsers?.length || 0;

  const maxPeople =
    Number(activity.maxPeople) || 0;

  const isFull =
    playerCount >= maxPeople;

  const categoryEmoji =
    emojiMap[activity.category] ||
    "✨";

  const creatorName =
    activity.creatorName ||
    activity.creatorId?.name ||
    "Activity Host";

  // ========================================
  // CHECK IF ACTIVITY HAS FINISHED
  // ========================================

  const isActivityFinished = (() => {
    if (!activity?.date) {
      return false;
    }

    try {
      const dateValue = String(activity.date).trim();
      const timeValue = String(
        activity.time || "23:59"
      ).trim();

      let activityDateTime;

      if (/^\d{4}-\d{2}-\d{2}$/.test(dateValue)) {
        let normalizedTime = timeValue;

        const twelveHourMatch = normalizedTime.match(
          /^(\d{1,2}):(\d{2})(?:\s*([AP]M))$/i
        );

        if (twelveHourMatch) {
          let hours = Number(twelveHourMatch[1]);
          const minutes = twelveHourMatch[2];
          const meridiem =
            twelveHourMatch[3].toUpperCase();

          if (meridiem === "PM" && hours !== 12) {
            hours += 12;
          }

          if (meridiem === "AM" && hours === 12) {
            hours = 0;
          }

          normalizedTime = `${String(hours).padStart(
            2,
            "0"
          )}:${minutes}`;
        }

        if (!/^\d{2}:\d{2}/.test(normalizedTime)) {
          normalizedTime = "23:59";
        }

        activityDateTime = new Date(
          `${dateValue}T${normalizedTime.slice(0, 5)}:00`
        );
      } else {
        activityDateTime = new Date(dateValue);

        if (
          !Number.isNaN(activityDateTime.getTime()) &&
          timeValue
        ) {
          const timeMatch = timeValue.match(
            /^(\d{1,2}):(\d{2})(?:\s*([AP]M))?$/i
          );

          if (timeMatch) {
            let hours = Number(timeMatch[1]);
            const minutes = Number(timeMatch[2]);

            if (timeMatch[3]) {
              const meridiem =
                timeMatch[3].toUpperCase();

              if (
                meridiem === "PM" &&
                hours !== 12
              ) {
                hours += 12;
              }

              if (
                meridiem === "AM" &&
                hours === 12
              ) {
                hours = 0;
              }
            }

            activityDateTime.setHours(
              hours,
              minutes,
              0,
              0
            );
          }
        }
      }

      return (
        activityDateTime &&
        !Number.isNaN(activityDateTime.getTime()) &&
        activityDateTime < new Date()
      );
    } catch {
      return false;
    }
  })();



  const myAttendance =
    attendance.find(
      (entry) =>
        String(entry.userId) ===
        String(getCurrentUserId())
    );

  const hasConfirmedAttendance =
    Boolean(myAttendance?.confirmed);

  // ========================================
  // UI
  // ========================================

  return (
    <div className="activity-details-page">

      <main className="activity-details-container">

        {/* BACK */}

        <Link
          to="/discover"
          className="activity-details-back"
        >
          ← Back to Discover
        </Link>

        {/* HERO */}

        <section
          className="activity-details-hero"
          style={{ position: "relative" }}
        >

          <div className="activity-details-icon">
            {categoryEmoji}
          </div>

          <div
            style={{
              position: "absolute",
              top: "18px",
              right: "18px",
              padding: "7px 12px",
              borderRadius: "999px",
              border:
                "1px solid rgba(255,255,255,0.12)",
              background:
                activityLifecycle === "LIVE"
                  ? "rgba(34,197,94,0.12)"
                  : activityLifecycle === "COMPLETED"
                  ? "rgba(148,163,184,0.10)"
                  : "rgba(59,130,246,0.10)",
              color:
                activityLifecycle === "LIVE"
                  ? "#86efac"
                  : activityLifecycle === "COMPLETED"
                  ? "#cbd5e1"
                  : "#93c5fd",
              fontSize: "11px",
              fontWeight: 800,
              letterSpacing: "0.08em",
              zIndex: 2,
            }}
          >
            {activityLifecycle === "LIVE"
              ? "● LIVE"
              : activityLifecycle === "COMPLETED"
              ? "✓ COMPLETED"
              : "UPCOMING"}
          </div>

          <div className="activity-details-hero-content">

            <span>
              {activity.category}
            </span>

            <h1>
              {activity.title}
            </h1>

            <p>
              {activity.description ||
                "Join this activity and meet people nearby who share the same interests."}
            </p>

          </div>

        </section>

        {/* MESSAGES */}

        {success && (
          <div className="activity-details-success">
            ✓ {success}
          </div>
        )}

        {error && (
          <div className="activity-details-error">
            ⚠️ {error}
          </div>
        )}

        {/* INFORMATION */}

        <section className="activity-details-section">

          <div className="activity-details-section-title">

            <span>
              ACTIVITY DETAILS
            </span>

            <h2>
              Everything you need to know
            </h2>

          </div>

          <div className="activity-details-info-grid">

            <div className="activity-details-info-card">

              <span className="activity-details-info-icon">
                ⌖
              </span>

              <div>
                <small>
                  LOCATION
                </small>

                <strong>
                  {activity.location}
                </strong>
              </div>

            </div>

            <div className="activity-details-info-card">

              <span className="activity-details-info-icon">
                ▣
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

            <div className="activity-details-info-card">

              <span className="activity-details-info-icon">
                ◷
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

            <div className="activity-details-info-card">

              <span className="activity-details-info-icon">
                ♟
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

        </section>

        {/* ACTIVITY LOCATION */}

        {typeof activity.latitude === "number" &&
          typeof activity.longitude === "number" && (
            <section className="activity-details-section activity-location-section">
              <div className="activity-details-section-title">
                <span>ACTIVITY LOCATION</span>
                <h2>Know where you're going</h2>
              </div>

              <div className="activity-location-card">
                <div className="activity-location-map">
                  <MapContainer key={`${activity.latitude}-${activity.longitude}`} center={[activity.latitude, activity.longitude]} zoom={15} scrollWheelZoom={false} className="activity-details-map">
                    <TileLayer attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>' url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
                    <Marker position={[activity.latitude, activity.longitude]} />
                  </MapContainer>
                </div>
                <div className="activity-location-meta">
                  <div className="activity-location-pin">📍</div>

                  <div style={{ flex: 1 }}>
                    <small>MEETING LOCATION</small>

                    <strong style={{ display: "block", marginTop: "4px" }}>
                      {activity.location}
                    </strong>

                    <p style={{ marginTop: "6px" }}>
                      Exact meeting point selected by the activity host.
                    </p>

                    <a
                      href={`https://www.google.com/maps/dir/?api=1&destination=${activity.latitude},${activity.longitude}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      style={{
                        display: "inline-flex",
                        alignItems: "center",
                        gap: "6px",
                        marginTop: "12px",
                        padding: "10px 14px",
                        borderRadius: "10px",
                        textDecoration: "none",
                        fontSize: "13px",
                        fontWeight: 700,
                        background: "rgba(255,255,255,0.08)",
                        border: "1px solid rgba(255,255,255,0.14)",
                        color: "inherit",
                      }}
                    >
                      🧭 Open in Google Maps →
                    </a>
                  </div>
                </div>
              </div>
            </section>
          )}

        {/* PEOPLE */}

        <section className="activity-details-section">

          <div className="activity-details-section-title">

            <span>
              PEOPLE JOINING
            </span>

            <h2>
              Meet your people
            </h2>

          </div>

          <div className="activity-people-card">

            {/* HOST */}

            <div className="activity-host">

              {(() => {
                const hostId =
                  getCreatorId(
                    activity.creatorId
                  );

                if (hostId) {
                  return (
                    <Link
                      to={`/user/${hostId}`}
                      className="activity-person-link"
                    >

                      <div className="activity-person-avatar">
                        {creatorName
                          .charAt(0)
                          .toUpperCase()}
                      </div>

                      <div>

                        <small>
                          HOST
                        </small>

                        <strong>
                          {creatorName}
                        </strong>

                      </div>

                    </Link>
                  );
                }

                return (
                  <>
                    <div className="activity-person-avatar">
                      {creatorName
                        .charAt(0)
                        .toUpperCase()}
                    </div>

                    <div>

                      <small>
                        HOST
                      </small>

                      <strong>
                        {creatorName}
                      </strong>

                    </div>
                  </>
                );
              })()}

            </div>

            {/* JOINED PEOPLE */}

            {activity.joinedUsers &&
              activity.joinedUsers.length >
                0 && (

                <div className="activity-joined-list">

                  {activity.joinedUsers.map(
                    (person, index) => {

                      const name =
                        person.name ||
                        person.userId?.name ||
                        "Member";

                      const userId =
                        getJoinedUserId(
                          person
                        );

                      // --------------------------------
                      // CLICKABLE USER
                      // --------------------------------

                      if (userId) {
                        return (
  <div
    className="activity-person-row"
    key={userId}
  >
    <Link
      to={`/user/${userId}`}
      className="activity-person-link"
    >
      <div className="activity-person-avatar small">
        {name.charAt(0).toUpperCase()}
      </div>

      <div className="activity-person-name">
        <span>{name}</span>

        <small>
          View Profile →
        </small>
      </div>
    </Link>

    {isCreator && (
      <button
        type="button"
        className="person-remove-btn"
       onClick={() =>
  setMemberToRemove({
    userId,
    name,
  })
}
      >
        Remove
      </button>
    )}
  </div>
);
                      }

                      // --------------------------------
                      // FALLBACK
                      // --------------------------------

                      return (
                        <div
                          className="activity-person-row"
                          key={index}
                        >

                          <div className="activity-person-avatar small">

                            {name
                              .charAt(0)
                              .toUpperCase()}

                          </div>

                          <span>
                            {name}
                          </span>

                        </div>
                      );
                    }
                  )}

                </div>
              )}

          </div>

        </section>

        {/* ========================================
            ACTIVITY ATTENDANCE
        ======================================== */}

        {isJoined && (
          <section className="activity-details-section">
            <div className="activity-details-section-title">
              <span>ACTIVITY ATTENDANCE</span>

              <h2>
                {activityLifecycle === "UPCOMING"
                  ? "Are you joining us?"
                  : activityLifecycle === "LIVE"
                  ? "You're here!"
                  : "Activity attendance"}
              </h2>
            </div>

            <div
              style={{
                padding: "24px",
                border:
                  "1px solid rgba(148,163,184,0.14)",
                borderRadius: "20px",
                background:
                  "rgba(255,255,255,0.025)",
              }}
            >
              {activityLifecycle === "UPCOMING" && (
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    gap: "20px",
                    flexWrap: "wrap",
                  }}
                >
                  <div>
                    <strong
                      style={{
                        display: "block",
                        color: "#ffffff",
                        fontSize: "16px",
                      }}
                    >
                      Confirm your attendance
                    </strong>

                    <p
                      style={{
                        margin: "7px 0 0",
                        color: "#94a3b8",
                        fontSize: "13px",
                        lineHeight: 1.6,
                      }}
                    >
                      Let the host know you're actually
                      coming.
                    </p>
                  </div>

                  {hasConfirmedAttendance ? (
                    <div
                      style={{
                        padding: "11px 16px",
                        border:
                          "1px solid rgba(34,197,94,0.22)",
                        borderRadius: "11px",
                        background:
                          "rgba(34,197,94,0.08)",
                        color: "#86efac",
                        fontSize: "13px",
                        fontWeight: 800,
                      }}
                    >
                      ✓ I'm Going
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={handleConfirmAttendance}
                      disabled={attendanceSubmitting}
                      style={{
                        minHeight: "44px",
                        padding: "0 18px",
                        border:
                          "1px solid rgba(34,197,94,0.25)",
                        borderRadius: "11px",
                        background:
                          "rgba(34,197,94,0.10)",
                        color: "#86efac",
                        fontSize: "13px",
                        fontWeight: 800,
                        cursor:
                          attendanceSubmitting
                            ? "not-allowed"
                            : "pointer",
                        opacity:
                          attendanceSubmitting
                            ? 0.55
                            : 1,
                      }}
                    >
                      {attendanceSubmitting
                        ? "Confirming..."
                        : "I'm Going ✓"}
                    </button>
                  )}
                </div>
              )}

              {activityLifecycle === "LIVE" && (
                <div>
                  <strong
                    style={{
                      display: "block",
                      color: "#ffffff",
                      fontSize: "16px",
                    }}
                  >
                    🟢 Activity is live
                  </strong>

                  <p
                    style={{
                      margin: "7px 0 0",
                      color: "#94a3b8",
                      fontSize: "13px",
                      lineHeight: 1.6,
                    }}
                  >
                    Have fun and enjoy your activity!
                  </p>
                </div>
              )}

              {activityLifecycle === "COMPLETED" && (
                <div>
                  <strong
                    style={{
                      display: "block",
                      color: "#ffffff",
                      fontSize: "16px",
                    }}
                  >
                    ✓ Activity completed
                  </strong>

                  <p
                    style={{
                      margin: "7px 0 0",
                      color: "#94a3b8",
                      fontSize: "13px",
                      lineHeight: 1.6,
                    }}
                  >
                    Thanks for being part of this
                    Let's Go activity.
                  </p>
                </div>
              )}

              <div
                style={{
                  marginTop: "18px",
                  paddingTop: "16px",
                  borderTop:
                    "1px solid rgba(148,163,184,0.10)",
                  color: "#94a3b8",
                  fontSize: "12px",
                }}
              >
                <strong style={{ color: "#cbd5e1" }}>
                  {attendance.filter(
                    (entry) => entry.confirmed
                  ).length}
                </strong>{" "}
                of{" "}
                <strong style={{ color: "#cbd5e1" }}>
                  {playerCount}
                </strong>{" "}
                members confirmed attendance
              </div>
            </div>
          </section>
        )}

        {/* ========================================
            HOST ATTENDANCE
        ======================================== */}

        {isCreator && (
          <section className="activity-details-section">
            <div className="activity-details-section-title">
              <span>HOST VIEW</span>
              <h2>Attendance overview</h2>
            </div>

            <div
              style={{
                padding: "24px",
                border:
                  "1px solid rgba(148,163,184,0.14)",
                borderRadius: "20px",
                background:
                  "rgba(255,255,255,0.025)",
              }}
            >
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  gap: "20px",
                  flexWrap: "wrap",
                }}
              >
                <div>
                  <strong
                    style={{
                      color: "#ffffff",
                      fontSize: "16px",
                    }}
                  >
                    Attendance confirmed
                  </strong>

                  <p
                    style={{
                      margin: "7px 0 0",
                      color: "#94a3b8",
                      fontSize: "13px",
                    }}
                  >
                    See who has confirmed that they're
                    coming.
                  </p>
                </div>

                <div
                  style={{
                    padding: "10px 15px",
                    borderRadius: "999px",
                    background:
                      "rgba(59,130,246,0.08)",
                    border:
                      "1px solid rgba(59,130,246,0.18)",
                    color: "#93c5fd",
                    fontSize: "13px",
                    fontWeight: 800,
                  }}
                >
                  {
                    attendance.filter(
                      (entry) => entry.confirmed
                    ).length
                  } confirmed
                </div>
              </div>

              {attendanceLoading ? (
                <div
                  style={{
                    marginTop: "18px",
                    color: "#64748b",
                    fontSize: "12px",
                  }}
                >
                  Loading attendance...
                </div>
              ) : attendance.filter(
                  (entry) => entry.confirmed
                ).length === 0 ? (
                <div
                  style={{
                    marginTop: "18px",
                    padding: "16px",
                    borderRadius: "12px",
                    background:
                      "rgba(255,255,255,0.025)",
                    color: "#64748b",
                    fontSize: "12px",
                  }}
                >
                  No members have confirmed attendance
                  yet.
                </div>
              ) : (
                <div
                  style={{
                    display: "grid",
                    gap: "10px",
                    marginTop: "18px",
                  }}
                >
                  {attendance
                    .filter(
                      (entry) => entry.confirmed
                    )
                    .map((entry) => (
                      <div
                        key={String(entry.userId)}
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: "12px",
                          padding: "12px 14px",
                          borderRadius: "12px",
                          background:
                            "rgba(255,255,255,0.025)",
                          border:
                            "1px solid rgba(148,163,184,0.08)",
                        }}
                      >
                        <div
                          style={{
                            width: "34px",
                            height: "34px",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            borderRadius: "10px",
                            background:
                              "rgba(34,197,94,0.10)",
                            color: "#86efac",
                            fontWeight: 800,
                          }}
                        >
                          {(entry.name || "M")
                            .charAt(0)
                            .toUpperCase()}
                        </div>

                        <div>
                          <strong
                            style={{
                              display: "block",
                              color: "#ffffff",
                              fontSize: "13px",
                            }}
                          >
                            {entry.name ||
                              "Let's Go member"}
                          </strong>

                          <small
                            style={{
                              color: "#86efac",
                              fontSize: "11px",
                            }}
                          >
                            ✓ Confirmed
                          </small>
                        </div>
                      </div>
                    ))}
                </div>
              )}
            </div>
          </section>
        )}

        {/* ========================================
            ACTIVITY MEMORIES
        ======================================== */}

        {isJoined && activityLifecycle === "COMPLETED" && (
          <section className="activity-details-section activity-memories-section">
            <style>{`
              .activity-memories-section {
                position: relative;
              }

              .activity-memories-shell {
                position: relative;
                overflow: hidden;
                padding: 28px;
                border: 1px solid rgba(139, 92, 246, 0.18);
                border-radius: 24px;
                background:
                  radial-gradient(circle at 92% 0%, rgba(34, 211, 238, 0.08), transparent 28%),
                  radial-gradient(circle at 0% 100%, rgba(124, 58, 237, 0.10), transparent 32%),
                  linear-gradient(145deg, rgba(17, 24, 39, 0.92), rgba(9, 13, 25, 0.96));
                box-shadow: 0 24px 70px rgba(0, 0, 0, 0.25);
              }

              .activity-memories-shell::before {
                content: "";
                position: absolute;
                width: 220px;
                height: 220px;
                right: -120px;
                top: -130px;
                border-radius: 50%;
                background: rgba(124, 58, 237, 0.16);
                filter: blur(45px);
                pointer-events: none;
              }

              .activity-memories-header {
                position: relative;
                z-index: 1;
                display: flex;
                align-items: flex-start;
                justify-content: space-between;
                gap: 18px;
              }

              .activity-memories-heading {
                display: flex;
                align-items: flex-start;
                gap: 14px;
              }

              .activity-memories-heading-icon {
                width: 48px;
                height: 48px;
                flex-shrink: 0;
                display: grid;
                place-items: center;
                border-radius: 15px;
                background: linear-gradient(135deg, rgba(124, 58, 237, 0.22), rgba(6, 182, 212, 0.14));
                border: 1px solid rgba(167, 139, 250, 0.20);
                font-size: 21px;
                box-shadow: 0 10px 30px rgba(124, 58, 237, 0.10);
              }

              .activity-memories-heading strong {
                display: block;
                color: #f8fafc;
                font-size: 17px;
                font-weight: 800;
                letter-spacing: -0.2px;
              }

              .activity-memories-heading p {
                margin: 6px 0 0;
                max-width: 650px;
                color: #8995ad;
                font-size: 13px;
                line-height: 1.65;
              }

              .activity-memory-completed {
                display: inline-flex;
                align-items: center;
                gap: 7px;
                flex-shrink: 0;
                padding: 8px 12px;
                border: 1px solid rgba(74, 222, 128, 0.20);
                border-radius: 999px;
                background: rgba(34, 197, 94, 0.07);
                color: #86efac;
                font-size: 10px;
                font-weight: 800;
                letter-spacing: 0.8px;
              }

              .activity-memory-completed-dot {
                width: 6px;
                height: 6px;
                border-radius: 50%;
                background: #4ade80;
                box-shadow: 0 0 12px rgba(74, 222, 128, 0.75);
              }

              .activity-memory-composer {
                position: relative;
                z-index: 1;
                margin-top: 24px;
                padding: 20px;
                border: 1px solid rgba(148, 163, 184, 0.12);
                border-radius: 20px;
                background: rgba(255, 255, 255, 0.028);
              }

              .activity-memory-upload-label {
                display: flex;
                align-items: center;
                justify-content: space-between;
                gap: 12px;
                margin-bottom: 10px;
                color: #cbd5e1;
                font-size: 11px;
                font-weight: 800;
                letter-spacing: 1px;
                text-transform: uppercase;
              }

              .activity-memory-upload-hint {
                color: #64748b;
                font-size: 10px;
                font-weight: 600;
                letter-spacing: 0;
                text-transform: none;
              }

              .activity-memory-file-input {
                position: absolute;
                width: 1px;
                height: 1px;
                padding: 0;
                margin: -1px;
                overflow: hidden;
                clip: rect(0, 0, 0, 0);
                white-space: nowrap;
                border: 0;
              }

              .activity-memory-dropzone {
                display: flex;
                align-items: center;
                justify-content: center;
                min-height: 118px;
                padding: 18px;
                border: 1px dashed rgba(139, 92, 246, 0.34);
                border-radius: 16px;
                background: linear-gradient(145deg, rgba(124, 58, 237, 0.055), rgba(6, 182, 212, 0.025));
                cursor: pointer;
                transition: 0.25s ease;
              }

              .activity-memory-dropzone:hover {
                border-color: rgba(139, 92, 246, 0.65);
                background: linear-gradient(145deg, rgba(124, 58, 237, 0.10), rgba(6, 182, 212, 0.045));
                transform: translateY(-1px);
              }

              .activity-memory-dropzone-content {
                text-align: center;
              }

              .activity-memory-upload-icon {
                width: 42px;
                height: 42px;
                margin: 0 auto 9px;
                display: grid;
                place-items: center;
                border-radius: 13px;
                background: rgba(124, 58, 237, 0.13);
                border: 1px solid rgba(167, 139, 250, 0.18);
                font-size: 18px;
              }

              .activity-memory-dropzone strong {
                display: block;
                color: #e2e8f0;
                font-size: 12px;
              }

              .activity-memory-dropzone span {
                display: block;
                margin-top: 5px;
                color: #64748b;
                font-size: 10px;
              }

              .activity-memory-preview {
                position: relative;
                overflow: hidden;
                margin-top: 14px;
                border: 1px solid rgba(139, 92, 246, 0.22);
                border-radius: 16px;
                background: #090d18;
              }

              .activity-memory-preview img {
                display: block;
                width: 100%;
                max-height: 310px;
                object-fit: cover;
              }

              .activity-memory-preview-badge {
                position: absolute;
                left: 12px;
                top: 12px;
                padding: 6px 9px;
                border: 1px solid rgba(255, 255, 255, 0.10);
                border-radius: 999px;
                background: rgba(5, 6, 10, 0.70);
                backdrop-filter: blur(10px);
                color: #e2e8f0;
                font-size: 9px;
                font-weight: 800;
                letter-spacing: 0.8px;
              }

              .activity-memory-caption-wrap {
                margin-top: 14px;
              }

              .activity-memory-caption {
                width: 100%;
                min-height: 86px;
                padding: 13px 14px;
                box-sizing: border-box;
                resize: vertical;
                outline: none;
                border: 1px solid rgba(148, 163, 184, 0.13);
                border-radius: 13px;
                background: rgba(255, 255, 255, 0.025);
                color: #fff;
                font-size: 13px;
                font-family: inherit;
                line-height: 1.55;
                transition: 0.2s ease;
              }

              .activity-memory-caption::placeholder {
                color: #59657c;
              }

              .activity-memory-caption:focus {
                border-color: rgba(139, 92, 246, 0.60);
                box-shadow: 0 0 0 3px rgba(139, 92, 246, 0.10);
              }

              .activity-memory-actions {
                display: flex;
                align-items: center;
                justify-content: space-between;
                gap: 12px;
                margin-top: 12px;
              }

              .activity-memory-character-count {
                color: #59657c;
                font-size: 10px;
              }

              .activity-memory-add-btn {
                min-height: 44px;
                padding: 0 18px;
                border: 1px solid rgba(139, 92, 246, 0.35);
                border-radius: 12px;
                background: linear-gradient(135deg, #7c3aed, #06b6d4);
                color: #fff;
                font-size: 12px;
                font-weight: 800;
                cursor: pointer;
                box-shadow: 0 12px 28px rgba(124, 58, 237, 0.20);
                transition: 0.25s ease;
              }

              .activity-memory-add-btn:hover:not(:disabled) {
                transform: translateY(-2px);
                box-shadow: 0 16px 34px rgba(6, 182, 212, 0.18);
              }

              .activity-memory-add-btn:disabled {
                cursor: not-allowed;
                opacity: 0.42;
                box-shadow: none;
              }

              .activity-memory-inline-error,
              .activity-memory-inline-success {
                margin-top: 14px;
                padding: 11px 14px;
                border-radius: 12px;
                font-size: 12px;
                font-weight: 600;
              }

              .activity-memory-inline-error {
                border: 1px solid rgba(248, 113, 113, 0.25);
                background: rgba(239, 68, 68, 0.08);
                color: #fca5a5;
              }

              .activity-memory-inline-success {
                border: 1px solid rgba(74, 222, 128, 0.22);
                background: rgba(34, 197, 94, 0.08);
                color: #86efac;
              }

              .activity-memory-gallery {
                position: relative;
                z-index: 1;
                margin-top: 26px;
              }

              .activity-memory-gallery-header {
                display: flex;
                align-items: center;
                justify-content: space-between;
                gap: 12px;
                margin-bottom: 13px;
              }

              .activity-memory-gallery-header strong {
                color: #e2e8f0;
                font-size: 12px;
                font-weight: 800;
              }

              .activity-memory-gallery-count {
                min-width: 25px;
                height: 25px;
                padding: 0 7px;
                display: inline-flex;
                align-items: center;
                justify-content: center;
                border-radius: 999px;
                background: rgba(124, 58, 237, 0.11);
                border: 1px solid rgba(139, 92, 246, 0.17);
                color: #c4b5fd;
                font-size: 10px;
                font-weight: 800;
              }

              .activity-memory-empty {
                padding: 28px 20px;
                border: 1px dashed rgba(148, 163, 184, 0.12);
                border-radius: 16px;
                background: rgba(255, 255, 255, 0.018);
                text-align: center;
              }

              .activity-memory-empty-icon {
                width: 48px;
                height: 48px;
                margin: 0 auto 10px;
                display: grid;
                place-items: center;
                border-radius: 15px;
                background: rgba(124, 58, 237, 0.08);
                color: #a78bfa;
                font-size: 20px;
              }

              .activity-memory-empty strong {
                display: block;
                color: #aeb8ca;
                font-size: 12px;
              }

              .activity-memory-empty p {
                margin: 5px 0 0;
                color: #59657c;
                font-size: 10px;
              }

              .activity-memory-loading {
                padding: 24px;
                border-radius: 16px;
                background: rgba(255, 255, 255, 0.018);
                color: #64748b;
                font-size: 11px;
                text-align: center;
              }

              .activity-memory-grid {
                display: grid;
                grid-template-columns: repeat(3, minmax(0, 1fr));
                gap: 14px;
              }

              .activity-memory-card {
                overflow: hidden;
                border: 1px solid rgba(148, 163, 184, 0.12);
                border-radius: 17px;
                background: rgba(255, 255, 255, 0.025);
                box-shadow: 0 14px 35px rgba(0, 0, 0, 0.16);
                transition: 0.25s ease;
              }

              .activity-memory-card:hover {
                transform: translateY(-4px);
                border-color: rgba(139, 92, 246, 0.28);
                box-shadow: 0 22px 45px rgba(0, 0, 0, 0.24);
              }

              .activity-memory-card-image {
                position: relative;
                overflow: hidden;
                aspect-ratio: 4 / 3;
                background: #0b1020;
              }

              .activity-memory-card-image::after {
                content: "";
                position: absolute;
                inset: 0;
                background: linear-gradient(180deg, transparent 60%, rgba(0,0,0,0.32));
                pointer-events: none;
              }

              .activity-memory-card-image img {
                display: block;
                width: 100%;
                height: 100%;
                object-fit: cover;
                transition: transform 0.45s ease;
              }

              .activity-memory-card:hover .activity-memory-card-image img {
                transform: scale(1.045);
              }

              .activity-memory-card-body {
                padding: 13px 14px 14px;
              }

              .activity-memory-author {
                display: flex;
                align-items: center;
                gap: 9px;
              }

              .activity-memory-author-avatar {
                width: 29px;
                height: 29px;
                flex-shrink: 0;
                display: grid;
                place-items: center;
                border-radius: 50%;
                background: linear-gradient(135deg, #7c3aed, #2563eb);
                color: #fff;
                font-size: 10px;
                font-weight: 800;
              }

              .activity-memory-author strong {
                display: block;
                color: #f1f5f9;
                font-size: 12px;
                font-weight: 800;
              }

              .activity-memory-date {
                display: block;
                margin-top: 2px;
                color: #59657c;
                font-size: 9px;
              }

              .activity-memory-card-caption {
                margin: 10px 0 0;
                color: #9aa6bb;
                font-size: 11px;
                line-height: 1.55;
                word-break: break-word;
              }

              @media (max-width: 800px) {
                .activity-memories-shell {
                  padding: 20px;
                }

                .activity-memory-grid {
                  grid-template-columns: repeat(2, minmax(0, 1fr));
                }
              }

              @media (max-width: 520px) {
                .activity-memories-shell {
                  padding: 16px;
                  border-radius: 20px;
                }

                .activity-memories-header {
                  flex-direction: column;
                }

                .activity-memory-completed {
                  align-self: flex-start;
                }

                .activity-memory-composer {
                  padding: 14px;
                }

                .activity-memory-upload-label {
                  align-items: flex-start;
                  flex-direction: column;
                  gap: 4px;
                }

                .activity-memory-actions {
                  align-items: stretch;
                  flex-direction: column;
                }

                .activity-memory-add-btn {
                  width: 100%;
                }

                .activity-memory-grid {
                  grid-template-columns: 1fr;
                }
              }
            `}</style>

            <div className="activity-details-section-title">
              <span>ACTIVITY MEMORIES</span>
              <h2>Moments worth keeping</h2>
            </div>

            <div className="activity-memories-shell">
              <div className="activity-memories-header">
                <div className="activity-memories-heading">
                  <div className="activity-memories-heading-icon">📸</div>
                  <div>
                    <strong>Relive the activity</strong>
                    <p>
                      Share a photo from your experience and leave a small note for the people who were there.
                    </p>
                  </div>
                </div>

                <div className="activity-memory-completed">
                  <span className="activity-memory-completed-dot" />
                  COMPLETED
                </div>
              </div>

              <div className="activity-memory-composer">
                <div className="activity-memory-upload-label">
                  <span>Add a photo</span>
                  <span className="activity-memory-upload-hint">JPG, PNG • Max 2 MB</span>
                </div>

                <input
                  id="activity-memory-image"
                  className="activity-memory-file-input"
                  type="file"
                  accept="image/*"
                  onChange={handleMemoryImageChange}
                  disabled={memorySubmitting}
                />

                {!memoryPreview ? (
                  <label
                    htmlFor="activity-memory-image"
                    className="activity-memory-dropzone"
                  >
                    <div className="activity-memory-dropzone-content">
                      <div className="activity-memory-upload-icon">↑</div>
                      <strong>Choose a photo to share</strong>
                      <span>Click here to browse your device</span>
                    </div>
                  </label>
                ) : (
                  <div className="activity-memory-preview">
                    <span className="activity-memory-preview-badge">PHOTO PREVIEW</span>
                    <img
                      src={memoryPreview}
                      alt="Activity memory preview"
                    />
                  </div>
                )}

                <div className="activity-memory-caption-wrap">
                  <textarea
                    className="activity-memory-caption"
                    value={memoryCaption}
                    onChange={(event) => setMemoryCaption(event.target.value)}
                    maxLength={300}
                    placeholder="Write a caption... (optional)"
                    disabled={memorySubmitting}
                  />
                </div>

                <div className="activity-memory-actions">
                  <span className="activity-memory-character-count">
                    {memoryCaption.length}/300 characters
                  </span>

                  <button
                    type="button"
                    className="activity-memory-add-btn"
                    onClick={handleAddMemory}
                    disabled={memorySubmitting || !memoryImage}
                  >
                    {memorySubmitting ? "Adding memory..." : "Add Memory  📸"}
                  </button>
                </div>
              </div>

              {error && (
                <div className="activity-memory-inline-error" role="alert">
                  ⚠️ {error}
                </div>
              )}

              {success && (
                <div className="activity-memory-inline-success" role="status">
                  ✓ {success}
                </div>
              )}

              <div className="activity-memory-gallery">
                <div className="activity-memory-gallery-header">
                  <strong>Shared memories</strong>
                  {memories.length > 0 && (
                    <span className="activity-memory-gallery-count">
                      {memories.length}
                    </span>
                  )}
                </div>

                {memoriesLoading ? (
                  <div className="activity-memory-loading">
                    Loading your activity memories...
                  </div>
                ) : memories.length === 0 ? (
                  <div className="activity-memory-empty">
                    <div className="activity-memory-empty-icon">📷</div>
                    <strong>No memories have been shared yet</strong>
                    <p>Be the first member to add a moment from this activity.</p>
                  </div>
                ) : (
                  <div className="activity-memory-grid">
                    {memories.map((memory) => {
                      const authorName = memory.userName || "Let's Go member";
                      const authorInitial = authorName.trim().charAt(0).toUpperCase() || "L";

                      return (
                        <article
                          key={String(memory._id)}
                          className="activity-memory-card"
                        >
                          <div className="activity-memory-card-image">
                            <img
                              src={memory.imageUrl}
                              alt={memory.caption || "Activity memory"}
                              loading="lazy"
                            />
                          </div>

                          <div className="activity-memory-card-body">
                            <div className="activity-memory-author">
                              <div className="activity-memory-author-avatar">
                                {authorInitial}
                              </div>
                              <div>
                                <strong>{authorName}</strong>
                                {memory.createdAt && (
                                  <small className="activity-memory-date">
                                    {new Date(memory.createdAt).toLocaleDateString("en-IN", {
                                      day: "2-digit",
                                      month: "short",
                                      year: "numeric",
                                    })}
                                  </small>
                                )}
                              </div>
                            </div>

                            {memory.caption && (
                              <p className="activity-memory-card-caption">
                                {memory.caption}
                              </p>
                            )}
                          </div>
                        </article>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          </section>
        )}

        {/* ========================================
            ACTIVITY RATINGS
        ======================================== */}

        {isActivityFinished && (
          <>
            <style>{`
              .activity-rating-summary {
                display: flex;
                align-items: center;
                gap: 28px;
                padding: 26px;
                border: 1px solid rgba(148, 163, 184, 0.14);
                border-radius: 20px;
                background: rgba(255, 255, 255, 0.025);
              }

              .activity-rating-score {
                min-width: 130px;
                text-align: center;
              }

              .activity-rating-score strong {
                display: block;
                font-size: 42px;
                line-height: 1;
                color: #ffffff;
              }

              .activity-rating-stars,
              .activity-my-stars,
              .activity-review-stars {
                margin-top: 9px;
                letter-spacing: 2px;
                color: #fbbf24;
              }

              .activity-rating-stars {
                font-size: 19px;
              }

              .activity-rating-score small {
                display: block;
                margin-top: 8px;
                color: #94a3b8;
                font-size: 12px;
              }

              .activity-rating-summary-text {
                padding-left: 28px;
                border-left: 1px solid rgba(148, 163, 184, 0.14);
              }

              .activity-rating-summary-text strong {
                color: #ffffff;
                font-size: 16px;
              }

              .activity-rating-summary-text p {
                margin: 7px 0 0;
                max-width: 500px;
                color: #94a3b8;
                font-size: 13px;
                line-height: 1.6;
              }

              .activity-my-rating-card {
                display: flex;
                align-items: center;
                justify-content: space-between;
                gap: 20px;
                margin-top: 16px;
                padding: 22px 24px;
                border: 1px solid rgba(34, 197, 94, 0.18);
                border-radius: 18px;
                background: rgba(34, 197, 94, 0.045);
              }

              .activity-rating-label {
                display: block;
                margin-bottom: 6px;
                color: #94a3b8;
                font-size: 10px;
                font-weight: 800;
                letter-spacing: 0.12em;
              }

              .activity-my-stars {
                margin-top: 0;
                font-size: 18px;
              }

              .activity-my-rating-card p {
                margin: 10px 0 0;
                color: #cbd5e1;
                font-size: 13px;
                line-height: 1.6;
              }

              .activity-rated-badge {
                flex-shrink: 0;
                padding: 8px 12px;
                border: 1px solid rgba(34, 197, 94, 0.2);
                border-radius: 999px;
                background: rgba(34, 197, 94, 0.08);
                color: #86efac;
                font-size: 11px;
                font-weight: 800;
              }

              .activity-rating-form {
                margin-top: 16px;
                padding: 26px;
                border: 1px solid rgba(148, 163, 184, 0.15);
                border-radius: 20px;
                background: rgba(255, 255, 255, 0.025);
              }

              .activity-rating-form-header {
                display: flex;
                align-items: center;
                justify-content: space-between;
                gap: 20px;
              }

              .activity-rating-form-header span,
              .activity-reviews-header span {
                display: block;
                margin-bottom: 6px;
                color: #94a3b8;
                font-size: 10px;
                font-weight: 800;
                letter-spacing: 0.12em;
              }

              .activity-rating-form-header h3,
              .activity-reviews-header h3 {
                margin: 0;
                color: #ffffff;
                font-size: 18px;
              }

              .activity-rating-form-header > strong {
                color: #fbbf24;
                font-size: 14px;
              }

              .activity-star-selector {
                display: flex;
                gap: 6px;
                margin-top: 22px;
              }

              .activity-star-selector button {
                width: 44px;
                height: 44px;
                padding: 0;
                border: 1px solid rgba(148, 163, 184, 0.18);
                border-radius: 12px;
                background: rgba(255, 255, 255, 0.035);
                color: #475569;
                font-size: 23px;
                cursor: pointer;
                transition: 0.2s ease;
              }

              .activity-star-selector button:hover,
              .activity-star-selector button.active {
                border-color: rgba(251, 191, 36, 0.35);
                background: rgba(251, 191, 36, 0.08);
                color: #fbbf24;
                transform: translateY(-1px);
              }

              .activity-rating-textarea {
                width: 100%;
                min-height: 110px;
                margin-top: 18px;
                padding: 14px 16px;
                box-sizing: border-box;
                resize: vertical;
                border: 1px solid rgba(148, 163, 184, 0.16);
                border-radius: 12px;
                outline: none;
                background: rgba(2, 6, 23, 0.35);
                color: #ffffff;
                font-family: inherit;
                font-size: 13px;
                line-height: 1.6;
              }

              .activity-rating-textarea::placeholder {
                color: #64748b;
              }

              .activity-rating-textarea:focus {
                border-color: rgba(251, 191, 36, 0.35);
              }

              .activity-rating-form-footer {
                display: flex;
                align-items: center;
                justify-content: space-between;
                gap: 15px;
                margin-top: 12px;
              }

              .activity-rating-form-footer small {
                color: #64748b;
                font-size: 11px;
              }

              .activity-submit-rating-btn {
                min-height: 44px;
                padding: 0 18px;
                border: 1px solid rgba(251, 191, 36, 0.25);
                border-radius: 11px;
                background: rgba(251, 191, 36, 0.1);
                color: #fbbf24;
                font-size: 13px;
                font-weight: 800;
                cursor: pointer;
                transition: 0.2s ease;
              }

              .activity-submit-rating-btn:hover:not(:disabled) {
                background: rgba(251, 191, 36, 0.17);
                transform: translateY(-1px);
              }

              .activity-submit-rating-btn:disabled {
                opacity: 0.45;
                cursor: not-allowed;
              }

              .activity-rating-message {
                margin-top: 14px;
                padding: 11px 14px;
                border-radius: 10px;
                background: rgba(255, 255, 255, 0.04);
                color: #cbd5e1;
                font-size: 12px;
              }

              .activity-reviews {
                margin-top: 26px;
              }

              .activity-reviews-header {
                margin-bottom: 14px;
              }

              .activity-reviews-list {
                display: grid;
                gap: 12px;
              }

              .activity-review-card {
                padding: 20px;
                border: 1px solid rgba(148, 163, 184, 0.12);
                border-radius: 16px;
                background: rgba(255, 255, 255, 0.02);
              }

              .activity-review-person {
                display: flex;
                align-items: center;
                gap: 12px;
              }

              .activity-review-avatar {
                width: 38px;
                height: 38px;
                display: flex;
                align-items: center;
                justify-content: center;
                border-radius: 11px;
                background: rgba(255, 255, 255, 0.07);
                color: #ffffff;
                font-size: 14px;
                font-weight: 800;
              }

              .activity-review-person strong {
                display: block;
                color: #ffffff;
                font-size: 13px;
              }

              .activity-review-stars {
                margin-top: 3px;
                font-size: 12px;
              }

              .activity-review-card > p {
                margin: 14px 0 0;
                color: #94a3b8;
                font-size: 13px;
                line-height: 1.65;
              }

              @media (max-width: 600px) {
                .activity-rating-summary {
                  flex-direction: column;
                  align-items: flex-start;
                  gap: 20px;
                }

                .activity-rating-score {
                  width: 100%;
                  text-align: left;
                }

                .activity-rating-summary-text {
                  padding-left: 0;
                  padding-top: 18px;
                  border-left: 0;
                  border-top: 1px solid rgba(148, 163, 184, 0.14);
                }

                .activity-my-rating-card {
                  align-items: flex-start;
                  flex-direction: column;
                }

                .activity-rating-form {
                  padding: 20px;
                }

                .activity-rating-form-header {
                  align-items: flex-start;
                  flex-direction: column;
                }

                .activity-star-selector button {
                  width: 40px;
                  height: 40px;
                }

                .activity-rating-form-footer {
                  align-items: flex-start;
                  flex-direction: column;
                }

                .activity-submit-rating-btn {
                  width: 100%;
                }
              }
            `}</style>

            <section className="activity-details-section activity-rating-section">

              <div className="activity-details-section-title">
                <span>ACTIVITY EXPERIENCE</span>
                <h2>How was your experience?</h2>
              </div>

              <div className="activity-rating-summary">

                <div className="activity-rating-score">
                  <strong>
                    {averageRating > 0
                      ? averageRating.toFixed(1)
                      : "0.0"}
                  </strong>

                  <div className="activity-rating-stars">
                    {[1, 2, 3, 4, 5].map((star) => (
                      <span key={star}>
                        {star <= Math.round(averageRating)
                          ? "★"
                          : "☆"}
                      </span>
                    ))}
                  </div>

                  <small>
                    {totalRatings}{" "}
                    {totalRatings === 1
                      ? "rating"
                      : "ratings"}
                  </small>
                </div>

                <div className="activity-rating-summary-text">
                  <strong>
                    {totalRatings === 0
                      ? "Be the first to rate this activity."
                      : "Community experience"}
                  </strong>

                  <p>
                    Your feedback helps the Let's Go community
                    discover better activities and people.
                  </p>
                </div>

              </div>

              {ratingLoading ? (
                <div className="activity-rating-message">
                  Loading ratings...
                </div>
              ) : myRating ? (
                <div className="activity-my-rating-card">

                  <div>
                    <span className="activity-rating-label">
                      YOUR RATING
                    </span>

                    <div className="activity-my-stars">
                      {[1, 2, 3, 4, 5].map((star) => (
                        <span key={star}>
                          {star <= Number(myRating.rating)
                            ? "★"
                            : "☆"}
                        </span>
                      ))}
                    </div>

                    {myRating.review && (
                      <p>
                        "{myRating.review}"
                      </p>
                    )}
                  </div>

                  <span className="activity-rated-badge">
                    ✓ Rated
                  </span>

                </div>
              ) : (
                <div className="activity-rating-form">

                  <div className="activity-rating-form-header">
                    <div>
                      <span>
                        RATE YOUR EXPERIENCE
                      </span>

                      <h3>
                        Give this activity a rating
                      </h3>
                    </div>

                    <strong>
                      {selectedRating > 0
                        ? `${selectedRating}/5`
                        : "Select"}
                    </strong>
                  </div>

                  <div className="activity-star-selector">
                    {[1, 2, 3, 4, 5].map((star) => (
                      <button
                        key={star}
                        type="button"
                        className={
                          star <= selectedRating
                            ? "active"
                            : ""
                        }
                        onClick={() =>
                          setSelectedRating(star)
                        }
                        aria-label={`Rate ${star} out of 5`}
                      >
                        ★
                      </button>
                    ))}
                  </div>

                  <textarea
                    className="activity-rating-textarea"
                    value={reviewText}
                    onChange={(event) =>
                      setReviewText(
                        event.target.value
                      )
                    }
                    placeholder="Share a few words about your experience... (optional)"
                    maxLength={500}
                  />

                  <div className="activity-rating-form-footer">
                    <small>
                      {reviewText.length}/500
                    </small>

                    <button
                      type="button"
                      className="activity-submit-rating-btn"
                      onClick={handleSubmitRating}
                      disabled={
                        ratingSubmitting ||
                        !selectedRating
                      }
                    >
                      {ratingSubmitting
                        ? "Submitting..."
                        : "Submit Rating →"}
                    </button>
                  </div>

                  {ratingMessage && (
                    <div className="activity-rating-message">
                      {ratingMessage}
                    </div>
                  )}

                </div>
              )}

              {ratings.length > 0 && (
                <div className="activity-reviews">

                  <div className="activity-reviews-header">
                    <div>
                      <span>
                        COMMUNITY REVIEWS
                      </span>

                      <h3>
                        What people said
                      </h3>
                    </div>
                  </div>

                  <div className="activity-reviews-list">

                    {ratings.map((item) => {
                      const reviewerName =
                        item.reviewerId?.name ||
                        "Let's Go member";

                      return (
                        <div
                          className="activity-review-card"
                          key={item._id}
                        >

                          <div className="activity-review-person">

                            <div className="activity-review-avatar">
                              {reviewerName
                                .charAt(0)
                                .toUpperCase()}
                            </div>

                            <div>
                              <strong>
                                {reviewerName}
                              </strong>

                              <div className="activity-review-stars">
                                {[1, 2, 3, 4, 5].map(
                                  (star) => (
                                    <span key={star}>
                                      {star <=
                                      Number(item.rating)
                                        ? "★"
                                        : "☆"}
                                    </span>
                                  )
                                )}
                              </div>
                            </div>

                          </div>

                          {item.review && (
                            <p>
                              "{item.review}"
                            </p>
                          )}

                        </div>
                      );
                    })}

                  </div>

                </div>
              )}

            </section>
          </>
        )}

        {/* HOST ACTIONS */}

        {isCreator && (
          <section className="activity-host-actions">

            <div>

              <span>
                YOU'RE THE HOST
              </span>

              <h2>
                Manage your activity
              </h2>

            </div>

            {/* JOIN REQUESTS */}

            <div className="activity-join-requests">

              <div className="activity-join-requests-header">
                <div>
                  <span>
                    JOIN REQUESTS
                  </span>

                  <h3>
                    People who want to join
                  </h3>

                  <p>
                    Review requests before adding people
                    to your activity.
                  </p>
                </div>

                {joinRequests.length > 0 && (
                  <strong className="activity-join-request-count">
                    {joinRequests.length}
                  </strong>
                )}
              </div>

              {requestsLoading ? (
                <div className="activity-join-requests-empty">
                  Loading requests...
                </div>
              ) : joinRequests.length === 0 ? (
                <div className="activity-join-requests-empty">
                  <span>👋</span>
                  <div>
                    <strong>
                      No pending requests
                    </strong>
                    <p>
                      When someone requests to join,
                      their request will appear here.
                    </p>
                  </div>
                </div>
              ) : (
                <div className="activity-join-requests-list">
                  {joinRequests.map((request, index) => {
                    const requestUserId =
                      request?.userId?._id ||
                      request?.userId ||
                      request?._id ||
                      request?.id;

                    const requestName =
                      request?.name ||
                      request?.userId?.name ||
                      "Let's Go member";

                    const accepting =
                      requestActionLoading ===
                      `accept-${requestUserId}`;

                    const rejecting =
                      requestActionLoading ===
                      `reject-${requestUserId}`;

                    return (
                      <div
                        className="activity-join-request-item"
                        key={
                          requestUserId ||
                          request._id ||
                          index
                        }
                      >
                        <div className="activity-join-request-person">
                          <div className="activity-join-request-avatar">
                            {requestName
                              .charAt(0)
                              .toUpperCase()}
                          </div>

                          <div>
                            <strong>
                              {requestName}
                            </strong>
                            <small>
                              Wants to join this activity
                            </small>
                          </div>
                        </div>

                        <div className="activity-join-request-actions">
                          <button
                            type="button"
                            className="activity-join-request-reject"
                            onClick={() =>
                              handleRejectRequest(
                                requestUserId
                              )
                            }
                            disabled={
                              !!requestActionLoading ||
                              !requestUserId
                            }
                          >
                            {rejecting
                              ? "Rejecting..."
                              : "Reject"}
                          </button>

                          <button
                            type="button"
                            className="activity-join-request-accept"
                            onClick={() =>
                              handleAcceptRequest(
                                requestUserId
                              )
                            }
                            disabled={
                              !!requestActionLoading ||
                              !requestUserId
                            }
                          >
                            {accepting
                              ? "Accepting..."
                              : "Accept"}
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            <div className="activity-host-buttons">

              <Link
                to={`/edit-activity/${id}`}
                className="activity-edit-btn"
              >
                ✎ Edit Activity
              </Link>

              <Link
                to={`/activity/${id}/chat`}
                className="activity-group-chat-btn"
              >
                💬 Open Group Chat
              </Link>

              <button
  type="button"
  className="activity-invite-btn"
  onClick={handleOpenInvite}
>
  🤝 Invite People
</button>

              <button
                type="button"
                onClick={handleDelete}
                className="activity-delete-btn"
                disabled={deleting}
              >
                {deleting
                  ? "Deleting..."
                  : "Delete Activity"}
              </button>

            </div>

          </section>
        )}

        {/* JOIN */}

        {!isCreator && (
          <section className="activity-join-section">

            {isJoined ? (

              <div className="activity-joined-actions">

                <div className="activity-already-joined">
                  <span>
                    ✓
                  </span>

                  <div>
                    <strong>
                      You're already in!
                    </strong>

                    <p>
                      You have already joined this activity.
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  className="activity-leave-btn"
                  onClick={handleLeave}
                  disabled={joining}
                >
                  {joining
                    ? "Leaving..."
                    : "Leave Activity"}

                  {!joining && (
                    <span>
                      ←
                    </span>
                  )}
                </button>

                <Link
                  to={`/activity/${id}/chat`}
                  className="activity-group-chat-btn"
                >
                  💬 Group Chat
                </Link>

              </div>

            ) : requestStatus === "pending" ? (

              <div className="activity-request-pending">

                <div className="activity-request-pending-icon">
                  ⏳
                </div>

                <div>
                  <strong>
                    Request Pending
                  </strong>

                  <p>
                    Your request is waiting for the host's approval.
                  </p>
                </div>

              </div>

            ) : (

              <button
                type="button"
                className="activity-join-btn"
                onClick={handleJoin}
                disabled={
                  joining || isFull
                }
              >
                {joining
                  ? "Sending Request..."
                  : isFull
                  ? "Activity Full"
                  : "Request to Join"}

                {!joining &&
                  !isFull && (
                    <span>
                      →
                    </span>
                  )}
              </button>

            )}

          </section>
        )}

       {/* REPORT ACTIVITY */}

{!isCreator && (
  <section className="lg-report-card">

    <div className="lg-report-icon">
      🛡
    </div>

    <div className="lg-report-content">

      <span className="lg-report-label">
        COMMUNITY SAFETY
      </span>

      <h3>
        See something inappropriate?
      </h3>

      <p>
        Help us keep Let's Go safe. Report this activity if you think it
        violates our community guidelines.
      </p>

    </div>

    <button
  type="button"
  className="lg-report-button"
  onClick={() => {
    if (isCreator) {
      setError("You cannot report your own activity.");
      return;
    }

    setError("");
    setReportReason("");
    setReportDetails("");
    setShowReportModal(true);
  }}
  disabled={reporting}
>
  <span>
    Report Activity
  </span>

  <span className="lg-report-arrow">
    →
  </span>
</button>

  </section>
)}

      </main>
{/* ========================================
    INVITE PEOPLE PANEL
======================================== */}

{showInvitePanel && (
  <div
    className="invite-modal-overlay"
    onClick={() =>
      setShowInvitePanel(false)
    }
  >
    <div
      className="invite-modal"
      onClick={(event) =>
        event.stopPropagation()
      }
    >

      <div className="invite-modal-header">

        <div>
          <span className="invite-modal-label">
            YOUR NETWORK
          </span>

          <h2>
            Invite People
          </h2>

          <p>
            Invite your connections to join
            this activity.
          </p>
        </div>

        <button
          type="button"
          className="invite-close-btn"
          onClick={() =>
            setShowInvitePanel(false)
          }
        >
          ×
        </button>

      </div>


      {connectionsLoading ? (
        <div className="invite-loading">
          Loading your connections...
        </div>
      ) : connections.length === 0 ? (
        <div className="invite-empty">

          <div className="invite-empty-icon">
            🤝
          </div>

          <h3>
            No connections yet
          </h3>

          <p>
            Connect with people first, then
            invite them to your activities.
          </p>

          <button
            type="button"
            className="invite-discover-btn"
            onClick={() =>
              navigate("/connections")
            }
          >
            View Connections →
          </button>

        </div>
      ) : (
        <div className="invite-people-list">

          {connections.map(
            (connection) => {

              const person =
                getOtherConnectionUser(
                  connection,
                  getCurrentUserId()
                );

              if (!person) {
                return null;
              }

              const personId =
                getUserId(person);

              if (!personId) {
                return null;
              }

              const personName =
                person.name ||
                "Let's Go member";

              const alreadyInvited =
                invitedUsers.includes(
                  String(personId)
                );

              const alreadyJoined =
                activity.joinedUsers?.some(
                  (joinedUser) =>
                    String(
                      getJoinedUserId(
                        joinedUser
                      )
                    ) ===
                    String(personId)
                );

              return (
                <div
                  className="invite-person-card"
                  key={
                    connection._id ||
                    personId
                  }
                >

                  <div className="invite-person-avatar">
                    {personName
                      .charAt(0)
                      .toUpperCase()}
                  </div>

                  <div className="invite-person-info">

                    <strong>
                      {personName}
                    </strong>

                    <span>
                      Connected with you
                    </span>

                  </div>

                  {alreadyJoined ? (
                    <span className="invite-status joined">
                      Joined ✓
                    </span>
                  ) : alreadyInvited ? (
                    <span className="invite-status invited">
                      Invited ✓
                    </span>
                  ) : (
                    <button
                      type="button"
                      className="invite-send-btn"
                      onClick={() =>
                        handleInviteUser(
                          personId
                        )
                      }
                      disabled={
                        inviteLoading ===
                        personId
                      }
                    >
                      {inviteLoading ===
                      personId
                        ? "Sending..."
                        : "Invite"}
                    </button>
                  )}
                </div>
              );
            }
          )}

        </div>
      )}



    </div>
  </div>
)}

      {memberToRemove && (
  <div
    className="member-remove-modal-overlay"
    onClick={() => setMemberToRemove(null)}
  >
    <div
      className="member-remove-modal"
      onClick={(event) => event.stopPropagation()}
    >
      <div className="member-remove-modal-icon">
        ⚠️
      </div>

      <div className="member-remove-modal-content">
        <span className="member-remove-modal-label">
          REMOVE MEMBER
        </span>

        <h2>Remove {memberToRemove.name}?</h2>

        <p>
          This member will be removed from the activity
          and will lose access to the group chat.
        </p>
      </div>

      <div className="member-remove-modal-actions">
        <button
          type="button"
          className="member-remove-cancel-btn"
          onClick={() => setMemberToRemove(null)}
        >
          Cancel
        </button>

        <button
          type="button"
          className="member-remove-confirm-btn"
          onClick={() => {
            handleRemoveMember(
              memberToRemove.userId
            );
            setMemberToRemove(null);
          }}
        >
          Remove Member
        </button>
      </div>
    </div>
  </div>
)}

{/* ========================================
    REPORT ACTIVITY MODAL
======================================== */}

{showReportModal && (
  <div
    className="lg-report-modal-overlay"
    onClick={() => {
      if (!reporting) {
        setShowReportModal(false);
      }
    }}
  >
    <div
      className="lg-report-modal"
      onClick={(event) =>
        event.stopPropagation()
      }
    >

      <div className="lg-report-modal-header">

        <div className="lg-report-modal-icon">
          🛡️
        </div>

        <div>
          <span className="lg-report-modal-label">
            COMMUNITY SAFETY
          </span>

          <h2>
            Report Activity
          </h2>

          <p>
            Help us keep Let's Go safe by telling
            us what went wrong.
          </p>
        </div>

        <button
          type="button"
          className="lg-report-modal-close"
          onClick={() => {
            if (!reporting) {
              setShowReportModal(false);
            }
          }}
          disabled={reporting}
        >
          ×
        </button>

      </div>

      <div className="lg-report-modal-body">

        <label className="lg-report-field-label">
          WHY ARE YOU REPORTING THIS?
        </label>

        <div className="lg-report-reasons">

          {[
  {
    value: "Inappropriate content",
    label: "Inappropriate content",
    icon: "🚫",
  },
  {
    value: "Harassment",
    label: "Harassment or abusive behavior",
    icon: "⚠️",
  },
  {
    value: "Fake activity",
    label: "Fake or misleading activity",
    icon: "🎭",
  },
  {
    value: "Unsafe activity",
    label: "Unsafe activity",
    icon: "🛡️",
  },
  {
    value: "Spam",
    label: "Spam",
    icon: "📢",
  },
  {
    value: "Other",
    label: "Other",
    icon: "•••",
  },
].map((reason) => (
            <button
              key={reason.label}
              type="button"
              className={`lg-report-reason ${
                reportReason === reason.value
                  ? "active"
                  : ""
              }`}
              onClick={() => {
                setError("");
                setReportReason(reason.value);
              }}
              disabled={reporting}
            >
              <span className="lg-report-reason-icon">
                {reason.icon}
              </span>

              <span>
                {reason.label}
              </span>

              <span className="lg-report-reason-check">
                {reportReason === reason.value
                  ? "✓"
                  : ""}
              </span>
            </button>
          ))}

        </div>

        <label
          htmlFor="lg-report-details"
          className="lg-report-field-label"
        >
          ADDITIONAL DETAILS
          <span>OPTIONAL</span>
        </label>

        <textarea
          id="lg-report-details"
          className="lg-report-details"
          value={reportDetails}
          onChange={(event) =>
            setReportDetails(
              event.target.value
            )
          }
          placeholder="Tell us anything else that may help us understand the issue..."
          maxLength={500}
          disabled={reporting}
        />

        <div className="lg-report-character-count">
          {reportDetails.length}/500
        </div>

        {error && (
          <div className="lg-report-modal-error">
            ⚠️ {error}
          </div>
        )}

      </div>

      <div className="lg-report-modal-footer">

        <button
          type="button"
          className="lg-report-cancel-btn"
          onClick={() =>
            setShowReportModal(false)
          }
          disabled={reporting}
        >
          Cancel
        </button>

        <button
          type="button"
          className="lg-report-submit-btn"
          onClick={handleReport}
          disabled={
            reporting ||
            !reportReason
          }
        >
          {reporting
            ? "Submitting..."
            : "Submit Report →"}
        </button>

      </div>

    </div>
  </div>
)}
    </div>
  );
}

export default ActivityDetails;
