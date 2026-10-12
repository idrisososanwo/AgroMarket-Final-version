"use client";

import * as React from "react";
import Image from "next/image";
import {
  resolveProductImage,
  resolveEquipmentImage,
  resolveServiceImage,
  GENERAL_AGRICULTURAL_FALLBACK,
} from "@/lib/constants/product-images";

export interface ProductImageProps {
  src?: string | null;
  productSlug?: string | null;
  productName?: string | null;
  categorySlug?: string | null;
  categoryName?: string | null;
  title?: string | null;
  alt?: string;
  className?: string;
  containerClassName?: string;
  aspectRatio?: "video" | "square" | "4/3" | "16/9" | "auto";
  priority?: boolean;
  sizes?: string;
  showFallbackBadge?: boolean;
  type?: "produce" | "equipment" | "service";
  equipmentCategory?: string | null;
  serviceCategory?: string | null;
}

export function ProductImage({
  src: rawSrc,
  productSlug,
  productName,
  categorySlug,
  categoryName,
  title,
  alt: explicitAlt,
  className = "",
  containerClassName = "",
  aspectRatio = "4/3",
  priority = false,
  sizes = "(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 300px",
  showFallbackBadge = false,
  type = "produce",
  equipmentCategory,
  serviceCategory,
}: ProductImageProps) {
  // Resolve image based on type and priority rules
  const resolved = React.useMemo(() => {
    if (type === "equipment") {
      return resolveEquipmentImage({
        uploadedUrl: rawSrc,
        category: equipmentCategory,
        name: title || productName,
      });
    }
    if (type === "service") {
      return resolveServiceImage({
        uploadedUrl: rawSrc,
        category: serviceCategory,
        title: title || productName,
      });
    }
    return resolveProductImage({
      uploadedUrl: rawSrc,
      productSlug,
      productName,
      categorySlug,
      categoryName,
      title,
    });
  }, [
    type,
    rawSrc,
    productSlug,
    productName,
    categorySlug,
    categoryName,
    title,
    equipmentCategory,
    serviceCategory,
  ]);

  const [currentSrc, setCurrentSrc] = React.useState<string>(resolved.src);
  const [hasError, setHasError] = React.useState<boolean>(false);

  // Sync state if resolved.src changes
  React.useEffect(() => {
    setCurrentSrc(resolved.src);
    setHasError(false);
  }, [resolved.src]);

  const handleImageError = () => {
    if (!hasError) {
      setHasError(true);
      setCurrentSrc(GENERAL_AGRICULTURAL_FALLBACK.url);
    }
  };

  const aspectStyles = {
    "4/3": "aspect-[4/3]",
    video: "aspect-video",
    "16/9": "aspect-[16/9]",
    square: "aspect-square",
    auto: "",
  }[aspectRatio];

  const altText = explicitAlt || resolved.alt || "Agricultural product photograph";

  return (
    <div
      className={`relative overflow-hidden bg-neutral-100 ${aspectStyles} ${containerClassName}`}
    >
      <Image
        src={currentSrc}
        alt={altText}
        fill
        sizes={sizes}
        priority={priority}
        onError={handleImageError}
        className={`object-cover transition-transform duration-300 group-hover:scale-105 ${className}`}
      />

      {/* Subtle indicator if this is a category fallback photograph rather than seller's uploaded snapshot */}
      {showFallbackBadge && resolved.isFallback && (
        <span
          className="absolute bottom-2 left-2 rounded-md bg-black/60 backdrop-blur-xs px-2 py-0.5 text-[10px] font-medium text-white shadow-xs"
          title="Authentic representative produce photograph"
        >
          Representative photo
        </span>
      )}
    </div>
  );
}
