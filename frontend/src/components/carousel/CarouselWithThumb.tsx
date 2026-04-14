"use client";

import Image from "next/image";
import useCarousel from "embla-carousel-react";
import { map } from "lodash";
import { useCallback, useEffect, useState, useMemo } from "react";
import { cn } from "../../utils/helpers";
import { ChevronLeftIcon, ChevronRightIcon } from "@heroicons/react/24/solid";
import Autoplay from "embla-carousel-autoplay";

const URL_API = process.env.NEXT_PUBLIC_URL_API || "http://localhost:3000/";

interface CarouselWithThumbProps {
  items?: Array<{ image_detail?: string;[key: string]: any }>;
  images?: string[]; // Hỗ trợ cả images (array of strings) và items
  avatar?: string;
  slidesGap?: number;
  thumbsGap?: number;
  thumbsPerView?: number;
  gutter?: number;
  thumbIndex?: number;
  classNames?: {
    wrapper?: string;
  };
}

export default function CarouselWithThumb(props: CarouselWithThumbProps) {
  const {
    items,
    images,
    avatar,
    slidesGap = 12,
    thumbsGap = 12,
    thumbsPerView = 4,
    gutter = 16,
    thumbIndex = 0,
    classNames,
  } = props;
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [emblaMainRef, emblaMainApi] = useCarousel(
    {
      containScroll: "trimSnaps",
      loop: true,
    },
    [Autoplay({ playOnInit: true, delay: 3000 })]
  );
  const [emblaThumbsRef, emblaThumbsApi] = useCarousel({
    containScroll: "trimSnaps",
    dragFree: true,
    loop: true,
  });

  const onThumbClick = useCallback(
    (index: number) => {
      if (!emblaMainApi || !emblaThumbsApi) return;
      emblaMainApi.scrollTo(index);
    },
    [emblaMainApi, emblaThumbsApi]
  );

  const handlePrevious = () => {
    emblaMainApi?.scrollPrev();
  };
  const handleNext = () => {
    emblaMainApi?.scrollNext();
  };

  useEffect(() => {
    if (!emblaMainApi || !emblaThumbsApi) return;
    emblaMainApi.scrollTo(thumbIndex);
  }, [emblaMainApi, emblaThumbsApi, thumbIndex]);

  const onSelect = useCallback(() => {
    if (!emblaMainApi || !emblaThumbsApi) return;
    setSelectedIndex(emblaMainApi.selectedScrollSnap());
    emblaThumbsApi.scrollTo(emblaMainApi.selectedScrollSnap());
  }, [emblaMainApi, emblaThumbsApi]);

  useEffect(() => {
    if (!emblaMainApi) return;

    onSelect();

    emblaMainApi.on("select", onSelect).on("reInit", onSelect);
  }, [emblaMainApi, onSelect]);

  const imagesData = useMemo(() => {
    // Nếu có images (array of strings), convert sang format items
    if (images && Array.isArray(images) && images.length > 0) {
      return images.map((img) => ({ image_detail: img }));
    }
    // Nếu có items
    if (items && Array.isArray(items) && items.length > 0) {
      return items;
    }
    // Nếu có avatar
    if (avatar) {
      return [
        {
          image_detail: avatar,
        },
      ];
    }
    return [];
  }, [items, images, avatar]);

  if (imagesData.length === 0) {
    return null;
  }

  return (
    <div className={cn("w-full relative", classNames?.wrapper)}>
      <div data-name="viewport" className="overflow-hidden" ref={emblaMainRef}>
        <div
          data-name="container"
          className="flex touch-pan-y touch-pinch-zoom"
          style={{
            marginLeft: `-${slidesGap}px`,
          }}
        >
          {map(imagesData, (item, index) => (
            <div
              data-name="slide"
              key={index}
              className="w-full flex-shrink-0 flex-grow-0"
              style={{
                paddingLeft: `${slidesGap}px`,
              }}
            >
              <div className="flex-1 relative aspect-[9/10] sm:aspect-[9/10] rounded-lg overflow-hidden bg-white">
                <Image
                  className="rounded-lg object-contain w-full h-full"
                  src={`${URL_API}${item?.image_detail?.replaceAll("\\", "/") || ""}`}
                  alt={`Slide ${index + 1}`}
                  fill
                  sizes="(max-width: 640px) 100vw, (max-width: 1024px) 75vw, 50vw"
                  quality={80}
                  priority={index === 0}
                  loading={index === 0 ? "eager" : "lazy"}
                />
              </div>
            </div>
          ))}
        </div>
      </div>

      <div
        data-name="thumbs"
        className="relative group"
        style={{
          marginTop: `${gutter}px`,
        }}
      >
        <div
          data-name="thumbs-viewport"
          className="overflow-hidden"
          style={{
            marginLeft: `-${thumbsGap}px`,
          }}
          ref={emblaThumbsRef}
        >
          <div className="flex touch-pan-y touch-pinch-zoom">
            {map(imagesData, (item, index) => (
              <div
                key={index}
                style={{
                  paddingLeft: `${thumbsGap}px`,
                  width: `calc(100% / ${thumbsPerView})`,
                }}
                aria-selected={index === selectedIndex}
                className="flex-shrink-0 flex-grow-0"
              >
                <button
                  onClick={() => onThumbClick(index)}
                  type="button"
                  className="relative aspect-square w-full overflow-hidden rounded-md bg-gray-100"
                >
                  <span
                    aria-selected={index === selectedIndex}
                    className="absolute left-0 top-0 z-50 block size-full rounded-md border-2 border-primary opacity-0 transition-all duration-300 aria-selected:opacity-100"
                  />
                  <Image
                    src={`${URL_API}${item?.image_detail?.replaceAll("\\", "/") || ""}`}
                    alt={`Thumbnail ${index + 1}`}
                    fill
                    className="object-contain"
                    sizes="(max-width: 640px) 25vw, 15vw"
                    quality={75}
                    loading="lazy"
                  />
                </button>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

