import React from 'react';

const Skeleton = ({ width, height, borderRadius = '8px', style }) => (
  <div
    className="skeleton-pulse"
    style={{
      width: width || '100%',
      height: height || '20px',
      borderRadius,
      ...style
    }}
  />
);

export const MapSkeleton = () => (
  <div className="skeleton-map" style={{ height: '100%', width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
    <div style={{ textAlign: 'center' }}>
      <Skeleton width="300px" height="24px" style={{ marginBottom: '1rem' }} />
      <Skeleton width="200px" height="16px" />
    </div>
  </div>
);

export const CardSkeleton = () => (
  <div className="station-card skeleton-card">
    <div className="card-header">
      <div>
        <Skeleton width="120px" height="24px" style={{ marginBottom: '8px' }} />
        <Skeleton width="80px" height="14px" />
      </div>
      <Skeleton width="80px" height="28px" borderRadius="999px" />
    </div>
    <div className="card-content">
      <div className="info-grid">
        {[1,2,3,4].map(i => (
          <div className="info-item" key={i}>
            <Skeleton width="16px" height="16px" borderRadius="50%" />
            <div style={{ flex: 1 }}>
              <Skeleton width="60px" height="12px" style={{ marginBottom: '4px' }} />
              <Skeleton width="140px" height="16px" />
            </div>
          </div>
        ))}
      </div>
    </div>
    <div className="card-footer card-footer-actions">
      <Skeleton width="45%" height="36px" />
      <Skeleton width="45%" height="36px" />
    </div>
  </div>
);

export const ListSkeleton = () => (
  <div className="station-list-container">
    {Array.from({ length: 6 }).map((_, i) => (
      <CardSkeleton key={i} />
    ))}
  </div>
);

export default Skeleton;
