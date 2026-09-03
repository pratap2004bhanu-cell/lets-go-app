import MessagePopup from "../components/MessagePopup";
import { Link } from "react-router-dom";

const activities = [
  {
    icon: "🏏",
    title: "Cricket",
    description: "Find people to play cricket with.",
    people: "23 people nearby",
  },
  {
    icon: "🏋️",
    title: "Gym",
    description: "Find a workout partner.",
    people: "18 people nearby",
  },
  {
    icon: "🎮",
    title: "Gaming",
    description: "Find gaming buddies.",
    people: "31 people nearby",
  },
  {
    icon: "☕",
    title: "Coffee",
    description: "Meet someone for coffee.",
    people: "12 people nearby",
  },
  {
    icon: "📚",
    title: "Study",
    description: "Find study partners.",
    people: "27 people nearby",
  },
  {
    icon: "🎬",
    title: "Movies",
    description: "Find people to watch movies with.",
    people: "16 people nearby",
  },
];

function Home() {
  return (
    <main className="home-page">

      {/* HERO */}
      <section className="hero-section">

        <div className="hero-content">

          <div className="hero-badge">
            <span className="status-dot"></span>
            PEOPLE ARE WAITING NEAR YOU
          </div>

          <h1>
            Find people.
            <br />
            <span>Do things.</span>
            <br />
            Let's Go.
          </h1>

          <p className="hero-description">
            Connect with people nearby who want to do the same things as you.
            No awkward introductions. Just choose an activity and go.
          </p>

          <div className="hero-buttons">
            <Link to="/discover" className="primary-btn">
              Find an Activity
              <span>→</span>
            </Link>

            <Link to="/create-activity" className="secondary-btn">
              Create Activity
              <span>＋</span>
            </Link>
          </div>

          <div className="hero-stats">
            <div>
              <strong>2.4K+</strong>
              <span>People</span>
            </div>

            <div>
              <strong>680+</strong>
              <span>Activities</span>
            </div>

            <div>
              <strong>24/7</strong>
              <span>Connections</span>
            </div>
          </div>

        </div>

        {/* HERO VISUAL */}
        <div className="hero-visual">

          <div className="visual-glow"></div>

          <div className="visual-card">

            <div className="visual-top">
              <span>LIVE DISCOVERY</span>

              <span className="live-status">
                <span className="live-dot"></span>
                LIVE
              </span>
            </div>

            <div className="location-row">
              <span>📍</span>
              <div>
                <small>YOUR LOCATION</small>
                <strong>Vadodara · 5 km</strong>
              </div>
            </div>

            <div className="nearby-title">
              <span>ACTIVITIES NEAR YOU</span>
              <span className="pulse">●</span>
            </div>

            <div className="live-activity cricket">
              <div className="live-icon">🏏</div>

              <div className="live-info">
                <strong>Cricket this Sunday</strong>
                <span>23 people interested</span>
              </div>

              <span className="activity-arrow">→</span>
            </div>

            <div className="live-activity gaming">
              <div className="live-icon">🎮</div>

              <div className="live-info">
                <strong>Gaming tonight</strong>
                <span>14 people interested</span>
              </div>

              <span className="activity-arrow">→</span>
            </div>

            <div className="live-activity coffee">
              <div className="live-icon">☕</div>

              <div className="live-info">
                <strong>Coffee & chill</strong>
                <span>8 people interested</span>
              </div>

              <span className="activity-arrow">→</span>
            </div>

            <div className="matching-status">
              <div className="avatar-stack">
                <span>👨🏻</span>
                <span>👩🏻</span>
                <span>🧑🏻</span>
              </div>

              <div>
                <strong>People like you are active</strong>
                <span>right now</span>
              </div>
            </div>

          </div>

        </div>

      </section>


      {/* ACTIVITIES */}
      <section className="activities-section">

        <div className="section-heading">

          <div>
            <div className="section-label">EXPLORE</div>

            <h2>
              What do you want to <span>do?</span>
            </h2>

            <p>
              Choose something you enjoy and find people to do it with.
            </p>
          </div>

          <Link to="/discover" className="view-all-btn">
            View all →
          </Link>

        </div>


        <div className="activity-grid">

          {activities.map((activity) => (
            <Link
              to="/discover"
              className="activity-card"
              key={activity.title}
            >

              <div className="activity-card-top">

                <div className="activity-icon">
                  {activity.icon}
                </div>

                <span className="arrow-icon">↗</span>

              </div>

              <h3>{activity.title}</h3>

              <p>{activity.description}</p>

              <div className="activity-people">
                <span className="mini-dot"></span>
                {activity.people}
              </div>

            </Link>
          ))}

        </div>

      </section>


      {/* HOW IT WORKS */}
      <section className="how-section">

        <div className="section-label">HOW IT WORKS</div>

        <h2>
          Three steps.
          <br />
          <span>One good time.</span>
        </h2>

        <div className="steps">

          <div className="step">
            <span>01</span>

            <div>
              <h3>Choose an activity</h3>
              <p>
                Pick something you actually want to do — cricket, gaming,
                coffee, studying and more.
              </p>
            </div>
          </div>

          <div className="step">
            <span>02</span>

            <div>
              <h3>Find your people</h3>
              <p>
                Discover people nearby who are interested in doing the same
                thing.
              </p>
            </div>
          </div>

          <div className="step">
            <span>03</span>

            <div>
              <h3>Just go</h3>
              <p>
                Connect, make a plan and meet up. No awkward introductions.
              </p>
            </div>
          </div>

        </div>

      </section>


      {/* FINAL CTA */}
      <section className="final-cta">

        <div>
          <div className="section-label">YOUR NEXT ADVENTURE</div>

          <h2>
            Stop scrolling.
            <br />
            <span>Start going.</span>
          </h2>
        </div>

        <Link to="/discover" className="primary-btn">
          Find people →
        </Link>

      </section>
      <MessagePopup />

    </main>
  );
}

export default Home;