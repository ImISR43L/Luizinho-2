
import React, { useState, useEffect } from 'react';
import apiClient from '../api/axiosConfig';
import { Challenge, UserChallenge } from '../types';

interface ChallengesPageProps {
  onViewChallenge: (challengeId: string) => void;
  refreshUser: () => void;
}

const ChallengesPage: React.FC<ChallengesPageProps> = ({
  onViewChallenge,
  refreshUser,
}) => {
  const [myChallenges, setMyChallenges] = useState<UserChallenge[]>([]);
  const [discoverableChallenges, setDiscoverableChallenges] = useState<
    Challenge[]
  >([]);
  const [loading, setLoading] = useState(true);
  const [newChallengeTitle, setNewChallengeTitle] = useState('');
  const [newChallengeDesc, setNewChallengeDesc] = useState('');
  const [newChallengeGoal, setNewChallengeGoal] = useState('');
  const [isPrivate, setIsPrivate] = useState(false);

  const fetchChallenges = async () => {
    try {
      setLoading(true);
      const [myChallengesRes, discoverChallengesRes] = await Promise.all([
        apiClient.get<UserChallenge[]>('/challenges/participation/mine'),
        apiClient.get<Challenge[]>('/challenges/public'),
      ]);

      const myChallengeIds = myChallengesRes.data.map((uc) => uc.challengeId);
      setMyChallenges(myChallengesRes.data);
      setDiscoverableChallenges(
        discoverChallengesRes.data.filter(
          (c) => !myChallengeIds.includes(c.id),
        ),
      );
    } catch (error) {
      console.error('Failed to fetch challenges', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchChallenges();
  }, []);

  const handleCreateChallenge = async (e: React.FormEvent) => {
    e.preventDefault();
    if (
      !newChallengeTitle.trim() ||
      !newChallengeDesc.trim() ||
      !newChallengeGoal.trim()
    )
      return;
    const confirmation = window.confirm(
      'Creating a new challenge costs 150 gold. Are you sure?',
    );
    if (!confirmation) return;
    try {
      await apiClient.post('/challenges', {
        title: newChallengeTitle,
        description: newChallengeDesc,
        goal: newChallengeGoal,
        isPrivate,
      });
      alert('Challenge created successfully!');
      setNewChallengeTitle('');
      setNewChallengeDesc('');
      setNewChallengeGoal('');
      fetchChallenges();
      refreshUser();
    } catch (error: any) {
      alert(
        `Error: ${
          error.response?.data?.message || 'Could not create challenge.'
        }`,
      );
    }
  };

  const handleJoinChallenge = async (challengeId: string) => {
    try {
      await apiClient.post(`/challenges/${challengeId}/join`);
      alert('Successfully joined/requested to join challenge!');
      fetchChallenges();
    } catch (error: any) {
      alert(
        `Error: ${
          error.response?.data?.message || 'Could not join challenge.'
        }`,
      );
    }
  };

  if (loading) return <div>Loading challenges...</div>;

  return (
    <div>
      <h3>Create a New Challenge (Cost: 150 Gold)</h3>
      <form onSubmit={handleCreateChallenge}>
        <input
          value={newChallengeTitle}
          onChange={(e) => setNewChallengeTitle(e.target.value)}
          placeholder="Challenge Title"
          required
        />
        <textarea
          value={newChallengeDesc}
          onChange={(e) => setNewChallengeDesc(e.target.value)}
          placeholder="Challenge Description"
        />
        <input
          value={newChallengeGoal}
          onChange={(e) => setNewChallengeGoal(e.target.value)}
          placeholder="Challenge Goal"
          required
        />
        <div>
          <label>
            <input
              type="checkbox"
              checked={isPrivate}
              onChange={(e) => setIsPrivate(e.target.checked)}
            />
            Private (users must be approved to join)
          </label>
        </div>
        <button type="submit">Create Challenge</button>
      </form>
      <hr />
      <h3>My Challenges</h3>
      {myChallenges.length > 0 ? (
        myChallenges.map((uc) => (
          <div
            key={uc.id}
            style={{
              border: '1px solid green',
              padding: '10px',
              margin: '10px',
            }}
          >
            <h4>
              {uc.challenge.title} {uc.challenge.isPrivate && '(Private)'}
            </h4>
            <p>{uc.challenge.description}</p>
            <button onClick={() => onViewChallenge(uc.challengeId)}>
              View Details
            </button>
          </div>
        ))
      ) : (
        <p>You haven't joined any challenges yet.</p>
      )}
      <hr />
      <h3>Discover Challenges</h3>
      {discoverableChallenges.length > 0 ? (
        discoverableChallenges.map((challenge) => (
          <div
            key={challenge.id}
            style={{
              border: '1px solid grey',
              padding: '10px',
              margin: '10px',
            }}
          >
            <h4>
              {challenge.title} {challenge.isPrivate && '(Private)'}
            </h4>
            <p>{challenge.description}</p>
            <p>Participants: {challenge._count?.participants}</p>
            <button onClick={() => handleJoinChallenge(challenge.id)}>
              {challenge.isPrivate ? 'Request to Join' : 'Join Challenge'}
            </button>
          </div>
        ))
      ) : (
        <p>No new challenges to discover.</p>
      )}
    </div>
  );
};

export default ChallengesPage;
