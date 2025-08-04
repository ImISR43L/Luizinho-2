import React, { useState } from 'react';
import { Challenge, Profile } from '../types';

interface CreateChallengeModalProps {
  onClose: () => void;
  user: Profile; 
  onChallengeCreated: (newChallenge: Challenge) => void;
}

const CreateChallengeModal: React.FC<CreateChallengeModalProps> = ({
  onClose,
  user,
  onChallengeCreated,
}) => {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [isPrivate, setIsPrivate] = useState(false);
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleCreate = async () => {
    if (!title.trim() || !description.trim()) {
      setError('Title and description cannot be empty.');
      return;
    }

    setIsLoading(true);
    setError('');

    const newChallengeData = {
      title,
      description,
      is_private: isPrivate,
      owner_id: user.id,
      status: 'pending' as const,
      participants: [user.id],
      join_requests: [],
      completions: [],
    };

    try {
      const response = await fetch('/api/challenges', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newChallengeData),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to create challenge.');
      }

      const createdChallenge = await response.json();
      onChallengeCreated(createdChallenge);
      onClose();
    } catch (err: any) {
      console.error('Error creating challenge:', err);
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-50">
      <div className="bg-gray-800 p-6 rounded-lg shadow-xl w-full max-w-md">
        <h2 className="text-2xl font-bold mb-4">Create a New Challenge</h2>
        {error && <p className="text-red-500 mb-4">{error}</p>}
        <input
          type="text"
          placeholder="Challenge Title"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          className="w-full p-2 mb-4 rounded bg-gray-700 border border-gray-600"
          disabled={isLoading}
        />
        <textarea
          placeholder="Challenge Description"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          className="w-full p-2 mb-4 rounded bg-gray-700 border border-gray-600 h-32"
          disabled={isLoading}
        />
        <label className="flex items-center mb-4">
          <input
            type="checkbox"
            checked={isPrivate}
            onChange={(e) => setIsPrivate(e.target.checked)}
            className="mr-2 h-5 w-5"
            disabled={isLoading}
          />
          <span>Make this a private challenge</span>
        </label>
        <div className="flex justify-end space-x-4">
          <button
            onClick={onClose}
            className="py-2 px-4 rounded bg-gray-600 hover:bg-gray-500"
            disabled={isLoading}
          >
            Cancel
          </button>
          <button
            onClick={handleCreate}
            className="py-2 px-4 rounded bg-blue-600 hover:bg-blue-700"
            disabled={isLoading}
          >
            {isLoading ? 'Creating...' : 'Create (150 Coins)'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default CreateChallengeModal;
