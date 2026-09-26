// qup-pulse-admin/src/components/calls/CallRoot.js
"use client";

// Mounted once in app/layout.js so calls ring on every page. Does nothing for
// visitors who aren't signed in (no token → no socket).

import { CallProvider } from "../../lib/calls/CallContext";
import CallOverlay from "./CallOverlay";

export default function CallRoot({ children }) {
  return (
    <CallProvider>
      {children}
      <CallOverlay />
    </CallProvider>
  );
}
