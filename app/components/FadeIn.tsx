"use client";

import { useEffect, useState } from "react";

export default function FadeIn() {
  const [isVisible, setIsVisible] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => {
      setIsVisible(false);
    }, 1000);

    return () => clearTimeout(timer);
  }, []);

  return (
    <div
      className={`fixed inset-0 bg-black z-50 transition-opacity duration-1000 pointer-events-none ${
        isVisible ? "opacity-100" : "opacity-0"
      }`}
    />
  );
}
