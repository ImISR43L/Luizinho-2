export interface User {
  id: string;
  email: string;
  username: string;
  gold: number;
  gems: number;
  createdAt: string;
  updatedAt: string;
}

export type Profile = User;

export enum Difficulty {
  TRIVIAL = 'TRIVIAL',
  EASY = 'EASY',
  MEDIUM = 'MEDIUM',
  HARD = 'HARD',
}

export enum HabitType {
  POSITIVE = 'POSITIVE',
  NEGATIVE = 'NEGATIVE',
  BOTH = 'BOTH',
}

export enum UserGroupRole {
  OWNER = 'OWNER',
  ADMIN = 'ADMIN',
  MEMBER = 'MEMBER',
}

export enum MembershipStatus {
  ACTIVE = 'ACTIVE',
  PENDING = 'PENDING',
}

export enum ChallengeStatus {
  PENDING = 'PENDING',
  ACTIVE = 'ACTIVE',
  COMPLETED = 'COMPLETED',
}

export enum ItemType {
  FOOD = 'FOOD',
  TREAT = 'TREAT',
  TOY = 'TOY',
  CUSTOMIZATION = 'CUSTOMIZATION',
  SPECIAL = 'SPECIAL',
}

export enum EquipmentSlot {
  HAT = 'HAT',
  GLASSES = 'GLASSES',
  SHIRT = 'SHIRT',
  BACKGROUND = 'BACKGROUND',
}

export interface PetItem {
  id: string;
  name: string;
  description: string;
  cost: number;
  type: ItemType;
  equipmentSlot?: EquipmentSlot | null;
  imageUrl?: string | null;
}

export interface UserPetItem {
  id: string;
  quantity: number;
  item: PetItem;
}

export interface EquippedItem {
  slot: EquipmentSlot;
  item: PetItem;
}

export interface Pet {
  id: string;
  name: string;
  health: number;
  hunger: number;
  happiness: number;
  energy: number;
  equipped: EquippedItem[];
}

export interface Habit {
  id: string;
  userId: string;
  title: string;
  notes?: string;
  type: HabitType;
  difficulty: Difficulty;
  isPaused: boolean;
  positiveCounter: number;
  negativeCounter: number;
  createdAt: string;
  updatedAt: string;
  currentStreak: number;
  longestStreak: number;
  goldRewardLockedUntil?: string | null;
}

export interface Daily {
  id: string;
  userId: string;
  title: string;
  notes?: string | null;
  completed: boolean;
  difficulty: Difficulty;
  lastCompleted?: string | null;
  createdAt: string;
  updatedAt: string;
  goldRewardLockedUntil?: string | null;
}

export interface DailyLog {
  date: string;
  notes?: string | null;
}

export interface Todo {
  id: string;
  userId: string;
  title: string;
  notes?: string | null;
  dueDate?: string | null;
  completed: boolean;
  difficulty: Difficulty;
  createdAt: string;
  updatedAt: string;
}

export interface GroupMember {
  user: {
    id: string;
    username: string;
  };
  role: UserGroupRole;
  status: MembershipStatus;
}

export interface Group {
  id: string;
  name: string;
  description?: string | null;
  isPublic: boolean;
  createdAt: string;
  _count?: {
    members: number;
  };
  members?: GroupMember[];
}

export interface GroupMessage {
  id: string;
  content: string;
  createdAt: string;
  userId: string;
  user: {
    username: string;
  };
}

export interface UserGroupMembership {
  id: string;
  userId: string;
  groupId: string;
  role: UserGroupRole;
  joinedAt: string;
  group: Group;
}

export interface Challenge {
  id: string;
  creatorId: string;
  title: string;
  description: string;
  goal: string;
  isPublic: boolean;
  isPrivate: boolean;
  createdAt: string;
  startTime?: string | null;
  status: ChallengeStatus;
  _count?: {
    participants: number;
  };
  participants: UserChallenge[];
}

export interface UserChallenge {
  id: string;
  userId: string;
  challengeId: string;
  progress: number;
  completed: boolean;
  joinedAt: string;
  completionTime?: number | null;
  challenge: Challenge;
  user?: {
    username: string;
  };
  status: MembershipStatus;
}

export interface Reward {
  id: string;
  userId: string;
  title: string;
  notes?: string | null;
  cost: number;
  createdAt: string;
  updatedAt: string;
  lastRedeemed?: string | null;
}
