import { useState } from 'react';
import Image from 'next/image';
interface PromoCarouselProps {
  images: string[];
}

export default function PromoCarousel({ images }: PromoCarouselProps) {
  const [currentIndex, setCurrentIndex] = useState(0);

  const prevSlide = () => {
    setCurrentIndex((prev) => (prev === 0 ? images.length - 1 : prev - 1));
  };

  const nextSlide = () => {
    setCurrentIndex((prev) => (prev === images.length - 1 ? 0 : prev + 1));
  };

  return (
    <>
    <div className="relative flex justify-center items-center w-full">
        <Image
          src={images[currentIndex]}
          alt="Promo"
          width={640}
          height={360}
          className="rounded-lg"
        />
        <button
          onClick={prevSlide}
          className="absolute top-1/2 left-4 transform -translate-y-1/2 bg-gray-600 text-white px-2 py-1 rounded"
        >
          &larr;
        </button>
        <button
          onClick={nextSlide}
          className="absolute top-1/2 right-4 transform -translate-y-1/2 bg-gray-600 text-white px-2 py-1 rounded"
        >
          &rarr;
        </button>
      </div>
    </>
  );
}