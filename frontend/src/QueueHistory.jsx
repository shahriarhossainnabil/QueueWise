
import { useEffect, useState } from "react";

function QueueHistory() {
  const [tokens, setTokens] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const loadHistory = async () => {
      try {
        const savedUser = localStorage.getItem("queuewiseUser");

        if (!savedUser) {
          setError("Please login to view your queue history.");
          return;
        }

        const user = JSON.parse(savedUser);

        if (!user.email) {
          setError("User email not found. Please login again.");
          return;
        }

        const response = await fetch(
          `http://localhost:5000/api/tokens?userEmail=${encodeURIComponent(user.email)}`
        );

        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.message || "Could not load queue history.");
        }

        setTokens(data.tokens || []);
      } catch (err) {
        setError(err.message || "Could not connect to backend.");
      } finally {
        setLoading(false);
      }
    };

    loadHistory();
  }, []);

  return (
    <div style={{
      maxWidth: "1100px",
      margin: "50px auto",
      padding: "25px",
      fontFamily: "Arial, sans-serif"
    }}>
        <button
  onClick={() => window.location.href = "/"}
  style={{
    padding: "10px 18px",
    background: "#111827",
    color: "white",
    border: "none",
    borderRadius: "8px",
    cursor: "pointer",
    marginBottom: "20px",
  }}
>
  ← Back to Home
</button>
      <h1>My Queue History</h1>

      <p>View your previous QueueWise service tokens.</p>

      {loading ? (
        <p>Loading your history...</p>
      ) : error ? (
        <p style={{ color: "red" }}>{error}</p>
      ) : tokens.length === 0 ? (
        <p>No queue history found.</p>
      ) : (
        <>
          <h3>Total Records: {tokens.length}</h3>

          <div style={{ overflowX: "auto" }}>
            <table style={{
              width: "100%",
              borderCollapse: "collapse",
              marginTop: "20px"
            }}>
              <thead>
                <tr style={{ background: "#f1f5f9" }}>
                  {[
                    "Token Number",
                    "Service",
                    "Date",
                    "Status",
                    "Duration"
                  ].map((heading) => (
                    <th key={heading} style={{
                      padding: "14px",
                      border: "1px solid #ddd",
                      textAlign: "left"
                    }}>
                      {heading}
                    </th>
                  ))}
                </tr>
              </thead>

              <tbody>
                {tokens.map((token) => (
                  <tr key={token._id}>
                    <td style={cellStyle}>{token.tokenNumber}</td>
                    <td style={cellStyle}>{token.service}</td>
                    <td style={cellStyle}>
                      {new Date(token.createdAt).toLocaleString()}
                    </td>
                    <td style={cellStyle}>
                      <span style={{
                        color:
                          token.status === "Completed"
                            ? "green"
                            : token.status === "Serving"
                            ? "#2563eb"
                            : "#d97706",
                        fontWeight: "bold"
                      }}>
                        {token.status}
                      </span>
                    </td>
                    <td style={cellStyle}>
                      {token.serviceDuration != null
                        ? `${Number(token.serviceDuration).toFixed(2)} min`
                        : "--"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
}

const cellStyle = {
  padding: "14px",
  border: "1px solid #ddd"
};

export default QueueHistory;
