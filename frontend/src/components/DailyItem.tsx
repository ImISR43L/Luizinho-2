import React, { useState } from 'react';
import apiClient from '../api/axiosConfig';
import { Daily, Difficulty, DailyLog } from '../types'; 

interface DailyItemProps {
  daily: Daily;
  onUpdate: () => void;
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

const DailyItem: React.FC<DailyItemProps> = ({
  daily,
  onUpdate,
  refreshUser,
}) => {
  const [isEditing, setIsEditing] = useState(false);
  const [editTitle, setEditTitle] = useState(daily.title);
  const [editNotes, setEditNotes] = useState(daily.notes || '');
  const [editDifficulty, setEditDifficulty] = useState<Difficulty>(
    daily.difficulty,
  );

  const handleComplete = async () => {
    if (daily.completed) {
      alert("You've already completed this daily for today!");
      return;
    }
    const notes = window.prompt("Add an optional note for today's completion:");
    try {
      const response = await apiClient.post(`/dailies/${daily.id}/complete`, {
        notes,
      });
      alert(`Daily completed! You earned ${response.data.goldChange} gold.`);
      onUpdate();
      refreshUser();
    } catch (error: any) {
      alert(
        `Error: ${error.response?.data?.message || 'Could not complete daily.'}`,
      );
    }
  };

  const handleDelete = async () => {
    const cost = DELETION_COSTS[daily.difficulty];
    const confirmation = window.confirm(
      `Are you sure you want to delete "${daily.title}"? This will cost ${cost} gold.`,
    );
    if (confirmation) {
      await handlePayToDelete();
    }
  };

  const handlePayToDelete = async () => {
    try {
      const response = await apiClient.delete(
        `/dailies/${daily.id}/pay-to-delete`,
      );
      alert(response.data.message);
      onUpdate();
      refreshUser();
    } catch (error: any) {
      alert(
        `Error: ${error.response?.data?.message || 'Could not process payment.'}`,
      );
    }
  };

  const handleSaveChanges = async () => {
    const titleChanged = editTitle !== daily.title;
    const notesChanged = editNotes !== (daily.notes || '');
    const difficultyChanged = editDifficulty !== daily.difficulty;

    if (difficultyChanged) {
      const oldLevel = DIFFICULTY_ORDER[daily.difficulty];
      const newLevel = DIFFICULTY_ORDER[editDifficulty];
      let confirmation = false;
      if (newLevel > oldLevel) {
        confirmation = window.confirm(
          `Upgrading difficulty is free, but you will not receive gold rewards from this daily for 7 days. Are you sure?`,
        );
      } else {
        const cost =
          DIFFICULTY_CHANGE_COSTS[daily.difficulty]?.[editDifficulty];
        if (cost === undefined) {
          alert('Invalid difficulty change.');
          setEditDifficulty(daily.difficulty);
          return;
        }
        confirmation = window.confirm(
          `Changing difficulty from ${daily.difficulty} to ${editDifficulty} costs ${cost} gold. Are you sure?`,
        );
      }
      if (!confirmation) return;
      try {
        await apiClient.patch(`/dailies/${daily.id}/pay-to-update`, {
          difficulty: editDifficulty,
        });
        alert('Difficulty updated!');
        refreshUser();
      } catch (error: any) {
        alert(
          `Error: ${error.response?.data?.message || 'Could not update difficulty.'}`,
        );
        return;
      }
    }

    if (titleChanged || notesChanged) {
      const payload: { title?: string; notes?: string } = {};
      if (titleChanged) payload.title = editTitle;
      if (notesChanged) payload.notes = editNotes;
      try {
        await apiClient.patch(`/dailies/${daily.id}`, payload);
        alert('Daily details updated!');
      } catch (error: any) {
        alert(
          `Error: ${error.response?.data?.message || 'Could not update details.'}`,
        );
      }
    }
    setIsEditing(false);
    onUpdate();
  };

  const handleViewLogs = async () => {
    try {
      const response = await apiClient.get<DailyLog[]>(
        `/dailies/${daily.id}/logs`,
      );
      if (response.data.length === 0) {
        alert('No log founded');
        return;
      }
      const formattedLogs = response.data
        .map((log) => {
          const dateObj = new Date(log.date);
          const day = String(dateObj.getDate()).padStart(2, '0');
          const month = String(dateObj.getMonth() + 1).padStart(2, '0'); 
          const year = dateObj.getFullYear();
          const formattedDate = `${day}/${month}/${year}`;

          const note = log.notes ? `: ${log.notes}` : '';
          return `${formattedDate}${note}`;
        })
        .join('\n');
      alert(`Completion Logs for "${daily.title}":\n\n${formattedLogs}`);
    } catch (error) {
      alert('Could not fetch logs.');
    }
  };

  const isGoldLocked =
    daily.goldRewardLockedUntil &&
    new Date() < new Date(daily.goldRewardLockedUntil);

  if (isEditing) {
    return (
      <div style={{ border: '1px solid blue', margin: '8px', padding: '8px' }}>
        <h4>Edit Daily</h4>
        <div>
          <label>Title: </label>
          <input
            value={editTitle}
            onChange={(e) => setEditTitle(e.target.value)}
          />
        </div>
        <div>
          <label>Notes: </label>
          <textarea
            value={editNotes}
            onChange={(e) => setEditNotes(e.target.value)}
          />
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
    <div
      style={{
        border: '1px solid black',
        margin: '8px',
        padding: '8px',
        color: daily.completed ? '#e0ffe0' : 'white',
      }}
    >
      <h4>
        {daily.title} {isGoldLocked && '(Gold Locked)'}
      </h4>
      {/* --- CHANGE 2: Display the permanent note here --- */}
      {daily.notes && (
        <p>
          <em>{daily.notes}</em>
        </p>
      )}
      <p>Difficulty: {daily.difficulty}</p>
      {isGoldLocked && daily.goldRewardLockedUntil && (
        <p style={{ color: 'orange' }}>
          Gold rewards locked until:{' '}
          {new Date(daily.goldRewardLockedUntil).toLocaleString()}
        </p>
      )}
      <div>
        <button onClick={handleComplete} disabled={daily.completed}>
          {daily.completed ? 'Done for Today' : 'Complete'}
        </button>
        <button onClick={() => setIsEditing(true)}>Edit</button>
        <button onClick={handleDelete}>Delete</button>
        <button onClick={handleViewLogs}>View Logs</button>
      </div>
    </div>
  );
};

export default DailyItem;
