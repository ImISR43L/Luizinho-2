import React, { useState, useEffect } from 'react';
import apiClient from '../api/axiosConfig';
import { Group, UserGroupMembership } from '../types';

interface GroupsPageProps {
  onViewGroup: (groupId: string) => void;
  refreshUser: () => void;
}

const GroupsPage: React.FC<GroupsPageProps> = ({
  onViewGroup,
  refreshUser,
}) => {
  const [myGroups, setMyGroups] = useState<Group[]>([]);
  const [discoverableGroups, setDiscoverableGroups] = useState<Group[]>([]);
  const [loading, setLoading] = useState(true);
  const [newGroupName, setNewGroupName] = useState('');
  const [newGroupDesc, setNewGroupDesc] = useState('');
  const [isPublic, setIsPublic] = useState(true);

  const fetchGroups = async () => {
    try {
      setLoading(true);
      const [myGroupsRes, discoverGroupsRes] = await Promise.all([
        apiClient.get<UserGroupMembership[]>('/groups/mine'),
        apiClient.get<Group[]>('/groups/discover'),
      ]);

      console.log('API response for /mine:', myGroupsRes.data);
      console.log('API response for /discover:', discoverGroupsRes.data);

      const myGroupIds = myGroupsRes.data.map((m) => m.groupId);
      setMyGroups(myGroupsRes.data.map((membership) => membership.group));

      const discoverable = discoverGroupsRes.data.filter(
        (g) => !myGroupIds.includes(g.id),
      );
      setDiscoverableGroups(discoverable);

      console.log(
        'Processed My Groups:',
        myGroupsRes.data.map((membership) => membership.group),
      );
      console.log('Processed Discoverable Groups:', discoverable);
    } catch (error) {
      console.error('Failed to fetch groups', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchGroups();
  }, []);

  const handleCreateGroup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newGroupName.trim()) return;
    const confirmation = window.confirm(
      `Creating a new group costs 150 gold. Are you sure?`,
    );
    if (!confirmation) return;
    try {
      await apiClient.post('/groups', {
        name: newGroupName,
        description: newGroupDesc,
        isPublic: isPublic,
      });
      alert('Group created successfully!');
      setNewGroupName('');
      setNewGroupDesc('');
      fetchGroups();
      refreshUser();
    } catch (error: any) {
      alert(
        `Error: ${error.response?.data?.message || 'Could not create group.'}`,
      );
    }
  };

  const handleJoinGroup = async (groupId: string) => {
    try {
      await apiClient.post(`/groups/${groupId}/join`);
      alert('Successfully joined/requested to join group!');
      fetchGroups();
    } catch (error: any) {
      alert(
        `Error: ${error.response?.data?.message || 'Could not join group.'}`,
      );
    }
  };

  if (loading) return <div>Loading groups...</div>;

  return (
    <div>
      <h3>Create a New Group (Cost: 150 Gold)</h3>
      <form onSubmit={handleCreateGroup}>
        <input
          value={newGroupName}
          onChange={(e) => setNewGroupName(e.target.value)}
          placeholder="Group Name"
          required
        />
        <textarea
          value={newGroupDesc}
          onChange={(e) => setNewGroupDesc(e.target.value)}
          placeholder="Group Description"
        />
        <div>
          <label>
            <input
              type="checkbox"
              checked={isPublic}
              onChange={(e) => setIsPublic(e.target.checked)}
            />
            Public (anyone can join instantly)
          </label>
        </div>
        <button type="submit">Create Group</button>
      </form>
      <hr />
      <h3>My Groups</h3>
      {myGroups.length > 0 ? (
        myGroups.map((group) => (
          <div
            key={group.id}
            style={{
              border: '1px solid green',
              padding: '10px',
              margin: '10px',
            }}
          >
            <h4>
              {group.name} {!group.isPublic && '(Private)'}
            </h4>
            <p>{group.description}</p>
            <button onClick={() => onViewGroup(group.id)}>
              View Details & Chat
            </button>
          </div>
        ))
      ) : (
        <p>You haven't joined any groups yet.</p>
      )}
      <hr />
      <h3>Discover Groups</h3>
      {discoverableGroups.length > 0 ? (
        discoverableGroups.map((group) => (
          <div
            key={group.id}
            style={{
              border: '1px solid grey',
              padding: '10px',
              margin: '10px',
            }}
          >
            <h4>
              {group.name} {!group.isPublic && '(Private)'}
            </h4>
            <p>{group.description}</p>
            <p>Members: {group._count?.members}</p>
            <button onClick={() => handleJoinGroup(group.id)}>
              {group.isPublic ? 'Join Group' : 'Request to Join'}
            </button>
          </div>
        ))
      ) : (
        <p>No new groups to discover.</p>
      )}
    </div>
  );
};

export default GroupsPage;
