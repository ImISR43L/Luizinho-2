import React, { useState, useEffect } from 'react';
import apiClient from '../api/axiosConfig';
import { Habit, Difficulty, HabitType } from '../types';
import HabitItem from '../components/HabitItem';

interface HabitsPageProps {
  refreshUser: () => void;
}

const HabitsPage: React.FC<HabitsPageProps> = ({ refreshUser }) => {
  const [habits, setHabits] = useState<Habit[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [newHabitTitle, setNewHabitTitle] = useState('');
  const [newHabitType, setNewHabitType] = useState<HabitType>(
    HabitType.POSITIVE,
  );
  const [newHabitDifficulty, setNewHabitDifficulty] = useState<Difficulty>(
    Difficulty.MEDIUM,
  );

  const fetchHabits = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await apiClient.get<Habit[]>('/habits');
      setHabits(response.data);
    } catch (err) {
      setError('Failed to fetch habits. Please try refreshing the page.');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchHabits();
  }, []);

  const handleCreateHabit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newHabitTitle.trim()) return;
    try {
      await apiClient.post('/habits', {
        title: newHabitTitle,
        type: newHabitType,
        difficulty: newHabitDifficulty,
      });
      setNewHabitTitle('');
      fetchHabits();
    } catch (err) {
      setError('Failed to create habit.');
      console.error(err);
    }
  };

  const handleHabitUpdate = (updatedHabit: Habit) => {
    setHabits((prevHabits) =>
      prevHabits.map((habit) =>
        habit.id === updatedHabit.id ? updatedHabit : habit,
      ),
    );
  };

  if (loading) return <div>Loading habits...</div>;
  if (error) return <div style={{ color: 'red' }}>{error}</div>;

  return (
    <div>
      <h3>Create New Habit</h3>
      <form onSubmit={handleCreateHabit}>
        <input
          type="text"
          value={newHabitTitle}
          onChange={(e) => setNewHabitTitle(e.target.value)}
          placeholder="e.g., Exercise for 30 minutes"
        />
        <select
          value={newHabitType}
          onChange={(e) => setNewHabitType(e.target.value as HabitType)}
        >
          <option value={HabitType.POSITIVE}>Positive (+)</option>
          <option value={HabitType.NEGATIVE}>Negative (-)</option>
          <option value={HabitType.BOTH}>Both (+/-)</option>
        </select>
        <select
          value={newHabitDifficulty}
          onChange={(e) => setNewHabitDifficulty(e.target.value as Difficulty)}
        >
          <option value={Difficulty.TRIVIAL}>Trivial</option>
          <option value={Difficulty.EASY}>Easy</option>
          <option value={Difficulty.MEDIUM}>Medium</option>
          <option value={Difficulty.HARD}>Hard</option>
        </select>
        <button type="submit">Add Habit</button>
      </form>
      <hr />
      <h3>Your Habits</h3>
      <div>
        {habits.length > 0 ? (
          habits.map((habit) => (
            <HabitItem
              key={habit.id}
              habit={habit}
              onUpdate={handleHabitUpdate}
              onDelete={fetchHabits}
              refreshUser={refreshUser}
            />
          ))
        ) : (
          <p>You haven't created any habits yet.</p>
        )}
      </div>
    </div>
  );
};

export default HabitsPage;
