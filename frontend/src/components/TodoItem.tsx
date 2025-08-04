import React from 'react';
import apiClient from '../api/axiosConfig';
import { Todo } from '../types';

interface TodoItemProps {
  todo: Todo;
  onUpdate: () => void;
  refreshUser: () => void;
}

const TodoItem: React.FC<TodoItemProps> = ({ todo, onUpdate, refreshUser }) => {
  const handleToggleComplete = async () => {
    if (todo.completed) return;

    try {
      const response = await apiClient.post(`/todos/${todo.id}/complete`);
      alert(`Todo completed! You earned ${response.data.goldChange} gold.`);
      onUpdate();
      refreshUser();
    } catch (error: any) {
      alert(
        `Error: ${error.response?.data?.message || 'Could not complete todo.'}`,
      );
    }
  };

  const handleDelete = async () => {
    const confirmation = window.confirm(
      `Are you sure you want to delete the todo: "${todo.title}"?`,
    );
    if (confirmation) {
      try {
        await apiClient.delete(`/todos/${todo.id}`);
        alert('Todo deleted successfully.');
        onUpdate();
      } catch (error: any) {
        alert(
          `Error: ${error.response?.data?.message || 'Could not delete todo.'}`,
        );
      }
    }
  };

  const formattedDueDate = todo.dueDate
    ? new Date(todo.dueDate).toLocaleDateString('pt-BR', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
      })
    : null;

  return (
    <div
      style={{
        border: '1px solid black',
        margin: '8px',
        padding: '8px',
        textDecoration: todo.completed ? 'line-through' : 'none',
        color: todo.completed ? 'grey' : 'black',
      }}
    >
      <div>
        <input
          type="checkbox"
          checked={todo.completed}
          onChange={handleToggleComplete}
          disabled={todo.completed}
          style={{ marginRight: '8px' }}
        />
        <span style={{ color: 'white' }}>{todo.title}</span>
      </div>
      <p style={{ fontSize: '0.9em', color: 'white' }}>
        Difficulty: {todo.difficulty}
      </p>
      {/* Display notes if they exist */}
      {todo.notes && (
        <p style={{ fontSize: '0.9em', fontStyle: 'italic', color: 'white' }}>
          Notes: {todo.notes}
        </p>
      )}
      {/* Display due date if it exists */}
      {formattedDueDate && (
        <p style={{ fontSize: '0.9em', color: 'white' }}>
          Due: {formattedDueDate}
        </p>
      )}

      <div style={{ marginTop: '8px' }}>
        <button onClick={handleDelete}>Delete</button>
      </div>
    </div>
  );
};

export default TodoItem;
