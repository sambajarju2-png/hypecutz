import { HTMLAttributes, forwardRef } from "react";

interface CardProps extends HTMLAttributes<HTMLDivElement> {
  padded?: boolean;
}

const Card = forwardRef<HTMLDivElement, CardProps>(
  ({ padded = true, className = "", children, ...props }, ref) => {
    return (
      <div
        ref={ref}
        className={`bg-background-card rounded-card border border-border
          ${padded ? "p-4" : ""} ${className}`}
        {...props}
      >
        {children}
      </div>
    );
  }
);

Card.displayName = "Card";
export default Card;
