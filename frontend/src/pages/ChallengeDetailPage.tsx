
import React, { useState, useEffect, useCallback } from 'react';
import apiClient from '../api/axiosConfig';
import { Challenge, User, UserChallenge, MembershipStatus } from '../types';

interface ChallengeDetailPageProps {
  challengeId: string;
  onBack: () => void;
  currentUser: User;
}

const ChallengeDetailPage: React.FC<ChallengeDetailPageProps> = ({
  challengeId,
  onBack,
  currentUser,
}) => {
  const [challenge, setChallenge] = useState<Challenge | null>(null);
  const [leaderboard, setLeaderboard] = useState<UserChallenge[]>([]);
  const [loading, setLoading] = useState(true);
  const [myParticipation, setMyParticipation] = useState<UserChallenge | null>(
    null,
  );

  const fetchChallengeDetails = useCallback(async () => {
    try {
      setLoading(true);
      const [challengeRes, leaderboardRes, myChallengesRes] = await Promise.all(
        [
          apiClient.get(`/challenges/${challengeId}`),
          apiClient.get(`/challenges/${challengeId}/leaderboard`),
          apiClient.get<UserChallenge[]>('/challenges/participation/mine'),
        ],
      );
      setChallenge(challengeRes.data);
      setLeaderboard(leaderboardRes.data);
      setMyParticipation(
        myChallengesRes.data.find((uc) => uc.challengeId === challengeId) ||
          null,
      );
    } catch (error) {
      console.error('Failed to fetch challenge details', error);
    } finally {
      setLoading(false);
    }
  }, [challengeId]);

  useEffect(() => {
    fetchChallengeDetails();
  }, [fetchChallengeDetails]);

  const handleStartChallenge = async () => {
    if (window.confirm('Are you sure you want to start this challenge?')) {
      try {
        await apiClient.post(`/challenges/${challengeId}/start`);
        alert('Challenge started!');
        fetchChallengeDetails();
      } catch (error: any) {
        alert(
          `Error: ${
            error.response?.data?.message || 'Could not start challenge.'
          }`,
        );
      }
    }
  };

  const handleCompleteChallenge = async () => {
    if (!myParticipation) return;
    if (
      window.confirm(
        'Are you sure you want to mark this challenge as complete?',
      )
    ) {
      try {
        await apiClient.post(
          `/challenges/participation/${myParticipation.id}/complete`,
        );
        alert('Challenge completed!');
        fetchChallengeDetails();
      } catch (error: any) {
        alert(
          `Error: ${
            error.response?.data?.message || 'Could not complete challenge.'
          }`,
        );
      }
    }
  };

  const handleDeleteChallenge = async () => {
    if (
      window.confirm(
        'Are you sure you want to delete this challenge? This cannot be undone.',
      )
    ) {
      try {
        await apiClient.delete(`/challenges/${challengeId}`);
        alert('Challenge deleted successfully.');
        onBack();
      } catch (error: any) {
        alert(
          `Error: ${
            error.response?.data?.message || 'Could not delete challenge.'
          }`,
        );
      }
    }
  };

  const handleApproveRequest = async (userChallengeId: string) => {
    try {
      await apiClient.post(
        `/challenges/participation/${userChallengeId}/approve`,
      );
      alert('Request approved!');
      fetchChallengeDetails();
    } catch (error: any) {
      alert(
        `Error: ${
          error.response?.data?.message || 'Could not approve request.'
        }`,
      );
    }
  };

  const handleRejectRequest = async (userChallengeId: string) => {
    if (window.confirm('Are you sure you want to reject this request?')) {
      try {
        await apiClient.delete(
          `/challenges/participation/${userChallengeId}/reject`,
        );
        alert('Request rejected.');
        fetchChallengeDetails();
      } catch (error: any) {
        alert(
          `Error: ${
            error.response?.data?.message || 'Could not reject request.'
          }`,
        );
      }
    }
  };

  if (loading) return <div>Loading challenge details...</div>;
  if (!challenge)
    return (
      <div>
        Challenge not found. <button onClick={onBack}>Go Back</button>
      </div>
    );

  const isOwner = currentUser.id === challenge.creatorId;
  const isPending = myParticipation?.status === MembershipStatus.PENDING;
  const pendingRequests = challenge.participants.filter(
    (p) => p.status === MembershipStatus.PENDING,
  );

  if (challenge.isPrivate && !isOwner && isPending) {
    return (
      <div>
        <button onClick={onBack}>&larr; Back to All Challenges</button>
        <h2>{challenge.title}</h2>
        <p>
          Your request to join this private challenge is pending approval by the
          owner.
        </p>
      </div>
    );
  }

  return (
    <div>
      <button onClick={onBack}>&larr; Back to All Challenges</button>
      <h2>{challenge.title}</h2>
      <p>{challenge.description}</p>
      <p>
        <strong>Goal:</strong> {challenge.goal}
      </p>
      <p>
        <strong>Status:</strong> {challenge.status}
      </p>

      {isOwner && challenge.status === 'PENDING' && (
        <button onClick={handleStartChallenge}>Start Challenge</button>
      )}

      {myParticipation &&
        challenge.status === 'ACTIVE' &&
        !myParticipation.completed && (
          <button onClick={handleCompleteChallenge}>Complete Challenge</button>
        )}

      {isOwner && (
        <button
          onClick={handleDeleteChallenge}
          style={{ backgroundColor: '#ffdddd', color: 'darkred' }}
        >
          Delete Challenge
        </button>
      )}

      {isOwner && pendingRequests.length > 0 && (
        <div>
          <h3>Pending Join Requests</h3>
          <ul>
            {pendingRequests.map((req) => (
              <li key={req.id}>
                {req.user?.username}
                <button onClick={() => handleApproveRequest(req.id)}>
                  Approve
                </button>
                <button onClick={() => handleRejectRequest(req.id)}>
                  Reject
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}

      <h3>Leaderboard</h3>
      {leaderboard.length > 0 ? (
        <ol>
          {leaderboard.map((entry) => (
            <li key={entry.id}>
              {entry.user?.username} -{' '}
              {entry.completionTime
                ? `${Math.floor(entry.completionTime / 3600)}h ${Math.floor(
                    (entry.completionTime % 3600) / 60,
                  )}m ${entry.completionTime % 60}s`
                : 'Incomplete'}
            </li>
          ))}
        </ol>
      ) : (
        <p>No one has completed this challenge yet.</p>
      )}
    </div>
  );
};

export default ChallengeDetailPage;
