"use client";

import { cn } from "@/lib/utils";
import { useEffect, useRef } from "react";

interface ShineBorderProps {
  children: React.ReactNode;
  className?: string;
  shineColor?: string[];
  duration?: number;
}

export function ShineBorder({
  children,
  className,
  shineColor = ["#A07CFE", "#FE8FB5", "#FFBE7B"],
  duration = 3000,
}: ShineBorderProps) {
  const borderRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const border = borderRef.current;
    if (!border) return;

    const animate = () => {
      border.style.setProperty("--shine-deg", "0deg");
      border.style.setProperty("--shine-opacity", "0");
      
      setTimeout(() => {
        border.style.setProperty("--shine-opacity", "1");
        border.style.setProperty("--shine-deg", "360deg");
      }, 100);
    };

    const interval = setInterval(animate, duration);
    animate();

    return () => clearInterval(interval);
  }, [duration]);

  return (
    <div
      ref={borderRef}
      className={cn(
        "relative rounded-lg p-[1px]",
        "before:absolute before:inset-0 before:rounded-lg before:p-[1px] before:bg-gradient-to-r before:from-transparent before:via-white/20 before:to-transparent before:opacity-0 before:transition-opacity before:duration-1000",
        "after:absolute after:inset-0 after:rounded-lg after:bg-gradient-to-r after:from-transparent after:via-white/10 after:to-transparent after:opacity-0 after:transition-opacity after:duration-1000",
        "hover:before:opacity-100 hover:after:opacity-100",
        className
      )}
      style={{
        background: `conic-gradient(from var(--shine-deg, 0deg), ${shineColor.join(", ")})`,
        transition: `--shine-deg ${duration}ms linear`,
      }}
    >
      <div className="relative z-10 h-full w-full rounded-lg bg-background">
        {children}
      </div>
    </div>
  );
} 