import React from 'react';
import apiClient from '../api/axiosConfig';
import { Reward } from '../types';

interface RewardItemProps {
  reward: Reward;
  onUpdate: () => void;
  refreshUser: () => void;
}

const RewardItem: React.FC<RewardItemProps> = ({
  reward,
  onUpdate,
  refreshUser,
}) => {
  const handleRedeem = async () => {
    const confirmation = window.confirm(
      `Are you sure you want to redeem "${reward.title}" for ${reward.cost} gold?`,
    );
    if (confirmation) {
      try {
        const response = await apiClient.post(`/rewards/${reward.id}/redeem`);
        alert(
          `${response.data.message} Your new balance is ${response.data.newGoldBalance} gold.`,
        );
        onUpdate();
        refreshUser();
      } catch (error: any) {
        alert(
          `Error: ${error.response?.data?.message || 'Could not redeem reward.'}`,
        );
      }
    }
  };

  const handleDelete = async () => {
    const confirmation = window.confirm(
      `Are you sure you want to delete the reward: "${reward.title}"? This is free.`,
    );
    if (confirmation) {
      try {
        await apiClient.delete(`/rewards/${reward.id}`);
        alert('Reward deleted successfully.');
        onUpdate();
      } catch (error: any) {
        alert(
          `Error: ${
            error.response?.data?.message || 'Could not delete reward.'
          }`,
        );
      }
    }
  };

  const formattedLastRedeemed = reward.lastRedeemed
    ? new Date(reward.lastRedeemed).toLocaleString()
    : 'Never';

  return (
    <div className="item-card">
      <div className="item-info">
        <h4>{reward.title}</h4>
        {reward.notes && (
          <p>
            <em>{reward.notes}</em>
          </p>
        )}
        <p>Cost: {reward.cost} Gold</p>
        <p>Last Redeemed: {formattedLastRedeemed}</p>
      </div>
      <div>
        <button onClick={handleRedeem}>Redeem</button>
        <button onClick={handleDelete}>Delete</button>
      </div>
    </div>
  );
};

export default RewardItem;
