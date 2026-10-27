import Image from "next/image";

interface NexoraLogoProps {
  size?: "xs" | "sm" | "md" | "lg" | "xl";
  showText?: boolean;
  showTagline?: boolean;
  className?: string;
  textClassName?: string;
}

export function NexoraLogo({
  size = "md",
  showText = true,
  showTagline = false,
  className = "",
  textClassName = "",
}: NexoraLogoProps) {
  const dimensions = {
    xs: { width: 20, height: 20, text: "text-sm", tag: "text-[8px]" },
    sm: { width: 26, height: 26, text: "text-base", tag: "text-[9px]" },
    md: { width: 32, height: 32, text: "text-lg", tag: "text-[10px]" },
    lg: { width: 40, height: 40, text: "text-2xl", tag: "text-xs" },
    xl: { width: 48, height: 48, text: "text-3xl", tag: "text-sm" },
  }[size];

  return (
    <div className={`flex items-center gap-2.5 ${className}`}>
      <div className="relative shrink-0 flex items-center justify-center">
        <Image
          src="/logo.png"
          alt="Nexora Cloud Logo"
          width={dimensions.width}
          height={dimensions.height}
          className="object-contain drop-shadow-[0_4px_16px_rgba(59,130,246,0.35)]"
          priority
        />
      </div>
      {showText && (
        <div className="flex flex-col leading-none">
          <span className={`font-bold tracking-tight text-white ${dimensions.text} ${textClassName}`}>
            Nexora
          </span>
          {showTagline && (
            <span className={`text-zinc-400 font-medium tracking-wide mt-0.5 ${dimensions.tag}`}>
              One workspace. Many intelligences.
            </span>
          )}
        </div>
      )}
    </div>
  );
}
