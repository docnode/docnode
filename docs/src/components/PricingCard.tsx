import type { ReactNode } from "react";

interface Feature {
  text: string;
  bold?: boolean;
}

interface PricingCardProps {
  title: string;
  price: string;
  priceSubtext: string;
  description: string;
  features: Feature[];
  ctaText: string;
  ctaHref: string;
  footer: string;
  highlighted?: boolean;
  badge?: string;
}

function CheckIcon() {
  return (
    <svg
      className="mt-0.5 size-5 shrink-0 text-emerald-500"
      fill="none"
      stroke="currentColor"
      viewBox="0 0 24 24"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M5 13l4 4L19 7"
      />
    </svg>
  );
}

export function PricingCard({
  title,
  price,
  priceSubtext,
  description,
  features,
  ctaText,
  ctaHref,
  footer,
  highlighted = false,
  badge,
}: PricingCardProps) {
  return (
    <div
      className={`bg-fd-card relative flex flex-col rounded-lg p-6 ${
        highlighted
          ? "border-fd-primary border-2 shadow-md dark:shadow-lg"
          : "border-fd-border border shadow-sm dark:shadow-md"
      }`}
    >
      {badge && (
        <div className="bg-fd-primary text-fd-primary-foreground absolute -top-3 left-1/2 -translate-x-1/2 rounded-full px-3 py-1 text-xs font-semibold">
          {badge}
        </div>
      )}

      <div className="mb-4">
        <h3 className="text-fd-foreground text-2xl font-bold">{title}</h3>
        <div className="mt-2 flex items-baseline gap-2">
          <span className="text-fd-primary text-4xl font-bold">{price}</span>
          <span className="text-fd-muted-foreground">{priceSubtext}</span>
        </div>
      </div>

      <p className="text-fd-muted-foreground mb-6">{description}</p>

      <ul className="mb-6 grow space-y-3">
        {features.map((feature, index) => (
          <li key={index} className="flex items-start gap-2">
            <CheckIcon />
            <span className={`text-sm ${feature.bold ? "font-medium" : ""}`}>
              {feature.text}
            </span>
          </li>
        ))}
      </ul>

      <a
        href={ctaHref}
        className={`w-full rounded-md px-4 py-2.5 text-center font-medium transition-colors ${
          highlighted
            ? "bg-fd-primary hover:bg-fd-primary/90 text-fd-primary-foreground"
            : "bg-fd-secondary hover:bg-fd-secondary/80 text-fd-secondary-foreground"
        }`}
      >
        {ctaText}
      </a>

      <p className="text-fd-muted-foreground mt-4 text-center text-xs">
        {footer}
      </p>
    </div>
  );
}

export function PricingGrid({ children }: { children: ReactNode }) {
  return <div className="mt-8 grid gap-6 md:grid-cols-2">{children}</div>;
}
