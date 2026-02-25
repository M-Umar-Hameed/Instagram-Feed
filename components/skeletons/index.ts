// Skeleton Components
// Use these components to show loading states while videos are fetching

// Base skeleton with shimmer animation
export { default as SkeletonBase } from './SkeletonBase';

// Full video feed skeleton (matches InstagramReelsFeed exactly)
export { default as VideoFeedSkeleton } from './VideoFeedSkeleton';

// Instagram feed skeleton removed

// Individual skeleton elements for custom compositions
export {
  ProfileSkeleton,
  ActionButtonSkeleton,
  TextSkeleton,
  UsernameSkeleton,
  CaptionSkeleton,
  RightSideActionsSkeleton,
  BottomLeftContentSkeleton,
} from './SkeletonElements';
