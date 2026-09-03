import UserProfile from "./pages/UserProfile";
import EditActivity from "./pages/EditActivity";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Connections from "./pages/Connections";
import Notifications from "./pages/Notifications";
import ActivityChat from "./pages/ActivityChat";

import "./App.css";

import Navbar from "./components/Navbar.jsx";
import Preferences from "./pages/Preferences.jsx";

import Home from "./pages/Home.jsx";
import Login from "./pages/Login.jsx";
import Register from "./pages/Register.jsx";
import Discover from "./pages/Discover.jsx";
import CreateActivity from "./pages/CreateActivity.jsx";
import Profile from "./pages/Profile.jsx";
import ActivityDetails from "./pages/ActivityDetails.jsx";
import Chat from "./pages/Chat.jsx";
import Messages from "./pages/Messages.jsx";

function App() {
  return (
    <BrowserRouter>
      <Navbar />

      <Routes>
        <Route path="/" element={<Home />} />
        <Route
  path="/notifications"
  element={<Notifications />}
/>
        <Route path="/login" element={<Login />} />
        <Route
  path="/connections"
  element={<Connections />}
/>
        <Route path="/register" element={<Register />} />
        <Route path="/discover" element={<Discover />} />
        <Route
  path="/user/:id"
  element={<UserProfile />}
/>
        <Route path="/create-activity" element={<CreateActivity />} />
        <Route
  path="/edit-activity/:id"
  element={<EditActivity />}
/>
        <Route path="/profile" element={<Profile />} />
        <Route
  path="/messages"
  element={<Messages />}
/>
        

        <Route path="/activity/:id" element={<ActivityDetails />} />

        <Route
  path="/activity/:id/chat"
  element={<ActivityChat />}
/>
        <Route
  path="/preferences"
  element={<Preferences />}
/>
        <Route
  path="/chat/:userId"
  element={<Chat />}
/>
      </Routes>
    </BrowserRouter>
  );
}

export default App;