import React, { useState, useEffect } from 'react';
import apiClient from '../api/axiosConfig';
import { Todo, Difficulty } from '../types';
import TodoItem from '../components/TodoItem';

interface TodosPageProps {
  refreshUser: () => void;
}

const TodosPage: React.FC<TodosPageProps> = ({ refreshUser }) => {
  const [todos, setTodos] = useState<Todo[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [newTodoTitle, setNewTodoTitle] = useState('');
  const [newTodoNotes, setNewTodoNotes] = useState(''); 
  const [newTodoDueDate, setNewTodoDueDate] = useState(''); 
  const [newTodoDifficulty, setNewTodoDifficulty] = useState<Difficulty>(
    Difficulty.MEDIUM,
  );

  const fetchTodos = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await apiClient.get<Todo[]>('/todos');
      setTodos(response.data);
    } catch (err) {
      setError('Failed to fetch todos.');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTodos();
  }, []);

  const handleCreateTodo = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTodoTitle.trim()) return;


    const payload: any = {
      title: newTodoTitle,
      difficulty: newTodoDifficulty,
    };
    if (newTodoNotes.trim()) {
      payload.notes = newTodoNotes;
    }
    if (newTodoDueDate) {
      payload.dueDate = new Date(newTodoDueDate).toISOString();
    }

    try {
      await apiClient.post('/todos', payload);
   
      setNewTodoTitle('');
      setNewTodoNotes('');
      setNewTodoDueDate('');
      fetchTodos();
    } catch (err) {
      setError('Failed to create todo.');
      console.error(err);
    }
  };

  if (loading) return <div>Loading todos...</div>;
  if (error) return <div style={{ color: 'red' }}>{error}</div>;

  return (
    <div>
      <h3>Create New To-Do</h3>
      <form onSubmit={handleCreateTodo}>
        <input
          type="text"
          value={newTodoTitle}
          onChange={(e) => setNewTodoTitle(e.target.value)}
          placeholder="e.g., Finish project report"
          required
        />
        <textarea
          value={newTodoNotes}
          onChange={(e) => setNewTodoNotes(e.target.value)}
          placeholder="Optional: Add notes or a description"
        />
        <input
          type="date"
          value={newTodoDueDate}
          onChange={(e) => setNewTodoDueDate(e.target.value)}
        />
        <select
          value={newTodoDifficulty}
          onChange={(e) => setNewTodoDifficulty(e.target.value as Difficulty)}
        >
          <option value={Difficulty.TRIVIAL}>Trivial</option>
          <option value={Difficulty.EASY}>Easy</option>
          <option value={Difficulty.MEDIUM}>Medium</option>
          <option value={Difficulty.HARD}>Hard</option>
        </select>
        <button type="submit">Add To-Do</button>
      </form>

      <hr style={{ margin: '20px 0' }} />

      <h3>Your To-Do List</h3>
      <div>
        {todos.length > 0 ? (
          todos.map((todo) => (
            <TodoItem
              key={todo.id}
              todo={todo}
              onUpdate={fetchTodos}
              refreshUser={refreshUser}
            />
          ))
        ) : (
          <p>You have no to-do items.</p>
        )}
      </div>
    </div>
  );
};

export default TodosPage;
