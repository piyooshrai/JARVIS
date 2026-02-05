import { type FC, type ReactNode } from 'react';
import { usePullToRefresh } from '../hooks/usePullToRefresh';

interface PullToRefreshProps {
  onRefresh: () => Promise<void>;
  children: ReactNode;
}

export const PullToRefresh: FC<PullToRefreshProps> = ({ onRefresh, children }) => {
  const { containerRef, isRefreshing, pullDistance } = usePullToRefresh({
    onRefresh,
    threshold: 80,
    isEnabled: true,
  });

  const getRotation = () => {
    if (isRefreshing) return 360;
    return Math.min((pullDistance / 80) * 180, 180);
  };

  return (
    <div ref={containerRef} className="relative">
      {/* Pull indicator */}
      <div
        className="absolute left-1/2 -translate-x-1/2 transition-all duration-200 ease-out pointer-events-none"
        style={{
          top: `${Math.max(pullDistance - 40, 0)}px`,
          opacity: pullDistance > 10 ? 1 : 0,
        }}
      >
        <div
          className={`w-8 h-8 rounded-full border-3 border-gray-300 border-t-black transition-transform ${
            isRefreshing ? 'animate-spin' : ''
          }`}
          style={{
            transform: `rotate(${getRotation()}deg)`,
          }}
        />
      </div>

      {/* Content */}
      {children}
    </div>
  );
};
