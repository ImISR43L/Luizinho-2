import React from 'react';
import { Challenge, ChallengeStatus } from '../types';

interface ChallengeCardProps {
  challenge: Challenge;
  onClick: () => void;
}

const ChallengeCard: React.FC<ChallengeCardProps> = ({
  challenge,
  onClick,
}) => {
  const statusColors = {
    [ChallengeStatus.PENDING]: 'bg-yellow-500', 
    [ChallengeStatus.ACTIVE]: 'bg-green-500', 
    [ChallengeStatus.COMPLETED]: 'bg-gray-500', 
  };

  return (
    <div
      className="bg-gray-800 p-5 rounded-lg shadow-lg cursor-pointer hover:bg-gray-700 transition-transform transform hover:-translate-y-1"
      onClick={onClick}
    >
      <h3 className="text-xl font-bold mb-2 truncate">{challenge.title}</h3>
      <p className="text-gray-400 mb-4 h-12 overflow-hidden text-ellipsis">
        {challenge.description}
      </p>
      <div className="flex justify-between items-center">
        <span
          className={`px-3 py-1 text-sm rounded-full ${
            challenge.isPrivate ? 'bg-red-500' : 'bg-blue-500' 
          }`}
        >
          {challenge.isPrivate ? 'Private' : 'Public'}
        </span>
        <span
          className={`px-3 py-1 text-sm rounded-full capitalize ${
            statusColors[challenge.status]
          }`}
        >
          {challenge.status}
        </span>
      </div>
    </div>
  );
};

export default ChallengeCard;
