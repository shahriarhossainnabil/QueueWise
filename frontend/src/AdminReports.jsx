
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
function AdminReports() {
    const navigate = useNavigate();
    const getAuthHeaders = () => ({
  Authorization: `Bearer ${localStorage.getItem("queuewiseToken")}`,
});
  const [report, setReport] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [selectedService, setSelectedService] = useState("");
  const [searchTerm, setSearchTerm] = useState("");

  const loadReports = async () => {
    try {
      setLoading(true);
      setError("");

      const query = selectedService
        ? `?service=${encodeURIComponent(selectedService)}`
        : "";

      const response = await fetch(
  `http://localhost:5000/api/tokens/admin/reports${query}`,
  {
    headers: getAuthHeaders(),
  }
);

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "Failed to load reports.");
      }

      setReport(data);
    } catch (err) {
      setError(err.message || "Could not connect to backend.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadReports();
  }, [selectedService]);

  const filteredHistory = (report?.history || []).filter((token) => {
    const search = searchTerm.toLowerCase();

    return (
      token.tokenNumber?.toLowerCase().includes(search) ||
      token.userEmail?.toLowerCase().includes(search)
    );
  });

  const stats = report?.overallStats || {};

  const cardStyle = {
    background: "#ffffff",
    padding: "22px",
    borderRadius: "12px",
    boxShadow: "0 2px 10px rgba(0,0,0,0.07)",
    border: "1px solid #e5e7eb"
  };

  const cellStyle = {
    padding: "13px",
    borderBottom: "1px solid #e5e7eb",
    textAlign: "left",
    whiteSpace: "nowrap"
  };

  const statusColor = (status) => {
    if (status === "Completed") return "#15803d";
    if (status === "Serving") return "#2563eb";
    return "#d97706";
  };
 return (
  <div>
    <button
     onClick={() => {
  console.log("Back button clicked");
  navigate("/admin/queue");
}}
      style={{
        padding: "10px 18px",
        background: "#111827",
        color: "white",
        border: "none",
        borderRadius: "8px",
        cursor: "pointer",
        margin: "20px",
      }}
    >
      ← Back to Admin Dashboard
    </button>

    <div style={{
      maxWidth: "1250px",
      margin: "35px auto",
      padding: "20px",
      fontFamily: "Arial, sans-serif",
      color: "#1e293b"
    }}>

      <div style={{
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        flexWrap: "wrap",
        gap: "15px"
      }}>
        <div>
          <h1 style={{ marginBottom: "6px" }}>
            Admin Service Reports
          </h1>
          <p style={{ color: "#64748b" }}>
            Queue history and service performance overview.
          </p>
        </div>

        <button
          onClick={loadReports}
          disabled={loading}
          style={{
            padding: "11px 20px",
            background: "#2563eb",
            color: "white",
            border: "none",
            borderRadius: "8px",
            cursor: "pointer"
          }}
        >
          {loading ? "Loading..." : "Refresh Reports"}
        </button>
      </div>

      {error && (
        <p style={{ color: "red", marginTop: "20px" }}>
          {error}
        </p>
      )}

      {loading && !report ? (
        <p style={{ marginTop: "30px" }}>
          Loading service reports...
        </p>
      ) : report ? (
        <>
          <h2 style={{ marginTop: "35px" }}>
            Overall Statistics
          </h2>

          <div style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
            gap: "18px",
            marginTop: "20px"
          }}>
            {[
              ["Total Tokens", stats.totalTokens, "#2563eb"],
              ["Completed", stats.completedTokens, "#15803d"],
              ["Waiting", stats.waitingTokens, "#d97706"],
              ["Serving", stats.servingTokens, "#7c3aed"]
            ].map(([label, value, color]) => (
              <div key={label} style={cardStyle}>
                <p style={{ color: "#64748b", margin: 0 }}>
                  {label}
                </p>
                <h2 style={{
                  color,
                  fontSize: "30px",
                  margin: "12px 0 0"
                }}>
                  {value ?? 0}
                </h2>
              </div>
            ))}
          </div>

          <h2 style={{ marginTop: "40px" }}>
            Service-wise Performance
          </h2>

          <div style={{
            overflowX: "auto",
            background: "white",
            borderRadius: "10px",
            marginTop: "15px",
            border: "1px solid #e5e7eb"
          }}>
            <table style={{
              width: "100%",
              borderCollapse: "collapse"
            }}>
              <thead style={{ background: "#f1f5f9" }}>
                <tr>
                  {[
                    "Service",
                    "Total Tokens",
                    "Completed",
                    "Waiting",
                    "Serving",
                    "Average Duration"
                  ].map((heading) => (
                    <th key={heading} style={cellStyle}>
                      {heading}
                    </th>
                  ))}
                </tr>
              </thead>

              <tbody>
                {report.serviceStats.map((item) => (
                  <tr key={item.service}>
                    <td style={cellStyle}>{item.service}</td>
                    <td style={cellStyle}>{item.totalTokens}</td>
                    <td style={cellStyle}>{item.completed}</td>
                    <td style={cellStyle}>{item.waiting}</td>
                    <td style={cellStyle}>{item.serving}</td>
                    <td style={cellStyle}>
                      {item.averageServiceDuration.toFixed(2)} min
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <h2 style={{ marginTop: "40px" }}>
            Complete Token History
          </h2>

          <div style={{
            display: "flex",
            gap: "12px",
            flexWrap: "wrap",
            margin: "18px 0"
          }}>
            <select
              value={selectedService}
              onChange={(e) => setSelectedService(e.target.value)}
              style={{
                padding: "11px",
                borderRadius: "7px",
                border: "1px solid #cbd5e1"
              }}
            >
              <option value="">All Services</option>
              <option value="Medical Consultation">Medical Consultation</option>
              <option value="Diagnostic Test">Diagnostic Test</option>
              <option value="Pharmacy Service">Pharmacy Service</option>
              <option value="Billing / Payment">Billing / Payment</option>
            </select>

            <input
              type="text"
              placeholder="Search token number or email..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              style={{
                padding: "11px",
                minWidth: "250px",
                borderRadius: "7px",
                border: "1px solid #cbd5e1"
              }}
            />
          </div>

          <p style={{ color: "#64748b" }}>
            Showing {filteredHistory.length} records
          </p>

          <div style={{
            overflowX: "auto",
            background: "white",
            borderRadius: "10px",
            border: "1px solid #e5e7eb"
          }}>
            <table style={{
              width: "100%",
              borderCollapse: "collapse"
            }}>
              <thead style={{ background: "#f1f5f9" }}>
                <tr>
                  {[
                    "Token Number",
                    "Service",
                    "User Email",
                    "Date",
                    "Status",
                    "Duration"
                  ].map((heading) => (
                    <th key={heading} style={cellStyle}>
                      {heading}
                    </th>
                  ))}
                </tr>
              </thead>

              <tbody>
                {filteredHistory.map((token) => (
                  <tr key={token._id}>
                    <td style={cellStyle}>{token.tokenNumber}</td>
                    <td style={cellStyle}>{token.service}</td>
                    <td style={cellStyle}>{token.userEmail}</td>
                    <td style={cellStyle}>
                      {new Date(token.createdAt).toLocaleString()}
                    </td>
                    <td style={{
                      ...cellStyle,
                      color: statusColor(token.status),
                      fontWeight: "bold"
                    }}>
                      {token.status}
                    </td>
                    <td style={cellStyle}>
                      {token.serviceDuration != null
                        ? `${Number(token.serviceDuration).toFixed(2)} min`
                        : "--"}
                    </td>
                  </tr>
                ))}

                {filteredHistory.length === 0 && (
                  <tr>
                    <td
                      colSpan="6"
                      style={{ ...cellStyle, textAlign: "center" }}
                    >
                      No matching records found.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </>
      ) : null}
       </div>
  </div>
  );
}
export default AdminReports;
