import React, { useState, useEffect, useRef } from 'react';
import apiClient from '../api/axiosConfig';
import {
  Group,
  GroupMessage,
  User,
  UserGroupRole,
  GroupMember,
  MembershipStatus,
} from '../types';

interface GroupDetailPageProps {
  groupId: string;
  onBack: () => void;
  currentUser: User;
  refreshUser: () => void;
}

type GroupDetailView = 'chat' | 'members' | 'manage';

const GroupDetailPage: React.FC<GroupDetailPageProps> = ({
  groupId,
  onBack,
  currentUser,
  refreshUser,
}) => {
  const [group, setGroup] = useState<Group | null>(null);
  const [messages, setMessages] = useState<GroupMessage[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState<GroupDetailView>('chat');
  const [isSending, setIsSending] = useState(false);
  const chatEndRef = useRef<null | HTMLDivElement>(null);

  const fetchGroupDetails = async () => {
    try {
      setLoading(true);
      const [groupRes, messagesRes] = await Promise.all([
        apiClient.get(`/groups/${groupId}`),
        apiClient.get(`/groups/${groupId}/messages`),
      ]);
      setGroup(groupRes.data);
      setMessages(messagesRes.data);
    } catch (error) {
      console.error('Failed to fetch group details', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchGroupDetails();
  }, [groupId]);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handlePostMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim() || isSending) return; 

    setIsSending(true); 
    try {
      const response = await apiClient.post(`/groups/${groupId}/messages`, {
        content: newMessage,
      });
      setMessages((prev) => [...prev, response.data]);
      setNewMessage(''); 
    } catch (error) {
      alert('Failed to send message.');
    } finally {
      setIsSending(false); 
    }
  };

  const handleDeleteGroup = async () => {
    const confirmation = window.confirm(
      `Are you sure you want to delete this group? This will cost 500 gold and cannot be undone.`,
    );
    if (!confirmation) return;
    try {
      await apiClient.delete(`/groups/${groupId}`);
      alert('Group deleted successfully.');
      refreshUser();
      onBack();
    } catch (error: any) {
      alert(
        `Error: ${error.response?.data?.message || 'Could not delete group.'}`,
      );
    }
  };

  const handleEditGroup = async () => {
    const newName = window.prompt('Enter new group name:', group?.name);
    const newDescription = window.prompt(
      'Enter new group description:',
      group?.description || '',
    );
    if (!newName || !newName.trim()) return;
    const confirmation = window.confirm(
      `Editing this group will cost 300 gold. Proceed?`,
    );
    if (!confirmation) return;
    try {
      await apiClient.patch(`/groups/${groupId}`, {
        name: newName,
        description: newDescription,
      });
      alert('Group updated!');
      refreshUser();
      fetchGroupDetails();
    } catch (error: any) {
      alert(
        `Error: ${error.response?.data?.message || 'Could not update group.'}`,
      );
    }
  };

  const handleApproveRequest = async (targetUserId: string) => {
    if (!window.confirm('Are you sure you want to approve this member?'))
      return;
    try {
      await apiClient.post(
        `/groups/${groupId}/members/${targetUserId}/approve`,
      );
      alert('Member approved!');
      fetchGroupDetails();
    } catch (error: any) {
      alert(
        `Error: ${error.response?.data?.message || 'Could not approve request.'}`,
      );
    }
  };

  const handleManageRole = async (
    targetUserId: string,
    newRole: UserGroupRole,
  ) => {
    if (
      !window.confirm(
        `Are you sure you want to change this member's role to ${newRole}?`,
      )
    )
      return;
    try {
      await apiClient.patch(`/groups/${groupId}/members`, {
        targetUserId,
        newRole,
      });
      alert('Role updated successfully!');
      fetchGroupDetails();
    } catch (error: any) {
      alert(
        `Error: ${error.response?.data?.message || 'Could not update role.'}`,
      );
    }
  };

  const handleLeaveGroup = async () => {
    if (!window.confirm('Are you sure you want to leave this group?')) return;
    try {
      await apiClient.delete(`/groups/${groupId}/leave`);
      alert('You have left the group.');
      onBack(); 
    } catch (error: any) {
      alert(
        `Error: ${error.response?.data?.message || 'Could not leave group.'}`,
      );
    }
  };

  const handleKickMember = async (targetUserId: string, username: string) => {
    if (
      !window.confirm(
        `Are you sure you want to kick ${username} from the group?`,
      )
    )
      return;
    try {
      await apiClient.delete(`/groups/${groupId}/members/${targetUserId}/kick`);
      alert(`${username} has been kicked.`);
      fetchGroupDetails(); 
    } catch (error: any) {
      alert(
        `Error: ${error.response?.data?.message || 'Could not kick member.'}`,
      );
    }
  };

  const handleRejectRequest = async (targetUserId: string) => {
    if (
      !window.confirm("Are you sure you want to reject this member's request?")
    )
      return;
    try {
      await apiClient.delete(
        `/groups/${groupId}/members/${targetUserId}/reject`,
      );
      alert('Request rejected.');
      fetchGroupDetails();
    } catch (error: any) {
      alert(
        `Error: ${error.response?.data?.message || 'Could not reject request.'}`,
      );
    }
  };

  const currentUserMembership = group?.members?.find(
    (member) => member.user.id === currentUser.id,
  );
  const isOwner = currentUserMembership?.role === UserGroupRole.OWNER;
  const isAdmin = currentUserMembership?.role === UserGroupRole.ADMIN;

  if (loading) return <div>Loading group details...</div>;
  if (!group)
    return (
      <div>
        Group not found. <button onClick={onBack}>Go Back</button>
      </div>
    );

  const activeMembers = group.members?.filter(
    (m) => m.status === MembershipStatus.ACTIVE,
  );
  const pendingMembers = group.members?.filter(
    (m) => m.status === MembershipStatus.PENDING,
  );

  return (
    <div>
      <button onClick={onBack}>&larr; Back to All Groups</button>
      <h2>
        {group.name} {!group.isPublic && '(Private)'}
      </h2>
      <p>{group.description}</p>

      {/* Leave Group Button */}
      {!isOwner && <button onClick={handleLeaveGroup}>Leave Group</button>}

      <div>
        <button onClick={() => setView('chat')}>Chat</button>
        <button onClick={() => setView('members')}>
          Members ({activeMembers?.length || 0})
        </button>
        {(isOwner || isAdmin) && (
          <button onClick={() => setView('manage')}>Manage</button>
        )}
      </div>

      {view === 'chat' && (
        <div>
          <h3>Chat</h3>
          <div
            style={{
              height: '300px',
              overflowY: 'auto',
              border: '1px solid #ccc',
              padding: '10px',
              marginBottom: '10px',
            }}
          >
            {messages.map((msg) => (
              <div key={msg.id}>
                <strong>{msg.user.username}</strong>: {msg.content}
              </div>
            ))}
            <div ref={chatEndRef} />
          </div>
          <form onSubmit={handlePostMessage}>
            <input
              type="text"
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              placeholder={isSending ? 'Sending...' : 'Type a message...'}
              disabled={isSending}
            />
            <button type="submit" disabled={isSending}>
              {isSending ? '...' : 'Send'}
            </button>
          </form>
        </div>
      )}

      {view === 'members' && (
        <div>
          <h3>Members</h3>
          <ul>
            {activeMembers?.map((member) => (
              <li key={member.user.id}>
                {member.user.username} - <strong>{member.role}</strong>
              </li>
            ))}
          </ul>
        </div>
      )}

      {view === 'manage' && (isOwner || isAdmin) && (
        <div>
          <h3>Manage Group</h3>
          {isOwner && (
            <button onClick={handleEditGroup}>
              Edit Group Info (300 Gold)
            </button>
          )}
          {isOwner && (
            <button onClick={handleDeleteGroup}>Delete Group (500 Gold)</button>
          )}

          <h4>Pending Requests ({pendingMembers?.length || 0})</h4>
          {pendingMembers && pendingMembers.length > 0 ? (
            <ul>
              {pendingMembers.map((member) => (
                <li key={member.user.id}>
                  {member.user.username}
                  <button onClick={() => handleApproveRequest(member.user.id)}>
                    Approve
                  </button>
                  {/* --- ADD THIS BUTTON --- */}
                  <button onClick={() => handleRejectRequest(member.user.id)}>
                    Reject
                  </button>
                </li>
              ))}
            </ul>
          ) : (
            <p>No pending requests.</p>
          )}

          <h4>Manage Members</h4>
          <ul>
            {activeMembers?.map((member) => (
              <li key={member.user.id}>
                {member.user.username} ({member.role})
                {/* --- NEW MANAGEMENT BUTTONS --- */}
                {/* Owner's actions */}
                {isOwner && member.role === UserGroupRole.ADMIN && (
                  <>
                    <button
                      onClick={() =>
                        handleManageRole(member.user.id, UserGroupRole.MEMBER)
                      }
                    >
                      Demote to Member
                    </button>
                    <button
                      onClick={() =>
                        handleKickMember(member.user.id, member.user.username)
                      }
                    >
                      Kick
                    </button>
                  </>
                )}
                {isOwner && member.role === UserGroupRole.MEMBER && (
                  <>
                    <button
                      onClick={() =>
                        handleManageRole(member.user.id, UserGroupRole.ADMIN)
                      }
                    >
                      Make Admin
                    </button>
                    <button
                      onClick={() =>
                        handleKickMember(member.user.id, member.user.username)
                      }
                    >
                      Kick
                    </button>
                  </>
                )}
                {isOwner && member.role !== UserGroupRole.OWNER && (
                  <button
                    onClick={() =>
                      handleManageRole(member.user.id, UserGroupRole.OWNER)
                    }
                  >
                    Make Owner
                  </button>
                )}
                {/* Admin's actions */}
                {isAdmin && member.role === UserGroupRole.MEMBER && (
                  <button
                    onClick={() =>
                      handleKickMember(member.user.id, member.user.username)
                    }
                  >
                    Kick
                  </button>
                )}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
};

export default GroupDetailPage;
