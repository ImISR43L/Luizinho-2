import React, { useState, useEffect } from 'react';
import apiClient from '../api/axiosConfig';
import { Reward } from '../types';
import RewardItem from '../components/RewardItem';

interface RewardsPageProps {
  refreshUser: () => void;
}

const RewardsPage: React.FC<RewardsPageProps> = ({ refreshUser }) => {
  const [rewards, setRewards] = useState<Reward[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);


  const [newRewardTitle, setNewRewardTitle] = useState('');
  const [newRewardNotes, setNewRewardNotes] = useState('');
  const [newRewardCost, setNewRewardCost] = useState(10);

  const fetchRewards = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await apiClient.get<Reward[]>('/rewards');
      setRewards(response.data);
    } catch (err) {
      setError('Failed to fetch rewards.');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRewards();
  }, []);

  const handleCreateReward = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newRewardTitle.trim()) return;
    try {
      await apiClient.post('/rewards', {
        title: newRewardTitle,
        notes: newRewardNotes,
        cost: Number(newRewardCost),
      });
      setNewRewardTitle('');
      setNewRewardNotes('');
      setNewRewardCost(10);
      fetchRewards();
    } catch (err) {
      setError('Failed to create reward.');
      console.error(err);
    }
  };

  if (loading) return <div>Loading rewards...</div>;
  if (error) return <div style={{ color: 'red' }}>{error}</div>;

  return (
    <div>
      <h3>Create New Reward</h3>
      <form onSubmit={handleCreateReward}>
        <input
          type="text"
          value={newRewardTitle}
          onChange={(e) => setNewRewardTitle(e.target.value)}
          placeholder="e.g., Watch a movie"
          required
        />
        <textarea
          value={newRewardNotes}
          onChange={(e) => setNewRewardNotes(e.target.value)}
          placeholder="Optional notes..."
        />
        <input
          type="number"
          value={newRewardCost}
          onChange={(e) => setNewRewardCost(Number(e.target.value))}
          min="0"
        />
        <button type="submit">Add Reward</button>
      </form>

      <hr style={{ margin: '20px 0' }} />

      <h3>Your Rewards</h3>
      <div>
        {rewards.length > 0 ? (
          rewards.map((reward) => (
            <RewardItem
              key={reward.id}
              reward={reward}
              onUpdate={fetchRewards}
              refreshUser={refreshUser}
            />
          ))
        ) : (
          <p>You haven't created any rewards yet.</p>
        )}
      </div>
    </div>
  );
};

export default RewardsPage;
