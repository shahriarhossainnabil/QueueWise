import { useEffect, useState } from "react";

function AdminQueue() {
  const [tokens, setTokens] = useState([]);
  const [selectedService, setSelectedService] = useState("");
  const [loading, setLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState("");
  const [error, setError] = useState("");

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

      const response = await fetch(url);
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

  useEffect(() => {
    loadQueue();
  }, [selectedService]);

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
            onClick={loadQueue}
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