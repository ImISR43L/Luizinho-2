import React, { useState, useEffect } from 'react';
import apiClient from '../api/axiosConfig';
import { Daily, Difficulty } from '../types';
import DailyItem from '../components/DailyItem';

interface DailiesPageProps {
  refreshUser: () => void;
}

const DailiesPage: React.FC<DailiesPageProps> = ({ refreshUser }) => {
  const [dailies, setDailies] = useState<Daily[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);


  const [newDailyTitle, setNewDailyTitle] = useState('');
  const [newDailyNotes, setNewDailyNotes] = useState('');
  const [newDailyDifficulty, setNewDailyDifficulty] = useState<Difficulty>(
    Difficulty.MEDIUM,
  );

  const fetchDailies = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await apiClient.get<Daily[]>('/dailies');
      setDailies(response.data);
    } catch (err) {
      setError('Failed to fetch dailies.');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDailies();
  }, []);

  const handleCreateDaily = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newDailyTitle.trim()) return;
    try {
      await apiClient.post('/dailies', {
        title: newDailyTitle,
        notes: newDailyNotes, 
        difficulty: newDailyDifficulty,
      });
      setNewDailyTitle('');
      setNewDailyNotes('');
      fetchDailies();
    } catch (err) {
      setError('Failed to create daily.');
      console.error(err);
    }
  };

  if (loading) return <div>Loading dailies...</div>;
  if (error) return <div style={{ color: 'red' }}>{error}</div>;

  return (
    <div>
      <h3>Create New Daily</h3>
      <form onSubmit={handleCreateDaily}>
        <input
          type="text"
          value={newDailyTitle}
          onChange={(e) => setNewDailyTitle(e.target.value)}
          placeholder="e.g., Check emails"
        />
        {/* Add textarea for permanent notes */}
        <textarea
          value={newDailyNotes}
          onChange={(e) => setNewDailyNotes(e.target.value)}
          placeholder="Optional: Add a permanent note or description"
        />
        <select
          value={newDailyDifficulty}
          onChange={(e) => setNewDailyDifficulty(e.target.value as Difficulty)}
        >
          <option value={Difficulty.TRIVIAL}>Trivial</option>
          <option value={Difficulty.EASY}>Easy</option>
          <option value={Difficulty.MEDIUM}>Medium</option>
          <option value={Difficulty.HARD}>Hard</option>
        </select>
        <button type="submit">Add Daily</button>
      </form>

      <hr style={{ margin: '20px 0' }} />

      <h3>Your Dailies</h3>
      <div>
        {dailies.length > 0 ? (
          dailies.map((daily) => (
            <DailyItem
              key={daily.id}
              daily={daily}
              onUpdate={fetchDailies}
              refreshUser={refreshUser}
            />
          ))
        ) : (
          <p>You haven't created any dailies yet.</p>
        )}
      </div>
    </div>
  );
};

export default DailiesPage;
