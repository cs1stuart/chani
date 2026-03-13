"use client";

import { useEffect } from "react";
import dynamic from "next/dynamic";

const ChatApp = dynamic(() => import("@/components/shared/ChatApp"), { ssr: false });

export default function Home() {
  useEffect(() => {
    if (typeof window !== "undefined") {
      import("buffer").then((buf) => {
        (window as Window & { Buffer: typeof buf.Buffer }).Buffer = buf.Buffer;
      });
    }
  }, []);

  return <ChatApp />;
}
