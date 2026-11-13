import "./App.css";
import { useState, useEffect, useRef } from "react";
import Register from "./Register";
import Login from "./Login";
import { BrowserRouter, Routes, Route, Navigate , useNavigate } from "react-router-dom";

function Home() {
    const navigate = useNavigate();
 const [showQueue, setShowQueue] = useState(false);
 const queueSectionRef = useRef(null);


  const [showRegister, setShowRegister] = useState(false);
  const [showLogin, setShowLogin] = useState(false);
  const [loggedInUser, setLoggedInUser] = useState(() => {
  try {
    return JSON.parse(localStorage.getItem("queuewiseUser"));
  } catch {
    return null;
  }
});
 const [selectedService, setSelectedService] = useState("Medical Consultation");
 useEffect(() => {
  if (showQueue) {
    queueSectionRef.current?.scrollIntoView({
      behavior: "smooth",
      block: "start",
    });
  }
}, [showQueue, selectedService]);
 const [myToken, setMyToken] = useState(null);
 const [searchToken, setSearchToken] = useState("");
const [trackedToken, setTrackedToken] = useState(null);
const [trackedPosition, setTrackedPosition] = useState(null);
const [trackedPeopleAhead, setTrackedPeopleAhead] = useState(null);
const [trackLoading, setTrackLoading] = useState(false);
const [trackError, setTrackError] = useState("");
 const [queuePosition, setQueuePosition] = useState(null);
const [peopleAhead, setPeopleAhead] = useState(null);
const [totalWaiting, setTotalWaiting] = useState(null);
// Dynamic Waiting Time
const [waitingEstimate, setWaitingEstimate] = useState(null);
const [estimateLoading, setEstimateLoading] = useState(false);
const [estimateError, setEstimateError] = useState("");
// Average Service Time

const [visitAnalysis, setVisitAnalysis] = useState(null);
const [analysisLoading, setAnalysisLoading] = useState(false);
const [analysisError, setAnalysisError] = useState("");const [averageTimes, setAverageTimes] = useState([]);
const [averageLoading, setAverageLoading] = useState(false);
const [averageError, setAverageError] = useState("");
const loadAverageTimes = async () => {
  setAverageLoading(true);
  setAverageError("");

  try {
    const response = await fetch(
      "http://localhost:5000/api/tokens/average-time"
    );

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.message || "Could not load average service time.");
    }

    setAverageTimes(data.averageTimes || []);
  } catch (error) {
    setAverageError(error.message || "Could not connect to backend.");
  } finally {
    setAverageLoading(false);
  }
};
const loadVisitAnalysis = async () => {
  setAnalysisLoading(true);
  setAnalysisError("");

  try {
    const response = await fetch(
      "http://localhost:5000/api/tokens/visit-analysis"
    );

    const data = await response.json();

    if (!response.ok) {
      throw new Error(
        data.message || "Could not load visit analysis."
      );
    }

    setVisitAnalysis(data);
    console.log("VISIT ANALYSIS:", data);
  } catch (error) {
    setAnalysisError(
      error.message || "Could not connect to backend."
    );
  } finally {
    setAnalysisLoading(false);
  }
};
// Load Dynamic Waiting Time Estimate
const loadWaitingEstimate = async (tokenNumber) => {
  if (!tokenNumber) return;

  setEstimateLoading(true);
  setEstimateError("");
  setWaitingEstimate(null);

  try {
    const response = await fetch(
      `http://localhost:5000/api/tokens/estimate?tokenNumber=${encodeURIComponent(tokenNumber)}`
    );

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.message || "Could not calculate waiting time.");
    }

    setWaitingEstimate(data);
  } catch (error) {
    setEstimateError(error.message || "Could not connect to backend.");
  } finally {
    setEstimateLoading(false);
  }
};
const handleTrackToken = async (e) => {
  e.preventDefault();

  if (!searchToken.trim()) {
    setTrackError("Please enter a token number.");
    setTrackedToken(null);
    return;
  }

  setTrackLoading(true);
  setTrackError("");
  setTrackedToken(null);
  setTrackedPosition(null);
  setTrackedPeopleAhead(null);

  try {
    const response = await fetch(
      `http://localhost:5000/api/tokens/position?tokenNumber=${encodeURIComponent(searchToken.trim())}`
    );

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.message || "Token not found.");
    }

    setTrackedToken(searchToken.trim());
    setTrackedPosition(data.position);
    setTrackedPeopleAhead(data.peopleAhead);

  } catch (error) {
    setTrackError(error.message || "Could not connect to backend.");
  } finally {
    setTrackLoading(false);
  }
};
useEffect(() => {
  loadAverageTimes();
  loadVisitAnalysis();
}, []);
 
useEffect(() => {
  const loadMyToken = async () => {
    const savedUser = localStorage.getItem("queuewiseUser");

    if (!savedUser) return;

    try {
      const user = JSON.parse(savedUser);

      const response = await fetch(
        `http://localhost:5000/api/tokens?userEmail=${encodeURIComponent(user.email)}`
      );

      const data = await response.json();

      if (response.ok && data.tokens?.length > 0) {
        const activeStatuses = ["Waiting", "Serving"];

        const savedToken =
          data.tokens.find(
            (token) =>
              token.service === selectedService &&
              activeStatuses.includes(token.status)
          ) ||
          data.tokens.find((token) =>
            activeStatuses.includes(token.status)
          ) ||
          data.tokens[0];

        setMyToken(savedToken.tokenNumber);
        loadWaitingEstimate(savedToken.tokenNumber);
      }
    } catch (error) {
      console.error("Could not load saved token:", error);
    }
  };

  loadMyToken();
}, []);
 const queueData = {
  "Medical Consultation": {
    nowServing: "Q-024",
    waiting: "08",
    waitTime: "18 min",
    position: "Q-032",
  },
  "Diagnostic Test": {
    nowServing: "D-011",
    waiting: "05",
    waitTime: "12 min",
    position: "D-016",
  },
  "Pharmacy Service": {
    nowServing: "P-018",
    waiting: "11",
    waitTime: "25 min",
    position: "P-029",
  },
  "Billing / Payment": {
    nowServing: "B-007",
    waiting: "04",
    waitTime: "8 min",
    position: "B-011",
  },
};
 const currentQueue = queueData[selectedService];



  return (
    <div className="app">
      {showRegister && (
  <Register />
)}
{showLogin && (
  <Login
    onLoginSuccess={(user) => {
      setLoggedInUser(user);
      setShowLogin(false);
    }}
  />
)}

      {/* ================= NAVBAR ================= */}
      <nav className="navbar">
        <div className="brand">
          <div className="brand-mark">Q</div>
          <div>
            <h2>QueueWise</h2>
            <span>Smart Visit Intelligence</span>
          </div>
        </div>

        <div className="nav-links">
          <a href="#home">Home</a>
          <a href="#services">Services</a>
          <a href="#recommendation">Recommendation</a>
          <a href="#how-it-works">How It Works</a>
        </div>


{loggedInUser ? (
  <div className="nav-profile">
    <span className="profile-avatar">
      {loggedInUser.name?.charAt(0).toUpperCase() || "U"}
    </span>

    <div className="profile-details">
      <strong>{loggedInUser.name}</strong>
      <span>{loggedInUser.email}</span>
    </div>

    <button
      className="nav-login"
      onClick={() => {
        localStorage.removeItem("queueWiseUser");
        setLoggedInUser(null);
        setMyToken(null);
        navigate("/login");
      }}
    >
      Logout
    </button>
  </div>
) : (
  <>
    <button
      className="nav-login"
      onClick={() => navigate("/login")}
    >
      Login
    </button>

    <button
      className="nav-login"
      onClick={() => navigate("/register")}
    >
      Register
    </button>
  </>
)}
</nav>

      {/* ================= HERO ================= */}
      <main id="home">

        <section className="hero">

          <div className="hero-content">

            <div className="eyebrow">
              <span className="pulse-dot"></span>
              INTELLIGENT QUEUE MONITORING
            </div>

            <h1>
              Don't wait.
              <br />
              <span>Know when to go.</span>
            </h1>

            <p>
              QueueWise monitors queue activity, estimates waiting time,
              and recommends a better time to visit — so you can spend
              less time waiting and more time doing what matters.
            </p>

            <div className="hero-actions">
              <button
  className="primary-btn"
  onClick={() => setShowQueue(true)}
>
  Check Queue
  <span>→</span>
</button>

              <button className="outline-btn">
                Explore Services
              </button>
            </div>

            <div className="hero-trust">
              <div>
                <strong>24/7</strong>
                <span>Queue Monitoring</span>
              </div>

              <div>
                <strong>Live</strong>
                <span>Waiting Estimates</span>
              </div>

              <div>
                <strong>Smart</strong>
                <span>Visit Suggestions</span>
              </div>
            </div>

          </div>


          {/* ================= LIVE QUEUE CARD ================= */}

          <div className="queue-visual">

            <div className="floating-label">
              <span className="live-dot"></span>
              LIVE QUEUE
            </div>

            <div className="queue-card">

              <div className="queue-card-top">
                <div>
                  <span className="small-label">CURRENT SERVICE</span>
                  <h3>Medical Consultation</h3>
                </div>

                <div className="status-badge">
                  Moderate
                </div>
              </div>


              <div className="current-token">
                <span>NOW SERVING</span>
                <strong>{currentQueue.nowServing}</strong>
              </div>


              <div className="queue-stats">

                <div className="stat">
                  <span>Waiting</span>
                  <strong>{currentQueue.waiting}</strong>
                  <small>people</small>
                </div>

                <div className="stat">
                  <span>Estimated</span>
                  <strong>18</strong>
                  <small>minutes</small>
                </div>

                <div className="stat">
                  <span>Active</span>
                  <strong>03</strong>
                  <small>counters</small>
                </div>

              </div>


              <div className="queue-line">
                <div className="line-header">
                  <span>Queue activity</span>
                  <span>Moderate</span>
                </div>

                <div className="activity-bars">
                  <i></i>
                  <i></i>
                  <i></i>
                  <i></i>
                  <i></i>
                  <i></i>
                  <i></i>
                  <i></i>
                  <i></i>
                  <i></i>
                  <i></i>
                  <i></i>
                </div>
              </div>


              <div className="recommendation-mini">

                <div className="recommendation-icon">
                  ✦
                </div>

                <div>
                  <span>QUEUEWISE RECOMMENDS</span>
                  <strong>3:00 PM – 4:00 PM</strong>
                  <p>Expected lower waiting time</p>
                </div>

              </div>

            </div>

          </div>

        </section>
       {showQueue && <h2>QUEUE TEST VISIBLE</h2>}
        {showQueue && (
  <section
  className="queue-status-section"
  ref={queueSectionRef}
>

    <div className="queue-status-card">

      <div className="queue-status-header">
        <div>
          <span className="section-tag">LIVE QUEUE STATUS</span>
          <select className="service-select"
           value={selectedService}
  onChange={(e) => {
  setSelectedService(e.target.value);
  setMyToken(null);
}}
  >
  <option>Medical Consultation</option>
 <option>Diagnostic Test</option>
<option>Pharmacy Service</option>
<option>Billing / Payment</option>

</select>
          <h2>{selectedService}</h2>
          <p>Current queue information</p>
        </div>

        <span className="live-status">
          ● LIVE
        </span>
      </div>

     <div className="queue-status-grid">

  <div className="queue-info">
    <span>NOW SERVING</span>
    <strong>{currentQueue.nowServing}</strong>
  </div>

  <div className="queue-info">
    <span>PEOPLE WAITING</span>
    <strong>{currentQueue.waiting}</strong>
  </div>

  <div className="queue-info">
    <span>ESTIMATED WAIT</span>
    <strong>{currentQueue.waitTime}</strong>
  </div>

</div>




<div className="token-action">
  <button
    className="primary-btn"
    onClick={async () => {
      const savedUser = localStorage.getItem("queuewiseUser");

      if (!savedUser) {
        alert("Please login before generating a token.");
        return;
      }

      try {
        const user = JSON.parse(savedUser);

        const response = await fetch("http://localhost:5000/api/tokens", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            service: selectedService,
            userEmail: user.email,
          }),
        });

        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.message || "Could not generate token.");
        }

        const generatedToken = data.token.tokenNumber;

        setMyToken(generatedToken);
        setQueuePosition(null);
        setPeopleAhead(null);
        setTotalWaiting(null);
        setWaitingEstimate(null);
        setEstimateError("");

        const positionResponse = await fetch(
          `http://localhost:5000/api/tokens/position?tokenNumber=${encodeURIComponent(generatedToken)}`
        );

        const positionData = await positionResponse.json();

        if (positionResponse.ok) {
          setQueuePosition(positionData.position);
          setPeopleAhead(positionData.peopleAhead);
          setTotalWaiting(positionData.totalWaiting);
        }

        loadWaitingEstimate(generatedToken);

        alert("QueueWise Smart Digital Pass created successfully!");
      } catch (error) {
        alert(error.message || "Could not connect to the backend.");
      }
    }}
  >
    Get Token <span>→</span>
  </button>
</div>
{/* EXISTING TOKEN TRACKING */}

<div className="token-action" style={{
  display: "flex",
  flexDirection: "column",
  gap: "12px",
  marginTop: "20px"
}}>
  <h3>Track Existing Token</h3>

  <form
    onSubmit={handleTrackToken}
    style={{
      display: "flex",
      gap: "10px",
      flexWrap: "wrap"
    }}
  >
    <input
      type="text"
      value={searchToken}
      onChange={(e) => setSearchToken(e.target.value)}
      placeholder="Enter your token number"
      style={{
        flex: "1",
        minWidth: "180px",
        padding: "13px",
        borderRadius: "8px",
        border: "1px solid #ccc"
      }}
    />

    <button
      type="submit"
      className="primary-btn"
      disabled={trackLoading}
    >
      {trackLoading ? "Checking..." : "Track Token"}
    </button>
  </form>

  {trackError && (
    <p style={{
      color: "#dc2626",
      background: "#fef2f2",
      padding: "12px",
      borderRadius: "8px"
    }}>
      {trackError}
    </p>
  )}

  {trackedToken && (
    <div className="my-token">
      <span>TRACKED TOKEN</span>
      <strong>{trackedToken}</strong>
      <p>Queue Position: {trackedPosition ?? "--"}</p>
      <p>People Ahead: {trackedPeopleAhead ?? "--"}</p>
    </div>
  )}
</div>


{myToken && (
  <div className="my-token">
    <span>YOUR TOKEN</span>
    <strong>{myToken}</strong>

    {queuePosition !== null ? (
      <>
        <p>Your queue position: {queuePosition}</p>
        <p>People ahead of you: {peopleAhead}</p>
        <p>Total people waiting: {totalWaiting}</p>
      </>
    ) : (
      <p>Loading your queue position...</p>
    )}
  </div>
)}

{/* DYNAMIC WAITING TIME ESTIMATE */}
{myToken && (
  <div className="my-token estimate-card">
    <span>SMART WAITING ESTIMATE</span>

    {estimateLoading ? (
      <p>Calculating your waiting time...</p>
    ) : estimateError ? (
      <p>{estimateError}</p>
    ) : waitingEstimate ? (
      waitingEstimate.estimateAvailable ? (
        <>
          <p>People Ahead: {waitingEstimate.peopleAhead ?? "--"}</p>
          <p>Average Service Time: {waitingEstimate.averageServiceTime} min</p>
          <p>
            Estimated Waiting Time: {waitingEstimate.estimatedWaitingTime} min
          </p>
          <p>
            Expected Serving Time:{" "}
            {waitingEstimate.expectedServingTime
              ? new Date(waitingEstimate.expectedServingTime).toLocaleString()
              : "--"}
          </p>
        </>
      ) : (
        <p>{waitingEstimate.message}</p>
      )
    ) : (
      <p>Waiting for estimate...</p>
    )}

    <button
      className="average-refresh-btn"
      onClick={() => loadWaitingEstimate(myToken)}
      disabled={estimateLoading}
    >
      {estimateLoading ? "Calculating..." : "Refresh Estimate"}
    </button>
  </div>
)}


    </div>

  </section>
)}
{/* ================= SMART VISIT INTELLIGENCE ================= */}

<section className="smart-visit-section">

  <div className="smart-visit-header">
    <div>
      <span className="section-tag">SMART VISIT INTELLIGENCE</span>
      <h2>Find Your Best Time to Visit</h2>
      <p>
        Understand queue patterns and plan your visit more efficiently.
      </p>
    </div>

    <button
      className="average-refresh-btn"
      onClick={loadVisitAnalysis}
      disabled={analysisLoading}
    >
      {analysisLoading ? "Analyzing..." : "↻ Refresh"}
    </button>
  </div>

  {analysisLoading ? (
    <div className="smart-visit-message">
      Analyzing historical queue patterns...
    </div>
  ) : analysisError ? (
    <div className="smart-visit-message error">
      {analysisError}
    </div>
  ) : visitAnalysis?.analysisAvailable ? (

    <div className="smart-visit-content">

      <div className="smart-visit-stats">

        <div className="smart-visit-card">
          <div className="smart-visit-card-top">
            <span className="smart-visit-icon">▦</span>
            <span className="smart-visit-label">BUSIEST DAY</span>
          </div>

          <strong>{visitAnalysis.busiestDay}</strong>

          <p>
            <b>{visitAnalysis.busiestDayCount}</b> recorded visits
          </p>
        </div>

        <div className="smart-visit-card">
          <div className="smart-visit-card-top">
            <span className="smart-visit-icon">◷</span>
            <span className="smart-visit-label">PEAK QUEUE TIME</span>
          </div>

          <strong>{visitAnalysis.busiestTime}</strong>

          <p>
            <b>{visitAnalysis.busiestTimeCount}</b> queue entries
          </p>
        </div>

      </div>

      <div className="best-visit-card">
        <div className="best-visit-top">
          <div>
            <span className="best-visit-eyebrow">
              <span className="best-visit-dot"></span>
              QUEUEWISE RECOMMENDS
            </span>

            <h3>Recommended Visit Time</h3>
          </div>

          <span className="best-visit-badge">BETTER TIME</span>
        </div>

        <strong className="best-visit-time">
          {visitAnalysis.recommendedVisitTime}
        </strong>

        <p className="best-visit-description">
          {visitAnalysis.message}
        </p>

      </div>

    </div>

  ) : (
    <div className="smart-visit-message">
      Not enough historical queue data for analysis yet.
    </div>
  )}

</section>

{/* ================= AVERAGE SERVICE TIME ================= */}

<section className="average-time-section">

  <div className="average-time-header">
    <div>
      <span className="section-tag">SERVICE ANALYTICS</span>
      <h2>Average Service Time</h2>
      <p>Actual average duration calculated from completed services.</p>
    </div>

    <button
      className="average-refresh-btn"
      onClick={loadAverageTimes}
      disabled={averageLoading}
    >
      {averageLoading ? "Loading..." : "↻ Refresh"}
    </button>
  </div>

  {averageLoading ? (
    <p className="average-time-message">Loading service data...</p>
  ) : averageError ? (
    <p className="average-time-message">{averageError}</p>
  ) : (
    <div className="average-time-grid">
      {[
        "Medical Consultation",
        "Diagnostic Test",
        "Pharmacy Service",
        "Billing / Payment",
      ].map((service) => {
        const result = averageTimes.find(
          (item) => item.service === service
        );

        return (
          <div className="average-time-card" key={service}>
            <h3>{service}</h3>

            {result ? (
              <>
                <strong className="average-time-value">
                  {result.averageServiceTime} min
                </strong>
                <p>
                  Based on {result.completedServices} completed service(s)
                </p>
              </>
            ) : (
              <>
                <strong className="average-time-value">--</strong>
                <p>Not enough completed data yet</p>
              </>
            )}
          </div>
        );
      })}
    </div>
  )}

</section>


        {/* ================= SERVICES ================= */}

        <section className="services-section" id="services">

          <div className="section-heading">
            <div>
              <span className="section-tag">SERVICES</span>
              <h2>Choose where you need to go.</h2>
            </div>

            <p>
              Select a service to view its current queue,
              waiting time and recommended visiting period.
            </p>
          </div>


          <div className="service-grid">

            <div className="service-card">
              <div className="service-number">01</div>
              <div className="service-icon">+</div>
              <h3>Medical Consultation</h3>
              <p>
                Monitor patient queues and find a suitable
                time for your visit.
              </p>
             <button
  onClick={() => {
    setSelectedService("Medical Consultation");
    setShowQueue(true);
  }}
>
  View Queue <span>→</span>
</button>
            </div>


            <div className="service-card featured">
              <div className="service-number">02</div>
              <div className="service-icon">◫</div>
              <h3>Diagnostic Test</h3>
              <p>
                Check branch activity and avoid unnecessary
                waiting during busy periods.
              </p>
              <button
  onClick={() => {
    setSelectedService("Diagnostic Test");
    setShowQueue(true);
  }}
>
  View Queue <span>→</span>
</button>
            </div>


            <div className="service-card">
              <div className="service-number">03</div>
              <div className="service-icon">▣</div>
              <h3>Pharmacy Service</h3>
              <p>
                Know the queue condition before visiting
                a service center.
              </p>
              <button
  onClick={() => {
    setSelectedService("Pharmacy Service");
    setShowQueue(true);
  }}
>
  View Queue <span>→</span>
</button>
            </div>

          </div>

        </section>


        {/* ================= RECOMMENDATION ================= */}

        <section className="recommendation-section" id="recommendation">

          <div className="recommendation-content">

            <span className="section-tag light">
              VISIT RECOMMENDATION
            </span>

            <h2>
              When should you visit?
            </h2>

            <p>
              QueueWise analyses queue history and current
              service activity to identify relatively less
              busy periods.
            </p>

            <div className="recommend-box">

              <div>
                <span>RECOMMENDED PERIOD</span>
                <strong>3:00 PM – 4:00 PM</strong>
              </div>

              <div className="recommend-divider"></div>

              <div>
                <span>EXPECTED WAIT</span>
                <strong>~12 min</strong>
              </div>

            </div>

          </div>


          <div className="timeline-card">

            <div className="timeline-top">
              <span>Today's queue pattern</span>
              <span>Estimated</span>
            </div>

            <div className="timeline">

              <div className="time-block low">
                <span>09 AM</span>
                <div></div>
                <small>Low</small>
              </div>

              <div className="time-block medium">
                <span>11 AM</span>
                <div></div>
                <small>Medium</small>
              </div>

              <div className="time-block busy">
                <span>01 PM</span>
                <div></div>
                <small>Busy</small>
              </div>

              <div className="time-block recommended">
                <span>03 PM</span>
                <div></div>
                <small>Recommended</small>
              </div>

              <div className="time-block medium">
                <span>05 PM</span>
                <div></div>
                <small>Medium</small>
              </div>

            </div>

            <div className="timeline-note">
              <span>✦</span>
              Lowest estimated waiting period today
            </div>

          </div>

        </section>


        {/* ================= HOW IT WORKS ================= */}

        <section className="process-section" id="how-it-works">

          <div className="section-heading centered">

            <span className="section-tag">
              HOW IT WORKS
            </span>

            <h2>From queue to decision.</h2>

            <p>
              A simple process powered by queue data and
              intelligent estimation.
            </p>

          </div>


          <div className="process-grid">

            <div className="process-card">
              <span>01</span>
              <h3>Select a service</h3>
              <p>
                Choose the service you want to visit and
                view its current queue information.
              </p>
            </div>

            <div className="process-card">
              <span>02</span>
              <h3>Understand the queue</h3>
              <p>
                QueueWise calculates your estimated waiting
                time using queue and service-time data.
              </p>
            </div>

            <div className="process-card">
              <span>03</span>
              <h3>Choose your time</h3>
              <p>
                Historical queue patterns help identify a
                relatively less busy visiting period.
              </p>
            </div>

          </div>

        </section>

      </main>


      {/* ================= FOOTER ================= */}

      <footer>

        <div className="footer-brand">
          <div className="brand-mark">Q</div>
          <div>
            <h3>QueueWise</h3>
            <span>Intelligent Queue Monitoring</span>
          </div>
        </div>

        <p>
          Making everyday visits smarter, one queue at a time.
        </p>

        <span className="copyright">
          © 2026 QueueWise
        </span>

      </footer>

    </div>
  );
}

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;