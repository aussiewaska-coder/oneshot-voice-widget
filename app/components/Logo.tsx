"use client";

import { useEffect, useState } from "react";

export default function Logo() {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => {
      setIsVisible(true);
    }, 3000);

    return () => clearTimeout(timer);
  }, []);

  return (
    <div
      className={`fixed top-5 left-5 z-10 transition-opacity duration-1000 ${
        isVisible ? "opacity-100" : "opacity-0"
      }`}
      style={{
        pointerEvents: isVisible ? "auto" : "none",
      }}
    >
      <img
        src="https://iigbxtladfldnwo2.public.blob.vercel-storage.com/assets/tugbot_logo.png"
        alt="TugBot Logo"
        className="h-12 w-auto"
      />
    </div>
  );
}
