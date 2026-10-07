import * as React from "react";
import Link from "next/link";
import { ChevronRight, Home } from "lucide-react";

export interface BreadcrumbItem {
  label: string;
  href?: string;
}

export interface BreadcrumbsProps {
  items: BreadcrumbItem[];
  homeHref?: string;
  className?: string;
}

export function Breadcrumbs({
  items,
  homeHref = "/",
  className = "",
}: BreadcrumbsProps) {
  return (
    <nav aria-label="Breadcrumb" className={`flex items-center text-xs text-neutral-500 ${className}`}>
      <ol className="flex items-center space-x-1.5 flex-wrap">
        <li>
          <Link
            href={homeHref}
            className="hover:text-[#0F4327] transition-colors flex items-center"
            aria-label="Home"
          >
            <Home className="h-3.5 w-3.5" />
          </Link>
        </li>

        {items.map((item, index) => {
          const isLast = index === items.length - 1;

          return (
            <li key={index} className="flex items-center space-x-1.5">
              <ChevronRight className="h-3 w-3 text-neutral-400 shrink-0" aria-hidden="true" />
              {item.href && !isLast ? (
                <Link
                  href={item.href}
                  className="hover:text-[#0F4327] transition-colors font-medium"
                >
                  {item.label}
                </Link>
              ) : (
                <span className="font-semibold text-[#1A231E]" aria-current={isLast ? "page" : undefined}>
                  {item.label}
                </span>
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
