import ReactDOM from "react-dom/client";
import "./index.css";
import App from "./App";
import { SessionProvider } from "./context/SessionContext";
import { ToastProvider } from "./components/Toast";

// Note: StrictMode is intentionally off — WebRTC call.join() / getUserMedia
// side-effects must not run twice in development.
ReactDOM.createRoot(document.getElementById("root")!).render(
  <ToastProvider>
    <SessionProvider>
      <App />
    </SessionProvider>
  </ToastProvider>,
);
