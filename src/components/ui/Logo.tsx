interface LogoProps {
  size?: "sm" | "md" | "lg";
  showSubtitle?: boolean;
}

export default function Logo({ size = "md", showSubtitle = true }: LogoProps) {
  const textSize = size === "sm" ? "text-lg" : size === "lg" ? "text-3xl" : "text-2xl";
  const tracking = size === "sm" ? "tracking-[2px]" : "tracking-[4px]";
  const subSize = size === "sm" ? "text-[7px]" : "text-[10px]";

  return (
    <div className="text-center">
      <h2 className={`${textSize} font-bold text-accent ${tracking}`}>HYPECUTZ</h2>
      {showSubtitle && (
        <p className={`${subSize} text-text-secondary tracking-[5px] mt-0.5`}>ROTTERDAM</p>
      )}
    </div>
  );
}
