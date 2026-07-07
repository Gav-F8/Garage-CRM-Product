import { Component } from "react";

/**
 * Top-level error boundary.
 *
 * Catches render/lifecycle errors anywhere in the tree below it and shows a
 * real fallback screen instead of an unmounted (blank) app.
 *
 * It is deliberately a self-contained class component that depends on NOTHING
 * external — no auth state, no role, no context, no router. That guarantees the
 * fallback can always render, even when the thing that broke is the auth/role
 * layer itself. For the same reason it must be mounted ABOVE AuthProvider.
 */
export default class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    // Render the fallback on the next render.
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    // Minimum viable logging. This is the hook point for a real monitoring
    // service (Sentry / Crashlytics / Datadog, etc.):
    //   e.g. Sentry.captureException(error, { extra: errorInfo });
    console.error("ErrorBoundary caught an error:", error, errorInfo);
  }

  handleReload = () => {
    window.location.reload();
  };

  render() {
    if (!this.state.hasError) {
      return this.props.children;
    }

    return (
      <div
        style={{
          minHeight: "100vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          padding: "24px",
          backgroundColor: "#F7F7F5",
          fontFamily:
            "ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, sans-serif",
        }}
      >
        <div
          style={{
            maxWidth: "420px",
            width: "100%",
            background: "#ffffff",
            border: "1px solid #E0E0E0",
            borderRadius: "12px",
            boxShadow: "0 1px 3px rgba(0,0,0,0.06)",
            padding: "32px",
            textAlign: "center",
          }}
        >
          <div
            style={{
              width: "48px",
              height: "48px",
              margin: "0 auto 16px",
              borderRadius: "9999px",
              background: "#FDECEC",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: "24px",
            }}
            aria-hidden="true"
          >
            ⚠️
          </div>
          <h1 style={{ fontSize: "18px", fontWeight: 600, color: "#37352F", margin: "0 0 8px" }}>
            Something went wrong
          </h1>
          <p style={{ fontSize: "14px", color: "#787774", lineHeight: 1.5, margin: "0 0 24px" }}>
            The app hit an unexpected error. Reloading usually fixes it. If it keeps
            happening, please contact support.
          </p>
          <button
            onClick={this.handleReload}
            style={{
              height: "40px",
              padding: "0 20px",
              borderRadius: "8px",
              border: "none",
              background: "#37352F",
              color: "#ffffff",
              fontSize: "14px",
              fontWeight: 500,
              cursor: "pointer",
            }}
          >
            Reload page
          </button>
        </div>
      </div>
    );
  }
}
