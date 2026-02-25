
import React, { createContext, useContext, ReactNode } from 'react';
import { Database } from '../database.types';

type CirclePost = Database['public']['Tables']['circle_posts']['Row'];

interface FeedContextType {
  addLikedPost?: (post: CirclePost) => void;
}

const FeedContext = createContext<FeedContextType>({});

export const useFeedContext = () => {
  return useContext(FeedContext);
};

interface FeedProviderProps {
  children: ReactNode;
  addLikedPost?: (post: CirclePost) => void;
}

export const FeedProvider: React.FC<FeedProviderProps> = ({ children, addLikedPost }) => {
  return (
    <FeedContext.Provider value={{ addLikedPost }}>
      {children}
    </FeedContext.Provider>
  );
};
export default FeedProvider;