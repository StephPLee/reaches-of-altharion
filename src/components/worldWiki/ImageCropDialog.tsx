import type { ReactNode } from "react";
import { useEffect, useRef, useState } from "react";

import dialogStyles from "./Dialog.module.css";
import styles from "./ImageCropDialog.module.css";
import wikiStyles from "./WorldWiki.module.css";

const OUTPUT_SIZE = 640;
const MAX_ZOOM_MULTIPLIER = 4;

type Point = { x: number; y: number };
type Size = { width: number; height: number };

type ImageCropDialogProps = {
  file: File;
  onCancel: () => void;
  onCropped: (blob: Blob) => void;
};

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
}

export default function ImageCropDialog({
  file,
  onCancel,
  onCropped,
}: ImageCropDialogProps): ReactNode {
  const [objectUrl, setObjectUrl] = useState<string | null>(null);
  const [naturalSize, setNaturalSize] = useState<Size | null>(null);
  const [viewportSize, setViewportSize] = useState<Size | null>(null);
  const [scale, setScale] = useState(1);
  const [offset, setOffset] = useState<Point>({ x: 0, y: 0 });
  const dragState = useRef<{ pointerId: number; start: Point; startOffset: Point } | null>(null);
  const viewportRef = useRef<HTMLDivElement | null>(null);
  const naturalSizeRef = useRef<Size | null>(null);
  const viewportSizeRef = useRef<Size | null>(null);
  const minScaleRef = useRef(1);

  useEffect(() => {
    const url = URL.createObjectURL(file);
    setObjectUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [file]);

  function clampOffset(nextOffset: Point, nextScale: number, natural: Size, viewport: Size) {
    const displayedWidth = natural.width * nextScale;
    const displayedHeight = natural.height * nextScale;
    const minX = Math.min(0, viewport.width - displayedWidth);
    const minY = Math.min(0, viewport.height - displayedHeight);
    return {
      x: clamp(nextOffset.x, minX, 0),
      y: clamp(nextOffset.y, minY, 0),
    };
  }

  function recenterForSizes(natural: Size, viewport: Size) {
    const initialScale = Math.max(viewport.width / natural.width, viewport.height / natural.height);
    const centeredOffset = clampOffset(
      {
        x: (viewport.width - natural.width * initialScale) / 2,
        y: (viewport.height - natural.height * initialScale) / 2,
      },
      initialScale,
      natural,
      viewport,
    );

    minScaleRef.current = initialScale;
    setScale(initialScale);
    setOffset(centeredOffset);
  }

  // The crop box is a fluid (percentage-width) element, so its actual pixel
  // size isn't known until layout runs. Measuring it (rather than assuming a
  // fixed constant) keeps the cover/zoom/drag math in sync with what's drawn.
  useEffect(() => {
    const node = viewportRef.current;
    if (!node) {
      return;
    }

    const observer = new ResizeObserver((entries) => {
      const entry = entries[0];
      if (!entry) {
        return;
      }
      const nextViewportSize = {
        width: entry.contentRect.width,
        height: entry.contentRect.height,
      };
      if (nextViewportSize.width <= 0 || nextViewportSize.height <= 0) {
        return;
      }

      viewportSizeRef.current = nextViewportSize;
      setViewportSize(nextViewportSize);

      if (naturalSizeRef.current) {
        recenterForSizes(naturalSizeRef.current, nextViewportSize);
      }
    });

    observer.observe(node);
    return () => observer.disconnect();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Wheel-to-zoom needs preventDefault to stop page scroll, but React attaches
  // onWheel as a passive listener, silently ignoring preventDefault(). A native
  // listener registered with { passive: false } is required instead.
  useEffect(() => {
    const node = viewportRef.current;
    if (!node) {
      return;
    }

    function handleNativeWheel(event: WheelEvent) {
      if (!naturalSizeRef.current || !viewportSizeRef.current) {
        return;
      }
      event.preventDefault();

      setScale((currentScale) => {
        const nextScale = clamp(
          currentScale * (1 - event.deltaY * 0.0015),
          minScaleRef.current,
          minScaleRef.current * MAX_ZOOM_MULTIPLIER,
        );
        setOffset((currentOffset) =>
          clampOffset(currentOffset, nextScale, naturalSizeRef.current!, viewportSizeRef.current!),
        );
        return nextScale;
      });
    }

    node.addEventListener("wheel", handleNativeWheel, { passive: false });
    return () => node.removeEventListener("wheel", handleNativeWheel);
  }, []);

  function handleImageLoad(event: React.SyntheticEvent<HTMLImageElement>) {
    const image = event.currentTarget;
    const size = { width: image.naturalWidth, height: image.naturalHeight };
    naturalSizeRef.current = size;
    setNaturalSize(size);

    const currentViewportSize = viewportSizeRef.current ?? viewportRef.current?.getBoundingClientRect();
    if (currentViewportSize) {
      recenterForSizes(size, {
        width: currentViewportSize.width,
        height: currentViewportSize.height,
      });
    }
  }

  function handlePointerDown(event: React.PointerEvent<HTMLDivElement>) {
    event.currentTarget.setPointerCapture(event.pointerId);
    dragState.current = {
      pointerId: event.pointerId,
      start: { x: event.clientX, y: event.clientY },
      startOffset: offset,
    };
  }

  function handlePointerMove(event: React.PointerEvent<HTMLDivElement>) {
    if (!dragState.current || dragState.current.pointerId !== event.pointerId || !naturalSize || !viewportSize) {
      return;
    }

    const dx = event.clientX - dragState.current.start.x;
    const dy = event.clientY - dragState.current.start.y;
    const nextOffset = {
      x: dragState.current.startOffset.x + dx,
      y: dragState.current.startOffset.y + dy,
    };
    setOffset(clampOffset(nextOffset, scale, naturalSize, viewportSize));
  }

  function handlePointerUp(event: React.PointerEvent<HTMLDivElement>) {
    if (dragState.current?.pointerId === event.pointerId) {
      dragState.current = null;
    }
  }

  function handleCropConfirm() {
    if (!objectUrl || !naturalSize || !viewportSize) {
      return;
    }

    const image = new Image();
    image.onload = () => {
      const canvas = document.createElement("canvas");
      canvas.width = OUTPUT_SIZE;
      canvas.height = OUTPUT_SIZE;
      const ctx = canvas.getContext("2d");
      if (!ctx) {
        return;
      }

      const sourceX = -offset.x / scale;
      const sourceY = -offset.y / scale;
      const sourceWidth = viewportSize.width / scale;
      const sourceHeight = viewportSize.height / scale;

      ctx.drawImage(
        image,
        sourceX,
        sourceY,
        sourceWidth,
        sourceHeight,
        0,
        0,
        OUTPUT_SIZE,
        OUTPUT_SIZE,
      );

      canvas.toBlob((blob) => {
        if (blob) {
          onCropped(blob);
        }
      }, "image/png");
    };
    image.src = objectUrl;
  }

  return (
    <div className={dialogStyles.overlay} role="dialog" aria-modal="true" aria-label="Crop image">
      <div className={dialogStyles.dialog}>
        <h2 className={dialogStyles.title}>Crop Image</h2>
        <div
          ref={viewportRef}
          className={styles.viewport}
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onPointerCancel={handlePointerUp}
        >
          {objectUrl ? (
            <img
              src={objectUrl}
              alt="Crop preview"
              className={styles.viewportImage}
              onLoad={handleImageLoad}
              style={
                naturalSize
                  ? {
                      width: naturalSize.width,
                      height: naturalSize.height,
                      transform: `translate(${offset.x}px, ${offset.y}px) scale(${scale})`,
                    }
                  : { opacity: 0 }
              }
            />
          ) : null}
        </div>
        <p className={dialogStyles.hint}>Drag to reposition, scroll to zoom. The square area will be used as the cover image.</p>
        <div className={dialogStyles.actions}>
          <button type="button" className={wikiStyles.button} onClick={onCancel}>
            Cancel
          </button>
          <button
            type="button"
            className={`${wikiStyles.button} ${wikiStyles.buttonPrimary}`}
            onClick={handleCropConfirm}
            disabled={!naturalSize}
          >
            Crop &amp; Use
          </button>
        </div>
      </div>
    </div>
  );
}
