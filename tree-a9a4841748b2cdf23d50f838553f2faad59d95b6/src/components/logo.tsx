import { Link } from "wouter";
import logoImage from "@/assets/rezdna-logo.png";

interface LogoProps {
  size?: "sm" | "md" | "lg" | "xl";
  className?: string;
}

export default function Logo({ size = "md", className = "" }: LogoProps) {
  // Height classes for the image - optimized for header display
  const sizeClasses = {
    sm: "h-16",
    md: "h-24",
    lg: "h-32",
    xl: "h-36"
  };

  return (
    <Link href="/">
      <div className={`cursor-pointer ${className}`}>
        <div className="relative">
          <img 
            src={logoImage} 
            alt="RezDNA - Your Property's Digital Identity" 
            className={`${sizeClasses[size]} w-auto object-contain`}
            style={{ 
              isolation: 'isolate',
              mixBlendMode: 'darken',
              filter: 'brightness(1.05) contrast(1.1)'
            }}
          />
        </div>
      </div>
    </Link>
  );
}