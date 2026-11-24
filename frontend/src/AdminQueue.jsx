import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";

function AdminQueue() {
  const getAuthHeaders = () => ({
  Authorization: `Bearer ${localStorage.getItem("queuewiseToken")}`,
});
  const navigate = useNavigate();
  const [tokens, setTokens] = useState([]);
  const [selectedService, setSelectedService] = useState("");
  const [loading, setLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState("");
  const [error, setError] = useState("");
  // Admin Dashboard Statistics
const [statistics, setStatistics] = useState(null);
const [statisticsLoading, setStatisticsLoading] = useState(false);
const [statisticsError, setStatisticsError] = useState("");

  const services = [
    "Medical Consultation",
    "Diagnostic Test",
    "Pharmacy Service",
    "Billing / Payment",
  ];

  const loadQueue = async () => {
    setLoading(true);
    setError("");

    try {
      const url = selectedService
        ? `http://localhost:5000/api/tokens/admin/queue?service=${encodeURIComponent(
            selectedService
          )}`
        : "http://localhost:5000/api/tokens/admin/queue";

     const response = await fetch(url, {
  headers: getAuthHeaders(),
});
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "Could not load queue.");
      }

      setTokens(data.tokens || []);
    } catch (error) {
      setError(error.message || "Could not connect to backend.");
    } finally {
      setLoading(false);
    }
  };
  // Load Admin Dashboard Statistics
const loadStatistics = async () => {
  setStatisticsLoading(true);
  setStatisticsError("");

  try {
   const response = await fetch(
  "http://localhost:5000/api/tokens/admin/statistics",
  {
    headers: getAuthHeaders(),
  }
);

    const data = await response.json();

    if (!response.ok) {
      throw new Error(
        data.message || "Could not load statistics."
      );
    }

    setStatistics(data);
  } catch (error) {
    setStatisticsError(
      error.message || "Could not load statistics."
    );
  } finally {
    setStatisticsLoading(false);
  }
};
// Refresh complete admin dashboard
const refreshDashboard = async () => {
  await Promise.all([
    loadQueue(),
    loadStatistics(),
  ]);
};

  useEffect(() => {
    loadQueue();
  }, [selectedService]);
// Load dashboard statistics when page opens
useEffect(() => {
  loadStatistics();
}, []);
  const startService = async (tokenNumber) => {
    setActionLoading(tokenNumber);
    setError("");

    try {
      const response = await fetch(
        `http://localhost:5000/api/tokens/start/${encodeURIComponent(
          tokenNumber
        )}`,
       {
  method: "PATCH",
  headers: getAuthHeaders(),
}
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "Could not start service.");
      }

      await loadQueue();
    } catch (error) {
      setError(error.message || "Could not start service.");
    } finally {
      setActionLoading("");
    }
  };

  const completeService = async (tokenNumber) => {
    setActionLoading(tokenNumber);
    setError("");

    try {
      const response = await fetch(
        `http://localhost:5000/api/tokens/complete/${encodeURIComponent(
          tokenNumber
        )}`,
       {
  method: "PATCH",
  headers: getAuthHeaders(),
}
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "Could not complete service.");
      }

      await loadQueue();
    } catch (error) {
      setError(error.message || "Could not complete service.");
    } finally {
      setActionLoading("");
    }
  };
  return (
    <div
      style={{
        minHeight: "100vh",
        background: "#f7f8fc",
        padding: "40px",
      }}
    >
      <button
  onClick={() => navigate("/")}
  style={{
    padding: "11px 20px",
    background: "#111827",
    color: "white",
    border: "none",
    borderRadius: "8px",
    cursor: "pointer",
    fontWeight: "600",
    marginBottom: "20px",
  }}
>
  ← Back to Website
</button>
      <div
        style={{
          maxWidth: "1100px",
          margin: "0 auto",
        }}
      >
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            gap: "20px",
            marginBottom: "30px",
            flexWrap: "wrap",
          }}
        >
          <div>
            <span
              style={{
                fontSize: "12px",
                fontWeight: "700",
                letterSpacing: "1.5px",
                color: "#6b7280",
              }}
            >
              QUEUEWISE ADMIN
            </span>

            <h1
              style={{
                margin: "8px 0",
                fontSize: "32px",
                color: "#111827",
              }}
            >
              Queue Management
            </h1>

            <p
              style={{
                margin: 0,
                color: "#6b7280",
              }}
            >
              Monitor active tokens and manage service progress.
            </p>
          </div>
          <button
            onClick={() => navigate("/admin/reports")}
            style={{
              border: "1px solid #2563eb",
              borderRadius: "10px",
              padding: "12px 20px",
              background: "white",
              color: "#2563eb",
              cursor: "pointer",
              fontWeight: "600",
            }}
          >
            Service Reports →
          </button>
          <button
           onClick={refreshDashboard}
            disabled={loading}
            style={{
              border: "none",
              borderRadius: "10px",
              padding: "12px 20px",
              background: "#111827",
              color: "white",
              cursor: loading ? "not-allowed" : "pointer",
              fontWeight: "600",
            }}
          >
            {loading ? "Refreshing..." : "↻ Refresh"}
          </button>
        </div>

        {/* ADMIN DASHBOARD STATISTICS */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
            gap: "18px",
            marginBottom: "24px",
          }}
        >
          {[
            {
              title: "Total Tokens",
              value: statistics?.overallStats?.totalTokens ?? 0,
              color: "#2563eb",
              background: "#eff6ff",
            },
            {
              title: "Waiting",
              value: statistics?.overallStats?.waitingTokens ?? 0,
              color: "#d97706",
              background: "#fffbeb",
            },
            {
              title: "Currently Serving",
              value: statistics?.overallStats?.servingTokens ?? 0,
              color: "#16a34a",
              background: "#f0fdf4",
            },
            {
              title: "Completed",
              value: statistics?.overallStats?.completedTokens ?? 0,
              color: "#7c3aed",
              background: "#f5f3ff",
            },
          ].map((item) => (
            <div
              key={item.title}
              style={{
                background: "white",
                padding: "22px",
                borderRadius: "14px",
                border: "1px solid #e5e7eb",
                borderLeft: `5px solid ${item.color}`,
              }}
            >
              <p
                style={{
                  margin: 0,
                  fontSize: "13px",
                  color: "#6b7280",
                  fontWeight: "600",
                }}
              >
                {item.title}
              </p>

              <h2
                style={{
                  margin: "12px 0 0",
                  fontSize: "30px",
                  color: item.color,
                  fontWeight: "800",
                }}
              >
                {statisticsLoading ? "..." : item.value}
              </h2>
            </div>
          ))}
        </div>

        {statisticsError && (
          <div
            style={{
              background: "#fef2f2",
              color: "#b91c1c",
              padding: "14px",
              borderRadius: "10px",
              marginBottom: "20px",
            }}
          >
            {statisticsError}
          </div>
        )}

        {/* SERVICE-WISE STATISTICS */}
        <div
          style={{
            background: "white",
            padding: "22px",
            borderRadius: "16px",
            border: "1px solid #e5e7eb",
            marginBottom: "24px",
          }}
        >
          <h2
            style={{
              margin: "0 0 18px",
              fontSize: "20px",
              color: "#111827",
            }}
          >
            Service-wise Statistics
          </h2>

          {statisticsLoading ? (
            <p style={{ color: "#6b7280" }}>
              Loading service statistics...
            </p>
          ) : !statistics?.serviceStats?.length ? (
            <p style={{ color: "#6b7280" }}>
              No service statistics available.
            </p>
          ) : (
            <div style={{ overflowX: "auto" }}>
              <table
                style={{
                  width: "100%",
                  borderCollapse: "collapse",
                  textAlign: "left",
                  minWidth: "600px",
                }}
              >
                <thead>
                  <tr style={{ background: "#f9fafb" }}>
                    {[
                      "Service",
                      "Total",
                      "Waiting",
                      "Serving",
                      "Completed",
                    ].map((heading) => (
                      <th
                        key={heading}
                        style={{
                          padding: "14px",
                          fontSize: "13px",
                          color: "#6b7280",
                          borderBottom: "1px solid #e5e7eb",
                        }}
                      >
                        {heading}
                      </th>
                    ))}
                  </tr>
                </thead>

                <tbody>
                  {statistics.serviceStats.map((service) => (
                    <tr key={service._id}>
                      <td
                        style={{
                          padding: "14px",
                          fontWeight: "600",
                        }}
                      >
                        {service._id}
                      </td>

                      <td style={{ padding: "14px" }}>
                        {service.totalTokens}
                      </td>

                      <td
                        style={{
                          padding: "14px",
                          color: "#d97706",
                        }}
                      >
                        {service.waiting}
                      </td>

                      <td
                        style={{
                          padding: "14px",
                          color: "#16a34a",
                        }}
                      >
                        {service.serving}
                      </td>

                      <td
                        style={{
                          padding: "14px",
                          color: "#7c3aed",
                        }}
                      >
                        {service.completed}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* DAILY STATISTICS - LAST 7 DAYS */}
        <div
          style={{
            background: "white",
            padding: "22px",
            borderRadius: "16px",
            border: "1px solid #e5e7eb",
            marginBottom: "24px",
          }}
        >
          <h2
            style={{
              margin: "0 0 20px",
              fontSize: "20px",
              color: "#111827",
            }}
          >
            Daily Statistics (Last 7 Days)
          </h2>

          {statisticsLoading ? (
            <p style={{ color: "#6b7280" }}>
              Loading daily statistics...
            </p>
          ) : !statistics?.dailyStats?.length ? (
            <p style={{ color: "#6b7280" }}>
              No daily statistics available.
            </p>
          ) : (
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                gap: "16px",
              }}
            >
              {statistics.dailyStats.map((day) => {
                const maxTokens = Math.max(
                  ...statistics.dailyStats.map(
                    (item) => item.totalTokens
                  ),
                  1
                );

                const percentage =
                  (day.totalTokens / maxTokens) * 100;

                return (
                  <div key={day._id}>
                    <div
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        marginBottom: "7px",
                        fontSize: "14px",
                      }}
                    >
                      <span style={{ color: "#374151" }}>
                        {day._id}
                      </span>

                      <strong style={{ color: "#2563eb" }}>
                        {day.totalTokens} Tokens
                      </strong>
                    </div>

                    <div
                      style={{
                        width: "100%",
                        height: "12px",
                        background: "#eff6ff",
                        borderRadius: "20px",
                        overflow: "hidden",
                      }}
                    >
                      <div
                        style={{
                          width: `${percentage}%`,
                          height: "100%",
                          background: "#2563eb",
                          borderRadius: "20px",
                        }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>



        <div
          style={{
            background: "white",
            padding: "18px",
            borderRadius: "14px",
            marginBottom: "24px",
            border: "1px solid #e5e7eb",
          }}
        >
          <label
            style={{
              display: "block",
              fontSize: "13px",
              fontWeight: "700",
              marginBottom: "8px",
              color: "#374151",
            }}
              >
          FILTER BY SERVICE
          </label>

          <select
            value={selectedService}
            onChange={(e) => setSelectedService(e.target.value)}
            style={{
              width: "100%",
              maxWidth: "350px",
              padding: "12px",
              borderRadius: "9px",
              border: "1px solid #d1d5db",
              background: "white",
              fontSize: "14px",
            }}
          >
            <option value="">All Services</option>

            {services.map((service) => (
              <option key={service} value={service}>
                {service}
              </option>
            ))}
          </select>
        </div>

        {error && (
          <div
            style={{
              background: "#fef2f2",
              color: "#b91c1c",
              padding: "14px",
              borderRadius: "10px",
              marginBottom: "20px",
              border: "1px solid #fecaca",
            }}
          >
            {error}
          </div>
        )}

        <div
          style={{
            background: "white",
            borderRadius: "16px",
            border: "1px solid #e5e7eb",
            overflow: "hidden",
          }}
        >
          <div
            style={{
              padding: "20px",
              borderBottom: "1px solid #e5e7eb",
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
            }}
          >
            <div>
              <h2
                style={{
                  margin: 0,
                  fontSize: "20px",
                  color: "#111827",
                }}
              >
                Active Queue
              </h2>

              <p
                style={{
                  margin: "5px 0 0",
                  color: "#6b7280",
                  fontSize: "14px",
                }}
              >
                {tokens.length} active token(s)
              </p>
            </div>
          </div>

          {loading ? (
            <div
              style={{
                padding: "50px",
                textAlign: "center",
                color: "#6b7280",
              }}
            >
              Loading active queue...
            </div>
          ) : tokens.length === 0 ? (
            <div
              style={{
                padding: "50px",
                textAlign: "center",
                color: "#6b7280",
              }}
            >
              No active tokens found.
            </div>
          ) : (
            <div>
              {tokens.map((token) => (
                <div
                  key={token._id}
                  style={{
                    padding: "20px",
                    borderBottom: "1px solid #f0f0f0",
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    gap: "20px",
                    flexWrap: "wrap",
                  }}
                >
                  <div>
                    <div
                      style={{
                        fontSize: "20px",
                        fontWeight: "800",
                        color: "#111827",
                      }}
                    >
                      {token.tokenNumber}
                    </div>

                    <div
                      style={{
                        marginTop: "5px",
                        color: "#4b5563",
                        fontSize: "14px",
                      }}
                    >
                      {token.service}
                    </div>

                    <div
                      style={{
                        marginTop: "8px",
                        fontSize: "12px",
                        color: "#9ca3af",
                      }}
                    >
                      {token.userEmail}
                    </div>
                  </div>

                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "12px",
                      flexWrap: "wrap",
                    }}
                  >
                    <span
                      style={{
                        padding: "7px 12px",
                        borderRadius: "20px",
                        fontSize: "12px",
                        fontWeight: "700",
                        background:
                          token.status === "Serving"
                            ? "#dcfce7"
                            : "#fef3c7",
                        color:
                          token.status === "Serving"
                            ? "#166534"
                            : "#92400e",
                      }}
                    >
                      {token.status}
                    </span>

                    {token.status === "Waiting" && (
                      <button
                        onClick={() => startService(token.tokenNumber)}
                        disabled={actionLoading === token.tokenNumber}
                        style={{
                          border: "none",
                          borderRadius: "9px",
                          padding: "10px 16px",
                          background: "#111827",
                          color: "white",
                          cursor: "pointer",
                          fontWeight: "600",
                        }}
                      >
                        {actionLoading === token.tokenNumber
                          ? "Starting..."
                          : "Start Service"}
                      </button>
                    )}

                    {token.status === "Serving" && (
                      <button
                        onClick={() => completeService(token.tokenNumber)}
                        disabled={actionLoading === token.tokenNumber}
                        style={{
                          border: "none",
                          borderRadius: "9px",
                          padding: "10px 16px",
                          background: "#166534",
                          color: "white",
                          cursor: "pointer",
                          fontWeight: "600",
                        }}
                      >
                        {actionLoading === token.tokenNumber
                          ? "Completing..."
                          : "Complete Service"}
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default AdminQueue;