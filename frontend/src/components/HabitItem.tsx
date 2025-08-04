import React, { useState } from 'react';
import apiClient from '../api/axiosConfig';
import { Habit, Difficulty, HabitType } from '../types';

interface HabitItemProps {
  habit: Habit;
  onUpdate: (updatedHabit: Habit) => void;
  onDelete: () => void;
  refreshUser: () => void;
}

const DELETION_COSTS = {
  [Difficulty.HARD]: 300,
  [Difficulty.MEDIUM]: 100,
  [Difficulty.EASY]: 50,
  [Difficulty.TRIVIAL]: 25,
};
const DIFFICULTY_CHANGE_COSTS: Partial<
  Record<Difficulty, Partial<Record<Difficulty, number>>>
> = {
  [Difficulty.HARD]: {
    [Difficulty.MEDIUM]: 150,
    [Difficulty.EASY]: 200,
    [Difficulty.TRIVIAL]: 250,
  },
  [Difficulty.MEDIUM]: { [Difficulty.EASY]: 100, [Difficulty.TRIVIAL]: 50 },
  [Difficulty.EASY]: { [Difficulty.TRIVIAL]: 20 },
};
const DIFFICULTY_ORDER = {
  [Difficulty.TRIVIAL]: 0,
  [Difficulty.EASY]: 1,
  [Difficulty.MEDIUM]: 2,
  [Difficulty.HARD]: 3,
};

const HabitItem: React.FC<HabitItemProps> = ({
  habit,
  onUpdate,
  onDelete,
  refreshUser,
}) => {
  const [isEditing, setIsEditing] = useState(false);
  const [editTitle, setEditTitle] = useState(habit.title);
  const [editType, setEditType] = useState<HabitType>(habit.type);
  const [editDifficulty, setEditDifficulty] = useState<Difficulty>(
    habit.difficulty,
  );

  const handleLog = async (completed: boolean) => {
    try {
      const response = await apiClient.post(`/habits/${habit.id}/log`, {
        completed,
      });
      onUpdate(response.data.habit);
      if (response.data.goldChange !== 0) {
        refreshUser();
      }
    } catch (error: any) {
      alert(
        `Error: ${error.response?.data?.message || 'Could not log habit.'}`,
      );
    }
  };

  const handleDelete = async () => {
    try {
      const response = await apiClient.delete(`/habits/${habit.id}`);
      alert(response.data.message);
      onDelete();
    } catch (error: any) {
      if (error.response?.status === 403) {
        const cost = DELETION_COSTS[habit.difficulty];
        const confirmation = window.confirm(
          `You don't have the required streak to delete this for free.\n\nWould you like to pay ${cost} gold to delete it now?`,
        );
        if (confirmation) {
          await handlePayToDelete();
        }
      } else {
        alert(
          `Error: ${error.response?.data?.message || 'Could not delete habit.'}`,
        );
      }
    }
  };

  const handlePayToDelete = async () => {
    try {
      const response = await apiClient.delete(
        `/habits/${habit.id}/pay-to-delete`,
      );
      alert(response.data.message);
      onDelete();
      refreshUser();
    } catch (error: any) {
      alert(
        `Error: ${error.response?.data?.message || 'Could not process payment.'}`,
      );
    }
  };

  const handleSaveChanges = async () => {
    const titleChanged = editTitle !== habit.title;
    const typeChanged = editType !== habit.type;
    const difficultyChanged = editDifficulty !== habit.difficulty;

    if (difficultyChanged) {
      const oldLevel = DIFFICULTY_ORDER[habit.difficulty];
      const newLevel = DIFFICULTY_ORDER[editDifficulty];
      let confirmation = false;
      if (newLevel > oldLevel) {
        confirmation = window.confirm(
          `Upgrading difficulty is free, but you will not receive gold rewards from this habit for 7 days. Are you sure?`,
        );
      } else {
        const cost =
          DIFFICULTY_CHANGE_COSTS[habit.difficulty]?.[editDifficulty];
        if (cost === undefined) {
          alert('Invalid difficulty change.');
          setEditDifficulty(habit.difficulty);
          return;
        }
        confirmation = window.confirm(
          `Changing difficulty from ${habit.difficulty} to ${editDifficulty} costs ${cost} gold. Are you sure?`,
        );
      }
      if (!confirmation) return;
      try {
        await apiClient.patch(`/habits/${habit.id}/pay-to-update`, {
          difficulty: editDifficulty,
        });
        alert('Difficulty updated!');
        refreshUser();
      } catch (error: any) {
        alert(
          `Error: ${
            error.response?.data?.message || 'Could not update difficulty.'
          }`,
        );
        return;
      }
    }

    if (titleChanged || typeChanged) {
      const payload: { title?: string; type?: HabitType } = {};
      if (titleChanged) payload.title = editTitle;
      if (typeChanged) payload.type = editType;
      try {
        await apiClient.patch(`/habits/${habit.id}`, payload);
        alert('Habit details updated!');
      } catch (error: any) {
        alert(
          `Error: ${
            error.response?.data?.message || 'Could not update details.'
          }`,
        );
      }
    }
    setIsEditing(false);
    onDelete(); 
  };

  const isGoldLocked =
    habit.goldRewardLockedUntil &&
    new Date() < new Date(habit.goldRewardLockedUntil);

  if (isEditing) {
    return (
      <div style={{ border: '1px solid blue', margin: '8px', padding: '8px' }}>
        <h4>Edit Habit</h4>
        <div>
          <label>Title: </label>
          <input
            value={editTitle}
            onChange={(e) => setEditTitle(e.target.value)}
          />
        </div>
        <div>
          <label>Type: </label>
          <select
            value={editType}
            onChange={(e) => setEditType(e.target.value as HabitType)}
          >
            <option value={HabitType.POSITIVE}>Positive (+)</option>
            <option value={HabitType.NEGATIVE}>Negative (-)</option>
            <option value={HabitType.BOTH}>Both (+/-)</option>
          </select>
        </div>
        <div>
          <label>Difficulty: </label>
          <select
            value={editDifficulty}
            onChange={(e) => setEditDifficulty(e.target.value as Difficulty)}
          >
            <option value={Difficulty.TRIVIAL}>Trivial</option>
            <option value={Difficulty.EASY}>Easy</option>
            <option value={Difficulty.MEDIUM}>Medium</option>
            <option value={Difficulty.HARD}>Hard</option>
          </select>
        </div>
        <div>
          <button onClick={handleSaveChanges}>Save Changes</button>
          <button onClick={() => setIsEditing(false)}>Cancel</button>
        </div>
      </div>
    );
  }

  return (
    <div style={{ border: '1px solid black', margin: '8px', padding: '8px' }}>
      <h4>
        {habit.title} {isGoldLocked && '(Gold Locked)'}
      </h4>
      <p>
        Type: {habit.type} | Difficulty: {habit.difficulty}
      </p>
      {habit.currentStreak > 0 && <p>Current Streak: {habit.currentStreak}</p>}
      {isGoldLocked && habit.goldRewardLockedUntil && (
        <p style={{ color: 'orange' }}>
          Gold rewards locked until:{' '}
          {new Date(habit.goldRewardLockedUntil).toLocaleString()}
        </p>
      )}
      <div>
        <button onClick={() => handleLog(true)}>+</button>
        {habit.type !== 'POSITIVE' && (
          <button onClick={() => handleLog(false)}>-</button>
        )}
        <button onClick={() => setIsEditing(true)}>Edit</button>
        <button onClick={handleDelete}>Delete</button>
      </div>
    </div>
  );
};

export default HabitItem;
